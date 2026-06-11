-- ═══════════════════════════════════════════════════════════════════════════
-- Reconcile the monitoring tables onto the remote.
--
-- user_monitoring_watchlist + monitoring_alert_dismissals (from the Phase-2
-- monitoring migration) were never applied to the remote — so getWatchlist(),
-- addToWatchlist(), and dismissAlert() have been silently no-ops, and the
-- Phase-3 news detector (watchlist ∩ breaking_news_events) had no watchlist to
-- read. Idempotent create so this is safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS user_monitoring_watchlist (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES auth.users NOT NULL,
  company_name TEXT NOT NULL,
  added_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, company_name)
);

CREATE TABLE IF NOT EXISTS monitoring_alert_dismissals (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES auth.users NOT NULL,
  alert_key    TEXT NOT NULL,
  dismissed_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_monitoring_watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_alert_dismissals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_own_watchlist ON user_monitoring_watchlist;
CREATE POLICY user_own_watchlist ON user_monitoring_watchlist
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS user_own_dismissals ON monitoring_alert_dismissals;
CREATE POLICY user_own_dismissals ON monitoring_alert_dismissals
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
