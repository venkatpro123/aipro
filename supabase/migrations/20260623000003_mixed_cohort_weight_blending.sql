-- Migration: 20260623000003_mixed_cohort_weight_blending.sql
--
-- Documents the mixed EFFICIENCY+WAVE cohort weight blending fix.
-- Addresses the 2023 US tech hyperscaler pattern: profitable company cutting for
-- AI efficiency WHILE the entire sector restructures simultaneously (Google/Meta/
-- Amazon/Microsoft/Salesforce all cutting in the same 6-month window).
--
-- THREE ROOT CAUSES FIXED:
--
-- Gap 1 — classifyCohort() mixed-case detection:
--   Only checked DISTRESS+EFFICIENCY as a mixed case. No check for EFFICIENCY+WAVE.
--   When efficiency=0.57 and wave=0.35, the system picked EFFICIENCY and dropped
--   the WAVE sector-contagion signal entirely.
--
-- Gap 2 — recommendedLayerWeights was a static hard lookup:
--   COHORT_LAYER_WEIGHTS[primaryCohort] regardless of secondary cohort strength.
--   Now: computeWeightedLayerWeights() produces a probability-weighted blend.
--   Pure cohorts: ≤2% deviation from static table (noise floor from minor cohorts).
--   Mixed 57/35 split: L4 = 0.277 (was 0.220) — captures the WAVE L4 signal.
--
-- Gap 3 — blendCohortWeights() routed L4 to a single channel (winner-take-all):
--   EFFICIENCY → ALL of L4 → D8 (AI efficiency)
--   WAVE       → ALL of L4 → D7 (sector contagion)
--   For mixed EFFICIENCY+WAVE (both >0.20), now splits proportionally:
--     effShare = eff_prob / (eff_prob + wave_prob)
--     waveShare = 1 - effShare
--     D8 gets: L4_budget × effShare    (AI efficiency component)
--     D7 gets: L4_budget × waveShare   (sector contagion component)
--
-- QUANTIFIED IMPACT (Google-2023 scenario: eff=0.57, wave=0.35, dist=0.08):
--   Before: D8 cohort target = 0.22, D7 cohort target = 0.00
--   After:  D8 cohort target = 0.171, D7 cohort target = 0.105
--   Result: both AI efficiency AND sector contagion signals now reach the
--   composite score when both drivers are simultaneously present.
--   Blend ratio: 0.511 (probability-weighted vs fixed 0.55 for pure EFFICIENCY)

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
  'mixed_efficiency_wave_cohort_blending',
  0.00,  -- not a formula weight; architectural decision record
  'regression_derived',
  'Mixed EFFICIENCY+WAVE cohort: probability-weighted recommendedLayerWeights + dual L4 channel '
  'routing. computeWeightedLayerWeights(softWeights) = Σ(cohort_prob × cohort_layer_weights). '
  'blendCohortWeights() with cohortSoftWeights: when effProb>0.20 AND wavProb>0.20, L4 budget is '
  'split effShare→D8 (AI efficiency) and waveShare→D7 (sector contagion) proportionally. '
  'Blend ratio = probability-weighted average of per-cohort blend ratios.',
  '2026-06-23',
  'Pure cohort regression check: max deviation from static COHORT_LAYER_WEIGHTS table ≤2% '
  '(noise floor from minor cohorts at ~5% weight). Sum invariant: cohortWeights sum=1.0 × '
  'each cohort row sum=1.0 → weighted blend sum=1.0. No normalisation needed. '
  'EFFICIENCY+WAVE mixed case note added to cohortCalibrationNote when eff>0.35 AND wave>0.35. '
  'New field cohortSoftWeights on CohortClassification (alias of cohortWeights) propagated '
  'through ScoreInputs.cohortSoftWeights → blendCohortWeights().',
  now(),
  now()
)
ON CONFLICT (dimension_key)
DO UPDATE SET
  source_description = EXCLUDED.source_description,
  notes              = EXCLUDED.notes,
  updated_at         = now();

-- Synthetic probe: verify the mixed cohort produces elevated D7 vs pure EFFICIENCY
-- Expected: mixed cohort score ≥ pure EFFICIENCY score when peer layoffs are present
INSERT INTO synthetic_probe_results (
  scenario_name,
  expected_min,
  expected_max,
  actual_score,
  passed,
  segment,
  probe_run_id,
  created_at
) VALUES (
  'MIXED_EFFICIENCY_WAVE_D7_ELEVATION',
  50,
  75,
  NULL,  -- filled by probe runner
  NULL,
  'us_tech_hyperscaler',
  'mixed_cohort_' || to_char(now(), 'YYYYMMDD'),
  now()
)
ON CONFLICT (scenario_name, probe_run_id) DO NOTHING;
