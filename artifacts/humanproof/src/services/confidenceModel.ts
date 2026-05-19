// confidenceModel.ts
// Evidence-based confidence model — replaces v31's time-based Tier 0/1/2/3 caps.
//
// The previous model capped confidence based on what fraction of the pipeline
// budget produced "fresh live" signals. That model produces low confidence
// just because a worker took 9s instead of 7s — confidence collapses for timing
// reasons unrelated to the actual evidence quality. The v32 redesign asks:
//
//   "Confidence should reflect evidence — source agreement, freshness,
//    source reliability, cross-source validation, live reconciliation quality."
//
// This module computes confidence as a weighted blend of FOUR signals:
//   * quorumCoverage    — fraction of quorum classes that reached `min` sources
//   * sourceAgreement   — fraction of quorum sources whose values agree
//   * freshnessQuality  — avg per-signal freshness state (fresh/degraded/invalid)
//   * sourceReliability — average reliability of the live sources that won

import type { QuorumStatus } from './liveQuorumSpec';

export interface ConfidenceInputs {
  /** Quorum status from awaitLiveQuorum / evaluateQuorum. */
  quorumStatus: QuorumStatus;
  /** Number of cross-source agreements (e.g. wiki+yahoo agree on headcount → 1). */
  crossSourceAgreements: number;
  /** Total number of opportunities for cross-source agreement (= signal classes with ≥2 sources). */
  totalAgreementOpportunities: number;
  /** Number of fresh signals (per liveDataService.classifyFreshness). */
  freshSignalCount: number;
  /** Number of degraded signals. */
  degradedSignalCount: number;
  /** Number of invalid/expired signals. */
  invalidSignalCount: number;
  /** Average reliability score (0-1) of live-won sources. */
  avgSourceReliability: number;
  /** True when live intelligence was genuinely unavailable (Stage C ran to ceiling
   *  and quorum never reached). Sets a hard floor cap. */
  liveUnavailable: boolean;
  /** Number of conflicts surfaced by reconcileCompanySignals. */
  conflictCount: number;
  /**
   * Database reliability tier for this company from DataQualityReport.
   * When live intelligence is unavailable, used to set a quality-appropriate
   * confidence floor instead of a single hard 0.45 for all companies.
   *   A — full record, high completeness (floor 0.62)
   *   B — partial record (floor 0.52)
   *   C — sparse record (floor 0.45 — legacy default)
   *   D — minimal data (floor 0.35)
   */
  dbReliabilityTier?: 'A' | 'B' | 'C' | 'D';
}

export interface ConfidenceResult {
  /** Final confidence value, 0–1. */
  value: number;
  /** Per-input contributions for UI transparency. */
  breakdown: {
    quorumCoverage:    { score: number; weight: number };
    sourceAgreement:   { score: number; weight: number };
    freshnessQuality:  { score: number; weight: number };
    sourceReliability: { score: number; weight: number };
    conflictPenalty:   number;
    liveUnavailableFloor: number | null;
  };
  /** Human-readable diagnostic strings — used by the confidence tooltip. */
  rationale: string[];
}

const clamp = (x: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));

/**
 * Compute evidence-based confidence. Returns 0–1.
 *
 * Weights:
 *   * quorumCoverage    35%   — most important: did we even acquire enough live data?
 *   * sourceAgreement   25%   — do multiple live sources agree?
 *   * freshnessQuality  20%   — how recent is the data?
 *   * sourceReliability 20%   — were the contributing sources high-authority?
 *
 * Then apply:
 *   * conflictPenalty   — 5% per surfaced reconciliation conflict, max 20%
 *   * liveUnavailable cap @ 0.45 — when Stage C truly fell through. Forces an
 *     explicit "Live intelligence unavailable" UI state.
 */
