import type { CompanyData } from '../data/companyDatabase';
import { getPPPMultiplier } from '../data/companyDatabase';
import type { IndustryRisk } from '../data/industryRiskData';
import { getCompanyRoleRisk } from '../data/companyIntelligenceBridge';
import { inferRoleRisk } from '../data/roleExposureData';
import type {
  ProvenancedSignal,
  ReconciledCompanySignals,
  ReconciliationSummary,
  SignalConflict,
  SignalSourceKind,
} from './liveDataService';
import type { UserFactors } from './layoffScoreEngine';

type PrimarySource = 'live' | 'db' | 'hybrid';

interface ResolvedSignal {
  value: number;
  confidence: number;
  confidenceInterval: { low: number; high: number };
  sourcesUsed: string[];
  stalenessDays: number;
  hasConflict: boolean;
  conflicts: SignalConflict[];
  primarySource: PrimarySource;
  dominantWeight: number;
}

interface ConsensusSignalSet {
  revenueGrowth: ResolvedSignal;
  stockTrend: ResolvedSignal;
  fundingHealth: ResolvedSignal;
  overstaffing: ResolvedSignal;
  companySize: ResolvedSignal;
  recentLayoffRecency: ResolvedSignal;
  layoffFrequency: ResolvedSignal;
  layoffSeverity: ResolvedSignal;
  sectorContagion: ResolvedSignal;
  departmentNews: ResolvedSignal;
  automationRisk: ResolvedSignal;
  aiToolMaturity: ResolvedSignal;
  humanAmplification: ResolvedSignal;
  industryBaseline: ResolvedSignal;
  aiAdoptionRate: ResolvedSignal;
  growthOutlook: ResolvedSignal;
  averageTenure: ResolvedSignal;
  overallConfidence: number;
  conflictLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
  allConflicts: SignalConflict[];
  /** Set when 3+ critical input signals (stock, revenue, employee count, layoff history, hiring trend) are null or at their heuristic default. */
  lowDataWarning?: { code: 'LOW_DATA'; missingCount: number; capAt: number };
  freshnessReport: {
    oldestSignalAge: number;
    avgSignalAge: number;
    percentLive: number;
    percentHeuristic: number;
    totalSignalCount: number;
    liveSignalCount: number;
    heuristicSignalCount: number;
  };
}

export interface HybridScorePayload {
  companyName: string;
  roleTitle: string;
  department: string;
  userFactors: UserFactors;
  consensusData: ConsensusSignalSet;
  provenance: Record<string, ProvenancedSignal<unknown>>;
  reconciliationSummary: ReconciliationSummary;
  missingDataFallbacks: string[];
  degradedSignalClasses: string[];
  hardFailures: string[];
  confidenceCap?: number;
  confidenceCapsApplied?: string[];
  _dataFreshnessScore?: number;
}

const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));

const mapRevenueGrowth = (yoyPercent: number | null): number => {
  if (yoyPercent === null) return 0.5;
  if (yoyPercent < -20) return 0.95;
  if (yoyPercent < -10) return 0.85;
  if (yoyPercent < 0) return 0.72;
  if (yoyPercent < 5) return 0.55;
  if (yoyPercent < 10) return 0.42;
  if (yoyPercent < 20) return 0.3;
  if (yoyPercent < 30) return 0.18;
  return 0.1;
};

const mapStockTrend = (change90Day: number | null): number => {
  if (change90Day === null) return 0.5;
  if (change90Day < -30) return 0.95;
  if (change90Day < -15) return 0.8;
  if (change90Day < -5) return 0.6;
  if (change90Day < 5) return 0.42;
  if (change90Day < 15) return 0.28;
  if (change90Day < 30) return 0.15;
  return 0.08;
};

const mapFundingStatus = (
  lastRound: string | undefined,
  monthsSince: number | undefined,
): number => {
  if (lastRound === 'bootstrapped') return 0.35;
  if (monthsSince === undefined) return 0.5;
  if (monthsSince < 6) return 0.12;
  if (monthsSince < 12) return 0.28;
  if (monthsSince < 18) return 0.5;
  if (monthsSince < 24) return 0.72;
  return 0.88;
};

