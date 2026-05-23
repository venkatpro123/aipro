// financialRunwayService.ts — v16.0
// User-level financial runway assessment for situation-aware action personalisation.
//
// DISTINCT from financialRunwayIntelligence.ts (company-level FCF / runway signals).
// This module operates on the authenticated *user's* financial situation and
// translates it into an urgency multiplier + constraint/strength narrative that
// the action-ranking and recommendations layers consume.
//
// Design notes:
//   - Pure functions; no Supabase calls here (callers pass a UserFinancialContext
//     assembled from UserProfile by the caller or the pipeline orchestrator).
//   - All money values are normalised to USD before entering this module.
//   - Unknown runway is treated as moderate (1.0 multiplier) — we don't want to
//     manufacture false urgency when the user has not provided financial data.

import { computeGratuity, resolveGratuityCountryFromVisa } from '../data/endOfServiceGratuity';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * The six financial situations a user can be in, ordered from most to least urgent.
 *
 * - critical    < 3 months runway  — must act immediately
 * - tight       3–6 months         — begin job search now
 * - moderate    6–12 months        — can be strategic but shouldn't delay
 * - comfortable 12–24 months       — has room to find the right role
 * - secure      > 24 months        — can negotiate from real strength
 * - unknown     no data provided   — treated as moderate (neutral multiplier)
 */
export type RunwaySituation =
  | 'critical'
  | 'tight'
  | 'moderate'
  | 'comfortable'
  | 'secure'
  | 'unknown';

/** Urgency levels used for UI badge / alert presentation */
export type UrgencyLevel = 'IMMEDIATE' | 'HIGH' | 'MODERATE' | 'LOW';

/** Input: user's financial data, sourced from UserProfile (caller resolves). */
export interface UserFinancialContext {
  /** Computed or self-reported months of savings runway. null = unknown. */
  savingsMonthsRunway: number | null;
  /** Monthly gross salary in USD. null = unknown. */
  monthlySalaryUsd: number | null;
  /** Monthly living expenses in USD. null = unknown. */
  monthlyExpensesUsd: number | null;
  /** Whether the user has unvested equity (creates a retention anchor). */
  hasEquityVesting: boolean;
  /** Months until the next significant vest cliff; null if not applicable. */
  equityVestMonths: number | null;
  /** Whether the user supports dependents (children, parents, etc.). */
  hasDependents: boolean;
  /** Whether the spouse / partner is also employed. */
  dualIncomeHousehold: boolean;
  /** Has navigated a layoff before and landed successfully. */
  priorLayoffSurvived: boolean;
  /** ISO 4217 code for the user's local currency — forwarded to UI for display only. */
  displayCurrencyCode?: string | null;
  /** Raw local-currency monthly salary — forwarded to UI so it can show "SGD 8,500 = ~$6,340 USD". */
  localMonthlySalaryRaw?: number | null;
  /** Visa status string — used to resolve MENA gratuity country when countryCode is absent. */
  visaStatus?: string | null;
  /** Years of service at current employer — required for gratuity computation. */
  tenureYears?: number | null;
  /** ISO 3166-1 alpha-2 country code — fallback when visaStatus doesn't resolve to a MENA regime. */
  countryCode?: string | null;
}

