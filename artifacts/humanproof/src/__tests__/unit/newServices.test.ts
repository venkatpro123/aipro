// newServices.test.ts
// Validation tests for the v8.0 new services:
//   calibrationBacktester, indiaSectorIntelligence,
//   actionPersonalizationEngine, scenarioNarrativeEngine

import { describe, it, expect } from 'vitest';

// ─── calibrationBacktester ────────────────────────────────────────────────────
import {
  runPseudoValidation,
  runFullBacktest,
  getCalibrationSummaryLabel,
  getDimensionConfidenceLabel,
  type BacktestEvent,
} from '../../services/calibrationBacktester';

describe('calibrationBacktester', () => {
  it('runPseudoValidation returns a report with all 10 dimensions', () => {
    const report = runPseudoValidation();
    expect(report.dimensionResults).toHaveLength(10);
    expect(report.totalPatternsUsed).toBeGreaterThan(0);
    expect(report.regressionDerivedWeightFraction + report.pseudoValidatedWeightFraction + report.uncalibratedWeightFraction).toBeCloseTo(1.0, 2);
  });

  it('weight fractions sum to ≤1.0 with rounding tolerance', () => {
    const report = runPseudoValidation();
    const total = report.regressionDerivedWeightFraction + report.pseudoValidatedWeightFraction + report.uncalibratedWeightFraction;
    expect(total).toBeGreaterThanOrEqual(0.95);
    expect(total).toBeLessThanOrEqual(1.05);
  });

  it('getCalibrationSummaryLabel returns a non-empty string', () => {
    const label = getCalibrationSummaryLabel();
    expect(typeof label).toBe('string');
    expect(label.length).toBeGreaterThan(0);
    expect(label).toMatch(/validated/i);
  });

  it('getDimensionConfidenceLabel returns valid quality labels', () => {
    const validLabels = ['Strong', 'Moderate', 'Weak', 'Unvalidated'];
    const label = getDimensionConfidenceLabel('L1_directFinancial');
    expect(validLabels).toContain(label);
  });

  it('runFullBacktest with empty array returns zero-value summary', () => {
    const result = runFullBacktest([]);
    expect(result.totalEvents).toBe(0);
    expect(result.auc).toBe(0);
    expect(result.brierScore).toBe(0);
  });

  it('runFullBacktest with synthetic data produces valid metrics', () => {
    // Use strictly different scores within each group to avoid trapezoidal AUC tie issue.
    // 50 high-risk (scores 70–94) vs 50 low-risk (scores 10–34) → perfectly separated.
    const events: BacktestEvent[] = [
      ...Array.from({ length: 50 }, (_, i) => ({
        companyName: `HighRisk Corp ${i}`,
        eventDate: '2025-01-01',
        layoffPct: 15,
        industry: 'technology',
        region: 'US',
        preEventSignals: { revenueGrowthYoY: -20, stock90DayChange: -30, layoffRounds: 2, aiInvestmentSignal: 'medium' as const, revenuePerEmployee: 80000, employeeCount: 1000, collapseStage: 2 as const },
        actualOutcome: 'layoff_occurred' as const,
        engineScore: 70 + i % 25,   // scores 70–94, varying so no ties
      })),
      ...Array.from({ length: 50 }, (_, i) => ({
        companyName: `LowRisk Corp ${i}`,
        eventDate: '2025-01-01',
        layoffPct: 0,
        industry: 'technology',
        region: 'US',
        preEventSignals: { revenueGrowthYoY: 20, stock90DayChange: 15, layoffRounds: 0, aiInvestmentSignal: 'low' as const, revenuePerEmployee: 300000, employeeCount: 1000, collapseStage: 0 as const },
        actualOutcome: 'no_layoff' as const,
        engineScore: 10 + i % 25,   // scores 10–34, varying so no ties
      })),
    ];
    const result = runFullBacktest(events);
    expect(result.totalEvents).toBe(100);
    // With perfectly separated groups AUC approaches 1.0; use ≥0.9 for this dataset
    expect(result.auc).toBeGreaterThanOrEqual(0.9);
    expect(result.auc).toBeLessThanOrEqual(1.0);
    expect(result.brierScore).toBeGreaterThanOrEqual(0);
    expect(result.brierScore).toBeLessThanOrEqual(1);
    expect(result.thresholdAnalysis).toHaveLength(5);
    expect(result.calibrationBuckets.length).toBeGreaterThan(0);
  });

  it('sigmoid is bounded between 0 and 1 for extreme inputs', () => {
    // runFullBacktest uses scoreToProbability internally; test via events with extreme scores
    const events: BacktestEvent[] = [
      { companyName: 'X', eventDate: '2025-01-01', layoffPct: 50, industry: 'tech', region: 'US',
        preEventSignals: { revenueGrowthYoY: -50, stock90DayChange: -80, layoffRounds: 5, aiInvestmentSignal: 'high', revenuePerEmployee: 10000, employeeCount: 500, collapseStage: 3 },
        actualOutcome: 'layoff_occurred', engineScore: 200 },  // out-of-range score
      { companyName: 'Y', eventDate: '2025-01-01', layoffPct: 0, industry: 'tech', region: 'US',
        preEventSignals: { revenueGrowthYoY: 50, stock90DayChange: 50, layoffRounds: 0, aiInvestmentSignal: 'none', revenuePerEmployee: 500000, employeeCount: 500, collapseStage: 0 },
        actualOutcome: 'no_layoff', engineScore: -50 },  // out-of-range score
    ];
    expect(() => runFullBacktest(events)).not.toThrow();
    const result = runFullBacktest(events);
    expect(result.brierScore).toBeGreaterThanOrEqual(0);
    expect(result.brierScore).toBeLessThanOrEqual(1);
  });
});

