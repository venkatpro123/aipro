// scoreReproducibility.test.ts
//
// PURPOSE
// ───────
// Prove that calculateLayoffScore is a pure function: identical inputs always
// produce an identical output. The engine must have zero variance across 100
// consecutive calls with the same input.
//
// A scoring engine that produces different results for the same input on
// different days is fundamentally untrustworthy — users cannot reason about
// their risk score if it shifts without a data change. This test suite is the
// regression gate for that invariant.
//
// HOW IT WORKS
// ────────────
// Each fixture provides all ScoreInputs including a fixed `referenceDate`.
// The referenceDate is what makes the engine fully deterministic — without it,
// `calculateLayoffHistoryScore` and news-recency decay both call `new Date()`
// internally, producing results that drift as calendar time passes.
//
// FIXTURES: 20 company+role+profile combinations covering:
//   - High / medium / low risk companies
//   - India, US, and neutral regions
//   - All performance tiers (top, average, below, unknown)
//   - Varying tenure (0.5yr to 20yr)
//   - Roles spanning engineering, finance, HR, BPO, healthcare
//   - Companies with layoff history and without
//   - Edge cases: zero layoffs, max layoffs, unknown/fallback company
//
// ASSERTION
// ─────────
// For each fixture: run calculateLayoffScore 100 times. Every run must produce
// the exact same integer score (±0). Any deviation fails the suite.

import { describe, it, expect } from 'vitest';
import { calculateLayoffScore, type ScoreInputs } from '../../services/layoffScoreEngine';
import { industryRiskData } from '../../data/industryRiskData';
import type { CompanyData } from '../../data/companyDatabase';

// ── Fixed reference date — all calculations are anchored here ─────────────────
// Using a specific historical date ensures tests remain reproducible forever,
// not just today. Any date > 24 months before the oldest layoff in any fixture
// would also work, but an explicit anchor is cleaner.
const REF = new Date('2026-04-15T12:00:00.000Z');

// ── Fixture helper ─────────────────────────────────────────────────────────────

function makeCompany(overrides: Partial<CompanyData> & { name: string }): CompanyData {
  return {
    isPublic:             false,
    industry:             'Technology',
    region:               'US',
    employeeCount:        5000,
    revenueGrowthYoY:     10,
    stock90DayChange:     null,
    layoffsLast24Months:  [],
    layoffRounds:         0,
    lastLayoffPercent:    null,
    revenuePerEmployee:   200_000,
    aiInvestmentSignal:   'medium',
    source:               'Manual',
    lastUpdated:          '2026-01-01',
    ...overrides,
  };
}

function makeInputs(
  company: CompanyData,
  role: string,
  department: string,
  userOverrides: Partial<ScoreInputs['userFactors']> = {},
  industryKey = 'Technology',
): ScoreInputs {
  return {
    companyData:   company,
    industryData:  industryRiskData[industryKey] ?? undefined,
    roleTitle:     role,
    department,
    referenceDate: REF,
    userFactors: {
      tenureYears:        5,
      isUniqueRole:       false,
      performanceTier:    'average',
      hasRecentPromotion: false,
      hasKeyRelationships: false,
      ...userOverrides,
    },
  };
}

// ── Fixtures ───────────────────────────────────────────────────────────────────

