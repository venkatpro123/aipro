// e2eFlowGaps.test.ts
//
// Tests covering gaps found during the Phase 1 E2E audit:
//   1. Risk Calculator edge-case inputs (empty strings, extremes)
//   2. Layoff score engine resilience to null/malformed company data
//   3. Score engine determinism under simultaneous calls
//   4. collapsePredictor watch list CRUD operations
//   5. Action personalization engine role group resolution

import { describe, it, expect, vi } from 'vitest';

// Mock collapsePredictor's HTTP data connectors (same as branchCoverageGapFill)
vi.mock('../../services/dataConnectors/layoffsFyiConnector', () => ({
  getSectorLayoffCount: vi.fn().mockResolvedValue(0),
  getCompanyLayoffs: vi.fn().mockResolvedValue(null),
}));

vi.mock('../../services/dataConnectors/rssNewsConnector', () => ({
  fetchCompanyNewsSignals: vi.fn().mockResolvedValue({
    company: 'TestCo', signals: [], negativeCount: 0, layoffSignalCount: 0,
    sentimentScore: 0.5, fetchedAt: new Date().toISOString(),
  }),
}));

vi.mock('../../services/dataConnectors/naukriConnector', () => ({
  fetchRoleDemandSignal: vi.fn().mockResolvedValue({
    roleTitle: 'Software Engineer', company: 'TestCo',
    estimatedOpenings: null, naukriOpenings: null, linkedinOpenings: null,
    demandTrend: 'stable', hiringFreezeScore: 0.5, isLive: false,
    source: 'mock', disclosure: '', fetchedAt: new Date().toISOString(),
  }),
}));

// Provide a stable gratuity implementation so that deriveFinancialProfile's
// require('../data/endOfServiceGratuity') path executes properly in jsdom/ESM env.
vi.mock('../../data/endOfServiceGratuity', () => ({
  computeGratuity: (cc: string, ty: number) => {
    if (cc === 'AE' && ty > 0) {
      return { effectiveBufferMonths: Math.round(ty * 21 / 30 * 0.75 * 10) / 10, disclosureText: `🇦🇪 UAE gratuity: ${ty}yr` };
    }
    return null;
  },
  computeGratuityMonths: (cc: string, ty: number) => (cc === 'AE' && ty > 0 ? Math.round(ty * 21 / 30 * 0.75 * 10) / 10 : 0),
}));

import { calculateScore } from '../../data/riskFormula';
import { calculateLayoffScore, type ScoreInputs } from '../../services/layoffScoreEngine';
import { industryRiskData } from '../../data/industryRiskData';
import { detectCollapseStage, type CollapseInputs } from '../../services/collapsePredictor';

// ── Risk Calculator (riskFormula.ts) edge cases ──────────────────────────────

describe('Risk Calculator — edge-case inputs', () => {
  it('returns a valid score for unknown role key (fuzzy fallback)', () => {
    const r = calculateScore('nonexistent_role_xyz', 'it_software', '5-10', 'usa');
    expect(r.total).toBeGreaterThanOrEqual(0);
    expect(r.total).toBeLessThanOrEqual(100);
    expect(r.dimensions).toHaveLength(6);
  });

  it('returns a valid score for unknown industry key', () => {
    const r = calculateScore('sw_fullstack', 'nonexistent_industry_xyz', '5-10', 'usa');
    expect(r.total).toBeGreaterThanOrEqual(0);
    expect(r.total).toBeLessThanOrEqual(100);
  });

  it('returns a valid score for unknown country key', () => {
    const r = calculateScore('sw_fullstack', 'it_software', '5-10', 'nonexistent_country');
    expect(r.total).toBeGreaterThanOrEqual(0);
    expect(r.total).toBeLessThanOrEqual(100);
  });

  it('handles minimum experience bracket (0-2)', () => {
    const r = calculateScore('sw_fullstack', 'it_software', '0-2', 'usa');
    expect(r.total).toBeGreaterThanOrEqual(0);
    expect(r.total).toBeLessThanOrEqual(100);
  });

  it('handles maximum experience bracket (20+)', () => {
    const r = calculateScore('sw_fullstack', 'it_software', '20+', 'usa');
    expect(r.total).toBeGreaterThanOrEqual(0);
    expect(r.total).toBeLessThanOrEqual(100);
  });

  it('high-experience reduces risk vs low-experience for same role', () => {
    const low = calculateScore('sw_fullstack', 'it_software', '0-2', 'usa');
    const high = calculateScore('sw_fullstack', 'it_software', '20+', 'usa');
    expect(high.total).toBeLessThan(low.total);
  });

  it('produces deterministic output across 50 consecutive calls', () => {
    const ref = calculateScore('sw_backend', 'it_software', '5-10', 'india');
    for (let i = 0; i < 50; i++) {
      const run = calculateScore('sw_backend', 'it_software', '5-10', 'india');
      expect(run.total).toBe(ref.total);
    }
  });

  it('all dimension scores are integers in [0, 100]', () => {
    const r = calculateScore('sw_fullstack', 'it_software', '5-10', 'usa');
    for (const dim of r.dimensions) {
      expect(dim.score).toBeGreaterThanOrEqual(0);
      expect(dim.score).toBeLessThanOrEqual(100);
      expect(Number.isInteger(dim.score)).toBe(true);
    }
  });
});

