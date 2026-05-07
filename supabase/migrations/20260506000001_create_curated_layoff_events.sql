-- curated_layoff_events: managed layoff event store replacing hardcoded seeds.
-- Admins can INSERT/UPDATE/DELETE rows to correct events without a code deployment.
-- The frontend reads this table at audit time and overlays/replaces the seeded cache.

CREATE TABLE IF NOT EXISTS public.curated_layoff_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name    text NOT NULL,
  event_date      date NOT NULL,
  headline        text NOT NULL,
  percent_cut     numeric(5,2),       -- null = undisclosed
  affected_count  integer,            -- null = undisclosed
  source          text NOT NULL,
  source_url      text,
  affected_departments text[],        -- e.g. ['Engineering', 'Sales']
  is_verified     boolean NOT NULL DEFAULT false,
  confidence      text NOT NULL DEFAULT 'medium' CHECK (confidence IN ('low','medium','high','regulatory')),
  region          text,               -- 'US', 'IN', 'EU', etc.
  notes           text,               -- admin notes, e.g. "Corrected from 21% to 18%"
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Fast company name lookup (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_curated_layoff_company
  ON public.curated_layoff_events USING btree (lower(company_name));

CREATE INDEX IF NOT EXISTS idx_curated_layoff_date
  ON public.curated_layoff_events (event_date DESC);

-- Seed the three previously hardcoded events so they are now correctable by admins
INSERT INTO public.curated_layoff_events
  (company_name, event_date, headline, percent_cut, source, source_url, affected_departments, is_verified, confidence, region, notes)
VALUES
  (
    'Oracle',
    '2026-04-01',
    'Oracle begins laying off estimated 30,000 employees amid AI infrastructure spending concerns',
    21,
    'Crunchbase News',
    'https://news.crunchbase.com/',
    ARRAY['Sales','Marketing','HR','Finance'],
    false,
    'medium',
    'US',
    'Seeded from hardcoded cache. Verify against official Oracle filing before trusting percent_cut.'
  ),
  (
    'Amazon',
    '2026-01-15',
    'Amazon lays off 16,000 employees to reduce management layers and reallocate to AI',
    1,
    'TechCrunch',
    'https://techcrunch.com/',
    ARRAY['Management','Sales','Operations'],
    false,
    'medium',
    'US',
    'Seeded from hardcoded cache. 1% of ~1.54M employees = ~15,400.'
  ),
  (
    'Meta',
    '2026-01-10',
    'Meta cuts 1,500 employees from Reality Labs division',
    3,
    'InformationWeek',
    'https://www.informationweek.com/',
    ARRAY['VR/AR','Engineering','Research'],
    false,
    'medium',
    'US',
    'Seeded from hardcoded cache. Reality Labs-specific, not company-wide.'
  )
ON CONFLICT DO NOTHING;

-- RLS: public read (scores are computed client-side), admin write via service role
ALTER TABLE public.curated_layoff_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "curated_layoff_events_public_read"
  ON public.curated_layoff_events FOR SELECT
  USING (true);

CREATE POLICY "curated_layoff_events_service_write"
  ON public.curated_layoff_events FOR ALL
  USING (auth.role() = 'service_role');

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_curated_layoff_events_ts()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_curated_layoff_events_ts
  BEFORE UPDATE ON public.curated_layoff_events
  FOR EACH ROW EXECUTE FUNCTION update_curated_layoff_events_ts();
