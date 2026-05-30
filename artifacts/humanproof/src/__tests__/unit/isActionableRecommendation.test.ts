// isActionableRecommendation.test.ts — keeps system/meta transparency notices
// out of the action surfaces (the "one move", action cards).
//
// Guards the Infosys-journey bug where an API-injected "System Override Applied ·
// The engine detected exceptional patterns: Signal conflict (critical)…" notice
// carried priority 'Critical' and was surfaced as the user's single next move.

import { describe, it, expect } from 'vitest';
import { isActionableRecommendation } from '../../services/orchestration/signalOrchestrator';
import type { ActionPlanItem } from '../../types/hybridResult';

const mk = (o: Partial<ActionPlanItem>): ActionPlanItem => ({
  id: 'x', title: 'Do a thing', description: 'Add one demonstrable project.',
  priority: 'Medium', layerFocus: 'L3', riskReductionPct: 4, deadline: '14 days', ...o,
} as ActionPlanItem);

describe('isActionableRecommendation', () => {
  it('rejects the system-override transparency notice', () => {
    expect(isActionableRecommendation(mk({
      id: 'system-override-notice',
      title: 'System Override Applied',
      description: 'The engine detected exceptional patterns: Signal conflict (critical): 1 discrepancies detected',
      priority: 'Critical',
    }))).toBe(false);
  });

  it('rejects by id prefix and by meta phrasing independently', () => {
    expect(isActionableRecommendation(mk({ id: 'system-foo', title: 'Anything' }))).toBe(false);
    expect(isActionableRecommendation(mk({ id: 'real', title: 'Signal conflict resolved' }))).toBe(false);
    expect(isActionableRecommendation(mk({ id: 'real', description: 'Kill-switch engaged on this dimension.' }))).toBe(false);
  });

  it('keeps genuine user actions', () => {
    expect(isActionableRecommendation(mk({ id: 'l3-high', title: 'Internal Position Vulnerable', description: 'Schedule 1:1s with your manager.' }))).toBe(true);
    expect(isActionableRecommendation(mk({ id: 'l4-high', title: 'Industry Headwinds', description: 'Map two adjacent sectors.' }))).toBe(true);
  });

  it('rejects malformed items', () => {
    expect(isActionableRecommendation(null)).toBe(false);
    expect(isActionableRecommendation(undefined)).toBe(false);
    expect(isActionableRecommendation({} as ActionPlanItem)).toBe(false);
  });
});
