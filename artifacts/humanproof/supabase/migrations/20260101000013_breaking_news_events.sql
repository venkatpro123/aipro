-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: 20260101000013_breaking_news_events.sql
-- Purpose:   Persistent store for breaking layoff news events detected between
--            weekly pipeline runs. Bridges the 7-day gap between scrapes.
--
-- Flow:
--   1. breaking-news-scan Edge Function (every 2h via pg_cron) detects a new
--      layoff event from RSS/HN/India Press/NewsAPI
--   2. Inserts a row here with company_name, date, headline, percent_cut
--   3. patchCompanyDataWithLive() reads recent rows (< 30 days) for the
--      current company and backfills layoffsLast24Months — feeding
--      recentLayoffRisk (30% of L2) directly, not just newsRisk (10%)
--   4. invalidate_analysis_cache_for_company() is called so the next audit
--      uses fresh data
--
-- Minimum latency from announcement to user score update:
--   1. breaking-news-scan runs every 2h → max 2h delay to detection
--   2. Once detected, row inserted → analysis cache invalidated immediately
--   3. Next user to audit sees fresh score incorporating the event
--   4. Active users see the BreakingNewsBanner via onNewLayoffEvent() listener
--   Effective latency: 0–2 hours from announcement to new-audit-score update
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS breaking_news_events (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name     TEXT        NOT NULL,
  event_date       DATE        NOT NULL,
  headline         TEXT        NOT NULL,
  percent_cut      NUMERIC(5,1),           -- NULL if size undisclosed
  affected_count   INTEGER,                -- absolute headcount if known
  source           TEXT        NOT NULL,   -- 'RSS', 'HN', 'IndiaPress', 'NewsAPI'
  source_url       TEXT,
  affected_depts   TEXT[],
  confidence       TEXT        NOT NULL DEFAULT 'low'
                   CHECK (confidence IN ('low','medium','high')),
  -- 'high' = legally filed (SEC 8-K, WARN Act); 'medium' = credible press; 'low' = RSS/HN
  verified         BOOLEAN     NOT NULL DEFAULT false,
  detected_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_name, event_date, source)
);

CREATE INDEX IF NOT EXISTS idx_bne_company    ON breaking_news_events (LOWER(company_name));
CREATE INDEX IF NOT EXISTS idx_bne_date       ON breaking_news_events (event_date DESC);
CREATE INDEX IF NOT EXISTS idx_bne_detected   ON breaking_news_events (detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_bne_recent     ON breaking_news_events (company_name, detected_at DESC);

ALTER TABLE breaking_news_events ENABLE ROW LEVEL SECURITY;

-- Any user can read breaking news (used by liveDataService to feed scores)
CREATE POLICY "read_breaking_news" ON breaking_news_events
  FOR SELECT USING (true);

-- Only service_role (Edge Function) inserts
CREATE POLICY "service_insert_breaking_news" ON breaking_news_events
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "service_update_breaking_news" ON breaking_news_events
  FOR UPDATE USING (auth.role() = 'service_role');

-- ── Auto-expire: delete events older than 30 days ────────────────────────────
-- Keeps the table lean; layoffs.fyi picks up verified events within days.
CREATE OR REPLACE FUNCTION expire_breaking_news_events() RETURNS void LANGUAGE sql AS $$
  DELETE FROM breaking_news_events
  WHERE event_date < CURRENT_DATE - INTERVAL '30 days';
$$;
