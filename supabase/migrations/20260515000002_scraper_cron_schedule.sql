-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260515000002_scraper_cron_schedule.sql
-- Purpose:   pg_cron + pg_net bridge for the new `scraper-enqueue` Edge Function.
--            Fires every 10 minutes. The EF reads the `due_for_scrape` view
--            (companies whose poll_freq_min has elapsed), HMAC-signs a job
--            batch, and POSTs to the Fly.io scraper's /enqueue endpoint.
--
-- CONFIG REQUIRED  (Once per Supabase project — paste into the SQL editor)
--   ALTER DATABASE postgres SET app.scraper_enqueue_url = '<edge-fn-url>';
--   ALTER DATABASE postgres SET app.supabase_service_key = '<service-role-key>';
-- ═══════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- 1.  Bridge function: dispatch_scraper_enqueue()
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.dispatch_scraper_enqueue()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_edge_url TEXT;
  v_svc_key  TEXT;
BEGIN
  v_edge_url := current_setting('app.scraper_enqueue_url', true);
  v_svc_key  := current_setting('app.supabase_service_key', true);

  IF v_edge_url IS NULL OR v_edge_url = '' THEN
    RAISE WARNING '[ScraperEnqueue] app.scraper_enqueue_url not configured — skipping. '
                  'Run: ALTER DATABASE postgres SET app.scraper_enqueue_url = ''<url>'';';
    RETURN;
  END IF;

  IF v_svc_key IS NULL OR v_svc_key = '' THEN
    RAISE WARNING '[ScraperEnqueue] app.supabase_service_key not configured — skipping.';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url     := v_edge_url,
    body    := jsonb_build_object('triggered_by', 'pg_cron', 'tick', now()),
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_svc_key
    )
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[ScraperEnqueue] Error dispatching cron tick: % — %', SQLSTATE, SQLERRM;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.dispatch_scraper_enqueue FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.dispatch_scraper_enqueue IS
  'pg_cron → pg_net.http_post bridge for the scraper-enqueue Edge Function. '
  'Fires every 10 minutes. The EF reads due_for_scrape and POSTs HMAC-signed '
  'job batches to the Fly.io scraper at /enqueue.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 2.  pg_cron schedule
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE '[ScraperEnqueue] pg_cron extension not available — skipping schedule creation.';
    RETURN;
  END IF;

  -- ── scraper-enqueue: every 10 minutes ──────────────────────────────────────
  PERFORM cron.unschedule('scraper-enqueue-10m')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'scraper-enqueue-10m');

  PERFORM cron.schedule(
    'scraper-enqueue-10m',
    '*/10 * * * *',
    $cron$SELECT public.dispatch_scraper_enqueue()$cron$
  );
  RAISE NOTICE '[ScraperEnqueue] scraper-enqueue-10m scheduled (every 10 min)';
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3.  Verification queries (commented out — for ops use)
-- ─────────────────────────────────────────────────────────────────────────────
-- View schedule:
--   SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'scraper-enqueue-10m';
--
-- View recent dispatches:
--   SELECT start_time, status, return_message FROM cron.job_run_details
--   WHERE jobname = 'scraper-enqueue-10m' ORDER BY start_time DESC LIMIT 10;
--
-- View companies currently due:
--   SELECT company_name, priority, minutes_since_last FROM public.due_for_scrape
--   ORDER BY minutes_since_last DESC;
--
-- View latest scrape_jobs activity:
--   SELECT job_type, status, error_kind, count(*)
--   FROM public.scrape_jobs
--   WHERE enqueued_at > now() - interval '1 hour'
--   GROUP BY 1, 2, 3 ORDER BY 1, 2;
