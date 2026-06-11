-- ═══════════════════════════════════════════════════════════════════════════
-- Phase 3 (Detection Network) — persisted per-user alerts + detector baselines
--
-- Rule 11: "monitor forever." The detect-user-signals edge function (scheduled
-- every 6h) writes alerts here when something changes for a user while they're
-- away — a layoff at a watched company, career stagnation, etc. The app reads
-- them as "detected since your last visit." Client-side detectors (demand/comp
-- shifts that need the live audit) also write here so all alerts persist in one
-- place. Rule 3: every alert carries causal evidence (what happened / why).
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS user_alerts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  detector      TEXT NOT NULL,                 -- news_event | demand_shift | comp_gap | stagnation | hiring_freeze
  dedupe_key    TEXT NOT NULL,                 -- stable per underlying event; prevents duplicate alerts
  severity      TEXT NOT NULL DEFAULT 'info'   CHECK (severity IN ('critical','high','info')),
  category      TEXT NOT NULL DEFAULT 'score'  CHECK (category IN ('company','market','skill','financial','score','opportunity')),
  headline      TEXT NOT NULL,
  detail        TEXT NOT NULL,
  evidence      TEXT,                          -- causal "what happened / why" (Rule 3)
  tool_link     TEXT,
  detected_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  seen_at       TIMESTAMPTZ,
  dismissed_at  TIMESTAMPTZ,
  UNIQUE (user_id, dedupe_key)
);

-- Active (undismissed) alerts newest-first per user.
CREATE INDEX IF NOT EXISTS idx_user_alerts_active
  ON user_alerts (user_id, dismissed_at, detected_at DESC);

ALTER TABLE user_alerts ENABLE ROW LEVEL SECURITY;

-- Users read/update only their own alerts; the edge function uses the service
-- role (which bypasses RLS) to insert on a user's behalf.
DROP POLICY IF EXISTS user_own_alerts ON user_alerts;
CREATE POLICY user_own_alerts ON user_alerts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Per-user detector memory: last news event ts, last demand index, last comp
-- delta, last stagnation window — so detectors fire on CHANGE, not on state.
ALTER TABLE career_twin_state
  ADD COLUMN IF NOT EXISTS detector_baselines JSONB DEFAULT '{}'::jsonb;

-- ── Schedule the per-user detection scan (every 6h) ─────────────────────────
-- Mirrors the breaking-news-scan-2h pattern. Skips silently if pg_cron absent.
DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'detect-user-signals-6h',
      '15 */6 * * *',
      'SELECT net.http_post(url := current_setting(''app.supabase_url'') || ''/functions/v1/detect-user-signals'', headers := jsonb_build_object(''Authorization'', ''Bearer '' || current_setting(''app.service_role_key''), ''Content-Type'', ''application/json''), body := ''{}''::jsonb)'
    );
    RAISE NOTICE 'detect-user-signals-6h scheduled.';
  ELSE
    RAISE NOTICE 'pg_cron not enabled — detect-user-signals not scheduled. Invoke the EF manually or enable pg_cron.';
  END IF;
END
$do$;
