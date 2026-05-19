// layerRegistry.ts — DEBT-1 fix (DAG-driven pipeline)
//
// Replaces the 2,200-line `auditDataPipeline.ts` god-file with a registry
// of typed `AuditLayer`s and a DAG executor that:
//
//   * Runs independent layers in PARALLEL (huge latency win vs the legacy
//     sequential loop).
//   * Validates the DAG at registration: no cycles, no missing dependencies.
//   * Wraps every layer with try/catch, timeout, fallback, and structured
//     span emission — so layer authors never have to write boilerplate.
//   * Records pass/fail per layer onto the AuditContext for telemetry.
//
// Adoption strategy:
//   The legacy `auditDataPipeline.ts` keeps working unchanged. NEW layers
//   are authored as `AuditLayer<I, O>` instances and registered here.
//   The audit pipeline can opt-in to invoke `executeRegistry(ctx)` AFTER
//   the legacy pipeline runs — this gives the new pattern a real proving
//   ground without disrupting users.
//
//   The migration ends when every legacy layer has been ported and the
//   2,200-line orchestrator can be deleted. That migration is its own
//   workstream; this module provides the infrastructure for it.

import type { AuditContext, LayerKey, LayerOutputs } from './auditContext';

// ── Types ───────────────────────────────────────────────────────────────────

/**
 * The contract every pipeline layer implements.
 *
 *   id              Unique key matching a LayerOutputs key (when the layer
 *                   emits) or a free-form prefix like 'side_effect_X'.
 *   dependencies    Other layer IDs that MUST run first. The DAG executor
 *                   topologically sorts on this.
 *   timeoutMs       Hard timeout. On expiry the layer is treated as
 *                   failed and the fallback runs.
 *   failureMode     fatal   = abort the pipeline.
 *                   degrade = log + run fallback + continue.
 *   parallelGroup   Optional tag. Layers sharing a tag run sequentially
 *                   even if the DAG would permit parallelism. Use only
 *                   for layers that contend on a shared resource (e.g.
 *                   the same external API).
 *   run             The actual work. Throw to indicate failure.
 *   fallback        Synchronous degraded-mode value used when run throws
 *                   or times out (only required when failureMode='degrade').
 */
export interface AuditLayer<OutKey extends LayerKey | string = LayerKey | string> {
  id: OutKey;
  /**
   * Other registered layer IDs that MUST run first. The DAG executor
   * sorts on these and rejects unknown IDs at plan-build time.
   */
  dependencies: ReadonlyArray<LayerKey | string>;
  /**
   * Context keys (typed LayerKeys) that the layer reads but are emitted
   * EXTERNALLY — typically by the legacy pipeline before executeRegistry
   * is invoked, or by an upstream caller. These are NOT validated against
   * the registry; they ARE checked at run time (if the key is missing
   * when run() invokes ctx.require(), the layer falls back).
   *
   * Use case: `peer_contagion` depends on `core`, which is emitted by the
   * legacy engine before the DAG runs. Declaring it here documents the
   * dependency without requiring a stub registered producer.
   */
  externalDependencies?: ReadonlyArray<LayerKey>;
  timeoutMs: number;
  failureMode: 'fatal' | 'degrade';
  parallelGroup?: string;
  /**
   * The actual layer work. Receives the shared AuditContext. The return
   * value is the layer's output; the executor emits it to the context
   * automatically when `id` is a typed LayerKey.
   */
  run(ctx: AuditContext): Promise<OutKey extends LayerKey ? LayerOutputs[OutKey] : unknown>;
  /**
   * Degraded-mode value. Called only on run failure/timeout.
   * Synchronous because by the time we need this, the layer has already
   * burned its timeout budget.
   */
  fallback?: (ctx: AuditContext) => OutKey extends LayerKey ? LayerOutputs[OutKey] : unknown;
}

export interface LayerExecutionRecord {
  layerId: string;
  status: 'success' | 'fallback' | 'timeout' | 'fatal';
  durationMs: number;
  errorMessage?: string;
}

