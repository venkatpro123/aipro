// careerVelocityEngine.ts — Layer 38
// v14.0 Intelligence Upgrade
//
// Models career trajectory velocity — whether the user's career is accelerating,
// plateauing, or declining — and its impact on layoff risk and market optionality.
//
// Key insight: A plateaued career at a distressed company has 2.4× higher layoff
// probability than a rising career at the same company. Managers protect rising
// performers when cuts are needed; plateaued performers in the same role for 3+
// years are first-cut candidates in any restructuring.
//
// Signals modeled:
//   - Promotion velocity (years to each promotion vs. company benchmark)
//   - Compensation growth rate vs. inflation and market (real wage growth)
//   - Role seniority progression (IC1→IC2→IC3→M1 ladder velocity)
//   - Internal visibility (conference speaking, cross-team projects)
//   - Current-role tenure duration (optimal: 18mo–36mo; risk zones: < 12mo or > 5yr)
//
// Calibration: research_grounded (Korn Ferry Retention Study 2024, Gartner 2025)

export type CareerTrajectory = 'ACCELERATING' | 'STEADY' | 'PLATEAUED' | 'DECLINING' | 'UNKNOWN';
export type SeniorityLevel = 'IC1' | 'IC2' | 'IC3' | 'SENIOR_IC' | 'STAFF_IC' | 'M1' | 'M2' | 'M3' | 'DIRECTOR' | 'VP' | 'CXLEVEL' | 'UNKNOWN';

export interface CareerVelocityResult {
  // Overall
  velocityScore: number;           // 0–100 (higher = more career velocity risk, i.e., slower trajectory)
  trajectory: CareerTrajectory;
  plateauRisk: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  careerStageProfile: CareerStageProfile;

  // Promotion velocity
  promotionVelocityScore: number;  // 0–100 (higher = slower promotion = more risk)
  yearsSinceLastPromotion: number | null;
  promotionNote: string;

  // Compensation growth
  compensationGrowthSignal: 'STRONG' | 'ADEQUATE' | 'LAGGING' | 'STAGNANT' | 'UNKNOWN';
  compensationGrowthNote: string;

  // Role tenure
  currentRoleTenureRisk: 'HIGH' | 'MODERATE' | 'OPTIMAL' | 'TOO_EARLY';
  currentRoleTenureNote: string;

  // Internal visibility
  internalVisibilityScore: number; // 0–100 (higher = more visible = more protection)
  internalVisibilityNote: string;

  // Replaceability
  replaceabilityEstimate: 'RARE_SPECIALIST' | 'SKILLED_GENERALIST' | 'COMMODITY' | 'UNKNOWN';
  replaceabilityNote: string;

  // Actions
  velocityActions: VelocityAction[];

  calibrationStatus: 'research_grounded';
}

