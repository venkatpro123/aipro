# Service Level Objectives — HumanProof

This document defines the SLOs the platform commits to, the queries that
measure them, and the alerting thresholds that page on-call.

SLO state lives in three telemetry tables:

| Table | Source | Purpose |
|---|---|---|
| `pipeline_runs` | every edge function via `withRun()` | per-run latency + error code |
| `layer_fallback_log` | every layer via `recordFallback()` / `withSpan()` | per-layer degradation events |
| `coverage_measurements` | weekly `coverage-audit` cron | empirical vs nominal CI coverage per cohort |

All queries below assume the analyst has read access to `service_role`
credentials (the tables are RLS-restricted to service_role).

---

## 1. Audit response latency

**SLO:** p95 user-facing audit response ≤ 8s. p99 ≤ 20s.

**Why this matters:** the WS6 Tier-A budget is 8s. Any sustained p95
above that means the fast-path is degrading toward the legacy 45s
behaviour. Discover this BEFORE users complain.

```sql
-- p95 / p99 audit latency, last 1 hour
SELECT
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY duration_ms) AS p50_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) AS p95_ms,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY duration_ms) AS p99_ms,
  COUNT(*)                                                  AS n
FROM pipeline_runs
WHERE function_name = 'audit-coalesce'
  AND started_at >= NOW() - INTERVAL '1 hour';
```

**Alert thresholds:**
| Severity | Condition | Action |
|---|---|---|
| Warning | p95 > 10s for 15 min | Slack #engineering |
| Critical | p95 > 15s for 5 min OR p99 > 30s for 10 min | Page on-call |

---

## 2. Per-layer fallback rate

**SLO:** No individual layer's fallback rate exceeds 3% over a rolling
5-minute window.

**Why this matters:** the audit's confidence model assumes layers
produce real data. A silently degrading layer (Glassdoor anti-bot,
Wikipedia parser drift, Yahoo Finance rate limit) reduces accuracy
without surfacing to users. The fallback log is the early-warning
system.

```sql
-- Fallback rate per layer, last 5 minutes
WITH counts AS (
  SELECT
    layer_id,
    COUNT(*) FILTER (WHERE status = 'fallback' OR status = 'timeout') AS fallback_count,
    COUNT(*) AS total_count
  FROM layer_fallback_log
  WHERE created_at >= NOW() - INTERVAL '5 minutes'
  GROUP BY layer_id
)
SELECT
  layer_id,
  fallback_count,
  total_count,
  ROUND(100.0 * fallback_count / NULLIF(total_count, 0), 2) AS fallback_pct
FROM counts
WHERE total_count >= 10
ORDER BY fallback_pct DESC;
```

**Alert thresholds:**
| Severity | Condition | Action |
|---|---|---|
| Warning | any layer > 5% fallback for 15 min | Slack #engineering |
| Critical | any REGULATORY-tier source > 5% OR any layer > 25% for 5 min | Page on-call |

---

## 3. Calibration coverage drift

**SLO:** Empirical coverage of the nominal-90% CI stays within ±10
percentage points of nominal per cohort, weekly.

**Why this matters:** the conformal CI claims "90% credible interval."
If real outcomes are outside that interval 30% of the time, the system
is lying to users. WS4's whole acceptance hinges on this.

```sql
-- Latest measurement per cohort/nominal-level
SELECT
  cohort_scope,
  nominal_coverage,
  empirical_coverage,
  delta_from_nominal,
  is_misaligned,
  sample_size,
  measured_at
FROM coverage_measurements_latest
WHERE nominal_coverage = 0.9
ORDER BY ABS(delta_from_nominal) DESC;
```

**Alert thresholds:**
| Severity | Condition | Action |
|---|---|---|
| Warning | any cohort `is_misaligned = TRUE` for one week | Slack #engineering |
| Critical | GLOBAL cohort is_misaligned for two consecutive weeks | Page on-call; freeze recalibration promotions |

---

## 4. Drift alerts open

**SLO:** Zero open `engine_drift_alerts` outside of business hours.

**Why this matters:** the recalibrate-engine cron writes alerts when a
candidate version regresses AUC by >0.05. Open alerts past the working
day mean a bad-data week is about to ship.

