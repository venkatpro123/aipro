-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260622000005_synthetic_score_probes.sql
-- Purpose:   Score-level synthetic probe infrastructure.
--
-- The existing synthetic_probe_results table tracks operational health only
-- (pass/fail/latency for health_endpoint, audit_coalesce, feature_flags).
-- It has no visibility into whether the SCORING MATH itself is drifting.
--
-- This migration adds:
--   1. Score columns on synthetic_probe_results so each scenario probe run
--      records actual_score vs expected range alongside the pass/fail status.
--   2. calibration_drift_events — a permanent record of every time a score
--      probe fires outside its tolerance range or directional bias is detected.
--   3. synthetic_probe_score_drift_30d view — rolling 30-day mean per scenario,
--      used by the directional bias check (mean drift > 3 points = flag).
--
-- Scenario list and expected ranges (seeded from computed fixture inputs):
--   NEUTRAL_BASELINE       expected=49  tolerance=[44,54]
--   FULL_CRISIS            expected=82  tolerance=[77,87]
--   STABLE_POSITION        expected=16  tolerance=[11,21]
--   COMPANY_DISTRESS_ONLY  expected=62  tolerance=[57,67]
--   ROLE_AUTOMATION_HIGH   expected=55  tolerance=[50,60]
--   RECENT_LAYOFF_SURVIVOR expected=72  tolerance=[67,77]
--   PERSONAL_PROTECTION    expected=38  tolerance=[33,43]
--
-- Activation: synthetic-probe EF extended in index.ts to run these 7 scenarios
-- on every 5-minute cron fire. calibration_drift_events are written when a
-- probe scores outside tolerance OR when 30-day directional mean drifts > 3pt.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. Extend synthetic_probe_results with score columns ─────────────────────
-- These are NULL for the three operational probes (health_endpoint,
-- audit_coalesce, feature_flags) and populated for score scenario probes.

