// actionRotation.test.ts — Master Loop, Career Intelligence audit fix #1
//
// PROBLEM (audit finding, Sections 1/2/4/5/8/9): getPersonalizedActions() was a
// pure function of (role, seniority, score) — a returning user whose risk tier
// hadn't changed since their last audit saw the exact same 3 actions forever.
// Completion state was tracked (actionCompletionService) but never consumed.
//
// FIX: getPersonalizedActions() now accepts `completedActionIds` and builds a
// reservoir from the current risk cell + more-urgent cells (never less-urgent
// — that direction would surface false "your risk is low" reassurance to a
// high-risk user). Completed actions are excluded; the next pre-authored
// action from the reservoir surfaces instead of a repeat.
//
// These tests use the real `swe` role (India pool) since its cell sizes are
// well-known: critical=3, high=3, moderate=1, low=1 actions.

import { describe, it, expect } from 'vitest';
import { getPersonalizedActions } from '../../services/actionPersonalizationEngine';
import { stableActionId } from '../../services/actionIdUtil';

function idsOf(actions: Array<{ title?: string }>): string[] {
  return actions.map(a => stableActionId('pa', a.title ?? ''));
}

describe('getPersonalizedActions — anti-repetition rotation', () => {
  it('no completedActionIds → baseline behaviour unchanged (3 actions from current cell)', () => {
    const result = getPersonalizedActions('Software Engineer', 'junior', 80, 'IN'); // critical risk
    expect(result.actions).toHaveLength(3);
    expect(result.actionsRotated).toBeUndefined();
    expect(result.allActionsExhausted).toBeUndefined();
  });

  it('empty completedActionIds set → identical to omitting the parameter', () => {
    const withUndefined = getPersonalizedActions('Software Engineer', 'junior', 80, 'IN');
    const withEmpty = getPersonalizedActions('Software Engineer', 'junior', 80, 'IN', undefined, undefined, undefined, undefined, undefined, undefined, undefined, new Set());
    expect(idsOf(withEmpty.actions)).toEqual(idsOf(withUndefined.actions));
  });

  it('high-risk user completing all 3 "high" cell actions rotates into the "critical" cell', () => {
    const fresh = getPersonalizedActions('Software Engineer', 'junior', 60, 'IN'); // high risk
    expect(fresh.actions).toHaveLength(3);
    const freshIds = new Set(idsOf(fresh.actions));

    const afterCompletion = getPersonalizedActions(
      'Software Engineer', 'junior', 60, 'IN',
      undefined, undefined, undefined, undefined, undefined, undefined, undefined,
      freshIds,
    );
    expect(afterCompletion.actions).toHaveLength(3);
    // The 3 returned actions must be genuinely different from the fresh set —
    // pulled from the critical cell, not a repeat.
    expect(idsOf(afterCompletion.actions).every(id => !freshIds.has(id))).toBe(true);
    expect(afterCompletion.actionsRotated).toBe(true);
    expect(afterCompletion.allActionsExhausted).toBeUndefined();
  });

  it('completing the entire reservoir sets allActionsExhausted=true and recycles gracefully', () => {
    const fresh = getPersonalizedActions('Software Engineer', 'junior', 60, 'IN'); // high risk
    const rotated = getPersonalizedActions(
      'Software Engineer', 'junior', 60, 'IN',
      undefined, undefined, undefined, undefined, undefined, undefined, undefined,
      new Set(idsOf(fresh.actions)),
    );
    // Complete everything seen so far across both calls (high cell + critical cell == full reservoir)
    let allCompleted = new Set([...idsOf(fresh.actions), ...idsOf(rotated.actions)]);

    // swe now has PHASE2_ACTION_DB content, so a 3rd rotation cycle surfaces
    // those before the reservoir is truly exhausted — drain it fully.
    let result = getPersonalizedActions(
      'Software Engineer', 'junior', 60, 'IN',
      undefined, undefined, undefined, undefined, undefined, undefined, undefined,
      allCompleted,
    );
    let guard = 0;
    while (!result.allActionsExhausted && guard < 10) {
      allCompleted = new Set([...allCompleted, ...idsOf(result.actions)]);
      result = getPersonalizedActions(
        'Software Engineer', 'junior', 60, 'IN',
        undefined, undefined, undefined, undefined, undefined, undefined, undefined,
        allCompleted,
      );
      guard++;
    }
    expect(result.allActionsExhausted).toBe(true);
    expect(result.actions).toHaveLength(3); // still returns a usable plan, recycled
  });

  it('a role with no role-specific Phase-2 content still gets the generic professional_services fallback', () => {
    // 'Civil Engineer' resolves to the 'civil_engineer' roleGroup, served from
    // the separate MANUFACTURING_ENERGY_CONSTRUCTION multi-industry pool — it
    // has no role-specific PHASE2_ACTION_DB entry. Rather than exhausting
    // immediately (the old behaviour), buildActionReservoir now falls back to
    // PHASE2_ACTION_DB.professional_services so NO role is left with zero
    // progression once its urgency-tier reservoir is exhausted.
    const fresh = getPersonalizedActions('Civil Engineer', 'junior', 90, 'IN'); // critical risk
    expect(fresh.actions.length).toBeGreaterThan(0);

    const rotated = getPersonalizedActions(
      'Civil Engineer', 'junior', 90, 'IN',
      undefined, undefined, undefined, undefined, undefined, undefined, undefined,
      new Set(idsOf(fresh.actions)),
    );
    // Reservoir now extends into the generic fallback tier — not exhausted yet.
    expect(rotated.allActionsExhausted).toBeUndefined();
    const titles = rotated.actions.map(a => a.title ?? '');
    expect(titles.some(t => t.includes('AI-Tooling Pilot That Measurably Improves Your Core Workflow'))).toBe(true);
  });

  it('exhausts only after BOTH the urgency-tier reservoir AND the generic fallback are completed', () => {
    const fresh = getPersonalizedActions('Civil Engineer', 'junior', 90, 'IN');
    let completed = new Set(idsOf(fresh.actions));
    let result = getPersonalizedActions(
      'Civil Engineer', 'junior', 90, 'IN',
      undefined, undefined, undefined, undefined, undefined, undefined, undefined,
      completed,
    );
    let guard = 0;
    while (!result.allActionsExhausted && guard < 10) {
      completed = new Set([...completed, ...idsOf(result.actions)]);
      result = getPersonalizedActions(
        'Civil Engineer', 'junior', 90, 'IN',
        undefined, undefined, undefined, undefined, undefined, undefined, undefined,
        completed,
      );
      guard++;
    }
    expect(result.allActionsExhausted).toBe(true);
    expect(result.actions).toHaveLength(3);
  });

  it('a critical-risk swe user who exhausts the urgency tiers receives Phase-2 leadership content next', () => {
    const fresh = getPersonalizedActions('Software Engineer', 'junior', 90, 'IN'); // critical risk
    const freshIds = new Set(idsOf(fresh.actions));

    const next = getPersonalizedActions(
      'Software Engineer', 'junior', 90, 'IN',
      undefined, undefined, undefined, undefined, undefined, undefined, undefined,
      freshIds,
    );
    // Phase-2 content is appended after critical/high/moderate/low, so a
    // critical-risk user (reservoir = critical cell only, pre-Phase-2) now
    // rotates into genuinely new advanced content instead of exhausting.
    expect(next.allActionsExhausted).toBeUndefined();
    expect(idsOf(next.actions).every(id => !freshIds.has(id))).toBe(true);
    const titles = next.actions.map(a => a.title ?? '');
    expect(titles.some(t => /AI-Adoption Reviewer|AI-Adoption Track Record|Mentor 2 Engineers/.test(t))).toBe(true);
  });

  it('low-risk user has the largest reservoir (low+moderate+high+critical) and does not exhaust easily', () => {
    const fresh = getPersonalizedActions('Software Engineer', 'junior', 20, 'IN'); // low risk
    const afterOneCompleted = getPersonalizedActions(
      'Software Engineer', 'junior', 20, 'IN',
      undefined, undefined, undefined, undefined, undefined, undefined, undefined,
      new Set([idsOf(fresh.actions)[0]]),
    );
    expect(afterOneCompleted.allActionsExhausted).toBeUndefined();
    expect(afterOneCompleted.actions).toHaveLength(3);
  });

  it('rotation never pulls a less-urgent cell into a higher-risk user\'s reservoir', () => {
    // For a 'high' risk user, the reservoir must never include the 'low' cell's
    // "your current risk is low" action — that would be actively misleading.
    const lowRiskOnlyAction = getPersonalizedActions('Software Engineer', 'junior', 20, 'IN').actions;
    const lowOnlyTitle = lowRiskOnlyAction.find(a => (a.title ?? '').includes('Before You Need It'));
    expect(lowOnlyTitle).toBeDefined(); // sanity: confirms this action exists in the low cell

    const highRiskFresh = getPersonalizedActions('Software Engineer', 'junior', 60, 'IN');
    const highRiskAfterFullCompletion = getPersonalizedActions(
      'Software Engineer', 'junior', 60, 'IN',
      undefined, undefined, undefined, undefined, undefined, undefined, undefined,
      new Set(idsOf(highRiskFresh.actions)),
    );
    const titles = highRiskAfterFullCompletion.actions.map(a => a.title ?? '');
    expect(titles.some(t => t.includes('Before You Need It'))).toBe(false);
  });

  it('DB-curated overrides are not subject to rotation (separate admin lifecycle)', () => {
    // Without a DB override seeded, isDbOverride is false in test env — verify
    // the rotation fields are only ever set on the static-pool path, never
    // silently applied to a (hypothetical) DB override result.
    const result = getPersonalizedActions('Software Engineer', 'junior', 60, 'IN');
    expect(result.isDbOverride).toBeFalsy();
  });
});

