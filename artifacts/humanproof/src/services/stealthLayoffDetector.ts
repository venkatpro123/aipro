// stealthLayoffDetector.ts — WS3
//
// Detects companies executing headcount reductions WITHOUT announcing them
// in WARN, layoffs.fyi, or news. The legacy engine treats `layoffRounds=0`
// as evidence of stability; this module surfaces the case where it is
// evidence only of silence.
//
// Mechanism:
//   1. Read the workforce_velocity_6mo view (DB-backed, see
//      20260605000001_workforce_snapshots.sql).
//   2. For the company's most recent LinkedIn snapshot vs the same-source
//      snapshot ~26 weeks prior, compute pct_change_6mo.
//   3. Cross-reference against breaking_news_events and curated_layoff_events
//      for the same company in the same window — if a layoff round exists,
//      the contraction is already accounted for in L2 and we do NOT flag.
//   4. Emit a StealthSignal with severity classification and a recommended
//      score floor adjustment.
//
// Severity bands (LinkedIn delta over 6 months, no announced rounds):
//   * STABLE        delta > -2%                 — normal attrition
//   * SOFT_TRIM     -5% ≤ delta ≤ -2%           — measurable but benign
//   * SILENT_TRIM   -10% < delta < -5%          — flagged, modest floor
//   * SILENT_CUT    -20% < delta ≤ -10%         — flagged, material floor
//   * SILENT_PURGE  delta ≤ -20%                — flagged, emergency floor
//
// Score floor application:
//   The detector returns a `scoreFloorBoost` that the engine adds to the
//   composite score (subject to clamp [0, 100]). The floor is NOT
//   additive to a positive L2 — when an announced layoff round exists
//   the floor is 0 because L2 already captured the signal.
//
// Confidence:
//   LinkedIn snapshots have a known noise floor (people change jobs,
//   profiles get marked inactive). The detector requires:
//     * ≥2 LinkedIn snapshots ≥26 weeks apart
//     * Both snapshots above 1000 employees (signal-to-noise floor)
//   Below either threshold, the detector returns NO_DATA rather than a
//   misleading false-positive.

import { supabase } from '../utils/supabase';
import { evaluateFlagSync } from '../config/featureFlags';

// ── Types ───────────────────────────────────────────────────────────────────

export type StealthSeverity =
  | 'STABLE'
  | 'SOFT_TRIM'
  | 'SILENT_TRIM'
  | 'SILENT_CUT'
  | 'SILENT_PURGE'
  | 'NO_DATA';

export interface StealthSignal {
  severity:           StealthSeverity;
  /** True when severity is SILENT_TRIM or worse AND no announced rounds exist. */
  flagged:            boolean;
  /** 6-month % change in LinkedIn headcount, or null when insufficient data. */
  pctChange6mo:       number | null;
  /** Most recent LinkedIn employee count. */
  recentEmployeeCount: number | null;
  /** Prior LinkedIn employee count (26 weeks ago). */
  priorEmployeeCount: number | null;
  /** Recommended score floor boost (0–25 points). 0 when not flagged. */
  scoreFloorBoost:    number;
  /** Confidence of the signal, 0-1. */
  confidence:         number;
  /** Human-readable rationale for UI display. */
  rationale:          string;
  /** Whether any announced layoff round was found in the same 6-month window. */
  hasAnnouncedRound:  boolean;
}

const NO_SIGNAL: StealthSignal = {
  severity: 'NO_DATA',
  flagged: false,
  pctChange6mo: null,
  recentEmployeeCount: null,
  priorEmployeeCount: null,
  scoreFloorBoost: 0,
  confidence: 0,
  rationale: 'Insufficient LinkedIn snapshot data',
  hasAnnouncedRound: false,
};

// ── Severity classification ─────────────────────────────────────────────────

function classifyDelta(pctChange: number): StealthSeverity {
  if (pctChange > -2)  return 'STABLE';
  if (pctChange >= -5) return 'SOFT_TRIM';
  if (pctChange > -10) return 'SILENT_TRIM';
  if (pctChange > -20) return 'SILENT_CUT';
  return 'SILENT_PURGE';
}

const FLOOR_BY_SEVERITY: Record<StealthSeverity, number> = {
  STABLE:       0,
  SOFT_TRIM:    0,
  SILENT_TRIM:  8,
  SILENT_CUT:   15,
  SILENT_PURGE: 25,
  NO_DATA:      0,
};

// ── Data fetch ──────────────────────────────────────────────────────────────

interface VelocityRow {
  company_canonical_name: string;
  source: string;
  recent_week: string;
  recent_count: number;
  prior_week: string;
  prior_count: number;
  recent_conf: number;
  pct_change_6mo: number;
}

async function fetchLinkedinVelocity(companyCanonicalName: string): Promise<VelocityRow | null> {
  const { data, error } = await supabase
    .from('workforce_velocity_6mo')
    .select('*')
    .eq('company_canonical_name', companyCanonicalName)
    .eq('source', 'linkedin')
    .maybeSingle();
  if (error || !data) return null;
  return data as VelocityRow;
}

