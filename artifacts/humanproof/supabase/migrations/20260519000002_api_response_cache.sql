-- api_response_cache: cross-user shared API response cache.
--
-- PURPOSE
-- -------
-- When User A audits TCS and triggers a live SEC EDGAR fetch, the result is
-- written here. When User B audits TCS 10 minutes later, they receive the
-- cached response instead of making a second EDGAR call — protecting shared
-- free-tier quotas (100/day NewsAPI, 10 req/sec EDGAR, rss2json 100/day).
--
-- TTL is enforced by the `expires_at` column. Reads check `expires_at > NOW()`.
-- Writes upsert on (api_name, cache_key) — the same company/query pair.
--
-- The `data_age_seconds` computed column (used by the UI for freshness labels)
-- is derived at read time from `fetched_at`, not stored.
--
-- RLS policy: anon + authenticated users can SELECT (read) non-expired rows
-- and INSERT/UPDATE (write) — any user can prime the cache for all others.
-- DELETE is restricted to service_role (only TTL expiry / admin clears).

CREATE TABLE IF NOT EXISTS api_response_cache (
  id            BIGSERIAL PRIMARY KEY,
  -- The logical API name (matches CircuitApiName union type).
  api_name      TEXT NOT NULL
                  CHECK (api_name IN (
                    'alphavantage', 'newsapi', 'serper',
                    'rss2json', 'yahoo-finance', 'naukri',
                    'sec-edgar', 'warn-act', 'bse'
                  )),
  -- Caller-defined key: company name, ticker, or query string.
  -- Normalized to lowercase before write/read to prevent duplicate entries
  -- for "TCS" vs "tcs" vs "Tata Consultancy Services".
  cache_key     TEXT NOT NULL,
  -- The serialized API response payload (JSONB for indexed access).
  payload       JSONB NOT NULL,
  -- TTL boundary — checked on every read. Row is stale when NOW() > expires_at.
  expires_at    TIMESTAMPTZ NOT NULL,
  -- When the live API call that populated this row was made.
  fetched_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Which user session wrote this row (for SLO / abuse tracing only — not
  -- surfaced in the UI). auth.uid() is null for anon writes; that's fine.
  written_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  UNIQUE (api_name, cache_key)
);

-- Index for the read path: given (api_name, cache_key), check expiry fast.
CREATE INDEX IF NOT EXISTS api_response_cache_lookup_idx
  ON api_response_cache (api_name, cache_key, expires_at);

-- Index for the cleanup query (delete all expired rows — run by a cron job
-- or the admin dashboard, not by the client).
CREATE INDEX IF NOT EXISTS api_response_cache_expiry_idx
  ON api_response_cache (expires_at);

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE api_response_cache ENABLE ROW LEVEL SECURITY;

-- Any authenticated or anonymous user can read non-expired cached rows.
CREATE POLICY "api_response_cache_select"
  ON api_response_cache FOR SELECT
  USING (expires_at > NOW());

-- Any user can write (insert or update) cache entries — primes the cache for
-- all other users. This is intentionally permissive: the payload is an API
-- response, not user data, so cross-user reads are safe.
CREATE POLICY "api_response_cache_insert"
  ON api_response_cache FOR INSERT
  WITH CHECK (true);

CREATE POLICY "api_response_cache_update"
  ON api_response_cache FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Only the service_role (background jobs, admin) can delete rows.
-- Clients let rows expire naturally (read path checks expires_at).
CREATE POLICY "api_response_cache_delete"
  ON api_response_cache FOR DELETE
  USING (auth.role() = 'service_role');

-- ── Convenience function ──────────────────────────────────────────────────────
-- upsert_api_response_cache(api_name, cache_key, payload, ttl_seconds)
-- Normalizes cache_key to lowercase; upserts on conflict.
-- Called by the client-side apiResponseCache service as a single RPC
-- to avoid the round-trip overhead of a SELECT then INSERT/UPDATE.
CREATE OR REPLACE FUNCTION upsert_api_response_cache(
  p_api_name    TEXT,
  p_cache_key   TEXT,
  p_payload     JSONB,
  p_ttl_seconds INTEGER
) RETURNS VOID
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO api_response_cache (api_name, cache_key, payload, expires_at, fetched_at, written_by)
  VALUES (
    p_api_name,
    LOWER(p_cache_key),
    p_payload,
    NOW() + (p_ttl_seconds || ' seconds')::INTERVAL,
    NOW(),
    auth.uid()
  )
  ON CONFLICT (api_name, cache_key) DO UPDATE
    SET payload    = EXCLUDED.payload,
        expires_at = EXCLUDED.expires_at,
        fetched_at = EXCLUDED.fetched_at,
        written_by = EXCLUDED.written_by;
END;
$$;
