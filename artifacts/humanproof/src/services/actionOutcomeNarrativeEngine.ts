// actionOutcomeNarrativeEngine.ts — Phase 5: close the feedback loop with outcome stories
import type { ActionFeedbackRecord } from './feedbackEngine';

export interface ActionOutcomeNarrative {
  actionId: string;
  actionTitle: string;
  completedAt: string;
  scoreBefore: number | null;
  scoreAfter: number | null;
  reduction: number | null;
  daysSinceCompletion: number;
  isReadyForReAudit: boolean;   // 14+ days since completion, no score_after yet
  nudgeText: string;
}

export function generateActionOutcomeNarratives(
  records: ActionFeedbackRecord[],
  currentScore: number | null,
): ActionOutcomeNarrative[] {
  const now = Date.now();

  return records.map(r => {
    const completedMs = new Date(r.completedAt).getTime();
    const daysSince = Math.floor((now - completedMs) / 86_400_000);

    const reduction =
      r.scoreBefore !== null && r.scoreAfter !== null
        ? Math.round((r.scoreBefore - r.scoreAfter) * 10) / 10
        : r.scoreBefore !== null && currentScore !== null
          ? Math.round((r.scoreBefore - currentScore) * 10) / 10
          : null;

    // Ready for re-audit: 14+ days since completion, no score_after captured yet
    const isReadyForReAudit = daysSince >= 14 && r.scoreAfter === null;

    let nudgeText: string;
    if (isReadyForReAudit) {
      nudgeText = 'Re-run your audit to measure the actual impact of this action.';
    } else if (reduction !== null && reduction > 0) {
      nudgeText = `This action helped reduce your risk by ${reduction} points.`;
    } else if (reduction !== null && reduction < 0) {
      nudgeText = 'Your score moved up after this action — other factors may be at play.';
    } else {
      nudgeText = 'Complete a follow-up audit to measure impact.';
    }

    return {
      actionId: r.actionId,
      actionTitle: r.actionText ?? r.actionId,
      completedAt: r.completedAt,
      scoreBefore: r.scoreBefore,
      scoreAfter: r.scoreAfter,
      reduction,
      daysSinceCompletion: daysSince,
      isReadyForReAudit,
      nudgeText,
    };
  });
}

/** Returns only the records that are overdue for re-audit (14+ days, no follow-up score) */
export function getReAuditCandidates(
  records: ActionFeedbackRecord[],
  currentScore: number | null,
): ActionOutcomeNarrative[] {
  return generateActionOutcomeNarratives(records, currentScore)
    .filter(n => n.isReadyForReAudit)
    .sort((a, b) => b.daysSinceCompletion - a.daysSinceCompletion);
}
