// freelancerIntelligenceEngine.ts — Wave 8.4
//
// Detects freelancer / independent contractor / consultant users and produces
// intelligence unique to their employment structure — risks that the standard
// full-time pipeline completely misses:
//
//   • Client concentration risk (one client = catastrophic single-point failure)
//   • Contract diversity (short-term project hopping vs retainer stability)
//   • Rate volatility & market positioning
//   • Emergency pipeline building actions
//   • Platform dependency risk (Upwork/Fiverr/direct — platform can ban overnight)
//   • Financial runway gap (irregular income makes standard runway calc wrong)
//
// Detection uses job-title regex — no DB migration required.
// Only activates when isFreelancer === true.

import type { UserProfile } from './userProfileService';

// ── Types ─────────────────────────────────────────────────────────────────────

export type FreelancerType =
  | 'freelancer'       // Project-based, typically ≤3mo engagements
  | 'consultant'       // Strategy / advisory, often retainer-based
  | 'contractor'       // 6–18mo contract roles (W2 or C2C)
  | 'agency_owner'     // Runs a small agency with subcontractors
  | 'solopreneur';     // Product/service business, self-employed

export interface ClientConcentrationRisk {
  /** 0–100. 100 = all income from one client. */
  score: number;
  /** Plain-English tier */
  tier: 'catastrophic' | 'high' | 'moderate' | 'healthy';
  /** What a single client loss means */
  lossImpact: string;
  /** Recommended diversification target */
  recommendation: string;
}

export interface PipelineDiversification {
  /** Current pipeline health 0–100 */
  score: number;
  /** Whether the user relies on a single sourcing platform */
  platformDependency: boolean;
  /** Recommended active pipeline channels */
  channels: string[];
  /** Urgency of pipeline work */
  urgency: 'critical' | 'high' | 'medium' | 'low';
}

export interface FreelancerFinancialProfile {
  /** Recommended emergency fund in months (higher than employee standard) */
  recommendedRunwayMonths: number;
  /** Gap from current runway */
  runwayGapMonths: number | null;
  /** Tax reserve % of gross income recommended */
  taxReservePct: number;
  /** Rate benchmarking note */
  rateBenchmark: string;
}

export interface FreelancerIntelligenceResult {
  /** Whether this user qualifies for freelancer intelligence */
  isFreelancer: boolean;
  /** Detected freelancer archetype */
  freelancerType: FreelancerType | null;
  /** Client concentration risk */
  clientConcentration: ClientConcentrationRisk;
  /** Pipeline diversification assessment */
  pipelineDiversification: PipelineDiversification;
  /** Financial profile adjusted for variable income */
  financialProfile: FreelancerFinancialProfile;
  /** Prioritised protective actions specific to freelancers */
  priorityActions: Array<{
    title: string;
    rationale: string;
    timeEstimate: string;
    urgency: 'critical' | 'high' | 'medium';
    category: 'pipeline' | 'financial' | 'legal' | 'positioning';
  }>;
  /** One-line headline for the panel header */
  headline: string;
  /** Risk summary for the top card */
  riskSummary: string;
}

// ── Freelancer detection ──────────────────────────────────────────────────────

const FREELANCER_RE = /\b(Freelance|Freelancer)\b/i;
const CONSULTANT_RE = /\b(Consultant|Consulting|Advisory|Advisor)\b/i;
const CONTRACTOR_RE = /\b(Contractor|Contract\s+Worker|Independent\s+Contractor|C2C|W2\s+Contractor)\b/i;
const AGENCY_RE = /\b(Agency\s+Owner|Studio\s+Owner|Managing\s+Director)\b/i;
const SOLOPRENEUR_RE = /\b(Solopreneur|Self[- ]Employed|Self[- ]Employed|Business\s+Owner|Proprietor)\b/i;

export function detectFreelancerType(
  jobTitle?: string | null,
  tenureYears?: number | null,
): { isFreelancer: boolean; type: FreelancerType | null } {
  const t = jobTitle ?? '';
  if (AGENCY_RE.test(t))     return { isFreelancer: true, type: 'agency_owner' };
  if (SOLOPRENEUR_RE.test(t)) return { isFreelancer: true, type: 'solopreneur' };
  if (CONTRACTOR_RE.test(t)) return { isFreelancer: true, type: 'contractor' };
  if (CONSULTANT_RE.test(t)) return { isFreelancer: true, type: 'consultant' };
  if (FREELANCER_RE.test(t)) return { isFreelancer: true, type: 'freelancer' };
  return { isFreelancer: false, type: null };
}

// ── Client concentration risk ─────────────────────────────────────────────────

