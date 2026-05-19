// empiricalConfidenceModel.ts — WS4
//
// New confidence model that REPLACES the legacy `confidenceModel.ts`
// heuristic when `ws4_conformal_ci` is on. Addresses Audit Issue #4:
// the legacy model measured input data quality and labeled it
// "confidence" — but never measured whether stated CIs actually
// contained the outcome.
//
// The new model wires together the three primitives already shipped in
// this session:
//
//   1. evidencePresenceGate.deriveConfidenceCap()
//      Hard cap based on whether evidence is present at all. Unknown
//      companies are pinned ≤0.45 regardless of conformal quality.
//
//   2. conformalCI.computeConformalCI() (already invoked upstream)
//      Per-cohort CI from real outcomes. Width is empirically calibrated.
//
//   3. sourceIndependentPanel.computeSourceIndependentPanel() (upstream)
//      n_eff over distinct source classes. Below 3.5 the ensemble is
//      flagged as correlated; we down-weight confidence accordingly.
//
// Compatibility:
//   The new model returns the same `ConfidenceResult` shape as the legacy
//   model so downstream UI components don't break. Three new optional
//   fields are added to `ConfidenceResult.breakdown` describing the new
//   evidence-presence and conformal-coverage components.
//
//   The legacy `_inputDataQuality` (data-quality tier) survives as a
//   FRESHNESS indicator on the UI freshness panel — but is no longer
//   the source of truth for confidence.

import type { QuorumStatus } from './liveQuorumSpec';
import { evaluateFlagSync } from '../config/featureFlags';
import {
  buildPresenceReport,
  weightedQuorumCoverage,
  deriveConfidenceCap,
  type ClassEvidenceInput,
  type EvidencePresenceReport,
} from './evidencePresenceGate';
import type { ConfidenceInputs as LegacyConfidenceInputs, ConfidenceResult as LegacyConfidenceResult } from './confidenceModel';
import type { ConformalBundle } from './conformalCI';
import type { SourceIndependentPanelResult } from './swarm/sourceIndependentPanel';

// ── Extended inputs ─────────────────────────────────────────────────────────

export interface EmpiricalConfidenceInputs extends LegacyConfidenceInputs {
  /** Optional conformal CI bundle for the same audit. Affects width-derived component. */
  conformal?: ConformalBundle | null;
  /** Optional source-independent panel report from the swarm aggregation. */
  swarmIndependence?: SourceIndependentPanelResult | null;
  /** Per-class evidence inputs derived from the live data acquisition stage. */
  evidencePerClass?: ClassEvidenceInput[];
}

export interface EmpiricalConfidenceResult extends LegacyConfidenceResult {
  /** Snapshot of presence gate output. */
  presenceReport: EvidencePresenceReport;
  /** Hard cap applied (if any). */
  appliedCap: number;
  capReason: string;
  /** Confidence components specific to the empirical model. */
  empiricalBreakdown: {
    weightedQuorumCoverage: number;
    conformalSource: ConformalBundle['source'] | 'none';
    conformalEmpiricalCoverage: number | null;
    swarmNEff: number | null;
    swarmCorrelationPenalty: number;
  };
}

// ── Constants ───────────────────────────────────────────────────────────────

const W_QUORUM_COVERAGE     = 0.30;
const W_SOURCE_AGREEMENT    = 0.20;
const W_FRESHNESS           = 0.15;
const W_SOURCE_RELIABILITY  = 0.15;
const W_CONFORMAL_QUALITY   = 0.20;

// Below n_eff = 3.5 the swarm consensus is materially correlated; we
// apply a graduated penalty so confidence does not silently inflate.
const N_EFF_PENALTY_FLOOR   = 3.5;
const MAX_SWARM_PENALTY     = 0.15;

// Conflict penalty: 5% per surfaced conflict, max 20%.
const CONFLICT_PENALTY_PER  = 0.05;
const MAX_CONFLICT_PENALTY  = 0.20;

const clamp = (x: number, lo = 0, hi = 1): number => Math.max(lo, Math.min(hi, x));

// ── Component computations ─────────────────────────────────────────────────

function freshnessComponent(inputs: EmpiricalConfidenceInputs): number {
  const total = inputs.freshSignalCount + inputs.degradedSignalCount + inputs.invalidSignalCount;
  if (total === 0) return 0.4;
  return (inputs.freshSignalCount * 1.0 + inputs.degradedSignalCount * 0.5 + inputs.invalidSignalCount * 0.0) / total;
}

function sourceAgreementComponent(inputs: EmpiricalConfidenceInputs): number {
  return inputs.totalAgreementOpportunities > 0
    ? clamp(inputs.crossSourceAgreements / inputs.totalAgreementOpportunities)
    : 0.5;
}

