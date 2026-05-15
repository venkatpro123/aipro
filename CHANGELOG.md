# Changelog

All notable changes to this project are documented here. We follow
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) loosely
and [Semantic Versioning](https://semver.org/) for any package
published from this repo.

For a granular history, run `git log`. This file is the human-
readable layer: what changed, why it mattered, what users should do.

## How to write a changelog entry

When you ship a PR with user-visible impact, add a line under
`[Unreleased]` in the appropriate subsection. Use these subsections:

- **Added** — new capabilities.
- **Changed** — behavioural changes to existing capabilities.
- **Deprecated** — capabilities marked for removal in a future release.
- **Removed** — capabilities deleted in this release.
- **Fixed** — bug fixes.
- **Security** — vulnerabilities fixed. Reference advisory IDs if
  the disclosure is public.

Style:
- One line per entry, present tense ("Add", "Fix"), past-tense
  passive avoided.
- Include the PR number in parens: `(#1234)`.
- Reference the migration / ADR if relevant.
- Avoid jargon. The audience is a user, not a contributor.

Cutting a release moves `[Unreleased]` to a new dated section with a
version number. The platform team handles this; do not edit dated
sections retroactively.

---

## [Unreleased]

### Added — v35.1 operational hardening (WS9–WS14)

**Calibration provenance (WS9, ADR 0009)**
- `engine_calibration_constants` table + `calibration_provenance`
  enum (`regression | grid_search | manual_seed | uncalibrated_placeholder`).
- `getConstant()` + `applyCalibratedCap()` loader with bootstrap
  fallback when DB row is absent.
- `v_uncalibrated_exposure` view — fraction of audits depending on
  uncalibrated constants. WS9 acceptance gate: <5%.
- 32 constants seeded (25 initial + 7 fan-out): layoff bands, AI
  displacement, sector floors, spread thresholds, swarm caps,
  career-contingency confidence, peer-contribution weights, recency
  decay bands, CEO/culture/attrition risk records, headcount
  consensus multipliers.

**Silent-fallback observability (WS10)**
- `withFallback()` + `markFallback()` wrapper (browser + Deno) writes
  to `layer_fallback_log` with typed `FallbackReason`.
- Critical silent fallbacks rewired:
  `liveDataService.ts:1656` (critical financial gap),
  `engineShadowRunner.ts:127` (confidence 0.5 → DB-resolved 0.30),
  `auditDataPipeline.ts:624` (live-quorum failure),
  `liveDataService.ts:546` (scrape pipeline failure).
- `analyticsService.bufferedEvents` hard-capped at 200 with
  `getBufferedEventsDropped()` counter + `shutdown()` cleanup.

**Concurrency + dedup integrity (WS11)**
- `AuditContext.setVersioned` / `getVersion` / `collectWriteConflicts`
  + `WriteConflictError` class for optimistic-concurrency DAG writes.
- `RegistryExecutionResult.writeConflicts` surfaces double-emits to
  the shadow runner.
- `scrape_jobs` partial unique index on `dedupe_key WHERE NOT NULL` +
  NOT NULL CHECK + `heartbeat_at` / `started_at` / `attempt_seq`
  columns + stamp trigger.
- `scrape-job-sweeper` edge function (1-min cron) reaps zombie
  `running` jobs with stale heartbeats.

**Cache + source normalisation (WS12)**
- `cacheConfig.ts` — single 30-min TTL truth for local + remote +
  freshness gate.
- `analysisCache.ts` local-TTL preservation fix (was resetting on
  every Supabase hit → indefinite freshness).
- `evidenceHierarchy.normalizeSourceName` + `source_aliases` table
  with 27 seed rows (yahoo-finance / wikipedia / glassdoor / news
  variants).
- `STALE_SEED_DATE` migrated from hardcoded `2025-01-01` to a
  computed 365-days-ago value across 3 services.

**Resilience mesh (WS13)**
- `breaker_state` table with `breaker_record_outcome` +
  `breaker_may_probe` RPCs. 16 host registrations seeded.
- `fetchWithBreaker` Deno helper (`AbortSignal.timeout(8000)` +
  shared DB state).
- `cron_runs` telemetry + `with_cron_guard` (advisory lock + SLA
  breach detection). Applied to `recalibrate-engine`,
  `coverage-audit`, `ingest-breaking-news`, `outcome-ingestion`.
- `slo_cron_health_24h` view.

**Request tracing + concurrent-audit safety (WS14)**
- `runAudit(label, fn)` entry point in `infrastructure/requestId.ts`
  mints a fresh UUID and binds via `withRequestId`.
- `LayoffCalculator.handleCalculate` wraps the pipeline call in
  `runAudit` so every `invokeEdgeFunction` reaches the same trace.
- `observabilityConfig.validateObservabilityConfig` — boot-time CSP
  / OTLP allowlist check.
- `pipeline_runs.request_id` promoted to first-class column with
  backfill from `meta->>'request_id'` legacy path.
- 6 contract tests in `requestIdContext.test.ts`.

**Edge-function instrumentation (WS10 + WS11)**
- `withRun` wraps applied to `fetch-company-data`, `proxy-live-signals`,
  `proxy-macro`, `calculate-hybrid-risk` — pipeline_runs row per
  invocation tagged with `x-request-id`.
- 19 frontend sites converted from `supabase.functions.invoke()` to
  `invokeEdgeFunction()` (3 in initial pass + 16 in fan-out).

**CI architecture-rules**
- `scripts/check-architecture-rules.mjs` — 5 rules (R1 / R2 / R2-strict
  / R3 / R4 / R5). HARD rules fail CI; SOFT rules emit advisories.
- Wired into `.github/workflows/ci.yml` after vitest.

**Production deploys**
- 33 migrations pushed to project `ysenimczeasmaeojzlkt`.
- Fixed `engine_feature_flags` BEFORE-INSERT FK ordering trigger bug
  (split into BEFORE UPDATE + AFTER INSERT OR UPDATE).
- Remediation migration `20260611000004_remediation_pipeline_runs.sql`
  recreated the table when `schema_migrations` claimed it applied
  but it was missing from public schema.
- 26 edge functions deployed; `health-probe` + `synthetic-probe`
  configured `verify_jwt = false`; `health-probe.migrations_applied`
  check redirected from `supabase_migrations.schema_migrations`
  (inaccessible to PostgREST) to a public-schema proxy via
  `engine_calibration_constants` row count.

**ADRs**
- ADR 0009 — "Confidence-affecting constants live in DB, not in code".

### Added — v35.0 strategic transformation
- ADR directory with 8 starter records covering the major
  architectural decisions of the v35 transformation.
- `CONTRIBUTING.md` covering prerequisites, workspace layout, and
  day-to-day commands.
- `SECURITY.md` describing the responsible-disclosure path.
- `CHANGELOG.md` (this file).
- `.github/CODEOWNERS` for automated review routing on
  RLS/auth/scoring paths.
- Privacy / right-to-be-forgotten runbook
  (`docs/runbooks/privacy-data-deletion.md`).
- Mermaid architecture diagrams (`docs/ARCHITECTURE.md`).
- Index audit migration
  (`20260614000001_index_audit_for_slo_and_privacy.sql`) closing
  indexing gaps surfaced by the SLO views and privacy runbook.
- Secrets rotation runbook
  (`docs/runbooks/secrets-rotation.md`).
- DAG chaos test (`dagChaos.test.ts`) — random failure injection
  with seeded mulberry32 PRNG.
- Synthetic probe edge function + cron + table; error-budget
  burn-rate views per the Google SRE multi-window thresholds.
- Deno OTLP exporter wired into `_shared/logger.ts`.
- CSP + security headers in `vercel.json` for both humanproof and
  api-server deploys.

### Changed
- `_shared/logger.ts` now ships every non-debug log line through
  the OTLP exporter in addition to stdout.

### Security
- Strict CSP enforced on both Vercel deploys with explicit
  `connect-src` allowlist.

---

## Previous releases

Historical release notes have not been formalised in this file.
Refer to the auto-memory entries in
`~/.claude/projects/c--supabase/memory/MEMORY.md` for a
chronological summary of pre-v35 work, including:

- v9 → v34 — Intelligence-upgrade releases (legacy)
- v35 — Empirical trustworthiness transformation (current)

Releases prior to `[Unreleased]` will be retroactively populated as
the team cuts the first numbered release from this file.

---

## Release notation reference

When the first dated release is cut, the format is:

```markdown
## [1.0.0] — 2026-MM-DD

### Added
- ...

### Changed
- ...

### Fixed
- ...
```

Diff links go at the bottom of the file:

```markdown
[Unreleased]: https://github.com/<org>/<repo>/compare/v1.0.0...HEAD
[1.0.0]:      https://github.com/<org>/<repo>/releases/tag/v1.0.0
```
