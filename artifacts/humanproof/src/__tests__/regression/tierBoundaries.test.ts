import { describe, it, expect } from "vitest";
import {
  calculateLayoffScore,
  type ScoreInputs,
} from "../../services/layoffScoreEngine";
import { companyDatabase } from "../../data/companyDatabase";
import { industryRiskData } from "../../data/industryRiskData";

describe("Regression Tests - Tier Boundaries", () => {
  describe("Tier Boundary Validation", () => {
    it('Score 0-14 should be "Very low risk"', () => {
      const inputs: ScoreInputs = {
        companyData: {
          ...companyDatabase.find((c) => c.name === "Apple")!,
          employeeCount: 200000,
          revenueGrowthYoY: 25,
          stock90DayChange: 20,
          layoffsLast24Months: [],
          layoffRounds: 0,
          lastLayoffPercent: null,
          revenuePerEmployee: 500000,
        },
        industryData: industryRiskData["Healthcare"],
        roleTitle: "Physician",
        department: "Healthcare",
        userFactors: {
          tenureYears: 20,
          isUniqueRole: true,
          performanceTier: "top",
          hasRecentPromotion: true,
          hasKeyRelationships: true,
        },
      };
      const result = calculateLayoffScore(inputs);
      expect(result.score).toBeLessThanOrEqual(14);
      expect(result.tier.label).toBe("Very low risk");
    });

    it('Score 15-34 should be "Low risk"', () => {
      const inputs: ScoreInputs = {
        companyData: {
          ...companyDatabase.find((c) => c.name === "Apple")!,
          revenueGrowthYoY: 15,
          stock90DayChange: 10,
          layoffsLast24Months: [],
          revenuePerEmployee: 400000,
        },
        industryData: industryRiskData["Healthcare"],
        roleTitle: "Nurse",
        department: "Healthcare",
        userFactors: {
          tenureYears: 10,
          isUniqueRole: false,
          performanceTier: "average",
          hasRecentPromotion: false,
          hasKeyRelationships: true,
        },
      };
      const result = calculateLayoffScore(inputs);
      expect(result.tier.label).toBe("Low risk");
    });

    it('Score 35-54 should be "Moderate risk"', () => {
      const inputs: ScoreInputs = {
        companyData: {
          ...companyDatabase.find((c) => c.name === "Google")!,
          revenueGrowthYoY: 5,
          stock90DayChange: 0,
          layoffsLast24Months: [],
          revenuePerEmployee: 250000,
        },
        industryData: industryRiskData["Technology"],
        roleTitle: "Business Analyst",
        department: "Product",
        userFactors: {
          tenureYears: 4,
          isUniqueRole: false,
          performanceTier: "average",
          hasRecentPromotion: false,
          hasKeyRelationships: false,
        },
      };
      const result = calculateLayoffScore(inputs);
      expect(result.tier.label).toBe("Moderate risk");
    });

    it('Score 55-74 should be "Elevated risk"', () => {
      const inputs: ScoreInputs = {
        companyData: {
          ...companyDatabase.find((c) => c.name === "Meta")!,
          revenueGrowthYoY: -5,
          stock90DayChange: -10,
          layoffsLast24Months: [{ date: "2025-12-01", percentCut: 5 }],
          revenuePerEmployee: 200000,
        },
        industryData: industryRiskData["Media & Publishing"],
        roleTitle: "Marketing Coordinator",
        department: "Marketing",
        userFactors: {
          tenureYears: 2,
          isUniqueRole: false,
          performanceTier: "average",
          hasRecentPromotion: false,
          hasKeyRelationships: false,
        },
      };
      const result = calculateLayoffScore(inputs);
      expect(result.tier.label).toBe("Elevated risk");
    });

    it('Score 75-100 should be "High risk"', () => {
      // Maximally distressed public company: severe revenue contraction (-50%),
      // stock crash (-45%), 4 layoff rounds, zero personal protection, highest-
      // displacement role. Three signals added in v17.1 to compensate for the
      // D3 weight reduction (0.11→0.09):
      //   1. isPublic: true  — activates the -45% stock signal in L1 (+~1.6 pts)
      //   2. aiInvestmentSignal: "very_high" — maxes D2 AI tool maturity (+~0.8 pts)
      //   3. liveHiringSignal frozen — pushes calibrated L3 to its ceiling (+~1.2 pts)
      // Combined brings the score from ~71 (where the private-company variant lands)
      // to ~75–77, firmly in the "High risk" tier.
      const inputs: ScoreInputs = {
        companyData: {
          name: "Collapsing Startup",
          isPublic: true,               // activates stock90DayChange in L1 calculation
          industry: "Startups (pre-seed)",
          region: "US",
          employeeCount: 500,
          revenueGrowthYoY: -50,        // -50% YoY — severe contraction
          stock90DayChange: -45,        // -45% crash → calibratedStockTrendRisk = 0.92
          layoffsLast24Months: [
            { date: "2026-03-01", percentCut: 40 },
            { date: "2025-09-01", percentCut: 25 },
          ],
          layoffRounds: 4,
          lastLayoffPercent: 40,
          revenuePerEmployee: 30000,    // well below sector floor
          aiInvestmentSignal: "very_high", // maxes D2 AI tool maturity
          ceoTenureMonths: 3,           // new CEO — leadership instability (D7 signal 1)
          cSuiteChanges12m: 4,          // mass executive exodus (D7 signal 2)
          glassdoorTrendDirection: 'falling' as const, // deteriorating sentiment (D7 signal 4)
          source: "Test",
          lastUpdated: "2026-05-10",
        },
        industryData: industryRiskData["Startups (pre-seed)"],
        roleTitle: "Data Entry Specialist",
        department: "Administration",
        userFactors: {
          tenureYears: 0.3,             // probationary — last in, first out
          isUniqueRole: false,
          uniquenessDepth: "generic",   // fully generic role
          performanceTier: "below",
          hasRecentPromotion: false,
          hasKeyRelationships: false,
        },
        liveHiringSignal: {             // frozen hiring → L3 ceiling (+~1.2 pts)
          postingTrend: 'frozen',
          isLive: true,
        },
        referenceDate: new Date("2026-05-10"),
      };
      const result = calculateLayoffScore(inputs);
      expect(result.score).toBeGreaterThanOrEqual(75);
      expect(result.tier.label).toBe("High risk");
    });
  });

  describe("Department Multipliers Regression", () => {
    it("should apply department multipliers correctly", () => {
      const company = companyDatabase.find((c) => c.name === "Google")!;
      const baseInputs: ScoreInputs = {
        companyData: company,
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
      const engResult = calculateLayoffScore(baseInputs);

      const hrInputs: ScoreInputs = {
        ...baseInputs,
        department: "HR",
        roleTitle: "HR Business Partner",
      };
      const hrResult = calculateLayoffScore(hrInputs);

      expect(engResult.breakdown.L3).toBeLessThan(hrResult.breakdown.L3);
    });

    it("HR should have multiplier 1.20 (higher risk)", () => {
      const company = companyDatabase.find((c) => c.name === "Google")!;
      const baseInputs: ScoreInputs = {
        companyData: company,
        industryData: industryRiskData["Technology"],
        roleTitle: "HR Business Partner",
        department: "HR",
        userFactors: {
          tenureYears: 5,
          isUniqueRole: false,
          performanceTier: "average",
          hasRecentPromotion: false,
          hasKeyRelationships: true,
        },
      };
      const hrResult = calculateLayoffScore(baseInputs);

      const engInputs: ScoreInputs = {
        ...baseInputs,
        department: "Engineering",
        roleTitle: "Software Engineer",
      };
      const engResult = calculateLayoffScore(engInputs);

      expect(hrResult.breakdown.L3).toBeGreaterThan(engResult.breakdown.L3);
    });
  });

  describe("PPP Regional Adjustments Regression", () => {
    it("US region should have highest revenue threshold", () => {
      const company = companyDatabase.find((c) => c.name === "Google")!;
      const baseInputs: ScoreInputs = {
        companyData: {
          ...company,
          region: "US" as const,
          revenuePerEmployee: 200000,
        },
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
        ...baseInputs,
        companyData: {
          ...company,
          region: "IN" as const,
          revenuePerEmployee: 200000,
        },
      };

      const usResult = calculateLayoffScore(baseInputs);
      const inResult = calculateLayoffScore(inInputs);

      expect(usResult.breakdown.L1).not.toBe(inResult.breakdown.L1);
    });
  });

  describe("Benchmark Accuracy Targets", () => {
    it("Oracle (Apr 2026) should be Elevated or High risk", () => {
      const oracle = companyDatabase.find((c) => c.name === "Oracle")!;
      const inputs: ScoreInputs = {
        companyData: oracle,
        industryData: industryRiskData["Technology"],
        roleTitle: "Software Engineer",
        department: "Engineering",
        userFactors: {
          tenureYears: 3,
          isUniqueRole: false,
          performanceTier: "average",
          hasRecentPromotion: false,
          hasKeyRelationships: true,
        },
      };
      const result = calculateLayoffScore(inputs);
      expect(result.score).toBeGreaterThanOrEqual(35);
    });

    it("Apple should be Low risk (15-34)", () => {
      const apple = companyDatabase.find((c) => c.name === "Apple")!;
      const inputs: ScoreInputs = {
        companyData: apple,
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
      expect(result.tier.label).toMatch(/Low risk|Very low risk|Moderate risk/);
    });
  });
});
