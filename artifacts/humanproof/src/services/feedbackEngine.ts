// feedbackEngine.ts — Phase 7: Action ROI tracking + recommendation improvement
import { supabase } from '../utils/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ActionFeedbackRecord {
  actionId: string;
  actionText?: string;
  completedAt: string;
  thumbsUp: boolean | null;
  outcomeNotes?: string;
  scoreBefore: number | null;
  scoreAfter: number | null;
  measuredRiskReduction: number | null;
  feedbackDueAt: string | null;
  feedbackPending: boolean;
}

export interface ActionROI {
  actionId: string;
  actionText: string;
  completedAt: string;
  scoreBefore: number;
  scoreAfter: number;
  reduction: number;
  thumbsUp: boolean | null;
}

export interface RecommendationAccuracy {
  actionId: string;
  actionText: string;
  predictedReduction: number;
  actualReduction: number | null;
  delta: number | null;
}

export interface FeedbackSummary {
  actionsCompletedThisMonth: number;
  estimatedScoreImpact: number | null;
  topEffectiveActions: ActionROI[];
  pendingFeedbackCount: number;
  hasData: boolean;
}

export interface LearningOutcome {
  userId: string;
  courseId: string;
  courseTitle?: string;
  skillPracticed: boolean;
  resumeUpdated: boolean;
  confidenceImproved: boolean;
}

// ─── Action completion with score capture ────────────────────────────────────

export async function markActionCompleteWithScore(
  userId: string,
  actionId: string,
  actionText: string,
  scoreBefore: number | null,
): Promise<boolean> {
  const feedbackDueAt = new Date(Date.now() + 7 * 86_400_000).toISOString();

  const { error } = await supabase
    .from('action_completions')
    .upsert(
      {
        user_id: userId,
        action_id: actionId,
        action_text: actionText,
        completed_at: new Date().toISOString(),
        score_before: scoreBefore,
        feedback_due_at: feedbackDueAt,
        feedback_requested_at: null,
        thumbs_up: null,
        score_after: null,
        measured_risk_reduction: null,
      },
      { onConflict: 'user_id,action_id' },
    );
  return !error;
}

// ─── Thumbs-up feedback ───────────────────────────────────────────────────────