/** Output: full assessment consumed by action-ranking and UI panels. */
export interface FinancialRunwayAssessment {
  /** Classified runway situation bucket. */
  situation: RunwaySituation;
  /**
   * Situation score 0–100.
   * Higher = more financially secure.
   * Used for composite scoring displays and progress-bar UI.
   */
  situationScore: number;
  /** Effective runway = savings + gratuity (for MENA users). Null when unknown. */
  runwayMonths: number | null;
  /** Raw savings-only runway before gratuity is added. */
  savedRunwayMonths: number | null;
  /** MENA end-of-service gratuity contribution in months (0 when non-MENA). MODELED. */
  gratuityMonths: number;
  /** ISO country code that produced the gratuity (AE, SA, QA, BH, OM, KW). */
  gratuityCountryCode?: string;
  /** UI urgency badge level. */
  urgencyLevel: UrgencyLevel;
  /**
   * If the user has unvested equity AND the vest cliff is non-trivial,
   * returns the months until that cliff so the UI can surface it explicitly.
   * null when equity is not a meaningful factor.
   */
  equityAnchorMonths: number | null;
  /**
   * Human-readable list of the most binding financial constraints.
   * Shown in the "What's limiting your options" section of the StrategyTab.
   */
  keyConstraints: string[];
  /**
   * Human-readable list of financial strengths / cushions.
   * Shown in the "What's working in your favour" section.
   */
  keyStrengths: string[];
  /**
   * Multiplier applied to action timelines / urgency scores in the
   * action-ranking engine.
   *
   * critical   → 1.5  (accelerate every action)
   * tight      → 1.3
   * moderate   → 1.0  (baseline, including unknown)
   * comfortable→ 0.85
   * secure     → 0.70 (can afford to be selective)
   */
  actionUrgencyMultiplier: number;
  /** One-sentence plain-English summary for the profile card / tooltip. */
  situationSummary: string;
  /** GAP-P03: maximum affordable one-time course cost in USD for conservative-profile filtering.
   *  Computed as monthlySalaryUsd × 0.1. null when salary is unknown. */
  maxAffordableCourseCostUsd?: number;
}

// ─── Configuration maps ───────────────────────────────────────────────────────

const SITUATION_CONFIG: Record<
  RunwaySituation,
  { score: number; urgencyLevel: UrgencyLevel; multiplier: number }
> = {
  critical:    { score: 5,  urgencyLevel: 'IMMEDIATE', multiplier: 1.5  },
  tight:       { score: 25, urgencyLevel: 'HIGH',      multiplier: 1.3  },
  moderate:    { score: 50, urgencyLevel: 'MODERATE',  multiplier: 1.0  },
  comfortable: { score: 75, urgencyLevel: 'LOW',       multiplier: 0.85 },
  secure:      { score: 95, urgencyLevel: 'LOW',       multiplier: 0.70 },
  unknown:     { score: 50, urgencyLevel: 'MODERATE',  multiplier: 1.0  },
};

// ─── Internal helpers ─────────────────────────────────────────────────────────

function classifyRunway(months: number | null): RunwaySituation {
  if (months == null) return 'unknown';
  if (months < 3)     return 'critical';
  if (months < 6)     return 'tight';
  if (months < 12)    return 'moderate';
  if (months < 24)    return 'comfortable';
  return 'secure';
}

function buildConstraints(
  ctx: UserFinancialContext,
  situation: RunwaySituation,
  runway: number | null,
): string[] {
  const constraints: string[] = [];

  if (situation === 'critical') {
    constraints.push(
      'Less than 3 months runway: job search must begin immediately — every week matters.',
    );
  } else if (situation === 'tight') {
    const months = runway != null ? `${runway.toFixed(0)} months` : 'limited';
    constraints.push(
      `${months} runway: start your job search now to avoid interviewing under pressure.`,
    );
  }

  if (ctx.hasEquityVesting && ctx.equityVestMonths != null && ctx.equityVestMonths > 0) {
    if (ctx.equityVestMonths <= 6) {
      constraints.push(
        `Equity vesting cliff in ${ctx.equityVestMonths} months — leaving before it hits means forfeiting significant value.`,
      );
    } else {
      constraints.push(
        `Equity vesting in ${ctx.equityVestMonths} months creates a retention anchor — weigh whether the vesting upside justifies staying.`,
      );
    }
  }

  if (ctx.hasDependents) {
    constraints.push(
      'Supporting dependents: income stability is non-negotiable — avoid high-risk pivots or extended unpaid gaps.',
    );
  }

  if (ctx.monthlySalaryUsd != null && ctx.monthlyExpensesUsd != null) {
    const savings = ctx.monthlySalaryUsd - ctx.monthlyExpensesUsd;
    if (savings < 0) {
      constraints.push(
        'Monthly expenses exceed salary: building any runway buffer requires reducing outgoings before a job change.',
      );
    }
  }

  return constraints;
}

