// financialContextService.ts
// Personalization upgrade 3: Financial context intake.
// Two people with the same risk score need fundamentally different advice
// depending on their financial resilience.
// Stored in localStorage — never sent to server (sensitive data).

export interface FinancialContext {
  monthlyExpenses: number | null;           // INR
  dependents: number;                       // 0–10+
  emergencyFundMonths: number | null;       // months of expenses covered (savings only)
  currentAnnualIncome: number | null;       // INR
  currency: 'INR' | 'USD';
  capturedAt: number;                       // unix ms
  /**
   * India city key — must match a key in CITY_OPPORTUNITIES.
   * E.g. 'bangalore', 'mumbai', 'hyderabad', 'pune', 'chennai', 'delhi_ncr'.
   * Used by getCityCompanyIntersection() to name specific local employers in
   * the action plan. When absent, the action plan falls back to national data.
   */
  city?: string;
  /**
   * ISO country code (AE, SA, QA, BH, OM, KW). When provided alongside tenureYears,
   * end-of-service gratuity is computed and added to emergencyFundMonths to produce
   * EFFECTIVE runway. A 7-year UAE employee with 4 months saved gets effective
   * runway = 4 + 4.9 = 8.9 months → riskAppetite shifts from 'conservative' to 'moderate'.
   */
  countryCode?: string;
  /** Years of tenure at current employer — required for gratuity calculation. */
  tenureYears?: number;
}

export type RiskAppetite = 'conservative' | 'moderate' | 'aggressive';

/**
 * Runway urgency tier — derived from emergencyFundMonths.
 *
 * CRITICAL  < 3 months  immediate cash preservation, no income gaps, no paid courses > ₹3K
 * HIGH      3–6 months  begin job search now, income continuity required
 * MODERATE  6–12 months targeted preparation, one-at-a-time pivots
 * LOW       > 12 months strategic positioning, full transition options available
 *
 * This is the primary stratification axis. riskAppetite maps from it:
 *   CRITICAL + HIGH  → conservative
 *   MODERATE         → moderate
 *   LOW              → aggressive
 */
export type RunwayTier = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';

export interface FinancialProfile {
  riskAppetite: RiskAppetite;
  /** Explicit runway tier — the primary stratification axis for action plan filtering.
   *  Computed from EFFECTIVE runway (savings + MENA gratuity), not raw savings. */
  runwayTier: RunwayTier;
  /** EFFECTIVE runway = stated savings + gratuity (when MENA + tenure provided).
   *  This is the value used for runwayTier classification. Null when no data. */
  runwayMonths: number | null;
  /** User-reported savings months (the raw input). Kept separately so the UI can show
   *  "stated 4 months → effective 8.9 months (+4.9 gratuity)". */
  statedRunwayMonths: number | null;
  /** MENA end-of-service gratuity buffer in months of total pay (0 when not applicable). */
  gratuityMonths: number;
  /** Gratuity disclosure narrative (formula + statute) when gratuityMonths > 0. */
  gratuityDisclosure?: string;
  /**
   * Combined urgency multiplier: financialUrgencyBase × visaAmplifierApplied.
   * Applied to all action deadlines via adjustDeadline() in ActionPlanTab.
   * 1.0 = no change; >1 = deadlines compressed; <1 = more planning time.
   *
   * A citizen with 12+ months runway gets 0.85× (patient strategy).
   * An H1B holder with < 3 months runway gets up to 1.96× (deadlines near-halved).
   */
  urgencyMultiplier: number;
  /** Financial-only urgency component before visa amplification (0.85–1.4). */
  financialUrgencyBase: number;
  /** Visa amplifier applied (1.0 for citizens/PRs, 1.10–1.40 for work visas). */
  visaAmplifierApplied: number;
  primaryConstraint: string;  // plain-English constraint
  transitionBudgetRange: string;
  emergencyRunway: string;    // "2.1 months" or "Unknown"
  advice: {
    headline: string;
    strategy: string;
    doNow: string;
    avoid: string;
  };
}

