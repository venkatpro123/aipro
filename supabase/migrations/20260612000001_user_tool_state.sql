-- user_tool_state: generic per-user per-tool JSON persistence
-- Serves all 8 tools (compensation, networking, strategy, etc.) without
-- requiring a separate table per tool.

CREATE TABLE IF NOT EXISTS user_tool_state (
  user_id    UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_key   TEXT    NOT NULL,   -- 'compensation' | 'networking' | 'strategy' | ...
  state_json JSONB   NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, tool_key)
);

ALTER TABLE user_tool_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_tool_state_all"
  ON user_tool_state FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Auto-update updated_at on write
CREATE OR REPLACE FUNCTION update_tool_state_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER tool_state_updated_at
  BEFORE UPDATE ON user_tool_state
  FOR EACH ROW EXECUTE FUNCTION update_tool_state_updated_at();
