# Runbook: Privacy / right-to-be-forgotten

## Purpose

Process a user request to delete (or export) all personal data we hold
about them, end-to-end, with verification. Applies to GDPR Article 17
(erasure), CCPA "right to delete," and equivalent requests under other
jurisdictions.

The procedure here is the *technical* part. Legal sign-off, identity
verification of the requester, and the response letter are handled by
the operations team — engineering does not action a deletion request
without a ticket from operations.

## SLA

| Step | Owner | Deadline |
|---|---|---|
| Acknowledge receipt to user                 | Ops          | 72h    |
| Verify requester identity                    | Ops          | 7 days |
| Engineering: confirm scope + dry-run        | Platform     | 14 days |
| Engineering: execute deletion + verify      | Platform     | 21 days |
| Operations: send completion confirmation    | Ops          | 30 days |

GDPR cap is 30 days; we hit 21 internally so ops has a buffer for the
confirmation letter.

## Inventory: where user data lives

A user's data sits in two categories:

### Auto-cascade tables

These reference `auth.users(id) ON DELETE CASCADE`. Deleting the
auth.users row removes every related row automatically.

| Table | What it holds |
|---|---|
| `roadmap_progress`              | Career roadmap completion state |
| `career_path_saves`             | Saved career paths |
| `score_history`                 | Per-user score timeline |
| `journal_entries`               | Journal text |
| `career_transitions`            | Self-reported job changes |
| `api_keys`                      | User-issued API tokens |
| `user_preferences`              | UI settings |
| `monthly_reports`               | AI-generated monthly digests |
| `user_prediction_outcomes`      | Reported outcomes (calibration corpus) |
| `score_trajectory`              | Per-user score history |
| `tenant_memberships`            | Tenant pivot (drops the user from every tenant) |

### Manual-cleanup tables

These hold user-identifiable data but do NOT cascade from `auth.users`.
They must be deleted in step 5 below.

| Table | Why it doesn't cascade | Cleanup query |
|---|---|---|
| `pipeline_runs`                | Operational data; user_id (if any) lives in `meta` JSONB | `DELETE WHERE meta->>'user_id' = $1::TEXT` |
| `audit_shadow_comparison`      | Operational data; pseudonymous `user_id`  | `DELETE WHERE user_id = $1` |
| `analytics_events`             | Pseudonymous event log; nullable user_id  | `DELETE WHERE user_id = $1` |
| `layer_fallback_log`           | Pseudonymous; sometimes references user via `audit_session_id` only — no direct `user_id` column | No-op (no PII column). Audit session IDs are not linkable to a user once the cascade tables are gone. |
| `engine_events`                | Outbox with direct `user_id UUID` column  | `DELETE WHERE user_id = $1` |
| `auth.audit_log_entries`       | Supabase-managed; auth events            | Supabase deletes on user removal automatically |

### Out of scope

These do NOT contain personal data and are NOT touched:

- `company_intelligence`, `breaking_news_events`,
  `curated_layoff_events`, etc. — public-company facts, no user link.
- `engine_calibration_versions`, `slo_targets`, `slo_*_burn` —
  aggregated math, no user link.
- `synthetic_probe_results` — synthetic probes, no real users.

If you discover a table holding user data that isn't in either list
above, **stop and update this runbook before proceeding**. Missing
tables here are the failure mode this runbook exists to prevent.

## Procedure

**Pre-flight:**

1. Confirm the ops ticket is present and references a verified
   user. Without ops sign-off, do not proceed.
2. Capture the user's `auth.users.id` (UUID). Operations gives you
   the email; you translate to UUID via:
   ```sql
   SELECT id FROM auth.users WHERE email = $1;
   ```
3. Open a same-day incident channel `#priv-<short-uuid>` so the work
   is traceable.

**Step 1 — Export (if requested):**

If the request is a portability/access request (GDPR Article 15/20),
generate the JSON export FIRST. Once data is deleted, you can't go
back.

```sql
-- Run as service_role; write output to a temp file the user can
-- download via a signed URL with a 7-day expiry.
\copy (
  SELECT 'roadmap_progress' AS source, row_to_json(t) AS data
    FROM roadmap_progress t WHERE user_id = :'uid'
  UNION ALL
  SELECT 'journal_entries',  row_to_json(t) FROM journal_entries t WHERE user_id = :'uid'
  UNION ALL
  SELECT 'user_prediction_outcomes', row_to_json(t) FROM user_prediction_outcomes t WHERE user_id = :'uid'
  -- ... one UNION per cascade table above ...
) TO '/tmp/export_<uid>.jsonl';
```

Encrypt the file (`age` or `gpg`) before handing to ops. Plain-text
JSON sitting on a laptop is a second-order leak.

**Step 2 — Dry-run the deletion:**