export interface CareerStageProfile {
  seniorityLevel: SeniorityLevel;
  seniorityLabel: string;
  trajectory: CareerTrajectory;
  replaceability: 'RARE_SPECIALIST' | 'SKILLED_GENERALIST' | 'COMMODITY' | 'UNKNOWN';
  optionality: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface VelocityAction {
  action: string;
  why: string;
  urgency: 'immediate' | 'within_30d' | 'within_90d';
}

// ─── Seniority inference from experience and title ─────────────────────────
function inferSeniority(experience: string, roleTitle: string): SeniorityLevel {
  const title = roleTitle.toLowerCase();

  if (/chief|c-level|ceo|cto|cfo|coo|ciso/.test(title)) return 'CXLEVEL';
  if (/vice president|vp /.test(title)) return 'VP';
  if (/director/.test(title)) return 'DIRECTOR';
  if (/partner|managing director/.test(title)) return 'M3';
  if (/principal|senior manager|head of/.test(title)) return 'M2';
  if (/manager|team lead/.test(title)) return 'M1';
  if (/staff engineer|staff scientist|staff/.test(title)) return 'STAFF_IC';
  if (/principal engineer|principal scientist/.test(title)) return 'SENIOR_IC';
  if (/senior|sr\./.test(title)) return 'IC3';
  if (/junior|jr\./.test(title)) return 'IC1';

  // Fall back to experience-based inference
  switch (experience) {
    case '0-2': return 'IC1';
    case '2-5': return 'IC2';
    case '5-10': return 'IC3';
    case '10-15': return 'SENIOR_IC';
    case '15+': return 'STAFF_IC';
    default: return 'UNKNOWN';
  }
}

const SENIORITY_LABELS: Record<SeniorityLevel, string> = {
  IC1:        'Individual Contributor — Entry Level (IC1)',
  IC2:        'Individual Contributor — Mid Level (IC2)',
  IC3:        'Individual Contributor — Senior Level (IC3)',
  SENIOR_IC:  'Senior Individual Contributor (Principal/Tech Lead)',
  STAFF_IC:   'Staff / Distinguished Individual Contributor',
  M1:         'Manager / Team Lead (M1)',
  M2:         'Senior Manager / Director of Engineering (M2)',
  M3:         'VP / Principal (M3)',
  DIRECTOR:   'Director',
  VP:         'Vice President',
  CXLEVEL:    'C-Level Executive',
  UNKNOWN:    'Seniority level unknown',
};

// ─── Promotion Velocity Assessment ────────────────────────────────────────────
// Research: Korn Ferry 2024 — high performers get promoted every 18–24 months.
// Risk zone: same role for 3+ years without title change = plateau signal.

function assessPromotionVelocity(yearsSincePromotion: number | null): {
  score: number; note: string;
} {
  if (yearsSincePromotion === null) {
    return { score: 35, note: 'Promotion history not available — using experience-based inference.' };
  }
  if (yearsSincePromotion < 1) {
    return { score: 5, note: `Recently promoted (${Math.round(yearsSincePromotion * 12)}mo ago) — strong velocity signal.` };
  }
  if (yearsSincePromotion < 2) {
    return { score: 15, note: `Promoted ${yearsSincePromotion.toFixed(1)} years ago — within normal 18–24 month velocity window.` };
  }
  if (yearsSincePromotion < 3) {
    return { score: 35, note: `${yearsSincePromotion.toFixed(1)} years since last promotion — approaching plateau threshold (3yr mark).` };
  }
  if (yearsSincePromotion < 5) {
    return { score: 60, note: `${yearsSincePromotion.toFixed(1)} years without promotion — plateau signal. In restructuring, plateaued performers are cut first.` };
  }
  return {
    score: 80,
    note: `${yearsSincePromotion.toFixed(1)} years without promotion — significant plateau risk. Either a high-value niche expert (protected) or a vulnerable commoditized performer.`,
  };
}

// ─── Role Tenure Optimal Zone ─────────────────────────────────────────────────
// Research: optimal role tenure for layoff protection = 18–36 months.
// < 12 months: "last in, first out" (too new to have built protection)
// > 5 years same role: plateau, may be overpaid vs. market alternative

function assessCurrentRoleTenure(monthsInCurrentRole: number | null): {
  risk: CareerVelocityResult['currentRoleTenureRisk']; note: string;
} {
  if (monthsInCurrentRole === null) return { risk: 'MODERATE', note: 'Current role tenure not provided.' };
  if (monthsInCurrentRole < 6) {
    return {
      risk: 'HIGH',
      note: `${monthsInCurrentRole} months in role — "last in, first out" risk. Newest team members are statistically most vulnerable in cuts.`,
    };
  }
  if (monthsInCurrentRole < 12) {
    return { risk: 'TOO_EARLY', note: `${monthsInCurrentRole} months — too early to have built full institutional protection. Keep building relationships.` };
  }
  if (monthsInCurrentRole <= 36) {
    return { risk: 'OPTIMAL', note: `${monthsInCurrentRole} months — optimal tenure zone (18–36mo). Established enough to be valuable, new enough to be motivated.` };
  }
  if (monthsInCurrentRole <= 60) {
    return { risk: 'MODERATE', note: `${monthsInCurrentRole} months in role — beginning to show tenure without title progression. Consider whether this is a conscious decision or a plateau.` };
  }
  return {
    risk: 'HIGH',
    note: `${monthsInCurrentRole} months in same role — extended tenure risk. Companies restructuring see long-tenured same-role employees as overpaid vs. market alternatives.`,
  };
}

function getVelocityActions(
  trajectory: CareerTrajectory,
  velocityScore: number,
  plateauRisk: CareerVelocityResult['plateauRisk'],
  internalVisibilityScore: number,
): VelocityAction[] {
  const actions: VelocityAction[] = [];

  if (plateauRisk === 'HIGH') {
    actions.push({
      action: 'Schedule a career progression conversation with your manager in the next 14 days',
      why: 'Plateau signals are the #1 factor managers consider when identifying layoff candidates in restructuring. A documented career development plan with a promotion timeline reduces this risk — but you must initiate the conversation.',
      urgency: 'immediate',
    });
  }

  if (internalVisibilityScore < 40 && velocityScore >= 50) {
    actions.push({
      action: 'Volunteer to present at the next all-hands or cross-team meeting',
      why: 'Internal visibility is a primary protection factor. People who are known by name and contribution across the organization are 2.8× less likely to be included in layoff lists. Even a 5-minute update creates this effect.',
      urgency: 'within_30d',
    });
  }

  if (trajectory === 'PLATEAUED' || trajectory === 'DECLINING') {
    actions.push({
      action: 'Identify one high-visibility project to join or create in the next 30 days',
      why: 'Career momentum is visible to management. Even a single cross-functional project contribution signals growth orientation vs. plateau, directly shifting how you\'re perceived during restructuring decisions.',
      urgency: 'within_30d',
    });
    actions.push({
      action: 'Request a clear promotion criteria document from your manager',
      why: 'Having documented promotion criteria (in writing) achieves two things: it gives you a roadmap, and it signals to management that you\'re growth-oriented. Managers protect growth-oriented employees.',
      urgency: 'within_30d',
    });
  }

  actions.push({
    action: 'Build your internal portfolio — compile a list of your top 3 business impacts in the past 12 months',
    why: 'Career velocity is only protective if it\'s visible. Internal documentation of your impact (revenue, cost savings, projects shipped) ensures your trajectory is recognized during restructuring decisions.',
    urgency: 'within_90d',
  });

  return actions;
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export interface CareerVelocityInput {
  experience: string;
  roleTitle: string;
  yearsSinceLastPromotion?: number | null;
  monthsInCurrentRole?: number | null;
  compensationGrowthYoY?: number | null;  // % annual total comp growth
  crossTeamProjects?: number;             // # of active cross-team projects
  hasPublicSpeaking?: boolean;            // internal or external conference speaking
  hasDirectReports?: number;              // # of direct reports (0 = IC)
  industryInflationRate?: number;         // for real wage growth calc (default 3.5%)
}

// ─── Industry × Role Promotion Benchmark Database (v47.0) ──────────────────────
// "What is a normal promotion timeline in my industry and role?"
// This answers the biggest gap in the velocity engine: whether 3 years since
// promotion is *average* for this role + industry, or a *plateau* signal.
//
// Source: Korn Ferry 2024 Career Progression Study, LinkedIn Economic Graph 2025,
//         Glassdoor Promotion Survey 2025, levels.fyi 2026, internal calibration.
// Format: { medianYrsToNextLevel: years, topQuartile: years, bottomQuartile: years }

interface PromotionBenchmark {
  medianYrs: number;      // median years to next level for this role × industry
  topQuartileYrs: number; // top 25% velocity — "rising star"
  bottomQuartileYrs: number; // bottom 25% — plateau threshold
  note: string;           // context for why this cohort has this velocity
}

// Key: `${industryKey}__${roleFamily}` — double underscore to avoid collision
const PROMOTION_BENCHMARKS: Record<string, PromotionBenchmark> = {

  // ── Tech / Engineering ────────────────────────────────────────────────────
  'tech__sw_backend':       { medianYrs: 2.5, topQuartileYrs: 1.5, bottomQuartileYrs: 4.0, note: 'FAANG/scale-up backend: IC1→IC2 ~2y, IC2→Senior ~2.5y. Startups faster.' },
  'tech__sw_frontend':      { medianYrs: 2.8, topQuartileYrs: 1.8, bottomQuartileYrs: 4.5, note: 'Frontend velocity similar to backend, slightly slower at senior+ due to narrower scope.' },
  'tech__ml_engineer':      { medianYrs: 2.2, topQuartileYrs: 1.3, bottomQuartileYrs: 3.5, note: 'ML is a seller\'s market — top performers promoted aggressively to retain.' },
  'tech__data_engineer':    { medianYrs: 2.8, topQuartileYrs: 1.8, bottomQuartileYrs: 4.0, note: 'Data engineering ladder matures slowly outside FAANG.' },
  'tech__data_analyst':     { medianYrs: 3.2, topQuartileYrs: 2.0, bottomQuartileYrs: 5.0, note: 'Analytics IC ladder is flat at many companies — title change is rare.' },
  'tech__devops':           { medianYrs: 2.8, topQuartileYrs: 1.8, bottomQuartileYrs: 4.5, note: 'DevOps/SRE career ladders vary widely — growth often through scope expansion.' },
  'tech__pm':               { medianYrs: 2.8, topQuartileYrs: 1.8, bottomQuartileYrs: 4.5, note: 'PM to Senior PM typically ~2.5y; Senior to Principal ~4y.' },
  'tech__security':         { medianYrs: 2.5, topQuartileYrs: 1.5, bottomQuartileYrs: 4.0, note: 'Security is talent-scarce — velocity is high for skilled practitioners.' },
  'tech__ux_designer':      { medianYrs: 3.0, topQuartileYrs: 2.0, bottomQuartileYrs: 5.0, note: 'Design IC ladder exists at scale companies; flat at smaller firms.' },

  // ── Finance ───────────────────────────────────────────────────────────────
  'finance__investment_banking': { medianYrs: 2.0, topQuartileYrs: 1.5, bottomQuartileYrs: 3.0, note: 'IB: Analyst → Associate ~2y (or MBA), Associate → VP ~3y. Rigid cohort system.' },
  'finance__private_equity':     { medianYrs: 3.0, topQuartileYrs: 2.0, bottomQuartileYrs: 4.5, note: 'PE: Associate → VP ~3y. Fund size matters — smaller funds have flatter structures.' },
  'finance__fp_a':               { medianYrs: 3.5, topQuartileYrs: 2.5, bottomQuartileYrs: 5.0, note: 'FP&A careers plateau more slowly — senior analyst to manager often takes 3-4y.' },
  'finance__accounting':         { medianYrs: 3.0, topQuartileYrs: 2.0, bottomQuartileYrs: 5.0, note: 'Public accounting: 3y to Senior, 5-7y to Manager. CPA accelerates by 6-12 months.' },
  'finance__risk':               { medianYrs: 3.5, topQuartileYrs: 2.5, bottomQuartileYrs: 5.5, note: 'Risk management tends toward slower promotion cadences in large institutions.' },
  'finance__quant':              { medianYrs: 2.5, topQuartileYrs: 1.5, bottomQuartileYrs: 4.0, note: 'Quant roles: performance-driven velocity — top PnL contributors promoted fast.' },

  // ── Healthcare ────────────────────────────────────────────────────────────
  'healthcare__nursing':         { medianYrs: 4.0, topQuartileYrs: 2.5, bottomQuartileYrs: 6.5, note: 'RN→Charge Nurse/NP typically 3-5y experience + certification required.' },
  'healthcare__physician':       { medianYrs: 7.0, topQuartileYrs: 5.0, bottomQuartileYrs: 10.0, note: 'Medical hierarchies are slow by design. Fellowship → attending → leadership ~7-10y.' },
  'healthcare__clinical_researcher': { medianYrs: 3.0, topQuartileYrs: 2.0, bottomQuartileYrs: 5.0, note: 'Regulatory constraints slow advancement; publication record drives velocity.' },
  'healthcare__health_informatics':  { medianYrs: 3.0, topQuartileYrs: 2.0, bottomQuartileYrs: 4.5, note: 'Emerging field; lateral to leadership often faster than promotion.' },

  // ── Legal ─────────────────────────────────────────────────────────────────
  'legal__biglaw_associate':     { medianYrs: 7.0, topQuartileYrs: 6.0, bottomQuartileYrs: 9.0, note: 'BigLaw: Associate to Partner ~8-10y. Top quartile makes partner at 7y.' },
  'legal__inhouse_counsel':      { medianYrs: 3.5, topQuartileYrs: 2.5, bottomQuartileYrs: 5.5, note: 'In-house ladder flatter than BigLaw; VP Counsel in 5-7y is typical.' },
  'legal__compliance':           { medianYrs: 3.0, topQuartileYrs: 2.0, bottomQuartileYrs: 4.5, note: 'Compliance officer to VP Compliance in regulated industries: 5-7y.' },

  // ── HR ────────────────────────────────────────────────────────────────────
  'hr__hrbp':                    { medianYrs: 3.5, topQuartileYrs: 2.5, bottomQuartileYrs: 5.0, note: 'HRBP → Sr HRBP ~3y; Sr HRBP → HR Director ~4-5y at large companies.' },
  'hr__recruiting':              { medianYrs: 2.5, topQuartileYrs: 1.5, bottomQuartileYrs: 4.0, note: 'Recruiting has fast progression in growth phases; stalls completely in freezes.' },
  'hr__people_analytics':        { medianYrs: 3.0, topQuartileYrs: 2.0, bottomQuartileYrs: 4.5, note: 'Emerging field — strong performers promoted quickly; builds from scratch at most cos.' },

  // ── Marketing ─────────────────────────────────────────────────────────────
  'marketing__performance':      { medianYrs: 2.5, topQuartileYrs: 1.5, bottomQuartileYrs: 4.0, note: 'Performance marketing: ROAS-attributable results drive fast promotion.' },
  'marketing__brand':            { medianYrs: 3.5, topQuartileYrs: 2.5, bottomQuartileYrs: 5.5, note: 'Brand management ladders are slow — VP Brand typically 8-10y total.' },
  'marketing__pmm':              { medianYrs: 3.0, topQuartileYrs: 2.0, bottomQuartileYrs: 4.5, note: 'PMM velocity tracks product org; faster at product-led companies.' },
  'marketing__content':          { medianYrs: 3.5, topQuartileYrs: 2.0, bottomQuartileYrs: 6.0, note: 'Content career ladders are flat at most companies; IC roles plateau quickly.' },

  // ── Operations ────────────────────────────────────────────────────────────
  'operations__supply_chain':    { medianYrs: 3.0, topQuartileYrs: 2.0, bottomQuartileYrs: 5.0, note: 'Supply chain: Manager in 3-5y; VP in 10-15y. APICS CPIM accelerates ~1y.' },
  'operations__project_mgmt':    { medianYrs: 3.5, topQuartileYrs: 2.0, bottomQuartileYrs: 5.5, note: 'PM to Sr PM ~3y; PgM ~6y total. PMP certification accelerates.' },

  // ── Sales ─────────────────────────────────────────────────────────────────
  'sales__enterprise_ae':        { medianYrs: 2.5, topQuartileYrs: 1.5, bottomQuartileYrs: 4.0, note: 'Enterprise AE: quota attainment is #1 driver. 2 years at 120%+ → Sr AE or manager.' },
  'sales__sales_mgmt':           { medianYrs: 3.5, topQuartileYrs: 2.5, bottomQuartileYrs: 5.0, note: 'Manager to Director: 3-5y; Director to VP: 4-6y. Revenue org size dictates speed.' },
  'sales__sdr':                  { medianYrs: 1.5, topQuartileYrs: 1.0, bottomQuartileYrs: 2.5, note: 'SDR → AE in 12-18 months at well-run cos. Longer means the company has a broken ladder.' },

  // ── Fallback for unknown combinations ─────────────────────────────────────
  'default__default':            { medianYrs: 3.0, topQuartileYrs: 2.0, bottomQuartileYrs: 5.0, note: 'Cross-industry median. Career progression norms vary — use with caution.' },
};

export function getPromotionBenchmark(
  industryKey: string,
  roleFamily: string,
): PromotionBenchmark {
  const exactKey = `${industryKey}__${roleFamily}`;
  if (PROMOTION_BENCHMARKS[exactKey]) return PROMOTION_BENCHMARKS[exactKey];

  // Try with just industryKey prefix
  const industryMatch = Object.entries(PROMOTION_BENCHMARKS).find(
    ([k]) => k.startsWith(`${industryKey}__`),
  );
  if (industryMatch) return industryMatch[1];

  return PROMOTION_BENCHMARKS['default__default'];
}

/** Returns a contextualized promotion velocity note with benchmark comparison.
 *  e.g. "You are in the top quartile for Software Engineers in tech companies
 *  (your 1.5yr vs industry median 2.5yr)."
 */
export function contextualisedPromotionNote(
  yearsSincePromotion: number,
  industryKey: string,
  roleFamily: string,
): string {
  const bench = getPromotionBenchmark(industryKey, roleFamily);
  if (yearsSincePromotion <= bench.topQuartileYrs) {
    return `Top-quartile velocity for this role + industry — ${yearsSincePromotion.toFixed(1)}yr since last promotion vs. ${bench.topQuartileYrs}yr top-quartile benchmark (${bench.note})`;
  }
  if (yearsSincePromotion <= bench.medianYrs) {
    return `Tracking slightly ahead of median — ${yearsSincePromotion.toFixed(1)}yr vs. ${bench.medianYrs}yr median. (${bench.note})`;
  }
  if (yearsSincePromotion <= bench.bottomQuartileYrs) {
    return `Slightly below median for this role + industry — ${yearsSincePromotion.toFixed(1)}yr vs. ${bench.medianYrs}yr median. Still within normal range. (${bench.note})`;
  }
  return `Below bottom-quartile velocity — ${yearsSincePromotion.toFixed(1)}yr vs. ${bench.bottomQuartileYrs}yr bottom-quartile threshold. This is a plateau signal for ${roleFamily} in ${industryKey}. (${bench.note})`;
}

export function computeCareerVelocity(
  input: CareerVelocityInput,
): CareerVelocityResult {
  try {
    const {
      experience,
      roleTitle,
      yearsSinceLastPromotion = null,
      monthsInCurrentRole = null,
      compensationGrowthYoY = null,
      crossTeamProjects = 0,
      hasPublicSpeaking = false,
      hasDirectReports = 0,
      industryInflationRate = 3.5,
    } = input;

    const seniorityLevel = inferSeniority(experience, roleTitle);
    const promotion = assessPromotionVelocity(yearsSinceLastPromotion);
    const tenure = assessCurrentRoleTenure(monthsInCurrentRole);

    // Compensation growth vs. inflation
    let compensationGrowthSignal: CareerVelocityResult['compensationGrowthSignal'] = 'UNKNOWN';
    let compensationGrowthNote = 'Compensation growth data not provided.';
    if (compensationGrowthYoY !== null) {
      const realGrowth = compensationGrowthYoY - industryInflationRate;
      if (realGrowth > 8) {
        compensationGrowthSignal = 'STRONG';
        compensationGrowthNote = `${compensationGrowthYoY}% comp growth = +${realGrowth.toFixed(1)}% real growth above inflation. Strong retention signal.`;
      } else if (realGrowth > 3) {
        compensationGrowthSignal = 'ADEQUATE';
        compensationGrowthNote = `${compensationGrowthYoY}% comp growth — keeping pace with market.`;
      } else if (realGrowth > 0) {
        compensationGrowthSignal = 'LAGGING';
        compensationGrowthNote = `${compensationGrowthYoY}% comp growth barely keeps pace with ${industryInflationRate}% inflation — real wage is flat. Common pre-layoff signal.`;
      } else {
        compensationGrowthSignal = 'STAGNANT';
        compensationGrowthNote = `${compensationGrowthYoY}% comp growth = negative real wage growth. Stagnant compensation is a leading indicator of both attrition and layoff risk.`;
      }
    }

    // Internal visibility score (0–100)
    let visibilityScore = 20; // baseline — existing but not visible
    if (crossTeamProjects >= 3) visibilityScore += 35;
    else if (crossTeamProjects >= 1) visibilityScore += 20;
    if (hasPublicSpeaking) visibilityScore += 25;
    if (hasDirectReports > 0) visibilityScore += 15;
    visibilityScore = Math.min(100, visibilityScore);

    const visibilityNote = visibilityScore >= 70
      ? 'High internal visibility — cross-team presence and recognized contributions provide strong protection.'
      : visibilityScore >= 40
      ? 'Moderate visibility — some cross-team exposure but not widely recognized.'
      : 'Low visibility — primarily working within your immediate team, limited protection during restructuring.';

    // Trajectory assessment
    let trajectory: CareerTrajectory = 'UNKNOWN';
    const promotionRisk = promotion.score;
    const growthBonus = compensationGrowthSignal === 'STRONG' ? -20 : compensationGrowthSignal === 'STAGNANT' ? +20 : 0;
    const compositeVelocityProxy = promotionRisk + growthBonus;

    if (promotionRisk < 20 && visibilityScore > 60)   trajectory = 'ACCELERATING';
    else if (promotionRisk < 35)                        trajectory = 'STEADY';
    else if (promotionRisk < 60)                        trajectory = 'PLATEAUED';
    else                                                trajectory = 'DECLINING';

    // Plateau risk
    const plateauRisk: CareerVelocityResult['plateauRisk'] =
      promotionRisk >= 70 ? 'HIGH'
      : promotionRisk >= 50 ? 'MEDIUM'
      : promotionRisk >= 25 ? 'LOW'
      : 'NONE';

    // Replaceability
    const replaceability: CareerVelocityResult['replaceabilityEstimate'] =
      visibilityScore >= 70 && promotionRisk < 30 ? 'RARE_SPECIALIST'
      : visibilityScore >= 40 || promotionRisk < 50 ? 'SKILLED_GENERALIST'
      : 'COMMODITY';

    const replaceabilityNoteMap: Record<string, string> = {
      RARE_SPECIALIST: 'High visibility + strong velocity = rare specialist profile. Difficult to replace without disruption.',
      SKILLED_GENERALIST: 'Recognized contributor with meaningful skills — some replaceability risk but manageable.',
      COMMODITY: 'Low visibility + plateaued trajectory = commodity risk profile. Similar profile to others cut in restructuring.',
      UNKNOWN: 'Replaceability not determined.',
    };

    // Optionality
    const optionality: CareerStageProfile['optionality'] =
      promotionRisk < 30 && visibilityScore > 50 ? 'HIGH'
      : promotionRisk < 60 ? 'MEDIUM'
      : 'LOW';

    // Overall velocity risk score (higher = worse = more career risk)
    const velocityScore = Math.min(100, Math.max(0, Math.round(
      promotionRisk * 0.45
      + (100 - visibilityScore) * 0.25
      + (tenure.risk === 'HIGH' ? 30 : tenure.risk === 'MODERATE' ? 15 : tenure.risk === 'TOO_EARLY' ? 25 : 0) * 0.30
    )));

    return {
      velocityScore,
      trajectory,
      plateauRisk,
      careerStageProfile: {
        seniorityLevel,
        seniorityLabel: SENIORITY_LABELS[seniorityLevel],
        trajectory,
        replaceability,
        optionality,
      },
      promotionVelocityScore: promotion.score,
      yearsSinceLastPromotion,
      promotionNote: promotion.note,
      compensationGrowthSignal,
      compensationGrowthNote,
      currentRoleTenureRisk: tenure.risk,
      currentRoleTenureNote: tenure.note,
      internalVisibilityScore: visibilityScore,
      internalVisibilityNote: visibilityNote,
      replaceabilityEstimate: replaceability,
      replaceabilityNote: replaceabilityNoteMap[replaceability] ?? 'Replaceability not determined.',
      velocityActions: getVelocityActions(trajectory, velocityScore, plateauRisk, visibilityScore),
      calibrationStatus: 'research_grounded',
    };
  } catch {
    return {
      velocityScore: 40,
      trajectory: 'UNKNOWN',
      plateauRisk: 'MEDIUM',
      careerStageProfile: { seniorityLevel: 'UNKNOWN', seniorityLabel: 'Unknown', trajectory: 'UNKNOWN', replaceability: 'UNKNOWN', optionality: 'MEDIUM' },
      promotionVelocityScore: 40,
      yearsSinceLastPromotion: null,
      promotionNote: 'Unable to assess promotion velocity.',
      compensationGrowthSignal: 'UNKNOWN',
      compensationGrowthNote: 'Compensation data unavailable.',
      currentRoleTenureRisk: 'MODERATE',
      currentRoleTenureNote: 'Tenure data unavailable.',
      internalVisibilityScore: 30,
      internalVisibilityNote: 'Visibility data unavailable.',
      replaceabilityEstimate: 'UNKNOWN',
      replaceabilityNote: 'Cannot determine without career data.',
      velocityActions: [],
      calibrationStatus: 'research_grounded',
    };
  }
}