const mapCompanySize = (count: number): number => {
  if (count <= 50) return 0.7;
  if (count <= 200) return 0.58;
  if (count <= 1000) return 0.48;
  if (count <= 5000) return 0.4;
  if (count <= 50000) return 0.35;
  return 0.32;
};

const INDIA_SECTOR_RPE_MEDIANS: Record<string, number> = {
  Technology: 40_000,
  'IT Services': 35_000,
  'Information Technology': 40_000,
  Software: 40_000,
  Finance: 60_000,
  'Financial Services': 60_000,
  Banking: 55_000,
  Healthcare: 30_000,
  'E-commerce': 85_000,
  Ecommerce: 85_000,
  BPO: 22_000,
  ITES: 28_000,
  FinTech: 65_000,
  Media: 25_000,
  'Media & Publishing': 25_000,
  _default: 38_000,
};

// India-region check: accept both the canonical 'IN' code and the
// raw strings that may come through before normalizeRegion runs.
const isIndiaRegion = (region: string): boolean =>
  region === 'IN' || region.toLowerCase() === 'india' || region.toLowerCase() === 'ind';

const mapOverstaffing = (
  revenuePerEmp: number,
  region: string = 'US',
  industry?: string,
): number => {
  if (isIndiaRegion(region)) {
    const median =
      INDIA_SECTOR_RPE_MEDIANS[industry ?? '_default'] ??
      INDIA_SECTOR_RPE_MEDIANS._default;
    const deviation = (revenuePerEmp - median) / median;

    if (deviation < -0.4) return 0.82;
    if (deviation < -0.2) return 0.62;
    if (deviation < -0.05) return 0.45;
    if (deviation < 0.15) return 0.32;
    if (deviation < 0.45) return 0.2;
    return 0.1;
  }

  const adjusted = revenuePerEmp / getPPPMultiplier(region as any);
  if (adjusted < 95_000) return 0.85;
  if (adjusted < 180_000) return 0.65;
  if (adjusted < 350_000) return 0.45;
  if (adjusted < 700_000) return 0.25;
  return 0.1;
};

const monthsDifference = (dateStr: string, now: Date): number => {
  const date = new Date(dateStr);
  return Math.abs(
    (now.getFullYear() - date.getFullYear()) * 12 +
      (now.getMonth() - date.getMonth()),
  );
};

const calculateRecentLayoffRisk = (
  layoffs: Array<{ date: string; percentCut: number }>,
  now: Date,
): number => {
  if (!layoffs || layoffs.length === 0) return 0.95;
  const sorted = [...layoffs].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  const monthsAgo = monthsDifference(sorted[0].date, now);
  if (monthsAgo < 3) return 0.05;
  if (monthsAgo < 6) return 0.18;
  if (monthsAgo < 12) return 0.38;
  if (monthsAgo < 18) return 0.58;
  if (monthsAgo < 24) return 0.72;
  return 0.85;
};

const calculateRoundFrequency = (
  rounds: number,
  layoffs: Array<{ date: string; percentCut: number }> | undefined,
  now: Date,
): number => {
  // v21.0 WARN cross-validation: when WARN/SEC/news events populate the
  // layoffs array but the static DB row says rounds = 0, trust the regulatory
  // evidence over the DB. Previously this returned 0.05 (essentially "no
  // layoffs"), letting the DB silently override a confirmed WARN filing.
  const effectiveRounds = Math.max(rounds | 0, layoffs?.length ?? 0);
  if (effectiveRounds === 0) return 0.05;

  let base = 0.05;
  if (effectiveRounds === 1) base = 0.42;
  else if (effectiveRounds === 2) base = 0.68;
  else if (effectiveRounds === 3) base = 0.85;
  else base = 0.95;

  if (layoffs && layoffs.length > 0) {
    const avgMonthsAgo =
      layoffs.reduce((sum, layoff) => sum + monthsDifference(layoff.date, now), 0) /
      layoffs.length;
    if (avgMonthsAgo > 24) return base * 0.65;
    if (avgMonthsAgo > 18) return base * 0.8;
    if (avgMonthsAgo > 12) return base * 0.9;
  }
  return base;
};

const calculateSectorContagion = (industryData?: IndustryRisk): number => {
  if (!industryData) return 0.4;
  const baseSignal = industryData.baselineRisk;
  const rateSignal = clamp(industryData.avgLayoffRate2025 * 5, 0, 1);
  return baseSignal * 0.6 + rateSignal * 0.4;
};

