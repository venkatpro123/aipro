// auditDataPipeline.ts
// Hierarchical data retrieval and normalization for Layoff Audit dashboards.
// Phase 1 Fix 4: liveSignalCount is now truthful (was hardcoded 5 even when source was DB).
// Phase 2: Integrates fetchLiveCompanyData for Alpha Vantage + NewsAPI enrichment.

import { CompanyData, normalizeRegion } from "../data/companyDatabase";
import { getCompanySync as getCompanyByName } from "./db/staticDataService";
import { HybridResult, DEFAULT_HYBRID_RESULT } from "../types/hybridResult";
import {
  calculateLayoffScore,
  ScoreInputs,
  UserFactors,
  ScoreResult,
  createUnknownCompanyFallback
} from "./layoffScoreEngine";
import { fetchLiveCompanyData, reconcileCompanySignals, type ReconciledCompanySignals } from "./liveDataService";
import { buildHybridScorePayload } from "./hybridConsensusBuilder";
import { queryCompanyIntelligenceWithMatch, saveToDiscoveryQueue } from "./companyIntelligenceService";
import { supabase } from "../utils/supabase";
import { IndustryRisk } from "../data/industryRiskData";
import { getAllIndustryRisk } from "./db/staticDataService";
import { PipelineTimer, type PipelineTimerInstance } from "./pipelineTimer";
import { validateDataQuality, applyIntelligentFallbacks, computeAccuracyMetrics } from "./dataQualityValidator";
import { resolveRoleInput } from "./roleResolution";
import { resolveCompanyData } from "../data/companyIntelligenceBridge";
import { loadCuratedLayoffEvents } from "../data/layoffNewsCache";
import { computeJobMarketLiquidity } from "./jobMarketLiquidityService";
import { computeEscapePaths } from "./escapePathOptimizer";
import { computeTemporalRisk } from "./temporalRiskAmplifier";
import { buildPrecisionBrief, detectScenario } from "./scenarioNarrativeEngine";
import { computeFinancialRunway } from "./financialRunwayIntelligence";
import { computeDepartmentRisk, mapScenarioToCompanyArchetype } from "./departmentRiskEngine";
import { computeScoreSensitivity } from "./scoreSensitivityEngine";
// v11.0 intelligence layers
import { computeSignalContradictions } from "./signalContradictionEngine";
import { computeExecutiveMovementRisk, deriveExecutiveDepartures } from "./executiveMovementEngine";
import { analyzeHiringSignals, deriveHiringSignalInputs } from "./hiringSignalAnalyzer";
import { computeCompetitiveIntelligence } from "./competitiveIntelligenceEngine";
import { computeExitTiming } from "./exitTimingOptimizer";
import { computeCareerResilience } from "./careerResilienceEngine";
import { predictLayoffSurvival } from "./layoffSurvivalPredictor";
// v12.0 intelligence layers
import { computeManagerRisk } from "./managerRiskEngine";
import { computeScoreTrajectory } from "./scoreTrajectoryEngine";
import { computeVisaRisk } from "./visaRiskEngine";
import { computeInternalMobility } from "./internalMobilityEngine";
import { computeRoleAdjacency } from "./roleAdjacencyEngine";
import { computeNegotiationIntelligence } from "./negotiationIntelligenceService";
import { getLayoffScoreHistory } from "./scoreStorageService";
// v13.0 intelligence layers
import { computeMacroEconomicRisk } from "./macroEconomicRiskEngine";
import { computePeerContagion } from "./peerContagionEngine";
import { computeEmergencyResponse } from "./emergencyResponseProtocol";
import { computeCareerConfidence } from "./careerConfidenceEngine";
import { computeNetworkLeverage } from "./networkLeverageEngine";
import { computeStrategySynthesis } from "./strategySynthesisEngine";
import { computeModelCalibration } from "./modelCalibrationEngine";
// v14.0 intelligence layers (29–38 + calibration)
import { computeCompensationRisk } from "./compensationRiskEngine";
import { computeSkillPortfolioFit } from "./skillPortfolioFitEngine";
import { computeMARisk } from "./mergerAcquisitionRiskEngine";
import { computeFundingStageRisk } from "./fundingStageRiskEngine";
import { computeLeadershipTransitionRisk } from "./leadershipTransitionRiskEngine";
import { computeEmployeeSentiment } from "./employeeSentimentEngine";
import { computeGeographicOptionality } from "./geographicOptionalityEngine";
import { computeHeadcountVelocity } from "./headcountVelocityEngine";
import { computeTechStackObsolescence } from "./techStackObsolescenceEngine";
import { computeCareerVelocity } from "./careerVelocityEngine";
import { computeSegmentCalibration } from "./segmentedCalibrationEngine";
import { computeBayesianCI, deriveDataQualityTier } from "./empiricalCalibration";
// v16.0 intelligence layers (39–46 + enhanced data architecture)
import { classifyCohort, CohortLayerWeights } from "./cohortClassifier";
import { computeWARNSignal } from "./warnActService";
import { computeMacroSignal, fetchLiveMacroSnapshot } from "./blsMacroService";
import { computeSECEnhancedRisk } from "./secEnhancedService";
import { computeGlassdoorVelocity } from "./glassdoorVelocityEngine";
import { computeExecutiveDeparturePattern } from "./executiveDeparturePatternEngine";
import { computeMarketDemandReport } from "./roleMarketDemandService";
import { assessFinancialRunway } from "./financialRunwayService";
// v17.0 intelligence layers (47–54)
import { computePredictionHorizon } from "./predictionHorizonService";
import { computeSkillGapIntelligence } from "./skillGapIntelligenceService";
import { computePersonalizedTimeline } from "./personalizedTimelineService";
import { computeScenarioPlan } from "./scenarioPlanService";
import { fetchIntelligenceBrief } from "./intelligenceBriefService";
import { evaluateJobOffer } from "./offerEvaluationEngine";
import { computeCareerContingencyPlan } from "./careerContingencyPlanEngine";
import { computePreparednessScore } from "./preparednessScoreEngine";
import {
  checkEdgeFunctionHealth,
  getEFDegradationWarnings,
} from "./edgeFunctionRegistry";

const safeLower = (value: unknown, fallback = ""): string =>
  typeof value === "string" && value.trim().length > 0 ? value.toLowerCase() : fallback;

// Maps common industry name variants (from DB / OSINT) to canonical keys used in industryRiskData.
// Without this, "Information Technology", "Software", "BFSI", etc. miss the lookup entirely
// and all industry-sensitive calculations fall back to neutral 0.5 defaults.
const INDUSTRY_ALIAS_MAP: Record<string, string> = {
  'information technology': 'Technology',
  'information technology services': 'IT Services',
  'software': 'Technology',
  'software development': 'Technology',
  'saas': 'Technology',
  'technology services': 'IT Services',
  'tech': 'Technology',
  'it': 'IT Services',
  'engineering it services': 'IT Services',
  'bfsi': 'Financial Services',
  'financial services & banking': 'Financial Services',
  'financial services and banking': 'Financial Services',
  'finance': 'Financial Services',
  'banking & finance': 'Banking',
  'banking and finance': 'Banking',
  'banking & financial services': 'Banking',
  'bank': 'Banking',
  'pharma': 'Biotech/Pharma',
  'pharmaceuticals': 'Biotech/Pharma',
  'pharmaceutical': 'Biotech/Pharma',
  'life sciences': 'Biotech/Pharma',
  'healthcare services': 'Healthcare',
  'health': 'Healthcare',
  'health tech': 'HealthTech',
  'media': 'Media',
  'publishing': 'Media & Publishing',
  'media and publishing': 'Media & Publishing',
  'e-commerce': 'E-commerce',
  'ecommerce': 'E-commerce',
  'beauty e-commerce': 'E-commerce',
  'online retail': 'E-commerce',
  'logistics': 'Logistics',
  'supply chain': 'Logistics',
  'freight': 'Logistics',
  'automotive': 'Manufacturing',
  'auto': 'Manufacturing',
  'consumer goods': 'Retail',
  'consumer electronics': 'Technology',
  'defense': 'Government',
  'aerospace': 'Manufacturing',
  'food tech': 'Food Tech',
  'foodtech': 'Food Tech',
  'quick commerce': 'Quick Commerce',
  'q-commerce': 'Quick Commerce',
  'fintech': 'FinTech',
  'financial technology': 'FinTech',
  'edtech': 'EdTech',
  'education technology': 'EdTech',
  'healthtech': 'HealthTech',
  'agritech': 'AgriTech',
  'agriculture technology': 'AgriTech',
  'proptech': 'PropTech',
  'real estate technology': 'PropTech',
  'mobility': 'Mobility',
  'ride sharing': 'Mobility',
  'electric vehicles': 'Mobility',
};

function resolveIndustryData(
  industry: string | undefined | null,
  industryMap: Record<string, IndustryRisk>,
): IndustryRisk | undefined {
  if (!industry) return undefined;
  const key = industry.trim();
  if (!key) return undefined;

  // 1. Direct match (most keys are already title-cased)
  if (industryMap[key]) return industryMap[key];

  // 2. Title-case variant ("information technology" → "Information Technology")
  const titled = key.replace(/\b\w/g, (c) => c.toUpperCase());
  if (industryMap[titled]) return industryMap[titled];

  // 3. Lowercase alias lookup
  const lower = key.toLowerCase();
  if (industryMap[lower]) return industryMap[lower];

  // 4. Alias map (handles DB variants like "BFSI", "Software", "Information Technology", etc.)
  const alias = INDUSTRY_ALIAS_MAP[lower];
  if (alias && industryMap[alias]) return industryMap[alias];

  return undefined;
}

export interface AuditInputs {
  companyName: string;
  roleTitle: string;
  department: string;
  userFactors: UserFactors;
  oracleKey?: string;
  country?: string;
  financialRunwayMonths?: number;  // v10.0: months of expenses covered (0 = not provided)
}

/**
 * mapOsintToCompanyData
 * Converts raw OSINT Edge Function response to CompanyData schema.
 */
function mapOsintToCompanyData(osintData: any, sourceName?: string): CompanyData {
  const resolvedIsPublic = Boolean(
    osintData.is_public === true || osintData.is_public === "true",
  );

  const resolvedLayoffs: { date: string; percentCut: number }[] =
    Array.isArray(osintData.recent_layoffs)
      ? osintData.recent_layoffs.map((l: any) => ({
          date: l.date ?? new Date().toISOString(),
          // Use 0 for unknown severity — 5% was a fabricated default that inflated L2
          percentCut: typeof l.percent_cut === "number" ? l.percent_cut : 0,
        }))
      : [];

  const resolvedRevPerEmp: number =
    typeof osintData.revenue_per_employee === "number"
      ? osintData.revenue_per_employee
      : osintData.annual_revenue && osintData.employee_count
        ? Math.round(osintData.annual_revenue / osintData.employee_count)
        : 150_000;

  return {
    name: osintData.company_name,
    ticker: osintData.ticker ?? osintData.stock_ticker,
    stockTicker: osintData.ticker ?? osintData.stock_ticker,
    isPublic: resolvedIsPublic,
    industry: osintData.industry || "Technology",
    region: normalizeRegion(osintData.region ?? osintData.country_code),
    employeeCount: osintData.employee_count || 500,
    revenueGrowthYoY: osintData.revenue_yoy ?? null,
    stock90DayChange: osintData.stock_90d_change ?? null,
    layoffsLast24Months: resolvedLayoffs,
    layoffRounds: typeof osintData.layoff_rounds === "number" ? osintData.layoff_rounds : resolvedLayoffs.length,
    lastLayoffPercent: osintData.last_layoff_percent ?? (resolvedLayoffs.length > 0 ? resolvedLayoffs[0].percentCut : null),
    revenuePerEmployee: resolvedRevPerEmp,
    aiInvestmentSignal: osintData.ai_investment_signal ?? "medium",
    source: sourceName || "Live OSINT Database",
    lastUpdated: osintData.last_updated ?? new Date().toISOString(),
  };
}

