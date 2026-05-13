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
  _liveDataCoverage?: unknown;
}

const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));

// Industry-calibrated revenue growth defaults when actual value is null.
// Using fixed 0.5 for all nulls masked real sector differences (e.g. declining
// Media at -5% YoY vs growing EdTech at +18% YoY both looked "neutral").
const INDUSTRY_REVENUE_NULL_DEFAULT: Record<string, number> = {
  Technology:          0.42,  // ~8% YoY median growth
  'IT Services':       0.45,  // ~6% median
  FinTech:             0.40,  // ~10% median
  EdTech:              0.38,  // ~12% median
  HealthTech:          0.40,  // ~9% median
  'Biotech/Pharma':    0.45,  // ~5% median
  Media:               0.60,  // ~-3% median (declining)
  'Media & Publishing': 0.62, // ~-5% median
  Retail:              0.50,  // ~0% median
  Manufacturing:       0.48,  // ~2% median
  Banking:             0.47,  // ~3% median
  'Financial Services': 0.46, // ~4% median
  Logistics:           0.50,  // ~0% median
};

const mapRevenueGrowth = (yoyPercent: number | null, industry?: string): number => {
  if (yoyPercent === null) {
    // Use industry-calibrated null default instead of universal 0.5
    return INDUSTRY_REVENUE_NULL_DEFAULT[industry ?? ''] ?? 0.50;
  }
  if (yoyPercent < -20) return 0.95;
  if (yoyPercent < -10) return 0.85;
  if (yoyPercent < 0) return 0.72;
  if (yoyPercent < 5) return 0.55;
  if (yoyPercent < 10) return 0.42;
  if (yoyPercent < 20) return 0.3;
  if (yoyPercent < 30) return 0.18;
  return 0.1;
};

