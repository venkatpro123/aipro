-- Migration: 20260623000007_global_market_probes.sql
--
-- Fixes four compounding bugs in the synthetic probe system and adds four
-- global-market probe scenarios.
--
-- BUGS FIXED
-- ──────────
-- Bug 1 — synthetic_probe_runs + synthetic_probe_alerts missing:
--   The synthetic-probe EF writes to these two tables but neither existed in
--   any migration. All insert calls silently failed, making every probe run
--   appear to succeed while writing nothing. Created here.
--
-- Bug 2 — calibration_drift_events schema mismatch:
--   Migration 20260622000005 created calibration_drift_events with columns
--   event_kind, scenario_name, expected_score, actual_score, etc.
--   The EF inserts run_id, drift_direction, directional_mean_pts, probe_count,
--   consistent_direction_count, calibration_age_days, recalibration_recommended,
--   severity — a completely different schema. Every insert fails silently.
--   Fix: create calibration_drift_runs with the schema the EF actually uses.
--   The old calibration_drift_events table is preserved (different schema,
--   used for range_violation / directional_bias events from the old cron path).
--
-- Bug 3 — synthetic_probe_scenarios stale/mismatched names:
--   Migrations 20260622000005 and 20260622000007 seeded scenario names that do
--   not match the EF scenario IDs. Stale names from 20260622000005:
--     STABLE_POSITION, COMPANY_DISTRESS_ONLY, ROLE_AUTOMATION_HIGH,
--     RECENT_LAYOFF_SURVIVOR, PERSONAL_PROTECTION
--   Stale names from 20260622000007 (global scenarios with different IDs):
--     INDIA_BPO_BENCH_RISK, EU_REGULATORY_RESTRUCTURING, US_HYPERSCALER_EFFICIENCY,
--     SINGAPORE_GCC_PARENT_CUT, LATAM_FUNDING_CRISIS, CANADA_VISA_AMPLIFIED,
--     GERMANY_MANUFACTURING_AUTOMATION
--   The EF scenario IDs are:
--     FULL_CRISIS, ALL_SAFE, NEUTRAL_BASELINE, AI_DISPLACEMENT, VETERAN_PROTECTED,
--     LAYOFF_CONTENT, FUNDING_CRISIS (original 7)
--     + INDIA_IT_BENCH_RISK, DE_AUTOMOTIVE_AUTOMATION, SG_GCC_PARENT_CONTAGION,
--       MENA_UAE_FINANCIAL_DISTRESS (4 new global)
--   Fix: DELETE the 12 wrong rows, UPSERT all 11 correct ones.
--
-- Bug 4 — synthetic_probe_score_drift_30d view disconnected from current EF:
--   The view (created in 20260622000005) reads from synthetic_probe_results.
--   The current EF writes to synthetic_probe_runs. These are different tables.
--   Fix: keep existing view as-is (serves historical operational probes); add
--   a second view synthetic_probe_runs_drift_30d reading from synthetic_probe_runs.
--
-- GLOBAL PROBES ADDED (4)
-- ───────────────────────
-- INDIA_IT_BENCH_RISK:         IN QA engineer, IT Services — tests IN client-side
--                              D1 multiplier (0.875). Expected 62 ± 7 → [55, 69]
-- DE_AUTOMOTIVE_AUTOMATION:    DE QA engineer, Automotive — tests Betriebsrat gate
--                              (0.844, lowest EU multiplier). Expected 51 ± 7 → [44, 58]
-- SG_GCC_PARENT_CONTAGION:     SG SW engineer — tests AISG multiplier (0.916) +
--                              L1 GCC parent contagion. Expected 60 ± 7 → [53, 67]
-- MENA_UAE_FINANCIAL_DISTRESS: AE financial analyst — tests AE default (0.899) +
--                              L1 financial crisis. Expected 64 ± 7 → [57, 71]

