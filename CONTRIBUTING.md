# Contributing

This document is the **smallest set of steps** to get from a fresh
clone to a green test run, plus the conventions the team relies on.
If something here is wrong or out of date, fix it in the PR you're
working on — this file is read more often than any other.

## Prerequisites

| Tool       | Version              | Why |
|---|---|---|
| Node       | 22.x (LTS)           | Vite + Vitest target |
| pnpm       | 10.33.0 (pinned)     | Workspace package manager — `corepack enable` will install the pinned version |
| Deno       | 1.x                  | Local edge-function dev only — production runs on Supabase's Deno runtime |
| Supabase CLI | latest             | Migrations, edge-function deploy, type generation |
| Docker     | running daemon       | Required by Supabase CLI to spin up the local stack |
| Git        | any recent           | Source control |

We use `corepack` to pin pnpm. Run `corepack enable` once after
installing Node and pnpm will be installed at the right version on
first use.

## First-time setup

```bash
git clone <repo-url>
cd humanproofs1
corepack enable                 # pins pnpm to the version in package.json
pnpm install                    # installs every workspace
cp artifacts/humanproof/.env.example artifacts/humanproof/.env.local  # if the example exists
```

Fill `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in
`.env.local` from the team's staging project (ask in `#platform`).
Without these the SPA boots but auth is disabled and the dashboard is
empty.

### Optional: local Supabase stack

You only need this if you're touching migrations, RLS, or edge
functions:

```bash
cd supabase
supabase start                  # spins up Postgres + Auth + Edge in Docker
supabase db reset               # applies every migration to the local stack
```

The frontend will use the local stack instead of staging if you point
`VITE_SUPABASE_URL` at `http://localhost:54321`.

## Workspace layout

```
artifacts/
  humanproof/         React SPA — the audit dashboard
  api-server/         Vercel-hosted marketing + redirect surface
  scraper/            Fly.io scraper service
  mockup-sandbox/     Design playground, not deployed
lib/
  shared-domain/      Code shared by browser + Deno edge functions
supabase/
  migrations/         SQL migrations, applied in filename order
  functions/          Deno edge functions
docs/
  ARCHITECTURE.md     The system map
  DISASTER_RECOVERY.md
  HYBRID_ARCHITECTURE_BLUEPRINT.md
  ONCALL.md
  PROMOTIONS.md
  adr/                Architecture Decision Records
  runbooks/           Symptom-to-procedure incident docs
  slo/                SLO catalogue + SQL queries
```

If you don't know where to put a new file, the rule of thumb is:

- Pure domain logic → `artifacts/humanproof/src/services/`
- Component → `artifacts/humanproof/src/components/`
- Code shared with edge functions → `lib/shared-domain/`
- Edge function → `supabase/functions/<name>/`
- SQL → `supabase/migrations/<YYYYMMDDHHMMSS>_<purpose>.sql`

## Day-to-day commands

```bash
# Development
pnpm dev                                # all workspaces, parallel
pnpm --filter @workspace/humanproof dev # frontend only

# Tests
pnpm --filter @workspace/humanproof test           # vitest run
pnpm --filter @workspace/humanproof test:watch     # watch mode
pnpm --filter @workspace/humanproof test src/__tests__/unit/dagChaos.test.ts

# Type check
pnpm typecheck                          # everything
pnpm --filter @workspace/humanproof typecheck

# Build
pnpm --filter @workspace/humanproof build
pnpm --filter @workspace/humanproof build:check    # build + bundle size budget

# Bundle size budget standalone
pnpm --filter @workspace/humanproof bundle:size

# Migrations (against the local Supabase stack)
supabase db reset                       # rebuild from scratch
supabase db diff                        # detect drift between code and DB

# Edge functions
supabase functions serve <name>         # local invocation
supabase functions deploy <name>        # staging deploy
```

## Branching and PRs

- **Default branch:** `main`. Always green: PRs must pass CI to merge.
- **Branch naming:** `<initials>/<short-kebab-summary>` (e.g.
  `lvr/dag-chaos-test`). No long-lived feature branches — rebase or
  ship.
- **PR size:** target <400 LOC of diff. Bigger PRs get split unless
  the reviewer agrees up front; the cost of reviewing 1000-line PRs
  is paid in latent bugs.
