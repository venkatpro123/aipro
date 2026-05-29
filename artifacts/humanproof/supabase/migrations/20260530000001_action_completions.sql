-- Wave 1.3: User action completion tracking
-- Enables cross-device persistence of PhaseProgressSystem state.
-- localStorage remains the optimistic layer; this table is the source of truth.

CREATE TABLE IF NOT EXISTS user_action_completions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users NOT NULL,
  action_id       text NOT NULL,
  audit_result_id text,                         -- optional: tie to a specific audit
  completed_at    timestamptz DEFAULT now(),
  score_at_completion int,                      -- score at time of completion (telemetry)
  user_feedback   int CHECK (user_feedback BETWEEN 1 AND 5), -- "Did this help?"
  follow_up_signal text,                        -- free-text outcome signal
  UNIQUE (user_id, action_id)                   -- one completion record per action per user
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS user_action_completions_user_idx
  ON user_action_completions (user_id);

CREATE INDEX IF NOT EXISTS user_action_completions_action_idx
  ON user_action_completions (action_id);

-- RLS: Users can only read/write their own completions
ALTER TABLE user_action_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own completions"
  ON user_action_completions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can select own completions"
  ON user_action_completions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own completions"
  ON user_action_completions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own completions"
  ON user_action_completions FOR DELETE
  USING (auth.uid() = user_id);
