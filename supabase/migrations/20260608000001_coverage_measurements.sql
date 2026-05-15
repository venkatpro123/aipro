-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260608000001_coverage_measurements.sql
-- Purpose:   WS4 — Empirical coverage measurements for conformal CIs.
--
--            The conformalCI module declares a NOMINAL coverage (typically
--            0.50 / 0.80 / 0.90) per interval. WS4 acceptance requires
--            measuring whether the actual coverage matches the nominal —
--            i.e. do our "90% credible intervals" actually contain the
--            true outcome 90% of the time on held-out data?
--
--            This table stores the weekly measurement. Each row captures:
--              * cohort_scope (GLOBAL, INDIA_IT, etc.)
--              * nominal_coverage (0.50/0.80/0.90)
--              * empirical_coverage (the actual rate measured)
--              * sample_size used for the measurement
--              * confidence_interval on the measurement itself
--
--            The CalibrationPanel reads from this table to surface the
--            "your 90% CI contained outcome X% of the time last 60 days"
--            transparency note. The conformalCI loader also consumes the
--            most recent row per (scope, nominal) to populate
--            ConformalInterval.empiricalCoverage at audit time.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.coverage_measurements (
  id                    BIGSERIAL    PRIMARY KEY,

  -- Identity
  cohort_scope          TEXT         NOT NULL,
  nominal_coverage      NUMERIC(4,3) NOT NULL CHECK (nominal_coverage > 0 AND nominal_coverage < 1),

  -- Measurement
  empirical_coverage    NUMERIC(4,3) NOT NULL CHECK (empirical_coverage BETWEEN 0 AND 1),
  /** 95% confidence interval on the empirical coverage estimate itself
   *  (Wilson score interval). Wider CI = less reliable measurement. */
  coverage_ci_low       NUMERIC(4,3),
  coverage_ci_high      NUMERIC(4,3),
  /** Number of held-out points used for the measurement. */
  sample_size           INTEGER      NOT NULL CHECK (sample_size >= 0),
  /** Calibration set size used to compute q_alpha (the threshold). */
  calibration_size      INTEGER      NOT NULL CHECK (calibration_size >= 0),

  -- Drift indicator
  /** Difference from nominal. Positive = over-covering (intervals too wide);
   *  negative = under-covering (intervals too narrow, model over-confident). */
  delta_from_nominal    NUMERIC(5,3) GENERATED ALWAYS AS (empirical_coverage - nominal_coverage) STORED,
  /** True when |delta_from_nominal| > 0.10. Triggers an alert in CalibrationPanel. */
  is_misaligned         BOOLEAN      GENERATED ALWAYS AS (ABS(empirical_coverage - nominal_coverage) > 0.10) STORED,

  -- Provenance
  measurement_window_start DATE         NOT NULL,
  measurement_window_end   DATE         NOT NULL,
  cron_run_id              UUID,        -- ties measurement to a recalibrate-engine run
  measured_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cm_scope_nominal_recent
  ON public.coverage_measurements (cohort_scope, nominal_coverage, measured_at DESC);

CREATE INDEX IF NOT EXISTS idx_cm_misaligned
  ON public.coverage_measurements (measured_at DESC)
  WHERE is_misaligned = TRUE;

-- ── RLS ────────────────────────────────────────────────────────────────────────
ALTER TABLE public.coverage_measurements ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read (transparency UI surfaces the latest measurements).
CREATE POLICY "cm_read_all"
  ON public.coverage_measurements FOR SELECT
  TO authenticated, anon
  USING (true);

-- service_role writes only.

-- ── Latest-per-scope view ──────────────────────────────────────────────────────
-- The conformalCI loader hits this view to get the most recent measurement
-- per (scope, nominal) tuple — used to populate
-- ConformalInterval.empiricalCoverage at audit time.
CREATE OR REPLACE VIEW public.coverage_measurements_latest AS
SELECT DISTINCT ON (cohort_scope, nominal_coverage)
  cohort_scope,
  nominal_coverage,
  empirical_coverage,
  coverage_ci_low,
  coverage_ci_high,
  sample_size,
  delta_from_nominal,
  is_misaligned,
  measurement_window_start,
  measurement_window_end,
  measured_at
FROM public.coverage_measurements
ORDER BY cohort_scope, nominal_coverage, measured_at DESC;

COMMENT ON TABLE public.coverage_measurements IS
  'WS4 — Weekly empirical coverage measurements for conformal CIs. Each row '
  'records the rate at which the nominal-X% interval actually contained the '
  'outcome on held-out data. delta_from_nominal > 0.10 (in absolute value) is '
  'an alert condition surfaced in CalibrationPanel.';

COMMENT ON VIEW public.coverage_measurements_latest IS
  'WS4 — Most recent measurement per (scope, nominal). Read by conformalCI '
  'at audit time to populate ConformalInterval.empiricalCoverage.';
