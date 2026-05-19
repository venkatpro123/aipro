-- api_circuit_status
-- Persists circuit breaker state across sessions so User B inherits User A's
-- OPEN circuit on next page load (syncCircuitStateFromSupabase merges pessimistically).
--
-- Read path: localStorage (zero latency, populated at startup from this table)
-- Write path: fire-and-forget upsert on every state transition
--
-- The table is append-light: at most 9 rows (one per tracked API). Each
-- transition overwrites via ON CONFLICT DO UPDATE — no unbounded growth.

CREATE TABLE IF NOT EXISTS public.api_circuit_status (
  api_name             TEXT        NOT NULL,
  state                TEXT        NOT NULL DEFAULT 'CLOSED'
                         CHECK (state IN ('CLOSED', 'OPEN', 'HALF_OPEN')),
  consecutive_failures INTEGER     NOT NULL DEFAULT 0,
  last_failure_at      TIMESTAMPTZ,
  last_success_at      TIMESTAMPTZ,
  opened_at            TIMESTAMPTZ,
  probe_allowed_at     TIMESTAMPTZ,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT api_circuit_status_pkey PRIMARY KEY (api_name),
  CONSTRAINT api_circuit_status_api_name_check CHECK (
    api_name IN (
      'alphavantage', 'newsapi', 'serper',
      'rss2json', 'yahoo-finance', 'naukri',
      'sec-edgar', 'warn-act', 'bse'
    )
  )
);

-- Seed closed state for all 9 APIs so syncCircuitStateFromSupabase
-- returns rows immediately on first page load (avoids NULL merge).
INSERT INTO public.api_circuit_status (api_name, state, consecutive_failures)
VALUES
  ('alphavantage',  'CLOSED', 0),
  ('newsapi',       'CLOSED', 0),
  ('serper',        'CLOSED', 0),
  ('rss2json',      'CLOSED', 0),
  ('yahoo-finance', 'CLOSED', 0),
  ('naukri',        'CLOSED', 0),
  ('sec-edgar',     'CLOSED', 0),
  ('warn-act',      'CLOSED', 0),
  ('bse',           'CLOSED', 0)
ON CONFLICT (api_name) DO NOTHING;

-- Trigger: keep updated_at fresh on every upsert
CREATE OR REPLACE FUNCTION public.set_api_circuit_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_api_circuit_updated_at ON public.api_circuit_status;
CREATE TRIGGER trg_api_circuit_updated_at
  BEFORE INSERT OR UPDATE ON public.api_circuit_status
  FOR EACH ROW EXECUTE FUNCTION public.set_api_circuit_updated_at();

-- RLS: authenticated users may read; only service-role may write
-- (client upserts are allowed only from the anon/authenticated role because
-- the circuit breaker writes fire-and-forget from the browser).
ALTER TABLE public.api_circuit_status ENABLE ROW LEVEL SECURITY;

-- Read: all authenticated users can read circuit state
CREATE POLICY "circuit_read_authenticated"
  ON public.api_circuit_status
  FOR SELECT
  TO authenticated
  USING (true);

-- Read: anon users can also read (needed for unauthenticated page loads)
CREATE POLICY "circuit_read_anon"
  ON public.api_circuit_status
  FOR SELECT
  TO anon
  USING (true);

-- Write: authenticated users write their own circuit trips
CREATE POLICY "circuit_write_authenticated"
  ON public.api_circuit_status
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "circuit_update_authenticated"
  ON public.api_circuit_status
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Write: anon users can also trip the circuit (pre-login page loads)
CREATE POLICY "circuit_write_anon"
  ON public.api_circuit_status
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "circuit_update_anon"
  ON public.api_circuit_status
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Index for fast per-api lookup (primary key already covers this, but
-- explicit index makes the query planner's choice visible in EXPLAIN).
CREATE INDEX IF NOT EXISTS idx_api_circuit_status_api_name
  ON public.api_circuit_status (api_name);
