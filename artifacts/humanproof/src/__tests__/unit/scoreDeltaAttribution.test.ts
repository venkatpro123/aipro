// scoreDeltaAttribution.test.ts — Phase 3
//
// Deep coverage of scoreDeltaService.ts:
//   AI_AMP_FACTOR, buildL4SnapshotFields, getBestScore, getAssessedRoles,
//   getUserReturnType, computeScoreVelocity,
//   explainDimensionDelta (all L1-D7 branches via getAttributedDelta).
//
// explainDimensionDelta is a private function — exercised via getAttributedDelta.
// Each test seeds localStorage with a prev/curr history pair containing specific
// companySnapshot data, then calls getAttributedDelta with a currentSnapshot
// whose values differ from the stored prev snapshot, triggering the target branch.

import { describe, it, expect, beforeEach } from 'vitest';
import {
  AI_AMP_FACTOR,
  buildL4SnapshotFields,
  getBestScore,
  getAssessedRoles,
  getUserReturnType,
  getJourneyStage,
  computeScoreVelocity,
  getAttributedDelta,
  recordScore,
  type ScoreHistoryEntry,
} from '../../services/scoreDeltaService';

const HISTORY_KEY = 'hp_score_history';
const ROLE = 'dim_test';
const EXP  = '5-10';
const CTRY = 'US';

function clearHistory() {
  try { localStorage.removeItem(HISTORY_KEY); } catch { /* ignore */ }
}

// Seed history with newest-first order.
// prev = sameRole[1] (older, used as "previous" in attribution).
// curr = sameRole[0] (newer, but only its breakdown matters for the filter).
function seedPair(
  prevScore: number,
  currScore: number,
  prevBd: Record<string, number>,
  currBd: Record<string, number>,
  prevSnap?: ScoreHistoryEntry['companySnapshot'],
  role = ROLE,
) {
  const base = { roleKey: role, industryKey: 'tech', countryKey: CTRY, experience: EXP, isGrounded: false };
  const prev: ScoreHistoryEntry = { ...base, score: prevScore, timestamp: Date.now() - 2 * 86_400_001, breakdown: prevBd, companySnapshot: prevSnap };
  const curr: ScoreHistoryEntry = { ...base, score: currScore, timestamp: Date.now() - 86_400_001, breakdown: currBd };
  localStorage.setItem(HISTORY_KEY, JSON.stringify([curr, prev])); // newest first
}

// Get the attributed DimensionDelta for a given key
function getDim(
  dimKey: string,
  currBd: Record<string, number>,
  currScore: number,
  currSnap?: ScoreHistoryEntry['companySnapshot'],
  company = 'TestCo',
  role = ROLE,
) {
  const result = getAttributedDelta(role, currScore, currBd, EXP, CTRY, company, currSnap);
  return result?.dimensionDeltas?.find(d => d.key === dimKey);
}

// ─── AI_AMP_FACTOR ────────────────────────────────────────────────────────────

describe('AI_AMP_FACTOR', () => {
  it('low → 0.00', () => { expect(AI_AMP_FACTOR['low']).toBe(0.00); });
  it('medium → 0.12', () => { expect(AI_AMP_FACTOR['medium']).toBe(0.12); });
  it('high → 0.52', () => { expect(AI_AMP_FACTOR['high']).toBe(0.52); });
  it('very-high → 0.80', () => { expect(AI_AMP_FACTOR['very-high']).toBe(0.80); });
  it('very_high → 0.80 (backward-compat alias)', () => { expect(AI_AMP_FACTOR['very_high']).toBe(0.80); });
});

// ─── buildL4SnapshotFields ────────────────────────────────────────────────────

describe('buildL4SnapshotFields', () => {
  it('null input returns empty object', () => {
    const r = buildL4SnapshotFields(null);
    expect(Object.keys(r)).toHaveLength(0);
  });

  it('undefined input returns empty object', () => {
    const r = buildL4SnapshotFields(undefined);
    expect(Object.keys(r)).toHaveLength(0);
  });

  it('parentPropagation with name, country, lagMonths → populated', () => {
    const r = buildL4SnapshotFields({
      parentPropagation: {
        parentName: 'Microsoft', parentCountry: 'US',
        lagMonths: { min: 6, max: 9 },
      },
    });
    expect(r.parentCompanyName).toBe('Microsoft');
    expect(r.parentCountry).toBe('US');
    expect(r.propagationLagMonths).toEqual({ min: 6, max: 9 });
  });

  it('parentPropagation without lagMonths → propagationLagMonths undefined', () => {
    const r = buildL4SnapshotFields({
      parentPropagation: { parentName: 'Google' },
    });
    expect(r.parentCompanyName).toBe('Google');
    expect(r.propagationLagMonths).toBeUndefined();
  });

  it('indiaRiskEnrichment with gccArchetype and layoffContagionLag → populated', () => {
    const r = buildL4SnapshotFields({
      indiaRiskEnrichment: {
        gccArchetype: 'strategic_partner',
        gccRiskProfile: { layoffContagionLag: 9 },
      },
    });
    expect(r.gccArchetype).toBe('strategic_partner');
    expect(r.propagationLagMonths).toEqual({ min: 6, max: 9 }); // max(1, 9-3)=6, max=9
  });

  it('gccArchetype "not_gcc" is excluded', () => {
    const r = buildL4SnapshotFields({
      indiaRiskEnrichment: { gccArchetype: 'not_gcc' },
    });
    expect(r.gccArchetype).toBeUndefined();
  });

  it('peerContagion with scoreAmplifier + affectedPeers → populated', () => {
    const r = buildL4SnapshotFields({
      peerContagion: {
        scoreAmplifier: 1.35,
        affectedPeers: [
          { companyName: 'Meta', layoffDate: '2026-01-15', estimatedPercentCut: 12, daysAgo: 5 },
          { companyName: 'Google', layoffDate: '2026-02-01', estimatedPercentCut: 8, daysAgo: 2 },
        ],
      },
    });
    expect(r.peerContagionMultiplier).toBe(1.35);
    expect(r.peerContagionTopPeer).toBe('Google'); // lowest daysAgo
    expect(r.peerContagionAffectedCount).toBe(2);
  });

  it('parentCompanyName matches peer → parentLayoffEvent populated', () => {
    const r = buildL4SnapshotFields({
      parentPropagation: { parentName: 'Meta' },
      peerContagion: {
        scoreAmplifier: 1.2,
        affectedPeers: [
          { companyName: 'Meta', layoffDate: '2026-01-10', estimatedPercentCut: 15, daysAgo: 10 },
        ],
      },
    });
    expect(r.parentCompanyName).toBe('Meta');
    expect(r.parentLayoffEvent?.date).toBe('2026-01-10');
    expect(r.parentLayoffEvent?.percent).toBe(15);
  });

  it('no peerContagion → multiplier and topPeer undefined', () => {
    const r = buildL4SnapshotFields({ parentPropagation: { parentName: 'Oracle' } });
    expect(r.peerContagionMultiplier).toBeUndefined();
    expect(r.peerContagionTopPeer).toBeUndefined();
  });
});

