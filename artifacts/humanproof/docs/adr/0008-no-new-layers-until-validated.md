# 0008 — Freeze new intelligence layers until WS2/WS4 ship

- **Status:** accepted
- **Date:** 2026-06-02
- **Deciders:** Platform team

## Context

The audit pipeline has grown to 54 layers. The transformation audit
identified that the system already has too many layers to validate
against outcomes — adding more without first wiring the empirical
truth loop (WS2) and conformal CI (WS4) makes the validation problem
strictly worse.

The temptation, every quarter, is to ship a new "intelligence layer"
because a clever signal was discovered. The team has shipped 10+
intelligence-upgrade releases (see memory: v9 through v34). Each one
added complexity to a system whose existing complexity was not yet
validated.

## Decision

No new intelligence layers (L55+) ship until both WS2 (empirical
truth loop) and WS4 (confidence as empirical coverage) are in
production. The freeze is enforced by PR review: a PR that adds a
file under `src/services/<engineName>.ts` and registers it as a
layer must reference the WS2+WS4 production milestone in its
description, or be rejected.

The freeze does NOT block:

- Fixes to existing layers.
- Refactors (e.g. WS7 merges L14+L33).
- New non-layer services (utilities, repositories, connectors).
- Layers that REPLACE an existing layer (1:1 swap counts as a
  refactor).

## Alternatives considered

- **Soft moratorium ("try not to add layers")** — rejected. Soft
  moratoriums never hold. The team consistently ships layers because
  adding one feels productive and the cost is invisible.
- **Cap layer count at 50 going forward** — rejected. The cap is
  arbitrary; the real constraint is "can we validate the layers we
  have." Number cap could be honoured by deleting + adding to stay
  under, which is theatre.
- **No freeze, but require shadow-mode proof** — rejected. Shadow
  proof is necessary but not sufficient; without WS2 outcomes there
  is no truth to shadow against.

## Consequences

- **Positive:** the team's attention focuses on validating what
  exists rather than building what's novel. The pipeline is allowed
  to shrink during the freeze (WS7 consolidation).
- **Negative / cost:** ideas for new signals queue up. We accept
  this. The queue is cheap; the layer is expensive.
- **Constraints introduced:**
  - PR reviewers reject new-layer PRs without WS2+WS4 milestone
    reference.
  - This ADR is the canonical pointer; reviewers can cite it.
  - The freeze ends with a follow-up ADR that supersedes this one.

## References

- ADR [0001](./0001-dag-pipeline-registry.md) — the registry pattern
  that makes adding a layer cheap mechanically, which is exactly why
  we need a non-mechanical brake.
- ADR [0005](./0005-conformal-ci-over-bayesian.md) — WS4 gate.
- ADR [0007](./0007-empirical-truth-loop.md) — WS2 gate.
