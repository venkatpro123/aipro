// hybridResult.ts
// Shared type contract for Audit Terminal v2.0 tabbed dashboard.
// All tabs receive a `HybridResult` prop; this is the single source of truth.

import type { ScoreResult } from "../services/layoffScoreEngine";
import type { HistoricalPattern } from "../data/historicalPatterns";
import type { JobMarketLiquidityResult } from "../services/jobMarketLiquidityService";
import type { EscapePathReport } from "../services/escapePathOptimizer";
import type { TemporalRiskResult } from "../services/temporalRiskAmplifier";
import type { PrecisionBrief } from "../services/scenarioNarrativeEngine";
import type { IndiaRiskEnrichment } from "../services/indiaSectorIntelligence";
import type { FinancialRunwayResult } from "../services/financialRunwayIntelligence";
import type { DepartmentRiskResult } from "../services/departmentRiskEngine";
import type { ScoreSensitivityResult } from "../services/scoreSensitivityEngine";
// v11.0 intelligence layers
import type { ContradictionReport } from "../services/signalContradictionEngine";
import type { ExecutiveMovementSignal } from "../services/executiveMovementEngine";
import type { HiringSignalResult } from "../services/hiringSignalAnalyzer";
import type { CompetitiveIntelligenceResult } from "../services/competitiveIntelligenceEngine";
import type { ExitTimingResult } from "../services/exitTimingOptimizer";
import type { CareerResilienceResult } from "../services/careerResilienceEngine";
import type { SurvivalProbabilityResult } from "../services/layoffSurvivalPredictor";
// v12.0 intelligence layers
import type { ManagerRiskResult } from "../services/managerRiskEngine";
import type { ScoreTrajectoryResult } from "../services/scoreTrajectoryEngine";
import type { VisaRiskResult } from "../services/visaRiskEngine";
import type { InternalMobilityResult } from "../services/internalMobilityEngine";
import type { RoleAdjacencyResult } from "../services/roleAdjacencyEngine";
import type { NegotiationIntelligenceResult } from "../services/negotiationIntelligenceService";

// ============================================================================
// Sub-Interfaces
// ============================================================================

/**
 * Score breakdown normalized 0–1 per layer.
 * L1–L5 correspond to the 5-layer risk engine.
 */
export interface ScoreBreakdown {
  L1: number; // Financial Vulnerability
  L2: number; // Layoff & Instability History
  L3: number; // Role Displacement Risk
  L4: number; // Industry Headwinds
  L5: number; // Regional Headwinds
}

/**
 * Human-readable verdict tier with styling hints.
 */
export interface ScoreTier {
  label: string; // e.g. "Elevated risk"
  color: string; // CSS color name or hex
  advice: string; // one-line actionable guidance
}

/**
 * Confidence interval representing uncertainty range.
 */
export interface ConfidenceInterval {
  low: number; // lower bound (0–100)
  high: number; // upper bound (0–100)
  range: number; // high - low
  isEstimate: boolean; // true if derived from sampled/partial data
}

/**
 * Data freshness & staleness metrics.
 */
export interface DataFreshness {
  lastUpdated: string; // ISO timestamp of newest signal
  ageInDays: number; // age of oldest signal used
  stalenessWarning: string | null; // user-facing warning if stale
  accuracyImpact: "Low" | "Medium" | "High" | "Critical"; // how staleness degrades confidence
}

/**
 * Signal quality, conflicts, and ingest metrics.
 */
export interface SignalQuality {
  hasConflicts: boolean;
  conflictingSignals: Array<{
    signalType: string;
    descriptions: string[];
    severity: "low" | "medium" | "high" | "critical";
    conflictingSources: Array<{
      source: string;
      value: number;
      timestamp: string;
    }>;
    recommendedResolution?: string;
  }>;
  liveSignals: number;    // count of real-time API signals
  heuristicSignals: number; // count of rule-based/inferred signals
  /**
   * Human-readable list of data gaps and fallback substitutions.
   * Includes warnings when L1 weight is redistributed (stock+rev both null),
   * layoffs.fyi is unreachable, or stock90d is approximated from 52w range.
   */
  missingDataFallbacks?: string[];
  degradedSignalClasses?: string[];
  hardFailures?: string[];
  confidenceCapsApplied?: string[];
}

export type SignalSourceKind = "live" | "db" | "heuristic" | "user_input";
export type SignalFreshnessState = "fresh" | "degraded" | "invalid";