const mapGrowthOutlook = (outlook?: IndustryRisk['growthOutlook']): number => {
  switch (outlook) {
    case 'growing':
      return 0.08;
    case 'stable':
      return 0.35;
    case 'volatile':
      return 0.68;
    case 'declining':
      return 0.9;
    default:
      return 0.5;
  }
};

const aiInvestmentWeight = (signal?: CompanyData['aiInvestmentSignal']): number => {
  switch (signal) {
    case 'low':
      return 0.25;
    case 'medium':
      return 0.5;
    case 'high':
      return 0.72;
    case 'very-high':
      return 0.88;
    default:
      return 0.5;
  }
};

const buildInterval = (value: number, confidence: number, isHeuristic: boolean) => {
  const spread = isHeuristic ? 0.28 : confidence >= 0.85 ? 0.08 : confidence >= 0.65 ? 0.14 : 0.22;
  return {
    low: clamp(value - spread / 2),
    high: clamp(value + spread / 2),
  };
};

const buildResolvedSignal = (
  signalKey: string,
  signal: ProvenancedSignal<any>,
  mappedValue: number,
  allConflicts: SignalConflict[],
): ResolvedSignal => {
  const conflicts = allConflicts.filter((entry) => entry.signalType === signalKey);
  const primarySource: PrimarySource =
    signal.source === 'live' ? 'live' : signal.source === 'db' ? 'db' : 'hybrid';
  return {
    value: clamp(mappedValue),
    confidence: clamp(signal.confidence),
    confidenceInterval: buildInterval(mappedValue, signal.confidence, signal.source === 'heuristic'),
    sourcesUsed: [signal.sourceName],
    stalenessDays: signal.freshnessDays,
    hasConflict: conflicts.length > 0 || (signal.conflictWith?.length ?? 0) > 0,
    conflicts,
    primarySource,
    dominantWeight: clamp(signal.confidence),
  };
};

const heuristicSignal = (
  key: string,
  value: unknown,
  sourceName: string,
  observedAt: string,
): ProvenancedSignal<unknown> => ({
  key,
  value,
  source: 'heuristic',
  sourceName,
  observedAt,
  fetchedAt: observedAt,
  freshnessDays: 0,
  freshnessState: 'fresh',
  confidence: 0.35,
});

const computeConflictLevel = (
  conflicts: SignalConflict[],
): ConsensusSignalSet['conflictLevel'] => {
  if (conflicts.length === 0) return 'none';
  if (conflicts.some((entry) => entry.severity === 'critical')) return 'critical';
  if (conflicts.some((entry) => entry.severity === 'high')) return 'high';
  if (conflicts.some((entry) => entry.severity === 'medium')) return 'medium';
  return 'low';
};