ALTER TABLE public.synthetic_probe_results
  ADD COLUMN IF NOT EXISTS scenario_name        TEXT,
  ADD COLUMN IF NOT EXISTS actual_score         SMALLINT
    CHECK (actual_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS expected_score_low   SMALLINT
    CHECK (expected_score_low BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS expected_score_high  SMALLINT
    CHECK (expected_score_high BETWEEN 0 AND 100);

COMMENT ON COLUMN public.synthetic_probe_results.scenario_name IS
  'Score probe scenario identifier (e.g. NEUTRAL_BASELINE). NULL for operational probes.';
COMMENT ON COLUMN public.synthetic_probe_results.actual_score IS
  'Score returned by calculate-hybrid-risk for this scenario. NULL for operational probes.';
COMMENT ON COLUMN public.synthetic_probe_results.expected_score_low IS
  'Lower bound of tolerance range for this scenario. NULL for operational probes.';
COMMENT ON COLUMN public.synthetic_probe_results.expected_score_high IS
  'Upper bound of tolerance range for this scenario. NULL for operational probes.';

-- Index for per-scenario drift queries.
CREATE INDEX IF NOT EXISTS idx_spr_scenario_started
  ON public.synthetic_probe_results (scenario_name, started_at DESC)
  WHERE scenario_name IS NOT NULL;

-- ── 2. calibration_drift_events ───────────────────────────────────────────────
-- Permanent log of scoring anomalies detected by the synthetic probes.
-- Two event kinds:
--   'range_violation'    — a single run scored outside [expected_low, expected_high]
--   'directional_bias'   — 30-day rolling mean drifted > 3 points from expected midpoint
--
-- This table is NOT subject to the 14-day retention applied to
-- synthetic_probe_results. Drift events are kept indefinitely for audit.

CREATE TABLE IF NOT EXISTS public.calibration_drift_events (
  id                  BIGSERIAL     PRIMARY KEY,

  event_kind          TEXT          NOT NULL
    CHECK (event_kind IN ('range_violation', 'directional_bias')),

  scenario_name       TEXT          NOT NULL,

  -- For range_violation: the single-run score that fired outside tolerance.
  -- For directional_bias: the 30-day rolling mean that exceeded the bias threshold.
  actual_score        SMALLINT,

  expected_score_low  SMALLINT      NOT NULL,
  expected_score_high SMALLINT      NOT NULL,

  -- Signed delta: actual − midpoint.  Negative = score lower than expected.
  score_delta         SMALLINT,

  -- For directional_bias events: number of observations in the rolling window.
  window_n            SMALLINT,

  -- Link back to the probe_results row that triggered this (NULL for bias events
  -- which aggregate many rows).
  probe_result_id     BIGINT        REFERENCES public.synthetic_probe_results (id)
                                    ON DELETE SET NULL,

  fired_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  -- Resolution fields — filled in by an engineer after investigation.
  resolved_at         TIMESTAMPTZ,
  resolved_by         TEXT,
  resolution_note     TEXT,

  release_version     TEXT,

  CONSTRAINT cde_score_range CHECK (
    actual_score IS NULL OR (actual_score BETWEEN 0 AND 100)
  )
);

CREATE INDEX IF NOT EXISTS idx_cde_scenario_fired
  ON public.calibration_drift_events (scenario_name, fired_at DESC);

CREATE INDEX IF NOT EXISTS idx_cde_unresolved
  ON public.calibration_drift_events (fired_at DESC)
  WHERE resolved_at IS NULL;

ALTER TABLE public.calibration_drift_events ENABLE ROW LEVEL SECURITY;
-- service_role only — calibration drift events are operational data.

COMMENT ON TABLE public.calibration_drift_events IS
  'Permanent audit log of score probe drift events. Two kinds: range_violation '
  '(single run outside tolerance) and directional_bias (30-day mean > 3pt from '
  'expected midpoint). Events are kept indefinitely — not subject to 14-day retention. '
  'Resolve events by filling resolved_at/resolved_by/resolution_note.';

-- ── 3. synthetic_probe_scenarios — expected ranges for reference ──────────────
-- Read-only lookup table so the drift view and external tooling can join on it
-- without hardcoding ranges.  The EF also embeds these in its fixture constants,
-- but this row-per-scenario record makes queries self-describing.

CREATE TABLE IF NOT EXISTS public.synthetic_probe_scenarios (
  scenario_name       TEXT          PRIMARY KEY,
  description         TEXT          NOT NULL,
  expected_score      SMALLINT      NOT NULL,
  tolerance_low       SMALLINT      NOT NULL,
  tolerance_high      SMALLINT      NOT NULL,
  -- Directional bias threshold: if 30-day mean drifts beyond this many points
  -- from expected_score in either direction, a directional_bias event fires.
  bias_threshold_pts  SMALLINT      NOT NULL DEFAULT 3,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

INSERT INTO public.synthetic_probe_scenarios
  (scenario_name, description, expected_score, tolerance_low, tolerance_high)
VALUES
  ('NEUTRAL_BASELINE',       'All signals at 0.45–0.55, 3-year tenure, average performer.',       49, 44, 54),
  ('FULL_CRISIS',            'Near-maximum distress: live layoff confirmed, high automation, heavy financial stress.', 82, 77, 87),
  ('STABLE_POSITION',        'Healthy growing company, minimal layoffs, unique top-performer with 8yr tenure.', 16, 11, 21),
  ('COMPANY_DISTRESS_ONLY',  'Distressed company (no kill-switch), average employee with no personal protection.', 62, 57, 67),
  ('ROLE_AUTOMATION_HIGH',   'Moderate company risk plus very high automation exposure (L3≈0.93).',  55, 50, 60),
  ('RECENT_LAYOFF_SURVIVOR', 'Live layoff just fired; distressed company; employee survived round.',  72, 67, 77),
  ('PERSONAL_PROTECTION',    'Distressed company but 12yr+ tenure, unique role, top performer, recent promo.', 38, 33, 43)
ON CONFLICT (scenario_name) DO UPDATE
  SET description     = EXCLUDED.description,
      expected_score  = EXCLUDED.expected_score,
      tolerance_low   = EXCLUDED.tolerance_low,
      tolerance_high  = EXCLUDED.tolerance_high;

COMMENT ON TABLE public.synthetic_probe_scenarios IS
  'Reference rows for the 7 synthetic score probe scenarios. Expected ranges are '
  'derived from verified fixture inputs in scoreProbeScenarios.ts. '
  'Update both here AND in the EF constants when expected scores change.';

-- ── 4. 30-day rolling drift view ──────────────────────────────────────────────
-- Used by the drift-check probe to detect directional bias:
--   a scenario whose 30-day mean deviates > bias_threshold_pts from expected
--   indicates systematic bias (e.g. a formula weight change shifted all scores
--   upward/downward without a compensating recalibration).

CREATE OR REPLACE VIEW public.synthetic_probe_score_drift_30d AS
SELECT
  r.scenario_name,
  s.expected_score,
  s.tolerance_low,
  s.tolerance_high,
  s.bias_threshold_pts,
  COUNT(*)                                               AS n,
  ROUND(AVG(r.actual_score), 2)                         AS mean_actual_score,
  ROUND(AVG(r.actual_score) - s.expected_score, 2)      AS mean_delta,
  MIN(r.actual_score)                                    AS min_score,
  MAX(r.actual_score)                                    AS max_score,
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY r.actual_score) AS p50_score,
  COUNT(*) FILTER (WHERE r.actual_score < s.tolerance_low
                      OR r.actual_score > s.tolerance_high) AS out_of_range_count,
  -- True when 30-day mean drifts beyond bias_threshold_pts in either direction.
  ABS(AVG(r.actual_score) - s.expected_score) > s.bias_threshold_pts
                                                         AS has_directional_bias,
  MIN(r.started_at)                                      AS window_start,
  MAX(r.started_at)                                      AS window_end
FROM public.synthetic_probe_results  r
JOIN public.synthetic_probe_scenarios s USING (scenario_name)
WHERE r.started_at  >= NOW() - INTERVAL '30 days'
  AND r.actual_score IS NOT NULL
GROUP BY r.scenario_name, s.expected_score, s.tolerance_low,
         s.tolerance_high, s.bias_threshold_pts;

COMMENT ON VIEW public.synthetic_probe_score_drift_30d IS
  'Rolling 30-day aggregate per scenario. has_directional_bias=true means the '
  '30-day mean has shifted by more than bias_threshold_pts from the expected '
  'midpoint — a sign of systematic formula drift, not noise.';
