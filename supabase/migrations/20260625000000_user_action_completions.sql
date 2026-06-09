-- user_action_completions: cross-device action completion tracking
-- Written by actionCompletionService.ts after every markActionComplete() call.
-- Referenced by get_active_users_for_autopilot RPC in 20260625000001.

CREATE TABLE IF NOT EXISTS user_action_completions (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_id          TEXT        NOT NULL,
  audit_result_id    TEXT,
  completed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  score_at_completion SMALLINT,
  user_feedback      SMALLINT CHECK (user_feedback BETWEEN 1 AND 5),
  follow_up_signal   TEXT,
  UNIQUE (user_id, action_id)
);

CREATE INDEX IF NOT EXISTS idx_uac_user_completed
  ON user_action_completions (user_id, completed_at DESC);

ALTER TABLE user_action_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_completions_all"
  ON user_action_completions FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
