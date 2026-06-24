import { describe, it, expect } from "vitest";
import {
  calculateLayoffScore,
  type ScoreInputs,
} from "../../services/layoffScoreEngine";
import { companyDatabase, getPPPMultiplier } from "../../data/companyDatabase";
import { industryRiskData } from "../../data/industryRiskData";

describe("Scenario Tests - Geographic & Regional", () => {
  describe("PPP Regional Multipliers", () => {
    it("US should have multiplier of 1.0", () => {
      expect(getPPPMultiplier("US")).toBe(1.0);
    });

    it("EU should have multiplier of 0.9", () => {
      expect(getPPPMultiplier("EU")).toBe(0.9);
    });

    it("India should have multiplier of 0.25", () => {
      expect(getPPPMultiplier("IN")).toBe(0.25);
    });

    it("APAC should have multiplier of 0.45", () => {
      expect(getPPPMultiplier("APAC")).toBe(0.45);
    });
  });

  describe("Regional Score Differences", () => {
    it("Same company in different regions should have different scores due to PPP", () => {
      const baseCompany = {
        ...companyDatabase.find((c) => c.name === "Google")!,
        name: "Test Company",
        isPublic: true,
        employeeCount: 10000,
        revenueGrowthYoY: 10,
        stock90DayChange: 5,
        layoffsLast24Months: [],
        layoffRounds: 0,
        lastLayoffPercent: null,
        revenuePerEmployee: 80000,
      };

      const usInputs: ScoreInputs = {
        companyData: { ...baseCompany, region: "US" as const },
        industryData: industryRiskData["Technology"],
        roleTitle: "Software Engineer",
        department: "Engineering",
        userFactors: {
          tenureYears: 5,
          isUniqueRole: false,
          performanceTier: "average",
          hasRecentPromotion: false,
          hasKeyRelationships: true,
        },
      };

      const inInputs: ScoreInputs = {
        ...usInputs,
        companyData: { ...baseCompany, region: "IN" as const },
      };

      const usResult = calculateLayoffScore(usInputs);
      const inResult = calculateLayoffScore(inInputs);

      // PPP operates through L1 overstaffing: US $80K/emp → high risk (0.85),
      // IN $80K/emp → 100% above sector median ($40K) → very efficient (0.10).
      // Final integer scores may round to the same value, so assert on L1 directly.
      expect(usResult.breakdown.L1).toBeGreaterThan(inResult.breakdown.L1);
    });
  });

  describe("Country-Specific Company Benchmarks", () => {
    it("TCS (India) should have stable profile", () => {
      const tcs = companyDatabase.find(
        (c) => c.name === "Tata Consultancy Services",
      );
      expect(tcs).toBeDefined();
      expect(tcs!.region).toBe("IN");

      const inputs: ScoreInputs = {
        companyData: tcs!,
        industryData: industryRiskData["Technology"],
        roleTitle: "Software Engineer",
        department: "Engineering",
        userFactors: {
          tenureYears: 5,
          isUniqueRole: false,
          performanceTier: "average",
          hasRecentPromotion: false,
          hasKeyRelationships: true,
        },
      };
      const result = calculateLayoffScore(inputs);
      expect(result.score).toBeLessThan(50);
    });

    it("Infosys (India) should be available", () => {
      const infosys = companyDatabase.find((c) => c.name === "Infosys");
      expect(infosys).toBeDefined();
      expect(infosys!.region).toBe("IN");
    });

    it("Wipro (India) should be available", () => {
      const wipro = companyDatabase.find((c) => c.name === "Wipro");
      expect(wipro).toBeDefined();
      expect(wipro!.region).toBe("IN");
    });
  });

  describe("Regional Risk Profile Validation", () => {
    it("India region should have lower risk threshold due to PPP", () => {
      const baseCompany = {
        ...companyDatabase.find((c) => c.name === "Google")!,
        name: "Regional Test",
        revenuePerEmployee: 100000,
      };

      const usScore = calculateLayoffScore({
        companyData: { ...baseCompany, region: "US" as const },
        industryData: industryRiskData["Technology"],
        roleTitle: "Software Engineer",
        department: "Engineering",
        userFactors: {
          tenureYears: 5,
          isUniqueRole: false,
          performanceTier: "average",
          hasRecentPromotion: false,
          hasKeyRelationships: true,
        },
      });

      const inScore = calculateLayoffScore({
        companyData: { ...baseCompany, region: "IN" as const },
        industryData: industryRiskData["Technology"],
        roleTitle: "Software Engineer",
        department: "Engineering",
        userFactors: {
          tenureYears: 5,
          isUniqueRole: false,
          performanceTier: "average",
          hasRecentPromotion: false,
          hasKeyRelationships: true,
        },
      });

      expect(usScore.breakdown.L1).not.toBe(inScore.breakdown.L1);
    });
  });
});
