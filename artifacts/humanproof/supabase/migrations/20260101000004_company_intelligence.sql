-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: 20260101000004_company_intelligence.sql
-- Purpose:   Core company intelligence table (2000+ pre-seeded records).
--            Read by companyIntelligenceService.ts for every audit.
--            Written by the OSINT Edge Function and confidence-score feedback loop.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS company_intelligence (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name         TEXT        NOT NULL,
  industry             TEXT        NOT NULL,
  company_size         TEXT        CHECK (company_size IN ('startup','small','mid','large','enterprise')),
  stage                TEXT        CHECK (stage IN ('pre_revenue','early','growth','mature','declining')),
  region               TEXT,
  stock_ticker         TEXT,

  -- jsonb signal bundles (preferred read path)
  financial_signals    JSONB,
  layoff_history       JSONB,
  hiring_signals       JSONB,
  role_risk_map        JSONB,

  -- flat column fallbacks (for backward compat + SQL filtering)
  revenue_trend        TEXT,
  funding_stage        TEXT,
  burn_rate_estimate   TEXT,
  last_funding_date    DATE,
  total_layoffs        INTEGER,
  last_layoff_date     DATE,
  layoff_frequency     TEXT,
  affected_departments TEXT[],
  hiring_velocity      TEXT,
  hiring_freeze_score  NUMERIC(4,2),

  -- composite risk scores
  ai_exposure_index    NUMERIC(4,2),
  market_risk_score    NUMERIC(4,2),
  company_risk_score   NUMERIC(4,2),
  confidence_score     NUMERIC(4,3) NOT NULL DEFAULT 0.5,

  last_updated         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable trigram extension before GIN index that depends on it
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_ci_company_name      ON company_intelligence (LOWER(company_name));
CREATE INDEX IF NOT EXISTS idx_ci_industry          ON company_intelligence (industry);
CREATE INDEX IF NOT EXISTS idx_ci_confidence_score  ON company_intelligence (confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_ci_company_name_trgm ON company_intelligence USING GIN (LOWER(company_name) gin_trgm_ops);

ALTER TABLE company_intelligence ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all company records
CREATE POLICY "read_company_intelligence" ON company_intelligence
  FOR SELECT USING (true);

-- Only service_role (Edge Function / admin) can write
CREATE POLICY "service_write_company_intelligence" ON company_intelligence
  FOR ALL USING (auth.role() = 'service_role');
