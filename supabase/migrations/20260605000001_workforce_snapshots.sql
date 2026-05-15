-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260605000001_workforce_snapshots.sql
-- Purpose:   WS3 — Per-company headcount time series for stealth-layoff detection.
--
--            Audit Issue #24: companies that reduce headcount via stack-rank
--            exits, PIPs, contractor re-classification, or quiet sunsetting of
--            divisions never appear in WARN/layoffs.fyi/news. The engine's L2
--            stays at zero and D8 does not fire because layoffRounds = 0. Real
--            risk: large. Detected risk: none.
--
--            Mechanism: track weekly headcount from LinkedIn (primary —
--            employees self-report current employer) plus secondary sources.
--            When the rolling 6-month delta exceeds -5% with no announced
--            layoff round, stealthLayoffDetector.ts flags the audit.
--
--            Schema notes:
--              * One row per (company_canonical_name, source, observed_week).
--              * Weeks are anchored to UTC Monday for stable joins.
--              * Headcount stored as INTEGER (LinkedIn rounds anyway).
--              * UNIQUE (company, source, week) makes the weekly scraper
--                idempotent — re-runs on the same week just upsert.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.workforce_snapshots (
  id                       BIGSERIAL    PRIMARY KEY,

  -- Identity
  company_canonical_name   TEXT         NOT NULL,
  -- ISO date anchored to the Monday of the observation week (UTC).
  observed_week            DATE         NOT NULL,
  source                   TEXT         NOT NULL    -- 'linkedin', 'wikipedia', 'sec-edgar', 'naukri-listed', etc.
    CHECK (source IN ('linkedin', 'wikipedia', 'sec-edgar', 'yahoo-fte', 'career-page', 'naukri-listed', 'manual')),

  -- Measurement
  employee_count           INTEGER      NOT NULL CHECK (employee_count >= 0 AND employee_count <= 5000000),
  -- Optional confidence in this snapshot, 0-1. LinkedIn is high; career-page
  -- "we are 50,000+ professionals" claims are coarser.
  measurement_confidence   NUMERIC(3,2) NOT NULL DEFAULT 0.80
    CHECK (measurement_confidence BETWEEN 0 AND 1),

  -- Provenance
  observed_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  scrape_job_id            BIGINT,      -- references scrape_jobs.id (no FK to keep cross-schema flexibility)
  raw_capture              JSONB,       -- optional snippet of source HTML / API response for audit

  -- Indexing
  UNIQUE (company_canonical_name, source, observed_week)
);

CREATE INDEX IF NOT EXISTS idx_ws_company_week
  ON public.workforce_snapshots (company_canonical_name, observed_week DESC);

CREATE INDEX IF NOT EXISTS idx_ws_source_week
  ON public.workforce_snapshots (source, observed_week DESC);

-- Hot path for stealthLayoffDetector: "last 26 weeks of LinkedIn snapshots
-- for this company". Partial index keeps it tight.
CREATE INDEX IF NOT EXISTS idx_ws_linkedin_recent
  ON public.workforce_snapshots (company_canonical_name, observed_week DESC)
  WHERE source = 'linkedin';

-- ── RLS ────────────────────────────────────────────────────────────────────────
ALTER TABLE public.workforce_snapshots ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read snapshots (audit pipeline reads them).
CREATE POLICY "ws_read_all"
  ON public.workforce_snapshots FOR SELECT
  TO authenticated, anon
  USING (true);

-- service_role writes only (scraper).
-- (Default deny on INSERT/UPDATE/DELETE for authenticated; service_role bypasses RLS.)

-- ── Aggregated view: 6-month deltas ────────────────────────────────────────────
-- Pre-computed delta view that stealthLayoffDetector queries directly. The view
-- joins each company's most recent LinkedIn snapshot against the 26-week-prior
-- snapshot from the same source and exposes the percentage change.
CREATE OR REPLACE VIEW public.workforce_velocity_6mo AS
WITH recent AS (
  SELECT DISTINCT ON (company_canonical_name, source)
    company_canonical_name,
    source,
    observed_week     AS recent_week,
    employee_count    AS recent_count,
    measurement_confidence AS recent_conf
  FROM public.workforce_snapshots
  WHERE observed_week >= NOW()::date - INTERVAL '14 days'
  ORDER BY company_canonical_name, source, observed_week DESC
),
prior AS (
  SELECT DISTINCT ON (company_canonical_name, source)
    company_canonical_name,
    source,
    observed_week     AS prior_week,
    employee_count    AS prior_count
  FROM public.workforce_snapshots
  WHERE observed_week BETWEEN (NOW()::date - INTERVAL '200 days')
                          AND (NOW()::date - INTERVAL '160 days')
  ORDER BY company_canonical_name, source, observed_week DESC
)
SELECT
  r.company_canonical_name,
  r.source,
  r.recent_week,
  r.recent_count,
  p.prior_week,
  p.prior_count,
  r.recent_conf,
  ((r.recent_count::NUMERIC - p.prior_count::NUMERIC) / NULLIF(p.prior_count, 0)) * 100
    AS pct_change_6mo
FROM recent r
JOIN prior  p USING (company_canonical_name, source);

COMMENT ON TABLE public.workforce_snapshots IS
  'WS3 — Weekly per-company headcount measurements from LinkedIn, SEC EDGAR, '
  'and other sources. Powers stealthLayoffDetector for Audit Issue #24 '
  '(layoffs that never appear in news/WARN/layoffs.fyi). Unique on '
  '(company, source, week) makes scraper writes idempotent.';

COMMENT ON VIEW public.workforce_velocity_6mo IS
  'WS3 — Pre-computed 6-month headcount delta per (company, source). Read '
  'directly by stealthLayoffDetector.ts to flag stealth reductions.';
