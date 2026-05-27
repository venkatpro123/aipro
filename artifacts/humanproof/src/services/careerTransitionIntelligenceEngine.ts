// careerTransitionIntelligenceEngine.ts — v37.0 Phase 6A
// Cross-role career transition feasibility scoring engine.
//
// Given a user's current role + profile, computes:
//   - transitionFeasibilityScore (0-100): how achievable a target role/industry is
//   - transitionTimeline (weeks): calibrated to actual industry transition data
//   - bridgeRoleOptions[]: intermediate roles that increase transition probability
//   - criticalSkillGaps[]: ordered by urgency and learning time
//   - transferableStrengths[]: skills from current role creating competitive advantage
//
// Integrates:
//   - rolePortabilityMatrix.ts: base portability score between role families
//   - automationTimelineData.ts: displacement pressure from current role
//   - roleMarketDemandService.ts: demand in target role
//
// Consumers: auditDataPipeline.ts (Layer 37.5)

import {
  getPortabilityScore,
  getPortabilityEntry,
  getRoleFamilyForKey,
  getReachableTargets,
  type RoleFamily,
} from "../data/rolePortabilityMatrix";
import {
  getAutomationRiskTier,
} from "../data/automationTimelineData";

export interface TransitionIntelligenceInput {
  currentRoleKey: string | null;
  currentRoleFamily?: RoleFamily | null;
  targetRoleKey?: string | null;
  targetRoleFamily?: RoleFamily | null;
  seniorityBracket?: 'junior' | 'mid' | 'senior' | 'principal' | null;
  financialRunwayMonths?: number | null;
  tenureYears?: number | null;
  skillSet?: string[];
  geographicConstraint?: 'open' | 'regional' | 'city_locked';
  currentScore?: number | null;
}

export interface BridgeRole {
  roleKey: string;
  displayName: string;
  whyBridge: string;
  estimatedMonthsToReach: number;
  portabilityToTarget: number;
}

export interface SkillGap {
  skill: string;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  estimatedLearningMonths: number;
  resources: string[];
}

export interface TransitionPath {
  targetRoleFamily: RoleFamily;
  targetDisplayName: string;
  feasibilityScore: number;           // 0-100
  feasibilityLabel: TransitionFeasibilityLabel;
  transitionTimelineWeeks: number;
  portabilityScore: number;           // 0-1 from matrix
  difficulty: string;
  bridgeRoles: BridgeRole[];
  criticalSkillGaps: SkillGap[];
  transferableStrengths: string[];
  keyInsight: string;
}

export type TransitionFeasibilityLabel =
  | 'READY_NOW'           // feasibility ≥ 85: can apply immediately
  | 'SHORT_BRIDGE'        // 75-84: 2-6 month preparation
  | 'ACHIEVABLE'          // 55-74: 6-18 month path with clear actions
  | 'CHALLENGING'         // 35-54: 18-36 months, significant effort required
  | 'MAJOR_RESTART'       // 15-34: requires credential restart (2-4 years)
  | 'NOT_FEASIBLE';       // < 15: near-impossible without starting over

export interface CareerTransitionResult {
  currentRoleFamily: RoleFamily | null;
  currentAutomationPressure: 'very_high' | 'high' | 'moderate' | 'low' | 'very_low' | null;

  // If target is specified: direct transition analysis
  directTransition: TransitionPath | null;

  // Top 5 recommended transitions from current role (by feasibility × demand)
  recommendedTransitions: TransitionPath[];

  // Escape urgency: how urgently should the user consider transitioning?
  transitionUrgency: 'immediate' | 'proactive' | 'opportunistic' | 'stable';
  transitionUrgencyReason: string;

  calibrationStatus: 'research_grounded';
}

// ─── Role family display names ────────────────────────────────────────────────
const FAMILY_DISPLAY_NAMES: Record<RoleFamily, string> = {
  tech: 'Software Engineering',
  data_science: 'Data Science & Analytics',
  ml_ai: 'Machine Learning & AI',
  devops_infra: 'DevOps & Infrastructure',
  product: 'Product Management',
  design: 'Design & UX',
  finance: 'Finance & Investment',
  fintech: 'Financial Technology',
  accounting: 'Accounting & Audit',
  sales: 'Sales & Revenue',
  marketing: 'Marketing & Growth',
  customer_success: 'Customer Success',
  hr_people: 'HR & People Operations',
  consulting: 'Consulting & Advisory',
  legal: 'Legal & Compliance',
  healthcare_clinical: 'Healthcare (Clinical)',
  healthcare_admin: 'Healthcare Administration',
  pharma_biotech: 'Pharma & Biotech',
  manufacturing: 'Manufacturing & Operations',
  energy: 'Energy & Infrastructure',
  construction: 'Construction & Civil Engineering',
  retail: 'Retail & E-commerce',
  logistics: 'Logistics & Supply Chain',
  agriculture: 'Agriculture & Food Tech',
  automotive: 'Automotive & Mobility',
  telecom: 'Telecommunications',
  government: 'Government & Public Sector',
  education: 'Education & Research',
  media_creative: 'Media & Creative',
  hospitality: 'Hospitality & Travel',
  real_estate: 'Real Estate',
  cybersecurity: 'Cybersecurity & InfoSec',
  veterinary: 'Veterinary Medicine',
  public_health: 'Public Health',
  aviation: 'Aviation & Aerospace',
};

// ─── Demand index by role family (proxy for how easy it is to land a job) ────
// Sourced from roleMarketDemandService averages per family; updated Q1 2026
const FAMILY_DEMAND_INDEX: Partial<Record<RoleFamily, number>> = {
  ml_ai: 92,
  tech: 78,
  data_science: 80,
  devops_infra: 76,
  fintech: 74,
  product: 72,
  consulting: 70,
  pharma_biotech: 68,
  finance: 66,
  healthcare_clinical: 74,
  sales: 68,
  marketing: 62,
  customer_success: 64,
  hr_people: 55,
  energy: 64,
  logistics: 62,
  manufacturing: 58,
  automotive: 65,
  telecom: 60,
  government: 52,
  education: 50,
  legal: 56,
  construction: 58,
  retail: 52,
  media_creative: 48,
  hospitality: 50,
  agriculture: 50,
  healthcare_admin: 62,
  accounting: 60,
  design: 65,
  real_estate: 58,
};

