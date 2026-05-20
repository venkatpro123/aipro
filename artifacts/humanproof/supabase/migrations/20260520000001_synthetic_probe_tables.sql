-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: 20260520000001_synthetic_probe_tables.sql
-- Purpose:   Persistent storage for the synthetic-probe edge function.
--
-- WHY THIS EXISTS
-- ───────────────
-- Synthetic probes are the only way to detect scoring regressions before
-- users notice inaccurate predictions. Three tables are needed:
--
--   synthetic_probe_runs   — audit trail of every probe scenario result
--   synthetic_probe_alerts — active alerts from probe failures
--   calibration_drift_events — CI drift records when systematic deviation
--                              across multiple probes indicates formula drift
--
-- USAGE PATTERN
-- ─────────────
-- The synthetic-probe edge function (runs daily at 02:00 UTC) writes to all
-- three tables in every run. Operators query:
--
--   SELECT * FROM synthetic_probe_alerts WHERE resolved_at IS NULL
--     ORDER BY created_at DESC;
--
--   SELECT * FROM calibration_drift_events WHERE recalibration_recommended
--     ORDER BY created_at DESC;
--
--   SELECT scenario_id, AVG(deviation) AS avg_dev, COUNT(*) AS runs
--   FROM synthetic_probe_runs
--   WHERE run_at > NOW() - INTERVAL '7 days'
--   GROUP BY scenario_id ORDER BY avg_dev DESC;
-- ═══════════════════════════════════════════════════════════════════════════

-- ── synthetic_probe_runs ──────────────────────────────────────────────────────
-- One row per scenario per run. Written by the probe on every execution.
-- Provides trend data: if a scenario that passed last week starts failing,
-- the deviation trend is visible before the alert fires.

