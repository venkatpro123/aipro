// ensembleOrchestrator.ts
// Master controller — deterministic engine + swarm + tiered LLM analysis.
// API keys never reach the browser. llm-analyze Edge Function holds ANTHROPIC_API_KEY.
//
// ── 3-TIER LLM ARCHITECTURE ──────────────────────────────────────────────────
// Tier A: Globally known company (top 500 + top 100 India) with real financial data
//         → Call Claude with full signal context. Produces genuine grounded narrative.
// Tier B: Known sector company (in DB but not top-tier, or partial data)
//         → Deterministic template narrative personalized at variable level.
//         → No API cost, honest framing, still useful.
// Tier C: Unknown company (source includes 'Fallback' or 'Unknown')
//         → Skip LLM entirely. Show score with explicit scope framing.
//         → A hallucinated narrative is worse than no narrative.
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from "../../utils/supabase";
import { invokeEdgeFunction } from "../../infrastructure/requestId";
import {
  aggregateEnsembleResults,
  AggregateResult,
} from "./ensembleAggregator";
// Agent types kept for interface compatibility — no longer called directly
import type { GemmaResult } from "./gemmaAgent";
import type { DeepSeekResult } from "./deepseekAgent";
import type { LlamaResult } from "./llamaAgent";
import type { GeminiResult } from "./geminiAgent";
import {
  calculateLayoffScore,
  ScoreResult,
  ScoreTier,
  ScoreBreakdown,
  UserFactors,
  type UniquenessDepth,
} from "../layoffScoreEngine";
import { getCachedAnalysis, setCachedAnalysis } from "../cache/analysisCache";
import { loadScoreHistory, getUserReturnType, computeScoreVelocity } from "../scoreDeltaService";
import { CompanyData } from "../../data/companyDatabase";
import { IndustryRisk } from "../../data/industryRiskData";
import { RoleExposure } from "../../data/roleExposureData";
// ── [SWARM] Swarm Intelligence Layer imports ──────────────────────────────────
import { runSwarmLayer } from "../swarm/swarmOrchestrator";
import { buildSwarmContext } from "../swarm/swarmContextBuilder";
import { SwarmReport, PeerLayoffEvent } from "../swarm/swarmTypes";
import { PipelineTimer, type PipelineTimerInstance } from "../pipelineTimer";
import { COMPANY_INTELLIGENCE_DB } from "../../data/companyIntelligenceDB";
import {
  matchHistoricalPattern,
  buildPatternPromptContext,
  computeTopPatternCandidates,
  type HistoricalPattern,
  type PatternMatchResult,
} from "../../data/historicalPatterns";
import {
  buildScenarioNarrative,
  detectScenario,
  getScenarioArchetypeLabel,
  type ScenarioArchetype,
} from "../scenarioNarrativeEngine";
import {
  getPersonalizedActions,
  resolveRoleGroup,
  getRoleGroupLabel,
} from "../actionPersonalizationEngine";
import { deriveSeniorityBracket } from "../seniorityActionEngine";

// ── Agent status — transparent LLM failure reporting ─────────────────────────
export interface AgentStatusMap {
  gemma:    'success' | 'failed' | 'rate_limited';
  deepseek: 'success' | 'failed' | 'rate_limited';
  llama:    'success' | 'failed' | 'rate_limited';
  gemini:   'success' | 'failed' | 'rate_limited';
  failedCount: number;
  warningMessage: string | null;  // shown in UI if failedCount > 0
}

// ── Extended result type (superset of ScoreResult) ──────────────────────────
export interface EnsembleResult extends ScoreResult {
  // Ensemble additions
  ensembleScore: number; // Final AI-consensus score (may differ from engine score)
  engineScore: number; // Deterministic 5-layer engine score (always present)
  confidence: "High" | "Medium" | "Low"; // existing field, now richer
  confidencePercent: number; // 0–100 numeric version
  modelAgreement: number; // 0–100
  hasOutlier: boolean;
  outlierModels: string[];
  individualScores: AggregateResult["individualScores"];
  accuracyLabel: AggregateResult["accuracyLabel"];
  dominantRisk: string | null;
  keyProtection: string | null;
  timeHorizon: string | null;
  patternMatch: string | null;
  /** Deterministic match from matchHistoricalPattern() — null when no pattern reaches 70% overlap. */
  resolvedPattern: HistoricalPattern | null;
  /** Signal overlap score for the matched pattern (0.70–1.00), null when no match. */
  patternMatchOverlapScore: number | null;
  geminiSynthesis: GeminiResult["synthesis"];
  modelsUsed: string[];
  fromCache: boolean;
  // ── [AGENT STATUS] Transparent failure reporting ───────────────────────────
  agentStatus: AgentStatusMap;
  // ── [SWARM] Swarm Intelligence additions ──────────────────────────────────
  swarmReport?: SwarmReport; // Full 30-agent swarm output
  swarmScore?: number; // 0–100 swarm risk score
  primaryRiskDriver?: string | null;
  sixMonthInactionConsequence?: string | null;
  oneActionThisWeek?: string | null;
  whatChangesRiskMost?: string | null;
  estimatedTimeline?: string | null;
  keyProtectiveFactor?: string | null;
  scenarioArchetype?: string;
  scenarioArchetypeLabel?: string;
  indiaSpecificInsight?: string;
  confidenceNote?: string;
  // ── [TRAJECTORY] Oracle result for Displacement Trajectory feature ────────
  oracleResult?: {
    total: number;
    dimensions: Array<{
      key: string;
      label: string;
      score: number;
      reason: string;
    }>;
    verdict?: string;
    urgency?: string;
    timeline?: string;
    reasoning?: string;
    safer_career_paths?: Array<{
      role: string;
      risk_reduction_pct: number;
      skill_gap: string;
      transition_difficulty: string;
    }>;
  };
}

export interface EnsembleInputs {
  companyName: string;
  companyData: CompanyData;
  industry: string;
  industryData?: IndustryRisk;
  roleTitle: string;
  department: string;
  tenureYears: number;
  isUniqueRole: boolean;
  /** Priority 3: 3-level uniqueness depth — overrides isUniqueRole when present */
  uniquenessDepth?: UniquenessDepth;
  performanceTier: UserFactors["performanceTier"];
  hasRecentPromotion: boolean;
  hasKeyRelationships: boolean;
  roleExposureOverride?: RoleExposure;
  forceRefresh?: boolean;
  /** Optional timing instrumentation — passed from LayoffCalculator. */
  _timer?: PipelineTimerInstance;
  // ── Progress callback for stage-based UI transitions ──────────────────
  onSwarmComplete?: () => void;
}

const getScoreTier = (score: number): ScoreTier => {
  if (score >= 75)
    return {
      label: "High risk",
      color: "red",
      advice:
        "Take action now — update your CV, activate your network, and explore open roles this week.",
    };
  if (score >= 55)
    return {
      label: "Elevated risk",
      color: "orange",
      advice:
        "Stay alert — strengthen your position internally and build your external safety net.",
    };
  if (score >= 35)
    return {
      label: "Moderate risk",
      color: "amber",
      advice:
        "Monitor closely — you are not in immediate danger, but preparation is wise.",
    };
  if (score >= 15)
    return {
      label: "Low risk",
      color: "green",
      advice:
        "Relatively stable — keep growing your skills and maintaining key relationships.",
    };
  return {
    label: "Very low risk",
    color: "teal",
    advice: "Strong position — focus on career growth rather than defence.",
  };
};

const confidenceFromPercent = (pct: number): "High" | "Medium" | "Low" => {
  if (pct >= 75) return "High";
  if (pct >= 50) return "Medium";
  return "Low";
};

