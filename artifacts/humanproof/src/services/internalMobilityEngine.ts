/**
 * internalMobilityEngine.ts — v12.0
 *
 * Intra-company transfer viability analysis.
 *
 * Data shows that 30% of employees who survive large-scale layoffs do so
 * via internal transfer to a different team or business unit. The platform
 * currently treats layoff survival as binary — this engine models the
 * "internal escape" option, which is the fastest and lowest-friction path.
 *
 * Key insight: internal transfers are most feasible BEFORE announcements
 * (when headcount is still being allocated) and become much harder once
 * WARN notices are filed or announcements are made. This creates a "golden
 * window" when collapse stage ≥ 2 is detected.
 *
 * UNCALIBRATED — viability scores and transfer rates are developer estimates.
 */

import type { DepartmentRiskResult } from './departmentRiskEngine';

export interface InternalMobilityInputs {
  department: string;
  companyName: string;
  currentScore: number;
  breakdown: {
    L1: number; L2: number; L3: number; L4: number; L5: number;
    D6?: number; D7?: number; D8?: number;
  };
  companySize: 'small' | 'mid' | 'large' | 'mega';
  departmentRisk?: DepartmentRiskResult;
  tenureYears: number;
  hasAiSkills?: boolean;
  oracleKey: string;
  industry: string;
  /** From collapsePredictor — null/undefined = not in pre-collapse phase */
  collapseStage?: 1 | 2 | 3 | null;
}

export interface InternalTarget {
  department: string;
  riskLevel: 'low' | 'moderate' | 'high';
  /** e.g. "Likely 2–4 open roles" — not exact count */
  estimatedOpenings: string;
  /** 0–100 fit for this user given their current skills */
  fitScore: number;
  /** What transfers directly from the current role */
  keyBridge: string;
}

export interface InternalMobilityResult {
  internalTransferViability: 'HIGH' | 'MODERATE' | 'LOW' | 'NONE';
  viabilityScore: number;
  targetDepartments: InternalTarget[];
  requiredSkillGaps: string[];
  estimatedTransferTimelineWeeks: number;
  internalJobSearchStrategy: string;
  riskReductionIfTransferred: number;
  survivalRateBoost: number;
  isGoldenWindow: boolean;
  viabilityRationale: string;
}

// Departments that are typically growing / protected during AI efficiency restructuring
const LOW_RISK_DEPARTMENTS_BY_ARCHETYPE: Record<string, string[]> = {
  ai_efficiency_restructuring: ['Platform', 'Infrastructure', 'AI / ML', 'Security', 'Cloud'],
  financial_distress_layoff:   ['Revenue', 'Sales Engineering', 'Enterprise', 'Finance'],
  sector_wave:                 ['Data', 'Analytics', 'Strategy', 'Product'],
  default:                     ['Engineering', 'Product', 'Data', 'Security', 'Cloud'],
};

// Typical cross-functional skills that allow internal transfer
const CROSS_FUNCTIONAL_BRIDGES: Record<string, string[]> = {
  'software': ['Technical project coordination', 'System design knowledge', 'API integration'],
  'data':     ['Data modeling', 'SQL / analytics', 'Dashboard building'],
  'product':  ['Requirements gathering', 'Stakeholder management', 'Roadmap planning'],
  'hr':       ['Process design', 'Communication', 'Change management'],
  'finance':  ['Budget management', 'Reporting', 'Vendor management'],
  'marketing':['Content creation', 'Analytics', 'Campaign management'],
  'sales':    ['Customer discovery', 'Objection handling', 'CRM expertise'],
  'default':  ['Project management', 'Documentation', 'Cross-team coordination'],
};

function detectArchetypeFromBreakdown(breakdown: InternalMobilityInputs['breakdown']): string {
  if (breakdown.D8 != null && breakdown.D8 >= 0.35 && breakdown.L1 < 0.45) return 'ai_efficiency_restructuring';
  if (breakdown.L1 >= 0.70 && breakdown.L2 >= 0.50) return 'financial_distress_layoff';
  if (breakdown.L4 >= 0.65) return 'sector_wave';
  return 'default';
}

