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
-- action_feedback_aggregates: cohort-level "did this help?" signal.
--
-- PROBLEM: user_action_completions.user_feedback (1-5 stars) was write-only —
-- each user's rating only ever suppressed that action for themselves
-- (actionCompletionService.loadLowRatedActionIds). Nothing learned across
-- users, so an action that consistently fails for everyone kept surfacing to
-- new users at full priority.
--
-- DESIGN: user_action_completions has per-user RLS (auth.uid() = user_id) —
-- a client can never aggregate across other users' rows directly. The
-- refresh function below is SECURITY DEFINER specifically so it CAN read
-- across all users server-side, but it only ever writes an AGGREGATE
-- (never raw per-user feedback) to this public table. No individual rating,
-- timestamp, or user identity is exposed by reading this table.

CREATE TABLE IF NOT EXISTS action_feedback_aggregates (
  action_id         text PRIMARY KEY,
  avg_rating        numeric(3,2),
  total_ratings     int NOT NULL DEFAULT 0,
  low_rating_count  int NOT NULL DEFAULT 0,   -- count of 1-2 star ratings
  low_rating_pct    numeric(5,2),              -- low_rating_count / total_ratings * 100
  completion_count  int NOT NULL DEFAULT 0,    -- total completions regardless of rating
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS action_feedback_aggregates_low_rating_idx
  ON action_feedback_aggregates (low_rating_pct DESC);

ALTER TABLE action_feedback_aggregates ENABLE ROW LEVEL SECURITY;

-- Read is public (cohort aggregates carry no individual user data).
CREATE POLICY "read_action_feedback_aggregates"
  ON action_feedback_aggregates FOR SELECT
  USING (true);

-- Writes are restricted to service_role; the refresh function below is the
-- only normal write path and runs as SECURITY DEFINER regardless of caller.
CREATE POLICY "service_write_action_feedback_aggregates"
  ON action_feedback_aggregates FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.refresh_action_feedback_aggregates()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO action_feedback_aggregates (
    action_id, avg_rating, total_ratings, low_rating_count, low_rating_pct, completion_count, updated_at
  )
  SELECT
    action_id,
    ROUND(AVG(user_feedback) FILTER (WHERE user_feedback IS NOT NULL), 2),
    COUNT(user_feedback) FILTER (WHERE user_feedback IS NOT NULL),
    COUNT(*) FILTER (WHERE user_feedback IS NOT NULL AND user_feedback <= 2),
    ROUND(
      100.0 * COUNT(*) FILTER (WHERE user_feedback IS NOT NULL AND user_feedback <= 2)
      / GREATEST(COUNT(user_feedback) FILTER (WHERE user_feedback IS NOT NULL), 1),
      2
    ),
    COUNT(*),
    now()
  FROM user_action_completions
  GROUP BY action_id
  ON CONFLICT (action_id) DO UPDATE SET
    avg_rating       = EXCLUDED.avg_rating,
    total_ratings    = EXCLUDED.total_ratings,
    low_rating_count = EXCLUDED.low_rating_count,
    low_rating_pct   = EXCLUDED.low_rating_pct,
    completion_count = EXCLUDED.completion_count,
    updated_at       = EXCLUDED.updated_at;
END;
$$;

-- ── pg_cron daily schedule (mirrors the pattern in 20260101000003) ─────────
-- Daily rather than weekly: feedback aggregates are cheap to recompute (a
-- single GROUP BY over one table, no external API calls) and a bad action
-- should stop surfacing to new users within a day of the signal accumulating,
-- not a week.
DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'refresh-action-feedback-aggregates-daily',
      '0 4 * * *',
      'SELECT refresh_action_feedback_aggregates()'
    );
    RAISE NOTICE 'refresh-action-feedback-aggregates-daily schedule registered.';
  ELSE
    RAISE NOTICE 'pg_cron not enabled — skipping. Enable in Dashboard -> Database -> Extensions, then re-run.';
  END IF;
END
$do$;
