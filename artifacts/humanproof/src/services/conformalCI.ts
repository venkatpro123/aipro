// conformalCI.ts — WS4
//
// Split-conformal prediction intervals. Replaces the heuristic
// `computeBayesianCI` (which mapped data-quality tiers A/B/C/D to fixed
// widths and labelled the result a "90% credible interval" despite no
// empirical coverage validation — Audit Issue #26).
//
// Conformal prediction guarantees marginal coverage:
//   For any nominal level α ∈ (0, 1) and any data distribution,
//   the produced CI contains the true outcome with probability ≥ 1-α
//   on i.i.d. data — PROVIDED a calibration set of outcomes exists.
//
// We split the outcomes from user_prediction_outcomes into a calibration
// set per cohort. For each calibration point we compute a non-conformity
// score (here: absolute prediction error). At inference time the new
// prediction's CI is [point - q_α, point + q_α] where q_α is the
// ceil((n+1)(1-α))-th quantile of the calibration nonconformities.
//
// Per-cohort calibration:
//   * DISTRESS, EFFICIENCY, WAVE, UNKNOWN, GLOBAL
//   * If a cohort has < MIN_CALIBRATION_POINTS points, we pool toward
//     the next-most-specific available scope. Final fallback is GLOBAL.
//   * If GLOBAL itself has < MIN_CALIBRATION_POINTS, the loader returns
//     a "no_calibration" bundle and the caller MUST display a width
//     downgrade in the UI.
//
// Determinism:
//   Same input score + same cohort + same calibration set ⇒ same CI.
//
// What this module does NOT do:
//   * It does not compute the point prediction; that is the engine's job.
//   * It does not display anything; UI rendering reads from the bundle.

import { supabase } from '../utils/supabase';
import { evaluateFlagSync } from '../config/featureFlags';
// WS9 — MIN_CALIBRATION_POINTS sourced from engine_calibration_constants
// so ops can adjust the conformal-stability floor without a code deploy.
import { getConstant } from './calibration/calibrationConstants';

// ── Public types ────────────────────────────────────────────────────────────

export type ConformalCohort = 'DISTRESS' | 'EFFICIENCY' | 'WAVE' | 'UNKNOWN' | 'GLOBAL';

export interface ConformalInterval {
  /** Lower bound, clamped to [0, 100]. */
  low: number;
  /** Upper bound, clamped to [0, 100]. */
  high: number;
  /** Nominal coverage level — typically 0.50, 0.80, 0.90. */
  nominalCoverage: number;
  /** The cohort that resolved (may be a pool-up from the requested cohort). */
  resolvedCohort: ConformalCohort;
  /** Last-measured empirical coverage on a hold-out set for this cohort/level. */
  empiricalCoverage: number | null;
  /** Last calibration update timestamp; null if no calibration set exists. */
  lastCalibratedAt: string | null;
  /** Size of the calibration set for this cohort. */
  calibrationN: number;
  /** Why the loader chose this cohort/widths combination. */
  rationale: string;
}

export interface ConformalBundle {
  point: number;                  // the original engine point estimate, clamped to [0, 100]
  intervals: ConformalInterval[]; // one per requested nominal coverage
  source: 'conformal' | 'fallback_heuristic' | 'no_data';
}

// ── Config ──────────────────────────────────────────────────────────────────

// WS9 — read once at module scope (getConstant() is cheap thanks to the
// 30-min snapshot cache, but module-scope-once preserves the simple
// constant-feel for the value's many call sites). 80 is the legacy
// bootstrap fallback; ops can override via engine_calibration_constants.
const MIN_CALIBRATION_POINTS = (() => {
  const r = getConstant<number>('conformalCI.minCalibrationPoints', 80);
  return typeof r.value === 'number' ? r.value : 80;
})();
const DEFAULT_NOMINAL_LEVELS = [0.5, 0.8, 0.9] as const;
const CACHE_TTL_MS = 30 * 60 * 1000;
const CALIBRATION_LOOKBACK_DAYS = 365;

// ── Cohort fallback chain ───────────────────────────────────────────────────

function fallbackChain(cohort: ConformalCohort): ConformalCohort[] {
  if (cohort === 'GLOBAL') return ['GLOBAL'];
  return [cohort, 'GLOBAL'];
}

// ── Calibration set loader ──────────────────────────────────────────────────

interface CalibrationRow {
  predicted_score: number;
  outcome_reported: string;
  predicted_cohort: string | null;
  detection_confidence: number | null;
  outcome_source: string | null;
}

interface CalibrationSet {
  cohort: ConformalCohort;
  nonconformities: number[];  // sorted ascending
  lastCalibratedAt: string;
  empiricalCoverage: Record<number, number>;   // keyed by nominal level
}

const calibrationCache: Map<ConformalCohort, { set: CalibrationSet; fetchedAt: number } | null> = new Map();
let cohortInflight: Map<ConformalCohort, Promise<CalibrationSet | null>> = new Map();

