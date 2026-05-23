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
// WS9 — bare-arithmetic confidence (`0.55 + 0.30 · margin`) routed
// through DB constants. Both addends are uncalibrated placeholders
// pending regression on user_prediction_outcomes.
import { getConstant } from './calibration/calibrationConstants';
import type { ScenarioPlanResult } from './scenarioPlanService';
import type { VisaRiskResult } from './visaRiskEngine';
import type { FinancialRunwayAssessment } from './financialRunwayService';
import type { GeographicOptionalityResult } from './geographicOptionalityEngine';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ContingencyPathId = 'STAY' | 'NEGOTIATE' | 'TRANSITION';
export type UrgencyLevel = 'IMMEDIATE' | 'URGENT' | 'PLANNED' | 'MONITOR';

/** GAP G: financial grounding for each contingency path */
export interface ContingencyPathFinancialProjection {
  runwayExhaustionDate: string | null;   // ISO date when runway runs out
  runwayMonthsConsumed: number;          // months consumed by this path's search/transition
  estimatedNewSalaryPct: number | null;  // TRANSITION only: +/- % vs. current (e.g. -10 = 10% pay cut)
  estimatedWeeksToHire: number | null;   // TRANSITION only: expected search duration
  costOfLivingAdjustment: number | null; // CoL multiplier impact (1.3 = 30% more expensive)
}

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
  financialProjection?: ContingencyPathFinancialProjection;
  /** MED-8: base feasibility values are model-estimated, not regression-calibrated. */
  feasibilityCalibrationStatus: 'developer_estimate';

  /**
   * Provenance of the feasibilityScore percentage.
   *
   *   'market_successRate'  — derived from careerPathMarket.successRate12mPct
   *                           (market research data, citable). Show as point estimate.
   *   'portability_matrix'  — derived from rolePortabilityMatrix.score
   *                           (empirical portability data). Show as point estimate.
   *   'estimated'           — developer formula with no empirical validation.
   *                           MUST display as a range (feasibilityRangeLow–feasibilityRangeHigh),
   *                           never as a point estimate, to avoid false precision.
   */
  feasibilitySource: 'market_successRate' | 'portability_matrix' | 'estimated';

  /**
   * Epistemic uncertainty bounds — present only when feasibilitySource='estimated'.
   * A 62% estimate with ±12pp uncertainty renders as "50–74%", not "62%".
   * Ranges are honest; point estimates from uncalibrated formulas are not.
   */
  feasibilityRangeLow?: number;
  feasibilityRangeHigh?: number;

  /**
   * Human-readable source attribution — present when feasibilitySource is
   * 'market_successRate' or 'portability_matrix'. Shown as a tooltip/footnote
   * in the UI so users can verify the provenance of the number.
   */
  feasibilitySourceNote?: string;

  /**
   * Equity-vest-aware recommendation strength modifier.
   * Applied to STAY path when equityVestMonths ≤ 3 to reflect the high
   * financial cost of leaving before the imminent cliff.
   * Scale: 0–1 additive modifier on top of expectedValueScore normalization.
   */
  recommendationStrength?: number;
}

export interface EquityDilemmaAlert {
  /** True when equityVestMonths ≤ 6 AND score ≥ 60. */
  isActive: boolean;
  /** Days until vest cliff (equityVestMonths × 30). */
  daysToVest: number;
  /** Estimated unvested value in USD, or null if unknown. */
  unvestedValue: number | null;
  /** Human-readable alert text for the UI. */
  alertText: string;
  /** Numeric day countdown — same as daysToVest, exposed for easy formatting. */
  dayCountdown: number;
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
  /**
   * Surfaces when the user faces both elevated risk (score ≥ 60) and an
   * imminent equity vest (≤ 6 months). The dilemma: high risk argues for
   * leaving soon; the vest argues for staying. UI shows this as a prominent
   * alert above the contingency paths with an explicit day countdown.
   */
  equityDilemmaAlert?: EquityDilemmaAlert;
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
  geographicOptionality?: GeographicOptionalityResult | null; // GAP G: for CoL adjustment in financial projection
  /** v37.0: role leverage multiplier derived from role-industry composite (0.5–2.0).
   *  Values >1.0 = higher leverage (surgeons, principal engineers, compliance officers).
   *  Values <1.0 = lower leverage (BPO associates, junior admins, media analysts). */
  roleLeverageMultiplier?: number | null;

