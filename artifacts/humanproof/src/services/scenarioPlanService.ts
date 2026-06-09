// scenarioPlanService.ts — Layer 50 (v35.0)
// Projects bear / base / bull macro scenarios for risk over the next 6 months.
// Provides probabilistic foresight so users can plan for different economic regimes.
// GAP C: recommended actions are now personalized by visa status, financial runway,
// seniority bracket, and equity type — static action pools replaced by trait-dispatchers.

export interface ScenarioOutcome {
  score: number;
  probability: number;
  triggerConditions: string[];
  recommendedActions: string[];
}

export interface ScenarioPlanResult {
  worstCase: ScenarioOutcome;
  baseCase: ScenarioOutcome;
  bestCase: ScenarioOutcome;
  scenarioSpread: number;
  dominantUncertainty: string;
  planningHorizonMonths: number;
}

export interface ScenarioPlanPersonalizationContext {
  visaStatus?: 'h1b' | 'l1' | 'opt_stem' | 'citizen' | 'other_work_auth';
  financialRunwaySituation?: 'critical' | 'tight' | 'comfortable' | 'strong';
  seniorityBracket?: 'junior' | 'mid' | 'senior' | 'staff_plus';
  hasEquityVesting?: boolean;
  equityType?: 'rsu' | 'options' | 'none';
  /** v37.0: broad role category — drives profession-specific scenario actions */
  roleCategory?: 'tech' | 'healthcare' | 'finance' | 'legal' | 'sales_ops' | 'creative' | 'service' | 'physical_labor' | 'education' | 'government';
  /**
   * v39.0 B4: region drives localized outreach channels (Naukri vs LinkedIn,
   * region-specific recruiter agencies, regional pay-band benchmarks).
   */
  region?: 'US' | 'IN' | 'EU' | 'UK' | 'MENA' | 'APAC' | string | null;
}

export interface ScenarioPlanInput {
  currentScore: number;
  macroRiskTier?: string | null;
  contagionProbability?: number | null;
  primaryCohort?: string | null;
  velocityPtsPerMonth?: number;
  freeCashFlowMargin?: number | null;
  revenueGrowthYoY?: number | null;
  personalizationContext?: ScenarioPlanPersonalizationContext;
}

// Macro scenario delta table (added to current score, capped 0–99).
// Derived from observed score movements during macro regime shifts (2020–2025 dataset).
const SCENARIO_DELTAS = {
  DISTRESS: { bear: 22, base: 6, bull: -5 },
  EFFICIENCY: { bear: 16, base: 4, bull: -8 },
  WAVE: { bear: 20, base: 7, bull: -4 },
  UNKNOWN: { bear: 15, base: 4, bull: -6 },
};

const SCENARIO_PROBABILITIES = {
  // When macro risk tier is already HIGH/CRITICAL, bear scenario is more likely
  HIGH_MACRO:   { bear: 0.45, base: 0.40, bull: 0.15 },
  ELEVATED_MACRO: { bear: 0.30, base: 0.50, bull: 0.20 },
  MODERATE_MACRO: { bear: 0.20, base: 0.55, bull: 0.25 },
  LOW_MACRO:    { bear: 0.10, base: 0.55, bull: 0.35 },
  DEFAULT:      { bear: 0.25, base: 0.50, bull: 0.25 },
};

function clampScore(score: number): number {
  return Math.min(99, Math.max(0, Math.round(score)));
}

function macroTierToProbKey(tier: string | null | undefined): keyof typeof SCENARIO_PROBABILITIES {
  const t = (tier ?? '').toLowerCase();
  if (t === 'high' || t === 'critical') return 'HIGH_MACRO';
  if (t === 'elevated') return 'ELEVATED_MACRO';
  if (t === 'moderate') return 'MODERATE_MACRO';
  if (t === 'low') return 'LOW_MACRO';
  return 'DEFAULT';
}

