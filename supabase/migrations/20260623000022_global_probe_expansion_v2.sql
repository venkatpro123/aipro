-- 20260623000022_global_probe_expansion_v2.sql
--
-- Global synthetic probe expansion v2: adds 3 new probes and revises 3 existing
-- ones to align with the signal calibration in scoreProbeScenarios.ts v2.
--
-- Changes vs prior state:
--   EU_REGULATORY_RESTRUCTURING  : expected 58 [53,63] → 48 [42,55]  (BaFin focus, lower distress)
--   SINGAPORE_GCC_PARENT_CUT     : deprecated; replaced by SINGAPORE_GCC_PARENT [60,70]
--   LATAM_FUNDING_CRISIS         : expected 69 [64,74] → 63 [58,68]  (revised signal values)
--   GERMANY_AUTOMOTIVE_AUTOMATION: NEW — SDV engineer, Betriebsrat, D1 foreign [55,65]
--   MENA_VISA_URGENCY            : NEW — UAE visa urgency, <3mo runway, kill-switch A [65,79]
--   UK_FINTECH_TIGHTENING        : NEW — FCA Consumer Duty reform, moderate [45,58]
--
-- INDIA_IT_BENCH_RISK [48,58] was already seeded correctly; no changes needed.
--
-- Uses ON CONFLICT DO UPDATE so re-running is idempotent.
-- Does NOT use input_snapshot or formula_trace columns (not in base table schema).

-- ── Retire deprecated scenario ───────────────────────────────────────────────
-- SINGAPORE_GCC_PARENT_CUT is superseded by SINGAPORE_GCC_PARENT (5-month lag,
-- strategic_partner archetype, revised tolerance). Deleting it prevents stale
-- probe runs that reference the old scenario name.
DELETE FROM synthetic_probe_scenarios
WHERE scenario_name = 'SINGAPORE_GCC_PARENT_CUT';

-- ── Upsert revised scenarios ─────────────────────────────────────────────────

INSERT INTO synthetic_probe_scenarios
  (scenario_name, description, expected_score, tolerance_low, tolerance_high, bias_threshold_pts, market_segment)
VALUES
  (
    'EU_REGULATORY_RESTRUCTURING',
    'EU fintech: compliance analyst under BaFin/MiFID-II reform, RegTech tooling pressure, profitable but slow-burn restructuring.',
    48, 42, 55, 3, 'eu_regulatory'
  ),
  (
    'LATAM_FUNDING_CRISIS',
    'LatAm startup: Series C failed, funding_dryup, first survival cut done, second structurally expected.',
    63, 58, 68, 3, 'latam'
  )
ON CONFLICT (scenario_name) DO UPDATE SET
  description       = EXCLUDED.description,
  expected_score    = EXCLUDED.expected_score,
  tolerance_low     = EXCLUDED.tolerance_low,
  tolerance_high    = EXCLUDED.tolerance_high,
  bias_threshold_pts= EXCLUDED.bias_threshold_pts,
  market_segment    = EXCLUDED.market_segment;

-- ── Insert new scenario: SINGAPORE_GCC_PARENT ────────────────────────────────
INSERT INTO synthetic_probe_scenarios
  (scenario_name, description, expected_score, tolerance_low, tolerance_high, bias_threshold_pts, market_segment)
VALUES
  (
    'SINGAPORE_GCC_PARENT',
    'Singapore GCC: US parent (strategic_partner archetype) cut 5mo ago, second-wave GCC restructuring risk, parent contagion propagation.',
    65, 60, 70, 3, 'apac_gcc'
  )
ON CONFLICT (scenario_name) DO UPDATE SET
  description       = EXCLUDED.description,
  expected_score    = EXCLUDED.expected_score,
  tolerance_low     = EXCLUDED.tolerance_low,
  tolerance_high    = EXCLUDED.tolerance_high,
  bias_threshold_pts= EXCLUDED.bias_threshold_pts,
  market_segment    = EXCLUDED.market_segment;

