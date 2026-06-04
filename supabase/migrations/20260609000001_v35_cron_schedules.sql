-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260609000001_v35_cron_schedules.sql
-- Purpose:   Register pg_cron schedules for v35 edge functions.
--            Skipped gracefully when pg_cron is not available.
-- ═══════════════════════════════════════════════════════════════════════════════

-- Partition maintenance function (always create — safe without pg_cron)
CREATE OR REPLACE FUNCTION public.v35_create_next_month_partitions()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $body$
DECLARE
  next_month_start  DATE := date_trunc('month', NOW() + INTERVAL '1 month')::date;
  month_after_start DATE := date_trunc('month', NOW() + INTERVAL '2 months')::date;
  partition_suffix  TEXT := to_char(next_month_start, 'YYYY_MM');
  partitions_created INTEGER := 0;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='layer_fallback_log') THEN
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS public.layer_fallback_log_%s PARTITION OF public.layer_fallback_log FOR VALUES FROM (%L) TO (%L);',
      partition_suffix, next_month_start, month_after_start
    );
    partitions_created := partitions_created + 1;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='analytics_events') THEN
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS public.analytics_events_%s PARTITION OF public.analytics_events FOR VALUES FROM (%L) TO (%L);',
      partition_suffix, next_month_start, month_after_start
    );
    partitions_created := partitions_created + 1;
  END IF;
  RETURN partitions_created;
END;
$body$;

-- Helper: idempotent schedule registration (no-op when pg_cron unavailable)
CREATE OR REPLACE FUNCTION public._v35_register_cron(job_name TEXT, schedule TEXT, command TEXT)
RETURNS VOID LANGUAGE plpgsql AS $fn$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE '[_v35_register_cron] pg_cron not available — skipping job: %', job_name;
    RETURN;
  END IF;
  BEGIN PERFORM cron.unschedule(job_name); EXCEPTION WHEN OTHERS THEN NULL; END;
  PERFORM cron.schedule(job_name, schedule, command);
END;
$fn$;

-- Register all cron schedules only when pg_cron is available
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE '[v35_cron] pg_cron not available — skipping all schedule registrations.';
    RETURN;
  END IF;

  -- WS6 — Stale audit-coalesce leader janitor (every minute)
  PERFORM public._v35_register_cron(
    'v35_expire_audit_leaders', '* * * * *',
    $cmd$SELECT public.expire_stale_audit_leaders();$cmd$
  );

  -- WS2 — Outcome ingestion (every 6h)
  PERFORM public._v35_register_cron(
    'v35_outcome_ingestion', '0 */6 * * *',
    $cmd$SELECT net.http_post(url:=current_setting('app.supabase_functions_url',true)||'/outcome-ingestion',headers:=jsonb_build_object('Authorization','Bearer '||current_setting('app.supabase_service_role_key',true),'Content-Type','application/json'),body:='{}'::jsonb);$cmd$
  );

  -- WS4 — Coverage audit (Mondays 04:00 UTC)
  PERFORM public._v35_register_cron(
    'v35_coverage_audit', '0 4 * * 1',
    $cmd$SELECT net.http_post(url:=current_setting('app.supabase_functions_url',true)||'/coverage-audit',headers:=jsonb_build_object('Authorization','Bearer '||current_setting('app.supabase_service_role_key',true),'Content-Type','application/json'),body:='{}'::jsonb);$cmd$
  );

  -- WS8 — Engine recalibration (Sundays 03:00 UTC)
  PERFORM public._v35_register_cron(
    'v35_recalibrate_engine', '0 3 * * 0',
    $cmd$SELECT net.http_post(url:=current_setting('app.supabase_functions_url',true)||'/recalibrate-engine',headers:=jsonb_build_object('Authorization','Bearer '||current_setting('app.supabase_service_role_key',true),'Content-Type','application/json'),body:='{}'::jsonb);$cmd$
  );

  -- WS1 — Partition maintenance (25th of each month)
  PERFORM public._v35_register_cron(
    'v35_create_next_month_partitions', '0 6 25 * *',
    $cmd$SELECT public.v35_create_next_month_partitions();$cmd$
  );

  RAISE NOTICE '[v35_cron] All 5 pg_cron schedules registered.';
END $$;

COMMENT ON FUNCTION public.v35_create_next_month_partitions IS
  'Creates next-month partitions for layer_fallback_log and analytics_events. '
  'Called by pg_cron on the 25th of each month.';
