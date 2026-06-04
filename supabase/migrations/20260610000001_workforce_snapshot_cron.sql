-- Migration: 20260610000001_workforce_snapshot_cron.sql
-- Purpose:   WS3 — Register the scrape-workforce-snapshot cron.

SELECT public._v35_register_cron(
  'v35_workforce_snapshot',
  '0 2 * * 1',
  $cmd$SELECT net.http_post(url:=current_setting('app.supabase_functions_url',true)||'/scrape-workforce-snapshot',headers:=jsonb_build_object('Authorization','Bearer '||current_setting('app.supabase_service_role_key',true),'Content-Type','application/json'),body:='{}'::jsonb);$cmd$
);

COMMENT ON FUNCTION public._v35_register_cron(TEXT, TEXT, TEXT) IS
  'Helper for v35 cron migration. Idempotently registers a pg_cron schedule '
  'by first unscheduling any existing job with the same name.';
