-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260615000002_uncalibrated_dashboard.sql
-- Purpose:   WS9 — audit-level uncalibrated exposure metric.
--
--            engine_calibration_constants tells us WHICH constants are
--            still uncalibrated. This migration tracks WHICH AUDITS depended
--            on at least one such constant, so the WS9 acceptance gate
--            ("v_uncalibrated_exposure < 5% of audits") is measurable.
--
--            The audit pipeline writes one row to engine_constant_resolutions
--            per resolved constant lookup, tagged with the audit's
--            request_id. The view aggregates by request_id.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── Resolution ledger ──────────────────────────────────────────────────────
-- High-volume table — one row per getConstant() call. Partitioned by month
-- to keep query budget bounded.
CREATE TABLE IF NOT EXISTS public.engine_constant_resolutions (
  id              BIGSERIAL,
  -- Correlation
  request_id      UUID         NOT NULL,
  audit_session_id UUID,
  -- The lookup
  constant_key    TEXT         NOT NULL,
  cohort_scope    TEXT         NOT NULL,
  -- What we returned
  resolved_value  JSONB        NOT NULL,
  provenance      public.calibration_provenance NOT NULL,
  -- Was the bootstrap fallback used (DB miss)?
  used_bootstrap  BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Rolling 3-month partitions; future ones created by the WS1 maintenance cron.
CREATE TABLE IF NOT EXISTS public.engine_constant_resolutions_2026_06
  PARTITION OF public.engine_constant_resolutions
  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE IF NOT EXISTS public.engine_constant_resolutions_2026_07
  PARTITION OF public.engine_constant_resolutions
  FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE IF NOT EXISTS public.engine_constant_resolutions_2026_08
  PARTITION OF public.engine_constant_resolutions
  FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');

-- ── Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ecr_request
  ON public.engine_constant_resolutions (request_id, created_at DESC);

-- Hot path: "which audits depend on uncalibrated constants in the last hour".
CREATE INDEX IF NOT EXISTS idx_ecr_uncalibrated_recent_2026_06
  ON public.engine_constant_resolutions_2026_06 (created_at DESC)
  WHERE provenance = 'uncalibrated_placeholder';
CREATE INDEX IF NOT EXISTS idx_ecr_uncalibrated_recent_2026_07
  ON public.engine_constant_resolutions_2026_07 (created_at DESC)
  WHERE provenance = 'uncalibrated_placeholder';
CREATE INDEX IF NOT EXISTS idx_ecr_uncalibrated_recent_2026_08
  ON public.engine_constant_resolutions_2026_08 (created_at DESC)
  WHERE provenance = 'uncalibrated_placeholder';

-- ── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.engine_constant_resolutions ENABLE ROW LEVEL SECURITY;
-- service_role only — operational telemetry, not user-facing.

-- ── The exposure metric view ───────────────────────────────────────────────
-- For audits in the last 24h: what fraction depended on at least one
-- uncalibrated_placeholder constant?
--
-- WS9 acceptance gate: this number is < 0.05 (5%) post-rollout.
CREATE OR REPLACE VIEW public.v_uncalibrated_exposure AS
WITH audits_24h AS (
  SELECT DISTINCT request_id
  FROM public.engine_constant_resolutions
  WHERE created_at >= NOW() - INTERVAL '24 hours'
),
audits_with_uncalibrated AS (
  SELECT DISTINCT request_id
  FROM public.engine_constant_resolutions
  WHERE created_at >= NOW() - INTERVAL '24 hours'
    AND provenance = 'uncalibrated_placeholder'
)
SELECT
  (SELECT COUNT(*) FROM audits_24h)                                            AS total_audits_24h,
  (SELECT COUNT(*) FROM audits_with_uncalibrated)                              AS audits_with_uncalibrated_24h,
  CASE WHEN (SELECT COUNT(*) FROM audits_24h) > 0
       THEN ROUND(
              (SELECT COUNT(*) FROM audits_with_uncalibrated)::NUMERIC
                / (SELECT COUNT(*) FROM audits_24h),
              4)
       ELSE 0 END                                                              AS uncalibrated_exposure_24h;

-- Breakdown by constant: which uncalibrated constants are hit most?
CREATE OR REPLACE VIEW public.v_uncalibrated_exposure_by_key AS
SELECT
  constant_key,
  COUNT(DISTINCT request_id)                                       AS audits_hit_24h,
  COUNT(*)                                                         AS total_lookups_24h
FROM public.engine_constant_resolutions
WHERE created_at >= NOW() - INTERVAL '24 hours'
  AND provenance = 'uncalibrated_placeholder'
GROUP BY constant_key
ORDER BY audits_hit_24h DESC;

-- ── Retention ──────────────────────────────────────────────────────────────
-- This table is high-volume (every constant lookup = 1 row). Keep 30 days.
CREATE OR REPLACE FUNCTION public.prune_engine_constant_resolutions()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE n INTEGER;
BEGIN
  DELETE FROM public.engine_constant_resolutions
   WHERE created_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

SELECT public._v35_register_cron(
  'v35_prune_engine_constant_resolutions',
  '10 4 * * *',
  $$SELECT public.prune_engine_constant_resolutions();$$
);

COMMENT ON VIEW public.v_uncalibrated_exposure IS
  'WS9 acceptance gate. uncalibrated_exposure_24h = fraction of audits in the '
  'last 24h that depended on at least one uncalibrated_placeholder constant. '
  'Target: < 0.05 after recalibrate-engine has replaced enough constants.';

COMMENT ON VIEW public.v_uncalibrated_exposure_by_key IS
  'WS9 prioritisation view. Which uncalibrated constants are hit by the '
  'most audits? Drives the recalibrate-engine work queue.';
