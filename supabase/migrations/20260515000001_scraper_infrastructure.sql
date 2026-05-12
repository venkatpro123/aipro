-- 20260515000001_scraper_infrastructure.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Real-Time AI Intelligence System: Phase 0 schema
-- ─────────────────────────────────────────────────────────────────────────────
-- Adds the new tables required by the Fly.io scraper app:
--   1. scrape_jobs                       — per-job log (BullMQ → Supabase)
--   2. tracked_companies                 — hot list with poll-frequency metadata
--   3. linkedin_company_snapshots        — open-jobs time series
--   4. reddit_mentions                   — Reddit posts about companies
--   5. github_company_activity           — commit velocity proxy
--   6. glassdoor_snapshots               — rating/CEO-approval trends
--
-- All tables are additive — no existing schema is altered. Existing tables
-- (breaking_news_events, warn_filings, live_signals_v2, career_page_snapshots)
-- are written into directly by the scraper workers and unchanged here.
--
-- RLS: public read on snapshots/aggregates (no PII); service_role only for INSERT.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. scrape_jobs — per-job log
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.scrape_jobs (
  id              BIGSERIAL    PRIMARY KEY,
  job_type        TEXT         NOT NULL,
  company_name    TEXT,
  target_url      TEXT,
  status          TEXT         NOT NULL
    CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'blocked', 'duplicate')),
  error_kind      TEXT
    CHECK (error_kind IS NULL OR error_kind IN (
      '429', 'captcha', 'timeout', 'parse_error', 'network_error',
      'auth_error', 'not_found', 'rate_limited', 'none'
    )),
  duration_ms     INT,
  enqueued_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  finished_at     TIMESTAMPTZ,
  result_summary  JSONB,
  dedupe_key      TEXT,                                       -- sha256(company|source|date|content_hash)
  UNIQUE (dedupe_key)
);

CREATE INDEX IF NOT EXISTS idx_scrape_jobs_company
  ON public.scrape_jobs (company_name, enqueued_at DESC);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_status
  ON public.scrape_jobs (status, enqueued_at DESC);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_type_status
  ON public.scrape_jobs (job_type, status, enqueued_at DESC);

ALTER TABLE public.scrape_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scrape_jobs_public_read"
  ON public.scrape_jobs FOR SELECT USING (true);
REVOKE INSERT, UPDATE, DELETE ON public.scrape_jobs FROM anon, authenticated;

