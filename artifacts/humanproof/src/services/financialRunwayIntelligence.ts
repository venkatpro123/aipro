// financialRunwayIntelligence.ts
// Intelligence Upgrade v10.0 — Financial Runway Intelligence Layer
//
// PROBLEM THIS SOLVES:
//   The system advises "start networking now" regardless of whether the user has
//   2 months of savings or 18 months. A user with 2 months runway needs emergency mode;
//   a user with 18 months can invest in upskilling. Same advice = wrong advice.
//
// DESIGN:
//   Takes financial runway (months of expenses covered) and produces a personalized
//   strategy: which escape paths are feasible, optimal search timeline, urgency tier,
//   and the exact sequence of moves given constraints.
//
//   Zero API calls. Deterministic. Runs after escape paths and job market liquidity
//   are computed so it can reference those results.
//
// RUNWAY TIERS:
//   Critical   < 3 months  — Emergency mode: immediate company switch, no time to upskill
//   Elevated   3–6 months  — Parallel search while staying employed: target quick wins
//   Comfortable 6–12 months — Can invest in one skill pivot before switching
//   Strong     12+ months  — Can pursue calculated risks (salary negotiation, upskill-first)

import type { EscapePathReport, EscapePathType } from './escapePathOptimizer';
import type { JobMarketLiquidityResult } from './jobMarketLiquidityService';
import { computeGratuity, type GratuityCalculation } from '../data/endOfServiceGratuity';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type RunwayTier = 'critical' | 'elevated' | 'comfortable' | 'strong';

export type SearchStrategy =
  | 'immediate_switch'       // Critical: switch NOW, any comparable role
  | 'parallel_search'        // Elevated: search while employed, 60-day target
  | 'upskill_then_switch'    // Comfortable: 90-day skill pivot, then targeted switch
  | 'optimize_in_place';     // Strong: negotiate + selectively target stretch roles

export interface RunwayConstraint {
  pathType: EscapePathType;
  isFeasible: boolean;
  reason: string;                  // why this path is/isn't feasible given runway
  adjustedTimeToImpact?: string;   // runway-constrained version of path's timeToImpact
}

export interface RunwayMoveSequence {
  step: number;
  action: string;
  timeframe: string;
  priority: 'must_do' | 'should_do' | 'nice_to_have';
  runwayConsumedMonths: number;    // month offset at which this step occurs in the search timeline
                                   // (NOT cumulative — parallel steps share the same month offset)
}

export interface FinancialRunwayResult {
  // ── Core assessment ──────────────────────────────────────────────────────────
  /** Effective runway = savedMonths + gratuityMonths (for MENA users) or savedMonths only.
   *  This is the value the tier/strategy/urgency are computed from. */
  runwayMonths: number;
  /** User-reported savings runway (months of expenses covered by liquid savings). */
  savedRunwayMonths: number;
  /** End-of-service gratuity buffer in months of total pay (0 when no MENA regime applies).
   *  UAE: 21 days/yr first 5 + 30 days/yr thereafter (capped at 2yr).
   *  Saudi: 15 days/yr first 5 + 30 days/yr thereafter. Etc. */
  gratuityMonths: number;
  /** Gratuity disclosure narrative (when gratuityMonths > 0). */
  gratuityDisclosure?: string;
  /** ISO country code that produced the gratuity calculation (AE, SA, QA, BH, OM, KW). */
  gratuityCountryCode?: string;
  /** Full panel narrative: "Your N-year UAE tenure includes approximately X.X months of accrued
   *  end-of-service gratuity ... Effective runway: saved + gratuity = total months." MODELED. */
  gratuityNarrative?: string;
  tier: RunwayTier;
  tierLabel: string;
  urgencyModifier: number;         // multiplier on action deadlines (Critical: 0.5×, Strong: 2.0×)

  // ── Strategy ─────────────────────────────────────────────────────────────────
  recommendedStrategy: SearchStrategy;
  strategyLabel: string;
  strategyRationale: string;       // 2 sentences, data-specific

  // ── Search budget ─────────────────────────────────────────────────────────────
  safeSearchMonths: number;        // months you can search before runway is critical
  effectiveSearchDeadline: string; // human-readable deadline (e.g. "You must land an offer by Month 4")
  salaryNegotiationLeverage: 'high' | 'medium' | 'low'; // runway → negotiation power

  // ── Feasibility filter ────────────────────────────────────────────────────────
  pathConstraints: RunwayConstraint[];   // which escape paths are viable given runway

  // ── Optimal move sequence ─────────────────────────────────────────────────────
  optimalSequence: RunwayMoveSequence[]; // exactly what to do, in order, given constraints

