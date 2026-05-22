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
  type L1ThresholdPoint,
} from './empiricalCalibration';
import {
  classifyRegionForSegment,
  classifyIndustryForSegment,
  classifySizeForSegment,
  buildSegmentFallbackChain,
  segmentKeyToLabel,
  MIN_SEGMENT_OUTCOMES,
} from './calibration/calibrationSegments';
import {
  lookupCalibrationWithRegion,
  classifyCompanySize,
  classifyIndustry as segClassifyIndustry,
  classifyRegion as segClassifyRegion,
} from './segmentedCalibrationEngine';

// ── Types ───────────────────────────────────────────────────────────────────

export type CohortScope =
  | 'GLOBAL'
  | 'INDIA_IT'
  | 'US_BIG_TECH'
  | 'EU_FINANCE'
  | 'STARTUP_LATE_STAGE';

export interface CalibrationBundle {
  /** Where these values came from — "bootstrap" | "segment-bootstrap:<key>" | "db:<version>". */
  source: string;
  /** The CohortScope that resolved (after the cohort fallback chain). */
  scope: CohortScope;
  /** L1–L5 multipliers applied AFTER raw layer scoring, BEFORE composite. */
  layerCalibration: LayerCalibration;
  /** D8 logistic regression coefficients. */
  d8: D8LogisticCoefficients;
  /**
   * Piecewise-linear threshold tables with per-point provenance labels.
   * When source is 'db:*' and fallbackLevel is 'segment_db', these values
   * came from a segment regression (≥80 outcomes) and override bootstrap.
   */
  revenueGrowthThresholds: L1ThresholdPoint[];
  stockTrendThresholds: L1ThresholdPoint[];
  fcfMarginThresholds: Array<[number, number]>;
  /** Provenance for UI / transparency. */
  auc: { distress: number | null; efficiency: number | null; wave: number | null; combined: number | null };
  coverage: { at90: number | null; at80: number | null; at50: number | null };
  nEvents: number;
  /** ISO timestamp when this bundle was loaded. */
  loadedAt: string;
  // ── Segment fields (set when segment resolution ran) ──────────────────────
  /**
   * Applied segment key (e.g. "INDIA__TECH__LARGE"). Present when a segment
   * bundle resolved from either the DB or the in-memory bootstrap matrix.
   * Absent when segment resolution was skipped or all segments missed.
   */
  segmentKey?: string;
  /** Human-readable label for Transparency Tab display. */
  segmentLabel?: string;
  /**
   * Which level of the resolution hierarchy supplied the multipliers:
   *   segment_db        — DB row with n_events_total >= 80
   *   segment_bootstrap — In-memory SEGMENT_CALIBRATIONS research values
   *   cohort_db         — Legacy CohortScope row (INDIA_IT, US_BIG_TECH, …)
   *   global_bootstrap  — Hardcoded global bootstrap values
   */
  fallbackLevel: 'segment_db' | 'segment_bootstrap' | 'cohort_db' | 'global_bootstrap';
}

export interface ScopeResolutionHint {
  region?: string;        // 'IN', 'US', 'EU', etc.
  industry?: string;      // 'IT Services', 'Banking', ...
  /** Employee count — used for size-segment classification (SMALL/MEDIUM/LARGE). */
  headcount?: number | null;
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
    revenueGrowthThresholds: [...BOOTSTRAP_REVENUE],
    stockTrendThresholds: [...BOOTSTRAP_STOCK],
    fcfMarginThresholds: BOOTSTRAP_FCF.map((p) => [p[0], p[1]] as [number, number]),
    auc: { distress: 0.96, efficiency: 0.76, wave: 0.72, combined: 0.81 },
    coverage: { at90: null, at80: null, at50: null },
    nEvents: 200,
    loadedAt: new Date().toISOString(),
    fallbackLevel: 'global_bootstrap',
  };
}

/**
 * Build a segment-specific bootstrap bundle from the in-memory
 * SEGMENT_CALIBRATIONS research matrix. Used when the DB has no segment row
 * with ≥ MIN_SEGMENT_OUTCOMES outcomes — the research-grounded multipliers
 * are still better than the global bootstrap for India IT, healthcare, etc.
 */