async function fetchAnnouncedRoundsInWindow(companyName: string, windowDays = 200): Promise<boolean> {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - windowDays);
  const sinceIso = since.toISOString().slice(0, 10);

  // Use the freshest of the two layoff event tables.
  // ilike for company name match — same pattern as liveDataService.
  const [breakingRes, curatedRes] = await Promise.allSettled([
    supabase
      .from('breaking_news_events')
      .select('id', { count: 'exact', head: true })
      .ilike('company_name', `%${companyName}%`)
      .gte('event_date', sinceIso),
    supabase
      .from('curated_layoff_events')
      .select('id', { count: 'exact', head: true })
      .ilike('company_name', `%${companyName}%`)
      .gte('event_date', sinceIso),
  ]);

  const breakingCount =
    breakingRes.status === 'fulfilled' ? breakingRes.value.count ?? 0 : 0;
  const curatedCount =
    curatedRes.status === 'fulfilled' ? curatedRes.value.count ?? 0 : 0;
  return breakingCount + curatedCount > 0;
}

// ── Public API ──────────────────────────────────────────────────────────────

export interface DetectorInput {
  companyCanonicalName: string;
  companyDisplayName?: string;
  /** Pre-fetched announced-round count to avoid duplicate DB calls. */
  hasAnnouncedRoundOverride?: boolean;
  /** Minimum employee count for signal validity. */
  minEmployeeFloor?: number;
}

/**
 * Async detector — pulls data from Supabase. Use this from the audit
 * pipeline. Returns NO_SIGNAL when insufficient data exists or the flag
 * is off (in which case the legacy engine continues unaffected).
 */
export async function detectStealthLayoff(input: DetectorInput): Promise<StealthSignal> {
  const flag = evaluateFlagSync('ws3_stealth_layoff_detector');
  if (!flag.isActive && !flag.isShadow) {
    return NO_SIGNAL;
  }

  const minFloor = input.minEmployeeFloor ?? 1000;
  const velocity = await fetchLinkedinVelocity(input.companyCanonicalName);
  if (!velocity) return NO_SIGNAL;

  if (velocity.recent_count < minFloor || velocity.prior_count < minFloor) {
    // Below the signal-to-noise floor: LinkedIn churn dominates real
    // workforce change. Return NO_DATA rather than misclassifying.
    return {
      ...NO_SIGNAL,
      rationale: `LinkedIn count below noise floor (${minFloor.toLocaleString()} required)`,
    };
  }

  const severity = classifyDelta(velocity.pct_change_6mo);
  let hasAnnouncedRound = input.hasAnnouncedRoundOverride ?? false;
  if (input.hasAnnouncedRoundOverride === undefined) {
    hasAnnouncedRound = await fetchAnnouncedRoundsInWindow(input.companyDisplayName ?? input.companyCanonicalName);
  }

  // Only flag when stealth severity AND no announced round (when announced,
  // L2 in the existing pipeline already captures the signal).
  const flagged =
    !hasAnnouncedRound && (severity === 'SILENT_TRIM' || severity === 'SILENT_CUT' || severity === 'SILENT_PURGE');

  const scoreFloorBoost = flagged ? FLOOR_BY_SEVERITY[severity] : 0;

  // Confidence: scale with absolute delta and source measurement_confidence
  // attached to the underlying snapshot. Below |3%| delta we trust little;
  // above |15%| we trust a lot.
  const absDelta = Math.abs(velocity.pct_change_6mo);
  const deltaConfidence = Math.min(1, absDelta / 15);
  const confidence = Math.round(deltaConfidence * (velocity.recent_conf ?? 0.8) * 100) / 100;

  const rationale = flagged
    ? `LinkedIn headcount fell ${velocity.pct_change_6mo.toFixed(1)}% over 26 weeks ` +
      `with NO announced layoff round in same window. Likely stealth reduction; ` +
      `score floor raised by ${scoreFloorBoost} pts.`
    : severity === 'STABLE' || severity === 'SOFT_TRIM'
    ? `LinkedIn headcount within normal range (${velocity.pct_change_6mo.toFixed(1)}% over 26 weeks).`
    : `LinkedIn headcount fell ${velocity.pct_change_6mo.toFixed(1)}% over 26 weeks ` +
      `BUT an announced layoff round exists in the same window — already counted in L2.`;

  return {
    severity,
    flagged,
    pctChange6mo: velocity.pct_change_6mo,
    recentEmployeeCount: velocity.recent_count,
    priorEmployeeCount: velocity.prior_count,
    scoreFloorBoost,
    confidence,
    rationale,
    hasAnnouncedRound,
  };
}

/**
 * Apply the detector's score floor to a candidate composite score.
 *
 * Composite score remains in [0, 100]. Floor is additive but capped.
 * Returns the original score when the detector did not flag.
 */
export function applyStealthFloor(originalScore: number, signal: StealthSignal): number {
  if (!signal.flagged) return originalScore;
  return Math.min(100, Math.max(originalScore, originalScore + signal.scoreFloorBoost));
}
