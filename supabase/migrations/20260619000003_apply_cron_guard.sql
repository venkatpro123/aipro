-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260619000003_apply_cron_guard.sql
-- Purpose:   WS13 — apply with_cron_guard() to the heavyweight crons.
--
--            The audit identified two crons (breaking-news-scan,
--            refresh-market-intelligence) plus the recalibrate-engine
--            and coverage-audit jobs as needing:
--              * advisory-lock overlap protection
--              * structured cron_runs telemetry (start, end, status)
--              * SLA breach detection
--
--            with_cron_guard (added in 20260619000002) provides all
--            three. This migration re-registers the cron bodies to
--            route through the wrapper.
--
--            Re-registering is idempotent — _v35_register_cron's
--            DROP-then-CREATE pattern handles the upsert.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── recalibrate-engine (Sundays 03:00 UTC) ─────────────────────────────────
-- SLA: 5 minutes. The regression takes <60s in practice; budget 5min
-- to absorb retries against the outcome corpus.
SELECT public._v35_register_cron(
  'v35_recalibrate_engine',
  '0 3 * * 0',
  $$
  SELECT public.with_cron_guard(
    'v35_recalibrate_engine',
    $body$
      SELECT net.http_post(
        url     := current_setting('app.supabase_functions_url', true) || '/recalibrate-engine',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true),
          'Content-Type',  'application/json'
        ),
        body    := '{}'::jsonb
      );
    $body$,
    300000  -- 5 minute SLA
  );
  $$
);

-- ── coverage-audit (Mondays 04:00 UTC) ─────────────────────────────────────
-- SLA: 3 minutes. Reads outcomes, aggregates per-cohort coverage, writes
-- one row. No external network calls — pure DB work.
SELECT public._v35_register_cron(
  'v35_coverage_audit',
  '0 4 * * 1',
  $$
  SELECT public.with_cron_guard(
    'v35_coverage_audit',
    $body$
      SELECT net.http_post(
        url     := current_setting('app.supabase_functions_url', true) || '/coverage-audit',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true),
          'Content-Type',  'application/json'
        ),
        body    := '{}'::jsonb
      );
    $body$,
    180000  -- 3 minute SLA
  );
  $$
);

-- ── ingest-breaking-news (every 10 min) ────────────────────────────────────
-- The legacy schedule used cron.schedule() directly. Re-register via
-- _v35_register_cron so we get the same DROP-then-CREATE semantics.
-- SLA: 2 minutes — the cron must finish before the next 10-min tick OR
-- we accumulate overlap. Sweeper enforces this hard.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM public._v35_register_cron(
      'ingest-breaking-news',
      '*/10 * * * *',
      $cron$
      SELECT public.with_cron_guard(
        'ingest-breaking-news',
        $body$SELECT public.ingest_breaking_news()$body$,
        120000  -- 2 minute SLA
      );
      $cron$
    );
  END IF;
END $$;

-- ── outcome-ingestion (every 6h) ───────────────────────────────────────────
-- WS2 ingestion run. Iterates over audits ≥14d old without outcomes,
-- queries implicit detectors. CPU-bound, no per-row external calls; SLA 5min.
DO $$
BEGIN
  -- Only re-register if this cron already exists (the original WS2 ship
  -- registered it conditionally). We don't want to ADD a cron that
  -- wasn't there.
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'v35_outcome_ingestion') THEN
    PERFORM public._v35_register_cron(
      'v35_outcome_ingestion',
      '0 */6 * * *',
      $cron$
      SELECT public.with_cron_guard(
        'v35_outcome_ingestion',
        $body$
          SELECT net.http_post(
            url     := current_setting('app.supabase_functions_url', true) || '/outcome-ingestion',
            headers := jsonb_build_object(
              'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true),
              'Content-Type',  'application/json'
            ),
            body    := '{}'::jsonb
          );
        $body$,
        300000  -- 5 minute SLA
      );
      $cron$
    );
  END IF;
END $$;

COMMENT ON FUNCTION public.with_cron_guard IS
  'WS13 — all heavyweight crons (recalibrate-engine, coverage-audit, '
  'ingest-breaking-news, outcome-ingestion) now route through this wrapper. '
  'Each gets advisory-lock overlap protection, cron_runs telemetry, and SLA '
  'breach detection visible in slo_cron_health_24h.';
