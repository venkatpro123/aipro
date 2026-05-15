# System Architecture

This document is the **map**. It describes the major moving parts of
the layoff-audit platform, the data flows between them, and where each
class of failure surfaces. It is intentionally diagram-heavy — the
prose lives elsewhere (see [HYBRID_ARCHITECTURE_BLUEPRINT.md](./HYBRID_ARCHITECTURE_BLUEPRINT.md)
for the design rationale, and the [runbooks/](./runbooks/) for the
operational procedures).

If a new contributor needs to know "where does X happen," this is the
file. If they need to know "why does X happen that way," they go to
the blueprint.

## High-level: request flow

```mermaid
flowchart LR
    user[User browser]
    cdn[Vercel CDN]
    spa[React SPA]
    supabase[(Supabase Postgres)]
    edge[Supabase Edge Functions]
    fly[Fly.io scraper]
    src[External sources<br/>SEC · BLS · Glassdoor · LinkedIn · RSS]
    otlp[OTLP collector<br/>Axiom / Honeycomb]
    cron[pg_cron]

    user -->|HTTPS<br/>CSP-enforced| cdn
    cdn --> spa
    spa -->|REST<br/>RLS-scoped| supabase
    spa -->|invokeEdgeFunction<br/>request-id| edge
    spa -->|realtime channel| supabase
    edge --> supabase
    edge -->|HMAC| fly
    fly --> src
    fly -->|webhook| edge
    edge -->|JSON spans| otlp
    spa -->|JSON spans| otlp
    cron --> edge
    cron --> supabase
```

The browser bundle never talks to Fly or external scraping sources
directly — those are reached only via edge functions, which gates them
behind RLS-backed auth and HMAC. The browser is allowed to write
analytics events and reach Supabase + OTLP only.

## Component inventory

| Component | Tech | Purpose | Owner |
|---|---|---|---|
| **React SPA**      | Vite + React 18 + Plus Jakarta Sans | Audit dashboard UI                                  | App team |
| **CDN**            | Vercel                              | Edge cache + SPA shell + CSP enforcement            | Platform |
| **API gateway**    | Supabase REST + GoTrue              | Authenticated CRUD with RLS                         | Platform |
| **Edge functions** | Supabase Deno runtime               | Audit pipeline, recalibration, health, synthetic    | Platform |
| **Database**       | Supabase Postgres 15 + pg_cron      | Source of truth: outcomes, calibration, jobs        | Platform |
| **Scraper**        | Fly.io Node service                 | Outbound scraping of Glassdoor / LinkedIn / Naukri  | Data team |
| **Telemetry**      | Axiom / Honeycomb via OTLP/HTTP     | Span + log storage                                  | Platform |
| **Realtime**       | Supabase Realtime (Phoenix)         | Broadcast-style fan-out for breaking-news + audits  | Platform |

## Audit pipeline (the hot path)

```mermaid
flowchart TB
    req[Audit request from SPA]
    coalesce[audit-coalesce EF<br/>advisory-lock dedup]
    cache{Tier-A cache hit?}
    tierA[Tier-A response ≤8s<br/>cached + DB-resident]
    quorum[Quorum check<br/>liveQuorumSpec]
    scrape[scrape_jobs queue<br/>UNIQUE dedupe_key]
    fly2[Fly scraper executes]
    enrich[Live signal reconcile<br/>evidenceHierarchy tier wins]
    score[layoffScoreEngine]
    confidence[conformalCI<br/>cohort coverage]
    persist[pipeline_runs row<br/>+ layer_fallback_log]
    upgrade[Tier-A-upgraded<br/>via realtime channel]
    spa2[SPA renders]

    req --> coalesce
    coalesce --> cache
    cache -->|yes| tierA
    cache -->|no| quorum
    quorum -->|cached signals fresh| tierA
    quorum -->|stale| scrape
    scrape --> fly2
    fly2 --> enrich
    tierA --> score
    enrich --> score
    score --> confidence
    confidence --> persist
    persist --> upgrade
    upgrade --> spa2
    tierA --> spa2
```

**The 8-second budget is hard.** Anything that can't be answered within
8s falls into Tier-A-upgraded, pushed via realtime. The SPA shows the
tier transition (`Tier 2 estimate → Tier 1 confirmed`) so the user
sees the upgrade rather than waiting silently.

## Empirical truth loop

The promotion gate. New scoring logic ships behind a flag in shadow
mode; only when its outcomes match the legacy engine's coverage (or
beat it) does it become default.

