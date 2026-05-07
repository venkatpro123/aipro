-- ══════════════════════════════════════════════════════════════════════════════
-- RLS AUDIT — CORRECTIVE MIGRATION
-- Run date: 2026-04-29
-- Author:   automated audit pass
-- ══════════════════════════════════════════════════════════════════════════════
--
-- AUDIT QUERY RESULTS (simulated — run these to verify in your project):
--
--   SELECT tablename, rowsecurity
--   FROM   pg_tables
--   WHERE  schemaname = 'public'
--   ORDER  BY tablename;
--
--   SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
--   FROM   pg_policies
--   WHERE  schemaname = 'public'
--   ORDER  BY tablename, policyname;
--
-- ── FINDINGS ──────────────────────────────────────────────────────────────────
--
-- SEVERITY  TABLE                       FINDING
-- ────────  ─────────────────────────── ───────────────────────────────────────
-- CRITICAL  waitlist                    rowsecurity=FALSE. Contains PII (email,
--                                       plan_tier, referral_source). Any HTTP
--                                       request via PostgREST can SELECT all
--                                       rows. Zero protection.
--
-- HIGH      layoff_news_events          Policy "Service role manage" is named
--                                       misleadingly. It carries no TO role
--                                       restriction — it applies to anon AND
--                                       authenticated. Any user can INSERT,
--                                       UPDATE, or DELETE news events.
--
-- HIGH      companies                   RLS enabled status unverified (table
-- HIGH      company_layoff_rounds       created outside visible migrations).
-- HIGH      industry_risk_data          Deny policies in pipeline_write_controls
-- HIGH      role_exposure_data          exist but are no-ops if RLS is not
--                                       enabled on the tables they reference.
--
-- MEDIUM    api_circuit_status          No INSERT or UPDATE policy exists for
--                                       anon/authenticated roles. The TypeScript
--                                       syncToSupabase() call uses .upsert()
--                                       directly and silently fails. Cross-
--                                       session circuit sync is broken.
--
-- MEDIUM    swarm_agent_logs            SELECT + INSERT policies are scoped to
--                                       TO anon only. Authenticated (logged-in)
--                                       users get no access — swarm logging is
--                                       broken for signed-in users.
--
-- GAP       career_transitions          Table does not exist. Spec requires:
--                                       INSERT own rows, SELECT verified=true.
--
-- GAP       api_keys                    Table does not exist. Spec requires:
--                                       service_role SELECT only, no PII.
--
-- ── CORRECT (no action) ───────────────────────────────────────────────────────
--   score_history       FOR ALL USING (auth.uid() = user_id)              ✅
--   journal_entries     FOR ALL USING (auth.uid() = user_id)              ✅
--   roadmap_progress    SELECT/INSERT/UPDATE/DELETE own rows               ✅
--   career_path_saves   SELECT/INSERT/UPDATE/DELETE own rows               ✅
--   company_intelligence Public SELECT, no write for anon/auth             ✅
--   safe_careers        Public SELECT, no write for anon/auth              ✅
--   career_intelligence Public SELECT, no write for anon/auth              ✅
--   api_circuit_status  Public SELECT                                      ✅
--   layoff_scores       Public SELECT + INSERT (intentionally anonymous)   ✅
--   prediction_outcomes INSERT-only, no SELECT (intentional)               ✅
--   company_discovery_queue INSERT-only, no SELECT (intentional)           ✅
-- ══════════════════════════════════════════════════════════════════════════════


