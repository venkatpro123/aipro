// dagLayersIntegration.test.ts
//
// Validates each migrated layer runs correctly through the DAG executor
// against the shared AuditContext.
//
// Test-isolation strategy:
//   The layer files self-register via top-level `registerLayer()` side
//   effects. To get clean per-test state we:
//     1. Static-import the LAYER CONSTANT (not the side-effect module).
//     2. Reset the registry in beforeEach.
//     3. Explicitly call registerLayer(constant) for the layers each
//        test needs.
//   This pattern avoids relying on vi.resetModules() (which is fragile)
//   and makes each test's preconditions visible.

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

// Static imports of each layer constant. Their files DO register at
// module load when imported elsewhere, but in this test we deliberately
// reset and re-register manually for isolation.
import { macroSnapshotLayer } from '../../domain/pipeline/layers/macroSnapshotLayer';
import { cohortClassifierLayer } from '../../domain/pipeline/layers/cohortClassifierLayer';
import { stealthLayoffLayer } from '../../domain/pipeline/layers/stealthLayoffLayer';
import { acquisitionPremiumLayer } from '../../domain/pipeline/layers/acquisitionPremiumLayer';
import { conformalCILayer } from '../../domain/pipeline/layers/conformalCILayer';
import { evidencePresenceLayer } from '../../domain/pipeline/layers/evidencePresenceLayer';
import { peerContagionLayer } from '../../domain/pipeline/layers/peerContagionLayer';

// ── Fixtures ────────────────────────────────────────────────────────────────

