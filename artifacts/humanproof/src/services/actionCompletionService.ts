// actionCompletionService.ts — Wave 1.3 Behavioral Substrate
//
// PROBLEM: Action completion state lives only in localStorage — no cross-device
// sync, no persistence beyond 7 days, no server-side learning.
//
// SOLUTION: Supabase-backed action completion tracking with localStorage as
// the optimistic layer. Writes succeed even offline (localStorage first),
// sync to Supabase when connection is available.
//
// Table: user_action_completions
// Schema: (id, user_id, action_id, audit_result_id, completed_at,
//          score_at_completion, user_feedback, follow_up_signal)
//
// Cross-device sync: On dashboard mount, fetch server state and merge with
// local (server wins on conflicts — authoritative source of truth).

import { supabase } from '../utils/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CompletedAction {
  actionId: string;
  completedAt: string;        // ISO timestamp
  scoreAtCompletion?: number; // Score at time of completion
  userFeedback?: 1 | 2 | 3 | 4 | 5; // "Did this help?"
  followUpSignal?: string;    // Free-text: "Got 3 recruiter messages"
}

export interface ActionCompletionState {
  completedIds: Set<string>;
  lastSyncedAt: string | null; // ISO — when we last successfully synced with DB
  source: 'local' | 'synced'; // Whether this is purely local or DB-merged
}

// ── localStorage keys ─────────────────────────────────────────────────────────

const LS_COMPLETIONS_KEY = 'hp.action.completions';
const LS_COMPLETIONS_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days (up from 7)

// Actions the user rated 1-2 stars ("did this help?"). These are excluded from
// future selection the same way completed actions are — a low rating means the
// action didn't land for this user, so resurfacing it is not useful guidance.
const LS_LOW_RATED_KEY = 'hp.action.lowRated';
const LOW_RATING_THRESHOLD = 2; // ratings <= this are suppressed

// ── localStorage layer (fast, optimistic) ─────────────────────────────────────

export function loadCompletionsLocal(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_COMPLETIONS_KEY);
    if (!raw) return new Set();
    const { ids, ts } = JSON.parse(raw);
    if (Date.now() - ts > LS_COMPLETIONS_TTL_MS) {
      localStorage.removeItem(LS_COMPLETIONS_KEY);
      return new Set();
    }
    return new Set(ids as string[]);
  } catch { return new Set(); }
}

export function saveCompletionsLocal(ids: Set<string>): void {
  try {
    localStorage.setItem(
      LS_COMPLETIONS_KEY,
      JSON.stringify({ ids: Array.from(ids), ts: Date.now() }),
    );
  } catch { /* quota exceeded */ }
}

/**
 * IDs of actions the user has rated 1-2 stars. Same TTL/shape as completions —
 * cached locally so getPersonalizedActions() can exclude them synchronously
 * without an extra Supabase round-trip on every render.
 */
export function loadLowRatedActionIds(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_LOW_RATED_KEY);
    if (!raw) return new Set();
    const { ids, ts } = JSON.parse(raw);
    if (Date.now() - ts > LS_COMPLETIONS_TTL_MS) {
      localStorage.removeItem(LS_LOW_RATED_KEY);
      return new Set();
    }
    return new Set(ids as string[]);
  } catch { return new Set(); }
}

function saveLowRatedActionIdsLocal(ids: Set<string>): void {
  try {
    localStorage.setItem(
      LS_LOW_RATED_KEY,
      JSON.stringify({ ids: Array.from(ids), ts: Date.now() }),
    );
  } catch { /* quota exceeded */ }
}

// ── Supabase layer (persistent, cross-device) ─────────────────────────────────

/**
 * Mark an action as complete.
 * 1. Writes to localStorage immediately (optimistic)
 * 2. Upserts to Supabase in the background (non-blocking)
 */
export async function markActionComplete(
  actionId: string,
  opts: { scoreAtCompletion?: number; auditResultId?: string } = {},
): Promise<void> {
  // 1. Optimistic local write
  const local = loadCompletionsLocal();
  local.add(actionId);
  saveCompletionsLocal(local);

  // 2. Background Supabase upsert — fire-and-forget
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return; // Anonymous users: local only

    await supabase.from('user_action_completions').upsert(
      {
        user_id: user.id,
        action_id: actionId,
        audit_result_id: opts.auditResultId ?? null,
        completed_at: new Date().toISOString(),
        score_at_completion: opts.scoreAtCompletion ?? null,
      },
      { onConflict: 'user_id,action_id' },
    );
  } catch {
    // Non-fatal: local state is already updated
  }
}

/**
 * Unmark an action as complete.
 * 1. Removes from localStorage immediately
 * 2. Deletes from Supabase in the background
 */
export async function unmarkActionComplete(actionId: string): Promise<void> {
  const local = loadCompletionsLocal();
  local.delete(actionId);
  saveCompletionsLocal(local);

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('user_action_completions')
      .delete()
      .eq('user_id', user.id)
      .eq('action_id', actionId);
  } catch { /* non-fatal */ }
}

/**
 * Sync server state down to local.
 * Merges DB completions with local (union — completed actions never un-complete
 * from another device, only explicitly toggled off from THIS device).
 *
 * Returns the merged set and whether a sync was possible.
 */
export async function syncCompletionsFromServer(): Promise<ActionCompletionState> {
  const local = loadCompletionsLocal();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { completedIds: local, lastSyncedAt: null, source: 'local' };

    const { data, error } = await supabase
      .from('user_action_completions')
      .select('action_id, user_feedback')
      .eq('user_id', user.id);

    if (error || !data) return { completedIds: local, lastSyncedAt: null, source: 'local' };

    // Union: merge server IDs into local set
    const merged = new Set(local);
    // Cross-device low-rated cache: a 1-2 star rating set on any device should
    // suppress that action on every device, not just the one it was rated on.
    const lowRated = loadLowRatedActionIds();
    for (const row of data) {
      merged.add(row.action_id as string);
      if (typeof row.user_feedback === 'number' && row.user_feedback <= LOW_RATING_THRESHOLD) {
        lowRated.add(row.action_id as string);
      }
    }

    // Persist merged sets back to localStorage
    saveCompletionsLocal(merged);
    saveLowRatedActionIdsLocal(lowRated);

    return {
      completedIds: merged,
      lastSyncedAt: new Date().toISOString(),
      source: 'synced',
    };
  } catch {
    return { completedIds: local, lastSyncedAt: null, source: 'local' };
  }
}

/**
 * Submit feedback on a completed action.
 * Non-blocking — best effort.
 */
export async function submitActionFeedback(
  actionId: string,
  feedback: 1 | 2 | 3 | 4 | 5,
  followUpSignal?: string,
): Promise<void> {
  // Optimistic local write — a 1-2 star rating suppresses this action from
  // future selection immediately, without waiting on the Supabase round-trip.
  if (feedback <= LOW_RATING_THRESHOLD) {
    const lowRated = loadLowRatedActionIds();
    lowRated.add(actionId);
    saveLowRatedActionIdsLocal(lowRated);
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('user_action_completions')
      .update({
        user_feedback: feedback,
        follow_up_signal: followUpSignal ?? null,
      })
      .eq('user_id', user.id)
      .eq('action_id', actionId);
  } catch { /* non-fatal */ }
}
