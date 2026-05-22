-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260623000012_main_formula_holdout_validation.sql
-- Purpose:   GAP-A01 — Persist the main formula holdout validation metadata that
--            was previously only hardcoded in TypeScript (empiricalCalibration.ts
--            CALIBRATION_META.holdout_n = 40, auc_roc = 0.81).
--
-- BACKGROUND
-- ──────────
-- The main composite formula (L1-L5 + D1-D8) was calibrated on 200 layoffs.fyi
-- events (2023-2025). 40 events were held out for validation:
--   Holdout AUC-ROC: 0.81
--   Training set: 160 events (200 total − 40 holdout)
--
-- A subsequent in-sample regression adding D2/D3/D6/D7 as simultaneous predictors
-- showed marginal in-sample AUC gain of +0.03 (0.81 → 0.84). This 0.84 figure is
-- IN-SAMPLE ONLY — not revalidated on the 40-event holdout.
--
-- Until this migration, there was no DB record of:
--   - The 40-event holdout split
--   - The train/test provenance of individual outcomes in user_prediction_outcomes
--   - Whether "0.84 AUC" is in-sample or holdout
--
-- This migration:
--   1. Adds `main_formula_validation_metadata` JSONB to engine_calibration_versions
--   2. Adds `is_holdout` BOOLEAN to user_prediction_outcomes (future train/test split)
--   3. Creates `main_formula_heldout_events` table (mirrors d8_heldout_events pattern)
--   4. Creates `main_formula_holdout_summary` VIEW for monitoring coverage
--   5. Backfills the bootstrap calibration record into engine_calibration_versions
--   6. Logs to scoring_architecture_log
--
-- THE ACCURACY CLAIM
-- ──────────────────
-- Correct claim:  "AUC-ROC 0.81 on 40-event holdout; in-sample AUC 0.84 after
--                  adding D2/D3/D6/D7 predictors (marginal gain +0.03, in-sample
--                  only — holdout not re-evaluated with D2/D3/D6/D7 terms active)."
-- Wrong claim:    "AUC 0.84" without qualification implies holdout performance.
-- ═══════════════════════════════════════════════════════════════════════════════


-- ── 0. Schema fix: scoring_architecture_log missing columns ──────────────────
-- The table was created in 20260623000001 with only:
--   dimension_key, formula_weight, status, source_description,
--   validation_date, notes, created_at, updated_at
-- Migrations 000012–000019 use additional columns that must exist before
-- any INSERT runs. Adding them here (idempotent) so all downstream
-- migrations succeed.
ALTER TABLE public.scoring_architecture_log
  ADD COLUMN IF NOT EXISTS change_type   TEXT,
  ADD COLUMN IF NOT EXISTS description   TEXT,
  ADD COLUMN IF NOT EXISTS migration_ref TEXT,
  ADD COLUMN IF NOT EXISTS layer_id      TEXT,
  ADD COLUMN IF NOT EXISTS finding       TEXT,
  ADD COLUMN IF NOT EXISTS severity      TEXT,
  ADD COLUMN IF NOT EXISTS component     TEXT,
  ADD COLUMN IF NOT EXISTS resolution    TEXT;

-- ── 1. Add main_formula_validation_metadata to engine_calibration_versions ────
--
-- Stores the bootstrap calibration metadata that was previously only in TypeScript.
-- JSONB allows the shape to evolve without future schema migrations.
ALTER TABLE public.engine_calibration_versions
  ADD COLUMN IF NOT EXISTS main_formula_validation_metadata JSONB;

COMMENT ON COLUMN public.engine_calibration_versions.main_formula_validation_metadata IS
  'GAP-A01 — Bootstrap calibration provenance for the main composite formula. '
  'Shape: { train_n, holdout_n, holdout_auc_roc, full_model_auc_insample, '
  'd2_d3_d6_d7_marginal_gain_insample, d2_d3_d6_d7_holdout_validated, '
  'calibrated_at, geographic_breakdown, known_gaps }. '
  'holdout_auc_roc is the verifiable AUC from the 40-event held-out split. '
  'full_model_auc_insample is the in-sample AUC after adding D2/D3/D6/D7 — '
  'NOT validated on holdout. Do not cite full_model_auc_insample as holdout AUC.';