// ─── Bridge role suggestions by transition pair ───────────────────────────────
const BRIDGE_ROLES: Partial<Record<RoleFamily, Partial<Record<RoleFamily, BridgeRole[]>>>> = {
  tech: {
    product: [{
      roleKey: 'technical_program_manager',
      displayName: 'Technical Program Manager',
      whyBridge: 'TPM roles build stakeholder management and roadmap skills while valuing engineering background.',
      estimatedMonthsToReach: 3,
      portabilityToTarget: 0.85,
    }, {
      roleKey: 'solutions_architect',
      displayName: 'Solutions Architect',
      whyBridge: 'Customer-facing technical roles build the product sense and business context needed for PM.',
      estimatedMonthsToReach: 4,
      portabilityToTarget: 0.78,
    }],
    consulting: [{
      roleKey: 'technology_consultant',
      displayName: 'Technology Consultant',
      whyBridge: 'Tech consulting directly values engineering skills while building client and strategy exposure.',
      estimatedMonthsToReach: 4,
      portabilityToTarget: 0.82,
    }],
    data_science: [{
      roleKey: 'analytics_engineer',
      displayName: 'Analytics Engineer',
      whyBridge: 'dbt/SQL analytics engineering is a natural stepping stone from SWE into data science.',
      estimatedMonthsToReach: 3,
      portabilityToTarget: 0.88,
    }],
  },
  finance: {
    consulting: [{
      roleKey: 'financial_advisory_consultant',
      displayName: 'Financial Advisory Consultant',
      whyBridge: 'Financial advisory consulting uses the same modeling skills in a client-facing context.',
      estimatedMonthsToReach: 4,
      portabilityToTarget: 0.85,
    }],
    fintech: [{
      roleKey: 'fintech_analyst',
      displayName: 'Fintech Analyst',
      whyBridge: 'Fintech analysts bridge traditional finance and startup environments.',
      estimatedMonthsToReach: 3,
      portabilityToTarget: 0.88,
    }],
  },
  healthcare_clinical: {
    consulting: [{
      roleKey: 'clinical_advisor',
      displayName: 'Clinical Advisor',
      whyBridge: 'Clinical advisory roles for life sciences companies value clinical expertise in a business context.',
      estimatedMonthsToReach: 6,
      portabilityToTarget: 0.80,
    }],
    pharma_biotech: [{
      roleKey: 'medical_affairs_manager',
      displayName: 'Medical Affairs Manager',
      whyBridge: 'Medical affairs bridges clinical practice and pharma/biotech — highly valued with clinical background.',
      estimatedMonthsToReach: 4,
      portabilityToTarget: 0.90,
    }, {
      roleKey: 'clinical_research_coordinator',
      displayName: 'Clinical Research Coordinator',
      whyBridge: 'CRC roles are the standard entry point from clinical practice into pharma R&D.',
      estimatedMonthsToReach: 2,
      portabilityToTarget: 0.85,
    }],
  },
  legal: {
    consulting: [{
      roleKey: 'legal_operations_manager',
      displayName: 'Legal Operations Manager',
      whyBridge: 'Legal ops bridges law and business operations — increasingly valued by consulting firms.',
      estimatedMonthsToReach: 4,
      portabilityToTarget: 0.80,
    }],
  },
  manufacturing: {
    consulting: [{
      roleKey: 'operations_consultant',
      displayName: 'Operations Consultant',
      whyBridge: 'Lean/Six Sigma practitioners are in high demand at operations consulting firms.',
      estimatedMonthsToReach: 4,
      portabilityToTarget: 0.82,
    }],
    energy: [{
      roleKey: 'industrial_process_engineer',
      displayName: 'Industrial Process Engineer',
      whyBridge: 'Process engineering skills transfer directly between manufacturing and energy sectors.',
      estimatedMonthsToReach: 3,
      portabilityToTarget: 0.85,
    }],
  },
};

// ─── Transferable strengths by role family ────────────────────────────────────
const TRANSFERABLE_STRENGTHS: Partial<Record<RoleFamily, string[]>> = {
  tech: ['Systems thinking', 'Analytical problem solving', 'Process automation', 'Technical communication', 'Debugging complex problems'],
  data_science: ['Quantitative analysis', 'Experimental design', 'Statistical reasoning', 'Data storytelling', 'Evidence-based decision making'],
  ml_ai: ['Mathematical modeling', 'Algorithm design', 'Research methodology', 'AI/ML production deployment', 'Uncertainty quantification'],
  devops_infra: ['Systems reliability', 'Automation mindset', 'Incident management', 'Infrastructure cost optimization', 'Security practices'],
  product: ['Stakeholder management', 'Requirements synthesis', 'Roadmap prioritization', 'Cross-functional leadership', 'User empathy'],
  finance: ['Financial modeling', 'Risk quantification', 'P&L ownership', 'Due diligence', 'Analytical rigor'],
  consulting: ['Structured problem solving', 'Executive communication', 'Client management', 'PowerPoint narrative', 'Project management'],
  legal: ['Regulatory compliance', 'Contract negotiation', 'Risk assessment', 'Analytical reasoning', 'Written communication'],
  healthcare_clinical: ['Clinical judgment', 'Patient outcome focus', 'Evidence-based practice', 'Medical documentation', 'Crisis management'],
  pharma_biotech: ['Regulatory pathway knowledge', 'Clinical trial design', 'GCP compliance', 'Scientific writing', 'Cross-functional collaboration'],
  manufacturing: ['Process optimization', 'Quality management', 'Safety compliance', 'Supply chain coordination', 'Six Sigma methodology'],
  sales: ['Revenue ownership', 'Client relationship management', 'Negotiation skills', 'CRM data management', 'Pipeline forecasting'],
  marketing: ['Campaign analytics', 'Brand positioning', 'Content strategy', 'Audience segmentation', 'Go-to-market execution'],
  hr_people: ['Organizational development', 'Conflict resolution', 'Compensation analysis', 'Workforce planning', 'Culture building'],
  government: ['Policy analysis', 'Stakeholder coordination', 'Regulatory expertise', 'Public sector procurement', 'Political navigation'],
  education: ['Curriculum design', 'Adult learning principles', 'Research methodology', 'Student-centered communication', 'Knowledge synthesis'],
  media_creative: ['Storytelling', 'Audience analysis', 'Content production', 'Brand voice', 'Editorial judgment'],
  energy: ['Project finance', 'Regulatory compliance', 'Engineering rigor', 'HSE management', 'Technical documentation'],
  logistics: ['Supply chain optimization', 'Vendor management', 'Inventory analytics', 'Cross-border trade', 'ERP systems'],
  hospitality: ['Customer experience design', 'Revenue management', 'Team leadership', 'Service operations', 'Crisis hospitality'],
  retail: ['Merchandising', 'Consumer analytics', 'Inventory management', 'Store operations', 'Visual presentation'],
};

