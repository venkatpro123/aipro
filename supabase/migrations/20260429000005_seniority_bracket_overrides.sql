-- ══════════════════════════════════════════════════════════════════════════════
-- SENIORITY BRACKET OVERRIDE TRACKING
-- Created: 2026-04-29
-- ══════════════════════════════════════════════════════════════════════════════
--
-- WHY THIS TABLE EXISTS
-- ─────────────────────
-- deriveSeniorityBracket() infers seniority from tenure + performance + uniqueness.
-- When users override the derived bracket, they are revealing that the algorithm
-- made a mistake for their profile. Logging these events allows us to detect
-- systematic errors:
--
--   If >20% of users override bracket X, deriveSeniorityBracket() has a
--   systematic error for profiles that land in bracket X.
--
-- The bracket_override_rates view (bottom of this file) surfaces this signal.
--
-- SCHEMA NOTES
-- ────────────
-- session_id: anonymous per-browser identifier (not linked to auth.users).
--   Override analytics are anonymous by design — the goal is algorithm QA,
--   not user surveillance.
-- was_override: FALSE = user confirmed the derived bracket (denominator event).
--   TRUE = user selected a different bracket (numerator event).
--   Both events are recorded so the override RATE can be computed as:
--     override_count / total_count
-- risk_score: the audit score at the time of override. Useful for detecting
--   score-conditional errors (e.g. "derivation is wrong when score > 70").

CREATE TABLE IF NOT EXISTS public.seniority_bracket_overrides (
  id                 BIGSERIAL    PRIMARY KEY,
  session_id         TEXT         NOT NULL DEFAULT 'unknown',
  original_bracket   TEXT         NOT NULL CHECK (original_bracket   IN ('junior','mid','senior','principal')),
  overridden_bracket TEXT         NOT NULL CHECK (overridden_bracket  IN ('junior','mid','senior','principal')),
  was_override       BOOLEAN      NOT NULL DEFAULT FALSE,
  work_type_key      TEXT         NOT NULL DEFAULT 'unknown',
  risk_score         NUMERIC(5,2),
  recorded_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Indexes for the analytics view
CREATE INDEX IF NOT EXISTS idx_sbo_original_bracket  ON public.seniority_bracket_overrides(original_bracket);
CREATE INDEX IF NOT EXISTS idx_sbo_work_type_key     ON public.seniority_bracket_overrides(work_type_key);
CREATE INDEX IF NOT EXISTS idx_sbo_recorded_at       ON public.seniority_bracket_overrides(recorded_at DESC);

-- ── RLS ───────────────────────────────────────────────────────────────────────
-- INSERT: any user (anon or authenticated) can log their own confirmation/override.
-- SELECT: denied for anon/authenticated — analytics are for service_role / admin only.
--   This prevents users from querying whether other sessions confirmed their bracket.

ALTER TABLE public.seniority_bracket_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sbo_insert_any"
  ON public.seniority_bracket_overrides
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "sbo_no_select"
  ON public.seniority_bracket_overrides
  FOR SELECT TO anon, authenticated
  USING (false);

-- ── Override rate view (service_role + admin only) ───────────────────────────
--
-- Usage: SELECT * FROM bracket_override_rates WHERE override_rate_pct > 20;
-- Any row returned indicates a systematic error in deriveSeniorityBracket()
-- for the (original_bracket, work_type_key) combination.
--
-- Example finding: override_rate_pct = 38% for original_bracket='senior',
-- work_type_key='software_engineer' → the 'senior' derivation logic is
-- systematically wrong for software engineers. Inspect what inputs produce
-- 'senior' for that role and adjust the thresholds in deriveSeniorityBracket().

CREATE OR REPLACE VIEW public.bracket_override_rates AS
SELECT
  original_bracket,
  work_type_key,
  COUNT(*)                                                   AS total_events,
  COUNT(*) FILTER (WHERE was_override = true)                AS override_count,
  COUNT(*) FILTER (WHERE was_override = false)               AS confirm_count,
  ROUND(
    COUNT(*) FILTER (WHERE was_override = true)::NUMERIC
    / NULLIF(COUNT(*), 0)::NUMERIC * 100,
    1
  )                                                          AS override_rate_pct,
  -- Most common override direction: which bracket do users move to?
  MODE() WITHIN GROUP (ORDER BY overridden_bracket)
    FILTER (WHERE was_override = true)                       AS most_common_override_target,
  MIN(recorded_at)                                           AS first_seen_at,
  MAX(recorded_at)                                           AS last_seen_at
FROM public.seniority_bracket_overrides
GROUP BY original_bracket, work_type_key
HAVING COUNT(*) >= 5   -- minimum sample threshold to avoid noise
ORDER BY override_rate_pct DESC NULLS LAST;

-- ── Aggregate alert view (>20% threshold) ────────────────────────────────────
-- Quick check: SELECT * FROM bracket_algorithm_alerts;
-- Empty result = no systematic errors detected.

CREATE OR REPLACE VIEW public.bracket_algorithm_alerts AS
SELECT
  original_bracket,
  work_type_key,
  override_count,
  total_events,
  override_rate_pct,
  most_common_override_target,
  '>' || override_rate_pct || '% users override → likely derivation error' AS alert_message
FROM public.bracket_override_rates
WHERE override_rate_pct > 20
  AND override_count >= 3;  -- at least 3 real overrides, not statistical noise

COMMENT ON TABLE  public.seniority_bracket_overrides IS
  'Logs every user confirmation and override of deriveSeniorityBracket(). '
  'was_override=false: user confirmed the derived bracket. '
  'was_override=true: user selected a different bracket. '
  'Use bracket_override_rates view to detect systematic algorithm errors. '
  'Threshold: >20% override rate for a bracket indicates a derivation bug.';

COMMENT ON VIEW public.bracket_override_rates IS
  'Override rate per (original_bracket, work_type_key). '
  'Query: SELECT * FROM bracket_override_rates WHERE override_rate_pct > 20;';

COMMENT ON VIEW public.bracket_algorithm_alerts IS
  'Pre-filtered alert list: brackets with >20% override rate and ≥3 confirmed overrides. '
  'Empty result = no systematic derivation errors detected.';