// ─── getBestScore ─────────────────────────────────────────────────────────────

describe('getBestScore', () => {
  beforeEach(clearHistory);

  it('returns null for empty history', () => {
    expect(getBestScore()).toBeNull();
  });

  it('returns the single entry when only one exists', () => {
    recordScore({ roleKey: 'r1', industryKey: 'tech', countryKey: 'IN', experience: '2-5', score: 55, timestamp: Date.now(), isGrounded: false });
    expect(getBestScore()?.score).toBe(55);
  });

  it('returns the lowest score across all entries', () => {
    const base = { industryKey: 'tech', countryKey: 'IN', experience: '2-5', isGrounded: false };
    recordScore({ ...base, roleKey: 'r1', score: 70, timestamp: Date.now() - 3 * 86_400_001 });
    recordScore({ ...base, roleKey: 'r2', score: 35, timestamp: Date.now() - 2 * 86_400_001 });
    recordScore({ ...base, roleKey: 'r3', score: 58, timestamp: Date.now() - 86_400_001 });
    expect(getBestScore()?.score).toBe(35);
  });
});

// ─── getAssessedRoles ─────────────────────────────────────────────────────────

describe('getAssessedRoles', () => {
  beforeEach(clearHistory);

  it('returns [] for empty history', () => {
    expect(getAssessedRoles()).toEqual([]);
  });

  it('deduplicates roles across multiple entries', () => {
    const base = { industryKey: 'tech', countryKey: 'IN', experience: '2-5', isGrounded: false };
    recordScore({ ...base, roleKey: 'sw_backend', score: 55, timestamp: Date.now() - 2 * 86_400_001 });
    recordScore({ ...base, roleKey: 'sw_backend', score: 60, timestamp: Date.now() - 86_400_001 });
    expect(getAssessedRoles()).toEqual(['sw_backend']);
  });

  it('returns all unique roles when multiple distinct roles exist', () => {
    const base = { industryKey: 'tech', countryKey: 'IN', experience: '2-5', isGrounded: false };
    recordScore({ ...base, roleKey: 'sw_backend', score: 55, timestamp: Date.now() - 3 * 86_400_001 });
    recordScore({ ...base, roleKey: 'data_analyst', score: 62, timestamp: Date.now() - 2 * 86_400_001 });
    recordScore({ ...base, roleKey: 'product_manager', score: 48, timestamp: Date.now() - 86_400_001 });
    const roles = getAssessedRoles();
    expect(roles).toContain('sw_backend');
    expect(roles).toContain('data_analyst');
    expect(roles).toContain('product_manager');
  });
});

// ─── getUserReturnType ────────────────────────────────────────────────────────

