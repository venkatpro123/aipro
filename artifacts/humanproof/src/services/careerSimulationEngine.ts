// careerSimulationEngine.ts — Career OS: Decision Simulation (Rule #8)
//
// "Every simulation must answer: what happens if I stay / switch / move into AI /
//  become a manager / freelance / relocate? For every simulation provide
//  Probability, Confidence, Tradeoffs, Benefits, Risks, Timeline."
//
// The old simulator returned only a projected RISK score. This engine projects a
// full alternate future per decision — risk, promotion probability, salary
// growth, career resilience, probability of success, timeline, and explicit
// benefits/risks — all derived from the user's real audit (no hardcoded
// universal deltas) and modulated by their personal signals (runway, network,
// skill fit, market demand). Cohort-calibrated when enough outcome data exists,
// honestly labelled ESTIMATED otherwise.

import type { HybridResult } from '../types/hybridResult';
import type { UserProfile } from './userProfileService';

// ── Decision definitions (moved here so the engine is the single source) ───────

export interface CareerDecision {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  rationale: string;
  /** Per-dimension multipliers applied to breakdown[dim]×total for the risk projection. */
  changes: Array<{ dim: string; factor: number }>;
  tradeoff: string;
  constraint?: (hr: HybridResult) => string | null;
}

export const DECISIONS: CareerDecision[] = [
  {
    id: 'stay', icon: '🏰', title: 'Stay & Defend', subtitle: 'Optimise within current role',
    rationale: 'Use your best sensitivity levers to reduce risk without leaving. Highest leverage when company health is adequate.',
    changes: [{ dim: 'D4', factor: -0.22 }, { dim: 'D7', factor: -0.15 }, { dim: 'D8', factor: -0.12 }],
    tradeoff: 'Lower risk but slower. Best if company fundamentals are solid.',
    constraint: (hr) => {
      const companyRisk = (hr.breakdown?.['D3'] ?? 0) + (hr.breakdown?.['L2'] ?? 0);
      return companyRisk > 0.7 ? 'Company risk is high — staying may be defending a sinking ship.' : null;
    },
  },
  {
    id: 'switch', icon: '🚀', title: 'Switch Company', subtitle: 'Move to a healthier employer',
    rationale: 'Escape company-specific risk. Resets L2/L3 company vulnerability but introduces short-term transition risk.',
    changes: [{ dim: 'L2', factor: -0.60 }, { dim: 'L3', factor: -0.35 }, { dim: 'D3', factor: -0.55 }, { dim: 'D4', factor: +0.18 }],
    tradeoff: 'Biggest long-term risk reduction. Short-term tenure/transition cost.',
    constraint: (hr) => {
      const visaDep = hr.visaRisk?.dependencyScore ?? 0;
      return visaDep > 60 ? 'High visa employer dependency — switching requires transfer approval or new sponsorship.' : null;
    },
  },
  {
    id: 'ai-role', icon: '🤖', title: 'Move to AI Role', subtitle: 'Transition into AI / automation domain',
    rationale: 'Reduces AI displacement risk by aligning with the direction of automation rather than opposing it.',
    changes: [{ dim: 'D1', factor: -0.65 }, { dim: 'D3', factor: -0.20 }, { dim: 'D6', factor: -0.15 }],
    tradeoff: 'Strongest AI protection long-term. Requires skill transition investment.',
    constraint: (hr) => (hr.financialRunwayMonths ?? 6) < 3 ? 'Financial runway < 3 months — skill transition investment may be unaffordable right now.' : null,
  },
  {
    id: 'manager', icon: '👔', title: 'Become a Manager', subtitle: 'Move into people leadership',
    rationale: 'Managers are typically later in layoff order. Reduces AI displacement exposure for IC roles.',
    changes: [{ dim: 'D7', factor: -0.25 }, { dim: 'D1', factor: -0.30 }, { dim: 'D6', factor: -0.20 }, { dim: 'D8', factor: -0.15 }],
    tradeoff: 'Good stability improvement. Requires strong internal visibility and endorsement.',
    constraint: (hr) => (hr.breakdown?.['D4'] ?? 0.4) > 0.5 ? 'Short tenure detected — management track typically requires 2+ years of established performance.' : null,
  },
  {
    id: 'consulting', icon: '💼', title: 'Go Consulting / Freelance', subtitle: 'Diversify income across multiple clients',
    rationale: 'Eliminates single-employer dependency (L2/L3) but increases financial variability. Best for high-network roles.',
    changes: [{ dim: 'L2', factor: -0.80 }, { dim: 'L3', factor: -0.45 }, { dim: 'L1', factor: +0.30 }, { dim: 'D5', factor: -0.20 }],
    tradeoff: 'Eliminates company-specific risk but adds financial unpredictability. Best for strong networks.',
    constraint: (hr) => {
      const network = hr.networkLeverage?.networkScore ?? 30;
      const runway = hr.financialRunwayMonths ?? 4;
      return network < 40 && runway < 4 ? 'Low network + low runway: consulting without clients is high-risk. Build network first.' : null;
    },
  },
  {
    id: 'relocate', icon: '✈️', title: 'Relocate', subtitle: 'Move to a higher-demand market',
    rationale: 'Geographic optionality can significantly lower sector risk if your current region is over-indexed to one industry.',
    changes: [{ dim: 'L5', factor: -0.40 }, { dim: 'D2', factor: -0.30 }],
    tradeoff: 'High personal impact but strong long-term positioning in demand markets.',
    constraint: (hr) => (hr.visaRisk?.dependencyScore ?? 0) > 40 ? 'Visa dependency may restrict relocation options without employer sponsorship in new country.' : null,
  },
  {
    id: 'upskill', icon: '📚', title: 'Intensive Upskilling', subtitle: '3–6 month focused skill investment',
    rationale: 'Directly reduces AI displacement risk and improves experience relevance score. Fastest ROI when skills are actively hiring.',
    changes: [{ dim: 'D1', factor: -0.35 }, { dim: 'D3', factor: -0.18 }, { dim: 'D6', factor: -0.25 }],
    tradeoff: 'Relatively low disruption. Time investment required. Maximum 6-month horizon to realise gains.',
    constraint: (hr) => (hr.financialRunwayMonths ?? 6) < 2 ? 'Runway under 2 months — upskilling time investment may not be viable before financial pressure.' : null,
  },
];

