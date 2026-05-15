-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260606000001_score_trajectory.sql
-- Purpose:   WS7 — Server-authoritative score history.
--
--            Audit Issue #13: scoreTrajectoryEngine reads from
--            scoreStorage.ts which persists to localStorage. Trajectory
--            signals therefore:
--              * are device-local (switching laptop loses all trajectory)
--              * reset on browser clear / incognito mode
--              * never accumulate enough points to detect a real trend
--                vs input variance
--            The "Score Trajectory: Improving" pill shown in the dashboard
--            is statistically meaningless for almost every user.
--
--            This table stores per-(user, company) audit scores so the
--            trajectory engine can read a stable, device-independent
--            history. Indexed for "last N audits for user X at company Y".
--
--            Privacy: row-level security ensures users only see their own
--            history. service_role bypass for the backtester.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.score_trajectory (
  id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  user_id                UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_canonical_name TEXT         NOT NULL,
  audit_session_id       UUID,

  -- Score snapshot
  score                  SMALLINT     NOT NULL CHECK (score BETWEEN 0 AND 100),
  tier                   TEXT         NOT NULL,           -- LOW / MODERATE / HIGH / CRITICAL
  confidence_pct         SMALLINT     CHECK (confidence_pct BETWEEN 0 AND 100),
  cohort                 TEXT,
  archetype              TEXT,

  -- Engine provenance
  engine_version         TEXT,
  /** Snapshot of input factors that may have changed audit-to-audit. */
  inputs_snapshot        JSONB,

  -- Timing
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_st_user_company_recent
  ON public.score_trajectory (user_id, company_canonical_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_st_user_recent
  ON public.score_trajectory (user_id, created_at DESC);

-- ── RLS ────────────────────────────────────────────────────────────────────────
ALTER TABLE public.score_trajectory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "st_own_rows_select"
  ON public.score_trajectory FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "st_own_rows_insert"
  ON public.score_trajectory FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- No UPDATE / DELETE: history is immutable. Re-running an audit creates a new row.

COMMENT ON TABLE public.score_trajectory IS
  'WS7 — Server-authoritative per-(user, company) score history. Replaces '
  'localStorage-based trajectory storage. Audit pipeline inserts on each run. '
  'Trajectory engine reads the last N rows to detect direction (improving / '
  'stable / worsening). RLS scopes reads to own rows.';

COMMENT ON COLUMN public.score_trajectory.inputs_snapshot IS
  'JSONB capture of input factors (role, department, tenure, performance, '
  'country) that may have changed between audits. Used to filter out '
  'self-induced noise from real trend signal.';
