# Incident Runbooks

Each file in this directory is an end-to-end procedure for one specific
failure mode. The on-call engineer follows the relevant file from top
to bottom; the file ends with verification steps that confirm the
incident is closed.

## How runbooks are structured

Every runbook has these sections:

1. **Symptom** — what triggered the page (which SLO breached or which alert fired).
2. **Diagnosis** — concrete commands / SQL queries to narrow the root cause.
3. **Mitigation** — actions that stop the bleeding (might not fix root cause).
4. **Resolution** — actions that fix the root cause.
5. **Verification** — how to confirm the incident is over.
6. **Post-incident** — what to log in the incident review.

If your incident doesn't match any runbook, start with [unknown.md](./unknown.md)
which is the generic decision tree.

## Index

| File | Trigger |
|---|---|
| [db-outage.md](./db-outage.md) | Supabase unreachable; health probe returns 503 on `db_connectivity` |
| [scraper-down.md](./scraper-down.md) | Layer fallback rate >5% on any scrape source for 15+ min |
| [calibration-drift.md](./calibration-drift.md) | `is_misaligned=TRUE` on the 90% CI for any cohort, or AUC drop >0.05 |
| [auth-failure.md](./auth-failure.md) | RLS denial spike or mass login failures |
| [news-flood.md](./news-flood.md) | Breaking-news event burst saturating realtime fan-out |
| [secrets-rotation.md](./secrets-rotation.md) | Quarterly rotation, leaked-secret emergency, off-boarding |
| [privacy-data-deletion.md](./privacy-data-deletion.md) | GDPR / CCPA right-to-be-forgotten or data-export request |
| [unknown.md](./unknown.md) | Symptom doesn't match any specific runbook |
