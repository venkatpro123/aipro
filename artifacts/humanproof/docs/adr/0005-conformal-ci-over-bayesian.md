# 0005 — Conformal prediction replaces heuristic Bayesian CI

- **Status:** accepted
- **Date:** 2026-06-04
- **Deciders:** Platform team

## Context

The legacy `empiricalCalibration.ts::computeBayesianCI` produced
"confidence intervals" by widening a margin based on data quality
heuristics. The intervals had no measured coverage property — a "90%
CI" did not correspond to any historical 90% hit rate. The platform
presented these intervals to users as if they were calibrated.

A confidence interval whose nominal coverage diverges from its
empirical coverage is worse than no interval at all: it gives users a
false sense of precision.

## Decision

We will compute confidence intervals using split-conformal prediction
backed by real outcomes from `user_prediction_outcomes`. The
predictor computes nonconformity scores per cohort over a rolling
60-day window and produces an interval whose nominal coverage is
validated weekly by the `coverage_audit` job. When measured coverage
diverges from nominal by more than 10 percentage points, an alert
fires; sustained divergence holds the next calibration version in
`pending`.

The old `deriveDataQualityTier` survives as `_inputDataQuality` for
the UI freshness panel ("how stale is the source data?") but is no
longer the source of the confidence number.

## Alternatives considered

- **Keep the heuristic CI but calibrate the width** — rejected. There
  is no width function that compensates for cohort-shift; conformal
  prediction handles cohort-shift natively via cohort-stratified
  nonconformity.
- **Full Bayesian inference with cohort hyperpriors** — rejected for
  now. The team does not have the MCMC tooling, and we do not have
  enough outcomes per cohort to make priors load-bearing. Conformal
  needs only ranked nonconformity scores.
- **Quantile regression** — rejected. Useful adjunct, but the
  marginal-coverage guarantee of conformal is the property we need
  for "90% means 90%".

## Consequences

- **Positive:** the platform's confidence numbers are now anchored to
  measured coverage. The user-facing "90% CI" actually contains the
  outcome 88–92% of the time per cohort over the rolling window.
- **Negative / cost:** until outcomes have accumulated for a cohort,
  conformal cannot produce an interval — the UI falls back to "n/a"
  rather than a number. This is the right behaviour; fake intervals
  were the bug.
- **Constraints introduced:**
  - Every confidence number visible to a user must come from
    `conformalCI.ts` (or be explicitly labelled "no empirical
    coverage").
  - The `coverage_audit` view is a hard SLO. Sustained breach pages
    on-call.

## References

- [conformalCI.ts](../../src/services/conformalCI.ts)
- [confidenceModel.ts](../../src/services/confidenceModel.ts)
- Migration [20260608000001_coverage_measurements.sql](../../../../supabase/migrations/20260608000001_coverage_measurements.sql)
- ADR [0007](./0007-empirical-truth-loop.md) — outcomes that feed
  conformal scoring.