/**
 * Convert an outcome row to a non-conformity score. For binary outcomes
 * we proxy the true label to a probability:
 *   laid_off → 1.0   (collapsed companies same)
 *   else     → 0.0
 *
 * The non-conformity is |predicted_probability - actual| where the
 * predicted probability is derived from `predicted_score` via the same
 * sigmoid the calibrationBacktester uses. Scaled by 100 so the final CI
 * is expressed in score points.
 */
const POSITIVE_OUTCOMES = new Set(['laid_off', 'company_closed']);

function scoreToProbability(score: number): number {
  const clamped = Math.max(0, Math.min(100, score));
  const logit = (clamped / 100) * 6 - 3;
  return 1 / (1 + Math.exp(-logit));
}

function rowToNonconformity(row: CalibrationRow): number | null {
  if (row.predicted_score == null) return null;
  const actual = POSITIVE_OUTCOMES.has(row.outcome_reported) ? 1 : 0;
  const predicted = scoreToProbability(row.predicted_score);
  return Math.abs(predicted - actual) * 100;
}

async function fetchCalibrationSet(cohort: ConformalCohort): Promise<CalibrationSet | null> {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - CALIBRATION_LOOKBACK_DAYS);
  let q = supabase
    .from('user_prediction_outcomes')
    .select('predicted_score,outcome_reported,predicted_cohort,detection_confidence,outcome_source')
    .not('outcome_reported', 'is', null)
    .gte('audit_date', since.toISOString().slice(0, 10))
    .limit(5000);

  if (cohort !== 'GLOBAL') {
    q = q.eq('predicted_cohort', cohort);
  }

  const { data, error } = await q;
  if (error || !data) {
    // eslint-disable-next-line no-console
    console.warn(`[conformalCI] calibration fetch failed for ${cohort}:`, error?.message);
    return null;
  }

  const rows = (data as CalibrationRow[]).filter((r) => {
    const c = r.detection_confidence ?? (r.outcome_source === 'user_reported' ? 1.0 : 0);
    return c >= 0.75;
  });

  if (rows.length < MIN_CALIBRATION_POINTS) return null;

  const ncs: number[] = [];
  for (const r of rows) {
    const nc = rowToNonconformity(r);
    if (nc != null && Number.isFinite(nc)) ncs.push(nc);
  }
  if (ncs.length < MIN_CALIBRATION_POINTS) return null;

  ncs.sort((a, b) => a - b);

  // Compute empirical coverage at each nominal level: held-out simulation
  // here is overkill (proper split-conformal would reserve a separate
  // hold-out fold). For now we record the q_α values and trust that the
  // weekly coverage_audit job (separate file) measures real coverage on
  // an explicit hold-out set. This bundle's empiricalCoverage starts null
  // and is populated post-hoc by the coverage_audit cron.
  const empiricalCoverage: Record<number, number> = {};

  return {
    cohort,
    nonconformities: ncs,
    lastCalibratedAt: new Date().toISOString(),
    empiricalCoverage,
  };
}

async function loadSetWithFallback(cohort: ConformalCohort): Promise<CalibrationSet | null> {
  for (const tryCohort of fallbackChain(cohort)) {
    const cached = calibrationCache.get(tryCohort);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      if (cached.set) return cached.set;
      continue;
    }
    const existing = cohortInflight.get(tryCohort);
    if (existing) {
      const set = await existing;
      if (set) return set;
      continue;
    }
    const p = fetchCalibrationSet(tryCohort)
      .then((set) => {
        calibrationCache.set(tryCohort, set ? { set, fetchedAt: Date.now() } : null);
        return set;
      })
      .finally(() => {
        cohortInflight.delete(tryCohort);
      });
    cohortInflight.set(tryCohort, p);
    const set = await p;
    if (set) return set;
  }
  return null;
}

// ── Quantile lookup ─────────────────────────────────────────────────────────

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((sorted.length + 1) * q) - 1));
  return sorted[idx];
}

function buildIntervalFromSet(
  point: number,
  nominal: number,
  set: CalibrationSet,
  requestedCohort: ConformalCohort,
): ConformalInterval {
  const half = quantile(set.nonconformities, nominal);
  const low = Math.max(0, Math.round(point - half));
  const high = Math.min(100, Math.round(point + half));
  const empirical = set.empiricalCoverage[nominal] ?? null;
  const pooledUp = set.cohort !== requestedCohort;

  return {
    low,
    high,
    nominalCoverage: nominal,
    resolvedCohort: set.cohort,
    empiricalCoverage: empirical,
    lastCalibratedAt: set.lastCalibratedAt,
    calibrationN: set.nonconformities.length,
    rationale: pooledUp
      ? `${requestedCohort} cohort has < ${MIN_CALIBRATION_POINTS} calibration points; pooled to ${set.cohort}.`
      : `Conformal CI from ${set.nonconformities.length} ${set.cohort} calibration points.`,
  };
}

// ── Public API ──────────────────────────────────────────────────────────────

