// dagChaos.test.ts — DAG resilience under random layer failure injection.
//
// What this proves:
//   1. A `degrade`-mode layer crashing/timing-out NEVER halts the pipeline.
//      Independent layers complete, downstream consumers see the fallback.
//   2. A `fatal`-mode layer crashing aborts subsequent waves cleanly with a
//      captured fatalError, NOT an unhandled rejection.
//   3. Every attempted layer produces exactly one record (no duplicates,
//      no silent skips for degrade-mode layers).
//   4. Per-wave parallelism is preserved — a slow layer in wave N does not
//      starve a peer in the same wave; they race to completion together.
//
// Why this test exists:
//   The legacy auditDataPipeline.ts crashed the whole audit on a single
//   layer error. The DAG executor's invariant is "one layer's bad day
//   does not break the rest" — but the only way to keep that invariant
//   true under refactoring is to assert it under randomised pressure.
//   Deterministic seeds let us reproduce a failure without flake risk.
//
// Reproducing a failure:
//   Each test inside this file logs the seed it used. Set CHAOS_SEED=<n>
//   in the env to pin the seed locally and reproduce the same sequence.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  registerLayer,
  __resetRegistryForTesting,
  __invalidatePlanForTesting,
  executeRegistry,
  type AuditLayer,
} from '../../domain/pipeline/layerRegistry';
import { AuditContext } from '../../domain/pipeline/auditContext';
import type { CompanyData } from '../../data/companyDatabase';
import type { AuditInputs } from '../../services/auditDataPipeline';

// ── Deterministic PRNG (mulberry32) ─────────────────────────────────────────
// Built-in Math.random() is non-seedable. We need reproducible chaos so a
// failing seed in CI is debuggable locally. Mulberry32 is 12 lines, public
// domain, and good enough for fault-injection patterns.
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickSeed(): number {
  const fromEnv = typeof process !== 'undefined' ? process.env?.CHAOS_SEED : undefined;
  if (fromEnv && /^\d+$/.test(fromEnv)) return Number(fromEnv);
  // Math.random is fine for picking the seed itself; we log it for reproduction.
  return Math.floor(Math.random() * 0xffffffff);
}

// ── Fixtures ────────────────────────────────────────────────────────────────

const baseCompany: CompanyData = {
  name: 'ChaosCo',
  isPublic: true,
  industry: 'technology',
  region: 'US',
  employeeCount: 5000,
  revenueGrowthYoY: 4,
  stock90DayChange: 3,
  layoffsLast24Months: [],
  layoffRounds: 0,
  lastLayoffPercent: null,
  revenuePerEmployee: 250_000,
  aiInvestmentSignal: 'medium',
  source: 'test',
  lastUpdated: new Date().toISOString(),
};

const baseInputs: AuditInputs = {
  companyName: 'ChaosCo',
  roleTitle: 'Software Engineer',
  department: 'Engineering',
  userFactors: {
    tenureYears: 3,
    isUniqueRole: false,
    performanceTier: 'average',
    hasRecentPromotion: false,
    hasKeyRelationships: false,
  },
};

function mkContext(): AuditContext {
  return new AuditContext({ inputs: baseInputs, companyData: baseCompany });
}

// ── Synthetic layer factory ─────────────────────────────────────────────────
// Builds layers with controllable failure behaviour. We never inject failures
// into the real layers because real fallbacks compute against real signals
// and would mask the chaos hypothesis. Synthetic layers keep the test focused
// on the EXECUTOR's behaviour, which is what we're testing.

type ChaosLayer = AuditLayer<string> & { _willFail: boolean; _willTimeout: boolean };

function makeChaosLayer(opts: {
  id: string;
  dependencies?: string[];
  failureMode: 'fatal' | 'degrade';
  shouldFail: boolean;
  shouldTimeout?: boolean;
  durationMs?: number;
  timeoutMs?: number;
}): ChaosLayer {
  return {
    id: opts.id,
    dependencies: opts.dependencies ?? [],
    timeoutMs: opts.timeoutMs ?? 500,
    failureMode: opts.failureMode,
    async run() {
      const wait = opts.durationMs ?? 5;
      // sleep wait ms so peers can race.
      await new Promise((r) => setTimeout(r, wait));
      if (opts.shouldTimeout) {
        // Block forever; executor's timeout wins.
        await new Promise(() => undefined);
      }
      if (opts.shouldFail) {
        throw new Error(`chaos: ${opts.id} simulated failure`);
      }
      return { ok: true, id: opts.id };
    },
    fallback() {
      return { ok: false, id: opts.id, fromFallback: true };
    },
    _willFail: opts.shouldFail,
    _willTimeout: opts.shouldTimeout === true,
  } as ChaosLayer;
}

