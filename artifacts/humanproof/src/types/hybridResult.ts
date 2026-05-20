// hybridResult.ts
// Shared type contract for Audit Terminal v2.0 tabbed dashboard.
// All tabs receive a `HybridResult` prop; this is the single source of truth.

import type { ScoreResult } from "../services/layoffScoreEngine";
import type { ConformalBundle } from "../services/conformalCI";
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
// v13.0 intelligence layers
import type { MacroEconomicRiskResult } from "../services/macroEconomicRiskEngine";
import type { PeerContagionResult } from "../services/peerContagionEngine";
import type { EmergencyResponseResult } from "../services/emergencyResponseProtocol";
import type { CareerConfidenceResult } from "../services/careerConfidenceEngine";
import type { NetworkLeverageResult } from "../services/networkLeverageEngine";
import type { OfferEvaluationResult } from "../services/offerEvaluationEngine";
import type { StrategySynthesisResult } from "../services/strategySynthesisEngine";
import type { ModelCalibrationResult } from "../services/modelCalibrationEngine";
// v14.0 intelligence layers (Layers 29–38)
import type { CompensationRiskResult } from "../services/compensationRiskEngine";
import type { SkillPortfolioFitResult } from "../services/skillPortfolioFitEngine";
import type { MARiskResult } from "../services/mergerAcquisitionRiskEngine";
import type { FundingStageRiskResult } from "../services/fundingStageRiskEngine";
import type { LeadershipTransitionResult } from "../services/leadershipTransitionRiskEngine";
import type { EmployeeSentimentResult } from "../services/employeeSentimentEngine";
import type { GeographicOptionalityResult } from "../services/geographicOptionalityEngine";
import type { HeadcountVelocityResult } from "../services/headcountVelocityEngine";
import type { TechStackObsolescenceResult } from "../services/techStackObsolescenceEngine";
import type { CareerVelocityResult } from "../services/careerVelocityEngine";
import type { SegmentCalibrationResult } from "../services/segmentedCalibrationEngine";
import type { BayesianCredibleInterval } from "../services/empiricalCalibration";
// v16.0 intelligence layers (39–46 + enhanced data architecture)
import type { CohortClassification } from "../services/cohortClassifier";
import type { WARNSignal } from "../services/warnActService";
import type { MacroSignalResult } from "../services/blsMacroService";
import type { SECEnhancedRiskResult } from "../services/secEnhancedService";
import type { GlassdoorVelocityResult } from "../services/glassdoorVelocityEngine";
import type { ExecutiveDeparturePatternResult } from "../services/executiveDeparturePatternEngine";
import type { MarketDemandReport } from "../services/roleMarketDemandService";
import type { FinancialRunwayAssessment } from "../services/financialRunwayService";
// v17.0 intelligence layers (47–54)
import type { PredictionHorizonResult } from "../services/predictionHorizonService";
import type { SkillGapIntelligenceResult } from "../services/skillGapIntelligenceService";
import type { PersonalizedTimelineResult } from "../services/personalizedTimelineService";
import type { ScenarioPlanResult } from "../services/scenarioPlanService";
import type { IntelligenceBriefResult } from "../services/intelligenceBriefService";
import type { CareerContingencyPlan } from "../services/careerContingencyPlanEngine";
import type { PreparednessResult } from "../services/preparednessScoreEngine";
// v35.0 intelligence layers (55)
import type { PersonalRiskModifier } from "../services/personalRiskAdjusterService";
// v39.0 D2 — unified freshness verdict
import type { UnifiedFreshness } from "../services/freshnessUnifier";

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
  /** Set when 3+ critical input signals are null or at heuristic defaults — caps confidence ≤35%. */
  lowDataWarning?: { code: 'LOW_DATA'; missingCount: number; capAt: number };
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
  /** Intelligence-overlay engines whose computation threw — name + error string. */
  engineFailures?: { engine: string; error: string }[];
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
  /** GAP F: human-readable effort badge (e.g. '30 min', '2h', '2 weeks') */
  effortBadge?: string;
  /**
   * GAP F: when in the job-search sequence this action belongs.
   * 'phase0' is the emergency tier — renders before Phase 1 in the dependency
   * graph and gates Phase 1 unlock until the Phase 0 action is completed.
   * Phase 0 is triggered by departmentFreezeScore ≥ 65 OR collapseStage ≥ 3.
   */
  sequencePhase?: 'phase0' | 'day1' | 'week1' | 'month1' | 'quarter1';
  /** GAP F: one-line outcome evidence stat for trust-building (e.g. "2.8× more recruiter contacts") */
  evidenceStats?: string;
  /** GAP F: which other action IDs this depends on (shown as sequencing constraint) */
  dependsOn?: string[];
}