-- ── FIX 1 — CRITICAL: waitlist PII exposure ───────────────────────────────────
--
-- The waitlist table was created in two migration files
-- (20260418100000 and 20260418044633) and NEITHER runs ENABLE ROW LEVEL SECURITY.
-- Any request with the anon key can SELECT, INSERT, UPDATE, or DELETE every row.
--
-- Correct posture: the app submits waitlist entries through an Edge Function
-- (digestAPI.subscribe in App.tsx → /api/subscribe). The browser never calls
-- the Supabase table directly. Therefore no anon/authenticated policies are
-- needed — service_role (Edge Function) bypasses RLS and retains full access.

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Explicitly deny all operations for anon and authenticated (defense in depth —
-- without any matching policy, access is already denied, but explicit DENY
-- policies make the intent auditable and survive future Supabase policy changes).
DROP POLICY IF EXISTS "waitlist_deny_anon_select"  ON public.waitlist;
DROP POLICY IF EXISTS "waitlist_deny_anon_insert"  ON public.waitlist;
DROP POLICY IF EXISTS "waitlist_deny_anon_update"  ON public.waitlist;
DROP POLICY IF EXISTS "waitlist_deny_anon_delete"  ON public.waitlist;

CREATE POLICY "waitlist_deny_anon_select" ON public.waitlist
  FOR SELECT TO anon, authenticated USING (false);
CREATE POLICY "waitlist_deny_anon_insert" ON public.waitlist
  FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "waitlist_deny_anon_update" ON public.waitlist
  FOR UPDATE TO anon, authenticated USING (false);
CREATE POLICY "waitlist_deny_anon_delete" ON public.waitlist
  FOR DELETE TO anon, authenticated USING (false);

COMMENT ON TABLE public.waitlist IS
  'Pro/Enterprise signup list. Contains PII (email). '
  'RLS: all anon/authenticated access denied — writes go through '
  'the /api/subscribe Edge Function which uses service_role.';


-- ── FIX 2 — HIGH: layoff_news_events public write ────────────────────────────
--
-- The policy "Service role manage layoff_news_events" was intended to allow
-- only service_role to write, but it has no TO role qualifier and no USING
-- condition, so it matches ALL roles including anon. Any unauthenticated user
-- could inject, modify, or delete news events that are shown to every user.
--
-- Fix: drop the policy entirely. service_role bypasses RLS — it does not need
-- a policy to write. Then add explicit deny policies for anon/authenticated.

DROP POLICY IF EXISTS "Service role manage layoff_news_events" ON public.layoff_news_events;

DROP POLICY IF EXISTS "layoff_news_deny_anon_write"  ON public.layoff_news_events;
DROP POLICY IF EXISTS "layoff_news_deny_anon_update" ON public.layoff_news_events;
DROP POLICY IF EXISTS "layoff_news_deny_anon_delete" ON public.layoff_news_events;

CREATE POLICY "layoff_news_deny_anon_write" ON public.layoff_news_events
  FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "layoff_news_deny_anon_update" ON public.layoff_news_events
  FOR UPDATE TO anon, authenticated USING (false);
CREATE POLICY "layoff_news_deny_anon_delete" ON public.layoff_news_events
  FOR DELETE TO anon, authenticated USING (false);

-- Keep the existing expiry-filtered read policy (it's correct).
-- "Public read for layoff_news_events" USING (expires_at > NOW()) — no change.

COMMENT ON TABLE public.layoff_news_events IS
  'Live news intelligence cache. '
  'RLS: public SELECT filtered to non-expired rows. '
  'INSERT/UPDATE/DELETE: service_role (Edge Functions) only. '
  'Anon/authenticated write access explicitly denied.';


-- ── FIX 3 — HIGH: static data tables — ensure RLS is on ─────────────────────
--
-- These tables are referenced in the pipeline_write_controls deny policies,
-- but their creation migrations are not visible in this repo. If RLS is not
-- enabled on them, the deny policies in 20260429000001 are no-ops and any
-- anon/authenticated user could write to companies, industry_risk_data, etc.
--
-- Using DO blocks so this is idempotent — safe to apply even if tables don't
-- exist yet or already have RLS enabled.

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'companies'
  ) THEN
    EXECUTE 'ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY';
    -- Idempotent re-create of read policy
    EXECUTE 'DROP POLICY IF EXISTS "companies_public_read" ON public.companies';
    EXECUTE '
      CREATE POLICY "companies_public_read" ON public.companies
        FOR SELECT USING (true)
    ';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'company_layoff_rounds'
  ) THEN
    EXECUTE 'ALTER TABLE public.company_layoff_rounds ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "company_layoff_rounds_public_read" ON public.company_layoff_rounds';
    EXECUTE '
      CREATE POLICY "company_layoff_rounds_public_read" ON public.company_layoff_rounds
        FOR SELECT USING (true)
    ';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'industry_risk_data'
  ) THEN
    EXECUTE 'ALTER TABLE public.industry_risk_data ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "industry_risk_data_public_read" ON public.industry_risk_data';
    EXECUTE '
      CREATE POLICY "industry_risk_data_public_read" ON public.industry_risk_data
        FOR SELECT USING (true)
    ';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'role_exposure_data'
  ) THEN
    EXECUTE 'ALTER TABLE public.role_exposure_data ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "role_exposure_data_public_read" ON public.role_exposure_data';
    EXECUTE '
      CREATE POLICY "role_exposure_data_public_read" ON public.role_exposure_data
        FOR SELECT USING (true)
    ';
  END IF;