export interface RegistryExecutionResult {
  records: LayerExecutionRecord[];
  fatalErrors: Array<{ layerId: string; error: Error }>;
  totalMs: number;
  /**
   * WS11 — every double-write to the AuditContext that occurred during
   * execution. Empty array = clean DAG; non-empty = race condition in
   * the registry. The engine shadow runner forwards these onto
   * audit_shadow_comparison so the SLO dashboard can detect new
   * races as they appear (e.g. after merging two layers into one wave).
   */
  writeConflicts: ReadonlyArray<{ key: string; emittedBy: string | null; overriddenAt: number }>;
}

// ── Registry ────────────────────────────────────────────────────────────────

const REGISTRY: AuditLayer[] = [];
const REGISTRY_BY_ID = new Map<string, AuditLayer>();

/**
 * Register a layer at module-load time.
 *
 * IMPORTANT: every call must happen at top-level (e.g. inside the layer's
 * own file at import time). The DAG is validated at the first call to
 * `executeRegistry()`, which means a forgotten import = a missing layer
 * at runtime. Add the import to `domain/pipeline/index.ts` so the layer
 * gets pulled in.
 */
export function registerLayer(layer: AuditLayer): void {
  if (REGISTRY_BY_ID.has(layer.id)) {
    throw new Error(`layerRegistry: duplicate id "${layer.id}"`);
  }
  REGISTRY.push(layer);
  REGISTRY_BY_ID.set(layer.id, layer);
}

/** Test-only: clear the registry. Production code never calls this. */
export function __resetRegistryForTesting(): void {
  REGISTRY.length = 0;
  REGISTRY_BY_ID.clear();
}

export function listRegisteredLayerIds(): string[] {
  return REGISTRY.map((l) => l.id);
}

export function getLayer(id: string): AuditLayer | undefined {
  return REGISTRY_BY_ID.get(id);
}

// ── DAG validation + topological sort ──────────────────────────────────────

interface DagPlan {
  /** Layers grouped into execution waves. All layers in a wave run in parallel. */
  waves: AuditLayer[][];
}

/**
 * Validates the DAG (no cycles, no missing deps) and produces a wave-based
 * execution plan. Throws on validation failure.
 *
 * Wave-building:
 *   Wave 0 = layers with no unsatisfied dependencies
 *   Wave 1 = layers whose deps are all in Wave 0
 *   ...
 *
 * Within a wave, layers in the same `parallelGroup` are serialised; the
 * rest run via Promise.all.
 */
function buildPlan(layers: AuditLayer[]): DagPlan {
  // 0. Validate no two layers share the same id (duplicate registration guard).
  // v40.0: catches future merges where two files call registerLayer with the same id.
  const seenIds = new Map<string, string>();
  for (const l of layers) {
    if (seenIds.has(l.id)) {
      throw new Error(
        `layerRegistry: duplicate layer id "${l.id}" — ` +
          `both "${seenIds.get(l.id)}" and a second layer share this id. ` +
          `Rename one or remove the duplicate registerLayer() call.`,
      );
    }
    seenIds.set(l.id, l.id);
  }

  // 1. Validate dependencies all exist.
  for (const l of layers) {
    for (const dep of l.dependencies) {
      if (!REGISTRY_BY_ID.has(dep)) {
        throw new Error(
          `layerRegistry: layer "${l.id}" depends on unregistered "${dep}". ` +
            `Either register the dependency or remove it from the dependencies list.`,
        );
      }
    }
  }

  // 2. Kahn's algorithm — topological sort with cycle detection.
  const inDegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();
  for (const l of layers) {
    inDegree.set(l.id, l.dependencies.length);
    for (const d of l.dependencies) {
      const arr = dependents.get(d) ?? [];
      arr.push(l.id);
      dependents.set(d, arr);
    }
  }

  const waves: AuditLayer[][] = [];
  let currentRoots = layers.filter((l) => inDegree.get(l.id) === 0);
  let placedCount = 0;

  while (currentRoots.length > 0) {
    waves.push(currentRoots);
    placedCount += currentRoots.length;
    const nextRoots: AuditLayer[] = [];
    for (const r of currentRoots) {
      for (const depId of dependents.get(r.id) ?? []) {
        const remaining = (inDegree.get(depId) ?? 0) - 1;
        inDegree.set(depId, remaining);
        if (remaining === 0) {
          const l = REGISTRY_BY_ID.get(depId);
          if (l) nextRoots.push(l);
        }
      }
    }
    currentRoots = nextRoots;
  }

  if (placedCount < layers.length) {
    const unplaced = layers.filter((l) => (inDegree.get(l.id) ?? 0) > 0).map((l) => l.id);
    throw new Error(`layerRegistry: cycle detected involving: ${unplaced.join(', ')}`);
  }

  return { waves };
}