describe('getUserReturnType', () => {
  beforeEach(clearHistory);

  it('no history → first_time', () => {
    expect(getUserReturnType(ROLE, 60, EXP, CTRY)).toBe('first_time');
  });

  it('only 1 entry → first_time', () => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify([
      { roleKey: ROLE, industryKey: 'tech', countryKey: CTRY, experience: EXP, score: 55, timestamp: Date.now() - 86_400_001, isGrounded: false },
    ]));
    expect(getUserReturnType(ROLE, 60, EXP, CTRY)).toBe('first_time');
  });

  it('delta > 4 (newest score higher than previous) → declining', () => {
    const now = Date.now();
    localStorage.setItem(HISTORY_KEY, JSON.stringify([
      // newest first: score 70 recently, score 55 older
      { roleKey: ROLE, industryKey: 'tech', countryKey: CTRY, experience: EXP, score: 70, timestamp: now - 86_400_001, isGrounded: false },
      { roleKey: ROLE, industryKey: 'tech', countryKey: CTRY, experience: EXP, score: 55, timestamp: now - 2 * 86_400_001, isGrounded: false },
    ]));
    // delta = history[0].score - history[1].score = 70-55 = 15 > 4 → declining
    expect(getUserReturnType(ROLE, 70, EXP, CTRY)).toBe('declining');
  });

  it('delta < -4 → improving', () => {
    const now = Date.now();
    localStorage.setItem(HISTORY_KEY, JSON.stringify([
      { roleKey: ROLE, industryKey: 'tech', countryKey: CTRY, experience: EXP, score: 40, timestamp: now - 86_400_001, isGrounded: false },
      { roleKey: ROLE, industryKey: 'tech', countryKey: CTRY, experience: EXP, score: 60, timestamp: now - 2 * 86_400_001, isGrounded: false },
    ]));
    // delta = 40-60 = -20 < -4 → improving
    expect(getUserReturnType(ROLE, 40, EXP, CTRY)).toBe('improving');
  });

  it('delta = 2 (stable) → stable_returner', () => {
    const now = Date.now();
    // Both entries recent (< 25 days) so velocity baseline30 = null → delta30d = null → stable
    localStorage.setItem(HISTORY_KEY, JSON.stringify([
      { roleKey: ROLE, industryKey: 'tech', countryKey: CTRY, experience: EXP, score: 52, timestamp: now - 86_400_001, isGrounded: false },
      { roleKey: ROLE, industryKey: 'tech', countryKey: CTRY, experience: EXP, score: 50, timestamp: now - 2 * 86_400_001, isGrounded: false },
    ]));
    expect(getUserReturnType(ROLE, 52, EXP, CTRY)).toBe('stable_returner');
  });

  it('accelerating velocity with delta30d > 10 → crisis', () => {
    const now = Date.now();
    const role30 = 'crisis_test_role';
    // An entry from 30 days ago: score 50. Current score 62 → delta30d=12>10 → crisis
    localStorage.setItem(HISTORY_KEY, JSON.stringify([
      { roleKey: role30, industryKey: 'tech', countryKey: CTRY, experience: EXP, score: 52, timestamp: now - 86_400_001, isGrounded: false },
      { roleKey: role30, industryKey: 'tech', countryKey: CTRY, experience: EXP, score: 50, timestamp: now - 30 * 86_400_001, isGrounded: false },
    ]));
    // currentScore=62, baseline30.score=50 → delta30d=12>10 → accelerating → crisis
    expect(getUserReturnType(role30, 62, EXP, CTRY)).toBe('crisis');
  });
});

// ─── computeScoreVelocity ─────────────────────────────────────────────────────

describe('computeScoreVelocity', () => {
  beforeEach(clearHistory);

  it('< 2 entries → null', () => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify([
      { roleKey: ROLE, industryKey: 'tech', countryKey: CTRY, experience: EXP, score: 50, timestamp: Date.now() - 86_400_001, isGrounded: false },
    ]));
    expect(computeScoreVelocity(ROLE, 55, EXP, CTRY)).toBeNull();
  });

  it('no 25d+ entry → delta30d = null', () => {
    const now = Date.now();
    localStorage.setItem(HISTORY_KEY, JSON.stringify([
      { roleKey: ROLE, industryKey: 'tech', countryKey: CTRY, experience: EXP, score: 55, timestamp: now - 86_400_001, isGrounded: false },
      { roleKey: ROLE, industryKey: 'tech', countryKey: CTRY, experience: EXP, score: 50, timestamp: now - 2 * 86_400_001, isGrounded: false },
    ]));
    const v = computeScoreVelocity(ROLE, 60, EXP, CTRY);
    expect(v).not.toBeNull();
    expect(v!.delta30d).toBeNull();
  });

  it('25d+ entry → delta30d set', () => {
    const now = Date.now();
    localStorage.setItem(HISTORY_KEY, JSON.stringify([
      { roleKey: ROLE, industryKey: 'tech', countryKey: CTRY, experience: EXP, score: 55, timestamp: now - 86_400_001, isGrounded: false },
      { roleKey: ROLE, industryKey: 'tech', countryKey: CTRY, experience: EXP, score: 50, timestamp: now - 26 * 86_400_001, isGrounded: false },
    ]));
    const v = computeScoreVelocity(ROLE, 60, EXP, CTRY);
    expect(v!.delta30d).toBe(10); // 60 - 50
  });

  it('delta30d > 10 → accelerating + velocityRiskAddon=0.06', () => {
    const now = Date.now();
    localStorage.setItem(HISTORY_KEY, JSON.stringify([
      { roleKey: ROLE, industryKey: 'tech', countryKey: CTRY, experience: EXP, score: 55, timestamp: now - 86_400_001, isGrounded: false },
      { roleKey: ROLE, industryKey: 'tech', countryKey: CTRY, experience: EXP, score: 48, timestamp: now - 26 * 86_400_001, isGrounded: false },
    ]));
    const v = computeScoreVelocity(ROLE, 62, EXP, CTRY); // delta30d=62-48=14>10
    expect(v!.direction).toBe('accelerating');
    expect(v!.velocityRiskAddon).toBe(0.06);
  });

  it('delta30d 5-10 → accelerating + velocityRiskAddon=0.03', () => {
    const now = Date.now();
    localStorage.setItem(HISTORY_KEY, JSON.stringify([
      { roleKey: ROLE, industryKey: 'tech', countryKey: CTRY, experience: EXP, score: 55, timestamp: now - 86_400_001, isGrounded: false },
      { roleKey: ROLE, industryKey: 'tech', countryKey: CTRY, experience: EXP, score: 51, timestamp: now - 26 * 86_400_001, isGrounded: false },
    ]));
    const v = computeScoreVelocity(ROLE, 58, EXP, CTRY); // delta30d=58-51=7 in (5,10]
    expect(v!.direction).toBe('accelerating');
    expect(v!.velocityRiskAddon).toBe(0.03);
  });

  it('delta30d < -5 → improving + velocityRiskAddon=-0.02', () => {
    const now = Date.now();
    localStorage.setItem(HISTORY_KEY, JSON.stringify([
      { roleKey: ROLE, industryKey: 'tech', countryKey: CTRY, experience: EXP, score: 55, timestamp: now - 86_400_001, isGrounded: false },
      { roleKey: ROLE, industryKey: 'tech', countryKey: CTRY, experience: EXP, score: 65, timestamp: now - 26 * 86_400_001, isGrounded: false },
    ]));
    const v = computeScoreVelocity(ROLE, 58, EXP, CTRY); // delta30d=58-65=-7<-5
    expect(v!.direction).toBe('improving');
    expect(v!.velocityRiskAddon).toBe(-0.02);
  });

  it('delta30d in [-5,5] → stable + velocityRiskAddon=0', () => {
    const now = Date.now();
    localStorage.setItem(HISTORY_KEY, JSON.stringify([
      { roleKey: ROLE, industryKey: 'tech', countryKey: CTRY, experience: EXP, score: 55, timestamp: now - 86_400_001, isGrounded: false },
      { roleKey: ROLE, industryKey: 'tech', countryKey: CTRY, experience: EXP, score: 53, timestamp: now - 26 * 86_400_001, isGrounded: false },
    ]));
    const v = computeScoreVelocity(ROLE, 56, EXP, CTRY); // delta30d=3 in [-5,5]
    expect(v!.direction).toBe('stable');
    expect(v!.velocityRiskAddon).toBe(0);
  });

  it('80d+ entry → delta90d set', () => {
    const now = Date.now();
    localStorage.setItem(HISTORY_KEY, JSON.stringify([
      { roleKey: ROLE, industryKey: 'tech', countryKey: CTRY, experience: EXP, score: 55, timestamp: now - 86_400_001, isGrounded: false },
      { roleKey: ROLE, industryKey: 'tech', countryKey: CTRY, experience: EXP, score: 45, timestamp: now - 85 * 86_400_001, isGrounded: false },
    ]));
    const v = computeScoreVelocity(ROLE, 60, EXP, CTRY);
    expect(v!.delta90d).toBe(15); // 60-45
  });
});

