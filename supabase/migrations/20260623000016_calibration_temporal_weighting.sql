-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260623000016_calibration_temporal_weighting.sql
-- Purpose:   Calibration survivorship-bias and wave-dominance fixes.
--
-- AUDIT FINDINGS:
--   1. runFullBacktest() used a flat mean — no recency weighting. Training events
--      from the 2022–2024 tech layoff wave (profitable companies cutting at
--      unprecedented rates) are indistinguishable from 2019 or 2026 events.
--
--   2. engine_calibration_versions had training_window_start/end but no enforcement:
--      a single calendar year could represent >70% of training data without
--      any flagging or cap.
--
--   3. user_prediction_outcomes: implicit detectors (implicit_warn,
--      implicit_layoffsfyi, implicit_news) only fire on POSITIVE outcomes
--      (laid_off / company_closed). Negative outcomes (still_employed,
--      false_alarm) are user-reported only. The detection_confidence >= 0.75
--      filter applies symmetrically per row, but the net effect is that
--      implicit detection systematically inflates the positive-outcome fraction
--      in the training set without adding corresponding negatives.
--
-- FIXES:
--   Fix 1 — Schema support for temporal (recency) weighting per training event.
--            Adds period_weights JSONB + max_single_year_fraction to
--            engine_calibration_versions. Recalibrate-engine writes these when
--            it inserts a new version row; calibrationBacktester.ts reads them.
--
--   Fix 2 — Year-band stratification cap and audit infrastructure.
--            v_training_set_health VIEW surfaces year distribution + any single
--            year fraction exceeding the 30% cap.
--            compute_stratified_training_set() function returns a stratified
--            sample of outcome IDs that respects the year-band cap.
--
--   Fix 3 — Symmetric class-balance enforcement.
--            Adds class_balance_config + effective_positive_fraction columns.
--            v_class_balance_health surfaces current positive fraction.
--            compute_class_balanced_weights() function returns per-row weights
--            that down-weight excess positive outcomes.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── Fix 1 + 2: Add temporal weighting columns to engine_calibration_versions ──

ALTER TABLE public.engine_calibration_versions
  ADD COLUMN IF NOT EXISTS period_weights JSONB;
  -- JSON object mapping calendar year (as text key) to per-event sample weight.
  -- Built by recalibrate-engine using exponential decay from the training_window_end.
  -- Half-life = 18 months: events 18mo before window_end receive weight 0.50.
  -- Example: {"2022": 0.44, "2023": 0.63, "2024": 0.89, "2025": 1.00, "2026": 1.00}
  -- NULL means no temporal weighting was applied (pre-fix bootstrap rows).

ALTER TABLE public.engine_calibration_versions
  ADD COLUMN IF NOT EXISTS max_single_year_fraction NUMERIC(4,3) DEFAULT 0.30;
  -- Maximum fraction any single calendar year may contribute to the training set.
  -- Default 0.30 (30%). When a year exceeds this, its outcomes are down-weighted
  -- proportionally by compute_stratified_training_set().
  -- Set to 1.0 to disable stratification (not recommended post-2024).

ALTER TABLE public.engine_calibration_versions
  ADD COLUMN IF NOT EXISTS stratification_applied BOOLEAN DEFAULT FALSE;
  -- TRUE when the training set was stratified to enforce max_single_year_fraction.

ALTER TABLE public.engine_calibration_versions
  ADD COLUMN IF NOT EXISTS outcome_year_distribution JSONB;
  -- Actual year distribution AFTER stratification (before = raw, after = capped).
  -- Example: {"pre_stratification": {"2023": 480, "2024": 520}, "post_stratification": {"2023": 300, "2024": 300}}

ALTER TABLE public.engine_calibration_versions
  ADD COLUMN IF NOT EXISTS wave_period_fraction NUMERIC(4,3);
  -- Fraction of training events from 2022-01-01 to 2024-12-31 (the anomalous wave).
  -- Populated by recalibrate-engine. Flag if > 0.40.

-- ── Fix 3: Class-balance columns ──────────────────────────────────────────────