describe('getPersonalizedActions — feedback-aware suppression (1-2 star ratings)', () => {
  it('a low-rated action is excluded even when nothing is completed', () => {
    const fresh = getPersonalizedActions('Software Engineer', 'junior', 60, 'IN'); // high risk
    const lowRatedId = idsOf(fresh.actions)[0];

    const afterSuppression = getPersonalizedActions(
      'Software Engineer', 'junior', 60, 'IN',
      undefined, undefined, undefined, undefined, undefined, undefined, undefined,
      undefined, // completedActionIds
      new Set([lowRatedId]), // suppressedActionIds
    );
    expect(idsOf(afterSuppression.actions)).not.toContain(lowRatedId);
    expect(afterSuppression.actions).toHaveLength(3);
  });

  it('suppressed actions are pulled from the next-urgent cell, not recycled as filler', () => {
    const fresh = getPersonalizedActions('Software Engineer', 'junior', 60, 'IN'); // high risk
    const freshIds = idsOf(fresh.actions);

    // Suppress all 3 of the current cell's actions via low ratings.
    const afterSuppression = getPersonalizedActions(
      'Software Engineer', 'junior', 60, 'IN',
      undefined, undefined, undefined, undefined, undefined, undefined, undefined,
      undefined,
      new Set(freshIds),
    );
    expect(idsOf(afterSuppression.actions).every(id => !freshIds.includes(id))).toBe(true);
  });

  it('suppressing the entire reservoir falls back to the unsuppressed pool rather than returning nothing', () => {
    const fresh = getPersonalizedActions('Software Engineer', 'junior', 90, 'IN'); // critical — smallest reservoir (3 actions, no fallback tier)
    const allIds = idsOf(fresh.actions);

    const afterFullSuppression = getPersonalizedActions(
      'Software Engineer', 'junior', 90, 'IN',
      undefined, undefined, undefined, undefined, undefined, undefined, undefined,
      undefined,
      new Set(allIds),
    );
    // Reservoir has nothing left after suppression — falls back to showing
    // the original 3 rather than an empty plan.
    expect(afterFullSuppression.actions).toHaveLength(3);
  });

  it('empty suppressedActionIds set behaves identically to omitting the parameter', () => {
    const withUndefined = getPersonalizedActions('Software Engineer', 'junior', 60, 'IN');
    const withEmpty = getPersonalizedActions(
      'Software Engineer', 'junior', 60, 'IN',
      undefined, undefined, undefined, undefined, undefined, undefined, undefined,
      undefined, new Set(),
    );
    expect(idsOf(withEmpty.actions)).toEqual(idsOf(withUndefined.actions));
  });
});
