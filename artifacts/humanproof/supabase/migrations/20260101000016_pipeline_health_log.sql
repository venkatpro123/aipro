-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: 20260101000016_pipeline_health_log.sql
-- Purpose:   Persistent log of every pipeline run (weekly refresh + breaking-news-scan).
--            Provides structured alerting surface: operator queries this table
--            to detect degraded runs without reading raw Edge Function logs.
--
-- Detection latency:
--   pg_cron fires the Edge Function → function runs → inserts a row here →
--   any monitoring query against this table can detect failure within seconds
--   of the function completing.
--
-- Alert trigger: a run is "degraded" when:
--   null_rate_pct > 50 (more than half of roles returned no live data)
--   OR error_count > 0 (at least one role threw an error)
--   OR duration_ms > 60000 (run took > 60s — likely hitting Serper rate limits)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS pipeline_health_log (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline         TEXT        NOT NULL,   -- 'refresh-market-intelligence' | 'breaking-news-scan'
  run_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_ms      INTEGER,
  total_roles      INTEGER     NOT NULL DEFAULT 0,
  live_count       INTEGER     NOT NULL DEFAULT 0,   -- roles with live Serper data
  null_count       INTEGER     NOT NULL DEFAULT 0,   -- roles where Serper returned null
  error_count      INTEGER     NOT NULL DEFAULT 0,   -- roles that threw an exception
  null_rate_pct    NUMERIC(5,1) GENERATED ALWAYS AS (
    CASE WHEN total_roles > 0 THEN ROUND(100.0 * null_count / total_roles, 1) ELSE 0 END
  ) STORED,
  is_degraded      BOOLEAN GENERATED ALWAYS AS (
    null_count > total_roles / 2 OR error_count > 0
  ) STORED,
  error_details    JSONB,      -- [{role_key, error_message}] for per-role failures
  serper_available BOOLEAN     NOT NULL DEFAULT true,
  triggered_by     TEXT        DEFAULT 'pg_cron',
  notes            TEXT
);

CREATE INDEX IF NOT EXISTS idx_phl_run_at    ON pipeline_health_log (run_at DESC);
CREATE INDEX IF NOT EXISTS idx_phl_degraded  ON pipeline_health_log (is_degraded, run_at DESC)
  WHERE is_degraded = true;
CREATE INDEX IF NOT EXISTS idx_phl_pipeline  ON pipeline_health_log (pipeline, run_at DESC);

ALTER TABLE pipeline_health_log ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read health log (shown in Transparency tab)
CREATE POLICY "read_pipeline_health" ON pipeline_health_log
  FOR SELECT USING (true);

-- Service role (Edge Functions) can insert
CREATE POLICY "service_insert_health" ON pipeline_health_log
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- ── View: last_pipeline_run — easy status check ───────────────────────────
CREATE OR REPLACE VIEW last_pipeline_runs AS
SELECT DISTINCT ON (pipeline)
  pipeline, run_at, duration_ms, total_roles, live_count,
  null_count, error_count, null_rate_pct, is_degraded,
  serper_available, notes
FROM pipeline_health_log
ORDER BY pipeline, run_at DESC;

GRANT SELECT ON last_pipeline_runs TO anon, authenticated;

-- ── get_pipeline_health() — summary for monitoring ───────────────────────
-- Returns the health status of each pipeline for the last 7 days.
-- A degraded run means users may see stale data.
CREATE OR REPLACE FUNCTION get_pipeline_health(days_back INTEGER DEFAULT 7)
RETURNS TABLE(
  pipeline         TEXT,
  last_run_at      TIMESTAMPTZ,
  degraded_runs    BIGINT,
  total_runs       BIGINT,
  degradation_rate NUMERIC
) LANGUAGE sql AS $$
  SELECT
    phl.pipeline,
    MAX(phl.run_at)                                                          AS last_run_at,
    COUNT(*) FILTER (WHERE phl.is_degraded)                                  AS degraded_runs,
    COUNT(*)                                                                 AS total_runs,
    ROUND(
      100.0 * COUNT(*) FILTER (WHERE phl.is_degraded) / NULLIF(COUNT(*), 0),
      1
    )                                                                        AS degradation_rate
  FROM pipeline_health_log phl
  WHERE phl.run_at > NOW() - (days_back || ' days')::INTERVAL
  GROUP BY phl.pipeline;
$$;