// ── Peer layoff event builder for sectorContagionAgent ───────────────────────
// Scans COMPANY_INTELLIGENCE_DB for companies in the same industry that have
// a known layoff date, producing the PeerLayoffEvent list the contagion agent
// needs for temporal analysis.
//
// Industry matching is loose: COMPANY_INTELLIGENCE_DB uses compound strings
// like 'Technology / AI' while companyData.industry uses 'Technology'.
// We match on the first word of the DB industry string.
//
// percentCut is estimated from totalLayoffs ÷ implied headcount. Where headcount
// is unavailable we fall back to frequency-based estimates.
const SIZE_TO_HEADCOUNT: Record<string, number> = {
  small: 300, mid: 2000, large: 20000, enterprise: 60000,
};
const FREQ_TO_PCT: Record<string, number> = {
  frequent: 8, moderate: 4, rare: 2,
};

const buildPeerLayoffEvents = (
  targetIndustry: string,
  targetCompanyName: string,
): PeerLayoffEvent[] => {
  const targetWord = targetIndustry.split(/[\s/,]+/)[0].toLowerCase();
  const events: PeerLayoffEvent[] = [];

  for (const [, profile] of Object.entries(COMPANY_INTELLIGENCE_DB)) {
    // Skip the target company itself and companies with no layoff history
    if (
      profile.companyName === targetCompanyName ||
      profile.layoffHistory.layoffFrequency === 'none' ||
      profile.layoffHistory.lastLayoffDate === 'none'
    ) continue;

    // Loose industry match: both directions — handles 'Technology / AI' ↔ 'Technology'
    const profileWord = profile.industry.split(/[\s/,]+/)[0].toLowerCase();
    const matches =
      profileWord === targetWord ||
      profile.industry.toLowerCase().includes(targetWord) ||
      targetIndustry.toLowerCase().includes(profileWord);
    if (!matches) continue;

    // Estimate percent cut from totalLayoffs ÷ implied headcount, or fallback
    const impliedHeadcount = SIZE_TO_HEADCOUNT[profile.companySize] ?? 5000;
    const estimatedPct =
      profile.layoffHistory.totalLayoffs > 0
        ? parseFloat(((profile.layoffHistory.totalLayoffs / impliedHeadcount) * 100).toFixed(1))
        : (FREQ_TO_PCT[profile.layoffHistory.layoffFrequency] ?? 4);

    events.push({
      company:    profile.companyName,
      date:       profile.layoffHistory.lastLayoffDate,
      percentCut: Math.min(50, estimatedPct),  // cap at 50% to prevent outlier distortion
      department: profile.layoffHistory.affectedDepartments[0] ?? undefined,
    });
  }

  return events;
};

// Counts ALL companies in COMPANY_INTELLIGENCE_DB that share the target
// industry — including those with no layoff history. This is the denominator
// for sectorCuttingFraction in sectorContagionAgent.
//
// A company at the 40th percentile of a 20-company tracked sector needs 8
// peers to cut before the macro correction fires. Without this count the
// agent cannot distinguish "3 of 5 tracked companies cutting" (60% — macro)
// from "3 of 50 tracked companies cutting" (6% — likely contagion).
//
// Industry matching is identical to buildPeerLayoffEvents so the two
// functions always agree on which companies belong to the sector.
const countTrackedSectorCompanies = (
  targetIndustry: string,
  targetCompanyName: string,
): number => {
  const targetWord = targetIndustry.split(/[\s/,]+/)[0].toLowerCase();
  let count = 0;
  for (const [, profile] of Object.entries(COMPANY_INTELLIGENCE_DB)) {
    if (profile.companyName === targetCompanyName) continue;
    const profileWord = profile.industry.split(/[\s/,]+/)[0].toLowerCase();
    const matches =
      profileWord === targetWord ||
      profile.industry.toLowerCase().includes(targetWord) ||
      targetIndustry.toLowerCase().includes(profileWord);
    if (matches) count++;
  }
  return count;
};

