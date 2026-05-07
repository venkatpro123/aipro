-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: 20260101000011_per_user_api_quota.sql
-- Purpose:   Per-user daily API quota tracking for shared third-party keys.
--
-- Problem:   Alpha Vantage (25 req/day), Serper, and NewsAPI are shared across
--            all users. A single power user can exhaust the daily quota,
--            preventing all other users from getting live data.
--
-- Solution:  Track how many live API calls each authenticated user has made
--            today. Gate further calls when a user exceeds their per-user
--            budget (configurable, default = max_daily_calls).
--
-- This complements the session-storage counter in apiDegradationMonitor.ts,
--            which is per-browser-tab. The database counter survives tab
--            refreshes and allows server-side enforcement in Edge Functions.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS per_user_api_quota (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service         TEXT        NOT NULL CHECK (service IN ('alphavantage','newsapi','serper','openrouter')),
  date_utc        DATE        NOT NULL DEFAULT CURRENT_DATE,
  request_count   INTEGER     NOT NULL DEFAULT 0,
  max_daily_calls INTEGER     NOT NULL DEFAULT 5,  -- per-user budget (not total quota)
  last_request_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, service, date_utc)
);

CREATE INDEX IF NOT EXISTS idx_puaq_user_service_date
  ON per_user_api_quota (user_id, service, date_utc);

CREATE INDEX IF NOT EXISTS idx_puaq_date
  ON per_user_api_quota (date_utc DESC);

ALTER TABLE per_user_api_quota ENABLE ROW LEVEL SECURITY;

-- Users can read their own quota usage
CREATE POLICY "users_read_own_quota" ON per_user_api_quota
  FOR SELECT USING (auth.uid() = user_id);

-- Service role increments and reads all (called from Edge Functions)
CREATE POLICY "service_manage_quota" ON per_user_api_quota
  FOR ALL USING (auth.role() = 'service_role');

-- ── increment_user_quota() ────────────────────────────────────────────────
-- Atomically increments the counter and returns whether the user is within budget.
-- Returns TRUE when the call is allowed; FALSE when the per-user budget is exhausted.
-- Called from the proxy-live-signals Edge Function before each API request.
CREATE OR REPLACE FUNCTION increment_user_quota(
  p_user_id UUID,
  p_service  TEXT,
  p_budget   INTEGER DEFAULT 5
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  INSERT INTO per_user_api_quota (user_id, service, date_utc, request_count, max_daily_calls, last_request_at)
  VALUES (p_user_id, p_service, CURRENT_DATE, 1, p_budget, NOW())
  ON CONFLICT (user_id, service, date_utc) DO UPDATE
    SET request_count   = per_user_api_quota.request_count + 1,
        last_request_at = NOW();

  SELECT request_count INTO v_count
  FROM per_user_api_quota
  WHERE user_id = p_user_id AND service = p_service AND date_utc = CURRENT_DATE;

  RETURN v_count <= p_budget;
END;
$$;

-- ── get_user_quota_remaining() ────────────────────────────────────────────
-- Returns how many calls the user has remaining today for a given service.
CREATE OR REPLACE FUNCTION get_user_quota_remaining(
  p_user_id UUID,
  p_service  TEXT,
  p_budget   INTEGER DEFAULT 5
) RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count INTEGER DEFAULT 0;
BEGIN
  SELECT COALESCE(request_count, 0) INTO v_count
  FROM per_user_api_quota
  WHERE user_id = p_user_id AND service = p_service AND date_utc = CURRENT_DATE;

  RETURN GREATEST(0, p_budget - v_count);
END;
$$;

-- ── Cleanup: purge rows older than 7 days ────────────────────────────────
-- Run via pg_cron weekly (add to migration 20260101000003 if pg_cron is enabled)
CREATE OR REPLACE FUNCTION cleanup_old_quotas() RETURNS void LANGUAGE sql AS $$
  DELETE FROM per_user_api_quota WHERE date_utc < CURRENT_DATE - INTERVAL '7 days';
$$;
