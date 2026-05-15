-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260616000001_layer_fallback_log_indexes.sql
-- Purpose:   WS10 — additional indexes on layer_fallback_log to support the
--            WS10 invariant query:
--              "in the last 24h, for each layer_id, how many fallbacks?"
--            and the per-audit drilldown:
--              "given this request_id, which layers fell back?"
--
--            The existing 20260603000001 migration added composite indexes on
--            (layer_id, created_at DESC) and (source_name, created_at DESC).
--            Those cover the per-layer / per-source dashboards. Missing:
--              * (request_id) — drilldown from a single audit's trace into
--                its fallback rows. Used by ops UI + the WS14 request-id
--                propagation work to verify telemetry coverage.
--              * (fallback_reason, created_at DESC) — "which reasons are
--                trending right now" SLO panel.
--
--            Per-partition (the parent table is RANGE partitioned by month).
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── request_id drilldown ───────────────────────────────────────────────────
-- Partial because rows from pre-WS14 audits have NULL request_id; indexing
-- those just bloats the BTree.
CREATE INDEX IF NOT EXISTS idx_lfl_request_2026_06
  ON public.layer_fallback_log_2026_06 (request_id)
  WHERE request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lfl_request_2026_07
  ON public.layer_fallback_log_2026_07 (request_id)
  WHERE request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lfl_request_2026_08
  ON public.layer_fallback_log_2026_08 (request_id)
  WHERE request_id IS NOT NULL;

-- ── fallback_reason trending panel ─────────────────────────────────────────
-- All rows have a reason (NOT NULL on the column), so a non-partial index is
-- correct. Composite with created_at DESC supports the "last N minutes" filter.
CREATE INDEX IF NOT EXISTS idx_lfl_reason_recent_2026_06
  ON public.layer_fallback_log_2026_06 (fallback_reason, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lfl_reason_recent_2026_07
  ON public.layer_fallback_log_2026_07 (fallback_reason, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lfl_reason_recent_2026_08
  ON public.layer_fallback_log_2026_08 (fallback_reason, created_at DESC);

-- ── ANALYZE so the planner picks them up ───────────────────────────────────
ANALYZE public.layer_fallback_log_2026_06;
ANALYZE public.layer_fallback_log_2026_07;
ANALYZE public.layer_fallback_log_2026_08;

COMMENT ON INDEX public.idx_lfl_request_2026_06 IS
  'WS10 — drilldown: given an audit request_id, which layers fell back. Partial '
  'because legacy rows have NULL request_id.';
COMMENT ON INDEX public.idx_lfl_reason_recent_2026_06 IS
  'WS10 — SLO panel: top fallback reasons in the last N minutes.';