function buildBearTriggers(input: ScenarioPlanInput): string[] {
  const triggers: string[] = [
    'Macro recession probability rises above 60%',
    'Sector peer layoffs accelerate (contagion wave)',
  ];
  if ((input.contagionProbability ?? 0) > 0.3) {
    triggers.push(`Current ${Math.round((input.contagionProbability ?? 0) * 100)}% sector contagion probability worsens`);
  }
  if (input.freeCashFlowMargin !== null && input.freeCashFlowMargin !== undefined && input.freeCashFlowMargin < 0) {
    triggers.push('Free cash flow deteriorates further, forcing restructuring');
  }
  if (input.revenueGrowthYoY !== null && input.revenueGrowthYoY !== undefined && input.revenueGrowthYoY < -5) {
    triggers.push('Revenue decline deepens — cost reduction becomes unavoidable');
  }
  return triggers.slice(0, 4);
}

function buildBearActions(ctx: ScenarioPlanPersonalizationContext, urgencyMultiplier: number = 1.5): string[] {
  const isCritical = urgencyMultiplier >= 1.5;
  const actions: string[] = [];

  // Visa-gated: always first in bear — legal clock is most time-critical constraint.
  if (ctx.visaStatus === 'opt_stem') {
    actions.push('OPT STEM priority: consult an immigration attorney within 72h to map Cap-Gap strategy and employer transfer options');
  } else if (ctx.visaStatus === 'h1b' || ctx.visaStatus === 'l1') {
    actions.push(`${ctx.visaStatus.toUpperCase()} priority: contact immigration attorney within 72h — 60-day grace period starts on last day of employment`);
  }

  // Runway-gated: in bear/critical, expense audit trumps "accelerate savings"
  if (ctx.financialRunwaySituation === 'critical' || ctx.financialRunwaySituation === 'tight') {
    actions.push('Run expense audit immediately — identify non-essential recurring costs to extend runway by 4–8 weeks');
  } else {
    actions.push(isCritical
      ? 'Secure 6+ months financial runway NOW — convert non-essential assets before disruption occurs'
      : 'Accelerate emergency fund to ≥6 months of expenses before any disruption occurs');
  }

  // v37.0: Role-category-specific bear action — the highest-impact personalization surface
  const bearRoleAction = buildBearRoleCategoryAction(ctx.roleCategory, ctx.seniorityBracket, isCritical);
  if (bearRoleAction) actions.push(bearRoleAction);

  // Equity-gated
  if (ctx.equityType && ctx.equityType !== 'none' && ctx.hasEquityVesting !== false) {
    actions.push('Accelerate equity/bonus capture — confirm vesting cliff dates and negotiate acceleration clause if possible');
  }

  // Seniority-gated (fallback when no roleCategory action covers leadership)
  if (!bearRoleAction) {
    if (ctx.seniorityBracket === 'staff_plus') {
      actions.push('Activate advisory and fractional leadership options — staff+ profiles are sought for board advisory and interim roles');
    } else {
      actions.push('Activate your first-degree network for warm referrals — 80% of roles are filled before public posting');
    }
  }

  // v39.0 B4: region-specific outreach channel guidance
  const regionAction = buildRegionalOutreachAction(ctx.region);
  if (regionAction) actions.push(regionAction);

  return actions.slice(0, 5);
}

function buildRegionalOutreachAction(region: ScenarioPlanPersonalizationContext['region']): string | null {
  const r = (region ?? '').toString().toUpperCase();
  if (r === 'IN' || r === 'INDIA') {
    return 'India outreach channel: prioritise Naukri.com + LinkedIn India + Hirist (tech) for active postings; use Cutshort and InstaHyre for warm-intro pipelines. GCC roles (Goldman, JPMorgan, Google India) pay 30–50% above IT services for equivalent levels.';
  }
  if (r === 'EU' || r === 'GERMANY' || r === 'FRANCE' || r === 'NETHERLANDS') {
    return 'EU outreach: LinkedIn EU + StepStone (DACH) + Welcome to the Jungle (France) are highest-yield. Visa/work-permit timing: most EU countries require 4–8 week processing, so begin paperwork in parallel with applications.';
  }
  if (r === 'UK') {
    return 'UK outreach: LinkedIn UK + CWJobs (tech) + Reed.co.uk are primary; high-leverage executive search firms (Egon Zehnder, Spencer Stuart) handle the £150K+ band. Confirm Skilled Worker visa sponsor list (gov.uk register) before target shortlisting.';
  }
  if (r === 'MENA' || r === 'UAE' || r === 'SAUDI') {
    return 'MENA outreach: Bayt.com + LinkedIn Middle East + Naukrigulf are the primary boards; tier-1 roles are heavily referral-driven via existing networks within the region.';
  }
  if (r === 'APAC' || r === 'SINGAPORE' || r === 'HK' || r === 'AU') {
    return 'APAC outreach: LinkedIn APAC + JobsDB (HK) + SEEK (AU/SG) for active postings; regional executive search at the senior+ band is dominated by Heidrick, Korn Ferry, and Boyden.';
  }
  return null;
}

