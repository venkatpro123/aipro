// freshnessUnifier.ts — v39.0 D2
//
// PROBLEM THIS SOLVES:
// The audit pipeline writes four+ overlapping freshness signals onto the
// hybridResult / companyData mutable bag:
//   - companyData._dataFreshnessScore   (legacy aggregate)
//   - companyData._liveFreshnessScore   (live-only)
//   - companyData._dbFreshnessScore     (DB-only)
//   - companyData._liveQuorumStatus     (per-class quorum object)
//   - hybridResult.degradationReason    ('live_quorum_timeout' etc.)
//   - macroSignal.isHeuristic           (BLS/FRED baseline)
//   - industryRiskData freshness        (Q1 2026 staleness)
//
// Each tab reads from a different subset. The user can see "Live Intelligence
// Active" in one banner while another panel silently used a heuristic. v39.0
// D2 consolidates these into a single canonical verdict so every consumer
// asks the same question: "Should I trust this?"
//
// Output: { score: 0-100, tier: 'live'|'mixed'|'stale'|'heuristic', sources }
//   live      → ≥ 80% of signals are fresh live data; show "Live"
//   mixed     → 50-80% live; show "Partial live"
//   stale     → < 50% live but some live signals exist; show "Mostly cached"
//   heuristic → no live signals; everything fell back to seeded/heuristic
//
// The audit pipeline writes the result to hybridResult.unifiedFreshness.
// UI consumers (SummaryTab, CompanyPulseCard, IntelligenceTab, TransparencyTab)
// read it directly instead of recomputing.

export type FreshnessTier = 'live' | 'mixed' | 'stale' | 'heuristic';

export interface UnifiedFreshness {
  /** Canonical 0-100 trust score. Use this as the single source of truth. */
  score: number;
  /** UI-ready tier label. */
  tier: FreshnessTier;
  /** Whether the live-quorum 45s ceiling fired. */
  liveQuorumDegraded: boolean;
  /** Per-source breakdown for the TransparencyTab. */
  sources: {
    liveFreshnessScore: number;        // 0-100 from companyData._liveFreshnessScore
    dbFreshnessScore: number;          // 0-100 from companyData._dbFreshnessScore
    macroIsHeuristic: boolean;         // true when BLS/FRED used baselines
    industryRiskAgeDays: number;       // age of the static industryRiskData baseline
    liveQuorumReached: boolean;        // true when 45s ceiling did NOT fire
    genuineApiSignals: number;         // count of real API calls this session
  };
  /** Render-ready one-line summary for banners. */
  summary: string;
}

interface UnifiedFreshnessInputs {
  /** companyData — bag of underscore-prefixed fields written through the pipeline. */
  companyData?: Record<string, any> | null;
  /** macro signal result (blsMacroService output). */
  macroSignal?: { isHeuristic?: boolean } | null;
  /** industry risk age in days — from `getIndustryRiskAgeDays()`. */
  industryRiskAgeDays?: number;
  /** live data coverage object — from reconcileCompanySignals(). */
  liveDataCoverage?: { liveRatio?: number; genuineApiSignals?: number } | null;
}

/**
 * v39.0 D2 — Single canonical freshness verdict.
 *
 * Computed once at the end of the pipeline; written to hybridResult.unifiedFreshness.
 * All UI surfaces should read from this rather than recomputing from raw fields.
 */
export function computeUnifiedFreshness(inputs: UnifiedFreshnessInputs): UnifiedFreshness {
  const cd = inputs.companyData ?? {};
  const liveScore       = clampScore(cd._liveFreshnessScore);
  const dbScore         = clampScore(cd._dbFreshnessScore);
  const macroHeuristic  = !!inputs.macroSignal?.isHeuristic;
  const industryAge     = inputs.industryRiskAgeDays ?? 0;
  const quorumReached   = cd._liveQuorumReached === true || cd._liveQuorumReached == null;
  const liveQuorumDegraded = cd._liveUnavailable === true || cd._liveQuorumReached === false;
  const liveRatio       = inputs.liveDataCoverage?.liveRatio ?? 0;
  const genuineApiSignals = inputs.liveDataCoverage?.genuineApiSignals ?? 0;

  // Composite trust score: weighted average of:
  //   live freshness (0.40) — real-time scrape/API quality
  //   db freshness   (0.20) — cached intelligence age
  //   macro live     (0.15) — BLS/FRED live vs baseline
  //   industry age   (0.10) — staleness penalty on the static industry baseline
  //   quorum reached (0.10) — bonus for completing the 45s scrape ceiling
  //   genuine APIs   (0.05) — bonus for ≥1 real API call (vs all scraping)
  const macroComponent     = macroHeuristic ? 30 : 90;
  const industryComponent  = industryAge < 60   ? 90
                          :  industryAge < 120  ? 65
                          :                       40;
  const quorumComponent    = quorumReached ? 95 : 35;
  const apiComponent       = genuineApiSignals > 0 ? 90 : 50;

  const score = Math.round(
      liveScore         * 0.40 +
      dbScore           * 0.20 +
      macroComponent    * 0.15 +
      industryComponent * 0.10 +
      quorumComponent   * 0.10 +
      apiComponent      * 0.05
  );

  // Tier classification — anchored to liveRatio + genuineApiSignals so the
  // verdict tracks the user-visible LiveSignalStatusBanner classification.
  // (See LiveSignalStatusBanner.getTier for the matching definition.)
  const tier: FreshnessTier = (() => {
    if (genuineApiSignals === 0 && liveRatio === 0) return 'heuristic';
    if (liveQuorumDegraded || score < 50)            return 'stale';
    if (score < 75 || liveRatio < 0.70)              return 'mixed';
    return 'live';
  })();

  const summary = (() => {
    switch (tier) {
      case 'live':
        return `Live intelligence active · trust ${score}/100`;
      case 'mixed':
        return `Mixed signals (some live, some cached) · trust ${score}/100`;
      case 'stale':
        return liveQuorumDegraded
          ? `Live data ceiling hit · trust ${score}/100 (confidence capped)`
          : `Mostly cached · trust ${score}/100`;
      case 'heuristic':
        return `Heuristic only — no live signals available · trust ${score}/100`;
    }
  })();

  return {
    score,
    tier,
    liveQuorumDegraded,
    sources: {
      liveFreshnessScore: liveScore,
      dbFreshnessScore: dbScore,
      macroIsHeuristic: macroHeuristic,
      industryRiskAgeDays: industryAge,
      liveQuorumReached: quorumReached,
      genuineApiSignals,
    },
    summary,
  };
}

function clampScore(v: unknown): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v)));
}
