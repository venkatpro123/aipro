// careerContingencyPlanEngine.ts — Layer 53 (v17.0)
// Generates a 3-path career contingency plan (STAY / NEGOTIATE / TRANSITION)
// synthesised from financial runway, resilience, negotiation leverage, exit timing,
// job market liquidity, and the cohort classification. This is the most actionable
// output in the engine: it converts 52 layers of risk intelligence into concrete
// decision pathways the user can immediately execute.
//
// Design principle: paths are mutually exclusive in framing but complementary in
// practice. A user can prepare for TRANSITION while pursuing NEGOTIATE. The engine
// recommends the path with the highest expected value given the user's specific
// constraints (financial, visa, family, skills, market).

import type { CareerResilienceResult } from './careerResilienceEngine';
import type { NegotiationIntelligenceResult } from './negotiationIntelligenceService';
import type { ExitTimingResult } from './exitTimingOptimizer';
import type { JobMarketLiquidityResult } from './jobMarketLiquidityService';
import type { MarketDemandReport } from './roleMarketDemandService';
import type { ScenarioPlanResult } from './scenarioPlanService';
import type { VisaRiskResult } from './visaRiskEngine';
import type { FinancialRunwayAssessment } from './financialRunwayService';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ContingencyPathId = 'STAY' | 'NEGOTIATE' | 'TRANSITION';
export type UrgencyLevel = 'IMMEDIATE' | 'URGENT' | 'PLANNED' | 'MONITOR';

export interface ContingencyPath {
  pathId: ContingencyPathId;
  label: string;
  tagline: string;
  feasibilityScore: number; // 0–100
  expectedValueScore: number; // 0–100 composite EV
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timelineWeeks: number;
  immediateActions: string[]; // Next 7 days
  shortTermActions: string[]; // Next 1–3 months
  successIndicators: string[];
  keyRisks: string[];
  leverageFactors: string[]; // What makes this path viable
}

export interface CareerContingencyPlan {
  recommendedPath: ContingencyPathId;
  pathConfidence: number; // 0–1
  urgencyLevel: UrgencyLevel;
  decisionFramework: string;
  criticalDecisionDate: string; // ISO date — when inaction becomes costly
  stayPath: ContingencyPath;
  negotiatePath: ContingencyPath;
  transitionPath: ContingencyPath;
  synthesisNarrative: string; // 2-sentence overall framing
}

