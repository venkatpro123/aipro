# Runbook: Supabase database outage

## Symptom

- Health probe (`/functions/v1/health-probe`) returns **503** with
  `db_connectivity` check `fail`.
- Frontend audits return errors immediately.
- `pipeline_runs` insert errors flood the log aggregator.

## Diagnosis (5 minutes)

1. **Confirm the outage is real, not a single edge function:**
   - Try the Supabase Studio for the affected project. Can you SELECT?
   - Check status.supabase.com for the affected region.

2. **Identify scope:**
   ```bash
   curl https://<project>.supabase.co/rest/v1/  -H "apikey: $ANON" -sw "%{http_code}\n"
   ```
   - 200/401 → API layer up; investigate the failing function specifically.
   - 5xx / timeout → DB layer down.

3. **Identify cause:**
   - Supabase incident on status page → wait + customer comms.
   - Self-inflicted (recent migration / index build) → roll back.

## Mitigation (immediate)

- **Display a maintenance banner** on the frontend. Set
  `engine_feature_flags.ws0_shadow_runner.mode = 'off'` if the
  shadow ledger is the dominant DB load.
- **Pause crons** to avoid retry storms when DB returns:
  ```sql
  -- Inside the Supabase SQL editor (if reachable):
  ALTER FUNCTION public._v35_register_cron RENAME TO _v35_register_cron_paused;
  -- Then re-rename back when DB is healthy.
  ```
- **Pause scraper triggers** by flipping
  `ws6_server_auth_dedup` to `off` so client-local 60s dedup
  becomes the only gate (lower load).

## Resolution

### If Supabase incident:
- Wait. Engage Supabase support via dashboard.
- Update `#engineering-incidents` Slack every 15 min until resolved.

### If self-inflicted:
- Find the offending migration in `supabase/migrations/`.
- Write a compensating migration (NEVER `DROP TABLE` on a prod data
  table — always rename to `_quarantine` and investigate).
- Apply via Supabase Studio.

## Verification

- Health probe returns **200** with `db_connectivity: ok`.
- A single synthetic audit completes successfully end-to-end.
- `slo_audit_latency_1h` view shows recovery (p95 drops back below 8s).
- 5 minutes of clean audits pass without `pipeline_runs.error_code IS NOT NULL`.

## Post-incident

- Note in incident review: total outage duration, mitigation
  effectiveness, root cause one-liner.
- If self-inflicted: file follow-up for migration guardrail (the
  migration that broke things bypassed the staging gate; figure out
  how).
- Update this runbook with anything that worked / didn't.