-- ── 2. Add is_holdout to user_prediction_outcomes ─────────────────────────────
--
-- Enables future train/test split discipline when the table accumulates enough
-- user-reported outcomes for live recalibration. Rows with is_holdout=TRUE are
-- excluded from regression training and used only for validation.
-- Default FALSE (all existing rows treated as training data by default).
ALTER TABLE public.user_prediction_outcomes
  ADD COLUMN IF NOT EXISTS is_holdout BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.user_prediction_outcomes
  ADD COLUMN IF NOT EXISTS used_in_training BOOLEAN;

COMMENT ON COLUMN public.user_prediction_outcomes.is_holdout IS
  'GAP-A01 — When TRUE, this outcome is reserved for hold-out validation and '
  'MUST NOT be included in regression training datasets. '
  'Set by the recalibrate-engine cron using stratified sampling (target 20% holdout). '
  'Default FALSE — all pre-flag outcomes are in the training pool.';

COMMENT ON COLUMN public.user_prediction_outcomes.used_in_training IS
  'When TRUE, this outcome was included in the most recent regression run. '
  'NULL means not yet assigned. FALSE means available for training but not yet used.';

CREATE INDEX IF NOT EXISTS idx_upo_holdout
  ON public.user_prediction_outcomes (is_holdout, outcome_reported)
  WHERE outcome_reported IS NOT NULL;


-- ── 3. Create main_formula_heldout_events ────────────────────────────────────
--
-- Mirrors the d8_heldout_events pattern. Stores the 40 bootstrap holdout events
-- (to be seeded by the calibration team) plus any future events reserved for
-- ongoing main-formula holdout validation.
--
-- Once at least 60 holdout events have confirmed outcomes (expanding from the
-- original 40-event bootstrap), the recalibrate-engine cron will re-evaluate
-- the full formula AUC on the updated holdout pool.
CREATE TABLE IF NOT EXISTS public.main_formula_heldout_events (
  id                  BIGSERIAL    PRIMARY KEY,

  -- ── Company identification ─────────────────────────────────────────────────
  company_name        TEXT         NOT NULL,
  company_ticker      TEXT,
  -- Cohort this event informs (GLOBAL = all companies; more specific scopes later)
  cohort_scope        TEXT         NOT NULL DEFAULT 'GLOBAL'
    CHECK (cohort_scope IN ('GLOBAL','INDIA_IT','US_BIG_TECH','EU_FINANCE','APAC','WAVE')),

  -- ── Ground truth ──────────────────────────────────────────────────────────
  -- outcome=TRUE: a significant layoff (≥5% workforce or ≥500 headcount) occurred
  -- within 18 months of audit_reference_date.
  outcome             BOOLEAN      NOT NULL,
  outcome_date        DATE,
  outcome_source      TEXT         NOT NULL,   -- 'layoffs_fyi' | 'sec_8k' | 'warn_act' | 'user_reported'
  layoff_pct          NUMERIC(5,2),            -- actual % of workforce cut (NULL if unknown)

  -- ── Formula scores at audit time ───────────────────────────────────────────
  -- The predicted risk score (0-100) the formula produced for this company.
  -- Stored so AUC can be computed without re-running the formula.
  predicted_score     SMALLINT     NOT NULL CHECK (predicted_score BETWEEN 0 AND 100),
  -- Confidence of the prediction (0-1) — used for weighted AUC variant.
  prediction_confidence NUMERIC(4,3),
  -- Formula version that generated this prediction.
  formula_version     TEXT         NOT NULL DEFAULT 'v40.0',

  -- ── When the audit ran ────────────────────────────────────────────────────
  audit_reference_date DATE        NOT NULL,   -- the date the formula was applied

  -- ── Provenance ────────────────────────────────────────────────────────────
  -- 'bootstrap': one of the original 40 events from the Jan 2026 calibration
  -- 'ongoing':   added after launch for ongoing holdout pool expansion
  event_provenance    TEXT         NOT NULL DEFAULT 'ongoing'
    CHECK (event_provenance IN ('bootstrap', 'ongoing')),

  notes               TEXT,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  created_by          TEXT         NOT NULL DEFAULT 'calibration_team',

  UNIQUE (company_name, audit_reference_date)
);

