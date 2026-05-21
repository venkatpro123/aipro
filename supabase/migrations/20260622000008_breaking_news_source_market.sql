-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260622000008_breaking_news_source_market.sql
-- Purpose:   Add source_market column to breaking_news_events.
--
-- Motivation: ingest-news now fetches region-specific RSS feeds (UK, DE, FR,
-- SG, IN, LATAM, CA) alongside global sources. Without source_market, there is
-- no way to distinguish a TechCrunch (US) detection from a TechInAsia (APAC)
-- detection of the same event, or to filter the BreakingNewsCard by market.
--
-- source_market: The geographic focus of the SOURCE PUBLICATION that reported
-- the event, NOT the region of the affected company (that's already in `region`).
-- Examples:
--   TechCrunch → source_market='US'
--   TechInAsia → source_market='SG'          (APAC-focused publication)
--   Handelsblatt → source_market='DE'
--   Inc42 → source_market='IN'
--   BetaKit → source_market='CA'
--
-- This enables:
--   1. BreakingNewsCard to label "Source: TechInAsia · APAC"
--   2. Faster non-US detection (now 2-3h vs 6-12h) visible in latency metrics
--   3. Per-market source quality analysis (which feeds produce high-confidence events)
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.breaking_news_events
  ADD COLUMN IF NOT EXISTS source_market TEXT;

COMMENT ON COLUMN public.breaking_news_events.source_market IS
  'Geographic focus of the source publication (not the affected company region). '
  'Examples: US=TechCrunch, IN=Inc42, SG=TechInAsia, DE=Handelsblatt, CA=BetaKit. '
  'NULL for legacy rows inserted before this migration.';

CREATE INDEX IF NOT EXISTS idx_breaking_news_source_market
  ON public.breaking_news_events (source_market, event_date DESC)
  WHERE source_market IS NOT NULL;

-- Backfill existing rows from the source name where inferrable
UPDATE public.breaking_news_events
SET source_market = CASE
  WHEN source ILIKE '%techcrunch%'     THEN 'US'
  WHEN source ILIKE '%layoffs.fyi%'    THEN 'GLOBAL'
  WHEN source ILIKE '%hacker news%'    THEN 'US'
  WHEN source ILIKE '%reddit%'         THEN 'US'
  WHEN source ILIKE '%moneycontrol%'   THEN 'IN'
  WHEN source ILIKE '%economic times%' THEN 'IN'
  WHEN source ILIKE '%ET markets%'     THEN 'IN'
  ELSE NULL
END
WHERE source_market IS NULL;