  /**
   * v40.0: 12-month transition success rate from careerPathMarket.successRate12mPct
   * for the user's target/current role. When present, TRANSITION path feasibilityScore
   * is anchored to this market-research figure and labeled 'market_successRate'.
   * Source: careerPathMarket.ts hardcoded baseline (market research, 2026 estimates).
   * Range: 0–100 (percent of attempted transitions that land a role within 12 months).
   */
  transitionSuccessRate12mPct?: number | null;

  /**
   * Whether the user supports dependents (children, parents, etc.).
   * Combined with dualIncomeHousehold to detect sole-earner status:
   * hasDependents && !dualIncomeHousehold = sole earner.
   * A sole earner's income gap during TRANSITION is a household financial crisis,
   * not just a personal career inconvenience — dependent expenses continue regardless.
   */
  hasDependents?: boolean | null;
  /**
   * Whether a second household income exists (spouse/partner employed).
   * Dual-income households have a structural buffer: even if the user's runway
   * runs out, the partner's income covers household basics during the search.
   * Sole earners (hasDependents && !dualIncomeHousehold) have no such buffer.
   */
  dualIncomeHousehold?: boolean | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const WEEKS_HORIZON = 16; // Base planning horizon

// Epistemic uncertainty bands for developer-estimated feasibility scores.
// When feasibilitySource='estimated', the displayed range is [score - band, score + band].
// Bands reflect the model's inherent uncertainty: NEGOTIATE has higher variance
// than STAY because negotiation outcome depends on factors the model cannot observe
// (manager's budget authority, company headcount freeze status, etc.).
const FEASIBILITY_UNCERTAINTY = {
  STAY:      10, // ±10pp: internal path has moderate uncertainty (resilience model is partially validated)
  NEGOTIATE: 12, // ±12pp: leverage outcome has higher variance
  TRANSITION: 12, // ±12pp: job search timing/outcome has high variance (only when no market data)
} as const;

/**
 * Compute range bounds for an estimated feasibility score.
 * Clamps to [5, 95] so the displayed range stays within meaningful bounds.
 */
function estimatedRange(score: number, band: number): { low: number; high: number } {
  return {
    low:  Math.max(5,  score - band),
    high: Math.min(95, score + band),
  };
}
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

  // High visa risk makes STAY more dangerous — a layoff triggers the 60-day clock.
  // Penalise STAY for HIGH/CRITICAL visa risk so TRANSITION surfaces correctly.
  // Low visa dependency is neutral-to-positive for staying.
  const visaRiskLevel = input.visaRisk?.overallVisaRisk;
  if (visaRiskLevel === 'CRITICAL' || visaRiskLevel === 'HIGH') score -= 15;
  else if ((input.visaRisk?.dependencyScore ?? 0) <= 0.3) score += 5;

  // Career goal alignment
  if (input.careerGoal === 'stay_and_grow') score += 10;
  if (input.careerGoal === 'emergency_exit') score -= 20;

  // Sole earner with dependents: staying preserves the only household income stream.
  // The asymmetry between "staying" and "transitioning" is much larger for this segment
  // because any income gap has a direct household impact, not just personal inconvenience.
  const isSoleEarner = !!input.hasDependents && !input.dualIncomeHousehold;
  if (isSoleEarner) score += 8;

  // Imminent equity cliff (≤ 3 months): staying has a concrete, time-bounded financial
  // rationale. The expected cost of leaving (forfeited unvested equity) is highest here,
  // making STAY materially more attractive than the base resilience model would suggest.
  if (input.hasEquityVesting && (input.equityVestMonths ?? 99) <= 3 && (input.equityVestMonths ?? 99) > 0) {
    score += 15;
  }

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

  // High visa risk adds urgency — negotiation may stall and consume the grace period.
  const negVisaRisk = input.visaRisk?.overallVisaRisk;
  if (negVisaRisk === 'CRITICAL' || negVisaRisk === 'HIGH') score -= 10;

