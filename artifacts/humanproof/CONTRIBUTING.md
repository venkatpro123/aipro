# Contributing to HumanProof

This guide is the **entry point for anyone touching production code**. Read it once on Day 1 and bookmark it.

## TL;DR — the three rules

1. **No `as any` outside of test files.** Use the typed `AuditContext` (`src/domain/pipeline/auditContext.ts`) for inter-layer state and the repository layer (`src/infrastructure/repositories/`) for DB access.
2. **Every change ships behind a feature flag.** Add the flag to `engine_feature_flags`, default to `mode='off'` or `'shadow'`. Promotion to `production` is gated by empirical evidence captured in `audit_shadow_comparison`.
3. **Every error path emits a structured log + a fallback log row.** Use `createLogger({ service: '...' })`. Call `recordFallback()` when a layer degrades. Silent failure is the bug we are fixing.

---

## How to add a new intelligence layer

1. **Decide what the layer computes.** Read the audit's *Layer Consolidation Manifest* (`src/services/layerConsolidationManifest.ts`) first — if your idea overlaps an existing layer, merge into it rather than add a new one.

2. **Declare the output type.** Open `src/domain/pipeline/auditContext.ts` and add an entry to `LayerOutputs`:

   ```typescript
   export interface LayerOutputs {
     // ...
     'L55_my_new_signal': MyNewSignalResult;
   }
   ```

   Also add the same key to the `TYPED_LAYER_KEYS` set in `layerRegistry.ts` so the executor knows to emit it.

3. **Create the layer file** at `src/domain/pipeline/layers/L55_my_new_signal.ts`:

   ```typescript
   import { registerLayer, type AuditLayer } from '../layerRegistry';

   export const L55_my_new_signal: AuditLayer<'L55_my_new_signal'> = {
     id: 'L55_my_new_signal',
     dependencies: ['macro_snapshot'],         // declare what you read
     timeoutMs: 4000,
     failureMode: 'degrade',                   // 'fatal' only for hard requirements
     async run(ctx) {
       const macro = ctx.require('macro_snapshot');
       return computeMyNewSignal(macro, ctx.companyData);
     },
     fallback: () => ({ ...NEUTRAL_RESULT }),
   };

   registerLayer(L55_my_new_signal);
   ```

4. **Add the import** to `src/domain/pipeline/layers/index.ts` so the registration runs at module load.

5. **Add a feature flag** in `engine_feature_flags`:

   ```sql
   INSERT INTO engine_feature_flags (flag_key, mode, description, workstream, acceptance_criteria) VALUES
     ('ws9_my_new_signal', 'off', 'Activates L55', 'WS9', ARRAY['shadow validation: |Δscore| < 5pp p95']);
   ```

   Gate the layer's `run()` body with `ctx.flags.isShadow('ws9_my_new_signal')` so it ships dark first.

6. **Write tests.** A new test file in `src/__tests__/unit/L55_my_new_signal.test.ts`. Cover:
   - happy path
   - missing dependency
   - timeout (use `vi.useFakeTimers()`)
   - fallback

7. **Document the layer.** Add a single-line entry to the consolidation manifest's status table.

---

## How to query the database

**Never** call `supabase.from('xxx').select()` directly from `src/components/`, `src/pages/`, or domain logic. Use a repository.

If the table you need is not yet in `src/infrastructure/repositories/`, **create a new repository** following `OutcomesRepository` as a template:

```typescript
import { BaseRepository } from './baseRepository';

export class XxxRepository extends BaseRepository {
  constructor() { super({ serviceName: 'xxx-repository' }); }

  async loadByFoo(foo: string): Promise<Xxx[]> {
    return this.runQuery('loadByFoo', async () =>
      this.client.from('xxxs').select('*').eq('foo', foo)
    ) ?? [];
  }
}
```

Then add a `xxxRepo()` singleton accessor + a test reset hook. Done.

---

## How to log

