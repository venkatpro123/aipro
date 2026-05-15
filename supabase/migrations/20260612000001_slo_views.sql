-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260612000001_slo_views.sql
-- Purpose:   Materialise the SLO query catalogue as Postgres views.
--
--            artifacts/humanproof/docs/slo/queries.sql is the
--            human-readable source; this migration creates the actual
--            views in the prod schema. Dashboards (Grafana / Metabase /
--            Supabase Studio) point at the views; the dashboard config
--            doesn't need to know the underlying joins.
--
--            Each view is RLS-restricted by the source tables' policies
--            (service_role only). Dashboard tools authenticate as
--            service_role for read access.
--
--            Changes here MUST be mirrored in docs/slo/queries.sql so
--            engineers reviewing the SLO catalogue see consistent SQL.
-- ═══════════════════════════════════════════════════════════════════════════════

-- SLO 1: audit latency
CREATE OR REPLACE VIEW public.slo_audit_latency_1h AS
SELECT
  date_trunc('minute', started_at)                            AS bucket,
  COUNT(*)                                                    AS n,
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY duration_ms)   AS p50_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms)   AS p95_ms,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY duration_ms)   AS p99_ms,
  COUNT(*) FILTER (WHERE error_code IS NOT NULL)              AS error_count
FROM public.pipeline_runs
WHERE function_name = 'audit-coalesce'
  AND started_at >= NOW() - INTERVAL '1 hour'
GROUP BY bucket;

-- SLO 2: per-layer fallback rate
CREATE OR REPLACE VIEW public.slo_layer_fallback_5m AS
WITH counts AS (
  SELECT
    layer_id,
    layer_kind,
    source_class,
    COUNT(*) FILTER (
      WHERE fallback_reason IN ('timeout', 'anti_bot', 'parser_failed', 'exception', 'rate_limited', 'circuit_open')
    ) AS fallback_count,
    COUNT(*) AS total_count
  FROM public.layer_fallback_log
  WHERE created_at >= NOW() - INTERVAL '5 minutes'
  GROUP BY layer_id, layer_kind, source_class
)
SELECT
  layer_id,
  layer_kind,
  source_class,
  fallback_count,
  total_count,
  ROUND(100.0 * fallback_count / NULLIF(total_count, 0), 2) AS fallback_pct
FROM counts
WHERE total_count >= 10;

-- SLO 3: coverage drift — already exposed via coverage_measurements_latest

-- SLO 4: open drift alerts
CREATE OR REPLACE VIEW public.slo_drift_alerts_open AS
SELECT
  id,
  cohort_scope,
  alert_kind,
  metric_name,
  prior_value,
  candidate_value,
  delta,
  created_at,
  EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600.0 AS age_hours
FROM public.engine_drift_alerts
WHERE status = 'open';

-- SLO 5: shadow delta health
CREATE OR REPLACE VIEW public.slo_shadow_delta_7d AS
SELECT
  cohort,
  COUNT(*)                                                                AS n_audits,
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY ABS(score_delta))          AS p50_abs_delta,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY ABS(score_delta))          AS p95_abs_delta,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY ABS(score_delta))          AS p99_abs_delta,
  AVG(score_delta)                                                        AS mean_delta,
  COUNT(*) FILTER (WHERE tier_migrated)                                   AS tier_migrations,
  ROUND(100.0 * COUNT(*) FILTER (WHERE tier_migrated) / COUNT(*), 2)      AS tier_migration_pct
FROM public.audit_shadow_comparison
WHERE created_at >= NOW() - INTERVAL '7 days'
  AND cohort IS NOT NULL
GROUP BY cohort;

-- SLO 6: outbox event lag
CREATE OR REPLACE VIEW public.slo_outbox_lag AS
SELECT
  type,
  MIN(occurred_at)                                          AS oldest_occurred_at,
  COUNT(*)                                                  AS pending_count,
  EXTRACT(EPOCH FROM (NOW() - MIN(occurred_at))) / 3600.0   AS oldest_age_hours
FROM public.engine_events
WHERE jsonb_array_length(COALESCE(consumed_by, '[]'::jsonb)) = 0
  AND occurred_at < NOW() - INTERVAL '1 hour'
GROUP BY type;

-- SLO 7: rate-limit denial top offenders
CREATE OR REPLACE VIEW public.slo_rate_limit_denial AS
SELECT
  bucket_key,
  subject,
  total_consumed,
  total_rejected,
  ROUND(100.0 * total_rejected / NULLIF(total_consumed + total_rejected, 0), 2) AS denial_pct,
  last_rejected_at
FROM public.rate_limit_buckets
WHERE last_rejected_at >= NOW() - INTERVAL '1 hour';

COMMENT ON VIEW public.slo_audit_latency_1h IS
  'SLO #1: p50/p95/p99 audit latency, last 1h. Source: pipeline_runs. '
  'Alert thresholds in docs/slo/README.md.';
COMMENT ON VIEW public.slo_layer_fallback_5m IS
  'SLO #2: per-layer fallback rate over a 5-minute window. Source: layer_fallback_log.';
COMMENT ON VIEW public.slo_drift_alerts_open IS
  'SLO #4: open calibration drift alerts. Source: engine_drift_alerts.';
COMMENT ON VIEW public.slo_shadow_delta_7d IS
  'SLO #5: shadow legacy-vs-candidate delta distribution per cohort, last 7d.';
COMMENT ON VIEW public.slo_outbox_lag IS
  'SLO #6: outbox event consumption lag per event type.';
COMMENT ON VIEW public.slo_rate_limit_denial IS
  'SLO #7: top rate-limited subjects in the last hour.';
