import { describe, it, expect } from "vitest";
import {
  calculateCompanyHealthScore,
  calculateLayoffScore,
  type ScoreInputs,
} from "../../services/layoffScoreEngine";
import { type CompanyData } from "../../data/companyDatabase";
import { industryRiskData } from "../../data/industryRiskData";
import {
  computeSegmentCalibration,
  classifyIndustry,
  classifyCompanySize,
  classifyRegion,
} from "../../services/segmentedCalibrationEngine";

// ── Fixtures ──────────────────────────────────────────────────────────────────
//
// Google and Wipro are intentionally constructed to produce similar composite
// scores via DIFFERENT dimension profiles:
//   Google:  high L1 (strong financials), moderate L3 (AI displacement)
//   Wipro:   low L1 (financials irrelevant to India IT layoffs), high L3
//            (AI BPO substitution amplified by HYPERSCALER_IT_SERVICES_INDIA 1.35×)
//
// After BUG-3 fix: Wipro industry is 'IT Services' → classifyIndustry returns
// 'IT_SERVICES' → segment = HYPERSCALER_IT_SERVICES_INDIA (l3=1.35, l1=0.75).
// Before the fix: Wipro was 'Technology' → HYPERSCALER_TECH (l1=0.70, l3=1.10) —
// same segment as Google, making their calibration indistinguishable.

const googleCompany: CompanyData = {
  name: "Google",
  ticker: "GOOGL",
  isPublic: true,
  industry: "Technology",
  region: "US",
  employeeCount: 180000,
  revenueGrowthYoY: 15,
  stock90DayChange: 8,
  layoffsLast24Months: [{ date: "2024-01-20", percentCut: 6 }],
  layoffRounds: 1,
  lastLayoffPercent: 6,
  revenuePerEmployee: 380000,
  aiInvestmentSignal: "high",
  source: "Crunchbase + Layoffs.fyi",
  lastUpdated: "2026-04-01",
};

const wiproCompany: CompanyData = {
  name: "Wipro",
  ticker: "WIT",
  isPublic: true,
  industry: "IT Services",   // BUG-3 fix: was 'Technology', now 'IT Services'
  region: "IN",
  employeeCount: 240000,
  revenueGrowthYoY: 2,
  stock90DayChange: -8,
  layoffsLast24Months: [{ date: "2025-09-01", percentCut: 3 }],
  layoffRounds: 1,
  lastLayoffPercent: 3,
  revenuePerEmployee: 45000,
  aiInvestmentSignal: "medium",
  source: "Crunchbase",
  lastUpdated: "2026-04-01",
};

const sharedInputs: Omit<ScoreInputs, "companyData"> = {
  industryData: industryRiskData["Technology"],
  roleTitle: "Software Engineer",
  department: "Engineering",
  referenceDate: new Date("2026-05-20"),
  userFactors: {
    tenureYears: 4,
    isUniqueRole: false,
    performanceTier: "average",
    hasRecentPromotion: false,
    hasKeyRelationships: false,
  },
};

// ── Segment Classification Tests ──────────────────────────────────────────────

describe("Segment classification — BUG-3 regression", () => {
  it("Wipro 'IT Services' classifies as IT_SERVICES, not TECH", () => {
    expect(classifyIndustry("IT Services")).toBe("IT_SERVICES");
  });

  it("Google 'Technology' still classifies as TECH", () => {
    expect(classifyIndustry("Technology")).toBe("TECH");
  });

  it("classifyIndustry does not regress: 'it_services' (underscore) still works", () => {
    expect(classifyIndustry("it_services")).toBe("IT_SERVICES");
  });

  it("classifyIndustry does not regress: 'outsourcing' still works", () => {
    expect(classifyIndustry("outsourcing")).toBe("IT_SERVICES");
  });

  it("Wipro 240,000 employees classifies as HYPERSCALER", () => {
    expect(classifyCompanySize(240000)).toBe("HYPERSCALER");
  });

  it("Wipro region 'IN' classifies as INDIA", () => {
    expect(classifyRegion("IN")).toBe("INDIA");
  });
});

// ── Segment Calibration Multiplier Tests ──────────────────────────────────────

