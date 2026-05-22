-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260623000021_gap_a02_peer_contagion_calibration.sql
-- Purpose:   GAP-A02 — Peer contagion decay constant: calibration view,
--            evidence_count/last_validated_at schema extension, and canonical
--            constant key so recalibrate-engine can replace the bootstrap λ.
--
-- ════════════════════════════════════════════════════════════════════════════
-- WHAT THIS MIGRATION COVERS
-- ════════════════════════════════════════════════════════════════════════════
--
-- Code changes (TypeScript — documented here):
--
--   calibrationConstants.ts
--   ───────────────────────
--   + evidence_count: number | null added to ConstantRow interface
--   + last_validated_at: string | null added to ConstantRow interface
--   + ResolvedConstant<T>: added evidenceCount?: number | null
--   + ResolvedConstant<T>: added lastValidatedAt?: string | null
--   + loadSnapshot(): SELECT now includes evidence_count, last_validated_at
--
--   sectorContagionAgent.ts
--   ────────────────────────
--   + Reads peer_contagion_decay_lambda first (canonical empirical key)
--   + Falls back to sectorContagionAgent.decayLambda (ESTIMATED) then BOOTSTRAP
--   + decayLambdaProvenance exposed in agent metadata
--
--   peerContagionEngine.ts
--   ───────────────────────
--   + PeerContagionResult: decayEvidenceCount (number), decayLastValidatedAt (string|null)
--   + resolveActiveDecayHalfLife(): checks peer_contagion_decay_lambda first
--   + When provenance='regression': decayCalibrationStatus='regression_derived'
--   + decayEvidenceCount/decayLastValidatedAt flow through to all return paths
--
--   PeerContagionPanel.tsx
--   ───────────────────────
--   + GAP-A02 ESTIMATED badge shows evidence_count and last_validated_at
--   + When decayCalibrationStatus='regression_derived': badge turns emerald,
--     shows "EMPIRICAL · N pairs · validated date"
--   + When uncalibrated_placeholder: amber badge shows
--     "ESTIMATED · 0 pairs · requires ≥50 to calibrate"
--
--   Schema bug fixes applied in this migration:
--   ────────────────────────────────────────────
--   + engine_calibration_constants: ADD COLUMN IF NOT EXISTS evidence_count INTEGER
--   + engine_calibration_constants: ADD COLUMN IF NOT EXISTS last_validated_at TIMESTAMPTZ
--   + These columns are needed for peer_contagion_decay_lambda and any future
--     regression-derived constants to record their calibration evidence trail.
--
-- ════════════════════════════════════════════════════════════════════════════
-- DB CHANGES
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Extend engine_calibration_constants schema ────────────────────────────
-- evidence_count: number of co-occurrence pairs (or training examples) that
--   produced this constant value. 0 = uncalibrated (bootstrap value).
--   >= 50 = sufficient evidence to trust the regression output.
-- last_validated_at: ISO timestamp of the most recent recalibrate-engine run
--   that validated or updated this constant. NULL until first calibration run.
ALTER TABLE public.engine_calibration_constants
  ADD COLUMN IF NOT EXISTS evidence_count    INTEGER,
  ADD COLUMN IF NOT EXISTS last_validated_at TIMESTAMPTZ;

