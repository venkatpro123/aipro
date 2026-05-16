// automationRiskTimelineEngine.ts — v37.0 Phase 6B
// Upgraded tech stack + role automation risk engine.
//
// Extends techStackObsolescenceEngine with role-level automation timeline data
// from automationTimelineData.ts, providing:
//   1. Role-specific displacement probability by year (2026–2032)
//   2. Task-level automation analysis (which tasks automate first)
//   3. Augmentation vs. displacement distinction
//   4. Unified risk score blending tech stack obsolescence + role automation
//
// Consumers: auditDataPipeline.ts (Layer 37 upgrade)

import {
  computeTechStackObsolescence,
  type TechStackObsolescenceResult,
} from "./techStackObsolescenceEngine";
import {
  getAutomationTimeline,
  getAutomationRiskTier,
  getDisplacementProbabilityByYear,
  type AutomationTimeline,
} from "../data/automationTimelineData";

export type { TechStackObsolescenceResult };

export interface AutomationRiskInput {
  primaryTechStack?: string[];
  companyMigrationPhase?: TechStackObsolescenceResult['migrationPhase'];
  companyMainTech?: string[];
  roleKey?: string | null;
}

export type AutomationRiskLabel =
  | 'DISPLACEMENT_IMMINENT'     // role likely eliminated by 2028
  | 'HIGH_AUTOMATION_PRESSURE'  // significant displacement by 2030
  | 'AUGMENTATION_LIKELY'       // AI augments, role survives and grows
  | 'MIXED_SIGNALS'             // tech stack risky but role stable (or vice versa)
  | 'LOW_AUTOMATION_RISK'       // both role and tech stack are safe
  | 'INSUFFICIENT_DATA';

export interface AutomationRiskResult {
  // Unified blended score (0-100, higher = more at risk)
  automationRiskScore: number;
  automationRiskLabel: AutomationRiskLabel;
  automationRiskSummary: string;

  // Role-specific automation projection (from automationTimelineData)
  roleAutomation: AutomationTimeline | null;
  roleRiskTier: AutomationTimeline['riskTier'] | null;

  // Displacement probability by year for this role
  displacementBy2026: number;
  displacementBy2028: number;
  displacementBy2030: number;
  displacementBy2032: number;

  // Tech stack component (from techStackObsolescenceEngine)
  techStack: TechStackObsolescenceResult;

  // Actionable intelligence
  topTasksAutomatingFirst: string[];
  humanEssentialTasks: string[];
  augmentationOpportunities: string[];
  bridgeSkills: string[];

  // Actions tailored to the combined risk profile
  automationActions: AutomationAction[];

  calibrationStatus: 'research_grounded';
}

export interface AutomationAction {
  action: string;
  why: string;
  urgency: 'immediate' | 'within_30d' | 'within_90d' | 'within_6m';
  category: 'upskill' | 'reposition' | 'leverage' | 'protect';
}

// ─── Risk tier → numeric score ────────────────────────────────────────────────
const TIER_BASE_SCORE: Record<AutomationTimeline['riskTier'], number> = {
  very_high: 82,
  high: 64,
  moderate: 46,
  low: 28,
  very_low: 14,
};

// ─── Blend role automation score + tech stack obsolescence score ──────────────
function blendScores(roleScore: number, techScore: number): number {
  // Role automation weighted 60% (more directly relevant), tech stack 40%
  return Math.round(roleScore * 0.60 + techScore * 0.40);
}

function deriveLabel(
  blended: number,
  augmentationProbability: number,
  displacementBy2028: number,
): AutomationRiskLabel {
  if (displacementBy2028 >= 0.30) return 'DISPLACEMENT_IMMINENT';
  if (augmentationProbability >= 0.65 && blended < 55) return 'AUGMENTATION_LIKELY';
  if (blended >= 65) return 'HIGH_AUTOMATION_PRESSURE';
  if (blended >= 40) return 'MIXED_SIGNALS';
  return 'LOW_AUTOMATION_RISK';
}

function buildSummary(
  label: AutomationRiskLabel,
  roleTimeline: AutomationTimeline | null,
  techScore: number,
): string {
  const rolePart = roleTimeline
    ? `${Math.round(roleTimeline.displacementProbability2032 * 100)}% displacement probability by 2032`
    : 'role-level automation data unavailable';
  const techPart = techScore >= 50 ? 'elevated tech stack obsolescence risk' : 'tech stack remains current';

  switch (label) {
    case 'DISPLACEMENT_IMMINENT':
      return `Critical: role faces >30% displacement risk by 2028. ${rolePart}, ${techPart}.`;
    case 'HIGH_AUTOMATION_PRESSURE':
      return `Significant automation pressure — ${rolePart}. Proactive repositioning recommended.`;
    case 'AUGMENTATION_LIKELY':
      return `AI is more likely to augment than displace this role (${Math.round((roleTimeline?.augmentationProbability ?? 0.6) * 100)}% augmentation probability). ${techPart}.`;
    case 'MIXED_SIGNALS':
      return `Mixed automation outlook — ${rolePart}. Monitor trajectory and bridge skill gaps.`;
    case 'LOW_AUTOMATION_RISK':
      return `Low automation risk — ${rolePart}. Role fundamentals remain human-essential.`;
    default:
      return `Automation impact assessment pending role data. ${techPart}.`;
  }
}

