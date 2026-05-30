// actionHeadline.test.ts — verb-first action extraction for the "one move".
//
// Guards the fix for: the single most important next step rendered a diagnosis
// title ("Internal Position Vulnerable") instead of something to DO.

import { describe, it, expect } from 'vitest';
import { actionHeadline } from '../../services/orchestration/actionHeadline';

describe('actionHeadline', () => {
  it('extracts the imperative action from the description, not the diagnosis title', () => {
    const out = actionHeadline({
      title: 'Internal Position Vulnerable',
      description:
        'Your role-exposure score is 52/100. Add one demonstrable AI-collaboration project to your profile within 30 days.',
    });
    expect(out).toMatch(/^Add one demonstrable AI-collaboration project/);
    expect(out).not.toMatch(/Vulnerable/);
  });

  it('keeps a title that is already imperative', () => {
    const out = actionHeadline({ title: 'Update your resume and activate your network', description: '' });
    expect(out).toBe('Update your resume and activate your network');
  });

  it('finds the imperative even when it is the second sentence', () => {
    const out = actionHeadline({
      title: 'Industry Headwinds',
      description: 'The sector is contracting. Map two adjacent sectors and reach one hiring manager per week.',
    });
    expect(out).toMatch(/^Map two adjacent sectors/);
  });

  it('clamps an overly long headline with an ellipsis', () => {
    const long = 'Build ' + 'a very detailed multi-step plan '.repeat(8) + 'this quarter.';
    const out = actionHeadline({ title: 'X', description: long });
    expect(out.length).toBeLessThanOrEqual(97);
    expect(out.endsWith('…')).toBe(true);
  });

  it('falls back to the first description sentence when no imperative verb is present', () => {
    const out = actionHeadline({ title: 'Company Health Risk', description: 'Conditions are deteriorating broadly.' });
    expect(out).toBe('Conditions are deteriorating broadly');
  });

  it('never returns empty', () => {
    expect(actionHeadline({}).length).toBeGreaterThan(0);
    expect(actionHeadline(null).length).toBeGreaterThan(0);
  });
});