let cachedPlan: DagPlan | null = null;
function getPlan(): DagPlan {
  if (cachedPlan) return cachedPlan;
  cachedPlan = buildPlan([...REGISTRY]);
  return cachedPlan;
}
/** Test-only: invalidate the cached plan after registry changes. */
export function __invalidatePlanForTesting(): void {
  cachedPlan = null;
}

// ── Execution helpers ──────────────────────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms: number, layerId: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return Promise.race<T>([
    promise.finally(() => {
      if (timer) clearTimeout(timer);
    }),
    new Promise<T>((_, reject) => {
      timer = setTimeout(
        () => reject(Object.assign(new Error(`layer "${layerId}" timed out after ${ms}ms`), { _timeout: true })),
        ms,
      );
    }),
  ]);
}

async function runLayer(layer: AuditLayer, ctx: AuditContext): Promise<LayerExecutionRecord> {
  const t0 = ctx.clock.nowMs();
  try {
    const value = await withTimeout(layer.run(ctx), layer.timeoutMs, layer.id);
    // If id is a typed LayerKey, emit. Otherwise treat as a side-effect layer.
    // WS11 — tag the emit with the producing layer id so write-conflict
    // diagnostics can name the offending layer pair instead of just
    // saying "two writers raced on key=X".
    if (isTypedLayerKey(layer.id)) {
      ctx.emit(layer.id as LayerKey, value as never, { emittedBy: layer.id });
    }
    return { layerId: layer.id, status: 'success', durationMs: ctx.clock.nowMs() - t0 };
  } catch (err) {
    const isTimeout = err instanceof Error && (err as { _timeout?: boolean })._timeout === true;
    const message = err instanceof Error ? err.message : String(err);
    ctx.logger.warn('layer.failed', {
      layerId: layer.id,
      reason: isTimeout ? 'timeout' : 'exception',
      errorMessage: message,
      requestId: ctx.requestId,
    });

    if (layer.failureMode === 'fatal') {
      return {
        layerId: layer.id,
        status: 'fatal',
        durationMs: ctx.clock.nowMs() - t0,
        errorMessage: message,
      };
    }

    // Degraded fallback path.
    if (layer.fallback) {
      try {
        const fb = layer.fallback(ctx);
        if (isTypedLayerKey(layer.id)) {
          ctx.emit(layer.id as LayerKey, fb as never, { emittedBy: `${layer.id}:fallback` });
        }
      } catch (fbErr) {
        ctx.logger.error('layer.fallback_failed', {
          layerId: layer.id,
          errorMessage: fbErr instanceof Error ? fbErr.message : String(fbErr),
          requestId: ctx.requestId,
        });
      }
    }
    return {
      layerId: layer.id,
      status: isTimeout ? 'timeout' : 'fallback',
      durationMs: ctx.clock.nowMs() - t0,
      errorMessage: message,
    };
  }
}

function isTypedLayerKey(id: string): boolean {
  // The set of typed keys is the keyof LayerOutputs. Since TS types are
  // erased at runtime, we maintain a runtime mirror so the executor knows
  // whether to call `ctx.emit`. New typed keys must be added here AND to
  // the LayerOutputs interface in auditContext.ts.
  return TYPED_LAYER_KEYS.has(id);
}

const TYPED_LAYER_KEYS = new Set<string>([
  'core',
  'macro_snapshot',
  'cohort_class',
  'evidence_presence',
  'stealth_layoff',
  'acquisition_premium',
  'conformal_ci',
  'swarm_panel',
  'peer_contagion',
  'executive_movement',
  'hiring_signal',
  'employee_sentiment',
  'headcount_velocity',
  '_legacy_untyped',
]);

// ── Public executor ─────────────────────────────────────────────────────────

export interface ExecuteOptions {
  /** When true, layers in the same wave run sequentially (debug only). */
  serial?: boolean;
  /** Hard cap on total execution time. Default 60s. */
  totalBudgetMs?: number;
}

