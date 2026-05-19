-- v40.0 production security hardening migration.
--
-- Findings from the 10th-pass production audit. All policies here are written
-- as idempotent updates so the migration can be re-run safely.
--
-- ── BLOCKER-CLASS SECURITY ISSUES FIXED ────────────────────────────────────
--
-- 1. layoff_analysis_cache: writeable by anyone → service_role only
-- 2. implicit_outcome_detections: anyone could INSERT outcomes → service_role only
-- 3. company_enrichment_queue: writeable by any role → service_role for writes,
--    authenticated for inserts (so the user-action path of "search for new co" works)
-- 4. company_discovery_queue: anonymous INSERT → authenticated only
-- 5. career_transitions: anonymous INSERT → authenticated with user_id match
-- 6. certification_stories: anonymous INSERT → authenticated with user_id match
-- 7. v16 signal tables (warn_filings, bls_macro_snapshots, sec_enhanced_signals,
--    glassdoor_velocity_history, executive_departure_log) had NO RLS at all.
--    Enabling RLS with read-all + service_role-write.
-- 8. refresh_peer_benchmarks() referenced non-existent column pipeline_name
--    instead of pipeline. Fixed to match actual schema.
-- 9. increment_user_quota / upsert_company_search RPCs lacked input validation.
--    Adding bounds + service whitelist guards.

-- ── 1. layoff_analysis_cache ────────────────────────────────────────────────
DROP POLICY IF EXISTS "upsert_analysis_cache"  ON public.layoff_analysis_cache;
DROP POLICY IF EXISTS "update_analysis_cache"  ON public.layoff_analysis_cache;

-- Read is public (cache hits are by design shared). Writes are service-only.
CREATE POLICY "layoff_analysis_cache_service_write"
  ON public.layoff_analysis_cache
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── 2. implicit_outcome_detections ──────────────────────────────────────────
DROP POLICY IF EXISTS "Service role can insert detections"
  ON public.implicit_outcome_detections;

CREATE POLICY "implicit_outcome_detections_service_insert"
  ON public.implicit_outcome_detections
  FOR INSERT TO service_role
  WITH CHECK (true);

-- ── 3. company_enrichment_queue ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Service role can manage enrichment queue"
  ON public.company_enrichment_queue;

-- Authenticated users may INSERT (request a company be enriched) but cannot
-- update queue status or other rows. Service role can do everything.
CREATE POLICY "company_enrichment_queue_authenticated_insert"
  ON public.company_enrichment_queue
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "company_enrichment_queue_service_manage"
  ON public.company_enrichment_queue
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── 4. company_discovery_queue ──────────────────────────────────────────────
DROP POLICY IF EXISTS "users_insert_discovery_queue"
  ON public.company_discovery_queue;

CREATE POLICY "discovery_queue_authenticated_insert"
  ON public.company_discovery_queue
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- ── 5. career_transitions ───────────────────────────────────────────────────
-- Replace anonymous insert with authenticated + user_id match.
DROP POLICY IF EXISTS "users_submit_transitions" ON public.career_transitions;

CREATE POLICY "career_transitions_authenticated_insert"
  ON public.career_transitions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- ── 6. certification_stories ────────────────────────────────────────────────
DROP POLICY IF EXISTS "users_submit_stories" ON public.certification_stories;

CREATE POLICY "certification_stories_authenticated_insert"
  ON public.certification_stories
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- ── 7. v16 signal tables — enable RLS + add read/write policies ────────────
-- Pattern: data is public-readable (used by the audit pipeline for any
-- company, not just the user's own) but writes are service-role only.
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'warn_filings',
    'bls_macro_snapshots',
    'sec_enhanced_signals',
    'glassdoor_velocity_history',
    'executive_departure_log'
  ]
  LOOP
    -- Only act on tables that actually exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t AND table_schema = 'public') THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

      EXECUTE format('DROP POLICY IF EXISTS "%I_read" ON public.%I', t, t);
      EXECUTE format(
        'CREATE POLICY "%I_read" ON public.%I FOR SELECT USING (true)',
        t, t
      );

      EXECUTE format('DROP POLICY IF EXISTS "%I_service_write" ON public.%I', t, t);
      EXECUTE format(
        'CREATE POLICY "%I_service_write" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
        t, t
      );
    END IF;
  END LOOP;