export interface ProvenancedSignal<T = unknown> {
  key: string;
  value: T | null;
  source: SignalSourceKind;
  sourceName: string;
  observedAt: string;
  fetchedAt: string;
  freshnessDays: number;
  freshnessState: SignalFreshnessState;
  confidence: number;
  supersedes?: string[];
  conflictWith?: string[];
}

export interface ReconciliationSummary {
  liveWonKeys: string[];
  dbWonKeys: string[];
  conflictedKeys: string[];
  degradedKeys: string[];
  ignoredLiveKeys?: string[];
  confidenceCapsApplied?: string[];
  hardFailures?: string[];
}

export interface AuditEvaluationSnapshot {
  companyInput: string;
  companyResolved: string;
  companyMatchConfidence: number;
  companyMatchType: string;
  roleInput: string;
  resolvedRoleKey: string;
  resolvedRoleSource: string;
  usedAuditPipeline: boolean;
  liveSignals: number;
  heuristicSignals: number;
  degradedSignalClasses: string[];
  hardFailures: string[];
  confidencePercent: number;
  tabsUsedFallback: string[];
}

/**
 * Consensus snapshot — provenance of final signal values.
 */
export interface ConsensusSnapshot {
  primarySource: "live" | "db" | "hybrid";
  signalSources: string[]; // e.g. ["alpha_vantage", "newsapi", "company_db"]
  conflictCount: number;
  overridesApplied: string[]; // IDs of kill-switch overrides
  overallFreshness: number; // 0–1 freshness score
  authoritativeSignals?: Record<string, ProvenancedSignal<unknown>>;
  reconciliationSummary?: ReconciliationSummary;
}

/**
 * Single action item in the personalized plan.
 */
export interface ActionPlanItem {
  id: string;
  title: string;
  description: string;
  priority: "Critical" | "High" | "Medium" | "Low";
  layerFocus: string; // which L1–L5 dimension this addresses
  riskReductionPct: number; // estimated reduction if completed (0–100)
  deadline: string; // human-readable (e.g. "14 days")
  /** Set when urgency multiplier compressed the original deadline.
   *  Displayed as "(urgency-adjusted from {originalDeadline})" so users can
   *  see the collapse stage compression without it being invisible. */
  originalDeadline?: string;
  /** Weeks-to-proficiency at each of the three standard time tracks (2/8/20h per week).
   *  Populated when a skill keyword in the title matches skillLearningHours data.
   *  Stored on the item once; the ActionItem ROI block highlights the active track
   *  at render time — no recomputation when the user switches tracks. */
  learningWeeks?: { w2: number; w8: number; w20: number };
  /** Provenance evidence for this action item — which signals triggered it and their source. */
  evidence?: Array<{ signal: string; source: string; confidence: 'high' | 'medium' | 'low' }>;
}

/**
 * UI-ready dimension entry (derived from ScoreBreakdown).
 */
export interface UIDimension {
  key: "L1" | "L2" | "L3" | "L4" | "L5" | "D1" | "D2" | "D3" | "D4" | "D5" | "D6" | "D7";
  label: string;
  score: number; // 0–100 (derived from breakdown * 100)
}

// ============================================================================
// Master Result Type
// ============================================================================

/**
 * HybridResult — canonical UI contract for Audit Terminal v2.0.
 *
 * Transform pipeline:
 *   API raw result (from calculateHybridLayoffScore) → add `total`, `dimensions`, `reasoning`
 *
 * Key invariants:
 * - `total` is 0–100
 * - `breakdown` values are normalized 0–1; `dimensions[*].score` are 0–100
 * - `recommendations` are sorted by priority (Critical → Low)
 * - All timestamps are ISO strings
 */
export interface HybridResult {
  // ── Core Score ────────────────────────────────────────────────────────────
  total: number; // 0–100 composite risk index
  breakdown: ScoreBreakdown; // raw L1–L5 (0–1)
  tier: ScoreTier;
  confidence: "High" | "Medium" | "Low";
  confidencePercent: number; // 0–100
  confidenceInterval: ConfidenceInterval;

  // ── Derived for UI (computed client-side from breakdown) ─────────────────
  dimensions: UIDimension[]; // ordered L1→L5 with labels & 0–100 scores
  reasoning: string; // concatenated recommendation descriptions

  // ── Extended / legacy fields (may be used by existing UI) ─────────────────
  /** Temporal projection data for risk trend chart */
  riskTrend?: Array<{ year: number; score?: number; riskScore?: number }>;

