// executiveIntelligenceEngine.ts — Wave 8.1
//
// Detects executive-profile users (C-suite, VP, Director, Founder) and
// generates tailored intelligence unavailable to IC roles:
//   • Severance calculation (weeks of salary based on tenure + title)
//   • Non-compete risk assessment (industry + state)
//   • Equity / golden parachute timing
//   • Board-pressure & successor-threat signals
//   • Executive-specific protective actions
//
// Called as an optional L57 layer — only activates when isExecutive === true.
// Results added to HybridResult as `executiveIntelligence`.

import type { UserProfile } from './userProfileService';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ExecutiveSeveranceEstimate {
  /** Minimum weeks of base salary typically negotiated */
  minWeeks: number;
  /** Maximum weeks (with negotiation) */
  maxWeeks: number;
  /** Estimated USD value at midpoint (rough; uses salaryBand midpoint) */
  estimatedUsdRange: string;
  /** Key levers to maximise the payout */
  negotiationLevers: string[];
  /** Common pitfalls executives overlook */
  pitfalls: string[];
}

export interface NonCompeteRisk {
  /** 0–100 risk of a binding non-compete limiting next opportunity */
  riskScore: number;
  /** Plain-English assessment */
  assessment: string;
  /** States/jurisdictions that rarely enforce NC agreements */
  safeJurisdictions: string[];
  /** Recommended action */
  recommendation: string;
}

export interface ExecutiveIntelligenceResult {
  /** Whether this user qualifies for executive intelligence */
  isExecutive: boolean;
  /** Detected tier for copy customisation */
  executiveTier: 'c_suite' | 'vp' | 'director' | 'founder' | 'senior_ic' | null;
  /** Severance calculator */
  severance: ExecutiveSeveranceEstimate;
  /** Non-compete risk */
  nonCompeteRisk: NonCompeteRisk;
  /** Board / successor pressure score 0–100 */
  boardPressureScore: number;
  /** Readable board pressure narrative */
  boardPressureNarrative: string;
  /** Successor-threat signal — title hired ≤12mo ago with same scope */
  successorThreatNarrative: string | null;
  /** Urgency qualifier for the equity vest alert */
  equityUrgency: 'none' | 'watch' | 'high' | 'critical';
  /** Prioritised list of executive-specific protective actions */
  priorityActions: Array<{
    title: string;
    rationale: string;
    timeEstimate: string;
    urgency: 'critical' | 'high' | 'medium';
  }>;
  /** One-line synthesis for the top of the panel */
  headline: string;
}

// ── Executive title detection ─────────────────────────────────────────────────

const C_SUITE_RE = /\b(CEO|COO|CTO|CFO|CMO|CRO|CPO|CISO|Chief\s+(Executive|Operating|Technology|Financial|Marketing|Revenue|Product|Security|People|HR))\b/i;
const VP_RE = /\b(Vice\s+President|VP\b|EVP\b|SVP\b|Senior\s+Vice\s+President|Executive\s+Vice\s+President)\b/i;
const DIRECTOR_RE = /\bDirector\b/i;
const FOUNDER_RE = /\b(Founder|Co-Founder|Owner|Managing\s+Partner|Managing\s+Director)\b/i;
const SENIOR_IC_RE = /\b(Staff\s+(Engineer|Architect|Scientist)|Principal\s+(Engineer|Architect|Scientist|PM)|Distinguished\s+Engineer|Fellow\b)\b/i;

export function detectExecutiveTier(
  jobTitle?: string | null,
  salaryBand?: string | null,
): { isExecutive: boolean; tier: ExecutiveIntelligenceResult['executiveTier'] } {
  const t = jobTitle ?? '';
  if (C_SUITE_RE.test(t))  return { isExecutive: true, tier: 'c_suite' };
  if (FOUNDER_RE.test(t))  return { isExecutive: true, tier: 'founder' };
  if (VP_RE.test(t))       return { isExecutive: true, tier: 'vp' };
  if (DIRECTOR_RE.test(t)) return { isExecutive: true, tier: 'director' };
  // High-comp senior ICs get executive-adjacent intelligence
  if (SENIOR_IC_RE.test(t) && (salaryBand === '150-250k' || salaryBand === '250k+')) {
    return { isExecutive: true, tier: 'senior_ic' };
  }
  // High salary with no seniority title — likely executive
  if (salaryBand === '250k+' && t.length > 2) {
    return { isExecutive: true, tier: 'vp' };
  }
  return { isExecutive: false, tier: null };
}

