// v35Foundations2.test.ts
//
// Second-tier behavioural lock-in for v35 modules whose primary inputs
// are pure (no DB calls). Each describe block targets a specific audit
// issue and asserts the public surface produces the expected output
// under representative cases.

import { describe, expect, it, beforeEach } from "vitest";

// ─────────────────────────────────────────────────────────────────────────────
// WS3 / Audit Issue #24 — Stealth layoff score floor application
// ─────────────────────────────────────────────────────────────────────────────

import { applyStealthFloor, type StealthSignal } from "../../services/stealthLayoffDetector";

describe("stealthLayoffDetector — score floor application", () => {
  const baseSignal = (overrides: Partial<StealthSignal> = {}): StealthSignal => ({
    severity: "SILENT_TRIM",
    flagged: true,
    pctChange6mo: -7,
    recentEmployeeCount: 9300,
    priorEmployeeCount: 10000,
    scoreFloorBoost: 8,
    confidence: 0.7,
    rationale: "test signal",
    hasAnnouncedRound: false,
    ...overrides,
  });

  it("raises a sub-threshold score to the floor when flagged", () => {
    const signal = baseSignal({ scoreFloorBoost: 8 });
    expect(applyStealthFloor(40, signal)).toBe(48);
  });

  it("never lowers a score (additive floor only)", () => {
    const signal = baseSignal({ scoreFloorBoost: 8 });
    expect(applyStealthFloor(72, signal)).toBe(80);
  });

  it("does NOT modify the score when signal is not flagged", () => {
    const signal = baseSignal({ flagged: false, scoreFloorBoost: 0 });
    expect(applyStealthFloor(40, signal)).toBe(40);
  });

  it("clamps the result to [0, 100]", () => {
    const signal = baseSignal({ severity: "SILENT_PURGE", scoreFloorBoost: 25 });
    expect(applyStealthFloor(85, signal)).toBe(100);
    expect(applyStealthFloor(0, signal)).toBe(25);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// WS3 / Audit Issue #22 — Acquisition premium detection
// ─────────────────────────────────────────────────────────────────────────────

import { detectAcquisitionPremium } from "../../services/mergerAcquisitionRiskEngine";

describe("detectAcquisitionPremium — neutralize deal-premium L1 health benefit", () => {
  it("fires when target side + announced acquisition + stock surge", () => {
    const result = detectAcquisitionPremium({
      maEventType: "STRATEGIC_ACQUISITION",
      monthsPostClose: 1,
      isAcquiredEmployee: true,
      stock90DayChange: 28,
    });
    expect(result.detected).toBe(true);
    expect(result.correctedStock90DayChange).toBe(0);
    expect(result.rationale).toMatch(/M&A deal premium|neutralized/i);
  });

  it("does NOT fire for the acquirer side (only acquired employees)", () => {
    const result = detectAcquisitionPremium({
      maEventType: "STRATEGIC_ACQUISITION",
      monthsPostClose: 1,
      isAcquiredEmployee: false,
      stock90DayChange: 28,
    });
    expect(result.detected).toBe(false);
    // Preserves original value when not detected.
    expect(result.correctedStock90DayChange).toBe(28);
  });

  it("does NOT fire when stock change is below the 15% threshold", () => {
    const result = detectAcquisitionPremium({
      maEventType: "PE_ACQUISITION",
      monthsPostClose: 0,
      isAcquiredEmployee: true,
      stock90DayChange: 10,
    });
    expect(result.detected).toBe(false);
  });

  it("does NOT fire 6+ months post-close (premium window has closed)", () => {
    const result = detectAcquisitionPremium({
      maEventType: "MERGER_EQUALS",
      monthsPostClose: 6,
      isAcquiredEmployee: true,
      stock90DayChange: 22,
    });
    expect(result.detected).toBe(false);
  });

  it("does NOT fire when there is no M&A event", () => {
    const result = detectAcquisitionPremium({
      maEventType: "NONE",
      monthsPostClose: undefined,
      isAcquiredEmployee: true,
      stock90DayChange: 30,
    });
    expect(result.detected).toBe(false);
  });

  it("handles null stock data gracefully", () => {
    const result = detectAcquisitionPremium({
      maEventType: "PE_ACQUISITION",
      monthsPostClose: 0,
      isAcquiredEmployee: true,
      stock90DayChange: null,
    });
    expect(result.detected).toBe(false);
    expect(result.correctedStock90DayChange).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// WS7 — Unified workforce velocity passthrough vs consolidated
// ─────────────────────────────────────────────────────────────────────────────

import {
  computeWorkforceVelocity,
  type WorkforceVelocityInputs,
} from "../../services/workforceVelocityEngine";
import { __setSnapshotForTesting, __resetSnapshotForTesting } from "../../config/featureFlags";

describe("workforceVelocityEngine — flag-gated consolidation", () => {
  const mkInputs = (): WorkforceVelocityInputs => ({
    headcount: {
      headcountChange6MonthPct: -8,
      contractorRatioPct: 35,
      contractorTrend: "INCREASING",
      jobPostingCurrentMonth: 12,
      jobPostingLastMonth: 30,
      hiringRateAnnualized: 6,
      voluntaryAttritionPct: 18,
    },
    sentimentHistory: [
      { date: "2025-12-01", ceoApprovalPct: 65, overallRatingX10: 38, reviewCount: 200, newReviewCount: 40, recommendPct: 70 },
      { date: "2026-01-01", ceoApprovalPct: 58, overallRatingX10: 36, reviewCount: 255, newReviewCount: 55, recommendPct: 60 },
      { date: "2026-02-01", ceoApprovalPct: 50, overallRatingX10: 34, reviewCount: 325, newReviewCount: 70, recommendPct: 55 },
      { date: "2026-03-01", ceoApprovalPct: 42, overallRatingX10: 32, reviewCount: 405, newReviewCount: 80, recommendPct: 48 },
    ],
  });

  it("returns passthrough (direction=UNKNOWN) when flag is off", () => {
    __resetSnapshotForTesting();
    __setSnapshotForTesting([
      {
        flag_key: "ws7_layer_consolidation",
        mode: "off",
        canary_user_ids: [],
        canary_pct: 0,
        description: "",
        workstream: "WS7",
        config: {},
      },
    ]);
    const out = computeWorkforceVelocity(mkInputs());
    expect(out.isPassthrough).toBe(true);
    expect(out.direction).toBe("UNKNOWN");
    expect(out.contributingEngines).toEqual(["headcountVelocity", "glassdoorVelocity"]);
  });

  it("returns consolidated verdict when flag is on", () => {
    __resetSnapshotForTesting();
    __setSnapshotForTesting([
      {
        flag_key: "ws7_layer_consolidation",
        mode: "shadow",
        canary_user_ids: [],
        canary_pct: 0,
        description: "",
        workstream: "WS7",
        config: {},
      },
    ]);
    const out = computeWorkforceVelocity(mkInputs());
    expect(out.isPassthrough).toBe(false);
    expect(out.direction).not.toBe("UNKNOWN");
    expect(out.workforceRiskScore).toBeGreaterThanOrEqual(0);
    expect(out.workforceRiskScore).toBeLessThanOrEqual(100);
    expect(out.headline).toBeTruthy();
  });

  it("always provides both legacy sub-results for backward compatibility", () => {
    __resetSnapshotForTesting();
    __setSnapshotForTesting([
      {
        flag_key: "ws7_layer_consolidation",
        mode: "off",
        canary_user_ids: [],
        canary_pct: 0,
        description: "",
        workstream: "WS7",
        config: {},
      },
    ]);
    const out = computeWorkforceVelocity(mkInputs());
    expect(out.headcount).toBeDefined();
    expect(out.sentiment).toBeDefined();
    expect(typeof out.headcount.headcountRiskScore).toBe("number");
    expect(typeof out.sentiment.sentimentRiskScore).toBe("number");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// WS6 / Audit Issue #18 — breakingNewsBroker subscription multiplexing
// ─────────────────────────────────────────────────────────────────────────────
//
// We test the subscribe/unsubscribe contract — the broker must collapse
// multiple subscribers for the same company into a single underlying
// transport, and tear down cleanly when the last subscriber leaves.
// We can't easily test the realtime channel directly without a live
// Supabase connection, so these tests focus on the in-memory broker
// behavior that does NOT depend on the network.

import {
  subscribeBreakingNews,
  listActiveSubscriptions,
  __resetBrokerForTesting,
} from "../../services/breakingNewsBroker";

describe("breakingNewsBroker — multiplexed subscription contract", () => {
  beforeEach(() => {
    __resetBrokerForTesting();
  });

  it("does not register a subscription for empty company names", () => {
    const unsub = subscribeBreakingNews("", () => {});
    expect(listActiveSubscriptions()).toHaveLength(0);
    unsub();
  });

  it("multiple subscribers for the same company share one entry", () => {
    const unsub1 = subscribeBreakingNews("Meta", () => {});
    const unsub2 = subscribeBreakingNews("Meta", () => {});
    const unsub3 = subscribeBreakingNews("Meta", () => {});
    const subs = listActiveSubscriptions();
    expect(subs).toHaveLength(1);
    expect(subs[0].subscriberCount).toBe(3);
    unsub1();
    unsub2();
    unsub3();
  });

  it("different companies get separate entries", () => {
    const u1 = subscribeBreakingNews("Meta", () => {});
    const u2 = subscribeBreakingNews("Google", () => {});
    expect(listActiveSubscriptions()).toHaveLength(2);
    u1();
    u2();
  });

  it("tears down the entry when the last subscriber unsubscribes", () => {
    const unsub1 = subscribeBreakingNews("Apple", () => {});
    const unsub2 = subscribeBreakingNews("Apple", () => {});
    expect(listActiveSubscriptions()).toHaveLength(1);
    unsub1();
    expect(listActiveSubscriptions()).toHaveLength(1); // one subscriber still there
    expect(listActiveSubscriptions()[0].subscriberCount).toBe(1);
    unsub2();
    expect(listActiveSubscriptions()).toHaveLength(0);
  });

  it("normalises company name to lowercase for grouping", () => {
    const u1 = subscribeBreakingNews("Meta Platforms", () => {});
    const u2 = subscribeBreakingNews("meta platforms", () => {});
    const subs = listActiveSubscriptions();
    expect(subs).toHaveLength(1);
    expect(subs[0].subscriberCount).toBe(2);
    u1();
    u2();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// WS6 / Audit Issue #15 — serverAuthoritativeScrapeDedup dedupe-key
// ─────────────────────────────────────────────────────────────────────────────

import { computeDedupeKey } from "../../services/serverAuthoritativeScrapeDedup";

describe("serverAuthoritativeScrapeDedup — deterministic key", () => {
  it("produces the same key for the same inputs and window", async () => {
    const a = await computeDedupeKey({ companyCanonical: "TCS", jobType: "newsExtract" });
    const b = await computeDedupeKey({ companyCanonical: "TCS", jobType: "newsExtract" });
    expect(a).toBe(b);
  });

  it("produces different keys for different companies", async () => {
    const a = await computeDedupeKey({ companyCanonical: "TCS", jobType: "newsExtract" });
    const b = await computeDedupeKey({ companyCanonical: "Infosys", jobType: "newsExtract" });
    expect(a).not.toBe(b);
  });

  it("produces different keys for different job types", async () => {
    const a = await computeDedupeKey({ companyCanonical: "TCS", jobType: "newsExtract" });
    const b = await computeDedupeKey({ companyCanonical: "TCS", jobType: "glassdoorScrape" });
    expect(a).not.toBe(b);
  });

  it("normalises whitespace / case", async () => {
    const a = await computeDedupeKey({ companyCanonical: "  TCS  ", jobType: "newsExtract" });
    const b = await computeDedupeKey({ companyCanonical: "tcs", jobType: "newsExtract" });
    expect(a).toBe(b);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// WS5 — macroSnapshot cycle-breaker (sync read returns a value)
// ─────────────────────────────────────────────────────────────────────────────

import {
  readMacroSnapshot,
  getMacroRecessionSignalForCohortClassifier,
  __resetMacroSnapshotForTesting,
} from "../../services/macroSnapshot";

describe("macroSnapshot — cycle-breaker for cohort classifier", () => {
  beforeEach(() => {
    __resetMacroSnapshotForTesting();
    __resetSnapshotForTesting();
  });

  it("returns a bootstrap snapshot when the macro feed has never refreshed", () => {
    const snap = readMacroSnapshot();
    expect(snap.source).toBe("bootstrap");
    expect(snap.recessionSignal).toBeGreaterThanOrEqual(0);
    expect(snap.recessionSignal).toBeLessThanOrEqual(1);
  });

  it("returns 0 from the classifier helper when WS5 flag is off (legacy stub)", () => {
    __setSnapshotForTesting([
      {
        flag_key: "ws5_source_independent_swarm",
        mode: "off",
        canary_user_ids: [],
        canary_pct: 0,
        description: "",
        workstream: "WS5",
        config: {},
      },
    ]);
    expect(getMacroRecessionSignalForCohortClassifier()).toBe(0);
  });

  it("returns the real snapshot value when WS5 flag is on", () => {
    __setSnapshotForTesting([
      {
        flag_key: "ws5_source_independent_swarm",
        mode: "shadow",
        canary_user_ids: [],
        canary_pct: 0,
        description: "",
        workstream: "WS5",
        config: {},
      },
    ]);
    const signal = getMacroRecessionSignalForCohortClassifier();
    expect(signal).toBeGreaterThan(0);
    expect(signal).toBeLessThanOrEqual(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// WS4 — empiricalConfidenceModel returns legacy-shape result when flag off
// ─────────────────────────────────────────────────────────────────────────────

import { computeEmpiricalConfidence } from "../../services/empiricalConfidenceModel";

describe("empiricalConfidenceModel — backward-compat passthrough", () => {
  beforeEach(() => {
    __resetSnapshotForTesting();
  });

  it("produces a value in [0, 1] with rationale strings", () => {
    __setSnapshotForTesting([
      { flag_key: "ws4_conformal_ci", mode: "off", canary_user_ids: [], canary_pct: 0, description: "", workstream: "WS4", config: {} },
    ]);
    const result = computeEmpiricalConfidence({
      quorumStatus: {
        reached: true,
        perClass: {
          workforce: { signalClass: "workforce", sourcesReached: ["wikipedia", "yahoo-fte"], sourcesPending: [], satisfied: true, satisfiedByAbsence: false },
          layoffs:   { signalClass: "layoffs",   sourcesReached: ["rss-news"], sourcesPending: [], satisfied: true, satisfiedByAbsence: false },
          financial: { signalClass: "financial", sourcesReached: ["yahoo"], sourcesPending: [], satisfied: true, satisfiedByAbsence: false },
          hiring:    { signalClass: "hiring",    sourcesReached: ["naukri"], sourcesPending: [], satisfied: true, satisfiedByAbsence: false },
        },
        elapsedMs: 6000,
      },
      crossSourceAgreements: 3,
      totalAgreementOpportunities: 4,
      freshSignalCount: 5,
      degradedSignalCount: 1,
      invalidSignalCount: 0,
      avgSourceReliability: 0.85,
      liveUnavailable: false,
      conflictCount: 0,
    });
    expect(result.value).toBeGreaterThanOrEqual(0);
    expect(result.value).toBeLessThanOrEqual(1);
    expect(result.rationale.length).toBeGreaterThan(0);
    expect(result.presenceReport.positiveCount).toBe(4);
  });

  it("caps confidence at 0.45 when liveUnavailable is true", () => {
    __setSnapshotForTesting([
      { flag_key: "ws4_conformal_ci", mode: "shadow", canary_user_ids: [], canary_pct: 0, description: "", workstream: "WS4", config: {} },
    ]);
    const result = computeEmpiricalConfidence({
      quorumStatus: {
        reached: false,
        perClass: {
          workforce: { signalClass: "workforce", sourcesReached: [], sourcesPending: ["wikipedia"], satisfied: false, satisfiedByAbsence: false },
          layoffs:   { signalClass: "layoffs",   sourcesReached: [], sourcesPending: ["rss-news"], satisfied: false, satisfiedByAbsence: false },
          financial: { signalClass: "financial", sourcesReached: [], sourcesPending: ["yahoo"], satisfied: false, satisfiedByAbsence: false },
          hiring:    { signalClass: "hiring",    sourcesReached: [], sourcesPending: ["naukri"], satisfied: false, satisfiedByAbsence: false },
        },
        elapsedMs: 45000,
      },
      crossSourceAgreements: 0,
      totalAgreementOpportunities: 0,
      freshSignalCount: 0,
      degradedSignalCount: 0,
      invalidSignalCount: 0,
      avgSourceReliability: 0,
      liveUnavailable: true,
      conflictCount: 0,
    });
    expect(result.value).toBeLessThanOrEqual(0.45);
    expect(result.appliedCap).toBeLessThanOrEqual(0.45);
  });
});