/**
 * UI-ready dimension entry (derived from ScoreBreakdown).
 */
export interface UIDimension {
  key: "L1" | "L2" | "L3" | "L4" | "L5" | "D1" | "D2" | "D3" | "D4" | "D5" | "D6" | "D7";
  label: string;
  score: number; // 0–100 (derived from breakdown * 100)
  /**
   * Calibration status of the formula weight for this dimension.
   * 'regression_derived' — weight derived from logistic regression on outcome data.
   * 'uncalibrated_estimate' — weight is a developer estimate; displayed as "(weight: estimated)" in UI.
   * When absent: assume regression_derived (backward compat).
   */
  weightCalibrationStatus?: 'regression_derived' | 'uncalibrated_estimate';
  /** ISO date of the calibration run that produced this weight (if regression_derived). */
  weightCalibratedAt?: string;
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
/**
 * WS6 — Tier-A two-stage response phase.
 *
 *   tier_a            Immediate response built from cached + DB-resident
 *                     signals. Conformal CI is calibrated against the
 *                     partial-coverage state, so the displayed confidence
 *                     is honest about the limited evidence.
 *   tier_a_upgraded   Live-scrape signals have landed and the result has
 *                     been recomputed. Subscribers receive this via
 *                     realtime channel; the UI animates the delta.
 *   complete          Single-pass pipeline ran to completion (the legacy
 *                     path when ws6_tier_a_response is off).
 */
export type AuditPhase = 'tier_a' | 'tier_a_upgraded' | 'complete';

export interface HybridResult {
  // ── Core Score ────────────────────────────────────────────────────────────
  total: number; // 0–100 composite risk index
  breakdown: ScoreBreakdown; // raw L1–L5 (0–1)
  tier: ScoreTier;
  confidence: "High" | "Medium" | "Low";
  confidencePercent: number; // 0–100
  confidenceInterval: ConfidenceInterval;

  // ── WS6 Tier-A two-stage response (Audit Issue #17) ─────────────────────
  /** Current response phase. `complete` for legacy single-pass audits. */
  auditPhase?: AuditPhase;
  /** Server-generated id correlating tier_a and tier_a_upgraded payloads. */
  auditRequestId?: string;
  /** Wall-clock ms taken to produce THIS payload (not including any prior phase). */
  phaseDurationMs?: number;

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
   * Set deterministically by matchHistoricalPattern() — never by LLM output.
   * Rendered as a structured card (not as prose). Never invented at runtime.
   */
  resolvedPattern?: HistoricalPattern | null;

  /**
   * Signal overlap score (0.70–1.00) for the matched pattern, or null when
   * no pattern matched. Used to render the confidence meter in PatternMatchCard.
   * Always accompanies resolvedPattern — null iff resolvedPattern is null.
   */
  patternMatchOverlapScore?: number | null;

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
  /** Original self-reported tier — present only when the effective tier was adjusted.
   *  Enables the exact disclosure: "Reported: Top performer. Effective: Moderate." */
  reportedPerformanceTier?: 'top' | 'average' | 'below' | 'unknown';
  /** 0–1 credibility score for the self-reported 'top' tier. Absent for other tiers. */
  performanceCredibilityScore?: number;

  // ── India Sector Intelligence (v8.0) ───────────────────────────────────────
  /**
   * GCC archetype, NASSCOM sector benchmarks, seasonal risk window, and sector
   * contagion matrix for India-region companies. Only present when region = 'IN'.
   * Rendered in TransparencyTab's India Intelligence panel.
   */
  indiaRiskEnrichment?: IndiaRiskEnrichment;

