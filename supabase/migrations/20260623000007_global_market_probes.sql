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
--   event_kind, scenario_name, expected_score, actual_score, drift_magnitude.
--   The EF inserts run_id, drift_direction, directional_mean_pts, probe_count,
--   consistent_direction_count, calibration_age_days, recalibration_recommended,
--   severity. These are completely different column sets — every insert fails.
--   Fix: create calibration_drift_runs with the schema the EF actually uses.
--   The old calibration_drift_events table is left in place (it may hold
--   scoring_architecture_log references from the drift monitor).
--
-- Bug 3 — synthetic_probe_scenarios wrong names:
--   Migration 20260520000001 seeded five scenario names that never matched the
--   EF: STABLE_POSITION, COMPANY_DISTRESS_ONLY, ROLE_AUTOMATION_HIGH,
--   RECENT_LAYOFF_SURVIVOR, PERSONAL_PROTECTION.
--   The EF scenario IDs are: FULL_CRISIS, ALL_SAFE, NEUTRAL_BASELINE,
--   AI_DISPLACEMENT, VETERAN_PROTECTED, LAYOFF_CONTENT, FUNDING_CRISIS.
--   Fix: DELETE the five wrong rows and INSERT the seven correct ones.
--
-- Bug 4 — synthetic_probe_score_drift_30d view reads wrong table:
--   The view joined synthetic_probe_results × synthetic_probe_scenarios.
--   synthetic_probe_results does not exist — the EF writes to synthetic_probe_runs.
--   Fix: DROP and recreate the view reading from synthetic_probe_runs.
--
-- GLOBAL PROBES ADDED (4)
-- ───────────────────────
-- INDIA_IT_BENCH_RISK:      IN QA engineer, IT Services industry
-- DE_AUTOMOTIVE_AUTOMATION: DE QA engineer, Automotive industry
-- SG_GCC_PARENT_CONTAGION:  SG software engineer, Financial Services
-- MENA_UAE_FINANCIAL_DISTRESS: AE financial analyst, Financial Services
--
-- Expected score arithmetic (EF formula at 2026-06-23):
--   INDIA_IT:  d1=0.875×0.35+…  raw≈0.6214  → 62  tolerance [55,69]
--   DE_AUTO:   d1=0.844×0.35+…  raw≈0.5145  → 51  tolerance [44,58]
--   SG_GCC:    d1=0.916×0.48+…  raw≈0.6045  → 60  tolerance [53,67]
--   MENA_UAE:  d1=0.899×0.72+…  raw≈0.6444  → 64  tolerance [57,71]

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

-- RLS: readable by authenticated users for monitoring dashboards; writable only
-- by service role (probe EF runs with service role key).
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
-- The old calibration_drift_events table is preserved as-is (different schema,
-- used by the scoring_architecture_log foreign-key convention in v40 migrations).

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

-- ── 4. Fix synthetic_probe_scenarios — remove 5 wrong rows, insert 11 correct ─
-- The EF hardcodes these IDs; any row not matching is dead data.

DELETE FROM synthetic_probe_scenarios
WHERE id IN (
  'STABLE_POSITION',
  'COMPANY_DISTRESS_ONLY',
  'ROLE_AUTOMATION_HIGH',
  'RECENT_LAYOFF_SURVIVOR',
  'PERSONAL_PROTECTION'
);

-- Insert the 7 original EF scenario definitions and 4 new global probes.
-- ON CONFLICT keeps existing rows current if this migration is replayed.
INSERT INTO synthetic_probe_scenarios (id, description, formula_path, expected_score_min, expected_score_max, midpoint, market_segment)
VALUES
  ('FULL_CRISIS',               'High-risk role with extreme company distress',                                              'D1_max + D2_max + L1_max + L2_max',             77, 87, 82, 'global'),
  ('ALL_SAFE',                  'Protected role in a stable company',                                                        'D1_min + D4_min + L1_min + L2_min',             12, 22, 17, 'global'),
  ('NEUTRAL_BASELINE',          'All signals at 0.5 neutral — tests formula constant term',                                  'formula_constants',                             45, 55, 50, 'global'),
  ('AI_DISPLACEMENT',           'Data entry role with maximal AI signals — D1+D2+D3 path',                                  'D1_high + D2_max + D3_max',                     63, 73, 68, 'global'),
  ('VETERAN_PROTECTED',         'Cybersecurity, 20y tenure, moderate company risk — D4 protection',                         'D4_min + D1_min + L1_moderate',                 29, 39, 34, 'global'),
  ('LAYOFF_CONTENT',            'Content writer: recent layoffs + high AI adoption — D1+D2+L2',                             'D1_high + D2_high + L1_moderate + L2_high',     68, 78, 73, 'global'),
  ('FUNDING_CRISIS',            'Financial analyst at startup with funding crisis — L1 fundingHealth path',                  'L1_fundingHealth_max + D1_moderate',            56, 66, 61, 'global'),
  -- Global market probes
  ('INDIA_IT_BENCH_RISK',       'India IT Services QA engineer on bench — IN client-side D1 multiplier (0.875)',            'D1_IN_QA_IT_services + D2_high + D3_moderate',  55, 69, 62, 'APAC'),
  ('DE_AUTOMOTIVE_AUTOMATION',  'Germany automotive QA — Betriebsrat D1 gate (0.844), lowest EU multiplier',                'D1_DE_QA_betriebsrat + D2_high + D3_low',       44, 58, 51, 'EU'),
  ('SG_GCC_PARENT_CONTAGION',   'Singapore SW engineer at GCC subsidiary — AISG multiplier (0.916) + L1 contagion',         'D1_SG_SW_aisg + L1_high_contagion + D4_moderate', 53, 67, 60, 'APAC'),
  ('MENA_UAE_FINANCIAL_DISTRESS','UAE financial analyst at distressed company — AE D1 default (0.899) + L1 crisis',         'D1_AE_default + L1_high_revenue_stock_distress', 57, 71, 64, 'MENA')