export const runFullEnsembleAnalysis = async (
  inputs: EnsembleInputs,
): Promise<EnsembleResult> => {
  const {
    companyName,
    companyData,
    industry,
    industryData,
    roleTitle,
    department,
    tenureYears,
    isUniqueRole,
    uniquenessDepth,
    performanceTier,
    hasRecentPromotion,
    hasKeyRelationships,
    roleExposureOverride,
    forceRefresh = false,
    _timer,
    onSwarmComplete,
  } = inputs;

  // ── Step 1: Cache check — FIX: key includes ALL user factors to prevent cross-user collisions ──
  // Previously only contained company/role/dept — two users with different tenure/performance
  // would receive each other's cached scores.
  const cacheKey = [
    companyName.toLowerCase(),
    roleTitle.toLowerCase(),
    department.toLowerCase(),
    String(tenureYears),
    performanceTier,
    uniquenessDepth ?? (isUniqueRole ? 'critical_knowledge' : 'generic'), // prevents cross-user collision
    hasRecentPromotion ? '1' : '0',
    hasKeyRelationships ? '1' : '0',
    forceRefresh ? 'refresh' : 'standard',
  ].join('::');

  if (!forceRefresh) {
    const cached = await getCachedAnalysis(cacheKey);
    if (cached) {
      // Retrieve the write timestamp so the UI can show "Cached X minutes ago"
      const { getCacheTimestamp } = await import('../cache/analysisCache');
      const cachedAt = getCacheTimestamp(cacheKey) ?? (cached._cachedAt as number | undefined);
      console.log("[Ensemble] Cache hit — returning cached result");
      return { ...cached, fromCache: true, cachedAt };
    }
  }

  // ── [SWARM] Step 1.5: Run Swarm Intelligence Layer ──────────────────────
  let swarmReport: SwarmReport | undefined;
  let swarmContext = "";
  try {
    _timer?.mark('swarm_start');

    // Build peer layoff events for sectorContagionAgent.
    // Finds all companies in COMPANY_INTELLIGENCE_DB that share the same
    // industry (loose match) and have a known layoff date — giving the
    // contagion agent actual dated events instead of static averages.
    const peerLayoffEvents = buildPeerLayoffEvents(industry, companyName);
    // Total tracked companies in this sector (denominator for sectorCuttingFraction).
    // Computed with the same industry-matching logic so the two values are consistent.
    const totalTrackedSectorCompanies = countTrackedSectorCompanies(industry, companyName);

    swarmReport = await runSwarmLayer(
      {
        companyName,
        companyData,
        industry,
        industryData,
        roleTitle,
        department,
        tenureYears,
        peerLayoffEvents,
        totalTrackedSectorCompanies,
        userFactors: {
          tenureYears,
          isUniqueRole,
          performanceTier,
          hasRecentPromotion,
          hasKeyRelationships,
        },
      },
      forceRefresh,
    );
    _timer?.mark('swarm_end');
    swarmContext = buildSwarmContext(swarmReport);
    console.log(
      `[Swarm] Score: ${swarmReport.swarmRiskScore}/100 | Confidence: ${swarmReport.swarmConfidence}% | Live agents: ${swarmReport.liveAgentsUsed}`,
    );
  } catch (swarmErr: any) {
    console.warn(
      "[Swarm] Layer failed — continuing without swarm data:",
      swarmErr.message,
    );
  }
  // ── Notify caller that swarm phase is complete → triggers UI stage 2 ──────
  if (onSwarmComplete) onSwarmComplete();

  // ── LLM Tier Classification ──────────────────────────────────────────────
  // Classify before the engine runs so tier drives Step 3 routing below.
  // NEVER call LLM for unknown companies — hallucination destroys trust.
  type LLMTier = 'A' | 'B' | 'C';

  const classifyLLMTier = (cd: CompanyData): LLMTier => {
    const src = (cd.source ?? '').toLowerCase();

    // ── Tier C: Unknown company ───────────────────────────────────────────────
    // Source-string gate: any of these strings means the company is unknown or
    // the data is user-supplied speculation. The LLM has no verified knowledge
    // to ground a narrative on — calling it would produce hallucination.
    if (src.includes('fallback') || src.includes('unknown') || src.includes('user input')) return 'C';

    // ── Tier A: Rich, fresh, grounded data — LLM can produce verified narrative ─
    // ALL conditions must be true:
    //   1. revenueGrowthYoY is non-null:  primary financial signal; its absence
    //      means the LLM cannot verify any financial claims it makes.
    //   2. Stock data present OR private:  public co without stock data = incomplete.
    //      Private companies don't have stock, so absence is structurally correct.
    //   3. employeeCount > 0:             scale context; 0 means data is missing,
    //      not that the company has no employees.
    //   4. At least one layoff-history signal is populated:
    //      layoffsLast24Months.length > 0 OR layoffRounds > 0 OR lastLayoffPercent != null.
    //      (replaces the vacuous "layoffRounds >= 0" which was always true and
    //      contributed zero additional protection)
    //   5. Data freshness < 90 days:      stale data (>90d) produces the same
    //      score as fresh data but the LLM cannot reliably caveat what has changed.
    //      Downgrade to Tier B for staleness so the template (which doesn't claim
    //      freshness) is used instead.
    const dataAgeInDays = Math.round(
      (Date.now() - new Date(cd.lastUpdated ?? '2000-01-01').getTime()) / 86_400_000
    );
    const hasLayoffSignal =
      (cd.layoffsLast24Months?.length ?? 0) > 0 ||
      (cd.layoffRounds ?? 0) > 0 ||
      cd.lastLayoffPercent != null;

    const hasRichData =
      cd.revenueGrowthYoY != null &&
      (cd.stock90DayChange != null || !cd.isPublic) &&
      cd.employeeCount > 0 &&
      hasLayoffSignal &&        // replaces vacuous layoffRounds >= 0
      dataAgeInDays <= 90;      // stale data → Tier B (no false "grounded" claim)

    if (hasRichData) return 'A';

    // ── Tier B: Known company, partial/stale data ─────────────────────────────
    // Deterministic template: uses company name + score breakdown, no API call.
    // Cannot hallucinate because it never calls the LLM.
    return 'B';
  };

  const llmTier = classifyLLMTier(companyData);

  // ── Tier B: Scenario-Narrative engine (v8.0) ─────────────────────────────
  //
  // Replaces the 10-template static pool with the 144+ scenario matrix from
  // scenarioNarrativeEngine.ts. Every output sentence contains ≥1 specific
  // number from the actual score breakdown. No generic sentences.
  //
  // Scenario detection classifies the dominant risk archetype first, then
  // generates context-aware language for that specific pattern. India region
  // gets GCC/bench/contagion-specific narratives automatically.
  const buildTierBNarrative = (
    cd: CompanyData,
    role: string,
    score: number,
    bd: { L1: number; L2: number; L3: number; L4?: number; L5?: number; D6?: number; D7?: number; D8?: number },
    collapseStageLocal?: 1 | 2 | 3 | null,
    recs?: Array<{ title: string; riskReductionPct: number; priority: string }>,
  ): typeof claudeAnalysis => {
    const industryLabel = cd.industry ?? 'your sector';
    const tierLabel = score >= 75 ? 'High risk' : score >= 55 ? 'Elevated risk'
      : score >= 35 ? 'Moderate risk' : 'Low risk';

    // ── v8.0: Delegate to ScenarioNarrativeEngine ────────────────────────────
    // Detects the dominant risk archetype and builds a data-driven narrative
    // specific to that scenario. Replaces the 10 static templates with 144+
    // scenario combinations that are India-aware, GCC-aware, and role-specific.
    const scenario = buildScenarioNarrative(
      cd,
      { ...bd, L2: bd.L2 ?? 0 },
      score,
      role,
      tenureYears,
      uniquenessDepth,
      recs,
    );

    // ── Collapse-stage timeline compression (preserved from v7.0) ────────────
    const COLLAPSE_COMPRESSION: Record<number, number> = { 1: 0.75, 2: 0.50, 3: 0.25 };
    // Guard: collapseStageLocal must be 1, 2, or 3 — any other value (0, null, 4+) uses 1.0
    const compressionFactor = (collapseStageLocal != null && collapseStageLocal >= 1 && collapseStageLocal <= 3)
      ? (COLLAPSE_COMPRESSION[collapseStageLocal] ?? 1)
      : 1;
    const horizon = compressionFactor < 1
      ? `${scenario.estimatedTimeline} → compressed ×${compressionFactor} by Stage ${collapseStageLocal} collapse signals`
      : scenario.estimatedTimeline;

    // ── Role-specific personalized action (v8.0 addition) ────────────────────
    // Replace the 5 generic bracket actions with the 47-role action pool.
    // v13.0: map scenario archetype → company action context for differentiated guidance
    const _archetypeToContext = (arch: string | undefined): import('../actionPersonalizationEngine').CompanyActionContext => {
      if (!arch) return 'unknown';
      if (arch.includes('ai_efficiency')) return 'ai_efficiency_restructuring';
      if (arch.includes('financial_distress') || arch.includes('distress')) return 'financial_distress';
      if (arch.includes('sector_wave') || arch.includes('contagion')) return 'sector_wave';
      if (arch.includes('low_risk') || arch.includes('stable')) return 'stable_growth';
      return 'unknown';
    };
    const _companyContext = _archetypeToContext(scenario.archetype);
    const seniorityBracket = deriveSeniorityBracket(tenureYears, 'average', uniquenessDepth, undefined);
    const personalizedSet = getPersonalizedActions(role, seniorityBracket, score, cd.region, _companyContext, cd.name);
    // Null-safe: actions array may be empty if no pool matched (should not happen after v8.0 additions)
    const topPersonalizedAction = personalizedSet?.actions?.[0];
    const oneActionThisWeek = topPersonalizedAction?.description
      ? `${topPersonalizedAction.title}: ${topPersonalizedAction.description}`
      : scenario.oneActionThisWeek;

    return {
      success: true,
      // v7.0 canonical field names — now backed by scenario engine
      primaryRiskDriver:            scenario.primaryRiskDriver,
      sixMonthInactionConsequence:  scenario.sixMonthInactionConsequence,
      oneActionThisWeek,
      whatChangesRiskMost:          scenario.whatChangesRiskMost,
      estimatedTimeline:            horizon,
      keyProtectiveFactor:          scenario.keyProtectiveFactor,
      // legacy aliases
      dominantRiskFactor:           scenario.primaryRiskDriver,
      timeHorizon:                  horizon,
      synthesis: scenario.synthesis,
      urgencyLevel: scenario.urgencyLevel,
      // v8.0 additions
      scenarioArchetype:            scenario.archetype,
      scenarioArchetypeLabel:       getScenarioArchetypeLabel(scenario.archetype),
      indiaSpecificInsight:         scenario.indiaSpecificInsight,
      confidenceNote:               scenario.confidenceNote,
    };
  };

  // ── Tier C: Scope-framing (no LLM, no template speculation) ─────────────
  const buildTierCNarrative = (
    cd: CompanyData,
    role: string,
    score: number,
  ): typeof claudeAnalysis => {
    const horizon = score >= 65 ? '12–18 months (role-based estimate)' : '24–36 months (role-based estimate)';
    const riskLabel = `Role-level AI displacement risk for ${role} in ${cd.industry ?? 'your sector'}`;
    return {
      success: true, // "success" = valid analysis, just limited scope
      // v7.0 canonical fields
      primaryRiskDriver:           riskLabel,
      sixMonthInactionConsequence: `Without action, your role-level displacement risk remains unmitigated by company-specific context. Score accuracy is ±25–30 points for unknown companies — the actual risk may be higher or lower depending on ${cd.name}'s financial health and AI investment level, which are not available in this analysis.`,
      oneActionThisWeek:           `Since company data is limited, focus on the role-level action: map which of your current tasks AI tools can already do and begin positioning yourself as the oversight layer for those tasks. Role L3 score is the most actionable lever you can address independently of company signals.`,
      whatChangesRiskMost:         `1. Get company-specific data by re-running the audit with the full company name as it appears in public filings — this unlocks L1 and L2 signals. 2. Build an AI-oversight proof point (a project, case study, or post demonstrating you direct AI rather than compete with it). 3. Activate your professional network to get inside information about ${cd.name}'s current hiring and restructuring signals.`,
      estimatedTimeline:           horizon,
      keyProtectiveFactor:         'Score reflects role and market conditions, not employer-specific stability',
      // legacy aliases
      dominantRiskFactor:          riskLabel,
      timeHorizon:                 horizon,
      synthesis: `Note: "${cd.name}" was not found in our company intelligence database. This score reflects your role's displacement risk in the ${cd.industry ?? 'broader'} sector and current market conditions — it does NOT reflect employer-specific signals (financial health, layoff history, AI investment). Score accuracy bounds are ±25–30 points. For a full company-specific audit, ensure the company name matches our database or provide additional company details.`,
      urgencyLevel: score >= 75 ? 'High' : score >= 45 ? 'Moderate' : 'Low',
    };
  };

  // ── Step 2: Run deterministic 5-layer engine (always, no API cost) ────────
  // v7.0 Fix 3: Thread live hiring signal so L3 posting-trend adjustment fires.
  // companyData arrives pre-patched from the pipeline via patchCompanyDataWithLive
  // which stores hiring signals as _hiring* fields. Extract and pass as structured input.
  const _hiringTrend = (companyData as any)._hiringPostingTrend as string | undefined;
  const _hiringLive  = (companyData as any)._hiringIsLive as boolean | undefined;
  const liveHiringSignalForEngine = _hiringTrend && _hiringTrend !== 'unknown'
    ? {
        postingTrend: _hiringTrend as 'growing' | 'stable' | 'declining' | 'frozen',
        isLive:       !!_hiringLive,
        estimatedOpenings: (companyData as any)._estimatedRoleOpenings ?? null,
      }
    : undefined;

  const engineResult: ScoreResult = calculateLayoffScore({
    companyData,
    industryData,
    roleTitle,
    department,
    userFactors: {
      tenureYears,
      isUniqueRole,
      uniquenessDepth, // Priority 3: ensures 3-level depth reaches the engine
      performanceTier,
      hasRecentPromotion,
      hasKeyRelationships,
    },
    roleExposureOverride,
    liveHiringSignal: liveHiringSignalForEngine,
  });

  // ── Step 2b: Deterministic historical pattern matching ───────────────────
  // Runs immediately after scoring — no LLM, no network call.
  // matchHistoricalPattern() applies a hard 70% signal-overlap threshold.
  // Below threshold: null (no match is shown). Never invents a pattern.
  // The result is the authoritative source for resolvedPattern in the output —
  // the LLM is not asked to confirm, select, or override it.
  const deterministicPatternMatch: PatternMatchResult | null = matchHistoricalPattern(
    companyData,
    engineResult.breakdown as any,
    roleTitle,
  );

  // ── Step 3: Tiered narrative synthesis ───────────────────────────────────
  // Tier A → Claude (grounded); Tier B → deterministic template; Tier C → scope framing.
  // Law: never call LLM for unknown companies. Hallucination > no narrative.

  // v7.0 canonical 6-field schema for Tier A LLM responses.
  // Legacy aliases (dominantRiskFactor → primaryRiskDriver, timeHorizon → estimatedTimeline)
  // are preserved for backward compat with downstream UI consumers that still read them.
  type TierAFields = {
    // ── v7.0 canonical field names ────────────────────────────────────────
    primaryRiskDriver:            string | null;
    sixMonthInactionConsequence:  string | null;
    oneActionThisWeek:            string | null;
    whatChangesRiskMost:          string | null;
    estimatedTimeline:            string | null;
    keyProtectiveFactor:          string | null;
    // ── legacy aliases (mapped at accept time) ────────────────────────────
    dominantRiskFactor:           string | null;  // = primaryRiskDriver
    timeHorizon:                  string | null;  // = estimatedTimeline
    synthesis:                    string | null;
    urgencyLevel:                 string | null;
    // ── v8.0 scenario engine additions ───────────────────────────────────
    scenarioArchetype?:           string;
    scenarioArchetypeLabel?:      string;
    indiaSpecificInsight?:        string;
    confidenceNote?:              string;
  };

  // ── v7.0 Tier A min-words validator ─────────────────────────────────────
  //
  // The min_words system was introduced in v4.0 to replace unreliable percentage
  // token allocation instructions. This gate enforces it on the RESPONSE side:
  // if Claude returns any field below its minimum word count, the entire response
  // is rejected and Tier B fires immediately. The user never sees an under-specified
  // Tier A response — they see the deterministic Tier B instead.
  //
  // Validation rules per v7.0 spec:
  //   primaryRiskDriver:           80w (Stage3 or score ≥ 75), 40w otherwise
  //   sixMonthInactionConsequence: 120w (Stage3), 60w otherwise
  //   oneActionThisWeek:           100w always (must reference market data number)
  //   whatChangesRiskMost:         80w always (must include ≥ 3 ranked options)
  //   estimatedTimeline:           50w always (must cite base + collapse compression)
  //   keyProtectiveFactor:         40w always
  //
  // "Market data number" and "3 ranked options" are CONTENT checks, not word checks.
  // They are checked by pattern match (number/% present in field, or ordered list marker).
  // On failure the log shows the exact field, actual count, and required minimum.
  function validateTierAMinWords(
    data: Partial<TierAFields>,
    minWords: Record<string, number>,
    score: number,
    isStage3Local: boolean,
  ): { valid: boolean; failures: string[] } {
    const failures: string[] = [];
    const wc = (s: string | null | undefined) => (s ?? '').trim().split(/\s+/).filter(Boolean).length;

    // Per-field floor minimums. These are quality gates independent of user state.
    // isStage3Local = true when score > 80 OR collapseStage >= 3 (matches isStage3 definition).
    // The effective minimum for each field is max(specMins[field], minWords[field]),
    // so the context-specific buildQuestionMinWords can only RAISE the floor, never lower it.
    const specMins: Record<string, number> = {
      primaryRiskDriver:           isStage3Local || score > 80 ? 80  : 40,
      sixMonthInactionConsequence: isStage3Local               ? 120 : 60,
      oneActionThisWeek:           100,  // always
      whatChangesRiskMost:         80,   // always
      estimatedTimeline:           50,   // always
      keyProtectiveFactor:         40,   // always
    };

    // Use the higher of spec minimum and context-specific minimum
    const effective = (field: string) => Math.max(specMins[field] ?? 0, minWords[field] ?? 0);

    for (const [field, min] of Object.entries(specMins)) {
      const text = (data as any)[field] as string | null | undefined;
      const count = wc(text);
      const req = effective(field);
      if (count < req) {
        failures.push(`${field}: got ${count} words, required ≥ ${req}`);
      }
    }

    // Content checks (pattern-based, not word-count)
    const action = data.oneActionThisWeek ?? '';
    const hasMarketNumber = /\d[\d,]*/.test(action);  // any number in action field
    if (!hasMarketNumber && wc(action) >= 20) {
      // Only flag if the field has substantive content (≥20w) but still lacks a number —
      // an empty or near-empty field is already caught by the word-count check above.
      failures.push(`oneActionThisWeek: no specific number found (market data reference required)`);
    }

    const whatChanges = data.whatChangesRiskMost ?? '';
    const hasRankedOptions = /\b(1[\.\):]|first|2[\.\):]|second|3[\.\):]|third|#1|#2|#3)\b/i.test(whatChanges)
      || (whatChanges.match(/\b(option|choice|path|action)\b/gi) ?? []).length >= 2;
    if (!hasRankedOptions && wc(whatChanges) >= 30) {
      failures.push(`whatChangesRiskMost: no ranked/ordered structure found (≥ 3 ranked options required)`);
    }

    return { valid: failures.length === 0, failures };
  }

  let claudeAnalysis: TierAFields & { success: boolean; model?: string; llmTier?: LLMTier } = {
    success: false,
    primaryRiskDriver: null,
    sixMonthInactionConsequence: null,
    oneActionThisWeek: null,
    whatChangesRiskMost: null,
    estimatedTimeline: null,
    keyProtectiveFactor: null,
    dominantRiskFactor: null,
    timeHorizon: null,
    synthesis: null,
    urgencyLevel: null,
    llmTier,
  };

  if (llmTier === 'C') {
    // Unknown company: scope-frame honestly, skip LLM entirely
    claudeAnalysis = { ...buildTierCNarrative(companyData, roleTitle, engineResult.score), llmTier: 'C' };
    console.log('[Ensemble] Tier C — unknown company, deterministic scope framing used');

  } else if (llmTier === 'B') {
    // Known sector company: template narrative, no API cost
    claudeAnalysis = {
      ...buildTierBNarrative(
        companyData, roleTitle, engineResult.score, engineResult.breakdown,
        (companyData as any).collapseStage ?? null,
        engineResult.recommendations,
      ),
      llmTier: 'B',
    };
    console.log('[Ensemble] Tier B — deterministic template narrative');

  } else {
    // Tier A: call Claude with real signals + priority sequencing
    // Priority 10: Detect user context to sequence questions by urgency.
    // A returning user whose score jumped needs "what changed" first.
    // A Stage 3 user needs "inaction consequence + 6-week protocol" first.
    // A first-time user needs "primary risk driver" first.
    type QuestionKey = 'primaryRiskDriver' | 'keyProtectiveFactor' | 'estimatedTimeline' |
      'oneActionThisWeek' | 'whatChangesRiskMost' | 'sixMonthInactionConsequence';

    const scoreHistory = loadScoreHistory();
    const isReturningUser = scoreHistory.length >= 2;
    const priorScore = isReturningUser ? (scoreHistory[1]?.score ?? engineResult.score) : engineResult.score;
    const scoreJump = engineResult.score - priorScore;

    // v7.0 Fix 4: Structured return type for richer prompt framing.
    // returnType drives which concepts Claude must NOT re-explain (avoiding
    // repetitive orientation for users who have run multiple audits).
    const returnType = getUserReturnType(
      inputs.roleTitle ?? '',
      engineResult.score,
      String(tenureYears),
      String(inputs.companyData?.region ?? 'US'),
    );
    const velocity = computeScoreVelocity(
      inputs.roleTitle ?? '',
      engineResult.score,
      String(tenureYears),
      String(inputs.companyData?.region ?? 'US'),
    );

    // ── User state classification for question priority ─────────────────────
    // Four mutually exclusive states drive both question_order and question_min_words.
    // The state is resolved once and passed into both functions — never use a
    // fixed order that ignores context.
    //
    // State 1 CRISIS: Stage 3 (collapseStage >= 3) OR score > 80
    //   The user is at or near active emergency. Consequence + action lead.
    //   Score > 80 alone triggers this; collapseStage >= 3 triggers regardless of score.
    //
    // State 2 DELTA: Returning user, |scoreJump| > 5
    //   The score moved materially since last audit. The first question must
    //   explain what changed — not re-orient the user to displacement risk
    //   they already understand. oneActionThisWeek is 3rd, not 4th.
    //
    // State 3 STABLE_RETURNING: Returning user, score stable
    //   User knows their situation. Lead with the single executable action.
    //   Market data reference is REQUIRED (not optional) — returning users
    //   need concrete new evidence to act, not re-framing.
    //
    // State 4 FIRST_TIME: Not returning
    //   Orient before prescribing. primaryRiskDriver leads.

    type UserPriorityState = 'crisis' | 'delta' | 'stable_returning' | 'first_time';

    // isStage3: crisis threshold.
    // collapseStage >= 3 = leading indicators have converged (hiring freeze + peer cuts + exec departures).
    // score > 80 = critical band score regardless of collapse stage.
    const isStage3 = llmTier === 'A' && (
      engineResult.score > 80 ||
      ((companyData as any).collapseStage ?? 0) >= 3
    );

    const userPriorityState: UserPriorityState =
      isStage3                             ? 'crisis'
      : (isReturningUser && Math.abs(scoreJump) > 5) ? 'delta'
      : isReturningUser                    ? 'stable_returning'
      :                                      'first_time';

    function getQuestionPriority(state: UserPriorityState): QuestionKey[] {
      switch (state) {
        case 'crisis':
          // Consequence first — the user needs to feel the stakes before the action.
          // oneActionThisWeek 2nd: immediate action is the only output that matters tonight.
          return ['sixMonthInactionConsequence', 'oneActionThisWeek', 'primaryRiskDriver',
                  'whatChangesRiskMost', 'estimatedTimeline', 'keyProtectiveFactor'];

        case 'delta':
          // What changed leads — returning user, score moved materially.
          // oneActionThisWeek is 3rd (not 4th): they already understand the risk context,
          // they need the updated action fast. estimatedTimeline moves to 4th.
          return ['whatChangesRiskMost', 'primaryRiskDriver', 'oneActionThisWeek',
                  'estimatedTimeline', 'sixMonthInactionConsequence', 'keyProtectiveFactor'];

        case 'stable_returning':
          // Action leads — returning user, score stable. They know the risk.
          // Every word must earn its place: no re-orientation, only execution.
          return ['oneActionThisWeek', 'primaryRiskDriver', 'keyProtectiveFactor',
                  'estimatedTimeline', 'whatChangesRiskMost', 'sixMonthInactionConsequence'];

        case 'first_time':
          // Orient before prescribing: risk driver + inaction consequence explain WHY,
          // then action and timeline explain WHAT.
          return ['primaryRiskDriver', 'sixMonthInactionConsequence', 'estimatedTimeline',
                  'oneActionThisWeek', 'whatChangesRiskMost', 'keyProtectiveFactor'];
      }
    }

    const questionPriority = getQuestionPriority(userPriorityState);

    // ── Minimum word counts per field ───────────────────────────────────────
    // LLMs do not reliably follow percentage-of-response instructions.
    // Minimum word counts are enforced field-by-field in the JSON schema.
    // The question ORDER already determines which question gets most elaboration
    // (first question receives the most natural elaboration before context fills).
    function buildQuestionMinWords(state: UserPriorityState, score: number): Record<QuestionKey, number> {
      const highScore = score > 80;
      switch (state) {
        case 'crisis':
          // Consequence and action get maximum budget. Protective factor minimum.
          return {
            sixMonthInactionConsequence: 120,
            oneActionThisWeek:           120,
            primaryRiskDriver:            60,
            whatChangesRiskMost:          80,
            estimatedTimeline:            50,
            keyProtectiveFactor:          40,
          };

        case 'delta':
          // whatChangesRiskMost gets maximum budget — must explain the specific
          // signal shift AND provide a counterfactual (what would reverse it).
          return {
            whatChangesRiskMost:         100,
            primaryRiskDriver:            70,
            oneActionThisWeek:           100,
            sixMonthInactionConsequence:  60,
            estimatedTimeline:            50,
            keyProtectiveFactor:          40,
          };

        case 'first_time':
          // Orient the user: risk driver + consequence carry the most weight.
          return {
            primaryRiskDriver:           highScore ? 80 : 60,
            sixMonthInactionConsequence: highScore ? 80 : 60,
            oneActionThisWeek:           100,
            whatChangesRiskMost:          70,
            estimatedTimeline:            60,
            keyProtectiveFactor:          50,
          };

        case 'stable_returning':
          // oneActionThisWeek owns this response. Market data reference is REQUIRED
          // (not optional) — the prompt instruction enforces this separately.
          return {
            oneActionThisWeek:           120,
            primaryRiskDriver:            60,
            keyProtectiveFactor:          60,
            whatChangesRiskMost:          60,
            estimatedTimeline:            40,
            sixMonthInactionConsequence:  40,
          };
      }
    }
    const questionMinWords = buildQuestionMinWords(userPriorityState, engineResult.score);
    const isStage3LegacyAlias = isStage3;  // alias used in prompt strings below
    // Retained for backward compat; min_words takes precedence over weights.
    const questionWeights: Record<QuestionKey, number> = { primaryRiskDriver: 17, keyProtectiveFactor: 12, estimatedTimeline: 12, oneActionThisWeek: 20, whatChangesRiskMost: 17, sixMonthInactionConsequence: 22 };

    // ── v4.0: Full signal set — all required fields per LLM prompt spec ───────
    const v4SignalContext = {
      // Company data — all actual values, not summaries
      stock_90d_change: companyData.stock90DayChange ?? null,
      revenue_growth_yoy: companyData.revenueGrowthYoY ?? null,
      layoff_rounds_24m: companyData.layoffRounds ?? 0,
      last_layoff_months_ago: companyData.layoffsLast24Months?.[0]
        ? Math.round((Date.now() - new Date(companyData.layoffsLast24Months[0].date).getTime()) / (30 * 24 * 60 * 60 * 1000))
        : null,
      last_layoff_percent: companyData.lastLayoffPercent ?? null,
      ai_investment_signal: companyData.aiInvestmentSignal ?? 'medium',
      collapse_stage: (companyData as any).collapseStage ?? null,
      peer_contagion_count: 0, // populated by sectorContagionAgent
      employee_count: companyData.employeeCount ?? 1000,
      revenue_per_employee: companyData.revenuePerEmployee ?? 150000,
      is_public: companyData.isPublic,
      region: companyData.region ?? 'GLOBAL',
      // User context
      experience_years: (inputs as any).careerYears ?? tenureYears,
      tenure_years: tenureYears,
      performance_tier: performanceTier,
      uniqueness_depth: uniquenessDepth ?? (isUniqueRole ? 'critical_knowledge' : 'generic'),
      has_recent_promotion: hasRecentPromotion,
      has_key_relationships: hasKeyRelationships,
      // Financial + capital (if available from localStorage via context)
      financial_risk_appetite: null, // populated by FinancialContext if user has set it
      career_capital_total: null,    // populated by CareerCapital if user has assessed
      city: null,                    // populated if user provided city
      // Session context
      is_returning_user: isReturningUser,
      previous_score: isReturningUser ? priorScore : null,
      score_delta: isReturningUser ? scoreJump : null,
      days_since_last_audit: isReturningUser
        ? Math.round((Date.now() - (loadScoreHistory()[1]?.timestamp ?? Date.now())) / 86400000)
        : null,
      // Data quality — tells Claude how much to hedge based on data freshness/source.
      // The LLM should calibrate its confidence to match data_freshness_days.
      // data_source_type distinguishes live API data (hedge less) from static DB
      // data patched by an API that confirmed the same values (hedge more).
      data_source: 'live' as const,
      data_freshness_days: Math.round(
        (Date.now() - new Date(companyData.lastUpdated ?? new Date().toISOString()).getTime()) / 86_400_000
      ),
      data_source_type: (() => {
        const src = (companyData.source ?? '').toLowerCase();
        if (src.includes('alphavantage') || src.includes('osint')) {
          const informative = (companyData as any)._informativeLiveSignals;
          return informative > 0 ? 'live_enriched' : 'live_confirmed_static';
        }
        return src.includes('companyintelligencedb') ? 'supabase_intelligence' : 'static_db';
      })(),
    };

    // ── v7.0 Intelligence Upgrade 2: Pre-compute pattern candidates ──────────
    // Deterministic matching runs on the client (no LLM cost).
    // Claude is only asked to CONFIRM one of these pre-qualified IDs.
    // Candidates with overlapScore < 0.35 are excluded from the prompt to
    // prevent Claude from picking a poor match just because it was listed.
    // Pattern matching is now fully deterministic (Step 2b above).
    // Claude is no longer asked to select or confirm a patternId.
    // Build prompt context for informational reference only (not a selection task).
    const _patternContextForLLM = deterministicPatternMatch
      ? `Matched historical pattern: ${deterministicPatternMatch.pattern.patternId} — "${deterministicPatternMatch.pattern.patternName}" (${Math.round(deterministicPatternMatch.overlapScore * 100)}% signal overlap). Use this context when relevant, but do NOT return a patternId field.`
      : null;

    try {
      _timer?.mark('llm_start');
      const { data: llmData, error: llmError } = await invokeEdgeFunction<any>('llm-analyze', {
        body: {
          companyName,
          roleTitle,
          industry,
          engineScore: engineResult.score,
          // v4.0: Full L1-D7 breakdown as percentages
          engineBreakdown: {
            L1: Math.round(engineResult.breakdown.L1 * 100),
            L2: Math.round(engineResult.breakdown.L2 * 100),
            L3: Math.round(engineResult.breakdown.L3 * 100),
            L4: Math.round(engineResult.breakdown.L4 * 100),
            L5: Math.round(engineResult.breakdown.L5 * 100),
            D6: Math.round(((engineResult.breakdown as any).D6 ?? 0) * 100),
            D7: Math.round(((engineResult.breakdown as any).D7 ?? 0) * 100),
          },
          // v4.0: Full signal context (not the truncated v3 version)
          signalContext: v4SignalContext,
          userFactors: {
            tenureYears,
            performanceTier,
            isUniqueRole,
            uniquenessDepth,
            hasRecentPromotion,
            hasKeyRelationships,
          },
          // Deterministic pattern context — for Claude's awareness only.
          // Claude does not select patterns; matchHistoricalPattern() already did.
          historicalPatternCandidates: _patternContextForLLM,
          // v6.0: Minimum word counts replace percentage token weights (more reliable)
          responseFormat: {
            questions: questionPriority,
            questionMinWords,
            // v6.0 system prompt: 3 sentences, no speculation, JSON output enforced
            systemPrompt: `You are analyzing a professional's AI displacement risk. Every claim you make must be traceable to the signal data provided. Do not speculate about anything not present in the input signals.`,
            // Question sequence + minimum word counts per field.
            // State-specific ordering has already been computed above — never
            // override or reinterpret it here.
            priorityInstruction: [
              `Answer the following 6 questions in exactly the order given.`,
              `Each question has a MINIMUM word count that you MUST meet — responses below minimum are rejected and the user gets a fallback, not your answer.`,
              `Return valid JSON with exactly these 6 field names: primaryRiskDriver, sixMonthInactionConsequence, oneActionThisWeek, whatChangesRiskMost, estimatedTimeline, keyProtectiveFactor.`,
              `Question order: ${questionPriority.join(', ')}.`,
              `Minimum word counts: ${Object.entries(questionMinWords).map(([k,v]) => `${k}: ${v} words`).join('; ')}.`,
              // ── Content requirements (validated by pattern-match on response) ──
              // oneActionThisWeek instruction varies by user state.
              userPriorityState === 'stable_returning'
                ? `For oneActionThisWeek (min ${questionMinWords.oneActionThisWeek}w, MARKET DATA REQUIRED): this user has already read the risk framing. They need NEW, SPECIFIC evidence to act on. You MUST cite at least one market number from the provided data (exact job opening count, exact salary range, exact hiring rate %). Generic advice that could apply to any professional is a quality failure and will cause a fallback. Include exactly one step executable today and one verifiable proof point.`
                : `For oneActionThisWeek (min ${questionMinWords.oneActionThisWeek}w): include at least one specific number (market opening count, salary delta, hiring rate %) from the career path market data provided. Include specific steps completable in 7 days and one testable proof point.`,
              `For whatChangesRiskMost (min ${questionMinWords.whatChangesRiskMost}w): provide EXACTLY 3 ranked options in order of impact. Use format "1. [option] — [why]", "2. [option] — [why]", "3. [option] — [why]". Missing the ranked structure causes a fallback.`,
              `For estimatedTimeline (min ${questionMinWords.estimatedTimeline}w): cite the base timeline AND explain any collapse-stage compression if a collapse stage is present in the signal data.`,
              // State-aware context — prevents Claude from re-explaining concepts
              // returning users already understand (orientation fatigue).
              (() => {
                const stage3Suffix = isStage3LegacyAlias ? ' (STAGE 3 — treat as active emergency, lead with six-month consequence)' : '';
                const velocityNote = velocity?.direction === 'accelerating'
                  ? ` Score velocity: +${velocity.delta30d} pts in 30 days — rate of change is the story, not just the absolute score.`
                  : velocity?.direction === 'improving'
                    ? ` Score velocity: ${velocity.delta30d} pts in 30 days — acknowledge the improvement but maintain urgency.`
                    : '';
                switch (returnType) {
                  case 'crisis':
                    return `User context: CRISIS — returning user, score up ${scoreJump > 0 ? '+' : ''}${scoreJump} pts and velocity is accelerating (+${velocity?.delta30d ?? scoreJump} in 30d).${velocityNote} Skip all orientation. Lead immediately with the specific date-bounded consequence and the single most important action this week.${stage3Suffix}`;
                  case 'declining':
                    return `User context: returning user — score worsened ${scoreJump > 0 ? '+' : ''}${scoreJump} pts since last audit.${velocityNote} Do NOT re-explain what displacement risk means — they already know. Focus entirely on what changed and what they need to do differently NOW.${stage3Suffix}`;
                  case 'improving':
                    return `User context: returning user — score improved ${Math.abs(scoreJump)} pts since last audit.${velocityNote} Acknowledge the progress briefly (1 sentence). Then pivot to the next leverage point — what must they do to sustain the improvement and break into the next-lower risk tier.${stage3Suffix}`;
                  case 'stable_returner':
                    return `User context: returning user — score stable (changed ${scoreJump > 0 ? '+' : ''}${scoreJump} pts).${velocityNote} Skip orientation entirely. This user has seen this risk framing before. Focus exclusively on execution: what specific action with a specific market number justifies doing it THIS week rather than next?${stage3Suffix}`;
                  default:
                    return `User context: first-time user${stage3Suffix}.`;
                }
              })(),
              `Do not use corporate language. Speak directly. Do not pad with filler to meet word counts — add substance. Every sentence must be traceable to a specific signal in the data.`,
            ].join(' '),
            outputFormat: 'structured_json',
          },
        },
      });

      _timer?.mark('llm_end');
      if (!llmError && llmData && !llmData.fallback) {
        // ── v7.0: Validate min_words before accepting Tier A response ─────────
        // Map legacy field names from the LLM response to v7.0 canonical names.
        // The Edge Function may return either the old names or the new ones;
        // normalise before validation so the validator only sees canonical names.
        const normalised = {
          primaryRiskDriver:           llmData.primaryRiskDriver           ?? llmData.dominantRiskFactor  ?? null,
          sixMonthInactionConsequence: llmData.sixMonthInactionConsequence                                ?? null,
          oneActionThisWeek:           llmData.oneActionThisWeek                                          ?? null,
          whatChangesRiskMost:         llmData.whatChangesRiskMost                                        ?? null,
          estimatedTimeline:           llmData.estimatedTimeline            ?? llmData.timeHorizon         ?? null,
          keyProtectiveFactor:         llmData.keyProtectiveFactor                                        ?? null,
          dominantRiskFactor:          llmData.primaryRiskDriver            ?? llmData.dominantRiskFactor  ?? null,
          timeHorizon:                 llmData.estimatedTimeline            ?? llmData.timeHorizon         ?? null,
          synthesis:                   llmData.synthesis                                                  ?? null,
          urgencyLevel:                llmData.urgencyLevel                                               ?? null,
        };

        // Pattern matching is deterministic (Step 2b) — the LLM result carries no patternId.
        // If the LLM returned a patternId field (from a cached or legacy prompt), discard it.
        // deterministicPatternMatch is the single authoritative source.

        const { valid, failures } = validateTierAMinWords(
          normalised, questionMinWords, engineResult.score, isStage3,
        );

        if (valid) {
          claudeAnalysis = { success: true, llmTier: 'A', ...normalised } as any;
          console.log(
            `[Ensemble] Tier A — Claude narrative accepted (all min_words passed).` +
            (deterministicPatternMatch ? ` Pattern: ${deterministicPatternMatch.pattern.patternId} (${Math.round(deterministicPatternMatch.overlapScore * 100)}%)` : ' No pattern matched (< 70% threshold).'),
          );
        } else {
          // Validation failed — fall back to Tier B and log every failure
          console.warn(
            `[Ensemble] Tier A min_words FAILED (${failures.length} violation${failures.length > 1 ? 's' : ''}) — falling back to Tier B.\n` +
            failures.map(f => `  • ${f}`).join('\n'),
          );
          claudeAnalysis = {
            ...buildTierBNarrative(
              companyData, roleTitle, engineResult.score, engineResult.breakdown,
              (companyData as any).collapseStage ?? null,
              engineResult.recommendations,
            ),
            llmTier: 'B',
            // Preserve the field names that DID pass, overlaid by Tier B for failed fields
            ...Object.fromEntries(
              Object.entries(normalised).filter(([k]) => {
                const specMin = k === 'primaryRiskDriver' ? (isStage3 || engineResult.score > 80 ? 80 : 40)
                  : k === 'sixMonthInactionConsequence' ? (isStage3 ? 120 : 60)
                  : k === 'oneActionThisWeek' ? 100
                  : k === 'whatChangesRiskMost' ? 80
                  : k === 'estimatedTimeline' ? 50
                  : k === 'keyProtectiveFactor' ? 40 : 0;
                const wc = (normalised[k as keyof typeof normalised] ?? '').trim().split(/\s+/).filter(Boolean).length;
                return wc >= specMin;  // keep fields that DID pass
              })
            ),
          };
        }
      } else {
        // Tier A API failed → fall back to Tier B template (not silence)
        console.warn('[Ensemble] Tier A Claude failed — falling back to Tier B template:', llmError?.message);
        claudeAnalysis = {
          ...buildTierBNarrative(
            companyData, roleTitle, engineResult.score, engineResult.breakdown,
            (companyData as any).collapseStage ?? null,
            engineResult.recommendations,
          ),
          llmTier: 'B',
        };
      }
    } catch (llmErr: any) {
      _timer?.mark('llm_end');
      console.warn('[Ensemble] Tier A call exception — using Tier B template:', llmErr.message);
      claudeAnalysis = {
        ...buildTierBNarrative(
          companyData, roleTitle, engineResult.score, engineResult.breakdown,
          (companyData as any).collapseStage ?? null,
          engineResult.recommendations,
        ),
        llmTier: 'B',
      };
    }
  }

  // ── Step 4: Aggregate — engine score is authoritative, Claude provides narrative ──
  // Build stub results so aggregateEnsembleResults still works (it only blends scores).
  const stubAgent = (model: string): GemmaResult => ({
    model: model as any, success: false, signals: null, rawConfidence: 0,
  });
  const gemmaResult: GemmaResult = stubAgent('gemma-3-27b');
  const deepseekResult: DeepSeekResult = stubAgent('deepseek-v3') as any;
  const llamaResult: LlamaResult = stubAgent('llama-3.3-70b') as any;
  const geminiResult: GeminiResult = {
    model: 'claude-haiku-4-5' as any,
    success: claudeAnalysis.success,
    synthesis: claudeAnalysis.success ? {
      finalScore: engineResult.score,
      confidencePercent: engineResult.confidencePercent,
      modelAgreementPercent: 100,
      outlierDetected: false,
      outlierModel: null,
      outlierReason: null,
      scoreAdjustmentFromEngine: 0,
      adjustmentReason: claudeAnalysis.synthesis ?? '',
      dominantRiskFactor: claudeAnalysis.dominantRiskFactor ?? '',
      keyProtectiveFactor: claudeAnalysis.keyProtectiveFactor ?? '',
      finalTier: engineResult.score >= 75 ? 'high'
        : engineResult.score >= 55 ? 'elevated'
        : engineResult.score >= 35 ? 'moderate'
        : engineResult.score >= 15 ? 'low' : 'very-low',
      verificationNote: claudeAnalysis.oneActionThisWeek ?? '',
    } : null,
  };

  const aggregate = aggregateEnsembleResults({
    gemmaResult,
    deepseekResult,
    llamaResult,
    geminiResult,
    engineScore: engineResult.score,
    engineConfidence: engineResult.confidencePercent,
    swarmScore:      swarmReport?.swarmRiskScore,
    swarmConfidence: swarmReport?.swarmConfidence, // Gate: skip blend when < 20%
  });

  const modelsUsed = ['engine', ...(claudeAnalysis.success ? ['claude-haiku-4-5'] : [])];

  const agentStatus: AgentStatusMap = {
    gemma: 'failed', deepseek: 'failed', llama: 'failed',
    gemini: claudeAnalysis.success ? 'success' : 'failed',
    failedCount: claudeAnalysis.success ? 0 : 1,
    warningMessage: claudeAnalysis.success
      ? null
      : '⚠️ AI narrative unavailable — score is deterministic engine only.',
  };

  // ── Step 7: Compose final output ─────────────────────────────────────────
  const nextUpdate = new Date();
  nextUpdate.setDate(nextUpdate.getDate() + 7);

  const output: EnsembleResult = {
    // Core score fields (using ensemble score as the primary score)
    score: aggregate.finalScore,
    tier: getScoreTier(aggregate.finalScore),
    breakdown: engineResult.breakdown, // keep 5-bar display
    confidence: confidenceFromPercent(aggregate.finalConfidence),
    calculatedAt: new Date().toISOString(),
    nextUpdateDue: nextUpdate.toISOString(),
    disclaimer:
      "Risk estimation based on 4-model AI ensemble analysis of public signals. Not a prediction or guarantee of future employment outcomes.",
    recommendations: engineResult.recommendations,
    // Confidence interval, data freshness, signal quality, probability
    // forecast, and timing inherited from engine — these are deterministic
    // computations that should not be re-derived in the ensemble path.
    confidenceInterval: engineResult.confidenceInterval,
    dataFreshness: engineResult.dataFreshness,
    signalQuality: engineResult.signalQuality,
    probabilityForecast: engineResult.probabilityForecast,
    timing: engineResult.timing,

    // Ensemble-specific additions
    ensembleScore: aggregate.finalScore,
    engineScore: engineResult.score,
    confidencePercent: aggregate.finalConfidence,
    modelAgreement: aggregate.agreementPercent,
    hasOutlier: aggregate.hasOutlier,
    outlierModels: aggregate.outlierModels,
    individualScores: aggregate.individualScores,
    accuracyLabel: aggregate.accuracyLabel,
    dominantRisk: geminiResult.synthesis?.dominantRiskFactor || null,
    keyProtection: geminiResult.synthesis?.keyProtectiveFactor || null,
    timeHorizon: deepseekResult.signals?.timeHorizon || null,
    patternMatch: deepseekResult.signals?.patternMatch || null,
    geminiSynthesis: geminiResult.synthesis,
    modelsUsed,
    fromCache: false,
    // ── [AGENT STATUS] Transparent failure map ─────────────────────────────
    agentStatus,
    // ── [SWARM] Swarm Intelligence output ──────────────────────────────────
    swarmReport,
    swarmScore: swarmReport?.swarmRiskScore,
    primaryRiskDriver: claudeAnalysis.primaryRiskDriver ?? null,
    sixMonthInactionConsequence: claudeAnalysis.sixMonthInactionConsequence ?? null,
    oneActionThisWeek: claudeAnalysis.oneActionThisWeek ?? null,
    whatChangesRiskMost: claudeAnalysis.whatChangesRiskMost ?? null,
    estimatedTimeline: claudeAnalysis.estimatedTimeline ?? null,
    keyProtectiveFactor: claudeAnalysis.keyProtectiveFactor ?? null,
    scenarioArchetype: claudeAnalysis.scenarioArchetype,
    scenarioArchetypeLabel: claudeAnalysis.scenarioArchetypeLabel,
    indiaSpecificInsight: claudeAnalysis.indiaSpecificInsight,
    confidenceNote: claudeAnalysis.confidenceNote,
    // ScoreResult fields required by EnsembleResult (inherited from engine)
    performanceTier:              engineResult.performanceTier,
    reportedPerformanceTier:      engineResult.reportedPerformanceTier,
    performanceCredibilityScore:  engineResult.performanceCredibilityScore,
    // Deterministic historical pattern — set by matchHistoricalPattern(), not LLM.
    // null when no pattern in HISTORICAL_PATTERNS reaches the 70% overlap threshold.
    resolvedPattern:          deterministicPatternMatch?.pattern    ?? null,
    patternMatchOverlapScore: deterministicPatternMatch?.overlapScore ?? null,
  };

  // ── Step 8: Cache for future requests ────────────────────────────────────
  // Embed write timestamp so cross-device cache hits can still display "Cached X min ago"
  await setCachedAnalysis(cacheKey, { ...output, _cachedAt: Date.now() });

  return output;
};
