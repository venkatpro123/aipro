-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260524100000_schema_catchup_fixes.sql
--
-- Purpose: Fix 6 schema gaps discovered by browser testing (2026-05-24):
--
--   1. engine_constant_resolutions — add May 2026 partition (rows inserted
--      before 2026-06-01 had no partition, causing 23514 "no partition found")
--
--   2. user_prediction_outcomes — add predicted_ci_low / predicted_ci_high columns
--      (empiricalCalibration.ts line 267 queries these; table existed without them)
--
--   3. consume_token RPC — fix v_elapsed NUMERIC bug (was receiving TIMESTAMPTZ
--      from last_refilled_at into a NUMERIC variable → 22P02 cast error)
--      NOTE: The migration 20260611000002 has also been patched at source.
--      This idempotent CREATE OR REPLACE re-applies the correct version.
--
--   4. curated_layoff_events — table may be missing (404); create if not exists
--
--   5. swarm_warm_cache — create if not exists (404 in warm-swarm-cache path)
--
--   6. scrape_jobs.source — ensure column exists (should be added by
--      20260523000001 but may not have been applied)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. engine_constant_resolutions: May/Apr 2026 partitions ─────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='engine_constant_resolutions') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                   WHERE table_schema='public' AND table_name='engine_constant_resolutions_2026_05') THEN
      EXECUTE 'CREATE TABLE public.engine_constant_resolutions_2026_05
               PARTITION OF public.engine_constant_resolutions
               FOR VALUES FROM (''2026-05-01'') TO (''2026-06-01'')';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                   WHERE table_schema='public' AND table_name='engine_constant_resolutions_2026_04') THEN
      EXECUTE 'CREATE TABLE public.engine_constant_resolutions_2026_04
               PARTITION OF public.engine_constant_resolutions
               FOR VALUES FROM (''2026-04-01'') TO (''2026-05-01'')';
    END IF;
  END IF;
END $$;

-- ── 2. user_prediction_outcomes: predicted CI columns ────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='user_prediction_outcomes') THEN
    ALTER TABLE public.user_prediction_outcomes
      ADD COLUMN IF NOT EXISTS predicted_ci_low  NUMERIC,
      ADD COLUMN IF NOT EXISTS predicted_ci_high NUMERIC;
  END IF;
END $$;

