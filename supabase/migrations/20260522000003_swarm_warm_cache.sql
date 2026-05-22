-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260522000003_swarm_warm_cache.sql
-- Purpose:   Server-side swarm cache warm infrastructure.
--
-- The swarm layer (30 agents) is the primary compute cost in the audit pipeline.
-- At 10,000 daily audits and a 30-40s swarm wall-clock time, the swarm layer
-- is the single largest latency contributor and cost driver.
--
-- This migration adds:
--   1. swarm_warm_cache — stores pre-computed SwarmReport JSONB keyed by
--      (company, role, department). Written weekly by warm-swarm-cache EF,
--      also written by user audits so every result warms the server cache.
--      Client reads via hydrateSwarmCache() before each audit; on hit,
--      populates localStorage so the synchronous getSwarmCache() returns
--      immediately — the 30 agents never run for pre-warmed combos.
--
--   2. calibration_drift_events extension — adds 'cache_warm' event_kind
--      so the weekly warming job can record effectiveness metrics (combos
--      attempted, combos warmed, warm_rate_pct, duration_ms) in the same
--      permanent audit log used for score drift events.
--
--   3. pg_cron job — warm-swarm-cache EF at 05:00 UTC every Monday.
--      Schedule context:
--        Sun 03:00 UTC — recalibrate-engine (fresh weights)
--        Mon 04:00 UTC — coverage-audit    (reads recalibration metrics)
--        Mon 05:00 UTC — warm-swarm-cache  (uses fresh company data + weights)
--        Mon 06:00 UTC — refresh-market-intelligence (Serper scrape)
--      The 05:00 slot ensures warming runs after recalibration but before
--      the Serper scrape that may invalidate stale company signals.
--
-- Expected impact at 10,000 daily audits:
--   Top-100 combos absorb ~65% of audit volume (power-law distribution).
--   Cache TTL 24h means Monday warming covers Mon 05:00→Tue 05:00.
--   Net swarm execution reduction: ~4-5× vs cold-cache baseline.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. swarm_warm_cache ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.swarm_warm_cache (
  id              BIGSERIAL     PRIMARY KEY,

  -- Lookup key — matches makeKey() in swarmCache.ts:
  --   swarm_cache::{company_lower}::{role_lower}::{department_lower}
  cache_key       TEXT          NOT NULL UNIQUE,

  company_name    TEXT          NOT NULL,
  role_title      TEXT          NOT NULL,
  department      TEXT          NOT NULL,
  region          TEXT          NOT NULL DEFAULT 'GLOBAL',

  -- Full SwarmReport serialized as JSONB — shape matches SwarmReport in swarmTypes.ts:
  --   swarmRiskScore, swarmConfidence, dominantSignals, weakSignals, anomalies,
  --   categoryBreakdown, visualizationGraph, liveAgentsUsed, totalAgentsRun, generatedAt
  swarm_report    JSONB         NOT NULL,

  -- How many audits drove this entry (from layoff_scores GROUP BY count in last 30d).
  -- For user-written entries (post-audit setSwarmCache), this is 1.
  audit_count_30d INTEGER       NOT NULL DEFAULT 0,

  -- Source of this entry: 'weekly_warm_job' | 'user_audit'
  warm_source     TEXT          NOT NULL DEFAULT 'weekly_warm_job',

  warmed_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ   NOT NULL,

  CONSTRAINT swwc_valid_expires  CHECK (expires_at > warmed_at),
  CONSTRAINT swwc_valid_source   CHECK (warm_source IN ('weekly_warm_job', 'user_audit'))
);

-- Lookup by key (primary access pattern: hydrateSwarmCache)
CREATE INDEX IF NOT EXISTS idx_swwc_key
  ON public.swarm_warm_cache (cache_key);

-- Expiry scan (periodic cleanup job)
CREATE INDEX IF NOT EXISTS idx_swwc_expires
  ON public.swarm_warm_cache (expires_at);

-- Company-level invalidation (breaking news clears all entries for a company)
CREATE INDEX IF NOT EXISTS idx_swwc_company
  ON public.swarm_warm_cache (company_name);

