import { describe, expect, it } from "vitest";

import type { CompanyData } from "../../data/companyDatabase";
import type { IndustryRisk } from "../../data/industryRiskData";
import { buildHybridScorePayload } from "../../services/hybridConsensusBuilder";
import type { UserFactors } from "../../services/layoffScoreEngine";
import {
  reconcileCompanySignals,
  type LiveDataResult,
} from "../../services/liveDataService";

const BASE_COMPANY: CompanyData = {
  name: "ExampleCo",
  ticker: "EXM",
  stockTicker: "EXM",
  isPublic: true,
  industry: "Technology",
  region: "US",
  employeeCount: 2500,
  revenueGrowthYoY: 9,
  stock90DayChange: -4,
  layoffsLast24Months: [],
  layoffRounds: 0,
  lastLayoffPercent: null,
  revenuePerEmployee: 320000,
  aiInvestmentSignal: "high",
  source: "Supabase Intelligence",
  lastUpdated: "2026-01-01T00:00:00.000Z",
};

const USER_FACTORS: UserFactors = {
  tenureYears: 3,
  isUniqueRole: false,
  performanceTier: "average",
  hasRecentPromotion: false,
  hasKeyRelationships: false,
};

const INDUSTRY: IndustryRisk = {
  baselineRisk: 0.58,
  aiAdoptionRate: 0.8,
  growthOutlook: "volatile",
  avgLayoffRate2025: 0.07,
};

function createLiveData(overrides: Partial<LiveDataResult> = {}): LiveDataResult {
  return {
    stockData: null,
    newsData: null,
    hiringData: null,
    overallSource: "heuristic",
    liveSignalCount: 0,
    heuristicSignalCount: 0,
    informativeLiveSignals: 0,
    fetchedAt: "2026-04-15T00:00:00.000Z",
    apiErrors: [],
    derivedLayoffEvents: [],
    degradedSignalClasses: [],
    hardFailures: [],
    ...overrides,
  };
}

describe("live signal reconciliation", () => {
  it("prefers fresh live stock signals over stale DB values", () => {
    const liveData = createLiveData({
      stockData: {
        price90DayChange: -22,
        revenueGrowthYoY: -6,
        marketCap: null,
        peRatio: null,
        source: "alphavantage",
        fetchedAt: "2026-04-15T00:00:00.000Z",
      },
      liveSignalCount: 2,
      overallSource: "partial-live",
    });

    const reconciled = reconcileCompanySignals(
      BASE_COMPANY,
      liveData,
      new Date("2026-04-15T00:00:00.000Z"),
    );

    expect(reconciled.active.stock90DayChange).toBe(-22);
    expect(reconciled.active.revenueGrowthYoY).toBe(-6);
    expect(reconciled.summary.liveWonKeys).toContain("stock90DayChange");
    expect(reconciled.summary.liveWonKeys).toContain("revenueGrowthYoY");
    expect(reconciled.informativeLiveSignalCount).toBeGreaterThanOrEqual(2);
  });

  it("surfaces a conflict when live layoff evidence contradicts a clean DB history", () => {
    const liveData = createLiveData({
      derivedLayoffEvents: [
        {
          date: "2026-04-10T00:00:00.000Z",
          percentCut: 12,
          source: "SEC EDGAR 8-K",
        },
      ],
      liveSignalCount: 1,
      overallSource: "partial-live",
    });

    const reconciled = reconcileCompanySignals(
      BASE_COMPANY,
      liveData,
      new Date("2026-04-15T00:00:00.000Z"),
    );
    const payload = buildHybridScorePayload({
      reconciled,
      companyData: reconciled.active,
      industryData: INDUSTRY,
      roleTitle: "Software Engineer",
      department: "Engineering",
      userFactors: USER_FACTORS,
    });

    expect(reconciled.active.layoffRounds).toBeGreaterThan(0);
    expect(
      reconciled.conflicts.some((conflict) => conflict.signalType === "layoffsLast24Months"),
    ).toBe(true);
    expect(payload.reconciliationSummary.conflictedKeys).toContain("layoffsLast24Months");
    expect(payload.consensusData.recentLayoffRecency.primarySource).toBe("live");
  });

  it("caps confidence when critical live financial coverage is missing", () => {
    const companyWithoutFinancials: CompanyData = {
      ...BASE_COMPANY,
      revenueGrowthYoY: null,
      stock90DayChange: null,
      lastUpdated: "2025-12-01T00:00:00.000Z",
    };

    const liveData = createLiveData({
      apiErrors: [
        "Alpha Vantage: daily quota exhausted this session (25/day). Heuristic fallback active.",
        "NewsAPI: daily quota exhausted this session (100/day). Heuristic fallback active.",
      ],
      degradedSignalClasses: ["financial", "layoffs", "hiring"],
      hardFailures: ["Alpha Vantage quota exhausted"],
      overallSource: "heuristic",
    });

    const reconciled = reconcileCompanySignals(
      companyWithoutFinancials,
      liveData,
      new Date("2026-04-15T00:00:00.000Z"),
    );

    expect(reconciled.confidenceCap).toBe(0.35);
    expect(reconciled.confidenceCapsApplied[0]).toContain("35%");
    expect(reconciled.hardFailures.length).toBeGreaterThan(0);
  });
});