// ── Salary band midpoint lookup (USD/year) ────────────────────────────────────

const SALARY_MIDPOINTS: Record<string, number> = {
  '<50k':     40_000,
  '50-100k':  75_000,
  '100-150k': 125_000,
  '150-250k': 200_000,
  '250k+':    350_000,
};

function salaryMidpoint(band: string | null | undefined): number {
  return SALARY_MIDPOINTS[band ?? ''] ?? 100_000;
}

// ── Severance estimator ───────────────────────────────────────────────────────

const SEVERANCE_WEEKS_BY_TIER: Record<string, [number, number]> = {
  c_suite:   [52, 104],
  founder:   [26,  78],
  vp:        [26,  52],
  director:  [13,  26],
  senior_ic: [12,  20],
};

function computeSeverance(
  tier: ExecutiveIntelligenceResult['executiveTier'],
  tenureYears: number | null | undefined,
  salaryBand: string | null | undefined,
): ExecutiveSeveranceEstimate {
  const [baseMin, baseMax] = SEVERANCE_WEEKS_BY_TIER[tier ?? 'director'] ?? [12, 24];
  const tenureBonus = Math.min(Math.floor((tenureYears ?? 0) / 2), 12); // +1 week per 2yr tenure, cap 12wk
  const minWeeks = baseMin + tenureBonus;
  const maxWeeks = baseMax + tenureBonus;

  const annualSalary = salaryMidpoint(salaryBand);
  const midWeeks = Math.round((minWeeks + maxWeeks) / 2);
  const midValue = Math.round((annualSalary / 52) * midWeeks);
  const minValue = Math.round((annualSalary / 52) * minWeeks);
  const maxValue = Math.round((annualSalary / 52) * maxWeeks);

  const estimatedUsdRange = `$${(minValue / 1000).toFixed(0)}K – $${(maxValue / 1000).toFixed(0)}K`;

  const levers = [
    'Extended health benefits (COBRA coverage for 18–24 months)',
    'Accelerated equity vesting on termination without cause',
    'Outplacement services budget ($15K–$50K)',
    'Non-disparagement mutual clause (protects both sides)',
    'Retention of company phone, laptop, and email access for 30 days',
    tier === 'c_suite' ? 'D&O tail coverage extension (3–6 years)' : null,
    tier === 'c_suite' || tier === 'vp' ? 'Reference script agreement (specific language, not just dates)' : null,
  ].filter((v): v is string => v !== null);

  const pitfalls = [
    'Signing without negotiating — first offer is rarely final at this level',
    'Missing the clawback clause review (performance bonus recovery)',
    'Neglecting state-law protections (CA, NY, MA restrict non-competes)',
    tier === 'c_suite' ? 'Forgetting to negotiate Section 280G golden parachute excise tax protection' : null,
    'Releasing claims before understanding full severance scope',
  ].filter((v): v is string => v !== null);

  return { minWeeks, maxWeeks, estimatedUsdRange, negotiationLevers: levers, pitfalls };
}

// ── Non-compete risk ──────────────────────────────────────────────────────────

