-- 20260509000001_engine_calibration_metrics.sql
-- v13.0: Engine accuracy tracking and model calibration infrastructure.
--
-- The community_prediction_accuracy view (from v12.0 migration
-- 20260507000001_user_prediction_outcomes.sql) provides the data source.
-- This migration adds:
--   1. engine_calibration_snapshots — weekly accuracy snapshots per engine version
--   2. signal_attribution_accuracy  — tracks which signals most accurately predict outcomes
--   3. macro_regime_cache           — cached macro environment snapshot (updated weekly via pg_cron)

-- ── 1. Engine calibration snapshots ───────────────────────────────────────────
-- Stores weekly accuracy snapshots by engine version and risk tier.
-- Populated by a Supabase Edge Function or pg_cron job that reads
-- community_prediction_accuracy and writes a compressed snapshot.

CREATE TABLE IF NOT EXISTS engine_calibration_snapshots (
  id                    BIGSERIAL PRIMARY KEY,
  engine_version        TEXT NOT NULL,                  -- e.g. 'v13.0'
  snapshot_date         DATE NOT NULL,
  risk_tier             TEXT NOT NULL,                  -- CRITICAL / HIGH / ELEVATED / MODERATE / LOW
  score_range           TEXT NOT NULL,                  -- e.g. '80-100'
  total_predictions     INTEGER NOT NULL DEFAULT 0,
  confirmed_layoffs     INTEGER NOT NULL DEFAULT 0,
  blended_accuracy      NUMERIC(5,3),                   -- 0–1 blended accuracy
  data_source           TEXT DEFAULT 'prior_estimate',  -- 'database' | 'prior_estimate' | 'hybrid'
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (engine_version, snapshot_date, risk_tier)
);

-- RLS: readable by all authenticated users; writable only by service role
ALTER TABLE engine_calibration_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "engine_calibration_snapshots_select"
  ON engine_calibration_snapshots FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "engine_calibration_snapshots_insert"
  ON engine_calibration_snapshots FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Indexes for read performance
CREATE INDEX IF NOT EXISTS idx_ecs_version_date
  ON engine_calibration_snapshots (engine_version, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_ecs_tier
  ON engine_calibration_snapshots (risk_tier, snapshot_date DESC);

-- ── 2. Signal attribution accuracy ───────────────────────────────────────────
-- Tracks which individual signals contribute most to accurate predictions.
-- Populated from analysis of prediction_outcomes vs. signal presence.

CREATE TABLE IF NOT EXISTS signal_attribution_accuracy (
  id                    BIGSERIAL PRIMARY KEY,
  engine_version        TEXT NOT NULL,
  signal_name           TEXT NOT NULL,
  signal_category       TEXT,                           -- 'financial' | 'management' | 'market' | 'macro'
  true_positive_rate    NUMERIC(5,3),                   -- when signal present, layoff confirmed
  false_positive_rate   NUMERIC(5,3),                   -- when signal present, no layoff
  information_gain      NUMERIC(5,3),                   -- mutual information (0–1)
  sample_size           INTEGER DEFAULT 0,
  measured_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (engine_version, signal_name)
);

ALTER TABLE signal_attribution_accuracy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "signal_attribution_select"
  ON signal_attribution_accuracy FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "signal_attribution_insert"
  ON signal_attribution_accuracy FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ── 3. Macro regime cache ─────────────────────────────────────────────────────
-- Stores the current macro environment snapshot.
-- Updated weekly by a pg_cron/edge function job.
-- The modelCalibrationEngine reads this when available to supplement its heuristics.

CREATE TABLE IF NOT EXISTS macro_regime_cache (
  id                    BIGSERIAL PRIMARY KEY,
  regime                TEXT NOT NULL,                  -- 'expansion' | 'moderate_growth' | etc.
  rate_cycle_phase      TEXT NOT NULL,                  -- 'plateau' | 'cutting_fast' | etc.
  credit_stress_level   TEXT NOT NULL,                  -- 'low' | 'elevated' | etc.
  us_gdp_growth_pct     NUMERIC(5,2),
  india_gdp_growth_pct  NUMERIC(5,2),
  global_pmi            NUMERIC(5,1),
  credit_spread_bps     INTEGER,
  notes                 TEXT,
  valid_from            DATE NOT NULL,
  valid_to              DATE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (valid_from)
);

ALTER TABLE macro_regime_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "macro_regime_cache_select"
  ON macro_regime_cache FOR SELECT
  TO authenticated
  USING (true);

-- Seed with May 2026 macro environment (matches macroEconomicRiskEngine.ts constants)
INSERT INTO macro_regime_cache (
  regime, rate_cycle_phase, credit_stress_level,
  us_gdp_growth_pct, india_gdp_growth_pct, global_pmi, credit_spread_bps,
  notes, valid_from
) VALUES (
  'moderate_growth', 'plateau', 'elevated',
  2.1, 6.8, 51.3, 185,
  'May 2026 snapshot: Fed plateau at 4.75-5.00%, AI displacement wave active, India GCC expansion. Sources: Fed FOMC May 2026, IMF World Economic Outlook Apr 2026, ISM PMI May 2026.',
  '2026-05-01'
) ON CONFLICT (valid_from) DO NOTHING;

-- ── 4. View: latest calibration per tier ─────────────────────────────────────
CREATE OR REPLACE VIEW latest_engine_calibration AS
  SELECT DISTINCT ON (risk_tier)
    engine_version,
    snapshot_date,
    risk_tier,
    score_range,
    total_predictions,
    confirmed_layoffs,
    blended_accuracy,
    data_source
  FROM engine_calibration_snapshots
  ORDER BY risk_tier, snapshot_date DESC;

-- ── 5. View: current macro regime ────────────────────────────────────────────
CREATE OR REPLACE VIEW current_macro_regime AS
  SELECT *
  FROM macro_regime_cache
  WHERE valid_from <= CURRENT_DATE
    AND (valid_to IS NULL OR valid_to >= CURRENT_DATE)
  ORDER BY valid_from DESC
  LIMIT 1;

COMMENT ON TABLE engine_calibration_snapshots IS 'v13.0: Weekly engine accuracy snapshots by risk tier. Read by modelCalibrationEngine.ts.';
COMMENT ON TABLE signal_attribution_accuracy IS 'v13.0: Signal-level prediction accuracy for trust transparency.';
COMMENT ON TABLE macro_regime_cache IS 'v13.0: Current macro environment snapshot. Updated weekly. Consumed by macroEconomicRiskEngine.ts.';
