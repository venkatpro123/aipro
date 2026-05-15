-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260615000001_calibration_provenance.sql
-- Purpose:   WS9 — Calibration provenance & honesty gate.
--
--            The audit surfaced ~28 scalar constants scattered across the
--            scoring services that are labeled "research_derived" /
--            "empirical" / "calibrated" in comments but are actually
--            hand-tuned developer defaults with no regression source:
--              * layoffScoreEngine.ts:1083-1316  — AI displacement bands, recent layoff risk, layoff round risk
--              * segmentedCalibrationEngine.ts  — segment multipliers
--              * empiricalCalibration.ts:62-75  — claimed-empirical layer multipliers
--              * headcountConsensus.ts:156-181  — consensus confidence weights
--              * peerContagionEngine.ts:77-92   — peer contribution + recency decay
--              * employeeSentimentEngine.ts:62-68 — sentiment risk weights
--              * careerContingencyPlanEngine.ts:394 — bare-arithmetic confidence
--              * conformalCI.ts:68              — MIN_CALIBRATION_POINTS
--              * hybridConsensusBuilder.ts:307  — spread thresholds
--              * swarmAggregator.ts:265         — confidence caps
--              * liveDataService.ts:1656        — financial-gap confidence caps
--              * layoffScoreEngine.ts:1491      — Math.max(0.25, sectorFloor)
--
--            engine_calibration_versions (WS2/WS8) already holds the STRUCTURED
--            coefficient bundles (L1-L5 multipliers, D8 logistic, threshold
--            tables). It does NOT hold the long tail of scalar magic numbers.
--
--            This table is the long-tail companion. Each row is one constant
--            with explicit provenance, value, and CI. Reading code calls
--            `getConstant('layoffScoreEngine.aiDisplacement.high', 0.85)` —
--            the second arg is the bootstrap fallback used only when the
--            row is missing (cold start, missing migration).
--
--            INVARIANT: at most one row with status='active' per (key, cohort_scope).
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── Provenance enum ────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.calibration_provenance AS ENUM (
    'regression',              -- derived from regression on user_prediction_outcomes
    'grid_search',             -- tuned via grid search against held-out outcomes
    'manual_seed',             -- intentional hand-tuned value, documented decision
    'uncalibrated_placeholder' -- developer estimate, not yet validated — TREAT AS PROVISIONAL
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ── Constants registry ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.engine_calibration_constants (
  id              BIGSERIAL    PRIMARY KEY,
  -- Dotted path identifying the constant. Stable across versions.
  -- Example: 'layoffScoreEngine.aiDisplacement.high', 'peerContagionEngine.recencyDecay.30d'.
  key             TEXT         NOT NULL,
  -- JSONB so a constant can be a scalar OR a small object (e.g. piecewise band).
  value           JSONB        NOT NULL,
  -- Optional confidence interval on the value (empty for manual_seed).
  ci_lower        NUMERIC,
  ci_upper        NUMERIC,
  -- Pointer to the calibration version that PRODUCED this constant. NULL for
  -- manual_seed and uncalibrated_placeholder.
  source_run_id   BIGINT       REFERENCES public.engine_calibration_versions(id),

  provenance      public.calibration_provenance NOT NULL,
  -- Free-text explanation. Required for manual_seed (must explain why).
  rationale       TEXT,

  -- Lifecycle
  cohort_scope    TEXT         NOT NULL DEFAULT 'GLOBAL',
  status          TEXT         NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'superseded', 'rejected')),

  -- Version + audit
  version         INTEGER      NOT NULL DEFAULT 1,
  effective_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  retired_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  created_by      TEXT         NOT NULL DEFAULT 'manual',

  -- Soft constraint: every uncalibrated_placeholder must be acknowledged via
  -- rationale ("UNCALIBRATED — bootstrap from v34, see audit-2026-06-14").
  CHECK (
    provenance != 'uncalibrated_placeholder'
    OR (rationale IS NOT NULL AND length(rationale) > 0)
  ),
  CHECK (
    provenance != 'manual_seed'
    OR (rationale IS NOT NULL AND length(rationale) > 0)
  )
);

-- INVARIANT: at most one active row per (key, cohort_scope).
CREATE UNIQUE INDEX IF NOT EXISTS uq_ecc_active_per_key
  ON public.engine_calibration_constants (key, cohort_scope)
  WHERE status = 'active';

-- Hot path: getConstant() looks up active rows by key + cohort.
CREATE INDEX IF NOT EXISTS idx_ecc_active_lookup
  ON public.engine_calibration_constants (key, cohort_scope, status);

-- For the v_uncalibrated_exposure dashboard view.
CREATE INDEX IF NOT EXISTS idx_ecc_provenance
  ON public.engine_calibration_constants (provenance, status)
  WHERE status = 'active';

-- ── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.engine_calibration_constants ENABLE ROW LEVEL SECURITY;

