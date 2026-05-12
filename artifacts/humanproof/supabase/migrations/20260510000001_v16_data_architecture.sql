-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260510000001_v16_data_architecture.sql
-- Purpose:   v16.0 Data Architecture — five new external-signal tables, one
--            detection table, one enrichment queue, and user_profiles column
--            additions to support the financial-runway personalization layer.
--
-- New tables:
--   warn_filings                — WARN Act filing records (company + state + dates)
--   bls_macro_snapshots         — BLS JOLTS sector-level macro snapshots
--   sec_enhanced_signals        — SEC-derived FCF, margin, earnings-surprise data
--   company_enrichment_queue    — search-log-driven async enrichment pipeline
--   glassdoor_velocity_history  — monthly Glassdoor rating deltas
--   executive_departure_log     — C-suite / VP departure classification
--   implicit_outcome_detections — system-inferred post-audit outcomes per user
--
-- user_profiles columns added:
--   metro_area, city_tier, monthly_salary_usd, monthly_salary_inr,
--   monthly_expenses_usd, savings_months_runway, has_equity_vesting,
--   equity_vest_months, prior_job_changes, prior_layoff_survived,
--   industry_years, has_dependents, dual_income_household,
--   self_rated_skills, target_skills
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1.  WARN Act filings
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS warn_filings (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name     TEXT        NOT NULL,
  filing_state     TEXT        NOT NULL,
  filed_date       DATE        NOT NULL,
  layoff_date      DATE,                         -- planned layoff date (usually filed_date + 60 days)
  affected_count   INTEGER,
  locations        TEXT[],                        -- array of city / location strings
  is_confirmed     BOOLEAN     DEFAULT false,
  source_url       TEXT,
  raw_text         TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS warn_filings_company_idx
  ON warn_filings (lower(company_name));
CREATE INDEX IF NOT EXISTS warn_filings_filed_date_idx
  ON warn_filings (filed_date DESC);


-- ─────────────────────────────────────────────────────────────────────────────
-- 2.  BLS JOLTS macro snapshots
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bls_macro_snapshots (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  sector                TEXT         NOT NULL,
  data_month            DATE         NOT NULL,
  quits_rate            NUMERIC(4,2),
  layoffs_rate          NUMERIC(4,2),
  job_openings_rate     NUMERIC(4,2),
  hiring_rate           NUMERIC(4,2),
  fed_funds_rate        NUMERIC(5,2),
  yield_curve_spread    NUMERIC(5,3),
  nasdaq_change_90d     NUMERIC(6,2),
  source                TEXT         DEFAULT 'bls_api',
  fetched_at            TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE (sector, data_month)
);

CREATE INDEX IF NOT EXISTS bls_macro_sector_date_idx
  ON bls_macro_snapshots (sector, data_month DESC);


-- ─────────────────────────────────────────────────────────────────────────────
-- 3.  SEC enhanced financial signals
--     (FCF, earnings-surprise, analyst consensus — 30-day cache)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sec_enhanced_signals (
  id                          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name                TEXT         NOT NULL,
  ticker                      TEXT,
  signal_date                 DATE         NOT NULL,
  free_cash_flow_margin       NUMERIC(7,4),           -- FCF / Revenue
  operating_margin_yoy        NUMERIC(7,4),           -- YoY change in op margin (pct points)
  earnings_surprise_category  TEXT,                   -- massive_miss | significant_miss | slight_miss | in_line | slight_beat | beat
  earnings_surprise_magnitude NUMERIC(7,4),           -- % vs consensus
  analyst_consensus           TEXT,                   -- strong_buy | buy | hold | underperform | sell
  price_target_change_pct     NUMERIC(7,4),           -- consensus price-target change in 90 days
  analyst_count               INTEGER,
  debt_to_equity_ratio        NUMERIC(7,4),
  cash_reserves_months        NUMERIC(5,1),
  data_source_quality         TEXT         DEFAULT 'estimated',
  fetched_at                  TIMESTAMPTZ  DEFAULT NOW(),
  expires_at                  TIMESTAMPTZ  DEFAULT NOW() + INTERVAL '30 days',
  UNIQUE (company_name, signal_date)
);

CREATE INDEX IF NOT EXISTS sec_enhanced_company_idx
  ON sec_enhanced_signals (lower(company_name), signal_date DESC);


-- ─────────────────────────────────────────────────────────────────────────────
-- 4.  Company enrichment queue
--     Accumulates search logs; a background job enriches high-search-count rows
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS company_enrichment_queue (
  id                       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name             TEXT         NOT NULL UNIQUE,
  search_count             INTEGER      DEFAULT 1,
  first_searched_at        TIMESTAMPTZ  DEFAULT NOW(),
  last_searched_at         TIMESTAMPTZ  DEFAULT NOW(),
  enrichment_status        TEXT         DEFAULT 'pending',  -- pending | enriching | enriched | failed
  estimated_industry       TEXT,
  estimated_region         TEXT,
  estimated_employee_count INTEGER,
  enriched_data            JSONB,       -- full enriched company profile when available
  enrichment_source        TEXT,        -- crunchbase | linkedin | manual | estimated
  enriched_at              TIMESTAMPTZ,
  next_refresh_at          TIMESTAMPTZ  DEFAULT NOW() + INTERVAL '30 days',
  created_at               TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS enrichment_queue_status_idx
  ON company_enrichment_queue (enrichment_status, search_count DESC);
CREATE INDEX IF NOT EXISTS enrichment_queue_company_idx
  ON company_enrichment_queue (lower(company_name));


-- ─────────────────────────────────────────────────────────────────────────────
-- 5.  Glassdoor velocity history
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS glassdoor_velocity_history (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name        TEXT         NOT NULL,
  snapshot_month      DATE         NOT NULL,
  ceo_approval_pct    NUMERIC(5,2),
  overall_rating_x10  INTEGER,     -- 38 = 3.8 stars (avoids NUMERIC comparison rounding)
  review_count        INTEGER,
  new_review_count    INTEGER,
  recommend_pct       NUMERIC(5,2),
  fetched_at          TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE (company_name, snapshot_month)
);

CREATE INDEX IF NOT EXISTS glassdoor_company_month_idx
  ON glassdoor_velocity_history (lower(company_name), snapshot_month DESC);


-- ─────────────────────────────────────────────────────────────────────────────
-- 6.  Executive departure log
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS executive_departure_log (
  id                       UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name             TEXT  NOT NULL,
  executive_title          TEXT  NOT NULL,
  departure_date           DATE  NOT NULL,
  departure_type           TEXT,   -- voluntary_competitor | voluntary_opportunity | forced_corporate_language | retirement | unknown
  replacement_type         TEXT,   -- internal_promotion | external_industry | turnaround_specialist | cost_cutter_profile | no_replacement | unknown
  had_equity_acceleration  BOOLEAN DEFAULT false,
  source                   TEXT,
  created_at               TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS exec_departure_company_idx
  ON executive_departure_log (lower(company_name), departure_date DESC);


-- ─────────────────────────────────────────────────────────────────────────────
-- 7.  Implicit outcome detections
--     One row per (user, audit_session) — system-inferred post-audit outcome
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS implicit_outcome_detections (
  id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  audit_session_id       TEXT         NOT NULL,
  company_name           TEXT         NOT NULL,
  audit_date             DATE         NOT NULL,
  detected_signal        TEXT         NOT NULL, -- warn_match | layoffs_fyi_match | re_audit_trigger | news_layoff_match | no_signal
  signal_confidence      NUMERIC(4,3),
  estimated_outcome      TEXT,                  -- likely_laid_off | likely_retained | likely_resigned | unclear
  detection_date         TIMESTAMPTZ  DEFAULT NOW(),
  should_prompt_user     BOOLEAN      DEFAULT false,
  prompt_sent_at         TIMESTAMPTZ,
  user_confirmed_outcome TEXT,                  -- user's actual confirmation (overrides estimate)
  confirmed_at           TIMESTAMPTZ,
  UNIQUE (user_id, audit_session_id)
);

CREATE INDEX IF NOT EXISTS implicit_outcomes_user_idx
  ON implicit_outcome_detections (user_id, detection_date DESC);
CREATE INDEX IF NOT EXISTS implicit_outcomes_company_idx
  ON implicit_outcome_detections (lower(company_name));


-- ─────────────────────────────────────────────────────────────────────────────
-- 8.  RLS policies
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE implicit_outcome_detections ENABLE ROW LEVEL SECURITY;

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'implicit_outcome_detections' AND policyname = 'Users can read own detections') THEN
    EXECUTE $pol$
      CREATE POLICY "Users can read own detections" ON implicit_outcome_detections
        FOR SELECT USING (auth.uid() = user_id)
    $pol$;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'implicit_outcome_detections' AND policyname = 'Service role can insert detections') THEN
    EXECUTE $pol$
      CREATE POLICY "Service role can insert detections" ON implicit_outcome_detections
        FOR INSERT WITH CHECK (true)
    $pol$;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'implicit_outcome_detections' AND policyname = 'Users can update own confirmation') THEN
    EXECUTE $pol$
      CREATE POLICY "Users can update own confirmation" ON implicit_outcome_detections
        FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)
    $pol$;
  END IF;
