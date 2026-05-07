-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: 20260101000012_layoff_analysis_cache.sql
-- Purpose:   Formalise the layoff_analysis_cache table that exists on the
--            remote database (created by earlier untracked migrations) but
--            has no migration file. This migration uses CREATE TABLE IF NOT
--            EXISTS so it is safe to run even though the table already exists.
--
-- Used by:   src/services/cache/analysisCache.ts
--            Dual-layer cache: localStorage (1h) → Supabase (24h).
--            Stores serialised EnsembleResult per (company × role × user factors).
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS layoff_analysis_cache (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  key        TEXT        NOT NULL UNIQUE,   -- compound key: company::role::dept::...
  data       JSONB       NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lac_key        ON layoff_analysis_cache (key);
CREATE INDEX IF NOT EXISTS idx_lac_created_at ON layoff_analysis_cache (created_at DESC);

ALTER TABLE layoff_analysis_cache ENABLE ROW LEVEL SECURITY;

-- Any authenticated or anonymous user can read cached results
CREATE POLICY "read_analysis_cache" ON layoff_analysis_cache
  FOR SELECT USING (true);

-- Any client can upsert (the cache key is not sensitive; the data is the user's own score)
CREATE POLICY "upsert_analysis_cache" ON layoff_analysis_cache
  FOR INSERT WITH CHECK (true);

CREATE POLICY "update_analysis_cache" ON layoff_analysis_cache
  FOR UPDATE USING (true);

-- ── Auto-expire: delete entries older than 24 hours ───────────────────────
-- Run via the existing weekly pg_cron slot or on-demand.
CREATE OR REPLACE FUNCTION expire_analysis_cache() RETURNS void LANGUAGE sql AS $$
  DELETE FROM layoff_analysis_cache WHERE created_at < NOW() - INTERVAL '24 hours';
$$;