/**
 * mapToHybridResult
 * Adapts engine ScoreResult to HybridResult with TRUTHFUL signal counts.
 * Phase 1 Fix 4: no more hardcoded liveSignalCount=5 when source is actually DB.
 */
function mapToHybridResult(
  engineResult: ScoreResult, 
  companyData: CompanyData, 
  inputs: AuditInputs,
  source: 'live' | 'db' | 'stale_db' | 'fallback',
  trueLiveSignals: number,
  trueHeuristicSignals: number,
): HybridResult {
  const dimensions = [
    { key: "L1" as const, label: "Company Health",         score: Math.round(engineResult.breakdown.L1 * 100) },
    { key: "L2" as const, label: "Layoff History",         score: Math.round(engineResult.breakdown.L2 * 100) },
    { key: "L3" as const, label: "Task Automatability",    score: Math.round(engineResult.breakdown.L3 * 100) },
    { key: "L4" as const, label: "Market Headwinds",       score: Math.round(engineResult.breakdown.L4 * 100) },
    { key: "L5" as const, label: "Experience Protection",  score: Math.round(engineResult.breakdown.L5 * 100) },
    { key: "D6" as const, label: "AI Agent Capability",    score: Math.round((engineResult.breakdown.D6 ?? 0) * 100) },
    { key: "D7" as const, label: "Company Health Risk",    score: Math.round((engineResult.breakdown.D7 ?? 0) * 100) },
  ];

  const reasoning = engineResult.recommendations.map(r => r.description).join(" ");

  return {
    ...DEFAULT_HYBRID_RESULT,
    total: engineResult.score,
    breakdown: engineResult.breakdown,
    tier: {
      label: engineResult.tier.label,
      color: engineResult.tier.color,
      advice: engineResult.tier.advice
    },
    confidence: engineResult.confidence,
    confidencePercent: engineResult.confidencePercent,
    confidenceInterval: engineResult.confidenceInterval,
    dimensions,
    reasoning,
    dataFreshness: engineResult.dataFreshness,
    signalQuality: {
      hasConflicts: engineResult.signalQuality.hasConflicts,
      conflictingSignals: engineResult.signalQuality.conflictingSignals.map(c => ({
        signalType: c.signal1,
        descriptions: [c.signal2],
        severity: (safeLower((c as any).severity, "medium") as any) || "medium",
        conflictingSources: []
      })),
      // TRUTHFUL counts — no longer hardcoded
      liveSignals: trueLiveSignals,
      heuristicSignals: trueHeuristicSignals,
      missingDataFallbacks: engineResult.signalQuality.missingDataFallbacks,
    },
    recommendations: engineResult.recommendations.map(r => ({
      id: r.id,
      title: r.title,
      description: r.description,
      priority: r.priority,
      layerFocus: r.layerFocus,
      riskReductionPct: r.riskReductionPct,
      deadline: r.deadline
    })),
    workTypeKey: inputs.oracleKey || "generic",
    industryKey: safeLower(companyData.industry, "technology").replace(/\s+/g, "_"),
    countryKey: safeLower(companyData.region, "usa") || "usa",
    experience: deriveExperienceBracket(inputs.userFactors.tenureYears),
    companyName: companyData.name,
    meta: {
      usedLiveSignals: trueLiveSignals > 0,
      liveSignalCount: trueLiveSignals,
      swarmAgentCount: 30,
      dbSource: companyData.source,
      calculationMode: source === 'live' ? "ENCORE_LIVE" : source === 'db' ? "DB_FALLBACK" : "UNKNOWN_FALLBACK",
      timestamp: engineResult.calculatedAt
    },
    _engineResult: engineResult
  };
}

function mapConsensusScoreToHybridResult(
  hybridScore: any,
  shadowEngineResult: ScoreResult,
  companyData: CompanyData,
  inputs: AuditInputs,
  source: 'live' | 'db' | 'stale_db' | 'fallback',
): HybridResult {
  const breakdownAny = hybridScore.breakdown as Record<string, number | undefined>;
  const dimensions = [
    { key: "L1" as const, label: "Company Health", score: Math.round(hybridScore.breakdown.L1 * 100) },
    { key: "L2" as const, label: "Layoff History", score: Math.round(hybridScore.breakdown.L2 * 100) },
    { key: "L3" as const, label: "Task Automatability", score: Math.round(hybridScore.breakdown.L3 * 100) },
    { key: "L4" as const, label: "Market Headwinds", score: Math.round(hybridScore.breakdown.L4 * 100) },
    { key: "L5" as const, label: "Experience Protection", score: Math.round(hybridScore.breakdown.L5 * 100) },
  ] as HybridResult["dimensions"];

  if (typeof breakdownAny.D6 === "number") {
    dimensions.push({ key: "D6", label: "AI Agent Capability", score: Math.round(breakdownAny.D6 * 100) });
  }
  if (typeof breakdownAny.D7 === "number") {
    dimensions.push({ key: "D7", label: "Company Health Risk", score: Math.round(breakdownAny.D7 * 100) });
  }

  const recommendations = (hybridScore.recommendations ?? []).map((item: any) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    priority: item.priority,
    layerFocus: item.layerFocus,
    riskReductionPct: item.riskReductionPct,
    deadline: item.deadline,
  }));

  const consensusSnapshot = hybridScore.consensusSnapshot;
  const liveSignals = hybridScore.signalQuality?.liveSignals ?? 0;

  return {
    ...DEFAULT_HYBRID_RESULT,
    total: hybridScore.score,
    breakdown: hybridScore.breakdown,
    tier: hybridScore.tier,
    confidence: hybridScore.confidence,
    confidencePercent: hybridScore.confidencePercent,
    confidenceInterval: hybridScore.confidenceInterval,
    dimensions,
    reasoning: recommendations.map((item) => item.description).join(" "),
    dataFreshness: hybridScore.dataFreshness,
    signalQuality: {
      hasConflicts: hybridScore.signalQuality?.hasConflicts ?? false,
      conflictingSignals: hybridScore.signalQuality?.conflictingSignals ?? [],
      liveSignals,
      heuristicSignals: hybridScore.signalQuality?.heuristicSignals ?? 0,
      missingDataFallbacks: hybridScore.signalQuality?.missingDataFallbacks ?? shadowEngineResult.signalQuality.missingDataFallbacks,
      degradedSignalClasses: hybridScore.signalQuality?.degradedSignalClasses ?? [],
      hardFailures: hybridScore.signalQuality?.hardFailures ?? [],
      confidenceCapsApplied: hybridScore.signalQuality?.confidenceCapsApplied ?? [],
    },
    consensusSnapshot,
    authoritativeSignals: consensusSnapshot?.authoritativeSignals,
    reconciliationSummary: consensusSnapshot?.reconciliationSummary,
    recommendations,
    workTypeKey: inputs.oracleKey || "generic",
    industryKey: safeLower(companyData.industry, "technology").replace(/\s+/g, "_"),
    countryKey: safeLower(companyData.region, "usa") || "usa",
    experience: deriveExperienceBracket(inputs.userFactors.tenureYears),
    tenureYears: inputs.userFactors.tenureYears,
    companyName: companyData.name,
    meta: {
      usedLiveSignals: liveSignals > 0,
      liveSignalCount: liveSignals,
      swarmAgentCount: 30,
      dbSource: companyData.source,
      calculationMode: source === "live" ? "CONSENSUS_HYBRID_LIVE" : source === "db" ? "CONSENSUS_HYBRID_DB" : "CONSENSUS_HYBRID_FALLBACK",
      timestamp: hybridScore.calculatedAt,
    },
    _engineResult: shadowEngineResult,
    timing: shadowEngineResult.timing,
    probabilityForecast: shadowEngineResult.probabilityForecast,
    performanceTier: shadowEngineResult.performanceTier,
    performanceCredibilityScore: shadowEngineResult.performanceCredibilityScore,
    indiaRiskEnrichment: shadowEngineResult.indiaRiskEnrichment,
  };
}

function deriveExperienceBracket(years: number): string {
  if (years < 2) return "0-2";
  if (years < 5) return "2-5";
  if (years < 10) return "5-10";
  if (years < 15) return "10-15";
  return "15+";
}

function attachAuditMetadata(
  result: HybridResult,
  companyData: CompanyData,
  inputs: AuditInputs,
  extras: {
    companyMatchConfidence: number;
    companyMatchType: "exact" | "prefix" | "contains" | "word_overlap" | "none";
    tabsUsedFallback: string[];
    engineFailures?: { engine: string; error: string }[];
  },
): HybridResult {
  const resolvedRole = resolveRoleInput(inputs.roleTitle, { oracleKey: inputs.oracleKey ?? null });
  const resolvedRoleSource =
    resolvedRole.source === "oracle_picker" || resolvedRole.source === "alias_map"
      ? resolvedRole.source
      : "manual_unresolved";

  return {
    ...result,
    meta: {
      ...result.meta,
      resolvedRoleKey: resolvedRole.canonicalKey ?? "generic",
      resolvedRoleSource,
      companyMatchConfidence: extras.companyMatchConfidence,
      companyMatchType: extras.companyMatchType,
      usedAuditPipeline: true,
    },
    evaluationSnapshot: {
      companyInput: inputs.companyName,
      companyResolved: companyData.name,
      companyMatchConfidence: extras.companyMatchConfidence,
      companyMatchType: extras.companyMatchType,
      roleInput: inputs.roleTitle,
      resolvedRoleKey: resolvedRole.canonicalKey ?? "generic",
      resolvedRoleSource,
      usedAuditPipeline: true,
      liveSignals: result.signalQuality.liveSignals,
      heuristicSignals: result.signalQuality.heuristicSignals,
      degradedSignalClasses: result.signalQuality.degradedSignalClasses ?? [],
      hardFailures: result.signalQuality.hardFailures ?? [],
      engineFailures: extras.engineFailures ?? [],
      confidencePercent: result.confidencePercent,
      tabsUsedFallback: extras.tabsUsedFallback,
    },
  };
}

/**
 * PRIMARY ENTRY POINT: fetchAuditData
 *
 * Resolution order:
 *   1. Live OSINT (Supabase Edge Function)
 *   2. Live enrichment (Alpha Vantage + NewsAPI patch onto static DB data)
 *   3. CompanyIntelligenceDB (50 companies, static baseline)
 *   4. Legacy companyDatabase (exact-match historical)
 *   5. Unknown fallback — honest ±30pt warning
 */
