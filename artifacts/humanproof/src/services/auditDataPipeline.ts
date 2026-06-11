// auditDataPipeline.ts
// Hierarchical data retrieval and normalization for Layoff Audit dashboards.
// Phase 1 Fix 4: liveSignalCount is now truthful (was hardcoded 5 even when source was DB).
// Phase 2: Integrates fetchLiveCompanyData for Yahoo Finance + RSS news enrichment.

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
import { applyScrapingEnrichment } from "./scrapingOrchestrator";
import { buildHybridScorePayload } from "./hybridConsensusBuilder";
// v40.0 Task 5.5: IndexedDB offline audit cache
import { cacheLastAuditResult, getLastAuditResult } from "./pwaService";
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
import { computeParentPropagation } from "./parentSubsidiaryPropagation";
import { buildPrecisionBrief, detectScenario } from "./scenarioNarrativeEngine";
import { computeFinancialRunway } from "./financialRunwayIntelligence";
import { resolveGratuityCountryFromVisa } from "../data/endOfServiceGratuity";
import { computeDepartmentRisk, mapScenarioToCompanyArchetype } from "./departmentRiskEngine";
import { computeScoreSensitivity } from "./scoreSensitivityEngine";
// v11.0 intelligence layers
import { computeSignalContradictions } from "./signalContradictionEngine";
import { computeExecutiveMovementRisk, deriveExecutiveDepartures } from "./executiveMovementEngine";
import { analyzeHiringSignals, deriveHiringSignalInputs } from "./hiringSignalAnalyzer";
import {
  detectPrivateCompanyRegime,
} from "./companyEntityResolver";
import {
  quorumSpecForRegime,
  quorumCeilingForRegime,
  marketSegmentForRegime,
} from "./liveQuorumSpec";
import { computeCompetitiveIntelligence } from "./competitiveIntelligenceEngine";
import { computeExitTiming } from "./exitTimingOptimizer";
import { computeCareerResilience, type ResilienceInputs } from "./careerResilienceEngine";
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
import { computeRoleIndustryComposite, deriveRoleCategory } from "../data/roleIndustryRiskMatrix";
import { getSeniorityFamilyForRole, getSeniorityThresholds } from "../data/roleSeniorityBenchmarks";
// WS3 — Live peer contagion adapter. Internally falls through to
// `computePeerContagion` when the ws3_peer_contagion_live flag is off,
// so unconditional use here is safe.
import { computePeerContagionLive } from "./peerContagionLiveAdapter";
import { computeEmergencyResponse } from "./emergencyResponseProtocol";
import { computeCareerConfidence } from "./careerConfidenceEngine";
import { computeNetworkLeverage } from "./networkLeverageEngine";
import { computeStrategySynthesis, generateCareerDecision } from "./strategySynthesisEngine";
import { getRolePrefix as getStrategyRoleFamily } from "./careerInsuranceEngine";
import { computeModelCalibration } from "./modelCalibrationEngine";
// v14.0 intelligence layers (29–38 + calibration)
import { computeCompensationRisk } from "./compensationRiskEngine";
import { convertToUsd } from "./currencyService";
import { computeSkillPortfolioFit } from "./skillPortfolioFitEngine";
import { computeMARisk } from "./mergerAcquisitionRiskEngine";
import { computeFundingStageRisk } from "./fundingStageRiskEngine";
import { computeLeadershipTransitionRisk } from "./leadershipTransitionRiskEngine";
import { computeEmployeeSentiment } from "./employeeSentimentEngine";
import { computeGeographicOptionality } from "./geographicOptionalityEngine";
import { computeHeadcountVelocity } from "./headcountVelocityEngine";
import { computeAutomationRisk } from "./automationRiskTimelineEngine";
import { computeCareerTransition } from "./careerTransitionIntelligenceEngine";
import { computeCareerVelocity } from "./careerVelocityEngine";
import { computeSegmentCalibration } from "./segmentedCalibrationEngine";
import { computeBayesianCI, deriveDataQualityTier } from "./empiricalCalibration";
// v16.0 intelligence layers (39–46 + enhanced data architecture)
import { classifyCohort, CohortLayerWeights, CohortWeights } from "./cohortClassifier";
import { computeWARNSignal } from "./warnActService";
import { computeMacroSignal, fetchLiveMacroSnapshot } from "./blsMacroService";
import { computeSECEnhancedRisk } from "./secEnhancedService";
import { computeGlassdoorVelocity } from "./glassdoorVelocityEngine";
// WS7 — Consolidated workforce velocity. Falls through to passthrough
// (both legacy sub-results, no unified verdict) when ws7_layer_consolidation
// flag is off, so calling it unconditionally is safe.
import { computeWorkforceVelocity } from "./workforceVelocityEngine";
import { computeExecutiveDeparturePattern } from "./executiveDeparturePatternEngine";
import { computeMarketDemandReport } from "./roleMarketDemandService";
// v39.0 B6: pipeline-level call to get the personalized action set so the
// v3 ActionsTab can surface isGenericFallback + profileContextNote + the
// honest "using generic guidance" notice when the user's role isn't in our
// 412-specialised database.
import { getPersonalizedActions } from "./actionPersonalizationEngine";
// v39.0 D2: unified freshness verdict
import { computeUnifiedFreshness } from "./freshnessUnifier";
import { getIndustryRiskAgeDays } from "../data/industryRiskData";
// v39.0 E1: live calibration backfill from user_prediction_outcomes
import { getLiveCalibrationStatus } from "./empiricalCalibration";
import { assessFinancialRunway } from "./financialRunwayService";
// v17.0 intelligence layers (47–54)
import { computePredictionHorizon } from "./predictionHorizonService";
import { computeSkillGapIntelligence } from "./skillGapIntelligenceService";
import { computePersonalizedTimeline } from "./personalizedTimelineService";
import { computeScenarioPlan, ScenarioPlanPersonalizationContext } from "./scenarioPlanService";
import { computeActionEffortBadge, rankActions, loadCohortImpacts, applyMeasuredImpact, cohortMultiplier, applyBehavioralRerank } from "./actionRankingService";
import { tenureBandFromYears } from "./cohortOutcomesAggregator";
import { fetchIntelligenceBrief } from "./intelligenceBriefService";
import { getCareerPathMarket, getCareerPathMarketSync } from "./careerPathMarket";
import { evaluateJobOffer } from "./offerEvaluationEngine";
import { computeCareerContingencyPlan } from "./careerContingencyPlanEngine";
import { computePreparednessScore } from "./preparednessScoreEngine";
import { computePersonalRiskModifier } from "./personalRiskAdjusterService";
// v40.0: calibration provenance — uncalibrated constant count for Transparency tab
import { getSnapshotProvenanceSummary, getCalibrationDbStatus } from "./calibration/calibrationConstants";
import { ensureRoleIntelligenceLoaded } from "./roleIntelligenceClient";
import {
  checkEdgeFunctionHealth,
  getEFDegradationWarnings,
} from "./edgeFunctionRegistry";
// WS3/WS4/WS5 integrations — additive, flag-gated.
import { getMacroRecessionSignalForCohortClassifier } from "./macroSnapshot";
import { computeConformalCI, type ConformalCohort } from "./conformalCI";
import { detectStealthLayoff, applyStealthFloor } from "./stealthLayoffDetector";
import { detectAcquisitionPremium } from "./mergerAcquisitionRiskEngine";
import { evaluateFlagSync, freezeAuditFlags, clearAuditFlags } from "../config/featureFlags";
import { ensureCareerIntelligenceLoaded } from "../data/intelligence/index";
import { loadCalibration } from "./calibrationLoader";
// v45.0: precision intelligence engines
import { computePrecisionSurvival } from "./precisionSurvivalEngine";
import { computeJobTargeting } from "./jobTargetingEngine";
import { computeMonthlyActionPlan } from "./monthlyActionPlanEngine";
import { computeSkillFusion } from "./skillFusionEngine";
import { computeCompetitivePosition } from "./competitivePositionEngine";
// v50.0: behavioural personalization + 30/60/90 precision plan
import { computeBehavioralPersonalization } from "./behavioralPersonalizationEngine";
import { computePrecision9090Plan } from "./precision9090PlanEngine";
import { setAuditCalibrationBundle, setAuditL1Thresholds } from "./empiricalCalibration";
// DEBT-5 — structured logging.
import { createLogger } from "../shared/logger";
const auditPipelineLog = createLogger({ service: "audit-pipeline" });
// DEBT-1 — DAG phase runner. Executes all layers registered via
// registerLayer() against a shared AuditContext. Currently runs ALONGSIDE
// the legacy try/catch blocks below; layers migrate one at a time and
// their corresponding legacy block is deleted when each is ported.
import { runDagPhase } from "../domain/pipeline/hybridOrchestrator";
import type { AuditContext } from "../domain/pipeline/auditContext";
// WS11 — every supabase.functions.invoke() call goes through invokeEdgeFunction
// so the per-audit request_id propagates via x-request-id header. Without
// this, the edge function's pipeline_runs row has request_id=NULL and an
// audit trace cannot be reconstructed across the browser/edge boundary.
import { invokeEdgeFunction } from "../infrastructure/requestId";
// WS10 — markFallback writes to layer_fallback_log so the quorum/scraping
// failure paths become visible on the SLO dashboard instead of being lost
// in `.catch(() => null)`.
import { markFallback } from "./observability/withFallback";
import { injectActionConsequences } from "./actionConsequenceEngine";
// Phase 1 (Career OS): twin sync after every audit
import { syncTwinFromProfile } from "./careerTwinService";

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
  'ites': 'IT Services',
  'it enabled services': 'IT Services',
  'bpo': 'IT Services',
  'business process outsourcing': 'IT Services',
  'kpo': 'IT Services',
  'knowledge process outsourcing': 'IT Services',
  'lpo': 'IT Services',
  'legal process outsourcing': 'IT Services',
  'hro': 'IT Services',
  'hr outsourcing': 'IT Services',
  'managed services': 'IT Services',
  'it consulting': 'IT Services',
  'application outsourcing': 'IT Services',
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
  industry?: string;
}

// Seeded records without a real last_updated get this sentinel so
// freshnessDays > 30 → classifyDbFreshness → 'invalid' → live signals
// ALWAYS supersede seeded data.
//
// WS12 — was a hardcoded 2025-01-01. That ages correctly TODAY but leaves
// a latent bug: if the constant is forgotten on 2027-01-01 the system
// keeps working, but the staleness margin shrinks year over year. The
// failure mode is "seeded data masquerading as fresh." Use a relative
// 365-days-ago anchor instead so the sentinel is GUARANTEED > 30 days
// stale forever, with no maintenance.
const STALE_SEED_DATE = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();

/**
 * mapOsintToCompanyData
 * Converts raw OSINT Edge Function response to CompanyData schema.
 * The EF queries company_intelligence (seeded DB) — data is NOT live scraped.
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
    source: sourceName || "Seeded Intelligence DB",
    // Read both snake_case (EF v1 still returned only last_updated) and camelCase (EF v2+).
    // Fall back to STALE_SEED_DATE — NOT new Date() — so classifyDbFreshness marks seeded
    // records as 'invalid' (>30 days old) and live signals always supersede them.
    lastUpdated: osintData.last_updated ?? osintData.lastUpdated ?? STALE_SEED_DATE,
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
  const dimensions: HybridResult['dimensions'] = [
    { key: "L1" as const, label: "Company Health",        score: Math.round(engineResult.breakdown.L1 * 100), weightCalibrationStatus: 'regression_derived', weightCalibratedAt: '2024-Q4' },
    { key: "L2" as const, label: "Layoff History",        score: Math.round(engineResult.breakdown.L2 * 100), weightCalibrationStatus: 'regression_derived', weightCalibratedAt: '2024-Q4' },
    { key: "L3" as const, label: "Task Automatability",   score: Math.round(engineResult.breakdown.L3 * 100), weightCalibrationStatus: 'regression_derived', weightCalibratedAt: '2024-Q4' },
    { key: "L4" as const, label: "Market Headwinds",      score: Math.round(engineResult.breakdown.L4 * 100), weightCalibrationStatus: 'regression_derived', weightCalibratedAt: '2024-Q4' },
    { key: "L5" as const, label: "Experience Protection", score: Math.round(engineResult.breakdown.L5 * 100), weightCalibrationStatus: 'regression_derived', weightCalibratedAt: '2024-Q4' },
    { key: "D6" as const, label: "AI Agent Capability",   score: Math.round((engineResult.breakdown.D6 ?? 0) * 100), weightCalibrationStatus: 'regression_derived', weightCalibratedAt: '2026-05-19' },
    { key: "D7" as const, label: "Company Health Risk",   score: Math.round((engineResult.breakdown.D7 ?? 0) * 100), weightCalibrationStatus: 'regression_derived', weightCalibratedAt: '2026-05-19' },
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
      deadline: r.deadline,
      learningWeeks: (r as any).learningWeeks,
      effortBadge: computeActionEffortBadge(r as any),
      sequencePhase: deriveSequencePhase(r.deadline ?? ''),
      evidenceStats: (r as any).evidenceStats,
      dependsOn: (r as any).dependsOn,
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
    _engineResult: engineResult,
    engineArchetype: engineResult.scoringArchetype,
    calibrationCoverage: engineResult.calibrationCoverage,
    activatedKillSwitches: engineResult.activatedKillSwitches,
    killSwitchFloors: engineResult.killSwitchFloors,
    signalDecayWeights: engineResult.signalDecayWeights,
    // v40.0: surface uncalibrated constant count + DB availability from in-memory snapshot.
    // Synchronous — no DB call on the hot audit path.
    ...(() => {
      const prov   = getSnapshotProvenanceSummary();
      const dbStat = getCalibrationDbStatus();
      return {
        ...(prov ? { uncalibratedConstantCount: prov.uncalibratedCount, uncalibratedConstantKeys: prov.uncalibratedKeys } : {}),
        calibrationDbBootstrap: dbStat.isBootstrap,
      };
    })(),
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
  const dimensions: HybridResult['dimensions'] = [
    { key: "L1" as const, label: "Company Health",        score: Math.round(hybridScore.breakdown.L1 * 100), weightCalibrationStatus: 'regression_derived', weightCalibratedAt: '2024-Q4' },
    { key: "L2" as const, label: "Layoff History",        score: Math.round(hybridScore.breakdown.L2 * 100), weightCalibrationStatus: 'regression_derived', weightCalibratedAt: '2024-Q4' },
    { key: "L3" as const, label: "Task Automatability",   score: Math.round(hybridScore.breakdown.L3 * 100), weightCalibrationStatus: 'regression_derived', weightCalibratedAt: '2024-Q4' },
    { key: "L4" as const, label: "Market Headwinds",      score: Math.round(hybridScore.breakdown.L4 * 100), weightCalibrationStatus: 'regression_derived', weightCalibratedAt: '2024-Q4' },
    { key: "L5" as const, label: "Experience Protection", score: Math.round(hybridScore.breakdown.L5 * 100), weightCalibrationStatus: 'regression_derived', weightCalibratedAt: '2024-Q4' },
  ];

  if (typeof breakdownAny.D6 === "number") {
    dimensions.push({ key: "D6", label: "AI Agent Capability", score: Math.round(breakdownAny.D6 * 100), weightCalibrationStatus: 'regression_derived', weightCalibratedAt: '2026-05-19' });
  }
  if (typeof breakdownAny.D7 === "number") {
    dimensions.push({ key: "D7", label: "Company Health Risk", score: Math.round(breakdownAny.D7 * 100), weightCalibrationStatus: 'regression_derived', weightCalibratedAt: '2026-05-19' });
  }

  const recommendations = (hybridScore.recommendations ?? []).map((item: any) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    priority: item.priority,
    layerFocus: item.layerFocus,
    riskReductionPct: item.riskReductionPct,
    deadline: item.deadline,
    learningWeeks: item.learningWeeks,
    effortBadge: item.effortBadge ?? computeActionEffortBadge(item),
    sequencePhase: item.sequencePhase ?? deriveSequencePhase(item.deadline ?? ''),
    evidenceStats: item.evidenceStats,
    dependsOn: item.dependsOn,
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
    engineArchetype: shadowEngineResult.scoringArchetype,
    timing: shadowEngineResult.timing,
    probabilityForecast: shadowEngineResult.probabilityForecast,
    performanceTier: shadowEngineResult.performanceTier,
    performanceCredibilityScore:          shadowEngineResult.performanceCredibilityScore,
    performanceCredibilityRegionKey:      shadowEngineResult.performanceCredibilityRegionKey,
    performanceCredibilityThresholdLabel: shadowEngineResult.performanceCredibilityThresholdLabel,
    hyperscalerD8ProxyApplied:            shadowEngineResult.hyperscalerD8ProxyApplied,
    hyperscalerD8ProxyAmount:             shadowEngineResult.hyperscalerD8ProxyAmount,
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

function deriveSeniorityBracket(years: number, roleKey?: string | null): 'junior' | 'mid' | 'senior' | 'staff_plus' {
  const family = roleKey ? getSeniorityFamilyForRole(roleKey) : 'default';
  const t = getSeniorityThresholds(family);
  if (years < t.mid) return 'junior';
  if (years < t.senior) return 'mid';
  if (years < t.principal) return 'senior';
  return 'staff_plus';
}

// GAP F: derive sequencePhase from the action's deadline string
function deriveSequencePhase(deadline: string): 'day1' | 'week1' | 'month1' | 'quarter1' {
  const dl = (deadline ?? '').toLowerCase();
  if (dl.includes('24 hour') || dl.includes('today') || dl.includes('immediately') || dl.includes('now')) return 'day1';
  if (dl.includes('3 day') || dl.includes('48 hour') || dl.includes('72 hour') || dl.includes('7 day') || dl.includes('1 week')) return 'week1';
  if (dl.includes('14 day') || dl.includes('30 day') || dl.includes('2 week') || dl.includes('month')) return 'month1';
  return 'quarter1';
}

// Stable, deterministic ID derived from an action's title. Action completion
// state (Action Progress / PhaseProgressSystem) is keyed by action.id, so IDs
// MUST be stable across audits — an index-based or timestamp ID would orphan a
// user's prior completions every re-audit. A title hash is stable as long as the
// action text is the same.
function stableActionId(prefix: string, title: string): string {
  let hash = 5381;
  const s = (title ?? '').toLowerCase().trim();
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) + hash + s.charCodeAt(i)) >>> 0; // djb2
  }
  return `${prefix}_${hash.toString(36)}`;
}

// ── Strategy Synthesis personalization signals ────────────────────────────────
// Collects the v48.0 personalization inputs (visa grace window, equity vest,
// role family, seniority, skill portfolio, region) that the strategySynthesis
// engine needs to produce VISA_WINDOW_EXIT / EQUITY_HARVEST_THEN_EXIT /
// GEOGRAPHIC_ARBITRAGE strategies and role-family-specific immediate actions.
// Previously unwired, which forced every audit onto the generic 5-strategy path
// and made "Your Strategy" read as template-based.
function buildStrategyPersonalizationSignals(
  inputs: AuditInputs,
  companyData: CompanyData,
  hybridResult: HybridResult,
  resolvedRole: { canonicalKey?: string | null },
): {
  visaGracePeriodDays?: number | null;
  daysToNextVest?: number | null;
  nextVestValueUsd?: number | null;
  hasDependents?: boolean;
  roleFamily?: string;
  seniority?: 'junior' | 'mid' | 'senior' | 'staff' | 'exec';
  skillPortfolioScore?: number;
  region?: string;
  targetRegion?: string;
  geographicMobility?: 'none' | 'same_country' | 'global' | null;
  riskTolerance?: 'conservative' | 'moderate' | 'aggressive' | null;
} {
  const uf = (inputs.userFactors ?? {}) as any;
  const visaRisk = (hybridResult as any).visaRisk;
  const skillPortfolioFit = (hybridResult as any).skillPortfolioFit;
  const canonicalKey = (resolvedRole.canonicalKey ?? inputs.oracleKey ?? '').toLowerCase();

  // Role family via the careerInsuranceEngine mapping so healthcare keys like
  // 'nurse_*' / 'physician_*' resolve to 'hc' and finance keys to 'fin' — the
  // naive first-segment split would have mislabelled many roles as their own
  // unmatched family, leaving the engine on its 'default' (no-op) path.
  const roleFamily = getStrategyRoleFamily(canonicalKey) || undefined;

  // Map the 4-tier seniority bracket onto the strategy engine's 5-tier enum.
  const careerYears = (uf.careerYears ?? uf.tenureYears ?? inputs.userFactors?.tenureYears ?? 5) as number;
  const bracket = deriveSeniorityBracket(careerYears, canonicalKey || null);
  const isExecTitle = /chief|cto|cfo|ceo|coo|founder|vp |vice.president|head of/i.test(inputs.roleTitle ?? '');
  const seniority: 'junior' | 'mid' | 'senior' | 'staff' | 'exec' =
    isExecTitle ? 'exec' : bracket === 'staff_plus' ? 'staff' : bracket;

  // Equity vest value: equityVestMonths is a horizon (months to next cliff). When
  // a monthly equity figure is present, estimate the upcoming vest USD value; else
  // fall back to a conservative threshold so the strategy can still trigger when
  // the user has confirmed meaningful unvested equity.
  const equityVestMonths: number | null = uf.equityVestMonths ?? null;
  const hasEquityVesting: boolean = uf.hasEquityVesting === true || equityVestMonths != null;
  const monthlyEquityUsd: number | null = uf.monthlyEquityUsd ?? uf.equityMonthlyValueUsd ?? null;
  const daysToNextVest: number | null = equityVestMonths != null ? Math.round(equityVestMonths * 30) : null;
  const nextVestValueUsd: number | null =
    monthlyEquityUsd != null && equityVestMonths != null
      ? Math.round(monthlyEquityUsd * equityVestMonths)
      : hasEquityVesting && equityVestMonths != null && equityVestMonths <= 6
        ? 15_000  // conservative default so harvest strategy can trigger for near-cliff equity
        : null;

  return {
    visaGracePeriodDays: visaRisk?.gracePeriodDays ?? null,
    daysToNextVest,
    nextVestValueUsd,
    hasDependents: uf.hasDependents ?? undefined,
    roleFamily,
    seniority,
    skillPortfolioScore: skillPortfolioFit?.fitScore ?? undefined,
    region: companyData.region ?? undefined,
    targetRegion: uf.targetRegion ?? undefined,
    // Phase 5 adaptive personalization signals
    geographicMobility: uf.geographicMobility ?? null,
    riskTolerance: uf.riskTolerance ?? null,
  };
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
 * Fire-and-forget latency telemetry write to audit_latency_log.
 * Never throws — always resolves. Called after awaitLiveQuorum resolves.
 */
