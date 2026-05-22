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

CREATE OR REPLACE VIEW collapse_predictor_precision_summary AS
WITH stage_outcomes AS (
  SELECT
    collapse_stage_at_prediction                                AS stage,
    COUNT(*)                                                    AS n_predictions,
    COUNT(*) FILTER (WHERE collapse_is_promoted = TRUE)         AS n_promoted,
    COUNT(*) FILTER (WHERE actual_outcome = 'layoff_confirmed') AS n_confirmed_layoff,
    COUNT(*) FILTER (WHERE actual_outcome IN ('no_layoff', 'company_stable'))
                                                                AS n_false_positive,
    COUNT(*) FILTER (
      WHERE actual_outcome = 'layoff_confirmed'
        AND collapse_is_promoted = FALSE
    )                                                           AS n_confirmed_primary_only
  FROM user_prediction_outcomes
  WHERE
    collapse_stage_at_prediction IS NOT NULL
    AND actual_outcome IS NOT NULL
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

INSERT INTO engine_calibration_constants (
  constant_key,
  constant_value,
  provenance,
  description,
  calibrated_at,
  expires_at
) VALUES
(
  'collapsePredictor.stage3PrecisionStatus',
  '"UNKNOWN"',
  'uncalibrated_placeholder',
  'Stage 3 precision rate (fraction of Stage 3 predictions confirmed as layoffs within 90 days). '
  'Currently UNKNOWN — 0 Stage 3 predictions with confirmed outcomes in user_prediction_outcomes. '
  'Precision gate: n >= 20 AND precision >= 0.60. Until gate clears, Stage 3 classifications must '
  'be disclosed with PRECISION: UNKNOWN badge and the 4-8 week timeline claim must be labeled UNVERIFIED. '
  'The "Historical median 4-8 weeks" text in collapsePredictor.ts recommendations record has no citation.',
  NOW(),
  NOW() + INTERVAL '180 days'
),
(
  'collapsePredictor.stage2PrecisionStatus',
  '"UNKNOWN"',
  'uncalibrated_placeholder',
  'Stage 2 precision rate (fraction of Stage 2 predictions confirmed as layoffs within 90 days). '
  'Currently UNKNOWN — insufficient confirmed outcomes in user_prediction_outcomes. '
  'Precision gate: n >= 20 AND precision >= 0.50 for Stage 2 (lower bar than Stage 3).',
  NOW(),
  NOW() + INTERVAL '180 days'
),
(
  'collapsePredictor.stage1PrecisionStatus',
  '"UNKNOWN"',
  'uncalibrated_placeholder',
  'Stage 1 precision rate (fraction of Stage 1 predictions confirmed as layoffs within 90 days). '
  'Stage 1 is a 12-18 month leading indicator — 90-day confirmation window may undercount true '
  'positives. Precision gate: n >= 20 AND precision >= 0.35 (lower bar; long lead time).',
  NOW(),
  NOW() + INTERVAL '180 days'
),
(
  'collapsePredictor.stage3TimelineMedianWeeks',
  '"4-8"',
  'uncalibrated_placeholder',
  'Claimed median time from Stage 3 detection to layoff announcement: 4-8 weeks. '
  'Source: collapsePredictor.ts recommendation text only. NOT derived from user_prediction_outcomes '
  'or any external research citation. Must be labeled UNVERIFIED in UI until validated.',
  NOW(),
  NOW() + INTERVAL '180 days'
)
ON CONFLICT (constant_key) DO UPDATE
  SET
    constant_value = EXCLUDED.constant_value,
    provenance     = EXCLUDED.provenance,
    description    = EXCLUDED.description,
    calibrated_at  = NOW(),
    expires_at     = NOW() + INTERVAL '180 days';

-- ── D: Log all findings to scoring_architecture_log ──────────────────────────

INSERT INTO scoring_architecture_log (
  change_type, affected_component, change_description, rationale, change_author
) VALUES
(
  'gap_finding',
  'collapsePredictor.ts',
  'GAP-A04-F1: No collapse_stage_at_prediction column in user_prediction_outcomes. '
  'Stage 3 precision rate is uncomputable from current schema.',
  'Stage 3 fires emergency protocol (week-by-week action plan, 0.2× deadline compression). '
  'Without outcome tracking, a false positive triggers crisis mode for a stable user. '
  'Added collapse_stage_at_prediction SMALLINT(1/2/3) and collapse_is_promoted BOOLEAN.',
  'gap_audit_a04'
),
(
  'gap_finding',
  'collapsePredictor.ts / CollapseReport.signalConfidence',
  'GAP-A04-F2: CollapseReport.signalConfidence is a severity-weighted internal ratio, '
  'not an empirical precision rate. It is currently displayed nowhere in the UI — '
  'the user has no visibility into detection confidence at all.',
  'signalConfidence = Σ(severity_score) / max_possible. 1.0 = all strong signals. '
  'This is a signal quality indicator, not a validation metric. Must be disclosed '
  'alongside PRECISION: UNKNOWN badge so users understand the distinction.',
  'gap_audit_a04'
),
(
  'gap_finding',
  'collapsePredictor.ts / Stage 3 recommendation text',
  'GAP-A04-F3: Stage 3 recommendation cites "Historical median time to layoff '
  'announcement from Stage 3: 4-8 weeks" with no citation or source.',
  'This timeline claim appears in the CollapseReport.recommendation for Stage 3 '
  'and is surfaced to users as a factual anchor. No reference to layoffs.fyi, '
  'academic research, or internal outcome data. Registered as UNVERIFIED in '
  'engine_calibration_constants. Must be labeled UNVERIFIED in UI.',
  'gap_audit_a04'
),
(
  'gap_finding',
  'HybridResult / collapseStage',
  'GAP-A04-F4: HybridResult has collapseStage field but no fields for '
  'signalConfidence or precisionStatus. TransparencyTab shows collapse stage '
  'with no confidence or precision disclosure.',
  'Adding collapseStageConfidence (the internal severity-weighted ratio from '
  'CollapseReport) and collapsePrecisionStatus (uncalibrated_placeholder) '
  'to HybridResult. These two fields together allow TransparencyTab to show '
  'the distinction: signal quality (internal) vs validated precision (unknown).',
  'gap_audit_a04'
),
(
  'schema_change',
  'user_prediction_outcomes',
  'Added collapse_stage_at_prediction SMALLINT CHECK IN (1,2,3) and '
  'collapse_is_promoted BOOLEAN. Added collapse_predictor_precision_summary VIEW.',
  'Enables empirical precision tracking per stage. Gate: n>=20 AND precision>=0.60 '
  'for Stage 3. Until gate clears, Stage 3 must carry PRECISION: UNKNOWN disclosure.',
  'gap_audit_a04'
);
