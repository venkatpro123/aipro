// signalOrchestrator.test.ts — P0 editorial layer
//
// Verifies the orchestrator is pure, caps the primary surface, applies
// profile-relevance re-ranking, feasibility-gates the primary move, and never
// mutates the shared compressed-intel inputs.

import { describe, it, expect } from 'vitest';
import {
  orchestrate,
  orchestrateFromIntel,
  pickPrimaryMove,
  type OrchestratedFeed,
} from '../../services/orchestration/signalOrchestrator';
import type { CompressedIntel, CompressedSignal } from '../../services/signalCompressionService';
import type { ProfileSignalSummary } from '../../services/actionPersonalizationEngine';
import type { HybridResult, ActionPlanItem } from '../../types/hybridResult';

// ── Builders ──────────────────────────────────────────────────────────────────

function mkSignal(over: Partial<CompressedSignal>): CompressedSignal {
  return {
    id: 'sig',
    tier: 3,
    severity: 40,
    verdict: 'softening',
    headline: 'Signal',
    rationale: 'rationale',
    chips: [{ label: 'Δ', value: '-8%', tone: 'warning' }],
    tone: '#f59e0b',
    group: 'company',
    sourceKind: 'live',
    fetchedAt: '2026-05-01T00:00:00Z',
    ...over,
  };
}

function mkIntel(ordered: CompressedSignal[], hasTier1Critical = false): CompressedIntel {
  // The four named buckets aren't read by the orchestrator (it uses `ordered`),
  // so we point them at members of `ordered` for type completeness.
  const byGroup = (g: CompressedSignal['group']) =>
    ordered.find(s => s.group === g) ?? mkSignal({ group: g, verdict: 'unknown', severity: 0 });
  return {
    workforce: byGroup('company'),
    financial: byGroup('company'),
    market: byGroup('market'),
    career: byGroup('career'),
    ordered,
    hasTier1Critical,
  };
}

function neutralProfile(over: Partial<ProfileSignalSummary> = {}): ProfileSignalSummary {
  return {
    visaUrgency: 'none',
    runwayTier: 'unknown',
    familyAnchor: false,
    dualIncomeCushion: false,
    resilientRepeat: false,
    equityVestImminent: false,
    seniorMobilityConstraint: false,
    profileMayBeStale: false,
    flags: [],
    ...over,
  };
}

function mkResult(over: Partial<HybridResult> = {}): HybridResult {
  return {
    total: 60,
    confidencePercent: 80,
    recommendations: [],
    ...over,
  } as unknown as HybridResult;
}

