// driverEvidence.test.ts — concrete, data-backed Top Risk Driver explanations.
//
// Guards the fix for the worst trust gap found in end-to-end testing: three
// drivers all reading the placeholder "Multiple contributing signals." Every
// assertion proves the explainer returns SPECIFIC, evidence-bearing copy.

import { describe, it, expect } from 'vitest';
import { explainDriver } from '../../components/AuditTabs/v3/driverEvidence';

describe('explainDriver — never the generic placeholder', () => {
  it('never returns the old placeholder string for any theme', () => {
    const labels = [
      'Financial Vulnerability', 'Layoff & Instability History', 'Role Displacement Risk',
      'Industry Headwinds', 'Regional Headwinds', 'Experience Protection', 'Company Health',
      'Network Moat', 'Leadership Transition', 'Totally Unknown Dimension',
    ];
    for (const label of labels) {
      const out = explainDriver({ label, score: 55 }, {}, {});
      expect(out).not.toMatch(/multiple contributing signals/i);
      expect(out.length).toBeGreaterThan(12);
    }
  });
});

describe('explainDriver — workforce/layoff evidence', () => {
  it('cites real layoff rounds, WARN, and headcount when present', () => {
    const out = explainDriver(
      { label: 'Layoff & Instability History', score: 70 },
      { warnSignal: { hasActiveWARN: true }, headcountVelocity: { deltaPct90d: -8 } },
      { layoffRounds: 2 },
    );
    expect(out).toMatch(/WARN/);
    expect(out).toMatch(/2 layoff rounds/);
    expect(out).toMatch(/-8% in 90 days/);
    expect(out).toMatch(/leading driver/i); // score >= 67
  });

  it('falls back to a theme sentence when no workforce metric exists', () => {
    const out = explainDriver({ label: 'Workforce Stability', score: 40 }, {}, {});
    expect(out).toMatch(/workforce trend/i);
    expect(out).toMatch(/moderate contributor/i);
  });
});

describe('explainDriver — financial evidence with polarity', () => {
  it('frames healthy financials as an offset, not pure risk', () => {
    const out = explainDriver(
      { label: 'Company Health', score: 38 },
      {},
      { stock90DayChange: 29.8, revenueGrowthYoY: 8 },
    );
    expect(out).toMatch(/stock \+29\.8% over 90 days/);
    expect(out).toMatch(/revenue \+8% YoY/);
    expect(out).toMatch(/offset/i);
  });

  it('frames falling financials as straight risk', () => {
    const out = explainDriver(
      { label: 'Financial Vulnerability', score: 72 },
      {},
      { stock90DayChange: -22 },
    );
    expect(out).toMatch(/stock -22% over 90 days/);
    expect(out).not.toMatch(/offset/i);
  });
});

describe('explainDriver — role displacement surfaces AI exposure', () => {
  it('states the AI automation exposure percentage from a 0–1 index', () => {
    const out = explainDriver(
      { label: 'Role Displacement Risk', score: 60 },
      { roleDisplacement: { aiExposureIndex: 0.92 } },
      {},
    );
    expect(out).toMatch(/92% of your role's core tasks/);
    expect(out).toMatch(/AI automation/i);
  });

  it('falls back to a clear AI-risk sentence when no index is present', () => {
    const out = explainDriver({ label: 'Role Displacement Risk', score: 50 }, {}, {});
    expect(out).toMatch(/AI automation/i);
  });
});

describe('explainDriver — market & experience themes are specific', () => {
  it('explains industry headwinds concretely', () => {
    const out = explainDriver({ label: 'Market Headwinds', score: 67 }, {}, {});
    expect(out).toMatch(/sector is cooling/i);
  });

  it('explains experience protection with honest polarity', () => {
    const out = explainDriver({ label: 'Experience Protection', score: 58 }, {}, {});
    expect(out).toMatch(/seniority offers only partial insulation/i);
  });
});
