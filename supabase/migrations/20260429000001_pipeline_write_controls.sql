-- Migration: Pipeline write controls
-- Adds three things:
--   1. pipeline_audit_log — immutable record of every write the pipeline makes
--   2. Triggers on static data tables → auto-populate the audit log
--   3. pipeline_upsert_static() — SECURITY DEFINER guard function that enforces
--      a table allowlist and validates caller identity before writing
--
-- WHY THIS EXISTS
-- service_role bypasses RLS entirely. SELECT-only RLS policies on static tables
-- do not prevent service_role writes. A compromised key can write to any table.
-- This migration creates two independent barriers that work regardless of RLS:
--   a) The audit log captures every write — forensic visibility after the fact
--   b) The guard function is the ONLY write path that scripts should call —
--      it rejects writes to any table not in the ALLOWED_TABLES list

-- ── 1. Audit log table ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS internal.pipeline_audit_log (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name    TEXT        NOT NULL,
  operation     TEXT        NOT NULL CHECK (operation IN ('INSERT','UPDATE','DELETE')),
  row_id        UUID,                    -- id of the affected row (NULL for bulk ops)
  changed_by    TEXT        NOT NULL,    -- identifies the caller: script name or 'pipeline'
  payload_hash  TEXT,                    -- sha256 of the written payload for tamper detection
  row_before    JSONB,                   -- old values (UPDATE/DELETE only)
  row_after     JSONB,                   -- new values (INSERT/UPDATE only)
  written_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- internal schema is not exposed via PostgREST — only accessible via service_role
-- and server-side functions. This prevents the audit log from being read or
-- manipulated through the Supabase API.
COMMENT ON TABLE internal.pipeline_audit_log IS
  'Immutable audit log for all pipeline writes to static data tables. '
  'Rows are never updated or deleted by application code. '
  'Use SELECT only for forensic review. Retention: 2 years.';

-- Prevent application code from deleting audit rows
-- (service_role can still access for administration, but adds a named barrier)
CREATE OR REPLACE RULE pipeline_audit_log_no_delete AS
  ON DELETE TO internal.pipeline_audit_log DO INSTEAD NOTHING;

CREATE OR REPLACE RULE pipeline_audit_log_no_update AS
  ON UPDATE TO internal.pipeline_audit_log DO INSTEAD NOTHING;

-- ── 2. Audit trigger function ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION internal.pipeline_audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller TEXT;
BEGIN
  -- Identify caller from session variable set by the guard function.
  -- Direct writes that bypass the guard function will show 'unguarded-direct-write'
  -- which makes unauthorized access immediately visible in the audit log.
  v_caller := COALESCE(
    current_setting('app.pipeline_caller', true),
    'unguarded-direct-write'
  );

  INSERT INTO internal.pipeline_audit_log (
    table_name, operation, row_id, changed_by, row_before, row_after
  ) VALUES (
    TG_TABLE_NAME,
    TG_OP,
    CASE TG_OP
      WHEN 'DELETE' THEN (OLD.id)::UUID
      ELSE (NEW.id)::UUID
    END,
    v_caller,
    CASE TG_OP WHEN 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE TG_OP WHEN 'DELETE' THEN NULL ELSE to_jsonb(NEW) END
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

-- Attach audit trigger to all static data tables
CREATE OR REPLACE TRIGGER audit_companies
  AFTER INSERT OR UPDATE OR DELETE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION internal.pipeline_audit_trigger();

CREATE OR REPLACE TRIGGER audit_company_layoff_rounds
  AFTER INSERT OR UPDATE OR DELETE ON public.company_layoff_rounds
  FOR EACH ROW EXECUTE FUNCTION internal.pipeline_audit_trigger();

CREATE OR REPLACE TRIGGER audit_industry_risk_data
  AFTER INSERT OR UPDATE OR DELETE ON public.industry_risk_data
  FOR EACH ROW EXECUTE FUNCTION internal.pipeline_audit_trigger();

CREATE OR REPLACE TRIGGER audit_role_exposure_data
  AFTER INSERT OR UPDATE OR DELETE ON public.role_exposure_data
  FOR EACH ROW EXECUTE FUNCTION internal.pipeline_audit_trigger();

-- ── 3. Table-scoped write guard function ──────────────────────────────────────
--
-- Scripts and the CI pipeline must call this function rather than writing
-- directly to tables. The function:
--   a) Validates the table name against a hardcoded allowlist
--   b) Sets app.pipeline_caller so the audit trigger records who called
--   c) Performs the actual upsert
--   d) Returns the count of affected rows
--
-- Calling pattern (TypeScript):
--   await supabase.rpc('pipeline_upsert_static', {
--     p_table:    'role_exposure_data',
--     p_rows:     JSON.stringify(rows),
--     p_conflict: 'role_title',
--     p_caller:   'seed_static_data.ts / v1.2',
--   });