const mapStockTrend = (change90Day: number | null, isPublic?: boolean): number => {
  // For private companies, null stock data is expected — use a lower neutral (0.40)
  // rather than 0.5, because private companies have no market-driven distress signals.
  // For public companies, null stock is a data gap → treat as higher uncertainty (0.50).
  if (change90Day === null) return isPublic ? 0.50 : 0.40;
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
  isFallbackSource = false,
): number => {
  // v21.0 WARN cross-validation: when WARN/SEC/news events populate the
  // layoffs array but the static DB row says rounds = 0, trust the regulatory
  // evidence over the DB. Previously this returned 0.05 (essentially "no
  // layoffs"), letting the DB silently override a confirmed WARN filing.
  const effectiveRounds = Math.max(rounds | 0, layoffs?.length ?? 0);
  if (effectiveRounds === 0) {
    // 0.05 = confirmed safe (live signal verified zero layoffs).
    // 0.25 = uncertain (fallback/heuristic: "no data" ≠ "no layoffs").
    return isFallbackSource ? 0.25 : 0.05;
  }

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
  // 0.45 splits the difference with the main engine's calculateMarketConditionsScore
  // which returns 0.5 for unknown industry — reduces inter-engine score variance from
  // ±1.2pts to ±0.6pts for companies in unrecognised sectors.
  if (!industryData) return 0.45;
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
  // RPE null: use industry-calibrated median rather than fixed 250k.
  // For India IT (35k median), using 250k incorrectly signals "high overstaffing."
  const _rpeIndustryFallback = isIndiaRegion(companyData.region ?? 'US')
    ? (INDIA_SECTOR_RPE_MEDIANS[companyData.industry ?? '_default'] ?? INDIA_SECTOR_RPE_MEDIANS._default)
    : 250_000;
  const revenuePerEmployeeSignal = getSignal<number>(
    'revenuePerEmployee',
    companyData.revenuePerEmployee != null
      ? Math.max(1, companyData.revenuePerEmployee)
      : _rpeIndustryFallback,
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
    mapRevenueGrowth((revenueSignal.value as number | null) ?? null, companyData.industry),
    reconciled.conflicts,
  );
  const stockTrend = buildResolvedSignal(
    'stock90DayChange',
    stockSignal,
    mapStockTrend((stockSignal.value as number | null) ?? null, companyData.isPublic),
    reconciled.conflicts,
  );
  const fundingHealth = buildResolvedSignal(
    'fundingHealth',
    heuristicSignal('fundingHealth', companyData.isPublic ? 0.3 : mapFundingStatus(companyData.lastFundingRound, companyData.monthsSinceLastFunding), 'funding health model', observedAt),
    companyData.isPublic ? 0.3 : mapFundingStatus(companyData.lastFundingRound, companyData.monthsSinceLastFunding),
    reconciled.conflicts,
  );
  // Overstaffing: only use mapOverstaffing when RPE is a real observed value (live/db).
  // When the signal is heuristic (invented fallback like $250K), PPP-adjusting an
  // invented number produces false overstaffing signals — e.g. a SE Asia startup with
  // no revenue data appears "efficiently staffed" at $250K/person × PPP adjustment.
  // Use neutral 0.40 for heuristic RPE so it neither inflates nor deflates the score.
  const overstaffingRisk = revenuePerEmployeeSignal.source === 'heuristic'
    ? 0.40  // neutral — RPE is a fallback default, not an observed value
    : mapOverstaffing(
        Number(revenuePerEmployeeSignal.value ?? companyData.revenuePerEmployee ?? 250_000),
        companyData.region,
        companyData.industry,
      );
  const overstaffing = buildResolvedSignal(
    'revenuePerEmployee',
    revenuePerEmployeeSignal,
    overstaffingRisk,
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
      (companyData as any)._dataFreshnessScore === 0,
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
  // cap confidence at 0.35. Threshold was lowered to 2 previously but that was
  // too aggressive: private small companies legitimately have no stock data and
  // default 'stable' hiring trend — hitting threshold 2 immediately and capping
  // every private company at 35%, even when industry/role signals are strong.
  //
  // EXCEPTION: Unknown/fallback companies (not in DB) are excluded from the LOW_DATA
  // gate entirely. Their confidence is already handled by the freshness confidence
  // cap (Tier 0 at 30% when _dataFreshnessScore ≤ 0.15). Applying LOW_DATA on top
  // would double-penalize the same missing-data condition and produce misleading
  // "5 critical signals missing" warnings when the company was never expected to be
  // in the DB in the first place.
  const isUnknownCompany =
    (companyData.source ?? '').toLowerCase().includes('fallback') ||
    (companyData.source ?? '').toLowerCase().includes('unknown');

  const isCriticalSignalMissing = (
    sig: { source: SignalSourceKind; value: unknown },
    defaultSentinels: unknown[],
  ): boolean => {
    // Heuristic source → always count as missing (no real observation was made)
    if (sig.source !== 'live' && sig.source !== 'db') return true;
    // Live/DB source: only count as missing if the value is null/undefined.
    // Do NOT apply sentinel matching for live/db sources — a company legitimately
    // having 1000 employees or 5% revenue growth should NOT be treated as "missing"
    // just because those happen to equal heuristic default values. Sentinels only
    // have meaning for heuristic-sourced signals, which are caught by the check above.
    return sig.value === null || sig.value === undefined;
  };

  const missingCriticalCount = isUnknownCompany ? 0 : [
    isCriticalSignalMissing(stockSignal, [0]),
    isCriticalSignalMissing(revenueSignal, [5]),
    isCriticalSignalMissing(employeeSignal, [1000]),
    Array.isArray(layoffEventsSignal.value) && (layoffEventsSignal.value as unknown[]).length === 0,
    // 'stable' hiring trend is expected for companies where live hiring data is heuristic.
    // Only count as missing when source is explicitly heuristic AND the company IS in the DB.
    hiringTrendSignal.source === 'heuristic' && hiringTrendSignal.value === 'stable',
  ].filter(Boolean).length;

  const lowDataCap = missingCriticalCount >= 3 ? 0.35 : null;

  // ── 4-TIER LIVE DATA CONFIDENCE GATE ────────────────────────────────────────
  // Confidence is capped by how much of the audit came from real live sources.
  // Tier 0 (0–15% live)   → cap 30%  — Emergency Static Fallback
  // Tier 1 (16–40% live)  → cap 50%  — Primarily Database
  // Tier 2 (41–70% live)  → cap 70%  — Partially Live
  // Tier 3 (71–100% live) → no cap   — Live Intelligence Active
  const dataFreshnessScore = (companyData as any)._dataFreshnessScore as number | undefined;
  let freshnessConfidenceCap: number | null = null;
  const freshnessNotes: string[] = [];
  if (dataFreshnessScore != null) {
    if (dataFreshnessScore <= 0.15) {
      freshnessConfidenceCap = 0.30;
      freshnessNotes.push('Emergency static fallback — no live sources responded. Score reflects DB baseline only.');
    } else if (dataFreshnessScore <= 0.40) {
      freshnessConfidenceCap = 0.50;
      freshnessNotes.push('Primarily database data — fewer than 40% of signals came from live APIs.');
    } else if (dataFreshnessScore <= 0.70) {
      freshnessConfidenceCap = 0.70;
      freshnessNotes.push('Partially live — some signals from database cache. Refresh in 4h for full accuracy.');
    }
    // Tier 3: > 70% live — no cap applied
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
    _liveDataCoverage: (companyData as any)._liveDataCoverage ?? null,
  };
}
