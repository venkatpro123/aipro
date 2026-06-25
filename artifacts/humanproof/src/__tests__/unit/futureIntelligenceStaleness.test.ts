// futureIntelligenceStaleness.test.ts — Master Loop iteration 8
//
// PROBLEM: displacement trajectory forecasts, India sector intelligence, and
// role exposure scores are all 100% hardcoded with no refresh path — unlike
// market job-opening data (careerPathMarket.ts) and baseline industry risk
// (industryRiskData.ts), which both surface an explicit "as of [date] — N
// months old" disclosure. These 3 sources had ZERO staleness signal: a
// 2-year-old forecast would be presented with the same confidence as a
// fresh one. This adds the same dataAsOf/dataAgeDays/isDataStale pattern to
// all three, closing the "Intelligence Staleness" gap from the audit for
// the sources that previously had no disclosure at all.

import { describe, it, expect } from 'vitest';
import {
  computeTrajectory,
  DISPLACEMENT_GROWTH_DATA_AS_OF,
  DISPLACEMENT_DATA_STALE_DAYS,
  getDisplacementDataAgeDays,
  type TrajectoryEngineParams,
} from '../../services/DisplacementTrajectoryEngine';
import {
  getIndiaRiskEnrichment,
  INDIA_SECTOR_DATA_AS_OF,
  INDIA_SECTOR_DATA_STALE_DAYS,
  getIndiaSectorDataAgeDays,
} from '../../services/indiaSectorIntelligence';
import {
  ROLE_EXPOSURE_DATA_AS_OF,
  ROLE_EXPOSURE_DATA_STALE_DAYS,
  getRoleExposureDataAgeDays,
  isRoleExposureDataStale,
} from '../../data/roleExposureData';

describe('DisplacementTrajectoryEngine — staleness disclosure', () => {
  const baseParams: TrajectoryEngineParams = {
    currentScore: 50,
    oracleResult: null,
    roleKey: 'sw_backend',
    experience: '5-10',
  };

  it('getDisplacementDataAgeDays computes a non-negative day count from DISPLACEMENT_GROWTH_DATA_AS_OF', () => {
    const ageDays = getDisplacementDataAgeDays();
    expect(ageDays).toBeGreaterThanOrEqual(0);
    const expected = Math.round((Date.now() - new Date(DISPLACEMENT_GROWTH_DATA_AS_OF).getTime()) / 86_400_000);
    expect(ageDays).toBe(Math.max(0, expected));
  });

  it('computeTrajectory result includes dataAsOf, dataAgeDays, isDataStale', () => {
    const result = computeTrajectory(baseParams);
    expect(result.dataAsOf).toBe(DISPLACEMENT_GROWTH_DATA_AS_OF);
    expect(result.dataAgeDays).toBeGreaterThanOrEqual(0);
    expect(typeof result.isDataStale).toBe('boolean');
  });

  it('isDataStale is true once age exceeds DISPLACEMENT_DATA_STALE_DAYS', () => {
    const ageDays = getDisplacementDataAgeDays();
    const result = computeTrajectory(baseParams);
    expect(result.isDataStale).toBe(ageDays > DISPLACEMENT_DATA_STALE_DAYS);
  });

  it('dataAsOf/dataAgeDays are identical across different roleKey inputs (shared dataset vintage)', () => {
    const a = computeTrajectory({ ...baseParams, roleKey: 'sw_backend' });
    const b = computeTrajectory({ ...baseParams, roleKey: 'data_scientist' });
    expect(a.dataAsOf).toBe(b.dataAsOf);
    expect(a.dataAgeDays).toBe(b.dataAgeDays);
  });
});

describe('indiaSectorIntelligence — staleness disclosure', () => {
  it('getIndiaSectorDataAgeDays computes a non-negative day count from INDIA_SECTOR_DATA_AS_OF', () => {
    const ageDays = getIndiaSectorDataAgeDays();
    expect(ageDays).toBeGreaterThanOrEqual(0);
    const expected = Math.round((Date.now() - new Date(INDIA_SECTOR_DATA_AS_OF).getTime()) / 86_400_000);
    expect(ageDays).toBe(Math.max(0, expected));
  });

  it('getIndiaRiskEnrichment result includes dataAsOf, dataAgeDays, isDataStale for India-primary companies', () => {
    const result = getIndiaRiskEnrichment('TCS', 'IT Services', 'IN');
    expect(result.dataAsOf).toBe(INDIA_SECTOR_DATA_AS_OF);
    expect(result.dataAgeDays).toBeGreaterThanOrEqual(0);
    expect(typeof result.isDataStale).toBe('boolean');
  });

  it('getIndiaRiskEnrichment result includes the same staleness fields for non-India companies too', () => {
    // Staleness reflects the DATASET's vintage, independent of whether this
    // particular company is India-primary — the disclosure should never be
    // silently dropped just because isIndiaPrimary is false.
    const result = getIndiaRiskEnrichment('Microsoft', 'Technology', 'US');
    expect(result.dataAsOf).toBe(INDIA_SECTOR_DATA_AS_OF);
    expect(typeof result.isDataStale).toBe('boolean');
  });

  it('isDataStale is true once age exceeds INDIA_SECTOR_DATA_STALE_DAYS', () => {
    const ageDays = getIndiaSectorDataAgeDays();
    const result = getIndiaRiskEnrichment('Infosys', 'IT Services', 'IN');
    expect(result.isDataStale).toBe(ageDays > INDIA_SECTOR_DATA_STALE_DAYS);
  });
});

describe('roleExposureData — staleness disclosure', () => {
  it('getRoleExposureDataAgeDays computes a non-negative day count from ROLE_EXPOSURE_DATA_AS_OF', () => {
    const ageDays = getRoleExposureDataAgeDays();
    expect(ageDays).toBeGreaterThanOrEqual(0);
    const expected = Math.round((Date.now() - new Date(ROLE_EXPOSURE_DATA_AS_OF).getTime()) / 86_400_000);
    expect(ageDays).toBe(Math.max(0, expected));
  });

  it('isRoleExposureDataStale reflects the configured threshold', () => {
    const ageDays = getRoleExposureDataAgeDays();
    expect(isRoleExposureDataStale()).toBe(ageDays > ROLE_EXPOSURE_DATA_STALE_DAYS);
  });

  it('staleness functions are pure — repeated calls within the same tick agree', () => {
    const first = getRoleExposureDataAgeDays();
    const second = getRoleExposureDataAgeDays();
    expect(first).toBe(second);
  });
});
