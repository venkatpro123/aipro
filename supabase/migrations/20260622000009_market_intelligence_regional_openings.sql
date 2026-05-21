-- ════════════════════════════════════════════════════════════════════════════
-- v40.0 — Region-aware market intelligence
-- Adds regional_openings JSONB column to market_intelligence_cache so the
-- LLM intelligence brief can cite region-appropriate job-board data
-- (StepStone/XING for Germany, Reed for UK, Naukri for India, etc.)
-- instead of defaulting to India-only fields for every user.
--
-- BUG THIS FIXES:
--   A Berlin user auditing a German company received Naukri (India) opening
--   counts in their oneActionThisWeek LLM prompt. Claude either invented a
--   Germany number (hallucination) or fell back to Tier B narrative. With
--   regional_openings populated, the prompt now surfaces StepStone counts
--   keyed to the user's actual region.
--
-- SHAPE:
--   regional_openings JSONB — map of regionKey → { count, source, asOf, isLive }
--   Example:
--     {
--       "germany":     { "count": 1200, "source": "StepStone",  "asOf": "2026-03-15", "isLive": true },
--       "uk":          { "count": 2800, "source": "Reed",       "asOf": "2026-03-15", "isLive": true },
--       "usa":         { "count": 18000,"source": "Indeed",     "asOf": "2026-03-15", "isLive": true },
--       "canada":      { "count": 1900, "source": "Job Bank",   "asOf": "2026-03-15", "isLive": true },
--       "singapore":   { "count": 420,  "source": "JobStreet",  "asOf": "2026-03-15", "isLive": true }
--     }
--
-- ROLLBACK: see down section at bottom.
-- ════════════════════════════════════════════════════════════════════════════

-- Add the column (idempotent — safe to re-run)
ALTER TABLE market_intelligence_cache
  ADD COLUMN IF NOT EXISTS regional_openings JSONB;

-- GIN index for regionKey-based lookups (so future queries like
-- "find roles with > 1000 openings in Germany" stay fast)
CREATE INDEX IF NOT EXISTS idx_mic_regional_openings_gin
  ON market_intelligence_cache USING GIN (regional_openings);

-- Constraint: regional_openings must be a JSON object (not array, not scalar)
ALTER TABLE market_intelligence_cache
  DROP CONSTRAINT IF EXISTS regional_openings_is_object;
ALTER TABLE market_intelligence_cache
  ADD CONSTRAINT regional_openings_is_object
    CHECK (regional_openings IS NULL OR jsonb_typeof(regional_openings) = 'object');

-- Backfill: existing rows have NULL regional_openings until the refresh
-- Edge Function repopulates them. The application code handles NULL gracefully
-- by falling back to globalOpenings + an "unavailable for {region}" disclosure.

COMMENT ON COLUMN market_intelligence_cache.regional_openings IS 'v40.0: per-region opening counts + source attribution. Map of regionKey (germany/uk/usa/canada/singapore/australia/uae/india/etc.) to { count, source, asOf, isLive }. Eliminates the India-only LLM prompt bug where Berlin users received Naukri data. Populated weekly by the refresh-market-intelligence Edge Function.';

-- ─── Rollback (uncomment + run to revert) ───────────────────────────────────
-- ALTER TABLE market_intelligence_cache DROP CONSTRAINT IF EXISTS regional_openings_is_object;
-- DROP INDEX IF EXISTS idx_mic_regional_openings_gin;
-- ALTER TABLE market_intelligence_cache DROP COLUMN IF EXISTS regional_openings;