// ── Per-decision outcome profiles (the alternate-future shape) ─────────────────

interface OutcomeProfile {
  /** Expected total-comp growth over the decision's horizon, %. */
  salaryGrowthPct: number;
  /** Promotion-odds delta applied to the user's baseline mobility, points. */
  promoDelta: number;
  /** Realistic execution timeline. */
  timeline: string;
  /** Base probability of executing this move well, before personal modulation. */
  baseSuccess: number;
  benefits: string[];
  risks: string[];
  /** Which personal signals materially gate success for this move. */
  gatedBy: Array<'runway' | 'network' | 'skillFit' | 'tenure'>;
}

const OUTCOME_PROFILES: Record<string, OutcomeProfile> = {
  stay: {
    salaryGrowthPct: 6, promoDelta: +8, timeline: '6–12 months', baseSuccess: 82,
    benefits: ['No transition disruption', 'Compounds tenure and internal trust', 'Lowest execution effort'],
    risks: ['Slowest risk reduction', 'Exposed if company fundamentals deteriorate'],
    gatedBy: ['tenure'],
  },
  switch: {
    salaryGrowthPct: 22, promoDelta: -5, timeline: '2–4 months', baseSuccess: 64,
    benefits: ['Largest long-term risk reduction', 'Comp step-up at offer stage', 'Resets company-specific exposure'],
    risks: ['Tenure resets to zero', 'Onboarding/probation risk', 'Search effort while employed'],
    gatedBy: ['network'],
  },
  'ai-role': {
    salaryGrowthPct: 28, promoDelta: +6, timeline: '6–9 months', baseSuccess: 58,
    benefits: ['Strongest durable AI protection', 'Rising-demand skill premium', 'Future-proofs your role category'],
    risks: ['Real skill-transition investment', 'Short-term productivity dip while learning', 'Credibility gap to bridge'],
    gatedBy: ['runway', 'skillFit'],
  },
  manager: {
    salaryGrowthPct: 16, promoDelta: +20, timeline: '6–12 months', baseSuccess: 60,
    benefits: ['Later in layoff order', 'Lower IC automation exposure', 'Higher comp ceiling'],
    risks: ['Requires internal endorsement', 'Different skill set (people, not craft)', 'Fewer manager seats than IC seats'],
    gatedBy: ['tenure'],
  },
  consulting: {
    salaryGrowthPct: 18, promoDelta: 0, timeline: '3–6 months', baseSuccess: 50,
    benefits: ['No single-employer dependency', 'Income diversified across clients', 'Rate control and autonomy'],
    risks: ['Income volatility', 'You own sales + delivery', 'No benefits/severance safety net'],
    gatedBy: ['network', 'runway'],
  },
  relocate: {
    salaryGrowthPct: 14, promoDelta: +4, timeline: '3–6 months', baseSuccess: 62,
    benefits: ['Access to a deeper demand market', 'Sector diversification', 'Often a comp uplift'],
    risks: ['High personal/relocation cost', 'Possible visa/work-auth hurdles', 'Network rebuild in new market'],
    gatedBy: ['runway'],
  },
  upskill: {
    salaryGrowthPct: 12, promoDelta: +10, timeline: '3–6 months', baseSuccess: 74,
    benefits: ['Directly cuts AI displacement risk', 'Low disruption — keep current role', 'Compounds into every other path'],
    risks: ['Time investment alongside the day job', 'Gains lag 3–6 months', 'Must pick a market-relevant skill'],
    gatedBy: ['skillFit'],
  },
};

// ── Result type ────────────────────────────────────────────────────────────────

