// intelligenceLoopService.ts — Phase 5 (Career OS)
//
// Manages the self-improving loop: observe → analyze → recommend → act →
// measure → learn → adapt. It does not run the loop; it reports the loop's
// STATE so the UI can tell the user exactly what the system needs from them
// this week to keep learning.
//
// Pure composition over existing services — no new DB tables, no new queries
// beyond what careerMemoryService / outcomeService / careerTwinService expose.

import { getCareerMemorySummary } from './careerMemoryService';
import { loadCareerTwin } from './careerTwinService';
import { fetchDuePrompts, type DuePrompt } from './outcomeService';
import { getPendingFeedback } from './feedbackEngine';

export interface IntelligenceLoopState {
  hasData: boolean;
  lastAuditDate: string | null;
  /** 30 days after last audit by default; sooner (14d) when the score is volatile. */
  nextRecommendedAuditDate: string | null;
  /** True when the recommended re-audit date has passed. */
  auditOverdue: boolean;
  /** Outcome prompts due for actions completed 30/90/180 days ago. */
  pendingOutcomePrompts: DuePrompt[];
  /** Count of completed actions awaiting a thumbs rating (the learning signal). */
  pendingFeedbackCount: number;
  twinHealth: 'rich' | 'partial' | 'sparse';
  twinHealthTrend: 'improving' | 'stable' | 'degrading';
  /** Plain-English gaps the user can close to sharpen the model. */
  intelligenceGaps: string[];
  /** One-line summary of what the system most needs this week. */
  weeklyAsk: string;
}

const DAY_MS = 86_400_000;

function addDays(iso: string, days: number): string {
  return new Date(new Date(iso).getTime() + days * DAY_MS).toISOString();
}

export async function getIntelligenceLoopState(userId: string): Promise<IntelligenceLoopState> {
  const [summary, twin, duePrompts, pendingFeedback] = await Promise.all([
    getCareerMemorySummary(userId),
    loadCareerTwin(),
    fetchDuePrompts().catch(() => [] as DuePrompt[]),
    getPendingFeedback(userId).catch(() => []),
  ]);

  const lastAuditDate = summary.latestAuditDate ?? summary.firstAuditDate ?? null;

  // Re-audit cadence: 30 days, compressed to 14 when the score is moving fast.
  const scoreVolatile = summary.scoreDelta != null && Math.abs(summary.scoreDelta) >= 8;
  const cadenceDays = scoreVolatile ? 14 : 30;
  const nextRecommendedAuditDate = lastAuditDate ? addDays(lastAuditDate, cadenceDays) : null;
  const auditOverdue = nextRecommendedAuditDate != null && new Date(nextRecommendedAuditDate).getTime() < Date.now();

  // Twin health trend: compare twin health tier against data richness signals.
  // degrading when the audit is overdue (model is going stale), improving when
  // the user is rich + recently active, otherwise stable.
  const twinHealth = twin?.twinHealth ?? 'sparse';
  let twinHealthTrend: IntelligenceLoopState['twinHealthTrend'] = 'stable';
  if (auditOverdue) twinHealthTrend = 'degrading';
  else if (twinHealth === 'rich' && summary.actionsCompleted > 0) twinHealthTrend = 'improving';

  // Intelligence gaps: concrete, closable items that raise model precision.
  const gaps: string[] = [];
  if (twinHealth !== 'rich') {
    if (!twin?.skillsSnapshot?.selfRatedSkills?.length) {
      gaps.push('Add your skills so AI-displacement and skill-fit signals are personalized.');
    }
    if (!twin?.goalsSnapshot?.primaryGoal) {
      gaps.push('Set your primary career goal so recommendations match what you want.');
    }
  }
  if (pendingFeedback.length > 0) {
    gaps.push(`Rate ${pendingFeedback.length} completed action${pendingFeedback.length > 1 ? 's' : ''} so the system learns what works for you.`);
  }
  if (duePrompts.length > 0) {
    gaps.push(`Tell us what happened with ${duePrompts.length} past action${duePrompts.length > 1 ? 's' : ''} to calibrate predictions.`);
  }
  if (auditOverdue) {
    gaps.push('Run a fresh audit — your last one is past its recommended refresh window.');
  }

  // Weekly ask: the single highest-value thing the loop needs right now.
  const weeklyAsk =
    duePrompts.length > 0
      ? `Report the outcome of ${duePrompts.length} past action${duePrompts.length > 1 ? 's' : ''} — it directly sharpens your predictions.`
      : pendingFeedback.length > 0
        ? `Rate ${pendingFeedback.length} completed action${pendingFeedback.length > 1 ? 's' : ''} so the system learns your winning moves.`
        : auditOverdue
          ? 'Run a fresh audit to keep your Career Twin current.'
          : gaps.length > 0
            ? gaps[0]
            : 'Your Career Twin is current — keep taking action and reporting outcomes.';

  return {
    hasData: summary.hasData,
    lastAuditDate,
    nextRecommendedAuditDate,
    auditOverdue,
    pendingOutcomePrompts: duePrompts,
    pendingFeedbackCount: pendingFeedback.length,
    twinHealth,
    twinHealthTrend,
    intelligenceGaps: gaps,
    weeklyAsk,
  };
}