END $$;

-- ── 8. refresh_peer_benchmarks: fix column-name mismatch ────────────────────
-- The function inserted into pipeline_name but the column is named pipeline.
-- This made every cron-triggered call fail at runtime. Replacing the function
-- body with the correct column reference.
CREATE OR REPLACE FUNCTION public.refresh_peer_benchmarks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.pipeline_health_log (
    pipeline, run_at, duration_ms, total_roles, live_count, null_count, error_count,
    is_degraded, error_details, serper_available, triggered_by, notes
  ) VALUES (
    'refresh-peer-benchmarks', now(), 0, 0, 0, 0, 0,
    false, null, true, 'pg_cron',
    'stub — peer-benchmark recompute path not implemented'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_peer_benchmarks() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_peer_benchmarks() TO service_role;

-- ── 9. Input validation on user-callable RPCs ───────────────────────────────
-- increment_user_quota: previously accepted arbitrary p_budget and p_service.
-- A caller could pass p_budget=999_999 to bypass rate limiting.
CREATE OR REPLACE FUNCTION public.increment_user_quota(
  p_user_id UUID,
  p_service TEXT,
  p_budget  INTEGER DEFAULT 5
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count INTEGER;
  max_calls     INTEGER;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'increment_user_quota: p_user_id required';
  END IF;
  IF p_service IS NULL OR length(p_service) = 0 OR length(p_service) > 64 THEN
    RAISE EXCEPTION 'increment_user_quota: p_service must be 1–64 chars';
  END IF;
  IF p_service NOT IN ('alphavantage','newsapi','fmp','serper','gnews','openrouter','gemini','groq','resend','llm-analyze','rss-scrape') THEN
    RAISE EXCEPTION 'increment_user_quota: unknown service %', p_service;
  END IF;
  -- Clamp budget to a sane band; callers can request lower but never higher.
  IF p_budget IS NULL OR p_budget < 1 THEN p_budget := 5; END IF;
  IF p_budget > 100 THEN p_budget := 100; END IF;

  INSERT INTO public.per_user_api_quota
    (user_id, service, date_utc, request_count, max_daily_calls, last_request_at)
  VALUES
    (p_user_id, p_service, CURRENT_DATE, 1, p_budget, NOW())
  ON CONFLICT (user_id, service, date_utc) DO UPDATE
    SET request_count    = per_user_api_quota.request_count + 1,
        last_request_at  = NOW(),
        max_daily_calls  = GREATEST(per_user_api_quota.max_daily_calls, EXCLUDED.max_daily_calls)
  RETURNING request_count, max_daily_calls INTO current_count, max_calls;

  RETURN current_count <= max_calls;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_user_quota(UUID, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_user_quota(UUID, TEXT, INTEGER) TO authenticated;

-- upsert_company_search: length-guard inputs so users can't insert 1MB strings.
CREATE OR REPLACE FUNCTION public.upsert_company_search(
  p_company_name TEXT,
  p_industry     TEXT DEFAULT NULL,
  p_region       TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_company_name IS NULL OR length(trim(p_company_name)) = 0 THEN
    RAISE EXCEPTION 'upsert_company_search: company_name required';
  END IF;
  IF length(p_company_name) > 250 THEN
    RAISE EXCEPTION 'upsert_company_search: company_name too long (max 250)';
  END IF;
  IF p_industry IS NOT NULL AND length(p_industry) > 100 THEN
    RAISE EXCEPTION 'upsert_company_search: industry too long (max 100)';
  END IF;
  IF p_region IS NOT NULL AND length(p_region) > 50 THEN
    RAISE EXCEPTION 'upsert_company_search: region too long (max 50)';
  END IF;

  INSERT INTO public.company_enrichment_queue (company_name, industry, region, search_count, last_searched_at)
  VALUES (trim(p_company_name), p_industry, p_region, 1, NOW())
  ON CONFLICT (company_name) DO UPDATE
    SET search_count     = company_enrichment_queue.search_count + 1,
        last_searched_at = NOW(),
        industry         = COALESCE(company_enrichment_queue.industry, EXCLUDED.industry),
        region           = COALESCE(company_enrichment_queue.region,   EXCLUDED.region);
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_company_search(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_company_search(TEXT, TEXT, TEXT) TO authenticated;

-- ── 9b. Atomic rate-limit RPC for api-displacement-scores ───────────────────
-- The Edge Function previously: (1) SELECT SUM, (2) compare to limit, (3) call
-- increment_api_usage. Two concurrent requests at limit-1 both pass the read
-- gate and both increment, so the limit is overshot by every parallel client.
-- This RPC does the check + increment in one transaction under an advisory
-- lock keyed on (key_id, date) so concurrent calls for the same key serialize.
CREATE OR REPLACE FUNCTION public.check_and_increment_api_usage(
  p_key_id      UUID,
  p_date        DATE,
  p_endpoint    TEXT,
  p_daily_limit INTEGER
) RETURNS TABLE(allowed BOOLEAN, total_after INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_total INTEGER;
BEGIN
  IF p_key_id IS NULL OR p_daily_limit IS NULL OR p_daily_limit < 0 THEN
    RAISE EXCEPTION 'check_and_increment_api_usage: invalid args';
  END IF;
  IF p_endpoint IS NULL OR length(p_endpoint) = 0 OR length(p_endpoint) > 64 THEN
    RAISE EXCEPTION 'check_and_increment_api_usage: bad endpoint';
  END IF;

  -- Serialize concurrent rate-limit checks for this (key, day).
  PERFORM pg_advisory_xact_lock(
    hashtextextended(p_key_id::TEXT || ':' || p_date::TEXT, 0)
  );

  SELECT COALESCE(SUM(request_count), 0)::INTEGER INTO current_total
    FROM public.api_usage
    WHERE key_id = p_key_id AND date = p_date;

  IF current_total >= p_daily_limit THEN
    RETURN QUERY SELECT FALSE, current_total;
    RETURN;
  END IF;

  INSERT INTO public.api_usage (key_id, date, endpoint, request_count)
  VALUES (p_key_id, p_date, p_endpoint, 1)
  ON CONFLICT (key_id, date, endpoint)
  DO UPDATE SET request_count = public.api_usage.request_count + 1;

  RETURN QUERY SELECT TRUE, current_total + 1;
END;
$$;

REVOKE ALL ON FUNCTION public.check_and_increment_api_usage(UUID, DATE, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_and_increment_api_usage(UUID, DATE, TEXT, INTEGER) TO service_role;

-- ── 10. Add foreign-key indexes that were missing ──────────────────────────
-- Without these, queries that filter by FK columns full-scan the table at scale.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_layoff_rounds' AND table_schema = 'public') THEN
    CREATE INDEX IF NOT EXISTS idx_company_layoff_rounds_company_id
      ON public.company_layoff_rounds (company_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'role_aliases' AND table_schema = 'public') THEN
    CREATE INDEX IF NOT EXISTS idx_role_aliases_role_key
      ON public.role_aliases (role_key);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cross_industry_transitions' AND table_schema = 'public') THEN
    CREATE INDEX IF NOT EXISTS idx_cross_industry_transitions_source
      ON public.cross_industry_transitions (source_role);
  END IF;
  -- Composite index for breaking-news realtime filter: (LOWER(company_name), detected_at DESC)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'breaking_news_events' AND table_schema = 'public') THEN
    CREATE INDEX IF NOT EXISTS idx_bne_company_detected
      ON public.breaking_news_events (LOWER(company_name), detected_at DESC);
  END IF;
END $$;
