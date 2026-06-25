// missionEvolutionEngine.ts — Phase 8 Mission Evolution Engine
//
// Generates new missions from live skill-gap and readiness signals when the
// user has completed every pre-authored action in their role/tier reservoir.
//
// This is the "Completed Mission → Weakness Detection → Gap Identification →
// Generate New Mission → Continue Evolution" step described in Phase 8.
//
// Inputs come from already-computed pipeline services — no new API calls.
// Outputs are Partial<ActionPlanItem> objects that are structurally identical
// to authored actions and flow through the same rendering/completion pipeline.

import type { UpskillPriorityItem } from './skillGapIntelligenceService';
import type { ReadinessPillar } from './careerConfidenceEngine';
import type { ActionPlanItem } from '../types/hybridResult';
import { stableActionId } from './actionIdUtil';

export interface MissionEvolutionContext {
  upskillPriority: UpskillPriorityItem[];
  criticalGap: ReadinessPillar | null;
  completedActionIds: Set<string>;
}

/**
 * Generate up to 3 evolved missions from live signals.
 *
 * Priority order:
 *   1. Highest-urgency uncompleted skill gaps (from skillGapIntelligenceService)
 *   2. Weakest readiness pillar's top action (from careerConfidenceEngine)
 *
 * Every returned item has a stable ID (via stableActionId) so completion state
 * persists across sessions through actionCompletionService — same mechanism as
 * authored actions.
 */
export function generateEvolvedMissions(
  ctx: MissionEvolutionContext,
): Array<Partial<ActionPlanItem>> {
  const missions: Array<Partial<ActionPlanItem>> = [];

  // Source 1: skill gaps, sorted critical → high → medium → low
  const sorted = [...ctx.upskillPriority].sort((a, b) => {
    const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return (order[a.urgency] ?? 3) - (order[b.urgency] ?? 3);
  });

  for (const item of sorted) {
    if (missions.length >= 3) break;
    const id = stableActionId('evolved', item.skill);
    if (ctx.completedActionIds.has(id)) continue;
    missions.push(buildSkillMission(item, id));
  }

  // Source 2: weakest readiness pillar (career confidence engine)
  if (missions.length < 3 && ctx.criticalGap && ctx.criticalGap.status !== 'STRONG') {
    const id = stableActionId('evolved', `readiness_${ctx.criticalGap.id}`);
    if (!ctx.completedActionIds.has(id)) {
      missions.push(buildReadinessMission(ctx.criticalGap, id));
    }
  }

  return missions;
}

function buildSkillMission(
  item: UpskillPriorityItem,
  id: string,
): Partial<ActionPlanItem> {
  const urgencyLabel =
    item.urgency === 'critical' ? 'Market-Critical Gap'
    : item.urgency === 'high'   ? 'High-Demand Skill'
    : 'Rising Skill';

  const deadline =
    item.estimatedWeeksToLearn <= 2 ? '14 days'
    : item.estimatedWeeksToLearn <= 4 ? '30 days'
    : '60 days';

  const weeks =
    item.estimatedWeeksToLearn === 1 ? '1 week' : `${item.estimatedWeeksToLearn} weeks`;

  const proofWeek = Math.min(item.estimatedWeeksToLearn, 4);

  return {
    id,
    title: `Close Your ${item.skill} Gap — ${urgencyLabel}`,
    description:
      `Your skill profile shows a ${item.urgency} gap in **${item.skill}**. ` +
      `${item.rationale} Estimated path to competency: ${weeks}.\n\n` +
      `Next steps: (1) Ship one hands-on project using ${item.skill} within 7 days to establish a baseline. ` +
      `(2) Publish a public artifact — GitHub repo, live demo, or case study — by week ${proofWeek}. ` +
      `Recruiters verify skills through proof, not claims. ` +
      `(3) Add ${item.skill} to your LinkedIn Skills section with a verified example once live.`,
    priority: urgencyToPriority(item.urgency),
    layerFocus: `L3 · Skills & Adaptability — ${item.skill}`,
    riskReductionPct:
      item.urgency === 'critical' ? 22
      : item.urgency === 'high'   ? 15
      : 8,
    deadline,
  };
}

function buildReadinessMission(
  pillar: ReadinessPillar,
  id: string,
): Partial<ActionPlanItem> {
  return {
    id,
    title: `Strengthen ${pillar.name}: ${pillar.topAction}`,
    description:
      `Your weakest readiness dimension is **${pillar.name}** ` +
      `(score: ${pillar.score}/100, status: ${pillar.status.toLowerCase()}). ` +
      `Gap: ${pillar.gap}\n\n` +
      `Immediate action: ${pillar.topAction} — estimated time to close: ${pillar.timeToFix}. ` +
      `Closing this gap raises your Career Confidence score and directly improves ` +
      `your ability to act decisively if your role is eliminated.`,
    priority: pillar.status === 'CRITICAL' ? 'Critical' : 'High',
    layerFocus: `L5 · Career Resilience — ${pillar.name}`,
    riskReductionPct: pillar.status === 'CRITICAL' ? 18 : 10,
    deadline: pillar.timeToFix,
  };
}

function urgencyToPriority(
  urgency: UpskillPriorityItem['urgency'],
): ActionPlanItem['priority'] {
  if (urgency === 'critical') return 'Critical';
  if (urgency === 'high') return 'High';
  return 'Medium';
}