  // ── Score formula transparency ───────────────────────────────────────────────
  /** MED-5: fraction of total formula weight that is regression-derived (0–1, e.g. 0.58). */
  calibrationCoverage?: number;
  /** LOW-1: all kill-switch names that fired this run (e.g. ['financial_distress_triad']). */
  activatedKillSwitches?: string[];
  /**
   * v40.0: Per-signal freshness decay weights applied this run. Each value is in
   * [minWeight, 1.0]. Surfaced in TransparencyTab so users can see how data age
   * reduced each signal's effective contribution ("Stock data 6 days old → 50% weight").
   */
  signalDecayWeights?: {
    stock:         number;
    revenue:       number;
    layoffHistory: number;
    hiring:        number;
    sector:        number;
    breakingNews:  number;
    L1_effective:  number;
    D7_effective:  number;
  };

  /**
   * v40.0: Number of active constants in engine_calibration_constants that carry
   * 'uncalibrated_placeholder' provenance. Non-zero means some scoring terms are
   * developer estimates not yet validated through regression.
   * TransparencyTab surfaces this as an amber warning chip.
   */
  uncalibratedConstantCount?: number;
  /**
   * v40.0: Dotted-path keys of all uncalibrated_placeholder constants that are
   * active. Used to render tooltips and identify which outputs carry "(estimate)".
   */
  uncalibratedConstantKeys?: string[];
  /**
   * True when ALL calibration constants were served from hardcoded fallback values
   * because engine_calibration_constants was unreachable at score computation time.
   * The score is valid but used bootstrap defaults instead of DB-calibrated values.
   * TransparencyTab surfaces this as an amber disclosure banner.
   */
  calibrationDbBootstrap?: boolean;

  /**
   * Serialized record of every feature flag mode that was active when this
   * audit ran. Resolved once via freezeAuditFlags() at pipeline entry.
   * Stored for reproducibility: if you re-run the same audit and the modes
   * in this record differ from the current global flag state, the code paths
   * that ran may differ from the original run.
   */
  flagSnapshot?: Record<string, string>;

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

  // ── Intelligence Upgrade v13.0 ───────────────────────────────────────────────

  /**
   * Macro-Economic Risk Engine — system-level economic context.
   * Fills the largest gap in previous versions: no macro layer existed.
   * Answers: "What is the macro environment doing to my sector's layoff risk?"
   * Uses calibrated heuristics for May 2026 macro regime (Fed plateau, elevated
   * credit spreads, AI displacement wave active). Zero API cost.
   */
  macroEconomicRisk?: MacroEconomicRiskResult;

  /**
   * Peer Contagion Engine — sector wave propagation model.
   * Answers: "Are my company's competitors cutting? Am I in a sector wave?"
   * Reads companyPeers.ts graph + layoffNewsCache to detect active waves.
   * Contagion waves historically increase remaining peer's layoff probability by ~40%.
   */
  peerContagion?: PeerContagionResult;

  /**
   * Emergency Response Protocol — 72-hour crisis action plan.
   * Activates when score ≥ 80 OR collapseStage ≥ 2.
   * Answers: "What do I do in the NEXT 72 HOURS?"
   * Time-boxed checklist: 0–4h (information), 4–24h (materials), 24–48h (network), 48–72h (market).
   * The key differentiation vs. existing action plan: this is crisis mode, not 6-month planning.
   */
  emergencyResponse?: EmergencyResponseResult;

  /**
   * Career Confidence Engine — psychological job-search readiness.
   * Orthogonal to risk score: a high-risk user can be high-readiness or low-readiness.
   * 5 pillars: Material Readiness, Market Intelligence, Network Activation,
   * Financial Stability, Skill Confidence.
   * Answers: "How prepared am I to respond effectively if a layoff happens?"
   */
  careerConfidence?: CareerConfidenceResult;

  /**
   * Network Leverage Engine — professional network strength and activation.
   * Answers: "How strong is my referral network, and how do I activate it?"
   * Models estimated warm contacts, referral access score, and network diversity.
   * Provides specific activation plan and application channel split recommendation.
   */
  networkLeverage?: NetworkLeverageResult;

  /**
   * Offer Evaluation Engine — job offer scorecard and negotiation intelligence.
   * OPTIONAL: only populated when user provides offer details via StrategyTab modal.
   * Answers: "Should I accept this offer? What should I negotiate?"
   * 5 dimensions: Company Stability, Compensation Delta, Role Growth, Market Alignment, Risk Reduction.
   */
  offerEvaluation?: OfferEvaluationResult;

  /**
   * Strategy Synthesis Engine — master cross-layer strategic plan.
   * Reads ALL previous layers and synthesizes a unified, time-horizoned career strategy.
   * 4 phases: Emergency (72h if critical), Immediate (0–7d), Short-term (1–3m), Long-term (3–12m).
   * Answers: "Given EVERYTHING, what is THE strategy?"
   */
  strategySynthesis?: StrategySynthesisResult;