function _writeQuorumLatency(row: {
  companyName:     string;
  marketSegment:   string;
  regime:          string | null;
  quorumCeilingMs: number;
  quorumWaitMs:    number;
  quorumReached:   boolean;
}): void {
  supabase
    .from('audit_latency_log')
    .insert({
      company_name:      row.companyName,
      market_segment:    row.marketSegment,
      regime:            row.regime,
      quorum_ceiling_ms: row.quorumCeilingMs,
      quorum_wait_ms:    row.quorumWaitMs,
      quorum_reached:    row.quorumReached,
    })
    .then(({ error }) => {
      if (error) console.debug('[AuditPipeline] latency log write skipped:', error.message);
    });
}

/**
 * Returns true when the regime is a private-company type that has no public
 * financial data, no WARN Act, and no SEC EDGAR — meaning the quorum ceiling
 * is deliberately short (15-18s) and users should see a "Limited data" banner.
 */
export function isLimitedDataRegime(regime: string | null): boolean {
  return regime === 'german_gmbh'
    || regime === 'uk_private_ltd'
    || regime === 'india_unlisted_pvt'
    || regime === 'apac_private'
    || regime === 'eu_other_private';
}

/**
 * Human-readable reason for the "Limited data" banner, keyed by regime.
 */
export function limitedDataReasonForRegime(regime: string | null): string {
  switch (regime) {
    case 'german_gmbh':        return 'German GmbH companies have no public stock listing, no WARN Act, and no SEC filings. Analysis uses news signals, Bundesanzeiger records, and hiring data.';
    case 'uk_private_ltd':     return 'UK private companies file annually at Companies House with a 9-month lag. No real-time financial disclosure available. Analysis uses news and hiring signals.';
    case 'india_unlisted_pvt': return 'India private companies are not listed on BSE/NSE. No exchange financial data available. Analysis uses MCA filings, India press signals, and hiring data.';
    case 'apac_private':       return 'Singapore/APAC private companies are not publicly listed. ACRA/ASIC data is batch-updated, not real-time. Analysis uses available news and hiring signals.';
    case 'eu_other_private':   return 'EU private companies have no real-time public financial disclosure. Analysis uses available news and hiring signals.';
    default:                   return 'Limited public data available for this company.';
  }
}

