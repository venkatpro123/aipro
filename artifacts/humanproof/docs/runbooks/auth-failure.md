# Runbook: Authentication / RLS failure

## Symptom

- Mass login failures (spike in `auth.audit_log_entries` with action
  `login` and `error_code` non-null).
- Spike in `RepositoryError(code='unauthorized')` in the log
  aggregator.
- RLS denial errors (`code='42501'` in pipeline_runs) on user-data
  tables.
- Users report "I'm signed in but the dashboard is empty."

## Diagnosis (5 minutes)

1. **Is the supabase auth API itself up?**
   ```bash
   curl https://<project>.supabase.co/auth/v1/health
   ```
   - 200 → auth API up; problem is elsewhere.
   - 5xx → Supabase auth incident; mitigate via banner, wait.

2. **Did a migration touch RLS recently?**
   ```bash
   ls -t supabase/migrations/*.sql | head -5
   grep -l "ENABLE ROW LEVEL SECURITY\|CREATE POLICY" \
        $(ls -t supabase/migrations/*.sql | head -10)
   ```

3. **Are the RLS tests passing?**
   ```bash
   pnpm --filter humanproof test src/__tests__/integration/rlsIsolation.test.ts
   ```
   Against staging — if these fail you've found the bug.

4. **Look at the denials:**
   ```sql
   SELECT layer_id, error_message, COUNT(*)
   FROM layer_fallback_log
   WHERE created_at >= NOW() - INTERVAL '30 minutes'
     AND (error_message LIKE '%JWT%' OR error_message LIKE '%row-level security%')
   GROUP BY layer_id, error_message
   ORDER BY COUNT(*) DESC;
   ```

## Mitigation (immediate)

- **If a bad RLS policy is suspected** and you can identify which
  migration introduced it, **DO NOT** drop the policy in production
  without thinking — that opens the table to anyone authenticated.
- Instead, write a compensating migration that REPLACES the broken
  policy with the corrected one, atomically:
  ```sql
  BEGIN;
  DROP POLICY IF EXISTS "<broken_policy>" ON public.<table>;
  CREATE POLICY "<broken_policy>" ON public.<table>
    FOR SELECT USING (auth.uid() = user_id);
  COMMIT;
  ```

- If a JWT rotation broke clients, force a re-login:
  ```sql
  -- Invalidate all current refresh tokens.
  UPDATE auth.refresh_tokens SET revoked = true;
  ```
  This forces every user to sign in again — only do it if you're sure
  the issue is a stale-token problem.

## Resolution

### Bad RLS policy:
- Compensating migration as above.
- Add the failure case to `rlsIsolation.test.ts`.
- Run the test against the staging env.

### Auth service incident:
- Wait. Surface a maintenance banner. Update incident channel.

### Stale JWT secret rotation:
- If you rotated `SUPABASE_JWT_SECRET` without rolling out the
  matching `anon` / `service_role` keys, every existing client
  rejects. Roll the JWT secret back via Supabase dashboard.

## Verification

- `rlsIsolation.test.ts` passes against the affected env.
- 5 minutes of clean audits with zero RLS denial in
  `layer_fallback_log`.
- Manual test: log in as a fresh user, run an audit, confirm the
  user can read only their own `user_prediction_outcomes` rows.

## Post-incident

- File an RLS regression test for the specific failure (already done
  if it was the bad-policy case).
- If a policy change deployed without RLS tests running first, fix the
  CI workflow to require the RLS integration suite for any PR
  touching `supabase/migrations/*RLS*` or `*POLICY*`.