const STORAGE_KEY = 'hp_financial_context';

export function saveFinancialContext(ctx: FinancialContext): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ctx));
  } catch { /* quota */ }
}

export function loadFinancialContext(): FinancialContext | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as FinancialContext;
  } catch {
    return null;
  }
}

/**
 * Normalise a user-supplied city string to a CITY_OPPORTUNITIES key.
 * Accepts: "Bangalore", "Bengaluru", "bangalore", "Hyderabad", "Delhi NCR", etc.
 * Returns the canonical lowercase underscore key, or null when unrecognised.
 */
export function normaliseCityKey(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const ALIASES: Record<string, string> = {
    bangalore:  'bangalore', bengaluru: 'bangalore', bengalore: 'bangalore',
    mumbai:     'mumbai',  bombay:   'mumbai',
    hyderabad:  'hyderabad', hyd:    'hyderabad',
    pune:       'pune',
    chennai:    'chennai', madras:  'chennai',
    delhi:      'delhi_ncr', 'new delhi': 'delhi_ncr', delhi_ncr: 'delhi_ncr', ncr: 'delhi_ncr',
    kolkata:    'kolkata', calcutta: 'kolkata',
    noida:      'noida',
    gurgaon:    'gurgaon', gurugram: 'gurgaon',
    ahmedabad:  'ahmedabad',
    kochi:      'kochi', cochin: 'kochi',
    indore:     'indore',
    coimbatore: 'coimbatore',
  };
  const key = raw.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z_]/g, '');
  if (ALIASES[key]) return ALIASES[key];
  // Direct key check (e.g. already 'bangalore')
  const direct = raw.toLowerCase().replace(/\s+/g, '_');
  return ALIASES[direct] ?? direct;
}

/**
 * Load the user's city key from stored FinancialContext.
 * Returns null when not set or when the stored value cannot be normalised.
 * Use this instead of reading localStorage.city directly in components.
 */
export function loadCityKey(): string | null {
  const ctx = loadFinancialContext();
  return normaliseCityKey(ctx?.city ?? null);
}

export function clearFinancialContext(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
}

/**
 * Derive a financial profile from context + current risk score + optional visa amplifier.
 *
 * visaAmplifier: pass visaRisk.scoreAmplifier from the audit result.
 *   The financial urgency base (0.85–1.4) and the visa urgency (1.0–1.40) are
 *   independent axes — they multiply because the constraints are independent.
 *   An H1B holder with short runway faces BOTH constraints simultaneously.
 *
 *   Combined urgency is clamped at 2.0 to prevent degenerate deadline compression
 *   (2.0 already means every 6-week deadline becomes 3 weeks — extreme).
 */