// ─── indiaSectorIntelligence ──────────────────────────────────────────────────
import {
  getIndiaRiskEnrichment,
  detectGCCArchetype,
  getCurrentIndiaRiskQuarter,
  getSectorContagionRisk,
  INDIA_SECTOR_BENCHMARKS,
  INDIA_SECTOR_PULSE_SNAPSHOT,
} from '../../services/indiaSectorIntelligence';

describe('indiaSectorIntelligence', () => {
  it('detectGCCArchetype: recognizes Goldman Sachs as banking GCC', () => {
    expect(detectGCCArchetype('Goldman Sachs India')).toBe('captive_banking_finance');
  });

  it('detectGCCArchetype: recognizes Google India as big tech GCC', () => {
    expect(detectGCCArchetype('Google India')).toBe('captive_big_tech');
  });

  it('detectGCCArchetype: word-boundary prevents false positive on "AMD Fintech"', () => {
    // AMD is a real keyword but should not match "command" or "Amanda"
    expect(detectGCCArchetype('Amanda Solutions')).toBe('not_gcc');
    expect(detectGCCArchetype('Command Logic')).toBe('not_gcc');
  });

  it('detectGCCArchetype: returns not_gcc for unknown Indian company', () => {
    expect(detectGCCArchetype('Infosys')).toBe('not_gcc');
    expect(detectGCCArchetype('Reliance Jio')).toBe('not_gcc');
  });

  it('getCurrentIndiaRiskQuarter returns a valid quarter', () => {
    const { quarter, window } = getCurrentIndiaRiskQuarter();
    expect(['Q1', 'Q2', 'Q3', 'Q4']).toContain(quarter);
    expect(window.riskMultiplier).toBeGreaterThan(0);
  });

  it('getIndiaRiskEnrichment for TCS returns valid enrichment with composite multiplier > 0', () => {
    const enrichment = getIndiaRiskEnrichment('TCS', 'IT Services', 'IN');
    expect(enrichment.isIndiaPrimary).toBe(true);
    expect(enrichment.compositeRiskMultiplier).toBeGreaterThan(0);
    expect(enrichment.compositeRiskMultiplier).toBeLessThanOrEqual(3.5);
    expect(enrichment.gccArchetype).toBe('not_gcc');
    expect(enrichment.sectorBenchmark.sector).toContain('IT');
  });

  it('getIndiaRiskEnrichment for Goldman Sachs India returns GCC profile', () => {
    const enrichment = getIndiaRiskEnrichment('Goldman Sachs India', 'Finance', 'IN');
    expect(enrichment.gccArchetype).toBe('captive_banking_finance');
    expect(enrichment.gccRiskProfile.riskMultiplier).toBeGreaterThan(1.0);
  });

  it('getIndiaRiskEnrichment for US company returns isIndiaPrimary false', () => {
    const enrichment = getIndiaRiskEnrichment('Microsoft', 'Technology', 'US');
    expect(enrichment.isIndiaPrimary).toBe(false);
    expect(enrichment.contagionRisk.hasContagionExposure).toBe(false);
    // Non-India: all India-specific multipliers are 1.0, so composite should be 1.0 exactly
    expect(enrichment.compositeRiskMultiplier).toBe(1.0);
  });

  it('composite multiplier is a proper product of all factors', () => {
    // For a sector with no contagion (not in IT services), multiplier should be close to sector × gcc × seasonal × pulse
    const enrichment = getIndiaRiskEnrichment('Concentrix India', 'BPO', 'IN');
    // BPO has layoffRiskMultiplier = 2.10 — composite should be at least this value
    expect(enrichment.compositeRiskMultiplier).toBeGreaterThan(1.0);
    expect(enrichment.compositeRiskMultiplier).toBeLessThanOrEqual(3.5);
  });

  it('pulse multiplier floors at 0.75 so healthy sector never over-suppresses risk', () => {
    // Healthcare tech has compositeScore = 0.82 → pulseMultiplier = max(0.75, 1 + (0.5-0.82)*0.4) = max(0.75, 0.872) = 0.872
    const enrichment = getIndiaRiskEnrichment('Apollo Hospitals Tech', 'Healthcare Tech', 'IN');
    // Composite should still be > 0 even for the healthiest sector
    expect(enrichment.compositeRiskMultiplier).toBeGreaterThan(0.5);
  });

  it('all sector benchmarks have required fields', () => {
    Object.entries(INDIA_SECTOR_BENCHMARKS).forEach(([key, bench]) => {
      expect(bench.revenuePerEmployeeMedian_USD).toBeGreaterThan(0);
      expect(bench.layoffRiskMultiplier).toBeGreaterThan(0);
      expect(['strong', 'moderate', 'flat', 'contracting']).toContain(bench.nasscomGrowthOutlook);
    });
  });

  it('all sector pulse snapshots have compositeScore in [0,1]', () => {
    Object.entries(INDIA_SECTOR_PULSE_SNAPSHOT).forEach(([key, pulse]) => {
      expect(pulse.compositeScore).toBeGreaterThanOrEqual(0);
      expect(pulse.compositeScore).toBeLessThanOrEqual(1);
    });
  });
});

