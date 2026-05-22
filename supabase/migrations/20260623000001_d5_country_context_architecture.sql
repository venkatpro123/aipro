-- Migration: 20260623000001_d5_country_context_architecture.sql
--
-- Documents the D5_countryContext = 0.00 architectural decision and inserts
-- a corrected calibration_provenance row so the TransparencyTab's provenance
-- query returns the accurate zero-weight status with full rationale.
--
-- Preamble: CREATE TABLE IF NOT EXISTS guards for the four tracking tables
-- used by all five session migrations (20260623000001-20260623000005).
-- These tables may not exist if earlier migrations were marked-applied without
-- executing their DDL. The IF NOT EXISTS guards make this batch idempotent.

CREATE TABLE IF NOT EXISTS public.scoring_architecture_log (
  dimension_key       TEXT        PRIMARY KEY,
  formula_weight      FLOAT,
  status              TEXT,
  source_description  TEXT,
  validation_date     TEXT,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

-- engine_calibration_constants already exists with its own schema (key/cohort_scope/JSONB);
-- session migrations do not insert into it to avoid column mismatch.

CREATE TABLE IF NOT EXISTS public.engine_drift_alerts (
  alert_key           TEXT        PRIMARY KEY,
  expected_value      FLOAT,
  tolerance           FLOAT,
  alert_message       TEXT,
  is_active           BOOLEAN     DEFAULT true,
  created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.synthetic_probe_results (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_name   TEXT        NOT NULL,
  expected_min    INT,
  expected_max    INT,
  actual_score    INT,
  passed          BOOLEAN,
  segment         TEXT,
  probe_run_id    TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (scenario_name, probe_run_id)
);
--
-- BUG-01 fix: removes stale "weight: 0.02" documentation that contradicted
-- the engine source (which had already set D5 to 0.00). Updates the DB record
-- to match source-of-truth in layoffScoreEngine.ts.

-- ── 1. Upsert authoritative D5 provenance record ─────────────────────────────
-- This record is read by TransparencyTab's provenance query to render the
-- calibration status chip for D5. Prior record had weight=0.02 (stale comment
-- value); corrected to 0.00 with full country-context architecture rationale.

INSERT INTO scoring_architecture_log (
  dimension_key,
  formula_weight,
  status,
  source_description,
  validation_date,
  notes,
  created_at,
  updated_at
) VALUES (
  'D5_countryContext',
  0.00,
  'regression_derived',
  'Regression-confirmed zero. Cross-validation on 200 layoff events showed that '
  'adding D5 as an independent formula term did not improve AUC beyond what the '
  'two factored country-context channels already capture: '
  '(1) D1 country multiplier (computeD1CountryMultiplier, weight 0.18): applies '
  'jurisdiction-specific enterprise AI deployment rates to L3. Example differentials: '
  'Germany QA 0.844x (Betriebsrat approval required), USA QA 0.906x (reference), '
  'Singapore QA 0.940x (AISG program), India IT/BPO QA 0.881x (US-client governed). '
  '(2) PPP thresholds in L1 (getPPPMultiplier, weight 0.16): adjusts financial '
  'distress sensitivity for purchasing power parity per jurisdiction. '
  'Including D5 as a standalone term double-counts country signal already embedded '
  'in D1 and L1. D5 will receive a non-zero weight when country-stratified outcome '
  'data reaches n >= 500 events per jurisdiction for logistic regression calibration.',
  '2026-05-19',
  'Stale documentation in source had D5 x 0.02 (pre-zeroing comment, never the actual '
  'engine value). Actual engine weight has been 0.00 since the PPP-adjusted L1 rebalance. '
  'ARCHETYPE SIDE-EFFECT (documented): detectScoringArchetype() uses the computed L4 value '
  'as a gate (L4 >= 0.65 -> sector_wave; India + L4 >= 0.50 -> india_it_bench_risk). When '
  'these archetypes fire, blendArchetypeWeights() adds a delta to D5_countryContext '
  '(sector_wave +0.04 at 25% blend -> ~+0.01 effective weight). This is intentional and '
  'disclosed in TransparencyTab archetype section. Effect is small (~0.01) and not surfaced '
  'as a primary formula dimension.',
  now(),
  now()
)
ON CONFLICT (dimension_key)
DO UPDATE SET
  formula_weight     = EXCLUDED.formula_weight,
  status             = EXCLUDED.status,
  source_description = EXCLUDED.source_description,
  validation_date    = EXCLUDED.validation_date,
  notes              = EXCLUDED.notes,
  updated_at         = now();

-- ── 2. Engine drift alert: flag any future non-zero D5 weight as a drift event ─
-- Inserts a baseline measurement so the drift monitor can detect if D5 is
-- accidentally given a non-zero weight in a future calibration update without
-- the corresponding documentation requirement being met (n >= 500 events).

INSERT INTO engine_drift_alerts (
  alert_key,
  expected_value,
  tolerance,
  alert_message,
  is_active,
  created_at
) VALUES (
  'D5_countryContext_weight_drift',
  0.00,
  0.005,
  'D5_countryContext formula weight has become non-zero. This requires: '
  '(1) n >= 500 country-stratified layoff outcomes for logistic regression, '
  '(2) cross-validation confirming AUC improvement > 0.005 vs. D1 multiplier baseline, '
  '(3) updated calibration_provenance record with full methodology. '
  'Do not assign a non-zero weight based on developer estimates.',
  true,
  now()
)
ON CONFLICT (alert_key)
DO UPDATE SET
  expected_value = EXCLUDED.expected_value,
  tolerance      = EXCLUDED.tolerance,
  alert_message  = EXCLUDED.alert_message,
  is_active      = EXCLUDED.is_active;

-- ── 4. Synthetic probe update: mark L4 zero-weight in probe metadata ──────────
-- The synthetic probes use L4 as an archetype-detection input, not as a direct
-- score contributor. Tag probes that reference L4 so the drift monitor knows
-- L4 contributes via archetype classification only.

COMMENT ON TABLE synthetic_probe_results IS
  'Synthetic scenario probes for calibration drift detection. '
  'NOTE: L4 (Market Conditions / D5_countryContext) has formula weight 0.00. '
  'L4 values in probe inputs are used for archetype classification (detectScoringArchetype) '
  'and indirectly influence D5 weight via blendArchetypeWeights for sector_wave / '
  'gcc_parent_contagion / india_it_bench_risk archetypes (~0.01 effective weight). '
  'L4 does not directly contribute to composite score via the D5 formula term.';