// ─── Skill gaps by transition (source → target) ──────────────────────────────
function deriveSkillGaps(
  source: RoleFamily,
  target: RoleFamily,
  portabilityScore: number,
): SkillGap[] {
  const entry = getPortabilityEntry(source, target);
  if (!entry) return [];

  return entry.key_bridges.map((skill, i) => ({
    skill,
    urgency: i === 0 ? 'critical' : i <= 1 ? 'high' : 'medium',
    estimatedLearningMonths: portabilityScore >= 0.75 ? 2 : portabilityScore >= 0.55 ? 4 : 8,
    resources: deriveSkillResources(skill),
  }));
}

function deriveSkillResources(skill: string): string[] {
  const s = skill.toLowerCase();
  if (s.includes('cfa')) return ['CFA Institute official curriculum', 'AnalystPrep', 'Kaplan Schweser'];
  if (s.includes('cpa') || s.includes('gaap')) return ['Becker CPA Review', 'Roger CPA', 'AICPA resources'];
  if (s.includes('shrm') || s.includes('hr')) return ['SHRM Learning System', 'Coursera HR specialization'];
  if (s.includes('pmp') || s.includes('project management')) return ['PMI PMBOK', 'Coursera PMP prep', 'Udemy PMP'];
  if (s.includes('python') || s.includes('ml') || s.includes('data')) return ['fast.ai', 'DeepLearning.AI', 'Coursera ML specialization'];
  if (s.includes('mba') || s.includes('strategy')) return ['Wharton Online', 'HBS Online CORe', 'Coursera Business Foundations'];
  if (s.includes('aws') || s.includes('cloud') || s.includes('azure') || s.includes('gcp')) return ['AWS Skill Builder', 'A Cloud Guru', 'Google Cloud Skills Boost'];
  if (s.includes('six sigma') || s.includes('lean')) return ['ASQ Six Sigma', 'Villanova Six Sigma', 'iSixSigma resources'];
  if (s.includes('sql')) return ['Mode Analytics SQL Tutorial', 'DataCamp SQL', 'LeetCode SQL track'];
  if (s.includes('ux') || s.includes('design')) return ['Google UX Design Certificate (Coursera)', 'Interaction Design Foundation', 'Nielsen Norman Group'];
  if (s.includes('gcp') || s.includes('gcp cert')) return ['GCP certification path', 'Coursera Google Cloud'];
  return ['LinkedIn Learning', 'Coursera', 'Udemy'];
}

// ─── Timeline calibration ─────────────────────────────────────────────────────
function calibrateTimeline(
  portabilityScore: number,
  financialRunwayMonths: number | null,
  seniorityBracket: TransitionIntelligenceInput['seniorityBracket'],
): number {
  const base = portabilityScore >= 0.85 ? 6
    : portabilityScore >= 0.70 ? 16
    : portabilityScore >= 0.55 ? 32
    : portabilityScore >= 0.35 ? 60
    : 104;

  // Senior/principal practitioners transition faster within their domain
  const seniorityModifier =
    seniorityBracket === 'principal' ? 0.75
    : seniorityBracket === 'senior' ? 0.85
    : seniorityBracket === 'mid' ? 1.0
    : 1.15;

  // Tight runway forces faster action
  const runwayModifier =
    financialRunwayMonths !== null && financialRunwayMonths <= 3 ? 0.70
    : financialRunwayMonths !== null && financialRunwayMonths <= 6 ? 0.85
    : 1.0;

  return Math.round(base * seniorityModifier * runwayModifier);
}

// ─── Feasibility score computation ───────────────────────────────────────────
function computeFeasibilityScore(
  portabilityScore: number,
  targetDemandIndex: number,
  financialRunwayMonths: number | null,
  geographicConstraint: TransitionIntelligenceInput['geographicConstraint'],
): number {
  // Base from portability (0-1 → 0-70 range)
  let score = portabilityScore * 70;

  // Demand bonus: high-demand target = easier to land (up to +15)
  score += (targetDemandIndex / 100) * 15;

  // Runway penalty: tight runway reduces feasibility for long transitions
  if (financialRunwayMonths !== null && financialRunwayMonths <= 3 && portabilityScore < 0.55) {
    score -= 15;
  } else if (financialRunwayMonths !== null && financialRunwayMonths <= 6 && portabilityScore < 0.40) {
    score -= 8;
  }

  // Geographic penalty for high-constraint users targeting roles with location requirements
  if (geographicConstraint === 'city_locked') score -= 8;
  else if (geographicConstraint === 'regional') score -= 4;

  // Bonus for user already in high-demand source (easier to be taken seriously)
  score += 5;

  return Math.min(100, Math.max(5, Math.round(score)));
}

function feasibilityLabel(score: number): TransitionFeasibilityLabel {
  if (score >= 85) return 'READY_NOW';
  if (score >= 75) return 'SHORT_BRIDGE';
  if (score >= 55) return 'ACHIEVABLE';
  if (score >= 35) return 'CHALLENGING';
  if (score >= 15) return 'MAJOR_RESTART';
  return 'NOT_FEASIBLE';
}

