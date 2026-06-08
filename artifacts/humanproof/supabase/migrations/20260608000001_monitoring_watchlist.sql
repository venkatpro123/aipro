-- Phase 2: Continuous Monitoring Engine
-- Creates user watchlist + alert dismissal tables

CREATE TABLE IF NOT EXISTS user_monitoring_watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  company_name TEXT NOT NULL,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, company_name)
);

CREATE TABLE IF NOT EXISTS monitoring_alert_dismissals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  alert_key TEXT NOT NULL,
  dismissed_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_monitoring_watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_alert_dismissals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_own_watchlist" ON user_monitoring_watchlist
  USING (auth.uid() = user_id);

CREATE POLICY "user_own_dismissals" ON monitoring_alert_dismissals
  USING (auth.uid() = user_id);

-- Add monitoring_preferences column to user_profiles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'monitoring_preferences'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN monitoring_preferences JSONB DEFAULT '{}';
  END IF;
END $$;
