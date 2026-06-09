-- user_autopilot_alerts: per-user proactive signal alerts
-- Populated by evaluate-autopilot-signals EF (daily cron + Monday digest).
-- Delivered in-app via Supabase Realtime; critical severity also triggers
-- an email via send-alert-email EF.

CREATE TABLE IF NOT EXISTS user_autopilot_alerts (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_type      TEXT        NOT NULL,
  -- 'score_surge'|'peer_layoff'|'equity_cliff'|'opportunity_window'|'weekly_digest'
  severity        TEXT        NOT NULL CHECK (severity IN ('critical','high','info')),
  headline        TEXT        NOT NULL,
  body            TEXT,
  action_route    TEXT,       -- e.g. '/tools/networking'
  action_label    TEXT,
  primary_move    JSONB,      -- serialized PrimaryMove from signalOrchestrator
  is_read         BOOLEAN     NOT NULL DEFAULT FALSE,
  is_dismissed    BOOLEAN     NOT NULL DEFAULT FALSE,
  delivered_email BOOLEAN     NOT NULL DEFAULT FALSE,
  -- alert_date is set at insert time (CURRENT_DATE) and used for per-day dedup
  -- without needing a functional expression index (avoids IMMUTABLE issue with timestamptz::date)
  alert_date      DATE        NOT NULL DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ
);

-- Efficient per-user feed query (excludes dismissed)
CREATE INDEX IF NOT EXISTS idx_uaa_user_feed
  ON user_autopilot_alerts (user_id, created_at DESC)
  WHERE NOT is_dismissed;

-- Dedup index: one alert per type per user per calendar day
-- Uses the stored alert_date column (plain DATE) — no functional expression needed
CREATE UNIQUE INDEX IF NOT EXISTS idx_uaa_user_type_day
  ON user_autopilot_alerts (user_id, alert_type, alert_date);

ALTER TABLE user_autopilot_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_alerts_all"
  ON user_autopilot_alerts FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Enable Realtime so useAutopilotAlerts hook receives instant delivery
ALTER PUBLICATION supabase_realtime ADD TABLE user_autopilot_alerts;

-- ── RPC: get_active_users_for_autopilot ──────────────────────────────────────
-- Returns one row per active user with profile data + latest 2 score_trajectory
-- entries (for delta computation) + action completion count in last 7 days.
-- Used by evaluate-autopilot-signals EF (service_role; bypasses RLS).

CREATE OR REPLACE FUNCTION public.get_active_users_for_autopilot(cutoff_date TIMESTAMPTZ)
RETURNS TABLE (
  user_id             UUID,
  industry_key        TEXT,
  equity_vest_months  NUMERIC,
  has_equity_vesting  BOOLEAN,
  latest_score        SMALLINT,
  prior_score         SMALLINT,
  score_delta_7d      SMALLINT,
  actions_completed_7d INTEGER
)
LANGUAGE sql SECURITY DEFINER AS $$
  WITH latest_scores AS (
    SELECT
      st.user_id,
      st.score,
      st.created_at,
      ROW_NUMBER() OVER (PARTITION BY st.user_id ORDER BY st.created_at DESC) AS rn
    FROM public.score_trajectory st
    WHERE st.created_at >= cutoff_date
  ),
  user_scores AS (
    SELECT
      user_id,
      MAX(CASE WHEN rn = 1 THEN score END)::SMALLINT AS latest_score,
      MAX(CASE WHEN rn = 2 THEN score END)::SMALLINT AS prior_score
    FROM latest_scores
    WHERE rn <= 2
    GROUP BY user_id
  ),
  week_ago AS (SELECT NOW() - INTERVAL '7 days' AS ts),
  score_week AS (
    SELECT
      user_id,
      MAX(CASE WHEN rn = 1 THEN score END)::SMALLINT AS score_now,
      MAX(CASE WHEN rn = 2 THEN score END)::SMALLINT AS score_7d_ago
    FROM (
      SELECT st.user_id, st.score,
        ROW_NUMBER() OVER (PARTITION BY st.user_id ORDER BY
          CASE WHEN st.created_at >= (SELECT ts FROM week_ago) THEN 0 ELSE 1 END,
          st.created_at DESC) AS rn
      FROM public.score_trajectory st
    ) sub
    WHERE rn <= 2
    GROUP BY user_id
  ),
  action_counts AS (
    SELECT user_id, COUNT(*)::INTEGER AS cnt
    FROM public.user_action_completions
    WHERE completed_at >= (NOW() - INTERVAL '7 days')
    GROUP BY user_id
  )
  SELECT
    up.user_id,
    up.industry_key,
    up.equity_vest_months,
    up.has_equity_vesting,
    us.latest_score,
    us.prior_score,
    (sw.score_now - sw.score_7d_ago)::SMALLINT AS score_delta_7d,
    COALESCE(ac.cnt, 0) AS actions_completed_7d
  FROM public.user_profiles up
  JOIN user_scores us ON us.user_id = up.user_id
  LEFT JOIN score_week sw ON sw.user_id = up.user_id
  LEFT JOIN action_counts ac ON ac.user_id = up.user_id
$$;

-- pg_cron: daily signal evaluation at 08:00 UTC
SELECT cron.schedule(
  'autopilot-daily-signals',
  '0 8 * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/evaluate-autopilot-signals',
      headers := json_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      )::jsonb,
      body := '{"run":"daily_signals"}'::jsonb
    )
  $$
);

-- pg_cron: Monday weekly digest at 14:00 UTC
SELECT cron.schedule(
  'autopilot-weekly-digest',
  '0 14 * * 1',
  $$
    SELECT net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/evaluate-autopilot-signals',
      headers := json_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      )::jsonb,
      body := '{"run":"weekly_digest"}'::jsonb
    )
  $$
);