COMMENT ON TABLE public.main_formula_heldout_events IS
  'GAP-A01 — Held-out validation events for the main composite formula. '
  'Mirrors d8_heldout_events. The 40 bootstrap events from the Jan 2026 '
  'calibration should be seeded here by the calibration team with '
  'event_provenance=''bootstrap''. Verifiable AUC-ROC on this set = 0.81. '
  'After seeding, ongoing events (event_provenance=''ongoing'') expand '
  'the holdout pool for continuous formula validation.';

-- RLS: calibration team writes (service_role); pipeline reads for AUC display.
ALTER TABLE public.main_formula_heldout_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mfhe_read_authenticated"
  ON public.main_formula_heldout_events FOR SELECT
  TO authenticated, anon
  USING (TRUE);

CREATE INDEX IF NOT EXISTS idx_mfhe_cohort_outcome
  ON public.main_formula_heldout_events (cohort_scope, outcome, audit_reference_date DESC);

CREATE INDEX IF NOT EXISTS idx_mfhe_bootstrap
  ON public.main_formula_heldout_events (event_provenance)
  WHERE event_provenance = 'bootstrap';


-- ── 4. main_formula_holdout_summary VIEW ─────────────────────────────────────
--
-- Provides a monitoring snapshot of the holdout pool completeness.
-- Used by the calibration team to track how many of the 40 bootstrap events
-- have been seeded and whether the holdout AUC can be recomputed.
CREATE OR REPLACE VIEW public.main_formula_holdout_summary AS
SELECT
  cohort_scope,
  event_provenance,
  COUNT(*)                                              AS n_total,
  SUM(CASE WHEN outcome THEN 1 ELSE 0 END)             AS n_positive,
  SUM(CASE WHEN NOT outcome THEN 1 ELSE 0 END)         AS n_negative,
  MIN(audit_reference_date)                             AS earliest_event,
  MAX(audit_reference_date)                             AS latest_event,
  -- When n_total >= 40 and both positives >= 10 and negatives >= 10,
  -- the AUC estimate is meaningful (above random-walk stability threshold).
  CASE
    WHEN COUNT(*) >= 40
     AND SUM(CASE WHEN outcome THEN 1 ELSE 0 END)     >= 10
     AND SUM(CASE WHEN NOT outcome THEN 1 ELSE 0 END) >= 10
    THEN TRUE
    ELSE FALSE
  END                                                   AS auc_computable,
  -- Seed reminder: 40 bootstrap events are expected but not yet seeded in DB.
  -- This value is 0 until the calibration team runs the seeding script.
  40 - COUNT(*) FILTER (WHERE event_provenance = 'bootstrap')
                                                        AS bootstrap_events_still_needed
FROM public.main_formula_heldout_events
GROUP BY cohort_scope, event_provenance;

COMMENT ON VIEW public.main_formula_holdout_summary IS
  'GAP-A01 — Monitoring view for main formula holdout pool completeness. '
  'bootstrap_events_still_needed will be 40 until the calibration team seeds '
  'the original 40 holdout events from the Jan 2026 calibration.';


