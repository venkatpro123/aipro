-- market_intelligence_scrape_status
-- Adds operational columns to market_intelligence_cache so the EF can record
-- WHY a refresh produced stale data (rate-limit, source-block, no API key, etc.)
-- and the UI can distinguish a normal mid-week age from a blocked scrape.
--
-- New columns:
--   scrape_status            TEXT  — last attempt outcome
--   last_successful_scrape_at TIMESTAMPTZ — only updated on 'success'
--   consecutive_failures     INTEGER — reset on success; increments on any failure
--   regional_openings        JSONB  — per-region counts + source metadata
--                                     (referenced in MarketCacheRow since v40.0
--                                      but missing from schema until now)
--
-- UI distinction enabled by these columns:
--   ageInDays <= 7 AND scrape_status = 'success'         → 🟢 Live
--   ageInDays <= 7 AND scrape_status != 'success'        → 🟠 Refresh issue
--   scrape_status = 'source_blocked'                      → 🔴 Source blocked
--   scrape_status = 'rate_limited'                        → 🟠 Rate limited
--   scrape_status = 'no_key'                              → 📊 Research est.
--   scrape_status IS NULL (pre-EF rows)                   → falls through to ageInDays

-- ── Step 1: add columns (idempotent — ALTER TABLE ADD COLUMN IF NOT EXISTS) ──
ALTER TABLE public.market_intelligence_cache
  ADD COLUMN IF NOT EXISTS scrape_status TEXT
    CHECK (scrape_status IN (
      'success', 'parse_failed', 'rate_limited',
      'source_blocked', 'network_error', 'no_key'
    )),
  ADD COLUMN IF NOT EXISTS last_successful_scrape_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS consecutive_failures INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS regional_openings JSONB;

-- ── Step 2: index for dashboard monitoring queries ───────────────────────────
CREATE INDEX IF NOT EXISTS idx_mic_scrape_status
  ON public.market_intelligence_cache (scrape_status);

CREATE INDEX IF NOT EXISTS idx_mic_last_success
  ON public.market_intelligence_cache (last_successful_scrape_at DESC NULLS LAST);

-- ── Step 3: seed existing rows with scrape_status so the CHECK doesn't block ─
-- Rows written before this migration have is_live=true (came from real Serper
-- calls) or is_live=false (research estimates). Map accordingly.
UPDATE public.market_intelligence_cache
SET scrape_status = CASE
  WHEN is_live = true  THEN 'success'
  WHEN is_live = false THEN 'no_key'
  ELSE 'no_key'
END
WHERE scrape_status IS NULL;

-- ── Step 4: backfill last_successful_scrape_at for existing live rows ─────────
UPDATE public.market_intelligence_cache
SET last_successful_scrape_at = updated_at
WHERE is_live = true
  AND last_successful_scrape_at IS NULL;
