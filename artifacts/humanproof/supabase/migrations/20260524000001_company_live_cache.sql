-- company_live_cache
-- Stores live-collected signals per company per day.
-- When a user audits the same company twice on the same calendar day,
-- the second audit reads from this table instead of re-hitting live sources.
-- TTL: expires at midnight UTC of the day the data was fetched.
-- Sources that contributed are recorded in data_sources[] for transparency.

CREATE TABLE IF NOT EXISTS company_live_cache (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name    text        NOT NULL,
  ticker          text,
  market          text        NOT NULL DEFAULT 'india',

  -- Stock fundamentals
  price_90d_change    numeric,
  revenue_growth_yoy  numeric,
  market_cap          bigint,
  pe_ratio            numeric,
  employee_count      integer,
  stock_source        text,           -- 'yahoo-finance', 'yahoo-finance+sec-edgar', 'finnhub', etc.

  -- News signals
  recent_headline_count  integer,
  sentiment_signal       numeric,
  latest_layoff_event    jsonb,

  -- Hiring signals
  estimated_openings     integer,
  demand_trend           text,         -- 'rising' | 'stable' | 'falling'
  hiring_freeze_score    numeric,
  hiring_source          text,
  connector_results      jsonb,

  -- Scrape (Wikipedia/career page)
  wiki_employee_count    integer,

  -- Metadata
  data_sources    text[],             -- all sources that contributed data
  fetched_at      timestamptz NOT NULL DEFAULT now(),
  valid_until     timestamptz NOT NULL, -- midnight UTC of fetch day

  UNIQUE(company_name, market)
);

-- Row-level security: any authenticated/anon user can read; service role writes.
ALTER TABLE company_live_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clc_select" ON company_live_cache
  FOR SELECT USING (true);

CREATE POLICY "clc_insert" ON company_live_cache
  FOR INSERT WITH CHECK (true);

CREATE POLICY "clc_update" ON company_live_cache
  FOR UPDATE USING (true);

CREATE POLICY "clc_delete" ON company_live_cache
  FOR DELETE USING (true);

-- Index for the hot-path lookup: company_name + market + not-yet-expired.
CREATE INDEX IF NOT EXISTS company_live_cache_lookup
  ON company_live_cache (lower(company_name), market, valid_until);

-- Auto-vacuum old rows so the table doesn't grow unbounded.
-- Rows expire daily, so anything older than 2 days is dead weight.
CREATE INDEX IF NOT EXISTS company_live_cache_valid_until
  ON company_live_cache (valid_until);

COMMENT ON TABLE company_live_cache IS
  'Per-company live signal cache. Rows expire at midnight UTC daily. '
  'Second same-day audit reads from here instead of re-scraping live sources.';
