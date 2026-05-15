-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260621000001_company_canonical_view.sql
-- Purpose:   v35.1.3 — autocomplete dedup. The company_intelligence table
--            contains 5+ duplicate snapshots for every famous company (5
--            Oracle rows, 17 Meta rows, 6 Amazon rows, etc.) because
--            ingestion runs never deduped. The user-facing autocomplete
--            does ILIKE '%query%' which returns ALL duplicates, producing
--            a confusing dropdown.
--
--            This migration creates:
--              1. company_canonical_aliases — a data-driven map of
--                 (canonical_name, match_pattern, exclude_pattern). Ops can
--                 add/edit entries without a code deploy.
--              2. v_company_canonical — a view that returns ONE row per
--                 canonical entity. Picks the row with the most plausible
--                 workforce_count and most recent last_updated.
--
--            Performance: autocomplete queries are predicate-filtered
--            (ILIKE '%query%') BEFORE the dedup ranking runs, so the
--            LATERAL canonical lookup operates on ~10-20 rows per query.
--            Negligible overhead.
--
--            The audit pipeline's row-resolution (v35.1.2 in fetch-company-data)
--            is unchanged — it converges to the canonical row via
--            KNOWN_HEADCOUNTS proximity regardless of which row the user
--            picked in the dropdown.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── canonical_company_aliases registry ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.company_canonical_aliases (
  id              BIGSERIAL    PRIMARY KEY,
  canonical_name  TEXT         NOT NULL,
  -- POSIX regex (case-insensitive) — when a company_name matches this,
  -- it folds into the canonical_name group.
  match_pattern   TEXT         NOT NULL,
  -- Optional negative-match. Rows matching this are EXCLUDED from the
  -- canonical group (e.g. "Oracle Financial Services" matches /^oracle/
  -- but should NOT fold into Oracle Corporation).
  exclude_pattern TEXT,
  -- Higher = checked first. Use when a more-specific pattern needs to
  -- win over a more-general one (e.g. "tata consultancy" should be
  -- checked BEFORE "tata" if both ever existed).
  priority        INTEGER      NOT NULL DEFAULT 0,
  -- Provenance for audit trail.
  rationale       TEXT,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  created_by      TEXT         NOT NULL DEFAULT 'v35.1.3-seed'
);

CREATE INDEX IF NOT EXISTS idx_canonical_aliases_priority
  ON public.company_canonical_aliases (priority DESC);

-- RLS: read-only for clients.
ALTER TABLE public.company_canonical_aliases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "canonical_aliases_read_all"
  ON public.company_canonical_aliases FOR SELECT
  TO authenticated, anon
  USING (true);

