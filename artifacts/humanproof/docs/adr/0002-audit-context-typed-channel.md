# 0002 — Typed AuditContext replaces `companyData as any._x`

- **Status:** accepted
- **Date:** 2026-06-02
- **Deciders:** Platform team

## Context

Legacy layers passed inter-layer state by mutating `companyData` with
un-typed private fields: `_conformalBundle`, `_stealthSignal`,
`_acquisitionPremium`, `_maContext`, `_evidencePresence`,
`_swarmIndependence`, `_dataFreshnessScore`, `_liveUnavailable`, etc.
This worked but was opaque to the type system:

- Renaming a producer's field silently broke every consumer.
- A consumer reading a never-set field saw `undefined` and degraded
  unpredictably.
- Grepping for a field's writer required string search across every
  service.

## Decision

We will introduce `AuditContext` with a typed pub/sub bus. Every
inter-layer channel is declared as a key in `LayerOutputs` with a
typed value. Layers call `ctx.emit(key, value)` to write and
`ctx.read(key)` / `ctx.require(key)` to read. Reads return the
declared type or `null` (or throw, in the case of `require`).

`bridgeFromLegacy` copies known private fields from the legacy
`companyData` into the context so the new pattern and the legacy
pattern interoperate during migration.

## Alternatives considered

- **Pass an explicit args object between layers** — rejected. Forces
  every layer to know which fields its callers will provide, defeating
  the DAG's "any layer can depend on any prior layer" property.
- **Use a TypeScript discriminated union on `companyData`** — rejected.
  The unions explode combinatorially as more layers add private
  fields; the type checker becomes useless slowly.
- **Use a class hierarchy (CompanyData → EnrichedCompanyData → ...)** —
  rejected. Each layer would have to know which subclass it received,
  reintroducing ordering coupling.

## Consequences

- **Positive:** producer/consumer relationships are visible in the
  type system; rename refactors propagate; consumers no longer guess
  at field shape.
- **Negative / cost:** the legacy `companyData as any._x` channels
  continue to exist until every layer is migrated. Bridge code is
  required.
- **Constraints introduced:**
  - New inter-layer channels MUST be added to `LayerOutputs` with a
    typed value (and the runtime `TYPED_LAYER_KEYS` set).
  - New code does NOT add fields to `companyData` for inter-layer
    use — only the legacy bridge writes to it.
  - The `_legacy_untyped` channel is a sentinel; do not add entries.

## References

- [auditContext.ts](../../src/domain/pipeline/auditContext.ts)
- ADR [0001](./0001-dag-pipeline-registry.md) — the DAG executor that
  consumes this context.
