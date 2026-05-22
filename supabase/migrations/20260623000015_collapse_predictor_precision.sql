-- 20260623000015_collapse_predictor_precision.sql
-- GAP-A04: CollapsePredictor Stage 3 precision tracking infrastructure.
--
-- Findings:
--  1. user_prediction_outcomes has no collapse_stage_at_prediction column.
--     Without it, we cannot compute an empirical precision rate.
--  2. collapsePredictor.ts signalConfidence is a severity-weighted internal
--     ratio — not a validated precision rate against confirmed outcomes.
--  3. Stage 3 triggers week-by-week emergency protocol in the UI and
--     compresses action deadlines by 0.2×. A false positive triggers
--     unnecessary crisis mode for a user whose company is stable.
--  4. The Stage 3 recommendation text cites "Historical median time to
--     layoff announcement from Stage 3: 4–8 weeks" — no citation.
--  5. engine_calibration_constants has no entry for any collapse predictor
--     parameter; precision status is undisclosed to the user.
--
-- Remediation:
--  A. Add collapse_stage_at_prediction (1/2/3) to user_prediction_outcomes.
--  B. Add collapse_is_promoted (whether cross-stage rule fired).
--  C. Create collapse_predictor_precision_summary VIEW (per-stage precision).
--  D. Register collapsePredictor.stage3PrecisionStatus in
--     engine_calibration_constants as uncalibrated_placeholder.
--  E. Log all findings to scoring_architecture_log.

-- ── A: Add collapse tracking columns to user_prediction_outcomes ─────────────

ALTER TABLE user_prediction_outcomes
  ADD COLUMN IF NOT EXISTS collapse_stage_at_prediction SMALLINT
    CHECK (collapse_stage_at_prediction IN (1, 2, 3)),
  ADD COLUMN IF NOT EXISTS collapse_is_promoted BOOLEAN;

COMMENT ON COLUMN user_prediction_outcomes.collapse_stage_at_prediction IS
  'Collapse stage (1/2/3) detected by collapsePredictor.ts at time of audit.
   NULL when no stage was detected (overallRisk below threshold or no signals).
   Populated by the audit pipeline when collapseStage is non-null.';

COMMENT ON COLUMN user_prediction_outcomes.collapse_is_promoted IS
  'TRUE when the collapse stage was assigned via cross-stage promotion
   (P1/P2 rule) rather than the primary 2-of-3 within-stage rule.
   Promoted stages carry lower confidence and are disclosed as partial evidence.';

-- ── B: Per-stage precision summary VIEW ──────────────────────────────────────
-- Schema fix: user_prediction_outcomes uses outcome_reported (not actual_outcome),
-- with values 'laid_off'/'company_closed' for confirmed layoffs and
-- 'still_employed'/'false_alarm' for non-layoff outcomes.

CREATE OR REPLACE VIEW public.collapse_predictor_precision_summary AS
WITH stage_outcomes AS (
  SELECT
    collapse_stage_at_prediction                                             AS stage,
    COUNT(*)                                                                 AS n_predictions,
    COUNT(*) FILTER (WHERE collapse_is_promoted = TRUE)                      AS n_promoted,
    COUNT(*) FILTER (
      WHERE outcome_reported IN ('laid_off', 'company_closed')
    )                                                                        AS n_confirmed_layoff,
    COUNT(*) FILTER (
      WHERE outcome_reported IN ('still_employed', 'false_alarm', 'role_changed', 'left_voluntarily')
    )                                                                        AS n_false_positive,
    COUNT(*) FILTER (
      WHERE outcome_reported IN ('laid_off', 'company_closed')
        AND collapse_is_promoted = FALSE
    )                                                                        AS n_confirmed_primary_only
  FROM public.user_prediction_outcomes
  WHERE
    collapse_stage_at_prediction IS NOT NULL
    AND outcome_reported IS NOT NULL
  GROUP BY collapse_stage_at_prediction
),
gated AS (
  SELECT
    stage,
    n_predictions,
    n_promoted,
    n_confirmed_layoff,
    n_false_positive,
    n_confirmed_primary_only,
    CASE
      WHEN n_predictions = 0 THEN 0.0
      ELSE ROUND(n_confirmed_layoff::numeric / n_predictions, 3)
    END AS precision,
    CASE
      WHEN n_predictions < 20 THEN 'insufficient_cases'
      WHEN ROUND(n_confirmed_layoff::numeric / n_predictions, 3) >= 0.60 THEN 'gate_clears'
      ELSE 'precision_below_gate'
    END AS gate_status,
    20  AS cases_needed_for_gate,
    0.60 AS precision_gate_threshold
  FROM stage_outcomes
)
SELECT
  stage,
  n_predictions,
  n_promoted,
  n_confirmed_layoff,
  n_false_positive,
  n_confirmed_primary_only,
  precision,
  gate_status,
  cases_needed_for_gate,
  precision_gate_threshold,
  GREATEST(0, cases_needed_for_gate - n_predictions) AS bootstrap_cases_still_needed
