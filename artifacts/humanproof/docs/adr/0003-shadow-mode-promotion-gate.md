# 0003 — Strict shadow mode gates every engine change

- **Status:** accepted
- **Date:** 2026-06-02
- **Deciders:** Platform team

## Context

The transformation plan ships eight workstreams that touch the scoring
engine. We need a way to validate that a new scoring path matches (or
beats) the legacy path against real outcomes before flipping it on for
users. Historically the team flipped flags by feel — "this seems
reasonable, ship it" — and inherited a system whose confidence numbers
do not match measured outcome coverage.

We need an empirical, mechanical gate.

## Decision

Every audit runs BOTH the `legacy` and the `candidate` engine when a
candidate exists. Both `HybridResult`s are written to
`audit_shadow_comparison` (legacy = visible to user; candidate =
shadow). Each workstream gets a feature flag in `engine_feature_flags`
with modes `off | shadow | canary | production | deprecated`. A
candidate cannot move from `shadow` to `production` without an
explicit promotion that asserts:

1. The shadow score distribution matches the legacy within a tolerance
   the workstream owner sets (typically Δ AUC < 0.02).
2. No cohort migrates en-masse to a wrong tier.
3. The drift-alert gate ([recalibrate-engine](../../../../supabase/functions/recalibrate-engine/index.ts))
   has been silent for 7 days against the candidate.

Promotion is recorded in `engine_feature_flag_history` for audit.

## Alternatives considered

- **Manual review of N audits before flipping** — rejected. Doesn't
  scale; reviewer eyeballing 100 audits cannot detect cohort-level
  drift.
- **A/B test by user** — rejected. Audits per user are too sparse for
  a powered test in reasonable time; cohort effects swamp signal.
- **Bake-time only ("ship after 2 weeks of shadow")** — rejected.
  Time-on-shadow without a quantitative pass criterion just means
  unproven code shipped on a schedule.

## Consequences

- **Positive:** promotions are anchored to numbers, not vibes. A bad
  candidate is caught before users see it.
- **Negative / cost:** doubles compute per audit during shadow window.
  Acceptable: candidate engines are not the bottleneck; scrape calls
  are. The shadow table grows fast — retention is 30 days, enforced
  by cron.
- **Constraints introduced:**
  - Every engine change ships behind a flag in `engine_feature_flags`.
  - The promotion ticket must reference shadow comparison data.
  - Direct edits to scoring math that bypass shadow mode fail PR
    review.

## References

- [PROMOTIONS.md](../PROMOTIONS.md) — the promotion checklist.
- [engineShadowRunner.ts](../../src/services/engineShadowRunner.ts)
- Migration [20260602000001_audit_shadow_comparison.sql](../../../../supabase/migrations/20260602000001_audit_shadow_comparison.sql)
- Migration [20260602000002_engine_feature_flags.sql](../../../../supabase/migrations/20260602000002_engine_feature_flags.sql)
