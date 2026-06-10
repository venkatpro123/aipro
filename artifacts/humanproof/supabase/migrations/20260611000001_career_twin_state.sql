-- Phase 1 (Career OS): Create career_twin_state table
-- careerTwinService.ts has been complete since v12 but this table was never deployed.
-- audit_score_history (cap 24) + outcome_success_rates added for Phase 1 & 2 respectively.

CREATE TABLE IF NOT EXISTS career_twin_state (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  twin_version              integer DEFAULT 0,
  skills_snapshot           jsonb DEFAULT '{"selfRatedSkills":[],"targetSkills":[]}'::jsonb,
  goals_snapshot            jsonb DEFAULT '{"primaryGoal":null,"suppressedActionIds":[],"suppressedCategories":[]}'::jsonb,
  decisions_log             jsonb DEFAULT '[]'::jsonb,
  score_at_last_update      numeric,
  profile_completeness      integer DEFAULT 0,
  twin_health               text CHECK (twin_health IN ('rich','partial','sparse')) DEFAULT 'sparse',
  actions_completed_this_week integer DEFAULT 0,
  actions_completed_total   integer DEFAULT 0,
  last_interaction_at       timestamptz DEFAULT now(),
  audit_score_history       jsonb DEFAULT '[]'::jsonb,   -- [{date,score,company,role}] capped at 24
  outcome_success_rates     jsonb DEFAULT '{}'::jsonb,   -- {D1:0.7, L1:0.4} per-user rates
  last_outcome_sync         timestamptz,
  UNIQUE(user_id)
);

ALTER TABLE career_twin_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_own_twin" ON career_twin_state
  FOR ALL USING (auth.uid() = user_id);