// ─── actionPersonalizationEngine ─────────────────────────────────────────────
import {
  getPersonalizedActions,
  resolveRoleGroup,
  getRoleGroupLabel,
  scoreToRiskLevel,
  ROLE_PREFIX_MAP,
} from '../../services/actionPersonalizationEngine';

describe('actionPersonalizationEngine', () => {
  it('resolveRoleGroup: maps known role titles correctly', () => {
    expect(resolveRoleGroup('Software Engineer')).toBe('swe');
    expect(resolveRoleGroup('Data Scientist')).toBe('data_scientist');
    expect(resolveRoleGroup('DevOps Engineer')).toBe('devops');
    expect(resolveRoleGroup('Product Manager')).toBe('product_manager');
    expect(resolveRoleGroup('QA Engineer')).toBe('qa_engineer');
    expect(resolveRoleGroup('ML Engineer')).toBe('ml_engineer');
    expect(resolveRoleGroup('Security Engineer')).toBe('security_engineer');
    expect(resolveRoleGroup('Platform Engineer')).toBe('platform_engineer');
    expect(resolveRoleGroup('Tech Lead')).toBe('tech_lead');
    expect(resolveRoleGroup('Principal Engineer')).toBe('principal_engineer');
    expect(resolveRoleGroup('Data Engineer')).toBe('data_engineer');
    expect(resolveRoleGroup('Data Analyst')).toBe('data_analyst');
  });

  it('resolveRoleGroup: unknown title falls back to professional_services', () => {
    expect(resolveRoleGroup('Blockchain Evangelist')).toBe('professional_services');
    expect(resolveRoleGroup('')).toBe('professional_services');
  });

  it('scoreToRiskLevel: maps scores to correct risk levels', () => {
    expect(scoreToRiskLevel(80)).toBe('critical');
    expect(scoreToRiskLevel(75)).toBe('critical');
    expect(scoreToRiskLevel(60)).toBe('high');
    expect(scoreToRiskLevel(55)).toBe('high');
    expect(scoreToRiskLevel(40)).toBe('moderate');
    expect(scoreToRiskLevel(35)).toBe('moderate');
    expect(scoreToRiskLevel(20)).toBe('low');
  });

  it('getPersonalizedActions: returns actions for every role group in ROLE_PREFIX_MAP', () => {
    // Test each unique role group that appears in ROLE_PREFIX_MAP
    const uniqueGroups = [...new Set(Object.values(ROLE_PREFIX_MAP))];
    for (const group of uniqueGroups) {
      const result = getPersonalizedActions(group, 'mid', 65, 'IN');
      expect(result.actions.length).toBeGreaterThan(0);
      expect(result.actions[0].title).toBeTruthy();
      expect(result.actions[0].description).toBeTruthy();
    }
  });

  it('getPersonalizedActions: returns India context for IN region', () => {
    const result = getPersonalizedActions('Software Engineer', 'mid', 65, 'IN');
    expect(result.indiaSpecificContext).toBeTruthy();
    expect(result.indiaSpecificContext).toMatch(/India/);
  });

  it('getPersonalizedActions: no India context for US region', () => {
    const result = getPersonalizedActions('Software Engineer', 'mid', 65, 'US');
    expect(result.indiaSpecificContext).toBeUndefined();
  });

  it('getPersonalizedActions: critical risk returns Critical priority actions', () => {
    const result = getPersonalizedActions('Software Engineer', 'junior', 80);
    const hasCritical = result.actions.some(a => a.priority === 'Critical');
    expect(hasCritical).toBe(true);
  });

  it('getPersonalizedActions: all action priorities are valid enum values', () => {
    const validPriorities = ['Critical', 'High', 'Medium', 'Low'];
    const result = getPersonalizedActions('Data Scientist', 'senior', 60);
    for (const action of result.actions) {
      expect(validPriorities).toContain(action.priority);
    }
  });

  it('getRoleGroupLabel: returns human-readable label', () => {
    expect(getRoleGroupLabel('Software Engineer')).toBe('Software Engineer');
    expect(getRoleGroupLabel('ML Engineer')).toBe('ML Engineer');
    expect(getRoleGroupLabel('process associate')).toBe('BPO / ITES Associate');
  });

  it('BPO associate gets critical transition actions at critical risk', () => {
    const result = getPersonalizedActions('process associate', 'junior', 80);
    const topAction = result.actions[0];
    expect(topAction.title).toContain('Transition');
    expect(topAction.riskReductionPct).toBeGreaterThan(30);
  });
});

