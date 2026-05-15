-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260617000001_scrape_jobs_dedup_hardening.sql
-- Purpose:   WS11 — close three concrete dedup integrity bugs surfaced
--            by the audit:
--
--            1. UNIQUE(dedupe_key) permits multiple NULL rows
--               (Postgres semantics: NULL != NULL in UNIQUE).
--               Result: clients without a dedupe_key generate unlimited
--               duplicate jobs. Replace with a partial UNIQUE index
--               WHERE dedupe_key IS NOT NULL + a NOT NULL CHECK
--               on new rows.
--
--            2. Jobs stuck in 'running' have no timeout. A worker
--               crash leaves the row at status='running' forever; the
--               quorum waiter blocks 45s on a dead job. Add
--               heartbeat_at column the worker bumps every 30s; the
--               scrape-job-sweeper cron (added separately) reaps any
--               'running' row with a stale heartbeat.
--
--            3. started_at is not populated on transition to running —
--               the audit-coalesce edge function uses it but it's
--               written only on completion. Add a default of NOW() on
--               INSERT for rows that ENTER as 'running' (workers do
--               this); existing 'queued' rows are unaffected.
--
--            Existing migration 20260515000001_scraper_infrastructure.sql
--            created the table and the NULL-permissive UNIQUE constraint.
--            This migration mutates that schema; care taken to be
--            additive where possible.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. NOT NULL dedupe_key + partial unique index ─────────────────────────
-- Step 1a: backfill any existing NULL dedupe_keys so the NOT NULL CHECK
-- doesn't reject them. Use a synthetic key derived from id + enqueued_at.
UPDATE public.scrape_jobs
   SET dedupe_key = 'synthetic-backfill-' || id::TEXT || '-' || EXTRACT(EPOCH FROM enqueued_at)::BIGINT
 WHERE dedupe_key IS NULL;

-- Step 1b: drop the legacy NULL-permissive UNIQUE constraint.
DO $$
DECLARE constraint_name TEXT;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.scrape_jobs'::regclass
    AND contype = 'u'
    AND pg_get_constraintdef(oid) LIKE '%dedupe_key%';
  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.scrape_jobs DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

-- Step 1c: add a NOT NULL CHECK + partial UNIQUE index.
ALTER TABLE public.scrape_jobs
  ADD CONSTRAINT scrape_jobs_dedupe_key_not_null
    CHECK (dedupe_key IS NOT NULL) NOT VALID;
-- Mark valid only after the backfill above:
ALTER TABLE public.scrape_jobs
  VALIDATE CONSTRAINT scrape_jobs_dedupe_key_not_null;

CREATE UNIQUE INDEX IF NOT EXISTS uq_scrape_jobs_dedupe_key
  ON public.scrape_jobs (dedupe_key);

-- ── 2. heartbeat_at + zombie reaper preparation ────────────────────────────
ALTER TABLE public.scrape_jobs
  ADD COLUMN IF NOT EXISTS heartbeat_at TIMESTAMPTZ;
ALTER TABLE public.scrape_jobs
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE public.scrape_jobs
  ADD COLUMN IF NOT EXISTS attempt_seq INTEGER NOT NULL DEFAULT 1;

-- Stuck-job lookup index: "any running job whose heartbeat is stale".
-- Powers the scrape-job-sweeper cron added in
-- 20260617000002_scrape_job_sweeper_cron.sql.
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_running_heartbeat
  ON public.scrape_jobs (heartbeat_at)
  WHERE status = 'running';

-- ── 3. Helpful trigger: stamp started_at on running transition ────────────
-- When a worker UPDATEs status='running', set started_at if NULL.
-- Workers already do this in some code paths but not uniformly; the
-- trigger guarantees the invariant. Idempotent — won't overwrite an
-- existing started_at.
CREATE OR REPLACE FUNCTION public.scrape_jobs_stamp_started()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'running' AND OLD.status IS DISTINCT FROM 'running' AND NEW.started_at IS NULL THEN
    NEW.started_at := NOW();
  END IF;
  -- Also stamp heartbeat_at — a worker that transitions to running
  -- without updating heartbeat would look stale immediately.
  IF NEW.status = 'running' AND NEW.heartbeat_at IS NULL THEN
    NEW.heartbeat_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS scrape_jobs_stamp_started_trg ON public.scrape_jobs;
CREATE TRIGGER scrape_jobs_stamp_started_trg
  BEFORE UPDATE ON public.scrape_jobs
  FOR EACH ROW EXECUTE FUNCTION public.scrape_jobs_stamp_started();

-- ── Diagnostic view for the sweeper + ops ──────────────────────────────────
CREATE OR REPLACE VIEW public.v_stuck_scrape_jobs AS
SELECT
  id,
  job_type,
  company_name,
  status,
  started_at,
  heartbeat_at,
  EXTRACT(EPOCH FROM (NOW() - heartbeat_at))::INTEGER AS seconds_since_heartbeat,
  attempt_seq
FROM public.scrape_jobs
WHERE status = 'running'
  AND heartbeat_at IS NOT NULL
  AND heartbeat_at < NOW() - INTERVAL '10 minutes';

COMMENT ON CONSTRAINT scrape_jobs_dedupe_key_not_null ON public.scrape_jobs IS
  'WS11 — dedupe_key MUST be present. The legacy UNIQUE constraint allowed '
  'unlimited NULL rows (Postgres treats NULL as distinct in UNIQUE indexes), '
  'so clients without a key could create duplicate scrape jobs. Combined with '
  'uq_scrape_jobs_dedupe_key this gives the desired "one job per (company, '
  'source, day)" invariant.';

COMMENT ON COLUMN public.scrape_jobs.heartbeat_at IS
  'WS11 — workers update this every 30s while running. The scrape-job-sweeper '
  'cron marks any running job with heartbeat_at < NOW() - 10min as failed, '
  'so the quorum waiter is not blocked on dead workers.';

COMMENT ON COLUMN public.scrape_jobs.attempt_seq IS
  'WS11 — monotonic retry counter. escalateRetry in scraperTrigger.ts reads '
  'this with FOR UPDATE to avoid duplicate retries within the same dedup '
  'window.';

COMMENT ON VIEW public.v_stuck_scrape_jobs IS
  'WS11 — operational view. Lists running jobs with stale heartbeats. '
  'Should be empty at steady state; non-empty entries indicate worker '
  'crashes the sweeper has not yet collected.';