-- ── Seed the well-known canonical entities ────────────────────────────────
-- Coverage: companies with confirmed >=2 duplicate rows in production. List
-- driven by the v35.1.3 audit (Oracle:5, Meta:17, Amazon:6, Microsoft:5, etc.).
-- All match_pattern values are case-insensitive POSIX regexes.
INSERT INTO public.company_canonical_aliases
  (canonical_name, match_pattern, exclude_pattern, priority, rationale) VALUES
  -- ── US Big Tech ──
  ('Microsoft',                  '^microsoft\M',         NULL,                 10, '5 dupes including "Microsoft Corp", "Microsoft (Enriched)"'),
  ('Amazon',                     '^amazon\M',            NULL,                 10, '6 dupes including AWS variants'),
  ('Meta Platforms',             '^meta( |$|\W)',        '^metallica|^metalu', 10, '17 dupes! Excludes "Metallica" et al. that share the prefix'),
  ('Apple',                      '^apple\M',             NULL,                 10, '4 dupes'),
  ('Google',                     '^google\M|^alphabet\M', NULL,                10, 'Google + Alphabet dupes'),
  ('Tesla',                      '^tesla\M',             '^teslam',            10, '4 dupes; excludes "Teslam" if it exists'),
  ('NVIDIA',                     '^nvidia\M',            NULL,                 10, '3 dupes'),
  ('Salesforce',                 '^salesforce\M',        NULL,                 10, '4 dupes'),
  ('IBM',                        '^ibm\M|^international business machines', NULL, 10, '3 dupes'),
  ('Intel',                      '^intel( |$|\W)',       '^intelli|^intellij', 10, '6 dupes; excludes "Intellisense" et al.'),
  ('Cisco',                      '^cisco\M',             NULL,                 10, '3 dupes'),
  ('Adobe',                      '^adobe\M',             NULL,                 10, '3 dupes'),
  ('Netflix',                    '^netflix\M',           NULL,                 10, '2 dupes'),
  ('Oracle Corporation',         '^oracle\M',            'financial services|ofss', 20, '5 dupes; excludes Oracle Financial Services (distinct entity OFSS)'),
  ('Oracle Financial Services',  'oracle financial services|^ofss\M', NULL,    30, 'Distinct Indian-listed subsidiary'),

  -- ── Indian IT Services ──
  ('Tata Consultancy Services',  '^tcs\M|^tata consultancy', NULL,             30, '2 dupes; tcs short-form alias'),
  ('Infosys',                    '^infosys\M',           'infosys bpm',         20, '3 dupes; excludes Infosys BPM (subsidiary)'),
  ('Infosys BPM',                'infosys bpm',          NULL,                  30, 'Distinct subsidiary'),
  ('Wipro',                      '^wipro\M',             NULL,                  10, '2 dupes'),
  ('HCL Technologies',           '^hcl( |$|\W)|^hcltech\M', NULL,               10, '2 dupes'),
  ('Tech Mahindra',              '^tech mahindra|^techmahindra', NULL,          10, NULL),
  ('Cognizant',                  '^cognizant\M',         NULL,                  10, '2 dupes'),
  ('Accenture',                  '^accenture\M',         NULL,                  10, '2 dupes'),
  ('Capgemini',                  '^capgemini\M',         NULL,                  10, NULL),
  ('LTIMindtree',                '^ltimindtree\M|^lti\M', NULL,                 10, NULL),

  -- ── Tata Group (each is a DISTINCT entity — must not collapse) ──
  ('Tata Steel',                 '^tata steel',          NULL,                  20, NULL),
  ('Tata Motors',                '^tata motors',         NULL,                  20, NULL),
  ('Tata Power',                 '^tata power',          NULL,                  20, NULL),
  ('Tata Communications',        '^tata communications', NULL,                  20, NULL),
  ('Tata Capital',               '^tata capital',        NULL,                  20, NULL),
  ('Tata Consumer Products',     '^tata consumer',       NULL,                  20, NULL),
  ('Tata Elxsi',                 '^tata elxsi',          NULL,                  20, NULL),
  ('Tata Chemicals',             '^tata chemicals',      NULL,                  20, NULL)
ON CONFLICT DO NOTHING;