const baseCompany: CompanyData = {
  name: 'TestCo',
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
  companyName: 'TestCo',
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

function mkContext(companyOverride?: Partial<CompanyData>, inputsOverride?: Partial<AuditInputs>): AuditContext {
  return new AuditContext({
    inputs: { ...baseInputs, ...inputsOverride },
    companyData: { ...baseCompany, ...companyOverride },
  });
}

// Helper that calls registerLayer + invalidates the plan in one step.
function registerAndPlan(...layers: AuditLayer[]): void {
  for (const l of layers) registerLayer(l);
  __invalidatePlanForTesting();
}

// ── macroSnapshotLayer ──────────────────────────────────────────────────────

describe('macroSnapshotLayer', () => {
  beforeEach(() => {
    __resetRegistryForTesting();
    __invalidatePlanForTesting();
  });
  afterEach(() => {
    __resetRegistryForTesting();
    __invalidatePlanForTesting();
  });

  it('emits macro_snapshot when executed', async () => {
    registerAndPlan(macroSnapshotLayer as AuditLayer);
    const ctx = mkContext();
    const result = await executeRegistry(ctx);
    expect(result.records).toHaveLength(1);
    expect(result.records[0]!.layerId).toBe('macro_snapshot');
    const snap = ctx.read('macro_snapshot');
    expect(snap).not.toBeNull();
    expect(snap?.recessionSignal).toBeGreaterThanOrEqual(0);
    expect(snap?.recessionSignal).toBeLessThanOrEqual(1);
  });
});

// ── cohortClassifierLayer ───────────────────────────────────────────────────

describe('cohortClassifierLayer', () => {
  beforeEach(() => {
    __resetRegistryForTesting();
    __invalidatePlanForTesting();
  });
  afterEach(() => {
    __resetRegistryForTesting();
    __invalidatePlanForTesting();
  });

  it('runs after macro_snapshot and produces a typed cohort_class', async () => {
    registerAndPlan(macroSnapshotLayer as AuditLayer, cohortClassifierLayer as AuditLayer);
    const ctx = mkContext();
    const result = await executeRegistry(ctx);

    const macroIdx = result.records.findIndex((r) => r.layerId === 'macro_snapshot');
    const cohortIdx = result.records.findIndex((r) => r.layerId === 'cohort_class');
    expect(macroIdx).toBeGreaterThanOrEqual(0);
    expect(cohortIdx).toBeGreaterThan(macroIdx);

    const cohort = ctx.read('cohort_class');
    expect(cohort).not.toBeNull();
    expect(['DISTRESS', 'EFFICIENCY', 'WAVE', 'UNKNOWN']).toContain(cohort?.primaryCohort);
  });
});

// ── acquisitionPremiumLayer ─────────────────────────────────────────────────

describe('acquisitionPremiumLayer', () => {
  beforeEach(() => {
    __resetRegistryForTesting();
    __invalidatePlanForTesting();
  });
  afterEach(() => {
    __resetRegistryForTesting();
    __invalidatePlanForTesting();
  });

  it('returns NEUTRAL when no M&A context is supplied', async () => {
    registerAndPlan(acquisitionPremiumLayer as AuditLayer);
    const ctx = mkContext();
    await executeRegistry(ctx);
    const premium = ctx.read('acquisition_premium');
    expect(premium).not.toBeNull();
    expect(premium?.detected).toBe(false);
  });

  it('detects the premium when M&A inputs + stock surge are provided', async () => {
    registerAndPlan(acquisitionPremiumLayer as AuditLayer);
    // The layer reads userFactors as Record<string, unknown> and looks for
    // maEventType / maMonthsPostClose / isAcquiredEmployee — these are v14
    // user-factor extensions provided by the ProfileSetupModal.
    const extendedUserFactors = {
      ...baseInputs.userFactors,
      maEventType: 'STRATEGIC_ACQUISITION',
      maMonthsPostClose: 1,
      isAcquiredEmployee: true,
    } as unknown as AuditInputs['userFactors'];
    const ctx = new AuditContext({
      inputs: { ...baseInputs, userFactors: extendedUserFactors },
      companyData: { ...baseCompany, stock90DayChange: 28 },
    });
    await executeRegistry(ctx);
    const premium = ctx.read('acquisition_premium');
    expect(premium?.detected).toBe(true);
    expect(premium?.correctedStock90DayChange).toBe(0);
  });
});

// ── evidencePresenceLayer ───────────────────────────────────────────────────

describe('evidencePresenceLayer', () => {
  beforeEach(() => {
    __resetRegistryForTesting();
    __invalidatePlanForTesting();
  });
  afterEach(() => {
    __resetRegistryForTesting();
    __invalidatePlanForTesting();
  });

  it('returns the unresolved fallback when no live quorum data exists', async () => {
    registerAndPlan(evidencePresenceLayer as AuditLayer);
    const ctx = mkContext();
    await executeRegistry(ctx);
    const report = ctx.read('evidence_presence');
    expect(report).not.toBeNull();
    expect(report?.unresolvedCount).toBe(4);
    expect(report?.positiveCount).toBe(0);
  });

  it('builds a presence report from legacy _liveQuorumStatus', async () => {
    registerAndPlan(evidencePresenceLayer as AuditLayer);
    const companyWithQuorum = {
      ...baseCompany,
      _liveQuorumStatus: {
        perClass: {
          workforce: { signalClass: 'workforce', sourcesReached: ['wikipedia', 'yahoo-fte'], sourcesPending: [], satisfied: true,  satisfiedByAbsence: false },
          layoffs:   { signalClass: 'layoffs',   sourcesReached: [],                          sourcesPending: ['rss-news'],          satisfied: false, satisfiedByAbsence: true  },
          financial: { signalClass: 'financial', sourcesReached: ['yahoo'],                   sourcesPending: [],                    satisfied: true,  satisfiedByAbsence: false },
          hiring:    { signalClass: 'hiring',    sourcesReached: ['naukri'],                  sourcesPending: [],                    satisfied: true,  satisfiedByAbsence: false },
        },
      },
    } as unknown as CompanyData;
    const ctx = new AuditContext({ inputs: baseInputs, companyData: companyWithQuorum });
    await executeRegistry(ctx);
    const report = ctx.read('evidence_presence');
    expect(report?.positiveCount).toBe(3);
    expect(report?.absenceCount).toBe(1);
  });
});

// ── peerContagionLayer (multi-dependency) ───────────────────────────────────

describe('peerContagionLayer', () => {
  beforeEach(() => {
    __resetRegistryForTesting();
    __invalidatePlanForTesting();
  });
  afterEach(() => {
    __resetRegistryForTesting();
    __invalidatePlanForTesting();
  });

  it('runs after BOTH core and macro_snapshot dependencies', async () => {
    registerAndPlan(macroSnapshotLayer as AuditLayer, peerContagionLayer as AuditLayer);
    const ctx = mkContext();
    ctx.emit('core', { total: 60, confidencePercent: 65 });
    const result = await executeRegistry(ctx);

    const macroIdx = result.records.findIndex((r) => r.layerId === 'macro_snapshot');
    const peerIdx  = result.records.findIndex((r) => r.layerId === 'peer_contagion');
    expect(macroIdx).toBeGreaterThanOrEqual(0);
    expect(peerIdx).toBeGreaterThan(macroIdx);

    const peer = ctx.read('peer_contagion');
    expect(peer).not.toBeNull();
    expect(peer?.scoreAmplifier).toBeGreaterThanOrEqual(1.0);
  });

  it('falls back when `core` is missing (require() throws → fallback)', async () => {
    registerAndPlan(macroSnapshotLayer as AuditLayer, peerContagionLayer as AuditLayer);
    const ctx = mkContext();
    // Deliberately do NOT emit `core` — the layer's run() should throw,
    // executor catches, invokes fallback.
    const result = await executeRegistry(ctx);
    const peerRecord = result.records.find((r) => r.layerId === 'peer_contagion');
    expect(peerRecord?.status).toBe('fallback');
    expect(ctx.read('peer_contagion')?.waveIntensity).toBe('NONE');
  });
});

// ── End-to-end: multiple layers + dependency resolution ─────────────────────

describe('full DAG resolves dependencies in topological order', () => {
  beforeEach(() => {
    __resetRegistryForTesting();
    __invalidatePlanForTesting();
  });
  afterEach(() => {
    __resetRegistryForTesting();
    __invalidatePlanForTesting();
  });

  it('runs macro → cohort → stealth → acquisition → conformal correctly', async () => {
    registerAndPlan(
      macroSnapshotLayer as AuditLayer,
      cohortClassifierLayer as AuditLayer,
      stealthLayoffLayer as AuditLayer,
      acquisitionPremiumLayer as AuditLayer,
      conformalCILayer as AuditLayer,
    );
    const ctx = mkContext();
    ctx.emit('core', { total: 55, confidencePercent: 70 });
    const result = await executeRegistry(ctx);

    expect(result.records.length).toBe(5);
    expect(result.fatalErrors).toHaveLength(0);
    expect(ctx.read('macro_snapshot')).not.toBeNull();
    expect(ctx.read('cohort_class')).not.toBeNull();
    expect(ctx.read('stealth_layoff')).not.toBeNull();
    expect(ctx.read('acquisition_premium')).not.toBeNull();
    expect(ctx.read('conformal_ci')).not.toBeNull();
  });
});
