-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260513000001_layoff_audit_hardening.sql
-- Purpose:   Consolidated remediation of issues identified by the 2026-05-11
--            system-wide Layoff Audit validation. Five concerns addressed:
--
--   1. company_intelligence not in supabase_realtime publication
--      → useCompanySignalSubscription UPDATE channel never fired
--   2. intelligence_briefs missing REPLICA IDENTITY FULL
--      → Realtime UPDATE events lack OLD row values, row-level filtering broken
--   3. refresh_peer_benchmarks(), expire_analysis_cache(),
--      expire_breaking_news_events() live in the artifacts/ migration tree only
--      → defensively redeclared here so pg_cron targets resolve regardless of
--        which tree is the source of truth
--   4. RLS disabled on five v16 external-signal tables
--      (warn_filings, bls_macro_snapshots, sec_enhanced_signals,
--       glassdoor_velocity_history, executive_departure_log)
--   5. company_enrichment_queue ALL policy granted USING (true) to every role
--      → any authenticated user could rewrite enriched_data
--   6. api_circuit_status policies allow authenticated users to push state='OPEN'
--      with no transition validation (5-minute DoS vector)
--
-- All statements are idempotent (CREATE OR REPLACE, IF NOT EXISTS, DROP POLICY
-- IF EXISTS) so this migration is safe to re-apply.
-- ═══════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- 1.  Realtime: publish company_intelligence and stabilize intelligence_briefs
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'company_intelligence')
  THEN
    -- REPLICA IDENTITY FULL is required for Realtime row-level filters
    -- (eq.company_name) to work on UPDATE events. The main migration set
    -- already sets this in 20260429000003; redeclare idempotently in case
    -- this migration is applied to a tree that did not run that file.
    EXECUTE 'ALTER TABLE public.company_intelligence REPLICA IDENTITY FULL';

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'company_intelligence'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.company_intelligence';
    END IF;
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'intelligence_briefs')
  THEN
    EXECUTE 'ALTER TABLE public.intelligence_briefs REPLICA IDENTITY FULL';

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'intelligence_briefs'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.intelligence_briefs';
    END IF;
  END IF;
END
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2.  pg_cron targets: defensive redeclaration of three SQL maintenance fns
-- ─────────────────────────────────────────────────────────────────────────────
-- These functions live in artifacts/humanproof/supabase/migrations/. If the
-- main tree is the deployed source, the pg_cron schedules in
-- 20260101000003_pg_cron_schedules.sql reference functions that don't exist
-- and fail silently every run. Redeclare here so they resolve from either
-- migration tree. Definitions match the originals byte-for-byte.

CREATE OR REPLACE FUNCTION public.expire_breaking_news_events()
RETURNS void LANGUAGE sql AS $$
  DELETE FROM public.breaking_news_events
  WHERE event_date < CURRENT_DATE - INTERVAL '30 days';
$$;

CREATE OR REPLACE FUNCTION public.expire_analysis_cache()
RETURNS void LANGUAGE sql AS $$
  DELETE FROM public.layoff_analysis_cache
  WHERE created_at < NOW() - INTERVAL '24 hours';
$$;

-- refresh_peer_benchmarks() depends on layoff_scores and peer_benchmarks.
-- Guard with a table check so this migration applies cleanly even when those
-- tables haven't been created (e.g., main tree is the source of truth and
-- peer_benchmarks is still pending consolidation from artifacts/).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'peer_benchmarks')
     AND EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_schema = 'public' AND table_name = 'layoff_scores')
  THEN
    EXECUTE $f$
      CREATE OR REPLACE FUNCTION public.refresh_peer_benchmarks()
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $body$
      BEGIN
        INSERT INTO public.peer_benchmarks
          (role_key, p10, p25, p50, p75, p90, sample_size, data_as_of, updated_at)
        SELECT
          role_key,
          ROUND(PERCENTILE_CONT(0.10) WITHIN GROUP (ORDER BY score)::numeric, 1) AS p10,
          ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY score)::numeric, 1) AS p25,
          ROUND(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY score)::numeric, 1) AS p50,
          ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY score)::numeric, 1) AS p75,
          ROUND(PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY score)::numeric, 1) AS p90,
          COUNT(*)::INTEGER                                                        AS sample_size,
          CURRENT_DATE                                                             AS data_as_of,
          NOW()                                                                    AS updated_at
        FROM public.layoff_scores
        WHERE allow_community_share = true
          AND created_at > NOW() - INTERVAL '90 days'
        GROUP BY role_key
        HAVING COUNT(*) >= 100
        ON CONFLICT (role_key) DO UPDATE SET
          p10         = EXCLUDED.p10,
          p25         = EXCLUDED.p25,
          p50         = EXCLUDED.p50,
          p75         = EXCLUDED.p75,
          p90         = EXCLUDED.p90,
          sample_size = EXCLUDED.sample_size,
          data_as_of  = EXCLUDED.data_as_of,
          updated_at  = EXCLUDED.updated_at;
      END;
      $body$;
    $f$;
  END IF;
