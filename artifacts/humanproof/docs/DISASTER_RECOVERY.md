# Disaster Recovery Plan

This document defines what the platform owes its users in the worst
case: the production database is destroyed, the frontend is unrouted,
or a malicious actor compromises secrets. The procedures below are
practiced **quarterly** in a non-prod environment; the dates of the
last three drills are recorded at the bottom of this file.

## Objectives

| Metric | Target | Stretch |
|---|---|---|
| RPO (Recovery Point Objective) | ≤ 60 minutes | ≤ 5 minutes |
| RTO (Recovery Time Objective)  | ≤ 4 hours    | ≤ 1 hour    |
| MTTR for a known failure mode  | ≤ 30 minutes (runbook-driven) |
| Maximum tolerable user-facing audit error rate during recovery | 100% (degraded mode acceptable) |

RPO of 60 min comes from Supabase Point-in-Time Recovery (PITR) backups
which capture WAL every 2 minutes; rounded conservatively.

RTO of 4h reflects: 30 min Supabase project provisioning + 1h schema
restore + 30 min frontend redeploy + 1h validation + buffer.

## Inventory: what we back up

| Asset | Backup mechanism | Frequency | Retention |
|---|---|---|---|
| Supabase project (full Postgres) | PITR (Supabase managed) | 2-min WAL | 7 days |
| Schema migrations               | Git (`supabase/migrations/`) | Per-commit | Forever |
| Edge function source            | Git (`supabase/functions/`) | Per-commit | Forever |
| Frontend bundle                 | Vercel deploys + git | Per-deploy | 90 days (Vercel) |
| Secrets (env, JWT, service role keys) | Supabase Vault + Vercel env | On change | Rotated quarterly |
| `engine_calibration_versions` rows (model weights) | PITR + nightly logical dump | Daily | 365 days |
| `audit_shadow_comparison` rows | PITR | Continuous | 30 days |
| User-reported `user_prediction_outcomes` | PITR | Continuous | Forever (calibration corpus) |

### Why duplicate the calibration table backup

`engine_calibration_versions` is the source of truth for production
scoring math. Losing it means every audit reverts to bootstrap weights
until manual reseeding. PITR covers it, but the nightly logical dump
to off-Supabase storage protects against a Supabase-side incident
that affects PITR too.

```sql
-- Nightly cron (registered in supabase/migrations/<future>_calibration_backup.sql)
CREATE OR REPLACE FUNCTION public.dump_calibration_to_storage()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  payload JSONB;
BEGIN
  SELECT jsonb_agg(row_to_json(v))
    INTO payload
    FROM public.engine_calibration_versions v
   WHERE status IN ('active', 'superseded');
  -- TODO(infra): pipe to S3 via supabase storage SDK.
  PERFORM 1;  -- placeholder until storage SDK integration
END;
$$;
```

This dump function is currently a stub; the S3 upload glue is in the
infra-as-code backlog.

## Threat model: what can go wrong

| Threat | Likelihood | Impact | Recovery path |
|---|---|---|---|
| Single edge function bug | Daily | Low | Rollback via flag or git revert |
| Supabase project unreachable | Quarterly | High | Wait + maintenance banner |
| Bad migration corrupts a table | Quarterly | High | PITR restore to T-1m before migration |
| Bad migration deletes a table | Yearly | Critical | PITR restore + replay migrations from git |
| Secrets leaked publicly (env file in commit) | Yearly | Critical | Rotate all keys via Supabase + Vercel + Fly |
| Supabase project deleted | Decadal | Critical | Provision new project + restore from PITR snapshot |
| Vercel project deleted | Decadal | Medium | Redeploy from git to new project |

## Recovery procedures

### Scenario 1: Bad migration corrupts a production table

**Time budget:** 30 min – 2 hours.

1. **Pause all writes** to the affected table at the application
   layer. The fastest path: flip `engine_feature_flags` for any
   feature that writes to the table to `off`.
2. **Identify the corruption point.** Inspect recent rows; look for
   the migration timestamp prefix that correlates.
3. **PITR restore to T-1m before the migration ran.** Via Supabase
   dashboard → Database → Backups → Point-in-time → select
   timestamp → restore.
4. **Re-apply EVERY commit from git that landed AFTER the bad
   migration**, except the bad migration itself. Write a
   compensating migration for the corruption window.
5. **Replay any out-of-band data** (user reports captured during
   the corruption window) from the WAL by querying
   `pg_logical.dump_logical_record(...)` if needed.
6. **Resume writes.**

### Scenario 2: Supabase project deleted

**Time budget:** 4 hours.

1. **Create new Supabase project** in the same region.
2. **Capture project credentials** (URL, anon key, service role key)
   into Vercel env + Supabase Vault.
3. **Restore the latest PITR snapshot** into the new project via
   support ticket (Supabase support has done this; the timeline is
   30 min – 2 hours).
4. **Apply any migrations** that landed after the snapshot:
   ```bash
   supabase db push --project-ref <new-ref>
   ```
5. **Update DNS / Vercel env** to point at the new project URL.
6. **Redeploy frontend** so it picks up the new env.
7. **Smoke-test:** run the synthetic audit. Verify health-probe
   returns 200.

### Scenario 3: Secrets leaked publicly

**Time budget:** 1 hour.

1. **Identify the scope.** Which keys were exposed? When was the
   commit / dump?
2. **Rotate Supabase keys** via dashboard:
   - Regenerate `anon` key.
   - Regenerate `service_role` key.
   - Rotate JWT secret (this also invalidates every active user
     session — expected).
3. **Rotate Vercel env vars** to the new keys; redeploy.
4. **Rotate Fly.io scraper HMAC secret.** Update both ends.
5. **Audit `auth.audit_log_entries`** for the exposure window.
   Anomalous logins → freeze affected users.
6. **Public disclosure** if user data was actually exfiltrated
   (per legal + comms team SOP, not engineering's call).

## Quarterly drill schedule

Every quarter the platform team runs a drill against a staging
environment. The drill rotates between scenarios:

| Quarter | Scenario | Last run | Outcome |
|---|---|---|---|
| Q1 | Scenario 1 (bad migration) | _(not yet)_ | _(pending)_ |
| Q2 | Scenario 2 (project deletion) | _(not yet)_ | _(pending)_ |
| Q3 | Scenario 3 (secrets leak) | _(not yet)_ | _(pending)_ |
| Q4 | All three (full DR exercise) | _(not yet)_ | _(pending)_ |

After each drill, the result is recorded in this file: the timing,
what worked, what didn't, and follow-up tickets for any gap that
slowed the recovery.

## What this document does NOT cover

- **Application-layer rollbacks** — see [PROMOTIONS.md](./PROMOTIONS.md)
  for flipping feature flags.
- **Routine incidents** — see [runbooks/](./runbooks/) for symptom-driven
  procedures.
- **Cost recovery / SLA refunds** — finance/comms territory.

This document is for the worst-case scenarios where the application
itself is intact but the platform underneath has failed.