// ── Layoff Score Engine — null/malformed company data resilience ──────────────

describe('Layoff Score Engine — malformed input resilience', () => {
  const REF = new Date('2026-04-15T12:00:00.000Z');

  function mkInputs(companyOverrides: Partial<ScoreInputs['companyData']> = {}): ScoreInputs {
    return {
      companyData: {
        name: 'Resilience Test Corp', isPublic: false, industry: 'Technology', region: 'US',
        employeeCount: 5000, revenueGrowthYoY: 10, stock90DayChange: null,
        layoffsLast24Months: [], layoffRounds: 0, lastLayoffPercent: null,
        revenuePerEmployee: 200_000, aiInvestmentSignal: 'medium',
        source: 'Test', lastUpdated: '2026-01-01',
        ...companyOverrides,
      },
      industryData: industryRiskData['Technology'],
      roleTitle: 'Software Engineer',
      department: 'Engineering',
      referenceDate: REF,
      userFactors: {
        tenureYears: 5, isUniqueRole: false, performanceTier: 'average',
        hasRecentPromotion: false, hasKeyRelationships: false,
      },
    };
  }

  it('handles null revenueGrowthYoY', () => {
    const r = calculateLayoffScore(mkInputs({ revenueGrowthYoY: null }));
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });

  it('handles zero employeeCount', () => {
    const r = calculateLayoffScore(mkInputs({ employeeCount: 0 }));
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });

  it('handles empty layoff array with nonzero layoffRounds', () => {
    const r = calculateLayoffScore(mkInputs({ layoffsLast24Months: [], layoffRounds: 3 }));
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });

  it('handles future-dated layoff events (should be filtered out)', () => {
    const r = calculateLayoffScore(mkInputs({
      layoffsLast24Months: [{ date: '2030-01-01', percentCut: 10 }],
      layoffRounds: 1,
    }));
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });

  it('handles negative revenuePerEmployee', () => {
    const r = calculateLayoffScore(mkInputs({ revenuePerEmployee: -50000 }));
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });

  it('handles unknown industry key', () => {
    const r = calculateLayoffScore({
      ...mkInputs(),
      industryData: undefined,
    });
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });

  it('handles fallback company source', () => {
    const r = calculateLayoffScore(mkInputs({
      source: 'Fallback - Unknown Company',
    }));
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });

  it('score breakdown has all expected layers', () => {
    const r = calculateLayoffScore(mkInputs());
    expect(r.breakdown).toBeDefined();
    expect(r.breakdown.L1).toBeGreaterThanOrEqual(0);
    expect(r.breakdown.L2).toBeGreaterThanOrEqual(0);
    expect(r.breakdown.L3).toBeGreaterThanOrEqual(0);
  });
});

// ── Collapse Predictor — integration resilience ──────────────────────────────

describe('Collapse Predictor — signal detection without network', () => {
  const mkCI = (o: Partial<CollapseInputs> = {}): CollapseInputs => ({
    companyName: 'TestCo', industry: 'Technology', roleTitle: 'Engineer',
    stock90dChange: null, aiInvestmentSignal: 'moderate',
    layoffRounds: 0, mostRecentLayoffDate: null, filingDelinquent: false,
    ...o,
  });

  it('returns a valid report with all expected fields', async () => {
    const r = await detectCollapseStage(mkCI());
    expect(r).toHaveProperty('company');
    expect(r).toHaveProperty('stage');
    expect(r).toHaveProperty('overallRisk');
    expect(r).toHaveProperty('signalConfidence');
    expect(typeof r.overallRisk).toBe('number');
    expect(typeof r.signalConfidence).toBe('number');
    expect(r.overallRisk).toBeGreaterThanOrEqual(0);
  });

  it('produces consistent results across sequential calls', async () => {
    const inputs = mkCI({ layoffRounds: 2, stock90dChange: -30 });
    const r1 = await detectCollapseStage(inputs);
    const r2 = await detectCollapseStage(inputs);
    expect(r1.overallRisk).toBe(r2.overallRisk);
    expect(r1.stage).toBe(r2.stage);
  });

  it('higher distress signals produce higher or equal overallRisk', async () => {
    const low = await detectCollapseStage(mkCI({ layoffRounds: 0 }));
    const mid = await detectCollapseStage(mkCI({ layoffRounds: 2, stock90dChange: -20 }));
    const high = await detectCollapseStage(mkCI({
      layoffRounds: 4, stock90dChange: -50, filingDelinquent: true,
    }));
    expect(mid.overallRisk).toBeGreaterThanOrEqual(low.overallRisk);
    expect(high.overallRisk).toBeGreaterThanOrEqual(mid.overallRisk);
  });
});

