-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260609000001_v35_cron_schedules.sql
-- Purpose:   WS2 / WS4 / WS6 / WS8 — Register pg_cron schedules for all
--            edge functions introduced in the v35 empirical-trustworthiness
--            transformation. Without these schedules, the cron-driven
--            primitives (outcome ingestion, recalibration, coverage audit,
--            stale-leader expiry) only run when manually invoked.
--
--            Cadence rationale:
--              outcome-ingestion        every 6h
--                The 14-day minimum-audit-age gate means more frequent
--                runs find no new candidates. 6h is enough to capture
--                same-day surges (e.g. a WARN filing dropping at 10am).
--
--              coverage-audit           Mondays 04:00 UTC
--                Conformal coverage drift is a slow signal; weekly is
--                sufficient. Mondays so the dashboard reflects last
--                week's metrics on the Tuesday standup.
--
--              recalibrate-engine       Sundays 03:00 UTC
--                Weekly so the drift gate has fresh measurements to
--                compare against. Sundays so coverage-audit (Monday)
--                reads the same week's recalibration metrics.
--
--              expire_stale_audit_leaders   every 1 min
--                Audit-coalesce leaders are short-lived (60s expiry).
--                Janitor every minute keeps the table free of orphans
--                without producing meaningful load.
--
--              maintain_layer_fallback_partitions   monthly
--                Future-month partitions on layer_fallback_log and
--                analytics_events must exist before writes land in them.
-- ═══════════════════════════════════════════════════════════════════════════════

-- Helper: idempotent cron registration. Uses cron.unschedule first so
-- re-running the migration replaces an existing schedule without erroring.
CREATE OR REPLACE FUNCTION public._v35_register_cron(
  job_name TEXT,
  schedule TEXT,
  command  TEXT
)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    PERFORM cron.unschedule(job_name);
  EXCEPTION WHEN OTHERS THEN
    -- ignore: job did not exist
    NULL;
  END;
  PERFORM cron.schedule(job_name, schedule, command);
END;
$$;

-- ── WS6 — Stale audit-coalesce leader janitor ─────────────────────────────────
-- expire_stale_audit_leaders defined in 20260607000001. Runs every minute.
SELECT public._v35_register_cron(
  'v35_expire_audit_leaders',
  '* * * * *',
  $$SELECT public.expire_stale_audit_leaders();$$
);

-- ── WS2 — Outcome ingestion (implicit detection) ──────────────────────────────
-- The outcome-ingestion edge function pulls audits aged >=14 days, fuzzy
-- matches against breaking_news_events + curated_layoff_events, and writes
-- implicit outcomes to user_prediction_outcomes.
--
-- We invoke it via pg_net so the HTTP call originates from the Postgres host
-- and inherits the service_role JWT.
SELECT public._v35_register_cron(
  'v35_outcome_ingestion',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url     := current_setting('app.supabase_functions_url', true) || '/outcome-ingestion',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true),
      'Content-Type',  'application/json'
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- ── WS4 — Coverage audit (Mondays 04:00 UTC) ──────────────────────────────────
SELECT public._v35_register_cron(
  'v35_coverage_audit',
  '0 4 * * 1',
  $$
  SELECT net.http_post(
    url     := current_setting('app.supabase_functions_url', true) || '/coverage-audit',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true),
      'Content-Type',  'application/json'
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- ── WS8 — Engine recalibration (Sundays 03:00 UTC) ────────────────────────────
SELECT public._v35_register_cron(
  'v35_recalibrate_engine',
  '0 3 * * 0',
  $$
  SELECT net.http_post(
    url     := current_setting('app.supabase_functions_url', true) || '/recalibrate-engine',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true),
      'Content-Type',  'application/json'
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- ── WS1 — Telemetry partition maintenance ─────────────────────────────────────
-- Create next-month partitions for layer_fallback_log and analytics_events.
-- Runs on the 25th of each month so partitions exist before the month rolls.
CREATE OR REPLACE FUNCTION public.v35_create_next_month_partitions()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  next_month_start DATE;
  month_after_start DATE;
  partition_suffix TEXT;
  partitions_created INTEGER := 0;
BEGIN
  -- Look 2 months ahead so there is always a partition for the current and
  -- next month even if a run is missed.
  next_month_start := date_trunc('month', NOW() + INTERVAL '1 month')::date;
  month_after_start := date_trunc('month', NOW() + INTERVAL '2 months')::date;
  partition_suffix := to_char(next_month_start, 'YYYY_MM');

  -- layer_fallback_log
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS public.layer_fallback_log_%s PARTITION OF public.layer_fallback_log FOR VALUES FROM (%L) TO (%L);',
    partition_suffix, next_month_start, month_after_start
  );
  partitions_created := partitions_created + 1;

  -- analytics_events
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS public.analytics_events_%s PARTITION OF public.analytics_events FOR VALUES FROM (%L) TO (%L);',
    partition_suffix, next_month_start, month_after_start
  );
  partitions_created := partitions_created + 1;

  RETURN partitions_created;
END;
$$;

SELECT public._v35_register_cron(
  'v35_create_next_month_partitions',
  '0 6 25 * *',
  $$SELECT public.v35_create_next_month_partitions();$$
);

-- ── Drop helper after registration ────────────────────────────────────────────
-- Keep the function around so subsequent rolling re-runs of this migration
-- (e.g. in dev) can replace schedules cleanly.
COMMENT ON FUNCTION public._v35_register_cron(TEXT, TEXT, TEXT) IS
  'Helper for v35 cron migration. Idempotently registers a pg_cron schedule '
  'by first unscheduling any existing job with the same name. Safe to call '
  'from later migrations to update schedules without dropping data.';
