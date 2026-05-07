-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: 20260101000009_api_keys_usage.sql
-- Purpose:   API key management + rate-limit usage tracking.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS api_keys (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash          TEXT        NOT NULL UNIQUE,
  organization_name TEXT        NOT NULL,
  tier              TEXT        NOT NULL DEFAULT 'standard'
                    CHECK (tier IN ('standard','team','enterprise')),
  daily_limit       INTEGER     NOT NULL DEFAULT 1000,
  is_active         BOOLEAN     NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ak_key_hash  ON api_keys (key_hash);
CREATE INDEX IF NOT EXISTS idx_ak_is_active ON api_keys (is_active) WHERE is_active = true;

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='api_keys' AND policyname='service_manage_api_keys') THEN
    EXECUTE 'CREATE POLICY "service_manage_api_keys" ON api_keys FOR ALL USING (auth.role() = ''service_role'')';
  END IF;
END
$do$;

-- ── api_usage ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_usage (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id        UUID    REFERENCES api_keys(id) ON DELETE CASCADE,
  date          DATE    NOT NULL,
  endpoint      TEXT    NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  UNIQUE (key_id, date, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_au_key_date ON api_usage (key_id, date DESC);

ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='api_usage' AND policyname='service_manage_api_usage') THEN
    EXECUTE 'CREATE POLICY "service_manage_api_usage" ON api_usage FOR ALL USING (auth.role() = ''service_role'')';
  END IF;
END
$do$;