  // v37.0: role leverage multiplier — surgeons/principal engineers negotiate from strength;
  // BPO associates/junior admins have structurally limited leverage regardless of market.
  if (input.roleLeverageMultiplier != null) {
    const leverageDelta = Math.round((input.roleLeverageMultiplier - 1.0) * 20); // ±20 pts at extremes
    score += Math.max(-20, Math.min(20, leverageDelta));
  }

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

  // Sole earner income-gap penalty: if runway can't cover the expected search,
  // a sole earner with dependents faces a household income crisis — not just
  // personal financial pressure. Standard runway shortfall penalty is doubled.
  const isSoleEarnerTransition = !!input.hasDependents && !input.dualIncomeHousehold;
  if (isSoleEarnerTransition) {
    const runway = resolveRunwayMonths(input);
    const searchWeeks = input.roleMarketDemand?.jobSearchRunwayWeeks ?? 12;
    const searchMonths = searchWeeks / 4.3;
    if (runway < searchMonths) {
      score -= 20; // doubled vs. standard runway shortfall penalty of 20 (sole earner = household crisis)
    }
  }

  // v37.0: role portability modifier — cloud architects and data scientists are highly portable;
  // lawyers and licensed healthcare workers face structural industry-transition constraints.
  // Inverted from negotiate: high role leverage (>1) typically means specialist → lower cross-industry portability.
  if (input.roleLeverageMultiplier != null && input.roleLeverageMultiplier > 1.3) {
    // Highly specialized / regulated roles have lower TRANSITION portability
    score -= Math.round((input.roleLeverageMultiplier - 1.3) * 15);
  } else if (input.roleLeverageMultiplier != null && input.roleLeverageMultiplier < 0.9) {
    // Commodity roles (BPO, junior admin) face difficult transition market regardless
    score -= Math.round((0.9 - input.roleLeverageMultiplier) * 10);
  }

  return Math.min(95, Math.max(5, Math.round(score)));
}

