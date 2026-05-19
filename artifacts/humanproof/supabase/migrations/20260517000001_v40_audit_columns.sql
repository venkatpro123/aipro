-- v40.0 audit fix migrations
-- Two schema gaps identified by the complete deep re-audit:
--   1. first_audit_completed_at on user_profiles — needed for cross-device
--      first-audit welcome suppression (replaces localStorage-only approach)
--   2. CI drift detection columns on user_prediction_outcomes — needed for the
--      calibration drift monitor to compute empirical CI coverage

-- ── 1. user_profiles: first-audit tracking ──────────────────────────────────
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS first_audit_completed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.user_profiles.first_audit_completed_at IS
  'Timestamp when the user completed their first audit session. '
  'Used to suppress the FirstAuditWelcome coachmark on subsequent sessions '
  'across devices/browsers (replaces localStorage-only tracking). '
  'NULL means the user has never completed a full audit in an authenticated session.';

-- Partial index: only users who have completed at least one audit
CREATE INDEX IF NOT EXISTS idx_user_profiles_first_audit_at
  ON public.user_profiles (user_id)
  WHERE first_audit_completed_at IS NOT NULL;

-- ── 2. user_prediction_outcomes: CI drift detection ──────────────────────────
-- Adds the three columns needed by empiricalCalibration.getLiveCalibrationStatus()
-- to compute empirical 80% CI coverage and detect model drift.
ALTER TABLE public.user_prediction_outcomes
  ADD COLUMN IF NOT EXISTS predicted_ci_low     NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS predicted_ci_high    NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS actual_outcome_score NUMERIC(5,1);

COMMENT ON COLUMN public.user_prediction_outcomes.predicted_ci_low IS
  'Lower bound of the 80% confidence interval predicted at audit time (0–100 score). '
  'NULL when the audit was run before v40.0 CI drift monitoring was added.';

COMMENT ON COLUMN public.user_prediction_outcomes.predicted_ci_high IS
  'Upper bound of the 80% confidence interval predicted at audit time (0–100 score). '
  'NULL when the audit was run before v40.0 CI drift monitoring was added.';

COMMENT ON COLUMN public.user_prediction_outcomes.actual_outcome_score IS
  'User-reported actual risk score after the outcome was confirmed. '
  'Used with predicted_ci_low/high to compute empirical CI coverage — '
  'the fraction of outcomes where actual_outcome_score ∈ [predicted_ci_low, predicted_ci_high].';

-- Partial index on rows that have all three CI columns populated
-- (used by the drift detection query to efficiently filter qualifying rows)
CREATE INDEX IF NOT EXISTS idx_user_prediction_outcomes_ci_columns
  ON public.user_prediction_outcomes (id)
  WHERE predicted_ci_low IS NOT NULL
    AND predicted_ci_high IS NOT NULL
    AND actual_outcome_score IS NOT NULL;
