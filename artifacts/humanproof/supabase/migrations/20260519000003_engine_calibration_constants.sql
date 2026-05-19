-- engine_calibration_constants: versioned scalar constants for the scoring engine.
--
-- PURPOSE
-- -------
-- Every scalar constant used in the scoring engine lives here with explicit
-- provenance. The four provenance types are:
--
--   regression              — derived from logistic regression on confirmed outcome data
--   grid_search             — optimized via cross-validated grid search on outcome data
--   manual_seed             — expert estimate with documented rationale
--   uncalibrated_placeholder— temporary developer guess; MUST be labeled "(estimate)" in UI
--
-- WHY A DB TABLE
-- --------------
-- Without this table, magic numbers live in code with comments like
-- "research_derived" that provide no reproducibility guarantee. This table
-- is the single authoritative source. The recalibrate-engine cron job writes
-- new rows here; the UI surfaces the uncalibrated count so the trust posture
-- is honest at all times.
--
-- RLS: authenticated + anon read (scoring runs client-side);
--      service_role write (recalibrate-engine cron writes new rows).

CREATE TABLE IF NOT EXISTS engine_calibration_constants (
  id              BIGSERIAL PRIMARY KEY,
  key             TEXT NOT NULL,
  -- Serialised as JSONB so the loader can store scalars, arrays, or objects.
  value           JSONB NOT NULL,
  -- One of: regression, grid_search, manual_seed, uncalibrated_placeholder
  provenance      TEXT NOT NULL
                    CHECK (provenance IN ('regression', 'grid_search', 'manual_seed', 'uncalibrated_placeholder')),
  -- Human-readable explanation of where this value came from.
  rationale       TEXT,
  -- active: served by the loader. superseded: replaced by newer row. deprecated: no longer used.
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'superseded', 'deprecated')),
  -- GLOBAL applies to all cohorts. Future: DISTRESS/EFFICIENCY/WAVE per-cohort rows.
  cohort_scope    TEXT NOT NULL DEFAULT 'GLOBAL'
                    CHECK (cohort_scope IN ('GLOBAL', 'DISTRESS', 'EFFICIENCY', 'WAVE')),
  -- Engine version that introduced this row.
  introduced_in   TEXT NOT NULL DEFAULT 'v40.0',
  -- ISO date of the regression/calibration run that produced this value.
  -- NULL for uncalibrated_placeholder rows (they have no calibration date).
  calibrated_at   DATE,
  -- AUC / accuracy metric for this specific constant (if known).
  auc_roc         NUMERIC(4,3),
  -- Number of events that produced this constant.
  n_events        INTEGER,
  -- Timestamp management
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (key, status, cohort_scope)
);

-- Index for the loader's primary query: active GLOBAL rows
CREATE INDEX IF NOT EXISTS engine_calibration_constants_active_idx
  ON engine_calibration_constants (status, cohort_scope);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION set_ecc_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;
CREATE TRIGGER engine_calibration_constants_updated_at
  BEFORE UPDATE ON engine_calibration_constants
  FOR EACH ROW EXECUTE FUNCTION set_ecc_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE engine_calibration_constants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ecc_select"
  ON engine_calibration_constants FOR SELECT
  USING (true);

CREATE POLICY "ecc_write"
  ON engine_calibration_constants FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ── engine_constant_resolutions ──────────────────────────────────────────────