FROM gated;

COMMENT ON VIEW collapse_predictor_precision_summary IS
  'Per-stage precision tracking for collapsePredictor.ts.
   gate_clears when n_predictions >= 20 AND precision >= 0.60.
   Until gate_clears, Stage 3 classifications must be disclosed as PRECISION: UNKNOWN.
   Stage 3 specifically should NOT apply the 0.2× deadline compression until gate clears.';

-- ── C: Register precision status in engine_calibration_constants ─────────────
-- Schema fix: engine_calibration_constants uses (key, value, provenance, rationale,
-- cohort_scope, status, created_by) — NOT (constant_key, constant_value, calibrated_at, expires_at).

-- Ensure description + added_in_version columns exist (added in 000013 fix).
ALTER TABLE public.engine_calibration_constants
  ADD COLUMN IF NOT EXISTS description      TEXT,
  ADD COLUMN IF NOT EXISTS added_in_version TEXT;

INSERT INTO public.engine_calibration_constants
  (key, value, provenance, rationale, cohort_scope, status, created_by)
VALUES
(
  'collapsePredictor.stage3PrecisionStatus',
  '"UNKNOWN"',
  'uncalibrated_placeholder',
  'Stage 3 precision rate (fraction of Stage 3 predictions confirmed as layoffs within 90 days). '
  'Currently UNKNOWN — 0 Stage 3 predictions with confirmed outcomes in user_prediction_outcomes. '
  'Precision gate: n >= 20 AND precision >= 0.60. Until gate clears, Stage 3 classifications must '
  'be disclosed with PRECISION: UNKNOWN badge and the 4-8 week timeline claim must be labeled UNVERIFIED.',
  'GLOBAL', 'active', 'gap-a04-seed'
),
(
  'collapsePredictor.stage2PrecisionStatus',
  '"UNKNOWN"',
  'uncalibrated_placeholder',
  'Stage 2 precision rate (fraction of Stage 2 predictions confirmed as layoffs within 180 days). '
  'Currently UNKNOWN — insufficient confirmed outcomes in user_prediction_outcomes. '
  'Precision gate: n >= 20 AND precision >= 0.60.',
  'GLOBAL', 'active', 'gap-a04-seed'
),
(
  'collapsePredictor.stage1PrecisionStatus',
  '"UNKNOWN"',
  'uncalibrated_placeholder',
  'Stage 1 precision rate (fraction of Stage 1 predictions confirmed as layoffs within 365 days). '
  'Stage 1 is a 12-18 month leading indicator. Precision gate: n >= 20 AND precision >= 0.60.',
  'GLOBAL', 'active', 'gap-a04-seed'
),
(
  'collapsePredictor.stage3TimelineMedianWeeks',
  '"4-8"',
  'uncalibrated_placeholder',
  'Claimed median time from Stage 3 detection to layoff announcement: 4-8 weeks. '
  'Source: collapsePredictor.ts recommendation text only. NOT derived from user_prediction_outcomes '
  'or any external research citation. Must be labeled UNVERIFIED in UI until validated.',
  'GLOBAL', 'active', 'gap-a04-seed'
)
ON CONFLICT DO NOTHING;

-- ── D: Log findings to scoring_architecture_log ──────────────────────────────
-- Schema fix: correct columns are (dimension_key, change_type, description, migration_ref).
INSERT INTO public.scoring_architecture_log (dimension_key, change_type, description, migration_ref)
VALUES (
  'collapse_predictor_gap_a04',
  'audit_fix',
  'GAP-A04: 5 findings in collapsePredictor. '
  'F1: No collapse_stage_at_prediction column — added (SMALLINT 1/2/3) + collapse_is_promoted. '
  'F2: signalConfidence is a severity-weighted internal ratio, not empirical precision — now disclosed. '
  'F3: Stage 3 "4-8 weeks" timeline has no citation — labeled UNVERIFIED. '
  'F4: HybridResult missing collapseStageConfidence + collapsePrecisionStatus — added. '
  'F5: Precision gate: n>=20 AND precision>=0.60 required before validated classification. '
  'View public.collapse_predictor_precision_summary created (fixed: outcome_reported not actual_outcome).',
  '20260623000015'
)
ON CONFLICT (dimension_key) DO UPDATE
  SET description = EXCLUDED.description,
      migration_ref = EXCLUDED.migration_ref;