ALTER TABLE public.swarm_warm_cache ENABLE ROW LEVEL SECURITY;

-- Service_role writes (warming EF + server-side pipelines)
CREATE POLICY swwc_service_write ON public.swarm_warm_cache
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Public reads — data is company-level (no PII), anon can read unexpired entries
CREATE POLICY swwc_anon_read ON public.swarm_warm_cache
  FOR SELECT TO anon, authenticated USING (expires_at > NOW());

COMMENT ON TABLE public.swarm_warm_cache IS
  'Server-side pre-computed swarm reports. Keyed by swarm_cache::{co}::{role}::{dept}. '
  'Written weekly by warm-swarm-cache EF (top-100 audited combos) and after each '
  'user audit (warm_source=user_audit). Client reads via hydrateSwarmCache() to '
  'pre-populate localStorage before runSwarmLayer() — cache hit skips all 30 agents.';

-- ── 2. Extend calibration_drift_events for cache_warm events ─────────────────
-- The original CHECK only accepts 'range_violation' and 'directional_bias'.
-- Extend to include 'cache_warm' so the warming job records effectiveness stats
-- in the same permanent audit log (not subject to 14-day retention).

ALTER TABLE public.calibration_drift_events
  DROP CONSTRAINT IF EXISTS calibration_drift_events_event_kind_check;

ALTER TABLE public.calibration_drift_events
  ADD CONSTRAINT calibration_drift_events_event_kind_check
  CHECK (event_kind IN ('range_violation', 'directional_bias', 'cache_warm'));

-- JSON metadata for cache_warm events:
--   {
--     combos_attempted:  number,   -- how many top-100 combos were processed
--     combos_warmed:     number,   -- how many successfully upserted
--     combos_missed:     number,   -- combos with no company_snapshot (skipped)
--     warm_rate_pct:     number,   -- combos_warmed / combos_attempted × 100
--     duration_ms:       number,   -- wall-clock time for the entire warming run
--     top_misses:        string[], -- company names that had no snapshot (up to 10)
--     cache_ttl_hours:   number    -- 24 (constant, for self-documenting records)
--   }
ALTER TABLE public.calibration_drift_events
  ADD COLUMN IF NOT EXISTS warm_metadata JSONB;

COMMENT ON COLUMN public.calibration_drift_events.warm_metadata IS
  'Populated only for event_kind=cache_warm. JSON: {combos_attempted, combos_warmed, '
  'combos_missed, warm_rate_pct, duration_ms, top_misses, cache_ttl_hours}.';

-- Index for monitoring cache warm effectiveness over time
CREATE INDEX IF NOT EXISTS idx_cde_cache_warm
  ON public.calibration_drift_events (fired_at DESC)
  WHERE event_kind = 'cache_warm';

-- ── 3. pg_cron: warm-swarm-cache at 05:00 UTC every Monday ───────────────────

DO $$
BEGIN
  BEGIN
    PERFORM cron.unschedule('warm_swarm_cache_monday');
  EXCEPTION WHEN OTHERS THEN
    NULL; -- job did not exist, safe to ignore
  END;
END;
$$;

SELECT cron.schedule(
  'warm_swarm_cache_monday',
  '0 5 * * 1',
  $$
  SELECT net.http_post(
    url     := current_setting('app.supabase_functions_url', true) || '/warm-swarm-cache',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true),
      'Content-Type',  'application/json'
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- ── 4. Cleanup: expire swarm_warm_cache entries older than 24h ────────────────
-- Piggybacked on the existing expire_analysis_cache() call pattern.
-- A simple DELETE is sufficient — no partition overhead needed.

CREATE OR REPLACE FUNCTION public.expire_swarm_warm_cache()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.swarm_warm_cache WHERE expires_at <= NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION public.expire_swarm_warm_cache() IS
  'Deletes expired swarm_warm_cache entries (expires_at <= NOW()). '
  'Called by the warming EF at the start of each run to keep the table lean. '
  'Also callable manually: SELECT public.expire_swarm_warm_cache();';