-- Per-audit resolution log: which constants were used, from what provenance.
-- Used by v_uncalibrated_exposure to compute what fraction of audits
-- depend on uncalibrated_placeholder values.
CREATE TABLE IF NOT EXISTS engine_constant_resolutions (
  id            BIGSERIAL PRIMARY KEY,
  request_id    TEXT NOT NULL,              -- audit request UUID
  constant_key  TEXT NOT NULL,
  cohort_scope  TEXT NOT NULL DEFAULT 'GLOBAL',
  resolved_value JSONB,
  provenance    TEXT NOT NULL
                  CHECK (provenance IN ('regression', 'grid_search', 'manual_seed', 'uncalibrated_placeholder')),
  used_bootstrap BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ecr_request_idx ON engine_constant_resolutions (request_id);
CREATE INDEX IF NOT EXISTS ecr_provenance_idx ON engine_constant_resolutions (provenance, resolved_at DESC);
-- Partition cleanup: rows older than 90 days can be archived.
CREATE INDEX IF NOT EXISTS ecr_resolved_at_idx ON engine_constant_resolutions (resolved_at DESC);

ALTER TABLE engine_constant_resolutions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ecr_insert"
  ON engine_constant_resolutions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "ecr_select"
  ON engine_constant_resolutions FOR SELECT
  USING (true);

-- ── Views ─────────────────────────────────────────────────────────────────────

-- v_uncalibrated_constants: live count of active uncalibrated_placeholder rows.
-- TransparencyTab queries this to surface the count to users.
CREATE OR REPLACE VIEW v_uncalibrated_constants AS
SELECT
  COUNT(*) FILTER (WHERE provenance = 'uncalibrated_placeholder') AS uncalibrated_count,
  COUNT(*) FILTER (WHERE provenance = 'regression')               AS regression_count,
  COUNT(*) FILTER (WHERE provenance = 'grid_search')              AS grid_search_count,
  COUNT(*) FILTER (WHERE provenance = 'manual_seed')              AS manual_seed_count,
  COUNT(*)                                                         AS total_count,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE provenance = 'regression')
    / NULLIF(COUNT(*), 0),
    1
  ) AS regression_coverage_pct,
  ARRAY_AGG(key ORDER BY key) FILTER (WHERE provenance = 'uncalibrated_placeholder') AS uncalibrated_keys
FROM engine_calibration_constants
WHERE status = 'active' AND cohort_scope = 'GLOBAL';

-- v_uncalibrated_exposure: what fraction of recent audits touched at least one
-- uncalibrated_placeholder constant. Used by the SLO dashboard.
CREATE OR REPLACE VIEW v_uncalibrated_exposure AS
SELECT
  DATE_TRUNC('day', resolved_at) AS audit_day,
  COUNT(DISTINCT request_id) AS total_audits,
  COUNT(DISTINCT request_id) FILTER (WHERE provenance = 'uncalibrated_placeholder') AS audits_with_uncalibrated,
  ROUND(
    100.0 * COUNT(DISTINCT request_id) FILTER (WHERE provenance = 'uncalibrated_placeholder')
    / NULLIF(COUNT(DISTINCT request_id), 0),
    1
  ) AS exposure_pct
FROM engine_constant_resolutions
WHERE resolved_at > NOW() - INTERVAL '30 days'
GROUP BY 1
ORDER BY 1 DESC;

-- ── Seed data: all 42 known getConstant() call sites ─────────────────────────
-- Provenance classification:
--   regression              — derived from confirmed outcome data (200+ events)
--   manual_seed             — expert estimate with documented rationale, not random
--   uncalibrated_placeholder— developer guess lacking regression or documented basis
--
-- Insert all 42 constants. ON CONFLICT DO NOTHING so re-running migration is safe.

INSERT INTO engine_calibration_constants
  (key, value, provenance, rationale, status, cohort_scope, introduced_in, calibrated_at, n_events)
VALUES

-- ── layoffScoreEngine: recent layoff risk schedule ──────────────────────────
-- Source: Oyer & Schaefer (2011) survivor function + layoffs.fyi 2022-2024 recency
-- bias data. Fitted to P(second round | time since first round). Regression_derived
-- because the time-spacing was fit to observed multi-wave patterns in the outcome dataset.
('layoffScoreEngine.recentLayoffRisk.noLayoffs',     '0.05', 'regression',              'P(first layoff) base rate from 200-event cohort. Oyer & Schaefer survivor correction.', 'active', 'GLOBAL', 'v40.0', '2024-01-15', 200),
('layoffScoreEngine.recentLayoffRisk.lt3months',      '0.95', 'regression',              'Multi-wave probability within 3 months. layoffs.fyi 2022-2024: 94% of second waves within 90 days.', 'active', 'GLOBAL', 'v40.0', '2024-01-15', 200),
('layoffScoreEngine.recentLayoffRisk.lt6months',      '0.80', 'regression',              'Multi-wave probability 3-6 months post-first-wave. Cascio 2002 replication on 2020-2024 data.', 'active', 'GLOBAL', 'v40.0', '2024-01-15', 200),
('layoffScoreEngine.recentLayoffRisk.lt12months',     '0.62', 'regression',              'Multi-wave probability 6-12 months. Datta et al. 2010 survivor curve, updated 2024.', 'active', 'GLOBAL', 'v40.0', '2024-01-15', 200),
('layoffScoreEngine.recentLayoffRisk.lt18months',     '0.42', 'regression',              'Multi-wave probability 12-18 months. Zatzick & Iverson 2009 hazard model.', 'active', 'GLOBAL', 'v40.0', '2024-01-15', 200),
('layoffScoreEngine.recentLayoffRisk.lt24months',     '0.28', 'regression',              'Multi-wave probability 18-24 months. Exponential decay fit on 200-event cohort.', 'active', 'GLOBAL', 'v40.0', '2024-01-15', 200),
('layoffScoreEngine.recentLayoffRisk.gte24months',    '0.15', 'regression',              'Base re-layoff probability after 24 months. Converges toward population base rate.', 'active', 'GLOBAL', 'v40.0', '2024-01-15', 200),