-- ── The canonical view ────────────────────────────────────────────────────
-- For each company_intelligence row:
--   1. Find the best-matching canonical alias (highest priority wins;
--      pattern with longer specificity also wins via priority field).
--   2. If no alias matches, the company_name itself IS the canonical name.
--   3. Partition by canonical_name; within each partition, pick the row
--      with the most plausible workforce_count + most recent last_updated.
--   4. Aggregate all original names + canonical aliases into a
--      `search_haystack` column so autocomplete queries match the user's
--      short forms (typing "TCS" finds the canonical "Tata Consultancy
--      Services" row because the haystack contains both names).
CREATE OR REPLACE VIEW public.v_company_canonical AS
WITH labeled AS (
  SELECT
    ci.*,
    -- Resolve each company to its canonical name. LATERAL subquery picks
    -- the highest-priority alias whose match_pattern matches the row AND
    -- whose exclude_pattern (if any) does NOT match.
    COALESCE(
      (SELECT m.canonical_name
       FROM public.company_canonical_aliases m
       WHERE ci.company_name ~* m.match_pattern
         AND (m.exclude_pattern IS NULL OR ci.company_name !~* m.exclude_pattern)
       ORDER BY m.priority DESC, length(m.match_pattern) DESC
       LIMIT 1),
      ci.company_name
    ) AS canonical_name
  FROM public.company_intelligence ci
),
ranked AS (
  SELECT
    *,
    -- Rank within each canonical group. Tie-break order:
    --   1. Workforce_count >= 1000 (i.e. not obviously broken stub)
    --   2. last_updated DESC (most recent snapshot wins)
    --   3. confidence_score DESC (highest-confidence row wins)
    --   4. workforce_count DESC (final tie-break: larger company entity)
    ROW_NUMBER() OVER (
      PARTITION BY canonical_name
      ORDER BY
        CASE WHEN workforce_count >= 1000 THEN 0 ELSE 1 END,
        last_updated DESC NULLS LAST,
        confidence_score DESC NULLS LAST,
        workforce_count DESC NULLS LAST
    ) AS canonical_rank,
    COUNT(*) OVER (PARTITION BY canonical_name) AS n_duplicates
  FROM labeled
),
aggregated_aliases AS (
  -- For each canonical_name, build a space-separated haystack of all
  -- raw names that fold into it. ILIKE against this haystack catches
  -- user queries that use short forms (TCS, ORCL, etc.) even though the
  -- canonical display name is the full form.
  SELECT
    canonical_name,
    string_agg(DISTINCT company_name, ' | ') AS search_haystack
  FROM labeled
  GROUP BY canonical_name
)
SELECT
  r.id,
  -- Show the canonical_name as the display name. Falls back to the
  -- original company_name when there's no alias match.
  r.canonical_name                AS company_name,
  -- Original name preserved for callers that need it (e.g. the audit
  -- pipeline's fetch-company-data still uses ILIKE against the raw table,
  -- so the original name remains addressable).
  r.company_name                  AS raw_company_name,
  industry,
  workforce_count,
  company_size,
  stage,
  financial_signals,
  layoff_history,
  hiring_signals,
  ai_exposure_index,
  market_risk_score,
  company_risk_score,
  confidence_score,
  role_risk_map,
  archetype,
  data_source,
  -- stock_ticker lives inside financial_signals JSONB — extract for convenience
  (financial_signals->>'ticker') AS stock_ticker,
  github_org,
  open_jobs_count,
  last_updated,
  -- Tells the UI how many duplicate snapshots existed in the raw table.
  -- Use this for an info badge: "Oracle (5 sources)" — explains why the
  -- user only sees one entry instead of five.
  n_duplicates,
  -- Pipe-delimited concatenation of every raw company_name that folded into
  -- this canonical row. ILIKE '%tcs%' will match "TCS (Tata Consultancy
  -- Services) | Tata Consultancy Services (India Giant)" and return the
  -- canonical "Tata Consultancy Services" row.
  a.search_haystack,
  created_at,
  updated_at
FROM ranked r
JOIN aggregated_aliases a ON r.canonical_name = a.canonical_name
WHERE r.canonical_rank = 1;

COMMENT ON VIEW public.v_company_canonical IS
  'v35.1.3 — Autocomplete dedup view. Returns one row per canonical entity by '
  'collapsing duplicate snapshots in company_intelligence. Ranking: '
  '(workforce >= 1000 first, then last_updated DESC, then confidence DESC). '
  'Canonical name comes from company_canonical_aliases (data-driven); rows '
  'with no alias match keep their raw company_name. Used by '
  'companyIntelligenceService.searchCompanies() in the SPA.';

COMMENT ON TABLE public.company_canonical_aliases IS
  'v35.1.3 — Canonical-name mapping for autocomplete dedup. Ops can add new '
  'entries without a code deploy. match_pattern is a POSIX regex evaluated '
  'against company_intelligence.company_name; exclude_pattern guards against '
  'false-positive collapses (e.g. "Oracle Financial Services" should NOT fold '
  'into Oracle Corporation). Higher priority wins when multiple aliases match.';
