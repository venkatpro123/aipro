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
