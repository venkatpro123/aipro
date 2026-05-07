-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: 20260101000001_market_intelligence_cache.sql
-- Purpose:   Create the market_intelligence_cache table used by
--            src/services/marketIntelligenceService.ts and
--            refreshed weekly by the refresh-market-intelligence Edge Function.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── market_intelligence_cache ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS market_intelligence_cache (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key             TEXT        NOT NULL UNIQUE,
  india_openings       INTEGER,
  global_openings      INTEGER,
  demand_trend         TEXT        CHECK (demand_trend IN ('surging','growing','stable','contracting')),
  top_companies_india  TEXT[],
  top_companies_global TEXT[],
  median_salary_delta  INTEGER,
  success_rate_12m     INTEGER,
  weeks_to_interview   INTEGER,
  hiring_bar           TEXT,
  data_as_of           DATE        NOT NULL,
  source               TEXT,
  is_live              BOOLEAN     NOT NULL DEFAULT false,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mic_role_key   ON market_intelligence_cache (role_key);
CREATE INDEX IF NOT EXISTS idx_mic_updated_at ON market_intelligence_cache (updated_at DESC);

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE market_intelligence_cache ENABLE ROW LEVEL SECURITY;

-- Any authenticated or anonymous user can read
CREATE POLICY "read_market_cache" ON market_intelligence_cache
  FOR SELECT USING (true);

-- Only the Edge Function (service_role) may write
CREATE POLICY "edge_function_write" ON market_intelligence_cache
  FOR ALL USING (auth.role() = 'service_role');
