-- Phase 4 Migration: Opportunity Radar target companies (Tool 9)
CREATE TABLE IF NOT EXISTS user_target_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  company_name TEXT NOT NULL,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  opportunity_score NUMERIC(4,1),
  UNIQUE(user_id, company_name)
);

ALTER TABLE user_target_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_own_target_companies"
  ON user_target_companies
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