```sql
BEGIN;

-- Count auto-cascade rows that WOULD be deleted.
SELECT 'roadmap_progress'        AS table_name, COUNT(*) FROM roadmap_progress        WHERE user_id = :'uid'
UNION ALL SELECT 'career_path_saves',           COUNT(*) FROM career_path_saves        WHERE user_id = :'uid'
UNION ALL SELECT 'score_history',               COUNT(*) FROM score_history            WHERE user_id = :'uid'
UNION ALL SELECT 'journal_entries',             COUNT(*) FROM journal_entries          WHERE user_id = :'uid'
UNION ALL SELECT 'career_transitions',          COUNT(*) FROM career_transitions       WHERE user_id = :'uid'
UNION ALL SELECT 'api_keys',                    COUNT(*) FROM api_keys                 WHERE user_id = :'uid'
UNION ALL SELECT 'user_preferences',            COUNT(*) FROM user_preferences         WHERE user_id = :'uid'
UNION ALL SELECT 'monthly_reports',             COUNT(*) FROM monthly_reports          WHERE user_id = :'uid'
UNION ALL SELECT 'user_prediction_outcomes',    COUNT(*) FROM user_prediction_outcomes WHERE user_id = :'uid'
UNION ALL SELECT 'score_trajectory',            COUNT(*) FROM score_trajectory         WHERE user_id = :'uid'
UNION ALL SELECT 'tenant_memberships',          COUNT(*) FROM tenant_memberships       WHERE user_id = :'uid'
UNION ALL SELECT 'pipeline_runs',               COUNT(*) FROM pipeline_runs            WHERE meta->>'user_id' = :'uid'
UNION ALL SELECT 'audit_shadow_comparison',     COUNT(*) FROM audit_shadow_comparison  WHERE user_id = :'uid'
UNION ALL SELECT 'analytics_events',            COUNT(*) FROM analytics_events         WHERE user_id = :'uid'
UNION ALL SELECT 'engine_events',               COUNT(*) FROM engine_events            WHERE user_id = :'uid';

ROLLBACK;
```

Paste the result into the incident channel. Anyone on the team can
spot-check that the totals are plausible (single-digit-to-low-thousands
range for most consumer accounts).

**Step 3 — Take a manual PITR snapshot tag:**

Via the Supabase dashboard. Note the timestamp in the incident
channel. This is the rollback point if step 4 goes wrong.

**Step 4 — Execute deletion in a single transaction:**

```sql
BEGIN;

-- Manual-cleanup tables first (cascade tables go automatically with auth.users).
DELETE FROM pipeline_runs            WHERE meta->>'user_id' = :'uid';
DELETE FROM audit_shadow_comparison  WHERE user_id = :'uid';
DELETE FROM analytics_events         WHERE user_id = :'uid';
DELETE FROM engine_events            WHERE user_id = :'uid';

-- Auth user — this cascades to every table in the auto-cascade list.
DELETE FROM auth.users WHERE id = :'uid';

-- Verify nothing is left.
SELECT
  (SELECT COUNT(*) FROM roadmap_progress        WHERE user_id = :'uid')                AS roadmap_progress,
  (SELECT COUNT(*) FROM user_prediction_outcomes WHERE user_id = :'uid')               AS outcomes,
  (SELECT COUNT(*) FROM pipeline_runs           WHERE meta->>'user_id' = :'uid')        AS pipeline_runs,
  (SELECT COUNT(*) FROM auth.users              WHERE id = :'uid')                     AS auth_user;

-- ALL counts must be 0. If any is non-zero, ROLLBACK and investigate.
COMMIT;
```

**Step 5 — External systems:**

These are NOT in Postgres; rotate / delete manually.

- **Vercel preview deploys:** none retain user data. Skip.
- **Axiom / Honeycomb (OTLP):** OTLP records pseudonymous `user.id`
  attributes. Retention is 30 days; the record naturally ages out.
  For an explicit purge, file a support ticket with the user UUID.
- **PostHog / analytics provider:** call the delete API with the
  user UUID. Confirm receipt in the incident channel.
- **Email service (Resend / Postmark):** unsubscribe + suppression
  list. Even after deletion, suppression-list retention is required
  by anti-spam law — note in the response letter that ops will
  reference this in their reply.

**Step 6 — Notify ops:**

Post in the incident channel:

- Timestamp of deletion.
- Row counts deleted per table.
- External system confirmations.
- The user UUID (now orphaned; safe to keep in the audit trail).

Ops uses this to write the completion letter.

## Verification

After step 4 the dry-run query (step 2) re-run should show every
count at 0. `layer_fallback_log` is left untouched because it
contains no direct `user_id` column — its `audit_session_id` values
become orphan references once the cascade tables are gone.

After step 5, the external-system list above each has an explicit
confirmation in the incident channel.

If a verification fails:

- Rollback was issued in step 4 → re-run from step 2.
- Verification failed AFTER commit → restore from the PITR snapshot
  tagged in step 3, then re-run the procedure with the missing
  table added to the manual-cleanup list above. **Update this
  runbook in the same PR.**

## Common pitfalls

- **Forgetting `auth.audit_log_entries`** — these are managed by
  Supabase and cleared on `auth.users` DELETE. You do NOT need to
  delete them manually; do NOT touch them. Their absence sometimes
  surprises during step 4 verification.
- **A user with multiple `tenant_memberships`** — deleting the auth
  row cascades all memberships. If the user was the LAST member of
  a tenant, the empty tenant remains. That's correct: tenants
  outlive their members. Empty tenants are pruned by a separate
  monthly cron.
- **Cron-recreated rows** — if a recalibration cron runs between
  step 4 and step 6, it could re-insert rows referencing the user
  via stale cache. Solution: pause the recalibrate cron for the
  duration:
  ```sql
  UPDATE cron.job SET active = false WHERE jobname = 'v35_recalibrate_engine';
  -- ... run procedure ...
  UPDATE cron.job SET active = true  WHERE jobname = 'v35_recalibrate_engine';
  ```
- **Treating "delete my data" as "delete my account"** — they are
  different. A delete-data request that is NOT a delete-account
  request should consult ops first; the user may want to keep
  using the platform with a clean slate, which means keeping the
  auth row but wiping the data.

## Related

- [DISASTER_RECOVERY.md](../DISASTER_RECOVERY.md) — what to do if
  step 4 goes catastrophically wrong.
- [ARCHITECTURE.md](../ARCHITECTURE.md) — the storage layout
  diagram shows which tables hold user data.
- [secrets-rotation.md](./secrets-rotation.md) — adjacent procedure
  for off-boarding an engineer with secret access.
