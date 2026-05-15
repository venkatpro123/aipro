# 0007 — Outcomes (implicit + user-reported) drive calibration

- **Status:** accepted
- **Date:** 2026-06-04
- **Deciders:** Platform team

## Context

The legacy calibration was built from a static `HISTORICAL_PATTERNS`
table — pseudo-outcomes hand-coded into the source. The model never
saw a real outcome; calibration was decorative.

For confidence numbers to mean anything (ADR 0005), we need a flow
where audit predictions are scored against observed reality. The
question is how to get enough outcomes fast enough to make the loop
work.

User self-reporting alone is too sparse: at consumer scale, fewer
than 5% of users return to report "yes I was laid off" or "no I'm
still here." We need a way to detect outcomes implicitly.

## Decision

We will build a two-source outcome ledger in `user_prediction_outcomes`:

1. **Implicit detection** via `implicitOutcomeDetector`. A cron runs
   every 6h; for every audit ≥14 days old that lacks an outcome, it
   queries WARN Act filings, layoffs.fyi, and news scrape cache for
   evidence of the predicted company having a layoff round. Detected
   outcomes are written with `outcome_source ∈ {'implicit_warn',
   'implicit_layoffsfyi', 'implicit_news'}` and a
   `detection_confidence` score. Only `detection_confidence ≥ 0.75`
   feeds the training set.

2. **User-reported** via the existing 30/90/180-day prompts run by
   `schedule-outcome-prompts`. These get `outcome_source =
   'user_reported'` and are weighted more strongly than implicit
   detections.

The calibration recomputes weekly from the union of both sources.
Implicit-vs-user disagreement is published as a metric so we can
detect bias in either source.

## Alternatives considered

- **User-reported only** — rejected. Insufficient volume for cohort-
  level coverage validation; the model goes uncalibrated for months.
- **Implicit-only** — rejected. The detector has blind spots (private
  companies, non-US filings, soft layoffs) that user reports
  correct.
- **Buy a third-party layoff dataset** — rejected as primary signal.
  layoffs.fyi has the same selection bias the legacy model already
  suffered from: companies are in the dataset because they have
  history, which inflates predictions for known companies and starves
  unknowns. We consume it as one feed among many, not as ground
  truth.

## Consequences

- **Positive:** every confidence number traces to a measured outcome
  through the calibration loop. The model improves automatically as
  more audits age past the 14-day detection window.
- **Negative / cost:** the loop needs ≥500 outcomes per cohort before
  conformal prediction emits a valid interval. Cohorts with low
  audit volume go un-calibrated longer.
- **Constraints introduced:**
  - The `outcome_source` and `detection_confidence` columns are
    part of the calibration contract; do not drop or repurpose them.
  - A new outcome source (a new connector) ships with a dual-coding
    study: 5% of detections hand-verified against ground truth for
    the first 3 months.
  - Direct edits to coefficient constants in `empiricalCalibration.ts`
    are forbidden; coefficients come from
    `engine_calibration_versions` only.

## References

- [outcomeIngestionPipeline.ts](../../src/services/outcomeIngestionPipeline.ts)
- [implicitOutcomeDetector.ts](../../src/services/implicitOutcomeDetector.ts)
- [recalibrate-engine edge function](../../../../supabase/functions/recalibrate-engine/index.ts)
- Migration [20260604000002_outcome_ledger_extensions.sql](../../../../supabase/migrations/20260604000002_outcome_ledger_extensions.sql)
- ADR [0005](./0005-conformal-ci-over-bayesian.md) — confidence loop
  this feeds.