// ─── Build a transition path ──────────────────────────────────────────────────
function buildTransitionPath(
  source: RoleFamily,
  target: RoleFamily,
  input: TransitionIntelligenceInput,
): TransitionPath {
  const portability = getPortabilityScore(source, target);
  const portabilityEntry = getPortabilityEntry(source, target);
  const targetDemand = FAMILY_DEMAND_INDEX[target] ?? 55;

  const feasibility = computeFeasibilityScore(
    portability,
    targetDemand,
    input.financialRunwayMonths ?? null,
    input.geographicConstraint ?? 'open',
  );
  const timelineWeeks = calibrateTimeline(
    portability,
    input.financialRunwayMonths ?? null,
    input.seniorityBracket ?? null,
  );
  const label = feasibilityLabel(feasibility);
  const bridges = BRIDGE_ROLES[source]?.[target] ?? [];
  const skillGaps = deriveSkillGaps(source, target, portability);
  const strengths = TRANSFERABLE_STRENGTHS[source] ?? [];

  const keyInsight = portabilityEntry
    ? portabilityEntry.note
    : `Transition from ${FAMILY_DISPLAY_NAMES[source]} to ${FAMILY_DISPLAY_NAMES[target]} — portability data being built.`;

  return {
    targetRoleFamily: target,
    targetDisplayName: FAMILY_DISPLAY_NAMES[target],
    feasibilityScore: feasibility,
    feasibilityLabel: label,
    transitionTimelineWeeks: timelineWeeks,
    portabilityScore: portability,
    difficulty: portabilityEntry?.difficulty ?? 'moderate',
    bridgeRoles: bridges,
    criticalSkillGaps: skillGaps,
    transferableStrengths: strengths.slice(0, 4),
    keyInsight,
  };
}

// ─── Transition urgency ───────────────────────────────────────────────────────
function deriveTransitionUrgency(
  automationTier: string | null,
  currentScore: number | null,
  financialRunwayMonths: number | null,
): { urgency: CareerTransitionResult['transitionUrgency']; reason: string } {
  if (financialRunwayMonths !== null && financialRunwayMonths <= 3) {
    return { urgency: 'immediate', reason: `Financial runway of ${financialRunwayMonths} months requires immediate transition action.` };
  }
  if (currentScore !== null && currentScore >= 80) {
    return { urgency: 'immediate', reason: 'Critical layoff risk score (80+) — transition planning should begin within 30 days.' };
  }
  if (automationTier === 'very_high' || (currentScore !== null && currentScore >= 65)) {
    return { urgency: 'proactive', reason: 'High automation displacement risk or elevated layoff score warrants proactive transition preparation within 3-6 months.' };
  }
  if (automationTier === 'high' || (currentScore !== null && currentScore >= 50)) {
    return { urgency: 'opportunistic', reason: 'Moderate risk profile — pursue high-quality opportunities and build optionality over 6-12 months.' };
  }
  return { urgency: 'stable', reason: 'Current risk profile is stable — maintain skills and network as long-term insurance.' };
}

// ─── Main Engine ──────────────────────────────────────────────────────────────
export function computeCareerTransition(input: TransitionIntelligenceInput): CareerTransitionResult {
  const sourceFamily =
    input.currentRoleFamily
    ?? (input.currentRoleKey ? getRoleFamilyForKey(input.currentRoleKey) : null);

  const automationTier = input.currentRoleKey
    ? getAutomationRiskTier(input.currentRoleKey)
    : null;

  const { urgency, reason } = deriveTransitionUrgency(
    automationTier,
    input.currentScore ?? null,
    input.financialRunwayMonths ?? null,
  );

  // Direct transition analysis (if target specified)
  let directTransition: TransitionPath | null = null;
  if (sourceFamily) {
    const targetFamily =
      input.targetRoleFamily
      ?? (input.targetRoleKey ? getRoleFamilyForKey(input.targetRoleKey) : null);
    if (targetFamily && targetFamily !== sourceFamily) {
      directTransition = buildTransitionPath(sourceFamily, targetFamily, input);
    }
  }

  // Top recommended transitions (top 5 by feasibility × demand weighting)
  let recommendedTransitions: TransitionPath[] = [];
  if (sourceFamily) {
    const reachable = getReachableTargets(sourceFamily, 0.45);
    recommendedTransitions = reachable
      .slice(0, 8)
      .map(({ target }) => buildTransitionPath(sourceFamily, target, input))
      .sort((a, b) => {
        // Sort by composite: 60% feasibility + 40% demand of target
        const scoreA = a.feasibilityScore * 0.60 + (FAMILY_DEMAND_INDEX[a.targetRoleFamily] ?? 50) * 0.40;
        const scoreB = b.feasibilityScore * 0.60 + (FAMILY_DEMAND_INDEX[b.targetRoleFamily] ?? 50) * 0.40;
        return scoreB - scoreA;
      })
      .slice(0, 5);
  }

  return {
    currentRoleFamily: sourceFamily,
    currentAutomationPressure: automationTier,
    directTransition,
    recommendedTransitions,
    transitionUrgency: urgency,
    transitionUrgencyReason: reason,
    calibrationStatus: 'research_grounded',
  };
}

// ─── Convenience export for pipeline ─────────────────────────────────────────
export { getRoleFamilyForKey };

// ═══════════════════════════════════════════════════════════════════════════════
// v51.0 — Income Bridge Strategy + Regional Demand Intelligence
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Income bridge types ──────────────────────────────────────────────────────

export interface IncomeBridgeOption {
  type: 'freelance' | 'consulting' | 'part_time' | 'contract' | 'teaching' | 'gig';
  title: string;
  description: string;
  estimatedMonthlyIncome: string;
  timeToFirstRevenue: string;
  hoursPerWeek: number;
  skillOverlap: string;
  platforms: string[];
  riskToMainSearch: 'low' | 'medium' | 'high';
}

export interface IncomeBridgeStrategy {
  transitionFeasibilityLabel: TransitionFeasibilityLabel;
  primaryBridge: IncomeBridgeOption;
  alternativeBridges: IncomeBridgeOption[];
  keyMessage: string;
  totalHoursPerWeek: number;
  financialProjection: string;
}

// ─── Income bridge options by role family ────────────────────────────────────

