-- 20260512000001_real_time_news_ingestion.sql — v22.0
--
-- Real-time news ingestion backbone.
-- Replaces the browser-side rss2json.com polling with a server-side pg_cron job
-- that fans out to the `ingest-news` Edge Function every 10 minutes. Worst-case
-- latency from "company announces layoffs" → "every open session sees toast"
-- drops from 1-7 days to ~10 minutes.
--
-- ARCHITECTURE
-- ────────────
-- pg_cron (every 10 min) → ingest_breaking_news() shell function
--                            ↓
--                          pg_net.http_post → ingest-news Edge Function
--                            ↓
--                          parallel-fetches N RSS/HTML sources
--                            ↓
--                          regex pre-filter + LLM extraction (capped 50/run)
--                            ↓
--                          INSERT INTO breaking_news_events ON CONFLICT DO NOTHING
--                            ↓
--                          Supabase Realtime → useCompanySignalSubscription
--
-- CONFIG REQUIRED
-- ───────────────
--   ALTER DATABASE postgres SET app.ingest_news_url     = '<edge-fn-url>';
--   ALTER DATABASE postgres SET app.supabase_service_key = '<service-role-key>';
-- (Same pattern as monthly-ai-displacement-report; deploy step sets both.)

-- ── 1. Idempotency state table ────────────────────────────────────────────────
-- Single-row-per-kind table tracking the last successful run timestamp for each
-- cron-fanout job. The Edge Function reads this on entry and exits early if the
-- last run is <8 min ago — protects against pg_cron's "if previous job is still
-- running, the next tick also fires" semantics.
CREATE TABLE IF NOT EXISTS public.ingestion_runs (
  kind         TEXT        PRIMARY KEY,         -- 'ingest-news' | 'ingest-careers' | 'ingest-github'
  last_run_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_result  JSONB,                            -- optional summary of the run
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ingestion_runs ENABLE ROW LEVEL SECURITY;
-- service_role only — clients never touch this table
REVOKE ALL ON public.ingestion_runs FROM anon, authenticated;

-- ── 2. The plpgsql shell that pg_cron calls ───────────────────────────────────
-- Pattern mirrors `generate_monthly_report` at
-- migrations/20260501000001_monthly_ai_report.sql:373-389.
-- The Edge Function is the source of truth for "what to ingest"; this function
-- exists only to bridge pg_cron → HTTP.

CREATE OR REPLACE FUNCTION public.ingest_breaking_news()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_edge_url TEXT;
BEGIN
  v_edge_url := current_setting('app.ingest_news_url', true);
  IF v_edge_url IS NULL OR v_edge_url = '' THEN
    RAISE NOTICE '[IngestNews] app.ingest_news_url not configured — skipping cron tick.';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url     := v_edge_url,
    body    := jsonb_build_object('triggered_by', 'pg_cron'),
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_key', true)
    )
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[IngestNews] Error dispatching cron tick: % — %', SQLSTATE, SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.ingest_breaking_news IS
  'pg_cron → pg_net.http_post bridge for the ingest-news Edge Function. '
  'Fires every 10 minutes; the Edge Function applies its own 8-minute idempotency '
  'guard via the ingestion_runs table so overlapping ticks are safe.';

REVOKE EXECUTE ON FUNCTION public.ingest_breaking_news FROM PUBLIC, anon, authenticated;

-- ── 3. pg_cron schedule — every 10 minutes ────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove stale schedule with same name before (re-)creating
    PERFORM cron.unschedule('ingest-breaking-news')
    WHERE EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'ingest-breaking-news'
    );

    PERFORM cron.schedule(
      'ingest-breaking-news',
      '*/10 * * * *',                   -- every 10 minutes
      $cron$SELECT public.ingest_breaking_news()$cron$
    );
    RAISE NOTICE '[IngestNews] pg_cron job scheduled (every 10 minutes)';
  ELSE
    RAISE NOTICE '[IngestNews] pg_cron extension not available — skipping schedule. '
                 'Deploy with --extensions=pg_cron or invoke the Edge Function externally.';
  END IF;
END $$;

-- ── 4. Verification queries (commented out — for ops use) ─────────────────────
-- View the schedule:
--   SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'ingest-breaking-news';
-- View recent cron runs:
--   SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
-- View last ingest result:
--   SELECT * FROM public.ingestion_runs WHERE kind = 'ingest-news';
-- View latency:
--   SELECT MAX(NOW() - created_at) AS oldest_event FROM public.breaking_news_events
--     WHERE created_at > NOW() - INTERVAL '24 hours';
