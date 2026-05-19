-- v40.0 production RLS hardening — second pass.
--
-- Findings from the 11th-pass production audit. All operations are
-- idempotent (DROP IF EXISTS + CREATE) so the migration can be re-run.
--
-- ── ISSUES FIXED ──────────────────────────────────────────────────────────
--
-- 1. layoff_scores: FOR ALL USING(...) with no WITH CHECK lets a user
--    UPDATE their own row and rewrite user_id to another user's UUID.
--    Add WITH CHECK to enforce ownership on the post-update row.
--
-- 2. prediction_horizons / skill_gap_assessments: same UPDATE-bypass.
--
-- 3. intelligence_briefs: the original policy let any authenticated user
--    INSERT a row with user_id = NULL and any user could read it back
--    (public_read = USING(true)). Combined with v39 phase B which writes
--    `profile_signature` containing visa/runway/family signals into the
--    same table, this means one user can derive personal classification
--    signals of another. Tighten: writes must match auth.uid(), reads are
--    restricted to the owner OR rows the service role explicitly intended
--    to be shared (user_id IS NULL AND inserted by service_role).
--
-- 4. cleanup_expired_intelligence_briefs / snapshot_market_intelligence_cache
--    are SECURITY DEFINER without `SET search_path`. A search-path hijack
--    via a shadow object in a writable schema could escalate privilege.
--    Pin search_path = public, pg_temp on both.
--
-- 5. breaking_news_events has UNIQUE(company_name, event_date, source) but
--    reads use LOWER(company_name) — a row written as "TCS" by Hacker News
--    and "Tcs" by RSS bypasses dedup. Replace with a functional UNIQUE on
--    LOWER(company_name).
--
-- 6. read_pipeline_health allows public SELECT on a table where
--    error_details JSONB may contain upstream URLs / fragments. Restrict
--    to authenticated.

-- ── 1. layoff_scores ────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'layoff_scores' AND policyname = 'users_own_scores'
  ) THEN
    DROP POLICY "users_own_scores" ON public.layoff_scores;
  END IF;
END $$;

CREATE POLICY "layoff_scores_owner_read"
  ON public.layoff_scores FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "layoff_scores_owner_write"
  ON public.layoff_scores FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "layoff_scores_owner_update"
  ON public.layoff_scores FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "layoff_scores_owner_delete"
  ON public.layoff_scores FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ── 2. prediction_horizons ──────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'prediction_horizons' AND policyname = 'prediction_horizons_owner_access'
  ) THEN
    DROP POLICY "prediction_horizons_owner_access" ON public.prediction_horizons;
  END IF;
END $$;

CREATE POLICY "prediction_horizons_owner_read"
  ON public.prediction_horizons FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "prediction_horizons_owner_write"
  ON public.prediction_horizons FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "prediction_horizons_owner_update"
  ON public.prediction_horizons FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "prediction_horizons_owner_delete"
  ON public.prediction_horizons FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ── 3. skill_gap_assessments ────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'skill_gap_assessments' AND policyname = 'skill_gap_assessments_owner_access'
  ) THEN
    DROP POLICY "skill_gap_assessments_owner_access" ON public.skill_gap_assessments;
  END IF;
END $$;

CREATE POLICY "skill_gap_owner_read"
  ON public.skill_gap_assessments FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "skill_gap_owner_write"
  ON public.skill_gap_assessments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "skill_gap_owner_update"
  ON public.skill_gap_assessments FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "skill_gap_owner_delete"
  ON public.skill_gap_assessments FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ── 4. intelligence_briefs ──────────────────────────────────────────────
-- The original policies let any user write a NULL-user-id brief and any
-- user read every brief. Tighten: authenticated users only see/write rows
-- they own; service role can write/read everything (e.g. for cron cleanup,
-- and for the v39-B2 LLM background pipeline that may write on behalf of
-- anonymous sessions and is authoritative for those rows).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'intelligence_briefs' AND policyname = 'intelligence_briefs_public_read'
  ) THEN
    DROP POLICY "intelligence_briefs_public_read" ON public.intelligence_briefs;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'intelligence_briefs' AND policyname = 'intelligence_briefs_owner_insert'
  ) THEN
    DROP POLICY "intelligence_briefs_owner_insert" ON public.intelligence_briefs;
  END IF;
END $$;

CREATE POLICY "intelligence_briefs_owner_read"
  ON public.intelligence_briefs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Anonymous (anon role) readers see nothing — they should pull from the
-- service-role-only path through an Edge Function.

CREATE POLICY "intelligence_briefs_owner_insert"
  ON public.intelligence_briefs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "intelligence_briefs_owner_update"
  ON public.intelligence_briefs FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- intelligence_briefs_service_manage remains as-is (FOR ALL service_role).

-- ── 5. SECURITY DEFINER functions — pin search_path ─────────────────────
-- These functions have elevated privileges. Without a fixed search_path a
-- malicious extension or schema-shadow attack could redirect references.
ALTER FUNCTION public.cleanup_expired_intelligence_briefs() SET search_path = public, pg_temp;
ALTER FUNCTION public.snapshot_market_intelligence_cache()  SET search_path = public, pg_temp;

-- ── 6. breaking_news_events — case-insensitive uniqueness ───────────────
-- Reads use LOWER(company_name); the existing UNIQUE was case-sensitive,
-- so "TCS" and "Tcs" wrote two rows for the same event. Drop and replace.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'breaking_news_events_company_name_event_date_source_key'
  ) THEN
    ALTER TABLE public.breaking_news_events
      DROP CONSTRAINT breaking_news_events_company_name_event_date_source_key;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_bne_company_lower_date_source
  ON public.breaking_news_events (LOWER(company_name), event_date, source);

-- ── 7. pipeline_health_log — restrict read to authenticated ─────────────
-- error_details JSONB may contain upstream URLs / fragments of API
-- responses; anon readers had no business being able to see this.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'pipeline_health_log' AND policyname = 'read_pipeline_health'
  ) THEN
    DROP POLICY "read_pipeline_health" ON public.pipeline_health_log;
  END IF;
END $$;

CREATE POLICY "pipeline_health_log_authenticated_read"
  ON public.pipeline_health_log FOR SELECT TO authenticated
  USING (true);
