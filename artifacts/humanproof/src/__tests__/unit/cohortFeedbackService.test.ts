// cohortFeedbackService.test.ts — Master Loop iteration 7
//
// Covers the cohort-level feedback aggregation gap: actionCompletionService's
// user_feedback (1-5 stars) only ever suppressed an action for the rating
// user. This service reads a server-side aggregate (action_feedback_aggregates,
// refreshed daily by a SECURITY DEFINER SQL function — see migration
// 20260625000001) so an action that consistently fails across MANY users
// gets suppressed for new users too, not just the ones who rated it.
//
// Suppression requires BOTH a minimum sample size (>=10 ratings) and a high
// low-rating rate (>40%) — a single bad rating must never tank an action for
// the entire cohort.

import { describe, it, expect, beforeEach, vi } from 'vitest';

let mockSelectResult: { data: any[] | null; error: any } = { data: [], error: null };

vi.mock('../../utils/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        gte: vi.fn(() => ({
          gt: vi.fn(() => Promise.resolve(mockSelectResult)),
        })),
      })),
    })),
  },
}));

import {
  loadCohortSuppressedActionIds,
  syncCohortFeedbackFromServer,
  loadEffectiveSuppressedActionIds,
} from '../../services/cohortFeedbackService';
import { submitActionFeedback } from '../../services/actionCompletionService';
import { getPersonalizedActions } from '../../services/actionPersonalizationEngine';
import { stableActionId } from '../../services/actionIdUtil';

beforeEach(() => {
  localStorage.clear();
  mockSelectResult = { data: [], error: null };
});

describe('loadCohortSuppressedActionIds', () => {
  it('returns empty set when nothing cached', () => {
    expect(loadCohortSuppressedActionIds()).toEqual(new Set());
  });

  it('returns empty set when cache is expired (>24h)', () => {
    localStorage.setItem('hp.action.cohortSuppressed', JSON.stringify({
      ids: ['action_1'], ts: Date.now() - 25 * 60 * 60 * 1000,
    }));
    expect(loadCohortSuppressedActionIds()).toEqual(new Set());
  });

  it('returns cached IDs within TTL', () => {
    localStorage.setItem('hp.action.cohortSuppressed', JSON.stringify({
      ids: ['action_1', 'action_2'], ts: Date.now(),
    }));
    expect(loadCohortSuppressedActionIds()).toEqual(new Set(['action_1', 'action_2']));
  });

  it('gracefully returns empty set on corrupted JSON', () => {
    localStorage.setItem('hp.action.cohortSuppressed', 'not valid json {{{');
    expect(loadCohortSuppressedActionIds()).toEqual(new Set());
  });
});

describe('syncCohortFeedbackFromServer', () => {
  it('populates the local cache from rows meeting the suppression threshold', async () => {
    mockSelectResult = {
      data: [
        { action_id: 'action_bad', total_ratings: 15, low_rating_pct: 55 },
        { action_id: 'action_borderline', total_ratings: 12, low_rating_pct: 41 },
      ],
      error: null,
    };
    const result = await syncCohortFeedbackFromServer();
    expect(result.source).toBe('synced');
    expect(result.suppressedIds.has('action_bad')).toBe(true);
    expect(result.suppressedIds.has('action_borderline')).toBe(true);
    expect(loadCohortSuppressedActionIds().has('action_bad')).toBe(true);
  });

  it('excludes rows below the minimum sample size even if the query somehow returns them', async () => {
    // Defensive double-check at the client layer in case the server-side
    // threshold ever drifts from the client's expectations.
    mockSelectResult = {
      data: [{ action_id: 'action_small_sample', total_ratings: 9, low_rating_pct: 90 }],
      error: null,
    };
    const result = await syncCohortFeedbackFromServer();
    expect(result.suppressedIds.has('action_small_sample')).toBe(false);
  });

  it('excludes rows at or below the low-rating-pct threshold', async () => {
    mockSelectResult = {
      data: [{ action_id: 'action_ok', total_ratings: 50, low_rating_pct: 40 }],
      error: null,
    };
    const result = await syncCohortFeedbackFromServer();
    expect(result.suppressedIds.has('action_ok')).toBe(false);
  });

  it('handles null total_ratings/low_rating_pct gracefully (no ratings yet)', async () => {
    mockSelectResult = {
      data: [{ action_id: 'action_unrated', total_ratings: null, low_rating_pct: null }],
      error: null,
    };
    const result = await syncCohortFeedbackFromServer();
    expect(result.suppressedIds.has('action_unrated')).toBe(false);
  });

  it('falls back to local cache on query error', async () => {
    localStorage.setItem('hp.action.cohortSuppressed', JSON.stringify({
      ids: ['stale_cached_id'], ts: Date.now(),
    }));
    mockSelectResult = { data: null, error: { message: 'network error' } };
    const result = await syncCohortFeedbackFromServer();
    expect(result.source).toBe('local');
    expect(result.suppressedIds.has('stale_cached_id')).toBe(true);
  });

  it('empty data array clears the suppressed set', async () => {
    localStorage.setItem('hp.action.cohortSuppressed', JSON.stringify({
      ids: ['previously_bad_action'], ts: Date.now(),
    }));
    mockSelectResult = { data: [], error: null };
    const result = await syncCohortFeedbackFromServer();
    expect(result.source).toBe('synced');
    expect(result.suppressedIds.size).toBe(0);
  });
});

