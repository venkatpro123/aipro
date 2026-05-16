-- Migration: 20260516000009_v39_brief_profile_signature.sql
-- v39.0 Phase B2 — Profile-aware intelligence brief cache.
--
-- Adds two columns to intelligence_briefs so the cache can correctly invalidate
-- when (a) a user's profile signature changes (different visa / runway /
-- dependents combination) or (b) the cohort classification flips.
--
-- Without these, two users at the same company + role + score-bucket get the
-- IDENTICAL cached brief — the v39.0 audit flagged this as Personalization
-- Theater (P1).
--
-- Idempotent — safe to re-run.

ALTER TABLE public.intelligence_briefs
  ADD COLUMN IF NOT EXISTS profile_signature text;

ALTER TABLE public.intelligence_briefs
  ADD COLUMN IF NOT EXISTS cohort_at_generation text;

-- Tightened lookup index: cache hits must match (company, role, profile_signature,
-- cohort) to avoid serving a profile-mismatched brief. Old index stays for
-- backwards-compat lookups during the transition.
CREATE INDEX IF NOT EXISTS idx_intelligence_briefs_lookup_v39
  ON public.intelligence_briefs (
    lower(company_name),
    lower(role_title),
    profile_signature,
    cohort_at_generation,
    expires_at DESC
  );

COMMENT ON COLUMN public.intelligence_briefs.profile_signature IS
  'v39.0 B2 — compact hash of profile signals (visa, runway tier, dependents) used to cache-key per-profile briefs. Format: "v:h1b,r:critical,fam:1" or similar.';

COMMENT ON COLUMN public.intelligence_briefs.cohort_at_generation IS
  'v39.0 B2 — cohort classification at the time the brief was generated. Used to bust cache when STABLE → DISTRESS or similar flips.';
