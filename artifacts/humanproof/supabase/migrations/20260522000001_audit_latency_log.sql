-- audit_latency_log
-- Per-audit quorum latency telemetry, bucketed by market segment.
--
-- Problem being solved:
--   The 45-second quorum ceiling blocked ALL markets uniformly. For private
--   German GmbH, UK Pvt Ltd, India unlisted, and Singapore APAC companies,
--   the financial quorum class is min=0 (no public stock data) and the layoff
--   sources exhaust within ~8s. The remaining 37s were pure waste with no
--   visible progress — destroying conversion.
--
-- Solution (implemented alongside this migration):
--   Per-regime quorum ceilings:
--     german_gmbh / uk_private_ltd / apac_private / eu_other_private → 15s
--     india_unlisted_pvt → 18s
--     us_private         → 20s
--     null (public/unknown) → 45s (unchanged)
--
-- This table captures every quorum wait outcome so we can:
--   1. Measure p50/p95 audit latency by market segment
--   2. Detect quorum ceiling triggers (quorum_reached=false)
--   3. Identify markets where the ceiling is still too high
--   4. Validate the regime-aware ceiling reductions over time
--
-- market_segment values (from liveQuorumSpec.MarketSegment):
--   us_public, us_private, uk_public, uk_private, germany_private,
--   india_listed, india_private, singapore, eu_private, unknown

-- ── Table ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_latency_log (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id           UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Company context
  company_name      TEXT        NOT NULL,
  market_segment    TEXT        NOT NULL DEFAULT 'unknown',
  regime            TEXT,                -- PrivateCompanyRegime string or null (public)
  -- Quorum timing
  quorum_ceiling_ms INTEGER     NOT NULL,
  quorum_wait_ms    INTEGER     NOT NULL,
  quorum_reached    BOOLEAN     NOT NULL,
  -- Derived: how much of the ceiling was consumed (0.0–1.0)
  ceiling_utilization NUMERIC(4,3) GENERATED ALWAYS AS (
    LEAST(quorum_wait_ms::numeric / GREATEST(quorum_ceiling_ms, 1), 1.000)
  ) STORED
);

-- ── Indexes ──────────────────────────────────────────────────────────────────
-- p50/p95 queries are always filtered by market_segment + time window
CREATE INDEX IF NOT EXISTS audit_latency_market_segment_idx
  ON public.audit_latency_log (market_segment, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_latency_regime_idx
  ON public.audit_latency_log (regime, created_at DESC);

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.audit_latency_log ENABLE ROW LEVEL SECURITY;

-- Users can insert their own rows (client-side fire-and-forget write)
CREATE POLICY "audit_latency_user_insert"
  ON public.audit_latency_log FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Users can read only their own rows
CREATE POLICY "audit_latency_user_select"
  ON public.audit_latency_log FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Service role unrestricted access for admin dashboards
CREATE POLICY "audit_latency_service_all"
  ON public.audit_latency_log FOR ALL
  USING (auth.role() = 'service_role');

-- ── Percentile function ───────────────────────────────────────────────────────
-- Returns p50, p95, mean, and count for a given market_segment.
-- Used by admin calibration dashboard and future SLO monitoring.
--
-- Example:
--   SELECT * FROM get_quorum_latency_percentiles('germany_private');
--   SELECT * FROM get_quorum_latency_percentiles('us_public');
CREATE OR REPLACE FUNCTION public.get_quorum_latency_percentiles(
  p_market_segment TEXT,
  p_days_back      INTEGER DEFAULT 30
)
RETURNS TABLE (
  market_segment    TEXT,
  p50_ms            NUMERIC,
  p95_ms            NUMERIC,
  mean_ms           NUMERIC,
  ceiling_hit_rate  NUMERIC,   -- fraction where quorum_reached=false
  sample_count      BIGINT,
  ceiling_ms        INTEGER    -- the ceiling used for this segment (most recent)
)
LANGUAGE sql STABLE AS $$
  SELECT
    p_market_segment                                   AS market_segment,
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY quorum_wait_ms)  AS p50_ms,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY quorum_wait_ms)  AS p95_ms,
    ROUND(AVG(quorum_wait_ms), 0)                      AS mean_ms,
    ROUND(
      SUM(CASE WHEN NOT quorum_reached THEN 1 ELSE 0 END)::numeric
      / GREATEST(COUNT(*), 1), 3
    )                                                  AS ceiling_hit_rate,
    COUNT(*)                                           AS sample_count,
    MAX(quorum_ceiling_ms)                             AS ceiling_ms
  FROM public.audit_latency_log
  WHERE market_segment = p_market_segment
    AND created_at >= now() - (p_days_back || ' days')::interval;
$$;

-- Convenience: all market segments in one call
CREATE OR REPLACE FUNCTION public.get_all_quorum_latency_percentiles(
  p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  market_segment    TEXT,
  p50_ms            NUMERIC,
  p95_ms            NUMERIC,
  mean_ms           NUMERIC,
  ceiling_hit_rate  NUMERIC,
  sample_count      BIGINT,
  ceiling_ms        INTEGER
)
LANGUAGE sql STABLE AS $$
  SELECT
    market_segment,
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY quorum_wait_ms)  AS p50_ms,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY quorum_wait_ms)  AS p95_ms,
    ROUND(AVG(quorum_wait_ms), 0)                                  AS mean_ms,
    ROUND(
      SUM(CASE WHEN NOT quorum_reached THEN 1 ELSE 0 END)::numeric
      / GREATEST(COUNT(*), 1), 3
    )                                                              AS ceiling_hit_rate,
    COUNT(*)                                                       AS sample_count,
    MAX(quorum_ceiling_ms)                                         AS ceiling_ms
  FROM public.audit_latency_log
  WHERE created_at >= now() - (p_days_back || ' days')::interval
  GROUP BY market_segment
  ORDER BY p95_ms DESC NULLS LAST;
$$;
