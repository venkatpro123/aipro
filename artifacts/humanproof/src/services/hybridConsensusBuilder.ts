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
// WS4 — Empirical confidence model. Reproduces the legacy `computeConfidence`
// weights internally when `ws4_conformal_ci` flag is off, so unconditional
// use is safe. When on, conformal CI quality + evidence presence gate +
// swarm n_eff are folded into the score.
import { computeEmpiricalConfidence } from './empiricalConfidenceModel';
// WS9 — spread thresholds are uncalibrated developer estimates; route
// through DB so the recalibrate cron can replace them and v_uncalibrated_exposure
// can quantify how many audits depend on them.
import { getConstant } from './calibration/calibrationConstants';

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
  /** v40 quorum gate — true when zero classes were positively satisfied. */
  _quorumInsufficient?: boolean;
  /** Number of POSITIVELY-satisfied quorum classes (0-4). Absence doesn't count. */
  _quorumPositiveClassCount?: number;
  /** Structural explanation for absent signal classes (e.g. private company legal disclosure). Shown in LiveSignalStatusBanner. */
  _quorumStructuralNote?: string | null;
  /** Raw QuorumStatus from awaitLiveQuorum, for transparency UI. */
  _liveQuorumStatus?: unknown;
  /** BUG-05 — Evidence-based confidence BEFORE the private-regime structural ceiling was applied.
   *  null when no ceiling fired (either no regime or ceiling was not-binding). */
  _evidencePreCeiling?: number | null;
  /** BUG-05 — The structural ceiling value that was applied (e.g. 0.55 for german_gmbh). */
  _evidenceCeilingValue?: number | null;
  /** BUG-05 — Regime label for UI display (e.g. 'german_gmbh'). */
  _evidenceRegimeLabel?: string | null;
  /**
   * The DB quality tier floor applied when the 45-second quorum ceiling was reached
   * without quorum (liveUnavailable=true). null when live data was available.
   * Distinct from _evidenceCeilingValue: that is a jurisdiction structural cap;
   * this is a scraper-timeout floor anchored to DB record completeness.
   * Exposed so the UI can show "Scraper timeout — confidence anchored to Tier A floor (62%)"
   * rather than displaying 62% as if it were evidence-derived.
   */
  _liveUnavailableFloor?: number | null;
  /**
   * The DB reliability tier that produced _liveUnavailableFloor.
   * A = full record (floor 0.62), B = partial (0.52), C = sparse (0.45), D = minimal (0.35).
   * null when live data was available and no floor was applied.
   */
  _dbReliabilityTier?: 'A' | 'B' | 'C' | 'D' | null;
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
  // Guard: malformed/null dates produce Invalid Date → NaN arithmetic → corrupts
  // all downstream calculations (layoff recency, round frequency, etc.).
  if (isNaN(date.getTime())) return 999; // treat as ancient/irrelevant
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

