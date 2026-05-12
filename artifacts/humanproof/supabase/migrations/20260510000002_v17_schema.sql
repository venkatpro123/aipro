-- v17.0 Intelligence Platform Schema
-- Adds caching tables for: prediction horizons, skill gap assessments, AI intelligence briefs

-- ─────────────────────────────────────────────────────────────────────────────
-- Table 1: prediction_horizons
-- Caches 30d/90d/180d horizon risk scores per user/company/role.
-- TTL: 24 hours. Invalidated when base score shifts > 5 pts.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.prediction_horizons (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL,
  company_name         text NOT NULL,
  role_key             text NOT NULL,
  base_score           numeric(5,2),
  score_30d            numeric(5,2) NOT NULL,
  score_90d            numeric(5,2) NOT NULL,
  score_180d           numeric(5,2) NOT NULL,
  confidence_30d       numeric(4,3) NOT NULL,
  confidence_90d       numeric(4,3) NOT NULL,
  confidence_180d      numeric(4,3) NOT NULL,
  dominant_signal_30d  text,
  dominant_signal_90d  text,
  dominant_signal_180d text,
  trajectory_narrative text,
  computed_at          timestamptz NOT NULL DEFAULT now(),
  expires_at           timestamptz NOT NULL DEFAULT (now() + INTERVAL '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_prediction_horizons_lookup
  ON public.prediction_horizons (user_id, lower(company_name), role_key, expires_at DESC);

ALTER TABLE public.prediction_horizons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prediction_horizons_owner_access"
  ON public.prediction_horizons FOR ALL
  USING (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- Table 2: skill_gap_assessments
-- Caches skill gap analysis per user/company/role.
-- TTL: 7 days. Cache key includes skills snapshot for invalidation.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.skill_gap_assessments (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL,
  company_name         text NOT NULL,
  role_key             text NOT NULL,
  gap_score            numeric(5,2) NOT NULL,
  market_readiness_pct numeric(5,2) NOT NULL,
  readiness_label      text NOT NULL,
  upskill_priority     jsonb NOT NULL DEFAULT '[]',
  existing_strengths   text[] NOT NULL DEFAULT '{}',
  critical_gaps        text[] NOT NULL DEFAULT '{}',
  narrative_summary    text,
  self_rated_skills    text[] NOT NULL DEFAULT '{}',
  target_skills        text[] NOT NULL DEFAULT '{}',
  computed_at          timestamptz NOT NULL DEFAULT now(),
  expires_at           timestamptz NOT NULL DEFAULT (now() + INTERVAL '7 days')
);

CREATE INDEX IF NOT EXISTS idx_skill_gap_lookup
  ON public.skill_gap_assessments (user_id, lower(company_name), role_key, expires_at DESC);

ALTER TABLE public.skill_gap_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "skill_gap_assessments_owner_access"
  ON public.skill_gap_assessments FOR ALL
  USING (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- Table 3: intelligence_briefs
-- Caches AI-generated strategic briefs.
-- user_id is nullable to support anonymous sessions.
-- TTL: 24 hours. Score-based invalidation: stale if |current - cached| > 5 pts.
-- Public read policy: content is company/role level, not user-sensitive.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.intelligence_briefs (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid,
  company_name         text NOT NULL,
  role_title           text NOT NULL,
  engine_score         numeric(5,2) NOT NULL,
  score_at_generation  numeric(5,2) NOT NULL,
  paragraph_situation  text NOT NULL,
  paragraph_risks      text NOT NULL,
  paragraph_actions    text NOT NULL,
  urgency_level        text NOT NULL CHECK (urgency_level IN ('CRITICAL','HIGH','MODERATE','LOW')),
  key_risk_driver      text NOT NULL,
  top_action           text NOT NULL,
  model_used           text NOT NULL,
  tokens_used          integer,
  generated_at         timestamptz NOT NULL DEFAULT now(),
  expires_at           timestamptz NOT NULL DEFAULT (now() + INTERVAL '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_intelligence_briefs_lookup
  ON public.intelligence_briefs (user_id, lower(company_name), lower(role_title), expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_intelligence_briefs_score
  ON public.intelligence_briefs (score_at_generation, expires_at);

ALTER TABLE public.intelligence_briefs ENABLE ROW LEVEL SECURITY;

-- Anyone can read briefs (company-level intelligence, not personal data)
CREATE POLICY "intelligence_briefs_public_read"
  ON public.intelligence_briefs FOR SELECT
  USING (true);

-- Authenticated users can insert their own briefs
CREATE POLICY "intelligence_briefs_owner_insert"
  ON public.intelligence_briefs FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Service role manages all (cleanup, expiry jobs)
CREATE POLICY "intelligence_briefs_service_manage"
  ON public.intelligence_briefs FOR ALL
  USING (auth.role() = 'service_role');

-- Cleanup function for expired briefs (call via pg_cron or edge function)
CREATE OR REPLACE FUNCTION public.cleanup_expired_intelligence_briefs()
RETURNS void AS $$
BEGIN
  DELETE FROM public.intelligence_briefs WHERE expires_at < now();
  DELETE FROM public.prediction_horizons WHERE expires_at < now();
  DELETE FROM public.skill_gap_assessments WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
