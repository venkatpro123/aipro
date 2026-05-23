-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260523000001_scrape_jobs_source_slo.sql
--
-- Purpose: differentiate user-triggered from cron-triggered scrape jobs so the
-- queue scheduler and monitoring tools can distinguish urgency classes.
--
-- Changes:
--   1. source TEXT column — origin of the scrape request:
--        'user_triggered'       — fired by an audit session (user is waiting)
--        'cron_refresh'         — background pg_cron poll (no user waiting)
--        'background_enrichment'— admin / ops-triggered data improvement job
--
--      Priority mapping (enforced by application layer + column default):
--        user_triggered         → BullMQ priority=1  (queue-jump, fast retry)
--        background_enrichment  → BullMQ priority=5  (interleaved)
--        cron_refresh           → BullMQ default     (FIFO background)
--
--   2. queue_time_ms GENERATED ALWAYS AS — wall-clock ms between enqueued_at and
--      started_at. NULL until a worker stamps started_at. Powers the SLO view
--      and the DataFreshnessPanel "queue is busy" warning.
--
--   3. Priority-ordered processing index — optimised for the query pattern:
--        SELECT ... FROM scrape_jobs WHERE status='queued'
--        ORDER BY priority_rank ASC, enqueued_at ASC
--      (priority_rank derived from source column; lower = more urgent)
--
--   4. SLO monitoring view v_scrape_job_slo — p50/p95 queue time per source
--      over the last 24 hours, plus violation counts (> 2 s SLO for
--      user_triggered, > 30 s for cron_refresh).
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. source column ─────────────────────────────────────────────────────────
ALTER TABLE public.scrape_jobs
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'cron_refresh'
    CHECK (source IN ('user_triggered', 'cron_refresh', 'background_enrichment'));

-- Backfill existing rows: audit_blocking priority → user_triggered.
UPDATE public.scrape_jobs
   SET source = 'user_triggered'
 WHERE priority = 'audit_blocking'
   AND source = 'cron_refresh';

-- ── 2. queue_time_ms GENERATED column ────────────────────────────────────────
-- Returns ms between enqueue and worker pickup. NULL while status='queued'
-- (started_at not yet set). The trigger in 20260617000001 guarantees started_at
-- is stamped automatically on the queued→running transition, so this is always
-- populated once the job starts.
ALTER TABLE public.scrape_jobs
  ADD COLUMN IF NOT EXISTS queue_time_ms BIGINT
    GENERATED ALWAYS AS (
      (EXTRACT(EPOCH FROM (started_at - enqueued_at)) * 1000)::BIGINT
    ) STORED;

-- ── 3. Priority-ordered processing index ─────────────────────────────────────
-- Supports ORDER BY source_priority_rank, enqueued_at ASC for any DB-level
-- consumer that polls scrape_jobs directly (scrape-job-sweeper, ad-hoc queries).
-- Maps source → numeric rank so user_triggered rows sort first.
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_source_priority_queued
  ON public.scrape_jobs (
    -- Inline CASE gives the index a stable sort key without a generated column.
    (CASE source
       WHEN 'user_triggered'        THEN 1
       WHEN 'background_enrichment' THEN 5
       ELSE                              10   -- cron_refresh
     END),
    enqueued_at ASC
  )
  WHERE status = 'queued';

-- ── 4. SLO monitoring view ────────────────────────────────────────────────────
-- Per-source p50/p95 queue latency + SLO violation counts (last 24 h).
-- SLO targets:
--   user_triggered        ≤ 2 000 ms  (user is actively waiting)
--   background_enrichment ≤ 15 000 ms
--   cron_refresh          ≤ 30 000 ms
CREATE OR REPLACE VIEW public.v_scrape_job_slo AS
WITH recent AS (
  SELECT
    source,
    queue_time_ms,
    CASE source
      WHEN 'user_triggered'        THEN 2_000
      WHEN 'background_enrichment' THEN 15_000
      ELSE                              30_000
    END AS slo_threshold_ms
  FROM public.scrape_jobs
  WHERE started_at IS NOT NULL
    AND enqueued_at >= NOW() - INTERVAL '24 hours'
)
SELECT
  source,
  COUNT(*)                                                                       AS n,
  PERCENTILE_CONT(0.5)  WITHIN GROUP (ORDER BY queue_time_ms)::BIGINT           AS p50_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY queue_time_ms)::BIGINT           AS p95_ms,
  MAX(queue_time_ms)                                                             AS max_ms,
  COUNT(*) FILTER (WHERE queue_time_ms > slo_threshold_ms)                      AS slo_violations,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE queue_time_ms > slo_threshold_ms) / COUNT(*),
    1
  )                                                                              AS slo_violation_pct,
  slo_threshold_ms
FROM recent
GROUP BY source, slo_threshold_ms
ORDER BY source;

-- ── Comments ──────────────────────────────────────────────────────────────────
COMMENT ON COLUMN public.scrape_jobs.source IS
  'Origin of the scrape request. user_triggered = audit session (user waiting, '
  'BullMQ priority=1). background_enrichment = ops/admin (priority=5). '
  'cron_refresh = pg_cron background poll (FIFO, default priority).';

COMMENT ON COLUMN public.scrape_jobs.queue_time_ms IS
  'Wall-clock ms between enqueued_at and started_at (when worker picked up the '
  'job). NULL while status=queued. Powered by GENERATED ALWAYS AS. '
  'SLO: user_triggered ≤ 2 000 ms.';

COMMENT ON VIEW public.v_scrape_job_slo IS
  'Per-source p50/p95/max queue latency + SLO violation counts for the last '
  '24 hours. Refresh: real-time (reads live scrape_jobs rows).';