  // ── Risk amplification ────────────────────────────────────────────────────────
  runwayRiskScore: number;        // 0–100: combined job-risk × runway-pressure
  runwayRiskLabel: string;        // human label for the combined risk
  criticalThresholdDate: string;  // when runway hits critical level (ISO string)

  // ── Insight sentence ─────────────────────────────────────────────────────────
  keyInsight: string;              // one-sentence personalized insight
}

// ─── Internal constants ────────────────────────────────────────────────────────

const TIER_CONFIG: Record<RunwayTier, {
  label: string;
  urgencyModifier: number;
  strategy: SearchStrategy;
  strategyLabel: string;
  negotiationLeverage: 'high' | 'medium' | 'low';
}> = {
  critical: {
    label: 'Critical — under 3 months',
    urgencyModifier: 0.5,
    strategy: 'immediate_switch',
    strategyLabel: 'Immediate Company Switch',
    negotiationLeverage: 'low',
  },
  elevated: {
    label: 'Elevated — 3–6 months',
    urgencyModifier: 0.75,
    strategy: 'parallel_search',
    strategyLabel: 'Parallel Search (Employed)',
    negotiationLeverage: 'medium',
  },
  comfortable: {
    label: 'Comfortable — 6–12 months',
    urgencyModifier: 1.0,
    strategy: 'upskill_then_switch',
    strategyLabel: 'Skill-Pivot + Targeted Switch',
    negotiationLeverage: 'medium',
  },
  strong: {
    label: 'Strong — 12+ months',
    urgencyModifier: 1.5,
    strategy: 'optimize_in_place',
    strategyLabel: 'Strategic Optimization',
    negotiationLeverage: 'high',
  },
};

// Escape path types that require long timelines (3+ months) — infeasible for critical runway
const SLOW_PATH_TYPES: EscapePathType[] = ['seniority_advance', 'skill_deepening'];
const MEDIUM_PATH_TYPES: EscapePathType[] = ['role_pivot', 'industry_shift', 'ai_augmentation', 'location_shift'];

// ─── Helpers ────────────────────────────────────────────────────────────────────

function resolveRunwayTier(months: number): RunwayTier {
  if (months < 3) return 'critical';
  if (months < 6) return 'elevated';
  if (months < 12) return 'comfortable';
  return 'strong';
}

function computeSafeSearchMonths(runwayMonths: number): number {
  // Keep 2 months as emergency buffer; the rest is searchable time
  const EMERGENCY_BUFFER = 2;
  const safeMonths = Math.max(0, runwayMonths - EMERGENCY_BUFFER);
  // But also cap at 6 months — searching for longer than 6 months usually signals a mismatch
  return Math.min(safeMonths, 6);
}

function computeCriticalThresholdDate(runwayMonths: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + runwayMonths);
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

function buildPathConstraints(
  tier: RunwayTier,
  escapePaths?: EscapePathReport,
): RunwayConstraint[] {
  const pathTypes: EscapePathType[] = escapePaths
    ? escapePaths.paths.map(p => p.type)
    : ['company_switch', 'role_pivot', 'ai_augmentation', 'skill_deepening', 'seniority_advance', 'industry_shift', 'location_shift'];

  return pathTypes.map(pt => {
    const isSlow = SLOW_PATH_TYPES.includes(pt);
    const isMedium = MEDIUM_PATH_TYPES.includes(pt);

    if (tier === 'critical') {
      if (isSlow) return {
        pathType: pt,
        isFeasible: false,
        reason: 'Requires 60–90 days minimum — your 3-month runway does not allow this without financial distress.',
      };
      if (isMedium) return {
        pathType: pt,
        isFeasible: true,
        reason: 'Feasible if pursued while employed. Do not quit before an offer is in hand.',
        adjustedTimeToImpact: '30–45 days (accelerated)',
      };
      return {
        pathType: pt,
        isFeasible: true,
        reason: 'Highest priority — fastest path to financial safety.',
        adjustedTimeToImpact: '2–4 weeks',
      };
    }

    if (tier === 'elevated') {
      if (pt === 'seniority_advance') return {
        pathType: pt,
        isFeasible: false,
        reason: 'Seniority advancement typically takes 3–6 months — risk of runway exhausting before impact.',
      };
      return {
        pathType: pt,
        isFeasible: true,
        reason: isSlow
          ? 'Feasible if started immediately. Budget 60 days maximum, then switch focus to job applications.'
          : 'Feasible in parallel with job search.',
        adjustedTimeToImpact: isSlow ? '60 days (runway-adjusted)' : undefined,
      };
    }

    // Comfortable / Strong: all paths feasible
    return {
      pathType: pt,
      isFeasible: true,
      reason: 'Runway is sufficient for this path without financial pressure.',
    };
  });
}

