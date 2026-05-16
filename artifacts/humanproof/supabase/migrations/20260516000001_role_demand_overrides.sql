-- Migration: 20260516000001_role_demand_overrides.sql
-- Phase 6C: Dynamic recommendation freshness
--
-- Creates the role_demand_overrides table that enables quarterly admin updates
-- to role market demand data without code deployments.
--
-- The static ROLE_DEMAND_DB in roleMarketDemandService.ts holds baseline data.
-- This table provides an override layer: rows here take precedence over static data.
--
-- Admin workflow (quarterly, ~15 min):
--   1. Pull latest BLS OES / LinkedIn Talent Insights / Naukri JobSpeak data
--   2. INSERT or UPSERT rows for roles with significantly changed demand
--   3. The service layer reads overrides at startup + caches for 4h
--
-- Consumers: roleMarketDemandService.ts (reads overrides at query time)

CREATE TABLE IF NOT EXISTS role_demand_overrides (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Role identification
  role_key         TEXT NOT NULL,           -- canonical role key (e.g. 'ml_engineer', 'registered_nurse')
  region           TEXT NOT NULL DEFAULT 'global',  -- 'global' | 'india' | 'us' | 'eu' | 'uk' | 'mena' | ...

  -- Demand signals (mirror RoleDemandSnapshot structure)
  demand_index     SMALLINT NOT NULL        -- 0–100 composite demand score
    CHECK (demand_index BETWEEN 0 AND 100),
  demand_trend     TEXT NOT NULL            -- 'rising' | 'stable' | 'falling'
    CHECK (demand_trend IN ('rising', 'stable', 'falling')),
  job_openings_trend TEXT NOT NULL DEFAULT 'stable'
    CHECK (job_openings_trend IN ('rising', 'stable', 'falling', 'declining')),
  salary_trend     TEXT NOT NULL DEFAULT 'stable'
    CHECK (salary_trend IN ('rising', 'stable', 'falling')),
  ai_substitution_risk NUMERIC(4,3)        -- 0.000–1.000 probability of AI substitution
    CHECK (ai_substitution_risk BETWEEN 0 AND 1),
  time_to_fill_days SMALLINT,              -- median days to fill an open role
  yoy_job_openings_change NUMERIC(6,3),    -- year-over-year % change (e.g. 0.12 = +12%)

  -- Location and freshness metadata
  top_hiring_locations TEXT[],             -- array of top hiring cities/regions
  data_quarter     TEXT NOT NULL,          -- e.g. 'Q1 2026', 'Q2 2026'
  data_source      TEXT,                   -- e.g. 'BLS OES 2026', 'LinkedIn Talent Insights Q1 2026'
  calibration_note TEXT,                   -- admin notes on methodology or data quality
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,  -- soft-delete without data loss

  -- Audit trail
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by       TEXT,                   -- admin email who inserted the row

  -- Unique constraint: one active override per role + region at a time
  CONSTRAINT role_demand_overrides_role_region_unique UNIQUE (role_key, region)
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_role_demand_overrides_role_key ON role_demand_overrides (role_key);
CREATE INDEX IF NOT EXISTS idx_role_demand_overrides_region ON role_demand_overrides (region);
CREATE INDEX IF NOT EXISTS idx_role_demand_overrides_active ON role_demand_overrides (is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_role_demand_overrides_quarter ON role_demand_overrides (data_quarter);

-- Auto-update updated_at on row modification
CREATE OR REPLACE FUNCTION update_role_demand_overrides_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER role_demand_overrides_updated_at
  BEFORE UPDATE ON role_demand_overrides
  FOR EACH ROW
  EXECUTE FUNCTION update_role_demand_overrides_updated_at();

-- Row Level Security: read-only for authenticated users, write for service_role
ALTER TABLE role_demand_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "role_demand_overrides_read"
  ON role_demand_overrides FOR SELECT
  TO authenticated
  USING (is_active = TRUE);

CREATE POLICY "role_demand_overrides_admin_all"
  ON role_demand_overrides FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- Seed: Q1 2026 high-signal overrides for roles where demand has shifted materially
-- (These supplement the static baseline in roleMarketDemandService.ts)
INSERT INTO role_demand_overrides (
  role_key, region, demand_index, demand_trend, job_openings_trend, salary_trend,
  ai_substitution_risk, time_to_fill_days, yoy_job_openings_change,
  top_hiring_locations, data_quarter, data_source, calibration_note, created_by
) VALUES
  -- ML/AI roles: demand accelerating significantly in Q1 2026
  ('ml_engineer',     'global', 94, 'rising',  'rising',  'rising',  0.14, 32, 0.38,
   ARRAY['San Francisco', 'Seattle', 'London', 'Bangalore', 'Toronto'],
   'Q1 2026', 'LinkedIn Talent Insights Q1 2026 + BLS OES 2025',
   'LLM-driven demand surge. 38% YoY increase in ML engineer job postings.',
   'system@humanproof.ai'),

  ('ai_product_manager', 'global', 88, 'rising', 'rising', 'rising', 0.16, 38, 0.52,
   ARRAY['San Francisco', 'New York', 'London', 'Bangalore'],
   'Q1 2026', 'LinkedIn Talent Insights Q1 2026',
   'AI PM role category essentially new in 2024; growing 52% YoY in job postings.',
   'system@humanproof.ai'),

  -- BPO / Customer support: demand declining due to AI
  ('customer_support_specialist', 'global', 48, 'falling', 'falling', 'falling', 0.72, 18, -0.22,
   ARRAY['Hyderabad', 'Pune', 'Manila', 'Mexico City'],
   'Q1 2026', 'Naukri JobSpeak Q1 2026 + BLS OES 2025',
   '22% YoY decline in postings. AI chatbot adoption accelerating displacement.',
   'system@humanproof.ai'),

  ('bpo_analyst', 'india', 50, 'falling', 'falling', 'stable', 0.68, 15, -0.18,
   ARRAY['Hyderabad', 'Bengaluru', 'Pune', 'Noida'],
   'Q1 2026', 'Naukri JobSpeak Q1 2026',
   '18% YoY decline in BPO postings on Naukri. AI automation primary driver.',
   'system@humanproof.ai'),

  -- Registered nurses: acute shortage driving premium demand
  ('registered_nurse', 'us', 86, 'rising', 'rising', 'rising', 0.08, 42, 0.15,
   ARRAY['California', 'Texas', 'Florida', 'New York', 'Washington State'],
   'Q1 2026', 'BLS OES 2025 + American Nurses Association 2026 shortage report',
   'Ongoing nursing shortage. Travel nurse premium pay 35-60% above staff nurse rates.',
   'system@humanproof.ai'),

  -- Petroleum engineers: declining in non-MENA regions
  ('petroleum_engineer', 'us', 52, 'falling', 'falling', 'stable', 0.28, 65, -0.12,
   ARRAY['Houston', 'Denver', 'Midland TX'],
   'Q1 2026', 'BLS OES 2025 + SPE Workforce Study 2025',
   '12% YoY decline in US-based PE postings. Energy transition reducing upstream investment.',
   'system@humanproof.ai'),

  -- Renewable energy: strong growth signal
  ('renewable_energy_engineer', 'global', 82, 'rising', 'rising', 'rising', 0.18, 35, 0.28,
   ARRAY['California', 'Texas', 'Germany', 'Denmark', 'India (Gujarat/Rajasthan)'],
   'Q1 2026', 'IEA Clean Energy Jobs Report 2025 + LinkedIn Talent Insights',
   '28% YoY growth in renewable energy engineering postings globally.',
   'system@humanproof.ai'),

  -- Journalist: structural decline
  ('journalist_reporter', 'us', 38, 'falling', 'falling', 'falling', 0.58, 70, -0.24,
   ARRAY['New York', 'Washington DC', 'Los Angeles'],
   'Q1 2026', 'BLS OES 2025 + Reuters Institute Digital News Report 2025',
   '24% YoY decline. Newsroom layoffs and AI content tools reducing headcount.',
   'system@humanproof.ai')

ON CONFLICT (role_key, region) DO UPDATE SET
  demand_index = EXCLUDED.demand_index,
  demand_trend = EXCLUDED.demand_trend,
  job_openings_trend = EXCLUDED.job_openings_trend,
  salary_trend = EXCLUDED.salary_trend,
  ai_substitution_risk = EXCLUDED.ai_substitution_risk,
  time_to_fill_days = EXCLUDED.time_to_fill_days,
  yoy_job_openings_change = EXCLUDED.yoy_job_openings_change,
  top_hiring_locations = EXCLUDED.top_hiring_locations,
  data_quarter = EXCLUDED.data_quarter,
  data_source = EXCLUDED.data_source,
  calibration_note = EXCLUDED.calibration_note,
  updated_at = NOW();

COMMENT ON TABLE role_demand_overrides IS
  'Quarterly admin-driven overrides for role market demand data. '
  'Rows here take precedence over static ROLE_DEMAND_DB in roleMarketDemandService.ts. '
  'Update via Supabase Studio or admin script — no code deployment needed.';
