# Feature Flag Promotion Playbook

This is the operational runbook for promoting a feature flag from
`shadow` → `canary` → `production`. Every promotion is gated on
empirical evidence captured during the previous mode.

If you are not the on-call engineer for the affected workstream, talk
to them before promoting. **Reverting is cheap; over-promoting is not.**

---

## TL;DR — what to ship today

1. Check `audit_shadow_comparison` for the relevant flag's shadow window.
2. Verify the SLO dashboard shows green for the SLOs the flag affects.
3. Promote with a written reason → `CalibrationPanel` admin UI OR direct SQL.
4. Watch the affected dashboards for 30 minutes.
5. Either confirm or roll back. Don't leave a half-promoted flag overnight.

---

## Step-by-step

### Phase 0 — preconditions

Before considering a promotion to **canary**:

- [ ] Flag has been in `shadow` mode for **at least 7 days** in production.
- [ ] At least **500 audits** ran with the candidate path in shadow.
- [ ] The CI gate (`scripts/check-migration-drift.mjs`) is green
      against the target environment.
- [ ] No open `engine_drift_alerts` rows from the affected scope.
- [ ] The on-call engineer for this workstream has been pinged in
      the promotion thread.

### Phase 1 — read the evidence

Open the `ShadowComparisonPage` admin UI. Filter to the relevant cohort
(if cohort-specific) and the past 7 days.

**Promotion-blocking signals:**

| Metric | Acceptable | Blocks promotion |
|---|---|---|
| Score delta p50 | within ±3 pts | > 5 pts |
| Score delta p95 abs | < 10 pts | > 15 pts |
| Tier migrations | < 5% of audits | > 10% |
| Mean confidence delta | within ±3 pp | > 8 pp |
| Candidate engine error rate (`pipeline_runs` where `error_code IS NOT NULL`) | < 0.5% | > 2% |

If any column is red, **stop here**. Either:
- Wait another week to see if the signal stabilises, OR
- File a bug report against the workstream owner.

### Phase 2 — promote to canary (10%)

Once Phase 1 is green:

```sql
UPDATE engine_feature_flags
   SET mode = 'canary',
       canary_pct = 10,
       last_changed_by = auth.uid(),
       last_changed_reason = '<your reason — 1-2 sentences>'
 WHERE flag_key = '<flag>';
```

Or use the `CalibrationPanel` "Promote" button on a calibration version
row (for WS8 version promotions specifically).

The `trg_engine_flag_change` trigger automatically writes a history row
to `engine_feature_flag_history`. Verify the row appeared:

```sql
SELECT to_mode, to_canary_pct, reason, changed_at
  FROM engine_feature_flag_history
 WHERE flag_key = '<flag>'
 ORDER BY changed_at DESC
 LIMIT 1;
```

### Phase 3 — observe canary for 30 minutes

Open every SLO dashboard listed in `docs/slo/README.md`:

- [ ] **SLO #1 (audit latency)**: p95 < 8s. If it spikes, the candidate
      path may be slower than legacy.
- [ ] **SLO #2 (layer fallback)**: no spike above 3% on any layer.
- [ ] **SLO #5 (shadow delta)**: should be stable from the pre-promotion
      window.

Watch the **`ShadowComparisonPage`** for the live audit stream. The
filter is `mode='canary'`; you should see ~10% of audits flowing
through the candidate path.

If anything looks wrong → **immediate rollback** (see below). Do not
wait the full 30 minutes.

### Phase 4 — ramp 10% → 50% → 100%

Each ramp is the same SQL `UPDATE` with `canary_pct` raised. Between
ramps:

| From → To | Wait at the new ratio | Sample size target |
|---|---|---|
| 10% → 50% | 4 hours | ≥ 200 canary audits |
| 50% → 100% (mode='production') | 12 hours | ≥ 800 canary audits |

### Phase 5 — finalise

After 24 hours at `production`, flip the legacy code path's "kill
switch" import comment (in `auditDataPipeline.ts`) so future engineers
know the candidate is the source of truth.

**Do NOT delete the legacy path for at least 30 days.** A regression
can require a fast revert; deletion is a one-way door.

---

## Rollback

At any phase, rollback is a single SQL update:

```sql
UPDATE engine_feature_flags
   SET mode = 'off',                         -- or 'shadow' if you want continued comparison
       canary_pct = 0,
       last_changed_reason = 'rollback: <what went wrong>'
 WHERE flag_key = '<flag>';
```

The 60-second client snapshot cache means every user is on the legacy
path within 60s. The `audit_shadow_comparison` row count stops
reflecting the candidate path roughly that quickly.

After a rollback:

1. **Open a bug** against the workstream owner with the
   `audit_shadow_comparison` rows that exhibited the regression.
2. **Do not re-promote** without addressing the root cause. A
   "let's just try again" promotion has been the source of every
   production incident from this system.

---

## Common gotchas

* **Flags don't propagate instantly.** The 60s client snapshot cache
  means the first minute after a promotion is a transition window.
  Don't compare metrics from that window against the new mode.
* **Tenant-scoped behavior.** When a flag's behavior depends on
  `tenantId`, verify the canary cohort covers multiple tenants — a
  single-tenant canary is not representative.
* **Re-running the cron after promotion.** If the flag affects what
  the recalibration cron writes (e.g. WS8 calibration version
  promotion), wait for the next scheduled run before declaring
  success. Manual cron triggers count, but don't override the next
  scheduled write.
* **The kill switch is OFF, not the original.** Setting `mode='off'`
  on a flag whose candidate-path code still exists routes back to
  legacy. It does NOT delete the candidate code. Use `mode='deprecated'`
  to permanently retire a flag (preserves history; never resolves to
  active).

---

## Who to page

| Workstream | Owner (primary) | Backup |
|---|---|---|
| WS2 (calibration) | calibration lead | platform lead |
| WS3 (evidence) | data quality lead | calibration lead |
| WS4 (confidence) | calibration lead | platform lead |
| WS5 (swarm) | intelligence lead | platform lead |
| WS6 (scaling) | platform lead | infra lead |
| WS7 (consolidation) | platform lead | tech lead |
| WS8 (recalibration cron) | calibration lead | tech lead |

Fill in actual names once the org chart stabilises. For now,
`#engineering-oncall` Slack handles every promotion.

---

## Audit trail

Every promotion creates one row in `engine_feature_flag_history`. The
`reason` field is mandatory; an empty `reason` is grounds for a
follow-up question from the on-call reviewer.

For high-stakes promotions (any flag in WS2 / WS4 / WS8), attach the
backtest evidence in the `backtest_evidence` JSONB column:

```sql
UPDATE engine_feature_flag_history
   SET backtest_evidence = jsonb_build_object(
     'auc_delta',     0.012,
     'coverage_at_90', 0.91,
     'n_audits',      2400,
     'p95_score_delta', 6
   )
 WHERE id = <history row id>;
```

This is the record auditors will reference when asked "why did you
promote this flag with X effect?"
