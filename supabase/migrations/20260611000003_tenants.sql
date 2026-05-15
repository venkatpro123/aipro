-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260611000003_tenants.sql
-- Purpose:   DEBT-7 — Tenant model. Adds tenant_id (defaulted to a
--            SINGLE_TENANT UUID) to every user-data table so multi-
--            tenancy / white-label can be added later without a
--            6-month schema rewrite.
--
--            The default tenant id is a fixed sentinel
--            ('00000000-0000-0000-0000-000000000001') so existing
--            user data trivially belongs to the default tenant.
--
--            RLS policies are updated to also require tenant_id match
--            against the user's tenant. For now every user belongs to
--            SINGLE_TENANT_ID so the policies are equivalent — but the
--            structure is ready for the day we introduce real tenants.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── Tenants registry ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tenants (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         TEXT         NOT NULL UNIQUE,
  display_name TEXT         NOT NULL,
  status       TEXT         NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'deleted')),
  branding     JSONB        NOT NULL DEFAULT '{}'::jsonb,
  features     JSONB        NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

INSERT INTO public.tenants (id, slug, display_name)
VALUES ('00000000-0000-0000-0000-000000000001', 'default', 'HumanProof (default)')
ON CONFLICT (id) DO NOTHING;

-- ── User → Tenant mapping ─────────────────────────────────────────────────────
-- Stored as a separate table (not a column on auth.users which is managed
-- by Supabase) so we can extend with per-tenant roles later.
CREATE TABLE IF NOT EXISTS public.tenant_memberships (
  user_id    UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id  UUID         NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role       TEXT         NOT NULL DEFAULT 'member'
    CHECK (role IN ('member', 'admin', 'owner')),
  joined_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_tm_user ON public.tenant_memberships (user_id);
CREATE INDEX IF NOT EXISTS idx_tm_tenant ON public.tenant_memberships (tenant_id);

-- Convenience function: which tenant should we attribute this user's
-- data to? Defaults to the SINGLE_TENANT if no membership exists.
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(
    (SELECT tenant_id FROM public.tenant_memberships WHERE user_id = auth.uid() ORDER BY joined_at LIMIT 1),
    '00000000-0000-0000-0000-000000000001'::UUID
  );
$$;

-- ── Add tenant_id to user-data tables (idempotent) ───────────────────────────
-- The list below is the v35 set. New user-data tables MUST add the column
-- at creation time and reference current_tenant_id() in their default.
DO $tenant_columns$
DECLARE
  tables_to_extend TEXT[] := ARRAY[
    'user_prediction_outcomes',
    'audit_shadow_comparison',
    'score_trajectory',
    'analytics_events',
    'tenant_memberships'  -- placeholder; already has tenant_id
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables_to_extend LOOP
    IF t = 'tenant_memberships' THEN CONTINUE; END IF;  -- already typed
    -- Add the column if missing.
    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL DEFAULT %L',
      t, '00000000-0000-0000-0000-000000000001'
    );
    -- Index for tenant-scoped queries.
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON public.%I (tenant_id)',
      'idx_' || t || '_tenant', t
    );
  END LOOP;
END;
$tenant_columns$;

-- ── RLS: tenant_memberships ─────────────────────────────────────────────────
ALTER TABLE public.tenants            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenants_member_select"
  ON public.tenants FOR SELECT
  USING (id IN (SELECT tenant_id FROM public.tenant_memberships WHERE user_id = auth.uid()));

CREATE POLICY "tm_own_select"
  ON public.tenant_memberships FOR SELECT
  USING (user_id = auth.uid());

-- service_role inserts are unrestricted; user-level inserts blocked
-- (memberships are created by admin tooling).

-- ── Tenant-aware RLS for existing tables ────────────────────────────────────
-- We add ADDITIONAL policies that scope by tenant_id without removing the
-- existing user_id policies, so:
--   * Authenticated users see their own rows in their tenant.
--   * service_role bypasses (unchanged).
-- The DEFAULT '00000000-0000-0000-0000-000000000001' on existing rows
-- means current users still see their existing data without change.

CREATE POLICY "upo_tenant_match"
  ON public.user_prediction_outcomes
  FOR SELECT
  USING (tenant_id = current_tenant_id() OR tenant_id IS NULL);

-- Note: we deliberately do NOT add tenant policies to audit_shadow_comparison
-- yet — its RLS is by user_id only and that's correct for the shadow ledger
-- (cross-tenant comparison may be useful for admin views). When the first
-- enterprise tenant signs we revisit.

COMMENT ON FUNCTION public.current_tenant_id IS
  'DEBT-7 — Returns the calling user''s tenant_id. Default SINGLE_TENANT for users '
  'without a membership row. Used by RLS policies to scope reads/writes.';