  /**
   * Model Calibration Engine — engine accuracy and trust metrics.
   * Answers: "How accurate is this engine? Should I trust this score?"
   * Reads community_prediction_accuracy view; falls back to research-grounded priors.
   * Surfaces accuracy by tier, signal contributions, and trust level to users.
   */
  modelCalibration?: ModelCalibrationResult;

  // ── Intelligence Upgrade v14.0 ───────────────────────────────────────────────

  /**
   * Compensation Risk Engine (Layer 29) — pay position vs. market + cascade stage.
   * Answers: "Am I overpaid relative to market? What stage is the pay-cut cascade at?"
   * Signals: pay freeze → contractor cuts → pay cut → layoff (3-step pre-layoff cascade).
   * Grounded in Levels.fyi, Glassdoor, NASSCOM benchmarks.
   */
  compensationRisk?: CompensationRiskResult;

  /**
   * Skill Portfolio Fit Engine (Layer 30) — resume-market compatibility analysis.
   * Answers: "Are my specific skills in demand? Which ones are declining?"
   * Transforms D1 from role-level lookup to skill-level differentiated signal.
   * Two engineers with different skill sets at the same company now score differently.
   */
  skillPortfolioFit?: SkillPortfolioFitResult;

  /**
   * M&A Risk Engine (Layer 31) — merger/acquisition integration risk.
   * Answers: "Is my company in an M&A scenario that will drive headcount cuts?"
   * 40% of major layoffs in 2023–2025 were M&A-associated — zero prior coverage.
   * PE acquisitions: 23% headcount reduction within 18 months (research-grounded).
   */
  maRisk?: MARiskResult;

  /**
   * Funding Stage Risk Engine (Layer 32) — funding lifecycle risk model.
   * Answers: "What stage of funding is my company at and what does it mean for job security?"
   * Expands fundingDryupAgent with stage-specific risk curves, down-round detection,
   * bridge financing signals, and runway estimation.
   */
  fundingStageRisk?: FundingStageRiskResult;

  /**
   * Leadership Transition Risk Engine (Layer 33) — CEO/CFO/VP departure model.
   * Answers: "Is leadership instability creating restructuring risk?"
   * CEO tenure < 18mo = 3× restructuring probability; CFO departure = #1 90-day predictor.
   * VP clustering (3+ in 60 days) = 82% probability of organizational restructuring.
   */
  leadershipTransitionRisk?: LeadershipTransitionResult;

  /**
   * Employee Sentiment Engine (Layer 34) — Glassdoor/Blind early warning signals.
   * Answers: "What are employees saying that precedes formal announcements?"
   * CEO approval decline is a 45-day leading indicator (MIT Sloan 2024).
   * Voluntary attrition rate > 25% precedes forced cuts.
   */
  employeeSentiment?: EmployeeSentimentResult;

  /**
   * Geographic Optionality Engine (Layer 35) — location-based escape path analysis.
   * Answers: "How does my location expand or contract my options?"
   * Remote-eligible roles have 3× escape path count vs. in-office (LinkedIn 2026).
   * Includes CoL-adjusted runway and industry concentration risk.
   */
  geographicOptionality?: GeographicOptionalityResult;

  /**
   * Headcount Velocity Engine (Layer 36) — contractor/FTE ratio and posting velocity.
   * Answers: "Is the company quietly shrinking before announcing layoffs?"
   * Contractors are cut first — FTEs follow in 45–90 days (Staffing Industry Analysts).
   * Job posting freeze is a 30–45 day leading indicator.
   */
  headcountVelocity?: HeadcountVelocityResult;

  /**
   * Tech Stack Obsolescence Engine (Layer 37) — tech lifecycle risk.
   * Answers: "Is my primary tech stack being sunset at my company or in the market?"
   * Cloud migration: on-prem specialists face 65% headcount reduction within 18 months.
   * COBOL, Oracle Forms, Hadoop: high-confidence obsolescence risk profiles.
   */
  techStackObsolescence?: TechStackObsolescenceResult;

