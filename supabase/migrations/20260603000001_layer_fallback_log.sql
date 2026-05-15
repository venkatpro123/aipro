-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260603000001_layer_fallback_log.sql
-- Purpose:   WS1 — Per-layer fallback telemetry.
--
--            The current 54-layer pipeline catches exceptions broadly and
--            falls back to heuristics without alerting. The Glassdoor anti-bot
--            silent-degradation issue is the canonical example: when scraping
--            fails, the layer returns a neutral default and the audit
--            completes "successfully" with degraded confidence — but nobody
--            knows.
--
--            This table captures every fallback event so engineers can detect:
--              * source-class outages (Glassdoor failed for 100% of audits in
--                the last 6h → bot-blocked)
--              * silent regressions (a parser change that quietly broke an
--                upstream source for a subset of company name shapes)
--              * persistent unknowns (companies that NEVER acquire live data
--                because all sources fail for them)
--
--            High-volume table. Partitioned by created_at month so old rows
--            can be dropped without scanning.
-- ═══════════════════════════════════════════════════════════════════════════════

-- Parent partitioned table.
CREATE TABLE IF NOT EXISTS public.layer_fallback_log (
  id                   BIGSERIAL,

  -- Identity
  layer_id             TEXT         NOT NULL,    -- e.g. 'L14_executiveMovement', 'glassdoor_scrape'
  layer_kind           TEXT         NOT NULL     -- 'intelligence_layer' | 'data_source' | 'edge_function' | 'scrape'
    CHECK (layer_kind IN ('intelligence_layer', 'data_source', 'edge_function', 'scrape', 'swarm_agent')),
  audit_session_id     UUID,        -- correlates with shadow row + analytics events
  company_canonical    TEXT,        -- enables per-company drilldown

  -- The fallback details
  fallback_reason      TEXT         NOT NULL,    -- 'timeout' | 'anti_bot' | 'parser_failed' | 'null_input' | 'exception' | 'rate_limited' | 'circuit_open'
  fallback_value       JSONB,       -- what value was substituted (null if engine returned null)
  error_kind           TEXT,        -- exception class / error code, free-text
  error_message        TEXT,        -- bounded to 1KB on insert; longer messages truncated

  -- Source signal class — when the fallback was on a data-source layer
  source_class         TEXT,        -- 'REGULATORY' | 'OFFICIAL_FILING' | 'MAJOR_PRESS' | 'AGGREGATED_DATA' | 'SOCIAL_AGGREGATE' | 'SOCIAL_INDIVIDUAL'
  source_name          TEXT,        -- 'yahoo-finance' | 'glassdoor' | 'wikipedia' | ...

  -- Timing
  duration_ms          INTEGER,     -- how long the failing path took before falling back

  -- Lineage
  request_id           UUID,        -- correlates with pipeline_runs and OTel trace id
  engine_version       TEXT,        -- 'v34.0' or 'v35.0+ws3+ws4'
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Partitions: one per month. Create rolling 3 months upfront.
-- Future-month partitions auto-created via the maintenance cron in WS8.
CREATE TABLE IF NOT EXISTS public.layer_fallback_log_2026_06
  PARTITION OF public.layer_fallback_log
  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

CREATE TABLE IF NOT EXISTS public.layer_fallback_log_2026_07
  PARTITION OF public.layer_fallback_log
  FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

CREATE TABLE IF NOT EXISTS public.layer_fallback_log_2026_08
  PARTITION OF public.layer_fallback_log
  FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');

-- ── Indexes ────────────────────────────────────────────────────────────────────
-- Hot path: "show me all fallbacks for layer X in the last 1h"
CREATE INDEX IF NOT EXISTS idx_lfl_layer_recent
  ON public.layer_fallback_log (layer_id, created_at DESC);

-- Hot path: "what source classes are degraded right now"
CREATE INDEX IF NOT EXISTS idx_lfl_source_recent
  ON public.layer_fallback_log (source_name, created_at DESC)
  WHERE source_name IS NOT NULL;

-- Hot path: per-audit drilldown — "why did this audit have low confidence?"
CREATE INDEX IF NOT EXISTS idx_lfl_audit_session
  ON public.layer_fallback_log (audit_session_id)
  WHERE audit_session_id IS NOT NULL;

-- ── Materialized view for ops dashboards ──────────────────────────────────────
-- Per-layer 1h fallback rate. Refreshed by the WS8 maintenance cron.
CREATE MATERIALIZED VIEW IF NOT EXISTS public.layer_fallback_rate_1h AS
SELECT
  layer_id,
  layer_kind,
  source_name,
  source_class,
  fallback_reason,
  COUNT(*) AS fallback_count,
  date_trunc('hour', created_at) AS bucket
FROM public.layer_fallback_log
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY layer_id, layer_kind, source_name, source_class, fallback_reason, bucket;

CREATE INDEX IF NOT EXISTS idx_lfr1h_layer
  ON public.layer_fallback_rate_1h (layer_id, bucket DESC);

-- ── RLS ────────────────────────────────────────────────────────────────────────
ALTER TABLE public.layer_fallback_log ENABLE ROW LEVEL SECURITY;

-- service_role only. Users do not see this table.
-- (No explicit policy needed — service_role bypasses RLS; default deny.)

-- ── Comments ───────────────────────────────────────────────────────────────────
COMMENT ON TABLE public.layer_fallback_log IS
  'WS1 — Per-layer fallback telemetry. Captures every silent degradation '
  '(Glassdoor blocked, Yahoo timeout, Wikipedia regex miss, etc.). Powers '
  'SLO dashboards for per-layer error rate. Partitioned monthly by created_at. '
  'service_role-only readable; engineers query via ops UI or direct SQL.';

COMMENT ON COLUMN public.layer_fallback_log.fallback_reason IS
  'Standard taxonomy: timeout | anti_bot | parser_failed | null_input | '
  'exception | rate_limited | circuit_open. Used to group fallbacks into '
  'remediation categories.';

COMMENT ON COLUMN public.layer_fallback_log.source_class IS
  'Evidence-hierarchy tier of the failing source (when layer_kind=data_source '
  'or scrape). Powers "are our authoritative sources still authoritative?" '
  'queries — if REGULATORY sources fall back at >5%, that is a critical alert.';
