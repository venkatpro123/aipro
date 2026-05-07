-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: 20260101000005_company_discovery_queue.sql
-- Purpose:   Queue for companies searched but not found in company_intelligence.
--            Recreates the table with the correct schema (old version used
--            'name' instead of 'company_name'; table was empty so safe to drop).
-- ═══════════════════════════════════════════════════════════════════════════

-- Drop old version (had 'name' column instead of 'company_name'; always empty)
DROP TABLE IF EXISTS company_discovery_queue;

CREATE TABLE company_discovery_queue (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name    TEXT        NOT NULL,
  industry        TEXT,
  role_searched   TEXT,
  status          TEXT        NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','processing','completed','failed')),
  searched_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at    TIMESTAMPTZ,
  error_message   TEXT
);

CREATE INDEX idx_cdq_status       ON company_discovery_queue (status, searched_at DESC);
CREATE INDEX idx_cdq_company_name ON company_discovery_queue (company_name);

ALTER TABLE company_discovery_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_insert_discovery_queue" ON company_discovery_queue
  FOR INSERT WITH CHECK (true);

CREATE POLICY "service_manage_discovery_queue" ON company_discovery_queue
  FOR ALL USING (auth.role() = 'service_role');