function computeNonCompeteRisk(
  tier: ExecutiveIntelligenceResult['executiveTier'],
  metro: string | null | undefined,
): NonCompeteRisk {
  const m = (metro ?? '').toLowerCase();

  // California, North Dakota, Oklahoma, Minnesota largely ban enforcement
  const lowEnforcementJurisdictions = ['san_francisco', 'los_angeles', 'san_jose', 'san_diego', 'sacramento',
    'north_dakota', 'oklahoma_city', 'minneapolis'];
  const isLowEnforcement = lowEnforcementJurisdictions.some(j => m.includes(j.replace(/_/g, ' ')) || m.includes(j));

  let riskScore = 45;
  if (tier === 'c_suite') riskScore += 30;
  else if (tier === 'vp') riskScore += 20;
  else if (tier === 'founder') riskScore += 15;
  if (isLowEnforcement) riskScore = Math.max(10, riskScore - 40);

  riskScore = Math.min(100, riskScore);

  const assessment = riskScore >= 60
    ? 'High risk. Executives at your level commonly receive enforceable non-competes in this jurisdiction. Review the scope (geography + duration) immediately.'
    : riskScore >= 35
    ? 'Moderate risk. Non-compete exists but enforceability depends on scope and state law. Get legal review before signing any severance.'
    : 'Low risk. Your jurisdiction significantly limits non-compete enforcement. Standard garden-leave clauses are typical and usually don\'t block lateral moves.';

  return {
    riskScore,
    assessment,
    safeJurisdictions: ['California', 'North Dakota', 'Minnesota (2023+)', 'FTC rule pending'],
    recommendation: riskScore >= 60
      ? 'Retain an employment attorney before accepting any severance with non-compete language.'
      : 'Standard review with in-house counsel or one-time attorney consultation is sufficient.',
  };
}

// ── Board pressure score ──────────────────────────────────────────────────────

function computeBoardPressure(
  companyScore: number,
  tier: ExecutiveIntelligenceResult['executiveTier'],
): { score: number; narrative: string; successorThreat: string | null } {
  // Board pressure correlates with overall company stress + executive exposure
  const tierMultiplier = { c_suite: 1.4, founder: 1.0, vp: 1.1, director: 0.8, senior_ic: 0.5 };
  const raw = Math.round(companyScore * (tierMultiplier[tier ?? 'director'] ?? 1.0));
  const score = Math.min(100, raw);

  const narrative = score >= 75
    ? `High board pressure. At ${companyScore}/100 company risk with ${tier?.replace('_', ' ')} exposure, expect performance scrutiny within the next 1–2 board cycles. Proactively align with at least 2 board members on your team's contribution before Q-end.`
    : score >= 50
    ? `Moderate board pressure. Company signals suggest cost conversations are in progress. As ${tier?.replace('_', ' ')}, you are visible in those discussions. Build a compelling "value per dollar" narrative now.`
    : `Manageable board pressure. Company signals are mixed but not alarming. Use this window to deepen board relationships before stress increases.`;

  const successorThreat = companyScore >= 65 && (tier === 'c_suite' || tier === 'vp')
    ? `If a VP or Director was hired into a scope overlapping yours in the past 12 months, that is a common predecessor-replacement pattern. Check LinkedIn for recent hires at your reporting level.`
    : null;

  return { score, narrative, successorThreat };
}

// ── Equity urgency ────────────────────────────────────────────────────────────

function classifyEquityUrgency(
  hasEquityVesting: boolean | null | undefined,
  equityVestMonths: number | null | undefined,
  companyScore: number,
): ExecutiveIntelligenceResult['equityUrgency'] {
  if (!hasEquityVesting || equityVestMonths == null) return 'none';
  if (equityVestMonths <= 3 && companyScore >= 55) return 'critical';
  if (equityVestMonths <= 6 && companyScore >= 50) return 'high';
  if (equityVestMonths <= 12 && companyScore >= 45) return 'watch';
  return 'none';
}

// ── Priority actions for executives ──────────────────────────────────────────