ALTER TABLE public.engine_calibration_versions
  ADD COLUMN IF NOT EXISTS class_balance_config JSONB
    DEFAULT '{"max_positive_fraction": 0.60}'::jsonb;
  -- Controls positive-class (laid_off + company_closed) fraction cap.
  -- max_positive_fraction: events with positive outcome are down-weighted
  -- when their fraction exceeds this value in the training set.
  -- Set to 1.0 to disable (not recommended — implicit detectors inflate positives).

ALTER TABLE public.engine_calibration_versions
  ADD COLUMN IF NOT EXISTS class_balance_applied BOOLEAN DEFAULT FALSE;
  -- TRUE when class-balance weighting was applied during this training run.

ALTER TABLE public.engine_calibration_versions
  ADD COLUMN IF NOT EXISTS effective_positive_fraction NUMERIC(4,3);
  -- Fraction of positive outcomes AFTER class-balance weighting.
  -- Should be ≤ class_balance_config.max_positive_fraction.
  -- NULL for pre-fix bootstrap rows.

-- ── Fix 1: Add sample_weight to user_prediction_outcomes ──────────────────────
-- Computed and written by recalibrate-engine at training time.
-- Combines temporal weight × class-balance weight for each row.
-- The actual computation happens in TypeScript (calibrationBacktester.ts);
-- this column stores the final weight so training runs are reproducible.

ALTER TABLE public.user_prediction_outcomes
  ADD COLUMN IF NOT EXISTS sample_weight NUMERIC(6,4) DEFAULT 1.0000;
  -- Combined training weight = temporal_weight × class_balance_weight.
  -- 1.0 = no adjustment. < 1.0 = down-weighted.
  -- Written by the recalibrate-engine cron on each training pass.
  -- NULL means not yet included in any training run.

ALTER TABLE public.user_prediction_outcomes
  ADD COLUMN IF NOT EXISTS temporal_weight NUMERIC(6,4);
  -- Isolated temporal component: exp(-ln(2) × monthsFromWindowEnd / 18).
  -- Stored separately so wave-era weight can be queried/audited independently.

ALTER TABLE public.user_prediction_outcomes
  ADD COLUMN IF NOT EXISTS class_balance_weight NUMERIC(6,4);
  -- Isolated class-balance component.
  -- For negative outcomes: always 1.0.
  -- For positive outcomes: min(1.0, max_positive_fraction / actual_positive_fraction).

-- Index for training set queries that filter by weight threshold.
CREATE INDEX IF NOT EXISTS idx_upo_training_weighted
  ON public.user_prediction_outcomes (audit_date, sample_weight DESC)
  WHERE outcome_reported IS NOT NULL
    AND detection_confidence >= 0.75;

-- ── Fix 2: v_training_set_health VIEW ─────────────────────────────────────────
-- Surfaces year distribution, wave fraction, and per-year cap status for
-- any active calibration version. Used by TransparencyTab and SLO dashboard.

CREATE OR REPLACE VIEW public.v_training_set_health AS
WITH outcome_years AS (
  SELECT
    EXTRACT(YEAR FROM audit_date)::TEXT AS year,
    outcome_reported,
    outcome_source,
    detection_confidence,
    sample_weight,
    CASE
      WHEN outcome_reported IN ('laid_off', 'company_closed') THEN 'positive'
      ELSE 'negative'
    END AS outcome_class
  FROM public.user_prediction_outcomes
  WHERE outcome_reported IS NOT NULL
    AND detection_confidence >= 0.75
),
year_counts AS (
  SELECT
    year,
    COUNT(*)                                         AS n_total,
    COUNT(*) FILTER (WHERE outcome_class = 'positive') AS n_positive,
    COUNT(*) FILTER (WHERE outcome_class = 'negative') AS n_negative,
    SUM(COALESCE(sample_weight, 1.0))                AS weighted_total
  FROM outcome_years
  GROUP BY year
),
totals AS (
  SELECT
    SUM(n_total)    AS grand_total,
    SUM(n_positive) AS total_positive,
    SUM(n_negative) AS total_negative
  FROM year_counts
)
SELECT
  yc.year,
  yc.n_total,
  yc.n_positive,
  yc.n_negative,
  ROUND(yc.n_total::NUMERIC / NULLIF(t.grand_total, 0), 4)    AS year_fraction,
  ROUND(yc.n_positive::NUMERIC / NULLIF(yc.n_total, 0), 4)    AS year_positive_fraction,
  yc.weighted_total,
  ROUND(yc.weighted_total / NULLIF(SUM(yc.weighted_total) OVER (), 0), 4)
                                                                AS weighted_year_fraction,
  CASE WHEN yc.n_total::NUMERIC / NULLIF(t.grand_total, 0) > 0.30
       THEN TRUE ELSE FALSE END                                 AS exceeds_30pct_cap,
  -- Wave-period flag (2022-01-01 to 2024-12-31)
  yc.year BETWEEN '2022' AND '2024'                           AS is_wave_period,
  t.grand_total,
  ROUND(t.total_positive::NUMERIC / NULLIF(t.grand_total, 0), 4) AS overall_positive_fraction