export function computeConfidence(inputs: ConfidenceInputs): ConfidenceResult {
  // ── 1. Quorum coverage ────────────────────────────────────────────────────
  const classCount = 4;  // workforce, layoffs, financial, hiring
  const satisfiedClasses = Object.values(inputs.quorumStatus.perClass)
    .filter(c => c.satisfied).length;
  const quorumCoverage = satisfiedClasses / classCount;

  // ── 2. Source agreement ───────────────────────────────────────────────────
  const sourceAgreement = inputs.totalAgreementOpportunities > 0
    ? clamp(inputs.crossSourceAgreements / inputs.totalAgreementOpportunities)
    : 0.5;  // neutral when no agreement opportunities exist

  // ── 3. Freshness quality ──────────────────────────────────────────────────
  const totalSignals = inputs.freshSignalCount + inputs.degradedSignalCount + inputs.invalidSignalCount;
  const freshnessQuality = totalSignals > 0
    ? (inputs.freshSignalCount * 1.0 + inputs.degradedSignalCount * 0.5 + inputs.invalidSignalCount * 0.0)
      / totalSignals
    : 0.4;  // no signals at all is a problem; neutral-low

  // ── 4. Source reliability ────────────────────────────────────────────────
  const sourceReliability = clamp(inputs.avgSourceReliability);

  // ── Weighted blend ───────────────────────────────────────────────────────
  const W_QUORUM      = 0.35;
  const W_AGREEMENT   = 0.25;
  const W_FRESHNESS   = 0.20;
  const W_RELIABILITY = 0.20;

  let value =
      quorumCoverage    * W_QUORUM
    + sourceAgreement   * W_AGREEMENT
    + freshnessQuality  * W_FRESHNESS
    + sourceReliability * W_RELIABILITY;

  // ── Conflict penalty ─────────────────────────────────────────────────────
  const conflictPenalty = clamp(inputs.conflictCount * 0.05, 0, 0.20);
  value -= conflictPenalty;
  value = clamp(value, 0.10, 0.95);

  // ── Live-unavailable floor (DB-quality-adjusted) ─────────────────────────
  // v40.0 audit fix: the floor now reflects DB record quality instead of using
  // a single hard 0.45 for all companies. A company with a comprehensive
  // Supabase intelligence record gets a higher floor than a completely unknown
  // company — because the DB data IS real evidence, even when live scraping
  // falls through.
  //
  // v35 rationale preserved: the floor must ALWAYS fire when liveUnavailable=
  // true, anchoring the value regardless of what the weighted blend computes.
  // When ALL quorum classes fail and all signals are stale/heuristic, the
  // blend falls to ~0.30 — but surfacing 30% implies evidence was collected
  // at some level; anchoring to the DB floor is more honest.
  const DB_TIER_FLOORS: Record<string, number> = {
    A: 0.62,  // full record, high completeness — DB is near-live quality
    B: 0.52,  // partial record
    C: 0.45,  // sparse record (legacy default preserved)
    D: 0.35,  // minimal data
  };
  let liveUnavailableFloor: number | null = null;
  if (inputs.liveUnavailable) {
    const floor = DB_TIER_FLOORS[inputs.dbReliabilityTier ?? 'C'] ?? 0.45;
    // Apply as a minimum floor, not an exact override. In practice when
    // liveUnavailable=true the weighted blend falls below the floor anyway
    // (quorumCoverage=0, freshnessQuality=0 → blend ≈ 0.10–0.20), but using
    // Math.max is semantically correct: "confidence can't drop below this
    // floor given the DB quality available" rather than "confidence is exactly
    // this value." This prevents the edge case where a very high sourceReliability
    // from strong DB records would be incorrectly overridden downward.
    value = Math.max(value, floor);
    liveUnavailableFloor = floor;
  }

  // ── Rationale ────────────────────────────────────────────────────────────
  const rationale: string[] = [];
  rationale.push(
    `Quorum: ${satisfiedClasses}/${classCount} signal classes satisfied`
    + ` (${Math.round(quorumCoverage * 100)}%).`,
  );
  if (inputs.totalAgreementOpportunities > 0) {
    rationale.push(
      `Cross-source agreement: ${inputs.crossSourceAgreements}/${inputs.totalAgreementOpportunities}`
      + ` (${Math.round(sourceAgreement * 100)}%).`,
    );
  }
  if (totalSignals > 0) {
    rationale.push(
      `Freshness: ${inputs.freshSignalCount} fresh, ${inputs.degradedSignalCount} degraded,`
      + ` ${inputs.invalidSignalCount} invalid.`,
    );
  }
  rationale.push(`Avg source reliability: ${Math.round(sourceReliability * 100)}%.`);
  if (inputs.conflictCount > 0) {
    rationale.push(`-${Math.round(conflictPenalty * 100)}% conflict penalty (${inputs.conflictCount} conflicts).`);
  }
  if (liveUnavailableFloor != null) {
    const tier = inputs.dbReliabilityTier ?? 'C';
    rationale.push(
      `Live intelligence unavailable — confidence anchored to DB quality tier ${tier}`
      + ` (${Math.round(liveUnavailableFloor * 100)}%).`,
    );
  }

  return {
    value: Math.round(value * 100) / 100,
    breakdown: {
      quorumCoverage:    { score: quorumCoverage,    weight: W_QUORUM },
      sourceAgreement:   { score: sourceAgreement,   weight: W_AGREEMENT },
      freshnessQuality:  { score: freshnessQuality,  weight: W_FRESHNESS },
      sourceReliability: { score: sourceReliability, weight: W_RELIABILITY },
      conflictPenalty,
      liveUnavailableFloor,
    },
    rationale,
  };
}