function mkRec(over: Partial<ActionPlanItem>): ActionPlanItem {
  return {
    id: 'r',
    title: 'Action',
    description: '',
    priority: 'Medium',
    layerFocus: 'L1',
    riskReductionPct: 10,
    deadline: '2026-06-01',
    ...over,
  } as ActionPlanItem;
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('signalOrchestrator', () => {
  it('is deterministic — identical inputs produce a deep-equal feed', () => {
    const intel = mkIntel([
      mkSignal({ id: 'a', group: 'market', tier: 2, severity: 60 }),
      mkSignal({ id: 'b', group: 'career', tier: 3, severity: 50 }),
    ]);
    const result = mkResult({ recommendations: [mkRec({ id: 'x', priority: 'High' })] });
    const p = neutralProfile();
    const a = orchestrateFromIntel(result, intel, p);
    const b = orchestrateFromIntel(result, intel, p);
    expect(a).toEqual(b);
  });

  it('caps the primary surface and routes the remainder to overflow', () => {
    const signals = Array.from({ length: 6 }, (_, i) =>
      mkSignal({ id: `s${i}`, tier: 2, severity: 70 - i * 5 }),
    );
    const feed = orchestrateFromIntel(mkResult(), mkIntel(signals), neutralProfile(), { cap: 3 });
    expect(feed.primary).toHaveLength(3);
    expect(feed.overflow).toHaveLength(3);
    expect(feed.primary.length + feed.overflow.length).toBe(feed.meta.signalCount);
    expect(feed.meta.cap).toBe(3);
  });

  it('profile-relevance promotes a career signal above a same-tier/severity market signal for visa-critical users', () => {
    const market = mkSignal({ id: 'mkt', group: 'market', tier: 2, severity: 50 });
    const career = mkSignal({ id: 'car', group: 'career', tier: 2, severity: 50 });
    const intel = mkIntel([market, career]); // ordered places market first by default

    const neutral = orchestrateFromIntel(mkResult(), intel, neutralProfile());
    // With no profile, the two tie; stable sort keeps input order (market first).
    expect(neutral.primary[0].signal.id).toBe('mkt');

    const visa = orchestrateFromIntel(
      mkResult(),
      intel,
      neutralProfile({ visaUrgency: 'critical', flags: ['visa_critical'] }),
    );
    expect(visa.primary[0].signal.id).toBe('car');
    expect(visa.primary[0].profileAdjustment).toBeGreaterThan(0);
    expect(visa.primary[0].adjustmentReasons.join(' ')).toMatch(/visa-critical/);
  });

  it('a Tier-1 critical signal can never be demoted off the primary surface', () => {
    const t1 = mkSignal({ id: 't1', group: 'market', tier: 1, severity: 90, verdict: 'critical' });
    const filler = Array.from({ length: 5 }, (_, i) =>
      mkSignal({ id: `f${i}`, group: 'career', tier: 2, severity: 80 }),
    );
    // Even a profile that demotes 'market' and boosts 'career' can't push T1 out.
    const feed = orchestrateFromIntel(
      mkResult(),
      mkIntel([...filler, t1], true),
      neutralProfile({ visaUrgency: 'critical', runwayTier: 'comfortable', flags: ['x'] }),
      { cap: 3 },
    );
    expect(feed.primary.some(s => s.signal.id === 't1')).toBe(true);
  });

  it('feasibility-gates the primary move for runway-critical users', () => {
    const recs = [
      mkRec({ id: 'reskill', title: 'Reskill into ML engineering', priority: 'Critical', riskReductionPct: 40, learningWeeks: { w2: 0, w8: 12, w20: 20 } }),
      mkRec({ id: 'network', title: 'Reactivate professional network', priority: 'High', riskReductionPct: 20 }),
    ];
    const move = pickPrimaryMove(recs, neutralProfile({ runwayTier: 'critical', flags: ['runway_critical'] }));
    expect(move).not.toBeNull();
    expect(move!.action.id).toBe('network'); // fast move chosen over the long reskill bet
    expect(move!.feasibleForProfile).toBe(true);
  });

  it('flags infeasibility when every move is a long bet for a runway-critical user', () => {
    const recs = [
      mkRec({ id: 'deg', title: 'Complete a degree', priority: 'High', sequencePhase: 'quarter1' }),
      mkRec({ id: 'cert', title: 'Earn a certification', priority: 'Critical', learningWeeks: { w2: 0, w8: 16, w20: 24 } }),
    ];
    const move = pickPrimaryMove(recs, neutralProfile({ runwayTier: 'critical', flags: ['runway_critical'] }));
    expect(move).not.toBeNull();
    expect(move!.feasibleForProfile).toBe(false);
  });

  it('returns null primaryMove and still renders a spine when there are no recommendations', () => {
    const feed = orchestrateFromIntel(
      mkResult({ recommendations: [] }),
      mkIntel([mkSignal({ id: 's', severity: 30 })]),
      neutralProfile(),
    );
    expect(feed.primaryMove).toBeNull();
    expect(feed.spine).toContain('Next:');
    expect(feed.spine.length).toBeGreaterThan(10);
  });

  it('does not mutate the shared intel inputs', () => {
    const ordered = [
      mkSignal({ id: 'a', tier: 3, severity: 30 }),
      mkSignal({ id: 'b', tier: 2, severity: 80 }),
    ];
    Object.freeze(ordered);
    ordered.forEach(s => Object.freeze(s));
    const intel = Object.freeze(mkIntel(ordered as CompressedSignal[]));
    expect(() => orchestrateFromIntel(mkResult(), intel, neutralProfile())).not.toThrow();
    // Original order preserved (orchestrator copied before sorting).
    expect(ordered[0].id).toBe('a');
    expect(ordered[1].id).toBe('b');
  });

  it('orchestrate() wires compression + profile derivation end-to-end', () => {
    const result = mkResult({ companyName: 'Acme', recommendations: [mkRec({ priority: 'High' })] });
    const feed: OrchestratedFeed = orchestrate(result, undefined, null);
    expect(feed.intel).toBeDefined();
    expect(feed.profileSignals).toBeDefined();
    expect(feed.meta.usedProfile).toBe(false);
    expect(typeof feed.spine).toBe('string');
    expect(feed.trace.confidence).toMatch(/Confidence:/);
  });

  it('drops non-informative (unknown + zero-severity) signals to a zero score', () => {
    const real = mkSignal({ id: 'real', tier: 2, severity: 60 });
    const empty = mkSignal({ id: 'empty', tier: 1, severity: 0, verdict: 'unknown' });
    const feed = orchestrateFromIntel(mkResult(), mkIntel([empty, real]), neutralProfile(), { cap: 2 });
    const emptyRanked = [...feed.primary, ...feed.overflow].find(s => s.signal.id === 'empty');
    expect(emptyRanked!.relevanceScore).toBe(0);
    // The informative signal ranks first despite the empty one being Tier-1.
    expect(feed.primary[0].signal.id).toBe('real');
  });

  // ── Review-driven coverage hardening ──────────────────────────────────────

  it('with more informative Tier-1s than cap, fits only cap of them (no loss, no dup)', () => {
    const t1s = Array.from({ length: 4 }, (_, i) =>
      mkSignal({ id: `t1-${i}`, tier: 1, severity: 90 - i, verdict: 'critical' }),
    );
    const feed = orchestrateFromIntel(mkResult(), mkIntel(t1s, true), neutralProfile(), { cap: 2 });
    expect(feed.primary).toHaveLength(2);
    expect(feed.overflow).toHaveLength(2);
    // permutation: every input id appears exactly once across primary ∪ overflow
    const ids = [...feed.primary, ...feed.overflow].map(s => s.signal.id).sort();
    expect(ids).toEqual(['t1-0', 't1-1', 't1-2', 't1-3']);
  });

  it('primary ∪ overflow is always an exact permutation of the input signals', () => {
    const signals = [
      mkSignal({ id: 'a', tier: 1, severity: 50, verdict: 'critical' }),
      mkSignal({ id: 'b', tier: 3, severity: 90 }),
      mkSignal({ id: 'c', tier: 2, severity: 40, group: 'career' }),
      mkSignal({ id: 'd', tier: 4, severity: 70, group: 'market' }),
      mkSignal({ id: 'e', tier: 1, severity: 20, verdict: 'critical' }),
    ];
    const feed = orchestrateFromIntel(
      mkResult(),
      mkIntel(signals, true),
      neutralProfile({ visaUrgency: 'critical', runwayTier: 'critical', flags: ['x'] }),
      { cap: 3 },
    );
    const ids = [...feed.primary, ...feed.overflow].map(s => s.signal.id).sort();
    expect(ids).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(feed.primary.length + feed.overflow.length).toBe(5);
  });

  it('primary.length === min(cap, signalCount) when cap exceeds the signal count', () => {
    const feed = orchestrateFromIntel(
      mkResult(),
      mkIntel([mkSignal({ id: 'a', severity: 60 }), mkSignal({ id: 'b', severity: 30 })]),
      neutralProfile(),
      { cap: 5 },
    );
    expect(feed.primary).toHaveLength(2);
    expect(feed.overflow).toHaveLength(0);
  });

  it('relevanceScore never exceeds 100 even for a Tier-1 max-severity signal with a profile boost', () => {
    const t1 = mkSignal({ id: 't1', tier: 1, severity: 100, group: 'career', verdict: 'critical' });
    const feed = orchestrateFromIntel(
      mkResult({ confidencePercent: 100 }),
      mkIntel([t1], true),
      neutralProfile({ visaUrgency: 'critical', flags: ['visa_critical'] }),
    );
    expect(feed.primary[0].relevanceScore).toBeLessThanOrEqual(100);
    expect(feed.primary[0].relevanceScore).toBeGreaterThanOrEqual(0);
  });

  it('a negative profile adjustment (runway-comfortable, dual-income) lowers a company signal score', () => {
    const intel = mkIntel([mkSignal({ id: 'co', group: 'company', tier: 2, severity: 50 })]);
    const base = orchestrateFromIntel(mkResult(), intel, neutralProfile());
    const demoted = orchestrateFromIntel(
      mkResult(),
      intel,
      neutralProfile({ runwayTier: 'comfortable', dualIncomeCushion: true, flags: ['x'] }),
    );
    expect(demoted.primary[0].profileAdjustment).toBeLessThan(0);
    expect(demoted.primary[0].relevanceScore).toBeLessThan(base.primary[0].relevanceScore);
  });

  it('a low-confidence audit still produces nonzero scores (confFactor floor at 0.4)', () => {
    const feed = orchestrateFromIntel(
      mkResult({ confidencePercent: 10 }),
      mkIntel([mkSignal({ id: 's', tier: 2, severity: 60 })]),
      neutralProfile(),
    );
    expect(feed.primary[0].relevanceScore).toBeGreaterThan(0);
  });

  it('isLongBet matches via text regex but not the false-positive word "course"', () => {
    const reskillByText = mkRec({ id: 'cert', title: 'Pursue an online course in ML', priority: 'Critical', riskReductionPct: 40 });
    const fastButCoursy = mkRec({ id: 'fast', title: 'Set a crash course correction with your manager', priority: 'High', riskReductionPct: 20 });
    const move = pickPrimaryMove([reskillByText, fastButCoursy], neutralProfile({ runwayTier: 'critical', flags: ['runway_critical'] }));
    // The "online course" rec is a long bet; the "crash course correction" rec is NOT.
    expect(move!.action.id).toBe('fast');
    expect(move!.feasibleForProfile).toBe(true);
  });

  it('non-runway-critical visa user gets a visa-tilt rationale on a visa-matching move', () => {
    const recs = [mkRec({ id: 'sponsor', title: 'Confirm visa sponsorship transfer options', priority: 'High', riskReductionPct: 30 })];
    const move = pickPrimaryMove(recs, neutralProfile({ visaUrgency: 'elevated', flags: ['visa_elevated'] }));
    expect(move!.feasibleForProfile).toBe(true);
    expect(move!.rationale).toMatch(/work authorisation|authorization|visa/i);
  });

  it('resolveConfidencePercent handles enum, 0-1 float, and missing confidence', () => {
    const intel = mkIntel([mkSignal({ id: 's', tier: 2, severity: 50 })]);
    // Medium enum → 60%
    const med = orchestrateFromIntel({ total: 50, recommendations: [], confidence: 'Medium' } as unknown as HybridResult, intel, neutralProfile());
    expect(med.trace.confidence).toContain('60%');
    // 0-1 float → 75%
    const flt = orchestrateFromIntel({ total: 50, recommendations: [], confidence: 0.75 } as unknown as HybridResult, intel, neutralProfile());
    expect(flt.trace.confidence).toContain('75%');
    // missing → neutral 55%
    const none = orchestrateFromIntel({ total: 50, recommendations: [] } as unknown as HybridResult, intel, neutralProfile());
    expect(none.trace.confidence).toContain('55%');
  });

  it('orchestrate() with a real profile reports usedProfile === true', () => {
    const feed = orchestrate(
      mkResult({ recommendations: [mkRec({ priority: 'High' })] }),
      undefined,
      { visaStatus: 'h1b', savingsMonthsRunway: 2 },
    );
    expect(feed.meta.usedProfile).toBe(true);
    expect(feed.profileSignals.visaUrgency).not.toBe('none');
    expect(feed.profileSignals.runwayTier).toBe('critical');
  });
});
