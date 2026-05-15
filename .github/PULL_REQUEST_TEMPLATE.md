<!--
PR template — keep it short, keep the checklist real.
Anything you can't tick → explain why in the box.
-->

## What changed

<!-- 1-2 sentences. The diff says how; this section says *why*. -->

## Scope

- [ ] Bug fix
- [ ] Feature behind a flag (specify flag key)
- [ ] Refactor (no behaviour change)
- [ ] Infra / CI / tooling
- [ ] Documentation only

## Behind which flag?

<!--
For any behaviour change: paste the flag key OR explain why a flag is
not required. See PROMOTIONS.md for the standard.
-->

`flag_key:` _none — refactor with no behaviour change_

## Checks I have run locally

- [ ] `pnpm --filter humanproof typecheck` clean
- [ ] `pnpm --filter humanproof test` clean
- [ ] If I touched `supabase/migrations/`:
      `node scripts/check-migration-drift.mjs` clean against my dev DB
- [ ] If I created/modified a service file:
      `node artifacts/humanproof/scripts/check-file-loc-budgets.mjs` clean

## Architectural conventions

- [ ] No new `as any` outside test files
- [ ] No new direct `supabase.from()` calls outside `infrastructure/repositories/`
- [ ] No new `console.warn/error` — used `createLogger()` instead
- [ ] No new `import.meta.env.X` — used `envVar()` instead
- [ ] If I added a layer: registered in `domain/pipeline/layers/index.ts`
      AND added the typed key to `LayerOutputs` AND `TYPED_LAYER_KEYS`
- [ ] If I added a table: included `tenant_id UUID NOT NULL DEFAULT ...`
      AND wrote at least one RLS policy

## Promotion plan (for flagged features)

<!--
Skip this section if the flag is internal-only or this is not a
behaviour change.
-->

- [ ] Will ship in mode `shadow` first
- [ ] Acceptance criteria for canary promotion documented in
      `engine_feature_flags.acceptance_criteria`
- [ ] Linked dashboard / SLO that will be watched during the canary
      window

## Tests added or rationale for none

<!--
Adding tests is the path of least resistance. Skipping requires a
written reason here.
-->

## Anything reviewers should know

<!--
Tricky edge case? Performance concern? Known-future-followup? Say it
here so it's not buried in the diff.
-->

---

<!-- Reviewers: confirm the checklist above is honest. Empty checkboxes
     are conversation starters, not gates. -->