function computeClientConcentration(
  type: FreelancerType,
  companyScore: number,
): ClientConcentrationRisk {
  // Without actual client data, we model risk from: type + the company score
  // (auditing a single "company" is itself a signal of high concentration)
  const isAuditingOneClient = companyScore > 0; // They audited ONE company — likely their primary client

  const score = isAuditingOneClient
    ? type === 'freelancer' || type === 'contractor' ? 75 : 60
    : 40;

  const tier: ClientConcentrationRisk['tier'] =
    score >= 75 ? 'catastrophic' :
    score >= 55 ? 'high' :
    score >= 35 ? 'moderate' : 'healthy';

  const lossImpact = {
    catastrophic: 'Losing this client = 100% income loss overnight. No safety net between here and zero.',
    high: 'Losing this client means 60–80% income loss — critical runway impact within weeks.',
    moderate: 'Losing this client would hurt but not be fatal — if your other clients hold.',
    healthy: 'Good distribution. No single client is catastrophic to your income.',
  }[tier];

  const recommendation = tier === 'catastrophic' || tier === 'high'
    ? 'Target 3+ active clients so no single one exceeds 40% of your income. Begin outreach to 5 new prospects this month.'
    : tier === 'moderate'
    ? 'Expand your client base. Add 1–2 new retainer relationships before any gaps appear in your current work.'
    : 'Maintain your current distribution and keep your pipeline warm with monthly touchpoints.';

  return { score, tier, lossImpact, recommendation };
}

// ── Pipeline diversification ──────────────────────────────────────────────────

function computePipelineDiversification(type: FreelancerType): PipelineDiversification {
  const channels: PipelineDiversification['channels'] = [
    'Direct outreach to past clients (highest conversion rate)',
    'LinkedIn content + direct DMs (30% of freelance work)',
    'Referral network activation (ask 3 past clients for introductions)',
    'Niche community presence (Slack groups, Discord, forums)',
  ];

  if (type === 'contractor') {
    channels.push('Staffing agency registration (Hays, Robert Half, TEKsystems)');
    channels.push('C2C marketplace (Upwork Enterprise, Toptal, Gun.io)');
  } else if (type === 'consultant') {
    channels.push('Speaking / thought leadership (one conference per quarter)');
    channels.push('Subcontracting from larger consultancies');
  } else {
    channels.push('Freelance platforms as supplemental (Upwork, Contra) — NOT primary');
  }

  return {
    score: 35, // Default moderate — no actual client data available
    platformDependency: false, // Unknown without client data
    channels: channels.slice(0, 4),
    urgency: 'high',
  };
}

// ── Financial profile for variable income ────────────────────────────────────

function computeFinancialProfile(
  type: FreelancerType,
  savingsMonthsRunway?: number | null,
  salaryBand?: string | null,
): FreelancerFinancialProfile {
  // Freelancers need 2× the runway of employees
  const recommended = type === 'contractor' ? 4 : 6; // Contractors on stable long contracts need less

  const taxReservePct = salaryBand === '250k+' ? 40
    : salaryBand === '150-250k' ? 37
    : salaryBand === '100-150k' ? 32
    : 28; // Self-employment tax + federal + state estimate

  const runwayGapMonths = savingsMonthsRunway != null
    ? Math.max(0, recommended - savingsMonthsRunway)
    : null;

  const rateBenchmark = {
    freelancer: 'Your effective hourly rate should include: project buffer (15%), admin overhead (10%), benefits self-pay (20%), tax reserve, and downtime (25% unbillable). Gross-up by 1.8× to compare with employee comp.',
    consultant: 'Daily rates for consultants typically run 0.8–1.2% of equivalent annual salary. A $150K/yr skill = $1,200–$1,800/day.',
    contractor: 'W2 contractors: aim for 1.5× your equivalent employee rate. C2C: 1.8–2.2× to cover overhead, taxes, and gaps.',
    agency_owner: 'Agency gross margins should be 30–50%. Below 25%: review scope creep, underpricing, or subcontractor cost structure.',
    solopreneur: 'Build toward a 40% gross margin. Any lower and you\'re trading time for low returns with high risk concentration.',
  }[type] ?? 'Benchmark your rate annually against current market data.';

  return {
    recommendedRunwayMonths: recommended,
    runwayGapMonths,
    taxReservePct,
    rateBenchmark,
  };
}

// ── Priority actions for freelancers ─────────────────────────────────────────