-- Same pattern as engine_calibration_versions: clients read; service_role writes.
CREATE POLICY "ecc_read_active"
  ON public.engine_calibration_constants FOR SELECT
  TO authenticated, anon
  USING (status IN ('active', 'superseded'));

-- ── Seed the long tail of uncalibrated bands ───────────────────────────────
-- Every row here is a constant that EXISTS in production code today,
-- already labeled UNCALIBRATED in comments. Codifying them as
-- 'uncalibrated_placeholder' means:
--   1. The system stops claiming they are empirical (they aren't).
--   2. The v_uncalibrated_exposure view can quantify the audit % depending on them.
--   3. The recalibrate-engine cron can target them for replacement.
-- Values mirror the current code; tracked in CHANGELOG.
INSERT INTO public.engine_calibration_constants (key, value, provenance, rationale, created_by) VALUES
  -- layoffScoreEngine.ts:1292-1297 — recent layoff risk bands
  ('layoffScoreEngine.recentLayoffRisk.30d',  '0.95'::jsonb, 'uncalibrated_placeholder', 'UNCALIBRATED — see comment in layoffScoreEngine.ts:1292. Bootstrap from v28.', 'WS9-seed'),
  ('layoffScoreEngine.recentLayoffRisk.90d',  '0.80'::jsonb, 'uncalibrated_placeholder', 'UNCALIBRATED — see comment in layoffScoreEngine.ts:1293. Bootstrap from v28.', 'WS9-seed'),
  ('layoffScoreEngine.recentLayoffRisk.180d', '0.62'::jsonb, 'uncalibrated_placeholder', 'UNCALIBRATED — see comment in layoffScoreEngine.ts:1294. Bootstrap from v28.', 'WS9-seed'),
  ('layoffScoreEngine.recentLayoffRisk.365d', '0.42'::jsonb, 'uncalibrated_placeholder', 'UNCALIBRATED — see comment in layoffScoreEngine.ts:1295. Bootstrap from v28.', 'WS9-seed'),
  ('layoffScoreEngine.recentLayoffRisk.720d', '0.28'::jsonb, 'uncalibrated_placeholder', 'UNCALIBRATED — see comment in layoffScoreEngine.ts:1296. Bootstrap from v28.', 'WS9-seed'),
  -- layoffScoreEngine.ts:1309-1316 — layoff round count risk
  ('layoffScoreEngine.layoffRoundRisk.1',  '0.42'::jsonb, 'uncalibrated_placeholder', 'UNCALIBRATED — layoffScoreEngine.ts:1309.', 'WS9-seed'),
  ('layoffScoreEngine.layoffRoundRisk.2',  '0.68'::jsonb, 'uncalibrated_placeholder', 'UNCALIBRATED — layoffScoreEngine.ts:1310.', 'WS9-seed'),
  ('layoffScoreEngine.layoffRoundRisk.3',  '0.85'::jsonb, 'uncalibrated_placeholder', 'UNCALIBRATED — layoffScoreEngine.ts:1311.', 'WS9-seed'),
  ('layoffScoreEngine.layoffRoundRisk.4plus', '0.95'::jsonb, 'uncalibrated_placeholder', 'UNCALIBRATED — layoffScoreEngine.ts:1312.', 'WS9-seed'),
  -- layoffScoreEngine.ts:1083-1102 — AI displacement risk
  ('layoffScoreEngine.aiDisplacement.high',     '0.85'::jsonb, 'uncalibrated_placeholder', 'UNCALIBRATED developer-estimate — layoffScoreEngine.ts:1083.', 'WS9-seed'),
  ('layoffScoreEngine.aiDisplacement.medium',   '0.55'::jsonb, 'uncalibrated_placeholder', 'UNCALIBRATED developer-estimate — layoffScoreEngine.ts:1090.', 'WS9-seed'),
  ('layoffScoreEngine.aiDisplacement.low',      '0.25'::jsonb, 'uncalibrated_placeholder', 'UNCALIBRATED developer-estimate — layoffScoreEngine.ts:1095.', 'WS9-seed'),
  -- layoffScoreEngine.ts:1491 — sector floor when layoffs dataset unavailable
  ('layoffScoreEngine.sectorFloor.unknownData', '0.25'::jsonb, 'uncalibrated_placeholder', 'UNCALIBRATED — fallback floor at layoffScoreEngine.ts:1491.', 'WS9-seed'),
  -- liveDataService.ts:1656-1660 — financial-gap confidence caps
  ('liveDataService.confidenceCap.criticalFinancialGap', '0.35'::jsonb, 'manual_seed', 'Manual safety cap: public company with no stock+revenue signals AND no DB substitute. Justified in liveDataService.ts:1655-1657.', 'WS9-seed'),
  ('liveDataService.confidenceCap.failedClassRatio',     '0.55'::jsonb, 'manual_seed', 'Manual safety cap: >40% of live signal classes failed. Justified in liveDataService.ts:1659-1661.', 'WS9-seed'),
  -- swarmAggregator.ts:265 — confidence ceilings by live-vs-heuristic mode
  ('swarmAggregator.confidenceCap.noLiveSignals',  '45'::jsonb, 'manual_seed', 'Hard cap when zero live signal classes returned. swarmAggregator.ts:265.', 'WS9-seed'),
  ('swarmAggregator.confidenceCap.withLiveSignals', '90'::jsonb, 'manual_seed', 'Hard cap when at least one live signal class returned. swarmAggregator.ts:265.', 'WS9-seed'),
  -- hybridConsensusBuilder.ts:307-308 — spread thresholds
  ('hybridConsensusBuilder.spread.heuristic',         '0.28'::jsonb, 'uncalibrated_placeholder', 'UNCALIBRATED spread — hybridConsensusBuilder.ts:307.', 'WS9-seed'),
  ('hybridConsensusBuilder.spread.highConfidence',    '0.08'::jsonb, 'uncalibrated_placeholder', 'UNCALIBRATED spread — hybridConsensusBuilder.ts:307.', 'WS9-seed'),
  ('hybridConsensusBuilder.spread.mediumConfidence',  '0.14'::jsonb, 'uncalibrated_placeholder', 'UNCALIBRATED spread — hybridConsensusBuilder.ts:307.', 'WS9-seed'),
  ('hybridConsensusBuilder.spread.lowConfidence',     '0.22'::jsonb, 'uncalibrated_placeholder', 'UNCALIBRATED spread — hybridConsensusBuilder.ts:307.', 'WS9-seed'),
  -- careerContingencyPlanEngine.ts:394 — bare-arithmetic confidence
  ('careerContingencyPlanEngine.confidence.base',       '0.55'::jsonb, 'uncalibrated_placeholder', 'UNCALIBRATED — careerContingencyPlanEngine.ts:394.', 'WS9-seed'),
  ('careerContingencyPlanEngine.confidence.marginGain', '0.30'::jsonb, 'uncalibrated_placeholder', 'UNCALIBRATED — careerContingencyPlanEngine.ts:394.', 'WS9-seed'),
  -- conformalCI.ts:68 — minimum calibration set size
  ('conformalCI.minCalibrationPoints', '80'::jsonb, 'manual_seed', 'Below this n, conformal quantile is too unstable. Industry rule of thumb; revisit when outcome corpus exceeds 5000.', 'WS9-seed'),
  -- Generic null-confidence fallback (the offending 0.5s scattered across services)
  ('engine.fallback.unknownConfidence', '0.30'::jsonb, 'manual_seed',
   'Replaces the 0.5 silent fallback. 0.30 chosen so an unknown signal does not inflate confidence — the legacy 0.5 was indistinguishable from a real medium-confidence signal. Code paths that previously returned 0.5 for null input now read this AND set fallback=true on their span.',
   'WS9-seed')
ON CONFLICT DO NOTHING;

-- ── Exposure dashboard view ────────────────────────────────────────────────
-- For each layer/engine, what fraction of its constant lookups still hit an
-- uncalibrated row. WS9 acceptance target: < 5% of audit traffic depends
-- on uncalibrated constants.
--
-- The audit pipeline writes one row per resolved constant to
-- engine_constant_resolutions (added in 20260615000002) tagged with the
-- audit's request_id, so this view can compute % of audits whose final
-- confidence depended on at least one uncalibrated_placeholder.
CREATE OR REPLACE VIEW public.v_uncalibrated_constants AS
SELECT
  key,
  value,
  cohort_scope,
  rationale,
  created_at
FROM public.engine_calibration_constants
WHERE status = 'active' AND provenance = 'uncalibrated_placeholder';

-- ── Comments ───────────────────────────────────────────────────────────────
COMMENT ON TABLE public.engine_calibration_constants IS
  'WS9 — Long-tail scalar constants used by scoring engines. Companion to '
  'engine_calibration_versions (which holds structured coefficient bundles). '
  'Every row has explicit provenance; uncalibrated_placeholder rows are the '
  'former magic-numbers-in-code, now visible and targetable by '
  'recalibrate-engine. Read via getConstant() in calibrationConstants.ts.';

COMMENT ON COLUMN public.engine_calibration_constants.provenance IS
  'Source of the value. regression/grid_search are produced by recalibrate-engine. '
  'manual_seed is an intentional ops choice (must explain in rationale). '
  'uncalibrated_placeholder is a former magic number not yet validated — '
  'layers reading it MUST emit fallback=true so the audit pipeline knows '
  'the confidence number is provisional.';

COMMENT ON VIEW public.v_uncalibrated_constants IS
  'WS9 — Diagnostic view: which scalar constants are still uncalibrated. '
  'Goal: drive this list to empty (or move each to manual_seed with explicit '
  'rationale) as recalibrate-engine produces regression values.';