END
$do$;

ALTER TABLE company_enrichment_queue ENABLE ROW LEVEL SECURITY;

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'company_enrichment_queue' AND policyname = 'Anyone can read enrichment queue') THEN
    EXECUTE $pol$
      CREATE POLICY "Anyone can read enrichment queue" ON company_enrichment_queue
        FOR SELECT USING (true)
    $pol$;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'company_enrichment_queue' AND policyname = 'Service role can manage enrichment queue') THEN
    EXECUTE $pol$
      CREATE POLICY "Service role can manage enrichment queue" ON company_enrichment_queue
        FOR ALL USING (true)
    $pol$;
  END IF;
END
$do$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 9.  user_profiles — v16.0 financial-runway + career columns
--     All new columns are nullable so existing rows remain valid.
-- ─────────────────────────────────────────────────────────────────────────────

-- Location & job market
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS metro_area      TEXT,                     -- e.g. 'san_francisco', 'bangalore', 'new_york'
  ADD COLUMN IF NOT EXISTS city_tier       TEXT                      -- 'tier1' | 'tier2' | 'tier3' (Indian city tiers)
    CHECK (city_tier IN ('tier1', 'tier2', 'tier3'));

-- Financial situation
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS monthly_salary_usd    NUMERIC(10,2),     -- monthly salary in USD (convert INR at 83 rate client-side)
  ADD COLUMN IF NOT EXISTS monthly_salary_inr    NUMERIC(12,2),     -- monthly salary in INR
  ADD COLUMN IF NOT EXISTS monthly_expenses_usd  NUMERIC(10,2),     -- monthly living expenses in USD
  ADD COLUMN IF NOT EXISTS savings_months_runway NUMERIC(5,1),      -- self-reported OR computed = savings / expenses
  ADD COLUMN IF NOT EXISTS has_equity_vesting    BOOLEAN,           -- unvested equity creates retention anchor
  ADD COLUMN IF NOT EXISTS equity_vest_months    INTEGER;           -- months until next significant vest cliff