export function deriveFinancialProfile(
  ctx: FinancialContext,
  riskScore: number,
  visaAmplifier?: number,
): FinancialProfile {
  const { monthlyExpenses, dependents, emergencyFundMonths, currentAnnualIncome, currency, countryCode, tenureYears } = ctx;

  const fmt = (n: number) => currency === 'INR'
    ? n >= 100_000 ? `₹${(n / 100_000).toFixed(1)}L` : `₹${(n / 1_000).toFixed(0)}K`
    : `$${(n / 1_000).toFixed(0)}K`;

  // EFFECTIVE runway = stated savings + MENA gratuity (when applicable).
  // A 7-year UAE employee with 4 months saved sees runwayTier shift from CRITICAL
  // (savings only) → MODERATE (effective 8.9 months including 4.9 mo gratuity).
  // This is the most consequential MENA bug: risk_appetite was structurally wrong
  // for ~all MENA professionals because gratuity was completely invisible.
  const statedRunwayMonths = emergencyFundMonths ?? null;
  let gratuityMonths = 0;
  let gratuityDisclosure: string | undefined;
  if (countryCode && tenureYears != null && tenureYears > 0) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const { computeGratuity } = require('../data/endOfServiceGratuity') as {
        computeGratuity: (cc: string, ty: number) => {
          effectiveBufferMonths: number;
          disclosureText: string;
        } | null;
      };
      const calc = computeGratuity(countryCode, tenureYears);
      if (calc) {
        gratuityMonths = calc.effectiveBufferMonths;
        gratuityDisclosure = calc.disclosureText;
      }
    } catch { /* gratuity module unavailable */ }
  }
  const runwayMonths = statedRunwayMonths != null
    ? statedRunwayMonths + gratuityMonths
    : (gratuityMonths > 0 ? gratuityMonths : null);
  const emergencyRunway = runwayMonths != null
    ? gratuityMonths > 0
      ? `${runwayMonths.toFixed(1)} months effective (${(statedRunwayMonths ?? 0).toFixed(1)} saved + ${gratuityMonths.toFixed(1)} gratuity)`
      : `${runwayMonths.toFixed(1)} months`
    : 'Unknown — assess this first';

  // ── Runway tier stratification (spec-exact thresholds) ────────────────────
  //   CRITICAL  < 3 months  — immediate cash preservation, no income gaps, no paid courses > ₹3K
  //   HIGH      3–6 months  — begin job search now, income continuity required
  //   MODERATE  6–12 months — targeted preparation, one-at-a-time pivots
  //   LOW       > 12 months — strategic positioning, full transition options
  //
  // When runway is unknown (null), default to MODERATE so we don't
  // accidentally suppress income-gap actions for users who simply haven't
  // entered their context yet. They will get appropriate advice once they do.
  let runwayTier: RunwayTier;
  if (runwayMonths === null) {
    runwayTier = 'MODERATE';
  } else if (runwayMonths < 3) {
    runwayTier = 'CRITICAL';
  } else if (runwayMonths < 6) {
    runwayTier = 'HIGH';
  } else if (runwayMonths <= 12) {
    runwayTier = 'MODERATE';
  } else {
    runwayTier = 'LOW';
  }

  // riskAppetite derived from runwayTier — CRITICAL and HIGH are both conservative
  // because neither can afford an income gap during transition.
  let riskAppetite: RiskAppetite;
  let urgencyMultiplier: number;
  let primaryConstraint: string;

  switch (runwayTier) {
    case 'CRITICAL':
      riskAppetite = 'conservative';
      urgencyMultiplier = 1.4;
      primaryConstraint = `Emergency fund covers only ${runwayMonths!.toFixed(1)} months — immediate cash preservation required. Income disruption risk is severe${dependents > 0 ? ` with ${dependents} dependent${dependents > 1 ? 's' : ''}` : ''}.`;
      break;
    case 'HIGH':
      riskAppetite = 'conservative';
      urgencyMultiplier = 1.3;
      primaryConstraint = `${runwayMonths!.toFixed(1)} months runway — begin job search now. Income continuity is required throughout any transition.${dependents > 0 ? ` ${dependents} dependent${dependents > 1 ? 's' : ''} add further constraint.` : ''}`;
      break;
    case 'MODERATE':
      riskAppetite = 'moderate';
      urgencyMultiplier = 1.0;
      primaryConstraint = `${runwayMonths !== null ? `${runwayMonths.toFixed(1)} months runway` : 'Moderate runway'} — targeted preparation while employed. One-at-a-time pivots only.`;
      break;
    case 'LOW':
      riskAppetite = 'aggressive';
      urgencyMultiplier = 0.85;
      primaryConstraint = `${runwayMonths!.toFixed(1)} months runway with low constraint — full transition options available. Use runway as a strategic asset.`;
      break;
  }

  // Budget range for transition investment
  const annualBudget = currentAnnualIncome
    ? currentAnnualIncome * (riskAppetite === 'aggressive' ? 0.03 : riskAppetite === 'moderate' ? 0.02 : 0.01)
    : null;
  const transitionBudgetRange = annualBudget
    ? `${fmt(annualBudget * 0.5)}–${fmt(annualBudget)} per year`
    : 'Focus on free resources first';

  // ── Visa urgency amplification ──────────────────────────────────────────────
  // Applied AFTER financial urgency is determined.
  // The two constraints are independent axes — visa grace period applies
  // regardless of financial runway, and financial runway applies regardless of
  // visa status. An H1B holder with short runway faces both simultaneously.
  //
  // Only amplify (never reduce) — visa constraints only add urgency, not remove it.
  const financialUrgencyBase = urgencyMultiplier;
  const visaAmplifierApplied = (visaAmplifier != null && visaAmplifier > 1.0)
    ? visaAmplifier
    : 1.0;

  if (visaAmplifierApplied > 1.0) {
    // Clamp combined multiplier at 2.0 — beyond 2.0 all deadlines become < 1 week,
    // which is no longer actionable. 2.0 already means every 6-week task → 3 weeks.
    urgencyMultiplier = Math.min(2.0, financialUrgencyBase * visaAmplifierApplied);
    // When visa amplification is active, the primary constraint should surface it
    if (!primaryConstraint.includes('visa') && !primaryConstraint.includes('grace')) {
      primaryConstraint += `. Work visa status adds a ${Math.round((visaAmplifierApplied - 1) * 100)}% urgency premium — timeline compressed proportionally.`;
    }
  }

  // Strategy advice by profile + risk score + tier
  const advice = buildAdvice(riskAppetite, riskScore, runwayMonths, dependents, currency, fmt, runwayTier);

  return {
    riskAppetite,
    runwayTier,
    runwayMonths,
    statedRunwayMonths,
    gratuityMonths,
    gratuityDisclosure,
    urgencyMultiplier,
    financialUrgencyBase,
    visaAmplifierApplied,
    primaryConstraint,
    transitionBudgetRange,
    emergencyRunway,
    advice,
  };
}

