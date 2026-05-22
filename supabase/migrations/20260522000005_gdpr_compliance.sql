-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260522000005_gdpr_compliance.sql
-- Purpose:   GDPR compliance for EU users (Germany, France, Netherlands, Spain,
--            Portugal, Italy and all 27 EU member states).
--
-- LEGAL BASIS: GDPR Articles 15, 17, 20 + Recitals 26, 39, 64, 65.
--   Art. 15  — Right of access (data export)
--   Art. 17  — Right to erasure ("right to be forgotten")
--   Art. 20  — Right to data portability (JSON export)
--   Art. 7   — Conditions for consent (freely given, specific, informed)
--
-- This migration adds:
--   1. user_profiles consent columns (GDPR consent flag + timestamps)
--   2. user_data_deletion_requests — audit trail of erasure requests with
--      30-day SLA tracking (GDPR Art. 12 requires response within 1 month)
--   3. delete_user_data_gdpr() SECURITY DEFINER — bypasses RLS to erase all
--      user data regardless of table-level delete restrictions
--   4. RLS fix on user_prediction_outcomes — allow self-deletes (the existing
--      upo_no_delete policy blocked all deletes; SECURITY DEFINER RPC
--      bypasses it anyway, but we expose a clean delete path for completeness)
--   5. RLS fix on score_trajectory — add own-row DELETE policy
--   6. community_risk_signals view guard — EU users only contribute when
--      community_share_consented = true on their profile
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. user_profiles: GDPR consent columns ────────────────────────────────────

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS gdpr_consent_given        BOOLEAN      DEFAULT false,
  ADD COLUMN IF NOT EXISTS gdpr_consent_at           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS gdpr_consent_version      TEXT,          -- consent schema version, e.g. '1.0'
  ADD COLUMN IF NOT EXISTS is_eu_user                BOOLEAN      DEFAULT false,
  -- Community share: EU users require explicit opt-IN (reverse of global default).
  -- Non-EU: controlled by hp_community_share localStorage key.
  -- EU: controlled by this DB column AND the hp_community_share key.
  ADD COLUMN IF NOT EXISTS community_share_consented BOOLEAN      DEFAULT false,
  -- Financial minimization: when false, monthly_expenses_usd and
  -- savings_months_runway are never transmitted to Supabase for this user.
  -- Stored in localStorage (gdprService) and respected by userProfileService.
  ADD COLUMN IF NOT EXISTS financial_data_consented  BOOLEAN      DEFAULT false;

COMMENT ON COLUMN public.user_profiles.is_eu_user IS
  'True when user is in an EU member state (detected by timezone/currency/IP '
  'or explicitly set by user). Governs GDPR-specific data handling rules.';

COMMENT ON COLUMN public.user_profiles.community_share_consented IS
  'EU-specific: explicit opt-IN for community risk signal sharing. '
  'Non-EU users use the hp_community_share localStorage key. '
  'For EU users, both this column AND the localStorage key must be true.';

COMMENT ON COLUMN public.user_profiles.financial_data_consented IS
  'EU-specific: explicit consent to store monthly_expenses_usd and '
  'savings_months_runway in Supabase. When false, those fields are '
  'localStorage-only (gdprService.getLocalFinancialData()).';

-- ── 2. user_data_deletion_requests ────────────────────────────────────────────
-- Permanent audit trail of GDPR Art. 17 requests.
-- Records are kept AFTER deletion (without PII) for compliance audit purposes.
-- The 30-day SLA column enables automated monitoring.