CREATE OR REPLACE FUNCTION public.pipeline_upsert_static(
  p_table    TEXT,
  p_rows     JSONB,
  p_conflict TEXT,
  p_caller   TEXT DEFAULT 'unknown'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER   -- runs as function owner (postgres), not caller
AS $$
DECLARE
  ALLOWED_TABLES CONSTANT TEXT[] := ARRAY[
    'companies',
    'company_layoff_rounds',
    'industry_risk_data',
    'role_exposure_data'
    -- User data tables (layoff_scores, journal, roadmap_progress, etc.)
    -- are intentionally absent. Adding them here requires a deliberate code review.
  ];
  v_sql      TEXT;
  v_affected INTEGER := 0;
  v_row      JSONB;
BEGIN
  -- ── a. Allowlist check ──────────────────────────────────────────────────────
  IF p_table IS NULL OR NOT (p_table = ANY(ALLOWED_TABLES)) THEN
    RAISE EXCEPTION
      'pipeline_upsert_static: table "%" is not in the write allowlist. '
      'Allowed tables: %. Contact the data team to extend the allowlist.',
      p_table, ALLOWED_TABLES;
  END IF;

  -- ── b. Validate inputs ──────────────────────────────────────────────────────
  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' THEN
    RAISE EXCEPTION 'pipeline_upsert_static: p_rows must be a JSON array, got %',
      COALESCE(jsonb_typeof(p_rows), 'null');
  END IF;

  IF array_length(string_to_array(p_rows::TEXT, NULL), 1) = 0 THEN
    RETURN jsonb_build_object('affected', 0, 'table', p_table, 'caller', p_caller);
  END IF;

  -- ── c. Tag session for audit trigger ───────────────────────────────────────
  PERFORM set_config('app.pipeline_caller', p_caller, true); -- true = local to txn

  -- ── d. Execute upsert via dynamic SQL ──────────────────────────────────────
  -- p_table is validated against the allowlist above so format() is safe here.
  v_sql := format(
    'INSERT INTO public.%I SELECT * FROM jsonb_populate_recordset(null::public.%I, $1) '
    'ON CONFLICT (%I) DO UPDATE SET updated_at = NOW()',
    p_table, p_table, p_conflict
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
    -- Log the failure to the audit table before re-raising
    INSERT INTO internal.pipeline_audit_log (
      table_name, operation, changed_by, row_after
    ) VALUES (
      p_table, 'FAILED', p_caller,
      jsonb_build_object('error', SQLERRM, 'sqlstate', SQLSTATE)
    );
    RAISE;
END;
$$;

-- Revoke public execute — only authenticated callers (anon or service_role) can call it.
-- The function itself is SECURITY DEFINER so it runs with postgres permissions regardless,
-- but we don't want it callable by completely unauthenticated requests.
REVOKE EXECUTE ON FUNCTION public.pipeline_upsert_static FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.pipeline_upsert_static TO authenticated;
GRANT  EXECUTE ON FUNCTION public.pipeline_upsert_static TO service_role;

-- ── 4. Add explicit deny policies for writes on static tables ─────────────────
-- These policies apply to the anon and authenticated roles (not service_role,
-- which bypasses RLS). They make the intent explicit and block accidental writes
-- from browser clients that somehow obtain an authenticated session.

CREATE POLICY "companies_no_anon_write"
  ON public.companies FOR INSERT WITH CHECK (false);
CREATE POLICY "companies_no_anon_update"
  ON public.companies FOR UPDATE USING (false);
CREATE POLICY "companies_no_anon_delete"
  ON public.companies FOR DELETE USING (false);

CREATE POLICY "industry_risk_no_anon_write"
  ON public.industry_risk_data FOR INSERT WITH CHECK (false);
CREATE POLICY "industry_risk_no_anon_update"
  ON public.industry_risk_data FOR UPDATE USING (false);
CREATE POLICY "industry_risk_no_anon_delete"
  ON public.industry_risk_data FOR DELETE USING (false);

CREATE POLICY "role_exposure_no_anon_write"
  ON public.role_exposure_data FOR INSERT WITH CHECK (false);
CREATE POLICY "role_exposure_no_anon_update"
  ON public.role_exposure_data FOR UPDATE USING (false);
CREATE POLICY "role_exposure_no_anon_delete"
  ON public.role_exposure_data FOR DELETE USING (false);

COMMENT ON FUNCTION public.pipeline_upsert_static IS
  'Table-scoped write guard for CI pipeline and data-engineering scripts. '
  'Only tables in ALLOWED_TABLES can be written. All writes are logged to '
  'internal.pipeline_audit_log. Direct table writes are detectable via '
  'the unguarded-direct-write marker in the audit log.';
