// scoreGate.ts — Score sufficiency gate
//
// The platform's primary honesty mechanism.
//
// A point-estimate score is meaningless when the confidence interval spans
// multiple risk tiers. A score of 58 with CI [8, 100] could mean "Very Low"
// or "Critical" — showing 58 would create false precision that misleads the
// user into a specific tier they may not be in.
//
// When the gate fires, the UI MUST NOT render a specific score number.
// Show the CI bounds instead with the standardised message below.
//
// THRESHOLDS (not arbitrary):
//   CI_RANGE_THRESHOLD = 50 pts
//     A CI spanning > 50 points crosses at minimum two risk tier boundaries
//     (LOW/MEDIUM at 35, MEDIUM/HIGH at 55, HIGH/CRITICAL at 75).
//     Any single-tier CI is at most 20 points wide; a 50-point span means
//     the score could plausibly be classified as any of 3 different tiers.
//
//   CONFIDENCE_MIN_PCT = 20%
//     Below 20% confidence the model has less than 1-in-5 certainty that
//     the evidence it has actually reflects the company's current risk state.
//     Displaying a number at this confidence level would imply analytical
//     precision from noise.

import type { ConfidenceInterval } from '../types/hybridResult';

export const CI_RANGE_THRESHOLD  = 50;   // CI.range > 50 → insufficient
export const CONFIDENCE_MIN_PCT  = 20;   // confidencePercent < 20 → insufficient

export type InsufficientReason =
  | 'ci_range_too_wide'    // CI spans > 50 pts
  | 'confidence_too_low'   // confidence < 20%
  | 'both';                // both conditions true

export interface ScoreSufficiency {
  /** true → safe to display a point-estimate score number */
  sufficient: boolean;
  /** null when sufficient = true */
  reason: InsufficientReason | null;
  /** Lower CI bound (0–100) */
  ciLow: number;
  /** Upper CI bound (0–100) */
  ciHigh: number;
  /** ciHigh − ciLow */
  ciRange: number;
  /** Confidence percent 0–100 */
  confPct: number;
  /**
   * The user-facing message to show when sufficient = false.
   * Always refers to the actual CI bounds — never "low" or "high" in abstract.
   */
  message: string;
}

/**
 * Compute whether the score is sufficiently precise to display as a point estimate.
 *
 * Called once per render with the resolved HybridResult fields.
 * Both `ci` and `confidencePercent` may be absent on very early audits or
 * error states — when absent, defaults to sufficient=true so the existing
 * UI behaviour is preserved (no false blocking).
 */
export function computeScoreSufficiency(
  ci: ConfidenceInterval | undefined | null,
  confidencePercent: number | undefined | null,
): ScoreSufficiency {
  // When CI or confidence is completely absent, do not block the score display.
  // An absent CI means the conformal layer did not run — the score is shown
  // with a staleness/heuristic warning from the freshness tier instead.
  if (!ci || confidencePercent == null) {
    return {
      sufficient: true,
      reason: null,
      ciLow: ci?.low ?? 0,
      ciHigh: ci?.high ?? 100,
      ciRange: ci?.range ?? 100,
      confPct: confidencePercent ?? 50,
      message: '',
    };
  }

  const ciLow   = Math.round(ci.low);
  const ciHigh  = Math.round(ci.high);
  const ciRange = ci.range ?? (ciHigh - ciLow);
  const confPct = Math.round(confidencePercent);

  const rangeToWide = ciRange > CI_RANGE_THRESHOLD;
  const confTooLow  = confPct < CONFIDENCE_MIN_PCT;

  if (!rangeToWide && !confTooLow) {
    return {
      sufficient: true,
      reason: null,
      ciLow, ciHigh, ciRange, confPct,
      message: '',
    };
  }

  const reason: InsufficientReason = rangeToWide && confTooLow
    ? 'both'
    : rangeToWide
    ? 'ci_range_too_wide'
    : 'confidence_too_low';

  return {
    sufficient: false,
    reason,
    ciLow,
    ciHigh,
    ciRange,
    confPct,
    message:
      `We don't have enough information yet to give you one exact number — ` +
      `your risk is somewhere between ${ciLow} and ${ciHigh}.`,
  };
}
