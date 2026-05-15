# 0009 — Confidence-affecting constants live in DB, not in code

- **Status:** accepted
- **Date:** 2026-06-15
- **Deciders:** Platform + ML teams

## Context

The v35.1 production-readiness audit surfaced ~28 scalar constants scattered
across scoring services that are commented as "research_derived" /
"empirical" / "calibrated" but have no regression source or held-out
validation. Representative offenders:

- `layoffScoreEngine.ts:1083-1316` — five `UNCALIBRATED` recent-layoff-risk
  bands (0.95, 0.80, 0.62, 0.42, 0.28), four AI-displacement bands
  (0.85/0.55/0.25), four layoff-round bands (0.42/0.68/0.85/0.95).
- `hybridConsensusBuilder.ts:307-308` — four spread thresholds
  (0.28/0.08/0.14/0.22).
- `swarmAggregator.ts:265` — confidence caps `45 vs 90`.
- `liveDataService.ts:1656-1660` — `confidenceCap = 0.35 / 0.55`.
- `careerContingencyPlanEngine.ts:394` — `0.55 + Math.min(0.30, margin/100)`.
- `peerContagionEngine.ts:77-92` — peer-contribution weights and recency-decay
  thresholds.

These values feed user-facing confidence numbers. The platform calls them
"empirical." They aren't. The legacy excuse — "we'll recalibrate later" — has
been outstanding across multiple intelligence-upgrade releases (v9 through
v34) without the recalibration ever happening. The constants ossify into the
codebase as if they were ground truth, and the model's measured calibration
drifts from its claimed calibration silently.

The original v35 transformation (ADRs 0005, 0007) addresses this for the
*structured* coefficient bundles (L1-L5 multipliers, D8 logistic, threshold
tables). The long-tail scalars were left out.

## Decision

Every scalar constant used in confidence or risk arithmetic MUST be sourced
from the `engine_calibration_constants` DB table via
`getConstant(key, bootstrapFallback)`. The row carries explicit
`provenance` — one of `regression | grid_search | manual_seed |
uncalibrated_placeholder`. The audit pipeline logs every resolution to
`engine_constant_resolutions` so the `v_uncalibrated_exposure` view can
measure the fraction of audits whose final confidence depends on at least
one `uncalibrated_placeholder` value.

When `STRICT_CALIBRATION_MODE` is on, layers reading an
`uncalibrated_placeholder` value MUST tag their span `fallback=true,
reason='uncalibrated_constant'` via `withFallback()` / `markFallback()`.
The helper `applyCalibratedCap()` enforces this contract for the common
floor/ceiling pattern: it returns both the result and a
`cappedByUncalibrated` flag the caller propagates.

The lint rule `no-bare-confidence-arithmetic` will reject any new
`Math.max | Math.min | + | * | ?:` operation on identifiers matching
`/confidence|risk|weight/i` outside of `calibrationConstants.ts` itself.

The companion `no-uncalibrated-magic-number` lint rule flags numeric
literals matching `/0\.\d{2,}/` in `src/services/**/*.ts` that are not
assigned from `getConstant(...)` or `cacheConfig`. Allowlist via the
`// calibration:bootstrap-fallback` comment.

## Alternatives considered

- **Keep the constants in code but document each one's source in a
  comment** — rejected. Comments rot; the recalibrate-engine cron
  cannot write to comments. Code-comment provenance is just a more
  formal version of the current `// UNCALIBRATED — developer estimate`
  pattern that motivated this decision.
- **Single config JSON file checked into git** — rejected. Same
  shipping cadence as code (PR + deploy), and impossible to roll back
  a single constant without affecting the rest. The DB table is the
  versioning + rollback substrate.
- **Pre-compute and bake at build time** — rejected. Recalibration
  cadence is weekly via cron; that doesn't match deploy cadence.
- **Require regression for every constant before merge** — rejected as
  too strict. Some constants (e.g. confidence caps for known failure
  modes) are legitimately manual_seeds with ops rationale. The
  provenance enum captures this nuance.

## Consequences

- **Positive:**
  - Every confidence number in the UI traces to a versioned row.
  - The recalibration cron can target `uncalibrated_placeholder` rows
    as a work queue.
  - The `v_uncalibrated_exposure` view quantifies what fraction of
    audits depend on un-validated math, giving the platform team a
    measurable target (<5%).
  - The shadow-runner can persist a "this audit's confidence was
    capped by an uncalibrated constant" flag on
    `audit_shadow_comparison`, enabling cohort-level analysis.

- **Negative / cost:**
  - One additional DB read on every constant lookup (cached for 30min,
    so amortised to ~zero per audit).
  - Migration cost: ~28 sites must be refactored to call `getConstant()`.
    Phased over WS9.
  - One new lint rule that must be tuned to avoid false positives on
    test fixtures (handled by file-path exclusion).

- **Constraints introduced:**
  - All new scoring code MUST route confidence-affecting constants
    through `getConstant()` — direct numeric literals fail CI.
  - Layers reading an `uncalibrated_placeholder` constant MUST emit
    `fallback=true` on their span (WS10's `markFallback` helper).
  - The bootstrap fallback parameter to `getConstant()` is required
    and must match the historical value — protects against a
    cold-start regression when the DB is empty.

## References

- WS9 spec — toasty-sparking-wozniak.md, v35.1 addendum.
- ADR [0005](./0005-conformal-ci-over-bayesian.md) — companion
  decision: confidence intervals derive from outcomes, not heuristics.
- ADR [0007](./0007-empirical-truth-loop.md) — the recalibration cron
  that fills `engine_calibration_constants` with regression-derived
  values.
- Migrations [`20260615000001_calibration_provenance.sql`](../../../../supabase/migrations/20260615000001_calibration_provenance.sql)
  and [`20260615000002_uncalibrated_dashboard.sql`](../../../../supabase/migrations/20260615000002_uncalibrated_dashboard.sql).
- Loader [`src/services/calibration/calibrationConstants.ts`](../../src/services/calibration/calibrationConstants.ts).
