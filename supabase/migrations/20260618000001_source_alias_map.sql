-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260618000001_source_alias_map.sql
-- Purpose:   WS12 — runtime-mutable source-name alias map.
--
--            evidenceHierarchy.normalizeSourceName() is the always-on
--            canonicaliser (lowercase + hyphenate + strip junk). Most
--            cases reduce to the same canonical form without any DB
--            lookup. This table handles the cases that DON'T reduce
--            cleanly:
--
--              * Vendor renames mid-flight (newsapi.io → newsapi.org).
--              * Source-name collisions (two different scrapers both
--                emit 'wikipedia' but one means en.wikipedia.org and
--                another means a wikipedia-derived JSONP feed).
--              * Per-deployment overrides — staging vs prod might emit
--                different vendor identifiers for the same source.
--
--            The runtime contract:
--              normalize_source(raw_source) = COALESCE(
--                source_aliases.canonical WHERE raw = normalize(raw_source),
--                normalize(raw_source)
--              )
--
--            Mutating this table does NOT require a code deploy. Ops
--            can fix a tier-misclassification incident by inserting a
--            row, and the next audit picks it up via the WS12 cache
--            refresh (30min TTL).
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.source_aliases (
  -- The form a connector / scraper actually emits. Stored already
  -- normalized (lowercase + hyphen + alphanumeric) so lookups are O(1)
  -- against the normalize() function in evidenceHierarchy.ts.
  raw             TEXT         PRIMARY KEY,
  -- The single canonical name this alias resolves to. Matches a key in
  -- DEFAULT_TIER_BY_SOURCE in evidenceHierarchy.ts.
  canonical       TEXT         NOT NULL,
  -- Free-text explanation: why this alias exists, when it was added.
  rationale       TEXT,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  created_by      TEXT         NOT NULL DEFAULT 'WS12-seed'
);

-- Reverse lookup: "give me every alias for canonical X".
CREATE INDEX IF NOT EXISTS idx_source_aliases_canonical
  ON public.source_aliases (canonical);

-- ── RLS ────────────────────────────────────────────────────────────────────
-- Public read. The table contains no PII; clients need the map to
-- classify signals consistently with the server.
ALTER TABLE public.source_aliases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "source_aliases_read_all"
  ON public.source_aliases FOR SELECT
  TO authenticated, anon
  USING (true);

-- ── Seed the known aliases ─────────────────────────────────────────────────
-- Drawn from a repo-wide grep of source_name literals appearing in
-- liveDataService, scrapingOrchestrator, dataConnectors/*, and the
-- audit-coalesce edge function. Each canonical form matches an entry
-- in DEFAULT_TIER_BY_SOURCE in evidenceHierarchy.ts.
INSERT INTO public.source_aliases (raw, canonical, rationale) VALUES
  -- Yahoo Finance variants
  ('yahoofinance',           'yahoo-finance',          'String compare bypass — audit finding #10'),
  ('yahoo-fte',              'yahoo-fte',              'Identity (already canonical) — listed for explicitness'),
  ('yahoo',                  'yahoo-finance',          'Short alias used by liveDataService.fetchYahooPrice'),
  -- Wikipedia variants
  ('en.wikipedia',           'wikipedia',              'EN-only scrape namespace'),
  ('en.wikipedia.org',       'wikipedia',              'EN-only scrape namespace'),
  ('wikipedia-infobox',      'wikipedia',              'Subset of wikipedia scrape, same tier'),
  -- Glassdoor variants
  ('glassdoor.com',          'glassdoor',              'Domain-form alias'),
  ('glassdoor-reviews',      'glassdoor-review',       'Pluralisation drift'),
  -- LinkedIn variants
  ('linkedin.com',           'linkedin',               'Domain-form alias'),
  ('linkedin-headcount',     'linkedin-headcount',     'Identity — listed for explicitness'),
  -- News aggregator variants
  ('google-news-rss',        'google-news',            'Underscore/hyphen drift'),
  ('googlenews',             'google-news',            'No-separator drift'),
  ('bing-news-rss',          'bing-news',              'Underscore/hyphen drift'),
  -- Naukri / Indeed
  ('naukri.com',             'naukri',                 'Domain-form alias'),
  ('indeed.com',             'indeed',                 'Domain-form alias'),
  -- SEC variants
  ('sec.gov',                'sec',                    'Domain-form alias'),
  ('sec-edgar',              'sec',                    'Sub-system of SEC'),
  ('edgar',                  'sec',                    'Common short alias'),
  -- WARN Act variants
  ('warn-act',               'warn',                   'Hyphenation drift'),
  ('warn.gov',               'warn',                   'Domain-form alias'),
  -- Press / aggregated
  ('bloomberg.com',          'bloomberg',              'Domain-form alias'),
  ('reuters.com',            'reuters',                'Domain-form alias'),
  ('techcrunch.com',         'techcrunch',             'Domain-form alias'),
  -- Social variants
  ('twitter.com',            'twitter',                'Domain-form alias'),
  ('x.com',                  'twitter',                'Post-rename alias'),
  ('news.ycombinator.com',   'hackernews',             'Domain-form alias'),
  ('reddit.com',             'reddit',                 'Domain-form alias')
ON CONFLICT (raw) DO NOTHING;

COMMENT ON TABLE public.source_aliases IS
  'WS12 — runtime alias map for source canonicalisation. Lookups happen '
  'AFTER evidenceHierarchy.normalizeSourceName has already lowercased + '
  'hyphenated the input. This table catches the cases that string-cleaning '
  'cannot reach (vendor renames, scraper-name drift, deployment-specific '
  'identifiers). Mutating a row applies on the next 30min cache refresh.';