-- ── 1. Create synthetic_probe_runs ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS synthetic_probe_runs (
  id                    BIGSERIAL PRIMARY KEY,
  run_id                UUID        NOT NULL,
  scenario_id           TEXT        NOT NULL,
  expected_score_min    INT         NOT NULL,
  expected_score_max    INT         NOT NULL,
  expected_midpoint     INT         NOT NULL,
  actual_score          INT,
  deviation             NUMERIC(6,2),
  signed_deviation      NUMERIC(6,2),
  passed                BOOLEAN     NOT NULL DEFAULT FALSE,
  alert_level           TEXT        NOT NULL DEFAULT 'none',   -- none / warning / critical
  drift_check_triggered BOOLEAN     NOT NULL DEFAULT FALSE,
  error_message         TEXT,
  started_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS synthetic_probe_runs_run_id_idx
  ON synthetic_probe_runs (run_id);
CREATE INDEX IF NOT EXISTS synthetic_probe_runs_scenario_id_idx
  ON synthetic_probe_runs (scenario_id, started_at DESC);

ALTER TABLE synthetic_probe_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_insert_probe_runs"
  ON synthetic_probe_runs FOR INSERT
  TO service_role
  WITH CHECK (true);
CREATE POLICY "authenticated_read_probe_runs"
  ON synthetic_probe_runs FOR SELECT
  TO authenticated
  USING (true);

-- ── 2. Create synthetic_probe_alerts ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS synthetic_probe_alerts (
  id             BIGSERIAL PRIMARY KEY,
  run_id         UUID        NOT NULL,
  scenario_id    TEXT        NOT NULL,
  expected_range TEXT        NOT NULL,   -- e.g. '55–69'
  actual_score   INT,
  deviation      NUMERIC(6,2),
  alert_type     TEXT        NOT NULL,   -- score_deviation / scoring_error
  severity       TEXT        NOT NULL,   -- warning / critical
  fired_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS synthetic_probe_alerts_run_id_idx
  ON synthetic_probe_alerts (run_id);
CREATE INDEX IF NOT EXISTS synthetic_probe_alerts_fired_at_idx
  ON synthetic_probe_alerts (fired_at DESC);

ALTER TABLE synthetic_probe_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_insert_probe_alerts"
  ON synthetic_probe_alerts FOR INSERT
  TO service_role
  WITH CHECK (true);
CREATE POLICY "authenticated_read_probe_alerts"
  ON synthetic_probe_alerts FOR SELECT
  TO authenticated
  USING (true);

-- ── 3. Create calibration_drift_runs (schema matches EF insert) ──────────────

CREATE TABLE IF NOT EXISTS calibration_drift_runs (
  id                          BIGSERIAL PRIMARY KEY,
  run_id                      UUID        NOT NULL,
  drift_direction             TEXT        NOT NULL,   -- upward / downward / none
  directional_mean_pts        NUMERIC(6,2) NOT NULL,
  probe_count                 INT         NOT NULL,
  consistent_direction_count  INT         NOT NULL,
  calibration_age_days        INT,
  recalibration_recommended   BOOLEAN     NOT NULL DEFAULT FALSE,
  severity                    TEXT        NOT NULL,   -- none / mild / significant
  fired_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS calibration_drift_runs_fired_at_idx
  ON calibration_drift_runs (fired_at DESC);

ALTER TABLE calibration_drift_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_insert_drift_runs"
  ON calibration_drift_runs FOR INSERT
  TO service_role
  WITH CHECK (true);
CREATE POLICY "authenticated_read_drift_runs"
  ON calibration_drift_runs FOR SELECT
  TO authenticated
  USING (true);

-- ── 4. Add market_segment column to synthetic_probe_scenarios ─────────────────
-- Must happen BEFORE the INSERT below uses it.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'synthetic_probe_scenarios'
      AND column_name = 'market_segment'
  ) THEN
    ALTER TABLE synthetic_probe_scenarios
      ADD COLUMN market_segment TEXT NOT NULL DEFAULT 'global';
  END IF;
END $$;

-- ── 5. Fix synthetic_probe_scenarios — remove stale rows, upsert 11 correct ───
-- The EF hardcodes scenario IDs; any row not matching is dead data that causes
-- the drift view to miss data or join incorrectly.

DELETE FROM synthetic_probe_scenarios
WHERE scenario_name IN (
  -- stale from migration 20260622000005 (don't match EF IDs)
  'STABLE_POSITION',
  'COMPANY_DISTRESS_ONLY',
  'ROLE_AUTOMATION_HIGH',
  'RECENT_LAYOFF_SURVIVOR',
  'PERSONAL_PROTECTION',
  -- stale from migration 20260622000007 (different IDs from what EF now uses)
  'INDIA_BPO_BENCH_RISK',
  'EU_REGULATORY_RESTRUCTURING',
  'US_HYPERSCALER_EFFICIENCY',
  'SINGAPORE_GCC_PARENT_CUT',
  'LATAM_FUNDING_CRISIS',
  'CANADA_VISA_AMPLIFIED',
  'GERMANY_MANUFACTURING_AUTOMATION'
);

-- Upsert all 11 current EF scenario definitions.
-- expected_score = midpoint of expected range
-- tolerance_low/high = [min, max] range
INSERT INTO synthetic_probe_scenarios
  (scenario_name, description, expected_score, tolerance_low, tolerance_high, bias_threshold_pts, market_segment)
VALUES
  ('FULL_CRISIS',
   'High-risk role with extreme company distress — tests upper bound and formula maximum.',
   82, 77, 87, 5, 'global'),

  ('ALL_SAFE',
   'Protected role (cybersecurity, 20y tenure) in a stable company — tests lower bound and formula minimum.',
   17, 12, 22, 5, 'global'),

  ('NEUTRAL_BASELINE',
   'All signals at 0.50 neutral, 3-year tenure — tests formula constant term and weight normalization.',
   50, 45, 55, 5, 'global'),

  ('AI_DISPLACEMENT',
   'Data entry clerk with maximal AI adoption signals — specifically tests D1+D2+D3 weight path.',
   68, 63, 73, 5, 'global'),

  ('VETERAN_PROTECTED',
   'Cybersecurity engineer, 20y tenure, moderate company risk — tests D4 tenure-protection weight.',
   34, 29, 39, 5, 'global'),

  ('LAYOFF_CONTENT',
   'Content writer with recent layoffs and high AI adoption — tests D1+D2 combined with L2 high.',
   73, 68, 78, 5, 'global'),

  ('FUNDING_CRISIS',
   'Financial analyst at a startup with funding crisis — tests L1 fundingHealth path.',
   61, 56, 66, 5, 'global'),

  -- Global market probes — test D1 country multiplier calibration paths
  ('INDIA_IT_BENCH_RISK',
   'India IT Services QA engineer on bench — tests IN client-side D1 multiplier (0.875). Score ~62.',
   62, 55, 69, 7, 'APAC'),

  ('DE_AUTOMOTIVE_AUTOMATION',
   'Germany automotive QA — Betriebsrat (BetrVG §87(1)6) D1 gate (0.844), lowest EU multiplier. Score ~51.',
   51, 44, 58, 7, 'EU'),

  ('SG_GCC_PARENT_CONTAGION',
   'Singapore SW engineer at GCC subsidiary — AISG multiplier (0.916) + L1 parent contagion. Score ~60.',
   60, 53, 67, 7, 'APAC'),

  ('MENA_UAE_FINANCIAL_DISTRESS',
   'UAE financial analyst at distressed company — AE D1 default (0.899) + L1 financial crisis. Score ~64.',
   64, 57, 71, 7, 'MENA')

ON CONFLICT (scenario_name) DO UPDATE SET
  description        = EXCLUDED.description,
  expected_score     = EXCLUDED.expected_score,
  tolerance_low      = EXCLUDED.tolerance_low,
  tolerance_high     = EXCLUDED.tolerance_high,
  bias_threshold_pts = EXCLUDED.bias_threshold_pts,
  market_segment     = EXCLUDED.market_segment;

-- ── 6. Add drift view for synthetic_probe_runs (EF's current write target) ────
-- The existing synthetic_probe_score_drift_30d reads from synthetic_probe_results
-- (the operational probe table). We add a second view for synthetic_probe_runs
-- so calibration drift from the score probes is queryable separately.

CREATE OR REPLACE VIEW synthetic_probe_runs_drift_30d AS
SELECT
  r.scenario_id,
  s.description,
  s.expected_score                                           AS expected_midpoint,
  s.tolerance_low                                            AS expected_score_min,
  s.tolerance_high                                           AS expected_score_max,
  s.bias_threshold_pts,
  s.market_segment,
  COUNT(r.id)                                                AS run_count,
  ROUND(AVG(r.signed_deviation)::NUMERIC, 2)                AS mean_signed_deviation,
  ROUND(AVG(r.deviation)::NUMERIC, 2)                       AS mean_abs_deviation,
  ROUND(STDDEV(r.signed_deviation)::NUMERIC, 2)             AS stddev_deviation,
  SUM(CASE WHEN r.passed           THEN 1 ELSE 0 END)       AS pass_count,
  SUM(CASE WHEN NOT r.passed
            AND r.error_message IS NULL THEN 1 ELSE 0 END)  AS fail_count,
  SUM(CASE WHEN r.error_message IS NOT NULL
                                    THEN 1 ELSE 0 END)       AS error_count,
  -- Directional bias: 30-day mean drifts beyond bias_threshold_pts
  ABS(AVG(r.signed_deviation)) > s.bias_threshold_pts       AS has_directional_bias,
  MAX(r.started_at)                                         AS last_run_at
FROM synthetic_probe_runs r
JOIN synthetic_probe_scenarios s ON s.scenario_name = r.scenario_id
WHERE r.started_at >= NOW() - INTERVAL '30 days'
GROUP BY
  r.scenario_id,
  s.description,
  s.expected_score,
  s.tolerance_low,
  s.tolerance_high,
  s.bias_threshold_pts,
  s.market_segment
ORDER BY ABS(AVG(r.signed_deviation)) DESC;

GRANT SELECT ON synthetic_probe_runs_drift_30d TO authenticated;

-- ── 7. Log this migration in scoring_architecture_log ────────────────────────

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
  'global_market_probes_v40',
  0.18,
  'regression_derived',
  'D1 country multiplier probe coverage extended to EU (DE Betriebsrat QA 0.844), '
  'APAC (IN IT Services QA 0.875, SG AISG SW 0.916), MENA (AE default 0.899). '
  'Four new synthetic_probe_scenarios rows: INDIA_IT_BENCH_RISK, '
  'DE_AUTOMOTIVE_AUTOMATION, SG_GCC_PARENT_CONTAGION, MENA_UAE_FINANCIAL_DISTRESS. '
  'Created synthetic_probe_runs + synthetic_probe_alerts (previously missing — '
  'EF inserts silently failed). Created calibration_drift_runs (schema matches EF; '
  'calibration_drift_events had incompatible columns). Deleted 12 stale '
  'synthetic_probe_scenarios rows. Added synthetic_probe_runs_drift_30d view. '
  'calculate-hybrid-risk EF: region/industry added to UserFactors interface + '
  'sanitizeUserFactors. synthetic-probe EF: Promise.all → Promise.allSettled.',
  '2026-06-23',
  'Before: 7 probes, 0 global-market coverage; probe tables missing; view disconnected. '
  'After: 11 probes (7 original + 4 global), all 3 tables exist, '
  'synthetic_probe_runs_drift_30d reads from correct table. '
  'Expected ranges: IN=62±7, DE=51±7, SG=60±7, AE=64±7.',
  NOW(),
  NOW()
)
ON CONFLICT (dimension_key) DO UPDATE SET
  source_description = EXCLUDED.source_description,
  notes              = EXCLUDED.notes,
  updated_at         = NOW();