```sql
-- Oldest open alerts
SELECT id, cohort_scope, alert_kind, metric_name, delta, created_at
FROM engine_drift_alerts
WHERE status = 'open'
ORDER BY created_at ASC
LIMIT 20;
```

**Alert thresholds:**
| Severity | Condition | Action |
|---|---|---|
| Warning | any alert open > 24h | Slack #engineering |
| Critical | any alert open > 72h | Page on-call |

---

## 5. Shadow-mode delta health

**SLO:** Score delta p95 |Δ| ≤ 10 points between legacy and candidate
engines, per cohort, over rolling 7 days.

**Why this matters:** the shadow comparison ledger is the gate for
flipping feature flags from `shadow` to `canary` or `production`. Wide
deltas mean the candidate engine is materially different and the
promotion decision needs human review.

```sql
-- p95 absolute score delta per cohort, last 7 days
SELECT
  cohort,
  COUNT(*)                                                          AS n_audits,
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY ABS(score_delta))    AS p50_abs_delta,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY ABS(score_delta))    AS p95_abs_delta,
  AVG(score_delta)                                                  AS mean_delta,
  COUNT(*) FILTER (WHERE tier_migrated)                             AS tier_migrations,
  ROUND(100.0 * COUNT(*) FILTER (WHERE tier_migrated) / COUNT(*), 2) AS tier_migration_pct
FROM audit_shadow_comparison
WHERE created_at >= NOW() - INTERVAL '7 days'
  AND cohort IS NOT NULL
GROUP BY cohort
ORDER BY p95_abs_delta DESC;
```

**Alert thresholds:**
| Severity | Condition | Action |
|---|---|---|
| Warning | any cohort p95 |Δ| > 12 for 24 hours | Slack #engineering |
| Critical | any cohort p95 |Δ| > 20 OR tier_migration_pct > 15% for 6 hours | Page on-call; auto-pause flag promotions |

---

## 6. Outbox event lag

**SLO:** No `engine_events` row remains unprocessed by its registered
consumers for more than 1 hour.

**Why this matters:** the recalibration cron, billing service, and
notification service consume from this outbox. A consumer lag means
calibration won't refresh, customers won't be billed, or alerts won't
page.

```sql
-- Oldest unconsumed event by type
SELECT type, MIN(occurred_at) AS oldest, COUNT(*) AS pending_count
FROM engine_events
WHERE jsonb_array_length(consumed_by) = 0
  AND occurred_at < NOW() - INTERVAL '1 hour'
GROUP BY type;
```

**Alert thresholds:**
| Severity | Condition | Action |
|---|---|---|
| Warning | any type with pending > 0 for 2h | Slack #engineering |
| Critical | any type with pending > 100 OR oldest > 6h | Page on-call |

---

## 7. Rate-limit denial rate

**SLO:** < 1% of audit submissions denied by the rate limiter for any
single user, per hour.

**Why this matters:** rate limit denials are usually abuse, but a
spike from many distinct users means the limits are too tight. The
audit bucket policy must serve genuine usage without false positives.

```sql
-- Per-user denial rate, last 1 hour
SELECT
  subject,
  total_consumed,
  total_rejected,
  ROUND(100.0 * total_rejected / NULLIF(total_consumed + total_rejected, 0), 2) AS denial_pct
FROM rate_limit_buckets
WHERE bucket_key = 'audit'
  AND last_rejected_at >= NOW() - INTERVAL '1 hour'
ORDER BY denial_pct DESC
LIMIT 50;
```

**Alert thresholds:**
| Severity | Condition | Action |
|---|---|---|
| Warning | > 20 users with denial_pct > 50% in 1h | Slack #engineering |
| Critical | denial_pct > 10% aggregated across all users | Re-evaluate policy capacity |

---

## Maintenance

Update this document when:

1. A new SLO is added (always specify query + thresholds).
2. An existing threshold is changed (record the rationale).
3. A new telemetry table is introduced (link from the table at the top).

The CalibrationPanel admin UI surfaces queries 3 and 4 inline.
Implementing queries 1, 2, 5, 6, 7 as live dashboard widgets is
follow-up work in `infra/dashboards/`.
