-- Migration: 20260609000004_cohort_outcome_cache.sql
-- Phase 5 (R18 Outcome Monopoly, R9 Career Graph): cross-user cohort aggregation.
--
-- Stores pre-computed cohort outcome stats keyed by (role_key, tenure_band, action_id).
-- The cohortOutcomesAggregator reads from action_completions + layoff_scores
-- on first miss and writes the result here. Cache TTL = 7 days (enforced in application).
-- This enables: "Users like you who did X saw N pts avg reduction."

CREATE TABLE IF NOT EXISTS cohort_outcome_cache (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key        TEXT        NOT NULL,
  tenure_band     TEXT        NOT NULL,  -- '<2' | '2-5' | '5-10' | '10+'
  industry        TEXT,
  action_id       TEXT        NOT NULL,
  completion_count INTEGER    NOT NULL DEFAULT 0,
  avg_risk_reduction NUMERIC(5,2),
  std_dev         NUMERIC(5,2),
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (role_key, tenure_band, action_id)
);

-- Index for fast look-up on the three query dimensions
CREATE INDEX IF NOT EXISTS idx_cohort_outcome_lookup
  ON cohort_outcome_cache (role_key, tenure_band, action_id);

-- RLS: service role only (no user-level access needed — data is anonymized aggregates)
ALTER TABLE cohort_outcome_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role full access"
  ON cohort_outcome_cache
  FOR ALL
  TO service_role
  USING (true);