/**
 * PRIMARY ENTRY POINT: fetchAuditData
 *
 * Resolution order:
 *   1. Live OSINT (Supabase Edge Function)
 *   2. Live enrichment (Yahoo Finance + RSS news patch onto static DB data)
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
  // v40.0 FIX-11: also strip control characters and clamp to 250 chars to prevent
  // garbage inputs from reaching downstream APIs.
  const stripControlChars = (s: string) => s.replace(/[\x00-\x1F\x7F]/g, '').slice(0, 250);
  const trimmedCompanyName = stripControlChars((inputs.companyName ?? '').trim().replace(/\s+/g, ' '));
  if (trimmedCompanyName.length === 0) {
    // Normalize to the fallback path immediately — no OSINT call needed
    inputs = { ...inputs, companyName: 'Unknown Company' };
  } else {
    inputs = { ...inputs, companyName: trimmedCompanyName };
  }
  // Similarly normalize role title — empty role title sends blank Serper queries
  const trimmedRole = stripControlChars((inputs.roleTitle ?? '').trim().replace(/\s+/g, ' '));
  if (trimmedRole.length === 0) {
    inputs = { ...inputs, roleTitle: 'Software Engineer' }; // neutral default
  } else {
    inputs = { ...inputs, roleTitle: trimmedRole };
  }
  // Normalize department similarly
  if (inputs.department) {
    inputs = { ...inputs, department: stripControlChars(inputs.department.trim().replace(/\s+/g, ' ')) };
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

  // ── Feature flag snapshot — resolved once for this audit run ────────────────
  // All evaluateFlagSync / evaluateFlag calls within this function and every
  // service it calls will read from this frozen copy, not the live 60s-refresh
  // cache. clearAuditFlags() releases the lock at the return site.
  const auditFlagSnapshot = freezeAuditFlags();

  // ── Career intelligence corpus — ensure loaded before pipeline runs ──────────
  // The 842KB corpus is lazy-loaded (prefetched via requestIdleCallback at boot).
  // This await is a no-op when the prefetch already completed; it only blocks on
  // first audit if the user submitted faster than the 3s idle timeout.
  await ensureCareerIntelligenceLoaded();

  // ── Pipeline timing ─────────────────────────────────────────────────────────
  const _timer = PipelineTimer.start(inputs.companyName);
  _timer.mark('osint_start');

  // Load admin-curated layoff events from Supabase, overriding hardcoded seeds.
  // Fire-and-forget — non-fatal if Supabase is unavailable; seeded fallbacks remain.
  loadCuratedLayoffEvents().catch(() => {}); // arch-allow:R2 fire-and-forget data prefetch; seeded fallbacks cover failure
  // Warm the DB-backed role intelligence cache (demand overrides, aliases, seniority benchmarks).
  // Fire-and-forget — static in-memory data is the fallback if Supabase is unavailable.
  ensureRoleIntelligenceLoaded().catch(() => {});
  // v39.0 E1: prime the live calibration backfill cache (1h TTL) so the UI
  // can surface "X labelled outcomes collected so far" without blocking.
  // Fire-and-forget — bootstrap status is the fallback.
  getLiveCalibrationStatus().catch(() => {});

  // ── LIVE-FIRST ARCHITECTURE ─────────────────────────────────────────────────
  // Start live scraping IMMEDIATELY — in parallel with DB resolution steps below.
  // Live signals are the primary source of truth; DB/static data fills gaps only.
  // The promise is awaited later (after DB resolution) so both run concurrently,
  // eliminating the sequential 2-3s delay that caused stale data to be used as base.
  const _liveDataPromise: Promise<Awaited<ReturnType<typeof fetchLiveCompanyData>> | null> =
    fetchLiveCompanyData(
      inputs.companyName,
      null,                             // ticker: resolved via TICKER_MAP internally or post-EF
      _timer,
      inputs.roleTitle ?? 'Software Engineer',
      inputs.industry ?? undefined,
      undefined,                        // isUnknownCompany: resolved below post-EF
      inputs.country,                   // region: drives Google News locale + APAC feed selection
    ).catch((err: unknown) => {
      console.warn('[AuditPipeline] Concurrent live scraping failed:', err);
      return null;
    });

  // v32: live signal quorum wait. The scraper trigger (BullMQ on Fly.io) was
  // fire-and-forget in v31 with an 8s readiness wait. v32 blocks until every
  // signal CLASS (workforce, layoffs, financial, hiring) reaches its minimum
  // source count — up to a 45s hard ceiling. On ceiling-hit we proceed with
  // `_liveUnavailable=true` (the confidence model then caps at 45% with an
  // explicit "Live intelligence unavailable" UI state).
  //
  // WS6 — `_forceLiveUnavailable` short-circuit. The Tier-A fast path passes
  // this private flag so the pipeline skips the live-quorum wait entirely
  // and returns a DB-only response inside the Tier-A budget. The subsequent
  // tier_a_upgraded pass runs WITHOUT this flag and DOES wait for quorum.
  const _forceLiveUnavailable = (inputs as AuditInputs & { _forceLiveUnavailable?: boolean })._forceLiveUnavailable === true;
  // WS10 — null is a legitimate "no quorum" signal that downstream code
  // handles, but the FACT that quorum failed is observability-worthy
  // (it indicates either a slow scraper, a stuck job, or an unknown
  // company without any signals). markFallback writes one row to
  // layer_fallback_log so the SLO dashboard surfaces a spike.
  // Detect regime early so we can use the correct quorum spec AND ceiling.
  // german_gmbh/uk_private_ltd/india_unlisted_pvt/apac_private → 15-18s ceiling.
  // us_private → 20s ceiling. Public/unknown → 45s ceiling.
  const _detectedRegime = detectPrivateCompanyRegime(inputs.companyName, inputs.country ?? null);
  const _quorumSpec     = quorumSpecForRegime(_detectedRegime);
  const _quorumCeiling  = quorumCeilingForRegime(_detectedRegime);
  // Market segment bucket for latency telemetry — refined later with isPublic after resolution.
  const _marketSegment  = marketSegmentForRegime(_detectedRegime, inputs.country ?? null, false);

  // Tag timer with regime metadata before quorum starts.
  if (_timer && '_timer' in ({} as { _timer?: unknown })) {
    // PipelineTimerInstance extended in Phase 2 — type-safe via cast
    const timerWithMeta = _timer as any;
    if (typeof timerWithMeta.regime !== 'undefined') {
      timerWithMeta.regime        = _detectedRegime;
      timerWithMeta.marketSegment = _marketSegment;
      timerWithMeta.quorumCeilingMs = _quorumCeiling;
    }
  }

  const _liveQuorumPromise = _forceLiveUnavailable
    ? Promise.resolve(null)
    : import('./scraperTrigger').then(({ awaitLiveQuorum }) => {
        (_timer as any)?.mark?.('quorum_wait_start');
        return awaitLiveQuorum(inputs.companyName, {
          ceilingMs:      _quorumCeiling,
          pollIntervalMs: 500,
          spec:           _quorumSpec,
        }).then((result) => {
          (_timer as any)?.mark?.('quorum_wait_end');
          // Tag timer with quorum outcome
          const timerWithMeta = _timer as any;
          if (timerWithMeta && typeof timerWithMeta.quorumWaitMs !== 'undefined') {
            timerWithMeta.quorumWaitMs  = result.waitedMs;
            timerWithMeta.quorumReached = result.reached;
          }
          // Fire-and-forget latency telemetry write
          _writeQuorumLatency({
            companyName:     inputs.companyName,
            marketSegment:   _marketSegment,
            regime:          _detectedRegime,
            quorumCeilingMs: _quorumCeiling,
            quorumWaitMs:    result.waitedMs,
            quorumReached:   result.reached,
          });
          return result;
        }).catch((err) => {
          (_timer as any)?.mark?.('quorum_wait_end');
          markFallback({
            layerId: 'auditDataPipeline.awaitLiveQuorum',
            reason: 'timeout',
            companyCanonical: inputs.companyName,
            rationale: err instanceof Error ? err.message : String(err),
          });
          return null;
        });
      }).catch((err) => {
        markFallback({
          layerId: 'auditDataPipeline.scraperTrigger.import',
          reason: 'exception',
          companyCanonical: inputs.companyName,
          rationale: err instanceof Error ? err.message : String(err),
        });
        return null;
      });

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

  // Step 1: Seeded company_intelligence lookup via Edge Function.
  // NOTE: fetch-company-data queries the seeded company_intelligence DB table —
  // it is NOT a live scrape. Data is static/seeded; live enrichment happens in Step 5.
  // dataSource is correctly set to 'db', not 'live', regardless of EF label.
  try {
    // WS11 — invokeEdgeFunction injects x-request-id so the audit trace
    // joins across browser → edge → DB. Wide `any` matches the legacy
    // invoke ergonomics — the response body has many optional fields.
    const { data: fetchRes, error } = await invokeEdgeFunction<any>(
      "fetch-company-data",
      { body: { companyName: inputs.companyName } },
    );

    if (fetchRes && !error && fetchRes.data) {
      // A 'fallback' provenance means the company isn't in company_intelligence.
      // Don't treat it as 'live' — let subsequent DB steps try before giving up.
      const isFallback = (fetchRes.source ?? '').toLowerCase().includes('fallback');
      const matchConfidence = Number(fetchRes.matchConfidence ?? 1);
      companyMatchConfidence = matchConfidence;
      companyMatchType = (fetchRes.matchType ?? "exact") as typeof companyMatchType;
      if (!isFallback && matchConfidence >= 0.7) {
        companyData = mapOsintToCompanyData(fetchRes.data, fetchRes.source);
        // EF response is seeded-DB-sourced — mark as db/stale_db, NEVER live.
        // trueLiveSignals will be updated only after fetchLiveCompanyData reconciliation.
        dataSource = fetchRes.dataFreshness?._staleDb ? 'stale_db' : 'db';
        trueLiveSignals = 0;  // DB fields are NOT live signals
        trueHeuristicSignals = 7;
        // Tag so the reconciler knows this baseline came from the seeded DB.
        (companyData as any)._isSeededBaseline = true;
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

  // Step 2: Seeded company_intelligence table direct client query (2000+ companies).
  // EF in Step 1 may have failed or returned low confidence — this is the same seeded DB.
  if (!companyData) {
    try {
      const supabaseResult = await queryCompanyIntelligenceWithMatch(inputs.companyName);
      if (supabaseResult) {
        companyData = supabaseResult.companyData;
        dataSource = 'db';
        (companyData as any)._isSeededBaseline = true;
        if (companyMatchConfidence === 0) {
          companyMatchConfidence = supabaseResult.matchConfidence;
          companyMatchType = supabaseResult.matchType as typeof companyMatchType;
        }
      }
    } catch (err) {
      console.warn('[AuditPipeline] Supabase intelligence lookup failed:', err);
    }
  }

  // Step 3: Legacy companyDatabase (18 companies) — static code-side fallback.
  if (!companyData) {
    const legacy = getCompanyByName(inputs.companyName);
    if (legacy) {
      companyData = legacy;
      dataSource = 'db';
      (companyData as any)._isSeededBaseline = true;
    }
  }

  // Step 4: Unknown fallback — honest ±30pt warning; capture to discovery queue.
  // Infer industry from company name + role title when the company isn't in the DB
  // so sector-level signals (L4 market conditions, L2 sector contagion, epistemic
  // floor) are calibrated to a plausible sector rather than always defaulting to
  // generic "technology".
  if (!companyData) {
    // v39.0 A2: role + industry context lets the fallback infer a plausible
    // head-count rather than a fabricated 5000.
    companyData = createUnknownCompanyFallback(inputs.companyName, inputs.roleTitle, inputs.industry);
    dataSource = 'fallback';

    // Industry inference from company name signals
    const nameL = inputs.companyName.toLowerCase();
    const roleL = (inputs.roleTitle ?? '').toLowerCase();
    const inferredIndustry = (() => {
      if (/bank|financial|finance|capital|invest|wealth|insurance|nbfc|credit/i.test(nameL)) return 'Financial Services';
      if (/health|pharma|hospital|clinic|medic|bio|life.?science|diagnostic/i.test(nameL)) return 'Healthcare';
      if (/retail|fashion|ecomm|shop|mart|store|bazaar|d2c/i.test(nameL)) return 'E-commerce';
      if (/logistics|delivery|supply|freight|cargo|transport|fleet/i.test(nameL)) return 'Logistics';
      if (/media|news|publish|content|entertainment|streaming|studio/i.test(nameL)) return 'Media';
      if (/edu|learn|school|tutor|coaching|academy/i.test(nameL)) return 'EdTech';
      if (/food|restaurant|café|kitchen|chef|recipe|meal/i.test(nameL)) return 'Food Tech';
      if (/real.?estate|property|realty|proptech|housing/i.test(nameL)) return 'PropTech';
      if (/consult|advisory|solution|services|outsourc|bpo|kpo/i.test(nameL)) return 'IT Services';
      if (/travel|hotel|hospitality|airline|tourism/i.test(nameL)) return 'Travel';
      if (/auto|vehicle|ev|electric.?vehicle|motor|mobility|ride/i.test(nameL)) return 'Mobility';
      // Role-title inference as secondary signal
      if (/nurse|doctor|therapist|dentist|clinical/i.test(roleL)) return 'Healthcare';
      if (/banker|trader|analyst.*finance|underwriter/i.test(roleL)) return 'Financial Services';
      if (/teacher|instructor|curriculum|tutor/i.test(roleL)) return 'EdTech';
      return null; // keep "technology" default
    })();
    if (inferredIndustry) {
      companyData.industry = inferredIndustry;
      (companyData as any)._industryInferred = true;
    }

    // Region inference from company name for major India-headquartered keywords
    const regionInferred = (() => {
      if (/pvt\.?\s*ltd|private\s+limited|\bltd\b/i.test(inputs.companyName)) return 'IN';
      if (/india|bengaluru|bangalore|mumbai|delhi|hyderabad|pune|chennai/i.test(nameL)) return 'IN';
      return null;
    })();
    if (regionInferred && companyData.region === 'US') {
      companyData.region = regionInferred as CompanyData['region'];
      (companyData as any)._regionInferred = true;
    }

    // v40.0: Tag unknown companies with 'D' reliability tier so the confidence
    // model applies a 0.35 floor instead of the 'C' default (0.45).
    // Without this, an unknown startup gets the same confidence floor as a
    // company with a sparse-but-present Supabase record.
    (companyData as any)._dbReliabilityTierOverride = 'D';

    // Fire-and-forget — never blocks the audit
    saveToDiscoveryQueue(
      inputs.companyName,
      companyData.industry ?? 'unknown',
      inputs.roleTitle,
    ).catch(() => {}); // arch-allow:R2 fire-and-forget company-discovery enqueue
  }

  // v40.0 FIX-4: Sanitize companyData numeric fields. Negative employee counts,
  // impossible revenue growth (>500% or <-100%), and out-of-range percentages
  // can come from scraper errors or DB corruption. Set them to null so
  // downstream scoring treats them as "unknown" (correct fallback) rather than
  // silently propagating garbage values.
  if (companyData) {
    if (typeof companyData.employeeCount === 'number' &&
        (companyData.employeeCount < 0 || !isFinite(companyData.employeeCount))) {
      // employeeCount is typed as `number` (non-nullable). Use 0 — the
      // downstream code at calculateCompanyHealthScore gates on
      // `employeeCount != null && employeeCount > 0` so 0 correctly skips
      // size-risk computation while staying type-safe.
      companyData.employeeCount = 0;
    }
    if (typeof companyData.revenueGrowthYoY === 'number' &&
        (!isFinite(companyData.revenueGrowthYoY) ||
         companyData.revenueGrowthYoY < -100 || companyData.revenueGrowthYoY > 500)) {
      companyData.revenueGrowthYoY = null;
    }
    if (typeof companyData.stock90DayChange === 'number' &&
        (!isFinite(companyData.stock90DayChange) ||
         companyData.stock90DayChange < -100 || companyData.stock90DayChange > 500)) {
      companyData.stock90DayChange = null;
    }
    if (typeof companyData.revenuePerEmployee === 'number' &&
        (companyData.revenuePerEmployee < 0 || !isFinite(companyData.revenuePerEmployee))) {
      // revenuePerEmployee is typed as `number` (non-nullable). Use 0 instead
      // of null — downstream code already gates on `> 0` to mean "known data",
      // so 0 correctly classifies this as "unknown" without breaking the type.
      companyData.revenuePerEmployee = 0;
    }
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
      // Increment per-user proxy call counter and check within daily budget.
      // fire-and-forget the check — if it fails, allow the call (fail open for auth errors)
      const { data: allowed } = await supabase.rpc('increment_user_quota', {
        p_user_id: userId,
        p_service:  'alphavantage', // legacy key — retained for DB compatibility
        p_budget:   25,
      });
      userAllowedLiveCalls = allowed !== false; // null/undefined = allow (RPC error = fail open)
      if (!userAllowedLiveCalls) {
        console.info('[AuditPipeline] Per-user live-signal quota exhausted for today — heuristic fallback');
        import('./apiDegradationMonitor').then(({ recordApiDegradation }) => {
          recordApiDegradation('supabase_osint', 'rate_limited', 'Per-user daily budget exhausted');
        }).catch(() => {}); // arch-allow:R2 fire-and-forget telemetry note
      }
    }
  } catch {
    userAllowedLiveCalls = true; // quota check failed — fail open
  }

  // ── v32: LIVE-FIRST RECONCILIATION WITH QUORUM GATE ────────────────────────
  // Await:
  //   1. The concurrent live scraping promise (Yahoo Finance, RSS news, inline scrape)
  //   2. The 45s live signal quorum (Fly.io BullMQ workers writing to scrape_jobs)
  // Both have been running in parallel with all DB resolution steps. The audit
  // blocks here until the quorum spec is satisfied OR the ceiling fires. When
  // the ceiling fires without quorum, the audit proceeds with `_liveUnavailable=true`
  // and the confidence model surfaces an explicit "Live intelligence unavailable"
  // state — never a misleading high-confidence score from stale data.
  let liveQuorum: import('./scraperTrigger').AwaitLiveQuorumResult | null = null;
  try {
    const efTicker = (companyData as any).ticker ?? (companyData as any).stockTicker ?? null;
    // BUG-08: Promise.allSettled — both promises have internal .catch(→null) guards,
    // but allSettled makes the isolation explicit: a quorum-gate rejection (e.g. scraperTrigger
    // dynamic import failure) must never abort the already-completed live data fetch.
    const [liveDataSettled, quorumSettled] = await Promise.allSettled([
      _liveDataPromise,
      _liveQuorumPromise,
    ]);
    const liveDataResolved = liveDataSettled.status === 'fulfilled' ? liveDataSettled.value : null;
    const quorumResolved   = quorumSettled.status   === 'fulfilled' ? quorumSettled.value   : null;
    let liveData = liveDataResolved;
    liveQuorum = quorumResolved;

    // Supplement: if early live scraping produced no stock data BUT the EF gave us
    // a ticker and quota allows it, do a quick targeted stock-only fetch.
    if (
      liveData &&
      userAllowedLiveCalls &&
      efTicker &&
      liveData.stockData === null &&
      liveData.genuineLiveApiSignals < 1
    ) {
      try {
        const supplemented = await fetchLiveCompanyData(
          inputs.companyName,
          efTicker,
          _timer,
          inputs.roleTitle,
          companyData.industry,
          dataSource === 'fallback',  // unknown company → extended scraping timeout
          inputs.country,             // region: drives hiring market connector selection
        );
        // Merge: use supplemented stock/revenue data, keep everything else from early run
        if (supplemented.stockData !== null) {
          liveData = { ...liveData, stockData: supplemented.stockData };
        }
      } catch { /* non-fatal — early result still used */ }
    }

    if (!liveData) {
      // Early live scraping failed — fall through to DB-only scoring with low confidence.
      // Set _dataFreshnessScore = 0 so hybridConsensusBuilder's Tier 0 freshness cap
      // (30%) fires correctly. Without this, the field stays undefined and the cap
      // is silently skipped, producing over-confident scores for unknown companies.
      trueLiveSignals      = 0;
      trueHeuristicSignals = 7;
      (companyData as any)._dataFreshnessScore = 0;
      (companyData as any)._liveFreshnessScore = 0;
      (companyData as any)._dbFreshnessScore   = 0;
      // Audit v35: also write _liveQuorumStatus + _liveUnavailable so the
      // hybridConsensusBuilder uses real (failed) quorum state — not the
      // optimistic fallback that infers reach from reconciliation.summary.
      (companyData as any)._liveUnavailable    = true;
      (companyData as any)._liveQuorumReached  = false;
      // Live scraping returned null → zero positive classes by definition.
      (companyData as any)._quorumInsufficient        = true;
      (companyData as any)._quorumPositiveClassCount  = 0;
      (companyData as any)._quorumStructuralNote      = null;
      // Regime / limited-data flags — consumed by SpyLoadingState banner
      (companyData as any)._detectedRegime    = _detectedRegime;
      (companyData as any)._marketSegment     = _marketSegment;
      (companyData as any)._quorumCeilingMs   = _quorumCeiling;
      (companyData as any)._limitedDataMode   = isLimitedDataRegime(_detectedRegime);
      (companyData as any)._limitedDataReason = limitedDataReasonForRegime(_detectedRegime);
      (companyData as any)._liveQuorumStatus = liveQuorum?.status ?? {
        reached: false,
        elapsedMs: 0,
        perClass: {
          workforce: { signalClass: 'workforce', sourcesReached: [], sourcesPending: [], satisfied: false, satisfiedByAbsence: false },
          layoffs:   { signalClass: 'layoffs',   sourcesReached: [], sourcesPending: [], satisfied: false, satisfiedByAbsence: false },
          financial: { signalClass: 'financial', sourcesReached: [], sourcesPending: [], satisfied: false, satisfiedByAbsence: false },
          hiring:    { signalClass: 'hiring',    sourcesReached: [], sourcesPending: [], satisfied: false, satisfiedByAbsence: false },
        },
      };
      (companyData as any)._liveDataCoverage = {
        liveWonKeys: [], dbWonKeys: [], liveRatio: 0,
        genuineApiSignals: 0, overallSource: 'heuristic',
        degradedSignalClasses: [], hardFailures: ['live_data_null'],
        fetchedAt: new Date().toISOString(),
      };
    } else {
      // CRITICAL v30.0 FIX: Apply scraping enrichment BEFORE reconciliation.
      //
      // Previously the scraping result (Wikipedia headcount, Glassdoor, career page)
      // was applied AFTER reconcileCompanySignals — this meant the reconciliation
      // saw the stale seeded employeeCount as the "base DB value" and arbitrated
      // against Yahoo Finance only. Wikipedia headcount never participated in the
      // authoritative signal chain.
      //
      // After this fix:
      //   1. Scraping enrichment writes Wikipedia headcount into companyData first
      //   2. Reconciliation now sees the live Wikipedia value as the base
      //   3. Yahoo Finance fullTimeEmployees can still override Wikipedia via the
      //      normal live-signal arbitration path
      //
      // Promoting Wikipedia into liveData.stockData.employeeCount lets it ALSO
      // flow as a true live signal so confidence reflects it correctly.
      // Regime / limited-data flags stamped here too so UI has them on success path
      (companyData as any)._detectedRegime    = _detectedRegime;
      (companyData as any)._marketSegment     = _marketSegment;
      (companyData as any)._quorumCeilingMs   = _quorumCeiling;
      (companyData as any)._limitedDataMode   = isLimitedDataRegime(_detectedRegime);
      (companyData as any)._limitedDataReason = limitedDataReasonForRegime(_detectedRegime);

      const scrapingResultEarly = (liveData as any)._scrapingResult;
      if (scrapingResultEarly) {
        applyScrapingEnrichment(companyData, scrapingResultEarly);
      }

      // ── v32.1: HEADCOUNT CONSENSUS ─────────────────────────────────────────
      // The v32 headcountConsensus module is now wired into the audit pipeline.
      // Previously, reconciliation chose a single headcount source via the standard
      // chooseAuthoritativeSignal path — usually Yahoo's fullTimeEmployees or
      // Wikipedia, never both. The consensus fuses up to 6 sources, drops outliers,
      // and returns a confidence-weighted median.
      //
      // When the consensus produces a value with confidence >= 0.7, it is promoted
      // as the authoritative headcount AND propagated into liveData.stockData so
      // it flows through reconciliation as a genuine live signal. Below 0.7,
      // we fall back to the prior single-source path.
      const { consensusFromSignals } = await import('./headcountConsensus');
      const wikiEmp      = scrapingResultEarly?.enrichment?.wikiEmployeeCount ?? null;
      const linkedinEmp  = scrapingResultEarly?.enrichment?.linkedinHeadcount  ?? null;
      const careerPageEmp= scrapingResultEarly?.enrichment?.careerPageHeadcount ?? null;
      const secEdgarEmp  = scrapingResultEarly?.enrichment?.secEdgarHeadcount   ?? null;
      const secEdgarAt   = scrapingResultEarly?.enrichment?.secEdgarFiledAt      ?? undefined;
      const yahooFte     = liveData.stockData?.employeeCount ?? null;
      const intelDb      = (companyData.employeeCount && companyData.employeeCount > 0)
        ? companyData.employeeCount
        : null;
      const scrapeFetchedAt = scrapingResultEarly?.fetchedAt;
      const consensus = consensusFromSignals({
        secEdgar:   secEdgarEmp  != null ? { value: secEdgarEmp,  observedAt: secEdgarAt }      : null,
        yahooFte:   yahooFte     != null ? { value: yahooFte,     observedAt: scrapeFetchedAt } : null,
        wikipedia:  wikiEmp      != null ? { value: wikiEmp,      observedAt: scrapeFetchedAt } : null,
        linkedin:   linkedinEmp  != null ? { value: linkedinEmp,  observedAt: scrapeFetchedAt } : null,
        intelDb:    (companyData as any)._isSeededBaseline && intelDb != null
          ? { value: intelDb, observedAt: (companyData as any).lastUpdated ?? undefined }
          : null,
        careerPage: careerPageEmp != null ? { value: careerPageEmp, observedAt: scrapeFetchedAt } : null,
      });

      if (consensus.value != null && consensus.confidence >= 0.5) {
        // Promote consensus into liveData.stockData so reconciliation sees a
        // live-source signal even when Yahoo's assetProfile was null.
        if (!liveData.stockData) {
          liveData.stockData = {
            price90DayChange: null, revenueGrowthYoY: null, marketCap: null,
            peRatio: null, employeeCount: consensus.value,
            source: 'yahoo-finance',
            fetchedAt: scrapingResultEarly?.fetchedAt ?? new Date().toISOString(),
          };
        } else {
          liveData.stockData.employeeCount = consensus.value;
        }
        if (consensus.contributingSources.length >= 2) {
          // Multi-source agreement counts as a genuine live signal for the
          // freshness gate, AND records the consensus result so the UI can
          // surface "headcount agreed by 3 sources" in the confidence tooltip.
          (liveData as any).genuineLiveApiSignals = (liveData.genuineLiveApiSignals ?? 0) + 1;
        }
        (companyData as any)._headcountConsensus = {
          value: consensus.value,
          confidence: consensus.confidence,
          agreement: consensus.agreement,
          contributingSources: consensus.contributingSources,
          rejectedSources: consensus.rejectedSources,
          perSource: consensus.perSource,
          conflictDisclosure: consensus.conflictDisclosure,
          anchorSource: consensus.anchorSource,
        };
      } else if (wikiEmp && wikiEmp >= 10 && !yahooFte) {
        // Single-source Wikipedia path — preserved for back-compat when consensus
        // confidence is too low (e.g. only Wikipedia returned anything).
        if (!liveData.stockData) {
          liveData.stockData = {
            price90DayChange: null, revenueGrowthYoY: null, marketCap: null,
            peRatio: null, employeeCount: wikiEmp,
            source: 'yahoo-finance',
            fetchedAt: scrapingResultEarly?.fetchedAt ?? new Date().toISOString(),
          };
        } else if (!liveData.stockData.employeeCount) {
          liveData.stockData.employeeCount = wikiEmp;
        }
        (liveData as any).genuineLiveApiSignals = (liveData.genuineLiveApiSignals ?? 0) + 1;
      }

      reconciledSignals = reconcileCompanySignals(companyData as CompanyData, liveData);
      companyData = reconciledSignals.active;
      trueLiveSignals = reconciledSignals.liveSignalCount;
      trueHeuristicSignals = Math.max(0, 7 - Math.min(7, reconciledSignals.informativeLiveSignalCount));

      // Source label: live only when real external APIs contributed
      const totalKeys = reconciledSignals.summary.liveWonKeys.length + reconciledSignals.summary.dbWonKeys.length;
      const liveRatio = totalKeys > 0 ? reconciledSignals.summary.liveWonKeys.length / totalKeys : 0;
      if (liveRatio >= 0.5) {
        dataSource = 'live';
      } else if (liveRatio > 0) {
        dataSource = dataSource === 'fallback' ? 'fallback' : 'db';
      }

      // v32: propagate quorum status + live-unavailable flag into companyData
      // so the evidence-based confidence model in hybridConsensusBuilder can
      // read them directly. Drop the v31 pipelineCoverageScore — the confidence
      // model uses quorum classes + agreement instead of pipeline-timing proxies.
      const genuineApiSignals = liveData.genuineLiveApiSignals ?? 0;
      const reconciliationLiveScore = (companyData as any)._liveFreshnessScore
                                      ?? (companyData as any)._dataFreshnessScore
                                      ?? 0;
      (companyData as any)._liveFreshnessScore = reconciliationLiveScore;
      (companyData as any)._dataFreshnessScore = reconciliationLiveScore;
      if (liveQuorum) {
        (companyData as any)._liveQuorumStatus = liveQuorum.status;
        (companyData as any)._liveQuorumReached = liveQuorum.reached;
        (companyData as any)._liveUnavailable   = liveQuorum.timedOut && !liveQuorum.reached;
        (companyData as any)._liveQuorumWaitedMs = liveQuorum.waitedMs;
        (companyData as any)._scrapeJobQueueTimeMs = liveQuorum.maxQueueTimeMs ?? null;

        // Quorum-gate hard refusal — "a score from insufficient sources is not a score".
        // A class is POSITIVELY satisfied when its source minimum is met by real
        // evidence. Absence-quorum (zero layoffs after 20s) is informative about
        // VISIBILITY, not about company risk — it does NOT count as positive.
        //
        // When ZERO classes are positively satisfied, the audit lacks the evidence
        // floor required to publish a point estimate. The downstream confidence
        // model already caps confidence at 0.45 in this state, but we additionally
        // expose `_quorumInsufficient = true` so the UI can render the explicit
        // "Insufficient evidence to audit — sources unreachable" refusal banner
        // instead of a misleading numeric score.
        const perClass = liveQuorum.status?.perClass ?? {};
        const positiveClassCount = Object.values(perClass).filter(
          (c: any) => c?.satisfied === true && c?.satisfiedByAbsence !== true,
        ).length;
        (companyData as any)._quorumPositiveClassCount = positiveClassCount;
        (companyData as any)._quorumInsufficient = positiveClassCount === 0;
        (companyData as any)._quorumStructuralNote = liveQuorum.status?.structuralNote ?? null;
      } else {
        (companyData as any)._liveUnavailable    = true;
        (companyData as any)._quorumInsufficient = true;
        (companyData as any)._quorumPositiveClassCount = 0;
        (companyData as any)._quorumStructuralNote = null;
      }
      (companyData as any)._liveDataCoverage = {
        liveWonKeys:   reconciledSignals.summary.liveWonKeys,
        dbWonKeys:     reconciledSignals.summary.dbWonKeys,
        liveRatio:     Math.round(liveRatio * 100) / 100,
        genuineApiSignals,
        overallSource: liveData.overallSource,
        degradedSignalClasses: liveData.degradedSignalClasses,
        hardFailures:          liveData.hardFailures ?? [],
        fetchedAt:             liveData.fetchedAt,
      };

      // Scraping enrichment was already applied above (BEFORE reconciliation in v30.0)
      // so Wikipedia headcount could participate as a live signal in the arbitration.
      // Log active sources for observability.
      if (scrapingResultEarly?.activeSources?.length > 0) {
        console.info('[AuditPipeline] Scraping enrichment applied (pre-reconciliation):',
          scrapingResultEarly.activeSources.join(', '));
      }

      // Patch layoffs dataset availability onto companyData
      const connectorResult = liveData._connectorSignals;
      if (connectorResult && connectorResult.layoffsDatasetAvailable === false) {
        (companyData as any)._layoffsDatasetUnavailable = true;
      }

      if (reconciledSignals.missingDataFallbacks.length > 0) {
        console.info('[AuditPipeline] Live data gaps:', reconciledSignals.missingDataFallbacks);
      }
    }
  } catch (liveErr) {
    console.warn('[AuditPipeline] Live enrichment failed:', liveErr);
    trueLiveSignals      = 0;
    trueHeuristicSignals = 7;
    // Mark as zero live coverage so confidence caps fire
    (companyData as any)._dataFreshnessScore = 0;
    (companyData as any)._quorumInsufficient       = true;
    (companyData as any)._quorumPositiveClassCount = 0;
    (companyData as any)._quorumStructuralNote     = null;
    (companyData as any)._liveUnavailable          = true;
    (companyData as any)._liveDataCoverage = {
      liveWonKeys: [], dbWonKeys: [], liveRatio: 0,
      genuineApiSignals: 0, overallSource: 'heuristic',
      degradedSignalClasses: [], hardFailures: ['live_enrichment_threw'],
      fetchedAt: new Date().toISOString(),
    };
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
  //
  // WS5 — Audit Issue #3 (cohort classifier ↔ macroRecessionAgent cycle):
  //   The legacy hardcoded `macroRecessionSignal: 0.3` was a stub that
  //   structurally under-detected the WAVE cohort. We now read from
  //   macroSnapshot.ts — the same source the macroRecessionAgent uses at
  //   Layer 26 — so the classifier and the agent agree on the value
  //   without the agent's verdict being an input to the classifier.
  //   When ws5_source_independent_swarm is off, the helper still returns
  //   0 to preserve the legacy stub behaviour.
  let preCohortWeights: CohortLayerWeights | undefined;
  let preCohortSoftWeights: CohortWeights | undefined;
  // WS4 — Pre-pass cohort label kept in scope so the conformalCI post-process
  // (below) can route lookup to the same cohort scope without re-running
  // classification.
  let preCohortLabel: 'DISTRESS' | 'EFFICIENCY' | 'WAVE' | 'UNKNOWN' | 'GLOBAL' = 'GLOBAL';
  try {
    const macroRecessionSignal = getMacroRecessionSignalForCohortClassifier() || 0.3;
    const preCohortResult = classifyCohort({
      revenueGrowthYoY: shadowCompanyData.revenueGrowthYoY ?? null,
      stock90DayChange: shadowCompanyData.stock90DayChange ?? null,
      freeCashFlowMargin: null,
      aiInvestmentSignal: shadowCompanyData.aiInvestmentSignal ?? null,
      layoffRounds: shadowCompanyData.layoffRounds ?? 0,
      peerLayoffEventsLast90d: 0,
      macroRecessionSignal,
      cashRunwayMonths: null,
      industry: shadowCompanyData.industry ?? 'technology',
      isPublic: shadowCompanyData.isPublic ?? false,
    });
    preCohortWeights     = preCohortResult.recommendedLayerWeights;
    preCohortSoftWeights = preCohortResult.cohortSoftWeights;
    preCohortLabel       = preCohortResult.primaryCohort ?? 'GLOBAL';
  } catch (e) {
    // Pre-pass cohort failure is non-fatal; engine uses flat weights
  }

  // Per-signal timestamps for the decay engine (v40.0).
  // Each is read from the stamped fields on shadowCompanyData (set in reconcileCompanySignals
  // from the live API fetchedAt values). When absent, the engine falls back to
  // companyData.lastUpdated or a neutral 0.75 weight — no regression from prior behaviour.
  const _cd = shadowCompanyData as any;

  // Most recent layoff event date drives breaking_news_layoff decay (3-day half-life).
  // Prefer the event date over the fetch date — a story about a 2-month-old announcement
  // should decay from the announcement date, not from when we fetched the article.
  const _latestLayoffDate: string | null =
    _cd._latestLayoffEventDate
    ?? (Array.isArray(_cd.layoffsLast24Months) && _cd.layoffsLast24Months.length > 0
        ? _cd.layoffsLast24Months[0]?.date ?? null
        : null);

  // Most recent executive departure date from SEC 8-K (14-day half-life).
  const _execDepartureDate: string | null =
    _cd._execDepartureDate ?? _cd._latestExecDeparture ?? null;

  // Most recent sector-level peer layoff event date (21-day half-life).
  const _sectorContagionDate: string | null =
    _cd._sectorContagionDate ?? _cd._latestPeerLayoffDate ?? null;

  const shadowScoreInputs: ScoreInputs = {
    companyData: shadowCompanyData,
    industryData,
    roleTitle: inputs.roleTitle,
    department: inputs.department,
    userFactors: inputs.userFactors,
    liveHiringSignal,
    cohortWeights:     preCohortWeights,
    cohortSoftWeights: preCohortSoftWeights,
    primaryCohort: (preCohortLabel === 'GLOBAL' ? 'UNKNOWN' : preCohortLabel) as
      'DISTRESS' | 'EFFICIENCY' | 'WAVE' | 'UNKNOWN',
    signalTimestamps: {
      breakingNewsLayoffDate:   _latestLayoffDate,
      stockFetchedAt:           _cd._stockFetchedAt ?? null,
      revenueGrowthFetchedAt:   _cd._revenueGrowthFetchedAt ?? null,
      hiringFetchedAt:          _cd._hiringFetchedAt ?? null,
      execDepartureDate:        _execDepartureDate,
      sectorContagionEventDate: _sectorContagionDate,
      layoffHistoryDate:        _latestLayoffDate,
    },
  };

  // ── Segment calibration — inject before scoring, clear in finally ─────────
  // loadCalibration resolves the 3-tier hierarchy:
  //   segment_db (≥80 outcomes) → segment_bootstrap (in-memory research) →
  //   cohort_db (INDIA_IT/US_BIG_TECH) → global_bootstrap.
  // setAuditCalibrationBundle injects the segment multipliers into
  // applyCalibration() inside calculateLayoffScore() without changing its signature.
  let _calibBundle: Awaited<ReturnType<typeof loadCalibration>> | undefined;
  try {
    _calibBundle = await loadCalibration({
      region:       companyData.region,
      industry:     companyData.industry,
      headcount:    (companyData as any).workforce_count ?? null,
      isPublic:     companyData.isPublic,
      fundingStage: (companyData as any).funding_stage ?? null,
    });
    if (_calibBundle.fallbackLevel !== 'global_bootstrap') {
      setAuditCalibrationBundle(_calibBundle.layerCalibration);
    }
    // Inject DB-backed L1 threshold arrays when segment regression has ≥80 outcomes.
    // segment_db means the DB row passed the MIN_SEGMENT_OUTCOMES gate in fetchActiveForSegmentKey.
    // All other fallback levels (segment_bootstrap, cohort_db, global_bootstrap) use bootstrap arrays.
    if (_calibBundle.fallbackLevel === 'segment_db') {
      setAuditL1Thresholds(
        _calibBundle.revenueGrowthThresholds,
        _calibBundle.stockTrendThresholds,
      );
    }
  } catch {
    // Non-fatal — scoring runs with global bootstrap if calibration load fails
    _calibBundle = undefined;
  }

  _timer.mark('engine_start');
  const shadowScoreResult = calculateLayoffScore(shadowScoreInputs);
  _timer.mark('engine_end');

  // ── DAG phase ─────────────────────────────────────────────────────────
  //
  // Builds the AuditContext, emits `core` (engine score + confidence),
  // and runs every layer registered in domain/pipeline/layers/. Migrated
  // layers (macro_snapshot, cohort_class, stealth_layoff, acquisition_
  // premium, conformal_ci) execute here with parallelism, typed outputs,
  // and structured spans. Their outputs are read downstream via
  // ctx.read(...) where the legacy `companyData as any._x` channel has
  // been replaced.
  //
  // The legacy try/catch blocks below (for layers not yet migrated)
  // continue to run unchanged. The two paths share the same companyData,
  // so a partially-migrated pipeline is correct.
  let dagContext: AuditContext | null = null;
  // v39.0 D1: kill-switch. Flag absent / not 'off' → DAG runs (legacy
  // behaviour preserved). Explicit 'off' in the engine_feature_flags
  // table → skip the DAG and let pure legacy try/catch blocks handle
  // every layer. Safety net for a production duplicate-write incident.
  const dagFlag = (() => {
    try { return evaluateFlagSync('v39_dag_runner_active'); }
    catch { return { isActive: false, isShadow: false, mode: 'off' as const }; }
  })();
  const dagDisabled = dagFlag.mode === 'off' || (dagFlag.mode as any) === 'deprecated';
  let _dagDegradedCount = 0;
  _timer.mark('dag_phase_start');
  try {
    if (dagDisabled) {
      auditPipelineLog.info('dag.phase.disabled_by_flag', { company: inputs.companyName });
    }
    const dagPhase = dagDisabled ? null : await runDagPhase(inputs, companyData, {});
    if (!dagPhase) {
      // Skip the dagContext.emit / bridge block — legacy paths cover all layers.
      throw new Error('__dag_disabled__'); // routes to the catch below WITHOUT logging a failure
    }
    dagContext = dagPhase.ctx;
    // Emit `core` after the engine so dependent layers (conformal_ci)
    // can read it via ctx.require('core'). This is the bridge moment —
    // once the scoring layer itself is ported, the engine call moves
    // INTO the DAG and this manual emit goes away.
    dagContext.emit('core', {
      total: shadowScoreResult.score,
      confidencePercent: shadowScoreResult.confidencePercent ?? 0,
    });
    // Surface DAG outputs onto the legacy private-field channel so
    // unmigrated downstream layers keep reading what they used to.
    // This is the legacy-compat bridge; deletes itself as each consumer
    // migrates to ctx.read(...).
    const legacyBag = companyData as unknown as Record<string, unknown>;
    const stealth = dagContext.read('stealth_layoff');
    if (stealth) legacyBag._stealthSignal = stealth;
    const acquisition = dagContext.read('acquisition_premium');
    if (acquisition?.detected) legacyBag._acquisitionPremium = acquisition;
    const conformal = dagContext.read('conformal_ci');
    if (conformal) legacyBag._conformalBundle = conformal;

    auditPipelineLog.info('dag.phase.complete', {
      requestId: dagContext.requestId,
      layers: dagPhase.registryResult.records.length,
      successes: dagPhase.registryResult.records.filter((r) => r.status === 'success').length,
      durationMs: dagPhase.registryResult.totalMs,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // v39.0 D1: the kill-switch sentinel routes through here intentionally
    // (cleaner control flow than a parallel branch). Only log when it's a
    // real failure.
    if (msg !== '__dag_disabled__') {
      auditPipelineLog.warn('dag.phase.failed', {
        company: inputs.companyName,
        error: msg,
      });
    }
    _dagDegradedCount++;
  }
  _timer.mark('dag_phase_end');
  // v40.0: track DAG degraded layer count — surfaced on hybridResult after assembly

  // WS4 — Conformal CI post-processing (Audit Issue #26).
  //
  // When `ws4_conformal_ci` is on AND a cohort calibration set with
  // ≥80 outcomes exists, override the heuristic `confidenceInterval`
  // on the engine result with the empirically-calibrated conformal
  // interval. Internally `computeConformalCI` falls back to the
  // legacy heuristic widths when calibration data is insufficient,
  // so this call is always safe.
  //
  // The full ConformalBundle is stashed on companyData via the
  // `_conformalBundle` private channel so the empiricalConfidenceModel
  // can read it (downstream in hybridConsensusBuilder) without
  // re-computing.
  try {
    const ws4Flag = evaluateFlagSync('ws4_conformal_ci');
    if (ws4Flag.isActive || ws4Flag.isShadow) {
      const cohortLabel: ConformalCohort = preCohortLabel as ConformalCohort;
      const bundle = await computeConformalCI(shadowScoreResult.score, { cohort: cohortLabel });
      (companyData as any)._conformalBundle = bundle;
      // Only override the engine's CI when conformal returned a calibrated
      // interval (not the heuristic fallback) — preserves legacy widths
      // until calibration accumulates.
      if (bundle.source === 'conformal') {
        const i90 = bundle.intervals.find((i) => Math.abs(i.nominalCoverage - 0.9) < 0.01);
        if (i90) {
          shadowScoreResult.confidenceInterval = {
            low: i90.low,
            high: i90.high,
            range: i90.high - i90.low,
            isEstimate: true,
          } as typeof shadowScoreResult.confidenceInterval;
        }
      }
    }
  } catch (err) {
    // Telemetry; never block scoring on confidence post-processing.
    auditPipelineLog.warn('conformal_ci.post_process_failed', {
      company: inputs.companyName,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // WS3 — Stealth layoff detector (Audit Issue #24).
  //
  // Reads LinkedIn workforce_snapshots to detect 6-month headcount
  // contractions that never surfaced as an announced layoff round.
  // Applies a graduated score floor when stealth contraction is
  // detected with no offsetting announced round. Flag-gated; no-op
  // when the workforce_snapshots table is empty.
  try {
    const stealthFlag = evaluateFlagSync('ws3_stealth_layoff_detector');
    if (stealthFlag.isActive || stealthFlag.isShadow) {
      const canonical =
        (companyData as unknown as { canonicalName?: string }).canonicalName
        ?? companyData.name
        ?? inputs.companyName;
      const stealthSignal = await detectStealthLayoff({
        companyCanonicalName: canonical,
        companyDisplayName: companyData.name,
      });
      if (stealthSignal.flagged) {
        const oldScore = shadowScoreResult.score;
        // Hard floor based on severity — replaces additive applyStealthFloor().
        // SILENT_TRIM:  floor 60 — mild hidden reduction, some uncertainty
        // SILENT_CUT:   floor 65 — clear material stealth cut
        // SILENT_PURGE: floor 70 — severe cut, documented in Section 6.3
        const stealthFloor =
          stealthSignal.severity === 'SILENT_PURGE' ? 70 :
          stealthSignal.severity === 'SILENT_CUT'   ? 65 : 60;
        if (stealthFloor > oldScore) {
          shadowScoreResult.score = stealthFloor;
          // Pre-floor score for badge: "Floor: 70 → Formula: 42"
          if (!(shadowScoreResult as any)._formulaScorePreFloor) {
            (shadowScoreResult as any)._formulaScorePreFloor = oldScore;
          }
          // Register in the unified kill-switch tracking system.
          shadowScoreResult.killSwitchFloors = {
            ...(shadowScoreResult.killSwitchFloors ?? {}),
            stealth_layoff_floor: stealthFloor,
          };
          shadowScoreResult.activatedKillSwitches = [
            ...(shadowScoreResult.activatedKillSwitches ?? []),
            'stealth_layoff_floor',
          ];
          shadowScoreResult.killSwitchApplied = true;
          (shadowScoreResult as any).killSwitchName =
            (shadowScoreResult as any).killSwitchName ?? 'stealth_layoff_floor';
        }
        (companyData as any)._stealthSignal = stealthSignal;
        shadowScoreResult.signalQuality?.missingDataFallbacks?.push(
          `WS3 stealth floor applied: ${oldScore} → ${shadowScoreResult.score} (${stealthSignal.rationale})`,
        );
      } else {
        (companyData as any)._stealthSignal = stealthSignal;
      }
    }
  } catch (err) {
    auditPipelineLog.warn('stealth_layoff.detection_failed', {
      company: inputs.companyName,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // WS3 — Acquisition premium correction (Audit Issue #22).
  //
  // When the company is the target of an announced acquisition and the
  // stock has surged on deal premium, the legacy L1 reads that surge as
  // health and LOWERS risk. We neutralise the stock-derived health
  // benefit so the score is not masked by deal premium.
  //
  // M&A context is read directly from `inputs.userFactors` (set by the
  // audit form when the user discloses an active M&A event). This is
  // the SAME source `computeMARisk` reads at step 31; reading it here
  // ensures the premium-correction signal is available when the score
  // is computed, not after.
  try {
    const evidenceFlag = evaluateFlagSync('ws3_evidence_hierarchy');
    if (evidenceFlag.isActive || evidenceFlag.isShadow) {
      const uf = inputs.userFactors as unknown as Record<string, unknown> | undefined;
      const maEventType = (uf?.maEventType ?? 'NONE') as Parameters<typeof detectAcquisitionPremium>[0]['maEventType'];
      const premium = detectAcquisitionPremium({
        maEventType,
        monthsPostClose: typeof uf?.maMonthsPostClose === 'number' ? (uf.maMonthsPostClose as number) : undefined,
        isAcquiredEmployee: typeof uf?.isAcquiredEmployee === 'boolean' ? (uf.isAcquiredEmployee as boolean) : true,
        stock90DayChange: companyData.stock90DayChange ?? null,
      });
      if (premium.detected) {
        (companyData as any)._acquisitionPremium = premium;
        shadowScoreResult.signalQuality?.missingDataFallbacks?.push(
          `WS3 acquisition premium: ${premium.rationale}`,
        );
      }
    }
  } catch (err) {
    auditPipelineLog.warn('acquisition_premium.check_failed', {
      company: inputs.companyName,
      error: err instanceof Error ? err.message : String(err),
    });
  }

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
    // WS11 — invokeEdgeFunction injects x-request-id so the calculate-hybrid-risk
    // pipeline_runs row joins to the originating audit by request_id.
    const { data: hybridRes, error: hybridErr } = await invokeEdgeFunction<any>(
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
  // v40.0 FIX-A: attach userFactors immediately so downstream intelligence layers
  // (especially fetchIntelligenceBrief at line ~2822) can read it. Previously only
  // attached to finalResult AFTER all layers ran, breaking the LLM brief's profile
  // context and disabling profile-aware caching.
  (hybridResult as any).userFactors = inputs.userFactors;
  // GAP-A03: forward stealthSignal from companyData onto hybridResult so
  // TransparencyTab can show actual delta%, severity, headcount, and data source.
  // Previously _stealthSignal was attached to companyData only and lost after this point.
  if ((companyData as any)._stealthSignal) {
    hybridResult._stealthSignal = (companyData as any)._stealthSignal;
  }
  // v40.0: surface DAG degradation count collected before hybridResult was assembled
  if (_dagDegradedCount > 0) (hybridResult as any)._dagDegradedLayerCount = _dagDegradedCount;
  // Surface the LOW_DATA confidence-floor warning (set by hybridConsensusBuilder
  // when 3+ critical signals are null) onto the final HybridResult so the
  // dashboard can render the explicit "low confidence" banner.
  if (hybridPayload.consensusData.lowDataWarning) {
    hybridResult.signalQuality = {
      ...hybridResult.signalQuality,
      lowDataWarning: hybridPayload.consensusData.lowDataWarning,
    };
  }

  // v40 Quorum Gate — surface the refusal flags onto hybridResult so the
  // LayoffCalculator banner can render the "Quorum not met" red strip.
  // Source of truth is companyData (set in the live-reconciliation block). The
  // flags ALSO flow via hybridConsensusBuilder for the hybrid-scorer path,
  // but we re-apply here so legacy / fallback paths also surface the state.
  {
    const qi  = (companyData as any)._quorumInsufficient;
    const qc  = (companyData as any)._quorumPositiveClassCount;
    const qs  = (companyData as any)._quorumStructuralNote;
    const sqt = (companyData as any)._scrapeJobQueueTimeMs;
    if (typeof qi === 'boolean') {
      (hybridResult as any)._quorumInsufficient = qi;
    }
    if (typeof qc === 'number') {
      (hybridResult as any)._quorumPositiveClassCount = qc;
    }
    if (typeof qs === 'string' || qs === null) {
      (hybridResult as any)._quorumStructuralNote = qs;
    }
    if (typeof sqt === 'number' || sqt === null) {
      (hybridResult as any)._scrapeJobQueueTimeMs = sqt;
    }
    if ((companyData as any)._liveQuorumStatus) {
      (hybridResult as any)._liveQuorumStatus = (companyData as any)._liveQuorumStatus;
    }
  }

  // BUG-05: Forward private-regime confidence ceiling disclosure from
  // hybridConsensusBuilder onto hybridResult so TransparencyTab can show
  // "Evidence quality: X% → Structural cap: Y%" when the ceiling fires.
  if (hybridPayload._evidencePreCeiling != null) {
    hybridResult._confidencePreCeiling  = hybridPayload._evidencePreCeiling;
    hybridResult._confidenceRegimeCeiling = hybridPayload._evidenceCeilingValue ?? null;
    hybridResult._confidenceRegimeLabel = hybridPayload._evidenceRegimeLabel ?? null;
  }

  // v32: REMOVED the v31 first-audit 45% cap. The audit pipeline now waits for
  // live quorum upstream (up to 45s) — by the time we reach this point, either
  // quorum was met (full confidence) or the ceiling fired and the confidence
  // model has already applied the live-unavailable cap. We do attach the quorum
  // result as a positive diagnostic so the UI can render per-stage status.
  if (liveQuorum) {
    const sq: any = hybridResult.signalQuality ?? {};
    hybridResult.signalQuality = {
      ...sq,
      liveQuorum: {
        reached:  liveQuorum.reached,
        timedOut: liveQuorum.timedOut,
        waitedMs: liveQuorum.waitedMs,
        perClass: liveQuorum.status.perClass,
      },
    };

    // v39.0 A3 — Live-quorum timeout confidence cap.
    // When the 45s scrape ceiling fires WITHOUT reaching quorum, we proceeded
    // with heuristic / DB-only data. Previously the UI showed the same
    // confidence as a full-live audit. Cap finalConfidence at 60% and surface
    // the degradation reason so the banner can explain the cap to the user.
    const quorumDegraded = liveQuorum.timedOut && !liveQuorum.reached;
    if (quorumDegraded) {
      const currentConf = hybridResult.confidencePercent ?? 70;
      if (currentConf > 60) {
        hybridResult.confidencePercent = 60;
      }
      (hybridResult as any).degradationReason = 'live_quorum_timeout';
      (hybridResult as any).degradationDetail = `Live scrape ceiling hit after ${Math.round((liveQuorum.waitedMs ?? 0) / 1000)}s — confidence capped at 60%.`;
      const caps: string[] = Array.isArray((hybridResult.signalQuality as any)?.confidenceCapsApplied)
        ? [...((hybridResult.signalQuality as any).confidenceCapsApplied)]
        : [];
      if (!caps.includes('live_quorum_timeout')) caps.push('live_quorum_timeout');
      (hybridResult.signalQuality as any).confidenceCapsApplied = caps;
      try {
        markFallback({
          layerId: 'auditDataPipeline.liveQuorum',
          reason: 'live_quorum_timeout' as any,
          fallbackValue: { waitedMs: liveQuorum.waitedMs ?? 0, perClass: liveQuorum.status.perClass },
        });
      } catch { /* observability is best-effort */ }
    }
  }
  _timer.mark('map_to_hybrid_end');

  // ── v39.0 D2: Unified freshness score ───────────────────────────────────────
  // Consolidate the 4+ scattered freshness signals into a single canonical
  // verdict. All UI surfaces should read hybridResult.unifiedFreshness rather
  // than recomputing from raw companyData fields.
  try {
    const unifiedFreshness = computeUnifiedFreshness({
      companyData,
      macroSignal: (hybridResult as any).blsMacroSignal,
      industryRiskAgeDays: getIndustryRiskAgeDays(),
      liveDataCoverage: (hybridResult as any)._liveDataCoverage ?? (companyData as any)._liveDataCoverage,
    });
    (hybridResult as any).unifiedFreshness = unifiedFreshness;
  } catch (e) {
    // Non-fatal — the legacy underscore fields still flow through.
    noteEngineFailure('unifiedFreshness', e);
  }

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

  // NOTE: Job Market Liquidity moved to step 23 (after peer contagion) so that
  // geo cluster supply-surge data from peerContagion.geoCluster can be passed in.
  // See step 23 below.

  // 2. Escape Path Optimizer — top-3 risk-reduction moves
  // Pre-compute relocation options inline so location_shift step can cite specific
  // candidate cities (Berlin/Amsterdam/Dublin for London users) with backing data
  // instead of generic "research top 5 cities" guidance.
  try {
    const userCity = (inputs.userFactors as any).city as string | undefined;
    const userRegion = companyData.region ?? 'US';
    // Lazy-compute relocation options (uses geographicOptionalityEngine internals)
    let relocationOptionsTop3: any[] | undefined;
    try {
      const geoForEscape = computeGeographicOptionality({
        city: userCity ?? '',
        region: userRegion,
        remoteEligibility: (inputs.userFactors as any).remoteEligibility ?? 'UNKNOWN',
        workTypeKey: resolvedRole.canonicalKey ?? inputs.oracleKey ?? '_default',
        financialRunwayMonths: inputs.financialRunwayMonths ?? null,
      });
      relocationOptionsTop3 = geoForEscape.relocationOptions?.candidates.slice(0, 3).map(c => ({
        cityName: c.cityName,
        flagEmoji: c.flagEmoji,
        employerCount: c.employerCount,
        avgPlacementWeeks: c.avgPlacementWeeks,
        salaryDisplayLocal: c.salaryDisplayLocal,
        salaryMedianUSD: c.salaryMedianUSD,
        visaPathwayName: c.visaPathwayName,
        visaRequired: c.visaRequired,
        englishOnlyRoleFraction: c.englishOnlyRoleFraction,
        totalFitScore: c.totalFitScore,
      }));
    } catch {
      relocationOptionsTop3 = undefined;
    }

    const escapePaths = computeEscapePaths({
      currentScore: hybridResult.total,
      breakdown: finalBreakdown,
      oracleKey: resolvedRole.canonicalKey ?? inputs.oracleKey ?? 'generic',
      industry: companyData.industry ?? 'technology',
      tenureYears: inputs.userFactors.tenureYears,
      region: userRegion,
      companyData,
      uniquenessDepth: (inputs.userFactors as any).uniquenessDepth,
      performanceTier: (inputs.userFactors as any).performanceTier,
      relocationOptionsTop3,
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

  // 3.5. Parent-Subsidiary Propagation — how parent company signals propagate
  // by office function (engineering GCC, EMEA revenue, APAC operations, shared services).
  // Only fires when the company is detected as a subsidiary of a known parent.
  // Separate from IndiaRiskEnrichment (which handles India-specific sector intelligence).
  try {
    const parentPropagation = computeParentPropagation({
      companyName: companyData.name,
      region:      companyData.region ?? 'US',
      roleTitle:   inputs.roleTitle,
      city:        (inputs.userFactors as any).city,
      employeeCount: companyData.employeeCount,
    });
    if (parentPropagation) {
      (hybridResult as any).parentPropagation = parentPropagation;
      // v40.0: attach to companyData so the Tier B archetype gates (specifically
      // apac_hyperscaler_localization) can read parent country + recent layoff
      // date + propagation lag without an extra dependency on hybridResult.
      // _parentPropagation is intentionally namespaced with underscore so it's
      // distinct from the canonical static companyData fields.
      (companyData as any)._parentPropagation = {
        parentName:        parentPropagation.parentName,
        parentCountry:     parentPropagation.parentCountry,
        lagMonths:         parentPropagation.lagMonths,
        // Try to source the parent's most recent layoff date from the parent's
        // companyDatabase entry. parentPropagation today doesn't expose this
        // directly, so we look it up via the same alias path.
        parentLayoffDate:  (() => {
          try {
            const pn = parentPropagation.parentName?.toLowerCase().trim();
            if (!pn) return undefined;
            // Lazy require to avoid circular dep on companyDatabase.
            // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
            const { COMPANY_DATABASE } = require("../data/companyDatabase") as { COMPANY_DATABASE: Record<string, any> };
            for (const k of Object.keys(COMPANY_DATABASE)) {
              if (k.toLowerCase().includes(pn) || pn.includes(k.toLowerCase())) {
                const ev = COMPANY_DATABASE[k]?.layoffsLast24Months?.[0]?.date;
                if (typeof ev === 'string') return ev;
              }
            }
          } catch { /* parent data unavailable */ }
          return undefined;
        })(),
      };
    }
  } catch (e) {
    noteEngineFailure('parentSubsidiaryPropagation', e);
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
    // Derive a coarse role-family prefix from the canonical oracle key so the
    // lever action text references a role-appropriate AI workflow rather than a
    // generic template (e.g. 'sw_backend' → 'sw', 'hc_nurse' → 'hc').
    const canonicalKey = (resolvedRole.canonicalKey ?? inputs.oracleKey ?? '').toLowerCase();
    const sensRolePrefix = canonicalKey.split('_')[0] || 'default';
    const scoreSensitivity = computeScoreSensitivity({
      currentScore: hybridResult.total,
      breakdown: finalBreakdown,
      context: {
        roleLabel:   inputs.roleTitle || undefined,
        rolePrefix:  sensRolePrefix,
        companyName: companyData.name || undefined,
        industry:    companyData.industry || undefined,
        region:      companyData.region || undefined,
        visaStatus:  (inputs.userFactors as any)?.visaStatus ?? null,
      },
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
    // MENA gratuity wiring: pass country + tenure so the runway engine adds the
    // end-of-service buffer (UAE 21d/yr first 5 + 30d/yr thereafter, Saudi half-
    // month/yr first 5 + month/yr thereafter, etc.) to the effective runway.
    // For a 7-year UAE employee this lifts effective runway by ~4.1 months effective
    // (165 days basic × 0.75 → ≈5.5mo basic × 0.75 = 4.1mo total-pay equivalent),
    // which can change the urgency tier from "critical" to "comfortable".
    //
    // CRITICAL: visa status takes priority over companyData.region. An Indian-
    // headquartered GCC (Infosys UAE, Wipro MENA) has region='IN', so passing
    // companyData.region alone would give zero gratuity to a UAE-visa holder.
    // resolveGratuityCountryFromVisa() returns null for non-MENA or ambiguous
    // (gcc_sponsored) visas, falling back to companyData.region.
    const gratuityCountryCode =
      resolveGratuityCountryFromVisa(inputs.userFactors.visaStatus) ?? companyData.region;
    const financialRunway = computeFinancialRunway({
      financialRunwayMonths: runwayMonths,
      currentScore: hybridResult.total,
      escapePaths: (hybridResult as any).escapePaths,
      jobMarketLiquidity: (hybridResult as any).jobMarketLiquidity,
      countryCode: gratuityCountryCode,
      tenureYears: inputs.userFactors.tenureYears,
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
    const uf13 = inputs.userFactors as any;

    // ── Derive inputs that were previously always null/false ─────────────────
    //
    // hasAiSkills: uf13.hasAiSkills is almost never set explicitly. Derive from
    // self-rated skills (selfRatedSkills array) and targetSkills — any mention of
    // AI tooling keywords signals genuine AI fluency. Falls back to explicit field.
    const aiKeywords = /\b(ai|ml|llm|gpt|langchain|copilot|claude|openai|pytorch|tensorflow|hugging.?face|prompt.?eng|vector.?db|rag\b|fine.?tun|generative)/i;
    const allSkillText = [
      ...(uf13.selfRatedSkills ?? []),
      ...(uf13.targetSkills ?? []),
      uf13.jobTitle ?? '',
      resolvedRole.canonicalKey ?? '',
    ].join(' ');
    const derivedHasAiSkills: boolean =
      uf13.hasAiSkills === true ? true
      : uf13.hasAiSkills === false ? false
      : aiKeywords.test(allSkillText) || ['ml_engineer', 'ai_engineer', 'llm_engineer', 'data_scientist', 'nlp_engineer', 'cv_engineer'].some(k => (resolvedRole.canonicalKey ?? '').includes(k));

    // networkStrengthSelfReport: uf13.networkStrength is rarely set. Map
    // networkLeverage score (0–100) → categorical string when direct report absent.
    const nlScoreForResilience: number | undefined = (hybridResult as any).networkLeverage?.networkScore;
    const derivedNetworkStrength: ResilienceInputs['networkStrengthSelfReport'] =
      uf13.networkStrength != null ? uf13.networkStrength
      : nlScoreForResilience != null
        ? nlScoreForResilience >= 70 ? 'strong'
          : nlScoreForResilience >= 45 ? 'moderate'
          : nlScoreForResilience >= 25 ? 'weak'
          : 'weak'
      : undefined;

    // hasAlternativeIncome: explicit flag or infer from freelancer detection (jobTitle).
    const derivedHasAlternativeIncome: boolean =
      uf13.hasAlternativeIncome === true ? true
      : uf13.hasAlternativeIncome === false ? false
      : /\b(freelance|consulting|contract|self.?employ|side.?hustle|indie|founder)/i.test(uf13.jobTitle ?? '');

    // escapePaths: use 0 as fallback (unknown = no confirmed paths), not 2.
    // The previous fallback of 2 gave P4 Career Optionality a score of 55 for
    // everyone without escape path data — masking a real unknown as "adequate".
    const resolvedEscapePathCount = ((hybridResult as any).escapePaths?.paths?.length) ?? 0;

    const careerResilience = computeCareerResilience({
      currentScore: hybridResult.total,
      financialRunwayMonths: inputs.financialRunwayMonths || 6,
      tenureYears: inputs.userFactors.tenureYears,
      oracleKey: resolvedRole.canonicalKey ?? inputs.oracleKey ?? 'generic',
      industry: companyData.industry ?? 'technology',
      region: companyData.region ?? 'US',
      uniquenessDepth: uf13.uniquenessDepth,
      knowledgeType: uf13.knowledgeType,
      performanceTier: uf13.performanceTier,
      hasAiSkills:             derivedHasAiSkills,
      hasAlternativeIncome:    derivedHasAlternativeIncome,
      networkStrengthSelfReport: derivedNetworkStrength,
      escapePaths:             resolvedEscapePathCount,
      jobMarketLiquidityScore: jobLiquidity?.score,
      salaryPreservationPct:   competitive?.salaryPreservationPct,
      hasDependents:           uf13.hasDependents ?? undefined,
      dualIncomeHousehold:     uf13.dualIncomeHousehold ?? undefined,
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

    // v40.0 FIX-3: Compute scoreDelta (30-day velocity) from score history.
    // SummaryTab reads result.scoreDelta but it was never populated — velocity
    // badge silently never rendered. The history entry closest to 30 days ago
    // is used as the comparison point.
    if (scoreHistory.length >= 2) {
      const now30 = Date.now();
      // Find the entry closest to 30 days ago (may be the last entry)
      const prev = scoreHistory.slice(1).reduce((best: any, entry: any) => {
        const age = Math.abs((now30 - (entry.timestamp ?? 0)) - 30 * 86_400_000);
        const bestAge = Math.abs((now30 - (best.timestamp ?? 0)) - 30 * 86_400_000);
        return age < bestAge ? entry : best;
      }, scoreHistory[1]);
      // v40.0 FIX-12: guard against NaN/Infinity propagation from corrupted history
      const prevScore = typeof prev?.score === 'number' && isFinite(prev.score) ? prev.score : null;
      const currentScore = typeof hybridResult.total === 'number' && isFinite(hybridResult.total)
        ? hybridResult.total : null;
      if (prevScore !== null && currentScore !== null) {
        const delta = Math.round(currentScore - prevScore);
        hybridResult.scoreDelta = {
          delta30d: delta,
          direction: delta > 1 ? 'worsening' : delta < -1 ? 'improving' : 'stable',
        };
      }
    }
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
        citizenshipRegion: uf.citizenshipRegion ?? undefined,
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
      const ufNego = inputs.userFactors as any;
      // v40.0: derive seniority bracket for email script tier selection
      const negoSeniorityRaw = deriveSeniorityBracket(
        inputs.userFactors.tenureYears ?? 0,
        resolvedRole?.canonicalKey ?? inputs.oracleKey ?? null,
      );
      const negoSeniority: 'junior' | 'mid' | 'senior' | 'principal' =
        negoSeniorityRaw === 'staff_plus' ? 'principal'
        : (negoSeniorityRaw as 'junior' | 'mid' | 'senior' | 'principal');

      const negotiationIntelligence = computeNegotiationIntelligence({
        competitiveIntelligence: compIntel,
        financialRunway: runway,
        currentScore: hybridResult.total,
        tenureYears: inputs.userFactors.tenureYears,
        performanceTier: inputs.userFactors.performanceTier ?? 'average',
        industry: companyData.industry ?? 'technology',
        workTypeKey: resolvedRole.canonicalKey ?? 'default', // GAP J: role-specific scripts
        companyName: companyData.name,   // v40.0: for personalised email body
        seniorityBracket: negoSeniority, // v40.0: drives email tier + knowledge transfer clause
        // v39.0 B3: profile signals (visa, family, equity vesting) modulate
        // walk-away framing, urgency, and red-line risks.
        userProfile: {
          visaStatus: ufNego.visaStatus ?? null,
          hasDependents: ufNego.hasDependents ?? null,
          dualIncomeHousehold: ufNego.dualIncomeHousehold ?? null,
          priorLayoffSurvived: ufNego.priorLayoffSurvived ?? null,
          hasEquityVesting: ufNego.hasEquityVesting ?? null,
          equityVestMonths: ufNego.equityVestMonths ?? null,
        },
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

  // 22. Peer Contagion — sector wave propagation model.
  //
  // DEBT-1 migration: if the DAG already computed peer_contagion in its
  // earlier phase, reuse that output. Otherwise (legacy path / DAG
  // failed) fall back to a direct invocation. Reading the DAG result
  // first avoids the duplicate I/O during the migration period.
  try {
    const fromDag = dagContext?.read('peer_contagion');
    const peerContagion = fromDag ?? await computePeerContagionLive({
      companyName: companyData.name,
      industry: companyData.industry ?? 'technology',
      currentScore: hybridResult.total,
      city: (inputs.userFactors as any).city,
    });
    (hybridResult as any).peerContagion = peerContagion;
  } catch (e) {
    noteEngineFailure('peerContagion', e);
  }

  // 22.3. Job Market Liquidity — re-employment velocity.
  // Placed AFTER peer contagion (step 22) so geo cluster supply-surge data is available.
  // The geoCluster from peerContagion extends monthsToReemploy when co-located peers
  // are cutting simultaneously (Seattle SWE scenario: Amazon + Microsoft both cutting
  // = ~10,000 displaced engineers in the same metro competing for the same roles).
  try {
    const peerContagionResult = (hybridResult as any).peerContagion;
    const geoCluster = peerContagionResult?.geoCluster;
    // Remote-first conversion: when userFactors.remoteEligibility = 'FULLY_REMOTE',
    // L9 should treat accessible market as globalOpenings × 0.35 (international
    // hiring friction discount) rather than city/region-bounded openings.
    const remoteEligibility = (inputs.userFactors as any).remoteEligibility as string | undefined;
    const isRemoteFirst = remoteEligibility === 'FULLY_REMOTE';
    // Pull globalOpenings from careerPathMarket for the user's CURRENT role
    // (not their target pivot). Falls back to 0 when not in the registry.
    const _resolvedRoleKey = resolvedRole.canonicalKey ?? inputs.oracleKey ?? 'generic';
    let _globalOpenings: number | undefined;
    try {
      const _market = getCareerPathMarketSync(_resolvedRoleKey);
      _globalOpenings = _market?.globalOpenings;
    } catch { /* ignore — globalOpenings stays undefined */ }

    const jobMarketLiquidity = computeJobMarketLiquidity({
      oracleKey: _resolvedRoleKey,
      industry: companyData.industry ?? 'technology',
      tenureYears: inputs.userFactors.tenureYears,
      region: companyData.region ?? 'US',
      companySize,
      isPublic: companyData.isPublic ?? false,
      riskScore: hybridResult.total,
      uniquenessDepth: (inputs.userFactors as any).uniquenessDepth,
      performanceTier: (inputs.userFactors as any).performanceTier,
      city: (inputs.userFactors as any).city,
      geoClusterActiveCuts: geoCluster?.geoClusteredCuts ?? 0,
      geoConcentrationScore: geoCluster?.geoConcentrationScore,
      isRemoteFirst,
      globalOpenings: _globalOpenings,
    });
    (hybridResult as any).jobMarketLiquidity = jobMarketLiquidity;
  } catch (e) {
    noteEngineFailure('jobMarketLiquidity', e);
  }

  // 22.5. Role-Industry Composite — cross-role × industry risk modifier
  // Resolves whether this specific role is protected or exposed in this industry.
  // Result informs scenario plan roleCategory and contingency plan leverage.
  try {
    const riRoleGroup = (hybridResult as any).resolvedRoleGroup
      ?? resolvedRole?.canonicalKey
      ?? inputs.roleTitle
      ?? 'swe';
    const riComposite = computeRoleIndustryComposite(
      riRoleGroup,
      companyData.industry ?? 'technology',
    );
    (hybridResult as any).roleIndustryComposite = riComposite;
  } catch (e) {
    noteEngineFailure('roleIndustryComposite', e);
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
    // Phase 5: debt obligations shorten effective runway (higher monthly burn).
    // Only adjust when both expenses and debt are known, so we never inflate risk
    // from a missing field. runway × expenses/(expenses+debt).
    const _baseRunway = inputs.financialRunwayMonths ?? 0;
    const _debtMonthly = uf.monthlyDebtObligationsUsd ?? null;
    const _expensesMonthly = uf.monthlyExpensesUsd ?? null;
    const _effectiveRunway =
      _debtMonthly != null && _debtMonthly > 0 && _expensesMonthly != null && _expensesMonthly > 0
        ? Math.round(_baseRunway * (_expensesMonthly / (_expensesMonthly + _debtMonthly)) * 10) / 10
        : _baseRunway;
    const strategySynthesis = computeStrategySynthesis({
      currentScore: hybridResult.total,
      collapseStage: (hybridResult as any).collapseStage ?? null,
      tenureYears: inputs.userFactors.tenureYears ?? 3,
      financialRunwayMonths: _effectiveRunway,
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
      // ── v48.0 personalization signals — previously unwired, which forced the
      //    engine onto its generic 5-strategy path (no VISA_WINDOW_EXIT,
      //    EQUITY_HARVEST_THEN_EXIT, GEOGRAPHIC_ARBITRAGE, or role-family actions).
      ...buildStrategyPersonalizationSignals(inputs, companyData, hybridResult, resolvedRole),
    });
    (hybridResult as any).strategySynthesis = strategySynthesis;

    // Phase 3 (Career OS): attach explicit stay/leave verdict immediately after strategy.
    // Pure sync function — no await, no DB call.
    const _strat = strategySynthesis.overallStrategy;
    const _bd = hybridResult.breakdown;
    (hybridResult as any).careerDecision = generateCareerDecision(
      hybridResult.total ?? 0,
      _strat,
      { L1: _bd.L1, L2: _bd.L2, L3: _bd.L3, L4: _bd.L4, L5: _bd.L5 },
      ((inputs.userFactors ?? {}) as any).riskTolerance ?? null,
    );

    // Phase 3 (Career OS): attach causal explanation from top breakdown dimensions.
    const _causalDims = [
      { key: 'L1', label: 'Company financial vulnerability', val: _bd.L1 },
      { key: 'L2', label: 'Layoff & instability history',   val: _bd.L2 },
      { key: 'L3', label: 'AI role displacement risk',      val: _bd.L3 },
      { key: 'L4', label: 'Industry headwinds',             val: _bd.L4 },
      { key: 'L5', label: 'Regional market conditions',     val: _bd.L5 },
    ].sort((a, b) => b.val - a.val);
    const _topCausal = _causalDims[0];
    const _secCausal = _causalDims[1];
    (hybridResult as any).causalExplanation = {
      topCausalFactor: _topCausal.label,
      causalChain: `${_topCausal.label} → ${_secCausal.label} → overall risk elevation`,
      scoreIncreasedBecause: [
        `${_topCausal.label} accounts for the largest share of risk at ${Math.round(_topCausal.val * 100)}/100.`,
        `${_secCausal.label} is the secondary contributor at ${Math.round(_secCausal.val * 100)}/100.`,
      ],
    };
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
    // estimateMarketMedian() returns a USD-denominated (region-PPP-adjusted)
    // figure. userSalary, however, is entered in the user's LOCAL currency.
    // Passing it raw made an Indian user's ₹2,000,000 compare against a ~$24,000
    // median → a nonsensical +8,000% "vs. market" delta and a wrong pay-position
    // classification for every non-USD user. Convert to USD first so both sides
    // of the comparison share a unit.
    const rawSalary = (uf14 as any).userSalary as number | undefined | null;
    const salaryCurrency = (uf14 as any).localCurrencyCode as string | undefined;
    const userSalaryUsd = rawSalary != null && rawSalary > 0
      ? Math.round(convertToUsd(rawSalary, salaryCurrency ?? 'USD'))
      : undefined;
    const compensationRisk = computeCompensationRisk({
      workTypeKey: resolvedRole.canonicalKey ?? inputs.oracleKey ?? 'sw_backend',
      experience: hybridResult.experience ?? '5-10',
      region: companyData.region ?? 'US',
      userSalary: userSalaryUsd,
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
    // userSkills must be sourced from userProfile.selfRatedSkills (stored in DB)
    // and userProfile.targetSkills. uf14.userSkills was a field that never existed
    // and always resolved to [] — causing the fallback path for every user.
    //
    // Priority chain:
    //   1. uf14.selfRatedSkills (explicit in userFactors — rare but possible)
    //   2. uf14.targetSkills (same)
    //   3. inputs.userProfile.selfRatedSkills (loaded from DB during LayoffCalculator merge)
    //   4. uf14.userSkills (legacy field, kept for backward compat)
    const uf14any = uf14 as any;
    const profileSkills: string[] = [
      ...(uf14any.selfRatedSkills ?? []),
      ...(uf14any.targetSkills ?? []),
      ...(uf14any.userSkills ?? []),
    ];
    // De-duplicate while preserving order
    const seenSkills = new Set<string>();
    const deduped: string[] = profileSkills.filter(s => {
      const k = s.trim().toLowerCase();
      if (!k || seenSkills.has(k)) return false;
      seenSkills.add(k);
      return true;
    });

    const skillPortfolioFit = computeSkillPortfolioFit({
      userSkills: deduped,
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
        ?? (companyData as any)?._estimatedRoleOpenings ?? null,
      jobPostingLastMonth: uf14.jobPostingLastMonth ?? null,
      hiringRateAnnualized: uf14.hiringRateAnnualized ?? null,
      voluntaryAttritionPct: uf14.voluntaryAttritionPct ?? null,
    });
    (hybridResult as any).headcountVelocity = headcountVelocity;
  } catch (e) {
    noteEngineFailure('headcountVelocity', e);
  }

  // 37. Automation Risk Timeline — role + tech stack displacement analysis (v37.0 upgrade)
  try {
    const automationRisk = computeAutomationRisk({
      primaryTechStack: uf14.userSkills ?? [],
      companyMigrationPhase: uf14.companyMigrationPhase ?? 'NOT_MIGRATING',
      companyMainTech: uf14.companyMainTech ?? [],
      roleKey: resolvedRole?.canonicalKey ?? inputs.oracleKey ?? null,
    });
    (hybridResult as any).techStackObsolescence = automationRisk.techStack;
    (hybridResult as any).automationRisk = automationRisk;
  } catch (e) {
    noteEngineFailure('automationRisk', e);
  }

  // 37.5 Career Transition Intelligence — cross-role feasibility scoring (v37.0 Phase 6A)
  try {
    const careerTransition = computeCareerTransition({
      currentRoleKey: resolvedRole?.canonicalKey ?? inputs.oracleKey ?? null,
      seniorityBracket: (hybridResult as any).seniorityBracket ?? null,
      financialRunwayMonths: (hybridResult as any).financialRunway?.monthsOfRunway ?? inputs.financialRunwayMonths ?? null,
      tenureYears: inputs.userFactors.tenureYears ?? null,
      geographicConstraint: 'open',
      currentScore: (hybridResult as any).score ?? null,
    });
    (hybridResult as any).careerTransition = careerTransition;
  } catch (e) {
    noteEngineFailure('careerTransition', e);
  }

  // 38. Career Velocity — trajectory momentum analysis
  try {
    // Derive industryKey for benchmark lookup: map company industry → benchmark key
    const industryRaw = (companyData.industry ?? '').toLowerCase();
    const industryKey =
      /tech|software|saas|cloud|ai|ml/.test(industryRaw)  ? 'tech'
      : /finance|bank|fintech|insurance|invest/.test(industryRaw) ? 'finance'
      : /health|medical|pharma|biotech|hospital/.test(industryRaw) ? 'healthcare'
      : /legal|law/.test(industryRaw)     ? 'legal'
      : /hr|human.resource|people/.test(industryRaw) ? 'hr'
      : /marketing|media|content/.test(industryRaw) ? 'marketing'
      : /operations|supply|logistic/.test(industryRaw) ? 'operations'
      : /sales/.test(industryRaw) ? 'sales'
      : 'default';

    // roleFamily: strip extra segments from oracle key to get the benchmark family key
    const oracleKeyForVelocity = resolvedRole.canonicalKey ?? inputs.oracleKey ?? '';
    const roleFamily = oracleKeyForVelocity.replace(/-/g, '_').toLowerCase();

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
      industryKey,
      roleFamily,
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

  // Surface the conformal CI bundle on hybridResult so the UI can read it.
  // The bundle was computed at line 1464–1482 and stored on companyData._conformalBundle.
  // We copy it to hybridResult here (after hybridResult is assembled) so TransparencyTab
  // can show the pooledFromCohort badge without reaching into companyData internals.
  try {
    const conformalBundleForResult = (companyData as any)._conformalBundle ?? null;
    if (conformalBundleForResult) {
      hybridResult.conformalBundle = conformalBundleForResult;
    }
  } catch (e) {
    noteEngineFailure('conformalBundle_surface', e);
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
      // Normalize snake_case DB columns → camelCase WARNFiling fields.
      // The warn_filings table uses snake_case (layoff_date, filed_date,
      // affected_count, filing_state, is_confirmed, source_url); computeWARNSignal
      // accesses camelCase (f.layoffDate, f.filedDate, etc.).  Without this map
      // every field access returns undefined and filterActiveFilings() always
      // returns [] — making hasActiveWARN permanently false even when rows exist.
      _v16WarnFilings = warnRes.value.data.map((row: any) => ({
        companyName:  row.company_name  ?? row.companyName  ?? '',
        filingState:  row.filing_state  ?? row.filingState  ?? '',
        filedDate:    row.filed_date    ?? row.filedDate    ?? '',
        layoffDate:   row.layoff_date   ?? row.layoffDate   ?? '',
        affectedCount:row.affected_count?? row.affectedCount?? 0,
        locations:    Array.isArray(row.locations) ? row.locations
                      : (typeof row.locations === 'string' && row.locations)
                        ? row.locations.split(',').map((s: string) => s.trim())
                        : [],
        isConfirmed:  row.is_confirmed  ?? row.isConfirmed  ?? false,
        sourceUrl:    row.source_url    ?? row.sourceUrl    ?? '',
        rawText:      row.raw_text      ?? row.rawText      ?? undefined,
      }));
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

  // v40.0: Write _v16WarnFilings onto companyData so the DAG warnSignalLayer
  // can access it via ctx.companyData._warnFilings (typed any channel).
  (companyData as any)._warnFilings = _v16WarnFilings;
  (companyData as any)._glassdoorHistory = _v16GlassdoorHistory;
  (companyData as any)._executiveDepartures = _v16ExecutiveDepartures;

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

    // WARN hard floor — documented in Section 6.3 but previously never applied.
    // A WARN Act filing is regulatory ground truth: the company legally must give
    // 60-day advance notice for mass layoffs. When hasActiveWARN = true, the score
    // must be at least 68 regardless of formula output or data freshness.
    //
    // This runs AFTER mapToHybridResult so it patches hybridResult.total directly.
    // Kill-switch tracking fields are updated to maintain consistency with
    // applyKillSwitches() in layoffScoreEngine.ts.
    if (warnSignal.hasActiveWARN && hybridResult.total < 68) {
      const warnFloor = 68;
      const preWarnScore = hybridResult.total;
      hybridResult.total = warnFloor;
      // Pre-floor score for badge — only overwrite if a prior kill-switch hasn't already set it.
      if (!(hybridResult as any)._formulaScorePreFloor) {
        (hybridResult as any)._formulaScorePreFloor = preWarnScore;
      }
      // Register in unified kill-switch tracking.
      hybridResult.killSwitchFloors = { ...(hybridResult.killSwitchFloors ?? {}), warn_act_filing: warnFloor };
      hybridResult.activatedKillSwitches = [...(hybridResult.activatedKillSwitches ?? []), 'warn_act_filing'];
      (hybridResult as any).killSwitchApplied = true;
      (hybridResult as any).killSwitchName = (hybridResult as any).killSwitchName ?? 'warn_act_filing';
    }
  } catch (e) {
    noteEngineFailure('warnSignal', e);
  }

  // 40. BLS JOLTS + FRED Macro Signal — sector-level leading indicators
  // Quits rate fall (-10% YoY) precedes sector layoffs 60-90 days.
  // v21.0: fetch live JOLTS/FRED from proxy-macro Edge Function; fall back to
  // user-supplied snapshots, then to May 2026 calibrated baselines.
  //
  // v40.0 accuracy fix: BLS/FRED data is US-only. For companies in non-US regions
  // (India, EU, APAC), the signal is tagged isHeuristic=true and the macro layer
  // uses the bootstrap snapshot instead of live BLS — preventing US unemployment
  // signals from inflating/deflating risk for Indian or European companies.
  try {
    const uf16 = inputs.userFactors as any;
    const isUSCompany = (companyData.region === 'US' || !companyData.region);
    const live = isUSCompany ? await fetchLiveMacroSnapshot() : null;
    const blsMacroSignal = computeMacroSignal(
      companyData.industry ?? 'technology',
      live?.joltsSnapshot ?? uf16.joltsSnapshot ?? null,
      live?.fredSnapshot  ?? uf16.fredSnapshot  ?? null,
    );
    // Tag non-US macro signals so the freshness model doesn't treat them as live evidence
    if (!isUSCompany) {
      (blsMacroSignal as any).isHeuristic = true;
      (blsMacroSignal as any).regionNote = `BLS/FRED data is US-only; ${companyData.region} companies use heuristic baseline`;
    }
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
      // v37.0 Phase 6E: role context for role-enriched cohort labels
      workTypeKey: resolvedRole?.canonicalKey ?? inputs.oracleKey ?? null,
      seniorityBracket: (hybridResult as any).seniorityBracket ?? null,
      currentScore: (hybridResult as any).score ?? null,
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

  // 43.5 — WS7 Layer consolidation: unified workforce velocity.
  //
  // Combines the just-computed headcountVelocity (step 36) + glassdoor
  // Velocity (step 43) into a single consolidated workforce verdict.
  // When ws7_layer_consolidation flag is off, returns passthrough mode
  // (direction='UNKNOWN', isPassthrough=true) so legacy panels keep
  // displaying both legacy sub-results unchanged.
  try {
    const workforceVelocity = computeWorkforceVelocity({
      headcount: {
        headcountChange6MonthPct: uf14.headcountChange6MonthPct ?? null,
        contractorRatioPct: uf14.contractorRatioPct ?? null,
        contractorTrend: uf14.contractorTrend ?? 'UNKNOWN',
        jobPostingCurrentMonth: uf14.jobPostingCurrentMonth ?? (companyData as any)?._estimatedRoleOpenings ?? null,
        jobPostingLastMonth: uf14.jobPostingLastMonth ?? null,
        hiringRateAnnualized: uf14.hiringRateAnnualized ?? null,
        voluntaryAttritionPct: uf14.voluntaryAttritionPct ?? null,
      },
      sentimentHistory: _v16GlassdoorHistory,
    });
    (hybridResult as any).workforceVelocity = workforceVelocity;
  } catch (e) {
    noteEngineFailure('workforceVelocity', e);
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
    // v39.0 A1: pass region so the DB demand override layer can resolve
    // region-specific snapshots (e.g. India-specific demand for Indian users).
    const demandRegion: string | undefined = (companyData?.region ?? (uf16 as any).region ?? undefined)?.toString().toLowerCase();
    const roleMarketDemand = computeMarketDemandReport(workTypeKey, metro, demandRegion);
    (hybridResult as any).roleMarketDemand = roleMarketDemand;
  } catch (e) {
    noteEngineFailure('roleMarketDemand', e);
  }

  // 45b. v39.0 B6 — Personalized action set: surface roleGroup + isDbOverride
  //      + isGenericFallback + profileContextNote to the v3 ActionsTab so it
  //      can render the "generic fallback" honesty notice and the
  //      profile-specific framing line.
  try {
    const seniorityBracketRaw = deriveSeniorityBracket(
      inputs.userFactors.tenureYears ?? 0,
      resolvedRole?.canonicalKey ?? inputs.oracleKey ?? null,
    );
    // Map scenario-plan bracket vocab → action-engine bracket vocab.
    const seniorityBracket45b: 'junior' | 'mid' | 'senior' | 'principal' =
      seniorityBracketRaw === 'staff_plus' ? 'principal' :
      (seniorityBracketRaw as 'junior' | 'mid' | 'senior' | 'principal');
    const uf45b = inputs.userFactors as any;
    // GAP-P03: derive riskAppetite from savings runway (mirrors financialContextService
    // thresholds: < 6mo → conservative, 6–12mo → moderate, > 12mo → aggressive).
    // We derive inline here because userFinancialRunway (step 46) hasn't run yet.
    const _savingsMonths45b = uf45b.savingsMonthsRunway ?? null;
    const _riskAppetite45b: 'conservative' | 'moderate' | 'aggressive' | null =
      _savingsMonths45b == null ? null :
      _savingsMonths45b < 6    ? 'conservative' :
      _savingsMonths45b <= 12  ? 'moderate' : 'aggressive';
    const _monthlySalary45b: number | null = uf45b.monthlySalaryUsd ?? null;
    const _maxCost45b: number | null = _monthlySalary45b != null
      ? Math.round(_monthlySalary45b * 0.1)
      : null;
    const personalizedActionSet = getPersonalizedActions(
      inputs.roleTitle ?? resolvedRole.canonicalKey ?? 'software_engineer',
      seniorityBracket45b,
      hybridResult.total,
      (companyData?.region ?? uf45b.region) || undefined,
      undefined, // companyContext — not yet wired in this layer
      companyData?.name,
      {
        visaStatus:          uf45b.visaStatus ?? null,
        savingsMonthsRunway: uf45b.savingsMonthsRunway ?? null,
        hasDependents:       uf45b.hasDependents ?? null,
        dualIncomeHousehold: uf45b.dualIncomeHousehold ?? null,
        priorLayoffSurvived: uf45b.priorLayoffSurvived ?? null,
        hasEquityVesting:    uf45b.hasEquityVesting ?? null,
        equityVestMonths:    uf45b.equityVestMonths ?? null,
        metroArea:           uf45b.metroArea ?? null,
      },
      (hybridResult as any).visaRisk ?? null,
      // GAP-P03: pass localCurrencyCode so cost amounts (₹/$ certs) are converted
      // to the user's currency. userProfile.localCurrencyCode was set during
      // ProfileSetupModal or inferred from metro/visaStatus by inferCurrencyFromContext.
      uf45b.localCurrencyCode ?? undefined,
      _riskAppetite45b,
      _maxCost45b,
    );
    (hybridResult as any).personalizedActionSet = personalizedActionSet;
    // v40.0 FIX-6: hoist the derived profileSignals to the top of hybridResult so
    // negotiation, contingency, brief, and scenario services can consume them
    // without re-deriving — preventing threshold drift across services.
    if (personalizedActionSet?.profileSignals) {
      (hybridResult as any).profileSignals = personalizedActionSet.profileSignals;
    }

    // BUGFIX (Action Progress personalization): merge the role-specific
    // personalized actions into hybridResult.recommendations. Previously the
    // PhaseProgressSystem ("Action Progress") consumed only the GENERIC base
    // recommendations (l1-high, l3-high, …) while the personalized 412-role
    // action set lived in a separate field the progress UI never read — so the
    // phases looked identical for every role. We now prepend the personalized
    // actions (with stable title-hash IDs so completion state survives re-audits)
    // and de-duplicate against the base set by title. Skipped when the role fell
    // back to generic, since in that case there is nothing role-specific to add.
    if (
      !personalizedActionSet?.isGenericFallback &&
      Array.isArray(personalizedActionSet?.actions) &&
      personalizedActionSet.actions.length > 0
    ) {
      const baseRecs = Array.isArray(hybridResult.recommendations) ? hybridResult.recommendations : [];
      const seenTitles = new Set(baseRecs.map((r: any) => (r.title ?? '').toLowerCase().trim()));
      const scoreForPriority = hybridResult.total;

      const personalizedRecs = personalizedActionSet.actions
        .filter(a => a.title && !seenTitles.has(String(a.title).toLowerCase().trim()))
        .map((a) => {
          const deadline = a.deadline ?? (scoreForPriority >= 70 ? '7 days' : '30 days');
          const sequencePhase = (a as any).sequencePhase ?? deriveSequencePhase(deadline);
          return {
            ...a,
            id: a.id ?? stableActionId('pa', String(a.title)),
            title: a.title,
            description: a.description ?? '',
            priority: a.priority ?? (scoreForPriority >= 65 ? 'Critical' : scoreForPriority >= 50 ? 'High' : 'Medium'),
            layerFocus: (a as any).layerFocus ?? 'L3 · Role Displacement',
            riskReductionPct: a.riskReductionPct ?? 15,
            deadline,
            sequencePhase,
          } as any;
        });

      if (personalizedRecs.length > 0) {
        // Personalized (role-specific) actions lead; generic base actions follow
        // as supporting depth. Both remain available to the full plan + phases.
        hybridResult.recommendations = [...personalizedRecs, ...baseRecs];
      }
    }
    // Grace-period compression: apply the same deadline remapping to the engine's
    // recommendation array so TakeActionTab's ActionMatrix reflects the real window.
    if (personalizedActionSet?.graceCompressionApplied && personalizedActionSet.graceCompressionTier) {
      const _deadlineMap: Record<string, Record<string, string>> = {
        critical:   { day1: '6 hours',  week1: '2 days',  month1: '7 days',  quarter1: '7 days'  },
        compressed: { day1: '24 hours', week1: '3 days',  month1: '10 days', quarter1: '10 days' },
      };
      const _dm = _deadlineMap[personalizedActionSet.graceCompressionTier];
      hybridResult.recommendations = hybridResult.recommendations.map((rec: any) => ({
        ...rec,
        deadline: rec.sequencePhase ? (_dm[rec.sequencePhase] ?? rec.deadline) : rec.deadline,
      }));
    }
    // G1: populate typed alias so CareerOS widgets access recommendations without `as any`
    hybridResult.actionItems = hybridResult.recommendations;
    // Rule 1: inject why-it-matters + consequence framing into every action
    hybridResult.actionItems = injectActionConsequences(hybridResult.actionItems, hybridResult);
    // Rule 2+5+18: stamp rankScore; Phase 5 boosts actions proven effective for similar users
    const _userProfileForRanking = (inputs.userFactors as any) ?? null;
    const _actionIds = hybridResult.actionItems
      .map((a: any) => (a.id ?? a.title ?? '') as string)
      .filter(Boolean);
    // Phase 4: load MEASURED cohort impact (avg pts the score actually fell + n)
    // — used both to rank and, when n is large, to replace the static estimate.
    const _cohortImpacts = _userProfileForRanking && _actionIds.length > 0
      ? await loadCohortImpacts(
          (_userProfileForRanking.roleTitle ?? 'unknown').toLowerCase().replace(/\s+/g, '_'),
          tenureBandFromYears(_userProfileForRanking.tenureYears ?? null),
          _actionIds,
        ).catch(() => null)
      : null;
    const _cohortBoosts = _cohortImpacts
      ? new Map([..._cohortImpacts].filter(([, s]) => s.count >= 5).map(([id, s]) => [id, cohortMultiplier(s.avgRiskReduction)]))
      : null;
    // Phase 2 (Career OS): load THIS user's per-dimension success rates so actions
    // that historically worked for them rank higher. Anonymous/offline → neutral.
    // (Previously rankActions always received context=null, so the learning loop
    // never actually fed ranking.)
    let _userSuccessRates: Record<string, number> | null = null;
    try {
      const { data: { session: _rateSession } } = await supabase.auth.getSession();
      if (_rateSession?.user?.id) {
        const { getDimensionSuccessMap } = await import('./userOutcomeLearningService');
        const _rates = await getDimensionSuccessMap(_rateSession.user.id);
        if (Object.keys(_rates).length > 0) _userSuccessRates = _rates;
      }
    } catch { /* non-fatal — rank without personal success rates */ }
    const _ranked = rankActions(
      hybridResult.actionItems,
      _userProfileForRanking,
      _userSuccessRates ? { userSuccessRates: _userSuccessRates } : null,
      _cohortBoosts,
    );
    hybridResult.actionItems = _ranked.map(r => ({
      ...(r.action as import('../types/hybridResult').ActionPlanItem),
      rankScore: r.rankScore,
    }));
    // Phase 4 (Rule 2): outcomes change the numbers — where enough users completed
    // an action, replace its static riskReductionPct with the MEASURED mean drop.
    if (_cohortImpacts && _cohortImpacts.size > 0) {
      hybridResult.actionItems = applyMeasuredImpact(hybridResult.actionItems, _cohortImpacts);
    }
    hybridResult.recommendations = hybridResult.actionItems;
  } catch (e) {
    noteEngineFailure('personalizedActionSet', e);
    // Ensure actionItems alias is always set even if personalization fails
    if (!hybridResult.actionItems) {
      hybridResult.actionItems = injectActionConsequences(hybridResult.recommendations ?? [], hybridResult);
    }
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
      visaStatus: uf16.visaStatus ?? null,
      tenureYears: uf16.tenureYears ?? null,
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
    // selfRatedSkills and targetSkills come from UserProfile (merged into userFactors
    // in LayoffCalculator via the profile merge). uf17.selfRatedSkills was always
    // undefined before the merge fix — so skillGapIntelligence was never computed.
    // Now merged from profile at both call sites in LayoffCalculator.
    const selfSkills: string[] = uf17.selfRatedSkills ?? [];
    const tgtSkills: string[]  = uf17.targetSkills ?? [];

    if (roleMarketDemandResult && (selfSkills.length > 0 || tgtSkills.length > 0)) {
      const skillGapIntelligence = computeSkillGapIntelligence({
        selfRatedSkills: selfSkills,
        targetSkills: tgtSkills,
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
    const uf50 = inputs.userFactors as any;
    const userRunway50 = (hybridResult as any).userFinancialRunway;

    // GAP C + v37.0 + v39.0 B4: build personalization context including
    // role category AND region (drives localized outreach channels)
    const personalizationContext: ScenarioPlanPersonalizationContext = {
      visaStatus: uf50.visaStatus ?? undefined,
      financialRunwaySituation: userRunway50?.situation ?? undefined,
      seniorityBracket: deriveSeniorityBracket(inputs.userFactors.tenureYears ?? 0, resolvedRole?.canonicalKey ?? inputs.oracleKey ?? null),
      hasEquityVesting: uf50.hasEquityVesting ?? undefined,
      equityType: uf50.equityType ?? undefined,
      roleCategory: (hybridResult as any).roleIndustryComposite?.roleCategory ?? undefined,
      region: companyData?.region ?? uf50.region ?? null,
    };

    const scenarioPlan = computeScenarioPlan({
      currentScore: hybridResult.total,
      macroRiskTier: macroSig?.riskTier ?? null,
      contagionProbability: peerContagionResult?.contagionProbability ?? null,
      primaryCohort: cohortResult?.primaryCohort ?? null,
      velocityPtsPerMonth: trajectoryRes?.velocityPtsPerMonth ?? 0,
      freeCashFlowMargin: secSigs?.financialSignals?.freeCashFlowMargin ?? null,
      revenueGrowthYoY: companyData.revenueGrowthYoY ?? null,
      personalizationContext,
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
  // v40.0: fetch career market context and pass to the brief service so the LLM
  // can cite real market numbers (openings, hiring bar, success rate) in oneActionThisWeek.
  // getCareerPathMarket is async (tries live Supabase data, falls back to static baseline).
  //
  // BUGFIX: this was previously fire-and-forget — the .then() mutated hybridResult
  // AFTER the pipeline had already returned the object to React. Because mutating
  // a returned object triggers no re-render, the UI saw intelligenceBrief ===
  // undefined forever and showed an infinite "GENERATING…" skeleton (the
  // "AI Intelligence Brief not working" report). We now keep a handle to the
  // promise and await it (bounded) before returning, so the resolved brief is
  // actually present in the result. On timeout/failure we set it to null (clean
  // "no brief" state) rather than leaving it undefined (perpetual skeleton).
  const intelligenceBriefPromise = getCareerPathMarket(inputs.roleTitle)
    .then((marketContext) =>
      fetchIntelligenceBrief(
        companyData.name,
        inputs.roleTitle,
        hybridResult as unknown as Record<string, unknown>,
        userId,
        marketContext,
        // v40.0: company region routes market-data citation to region-appropriate
        // job-board sources (StepStone/XING/Reed/etc.) instead of defaulting to
        // Naukri for every user. Without this, a Berlin audit would prompt the
        // LLM with India numbers and either hallucinate or trigger Tier B fallback.
        companyData.region,
      ),
    )
    .then((brief) => {
      (hybridResult as any).intelligenceBrief = brief ?? null;
    })
    .catch((e) => {
      console.warn('[AuditPipeline] intelligenceBrief fetch failed:', e);
      (hybridResult as any).intelligenceBrief = null;
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
      geographicOptionality: (hybridResult as any).geographicOptionality ?? null, // GAP G: CoL for financial projection
      roleLeverageMultiplier: (hybridResult as any).roleIndustryComposite?.riskModifier != null
        ? Math.max(0.5, Math.min(2.0, 1.0 - ((hybridResult as any).roleIndustryComposite.riskModifier / 40)))
        : undefined, // v37.0: derive from role-industry composite (-15→+20 modifier maps to 0.5–2.0 leverage)
      // v40.0: market-research success rate for transition path probability grounding.
      // getCareerPathMarketSync is synchronous — uses static baseline, always available.
      // When present, TRANSITION feasibilityScore is anchored to this figure (60/40 blend)
      // and labeled 'market_successRate' so the UI can show a point estimate with source.
      transitionSuccessRate12mPct: getCareerPathMarketSync(inputs.roleTitle)?.successRate12mPct ?? null,
      hasDependents: uf17.hasDependents ?? null,
      dualIncomeHousehold: uf17.dualIncomeHousehold ?? null,
    });
    (hybridResult as any).careerContingencyPlan = careerContingencyPlan;
  } catch (e) {
    noteEngineFailure('careerContingencyPlan', e);
  }

  // 54. Preparedness Score — 5-pillar career layoff-readiness meta-score
  try {
    const uf17 = inputs.userFactors as any;

    // ── Derive inputs that were previously always null ────────────────────────

    // networkStrength1to5: derive from networkLeverage score (0–100 → 1–5).
    // networkLeverage.networkScore is a reliable proxy: 0–25=1, 26–45=2,
    // 46–60=3, 61–75=4, 76–100=5. Falls back to user-provided networkSize.
    const nlScore: number | undefined = (hybridResult as any).networkLeverage?.networkScore;
    const derivedNetworkStrength: number | null =
      uf17.networkStrength1to5 != null ? uf17.networkStrength1to5
      : nlScore != null
        ? nlScore <= 25 ? 1 : nlScore <= 45 ? 2 : nlScore <= 60 ? 3 : nlScore <= 75 ? 4 : 5
        : null;

    // careerGoal: hybridResult.careerGoal is declared but never written by the
    // pipeline. Derive it from risk score + user signals rather than leaving null.
    //   emergency_exit  → risk ≥ 70 (critical band — user needs to move urgently)
    //   strategic_exit  → risk 45–69 (elevated — user should prepare proactively)
    //   stay_and_grow   → risk < 45 with low financial pressure
    //   explore         → risk < 45 with adequate runway and no strong signal
    // User-explicit careerGoal from profile (uf17.careerGoal) always wins.
    const derivedCareerGoal: 'stay_and_grow' | 'strategic_exit' | 'emergency_exit' | 'explore' | null =
      uf17.careerGoal != null ? uf17.careerGoal
      : hybridResult.total >= 70 ? 'emergency_exit'
      : hybridResult.total >= 45 ? 'strategic_exit'
      : (uf17.savingsMonthsRunway ?? 0) >= 6 ? 'stay_and_grow'
      : 'explore';

    // hasLinkedInActive: user-explicit > userProfile field > default true for
    // professionals (LinkedIn is assumed active unless explicitly stated otherwise).
    const derivedLinkedIn: boolean | null =
      uf17.hasLinkedInActive != null ? uf17.hasLinkedInActive
      : uf17.linkedInActive   != null ? uf17.linkedInActive
      : null;  // null = unknown; engine treats as not penalised

    // hasUpdatedResume: derive from explicit days-ago field or legacy boolean.
    const derivedHasUpdatedResume: boolean | null =
      uf17.hasUpdatedResume != null ? uf17.hasUpdatedResume
      : uf17.resumeUpdatedDaysAgo != null ? uf17.resumeUpdatedDaysAgo <= 365
      : null;

    const preparednessScore = computePreparednessScore({
      financialRunwayMonths:      uf17.savingsMonthsRunway ?? null,
      userFinancialRunway:        (hybridResult as any).userFinancialRunway ?? null,
      // Network — prefer 1-5 derived scale; fall back to categorical string
      networkStrength1to5:        derivedNetworkStrength,
      networkSize:                derivedNetworkStrength == null
                                    ? (hybridResult.networkSize ?? null)
                                    : null,
      networkLeverage:            (hybridResult as any).networkLeverage ?? null,
      careerResilience:           (hybridResult as any).careerResilience ?? null,
      skillPortfolioFit:          (hybridResult as any).skillPortfolioFit ?? null,
      skillGapIntelligence:       (hybridResult as any).skillGapIntelligence ?? null,
      // careerGoal — derived from risk score when not explicitly provided
      careerGoal:                 derivedCareerGoal,
      priorJobChanges:            uf17.priorJobChanges ?? null,
      priorLayoffSurvived:        uf17.priorLayoffSurvived ?? null,
      jobMarketLiquidity:         (hybridResult as any).jobMarketLiquidity ?? null,
      careerVelocity:             (hybridResult as any).careerVelocity ?? null,
      // Operational sub-factors — use explicit values when available
      hasUpdatedResume:           derivedHasUpdatedResume,
      resumeUpdatedDaysAgo:       uf17.resumeUpdatedDaysAgo ?? null,
      resumeImpactBulletsPerRole: uf17.resumeImpactBulletsPerRole ?? null,
      resumeAtsFormatted:         uf17.resumeAtsFormatted ?? null,
      hasLinkedInActive:          derivedLinkedIn,
      hasSavedJobTargets:         uf17.hasSavedJobTargets ?? null,
    });
    (hybridResult as any).preparednessScore = preparednessScore;
  } catch (e) {
    noteEngineFailure('preparednessScore', e);
  }

  // 55. Personal Risk Modifier — user-circumstance signed adjustment (post-killswitch)
  // Reads five already-computed layers (15 Manager, 17 Visa, 25 Network, 30 Skill,
  // 38 Velocity) and produces a ±10pt signed delta applied to the final score.
  try {
    const personalRiskModifier = computePersonalRiskModifier({
      baseScore: hybridResult.total,
      visaRisk:          (hybridResult as any).visaRisk          ?? null,
      managerRisk:       (hybridResult as any).managerRisk        ?? null,
      networkLeverage:   (hybridResult as any).networkLeverage    ?? null,
      skillPortfolioFit: (hybridResult as any).skillPortfolioFit  ?? null,
      careerVelocity:    (hybridResult as any).careerVelocity     ?? null,
    });
    if (Math.abs(personalRiskModifier.rawModifier) >= 1) {
      hybridResult.total = personalRiskModifier.adjustedScore;
    }
    (hybridResult as any).personalRiskModifier = personalRiskModifier;

    // CONSISTENCY FIX: strategySynthesis was computed earlier with the
    // pre-personalization total; the modifier just shifted the final score.
    // Recompute so the strategy prose (which embeds the score) matches what the
    // Summary displays — eliminates the cross-tab "43 vs 45" inconsistency.
    // NOTE: inputs mirror the earlier computeStrategySynthesis call — keep in sync.
    if (Math.abs(personalRiskModifier.rawModifier) >= 1 && (hybridResult as any).strategySynthesis) {
      const ufS = inputs.userFactors as any;
      // Phase 5 consistency: mirror the step-27 debt-adjusted effective runway so the
      // recomputed strategy doesn't silently use a longer runway than the first pass.
      const _baseRunwayR = inputs.financialRunwayMonths ?? 0;
      const _debtR = ufS.monthlyDebtObligationsUsd ?? null;
      const _expR = ufS.monthlyExpensesUsd ?? null;
      const _effRunwayR =
        _debtR != null && _debtR > 0 && _expR != null && _expR > 0
          ? Math.round(_baseRunwayR * (_expR / (_expR + _debtR)) * 10) / 10
          : _baseRunwayR;
      (hybridResult as any).strategySynthesis = computeStrategySynthesis({
        currentScore: hybridResult.total,
        collapseStage: (hybridResult as any).collapseStage ?? null,
        tenureYears: inputs.userFactors.tenureYears ?? 3,
        financialRunwayMonths: _effRunwayR,
        performanceTier: inputs.userFactors.performanceTier ?? 'average',
        industry: companyData.industry ?? 'technology',
        experience: hybridResult.experience ?? '5-10',
        hasAiSkills: ufS.hasAiSkills ?? false,
        companyName: companyData.name,
        careerConfidence: (hybridResult as any).careerConfidence,
        networkLeverage: (hybridResult as any).networkLeverage,
        macroRisk: (hybridResult as any).macroEconomicRisk,
        peerContagion: (hybridResult as any).peerContagion,
        emergencyProtocol: (hybridResult as any).emergencyResponse,
        scoreVelocityPtsPerMonth: (hybridResult as any).scoreTrajectory?.velocityPtsPerMonth,
        resilienceScore: (hybridResult as any).careerResilience?.compositeScore,
        jobMarketLiquidityScore: (hybridResult as any).jobMarketLiquidity?.reemploymentScore,
        // Keep in sync with the step-27 call so the recomputed strategy retains
        // the same v48.0 personalization signals.
        ...buildStrategyPersonalizationSignals(inputs, companyData, hybridResult, resolvedRole),
      });

      // Phase 3 consistency: the verdict reads score + strategy, both of which just
      // changed — refresh it so CareerDecisionCard can't contradict the strategy tab.
      // (causalExplanation reads only breakdown, which the modifier doesn't touch.)
      const _bdR = hybridResult.breakdown;
      (hybridResult as any).careerDecision = generateCareerDecision(
        hybridResult.total ?? 0,
        (hybridResult as any).strategySynthesis.overallStrategy,
        { L1: _bdR.L1, L2: _bdR.L2, L3: _bdR.L3, L4: _bdR.L4, L5: _bdR.L5 },
        ufS.riskTolerance ?? null,
      );
    }
  } catch (e) {
    noteEngineFailure('personalRiskModifier', e);
  }

  // ── v45.0 Precision Intelligence Engines (55–59) ───────────────────────────

  // 55. Precision Survival — Bayesian individual survival model
  //     Replaces cohort-band actuarial table with factor-level log-odds model.
  //     Hold-out AUC 0.84 vs. 0.81 for legacy model. Runs after personalRiskModifier
  //     so it can read the adjusted final score.
  try {
    const _layoffRounds55 = (hybridResult as any).layoffSignal?.recentLayoffCount ?? 0;
    const _scoreBreakdown55 = hybridResult.breakdown;
    const precisionSurvival = computePrecisionSurvival({
      compositeScore:      hybridResult.total,
      confidence:          hybridResult.confidencePercent / 100,
      collapseStage:       hybridResult.collapseStage ?? null,
      hasDocumentedLayoffs: _layoffRounds55 > 0,
      lastLayoffDaysAgo:   null,
      companySize:         'large',
      companyHealthL1:     _scoreBreakdown55?.L1 ?? 0.5,
      stealthSignal:       (hybridResult as any)._stealthSignal ?? null,
      roleDisplacementL3:  _scoreBreakdown55?.L3 ?? 0.5,
      seniorityBracket:    ((inputs.userFactors as any)?.seniority ?? 'mid') as any,
      tenureYears:         (inputs.userFactors as any)?.tenureYears ?? 3,
      performanceTier:     (hybridResult.performanceTier ?? 'average') as any,
      uniquenessLevel:     'somewhat_unique',
      department:          inputs.department ?? 'engineering',
      industryL4:          _scoreBreakdown55?.L4 ?? 0.5,
      peerContagion:       (hybridResult as any).peerContagion ?? null,
      macroRisk:           (hybridResult as any).macroEconomicRisk ?? null,
      visaRisk:            (hybridResult as any).visaRisk ?? null,
      financialRunway:     (hybridResult as any).financialRunway ?? null,
      competitivePosition: (hybridResult as any).competitiveIntelligence ?? null,
      leadershipTransition:(hybridResult as any).leadershipTransitionRisk ?? null,
      region:              hybridResult.countryKey ?? 'IN',
      industry:            hybridResult.industryKey ?? '',
    });
    (hybridResult as any).precisionSurvival = precisionSurvival;
  } catch (e) {
    noteEngineFailure('precisionSurvival', e);
  }

  // 56. Job Targeting Engine — specific company + role recommendations
  //     Replaces "explore the market" with named targets, match scores,
  //     LinkedIn templates, and interview intel.
  try {
    const _roleKey56 = resolvedRole.canonicalKey ?? 'software_engineer';
    const _region56  = (hybridResult.countryKey ?? 'IN').toLowerCase();
    const jobTargeting = computeJobTargeting({
      rolePrefix:       _roleKey56.split('_')[0] ?? 'sw',
      workTypeKey:      _roleKey56,
      industry:         hybridResult.industryKey ?? '',
      region:           _region56,
      metro:            (inputs.userFactors as any)?.city ?? null,
      seniorityBracket: (inputs.userFactors as any)?.seniority ?? 'mid',
      salaryBand:       null,
      currentCompanyName: inputs.companyName ?? '',
      currentCompanySize: 'large',
      peerContagion:    (hybridResult as any).peerContagion ?? null,
      hiringSignals:    (hybridResult as any).hiringSignal ?? null,
      careerResilience: (hybridResult as any).careerResilience ?? null,
      compositeScore:   hybridResult.total,
      visaStatus:       (inputs.userFactors as any)?.visaStatus ?? null,
    });
    (hybridResult as any).jobTargeting = jobTargeting;
  } catch (e) {
    noteEngineFailure('jobTargeting', e);
  }

  // 57. Monthly Action Plan Engine — week-by-week calendar
  //     Replaces abstract phase labels with weekly granularity + deadlines.
  try {
    const _survival57 = (hybridResult as any).precisionSurvival ?? null;
    const _targeting57 = (hybridResult as any).jobTargeting ?? null;
    // Both survivalResult and jobTargeting are required by MonthlyActionPlanInputs;
    // skip if either is missing (engine would produce incomplete plan).
    if (_survival57 && _targeting57) {
      const monthlyActionPlan = computeMonthlyActionPlan({
        compositeScore:   hybridResult.total,
        survivalResult:   _survival57,
        jobTargeting:     _targeting57,
        financialRunway:  (hybridResult as any).financialRunway ?? null,
        visaRisk:         (hybridResult as any).visaRisk ?? null,
        seniorityBracket: (inputs.userFactors as any)?.seniority ?? 'mid',
        performanceTier:  hybridResult.performanceTier ?? 'unknown',
        rolePrefix:       (resolvedRole.canonicalKey ?? 'software_engineer').split('_')[0],
        workTypeKey:      resolvedRole.canonicalKey ?? 'software_engineer',
        region:           (hybridResult.countryKey ?? 'IN').toLowerCase(),
        metro:            (inputs.userFactors as any)?.city ?? null,
        collapseStage:    hybridResult.collapseStage ?? null,
        tenureYears:      (inputs.userFactors as any)?.tenureYears ?? 3,
      });
      (hybridResult as any).monthlyActionPlan = monthlyActionPlan;
    }
  } catch (e) {
    noteEngineFailure('monthlyActionPlan', e);
  }

  // 58. Skill Fusion Engine — compound skill premium analysis
  //     Shows which skill COMBINATIONS earn 30–55% more, not isolated skills.
  try {
    const _roleKey58 = resolvedRole.canonicalKey ?? 'software_engineer';
    const skillFusion = computeSkillFusion({
      rolePrefix:       _roleKey58.split('_')[0],
      workTypeKey:      _roleKey58,
      industry:         hybridResult.industryKey ?? '',
      region:           (hybridResult.countryKey ?? 'IN').toLowerCase(),
      selfRatedSkills:  (inputs.userFactors as any)?.skills ?? [],
      seniorityBracket: (inputs.userFactors as any)?.seniority ?? 'mid',
      compositeScore:   hybridResult.total,
    });
    (hybridResult as any).skillFusion = skillFusion;
  } catch (e) {
    noteEngineFailure('skillFusion', e);
  }

  // 59. Competitive Position Engine — peer benchmarking + gap roadmap
  //     Answers: "Where do I rank vs. my professional peers, what closes the gap?"
  try {
    const competitivePosition = computeCompetitivePosition({
      roleTitle: inputs.roleTitle ?? resolvedRole.canonicalKey ?? 'software_engineer',
      seniorityBracket: (inputs.userFactors as any)?.seniority ?? 'mid',
      yearsOfExperience: (inputs.userFactors as any)?.yearsOfExperience ?? null,
      currentSalaryUSD: (inputs.userFactors as any)?.currentSalaryUSD ?? null,
      skills: (inputs.userFactors as any)?.skills ?? [],
      certifications: (inputs.userFactors as any)?.certifications ?? [],
      linkedinConnectionCount: (inputs.userFactors as any)?.linkedinConnectionCount ?? null,
      hasPublicPortfolio: (inputs.userFactors as any)?.hasPublicPortfolio ?? false,
      region: hybridResult.countryKey ?? 'IN',
      industry: hybridResult.industryKey ?? '',
      profile: inputs.userFactors as any,
      careerVelocity: (hybridResult as any).careerVelocity ?? null,
      skillPortfolioFit: (hybridResult as any).skillPortfolioFit ?? null,
      networkLeverage: (hybridResult as any).networkLeverage ?? null,
      compensationRisk: (hybridResult as any).compensationRisk ?? null,
      geographicOptionality: (hybridResult as any).geographicOptionality ?? null,
    });
    (hybridResult as any).competitivePosition = competitivePosition;
  } catch (e) {
    noteEngineFailure('competitivePosition', e);
  }

  // 60. Behavioral Personalization Engine — 7-dimension career behavioural analysis
  //     Feeds action plan personalisation, negotiation scripts, and 30/60/90 plan.
  try {
    const uf60 = inputs.userFactors as any;
    // Derive totalExperienceYears from the correct field name (yearsExperience, not yearsOfExperience)
    const totalExperienceYears60 =
      uf60?.careerYears         // from LayoffInputForm Step 2 (total career experience)
      ?? uf60?.yearsExperience  // from UserProfile (correct field name, no 'Of')
      ?? uf60?.yearsOfExperience // legacy fallback
      ?? uf60?.tenureYears
      ?? 5;

    // Derive seniorityBracket from experience + role title (seniority is not in UserFactors)
    const rawTitle60 = (inputs.roleTitle ?? '').toLowerCase();
    const seniorityBracket60: 'junior' | 'mid' | 'senior' | 'principal' =
      /chief|cto|cfo|ceo|coo|vp |vice.president|director|partner|principal|staff/i.test(rawTitle60) ? 'principal'
      : /senior|sr\.|lead\b|architect|manager/i.test(rawTitle60) ? 'senior'
      : /junior|jr\.|entry|intern|associate|graduate|fresher/i.test(rawTitle60) ? 'junior'
      : totalExperienceYears60 >= 8 ? 'senior'
      : totalExperienceYears60 >= 4 ? 'mid'
      : totalExperienceYears60 >= 1 ? 'junior'
      : 'mid';

    // LinkedIn completion: derive from profile completeness fields — not from
    // connection count (never populated). If profile has skills + salary + visa, ~85%.
    const linkedinPct60 =
      uf60?.linkedinCompletionPct  // explicit (never set currently, for future)
      ?? (() => {
        let pct = 40; // baseline: exists but incomplete
        if (uf60?.selfRatedSkills?.length > 0) pct += 15;
        if (uf60?.monthlySalaryUsd || uf60?.savingsMonthsRunway) pct += 10;
        if (uf60?.visaStatus) pct += 10;
        if (uf60?.yearsExperience || uf60?.careerYears) pct += 10;
        if (uf60?.hasDependents != null) pct += 5;
        if (uf60?.metroArea) pct += 10;
        return Math.min(95, pct);
      })();

    const behavioralPersonalization = computeBehavioralPersonalization({
      tenureYears:                   uf60?.tenureYears ?? 3,
      totalExperienceYears:          totalExperienceYears60,
      seniorityBracket:              uf60?.seniority ?? seniorityBracket60,
      workTypeKey:                   resolvedRole.canonicalKey ?? 'software_engineer',
      rolePrefix:                    (resolvedRole.canonicalKey ?? 'software_engineer').split('_')[0],
      industry:                      hybridResult.industryKey ?? '',
      region:                        (hybridResult.countryKey ?? 'IN').toLowerCase(),
      currentMonthlySalaryLocal:     uf60?.currentMonthlySalaryLocal ?? uf60?.monthlySalaryUsd ?? null,
      localCurrencyCode:             uf60?.localCurrencyCode ?? null,
      annualSalaryUsd:               uf60?.currentSalaryUSD ?? (uf60?.monthlySalaryUsd ? uf60.monthlySalaryUsd * 12 : null),
      employmentGapMonths:           uf60?.employmentGapMonths ?? null,
      yearsAtCurrentTitle:           uf60?.yearsAtCurrentTitle ?? null,
      numberOfJobsLast5Years:        uf60?.numberOfJobsLast5Years ?? null,
      numberOfPromotionsLast5Years:  uf60?.numberOfPromotionsLast5Years ?? null,
      currentCompanyType:            uf60?.companyType ?? (companyData as any).size ?? null,
      targetCompanyType:             uf60?.targetCompanyType ?? null,
      resumeLastUpdatedMonths:       uf60?.resumeLastUpdatedMonths ?? (uf60?.resumeUpdatedDaysAgo != null ? Math.round(uf60.resumeUpdatedDaysAgo / 30) : null),
      hasPortfolio:                  uf60?.hasPublicPortfolio ?? null,
      hasRecentInterviewPractice:    uf60?.hasRecentInterviewPractice ?? null,
      linkedinCompletionPct:         linkedinPct60,
      compositeScore:                hybridResult.total,
      careerGoal:                    uf60?.careerGoal ?? null,
      aiDisruptionRisk:              (hybridResult as any).aiExposureIndex ?? null,
      skillPortfolioScore:           (hybridResult as any).skillPortfolioFit?.fitScore ?? (hybridResult as any).skillFusion?.overallPortfolioScore ?? null,
      performanceTier:               hybridResult.performanceTier ?? 'unknown',
      visaStatus:                    uf60?.visaStatus ?? null,
      hasDependents:                 uf60?.hasDependents ?? null,
      runwayMonths:                  (hybridResult as any).userFinancialRunway?.runwayMonths ?? uf60?.savingsMonthsRunway ?? null,
    });
    (hybridResult as any).behavioralPersonalization = behavioralPersonalization;

    // Phase 3 / P5: Apply behavioral re-ranking now that personalization is available.
    // Second pass adjusts rankScore by trajectory/compensation/riskTolerance multipliers.
    if (hybridResult.actionItems && hybridResult.actionItems.length > 0) {
      const bp = behavioralPersonalization;
      hybridResult.actionItems = applyBehavioralRerank(
        hybridResult.actionItems as unknown as Array<Record<string, unknown>>,
        {
          trajectory: bp.careerTrajectory.trajectory,
          compensationPosition: bp.compensationIntelligence.position,
          riskTolerance: bp.riskTolerance,
        },
      ) as unknown as typeof hybridResult.actionItems;
      hybridResult.recommendations = hybridResult.actionItems;
    }
  } catch (e) {
    noteEngineFailure('behavioralPersonalization', e);
  }

  // 61. Precision 30/60/90 Plan Engine — AI-prioritised 13-week execution plan
  //     Week-by-week milestones, daily focus priorities, D30/D60/D90 gates.
  try {
    const uf61 = inputs.userFactors as any;
    const _behavioral61    = (hybridResult as any).behavioralPersonalization ?? null;
    const _monthlyPlan61   = (hybridResult as any).monthlyActionPlan ?? null;
    const _jobTargeting61  = (hybridResult as any).jobTargeting ?? null;
    if (_behavioral61 && _monthlyPlan61 && _jobTargeting61) {
      const precision9090Plan = computePrecision9090Plan({
        compositeScore:       hybridResult.total,
        seniorityBracket:     uf61?.seniority ?? 'mid',
        rolePrefix:           (resolvedRole.canonicalKey ?? 'software_engineer').split('_')[0],
        workTypeKey:          resolvedRole.canonicalKey ?? 'software_engineer',
        region:               (hybridResult.countryKey ?? 'IN').toLowerCase(),
        metro:                uf61?.city ?? null,
        tenureYears:          uf61?.tenureYears ?? 3,
        totalExperienceYears: uf61?.yearsOfExperience ?? 5,
        industry:             hybridResult.industryKey ?? '',
        behavioral:           _behavioral61,
        monthlyPlan:          _monthlyPlan61,
        jobTargeting:         _jobTargeting61,
        financialRunway:      (hybridResult as any).financialRunway ?? null,
        visaRisk:             (hybridResult as any).visaRisk ?? null,
        careerGoal:           uf61?.careerGoal ?? null,
        targetCompanyType:    uf61?.targetCompanyType ?? null,
      });
      (hybridResult as any).precision9090Plan = precision9090Plan;
    }
  } catch (e) {
    noteEngineFailure('precision9090Plan', e);
  }

  _timer.mark('intelligence_upgrade_end');

  const tabsUsedFallback = [
    companyData.source?.toLowerCase().includes("fallback") ? "company_profile" : null,
    (resolvedRole.canonicalKey ? null : "career_skills"),
  ].filter((value): value is string => Boolean(value));

  // Await the intelligence-brief fetch (layer 52) — bounded so a slow/stalled LLM
  // round-trip can't hang the whole audit. Whatever has resolved by the deadline
  // is already written onto hybridResult; on timeout we stamp null so the UI shows
  // a clean "no brief" state instead of an infinite skeleton.
  try {
    await Promise.race([
      intelligenceBriefPromise,
      new Promise<void>(resolve => setTimeout(resolve, 9000)),
    ]);
  } catch { /* handled inside the promise; never throws here */ }
  if ((hybridResult as any).intelligenceBrief === undefined) {
    (hybridResult as any).intelligenceBrief = null;
  }

  const finalResult = attachAuditMetadata(hybridResult, companyData, inputs, {
    companyMatchConfidence,
    companyMatchType,
    tabsUsedFallback,
    engineFailures,
  });

  // v40.0 FIX-4 CRITICAL: attach userFactors to the result so intelligence brief
  // and other profile-aware services can read it. Previously these services
  // expected `(hybridResult as any).userFactors` but it was never populated,
  // silently breaking all personalization in the brief and cached scenario plans.
  (finalResult as any).userFactors = inputs.userFactors;

  // Stamp when this audit was produced so CareerRiskWidget can show "Last analyzed: Jun 8"
  finalResult.calculatedAt = new Date().toISOString();

  // Stamp the flag snapshot used for this run. Stored for reproducibility:
  // if a re-audit produces different output, comparing flagSnapshot records
  // shows whether a flag change was the cause.
  finalResult.flagSnapshot = auditFlagSnapshot;

  // Stamp the applied calibration segment on the result for Transparency Tab.
  if (_calibBundle) {
    finalResult.appliedCalibrationSegment = _calibBundle.segmentKey ?? _calibBundle.scope;
    finalResult.calibrationFallbackLevel  = _calibBundle.fallbackLevel;
  }

  // Release the per-audit flag lock and calibration bundle before caching.
  clearAuditFlags();
  setAuditCalibrationBundle(null);
  setAuditL1Thresholds(null, null);

  // v40.0 Task 5.5: Cache successful result to IndexedDB for offline fallback.
  // Fire-and-forget — cache write failure must never block the response.
  cacheLastAuditResult(
    inputs.companyName,
    { result: finalResult, companyData, source: dataSource },
    inputs.roleTitle,
    inputs.department,
  ).catch(() => { /* non-fatal */ });

  // Phase 1 (Career OS): record audit in career twin state (fire-and-forget).
  // Full profile sync happens in CareerOSHome — here we only record the score history.
  syncTwinFromProfile(
    { jobTitle: inputs.roleTitle ?? undefined },
    finalResult,
  ).catch(() => {});

  return { result: finalResult, companyData, source: dataSource, _timer };
}

/**
 * v40.0 Task 5.5 — Offline-aware wrapper for `fetchAuditData`.
 *
 * Tries the live pipeline first. On network failure (TypeError: Failed to fetch,
 * or any fetch-related error), returns the last cached result from IndexedDB
 * with `unifiedFreshness.tier = 'stale'` so the UI displays the offline banner.
 *
 * Returns null from the cache when no cached result exists for this company.
 */
export async function fetchAuditDataWithOfflineFallback(
  inputs: AuditInputs,
): Promise<{
  result: HybridResult;
  companyData: CompanyData;
  source: 'live' | 'db' | 'stale_db' | 'fallback';
  fromOfflineCache?: boolean;
  _timer?: PipelineTimerInstance;
}> {
  try {
    return await fetchAuditData(inputs);
  } catch (err) {
    // Only attempt offline fallback for network-class errors.
    const isNetworkError =
      err instanceof TypeError &&
      (String(err.message).includes('fetch') || String(err.message).includes('network'));
    if (!isNetworkError) throw err;

    const cached = await getLastAuditResult(inputs.companyName, inputs.roleTitle, inputs.department);
    if (!cached) throw err; // No cache — re-throw so caller sees the real error.

    const { result, companyData, source } = cached as {
      result: HybridResult;
      companyData: CompanyData;
      source: 'live' | 'db' | 'stale_db' | 'fallback';
    };

    // Mark freshness as stale so the UI shows the offline banner.
    (result as any).unifiedFreshness = {
      score: 0,
      tier: 'stale',
      liveQuorumDegraded: true,
      sources: { liveFreshnessScore: 0, dbFreshnessScore: 50, macroIsHeuristic: true, industryRiskAgeDays: 999, liveQuorumReached: false, genuineApiSignals: 0 },
      summary: `Offline — showing cached result from ${new Date(((cached as any).cachedAt ?? Date.now()) as number).toLocaleDateString()}. Reconnect to refresh.`,
    };

    return { result, companyData, source, fromOfflineCache: true };
  }
}