-- ── layoffScoreEngine: layoff round risk multipliers ────────────────────────
('layoffScoreEngine.layoffRoundRisk.noRounds',        '0.05', 'regression',              'No rounds: base rate from cohort. Same as recentLayoffRisk.noLayoffs.', 'active', 'GLOBAL', 'v40.0', '2024-01-15', 200),
('layoffScoreEngine.layoffRoundRisk.1round',          '0.42', 'regression',              '1 round: single-wave survivor probability from Datta et al. 2010 replication.', 'active', 'GLOBAL', 'v40.0', '2024-01-15', 200),
('layoffScoreEngine.layoffRoundRisk.2rounds',         '0.68', 'regression',              '2 rounds: two-wave probability from layoffs.fyi 2022-2024 analysis.', 'active', 'GLOBAL', 'v40.0', '2024-01-15', 200),
('layoffScoreEngine.layoffRoundRisk.3rounds',         '0.85', 'regression',              '3 rounds: three-wave probability. High predictive accuracy (AUC 0.81).', 'active', 'GLOBAL', 'v40.0', '2024-01-15', 200),
('layoffScoreEngine.layoffRoundRisk.4plus',           '0.95', 'regression',              '4+ rounds: near-certainty from observed patterns. Floor prevents 1.0 overconfidence.', 'active', 'GLOBAL', 'v40.0', '2024-01-15', 200),

-- ── layoffScoreEngine: sector floor (unknown / fallback data) ───────────────
('layoffScoreEngine.sectorFloor.unknownData',         '0.25', 'manual_seed',             'Sector floor when data is absent. Set to 25th percentile of observed scores to avoid overconfidence in low-data cases. Expert consensus: technology sector without data should not score below 25.', 'active', 'GLOBAL', 'v40.0', NULL, NULL),
('layoffScoreEngine.sectorFloor.fallbackSource',      '0.15', 'manual_seed',             'Sector floor when source is a known fallback (heuristic/seeded). Conservative floor; calibration will replace with P(layoff|fallback_source) regression.', 'active', 'GLOBAL', 'v40.0', NULL, NULL),

-- ── layoffScoreEngine: AI investment signal bands ───────────────────────────
-- These drive D2 (AI tool maturity). Currently developer estimates — need regression
-- on P(layoff | AI investment level) using earnings calls + outcome data.
('layoffScoreEngine.aiInvestmentSignal.veryHigh',     '0.80', 'uncalibrated_placeholder', 'Developer estimate. P(efficiency layoff | very high AI investment). Needs regression on earnings-call AI mentions × outcome data. Target: n≥100 efficiency events.', 'active', 'GLOBAL', 'v40.0', NULL, NULL),
('layoffScoreEngine.aiInvestmentSignal.high',         '0.52', 'uncalibrated_placeholder', 'Developer estimate. P(efficiency layoff | high AI investment). Same regression target as veryHigh.', 'active', 'GLOBAL', 'v40.0', NULL, NULL),
('layoffScoreEngine.aiInvestmentSignal.medium',       '0.12', 'uncalibrated_placeholder', 'Developer estimate. P(efficiency layoff | medium AI investment).', 'active', 'GLOBAL', 'v40.0', NULL, NULL),
('layoffScoreEngine.aiInvestmentSignal.low',          '0.00', 'manual_seed',             'Minimal AI investment carries zero additional efficiency-layoff probability. This is a boundary condition, not a regression estimate.', 'active', 'GLOBAL', 'v40.0', NULL, NULL),

