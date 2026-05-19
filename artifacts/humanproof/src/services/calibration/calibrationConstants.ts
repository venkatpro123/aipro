// calibrationConstants.ts — WS9
//
// DB-backed loader for the long-tail SCALAR constants used by scoring
// engines. Companion to calibrationLoader.ts (which loads structured
// coefficient BUNDLES from engine_calibration_versions).
//
// Why two loaders?
//   * engine_calibration_versions holds the L1-L5 multipliers, D8 logistic
//     coefficients, and threshold tables. These are produced together by
//     recalibrate-engine and ship as a snapshot.
//   * engine_calibration_constants holds individual scalars — AI displacement
//     bands, peer contagion weights, confidence caps, etc. The audit
//     surfaced 28 of these living as magic numbers in code, often labelled
//     "research_derived" without a regression source. WS9 moves them to
//     versioned DB rows with explicit provenance.
//
// Design contract:
//   * Bootstrap-safe. When the WS9 flag is off OR the DB read fails, the
//     loader returns the caller-supplied `bootstrapFallback`. The caller's
//     code path therefore continues to work even if WS9 ships nothing.
//   * Read-once + cache. The snapshot is loaded lazily on first
//     `getConstant()` call. TTL = 30min. A background refresh races; the
//     stale snapshot continues to serve until refresh completes.
//   * Provenance-aware. Every resolution returns the row's `provenance`.
//     Layers using `uncalibrated_placeholder` values MUST emit
//     `fallback=true` on their span via `withFallback()`. The companion
//     helper `applyCalibratedCap()` enforces this contract.
//   * Resolution is logged. Every call writes one row to
//     engine_constant_resolutions (tagged with the audit's request_id) so
//     the v_uncalibrated_exposure view can quantify the audit % depending
//     on uncalibrated values. Logging is fire-and-forget; it cannot break
//     the audit path.
//
// What this loader does NOT do:
//   * It does NOT enforce that uncalibrated constants are unused — that is
//     the runtime contract enforced by withFallback() and the
//     STRICT_CALIBRATION_MODE flag.
//   * It does NOT replace calibrationLoader.ts. The two coexist.
//   * It does NOT validate the JSONB value shape — callers cast to the
//     expected type (T) and a malformed row results in bootstrap.

import { supabase } from '../../utils/supabase';
import { evaluateFlagSync } from '../../config/featureFlags';
import { createLogger } from '../../shared/logger';
import { currentRequestId } from '../../infrastructure/requestId';

const log = createLogger({ service: 'calibration-constants' });

// ── Types ───────────────────────────────────────────────────────────────────

export type CalibrationProvenance =
  | 'regression'
  | 'grid_search'
  | 'manual_seed'
  | 'uncalibrated_placeholder';

export interface ResolvedConstant<T> {
  /** The resolved value. Cast from JSONB, so caller chooses T. */
  value: T;
  /** Where the value came from. */
  provenance: CalibrationProvenance;
  /** True when the DB lookup missed and we fell back to the caller's default. */
  usedBootstrap: boolean;
  /** Human-readable rationale for the row (or 'bootstrap' for misses). */
  rationale: string;
  /** The constant key, returned for span tagging. */
  key: string;
}

interface ConstantRow {
  key: string;
  value: unknown;
  provenance: CalibrationProvenance;
  rationale: string | null;
}

// ── Snapshot cache ──────────────────────────────────────────────────────────

const CACHE_TTL_MS = 30 * 60 * 1000;
let snapshot: Map<string, ConstantRow> | null = null;
let snapshotLoadedAt = 0;
let refreshInFlight: Promise<void> | null = null;

async function loadSnapshot(): Promise<void> {
  // Use the global cohort scope here. Per-scope refinement is a future
  // extension; the WS9 seed only writes GLOBAL rows.
  const { data, error } = await supabase
    .from('engine_calibration_constants')
    .select('key, value, provenance, rationale')
    .eq('status', 'active')
    .eq('cohort_scope', 'GLOBAL');

  if (error) {
    log.warn('snapshot.load_failed', { errorMessage: error.message, code: error.code });
    return; // keep stale snapshot; bootstrap will be used for misses
  }

  const next = new Map<string, ConstantRow>();
  for (const row of (data ?? []) as ConstantRow[]) {
    next.set(row.key, row);
  }
  snapshot = next;
  snapshotLoadedAt = Date.now();
  log.debug('snapshot.loaded', { count: next.size });
}

function maybeRefresh(): void {
  if (refreshInFlight) return;
  const now = Date.now();
  if (snapshot && now - snapshotLoadedAt < CACHE_TTL_MS) return;
  refreshInFlight = loadSnapshot().finally(() => {
    refreshInFlight = null;
  });
}

// ── Resolution logging (fire-and-forget) ────────────────────────────────────

