// actionCompletionService.test.ts — Master Loop iteration 2
//
// Covers the feedback-aware suppression mechanism added to close the audit
// gap: user_feedback (1-5 stars) was written to Supabase but never read back
// to influence future action selection. Low ratings (<=2 stars) now suppress
// that action from re-selection, both optimistically (local) and cross-device
// (via syncCompletionsFromServer pulling user_feedback from the server).

import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockUser = { id: 'user-123' };
let mockSelectResult: { data: any[] | null; error: any } = { data: [], error: null };

vi.mock('../../utils/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: mockUser } })),
    },
    from: vi.fn(() => ({
      upsert: vi.fn(() => Promise.resolve({ error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
        })),
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve(mockSelectResult)),
      })),
    })),
  },
}));

import {
  loadCompletionsLocal,
  saveCompletionsLocal,
  loadLowRatedActionIds,
  submitActionFeedback,
  syncCompletionsFromServer,
  markActionComplete,
} from '../../services/actionCompletionService';

beforeEach(() => {
  localStorage.clear();
  mockSelectResult = { data: [], error: null };
});

describe('loadLowRatedActionIds', () => {
  it('returns empty set when nothing cached', () => {
    expect(loadLowRatedActionIds()).toEqual(new Set());
  });

  it('returns empty set when cache is expired (>30 days)', () => {
    localStorage.setItem('hp.action.lowRated', JSON.stringify({
      ids: ['action_1'], ts: Date.now() - 31 * 24 * 60 * 60 * 1000,
    }));
    expect(loadLowRatedActionIds()).toEqual(new Set());
  });

  it('returns cached IDs within TTL', () => {
    localStorage.setItem('hp.action.lowRated', JSON.stringify({
      ids: ['action_1', 'action_2'], ts: Date.now(),
    }));
    expect(loadLowRatedActionIds()).toEqual(new Set(['action_1', 'action_2']));
  });

  it('gracefully returns empty set on corrupted JSON', () => {
    localStorage.setItem('hp.action.lowRated', 'not valid json {{{');
    expect(loadLowRatedActionIds()).toEqual(new Set());
  });
});

describe('submitActionFeedback — optimistic local suppression', () => {
  it('1-star rating immediately adds the action to the low-rated cache', async () => {
    await submitActionFeedback('action_bad', 1);
    expect(loadLowRatedActionIds().has('action_bad')).toBe(true);
  });

  it('2-star rating also suppresses (threshold is <=2)', async () => {
    await submitActionFeedback('action_meh', 2);
    expect(loadLowRatedActionIds().has('action_meh')).toBe(true);
  });

  it('3-star rating does NOT suppress', async () => {
    await submitActionFeedback('action_ok', 3);
    expect(loadLowRatedActionIds().has('action_ok')).toBe(false);
  });

  it('5-star rating does NOT suppress', async () => {
    await submitActionFeedback('action_great', 5);
    expect(loadLowRatedActionIds().has('action_great')).toBe(false);
  });

  it('multiple low ratings accumulate in the cache', async () => {
    await submitActionFeedback('action_a', 1);
    await submitActionFeedback('action_b', 2);
    const ids = loadLowRatedActionIds();
    expect(ids.has('action_a')).toBe(true);
    expect(ids.has('action_b')).toBe(true);
  });
});

describe('syncCompletionsFromServer — cross-device feedback merge', () => {
  it('merges server-side low ratings into the local suppression cache', async () => {
    mockSelectResult = {
      data: [
        { action_id: 'action_remote_bad', user_feedback: 1 },
        { action_id: 'action_remote_good', user_feedback: 5 },
      ],
      error: null,
    };
    const result = await syncCompletionsFromServer();
    expect(result.source).toBe('synced');
    expect(result.completedIds.has('action_remote_bad')).toBe(true);
    expect(result.completedIds.has('action_remote_good')).toBe(true);

    const lowRated = loadLowRatedActionIds();
    expect(lowRated.has('action_remote_bad')).toBe(true);
    expect(lowRated.has('action_remote_good')).toBe(false);
  });

  it('null user_feedback rows do not affect the suppression cache', async () => {
    mockSelectResult = {
      data: [{ action_id: 'action_no_feedback', user_feedback: null }],
      error: null,
    };
    await syncCompletionsFromServer();
    expect(loadLowRatedActionIds().has('action_no_feedback')).toBe(false);
  });

  it('preserves a low rating set locally even if the server row omits feedback', async () => {
    // Local optimistic write happened first (another device rated it badly,
    // already synced previously) — a later sync with no feedback column change
    // should not erase the existing suppression.
    localStorage.setItem('hp.action.lowRated', JSON.stringify({
      ids: ['action_already_bad'], ts: Date.now(),
    }));
    mockSelectResult = { data: [{ action_id: 'action_already_bad', user_feedback: null }], error: null };
    await syncCompletionsFromServer();
    expect(loadLowRatedActionIds().has('action_already_bad')).toBe(true);
  });
});

describe('loadCompletionsLocal / saveCompletionsLocal — baseline sanity', () => {
  it('round-trips a set of completion IDs', () => {
    saveCompletionsLocal(new Set(['a', 'b', 'c']));
    expect(loadCompletionsLocal()).toEqual(new Set(['a', 'b', 'c']));
  });

  it('markActionComplete adds to local set immediately (optimistic)', async () => {
    await markActionComplete('new_action');
    expect(loadCompletionsLocal().has('new_action')).toBe(true);
  });
});