export interface ComputeCIOptions {
  /** Cohort the audit was classified as. */
  cohort?: ConformalCohort;
  /** Nominal coverage levels to compute (default 0.5/0.8/0.9). */
  nominalLevels?: number[];
}

/**
 * Compute conformal prediction intervals around the engine's point score.
 *
 * Flag-gated by `ws4_conformal_ci`. When off, the legacy
 * `empiricalCalibration.computeBayesianCI` path remains the source of
 * truth (the caller wires that fallback at the integration point).
 *
 * Returns:
 *   * source='conformal'         when a real calibration set was found
 *   * source='fallback_heuristic' when calibration is unavailable; callers
 *                                  should NOT label this 90% credible
 *                                  (the WS4 UI changes downgrade this)
 *   * source='no_data'           when even the heuristic fallback was
 *                                  requested but ws4_conformal_ci is off
 */
export async function computeConformalCI(
  pointScore: number,
  opts: ComputeCIOptions = {},
): Promise<ConformalBundle> {
  const flag = evaluateFlagSync('ws4_conformal_ci');
  const clamped = Math.max(0, Math.min(100, Math.round(pointScore)));
  const cohort = opts.cohort ?? 'GLOBAL';
  const nominalLevels = (opts.nominalLevels ?? [...DEFAULT_NOMINAL_LEVELS]).slice().sort((a, b) => a - b);

  if (!flag.isActive && !flag.isShadow) {
    return { point: clamped, intervals: [], source: 'no_data' };
  }

  const set = await loadSetWithFallback(cohort);
  if (!set) {
    // Fallback: heuristic widths so the engine has something to render.
    // These widths are EXPLICITLY labelled as fallback so the UI does NOT
    // present them as empirical coverage guarantees.
    const heuristicHalfwidths: Record<number, number> = { 0.5: 8, 0.8: 14, 0.9: 18 };
    const intervals: ConformalInterval[] = nominalLevels.map((n) => {
      const h = heuristicHalfwidths[n] ?? 15;
      return {
        low: Math.max(0, clamped - h),
        high: Math.min(100, clamped + h),
        nominalCoverage: n,
        resolvedCohort: 'GLOBAL',
        empiricalCoverage: null,
        lastCalibratedAt: null,
        calibrationN: 0,
        rationale:
          `Insufficient calibration data (< ${MIN_CALIBRATION_POINTS} outcomes). ` +
          `Width is a HEURISTIC fallback, not empirically validated. UI should ` +
          `display as "uncertainty band" rather than "90% credible interval".`,
      };
    });
    return { point: clamped, intervals, source: 'fallback_heuristic' };
  }

  const intervals = nominalLevels.map((n) => buildIntervalFromSet(clamped, n, set, cohort));
  return { point: clamped, intervals, source: 'conformal' };
}

/**
 * Synchronous variant — returns immediately using cache only. Hot-path
 * sites where awaiting is impractical can use this; if the cache is
 * empty, returns the heuristic fallback (with source='fallback_heuristic').
 */
export function computeConformalCISync(
  pointScore: number,
  opts: ComputeCIOptions = {},
): ConformalBundle {
  const flag = evaluateFlagSync('ws4_conformal_ci');
  const clamped = Math.max(0, Math.min(100, Math.round(pointScore)));
  if (!flag.isActive && !flag.isShadow) {
    return { point: clamped, intervals: [], source: 'no_data' };
  }
  const cohort = opts.cohort ?? 'GLOBAL';
  const nominalLevels = (opts.nominalLevels ?? [...DEFAULT_NOMINAL_LEVELS]).slice().sort((a, b) => a - b);

  for (const tryCohort of fallbackChain(cohort)) {
    const cached = calibrationCache.get(tryCohort);
    if (cached?.set) {
      const intervals = nominalLevels.map((n) => buildIntervalFromSet(clamped, n, cached.set!, cohort));
      return { point: clamped, intervals, source: 'conformal' };
    }
  }

  const heuristicHalfwidths: Record<number, number> = { 0.5: 8, 0.8: 14, 0.9: 18 };
  const intervals: ConformalInterval[] = nominalLevels.map((n) => {
    const h = heuristicHalfwidths[n] ?? 15;
    return {
      low: Math.max(0, clamped - h),
      high: Math.min(100, clamped + h),
      nominalCoverage: n,
      resolvedCohort: 'GLOBAL',
      empiricalCoverage: null,
      lastCalibratedAt: null,
      calibrationN: 0,
      rationale: 'Cache miss; heuristic fallback used (sync path).',
    };
  });
  return { point: clamped, intervals, source: 'fallback_heuristic' };
}

/** Prime caches for known cohorts at app startup. */
export async function primeConformalCache(): Promise<void> {
  await Promise.all((['GLOBAL', 'DISTRESS', 'EFFICIENCY', 'WAVE'] as ConformalCohort[]).map(loadSetWithFallback));
}

/** Test-only reset hook. */
export function __resetConformalCacheForTesting(): void {
  calibrationCache.clear();
  cohortInflight = new Map();
}