  /**
   * Career Velocity Engine (Layer 38) — career trajectory momentum.
   * Answers: "Is my career accelerating, plateauing, or declining?"
   * Plateau risk is a primary factor in restructuring decisions.
   * Plateaued performers in same role 3+ years are first-cut candidates.
   */
  careerVelocity?: CareerVelocityResult;

  /**
   * Segmented Calibration Engine — per-segment score adjustment.
   * Answers: "How does this score compare for companies like mine?"
   * A FAANG SWE and an Indian BPO worker have very different layoff dynamics.
   * Segment matrix: company size × industry × region × role type.
   */
  segmentCalibration?: SegmentCalibrationResult;

  /**
   * Bayesian Credible Interval — proper uncertainty quantification.
   * Replaces the binary HIGH/MODERATE confidence with σ-derived intervals.
   * 80% CI: score ± 1.28σ; 95% CI: score ± 1.96σ.
   * σ derived from data quality tier (A=3pts, B=6pts, C=10pts, D=18pts).
   */
  bayesianCI?: BayesianCredibleInterval;
  /**
   * v40.0: Full conformal prediction bundle from the conformalCILayer DAG step.
   *
   * Populated when ws4_conformal_ci flag is active and the per-cohort (or global
   * pooled) calibration set has ≥ MIN_CALIBRATION_POINTS (80) outcomes.
   *
   * Key fields to surface in the UI:
   *   source           — 'conformal' | 'fallback_heuristic' | 'no_data'
   *   intervals[].pooledFromCohort — non-null when the requested cohort had < 80
   *                   outcomes and the CI was computed from the broader cross-cohort
   *                   pool. The UI MUST show the pooled badge so users know the CI
   *                   is less precise than a cohort-specific estimate would be.
   *   intervals[].calibrationN    — number of calibration points used
   *   intervals[].resolvedCohort  — cohort the CI was actually built from
   *   intervals[].empiricalCoverage — measured coverage on hold-out set (null until
   *                   the weekly coverage_audit cron populates it)
   */
  conformalBundle?: ConformalBundle | null;

  // Extended user context (v14.0)
  /** User's declared tech skills — drives skillPortfolioFit and techStackObsolescence */
  userSkills?: string[];
  /** Optional salary for compensation risk benchmarking */
  userSalary?: number;
  /** LinkedIn connection range — drives network and D6 intelligence */
  networkSize?: 'minimal' | 'moderate' | 'substantial' | 'extensive';
  /** Remote work eligibility — drives geographicOptionality */
  remoteEligibility?: 'FULLY_REMOTE' | 'HYBRID' | 'IN_OFFICE_ONLY' | 'UNKNOWN';
  /** Career goal — shapes recommendation priorities */
  careerGoal?: 'stay_and_grow' | 'strategic_exit' | 'emergency_exit' | 'explore';

  // ── Intelligence Upgrade v16.0 ────────────────────────────────────────────────

  /**
   * Cohort Classifier (v16.0) — three-cohort layoff model architecture.
   * Classifies the scoring scenario into DISTRESS / EFFICIENCY / WAVE before
   * applying calibration, so the correct layer weight profile is used.
   * DISTRESS AUC: 0.96 | EFFICIENCY AUC: 0.76 | WAVE AUC: 0.72 | combined: 0.84
   */
  cohortClassification?: CohortClassification;

  /**
   * WARN Act Signal (v16.0) — confirmed 60-day advance notice of layoffs.
   * Ground-truth signal: if hasActiveWARN=true this is a legally-filed
   * notification, not a prediction. Overrides L2 probabilistic scoring.
   * Coverage: CA, NY, NJ, TX, FL, IL, WA, MA, CO, VA (~55% of US tech employment).
   */
  warnSignal?: WARNSignal;

  /**
   * BLS JOLTS + FRED Macro Signal (v16.0) — sector-level leading indicators.
   * Quits rate fall (-10% YoY) precedes layoffs 60-90 days. JOLTS sector data
   * is orthogonal to company-level signals — fills the macro resolution gap
   * in the v13.0 macroEconomicRisk layer.
   */
  blsMacroSignal?: MacroSignalResult;

  /**
   * SEC Enhanced Signals (v16.0) — FCF margin, earnings surprise, analyst consensus.
   * Adds the single most important DISTRESS/EFFICIENCY discriminator:
   * positive FCF + AI investment = EFFICIENCY cut; negative FCF = DISTRESS cut.
   * Analyst consensus downgrade cycle (90-day trailing) is a 30-day leading indicator.
   */
  secEnhancedSignals?: SECEnhancedRiskResult;