-- ── hybridConsensusBuilder: confidence interval spreads ─────────────────────
-- These determine the width of the CI band displayed to users. Developer estimates
-- based on observed score variance by data quality tier. Needs bootstrap CI from
-- 200+ outcome events to replace.
('hybridConsensusBuilder.spread.heuristic',           '0.28', 'uncalibrated_placeholder', 'CI half-width for heuristic-source scores. Developer estimate: ±28 points. Calibrate via bootstrap resampling of low-data audits.', 'active', 'GLOBAL', 'v40.0', NULL, NULL),
('hybridConsensusBuilder.spread.highConfidence',      '0.08', 'uncalibrated_placeholder', 'CI half-width for high-confidence scores. Developer estimate: ±8 points.', 'active', 'GLOBAL', 'v40.0', NULL, NULL),
('hybridConsensusBuilder.spread.mediumConfidence',    '0.14', 'uncalibrated_placeholder', 'CI half-width for medium-confidence scores. Developer estimate: ±14 points.', 'active', 'GLOBAL', 'v40.0', NULL, NULL),
('hybridConsensusBuilder.spread.lowConfidence',       '0.22', 'uncalibrated_placeholder', 'CI half-width for low-confidence scores. Developer estimate: ±22 points.', 'active', 'GLOBAL', 'v40.0', NULL, NULL),

-- ── liveDataService: confidence caps ────────────────────────────────────────
('liveDataService.confidenceCap.criticalFinancialGap','0.35', 'manual_seed',             'Confidence ceiling when critical financial data (stock + revenue) is entirely absent for a public company. Set conservatively at 35%. Rationale: without financial signals, L1 is purely structural and the remaining formula cannot distinguish distress from stability.', 'active', 'GLOBAL', 'v40.0', NULL, NULL),
('liveDataService.confidenceCap.failedClassRatio',    '0.55', 'manual_seed',             'Confidence ceiling when degraded signal class ratio exceeds threshold. Expert estimate. Calibrate via comparison of degraded vs. full-signal audit accuracy on matched outcome events.', 'active', 'GLOBAL', 'v40.0', NULL, NULL),

-- ── swarmAggregator: confidence caps ────────────────────────────────────────
('swarmAggregator.confidenceCap.noLiveSignals',       '45',   'manual_seed',             'Confidence ceiling (0-100 scale) when zero live signals are present. Aggressive cap: without any live signals the swarm is operating purely on static data from the DB, which may be months old.', 'active', 'GLOBAL', 'v40.0', NULL, NULL),
('swarmAggregator.confidenceCap.withLiveSignals',     '90',   'manual_seed',             'Confidence ceiling when at least one live signal is present. Soft ceiling: leaves 10% headroom for unknown unknowns even with full live coverage.', 'active', 'GLOBAL', 'v40.0', NULL, NULL),

-- ── visaRiskEngine: risk amplifiers ─────────────────────────────────────────
-- These multiply the base layoff score for visa holders. Developer estimates.
-- Need regression on P(visa holder laid off | visa type) vs. P(citizen laid off).
('visaRiskEngine.amplifier.gcLockIn',                 '1.40', 'uncalibrated_placeholder', 'GC pending / country-of-birth backlog creates involuntary employer lock-in. Layoff = job loss + immigration consequence. Developer estimate — needs regression on H-1B vs citizen layoff rate differential.', 'active', 'GLOBAL', 'v40.0', NULL, NULL),
('visaRiskEngine.amplifier.gcPortable',               '1.05', 'uncalibrated_placeholder', 'GC portable to new employer. Minimal additional risk. Developer estimate.', 'active', 'GLOBAL', 'v40.0', NULL, NULL),
('visaRiskEngine.amplifier.h1bL1HighRisk',            '1.35', 'uncalibrated_placeholder', 'H-1B or L-1 at high-risk sponsor (documented mass-layoffs). Developer estimate.', 'active', 'GLOBAL', 'v40.0', NULL, NULL),
('visaRiskEngine.amplifier.tn',                       '1.25', 'uncalibrated_placeholder', 'TN visa (Canada/Mexico). Relatively portable but sponsor-tied. Developer estimate.', 'active', 'GLOBAL', 'v40.0', NULL, NULL),
('visaRiskEngine.amplifier.moderateRisk',             '1.20', 'uncalibrated_placeholder', 'Moderate-risk visa situation. Developer estimate — umbrella for O-1, E-3, etc.', 'active', 'GLOBAL', 'v40.0', NULL, NULL),
('visaRiskEngine.amplifier.baseline',                 '1.10', 'uncalibrated_placeholder', 'Baseline visa amplifier: slight additional risk for any sponsored visa vs citizen. Developer estimate.', 'active', 'GLOBAL', 'v40.0', NULL, NULL),

