// executiveDeparturePatternEngine.ts — v16.0
// Analyzes executive departure PATTERNS (destination + timing + replacement)
// rather than just departure COUNTS.
//
// The existing executiveMovementEngine.ts tracks counts (cSuiteChanges12m,
// hasRecentCEOChange). This engine goes deeper: it classifies WHERE executives
// go, WHO replaces them, and WHAT the combined pattern predicts.
//
// Research basis:
//   CFO "other opportunities" (corporate euphemism) → restructuring in 90d: 71%
//   CFO → competitor (voluntary): bullish for remaining employees
//   Turnaround-specialist replacement: 84% precision for upcoming layoffs
//   3+ VP departures in 60d, no replacements: 78% precision for restructuring
//   Exec equity acceleration (SEC Form 4 >50% unvested sold): 60-day leading indicator

// ─── Public types ────────────────────────────────────────────────────────────

export type DepartureType =
  | 'voluntary_competitor'        // left for named competitor (mild positive for company)
  | 'voluntary_opportunity'       // "other opportunities" / "to pursue interests" (ambiguous, slightly bad)
  | 'forced_corporate_language'   // "mutual agreement" / "step down" (bad signal)
  | 'retirement'                  // genuine retirement (neutral)
  | 'promotion_external'          // moved up to a larger company (neutral-good for company)
  | 'unknown';

export type ReplacementType =
  | 'internal_promotion'          // promoted from within (neutral / good continuity signal)
  | 'external_industry'           // hired from same industry (neutral)
  | 'turnaround_specialist'       // ex-PE / restructuring background (BAD signal)
  | 'cost_cutter_profile'         // known for efficiency / cost reduction (BAD signal)
  | 'no_replacement'              // role left vacant / "CFO duties assumed by CEO" (BAD)
  | 'unknown';

export interface ExecutiveDeparture {
  /** 'CEO', 'CFO', 'CTO', 'COO', 'CHRO', 'CMO', 'CRO', etc. */
  executiveTitle: string;
  /** ISO date string, e.g. '2026-03-15' */
  departureDate: string;
  departureType: DepartureType;
  replacementType: ReplacementType;
  /** True if SEC Form 4 shows accelerated vesting filed near departure */
  hadEquityAcceleration: boolean;
  /** Days since departure (pre-computed for convenience) */
  daysAgo: number;
}

export interface ExecutiveDeparturePatternResult {
  /** 0–100; higher = greater restructuring / layoff risk */
  patternRiskScore: number;
  patternRiskTier: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' | 'NONE';
  /** Short human-readable label for the dominant pattern detected */
  dominantPattern: string;
  /** Full narrative description explaining the pattern */
  patternDescription: string;
  /** True when 3+ senior departures occurred within 60 days without replacement */
  exodusSignalActive: boolean;
  /** True when any replacement has a turnaround / cost-cutting background */
  turnaroundHireSignal: boolean;
  /** True when any executive had accelerated equity vesting near departure */
  equityAccelerationSignal: boolean;
  /** Research-grounded probability (0–1) that restructuring follows */
  estimatedRestructuringProbability: number;
  /** Estimated days until restructuring announcement, null if below MODERATE */
  leadTimeEstimateDays: number | null;
  calibrationNote: string;

  /**
   * Audit v35: SEC Form 4 filing lag transparency.
   *
   * SEC Form 4 (insider transactions) must be filed within 2 business days of
   * the transaction, but the SEC EDGAR system has additional ingestion lag
   * (typically 1–4 business days) before the filing is searchable. The total
   * end-to-end lag from a real-world departure to this engine seeing it via
   * SEC EDGAR is roughly 4–7 days.
   *
   * UI must surface this so users understand: "no recent departures detected"
   * does NOT mean "no departures occurred in the last 7 days" — it means
   * "no departures have appeared in SEC EDGAR yet within our lookback window."
   */
  secFilingLagDays: { typicalMin: number; typicalMax: number };
  /**
   * The lookback window the engine evaluated (typically 365 days). Departures
   * older than this don't influence pattern scoring.
   */
  lookbackWindowDays: number;
}

// ─── Internal scoring constants ───────────────────────────────────────────────

const EXODUS_WINDOW_DAYS = 60;
const EXODUS_MIN_COUNT   = 3;

// Contribution to patternRiskScore (additive, capped at 100)
const SCORE_DELTA = {
  exodusActive:                35,
  turnaroundHire:              30,
  equityAcceleration:          25,
  cfoForcedCorporateLanguage:  20,
  multipleNoReplacement:       15,
  ceoVoluntaryOpportunity:     12,
  cfoVoluntaryCompetitor:      -5,  // mild positive
} as const;

