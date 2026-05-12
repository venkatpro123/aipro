-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: 20260507000002_prediction_outcomes_v2.sql
-- Purpose:   Add archetype, score breakdown, and confidence columns to
--            user_prediction_outcomes for future archetype-level calibration
--            correlation (v12.0 accuracy audit enhancement).
--
-- Design:    All additions are IF NOT EXISTS / idempotent — safe to re-run.
--            The community_prediction_accuracy view is rebuilt to expose
--            archetype-stratified accuracy metrics.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE user_prediction_outcomes
  ADD COLUMN IF NOT EXISTS scoring_archetype  TEXT,          -- e.g. 'financial_distress_layoff'
  ADD COLUMN IF NOT EXISTS score_breakdown    JSONB,         -- snapshot of ScoreBreakdown at audit time
  ADD COLUMN IF NOT EXISTS engine_version     TEXT,          -- e.g. 'v12.0' (distinct from scoring_engine_version)
  ADD COLUMN IF NOT EXISTS confidence_percent INTEGER;       -- hybridResult.confidencePercent at audit time

-- Index for archetype-level accuracy queries
CREATE INDEX IF NOT EXISTS idx_upo_archetype_outcome
  ON user_prediction_outcomes (scoring_archetype, outcome_reported)
  WHERE outcome_reported IS NOT NULL;

-- Index for confidence-stratified accuracy queries
CREATE INDEX IF NOT EXISTS idx_upo_confidence
  ON user_prediction_outcomes (confidence_percent)
  WHERE outcome_reported IS NOT NULL;

-- Rebuild community calibration view to include archetype breakdowns.
-- This allows calibration analysis to ask: "within the financial_distress_layoff
-- archetype, did our probability estimates match observed outcomes?"
-- DROP first because CREATE OR REPLACE VIEW cannot rename existing columns.
DROP VIEW IF EXISTS community_prediction_accuracy;
CREATE VIEW community_prediction_accuracy AS
SELECT
  COALESCE(engine_version, scoring_engine_version)  AS engine_version,
  scoring_archetype,
  predicted_risk_tier,
  COUNT(*)                                                           AS sample_count,
  COUNT(*) FILTER (WHERE outcome_reported = 'layoff_occurred')      AS layoff_count,
  COUNT(*) FILTER (WHERE outcome_reported = 'no_layoff')            AS no_layoff_count,
  ROUND(
    COUNT(*) FILTER (WHERE outcome_reported = 'layoff_occurred')::NUMERIC /
    NULLIF(COUNT(*) FILTER (WHERE outcome_reported IN ('layoff_occurred','no_layoff')), 0),
    3
  )                                                                  AS observed_layoff_rate,
  AVG(predicted_probability12m)                                      AS avg_predicted_probability,
  AVG(confidence_percent)                                            AS avg_confidence_percent,
  AVG(months_since_audit) FILTER (WHERE outcome_reported IS NOT NULL) AS avg_months_to_outcome
FROM user_prediction_outcomes
WHERE opted_into_community = true
  AND outcome_reported IS NOT NULL
GROUP BY COALESCE(engine_version, scoring_engine_version), scoring_archetype, predicted_risk_tier;