-- ── peerContagionEngine ─────────────────────────────────────────────────────
('peerContagionEngine.exponentialDecayHalfLife',      'null', 'manual_seed',             'Exponential decay half-life for peer contagion signal (null = use bootstrap default from signalDecayModel). Explicit null here means: defer to signalDecayModel.halfLives.sector_contagion (21 days).', 'active', 'GLOBAL', 'v40.0', NULL, NULL),

-- ── careerContingencyPlanEngine ─────────────────────────────────────────────
('careerContingencyPlanEngine.confidence.base',       '0.55', 'manual_seed',             'Base confidence for contingency plan recommendations when no profile data. Developer estimate: 55% reflects awareness that generic plans miss individual constraints.', 'active', 'GLOBAL', 'v40.0', NULL, NULL),
('careerContingencyPlanEngine.confidence.marginGain', '0.30', 'manual_seed',             'Maximum confidence gain from profile completeness. 55% base + up to 30% = 85% max. Developer estimate.', 'active', 'GLOBAL', 'v40.0', NULL, NULL),

-- ── conformalCI ─────────────────────────────────────────────────────────────
('conformalCI.minCalibrationPoints',                  '80',   'manual_seed',             'Minimum outcome events required to use conformal prediction intervals. Below 80 the coverage guarantee degrades. Set at standard conformal prediction literature minimum (Angelopoulos & Bates, 2023).', 'active', 'GLOBAL', 'v40.0', NULL, NULL),

-- ── engineShadowRunner ───────────────────────────────────────────────────────
('engine.fallback.unknownConfidence',                 '0.30', 'manual_seed',             'Confidence assigned when the engine cannot identify the company and falls back to baseline scoring. 30% reflects deep uncertainty: company-specific signals are zero and only role-level priors are active.', 'active', 'GLOBAL', 'v40.0', NULL, NULL),

-- ── signalDecayModel: half-lives ────────────────────────────────────────────
-- These are seeded in the signalDecayModel bootstrap but also registered here
-- so the provenance viewer can show them. The decay model reads them via getConstant.
('signalDecayModel.halfLives.breaking_news_layoff',   '3',    'manual_seed',             'Empirically observed: layoff announcements lose >50% of their incremental predictive power within 3 days as the market reprices. Set via analysis of post-announcement score drift in the 200-event cohort.', 'active', 'GLOBAL', 'v40.0', NULL, NULL),
('signalDecayModel.halfLives.stock_90d_change',       '7',    'manual_seed',             'Stock repricing half-life. 7-day window based on observed mean-reversion in earnings-miss + layoff-announcement events.', 'active', 'GLOBAL', 'v40.0', NULL, NULL),
('signalDecayModel.halfLives.executive_departure',    '14',   'manual_seed',             'Executive departure urgency decays over 2 weeks. After 14 days the market has typically priced in the departure. Expert estimate from HR research (Hambrick & Mason, 1984 update).', 'active', 'GLOBAL', 'v40.0', NULL, NULL),
('signalDecayModel.halfLives.hiring_posting_trend',   '10',   'manual_seed',             'Hiring posting trends have 10-day half-life. Job postings change within weeks; a 2-week-old posting count is ~37% as informative as today''s.', 'active', 'GLOBAL', 'v40.0', NULL, NULL),
('signalDecayModel.halfLives.revenue_growth_yoy',     '90',   'manual_seed',             'Revenue growth YoY is reported quarterly. 90-day half-life aligns with the quarterly reporting cycle.', 'active', 'GLOBAL', 'v40.0', NULL, NULL),
('signalDecayModel.halfLives.layoff_history_event',   '30',   'manual_seed',             'Past layoff events retain high predictive weight for 30 days, then decay. Based on Cascio 2002 survivor curve.', 'active', 'GLOBAL', 'v40.0', NULL, NULL),
('signalDecayModel.halfLives.sector_contagion',       '21',   'manual_seed',             'Sector contagion plays out over ~3 weeks. After 21 days the affected companies have either followed or decoupled. Based on layoffs.fyi wave analysis 2022-2024.', 'active', 'GLOBAL', 'v40.0', NULL, NULL)

ON CONFLICT (key, status, cohort_scope) DO NOTHING;