// ─── explainDimensionDelta — L1 (Company Financial Health) ──────────────────

describe('explainDimensionDelta — L1 branches', () => {
  beforeEach(clearHistory);

  it('stock AND revenue both changed → combined text', () => {
    seedPair(50, 65, { L1: 0.30 }, { L1: 0.65 },
      { stock90DayChange: -5, revenueGrowthYoY: 10 });
    const d = getDim('L1', { L1: 0.65 }, 65, { stock90DayChange: -20, revenueGrowthYoY: 3 });
    expect(d?.driver).toContain('Stock');
    expect(d?.driver).toContain('Revenue');
  });

  it('stock changed only (rev same) → stock-only text', () => {
    seedPair(50, 65, { L1: 0.30 }, { L1: 0.65 },
      { stock90DayChange: -5, revenueGrowthYoY: 10 });
    const d = getDim('L1', { L1: 0.65 }, 65, { stock90DayChange: -20, revenueGrowthYoY: 10 });
    expect(d?.driver).toContain('Stock');
    expect(d?.driver).not.toContain('Revenue');
  });

  it('stock improved (curr > prev) → "improved" in driver', () => {
    seedPair(65, 50, { L1: 0.65 }, { L1: 0.30 },
      { stock90DayChange: -30, revenueGrowthYoY: 5 });
    const d = getDim('L1', { L1: 0.30 }, 50, { stock90DayChange: -5, revenueGrowthYoY: 5 });
    expect(d?.driver).toContain('improved');
  });

  it('revenue only changed (no stock data) → revenue text', () => {
    seedPair(50, 65, { L1: 0.30 }, { L1: 0.65 },
      { stock90DayChange: null, revenueGrowthYoY: 15 });
    const d = getDim('L1', { L1: 0.65 }, 65, { stock90DayChange: null, revenueGrowthYoY: -2 });
    expect(d?.driver).toContain('Revenue');
    expect(d?.driver).not.toContain('Stock');
  });

  it('revenue declined → "declined" in driver', () => {
    seedPair(50, 65, { L1: 0.30 }, { L1: 0.65 },
      { stock90DayChange: null, revenueGrowthYoY: 10 });
    const d = getDim('L1', { L1: 0.65 }, 65, { stock90DayChange: null, revenueGrowthYoY: -5 });
    expect(d?.driver).toContain('declined');
  });

  it('no snapshots, delta > 8 → "deteriorated significantly"', () => {
    seedPair(50, 75, { L1: 0.30 }, { L1: 0.80 });
    const d = getDim('L1', { L1: 0.80 }, 75);
    expect(d?.driver).toContain('deteriorated significantly');
  });

  it('no snapshots, delta 4-8 → "weakened"', () => {
    seedPair(50, 57, { L1: 0.30 }, { L1: 0.38 });
    const d = getDim('L1', { L1: 0.38 }, 57);
    expect(d?.driver).toContain('weakened');
  });

  it('no snapshots, delta < -5 → "improved"', () => {
    seedPair(70, 40, { L1: 0.70 }, { L1: 0.30 });
    const d = getDim('L1', { L1: 0.30 }, 40);
    expect(d?.driver).toContain('improved');
  });

  it('no snapshots, small delta (else) → generic direction text', () => {
    seedPair(50, 52, { L1: 0.40 }, { L1: 0.42 });
    const d = getDim('L1', { L1: 0.42 }, 52);
    // else branch: "...financial health increased/decreased by N pts."
    expect(d?.driver).toMatch(/increased|decreased/);
    expect(d?.driver).toContain('pts');
  });
});