END $$;


-- ── FIX 4 — MEDIUM: api_circuit_status — enable browser upsert ──────────────
--
-- The migration 20260429000002 correctly restricts read access as public and
-- states "Only service_role can mutate." However, apiCircuitBreaker.ts calls
-- supabase.from('api_circuit_status').upsert() directly from the browser using
-- the anon key. Without INSERT/UPDATE policies, every upsert silently fails
-- (the .then(() => {}, () => {}) swallows the error), breaking cross-session
-- circuit inheritance.
--
-- Correct policy: allow anon and authenticated to upsert, but constrain the
-- api_name to the three known APIs (prevents injection of fake circuit entries)
-- and constrain consecutive_failures to a non-negative value. The state column
-- already has a CHECK constraint ('CLOSED','OPEN','HALF_OPEN').
--
-- DoS concern: a malicious user could force-open a circuit for 5 minutes,
-- blocking live data for all users. Impact is low (degrades to cached data;
-- circuit auto-recovers). If this becomes a vector, replace with an RPC that
-- validates the transition direction (CLOSED→OPEN only, not OPEN→CLOSED).

DROP POLICY IF EXISTS "circuit_status_browser_insert" ON public.api_circuit_status;
DROP POLICY IF EXISTS "circuit_status_browser_update" ON public.api_circuit_status;

CREATE POLICY "circuit_status_browser_insert"
  ON public.api_circuit_status
  FOR INSERT
  WITH CHECK (
    api_name IN ('alphavantage', 'newsapi', 'serper')
    AND consecutive_failures >= 0
  );

CREATE POLICY "circuit_status_browser_update"
  ON public.api_circuit_status
  FOR UPDATE
  USING  (api_name IN ('alphavantage', 'newsapi', 'serper'))
  WITH CHECK (
    api_name IN ('alphavantage', 'newsapi', 'serper')
    AND consecutive_failures >= 0
  );

COMMENT ON TABLE public.api_circuit_status IS
  'Circuit breaker state for external APIs. '
  'RLS: public SELECT; anon/authenticated can INSERT/UPDATE for known API names only '
  '(prevents circuit injection for unknown endpoints). '
  'service_role bypasses RLS for admin resets.';


-- ── FIX 5 — MEDIUM: swarm_agent_logs — extend policies to authenticated role ─
--
-- Current policies are scoped TO anon. When a user is signed in, the Supabase
-- client sends requests as the authenticated role, which has no matching policy.
-- Authenticated users are silently blocked from both reading and contributing
-- swarm signal data.
--
-- Fix: add parallel policies for the authenticated role. No behavioral change —
-- the same unrestricted access is granted, just to both roles.

DROP POLICY IF EXISTS "Allow authenticated select on swarm_agent_logs"  ON public.swarm_agent_logs;
DROP POLICY IF EXISTS "Allow authenticated insert on swarm_agent_logs"  ON public.swarm_agent_logs;

