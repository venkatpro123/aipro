-- v40.0 precision fix: NUMERIC(5,1) → NUMERIC(5,2) for CI drift columns.
-- NUMERIC(5,1) can only store 1 decimal place (e.g. 52.3).
-- NUMERIC(5,2) handles 2 decimal places (e.g. 52.34) which is needed for
-- precise confidence interval bounds and outcome scores.
-- PostgreSQL ALTER COLUMN TYPE is safe for widening precision on NUMERIC.

ALTER TABLE public.user_prediction_outcomes
  ALTER COLUMN predicted_ci_low     TYPE NUMERIC(5,2),
  ALTER COLUMN predicted_ci_high    TYPE NUMERIC(5,2),
  ALTER COLUMN actual_outcome_score TYPE NUMERIC(5,2);

COMMENT ON COLUMN public.user_prediction_outcomes.predicted_ci_low IS
  'Lower bound of the 80% CI at prediction time (0.00–100.00). '
  'NUMERIC(5,2) handles 2 decimal places for sub-point precision.';

COMMENT ON COLUMN public.user_prediction_outcomes.predicted_ci_high IS
  'Upper bound of the 80% CI at prediction time (0.00–100.00).';

COMMENT ON COLUMN public.user_prediction_outcomes.actual_outcome_score IS
  'User-reported actual score post-outcome (0.00–100.00).';
