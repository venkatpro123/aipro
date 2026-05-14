-- ─────────────────────────────────────────────────────────────────────────────
-- Audit-Blocking Priority + Progress Tracking
-- Adds:
--   * `priority` column to distinguish user-triggered audit-blocking jobs from
--     scheduled background polls. audit_blocking jobs jump the queue, get faster
--     retries, and feed the awaitLiveQuorum poller on the frontend.
--   * `started_at` column so workers can emit `running` progress events that the
--     orchestrator can observe in real time (before the job finishes).
--
-- This migration also extends the index strategy so quorum polling (by priority
-- + status + enqueued_at) is index-served — critical because the audit pipeline
-- polls scrape_jobs every 400-600ms while waiting for live quorum.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.scrape_jobs
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS priority   TEXT NOT NULL DEFAULT 'background'
    CHECK (priority IN ('background', 'audit_blocking'));

-- Quorum-poll index — used by awaitLiveQuorum to count jobs by company + status
-- restricted to recently-enqueued audit_blocking jobs.
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_priority_status
  ON public.scrape_jobs (priority, status, enqueued_at DESC);

-- Progress-poll index — used by the per-company stage UI to see which job types
-- have reached `running` vs terminal state for the current audit.
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_company_priority
  ON public.scrape_jobs (company_name, priority, enqueued_at DESC);

COMMENT ON COLUMN public.scrape_jobs.priority IS
  'background = cron-driven poll. audit_blocking = user-triggered, queue-priority, fast retry.';
COMMENT ON COLUMN public.scrape_jobs.started_at IS
  'Set by worker on pickup. Lets the audit orchestrator distinguish queued from in-progress jobs.';