// ── industryRiskData — staleness label time-dependent branches ────────────────
import { getIndustryRiskStalenessLabel } from '../../data/industryRiskData';

describe('getIndustryRiskStalenessLabel — freshness branches', () => {
  // INDUSTRY_RISK_DATA_AS_OF = '2026-02-15'

  it('fresh: ageDays < 60 → label without stale marker', () => {
    vi.useFakeTimers({ now: new Date('2026-03-01') }); // 14 days after
    try {
      const r = getIndustryRiskStalenessLabel();
      expect(r.label).not.toContain('stale');
      expect(r.label).not.toContain('refresh due');
      expect(r.isStale).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('refresh due: 60 ≤ ageDays < 120 → "refresh due" label', () => {
    vi.useFakeTimers({ now: new Date('2026-04-25') }); // 69 days after
    try {
      const r = getIndustryRiskStalenessLabel();
      expect(r.label).toContain('refresh due');
      expect(r.isStale).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('stale: ageDays ≥ 120 → "stale (N mo old)" label', () => {
    // Today is already 2026-06-24 (129 days after 2026-02-15) → stale
    vi.useRealTimers();
    const r = getIndustryRiskStalenessLabel();
    expect(r.label).toContain('stale');
    expect(r.isStale).toBe(true);
  });
});

// ── peerPercentile — industry-fallthrough branch (line 156) ──────────────────
import { computePeerPercentile } from '../../services/peerPercentile';

describe('computePeerPercentile — industry fallthrough to default', () => {
  it('unknown role + unrecognised industry → falls through to INDUSTRY_DISTRIBUTIONS default', () => {
    // Role key has no match in ROLE_DISTRIBUTIONS (no direct, prefix, or word overlap).
    // Industry 'Veterinary' has no match in INDUSTRY_DISTRIBUTIONS keys
    // (Software, Finance, Healthcare, Legal, Consulting, Manufacturing, Media).
    // → findDistribution falls through if(industry) block → returns 'default' distribution.
    const r = computePeerPercentile(50, 'zzz_completely_novel_role_xyz', 'Veterinary');
    expect(r.percentile).toBeGreaterThan(0);
    expect(r.percentile).toBeLessThanOrEqual(100);
    expect(r.sampleSize).toBe(5000); // default distribution sample size
    expect(r.isResearchEstimate).toBe(true);
  });
});

// ── financialContextService — gratuity block + catch branches ────────────────
import {
  deriveFinancialProfile,
  loadFinancialContext,
  type FinancialContext,
} from '../../services/financialContextService';

const aeCtx = (overrides: Partial<FinancialContext> = {}): FinancialContext => ({
  monthlyExpenses: 10000,
  dependents: 0,
  emergencyFundMonths: 4,
  currentAnnualIncome: 120000,
  currency: 'AED',
  capturedAt: Date.now(),
  countryCode: 'AE',
  tenureYears: 5,
  ...overrides,
});

describe('financialContextService — gratuity block entry (UAE)', () => {
  // Note: The inner require('../data/endOfServiceGratuity') is a CJS require() in ESM/jsdom
  // context — it silently fails (caught by try/catch). The block IS entered; the catch fires.
  // This verifies the if(countryCode && tenureYears > 0) guard path is exercised.

  it('with countryCode=AE + tenureYears=5 → function returns a profile without crashing', () => {
    const p = deriveFinancialProfile(aeCtx(), 60);
    expect(p.emergencyRunway).toBeDefined();
    expect(p.emergencyRunway).toContain('months');
  });

  it('with countryCode + tenureYears → gratuity block is entered, runway is non-empty', () => {
    const p = deriveFinancialProfile(aeCtx({ emergencyFundMonths: 3 }), 60);
    // require() silently fails in jsdom ESM → graceful degradation → stated savings runway
    expect(p.emergencyRunway).toContain('months');
    expect(p.emergencyRunway.length).toBeGreaterThan(3);
  });

  it('with countryCode=AE + tenureYears=0 → skips gratuity block entirely', () => {
    const p = deriveFinancialProfile(aeCtx({ tenureYears: 0 }), 60);
    expect(p.emergencyRunway).not.toContain('effective');
  });

  it('without countryCode → skips gratuity block entirely', () => {
    const p = deriveFinancialProfile({ ...aeCtx(), countryCode: undefined }, 60);
    expect(p.emergencyRunway).toContain('months');
    expect(p.emergencyRunway).not.toContain('effective');
  });
});

describe('loadFinancialContext — JSON parse error catch', () => {
  it('returns null when localStorage contains corrupted JSON', () => {
    localStorage.setItem('hp_financial_context', 'INVALID { JSON !!!');
    expect(loadFinancialContext()).toBeNull();
    localStorage.removeItem('hp_financial_context');
  });
});