END
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3.  RLS — enable on five v16 external-signal tables and add policies
-- ─────────────────────────────────────────────────────────────────────────────
-- These tables hold company-level external signals (WARN filings, BLS macro,
-- SEC financials, Glassdoor deltas, executive departures). The v16 migration
-- created them without RLS, leaving them world-readable to anyone with an
-- anon key. Public read is the intended posture (this is aggregate signal
-- data, not personal data), but writes must be restricted to service_role
-- so authenticated users cannot poison the cache.

DO $$
DECLARE
  tbl TEXT;
  signal_tables TEXT[] := ARRAY[
    'warn_filings',
    'bls_macro_snapshots',
    'sec_enhanced_signals',
    'glassdoor_velocity_history',
    'executive_departure_log'
  ];
BEGIN
  FOREACH tbl IN ARRAY signal_tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'public' AND table_name = tbl)
    THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

      EXECUTE format(
        'DROP POLICY IF EXISTS "%s_public_read" ON public.%I',
        tbl, tbl);
      EXECUTE format(
        'CREATE POLICY "%s_public_read" ON public.%I FOR SELECT USING (true)',
        tbl, tbl);

      EXECUTE format(
        'DROP POLICY IF EXISTS "%s_service_write" ON public.%I',
        tbl, tbl);
      EXECUTE format(
        'CREATE POLICY "%s_service_write" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
        tbl, tbl);

      EXECUTE format(
        'DROP POLICY IF EXISTS "%s_deny_anon_write" ON public.%I',
        tbl, tbl);
      EXECUTE format(
        'CREATE POLICY "%s_deny_anon_write" ON public.%I FOR INSERT TO anon, authenticated WITH CHECK (false)',
        tbl, tbl);

      EXECUTE format(
        'DROP POLICY IF EXISTS "%s_deny_anon_update" ON public.%I',
        tbl, tbl);
      EXECUTE format(
        'CREATE POLICY "%s_deny_anon_update" ON public.%I FOR UPDATE TO anon, authenticated USING (false)',
        tbl, tbl);
    END IF;
  END LOOP;
END
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4.  Tighten company_enrichment_queue — the existing "Service role can manage"
--     policy used USING (true) without a TO clause, granting full write access
--     to every authenticated user. Replace with a service_role-only ALL policy.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'company_enrichment_queue')
  THEN
    EXECUTE 'DROP POLICY IF EXISTS "Service role can manage enrichment queue" ON public.company_enrichment_queue';
    EXECUTE 'DROP POLICY IF EXISTS "enrichment_queue_service_write" ON public.company_enrichment_queue';
    EXECUTE $pol$
      CREATE POLICY "enrichment_queue_service_write" ON public.company_enrichment_queue
        FOR ALL TO service_role
        USING (true) WITH CHECK (true)
    $pol$;
  END IF;
END
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5.  api_circuit_status — block clients from forcing state='OPEN' and
--     widen the api_name whitelist to include yahoo_finance (added in May
--     2026 when proxy-live-signals switched from Alpha Vantage to Yahoo).
-- ─────────────────────────────────────────────────────────────────────────────
-- The previous policy validated api_name and consecutive_failures but not the
-- state field. An authenticated user could upsert state='OPEN' and freeze
-- live data for ~5 minutes for every other user. Restrict writes to states
-- that represent observation, not forced transition.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'api_circuit_status')
  THEN
    EXECUTE 'DROP POLICY IF EXISTS "circuit_status_browser_insert" ON public.api_circuit_status';
    EXECUTE 'DROP POLICY IF EXISTS "circuit_status_browser_update" ON public.api_circuit_status';

    EXECUTE $pol$
      CREATE POLICY "circuit_status_browser_insert"
        ON public.api_circuit_status
        FOR INSERT TO anon, authenticated
        WITH CHECK (
          api_name IN ('alphavantage','newsapi','serper','yahoo_finance')
          AND consecutive_failures >= 0
          AND state IN ('CLOSED','HALF_OPEN')
        )
    $pol$;

    EXECUTE $pol$
      CREATE POLICY "circuit_status_browser_update"
        ON public.api_circuit_status
        FOR UPDATE TO anon, authenticated
        USING  (api_name IN ('alphavantage','newsapi','serper','yahoo_finance'))
        WITH CHECK (
          api_name IN ('alphavantage','newsapi','serper','yahoo_finance')
          AND consecutive_failures >= 0
          AND state IN ('CLOSED','HALF_OPEN')
        )
    $pol$;
  END IF;
END
$$;

COMMENT ON TABLE public.api_circuit_status IS
  'Circuit breaker state for external APIs. '
  'RLS: public SELECT; anon/authenticated may INSERT/UPDATE only for known '
  'api_name values and only into CLOSED or HALF_OPEN states. '
  'Forced state=OPEN must originate from service_role (RLS bypass).';