function buildStrengths(
  ctx: UserFinancialContext,
  situation: RunwaySituation,
  runway: number | null,
): string[] {
  const strengths: string[] = [];

  if (situation === 'comfortable' || situation === 'secure') {
    const label = situation === 'secure' ? '24+' : '12+';
    strengths.push(
      `${label} months runway: you can be selective about your next role and negotiate compensation from a position of strength.`,
    );
  }

  if (ctx.dualIncomeHousehold) {
    strengths.push(
      'Dual-income household: your partner\'s income provides a financial cushion and reduces timeline pressure during your search.',
    );
  }

  if (ctx.priorLayoffSurvived) {
    strengths.push(
      'Proven resilience: you have navigated a layoff before, which means a faster job search and stronger interview confidence.',
    );
  }

  if (ctx.hasEquityVesting && (ctx.equityVestMonths == null || ctx.equityVestMonths === 0)) {
    strengths.push(
      'Equity fully vested: no retention anchor — you can act on your timeline without leaving value on the table.',
    );
  }

  if (
    runway != null &&
    runway >= 6 &&
    ctx.monthlySalaryUsd != null &&
    ctx.monthlyExpensesUsd != null &&
    ctx.monthlySalaryUsd > ctx.monthlyExpensesUsd
  ) {
    strengths.push(
      'Positive monthly savings rate: your runway continues to grow even during a job search, reducing urgency.',
    );
  }

  return strengths;
}

function buildSummary(situation: RunwaySituation, runway: number | null): string {
  const runwayLabel =
    runway != null ? `${runway.toFixed(0)}-month runway` : 'runway unknown';

  switch (situation) {
    case 'critical':
      return `Critical: ${runwayLabel} — your job search must start today, not next week.`;
    case 'tight':
      return `Tight: ${runwayLabel} — begin applying immediately; offers typically take 6–10 weeks to materialise.`;
    case 'moderate':
      return `Moderate: ${runwayLabel} — you have time to be strategic, but don't wait longer than 30 days to start.`;
    case 'comfortable':
      return `Comfortable: ${runwayLabel} — you can afford to find the right opportunity rather than the first available one.`;
    case 'secure':
      return `Secure: ${runwayLabel} — negotiate from strength; your financial position is a genuine advantage.`;
    case 'unknown':
    default:
      return 'Financial runway unknown — completing your profile unlocks personalised urgency guidance.';
  }
}

