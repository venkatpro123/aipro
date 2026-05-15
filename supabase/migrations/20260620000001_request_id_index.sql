-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260620000001_request_id_index.sql
-- Purpose:   WS14 — indexes supporting end-to-end request-id drilldown.
--
--            With WS14 propagating a stable per-audit request_id from the
--            browser through every edge function into every DB write, the
--            ops UI's "trace this audit" query becomes:
--
--              SELECT * FROM pipeline_runs        WHERE request_id = $1;
--              SELECT * FROM layer_fallback_log   WHERE request_id = $1;
--              SELECT * FROM engine_constant_resolutions
--                                                  WHERE request_id = $1;
--
--            pipeline_runs and engine_constant_resolutions had no
--            request_id index. layer_fallback_log got per-partition
--            indexes in 20260616000001. This migration closes the
--            pipeline_runs gap and confirms the others.
--
--            pipeline_runs.request_id is not a column today (the
--            current schema stamps request_id into the meta JSONB).
--            WS14 promotes it to a first-class column so the index is
--            cheap.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── pipeline_runs: promote meta->>'request_id' to a column ────────────────
-- Add the column nullable so existing rows continue to work. The
-- application starts writing it on every audit via WS14's request-id
-- context; older rows retain the meta-JSONB form, addressable via the
-- functional index below.
ALTER TABLE public.pipeline_runs
  ADD COLUMN IF NOT EXISTS request_id UUID;

-- Backfill: copy meta->>'request_id' into the column for any row that
-- has one. Idempotent — running it twice is a no-op.
UPDATE public.pipeline_runs
   SET request_id = (meta->>'request_id')::UUID
 WHERE request_id IS NULL
   AND meta ? 'request_id'
   AND meta->>'request_id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Hot path: per-audit drilldown.
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_request_id
  ON public.pipeline_runs (request_id)
  WHERE request_id IS NOT NULL;

-- Fallback for legacy rows still keyed via meta JSONB (until backfill
-- is verified complete and the JSONB path is dropped).
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_meta_request_id_legacy
  ON public.pipeline_runs ((meta->>'request_id'))
  WHERE meta ? 'request_id' AND request_id IS NULL;

-- ── engine_constant_resolutions: request_id index ─────────────────────────
-- Already partitioned and PRIMARY KEY (id, created_at). The per-partition
-- index is already added in 20260615000002 (idx_ecr_request). Re-stated
-- here for completeness — no-op if already present.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
     WHERE schemaname = 'public' AND indexname = 'idx_ecr_request_2026_06'
  ) THEN
    CREATE INDEX idx_ecr_request_2026_06
      ON public.engine_constant_resolutions_2026_06 (request_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
     WHERE schemaname = 'public' AND indexname = 'idx_ecr_request_2026_07'
  ) THEN
    CREATE INDEX idx_ecr_request_2026_07
      ON public.engine_constant_resolutions_2026_07 (request_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
     WHERE schemaname = 'public' AND indexname = 'idx_ecr_request_2026_08'
  ) THEN
    CREATE INDEX idx_ecr_request_2026_08
      ON public.engine_constant_resolutions_2026_08 (request_id);
  END IF;
END $$;

ANALYZE public.pipeline_runs;

COMMENT ON COLUMN public.pipeline_runs.request_id IS
  'WS14 — first-class request_id column. Browser → edge → DB. Use this '
  'instead of the legacy meta->>''request_id'' JSONB path going forward.';

COMMENT ON INDEX public.idx_pipeline_runs_request_id IS
  'WS14 — per-audit drilldown index. JOIN pipeline_runs to '
  'layer_fallback_log + engine_constant_resolutions by request_id to '
  'reconstruct an entire audit''s execution trace.';