**Never** call `console.log / warn / error` directly. Use the structured logger:

```typescript
import { createLogger } from '../../shared/logger';

const log = createLogger({ service: 'my-service' });

log.info('event.happened', { entity_id: '...', duration_ms: 42 });
log.warn('fallback.applied', { reason: 'upstream_timeout', layer: 'L55' });
log.error('unexpected.failure', err);  // pass Error directly; auto-redacted
```

Events are namespaced like `domain.action.outcome`. PII keys are auto-redacted but **don't rely on it** — never pass `password`, `email`, `ssn`, or `token` into a log call.

---

## How to read environment variables

**Never** call `import.meta.env.X` or `Deno.env.get(X)` directly. Use the typed env module:

```typescript
import { env, envVar } from '../../config/env';

const url = envVar('VITE_SUPABASE_URL');     // typed; validated at boot
```

Adding a new variable = add it to the Zod schema in `src/config/env.ts`. The build fails if the schema rejects.

---

## How to handle rate limiting

For user-triggered expensive operations (audits, scrape triggers, recalibrations), enforce the limit at the entry point:

```typescript
import { consumeToken, RateLimitError } from '../../infrastructure/rateLimiter';

const result = await consumeToken('audit', userId);
if (!result.allowed) {
  showToast(`Slow down — try again in ${result.retryAfterMs}ms`);
  return;
}
// proceed with the audit
```

Bucket policies live in `rate_limit_policies` (DB). Edit there, not in code.

---

## How to ship a change

1. Branch from `main`.
2. Implement.
3. Run locally:
   ```bash
   pnpm typecheck
   pnpm vitest run
   ```
4. Open PR. CI runs migration applicability + lint + tests.
5. Merge → auto-deploy to staging.
6. Verify in `ShadowComparisonPage` that your change produces sensible deltas.
7. Promote the flag from `shadow` to `canary` (10%) → `production` via the `CalibrationPanel` admin UI. Each promotion requires a written justification logged to `engine_feature_flag_history`.

---

## How NOT to do things

| Anti-pattern | Don't | Do |
|---|---|---|
| Untyped state passing | `(companyData as any)._my_signal = x` | `ctx.emit('L55_my_signal', x)` |
| Direct DB access | `supabase.from('outcomes').select(...)` | `outcomesRepo().loadConfirmedOutcomes(...)` |
| Ad-hoc logging | `console.warn('xxx failed', err)` | `log.warn('xxx.failed', { error: err })` |
| Magic env reads | `import.meta.env.X as string` | `envVar('X')` |
| New file > 600 LOC | Adding to the existing god-file | Create a new file under the right domain folder |
| Skipping the flag | Shipping a behavior change unflagged | Always gate; default to `shadow` |

---

## Architecture in one diagram

```
┌──────────────────────────────────────────────────────────────────┐
│  Presentation: pages/ + components/                                │
└──────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────▼──────────────────────────────────────┐
│  Application orchestrators: application/ (thin)                    │
└─────────────────────────────┬──────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼────────┐   ┌────────▼───────┐    ┌────────▼─────────┐
│  Domain        │   │  Repositories  │    │  Adapters        │
│  pipeline/     │   │  outcomes      │    │  connectors/     │
│  scoring/      │   │  calibration   │    │  circuitBreaker  │
│  confidence/   │   │  shadow        │    │  rateLimiter     │
│  evidence/     │   │  flags         │    │                  │
└────────────────┘   │  scrapeJobs    │    └──────────────────┘
                     └────────────────┘

  Cross-cutting: shared/logger · config/env · infrastructure/tracing
```

---

## Where to ask for help

* Architecture / pipeline questions → read the most recent audit and architectural review docs first.
* DB schema changes → check `supabase/migrations/` for naming conventions.
* Feature flag promotion → write your evidence in the `engine_feature_flag_history` row; the PR reviewer reads it.

When in doubt: **smaller change behind a flag** is always the right answer.
