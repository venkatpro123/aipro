-- Phase 9: Proactive Intelligence Amplification
-- career_health_scores: persisted composite career health score history

CREATE TABLE IF NOT EXISTS career_health_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  health_score NUMERIC(5,1) NOT NULL,
  risk_component NUMERIC(5,1),
  action_component NUMERIC(5,1),
  skill_component NUMERIC(5,1),
  financial_component NUMERIC(5,1)
);

CREATE INDEX IF NOT EXISTS idx_career_health_scores_user_time
  ON career_health_scores (user_id, computed_at DESC);

ALTER TABLE career_health_scores ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'career_health_scores' AND policyname = 'user_own_health_scores'
  ) THEN
    CREATE POLICY "user_own_health_scores"
      ON career_health_scores
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- weekly_career_briefs: caching generated briefs (optional, for EF output)
CREATE TABLE IF NOT EXISTS weekly_career_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  week_starting DATE NOT NULL,
  brief_json JSONB NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, week_starting)
);

ALTER TABLE weekly_career_briefs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'weekly_career_briefs' AND policyname = 'user_own_weekly_briefs'
  ) THEN
    CREATE POLICY "user_own_weekly_briefs"
      ON weekly_career_briefs
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- layoff_scores: ensure user_id column exists for timeline queries
-- (table already exists but adding index if missing)
CREATE INDEX IF NOT EXISTS idx_layoff_scores_user_time
  ON layoff_scores (user_id, calculated_at DESC);