export interface CareerContingencyInput {
  currentScore: number;
  userFinancialRunway?: FinancialRunwayAssessment | null;
  financialRunwayMonths?: number | null;
  careerResilience?: CareerResilienceResult | null;
  negotiationIntelligence?: NegotiationIntelligenceResult | null;
  exitTiming?: ExitTimingResult | null;
  jobMarketLiquidity?: JobMarketLiquidityResult | null;
  roleMarketDemand?: MarketDemandReport | null;
  scenarioPlan?: ScenarioPlanResult | null;
  visaRisk?: VisaRiskResult | null;
  primaryCohort?: string | null;
  careerGoal?: 'stay_and_grow' | 'strategic_exit' | 'emergency_exit' | 'explore' | null;
  collapseStage?: 1 | 2 | 3 | null;
  networkSize?: 'minimal' | 'moderate' | 'substantial' | 'extensive' | null;
  priorJobChanges?: number | null;
  hasEquityVesting?: boolean | null;
  equityVestMonths?: number | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const WEEKS_HORIZON = 16; // Base planning horizon
const VISA_STAY_PENALTY = 20; // Visa-dependent users face larger STAY cost
const EQUITY_NEGOTIATE_BONUS = 15; // Unvested equity is leverage

// ── Helper Functions ──────────────────────────────────────────────────────────

function resolveRunwayMonths(input: CareerContingencyInput): number {
  if (input.userFinancialRunway?.runwayMonths != null) return input.userFinancialRunway.runwayMonths;
  if (input.financialRunwayMonths != null) return input.financialRunwayMonths;
  return 6; // Conservative default
}

function resolveUrgency(score: number, runway: number, collapseStage: number | null | undefined): UrgencyLevel {
  if (score >= 80 || collapseStage === 3 || runway < 2) return 'IMMEDIATE';
  if (score >= 65 || collapseStage === 2 || runway < 4) return 'URGENT';
  if (score >= 45 || collapseStage === 1) return 'PLANNED';
  return 'MONITOR';
}

function computeStayFeasibility(input: CareerContingencyInput): number {
  let score = 60; // Base

  const resilience = input.careerResilience?.compositeScore ?? 50;
  score += (resilience - 50) * 0.4; // ±20 pts from resilience

  // High risk penalises staying
  if (input.currentScore >= 80) score -= 25;
  else if (input.currentScore >= 65) score -= 15;
  else if (input.currentScore >= 45) score -= 5;
  else score += 10;

  // Collapse stage is a hard penalty
  if (input.collapseStage === 3) score -= 35;
  else if (input.collapseStage === 2) score -= 20;
  else if (input.collapseStage === 1) score -= 10;

  // Visa dependency amplifies STAY (fewer options)
  const visaConstraint = (input.visaRisk?.dependencyScore ?? 0) > 0.5;
  if (visaConstraint) score += 10; // Staying is more feasible due to constraints

  // Career goal alignment
  if (input.careerGoal === 'stay_and_grow') score += 10;
  if (input.careerGoal === 'emergency_exit') score -= 20;

  return Math.min(95, Math.max(5, Math.round(score)));
}

function computeNegotiateFeasibility(input: CareerContingencyInput): number {
  let score = 45; // Base

  const leverage = input.negotiationIntelligence?.leverageScore ?? 40;
  score += (leverage - 40) * 0.5; // ±30 pts from leverage

  // Unvested equity is strong negotiation lever
  if (input.hasEquityVesting && (input.equityVestMonths ?? 0) < 12) score += EQUITY_NEGOTIATE_BONUS;

  // Market demand amplifies leverage
  const demandIndex = input.roleMarketDemand?.adjustedDemandIndex ?? 50;
  score += (demandIndex - 50) * 0.3;

  // Exit timing window: optimal if next window is within 3 months (monthsUntilOptimalWindow === 0 or 1)
  const monthsToWindow = input.exitTiming?.monthsUntilOptimalWindow ?? 99;
  if (monthsToWindow <= 1) score += 10;

  // Very high risk makes negotiation harder
  if (input.currentScore >= 80) score -= 15;
  if (input.collapseStage === 3) score -= 25;

  // DISTRESS cohort: company has less to offer
  if (input.primaryCohort === 'DISTRESS') score -= 15;

  return Math.min(90, Math.max(5, Math.round(score)));
}

function computeTransitionFeasibility(input: CareerContingencyInput): number {
  let score = 50; // Base

  const liquidity = input.jobMarketLiquidity?.score ?? 50;
  score += (liquidity - 50) * 0.5;

  const network = { minimal: -15, moderate: 0, substantial: 15, extensive: 25 }[input.networkSize ?? 'moderate'] ?? 0;
  score += network;

  const priorChanges = input.priorJobChanges ?? 0;
  if (priorChanges >= 3) score += 15;
  else if (priorChanges >= 1) score += 7;

  // Financial runway must cover job search
  const runway = resolveRunwayMonths(input);
  const searchWeeks = input.roleMarketDemand?.jobSearchRunwayWeeks ?? 12;
  const searchMonths = searchWeeks / 4.3;
  if (runway < searchMonths) score -= 20; // Can't afford the search
  else if (runway > searchMonths * 2) score += 10;

  // Visa constraint severely limits transition
  const visaConstraint = (input.visaRisk?.dependencyScore ?? 0) > 0.7;
  if (visaConstraint) score -= VISA_STAY_PENALTY;

  // Career goal alignment
  if (input.careerGoal === 'emergency_exit' || input.careerGoal === 'strategic_exit') score += 15;
  if (input.careerGoal === 'stay_and_grow') score -= 10;

  return Math.min(95, Math.max(5, Math.round(score)));
}

function buildStayActions(input: CareerContingencyInput): { immediate: string[]; shortTerm: string[] } {
  const immediate: string[] = [];
  const shortTerm: string[] = [];

  if (input.currentScore >= 65) {
    immediate.push('Document all major contributions and deliverables this week');
    immediate.push('Request a 1:1 with your manager to align on Q3 priorities');
  } else {
    immediate.push('Conduct a personal contribution audit — identify your 3 highest-value projects');
    immediate.push('Strengthen relationships with the 2 most influential stakeholders');
  }

  immediate.push('Identify the single most visible initiative you can lead in the next 60 days');

  shortTerm.push('Volunteer for cross-functional projects that expand your internal visibility');
  shortTerm.push('Quantify your revenue or cost impact in concrete numbers for your record');
  shortTerm.push('Build relationships with department leaders outside your direct reporting line');

  if ((input.careerResilience?.compositeScore ?? 50) < 50) {
    shortTerm.push('Upskill in the highest-demand skill adjacent to your current role (see Skills tab)');
  }

  if (input.hasEquityVesting && (input.equityVestMonths ?? 99) < 18) {
    immediate.push(`Track vesting schedule — ${input.equityVestMonths} months until next cliff`);
  }

  return { immediate, shortTerm };
}

function buildNegotiateActions(input: CareerContingencyInput): { immediate: string[]; shortTerm: string[] } {
  const immediate: string[] = [];
  const shortTerm: string[] = [];

  immediate.push('Compile competing market offers or salary data to establish your external value');
  immediate.push('List all unvested equity, bonuses, and benefits at risk — this is your BATNA floor');
  immediate.push('Identify your single most critical ask: severance extension, remote work, or role change');

  shortTerm.push('Initiate a value conversation with your manager framed around contribution, not fear');
  shortTerm.push('Explore internal transfer opportunities before committing to an external search');
  shortTerm.push('Request a written performance review to establish a documented record');

  if ((input.negotiationIntelligence?.leverageScore ?? 40) >= 60) {
    shortTerm.push('Use your documented market value to negotiate a retention package or role upgrade');
  }

  if (input.hasEquityVesting) {
    shortTerm.push('Negotiate accelerated vesting or severance coverage of remaining cliff as exit terms');
  }

  return { immediate, shortTerm };
}

function buildTransitionActions(input: CareerContingencyInput): { immediate: string[]; shortTerm: string[] } {
  const immediate: string[] = [];
  const shortTerm: string[] = [];
  const runway = resolveRunwayMonths(input);
  const urgencyLevel = resolveUrgency(input.currentScore, runway, input.collapseStage);

  if (urgencyLevel === 'IMMEDIATE') {
    immediate.push('Activate your top 5 network contacts TODAY — warm outreach, not cold applications');
    immediate.push('Update your LinkedIn headline and resume in the next 48 hours');
    immediate.push('Set a daily job search target: 2 applications + 1 network conversation per day');
  } else {
    immediate.push('Update your resume with the last 12 months of achievements before they fade');
    immediate.push('Identify 10 target companies in your preferred sector and study their engineering blogs');
    immediate.push('Reconnect with 3 former colleagues this week — casual check-in, not ask');
  }

  const searchWeeks = input.roleMarketDemand?.jobSearchRunwayWeeks ?? 12;
  shortTerm.push(`Expect a ${searchWeeks}-week active search in your market — plan financially for this window`);
  shortTerm.push('Build a pipeline of 20+ target roles across 3 tiers: stretch, target, and fallback');
  shortTerm.push('Complete 2–3 practice interviews before applying to top-tier targets');

  if ((input.visaRisk?.dependencyScore ?? 0) > 0.5) {
    shortTerm.push('Filter target companies for confirmed H1B sponsorship history before applying');
  }

  return { immediate, shortTerm };
}

function buildStayPath(input: CareerContingencyInput, feasibility: number): ContingencyPath {
  const { immediate, shortTerm } = buildStayActions(input);
  const riskScore = input.currentScore;

  const riskLevel: ContingencyPath['riskLevel'] =
    feasibility < 30 || riskScore >= 80 ? 'CRITICAL' :
    feasibility < 50 || riskScore >= 65 ? 'HIGH' :
    feasibility < 70 || riskScore >= 45 ? 'MEDIUM' : 'LOW';

  return {
    pathId: 'STAY',
    label: 'Protect & Strengthen',
    tagline: 'Maximise your position and resilience within the current company',
    feasibilityScore: feasibility,
    expectedValueScore: Math.round(feasibility * 0.6 + (100 - riskScore) * 0.4),
    riskLevel,
    timelineWeeks: 12,
    immediateActions: immediate,
    shortTermActions: shortTerm,
    successIndicators: [
      'Confirmed alignment with manager on key deliverables',
      'Visible contribution to a cross-functional initiative',
      'Positive performance signal received in writing',
    ],
    keyRisks: [
      'Company conditions deteriorate faster than protective actions take effect',
      'Individual performance attribution is lost in a broad round',
      riskScore >= 65 ? 'WARN/EFFICIENCY cuts do not distinguish by performance tier' : 'Macro sector wave could override individual contributions',
    ],
    leverageFactors: [
      'Deep institutional knowledge that takes 6–12 months to replace',
      input.hasEquityVesting ? `Unvested equity creates strong retention incentive` : 'Accumulated tenure and relationship network',
    ],
  };
}

function buildNegotiatePath(input: CareerContingencyInput, feasibility: number): ContingencyPath {
  const { immediate, shortTerm } = buildNegotiateActions(input);
  const leverage = input.negotiationIntelligence?.leverageScore ?? 40;

  const riskLevel: ContingencyPath['riskLevel'] =
    feasibility < 30 ? 'CRITICAL' :
    feasibility < 45 ? 'HIGH' :
    feasibility < 65 ? 'MEDIUM' : 'LOW';

  return {
    pathId: 'NEGOTIATE',
    label: 'Negotiate & Capture',
    tagline: 'Extract maximum value before departure — severance, equity, or role upgrade',
    feasibilityScore: feasibility,
    expectedValueScore: Math.round(feasibility * 0.55 + leverage * 0.45),
    riskLevel,
    timelineWeeks: 8,
    immediateActions: immediate,
    shortTermActions: shortTerm,
    successIndicators: [
      'Severance or transition package agreed in writing',
      'Equity acceleration or cliff coverage negotiated',
      'Internal transfer offer received, or clear timeline agreed with management',
    ],
    keyRisks: [
      'Negotiation signals desire to leave — may accelerate termination',
      'Low leverage position (distress cohort) limits company\'s ability to offer meaningful terms',
      'Negotiation without competing offer significantly reduces leverage',
    ],
    leverageFactors: [
      leverage >= 60 ? 'Above-market demand for your role creates external BATNA' : 'Institutional knowledge and current project dependencies',
      input.hasEquityVesting ? `Unvested equity cliff within ${input.equityVestMonths} months is strong negotiating asset` : 'Transition timing flexibility',
    ],
  };
}

function buildTransitionPath(input: CareerContingencyInput, feasibility: number): ContingencyPath {
  const { immediate, shortTerm } = buildTransitionActions(input);
  const liquidity = input.jobMarketLiquidity?.score ?? 50;
  const runway = resolveRunwayMonths(input);

  const riskLevel: ContingencyPath['riskLevel'] =
    feasibility < 30 || runway < 2 ? 'CRITICAL' :
    feasibility < 45 || runway < 4 ? 'HIGH' :
    feasibility < 65 ? 'MEDIUM' : 'LOW';

  return {
    pathId: 'TRANSITION',
    label: 'Transition & Advance',
    tagline: 'Execute a structured exit to a better-fitting, lower-risk opportunity',
    feasibilityScore: feasibility,
    expectedValueScore: Math.round(feasibility * 0.5 + liquidity * 0.5),
    riskLevel,
    timelineWeeks: Math.round(WEEKS_HORIZON * (1 + (1 - feasibility / 100))),
    immediateActions: immediate,
    shortTermActions: shortTerm,
    successIndicators: [
      'Pipeline of 10+ target roles established',
      'First-round interview scheduled within 4 weeks',
      'Offer in hand within the target search runway',
    ],
    keyRisks: [
      `Current runway (${runway}mo) may not fully cover expected search timeline`,
      (input.visaRisk?.dependencyScore ?? 0) > 0.5
        ? 'Visa sponsorship requirement limits accessible companies'
        : 'Job market conditions may extend search beyond expected timeline',
      'Compensation gap risk — new role may require downward adjustment in current market',
    ],
    leverageFactors: [
      liquidity >= 60 ? 'Strong market demand for your role shortens expected search time' : 'Your role skills transfer to adjacent markets',
      (input.priorJobChanges ?? 0) >= 2 ? 'Prior job change experience means faster interview ramp' : 'Fresh perspective appealing to companies hiring for culture change',
    ],
  };
}

function selectRecommendedPath(
  stayEV: number,
  negotiateEV: number,
  transitionEV: number,
  input: CareerContingencyInput,
): { path: ContingencyPathId; confidence: number } {
  // Goal override takes priority
  if (input.careerGoal === 'emergency_exit' || input.collapseStage === 3) {
    return { path: 'TRANSITION', confidence: 0.85 };
  }
  if (input.careerGoal === 'stay_and_grow' && stayEV >= 50) {
    return { path: 'STAY', confidence: 0.75 };
  }

  const scores = [
    { path: 'STAY' as ContingencyPathId, ev: stayEV },
    { path: 'NEGOTIATE' as ContingencyPathId, ev: negotiateEV },
    { path: 'TRANSITION' as ContingencyPathId, ev: transitionEV },
  ].sort((a, b) => b.ev - a.ev);

  const winner = scores[0];
  const margin = winner.ev - scores[1].ev;
  const confidence = 0.55 + Math.min(0.30, margin / 100);

  return { path: winner.path, confidence: Math.round(confidence * 100) / 100 };
}

function buildDecisionFramework(
  recommended: ContingencyPathId,
  input: CareerContingencyInput,
  stayF: number,
  negF: number,
  transF: number,
): string {
  const runway = resolveRunwayMonths(input);
  const score = input.currentScore;

  if (recommended === 'TRANSITION') {
    if (score >= 80) return `With a risk score of ${score}/100 and ${runway} months of runway, active transition is the only path with positive expected value. Begin job search immediately.`;
    if (input.collapseStage === 3) return `Company signals indicate Stage 3 collapse — transition is urgent before market visibility of the round eliminates competing offers.`;
    return `Job market liquidity is strong and your resilience gives you an advantage. Proactive transition captures upside before conditions worsen.`;
  }
  if (recommended === 'NEGOTIATE') {
    return `You hold ${negF}% leverage feasibility — vesting schedule, market demand, or institutional knowledge creates a negotiating position. Capture value now before the leverage window closes.`;
  }
  return `Your resilience and the company's current trajectory suggest staying is viable (stay feasibility: ${stayF}%). Focus on visibility and contribution velocity to strengthen your position.`;
}

function buildSynthesisNarrative(recommended: ContingencyPathId, urgency: UrgencyLevel, score: number): string {
  const urgencyText = { IMMEDIATE: 'requires immediate action', URGENT: 'requires urgent attention', PLANNED: 'calls for structured planning', MONITOR: 'warrants careful monitoring' }[urgency];
  const pathText = { STAY: 'protecting and strengthening your current position', NEGOTIATE: 'capturing maximum value through negotiation', TRANSITION: 'executing a strategic exit to a better opportunity' }[recommended];
  return `Your situation ${urgencyText} — this analysis recommends ${pathText}. All three contingency paths are detailed below so you can prepare multiple options simultaneously.`;
}

function computeCriticalDecisionDate(urgency: UrgencyLevel, runway: number): string {
  const daysFromNow = urgency === 'IMMEDIATE' ? 7 : urgency === 'URGENT' ? 30 : urgency === 'PLANNED' ? 90 : 180;
  const runwayDays = Math.round(runway * 30);
  const effectiveDays = Math.min(daysFromNow, runwayDays * 0.8);
  const date = new Date(Date.now() + effectiveDays * 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
}

// ── Main Export ───────────────────────────────────────────────────────────────

export function computeCareerContingencyPlan(input: CareerContingencyInput): CareerContingencyPlan {
  const runway = resolveRunwayMonths(input);
  const urgency = resolveUrgency(input.currentScore, runway, input.collapseStage);

  const stayFeasibility = computeStayFeasibility(input);
  const negFeasibility = computeNegotiateFeasibility(input);
  const transFeasibility = computeTransitionFeasibility(input);

  const stayPath = buildStayPath(input, stayFeasibility);
  const negotiatePath = buildNegotiatePath(input, negFeasibility);
  const transitionPath = buildTransitionPath(input, transFeasibility);

  const { path: recommended, confidence } = selectRecommendedPath(
    stayPath.expectedValueScore,
    negotiatePath.expectedValueScore,
    transitionPath.expectedValueScore,
    input,
  );

  const decisionFramework = buildDecisionFramework(recommended, input, stayFeasibility, negFeasibility, transFeasibility);
  const synthesisNarrative = buildSynthesisNarrative(recommended, urgency, input.currentScore);
  const criticalDecisionDate = computeCriticalDecisionDate(urgency, runway);

  return {
    recommendedPath: recommended,
    pathConfidence: confidence,
    urgencyLevel: urgency,
    decisionFramework,
    criticalDecisionDate,
    synthesisNarrative,
    stayPath,
    negotiatePath,
    transitionPath,
  };
}