-- ── 2. Calibration view: co-occurrence lag distribution ──────────────────────
-- Computes P(focal-company layoff within 90d | peer-company cut N days before)
-- at lag buckets 0 / 30 / 60 / 90 / 120 / 150+ days.
--
-- INPUT TABLES:
--   curated_layoff_events   → peer events (company_name, event_date)
--   user_prediction_outcomes → focal company confirmed outcomes
--
-- METHODOLOGY NOTE:
--   The true peer graph lives in companyPeers.ts (TypeScript), not in SQL.
--   This view therefore uses a sector-proxy: any two DIFFERENT companies that
--   both appear in these tables are treated as potential peers. This over-
--   includes distant pairs, which ATTENUATES the fitted λ (longer half-life).
--   The recalibrate-engine Python script performs the authoritative fit using
--   the full companyPeers graph read from the TypeScript source. This view
--   provides the raw lag distribution for that script and for audit transparency.
--
-- CALIBRATION GATE:
--   total_pairs >= 50 is required before recalibrate-engine upgrades the
--   peer_contagion_decay_lambda constant provenance from
--   'uncalibrated_placeholder' to 'regression'.
--   Current state at bootstrap: 0 pairs (0 confirmed outcomes in
--   user_prediction_outcomes).
CREATE OR REPLACE VIEW public.peer_contagion_decay_calibration AS
WITH peer_events AS (
  SELECT
    company_name AS peer_company,
    event_date   AS peer_event_date
  FROM public.curated_layoff_events
  WHERE event_date IS NOT NULL
),
focal_outcomes AS (
  SELECT
    company_name AS focal_company,
    outcome_date
  FROM public.user_prediction_outcomes
  WHERE outcome_reported IN ('laid_off', 'company_closed')
    AND outcome_date IS NOT NULL
),
-- For each (peer event, focal outcome) pair where:
--   • companies differ
--   • focal layoff occurred 0–180 days AFTER the peer event
-- compute the lag in days.
cross_pairs AS (
  SELECT
    pe.peer_company,
    fo.focal_company,
    pe.peer_event_date,
    fo.outcome_date,
    (fo.outcome_date - pe.peer_event_date)::integer AS lag_days
  FROM peer_events  pe
  CROSS JOIN focal_outcomes fo
  WHERE lower(pe.peer_company) <> lower(fo.focal_company)
    AND fo.outcome_date >= pe.peer_event_date
    AND fo.outcome_date <= pe.peer_event_date + INTERVAL '180 days'
),
bucketed AS (
  SELECT
    -- Assign each lag to a 30-day bucket (left edge of bucket)
    CASE
      WHEN lag_days <=  30 THEN   0
      WHEN lag_days <=  60 THEN  30
      WHEN lag_days <=  90 THEN  60
      WHEN lag_days <= 120 THEN  90
      WHEN lag_days <= 150 THEN 120
      ELSE                       150
    END        AS lag_bucket_days,
    COUNT(*)   AS n_pairs
  FROM cross_pairs
  GROUP BY 1
)
SELECT
  lag_bucket_days,
  n_pairs,
  -- Total pairs across all buckets — used by recalibrate-engine to check gate
  SUM(n_pairs) OVER ()                                     AS total_pairs,
  -- Relative probability vs lag=0 bucket (for decay curve fitting)
  -- p(t) / p(0) — if this follows exp(-λt) we can fit λ via OLS on log scale
  ROUND(
    n_pairs::numeric
    / NULLIF(FIRST_VALUE(n_pairs) OVER (ORDER BY lag_bucket_days), 0),
    4
  )                                                        AS relative_probability,
  -- Reference: what the bootstrap λ=0.023 predicts for this lag
  ROUND(EXP(-0.023::numeric * lag_bucket_days), 4)        AS bootstrap_lambda_prediction,
  NOW()                                                    AS computed_at
FROM bucketed
ORDER BY lag_bucket_days;

COMMENT ON VIEW public.peer_contagion_decay_calibration IS
  'GAP-A02 — Lag distribution for empirical calibration of the peer contagion '
  'decay constant λ. Each row is a 30-day lag bucket showing how many '
  '(peer-event, focal-company-layoff) co-occurrence pairs fell into that '
  'window. recalibrate-engine fits p(t) = p0 * exp(-λ * t) to these rows '
  'via OLS on the log scale and updates peer_contagion_decay_lambda when '
  'total_pairs >= 50. See GAP-A02 migration 20260623000021.';

-- ── 3. Seed peer_contagion_decay_lambda constant ────────────────────────────
-- Canonical key for the empirically calibrated decay constant λ.
-- Bootstrap value: 0.023 (30-day half-life, matches BOOTSTRAP_DECAY_LAMBDA).
-- Provenance: uncalibrated_placeholder → recalibrate-engine upgrades to
--   'regression' when evidence_count >= 50 co-occurrence pairs.
--
-- Relationship to existing constants:
--   sectorContagionAgent.decayLambda (000013) — component-scoped ESTIMATED λ.
--     sectorContagionAgent.ts now reads THIS key first; falls back to that one.
--   peerContagionEngine.exponentialDecayHalfLife — half-life key (different unit).
--     peerContagionEngine.ts resolveActiveDecayHalfLife() checks THIS key first,
--     converts λ → halfLife = ln(2)/λ, and sets decayCalibrationStatus='regression_derived'
--     when provenance='regression'.
INSERT INTO public.engine_calibration_constants
  (key, value, provenance, rationale, description, cohort_scope, status,
   evidence_count, last_validated_at, added_in_version, created_by)
