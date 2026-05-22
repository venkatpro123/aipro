-- 20260623000017_india_it_calibration_probes.sql
--
-- Adds two India IT Services SWE synthetic probe scenarios to the
-- synthetic_probe_scenarios table.  These probes specifically test the
-- HYPERSCALER_IT_SERVICES_INDIA calibration path (L3 sector multiplier=1.35)
-- for Software Engineer roles — a gap left by the existing INDIA_BPO_BENCH_RISK
-- probe (which tests BPO analyst with automationRisk=0.95, not SWE at 0.58–0.75).
--
-- INDIA_IT_BENCH_RISK  — SWE-II on bench 60 days, Q1 seasonal cut cycle
--   expected_score=53  tolerance [48, 58]
--   Key differentiator: automationRisk=0.58 (AI-augmented SWE, not replaced)
--
-- INDIA_IT_HIGH_RISK   — same SWE, bench 90d+, PIP, sector-wave contagion
--   expected_score=70  tolerance [65, 75]
--   Key differentiator: below-average perf + extreme sector contagion
--
-- Formula traces verified manually against hybridScoringMath.ts.
-- No kill-switches fire on either scenario (stockTrend < 0.70 on both;
-- recentLayoffRecency >= 0.20 on both).

-- ── INDIA_IT_BENCH_RISK ───────────────────────────────────────────────────────

INSERT INTO synthetic_probe_scenarios (
  scenario_name,
  description,
  expected_score,
  tolerance_low,
  tolerance_high,
  input_snapshot,
  formula_trace,
  created_at
) VALUES (
  'INDIA_IT_BENCH_RISK',
  'India IT services: SWE-II on bench 60+ days, Q1 seasonal cut cycle, moderate AI automation exposure (not BPO). Tests HYPERSCALER_IT_SERVICES_INDIA L3 path for SWE roles.',
  53,
  48,
  58,
  jsonb_build_object(
    'companyName',   'SyntheticCo-IndiaITES',
    'roleTitle',     'Software Engineer II',
    'department',    'Engineering',
    'userFactors', jsonb_build_object(
      'tenureYears',         3.5,
      'isUniqueRole',        false,
      'performanceTier',     'average',
      'hasRecentPromotion',  false,
      'hasKeyRelationships', false
    ),
    'signals', jsonb_build_object(
      'revenueGrowth',       0.35,
      'stockTrend',          0.42,
      'fundingHealth',       0.25,
      'overstaffing',        0.75,
      'companySize',         0.65,
      'recentLayoffRecency', 0.42,
      'layoffFrequency',     0.60,
      'layoffSeverity',      0.55,
      'sectorContagion',     0.55,
      'departmentNews',      0.55,
      'automationRisk',      0.58,
      'aiToolMaturity',      0.50,
      'humanAmplification',  0.42,
      'industryBaseline',    0.45,
      'aiAdoptionRate',      0.62,
      'growthOutlook',       0.52
    )
  ),
  jsonb_build_object(
    'L1', 0.4425,
    'L2', 0.5715,
    'L3', 0.5560,
    'L4', 0.6366,
    'L5', 0.5200,
    'raw', 0.5309,
    'score', 53,
    'kill_switches_fired', jsonb_build_array(),
    'notes', 'stockTrend=0.42 < 0.70 (B does not fire); recentLayoffRecency=0.42 >= 0.20 (A does not fire)'
  ),
  now()
)
ON CONFLICT (scenario_name) DO UPDATE SET
  description      = EXCLUDED.description,
  expected_score   = EXCLUDED.expected_score,
  tolerance_low    = EXCLUDED.tolerance_low,
  tolerance_high   = EXCLUDED.tolerance_high,
  input_snapshot   = EXCLUDED.input_snapshot,
  formula_trace    = EXCLUDED.formula_trace,
  updated_at       = now();

-- ── INDIA_IT_HIGH_RISK ────────────────────────────────────────────────────────

INSERT INTO synthetic_probe_scenarios (
  scenario_name,
  description,
  expected_score,
  tolerance_low,
  tolerance_high,
  input_snapshot,
  formula_trace,
  created_at
) VALUES (
  'INDIA_IT_HIGH_RISK',
  'India IT services: SWE-II bench 90d+, below-average perf (PIP risk), Q4 pressure, sector-wide layoff contagion from major ITES peer cuts.',
  70,
  65,
  75,
  jsonb_build_object(
    'companyName',   'SyntheticCo-IndiaITES',
    'roleTitle',     'Software Engineer II',
    'department',    'Engineering',
    'userFactors', jsonb_build_object(
      'tenureYears',         2.0,
      'isUniqueRole',        false,
      'performanceTier',     'below',
      'hasRecentPromotion',  false,
      'hasKeyRelationships', false
    ),
    'signals', jsonb_build_object(
      'revenueGrowth',       0.58,
      'stockTrend',          0.65,
      'fundingHealth',       0.28,
      'overstaffing',        0.88,
      'companySize',         0.65,
      'recentLayoffRecency', 0.28,
      'layoffFrequency',     0.85,
      'layoffSeverity',      0.72,
      'sectorContagion',     0.82,
      'departmentNews',      0.78,
      'automationRisk',      0.75,
      'aiToolMaturity',      0.70,
      'humanAmplification',  0.30,
      'industryBaseline',    0.58,
      'aiAdoptionRate',      0.75,
      'growthOutlook',       0.62
    )
  ),
  jsonb_build_object(
    'L1', 0.6045,
    'L2', 0.7785,
    'L3', 0.7200,
    'L4', 0.8041,
    'L5', 0.6152,
    'raw', 0.6965,
    'score', 70,
    'kill_switches_fired', jsonb_build_array(),
    'notes', 'stockTrend=0.65 < 0.70 (B does not fire); recentLayoffRecency=0.28 >= 0.20 (A does not fire)'
  ),
  now()
)
ON CONFLICT (scenario_name) DO UPDATE SET
  description      = EXCLUDED.description,
  expected_score   = EXCLUDED.expected_score,
  tolerance_low    = EXCLUDED.tolerance_low,
  tolerance_high   = EXCLUDED.tolerance_high,
  input_snapshot   = EXCLUDED.input_snapshot,
  formula_trace    = EXCLUDED.formula_trace,
  updated_at       = now();

-- ── Architecture log entry ────────────────────────────────────────────────────

INSERT INTO scoring_architecture_log (
  change_type,
  component,
  description,
  migration_ref
) VALUES (
  'probe_added',
  'synthetic_probe_scenarios',
  'Added INDIA_IT_BENCH_RISK (expected=53, [48,58]) and INDIA_IT_HIGH_RISK (expected=70, [65,75]) to cover HYPERSCALER_IT_SERVICES_INDIA L3 path for SWE roles. Differentiates from INDIA_BPO_BENCH_RISK (automationRisk=0.95) via SWE-specific automationRisk=0.58/0.75 and humanAmplification=0.42/0.30. Formula traces verified against hybridScoringMath.ts.',
  '20260623000017'
);
