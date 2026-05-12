-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260514000001_ingest_cron_schedules.sql
-- Purpose:   Audit fix C-1 — ingest-careers and ingest-github had no pg_cron
--            schedule. The migrations that created their tables
--            (20260512000002/20260512000003) never added bridge functions or
--            cron.schedule() calls. Two complete signal channels (hiring-freeze
--            + engineering deceleration) were producing zero data.
--
--   1. Bridge function: ingest_careers_daily()  → ingest-careers Edge Function
--   2. Bridge function: ingest_github_weekly()  → ingest-github  Edge Function
--   3. pg_cron schedule: ingest-careers  daily  @ 06:00 UTC
--   4. pg_cron schedule: ingest-github   weekly @ 03:00 UTC Monday
--
--   Also: change RAISE NOTICE → RAISE WARNING in ingest_breaking_news() so
--   a missing app.ingest_news_url is visible in cron.job_run_details instead
--   of silently succeeding. (Audit fix C-3)
--
-- CONFIG REQUIRED (same pattern as ingest_breaking_news)
--   ALTER DATABASE postgres SET app.ingest_careers_url = '<edge-fn-url>';
--   ALTER DATABASE postgres SET app.ingest_github_url  = '<edge-fn-url>';
--   ALTER DATABASE postgres SET app.supabase_service_key = '<service-role-key>';
-- ═══════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- 1.  Patch ingest_breaking_news() — RAISE NOTICE → RAISE WARNING  (C-3)
--     A missing app.ingest_news_url causes a silent no-op. pg_cron records
--     NOTICE-level messages in status_message only when log_min_messages is
--     lowered; WARNING is always captured in job_run_details.return_message.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.ingest_breaking_news()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_edge_url  TEXT;
  v_svc_key   TEXT;
BEGIN
  v_edge_url := current_setting('app.ingest_news_url', true);
  v_svc_key  := current_setting('app.supabase_service_key', true);

  IF v_edge_url IS NULL OR v_edge_url = '' THEN
    RAISE WARNING '[IngestNews] app.ingest_news_url not configured — skipping cron tick. '
                  'Run: ALTER DATABASE postgres SET app.ingest_news_url = ''<url>'';';
    RETURN;
  END IF;

  IF v_svc_key IS NULL OR v_svc_key = '' THEN
    RAISE WARNING '[IngestNews] app.supabase_service_key not configured — skipping cron tick.';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url     := v_edge_url,
    body    := jsonb_build_object('triggered_by', 'pg_cron'),
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_svc_key
    )
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[IngestNews] Error dispatching cron tick: % — %', SQLSTATE, SQLERRM;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ingest_breaking_news FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.ingest_breaking_news IS
  'pg_cron → pg_net.http_post bridge for the ingest-news Edge Function. '
  'Fires every 10 minutes. RAISE WARNING (not NOTICE) so misconfiguration '
  'is visible in cron.job_run_details.return_message.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 2.  Bridge function: ingest_careers_daily()  (C-1)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.ingest_careers_daily()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_edge_url TEXT;
  v_svc_key  TEXT;
BEGIN
  v_edge_url := current_setting('app.ingest_careers_url', true);
  v_svc_key  := current_setting('app.supabase_service_key', true);

  IF v_edge_url IS NULL OR v_edge_url = '' THEN
    RAISE WARNING '[IngestCareers] app.ingest_careers_url not configured — skipping. '
                  'Run: ALTER DATABASE postgres SET app.ingest_careers_url = ''<url>'';';
    RETURN;
  END IF;

  IF v_svc_key IS NULL OR v_svc_key = '' THEN
    RAISE WARNING '[IngestCareers] app.supabase_service_key not configured — skipping.';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url     := v_edge_url,
    body    := jsonb_build_object('triggered_by', 'pg_cron'),
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_svc_key
    )
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[IngestCareers] Error dispatching cron tick: % — %', SQLSTATE, SQLERRM;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ingest_careers_daily FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.ingest_careers_daily IS
  'pg_cron → pg_net.http_post bridge for the ingest-careers Edge Function. '
  'Fires daily at 06:00 UTC. Detects >25% WoW job-count drops on company '
  'career pages and emits hiring-freeze breaking_news_events rows.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 3.  Bridge function: ingest_github_weekly()  (C-1)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.ingest_github_weekly()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_edge_url TEXT;
  v_svc_key  TEXT;
BEGIN
  v_edge_url := current_setting('app.ingest_github_url', true);
  v_svc_key  := current_setting('app.supabase_service_key', true);

  IF v_edge_url IS NULL OR v_edge_url = '' THEN
    RAISE WARNING '[IngestGitHub] app.ingest_github_url not configured — skipping. '
                  'Run: ALTER DATABASE postgres SET app.ingest_github_url = ''<url>'';';
    RETURN;
  END IF;

  IF v_svc_key IS NULL OR v_svc_key = '' THEN
    RAISE WARNING '[IngestGitHub] app.supabase_service_key not configured — skipping.';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url     := v_edge_url,
    body    := jsonb_build_object('triggered_by', 'pg_cron'),
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_svc_key
    )
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[IngestGitHub] Error dispatching cron tick: % — %', SQLSTATE, SQLERRM;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ingest_github_weekly FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.ingest_github_weekly IS
  'pg_cron → pg_net.http_post bridge for the ingest-github Edge Function. '
  'Fires weekly on Mondays at 03:00 UTC. Detects >40% commit-velocity drops '
  'across org repos and emits engineering-slowdown breaking_news_events rows.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 4.  pg_cron schedules  (C-1)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE '[IngestCron] pg_cron extension not available — skipping schedule creation. '
                 'Install pg_cron or invoke Edge Functions externally.';
    RETURN;
  END IF;

  -- ── ingest-careers: daily at 06:00 UTC ──────────────────────────────────
  PERFORM cron.unschedule('ingest-careers-daily')
  WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'ingest-careers-daily'
  );

  PERFORM cron.schedule(
    'ingest-careers-daily',
    '0 6 * * *',
    $cron$SELECT public.ingest_careers_daily()$cron$
  );
  RAISE NOTICE '[IngestCron] ingest-careers-daily scheduled (daily @ 06:00 UTC)';

  -- ── ingest-github: weekly on Monday at 03:00 UTC ────────────────────────
  PERFORM cron.unschedule('ingest-github-weekly')
  WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'ingest-github-weekly'
  );

  PERFORM cron.schedule(
    'ingest-github-weekly',
    '0 3 * * 1',
    $cron$SELECT public.ingest_github_weekly()$cron$
  );
  RAISE NOTICE '[IngestCron] ingest-github-weekly scheduled (weekly Mon @ 03:00 UTC)';
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5.  Verification queries (commented out — for ops use)
-- ─────────────────────────────────────────────────────────────────────────────
-- View all ingest schedules:
--   SELECT jobname, schedule, active FROM cron.job
--   WHERE jobname IN ('ingest-breaking-news','ingest-careers-daily','ingest-github-weekly');
--
-- View recent cron run outcomes:
--   SELECT jobname, start_time, end_time, status, return_message
--   FROM cron.job_run_details
--   WHERE jobname IN ('ingest-breaking-news','ingest-careers-daily','ingest-github-weekly')
--   ORDER BY start_time DESC LIMIT 30;
--
-- Check idempotency state for all ingest jobs:
--   SELECT kind, last_run_at, updated_at FROM public.ingestion_runs ORDER BY kind;