  // ── Transparency ─────────────────────────────────────────────────────────
  dataFreshness: DataFreshness;
  signalQuality: SignalQuality;
  consensusSnapshot?: ConsensusSnapshot;
  authoritativeSignals?: Record<string, ProvenancedSignal<unknown>>;
  reconciliationSummary?: ReconciliationSummary;

  // ── Recommendations ──────────────────────────────────────────────────────
  recommendations: ActionPlanItem[];

  // ── Context ───────────────────────────────────────────────────────────────
  workTypeKey: string; // role key
  industryKey: string;
  countryKey: string;
  experience: string; // e.g. "5-10"
  tenureYears?: number;
  companyName?: string;

  // ── Ensemble / agent transparency ────────────────────────────────────────
  agentStatus?: {
    gemma?:    'success' | 'failed' | 'rate_limited';
    deepseek?: 'success' | 'failed' | 'rate_limited';
    llama?:    'success' | 'failed' | 'rate_limited';
    gemini?:   'success' | 'failed' | 'rate_limited';
    failedCount: number;
    warningMessage: string | null;
  };

  // ── Metadata (optional) ──────────────────────────────────────────────────
  meta?: {
    usedLiveSignals: boolean;
    liveSignalCount: number;
    swarmAgentCount: number;
    dbSource: string;
    calculationMode: string;
    timestamp: string;
    resolvedRoleKey?: string;
    resolvedRoleSource?: "oracle_picker" | "alias_map" | "manual_unresolved";
    companyMatchConfidence?: number;
    companyMatchType?: "exact" | "prefix" | "contains" | "word_overlap" | "none";
    usedAuditPipeline?: boolean;
    // Extensible: add `sourceVersion`, `cacheHit`, etc.
  };

  evaluationSnapshot?: AuditEvaluationSnapshot;

  // Legacy compatibility: preserve original engine ScoreResult for fallback rendering
  _engineResult?: ScoreResult;

  // ── Calendar-aware timing (v7.0 Fix 5) ──────────────────────────────────────
  /**
   * Re-cut window timing from the engine. Used by OverviewTab to show a specific
   * calendar date ("next window opens ~October 2026") rather than a generic range.
   * Null when the company has no layoff history to compute a window from.
   */
  timing?: ScoreResult['timing'];

  /**
   * Layoff probability forecast from the engine. Surfaced on the OverviewTab
   * score card so users see the modelled probability (not just the aggregate score).
   */
  probabilityForecast?: ScoreResult['probabilityForecast'];

  // ── Historical Pattern (Intelligence Upgrade 2 — v7.0) ───────────────────────
  /**
   * Verified historical precedent that matches this user's signal profile.
   * null when no pattern meets the 70% overlap threshold.
   * Never LLM-generated — always looked up from HISTORICAL_PATTERNS database.
   * Rendered as a structured card in TransparencyTab (not as prose).
   */
  resolvedPattern?: HistoricalPattern | null;

  // ── Narrative intelligence ────────────────────────────────────────────────
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

  // ── Company Collapse Stage (Priority 5) ──────────────────────────────────
  // Populated asynchronously after detectCollapseStage() resolves in LayoffCalculator.
  // null = no signals detected; 1 = early warning; 2 = active risk; 3 = imminent.
  collapseStage?: 1 | 2 | 3 | null;

  // ── Department Freeze Score (v6.0 Fix 7) ─────────────────────────────────
  // The freeze score for the user's specific department (0–100).
  // Populated asynchronously from the collapse predictor's department risk breakdown.
  // 0–29 = Active Hiring; 30–54 = Slowdown; 55–79 = Freeze; 80+ = Critical Freeze.
  // When ≥ 65 AND collapseStage ≥ 2, triggers a department-specific Phase 0 action.
  departmentFreezeScore?: number | null;

  // ── Performance credibility ─────────────────────────────────────────────────
  /** Effective performance tier used for scoring after credibility analysis.
   *  May differ from the user's self-report when objective signals contradict it. */
  performanceTier?: 'top' | 'average' | 'below' | 'unknown';
  /** 0–1 credibility score for the self-reported 'top' tier. Absent for other tiers. */
  performanceCredibilityScore?: number;

  // ── India Sector Intelligence (v8.0) ───────────────────────────────────────
  /**
   * GCC archetype, NASSCOM sector benchmarks, seasonal risk window, and sector
   * contagion matrix for India-region companies. Only present when region = 'IN'.
   * Rendered in TransparencyTab's India Intelligence panel.
   */
  indiaRiskEnrichment?: IndiaRiskEnrichment;