```mermaid
flowchart LR
    audit[Each audit run]
    shadow[audit_shadow_comparison<br/>legacy + candidate side-by-side]
    outcomes[user_prediction_outcomes<br/>implicit + user-reported]
    detector[implicitOutcomeDetector<br/>WARN · layoffs.fyi · news]
    backtest[calibrationBacktester<br/>AUC + Brier per cohort]
    coverage[coverage_audit cron<br/>weekly]
    recal[recalibrate-engine cron<br/>weekly]
    coeff[engine_calibration_versions<br/>status: pending/active/superseded]
    drift[engine_drift_alerts]
    engine[Engine boot loads active version]

    audit --> shadow
    audit --> outcomes
    detector --> outcomes
    outcomes --> backtest
    outcomes --> coverage
    backtest --> recal
    recal --> coeff
    recal -->|AUC drop >0.05| drift
    coeff --> engine
    coverage -->|>10pp divergence| drift
    shadow -.->|gates promotion| coeff
```

The drift alert is the safety valve. If a recalibration cron produces
a worse model, it lands in `pending` state and pages on-call rather
than auto-promoting.

## Observability

Every spannable operation writes to one of three sinks:

```mermaid
flowchart LR
    layer[Layer execution]
    edge2[Edge function]
    spa3[SPA request]
    pipeline[pipeline_runs<br/>row per audit]
    fallback[layer_fallback_log<br/>row per fallback]
    otlp2[OTLP collector]
    slo[SLO views]
    burn[slo_burn_summary<br/>14.4 / 6.0 / 1.0]
    alert[Alertmanager]
    page[On-call page]

    layer -->|withSpan| otlp2
    edge2 -->|withRun| pipeline
    edge2 -->|withRun on error| fallback
    spa3 -->|otlpExporter| otlp2
    pipeline --> slo
    fallback --> slo
    slo --> burn
    burn -->|fast_burn_alert| alert
    alert --> page
```

Synthetic probes (`/functions/v1/synthetic-probe`) run every 5 minutes
and write into `synthetic_probe_results`. They feed the same SLO views,
so a synthetic failure burns budget identically to a user-facing one.

## Storage layout

```mermaid
erDiagram
    user_prediction_outcomes }o--|| audits : "outcome of"
    audit_shadow_comparison }o--|| audits : "comparison for"
    pipeline_runs }o--|| audits : "execution of"
    layer_fallback_log }o--|| pipeline_runs : "fallback during"
    engine_calibration_versions ||--o{ engine_feature_flags : "flag references version"
    scrape_jobs ||--o{ scrape_job_attempts : "has retries"
    breaking_news_events ||--o{ news_event_companies : "tags companies"
    slo_targets ||--|| slo_burn_summary : "drives"
    synthetic_probe_results ||--|| slo_burn_summary : "feeds"
    tenant_memberships }o--|| tenants : "user belongs to"
```

The columns that matter most for invariants:

- `scrape_jobs.dedupe_key` is `UNIQUE`. This is the foundation of the
  10k-concurrent-users guarantee — a stampede converges to one row.
- `engine_calibration_versions.status` is the lifecycle gate. Engine
  boot reads `status='active'` only.
- `tenant_memberships.tenant_id` is the RLS pivot for every
  user-scoped table.

## Deployment topology

```mermaid
flowchart TB
    subgraph Vercel
        prod_spa[humanproof prod SPA]
        prev_spa[humanproof preview SPAs]
        api_spa[api-server marketing site]
    end
    subgraph Supabase
        prod_db[(Postgres + RLS)]
        prod_ef[Edge function pool]
        prod_rt[Realtime cluster]
        prod_cron[pg_cron scheduler]
    end
    subgraph Fly
        fly_scraper[scraper fleet · multi-region]
    end
    github[GitHub Actions]

    github -->|on tag| prod_spa
    github -->|on PR| prev_spa
    github -->|on tag| prod_ef
    github -->|on tag| fly_scraper
    prod_spa --> prod_db
    prod_spa --> prod_ef
    prod_spa --> prod_rt
    prod_ef --> prod_db
    prod_ef --> fly_scraper
    prod_cron --> prod_ef
```

Each tagged release goes out simultaneously to Vercel, Supabase, and
Fly. Schema migrations are gated by the migration-drift CI job — a PR
that adds a SQL file without running `supabase db diff` fails CI.