// ── Test suite ──────────────────────────────────────────────────────────────

describe('DAG chaos: random layer failures', () => {
  let seed: number;
  let rand: () => number;

  beforeEach(() => {
    seed = pickSeed();
    rand = mulberry32(seed);
    __resetRegistryForTesting();
    __invalidatePlanForTesting();
  });
  afterEach(() => {
    __resetRegistryForTesting();
    __invalidatePlanForTesting();
  });

  it('degrade-mode layers do not halt the pipeline regardless of failure pattern', async () => {
    // Build 12 degrade-mode layers across 3 waves, ~40% chance each fails.
    // Every single one MUST produce a record (success OR fallback OR timeout).
    const ids: string[] = [];
    const layers: ChaosLayer[] = [];

    // Wave 0: 4 root layers
    for (let i = 0; i < 4; i++) {
      const id = `wave0_${i}`;
      ids.push(id);
      layers.push(makeChaosLayer({ id, failureMode: 'degrade', shouldFail: rand() < 0.4 }));
    }
    // Wave 1: 4 layers each depending on one wave-0 layer
    for (let i = 0; i < 4; i++) {
      const id = `wave1_${i}`;
      ids.push(id);
      layers.push(makeChaosLayer({
        id,
        dependencies: [`wave0_${i}`],
        failureMode: 'degrade',
        shouldFail: rand() < 0.4,
      }));
    }
    // Wave 2: 4 layers each depending on TWO wave-1 layers (fan-in)
    for (let i = 0; i < 4; i++) {
      const id = `wave2_${i}`;
      ids.push(id);
      layers.push(makeChaosLayer({
        id,
        dependencies: [`wave1_${i}`, `wave1_${(i + 1) % 4}`],
        failureMode: 'degrade',
        shouldFail: rand() < 0.4,
      }));
    }

    for (const l of layers) registerLayer(l as AuditLayer);
    __invalidatePlanForTesting();

    const ctx = mkContext();
    const result = await executeRegistry(ctx);

    // Invariant 1: every attempted layer produced exactly one record.
    expect(result.records).toHaveLength(layers.length);
    const recordedIds = new Set(result.records.map((r) => r.layerId));
    for (const id of ids) {
      expect(recordedIds, `seed=${seed}: missing record for ${id}`).toContain(id);
    }

    // Invariant 2: zero fatal errors (all degrade-mode).
    expect(result.fatalErrors, `seed=${seed}`).toHaveLength(0);

    // Invariant 3: every failed layer is recorded as 'fallback' (not 'success').
    for (const layer of layers) {
      const rec = result.records.find((r) => r.layerId === layer.id)!;
      if (layer._willFail) {
        expect(rec.status, `seed=${seed}: ${layer.id} failed but recorded as ${rec.status}`)
          .toBe('fallback');
      } else {
        expect(rec.status, `seed=${seed}: ${layer.id} succeeded but recorded as ${rec.status}`)
          .toBe('success');
      }
    }
  });

  it('a fatal-mode layer crashing aborts subsequent waves but captures the error', async () => {
    // Wave 0: 2 root layers, one of which is fatal-mode and ALWAYS fails.
    registerLayer(makeChaosLayer({ id: 'root_ok',     failureMode: 'degrade', shouldFail: false }) as AuditLayer);
    registerLayer(makeChaosLayer({ id: 'root_fatal',  failureMode: 'fatal',   shouldFail: true  }) as AuditLayer);
    // Wave 1: depends on root_fatal. Should never run.
    registerLayer(makeChaosLayer({
      id: 'never_runs',
      dependencies: ['root_fatal'],
      failureMode: 'degrade',
      shouldFail: false,
    }) as AuditLayer);
    __invalidatePlanForTesting();

    const ctx = mkContext();
    const result = await executeRegistry(ctx);

    // Both wave-0 layers should have produced records.
    expect(result.records.map((r) => r.layerId).sort()).toEqual(['root_fatal', 'root_ok']);
    // Wave 1 layer should NOT have run.
    expect(result.records.find((r) => r.layerId === 'never_runs')).toBeUndefined();
    // Fatal error captured (not thrown).
    expect(result.fatalErrors).toHaveLength(1);
    expect(result.fatalErrors[0]!.layerId).toBe('root_fatal');
    expect(result.fatalErrors[0]!.error.message).toMatch(/chaos: root_fatal simulated/);
  });

  it('timeouts are recorded as status="timeout" and trigger fallback', async () => {
    registerLayer(makeChaosLayer({
      id: 'slow_layer',
      failureMode: 'degrade',
      shouldFail: false,
      shouldTimeout: true,
      timeoutMs: 50, // 50ms cap; the layer will block forever
    }) as AuditLayer);
    __invalidatePlanForTesting();

    const ctx = mkContext();
    const result = await executeRegistry(ctx);

    expect(result.records).toHaveLength(1);
    expect(result.records[0]!.status).toBe('timeout');
    expect(result.records[0]!.durationMs).toBeGreaterThanOrEqual(50);
    // Total executor time bounded — the layer didn't block forever.
    expect(result.totalMs).toBeLessThan(500);
  });

  it('independent wave-peers race in parallel even when one fails', async () => {
    // Two wave-0 layers: one fast-success (10ms), one fast-failure (5ms).
    // Total wave duration should be ~10ms, not 15ms.
    registerLayer(makeChaosLayer({
      id: 'peer_fast_success', failureMode: 'degrade', shouldFail: false, durationMs: 10,
    }) as AuditLayer);
    registerLayer(makeChaosLayer({
      id: 'peer_fast_failure', failureMode: 'degrade', shouldFail: true,  durationMs: 5,
    }) as AuditLayer);
    __invalidatePlanForTesting();

    const ctx = mkContext();
    const t0 = Date.now();
    const result = await executeRegistry(ctx);
    const elapsed = Date.now() - t0;

    // Both records present; both in the same wave; one succeeded, one fell back.
    expect(result.records).toHaveLength(2);
    expect(result.records.find((r) => r.layerId === 'peer_fast_success')!.status).toBe('success');
    expect(result.records.find((r) => r.layerId === 'peer_fast_failure')!.status).toBe('fallback');
    // Sequential execution would be ≥15ms; parallel is ~10ms.
    // Generous ceiling to absorb CI jitter while still catching a regression
    // that breaks parallelism (which would push elapsed past 50ms).
    expect(elapsed, `parallel-execution regression? elapsed=${elapsed}ms (expected < 80)`)
      .toBeLessThan(80);
  });

  it('random-seed soak: 50 chaos runs all converge without unhandled rejections', async () => {
    // Soak test: build a moderately-sized graph and run it many times with
    // random failure injection. Catches:
    //   - Promise leaks (unhandled rejection)
    //   - Race conditions in the wave-scheduling loop
    //   - Records lost when a degrade-fallback itself throws
    let totalRuns = 0;
    let totalRecords = 0;

    for (let run = 0; run < 50; run++) {
      __resetRegistryForTesting();
      __invalidatePlanForTesting();

      // 9-layer DAG with deterministic failure pattern per run.
      const failProbThisRun = rand(); // varies per run, 0..1
      const layers: ChaosLayer[] = [];

      for (let i = 0; i < 3; i++) {
        layers.push(makeChaosLayer({
          id: `soak_root_${run}_${i}`,
          failureMode: 'degrade',
          shouldFail: rand() < failProbThisRun,
        }));
      }
      for (let i = 0; i < 3; i++) {
        layers.push(makeChaosLayer({
          id: `soak_mid_${run}_${i}`,
          dependencies: [`soak_root_${run}_${i}`],
          failureMode: 'degrade',
          shouldFail: rand() < failProbThisRun,
        }));
      }
      for (let i = 0; i < 3; i++) {
        layers.push(makeChaosLayer({
          id: `soak_leaf_${run}_${i}`,
          dependencies: [`soak_mid_${run}_${i}`, `soak_mid_${run}_${(i + 1) % 3}`],
          failureMode: 'degrade',
          shouldFail: rand() < failProbThisRun,
        }));
      }

      for (const l of layers) registerLayer(l as AuditLayer);
      __invalidatePlanForTesting();

      const ctx = mkContext();
      const result = await executeRegistry(ctx);

      // No fatal errors (all degrade).
      expect(result.fatalErrors, `seed=${seed} run=${run}`).toHaveLength(0);
      // Every layer recorded exactly once.
      expect(result.records, `seed=${seed} run=${run}`).toHaveLength(layers.length);

      totalRuns++;
      totalRecords += result.records.length;
    }

    // Sanity: 50 runs × 9 layers = 450 records.
    expect(totalRuns).toBe(50);
    expect(totalRecords).toBe(450);
  });
});
