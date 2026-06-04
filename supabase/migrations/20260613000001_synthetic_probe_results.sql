-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260613000001_synthetic_probe_results.sql
-- Purpose:   gap #20 — synthetic audit monitoring.
--
--            A cron runs every 5 minutes against a fixed test fingerprint,
--            timing the end-to-end audit pipeline and verifying the
--            response has the expected shape. Failures here surface
--            silent breakage BEFORE a user reports it.
--
--            Stored as time-series so the dashboard can chart the
--            synthetic latency curve alongside the user-facing latency
--            SLO — divergence indicates a real-user-specific issue.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.synthetic_probe_results (
  id              BIGSERIAL    PRIMARY KEY,
  probe_name      TEXT         NOT NULL,            -- 'audit_end_to_end' | 'health_endpoint' | 'feature_flags'
  status          TEXT         NOT NULL
    CHECK (status IN ('pass', 'fail', 'degraded', 'timeout')),
  duration_ms     INTEGER      NOT NULL,
  /** Diagnostic detail: the structured response body for failures, or
   *  null for passes. Capped at 4KB on insert.  */
  detail          JSONB,
  /** ISO timestamp of when the probe started. */
  started_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  /** Stamped onto every row so the synthetic curve can be compared
   *  against the post-deploy window. */
  release_version TEXT
);

CREATE INDEX IF NOT EXISTS idx_synthetic_probe_recent
  ON public.synthetic_probe_results (probe_name, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_synthetic_probe_failures
  ON public.synthetic_probe_results (started_at DESC)
  WHERE status != 'pass';

-- ── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.synthetic_probe_results ENABLE ROW LEVEL SECURITY;
-- service_role only (probe results are operational data).

-- ── Aggregated view ────────────────────────────────────────────────────────
-- Hourly summary suitable for an SLO dashboard widget.
CREATE OR REPLACE VIEW public.synthetic_probe_hourly AS
SELECT
  date_trunc('hour', started_at)                                AS bucket,
  probe_name,
  COUNT(*)                                                      AS n,
  COUNT(*) FILTER (WHERE status = 'pass')                       AS pass_count,
  COUNT(*) FILTER (WHERE status != 'pass')                      AS fail_count,
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY duration_ms)     AS p50_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms)     AS p95_ms,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'pass') / COUNT(*), 2) AS pass_rate_pct
FROM public.synthetic_probe_results
WHERE started_at >= NOW() - INTERVAL '24 hours'
GROUP BY bucket, probe_name;

-- ── Retention: drop probe results older than 14 days ──────────────────────
-- Wrap in the existing cron registration helper.
CREATE OR REPLACE FUNCTION public.prune_synthetic_probe_results()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE n INTEGER;
BEGIN
  DELETE FROM public.synthetic_probe_results
   WHERE started_at < NOW() - INTERVAL '14 days';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

SELECT public._v35_register_cron(
  'v35_prune_synthetic_probe_results',
  '15 5 * * *',
  $cmd$SELECT public.prune_synthetic_probe_results();$cmd$
);

COMMENT ON TABLE public.synthetic_probe_results IS
  'gap #20 — synthetic monitoring time series. Probes run every 5 min '
  'and write one row each. Compare against pipeline_runs to detect '
  'silent breakage that affects real users but not synthetic probes '
  '(or vice versa). 14-day retention.';