function buildAdvice(
  appetite: RiskAppetite,
  riskScore: number,
  runway: number | null,
  dependents: number,
  currency: 'INR' | 'USD',
  fmt: (n: number) => string,
  runwayTier?: RunwayTier,
): FinancialProfile['advice'] {
  if (appetite === 'conservative') {
    const isCritical = runwayTier === 'CRITICAL';
    return {
      headline: isCritical
        ? 'CRITICAL — Cash preservation is the only priority. No income gaps.'
        : 'Conservative Bridge Strategy — Income continuity is non-negotiable',
      strategy: isCritical
        ? `With only ${runway != null ? `${runway.toFixed(1)} months` : 'critically short'} runway${dependents > 0 ? ` and ${dependents} dependent${dependents > 1 ? 's' : ''}` : ''}, your immediate priority is extending your cash position, not planning a career transition. Three parallel tracks: (1) reduce monthly burn 15–25% by cutting non-essential fixed costs, (2) build a freelance bridge income while employed, (3) apply to lateral roles only — no income-gap transitions.`
        : `With ${runway != null ? `${runway.toFixed(1)} months` : 'limited'} runway${dependents > 0 ? ` and ${dependents} dependent${dependents > 1 ? 's' : ''}` : ''}, your transition must preserve income throughout. Begin external job search now while still employed — employed candidates get 4× more callbacks. Target lateral roles in your sector first to minimize transition risk.`,
      doNow: isCritical
        ? 'Tonight: calculate exact monthly burn rate. This week: cancel all non-essential subscriptions, identify one freelance service you can offer. No career transitions until emergency fund reaches 6 months.'
        : 'Begin external job search this week while employed. Update CV and LinkedIn. Reach out to 3 warm contacts. Use free courses only (Google certificates, DeepLearning.AI free tier) for skill building.',
      avoid: isCritical
        ? 'Do NOT voluntarily quit or accept any offer that requires a gap period. Do NOT spend money on paid courses, certifications, or training above ₹3,000. Every rupee spent is a day of runway burned.'
        : 'Do not transition to roles with significantly lower starting salaries. Do not accept income gaps longer than 30 days. Your runway does not allow for speculative pivots.',
    };
  }

  if (appetite === 'aggressive') {
    return {
      headline: 'Full Transition Strategy — Use your runway as a strategic asset',
      strategy: `With ${runway != null ? `${runway.toFixed(1)} months` : 'strong'} runway and low dependent burden, you can absorb a 2–4 month income dip for a significantly better role. Execute the full transition roadmap: intensive upskilling (20 hrs/week), aggressive networking, and willingness to take a short-term income hit for a 15–25% salary improvement in the target role.`,
      doNow: `Use the financial runway as a strategic asset. Set a firm transition deadline (${riskScore >= 65 ? '6 months' : '12 months'}). Invest in 1–2 premium certifications in the highest-ROI skills. Target companies 2–3 tiers above current in terms of AI maturity.`,
      avoid: 'Do not let financial comfort reduce urgency. Runway is time-bound, not permanent. Set a decision date and honour it.',
    };
  }

  // Moderate
  return {
    headline: 'Moderate Bridge Strategy — Upskill while employed, transition with continuity',
    strategy: 'Build 2–3 key skills over the next 3–6 months while maintaining current income. Target a lateral-to-upward transition in the same sector first — this minimizes income risk while moving to a safer role. Accept a ≤10% income dip for a significantly safer role profile.',
    doNow: `Allocate ${currency === 'INR' ? '₹3,000–₹8,000/month' : '$40–$100/month'} to targeted skill investment (Coursera, DataCamp, or sector-specific certifications). Begin external conversations every 2 weeks — informational only, not job applications yet.`,
    avoid: 'Do not attempt a simultaneous industry + role + function change. Change one dimension at a time to manage risk and maintain salary.',
  };
}
// ── Priority 9: Performance tier + collapse stage strategy override ────────────
// When a user reports below-average performance AND the company shows Stage 2/3
// collapse signals (or risk score >=70), upskilling roadmaps are no longer
// the primary recommendation. They need an exit plan first.

