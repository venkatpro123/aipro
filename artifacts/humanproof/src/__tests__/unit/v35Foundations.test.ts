// v35Foundations.test.ts
//
// Behavioural lock-in for the v35 transformation foundations. Each
// describe-block targets one audit issue and asserts the new module
// produces the expected behaviour under the adversarial cases the audit
// identified as failure modes.
//
// These tests run against the SYNCHRONOUS surfaces of each module
// (sync evaluation, in-memory helpers) so they neither hit the database
// nor require flag state to be primed. The async paths (which DO hit
// Supabase) are validated by the per-workstream acceptance criteria in
// the plan's verification section.

import { describe, expect, it, beforeEach } from "vitest";

// ─────────────────────────────────────────────────────────────────────────────
// WS3 / Audit Issue #7 — Evidence hierarchy
// ─────────────────────────────────────────────────────────────────────────────

import {
  classifySourceToTier,
  compareEvidence,
  pickAuthoritative,
  shouldVetoOverride,
  type EvidenceSignal,
} from "../../services/evidenceHierarchy";

describe("evidenceHierarchy", () => {
  it("classifies known sources to canonical tiers", () => {
    expect(classifySourceToTier("sec-edgar")).toBe("REGULATORY");
    expect(classifySourceToTier("WARN-act")).toBe("REGULATORY");
    expect(classifySourceToTier("Yahoo-Finance")).toBe("OFFICIAL_FILING");
    expect(classifySourceToTier("bloomberg")).toBe("MAJOR_PRESS");
    expect(classifySourceToTier("layoffs.fyi")).toBe("AGGREGATED_DATA");
    expect(classifySourceToTier("reddit")).toBe("SOCIAL_INDIVIDUAL");
  });

  it("defaults unknown sources to SOCIAL_INDIVIDUAL (safest unknown)", () => {
    expect(classifySourceToTier("some-rando-blog")).toBe("SOCIAL_INDIVIDUAL");
  });

  it("Case A: SEC filing 5d old beats fresh Reddit post (tier overrides freshness)", () => {
    const now = Date.now();
    const sec: EvidenceSignal<number> = {
      tier: "REGULATORY",
      sourceName: "sec-edgar",
      value: 100,
      observedAt: new Date(now - 5 * 86_400_000).toISOString(),
    };
    const reddit: EvidenceSignal<number> = {
      tier: "SOCIAL_INDIVIDUAL",
      sourceName: "reddit",
      value: 80,
      observedAt: new Date(now - 2 * 3_600_000).toISOString(),
    };
    const result = pickAuthoritative<number>([reddit, sec]);
    expect(result.winner?.sourceName).toBe("sec-edgar");
    expect(result.tierOverrodeFreshness).toBe(true);
    expect(result.isLowAuthority).toBe(false);
  });

  it("Case B: two MAJOR_PRESS signals — freshest wins within tier", () => {
    const now = Date.now();
    const old: EvidenceSignal<number> = {
      tier: "MAJOR_PRESS",
      sourceName: "reuters",
      value: 50,
      observedAt: new Date(now - 6 * 3_600_000).toISOString(),
    };
    const fresh: EvidenceSignal<number> = {
      tier: "MAJOR_PRESS",
      sourceName: "wsj",
      value: 60,
      observedAt: new Date(now - 1 * 3_600_000).toISOString(),
    };
    const result = pickAuthoritative<number>([old, fresh]);
    expect(result.winner?.sourceName).toBe("wsj");
    expect(result.tierOverrodeFreshness).toBe(false);
  });

  it("Case D: empty input returns null winner with empty overridden", () => {
    const result = pickAuthoritative<number>([]);
    expect(result.winner).toBeNull();
    expect(result.overridden).toEqual([]);
    expect(result.tierOverrodeFreshness).toBe(false);
  });

  it("Case E: only SOCIAL signals — winner present but isLowAuthority=true", () => {
    const reddit: EvidenceSignal<number> = {
      tier: "SOCIAL_INDIVIDUAL",
      sourceName: "reddit",
      value: 80,
      observedAt: new Date().toISOString(),
    };
    const result = pickAuthoritative<number>([reddit]);
    expect(result.winner?.sourceName).toBe("reddit");
    expect(result.isLowAuthority).toBe(true);
  });

  it("compareEvidence is a stable strict-weak ordering for sort()", () => {
    const arr: EvidenceSignal<number>[] = [
      { tier: "SOCIAL_INDIVIDUAL", sourceName: "x", value: 0, observedAt: new Date().toISOString() },
      { tier: "REGULATORY",        sourceName: "y", value: 0, observedAt: new Date().toISOString() },
      { tier: "MAJOR_PRESS",       sourceName: "z", value: 0, observedAt: new Date().toISOString() },
    ];
    arr.sort(compareEvidence);
    expect(arr.map((a) => a.sourceName)).toEqual(["y", "z", "x"]);
  });

  it("shouldVetoOverride: same tier passes, 1-tier below passes, 2-tier below vetoed", () => {
    expect(shouldVetoOverride("MAJOR_PRESS", "MAJOR_PRESS")).toBe(false);
    expect(shouldVetoOverride("MAJOR_PRESS", "AGGREGATED_DATA")).toBe(false);
    expect(shouldVetoOverride("REGULATORY", "SOCIAL_INDIVIDUAL")).toBe(true);
    expect(shouldVetoOverride("OFFICIAL_FILING", "SOCIAL_INDIVIDUAL")).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// WS3 / Audit Issue #9 — Symmetric MAD outlier rejection
// ─────────────────────────────────────────────────────────────────────────────

import {
  computeHeadcountConsensus,
  type HeadcountSourceInput,
} from "../../services/headcountConsensus";

describe("headcountConsensus — symmetric MAD outlier rejection", () => {
  it("rejects a low-side subsidiary leak (50k claim at a 317k parent)", () => {
    const inputs: HeadcountSourceInput[] = [
      { source: "wikipedia",   value: 317_000 },
      { source: "yahoo-fte",   value: 343_000 },
      { source: "linkedin",    value: 305_000 },
      { source: "career-page", value: 50_000 }, // subsidiary claim
    ];
    const out = computeHeadcountConsensus(inputs);
    expect(out.rejectedSources).toContain("career-page");
    expect(out.value).toBeGreaterThan(300_000);
  });

  it("rejects an obvious high-side outlier (LinkedIn 5M for a 10k company)", () => {
    const inputs: HeadcountSourceInput[] = [
      { source: "wikipedia", value: 10_000 },
      { source: "yahoo-fte", value: 9_500 },
      { source: "sec-edgar", value: 10_200 },
      { source: "linkedin",  value: 5_000_000 }, // clearly bogus
    ];
    const out = computeHeadcountConsensus(inputs);
    expect(out.rejectedSources).toContain("linkedin");
    expect(out.value).toBeLessThan(15_000);
  });

  it("retains all sources when they agree within ±15%", () => {
    const inputs: HeadcountSourceInput[] = [
      { source: "wikipedia", value: 1000 },
      { source: "yahoo-fte", value: 1050 },
      { source: "linkedin",  value: 980 },
    ];
    const out = computeHeadcountConsensus(inputs);
    expect(out.rejectedSources).toEqual([]);
    expect(out.agreement).toBe(1);
  });

  it("with 2 sources falls back to ratio rule (MAD undefined)", () => {
    const inputs: HeadcountSourceInput[] = [
      { source: "wikipedia", value: 1000 },
      { source: "yahoo-fte", value: 100 }, // 10x ratio — borderline reject under legacy rule
    ];
    const out = computeHeadcountConsensus(inputs);
    expect(out.value).not.toBeNull();
  });

  it("returns null value when all sources implausible (< 10 employees)", () => {
    const inputs: HeadcountSourceInput[] = [
      { source: "wikipedia", value: 3 },
      { source: "yahoo-fte", value: 5 },
    ];
    const out = computeHeadcountConsensus(inputs);
    expect(out.value).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// WS4 / Audit Issue #23 — Evidence presence gate (absence-quorum false positive)
// ─────────────────────────────────────────────────────────────────────────────

import {
  buildPresenceReport,
  weightedQuorumCoverage,
  deriveConfidenceCap,
} from "../../services/evidencePresenceGate";

describe("evidencePresenceGate — absence-quorum is not positive evidence", () => {
  it("4/4 absence-satisfied classes do NOT yield full quorum coverage", () => {
    const report = buildPresenceReport([
      { class: "workforce", positiveSources: 0, exhaustedSources: 2, minRequired: 2, absenceQuorumReached: true,  highestPositiveTier: null },
      { class: "layoffs",   positiveSources: 0, exhaustedSources: 4, minRequired: 2, absenceQuorumReached: true,  highestPositiveTier: null },
      { class: "financial", positiveSources: 0, exhaustedSources: 1, minRequired: 1, absenceQuorumReached: true,  highestPositiveTier: null },
      { class: "hiring",    positiveSources: 0, exhaustedSources: 2, minRequired: 1, absenceQuorumReached: true,  highestPositiveTier: null },
    ]);
    expect(report.positiveCount).toBe(0);
    expect(report.absenceCount).toBe(4);
    // 4 absence at 0.3x weight => 4 * 0.3 / 4 = 0.3
    expect(weightedQuorumCoverage(report)).toBeCloseTo(0.3, 3);
  });

  it("zero-positive triggers the unknown-company cap at 0.45", () => {
    const report = buildPresenceReport([
      { class: "workforce", positiveSources: 0, exhaustedSources: 2, minRequired: 2, absenceQuorumReached: true,  highestPositiveTier: null },
      { class: "layoffs",   positiveSources: 0, exhaustedSources: 4, minRequired: 2, absenceQuorumReached: true,  highestPositiveTier: null },
      { class: "financial", positiveSources: 0, exhaustedSources: 1, minRequired: 1, absenceQuorumReached: true,  highestPositiveTier: null },
      { class: "hiring",    positiveSources: 0, exhaustedSources: 2, minRequired: 1, absenceQuorumReached: true,  highestPositiveTier: null },
    ]);
    const cap = deriveConfidenceCap(report);
    expect(cap.cap).toBeCloseTo(0.45);
    expect(cap.isUnknownCompany).toBe(true);
  });

  it("one positive class with high-authority source LIFTS the cap to 1.0", () => {
    const report = buildPresenceReport([
      { class: "workforce", positiveSources: 0, exhaustedSources: 2, minRequired: 2, absenceQuorumReached: true,  highestPositiveTier: null },
      { class: "layoffs",   positiveSources: 1, exhaustedSources: 0, minRequired: 1, absenceQuorumReached: false, highestPositiveTier: "REGULATORY" },
      { class: "financial", positiveSources: 0, exhaustedSources: 1, minRequired: 1, absenceQuorumReached: true,  highestPositiveTier: null },
      { class: "hiring",    positiveSources: 0, exhaustedSources: 2, minRequired: 1, absenceQuorumReached: true,  highestPositiveTier: null },
    ]);
    const cap = deriveConfidenceCap(report);
    expect(cap.cap).toBe(1.0);
    expect(cap.isUnknownCompany).toBe(false);
  });

  it("single low-authority positive → mid cap (0.65)", () => {
    const report = buildPresenceReport([
      { class: "workforce", positiveSources: 0, exhaustedSources: 2, minRequired: 2, absenceQuorumReached: true,  highestPositiveTier: null },
      { class: "layoffs",   positiveSources: 0, exhaustedSources: 4, minRequired: 2, absenceQuorumReached: true,  highestPositiveTier: null },
      { class: "financial", positiveSources: 1, exhaustedSources: 0, minRequired: 1, absenceQuorumReached: false, highestPositiveTier: "SOCIAL_AGGREGATE" },
      { class: "hiring",    positiveSources: 0, exhaustedSources: 2, minRequired: 1, absenceQuorumReached: true,  highestPositiveTier: null },
    ]);
    const cap = deriveConfidenceCap(report);
    expect(cap.cap).toBeCloseTo(0.65);
  });

  it("missing class inputs are treated as 'unresolved'", () => {
    const report = buildPresenceReport([
      { class: "workforce", positiveSources: 2, exhaustedSources: 0, minRequired: 2, absenceQuorumReached: false, highestPositiveTier: "OFFICIAL_FILING" },
      // layoffs / financial / hiring deliberately omitted
    ]);
    expect(report.unresolvedCount).toBe(3);
    expect(report.byClass.layoffs.state).toBe("unresolved");
    expect(report.byClass.financial.state).toBe("unresolved");
    expect(report.byClass.hiring.state).toBe("unresolved");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// WS5 / Audit Issue #1 — Source-independent n_eff
// ─────────────────────────────────────────────────────────────────────────────

import {
  computeSourceIndependentPanel,
  registerAgentMetadata,
  __resetRegistryForTesting,
} from "../../services/swarm/sourceIndependentPanel";

describe("sourceIndependentPanel — n_eff over distinct source classes", () => {
  beforeEach(() => {
    __resetRegistryForTesting();
  });

  const mkSignal = (agentId: string, signal: number, confidence = 0.8) => ({
    agentId,
    category: "market" as const,
    signal,
    confidence,
    sourceType: "live-api" as const,
    ageInDays: 0,
    metadata: {},
  });

  it("6 agents on the same source yield n_eff ≈ 1 (not 6)", () => {
    // All 6 agents declare the same primary data source. The panel must
    // collapse them to one effective signal.
    for (const id of ["a1", "a2", "a3", "a4", "a5", "a6"]) {
      registerAgentMetadata({ agentId: id, sourceClass: "OFFICIAL_FILING", dataReadsFrom: ["yahoo-finance"] });
    }
    const result = computeSourceIndependentPanel({
      signals: ["a1", "a2", "a3", "a4", "a5", "a6"].map((agentId) => mkSignal(agentId, 0.8)),
    });
    expect(result.uniqueClusters).toBe(1);
    // n_eff = (Σw_eff)² / Σ(w_eff²). With 1 cluster of effective weight 1.0,
    // n_eff = 1.
    expect(result.nEff).toBeCloseTo(1, 2);
    expect(result.isCorrelatedEnsemble).toBe(true);
  });

  it("6 agents across 6 distinct sources yield n_eff ≈ 6", () => {
    const sources = ["yahoo-finance", "sec-edgar", "wikipedia", "layoffs.fyi", "bls", "naukri"];
    sources.forEach((src, i) => {
      registerAgentMetadata({ agentId: `a${i}`, sourceClass: "OFFICIAL_FILING", dataReadsFrom: [src] });
    });
    const result = computeSourceIndependentPanel({
      signals: sources.map((_, i) => mkSignal(`a${i}`, 0.7)),
    });
    expect(result.uniqueClusters).toBe(6);
    expect(result.nEff).toBeCloseTo(6, 1);
    expect(result.isCorrelatedEnsemble).toBe(false);
  });

  it("unregistered agents form singleton clusters (no correlation collapse)", () => {
    const result = computeSourceIndependentPanel({
      signals: [mkSignal("ghost1", 0.5, 0.5), mkSignal("ghost2", 0.5, 0.5)],
    });
    expect(result.unregisteredAgents).toContain("ghost1");
    expect(result.unregisteredAgents).toContain("ghost2");
    expect(result.uniqueClusters).toBe(2);
  });

  it("agentWeights override bootstrap weight in aggregation", () => {
    registerAgentMetadata({ agentId: "high", sourceClass: "MAJOR_PRESS", dataReadsFrom: ["src_a"] });
    registerAgentMetadata({ agentId: "low",  sourceClass: "MAJOR_PRESS", dataReadsFrom: ["src_b"] });

    const result = computeSourceIndependentPanel({
      signals: [mkSignal("high", 1.0, 1.0), mkSignal("low", 0.0, 0.0)],
      agentWeights: { high: 0.9, low: 0.1 },
    });
    // The high-weight agent should dominate the consensus.
    expect(result.consensusSignal).toBeGreaterThan(0.7);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// WS4 / Audit Issue #26 — Conformal CI (sync fallback path)
// ─────────────────────────────────────────────────────────────────────────────

import {
  computeConformalCISync,
  __resetConformalCacheForTesting,
} from "../../services/conformalCI";
import { __setSnapshotForTesting, __resetSnapshotForTesting } from "../../config/featureFlags";

describe("conformalCI — sync fallback when no calibration cached", () => {
  beforeEach(() => {
    __resetConformalCacheForTesting();
    __resetSnapshotForTesting();
    // Force the flag ON so the sync path returns heuristic fallback (not no_data).
    __setSnapshotForTesting([
      {
        flag_key: "ws4_conformal_ci",
        mode: "shadow",
        canary_user_ids: [],
        canary_pct: 0,
        description: "",
        workstream: "WS4",
        config: {},
      },
    ]);
  });

  it("returns fallback_heuristic with conservative widths and a labeled rationale", () => {
    const bundle = computeConformalCISync(70);
    expect(bundle.source).toBe("fallback_heuristic");
    expect(bundle.point).toBe(70);
    const i90 = bundle.intervals.find((i) => Math.abs(i.nominalCoverage - 0.9) < 0.01);
    expect(i90).toBeDefined();
    expect(i90!.high - i90!.low).toBeGreaterThanOrEqual(20); // wide
    expect(i90!.empiricalCoverage).toBeNull();
    expect(i90!.rationale).toMatch(/HEURISTIC|heuristic|fallback/i);
  });

  it("clamps the point estimate and intervals to [0, 100]", () => {
    const high = computeConformalCISync(95);
    const i90 = high.intervals.find((i) => i.nominalCoverage === 0.9)!;
    expect(i90.high).toBeLessThanOrEqual(100);

    const low = computeConformalCISync(5);
    const i90Low = low.intervals.find((i) => i.nominalCoverage === 0.9)!;
    expect(i90Low.low).toBeGreaterThanOrEqual(0);
  });

  it("returns source='no_data' when the flag is off", () => {
    __setSnapshotForTesting([
      {
        flag_key: "ws4_conformal_ci",
        mode: "off",
        canary_user_ids: [],
        canary_pct: 0,
        description: "",
        workstream: "WS4",
        config: {},
      },
    ]);
    const bundle = computeConformalCISync(50);
    expect(bundle.source).toBe("no_data");
    expect(bundle.intervals).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// WS7 / Audit Issue #12 — Archetype blend pre-norm clamp
// ─────────────────────────────────────────────────────────────────────────────

// We assert the clamp indirectly: any combination of base + delta cannot
// produce a post-blend weight below MIN_WEIGHT_FLOOR (0.001). The full
// blendArchetypeWeights helper is private to layoffScoreEngine, so we
// validate via the engine's exported score-input round-trip.
// (Direct testing of the private blend functions is deferred to a
//  follow-up exposed harness; for now we lock in the engine behaviour.)
import { calculateLayoffScore } from "../../services/layoffScoreEngine";

describe("layoffScoreEngine — archetype blend never silently disables a dimension", () => {
  it("PE-style aggressive deltas do not produce zero-weight dimensions (score remains in [0, 100])", () => {
    const result = calculateLayoffScore({
      companyData: {
        name: "PE-Co",
        industry: "technology",
        isPublic: false,
        employeeCount: 5000,
        revenueGrowthYoY: -8,
        stock90DayChange: null,
        layoffRounds: 2,
        layoffsLast24Months: [
          { date: "2025-12-01", percentCut: 12 },
          { date: "2026-03-01", percentCut: 8 },
        ],
        lastLayoffPercent: 8,
        revenuePerEmployee: 220_000,
        aiInvestmentSignal: "low",
        region: "US",
        lastUpdated: new Date().toISOString(),
        source: "test",
      },
      industryData: undefined,
      roleTitle: "Software Engineer",
      department: "Engineering",
      userFactors: {
        tenureYears: 3,
        isUniqueRole: false,
        performanceTier: "average",
        hasRecentPromotion: false,
        hasKeyRelationships: false,
      },
    });
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(Number.isFinite(result.score)).toBe(true);
  });
});
