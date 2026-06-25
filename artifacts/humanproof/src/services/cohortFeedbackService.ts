// cohortFeedbackService.ts
//
// PROBLEM: actionCompletionService tracks user_feedback (1-5 stars) per user,
// but it was write-only at the cohort level — a rating only ever suppressed
// that action for the rating user (loadLowRatedActionIds). An action that
// consistently fails for everyone kept surfacing to new users at full
// priority, because nothing learned across users.
//
// SOLUTION: a Supabase-backed cohort aggregate (action_feedback_aggregates,
// refreshed daily by a SECURITY DEFINER SQL function that can read across
// all users' completions — see migration 20260625000001). This service
// reads that aggregate and caches a "cohort suppressed" set locally,
// following the exact same sync-then-read-local pattern as
// actionCompletionService's loadLowRatedActionIds — getPersonalizedActions()
// stays synchronous; only the periodic sync is async.
//
// Suppression requires BOTH a minimum sample size and a high low-rating
// rate — a single bad rating from one user must never tank an action for
// the entire cohort.

import { supabase } from '../utils/supabase';
import { loadLowRatedActionIds } from './actionCompletionService';

const LS_COHORT_SUPPRESSED_KEY = 'hp.action.cohortSuppressed';
const LS_COHORT_TTL_MS = 24 * 60 * 60 * 1000; // 24h — aggregates refresh daily server-side

const COHORT_MIN_RATINGS = 10;
const COHORT_LOW_RATING_THRESHOLD_PCT = 40;

interface ActionFeedbackAggregateRow {
  action_id: string;
  total_ratings: number | null;
  low_rating_pct: number | null;
}

export interface CohortSyncResult {
  suppressedIds: Set<string>;
  lastSyncedAt: string | null;
  source: 'local' | 'synced';
}

function isCohortSuppressed(row: { total_ratings: number | null; low_rating_pct: number | null }): boolean {
  return (
    (row.total_ratings ?? 0) >= COHORT_MIN_RATINGS &&
    (row.low_rating_pct ?? 0) > COHORT_LOW_RATING_THRESHOLD_PCT
  );
}

/**
 * Locally cached set of action IDs the COHORT (not just this user) has rated
 * poorly enough, at sufficient sample size, to suppress from new selections.
 * Synchronous — safe to call from getPersonalizedActions().
 */
export function loadCohortSuppressedActionIds(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_COHORT_SUPPRESSED_KEY);
    if (!raw) return new Set();
    const { ids, ts } = JSON.parse(raw);
    if (Date.now() - ts > LS_COHORT_TTL_MS) {
      localStorage.removeItem(LS_COHORT_SUPPRESSED_KEY);
      return new Set();
    }
    return new Set(ids as string[]);
  } catch { return new Set(); }
}

function saveCohortSuppressedActionIdsLocal(ids: Set<string>): void {
  try {
    localStorage.setItem(
      LS_COHORT_SUPPRESSED_KEY,
      JSON.stringify({ ids: Array.from(ids), ts: Date.now() }),
    );
  } catch { /* quota exceeded */ }
}

/**
 * Fetch the cohort feedback aggregate table and refresh the local suppressed
 * set. Call this once per session (e.g. on dashboard mount, alongside
 * syncCompletionsFromServer) — not on every render. Read access to
 * action_feedback_aggregates is public (RLS: SELECT USING (true)), so this
 * works for anonymous users too, unlike the per-user completion sync.
 */
export async function syncCohortFeedbackFromServer(): Promise<CohortSyncResult> {
  const local = loadCohortSuppressedActionIds();

  try {
    const { data, error } = await supabase
      .from('action_feedback_aggregates')
      .select('action_id, total_ratings, low_rating_pct')
      .gte('total_ratings', COHORT_MIN_RATINGS)
      .gt('low_rating_pct', COHORT_LOW_RATING_THRESHOLD_PCT);

    if (error || !data) return { suppressedIds: local, lastSyncedAt: null, source: 'local' };

    const suppressed = new Set<string>();
    for (const row of data as ActionFeedbackAggregateRow[]) {
      if (isCohortSuppressed(row)) suppressed.add(row.action_id);
    }

    saveCohortSuppressedActionIdsLocal(suppressed);

    return {
      suppressedIds: suppressed,
      lastSyncedAt: new Date().toISOString(),
      source: 'synced',
    };
  } catch {
    return { suppressedIds: local, lastSyncedAt: null, source: 'local' };
  }
}

/**
 * Union of personal low-ratings (actionCompletionService) and cohort-level
 * suppression. This is the single set callers should pass as
 * getPersonalizedActions()'s suppressedActionIds — combining "this user
 * didn't like it" with "the cohort didn't like it" without duplicating the
 * merge at every call site.
 */
export function loadEffectiveSuppressedActionIds(): Set<string> {
  const personal = loadLowRatedActionIds();
  const cohort = loadCohortSuppressedActionIds();
  if (cohort.size === 0) return personal;
  return new Set([...personal, ...cohort]);
}
