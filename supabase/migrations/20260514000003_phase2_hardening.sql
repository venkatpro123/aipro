-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260514000003_phase2_hardening.sql
-- Purpose:   Audit Phase 2 fixes (H-1, H-6, H-7, M-2) consolidated into one
--            idempotent migration.
--
--   H-1  api_circuit_status — seed missing yahoo_finance row
--   H-6  edge_crumb_cache   — new table for persistent Yahoo Finance crumb
--         (avoids in-memory module-var reset on every cold start)
--   H-7  pipeline_upsert_static — fix ON CONFLICT to update all columns, not
--         just updated_at (previously every data-refresh call was a silent no-op)
--   M-2  edge_macro_cache   — new table for FRED/BLS macro snapshots so cold
--         starts don't burst FRED API calls after the 6h in-memory TTL expires
-- ═══════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- H-1: Seed missing yahoo_finance row in api_circuit_status
--      The hardening migration (20260513000001) added yahoo_finance to the RLS
--      policy whitelist but never inserted the row. Circuit-breaker reads for
--      yahoo_finance returned null, meaning failures could never trip the breaker.
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.api_circuit_status (api_name, state, consecutive_failures)
VALUES ('yahoo_finance', 'CLOSED', 0)
ON CONFLICT (api_name) DO NOTHING;

-- Also seed gnews (used in proxy-live-signals fallback chain) and openrouter
-- (primary LLM provider for ingest-news) so their breakers are trackable.
INSERT INTO public.api_circuit_status (api_name, state, consecutive_failures)
VALUES
  ('gnews',       'CLOSED', 0),
  ('openrouter',  'CLOSED', 0),
  ('fred',        'CLOSED', 0),
  ('bls',         'CLOSED', 0)
ON CONFLICT (api_name) DO NOTHING;

-- Widen the INSERT/UPDATE policy to include the new api_name values.
-- Drop and recreate idempotently (matches the pattern in 20260513000001).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'api_circuit_status')
  THEN
    EXECUTE 'DROP POLICY IF EXISTS "circuit_status_browser_insert" ON public.api_circuit_status';
    EXECUTE 'DROP POLICY IF EXISTS "circuit_status_browser_update" ON public.api_circuit_status';

    EXECUTE $pol$
      CREATE POLICY "circuit_status_browser_insert"
        ON public.api_circuit_status
        FOR INSERT TO anon, authenticated
        WITH CHECK (
          api_name IN (
            'alphavantage','newsapi','serper','yahoo_finance',
            'gnews','openrouter','fred','bls'
          )
          AND consecutive_failures >= 0
          AND state IN ('CLOSED','HALF_OPEN')
        )
    $pol$;

    EXECUTE $pol$
      CREATE POLICY "circuit_status_browser_update"
        ON public.api_circuit_status
        FOR UPDATE TO anon, authenticated
        USING  (api_name IN (
          'alphavantage','newsapi','serper','yahoo_finance',
          'gnews','openrouter','fred','bls'
        ))
        WITH CHECK (
          api_name IN (
            'alphavantage','newsapi','serper','yahoo_finance',
            'gnews','openrouter','fred','bls'
          )
          AND consecutive_failures >= 0
          AND state IN ('CLOSED','HALF_OPEN')
        )
    $pol$;
  END IF;
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- H-6: edge_crumb_cache — persistent Yahoo Finance crumb storage
--      proxy-live-signals stored the crumb in a module-level variable that
--      resets on every Deno cold start. High cold-start frequency (many
--      concurrent users) repeatedly hit Yahoo's crumb endpoint, causing 429s
--      that cascade to stockData=null for all users.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.edge_crumb_cache (
  key          TEXT        PRIMARY KEY,       -- e.g. 'yahoo_finance_crumb'
  value        TEXT        NOT NULL,          -- the crumb string
  cookies      TEXT        NOT NULL DEFAULT '',
  fetched_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMPTZ NOT NULL
);

-- RLS: service_role only — clients never touch this table
ALTER TABLE public.edge_crumb_cache ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.edge_crumb_cache FROM anon, authenticated;

COMMENT ON TABLE public.edge_crumb_cache IS
  'Persistent storage for short-lived API tokens/crumbs that edge functions '
  'previously cached only in memory (lost on cold start). '
  'Current use: Yahoo Finance crumb (20-min TTL) for proxy-live-signals. '
  'Rows are upserted by edge functions on successful token fetch.';


-- ─────────────────────────────────────────────────────────────────────────────
-- M-2: edge_macro_cache — persistent FRED/BLS macro snapshot storage
--      proxy-macro stored the 6h macro snapshot in a module-level Map.
--      Cold starts reset it, causing burst FRED API calls after idle periods.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.edge_macro_cache (
  key          TEXT        PRIMARY KEY,       -- e.g. 'macro-snapshot'
  payload      JSONB       NOT NULL,
  fetched_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMPTZ NOT NULL
);

ALTER TABLE public.edge_macro_cache ENABLE ROW LEVEL SECURITY;

-- Anonymous read is intentional: the macro data is public financial indicators.
-- Writes are service_role only (edge function uses service key on upsert).
CREATE POLICY "edge_macro_cache_public_read"
  ON public.edge_macro_cache FOR SELECT USING (true);

