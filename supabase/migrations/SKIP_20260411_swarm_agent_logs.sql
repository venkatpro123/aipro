-- ═══════════════════════════════════════════════════════════════════════
-- Swarm Intelligence Layer — Database Migration
-- Table: swarm_agent_logs
-- Purpose: Cross-user agent signal logging for future model retraining
-- Apply via: Supabase Dashboard → SQL Editor → Run
-- ═══════════════════════════════════════════════════════════════════════

-- Create the swarm agent logs table
CREATE TABLE IF NOT EXISTS swarm_agent_logs (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name   TEXT        NOT NULL,
  role_title     TEXT        NOT NULL,
  industry       TEXT,
  department     TEXT,
  agent_id       TEXT        NOT NULL,
  category       TEXT        NOT NULL CHECK (category IN ('market', 'company', 'ai', 'external')),
  signal_value   FLOAT       NOT NULL CHECK (signal_value >= 0 AND signal_value <= 1),
  confidence     FLOAT       NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  source_type    TEXT        NOT NULL CHECK (source_type IN ('live-api', 'heuristic')),
  age_in_days    INTEGER     DEFAULT 1,
  swarm_score    FLOAT,      -- Final swarm risk score (0–100) for this prediction
  ensemble_score FLOAT,      -- Final ensemble score for tracing impact
  outcome        FLOAT,      -- NULL until user provides feedback (0–100 actual risk)
  metadata       JSONB       DEFAULT '{}',
  created_at     TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for efficient querying by company + role + agent
CREATE INDEX IF NOT EXISTS idx_swarm_logs_company_role
  ON swarm_agent_logs (company_name, role_title);

CREATE INDEX IF NOT EXISTS idx_swarm_logs_agent_id
  ON swarm_agent_logs (agent_id);

CREATE INDEX IF NOT EXISTS idx_swarm_logs_created_at
  ON swarm_agent_logs (created_at DESC);

-- Index for outcome analysis (finding predictions with known outcomes)
CREATE INDEX IF NOT EXISTS idx_swarm_logs_outcome
  ON swarm_agent_logs (outcome)
  WHERE outcome IS NOT NULL;

-- ── Row Level Security ────────────────────────────────────────────────────────
-- Allow anonymous reads (for cross-device benchmark comparison)
-- Only allow inserts (no updates/deletes from client)
ALTER TABLE swarm_agent_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon select on swarm_agent_logs"
  ON swarm_agent_logs FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon insert on swarm_agent_logs"
  ON swarm_agent_logs FOR INSERT
  TO anon
  WITH CHECK (true);

-- Prevent client-side modifications of existing records
-- (outcomes are set by admin/feedback system only)

-- ── View: Agent performance summary ──────────────────────────────────────────
CREATE OR REPLACE VIEW swarm_agent_performance AS
SELECT
  agent_id,
  category,
  COUNT(*)                                          AS total_runs,
  AVG(signal_value)                                 AS avg_signal,
  AVG(confidence)                                   AS avg_confidence,
  COUNT(*) FILTER (WHERE source_type = 'live-api')  AS live_api_runs,
  AVG(ABS(swarm_score/100 - outcome/100))
    FILTER (WHERE outcome IS NOT NULL)              AS avg_prediction_error,
  COUNT(*) FILTER (WHERE outcome IS NOT NULL)       AS outcomes_recorded,
  MAX(created_at)                                   AS last_run_at
FROM swarm_agent_logs
GROUP BY agent_id, category
ORDER BY avg_prediction_error ASC NULLS LAST;

-- ── Cleanup: Auto-purge raw logs older than 90 days (optional, run as scheduled job) ──
-- DELETE FROM swarm_agent_logs WHERE created_at < NOW() - INTERVAL '90 days';

COMMENT ON TABLE swarm_agent_logs IS
  'Swarm Intelligence Layer — per-agent signal log. Powers cross-user learning and agent calibration.';

COMMENT ON COLUMN swarm_agent_logs.outcome IS
  'Actual layoff risk that materialized (0–100). Populated by admin feedback loop. NULL = not yet verified.';