function conformalQualityComponent(conformal: ConformalBundle | null | undefined): {
  score: number;
  empiricalCoverage: number | null;
  source: ConformalBundle['source'] | 'none';
} {
  if (!conformal) return { score: 0.4, empiricalCoverage: null, source: 'none' };
  if (conformal.source === 'no_data') return { score: 0.3, empiricalCoverage: null, source: 'no_data' };

  // For each interval, if empirical coverage is known and matches nominal,
  // that is high confidence. If empirical coverage is null (haven't been
  // measured yet), we score the heuristic fallback lower than verified
  // conformal.
  if (conformal.source === 'fallback_heuristic') {
    return { score: 0.4, empiricalCoverage: null, source: 'fallback_heuristic' };
  }

  // Find the 0.9 nominal interval and score by how well it tracks empirical.
  const i90 = conformal.intervals.find((i) => Math.abs(i.nominalCoverage - 0.9) < 0.01);
  if (!i90) return { score: 0.6, empiricalCoverage: null, source: 'conformal' };

  if (i90.empiricalCoverage == null) {
    // Conformal source but coverage not yet measured by the weekly cron.
    // Mid-tier score.
    return { score: 0.65, empiricalCoverage: null, source: 'conformal' };
  }

  // Score = 1 - 2*|empirical - nominal|. Perfect calibration = 1.0,
  // 10pp off = 0.8, 50pp off = 0.0.
  const gap = Math.abs(i90.empiricalCoverage - i90.nominalCoverage);
  const score = clamp(1 - 2 * gap);
  return { score, empiricalCoverage: i90.empiricalCoverage, source: 'conformal' };
}

function swarmCorrelationPenalty(panel: SourceIndependentPanelResult | null | undefined): number {
  if (!panel) return 0;
  if (panel.nEff >= N_EFF_PENALTY_FLOOR) return 0;
  // Linear penalty from 0 at floor to MAX_SWARM_PENALTY at n_eff=1.
  const distance = (N_EFF_PENALTY_FLOOR - panel.nEff) / (N_EFF_PENALTY_FLOOR - 1);
  return clamp(distance) * MAX_SWARM_PENALTY;
}

// ── Quorum coverage from presence report ───────────────────────────────────

function buildPresenceReportFromInputs(
  inputs: EmpiricalConfidenceInputs,
): EvidencePresenceReport {
  if (inputs.evidencePerClass && inputs.evidencePerClass.length > 0) {
    return buildPresenceReport(inputs.evidencePerClass);
  }
  // Fall back: synthesize from QuorumStatus. Each satisfied class is
  // treated as 'positive' if it has positiveSources>=min, else absence.
  const inferred: ClassEvidenceInput[] = (Object.values(inputs.quorumStatus.perClass) as unknown as Array<{
    signalClass: 'workforce' | 'layoffs' | 'financial' | 'hiring';
    sourcesReached: string[];
    sourcesPending: string[];
    satisfied: boolean;
    satisfiedByAbsence: boolean;
  }>).map((c) => ({
    class: c.signalClass,
    positiveSources: c.satisfiedByAbsence ? 0 : c.sourcesReached.length,
    exhaustedSources: c.satisfiedByAbsence ? c.sourcesReached.length : 0,
    minRequired: 1,  // unknown without spec — assume 1
    absenceQuorumReached: c.satisfiedByAbsence,
    highestPositiveTier: null,  // unknown without per-signal provenance
  }));
  return buildPresenceReport(inferred);
}

// ── Main ────────────────────────────────────────────────────────────────────

/**
 * Compute confidence under the new empirical model. Falls back to a
 * legacy-shaped result when the ws4_conformal_ci flag is off so existing
 * UI consumers see no surface change.
 */
