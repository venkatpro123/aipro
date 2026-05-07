// financialContextService.ts
// Personalization upgrade 3: Financial context intake.
// Two people with the same risk score need fundamentally different advice
// depending on their financial resilience.
// Stored in localStorage — never sent to server (sensitive data).

export interface FinancialContext {
  monthlyExpenses: number | null;           // INR
  dependents: number;                       // 0–10+
  emergencyFundMonths: number | null;       // months of expenses covered
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
}

export type RiskAppetite = 'conservative' | 'moderate' | 'aggressive';

export interface FinancialProfile {
  riskAppetite: RiskAppetite;
  urgencyMultiplier: number;  // 1.0 = no change; >1 = more urgent; <1 = less
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
 * Derive a financial profile from the context + current risk score.
 * This is what changes the action plan strategy — not just the risk tier.
 */
export function deriveFinancialProfile(
  ctx: FinancialContext,
  riskScore: number,
): FinancialProfile {
  const { monthlyExpenses, dependents, emergencyFundMonths, currentAnnualIncome, currency } = ctx;

  const fmt = (n: number) => currency === 'INR'
    ? n >= 100_000 ? `₹${(n / 100_000).toFixed(1)}L` : `₹${(n / 1_000).toFixed(0)}K`
    : `$${(n / 1_000).toFixed(0)}K`;

  // Runway calculation
  const runwayMonths = emergencyFundMonths ?? null;
  const emergencyRunway = runwayMonths != null
    ? `${runwayMonths.toFixed(1)} months`
    : 'Unknown — assess this first';

  // Risk appetite determination
  let riskAppetite: RiskAppetite;
  let urgencyMultiplier: number;
  let primaryConstraint: string;

  if (runwayMonths != null && runwayMonths < 2) {
    // Critically exposed — income disruption cannot be risked
    riskAppetite = 'conservative';
    urgencyMultiplier = 1.4;  // higher urgency because there's no safety net
    primaryConstraint = `Emergency fund covers only ${runwayMonths.toFixed(1)} months — income disruption risk is severe`;
  } else if (runwayMonths != null && runwayMonths < 4 && dependents >= 2) {
    // Limited runway + dependents = conservative
    riskAppetite = 'conservative';
    urgencyMultiplier = 1.3;
    primaryConstraint = `${dependents} financial dependents with ${runwayMonths.toFixed(1)} months runway — conservative bridge strategy required`;
  } else if (runwayMonths != null && runwayMonths >= 9 && dependents <= 1) {
    // Strong runway, few dependents = can take aggressive transition risk
    riskAppetite = 'aggressive';
    urgencyMultiplier = 0.85;  // can afford to be patient and strategic
    primaryConstraint = `${runwayMonths.toFixed(1)} months runway with low dependent burden — can take planned transition risk`;
  } else {
    riskAppetite = 'moderate';
    urgencyMultiplier = 1.0;
    primaryConstraint = 'Moderate financial flexibility — bridge strategy with income continuity recommended';
  }

  // Budget range for transition investment
  const annualBudget = currentAnnualIncome
    ? currentAnnualIncome * (riskAppetite === 'aggressive' ? 0.03 : riskAppetite === 'moderate' ? 0.02 : 0.01)
    : null;
  const transitionBudgetRange = annualBudget
    ? `${fmt(annualBudget * 0.5)}–${fmt(annualBudget)} per year`
    : 'Focus on free resources first';

  // Strategy advice by profile + risk score
  const advice = buildAdvice(riskAppetite, riskScore, runwayMonths, dependents, currency, fmt);

  return {
    riskAppetite,
    urgencyMultiplier,
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
): FinancialProfile['advice'] {
  if (appetite === 'conservative') {
    return {
      headline: 'Conservative Bridge Strategy — Income continuity is non-negotiable',
      strategy: `With ${runway != null ? `${runway.toFixed(1)} months` : 'limited'} runway${dependents > 0 ? ` and ${dependents} dependent${dependents > 1 ? 's' : ''}` : ''}, your transition must preserve income throughout. Stay in current role while building skills on free resources (2 hrs/week). Target same-sector roles first to minimize income gap during transition. Do NOT accept a gap longer than 30 days.`,
      doNow: 'Build emergency fund to 6 months BEFORE considering any role change. Use free courses (Google certificates, DeepLearning.AI free tier) for skill building.',
      avoid: 'Do not take unpaid courses that require leaving employment. Do not transition to roles with significantly lower starting salaries even if long-term upside exists. Your dependents and runway do not allow for income risk.',
    };
  }

  if (appetite === 'aggressive') {
    return {
      headline: 'Full Transition Strategy — You have the financial cushion to be decisive',
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
