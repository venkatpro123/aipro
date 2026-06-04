-- Migration: 20260623000017_india_it_calibration_probes.sql
-- Purpose: Add India IT synthetic probe scenarios.

-- ── INDIA_IT_BENCH_RISK ───────────────────────────────────────────────────────
INSERT INTO synthetic_probe_scenarios (
  scenario_name,
  description,
  expected_score,
  tolerance_low,
  tolerance_high,
  market_segment,
  created_at
) VALUES (
  'INDIA_IT_BENCH_RISK',
  'India IT services: SWE-II on bench 60+ days, Q1 seasonal cut cycle, moderate AI automation exposure. Tests HYPERSCALER_IT_SERVICES_INDIA L3 path for SWE roles.',
  53,
  48,
  58,
  'india_it_services',
  now()
)
ON CONFLICT (scenario_name) DO UPDATE SET
  description    = EXCLUDED.description,
  expected_score = EXCLUDED.expected_score,
  tolerance_low  = EXCLUDED.tolerance_low,
  tolerance_high = EXCLUDED.tolerance_high,
  market_segment = EXCLUDED.market_segment;

-- ── INDIA_IT_HIGH_RISK ────────────────────────────────────────────────────────
INSERT INTO synthetic_probe_scenarios (
  scenario_name,
  description,
  expected_score,
  tolerance_low,
  tolerance_high,
  market_segment,
  created_at
) VALUES (
  'INDIA_IT_HIGH_RISK',
  'India IT services: SWE-II bench 90d+, below-average perf, Q4 pressure, sector-wide layoff contagion from major ITES peer cuts.',
  70,
  65,
  75,
  'india_it_services',
  now()
)
ON CONFLICT (scenario_name) DO UPDATE SET
  description    = EXCLUDED.description,
  expected_score = EXCLUDED.expected_score,
  tolerance_low  = EXCLUDED.tolerance_low,
  tolerance_high = EXCLUDED.tolerance_high,
  market_segment = EXCLUDED.market_segment;

-- ── Architecture log entry ────────────────────────────────────────────────────
INSERT INTO scoring_architecture_log (
  dimension_key,
  change_type,
  description,
  migration_ref
) VALUES (
  'v40_india_it_calibration_probes',
  'probe_added',
  'Added INDIA_IT_BENCH_RISK (expected=53, [48,58]) and INDIA_IT_HIGH_RISK (expected=70, [65,75]) for HYPERSCALER_IT_SERVICES_INDIA L3 SWE path.',
  '20260623000017'
)
ON CONFLICT (dimension_key) DO NOTHING;
