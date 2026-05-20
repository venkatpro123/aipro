// salaryTrajectoryCalibration.test.ts
// Contract tests for the salary trajectory CALIBRATION_META.
//
// The applicability disclosure rule:
//   - AER-2020 dominant tier → requiresApplicabilityDisclosure = true
//   - BLS-2024 dominant tier → requiresApplicabilityDisclosure = false (stronger match)

import { describe, it, expect } from 'vitest';
import { getTrajectoryCalibration } from '../../components/SalaryAtRiskPanel';

describe('salary trajectory CALIBRATION_META', () => {
  it('critical tier (score ≥ 80) uses AER-2020 primary + shows applicability disclosure', () => {
    const c = getTrajectoryCalibration(85);
    expect(c.tierPrimarySource).toBe('AER-2020');
    expect(c.requiresApplicabilityDisclosure).toBe(true);
    expect(c.disclosureText).toContain('US manufacturing');
    expect(c.disclosureText).toContain('India IT sector displacement data pending');
    expect(c.disclosureText).toContain('modeled estimate');
  });

  it('high tier (score 65–79) uses AER-2020 primary + shows applicability disclosure', () => {
    const c = getTrajectoryCalibration(70);
    expect(c.tierPrimarySource).toBe('AER-2020');
    expect(c.requiresApplicabilityDisclosure).toBe(true);
    expect(c.disclosureText).toContain('US manufacturing');
  });

  it('moderate tier (score 45–64) uses BLS-2024 primary + NO applicability warning', () => {
    const c = getTrajectoryCalibration(55);
    expect(c.tierPrimarySource).toBe('BLS-2024');
    expect(c.requiresApplicabilityDisclosure).toBe(false);
  });

  it('low tier (score < 45) uses BLS-2024 primary + NO applicability warning', () => {
    const c = getTrajectoryCalibration(30);
    expect(c.tierPrimarySource).toBe('BLS-2024');
    expect(c.requiresApplicabilityDisclosure).toBe(false);
  });

  it('every tier has citations for the 4 key parameters', () => {
    for (const score of [85, 70, 55, 30]) {
      const c = getTrajectoryCalibration(score);
      expect(c.parameters.noActionMultiplierM36.primarySource).toBeTruthy();
      expect(c.parameters.transitionDipFraction.primarySource).toBeTruthy();
      expect(c.parameters.transitionRecoveryM36.primarySource).toBeTruthy();
      expect(c.parameters.severanceMonths.primarySource).toBeTruthy();
    }
  });

  it('every parameter has a non-empty applicabilityNote', () => {
    for (const score of [85, 70, 55, 30]) {
      const c = getTrajectoryCalibration(score);
      const params = Object.values(c.parameters);
      for (const p of params) {
        expect(p.applicabilityNote.length).toBeGreaterThan(20);
      }
    }
  });

  it('severanceMonths is sourced from IDA (India Industrial Disputes Act) across all tiers', () => {
    for (const score of [85, 70, 55, 30]) {
      expect(getTrajectoryCalibration(score).parameters.severanceMonths.primarySource).toBe('IDA');
    }
  });

  it('critical tier noActionMultiplierM36 cites AER-2020 (US manufacturing) as primary source', () => {
    const c = getTrajectoryCalibration(85);
    expect(c.parameters.noActionMultiplierM36.primarySource).toBe('AER-2020');
    expect(c.parameters.noActionMultiplierM36.applicabilityNote).toContain('manufacturing');
  });

  it('moderate tier noActionMultiplierM36 cites BLS-2024 as primary source', () => {
    const c = getTrajectoryCalibration(55);
    expect(c.parameters.noActionMultiplierM36.primarySource).toBe('BLS-2024');
  });

  it('all tiers acknowledge transitionDipFraction primary source as BLS-2024 (contemporary survey)', () => {
    for (const score of [85, 70, 55, 30]) {
      expect(getTrajectoryCalibration(score).parameters.transitionDipFraction.primarySource).toBe('BLS-2024');
    }
  });

  it('uncertainty bands scale with source applicability (AER-dominant tiers > BLS-dominant tiers)', () => {
    const critical = getTrajectoryCalibration(85);
    const low      = getTrajectoryCalibration(30);
    // Critical (AER-dominant) should have wider noActionMultiplier uncertainty than Low (BLS-dominant)
    expect(critical.parameters.noActionMultiplierM36.uncertaintyPct).toBeGreaterThan(
      low.parameters.noActionMultiplierM36.uncertaintyPct ?? 0,
    );
  });
});
