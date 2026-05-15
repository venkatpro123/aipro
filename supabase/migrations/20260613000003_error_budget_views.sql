-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260613000003_error_budget_views.sql
-- Purpose:   gap #19 — error budget burn-rate calculation per SLO.
--
--            Each SLO has a target (e.g. "99% of audits succeed").
--            The error budget is 1 - target (e.g. 1%). The BURN RATE
--            is how fast we are consuming that budget vs the time
--            window we are measuring over.
--
--            Burn rate > 1.0 means we are using our budget FASTER than
--            we are accumulating it — at this rate the budget will be
--            exhausted before the measurement window ends. Burn rate of
--            14.4 is "we will burn one month's budget in two days."
--
--            Standard alerting (Google SRE workbook ch. 5):
--              Fast-burn page:   burn_rate_1h > 14.4 over 5 min → page
--              Slow-burn page:   burn_rate_6h > 6.0  over 30 min → page
--              Trickle page:     burn_rate_24h > 1.0 over 2 hours → ticket
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── SLO targets registry ──────────────────────────────────────────────────
-- A single source of truth for "what does success mean per SLO." The
-- burn-rate views below reference this so a threshold change is one
-- UPDATE statement.
CREATE TABLE IF NOT EXISTS public.slo_targets (
  slo_id           TEXT         PRIMARY KEY,
  description      TEXT         NOT NULL,
  -- Target success rate. 0.99 means "99% of events succeed".
  target_rate      NUMERIC(5,4) NOT NULL CHECK (target_rate > 0 AND target_rate <= 1),
  -- The window the target applies to (e.g. "30 days").
  measurement_window INTERVAL   NOT NULL DEFAULT INTERVAL '30 days',
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

INSERT INTO public.slo_targets (slo_id, description, target_rate, measurement_window) VALUES
  ('audit_latency',      'p95 audit response under 8s',                0.95, INTERVAL '30 days'),
  ('audit_success',      'audits complete without error_code',         0.995, INTERVAL '30 days'),
  ('layer_fallback',     'layers succeed without falling back',        0.97, INTERVAL '30 days'),
  ('coverage_alignment', 'cohort coverage within ±10pp of nominal',    0.95, INTERVAL '30 days'),
  ('synthetic_probe',    'synthetic probes pass',                       0.99, INTERVAL '30 days')
ON CONFLICT (slo_id) DO NOTHING;

-- ── audit_success burn rate ────────────────────────────────────────────────
-- Burn rate = (error rate in window) / (1 - target_rate)
-- where error rate = errors / total in that window.
CREATE OR REPLACE VIEW public.slo_audit_success_burn AS
WITH target AS (
  SELECT 1 - target_rate AS budget
  FROM public.slo_targets
  WHERE slo_id = 'audit_success'
),
window_1h AS (
  SELECT
    COUNT(*) FILTER (WHERE error_code IS NOT NULL)::NUMERIC AS errors,
    COUNT(*)::NUMERIC                                       AS total
  FROM public.pipeline_runs
  WHERE function_name = 'audit-coalesce'
    AND started_at >= NOW() - INTERVAL '1 hour'
),
window_6h AS (
  SELECT
    COUNT(*) FILTER (WHERE error_code IS NOT NULL)::NUMERIC AS errors,
    COUNT(*)::NUMERIC                                       AS total
  FROM public.pipeline_runs
  WHERE function_name = 'audit-coalesce'
    AND started_at >= NOW() - INTERVAL '6 hours'
),
window_24h AS (
  SELECT
    COUNT(*) FILTER (WHERE error_code IS NOT NULL)::NUMERIC AS errors,
    COUNT(*)::NUMERIC                                       AS total
  FROM public.pipeline_runs
  WHERE function_name = 'audit-coalesce'
    AND started_at >= NOW() - INTERVAL '24 hours'
)
SELECT
  'audit_success'                                                                    AS slo_id,
  (SELECT budget FROM target)                                                        AS budget,
  -- 1h burn rate
  CASE WHEN (SELECT total FROM window_1h) > 0
       THEN ROUND(((SELECT errors FROM window_1h) / (SELECT total FROM window_1h)) /
                  GREATEST((SELECT budget FROM target), 0.0001), 3)
       ELSE 0 END                                                                    AS burn_rate_1h,
  CASE WHEN (SELECT total FROM window_6h) > 0
       THEN ROUND(((SELECT errors FROM window_6h) / (SELECT total FROM window_6h)) /
                  GREATEST((SELECT budget FROM target), 0.0001), 3)
       ELSE 0 END                                                                    AS burn_rate_6h,
  CASE WHEN (SELECT total FROM window_24h) > 0
       THEN ROUND(((SELECT errors FROM window_24h) / (SELECT total FROM window_24h)) /
                  GREATEST((SELECT budget FROM target), 0.0001), 3)
       ELSE 0 END                                                                    AS burn_rate_24h,
  (SELECT errors FROM window_24h)                                                    AS errors_24h,
  (SELECT total FROM window_24h)                                                     AS total_24h;

-- ── layer_fallback burn rate ───────────────────────────────────────────────
CREATE OR REPLACE VIEW public.slo_layer_fallback_burn AS
WITH target AS (
  SELECT 1 - target_rate AS budget FROM public.slo_targets WHERE slo_id = 'layer_fallback'
),
window_1h AS (
  SELECT
    COUNT(*) FILTER (WHERE fallback_reason IS NOT NULL)::NUMERIC AS fallbacks,
    -- Estimate total layer runs from audit count × ~11 active layers.
    -- Conservative; favours over-estimating denominator (under-stating burn).
    GREATEST(11::NUMERIC * (SELECT COUNT(*) FROM public.pipeline_runs
                            WHERE function_name = 'audit-coalesce'
                              AND started_at >= NOW() - INTERVAL '1 hour'), 1) AS total
  FROM public.layer_fallback_log
  WHERE created_at >= NOW() - INTERVAL '1 hour'
)
SELECT
  'layer_fallback'                                AS slo_id,
  (SELECT budget FROM target)                     AS budget,
  ROUND((SELECT fallbacks FROM window_1h) /
        GREATEST((SELECT total FROM window_1h), 1) /
        GREATEST((SELECT budget FROM target), 0.0001), 3) AS burn_rate_1h,
  (SELECT fallbacks FROM window_1h)               AS fallbacks_1h,
  (SELECT total FROM window_1h)                   AS estimated_total_layer_runs_1h;

-- ── synthetic_probe burn rate ──────────────────────────────────────────────
CREATE OR REPLACE VIEW public.slo_synthetic_probe_burn AS
WITH target AS (
  SELECT 1 - target_rate AS budget FROM public.slo_targets WHERE slo_id = 'synthetic_probe'
),
window_6h AS (
  SELECT
    COUNT(*) FILTER (WHERE status != 'pass')::NUMERIC AS failures,
    COUNT(*)::NUMERIC                                 AS total
  FROM public.synthetic_probe_results
  WHERE started_at >= NOW() - INTERVAL '6 hours'
),
window_24h AS (
  SELECT
    COUNT(*) FILTER (WHERE status != 'pass')::NUMERIC AS failures,
    COUNT(*)::NUMERIC                                 AS total
  FROM public.synthetic_probe_results
  WHERE started_at >= NOW() - INTERVAL '24 hours'
)
SELECT
  'synthetic_probe'                                                                 AS slo_id,
  (SELECT budget FROM target)                                                       AS budget,
  CASE WHEN (SELECT total FROM window_6h) > 0
       THEN ROUND(((SELECT failures FROM window_6h) / (SELECT total FROM window_6h)) /
                  GREATEST((SELECT budget FROM target), 0.0001), 3)
       ELSE 0 END                                                                   AS burn_rate_6h,
  CASE WHEN (SELECT total FROM window_24h) > 0
       THEN ROUND(((SELECT failures FROM window_24h) / (SELECT total FROM window_24h)) /
                  GREATEST((SELECT budget FROM target), 0.0001), 3)
       ELSE 0 END                                                                   AS burn_rate_24h,
  (SELECT failures FROM window_24h)                                                 AS failures_24h,
  (SELECT total FROM window_24h)                                                    AS total_24h;

-- ── Unified dashboard view ────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.slo_burn_summary AS
SELECT slo_id, burn_rate_1h, burn_rate_6h, burn_rate_24h,
       (burn_rate_1h > 14.4)::BOOLEAN AS fast_burn_alert,
       (burn_rate_6h > 6.0)::BOOLEAN  AS slow_burn_alert,
       (burn_rate_24h > 1.0)::BOOLEAN AS trickle_alert
  FROM public.slo_audit_success_burn
UNION ALL
SELECT slo_id, burn_rate_1h, NULL::NUMERIC AS burn_rate_6h, NULL::NUMERIC AS burn_rate_24h,
       (burn_rate_1h > 14.4) AS fast_burn_alert,
       NULL::BOOLEAN AS slow_burn_alert,
       NULL::BOOLEAN AS trickle_alert
  FROM public.slo_layer_fallback_burn
UNION ALL
SELECT slo_id, NULL::NUMERIC AS burn_rate_1h, burn_rate_6h, burn_rate_24h,
       NULL::BOOLEAN AS fast_burn_alert,
       (burn_rate_6h > 6.0) AS slow_burn_alert,
       (burn_rate_24h > 1.0) AS trickle_alert
  FROM public.slo_synthetic_probe_burn;

-- ── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.slo_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "slo_targets_read_all"
  ON public.slo_targets FOR SELECT TO authenticated, anon USING (true);

COMMENT ON TABLE public.slo_targets IS
  'SLO target registry. Each row defines a measurable objective and the '
  'budget against which burn rate is computed. UPDATE here to change a '
  'threshold without code redeploy.';
COMMENT ON VIEW public.slo_burn_summary IS
  'gap #19 — unified burn-rate dashboard. fast_burn_alert / slow_burn_alert / '
  'trickle_alert columns map to the standard Google SRE multi-window alert '
  'thresholds (14.4 / 6.0 / 1.0 over 1h/6h/24h respectively).';
