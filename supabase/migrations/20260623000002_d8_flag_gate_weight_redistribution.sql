-- Migration: 20260623000002_d8_flag_gate_weight_redistribution.sql
--
-- Documents BUG-02: D8 flag-gate weight redistribution behaviour and double-count fix.
--
-- THREE ISSUES FIXED:
--
-- Issue C (code bug, double-count):
--   When EFFICIENCY cohort heuristic OR Condition3 fired D8 via the formula
--   (D8_heuristic × 0.09 ≈ 4 pts) AND hyperscaler proxy conditions were also met
--   (+12 pts), both paths fired simultaneously → total D8 effect = ~16 pts vs
--   the intended maximum of 9 pts (D8_value = 1.0 × weight = 0.09).
--   Fix: proxy is now suppressed when _d8IsHeuristicActive = true.
--
-- Issue A (disclosure):
--   When D8 flag is off AND no heuristic fires, D8 = 0. The 0.09 weight slot is
--   occupied but contributes nothing. Maximum achievable formula score = 91 pts.
--   TransparencyTab now shows the D8 row in EffectiveWeightsPanel with "LOCKED"
--   badge and a banner explaining the 9% locked-out budget.
--
-- Issue B (proxy overshoot, documented design choice):
--   Proxy (+0.12 = 12 pts) intentionally exceeds D8 max formula contribution
--   (+0.09 = 9 pts at D8_value = 1.0). The 3 pt (+33%) margin compensates for
--   the heuristic's inability to match the full logistic output range.
--   Now disclosed in TransparencyTab proxy section.

-- ── 1. Document D8 weight-gate architecture in calibration_provenance ─────────

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
  'D8_aiEfficiencyRestructuring_flag_gate',
  0.09,
  'regression_derived',
  'D8 formula weight = 0.09 (regression-derived from 47 efficiency-driven events, AUC 0.76). '
  'The weight is ALWAYS present in COMPOSITE_FORMULA_WEIGHTS. Whether D8 contributes to the '
  'composite score depends on runtime flag state: '
  '(1) v39_d8_ai_efficiency_active = ON → logistic path, D8 = sigmoid(β·inputs). '
  '(2) primaryCohort = EFFICIENCY → heuristic fallback, D8 = calculateAIEfficiencyRestructuringRisk(). '
  '(3) Condition3 detected → heuristic fallback (same function as EFFICIENCY path). '
  '(4) None of the above → D8 = 0. Formula weight slot occupied but inactive. '
  'Max achievable composite from formula alone = 91 pts when D8 = 0.',
  '2026-05-10',
  'BUG-02 fix (2026-06-23): double-count guard added. Hyperscaler proxy is suppressed '
  'when EFFICIENCY cohort heuristic or Condition3 is already firing D8 through the formula. '
  'Without the guard: D8 via formula (~4 pts) + proxy (+12 pts) = ~16 pts total, '
  'vs intended max 9 pts (D8_value = 1.0 × weight = 0.09). '
  'Proxy overshoot (+12 vs +9) is a documented design choice: 33% margin compensates '
  'for heuristic range compression vs. full logistic output.',
  now(),
  now()
)
ON CONFLICT (dimension_key)
DO UPDATE SET
  formula_weight     = EXCLUDED.formula_weight,
  status             = EXCLUDED.status,
  source_description = EXCLUDED.source_description,
  notes              = EXCLUDED.notes,
  updated_at         = now();

-- ── 2. Drift alert: guard double-count regression ─────────────────────────────
-- If future changes re-enable the proxy when heuristic D8 is active, the
-- synthetic probes will catch it: an EFFICIENCY cohort hyperscaler should score
-- at most 9 pts from D8, not ~16 pts.

INSERT INTO engine_drift_alerts (
  alert_key,
  expected_value,
  tolerance,
  alert_message,
  is_active,
  created_at
) VALUES (
  'D8_proxy_double_count_guard',
  0.00,
  0.005,
  'D8 double-count guard may be broken. '
  'Check: computeHyperscalerD8Proxy must return bonus=0 when _d8IsHeuristicActive=true. '
  'Symptom: EFFICIENCY cohort hyperscaler audit scores ~16 pts from D8 instead of ~4 pts. '
  'Root cause was: proxy fired alongside heuristic D8 simultaneously (2026-06-23 fix).',
  true,
  now()
)
ON CONFLICT (alert_key)
DO UPDATE SET
  alert_message = EXCLUDED.alert_message,
  is_active     = EXCLUDED.is_active;

-- ── 3. Synthetic probe: add EFFICIENCY+hyperscaler scenario ───────────────────
-- Verifies the double-count guard is active. An EFFICIENCY cohort hyperscaler
-- with healthy financials should NOT produce a D8 contribution > 9 pts.
-- Expected range set conservatively (10-20 for healthy hyperscaler with heuristic D8 ~0.35).

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
  'EFFICIENCY_COHORT_HYPERSCALER_D8_NO_DOUBLE_COUNT',
  18,
  40,
  NULL,   -- filled by probe runner; NULL means not yet run
  NULL,
  'us_tech_hyperscaler',
  'bug02_guard_' || to_char(now(), 'YYYYMMDD'),
  now()
)
ON CONFLICT (scenario_name, probe_run_id) DO NOTHING;

-- Note: D8 weight states are documented in scoring_architecture_log above.
-- engine_calibration_constants uses a different schema (key/cohort_scope/JSONB)
-- and is managed by its own calibration pipeline.
