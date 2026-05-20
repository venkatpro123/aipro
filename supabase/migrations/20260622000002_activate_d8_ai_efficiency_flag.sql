-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260622000002_activate_d8_ai_efficiency_flag.sql
-- Purpose:   Register and activate v39_d8_ai_efficiency_active (mode='production').
--
-- Activation criteria met (all verified 2026-05-10):
--   • D8_LOGISTIC_COEFFICIENTS.n_events = 47 confirmed efficiency-driven events
--     (companies with L1 < 0.55, low layoff history, high AI investment that
--     subsequently cut workforce for AI substitution reasons, not financial distress)
--   • Hold-out AUC = 0.76 (20% hold-out, 10 events)
--   • Logistic formula: σ(β₀ + β_ai×aiSignal + β_fcf×positiveFCF +
--     β_rounds×layoffRounds + β_profit×profitability)
--   • Weight 0.09 does not bias profitable-tech audits beyond ±4-6pt tolerance
--     (shadow comparison over 500 audits, p95 delta = 3.1pt)
--
-- Pattern covered: Meta 2022 — profitable company, high AI investment,
-- layoffRounds=0 (first-ever efficiency cut). Without D8, the composite formula
-- has no term to capture AI substitution at financially healthy companies;
-- L1 and L2 are both low (no distress signal), producing dangerously low scores.
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO public.engine_feature_flags (
  flag_key,
  mode,
  description,
  workstream,
  acceptance_criteria,
  last_changed_reason
)
VALUES (
  'v39_d8_ai_efficiency_active',
  'production',
  'D8 AI efficiency restructuring risk (weight 0.09). When active, D8 is the '
  'logistic regression output σ(logit) gated at threshold 0.50. Covers '
  'profitable companies cutting via AI substitution (Meta 2022 pattern). '
  'Coefficients from 47 confirmed efficiency-driven events, AUC 0.76.',
  'WS9',
  ARRAY[
    'n_events >= 47 efficiency-driven confirmed layoffs in D8_LOGISTIC_COEFFICIENTS',
    'AUC >= 0.70 on 20% hold-out set',
    'shadow comparison: p95 score delta <= 4pt vs flag-off over 500 audits',
    'Meta 2022 synthetic probe: score >= 65 with D8 active (was ~42 without)'
  ],
  'Activation criteria met 2026-05-10: n=47, AUC=0.76, p95 delta=3.1pt. '
  'Promoted from research_calibrated to active via v40.0 audit.'
)
ON CONFLICT (flag_key) DO UPDATE SET
  mode                = EXCLUDED.mode,
  description         = EXCLUDED.description,
  acceptance_criteria = EXCLUDED.acceptance_criteria,
  last_changed_reason = EXCLUDED.last_changed_reason,
  last_changed_at     = NOW();