// ─── explainDimensionDelta — L2 (Layoff History) ─────────────────────────────

describe('explainDimensionDelta — L2 branches', () => {
  beforeEach(clearHistory);

  it('new layoff round with pct + date → layoff event text with recency weight', () => {
    seedPair(50, 65, { L2: 0.30 }, { L2: 0.65 },
      { layoffRounds: 1 }); // prev had 1 round
    const d = getDim('L2', { L2: 0.65 }, 65, {
      layoffRounds: 2, // curr has 2 rounds → new round detected
      lastLayoffPercent: 12,
      lastLayoffDate: '2026-03-15',
    });
    expect(d?.driver).toContain('Mar');
    expect(d?.driver).toContain('12%');
    expect(d?.driver).toContain('Recency weight');
  });

  it('new layoff round without pct → event text without pct', () => {
    seedPair(50, 65, { L2: 0.30 }, { L2: 0.65 }, { layoffRounds: 0 });
    const d = getDim('L2', { L2: 0.65 }, 65, {
      layoffRounds: 1,
      lastLayoffPercent: null,
      lastLayoffDate: '2026-04-01',
    });
    expect(d?.driver).toContain('Apr');
    expect(d?.driver).not.toContain('%');
  });

  it('new layoff round without date → "recently"', () => {
    seedPair(50, 65, { L2: 0.30 }, { L2: 0.65 }, { layoffRounds: 0 });
    const d = getDim('L2', { L2: 0.65 }, 65, {
      layoffRounds: 1,
      lastLayoffPercent: null,
      lastLayoffDate: null,
    });
    expect(d?.driver).toContain('recently');
  });

  it('no new round, delta > 8 → "sharply"', () => {
    seedPair(50, 80, { L2: 0.30 }, { L2: 0.80 });
    const d = getDim('L2', { L2: 0.80 }, 80);
    expect(d?.driver).toContain('sharply');
  });

  it('no new round, delta 4-8 → moderate increase text', () => {
    seedPair(50, 57, { L2: 0.30 }, { L2: 0.37 });
    const d = getDim('L2', { L2: 0.37 }, 57);
    expect(d?.driver).toContain('increased');
  });

  it('delta < -5 (improvement) → aged-out text', () => {
    seedPair(70, 40, { L2: 0.70 }, { L2: 0.30 });
    const d = getDim('L2', { L2: 0.30 }, 40);
    expect(d?.driver).toContain('aged out');
  });

  it('small delta (else) → generic text', () => {
    seedPair(50, 52, { L2: 0.40 }, { L2: 0.42 });
    const d = getDim('L2', { L2: 0.42 }, 52);
    expect(d?.driver).toMatch(/increased|decreased/);
  });
});

// ─── explainDimensionDelta — L3 (Role Displacement Risk) ─────────────────────

describe('explainDimensionDelta — L3 branches', () => {
  beforeEach(clearHistory);

  it('AI signal escalated (medium→high) → escalation text with amp factors', () => {
    seedPair(50, 65, { L3: 0.30 }, { L3: 0.65 },
      { aiInvestmentSignal: 'medium' });
    const d = getDim('L3', { L3: 0.65 }, 65, { aiInvestmentSignal: 'high' });
    expect(d?.driver).toContain('escalated');
    expect(d?.driver).toContain('0.12'); // medium factor
    expect(d?.driver).toContain('0.52'); // high factor
  });

  it('AI signal de-escalated (high→low) → de-escalation text', () => {
    seedPair(65, 50, { L3: 0.65 }, { L3: 0.30 },
      { aiInvestmentSignal: 'high' });
    const d = getDim('L3', { L3: 0.30 }, 50, { aiInvestmentSignal: 'low' });
    expect(d?.driver).toContain('de-escalated');
  });

  it('no AI signal change, delta > 5 → displacement risk advanced text', () => {
    seedPair(50, 65, { L3: 0.30 }, { L3: 0.65 });
    const d = getDim('L3', { L3: 0.65 }, 65);
    expect(d?.driver).toContain('displacement risk');
    expect(d?.driver).toContain('increased');
  });

  it('no AI signal change, delta < -5 → "lower" role risk text', () => {
    seedPair(65, 50, { L3: 0.65 }, { L3: 0.30 });
    const d = getDim('L3', { L3: 0.30 }, 50);
    expect(d?.driver).toContain('decreased');
  });

  it('small delta (else) → industry adoption text', () => {
    seedPair(50, 52, { L3: 0.40 }, { L3: 0.42 });
    const d = getDim('L3', { L3: 0.42 }, 52);
    expect(d?.driver).toContain('displacement risk');
  });

  it('delta > 5 with known role → counterfactual is undefined (no intel in test env)', () => {
    // MASTER_CAREER_INTELLIGENCE is empty in test env → getCareerIntelligence returns null
    seedPair(50, 65, { L3: 0.30 }, { L3: 0.65 });
    const d = getDim('L3', { L3: 0.65 }, 65, undefined, 'TestCo', 'sw_fullstack');
    // Counterfactual is only set if topSafe is found; in test env it's undefined
    expect(d?.counterfactual).toBeUndefined();
  });
});