function buildBearRoleCategoryAction(
  roleCategory: ScenarioPlanPersonalizationContext['roleCategory'],
  seniorityBracket: ScenarioPlanPersonalizationContext['seniorityBracket'],
  isCritical: boolean,
): string | null {
  switch (roleCategory) {
    case 'tech':
      return seniorityBracket === 'staff_plus'
        ? 'Activate open-source contributions, GitHub visibility, and advisory pipeline — principal/staff engineers land roles 40% faster via reputation signals than job boards'
        : 'Activate GitHub presence and AI-integration portfolio — engineers with public AI-augmented projects receive 2.8× more recruiter contacts';
    case 'healthcare':
      return isCritical
        ? 'Contact healthcare staffing agencies (Aya Healthcare, AMN Healthcare, Cross Country) for per diem and travel positions — these provide income continuity within weeks, not months'
        : 'Explore locum tenens / per diem agency registration as a parallel income buffer — licensing portability check should be first step';
    case 'finance':
      return 'Update your CFA/CPA/FRM exam timeline if pending — credential completion dramatically increases market value during finance sector waves; contact your professional network at buy-side firms';
    case 'legal':
      return 'Build advisory or contract counsel pipeline through your existing client relationships — law firm lateral markets move slowly; independent consulting roles can activate within 30–60 days';
    case 'sales_ops':
      return 'Compile your quota attainment data and pipeline contribution history into a one-page sales narrative — AEs and sales leaders with documented revenue attribution are hired 3× faster than those without';
    case 'creative':
      return 'Activate freelance and consulting pipeline through your portfolio — creative professionals who build agency relationships before job loss average 45% shorter income gap than those who search after';
    case 'service':
      return 'Activate your professional HR / operations network immediately — many roles above ₹12 LPA are filled through referrals before posting; your SHRM or equivalent association network is the right channel';
    case 'education':
      return 'Education sector hiring follows academic calendars — if job search is needed, target January and April intake windows; edtech companies hire year-round and value classroom experience highly';
    case 'government':
      return 'Government positions take 3–9 months to fill through formal channels — begin application process immediately if transition is possible; simultaneously explore consulting roles leveraging your policy expertise';
    case 'physical_labor':
      return 'Certifications (OSHA, Six Sigma, PMP) dramatically expand transition options — identify the 1 certification with highest hiring impact in your trade and enroll within the next 30 days';
    default:
      return null;
  }
}

function buildBaseActions(currentScore: number, ctx: ScenarioPlanPersonalizationContext): string[] {
  const actions: string[] = [];

  if (currentScore >= 70) {
    actions.push('Begin structured job search with 2–3 applications per week — treat base case as moderately urgent');
    actions.push('Refresh resume and LinkedIn to attract inbound opportunities before you need them');
  } else {
    actions.push('Maintain career readiness: keep resume current and technical skills updated quarterly');
  }

  // Runway-gated
  if (ctx.financialRunwaySituation === 'critical' || ctx.financialRunwaySituation === 'tight') {
    actions.push('Prioritise financial buffer: reach 3 months runway before anything else');
  } else {
    actions.push('Build 3–6 month financial buffer as precautionary measure');
  }

  // v37.0: role-category specific leverage window action
  const baseRoleAction = buildBaseRoleCategoryAction(ctx.roleCategory, currentScore);
  if (baseRoleAction) actions.push(baseRoleAction);
  else actions.push('Monitor company announcements weekly — Q/E earnings calls and leadership changes are leading indicators');

  return actions.slice(0, 4);
}