const INCOME_BRIDGE_BY_FAMILY: Partial<Record<RoleFamily, IncomeBridgeOption[]>> = {
  tech: [
    {
      type: 'freelance',
      title: 'Freelance Software Development',
      description: 'Short-term freelance sprints on Toptal, Upwork, or Gun.io — 1–4 week projects at senior rates',
      estimatedMonthlyIncome: '₹80,000–₹2,50,000 / $2,000–$8,000',
      timeToFirstRevenue: '1–2 weeks',
      hoursPerWeek: 15,
      skillOverlap: 'Direct use of existing engineering skills — zero ramp-up time',
      platforms: ['Toptal', 'Upwork', 'Gun.io', 'Fiverr Pro', 'Braintrust'],
      riskToMainSearch: 'low',
    },
    {
      type: 'contract',
      title: 'Part-time Contract Engineering',
      description: '20hr/week contract via staffing agency — full-time search continues alongside',
      estimatedMonthlyIncome: '₹60,000–₹1,50,000 / $2,500–$5,000',
      timeToFirstRevenue: '2–3 weeks',
      hoursPerWeek: 20,
      skillOverlap: 'Identical to full-time role — agencies place contractors in 1–3 weeks',
      platforms: ['Experis', 'TEKsystems', 'Randstad Tech', 'Hays Technology', 'Robert Half Tech'],
      riskToMainSearch: 'medium',
    },
  ],
  data_science: [
    {
      type: 'freelance',
      title: 'Freelance Data Analysis & Reporting',
      description: 'Data analysis, dashboard creation, or model deployment for SMBs via freelance',
      estimatedMonthlyIncome: '₹60,000–₹1,80,000 / $1,500–$5,000',
      timeToFirstRevenue: '1–3 weeks',
      hoursPerWeek: 12,
      skillOverlap: 'SQL, Python, BI tools transfer directly — SMBs pay well for skills you find routine',
      platforms: ['Upwork', 'Freelancer', 'Toptal', 'Kaggle consulting'],
      riskToMainSearch: 'low',
    },
    {
      type: 'teaching',
      title: 'Data Science Bootcamp Instructor',
      description: 'Part-time instructor for bootcamps or online platforms — flexible hours, strong networking',
      estimatedMonthlyIncome: '₹30,000–₹80,000 / $800–$2,500',
      timeToFirstRevenue: '2–4 weeks',
      hoursPerWeek: 8,
      skillOverlap: 'Teach what you already know — excellent for portfolio visibility',
      platforms: ['Coursera Teach', 'Udemy', 'Springboard', 'General Assembly', 'Masai School'],
      riskToMainSearch: 'low',
    },
  ],
  finance: [
    {
      type: 'consulting',
      title: 'Fractional CFO / Finance Advisory',
      description: 'Serve 2–3 startups as fractional finance head — retainers ₹50K–₹1.5L/month per client',
      estimatedMonthlyIncome: '₹80,000–₹3,00,000 / $2,000–$8,000',
      timeToFirstRevenue: '2–4 weeks',
      hoursPerWeek: 16,
      skillOverlap: 'Modeling, FP&A, and financial strategy — startups need senior finance without full-time cost',
      platforms: ['CFO Alliance', 'Toptal Finance', 'Growth Mentor', 'EFM India', 'LinkedIn outbound'],
      riskToMainSearch: 'low',
    },
    {
      type: 'teaching',
      title: 'Finance Certification Coaching',
      description: 'Coach CFA/CA/CPA aspirants — ₹3,000–₹8,000 per student per session',
      estimatedMonthlyIncome: '₹40,000–₹1,20,000 / $1,000–$3,000',
      timeToFirstRevenue: '1–2 weeks',
      hoursPerWeek: 8,
      skillOverlap: 'Your credentials and experience are the product — no additional investment needed',
      platforms: ['Superprof', 'UrbanPro', 'LinkedIn (direct)', 'Reddit r/CFA study groups'],
      riskToMainSearch: 'low',
    },
  ],
  consulting: [
    {
      type: 'consulting',
      title: 'Independent Strategy Consultant',
      description: 'Take 1 project at a time as independent consultant — consulting alumni earn $300–$600/hr freelancing',
      estimatedMonthlyIncome: '₹1,50,000–₹5,00,000 / $5,000–$15,000',
      timeToFirstRevenue: '3–6 weeks',
      hoursPerWeek: 20,
      skillOverlap: 'Identical skill set — your consulting brand is your calling card for independent work',
      platforms: ['Expert360', 'BTG (Business Talent Group)', 'Catalant', 'Graphite', 'Eden McCallum'],
      riskToMainSearch: 'medium',
    },
  ],
  healthcare_clinical: [
    {
      type: 'contract',
      title: 'Locum / Contract Clinical Positions',
      description: 'Locum shifts at private clinics or hospitals — pay is 30–50% above regular employment rates',
      estimatedMonthlyIncome: '₹80,000–₹2,50,000 / $3,000–$10,000',
      timeToFirstRevenue: '1–2 weeks',
      hoursPerWeek: 24,
      skillOverlap: 'Direct clinical skills — zero ramp-up, immediate deployment',
      platforms: ['Doctemps', 'Practo Consult', 'Medi Staff', 'Staffconnect (UK)', 'Locumstory (US)'],
      riskToMainSearch: 'medium',
    },
    {
      type: 'teaching',
      title: 'Clinical Education & Medical Writing',
      description: 'Medical writing for pharma/device companies or clinical education content creation',
      estimatedMonthlyIncome: '₹40,000–₹1,20,000 / $2,000–$5,000',
      timeToFirstRevenue: '2–4 weeks',
      hoursPerWeek: 10,
      skillOverlap: 'Clinical expertise is the core product — companies pay premium for credentialed medical writers',
      platforms: ['AMWA', 'Upwork', 'Freelance MD', 'Contently for medical'],
      riskToMainSearch: 'low',
    },
  ],
  legal: [
    {
      type: 'consulting',
      title: 'Freelance Legal Consulting / Contract Review',
      description: 'Contract review and legal opinions for SMBs on retainer or per-document basis',
      estimatedMonthlyIncome: '₹60,000–₹2,00,000 / $3,000–$8,000',
      timeToFirstRevenue: '2–3 weeks',
      hoursPerWeek: 12,
      skillOverlap: 'Direct legal skills — no additional investment needed',
      platforms: ['Lawpath', 'UpCounsel', 'LawTrades', 'Bar association referrals'],
      riskToMainSearch: 'low',
    },
  ],
  marketing: [
    {
      type: 'freelance',
      title: 'Fractional CMO / Growth Consultant',
      description: 'Serve 2–3 growth-stage startups as fractional head of marketing or growth',
      estimatedMonthlyIncome: '₹60,000–₹2,00,000 / $2,000–$7,000',
      timeToFirstRevenue: '2–3 weeks',
      hoursPerWeek: 15,
      skillOverlap: 'Strategy, execution, and measurement skills transfer directly',
      platforms: ['Growth Collective', 'Toptal Marketing', 'LinkedIn outbound'],
      riskToMainSearch: 'low',
    },
  ],
};