-- Career history
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS prior_job_changes     INTEGER,           -- total job changes in career
  ADD COLUMN IF NOT EXISTS prior_layoff_survived BOOLEAN,           -- has survived a layoff and found work before
  ADD COLUMN IF NOT EXISTS industry_years        NUMERIC(4,1);      -- years in this industry (vs. tenure at current company)

-- Family / financial obligations
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS has_dependents        BOOLEAN,           -- supports children, parents, etc.
  ADD COLUMN IF NOT EXISTS dual_income_household BOOLEAN;           -- spouse/partner also employed

-- Skills (stored as text arrays; validated client-side)
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS self_rated_skills     TEXT[],            -- user-reported skill list
  ADD COLUMN IF NOT EXISTS target_skills         TEXT[];            -- skills they are actively working on


-- ─────────────────────────────────────────────────────────────────────────────
-- 10.  View: WARN filings with urgency tier and days-until-layoff
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW warn_active_filings AS
SELECT
  wf.*,
  (wf.layoff_date - CURRENT_DATE) AS days_until_layoff,
  CASE
    WHEN wf.layoff_date IS NULL                                        THEN 'FILED'
    WHEN wf.layoff_date <= CURRENT_DATE + INTERVAL '14 days'          THEN 'IMMINENT'
    WHEN wf.layoff_date <= CURRENT_DATE + INTERVAL '30 days'          THEN 'VERY_SOON'
    WHEN wf.layoff_date <= CURRENT_DATE + INTERVAL '60 days'          THEN 'UPCOMING'
    ELSE                                                                    'FILED'
  END AS urgency_tier
FROM warn_filings wf
WHERE wf.filed_date >= CURRENT_DATE - INTERVAL '120 days'
ORDER BY wf.layoff_date ASC NULLS LAST;


-- ─────────────────────────────────────────────────────────────────────────────
-- 11.  Function: upsert_company_search
--      Called by the app whenever a company is searched. Keeps search_count
--      current so the enrichment worker can prioritise high-demand companies.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION upsert_company_search(
  p_company_name TEXT,
  p_industry     TEXT DEFAULT NULL,
  p_region       TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO company_enrichment_queue (
    company_name,
    search_count,
    first_searched_at,
    last_searched_at,
    estimated_industry,
    estimated_region
  )
  VALUES (
    p_company_name,
    1,
    NOW(),
    NOW(),
    p_industry,
    p_region
  )
  ON CONFLICT (company_name) DO UPDATE SET
    search_count       = company_enrichment_queue.search_count + 1,
    last_searched_at   = NOW(),
    estimated_industry = COALESCE(p_industry, company_enrichment_queue.estimated_industry),
    estimated_region   = COALESCE(p_region,   company_enrichment_queue.estimated_region);
END;
$$;