  /**
   * Glassdoor Velocity (v16.0) — CEO approval rate of change + review volume spike.
   * CEO approval that fell >15 pct pts in 90 days → 67% layoff announcement probability
   * within 45 days. Fills the key gap in employeeSentiment (direction vs. velocity).
   */
  glassdoorVelocity?: GlassdoorVelocityResult;

  /**
   * Executive Departure Pattern (v16.0) — departure destination + replacement type.
   * CFO departure to "other opportunities" → 71% restructuring within 90 days.
   * Turnaround specialist hired as replacement → 84% precision for upcoming cuts.
   * Fills the gap in leadershipTransitionRisk (count vs. pattern).
   */
  executiveDeparturePattern?: ExecutiveDeparturePatternResult;

  /**
   * Role Market Demand (v16.0) — dynamic demand index for this role + metro area.
   * Replaces static roleExposureData.ts with quarterly-updated demand signals.
   * Local market multiplier: SF = 1.35×, Bangalore = 0.90×.
   * Drives jobSearchRunwayWeeks estimate in action personalization.
   */
  roleMarketDemand?: MarketDemandReport;

  /**
   * User Financial Runway (v16.0) — user-level financial situation assessment.
   * Distinct from company-level financialRunwayIntelligence.ts (which models the
   * company). This models the USER's financial buffer, equity anchor, and obligations.
   * Drives actionUrgencyMultiplier: 1.5 for critical (<3mo runway) → 0.7 for secure.
   */
  userFinancialRunway?: FinancialRunwayAssessment;

  // ── Intelligence Upgrade v17.0 ──────────────────────────────────────────────

  /**
   * Prediction Horizon (Layer 47) — 30/90/180d separate risk models.
   * Uses horizon-appropriate signal weights: L2 dominant at 30d, L3 dominant at 180d.
   * Answers: "Am I at risk NOW vs. in 6 months?"
   */
  predictionHorizon?: PredictionHorizonResult;

  /**
   * Skill Gap Intelligence (Layer 48) — self-rated skills × role market demand.
   * Only populated when selfRatedSkills or targetSkills are in UserProfile.
   * Answers: "What skills do I need most urgently for my target market?"
   */
  skillGapIntelligence?: SkillGapIntelligenceResult;

  /**
   * Personalized Timeline (Layer 49) — financial runway × risk trajectory → critical date.
   * criticalByDate = min(runway expiry, score→80 trajectory, WARN effective date).
   * Answers: "When do I need to act by, given MY specific financial situation?"
   */
  personalizedTimeline?: PersonalizedTimelineResult;

  /**
   * Scenario Plan (Layer 50) — bear/base/bull macro scenarios over 6 months.
   * Answers: "What's my worst case, most likely case, and best case?"
   */
  scenarioPlan?: ScenarioPlanResult;

  /**
   * Intelligence Brief (Layer 52) — AI-generated 3-paragraph strategic brief.
   * Calls llm-analyze edge function with full pipeline context. Cached 24h.
   * undefined while loading (async); null if generation failed.
   */
  intelligenceBrief?: IntelligenceBriefResult | null;

  // ── Intelligence Upgrade v17.0 — Layers 53–54 ─────────────────────────────

  /**
   * Career Contingency Plan (Layer 53) — 3-path decision framework.
   * STAY / NEGOTIATE / TRANSITION with feasibility scoring, immediate actions,
   * short-term actions, success indicators, and key risks.
   * Synthesises financial runway, resilience, negotiation leverage, exit timing,
   * market liquidity, cohort classification, and career goal into concrete paths.
   * Answers: "Given EVERYTHING, what are my 3 concrete career options right now?"
   */
  careerContingencyPlan?: CareerContingencyPlan;
  /** Status of the career contingency plan computation. Drives ActionsTab UI state. */
  contingencyPlanStatus?: 'loading' | 'ready' | 'failed' | 'unavailable';

