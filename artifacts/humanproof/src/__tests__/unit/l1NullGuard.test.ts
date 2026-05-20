import { describe, it, expect } from "vitest";
import {
  calculateCompanyHealthScore,
  calculateLayoffScore,
  type ScoreInputs,
} from "../../services/layoffScoreEngine";
import { type CompanyData } from "../../data/companyDatabase";
import { industryRiskData } from "../../data/industryRiskData";

// Fixture: a known public company whose L1 financial signals are both missing.
// Source is NOT 'Fallback' so the UI banner condition fires.
const nullL1Company: CompanyData = {
  name: "Acme Public Corp",
  isPublic: true,
  industry: "Technology",
  region: "US",
  employeeCount: 5000,
  revenueGrowthYoY: null,     // ← L1 signal 1 missing
  stock90DayChange: null,     // ← L1 signal 2 missing
  layoffsLast24Months: [],
  layoffRounds: 0,
  lastLayoffPercent: null,
  revenuePerEmployee: 200000,
  aiInvestmentSignal: "medium",
  source: "Supabase",         // known company — banner should render
  lastUpdated: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
};

// Baseline fixture with real L1 signals — used to verify CI is wider when null.
const baselineCompany: CompanyData = {
  ...nullL1Company,
  revenueGrowthYoY: 5,
  stock90DayChange: 2,
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

describe("L1 null-data guard — both stock90DayChange and revenueGrowthYoY null", () => {
  describe("calculateCompanyHealthScore (layer L1)", () => {
    it("returns a finite value in [0, 1] — does not crash or return NaN", () => {
      const score = calculateCompanyHealthScore(nullL1Company);
      expect(Number.isFinite(score)).toBe(true);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it("falls back to 0.50 sentinel only when ALL sub-signals are also absent", () => {
      const allNullCompany: CompanyData = {
        ...nullL1Company,
        employeeCount: 0,       // sizeRisk skipped (guard: > 0)
        revenuePerEmployee: 0,  // overstaffingRisk skipped (guard: > 0)
        // revenueGrowthYoY: null, stock90DayChange: null already
        // fundingRisk always fires (weight 0.15, public → 0.30 value)
        // so totalWeight is still 0.15 here — NOT zero.
        // True all-zero would require fundingRisk to be suppressed too,
        // which the engine does not do. Assert sentinel does NOT fire here.
      };
      const score = calculateCompanyHealthScore(allNullCompany);
      // fundingRisk (0.15 weight, 0.30 risk for public) dominates → ~0.30
      // Not 0.50 because totalWeight > 0.
      expect(score).not.toBe(0.50);
      expect(score).toBeLessThan(0.5);
    });
  });

  describe("calculateLayoffScore — full pipeline", () => {
    it("produces a score (engine does not throw or return undefined)", () => {
      const result = calculateLayoffScore({ ...sharedInputs, companyData: nullL1Company });
      expect(result).toBeDefined();
      expect(result.score).toBeDefined();
    });

    it("score is a finite number in [0, 100] — actual engine clamp range", () => {
      const result = calculateLayoffScore({ ...sharedInputs, companyData: nullL1Company });
      expect(Number.isFinite(result.score)).toBe(true);
      // NOTE: The engine clamps to [0, 100], not [5, 99].
      // A [5, 99] clamp does NOT exist in the codebase.
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it("confidencePercent is capped at ≤ 50 when both L1 signals are null", () => {
      const result = calculateLayoffScore({ ...sharedInputs, companyData: nullL1Company });
      expect(result.confidencePercent).toBeLessThanOrEqual(50);
    });

    it("confidencePercent is NOT capped when L1 signals are present (regression guard)", () => {
      const baseline = calculateLayoffScore({ ...sharedInputs, companyData: baselineCompany });
      // The cap at 50 must not fire when signals are available.
      // A well-sourced company with fresh data should exceed 50.
      expect(baseline.confidencePercent).toBeGreaterThan(50);
    });

    it("CI is at least 20 points wider than baseline (±10 each side)", () => {
      const nullResult  = calculateLayoffScore({ ...sharedInputs, companyData: nullL1Company });
      const baseResult  = calculateLayoffScore({ ...sharedInputs, companyData: baselineCompany });
      const nullRange   = nullResult.confidenceInterval.range;
      const baseRange   = baseResult.confidenceInterval.range;
      // null guard adds exactly 20 pts to the CI range (−10 low, +10 high)
      // before the [0,100] boundary clamps. Range must be ≥ 20 pts wider.
      expect(nullRange - baseRange).toBeGreaterThanOrEqual(20);
    });

    it("CI is flagged isEstimate:true when L1 signals are null", () => {
      const result = calculateLayoffScore({ ...sharedInputs, companyData: nullL1Company });
      expect(result.confidenceInterval.isEstimate).toBe(true);
    });

    it("CI low stays ≥ 0 even after subtracting 10 from a low baseline CI", () => {
      const result = calculateLayoffScore({ ...sharedInputs, companyData: nullL1Company });
      expect(result.confidenceInterval.low).toBeGreaterThanOrEqual(0);
    });

    it("CI high stays ≤ 100 even after adding 10 to a high baseline CI", () => {
      const result = calculateLayoffScore({ ...sharedInputs, companyData: nullL1Company });
      expect(result.confidenceInterval.high).toBeLessThanOrEqual(100);
    });

    it("signalQuality.missingDataFallbacks contains both null-signal disclosures", () => {
      const result = calculateLayoffScore({ ...sharedInputs, companyData: nullL1Company });
      const fallbacks = result.signalQuality.missingDataFallbacks.join(" ");
      // Revenue null disclosure
      expect(fallbacks).toMatch(/Revenue growth null|revenue.*null/i);
      // Stock null disclosure for public company
      expect(fallbacks).toMatch(/Stock 90-day|stock.*null/i);
      // Combined warning for both null on public company
      expect(fallbacks).toMatch(/Both stock and revenue|both.*null/i);
    });
  });

  describe("UI banner contract (data-layer assertion)", () => {
    // The OverviewTab banner renders when:
    //   companyData.revenueGrowthYoY == null
    //   && companyData.stock90DayChange == null
    //   && !companyData.source?.includes('Fallback')
    // This test asserts the data conditions that drive the banner — the render
    // itself is not tested here (no .tsx test runner configured in vitest.config.ts).

    it("fixture satisfies all three banner conditions", () => {
      expect(nullL1Company.revenueGrowthYoY).toBeNull();
      expect(nullL1Company.stock90DayChange).toBeNull();
      expect(nullL1Company.source).toBeDefined();
      expect(nullL1Company.source!.includes("Fallback")).toBe(false);
    });

    it("Fallback-sourced company does NOT satisfy the banner condition (unknown company path)", () => {
      const fallbackCompany: CompanyData = { ...nullL1Company, source: "Fallback - Unknown Company" };
      // Banner should NOT render for Fallback — the unknown-company warning covers it.
      expect(fallbackCompany.source!.includes("Fallback")).toBe(true);
    });
  });
});