export function buildHybridScorePayload({
  reconciled,
  companyData,
  industryData,
  roleTitle,
  department,
  userFactors,
}: {
  reconciled: ReconciledCompanySignals;
  companyData: CompanyData;
  industryData?: IndustryRisk;
  roleTitle: string;
  department: string;
  userFactors: UserFactors;
}): HybridScorePayload {
  const now = new Date();
  const observedAt = companyData.lastUpdated
    ? new Date(companyData.lastUpdated).toISOString()
    : now.toISOString();
  const provenance: Record<string, ProvenancedSignal<unknown>> = {
    ...reconciled.signals,
  };

  const getSignal = <T,>(
    key: string,
    fallbackValue: T,
    sourceName: string,
  ): ProvenancedSignal<T> => {
    const existing = provenance[key] as ProvenancedSignal<T> | undefined;
    if (existing) return existing;
    const created = heuristicSignal(key, fallbackValue, sourceName, observedAt) as ProvenancedSignal<T>;
    provenance[key] = created;
    return created;
  };

  const revenueSignal = getSignal<number | null>(
    'revenueGrowthYoY',
    industryData ? Math.round((industryData.avgLayoffRate2025 * -50 + 8) * 10) / 10 : 5,
    'industry revenue heuristic',
  );
  const stockSignal = getSignal<number | null>(
    'stock90DayChange',
    companyData.isPublic
      ? industryData?.growthOutlook === 'declining'
        ? -12
        : industryData?.growthOutlook === 'volatile'
          ? -5
          : industryData?.growthOutlook === 'growing'
            ? 8
            : 0
      : 0,
    'industry stock heuristic',
  );
  const employeeSignal = getSignal<number>(
    'employeeCount',
    Math.max(1, companyData.employeeCount || 1000),
    'company headcount baseline',
  );
  const revenuePerEmployeeSignal = getSignal<number>(
    'revenuePerEmployee',
    Math.max(1, companyData.revenuePerEmployee || 250_000),
    'company revenue-per-employee baseline',
  );
  const aiInvestmentSignal = getSignal<string>(
    'aiInvestmentSignal',
    companyData.aiInvestmentSignal || 'medium',
    'company AI investment baseline',
  );
  const layoffEventsSignal = getSignal<Array<{ date: string; percentCut: number }>>(
    'layoffsLast24Months',
    companyData.layoffsLast24Months ?? [],
    'company layoff history baseline',
  );
  const layoffRoundsSignal = getSignal<number>(
    'layoffRounds',
    companyData.layoffRounds ?? 0,
    'company layoff rounds baseline',
  );
  const lastLayoffPercentSignal = getSignal<number | null>(
    'lastLayoffPercent',
    companyData.lastLayoffPercent ?? null,
    'company layoff severity baseline',
  );
  const hiringTrendSignal = getSignal<string>(
    'hiringTrend',
    (companyData as any)._hiringPostingTrend ?? 'stable',
    'hiring trend heuristic',
  );

  const companyRoleRisk = getCompanyRoleRisk(companyData, roleTitle);
  const roleRisk = inferRoleRisk(roleTitle);
  const automationBlend = clamp(
    roleRisk.aiRisk * 0.7 + (typeof companyRoleRisk === 'number' ? companyRoleRisk * 0.3 : 0),
  );
  const layoffBlend = clamp(
    roleRisk.layoffRisk * 0.7 + (typeof companyRoleRisk === 'number' ? companyRoleRisk * 0.3 : 0),
  );
  const aiMaturityBlend = clamp(
    ((industryData?.aiAdoptionRate ?? 0.55) * 0.6) +
      (aiInvestmentWeight(aiInvestmentSignal.value as CompanyData['aiInvestmentSignal']) * 0.4),
  );

  const departmentNewsRisk =
    Array.isArray(layoffEventsSignal.value) && layoffEventsSignal.value.length > 0
      ? 0.72
      : hiringTrendSignal.value === 'frozen'
        ? 0.45
        : hiringTrendSignal.value === 'declining'
          ? 0.32
          : 0.1;

  const revenueGrowth = buildResolvedSignal(
    'revenueGrowthYoY',
    revenueSignal,
    mapRevenueGrowth((revenueSignal.value as number | null) ?? null),
    reconciled.conflicts,
  );
  const stockTrend = buildResolvedSignal(
    'stock90DayChange',
    stockSignal,
    mapStockTrend((stockSignal.value as number | null) ?? null),
    reconciled.conflicts,
  );
  const fundingHealth = buildResolvedSignal(
    'fundingHealth',
    heuristicSignal('fundingHealth', companyData.isPublic ? 0.3 : mapFundingStatus(companyData.lastFundingRound, companyData.monthsSinceLastFunding), 'funding health model', observedAt),
    companyData.isPublic ? 0.3 : mapFundingStatus(companyData.lastFundingRound, companyData.monthsSinceLastFunding),
    reconciled.conflicts,
  );
  const overstaffing = buildResolvedSignal(
    'revenuePerEmployee',
    revenuePerEmployeeSignal,
    mapOverstaffing(
      Number(revenuePerEmployeeSignal.value ?? companyData.revenuePerEmployee ?? 250_000),
      companyData.region,
      companyData.industry,
    ),
    reconciled.conflicts,
  );
  const companySize = buildResolvedSignal(
    'employeeCount',
    employeeSignal,
    mapCompanySize(Number(employeeSignal.value ?? companyData.employeeCount ?? 1000)),
    reconciled.conflicts,
  );
  const recentLayoffRecency = buildResolvedSignal(
    'layoffsLast24Months',
    layoffEventsSignal,
    calculateRecentLayoffRisk(
      (layoffEventsSignal.value as Array<{ date: string; percentCut: number }>) ?? [],
      now,
    ),
    reconciled.conflicts,
  );
  const layoffFrequency = buildResolvedSignal(
    'layoffRounds',
    layoffRoundsSignal,
    calculateRoundFrequency(
      Number(layoffRoundsSignal.value ?? companyData.layoffRounds ?? 0),
      (layoffEventsSignal.value as Array<{ date: string; percentCut: number }>) ?? [],
      now,
    ),
    reconciled.conflicts,
  );
  const layoffSeverity = buildResolvedSignal(
    'lastLayoffPercent',
    lastLayoffPercentSignal,
    lastLayoffPercentSignal.value != null
      ? clamp(Number(lastLayoffPercentSignal.value) / 25)
      : 0.15,
    reconciled.conflicts,
  );
  const sectorContagion = buildResolvedSignal(
    'sectorContagion',
    heuristicSignal('sectorContagion', industryData?.avgLayoffRate2025 ?? 0.04, 'industry contagion baseline', observedAt),
    calculateSectorContagion(industryData),
    reconciled.conflicts,
  );
  const departmentNews = buildResolvedSignal(
    'departmentNews',
    hiringTrendSignal,
    departmentNewsRisk,
    reconciled.conflicts,
  );
  const automationRisk = buildResolvedSignal(
    'automationRisk',
    heuristicSignal('automationRisk', automationBlend, `role exposure model (${department || 'general'})`, observedAt),
    automationBlend,
    reconciled.conflicts,
  );
  const aiToolMaturity = buildResolvedSignal(
    'aiToolMaturity',
    heuristicSignal('aiToolMaturity', aiMaturityBlend, 'industry AI maturity model', observedAt),
    aiMaturityBlend,
    reconciled.conflicts,
  );
  const humanAmplification = buildResolvedSignal(
    'humanAmplification',
    heuristicSignal('humanAmplification', 1 - layoffBlend, 'role human-amplification model', observedAt),
    1 - layoffBlend,
    reconciled.conflicts,
  );
  const industryBaseline = buildResolvedSignal(
    'industryBaseline',
    heuristicSignal('industryBaseline', industryData?.baselineRisk ?? 0.5, 'industry baseline model', observedAt),
    industryData?.baselineRisk ?? 0.5,
    reconciled.conflicts,
  );
  const aiAdoptionRate = buildResolvedSignal(
    'aiAdoptionRate',
    heuristicSignal('aiAdoptionRate', industryData?.aiAdoptionRate ?? 0.55, 'industry AI adoption model', observedAt),
    industryData?.aiAdoptionRate ?? 0.55,
    reconciled.conflicts,
  );
  const growthOutlook = buildResolvedSignal(
    'growthOutlook',
    heuristicSignal('growthOutlook', mapGrowthOutlook(industryData?.growthOutlook), 'industry growth outlook model', observedAt),
    mapGrowthOutlook(industryData?.growthOutlook),
    reconciled.conflicts,
  );
  const averageTenure = buildResolvedSignal(
    'averageTenure',
    heuristicSignal('averageTenure', companyData.employeeCount > 50_000 ? 0.35 : 0.45, 'company tenure heuristic', observedAt),
    companyData.employeeCount > 50_000 ? 0.35 : 0.45,
    reconciled.conflicts,
  );

  const resolvedSignals = [
    revenueGrowth,
    stockTrend,
    fundingHealth,
    overstaffing,
    companySize,
    recentLayoffRecency,
    layoffFrequency,
    layoffSeverity,
    sectorContagion,
    departmentNews,
    automationRisk,
    aiToolMaturity,
    humanAmplification,
    industryBaseline,
    aiAdoptionRate,
    growthOutlook,
    averageTenure,
  ];

  const avgConfidence =
    resolvedSignals.reduce((sum, signal) => sum + signal.confidence, 0) / resolvedSignals.length;
  const conflictPenalty = reconciled.conflicts.length * 0.05;
  const degradedPenalty = reconciled.degradedSignalClasses.length * 0.03;
  const hardFailurePenalty = reconciled.hardFailures.length * 0.06;
  const computedConfidence = clamp(
    avgConfidence - conflictPenalty - degradedPenalty - hardFailurePenalty,
    0.1,
    0.95,
  );

  // ── LOW_DATA floor ─────────────────────────────────────────────────────────
  // When 3+ critical signals are null OR at their heuristic default sentinel,
  // cap confidence at 0.35. Without this, an all-null input set (e.g. unknown
  // private company) produces a 55-65 score with 70% confidence — the most
  // damaging UX bug because it looks authoritative.
  const isCriticalSignalMissing = (
    sig: { source: SignalSourceKind; value: unknown },
    defaultSentinels: unknown[],
  ): boolean => {
    if (sig.source !== 'live' && sig.source !== 'db') return true;
    return sig.value === null || sig.value === undefined || defaultSentinels.includes(sig.value);
  };

  const missingCriticalCount = [
    isCriticalSignalMissing(stockSignal, [0]),
    isCriticalSignalMissing(revenueSignal, [5]),
    isCriticalSignalMissing(employeeSignal, [1000]),
    Array.isArray(layoffEventsSignal.value) && (layoffEventsSignal.value as unknown[]).length === 0,
    isCriticalSignalMissing(hiringTrendSignal, ['stable']),
  ].filter(Boolean).length;

  const lowDataCap = missingCriticalCount >= 3 ? 0.35 : null;

  // Gate confidence on data freshness: fully static data → cap 35%, mostly stale → cap 55%
  const dataFreshnessScore = (companyData as any)._dataFreshnessScore as number | undefined;
  let freshnessConfidenceCap: number | null = null;
  const freshnessNotes: string[] = [];
  if (dataFreshnessScore != null) {
    if (dataFreshnessScore < 0.1) {
      freshnessConfidenceCap = 0.35;
      freshnessNotes.push('Static data only — all live sources unavailable');
    } else if (dataFreshnessScore < 0.4) {
      freshnessConfidenceCap = 0.55;
      freshnessNotes.push('Limited live data — majority of signals from DB cache');
    }
  }

  const overallConfidence = (() => {
    let value = reconciled.confidenceCap != null
      ? Math.min(computedConfidence, reconciled.confidenceCap)
      : computedConfidence;
    if (lowDataCap != null) value = Math.min(value, lowDataCap);
    if (freshnessConfidenceCap != null) value = Math.min(value, freshnessConfidenceCap);
    return value;
  })();

  const liveSignalCount = resolvedSignals.filter((signal) => signal.primarySource === 'live').length;
  const heuristicSignalCount = resolvedSignals.length - liveSignalCount;
  const ages = resolvedSignals.map((signal) => signal.stalenessDays);

  return {
    companyName: companyData.name,
    roleTitle,
    department,
    userFactors,
    consensusData: {
      revenueGrowth,
      stockTrend,
      fundingHealth,
      overstaffing,
      companySize,
      recentLayoffRecency,
      layoffFrequency,
      layoffSeverity,
      sectorContagion,
      departmentNews,
      automationRisk,
      aiToolMaturity,
      humanAmplification,
      industryBaseline,
      aiAdoptionRate,
      growthOutlook,
      averageTenure,
      overallConfidence,
      conflictLevel: computeConflictLevel(reconciled.conflicts),
      allConflicts: reconciled.conflicts,
      lowDataWarning: lowDataCap != null
        ? { code: 'LOW_DATA' as const, missingCount: missingCriticalCount, capAt: lowDataCap }
        : undefined,
      freshnessReport: {
        oldestSignalAge: Math.max(...ages),
        avgSignalAge: Math.round(ages.reduce((sum, age) => sum + age, 0) / ages.length),
        percentLive: resolvedSignals.length > 0 ? liveSignalCount / resolvedSignals.length : 0,
        percentHeuristic: resolvedSignals.length > 0 ? heuristicSignalCount / resolvedSignals.length : 0,
        totalSignalCount: resolvedSignals.length,
        liveSignalCount,
        heuristicSignalCount,
      },
    },
    provenance,
    reconciliationSummary: reconciled.summary,
    missingDataFallbacks: reconciled.missingDataFallbacks,
    degradedSignalClasses: reconciled.degradedSignalClasses,
    hardFailures: reconciled.hardFailures,
    confidenceCap: reconciled.confidenceCap,
    confidenceCapsApplied: [
      ...(reconciled.confidenceCapsApplied ?? []),
      ...freshnessNotes,
    ],
    _dataFreshnessScore: dataFreshnessScore,
  };
}
