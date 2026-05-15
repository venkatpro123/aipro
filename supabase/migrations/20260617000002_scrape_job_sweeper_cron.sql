-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260617000002_scrape_job_sweeper_cron.sql
-- Purpose:   WS11 — schedule the scrape-job-sweeper edge function.
--
--            Runs every minute. The function reaps any scrape_jobs row
--            in status='running' whose heartbeat_at is older than 10
--            minutes (20× the worker heartbeat cadence — generous
--            margin to avoid false-positive reaps).
--
--            The cron invokes the edge function via http (Supabase's
--            standard pg_cron→edge pattern). No advisory lock needed
--            because the UPDATE on scrape_jobs is atomic per row.
-- ═══════════════════════════════════════════════════════════════════════════════

-- The sweeper is server-side; invoke via pg_net (or the Supabase
-- http extension). We use the same pattern as the other v35 cron
-- functions — defer the call shape to the registered cron helper.
SELECT public._v35_register_cron(
  'v35_scrape_job_sweeper',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_functions_url', true) || '/scrape-job-sweeper',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_jwt', true),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

COMMENT ON EXTENSION pg_cron IS
  'WS11 — v35_scrape_job_sweeper runs every minute to reap stuck '
  'scrape_jobs.status=running rows whose heartbeat is stale (>10min). '
  'Without this, a worker crash leaves jobs stuck forever and quorum '
  'gates wait their full 45s ceiling on dead workers.';
