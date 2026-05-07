-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: 20260507000001_user_prediction_outcomes.sql
-- Purpose:   User-facing prediction outcome tracking (v12.0).
--
--            Unlike the swarm learning prediction_outcomes table (migration 8),
--            this table captures EXPLICIT user feedback: "did the predicted
--            layoff actually happen?" This feeds back into calibrationBacktester.ts
--            over time, upgrading UNCALIBRATED dimension weights to user_validated.
--
-- Privacy:   Only opt-in data. Users explicitly confirm/deny outcomes.
--            No PII beyond user_id (FK to auth.users). Anonymized aggregate
--            accuracy metrics are computed at query time — raw rows are user-owned.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS user_prediction_outcomes (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Audit session context
  audit_session_id      TEXT,                        -- matches HybridResult.meta.timestamp
  company_name          TEXT        NOT NULL,
  role_title            TEXT,
  department            TEXT,
  -- Prediction that was made
  predicted_risk_tier   TEXT        NOT NULL,         -- CRITICAL/HIGH/ELEVATED/MODERATE/LOW/MINIMAL
  predicted_probability12m NUMERIC(5,4),              -- from SurvivalProbabilityResult
  predicted_score       NUMERIC(5,1),                 -- the total score at prediction time
  scoring_engine_version TEXT DEFAULT 'v11.0',        -- detect formula changes
  audit_date            TIMESTAMPTZ NOT NULL,         -- when the audit was done
  -- Outcome reported by user
  outcome_reported      TEXT,                         -- 'layoff_occurred' | 'no_layoff' | 'voluntarily_left'
  outcome_date          TIMESTAMPTZ,                  -- when outcome was confirmed
  months_since_audit    SMALLINT,                     -- derived: outcome_date - audit_date in months
  -- Metadata
  opted_into_community  BOOLEAN DEFAULT false,        -- true = row used in aggregate calibration
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for calibration queries
CREATE INDEX IF NOT EXISTS idx_upo_user_id          ON user_prediction_outcomes (user_id);
CREATE INDEX IF NOT EXISTS idx_upo_audit_date       ON user_prediction_outcomes (audit_date DESC);
CREATE INDEX IF NOT EXISTS idx_upo_outcome          ON user_prediction_outcomes (outcome_reported) WHERE outcome_reported IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_upo_tier_outcome     ON user_prediction_outcomes (predicted_risk_tier, outcome_reported) WHERE outcome_reported IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_upo_community        ON user_prediction_outcomes (opted_into_community) WHERE opted_into_community = true;

-- Row Level Security: users can only see/write their own rows
ALTER TABLE user_prediction_outcomes ENABLE ROW LEVEL SECURITY;

DO $do$
BEGIN
  -- User can insert their own prediction records
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_prediction_outcomes' AND policyname = 'upo_user_insert'
  ) THEN
    EXECUTE 'CREATE POLICY "upo_user_insert" ON user_prediction_outcomes FOR INSERT WITH CHECK (auth.uid() = user_id)';
  END IF;

  -- User can read their own records
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_prediction_outcomes' AND policyname = 'upo_user_select'
  ) THEN
    EXECUTE 'CREATE POLICY "upo_user_select" ON user_prediction_outcomes FOR SELECT USING (auth.uid() = user_id)';
  END IF;

  -- User can update their own outcome_reported field
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_prediction_outcomes' AND policyname = 'upo_user_update'
  ) THEN
    EXECUTE 'CREATE POLICY "upo_user_update" ON user_prediction_outcomes FOR UPDATE USING (auth.uid() = user_id)';
  END IF;

  -- Service role reads all community-opted rows for aggregate calibration
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_prediction_outcomes' AND policyname = 'upo_service_read_community'
  ) THEN
    EXECUTE 'CREATE POLICY "upo_service_read_community" ON user_prediction_outcomes FOR SELECT USING (auth.role() = ''service_role'' AND opted_into_community = true)';
  END IF;
END
$do$;

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_upo_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  -- Auto-compute months_since_audit when outcome is reported
  IF NEW.outcome_date IS NOT NULL AND NEW.audit_date IS NOT NULL THEN
    NEW.months_since_audit = EXTRACT(MONTH FROM AGE(NEW.outcome_date, NEW.audit_date))::SMALLINT
      + EXTRACT(YEAR FROM AGE(NEW.outcome_date, NEW.audit_date))::SMALLINT * 12;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER upo_updated_at_trigger
  BEFORE UPDATE ON user_prediction_outcomes
  FOR EACH ROW EXECUTE FUNCTION update_upo_updated_at();

-- Community calibration view: aggregate accuracy by tier and engine version
-- (Only includes opted-in rows with confirmed outcomes)
CREATE OR REPLACE VIEW community_prediction_accuracy AS
SELECT
  scoring_engine_version,
  predicted_risk_tier,
  COUNT(*)                                                          AS sample_count,
  COUNT(*) FILTER (WHERE outcome_reported = 'layoff_occurred')     AS layoff_count,
  COUNT(*) FILTER (WHERE outcome_reported = 'no_layoff')           AS no_layoff_count,
  ROUND(
    COUNT(*) FILTER (WHERE outcome_reported = 'layoff_occurred')::NUMERIC /
    NULLIF(COUNT(*) FILTER (WHERE outcome_reported IN ('layoff_occurred','no_layoff')), 0),
    3
  )                                                                 AS observed_layoff_rate,
  AVG(predicted_probability12m)                                     AS avg_predicted_probability,
  AVG(months_since_audit) FILTER (WHERE outcome_reported IS NOT NULL) AS avg_months_to_outcome
FROM user_prediction_outcomes
WHERE opted_into_community = true
  AND outcome_reported IS NOT NULL
GROUP BY scoring_engine_version, predicted_risk_tier;
