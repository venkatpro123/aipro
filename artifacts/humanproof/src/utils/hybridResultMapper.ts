// hybridResultMapper.ts
// Maps various result types (ScoreResult, EnsembleResult) to the canonical HybridResult contract.

import { HybridResult, DEFAULT_HYBRID_RESULT, isHybridResult } from "../types/hybridResult";
import { ScoreResult } from "../services/layoffScoreEngine";
import { EnsembleResult } from "../services/ensemble/ensembleOrchestrator";
import { CompanyData } from "../data/companyDatabase";

const safeLower = (value: unknown, fallback = ""): string =>
  typeof value === "string" && value.trim().length > 0 ? value.toLowerCase() : fallback;

export function mapToHybridResult(
  result: ScoreResult | EnsembleResult | HybridResult,
  companyData: CompanyData,
  inputs: {
    roleTitle: string;
    department: string;
    tenureYears: number;
    oracleKey?: string;
    experience?: string;
  },
  _dataQuality: "live" | "partial" | "fallback" = "live",
  trueLiveSignals?: number,
  trueHeuristicSignals?: number,
): HybridResult {
  if (isHybridResult(result)) {
    return result;
  }

  const isEnsemble = (r: any): r is EnsembleResult => "ensembleScore" in r;

  // Preserve core score
  const total = isEnsemble(result) ? result.ensembleScore : result.score;
  
  // Dimensions mapping (L1-L5 + D6/D7 when present).
  // The previous mapper omitted D6 (AI Agent Capability) and D7 (Unified
  // Company Health Risk) even though `auditDataPipeline.mapToHybridResult`
  // emits them — so the dashboard rendered 5 bars on the engine path and 7 on
  // the pipeline path, which the user perceived as missing data on the
  // ensemble route. Include D6/D7 when the breakdown has them defined.
  const breakdownAny = result.breakdown as unknown as Record<string, number | undefined>;
  // L4 (Market Headwinds / D5_countryContext) is excluded from display: country context
  // enters the formula through D1 (country multiplier, w=0.18) and L1 (PPP, w=0.16),
  // not as a standalone dimension. Showing a 0-weight L4 card provides no user value.
  const dimensions = [
    { key: "L1" as const, label: "Company Health", score: Math.round(result.breakdown.L1 * 100) },
    { key: "L2" as const, label: "Layoff History", score: Math.round(result.breakdown.L2 * 100) },
    { key: "L3" as const, label: "Role Displacement", score: Math.round(result.breakdown.L3 * 100) },
    { key: "L5" as const, label: "Your Exposure", score: Math.round(result.breakdown.L5 * 100) },
  ] as Array<{
    key: "L1" | "L2" | "L3" | "L4" | "L5" | "D6" | "D7" | "D1" | "D2" | "D3" | "D4" | "D5";
    label: string;
    score: number;
  }>;
  if (typeof breakdownAny.D6 === "number") {
    dimensions.push({ key: "D6", label: "AI Agent Capability", score: Math.round(breakdownAny.D6 * 100) });
  }
  if (typeof breakdownAny.D7 === "number") {
    dimensions.push({ key: "D7", label: "Company Health Risk", score: Math.round(breakdownAny.D7 * 100) });
  }

  // Reasoning concatenation
  const reasoning = result.recommendations.map(r => r.description).join(" ");

  // Map ActionPlanItems — preserve all optional fields so UI components
  // (evidence trail, learning weeks, urgency-adjusted deadlines) work correctly.
  // Cast to `any` first because the engine's ActionPlanItem type doesn't declare
  // `originalDeadline`, `learningWeeks`, or `evidence` — those live in hybridResult.ts.
  // They are set by buildDynamicActions and carried through as extra properties.
  const recommendations = result.recommendations.map((r) => {
    const rAny = r as any;
    return {
      id: r.id,
      title: r.title,
      description: r.description,
      priority: r.priority,
      layerFocus: r.layerFocus,
      riskReductionPct: r.riskReductionPct,
      deadline: r.deadline,
      ...(rAny.originalDeadline !== undefined && { originalDeadline: rAny.originalDeadline }),
      ...(rAny.learningWeeks    !== undefined && { learningWeeks:    rAny.learningWeeks    }),
      ...(rAny.evidence         !== undefined && { evidence:         rAny.evidence         }),
    };
  });

  return {
    ...DEFAULT_HYBRID_RESULT,
    total,
    breakdown: result.breakdown,
    tier: {
      label: result.tier.label,
      color: result.tier.color,
      advice: result.tier.advice
    },
    confidence: result.confidence,
    confidencePercent: result.confidencePercent,
    confidenceInterval: result.confidenceInterval,
    dimensions,
    reasoning,
    dataFreshness: result.dataFreshness,
    signalQuality: {
      hasConflicts: result.signalQuality.hasConflicts,
      conflictingSignals: result.signalQuality.conflictingSignals.map(c => ({
        signalType: c.signal1,
        descriptions: [c.signal2],
        severity: (safeLower((c as any).severity, "medium") as any) || "medium",
        conflictingSources: []
      })),
      // Use pipeline-provided counts when available; fall back to engine's own count
      liveSignals: trueLiveSignals ?? result.signalQuality.liveSignals ?? 0,
      heuristicSignals: trueHeuristicSignals ?? result.signalQuality.heuristicSignals ?? 0,
      missingDataFallbacks: result.signalQuality.missingDataFallbacks,
      degradedSignalClasses: (result.signalQuality as any).degradedSignalClasses,
      hardFailures: (result.signalQuality as any).hardFailures,
      confidenceCapsApplied: (result.signalQuality as any).confidenceCapsApplied,
    },
    consensusSnapshot: (result as any).consensusSnapshot,
    authoritativeSignals: (result as any).consensusSnapshot?.authoritativeSignals,
    reconciliationSummary: (result as any).consensusSnapshot?.reconciliationSummary,
    recommendations,
    workTypeKey: inputs.oracleKey || "generic",
    industryKey: safeLower(companyData.industry, "technology").replace(/\s+/g, "_"),
    countryKey: safeLower(companyData.region, "usa") || "usa",
    experience: inputs.experience || "5-10",
    companyName: companyData.name,
    primaryRiskDriver: isEnsemble(result) ? (result as any).primaryRiskDriver ?? null : null,
    sixMonthInactionConsequence: isEnsemble(result) ? (result as any).sixMonthInactionConsequence ?? null : null,
    oneActionThisWeek: isEnsemble(result) ? (result as any).oneActionThisWeek ?? null : null,
    whatChangesRiskMost: isEnsemble(result) ? (result as any).whatChangesRiskMost ?? null : null,
    estimatedTimeline: isEnsemble(result) ? (result as any).estimatedTimeline ?? null : null,
    keyProtectiveFactor: isEnsemble(result) ? (result as any).keyProtectiveFactor ?? null : null,
    scenarioArchetype: isEnsemble(result) ? (result as any).scenarioArchetype : undefined,
    scenarioArchetypeLabel: isEnsemble(result) ? (result as any).scenarioArchetypeLabel : undefined,
    indiaSpecificInsight: isEnsemble(result) ? (result as any).indiaSpecificInsight : undefined,
    confidenceNote: isEnsemble(result) ? (result as any).confidenceNote : undefined,
    performanceTier:             isEnsemble(result) ? undefined : (result as ScoreResult).performanceTier,
    reportedPerformanceTier:     isEnsemble(result) ? undefined : (result as ScoreResult).reportedPerformanceTier,
    performanceCredibilityScore:          isEnsemble(result) ? undefined : (result as ScoreResult).performanceCredibilityScore,
    performanceCredibilityRegionKey:      isEnsemble(result) ? undefined : (result as ScoreResult).performanceCredibilityRegionKey,
    performanceCredibilityThresholdLabel: isEnsemble(result) ? undefined : (result as ScoreResult).performanceCredibilityThresholdLabel,
    _formulaScorePreFloor:                isEnsemble(result) ? undefined : (result as ScoreResult)._formulaScorePreFloor,
    hyperscalerD8ProxyApplied:            isEnsemble(result) ? undefined : (result as ScoreResult).hyperscalerD8ProxyApplied,
    hyperscalerD8ProxyAmount:             isEnsemble(result) ? undefined : (result as ScoreResult).hyperscalerD8ProxyAmount,
    // BUG-02: D8 effective weight state for TransparencyTab disclosure.
    d8FlagActive:                         isEnsemble(result) ? undefined : (result as ScoreResult).d8FlagActive,
    d8HeuristicActive:                    isEnsemble(result) ? undefined : (result as ScoreResult).d8HeuristicActive,
    d8EffectiveWeight:                    isEnsemble(result) ? undefined : (result as ScoreResult).d8EffectiveWeight,
    meta: {
      usedLiveSignals: (trueLiveSignals ?? result.signalQuality.liveSignals ?? 0) > 0,
      liveSignalCount: trueLiveSignals ?? result.signalQuality.liveSignals ?? 0,
      swarmAgentCount: 30,
      dbSource: companyData.source,
      calculationMode: isEnsemble(result) ? "ENSEMBLE_CORE" : "DETERMINISTIC_ENGINE",
      timestamp: result.calculatedAt
    },
    _engineResult: isEnsemble(result) ? undefined : result,
    // Deterministic historical pattern from matchHistoricalPattern() — never LLM-sourced.
    resolvedPattern:           isEnsemble(result) ? (result as any).resolvedPattern           ?? null : undefined,
    patternMatchOverlapScore:  isEnsemble(result) ? (result as any).patternMatchOverlapScore  ?? null : undefined,
    patternMatchRoleFit:       isEnsemble(result) ? (result as any).patternMatchRoleFit       ?? null : undefined,
    // v7.0 Fix 5: Thread timing and probabilityForecast for direct OverviewTab access
    timing:              result.timing,
    probabilityForecast: result.probabilityForecast,
    // v8.0: Pass through India sector enrichment when present
    indiaRiskEnrichment: (result as ScoreResult).indiaRiskEnrichment,
  };
}
