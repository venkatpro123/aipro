-- Migration: career_graph_insights
-- Phase 5 (Rule 9 Career Graph v1): EF-computed weekly aggregates of outcome outcomes
-- by role_key × action_id × outcome_type. Min N=10 to insert; N≥5 to surface in UI.
-- Populated by compute-career-graph-insights Edge Function (runs weekly via pg_cron).

CREATE TABLE IF NOT EXISTS career_graph_insights (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key       TEXT        NOT NULL,
  action_id      TEXT        NOT NULL,
  outcome_type   TEXT        NOT NULL
    CHECK (outcome_type IN ('risk_reduction','salary_increase','job_change','promotion','skill_certified')),
  avg_months_to_outcome  NUMERIC(5,2),
  avg_outcome_value      NUMERIC(8,2),           -- pts (risk_reduction) | pct (salary_increase)
  sample_count           INT         NOT NULL DEFAULT 0,
  confidence             NUMERIC(4,3),            -- 0.000–1.000
  computed_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (role_key, action_id, outcome_type)
);

-- Index for fast lookup by role
CREATE INDEX IF NOT EXISTS idx_career_graph_insights_role
  ON career_graph_insights (role_key, sample_count DESC);

-- RLS: read-only for all authenticated users (aggregate data, no PII)
ALTER TABLE career_graph_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "career_graph_insights_read_all"
  ON career_graph_insights FOR SELECT TO authenticated
  USING (true);

-- Service role can INSERT/UPDATE (called by EF)
CREATE POLICY "career_graph_insights_service_write"
  ON career_graph_insights FOR ALL TO service_role
  USING (true) WITH CHECK (true);

COMMENT ON TABLE career_graph_insights IS
  'Phase 5 Career Graph: aggregated cross-user outcome patterns by role+action. '
  'Min sample_count=10 before EF writes a row. Min 5 to surface in UI. '
  'Populated weekly by compute-career-graph-insights Edge Function.';
