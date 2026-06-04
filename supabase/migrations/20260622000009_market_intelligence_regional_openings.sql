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

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='market_intelligence_cache') THEN
    ALTER TABLE market_intelligence_cache
      ADD COLUMN IF NOT EXISTS regional_openings JSONB;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename='market_intelligence_cache' AND indexname='idx_mic_regional_openings_gin') THEN
      CREATE INDEX idx_mic_regional_openings_gin
        ON market_intelligence_cache USING GIN (regional_openings);
    END IF;
    ALTER TABLE market_intelligence_cache
      DROP CONSTRAINT IF EXISTS regional_openings_is_object;
    ALTER TABLE market_intelligence_cache
      ADD CONSTRAINT regional_openings_is_object
        CHECK (regional_openings IS NULL OR jsonb_typeof(regional_openings) = 'object');
  END IF;
END $$;

-- Backfill: existing rows have NULL regional_openings until the refresh
-- Edge Function repopulates them. The application code handles NULL gracefully
-- by falling back to globalOpenings + an "unavailable for {region}" disclosure.

-- COMMENT ON COLUMN market_intelligence_cache.regional_openings deferred (table may not exist)

-- ─── Rollback (uncomment + run to revert) ───────────────────────────────────
-- ALTER TABLE market_intelligence_cache DROP CONSTRAINT IF EXISTS regional_openings_is_object;
-- DROP INDEX IF EXISTS idx_mic_regional_openings_gin;
-- ALTER TABLE market_intelligence_cache DROP COLUMN IF EXISTS regional_openings;