export async function fetchAuditData(inputs: AuditInputs): Promise<{
  result: HybridResult;
  companyData: CompanyData;
  source: 'live' | 'db' | 'stale_db' | 'fallback';
  _timer?: PipelineTimerInstance;
}> {
  // ── Input validation ─────────────────────────────────────────────────────────
  // Guard against empty/whitespace company name before committing to a full pipeline run.
  // An empty string sent to the OSINT Edge Function triggers a PostgreSQL ILIKE ''
  // which can match all rows and cause the function to return 2000+ companies.
  const trimmedCompanyName = (inputs.companyName ?? '').trim();
  if (trimmedCompanyName.length === 0) {
    // Normalize to the fallback path immediately — no OSINT call needed
    inputs = { ...inputs, companyName: 'Unknown Company' };
  } else {
    inputs = { ...inputs, companyName: trimmedCompanyName };
  }
  // Similarly normalize role title — empty role title sends blank Serper queries
  const trimmedRole = (inputs.roleTitle ?? '').trim();
  if (trimmedRole.length === 0) {
    inputs = { ...inputs, roleTitle: 'Software Engineer' }; // neutral default
  } else {
    inputs = { ...inputs, roleTitle: trimmedRole };
  }

  // ── User-input sanitization (v21.0) ─────────────────────────────────────────
  // Clamp numeric userFactors to plausible ranges so downstream engines (visa,
  // glassdoor, employee-sentiment, headcount-velocity) can assume clean input.
  // Without this, a stray -3 in visaExpiryMonths makes the visa engine emit
  // negative dependency scores and propagate NaN through the pipeline.
  if (inputs.userFactors && typeof inputs.userFactors === 'object') {
    const uf = inputs.userFactors as Record<string, any>;
    const clampInRange = (v: unknown, lo: number, hi: number): number | undefined => {
      if (typeof v !== 'number' || !Number.isFinite(v)) return undefined;
      return Math.min(hi, Math.max(lo, v));
    };
    // Cast to `any` — several of these fields live in the extended user-profile
    // schema (employeeSentiment, headcountVelocity, etc.) which isn't typed on
    // the strict UserFactors interface. They are read by `as any` in engines.
    inputs = {
      ...inputs,
      userFactors: {
        ...inputs.userFactors,
        visaExpiryMonths:          clampInRange(uf.visaExpiryMonths,         0,  120) ?? uf.visaExpiryMonths,
        greenCardStageMonths:      clampInRange(uf.greenCardStageMonths,     0,  120) ?? uf.greenCardStageMonths,
        glassdoorCEOApprovalDelta: clampInRange(uf.glassdoorCEOApprovalDelta, -100, 100) ?? uf.glassdoorCEOApprovalDelta,
        employeeSentiment:         clampInRange(uf.employeeSentiment,         0,    1) ?? uf.employeeSentiment,
        headcountVelocity:         clampInRange(uf.headcountVelocity,        -1,    1) ?? uf.headcountVelocity,
        contractorRatioPct:        clampInRange(uf.contractorRatioPct,        0,  100) ?? uf.contractorRatioPct,
        voluntaryAttritionPct:     clampInRange(uf.voluntaryAttritionPct,     0,  100) ?? uf.voluntaryAttritionPct,
      } as any,
    };
  }

  // ── Pipeline timing ─────────────────────────────────────────────────────────
  const _timer = PipelineTimer.start(inputs.companyName);
  _timer.mark('osint_start');

  // Load admin-curated layoff events from Supabase, overriding hardcoded seeds.
  // Fire-and-forget — non-fatal if Supabase is unavailable; seeded fallbacks remain.
  loadCuratedLayoffEvents().catch(() => {});

  let companyData: CompanyData | null = null;
  let dataSource: 'live' | 'db' | 'stale_db' | 'fallback' = 'db';
  let trueLiveSignals = 0;
  let trueHeuristicSignals = 0;
  let reconciledSignals: ReconciledCompanySignals | null = null;
  let companyMatchConfidence = 0;
  let companyMatchType: "exact" | "prefix" | "contains" | "word_overlap" | "none" = "none";

  // Engine-failure tracking — every intelligence-overlay engine's catch block
  // pushes here so failures surface in evaluationSnapshot.engineFailures instead
  // of being silently logged to console.warn and lost.
  const engineFailures: { engine: string; error: string }[] = [];
  const noteEngineFailure = (engine: string, e: unknown): void => {
    const error = e instanceof Error ? e.message : String(e);
    console.warn(`[AuditPipeline] ${engine} computation failed:`, e);
    engineFailures.push({ engine, error });
  };

  // EF health check (fire-and-forget, session-cached) — probes all registered
  // Edge Functions once per session. Missing EFs are added to engineFailures so
  // the dashboard can show a specific "EF not deployed" message instead of
  // silently showing heuristic values as if they were live signals.
  checkEdgeFunctionHealth(
    ['fetch-company-data', 'calculate-hybrid-risk', 'proxy-macro', 'proxy-live-signals'],
  ).then(results => {
    const warnings = getEFDegradationWarnings(results);
    engineFailures.push(...warnings);
  }).catch(() => { /* health check non-fatal */ });

  // Step 1: Try Live OSINT (Supabase Edge Function)
  try {
    const { data: fetchRes, error } = await supabase.functions.invoke("fetch-company-data", {
      body: { companyName: inputs.companyName }
    });

    if (fetchRes && !error && fetchRes.data) {
      // A 'fallback' provenance means the company isn't in company_intelligence.
      // Don't treat it as 'live' — let subsequent DB steps try before giving up.
      const isFallback = (fetchRes.source ?? '').toLowerCase().includes('fallback');
      const matchConfidence = Number(fetchRes.matchConfidence ?? 1);
      companyMatchConfidence = matchConfidence;
      companyMatchType = (fetchRes.matchType ?? "exact") as typeof companyMatchType;
      if (!isFallback && matchConfidence >= 0.7) {
        companyData = mapOsintToCompanyData(fetchRes.data, fetchRes.source);
        // Demote to 'stale_db' when the DB row is older than 7 days (Phase D)
        dataSource = fetchRes.dataFreshness?._staleDb ? 'stale_db' : 'live';
        const d = fetchRes.data;
        trueLiveSignals =
          (d.stock_90d_change        != null ? 1 : 0) +
          (d.revenue_growth_yoy      != null ? 1 : 0) +
          (d.recent_layoff_news               ? 1 : 0) +
          (d.employee_count          != null ? 1 : 0) +
          (d.revenue_per_employee    != null ? 1 : 0);
        trueHeuristicSignals = Math.max(0, 7 - trueLiveSignals);
      } else if (!isFallback && matchConfidence < 0.7) {
        console.info(
          `[AuditPipeline] fetch-company-data match rejected for scoring: confidence=${matchConfidence.toFixed(2)} type=${fetchRes.matchType ?? 'unknown'}`,
        );
      }
    }
  } catch (err) {
    console.warn("[AuditPipeline] Live OSINT failed", err);
  }

  // Step 1b: Backfill null financial signals from the code-side intelligence bridge.
  // The OSINT edge function (Supabase DB) doesn't store numeric stock/revenue values —
  // those are only available via Alpha Vantage (requires API key). When missing, use
  // proxy values computed by companyIntelligenceBridge (freeze→stock, trend→revenue).
  // This keeps financial signals populated for well-known companies even without live APIs.
  if (companyData && (companyData.stock90DayChange === null || companyData.revenueGrowthYoY === null)) {
    try {
      const bridge = resolveCompanyData(companyData.name);
      if (bridge) {
        companyData.stock90DayChange = companyData.stock90DayChange ?? bridge.stock90DayChange;
        companyData.revenueGrowthYoY = companyData.revenueGrowthYoY ?? bridge.revenueGrowthYoY;
        companyData.revenuePerEmployee = companyData.revenuePerEmployee ?? bridge.revenuePerEmployee;
      }
    } catch { /* non-fatal */ }
  }

  // Step 2: Supabase company_intelligence table (2000+ companies)
  // Use queryCompanyIntelligenceWithMatch so match confidence is captured in
  // evaluationSnapshot — previously the simplified wrapper discarded this metadata.
  if (!companyData) {
    try {
      const supabaseResult = await queryCompanyIntelligenceWithMatch(inputs.companyName);
      if (supabaseResult) {
        companyData = supabaseResult.companyData;
        dataSource = 'db';
        if (companyMatchConfidence === 0) {
          companyMatchConfidence = supabaseResult.matchConfidence;
          companyMatchType = supabaseResult.matchType as typeof companyMatchType;
        }
      }
    } catch (err) {
      console.warn('[AuditPipeline] Supabase intelligence lookup failed:', err);
    }
  }

  // Step 3: Legacy companyDatabase (18 companies) — final code-side fallback
  if (!companyData) {
    const legacy = getCompanyByName(inputs.companyName);
    if (legacy) {
      companyData = legacy;
      dataSource = 'db';
    }
  }

  // Step 4: Unknown fallback — honest ±30pt warning; capture to discovery queue
  if (!companyData) {
    companyData = createUnknownCompanyFallback(inputs.companyName);
    dataSource = 'fallback';
    // Fire-and-forget — never blocks the audit
    saveToDiscoveryQueue(
      inputs.companyName,
      companyData.industry ?? 'unknown',
      inputs.roleTitle,
    ).catch(() => {});
  }

  // Step 4b: Post-resolution financial backfill from companyIntelligenceBridge.
  // Step 1b only ran when Step 1 succeeded. When Steps 2/3 resolved the company
  // (Supabase DB or legacy DB) but stock/revenue are null, the L1 layer would
  // emit "Financial signals missing" even though the bridge has proxy values
  // (freeze score → stock proxy, revenue trend → YoY proxy) for the same key.
  // This second pass guarantees the proxies are applied regardless of source.
  // preferDb=true: at this stage all live sources are exhausted — use legacy DB too.
  if (companyData && dataSource !== 'fallback' && (companyData.stock90DayChange === null || companyData.revenueGrowthYoY === null || companyData.revenuePerEmployee === null)) {
    try {
      const bridge = resolveCompanyData(companyData.name, true);
      if (bridge) {
        companyData.stock90DayChange   = companyData.stock90DayChange   ?? bridge.stock90DayChange;
        companyData.revenueGrowthYoY   = companyData.revenueGrowthYoY   ?? bridge.revenueGrowthYoY;
        companyData.revenuePerEmployee = companyData.revenuePerEmployee ?? bridge.revenuePerEmployee;
      }
    } catch { /* non-fatal */ }
  }

  // Step 5: Always enrich with live market signals — Alpha Vantage, NewsAPI, connectors.
  // Database-level per-user quota gate: check the per_user_api_quota table before
  // calling live APIs. Each authenticated user gets 5 Alpha Vantage calls / day
  // and 10 NewsAPI calls / day (configurable in the database).
  // This prevents one power user from exhausting shared keys for all other users.
  let userAllowedLiveCalls = true;
  let userId: string | null = null;
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    userId = sessionData?.session?.user?.id ?? null;
    if (userId) {
      // Increment AV counter and check if within per-user budget (5/day default).
      // fire-and-forget the check — if it fails, allow the call (fail open for auth errors)
      const { data: allowed } = await supabase.rpc('increment_user_quota', {
        p_user_id: userId,
        p_service:  'alphavantage',
        p_budget:   25, // Alpha Vantage free tier: 25 requests/day
      });
      userAllowedLiveCalls = allowed !== false; // null/undefined = allow (RPC error = fail open)
      if (!userAllowedLiveCalls) {
        console.info('[AuditPipeline] Per-user Alpha Vantage quota exhausted for today — heuristic fallback');
        import('./apiDegradationMonitor').then(({ recordApiDegradation }) => {
          recordApiDegradation('alphavantage', 'rate_limited', 'Per-user daily budget exhausted (25/day)');
        }).catch(() => {});
      }
    }
  } catch {
    userAllowedLiveCalls = true; // quota check failed — fail open
  }

  // Live-vs-DB reconciliation is authoritative: fresh live beats stale DB,
  // conflicts are surfaced, and heuristic substitution is never silent.
  try {
    const ticker = (companyData as any).ticker ?? (companyData as any).stockTicker ?? null;
    const liveData = await fetchLiveCompanyData(
      inputs.companyName,
      userAllowedLiveCalls ? ticker : null,
      _timer,
      inputs.roleTitle,        // enables role-specific Serper/Naukri job-count signals
      companyData.industry,    // enables sector-level layoff count from layoffs.fyi
    );

    reconciledSignals = reconcileCompanySignals(companyData as CompanyData, liveData);
    companyData = reconciledSignals.active;
    trueLiveSignals = reconciledSignals.liveSignalCount;
    trueHeuristicSignals = Math.max(0, 7 - Math.min(7, reconciledSignals.informativeLiveSignalCount));
    if (reconciledSignals.summary.liveWonKeys.length > 0 || trueLiveSignals >= 2) {
      dataSource = 'live';
    }

    // Patch layoffs dataset availability onto companyData so the transparency
    // layer can distinguish a genuine clean history from source unavailability.
    const connectorResult = liveData._connectorSignals;
    if (connectorResult && connectorResult.layoffsDatasetAvailable === false) {
      (companyData as any)._layoffsDatasetUnavailable = true;
    }

    if (reconciledSignals.missingDataFallbacks.length > 0) {
      console.info('[AuditPipeline] Live data gaps:', reconciledSignals.missingDataFallbacks);
    }
  } catch (liveErr) {
    console.warn('[AuditPipeline] Live enrichment failed:', liveErr);
    if (dataSource !== 'live') {
      trueLiveSignals      = 0;
      trueHeuristicSignals = 7;
    }
  }

  // End OSINT phase — everything from here is synchronous or internal
  _timer.mark('osint_end');

  // ── Data Quality Validation + Intelligent Fallbacks ────────────────────────
  const dqReport = validateDataQuality(companyData);
  let shadowCompanyData = companyData;
  if (dqReport.missingCriticalFields.length > 0) {
    const { patched: fallbackPatched, fallbacksUsed, filledFields } = applyIntelligentFallbacks(companyData);
    if (fallbacksUsed) {
      shadowCompanyData = fallbackPatched as CompanyData;
      if (filledFields.length > 0) {
        console.info('[AuditPipeline] Applied intelligent fallbacks for shadow scoring:', filledFields.join('; '));
      }
    }
  }

  const _industryMap = getAllIndustryRisk();
  const industryData: IndustryRisk | undefined = resolveIndustryData(companyData.industry, _industryMap);

  // Shadow path: keep the legacy engine running for regression comparison and
  // to preserve auxiliary fields that the UI still consumes directly.
  const hiringPostingTrend = (companyData as any)._hiringPostingTrend as string | undefined;
  const hiringIsLive = (companyData as any)._hiringIsLive as boolean | undefined;
  const liveHiringSignal: ScoreInputs['liveHiringSignal'] =
    hiringPostingTrend && hiringPostingTrend !== 'unknown'
      ? {
          postingTrend: hiringPostingTrend as 'growing' | 'stable' | 'declining' | 'frozen',
          isLive:       !!hiringIsLive,
          estimatedOpenings: (companyData as any)._estimatedRoleOpenings ?? null,
        }
      : undefined;

  // v17.0: Pre-pass cohort classification — runs before calculateLayoffScore() so
  // the 3-cohort adaptive weights can be applied to the main score computation.
  // Uses only company data available at this point (no SEC/peer/macro yet).
  // The full-quality cohort classification runs again at step 42 for UI display.
  let preCohortWeights: CohortLayerWeights | undefined;
  try {
    const preCohortResult = classifyCohort({
      revenueGrowthYoY: shadowCompanyData.revenueGrowthYoY ?? null,
      stock90DayChange: shadowCompanyData.stock90DayChange ?? null,
      freeCashFlowMargin: null,
      aiInvestmentSignal: shadowCompanyData.aiInvestmentSignal ?? null,
      layoffRounds: shadowCompanyData.layoffRounds ?? 0,
      peerLayoffEventsLast90d: 0,
      macroRecessionSignal: 0.3,
      cashRunwayMonths: null,
      industry: shadowCompanyData.industry ?? 'technology',
      isPublic: shadowCompanyData.isPublic ?? false,
    });
    preCohortWeights = preCohortResult.recommendedLayerWeights;
  } catch (e) {
    // Pre-pass cohort failure is non-fatal; engine uses flat weights
  }

  const shadowScoreInputs: ScoreInputs = {
    companyData: shadowCompanyData,
    industryData,
    roleTitle: inputs.roleTitle,
    department: inputs.department,
    userFactors: inputs.userFactors,
    liveHiringSignal,
    cohortWeights: preCohortWeights,
  };

  _timer.mark('engine_start');
  const shadowScoreResult = calculateLayoffScore(shadowScoreInputs);
  _timer.mark('engine_end');

  const accuracyMetrics = computeAccuracyMetrics(shadowScoreResult.score, dqReport);
  (shadowScoreResult as any)._dataQuality = {
    tier: dqReport.reliabilityTier,
    completeness: dqReport.completeness,
    overallConfidence: dqReport.overallConfidence,
    expectedVariance: dqReport.expectedScoreVariance,
    missingFields: dqReport.missingCriticalFields,
    richness: accuracyMetrics.dataRichnessScore,
  };

  if (!reconciledSignals) {
    reconciledSignals = {
      active: companyData,
      signals: ((companyData as any)._authoritativeSignals ?? {}) as ReconciledCompanySignals["signals"],
      conflicts: [],
      liveSignalCount: trueLiveSignals,
      informativeLiveSignalCount: 0,
      degradedLiveSignalCount: 0,
      degradedSignalClasses: [],
      hardFailures: [],
      missingDataFallbacks: [],
      confidenceCapsApplied: [],
      summary: {
        liveWonKeys: [],
        dbWonKeys: [],
        conflictedKeys: [],
        degradedKeys: [],
      },
    };
  }

  const hybridPayload = buildHybridScorePayload({
    reconciled: reconciledSignals,
    companyData,
    industryData,
    roleTitle: inputs.roleTitle,
    department: inputs.department,
    userFactors: inputs.userFactors,
  });

  let hybridScoreResult: any | null = null;
  try {
    const { data: hybridRes, error: hybridErr } = await supabase.functions.invoke(
      "calculate-hybrid-risk",
      { body: hybridPayload },
    );
    if (!hybridErr && hybridRes?.result) {
      hybridScoreResult = hybridRes.result;
      const legacyDrift = Math.abs((hybridScoreResult.score ?? 0) - shadowScoreResult.score);
      if (legacyDrift > 12) {
        console.warn(
          `[AuditPipeline] Hybrid/legacy drift ${legacyDrift}pts for ${companyData.name}; hybrid score remains authoritative.`,
        );
      }
      hybridScoreResult.signalQuality = {
        ...hybridScoreResult.signalQuality,
        missingDataFallbacks: Array.from(
          new Set([
            ...(hybridScoreResult.signalQuality?.missingDataFallbacks ?? []),
            ...shadowScoreResult.signalQuality.missingDataFallbacks,
          ]),
        ),
      };
    } else {
      console.warn('[AuditPipeline] Hybrid scorer unavailable, falling back to legacy engine:', hybridErr?.message ?? 'unknown error');
    }
  } catch (hybridErr) {
    console.warn('[AuditPipeline] Hybrid scorer invocation failed, falling back to legacy engine:', hybridErr);
  }

  _timer.mark('map_to_hybrid_start');
  const hybridResult = hybridScoreResult
    ? mapConsensusScoreToHybridResult(hybridScoreResult, shadowScoreResult, companyData, inputs, dataSource)
    : mapToHybridResult(shadowScoreResult, companyData, inputs, dataSource, trueLiveSignals, trueHeuristicSignals);
  // Surface the LOW_DATA confidence-floor warning (set by hybridConsensusBuilder
  // when 3+ critical signals are null) onto the final HybridResult so the
  // dashboard can render the explicit "low confidence" banner.
  if (hybridPayload.consensusData.lowDataWarning) {
    hybridResult.signalQuality = {
      ...hybridResult.signalQuality,
      lowDataWarning: hybridPayload.consensusData.lowDataWarning,
    };
  }
  _timer.mark('map_to_hybrid_end');

  // ── Intelligence Upgrade v9.0: inject 4 new intelligence layers ─────────────
  // All 4 are synchronous and zero-cost (no API calls).
  // They run after the main score is locked so they can read the final breakdown.
  _timer.mark('intelligence_upgrade_start');

  const resolvedRole = resolveRoleInput(inputs.roleTitle, { oracleKey: inputs.oracleKey ?? null });

  // Use the shadow engine result's full breakdown (includes D6, D7, D8) rather than
  // hybridResult.breakdown which only carries L1-L5. The intelligence services need
  // all dimensions to compute escape paths and precision briefs accurately.
  const engineBreakdown = (shadowScoreResult.breakdown as any);
  const finalBreakdown = {
    ...hybridResult.breakdown,                    // L1–L5 from authoritative hybrid result
    D6: engineBreakdown.D6 ?? undefined,          // D6 from deterministic engine
    D7: engineBreakdown.D7 ?? undefined,          // D7 from deterministic engine
    D8: engineBreakdown.D8 ?? undefined,          // D8 — only fires for profitable AI cutters
  } as any;

  const companySize = companyData.employeeCount >= 10000 ? 'mega'
    : companyData.employeeCount >= 1000 ? 'large'
    : companyData.employeeCount >= 200 ? 'mid'
    : 'small';

  // 1. Job Market Liquidity — re-employment velocity
  try {
    const jobMarketLiquidity = computeJobMarketLiquidity({
      oracleKey: resolvedRole.canonicalKey ?? inputs.oracleKey ?? 'generic',
      industry: companyData.industry ?? 'technology',
      tenureYears: inputs.userFactors.tenureYears,
      region: companyData.region ?? 'US',
      companySize,
      isPublic: companyData.isPublic ?? false,
      riskScore: hybridResult.total,
      uniquenessDepth: (inputs.userFactors as any).uniquenessDepth,
      performanceTier: (inputs.userFactors as any).performanceTier,
    });
    (hybridResult as any).jobMarketLiquidity = jobMarketLiquidity;
  } catch (e) {
    noteEngineFailure('jobMarketLiquidity', e);
  }

  // 2. Escape Path Optimizer — top-3 risk-reduction moves
  try {
    const escapePaths = computeEscapePaths({
      currentScore: hybridResult.total,
      breakdown: finalBreakdown,
      oracleKey: resolvedRole.canonicalKey ?? inputs.oracleKey ?? 'generic',
      industry: companyData.industry ?? 'technology',
      tenureYears: inputs.userFactors.tenureYears,
      region: companyData.region ?? 'US',
      companyData,
      uniquenessDepth: (inputs.userFactors as any).uniquenessDepth,
      performanceTier: (inputs.userFactors as any).performanceTier,
    });
    (hybridResult as any).escapePaths = escapePaths;
  } catch (e) {
    noteEngineFailure('escapePathOptimizer', e);
  }

  // 3. Temporal Risk Amplifier — calendar-aware risk intelligence
  try {
    const temporalRisk = computeTemporalRisk({
      currentScore: hybridResult.total,
      companyData,
      region: companyData.region ?? 'US',
    });
    (hybridResult as any).temporalRisk = temporalRisk;
  } catch (e) {
    noteEngineFailure('temporalRiskAmplifier', e);
  }

  // 4. Precision Intelligence Brief — data-grounded 3-point analyst summary
  try {
    const precisionBrief = buildPrecisionBrief(
      companyData,
      finalBreakdown,
      hybridResult.total,
      inputs.roleTitle,
      inputs.userFactors.tenureYears,
    );
    (hybridResult as any).precisionBrief = precisionBrief;
  } catch (e) {
    noteEngineFailure('precisionBrief', e);
  }

  // ── Intelligence Upgrade v10.0: 3 new precision layers ──────────────────────

  // 5. Score Sensitivity Analysis — single-lever impact ranking
  try {
    const scoreSensitivity = computeScoreSensitivity({
      currentScore: hybridResult.total,
      breakdown: finalBreakdown,
    });
    (hybridResult as any).scoreSensitivity = scoreSensitivity;
  } catch (e) {
    noteEngineFailure('scoreSensitivity', e);
  }

  // 6. Department Risk — D9 dimension (department-level exposure)
  try {
    // Detect the scenario archetype directly from the available data rather than
    // relying on hybridResult.scenarioArchetype (which is set by the score display
    // layer, not the pipeline). detectScenario uses the same logic as the narrative
    // engine so the archetype is always accurate.
    const detectedArchetype = detectScenario(companyData, finalBreakdown, hybridResult.total);
    const companyArchetype = mapScenarioToCompanyArchetype(detectedArchetype);
    const departmentRisk = computeDepartmentRisk({
      department: inputs.department ?? '',
      companyArchetype,
      currentScore: hybridResult.total,
    });
    (hybridResult as any).departmentRisk = departmentRisk;
  } catch (e) {
    noteEngineFailure('departmentRisk', e);
  }

  // 7. Financial Runway Intelligence — runway-constrained personalized strategy
  try {
    const runwayMonths = inputs.financialRunwayMonths ?? 0;
    const financialRunway = computeFinancialRunway({
      financialRunwayMonths: runwayMonths,
      currentScore: hybridResult.total,
      escapePaths: (hybridResult as any).escapePaths,
      jobMarketLiquidity: (hybridResult as any).jobMarketLiquidity,
    });
    (hybridResult as any).financialRunway = financialRunway;
    (hybridResult as any).financialRunwayMonths = runwayMonths;
  } catch (e) {
    noteEngineFailure('financialRunway', e);
  }

  // ── Intelligence Upgrade v11.0: 7 new strategic intelligence layers ──────────
  // All 7 are synchronous and zero-cost (no API calls).
  // They run after v10.0 layers, reading the fully locked-in hybrid result + breakdown.

  // 8. Signal Contradiction Engine — trust calibration
  try {
    const hiringTrend = (companyData as any)._hiringPostingTrend ?? 'unknown';
    const hasLayoffNews = Array.isArray(companyData.layoffsLast24Months)
      ? companyData.layoffsLast24Months.length > 0
      : false;

    // Derive sector distress level from L4 score (0–1 normalized in breakdown).
    // L4 measures industry headwinds — maps directly to sector distress.
    const l4Raw = (finalBreakdown.L4 ?? 0);
    const sectorDistressLevel: "low" | "moderate" | "high" | "extreme" =
      l4Raw >= 0.80 ? "extreme"
      : l4Raw >= 0.60 ? "high"
      : l4Raw >= 0.35 ? "moderate"
      : "low";

    const signalContradictions = computeSignalContradictions({
      companyData,
      breakdown: finalBreakdown,
      currentScore: hybridResult.total,
      hiringPostingTrend: hiringTrend !== 'unknown' ? hiringTrend : undefined,
      hasLayoffNews,
      sectorDistressLevel,
      tenureYears: inputs.userFactors.tenureYears,
      oracleKey: resolvedRole.canonicalKey ?? inputs.oracleKey ?? 'generic',
      industry: companyData.industry ?? 'technology',
    });
    (hybridResult as any).signalContradictions = signalContradictions;
  } catch (e) {
    noteEngineFailure('signalContradictions', e);
  }

  // 9. Executive Movement Intelligence — leadership departure risk
  try {
    const departures = deriveExecutiveDepartures(companyData);
    const executiveMovement = computeExecutiveMovementRisk(departures);
    (hybridResult as any).executiveMovement = executiveMovement;
  } catch (e) {
    noteEngineFailure('executiveMovement', e);
  }

  // 10. Hiring Signal Analyzer — velocity pattern analysis
  try {
    const hiringInputs = deriveHiringSignalInputs(
      companyData,
      resolvedRole.canonicalKey ?? inputs.oracleKey ?? 'generic',
      inputs.department,
    );
    const hiringSignal = analyzeHiringSignals(hiringInputs);
    (hybridResult as any).hiringSignal = hiringSignal;
  } catch (e) {
    noteEngineFailure('hiringSignal', e);
  }

  // 11. Competitive Intelligence Engine — talent supply/demand
  try {
    const jobLiquidity = (hybridResult as any).jobMarketLiquidity;
    const competitiveIntelligence = computeCompetitiveIntelligence({
      oracleKey: resolvedRole.canonicalKey ?? inputs.oracleKey ?? 'generic',
      industry: companyData.industry ?? 'technology',
      region: companyData.region ?? 'US',
      tenureYears: inputs.userFactors.tenureYears,
      riskScore: hybridResult.total,
      uniquenessDepth: (inputs.userFactors as any).uniquenessDepth,
      performanceTier: (inputs.userFactors as any).performanceTier,
      hasAiSkills: (inputs.userFactors as any).hasAiSkills ?? false,
      financialRunwayMonths: inputs.financialRunwayMonths ?? 0,
      jobMarketLiquidityScore: jobLiquidity?.score,
      externalSalaryPreservationPct: jobLiquidity?.salaryPreservation,
    });
    (hybridResult as any).competitiveIntelligence = competitiveIntelligence;
  } catch (e) {
    noteEngineFailure('competitiveIntelligence', e);
  }

  // 12. Exit Timing Optimizer — optimal proactive departure calendar
  try {
    const exitTiming = computeExitTiming({
      currentScore: hybridResult.total,
      region: companyData.region ?? 'US',
      companyName: companyData.name,
      vestingSchedule: (inputs.userFactors as any).vestingSchedule,
      vestingStartMonthsAgo: (inputs.userFactors as any).vestingStartMonthsAgo,
      totalGrantValueUSD: (inputs.userFactors as any).totalGrantValueUSD,
      bonusFrequency: (inputs.userFactors as any).bonusFrequency,
      lastBonusMonthsAgo: (inputs.userFactors as any).lastBonusMonthsAgo,
      estimatedAnnualBonusUSD: (inputs.userFactors as any).estimatedAnnualBonusUSD,
      financialRunwayMonths: inputs.financialRunwayMonths ?? 0,
      tenureYears: inputs.userFactors.tenureYears,
      industry: companyData.industry ?? 'technology',
    });
    (hybridResult as any).exitTiming = exitTiming;
  } catch (e) {
    noteEngineFailure('exitTiming', e);
  }

  // 13. Career Resilience Engine — composite 5-pillar resilience
  try {
    const jobLiquidity = (hybridResult as any).jobMarketLiquidity;
    const competitive = (hybridResult as any).competitiveIntelligence;
    const escapePathCount = ((hybridResult as any).escapePaths?.paths?.length) ?? 2;
    // Use || instead of ?? because financialRunwayMonths=0 means "not provided" and
    // should default to the 6-month industry standard, not "Critical runway" tier.
    const careerResilience = computeCareerResilience({
      currentScore: hybridResult.total,
      financialRunwayMonths: inputs.financialRunwayMonths || 6,
      tenureYears: inputs.userFactors.tenureYears,
      oracleKey: resolvedRole.canonicalKey ?? inputs.oracleKey ?? 'generic',
      industry: companyData.industry ?? 'technology',
      region: companyData.region ?? 'US',
      uniquenessDepth: (inputs.userFactors as any).uniquenessDepth,
      performanceTier: (inputs.userFactors as any).performanceTier,
      hasAiSkills: (inputs.userFactors as any).hasAiSkills ?? false,
      hasAlternativeIncome: (inputs.userFactors as any).hasAlternativeIncome ?? false,
      networkStrengthSelfReport: (inputs.userFactors as any).networkStrength,
      escapePaths: escapePathCount,
      jobMarketLiquidityScore: jobLiquidity?.score,
      salaryPreservationPct: competitive?.salaryPreservationPct,
    });
    (hybridResult as any).careerResilience = careerResilience;
  } catch (e) {
    noteEngineFailure('careerResilience', e);
  }

  // 14. Layoff Survival Predictor — actuarial probability conversion
  try {
    const temporalRisk = (hybridResult as any).temporalRisk;
    const hasLayoffHistory = Array.isArray(companyData.layoffsLast24Months)
      ? companyData.layoffsLast24Months.length > 0
      : false;
    const survivalProbability = predictLayoffSurvival({
      currentScore: hybridResult.total,
      breakdown: finalBreakdown,
      industry: companyData.industry ?? 'technology',
      region: companyData.region ?? 'US',
      tenureYears: inputs.userFactors.tenureYears,
      companySize,
      isPublic: companyData.isPublic ?? false,
      temporalAmplifier: temporalRisk?.currentAmplifier,
      hasLayoffHistory,
      collapseStage: (hybridResult as any).collapseStage ?? null,
      scoringArchetype: shadowScoreResult.scoringArchetype,
      confidencePercent: hybridResult.confidencePercent,
    });
    (hybridResult as any).survivalProbability = survivalProbability;
  } catch (e) {
    noteEngineFailure('survivalProbability', e);
  }

  // ── v12.0 Intelligence Layers ──────────────────────────────────────────────

  // 15. Manager Risk Intelligence — direct manager/skip-level stability
  try {
    const uf = inputs.userFactors as any;
    if (uf.managerDepartureType && uf.managerDepartureType !== 'not_applicable') {
      const managerRisk = computeManagerRisk({
        managerDepartureType: uf.managerDepartureType ?? 'unknown',
        managerDepartureDaysAgo: uf.managerDepartureDaysAgo,
        skipLevelDepartureType: uf.skipLevelDepartureType ?? 'unknown',
        skipLevelDepartureDaysAgo: uf.skipLevelDepartureDaysAgo,
        teamReorgOccurred: uf.teamReorgOccurred ?? false,
        teamReorgDaysAgo: uf.teamReorgDaysAgo,
        newManagerHired: uf.newManagerHired ?? false,
        roleCount1on1Frequency: uf.roleCount1on1Frequency ?? 'unknown',
        currentScore: hybridResult.total,
      });
      (hybridResult as any).managerRisk = managerRisk;
    }
  } catch (e) {
    noteEngineFailure('managerRisk', e);
  }

  // 16. Score Trajectory Engine — 30/60/90-day score projection (wraps orphaned trajectoryProjection.ts)
  try {
    let scoreHistory: any[] = [];
    try { scoreHistory = getLayoffScoreHistory().slice(0, 10); } catch { /* localStorage unavailable */ }
    const scoreTrajectory = computeScoreTrajectory({
      currentScore: hybridResult.total,
      companyData,
      hybridResult,
      scoreHistory,
      temporalRisk: (hybridResult as any).temporalRisk,
      managerRisk: (hybridResult as any).managerRisk,
      hiringSignal: (hybridResult as any).hiringSignal,
    });
    (hybridResult as any).scoreTrajectory = scoreTrajectory;
  } catch (e) {
    noteEngineFailure('scoreTrajectory', e);
  }

  // 17. Visa Risk Engine — work authorization dependency modeling
  try {
    const uf = inputs.userFactors as any;
    const visaStatus = uf.visaStatus ?? 'not_applicable';
    // Only run for non-citizens with a visa status provided
    if (visaStatus !== 'not_applicable' && visaStatus !== 'citizen' && visaStatus !== 'permanent_resident') {
      const visaRisk = computeVisaRisk({
        visaStatus,
        visaExpiryMonths: uf.visaExpiryMonths,
        greenCardStageMonths: uf.greenCardStageMonths,
        hasPortabilityEligibility: uf.hasPortabilityEligibility,
        sponsoringCompany: companyData.name,
        region: companyData.region ?? 'US',
        currentScore: hybridResult.total,
      });
      (hybridResult as any).visaRisk = visaRisk;
    }
  } catch (e) {
    noteEngineFailure('visaRisk', e);
  }

  // 18. Internal Mobility Engine — intra-company transfer viability (reads departmentRisk)
  try {
    const internalMobility = computeInternalMobility({
      department: inputs.department ?? '',
      companyName: companyData.name,
      currentScore: hybridResult.total,
      breakdown: finalBreakdown,
      companySize,
      departmentRisk: (hybridResult as any).departmentRisk,
      tenureYears: inputs.userFactors.tenureYears,
      hasAiSkills: (inputs.userFactors as any).hasAiSkills ?? false,
      oracleKey: resolvedRole.canonicalKey ?? inputs.oracleKey ?? 'generic',
      industry: companyData.industry ?? 'technology',
      collapseStage: (hybridResult as any).collapseStage ?? null,
    });
    (hybridResult as any).internalMobility = internalMobility;
  } catch (e) {
    noteEngineFailure('internalMobility', e);
  }

  // 19. Role Adjacency Engine — 2-hop role transition graph
  try {
    const roleAdjacency = computeRoleAdjacency({
      oracleKey: resolvedRole.canonicalKey ?? inputs.oracleKey ?? 'generic',
      currentScore: hybridResult.total,
      breakdown: finalBreakdown,
      tenureYears: inputs.userFactors.tenureYears,
      hasAiSkills: (inputs.userFactors as any).hasAiSkills ?? false,
      financialRunwayMonths: inputs.financialRunwayMonths ?? 0,
      industry: companyData.industry ?? 'technology',
      region: companyData.region ?? 'US',
    });
    (hybridResult as any).roleAdjacency = roleAdjacency;
  } catch (e) {
    noteEngineFailure('roleAdjacency', e);
  }

  // 20. Negotiation Intelligence — current employer leverage analysis
  try {
    const compIntel = (hybridResult as any).competitiveIntelligence;
    const runway = (hybridResult as any).financialRunway;
    if (compIntel && runway) {
      const negotiationIntelligence = computeNegotiationIntelligence({
        competitiveIntelligence: compIntel,
        financialRunway: runway,
        currentScore: hybridResult.total,
        tenureYears: inputs.userFactors.tenureYears,
        performanceTier: inputs.userFactors.performanceTier ?? 'average',
        industry: companyData.industry ?? 'technology',
      });
      (hybridResult as any).negotiationIntelligence = negotiationIntelligence;
    }
  } catch (e) {
    noteEngineFailure('negotiationIntelligence', e);
  }

  // ── v13.0 Intelligence Layers ──────────────────────────────────────────────

  // 21. Macro-Economic Risk — system-level economic context
  try {
    const macroEconomicRisk = computeMacroEconomicRisk({
      industry: companyData.industry ?? 'technology',
      region: companyData.region ?? 'US',
      companySize: companyData.employeeCount ?? 1000,
      currentScore: hybridResult.total,
    });
    (hybridResult as any).macroEconomicRisk = macroEconomicRisk;
  } catch (e) {
    noteEngineFailure('macroEconomicRisk', e);
  }

  // 22. Peer Contagion — sector wave propagation model
  try {
    const peerContagion = computePeerContagion({
      companyName: companyData.name,
      industry: companyData.industry ?? 'technology',
      currentScore: hybridResult.total,
    });
    (hybridResult as any).peerContagion = peerContagion;
  } catch (e) {
    noteEngineFailure('peerContagion', e);
  }

  // 23. Emergency Response Protocol — 72-hour crisis plan (activates at score ≥ 80 or collapse stage ≥ 2)
  try {
    const uf = inputs.userFactors as any;
    const emergencyResponse = computeEmergencyResponse({
      currentScore: hybridResult.total,
      collapseStage: (hybridResult as any).collapseStage ?? null,
      tenureYears: inputs.userFactors.tenureYears ?? 3,
      industry: companyData.industry ?? 'technology',
      performanceTier: inputs.userFactors.performanceTier ?? 'average',
      visaStatus: uf.visaStatus,
      financialRunwayMonths: inputs.financialRunwayMonths ?? 0,
    });
    (hybridResult as any).emergencyResponse = emergencyResponse;
  } catch (e) {
    noteEngineFailure('emergencyResponse', e);
  }

  // 24. Career Confidence — psychological job-search readiness (5 pillars)
  try {
    const uf = inputs.userFactors as any;
    const careerConfidence = computeCareerConfidence({
      currentScore: hybridResult.total,
      tenureYears: inputs.userFactors.tenureYears ?? 3,
      financialRunwayMonths: inputs.financialRunwayMonths ?? 0,
      performanceTier: inputs.userFactors.performanceTier ?? 'average',
      hasAiSkills: uf.hasAiSkills ?? false,
      oracleKey: resolvedRole.canonicalKey ?? inputs.oracleKey ?? 'generic',
      industry: companyData.industry ?? 'technology',
      experience: hybridResult.experience ?? '5-10',
      uniquenessDepth: uf.uniquenessDepth,
      networkStrengthSelfReport: uf.networkStrengthSelfReport,
      jobMarketLiquidityScore: (hybridResult as any).jobMarketLiquidity?.reemploymentScore,
      resilienceScore: (hybridResult as any).careerResilience?.compositeScore,
    });
    (hybridResult as any).careerConfidence = careerConfidence;
  } catch (e) {
    noteEngineFailure('careerConfidence', e);
  }

  // 25. Network Leverage — professional network strength and activation
  try {
    const uf = inputs.userFactors as any;
    const networkLeverage = computeNetworkLeverage({
      tenureYears: inputs.userFactors.tenureYears ?? 3,
      experience: hybridResult.experience ?? '5-10',
      industry: companyData.industry ?? 'technology',
      oracleKey: resolvedRole.canonicalKey ?? inputs.oracleKey ?? 'generic',
      companyName: companyData.name,
      companySize: companyData.employeeCount,
      performanceTier: inputs.userFactors.performanceTier ?? 'average',
      hasAiSkills: uf.hasAiSkills ?? false,
      networkStrengthSelfReport: uf.networkStrengthSelfReport,
      currentScore: hybridResult.total,
    });
    (hybridResult as any).networkLeverage = networkLeverage;
  } catch (e) {
    noteEngineFailure('networkLeverage', e);
  }

  // 26. Offer Evaluation — optional, only when offer data provided via userFactors
  // Skipped in pipeline; activated on-demand via StrategyTab modal (zero pipeline cost)

  // 27. Strategy Synthesis — master cross-layer plan (reads all prior layers)
  try {
    const uf = inputs.userFactors as any;
    const scoreTrajectory = (hybridResult as any).scoreTrajectory;
    const strategySynthesis = computeStrategySynthesis({
      currentScore: hybridResult.total,
      collapseStage: (hybridResult as any).collapseStage ?? null,
      tenureYears: inputs.userFactors.tenureYears ?? 3,
      financialRunwayMonths: inputs.financialRunwayMonths ?? 0,
      performanceTier: inputs.userFactors.performanceTier ?? 'average',
      industry: companyData.industry ?? 'technology',
      experience: hybridResult.experience ?? '5-10',
      hasAiSkills: uf.hasAiSkills ?? false,
      companyName: companyData.name,
      careerConfidence: (hybridResult as any).careerConfidence,
      networkLeverage: (hybridResult as any).networkLeverage,
      macroRisk: (hybridResult as any).macroEconomicRisk,
      peerContagion: (hybridResult as any).peerContagion,
      emergencyProtocol: (hybridResult as any).emergencyResponse,
      scoreVelocityPtsPerMonth: scoreTrajectory?.velocityPtsPerMonth,
      resilienceScore: (hybridResult as any).careerResilience?.compositeScore,
      jobMarketLiquidityScore: (hybridResult as any).jobMarketLiquidity?.reemploymentScore,
    });
    (hybridResult as any).strategySynthesis = strategySynthesis;
  } catch (e) {
    noteEngineFailure('strategySynthesis', e);
  }

  // 28. Model Calibration — engine accuracy and trust metrics (async, non-blocking)
  // Fire-and-forget: does not block the pipeline return; UI reads when available
  computeModelCalibration('v13.0').then(calibration => {
    (hybridResult as any).modelCalibration = calibration;
  }).catch(e => {
    noteEngineFailure('modelCalibration', e);
  });

  // ── v14.0 Intelligence Layers (29–38 + segmented calibration + Bayesian CI) ──────────────

  const uf14 = inputs.userFactors;
  const hiringSignalResult = (hybridResult as any).hiringSignal;

  // 29. Compensation Risk — pay position vs. market + cascade stage
  try {
    const compensationRisk = computeCompensationRisk({
      workTypeKey: resolvedRole.canonicalKey ?? inputs.oracleKey ?? 'sw_backend',
      experience: hybridResult.experience ?? '5-10',
      region: companyData.region ?? 'US',
      userSalary: uf14.userSalary,
      hiringFreezeScore: hiringSignalResult?.freezeScore,
      hasContractorCuts: uf14.hasContractorCuts ?? false,
      hasPayFreeze: uf14.hasPayFreeze ?? false,
      hasPayCut: uf14.hasPayCut ?? false,
      vestingMonthsRemaining: uf14.vestingMonthsRemaining,
      equityType: uf14.equityType,
    });
    (hybridResult as any).compensationRisk = compensationRisk;
  } catch (e) {
    noteEngineFailure('compensationRisk', e);
  }

  // 30. Skill Portfolio Fit — skill-level market compatibility
  try {
    const skillPortfolioFit = computeSkillPortfolioFit({
      userSkills: uf14.userSkills ?? [],
      workTypeKey: resolvedRole.canonicalKey ?? inputs.oracleKey ?? 'sw_backend',
      experience: hybridResult.experience ?? '5-10',
      roleD1Score: hybridResult.breakdown?.L3 ? hybridResult.breakdown.L3 * 100 : 50,
    });
    (hybridResult as any).skillPortfolioFit = skillPortfolioFit;
  } catch (e) {
    noteEngineFailure('skillPortfolioFit', e);
  }

  // 31. M&A Risk — merger/acquisition integration risk
  try {
    const maRisk = computeMARisk({
      maEventType: uf14.maEventType ?? 'NONE',
      monthsPostClose: uf14.maMonthsPostClose,
      isAcquiredEmployee: uf14.isAcquiredEmployee ?? true,
      roleType: resolvedRole.canonicalKey ?? '_default',
      companyName: inputs.companyName,
    });
    (hybridResult as any).maRisk = maRisk;
  } catch (e) {
    noteEngineFailure('maRisk', e);
  }

  // 32. Funding Stage Risk — funding lifecycle risk model
  try {
    const fundingStageRisk = computeFundingStageRisk({
      fundingStage: uf14.fundingStage ?? (companyData.isPublic ? 'PUBLIC' : 'UNKNOWN'),
      monthsSinceLastRaise: uf14.monthsSinceLastRaise,
      revenueGrowthYoY: companyData.revenueGrowthYoY,
      hasHiringFreeze: (hiringSignalResult?.freezeScore ?? 0) >= 0.6,
      hasBridgeRound: uf14.hasBridgeRound ?? false,
    });
    (hybridResult as any).fundingStageRisk = fundingStageRisk;
  } catch (e) {
    noteEngineFailure('fundingStageRisk', e);
  }

  // 33. Leadership Transition Risk — CEO/CFO/VP departure model
  try {
    const leadershipTransitionRisk = computeLeadershipTransitionRisk({
      ceoTenureMonths: uf14.ceoTenureMonths ?? null,
      cfoSignal: uf14.cfoSignal ?? 'UNKNOWN',
      vpDepartures60Days: uf14.vpDepartures60Days ?? null,
      hasActivistInvestor: uf14.hasActivistInvestor ?? false,
      isFounderLed: uf14.isFounderLed ?? false,
      founderDeparted: uf14.founderDeparted ?? false,
    });
    (hybridResult as any).leadershipTransitionRisk = leadershipTransitionRisk;
  } catch (e) {
    noteEngineFailure('leadershipTransitionRisk', e);
  }

  // 34. Employee Sentiment — Glassdoor/Blind early warning
  try {
    const employeeSentiment = computeEmployeeSentiment({
      glassdoorCEOApprovalCurrent: uf14.glassdoorCEOApproval ?? null,
      glassdoorCEOApprovalDelta90Days: uf14.glassdoorCEOApprovalDelta ?? null,
      glassdoorCultureScore: uf14.glassdoorCultureScore ?? null,
      glassdoorCultureScoreDelta: uf14.glassdoorCultureDelta ?? null,
      annualizedVoluntaryAttritionPct: uf14.voluntaryAttritionPct ?? null,
      blindSentiment: uf14.blindSentiment ?? null,
    });
    (hybridResult as any).employeeSentiment = employeeSentiment;
  } catch (e) {
    noteEngineFailure('employeeSentiment', e);
  }

  // 35. Geographic Optionality — location-based escape path analysis
  try {
    const geographicOptionality = computeGeographicOptionality({
      city: uf14.city ?? '',
      region: companyData.region ?? inputs.country ?? 'US',
      remoteEligibility: uf14.remoteEligibility ?? 'UNKNOWN',
      workTypeKey: resolvedRole.canonicalKey ?? '_default',
      financialRunwayMonths: inputs.financialRunwayMonths ?? null,
    });
    (hybridResult as any).geographicOptionality = geographicOptionality;
  } catch (e) {
    noteEngineFailure('geographicOptionality', e);
  }

  // 36. Headcount Velocity — contractor/FTE ratio and posting trends
  try {
    const headcountVelocity = computeHeadcountVelocity({
      headcountChange6MonthPct: uf14.headcountChange6MonthPct ?? null,
      contractorRatioPct: uf14.contractorRatioPct ?? null,
      contractorTrend: uf14.contractorTrend ?? 'UNKNOWN',
      jobPostingCurrentMonth: uf14.jobPostingCurrentMonth
        ?? hiringSignalResult?.estimatedOpenings ?? null,
      jobPostingLastMonth: uf14.jobPostingLastMonth ?? null,
      hiringRateAnnualized: uf14.hiringRateAnnualized ?? null,
      voluntaryAttritionPct: uf14.voluntaryAttritionPct ?? null,
    });
    (hybridResult as any).headcountVelocity = headcountVelocity;
  } catch (e) {
    noteEngineFailure('headcountVelocity', e);
  }

  // 37. Tech Stack Obsolescence — tech lifecycle risk
  try {
    const techStackObsolescence = computeTechStackObsolescence({
      primaryTechStack: uf14.userSkills ?? [],
      companyMigrationPhase: uf14.companyMigrationPhase ?? 'NOT_MIGRATING',
      companyMainTech: uf14.companyMainTech ?? [],
    });
    (hybridResult as any).techStackObsolescence = techStackObsolescence;
  } catch (e) {
    noteEngineFailure('techStackObsolescence', e);
  }

  // 38. Career Velocity — trajectory momentum analysis
  try {
    const careerVelocity = computeCareerVelocity({
      experience: hybridResult.experience ?? '5-10',
      roleTitle: inputs.roleTitle,
      yearsSinceLastPromotion: uf14.yearsSinceLastPromotion ?? null,
      monthsInCurrentRole: uf14.monthsInCurrentRole
        ?? (inputs.userFactors.tenureYears ? inputs.userFactors.tenureYears * 12 : null),
      compensationGrowthYoY: uf14.compensationGrowthYoY ?? null,
      crossTeamProjects: uf14.crossTeamProjects ?? 0,
      hasPublicSpeaking: uf14.hasPublicSpeaking ?? false,
      hasDirectReports: uf14.hasDirectReports ?? 0,
    });
    (hybridResult as any).careerVelocity = careerVelocity;
  } catch (e) {
    noteEngineFailure('careerVelocity', e);
  }

  // Segmented Calibration — per-segment score adjustment
  try {
    const segmentCalibration = computeSegmentCalibration({
      baseScore: hybridResult.total,
      employeeCount: companyData.employeeCount,
      industryKey: companyData.industry ?? hybridResult.industryKey ?? 'it_software',
      region: companyData.region ?? 'US',
      workTypeKey: resolvedRole.canonicalKey ?? '_default',
    });
    (hybridResult as any).segmentCalibration = segmentCalibration;
  } catch (e) {
    noteEngineFailure('segmentCalibration', e);
  }

  // Bayesian Credible Interval — proper uncertainty quantification
  try {
    const dqTier = deriveDataQualityTier(
      (hybridResult as any).dataQualityReport?.reliabilityTier,
      hybridResult.confidencePercent,
    );
    const bayesianCI = computeBayesianCI(hybridResult.total, dqTier);
    (hybridResult as any).bayesianCI = bayesianCI;
    // Update confidence interval with Bayesian values if they are tighter/more accurate
    if (bayesianCI && hybridResult.confidenceInterval) {
      hybridResult.confidenceInterval = {
        low: bayesianCI.ci80_low,
        high: bayesianCI.ci80_high,
        range: bayesianCI.ci80_high - bayesianCI.ci80_low,
        isEstimate: dqTier !== 'A',
      };
    }
  } catch (e) {
    noteEngineFailure('bayesianCI', e);
  }

  // ── v16.0 Intelligence Layers ──────────────────────────────────────────────
  // Step ordering: WARN→BLS→SEC→CohortClassifier(reads SEC FCF)→Glassdoor→
  //               ExecutivePattern→RoleMarketDemand→UserFinancialRunway

  // DB Pre-pass: query the v16 signal tables so steps 39/43/44 have real data.
  // Previously these tables existed (created in v16 migration) but the pipeline
  // always read from userFactors.uf16.* which was never populated, so warnFilings,
  // glassdoorHistory, and executiveDepartures were always [] for every audit.
  let _v16WarnFilings: any[] = (inputs.userFactors as any).warnFilings ?? [];
  let _v16GlassdoorHistory: any[] = (inputs.userFactors as any).glassdoorHistory ?? [];
  let _v16ExecutiveDepartures: any[] = (inputs.userFactors as any).executiveDepartures ?? [];

  try {
    const companyNameLower = companyData.name.toLowerCase();
    const [warnRes, glassdoorRes, execRes] = await Promise.allSettled([
      supabase
        .from('warn_filings')
        .select('*')
        .ilike('company_name', `%${companyData.name}%`)
        .eq('is_confirmed', true)
        .order('filed_date', { ascending: false })
        .limit(10),
      supabase
        .from('glassdoor_velocity_history')
        .select('*')
        .ilike('company_name', `%${companyData.name}%`)
        .order('snapshot_month', { ascending: false })
        .limit(6),
      supabase
        .from('executive_departure_log')
        .select('*')
        .ilike('company_name', `%${companyData.name}%`)
        .order('departure_date', { ascending: false })
        .limit(20),
    ]);

    if (warnRes.status === 'fulfilled' && warnRes.value.data?.length) {
      _v16WarnFilings = warnRes.value.data;
    }
    if (glassdoorRes.status === 'fulfilled' && glassdoorRes.value.data?.length) {
      _v16GlassdoorHistory = glassdoorRes.value.data;
    }
    if (execRes.status === 'fulfilled' && execRes.value.data?.length) {
      _v16ExecutiveDepartures = execRes.value.data;
    }
  } catch (e) {
    // Non-fatal: v16 layers fall back to userFactors values (or []) on DB failure
    console.warn('[AuditPipeline] v16 DB pre-pass failed:', e);
  }

  // 39. WARN Act Signal — ground-truth confirmed layoff signal (US states, 60-day advance)
  // warnFilings now populated from warn_filings DB table via pre-pass above.
  try {
    const warnFilings = _v16WarnFilings;
    const warnSignal = computeWARNSignal(companyData.name, warnFilings);
    (hybridResult as any).warnSignal = warnSignal;
    // Ground-truth override flag: downstream components treat WARN as confirmed, not predicted
    if (warnSignal.hasActiveWARN && warnSignal.warnRiskScore >= 78) {
      (hybridResult as any).warnGroundTruthOverride = true;
    }
  } catch (e) {
    noteEngineFailure('warnSignal', e);
  }

  // 40. BLS JOLTS + FRED Macro Signal — sector-level leading indicators
  // Quits rate fall (-10% YoY) precedes sector layoffs 60-90 days.
  // v21.0: fetch live JOLTS/FRED from proxy-macro Edge Function; fall back to
  // user-supplied snapshots, then to May 2026 calibrated baselines.
  try {
    const uf16 = inputs.userFactors as any;
    const live = await fetchLiveMacroSnapshot();
    const blsMacroSignal = computeMacroSignal(
      companyData.industry ?? 'technology',
      live?.joltsSnapshot ?? uf16.joltsSnapshot ?? null,
      live?.fredSnapshot  ?? uf16.fredSnapshot  ?? null,
    );
    (hybridResult as any).blsMacroSignal = blsMacroSignal;
  } catch (e) {
    noteEngineFailure('blsMacroSignal', e);
  }

  // 41. SEC Enhanced Signals — FCF margin, earnings surprise, analyst consensus
  // MUST run before step 42 (cohortClassifier reads FCF from this result).
  try {
    const uf16 = inputs.userFactors as any;
    const secEnhancedSignals = computeSECEnhancedRisk({
      revenueGrowthYoY: companyData.revenueGrowthYoY ?? null,
      stock90DayChange: companyData.stock90DayChange ?? null,
      freeCashFlowMargin: uf16.freeCashFlowMargin ?? null,
      operatingMarginYoY: uf16.operatingMarginYoY ?? null,
      earningsSurpriseCategory: uf16.earningsSurpriseCategory ?? null,
      earningsSurpriseMagnitude: uf16.earningsSurpriseMagnitude ?? null,
      analystConsensusRating: uf16.analystConsensusRating ?? null,
      priceTargetChangePct: uf16.priceTargetChangePct ?? null,
      analystCount: uf16.analystCount ?? null,
      debtToEquityRatio: uf16.debtToEquityRatio ?? null,
      cashReservesMonths: uf16.cashReservesMonths ?? null,
    });
    (hybridResult as any).secEnhancedSignals = secEnhancedSignals;
  } catch (e) {
    noteEngineFailure('secEnhancedSignals', e);
  }

  // 42. Cohort Classifier — three-cohort model (Distress / Efficiency / Wave)
  // Reads secEnhancedSignals (FCF), peerContagion (peer events), macroEconomicRisk.
  // MUST run after steps 39-41 and the v13 macro/peer layers.
  try {
    const peerContagionResult = (hybridResult as any).peerContagion;
    const macroRiskResult = (hybridResult as any).macroEconomicRisk;
    const secSigs = (hybridResult as any).secEnhancedSignals;
    const cohortClassification = classifyCohort({
      revenueGrowthYoY: companyData.revenueGrowthYoY ?? null,
      stock90DayChange: companyData.stock90DayChange ?? null,
      freeCashFlowMargin: secSigs?.financialSignals?.freeCashFlowMargin ?? null,
      aiInvestmentSignal: companyData.aiInvestmentSignal ?? null,
      layoffRounds: companyData.layoffRounds ?? 0,
      peerLayoffEventsLast90d: peerContagionResult?.activePeerLayoffs ?? 0,
      macroRecessionSignal: macroRiskResult?.macroRiskScore != null
        ? macroRiskResult.macroRiskScore / 100
        : 0.3,
      cashRunwayMonths: null,
      industry: companyData.industry ?? 'technology',
      isPublic: companyData.isPublic ?? false,
    });
    (hybridResult as any).cohortClassification = cohortClassification;
  } catch (e) {
    noteEngineFailure('cohortClassifier', e);
  }

  // 43. Glassdoor Velocity — CEO approval rate of change + review volume spike
  // Uses DB pre-pass results (_v16GlassdoorHistory) populated above.
  try {
    const glassdoorVelocity = computeGlassdoorVelocity(_v16GlassdoorHistory);
    (hybridResult as any).glassdoorVelocity = glassdoorVelocity;
  } catch (e) {
    noteEngineFailure('glassdoorVelocity', e);
  }

  // 44. Executive Departure Pattern — departure destination + replacement archetype
  // Uses DB pre-pass results (_v16ExecutiveDepartures) populated above.
  try {
    const executiveDepartures = _v16ExecutiveDepartures;
    if (executiveDepartures.length > 0) {
      const executiveDeparturePattern = computeExecutiveDeparturePattern(
        executiveDepartures,
        hybridResult.total,
      );
      (hybridResult as any).executiveDeparturePattern = executiveDeparturePattern;
    }
  } catch (e) {
    noteEngineFailure('executiveDeparturePattern', e);
  }

  // 45. Role Market Demand — quarterly demand index for this role + metro area
  try {
    const uf16 = inputs.userFactors as any;
    const workTypeKey = resolvedRole.canonicalKey ?? inputs.oracleKey ?? 'sw_backend';
    const metro: string | undefined = (uf16.metroArea ?? (uf14 as any).city) || undefined;
    const roleMarketDemand = computeMarketDemandReport(workTypeKey, metro);
    (hybridResult as any).roleMarketDemand = roleMarketDemand;
  } catch (e) {
    noteEngineFailure('roleMarketDemand', e);
  }

  // 46. User Financial Runway — personal financial situation assessment
  // Drives actionUrgencyMultiplier: 1.5× (critical) → 0.7× (secure).
  try {
    const uf16 = inputs.userFactors as any;
    const userFinancialRunway = assessFinancialRunway({
      savingsMonthsRunway: uf16.savingsMonthsRunway ?? null,
      monthlySalaryUsd: uf16.monthlySalaryUsd ?? null,
      monthlyExpensesUsd: uf16.monthlyExpensesUsd ?? null,
      hasEquityVesting: uf16.hasEquityVesting ?? false,
      equityVestMonths: uf16.equityVestMonths ?? null,
      hasDependents: uf16.hasDependents ?? false,
      dualIncomeHousehold: uf16.dualIncomeHousehold ?? false,
      priorLayoffSurvived: uf16.priorLayoffSurvived ?? false,
    });
    (hybridResult as any).userFinancialRunway = userFinancialRunway;
  } catch (e) {
    noteEngineFailure('userFinancialRunway', e);
  }

  // ── v17.0 Intelligence Layers (47–52) ────────────────────────────────────────

  // 47. Prediction Horizon — separate 30d/90d/180d risk models with horizon-appropriate weights
  try {
    const warnSig = (hybridResult as any).warnSignal;
    const trajectoryRes = (hybridResult as any).scoreTrajectory;
    const temporalRes = (hybridResult as any).temporalRisk;
    const predictionHorizon = computePredictionHorizon({
      currentScore: hybridResult.total,
      breakdown: {
        L1: (hybridResult.breakdown as any)?.L1 ?? 0,
        L2: (hybridResult.breakdown as any)?.L2 ?? 0,
        L3: (hybridResult.breakdown as any)?.L3 ?? 0,
        L4: (hybridResult.breakdown as any)?.L4 ?? 0,
        L5: (hybridResult.breakdown as any)?.L5 ?? 0,
      },
      warnSignalActive: warnSig?.hasActiveWARN ?? false,
      warnDaysUntilEffective: warnSig?.daysUntilEffective ?? undefined,
      velocityPtsPerMonth: trajectoryRes?.velocityPtsPerMonth ?? 0,
      calendarAmplifier: temporalRes?.calendarAmplifier ?? 1.0,
      overallConfidence: hybridResult.confidencePercent ?? 70,
    });
    (hybridResult as any).predictionHorizon = predictionHorizon;
  } catch (e) {
    noteEngineFailure('predictionHorizon', e);
  }

  // 48. Skill Gap Intelligence — selfRatedSkills × roleMarketDemand → gap analysis
  try {
    const uf17 = inputs.userFactors as any;
    const roleMarketDemandResult = (hybridResult as any).roleMarketDemand;
    if (roleMarketDemandResult && (uf17.selfRatedSkills?.length || uf17.targetSkills?.length)) {
      const skillGapIntelligence = computeSkillGapIntelligence({
        selfRatedSkills: uf17.selfRatedSkills ?? [],
        targetSkills: uf17.targetSkills ?? [],
        roleMarketDemand: roleMarketDemandResult,
        workTypeKey: resolvedRole.canonicalKey ?? 'sw_backend',
        experience: deriveExperienceBracket(inputs.userFactors.tenureYears),
      });
      (hybridResult as any).skillGapIntelligence = skillGapIntelligence;
    }
  } catch (e) {
    noteEngineFailure('skillGapIntelligence', e);
  }

  // 49. Personalized Timeline — financial runway × risk trajectory → criticalByDate
  try {
    const uf17 = inputs.userFactors as any;
    const userRunway = (hybridResult as any).userFinancialRunway;
    const trajectoryRes = (hybridResult as any).scoreTrajectory;
    const roleMarketDemandResult = (hybridResult as any).roleMarketDemand;
    const warnSig = (hybridResult as any).warnSignal;
    const personalizedTimeline = computePersonalizedTimeline({
      currentScore: hybridResult.total,
      runwayMonths: userRunway?.runwayMonths ?? uf17.savingsMonthsRunway ?? null,
      runwaySituation: userRunway?.situation ?? null,
      jobSearchRunwayWeeks: roleMarketDemandResult?.jobSearchRunwayWeeks ?? 12,
      velocityPtsPerMonth: trajectoryRes?.velocityPtsPerMonth ?? 0,
      warnEffectiveDate: warnSig?.effectiveDate ?? null,
    });
    (hybridResult as any).personalizedTimeline = personalizedTimeline;
  } catch (e) {
    noteEngineFailure('personalizedTimeline', e);
  }

  // 50. Scenario Plan — bear/base/bull macro scenarios over 6 months
  try {
    const macroSig = (hybridResult as any).blsMacroSignal;
    const peerContagionResult = (hybridResult as any).peerContagion;
    const cohortResult = (hybridResult as any).cohortClassification;
    const trajectoryRes = (hybridResult as any).scoreTrajectory;
    const secSigs = (hybridResult as any).secEnhancedSignals;
    const scenarioPlan = computeScenarioPlan({
      currentScore: hybridResult.total,
      macroRiskTier: macroSig?.riskTier ?? null,
      contagionProbability: peerContagionResult?.contagionProbability ?? null,
      primaryCohort: cohortResult?.primaryCohort ?? null,
      velocityPtsPerMonth: trajectoryRes?.velocityPtsPerMonth ?? 0,
      freeCashFlowMargin: secSigs?.financialSignals?.freeCashFlowMargin ?? null,
      revenueGrowthYoY: companyData.revenueGrowthYoY ?? null,
    });
    (hybridResult as any).scenarioPlan = scenarioPlan;
  } catch (e) {
    noteEngineFailure('scenarioPlan', e);
  }

  // 51. Offer Evaluation — pre-computes when pendingOfferData is pre-supplied in userFactors
  try {
    const uf17 = inputs.userFactors as any;
    if (uf17.pendingOfferData) {
      const offerEvaluation = evaluateJobOffer({
        ...uf17.pendingOfferData,
        currentScore: hybridResult.total,
        currentIndustry: companyData.industry ?? 'technology',
      });
      (hybridResult as any).offerEvaluation = offerEvaluation;
    }
  } catch (e) {
    console.warn('[AuditPipeline] offerEvaluation (pipeline pre-compute) failed:', e);
  }

  // 52. Intelligence Brief — AI-generated strategic brief via llm-analyze (async, cached 24h)
  fetchIntelligenceBrief(
    companyData.name,
    inputs.roleTitle,
    hybridResult as unknown as Record<string, unknown>,
    userId,
  ).then((brief) => {
    if (brief) (hybridResult as any).intelligenceBrief = brief;
  }).catch((e) => {
    console.warn('[AuditPipeline] intelligenceBrief fetch failed:', e);
  });

  // 53. Career Contingency Plan — 3-path STAY/NEGOTIATE/TRANSITION decision framework
  try {
    const uf17 = inputs.userFactors as any;
    const careerContingencyPlan = computeCareerContingencyPlan({
      currentScore: hybridResult.total,
      userFinancialRunway: (hybridResult as any).userFinancialRunway ?? null,
      financialRunwayMonths: uf17.savingsMonthsRunway ?? null,
      careerResilience: (hybridResult as any).careerResilience ?? null,
      negotiationIntelligence: (hybridResult as any).negotiationIntelligence ?? null,
      exitTiming: (hybridResult as any).exitTiming ?? null,
      jobMarketLiquidity: (hybridResult as any).jobMarketLiquidity ?? null,
      roleMarketDemand: (hybridResult as any).roleMarketDemand ?? null,
      scenarioPlan: (hybridResult as any).scenarioPlan ?? null,
      visaRisk: (hybridResult as any).visaRisk ?? null,
      primaryCohort: (hybridResult as any).cohortClassification?.primaryCohort ?? null,
      careerGoal: hybridResult.careerGoal ?? null,
      collapseStage: hybridResult.collapseStage ?? null,
      networkSize: hybridResult.networkSize ?? null,
      priorJobChanges: uf17.priorJobChanges ?? null,
      hasEquityVesting: uf17.hasEquityVesting ?? null,
      equityVestMonths: uf17.equityVestMonths ?? null,
    });
    (hybridResult as any).careerContingencyPlan = careerContingencyPlan;
  } catch (e) {
    noteEngineFailure('careerContingencyPlan', e);
  }

  // 54. Preparedness Score — 5-pillar career layoff-readiness meta-score
  try {
    const uf17 = inputs.userFactors as any;
    const preparednessScore = computePreparednessScore({
      financialRunwayMonths: uf17.savingsMonthsRunway ?? null,
      userFinancialRunway: (hybridResult as any).userFinancialRunway ?? null,
      networkSize: hybridResult.networkSize ?? null,
      networkLeverage: (hybridResult as any).networkLeverage ?? null,
      careerResilience: (hybridResult as any).careerResilience ?? null,
      skillPortfolioFit: (hybridResult as any).skillPortfolioFit ?? null,
      skillGapIntelligence: (hybridResult as any).skillGapIntelligence ?? null,
      careerGoal: hybridResult.careerGoal ?? null,
      priorJobChanges: uf17.priorJobChanges ?? null,
      priorLayoffSurvived: uf17.priorLayoffSurvived ?? null,
      jobMarketLiquidity: (hybridResult as any).jobMarketLiquidity ?? null,
      careerVelocity: (hybridResult as any).careerVelocity ?? null,
    });
    (hybridResult as any).preparednessScore = preparednessScore;
  } catch (e) {
    noteEngineFailure('preparednessScore', e);
  }

  _timer.mark('intelligence_upgrade_end');

  const tabsUsedFallback = [
    companyData.source?.toLowerCase().includes("fallback") ? "company_profile" : null,
    (resolvedRole.canonicalKey ? null : "career_skills"),
  ].filter((value): value is string => Boolean(value));

  return {
    result: attachAuditMetadata(hybridResult, companyData, inputs, {
      companyMatchConfidence,
      companyMatchType,
      tabsUsedFallback,
      engineFailures,
    }),
    companyData,
    source: dataSource,
    _timer,
  };
}