export interface PerformanceCollapseOverride {
  isActive: boolean;
  urgencyTier: 'immediate' | 'elevated';
  headline: string;
  strategyOverride: string;
  suppressUpskilling: boolean;
}

export function getPerformanceCollapseStrategy(
  performanceTier: 'top' | 'average' | 'below' | 'unknown',
  collapseStage: 1 | 2 | 3 | null,
  riskScore: number,
): PerformanceCollapseOverride | null {
  if (performanceTier !== 'below') return null;
  const stageIsHigh = collapseStage !== null && collapseStage >= 2;
  const scoreIsHigh = riskScore >= 70;
  if (!stageIsHigh && !scoreIsHigh) return null;
  const isStage3 = collapseStage === 3;
  const isStage2 = collapseStage === 2;
  if (isStage3) {
    return { isActive: true, urgencyTier: 'immediate', headline: 'Immediate exit strategy required', strategyOverride: 'Your situation combines below-average performance reviews with Stage 3 company collapse signals. Upskilling cannot close this gap in your available time window. Activate your professional network today, update your CV tonight, and begin parallel job search this week. Reskilling happens in the next role, not this one.', suppressUpskilling: true };
  }
  if (isStage2) {
    return { isActive: true, urgencyTier: 'immediate', headline: 'Exit planning takes priority over upskilling', strategyOverride: 'Below-average performance combined with Stage 2 signals creates convergent risk. Companies cutting headcount disproportionately focus on below-average performers. Begin external job search now while employed — this is 4-6x more effective than searching after a layoff.', suppressUpskilling: true };
  }
  return { isActive: true, urgencyTier: 'elevated', headline: 'External job search should be your primary focus given your performance rating', strategyOverride: 'Below-average performance ratings increase displacement probability by ~60% vs average performers. Begin building your external pipeline in parallel — identify 3 target companies and reach out to 2 warm contacts this week. The most effective career protection is a competing offer.', suppressUpskilling: false };
}
