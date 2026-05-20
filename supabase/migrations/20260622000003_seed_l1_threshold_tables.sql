-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260622000003_seed_l1_threshold_tables.sql
-- Purpose:   Seed the GLOBAL bootstrap L1 threshold tables into
--            engine_calibration_versions so they are DB-backed and overridable,
--            not just hardcoded in empiricalCalibration.ts.
--
-- This row is the canonical source of truth for the L1 piecewise thresholds.
-- When a segment-specific row with n_events_total >= 80 exists for a given
-- segment (e.g. INDIA__TECH__LARGE), its thresholds take precedence via the
-- calibrationLoader.ts segment resolution hierarchy.
--
-- Provenance of bootstrap values:
--   revenue_growth_thresholds : manual_seed (developer-specified 2026-05-22)
--   stock_trend_thresholds    : manual_seed (developer-specified 2026-05-22)
--
-- When the recalibrate-engine cron accumulates ≥80 outcomes for a segment,
-- it will INSERT a new row for that segment with provenance='regression_derived'
-- and the previous row will be marked 'superseded'. The GLOBAL row below
-- remains as the permanent fallback.
--
-- Layer multipliers: match LAYER_CALIBRATION in empiricalCalibration.ts exactly
-- so this row does not alter multiplier behaviour — it is for threshold storage only.
-- d8 betas: set to bootstrap values from D8_LOGISTIC_COEFFICIENTS. The loader
-- ignores these columns and reads BOOTSTRAP_D8 until the D8 schema is aligned.
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO public.engine_calibration_versions (
  version,
  cohort_scope,
  status,
  -- Layer multipliers (match LAYER_CALIBRATION constants exactly — no change in behavior)
  l1_multiplier, l2_multiplier, l3_multiplier, l4_multiplier, l5_multiplier,
  -- D8 logistic betas (bootstrap placeholders — loader still uses BOOTSTRAP_D8 in code)
  d8_beta0, d8_beta_l1, d8_beta_l2, d8_beta_ai_signal, d8_beta_layoff_rounds,
  -- L1 threshold tables (the purpose of this migration)
  revenue_growth_thresholds,
  stock_trend_thresholds,
  fcf_margin_thresholds,
  -- Quality metrics (bootstrap placeholders)
  auc_distress, auc_efficiency, auc_wave, auc_combined,
  -- Coverage metrics (unknown at bootstrap)
  coverage_at_90, coverage_at_80, coverage_at_50,
  -- Coverage counts
  n_events_total, n_events_distress, n_events_efficiency, n_events_wave,
  -- Audit
  activation_reason,
  created_by
)
VALUES (
  'v40.2026-05-22',
  'GLOBAL',
  'active',
  -- Layer multipliers: L1=1.00, L2=1.11, L3=0.93, L4=0.98, L5=0.94
  1.0000, 1.1100, 0.9300, 0.9800, 0.9400,
  -- D8 bootstrap betas (intercept, l1, l2, ai_signal, layoff_rounds)
  -1.8200, 0.8700, 0.6300, 1.4500, 0.6300,
  -- Revenue growth thresholds (spec: [-20%→1.0, -5%→0.80, 0%→0.60, +5%→0.40, +15%→0.20, +25%→0.10])
  -- Each point: {"threshold": N, "risk": R, "provenance": "manual_seed"}
  '[
    {"threshold": -20, "risk": 1.00, "provenance": "manual_seed"},
    {"threshold":  -5, "risk": 0.80, "provenance": "manual_seed"},
    {"threshold":   0, "risk": 0.60, "provenance": "manual_seed"},
    {"threshold":   5, "risk": 0.40, "provenance": "manual_seed"},
    {"threshold":  15, "risk": 0.20, "provenance": "manual_seed"},
    {"threshold":  25, "risk": 0.10, "provenance": "manual_seed"}
  ]'::jsonb,
  -- Stock trend thresholds (spec: [-50%→1.0, -30%→0.85, -15%→0.70, 0%→0.50, +10%→0.30, +20%→0.15])
  '[
    {"threshold": -50, "risk": 1.00, "provenance": "manual_seed"},
    {"threshold": -30, "risk": 0.85, "provenance": "manual_seed"},
    {"threshold": -15, "risk": 0.70, "provenance": "manual_seed"},
    {"threshold":   0, "risk": 0.50, "provenance": "manual_seed"},
    {"threshold":  10, "risk": 0.30, "provenance": "manual_seed"},
    {"threshold":  20, "risk": 0.15, "provenance": "manual_seed"}
  ]'::jsonb,
  -- FCF margin thresholds (unchanged from existing bootstrap)
  '[
    {"threshold": -20, "risk":  0.15},
    {"threshold": -10, "risk":  0.08},
    {"threshold":  -5, "risk":  0.04},
    {"threshold":   0, "risk":  0.00},
    {"threshold":   5, "risk": -0.04},
    {"threshold":  10, "risk": -0.07},
    {"threshold":  20, "risk": -0.10}
  ]'::jsonb,
  -- AUC from bootstrap calibration run (layoffs.fyi 200 events)
  0.960, 0.760, 0.720, 0.810,
  -- Coverage: unknown until conformal calibration runs on this row
  NULL, NULL, NULL,
  -- Event counts (bootstrap — not derived from segment-specific outcomes)
  200, 0, 47, 0,
  -- Audit trail
  'Bootstrap seed: GLOBAL L1 threshold tables stored as DB-backed parameters. '
  'revenue_growth_thresholds and stock_trend_thresholds match CALIBRATED_*_THRESHOLDS '
  'bootstrap constants in empiricalCalibration.ts. All provenance=manual_seed. '
  'Segment rows with n_events_total>=80 will override these values automatically.',
  'migration-20260622000003'
)
ON CONFLICT (version, cohort_scope) DO NOTHING;
