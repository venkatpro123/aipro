// evidencePresenceGate.ts — WS4
//
// Fixes Audit Issue #23: the legacy quorum model treats "no layoff news
// found after 20 seconds" as quorum-satisfied for that signal class, then
// rolls that satisfaction into the confidence model — producing high
// confidence for completely unknown companies (every quorum class
// "satisfied" by absence; nothing actually present).
//
// This module distinguishes positive-evidence quorum (sources returned
// data) from absence-quorum (sources exhausted with nothing found) and
// computes a confidence penalty that the confidence model applies on top
// of its other components.
//
// Semantics:
//
//   positiveQuorum     A quorum class where ≥1 source returned non-empty,
//                      schema-valid evidence about this company.
//   absenceQuorum      A quorum class where ALL sources completed
//                      successfully but returned no evidence within the
//                      class's allowAbsenceAfterMs window.
//   unresolvedQuorum   A quorum class that neither reached the source
//                      minimum NOR exhausted within the absence window.
//                      Treated as the worst signal (we know nothing).
//
// Rule (the WS4 acceptance test verifies these):
//
//   * The legacy confidence model treats absence-quorum same as positive
//     for the `quorumCoverage` component. We REWEIGHT: absence-quorum
//     contributes at 0.3× weight.
//   * Confidence has a HARD CAP of 0.45 when ALL 4 quorum classes are
//     absence-satisfied OR unresolved. This catches the "audited a
//     company that does not exist in any source" case the legacy model
//     reported as ~70% confidence.
//   * The cap is bypassed when any positive-evidence quorum exists at
//     a high-authority tier (REGULATORY or OFFICIAL_FILING).

import type { SourceTier } from './evidenceHierarchy';

// ── Public types ────────────────────────────────────────────────────────────

export type QuorumClass = 'workforce' | 'layoffs' | 'financial' | 'hiring';
export type PresenceState = 'positive' | 'absence' | 'unresolved';

export interface EvidencePresence {
  class: QuorumClass;
  state: PresenceState;
  /** Number of sources that produced positive evidence. */
  positiveSources: number;
  /** Number of sources that completed empty (only meaningful for absence-quorum). */
  exhaustedSources: number;
  /**
   * Highest-authority tier observed in positive evidence for this class.
   * `null` when state ≠ 'positive'.
   */
  highestPositiveTier: SourceTier | null;
}

export interface EvidencePresenceReport {
  byClass: Record<QuorumClass, EvidencePresence>;
  /** Sum across classes for fast confidence-model reads. */
  positiveCount:   number;
  absenceCount:    number;
  unresolvedCount: number;
  /** True when at least one class has positive evidence at REGULATORY or OFFICIAL_FILING. */
  hasHighAuthorityPositive: boolean;
}

// ── Coverage component ──────────────────────────────────────────────────────

/**
 * Reweighted quorum coverage. The legacy confidence model computes:
 *   quorumCoverage = (# satisfied classes) / 4
 *
 * That value is replaced with:
 *   weightedCoverage = (positive × 1.0 + absence × 0.3 + unresolved × 0) / 4
 *
 * Range: [0, 1]. Hard floor at 0 — we never give negative coverage.
 */
export function weightedQuorumCoverage(report: EvidencePresenceReport): number {
  const classCount = 4;
  return Math.max(
    0,
    Math.min(1, (report.positiveCount * 1.0 + report.absenceCount * 0.3 + report.unresolvedCount * 0.0) / classCount),
  );
}

// ── Confidence cap ──────────────────────────────────────────────────────────

const UNKNOWN_COMPANY_CONFIDENCE_CAP = 0.45;
const ABSENCE_HEAVY_CAP = 0.65;

export interface ConfidenceCap {
  /** Hard upper bound, 0-1. 1.0 means "no cap applied". */
  cap: number;
  /** Why the cap is what it is. */
  reason: string;
  /** True when the cap is the unknown-company hard floor. */
  isUnknownCompany: boolean;
}

