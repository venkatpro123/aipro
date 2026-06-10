// readinessOutcomeService.ts — Career Readiness: the outcome loop.
//
// "Every action must produce measurable outcomes... the system learns which
//  actions worked." This wires the readiness improvement actions into the
//  EXISTING outcome infrastructure (action_completions via feedbackEngine), so
//  each logged action — and whether it helped — calibrates future guidance.
//
// Action ids are tab-prefixed (`resume_<hash>`) so the dimension-success learning
// (split('_')[0]) yields per-tab success rates: { resume: 0.8, linkedin: 0.4, … }.

import { supabase } from '../utils/supabase';
import { markActionCompleteWithScore, submitThumbsFeedback } from './feedbackEngine';

export type ReadinessTab = 'resume' | 'linkedin' | 'interview' | 'portfolio' | 'referral';

export interface ReadinessActionState {
  completed: boolean;
  thumbsUp: boolean | null;   // null = completed but outcome not yet reported
}

export interface ReadinessTabSuccess {
  tab: string;
  rate: number;               // 0–1
  total: number;              // rated outcomes
}

// Stable id so the same action reconciles across sessions; tab prefix drives learning.
function djb2(seed: string): string {
  let h = 5381;
  const s = (seed ?? '').toLowerCase().trim();
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

export function readinessActionId(tab: ReadinessTab, actionText: string): string {
  return `${tab}_${djb2(actionText)}`;
}

/** Log that the user completed a readiness action. scoreNow is captured as the before-score. */
export async function logReadinessAction(
  userId: string,
  tab: ReadinessTab,
  actionText: string,
  scoreNow: number,
): Promise<boolean> {
  return markActionCompleteWithScore(userId, readinessActionId(tab, actionText), actionText, scoreNow);
}

/** Report whether a completed readiness action actually helped (closes the loop). */
export async function rateReadinessAction(
  userId: string,
  tab: ReadinessTab,
  actionText: string,
  helped: boolean,
  scoreNow: number,
): Promise<boolean> {
  return submitThumbsFeedback(userId, readinessActionId(tab, actionText), helped, scoreNow, `readiness:${tab}`);
}

/** Load completion + outcome state for the user's readiness actions. */
export async function getReadinessActionStates(userId: string): Promise<Record<string, ReadinessActionState>> {
  const out: Record<string, ReadinessActionState> = {};
  try {
    const { data } = await supabase
      .from('action_completions')
      .select('action_id, thumbs_up, completed_at')
      .eq('user_id', userId);
    const tabs = ['resume_', 'linkedin_', 'interview_', 'portfolio_', 'referral_'];
    for (const row of (data ?? []) as { action_id: string; thumbs_up: boolean | null; completed_at: string | null }[]) {
      if (!tabs.some(t => row.action_id.startsWith(t))) continue;
      out[row.action_id] = { completed: !!row.completed_at || row.thumbs_up != null, thumbsUp: row.thumbs_up };
    }
  } catch { /* offline — empty state */ }
  return out;
}

/** Per-tab success rates from rated readiness actions (≥1 outcome). Calibrates impact framing. */
export async function getReadinessTabSuccess(userId: string): Promise<Record<string, ReadinessTabSuccess>> {
  const out: Record<string, ReadinessTabSuccess> = {};
  try {
    const { data } = await supabase
      .from('action_completions')
      .select('action_id, thumbs_up')
      .eq('user_id', userId)
      .not('thumbs_up', 'is', null);
    const tabs = ['resume', 'linkedin', 'interview', 'portfolio', 'referral'];
    const agg: Record<string, { pos: number; total: number }> = {};
    for (const row of (data ?? []) as { action_id: string; thumbs_up: boolean }[]) {
      const tab = row.action_id.split('_')[0];
      if (!tabs.includes(tab)) continue;
      if (!agg[tab]) agg[tab] = { pos: 0, total: 0 };
      agg[tab].total++;
      if (row.thumbs_up) agg[tab].pos++;
    }
    for (const [tab, a] of Object.entries(agg)) {
      out[tab] = { tab, rate: Math.round((a.pos / a.total) * 100) / 100, total: a.total };
    }
  } catch { /* offline */ }
  return out;
}

/** Summary for the command center: total logged + total rated across all readiness tabs. */
export async function getReadinessProgressSummary(userId: string): Promise<{ logged: number; rated: number; helped: number }> {
  try {
    const { data } = await supabase
      .from('action_completions')
      .select('action_id, thumbs_up')
      .eq('user_id', userId);
    const tabs = ['resume_', 'linkedin_', 'interview_', 'portfolio_', 'referral_'];
    let logged = 0, rated = 0, helped = 0;
    for (const row of (data ?? []) as { action_id: string; thumbs_up: boolean | null }[]) {
      if (!tabs.some(t => row.action_id.startsWith(t))) continue;
      logged++;
      if (row.thumbs_up != null) { rated++; if (row.thumbs_up) helped++; }
    }
    return { logged, rated, helped };
  } catch { return { logged: 0, rated: 0, helped: 0 }; }
}