// GAP G: compute financial grounding for a contingency path
function buildPathFinancialProjection(
  pathId: ContingencyPathId,
  input: CareerContingencyInput,
): ContingencyPathFinancialProjection {
  const runway = resolveRunwayMonths(input);
  const colMultiplier = input.geographicOptionality?.costOfLivingMultiplier ?? null;

  if (pathId === 'STAY') {
    // STAY: runway is consumed at current burn rate; no salary change
    const exhaustionDate = runway > 0
      ? new Date(Date.now() + runway * 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      : null;
    return {
      runwayExhaustionDate: exhaustionDate,
      runwayMonthsConsumed: 0,
      estimatedNewSalaryPct: null,
      estimatedWeeksToHire: null,
      costOfLivingAdjustment: colMultiplier,
    };
  }

  if (pathId === 'NEGOTIATE') {
    // NEGOTIATE: runway unchanged unless negotiation fails → fallback transition
    const exhaustionDate = runway > 0
      ? new Date(Date.now() + runway * 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      : null;
    return {
      runwayExhaustionDate: exhaustionDate,
      runwayMonthsConsumed: 0,
      estimatedNewSalaryPct: null,
      estimatedWeeksToHire: null,
      costOfLivingAdjustment: colMultiplier,
    };
  }

  // TRANSITION: runway consumed during search; salary delta + weeks to hire
  const searchWeeks = input.roleMarketDemand?.jobSearchRunwayWeeks ?? 12;
  const searchMonths = Math.ceil(searchWeeks / 4.3);
  const remainingRunway = Math.max(0, runway - searchMonths);
  const exhaustionDate = remainingRunway > 0
    ? new Date(Date.now() + remainingRunway * 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    : null; // runway exhausted during search

  // Estimate salary delta from role market demand (negative = pay cut, positive = raise)
  const demandIndex = input.roleMarketDemand?.adjustedDemandIndex ?? 50;
  const estimatedNewSalaryPct = demandIndex >= 70 ? 5 :
    demandIndex >= 50 ? 0 :
    demandIndex >= 30 ? -10 : -20;

  return {
    runwayExhaustionDate: exhaustionDate,
    runwayMonthsConsumed: searchMonths,
    estimatedNewSalaryPct,
    estimatedWeeksToHire: searchWeeks,
    costOfLivingAdjustment: colMultiplier && colMultiplier !== 1.0 ? colMultiplier : null,
  };
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

  // Equity vest cliff — surface dollar amount when exitTiming has computed it.
  // Priority: (1) dollar-grounded message from exitTiming, (2) month-only fallback.
  if (input.hasEquityVesting) {
    const vestMonths = input.equityVestMonths ?? 99;
    const unvestedNow = input.exitTiming?.unvestedIfImmediateExit;
    const isGoldenHandcuff = input.exitTiming?.isGoldenHandcuffZone;

    if (vestMonths < 6) {
      // Near-term cliff: vest within 6 months is the primary reason to hold.
      if (unvestedNow != null && unvestedNow > 0) {
        // Dollar-grounded: "Hold 4 months to capture ~$67K vest event"
        const unvestedK = unvestedNow >= 1000
          ? `~$${Math.round(unvestedNow / 1000)}K`
          : `~$${Math.round(unvestedNow)}`;
        immediate.push(
          `Hold ${vestMonths} month${vestMonths !== 1 ? 's' : ''} to capture ${unvestedK} vest event — departing before this cliff forfeits this amount`,
        );
      } else {
        immediate.push(
          `Vest cliff in ${vestMonths} month${vestMonths !== 1 ? 's' : ''} — this is the primary reason to hold; departing before it forfeits unvested equity`,
        );
      }
      if (isGoldenHandcuff) {
        immediate.push('Golden handcuff zone: significant equity vests very soon — this is a bounded, high-return wait before re-evaluating your options');
      }
    } else if (vestMonths < 18) {
      // Medium-term: flag without the urgency of a sub-6-month cliff
      if (unvestedNow != null && unvestedNow > 0) {
        const unvestedK = unvestedNow >= 1000
          ? `~$${Math.round(unvestedNow / 1000)}K`
          : `~$${Math.round(unvestedNow)}`;
        shortTerm.push(
          `Vesting cliff ${vestMonths} months away (${unvestedK} unvested) — factor this into any exit timeline decision`,
        );
      } else {
        shortTerm.push(`Track vesting schedule — ${vestMonths} months until next cliff; factor into any exit timeline`);
      }
    }
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

  // Sole earner with dependents: surface household-specific bridging actions
  const isSoleEarnerActions = !!input.hasDependents && !input.dualIncomeHousehold;
  if (isSoleEarnerActions) {
    const searchWeeks = input.roleMarketDemand?.jobSearchRunwayWeeks ?? 12;
    const searchMonths = searchWeeks / 4.3;
    const runway = resolveRunwayMonths(input);
    if (runway < searchMonths) {
      const gapMonths = Math.ceil(searchMonths - runway);
      immediate.unshift(
        `SOLE EARNER PRIORITY: ${runway}-month runway cannot cover a ${Math.round(searchMonths)}-month search — ${gapMonths}-month household income gap. Explore bridge income (contracting, consulting, moonlighting) BEFORE committing to full-time search mode`,
      );
      shortTerm.push('Negotiate a longer notice period or transition assistance at current employer — this is your most valuable financial buffer for a dependent household');
    } else {
      shortTerm.push('As sole earner with dependents, maintain liquid reserve separate from the job-search fund for non-negotiable household costs (rent, healthcare, school fees) throughout the search');
    }
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
      (() => {
        if (!input.hasEquityVesting) return 'Accumulated tenure and relationship network';
        const vestMonths = input.equityVestMonths;
        const unvestedNow = input.exitTiming?.unvestedIfImmediateExit;
        if (unvestedNow != null && unvestedNow > 0 && vestMonths != null) {
          const unvestedK = unvestedNow >= 1000
            ? `~$${Math.round(unvestedNow / 1000)}K`
            : `~$${Math.round(unvestedNow)}`;
          return `Unvested equity (${unvestedK} at risk) creates strong retention incentive — cliff is ${vestMonths} month${vestMonths !== 1 ? 's' : ''} away`;
        }
        return vestMonths != null
          ? `Unvested equity with a ${vestMonths}-month cliff creates strong retention incentive`
          : 'Unvested equity creates strong retention incentive';
      })(),
    ],
    financialProjection: buildPathFinancialProjection('STAY', input),
    feasibilityCalibrationStatus: 'developer_estimate',
    // STAY feasibility is entirely model-estimated — no empirical win/loss data exists
    // for "probability of keeping your job given these signals". Show as range.
    feasibilitySource: 'estimated',
    ...(() => {
      const { low, high } = estimatedRange(feasibility, FEASIBILITY_UNCERTAINTY.STAY);
      return { feasibilityRangeLow: low, feasibilityRangeHigh: high };
    })(),
    // Equity-vest strength modifier: when vest is ≤ 3 months, the financial case for
    // STAY is concrete and time-bounded — expose as recommendationStrength so the UI
    // can show a stronger recommendation badge.
    ...(input.hasEquityVesting && (input.equityVestMonths ?? 99) <= 3 && (input.equityVestMonths ?? 99) > 0
      ? { recommendationStrength: 0.15 }
      : {}
    ),
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
    financialProjection: buildPathFinancialProjection('NEGOTIATE', input),
    feasibilityCalibrationStatus: 'developer_estimate',
    // NEGOTIATE feasibility is model-estimated — negotiation outcomes are not tracked
    // in the calibration dataset (user_prediction_outcomes captures layoff outcomes,
    // not negotiation success). Show as range.
    feasibilitySource: 'estimated',
    ...(() => {
      const { low, high } = estimatedRange(feasibility, FEASIBILITY_UNCERTAINTY.NEGOTIATE);
      return { feasibilityRangeLow: low, feasibilityRangeHigh: high };
    })(),
  };
}

function buildTransitionPath(input: CareerContingencyInput, feasibility: number): ContingencyPath {
  const { immediate, shortTerm } = buildTransitionActions(input);
  const liquidity = input.jobMarketLiquidity?.score ?? 50;
  const runway = resolveRunwayMonths(input);

  // When successRate12mPct is available from market research, blend it with the
  // model formula (60% market data, 40% model) so the displayed score reflects
  // real-world transition outcomes. Without this, a data engineer showing 60%
  // market success rate might display "47% feasibility" from the formula alone.
  const sr = input.transitionSuccessRate12mPct;
  const groundedFeasibility = sr != null && sr > 0
    ? Math.round(sr * 0.6 + feasibility * 0.4)
    : feasibility;

  const riskLevel: ContingencyPath['riskLevel'] =
    groundedFeasibility < 30 || runway < 2 ? 'CRITICAL' :
    groundedFeasibility < 45 || runway < 4 ? 'HIGH' :
    groundedFeasibility < 65 ? 'MEDIUM' : 'LOW';

  return {
    pathId: 'TRANSITION',
    label: 'Transition & Advance',
    tagline: 'Execute a structured exit to a better-fitting, lower-risk opportunity',
    feasibilityScore: groundedFeasibility,
    expectedValueScore: Math.round(groundedFeasibility * 0.5 + liquidity * 0.5),
    riskLevel,
    timelineWeeks: Math.round(WEEKS_HORIZON * (1 + (1 - groundedFeasibility / 100))),
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
      // Sole earner income-gap warning: if runway < search timeline AND user is sole earner,
      // an income gap is a household financial crisis, not just personal career inconvenience.
      ...(() => {
        const isSoleEarnerRisk = !!input.hasDependents && !input.dualIncomeHousehold;
        if (!isSoleEarnerRisk) return [];
        const searchWeeks = input.roleMarketDemand?.jobSearchRunwayWeeks ?? 12;
        const searchMonths = searchWeeks / 4.3;
        if (runway < searchMonths) {
          const gapMonths = Math.ceil(searchMonths - runway);
          return [
            `Sole earner household risk: ${runway}-month runway cannot cover a ${Math.round(searchMonths)}-month search — creates a ${gapMonths}-month income gap with dependents and no second household income. This is not a personal career inconvenience; it directly affects housing, healthcare, and dependent welfare. Bridge income or severance is not optional before transition.`,
          ];
        }
        return [
          `Sole earner: dependent household expenses (housing, healthcare, school fees) continue throughout the search regardless of your employment status — budget for these explicitly when planning your search timeline.`,
        ];
      })(),
      // Equity forfeiture cost: surface dollar amount or vest-months if equity is present.
      // This is the most financially significant cost of early transition that users routinely underestimate.
      ...(() => {
        if (!input.hasEquityVesting) return [];
        const vestMonths = input.equityVestMonths;
        const unvestedNow = input.exitTiming?.unvestedIfImmediateExit;
        if (unvestedNow != null && unvestedNow > 0 && vestMonths != null) {
          const unvestedK = unvestedNow >= 1000
            ? `$${Math.round(unvestedNow / 1000)}K`
            : `$${Math.round(unvestedNow)}`;
          const cliffDate = new Date(Date.now() + vestMonths * 30 * 24 * 60 * 60 * 1000)
            .toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          return [
            `Equity cost: transitioning now forfeits ${unvestedK} unvested equity — vest cliff is ${vestMonths} month${vestMonths !== 1 ? 's' : ''} away (${cliffDate}). If financially viable, waiting captures this before departure.`,
          ];
        }
        if (vestMonths != null && vestMonths < 12) {
          return [
            `Equity cost: you have unvested equity with a cliff ${vestMonths} month${vestMonths !== 1 ? 's' : ''} away — transitioning before then forfeits it. Quantify this before committing to a timeline.`,
          ];
        }
        if (input.hasEquityVesting) {
          return [`Equity cost: unvested equity is at risk if you transition before the next vest event — quantify the dollar amount with your equity portal or CFO team before committing to a timeline.`];
        }
        return [];
      })(),
    ],
    leverageFactors: [
      liquidity >= 60 ? 'Strong market demand for your role shortens expected search time' : 'Your role skills transfer to adjacent markets',
      (input.priorJobChanges ?? 0) >= 2 ? 'Prior job change experience means faster interview ramp' : 'Fresh perspective appealing to companies hiring for culture change',
    ],
    financialProjection: buildPathFinancialProjection('TRANSITION', input),
    feasibilityCalibrationStatus: 'developer_estimate',
    // TRANSITION feasibility source: use successRate12mPct from careerPathMarket when
    // available (market research, 2026 estimates) — this is the most honest available
    // grounding for "what % of people attempting this transition land a role in 12 months."
    // When unavailable, fall back to the model estimate and show as a range.
    ...(() => {
      const sr = input.transitionSuccessRate12mPct;
      if (sr != null && sr > 0) {
        // Market-research-sourced: show as point estimate with source label.
        // The feasibilityScore was already anchored to sr via the formula above;
        // we record the original sr for accurate attribution.
        return {
          feasibilitySource: 'market_successRate' as const,
          feasibilitySourceNote:
            `Source: careerPathMarket successRate12mPct (market research, 2026 estimates). ` +
            `${Math.round(sr)}% of people who attempt this transition land a comparable role within 12 months.`,
        };
      }
      // No market data — show range
      const { low, high } = estimatedRange(feasibility, FEASIBILITY_UNCERTAINTY.TRANSITION);
      return {
        feasibilitySource: 'estimated' as const,
        feasibilityRangeLow: low,
        feasibilityRangeHigh: high,
      };
    })(),
  };
}

function selectRecommendedPath(
  stayEV: number,
  negotiateEV: number,
  transitionEV: number,
  input: CareerContingencyInput,
): { path: ContingencyPathId; confidence: number } {
  // Goal alignment adds an EV bonus to the preferred path rather than
  // hardcoding a confidence value. This ensures runway, visa risk, and
  // market conditions still constrain the recommendation.
  const GOAL_BONUS = 8;
  let adjStayEV = stayEV;
  let adjNegEV  = negotiateEV;
  let adjTransEV = transitionEV;

  if (input.careerGoal === 'emergency_exit' || input.collapseStage === 3) {
    adjTransEV += GOAL_BONUS * 2;
  } else if (input.careerGoal === 'strategic_exit') {
    adjTransEV += GOAL_BONUS;
  } else if (input.careerGoal === 'stay_and_grow') {
    adjStayEV += GOAL_BONUS;
  } else if (input.careerGoal === 'explore') {
    adjNegEV += GOAL_BONUS;
  }

  // Imminent equity cliff bonus: when vest is ≤ 3 months, staying has concrete
  // financial upside that the EV formula cannot capture from feasibility alone.
  // This 15-pt bonus mirrors the computeStayFeasibility adjustment so the
  // recommendation selection is consistent with the feasibility scoring.
  if (input.hasEquityVesting && (input.equityVestMonths ?? 99) <= 3 && (input.equityVestMonths ?? 99) > 0) {
    adjStayEV += 15;
  }

  const scores = [
    { path: 'STAY' as ContingencyPathId, ev: adjStayEV },
    { path: 'NEGOTIATE' as ContingencyPathId, ev: adjNegEV },
    { path: 'TRANSITION' as ContingencyPathId, ev: adjTransEV },
  ].sort((a, b) => b.ev - a.ev);

  const winner = scores[0];
  const margin = winner.ev - scores[1].ev;
  // WS9 — both terms are DB-sourced uncalibrated placeholders. The
  // recalibrate cron will eventually replace them with regression on
  // (path-correctness vs margin) from user_prediction_outcomes. Until
  // then, the legacy 0.55 base + 0.30 max-margin-gain values are the
  // bootstrap fallbacks.
  const base       = getConstant<number>('careerContingencyPlanEngine.confidence.base', 0.55).value as number;
  const marginGain = getConstant<number>('careerContingencyPlanEngine.confidence.marginGain', 0.30).value as number;
  const confidence = base + Math.min(marginGain, margin / 100);

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
  // Equity vest context: when there's a near-term cliff, that is the primary
  // reason the STAY recommendation makes sense — surface it in the framework.
  const vestMonths = input.equityVestMonths;
  const unvestedNow = input.exitTiming?.unvestedIfImmediateExit;
  if (input.hasEquityVesting && vestMonths != null && vestMonths < 6) {
    if (unvestedNow != null && unvestedNow > 0) {
      const unvestedK = unvestedNow >= 1000
        ? `~$${Math.round(unvestedNow / 1000)}K`
        : `~$${Math.round(unvestedNow)}`;
      return `Stay feasibility: ${stayF}%. You have a ${vestMonths}-month vest cliff worth ${unvestedK} — this is the primary driver of the STAY recommendation. Hold through the vest event, then re-evaluate from a position of financial strength.`;
    }
    return `Stay feasibility: ${stayF}%. You have unvested equity vesting in ${vestMonths} month${vestMonths !== 1 ? 's' : ''} — this is the primary driver of the STAY recommendation. Hold through the vest event before committing to an exit decision.`;
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

  // Equity dilemma alert: elevated risk (≥ 60) + imminent vest (≤ 6 months) is a
  // conflicting situation — risk argues for leaving soon, vest argues for staying.
  // Surface as a prominent UI alert with an explicit day countdown so the user can
  // make the trade-off with eyes open rather than defaulting to either extreme.
  const equityDilemmaAlert: EquityDilemmaAlert | undefined = (() => {
    const vestMonths = input.equityVestMonths ?? 99;
    if (!input.hasEquityVesting || vestMonths > 6 || vestMonths <= 0) return undefined;
    if (input.currentScore < 60) return undefined;
    const daysToVest = Math.round(vestMonths * 30);
    const unvestedValue = input.exitTiming?.unvestedIfImmediateExit ?? null;
    const unvestedLabel = unvestedValue != null && unvestedValue > 0
      ? (unvestedValue >= 1_000
          ? `~$${Math.round(unvestedValue / 1_000)}K`
          : `~$${Math.round(unvestedValue)}`)
      : null;
    const vestLabel = `${daysToVest} days (${vestMonths} month${vestMonths !== 1 ? 's' : ''})`;
    const alertText = unvestedLabel
      ? `Conflicting signals: your risk score (${input.currentScore}/100) argues for an early exit, but your equity cliff is ${vestLabel} away — worth ${unvestedLabel} in unvested value. Recommended approach: begin your job search now, but plan to stay ${vestLabel} to capture the vest. Do not accept an offer with a start date before the vest event unless the offer includes equity compensation to cover the forfeiture.`
      : `Conflicting signals: your risk score (${input.currentScore}/100) argues for an early exit, but your equity cliff is ${vestLabel} away. Recommended approach: begin your job search now, but target a start date after the vest event. Accept offers only if the role compensates for forfeited equity.`;
    return { isActive: true, daysToVest, dayCountdown: daysToVest, unvestedValue, alertText };
  })();

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
    ...(equityDilemmaAlert ? { equityDilemmaAlert } : {}),
  };
}
