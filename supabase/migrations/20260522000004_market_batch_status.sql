-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260522000004_market_batch_status.sql
-- Purpose:   Per-region batch tracking for the market intelligence refresh.
--
-- The refresh-market-intelligence EF runs weekly but currently has no per-region
-- isolation. A LinkedIn DE bot-block can mask the success of the India batch.
-- This migration adds:
--
--   1. market_batch_status — one row per regional batch. The EF writes after
--      each independent batch completes (success or failure), so a blocked DE
--      batch never prevents a successful IN row from appearing here.
--
--   2. Batch IDs (7 total):
--        india_batch     — IN  (Naukri, Indeed India, LinkedIn IN)
--        us_batch        — US  (LinkedIn US, Indeed US, BLS JOLTS)
--        uk_batch        — GB  (LinkedIn UK, Reed, ONS vacancy)
--        germany_batch   — DE  (StepStone, XING, IAB employment)
--        singapore_batch — SG  (JobsDB, LinkedIn SG, MOM)
--        latam_batch     — BR/MX (Bumeran, LinkedIn LatAm)
--        mena_batch      — AE/SA (Bayt, LinkedIn MENA)
--
--   3. Client freshness check: if last_success_at is > 14 days ago for the
--      user's region batch, TakeActionTab shows an amber notice:
--      "Market data for UK Data Engineering: last updated 18 days ago.
--       Opening counts may not reflect current demand."
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.market_batch_status (
  -- 'india_batch' | 'us_batch' | 'uk_batch' | 'germany_batch' |
  -- 'singapore_batch' | 'latam_batch' | 'mena_batch'
  batch_id           TEXT          PRIMARY KEY,

  -- ISO-3166 region codes covered by this batch (e.g. '{IN}', '{DE,AT,CH}')
  region_codes       TEXT[]        NOT NULL DEFAULT '{}',

  -- Human label shown in UI (e.g. 'India', 'Germany / DACH')
  region_label       TEXT          NOT NULL DEFAULT '',

  -- Timing
  last_run_at        TIMESTAMPTZ,
  last_success_at    TIMESTAMPTZ,   -- updated IFF at least 1 role succeeded

  -- Aggregate outcome: 'success' | 'partial' | 'failed'
  --   success  — all 16 roles got ≥1 count
  --   partial  — some roles succeeded, some failed
  --   failed   — 0 roles got any count (all sources blocked / network error)
  last_status        TEXT          CHECK (last_status IN ('success', 'partial', 'failed')),

  -- Role-level stats
  roles_success      INTEGER       NOT NULL DEFAULT 0,
  roles_total        INTEGER       NOT NULL DEFAULT 0,

  -- Source tracking (which sites provided data vs. which were blocked)
  sources_used       TEXT[]        NOT NULL DEFAULT '{}',
  sources_blocked    TEXT[]        NOT NULL DEFAULT '{}',

  -- Free-text error detail for the last failed batch (NULL on success)
  error_detail       TEXT,

  -- Staleness threshold (days) — stored so ops can tune without redeploying EF
  stale_threshold_days  INTEGER    NOT NULL DEFAULT 14
);

-- Index for region-code lookup from the client (maps user region → batch)
CREATE INDEX IF NOT EXISTS idx_mbs_region_codes
  ON public.market_batch_status USING GIN (region_codes);

-- Index for staleness queries: find all batches with success_at < NOW() - 14d
CREATE INDEX IF NOT EXISTS idx_mbs_last_success
  ON public.market_batch_status (last_success_at NULLS FIRST);

ALTER TABLE public.market_batch_status ENABLE ROW LEVEL SECURITY;

-- Service_role writes — only the EF can update batch status
CREATE POLICY mbs_service_write ON public.market_batch_status
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Public read — batch freshness is not sensitive
CREATE POLICY mbs_public_read ON public.market_batch_status
  FOR SELECT TO anon, authenticated USING (true);

COMMENT ON TABLE public.market_batch_status IS
  'Per-regional-batch status for the weekly market intelligence refresh. '
  'One row per batch (india, us, uk, germany, singapore, latam, mena). '
  'last_success_at only updated when ≥1 role in the batch succeeded, so a '
  'complete bot-block leaves the previous success timestamp intact. '
  'Clients check: if last_success_at < NOW() - stale_threshold_days * INTERVAL → amber warning.';

-- ── Seed the 7 batch rows ──────────────────────────────────────────────────────
-- The EF will UPDATE these on each run; they must exist before the first run.
-- stale_threshold_days = 14 for all batches (1 missed weekly cycle = amber).

INSERT INTO public.market_batch_status
  (batch_id,          region_codes,           region_label,          stale_threshold_days)
VALUES
  ('india_batch',     ARRAY['IN'],             'India',               14),
  ('us_batch',        ARRAY['US','CA','AU'],   'United States',       14),
  ('uk_batch',        ARRAY['GB','IE'],        'United Kingdom',      14),
  ('germany_batch',   ARRAY['DE','AT','CH'],   'Germany / DACH',      14),
  ('singapore_batch', ARRAY['SG'],             'Singapore',           14),
  ('latam_batch',     ARRAY['BR','MX','AR','CO','CL'], 'Latin America', 14),
  ('mena_batch',      ARRAY['AE','SA','QA','EG','KW'], 'MENA',         14)
ON CONFLICT (batch_id) DO NOTHING;