function buildFreelancerActions(
  type: FreelancerType,
  concentration: ClientConcentrationRisk,
  financial: FreelancerFinancialProfile,
  companyScore: number,
): FreelancerIntelligenceResult['priorityActions'] {
  const actions: FreelancerIntelligenceResult['priorityActions'] = [];

  // Pipeline actions (always needed when concentration is high)
  if (concentration.tier === 'catastrophic' || concentration.tier === 'high') {
    actions.push({
      title: 'Activate your referral pipeline — message 5 past clients today',
      rationale: `Client concentration is your #1 risk. Referrals convert at 60% vs cold outreach at 2–5%. Message 5 past clients this week: "Checking in — do you know anyone who needs [your service]?" This is your fastest path to a second income stream.`,
      timeEstimate: '30 minutes',
      urgency: 'critical',
      category: 'pipeline',
    });

    actions.push({
      title: 'Build a "warm prospects" list of 20 potential clients',
      rationale: 'A pipeline is only as good as the contacts in it. Map 20 companies or individuals who could use your services in the next 90 days and begin a lightweight touchpoint sequence.',
      timeEstimate: '2–3 hours',
      urgency: 'high',
      category: 'pipeline',
    });
  }

  // Financial actions
  if (financial.runwayGapMonths != null && financial.runwayGapMonths > 0) {
    actions.push({
      title: `Build ${financial.recommendedRunwayMonths}-month emergency fund (${financial.runwayGapMonths}mo gap)`,
      rationale: `Freelancers need 2× the runway of employees because income gaps are unpredictable. A ${financial.recommendedRunwayMonths}-month fund means you can absorb client loss + 8-week gap without panic-pricing or accepting bad clients.`,
      timeEstimate: 'Ongoing — set auto-transfer now',
      urgency: 'high',
      category: 'financial',
    });
  }

  // Tax reserve (often overlooked)
  actions.push({
    title: `Set aside ${financial.taxReservePct}% of every invoice for taxes`,
    rationale: `Self-employment tax + income tax = you owe more than you think. Automate a transfer of ${financial.taxReservePct}% of each payment to a separate tax account. Quarterly estimated payments are due Jan 15, Apr 15, Jun 15, Sep 15.`,
    timeEstimate: '15 minutes to set up auto-transfer',
    urgency: 'high',
    category: 'financial',
  });

  // Legal / contract protection
  actions.push({
    title: 'Audit your contract: IP ownership, kill fee, and payment terms',
    rationale: 'Three clauses protect you most: (1) Kill fee (25–50% if client cancels), (2) IP ownership remains yours until final payment, (3) Net 15 or net 30 payment terms (not net 60). Missing these costs freelancers $10K+ per year on average.',
    timeEstimate: '2 hours — template from AIGA or Shake app',
    urgency: companyScore >= 60 ? 'critical' : 'high',
    category: 'legal',
  });

  // Positioning
  if (type === 'freelancer' || type === 'consultant') {
    actions.push({
      title: 'Update LinkedIn and portfolio with 3 recent project outcomes',
      rationale: '73% of clients check LinkedIn before reaching out. Outcome-focused case studies ("Reduced infrastructure cost by 40%") convert 3× better than skill lists. Spend 2 hours this week refreshing these.',
      timeEstimate: '2 hours',
      urgency: 'medium',
      category: 'positioning',
    });
  }

  if (type === 'contractor') {
    actions.push({
      title: 'Register with 2 staffing agencies as a C2C or W2 backup',
      rationale: 'Staffing agencies provide a safety net for contractor gaps. Even if you find your own contracts, having 2 agencies aware of your availability and rates takes 1 hour and gives you a fallback within 2 weeks of going idle.',
      timeEstimate: '1 hour',
      urgency: 'medium',
      category: 'pipeline',
    });
  }

  const ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2 };
  actions.sort((a, b) => ORDER[a.urgency] - ORDER[b.urgency]);
  return actions.slice(0, 5);
}

// ── Main entry point ──────────────────────────────────────────────────────────

export function runFreelancerIntelligence(
  profile: UserProfile | null,
  companyScore: number,
): FreelancerIntelligenceResult {
  const { isFreelancer, type } = detectFreelancerType(
    profile?.jobTitle,
    profile?.tenureYears,
  );

  if (!isFreelancer || !type) {
    return {
      isFreelancer: false,
      freelancerType: null,
      clientConcentration: { score: 0, tier: 'healthy', lossImpact: '', recommendation: '' },
      pipelineDiversification: { score: 0, platformDependency: false, channels: [], urgency: 'low' },
      financialProfile: { recommendedRunwayMonths: 3, runwayGapMonths: null, taxReservePct: 28, rateBenchmark: '' },
      priorityActions: [],
      headline: '',
      riskSummary: '',
    };
  }

  const clientConcentration = computeClientConcentration(type, companyScore);
  const pipelineDiversification = computePipelineDiversification(type);
  const financialProfile = computeFinancialProfile(
    type, profile?.savingsMonthsRunway, profile?.salaryBand,
  );
  const priorityActions = buildFreelancerActions(
    type, clientConcentration, financialProfile, companyScore,
  );

  const typeLabel = {
    freelancer: 'Freelancer',
    consultant: 'Consultant',
    contractor: 'Contractor',
    agency_owner: 'Agency Owner',
    solopreneur: 'Solopreneur',
  }[type];

  const concentrationRisk = clientConcentration.tier === 'catastrophic' || clientConcentration.tier === 'high';
  const headline = concentrationRisk
    ? `${typeLabel} mode: client concentration is your #1 risk — build your pipeline now.`
    : `${typeLabel} mode: protect your income with diversified clients and strong contracts.`;

  const riskSummary = clientConcentration.tier === 'catastrophic'
    ? 'You appear to have a single primary client. If this engagement ends, your income drops to zero with no severance, no notice period, and no unemployment safety net.'
    : clientConcentration.tier === 'high'
    ? 'High client concentration detected. One client exit could trigger a financial crisis. Your emergency pipeline is your most important career asset right now.'
    : 'Your freelance structure carries unique risks compared to employment. Focus on pipeline, contracts, and financial buffers.';

  return {
    isFreelancer: true,
    freelancerType: type,
    clientConcentration,
    pipelineDiversification,
    financialProfile,
    priorityActions,
    headline,
    riskSummary,
  };
}