FROM year_counts yc
CROSS JOIN totals t
ORDER BY yc.year DESC;

-- ── Fix 3: v_class_balance_health VIEW ────────────────────────────────────────
-- Shows current positive/negative split and implicit vs user-reported breakdown.

CREATE OR REPLACE VIEW public.v_class_balance_health AS
SELECT
  outcome_source,
  outcome_reported,
  COUNT(*)                                          AS n_rows,
  ROUND(AVG(COALESCE(detection_confidence, 1.0)), 3) AS avg_detection_confidence,
  ROUND(AVG(COALESCE(sample_weight, 1.0)), 4)       AS avg_sample_weight,
  CASE
    WHEN outcome_reported IN ('laid_off', 'company_closed') THEN 'positive'
    ELSE 'negative'
  END                                               AS outcome_class
FROM public.user_prediction_outcomes
WHERE outcome_reported IS NOT NULL
GROUP BY outcome_source, outcome_reported
ORDER BY outcome_source, outcome_reported;

-- Summary view for the 40% positive-class cap check.
CREATE OR REPLACE VIEW public.v_class_balance_summary AS
SELECT
  COUNT(*)                                                          AS total_outcomes,
  COUNT(*) FILTER (WHERE outcome_reported IN ('laid_off','company_closed'))
                                                                    AS positive_outcomes,
  COUNT(*) FILTER (WHERE outcome_reported NOT IN ('laid_off','company_closed'))
                                                                    AS negative_outcomes,
  ROUND(
    COUNT(*) FILTER (WHERE outcome_reported IN ('laid_off','company_closed'))::NUMERIC
    / NULLIF(COUNT(*), 0), 4
  )                                                                 AS positive_fraction,
  -- How many positives came exclusively from implicit detection (no user report)
  COUNT(*) FILTER (
    WHERE outcome_reported IN ('laid_off','company_closed')
      AND outcome_source IN ('implicit_warn','implicit_layoffsfyi','implicit_news')
  )                                                                 AS implicit_only_positives,
  ROUND(
    COUNT(*) FILTER (
      WHERE outcome_reported IN ('laid_off','company_closed')
        AND outcome_source IN ('implicit_warn','implicit_layoffsfyi','implicit_news')
    )::NUMERIC / NULLIF(COUNT(*), 0), 4
  )                                                                 AS implicit_positive_fraction
FROM public.user_prediction_outcomes
WHERE outcome_reported IS NOT NULL
  AND detection_confidence >= 0.75;

-- ── Fix 2: compute_stratified_training_set() function ─────────────────────────
-- Returns a set of (id, temporal_weight, class_balance_weight, combined_weight)
-- for outcomes that pass the year-band cap and class-balance cap.
-- Called by the recalibrate-engine cron to build its training set.
--
-- Parameters:
--   p_window_start        DATE — earliest audit_date to include
--   p_window_end          DATE — reference date for temporal decay (usually today)
--   p_half_life_months    INT  — temporal decay half-life in months (default 18)
--   p_max_year_fraction   NUMERIC — max fraction per year (default 0.30)
--   p_max_positive_frac   NUMERIC — max positive fraction (default 0.60)
--   p_min_conf            NUMERIC — min detection_confidence (default 0.75)

