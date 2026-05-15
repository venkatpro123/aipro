// calibrationLoader.ts — WS2
//
// DB-backed loader for engine calibration coefficients. Replaces the hardcoded
// constants in empiricalCalibration.ts with values pulled from
// engine_calibration_versions at startup (cached 30min).
//
// Design contract:
//   * Bootstrap-safe: when the flag ws2_outcome_calibration is off, the
//     loader returns the existing hardcoded constants from
//     empiricalCalibration.ts as a permanent baseline. The audit pipeline
//     calls these the "bootstrap" values.
//   * Read-once + cache: the active calibration for a scope is fetched
//     lazily on the first call within a 30-minute window. Subsequent
//     reads hit the in-memory cache.
//   * Scope resolution: the audit pipeline passes a hint about the company
//     ("region=IN", "industry=IT_SERVICES"). The loader walks from
//     most-specific to GLOBAL and returns the first active row.
//   * Failure mode: any DB error falls through to bootstrap. The flag is
//     not the only safety net — even with the flag on, a cold DB or a
//     missing row results in bootstrap values (logged once).
//
// What this loader does NOT do:
//   * It does NOT write coefficients (that is the WS8 recalibrate-engine
//     cron job).
//   * It does NOT compute scoring (it just returns coefficient bundles
//     that empiricalCalibration.ts uses).
//   * It does NOT enforce "active row exists" — bootstrap is the
//     permanent fallback.

import { supabase } from '../utils/supabase';
import { evaluateFlagSync } from '../config/featureFlags';
import {
  LAYER_CALIBRATION as BOOTSTRAP_LAYER_CALIBRATION,
  D8_LOGISTIC_COEFFICIENTS as BOOTSTRAP_D8,
  CALIBRATED_REVENUE_THRESHOLDS as BOOTSTRAP_REVENUE,
  CALIBRATED_STOCK_THRESHOLDS as BOOTSTRAP_STOCK,
  CALIBRATED_FCF_THRESHOLDS as BOOTSTRAP_FCF,
  type LayerCalibration,
  type D8LogisticCoefficients,
} from './empiricalCalibration';

// ── Types ───────────────────────────────────────────────────────────────────

export type CohortScope =
  | 'GLOBAL'
  | 'INDIA_IT'
  | 'US_BIG_TECH'
  | 'EU_FINANCE'
  | 'STARTUP_LATE_STAGE';

export interface CalibrationBundle {
  /** Where these values came from — "bootstrap" or "db:<version>". */
  source: string;
  /** The scope that resolved (after fallback chain). */
  scope: CohortScope;
  /** L1–L5 multipliers applied AFTER raw layer scoring, BEFORE composite. */
  layerCalibration: LayerCalibration;
  /** D8 logistic regression coefficients. */
  d8: D8LogisticCoefficients;
  /** Piecewise-linear threshold tables. Same shape as bootstrap arrays. */
  revenueGrowthThresholds: Array<[number, number]>;
  stockTrendThresholds: Array<[number, number]>;
  fcfMarginThresholds: Array<[number, number]>;
  /** Provenance for UI / transparency. */
  auc: { distress: number | null; efficiency: number | null; wave: number | null; combined: number | null };
  coverage: { at90: number | null; at80: number | null; at50: number | null };
  nEvents: number;
  /** ISO timestamp when this bundle was loaded. */
  loadedAt: string;
}

export interface ScopeResolutionHint {
  region?: string;        // 'IN', 'US', 'EU', etc.
  industry?: string;      // 'IT Services', 'Banking', ...
  isPublic?: boolean;
  fundingStage?: 'pre_seed' | 'seed' | 'series_a' | 'series_b' | 'series_c' | 'series_d_plus' | 'public' | null;
}

// ── Bootstrap bundle ────────────────────────────────────────────────────────

function bootstrapBundle(scope: CohortScope = 'GLOBAL'): CalibrationBundle {
  return {
    source: 'bootstrap',
    scope,
    layerCalibration: { ...BOOTSTRAP_LAYER_CALIBRATION },
    d8: { ...BOOTSTRAP_D8 },
    revenueGrowthThresholds: BOOTSTRAP_REVENUE.map((p) => [p[0], p[1]] as [number, number]),
    stockTrendThresholds: BOOTSTRAP_STOCK.map((p) => [p[0], p[1]] as [number, number]),
    fcfMarginThresholds: BOOTSTRAP_FCF.map((p) => [p[0], p[1]] as [number, number]),
    auc: { distress: 0.96, efficiency: 0.76, wave: 0.72, combined: 0.81 },
    coverage: { at90: null, at80: null, at50: null },
    nEvents: 200,
    loadedAt: new Date().toISOString(),
  };
}