- **PR description:** every PR uses
  [.github/PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md).
  The architectural checkboxes are not optional.
- **Commits:** squash on merge. Each merged commit corresponds to one
  PR. Title format: `area: imperative summary`
  (e.g. `pipeline: add chaos test for DAG executor`).
- **Reviews:** one approval required. For changes touching auth,
  RLS, billing, or scoring math, two approvals.

## What runs in CI

See [.github/workflows/](.github/workflows/) for the full list. The
required jobs are:

| Job             | What it checks |
|---|---|
| `typecheck`     | `pnpm typecheck` clean across all workspaces |
| `test`          | `pnpm --filter @workspace/humanproof test` green |
| `migrations`    | `supabase db diff` produces no drift |
| `sqlfluff`      | SQL migrations lint clean |
| `bundle-size`   | Frontend bundle within budget (see [bundle-size.yml](.github/workflows/bundle-size.yml)) |
| `loc-budgets`   | No source file exceeds its LOC ceiling without an exemption |

If a job is red, the fix is in the code or the migration — never in
the workflow. We do not merge with `--no-verify` or any flag that
bypasses these gates.

## Conventions you'll trip over

- **Strict TypeScript.** `any` is forbidden in new code. Use
  `unknown` and narrow.
- **Repository pattern.** Direct supabase-js calls outside
  `src/repositories/` need a reason in PR review.
- **AuditContext, not `companyData as any._x`.** See ADR
  [0002](artifacts/humanproof/docs/adr/0002-audit-context-typed-channel.md).
  Inter-layer state goes through the typed channel.
- **No new intelligence layers** until WS2+WS4 ship. See ADR
  [0008](artifacts/humanproof/docs/adr/0008-no-new-layers-until-validated.md).
- **Engine changes ship behind a flag.** See ADR
  [0003](artifacts/humanproof/docs/adr/0003-shadow-mode-promotion-gate.md).
- **No console.log in production paths.** Use the structured logger
  (`createLogger` in `src/infrastructure/logger.ts` or
  `_shared/logger.ts`).
- **RLS is mandatory** on every user-scoped table. See ADR
  [0004](artifacts/humanproof/docs/adr/0004-tenant-rls-pattern.md).
  Every new RLS policy ships with an integration test in
  [`rlsIsolation.test.ts`](artifacts/humanproof/src/__tests__/integration/rlsIsolation.test.ts).

## Testing expectations

- **Unit tests** for every service. Aim for the public API of the
  module, not its internals.
- **Integration tests** for any code path that crosses the
  application/database boundary. RLS changes always.
- **No mocks of supabase in integration tests.** They hide migration
  drift (see ADR 0004's prior incident).
- **Test files** colocated under `src/__tests__/<kind>/`. Don't
  scatter them inside the source tree.

## How to add a runbook

When you ship code that introduces a new failure mode, write the
runbook before the failure happens. The template is implicit in the
existing files — open
[docs/runbooks/scraper-down.md](artifacts/humanproof/docs/runbooks/scraper-down.md)
as a model. Update
[docs/runbooks/README.md](artifacts/humanproof/docs/runbooks/README.md)'s
index in the same PR.

## How to write an ADR

If your PR changes architecture (DAG shape, data model, auth
boundary, deployment topology) — write an ADR. Use the template at
[docs/adr/TEMPLATE.md](artifacts/humanproof/docs/adr/TEMPLATE.md).
Number it `NNNN` continuing from the latest in
[docs/adr/README.md](artifacts/humanproof/docs/adr/README.md).
Include it in the same PR as the change; do not ship the change and
write the ADR later.

## Getting unblocked

- **Local stack won't start:** `supabase stop && docker system prune
  -f && supabase start`. If it still won't, check that Docker has
  enough disk.
- **Tests pass locally, fail in CI:** check the seed
  (`CHAOS_SEED=<n>` for the DAG chaos test reproduces a specific
  failure deterministically), then the Node version.
- **Type error in code you didn't touch:** run
  `pnpm install` — most likely a workspace dep drifted.
- **Stuck on architecture:** ask in `#platform`. If the answer
  becomes "we should ADR this," do that.

## Code of conduct

Be excellent to each other. Disagree on the code, not the person.
Review PRs you wouldn't want to merge yourself, and ship PRs you'd be
proud to see in a review.