function resolveEquityAnchor(ctx: UserFinancialContext): number | null {
  if (!ctx.hasEquityVesting) return null;
  if (ctx.equityVestMonths == null || ctx.equityVestMonths <= 0) return null;
  return ctx.equityVestMonths;
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Assess a user's financial situation and return a structured assessment
 * consumed by action-ranking, the StrategyTab, and the profile card.
 *
 * @example
 * ```ts
 * const ctx: UserFinancialContext = {
 *   savingsMonthsRunway: 4,
 *   monthlySalaryUsd: 8_000,
 *   monthlyExpensesUsd: 5_500,
 *   hasEquityVesting: true,
 *   equityVestMonths: 3,
 *   hasDependents: true,
 *   dualIncomeHousehold: false,
 *   priorLayoffSurvived: false,
 * };
 * const assessment = assessFinancialRunway(ctx);
 * // assessment.situation === 'tight'
 * // assessment.urgencyLevel === 'HIGH'
 * // assessment.actionUrgencyMultiplier === 1.3
 * ```
 */
export function assessFinancialRunway(ctx: UserFinancialContext): FinancialRunwayAssessment {
  const savedRunway = ctx.savingsMonthsRunway;

  // MENA end-of-service gratuity: legally guaranteed lump-sum at termination.
  // Adds effective months of runway for urgency classification. A UAE employee with
  // 3 months savings + 4.1 months gratuity has 7.1 effective months → 'moderate', not 'tight'.
  const gratuityCountryCode =
    resolveGratuityCountryFromVisa(ctx.visaStatus ?? null) ?? ctx.countryCode ?? null;
  const gratuityCalc = (gratuityCountryCode && ctx.tenureYears != null && ctx.tenureYears > 0)
    ? computeGratuity(gratuityCountryCode, ctx.tenureYears)
    : null;
  const gratuityMonths = gratuityCalc?.effectiveBufferMonths ?? 0;

  // Effective runway folds gratuity into urgency tier determination.
  const runway = savedRunway != null ? savedRunway + gratuityMonths : null;
  const situation = classifyRunway(runway);
  const config = SITUATION_CONFIG[situation];

  const keyConstraints = buildConstraints(ctx, situation, runway);
  const keyStrengths = buildStrengths(ctx, situation, runway);

  // Surface gratuity as an explicit financial strength when it meaningfully shifts the picture.
  if (gratuityMonths >= 1) {
    const cCode = gratuityCalc!.countryCode;
    const cLabel: Record<string, string> = { AE: 'UAE', SA: 'Saudi Arabia', QA: 'Qatar', BH: 'Bahrain', OM: 'Oman', KW: 'Kuwait' };
    keyStrengths.unshift(
      `${cLabel[cCode] ?? cCode} end-of-service gratuity: ~${gratuityMonths.toFixed(1)} months of effective runway accrued ` +
      `(legally guaranteed upon termination) — included in your ${runway?.toFixed(1) ?? '?'}-month effective runway total.`,
    );
  }

  const equityAnchorMonths = resolveEquityAnchor(ctx);
  const situationSummary = buildSummary(situation, runway);

  // GAP-P03: affordability threshold for conservative-profile course filtering.
  // 10% of monthly salary is the upper bound a conservative profile can commit to a
  // one-time course without materially affecting runway. Null when salary unknown.
  const maxAffordableCourseCostUsd = ctx.monthlySalaryUsd != null
    ? Math.round(ctx.monthlySalaryUsd * 0.1)
    : undefined;

  return {
    situation,
    situationScore: config.score,
    runwayMonths: runway,
    savedRunwayMonths: savedRunway,
    gratuityMonths,
    gratuityCountryCode: gratuityCalc?.countryCode,
    urgencyLevel: config.urgencyLevel,
    equityAnchorMonths,
    keyConstraints,
    keyStrengths,
    actionUrgencyMultiplier: config.multiplier,
    situationSummary,
    maxAffordableCourseCostUsd,
  };
}

/**
 * Convenience: build a UserFinancialContext from a UserProfile (v16+).
 * Import UserProfile from userProfileService; pass into assessFinancialRunway().
 *
 * @example
 * ```ts
 * import { fetchUserProfile } from './userProfileService';
 * import { buildContextFromProfile, assessFinancialRunway } from './financialRunwayService';
 *
 * const profile = await fetchUserProfile();
 * const ctx = buildContextFromProfile(profile);
 * const assessment = assessFinancialRunway(ctx);
 * ```
 */
export function buildContextFromProfile(
  profile: {
    savingsMonthsRunway?: number | null;
    monthlySalaryUsd?: number | null;
    monthlyExpensesUsd?: number | null;
    hasEquityVesting?: boolean | null;
    equityVestMonths?: number | null;
    hasDependents?: boolean | null;
    dualIncomeHousehold?: boolean | null;
    priorLayoffSurvived?: boolean | null;
    localCurrencyCode?: string | null;
    localMonthlySalaryRaw?: number | null;
  } | null,
): UserFinancialContext {
  return {
    savingsMonthsRunway: profile?.savingsMonthsRunway ?? null,
    monthlySalaryUsd: profile?.monthlySalaryUsd ?? null,
    monthlyExpensesUsd: profile?.monthlyExpensesUsd ?? null,
    hasEquityVesting: profile?.hasEquityVesting ?? false,
    equityVestMonths: profile?.equityVestMonths ?? null,
    hasDependents: profile?.hasDependents ?? false,
    dualIncomeHousehold: profile?.dualIncomeHousehold ?? false,
    priorLayoffSurvived: profile?.priorLayoffSurvived ?? false,
    displayCurrencyCode: profile?.localCurrencyCode ?? null,
    localMonthlySalaryRaw: profile?.localMonthlySalaryRaw ?? null,
  };
}
