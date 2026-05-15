-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260610000001_workforce_snapshot_cron.sql
-- Purpose:   WS3 — Register the scrape-workforce-snapshot cron.
--
--            Without a populated workforce_snapshots table the
--            stealthLayoffDetector returns NO_DATA for every company. This
--            cron seeds the table weekly with company_intelligence headcount
--            (always-available baseline) plus Wikipedia infobox fallback
--            for companies missing from the intelligence DB.
--
--            Cadence: Mondays 02:00 UTC, BEFORE coverage-audit (04:00 UTC)
--            so the day's stealth-detector reads have at minimum one
--            current-week row to compare against the 26-week-prior baseline.
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT public._v35_register_cron(
  'v35_workforce_snapshot',
  '0 2 * * 1',
  $$
  SELECT net.http_post(
    url     := current_setting('app.supabase_functions_url', true) || '/scrape-workforce-snapshot',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true),
      'Content-Type',  'application/json'
    ),
    body    := '{}'::jsonb
  );
  $$
);

COMMENT ON FUNCTION public._v35_register_cron(TEXT, TEXT, TEXT) IS
  'Helper for v35 cron migration. Idempotently registers a pg_cron schedule '
  'by first unscheduling any existing job with the same name. The v35 cron '
  'jobs registered so far: v35_expire_audit_leaders, v35_outcome_ingestion, '
  'v35_coverage_audit, v35_recalibrate_engine, v35_create_next_month_partitions, '
  'v35_workforce_snapshot.';