function buildActions(
  label: AutomationRiskLabel,
  roleTimeline: AutomationTimeline | null,
  techStack: TechStackObsolescenceResult,
): AutomationAction[] {
  const actions: AutomationAction[] = [];

  if (label === 'DISPLACEMENT_IMMINENT') {
    actions.push({
      action: 'Begin active transition planning toward adjacent roles with lower automation risk',
      why: `Your role faces >30% displacement by 2028. ${roleTimeline?.topTasksAtRisk[0] ?? 'Core tasks'} are automating rapidly.`,
      urgency: 'immediate',
      category: 'reposition',
    });
    if (roleTimeline?.humanEssentialTasks[0]) {
      actions.push({
        action: `Reposition toward human-essential tasks: ${roleTimeline.humanEssentialTasks.slice(0, 2).join(', ')}`,
        why: 'These tasks remain automation-resistant and will retain premium compensation.',
        urgency: 'within_30d',
        category: 'leverage',
      });
    }
  }

  if (label === 'AUGMENTATION_LIKELY') {
    actions.push({
      action: 'Master AI augmentation tools specific to your role to compound productivity and compensation leverage',
      why: `${Math.round((roleTimeline?.augmentationProbability ?? 0.6) * 100)}% of practitioners who master AI tools are seeing 20-35% productivity gains and salary premiums.`,
      urgency: 'within_30d',
      category: 'leverage',
    });
  }

  if (roleTimeline?.topTasksAtRisk[0]) {
    actions.push({
      action: `Learn AI tooling that automates ${roleTimeline.topTasksAtRisk[0].toLowerCase()} — then own the output quality layer`,
      why: 'Practitioners who control AI outputs for their highest-risk tasks become the orchestrators rather than the displaced.',
      urgency: label === 'DISPLACEMENT_IMMINENT' ? 'immediate' : 'within_90d',
      category: 'upskill',
    });
  }

  if (techStack.stackObsolescenceScore >= 50 && techStack.bridgeSkillPriority[0]) {
    actions.push({
      action: `Add bridge skills: ${techStack.bridgeSkillPriority.slice(0, 2).join(', ')}`,
      why: `Your primary tech stack shows ${techStack.primaryStackStatus.toLowerCase()} status. Bridge skills protect against migration-driven layoffs.`,
      urgency: 'within_90d',
      category: 'protect',
    });
  }

  if (roleTimeline?.automationDrivers[0]) {
    actions.push({
      action: `Audit your workflow for ${roleTimeline.automationDrivers[0]} exposure and build proficiency in it before competitors do`,
      why: 'Early adopters of the technology displacing their role gain 12-18 months of positioning advantage.',
      urgency: 'within_6m',
      category: 'upskill',
    });
  }

  // Always include at minimum one action
  if (actions.length === 0) {
    actions.push({
      action: 'Document your human-essential contributions explicitly in performance reviews and portfolio',
      why: 'Roles with lower automation risk still benefit from demonstrating irreplaceable human judgment.',
      urgency: 'within_90d',
      category: 'protect',
    });
  }

  return actions;
}

// ─── Main Engine ──────────────────────────────────────────────────────────────
export function computeAutomationRisk(input: AutomationRiskInput): AutomationRiskResult {
  const techStack = computeTechStackObsolescence({
    primaryTechStack: input.primaryTechStack ?? [],
    companyMigrationPhase: input.companyMigrationPhase ?? 'NOT_MIGRATING',
    companyMainTech: input.companyMainTech ?? [],
  });

  const roleTimeline = input.roleKey ? getAutomationTimeline(input.roleKey) : null;
  const roleTier = input.roleKey ? getAutomationRiskTier(input.roleKey) : null;

  const roleBaseScore = roleTier ? TIER_BASE_SCORE[roleTier] : 40;
  const blended = blendScores(roleBaseScore, techStack.stackObsolescenceScore);

  const displacementBy2026 = input.roleKey ? getDisplacementProbabilityByYear(input.roleKey, 2026) : 0.05;
  const displacementBy2028 = input.roleKey ? getDisplacementProbabilityByYear(input.roleKey, 2028) : 0.10;
  const displacementBy2030 = input.roleKey ? getDisplacementProbabilityByYear(input.roleKey, 2030) : 0.15;
  const displacementBy2032 = input.roleKey ? getDisplacementProbabilityByYear(input.roleKey, 2032) : 0.20;

  const augProb = roleTimeline?.augmentationProbability ?? 0.45;
  const label: AutomationRiskLabel = roleTimeline
    ? deriveLabel(blended, augProb, displacementBy2028)
    : 'INSUFFICIENT_DATA';

  const summary = buildSummary(label, roleTimeline, techStack.stackObsolescenceScore);
  const actions = buildActions(label, roleTimeline, techStack);

  const augmentationOpportunities = roleTimeline
    ? roleTimeline.automationDrivers.map(
        d => `Use ${d} to augment ${roleTimeline.humanEssentialTasks[0] ?? 'core work'}`
      )
    : techStack.bridgeSkillPriority.map(s => `Apply ${s} to stay ahead of automation`);

  return {
    automationRiskScore: blended,
    automationRiskLabel: label,
    automationRiskSummary: summary,
    roleAutomation: roleTimeline,
    roleRiskTier: roleTier,
    displacementBy2026,
    displacementBy2028,
    displacementBy2030,
    displacementBy2032,
    techStack,
    topTasksAutomatingFirst: roleTimeline?.topTasksAtRisk ?? [],
    humanEssentialTasks: roleTimeline?.humanEssentialTasks ?? [],
    augmentationOpportunities,
    bridgeSkills: [
      ...techStack.bridgeSkillPriority,
      ...(roleTimeline?.automationDrivers ?? []),
    ].slice(0, 6),
    automationActions: actions,
    calibrationStatus: 'research_grounded',
  };
}
