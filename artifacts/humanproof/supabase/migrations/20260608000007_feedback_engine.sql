-- Phase 7: Feedback Engine
-- Adds feedback columns to action_completions + creates learning_outcomes table.
-- action_completions may already exist (created outside migrations); use IF NOT EXISTS throughout.

CREATE TABLE IF NOT EXISTS action_completions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users NOT NULL,
  action_id     TEXT NOT NULL,
  action_text   TEXT,
  completed_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, action_id)
);

ALTER TABLE action_completions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'action_completions' AND policyname = 'user_own_action_completions'
  ) THEN
    CREATE POLICY "user_own_action_completions"
      ON action_completions
      USING  (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Feedback columns (idempotent via IF NOT EXISTS)
ALTER TABLE action_completions ADD COLUMN IF NOT EXISTS thumbs_up          BOOLEAN;
ALTER TABLE action_completions ADD COLUMN IF NOT EXISTS outcome_notes       TEXT;
ALTER TABLE action_completions ADD COLUMN IF NOT EXISTS score_before        NUMERIC(5,1);
ALTER TABLE action_completions ADD COLUMN IF NOT EXISTS score_after         NUMERIC(5,1);
ALTER TABLE action_completions ADD COLUMN IF NOT EXISTS measured_risk_reduction NUMERIC(5,1);
ALTER TABLE action_completions ADD COLUMN IF NOT EXISTS feedback_requested_at  TIMESTAMPTZ;
ALTER TABLE action_completions ADD COLUMN IF NOT EXISTS feedback_due_at        TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS action_completions_user_idx
  ON action_completions (user_id, completed_at DESC);

-- Learning outcomes: post-course feedback
CREATE TABLE IF NOT EXISTS learning_outcomes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES auth.users NOT NULL,
  course_id           TEXT NOT NULL,
  course_title        TEXT,
  skill_practiced     BOOLEAN,
  resume_updated      BOOLEAN,
  confidence_improved BOOLEAN,
  recorded_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, course_id)
);

ALTER TABLE learning_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_own_learning_outcomes"
  ON learning_outcomes
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS learning_outcomes_user_idx
  ON learning_outcomes (user_id, recorded_at DESC);