const calculateSectorContagion = (industryData?: IndustryRisk, region?: string): number => {
  // v40.0 FIX-5: India IT sector has elevated contagion baseline from NASSCOM
  // wave evidence (2022–2024). Use 0.55 instead of the generic 0.45 for unknown
  // industry when the company is in India — previously treated the same as a US
  // company with unknown industry, under-estimating contagion risk.
  if (!industryData) return region === 'IN' ? 0.55 : 0.45;
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
  // WS9 — spread thresholds were hardcoded uncalibrated values. Each
  // bucket is now sourced from engine_calibration_constants with the
  // legacy literal as bootstrap fallback. Routing through getConstant()
  // ALSO means each lookup writes a row to engine_constant_resolutions,
  // so v_uncalibrated_exposure can quantify what fraction of audits
  // these uncalibrated values still touch.
  let spread: number;
  if (isHeuristic) {
    spread = getConstant<number>('hybridConsensusBuilder.spread.heuristic', 0.28).value as number;
  } else if (confidence >= 0.85) {
    spread = getConstant<number>('hybridConsensusBuilder.spread.highConfidence', 0.08).value as number;
  } else if (confidence >= 0.65) {
    spread = getConstant<number>('hybridConsensusBuilder.spread.mediumConfidence', 0.14).value as number;
  } else {
    spread = getConstant<number>('hybridConsensusBuilder.spread.lowConfidence', 0.22).value as number;
  }
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
  now: _now,
}: {
  reconciled: ReconciledCompanySignals;
  companyData: CompanyData;
  industryData?: IndustryRisk;
  roleTitle: string;
  department: string;
  userFactors: UserFactors;
  /** Reference timestamp. Inject for deterministic / test runs; defaults to wall clock. */
  now?: Date;
}): HybridScorePayload {
  const now = _now ?? new Date();
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
    calculateSectorContagion(industryData, companyData.region),
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

  // v32: confidence is now computed by computeConfidence() below from the
  // evidence model. The legacy penalty terms (conflict/degraded/hardFailure)
  // are folded into that model — see confidenceModel.ts. No avgConfidence
  // intermediate is needed.

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

  // ── v32: EVIDENCE-BASED CONFIDENCE ──────────────────────────────────────────
  // Replaces the v31 time-based Tier 0/1/2/3 gate. Confidence now reflects the
  // ACTUAL quality of acquired evidence — quorum coverage, cross-source
  // agreement, freshness, source reliability — not whether the worker pipeline
  // finished within a bounded budget.
  //
  // The Tier gate caused two pathological behaviours:
  //   1. A worker taking 9s instead of 7s could cap a complete audit at 30%
  //      even though all the live signals had actually landed.
  //   2. Confidence-cap UI invited users to re-audit — users rarely did, so
  //      they walked away believing the platform doesn't work live.
  //
  // The evidence model lets a well-acquired audit reach 90%+ confidence even
  // when total wait time was long, and a poorly-acquired audit shows honest
  // low confidence even when fast. This is what the user requested.
  const dataFreshnessScore = (companyData as any)._dataFreshnessScore as number | undefined;
  const freshnessNotes: string[] = [];

  // Extract evidence inputs from the reconciliation report.
  const allSignals = Object.values(reconciled.signals);
  const freshCount    = allSignals.filter(s => s.freshnessState === 'fresh').length;
  const degradedCount = allSignals.filter(s => s.freshnessState === 'degraded').length;
  const invalidCount  = allSignals.filter(s => s.freshnessState === 'invalid').length;

  // Source reliability — average across live-source signals only. Live signals
  // come from real-time APIs (Yahoo, Wikipedia, NewsAPI, RSS) and carry higher
  // base reliability than DB or heuristic.
  const liveSourceConfidences = allSignals
    .filter(s => s.source === 'live')
    .map(s => s.confidence);
  const avgSourceReliability = liveSourceConfidences.length > 0
    ? liveSourceConfidences.reduce((a, b) => a + b, 0) / liveSourceConfidences.length
    : 0.4;  // no live sources at all → neutral-low

  // Approximate quorum status from the reconciliation summary. The audit pipeline
  // writes the real awaitLiveQuorum result onto companyData._liveQuorumStatus —
  // this fallback only fires for legacy callers (tests, background-refresh paths
  // that bypass Stage C).
  //
  // Audit v35 fix: the previous fallback was OPTIMISTICALLY biased — it called
  // a class "satisfied" whenever reconciliation had liveWonKeys.length >= some
  // threshold, even though liveWonKeys can include scrape-as-live (Wikipedia,
  // RSS) which inflates the count without being real API quorum. The corrected
  // fallback is PESSIMISTICALLY honest: when no real quorum status was passed,
  // assume nothing reached quorum so the confidence model surfaces the
  // liveUnavailable cap (0.45). Better honest-low than dishonest-high.
  const quorumStatusFallback = {
    reached: false,
    elapsedMs: 0,
    perClass: {
      workforce: { signalClass: 'workforce' as const, sourcesReached: [], sourcesPending: [], satisfied: false, satisfiedByAbsence: false },
      layoffs:   { signalClass: 'layoffs' as const,   sourcesReached: [], sourcesPending: [], satisfied: false, satisfiedByAbsence: false },
      financial: { signalClass: 'financial' as const, sourcesReached: [], sourcesPending: [], satisfied: false, satisfiedByAbsence: false },
      hiring:    { signalClass: 'hiring' as const,    sourcesReached: [], sourcesPending: [], satisfied: false, satisfiedByAbsence: false },
    },
  };

  // If the orchestrator passed a real quorum status via companyData, use it.
  const realQuorumStatus = (companyData as any)._liveQuorumStatus;
  const quorumStatus = realQuorumStatus ?? quorumStatusFallback;

  // Cross-source agreement comes from reconciliation conflicts: each NON-conflicted
  // live-won key represents one agreement opportunity that succeeded.
  const totalLiveWon = reconciled.summary.liveWonKeys.length;
  const conflictedKeyCount = reconciled.summary.conflictedKeys.length;
  const crossSourceAgreements = Math.max(0, totalLiveWon - conflictedKeyCount);
  const totalAgreementOpportunities = totalLiveWon;

  // Live-unavailable cap fires when the orchestrator explicitly marked the audit
  // as live-unavailable (Stage C ran to the 45s ceiling without quorum).
  const liveUnavailable = (companyData as any)._liveUnavailable === true;

  // WS4 — Route through the empirical confidence model. When
  // `ws4_conformal_ci` is off, computeEmpiricalConfidence internally
  // applies legacy weights, so the output shape and value are equivalent
  // to the legacy `computeConfidence`. When the flag is on, conformal
  // CI quality + evidence presence gate + swarm n_eff are folded in.
  const evidenceConfidence = computeEmpiricalConfidence({
    quorumStatus,
    crossSourceAgreements,
    totalAgreementOpportunities,
    freshSignalCount:    freshCount,
    degradedSignalCount: degradedCount,
    invalidSignalCount:  invalidCount,
    avgSourceReliability,
    liveUnavailable,
    conflictCount:       reconciled.conflicts.length,
    // The three optional inputs are passed when upstream stages have
    // computed them. They default to null — empiricalConfidenceModel
    // handles the null case gracefully.
    conformal:         (companyData as any)._conformalBundle ?? null,
    swarmIndependence: (companyData as any)._swarmIndependence ?? null,
    evidencePerClass:  (companyData as any)._evidencePresence ?? undefined,
    // v40.0: pass DB reliability tier so liveUnavailable floor is quality-aware.
    // Unknown companies get a 'D' override set in the pipeline fallback path;
    // all others use the DQ report tier derived from validateDataQuality().
    dbReliabilityTier: (companyData as any)._dbReliabilityTierOverride
      ?? (companyData as any)._dataQuality?.tier
      ?? undefined,
    // BUG-05: pass the detected private-company regime so PRIVATE_REGIME_CEILINGS
    // actually fires. Previously this was computed in auditDataPipeline but never
    // forwarded here — the ceiling was dead code.
    privateCompanyRegime: (companyData as any)._detectedRegime ?? null,
  });

  // Diagnostic rationale — surfaced via confidenceCapsApplied for UI tooltip.
  freshnessNotes.push(...evidenceConfidence.rationale);

  const overallConfidence = (() => {
    // The reconciliation cap (set by hard-failure live-signal situations in
    // reconcileCompanySignals) still applies — it's already evidence-based.
    let value = reconciled.confidenceCap != null
      ? Math.min(evidenceConfidence.value, reconciled.confidenceCap)
      : evidenceConfidence.value;
    if (lowDataCap != null) value = Math.min(value, lowDataCap);
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
        // Guard: Math.max(...[]) returns -Infinity and ages.reduce / 0 returns NaN
        // when no resolved signals exist. Use 0 as the safe default (no age = fresh).
        oldestSignalAge: ages.length > 0 ? Math.max(...ages) : 0,
        avgSignalAge: ages.length > 0
          ? Math.round(ages.reduce((sum, age) => sum + age, 0) / ages.length)
          : 0,
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
    // v40 quorum gate — surface refusal state on the consensus output so the
    // LayoffCalculator banner can render the "Quorum not met" red strip.
    _quorumInsufficient:
      (companyData as any)._quorumInsufficient === true,
    _quorumPositiveClassCount:
      typeof (companyData as any)._quorumPositiveClassCount === 'number'
        ? (companyData as any)._quorumPositiveClassCount
        : undefined,
    _quorumStructuralNote:
      typeof (companyData as any)._quorumStructuralNote === 'string'
        ? (companyData as any)._quorumStructuralNote
        : null,
    _liveQuorumStatus: (companyData as any)._liveQuorumStatus ?? null,
    // BUG-05: expose pre-ceiling confidence so TransparencyTab can show
    // "Evidence quality: X% → Structural cap: Y%" when they differ.
    _evidencePreCeiling: evidenceConfidence.breakdown.preRegimeCeilingValue ?? null,
    _evidenceCeilingValue: evidenceConfidence.breakdown.privateRegimeCeiling ?? null,
    _evidenceRegimeLabel: (companyData as any)._detectedRegime ?? null,
    // Scraper-timeout floor: expose the floor value and tier so TransparencyTab and
    // DataFreshnessPanel can distinguish "62% from genuine evidence" from "62% from
    // Tier A DB floor after the 45s quorum ceiling fired without quorum".
    _liveUnavailableFloor: evidenceConfidence.breakdown.liveUnavailableFloor ?? null,
    _dbReliabilityTier: (evidenceConfidence.breakdown.liveUnavailableFloor != null
      ? ((companyData as any)._dbReliabilityTierOverride
          ?? (companyData as any)._dataQuality?.tier
          ?? 'C')
      : null) as 'A' | 'B' | 'C' | 'D' | null,
  };
}
