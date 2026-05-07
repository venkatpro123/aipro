-- Migration: API circuit breaker state table
--
-- Stores the circuit breaker state for each external API:
--   CLOSED   — normal operation, calls allowed
--   OPEN     — 3+ consecutive failures detected; all calls blocked for 5 minutes
--   HALF_OPEN — probe window after OPEN expires; 1 test call allowed
--
-- WHY SUPABASE AND NOT JUST localstorage
-- ────────────────────────────────────────
-- Alpha Vantage, NewsAPI and Serper quotas are shared across ALL users and
-- ALL Edge Function invocations. If the AV daily limit is hit by user A,
-- the circuit should open for user B immediately — without waiting for user
-- B to hit the same 429 themselves. localStorage is per-browser-session;
-- Supabase is the cross-session truth.
--
-- HOW IT'S USED
-- ─────────────
-- Browser clients cache the circuit state in localStorage for read speed
-- (no DB round-trip on the hot path). On state transitions (CLOSED→OPEN,
-- OPEN→HALF_OPEN, HALF_OPEN→CLOSED), the client upserts this table
-- asynchronously. On page load, the client fetches the current state and
-- merges with its local cache (takes the more pessimistic state).
--
-- Edge Functions (proxy-live-signals) read this table directly before
-- calling upstream APIs, so they benefit from circuit state set by browsers.

CREATE TABLE IF NOT EXISTS public.api_circuit_status (
  api_name             TEXT        PRIMARY KEY,  -- 'alphavantage' | 'newsapi' | 'serper'
  state                TEXT        NOT NULL DEFAULT 'CLOSED'
                         CHECK (state IN ('CLOSED', 'OPEN', 'HALF_OPEN')),
  consecutive_failures INTEGER     NOT NULL DEFAULT 0,
  failure_threshold    INTEGER     NOT NULL DEFAULT 3,   -- failures before OPEN
  open_duration_ms     INTEGER     NOT NULL DEFAULT 300000, -- 5 min in ms
  last_failure_at      TIMESTAMPTZ,
  last_success_at      TIMESTAMPTZ,
  opened_at            TIMESTAMPTZ,  -- when circuit last transitioned to OPEN
  probe_allowed_at     TIMESTAMPTZ,  -- when HALF_OPEN probe was permitted
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed with initial CLOSED state for the three target APIs
INSERT INTO public.api_circuit_status (api_name, state, consecutive_failures)
VALUES
  ('alphavantage', 'CLOSED', 0),
  ('newsapi',      'CLOSED', 0),
  ('serper',       'CLOSED', 0)
ON CONFLICT (api_name) DO NOTHING;

-- Timestamp auto-update trigger
CREATE OR REPLACE FUNCTION update_circuit_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER api_circuit_status_updated_at
  BEFORE UPDATE ON public.api_circuit_status
  FOR EACH ROW EXECUTE FUNCTION update_circuit_updated_at();

-- RLS: publicly readable (clients need to read circuit state without auth).
-- Writes are restricted to service_role (Edge Functions + pipeline_upsert_static guard).
ALTER TABLE public.api_circuit_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "api_circuit_status_read_public"
  ON public.api_circuit_status FOR SELECT USING (true);

-- Only service_role can mutate circuit state (browser clients go through
-- the pipeline_upsert_static guard function or a dedicated RPC).
-- This prevents a misbehaving client from manually opening a circuit.

COMMENT ON TABLE public.api_circuit_status IS
  'Circuit breaker state for external APIs. '
  'CLOSED = normal; OPEN = failures blocked for open_duration_ms; '
  'HALF_OPEN = single probe allowed after open_duration_ms expires. '
  'Browsers cache state in localStorage for read speed; transitions are '
  'written here so all sessions and Edge Functions share the same state.';