function buildBaseRoleCategoryAction(
  roleCategory: ScenarioPlanPersonalizationContext['roleCategory'],
  currentScore: number,
): string | null {
  switch (roleCategory) {
    case 'tech':
      return 'Keep one active side project or open-source contribution — engineers who maintain a GitHub presence during low-risk periods convert to job offers 60% faster when they need to';
    case 'healthcare':
      return 'Review license reciprocity in 2–3 additional states / regions — expanding geographic optionality before you need it takes 4–8 weeks and dramatically accelerates TRANSITION if needed';
    case 'finance':
      return currentScore >= 60
        ? 'Build your financial modelling portfolio documentation — quantifying P&L impact, cost savings, or AUM managed creates the audit trail that differentiates senior finance candidates'
        : 'Track regulatory changes in your specialisation — compliance-adjacent knowledge is the highest-leverage differentiator in finance interviews';
    case 'legal':
      return 'Cultivate 2–3 client relationships that could follow you — in-house and law firm transitions both benefit from demonstrated client portability';
    case 'sales_ops':
      return 'Document pipeline value and win rate metrics now — sales leaders who can cite verified revenue attribution receive 25–40% higher offers than those who can only cite quota attainment';
    case 'creative':
      return 'Keep your portfolio current with recent work samples — creative professionals who refresh their portfolio every 90 days receive 2× more inbound approaches';
    case 'service':
      return 'Pursue one professional HR certification (SHRM-CP, PHR) or HR analytics tool competency — certifications are the primary screen for senior HR roles above ₹12 LPA';
    case 'education':
      return 'Build relationships with edtech companies in your domain — the edtech transition is the most accessible exit path for educators and typically involves a 20–35% salary improvement';
    case 'government':
      return 'Track federal and state budget announcements in your domain — government professionals who anticipate funding cycles are best positioned when department restructuring occurs';
    case 'physical_labor':
      return 'Pursue automation-upskilling certification (PLC programming, robotic systems, SCADA) — physical roles with automation skills earn 30–50% more and face lower displacement risk';
    default:
      return null;
  }
}

function buildBullActions(ctx: ScenarioPlanPersonalizationContext): string[] {
  const actions: string[] = [];

  // v37.0: role-category specific bull growth pivot
  const bullRoleAction = buildBullRoleCategoryAction(ctx.roleCategory, ctx.seniorityBracket);
  if (bullRoleAction) {
    actions.push(bullRoleAction);
  } else if (ctx.seniorityBracket === 'staff_plus') {
    actions.push('Leverage improved conditions for scope expansion or principal/distinguished title negotiation');
  } else {
    actions.push('Leverage improved market conditions for salary negotiation or promotion conversation');
  }

  actions.push('Invest in target skills to maximise opportunity in recovery — prioritise 1–2 high-demand capabilities');

  if (ctx.equityType === 'options') {
    actions.push('Review option strike prices against recovery valuation — exercise window strategy may shift with bull conditions');
  } else if (ctx.equityType === 'rsu') {
    actions.push('Evaluate RSU retention hold vs. sell strategy as market improves');
  }

  return actions.slice(0, 3);
}

