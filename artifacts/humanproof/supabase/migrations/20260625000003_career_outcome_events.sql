-- career_outcome_events — user-recorded and auto-detected career milestones
-- Foundation of the Career Graph (Phase 5). Minimum N=10 to surface insights.

CREATE TABLE IF NOT EXISTS career_outcome_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type    TEXT NOT NULL CHECK (event_type IN (
                  'salary_increase', 'promotion', 'job_change', 'layoff_avoided',
                  'skill_certified', 'negotiation_win', 'offer_received', 'offer_declined'
                )),
  event_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  company_name  TEXT,
  role_title    TEXT,
  details       JSONB,
  source        TEXT NOT NULL DEFAULT 'user_reported' CHECK (source IN ('user_reported', 'auto_detected')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: users see and write only their own rows
ALTER TABLE career_outcome_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own career outcomes"
  ON career_outcome_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own career outcomes"
  ON career_outcome_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own career outcomes"
  ON career_outcome_events FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own career outcomes"
  ON career_outcome_events FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS career_outcome_events_user_id_idx
  ON career_outcome_events (user_id, event_date DESC);
