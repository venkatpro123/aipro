-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260624000001_verified_company_intelligence.sql
-- Purpose:   Enterprise-grade company data tables replacing the synthetic-field
--            mixed table (company_intelligence).  Every data field carries an
--            explicit source, verified_at, and confidence companion so consumers
--            can always tell what came from real data vs. heuristics.
--
-- Three new tables:
--   1. verified_company_intelligence — primary data store (REAL + SEMI-LIVE)
--   2. company_risk_overrides        — admin-curated overrides (e.g. role_risk_map)
--   3. company_migration_log         — tracks per-company migration progress
--
-- The original `company_intelligence` table is NOT dropped in this migration —
-- it remains as a read fallback during the controlled transition period.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. Primary verified data table ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS verified_company_intelligence (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity (REAL — seed + EF canonical lookup)
  canonical_name            TEXT        NOT NULL UNIQUE,   -- lowercase, no punctuation
  display_name              TEXT        NOT NULL,
  ticker                    TEXT,
  exchange                  TEXT,             -- 'NYSE' | 'NSE' | 'BSE' | 'NASDAQ' | 'LSE' etc.
  industry                  TEXT,
  sector                    TEXT,
  is_public                 BOOLEAN     NOT NULL DEFAULT FALSE,
  country_code              CHAR(2),          -- ISO 3166-1 alpha-2 (IN, US, GB, …)

  -- ── Workforce (REAL — authoritative external sources) ─────────────────────
  workforce_count           INTEGER,
  workforce_source          TEXT,
  -- 'wikipedia_scrape' | 'annual_report_scrape' | 'glassdoor_about' |
  -- 'press_release' | 'known_headcounts_map' | 'heuristic'
  workforce_verified_at     TIMESTAMPTZ,
  workforce_confidence      NUMERIC(3,2) CHECK (workforce_confidence BETWEEN 0 AND 1),

  -- ── Stock / financials (SEMI-LIVE — Yahoo Finance scrape, no API key) ─────
  stock_price               NUMERIC(12,4),
  market_cap_usd            BIGINT,
  pe_ratio                  NUMERIC(8,2),
  revenue_ttm_usd           BIGINT,
  stock_90d_change          NUMERIC(6,3),     -- percent
  financials_source         TEXT        NOT NULL DEFAULT 'yahoo_finance_scrape',
  financials_verified_at    TIMESTAMPTZ,
  financials_confidence     NUMERIC(3,2) CHECK (financials_confidence BETWEEN 0 AND 1),

  -- ── Layoff signals (SEMI-LIVE — breaking_news_events + RSS) ──────────────
  recent_layoff_count       INTEGER     NOT NULL DEFAULT 0,    -- events in last 180d
  largest_layoff_pct        NUMERIC(5,2),                      -- e.g. 18.5 = 18.5%
  layoff_last_event_at      TIMESTAMPTZ,
  layoff_source             TEXT,
  -- 'breaking_news_events' | 'news_rss_scrape' | 'newsapi'
  layoff_verified_at        TIMESTAMPTZ,
  layoff_confidence         NUMERIC(3,2) CHECK (layoff_confidence BETWEEN 0 AND 1),

  -- ── Hiring velocity (SEMI-LIVE — company_skill_demand_cache + Naukri) ─────
  hiring_velocity_score     NUMERIC(4,2),   -- -5.0 to +5.0 (negative = contracting)
  total_open_roles          INTEGER,
  hiring_source             TEXT,
  hiring_verified_at        TIMESTAMPTZ,
  hiring_confidence         NUMERIC(3,2) CHECK (hiring_confidence BETWEEN 0 AND 1),

  -- ── Enrichment metadata ───────────────────────────────────────────────────
  data_quality_tier         TEXT        NOT NULL DEFAULT 'seed'
                              CHECK (data_quality_tier IN ('verified','live','seed','heuristic')),
  enrichment_version        TEXT,           -- EF version that last wrote this row
  last_enriched_at          TIMESTAMPTZ,
  conflict_flags            JSONB       NOT NULL DEFAULT '[]'::JSONB,

  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION vci_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER vci_updated_at
  BEFORE UPDATE ON verified_company_intelligence
  FOR EACH ROW EXECUTE FUNCTION vci_set_updated_at();

-- ─── 2. Admin override table ─────────────────────────────────────────────────
-- Stores expert-curated data (role_risk_map, ai_exposure overrides, etc.)
-- without mixing synthetic values into the live data table.

CREATE TABLE IF NOT EXISTS company_risk_overrides (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name    TEXT        NOT NULL
                      REFERENCES verified_company_intelligence(canonical_name)
                      ON DELETE CASCADE,
  override_type     TEXT        NOT NULL,
  -- 'role_risk_map' | 'ai_exposure' | 'confidence_floor' | 'hiring_freeze'
  override_value    JSONB       NOT NULL,
  override_reason   TEXT,
  overridden_by     TEXT        NOT NULL DEFAULT 'admin',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_cro_name_type UNIQUE (canonical_name, override_type)
);

-- ─── 3. Migration tracking table ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS company_migration_log (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name    TEXT        NOT NULL,
  migration_phase   TEXT        NOT NULL
                      CHECK (migration_phase IN ('audit','validate','enrich','complete','failed','skipped')),
  old_table_id      UUID,
  new_table_id      UUID,
  validation_result JSONB,
  error_message     TEXT,
  migrated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- already exists, safe to repeat

-- vci
CREATE INDEX IF NOT EXISTS idx_vci_canonical_name
  ON verified_company_intelligence (canonical_name);
CREATE INDEX IF NOT EXISTS idx_vci_ticker
  ON verified_company_intelligence (ticker)
  WHERE ticker IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vci_industry
  ON verified_company_intelligence (industry);
CREATE INDEX IF NOT EXISTS idx_vci_quality_tier
  ON verified_company_intelligence (data_quality_tier);
CREATE INDEX IF NOT EXISTS idx_vci_last_enriched
  ON verified_company_intelligence (last_enriched_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_vci_name_trgm
  ON verified_company_intelligence USING GIN (canonical_name gin_trgm_ops);

-- overrides
CREATE INDEX IF NOT EXISTS idx_cro_canonical_name
  ON company_risk_overrides (canonical_name);

-- migration log
CREATE INDEX IF NOT EXISTS idx_cml_canonical_migrated
  ON company_migration_log (canonical_name, migrated_at DESC);
CREATE INDEX IF NOT EXISTS idx_cml_phase
  ON company_migration_log (migration_phase);

-- ─── Row-Level Security ──────────────────────────────────────────────────────

ALTER TABLE verified_company_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_risk_overrides        ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_migration_log         ENABLE ROW LEVEL SECURITY;

-- Anyone (anon + authenticated) can read company data
CREATE POLICY "anon_read_vci"
  ON verified_company_intelligence FOR SELECT TO anon USING (true);
CREATE POLICY "authed_read_vci"
  ON verified_company_intelligence FOR SELECT TO authenticated USING (true);

-- Only service_role (Edge Functions) can write
CREATE POLICY "service_write_vci"
  ON verified_company_intelligence FOR ALL TO service_role USING (true);

-- Only service_role can access overrides
CREATE POLICY "service_all_overrides"
  ON company_risk_overrides FOR ALL TO service_role USING (true);
-- Authenticated users can read admin overrides (needed for UI role_risk_map display)
CREATE POLICY "authed_read_overrides"
  ON company_risk_overrides FOR SELECT TO authenticated USING (true);

-- Only service_role can write migration log; authenticated can read for status UI
CREATE POLICY "service_write_miglog"
  ON company_migration_log FOR ALL TO service_role USING (true);
CREATE POLICY "authed_read_miglog"
  ON company_migration_log FOR SELECT TO authenticated USING (true);
