import { describe, expect, it } from 'vitest';
import { mapToHybridResult } from '../../utils/hybridResultMapper';

const companyData = {
  name: 'Signal Corp',
  industry: 'Technology',
  region: 'US',
  employeeCount: 5000,
  isPublic: true,
  revenuePerEmployee: 300000,
  aiInvestmentSignal: 'high',
  source: 'Live OSINT Database',
  lastUpdated: '2026-05-01T00:00:00.000Z',
};

const baseResult = {
  score: 64,
  ensembleScore: 67,
  confidence: 'Medium',
  confidencePercent: 58,
  confidenceInterval: { low: 49, high: 75, range: 26, isEstimate: true },
  tier: { label: 'Elevated risk', color: 'orange', advice: 'Act now.' },
  breakdown: { L1: 0.62, L2: 0.44, L3: 0.71, L4: 0.36, L5: 0.29, D6: 0.54, D7: 0.48 },
  calculatedAt: '2026-05-01T00:00:00.000Z',
  nextUpdateDue: '2026-05-08T00:00:00.000Z',
  disclaimer: 'test',
  dataFreshness: {
    lastUpdated: '2026-05-01T00:00:00.000Z',
    ageInDays: 2,
    stalenessWarning: null,
    accuracyImpact: 'Low',
  },
  signalQuality: {
    hasConflicts: false,
    conflictingSignals: [],
    missingDataFallbacks: [],
    liveSignals: 4,
    heuristicSignals: 2,
  },
  recommendations: [
    {
      id: 'r1',
      title: 'Take action',
      description: 'Update your profile this week.',
      priority: 'High',
      layerFocus: 'L3',
      riskReductionPct: 15,
      deadline: '7 days',
    },
  ],
  probabilityForecast: {
    next90Days: 0.22,
    next180Days: 0.31,
    baseSectorRate: 0.14,
    multipliers: [],
    verdict: 'Elevated',
  },
  timing: {
    daysSinceLastCut: 120,
    totalRoundsTracked: 2,
    windowStatus: 'approaching-window',
    daysUntilWindow: 45,
    verdict: 'Approaching',
  },
  performanceTier: 'average',
  primaryRiskDriver: 'Role displacement is outrunning company stability.',
  sixMonthInactionConsequence: 'Without an AI-oversight proof point, this profile will lose leverage over the next two review cycles.',
  oneActionThisWeek: 'Build and publish one AI-assisted workflow artifact within 7 days.',
  whatChangesRiskMost: '1. Shift to AI oversight. 2. Build public proof. 3. Target lower-risk firms.',
  estimatedTimeline: '12-24 months with pressure from role-level AI maturity.',
  keyProtectiveFactor: 'Current tenure and delivery track record still provide some insulation.',
  scenarioArchetype: 'role_displacement',
  scenarioArchetypeLabel: 'Role Displacement',
  indiaSpecificInsight: undefined,
  confidenceNote: 'Live data is present but some dimensions remain uncalibrated.',
};

describe('hybridResultMapper', () => {
  it('preserves narrative intelligence fields from ensemble results', () => {
    const hybrid = mapToHybridResult(
      baseResult as any,
      companyData as any,
      {
        roleTitle: 'Backend Engineer',
        department: 'Engineering',
        tenureYears: 4,
        oracleKey: 'sw_backend',
        experience: '2-5',
      },
      'live',
      4,
      2,
    );

    expect(hybrid.primaryRiskDriver).toContain('Role displacement');
    expect(hybrid.sixMonthInactionConsequence).toContain('next two review cycles');
    expect(hybrid.oneActionThisWeek).toContain('7 days');
    expect(hybrid.whatChangesRiskMost).toContain('1.');
    expect(hybrid.estimatedTimeline).toContain('12-24 months');
    expect(hybrid.keyProtectiveFactor).toContain('tenure');
    expect(hybrid.scenarioArchetype).toBe('role_displacement');
    expect(hybrid.scenarioArchetypeLabel).toBe('Role Displacement');
    expect(hybrid.confidenceNote).toContain('uncalibrated');
  });

  it('passes through authoritative hybrid results unchanged', () => {
    const authoritative = {
      total: 61,
      breakdown: { L1: 0.5, L2: 0.4, L3: 0.7, L4: 0.3, L5: 0.2 },
      tier: { label: 'Elevated risk', color: 'orange', advice: 'Act now.' },
      confidence: 'Medium',
      confidencePercent: 63,
      confidenceInterval: { low: 52, high: 70, range: 18, isEstimate: true },
      dimensions: [],
      reasoning: 'test',
      dataFreshness: baseResult.dataFreshness,
      signalQuality: {
        hasConflicts: false,
        conflictingSignals: [],
        liveSignals: 3,
        heuristicSignals: 2,
      },
      recommendations: [],
      workTypeKey: 'sw_software_engineer',
      industryKey: 'technology',
      countryKey: 'us',
      experience: '2-5',
      companyName: 'Oracle',
      meta: {
        usedLiveSignals: true,
        liveSignalCount: 3,
        swarmAgentCount: 30,
        dbSource: 'HumanProof Intelligence DB',
        calculationMode: 'CONSENSUS_HYBRID_LIVE',
        timestamp: '2026-05-01T00:00:00.000Z',
        resolvedRoleKey: 'sw_software_engineer',
        resolvedRoleSource: 'alias_map' as const,
        companyMatchConfidence: 0.9,
        companyMatchType: 'prefix' as const,
        usedAuditPipeline: true,
      },
      evaluationSnapshot: {
        companyInput: 'Oracle Corporation',
        companyResolved: 'Oracle',
        companyMatchConfidence: 0.9,
        companyMatchType: 'prefix',
        roleInput: 'Software Developer',
        resolvedRoleKey: 'sw_software_engineer',
        resolvedRoleSource: 'alias_map',
        usedAuditPipeline: true,
        liveSignals: 3,
        heuristicSignals: 2,
        degradedSignalClasses: [],
        hardFailures: [],
        confidencePercent: 63,
        tabsUsedFallback: [],
      },
    };

    const mapped = mapToHybridResult(
      authoritative as any,
      companyData as any,
      {
        roleTitle: 'Software Developer',
        department: 'Engineering',
        tenureYears: 4,
        oracleKey: 'sw_software_engineer',
        experience: '2-5',
      },
    );

    expect(mapped).toBe(authoritative);
    expect(mapped.meta?.usedAuditPipeline).toBe(true);
    expect(mapped.evaluationSnapshot?.resolvedRoleKey).toBe('sw_software_engineer');
  });
});
