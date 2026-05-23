-- Migration: 20260523000003_community_share_retroactive_optin.sql
--
-- Fixes two structural gaps in community data accumulation:
--
--   GAP-A  layoff_scores has no UPDATE policy — users cannot change
--          allow_community_share on historical audit rows after the fact.
--          Any audit run before enabling community share is permanently
--          excluded from community_risk_signals.
--
--   GAP-B  No server-side RPC exposes bulk retroactive opt-in/out.
--          The UI toggle only affects future audits; past audits stay locked.
--
-- ── 1. UPDATE policy — users can flip allow_community_share on their own rows ──

DROP POLICY IF EXISTS "Users update own community share" ON public.layoff_scores;
CREATE POLICY "Users update own community share"
  ON public.layoff_scores FOR UPDATE
  TO authenticated
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── 2. Retroactive consent RPC ────────────────────────────────────────────────
-- Updates allow_community_share on ALL of the caller's layoff_scores rows in one
-- call. Also mirrors the setting to user_profiles.community_share_consented so
-- that EU users' DB column stays in sync with their choice.
--
-- Returns: { ok, rows_updated, enable }
-- rows_updated = count of rows whose value actually changed (already-matching rows excluded)

CREATE OR REPLACE FUNCTION public.update_community_share_consent(
  p_enable BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_updated INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'update_community_share_consent: caller must be authenticated';
  END IF;

  UPDATE public.layoff_scores
     SET allow_community_share = p_enable
   WHERE user_id = v_user_id
     AND allow_community_share IS DISTINCT FROM p_enable;
  GET DIAGNOSTICS v_updated = ROW_COUNT;

  -- Mirror to user_profiles for EU consent-column alignment
  UPDATE public.user_profiles
     SET community_share_consented = p_enable
   WHERE user_id = v_user_id;

  RETURN jsonb_build_object(
    'ok',          true,
    'rows_updated', v_updated,
    'enable',       p_enable
  );
END;
$$;

COMMENT ON FUNCTION public.update_community_share_consent IS
  'Retroactively opt in or out of community benchmarks for all of the caller''s '
  'historical audit rows. Sets allow_community_share on layoff_scores and mirrors '
  'community_share_consented on user_profiles for EU alignment. '
  'Returns { ok, rows_updated, enable }.';

REVOKE EXECUTE ON FUNCTION public.update_community_share_consent FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.update_community_share_consent TO authenticated;
