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



-- Note: D8 weight states are documented in scoring_architecture_log above.
-- engine_calibration_constants uses a different schema (key/cohort_scope/JSONB)
-- and is managed by its own calibration pipeline.
