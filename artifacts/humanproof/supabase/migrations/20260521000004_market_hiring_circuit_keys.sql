-- market_hiring_circuit_keys
-- Extends api_circuit_status with per-market job board connector keys.
--
-- Problem: The 'naukri' circuit key covered all markets. A Naukri outage
-- would block hiring signal acquisition for US, UK, Singapore, Australia,
-- Canada, LatAm, and MENA companies — none of which use Naukri.
--
-- Solution: Each market's job board connectors get independent circuit keys.
-- The client reports open circuits in skipConnectors[] when calling the
-- proxy-live-signals EF's 'hiring' action, so the EF skips unavailable
-- job boards without burning timeouts.
--
-- New keys (27 total, 9 markets):
--   India:     indeed-india, linkedin-india
--   US:        linkedin-us, indeed-us, glassdoor-jobs
--   UK:        linkedin-uk, indeed-uk, reed, jobsite
--   Germany:   linkedin-de, stepstone, xing
--   Singapore: linkedin-sg, jobsdb, mycareersfuture
--   Australia: linkedin-au, seek, jora
--   Canada:    linkedin-ca, indeed-ca, job-bank
--   LatAm:     linkedin-latam, bumeran, computrabajo
--   MENA:      linkedin-mena, bayt, naukrigulf

-- ── Step 1: drop old CHECK constraint ───────────────────────────────────────
ALTER TABLE public.api_circuit_status
  DROP CONSTRAINT IF EXISTS api_circuit_status_api_name_check;

-- ── Step 2: add new CHECK constraint with all 40 api_name values ────────────
ALTER TABLE public.api_circuit_status
  ADD CONSTRAINT api_circuit_status_api_name_check CHECK (
    api_name IN (
      -- Core APIs (13)
      'alphavantage',
      'newsapi',
      'serper',
      'rss2json',
      'yahoo-finance-us',
      'yahoo-finance-global',
      'naukri',
      'sec-edgar',
      'warn-act',
      'bse',
      'nse-india',
      'london-stock-exchange',
      'sgx',
      -- India hiring (2)
      'indeed-india',
      'linkedin-india',
      -- US hiring (3)
      'linkedin-us',
      'indeed-us',
      'glassdoor-jobs',
      -- UK hiring (4)
      'linkedin-uk',
      'indeed-uk',
      'reed',
      'jobsite',
      -- Germany / EU hiring (3)
      'linkedin-de',
      'stepstone',
      'xing',
      -- Singapore / SEA hiring (3)
      'linkedin-sg',
      'jobsdb',
      'mycareersfuture',
      -- Australia hiring (3)
      'linkedin-au',
      'seek',
      'jora',
      -- Canada hiring (3)
      'linkedin-ca',
      'indeed-ca',
      'job-bank',
      -- LatAm hiring (3)
      'linkedin-latam',
      'bumeran',
      'computrabajo',
      -- MENA hiring (3)
      'linkedin-mena',
      'bayt',
      'naukrigulf'
    )
  );

-- ── Step 3: seed all new connector rows in CLOSED state ─────────────────────
INSERT INTO public.api_circuit_status (api_name, state, consecutive_failures)
VALUES
  -- India hiring
  ('indeed-india',    'CLOSED', 0),
  ('linkedin-india',  'CLOSED', 0),
  -- US hiring
  ('linkedin-us',     'CLOSED', 0),
  ('indeed-us',       'CLOSED', 0),
  ('glassdoor-jobs',  'CLOSED', 0),
  -- UK hiring
  ('linkedin-uk',     'CLOSED', 0),
  ('indeed-uk',       'CLOSED', 0),
  ('reed',            'CLOSED', 0),
  ('jobsite',         'CLOSED', 0),
  -- Germany hiring
  ('linkedin-de',     'CLOSED', 0),
  ('stepstone',       'CLOSED', 0),
  ('xing',            'CLOSED', 0),
  -- Singapore hiring
  ('linkedin-sg',     'CLOSED', 0),
  ('jobsdb',          'CLOSED', 0),
  ('mycareersfuture', 'CLOSED', 0),
  -- Australia hiring
  ('linkedin-au',     'CLOSED', 0),
  ('seek',            'CLOSED', 0),
  ('jora',            'CLOSED', 0),
  -- Canada hiring
  ('linkedin-ca',     'CLOSED', 0),
  ('indeed-ca',       'CLOSED', 0),
  ('job-bank',        'CLOSED', 0),
  -- LatAm hiring
  ('linkedin-latam',  'CLOSED', 0),
  ('bumeran',         'CLOSED', 0),
  ('computrabajo',    'CLOSED', 0),
  -- MENA hiring
  ('linkedin-mena',   'CLOSED', 0),
  ('bayt',            'CLOSED', 0),
  ('naukrigulf',      'CLOSED', 0)
ON CONFLICT (api_name) DO NOTHING;