  /**
   * Preparedness Score (Layer 54) — career layoff-readiness meta-score (0–100).
   * DISTINCT from the risk score: risk = likelihood of layoff at YOUR company;
   * preparedness = readiness to survive and recover IF a layoff occurs today.
   * 5 pillars: Financial Readiness (25%), Market Positioning (25%),
   * Skills Competitiveness (20%), Career Clarity (15%), Operational Readiness (15%).
   * Answers: "If laid off tomorrow, how ready am I — and what's my fastest path to a new role?"
   */
  preparednessScore?: PreparednessResult;
  /**
   * v35.0 — Layer 55: Personal Risk Modifier.
   * Signed ±10pt adjustment to the composite score based on user-specific
   * circumstance factors (visa dependency, manager departure, skill fit,
   * network strength, career velocity). Applied after all kill-switches.
   */
  personalRiskModifier?: PersonalRiskModifier;

  // ── v39.0 D2: Unified freshness verdict ──────────────────────────────────
  /**
   * Single canonical freshness verdict computed from all pipeline freshness
   * signals. UI surfaces should read this instead of computing from raw
   * companyData fields. Tier 'heuristic' means no live data was retrieved —
   * the UI must disclose this explicitly (v40.0 audit gap #2 fix).
   */
  unifiedFreshness?: UnifiedFreshness;

  // ── v40.0: DAG layer degradation count ────────────────────────────────────
  /** Number of DAG layers that fell back to defaults this audit. > 2 triggers a UI warning. */
  _dagDegradedLayerCount?: number;

  // ── v40.0: Score delta (30-day trend) ────────────────────────────────────
  /**
   * Score velocity vs 30 days ago. Computed from scoreStorageService using
   * the user's audit history. Rendered in SummaryTab as "+Xpt improving" or
   * "-Xpt worsening" badge. null when no prior audit exists for comparison.
   */
  scoreDelta?: {
    delta30d: number | null;
    direction: 'improving' | 'worsening' | 'stable';
  } | null;
}

// ============================================================================
// v40.0 Tab-Slice Types (Task 3.2)
// Each slice is a Pick<HybridResult, ...> containing only the fields the tab
// actually renders. Allows future per-tab memoization to prevent cross-tab
// re-renders when an unrelated field changes.
// ============================================================================

export type SummaryTabSlice = Pick<HybridResult,
  | 'total' | 'confidencePercent' | 'confidence' | 'tier' | 'breakdown'
  | 'dataFreshness' | 'signalQuality' | 'recommendations'
  | 'intelligenceBrief' | 'preparednessScore' | 'personalRiskModifier'
  | 'predictionHorizon' | 'unifiedFreshness' | 'warnSignal'
  | 'industryKey' | 'countryKey' | 'workTypeKey'
  | 'primaryRiskDriver' | 'sixMonthInactionConsequence'
  | 'activatedKillSwitches' | 'dimensions'
>;

export type CompanyTabSlice = Pick<HybridResult,
  | 'total' | 'warnSignal' | 'secEnhancedSignals' | 'blsMacroSignal'
  | 'hiringSignal' | 'headcountVelocity' | 'employeeSentiment'
  | 'glassdoorVelocity' | 'peerContagion' | 'macroEconomicRisk'
  | 'executiveMovement' | 'signalQuality' | 'leadershipTransitionRisk'
  | 'maRisk'
>;

export type ProtectionTabSlice = Pick<HybridResult,
  | 'total' | 'confidencePercent' | 'preparednessScore'
  | 'skillGapIntelligence' | 'skillPortfolioFit' | 'careerVelocity'
  | 'careerContingencyPlan' | 'contingencyPlanStatus'
  | 'careerConfidence' | 'visaRisk' | 'userFinancialRunway'
  | 'roleMarketDemand' | 'careerResilience' | 'networkLeverage'
  | 'personalRiskModifier'
>;

export type ActionsTabSlice = Pick<HybridResult,
  | 'total' | 'confidencePercent' | 'recommendations'
  | 'careerContingencyPlan' | 'contingencyPlanStatus'
  | 'intelligenceBrief' | 'negotiationIntelligence'
  | 'strategySynthesis' | 'emergencyResponse'
>;

export type IntelligenceTabSlice = Pick<HybridResult,
  | 'total' | 'confidencePercent' | 'breakdown' | 'dimensions'
  | 'scoreSensitivity' | 'signalContradictions' | 'modelCalibration'
  | 'bayesianCI' | 'signalQuality' | 'dataFreshness' | 'consensusSnapshot'
  | 'intelligenceBrief' | 'scenarioPlan' | 'predictionHorizon'
  | 'activatedKillSwitches' | 'calibrationCoverage' | 'unifiedFreshness'
>;

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