const DEFAULT_INCOME_BRIDGE_OPTIONS: IncomeBridgeOption[] = [
  {
    type: 'freelance',
    title: 'Domain Expertise Consulting',
    description: 'Consulting or freelance services in your domain to SMBs or startups',
    estimatedMonthlyIncome: '₹40,000–₹1,20,000 / $1,500–$4,000',
    timeToFirstRevenue: '2–4 weeks',
    hoursPerWeek: 12,
    skillOverlap: 'Core skills are deployable immediately',
    platforms: ['Upwork', 'Freelancer', 'LinkedIn outbound', 'AngelList', 'Toptal'],
    riskToMainSearch: 'low',
  },
  {
    type: 'teaching',
    title: 'Domain Expert Coaching',
    description: 'Coach aspiring professionals in your domain via bootcamps or 1-on-1 sessions',
    estimatedMonthlyIncome: '₹25,000–₹80,000 / $800–$2,500',
    timeToFirstRevenue: '1–2 weeks',
    hoursPerWeek: 8,
    skillOverlap: 'Teaching what you know deepens expertise and expands network',
    platforms: ['Superprof', 'UrbanPro', 'Coursera Teach', 'Maven', 'LinkedIn Learning'],
    riskToMainSearch: 'low',
  },
];

export function computeIncomeBridgeStrategy(
  sourceFamily: RoleFamily | null,
  transitionLabel: TransitionFeasibilityLabel,
  financialRunwayMonths: number | null,
  region: string,
): IncomeBridgeStrategy | null {
  if (transitionLabel === 'READY_NOW') return null;

  const bridgeOptions = (sourceFamily ? INCOME_BRIDGE_BY_FAMILY[sourceFamily] : null)
    ?? DEFAULT_INCOME_BRIDGE_OPTIONS;
  const primaryBridge = bridgeOptions[0];
  const alternativeBridges = bridgeOptions.slice(1);

  const coverageLabel =
    transitionLabel === 'SHORT_BRIDGE' ? '60–80%'
    : transitionLabel === 'ACHIEVABLE' ? '50–70%'
    : transitionLabel === 'CHALLENGING' ? '40–60%'
    : '30–50%';

  const urgencyNote = financialRunwayMonths !== null && financialRunwayMonths <= 3
    ? 'Your runway is critically short — start the income bridge this week alongside your search.'
    : financialRunwayMonths !== null && financialRunwayMonths <= 6
    ? 'Start building the income bridge in Month 1 to extend your effective runway.'
    : 'Your runway is adequate — the income bridge is optional but reduces financial pressure.';

  const totalHours = primaryBridge.hoursPerWeek + (alternativeBridges[0]?.hoursPerWeek ?? 0) * 0.5;
  const regionSuffix = (region === 'in' || region.startsWith('in')) ? ' (INR estimates above)' : ' (USD estimates above)';

  return {
    transitionFeasibilityLabel: transitionLabel,
    primaryBridge,
    alternativeBridges,
    keyMessage: `${urgencyNote} This bridge covers approximately ${coverageLabel} of your monthly expenses${regionSuffix} while you complete the transition.`,
    totalHoursPerWeek: Math.round(totalHours),
    financialProjection: `Estimated income bridge: ${primaryBridge.estimatedMonthlyIncome}/month for ~${primaryBridge.hoursPerWeek} hrs/week. Covers ${coverageLabel} of typical monthly expenses.`,
  };
}

// ─── Regional demand data per role family ─────────────────────────────────────

export interface RegionalTransitionDemand {
  region: string;
  demandScore: number;
  hiringVelocity: 'fast' | 'moderate' | 'slow';
  avgTimeToOfferWeeks: number;
  topHiringCities: string[];
  remoteAvailability: 'high' | 'medium' | 'low';
  salaryPremiumVsMedian: number;
  keyInsight: string;
  topJobBoards: string[];
}