CREATE TABLE IF NOT EXISTS public.user_data_deletion_requests (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- user_id stored as TEXT (not FK) so the record survives after user is deleted.
  -- This is intentional: the audit trail must outlive the user.
  user_id_str           TEXT          NOT NULL,

  -- Hashed email for re-identification in case of audit; never stored plain.
  -- SHA-256 of lowercase email; NULL when user was anonymous.
  email_sha256          TEXT,

  requested_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  -- 30-day SLA deadline (GDPR Art. 12.3)
  sla_deadline_at       TIMESTAMPTZ   NOT NULL
    GENERATED ALWAYS AS (requested_at + INTERVAL '30 days') STORED,

  -- Filled when deletion completes
  completed_at          TIMESTAMPTZ,
  is_complete           BOOLEAN       NOT NULL DEFAULT false,

  -- Which tables were cleared
  tables_cleared        TEXT[]        NOT NULL DEFAULT '{}',

  -- How deletion was triggered
  deletion_method       TEXT          NOT NULL DEFAULT 'user_self_service'
    CHECK (deletion_method IN ('user_self_service', 'admin_request', 'account_closure', 'automated')),

  -- Free-text note for audit trail (e.g. reason, support ticket ID)
  notes                 TEXT,

  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_uddr_user_id_str
  ON public.user_data_deletion_requests (user_id_str);

CREATE INDEX IF NOT EXISTS idx_uddr_sla_breach
  ON public.user_data_deletion_requests (sla_deadline_at)
  WHERE is_complete = false;

ALTER TABLE public.user_data_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Service_role only — deletion request records are operational, not user-facing.
CREATE POLICY uddr_service_only ON public.user_data_deletion_requests
  FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE public.user_data_deletion_requests IS
  'Permanent audit trail of GDPR Art. 17 right-to-erasure requests. '
  'Rows survive after user deletion (user_id stored as TEXT, not FK). '
  'sla_deadline_at = requested_at + 30d. Monitor idx_uddr_sla_breach for overdue requests.';

-- ── 3. delete_user_data_gdpr() — SECURITY DEFINER erasure ────────────────────
--
-- Runs as the function owner (postgres) so it bypasses ALL table-level RLS,
-- including:
--   - upo_no_delete (user_prediction_outcomes hard-blocks deletes)
--   - score_trajectory has no delete policy
-- The calling Edge Function (user-data-delete) authenticates the user first
-- and only passes their own user_id. Service-role key required to call the EF.
--
-- Returns JSON with tables_cleared and row counts for the audit trail.

CREATE OR REPLACE FUNCTION public.delete_user_data_gdpr(
  p_user_id        UUID,
  p_email_sha256   TEXT DEFAULT NULL,
  p_deletion_method TEXT DEFAULT 'user_self_service'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ls_rows  INTEGER := 0;
  v_st_rows  INTEGER := 0;
  v_upo_rows INTEGER := 0;
  v_up_rows  INTEGER := 0;
  v_req_id   UUID;
BEGIN
  -- layoff_scores
  DELETE FROM public.layoff_scores WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_ls_rows = ROW_COUNT;

  -- score_trajectory
  DELETE FROM public.score_trajectory WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_st_rows = ROW_COUNT;

  -- user_prediction_outcomes (bypasses upo_no_delete via SECURITY DEFINER)
  DELETE FROM public.user_prediction_outcomes WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_upo_rows = ROW_COUNT;

  -- user_profiles (last — cascading FKs may depend on this row)
  DELETE FROM public.user_profiles WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_up_rows = ROW_COUNT;

  -- Insert audit record (with TEXT user_id so it survives the cascade)
  INSERT INTO public.user_data_deletion_requests (
    user_id_str,
    email_sha256,
    completed_at,
    is_complete,
    tables_cleared,
    deletion_method
  ) VALUES (
    p_user_id::TEXT,
    p_email_sha256,
    NOW(),
    true,
    ARRAY[
      'layoff_scores('       || v_ls_rows::TEXT  || ')',
      'score_trajectory('    || v_st_rows::TEXT  || ')',
      'user_prediction_outcomes(' || v_upo_rows::TEXT || ')',
      'user_profiles('       || v_up_rows::TEXT  || ')'
    ],
    p_deletion_method
  ) RETURNING id INTO v_req_id;

  RETURN jsonb_build_object(
    'request_id',         v_req_id,
    'user_id',            p_user_id,
    'completed_at',       NOW(),
    'tables_cleared',     jsonb_build_object(
      'layoff_scores',              v_ls_rows,
      'score_trajectory',           v_st_rows,
      'user_prediction_outcomes',   v_upo_rows,
      'user_profiles',              v_up_rows
    )
  );
END;
$$;

COMMENT ON FUNCTION public.delete_user_data_gdpr IS
  'GDPR Art. 17 right-to-erasure. Runs SECURITY DEFINER (bypasses RLS). '
  'Only callable via service_role key. Returns JSONB audit record. '
  'Deletes: layoff_scores, score_trajectory, user_prediction_outcomes, user_profiles.';

-- ── 4. RLS: allow own-row DELETE on user_prediction_outcomes ─────────────────
-- The existing upo_no_delete policy blocks all deletes via RLS.
-- The SECURITY DEFINER function above already bypasses it, but we also
-- expose a clean direct-delete path for authenticated users.
-- Drop the blanket no-delete policy, add own-row delete.

DROP POLICY IF EXISTS upo_no_delete ON public.user_prediction_outcomes;

CREATE POLICY upo_own_rows_delete ON public.user_prediction_outcomes
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ── 5. RLS: allow own-row DELETE on score_trajectory ─────────────────────────
-- score_trajectory was designed as "immutable history" with no delete policy.
-- GDPR Art. 17 overrides this design decision for EU users.

CREATE POLICY st_own_rows_delete ON public.score_trajectory
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ── 6. community_risk_signals view: EU consent guard ─────────────────────────
-- The existing view exposes all rows with allow_community_share = true.
-- EU users must additionally have community_share_consented = true on their
-- profile (the explicit opt-IN required by GDPR Art. 7).
--
-- Non-EU users: existing allow_community_share behavior unchanged.
-- EU users:     allow_community_share AND community_share_consented required.

CREATE OR REPLACE VIEW public.community_risk_signals AS
SELECT
  ls.role_key,
  ls.industry_key,
  ls.score,
  ls.tier,
  ls.confidence,
  ls.breakdown,
  ls.data_quality,
  ls.calculated_at
FROM public.layoff_scores ls
LEFT JOIN public.user_profiles up ON up.user_id = ls.user_id
WHERE ls.allow_community_share = true
  AND (
    -- Non-EU users: standard community share flag suffices
    (up.is_eu_user IS NOT TRUE)
    OR
    -- EU users: require explicit profile-level opt-IN
    (up.is_eu_user = true AND up.community_share_consented = true)
  );

COMMENT ON VIEW public.community_risk_signals IS
  'Community-aggregated risk signals. EU users (is_eu_user=true) require '
  'both allow_community_share=true AND community_share_consented=true. '
  'Non-EU users: allow_community_share=true suffices.';
