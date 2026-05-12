// skillGapIntelligenceService.ts — Layer 48 (v17.0)
// Connects UserProfile.selfRatedSkills + targetSkills to roleMarketDemand data,
// producing a personalized skill gap score, upskill priority list, and market
// readiness assessment.

import { MarketDemandReport } from './roleMarketDemandService';

export interface UpskillPriorityItem {
  skill: string;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  marketDemandScore: number;
  estimatedWeeksToLearn: number;
  rationale: string;
}

export interface SkillGapIntelligenceResult {
  gapScore: number;
  marketReadinessPct: number;
  upskillPriority: UpskillPriorityItem[];
  existingStrengths: string[];
  criticalGaps: string[];
  readinessLabel: 'Market-Ready' | 'Developing' | 'Significant Gaps' | 'Major Overhaul Needed';
  narrativeSummary: string;
}

export interface SkillGapInput {
  selfRatedSkills: string[];
  targetSkills: string[];
  roleMarketDemand: MarketDemandReport;
  workTypeKey?: string;
  experience?: string;
}

// Static skill demand map: skill name → demand score (0–100) + weeks to learn.
// Indexed by canonical lowercase skill key.
const SKILL_DEMAND_MAP: Record<string, { demandScore: number; weeksToLearn: number; category: string }> = {
  // AI / ML
  'python':        { demandScore: 92, weeksToLearn: 8, category: 'programming' },
  'pytorch':       { demandScore: 85, weeksToLearn: 12, category: 'ml-framework' },
  'tensorflow':    { demandScore: 78, weeksToLearn: 12, category: 'ml-framework' },
  'langchain':     { demandScore: 82, weeksToLearn: 6, category: 'llm-tooling' },
  'llm':           { demandScore: 90, weeksToLearn: 10, category: 'llm-tooling' },
  'rag':           { demandScore: 84, weeksToLearn: 8, category: 'llm-tooling' },
  'fine-tuning':   { demandScore: 79, weeksToLearn: 14, category: 'ml-framework' },
  // Data
  'sql':           { demandScore: 88, weeksToLearn: 6, category: 'data' },
  'spark':         { demandScore: 72, weeksToLearn: 10, category: 'data' },
  'dbt':           { demandScore: 74, weeksToLearn: 6, category: 'data' },
  'snowflake':     { demandScore: 76, weeksToLearn: 4, category: 'data' },
  'kafka':         { demandScore: 70, weeksToLearn: 8, category: 'data' },
  // Cloud / Infra
  'aws':           { demandScore: 91, weeksToLearn: 12, category: 'cloud' },
  'gcp':           { demandScore: 80, weeksToLearn: 12, category: 'cloud' },
  'azure':         { demandScore: 82, weeksToLearn: 12, category: 'cloud' },
  'kubernetes':    { demandScore: 83, weeksToLearn: 10, category: 'devops' },
  'terraform':     { demandScore: 78, weeksToLearn: 6, category: 'devops' },
  'docker':        { demandScore: 80, weeksToLearn: 4, category: 'devops' },
  // Frontend
  'react':         { demandScore: 87, weeksToLearn: 10, category: 'frontend' },
  'typescript':    { demandScore: 85, weeksToLearn: 6, category: 'frontend' },
  'nextjs':        { demandScore: 80, weeksToLearn: 6, category: 'frontend' },
  'vue':           { demandScore: 68, weeksToLearn: 8, category: 'frontend' },
  // Backend
  'node':          { demandScore: 80, weeksToLearn: 8, category: 'backend' },
  'go':            { demandScore: 77, weeksToLearn: 12, category: 'backend' },
  'rust':          { demandScore: 72, weeksToLearn: 20, category: 'backend' },
  'java':          { demandScore: 74, weeksToLearn: 16, category: 'backend' },
  'springboot':    { demandScore: 68, weeksToLearn: 10, category: 'backend' },
  // Soft / Product
  'system design': { demandScore: 88, weeksToLearn: 16, category: 'architecture' },
  'product sense': { demandScore: 70, weeksToLearn: 12, category: 'product' },
  'agile':         { demandScore: 65, weeksToLearn: 4, category: 'process' },
  'communication': { demandScore: 72, weeksToLearn: 8, category: 'soft-skill' },
  // Security
  'security':      { demandScore: 82, weeksToLearn: 20, category: 'security' },
  'devsecops':     { demandScore: 78, weeksToLearn: 14, category: 'security' },
};

function normaliseSkill(skill: string): string {
  return skill.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '');
}