function buildOptimalSequence(
  tier: RunwayTier,
  runwayMonths: number,
  currentScore: number,
  jobMarketLiquidity?: JobMarketLiquidityResult,
): RunwayMoveSequence[] {
  const reEmployMonths = jobMarketLiquidity?.monthsToReemploy ?? 4;

  if (tier === 'critical') {
    return [
      {
        step: 1,
        action: 'Update LinkedIn to "Open to Work" (recruiter-visible only) TODAY',
        timeframe: 'Day 1',
        priority: 'must_do',
        runwayConsumedMonths: 0,
      },
      {
        step: 2,
        action: 'Contact 3 recruiters in your domain — one call each. Do not apply cold.',
        timeframe: 'Days 2–5',
        priority: 'must_do',
        runwayConsumedMonths: 0.2,
      },
      {
        step: 3,
        action: `Apply to ${Math.max(5, Math.ceil(15 / reEmployMonths))} roles at companies with strong financial health (>20% revenue growth, no layoff history). Volume matters now.`,
        timeframe: 'Week 1–2',
        priority: 'must_do',
        runwayConsumedMonths: 0.5,
      },
      {
        step: 4,
        action: 'Accept ANY comparable offer that arrives before runway hits 1 month. This is not the time to negotiate hard.',
        timeframe: 'Within 6 weeks',
        priority: 'must_do',
        runwayConsumedMonths: 1.5,
      },
    ];
  }

  if (tier === 'elevated') {
    return [
      {
        step: 1,
        action: 'Activate recruiter network this week — 2 introductory calls minimum.',
        timeframe: 'Week 1',
        priority: 'must_do',
        runwayConsumedMonths: 0.25,
      },
      {
        step: 2,
        action: 'Complete one AI skill certification (GitHub Copilot, Claude API basics, or domain-equivalent) in parallel with job search.',
        timeframe: 'Weeks 2–4',
        priority: 'should_do',
        runwayConsumedMonths: 1,
      },
      {
        step: 3,
        action: `Target 8–10 role applications at companies with healthy financials. Aim for 2 first-round interviews by Day 30.`,
        timeframe: 'Month 1',
        priority: 'must_do',
        runwayConsumedMonths: 1,
      },
      {
        step: 4,
        action: 'Evaluate any offer within 10% of current compensation. With runway under 6 months, lateral moves beat extended search.',
        timeframe: 'Month 2',
        priority: 'should_do',
        runwayConsumedMonths: 2,
      },
      {
        step: 5,
        action: `If no offer by month ${Math.min(3, Math.max(1, runwayMonths - 1))}, escalate to 15+ applications/week and expand target companies to include mid-size firms. This is the escalation trigger before runway hits the critical buffer.`,
        timeframe: `Month ${Math.min(3, Math.max(1, runwayMonths - 1))}`,
        priority: 'must_do',
        runwayConsumedMonths: Math.min(3, Math.max(1, runwayMonths - 1)),
      },
    ];
  }

  if (tier === 'comfortable') {
    return [
      {
        step: 1,
        action: 'Invest 4 weeks in one high-value skill that directly addresses your #1 risk dimension.',
        timeframe: 'Month 1',
        priority: 'should_do',
        runwayConsumedMonths: 1,
      },
      {
        step: 2,
        action: 'Begin targeted job search in Month 2 — 5 applications/week at stretch-level companies.',
        timeframe: 'Month 2',
        priority: 'should_do',
        runwayConsumedMonths: 2,
      },
      {
        step: 3,
        action: 'Negotiate: with 6–12 months runway, you can hold out for a role that is 10–20% above current compensation.',
        timeframe: 'Month 2–4',
        priority: 'nice_to_have',
        runwayConsumedMonths: 4,
      },
      {
        step: 4,
        action: 'Maintain emergency floor: keep 3 months of savings untouched. Do not dip into the buffer until truly necessary.',
        timeframe: 'Ongoing',
        priority: 'must_do',
        runwayConsumedMonths: runwayMonths,
      },
    ];
  }

  // Strong (12+ months)
  return [
    {
      step: 1,
      action: 'Invest in the escape path with the highest score reduction (regardless of effort level) — you have time for the high-effort, high-reward move.',
      timeframe: 'Months 1–3',
      priority: 'should_do',
      runwayConsumedMonths: 3,
    },
    {
      step: 2,
      action: 'Build public evidence: contribute to open source, publish one analysis, or speak at one industry event. This shifts your market value tier.',
      timeframe: 'Months 2–4',
      priority: 'nice_to_have',
      runwayConsumedMonths: 4,
    },
    {
      step: 3,
      action: 'Target roles 15–25% above current comp. With 12+ months runway you can hold out for the right offer.',
      timeframe: 'Months 3–6',
      priority: 'should_do',
      runwayConsumedMonths: 6,
    },
    {
      step: 4,
      action: 'Evaluate equity and growth trajectory, not just base salary — your runway gives you leverage to optimize for 5-year trajectory, not just immediate cash.',
      timeframe: 'Ongoing',
      priority: 'nice_to_have',
      runwayConsumedMonths: runwayMonths,
    },
  ];
}

