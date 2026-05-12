-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260514000002_user_prediction_outcomes.sql
-- Purpose:   Audit fix C-4 — schedule-outcome-prompts Edge Function referenced
--            this table (20260507000001_user_prediction_outcomes.sql) but that
--            migration never existed in the repo. Every call to the edge function
--            returned HTTP 500 "relation does not exist", breaking the 30/90/180-
--            day outcome feedback loop entirely.
--
-- This migration creates the table, RLS policies, and indexes that the edge
-- function expects. Schema is derived from schedule-outcome-prompts/index.ts
-- lines 70-74 (SELECT columns) and v15 intelligence upgrade docs.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.user_prediction_outcomes (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- The audit session this prediction came from (nullable — older audits may not have one)
  audit_session_id     UUID,

  -- What was predicted
  company_name         TEXT        NOT NULL,
  role_title           TEXT,
  predicted_risk_tier  TEXT        NOT NULL
    CHECK (predicted_risk_tier IN ('Very low risk','Low risk','Moderate risk','Elevated risk','High risk')),
  predicted_score      SMALLINT    CHECK (predicted_score BETWEEN 0 AND 100),

  -- When the audit was run
  audit_date           DATE        NOT NULL DEFAULT CURRENT_DATE,

  -- Outcome fields — populated when the user confirms what actually happened
  -- at the 30/90/180-day prompt milestone.
  outcome_reported     TEXT
    CHECK (outcome_reported IN (
      'still_employed',       -- no change
      'role_changed',         -- moved to a different role at same company
      'left_voluntarily',     -- resigned / accepted offer
      'laid_off',             -- confirmed layoff
      'company_closed',       -- company shut down
      'false_alarm'           -- no risk materialised, prediction was wrong
    )),
  outcome_date         DATE,       -- when the outcome actually occurred
  outcome_notes        TEXT,       -- free-text from the user (optional)

  -- Milestone tracking — which prompt triggered this outcome record.
  -- NULL until the user responds; set to the milestone days (30/90/180) when
  -- the prompt was surfaced.
  prompt_milestone     SMALLINT    CHECK (prompt_milestone IN (30, 90, 180)),
  prompted_at          TIMESTAMPTZ,

  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ────────────────────────────────────────────────────────────────────
-- Primary query pattern: schedule-outcome-prompts fetches unconfirmed rows for
-- the current user, ordered by audit_date DESC (limit 50).
CREATE INDEX IF NOT EXISTS idx_upo_user_unconfirmed
  ON public.user_prediction_outcomes (user_id, audit_date DESC)
  WHERE outcome_reported IS NULL;

-- Secondary: backtester joins on company_name + predicted_score to compute accuracy.
CREATE INDEX IF NOT EXISTS idx_upo_company_name
  ON public.user_prediction_outcomes (lower(company_name));

-- ── Auto-update trigger ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_upo_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_upo_updated_at
  BEFORE UPDATE ON public.user_prediction_outcomes
  FOR EACH ROW EXECUTE FUNCTION public.update_upo_updated_at();

-- ── RLS ────────────────────────────────────────────────────────────────────────
ALTER TABLE public.user_prediction_outcomes ENABLE ROW LEVEL SECURITY;

-- Users can only see and modify their own prediction rows.
CREATE POLICY "upo_own_rows_select"
  ON public.user_prediction_outcomes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "upo_own_rows_insert"
  ON public.user_prediction_outcomes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "upo_own_rows_update"
  ON public.user_prediction_outcomes FOR UPDATE
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Hard delete is intentionally blocked — use outcome_reported='false_alarm' to
-- invalidate. This preserves the calibration dataset.
CREATE POLICY "upo_no_delete"
  ON public.user_prediction_outcomes FOR DELETE
  USING (false);

-- service_role bypass: calibration pipeline reads all rows to compute accuracy metrics.
-- (service_role bypasses RLS by default — no explicit grant needed.)

COMMENT ON TABLE public.user_prediction_outcomes IS
  'Stores user predictions (audit outputs) and their real-world outcomes. '
  'Queried by schedule-outcome-prompts Edge Function at 30/90/180-day milestones '
  'to surface "what actually happened?" prompts. Outcome data feeds the '
  'calibrationBacktester to improve model accuracy over time. '
  'Created by audit fix C-4 — this migration was referenced but never existed.';

COMMENT ON COLUMN public.user_prediction_outcomes.outcome_reported IS
  'NULL until the user responds to an outcome prompt. Values: still_employed, '
  'role_changed, left_voluntarily, laid_off, company_closed, false_alarm.';

COMMENT ON COLUMN public.user_prediction_outcomes.prompt_milestone IS
  'Milestone (30/90/180 days) at which the outcome prompt was surfaced. '
  'NULL means the row was created but not yet prompted.';
