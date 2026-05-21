-- ════════════════════════════════════════════════════════════════════════════
-- v40.0 — Persistent locale preference per user
-- Adds preferred_locale column to user_profiles so language choice survives
-- device switches (previously only persisted in localStorage).
--
-- SUPPORTED LOCALES (v40.0 Phase 22):
--   en (English - source of truth)
--   es (Spanish - LatAm 500M+ + US Hispanic market)
--   pt (Portuguese - Brazil 215M)
--   fr (French)
--   de (German)
--   hi (Hindi - India tier-2/tier-3 + Hindi-comfortable workforce)
--   ja (Japanese)
--   zh (Chinese)
--
-- BUG THIS FIXES:
--   localStorage-only locale was lost when users switched browsers/devices.
--   Spanish-speaking LatAm users would re-land on English on every new device
--   and have to re-pick their language, losing trust. Persisting at the user
--   profile level means the locale follows the user across devices.
--
-- ROLLOUT:
--   New column is NULLABLE — existing rows are not backfilled. AuthContext
--   reads localStorage as the source of truth until the user explicitly
--   changes language while signed in, at which point we write to both.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS preferred_locale TEXT
    CHECK (preferred_locale IS NULL OR preferred_locale IN ('en','es','pt','fr','de','hi','ja','zh'));

-- Index for queries that segment by locale (e.g. analytics on Tier B
-- engagement per language, calibration cohorts by region).
CREATE INDEX IF NOT EXISTS idx_user_profiles_preferred_locale
  ON user_profiles (preferred_locale)
  WHERE preferred_locale IS NOT NULL;

COMMENT ON COLUMN user_profiles.preferred_locale IS 'v40.0: persisted UI locale. NULL means use browser default or stored localStorage. One of: en, es, pt, fr, de, hi, ja, zh.';

-- ─── Rollback (uncomment + run to revert) ───────────────────────────────────
-- DROP INDEX IF EXISTS idx_user_profiles_preferred_locale;
-- ALTER TABLE user_profiles DROP COLUMN IF EXISTS preferred_locale;