REVOKE INSERT, UPDATE, DELETE ON public.edge_macro_cache FROM anon, authenticated;

COMMENT ON TABLE public.edge_macro_cache IS
  'Persistent 6-hour cache for FRED/BLS macro snapshots fetched by proxy-macro. '
  'Replaces the in-memory Map that reset on every Deno cold start, causing '
  'burst FRED API calls after idle periods.';


-- ─────────────────────────────────────────────────────────────────────────────
-- H-7: Fix pipeline_upsert_static — ON CONFLICT previously only updated
--      updated_at, silently ignoring all data column changes. Any pipeline
--      script calling this to refresh company data would see no effect.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.pipeline_upsert_static(
  p_table    TEXT,
  p_rows     JSONB,
  p_conflict TEXT,
  p_caller   TEXT DEFAULT 'unknown'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  ALLOWED_TABLES CONSTANT TEXT[] := ARRAY[
    'companies',
    'company_layoff_rounds',
    'industry_risk_data',
    'role_exposure_data',
    'company_intelligence'
    -- user data tables remain intentionally absent
  ];
  v_col_list  TEXT;
  v_set_clause TEXT;
  v_sql       TEXT;
  v_affected  INTEGER := 0;
BEGIN
  -- ── a. Allowlist check ──────────────────────────────────────────────────────
  IF p_table IS NULL OR NOT (p_table = ANY(ALLOWED_TABLES)) THEN
    RAISE EXCEPTION
      'pipeline_upsert_static: table "%" is not in the write allowlist. '
      'Allowed: %. Contact the data team to extend the allowlist.',
      p_table, ALLOWED_TABLES;
  END IF;

  -- ── b. Validate inputs ──────────────────────────────────────────────────────
  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' THEN
    RAISE EXCEPTION 'pipeline_upsert_static: p_rows must be a JSON array, got %',
      COALESCE(jsonb_typeof(p_rows), 'null');
  END IF;

  IF jsonb_array_length(p_rows) = 0 THEN
    RETURN jsonb_build_object('affected', 0, 'table', p_table, 'caller', p_caller);
  END IF;

  -- ── c. Tag session for audit trigger ───────────────────────────────────────
  PERFORM set_config('app.pipeline_caller', p_caller, true);

  -- ── d. Build a SET clause that updates all non-conflict columns.
  --      Previously the function hard-coded SET updated_at = NOW() which
  --      caused all column updates to be silently dropped on conflict.
  --      Fix H-7: derive the SET clause from the table's actual columns,
  --      excluding the conflict key and system columns (id, created_at).
  -- BUG-2 fix: exclude 'updated_at' from the dynamic column list. Without this
  -- exclusion, updated_at would appear twice in the SET clause:
  --   (1) "updated_at = EXCLUDED.updated_at" from the dynamic list
  --   (2) "updated_at = NOW()" from the explicit append below
  -- PostgreSQL rejects duplicate assignment targets in ON CONFLICT DO UPDATE.
  SELECT
    string_agg(
      format('%I = EXCLUDED.%I', column_name, column_name),
      ', '
      ORDER BY ordinal_position
    )
  INTO v_set_clause
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name   = p_table
    AND column_name NOT IN ('id', 'created_at', 'updated_at', p_conflict);

  -- Always append updated_at refresh (column may not exist on all tables; guard with a fallback)
  IF v_set_clause IS NULL OR v_set_clause = '' THEN
    v_set_clause := 'updated_at = NOW()';
  ELSE
    v_set_clause := v_set_clause || CASE
      WHEN EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name=p_table AND column_name='updated_at'
      ) THEN ', updated_at = NOW()'
      ELSE ''
    END;
  END IF;

  -- ── e. Execute upsert via dynamic SQL ──────────────────────────────────────
  v_sql := format(
    'INSERT INTO public.%I '
    'SELECT * FROM jsonb_populate_recordset(null::public.%I, $1) '
    'ON CONFLICT (%I) DO UPDATE SET %s',
    p_table, p_table, p_conflict, v_set_clause
  );
  EXECUTE v_sql USING p_rows;
  GET DIAGNOSTICS v_affected = ROW_COUNT;

  RETURN jsonb_build_object(
    'ok',       true,
    'affected', v_affected,
    'table',    p_table,
    'caller',   p_caller,
    'written_at', NOW()
  );

EXCEPTION
  WHEN OTHERS THEN
    INSERT INTO internal.pipeline_audit_log (
      table_name, operation, changed_by, row_after
    ) VALUES (
      p_table, 'FAILED', p_caller,
      jsonb_build_object('error', SQLERRM, 'sqlstate', SQLSTATE)
    );
    RAISE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.pipeline_upsert_static FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.pipeline_upsert_static TO authenticated;
GRANT  EXECUTE ON FUNCTION public.pipeline_upsert_static TO service_role;

COMMENT ON FUNCTION public.pipeline_upsert_static IS
  'Table-scoped write guard for CI pipeline and data-engineering scripts. '
  'Fix H-7: ON CONFLICT now updates ALL non-key columns (not just updated_at). '
  'company_intelligence added to allowlist so pipeline can refresh company data.';
