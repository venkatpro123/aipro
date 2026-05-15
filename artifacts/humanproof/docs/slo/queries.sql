-- ════════════════════════════════════════════════════════════════════════════
-- SLO dashboard queries
-- ════════════════════════════════════════════════════════════════════════════
--
-- Machine-readable companion to docs/slo/README.md. Each query is
-- self-contained and tagged with the SLO it serves. Dashboard tooling
-- (Grafana / Metabase / Supabase Studio) can ingest this file via its
-- SQL view loader.
--
-- IMPORTANT: every query is annotated with `-- slo: <slo_id>` so a
-- linter can validate that every SLO defined in README.md has at
-- least one query implementing its measurement.
-- ════════════════════════════════════════════════════════════════════════════

-- slo: 1_audit_latency
-- frequency: 30s
-- description: p50/p95/p99 audit latency, last 1 hour
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
GROUP BY bucket
ORDER BY bucket DESC;

-- slo: 2_layer_fallback_rate
-- frequency: 1m
-- description: Per-layer fallback rate, last 5 minutes
CREATE OR REPLACE VIEW public.slo_layer_fallback_5m AS
WITH counts AS (
  SELECT
    layer_id,
    layer_kind,
    source_class,
    COUNT(*) FILTER (WHERE fallback_reason IN ('timeout', 'anti_bot', 'parser_failed', 'exception', 'rate_limited', 'circuit_open')) AS fallback_count,
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

-- slo: 3_calibration_coverage_drift
-- frequency: 1h
-- description: Latest coverage measurement per cohort/level vs nominal
CREATE OR REPLACE VIEW public.slo_calibration_coverage AS
SELECT
  cohort_scope,
  nominal_coverage,
  empirical_coverage,
  delta_from_nominal,
  is_misaligned,
  sample_size,
  measured_at
FROM public.coverage_measurements_latest;

-- slo: 4_drift_alerts_open
-- frequency: 5m
-- description: Open drift alerts ordered by age
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
WHERE status = 'open'
ORDER BY created_at ASC;

-- slo: 5_shadow_delta_health
-- frequency: 1h
-- description: p95 absolute score delta per cohort, last 7 days
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

-- slo: 6_outbox_event_lag
-- frequency: 5m
-- description: Oldest unconsumed event per type
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

-- slo: 7_rate_limit_denial
-- frequency: 5m
-- description: Top rate-limited subjects per audit bucket, last 1 hour
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

-- ════════════════════════════════════════════════════════════════════════════
-- All SLO views are RLS-restricted to service_role implicitly because
-- their source tables already enforce service_role-only access.
-- Dashboard tools authenticate with the service_role JWT.
-- ════════════════════════════════════════════════════════════════════════════