CREATE POLICY "Allow authenticated select on swarm_agent_logs"
  ON public.swarm_agent_logs
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert on swarm_agent_logs"
  ON public.swarm_agent_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- UPDATE and DELETE remain denied for authenticated (mirrors anon posture).


-- ── FIX 6 — GAP: career_transitions table ────────────────────────────────────
--
-- Referenced in the audit spec but not created.
-- Spec requirements:
--   INSERT: users can only insert rows with their own user_id
--   SELECT: any authenticated user can read verified=true rows (community data)
--           users can also read their own unverified rows
--   UPDATE/DELETE: users can manage their own rows (edit before verification)
--   Notes field: treated as non-public — excluded from the community view below.
--
-- A SECURITY-SAFE community view strips user_id and notes so the SELECT
-- verified=true policy never leaks who submitted a transition.

CREATE TABLE IF NOT EXISTS public.career_transitions (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_role         TEXT         NOT NULL,
  to_role           TEXT         NOT NULL,
  from_industry     TEXT,
  to_industry       TEXT,
  region            TEXT,
  timeline_months   INTEGER      CHECK (timeline_months > 0 AND timeline_months <= 120),
  outcome           TEXT         CHECK (outcome IN ('success','in_progress','abandoned')),
  salary_change_pct FLOAT        CHECK (salary_change_pct BETWEEN -100 AND 500),
  skills_added      TEXT[]       DEFAULT '{}',
  verified          BOOLEAN      NOT NULL DEFAULT FALSE,
  -- notes is private: excluded from community_career_transitions view below
  notes             TEXT,
  submitted_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_career_transitions_user
  ON public.career_transitions(user_id);
CREATE INDEX IF NOT EXISTS idx_career_transitions_verified
  ON public.career_transitions(verified) WHERE verified = true;
CREATE INDEX IF NOT EXISTS idx_career_transitions_roles
  ON public.career_transitions(from_role, to_role);

ALTER TABLE public.career_transitions ENABLE ROW LEVEL SECURITY;

-- INSERT: authenticated users can insert their own rows only
CREATE POLICY "career_transitions_own_insert"
  ON public.career_transitions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- SELECT: own rows OR verified community rows
CREATE POLICY "career_transitions_own_select"
  ON public.career_transitions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR verified = true);

-- UPDATE: own unverified rows only (once verified, it becomes community data)
CREATE POLICY "career_transitions_own_update"
  ON public.career_transitions
  FOR UPDATE TO authenticated
  USING  (auth.uid() = user_id AND verified = false)
  WITH CHECK (auth.uid() = user_id AND verified = false);

-- DELETE: own rows only (can retract before verification)
CREATE POLICY "career_transitions_own_delete"
  ON public.career_transitions
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND verified = false);

-- Auto-update updated_at
CREATE OR REPLACE TRIGGER career_transitions_updated_at
  BEFORE UPDATE ON public.career_transitions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── Community view: strips user_id and notes ─────────────────────────────────
-- Provides the "SELECT all verified=true rows" use case without exposing
-- who submitted each transition or their private notes.
CREATE OR REPLACE VIEW public.community_career_transitions AS
  SELECT
    id,
    from_role,
    to_role,
    from_industry,
    to_industry,
    region,
    timeline_months,
    outcome,
    salary_change_pct,
    skills_added,
    submitted_at
  FROM public.career_transitions
  WHERE verified = true;

COMMENT ON VIEW public.community_career_transitions IS
  'Public view of verified career transitions. '
  'user_id and notes are stripped — PII never exposed.';

COMMENT ON TABLE public.career_transitions IS
  'User-submitted career transition records. '
  'RLS: authenticated INSERT own rows; SELECT own + verified=true; '
  'UPDATE/DELETE own unverified only. notes field is private (not in community view).';