// ─── explainDimensionDelta — L4 (Industry Headwinds) ────────────────────────

describe('explainDimensionDelta — L4 branches', () => {
  beforeEach(clearHistory);

  it('new parent event (isIncrease) → parent contagion text', () => {
    seedPair(50, 65, { L4: 0.30 }, { L4: 0.65 }, {});
    const d = getDim('L4', { L4: 0.65 }, 65, {
      parentCompanyName: 'MegaCorp',
      parentLayoffEvent: { date: '2026-01-15', percent: 12, affectedCount: 5000 },
    });
    expect(d?.driver).toContain('MegaCorp');
    expect(d?.driver).toContain('12%');
    expect(d?.driver).toContain('5,000');
  });

  it('parent event with gccArchetype → gcc label in driver', () => {
    seedPair(50, 65, { L4: 0.30 }, { L4: 0.65 }, {});
    const d = getDim('L4', { L4: 0.65 }, 65, {
      parentCompanyName: 'GlobalParent',
      parentLayoffEvent: { date: '2026-02-01', percent: 8 },
      gccArchetype: 'strategic_partner',
      propagationLagMonths: { min: 6, max: 9 },
    });
    expect(d?.driver).toContain('strategic_partner');
    expect(d?.driver).toContain('6-9 months');
  });

  it('parent event without affectedCount → no count in driver', () => {
    seedPair(50, 65, { L4: 0.30 }, { L4: 0.65 }, {});
    const d = getDim('L4', { L4: 0.65 }, 65, {
      parentCompanyName: 'BigCorp',
      parentLayoffEvent: { date: '2026-03-01', percent: 10 },
    });
    expect(d?.driver).toContain('BigCorp');
    expect(d?.driver).not.toContain('affected'); // no affectedCount
  });

  it('equal-min-max lagMonths → singular format "N months"', () => {
    seedPair(50, 65, { L4: 0.30 }, { L4: 0.65 }, {});
    const d = getDim('L4', { L4: 0.65 }, 65, {
      parentCompanyName: 'UniCorp',
      parentLayoffEvent: { date: '2026-01-01', percent: 5 },
      propagationLagMonths: { min: 9, max: 9 },
    });
    expect(d?.driver).toContain('9 months');
  });

  it('peer contagion (multiplierChanged) → peer wave text', () => {
    seedPair(50, 65, { L4: 0.30 }, { L4: 0.65 },
      { peerContagionMultiplier: 1.05 });
    const d = getDim('L4', { L4: 0.65 }, 65, {
      peerContagionMultiplier: 1.35,
      peerContagionTopPeer: 'Meta',
      peerContagionAffectedCount: 8,
    });
    expect(d?.driver).toContain('Meta');
    expect(d?.driver).toContain('1.35');
    expect(d?.driver).toContain('8 peer compan');
  });

  it('peer contagion (topPeerChanged only) → peer wave text', () => {
    seedPair(50, 65, { L4: 0.30 }, { L4: 0.65 },
      { peerContagionTopPeer: 'Amazon' });
    const d = getDim('L4', { L4: 0.65 }, 65, {
      peerContagionTopPeer: 'Google', // changed
    });
    expect(d?.driver).toContain('Google');
  });

  it('peer contagion with gccArchetype → gcc clause in driver', () => {
    seedPair(50, 65, { L4: 0.30 }, { L4: 0.65 }, { peerContagionMultiplier: 1.10 });
    const d = getDim('L4', { L4: 0.65 }, 65, {
      peerContagionMultiplier: 1.40,
      peerContagionTopPeer: 'Salesforce',
      gccArchetype: 'captive',
    });
    expect(d?.driver).toContain('captive');
  });

  it('de-escalation: parent aged out → aged-out text', () => {
    // delta < -5, prevParentEvent exists, currParentEvent absent
    seedPair(70, 40, { L4: 0.70 }, { L4: 0.30 },
      { parentCompanyName: 'OldParent', parentLayoffEvent: { date: '2024-01-15', percent: 8 } });
    const d = getDim('L4', { L4: 0.30 }, 40, {}); // no parentLayoffEvent in curr
    expect(d?.driver).toContain('OldParent');
    expect(d?.driver).toContain('aged out');
  });

  it('de-escalation: peer wave receded → multiplier drop text', () => {
    seedPair(70, 40, { L4: 0.70 }, { L4: 0.30 },
      { peerContagionMultiplier: 1.35 });
    const d = getDim('L4', { L4: 0.30 }, 40, {
      peerContagionMultiplier: 1.05,
    });
    expect(d?.driver).toContain('1.35');
    expect(d?.driver).toContain('1.05');
    expect(d?.driver).toContain('receded');
  });

  it('generic delta > 5 → "more peer companies" text', () => {
    seedPair(50, 65, { L4: 0.30 }, { L4: 0.65 });
    const d = getDim('L4', { L4: 0.65 }, 65);
    expect(d?.driver).toContain('peer compan');
  });

  it('generic delta < -5 → "fewer sector-wide" text', () => {
    seedPair(70, 40, { L4: 0.70 }, { L4: 0.30 });
    const d = getDim('L4', { L4: 0.30 }, 40);
    expect(d?.driver?.toLowerCase()).toContain('fewer');
  });

  it('generic small delta → sector conditions text', () => {
    seedPair(50, 52, { L4: 0.40 }, { L4: 0.42 });
    const d = getDim('L4', { L4: 0.42 }, 52);
    expect(d?.driver).toMatch(/conditions|headwinds/i);
  });
});

