# 0001 — DAG-based pipeline registry replaces sequential god-file

- **Status:** accepted
- **Date:** 2026-06-02
- **Deciders:** Platform team

## Context

The original audit pipeline lived in `auditDataPipeline.ts` as a single
2,200-line sequential orchestrator. Every layer was called inline, in
a fixed order, with state threaded between layers by mutating
`companyData` with un-typed private fields. Symptoms:

- Adding a new layer meant editing the god-file and choosing an order
  by hand.
- A failure in any one layer halted the whole audit — there was no
  isolation boundary.
- Independent layers ran sequentially even when they could run in
  parallel, inflating p95 latency.
- The type system could not catch a renamed inter-layer field, a
  deleted producer, or a consumer reading something no producer set.

We needed a structure where layers declare their inputs and outputs,
the framework figures out the execution order, and one layer's bad day
does not crash the rest.

## Decision

We will run audit layers through a DAG executor (`layerRegistry.ts` +
`auditContext.ts`). Each `AuditLayer` declares its dependencies, an
explicit timeout, a `failureMode` (`fatal` | `degrade`), an optional
fallback, and a typed `run()` that emits its output into the shared
`AuditContext`. The executor performs topological sort, wave-based
parallel execution, per-layer try/catch + timeout + fallback, and
records pass/fail per layer onto the context.

## Alternatives considered

- **Keep the sequential pipeline and add try/catch around each call** —
  rejected. Does not address the latency cost of forced serialisation,
  the typing of inter-layer state, or the difficulty of adding new
  layers.
- **Adopt a general workflow engine (Temporal, Inngest)** — rejected
  for now. Adds operational surface area and a paid dependency for a
  problem that fits in <500 lines of TypeScript. Reconsider if we
  outgrow the in-process executor.
- **Pure functional pipeline (RxJS / fp-ts)** — rejected. The team's
  default mental model is imperative; adopting a functional style for
  the core data path would slow contribution.

## Consequences

- **Positive:** independent layers run in parallel; layer authors write
  only their domain code, not boilerplate; the DAG validates at
  registration so cycles and missing deps fail loudly.
- **Negative / cost:** legacy `auditDataPipeline.ts` migrates layer by
  layer over several weeks; a layer not yet ported has to coexist with
  registered layers. The bridge is `bridgeFromLegacy` in
  `auditContext.ts`.
- **Constraints introduced:**
  - Every new layer must implement the `AuditLayer` interface and
    register at module load via `registerLayer()`.
  - Every typed output key must be added to both `LayerOutputs` in
    `auditContext.ts` AND the runtime `TYPED_LAYER_KEYS` set in
    `layerRegistry.ts`.
  - Adding a circular dependency fails at the first audit (the cached
    plan rejects it).

## References

- [layerRegistry.ts](../../src/domain/pipeline/layerRegistry.ts)
- [auditContext.ts](../../src/domain/pipeline/auditContext.ts)
- [dagChaos.test.ts](../../src/__tests__/unit/dagChaos.test.ts)
- ADR [0002](./0002-audit-context-typed-channel.md) — the typed-channel
  companion decision.