// ── Scope resolution ────────────────────────────────────────────────────────

/**
 * Walk from most-specific to GLOBAL. Order matters: returning the first
 * scope that has an active row in engine_calibration_versions wins.
 *
 * Rationale:
 *   * INDIA_IT calibrated against Indian-domain outcomes only is more
 *     predictive for a TCS audit than GLOBAL calibrated against the
 *     layoffs.fyi US-heavy dataset.
 *   * US_BIG_TECH calibrated against the v17 Meta/Google/Amazon dataset
 *     captures D8 efficiency patterns that GLOBAL washes out.
 *   * STARTUP_LATE_STAGE addresses the L2-selection-bias gap for first-time
 *     layoff predictions (companies with layoffRounds=0).
 */
function resolveScopes(hint: ScopeResolutionHint | undefined): CohortScope[] {
  const scopes: CohortScope[] = [];
  if (!hint) return ['GLOBAL'];

  if (hint.region === 'IN' && (hint.industry ?? '').toLowerCase().includes('it')) {
    scopes.push('INDIA_IT');
  }
  if (hint.region === 'US' && (hint.industry ?? '').toLowerCase() === 'technology') {
    scopes.push('US_BIG_TECH');
  }
  if (hint.region === 'EU' && (hint.industry ?? '').toLowerCase().includes('financ')) {
    scopes.push('EU_FINANCE');
  }
  if (hint.fundingStage === 'series_c' || hint.fundingStage === 'series_d_plus') {
    scopes.push('STARTUP_LATE_STAGE');
  }
  scopes.push('GLOBAL');
  return scopes;
}

// ── Cache ───────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 30 * 60 * 1000;  // 30 minutes

interface CacheEntry {
  bundle: CalibrationBundle;
  fetchedAt: number;
}

const cache: Map<CohortScope, CacheEntry> = new Map();
const inflight: Map<CohortScope, Promise<CalibrationBundle>> = new Map();
let bootstrapWarningEmitted = false;

function emitBootstrapWarning(reason: string): void {
  if (bootstrapWarningEmitted) return;
  bootstrapWarningEmitted = true;
  // eslint-disable-next-line no-console
  console.warn('[calibrationLoader] using bootstrap values:', reason);
}

// ── DB fetch ────────────────────────────────────────────────────────────────

interface CalibrationVersionRow {
  version: string;
  cohort_scope: string;
  l1_multiplier: number;
  l2_multiplier: number;
  l3_multiplier: number;
  l4_multiplier: number;
  l5_multiplier: number;
  d8_beta0: number;
  d8_beta_l1: number;
  d8_beta_l2: number;
  d8_beta_ai_signal: number;
  d8_beta_layoff_rounds: number;
  revenue_growth_thresholds: unknown;
  stock_trend_thresholds: unknown;
  fcf_margin_thresholds: unknown;
  auc_distress: number | null;
  auc_efficiency: number | null;
  auc_wave: number | null;
  auc_combined: number | null;
  coverage_at_90: number | null;
  coverage_at_80: number | null;
  coverage_at_50: number | null;
  n_events_total: number;
}

function rowToBundle(row: CalibrationVersionRow): CalibrationBundle {
  const parseThresholds = (raw: unknown): Array<[number, number]> => {
    if (!Array.isArray(raw)) return [];
    return raw
      .map((p) => {
        if (Array.isArray(p) && typeof p[0] === 'number' && typeof p[1] === 'number') {
          return [p[0], p[1]] as [number, number];
        }
        if (p && typeof p === 'object') {
          const o = p as { threshold?: unknown; risk?: unknown };
          if (typeof o.threshold === 'number' && typeof o.risk === 'number') {
            return [o.threshold, o.risk] as [number, number];
          }
        }
        return null;
      })
      .filter((p): p is [number, number] => p !== null);
  };

  return {
    source: `db:${row.version}`,
    scope: row.cohort_scope as CohortScope,
    layerCalibration: {
      L1: row.l1_multiplier,
      L2: row.l2_multiplier,
      L3: row.l3_multiplier,
      L4: row.l4_multiplier,
      L5: row.l5_multiplier,
    },
    // The DB d8_beta_* columns are a forward-compatible placeholder for a
    // future regression-derived D8 coefficient set. The current
    // D8LogisticCoefficients shape (intercept, beta_ai_high, beta_ai_very_high,
    // beta_positive_fcf, beta_prior_rounds, beta_profitability, threshold)
    // is not yet mappable 1:1 from the DB schema, so we surface the existing
    // bootstrap D8 until a follow-up migration aligns the column names.
    d8: { ...BOOTSTRAP_D8 },
    revenueGrowthThresholds: parseThresholds(row.revenue_growth_thresholds),
    stockTrendThresholds: parseThresholds(row.stock_trend_thresholds),
    fcfMarginThresholds: parseThresholds(row.fcf_margin_thresholds),
    auc: {
      distress: row.auc_distress,
      efficiency: row.auc_efficiency,
      wave: row.auc_wave,
      combined: row.auc_combined,
    },
    coverage: {
      at90: row.coverage_at_90,
      at80: row.coverage_at_80,
      at50: row.coverage_at_50,
    },
    nEvents: row.n_events_total,
    loadedAt: new Date().toISOString(),
  };
}