const FIXTURES: Array<{ label: string; inputs: ScoreInputs }> = [

  // 1. Stable big-tech, senior engineer, top performer
  {
    label: 'Google — Senior SWE, top performer, 8yr tenure',
    inputs: makeInputs(
      makeCompany({
        name: 'Google', isPublic: true, industry: 'Technology', region: 'US',
        employeeCount: 180_000, revenueGrowthYoY: 11, stock90DayChange: 5,
        layoffRounds: 1, lastLayoffPercent: 6,
        layoffsLast24Months: [{ date: '2023-01-20', percentCut: 6 }],
        aiInvestmentSignal: 'very-high', revenuePerEmployee: 320_000,
        lastUpdated: '2026-04-01',
      }),
      'Software Engineer', 'Engineering',
      { tenureYears: 8, performanceTier: 'top', hasKeyRelationships: true },
    ),
  },

  // 2. High-risk FinTech, analyst, average performance
  {
    label: 'Coinbase — Financial Analyst, average, 3yr tenure',
    inputs: makeInputs(
      makeCompany({
        name: 'Coinbase', isPublic: true, industry: 'Finance', region: 'US',
        employeeCount: 3_500, revenueGrowthYoY: -28, stock90DayChange: -40,
        layoffRounds: 2, lastLayoffPercent: 18,
        layoffsLast24Months: [
          { date: '2022-06-14', percentCut: 18 },
          { date: '2023-01-10', percentCut: 20 },
        ],
        aiInvestmentSignal: 'medium', revenuePerEmployee: 120_000,
        lastUpdated: '2025-12-01',
      }),
      'Financial Analyst', 'Finance',
      { tenureYears: 3, performanceTier: 'average' },
      'Finance',
    ),
  },

  // 3. India IT services, recruiter, below-average performance
  {
    label: 'Infosys — Recruiter, below-average, 2yr tenure',
    inputs: makeInputs(
      makeCompany({
        name: 'Infosys', isPublic: true, industry: 'IT Services', region: 'IN',
        employeeCount: 350_000, revenueGrowthYoY: 2, stock90DayChange: -5,
        layoffRounds: 1, lastLayoffPercent: 2,
        layoffsLast24Months: [{ date: '2024-06-01', percentCut: 2 }],
        aiInvestmentSignal: 'medium', revenuePerEmployee: 30_000,
        lastUpdated: '2026-03-01',
      }),
      'Recruiter', 'HR',
      { tenureYears: 2, performanceTier: 'below', isUniqueRole: false },
      'IT Services',
    ),
  },

  // 4. No layoff history, startup, ML engineer, critical knowledge
  {
    label: 'Anthropic — ML Engineer, top performer, critical knowledge',
    inputs: makeInputs(
      makeCompany({
        name: 'Anthropic', isPublic: false, industry: 'Technology', region: 'US',
        employeeCount: 800, revenueGrowthYoY: 120, stock90DayChange: null,
        layoffRounds: 0, lastLayoffPercent: null, layoffsLast24Months: [],
        aiInvestmentSignal: 'very-high', revenuePerEmployee: 400_000,
        lastUpdated: '2026-04-01',
      }),
      'ML Engineer', 'Engineering',
      {
        tenureYears: 3, performanceTier: 'top', uniquenessDepth: 'critical_knowledge',
        hasRecentPromotion: true, hasKeyRelationships: true,
      },
    ),
  },

  // 5. Mass layoffs, BPO operator, 6 months tenure
  {
    label: 'Generic BPO — Customer Support, unknown tier, 0.5yr',
    inputs: makeInputs(
      makeCompany({
        name: 'Generic BPO Corp', industry: 'BPO', region: 'IN',
        employeeCount: 20_000, revenueGrowthYoY: -5, stock90DayChange: null,
        layoffRounds: 3, lastLayoffPercent: 15,
        layoffsLast24Months: [
          { date: '2024-01-01', percentCut: 8 },
          { date: '2024-07-01', percentCut: 15 },
          { date: '2025-02-01', percentCut: 10 },
        ],
        aiInvestmentSignal: 'high', revenuePerEmployee: 15_000,
        lastUpdated: '2026-01-01',
      }),
      'Customer Support Specialist', 'Operations',
      { tenureYears: 0.5, performanceTier: 'unknown' },
    ),
  },

  // 6. Profitable SaaS, product manager, functional specialist
  {
    label: 'Salesforce — Product Manager, average, 7yr, functional specialist',
    inputs: makeInputs(
      makeCompany({
        name: 'Salesforce', isPublic: true, industry: 'SaaS', region: 'US',
        employeeCount: 70_000, revenueGrowthYoY: 11, stock90DayChange: 8,
        layoffRounds: 2, lastLayoffPercent: 10,
        layoffsLast24Months: [
          { date: '2023-01-04', percentCut: 10 },
          { date: '2024-07-01', percentCut: 3 },
        ],
        aiInvestmentSignal: 'high', revenuePerEmployee: 200_000,
        lastUpdated: '2026-02-01',
      }),
      'Product Manager', 'Product',
      { tenureYears: 7, uniquenessDepth: 'functional_specialist', hasKeyRelationships: true },
      'SaaS',
    ),
  },

  // 7. Healthcare — physician, maximum protection signals
  {
    label: 'Apollo Hospitals — Doctor, top performer, 12yr, critical knowledge',
    inputs: makeInputs(
      makeCompany({
        name: 'Apollo Hospitals', industry: 'Healthcare', region: 'IN',
        employeeCount: 40_000, revenueGrowthYoY: 15, stock90DayChange: 12,
        layoffRounds: 0, lastLayoffPercent: null, layoffsLast24Months: [],
        aiInvestmentSignal: 'low', revenuePerEmployee: 60_000,
        lastUpdated: '2026-01-01',
      }),
      'Doctor', 'Healthcare',
      {
        tenureYears: 12, performanceTier: 'top', uniquenessDepth: 'critical_knowledge',
        hasRecentPromotion: false, hasKeyRelationships: true,
      },
      'Healthcare',
    ),
  },

  // 8. Declining revenue, media company, journalist
  {
    label: 'Media Corp — Journalist, average, 4yr',
    inputs: makeInputs(
      makeCompany({
        name: 'Legacy Media Corp', industry: 'Media', region: 'US',
        employeeCount: 8_000, revenueGrowthYoY: -15, stock90DayChange: -35,
        layoffRounds: 3, lastLayoffPercent: 20,
        layoffsLast24Months: [
          { date: '2023-06-01', percentCut: 12 },
          { date: '2024-03-01', percentCut: 20 },
          { date: '2025-01-01', percentCut: 8 },
        ],
        aiInvestmentSignal: 'high', revenuePerEmployee: 80_000,
        lastUpdated: '2026-01-01',
      }),
      'Journalist', 'Content',
      { tenureYears: 4, performanceTier: 'average' },
    ),
  },

  // 9. Unknown company (fallback source) — scores should be deterministic too
  {
    label: 'Unknown Company — Data Entry, unknown tier, 1yr',
    inputs: makeInputs(
      makeCompany({
        name: 'Mystery Corp Ltd', industry: 'Technology', region: 'GLOBAL',
        employeeCount: 0, revenueGrowthYoY: null, stock90DayChange: null,
        layoffRounds: 0, lastLayoffPercent: null, layoffsLast24Months: [],
        aiInvestmentSignal: 'medium', revenuePerEmployee: 150_000,
        source: 'Fallback - Unknown Company',
        lastUpdated: '2026-01-01',
      }),
      'Data Entry Specialist', 'Operations',
      { tenureYears: 1, performanceTier: 'unknown' },
    ),
  },

  // 10. Very long tenure, security engineer, below average performance
  {
    label: 'IBM — Security Engineer, below-average, 20yr tenure',
    inputs: makeInputs(
      makeCompany({
        name: 'IBM', isPublic: true, industry: 'Technology', region: 'US',
        employeeCount: 260_000, revenueGrowthYoY: 3, stock90DayChange: -2,
        layoffRounds: 2, lastLayoffPercent: 8,
        layoffsLast24Months: [
          { date: '2023-01-01', percentCut: 3 },
          { date: '2024-01-01', percentCut: 8 },
        ],
        aiInvestmentSignal: 'high', revenuePerEmployee: 120_000,
        lastUpdated: '2026-02-01',
      }),
      'Security Engineer', 'Security',
      { tenureYears: 20, performanceTier: 'below', hasKeyRelationships: true },
    ),
  },

  // 11. High AI investment, QA manual tester, recent promotion
  {
    label: 'Shopify — QA Manual Tester, average, 2yr, recent promotion',
    inputs: makeInputs(
      makeCompany({
        name: 'Shopify', isPublic: true, industry: 'E-commerce', region: 'US',
        employeeCount: 10_000, revenueGrowthYoY: 20, stock90DayChange: 15,
        layoffRounds: 1, lastLayoffPercent: 20,
        layoffsLast24Months: [{ date: '2023-05-04', percentCut: 20 }],
        aiInvestmentSignal: 'very-high', revenuePerEmployee: 250_000,
        lastUpdated: '2026-03-01',
      }),
      'QA Manual Tester', 'Engineering',
      { tenureYears: 2, performanceTier: 'average', hasRecentPromotion: true },
    ),
  },

  // 12. Legal associate, EU region, top performer
  {
    label: 'EU Law Firm — Legal Associate, top performer, 6yr',
    inputs: makeInputs(
      makeCompany({
        name: 'Berlin Legal Partners', industry: 'Legal', region: 'EU',
        employeeCount: 500, revenueGrowthYoY: 5, stock90DayChange: null,
        layoffRounds: 0, lastLayoffPercent: null, layoffsLast24Months: [],
        aiInvestmentSignal: 'low', revenuePerEmployee: 180_000,
        lastUpdated: '2026-01-01',
      }),
      'Legal Associate', 'Legal',
      {
        tenureYears: 6, performanceTier: 'top', hasRecentPromotion: true,
        hasKeyRelationships: true, uniquenessDepth: 'functional_specialist',
      },
    ),
  },

  // 13. Finance — accountant, very old layoff history (>24 months)
  {
    label: 'Old Layoffs Corp — Accountant, average, 5yr',
    inputs: makeInputs(
      makeCompany({
        name: 'Old Layoffs Corp', industry: 'Finance', region: 'US',
        employeeCount: 3_000, revenueGrowthYoY: 4, stock90DayChange: 3,
        layoffRounds: 1, lastLayoffPercent: 5,
        layoffsLast24Months: [{ date: '2021-06-01', percentCut: 5 }],
        aiInvestmentSignal: 'low', revenuePerEmployee: 150_000,
        lastUpdated: '2025-06-01',
      }),
      'Accountant', 'Finance',
      { tenureYears: 5, performanceTier: 'average' },
      'Finance',
    ),
  },

  // 14. EdTech startup, very high burn, no revenue
  {
    label: 'EdTech Startup — Content Writer, unknown tier, 1yr',
    inputs: makeInputs(
      makeCompany({
        name: 'EduCorp Startup', industry: 'EdTech', region: 'IN',
        employeeCount: 200, revenueGrowthYoY: -30, stock90DayChange: null,
        layoffRounds: 1, lastLayoffPercent: 30,
        layoffsLast24Months: [{ date: '2025-03-01', percentCut: 30 }],
        aiInvestmentSignal: 'high', revenuePerEmployee: 40_000,
        lastUpdated: '2026-01-01',
      }),
      'Content Writer', 'Marketing',
      { tenureYears: 1, performanceTier: 'unknown' },
    ),
  },

  // 15. Retail, floor associate, generic role
  {
    label: 'Retail Chain — Store Associate, average, 3yr, generic',
    inputs: makeInputs(
      makeCompany({
        name: 'MegaMart Retail', industry: 'Retail', region: 'US',
        employeeCount: 50_000, revenueGrowthYoY: 2, stock90DayChange: -8,
        layoffRounds: 1, lastLayoffPercent: 5,
        layoffsLast24Months: [{ date: '2024-11-01', percentCut: 5 }],
        aiInvestmentSignal: 'medium', revenuePerEmployee: 50_000,
        lastUpdated: '2026-01-01',
      }),
      'Retail Floor Associate', 'Sales',
      { tenureYears: 3, performanceTier: 'average', isUniqueRole: false, uniquenessDepth: 'generic' },
      'Retail',
    ),
  },

  // 16. Stable government entity — near-zero risk baseline
  {
    label: 'Public Sector — Policy Analyst, top performer, 10yr',
    inputs: makeInputs(
      makeCompany({
        name: 'National Infrastructure Agency', industry: 'Government', region: 'IN',
        employeeCount: 8_000, revenueGrowthYoY: 1, stock90DayChange: null,
        layoffRounds: 0, lastLayoffPercent: null, layoffsLast24Months: [],
        aiInvestmentSignal: 'low', revenuePerEmployee: 45_000,
        lastUpdated: '2025-12-01',
      }),
      'Policy Analyst', 'Government',
      {
        tenureYears: 10, performanceTier: 'top', hasRecentPromotion: false,
        hasKeyRelationships: true, uniquenessDepth: 'critical_knowledge',
      },
    ),
  },

  // 17. Multiple layoff rounds, very high AI, data analyst
  {
    label: 'Meta — Data Analyst, average, 4yr',
    inputs: makeInputs(
      makeCompany({
        name: 'Meta', isPublic: true, industry: 'Technology', region: 'US',
        employeeCount: 60_000, revenueGrowthYoY: 24, stock90DayChange: 40,
        layoffRounds: 3, lastLayoffPercent: 21,
        layoffsLast24Months: [
          { date: '2022-11-09', percentCut: 13 },
          { date: '2023-03-14', percentCut: 21 },
          { date: '2024-02-01', percentCut: 5 },
        ],
        aiInvestmentSignal: 'very-high', revenuePerEmployee: 400_000,
        lastUpdated: '2026-04-01',
      }),
      'Data Analyst', 'Data',
      { tenureYears: 4, performanceTier: 'average' },
    ),
  },

  // 18. Highly protected: long tenure, top performance, unique role, relationships
  {
    label: 'Oracle — Principal Architect, top, 15yr, all protections',
    inputs: makeInputs(
      makeCompany({
        name: 'Oracle', isPublic: true, industry: 'Enterprise Software', region: 'US',
        employeeCount: 130_000, revenueGrowthYoY: 9, stock90DayChange: 12,
        layoffRounds: 1, lastLayoffPercent: 4,
        layoffsLast24Months: [{ date: '2023-06-01', percentCut: 4 }],
        aiInvestmentSignal: 'medium', revenuePerEmployee: 250_000,
        lastUpdated: '2026-03-01',
      }),
      'Principal Software Architect', 'Engineering',
      {
        tenureYears: 15, performanceTier: 'top', uniquenessDepth: 'critical_knowledge',
        hasRecentPromotion: false, hasKeyRelationships: true,
      },
    ),
  },

  // 19. Completely minimal input — all defaults, no layoffs, no industry data
  {
    label: 'Minimal inputs — no industry data, no layoffs, generic role',
    inputs: {
      companyData: makeCompany({ name: 'Basic Corp' }),
      industryData: undefined,
      roleTitle: 'Administrative Assistant',
      department: 'Administration',
      referenceDate: REF,
      userFactors: {
        tenureYears: 3,
        isUniqueRole: false,
        performanceTier: 'average',
        hasRecentPromotion: false,
        hasKeyRelationships: false,
      },
    },
  },

  // 20. Worst-case: all negative signals stacked
  {
    label: 'Worst case — max distress signals, BPO, data entry, below average',
    inputs: makeInputs(
      makeCompany({
        name: 'Distress Corp', industry: 'BPO', region: 'IN',
        employeeCount: 15_000, revenueGrowthYoY: -40, stock90DayChange: null,
        layoffRounds: 4, lastLayoffPercent: 30,
        layoffsLast24Months: [
          { date: '2024-01-01', percentCut: 10 },
          { date: '2024-06-01', percentCut: 15 },
          { date: '2025-01-01', percentCut: 20 },
          { date: '2025-08-01', percentCut: 30 },
        ],
        aiInvestmentSignal: 'very-high', revenuePerEmployee: 10_000,
        lastUpdated: '2026-01-01',
      }),
      'Data Entry Specialist', 'Operations',
      { tenureYears: 0.5, performanceTier: 'below', isUniqueRole: false, uniquenessDepth: 'generic' },
    ),
  },
];

