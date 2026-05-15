# Runbook: Secrets rotation

The DR doc covers the *emergency* case ("a secret leaked, rotate it
right now"). This runbook covers the *routine* case: quarterly key
rotation as a hygienic practice. The procedure is the same; the only
difference is that you get to schedule a maintenance window instead of
discovering the leak from a GitHub alert.

## When this runs

| Trigger | Cadence | Window | Owner |
|---|---|---|---|
| Quarterly rotation                       | Every 90 days     | Sun 23:00–01:00 UTC | Platform on-call |
| `gitleaks` / Dependabot secret-scan alert | On detection      | Within 4h           | Platform on-call |
| Off-boarding (engineer with secret access)| Within 24h of exit | Same-day            | Tech lead |
| Vendor breach disclosure                  | Within 4h         | Immediate           | Platform on-call |

## Inventory: what gets rotated

| Secret | Where it lives | Rotation method | Blast radius |
|---|---|---|---|
| Supabase `anon` key             | Vercel env + browser bundle | Dashboard → API → roll | Every signed-out fetch fails until clients reload |
| Supabase `service_role` key     | Vercel env + edge functions | Dashboard → API → roll | Every cron + edge function fails until env updated |
| Supabase `SUPABASE_JWT_SECRET`  | Supabase auth + every client | Dashboard → JWT secret → rotate | Every active session invalidated — users must sign in again |
| OpenRouter API key              | Vercel env                  | OpenRouter dashboard → revoke + reissue | LLM-backed agents fall back to heuristic |
| Fly.io scraper HMAC             | Fly secret + supabase edge env | `fly secrets set` + Supabase Vault | Scraper requests rejected until both sides updated |
| GitHub Actions deploy token     | Repo secrets                 | GitHub settings → tokens | Next CI run fails until rotated |
| pg_cron `service_role` claim    | DB GUC `app.service_role_jwt` | SQL `ALTER DATABASE ... SET` | Crons fail at next firing |
| OTLP exporter bearer (if used)  | Vercel env + Vault           | Provider dashboard       | Telemetry blackhole until updated (alerting goes quiet — dangerous) |

## Procedure: routine rotation

**Pre-flight (T-24h):**

1. Announce the window in `#platform`. Pin the message.
2. Verify staging is healthy — green health probe, no open drift alert.
3. Confirm you have admin on: Supabase, Vercel, Fly, GitHub, OpenRouter.
4. Take a manual PITR snapshot tag in Supabase (defense in depth).

**Execution:**

1. **Rotate `service_role` first** (highest-blast-radius, must succeed).
   - Supabase dashboard → API → roll `service_role`.
   - Update `SUPABASE_SERVICE_ROLE_KEY` in Vercel project env (Preview + Production).
   - Update Supabase function secrets:
     ```bash
     supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<new>
     ```
   - Update `app.service_role_jwt` GUC for pg_cron:
     ```sql
     ALTER DATABASE postgres SET app.service_role_jwt = '<new>';
     ```
   - Trigger a Vercel redeploy of the latest production deployment.
   - Verify: hit `/functions/v1/health-probe` — must return 200.

2. **Rotate `anon` key.**
   - Supabase dashboard → API → roll `anon`.
   - Update `VITE_SUPABASE_ANON_KEY` in Vercel env.
   - Redeploy frontend.
   - Verify: incognito window → load app → confirm `/auth/v1/token` returns 200.

3. **Rotate `SUPABASE_JWT_SECRET`** (most disruptive — every user signs in again).
   - Only do this if scheduled, or if the secret is confirmed leaked.
   - Supabase dashboard → JWT secret → rotate.
   - Notify users via banner before the window.
   - Verify: existing tokens rejected (test in incognito with a saved cookie).

4. **Rotate vendor keys (OpenRouter, Fly HMAC, OTLP):**
   - For each: revoke old, issue new, update Vercel/Fly/Supabase env in that order, redeploy.
   - For Fly HMAC the receiver must accept BOTH old and new for a 10-min overlap window — see the dual-key code path in
     [scraperTrigger.ts](../../src/services/scraperTrigger.ts) and the matching Fly env vars `HMAC_SECRET` + `HMAC_SECRET_PREV`.

5. **Rotate GitHub Actions tokens.**
   - GitHub → Settings → Developer settings → tokens → roll.
   - Update repo secrets.
   - Trigger a manual workflow run to verify.

**Post-rotation (T+1h):**

- Confirm green health probe, green synthetic probe, no spike in `auth.audit_log_entries` errors.
- Confirm `slo_burn_summary` shows no fast-burn alert.
- Capture the rotation in the secrets log (private team wiki):
  rotation timestamp, who did it, any anomalies.

## Procedure: emergency rotation (leaked key)

Same as routine, EXCEPT:

- Skip the staging dry-run — the bleeding is happening now.
- Do `service_role` and `anon` simultaneously (parallelize across two
  engineers — one on Vercel env, one on Supabase dashboard).
- Skip the user-visible banner before rotating JWT secret if the leaked
  key allowed session impersonation; degraded UX (force-relogin) is
  better than leaving an impersonation window open.
- File a P1 incident immediately, even if mitigation completed
  successfully. The leak itself is the incident — rotation is the fix.
- Audit `auth.audit_log_entries` for the exposure window (commit
  timestamp → now). Anomalous logins → freeze affected users.

## Dual-key overlap (Fly HMAC only)

Some keys benefit from a brief overlap window so neither side breaks
during propagation. Fly HMAC is the one we currently support:

```typescript
// scraperTrigger.ts — accepts EITHER current or previous secret
const valid = constantTimeEqual(sig, expectedCurrent)
           || constantTimeEqual(sig, expectedPrev);
```

The procedure is:

1. Set `HMAC_SECRET_PREV` on both sides to the current value.
2. Set `HMAC_SECRET` on both sides to the new value.
3. Wait 10 minutes for in-flight requests to drain.
4. Unset `HMAC_SECRET_PREV` on both sides.

For Supabase `service_role` and `anon` keys, dual-key overlap is NOT
supported by the platform — propagation must be <60s and accepted as a
brief window of edge-function failures.

## Verification

After ANY rotation:

- [ ] `/functions/v1/health-probe` returns 200 with all 7 checks passing.
- [ ] `/functions/v1/synthetic-probe` returns 200.
- [ ] No spike in `layer_fallback_log` over the 30 min following rotation.
- [ ] No spike in `auth.audit_log_entries` errors.
- [ ] A manual signed-out → signed-in → run-audit flow completes end-to-end.
- [ ] Rotation logged in team wiki with timestamp and outcome.

## What this runbook does NOT cover

- **OS-level secrets** on developer laptops — those are individual responsibility.
- **Database password rotation** — Supabase manages this; do not change it directly.
- **CI environment secrets in forked PR previews** — those use ephemeral keys scoped to preview deploys.
- **Customer-issued API tokens** (if/when we expose them) — that's a separate per-tenant flow.

## Related

- [DISASTER_RECOVERY.md](../DISASTER_RECOVERY.md) — Scenario 3 covers
  the leaked-secret case as a DR event.
- [ONCALL.md](../ONCALL.md) — escalation tree for paging the platform owner.