-- ── 5. Backfill bootstrap calibration record ─────────────────────────────────
--
-- Insert the bootstrap calibration metadata into engine_calibration_versions.
-- This row records what was previously only in TypeScript (CALIBRATION_META).
-- Status='active' for GLOBAL scope — this IS the current active calibration.
--
-- NOTE: The existing partial unique index `uq_ecv_active_per_scope` enforces
-- at most one active row per cohort_scope. The previous WAVE pending row from
-- migration 20260623000011 uses cohort_scope='WAVE', so no conflict.
--
-- If a GLOBAL active row already exists (from a prior migration), we skip the
-- INSERT to avoid violating the unique constraint. The UPDATE below will still
-- add the new metadata column value to any existing active row.

DO $$
DECLARE
  v_existing_global_active BIGINT;
BEGIN
  -- Check for an existing GLOBAL active row
  SELECT id INTO v_existing_global_active
  FROM public.engine_calibration_versions
  WHERE cohort_scope = 'GLOBAL' AND status = 'active'
  LIMIT 1;

  IF v_existing_global_active IS NULL THEN
    -- No active GLOBAL row — insert the bootstrap record
    INSERT INTO public.engine_calibration_versions (
      version,
      cohort_scope,
      status,
      -- Layer multipliers from LAYER_CALIBRATION in empiricalCalibration.ts
      l1_multiplier,
      l2_multiplier,
      l3_multiplier,
      l4_multiplier,
      l5_multiplier,
      -- D8 logistic coefficients (from D8_LOGISTIC_COEFFICIENTS)
      d8_beta0,
      d8_beta_l1,
      d8_beta_l2,
      d8_beta_ai_signal,
      d8_beta_layoff_rounds,
      -- Threshold tables (JSONB — shape matches empiricalCalibration constants)
      revenue_growth_thresholds,
      stock_trend_thresholds,
      fcf_margin_thresholds,
      -- Quality metrics on the held-out set
      auc_combined,
      -- Provenance
      n_events_total,
      n_events_distress,
      n_events_efficiency,
      training_window_start,
      training_window_end,
      -- GAP-A01: main formula validation metadata
      main_formula_validation_metadata,
      created_by,
      activated_at,
      activation_reason
    ) VALUES (
      'v40.0-bootstrap-2026-01-15',
      'GLOBAL',
      'active',
      -- LAYER_CALIBRATION from empiricalCalibration.ts
      1.00,  -- l1_multiplier
      1.11,  -- l2_multiplier: most under-weighted
      0.93,  -- l3_multiplier: displacement 12-24mo signal
      0.98,  -- l4_multiplier: near neutral
      0.94,  -- l5_multiplier: personal protection over-weighted
      -- D8_LOGISTIC_COEFFICIENTS from empiricalCalibration.ts
      -2.10,   -- d8_beta0
       0.85,   -- d8_beta_l1
       0.72,   -- d8_beta_l2
       1.20,   -- d8_beta_ai_signal
       0.65,   -- d8_beta_layoff_rounds
      -- Revenue growth thresholds (piecewise linear, from empiricalCalibration.ts)
      '[{"threshold": -0.20, "risk": 0.85}, {"threshold": -0.05, "risk": 0.60}, {"threshold": 0.00, "risk": 0.40}, {"threshold": 0.10, "risk": 0.20}, {"threshold": 0.25, "risk": 0.05}]',
      -- Stock trend thresholds
      '[{"threshold": -0.40, "risk": 0.90}, {"threshold": -0.20, "risk": 0.70}, {"threshold": 0.00, "risk": 0.40}, {"threshold": 0.15, "risk": 0.20}, {"threshold": 0.30, "risk": 0.05}]',
      -- FCF margin thresholds
      '[{"threshold": -0.30, "risk": 0.85}, {"threshold": -0.10, "risk": 0.65}, {"threshold": 0.00, "risk": 0.45}, {"threshold": 0.10, "risk": 0.20}, {"threshold": 0.20, "risk": 0.05}]',
      -- auc_combined: holdout AUC from 40-event split (NOT the in-sample 0.84)
      0.810,
      -- Provenance
      200,   -- n_events_total (160 training + 40 holdout)
      144,   -- n_events_distress (~72% of 200; from methodology note)
      20,    -- n_events_efficiency (efficient restructuring events)
      '2023-01-01',
      '2025-12-31',
      -- GAP-A01: explicit holdout/in-sample distinction
      '{
        "train_n": 160,
        "holdout_n": 40,
        "holdout_auc_roc": 0.81,
        "full_model_auc_insample": 0.84,
        "d2_d3_d6_d7_marginal_gain_insample": 0.03,
        "d2_d3_d6_d7_holdout_validated": false,
        "calibrated_at": "2026-01-15",
        "geographic_breakdown": {
          "us_pct": 70,
          "india_pct": 20,
          "other_pct": 10
        },
        "known_gaps": [
          "Manufacturing/Industrial: n=8 (4% of training) — L4 may understate risk",
          "Emerging markets (LatAm, MEA, SEA): n=0 — do not use for primary-market companies",
          "Pre-IPO startups: n=12 — L1 confidence unreliable for private early-stage",
          "D2/D3/D6/D7 marginal gain 0.03 is IN-SAMPLE ONLY — not re-evaluated on holdout"
        ],
        "accuracy_claim": "AUC 0.81 on 40-event holdout. In-sample AUC reaches 0.84 with D2/D3/D6/D7 simultaneous regression (marginal +0.03 in-sample; holdout not re-evaluated with these terms)."
      }',
      'gap_a01_migration',
      NOW(),
      'GAP-A01 migration: bootstrap calibration record. Holdout AUC=0.81 (40 events). '
      'In-sample AUC=0.84 with D2/D3/D6/D7 (marginal gain in-sample only).'
    );
  ELSE
    -- Active GLOBAL row already exists — patch in the metadata column only
    UPDATE public.engine_calibration_versions
    SET main_formula_validation_metadata = '{
        "train_n": 160,
        "holdout_n": 40,
        "holdout_auc_roc": 0.81,
        "full_model_auc_insample": 0.84,
        "d2_d3_d6_d7_marginal_gain_insample": 0.03,
        "d2_d3_d6_d7_holdout_validated": false,
        "calibrated_at": "2026-01-15",
        "geographic_breakdown": {
          "us_pct": 70,
          "india_pct": 20,
          "other_pct": 10
        },
        "known_gaps": [
          "Manufacturing/Industrial: n=8 (4%) — L4 may understate risk",
          "Emerging markets (LatAm, MEA, SEA): n=0 — scores unreliable",
          "Pre-IPO startups: n=12 — L1 confidence unreliable",
          "D2/D3/D6/D7 marginal gain 0.03 is IN-SAMPLE ONLY"
        ],
        "accuracy_claim": "AUC 0.81 on 40-event holdout. In-sample AUC 0.84 with D2/D3/D6/D7 (in-sample only)."
      }'::jsonb
    WHERE id = v_existing_global_active;

    RAISE NOTICE 'GAP-A01: Existing active GLOBAL row (id=%) patched with main_formula_validation_metadata.', v_existing_global_active;
  END IF;
END $$;


-- ── 6. Log to scoring_architecture_log ───────────────────────────────────────
INSERT INTO public.scoring_architecture_log (
  dimension_key,
  change_type,
  description,
  migration_ref,
  created_at
) VALUES (
  'main_formula_holdout_validation',
  'audit_fix',
  'GAP-A01: Persisted main formula holdout validation metadata. '
  'Holdout: n=40, AUC-ROC=0.81. In-sample full model AUC=0.84 (D2/D3/D6/D7 marginal; NOT holdout-validated). '
  'Added main_formula_validation_metadata JSONB to engine_calibration_versions. '
  'Added is_holdout + used_in_training to user_prediction_outcomes. '
  'Created main_formula_heldout_events table and main_formula_holdout_summary view. '
  'See layoffScoreEngine.ts: "Full model AUC 0.84" comments corrected to "in-sample only".',
  '20260623000012',
  NOW()
)
ON CONFLICT DO NOTHING;
