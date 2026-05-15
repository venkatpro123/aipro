-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260607000001_audit_coalesce_runs.sql
-- Purpose:   WS6 — Request-coalescing state table for the audit-coalesce
--            edge function.
--
--            Companion to supabase/functions/audit-coalesce/index.ts. The
--            edge function performs leader election via pg_try_advisory_lock;
--            the leader records a pending row here so concurrent followers
--            can find each other and either subscribe to the leader's
--            broadcast or escalate when the leader becomes stale.
--
--            Each row is keyed on a deterministic SHA-256 fingerprint over
--            (canonical_company, role, department, country) — same
--            fingerprint as audit_shadow_comparison, so the two tables can
--            be joined for analytics ("did coalescing prevent N stampedes
--            on this audit?").
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.audit_coalesce_runs (
  fingerprint           TEXT         PRIMARY KEY,

  -- Identity
  company_canonical     TEXT         NOT NULL,
  role_title            TEXT,
  department            TEXT,
  country               TEXT,

  -- State
  status                TEXT         NOT NULL
    CHECK (status IN ('leader_pending', 'completed', 'failed', 'expired')),
  expires_at            TIMESTAMPTZ  NOT NULL,
  payload               JSONB,                  -- the final HybridResult (when completed)

  -- Followers (for analytics; not used at runtime — broadcast handles fan-out)
  follower_count        INTEGER      NOT NULL DEFAULT 0,

  -- Audit
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  completed_at          TIMESTAMPTZ,
  failed_at             TIMESTAMPTZ,
  failure_reason        TEXT
);

CREATE INDEX IF NOT EXISTS idx_acr_status_recent
  ON public.audit_coalesce_runs (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_acr_expires
  ON public.audit_coalesce_runs (expires_at)
  WHERE status = 'leader_pending';

-- ── RLS ────────────────────────────────────────────────────────────────────────
ALTER TABLE public.audit_coalesce_runs ENABLE ROW LEVEL SECURITY;

-- All authenticated users can READ rows (followers must see the leader's
-- state). The data is the same audit result the user is about to compute
-- locally anyway — no privacy concern.
CREATE POLICY "acr_read_all"
  ON public.audit_coalesce_runs FOR SELECT
  TO authenticated, anon
  USING (true);

-- service_role writes only (edge function uses service_role for upsert).

-- ── Advisory lock helpers ──────────────────────────────────────────────────────
-- Expose pg_try_advisory_lock and pg_advisory_unlock as callable RPCs so the
-- edge function (which talks via PostgREST, not direct connection) can
-- request the lock. Both functions accept two int4 keys and return boolean.
CREATE OR REPLACE FUNCTION public.pg_try_advisory_lock(key1 INTEGER, key2 INTEGER)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT pg_try_advisory_lock(key1, key2);
$$;

CREATE OR REPLACE FUNCTION public.pg_advisory_unlock(key1 INTEGER, key2 INTEGER)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT pg_advisory_unlock(key1, key2);
$$;

-- Grant execute to authenticated + service_role. Anon callers should not
-- acquire locks (anon audits run without coalescing).
REVOKE ALL ON FUNCTION public.pg_try_advisory_lock(INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pg_try_advisory_lock(INTEGER, INTEGER) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.pg_advisory_unlock(INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pg_advisory_unlock(INTEGER, INTEGER) TO authenticated, service_role;

-- ── Janitor: expire stale leaders ──────────────────────────────────────────────
-- Periodically promote leader_pending rows past expires_at to status='expired'
-- so followers correctly escalate on next attempt. Runs via pg_cron (registered
-- in a follow-up migration); for now expose as a callable function.
CREATE OR REPLACE FUNCTION public.expire_stale_audit_leaders()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  n INTEGER;
BEGIN
  UPDATE public.audit_coalesce_runs
  SET status = 'expired',
      failure_reason = 'leader timeout (expires_at exceeded)'
  WHERE status = 'leader_pending'
    AND expires_at < NOW();
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

COMMENT ON TABLE public.audit_coalesce_runs IS
  'WS6 — Request-coalescing state for concurrent same-company audits. Each '
  'row represents one fingerprinted audit window. The leader writes; '
  'followers read this table and the broadcast channel for the result. '
  'Stale leaders are expired via the expire_stale_audit_leaders function.';

COMMENT ON FUNCTION public.pg_try_advisory_lock(INTEGER, INTEGER) IS
  'WS6 — RPC wrapper around pg_try_advisory_lock. Called by the audit-coalesce '
  'edge function for leader election. Returns true when lock acquired, '
  'false when another caller already holds it.';