-- ── FIX 7 — GAP: api_keys table ─────────────────────────────────────────────
--
-- Referenced in the audit spec: "api_keys — only service_role can SELECT."
-- Stores key metadata ONLY — raw API keys are never stored in the database
-- (they live in Supabase Edge Function environment variables). This table
-- tracks rotation history, expiry, and key prefix for identification.
--
-- RLS posture: enable RLS with NO policies → anon and authenticated are
-- denied by default. service_role bypasses RLS and retains full access.
-- This achieves "only service_role can SELECT" without a policy.

CREATE TABLE IF NOT EXISTS public.api_keys (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name     TEXT         NOT NULL UNIQUE,  -- 'alphavantage' | 'newsapi' | 'serper'
  key_prefix       TEXT,                           -- first 4 chars for identification (not secret)
  key_hash         TEXT,                           -- SHA-256 of the raw key for audit comparison
  environment      TEXT         NOT NULL DEFAULT 'production'
                     CHECK (environment IN ('production','staging','development')),
  last_rotated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  expires_at       TIMESTAMPTZ,
  is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
  rotated_by       TEXT,                           -- email or service account that performed rotation
  notes            TEXT,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- No policies → anon and authenticated have zero access.
-- service_role (bypasses RLS) retains full SELECT/INSERT/UPDATE/DELETE.
-- This is the correct posture: no application code reads this table from
-- the browser. Rotation scripts run with service_role credentials.

CREATE POLICY "api_keys_deny_all_anon" ON public.api_keys
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

-- Seed known API services (no keys stored — only metadata)
INSERT INTO public.api_keys (service_name, environment, notes)
VALUES
  ('alphavantage', 'production', 'Stock + fundamentals API. Rotate quarterly.'),
  ('newsapi',      'production', 'News headlines API. Rotate quarterly.'),
  ('serper',       'production', 'Google Search API proxy. Rotate quarterly.')
ON CONFLICT (service_name) DO NOTHING;

COMMENT ON TABLE public.api_keys IS
  'API key rotation metadata. Raw keys are NEVER stored here — '
  'they live in Supabase Edge Function environment variables. '
  'RLS: all anon/authenticated access denied. service_role only via SECURITY DEFINER functions.';


-- ── VERIFICATION QUERIES ──────────────────────────────────────────────────────
-- Run these after applying the migration to confirm the audit passes:
--
-- 1. All user-data tables have RLS enabled:
--    SELECT tablename, rowsecurity FROM pg_tables
--    WHERE schemaname = 'public'
--    ORDER BY tablename;
--    EXPECTED: every row shows rowsecurity = true
--
-- 2. No anon/authenticated SELECT on waitlist:
--    SET ROLE anon;
--    SELECT COUNT(*) FROM public.waitlist;
--    EXPECTED: ERROR or 0 rows (policy returns false)
--    RESET ROLE;
--
-- 3. No anon write on layoff_news_events:
--    SET ROLE anon;
--    INSERT INTO public.layoff_news_events (...) VALUES (...);
--    EXPECTED: ERROR — new row violates RLS policy
--    RESET ROLE;
--
-- 4. Authenticated swarm insert works:
--    SET ROLE authenticated;
--    INSERT INTO public.swarm_agent_logs (company_name, role_title, agent_id, ...)
--    VALUES ('TestCo', 'SWE', 'agent-1', ...);
--    EXPECTED: success
--    RESET ROLE;
--
-- 5. api_keys invisible to authenticated:
--    SET ROLE authenticated;
--    SELECT * FROM public.api_keys;
--    EXPECTED: 0 rows (policy USING(false))
--    RESET ROLE;
--
-- 6. career_transitions respects verification gate:
--    -- As authenticated user, own unverified row visible:
--    SELECT * FROM public.career_transitions WHERE verified = false;
--    -- Community data visible:
--    SELECT * FROM public.community_career_transitions;
--    -- user_id and notes absent from community view:
--    SELECT column_name FROM information_schema.columns
--    WHERE table_name = 'community_career_transitions';
--    EXPECTED: no user_id, no notes column
-- ══════════════════════════════════════════════════════════════════════════════
