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
//   2. For the company's most recent headcount snapshot vs the same-source
//      snapshot ~26 weeks prior, compute pct_change_6mo.
//   3. Cross-reference against breaking_news_events and curated_layoff_events
//      for the same company in the same window — if a layoff round exists,
//      the contraction is already accounted for in L2 and we do NOT flag.
//   4. Emit a StealthSignal with severity classification and a recommended
//      score floor adjustment.
//
// SINGLE SIGNAL: aggregate headcount 6-month delta (no announced round).
// "Contractor-only cuts", "silent headcount shrink", and "voluntary attrition
// acceleration" are MOTIVATING CONTEXT but not separately detected. All three
// mechanisms produce the same observable: headcount falls without a news
// announcement. The detector cannot distinguish between them.
//
// Severity bands (headcount delta over 26 weeks, no announced rounds):
//   * STABLE        delta > -2%                 — normal attrition
//   * SOFT_TRIM     -5% ≤ delta ≤ -2%           — measurable but benign
//   * SILENT_TRIM   -10% < delta < -5%          — flagged, floor 60
//   * SILENT_CUT    -20% < delta ≤ -10%         — flagged, floor 65
//   * SILENT_PURGE  delta ≤ -20%                — flagged, floor 70
//
// Score floor application:
//   Hard floors (60/65/70) applied in auditDataPipeline.ts:1700.
//   applyStealthFloor() exported for external use but NOT called by the
//   pipeline (deprecated — see below).
//
// GAP-A03 SOURCE FIX (migration 20260623000014):
//   Previously queried source='linkedin' only. LinkedIn rows are NEVER
//   written by the scraper (stub path). fetchHeadcountVelocity() now
//   queries in('linkedin','sec-edgar','wikipedia') ordered by confidence.
//
// PRECISION GATE (uncleared — 0 fired cases):
//   Floors should not be applied until precision >= 0.60 on >=20 outcomes.
//   Gate is tracked in stealth_layoff_precision_summary DB view.
//
// Confidence:
//   Snapshots have a known noise floor (people change jobs, profiles get
//   marked inactive). The detector requires:
//     * ≥2 snapshots ≥26 weeks apart from the same source
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

/**
 * GAP-A03 — One numbered detection signal surfaced in TransparencyTab.
 * The detector currently has exactly ONE signal type (headcount delta).
 */
export interface StealthSubSignal {
  /** Short label for the signal row in TransparencyTab numbered list */
  label: string;
  /** Observed value with unit, e.g. "−8.3% over 26 weeks" */
  observedValue: string;
  /** Severity-band threshold that was crossed, e.g. "< −5% (SILENT_TRIM)" */
  threshold: string;
  /** Direction the metric moved */
  direction: 'increase' | 'decrease';
  /** DB source that provided this data */
  dataSource: string;
  /** Measurement window, e.g. "26 weeks (~183 days)" */
  windowPeriod: string;
}

/**
 * GAP-A03 — Live precision stats for the stealth layoff detector.
 * Aggregated across all severity bands from stealth_layoff_precision_summary.
 * When < 20 confirmed outcomes, precisionLabel = 'UNKNOWN'.
 */
export interface StealthPrecisionStats {
  /** Total flagged outcomes that have an outcome_reported value (denominator). */
  overallN: number;
  /** Fraction of flagged outcomes that were confirmed layoffs. null when overallN < 1. */
  overallPrecision: number | null;
  /** "UNKNOWN" when overallN < 20; "71%" when known. */
  precisionLabel: string;
  /** "UNKNOWN" when overallN < 20; "29%" when known. */
  fprLabel: string;
  gateStatus: 'gate_clears' | 'insufficient_cases' | 'precision_below_gate';
}

