-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260623000020_gap_a04_collapse_precision_constants.sql
-- Purpose:   GAP-A04 — CollapsePredictor stage confidence with empirical backing.
--
-- ════════════════════════════════════════════════════════════════════════════
-- WHAT THIS MIGRATION COVERS
-- ════════════════════════════════════════════════════════════════════════════
--
-- Code changes (TypeScript — documented here):
--
--   collapsePredictor.ts
--   ─────────────────────
--   + COLLAPSE_STAGE_HORIZONS: { 1: 365, 2: 180, 3: 90 } days
--   + CollapseStageEmpiricalPrecision interface: stage, precision, nEvents,
--     precisionLabel, rawPrecision, horizonDays, gateStatus, fprLabel
--   + getCollapseStagePrecision(stage): queries collapse_predictor_precision_summary,
--     1-hour cache per stage, non-fatal fallback
--   + getCollapseStagePrecisionSync(stage): sync accessor
--
--   hybridResult.ts
--   ───────────────
--   + collapsePredictor?: { stage, stageConfidence, stagePrecision,
--     stageBasedOnNEvents, stagePrecisionLabel, stageFprLabel,
--     stageHorizonDays, stageGateStatus }
--
--   LayoffCalculator.tsx
--   ─────────────────────
--   + After detectCollapseStage, calls getCollapseStagePrecision(report.stage)
--   + Populates result.collapsePredictor with empirical precision bundle
--
--   CollapseSignalCard.tsx
--   ───────────────────────
--   + precisionData? prop (from result.collapsePredictor via CompanyProfileTab)
--   + PRECISION_DISPLAY_THRESHOLD = 0.60
--   + Suppression: when precision < 0.60 or UNKNOWN → header shows
--     "Early warning signals present" instead of "Stage N — ..."
--   + Precision disclosure block: "Stage 2 classification (62% precision on
--     N historical companies — meaning 38% did not have confirmed layoff
--     within 180 days)" when known; UNKNOWN explanation when not
--
--   CompanyProfileTab.tsx
--   ──────────────────────
--   + Passes precisionData={result.collapsePredictor ?? undefined} to CollapseSignalCard
--
--   TransparencyTab.tsx
--   ────────────────────
--   + Collapse disclosure fully rewritten: reads result.collapsePredictor
--   + Empirical precision statement + suppression rule applied
--   + Signal Quality vs Empirical Precision two-column panel
--   + Stage 3 UNVERIFIED timeline note kept
--   + "PRECISION: X%" badge color: emerald when gate_clears, amber when unknown
--
--   Schema bug fixes applied in this session:
--   ──────────────────────────────────────────
--   + Migration 000012: ADD COLUMN IF NOT EXISTS for scoring_architecture_log
--     (change_type, description, migration_ref, layer_id, finding, severity,
--     component, resolution) — these columns used by 000012–000019 but missing
--     from the base CREATE TABLE in 000001
--   + Migration 000015: fixed collapse_predictor_precision_summary view
--     (actual_outcome → outcome_reported; column values corrected);
--     fixed engine_calibration_constants INSERT (constant_key → key,
--     constant_value → value; removed calibrated_at/expires_at; fixed ON CONFLICT);
--     fixed scoring_architecture_log INSERT (corrected column names)
--
-- ════════════════════════════════════════════════════════════════════════════
-- DB CHANGES
-- ════════════════════════════════════════════════════════════════════════════

-- Ensure columns exist (idempotent guard in case 000015 ran before fixes).
ALTER TABLE public.engine_calibration_constants
  ADD COLUMN IF NOT EXISTS description      TEXT,
  ADD COLUMN IF NOT EXISTS added_in_version TEXT;

-- ── Seed collapse stage precision rate constants ──────────────────────────
-- These store the empirical precision rate (0.0–1.0) for each stage.
-- Bootstrap value: null (JSON null) = UNKNOWN, 0 confirmed cases.
-- recalibrate-engine will replace with computed values once ≥20 outcomes
-- per stage exist in collapse_predictor_precision_summary.
INSERT INTO public.engine_calibration_constants
  (key, value, provenance, rationale, cohort_scope, status, created_by)
VALUES
(
  'collapse_stage_1_precision',
  'null',
  'uncalibrated_placeholder',
  'GAP-A04 — Empirical precision rate for Stage 1 CollapsePredictor classifications. '
  'Stage 1 = early warning (12-18 months out). Confirmation horizon: 365 days. '
  'Bootstrap: null (UNKNOWN) — 0 Stage 1 predictions with confirmed outcomes. '
  'Gate: n_predictions >= 20 AND precision >= 0.60. '
  'Read by getCollapseStagePrecision(1) in collapsePredictor.ts.',
  'GLOBAL', 'active', 'gap-a04-seed'
),
(
  'collapse_stage_2_precision',
  'null',
  'uncalibrated_placeholder',
  'GAP-A04 — Empirical precision rate for Stage 2 CollapsePredictor classifications. '
  'Stage 2 = active risk (6-12 months out). Confirmation horizon: 180 days. '
  'Bootstrap: null (UNKNOWN) — 0 Stage 2 predictions with confirmed outcomes. '
  'Gate: n_predictions >= 20 AND precision >= 0.60. '
  'Read by getCollapseStagePrecision(2) in collapsePredictor.ts.',
  'GLOBAL', 'active', 'gap-a04-seed'
),
(
  'collapse_stage_3_precision',
  'null',
  'uncalibrated_placeholder',
  'GAP-A04 — Empirical precision rate for Stage 3 CollapsePredictor classifications. '
  'Stage 3 = imminent risk (1-6 months out). Confirmation horizon: 90 days. '
  'Bootstrap: null (UNKNOWN) — 0 Stage 3 predictions with confirmed outcomes. '
  'Gate: n_predictions >= 20 AND precision >= 0.60. '
  'Stage 3 triggers emergency protocol (week-by-week action plan, 0.2× deadline '
  'compression). A false positive triggers unnecessary crisis mode. '
  'Read by getCollapseStagePrecision(3) in collapsePredictor.ts.',
  'GLOBAL', 'active', 'gap-a04-seed'
)
ON CONFLICT DO NOTHING;

-- ── Log to scoring_architecture_log ──────────────────────────────────────
INSERT INTO public.scoring_architecture_log
  (dimension_key, change_type, description, migration_ref)
VALUES (
  'gap_a04_collapse_precision_empirical',
  'audit_fix',
  'GAP-A04 complete: CollapsePredictor stage confidence now empirically backed. '
  'Key changes: '
  '(1) getCollapseStagePrecision(stage) queries collapse_predictor_precision_summary. '
  '(2) HybridResult.collapsePredictor bundle: stagePrecision, stageBasedOnNEvents, '
  'stagePrecisionLabel, stageFprLabel, stageHorizonDays, stageGateStatus. '
  '(3) CollapseSignalCard: stage label suppressed when precision < 0.60 — shows '
  '"Early warning signals present" + precision disclosure sentence. '
  '(4) TransparencyTab: fully rewritten with empirical precision statement, '
  'two-panel Signal Quality vs Empirical Precision, dynamic badge color. '
  '(5) 3 new engine_calibration_constants: collapse_stage_1/2/3_precision (null). '
  'Precision gate: n>=20 AND precision>=0.60. Currently UNKNOWN (0 cases). '
  'Schema fixes in 000012 (scoring_architecture_log columns) and 000015 '
  '(view column names, engine_calibration_constants INSERT column names).',
  '20260623000020'
)
ON CONFLICT (dimension_key) DO UPDATE
  SET description = EXCLUDED.description,
      migration_ref = EXCLUDED.migration_ref;