function buildBullRoleCategoryAction(
  roleCategory: ScenarioPlanPersonalizationContext['roleCategory'],
  seniorityBracket: ScenarioPlanPersonalizationContext['seniorityBracket'],
): string | null {
  switch (roleCategory) {
    case 'tech':
      return seniorityBracket === 'staff_plus'
        ? 'Pursue scope expansion toward principal/distinguished IC or staff+ leadership role — tech recovery cycles create 12–18 month windows for title progression that close when hiring freezes return'
        : 'Negotiate a 15–25% raise leveraging competing offers — tech compensation recovery historically runs 12–18 months ahead of hiring recovery; now is the optimal window';
    case 'healthcare':
      return 'Pursue specialty certification or fellowship that unlocks a higher-compensation subspecialty — bull market in healthcare means hospitals are competing for specialized talent';
    case 'finance':
      return 'Pursue CFA Level upgrade, Series 7/65, or CPA if not completed — finance recovery cycles create 18-month windows for credentials that directly unlock compensation tiers';
    case 'legal':
      return 'Negotiate equity or origination credit in improved market conditions — law firm compensation for partners with portable books of business sees the largest gains during recovery cycles';
    case 'sales_ops':
      return 'Renegotiate OTE and commission structure when company performance improves — sales leaders with quota attainment data above 110% are in the strongest leverage position of the economic cycle';
    case 'creative':
      return 'Pursue brand-building and thought leadership investment — creative leaders who build personal brand during bull cycles receive premium rates and advisory opportunities that persist through downturns';
    case 'service':
      return 'Pursue CHRO or CPO path if seniority allows — HR leadership compensation sees the largest gains in bull markets as companies compete to retain talent operations experts';
    case 'education':
      return 'Pursue tenure-track or senior curriculum leadership role — academic hiring opens significantly in bull cycles as institutions restore hiring freezes from lean years';
    case 'government':
      return 'Pursue Senior Executive Service or equivalent — government pay bands open at senior levels during bull economic cycles when private-sector poaching intensifies';
    case 'physical_labor':
      return 'Negotiate base salary and union benefit improvements — physical labor compensation gains are largest in bull cycles when skilled trades face supply shortages';
    default:
      return null;
  }
}

function buildBullTriggers(input: ScenarioPlanInput): string[] {
  const triggers: string[] = ['Macro indicators stabilise — recession probability falls below 20%'];
  if (input.primaryCohort === 'EFFICIENCY') {
    triggers.push('AI efficiency cuts plateau — company reaches target headcount ratio');
  }
  if ((input.contagionProbability ?? 0.5) < 0.2) {
    triggers.push('Sector peers stabilise headcount — contagion wave subsides');
  }
  triggers.push('Hiring demand recovers in your target role market');
  return triggers.slice(0, 3);
}

function deriveDominantUncertainty(input: ScenarioPlanInput): string {
  if ((input.contagionProbability ?? 0) > 0.4) {
    return 'Sector contagion probability is the key variable — peer layoffs could rapidly elevate risk';
  }
  if (input.primaryCohort === 'DISTRESS') {
    return 'Company financial health trajectory is the key variable — FCF/revenue recovery or decline drives the scenario';
  }
  if (input.primaryCohort === 'EFFICIENCY') {
    return 'AI investment completion timeline is the key variable — efficiency cuts may plateau or expand';
  }
  const macroKey = macroTierToProbKey(input.macroRiskTier);
  if (macroKey === 'HIGH_MACRO' || macroKey === 'ELEVATED_MACRO') {
    return 'Macro recession probability is the key variable — broader economic conditions dominate risk';
  }
  return 'Macroeconomic conditions and sector hiring velocity are the primary uncertainties over 6 months';
}

