-- circuit_breaker_per_source
-- Splits the single 'yahoo-finance' circuit key into per-exchange-region keys
-- so a US Yahoo Finance outage does not incorrectly block international stock
-- data acquisition (BSE, NSE, LSE, SGX).
--
-- Changes:
--   1. Drops the dead 'yahoo-finance' row (never used — all proxy calls used
--      'alphavantage' which conflated US and international tickers).
--   2. Adds 'yahoo-finance-us'    — US-listed tickers (no suffix / .N / .O)
--      Adds 'yahoo-finance-global'— Intl-listed tickers (.NS/.BO/.L/.SI/.AX/…)
--   3. Adds 'nse-india'           — NSE India connector circuit
--   4. Adds 'london-stock-exchange' — LSE connector (future)
--      Adds 'sgx'                 — Singapore Exchange connector (future)
--   5. Updates the CHECK constraint to reflect the new api_name set.
--
-- The 'bse' key already existed in the original migration; the bseConnector
-- now actually wires isCallAllowed/circuitSuccess/circuitFailure against it.

-- ── Step 1: remove the dead 'yahoo-finance' row ─────────────────────────────
DELETE FROM public.api_circuit_status WHERE api_name = 'yahoo-finance';

-- ── Step 2: drop old CHECK constraint ───────────────────────────────────────
ALTER TABLE public.api_circuit_status
  DROP CONSTRAINT IF EXISTS api_circuit_status_api_name_check;

-- ── Step 3: add new CHECK constraint with expanded api_name set ─────────────
ALTER TABLE public.api_circuit_status
  ADD CONSTRAINT api_circuit_status_api_name_check CHECK (
    api_name IN (
      'alphavantage',
      'newsapi',
      'serper',
      'rss2json',
      'yahoo-finance-us',
      'yahoo-finance-global',
      'naukri',
      'sec-edgar',
      'warn-act',
      'bse',
      'nse-india',
      'london-stock-exchange',
      'sgx'
    )
  );

-- ── Step 4: seed new rows in CLOSED state ───────────────────────────────────
INSERT INTO public.api_circuit_status (api_name, state, consecutive_failures)
VALUES
  ('yahoo-finance-us',       'CLOSED', 0),
  ('yahoo-finance-global',   'CLOSED', 0),
  ('nse-india',              'CLOSED', 0),
  ('london-stock-exchange',  'CLOSED', 0),
  ('sgx',                    'CLOSED', 0)
ON CONFLICT (api_name) DO NOTHING;