CREATE TABLE IF NOT EXISTS synthetic_probe_runs (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id               TEXT        NOT NULL,   -- UUID grouping all scenarios from one cron run
  run_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scenario_id          TEXT        NOT NULL,   -- e.g. 'FULL_CRISIS', 'NEUTRAL_BASELINE'
  expected_score_min   SMALLINT    NOT NULL,
  expected_score_max   SMALLINT    NOT NULL,
  expected_midpoint    SMALLINT    NOT NULL,
  actual_score         SMALLINT,               -- NULL on scoring error
  -- deviation: abs(actual - midpoint). NULL on error.
  deviation            NUMERIC(5,2),
  -- signed_deviation: actual - midpoint. Positive = scored higher than expected.
  -- Used by drift detector to identify systematic bias direction.
  signed_deviation     NUMERIC(5,2),
  passed               BOOLEAN     NOT NULL,
  alert_level          TEXT        NOT NULL DEFAULT 'none'
    CHECK (alert_level IN ('none', 'warning', 'critical')),
  drift_check_triggered BOOLEAN    NOT NULL DEFAULT false,
  error_message        TEXT,                   -- Non-null when scoring call failed
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS spr_run_id_idx    ON synthetic_probe_runs (run_id);
CREATE INDEX IF NOT EXISTS spr_scenario_idx  ON synthetic_probe_runs (scenario_id, run_at DESC);
CREATE INDEX IF NOT EXISTS spr_alert_idx     ON synthetic_probe_runs (alert_level, run_at DESC)
  WHERE alert_level != 'none';

-- ── synthetic_probe_alerts ────────────────────────────────────────────────────
-- Active alerts written when a probe scenario deviates > 5 pts from midpoint.
-- Resolved manually by an operator after investigating the root cause.
-- alert_type:
--   score_deviation — probe returned a score outside the expected range
--   scoring_error   — the calculate-hybrid-risk EF returned an error or timed out
-- severity:
--   warning  — deviation > 5 pts  (5 < deviation ≤ 10)
--   critical — deviation > 10 pts (run CI drift check immediately)

CREATE TABLE IF NOT EXISTS synthetic_probe_alerts (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  run_id         TEXT        NOT NULL,
  scenario_id    TEXT        NOT NULL,
  expected_range TEXT        NOT NULL,  -- human-readable e.g. '77–87'
  actual_score   SMALLINT,
  deviation      NUMERIC(5,2),
  alert_type     TEXT        NOT NULL
    CHECK (alert_type IN ('score_deviation', 'scoring_error')),
  severity       TEXT        NOT NULL
    CHECK (severity IN ('warning', 'critical')),
  -- Resolution fields — operator fills in after investigating
  resolved_at    TIMESTAMPTZ,
  resolved_by    TEXT,
  resolution_notes TEXT
);

CREATE INDEX IF NOT EXISTS spa_unresolved_idx ON synthetic_probe_alerts (created_at DESC)
  WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS spa_scenario_idx   ON synthetic_probe_alerts (scenario_id, created_at DESC);

-- ── calibration_drift_events ──────────────────────────────────────────────────
-- Written when the CI drift check detects that >3 probes systematically deviate
-- in the same direction (indicating formula or calibration drift, not noise).
--
-- directional_mean_pts: mean of signed deviations across all probes.
--   Positive = scoring higher than expected (formula is inflating risk scores).
--   Negative = scoring lower than expected (formula is deflating risk scores).
--
-- severity:
--   mild        — directionalMean between 3–6 pts, check calibration age
--   significant — directionalMean > 6 pts, recalibration recommended immediately

CREATE TABLE IF NOT EXISTS calibration_drift_events (
  id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  run_id                      TEXT        NOT NULL,
  drift_direction             TEXT        NOT NULL
    CHECK (drift_direction IN ('upward', 'downward', 'none')),
  directional_mean_pts        NUMERIC(6,3) NOT NULL,  -- signed, ±20 typical range
  probe_count                 SMALLINT    NOT NULL,   -- total probes that returned scores
  consistent_direction_count  SMALLINT    NOT NULL,   -- probes deviating in same direction
  calibration_age_days        INTEGER,                -- NULL if could not be determined
  recalibration_recommended   BOOLEAN     NOT NULL DEFAULT false,
  severity                    TEXT        NOT NULL
    CHECK (severity IN ('none', 'mild', 'significant')),
  -- Operator acknowledgement
  acknowledged_at             TIMESTAMPTZ,
  acknowledged_by             TEXT,
  action_taken                TEXT
);

CREATE INDEX IF NOT EXISTS cde_unack_idx ON calibration_drift_events (created_at DESC)
  WHERE acknowledged_at IS NULL AND recalibration_recommended = true;

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- These tables are internal infrastructure — no user-facing reads.
-- Only service_role (edge functions + cron) may write or read.

ALTER TABLE synthetic_probe_runs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE synthetic_probe_alerts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE calibration_drift_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "spr_service_only"
  ON synthetic_probe_runs FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "spa_service_only"
  ON synthetic_probe_alerts FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "cde_service_only"
  ON calibration_drift_events FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ── Operator views ────────────────────────────────────────────────────────────
-- Convenience views for the monitoring dashboard (no user-facing access).

CREATE OR REPLACE VIEW v_probe_scenario_trend AS
SELECT
  scenario_id,
  COUNT(*)                                                    AS total_runs,
  COUNT(*) FILTER (WHERE passed)                              AS passed_runs,
  ROUND(AVG(deviation)::NUMERIC, 2)                          AS avg_deviation,
  ROUND(MAX(deviation)::NUMERIC, 2)                          AS max_deviation,
  ROUND(AVG(signed_deviation)::NUMERIC, 2)                   AS avg_signed_deviation,
  COUNT(*) FILTER (WHERE alert_level != 'none')               AS alert_count,
  MAX(run_at)                                                 AS last_run_at
FROM synthetic_probe_runs
GROUP BY scenario_id
ORDER BY avg_deviation DESC;

CREATE OR REPLACE VIEW v_active_probe_alerts AS
SELECT
  a.scenario_id,
  a.expected_range,
  a.actual_score,
  a.deviation,
  a.severity,
  a.alert_type,
  a.created_at,
  a.run_id
FROM synthetic_probe_alerts a
WHERE a.resolved_at IS NULL
ORDER BY
  CASE a.severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 END,
  a.created_at DESC;

-- ── pg_cron: synthetic-probe daily at 02:00 UTC ───────────────────────────────
-- Runs AFTER the breaking-news-scan (every 2h) so any yesterday news is
-- already in company_intelligence before the probe fires.

DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('synthetic-probe-daily')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'synthetic-probe-daily');

    PERFORM cron.schedule(
      'synthetic-probe-daily',
      '0 2 * * *',
      $job$SELECT net.http_post(
        url     := current_setting('app.supabase_url') || '/functions/v1/synthetic-probe',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
          'Content-Type',  'application/json'
        ),
        body    := '{}'::jsonb
      )$job$
    );
    RAISE NOTICE 'synthetic-probe-daily scheduled at 02:00 UTC every day.';
  ELSE
    RAISE NOTICE 'pg_cron not enabled — synthetic-probe-daily not scheduled.';
  END IF;
END
$do$;
