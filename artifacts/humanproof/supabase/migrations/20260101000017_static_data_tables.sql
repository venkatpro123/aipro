-- Migration 17: Centralized static data tables
-- Replaces companyDatabase.ts, industryRiskData.ts, roleExposureData.ts
-- as the single source of truth. Static TS files kept for offline fallback only.

-- ── Companies ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.companies (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                     TEXT        NOT NULL,
  ticker                   TEXT,
  is_public                BOOLEAN     NOT NULL DEFAULT false,
  industry                 TEXT        NOT NULL,
  region                   TEXT        NOT NULL CHECK (region IN ('US','EU','IN','APAC','GLOBAL')),
  employee_count           INTEGER     NOT NULL DEFAULT 0,
  revenue_growth_yoy       NUMERIC(8,2),
  stock_90d_change         NUMERIC(8,2),
  layoff_rounds            INTEGER     NOT NULL DEFAULT 0,
  last_layoff_percent      NUMERIC(5,2),
  revenue_per_employee     INTEGER     NOT NULL DEFAULT 0,
  ai_investment_signal     TEXT        NOT NULL DEFAULT 'low'
                             CHECK (ai_investment_signal IN ('low','medium','high','very-high')),
  data_source              TEXT        NOT NULL DEFAULT 'Manual',
  last_updated             DATE        NOT NULL DEFAULT CURRENT_DATE,
  last_funding_round       TEXT,
  months_since_last_funding INTEGER,
  -- D7 leadership independence fields
  ceo_tenure_months        INTEGER,
  c_suite_changes_12m      INTEGER,
  board_composition_changed BOOLEAN,
  glassdoor_trend_direction TEXT        CHECK (glassdoor_trend_direction IN ('rising','stable','falling')),
  -- JSONB map of role-key → risk weight (0–1) for company-specific overrides
  role_risk_map            JSONB,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT companies_name_unique UNIQUE (name)
);

-- Layoff history is a one-to-many child of companies
CREATE TABLE IF NOT EXISTS public.company_layoff_rounds (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID    NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  round_date  DATE    NOT NULL,
  percent_cut NUMERIC(5,2) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_layoff_rounds_company_id
  ON public.company_layoff_rounds(company_id);

-- ── Industry Risk Data ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.industry_risk_data (
  id                  UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  industry_key        TEXT    NOT NULL,
  baseline_risk       NUMERIC(4,3) NOT NULL,
  ai_adoption_rate    NUMERIC(4,3) NOT NULL,
  growth_outlook      TEXT    NOT NULL
                        CHECK (growth_outlook IN ('growing','stable','volatile','declining')),
  avg_layoff_rate_2025 NUMERIC(6,5) NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT industry_risk_data_key_unique UNIQUE (industry_key)
);

-- ── Role Exposure Data ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.role_exposure_data (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  role_title   TEXT    NOT NULL,
  ai_risk      NUMERIC(4,3) NOT NULL,
  layoff_risk  NUMERIC(4,3) NOT NULL,
  demand_trend TEXT    NOT NULL CHECK (demand_trend IN ('rising','stable','falling')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT role_exposure_data_title_unique UNIQUE (role_title)
);

-- ── Auto-update timestamps ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER industry_risk_data_updated_at
  BEFORE UPDATE ON public.industry_risk_data
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER role_exposure_data_updated_at
  BEFORE UPDATE ON public.role_exposure_data
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── Row Level Security ─────────────────────────────────────────────────────────

ALTER TABLE public.companies            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_layoff_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.industry_risk_data   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_exposure_data   ENABLE ROW LEVEL SECURITY;

-- All four tables are read-only for anonymous users; write requires service_role
CREATE POLICY "companies_read_public"
  ON public.companies FOR SELECT USING (true);

CREATE POLICY "company_layoff_rounds_read_public"
  ON public.company_layoff_rounds FOR SELECT USING (true);

CREATE POLICY "industry_risk_data_read_public"
  ON public.industry_risk_data FOR SELECT USING (true);

CREATE POLICY "role_exposure_data_read_public"
  ON public.role_exposure_data FOR SELECT USING (true);

-- ── Comments ───────────────────────────────────────────────────────────────────

COMMENT ON TABLE public.companies IS
  'Master company intelligence table. Seeded from companyDatabase.ts via scripts/seed_static_data.ts. Updated weekly by the refresh-company-intelligence Edge Function.';

COMMENT ON TABLE public.company_layoff_rounds IS
  'Per-company layoff event history. Child of companies. One row per round.';

COMMENT ON TABLE public.industry_risk_data IS
  'Industry-level baseline risk and AI adoption scores. Seeded from industryRiskData.ts.';

COMMENT ON TABLE public.role_exposure_data IS
  'Role-level AI displacement and layoff risk scores. Seeded from roleExposureData.ts.';