export interface StealthSignal {
  severity:           StealthSeverity;
  /** True when severity is SILENT_TRIM or worse AND no announced rounds exist. */
  flagged:            boolean;
  /** 6-month % change in headcount, or null when insufficient data. */
  pctChange6mo:       number | null;
  /** Most recent employee count. */
  recentEmployeeCount: number | null;
  /** Prior employee count (26 weeks ago). */
  priorEmployeeCount: number | null;
  /** Recommended score floor boost (0–25 points). 0 when not flagged. */
  scoreFloorBoost:    number;
  /** Confidence of the signal, 0-1. */
  confidence:         number;
  /** Human-readable rationale for UI display. */
  rationale:          string;
  /** Whether any announced layoff round was found in the same 6-month window. */
  hasAnnouncedRound:  boolean;
  /**
   * GAP-A03 — The DB source that provided headcount data.
   * 'linkedin' (most accurate, currently stub), 'sec-edgar' (company_intelligence
   * pipeline, public companies), 'wikipedia' (infobox extract, lowest confidence).
   * null when NO_DATA was returned (no qualifying snapshot found).
   */
  dataSource:         string | null;
  /**
   * GAP-A03 — Structured sub-signals for TransparencyTab numbered disclosure.
   * Currently always 0 or 1 entry (the single headcount-delta signal).
   * Empty array when severity is STABLE, SOFT_TRIM, or NO_DATA.
   */
  subSignals:         StealthSubSignal[];
}