export function computeEmpiricalConfidence(inputs: EmpiricalConfidenceInputs): EmpiricalConfidenceResult {
  const flag = evaluateFlagSync('ws4_conformal_ci');

  // ── Build presence report + confidence cap ──────────────────────────────
  const presenceReport = buildPresenceReportFromInputs(inputs);
  const cap = deriveConfidenceCap(presenceReport);
  const weightedCoverage = weightedQuorumCoverage(presenceReport);

  // ── Components ──────────────────────────────────────────────────────────
  const sourceAgreement = sourceAgreementComponent(inputs);
  const freshnessQuality = freshnessComponent(inputs);
  const sourceReliability = clamp(inputs.avgSourceReliability);
  const conformal = conformalQualityComponent(inputs.conformal);
  const swarmPenalty = swarmCorrelationPenalty(inputs.swarmIndependence);

  // ── Weighted blend ──────────────────────────────────────────────────────
  // When ws4 is off, fall back to legacy 4-component weights.
  const useNew = flag.isActive || flag.isShadow;
  let value: number;
  if (useNew) {
    value =
      weightedCoverage   * W_QUORUM_COVERAGE +
      sourceAgreement    * W_SOURCE_AGREEMENT +
      freshnessQuality   * W_FRESHNESS +
      sourceReliability  * W_SOURCE_RELIABILITY +
      conformal.score    * W_CONFORMAL_QUALITY;
  } else {
    // Legacy weights (preserved for parity).
    value =
      weightedCoverage   * 0.35 +
      sourceAgreement    * 0.25 +
      freshnessQuality   * 0.20 +
      sourceReliability  * 0.20;
  }

  // ── Conflict penalty ────────────────────────────────────────────────────
  const conflictPenalty = clamp(inputs.conflictCount * CONFLICT_PENALTY_PER, 0, MAX_CONFLICT_PENALTY);
  value = Math.max(0, value - conflictPenalty - swarmPenalty);

  // ── Live-unavailable floor (DB-quality-adjusted) ─────────────────────────
  // v40.0 audit fix: floor is now anchored to DB record quality tier rather
  // than a single hard 0.45. Tier A DB records (full Supabase intelligence)
  // earn a higher floor because the DB data itself is real evidence.
  const DB_TIER_FLOORS: Record<string, number> = {
    A: 0.62, B: 0.52, C: 0.45, D: 0.35,
  };
  const liveUnavailableFloorVal = DB_TIER_FLOORS[inputs.dbReliabilityTier ?? 'C'] ?? 0.45;
  if (inputs.liveUnavailable) {
    // Apply as minimum floor, not exact override (see confidenceModel.ts rationale).
    value = Math.max(value, liveUnavailableFloorVal);
  }

  // ── Cap (hard upper bound) ──────────────────────────────────────────────
  value = Math.min(value, cap.cap);
  value = clamp(value);

  // ── Rationale ───────────────────────────────────────────────────────────
  const rationale: string[] = [];
  rationale.push(
    `Weighted quorum coverage: ${(weightedCoverage * 100).toFixed(0)}% ` +
      `(positive=${presenceReport.positiveCount}, absence=${presenceReport.absenceCount}, ` +
      `unresolved=${presenceReport.unresolvedCount}).`,
  );
  rationale.push(`Source agreement: ${(sourceAgreement * 100).toFixed(0)}%.`);
  rationale.push(`Freshness: ${(freshnessQuality * 100).toFixed(0)}%.`);
  rationale.push(`Source reliability: ${(sourceReliability * 100).toFixed(0)}%.`);
  if (useNew) {
    rationale.push(
      `Conformal quality: ${(conformal.score * 100).toFixed(0)}% ` +
        `(source=${conformal.source}` +
        (conformal.empiricalCoverage != null
          ? `, empirical@90=${(conformal.empiricalCoverage * 100).toFixed(0)}%`
          : '') +
        `).`,
    );
  }
  if (swarmPenalty > 0) {
    rationale.push(
      `Swarm correlation penalty: -${(swarmPenalty * 100).toFixed(0)}pp ` +
        `(n_eff=${inputs.swarmIndependence?.nEff.toFixed(2)}).`,
    );
  }
  if (conflictPenalty > 0) {
    rationale.push(`Conflict penalty: -${(conflictPenalty * 100).toFixed(0)}pp.`);
  }
  if (inputs.liveUnavailable) {
    const tier = inputs.dbReliabilityTier ?? 'C';
    rationale.push(
      `Live intelligence unavailable — confidence anchored to DB quality tier ${tier}`
      + ` (${Math.round(liveUnavailableFloorVal * 100)}%).`,
    );
  }
  if (cap.cap < 1.0) {
    rationale.push(`Presence cap: ${(cap.cap * 100).toFixed(0)}% — ${cap.reason}`);
  }

  return {
    value,
    breakdown: {
      quorumCoverage:    { score: weightedCoverage, weight: useNew ? W_QUORUM_COVERAGE : 0.35 },
      sourceAgreement:   { score: sourceAgreement,  weight: useNew ? W_SOURCE_AGREEMENT : 0.25 },
      freshnessQuality:  { score: freshnessQuality, weight: useNew ? W_FRESHNESS : 0.20 },
      sourceReliability: { score: sourceReliability, weight: useNew ? W_SOURCE_RELIABILITY : 0.20 },
      conflictPenalty,
      liveUnavailableFloor: inputs.liveUnavailable ? liveUnavailableFloorVal : null,
    },
    rationale,
    presenceReport,
    appliedCap: cap.cap,
    capReason: cap.reason,
    empiricalBreakdown: {
      weightedQuorumCoverage: weightedCoverage,
      conformalSource: conformal.source,
      conformalEmpiricalCoverage: conformal.empiricalCoverage,
      swarmNEff: inputs.swarmIndependence?.nEff ?? null,
      swarmCorrelationPenalty: swarmPenalty,
    },
  };
}