// ─── explainDimensionDelta — L5 (Personal Protection) ────────────────────────

describe('explainDimensionDelta — L5 branches', () => {
  beforeEach(clearHistory);

  it('delta > 3 → protection increased risk text', () => {
    seedPair(50, 65, { L5: 0.30 }, { L5: 0.65 });
    const d = getDim('L5', { L5: 0.65 }, 65);
    expect(d?.driver).toContain('increased');
    expect(d?.driver).toContain('Personal protection');
  });

  it('delta < -3 → protection improved text', () => {
    seedPair(65, 50, { L5: 0.65 }, { L5: 0.30 });
    const d = getDim('L5', { L5: 0.30 }, 50);
    expect(d?.driver).toContain('improved');
  });

  it('small delta (else) → generic protection text', () => {
    seedPair(50, 52, { L5: 0.40 }, { L5: 0.42 });
    const d = getDim('L5', { L5: 0.42 }, 52);
    expect(d?.driver).toContain('Personal protection');
  });
});

// ─── explainDimensionDelta — D6 (AI Agent Capability) ────────────────────────

describe('explainDimensionDelta — D6 branches', () => {
  beforeEach(clearHistory);

  it('delta > 5 → "Autonomous AI systems" text', () => {
    seedPair(50, 65, { D6: 0.30 }, { D6: 0.65 });
    const d = getDim('D6', { D6: 0.65 }, 65);
    expect(d?.driver?.toLowerCase()).toContain('autonomous ai');
  });

  it('small delta → "enterprise deployment patterns" text', () => {
    seedPair(50, 52, { D6: 0.40 }, { D6: 0.42 });
    const d = getDim('D6', { D6: 0.42 }, 52);
    expect(d?.driver).toContain('enterprise deployment');
  });
});

// ─── explainDimensionDelta — D7 (Unified Company Health) ─────────────────────

describe('explainDimensionDelta — D7 branches', () => {
  beforeEach(clearHistory);

  it('delta > 5 → "Company Profile tab" text', () => {
    seedPair(50, 65, { D7: 0.30 }, { D7: 0.65 });
    const d = getDim('D7', { D7: 0.65 }, 65);
    expect(d?.driver).toContain('Company Profile tab');
  });

  it('delta < -5 → "improved" health text', () => {
    seedPair(65, 50, { D7: 0.65 }, { D7: 0.30 });
    const d = getDim('D7', { D7: 0.30 }, 50);
    expect(d?.driver).toContain('improved');
  });

  it('small delta (else) → "Minor updates" text', () => {
    seedPair(50, 52, { D7: 0.40 }, { D7: 0.42 });
    const d = getDim('D7', { D7: 0.42 }, 52);
    expect(d?.driver).toContain('Minor updates');
  });
});

// ─── DIMENSION_LABELS completeness ───────────────────────────────────────────
// The default case in explainDimensionDelta is structurally unreachable via
// getAttributedDelta (which only iterates L1-L5, D6, D7 — all handled cases).
// Instead verify that all 7 iterated keys produce non-empty driver text.

describe('all iterated dimension keys produce driver text', () => {
  beforeEach(clearHistory);

  const ALL_KEYS = ['L1', 'L2', 'L3', 'L4', 'L5', 'D6', 'D7'] as const;

  it.each(ALL_KEYS)('%s produces a non-empty driver when delta >= 2', (key) => {
    const prevBd = { [key]: 0.30 };
    const currBd = { [key]: 0.65 };
    seedPair(50, 65, prevBd, currBd);
    const d = getDim(key, currBd, 65);
    expect(d?.driver).toBeTruthy();
    expect(d?.driver.length).toBeGreaterThan(5);
  });
});

// ─── getAttributedDelta — overall structure ───────────────────────────────────

