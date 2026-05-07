-- 20260501000002_breaking_news_events.sql
-- Creates the breaking_news_events table that liveDataService.ts queries and
-- LayoffCalculator.tsx subscribes to via Supabase Realtime.
--
-- This table is the primary real-time path for layoff events detected between
-- weekly pipeline runs. Without it, every call to liveDataService.ts silently
-- fails its breaking_news_events query — meaning major confirmed layoff events
-- (TCS 15k, etc.) never reach the L2 scoring path where they carry 30% weight.
--
-- Populated by:
--   1. The weekly data-refresh GitHub Action that scrapes layoffs.fyi + WARN
--   2. The analyze-signals Edge Function when it detects a confirmed event
--   3. Manual operator inserts for high-priority breaking events

CREATE TABLE IF NOT EXISTS public.breaking_news_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name    TEXT NOT NULL,
  event_date      DATE NOT NULL,
  headline        TEXT NOT NULL,
  percent_cut     NUMERIC(5,2),          -- % of workforce affected, when known
  affected_count  INTEGER,               -- absolute headcount, when known
  /**
   * Signal confidence tier:
   *   high   — SEC 8-K, WARN Act notice, company press release (legal disclosure)
   *   medium — credible business press (ET, Mint, WSJ, Bloomberg)
   *   low    — social media, unverified aggregators
   */
  confidence      TEXT NOT NULL DEFAULT 'medium'
    CHECK (confidence IN ('high', 'medium', 'low')),
  source          TEXT NOT NULL,         -- source publication or regulatory body
  source_url      TEXT,
  industry        TEXT,
  region          TEXT DEFAULT 'IN',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  /** Prevent duplicate inserts for the same event from multiple pipeline runs */
  UNIQUE (company_name, event_date, source)
);

-- Index for the query pattern in liveDataService.ts:
--   .ilike('company_name', `%${companyName}%`)
--   .gte('event_date', thirtyDaysAgo)
CREATE INDEX IF NOT EXISTS idx_breaking_news_company
  ON public.breaking_news_events (company_name, event_date DESC);

CREATE INDEX IF NOT EXISTS idx_breaking_news_date
  ON public.breaking_news_events (event_date DESC);

-- Realtime subscription (LayoffCalculator.tsx subscribes to new rows)
ALTER TABLE public.breaking_news_events REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'breaking_news_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.breaking_news_events;
  END IF;
END $$;

-- RLS: public read (aggregate intelligence — no PII); only service_role writes
ALTER TABLE public.breaking_news_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "breaking_news_public_read"
  ON public.breaking_news_events FOR SELECT
  USING (true);

-- service_role bypasses RLS by default — no explicit grant needed for pipeline writes
REVOKE INSERT, UPDATE, DELETE ON public.breaking_news_events FROM anon, authenticated;

COMMENT ON TABLE public.breaking_news_events IS
  'Real-time store for confirmed layoff events detected between weekly pipeline runs. '
  'Queried by liveDataService.ts to backfill layoffsLast24Months, which feeds '
  'recentLayoffRisk (30% of L2). Not having this table causes all breaking-news '
  'queries to fail silently, meaning major confirmed layoffs carry near-zero '
  'score weight until the weekly refresh runs.';

-- Verification query:
-- SELECT company_name, event_date, headline, confidence FROM public.breaking_news_events
-- ORDER BY event_date DESC LIMIT 10;
