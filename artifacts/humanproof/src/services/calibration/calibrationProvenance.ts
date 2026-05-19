// calibrationProvenance.ts
//
// Queries v_uncalibrated_constants and exposes:
//   - getProvenanceSummary()     — async, reads from DB view
//   - getProvenanceSummarySync() — sync, returns last cached result (for renders)
//   - formatWithProvenance()     — adds "(estimate)" suffix when a constant is uncalibrated
//
// DESIGN INTENT
// ─────────────
// Every number the UI displays that was computed using an uncalibrated_placeholder
// constant must carry an "(estimate)" qualifier. This prevents a 0.52 appearing
// alongside a 0.80 regression-derived value as if both have equal epistemic status.
//
// The UI distinction:
//   regression / grid_search → display value as-is (it has a validation audit trail)
//   manual_seed              → display value as-is (expert estimate, documented)
//   uncalibrated_placeholder → append "(estimate)" suffix; never show as a measurement
//
// The v_uncalibrated_constants view count is surfaced in TransparencyTab so users
// can see exactly how many active constants are provisional.

import { supabase } from '../../utils/supabase';
import type { CalibrationProvenance } from './calibrationConstants';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ProvenanceSummary {
  uncalibratedCount: number;
  regressionCount:   number;
  gridSearchCount:   number;
  manualSeedCount:   number;
  totalCount:        number;
  /** Fraction of constants that are regression-derived (0–100) */
  regressionCoveragePct: number;
  /** Keys of all uncalibrated_placeholder constants */
  uncalibratedKeys:  string[];
  fetchedAt: string;
}

// ── Cache ─────────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 10 * 60_000; // 10 min — view is cheap; refresh is non-urgent

let _cached: ProvenanceSummary | null = null;
let _cachedAt = 0;
let _inFlight: Promise<ProvenanceSummary | null> | null = null;

// ── DB fetch ──────────────────────────────────────────────────────────────────

async function fetchFromView(): Promise<ProvenanceSummary | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('v_uncalibrated_constants')
      .select('*')
      .maybeSingle();

    if (error || !data) return null;

    return {
      uncalibratedCount:    Number(data.uncalibrated_count  ?? 0),
      regressionCount:      Number(data.regression_count    ?? 0),
      gridSearchCount:      Number(data.grid_search_count   ?? 0),
      manualSeedCount:      Number(data.manual_seed_count   ?? 0),
      totalCount:           Number(data.total_count         ?? 0),
      regressionCoveragePct: Number(data.regression_coverage_pct ?? 0),
      uncalibratedKeys:     (data.uncalibrated_keys as string[] | null) ?? [],
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Async: return the provenance summary, using cache when fresh.
 * Safe to call on every TransparencyTab render — the DB query runs at most
 * once per 10-minute window.
 */
export async function getProvenanceSummary(): Promise<ProvenanceSummary | null> {
  if (_cached && Date.now() - _cachedAt < CACHE_TTL_MS) return _cached;
  if (_inFlight) return _inFlight;

  _inFlight = fetchFromView().then((result) => {
    if (result) {
      _cached = result;
      _cachedAt = Date.now();
    }
    _inFlight = null;
    return result;
  });
  return _inFlight;
}

/**
 * Sync: return the last cached summary, or null if not yet loaded.
 * Used inside render functions where async is not available.
 */
export function getProvenanceSummarySync(): ProvenanceSummary | null {
  return _cached;
}

/**
 * Derive a provenance summary directly from the in-memory snapshot in
 * calibrationConstants.ts. Used as a fallback when the DB view is unavailable.
 *
 * Pass the snapshot as an array of { key, provenance } rows. This avoids
 * coupling this module to the internals of calibrationConstants.ts.
 */
export function summarizeSnapshotProvenance(
  rows: Array<{ key: string; provenance: CalibrationProvenance }>,
): ProvenanceSummary {
  const uncalibrated = rows.filter(r => r.provenance === 'uncalibrated_placeholder');
  const regression   = rows.filter(r => r.provenance === 'regression');
  const gridSearch   = rows.filter(r => r.provenance === 'grid_search');
  const manualSeed   = rows.filter(r => r.provenance === 'manual_seed');
  const total = rows.length;

  return {
    uncalibratedCount:    uncalibrated.length,
    regressionCount:      regression.length,
    gridSearchCount:      gridSearch.length,
    manualSeedCount:      manualSeed.length,
    totalCount:           total,
    regressionCoveragePct: total > 0
      ? Math.round((regression.length / total) * 1000) / 10
      : 0,
    uncalibratedKeys: uncalibrated.map(r => r.key),
    fetchedAt: new Date().toISOString(),
  };
}

// ── Formatting helpers ────────────────────────────────────────────────────────

/**
 * Returns true when a provenance value means the constant has NOT been
 * validated through regression or grid search.
 *
 * The contract:
 *   - regression + grid_search: display as measurement
 *   - manual_seed: display as-is (expert estimate, documented)
 *   - uncalibrated_placeholder: display with "(estimate)" qualifier
 */
export function isUncalibratedProvenance(provenance: CalibrationProvenance | undefined): boolean {
  return provenance === 'uncalibrated_placeholder';
}

/**
 * Format a numeric value for display, appending "(estimate)" when the
 * constant has uncalibrated_placeholder provenance.
 *
 * @param value     The numeric value to format
 * @param provenance The provenance of the constant that produced this value
 * @param decimals  Number of decimal places (default 2)
 */
export function formatWithProvenance(
  value: number,
  provenance: CalibrationProvenance | undefined,
  decimals = 2,
): string {
  const formatted = value.toFixed(decimals);
  return isUncalibratedProvenance(provenance)
    ? `${formatted} (estimate)`
    : formatted;
}

/**
 * Return a short label describing the provenance for tooltip / badge use.
 */
export function provenanceLabel(provenance: CalibrationProvenance | undefined): string {
  switch (provenance) {
    case 'regression':              return 'Regression-derived';
    case 'grid_search':             return 'Grid-search optimized';
    case 'manual_seed':             return 'Expert estimate';
    case 'uncalibrated_placeholder':return 'Estimate — not yet validated';
    default:                        return 'Unknown provenance';
  }
}

/**
 * Return the Tailwind color class for a provenance badge.
 */
export function provenanceColor(provenance: CalibrationProvenance | undefined): string {
  switch (provenance) {
    case 'regression':              return 'text-emerald-400';
    case 'grid_search':             return 'text-sky-400';
    case 'manual_seed':             return 'text-violet-400';
    case 'uncalibrated_placeholder':return 'text-amber-400';
    default:                        return 'text-slate-400';
  }
}
