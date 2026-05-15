# Runbook: Unknown symptom

When the symptom doesn't match any specific runbook, work the decision
tree below from top to bottom. Each step is a 1-3 minute check.

## Decision tree

```
Did SLO #1 (audit latency) breach?
├─ YES + DB is reachable → use news-flood.md (mass load) or
│                          calibration-drift.md (slow recalibration)
└─ NO  → continue
   │
Did SLO #2 (layer fallback) breach?
├─ YES + same source class on every fail → scraper-down.md
├─ YES + diverse sources fail            → db-outage.md (cascading)
└─ NO  → continue
   │
Did SLO #3/#4 (calibration coverage / drift alerts) breach?
├─ YES → calibration-drift.md
└─ NO  → continue
   │
RLS / auth errors in the log aggregator?
├─ YES → auth-failure.md
└─ NO  → continue
   │
Synthetic probe (health-probe) failing on a specific check?
├─ db_connectivity → db-outage.md
├─ recalibrate_cron → calibration-drift.md
├─ outbox_lag      → check engine_events for stuck consumers
└─ recent_audits   → no traffic; not an incident
   │
None of the above → escalate to platform lead.
```

## Universal first-5-minute checks

Regardless of symptom:

1. **Check Supabase status:** https://status.supabase.com
2. **Check the deployed release:** is there a recent deploy?
   ```bash
   git log --oneline -5 main
   ```
3. **Open the health probe:** `curl https://<project>.supabase.co/functions/v1/health-probe`
4. **Check the latest open drift alerts:**
   ```sql
   SELECT * FROM engine_drift_alerts WHERE status = 'open' ORDER BY created_at DESC LIMIT 5;
   ```
5. **Scan the structured log for the last 5 min of error-level records:**
   In your log aggregator: `level:error AND service:audit-pipeline | last 5m`.

## When in doubt: roll back

If the symptom appeared right after a deploy:

```bash
# Identify the last good commit:
git log --oneline -10 main

# Revert the suspect commit:
git revert <sha>

# Push to trigger redeploy:
git push origin main
```

Rolling back is cheap; staying broken while debugging is expensive.

## When you genuinely don't know

Page the platform lead. State explicitly:
- What you've checked.
- What's still mysterious.
- The blast radius (how many users affected).

The platform lead's job is to know what's possible when the obvious
runbooks don't apply. That's why they're on the escalation list.