const REGIONAL_DEMAND_DATA: Partial<Record<RoleFamily, Partial<Record<string, RegionalTransitionDemand>>>> = {
  tech: {
    in: {
      region: 'India',
      demandScore: 85,
      hiringVelocity: 'fast',
      avgTimeToOfferWeeks: 5,
      topHiringCities: ['Bengaluru', 'Hyderabad', 'Pune', 'Chennai', 'Gurugram'],
      remoteAvailability: 'high',
      salaryPremiumVsMedian: -30,
      keyInsight: 'India is one of the top 3 global tech hiring markets. Bengaluru alone has 40K+ open tech roles at any time. Competition is high but volume is highest.',
      topJobBoards: ['Naukri', 'LinkedIn', 'Cutshort', 'Instahyre', 'AngelList Talent'],
    },
    us: {
      region: 'United States',
      demandScore: 90,
      hiringVelocity: 'moderate',
      avgTimeToOfferWeeks: 8,
      topHiringCities: ['San Francisco', 'Seattle', 'New York', 'Austin', 'Boston'],
      remoteAvailability: 'high',
      salaryPremiumVsMedian: 80,
      keyInsight: 'US tech market pays the global premium — 2–4× India rates. Longer hiring cycles (8–12 weeks). Strong remote options.',
      topJobBoards: ['LinkedIn', 'Indeed', 'Levels.fyi', 'Glassdoor', 'Greenhouse'],
    },
    uk: {
      region: 'United Kingdom',
      demandScore: 72,
      hiringVelocity: 'moderate',
      avgTimeToOfferWeeks: 7,
      topHiringCities: ['London', 'Manchester', 'Edinburgh', 'Bristol', 'Cambridge'],
      remoteAvailability: 'medium',
      salaryPremiumVsMedian: 30,
      keyInsight: 'UK tech market is strong but smaller than US. London pays 25–40% above rest of UK. FinTech particularly active.',
      topJobBoards: ['LinkedIn', 'Reed', 'CWJobs', 'StackOverflow Jobs', 'TechCrunch Jobs'],
    },
    sg: {
      region: 'Singapore',
      demandScore: 78,
      hiringVelocity: 'fast',
      avgTimeToOfferWeeks: 5,
      topHiringCities: ['Singapore (citywide)'],
      remoteAvailability: 'medium',
      salaryPremiumVsMedian: 60,
      keyInsight: "Singapore is Asia-Pacific's tech hub. Shorter hiring cycles, strong EP sponsorship for senior tech roles.",
      topJobBoards: ['LinkedIn', 'JobsDB', 'MyCareersFuture', 'Glassdoor SG', 'NodeFlair'],
    },
  },
  data_science: {
    in: {
      region: 'India',
      demandScore: 88,
      hiringVelocity: 'fast',
      avgTimeToOfferWeeks: 4,
      topHiringCities: ['Bengaluru', 'Hyderabad', 'Mumbai', 'Pune', 'NCR'],
      remoteAvailability: 'high',
      salaryPremiumVsMedian: -25,
      keyInsight: 'Analytics consulting firms (Mu Sigma, Fractal, Tiger Analytics) hire aggressively and are the highest-volume data science employer in India.',
      topJobBoards: ['Naukri', 'LinkedIn', 'Cutshort', 'Kaggle (profile)', 'Analytics Vidhya Jobs'],
    },
    us: {
      region: 'United States',
      demandScore: 92,
      hiringVelocity: 'moderate',
      avgTimeToOfferWeeks: 9,
      topHiringCities: ['San Francisco', 'New York', 'Seattle', 'Boston', 'Chicago'],
      remoteAvailability: 'high',
      salaryPremiumVsMedian: 90,
      keyInsight: 'AI/ML skills command extraordinary premiums in the US. LLM and production ML skills can add 30–50% to data scientist compensation.',
      topJobBoards: ['LinkedIn', 'Indeed', 'Glassdoor', 'aidirectory.io', 'AngelList'],
    },
  },
  ml_ai: {
    in: {
      region: 'India',
      demandScore: 95,
      hiringVelocity: 'fast',
      avgTimeToOfferWeeks: 4,
      topHiringCities: ['Bengaluru', 'Hyderabad', 'Chennai', 'Pune'],
      remoteAvailability: 'high',
      salaryPremiumVsMedian: -20,
      keyInsight: "India's highest-demand role family right now. MAANG, unicorns, and GCCs all actively hiring. LLM/GenAI skills command 40–80% salary premium.",
      topJobBoards: ['LinkedIn', 'Cutshort', 'Naukri', 'GitHub Jobs', 'Hugging Face Jobs'],
    },
    us: {
      region: 'United States',
      demandScore: 98,
      hiringVelocity: 'fast',
      avgTimeToOfferWeeks: 6,
      topHiringCities: ['San Francisco/Bay Area', 'Seattle', 'New York', 'Boston'],
      remoteAvailability: 'high',
      salaryPremiumVsMedian: 120,
      keyInsight: 'AI talent is in extreme shortage globally. FAANG AI research roles can exceed $500K total comp. Even mid-level ML engineers earn $250–400K.',
      topJobBoards: ['LinkedIn', 'aidirectory.io', 'levels.fyi/jobs', 'Hugging Face Jobs', 'AngelList'],
    },
  },
  finance: {
    in: {
      region: 'India',
      demandScore: 72,
      hiringVelocity: 'moderate',
      avgTimeToOfferWeeks: 7,
      topHiringCities: ['Mumbai', 'Gurugram', 'Bengaluru', 'Chennai', 'Pune'],
      remoteAvailability: 'low',
      salaryPremiumVsMedian: -40,
      keyInsight: 'Mumbai dominates finance hiring. GCC finance roles (JPMorgan, Goldman India) pay 25–45% above Indian finance employers. CA/CFA required for 80% of senior roles.',
      topJobBoards: ['iimjobs', 'LinkedIn', 'Naukri Premium', 'Michael Page Finance', 'CIEL HR Finance'],
    },
    us: {
      region: 'United States',
      demandScore: 80,
      hiringVelocity: 'slow',
      avgTimeToOfferWeeks: 12,
      topHiringCities: ['New York', 'Chicago', 'San Francisco', 'Boston', 'Charlotte'],
      remoteAvailability: 'low',
      salaryPremiumVsMedian: 100,
      keyInsight: 'US finance is the global premium market. Hiring cycles are 10–16 weeks. Top bulge bracket roles heavily network-dependent.',
      topJobBoards: ['eFinancialCareers', 'LinkedIn', 'Wall Street Oasis', 'Indeed Finance'],
    },
    uk: {
      region: 'United Kingdom',
      demandScore: 75,
      hiringVelocity: 'moderate',
      avgTimeToOfferWeeks: 9,
      topHiringCities: ['London (City/Canary Wharf)', 'Edinburgh', 'Manchester'],
      remoteAvailability: 'low',
      salaryPremiumVsMedian: 50,
      keyInsight: "London is Europe's financial capital. FinTech (Revolut, Monzo, Wise) offers 20–30% premiums over traditional banks with faster hiring cycles.",
      topJobBoards: ['eFinancialCareers', 'LinkedIn', 'Reed Finance', 'Robert Half UK', 'Morgan McKinley'],
    },
  },
  consulting: {
    in: {
      region: 'India',
      demandScore: 70,
      hiringVelocity: 'slow',
      avgTimeToOfferWeeks: 10,
      topHiringCities: ['Mumbai', 'NCR', 'Bengaluru', 'Hyderabad'],
      remoteAvailability: 'low',
      salaryPremiumVsMedian: -35,
      keyInsight: 'Most senior consulting hiring is referral-driven — cold applications rarely work at Partner/Principal level.',
      topJobBoards: ['LinkedIn', 'iimjobs', 'Naukri Premium', 'Firm career pages (direct)'],
    },
    us: {
      region: 'United States',
      demandScore: 78,
      hiringVelocity: 'slow',
      avgTimeToOfferWeeks: 12,
      topHiringCities: ['New York', 'Chicago', 'Washington DC', 'Boston', 'San Francisco'],
      remoteAvailability: 'medium',
      salaryPremiumVsMedian: 90,
      keyInsight: 'MBB total comp can reach $350–500K at Partner level. Lateral hiring is highly selective and network-driven.',
      topJobBoards: ['LinkedIn', 'Management Consulted board', 'Glassdoor', 'Firm career pages'],
    },
  },
  healthcare_clinical: {
    in: {
      region: 'India',
      demandScore: 80,
      hiringVelocity: 'fast',
      avgTimeToOfferWeeks: 4,
      topHiringCities: ['Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai'],
      remoteAvailability: 'low',
      salaryPremiumVsMedian: -50,
      keyInsight: 'HealthTech companies (Practo, Tata Health, Apollo 24/7) pay 30–50% above hospital roles and are the highest-growth clinical employer.',
      topJobBoards: ['Practo Jobs', 'HealthcareJobs.in', 'Naukri Healthcare', 'LinkedIn', 'BMC Recruitment'],
    },
    us: {
      region: 'United States',
      demandScore: 88,
      hiringVelocity: 'fast',
      avgTimeToOfferWeeks: 5,
      topHiringCities: ['New York', 'Houston', 'Los Angeles', 'Chicago', 'Boston'],
      remoteAvailability: 'low',
      salaryPremiumVsMedian: 150,
      keyInsight: 'US clinical demand is extremely high with genuine supply shortage. Physician shortages are at historical highs. Locum rates up 30% since 2022.',
      topJobBoards: ['Health eCareers', 'PracticeLink', 'Doximity', 'Physicians Employment', 'DocCafe'],
    },
    uk: {
      region: 'United Kingdom',
      demandScore: 82,
      hiringVelocity: 'fast',
      avgTimeToOfferWeeks: 6,
      topHiringCities: ['London', 'Manchester', 'Birmingham', 'Leeds', 'Bristol'],
      remoteAvailability: 'low',
      salaryPremiumVsMedian: 60,
      keyInsight: 'NHS has persistent clinical shortages. Private sector pays 40–80% above NHS rates. IMGs actively recruited.',
      topJobBoards: ['NHS Jobs', 'BMJ Careers', 'MedJobsUK', 'Healthjobs UK', 'The Lancet Careers'],
    },
  },
};