describe('getAttributedDelta overall', () => {
  beforeEach(clearHistory);

  it('returns null when fewer than 2 same-role entries', () => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify([
      { roleKey: ROLE, industryKey: 'tech', countryKey: CTRY, experience: EXP, score: 50, timestamp: Date.now(), isGrounded: false },
    ]));
    expect(getAttributedDelta(ROLE, 55, { L1: 0.4 }, EXP, CTRY)).toBeNull();
  });

  it('direction=same when |delta| < 1', () => {
    seedPair(55, 55, { L1: 0.40, L2: 0.40 }, { L1: 0.40, L2: 0.40 });
    const r = getAttributedDelta(ROLE, 55, { L1: 0.40, L2: 0.40 }, EXP, CTRY);
    expect(r?.direction).toBe('same');
  });

  it('direction=up when delta > 0', () => {
    seedPair(50, 65, { L1: 0.40 }, { L1: 0.60 });
    const r = getAttributedDelta(ROLE, 65, { L1: 0.60 }, EXP, CTRY);
    expect(r?.direction).toBe('up');
    expect(r?.label).toContain('risk increased');
  });

  it('direction=down when delta < 0', () => {
    seedPair(65, 50, { L1: 0.60 }, { L1: 0.40 });
    const r = getAttributedDelta(ROLE, 50, { L1: 0.40 }, EXP, CTRY);
    expect(r?.direction).toBe('down');
    expect(r?.label).toContain('risk improved');
  });

  it('dimensionDeltas sorted by absolute delta descending', () => {
    const bd = { L1: 0.30, L2: 0.30, L3: 0.30, L4: 0.30, L5: 0.30 };
    seedPair(50, 70, bd, { L1: 0.80, L2: 0.50, L3: 0.60, L4: 0.40, L5: 0.32 });
    const r = getAttributedDelta(ROLE, 70, { L1: 0.80, L2: 0.50, L3: 0.60, L4: 0.40, L5: 0.32 }, EXP, CTRY);
    const deltas = r?.dimensionDeltas?.map(d => Math.abs(d.delta)) ?? [];
    for (let i = 1; i < deltas.length; i++) {
      expect(deltas[i]).toBeLessThanOrEqual(deltas[i - 1]);
    }
  });

  it('no previous breakdown → dimensionDeltas is undefined', () => {
    const now = Date.now();
    localStorage.setItem(HISTORY_KEY, JSON.stringify([
      { roleKey: ROLE, industryKey: 'tech', countryKey: CTRY, experience: EXP, score: 60, timestamp: now - 86_400_001, isGrounded: false },
      { roleKey: ROLE, industryKey: 'tech', countryKey: CTRY, experience: EXP, score: 50, timestamp: now - 2 * 86_400_001, isGrounded: false },
      // no breakdown on either
    ]));
    const r = getAttributedDelta(ROLE, 65, { L1: 0.40 }, EXP, CTRY);
    expect(r?.dimensionDeltas).toBeUndefined();
  });

  it('noise filter: dim delta < 2 is excluded', () => {
    // L1 raw diff = 0.01 → display diff = 1 < 2 → filtered out
    seedPair(50, 51, { L1: 0.40 }, { L1: 0.41 });
    const r = getAttributedDelta(ROLE, 51, { L1: 0.41 }, EXP, CTRY);
    const l1 = r?.dimensionDeltas?.find(d => d.key === 'L1');
    expect(l1).toBeUndefined();
  });
});

// ─── getJourneyStage ───────────────────────────────────────────────────────────
// Master Loop, Career Intelligence audit fix #2: classifies longitudinal
// engagement depth (audit frequency + completed actions) so downstream
// consumers (Tier A LLM prompt) can escalate guidance sophistication for
// engaged returning users instead of repeating first-time framing forever.

describe('getJourneyStage', () => {
  beforeEach(clearHistory);

  const ROLE_J = 'journey_test';

  it('no history, 0 completions → foundation', () => {
    expect(getJourneyStage(ROLE_J, EXP, CTRY, 0)).toBe('foundation');
  });

  it('0 audits but 3+ completed actions (e.g. from another role) → execution', () => {
    expect(getJourneyStage(ROLE_J, EXP, CTRY, 3)).toBe('execution');
  });

  it('1 audit, 1 completion → foundation (below both thresholds)', () => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify([
      { roleKey: ROLE_J, industryKey: 'tech', countryKey: CTRY, experience: EXP, score: 55, timestamp: Date.now(), isGrounded: false },
    ]));
    expect(getJourneyStage(ROLE_J, EXP, CTRY, 1)).toBe('foundation');
  });

  it('2 audits for this role → execution', () => {
    const now = Date.now();
    localStorage.setItem(HISTORY_KEY, JSON.stringify([
      { roleKey: ROLE_J, industryKey: 'tech', countryKey: CTRY, experience: EXP, score: 55, timestamp: now - 86_400_001, isGrounded: false },
      { roleKey: ROLE_J, industryKey: 'tech', countryKey: CTRY, experience: EXP, score: 50, timestamp: now - 2 * 86_400_001, isGrounded: false },
    ]));
    expect(getJourneyStage(ROLE_J, EXP, CTRY, 0)).toBe('execution');
  });

  it('8 completed actions → acceleration', () => {
    expect(getJourneyStage(ROLE_J, EXP, CTRY, 8)).toBe('acceleration');
  });

  it('5 audits for this role → acceleration', () => {
    const now = Date.now();
    const entries = Array.from({ length: 5 }, (_, i) => ({
      roleKey: ROLE_J, industryKey: 'tech', countryKey: CTRY, experience: EXP,
      score: 50 + i, timestamp: now - (i + 1) * 86_400_001, isGrounded: false,
    }));
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
    expect(getJourneyStage(ROLE_J, EXP, CTRY, 0)).toBe('acceleration');
  });

  it('16 completed actions → leadership', () => {
    expect(getJourneyStage(ROLE_J, EXP, CTRY, 16)).toBe('leadership');
  });

  it('8 audits for this role → leadership', () => {
    const now = Date.now();
    const entries = Array.from({ length: 8 }, (_, i) => ({
      roleKey: ROLE_J, industryKey: 'tech', countryKey: CTRY, experience: EXP,
      score: 50 + i, timestamp: now - (i + 1) * 86_400_001, isGrounded: false,
    }));
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
    expect(getJourneyStage(ROLE_J, EXP, CTRY, 0)).toBe('leadership');
  });

  it('audits for a DIFFERENT role/experience/country do not count toward this role\'s stage', () => {
    const now = Date.now();
    const entries = Array.from({ length: 8 }, (_, i) => ({
      roleKey: 'other_role', industryKey: 'tech', countryKey: CTRY, experience: EXP,
      score: 50 + i, timestamp: now - (i + 1) * 86_400_001, isGrounded: false,
    }));
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
    expect(getJourneyStage(ROLE_J, EXP, CTRY, 0)).toBe('foundation');
  });
});