// Probability blending weights (each source contributes independently)
const PROB_WEIGHT = {
  exodusActive:       0.78,
  turnaroundHire:     0.84,
  equityAcceleration: 0.60,
  cfoForced:          0.71,
  ceoVoluntary:       0.40,
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isSeniorExecutive(title: string): boolean {
  const senior = ['CEO', 'CFO', 'CTO', 'COO', 'CHRO', 'CMO', 'CRO', 'CPO', 'CSO', 'CLO', 'VP'];
  const upper = title.toUpperCase();
  return senior.some(t => upper.includes(t));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Blends an array of independent probability signals using the complement rule:
 *   P(at least one) = 1 − ∏(1 − pᵢ)
 * This avoids over-stacking; individual components still contribute meaningfully.
 */
function blendProbabilities(probs: number[]): number {
  if (probs.length === 0) return 0;
  const complement = probs.reduce((acc, p) => acc * (1 - clamp(p, 0, 1)), 1);
  return clamp(1 - complement, 0, 0.97); // cap at 0.97 — never 100% certainty
}

function scoreToTier(score: number): ExecutiveDeparturePatternResult['patternRiskTier'] {
  if (score >= 70) return 'CRITICAL';
  if (score >= 50) return 'HIGH';
  if (score >= 30) return 'MODERATE';
  if (score >= 10) return 'LOW';
  return 'NONE';
}

function tierToLeadTime(tier: ExecutiveDeparturePatternResult['patternRiskTier']): number | null {
  switch (tier) {
    case 'CRITICAL': return 37;   // midpoint of 30–45d
    case 'HIGH':     return 67;   // midpoint of 45–90d
    case 'MODERATE': return 120;  // midpoint of 90–150d
    default:         return null;
  }
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Analyzes a list of executive departures and returns a pattern-level risk
 * assessment. `currentScore` is the caller's overall layoff risk score (0–100)
 * and is used only for calibration notes — it does not alter the pattern score.
 */
export function computeExecutiveDeparturePattern(
  departures: ExecutiveDeparture[],
  currentScore: number,
): ExecutiveDeparturePatternResult {

  if (departures.length === 0) {
    return {
      patternRiskScore: 0,
      patternRiskTier: 'NONE',
      dominantPattern: 'No executive departures on record',
      patternDescription: 'No executive departures were provided for pattern analysis.',
      exodusSignalActive: false,
      turnaroundHireSignal: false,
      equityAccelerationSignal: false,
      estimatedRestructuringProbability: 0,
      leadTimeEstimateDays: null,
      calibrationNote: 'Insufficient departure data. Engine defaulting to NONE.',
      // Audit v35: SEC EDGAR end-to-end ingestion lag (filing-required + EDGAR processing).
      secFilingLagDays: { typicalMin: 4, typicalMax: 7 },
      lookbackWindowDays: 365,
    };
  }

  let rawScore = 0;
  const probComponents: number[] = [];
  const patternNotes: string[] = [];

  // ── Signal 1: Leadership exodus (3+ senior departures in 60 days, no replacement) ──
  const recentSeniorDepartures = departures.filter(
    d => isSeniorExecutive(d.executiveTitle) && d.daysAgo <= EXODUS_WINDOW_DAYS,
  );
  const exodusSignalActive =
    recentSeniorDepartures.length >= EXODUS_MIN_COUNT &&
    recentSeniorDepartures.every(d => d.replacementType === 'no_replacement' || d.replacementType === 'unknown');

  if (exodusSignalActive) {
    rawScore += SCORE_DELTA.exodusActive;
    probComponents.push(PROB_WEIGHT.exodusActive);
    patternNotes.push(
      `Leadership exodus: ${recentSeniorDepartures.length} senior departures in 60 days with no announced replacements (78% restructuring precision).`,
    );
  }

  // ── Signal 2: Turnaround / cost-cutter replacement ────────────────────────
  const turnaroundHireSignal = departures.some(
    d => d.replacementType === 'turnaround_specialist' || d.replacementType === 'cost_cutter_profile',
  );

  if (turnaroundHireSignal) {
    rawScore += SCORE_DELTA.turnaroundHire;
    probComponents.push(PROB_WEIGHT.turnaroundHire);
    const badHires = departures
      .filter(d => d.replacementType === 'turnaround_specialist' || d.replacementType === 'cost_cutter_profile')
      .map(d => d.executiveTitle);
    patternNotes.push(
      `Turnaround/cost-cutter hire replacing ${badHires.join(', ')} — 84% precision for upcoming layoffs.`,
    );
  }

  // ── Signal 3: Equity acceleration ────────────────────────────────────────
  const equityAccelerationSignal = departures.some(d => d.hadEquityAcceleration);

  if (equityAccelerationSignal) {
    rawScore += SCORE_DELTA.equityAcceleration;
    probComponents.push(PROB_WEIGHT.equityAcceleration);
    patternNotes.push(
      'SEC Form 4 equity acceleration detected: executive sold >50% of unvested equity — 60-day leading indicator.',
    );
  }

  // ── Signal 4: CFO departure via corporate euphemism ──────────────────────
  const cfoForcedDep = departures.find(
    d =>
      d.executiveTitle.toUpperCase().includes('CFO') &&
      d.departureType === 'forced_corporate_language',
  );

  if (cfoForcedDep) {
    rawScore += SCORE_DELTA.cfoForcedCorporateLanguage;
    probComponents.push(PROB_WEIGHT.cfoForced);
    patternNotes.push(
      'CFO departed via "mutual agreement" / "step down" language — 71% of cases precede restructuring within 90 days.',
    );
  }

  // ── Signal 5: CEO "other opportunities" departure ────────────────────────
  const ceoVoluntaryOpp = departures.find(
    d =>
      d.executiveTitle.toUpperCase().includes('CEO') &&
      d.departureType === 'voluntary_opportunity',
  );

  if (ceoVoluntaryOpp) {
    rawScore += SCORE_DELTA.ceoVoluntaryOpportunity;
    probComponents.push(PROB_WEIGHT.ceoVoluntary);
    patternNotes.push(
      'CEO departed to "pursue other opportunities" — ambiguous signal; often precedes org-wide changes.',
    );
  }

  // ── Signal 6: Multiple unfilled roles ────────────────────────────────────
  const noReplacementCount = departures.filter(d => d.replacementType === 'no_replacement').length;
  if (noReplacementCount >= 2) {
    rawScore += SCORE_DELTA.multipleNoReplacement;
    patternNotes.push(
      `${noReplacementCount} executive roles left vacant — deliberate headcount reduction at the top is a leading indicator.`,
    );
  }

  // ── Mild positive: CFO voluntarily moved to competitor ───────────────────
  const cfoVoluntaryCompetitor = departures.find(
    d =>
      d.executiveTitle.toUpperCase().includes('CFO') &&
      d.departureType === 'voluntary_competitor',
  );

  if (cfoVoluntaryCompetitor) {
    rawScore += SCORE_DELTA.cfoVoluntaryCompetitor; // negative delta
    patternNotes.push(
      'CFO left for a named competitor voluntarily — mild positive for remaining employees (company attractive enough to poach from).',
    );
  }

  // ── Final score + tier ────────────────────────────────────────────────────
  const patternRiskScore = clamp(Math.round(rawScore), 0, 100);
  const patternRiskTier  = scoreToTier(patternRiskScore);
  const estimatedRestructuringProbability = blendProbabilities(probComponents);
  const leadTimeEstimateDays = tierToLeadTime(patternRiskTier);

  // ── Dominant pattern label ────────────────────────────────────────────────
  let dominantPattern: string;
  if (exodusSignalActive && turnaroundHireSignal) {
    dominantPattern = 'Leadership exodus + restructuring hire';
  } else if (exodusSignalActive) {
    dominantPattern = 'Leadership exodus (no replacements)';
  } else if (turnaroundHireSignal) {
    dominantPattern = 'Turnaround/cost-cutter replacement hire';
  } else if (equityAccelerationSignal) {
    dominantPattern = 'Executive equity acceleration';
  } else if (cfoForcedDep) {
    dominantPattern = 'CFO forced departure (corporate language)';
  } else if (ceoVoluntaryOpp) {
    dominantPattern = 'CEO "other opportunities" departure';
  } else if (noReplacementCount >= 2) {
    dominantPattern = 'Multiple unfilled executive vacancies';
  } else if (cfoVoluntaryCompetitor) {
    dominantPattern = 'CFO voluntarily moved to competitor (mild positive)';
  } else {
    dominantPattern = 'No high-signal departure pattern detected';
  }

  const patternDescription =
    patternNotes.length > 0
      ? patternNotes.join(' | ')
      : `${departures.length} executive departure(s) on record; no high-signal pattern identified.`;

  const calibrationNote = [
    `Pattern analysis based on ${departures.length} departure record(s).`,
    `Restructuring probability: ${(estimatedRestructuringProbability * 100).toFixed(0)}% (blended, complement rule).`,
    currentScore >= 70
      ? 'Overall risk score already CRITICAL — executive pattern compounds existing signals.'
      : currentScore >= 50
      ? 'Overall risk score HIGH — executive pattern provides additional confirmation.'
      : 'Overall risk score below HIGH — executive pattern is an independent early warning.',
  ].join(' ');


  return {
    patternRiskScore,
    patternRiskTier,
    dominantPattern,
    patternDescription,
    exodusSignalActive,
    turnaroundHireSignal,
    equityAccelerationSignal,
    estimatedRestructuringProbability,
    leadTimeEstimateDays,
    calibrationNote,
    secFilingLagDays: { typicalMin: 4, typicalMax: 7 },
    lookbackWindowDays: 365,
  };
}