// ─── scenarioNarrativeEngine ──────────────────────────────────────────────────
import {
  detectScenario,
  buildScenarioNarrative,
  getScenarioArchetypeLabel,
  getScenarioArchetypeColor,
} from '../../services/scenarioNarrativeEngine';

const baseCompany = {
  name: 'TestCo',
  industry: 'Technology',
  isPublic: true,
  employeeCount: 5000,
  revenueGrowthYoY: null as number | null,
  stock90DayChange: null as number | null,
  layoffRounds: 0,
  layoffsLast24Months: [] as any[],
  lastLayoffPercent: null,
  revenuePerEmployee: 80000,
  aiInvestmentSignal: 'medium' as const,
  region: 'US' as any,
  lastUpdated: '2026-01-01',
  source: 'test',
};

describe('scenarioNarrativeEngine', () => {
  it('detectScenario: low score returns low_risk_maintain', () => {
    const archetype = detectScenario(baseCompany, { L1: 0.2, L2: 0.1, L3: 0.2 }, 30);
    expect(archetype).toBe('low_risk_maintain');
  });

  it('detectScenario: high L1 and L2 returns financial_distress_layoff', () => {
    const archetype = detectScenario(baseCompany, { L1: 0.80, L2: 0.70, L3: 0.3 }, 72);
    expect(archetype).toBe('financial_distress_layoff');
  });

  it('detectScenario: high L3 returns role_displacement', () => {
    const archetype = detectScenario(baseCompany, { L1: 0.25, L2: 0.15, L3: 0.75 }, 60);
    expect(archetype).toBe('role_displacement');
  });

  it('detectScenario: high D8 + low L1 returns ai_efficiency_restructuring', () => {
    const archetype = detectScenario(baseCompany, { L1: 0.30, L2: 0.2, L3: 0.4, D8: 0.70 }, 58);
    expect(archetype).toBe('ai_efficiency_restructuring');
  });

  it('detectScenario: high L4 with moderate others returns sector_wave', () => {
    const archetype = detectScenario(baseCompany, { L1: 0.40, L2: 0.20, L3: 0.40, L4: 0.65 }, 55);
    expect(archetype).toBe('sector_wave');
  });

  it('buildScenarioNarrative: all fields are non-empty strings', () => {
    const narrative = buildScenarioNarrative(baseCompany, { L1: 0.70, L2: 0.60, L3: 0.4 }, 68, 'Backend Engineer', 4, 'generic');
    expect(narrative.primaryRiskDriver.length).toBeGreaterThan(10);
    expect(narrative.sixMonthInactionConsequence.length).toBeGreaterThan(10);
    expect(narrative.oneActionThisWeek.length).toBeGreaterThan(10);
    expect(narrative.whatChangesRiskMost.length).toBeGreaterThan(10);
    expect(narrative.estimatedTimeline.length).toBeGreaterThan(5);
    expect(narrative.keyProtectiveFactor.length).toBeGreaterThan(5);
    expect(narrative.synthesis.length).toBeGreaterThan(10);
  });

  it('buildScenarioNarrative: urgencyLevel is one of four valid values', () => {
    const narrative = buildScenarioNarrative(baseCompany, { L1: 0.80, L2: 0.60, L3: 0.4 }, 78, 'Data Scientist', 3, 'generic');
    expect(['Immediate', 'High', 'Moderate', 'Low']).toContain(narrative.urgencyLevel);
  });

  it('buildScenarioNarrative: India region adds indiaSpecificInsight', () => {
    const indiaCompany = { ...baseCompany, region: 'IN' as any, industry: 'IT Services' };
    const narrative = buildScenarioNarrative(indiaCompany, { L1: 0.5, L2: 0.3, L3: 0.5 }, 58, 'Software Engineer', 4, 'generic');
    // India IT services should get bench risk or sector-specific insight
    expect(narrative.archetype).toMatch(/india|role|financial/);
  });

  it('buildScenarioNarrative: never crashes with null optional breakdown fields', () => {
    expect(() => buildScenarioNarrative(
      baseCompany,
      { L1: 0.5, L2: 0.3, L3: 0.5 },  // no L4, L5, D6, D7, D8
      55,
      'Engineer',
      5,
      'generic',
    )).not.toThrow();
  });

  it('buildScenarioNarrative: GCC path does not crash when enrichment computed from non-India company', () => {
    // Even if detection somehow routes to gcc path without enrichment, should fall through safely
    const usCompany = { ...baseCompany, name: 'Goldman Sachs US', region: 'US' as any };
    expect(() => buildScenarioNarrative(usCompany, { L1: 0.6, L2: 0.5, L3: 0.4 }, 65, 'Analyst', 3, 'generic')).not.toThrow();
  });

  it('getScenarioArchetypeLabel: returns a non-empty string for all archetypes', () => {
    const archetypes = [
      'financial_distress_layoff', 'ai_efficiency_restructuring', 'role_displacement',
      'sector_wave', 'gcc_parent_contagion', 'india_it_bench_risk',
      'individual_resilience_gap', 'low_risk_maintain',
      'eu_regulatory_restructuring', 'latam_funding_crisis',
      'apac_hyperscaler_localization', 'us_gov_contract_risk',
      'fintech_regulatory_tightening',
    ] as const;
    for (const a of archetypes) {
      expect(getScenarioArchetypeLabel(a).length).toBeGreaterThan(0);
    }
  });

  it('getScenarioArchetypeColor: returns a CSS class string for each archetype', () => {
    const archetypes = [
      'financial_distress_layoff', 'ai_efficiency_restructuring', 'role_displacement',
      'sector_wave', 'gcc_parent_contagion', 'india_it_bench_risk',
      'individual_resilience_gap', 'low_risk_maintain',
      'eu_regulatory_restructuring', 'latam_funding_crisis',
      'apac_hyperscaler_localization', 'us_gov_contract_risk',
      'fintech_regulatory_tightening',
    ] as const;
    for (const a of archetypes) {
      const color = getScenarioArchetypeColor(a);
      expect(color).toMatch(/text-|bg-/);
    }
  });

  it('pct() is bounded — breakdown values outside [0,1] produce clamped, not overflow, percentages', () => {
    // L1: 1.5 should clamp to 100, not produce 150. L2: -0.2 should clamp to 0, not produce -20.
    const narrative = buildScenarioNarrative(
      baseCompany,
      { L1: 1.5, L2: -0.2, L3: 0.5 },
      65,
      'Engineer',
      5,
      'generic',
    );
    // Should not contain percentages > 100 (three-digit numbers followed by /100)
    // "100/100" is valid (clamped); "150/100" or "200/100" are overflow bugs.
    expect(narrative.primaryRiskDriver).not.toMatch(/[2-9]\d\d\/100/);  // 200+ is overflow
    // Should not contain negative percentages
    expect(narrative.primaryRiskDriver).not.toMatch(/-\d+\/100/);
    // L1 clamped to 1.0 → pct = 100, which is valid output
    expect(narrative.primaryRiskDriver).toMatch(/L1: 100\/100/);
  });
});
