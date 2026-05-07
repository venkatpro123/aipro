// scoringTypes.ts
// Runtime-neutral type vendoring for the hybrid scoring math.
//
// The frontend keeps the canonical definitions under
// `artifacts/humanproof/services/` and `artifacts/humanproof/src/services/`,
// but those files import from Vite-only paths and the shared scoring math
// can't depend on them. We mirror the shape here so edge functions get
// equivalent type-checking without dragging in the React build pipeline.
//
// Keep these in sync with:
//   - artifacts/humanproof/services/signalIntegrity/signalIntegrityService.ts
//   - artifacts/humanproof/services/consensusEngine.ts
//   - artifacts/humanproof/src/services/layoffScoreEngine.ts

// ── Signal-integrity layer (vendored) ─────────────────────────────────────

export interface SignalConflict {
  signalType: string;
  descriptions: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  conflictingSources: Array<{
    source: string;
    value: number;
    timestamp: string;
  }>;
  recommendedResolution?: string;
}

export type SignalSourceKind = 'live' | 'db' | 'heuristic' | 'user_input';
export type SignalFreshnessState = 'fresh' | 'degraded' | 'invalid';

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

export interface ResolvedSignal {
  /** Consensus value, normalized 0–1. Convention varies per signal — see
   *  ConsensusSignalSet field comments for direction (0=good or 0=bad). */
  value: number;
  /** 0–1 confidence the consensus value is correct. */
  confidence: number;
  /** 95% CI for `value`. */
  confidenceInterval: { low: number; high: number };
  sourcesUsed: string[];
  stalenessDays: number;
  hasConflict: boolean;
  conflicts: SignalConflict[];
  primarySource: 'live' | 'db' | 'hybrid';
  dominantWeight: number;
}

// ── Consensus signal set (vendored — feeds the scoring layers) ────────────

export interface ConsensusSignalSet {
  // L1 — Company Health
  revenueGrowth: ResolvedSignal;
  stockTrend: ResolvedSignal;
  fundingHealth: ResolvedSignal;
  overstaffing: ResolvedSignal;
  companySize: ResolvedSignal;

  // L2 — Layoff History
  recentLayoffRecency: ResolvedSignal; // 0 = recent, 1 = distant
  layoffFrequency: ResolvedSignal;
  layoffSeverity: ResolvedSignal;
  sectorContagion: ResolvedSignal;
  departmentNews: ResolvedSignal;

  // L3 — Role Exposure
  automationRisk: ResolvedSignal;
  aiToolMaturity: ResolvedSignal;
  humanAmplification: ResolvedSignal;

  // L4 — Market Conditions
  industryBaseline: ResolvedSignal;
  aiAdoptionRate: ResolvedSignal;
  growthOutlook: ResolvedSignal;

  // L5 — Employee Factors signal (separate from user inputs)
  averageTenure: ResolvedSignal;

  // Aggregates
  overallConfidence: number;
  conflictLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
  allConflicts: SignalConflict[];
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

// ── User factors + score result (vendored) ────────────────────────────────

export interface UserFactors {
  tenureYears: number;
  careerYears?: number;
  isUniqueRole: boolean;
  performanceTier: 'top' | 'average' | 'below' | 'unknown';
  hasRecentPromotion: boolean;
  hasKeyRelationships: boolean;
}

export interface ScoreBreakdown {
  L1: number;
  L2: number;
  L3: number;
  L4: number;
  L5: number;
  D6?: number;
  D7?: number;
}

export interface ScoreTier {
  label: string;
  color: string;
  advice: string;
}

export interface ActionPlanItem {
  id: string;
  title: string;
  description: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  layerFocus: string;
  riskReductionPct: number;
  deadline: string;
}

export interface ScoreResult {
  score: number;
  confidenceInterval: {
    low: number;
    high: number;
    range: number;
    isEstimate: boolean;
  };
  tier: ScoreTier;
  breakdown: ScoreBreakdown;
  confidence: 'High' | 'Medium' | 'Low';
  confidencePercent: number;
  calculatedAt: string;
  nextUpdateDue: string;
  disclaimer: string;
  dataFreshness: {
    lastUpdated: string;
    ageInDays: number;
    stalenessWarning: string | null;
    accuracyImpact: 'Low' | 'Medium' | 'High' | 'Critical';
  };
  signalQuality: {
    hasConflicts: boolean;
    /** Subset of consensus.allConflicts — kept structural so callers can
     *  render the same SignalConflict UI as the client engine emits. */
    conflictingSignals: SignalConflict[];
    missingDataFallbacks: string[];
    liveSignals: number;
    heuristicSignals: number;
    degradedSignalClasses?: string[];
    hardFailures?: string[];
    confidenceCapsApplied?: string[];
  };
  recommendations: ActionPlanItem[];
  consensusSnapshot: {
    primarySource: 'live' | 'db';
    signalSources: string[];
    conflictCount: number;
    overridesApplied: string[];
    overallFreshness: number;
    authoritativeSignals?: Record<string, ProvenancedSignal<unknown>>;
    reconciliationSummary?: ReconciliationSummary;
  };
}

export interface HybridScoreInputs {
  companyName: string;
  roleTitle: string;
  department: string;
  userFactors: UserFactors;
  consensusData: ConsensusSignalSet;
  provenance?: Record<string, ProvenancedSignal<unknown>>;
  reconciliationSummary?: ReconciliationSummary;
  missingDataFallbacks?: string[];
  degradedSignalClasses?: string[];
  hardFailures?: string[];
  confidenceCap?: number;
  confidenceCapsApplied?: string[];
}