  // ── Cache provenance ────────────────────────────────────────────────────────
  /**
   * true when this result was served from the localStorage or Supabase analysis cache
   * rather than a fresh computation. Used by the CachedResultBanner component.
   */
  fromCache?: boolean;
  /**
   * Unix ms timestamp when the cache entry was written.
   * Present only when fromCache = true. Used to display "Cached X minutes ago."
   */
  cachedAt?: number;

  // ── Intelligence Upgrade v9.0 ────────────────────────────────────────────────

  /**
   * Job Market Liquidity — re-employment velocity score (0–100).
   * Answers: "If laid off today, how long until I land a comparable role?"
   * Populated by jobMarketLiquidityService after the main score is computed.
   */
  jobMarketLiquidity?: JobMarketLiquidityResult;

  /**
   * Escape Path Optimizer — top-3 career moves to maximally reduce risk score.
   * Answers: "What is the fastest path out of high risk?"
   * Each path includes estimated score drop, concrete steps, effort, and time-to-impact.
   */
  escapePaths?: EscapePathReport;

  /**
   * Temporal Risk Amplifier — time-dimension risk intelligence.
   * Answers: "Is my risk elevated RIGHT NOW due to calendar factors?"
   * Includes current amplifier, 12-month calendar, and next danger window.
   */
  temporalRisk?: TemporalRiskResult;

  /**
   * Precision Intelligence Brief — data-grounded 3-point analyst summary.
   * Answers: "What is my #1 driver, #1 protection, and most volatile signal?"
   * Replaces vague narrative fields with quantified, specific statements.
   */
  precisionBrief?: PrecisionBrief;

  // ── Intelligence Upgrade v10.0 ───────────────────────────────────────────────

  /**
   * Financial Runway Intelligence — personalizes all advice to user's savings buffer.
   * Answers: "Given my financial runway, what is the optimal strategy and exact sequence?"
   * Transforms generic advice into financially-constrained, personalized guidance.
   * Populated by financialRunwayIntelligence.ts after escape paths are computed.
   */
  financialRunway?: FinancialRunwayResult;

  /**
   * Department Risk Engine — D9 dimension for department-level precision.
   * Answers: "Is my specific department (Marketing, Engineering, etc.) more or less exposed?"
   * Adds a dimension the company-level score alone cannot capture.
   * Populated by departmentRiskEngine.ts using the user's department input.
   */
  departmentRisk?: DepartmentRiskResult;

  /**
   * Score Sensitivity Analysis — single-lever impact modeling.
   * Answers: "What one change would move my score the most, and how fast?"
   * More granular than escape paths — shows exact dimension leverage, not career moves.
   * Populated by scoreSensitivityEngine.ts after main score is locked.
   */
  scoreSensitivity?: ScoreSensitivityResult;

  /**
   * Financial runway months provided by the user.
   * 0 = not provided (defaults to 6 months in the runway intelligence service).
   * Stored for display and cache validation purposes.
   */
  financialRunwayMonths?: number;

  // ── Intelligence Upgrade v11.0 ───────────────────────────────────────────────

  /**
   * Signal Contradiction Engine — detects when signals conflict and surfaces
   * trust-calibrated interpretations. Prevents overconfidence in contradictory
   * signal environments (e.g., aggressive hiring + high L1 financial distress).
   */
  signalContradictions?: ContradictionReport;

  /**
   * Executive Movement Intelligence — models leadership departure risk patterns.
   * CHRO/CFO/CPO departures are among the strongest early predictors of layoffs,
   * typically surfacing 60–120 days before public announcement.
   */
  executiveMovement?: ExecutiveMovementSignal;

  /**
   * Hiring Signal Analyzer — advanced hiring velocity pattern analysis.
   * Converts job-posting trends into predictive intelligence about headcount
   * changes in the 60–120 day pre-announcement window.
   */
  hiringSignal?: HiringSignalResult;

  /**
   * Competitive Intelligence Engine — talent supply/demand analysis.
   * Answers: "How many people am I competing against for the same roles?"
   * Includes salary preservation probability and geographic arbitrage opportunities.
   */
  competitiveIntelligence?: CompetitiveIntelligenceResult;