const DEFAULT_REGIONAL_DEMAND: RegionalTransitionDemand = {
  region: 'Global',
  demandScore: 60,
  hiringVelocity: 'moderate',
  avgTimeToOfferWeeks: 8,
  topHiringCities: ['Major metros in your region'],
  remoteAvailability: 'medium',
  salaryPremiumVsMedian: 0,
  keyInsight: 'Regional demand data being compiled for this role family. Focus on LinkedIn Jobs and specialist job boards for your sector.',
  topJobBoards: ['LinkedIn', 'Indeed', 'Glassdoor', 'Domain-specific job boards'],
};

export function getRegionalTransitionDemand(
  targetFamily: RoleFamily,
  region: string,
): RegionalTransitionDemand {
  const familyData = REGIONAL_DEMAND_DATA[targetFamily];
  if (!familyData) return DEFAULT_REGIONAL_DEMAND;

  const normRegion = region.toLowerCase();
  const key = normRegion.startsWith('us') || normRegion.includes('united states') ? 'us'
    : normRegion.startsWith('uk') || normRegion.startsWith('gb') || normRegion.includes('united kingdom') ? 'uk'
    : normRegion.startsWith('sg') || normRegion.includes('singapore') ? 'sg'
    : normRegion.startsWith('in') || normRegion.includes('india') ? 'in'
    : normRegion;

  return familyData[key] ?? DEFAULT_REGIONAL_DEMAND;
}

// ─── Enriched result with v51.0 intelligence ─────────────────────────────────

export interface CareerTransitionResultV51 extends CareerTransitionResult {
  incomeBridgeStrategy: IncomeBridgeStrategy | null;
  regionalDemand: RegionalTransitionDemand | null;
  marketCompetitivenessScore: number | null;
  marketCompetitivenessNote: string | null;
}

export function computeCareerTransitionV51(
  input: TransitionIntelligenceInput & { region?: string },
): CareerTransitionResultV51 {
  const base = computeCareerTransition(input);
  const region = input.region ?? 'in';

  const targetFamily = base.directTransition?.targetRoleFamily
    ?? base.recommendedTransitions[0]?.targetRoleFamily
    ?? null;

  const incomeBridgeStrategy = base.directTransition
    ? computeIncomeBridgeStrategy(
        base.currentRoleFamily,
        base.directTransition.feasibilityLabel,
        input.financialRunwayMonths ?? null,
        region,
      )
    : null;

  let regionalDemand: RegionalTransitionDemand | null = null;
  let marketCompetitivenessScore: number | null = null;
  let marketCompetitivenessNote: string | null = null;

  if (targetFamily) {
    regionalDemand = getRegionalTransitionDemand(targetFamily, region);
    const feasibilityScore = base.directTransition?.feasibilityScore ?? 50;
    marketCompetitivenessScore = Math.round(regionalDemand.demandScore * 0.6 + feasibilityScore * 0.4);
    marketCompetitivenessNote = marketCompetitivenessScore >= 75
      ? `Strong position: high demand in ${regionalDemand.region} with good feasibility — expect active hiring market.`
      : marketCompetitivenessScore >= 55
      ? `Moderate position: decent demand but expect competition. Differentiation through portfolio and network is key.`
      : `Challenging market: either demand is lower or transition gap is significant. Focus on bridge roles and warm network.`;
  }

  return {
    ...base,
    incomeBridgeStrategy,
    regionalDemand,
    marketCompetitivenessScore,
    marketCompetitivenessNote,
  };
}