-- ── Insert new scenario: GERMANY_AUTOMOTIVE_AUTOMATION ───────────────────────
INSERT INTO synthetic_probe_scenarios
  (scenario_name, description, expected_score, tolerance_low, tolerance_high, bias_threshold_pts, market_segment)
VALUES
  (
    'GERMANY_AUTOMOTIVE_AUTOMATION',
    'Germany automotive OEM: SDV software engineer, works council (Betriebsrat), D1 foreign national, EV platform restructuring.',
    60, 55, 65, 3, 'germany_automotive'
  )
ON CONFLICT (scenario_name) DO UPDATE SET
  description       = EXCLUDED.description,
  expected_score    = EXCLUDED.expected_score,
  tolerance_low     = EXCLUDED.tolerance_low,
  tolerance_high    = EXCLUDED.tolerance_high,
  bias_threshold_pts= EXCLUDED.bias_threshold_pts,
  market_segment    = EXCLUDED.market_segment;

-- ── Insert new scenario: MENA_VISA_URGENCY ───────────────────────────────────
INSERT INTO synthetic_probe_scenarios
  (scenario_name, description, expected_score, tolerance_low, tolerance_high, bias_threshold_pts, market_segment)
VALUES
  (
    'MENA_VISA_URGENCY',
    'UAE fintech startup: funding crisis <3mo runway, first survival cut live, UAE employment visa with short grace period, visa amplifier in effect.',
    72, 65, 79, 4, 'mena_visa'
  )
ON CONFLICT (scenario_name) DO UPDATE SET
  description       = EXCLUDED.description,
  expected_score    = EXCLUDED.expected_score,
  tolerance_low     = EXCLUDED.tolerance_low,
  tolerance_high    = EXCLUDED.tolerance_high,
  bias_threshold_pts= EXCLUDED.bias_threshold_pts,
  market_segment    = EXCLUDED.market_segment;

-- ── Insert new scenario: UK_FINTECH_TIGHTENING ───────────────────────────────
INSERT INTO synthetic_probe_scenarios
  (scenario_name, description, expected_score, tolerance_low, tolerance_high, bias_threshold_pts, market_segment)
VALUES
  (
    'UK_FINTECH_TIGHTENING',
    'UK fintech: FCA Consumer Duty + post-Brexit PSD2 enforcement, RegTech tooling pressure, uk_private_ltd ceiling, moderate distress.',
    51, 45, 58, 3, 'uk_fintech'
  )
ON CONFLICT (scenario_name) DO UPDATE SET
  description       = EXCLUDED.description,
  expected_score    = EXCLUDED.expected_score,
  tolerance_low     = EXCLUDED.tolerance_low,
  tolerance_high    = EXCLUDED.tolerance_high,
  bias_threshold_pts= EXCLUDED.bias_threshold_pts,
  market_segment    = EXCLUDED.market_segment;

-- ── Audit log ────────────────────────────────────────────────────────────────
INSERT INTO scoring_architecture_log
  (dimension_key, change_type, previous_value, new_value, rationale, migration_version)
VALUES
  (
    'synthetic_probe_global_expansion_v2',
    'scenarios_updated',
    '{"count": 16, "deprecated": ["SINGAPORE_GCC_PARENT_CUT"]}',
    '{"count": 19, "added": ["GERMANY_AUTOMOTIVE_AUTOMATION", "MENA_VISA_URGENCY", "UK_FINTECH_TIGHTENING", "SINGAPORE_GCC_PARENT"], "revised": ["EU_REGULATORY_RESTRUCTURING", "LATAM_FUNDING_CRISIS"]}',
    'Global probe expansion v2: 3 new scenarios covering Germany automotive automation (SDV/Betriebsrat/D1), MENA visa urgency (<3mo runway/UAE visa), UK fintech FCA tightening; revised EU regulatory (BaFin focus 58→48), LatAm funding crisis (69→63); renamed SINGAPORE_GCC_PARENT_CUT→SINGAPORE_GCC_PARENT (5-month lag)',
    '20260623000022'
  );