## Failure-mode → runbook map

| Failure | What you see | Runbook |
|---|---|---|
| Database unreachable             | health-probe 503 on `db_connectivity`            | [db-outage](./runbooks/db-outage.md) |
| Scrape source blocked            | layer_fallback rate >5% for 15min                | [scraper-down](./runbooks/scraper-down.md) |
| Calibration AUC drops            | engine_drift_alerts row + Slack page             | [calibration-drift](./runbooks/calibration-drift.md) |
| RLS denial spike                 | repository errors with `JWT` or `42501`          | [auth-failure](./runbooks/auth-failure.md) |
| Realtime backpressure            | breaking-news event lag >30s                     | [news-flood](./runbooks/news-flood.md) |
| Quarterly / leaked key rotation  | scheduled / GitHub secret alert                  | [secrets-rotation](./runbooks/secrets-rotation.md) |
| Catastrophic data loss           | PITR-window-bound corruption / project deletion  | [DISASTER_RECOVERY](./DISASTER_RECOVERY.md) |

## v35.1 operational hardening (WS9–WS14)

The strategic transformation (WS0–WS8) made the system *empirically
honest*. v35.1 makes it *operationally observable* — every silent
fallback path, every uncalibrated constant, every concurrent-audit
race becomes visible in telemetry. The substrate added here:

```mermaid
flowchart LR
    subgraph WS9 [WS9 Calibration provenance]
        ECC[(engine_calibration_constants)]
        ECR[(engine_constant_resolutions)]
        VUE[v_uncalibrated_exposure view]
        GC[getConstant + applyCalibratedCap]
        ECC --> GC
        GC --> ECR
        ECR --> VUE
    end

    subgraph WS10 [WS10 Fallback observability]
        WF[withFallback / markFallback]
        LFL[(layer_fallback_log)]
        AB[analyticsService bounded buffer]
        WF --> LFL
    end

    subgraph WS11 [WS11 Concurrency + dedup]
        AC[AuditContext setVersioned]
        WC[writeConflicts]
        SJ[(scrape_jobs heartbeat_at)]
        SWP[scrape-job-sweeper cron]
        AC --> WC
        SWP --> SJ
    end

    subgraph WS12 [WS12 Cache + source normalisation]
        CC[cacheConfig single TTL]
        EN[evidenceHierarchy normalize]
        SA[(source_aliases)]
        EN --> SA
    end

    subgraph WS13 [WS13 Resilience mesh]
        BS[(breaker_state)]
        FWB[fetchWithBreaker Deno]
        CR[(cron_runs)]
        WCG[with_cron_guard]
        FWB --> BS
        WCG --> CR
    end

    subgraph WS14 [WS14 Request tracing]
        RA[runAudit]
        OC[observabilityConfig CSP check]
        PR[(pipeline_runs.request_id)]
        RA --> PR
    end

    GC --> WF
    WF --> SJ
```

**Cross-cutting CI gate:** `scripts/check-architecture-rules.mjs`
enforces five regression-prevention rules:

| Rule | Pattern flagged | Severity |
|---|---|---|
| R1 | Direct `supabase.functions.invoke()` outside `invokeEdgeFunction` | HARD |
| R2 | Silent `.catch(() => null/undefined/{})` | SOFT (advisory) |
| R2-strict | `.catch(() => 0.<digits>)` numeric fallback | HARD |
| R3 | `fetch()` in `services/**` without circuit breaker | HARD |
| R4 | Uncalibrated `0.XY` literals in Engine/Service/Builder files | SOFT (advisory) |
| R5 | `Math.max\|min` / `+` / `*` on `confidence`/`risk`/`weight` outside calibration | HARD |

Soft rules surface review-worthy patterns without blocking merges;
hard rules fail CI. Allowlist via `// arch-allow:R<n>` comment when
the rule is over-eager for a specific line.

## What this document does NOT cover

- **Per-layer scoring math** — see the source of each layer; the
  contract is the layer's input + output schema.
- **Per-component code structure** — see `src/services/` for the
  scoring graph; `supabase/functions/` for each edge function.
- **Per-feature product UX** — see Figma / PRD docs.
- **Why the architecture is this way** — see
  [HYBRID_ARCHITECTURE_BLUEPRINT.md](./HYBRID_ARCHITECTURE_BLUEPRINT.md).

This file is the **what** and **where**. The **why** lives elsewhere
on purpose — the diagrams are stable across multiple "why" rewrites.