/**
 * Determine the maximum confidence the audit can claim, given the
 * presence report.
 *
 * Tiers:
 *   1. ZERO positive classes  → unknown company → cap at 0.45
 *      (Even when 4/4 classes are absence-satisfied. Absence is data
 *      ABOUT the company's visibility, not evidence about its risk.)
 *
 *   2. 0 < positive < 2 AND no high-authority positive
 *                              → cap at 0.65 (absence-heavy)
 *
 *   3. ≥1 high-authority positive
 *                              → no cap (1.0)
 *
 *   4. ≥2 positive classes     → no cap (1.0)
 */
export function deriveConfidenceCap(report: EvidencePresenceReport): ConfidenceCap {
  if (report.positiveCount === 0) {
    return {
      cap: UNKNOWN_COMPANY_CONFIDENCE_CAP,
      reason:
        'No positive evidence in any quorum class. Absence-quorum is informative about source coverage, not about company risk. Confidence floor enforced.',
      isUnknownCompany: true,
    };
  }
  if (report.hasHighAuthorityPositive) {
    return {
      cap: 1.0,
      reason: 'High-authority positive evidence present (REGULATORY or OFFICIAL_FILING tier).',
      isUnknownCompany: false,
    };
  }
  if (report.positiveCount >= 2) {
    return {
      cap: 1.0,
      reason: 'Multiple positive-evidence quorum classes.',
      isUnknownCompany: false,
    };
  }
  return {
    cap: ABSENCE_HEAVY_CAP,
    reason:
      'Only one positive quorum class, no high-authority sources. Confidence capped to reflect thin evidence.',
    isUnknownCompany: false,
  };
}

// ── Builder ─────────────────────────────────────────────────────────────────

export interface ClassEvidenceInput {
  class: QuorumClass;
  positiveSources: number;
  exhaustedSources: number;
  minRequired: number;
  /** True when the class's allowAbsenceAfterMs has elapsed and exhaustedSources covers every spec source. */
  absenceQuorumReached: boolean;
  highestPositiveTier: SourceTier | null;
}

const ALL_CLASSES: QuorumClass[] = ['workforce', 'layoffs', 'financial', 'hiring'];

export function buildPresenceReport(inputs: ClassEvidenceInput[]): EvidencePresenceReport {
  const byClass: Record<QuorumClass, EvidencePresence> = {} as Record<QuorumClass, EvidencePresence>;
  let positive = 0;
  let absence = 0;
  let unresolved = 0;
  let hasHighAuthorityPositive = false;

  // Map provided inputs first.
  const provided = new Map<QuorumClass, ClassEvidenceInput>();
  for (const i of inputs) provided.set(i.class, i);

  for (const klass of ALL_CLASSES) {
    const i = provided.get(klass);
    if (!i) {
      byClass[klass] = {
        class: klass,
        state: 'unresolved',
        positiveSources: 0,
        exhaustedSources: 0,
        highestPositiveTier: null,
      };
      unresolved++;
      continue;
    }

    let state: PresenceState;
    if (i.positiveSources >= i.minRequired) {
      state = 'positive';
    } else if (i.absenceQuorumReached) {
      state = 'absence';
    } else {
      state = 'unresolved';
    }

    byClass[klass] = {
      class: klass,
      state,
      positiveSources: i.positiveSources,
      exhaustedSources: i.exhaustedSources,
      highestPositiveTier: state === 'positive' ? i.highestPositiveTier : null,
    };

    if (state === 'positive') {
      positive++;
      const tier = i.highestPositiveTier;
      if (tier === 'REGULATORY' || tier === 'OFFICIAL_FILING') {
        hasHighAuthorityPositive = true;
      }
    } else if (state === 'absence') {
      absence++;
    } else {
      unresolved++;
    }
  }

  return {
    byClass,
    positiveCount: positive,
    absenceCount: absence,
    unresolvedCount: unresolved,
    hasHighAuthorityPositive,
  };
}

// ── Diagnostic summary (for transparency UI) ────────────────────────────────

export function summarizePresenceReport(report: EvidencePresenceReport): string {
  const parts: string[] = [];
  for (const klass of ALL_CLASSES) {
    const e = report.byClass[klass];
    const desc =
      e.state === 'positive'
        ? `positive (${e.positiveSources} src, top tier: ${e.highestPositiveTier ?? 'unknown'})`
        : e.state === 'absence'
        ? `absence (${e.exhaustedSources} src checked, none found)`
        : 'unresolved';
    parts.push(`${klass}=${desc}`);
  }
  return parts.join('; ');
}
