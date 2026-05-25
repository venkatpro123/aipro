-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260525090000_missing_columns_v42_3.sql
-- Purpose:   v42.3 — Add columns found missing by second browser test (2026-05-25)
--
--   1. curated_layoff_events — missing headline, affected_departments, confidence
--      columns needed by layoffNewsCache.ts and peerContagionLiveAdapter.ts
--
--   2. user_prediction_outcomes — missing actual_outcome_score column
--      needed by empiricalCalibration.ts to measure calibration coverage
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. curated_layoff_events: add missing columns ─────────────────────────────
ALTER TABLE public.curated_layoff_events
  ADD COLUMN IF NOT EXISTS headline             TEXT,
  ADD COLUMN IF NOT EXISTS affected_departments TEXT[],
  ADD COLUMN IF NOT EXISTS confidence           NUMERIC;

COMMENT ON COLUMN public.curated_layoff_events.headline IS
  'News headline describing the layoff event. Used by layoffNewsCache.ts '
  'to populate the LayoffNewsEvent.headline field.';

COMMENT ON COLUMN public.curated_layoff_events.affected_departments IS
  'Array of department names affected by the layoff '
  '(e.g. [''Engineering'', ''Sales'']). Used by peerContagionLiveAdapter.ts '
  'and layoffNewsCache.ts for department-level analysis.';

COMMENT ON COLUMN public.curated_layoff_events.confidence IS
  'Admin-assigned confidence score (0.0–1.0) for this layoff event record. '
  'Used by peerContagionLiveAdapter.ts to weight contagion signals.';

-- ── 2. user_prediction_outcomes: add actual_outcome_score ─────────────────────
-- This column is queried by empiricalCalibration.ts to compute calibration
-- coverage: whether the actual outcome fell within the predicted CI bounds.
-- predicted_ci_low + predicted_ci_high were added in 20260524100000.
-- actual_outcome_score is the realized layoff-risk score for the prediction row.
ALTER TABLE public.user_prediction_outcomes
  ADD COLUMN IF NOT EXISTS actual_outcome_score NUMERIC;

COMMENT ON COLUMN public.user_prediction_outcomes.actual_outcome_score IS
  'Realized layoff risk score (0–100) at the time the prediction outcome was '
  'confirmed. Used by empiricalCalibration.ts to compute calibration coverage '
  '(what % of actual outcomes fell within [predicted_ci_low, predicted_ci_high]).';
