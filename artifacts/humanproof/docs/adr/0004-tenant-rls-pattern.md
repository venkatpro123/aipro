# 0004 — Tenant-scoped RLS for every user-data table

- **Status:** accepted
- **Date:** 2026-06-11
- **Deciders:** Platform team

## Context

We expect to onboard enterprise customers who require logical
isolation of their employees' audit data. We also need a single-tenant
default that works for the existing consumer userbase without retro-
fitting auth.

Without a uniform tenant pivot, every new user-data table risks
re-litigating "how do we keep tenant A from reading tenant B." That
either ends in inconsistent policies or, worse, a missing policy.

## Decision

We will use Postgres RLS with a single, uniform pivot:
`tenant_memberships(user_id, tenant_id, role)`. Every user-scoped
table gets a `tenant_id UUID NOT NULL` column and an RLS policy of
the shape:

```sql
CREATE POLICY "<table>_tenant_scope" ON public.<table>
  FOR ALL TO authenticated
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());
```

A SQL helper `current_tenant_id()` reads the user's active tenant
from `tenant_memberships`, defaulting to the well-known
`SINGLE_TENANT_ID` UUID for users without an explicit membership.
This is the consumer default; the same user joining an enterprise
plan gets a row in `tenant_memberships` linking to the new tenant.

The `rlsIsolation.test.ts` integration suite asserts that two users
in different tenants cannot read each other's rows on any of the
covered tables — the test is the contract.

## Alternatives considered

- **Application-layer filtering by `user_id`** — rejected. One missed
  WHERE clause = a cross-user leak. Postgres RLS makes the database
  the gate.
- **Per-tenant Postgres schemas** — rejected. Migrations become a
  per-tenant fan-out; the operational cost is far higher than the
  isolation win.
- **Per-tenant Supabase projects** — rejected for the same reason at
  the platform level; revisit only if a customer's compliance regime
  demands physical isolation.

## Consequences

- **Positive:** the database is the gate. A buggy edge function that
  forgets to filter cannot leak across tenants.
- **Negative / cost:** every new user-scoped table must include the
  `tenant_id` column and the RLS policy. The integration test must
  be extended to cover it.
- **Constraints introduced:**
  - Direct `service_role` queries that bypass RLS are gated behind a
    `PROD_GUARD` runtime check (see `repositories/baseRepository.ts`).
  - Every new RLS policy ships with an integration test.
  - The PR template includes an RLS checkbox; reviewers reject PRs
    that add a user-scoped table without one.

## References

- Migration [20260611000003_tenants.sql](../../../../supabase/migrations/20260611000003_tenants.sql)
- [rlsIsolation.test.ts](../../src/__tests__/integration/rlsIsolation.test.ts)
- [PULL_REQUEST_TEMPLATE.md](../../../../.github/PULL_REQUEST_TEMPLATE.md)
