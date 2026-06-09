-- career_twin_state: per-user compounding career model
-- One row per user, upserted after every audit + profile save.
-- Feeds careerTwinService.getTwinInfluence() → signalOrchestrator re-ranking.

CREATE TABLE IF NOT EXISTS public.career_twin_state (
  user_id                UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  twin_version           INTEGER     NOT NULL DEFAULT 1,

  -- Skill snapshot (from user_profiles, denormalized for fast twin reads)
  skills_snapshot        JSONB,      -- { selfRatedSkills: string[], targetSkills: string[] }

  -- Goal snapshot (career goals + orchestrator suppression list)
  goals_snapshot         JSONB,      -- { primaryGoal: string, suppressedActionIds: string[], suppressedCategories: string[] }

  -- Decisions log (CareerDecision[] entries for WhatIf context)
  decisions_log          JSONB,      -- CareerDecision[]

  -- Score context at last sync
  score_at_last_update   SMALLINT,
  profile_completeness   SMALLINT,   -- 0–100

  -- Health label for UI display
  twin_health            TEXT        DEFAULT 'sparse'
                         CHECK (twin_health IN ('rich', 'partial', 'sparse')),

  -- Activity tracking for Phase 5 closed loop
  actions_completed_this_week INTEGER NOT NULL DEFAULT 0,
  actions_completed_total      INTEGER NOT NULL DEFAULT 0,

  last_interaction_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.career_twin_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_twin_all"
  ON public.career_twin_state FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_career_twin_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER career_twin_updated_at
  BEFORE UPDATE ON public.career_twin_state
  FOR EACH ROW EXECUTE FUNCTION public.update_career_twin_updated_at();

-- Reset weekly action counter every Monday 00:05 UTC
SELECT cron.schedule(
  'reset-twin-weekly-actions',
  '5 0 * * 1',
  $$
    UPDATE public.career_twin_state
    SET actions_completed_this_week = 0
  $$
);
