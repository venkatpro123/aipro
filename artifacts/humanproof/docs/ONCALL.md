# On-Call Rotation + Escalation

This document defines who answers the page when production breaks
and how an incident escalates if the primary responder is unavailable.

## Rotation

Weekly rotation, Monday 00:00 UTC – Sunday 23:59 UTC.

The rotation is maintained in PagerDuty (or your alerting tool of
choice). This document is the human-readable mirror; the source of
truth is the tool. If they disagree, the tool wins.

| Week ending | Primary | Backup | Notes |
|---|---|---|---|
| _populated by the rotation tool_ | | | |

### Engineers on rotation

| Engineer | Domain expertise | Availability |
|---|---|---|
| _Platform Lead_ | Pipeline / DB / infra | M-F + emergency weekend |
| _Calibration Lead_ | Model math / cohorts / drift | M-F |
| _Data Quality Lead_ | Scrapers / evidence hierarchy | M-F |
| _Intelligence Lead_ | Swarm / layers | M-F + emergency weekend |
| _Tech Lead_ | Cross-cutting + final escalation | 24/7 |

Engineers join the rotation after:
1. Reading [CONTRIBUTING.md](../CONTRIBUTING.md), [PROMOTIONS.md](./PROMOTIONS.md),
   [DISASTER_RECOVERY.md](./DISASTER_RECOVERY.md), and all
   [runbooks/](./runbooks/).
2. Shadowing two real incidents.
3. Successfully completing one incident drill solo (with the prior
   on-call observing).

## Escalation tree

```
Alert fires
   │
   ▼
Primary on-call (PagerDuty page)
   │
   ├─ acknowledges within 5 min  ─→ runs the relevant runbook
   │
   └─ does NOT acknowledge in 5 min
        │
        ▼
   Backup on-call (PagerDuty escalation)
        │
        ├─ acknowledges within 5 min  ─→ runs the runbook
        │
        └─ does NOT acknowledge in 5 min
             │
             ▼
        Tech Lead (final escalation)
             │
             └─ acknowledges always
```

If the page is unrecognised by the on-call's runbooks, the on-call
escalates UP the tree (not to a peer). This guarantees the most
context-aware person sees the incident.

## When to page on-call vs file a ticket

**Page on-call** when:
- A user-facing SLO breaches and you can't fix it within 15 minutes.
- Any CRITICAL drift alert fires.
- The health probe returns 503.
- A security signal fires (auth anomaly, RLS denial spike, secret leak).

**File a ticket** (do NOT page) when:
- A warn-level SLO breach that's been pre-flagged for the next sprint.
- A non-blocking feature degradation (one layer falls back; audit
  still completes).
- An open drift alert that's been triaged and parked.
- A planned maintenance window.

## What the on-call does NOT do

- **Ship features.** Incident response only. If you find yourself
  writing new code, you're not on incident — you're in development.
- **Promote feature flags.** That's the workstream owner's call,
  even during an incident — unless the promotion IS the mitigation
  documented in the runbook.
- **Communicate with customers directly.** Loop in comms / support.

## Handoff

End of shift Sunday 23:59 UTC. The outgoing on-call posts in
`#engineering-oncall`:

1. Any open incidents the next person inherits.
2. Any alert tuning done this week (and why).
3. Any runbook updates needed (file a PR if you have time).

The incoming on-call confirms they've read the handoff before
01:00 UTC Monday.

## Drills

The on-call rotation runs a drill on the first Monday of each month.
Scenarios rotate through the disaster recovery scenarios documented
in [DISASTER_RECOVERY.md](./DISASTER_RECOVERY.md) and through the
incident runbooks.

Drill results go in:
- The drill's own retrospective doc (Confluence / Notion / wherever).
- Updates to the relevant runbook if the drill exposed a gap.
- A "lessons learned" entry in `#engineering-incidents` Slack.