function buildExecutiveActions(
  tier: ExecutiveIntelligenceResult['executiveTier'],
  companyScore: number,
  boardScore: number,
  ncRisk: NonCompeteRisk,
  equityUrgency: ExecutiveIntelligenceResult['equityUrgency'],
): ExecutiveIntelligenceResult['priorityActions'] {
  const actions: ExecutiveIntelligenceResult['priorityActions'] = [];

  if (equityUrgency === 'critical' || equityUrgency === 'high') {
    actions.push({
      title: 'Negotiate accelerated vest or retention bonus',
      rationale: `You have unvested equity at risk. At company score ${companyScore}/100, restructuring could be announced before your next cliff. Lock in a retention bonus or accelerated-vest clause NOW — leverage decreases after any announcement.`,
      timeEstimate: '2–4 weeks',
      urgency: equityUrgency === 'critical' ? 'critical' : 'high',
    });
  }

  if (boardScore >= 65 && (tier === 'c_suite' || tier === 'vp')) {
    actions.push({
      title: 'Schedule skip-level check-in with at least one board member',
      rationale: 'Board members form impressions during reporting cycles — not in a crisis. Proactive relationship-building now gives you an advocate if performance conversations begin.',
      timeEstimate: '1–2 weeks',
      urgency: 'high',
    });
  }

  if (ncRisk.riskScore >= 60) {
    actions.push({
      title: 'Review non-compete clause with employment attorney',
      rationale: `Non-compete risk: ${ncRisk.riskScore}/100. At your level, a binding clause could block lateral moves for 12–24 months. Understand your exposure now — before you need to act.`,
      timeEstimate: '1 week',
      urgency: 'high',
    });
  }

  actions.push({
    title: 'Document your wins and build a "value per dollar" narrative',
    rationale: 'The most common executive departure trigger is a board narrative about cost vs. value. A pre-built impact document (team results, cost savings, revenue attributed) gives you optionality in any negotiation.',
    timeEstimate: '3–5 hours',
    urgency: companyScore >= 65 ? 'high' : 'medium',
  });

  if (tier !== 'senior_ic') {
    actions.push({
      title: 'Activate your executive network — 5 strategic 1:1s',
      rationale: 'Executive searches fill 80% of C-suite and VP roles through referral networks, not job boards. Re-activating 5 key relationships now gives you a hidden pipeline before you need it.',
      timeEstimate: '2–3 weeks',
      urgency: companyScore >= 55 ? 'high' : 'medium',
    });
  }

  // Sort: critical first, then high, then medium
  const ORDER = { critical: 0, high: 1, medium: 2 };
  actions.sort((a, b) => ORDER[a.urgency] - ORDER[b.urgency]);

  return actions.slice(0, 5);
}

// ── Main entry point ──────────────────────────────────────────────────────────

export function runExecutiveIntelligence(
  profile: UserProfile | null,
  companyScore: number,
): ExecutiveIntelligenceResult {
  const { isExecutive, tier } = detectExecutiveTier(profile?.jobTitle, profile?.salaryBand);

  if (!isExecutive || !tier) {
    return {
      isExecutive: false,
      executiveTier: null,
      severance: { minWeeks: 0, maxWeeks: 0, estimatedUsdRange: 'N/A', negotiationLevers: [], pitfalls: [] },
      nonCompeteRisk: { riskScore: 0, assessment: '', safeJurisdictions: [], recommendation: '' },
      boardPressureScore: 0,
      boardPressureNarrative: '',
      successorThreatNarrative: null,
      equityUrgency: 'none',
      priorityActions: [],
      headline: '',
    };
  }

  const severance = computeSeverance(tier, profile?.tenureYears, profile?.salaryBand);
  const nonCompeteRisk = computeNonCompeteRisk(tier, profile?.metro ?? profile?.metroArea);
  const { score: boardPressureScore, narrative: boardPressureNarrative, successorThreat: successorThreatNarrative }
    = computeBoardPressure(companyScore, tier);
  const equityUrgency = classifyEquityUrgency(
    profile?.hasEquityVesting, profile?.equityVestMonths, companyScore,
  );
  const priorityActions = buildExecutiveActions(tier, companyScore, boardPressureScore, nonCompeteRisk, equityUrgency);

  const tierLabel = {
    c_suite: 'C-suite',
    vp: 'VP-level',
    director: 'Director-level',
    founder: 'Founder',
    senior_ic: 'Staff/Principal',
  }[tier];

  const headline = companyScore >= 65
    ? `${tierLabel} exposure at company risk ${companyScore}/100 — negotiate now, not after the announcement.`
    : `${tierLabel} intelligence: your leverage window is open. Use it.`;

  return {
    isExecutive: true,
    executiveTier: tier,
    severance,
    nonCompeteRisk,
    boardPressureScore,
    boardPressureNarrative,
    successorThreatNarrative,
    equityUrgency,
    priorityActions,
    headline,
  };
}