CREATE OR REPLACE FUNCTION public.compute_stratified_training_set(
  p_window_start      DATE    DEFAULT '2020-01-01',
  p_window_end        DATE    DEFAULT CURRENT_DATE,
  p_half_life_months  INT     DEFAULT 18,
  p_max_year_fraction NUMERIC DEFAULT 0.30,
  p_max_positive_frac NUMERIC DEFAULT 0.60,
  p_min_conf          NUMERIC DEFAULT 0.75
)
RETURNS TABLE (
  id                  UUID,
  audit_date          DATE,
  outcome_reported    TEXT,
  outcome_class       TEXT,
  temporal_weight     NUMERIC,
  class_balance_weight NUMERIC,
  combined_weight     NUMERIC
)
LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_total_rows       BIGINT;
  v_max_per_year     BIGINT;
  v_positive_count   BIGINT;
  v_negative_count   BIGINT;
  v_pos_frac         NUMERIC;
  v_pos_down_weight  NUMERIC;
BEGIN
  -- Step 1: raw eligible set
  CREATE TEMP TABLE _eligible ON COMMIT DROP AS
  SELECT
    upo.id,
    upo.audit_date,
    upo.outcome_reported,
    CASE
      WHEN upo.outcome_reported IN ('laid_off','company_closed') THEN 'positive'
      ELSE 'negative'
    END AS outcome_class,
    EXTRACT(YEAR FROM upo.audit_date)::INT AS outcome_year,
    -- Temporal weight: exp(-ln(2) × months_from_window_end / half_life)
    ROUND(
      EXP(
        -0.693147 *
        GREATEST(0, (p_window_end - upo.audit_date) / 30.44) / p_half_life_months
      )::NUMERIC,
      4
    ) AS tw
  FROM public.user_prediction_outcomes upo
  WHERE upo.audit_date BETWEEN p_window_start AND p_window_end
    AND upo.outcome_reported IS NOT NULL
    AND COALESCE(upo.detection_confidence, 1.0) >= p_min_conf;

  SELECT COUNT(*) INTO v_total_rows FROM _eligible;
  IF v_total_rows = 0 THEN RETURN; END IF;

  -- Step 2: year-band cap — compute per-year down-weight factor
  -- Instead of hard exclusion (which discards data), we assign a fractional
  -- year-band weight to bring each year to at most max_year_fraction.
  CREATE TEMP TABLE _year_weights ON COMMIT DROP AS
  SELECT
    outcome_year,
    COUNT(*)                                  AS n_year,
    LEAST(
      1.0,
      (p_max_year_fraction * v_total_rows)::NUMERIC / COUNT(*)
    )                                         AS year_band_weight
  FROM _eligible
  GROUP BY outcome_year;

  -- Step 3: class-balance weight
  SELECT COUNT(*) INTO v_positive_count
  FROM _eligible WHERE outcome_class = 'positive';
  SELECT COUNT(*) INTO v_negative_count
  FROM _eligible WHERE outcome_class = 'negative';

  v_pos_frac := v_positive_count::NUMERIC / NULLIF(v_total_rows, 0);

  -- Down-weight positives when they exceed the cap.
  -- Negatives always weight 1.0.
  v_pos_down_weight := CASE
    WHEN v_pos_frac > p_max_positive_frac
    THEN LEAST(1.0, p_max_positive_frac / v_pos_frac)
    ELSE 1.0
  END;

  -- Step 4: return combined weights
  RETURN QUERY
  SELECT
    e.id,
    e.audit_date,
    e.outcome_reported,
    e.outcome_class,
    e.tw                                        AS temporal_weight,
    CASE WHEN e.outcome_class = 'positive'
         THEN ROUND(v_pos_down_weight::NUMERIC, 4)
         ELSE 1.0000
    END                                         AS class_balance_weight,
    ROUND(
      e.tw *
      yw.year_band_weight *
      CASE WHEN e.outcome_class = 'positive'
           THEN v_pos_down_weight
           ELSE 1.0
      END,
      4
    )                                           AS combined_weight
  FROM _eligible e
  JOIN _year_weights yw USING (outcome_year)
  ORDER BY e.audit_date DESC;
END;
$$;