function segmentBootstrapBundle(
  segmentKey: string,
  region: string | undefined,
  industry: string | undefined,
  headcount: number | null | undefined,
): CalibrationBundle {
  const companySize = classifyCompanySize(headcount ?? null);
  const industrySegment = segClassifyIndustry(industry ?? 'tech');
  const regionSegment = segClassifyRegion(region ?? 'US');
  const calib = lookupCalibrationWithRegion(companySize, industrySegment, regionSegment);

  return {
    source: `segment-bootstrap:${segmentKey}`,
    scope: 'GLOBAL',
    layerCalibration: {
      L1: BOOTSTRAP_LAYER_CALIBRATION.L1 * calib.l1,
      L2: BOOTSTRAP_LAYER_CALIBRATION.L2 * calib.l2,
      L3: BOOTSTRAP_LAYER_CALIBRATION.L3 * calib.l3,
      L4: BOOTSTRAP_LAYER_CALIBRATION.L4 * calib.l4,
      L5: BOOTSTRAP_LAYER_CALIBRATION.L5 * calib.l5,
    },
    d8: { ...BOOTSTRAP_D8 },
    revenueGrowthThresholds: [...BOOTSTRAP_REVENUE],
    stockTrendThresholds: [...BOOTSTRAP_STOCK],
    fcfMarginThresholds: BOOTSTRAP_FCF.map((p) => [p[0], p[1]] as [number, number]),
    auc: { distress: calib.auc, efficiency: null, wave: null, combined: calib.auc },
    coverage: { at90: null, at80: null, at50: null },
    nEvents: 0, // bootstrap has no DB-verified event count
    loadedAt: new Date().toISOString(),
    segmentKey,
    segmentLabel: segmentKeyToLabel(segmentKey),
    fallbackLevel: 'segment_bootstrap',
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
// Separate cache keyed by segment_key string (different namespace from CohortScope)
const segmentCache: Map<string, CacheEntry> = new Map();
const segmentInflight: Map<string, Promise<CalibrationBundle | null>> = new Map();
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
  segment_key: string | null;
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
  // Parse revenue/stock JSONB into L1ThresholdPoint[].
  // Handles two JSONB shapes:
  //   legacy array format: [[threshold, risk], ...]
  //   object format:       [{ threshold, risk, provenance? }, ...]
  // When provenance is absent (legacy), defaults to 'regression_derived' since
  // any value written by the recalibrate-engine cron came from regression.
  const parseL1Thresholds = (raw: unknown): L1ThresholdPoint[] => {
    if (!Array.isArray(raw)) return [];
    return raw
      .map((p): L1ThresholdPoint | null => {
        if (Array.isArray(p) && typeof p[0] === 'number' && typeof p[1] === 'number') {
          return { threshold: p[0], risk: p[1], provenance: 'regression_derived' };
        }
        if (p && typeof p === 'object') {
          const o = p as { threshold?: unknown; risk?: unknown; provenance?: unknown };
          if (typeof o.threshold === 'number' && typeof o.risk === 'number') {
            const prov = o.provenance === 'manual_seed' ? 'manual_seed' : 'regression_derived';
            return { threshold: o.threshold, risk: o.risk, provenance: prov };
          }
        }
        return null;
      })
      .filter((p): p is L1ThresholdPoint => p !== null);
  };

  // FCF remains as [number, number][] — no provenance needed (not user-visible).
  const parseFCFThresholds = (raw: unknown): Array<[number, number]> => {
    if (!Array.isArray(raw)) return [];
    return raw
      .map((p) => {
        if (Array.isArray(p) && typeof p[0] === 'number' && typeof p[1] === 'number') return [p[0], p[1]] as [number, number];
        if (p && typeof p === 'object') {
          const o = p as { threshold?: unknown; risk?: unknown };
          if (typeof o.threshold === 'number' && typeof o.risk === 'number') return [o.threshold, o.risk] as [number, number];
        }
        return null;
      })
      .filter((p): p is [number, number] => p !== null);
  };

  const isSegmentRow = !!row.segment_key;
  return {
    source: `db:${row.version}`,
    scope: isSegmentRow ? 'GLOBAL' : (row.cohort_scope as CohortScope),
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
    revenueGrowthThresholds: parseL1Thresholds(row.revenue_growth_thresholds),
    stockTrendThresholds: parseL1Thresholds(row.stock_trend_thresholds),
    fcfMarginThresholds: parseFCFThresholds(row.fcf_margin_thresholds),
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
    ...(isSegmentRow ? {
      segmentKey: row.segment_key!,
      segmentLabel: segmentKeyToLabel(row.segment_key!),
      fallbackLevel: 'segment_db' as const,
    } : {
      fallbackLevel: 'cohort_db' as const,
    }),
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

/**
 * Fetch a segment-specific calibration row.
 * Only returns a bundle when:
 *   (a) a DB row exists for this segment_key with status='active', AND
 *   (b) n_events_total >= MIN_SEGMENT_OUTCOMES (80).
 * Returns null when either condition fails — caller falls to next in chain.
 */
async function fetchActiveForSegmentKey(segmentKey: string): Promise<CalibrationBundle | null> {
  const { data, error } = await supabase
    .from('engine_calibration_versions')
    .select(
      'version,cohort_scope,segment_key,l1_multiplier,l2_multiplier,l3_multiplier,l4_multiplier,l5_multiplier,' +
        'd8_beta0,d8_beta_l1,d8_beta_l2,d8_beta_ai_signal,d8_beta_layoff_rounds,' +
        'revenue_growth_thresholds,stock_trend_thresholds,fcf_margin_thresholds,' +
        'auc_distress,auc_efficiency,auc_wave,auc_combined,' +
        'coverage_at_90,coverage_at_80,coverage_at_50,n_events_total',
    )
    .eq('segment_key', segmentKey)
    .eq('status', 'active')
    .gte('n_events_total', MIN_SEGMENT_OUTCOMES)  // 80-outcome minimum
    .maybeSingle();
  if (error) {
    emitBootstrapWarning(`segment fetch failed for ${segmentKey}: ${error.message}`);
    return null;
  }
  if (!data) return null;
  return rowToBundle(data as unknown as CalibrationVersionRow);
}

async function loadSegmentWithCache(
  segmentKey: string,
  region: string | undefined,
  industry: string | undefined,
  headcount: number | null | undefined,
): Promise<CalibrationBundle | null> {
  const now = Date.now();
  const cached = segmentCache.get(segmentKey);
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    // Return cached; null means "no DB row" — caller uses bootstrap
    return cached.bundle.source === 'segment-miss' ? null : cached.bundle;
  }
  const existing = segmentInflight.get(segmentKey);
  if (existing) return existing;

  const p = fetchActiveForSegmentKey(segmentKey)
    .then((bundle) => {
      if (bundle) {
        segmentCache.set(segmentKey, { bundle, fetchedAt: Date.now() });
        return bundle;
      }
      // Cache the miss so we don't hit the DB again within the TTL.
      // Store a sentinel so we can distinguish "miss cached" from "not cached".
      const miss = { ...bootstrapBundle('GLOBAL'), source: 'segment-miss' };
      segmentCache.set(segmentKey, { bundle: miss, fetchedAt: Date.now() });
      return null;
    })
    .finally(() => { segmentInflight.delete(segmentKey); });
  segmentInflight.set(segmentKey, p);
  return p;
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
/**
 * Build a segment-bootstrap bundle from the in-memory SEGMENT_CALIBRATIONS
 * matrix if the segment has a non-default entry. Returns null when the
 * segment falls through to the _DEFAULT entry (which is identical to global
 * bootstrap — not worth returning as "segment-specific").
 */
function buildInMemorySegmentBundle(
  segmentKey: string,
  region: string | undefined,
  industry: string | undefined,
  headcount: number | null | undefined,
): CalibrationBundle | null {
  try {
    const companySize = classifyCompanySize(headcount ?? null);
    const industrySegment = segClassifyIndustry(industry ?? 'other');
    const regionSegment = segClassifyRegion(region ?? 'US');
    const calib = lookupCalibrationWithRegion(companySize, industrySegment, regionSegment);
    // lookupCalibrationWithRegion returns _DEFAULT when no specific entry exists.
    // _DEFAULT has all multipliers = 1.0 which is identical to global bootstrap.
    // Skip it so we don't waste a "segment_bootstrap" label on the default.
    const isDefault = calib.l1 === 1.0 && calib.l2 === 1.0 && calib.l3 === 1.0 &&
                      calib.l4 === 1.0 && calib.l5 === 1.0;
    if (isDefault) return null;
    return segmentBootstrapBundle(segmentKey, region, industry, headcount);
  } catch {
    return null;
  }
}

export async function loadCalibration(hint?: ScopeResolutionHint): Promise<CalibrationBundle> {
  const flag = evaluateFlagSync('ws2_outcome_calibration');
  if (!flag.isActive && !flag.isShadow) {
    return bootstrapBundle('GLOBAL');
  }

  // ── Tier 1: Segment resolution (region × industry × size) ─────────────────
  // Try the most-specific segment first. For each key in the fallback chain:
  //   (a) DB row with n_events >= 80 → segment_db bundle (highest quality)
  //   (b) In-memory SEGMENT_CALIBRATIONS hit → segment_bootstrap bundle
  // If the entire segment chain misses, fall through to CohortScope (Tier 2).
  if (hint) {
    const segRegion   = classifyRegionForSegment(hint.region);
    const segIndustry = classifyIndustryForSegment(hint.industry);
    const segSize     = classifySizeForSegment(hint.headcount);
    const segChain    = buildSegmentFallbackChain(segRegion, segIndustry, segSize);

    for (const segKey of segChain) {
      // (a) Try DB row with 80-outcome gate
      const dbBundle = await loadSegmentWithCache(segKey, hint.region, hint.industry, hint.headcount);
      if (dbBundle) return dbBundle;

      // (b) Try in-memory research bootstrap for this specific segment key
      // Only do this for the most-specific key (first in chain) — otherwise
      // a partial match (region only) would mask a complete CohortScope match.
      if (segKey === segChain[0]) {
        const inMemory = buildInMemorySegmentBundle(
          segKey, hint.region, hint.industry, hint.headcount,
        );
        if (inMemory) return inMemory;
      }
    }
  }

  // ── Tier 2: Legacy CohortScope resolution ─────────────────────────────────
  const scopes = resolveScopes(hint);
  for (const scope of scopes) {
    const bundle = await loadScopeWithCache(scope);
    if (bundle.source !== 'bootstrap') return bundle;
  }

  // ── Tier 3: Global bootstrap ───────────────────────────────────────────────
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
  // Tier 1: check segment cache (populated by a prior async loadCalibration call)
  if (hint) {
    const segRegion   = classifyRegionForSegment(hint.region);
    const segIndustry = classifyIndustryForSegment(hint.industry);
    const segSize     = classifySizeForSegment(hint.headcount);
    const segChain    = buildSegmentFallbackChain(segRegion, segIndustry, segSize);
    for (const segKey of segChain) {
      const cached = segmentCache.get(segKey);
      if (cached && cached.bundle.source !== 'segment-miss' && cached.bundle.source !== 'bootstrap') {
        return cached.bundle;
      }
    }
    // Try in-memory bootstrap for the most-specific segment
    if (segChain.length > 0) {
      const inMemory = buildInMemorySegmentBundle(segChain[0], hint.region, hint.industry, hint.headcount);
      if (inMemory) return inMemory;
    }
  }
  // Tier 2: legacy cohort cache
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
  // BUG-08: Promise.allSettled — a failed INDIA_IT scope load must not abort GLOBAL scope.
  // Each scope that fails simply won't be cached; the on-demand lazy loader handles it later.
  await Promise.allSettled(scopes.map((s) => loadScopeWithCache(s)));
}

/**
 * Test-only: clear the cache + bootstrap warning state.
 */
export function __resetForTesting(): void {
  cache.clear();
  inflight.clear();
  segmentCache.clear();
  segmentInflight.clear();
  bootstrapWarningEmitted = false;
}
