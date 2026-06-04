-- Migration: 20260619000003_apply_cron_guard.sql
-- Purpose:   WS13 — apply with_cron_guard() to heavyweight crons.

-- ── recalibrate-engine (Sundays 03:00 UTC) ─────────────────────────────────
SELECT public._v35_register_cron(
  'v35_recalibrate_engine',
  '0 3 * * 0',
  $cmd$SELECT public.with_cron_guard('v35_recalibrate_engine',$body$SELECT net.http_post(url:=current_setting('app.supabase_functions_url',true)||'/recalibrate-engine',headers:=jsonb_build_object('Authorization','Bearer '||current_setting('app.supabase_service_role_key',true),'Content-Type','application/json'),body:='{}'::jsonb);$body$,300000);$cmd$
);

-- ── coverage-audit (Mondays 04:00 UTC) ─────────────────────────────────────
SELECT public._v35_register_cron(
  'v35_coverage_audit',
  '0 4 * * 1',
  $cmd$SELECT public.with_cron_guard('v35_coverage_audit',$body$SELECT net.http_post(url:=current_setting('app.supabase_functions_url',true)||'/coverage-audit',headers:=jsonb_build_object('Authorization','Bearer '||current_setting('app.supabase_service_role_key',true),'Content-Type','application/json'),body:='{}'::jsonb);$body$,180000);$cmd$
);

-- ── ingest-breaking-news (every 10 min) ────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM public._v35_register_cron(
      'ingest-breaking-news',
      '*/10 * * * *',
      $cmd$SELECT public.with_cron_guard('ingest-breaking-news',$body$SELECT public.ingest_breaking_news()$body$,120000);$cmd$
    );
  END IF;
END $$;

-- ── outcome-ingestion (every 6h) ───────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM public._v35_register_cron(
      'v35_outcome_ingestion',
      '0 */6 * * *',
      $cmd$SELECT public.with_cron_guard('v35_outcome_ingestion',$body$SELECT net.http_post(url:=current_setting('app.supabase_functions_url',true)||'/outcome-ingestion',headers:=jsonb_build_object('Authorization','Bearer '||current_setting('app.supabase_service_role_key',true),'Content-Type','application/json'),body:='{}'::jsonb);$body$,300000);$cmd$
    );
  END IF;
END $$;

COMMENT ON FUNCTION public.with_cron_guard IS
  'WS13 — heavyweight crons route through this wrapper for advisory-lock, '
  'telemetry, and SLA breach detection.';
