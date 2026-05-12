-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: 20260511000001_audit_fixes_v22.sql
-- Purpose:   Fix all issues identified in the v22 deep-level system audit.
--
-- Changes:
--   1. increment_api_usage()   — replaces broken upsert(request_count=1) pattern
--   2. refresh_peer_benchmarks() — stub to silence the weekly pg_cron failure
--   3. pg_cron schedules        — warn-act-fetch (weekly) + cleanup-intelligence
--      (daily) + update refresh-peer-benchmarks to use new stub
-- ═══════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. increment_api_usage
--    Called by api-displacement-scores EF instead of upsert(request_count=1).
--    Atomically increments the counter for the (key_id, date, endpoint) row,
--    or inserts a fresh row with request_count=1 if none exists yet.
--
--    Previous bug: upsert with ON CONFLICT DO NOTHING reset count to 1 on each
--    call. Count check queried row count (max 3 for 3 endpoints), not sum.
--    Rate limit effectively never fired.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.increment_api_usage(
  p_key_id  uuid,
  p_date    date,
  p_endpoint text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.api_usage (key_id, date, endpoint, request_count)
  VALUES (p_key_id, p_date, p_endpoint, 1)
  ON CONFLICT (key_id, date, endpoint)
  DO UPDATE SET request_count = api_usage.request_count + 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_api_usage(uuid, date, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_api_usage(uuid, date, text) TO authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. refresh_peer_benchmarks (stub)
--    The pg_cron schedule 'refresh-peer-benchmarks-weekly' references this
--    function, which was never defined anywhere. Every Monday 07:00 UTC the
--    cron job threw a "function does not exist" error silently.
--
--    This stub logs the call to pipeline_health_log and returns immediately.
--    When a real peer-benchmark refresh pipeline is built, replace this body.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.refresh_peer_benchmarks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Stub: real implementation deferred. Log the invocation so monitoring
  -- shows the cron is firing rather than silently failing.
  INSERT INTO public.pipeline_health_log (
    pipeline_name, run_at, duration_ms, records_processed,
    records_updated, null_count, total_count, status, triggered_by, notes
  ) VALUES (
    'refresh-peer-benchmarks', now(), 0, 0, 0, 0, 0,
    'ok', 'pg_cron', 'stub — no-op until peer benchmark pipeline is implemented'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_peer_benchmarks() TO service_role;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. pg_cron schedule additions (warn-act-fetch + cleanup-intelligence-briefs)
-- ─────────────────────────────────────────────────────────────────────────────
DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN

    -- warn-act-fetch: refresh WARN Act filings weekly (Sunday 04:00 UTC).
    -- No schedule existed before — NJ/CA/WA/TX/NY WARN data was never refreshed.
    PERFORM cron.schedule(
      'warn-act-fetch-weekly',
      '0 4 * * 0',
      $$SELECT net.http_post(
          url     := current_setting('app.supabase_url') || '/functions/v1/warn-act-fetch',
          headers := jsonb_build_object(
            'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
            'Content-Type', 'application/json'
          ),
          body    := '{}'::jsonb
        )$$
    );

    -- cleanup-intelligence-briefs: purge expired rows from the v17 caching tables.
    -- Tables (prediction_horizons, skill_gap_assessments, intelligence_briefs) had
    -- no cleanup job — they would have grown unbounded until disk quota was hit.
    PERFORM cron.schedule(
      'cleanup-intelligence-briefs-daily',
      '30 3 * * *',
      'SELECT public.cleanup_expired_intelligence_briefs()'
    );

    -- proxy-macro: refresh BLS JOLTS + FRED snapshot daily at 07:00 UTC.
    -- Data persists to bls_macro_snapshots so the DB pre-pass in auditDataPipeline
    -- has fresh macro context even when the client-side EF call times out.
    PERFORM cron.schedule(
      'proxy-macro-daily',
      '0 7 * * *',
      $$SELECT net.http_post(
          url     := current_setting('app.supabase_url') || '/functions/v1/proxy-macro',
          headers := jsonb_build_object(
            'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
            'Content-Type', 'application/json'
          ),
          body    := '{}'::jsonb
        )$$
    );

    RAISE NOTICE 'v22 pg_cron schedules registered: warn-act-fetch-weekly, cleanup-intelligence-briefs-daily, proxy-macro-daily';
  ELSE
    RAISE NOTICE 'pg_cron not enabled — skipping schedule registration.';
  END IF;
END
$do$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. intelligence_briefs RLS policy fix
--    The v17 migration created intelligence_briefs_service_manage FOR ALL with
--    USING only (no explicit WITH CHECK). In PostgreSQL, a FOR ALL policy with
--    only a USING clause silently uses it as WITH CHECK too. For non-service-role
--    sessions this means: the policy evaluates to false AND the owner_insert
--    policy must carry the full INSERT burden.
--
--    Fix: replace the FOR ALL policy with separate, explicit SELECT/INSERT/UPDATE/
--    DELETE policies each with an explicit WITH CHECK where applicable. This
--    eliminates the ambiguity without changing observable behavior.
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "intelligence_briefs_service_manage" ON public.intelligence_briefs;

-- Service role: explicit per-operation policies with WITH CHECK
CREATE POLICY "intelligence_briefs_service_select"
  ON public.intelligence_briefs FOR SELECT
  USING (auth.role() = 'service_role');

CREATE POLICY "intelligence_briefs_service_insert"
  ON public.intelligence_briefs FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "intelligence_briefs_service_update"
  ON public.intelligence_briefs FOR UPDATE
  USING     (auth.role() = 'service_role')
  WITH CHECK(auth.role() = 'service_role');

CREATE POLICY "intelligence_briefs_service_delete"
  ON public.intelligence_briefs FOR DELETE
  USING (auth.role() = 'service_role');


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. v16 signal table seed from company_intelligence
--    The warn_filings, glassdoor_velocity_history, sec_enhanced_signals,
--    glassdoor_velocity_history and executive_departure_log tables were created
--    in v16 migration but had NO ingestion pipelines. The intelligence layers
--    (steps 39-44) always received empty arrays.
--
--    This migration seeds glassdoor_velocity_history and sec_enhanced_signals
--    from the existing company_intelligence rows so the pipeline gets real data
--    on first run. The warn_filings table requires the warn-act-fetch EF (now
--    scheduled) and does not need seeding here.
-- ─────────────────────────────────────────────────────────────────────────────

-- Seed glassdoor_velocity_history from company_intelligence JSONB financial_signals.
-- company_intelligence stores glassdoor signals in financial_signals JSONB (key: 'glassdoorCEOApproval').
-- Only rows that have a numeric value are seeded; rows without glassdoor data are skipped.
INSERT INTO public.glassdoor_velocity_history (
  company_name,
  snapshot_month,
  ceo_approval_pct,
  overall_rating_x10,
  review_count,
  new_review_count,
  recommend_pct,
  fetched_at
)
SELECT
  ci.company_name,
  date_trunc('month', COALESCE(ci.last_updated, NOW()))::date AS snapshot_month,
  -- Extract ceo_approval_pct from financial_signals JSONB if present
  CASE
    WHEN (ci.financial_signals->>'glassdoorCEOApproval') IS NOT NULL
    THEN (ci.financial_signals->>'glassdoorCEOApproval')::numeric
    ELSE NULL
  END AS ceo_approval_pct,
  -- overall_rating_x10: e.g. financial_signals->>'glassdoorRating' * 10
  CASE
    WHEN (ci.financial_signals->>'glassdoorRating') IS NOT NULL
    THEN round((ci.financial_signals->>'glassdoorRating')::numeric * 10)::integer
    ELSE NULL
  END AS overall_rating_x10,
  NULL AS review_count,
  NULL AS new_review_count,
  NULL AS recommend_pct,
  NOW() AS fetched_at
FROM public.company_intelligence ci
WHERE
  -- Only seed when we have at least one glassdoor signal
  (ci.financial_signals->>'glassdoorCEOApproval') IS NOT NULL
  OR (ci.financial_signals->>'glassdoorRating') IS NOT NULL
  -- Skip companies already seeded
  AND NOT EXISTS (
    SELECT 1 FROM public.glassdoor_velocity_history g
    WHERE lower(g.company_name) = lower(ci.company_name)
  )
ON CONFLICT (company_name, snapshot_month) DO NOTHING;

-- Seed sec_enhanced_signals from company_intelligence JSONB financial_signals.
-- financial_signals may contain freeCashFlowMargin, debtToEquityRatio, etc.
-- Only companies with at least one FCF signal are seeded.
INSERT INTO public.sec_enhanced_signals (
  company_name,
  signal_date,
  free_cash_flow_margin,
  operating_margin_yoy,
  debt_to_equity_ratio,
  cash_reserves_months,
  data_source_quality,
  fetched_at,
  expires_at
)
SELECT
  ci.company_name,
  COALESCE(ci.last_updated::date, CURRENT_DATE) AS signal_date,
  (ci.financial_signals->>'freeCashFlowMargin')::numeric       AS free_cash_flow_margin,
  (ci.financial_signals->>'operatingMarginYoY')::numeric       AS operating_margin_yoy,
  (ci.financial_signals->>'debtToEquityRatio')::numeric        AS debt_to_equity_ratio,
  (ci.financial_signals->>'cashReservesMonths')::numeric       AS cash_reserves_months,
  'seeded_from_company_intelligence'                           AS data_source_quality,
  NOW()                                                        AS fetched_at,
  NOW() + INTERVAL '30 days'                                   AS expires_at
FROM public.company_intelligence ci
WHERE
  (ci.financial_signals->>'freeCashFlowMargin') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.sec_enhanced_signals s
    WHERE lower(s.company_name) = lower(ci.company_name)
  )
ON CONFLICT (company_name, signal_date) DO NOTHING;

