-- 20260514000004_pipeline_runs_and_invalidation.sql
--
-- M-7: Structured pipeline_runs observability table.
--      Captures per-run telemetry for every Edge Function ingest job so
--      ops can diagnose cost spikes, latency regressions, and silent errors
--      without trawling Supabase Edge Function logs.
--
-- M-8: validated_scores cache invalidation trigger.
--      When a new breaking_news_events row is inserted for a company, any
--      cached validated_scores rows whose role_key starts with that company
--      name are marked stale (valid_until = NOW()) so the next UI request
--      re-scores with the fresh signal.

-- ── M-7: pipeline_runs ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.pipeline_runs (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name  TEXT        NOT NULL,
  run_id         TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  started_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at    TIMESTAMPTZ,
  -- BUG-3 fix: EXTRACT(EPOCH FROM ...) returns DOUBLE PRECISION. PostgreSQL does
  -- not implicitly cast DOUBLE PRECISION → INTEGER in generated column expressions.
  -- Use BIGINT (which accepts the assignment cast) and explicit ::BIGINT to be safe.
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

-- RLS: service_role only — internal observability table, no user-facing reads
ALTER TABLE public.pipeline_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pipeline_runs_service_only"
  ON public.pipeline_runs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── M-8: validated_scores invalidation on breaking_news_events INSERT ─────────
-- When a confirmed layoff event arrives for a company, mark all cached
-- validated_scores for that company stale so they are recomputed on next access.
-- role_key convention: "<company_name>|<role_title>" — the LIKE prefix match
-- covers all roles at the company without a full-table scan (index on role_key).

CREATE OR REPLACE FUNCTION public.invalidate_scores_on_layoff_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only invalidate for medium/high confidence events — low confidence
  -- signals (GitHub velocity drops, career page noise) should not invalidate
  -- the scored cache; they are already incorporated via the scoring pipeline.
  IF NEW.confidence IN ('medium', 'high') THEN
    -- BUG-5 fix: LIKE with NEW.company_name || '|%' is vulnerable to wildcard
    -- injection if company_name contains '%' or '_' characters (e.g. "AT&T").
    -- Use a positional string comparison instead: left(role_key, len+1) = prefix.
    UPDATE public.validated_scores
    SET valid_until = NOW()
    WHERE left(role_key, length(NEW.company_name) + 1) = (NEW.company_name || '|')
      AND valid_until > NOW();
  END IF;
  RETURN NEW;
END;
$$;

-- Drop before recreate to keep the migration idempotent
DROP TRIGGER IF EXISTS trg_invalidate_scores_on_layoff
  ON public.breaking_news_events;

CREATE TRIGGER trg_invalidate_scores_on_layoff
  AFTER INSERT ON public.breaking_news_events
  FOR EACH ROW
  EXECUTE FUNCTION public.invalidate_scores_on_layoff_event();

-- Grant execute to service_role so the ingest functions can fire the trigger
GRANT EXECUTE ON FUNCTION public.invalidate_scores_on_layoff_event() TO service_role;