function buildStrategyRationale(
  tier: RunwayTier,
  runwayMonths: number,
  currentScore: number,
  reEmployMonths: number,
): string {
  const gap = runwayMonths - reEmployMonths;

  if (tier === 'critical') {
    return `With ${runwayMonths} months of runway and an estimated re-employment time of ${reEmployMonths} months, you have ${gap > 0 ? `a ${gap}-month buffer` : 'virtually no buffer'} before financial distress. Every decision must optimize for speed-to-offer, not role quality — lateral or even slightly lateral moves are correct here. ${currentScore >= 65 ? 'Your layoff risk score (high) makes the urgency asymmetric: the cost of waiting exceeds the benefit of being selective.' : ''}`;
  }

  if (tier === 'elevated') {
    return `${runwayMonths} months of runway covers an estimated ${reEmployMonths}-month re-employment timeline with a ${Math.max(0, runwayMonths - reEmployMonths)}-month margin. The optimal strategy is parallel search — stay employed while building pipeline, so you negotiate from a position of employment rather than urgency. ${currentScore >= 55 ? 'Given your elevated risk score, activating the search now (not in 2 months) preserves this advantage.' : ''}`;
  }

  if (tier === 'comfortable') {
    return `With ${runwayMonths} months of runway, you have time to invest in one targeted skill improvement before switching — which typically improves offer quality by 15–25% vs. switching without upskilling. The optimal sequence: invest 4 weeks in your highest-leverage skill, then begin targeted applications, targeting roles 10–15% above current compensation.`;
  }

  return `${runwayMonths} months of runway gives you full optionality — you can pursue the highest-impact escape path regardless of effort level, hold out for stretch compensation, and build the public portfolio artifacts that shift your market value tier. This is the position where proactive action creates compounding returns rather than reactive moves.`;
}

function computeRunwayRiskScore(
  currentScore: number,
  runwayMonths: number,
  jobMarketLiquidity?: JobMarketLiquidityResult,
): number {
  const reEmployMonths = jobMarketLiquidity?.monthsToReemploy ?? 4;
  // Gap risk: how many months short of covering the search?
  const gapRisk = Math.max(0, reEmployMonths - runwayMonths) / reEmployMonths;
  // Combine: 70% job risk score + 30% runway gap pressure
  return Math.min(100, Math.round(currentScore * 0.7 + gapRisk * 100 * 0.3));
}

// ─── Main entry point ──────────────────────────────────────────────────────────

export interface FinancialRunwayInputs {
  financialRunwayMonths: number;   // user-reported months of expenses covered by savings (0 = unknown, defaults to 6)
  currentScore: number;
  escapePaths?: EscapePathReport;
  jobMarketLiquidity?: JobMarketLiquidityResult;
  /** ISO country code (AE, SA, QA, BH, OM, KW for MENA gratuity computation).
   *  When present + tenureYears provided, end-of-service gratuity is added to the
   *  effective runway used for tier classification. */
  countryCode?: string;
  /** Tenure in years at current employer — required for gratuity calculation. */
  tenureYears?: number;
}

