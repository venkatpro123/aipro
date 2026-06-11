// detectors.test.ts — Phase 3 (Detection Network): pure change-detector logic.
// Verifies each detector fires ONLY on a meaningful change, dedupes, and carries
// causal evidence.

import { describe, it, expect } from 'vitest';
import {
  demandShiftDetector,
  compGapDetector,
  stagnationDetector,
  newsEventToAlert,
  rankAlerts,
} from '../../services/detectors';

describe('demandShiftDetector', () => {
  it('returns null when either value is missing or change is < 8', () => {
    expect(demandShiftDetector(undefined, 70)).toBeNull();
    expect(demandShiftDetector(60, undefined)).toBeNull();
    expect(demandShiftDetector(60, 65)).toBeNull(); // 5 < 8
  });
  it('fires on a >= 8pt drop with causal evidence + market category', () => {
    const a = demandShiftDetector(70, 55, 'declining');
    expect(a).not.toBeNull();
    expect(a!.category).toBe('market');
    expect(a!.severity).toBe('high'); // 15pt drop
    expect(a!.evidence).toContain('70/100');
    expect(a!.evidence).toContain('55/100');
    expect(a!.dedupeKey).toBe('demand:70->55');
  });
  it('fires on a rise as info', () => {
    const a = demandShiftDetector(50, 62);
    expect(a!.severity).toBe('info');
    expect(a!.headline).toMatch(/jumped/);
  });
});

describe('compGapDetector', () => {
  it('fires only on the downward crossing past -15%', () => {
    expect(compGapDetector(-10, -8)).toBeNull();           // not crossed
    expect(compGapDetector(-20, -22)).toBeNull();          // already below — sustained
    const a = compGapDetector(-10, -18);
    expect(a).not.toBeNull();
    expect(a!.detector).toBe('comp_gap');
    expect(a!.headline).toContain('18%');
  });
  it('escalates to high past -25%', () => {
    expect(compGapDetector(0, -27)!.severity).toBe('high');
    expect(compGapDetector(0, -18)!.severity).toBe('info');
  });
});

describe('stagnationDetector', () => {
  const flat = [
    { date: '2026-04-01', score: 60 },
    { date: '2026-05-01', score: 61 },
    { date: '2026-06-01', score: 60 },
  ];
  it('needs >= 3 audits', () => {
    expect(stagnationDetector(flat.slice(0, 2), 0)).toBeNull();
  });
  it('fires on a flat plateau with no outcomes', () => {
    const a = stagnationDetector(flat, 0);
    expect(a).not.toBeNull();
    expect(a!.detector).toBe('stagnation');
    expect(a!.evidence).toContain('60 → 61 → 60');
    expect(a!.dedupeKey).toBe('stagnation:2026-04-01_2026-06-01');
  });
  it('does NOT fire when the score is moving or outcomes were logged', () => {
    expect(stagnationDetector([...flat.slice(0, 2), { date: '2026-06-01', score: 72 }], 0)).toBeNull();
    expect(stagnationDetector(flat, 2)).toBeNull();
  });
});

describe('newsEventToAlert', () => {
  it('maps a high-confidence / big-cut event to a critical company alert', () => {
    const a = newsEventToAlert({ id: 'e1', company_name: 'Acme', headline: 'Acme cuts 12%', event_date: '2026-06-10', percent_cut: 12, confidence: 'high' });
    expect(a.severity).toBe('critical');
    expect(a.category).toBe('company');
    expect(a.dedupeKey).toBe('news:e1');
    expect(a.evidence).toContain('watchlist');
  });
  it('low-confidence undisclosed-size event is info', () => {
    expect(newsEventToAlert({ id: 'e2', company_name: 'Acme', headline: 'rumor', event_date: '2026-06-10', percent_cut: null, confidence: 'low' }).severity).toBe('info');
  });
});

describe('rankAlerts', () => {
  it('orders critical > high > info', () => {
    const ranked = rankAlerts([
      { severity: 'info' as const }, { severity: 'critical' as const }, { severity: 'high' as const },
    ]);
    expect(ranked.map(r => r.severity)).toEqual(['critical', 'high', 'info']);
  });
});
