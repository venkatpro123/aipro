-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260619000002_cron_metadata.sql
-- Purpose:   WS13 — cron-job observability + overlap protection.
--
--            pg_cron schedules functions but does not protect against
--            overlapping invocations. A `*/5 * * * *` cron whose
--            function takes 6 minutes will start a second instance
--            while the first is still running. Two scrapes hit the same
--            anti-bot quota; two recalibrations race on
--            engine_calibration_versions; two breaking-news scans
--            duplicate-key collision.
--
--            withCronGuard(jobName, slaMs) wraps a cron-invoked
--            function in:
--              * pg_advisory_xact_lock so a second concurrent
--                invocation aborts immediately
--              * a row in cron_runs recording start/end/status
--              * sla_breach flag if the run exceeds the given budget
--
--            The recalibrate-engine, breaking-news-scan, and other
--            heavyweight crons MUST use this wrapper. Lightweight
--            crons (prune_*) MAY opt in.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── cron_runs telemetry ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cron_runs (
  id              BIGSERIAL    PRIMARY KEY,
  job_name        TEXT         NOT NULL,
  started_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  finished_at    TIMESTAMPTZ,
  status          TEXT         NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'success', 'failed', 'skipped_overlap', 'sla_breach')),
  -- Wall-clock budget for the run. NULL = no SLA.
  sla_ms          INTEGER,
  -- Did the run exceed sla_ms?
  sla_breach      BOOLEAN      NOT NULL DEFAULT FALSE,
  -- Free-text — error message on failure, count of rows processed on success.
  outcome         TEXT,
  -- Convenience for SLO views — computed at finish.
  duration_ms     INTEGER
);

CREATE INDEX IF NOT EXISTS idx_cron_runs_job_started
  ON public.cron_runs (job_name, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_cron_runs_sla_breach
  ON public.cron_runs (started_at DESC)
  WHERE sla_breach = TRUE;

CREATE INDEX IF NOT EXISTS idx_cron_runs_failed
  ON public.cron_runs (started_at DESC)
  WHERE status IN ('failed', 'skipped_overlap');

-- ── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.cron_runs ENABLE ROW LEVEL SECURITY;
-- service_role only.

-- ── The guard wrapper ──────────────────────────────────────────────────────
-- Usage from a pg_cron entry:
--
--   SELECT public.with_cron_guard(
--     'v35_recalibrate_engine',
--     'SELECT public.recalibrate_engine_step()',
--     300000   -- 5 minute SLA
--   );
--
-- Behaviour:
--   1. Acquires pg_try_advisory_xact_lock keyed on hashtext(job_name).
--   2. If lock acquired, records 'running' row in cron_runs.
--   3. EXECUTEs the body. Catches errors; records as 'failed'.
--   4. On success, records 'success' (or 'sla_breach' if exceeded sla_ms).
--   5. If lock NOT acquired, records 'skipped_overlap' and returns.
--
-- Why advisory_xact_lock and not advisory_lock?
--   xact_lock releases automatically at COMMIT / ROLLBACK — no risk of a
--   crashed function leaving a permanent lock that blocks every future cron.
CREATE OR REPLACE FUNCTION public.with_cron_guard(
  p_job_name TEXT,
  p_body     TEXT,
  p_sla_ms   INTEGER DEFAULT NULL
)
RETURNS BIGINT LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_run_id     BIGINT;
  v_lock_id    BIGINT;
  v_acquired   BOOLEAN;
  v_start      TIMESTAMPTZ := clock_timestamp();
  v_duration_ms INTEGER;
  v_breached   BOOLEAN;
BEGIN
  v_lock_id := abs(hashtext(p_job_name));
  v_acquired := pg_try_advisory_xact_lock(v_lock_id);

  IF NOT v_acquired THEN
    INSERT INTO public.cron_runs (job_name, started_at, finished_at, status, outcome, sla_ms)
    VALUES (p_job_name, v_start, NOW(), 'skipped_overlap',
            'previous instance still holding advisory lock', p_sla_ms)
    RETURNING id INTO v_run_id;
    RETURN v_run_id;
  END IF;

  INSERT INTO public.cron_runs (job_name, started_at, sla_ms)
  VALUES (p_job_name, v_start, p_sla_ms)
  RETURNING id INTO v_run_id;

  BEGIN
    EXECUTE p_body;
    v_duration_ms := EXTRACT(EPOCH FROM (clock_timestamp() - v_start))::INTEGER * 1000;
    v_breached := p_sla_ms IS NOT NULL AND v_duration_ms > p_sla_ms;
    UPDATE public.cron_runs
       SET finished_at = NOW(),
           status = CASE WHEN v_breached THEN 'sla_breach' ELSE 'success' END,
           sla_breach = v_breached,
           duration_ms = v_duration_ms
     WHERE id = v_run_id;
  EXCEPTION WHEN OTHERS THEN
    v_duration_ms := EXTRACT(EPOCH FROM (clock_timestamp() - v_start))::INTEGER * 1000;
    UPDATE public.cron_runs
       SET finished_at = NOW(),
           status = 'failed',
           outcome = SQLERRM,
           duration_ms = v_duration_ms
     WHERE id = v_run_id;
    -- Re-raise so pg_cron's own failure tracking still sees it. The
    -- cron_runs row above is the OBSERVABILITY layer; pg_cron remains
    -- the SCHEDULER and should see the error.
    RAISE;
  END;

  RETURN v_run_id;
END;
$$;

-- ── SLO view: per-cron run health ──────────────────────────────────────────
CREATE OR REPLACE VIEW public.slo_cron_health_24h AS
SELECT
  job_name,
  COUNT(*)                                                       AS total_runs,
  COUNT(*) FILTER (WHERE status = 'success')                     AS success_count,
  COUNT(*) FILTER (WHERE status = 'failed')                      AS failed_count,
  COUNT(*) FILTER (WHERE status = 'skipped_overlap')             AS skipped_overlap_count,
  COUNT(*) FILTER (WHERE sla_breach)                             AS sla_breach_count,
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY duration_ms)      AS p50_duration_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms)      AS p95_duration_ms,
  MAX(started_at)                                                AS last_run_at
FROM public.cron_runs
WHERE started_at >= NOW() - INTERVAL '24 hours'
GROUP BY job_name;

-- ── Retention ──────────────────────────────────────────────────────────────
-- 30 days; cron_runs is moderate-volume (one row per cron firing).
CREATE OR REPLACE FUNCTION public.prune_cron_runs()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE n INTEGER;
BEGIN
  DELETE FROM public.cron_runs WHERE started_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

SELECT public._v35_register_cron(
  'v35_prune_cron_runs',
  '20 4 * * *',
  $cmd$SELECT public.prune_cron_runs();$cmd$
);

COMMENT ON FUNCTION public.with_cron_guard IS
  'WS13 — overlap-safe cron wrapper. Acquires pg_try_advisory_xact_lock; '
  'records start/end/status in cron_runs; flags sla_breach when the body '
  'exceeds the given budget. Use for any heavyweight cron (recalibrate, '
  'breaking-news-scan, scrape sweepers) where concurrent invocations could '
  'cause race conditions or quota burn.';

COMMENT ON VIEW public.slo_cron_health_24h IS
  'WS13 — cron health dashboard. Surfaces sla_breach rate, overlap-skips, '
  'and p95 duration per job. Alert when sla_breach_count / total_runs > 0.05 '
  'or skipped_overlap_count > 0.';