// ── Test runner ────────────────────────────────────────────────────────────────

describe('Score reproducibility — deterministic engine invariant', () => {
  const RUNS = 100;

  it.each(FIXTURES.map(f => [f.label, f.inputs] as [string, ScoreInputs]))(
    '%s',
    (label, inputs) => {
      // Run once to get the reference score
      const reference = calculateLayoffScore(inputs).score;

      // Run 99 more times and collect any deviations
      const deviations: Array<{ run: number; got: number }> = [];
      for (let i = 1; i < RUNS; i++) {
        const result = calculateLayoffScore(inputs).score;
        if (result !== reference) {
          deviations.push({ run: i + 1, got: result });
        }
      }

      if (deviations.length > 0) {
        const sample = deviations.slice(0, 5);
        throw new Error(
          `[${label}] Score is non-deterministic!\n` +
          `  Reference score (run 1): ${reference}\n` +
          `  ${deviations.length}/${RUNS} runs deviated.\n` +
          `  Sample deviations: ${sample.map(d => `run ${d.run}→${d.got}`).join(', ')}\n` +
          `  Likely cause: a new Date() / Date.now() call inside the score computation path.\n` +
          `  Fix: thread referenceDate through the affected function and use it instead.`,
        );
      }

      // All 100 runs matched — score is deterministic for this input
      expect(deviations).toHaveLength(0);
    },
  );

  it('referenceDate changes produce different scores when recency boundaries are crossed', () => {
    // This test proves that referenceDate is actually being used — if the engine
    // ignored it, both dates would produce the same score regardless.
    // We pick a company with a layoff 13 months ago relative to REF.
    // - At REF (2026-04-15): 13 months ago → score bucket: "< 18 months" = moderate
    // - At 8 months later (2027-12-15): same layoff is now 25 months ago → drops to "old" bucket

    const pastLayoffDate = '2025-03-10'; // 13 months before REF
    const company = makeCompany({
      name: 'Boundary Test Corp', industry: 'Technology', region: 'US',
      employeeCount: 10_000, revenueGrowthYoY: 5,
      layoffRounds: 1, lastLayoffPercent: 8,
      layoffsLast24Months: [{ date: pastLayoffDate, percentCut: 8 }],
      lastUpdated: '2026-01-01',
    });

    const inputsAtRef = makeInputs(company, 'Software Engineer', 'Engineering');
    const inputsLater = { ...inputsAtRef, referenceDate: new Date('2027-12-15T12:00:00.000Z') };

    const scoreAtRef   = calculateLayoffScore(inputsAtRef).score;
    const scoreLater   = calculateLayoffScore(inputsLater).score;

    // The score MUST change as the layoff crosses the 18/24-month recency boundary.
    // If they're equal, referenceDate is being ignored.
    expect(scoreLater).not.toBe(scoreAtRef);
    // The later score should be lower — the layoff is now old enough to be discounted.
    expect(scoreLater).toBeLessThan(scoreAtRef);
  });

  it('calculatedAt reflects referenceDate, not wall-clock time', () => {
    const inputs = FIXTURES[0].inputs;
    const result = calculateLayoffScore(inputs);
    // calculatedAt should be on the reference date (2026-04-15), not today
    expect(result.calculatedAt.startsWith('2026-04-15')).toBe(true);
  });
});
