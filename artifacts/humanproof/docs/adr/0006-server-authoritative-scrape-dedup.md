# 0006 — Server-authoritative scrape dedup via `INSERT ... ON CONFLICT`

- **Status:** accepted
- **Date:** 2026-06-07
- **Deciders:** Platform team

## Context

Pre-WS6, scrape requests were dedupedclient-side: `scraperTrigger.ts`
kept a 60-second in-memory map of recently-issued dedupe keys, and a
client that hit it skipped enqueueing a job. This had three problems:

1. Two clients (or two browser tabs) saw two independent maps, so
   N clients = N scrape jobs.
2. A page refresh dropped the map.
3. Load testing 10k concurrent same-company audits produced 10k
   scrape jobs, blowing through anti-bot quota in seconds.

The architectural ceiling we want is "1 scrape per company per window
regardless of caller count."

## Decision

Dedup moves to the database. The `scrape_jobs` table has a `UNIQUE
(dedupe_key)` constraint. Enqueue is:

```sql
INSERT INTO scrape_jobs (dedupe_key, company_canonical, ...)
VALUES ($1, $2, ...)
ON CONFLICT (dedupe_key) DO NOTHING
RETURNING id;
```

A caller that wins the insert gets back a row id and waits for the
job to finish. A caller that loses (because another concurrent caller
inserted first) gets nothing back, looks up the existing row by
`dedupe_key`, and subscribes to its completion via Supabase realtime.
The 10k-client case converges to exactly 1 row.

For request coalescing one level higher up the stack, the
`audit-coalesce` edge function uses a Postgres advisory lock keyed on
`(company_normalized, started_within_window)` so second concurrent
callers subscribe to the first caller's result.

## Alternatives considered

- **Redis-backed distributed lock** — rejected. Adds a runtime
  dependency for a problem Postgres already solves; the UNIQUE
  constraint IS the atomic primitive.
- **Application-level lease in a separate `dedup_leases` table** —
  rejected. Equivalent to the UNIQUE-constraint approach but with
  more moving parts and a TTL cleanup job.
- **Keep client-side dedup, page when stampedes happen** — rejected.
  The whole point is to remove the stampede; alerting on it is
  paving the cowpath.

## Consequences

- **Positive:** load tested to 10k concurrent same-company audits →
  exactly 1 `scrape_jobs` row. Scrape quota is no longer a function
  of user count.
- **Negative / cost:** callers that lose the insert race must poll
  (or subscribe to realtime) for completion instead of executing the
  scrape themselves. The added latency is in the noise (<100ms) vs
  the scrape itself (5–15s).
- **Constraints introduced:**
  - The `dedupe_key` shape is part of the contract; changing it
    invalidates in-flight dedup state. Migrations that change it
    must rotate to a new column.
  - Every new scraping source must use this enqueue path; bespoke
    "scrape it right now" code is forbidden in PR review.

## References

- [scraperTrigger.ts](../../src/services/scraperTrigger.ts)
- [audit-coalesce edge function](../../../../supabase/functions/audit-coalesce/index.ts)
- Migration [20260515000003_scrape_jobs_rls.sql](../../../../supabase/migrations/20260515000003_scrape_jobs_rls.sql)