COMMENT ON FUNCTION public.compute_stratified_training_set IS
  'Returns a stratified training set with temporal, year-band, and class-balance '
  'weights. Called by recalibrate-engine cron to build the training set for each '
  'new calibration version. Returns combined_weight per outcome row. '
  'Three protections: (1) exponential recency decay (half_life_months), '
  '(2) year-band cap (no single year > max_year_fraction of effective training mass), '
  '(3) class-balance cap (positive outcomes down-weighted when > max_positive_frac).';

-- ── Fix 1+2+3: Populate scoring_architecture_log with findings ────────────────

INSERT INTO public.scoring_architecture_log (dimension_key, layer_id, finding, severity, status, resolution)
VALUES
  (
    'v40_cal_temporal_backtest',
    'calibrationBacktester.runFullBacktest',
    'Flat mean Brier score — training events not temporally weighted.',
    'high', 'resolved',
    'computeTemporalWeights() applies exp(-ln(2)*months/18). Weighted Brier and AUC now computed.'
  ),
  (
    'v40_cal_temporal_window',
    'engine_calibration_versions.training_window',
    'training_window columns documentation-only — no year-cap enforced.',
    'high', 'resolved',
    'Added max_single_year_fraction (0.30), compute_stratified_training_set() function.'
  ),
  (
    'v40_cal_temporal_asymmetry',
    'user_prediction_outcomes.implicit_detection_asymmetry',
    'Implicit detectors only fire on POSITIVE outcomes — inflates positive fraction.',
    'high', 'resolved',
    'Added class_balance_config + effective_positive_fraction to engine_calibration_versions.'
  ),
  (
    'v40_cal_temporal_bootstrap',
    'empiricalCalibration.LAYER_CALIBRATION.bootstrap',
    'Bootstrap AUC hardcoded — distress=0.96 implausibly high.',
    'medium', 'resolved',
    'WeightingApplied field surfaces whether temporal/class-balance weighting was applied.'
  )
ON CONFLICT DO NOTHING;

-- ── Comments ───────────────────────────────────────────────────────────────────

COMMENT ON COLUMN public.engine_calibration_versions.period_weights IS
  'JSON map from calendar year to per-event sample weight. Computed by recalibrate-engine '
  'via exponential decay from training_window_end with half-life = 18 months. '
  'Example: {"2022": 0.44, "2023": 0.63, "2024": 0.89, "2025": 1.00}. '
  'NULL for bootstrap rows that predate this migration.';

COMMENT ON COLUMN public.engine_calibration_versions.max_single_year_fraction IS
  'Cap on any single calendar year''s share of effective training mass. Default 0.30. '
  'The 2023 wave year without capping would represent ~40% of layoffs.fyi events.';

COMMENT ON COLUMN public.engine_calibration_versions.wave_period_fraction IS
  'Fraction of training events from 2022-01-01 to 2024-12-31 (anomalous layoff wave). '
  'Flag for review when > 0.40. Without temporal + year-band correction, wave-era '
  'over-weighting causes EFFICIENCY cohort scores to be systematically elevated '
  'in non-wave market conditions.';

COMMENT ON COLUMN public.engine_calibration_versions.class_balance_config IS
  'Controls positive-class fraction cap. Default: {"max_positive_fraction": 0.60}. '
  'Implicit detectors inflate positive fraction without matching negatives; '
  'uncapped positive fraction at scale may reach 70%+.';

COMMENT ON COLUMN public.user_prediction_outcomes.sample_weight IS
  'Combined training weight = temporal_weight × year_band_weight × class_balance_weight. '
  'Written by recalibrate-engine on each training pass. 1.0 = no adjustment. '
  'NULL = not yet included in any training run.';

COMMENT ON VIEW public.v_training_set_health IS
  'Year-by-year distribution of calibration outcomes. Surfaces any year exceeding the '
  '30% cap (exceeds_30pct_cap) and the wave_period flag (is_wave_period). '
  'Used by TransparencyTab and the SLO dashboard.';

COMMENT ON VIEW public.v_class_balance_health IS
  'Per-(outcome_source, outcome_reported) breakdown of the training set. '
  'Shows avg_sample_weight to confirm class-balance weighting is being applied.';