async function fetchActiveForScope(scope: CohortScope): Promise<CalibrationBundle | null> {
  const { data, error } = await supabase
    .from('engine_calibration_versions')
    .select(
      'version,cohort_scope,l1_multiplier,l2_multiplier,l3_multiplier,l4_multiplier,l5_multiplier,' +
        'd8_beta0,d8_beta_l1,d8_beta_l2,d8_beta_ai_signal,d8_beta_layoff_rounds,' +
        'revenue_growth_thresholds,stock_trend_thresholds,fcf_margin_thresholds,' +
        'auc_distress,auc_efficiency,auc_wave,auc_combined,' +
        'coverage_at_90,coverage_at_80,coverage_at_50,n_events_total',
    )
    .eq('cohort_scope', scope)
    .eq('status', 'active')
    .maybeSingle();
  if (error) {
    emitBootstrapWarning(`fetch failed for ${scope}: ${error.message}`);
    return null;
  }
  if (!data) return null;
  return rowToBundle(data as unknown as CalibrationVersionRow);
}

async function loadScopeWithCache(scope: CohortScope): Promise<CalibrationBundle> {
  const now = Date.now();
  const cached = cache.get(scope);
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.bundle;
  }
  const existing = inflight.get(scope);
  if (existing) return existing;

  const p = fetchActiveForScope(scope)
    .then((bundle) => {
      const resolved = bundle ?? bootstrapBundle(scope);
      cache.set(scope, { bundle: resolved, fetchedAt: Date.now() });
      return resolved;
    })
    .finally(() => {
      inflight.delete(scope);
    });
  inflight.set(scope, p);
  return p;
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Returns the calibration bundle for the current audit. Resolves scopes
 * in priority order; returns the first scope with a DB-active row, or
 * bootstrap if none match.
 *
 * Gated by the ws2_outcome_calibration flag — when off, always returns
 * bootstrap values regardless of DB state.
 */
export async function loadCalibration(hint?: ScopeResolutionHint): Promise<CalibrationBundle> {
  const flag = evaluateFlagSync('ws2_outcome_calibration');
  if (!flag.isActive && !flag.isShadow) {
    return bootstrapBundle('GLOBAL');
  }

  const scopes = resolveScopes(hint);
  for (const scope of scopes) {
    const bundle = await loadScopeWithCache(scope);
    if (bundle.source !== 'bootstrap') {
      // Found a real DB-backed scope. Return it.
      return bundle;
    }
    // Bootstrap-for-this-scope means no active row exists — try the next
    // (less specific) scope. The final fallback is GLOBAL bootstrap.
  }
  return bootstrapBundle('GLOBAL');
}

/**
 * Synchronous lookup. Returns the cached bundle if available, otherwise
 * bootstrap. Used in hot paths where awaiting is not possible.
 */
export function loadCalibrationSync(hint?: ScopeResolutionHint): CalibrationBundle {
  const flag = evaluateFlagSync('ws2_outcome_calibration');
  if (!flag.isActive && !flag.isShadow) {
    return bootstrapBundle('GLOBAL');
  }
  const scopes = resolveScopes(hint);
  for (const scope of scopes) {
    const cached = cache.get(scope);
    if (cached && cached.bundle.source !== 'bootstrap') {
      return cached.bundle;
    }
  }
  return bootstrapBundle('GLOBAL');
}

/**
 * Prime the cache for the most-likely scopes at app startup. Optional —
 * the lazy loader will populate on demand if not called.
 */
export async function primeCalibrationCache(scopes: CohortScope[] = ['GLOBAL', 'INDIA_IT', 'US_BIG_TECH']): Promise<void> {
  await Promise.all(scopes.map((s) => loadScopeWithCache(s)));
}

/**
 * Test-only: clear the cache + bootstrap warning state.
 */
export function __resetForTesting(): void {
  cache.clear();
  inflight.clear();
  bootstrapWarningEmitted = false;
}
