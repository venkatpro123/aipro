-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260620000003_correct_layoffscore_band_constants.sql
-- Purpose:   WS9 fan-out correction — the keys seeded in 20260615000001 for
--            `layoffScoreEngine.recentLayoffRisk.*` and
--            `layoffScoreEngine.aiDisplacement.*` were drafted from the v35.1
--            audit findings BUT use a day-window naming scheme + values that
--            don't match the actual code paths (which use month-window bands
--            and different value sets).
--
--            Rather than mutate the existing rows (would break a strict
--            "never UPDATE seeded rows" hygiene), this migration:
--              1. SUPERSEDES the mismatched rows (status='superseded' + retired_at)
--              2. Inserts CORRECTLY-named rows with code-exact values
--
--            Result: 20260615000001 rows remain in history for audit; new
--            rows match what the refactored layoffScoreEngine.ts code reads.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── Supersede the mismatched seed rows ─────────────────────────────────────
UPDATE public.engine_calibration_constants
   SET status = 'superseded',
       retired_at = NOW()
 WHERE status = 'active'
   AND key IN (
     'layoffScoreEngine.recentLayoffRisk.30d',
     'layoffScoreEngine.recentLayoffRisk.90d',
     'layoffScoreEngine.recentLayoffRisk.180d',
     'layoffScoreEngine.recentLayoffRisk.365d',
     'layoffScoreEngine.recentLayoffRisk.720d',
     'layoffScoreEngine.aiDisplacement.high',
     'layoffScoreEngine.aiDisplacement.medium',
     'layoffScoreEngine.aiDisplacement.low'
   );

-- ── Insert correctly-named rows matching live code ─────────────────────────

-- Recent-layoff months-window bands. layoffScoreEngine.calculateRecentLayoffRisk
-- branches on monthsAgo via < threshold. Each row is the value returned WHEN
-- that band fires.
INSERT INTO public.engine_calibration_constants (key, value, provenance, rationale, created_by) VALUES
  ('layoffScoreEngine.recentLayoffRisk.lt3months',   '0.95'::jsonb, 'uncalibrated_placeholder',
   'UNCALIBRATED — layoffScoreEngine.ts:1296. Returns when monthsAgo < 3 (i.e., layoff in the last 3 months).', 'WS9-correction'),
  ('layoffScoreEngine.recentLayoffRisk.lt6months',   '0.80'::jsonb, 'uncalibrated_placeholder',
   'UNCALIBRATED — layoffScoreEngine.ts:1297. Returns when monthsAgo < 6.', 'WS9-correction'),
  ('layoffScoreEngine.recentLayoffRisk.lt12months',  '0.62'::jsonb, 'uncalibrated_placeholder',
   'UNCALIBRATED — layoffScoreEngine.ts:1298. Returns when monthsAgo < 12.', 'WS9-correction'),
  ('layoffScoreEngine.recentLayoffRisk.lt18months',  '0.42'::jsonb, 'uncalibrated_placeholder',
   'UNCALIBRATED — layoffScoreEngine.ts:1299. Returns when monthsAgo < 18.', 'WS9-correction'),
  ('layoffScoreEngine.recentLayoffRisk.lt24months',  '0.28'::jsonb, 'uncalibrated_placeholder',
   'UNCALIBRATED — layoffScoreEngine.ts:1300. Returns when monthsAgo < 24.', 'WS9-correction'),
  ('layoffScoreEngine.recentLayoffRisk.gte24months', '0.15'::jsonb, 'uncalibrated_placeholder',
   'UNCALIBRATED — layoffScoreEngine.ts:1301 else branch. Returns when monthsAgo >= 24.', 'WS9-correction'),
  ('layoffScoreEngine.recentLayoffRisk.noLayoffs',   '0.05'::jsonb, 'manual_seed',
   'Baseline when company has zero layoffs in dataset. layoffScoreEngine.ts:1289.', 'WS9-correction'),

  -- Layoff round count bands. layoffScoreEngine.calculateRoundFrequency.
  ('layoffScoreEngine.layoffRoundRisk.1round',       '0.42'::jsonb, 'uncalibrated_placeholder',
   'UNCALIBRATED — layoffScoreEngine.ts:1317. Base risk for 1 round.', 'WS9-correction'),
  ('layoffScoreEngine.layoffRoundRisk.2rounds',      '0.68'::jsonb, 'uncalibrated_placeholder',
   'UNCALIBRATED — layoffScoreEngine.ts:1318. Base risk for 2 rounds.', 'WS9-correction'),
  ('layoffScoreEngine.layoffRoundRisk.3rounds',      '0.85'::jsonb, 'uncalibrated_placeholder',
   'UNCALIBRATED — layoffScoreEngine.ts:1319. Base risk for 3 rounds.', 'WS9-correction'),
  ('layoffScoreEngine.layoffRoundRisk.4plus',        '0.95'::jsonb, 'uncalibrated_placeholder',
   'UNCALIBRATED — layoffScoreEngine.ts:1320. Base risk for 4+ rounds.', 'WS9-correction'),
  ('layoffScoreEngine.layoffRoundRisk.noRounds',     '0.05'::jsonb, 'manual_seed',
   'Baseline when rounds = 0. layoffScoreEngine.ts:1311.', 'WS9-correction'),

  -- AI investment signal strength. layoffScoreEngine.ts:1862 aiStrengthMap.
  -- Note: this is the AI-INVESTMENT signal map, NOT a separate "displacement"
  -- map. Naming intentionally avoids the 'aiDisplacement' label to prevent
  -- conflation with the superseded keys above.
  ('layoffScoreEngine.aiInvestmentSignal.low',       '0.00'::jsonb, 'uncalibrated_placeholder',
   'UNCALIBRATED — layoffScoreEngine.ts:1863. AI investment "low" → no L1 contribution.', 'WS9-correction'),
  ('layoffScoreEngine.aiInvestmentSignal.medium',    '0.12'::jsonb, 'uncalibrated_placeholder',
   'UNCALIBRATED — layoffScoreEngine.ts:1864. AI investment "medium" → small L1 contribution.', 'WS9-correction'),
  ('layoffScoreEngine.aiInvestmentSignal.high',      '0.52'::jsonb, 'uncalibrated_placeholder',
   'UNCALIBRATED — layoffScoreEngine.ts:1865. AI investment "high".', 'WS9-correction'),
  ('layoffScoreEngine.aiInvestmentSignal.veryHigh',  '0.80'::jsonb, 'uncalibrated_placeholder',
   'UNCALIBRATED — layoffScoreEngine.ts:1866. AI investment "very-high".', 'WS9-correction'),

  -- conformalCI minimum calibration set size (seeded correctly in 20260615000001
  -- as manual_seed; re-affirming here so the refactor uses a stable key).
  -- NO-OP if already present.
  ('conformalCI.minCalibrationPoints',               '80'::jsonb, 'manual_seed',
   'Industry rule of thumb. Below this n, conformal quantile is too unstable. conformalCI.ts:68.', 'WS9-correction')
ON CONFLICT (key, cohort_scope) WHERE status = 'active' DO NOTHING;

COMMENT ON TABLE public.engine_calibration_constants IS
  'WS9 — long-tail scalar constants. Seeded by 20260615000001 (initial 25, '
  'some with mismatched keys), 20260620000002 (peer/sentiment/headcount '
  'fan-out), 20260620000003 (corrected layoffScore band keys + supersedes '
  'the original mismatched rows). uncalibrated_placeholder rows are the '
  'recalibrate-engine work queue.';