VALUES
(
  'peer_contagion_decay_lambda',
  '0.023',
  'uncalibrated_placeholder',
  'GAP-A02 — Canonical empirical decay constant λ for peer contagion recency '
  'weighting in both sectorContagionAgent.ts and peerContagionEngine.ts. '
  'Bootstrap: 0.023 (half-life ≈ 30.1 days = ln(2)/0.023). '
  'Calibration: recalibrate-engine fits exponential decay p(t) = p0 × exp(-λt) '
  'to the lag-bucket distribution in peer_contagion_decay_calibration view using '
  'OLS on the log scale. Gate: evidence_count >= 50 co-occurrence pairs required '
  'before provenance is upgraded from uncalibrated_placeholder to regression. '
  'Until gate clears: ESTIMATED label shown in PeerContagionPanel. '
  'Current state: evidence_count=0 (0 confirmed outcomes in user_prediction_outcomes). '
  'INCONSISTENCY NOTE: signalDecayModel.sector_contagion=21 days (λ≈0.033) vs '
  'this constant=30 days (λ=0.023) — both ESTIMATED. When this constant is '
  'calibrated via regression it supersedes both.',
  'GAP-A02 canonical empirical peer contagion decay λ. Bootstrap 0.023 (30d '
  'half-life). Read first by sectorContagionAgent.ts; peerContagionEngine.ts '
  'converts to halfLife=ln(2)/λ. Upgrade to regression when evidence_count>=50.',
  'GLOBAL',
  'active',
  0,        -- evidence_count: 0 confirmed co-occurrence pairs at bootstrap
  NULL,     -- last_validated_at: not yet validated by recalibrate-engine
  'v40.0',
  'gap-a02-seed'
)
ON CONFLICT DO NOTHING;

-- ── 4. Log to scoring_architecture_log ──────────────────────────────────────
INSERT INTO public.scoring_architecture_log
  (dimension_key, change_type, description, migration_ref)
VALUES (
  'gap_a02_peer_contagion_calibration',
  'audit_fix',
  'GAP-A02 complete: Peer contagion decay constant λ=0.023 now has full empirical '
  'calibration path. '
  'Key changes: '
  '(1) engine_calibration_constants: added evidence_count INTEGER + last_validated_at TIMESTAMPTZ columns. '
  '(2) peer_contagion_decay_calibration view: computes lag-bucket P(focal layoff within 180d | peer cut N days ago) '
  'for recalibrate-engine to fit exponential decay curve via OLS on log scale. '
  '(3) peer_contagion_decay_lambda constant seeded (0.023, uncalibrated_placeholder, evidence_count=0). '
  '(4) sectorContagionAgent.ts: reads peer_contagion_decay_lambda first (empirical), '
  'falls back to sectorContagionAgent.decayLambda (ESTIMATED), then BOOTSTRAP_DECAY_LAMBDA. '
  '(5) calibrationConstants.ts: ResolvedConstant and ConstantRow now carry evidenceCount + lastValidatedAt. '
  '(6) peerContagionEngine.ts: resolveActiveDecayHalfLife() checks peer_contagion_decay_lambda '
  'first; sets decayCalibrationStatus=regression_derived when provenance=regression. '
  'PeerContagionResult: decayEvidenceCount + decayLastValidatedAt added. '
  '(7) PeerContagionPanel.tsx: ESTIMATED/EMPIRICAL badge shows evidence_count and last_validated_at. '
  'Gate: evidence_count >= 50 pairs required. Currently: 0 pairs (0 confirmed outcomes). '
  'ESTIMATED label persists until gate clears.',
  '20260623000021'
)
ON CONFLICT (dimension_key) DO UPDATE
  SET description  = EXCLUDED.description,
      migration_ref = EXCLUDED.migration_ref;
