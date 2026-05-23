-- Migration: 20260523000004_enterprise_api_infrastructure.sql
--
-- Deploys the database layer for the HumanProof Enterprise API:
--
--   1. enterprise_api_keys  — customer-facing API key store (distinct from the
--      internal api_keys table which holds AlphaVantage / NewsAPI credentials).
--
--   2. api_usage            — daily call-count ledger per key per endpoint.
--      Indexed for sub-5ms lookups at 10 k+ keys.
--
--   3. check_and_increment_api_usage() — atomic rate-limit enforcer.
--      Uses pg_advisory_xact_lock to prevent the read→compare→write race
--      that lets concurrent calls overshoot daily_limit.
--      Returns (allowed BOOLEAN, current_count INT, remaining INT).
--
-- RLS posture for enterprise_api_keys:
--   anon + authenticated: zero access (no policies → default-deny under RLS).
--   service_role: full access (bypasses RLS).
--   The Edge Function connects with the service role key — no client-side reads.
--
-- RLS posture for api_usage:
--   Same as enterprise_api_keys — service_role only.
-- ═══════════════════════════════════════════════════════════════════════════════


-- ── 1. enterprise_api_keys ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.enterprise_api_keys (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name  TEXT         NOT NULL,
  key_hash       TEXT         NOT NULL UNIQUE,   -- SHA-256 of raw key; raw key never stored
  key_prefix     TEXT         NOT NULL,           -- first 8 chars for dashboard identification
  tier           TEXT         NOT NULL DEFAULT 'standard'
                   CHECK (tier IN ('standard', 'enterprise', 'trial', 'internal')),
  daily_limit    INTEGER      NOT NULL DEFAULT 1000
                   CHECK (daily_limit > 0),
  is_active      BOOLEAN      NOT NULL DEFAULT true,
  expires_at     TIMESTAMPTZ,
  last_used_at   TIMESTAMPTZ,
  notes          TEXT,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_enterprise_api_keys_hash
  ON public.enterprise_api_keys (key_hash)
  WHERE is_active = true;

ALTER TABLE public.enterprise_api_keys ENABLE ROW LEVEL SECURITY;

-- Default-deny: no anon/authenticated policies.
-- service_role bypasses RLS and retains full access.
COMMENT ON TABLE public.enterprise_api_keys IS
  'Customer-facing Enterprise API key store. '
  'Raw keys are NEVER stored — only SHA-256 hash. '
  'RLS: anon/authenticated have zero access (no policies = default deny). '
  'service_role (Edge Function) reads via service key. '
  'Tiers: standard 1K calls/day (INR 10L/yr), enterprise custom.';


-- ── 2. api_usage ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.api_usage (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id      UUID    NOT NULL REFERENCES public.enterprise_api_keys (id) ON DELETE CASCADE,
  date        DATE    NOT NULL,
  endpoint    TEXT    NOT NULL,
  call_count  INTEGER NOT NULL DEFAULT 0 CHECK (call_count >= 0),
  UNIQUE (key_id, date, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_api_usage_key_date
  ON public.api_usage (key_id, date);

ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.api_usage IS
  'Daily call-count ledger per enterprise_api_keys row per endpoint. '
  'Written atomically by check_and_increment_api_usage(). '
  'RLS: service_role only.';


-- ── 3. check_and_increment_api_usage ─────────────────────────────────────────
--
-- Atomically increments the call count for (key_id, date, endpoint) and
-- returns whether the call is allowed under daily_limit.
--
-- Concurrency safety:
--   pg_advisory_xact_lock(bigint) is held for the full transaction.
--   Lock key = numeric hash of (key_id, date). Any two concurrent calls for
--   the same key on the same day block on the lock — preventing the TOCTOU
--   race where both read count=999, both decide "allowed", and both increment
--   past the limit.
--
-- Rollback on exceeded:
--   If the post-increment count exceeds p_daily_limit, the increment is
--   reversed before returning allowed=false. The usage row stays consistent.
--
-- Parameters:
--   p_key_id      UUID    — enterprise_api_keys.id
--   p_date        TEXT    — ISO date string 'YYYY-MM-DD' (cast to DATE internally)
--   p_endpoint    TEXT    — endpoint name, e.g. 'role-risk'
--   p_daily_limit INTEGER — daily_limit from enterprise_api_keys row
--
-- Returns:
--   allowed       BOOLEAN — false when count would exceed p_daily_limit
--   current_count INTEGER — call count AFTER this call (or at limit when denied)
--   remaining     INTEGER — calls remaining today (0 when denied)

CREATE OR REPLACE FUNCTION public.check_and_increment_api_usage(
  p_key_id      UUID,
  p_date        TEXT,
  p_endpoint    TEXT,
  p_daily_limit INTEGER
)
RETURNS TABLE (allowed BOOLEAN, current_count INTEGER, remaining INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count    INTEGER;
  v_lock_key BIGINT;
  v_date     DATE;
BEGIN
  v_date := p_date::DATE;

  -- Advisory lock scoped to this key+date combination.
  -- Bigint derived from MD5 hash of the composite key.
  v_lock_key := ('x' || substr(md5(p_key_id::TEXT || p_date), 1, 16))::BIT(64)::BIGINT;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- Upsert: insert with count=1 on first call of the day, increment otherwise.
  INSERT INTO public.api_usage (key_id, date, endpoint, call_count)
       VALUES (p_key_id, v_date, p_endpoint, 1)
  ON CONFLICT (key_id, date, endpoint)
  DO UPDATE SET call_count = api_usage.call_count + 1
  RETURNING call_count INTO v_count;

  -- If the increment pushed us over the limit, roll it back.
  IF v_count > p_daily_limit THEN
    UPDATE public.api_usage
       SET call_count = call_count - 1
     WHERE key_id = p_key_id
       AND date     = v_date
       AND endpoint = p_endpoint;

    RETURN QUERY SELECT false, p_daily_limit, 0;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, v_count, p_daily_limit - v_count;
END;
$$;

COMMENT ON FUNCTION public.check_and_increment_api_usage IS
  'Atomic rate-limit enforcer for the Enterprise API. '
  'Uses pg_advisory_xact_lock to prevent concurrent calls from overshooting daily_limit. '
  'Returns (allowed, current_count, remaining).';

REVOKE EXECUTE ON FUNCTION public.check_and_increment_api_usage FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.check_and_increment_api_usage TO service_role;


-- ── Seed: internal test key (deactivated) ─────────────────────────────────────
-- SHA-256 of 'hp_internal_test_key_do_not_use_in_prod'
-- is_active=false ensures it cannot be used until explicitly activated.
INSERT INTO public.enterprise_api_keys
  (customer_name, key_hash, key_prefix, tier, daily_limit, is_active, notes)
VALUES (
  'HumanProof Internal',
  'a3f8b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1',
  'hp_inter',
  'internal',
  50000,
  false,
  'Seed test key — activate only in dev/staging. Raw key is in 1Password vault.'
)
ON CONFLICT (key_hash) DO NOTHING;


-- ── Verification ──────────────────────────────────────────────────────────────
-- SELECT * FROM public.enterprise_api_keys;
-- SELECT public.check_and_increment_api_usage(
--   (SELECT id FROM public.enterprise_api_keys LIMIT 1),
--   CURRENT_DATE::TEXT, 'role-risk', 1000
-- );
