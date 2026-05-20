-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: 20260520000002_calibration_segments.sql
-- Purpose:   Extend engine_calibration_versions to support segment-specific
--            coefficient bundles keyed by region × industry × company size.
--
-- WHY THIS EXISTS
-- ───────────────
-- A 50,000-person Indian IT services firm has structurally different layoff
-- dynamics from a 300-person US fintech. Global pooled coefficients
-- (GLOBAL CohortScope) systematically miscalibrate for one or both
-- populations: when AI adoption drives BPO substitution in India, L3
-- (role displacement) is the dominant predictor — the global L3 multiplier
-- of 0.93 actively suppresses the most predictive signal.
--
-- SEGMENT KEY FORMAT
-- ──────────────────
-- "{REGION}__{INDUSTRY}__{SIZE}" where:
--   REGION:   US | EU | INDIA | APAC | LATAM | ANY
--   INDUSTRY: TECH | HEALTHCARE | FINANCE | INDUSTRIAL | SERVICES | ANY
--   SIZE:     SMALL (<1K) | MEDIUM (1K–10K) | LARGE (>10K) | ANY
--
-- Examples:
--   "INDIA__TECH__LARGE"     — 50K-person Indian IT services firm
--   "US__TECH__SMALL"        — 300-person US fintech
--   "ANY__HEALTHCARE__ANY"   — cross-region healthcare pooled estimate
--
-- FALLBACK CHAIN (enforced in calibrationLoader.ts)
-- ─────────────────────────────────────────────────
-- Exact → drop size → drop industry → region only →
-- industry+size → industry only → size only →
-- legacy CohortScope chain → GLOBAL bootstrap
--
-- 80-OUTCOME MINIMUM (MIN_SEGMENT_OUTCOMES)
-- ─────────────────────────────────────────
-- A segment row is only used when n_events_total >= 80. Below that threshold
-- the row is treated as a miss and the next segment in the fallback chain is
-- tried. This prevents noisy regression from fewer than 80 outcomes from
-- degrading accuracy versus the pooled global estimate.
--
-- BOOTSTRAP SEED ROWS
-- ────────────────────
-- Initial seed rows carry the research-grounded multipliers from
-- segmentedCalibrationEngine.ts. All have n_events_total < 80 — they will
-- NOT be served by the DB query (which requires >= 80) until real regression
-- accumulates. The loader falls through to the in-memory bootstrap matrix
-- for those cases. Seeding them here creates the schema structure and gives
-- the recalibrate-engine cron job the correct rows to UPDATE once outcomes
-- accumulate.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Extend the table ───────────────────────────────────────────────────────

ALTER TABLE engine_calibration_versions
  ADD COLUMN IF NOT EXISTS segment_key TEXT;

-- One active row per segment_key. NULL segment_key = legacy CohortScope row.
CREATE UNIQUE INDEX IF NOT EXISTS ecv_segment_active_uniq
  ON engine_calibration_versions (segment_key)
  WHERE segment_key IS NOT NULL AND status = 'active';

-- Fast lookup by segment_key for the loader
CREATE INDEX IF NOT EXISTS ecv_segment_key_idx
  ON engine_calibration_versions (segment_key, n_events_total)
  WHERE segment_key IS NOT NULL AND status = 'active';

-- ── 2. Helper — ensure engine_calibration_versions has required columns ───────
-- The table was originally created in a prior migration without segment_key.
-- This migration adds n_events_total if missing (belt-and-suspenders).
ALTER TABLE engine_calibration_versions
  ADD COLUMN IF NOT EXISTS n_events_total INTEGER NOT NULL DEFAULT 0;

-- ── 3. Seed bootstrap segment rows ───────────────────────────────────────────
-- Multipliers from segmentedCalibrationEngine.ts SEGMENT_CALIBRATIONS matrix.
-- L1–L5 values = BOOTSTRAP_LAYER_CALIBRATION × segment multiplier:
--   Bootstrap: L1=1.00, L2=1.11, L3=0.93, L4=0.98, L5=0.94
-- Threshold arrays are bootstrapped from the global defaults (empty JSON
-- arrays → loader falls back to BOOTSTRAP_* constants).
-- These rows have n_events_total < 80 → DB query skips them.
-- They exist so the recalibrate-engine cron can UPDATE them with regression
-- values once ≥80 outcomes accumulate per segment.