  /**
   * Exit Timing Optimizer — optimal proactive departure calendar.
   * Answers: "If leaving proactively, WHEN is the best month to do it?"
   * Accounts for vesting, bonus cycles, market seasonality, and runway constraints.
   */
  exitTiming?: ExitTimingResult;

  /**
   * Career Resilience Engine — composite resilience score across 5 pillars.
   * Orthogonal to risk score: measures recovery capacity, not current risk.
   * Pillars: Financial Buffer, Market Demand, Skill Currency, Optionality, Network.
   */
  careerResilience?: CareerResilienceResult;

  /**
   * Layoff Survival Predictor — actuarial probability conversion.
   * Transforms the abstract 0–100 index into a calibrated layoff probability.
   * Grounded in 4,200+ documented layoff events (2020–2026).
   */
  survivalProbability?: SurvivalProbabilityResult;

  // ── Intelligence Upgrade v12.0 ───────────────────────────────────────────────

  /**
   * Manager Risk Intelligence — direct manager/skip-level stability.
   * Among the strongest individual-level (not company-level) layoff predictors.
   * Only populated when user provides managerDepartureType in userFactors.
   */
  managerRisk?: ManagerRiskResult;

  /**
   * Score Trajectory Engine — 30/60/90-day score projection.
   * Answers: "Where will my score be in 3 months if I do nothing?"
   * Wraps the previously orphaned trajectoryProjection.ts service.
   */
  scoreTrajectory?: ScoreTrajectoryResult;

  /**
   * Visa Risk Engine — work authorization dependency modeling.
   * Critical for H1B/L1/OPT holders: layoff triggers a 60-day clock.
   * Only populated when visaStatus is non-citizen/non-PR.
   */
  visaRisk?: VisaRiskResult;

  /**
   * Internal Mobility Engine — intra-company transfer viability.
   * Models the "30% of survivors stay through internal transfer" strategy.
   * viabilityScore = 0 for small companies (no internal job market).
   */
  internalMobility?: InternalMobilityResult;

  /**
   * Role Adjacency Engine — 2-hop role transition graph.
   * Goes beyond 1-hop escape paths to model bridge roles and their
   * riskReductionPerWeek tradeoff.
   */
  roleAdjacency?: RoleAdjacencyResult;

  /**
   * Negotiation Intelligence — current employer leverage analysis.
   * Answers: "What leverage do I have at my current employer?"
   * Requires competitiveIntelligence and financialRunway to be computed first.
   */
  negotiationIntelligence?: NegotiationIntelligenceResult;
}

// ============================================================================
// Utility Type Guards
// ============================================================================

export function isHybridResult(obj: any): obj is HybridResult {
  if (!obj || typeof obj !== "object") return false;
  const required = [
    "total",
    "breakdown",
    "tier",
    "confidencePercent",
    "confidenceInterval",
    "dimensions",
    "reasoning",
    "dataFreshness",
    "signalQuality",
    "recommendations",
    "workTypeKey",
    "industryKey",
    "countryKey",
    "experience",
  ] as const;
  return required.every((key) => key in obj);
}

// ============================================================================
// Default / Fallback Values
// ============================================================================

export const DEFAULT_HYBRID_RESULT: HybridResult = {
  total: 50,
  breakdown: { L1: 0.5, L2: 0.5, L3: 0.5, L4: 0.5, L5: 0.5 },
  tier: { label: "Moderate risk", color: "amber", advice: "Monitor closely." },
  confidence: "Medium",
  confidencePercent: 50,
  confidenceInterval: { low: 40, high: 60, range: 20, isEstimate: true },
  dimensions: [
    { key: "L1", label: "Financial Vulnerability", score: 50 },
    { key: "L2", label: "Layoff & Instability History", score: 50 },
    { key: "L3", label: "Role Displacement Risk", score: 50 },
    { key: "L4", label: "Industry Headwinds", score: 50 },
    { key: "L5", label: "Regional Headwinds", score: 50 },
  ],
  reasoning: "Insufficient data for detailed assessment.",
  dataFreshness: {
    lastUpdated: new Date().toISOString(),
    ageInDays: 0,
    stalenessWarning: null,
    accuracyImpact: "Low",
  },
  signalQuality: {
    hasConflicts: false,
    conflictingSignals: [],
    liveSignals: 0,
    heuristicSignals: 0,
  },
  recommendations: [],
  workTypeKey: "",
  industryKey: "",
  countryKey: "usa",
  experience: "5-10",
  companyName: "Unknown",
  riskTrend: [],
  evaluationSnapshot: undefined,
};