describe('loadEffectiveSuppressedActionIds — union of personal + cohort', () => {
  it('returns personal low-ratings when no cohort suppression exists', async () => {
    await submitActionFeedback('personally_disliked', 1);
    expect(loadEffectiveSuppressedActionIds()).toEqual(new Set(['personally_disliked']));
  });

  it('returns cohort-suppressed IDs when no personal ratings exist', async () => {
    mockSelectResult = { data: [{ action_id: 'cohort_bad', total_ratings: 20, low_rating_pct: 60 }], error: null };
    await syncCohortFeedbackFromServer();
    expect(loadEffectiveSuppressedActionIds()).toEqual(new Set(['cohort_bad']));
  });

  it('unions personal and cohort suppression sets without duplicates', async () => {
    await submitActionFeedback('personally_disliked', 2);
    mockSelectResult = { data: [{ action_id: 'cohort_bad', total_ratings: 20, low_rating_pct: 60 }], error: null };
    await syncCohortFeedbackFromServer();

    const effective = loadEffectiveSuppressedActionIds();
    expect(effective.has('personally_disliked')).toBe(true);
    expect(effective.has('cohort_bad')).toBe(true);
    expect(effective.size).toBe(2);
  });

  it('an action the user personally disliked AND the cohort flagged appears once', async () => {
    await submitActionFeedback('universally_bad', 1);
    mockSelectResult = { data: [{ action_id: 'universally_bad', total_ratings: 30, low_rating_pct: 70 }], error: null };
    await syncCohortFeedbackFromServer();

    const effective = loadEffectiveSuppressedActionIds();
    expect(effective.size).toBe(1);
    expect(effective.has('universally_bad')).toBe(true);
  });

  it('returns empty set when neither personal nor cohort suppression exists', () => {
    expect(loadEffectiveSuppressedActionIds()).toEqual(new Set());
  });
});

describe('end-to-end: cohort suppression actually excludes the action from getPersonalizedActions()', () => {
  it('a cohort-flagged action (not personally rated by this user) is excluded from selection', async () => {
    // 'Software Engineer' at high risk surfaces 3 actions from the swe high-risk
    // cell. Flag the first one as cohort-bad via the server mock, sync it down,
    // then confirm getPersonalizedActions() excludes it via loadEffectiveSuppressedActionIds().
    const fresh = getPersonalizedActions('Software Engineer', 'junior', 60, 'IN');
    const targetId = stableActionId('pa', fresh.actions[0].title ?? '');

    mockSelectResult = { data: [{ action_id: targetId, total_ratings: 25, low_rating_pct: 64 }], error: null };
    await syncCohortFeedbackFromServer();

    const afterCohortSync = getPersonalizedActions(
      'Software Engineer', 'junior', 60, 'IN',
      undefined, undefined, undefined, undefined, undefined, undefined, undefined,
      undefined, // completedActionIds
      loadEffectiveSuppressedActionIds(),
    );

    const resultIds = afterCohortSync.actions.map(a => stableActionId('pa', a.title ?? ''));
    expect(resultIds).not.toContain(targetId);
    expect(afterCohortSync.actions).toHaveLength(3); // reservoir backfills from the rest of the pool
  });
});