INSERT INTO engine_calibration_versions (
  version, cohort_scope, segment_key, status,
  l1_multiplier, l2_multiplier, l3_multiplier, l4_multiplier, l5_multiplier,
  d8_beta0, d8_beta_l1, d8_beta_l2, d8_beta_ai_signal, d8_beta_layoff_rounds,
  revenue_growth_thresholds, stock_trend_thresholds, fcf_margin_thresholds,
  auc_distress, auc_efficiency, auc_wave, auc_combined,
  coverage_at_90, coverage_at_80, coverage_at_50,
  n_events_total
)
VALUES
  -- ── India · Tech (IT services, software) ────────────────────────────────
  -- ENTERPRISE_IT_SERVICES_INDIA: l1=0.75, l2=1.15, l3=1.35, l4=1.25, l5=0.85
  -- Applied on top of bootstrap: L1=0.75, L2=1.28, L3=1.26, L4=1.23, L5=0.80
  ('v40.0-seg-seed', 'GLOBAL', 'INDIA__TECH__LARGE',  'bootstrap',
   0.75, 1.28, 1.26, 1.23, 0.80,
   -2.1, 0.8, 0.6, 1.2, 0.4, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
   0.79, NULL, NULL, 0.79, NULL, NULL, NULL, 28),

  -- MID_MARKET_IT_SERVICES_INDIA: l1=0.80, l2=1.10, l3=1.45, l4=1.30, l5=0.80
  ('v40.0-seg-seed', 'GLOBAL', 'INDIA__TECH__MEDIUM', 'bootstrap',
   0.80, 1.22, 1.35, 1.27, 0.75,
   -2.1, 0.8, 0.6, 1.2, 0.4, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
   0.76, NULL, NULL, 0.76, NULL, NULL, NULL, 12),

  -- STARTUP_IT_SERVICES_INDIA: l1=0.85, l2=1.25, l3=1.20, l4=1.20, l5=0.75
  ('v40.0-seg-seed', 'GLOBAL', 'INDIA__TECH__SMALL',  'bootstrap',
   0.85, 1.39, 1.12, 1.18, 0.71,
   -2.1, 0.8, 0.6, 1.2, 0.4, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
   0.73, NULL, NULL, 0.73, NULL, NULL, NULL, 8),

  -- India BPO → SERVICES segment
  -- MID_MARKET_BPO_INDIA: l1=0.70, l2=1.05, l3=1.55, l4=1.25, l5=0.75
  ('v40.0-seg-seed', 'GLOBAL', 'INDIA__SERVICES__MEDIUM', 'bootstrap',
   0.70, 1.17, 1.44, 1.23, 0.71,
   -2.1, 0.8, 0.6, 1.2, 0.4, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
   0.81, NULL, NULL, 0.81, NULL, NULL, NULL, 15),

  -- MID_MARKET_BPO_INDIA large
  ('v40.0-seg-seed', 'GLOBAL', 'INDIA__SERVICES__LARGE', 'bootstrap',
   0.68, 1.14, 1.49, 1.27, 0.70,
   -2.1, 0.8, 0.6, 1.2, 0.4, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
   0.80, NULL, NULL, 0.80, NULL, NULL, NULL, 10),

  -- ── US · Tech ────────────────────────────────────────────────────────────
  -- HYPERSCALER_TECH: l1=0.70, l2=0.90, l3=1.10, l4=0.80, l5=1.10
  ('v40.0-seg-seed', 'GLOBAL', 'US__TECH__LARGE',     'bootstrap',
   0.70, 1.00, 1.02, 0.78, 1.03,
   -2.1, 0.8, 0.6, 1.2, 0.4, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
   0.68, NULL, NULL, 0.68, NULL, NULL, NULL, 45),

  -- STARTUP_TECH: l1=0.85, l2=1.30, l3=0.80, l4=1.10, l5=0.95
  ('v40.0-seg-seed', 'GLOBAL', 'US__TECH__SMALL',     'bootstrap',
   0.85, 1.44, 0.74, 1.08, 0.89,
   -2.1, 0.8, 0.6, 1.2, 0.4, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
   0.74, NULL, NULL, 0.74, NULL, NULL, NULL, 20),

  -- MID_MARKET_TECH: l1=1.10, l2=1.05, l3=1.00, l4=0.95, l5=0.95
  ('v40.0-seg-seed', 'GLOBAL', 'US__TECH__MEDIUM',    'bootstrap',
   1.10, 1.17, 0.93, 0.93, 0.89,
   -2.1, 0.8, 0.6, 1.2, 0.4, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
   0.79, NULL, NULL, 0.79, NULL, NULL, NULL, 18),

  -- ── US · Finance ─────────────────────────────────────────────────────────
  -- MID_MARKET_FINANCE: l1=1.20, l2=0.95, l3=0.85, l4=1.10, l5=1.00
  ('v40.0-seg-seed', 'GLOBAL', 'US__FINANCE__MEDIUM', 'bootstrap',
   1.20, 1.05, 0.79, 1.08, 0.94,
   -2.1, 0.8, 0.6, 1.2, 0.4, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
   0.76, NULL, NULL, 0.76, NULL, NULL, NULL, 12),

  -- ── Healthcare (cross-region) ─────────────────────────────────────────────
  -- MID_MARKET_HEALTHCARE: l1=1.00, l2=0.85, l3=0.60, l4=0.90, l5=1.30
  ('v40.0-seg-seed', 'GLOBAL', 'ANY__HEALTHCARE__ANY', 'bootstrap',
   1.00, 0.94, 0.56, 0.88, 1.22,
   -2.1, 0.8, 0.6, 1.2, 0.4, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
   0.72, NULL, NULL, 0.72, NULL, NULL, NULL, 14),

  -- ── EU · Finance ─────────────────────────────────────────────────────────
  -- Based on MID_MARKET_FINANCE with EU financial stability adjustment
  ('v40.0-seg-seed', 'GLOBAL', 'EU__FINANCE__MEDIUM', 'bootstrap',
   1.15, 1.00, 0.72, 1.05, 1.05,
   -2.1, 0.8, 0.6, 1.2, 0.4, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
   0.74, NULL, NULL, 0.74, NULL, NULL, NULL, 9),

  -- ── Cross-region pooled estimates (ANY dimension) ─────────────────────────
  -- Used as intermediate fallback when region-specific data is thin.
  -- ENTERPRISE_TECH pooled (any region)
  ('v40.0-seg-seed', 'GLOBAL', 'ANY__TECH__LARGE',    'bootstrap',
   1.05, 1.22, 0.98, 0.88, 0.98,
   -2.1, 0.8, 0.6, 1.2, 0.4, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
   0.82, NULL, NULL, 0.82, NULL, NULL, NULL, 65)

ON CONFLICT DO NOTHING;

-- ── 4. Operator view — segment calibration coverage ──────────────────────────
-- Shows which segments have DB-backed calibration vs. bootstrap-only.

CREATE OR REPLACE VIEW v_calibration_segment_coverage AS
SELECT
  segment_key,
  version,
  status,
  n_events_total,
  CASE
    WHEN n_events_total >= 80 THEN 'db_active'
    WHEN n_events_total > 0   THEN 'bootstrap_seeded'
    ELSE                           'empty'
  END                                                 AS coverage_tier,
  l1_multiplier, l2_multiplier, l3_multiplier, l4_multiplier, l5_multiplier,
  auc_combined,
  created_at
FROM engine_calibration_versions
WHERE segment_key IS NOT NULL
ORDER BY
  CASE WHEN n_events_total >= 80 THEN 0 ELSE 1 END,
  n_events_total DESC,
  segment_key;
