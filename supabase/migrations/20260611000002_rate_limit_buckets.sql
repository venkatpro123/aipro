-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260611000002_rate_limit_buckets.sql
-- Purpose:   DEBT-10 — Application-layer token-bucket rate limiting.
--
--            Today, abuse protection relies entirely on Supabase's
--            connection limits + the (per-user) client-side cooldowns
--            inside scraperTrigger.ts. A malicious or buggy client can
--            fire 10k audits/sec from one IP and Supabase's rate limit
--            falls back on every user.
--
--            The token-bucket implementation here:
--              * One row per (subject, bucket_key). Subject is typically
--                user_id; bucket_key is the protected operation
--                ('audit', 'recalibration', 'scrape_trigger', ...).
--              * Each call invokes consume_token() which atomically:
--                  - refills tokens at rate `tokens_per_second` up to
--                    `capacity`, capped at NOW(),
--                  - decrements by `cost`,
--                  - returns FALSE when balance would go negative.
--              * Per-bucket configuration in rate_limit_policies.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── Policy definition ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rate_limit_policies (
  bucket_key         TEXT         PRIMARY KEY,
  description        TEXT         NOT NULL,
  capacity           INTEGER      NOT NULL CHECK (capacity > 0),
  tokens_per_second  NUMERIC(8,4) NOT NULL CHECK (tokens_per_second > 0),
  default_cost       INTEGER      NOT NULL DEFAULT 1 CHECK (default_cost > 0),
  enabled            BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

INSERT INTO public.rate_limit_policies (bucket_key, description, capacity, tokens_per_second, default_cost) VALUES
  ('audit',             'Per-user audit submission (LayoffCalculator)',            60, 0.1,  1),  -- 60 burst, 1 per 10s sustained
  ('scrape_trigger',    'Per-user manual scraper trigger',                          5, 0.05, 1),  -- 5 burst, 1 per 20s
  ('recalibration',     'Per-user manual recalibration request',                    3, 0.001, 1), -- 3 burst, 1 per 1000s
  ('outcome_report',    'Per-user outcome confirmation submissions',               30, 0.5,  1),  -- 30 burst, ~ 1/2s
  ('shadow_admin_read', 'Per-user reads of audit_shadow_comparison',              120, 2.0,  1)   -- 120 burst, 2/s
ON CONFLICT (bucket_key) DO NOTHING;

-- ── Bucket state ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  bucket_key         TEXT         NOT NULL REFERENCES public.rate_limit_policies(bucket_key) ON DELETE CASCADE,
  subject            TEXT         NOT NULL,                   -- typically user_id::text
  token_balance      NUMERIC(10,3) NOT NULL,
  last_refilled_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  -- Aggregates for monitoring
  total_consumed     BIGINT       NOT NULL DEFAULT 0,
  total_rejected     BIGINT       NOT NULL DEFAULT 0,
  last_rejected_at   TIMESTAMPTZ,
  PRIMARY KEY (bucket_key, subject)
);

CREATE INDEX IF NOT EXISTS idx_rlb_subject
  ON public.rate_limit_buckets (subject)
  WHERE total_rejected > 0;

-- ── Consume function ──────────────────────────────────────────────────────────
-- SECURITY DEFINER so any caller (anon or authenticated) can consume tokens
-- without bypassing the row-locking that makes the bucket atomic.
CREATE OR REPLACE FUNCTION public.consume_token(
  p_bucket_key TEXT,
  p_subject    TEXT,
  p_cost       INTEGER DEFAULT NULL
)
RETURNS TABLE (allowed BOOLEAN, balance NUMERIC, capacity INTEGER, retry_after_ms INTEGER)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_policy   public.rate_limit_policies%ROWTYPE;
  v_now      TIMESTAMPTZ := NOW();
  v_elapsed  NUMERIC;
  v_refill   NUMERIC;
  v_cost     INTEGER;
  v_balance  NUMERIC;
BEGIN
  SELECT * INTO v_policy FROM public.rate_limit_policies WHERE bucket_key = p_bucket_key;
  IF NOT FOUND OR NOT v_policy.enabled THEN
    -- Unknown or disabled bucket → fail-open with full capacity reported.
    RETURN QUERY SELECT TRUE, NULL::NUMERIC, NULL::INTEGER, 0;
    RETURN;
  END IF;

  v_cost := COALESCE(p_cost, v_policy.default_cost);

  -- Lock the bucket row (or create it) for atomic refill+consume.
  INSERT INTO public.rate_limit_buckets (bucket_key, subject, token_balance, last_refilled_at)
  VALUES (p_bucket_key, p_subject, v_policy.capacity, v_now)
  ON CONFLICT (bucket_key, subject) DO NOTHING;

  PERFORM 1 FROM public.rate_limit_buckets
   WHERE bucket_key = p_bucket_key AND subject = p_subject
   FOR UPDATE;

  SELECT token_balance, last_refilled_at INTO v_balance, v_elapsed
    FROM public.rate_limit_buckets
   WHERE bucket_key = p_bucket_key AND subject = p_subject;

  -- Refill: tokens accrue at tokens_per_second up to capacity.
  v_elapsed := EXTRACT(EPOCH FROM (v_now - v_elapsed));
  v_refill  := v_elapsed * v_policy.tokens_per_second;
  v_balance := LEAST(v_policy.capacity::NUMERIC, v_balance + v_refill);

  IF v_balance >= v_cost THEN
    v_balance := v_balance - v_cost;
    UPDATE public.rate_limit_buckets
       SET token_balance = v_balance,
           last_refilled_at = v_now,
           total_consumed = total_consumed + v_cost
     WHERE bucket_key = p_bucket_key AND subject = p_subject;
    RETURN QUERY SELECT TRUE, v_balance, v_policy.capacity, 0;
    RETURN;
  ELSE
    UPDATE public.rate_limit_buckets
       SET token_balance = v_balance,
           last_refilled_at = v_now,
           total_rejected = total_rejected + 1,
           last_rejected_at = v_now
     WHERE bucket_key = p_bucket_key AND subject = p_subject;
    RETURN QUERY SELECT FALSE, v_balance, v_policy.capacity,
                        (CEIL((v_cost - v_balance) / v_policy.tokens_per_second) * 1000)::INTEGER;
    RETURN;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_token(TEXT, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_token(TEXT, TEXT, INTEGER) TO authenticated, anon, service_role;

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.rate_limit_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_buckets  ENABLE ROW LEVEL SECURITY;

-- Authenticated users read their own bucket state (for "you've been rate
-- limited" UI displays).
CREATE POLICY "rlb_own_select"
  ON public.rate_limit_buckets FOR SELECT
  USING (subject = auth.uid()::text);

-- Policies are publicly readable (their values are not sensitive and
-- clients can display them on the rate-limit-exceeded UI).
CREATE POLICY "rlp_read_all"
  ON public.rate_limit_policies FOR SELECT
  TO authenticated, anon
  USING (true);

COMMENT ON TABLE public.rate_limit_buckets IS
  'DEBT-10 — Per-(bucket, subject) token-bucket state. Callers invoke '
  'consume_token(bucket, subject, cost) RPC which atomically refills + '
  'decrements. Refill rate and capacity per bucket live in rate_limit_policies.';

COMMENT ON FUNCTION public.consume_token IS
  'Atomic token-bucket consume. Returns (allowed, balance, capacity, retry_after_ms). '
  'Unknown or disabled buckets fail-open. Caller MUST honour allowed=false by '
  'returning 429 / showing a rate-limit message; the function itself does NOT '
  'reject the request.';