const NO_SIGNAL: StealthSignal = {
  severity: 'NO_DATA',
  flagged: false,
  pctChange6mo: null,
  recentEmployeeCount: null,
  priorEmployeeCount: null,
  scoreFloorBoost: 0,
  confidence: 0,
  rationale: 'Insufficient headcount snapshot data',
  hasAnnouncedRound: false,
  dataSource: null,
  subSignals: [],
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

// GAP-A03 SOURCE FIX: previously filtered source='linkedin' only.
// The scraper (scrape-workforce-snapshot EF) writes source='sec-edgar'
// (company_intelligence path) and source='wikipedia' — never 'linkedin'
// because that path is stub-only. Broadened to all three; workforce_velocity_6mo
// has a measurement_confidence column so we take the highest-confidence row.
async function fetchHeadcountVelocity(companyCanonicalName: string): Promise<VelocityRow | null> {
  const { data, error } = await supabase
    .from('workforce_velocity_6mo')
    .select('*')
    .eq('company_canonical_name', companyCanonicalName)
    .in('source', ['linkedin', 'sec-edgar', 'wikipedia'])
    .order('recent_conf', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data as VelocityRow;
}

/** @deprecated Legacy name — use fetchHeadcountVelocity. */
const fetchLinkedinVelocity = fetchHeadcountVelocity;

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
  const velocity = await fetchHeadcountVelocity(input.companyCanonicalName);
  if (!velocity) return NO_SIGNAL;

  if (velocity.recent_count < minFloor || velocity.prior_count < minFloor) {
    // Below the signal-to-noise floor: profile churn dominates real workforce
    // change. Return NO_DATA rather than misclassifying.
    return {
      ...NO_SIGNAL,
      dataSource: velocity.source,
      rationale: `Headcount (${velocity.source}) below noise floor (${minFloor.toLocaleString()} required)`,
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
    ? `Headcount (${velocity.source}) fell ${velocity.pct_change_6mo.toFixed(1)}% over 26 weeks ` +
      `with NO announced layoff round in same window. Likely stealth reduction; ` +
      `score floor raised by ${scoreFloorBoost} pts.`
    : severity === 'STABLE' || severity === 'SOFT_TRIM'
    ? `Headcount (${velocity.source}) within normal range (${velocity.pct_change_6mo.toFixed(1)}% over 26 weeks).`
    : `Headcount (${velocity.source}) fell ${velocity.pct_change_6mo.toFixed(1)}% over 26 weeks ` +
      `BUT an announced layoff round exists in the same window — already counted in L2.`;

  // GAP-A03 — structured sub-signal for TransparencyTab numbered disclosure.
  const THRESHOLD_LABELS: Record<StealthSeverity, string> = {
    STABLE:       '> −2% (no action)',
    SOFT_TRIM:    '−5% to −2% (no floor)',
    SILENT_TRIM:  '< −5% → floor 60',
    SILENT_CUT:   '< −10% → floor 65',
    SILENT_PURGE: '< −20% → floor 70',
    NO_DATA:      'insufficient data',
  };
  const subSignals: StealthSubSignal[] = flagged
    ? [{
        label: 'Aggregate headcount change (26-week delta)',
        observedValue: `${velocity.pct_change_6mo.toFixed(1)}%`,
        threshold: THRESHOLD_LABELS[severity],
        direction: 'decrease',
        dataSource: velocity.source,
        windowPeriod: '26 weeks (~183 days)',
      }]
    : [];

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
    dataSource: velocity.source,
    subSignals,
  };
}

// ── Precision stats ─────────────────────────────────────────────────────────

const STEALTH_PRECISION_FALLBACK: StealthPrecisionStats = {
  overallN: 0,
  overallPrecision: null,
  precisionLabel: 'UNKNOWN',
  fprLabel: 'UNKNOWN',
  gateStatus: 'insufficient_cases',
};

let _stealthPrecisionCache: { data: StealthPrecisionStats; ts: number } | null = null;
const STEALTH_PRECISION_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * GAP-A03 — Live precision stats from stealth_layoff_precision_summary.
 * Non-fatal: returns FALLBACK on any DB error (0 cases / UNKNOWN state).
 * Results cached for 1 hour.
 */
export async function getStealthPrecisionStats(): Promise<StealthPrecisionStats> {
  if (_stealthPrecisionCache && Date.now() - _stealthPrecisionCache.ts < STEALTH_PRECISION_TTL_MS) {
    return _stealthPrecisionCache.data;
  }
  try {
    const { data, error } = await supabase
      .from('stealth_layoff_precision_summary')
      .select('n_flagged, n_confirmed_layoff, n_false_positive, precision, gate_status');

    if (error || !data || data.length === 0) return STEALTH_PRECISION_FALLBACK;

    const totalConfirmed = data.reduce((s: number, r: any) => s + (r.n_confirmed_layoff ?? 0), 0);
    const totalFP        = data.reduce((s: number, r: any) => s + (r.n_false_positive ?? 0), 0);
    const totalWithResult = totalConfirmed + totalFP;

    const overallPrecision = totalWithResult >= 1
      ? Math.round((totalConfirmed / totalWithResult) * 1000) / 1000
      : null;
    const overallFPR = totalWithResult >= 1 ? totalFP / totalWithResult : null;

    const gateStatus: StealthPrecisionStats['gateStatus'] =
      totalWithResult >= 20 && overallPrecision != null && overallPrecision >= 0.60
        ? 'gate_clears'
        : totalWithResult < 20
        ? 'insufficient_cases'
        : 'precision_below_gate';

    const result: StealthPrecisionStats = {
      overallN: totalWithResult,
      overallPrecision,
      precisionLabel: totalWithResult >= 20 && overallPrecision != null
        ? `${Math.round(overallPrecision * 100)}%`
        : 'UNKNOWN',
      fprLabel: totalWithResult >= 20 && overallFPR != null
        ? `${Math.round(overallFPR * 100)}%`
        : 'UNKNOWN',
      gateStatus,
    };

    _stealthPrecisionCache = { data: result, ts: Date.now() };
    return result;
  } catch {
    return STEALTH_PRECISION_FALLBACK;
  }
}

/** Sync accessor — returns cached value or conservative UNKNOWN fallback. */
export function getStealthPrecisionStatsSync(): StealthPrecisionStats {
  return _stealthPrecisionCache?.data ?? STEALTH_PRECISION_FALLBACK;
}

/**
 * @deprecated GAP-A03 — This function is dead code. auditDataPipeline.ts
 * applies hard floors (60/65/70 by severity) directly at line ~1700 without
 * calling this function. The additive scoreFloorBoost approach was superseded
 * by the hard-floor system during the decay_kill_switch_separation fix
 * (migration 20260623000005). Left exported to avoid breaking any future
 * callers that may import it, but it is NOT invoked by the pipeline.
 *
 * Apply the detector's score floor to a candidate composite score.
 * Returns the original score when the detector did not flag.
 */
export function applyStealthFloor(originalScore: number, signal: StealthSignal): number {
  if (!signal.flagged) return originalScore;
  return Math.min(100, Math.max(originalScore, originalScore + signal.scoreFloorBoost));
}
