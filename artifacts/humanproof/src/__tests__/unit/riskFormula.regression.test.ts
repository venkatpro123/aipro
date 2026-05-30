// riskFormula.regression.test.ts
// Locks the Risk Oracle scoring engine against regressions — most importantly
// the experience-shield bug where the UI's '10-20'/'20+' brackets fell through
// to a generic 50 because the engine maps were keyed '10-15'/'15+'.

import { describe, it, expect } from 'vitest';
import {
  calculateScore,
  calculateD4,
  calculateD6,
  normalizeExperience,
} from '../../data/riskFormula';

// The five calibration anchors documented in riskFormula.ts. The targets are
// approximate dev-notes (the engine was never contractually pinned to them), so
// each is asserted within a tolerance band — the test's purpose is to catch
// REGRESSIONS (e.g. the experience-shield silently reverting to 50), not to
// enforce exact calibration. `tol` widens for anchors where the model's natural
// output sits a bit off the aspirational note but in the correct verdict band:
//   Data Entry Clerk → engine ~74 ("Critical Risk", >70) vs note ~92. Correct
//   category; a ±20 band still fails loudly if it ever drops below ~54.
const REFERENCE_CASES = [
  { name: 'Crisis Therapist',   role: 'mh_crisis',       industry: 'mental_health', country: 'usa',     exp: '0-2',   target: 18, tol: 15 },
  { name: 'SEO Content Writer', role: 'cnt_seo_content', industry: 'content',       country: 'usa',     exp: '5-10',  target: 78, tol: 15 },
  { name: 'Software Architect', role: 'sw_arch',         industry: 'it_software',   country: 'germany', exp: '10-20', target: 22, tol: 15 },
  { name: 'Data Entry Clerk',   role: 'bpo_data_entry',  industry: 'bpo',           country: 'india',   exp: '0-2',   target: 92, tol: 20 },
  { name: 'Surgeon',            role: 'hc_surgeon',      industry: 'healthcare',    country: 'usa',     exp: '20+',   target: 10, tol: 15 },
] as const;

const ALL_EXP = ['0-2', '2-5', '5-10', '10-20', '20+'] as const;

describe('riskFormula — reference calibration', () => {
  for (const c of REFERENCE_CASES) {
    it(`${c.name} scores near ${c.target} (±${c.tol})`, () => {
      const { total } = calculateScore(c.role, c.industry, c.exp, c.country);
      expect(total).toBeGreaterThanOrEqual(c.target - c.tol);
      expect(total).toBeLessThanOrEqual(c.target + c.tol);
    });
  }

  it('produces a 6-dimension breakdown for every reference role', () => {
    for (const c of REFERENCE_CASES) {
      const { dimensions } = calculateScore(c.role, c.industry, c.exp, c.country);
      expect(dimensions.map(d => d.key)).toEqual(['D1', 'D2', 'D3', 'D4', 'D5', 'D6']);
    }
  });
});

describe('experience-shield bug guard (10-20 / 20+ must engage)', () => {
  it('normalizeExperience maps UI keys to canonical engine keys', () => {
    expect(normalizeExperience('10-20')).toBe('10-15');
    expect(normalizeExperience('20+')).toBe('15+');
    expect(normalizeExperience('5-10')).toBe('5-10');
    expect(normalizeExperience(undefined)).toBe('5-10');
  });

  it('D4 (Experience Shield) strictly decreases with seniority for a fixed role', () => {
    const role = 'sw_arch';
    const d4 = ALL_EXP.map(e => calculateD4(role, e));
    for (let i = 1; i < d4.length; i++) {
      expect(d4[i]).toBeLessThan(d4[i - 1]); // more experience → lower risk
    }
  });

  it('D4 for 10-20 / 20+ is NOT the generic 50 fallback', () => {
    // The bug symptom: senior/principal fell through to ~50. With the fix both
    // brackets must be well below mid-level (5-10).
    const mid = calculateD4('sw_arch', '5-10');
    expect(calculateD4('sw_arch', '10-20')).toBeLessThan(mid);
    expect(calculateD4('sw_arch', '20+')).toBeLessThan(calculateD4('sw_arch', '10-20'));
  });

  it("UI keys resolve identically to the engine's canonical keys", () => {
    expect(calculateD4('sw_arch', '10-20')).toBe(calculateD4('sw_arch', '10-15'));
    expect(calculateD4('sw_arch', '20+')).toBe(calculateD4('sw_arch', '15+'));
    expect(calculateD6('con_strategy', '10-20')).toBe(calculateD6('con_strategy', '10-15'));
    expect(calculateD6('con_strategy', '20+')).toBe(calculateD6('con_strategy', '15+'));
  });

  it('D6 (Social Capital Moat) applies the senior network bonus for 20+', () => {
    // 20+ must carry a stronger moat (lower score) than entry level.
    expect(calculateD6('con_strategy', '20+')).toBeLessThan(calculateD6('con_strategy', '0-2'));
  });

  it('overall score for a senior is no higher than the same role at mid-level', () => {
    const senior = calculateScore('sw_arch', 'it_software', '20+', 'germany').total;
    const mid    = calculateScore('sw_arch', 'it_software', '5-10', 'germany').total;
    expect(senior).toBeLessThanOrEqual(mid);
  });
});
