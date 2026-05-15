-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260619000001_breaker_state.sql
-- Purpose:   WS13 — server-side circuit breaker state shared across
--            edge function invocations.
--
--            apiCircuitBreaker.ts on the browser keeps in-process state.
--            That's fine for a single tab. It's NOT fine for edge
--            functions — every invocation is a cold container with no
--            shared memory, so a Glassdoor outage that opens the
--            breaker in one invocation has no effect on the next.
--
--            This table is the shared state. The Deno helper
--            _shared/fetchWithBreaker.ts reads + updates it on every
--            call. State transitions follow the standard CLOSED →
--            OPEN → HALF_OPEN → CLOSED cycle.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.breaker_state (
  -- Identifier for the breaker. One row per (host, capability). Examples:
  -- 'glassdoor.scrape', 'yahoo-finance.quote', 'openrouter.chat'.
  breaker_key      TEXT         PRIMARY KEY,
  -- State machine.
  state            TEXT         NOT NULL DEFAULT 'CLOSED'
    CHECK (state IN ('CLOSED', 'OPEN', 'HALF_OPEN')),
  -- Rolling failure count in the current window.
  consecutive_failures INTEGER  NOT NULL DEFAULT 0,
  -- When the breaker opened. Used to compute "open for X seconds" and
  -- when to transition to HALF_OPEN.
  opened_at        TIMESTAMPTZ,
  -- The probe attempted in HALF_OPEN. Updated when the probe runs.
  probed_at        TIMESTAMPTZ,
  -- Audit / debugging.
  last_failure_at  TIMESTAMPTZ,
  last_failure_kind TEXT,
  -- Tuning. WS9 may version these per-host via engine_calibration_constants
  -- but the breaker reads from this column for hot-path performance.
  failure_threshold     INTEGER NOT NULL DEFAULT 5,
  open_duration_seconds INTEGER NOT NULL DEFAULT 60,
  -- Audit
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.breaker_state ENABLE ROW LEVEL SECURITY;
-- service_role only. The breaker state is operational; no user reads.

-- ── Seed the registry ──────────────────────────────────────────────────────
-- One row per known external dependency. Adding a new dep = insert here.
INSERT INTO public.breaker_state (breaker_key, failure_threshold, open_duration_seconds) VALUES
  ('alphavantage.quote',     5, 60),
  ('yahoo-finance.quote',    8, 60),
  ('yahoo-finance.search',   8, 60),
  ('newsapi.search',         5, 120),
  ('google-news.rss',        8, 60),
  ('bing-news.rss',          8, 60),
  ('serper.search',          5, 120),
  ('openrouter.chat',        3, 90),
  ('glassdoor.scrape',       3, 300),    -- anti-bot trips fast; recovery is long
  ('linkedin.scrape',        3, 300),
  ('wikipedia.fetch',        8, 60),
  ('naukri.search',          5, 120),
  ('indeed.search',          5, 120),
  ('github.search',          8, 60),
  ('sec-edgar.fetch',        5, 60),
  ('warn.fetch',             5, 60)
ON CONFLICT (breaker_key) DO NOTHING;

-- ── Atomic transition function ─────────────────────────────────────────────
-- The edge-function helper calls this rather than UPDATE-ing directly so
-- the OPEN-after-N-failures rule is applied atomically. Returns the new
-- state so the caller can decide whether to short-circuit.
CREATE OR REPLACE FUNCTION public.breaker_record_outcome(
  p_breaker_key   TEXT,
  p_succeeded     BOOLEAN,
  p_failure_kind  TEXT DEFAULT NULL
)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row public.breaker_state%ROWTYPE;
  v_open_seconds INTEGER;
BEGIN
  SELECT * INTO v_row FROM public.breaker_state WHERE breaker_key = p_breaker_key FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.breaker_state (breaker_key) VALUES (p_breaker_key)
      RETURNING * INTO v_row;
  END IF;

  IF p_succeeded THEN
    UPDATE public.breaker_state
       SET state = 'CLOSED',
           consecutive_failures = 0,
           opened_at = NULL,
           probed_at = NULL,
           updated_at = NOW()
     WHERE breaker_key = p_breaker_key;
    RETURN 'CLOSED';
  END IF;

  -- Failure path
  IF v_row.consecutive_failures + 1 >= v_row.failure_threshold THEN
    UPDATE public.breaker_state
       SET state = 'OPEN',
           consecutive_failures = v_row.consecutive_failures + 1,
           opened_at = COALESCE(v_row.opened_at, NOW()),
           last_failure_at = NOW(),
           last_failure_kind = COALESCE(p_failure_kind, 'unknown'),
           updated_at = NOW()
     WHERE breaker_key = p_breaker_key;
    RETURN 'OPEN';
  END IF;

  UPDATE public.breaker_state
     SET consecutive_failures = v_row.consecutive_failures + 1,
         last_failure_at = NOW(),
         last_failure_kind = COALESCE(p_failure_kind, 'unknown'),
         updated_at = NOW()
   WHERE breaker_key = p_breaker_key;
  RETURN v_row.state;
END;
$$;

-- Probe-permission helper for HALF_OPEN. Returns TRUE if the caller is
-- allowed to attempt a probe (the breaker has been open long enough);
-- updates probed_at if so.
CREATE OR REPLACE FUNCTION public.breaker_may_probe(p_breaker_key TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row public.breaker_state%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.breaker_state WHERE breaker_key = p_breaker_key FOR UPDATE;
  IF NOT FOUND THEN RETURN TRUE; END IF;
  IF v_row.state = 'CLOSED' THEN RETURN TRUE; END IF;
  IF v_row.state = 'OPEN' AND v_row.opened_at IS NOT NULL
     AND v_row.opened_at < NOW() - (v_row.open_duration_seconds || ' seconds')::INTERVAL THEN
    UPDATE public.breaker_state
       SET state = 'HALF_OPEN', probed_at = NOW(), updated_at = NOW()
     WHERE breaker_key = p_breaker_key;
    RETURN TRUE;
  END IF;
  -- HALF_OPEN with a recent probe → only one probe at a time
  IF v_row.state = 'HALF_OPEN' AND v_row.probed_at IS NOT NULL
     AND v_row.probed_at > NOW() - INTERVAL '10 seconds' THEN
    RETURN FALSE;
  END IF;
  RETURN FALSE;
END;
$$;

COMMENT ON TABLE public.breaker_state IS
  'WS13 — server-side circuit breaker state shared across edge function '
  'invocations. _shared/fetchWithBreaker.ts reads + updates via '
  'breaker_record_outcome() and breaker_may_probe(). One row per (host, '
  'capability) pair. State transitions follow the standard CLOSED → OPEN '
  '→ HALF_OPEN → CLOSED cycle.';