export async function submitThumbsFeedback(
  userId: string,
  actionId: string,
  thumbsUp: boolean,
  scoreAfter: number | null,
  outcomeNotes?: string,
): Promise<boolean> {
  const scoreBefore = await getScoreBefore(userId, actionId);
  const measuredRiskReduction =
    scoreBefore != null && scoreAfter != null
      ? Math.round((scoreBefore - scoreAfter) * 10) / 10
      : null;

  const { error } = await supabase
    .from('action_completions')
    .update({
      thumbs_up: thumbsUp,
      score_after: scoreAfter,
      outcome_notes: outcomeNotes ?? null,
      measured_risk_reduction: measuredRiskReduction,
      feedback_requested_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('action_id', actionId);
  return !error;
}

async function getScoreBefore(userId: string, actionId: string): Promise<number | null> {
  const { data } = await supabase
    .from('action_completions')
    .select('score_before')
    .eq('user_id', userId)
    .eq('action_id', actionId)
    .maybeSingle();
  return (data as { score_before: number | null } | null)?.score_before ?? null;
}

// ─── Pending feedback (due after 7 days) ─────────────────────────────────────

export async function getPendingFeedback(userId: string): Promise<ActionFeedbackRecord[]> {
  const now = new Date().toISOString();
  const { data } = await supabase
    .from('action_completions')
    .select('action_id, action_text, completed_at, thumbs_up, outcome_notes, score_before, score_after, measured_risk_reduction, feedback_due_at')
    .eq('user_id', userId)
    .is('thumbs_up', null)
    .lte('feedback_due_at', now)
    .not('feedback_due_at', 'is', null)
    .order('feedback_due_at', { ascending: true })
    .limit(5);

  return ((data ?? []) as Record<string, unknown>[]).map(r => ({
    actionId: r.action_id as string,
    actionText: r.action_text as string | undefined,
    completedAt: r.completed_at as string,
    thumbsUp: r.thumbs_up as boolean | null,
    outcomeNotes: r.outcome_notes as string | undefined,
    scoreBefore: r.score_before as number | null,
    scoreAfter: r.score_after as number | null,
    measuredRiskReduction: r.measured_risk_reduction as number | null,
    feedbackDueAt: r.feedback_due_at as string | null,
    feedbackPending: true,
  }));
}

// ─── ROI + summary ────────────────────────────────────────────────────────────

export async function getActionROIList(userId: string): Promise<ActionROI[]> {
  const { data } = await supabase
    .from('action_completions')
    .select('action_id, action_text, completed_at, score_before, score_after, thumbs_up')
    .eq('user_id', userId)
    .not('score_before', 'is', null)
    .not('score_after', 'is', null)
    .order('measured_risk_reduction', { ascending: false })
    .limit(10);

  return ((data ?? []) as Record<string, unknown>[])
    .filter(r => r.score_before != null && r.score_after != null)
    .map(r => ({
      actionId: r.action_id as string,
      actionText: (r.action_text as string) || r.action_id as string,
      completedAt: r.completed_at as string,
      scoreBefore: r.score_before as number,
      scoreAfter: r.score_after as number,
      reduction: Math.round(((r.score_before as number) - (r.score_after as number)) * 10) / 10,
      thumbsUp: r.thumbs_up as boolean | null,
    }));
}

export async function getFeedbackSummary(userId: string): Promise<FeedbackSummary> {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [monthRes, allRes, pendingRes] = await Promise.all([
    supabase
      .from('action_completions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('completed_at', monthStart.toISOString()),

    getActionROIList(userId),

    getPendingFeedback(userId),
  ]);

  const actionsCompletedThisMonth = monthRes.count ?? 0;
  const topEffective = allRes.filter(a => a.reduction > 0).slice(0, 3);
  const totalReduction = allRes.reduce((sum, a) => sum + a.reduction, 0);
  const estimatedScoreImpact = allRes.length > 0 ? Math.round(totalReduction * 10) / 10 : null;

  return {
    actionsCompletedThisMonth,
    estimatedScoreImpact,
    topEffectiveActions: topEffective,
    pendingFeedbackCount: pendingRes.length,
    hasData: actionsCompletedThisMonth > 0 || allRes.length > 0,
  };
}

// ─── Feedback boost map for pickPrimaryMove ──────────────────────────────────
// Returns a Map<actionId, multiplier> where:
//   0   = suppress (2+ thumbs-down → never surface as primary move)
//   1.3 = boost (2+ thumbs-up → elevate in ranking)
// No entry → 1.0 (no feedback history)

export async function getActionFeedbackBoosts(
  userId: string,
  actionIds: string[],
): Promise<Map<string, number>> {
  if (actionIds.length === 0) return new Map();
  const { data } = await supabase
    .from('action_completions')
    .select('action_id, thumbs_up')
    .eq('user_id', userId)
    .in('action_id', actionIds.slice(0, 50))
    .not('thumbs_up', 'is', null);

  const upCounts: Record<string, number> = {};
  const downCounts: Record<string, number> = {};
  for (const row of (data ?? []) as { action_id: string; thumbs_up: boolean }[]) {
    if (row.thumbs_up) upCounts[row.action_id] = (upCounts[row.action_id] ?? 0) + 1;
    else downCounts[row.action_id] = (downCounts[row.action_id] ?? 0) + 1;
  }

  const boosts = new Map<string, number>();
  for (const id of actionIds) {
    const down = downCounts[id] ?? 0;
    const up = upCounts[id] ?? 0;
    if (down >= 2) boosts.set(id, 0);
    else if (up >= 2) boosts.set(id, 1.3);
  }
  return boosts;
}

// ─── Outcome summary by type ──────────────────────────────────────────────────

export async function getOutcomeSummaryByType(): Promise<Record<string, number>> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;
  if (!userId) return {};

  const { data } = await supabase
    .from('career_outcome_events')
    .select('event_type')
    .eq('user_id', userId);

  const counts: Record<string, number> = {};
  for (const row of (data ?? []) as { event_type: string }[]) {
    counts[row.event_type] = (counts[row.event_type] ?? 0) + 1;
  }
  return counts;
}

// ─── Learning outcomes ────────────────────────────────────────────────────────

export async function recordLearningOutcome(outcome: LearningOutcome): Promise<boolean> {
  const { error } = await supabase
    .from('learning_outcomes')
    .upsert(
      {
        user_id: outcome.userId,
        course_id: outcome.courseId,
        course_title: outcome.courseTitle ?? null,
        skill_practiced: outcome.skillPracticed,
        resume_updated: outcome.resumeUpdated,
        confidence_improved: outcome.confidenceImproved,
        recorded_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,course_id' },
    );
  return !error;
}

export async function getLearningOutcomes(userId: string): Promise<LearningOutcome[]> {
  const { data } = await supabase
    .from('learning_outcomes')
    .select('user_id, course_id, course_title, skill_practiced, resume_updated, confidence_improved')
    .eq('user_id', userId)
    .order('recorded_at', { ascending: false });

  return ((data ?? []) as Record<string, unknown>[]).map(r => ({
    userId: r.user_id as string,
    courseId: r.course_id as string,
    courseTitle: r.course_title as string | undefined,
    skillPracticed: Boolean(r.skill_practiced),
    resumeUpdated: Boolean(r.resume_updated),
    confidenceImproved: Boolean(r.confidence_improved),
  }));
}
