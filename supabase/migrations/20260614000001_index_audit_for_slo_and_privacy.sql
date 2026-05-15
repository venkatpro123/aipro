-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260614000001_index_audit_for_slo_and_privacy.sql
-- Purpose:   Close indexing gaps surfaced by the SLO view catalogue
--            (docs/slo/queries.sql) and the privacy / right-to-be-
--            forgotten runbook (docs/runbooks/privacy-data-deletion.md).
--
--            Every index here is the consequence of a query that
--            existed in the codebase without backing — i.e. a sequential
--            scan at production size. The audit started from the SLO
--            views (those queries run constantly via dashboards) and
--            the privacy DELETE queries (those run rarely but MUST
--            complete within the GDPR deadline).
--
--            All indexes use IF NOT EXISTS so the migration is safe to
--            re-run. Naming convention: idx_<tableprefix>_<purpose>.
--
--            Indexes intentionally NOT added:
--              * idx on layer_fallback_log.user_id — column does not
--                exist (the table uses audit_session_id, no PII).
--              * idx on engine_events.payload->>'user_id' — superseded
--                by the direct `user_id` column already on that table.
--                A GIN-on-payload index would be far more expensive for
--                the same query.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. engine_events: outbox-lag SLO + privacy deletion ───────────────────
-- The slo_outbox_lag view filters: "unconsumed events older than 1h".
-- Existing `idx_ee_type_recent (type, occurred_at DESC)` does not constrain
-- on consumed_by, so the planner reads everything in the time range and
-- filters in memory. A partial index keyed on the unconsumed predicate
-- collapses that to the rows we actually care about.
CREATE INDEX IF NOT EXISTS idx_ee_unconsumed_recent
  ON public.engine_events (type, occurred_at)
  WHERE jsonb_array_length(consumed_by) = 0;

-- Privacy deletion path: DELETE WHERE user_id = $1.
-- Existing indexes are (type, occurred_at) and partial (request_id), neither
-- of which helps a user-scoped delete. Partial because most engine_events
-- rows are system events with user_id IS NULL.
CREATE INDEX IF NOT EXISTS idx_ee_user_id
  ON public.engine_events (user_id)
  WHERE user_id IS NOT NULL;

-- ── 2. rate_limit_buckets: slo_rate_limit_denial ──────────────────────────
-- The view filters on `last_rejected_at >= NOW() - INTERVAL '1 hour'` and
-- returns the top-denial subjects. The existing idx_rlb_subject is keyed
-- on subject (not time), so the view degrades to a seq scan once the table
-- grows. Partial index on rows that have ever been rejected keeps it small.
CREATE INDEX IF NOT EXISTS idx_rlb_last_rejected
  ON public.rate_limit_buckets (last_rejected_at DESC)
  WHERE last_rejected_at IS NOT NULL;

-- ── 3. layer_fallback_log: burn-rate global time scan ─────────────────────
-- The slo_layer_fallback_burn view scans `WHERE created_at >= NOW() - 1h`
-- WITHOUT a layer_id filter — it aggregates across all layers. The existing
-- composite (layer_id, created_at DESC) doesn't help that scan.
-- BRIN is cheap to build/store and ideal for the strictly-monotonic
-- created_at on a partitioned table. Add per-partition.
CREATE INDEX IF NOT EXISTS idx_lfl_created_brin_2026_06
  ON public.layer_fallback_log_2026_06
  USING BRIN (created_at);
CREATE INDEX IF NOT EXISTS idx_lfl_created_brin_2026_07
  ON public.layer_fallback_log_2026_07
  USING BRIN (created_at);
CREATE INDEX IF NOT EXISTS idx_lfl_created_brin_2026_08
  ON public.layer_fallback_log_2026_08
  USING BRIN (created_at);

-- ── 4. synthetic_probe_results: slo_synthetic_probe_burn ──────────────────
-- The burn view computes failures/total over rolling 6h/24h windows
-- across ALL probe_names. The existing `idx_synthetic_probe_recent
-- (probe_name, started_at DESC)` is composite and the leading column is
-- probe_name — wrong order for a global time scan.
-- BRIN again: started_at is append-only, monotonic, perfect fit.
CREATE INDEX IF NOT EXISTS idx_synthetic_probe_time_brin
  ON public.synthetic_probe_results
  USING BRIN (started_at);

-- ── 5. pipeline_runs: privacy deletion via meta->>'user_id' ───────────────
-- The privacy runbook deletes pipeline_runs by `meta->>'user_id'`. With
-- no supporting index, that's a full table scan on what is by far the
-- largest table in the system (one row per audit). The DELETE blocks
-- everything else writing to the table for the duration.
--
-- Functional index on the JSONB path. Partial to skip rows without a
-- user_id at all (cron-driven runs, synthetic probes, etc.).
CREATE INDEX IF NOT EXISTS idx_pr_meta_user_id
  ON public.pipeline_runs ((meta->>'user_id'))
  WHERE meta ? 'user_id';

-- ── 6. audit_shadow_comparison.user_id null-handling ──────────────────────
-- The existing idx_asc_user_recent is partial (`WHERE user_id IS NOT NULL`).
-- That's correct for the analytics use case ("show this user's shadow runs")
-- but it means the privacy DELETE WHERE user_id = $1 is already covered —
-- no new index needed. Documenting the audit conclusion here so future
-- contributors don't re-do this analysis.

-- ── 7. analytics_events.user_id ───────────────────────────────────────────
-- Already covered by idx_ae_user_recent (user_id, received_at DESC)
-- WHERE user_id IS NOT NULL. No new index needed.

-- ── 8. Maintenance: ANALYZE the tables we just indexed ────────────────────
-- New indexes don't become useful to the planner until pg_stat is updated.
-- ANALYZE is non-blocking, fast, and idempotent.
ANALYZE public.engine_events;
ANALYZE public.rate_limit_buckets;
ANALYZE public.layer_fallback_log_2026_06;
ANALYZE public.layer_fallback_log_2026_07;
ANALYZE public.layer_fallback_log_2026_08;
ANALYZE public.synthetic_probe_results;
ANALYZE public.pipeline_runs;

-- ── Verification queries (run manually, not part of the migration) ────────
-- After this migration, EXPLAIN on each SLO view should show Index Scan or
-- Index Only Scan for the predicates this migration targets. The runbook
-- references this verification step; the queries to run live in
-- docs/runbooks/index-audit-verification.md.

COMMENT ON INDEX public.idx_ee_unconsumed_recent IS
  'Partial index for slo_outbox_lag view. WHERE jsonb_array_length(consumed_by) = 0 '
  'collapses to the unconsumed-events subset. Time index supports the >NOW()-1h filter.';
COMMENT ON INDEX public.idx_ee_user_id IS
  'Partial index for privacy / right-to-be-forgotten deletion path. '
  'Most engine_events have user_id NULL (system events); index only the rest.';
COMMENT ON INDEX public.idx_rlb_last_rejected IS
  'Time-DESC index for slo_rate_limit_denial. Existing idx_rlb_subject is keyed '
  'on subject, which the view does not filter on.';
COMMENT ON INDEX public.idx_pr_meta_user_id IS
  'Functional index on pipeline_runs.meta->>user_id for the privacy deletion '
  'path. Partial to skip rows without user_id (synthetic probes, cron runs).';
