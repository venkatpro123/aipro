// agenticWaveTypes.ts — Type definitions for the AI Displacement Intelligence Engine
// These types are separate from intelligence/types.ts to keep that module stable.

// ── Wave & Threshold enums ────────────────────────────────────────────────────

/** Where the industry sits on the AI adoption curve right now (2025-2026). */
export type WaveStatus = 'EARLY' | 'BUILDING' | 'ACCELERATING' | 'INFLECTION' | 'ACTIVE';

/** Non-linear 4-state capability threshold model. Never shows year-by-year %. */
export type ThresholdStage = 'CURRENT' | 'APPROACHING' | 'THRESHOLD_WINDOW' | 'POST_THRESHOLD';

export type ConfidenceLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type UrgencyTone    = 'calm' | 'strategic' | 'urgent';
export type ScarcityLevel  = 'SCARCE' | 'BALANCED' | 'ABUNDANT';
export type Trajectory     = 'stable' | 'ai_gaining' | 'ai_dominant';
export type ExposureLevel  = 'low' | 'medium' | 'high' | 'critical';
export type SkillTier      = 'obsolete' | 'at_risk' | 'safe';
export type AdoptionSpeed  = 'fast' | 'moderate' | 'slow';

// ── Section 3: Capability Threshold ──────────────────────────────────────────

export interface CapabilityThresholdState {
  stage: ThresholdStage;
  stageLabel: string;            // Human-readable stage name
  stageDescription: string;      // What this stage means for the role
  timingConfidence: ConfidenceLevel;
  directionConfidence: 'HIGH';   // Always HIGH — adoption direction is certain
  timingRange: string;           // e.g. "Estimated: 2028–2031" or "Already crossed"
  triggerConditions: string[];   // 2-3 conditions that would advance to next stage
  nextStage: ThresholdStage | null;
}

// ── Section 2: Agentic Wave Exposure ─────────────────────────────────────────

export interface AgenticWaveScore {
  currentScore: number;          // Same as ScoreResult.total
  projectedScore: number;        // Re-weighted future projection
  projectionWindow: string;      // e.g. "Agentic AI mainstream scenario (2028–2032)"
  industryAdoptionSpeed: AdoptionSpeed;
  keyDrivers: string[];          // 2-3 bullets explaining the gap
  scoreLabel: string;            // e.g. "SEVERE" based on projected score
  scoreColor: string;            // CSS color for projected score
}

// ── Section 4: Task Exposure ─────────────────────────────────────────────────

export interface TaskExposureEntry {
  task: string;                  // e.g. "Write unit tests"
  humanPct: number;              // 0–100 — current human share
  aiPct: number;                 // 0–100 — current AI automatable share
  trajectory: Trajectory;
  exposureLevel: ExposureLevel;
  aiTool?: string;               // Specific AI tool if known
}

// ── Section 5: Survival Factors ──────────────────────────────────────────────

export interface SurvivalFactor {
  skill: string;
  protectionScore: number;       // 0–100 — how much this skill protects today
  futureValue: number;           // 0–100 — value in the agentic-AI world
  marketScarcity: ScarcityLevel;
  scarcityReason: string;
  tier: SkillTier;
  horizon?: string;              // e.g. "1-3yr" or "5yr+"
}

// ── Section 6: Future Role Evolution ─────────────────────────────────────────

export interface FutureRoleStep {
  role: string;
  timeframe: string;             // e.g. "Now", "12–24 months", "3–4 years", "5+ years"
  riskLevel: number;             // 0–100
  isCurrentRole: boolean;
  transitionNote?: string;       // Brief note on what changes
}

// ── Section 7: Early Warning Signals ─────────────────────────────────────────

export interface WaveStatusDetail {
  status: WaveStatus;
  label: string;                 // Display label
  description: string;          // What this status means for the user
  color: string;                 // CSS color
  supportingSignals: string[];   // 2-3 observable signals backing this status
  industryContext: string;       // e.g. "Software Engineering sector"
}

// ── Section 8: Personal Action Plan ─────────────────────────────────────────

export interface ActionItem {
  action: string;
  why: string;
  outcome?: string;
  tool?: string;
  riskReduction: number;         // Estimated % risk reduction from this action
}

export interface ActionHorizon {
  horizon: '30d' | '90d' | '12mo' | 'before_threshold';
  label: string;                 // e.g. "Next 30 Days"
  sublabel: string;              // e.g. "Immediate protective moves"
  actions: ActionItem[];
  totalRiskReduction: number;    // Sum of actions' riskReduction
}

// ── Section 9: Psychological Framing ─────────────────────────────────────────

export interface PsychologicalFrame {
  urgencyTone: UrgencyTone;
  headline: string;              // Honest, direct, non-alarmist opening
  context: string;               // Positions this in the broader AI adoption story
  agency: string;                // What the person controls — ends with concrete action
  horizon: string;               // Explicit uncertainty acknowledgment
}

// ── Master result object ──────────────────────────────────────────────────────

export interface AgenticWaveResult {
  // Section 2
  waveScore: AgenticWaveScore;
  // Section 3
  capabilityThreshold: CapabilityThresholdState;
  // Section 4
  taskExposure: TaskExposureEntry[];
  // Section 5
  survivalFactors: SurvivalFactor[];
  // Section 6
  futureRoleEvolution: FutureRoleStep[];
  // Section 7
  waveStatusDetail: WaveStatusDetail;
  // Section 8
  actionPlan: ActionHorizon[];
  // Section 9
  psychFrame: PsychologicalFrame;
}