ON CONFLICT (id) DO UPDATE SET
  description         = EXCLUDED.description,
  formula_path        = EXCLUDED.formula_path,
  expected_score_min  = EXCLUDED.expected_score_min,
  expected_score_max  = EXCLUDED.expected_score_max,
  midpoint            = EXCLUDED.midpoint,
  market_segment      = EXCLUDED.market_segment;

-- ── 5. Fix synthetic_probe_score_drift_30d — join to correct table ────────────
-- The old view joined synthetic_probe_results × synthetic_probe_scenarios.
-- synthetic_probe_results does not exist; the EF writes to synthetic_probe_runs.
-- Recreating the view with the correct source table.

DROP VIEW IF EXISTS synthetic_probe_score_drift_30d;

CREATE VIEW synthetic_probe_score_drift_30d AS
SELECT
  r.scenario_id,
  s.description,
  s.expected_score_min,
  s.expected_score_max,
  s.midpoint            AS expected_midpoint,
  s.market_segment,
  COUNT(r.id)           AS run_count,
  ROUND(AVG(r.signed_deviation)::NUMERIC, 2)   AS mean_signed_deviation,
  ROUND(AVG(r.deviation)::NUMERIC, 2)           AS mean_abs_deviation,
  ROUND(STDDEV(r.signed_deviation)::NUMERIC, 2) AS stddev_deviation,
  SUM(CASE WHEN r.passed THEN 1 ELSE 0 END)    AS pass_count,
  SUM(CASE WHEN NOT r.passed AND r.error_message IS NULL THEN 1 ELSE 0 END) AS fail_count,
  SUM(CASE WHEN r.error_message IS NOT NULL THEN 1 ELSE 0 END)              AS error_count,
  MAX(r.started_at)                             AS last_run_at
FROM synthetic_probe_runs  r
JOIN synthetic_probe_scenarios s ON s.id = r.scenario_id
WHERE r.started_at >= NOW() - INTERVAL '30 days'
GROUP BY r.scenario_id, s.description, s.expected_score_min, s.expected_score_max, s.midpoint, s.market_segment
ORDER BY ABS(AVG(r.signed_deviation)) DESC;

-- Grant SELECT on the view to authenticated users
GRANT SELECT ON synthetic_probe_score_drift_30d TO authenticated;

-- ── 6. Add market_segment column to synthetic_probe_scenarios if absent ───────
-- The INSERT above uses market_segment. Add it if the original migration omitted it.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'synthetic_probe_scenarios'
      AND column_name = 'market_segment'
  ) THEN
    ALTER TABLE synthetic_probe_scenarios ADD COLUMN market_segment TEXT NOT NULL DEFAULT 'global';
  END IF;
END $$;

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
  'Also created synthetic_probe_runs, synthetic_probe_alerts, calibration_drift_runs '
  'tables (previously missing — EF inserts silently failed). Fixed 5 wrong scenario '
  'names. Rebuilt synthetic_probe_score_drift_30d view to read from '
  'synthetic_probe_runs (was joining nonexistent synthetic_probe_results).',
  '2026-06-23',
  'Before: 7 probes, 0 global-market coverage; probe tables missing; view returned 0 rows. '
  'After: 11 probes (7 original + 4 global), all 3 tables exist, view reads correct source. '
  'Expected score ranges for global probes: IN=62±7, DE=51±7, SG=60±7, AE=64±7.',
  NOW(),
  NOW()
)
ON CONFLICT (dimension_key) DO UPDATE SET
  source_description = EXCLUDED.source_description,
  notes              = EXCLUDED.notes,
  updated_at         = NOW();
