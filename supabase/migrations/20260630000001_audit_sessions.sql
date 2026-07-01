-- ── AUDIT SESSIONS ────────────────────────────────────────────────────────────
-- Stores the full HybridResult for each completed layoff audit.
-- Supabase is the primary source of truth; localStorage/IndexedDB are caches.
-- Dedup key: (user_id, client_id) — client_id is a UUID minted per calculation.

CREATE TABLE IF NOT EXISTS public.audit_sessions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name     TEXT        NOT NULL,
  role_title       TEXT        NOT NULL DEFAULT '',
  department       TEXT        NOT NULL DEFAULT '',
  oracle_key       TEXT,
  industry_key     TEXT,
  work_type_key    TEXT,
  country_key      TEXT,
  score            INTEGER     NOT NULL,
  source           TEXT        NOT NULL DEFAULT 'job'
                               CHECK (source IN ('job', 'skill', 'human-index')),
  tier_label       TEXT,
  tier_color       TEXT,
  confidence       NUMERIC(5,4),
  reasoning        TEXT,
  recommendations  JSONB       NOT NULL DEFAULT '[]'::JSONB,
  hybrid_result    JSONB       NOT NULL,          -- full HybridResult snapshot
  data_quality     TEXT        CHECK (data_quality IN ('live', 'partial', 'fallback')),
  data_version     TEXT        NOT NULL DEFAULT '2026-Q2',
  app_version      TEXT        NOT NULL DEFAULT '3.0',
  client_id        TEXT        NOT NULL DEFAULT '',  -- crypto.randomUUID() from client
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (user_id, client_id)
);

-- Fast lookup: user's audit history, newest first
CREATE INDEX IF NOT EXISTS idx_audit_sessions_user_created
  ON public.audit_sessions (user_id, created_at DESC);

-- Company-scoped lookup for drift detection
CREATE INDEX IF NOT EXISTS idx_audit_sessions_company
  ON public.audit_sessions (user_id, company_name);

ALTER TABLE public.audit_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_sessions_user_all"
  ON public.audit_sessions FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ── USER AUDIT DATA ───────────────────────────────────────────────────────────
-- One row per user; holds skill selections, quiz answers, and completion flags.
-- Upserted on every relevant user action so it stays current.

CREATE TABLE IF NOT EXISTS public.user_audit_data (
  user_id            UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_selections   JSONB       NOT NULL DEFAULT '[]'::JSONB,
  skill_breakdown    JSONB       NOT NULL DEFAULT '[]'::JSONB,
  skill_intents      JSONB       NOT NULL DEFAULT '{}'::JSONB,
  quiz_answers       JSONB       NOT NULL DEFAULT '{}'::JSONB,
  completion_flags   JSONB       NOT NULL DEFAULT '{}'::JSONB,  -- { job, skill, hii }
  score_goal         JSONB,                                     -- ScoreGoal | null
  roadmap_start_date TEXT,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_audit_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_audit_data_user_all"
  ON public.user_audit_data FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ── SHARED updated_at TRIGGER ─────────────────────────────────────────────────
-- Idempotent — safe to re-run if the function already exists.

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Drop before recreate so migration is idempotent
DROP TRIGGER IF EXISTS audit_sessions_updated_at ON public.audit_sessions;
CREATE TRIGGER audit_sessions_updated_at
  BEFORE UPDATE ON public.audit_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS user_audit_data_updated_at ON public.user_audit_data;
CREATE TRIGGER user_audit_data_updated_at
  BEFORE UPDATE ON public.user_audit_data
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