function lookupSkillDemand(skill: string) {
  const key = normaliseSkill(skill);
  return SKILL_DEMAND_MAP[key] ?? null;
}

function deriveUrgency(demandScore: number): UpskillPriorityItem['urgency'] {
  if (demandScore >= 85) return 'critical';
  if (demandScore >= 75) return 'high';
  if (demandScore >= 60) return 'medium';
  return 'low';
}

export function computeSkillGapIntelligence(input: SkillGapInput): SkillGapIntelligenceResult {
  const { selfRatedSkills, targetSkills, roleMarketDemand } = input;

  const selfNorm = new Set(selfRatedSkills.map(normaliseSkill));
  const targetNorm = targetSkills.map(normaliseSkill);

  // Existing strengths: skills user has that are high-demand (≥75)
  const existingStrengths: string[] = [];
  for (const skill of selfRatedSkills) {
    const data = lookupSkillDemand(skill);
    if (data && data.demandScore >= 75) existingStrengths.push(skill);
  }

  // Gaps: target skills user doesn't currently have
  const gaps: Array<{ skill: string; original: string; data: NonNullable<ReturnType<typeof lookupSkillDemand>> }> = [];
  targetSkills.forEach((skill, i) => {
    const key = targetNorm[i];
    if (!selfNorm.has(key)) {
      const data = lookupSkillDemand(skill);
      if (data) gaps.push({ skill, original: skill, data });
    }
  });

  // Sort gaps by market demand score descending
  gaps.sort((a, b) => b.data.demandScore - a.data.demandScore);

  // Build upskill priority list
  const upskillPriority: UpskillPriorityItem[] = gaps.map(({ skill, data }) => ({
    skill,
    urgency: deriveUrgency(data.demandScore),
    marketDemandScore: data.demandScore,
    estimatedWeeksToLearn: data.weeksToLearn,
    rationale: `${skill} has demand score ${data.demandScore}/100 in 2026-Q1; ${data.category} skills are in active hiring.`,
  }));

  const criticalGaps = upskillPriority
    .filter(g => g.urgency === 'critical')
    .map(g => g.skill);

  // Gap score: weighted average of gaps' demand scores, normalised
  const totalDemand = gaps.reduce((sum, g) => sum + g.data.demandScore, 0);
  const gapScore = gaps.length > 0
    ? Math.round(Math.min(100, (totalDemand / gaps.length) * (gaps.length / Math.max(1, targetSkills.length + 1))))
    : 0;

  // Market readiness: ratio of self-skills to target-skills, weighted by demand
  const selfDemandTotal = selfRatedSkills.reduce((sum, skill) => {
    const data = lookupSkillDemand(skill);
    return sum + (data?.demandScore ?? 0);
  }, 0);
  const targetDemandTotal = targetSkills.reduce((sum, skill) => {
    const data = lookupSkillDemand(skill);
    return sum + (data?.demandScore ?? 50);
  }, 0);
  const allDemand = selfDemandTotal + totalDemand;
  const marketReadinessPct = allDemand > 0
    ? Math.round(Math.min(100, (selfDemandTotal / allDemand) * 100))
    : 50;

  // Also boost by role market demand
  const demandBoost = (roleMarketDemand.adjustedDemandIndex - 50) * 0.15;
  const adjustedReadiness = Math.round(Math.min(100, Math.max(0, marketReadinessPct + demandBoost)));

  // Readiness label
  let readinessLabel: SkillGapIntelligenceResult['readinessLabel'];
  if (adjustedReadiness >= 75) readinessLabel = 'Market-Ready';
  else if (adjustedReadiness >= 55) readinessLabel = 'Developing';
  else if (adjustedReadiness >= 35) readinessLabel = 'Significant Gaps';
  else readinessLabel = 'Major Overhaul Needed';

  // Narrative
  const gapCount = gaps.length;
  const strengthCount = existingStrengths.length;
  const narrativeSummary = gapCount === 0
    ? `Your skills fully cover your target role profile. ${strengthCount} high-demand skills are competitive advantages.`
    : `You have ${gapCount} skill gap${gapCount !== 1 ? 's' : ''} for your target profile. ` +
      `${criticalGaps.length > 0 ? `Critical: ${criticalGaps.slice(0, 2).join(', ')}. ` : ''}` +
      `${strengthCount > 0 ? `Your ${existingStrengths.slice(0, 2).join(' and ')} experience are strong differentiators.` : ''}`;

  return {
    gapScore,
    marketReadinessPct: adjustedReadiness,
    upskillPriority,
    existingStrengths,
    criticalGaps,
    readinessLabel,
    narrativeSummary,
  };
}
