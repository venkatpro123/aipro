-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260515000005_v36_user_profile_role_fields.sql
-- Purpose:   v36.0 HIGH-10 — Add role identity fields to user_profiles so the
--            ProfileSetupModal wizard can capture job title, industry sector,
--            and total career experience. These drive seniority bracket
--            derivation (seniorityPool dispatch) and negotiation script
--            selection in the 54-layer audit pipeline.
--
-- user_profiles columns added:
--   job_title         TEXT         — free-text job title (resolves to canonicalKey)
--   industry_key      TEXT         — 10-bucket industry slug
--   years_experience  INTEGER      — total professional years across all employers
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS job_title        TEXT,
  ADD COLUMN IF NOT EXISTS industry_key     TEXT,
  ADD COLUMN IF NOT EXISTS years_experience INTEGER;
