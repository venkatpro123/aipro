-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260611000004_remediation_pipeline_runs.sql
-- Purpose:   Recreate public.pipeline_runs idempotently.
--
-- Why this migration exists:
--   The original 20260514000004_pipeline_runs_and_invalidation.sql is
--   marked as applied in supabase_migrations.schema_migrations on the
--   remote, but the table itself was subsequently dropped (manually or
--   by a rebuild that lost DDL). Downstream migrations
--   (slo_views, request_id_index) reference pipeline_runs and fail.
--
--   This remediation re-runs the pipeline_runs DDL using
--   CREATE TABLE IF NOT EXISTS — no-op when the table exists, fix
--   when it doesn't. Timestamped BEFORE 20260612000001_slo_views so
--   it runs first.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.pipeline_runs (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name  TEXT        NOT NULL,
  run_id         TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  started_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at    TIMESTAMPTZ,
  duration_ms    BIGINT      GENERATED ALWAYS AS (
                   (EXTRACT(EPOCH FROM (finished_at - started_at)) * 1000)::BIGINT
                 ) STORED,
  items_in       INTEGER,
  items_out      INTEGER,
  error_code     TEXT,
  cost_usd       NUMERIC(10, 6),
  meta           JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_runs_fn_started
  ON public.pipeline_runs (function_name, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_pipeline_runs_errors
  ON public.pipeline_runs (function_name, error_code)
  WHERE error_code IS NOT NULL;

ALTER TABLE public.pipeline_runs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'pipeline_runs' AND policyname = 'pipeline_runs_service_only'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "pipeline_runs_service_only"
        ON public.pipeline_runs
        FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true)
    $policy$;
  END IF;
END $$;

COMMENT ON TABLE public.pipeline_runs IS
  'Remediated 2026-06-11. The original creation migration (20260514000004) was '
  'marked applied but the table was subsequently lost. This file recreates it '
  'idempotently so downstream slo_views / request_id_index migrations can '
  'reference it.';