function recordResolution(args: {
  key: string;
  value: unknown;
  provenance: CalibrationProvenance;
  usedBootstrap: boolean;
}): void {
  const requestId = currentRequestId();
  if (!requestId) return; // outside an audit context (e.g. boot probe) — skip
  void supabase
    .from('engine_constant_resolutions')
    .insert({
      request_id: requestId,
      constant_key: args.key,
      cohort_scope: 'GLOBAL',
      resolved_value: args.value as never,
      provenance: args.provenance,
      used_bootstrap: args.usedBootstrap,
    })
    .then(({ error }) => {
      if (error) log.debug('resolution.log_failed', { errorMessage: error.message });
    });
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Resolve a calibration constant by dotted-path key.
 *
 * The `bootstrapFallback` is returned when:
 *   - the ws9_db_calibration_constants flag is off, OR
 *   - the snapshot is empty (first call before primeCalibrationConstants), OR
 *   - the key has no active row, OR
 *   - the snapshot load failed.
 *
 * Callers MUST handle a returned `uncalibrated_placeholder` provenance by
 * tagging their span `fallback=true, reason='uncalibrated_constant'`. The
 * `applyCalibratedCap` helper below does this for the common cap pattern.
 *
 * @example
 *   const aiHigh = getConstant('layoffScoreEngine.aiDisplacement.high', 0.85);
 *   if (aiHigh.provenance === 'uncalibrated_placeholder') {
 *     markSpanFallback({ layerId: 'L3_aiDisplacement', reason: 'uncalibrated_constant' });
 *   }
 *   return aiHigh.value;
 */
export function getConstant<T = number>(key: string, bootstrapFallback: T): ResolvedConstant<T> {
  maybeRefresh(); // non-blocking; the next call sees the refreshed value

  const flag = evaluateFlagSync('ws9_db_calibration_constants');
  if (!flag.isActive && !flag.isShadow) {
    // Flag off: legacy behaviour. Bootstrap silently. No telemetry.
    return {
      value: bootstrapFallback,
      provenance: 'manual_seed',
      usedBootstrap: true,
      rationale: 'flag_off',
      key,
    };
  }

  const row = snapshot?.get(key);
  if (!row) {
    // DB miss. Use the caller's default but tell them it's a bootstrap.
    recordResolution({ key, value: bootstrapFallback, provenance: 'manual_seed', usedBootstrap: true });
    return {
      value: bootstrapFallback,
      provenance: 'manual_seed',
      usedBootstrap: true,
      rationale: 'db_miss',
      key,
    };
  }

  recordResolution({ key, value: row.value, provenance: row.provenance, usedBootstrap: false });
  return {
    value: row.value as T,
    provenance: row.provenance,
    usedBootstrap: false,
    rationale: row.rationale ?? '',
    key,
  };
}

/**
 * Helper for the "Math.max(floor, raw)" / "Math.min(cap, raw)" pattern that
 * appears at the bare-arithmetic sites surfaced in the audit (e.g.
 * `liveDataService.ts:1656 — confidenceCap = 0.35;`). Resolves the cap from
 * a DB constant, applies it, and returns BOTH the result and a flag the
 * caller can attach to its span.
 *
 * Semantics:
 *   kind='ceiling': returns Math.min(raw, cap)
 *   kind='floor':   returns Math.max(raw, cap)
 *
 * When the resolved constant has provenance='uncalibrated_placeholder' OR
 * usedBootstrap=true, the returned `cappedByUncalibrated` is true. Callers
 * use that flag to mark `fallback=true` on their span (via WS10's
 * withFallback) so the audit pipeline knows the cap is provisional.
 */
export function applyCalibratedCap(
  raw: number,
  args: {
    key: string;
    bootstrap: number;
    kind: 'ceiling' | 'floor';
  },
): {
  value: number;
  appliedCap: boolean;
  cappedByUncalibrated: boolean;
  source: string;
} {
  const resolved = getConstant<number>(args.key, args.bootstrap);
  const cap = typeof resolved.value === 'number' ? resolved.value : args.bootstrap;
  const value = args.kind === 'ceiling' ? Math.min(raw, cap) : Math.max(raw, cap);
  const appliedCap = value !== raw;
  const cappedByUncalibrated =
    appliedCap && (resolved.provenance === 'uncalibrated_placeholder' || resolved.usedBootstrap);
  return {
    value,
    appliedCap,
    cappedByUncalibrated,
    source: `${args.key}:${resolved.provenance}`,
  };
}

/**
 * Force the snapshot to load. Call once at app startup alongside primeFlags().
 * Safe to call multiple times — subsequent calls are no-ops if cache is fresh.
 */
export async function primeCalibrationConstants(): Promise<void> {
  await loadSnapshot();
}

// ── Test seam ───────────────────────────────────────────────────────────────

/**
 * Return the provenance breakdown of the current in-memory snapshot.
 * Synchronous — uses whatever snapshot is currently loaded (may be stale by up to 30 min).
 * Returns null if the snapshot has not been loaded yet (pre-prime call).
 *
 * Used by the audit pipeline to populate HybridResult.uncalibratedConstantCount
 * without making an async DB call on the hot audit path.
 */
export function getSnapshotProvenanceSummary(): {
  uncalibratedCount: number;
  totalCount: number;
  uncalibratedKeys: string[];
  provenanceCounts: Record<CalibrationProvenance, number>;
} | null {
  if (!snapshot) return null;
  const counts: Record<CalibrationProvenance, number> = {
    regression:               0,
    grid_search:              0,
    manual_seed:              0,
    uncalibrated_placeholder: 0,
  };
  const uncalibratedKeys: string[] = [];
  for (const [key, row] of snapshot.entries()) {
    counts[row.provenance] = (counts[row.provenance] ?? 0) + 1;
    if (row.provenance === 'uncalibrated_placeholder') uncalibratedKeys.push(key);
  }
  return {
    uncalibratedCount: counts.uncalibrated_placeholder,
    totalCount:        snapshot.size,
    uncalibratedKeys,
    provenanceCounts:  counts,
  };
}

/**
 * Test-only: inject a snapshot. Production code never calls this.
 */
export function __setSnapshotForTesting(rows: ConstantRow[]): void {
  const map = new Map<string, ConstantRow>();
  for (const r of rows) map.set(r.key, r);
  snapshot = map;
  snapshotLoadedAt = Date.now();
}

/**
 * Test-only: clear the snapshot.
 */
export function __resetSnapshotForTesting(): void {
  snapshot = null;
  snapshotLoadedAt = 0;
  refreshInFlight = null;
}