export function computeScenarioPlan(input: ScenarioPlanInput): ScenarioPlanResult {
  const cohort = input.primaryCohort ?? 'UNKNOWN';
  const deltas = SCENARIO_DELTAS[cohort as keyof typeof SCENARIO_DELTAS] ?? SCENARIO_DELTAS.UNKNOWN;
  const probKey = macroTierToProbKey(input.macroRiskTier);
  const probs = SCENARIO_PROBABILITIES[probKey];
  const ctx: ScenarioPlanPersonalizationContext = input.personalizationContext ?? {};

  // Contagion adjustment: high contagion shifts probabilities toward bear
  const contagion = input.contagionProbability ?? 0.2;
  const contagionBearBoost = Math.min(0.15, contagion * 0.3);
  const adjustedProbs = {
    bear: Math.min(0.75, probs.bear + contagionBearBoost),
    base: probs.base,
    bull: Math.max(0.05, probs.bull - contagionBearBoost),
  };

  // MED-1: Make deltas proportional to headroom to prevent clamped nonsense.
  // A user at score=85 cannot bear-case to 107; a user at score=12 cannot bull to -10.
  const headroom = 99 - input.currentScore;
  const floor    = input.currentScore;
  const bearDelta = Math.min(deltas.bear, Math.round(headroom * 0.55));
  const baseDelta = Math.min(deltas.base, Math.round(headroom * 0.25));
  const bullDelta = Math.min(Math.abs(deltas.bull), Math.round(floor * 0.45));

  const worstScore = clampScore(input.currentScore + bearDelta);
  const baseScore  = clampScore(input.currentScore + baseDelta);
  const bestScore  = clampScore(input.currentScore - bullDelta);

  // v39.0 B4: runway-aware planning horizon. The default 6 months is
  // appropriate for comfortable runway; critical runway compresses to 2
  // months because the actionable window IS the runway. Strong runway
  // expands to 9 months because there's room for longer-trajectory bets.
  const planningHorizonMonths = (() => {
    switch (ctx.financialRunwaySituation) {
      case 'critical':    return 2;
      case 'tight':       return 4;
      case 'comfortable': return 6;
      case 'strong':      return 9;
      default:            return 6;
    }
  })();

  return {
    worstCase: {
      score: worstScore,
      probability: Math.round(adjustedProbs.bear * 100) / 100,
      triggerConditions: buildBearTriggers(input),
      recommendedActions: buildBearActions(ctx, 1.5),
    },
    baseCase: {
      score: baseScore,
      probability: Math.round(adjustedProbs.base * 100) / 100,
      triggerConditions: [
        'Current macro and sector trends continue at present pace',
        'No major new WARN filings or executive departures',
        'Company maintains current financial trajectory',
      ],
      recommendedActions: buildBaseActions(input.currentScore, ctx),
    },
    bestCase: {
      score: bestScore,
      probability: Math.round(adjustedProbs.bull * 100) / 100,
      triggerConditions: buildBullTriggers(input),
      recommendedActions: buildBullActions(ctx),
    },
    scenarioSpread: worstScore - bestScore,
    dominantUncertainty: deriveDominantUncertainty(input),
    planningHorizonMonths,
  };
}

// ─── Decade Scenarios (P15 — Build For Next Decade) ──────────────────────────
// Extends 6-month projections to 3/5/10-year horizons using a compounding decay
// model: each 6-month period's delta compounds at 0.7× of the previous.
// Geometric series sum: S(n) = (1 - 0.7^n) / (1 - 0.7)

export interface DecadeScenario extends ScenarioOutcome {
  horizonYears: 3 | 5 | 10;
  agenticCollaborationRoadmap: string[];
  worstScore: number;
  bestScore: number;
  worstProbability: number;
  bestProbability: number;
}

const AGENTIC_ROADMAPS: Record<3 | 5 | 10, Record<'bear' | 'base' | 'bull', string[]>> = {
  3: {
    bear: [
      'Year 1: Adopt 2+ AI tools to reclaim 5h/week — document the productivity gain',
      'Year 2: Complete one AI-adjacent certification to expand role options',
      'Year 3: Build AI-augmented deliverables that prove 2× output vs. peers',
    ],
    base: [
      'Year 1: Integrate AI into core workflow — move from experimenting to integrating level',
      'Year 2: Lead an AI-enabled project — visibility above your immediate team',
      'Year 3: Own a measurable AI-amplified outcome in your performance record',
    ],
    bull: [
      'Year 1: Adopt 3+ tools and build a personal AI workflow others replicate',
      'Year 2: Mentor peers on AI integration — establish internal thought leadership',
      'Year 3: Position as the AI amplification lead for your function',
    ],
  },
  5: {
    bear: [
      'Yr 1–2: AI adoption as survival mode — document every efficiency gain',
      'Yr 3: Transition to AI-adjacent role if displacement risk remains elevated',
      'Yr 4–5: Build portable skillset combining domain + AI fluency for exit optionality',
    ],
    base: [
      'Yr 1–2: Full AI integration — 2× output baseline established',
      'Yr 3: Collaborate with AI agents for research, synthesis, and draft work',
      'Yr 4–5: Manage hybrid human-AI workflows — a new seniority tier',
    ],
    bull: [
      'Yr 1–2: AI amplification drives measurable career velocity',
      'Yr 3: Lead AI-enabled team or function — expanded scope through AI leverage',
      'Yr 4–5: Architect agentic workflows for your team — next-level career capital',
    ],
  },
  10: {
    bear: [
      'Decade pivot: domain expertise + AI fluency is the defensible combination',
      'Specialist + AI operator roles persist even in high-automation environments',
      'Build career around judgment, ethics, and oversight of AI systems',
      'Target industries where regulation limits full AI replacement (healthcare, law, gov)',
    ],
    base: [
      'Human-AI collaboration is the baseline — not a differentiator, a prerequisite',
      'Career capital = unique judgment + AI orchestration + institutional trust',
      'New roles in AI governance, model evaluation, and agentic workflow design',
      'Build reputation for outcomes, not hours — AI compresses the "hours" signal',
    ],
    bull: [
      'AI amplification enables career scope unimaginable with human-only execution',
      'Individual contributors with AI reach team-level outputs',
      'Agentic AI handles routine; your career capital is in high-stakes judgment',
      'Build the professional identity vault now — credentials + network + outcomes',
    ],
  },
};

