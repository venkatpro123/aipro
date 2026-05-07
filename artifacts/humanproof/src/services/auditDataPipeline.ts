// auditDataPipeline.ts
// Hierarchical data retrieval and normalization for Layoff Audit dashboards.
// Phase 1 Fix 4: liveSignalCount is now truthful (was hardcoded 5 even when source was DB).
// Phase 2: Integrates fetchLiveCompanyData for Alpha Vantage + NewsAPI enrichment.

import { CompanyData } from "../data/companyDatabase";
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

const safeLower = (value: unknown, fallback = ""): string =>
  typeof value === "string" && value.trim().length > 0 ? value.toLowerCase() : fallback;

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
    region: osintData.region ?? osintData.country_code ?? "GLOBAL",
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
  source: 'live' | 'db' | 'fallback',
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
  source: 'live' | 'db' | 'fallback',
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
  source: 'live' | 'db' | 'fallback';
  _timer?: PipelineTimerInstance;
}> {
  // ── Pipeline timing ─────────────────────────────────────────────────────────
  const _timer = PipelineTimer.start(inputs.companyName);
  _timer.mark('osint_start');

  // Load admin-curated layoff events from Supabase, overriding hardcoded seeds.
  // Fire-and-forget — non-fatal if Supabase is unavailable; seeded fallbacks remain.
  loadCuratedLayoffEvents().catch(() => {});

  let companyData: CompanyData | null = null;
  let dataSource: 'live' | 'db' | 'fallback' = 'db';
  let trueLiveSignals = 0;
  let trueHeuristicSignals = 0;
  let reconciledSignals: ReconciledCompanySignals | null = null;
  let companyMatchConfidence = 0;
  let companyMatchType: "exact" | "prefix" | "contains" | "word_overlap" | "none" = "none";

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
        dataSource = 'live';
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
        p_service:  'yahoo_finance',
        p_budget:   50, // Yahoo Finance via proxy has no strict per-key cap; 50/day is a safety rail
      });
      userAllowedLiveCalls = allowed !== false; // null/undefined = allow (RPC error = fail open)
      if (!userAllowedLiveCalls) {
        console.info('[AuditPipeline] Per-user stock proxy quota exhausted for today — heuristic fallback');
        import('./apiDegradationMonitor').then(({ recordApiDegradation }) => {
          recordApiDegradation('yahoo_finance', 'rate_limited', 'Per-user daily budget exhausted (50/day)');
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

  const industryKey = companyData.industry?.trim();
  const _industryMap = getAllIndustryRisk();
  const industryData: IndustryRisk | undefined = industryKey
    ? _industryMap[industryKey] ??
      _industryMap[industryKey.replace(/\b\w/g, (c) => c.toUpperCase())]
    : undefined;

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

  const shadowScoreInputs: ScoreInputs = {
    companyData: shadowCompanyData,
    industryData,
    roleTitle: inputs.roleTitle,
    department: inputs.department,
    userFactors: inputs.userFactors,
    liveHiringSignal,
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
    console.warn('[AuditPipeline] jobMarketLiquidity computation failed:', e);
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
    console.warn('[AuditPipeline] escapePathOptimizer computation failed:', e);
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
    console.warn('[AuditPipeline] temporalRiskAmplifier computation failed:', e);
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
    console.warn('[AuditPipeline] precisionBrief computation failed:', e);
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
    console.warn('[AuditPipeline] scoreSensitivity computation failed:', e);
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
    console.warn('[AuditPipeline] departmentRisk computation failed:', e);
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
    console.warn('[AuditPipeline] financialRunway computation failed:', e);
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
    console.warn('[AuditPipeline] signalContradictions computation failed:', e);
  }

  // 9. Executive Movement Intelligence — leadership departure risk
  try {
    const departures = deriveExecutiveDepartures(companyData);
    const executiveMovement = computeExecutiveMovementRisk(departures);
    (hybridResult as any).executiveMovement = executiveMovement;
  } catch (e) {
    console.warn('[AuditPipeline] executiveMovement computation failed:', e);
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
    console.warn('[AuditPipeline] hiringSignal computation failed:', e);
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
    console.warn('[AuditPipeline] competitiveIntelligence computation failed:', e);
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
    console.warn('[AuditPipeline] exitTiming computation failed:', e);
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
    console.warn('[AuditPipeline] careerResilience computation failed:', e);
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
    });
    (hybridResult as any).survivalProbability = survivalProbability;
  } catch (e) {
    console.warn('[AuditPipeline] survivalProbability computation failed:', e);
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
    console.warn('[AuditPipeline] managerRisk computation failed:', e);
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
    console.warn('[AuditPipeline] scoreTrajectory computation failed:', e);
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
    console.warn('[AuditPipeline] visaRisk computation failed:', e);
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
    console.warn('[AuditPipeline] internalMobility computation failed:', e);
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
    console.warn('[AuditPipeline] roleAdjacency computation failed:', e);
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
    console.warn('[AuditPipeline] negotiationIntelligence computation failed:', e);
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
    }),
    companyData,
    source: dataSource,
    _timer,
  };
}