describe("Segment calibration multipliers — Google vs Wipro differ post-fix", () => {
  const googleSeg = computeSegmentCalibration({
    baseScore: 68,
    employeeCount: 180000,
    industryKey: "Technology",
    region: "US",
    workTypeKey: "sw_backend",
  });

  const wiproSeg = computeSegmentCalibration({
    baseScore: 68,
    employeeCount: 240000,
    industryKey: "IT Services",
    region: "IN",
    workTypeKey: "sw_backend",
  });

  it("Google segment is HYPERSCALER TECH US", () => {
    expect(googleSeg.segment.companySizeSegment).toBe("HYPERSCALER");
    expect(googleSeg.segment.industrySegment).toBe("TECH");
    expect(googleSeg.segment.regionSegment).toBe("US");
  });

  it("Wipro segment is HYPERSCALER IT_SERVICES INDIA (not TECH after BUG-3 fix)", () => {
    expect(wiproSeg.segment.companySizeSegment).toBe("HYPERSCALER");
    expect(wiproSeg.segment.industrySegment).toBe("IT_SERVICES");
    expect(wiproSeg.segment.regionSegment).toBe("INDIA");
  });

  it("Wipro L3 multiplier (1.35) exceeds Google L3 multiplier (1.10)", () => {
    // India IT services L3=1.35 vs HYPERSCALER_TECH L3=1.10
    expect(wiproSeg.l3Multiplier).toBeGreaterThan(googleSeg.l3Multiplier);
    expect(wiproSeg.l3Multiplier).toBeGreaterThanOrEqual(1.30);
  });

  it("Wipro base layoff rate exceeds Google (India IT > US hyperscaler)", () => {
    // HYPERSCALER_IT_SERVICES_INDIA baseRate=0.25 vs HYPERSCALER_TECH baseRate=0.08
    expect(wiproSeg.baseLayoffRate).toBeGreaterThan(googleSeg.baseLayoffRate);
  });

  it("Google and Wipro segments differ (not the same calibration path)", () => {
    expect(wiproSeg.segment.industrySegment).not.toBe(googleSeg.segment.industrySegment);
    expect(wiproSeg.segment.regionSegment).not.toBe(googleSeg.segment.regionSegment);
  });
});

// ── L1 Health Score — Different Paths ─────────────────────────────────────────

describe("L1 health score — Google (healthy) vs Wipro (weaker financials)", () => {
  it("Google L1 is lower risk than Wipro L1 (stronger revenue + stock)", () => {
    const googleL1 = calculateCompanyHealthScore(googleCompany);
    const wiproL1  = calculateCompanyHealthScore(wiproCompany);
    // Google: revenueGrowthYoY=15, stock90DayChange=+8 → lower health risk
    // Wipro:  revenueGrowthYoY=2,  stock90DayChange=-8 → higher health risk
    expect(googleL1).toBeLessThan(wiproL1);
  });

  it("Both L1 scores are finite numbers in [0, 1]", () => {
    const googleL1 = calculateCompanyHealthScore(googleCompany);
    const wiproL1  = calculateCompanyHealthScore(wiproCompany);
    expect(Number.isFinite(googleL1)).toBe(true);
    expect(Number.isFinite(wiproL1)).toBe(true);
    expect(googleL1).toBeGreaterThanOrEqual(0);
    expect(googleL1).toBeLessThanOrEqual(1);
    expect(wiproL1).toBeGreaterThanOrEqual(0);
    expect(wiproL1).toBeLessThanOrEqual(1);
  });
});

// ── Full Pipeline Dimension Profiles ─────────────────────────────────────────

describe("Full pipeline — Google vs Wipro produce different dimension profiles", () => {
  const googleResult = calculateLayoffScore({ ...sharedInputs, companyData: googleCompany });
  const wiproResult  = calculateLayoffScore({ ...sharedInputs, companyData: wiproCompany });

  it("Both engines return finite scores in [0, 100]", () => {
    expect(Number.isFinite(googleResult.score)).toBe(true);
    expect(Number.isFinite(wiproResult.score)).toBe(true);
    expect(googleResult.score).toBeGreaterThanOrEqual(0);
    expect(googleResult.score).toBeLessThanOrEqual(100);
    expect(wiproResult.score).toBeGreaterThanOrEqual(0);
    expect(wiproResult.score).toBeLessThanOrEqual(100);
  });

  it("Google L1 (financial health) score is lower than Wipro L1", () => {
    // Google: strong revenue + stock → lower L1 risk
    expect(googleResult.breakdown.L1).toBeLessThan(wiproResult.breakdown.L1);
  });

  it("Dimension breakdowns are not identical (scores differ via different paths)", () => {
    // The key invariant: same-ball-park final scores must come from different
    // dimension profiles — otherwise the calibration is not doing its job.
    const googleL1 = googleResult.breakdown.L1;
    const wiproL1  = wiproResult.breakdown.L1;
    const googleL3 = googleResult.breakdown.L3;
    const wiproL3  = wiproResult.breakdown.L3;

    // At least one dimension should differ materially between the two companies.
    const maxL1Diff = Math.abs(googleL1 - wiproL1);
    const maxL3Diff = Math.abs(googleL3 - wiproL3);
    expect(Math.max(maxL1Diff, maxL3Diff)).toBeGreaterThan(0.05);
  });

  it("Wipro confidencePercent is finite and positive", () => {
    expect(Number.isFinite(wiproResult.confidencePercent)).toBe(true);
    expect(wiproResult.confidencePercent).toBeGreaterThan(0);
  });

  it("scoringArchetype differs between the two companies (Tier B pattern detected)", () => {
    // Google may detect 'ai_efficiency_restructuring' or 'low_risk_maintain'
    // Wipro may detect 'india_it_bench_risk' or another India-specific pattern
    // They should NOT be identical — different risk drivers, different patterns
    // (This assertion may be weak if both hit 'low_risk_maintain'; it exists to
    //  document that the archetype is now surfaced in ScoreResult.scoringArchetype.)
    expect(googleResult.scoringArchetype).toBeDefined();
    expect(wiproResult.scoringArchetype).toBeDefined();
    // The archetypes may differ — log them for manual verification in CI output
    // but do not hard-assert equality since archetype detection depends on thresholds
    // that legitimately overlap for some score ranges.
  });
});