export function computeFinancialRunway(inputs: FinancialRunwayInputs): FinancialRunwayResult {
  const {
    currentScore,
    escapePaths,
    jobMarketLiquidity,
    countryCode,
    tenureYears,
  } = inputs;

  // User-reported savings runway. Default to 6 months when not provided (industry median).
  const savedRunwayMonths = inputs.financialRunwayMonths > 0 ? inputs.financialRunwayMonths : 6;

  // MENA end-of-service gratuity: adds months of effective runway at termination.
  // A 7-year UAE employee accrues 165 days basic salary (≈5.5mo basic × 0.75 =
  // ≈4.1mo total-pay effective) — previously invisible to urgency tier classification.
  const gratuityCalc: GratuityCalculation | null = (countryCode && tenureYears != null && tenureYears > 0)
    ? computeGratuity(countryCode, tenureYears)
    : null;
  const gratuityMonths = gratuityCalc?.effectiveBufferMonths ?? 0;

  // Build panel narrative so the UI can render the statutory breakdown verbatim.
  const COUNTRY_DISPLAY: Record<string, string> = {
    AE: 'UAE', SA: 'Saudi Arabia', QA: 'Qatar', BH: 'Bahrain', OM: 'Oman', KW: 'Kuwait',
  };
  let gratuityNarrative: string | undefined;
  if (gratuityCalc && gratuityMonths > 0 && tenureYears != null) {
    const cName = COUNTRY_DISPLAY[gratuityCalc.countryCode] ?? gratuityCalc.countryName;
    const tierDesc = tenureYears <= 5
      ? `21 days/year × ${tenureYears} year${tenureYears !== 1 ? 's' : ''}`
      : `21 days/year × 5 years + 30 days/year × ${(tenureYears - 5).toFixed(1)} years`;
    gratuityNarrative =
      `Your ${tenureYears}-year ${cName} tenure includes approximately ${gratuityMonths.toFixed(1)} months ` +
      `of accrued end-of-service gratuity (${tierDesc}). ` +
      `Effective runway: ${savedRunwayMonths} + ${gratuityMonths.toFixed(1)} = ${(savedRunwayMonths + gratuityMonths).toFixed(1)} months. ` +
      `This is a legally guaranteed payment upon termination.`;
  }

  // Effective runway folds gratuity into the urgency calculation.
  // A 4-month-savings UAE employee with 7 years tenure (≈4.1 months gratuity effective)
  // has effective runway 8.1 months → "comfortable" tier, NOT "critical".
  const runwayMonths = savedRunwayMonths + gratuityMonths;

  const tier = resolveRunwayTier(runwayMonths);
  const cfg = TIER_CONFIG[tier];
  const reEmployMonths = jobMarketLiquidity?.monthsToReemploy ?? 4;
  const safeSearchMonths = computeSafeSearchMonths(runwayMonths);

  const pathConstraints = buildPathConstraints(tier, escapePaths);
  const optimalSequence = buildOptimalSequence(tier, runwayMonths, currentScore, jobMarketLiquidity);
  const runwayRiskScore = computeRunwayRiskScore(currentScore, runwayMonths, jobMarketLiquidity);

  const runwayRiskLabel = runwayRiskScore >= 75 ? 'Critical combined risk'
    : runwayRiskScore >= 55 ? 'High combined risk'
    : runwayRiskScore >= 35 ? 'Elevated combined risk'
    : 'Manageable combined risk';

  const effectiveSearchDeadline = safeSearchMonths <= 1
    ? 'You must secure an offer within 4 weeks'
    : safeSearchMonths <= 3
      ? `You must secure an offer within ${safeSearchMonths} months`
      : `You have up to ${safeSearchMonths} months to find the right role`;

  const keyInsight = tier === 'critical'
    ? `At ${runwayMonths} months runway vs. ${reEmployMonths} months to re-employ, you are in financial sprint mode — the next offer you receive may be the right one to take.`
    : tier === 'elevated'
      ? `Your ${runwayMonths}-month runway gives you just enough time for a deliberate parallel search — stay employed while building pipeline and the employment status itself is a negotiating advantage.`
      : tier === 'comfortable'
        ? `With ${runwayMonths} months of runway, you can afford a 4-week skill investment that will lift your offer quality by 15–25% before switching — the math favors upskilling before switching.`
        : `Your ${runwayMonths}-month runway is the single most underutilized career asset — use it to pursue the highest-impact move (even high-effort ones), not the fastest-available move.`;

  return {
    runwayMonths,
    savedRunwayMonths,
    gratuityMonths,
    gratuityDisclosure: gratuityCalc?.disclosureText,
    gratuityCountryCode: gratuityCalc?.countryCode,
    gratuityNarrative,
    tier,
    tierLabel: cfg.label,
    urgencyModifier: cfg.urgencyModifier,
    recommendedStrategy: cfg.strategy,
    strategyLabel: cfg.strategyLabel,
    strategyRationale: buildStrategyRationale(tier, runwayMonths, currentScore, reEmployMonths),
    safeSearchMonths,
    effectiveSearchDeadline,
    salaryNegotiationLeverage: cfg.negotiationLeverage,
    pathConstraints,
    optimalSequence,
    runwayRiskScore,
    runwayRiskLabel,
    criticalThresholdDate: computeCriticalThresholdDate(runwayMonths),
    keyInsight,
  };
}
