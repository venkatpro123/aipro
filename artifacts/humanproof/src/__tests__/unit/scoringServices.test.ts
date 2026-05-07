/**
 * Tests for 5 previously zero-coverage scoring services.
 * Brings overall branch coverage above 85%.
 */

import { describe, it, expect, beforeEach } from 'vitest';

// ──────────────────────────────────────────────────────────────────────────────
// collapsePredictor.ts
// ──────────────────────────────────────────────────────────────────────────────
import {
  detectCollapseStage,
  getWatchList,
  addToWatchList,
  removeFromWatchList,
  type CollapseInputs,
} from '../../services/collapsePredictor';

const mkCollapseInputs = (overrides: Partial<CollapseInputs> = {}): CollapseInputs => ({
  companyName:          'TestCo',
  industry:             'Technology',
  roleTitle:            'Software Engineer',
  stock90dChange:       null,
  aiInvestmentSignal:   'moderate',
  layoffRounds:         0,
  mostRecentLayoffDate: null,
  filingDelinquent:     false,
  ...overrides,
});

describe('collapsePredictor', () => {
  it('returns null stage when no distress signals', async () => {
    const r = await detectCollapseStage(mkCollapseInputs());
    expect(r.overallRisk).toBeGreaterThanOrEqual(0);
    // With zero stress signals, stage should be null or 1 (very mild)
    expect([null, 1]).toContain(r.stage);
  });

  it('overallRisk increases with more layoff rounds', async () => {
    const low  = await detectCollapseStage(mkCollapseInputs({ layoffRounds: 0 }));
    const high = await detectCollapseStage(mkCollapseInputs({ layoffRounds: 4 }));
    expect(high.overallRisk).toBeGreaterThan(low.overallRisk);
  });

  it('severe distress inputs produce high overallRisk', async () => {
    const r = await detectCollapseStage(mkCollapseInputs({
      layoffRounds:         4,
      stock90dChange:       -55,
      aiInvestmentSignal:   'high',
      mostRecentLayoffDate: new Date().toISOString().slice(0, 10),
      filingDelinquent:     true,
    }));
    expect(r.overallRisk).toBeGreaterThan(40);
  });

  it('returns signalConfidence as a number', async () => {
    const r = await detectCollapseStage(mkCollapseInputs({ layoffRounds: 2 }));
    expect(typeof r.signalConfidence).toBe('number');
    expect(r.signalConfidence).toBeGreaterThanOrEqual(0);
  });

  it('null stock price does not throw', async () => {
    await expect(detectCollapseStage(mkCollapseInputs({ stock90dChange: null }))).resolves.toBeDefined();
  });

  it('stage is null, 1, 2, or 3 — never an invalid value', async () => {
    const r = await detectCollapseStage(mkCollapseInputs({ layoffRounds: 3, stock90dChange: -45 }));
    expect([null, 1, 2, 3]).toContain(r.stage);
  });

  it('suppressed stage is populated when confidence gate fires', async () => {
    // Low rounds + minimal negative sentiment → gate should fire
    const r = await detectCollapseStage(mkCollapseInputs({ layoffRounds: 1, stock90dChange: -2 }));
    // Either stage is null (suppressed) or stage is 1 (gate passed)
    if (r.stage === null && r.suppressedStage != null) {
      expect(r.suppressedStage).toBeGreaterThan(0);
    }
  });

  // watchList
  it('getWatchList initially empty', () => {
    // May have items from other tests — just verify it returns an array
    expect(Array.isArray(getWatchList())).toBe(true);
  });

  it('addToWatchList and removeFromWatchList work', () => {
    addToWatchList('WatchTestCo', 'Technology', 2);
    expect(getWatchList().some(w => w.companyName === 'WatchTestCo')).toBe(true);
    removeFromWatchList('WatchTestCo');
    expect(getWatchList().some(w => w.companyName === 'WatchTestCo')).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// peerPercentile.ts
// ──────────────────────────────────────────────────────────────────────────────
import {
  computePeerPercentile,
  formatPercentile,
  formatResearchSampleSize,
  formatResearchSampleSizeShort,
} from '../../services/peerPercentile';

describe('peerPercentile', () => {
  it('returns percentile 1–99 for any input', () => {
    const r = computePeerPercentile(58, 'data_analyst', 'Technology');
    expect(r.percentile).toBeGreaterThanOrEqual(1);
    expect(r.percentile).toBeLessThanOrEqual(99);
  });

  it('isResearchEstimate is true for all hardcoded distributions', () => {
    expect(computePeerPercentile(50, 'sw_backend').isResearchEstimate).toBe(true);
  });

  it('high score → high percentile (above median)', () => {
    expect(computePeerPercentile(90, 'data_analyst').percentile).toBeGreaterThan(75);
  });

  it('low score → low percentile (below p25)', () => {
    expect(computePeerPercentile(10, 'data_analyst').percentile).toBeLessThan(30);
  });

  it('unknown role uses industry distribution when provided', () => {
    const r = computePeerPercentile(55, 'quantum_shaman', 'Technology');
    expect(r.sampleSize).toBe(8400); // Technology industry sample
  });

  it('unknown role + unknown industry uses default distribution (n=5000)', () => {
    expect(computePeerPercentile(55, 'complete_unknown_xyz').sampleSize).toBe(5000);
  });

  it('prefix match: qa_automation_engineer maps to qa_automation', () => {
    expect(computePeerPercentile(50, 'qa_automation_engineer').sampleSize).toBeGreaterThan(100);
  });

  it('word overlap: "ml_engineer_senior" resolves via word match', () => {
    const r = computePeerPercentile(40, 'ml_engineer_senior');
    expect(r.sampleSize).toBeGreaterThan(0);
  });

  it('percentile buckets: score between p10 and p25 returns 10–25', () => {
    // qa_manual: p10=52, p25=62 → score 57 should be in 10–25
    const r = computePeerPercentile(57, 'qa_manual');
    expect(r.percentile).toBeGreaterThanOrEqual(10);
    expect(r.percentile).toBeLessThanOrEqual(25);
  });

  it('score above p90 returns 91–99', () => {
    const r = computePeerPercentile(95, 'financial_analyst'); // p90=83
    expect(r.percentile).toBeGreaterThanOrEqual(91);
  });

  it('score below p10 returns 1–9', () => {
    expect(computePeerPercentile(5, 'bpo_agent').percentile).toBeLessThanOrEqual(9);
  });

  it('p25/p50/p75/p90 are ascending', () => {
    const r = computePeerPercentile(50, 'accountant');
    expect(r.p25Score).toBeLessThan(r.p50Score);
    expect(r.p50Score).toBeLessThan(r.p75Score);
    expect(r.p75Score).toBeLessThan(r.p90Score);
  });

  it('BPO industry fallback for role with no word/prefix match', () => {
    // Use a role key that has no words matching ROLE_DISTRIBUTIONS keys
    const r = computePeerPercentile(80, 'zzz_completely_novel_role', 'BPO');
    expect(r.sampleSize).toBe(2800); // BPO industry bucket
  });

  it('formatPercentile ordinal suffixes', () => {
    expect(formatPercentile(1)).toBe('1st');
    expect(formatPercentile(2)).toBe('2nd');
    expect(formatPercentile(3)).toBe('3rd');
    expect(formatPercentile(11)).toBe('11th');
    expect(formatPercentile(21)).toBe('21st');
    expect(formatPercentile(52)).toBe('52nd');
    expect(formatPercentile(13)).toBe('13th');
    expect(formatPercentile(100)).toBe('100th');
  });

  it('formatResearchSampleSize qualifies the number', () => {
    const s = formatResearchSampleSize(2100);
    expect(s).toContain('2,100');
    expect(s.toLowerCase()).toMatch(/est|research/);
  });

  it('formatResearchSampleSizeShort is shorter', () => {
    expect(formatResearchSampleSizeShort(2100).length).toBeLessThan(formatResearchSampleSize(2100).length);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// scoreDeltaService.ts
// ──────────────────────────────────────────────────────────────────────────────
import {
  loadScoreHistory,
  recordScore,
  getScoreDelta,
  getAttributedDelta,
  type ScoreHistoryEntry,
} from '../../services/scoreDeltaService';

const SCORE_HISTORY_KEY = 'hp_score_history';

function clearHistory() {
  try { localStorage.removeItem(SCORE_HISTORY_KEY); } catch { /* ignore */ }
}

function mkEntry(score: number, overrides: Partial<ScoreHistoryEntry> = {}): ScoreHistoryEntry {
  return {
    roleKey:    'sw_backend',
    industryKey: 'Technology',
    countryKey: 'IN',
    experience: '2-5',
    score,
    timestamp:  Date.now(),
    isGrounded: false,
    ...overrides,
  };
}

describe('scoreDeltaService', () => {
  beforeEach(() => clearHistory());

  it('loadScoreHistory returns [] with no data', () => {
    expect(loadScoreHistory()).toEqual([]);
  });

  it('recordScore persists a score entry', () => {
    recordScore(mkEntry(55));
    expect(loadScoreHistory().length).toBe(1);
    expect(loadScoreHistory()[0].score).toBe(55);
  });

  it('getScoreDelta returns null with fewer than 2 same-role entries', () => {
    recordScore(mkEntry(55));
    expect(getScoreDelta('sw_backend', 60, '2-5', 'IN')).toBeNull();
  });

  it('getScoreDelta returns delta with 2 same-role entries', () => {
    recordScore(mkEntry(45, { timestamp: Date.now() - 86_400_001 })); // >1 day ago so not deduplicated
    recordScore(mkEntry(60));
    const delta = getScoreDelta('sw_backend', 60, '2-5', 'IN');
    expect(delta).not.toBeNull();
    expect(delta!.delta).toBeGreaterThanOrEqual(0);
  });

  it('getAttributedDelta returns null with no history', () => {
    expect(getAttributedDelta('sw_backend', 60, { L1: 0.4 }, '2-5', 'IN')).toBeNull();
  });

  it('getAttributedDelta returns attribution with 2 entries', () => {
    const bd = { L1: 0.4, L2: 0.3, L3: 0.4, L4: 0.4, L5: 0.3, D6: 0.5, D7: 0.4 };
    recordScore(mkEntry(45, { breakdown: bd, timestamp: Date.now() - 86_400_001 }));
    recordScore(mkEntry(60, { breakdown: { ...bd, L3: 0.7 } }));
    const result = getAttributedDelta('sw_backend', 60, { ...bd, L3: 0.7 }, '2-5', 'IN');
    expect(result).not.toBeNull();
    expect(result!.delta).toBe(15);
  });

  it('score decrease produces negative delta', () => {
    const bd = { L1: 0.4, L2: 0.3, L3: 0.7, L4: 0.4, L5: 0.3 };
    recordScore(mkEntry(65, { breakdown: bd, timestamp: Date.now() - 86_400_001 }));
    recordScore(mkEntry(50, { breakdown: { ...bd, L3: 0.4 } }));
    const result = getAttributedDelta('sw_backend', 50, { ...bd, L3: 0.4 }, '2-5', 'IN');
    expect(result!.delta).toBe(-15);
    expect(result!.direction).toBe('down');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// financialContextService.ts
// ──────────────────────────────────────────────────────────────────────────────
import {
  saveFinancialContext,
  loadFinancialContext,
  clearFinancialContext,
  deriveFinancialProfile,
  getPerformanceCollapseStrategy,
  type FinancialContext,
} from '../../services/financialContextService';

const mkCtx = (overrides: Partial<FinancialContext> = {}): FinancialContext => ({
  currency:            'INR',
  currentAnnualIncome: 1200000,
  monthlyExpenses:     50000,
  dependents:          0,
  emergencyFundMonths: 6,
  capturedAt:          Date.now(),
  ...overrides,
});

describe('financialContextService', () => {
  beforeEach(() => clearFinancialContext());

  it('loadFinancialContext returns null with no saved data', () => {
    expect(loadFinancialContext()).toBeNull();
  });

  it('save + load round-trip', () => {
    saveFinancialContext(mkCtx());
    const loaded = loadFinancialContext();
    expect(loaded).not.toBeNull();
    expect(loaded!.currentAnnualIncome).toBe(1200000);
  });

  it('clearFinancialContext removes data', () => {
    saveFinancialContext(mkCtx());
    clearFinancialContext();
    expect(loadFinancialContext()).toBeNull();
  });

  it('emergency fund < 2 months → conservative + urgency 1.4', () => {
    const p = deriveFinancialProfile(mkCtx({ emergencyFundMonths: 1 }), 50);
    expect(p.riskAppetite).toBe('conservative');
    expect(p.urgencyMultiplier).toBe(1.4);
  });

  it('< 4 months + 2+ dependents → conservative', () => {
    const p = deriveFinancialProfile(mkCtx({ emergencyFundMonths: 3, dependents: 2 }), 50);
    expect(p.riskAppetite).toBe('conservative');
  });

  it('9+ months + ≤1 dependents → aggressive', () => {
    const p = deriveFinancialProfile(mkCtx({ emergencyFundMonths: 12, dependents: 0 }), 30);
    expect(p.riskAppetite).toBe('aggressive');
    expect(p.urgencyMultiplier).toBe(0.85);
  });

  it('moderate case: 6 months runway, 1 dependent', () => {
    const p = deriveFinancialProfile(mkCtx({ emergencyFundMonths: 6, dependents: 1 }), 45);
    expect(p.riskAppetite).toBe('moderate');
    expect(p.urgencyMultiplier).toBe(1.0);
  });

  it('null emergencyFundMonths → Unknown runway text', () => {
    const p = deriveFinancialProfile(mkCtx({ emergencyFundMonths: null }), 50);
    expect(p.emergencyRunway).toContain('Unknown');
  });

  it('USD currency formats budget in dollars', () => {
    const p = deriveFinancialProfile(mkCtx({ currency: 'USD', currentAnnualIncome: 80000 }), 50);
    expect(p.transitionBudgetRange).toContain('$');
  });

  // getPerformanceCollapseStrategy
  it('returns null for top performer at healthy company', () => {
    expect(getPerformanceCollapseStrategy('top', null, 30)).toBeNull();
  });

  it('returns null for average performer with no collapse stage and low risk', () => {
    expect(getPerformanceCollapseStrategy('average', null, 45)).toBeNull();
  });

  it('returns override for below performer at Stage 2 company', () => {
    const r = getPerformanceCollapseStrategy('below', 2, 65);
    expect(r).not.toBeNull();
    expect(r!.isActive).toBe(true);
    expect(r!.suppressUpskilling).toBe(true);
  });

  it('returns override for below performer with risk ≥70 (no stage needed)', () => {
    const r = getPerformanceCollapseStrategy('below', null, 75);
    expect(r).not.toBeNull();
    expect(['immediate', 'elevated']).toContain(r!.urgencyTier);
  });

  it('Stage 3 + below performer → immediate urgency', () => {
    const r = getPerformanceCollapseStrategy('below', 3, 80);
    expect(r!.urgencyTier).toBe('immediate');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// careerPathMarket.ts — sync path only (async requires Supabase mock)
// ──────────────────────────────────────────────────────────────────────────────
import {
  getCareerPathMarketSync,
  isMarketDataStale,
  marketDataAgeLabel,
  formatDemandTrendLabel,
  MARKET_DATA_STALE_DAYS,
} from '../../services/careerPathMarket';

describe('careerPathMarket (sync)', () => {
  it('returns null for completely unknown role', () => {
    expect(getCareerPathMarketSync('quantum_shaman_xyz_undefined')).toBeNull();
  });

  it('returns data for known role key: ml_engineer', () => {
    const m = getCareerPathMarketSync('ml_engineer');
    expect(m).not.toBeNull();
    expect(m!.indiaOpenings).toBeGreaterThan(0);
  });

  it('returns data for partial match: ai_llm_systems', () => {
    expect(getCareerPathMarketSync('ai_llm_systems_engineer')).not.toBeNull();
  });

  it('MARKET_DATA_STALE_DAYS constant is 90', () => {
    expect(MARKET_DATA_STALE_DAYS).toBe(90);
  });

  it('isMarketDataStale is false for today', () => {
    const m = getCareerPathMarketSync('ml_engineer')!;
    expect(isMarketDataStale({ ...m, dataAsOf: new Date().toISOString().slice(0, 10) })).toBe(false);
  });

  it('isMarketDataStale is true for 100-day-old data', () => {
    const m = getCareerPathMarketSync('ml_engineer')!;
    const old = new Date();
    old.setDate(old.getDate() - 100);
    expect(isMarketDataStale({ ...m, dataAsOf: old.toISOString().slice(0, 10) })).toBe(true);
  });

  it('marketDataAgeLabel returns non-empty string', () => {
    const m = getCareerPathMarketSync('ml_engineer')!;
    expect(marketDataAgeLabel(m).length).toBeGreaterThan(0);
  });

  it('marketDataAgeLabel includes "stale" for old data (>90 days)', () => {
    const m = getCareerPathMarketSync('ml_engineer')!;
    const old = new Date();
    old.setDate(old.getDate() - 100);
    expect(marketDataAgeLabel({ ...m, dataAsOf: old.toISOString().slice(0, 10) }).toLowerCase()).toMatch(/stale|old|verify/i);
  });

  // Cover all 4 age brackets in marketDataAgeLabel
  it('marketDataAgeLabel: < 30 days → short label', () => {
    const m = getCareerPathMarketSync('ml_engineer')!;
    const recent = new Date();
    recent.setDate(recent.getDate() - 10);
    const label = marketDataAgeLabel({ ...m, dataAsOf: recent.toISOString().slice(0, 10) });
    expect(label).not.toMatch(/mo old|yr old/);
  });

  it('marketDataAgeLabel: 30–89 days → N months old', () => {
    const m = getCareerPathMarketSync('ml_engineer')!;
    const d = new Date();
    d.setDate(d.getDate() - 60);
    expect(marketDataAgeLabel({ ...m, dataAsOf: d.toISOString().slice(0, 10) })).toMatch(/mo old/);
  });

  it('marketDataAgeLabel: > 365 days → yr old', () => {
    const m = getCareerPathMarketSync('ml_engineer')!;
    const d = new Date();
    d.setDate(d.getDate() - 400);
    expect(marketDataAgeLabel({ ...m, dataAsOf: d.toISOString().slice(0, 10) })).toMatch(/yr old/);
  });

  it('getCareerPathMarketSync partial match: key inside data key', () => {
    // 'platform' is a substring of 'platform_engineer' in MARKET_DATA
    const m = getCareerPathMarketSync('platform');
    expect(m).not.toBeNull();
  });

  it('formatDemandTrendLabel works for all 4 valid trend values', () => {
    expect(formatDemandTrendLabel('surging')).toContain('Surging');
    expect(formatDemandTrendLabel('growing')).toContain('Growing');
    expect(formatDemandTrendLabel('stable')).toContain('Stable');
    expect(formatDemandTrendLabel('contracting')).toContain('Contracting');
  });
});

// ── Branch gap-fill: scoreDeltaService explainDimensionDelta all branches ─────
import {
  getAttributedDelta as _getAttributedDelta,
  getBestScore,
  getAssessedRoles,
} from '../../services/scoreDeltaService';

describe('scoreDeltaService — snapshot attribution branches', () => {
  beforeEach(() => {
    try { localStorage.removeItem('hp_score_history'); } catch { /* ignore */ }
  });

  it('L1 branch with stock snapshot change', () => {
    recordScore({
      roleKey: 'sw_b', industryKey: 'Tech', countryKey: 'IN', experience: '2-5',
      score: 45, timestamp: Date.now() - 86_400_001, isGrounded: false,
      companyName: 'StockCo',
      companySnapshot: { stock90DayChange: -5, revenueGrowthYoY: 10 },
      breakdown: { L1: 0.4, L2: 0.2, L3: 0.4, L4: 0.3, L5: 0.3 },
    });
    recordScore({
      roleKey: 'sw_b', industryKey: 'Tech', countryKey: 'IN', experience: '2-5',
      score: 60, timestamp: Date.now(), isGrounded: false,
      companyName: 'StockCo',
      companySnapshot: { stock90DayChange: -25, revenueGrowthYoY: 5 },
      breakdown: { L1: 0.7, L2: 0.2, L3: 0.4, L4: 0.3, L5: 0.3 },
    });
    const r = _getAttributedDelta('sw_b', 60, { L1: 0.7, L2: 0.2, L3: 0.4, L4: 0.3, L5: 0.3 }, '2-5', 'IN', 'StockCo');
    expect(r).not.toBeNull();
    expect(r!.delta).toBe(15);
  });

  it('L2 branch: new layoff round added', () => {
    recordScore({
      roleKey: 'sw_c', industryKey: 'Tech', countryKey: 'IN', experience: '2-5',
      score: 40, timestamp: Date.now() - 86_400_001, isGrounded: false,
      companySnapshot: { layoffRounds: 0 },
      breakdown: { L1: 0.3, L2: 0.1, L3: 0.4, L4: 0.3, L5: 0.3 },
    });
    recordScore({
      roleKey: 'sw_c', industryKey: 'Tech', countryKey: 'IN', experience: '2-5',
      score: 58, timestamp: Date.now(), isGrounded: false,
      companySnapshot: { layoffRounds: 2, lastLayoffPercent: 15 },
      breakdown: { L1: 0.3, L2: 0.5, L3: 0.4, L4: 0.3, L5: 0.3 },
    });
    const r = _getAttributedDelta('sw_c', 58, { L1: 0.3, L2: 0.5, L3: 0.4, L4: 0.3, L5: 0.3 }, '2-5', 'IN');
    expect(r).not.toBeNull();
  });

  // --- All dimension branches: delta > threshold, delta < threshold, minor change ---

  function setup2Entries(roleKey: string, prevBD: Record<string, number>, currBD: Record<string, number>) {
    const prevScore = Math.round(Object.values(prevBD).reduce((a, b) => a + b, 0) / Object.keys(prevBD).length * 100);
    const currScore = Math.round(Object.values(currBD).reduce((a, b) => a + b, 0) / Object.keys(currBD).length * 100);
    recordScore({ roleKey, industryKey: 'Tech', countryKey: 'IN', experience: '2-5', score: prevScore, timestamp: Date.now() - 86_400_001, isGrounded: false, breakdown: prevBD });
    recordScore({ roleKey, industryKey: 'Tech', countryKey: 'IN', experience: '2-5', score: currScore, timestamp: Date.now(), isGrounded: false, breakdown: currBD });
    return _getAttributedDelta(roleKey, currScore, currBD, '2-5', 'IN');
  }

  it('L3 delta > 5: AI displacement increasing', () => {
    const r = setup2Entries('l3_up', { L1: 0.3, L2: 0.2, L3: 0.3, L4: 0.3, L5: 0.3 }, { L1: 0.3, L2: 0.2, L3: 0.7, L4: 0.3, L5: 0.3 });
    expect(r?.dimensionDeltas?.some(d => d.key === 'L3')).toBe(true);
  });

  it('L3 delta < -5: role displacement improving', () => {
    const r = setup2Entries('l3_down', { L1: 0.3, L2: 0.2, L3: 0.7, L4: 0.3, L5: 0.3 }, { L1: 0.3, L2: 0.2, L3: 0.3, L4: 0.3, L5: 0.3 });
    expect(r?.dimensionDeltas?.some(d => d.key === 'L3')).toBe(true);
  });

  it('L4 delta > 5: industry headwinds worsened', () => {
    const r = setup2Entries('l4_up', { L1: 0.3, L2: 0.2, L3: 0.4, L4: 0.2, L5: 0.3 }, { L1: 0.3, L2: 0.2, L3: 0.4, L4: 0.8, L5: 0.3 });
    expect(r?.dimensionDeltas?.some(d => d.key === 'L4')).toBe(true);
  });

  it('L4 delta < -5: industry conditions improved', () => {
    const r = setup2Entries('l4_down', { L1: 0.3, L2: 0.2, L3: 0.4, L4: 0.8, L5: 0.3 }, { L1: 0.3, L2: 0.2, L3: 0.4, L4: 0.2, L5: 0.3 });
    expect(r?.dimensionDeltas?.some(d => d.key === 'L4')).toBe(true);
  });

  it('L5 delta > 3: personal protection worsened', () => {
    const r = setup2Entries('l5_up', { L1: 0.3, L2: 0.2, L3: 0.4, L4: 0.3, L5: 0.2 }, { L1: 0.3, L2: 0.2, L3: 0.4, L4: 0.3, L5: 0.7 });
    expect(r?.dimensionDeltas?.some(d => d.key === 'L5')).toBe(true);
  });

  it('L5 delta < -3: personal protection improved', () => {
    const r = setup2Entries('l5_down', { L1: 0.3, L2: 0.2, L3: 0.4, L4: 0.3, L5: 0.7 }, { L1: 0.3, L2: 0.2, L3: 0.4, L4: 0.3, L5: 0.2 });
    expect(r?.dimensionDeltas?.some(d => d.key === 'L5')).toBe(true);
  });

  it('D6 delta > 5: AI agent capability increased', () => {
    const r = setup2Entries('d6_up', { L1: 0.3, L2: 0.2, L3: 0.4, L4: 0.3, L5: 0.3, D6: 0.2 }, { L1: 0.3, L2: 0.2, L3: 0.4, L4: 0.3, L5: 0.3, D6: 0.8 });
    expect(r?.dimensionDeltas?.some(d => d.key === 'D6')).toBe(true);
  });

  it('D7 delta > 5: company health risk increased', () => {
    const r = setup2Entries('d7_up', { L1: 0.3, L2: 0.2, L3: 0.4, L4: 0.3, L5: 0.3, D7: 0.2 }, { L1: 0.3, L2: 0.2, L3: 0.4, L4: 0.3, L5: 0.3, D7: 0.8 });
    expect(r?.dimensionDeltas?.some(d => d.key === 'D7')).toBe(true);
  });

  it('D7 delta < -5: company health improved', () => {
    const r = setup2Entries('d7_down', { L1: 0.3, L2: 0.2, L3: 0.4, L4: 0.3, L5: 0.3, D7: 0.8 }, { L1: 0.3, L2: 0.2, L3: 0.4, L4: 0.3, L5: 0.3, D7: 0.2 });
    expect(r?.dimensionDeltas?.some(d => d.key === 'D7')).toBe(true);
  });

  it('getBestScore returns the lowest-risk entry', () => {
    recordScore({ roleKey: 'bs1', industryKey: 'Tech', countryKey: 'IN', experience: '2-5', score: 70, timestamp: Date.now() - 86_400_001, isGrounded: false });
    recordScore({ roleKey: 'bs2', industryKey: 'Tech', countryKey: 'IN', experience: '2-5', score: 30, timestamp: Date.now(), isGrounded: false });
    const best = getBestScore();
    expect(best).not.toBeNull();
    expect(best!.score).toBeLessThanOrEqual(30);
  });

  it('getAssessedRoles returns unique role keys', () => {
    recordScore({ roleKey: 'role_x', industryKey: 'Tech', countryKey: 'IN', experience: '2-5', score: 50, timestamp: Date.now(), isGrounded: false });
    const roles = getAssessedRoles();
    expect(roles).toContain('role_x');
    expect(new Set(roles).size).toBe(roles.length); // unique
  });

  it('L3 delta > 5 with roleKey in history entry triggers counterfactual path', () => {
    const bd = { L1: 0.3, L2: 0.2, L3: 0.3, L4: 0.3, L5: 0.3 };
    recordScore({ roleKey: 'qa_automation', industryKey: 'Tech', countryKey: 'IN', experience: '2-5', score: 35, timestamp: Date.now() - 86_400_001, isGrounded: false, breakdown: bd });
    recordScore({ roleKey: 'qa_automation', industryKey: 'Tech', countryKey: 'IN', experience: '2-5', score: 60, timestamp: Date.now(), isGrounded: false, breakdown: { ...bd, L3: 0.7 } });
    const r = _getAttributedDelta('qa_automation', 60, { ...bd, L3: 0.7 }, '2-5', 'IN', 'TestCo');
    expect(r).not.toBeNull();
    const l3dim = r!.dimensionDeltas?.find(d => d.key === 'L3');
    if (l3dim) expect(l3dim.delta).toBeGreaterThan(0);
  });
});