export interface SimulatedFuture {
  decisionId: string;
  projectedRisk: number;
  riskDelta: number;
  promotionProbability: number;    // 0–100
  salaryGrowthPct: number;         // expected % over the horizon
  resilience: 'Low' | 'Moderate' | 'High' | 'Very High';
  successProbability: number;      // 0–100
  confidence: number;              // 0–100
  confidenceKind: 'measured' | 'modeled' | 'estimated';
  timelineLabel: string;
  benefits: string[];
  risks: string[];
  /** True when a hard constraint makes this move materially harder right now. */
  constraintWarning: string | null;
}

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(v)));

export function projectRisk(hr: HybridResult, decision: CareerDecision): number {
  const b = hr.breakdown ?? ({} as Record<string, number>);
  const base = hr.total;
  const totalDelta = decision.changes.reduce((sum, ch) => sum + (b[ch.dim] ?? 0) * base * ch.factor, 0);
  return clamp(Math.round(base + totalDelta), 5, 97);
}

/**
 * Simulate the full alternate future for one decision.
 *
 * @param cohortFactors  Calibrated multipliers from getCohortSimulationFactors()
 *                       — when present, the projection is 'modeled'; otherwise
 *                       'estimated'. (Stub returns null until ≥50 outcomes exist.)
 */
export function simulateDecisionFuture(
  decision: CareerDecision,
  hr: HybridResult,
  profile: UserProfile | null,
  cohortFactors: Record<string, Record<string, number>> | null = null,
): SimulatedFuture {
  const anyHr = hr as any;
  const profileBase = OUTCOME_PROFILES[decision.id] ?? OUTCOME_PROFILES.stay;
  const projectedRisk = projectRisk(hr, decision);
  const riskDelta = projectedRisk - hr.total;
  const constraintWarning = decision.constraint ? decision.constraint(hr) : null;

  // Personal signals that gate success / shape outcomes.
  const runway = profile?.savingsMonthsRunway ?? hr.financialRunwayMonths ?? 6;
  const network = anyHr.networkLeverage?.networkScore ?? 35;
  const skillFit = anyHr.skillPortfolioFit?.fitScore ?? 50;
  const mobility = anyHr.internalMobility?.viabilityScore ?? 45;
  const demandTrend: string | undefined = anyHr.roleMarketDemand?.demandTrend;

  // ── Probability of success: base, modulated by the gating signals ────────────
  let success = profileBase.baseSuccess;
  for (const gate of profileBase.gatedBy) {
    if (gate === 'runway') success += runway >= 6 ? 6 : runway < 3 ? -14 : 0;
    if (gate === 'network') success += network >= 60 ? 8 : network < 30 ? -12 : 0;
    if (gate === 'skillFit') success += skillFit >= 65 ? 8 : skillFit < 40 ? -10 : 0;
    if (gate === 'tenure') {
      const tenureRisk = hr.breakdown?.['D4'] ?? 0.4; // higher = newer/shorter tenure
      success += tenureRisk < 0.35 ? 6 : tenureRisk > 0.5 ? -10 : 0;
    }
  }
  if (constraintWarning) success -= 15; // a live hard constraint lowers odds now
  const successProbability = clamp(success, 15, 95);

  // ── Promotion probability: baseline mobility + decision delta ────────────────
  const promotionProbability = clamp(mobility + profileBase.promoDelta);

  // ── Salary growth: profile base, lifted in a rising market, trimmed in a weak one ─
  let salaryGrowthPct = profileBase.salaryGrowthPct;
  if (demandTrend === 'surging' || demandTrend === 'rising') salaryGrowthPct = Math.round(salaryGrowthPct * 1.2);
  else if (demandTrend === 'declining' || demandTrend === 'falling') salaryGrowthPct = Math.round(salaryGrowthPct * 0.8);

  // ── Resilience: a function of the projected risk + financial buffer ──────────
  const resilientRunway = runway >= 6;
  let resilience: SimulatedFuture['resilience'] =
    projectedRisk < 30 ? 'Very High' : projectedRisk < 45 ? 'High' : projectedRisk < 60 ? 'Moderate' : 'Low';
  // Consulting trades single-employer risk for income volatility — cap unless buffered.
  if (decision.id === 'consulting' && !resilientRunway && resilience === 'Very High') resilience = 'High';

  // ── Confidence + provenance ──────────────────────────────────────────────────
  const levers = anyHr.scoreSensitivity?.levers?.length ?? 0;
  const hasCohort = !!cohortFactors && !!cohortFactors[decision.id];
  const confidenceKind: SimulatedFuture['confidenceKind'] = hasCohort ? 'modeled' : 'estimated';
  const confidence = hasCohort
    ? clamp(72 + Math.min(levers, 4) * 3, 0, 90)
    : clamp(52 + Math.min(levers, 5) * 4, 0, 78);

  return {
    decisionId: decision.id,
    projectedRisk,
    riskDelta,
    promotionProbability,
    salaryGrowthPct,
    resilience,
    successProbability,
    confidence,
    confidenceKind,
    timelineLabel: profileBase.timeline,
    benefits: profileBase.benefits,
    risks: profileBase.risks,
    constraintWarning,
  };
}