export function computeInternalMobility(inputs: InternalMobilityInputs): InternalMobilityResult {
  const {
    department,
    companySize,
    currentScore,
    breakdown,
    tenureYears,
    hasAiSkills,
    oracleKey,
    industry,
    collapseStage,
    departmentRisk,
  } = inputs;

  // Small companies have no meaningful internal market
  if (companySize === 'small') {
    return {
      internalTransferViability: 'NONE',
      viabilityScore: 0,
      targetDepartments: [],
      requiredSkillGaps: [],
      estimatedTransferTimelineWeeks: 0,
      internalJobSearchStrategy: '',
      riskReductionIfTransferred: 0,
      survivalRateBoost: 0,
      isGoldenWindow: false,
      viabilityRationale: 'Small company (<200 employees) — no internal job market exists.',
    };
  }

  // Compute base viability from company size
  const sizeViabilityBase: Record<string, number> = {
    mid: 45,
    large: 65,
    mega: 78,
  };
  let viabilityScore = sizeViabilityBase[companySize] ?? 50;

  // Tenure bonus — internal transfers require political capital and relationships
  if (tenureYears >= 3) viabilityScore += 10;
  else if (tenureYears >= 1.5) viabilityScore += 5;
  else viabilityScore -= 10; // very new employees unlikely to have internal network

  // AI skills boost (platform/ML teams actively hiring internally)
  if (hasAiSkills) viabilityScore += 8;

  // Current department risk — high-risk department = stronger transfer motivation
  if (departmentRisk && (departmentRisk as any).D9Score >= 0.7) viabilityScore += 5;

  // Score cap: if company is very healthy, internal transfer is less urgent
  if (currentScore < 40) viabilityScore -= 15;

  viabilityScore = Math.max(0, Math.min(100, viabilityScore));

  // Determine viability tier
  let internalTransferViability: InternalMobilityResult['internalTransferViability'];
  if (viabilityScore >= 65) internalTransferViability = 'HIGH';
  else if (viabilityScore >= 45) internalTransferViability = 'MODERATE';
  else if (viabilityScore >= 20) internalTransferViability = 'LOW';
  else internalTransferViability = 'NONE';

  // Golden window detection
  const isGoldenWindow = !!(
    (collapseStage === 2 || collapseStage === 3) &&
    viabilityScore >= 40 &&
    currentScore >= 55
  );

  // Identify target departments
  const archetype = detectArchetypeFromBreakdown(breakdown);
  const lowRiskDepts = LOW_RISK_DEPARTMENTS_BY_ARCHETYPE[archetype] ?? LOW_RISK_DEPARTMENTS_BY_ARCHETYPE.default;
  const currentDeptLower = department.toLowerCase();

  const targetDepartments: InternalTarget[] = lowRiskDepts
    .filter(d => !d.toLowerCase().includes(currentDeptLower) && !currentDeptLower.includes(d.toLowerCase().split(' ')[0]))
    .slice(0, 3)
    .map((dept, i) => {
      const bridgeKey = Object.keys(CROSS_FUNCTIONAL_BRIDGES).find(k =>
        oracleKey.toLowerCase().includes(k) || currentDeptLower.includes(k)
      ) ?? 'default';
      const bridges = CROSS_FUNCTIONAL_BRIDGES[bridgeKey];
      const fitScore = Math.max(30, Math.min(85, viabilityScore - i * 10 + (hasAiSkills ? 5 : 0)));

      return {
        department: dept,
        // BUG-FIX: Use a proper gradient — 1st choice is 'low', 2nd is 'moderate', 3rd is 'high'.
        // Previous code had both i=0 and i=1 as 'low' then jumped to 'moderate', which was confusing.
        // A gradient gives users meaningful signal about confidence in each recommendation.
        riskLevel: i === 0 ? 'low' : i === 1 ? 'moderate' : 'high',
        estimatedOpenings: companySize === 'mega'
          ? `Likely ${3 + i * 2}–${6 + i * 2} open roles`
          : companySize === 'large'
          ? `Likely 1–3 open roles`
          : 'Likely 0–2 open roles',
        fitScore,
        keyBridge: bridges[Math.min(i, bridges.length - 1)],
      };
    });

  // Required skill gaps
  const requiredSkillGaps: string[] = [];
  if (!hasAiSkills && archetype === 'ai_efficiency_restructuring') {
    requiredSkillGaps.push('AI tooling proficiency (Claude, Copilot, or domain-specific AI tools)');
  }
  if (archetype === 'financial_distress_layoff') {
    requiredSkillGaps.push('Revenue impact framing — quantify how your work drives business outcomes');
  }
  requiredSkillGaps.push('Internal network activation — 3+ champions in target department');

  const estimatedTransferTimelineWeeks = viabilityScore >= 65 ? 6 : viabilityScore >= 45 ? 10 : 14;

  const riskReductionIfTransferred = Math.round(
    ((departmentRisk as any)?.D9Score ?? 0.5) * 20 + 5
  );

  // BUG-FIX: Simplified from confusing `0.003 * 100` to direct `0.3`.
  // Both are mathematically identical, but the direct form is clearer.
  const survivalRateBoost = Math.round(viabilityScore * 0.3) / 100; // 0.0–0.30

  const strategy = buildStrategy(internalTransferViability, isGoldenWindow, targetDepartments, tenureYears);

  return {
    internalTransferViability,
    viabilityScore,
    targetDepartments,
    requiredSkillGaps,
    estimatedTransferTimelineWeeks,
    internalJobSearchStrategy: strategy,
    riskReductionIfTransferred,
    survivalRateBoost,
    isGoldenWindow,
    viabilityRationale: buildRationale(internalTransferViability, viabilityScore, companySize, isGoldenWindow),
  };
}

function buildStrategy(
  viability: InternalMobilityResult['internalTransferViability'],
  isGoldenWindow: boolean,
  targets: InternalTarget[],
  tenureYears: number,
): string {
  if (viability === 'NONE') return '';
  const urgency = isGoldenWindow ? 'This week:' : tenureYears < 1 ? 'Next month:' : 'Next 2–4 weeks:';
  const targetList = targets.slice(0, 2).map(t => t.department).join(' or ');
  return `${urgency} identify 1–2 people in ${targetList || 'safer departments'} who know your work. Book a 30-min coffee chat framed as "exploring cross-team opportunities." Internal referrals are the #1 internal transfer mechanism — cold applications to internal postings rarely succeed. Your goal is to be top-of-mind before any open req is posted.`;
}

function buildRationale(
  viability: InternalMobilityResult['internalTransferViability'],
  score: number,
  size: string,
  isGolden: boolean,
): string {
  if (viability === 'NONE') return 'Company too small for an internal job market.';
  const sizeNote = size === 'mega' ? 'Large company has multiple internal business units' : 'Mid/large company has limited but real internal mobility';
  const goldenNote = isGolden ? ' ⚡ Golden window: restructuring signals suggest internal transfer closing soon.' : '';
  return `${sizeNote} (viability score ${score}/100).${goldenNote}`;
}