function geometricDecaySum(periods: number, decayRate = 0.7): number {
  // Sum of geometric series: 1 + r + r² + … + r^(n-1) = (1 - r^n) / (1 - r)
  return (1 - Math.pow(decayRate, periods)) / (1 - decayRate);
}

export function computeDecadeScenarios(input: ScenarioPlanInput): DecadeScenario[] {
  const cohort = input.primaryCohort ?? 'UNKNOWN';
  const deltas = SCENARIO_DELTAS[cohort as keyof typeof SCENARIO_DELTAS] ?? SCENARIO_DELTAS.UNKNOWN;

  const horizons: Array<3 | 5 | 10> = [3, 5, 10];
  return horizons.map(horizonYears => {
    const periods = horizonYears * 2; // 6-month periods
    const bearMultiplier  = geometricDecaySum(periods);
    const baseMultiplier  = geometricDecaySum(periods, 0.6);
    const bullMultiplier  = geometricDecaySum(Math.min(periods, 6), 0.65);

    // Headroom guards from computeScenarioPlan
    const headroom = 99 - input.currentScore;
    const floor    = input.currentScore;
    const bearDelta = Math.min(Math.round(deltas.bear * bearMultiplier * 0.35), Math.round(headroom * 0.80));
    const baseDelta = Math.min(Math.round(deltas.base * baseMultiplier * 0.20), Math.round(headroom * 0.50));
    const bullDelta = Math.min(Math.round(Math.abs(deltas.bull) * bullMultiplier * 0.25), Math.round(floor * 0.70));

    const probBear = Math.max(0.10, Math.min(0.65, 0.25 + horizonYears * 0.02));
    const probBull = Math.max(0.10, Math.min(0.50, 0.25 + horizonYears * 0.01));
    const probBase = Math.max(0.10, 1 - probBear - probBull);

    const scenario: 'bear' | 'base' | 'bull' =
      input.currentScore >= 65 ? 'bear' : input.currentScore >= 35 ? 'base' : 'bull';

    return {
      horizonYears,
      score: clampScore(input.currentScore + baseDelta),
      probability: Math.round(probBase * 100) / 100,
      triggerConditions: [
        `Current AI adoption trajectory held over ${horizonYears} years`,
        `Macro regime shifts ${Math.floor(horizonYears / 2)} times (historically observed frequency)`,
      ],
      recommendedActions: AGENTIC_ROADMAPS[horizonYears][scenario],
      agenticCollaborationRoadmap: AGENTIC_ROADMAPS[horizonYears][
        input.currentScore >= 65 ? 'bear' : input.currentScore <= 30 ? 'bull' : 'base'
      ],
      worstScore: clampScore(input.currentScore + bearDelta),
      bestScore: clampScore(input.currentScore - bullDelta),
      worstProbability: Math.round(probBear * 100) / 100,
      bestProbability: Math.round(probBull * 100) / 100,
    };
  });
}