COMMENT ON TABLE public.scrape_jobs IS
  'Per-job audit log written by the Fly.io scraper app. Used for monitoring '
  'queue health, block rate, and source-specific error patterns.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. tracked_companies — hot list
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tracked_companies (
  company_name    TEXT         PRIMARY KEY,
  priority        TEXT         NOT NULL DEFAULT 'on_demand'
    CHECK (priority IN ('top50', 'top500', 'on_demand')),
  poll_freq_min   INT          NOT NULL DEFAULT 60,
  ticker          TEXT,
  cik             TEXT,
  careers_url     TEXT,
  linkedin_slug   TEXT,
  glassdoor_slug  TEXT,
  reddit_keywords TEXT[],
  github_org      TEXT,
  added_at        TIMESTAMPTZ  DEFAULT now(),
  last_scraped_at TIMESTAMPTZ,
  metadata        JSONB        DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_tracked_companies_priority
  ON public.tracked_companies (priority, last_scraped_at NULLS FIRST);
CREATE INDEX IF NOT EXISTS idx_tracked_companies_due
  ON public.tracked_companies (last_scraped_at NULLS FIRST)
  WHERE priority IN ('top50', 'top500');

ALTER TABLE public.tracked_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tracked_companies_public_read"
  ON public.tracked_companies FOR SELECT USING (true);
REVOKE INSERT, UPDATE, DELETE ON public.tracked_companies FROM anon, authenticated;

COMMENT ON TABLE public.tracked_companies IS
  'Companies the scraper monitors continuously. priority controls poll cadence: '
  'top50 every 30 min, top500 every 6 h, on_demand only when a user audits.';

-- Seed a small top50 set so the scraper has work on first deploy.
-- Operators expand this via INSERT once Fly.io is live.
INSERT INTO public.tracked_companies (company_name, priority, poll_freq_min, ticker, cik)
VALUES
  ('Microsoft',  'top50',  30, 'MSFT', '0000789019'),
  ('Google',     'top50',  30, 'GOOGL','0001652044'),
  ('Apple',      'top50',  30, 'AAPL', '0000320193'),
  ('Amazon',     'top50',  30, 'AMZN', '0001018724'),
  ('Meta',       'top50',  30, 'META', '0001326801'),
  ('Netflix',    'top50',  30, 'NFLX', '0001065280'),
  ('Salesforce', 'top50',  30, 'CRM',  '0001108524'),
  ('Oracle',     'top50',  30, 'ORCL', '0001341439'),
  ('Intel',      'top50',  30, 'INTC', '0000050863'),
  ('IBM',        'top50',  30, 'IBM',  '0000051143'),
  ('TCS',        'top50',  30, 'TCS',   NULL),
  ('Infosys',    'top50',  30, 'INFY',  NULL),
  ('Wipro',      'top50',  30, 'WIT',   NULL),
  ('HCL Technologies', 'top50', 30, 'HCLTECH', NULL),
  ('Tech Mahindra',    'top50', 30, 'TECHM', NULL)
ON CONFLICT (company_name) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. linkedin_company_snapshots — open-jobs time series
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.linkedin_company_snapshots (
  id              BIGSERIAL    PRIMARY KEY,
  company_name    TEXT         NOT NULL,
  linkedin_slug   TEXT,
  open_jobs_count INT,
  top_roles       JSONB,                                       -- [{role,count}, ...]
  delta_pct_vs_prev INT,                                       -- negative = decline (possible freeze)
  snapshot_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  raw_response_hash TEXT                                        -- sha256 of API response for dedup
);

CREATE INDEX IF NOT EXISTS idx_linkedin_company
  ON public.linkedin_company_snapshots (company_name, snapshot_at DESC);
CREATE INDEX IF NOT EXISTS idx_linkedin_delta
  ON public.linkedin_company_snapshots (delta_pct_vs_prev)
  WHERE delta_pct_vs_prev < -20;                                -- hiring-freeze candidates

ALTER TABLE public.linkedin_company_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "linkedin_snapshots_public_read"
  ON public.linkedin_company_snapshots FOR SELECT USING (true);
REVOKE INSERT, UPDATE, DELETE ON public.linkedin_company_snapshots FROM anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. reddit_mentions — posts about companies
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reddit_mentions (
  id              BIGSERIAL    PRIMARY KEY,
  company_name    TEXT         NOT NULL,
  subreddit       TEXT         NOT NULL,
  post_id         TEXT         NOT NULL,                        -- Reddit's t3_ prefix removed
  post_title      TEXT,
  post_url        TEXT,
  body_excerpt    TEXT,                                          -- first 500 chars of selftext
  upvotes         INT,
  comment_count   INT,
  layoff_signal   BOOLEAN      DEFAULT false,
  sentiment_score REAL,                                          -- -1.0 to +1.0
  posted_at       TIMESTAMPTZ,
  fetched_at      TIMESTAMPTZ  DEFAULT now(),
  UNIQUE (post_id, company_name)                                 -- same post for two companies = two rows
);

CREATE INDEX IF NOT EXISTS idx_reddit_company
  ON public.reddit_mentions (company_name, posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_reddit_layoff_signal
  ON public.reddit_mentions (layoff_signal, posted_at DESC) WHERE layoff_signal = true;

ALTER TABLE public.reddit_mentions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reddit_mentions_public_read"
  ON public.reddit_mentions FOR SELECT USING (true);
REVOKE INSERT, UPDATE, DELETE ON public.reddit_mentions FROM anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. github_company_activity — engineering headcount proxy
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.github_company_activity (
  id                BIGSERIAL    PRIMARY KEY,
  company_name      TEXT         NOT NULL,
  github_org        TEXT         NOT NULL,
  repo_full_name    TEXT,
  commits_4w        INT,
  contributors_4w   INT,
  prev_commits_4w   INT,
  delta_pct_vs_prev INT,                                          -- negative => declining velocity
  snapshot_at       TIMESTAMPTZ  DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_github_company
  ON public.github_company_activity (company_name, snapshot_at DESC);
CREATE INDEX IF NOT EXISTS idx_github_decline
  ON public.github_company_activity (delta_pct_vs_prev)
  WHERE delta_pct_vs_prev < -25;

ALTER TABLE public.github_company_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "github_activity_public_read"
  ON public.github_company_activity FOR SELECT USING (true);
REVOKE INSERT, UPDATE, DELETE ON public.github_company_activity FROM anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. glassdoor_snapshots — lagging sentiment signal
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.glassdoor_snapshots (
  id                BIGSERIAL    PRIMARY KEY,
  company_name      TEXT         NOT NULL,
  glassdoor_slug    TEXT,
  overall_rating    REAL,                                         -- 1.0 - 5.0
  ceo_approval_pct  INT,                                          -- 0 - 100
  recommend_pct     INT,                                          -- "would recommend to a friend"
  review_count      INT,
  delta_rating      REAL,                                         -- vs. last snapshot
  snapshot_at       TIMESTAMPTZ  DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_glassdoor_company
  ON public.glassdoor_snapshots (company_name, snapshot_at DESC);

ALTER TABLE public.glassdoor_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "glassdoor_snapshots_public_read"
  ON public.glassdoor_snapshots FOR SELECT USING (true);
REVOKE INSERT, UPDATE, DELETE ON public.glassdoor_snapshots FROM anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Realtime publication for the new event-rich tables
-- ─────────────────────────────────────────────────────────────────────────────
-- breaking_news_events is already in supabase_realtime (from 20260501000002).
-- Add scrape_jobs so operators can watch ingestion live.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'scrape_jobs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.scrape_jobs;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Helper view: due_for_scrape — companies whose last scrape exceeds poll_freq
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.due_for_scrape AS
SELECT
  company_name,
  priority,
  poll_freq_min,
  ticker,
  cik,
  careers_url,
  linkedin_slug,
  glassdoor_slug,
  github_org,
  reddit_keywords,
  last_scraped_at,
  EXTRACT(EPOCH FROM (now() - COALESCE(last_scraped_at, '1970-01-01'::timestamptz))) / 60
    AS minutes_since_last
FROM public.tracked_companies
WHERE last_scraped_at IS NULL
   OR last_scraped_at < now() - (poll_freq_min || ' minutes')::interval;

COMMENT ON VIEW public.due_for_scrape IS
  'Companies whose poll_freq_min has elapsed since last_scraped_at. The '
  'scraper-enqueue Edge Function reads this view to batch the next round of jobs.';

GRANT SELECT ON public.due_for_scrape TO anon, authenticated, service_role;