-- ── 3. consume_token: fix TIMESTAMPTZ-into-NUMERIC bug ───────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='rate_limit_policies') THEN
    EXECUTE $func$
      CREATE OR REPLACE FUNCTION public.consume_token(
        p_bucket_key TEXT,
        p_subject    TEXT,
        p_cost       INTEGER DEFAULT NULL
      )
      RETURNS TABLE (allowed BOOLEAN, balance NUMERIC, capacity INTEGER, retry_after_ms INTEGER)
      LANGUAGE plpgsql SECURITY DEFINER AS $body$
      DECLARE
        v_policy_enabled      BOOLEAN;
        v_policy_capacity     INTEGER;
        v_policy_default_cost INTEGER;
        v_policy_tps          NUMERIC;
        v_now             TIMESTAMPTZ := NOW();
        v_last_refilled   TIMESTAMPTZ;
        v_elapsed         NUMERIC;
        v_refill          NUMERIC;
        v_cost            INTEGER;
        v_balance         NUMERIC;
      BEGIN
        SELECT enabled, capacity, default_cost, tokens_per_second
          INTO v_policy_enabled, v_policy_capacity, v_policy_default_cost, v_policy_tps
          FROM public.rate_limit_policies WHERE bucket_key = p_bucket_key;
        IF NOT FOUND OR NOT v_policy_enabled THEN
          RETURN QUERY SELECT TRUE, NULL::NUMERIC, NULL::INTEGER, 0;
          RETURN;
        END IF;
        v_cost := COALESCE(p_cost, v_policy_default_cost);
        INSERT INTO public.rate_limit_buckets (bucket_key, subject, token_balance, last_refilled_at)
        VALUES (p_bucket_key, p_subject, v_policy_capacity, v_now)
        ON CONFLICT (bucket_key, subject) DO NOTHING;
        PERFORM 1 FROM public.rate_limit_buckets
         WHERE bucket_key = p_bucket_key AND subject = p_subject FOR UPDATE;
        SELECT token_balance, last_refilled_at INTO v_balance, v_last_refilled
          FROM public.rate_limit_buckets
         WHERE bucket_key = p_bucket_key AND subject = p_subject;
        v_elapsed := EXTRACT(EPOCH FROM (v_now - v_last_refilled));
        v_refill  := v_elapsed * v_policy_tps;
        v_balance := LEAST(v_policy_capacity::NUMERIC, v_balance + v_refill);
        IF v_balance >= v_cost THEN
          v_balance := v_balance - v_cost;
          UPDATE public.rate_limit_buckets
             SET token_balance = v_balance, last_refilled_at = v_now,
                 total_consumed = total_consumed + v_cost
           WHERE bucket_key = p_bucket_key AND subject = p_subject;
          RETURN QUERY SELECT TRUE, v_balance, v_policy_capacity, 0;
        ELSE
          UPDATE public.rate_limit_buckets
             SET token_balance = v_balance, last_refilled_at = v_now,
                 total_rejected = total_rejected + 1, last_rejected_at = v_now
           WHERE bucket_key = p_bucket_key AND subject = p_subject;
          RETURN QUERY SELECT FALSE, v_balance, v_policy_capacity,
            CEIL((v_cost - v_balance) / NULLIF(v_policy_tps, 0) * 1000)::INTEGER;
        END IF;
      END;
      $body$
    $func$;
    RAISE NOTICE '[schema_catchup] consume_token function updated.';
  ELSE
    RAISE NOTICE '[schema_catchup] rate_limit_policies not found — skipping consume_token rewrite.';
  END IF;
END $$;

-- ── 4. curated_layoff_events: create if not exists ───────────────────────────
CREATE TABLE IF NOT EXISTS public.curated_layoff_events (
  id              BIGSERIAL PRIMARY KEY,
  company_name    TEXT        NOT NULL,
  event_date      DATE        NOT NULL,
  percent_cut     NUMERIC,
  affected_count  INTEGER,
  source          TEXT        NOT NULL DEFAULT 'manual',
  source_url      TEXT,
  is_confirmed    BOOLEAN     NOT NULL DEFAULT FALSE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_curated_layoff_company
  ON public.curated_layoff_events (lower(company_name), event_date DESC);

ALTER TABLE public.curated_layoff_events ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='curated_layoff_events' AND policyname='curated_layoff_select') THEN
    CREATE POLICY curated_layoff_select ON public.curated_layoff_events FOR SELECT USING (true);
  END IF;
END $$;

-- ── 5. swarm_warm_cache: create if not exists ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.swarm_warm_cache (
  id              BIGSERIAL PRIMARY KEY,
  cache_key       TEXT        NOT NULL UNIQUE,
  payload         JSONB       NOT NULL DEFAULT '{}',
  warmed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ,
  hit_count       INTEGER     NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_swarm_warm_cache_key
  ON public.swarm_warm_cache (cache_key, warmed_at DESC);

ALTER TABLE public.swarm_warm_cache ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='swarm_warm_cache' AND policyname='swarm_cache_select') THEN
    CREATE POLICY swarm_cache_select ON public.swarm_warm_cache FOR SELECT USING (true);
  END IF;
END $$;

-- ── 6. scrape_jobs.source: ensure column exists ──────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='scrape_jobs') THEN
    ALTER TABLE public.scrape_jobs
      ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'cron_refresh'
        CHECK (source IN ('user_triggered', 'cron_refresh', 'background_enrichment'));
    UPDATE public.scrape_jobs
       SET source = 'user_triggered'
     WHERE priority = 'audit_blocking'
       AND source = 'cron_refresh';
  END IF;
END $$;

-- (No changelog insert — schema_migrations_log table does not exist in this project)
