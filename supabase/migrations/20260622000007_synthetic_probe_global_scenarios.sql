-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260622000007_synthetic_probe_global_scenarios.sql
-- Purpose:   Seed 7 new global score-probe scenarios into synthetic_probe_scenarios.
--
-- These cover failure modes specific to each major market not tested by the
-- original 7 universal scenarios (migration 20260622000005):
--
--   Scenario                       Expect  Tolerance   Key failure mode
--   ─────────────────────────────  ──────  ──────────  ───────────────────────────────────
--   INDIA_BPO_BENCH_RISK             71    [66, 76]    Bench signal + IT services + Q1 seasonal
--   EU_REGULATORY_RESTRUCTURING      58    [53, 63]    Legal/data role + EU AI Act compliance
--   US_HYPERSCALER_EFFICIENCY        64    [59, 69]    D8 pattern + profitable efficiency cut
--   SINGAPORE_GCC_PARENT_CUT         67    [62, 72]    GCC + parent company contagion 6mo
--   LATAM_FUNDING_CRISIS             69    [64, 74]    Private company + funding_dryup
--   CANADA_VISA_AMPLIFIED            78    [73, 83]    LMIA + live layoff + visa amplifier
--   GERMANY_MANUFACTURING_AUTOMATION 62    [57, 67]    Industry 4.0 + works council
--
-- The EF scoreProbeScenarios.ts was updated to include these fixtures in the
-- same commit. The drift view (synthetic_probe_score_drift_30d) auto-includes
-- these rows via the JOIN — no view change needed.
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO public.synthetic_probe_scenarios
  (scenario_name, description, expected_score, tolerance_low, tolerance_high, bias_threshold_pts)
VALUES

  ('INDIA_BPO_BENCH_RISK',
   'India IT services: BPO analyst on bench 60+ days, Q1 seasonal cut cycle, extreme automation exposure.',
   71, 66, 76, 3),

  ('EU_REGULATORY_RESTRUCTURING',
   'EU fintech: data governance role, AI Act compliance restructuring, regulatory cost pressure eroding margins.',
   58, 53, 63, 3),

  ('US_HYPERSCALER_EFFICIENCY',
   'US hyperscaler: AI efficiency restructuring (D8 pattern), profitable company in second efficiency wave.',
   64, 59, 69, 3),

  ('SINGAPORE_GCC_PARENT_CUT',
   'Singapore GCC: parent company cut 6mo ago, second-wave GCC restructuring risk, high parent contagion.',
   67, 62, 72, 3),

  ('LATAM_FUNDING_CRISIS',
   'LatAm startup: Series C failed, funding_dryup, <9mo runway, first survival cut done, second imminent.',
   69, 64, 74, 3),

  ('CANADA_VISA_AMPLIFIED',
   'Canada LMIA: layoff just fired (live), LMIA workers first-cut cohort, visa amplifier, 90-day exit.',
   78, 73, 83, 3),

  ('GERMANY_MANUFACTURING_AUTOMATION',
   'Germany automotive: Industry 4.0 robot automation, works council slows pace but cannot prevent restructuring.',
   62, 57, 67, 3)

ON CONFLICT (scenario_name) DO UPDATE
  SET description        = EXCLUDED.description,
      expected_score     = EXCLUDED.expected_score,
      tolerance_low      = EXCLUDED.tolerance_low,
      tolerance_high     = EXCLUDED.tolerance_high,
      bias_threshold_pts = EXCLUDED.bias_threshold_pts;

COMMENT ON TABLE public.synthetic_probe_scenarios IS
  'Reference rows for 14 synthetic score probe scenarios (7 universal + 7 global market). '
  'Expected ranges are derived from verified fixture inputs in scoreProbeScenarios.ts. '
  'Update both here AND in the EF constants when expected scores change.';
