import { describe, it, expect } from "vitest";
import {
  roleExposureData,
  inferRoleRisk,
  calculateRoleExposureScore,
  type RoleExposure,
} from "../../data/roleExposureData";

describe("Role Exposure Data", () => {
  describe("roleExposureData", () => {
    it("should have at least 40 roles defined", () => {
      expect(Object.keys(roleExposureData).length).toBeGreaterThanOrEqual(40);
    });

    it("should have valid exposure values for each role", () => {
      Object.entries(roleExposureData).forEach(([role, exposure]) => {
        expect(exposure.aiRisk).toBeGreaterThanOrEqual(0);
        expect(exposure.aiRisk).toBeLessThanOrEqual(1);
        expect(exposure.layoffRisk).toBeGreaterThanOrEqual(0);
        expect(exposure.layoffRisk).toBeLessThanOrEqual(1);
        expect(["rising", "stable", "falling"]).toContain(exposure.demandTrend);
      });
    });

    it("should have high-risk roles with high layoffRisk", () => {
      const highRiskRoles = [
        "Data Entry Specialist",
        "Telemarketer",
        "Customer Service Representative",
      ];
      highRiskRoles.forEach((role) => {
        const exposure = roleExposureData[role];
        expect(exposure).toBeDefined();
        expect(exposure.layoffRisk).toBeGreaterThanOrEqual(0.65);
      });
    });

    it("should have low-risk roles with low layoffRisk", () => {
      const lowRiskRoles = [
        "ML Engineer",
        "Cybersecurity Engineer",
        "Physician",
      ];
      lowRiskRoles.forEach((role) => {
        const exposure = roleExposureData[role];
        expect(exposure).toBeDefined();
        expect(exposure.layoffRisk).toBeLessThanOrEqual(0.25);
      });
    });
  });

  describe("inferRoleRisk", () => {
    it("should return exact match for known role", () => {
      const result = inferRoleRisk("Software Engineer");
      expect(result.layoffRisk).toBe(0.45);
    });

    it("should use keyword matching for unknown role", () => {
      const result = inferRoleRisk("Senior Backend Developer");
      expect(result.layoffRisk).toBeDefined();
    });

    it("should handle case insensitivity", () => {
      const result1 = inferRoleRisk("software engineer");
      const result2 = inferRoleRisk("SOFTWARE ENGINEER");
      expect(result1.layoffRisk).toBe(result2.layoffRisk);
    });

    it("should return fallback for completely unknown role", () => {
      // "xyz123 not a real role" has 4 words (all > 2 chars), triggering the
      // ACC-BUG-09 specialist-complexity discount: 0.40 - 0.06 = 0.34.
      // This is the correct behaviour — long multi-word unknown titles receive a
      // small specialist discount vs. single-word generalist unknowns.
      const result = inferRoleRisk("xyz123 not a real role");
      expect(result.aiRisk).toBe(0.34);
      expect(result.layoffRisk).toBe(0.34);
    });
  });

  describe("calculateRoleExposureScore", () => {
    it("should return high score for high-risk role", () => {
      const score = calculateRoleExposureScore(
        "Data Entry Specialist",
        "Administration",
      );
      expect(score).toBeGreaterThan(0.6);
    });

    it("should return low score for low-risk role", () => {
      const score = calculateRoleExposureScore("ML Engineer", "Engineering");
      expect(score).toBeLessThan(0.3);
    });

    it("should apply department multipliers", () => {
      const score1 = calculateRoleExposureScore("Software Engineer", "Sales");
      const score2 = calculateRoleExposureScore(
        "Software Engineer",
        "Engineering",
      );
      expect(score1).toBeLessThan(score2);
    });

    it("should handle unknown roles via inference", () => {
      const score = calculateRoleExposureScore(
        "Unknown Role XYZ",
        "Operations",
      );
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });
});