/**
 * Run the registered DAG against the given context.
 *
 * Per-wave: layers run in parallel via Promise.allSettled.
 * Per-parallelGroup: layers with the same group tag run sequentially
 * within their wave (used when layers share an upstream API quota).
 *
 * The executor does NOT throw on layer failure — every result is captured
 * in `records`. A fatal failure aborts subsequent waves but still returns
 * the records collected so far.
 */
export async function executeRegistry(ctx: AuditContext, opts: ExecuteOptions = {}): Promise<RegistryExecutionResult> {
  const plan = getPlan();
  const records: LayerExecutionRecord[] = [];
  const fatals: Array<{ layerId: string; error: Error }> = [];
  const totalBudget = opts.totalBudgetMs ?? 60_000;
  const startedAt = ctx.clock.nowMs();

  for (const wave of plan.waves) {
    if (ctx.clock.nowMs() - startedAt > totalBudget) {
      ctx.logger.error('registry.total_budget_exceeded', {
        budget: totalBudget,
        requestId: ctx.requestId,
        layersSkipped: wave.length,
      });
      break;
    }

    // Group by parallelGroup; tag-less layers run fully in parallel.
    const groups = new Map<string, AuditLayer[]>();
    const ungrouped: AuditLayer[] = [];
    for (const l of wave) {
      if (l.parallelGroup) {
        const arr = groups.get(l.parallelGroup) ?? [];
        arr.push(l);
        groups.set(l.parallelGroup, arr);
      } else {
        ungrouped.push(l);
      }
    }

    const waveRecords: LayerExecutionRecord[] = [];

    // Ungrouped: full parallelism.
    if (opts.serial) {
      for (const l of ungrouped) waveRecords.push(await runLayer(l, ctx));
    } else {
      const parallelResults = await Promise.all(ungrouped.map((l) => runLayer(l, ctx)));
      waveRecords.push(...parallelResults);
    }

    // Grouped: serial within each group, groups themselves in parallel.
    const groupPromises: Promise<LayerExecutionRecord[]>[] = [];
    for (const grouped of groups.values()) {
      groupPromises.push(
        (async () => {
          const out: LayerExecutionRecord[] = [];
          for (const l of grouped) out.push(await runLayer(l, ctx));
          return out;
        })(),
      );
    }
    const groupResults = await Promise.all(groupPromises);
    for (const arr of groupResults) waveRecords.push(...arr);

    records.push(...waveRecords);

    // Abort on any fatal failure.
    const fatal = waveRecords.find((r) => r.status === 'fatal');
    if (fatal) {
      fatals.push({
        layerId: fatal.layerId,
        error: new Error(fatal.errorMessage ?? 'fatal layer failure'),
      });
      ctx.logger.error('registry.fatal_abort', { layerId: fatal.layerId, requestId: ctx.requestId });
      break;
    }
  }

  // WS11 — collect any double-writes that occurred during this run so
  // the caller (engineShadowRunner) can persist them on
  // audit_shadow_comparison for race-detection telemetry.
  const conflicts = ctx.collectWriteConflicts().map((c) => ({
    key: String(c.key),
    emittedBy: c.emittedBy,
    overriddenAt: c.overriddenAt,
  }));
  if (conflicts.length > 0) {
    ctx.logger.warn('registry.write_conflicts', {
      requestId: ctx.requestId,
      conflictCount: conflicts.length,
      keys: conflicts.map((c) => c.key),
    });
  }

  return {
    records,
    fatalErrors: fatals,
    totalMs: ctx.clock.nowMs() - startedAt,
    writeConflicts: conflicts,
  };
}

// ── Diagnostics ─────────────────────────────────────────────────────────────

/**
 * Pretty-print the DAG plan for documentation / debugging. Returns a
 * multi-line string showing waves and parallelGroup membership.
 */
export function describeDagPlan(): string {
  const plan = getPlan();
  const lines: string[] = [`DAG plan: ${plan.waves.length} waves, ${REGISTRY.length} layers`];
  plan.waves.forEach((wave, i) => {
    lines.push(`  Wave ${i}: ${wave.length} layer(s)`);
    for (const l of wave) {
      const tag = l.parallelGroup ? ` [group: ${l.parallelGroup}]` : '';
      const fatal = l.failureMode === 'fatal' ? ' [FATAL-MODE]' : '';
      lines.push(`    - ${l.id} (timeout ${l.timeoutMs}ms${tag}${fatal})`);
    }
  });
  return lines.join('\n');
}
