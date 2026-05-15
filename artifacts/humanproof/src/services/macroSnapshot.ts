// macroSnapshot.ts — WS5
//
// Cycle-breaker for Audit Issue #3 (cohort classifier ↔ macroRecessionAgent
// circular dependency). The legacy pipeline:
//
//   cohortClassifier reads `macroRecessionSignal` as input.
//   `macroRecessionSignal` comes from macroRecessionAgent (Layer 26).
//   Layer 26 runs AFTER cohort classification (which sets weights for
//                                                Layer 1, then 2, ...).
//   ⇒ cohort classifier is reading a value that does not yet exist when
//     it is called. In practice the engine passes 0 there, which causes
//     the WAVE cohort to be systematically under-detected.
//
// The fix moves the shared signal source to this module. macroSnapshot
// fetches the macro indicator OUTSIDE the agent system (directly from
// blsMacroService) and caches it for 4 hours. Both the cohort classifier
// (at Stage E) and macroRecessionAgent (at Layer 26 inside the swarm)
// read from this snapshot. macroRecessionAgent then DERIVES its richer
// reasoning from the snapshot but never produces a value the classifier
// depends on — the cycle is structurally broken.
//
// Cache TTL:
//   * 4 hours in-memory (audit cadence dwarfs BLS release frequency)
//   * Cold start uses a "stale-but-defined" sentinel rather than a
//     synchronous network call, so the audit pipeline never blocks on
//     macro data fetch during a request.

import { evaluateFlagSync } from '../config/featureFlags';

// ── Public types ────────────────────────────────────────────────────────────

export interface MacroSnapshot {
  /** Composite recession signal in [0, 1]. Higher = stronger recession indication. */
  recessionSignal: number;
  /** Underlying inputs (transparency / drilldown). */
  components: {
    unemploymentTrend: number;        // [-1, 1]: positive = unemployment rising
    jolts_openings_to_hires: number;  // 0+ — lower = labor market loosening
    leading_index_yoy: number;        // %, negative = leading indicators contracting
    consumer_sentiment_z: number;     // z-score vs 5y baseline
  };
  /** ISO timestamp of when these values were calculated. */
  observedAt: string;
  /** Whether this is fresh (< 12h), degraded (12-48h), or stale (>48h). */
  freshness: 'fresh' | 'degraded' | 'stale';
  /** Source label for UI / provenance. */
  source: 'bls_macro_service' | 'stale_seed' | 'bootstrap';
}

// ── Stale-seed bootstrap value ──────────────────────────────────────────────
//
// Used on cold start before the first successful fetch lands. Calibrated
// against the May 2026 macro baseline — slightly elevated but not
// recessionary. This is the "neutral safe default" the cohort classifier
// will receive at startup. Once the real fetch completes, this is
// replaced; subsequent reads see the live value.

const BOOTSTRAP_SNAPSHOT: MacroSnapshot = {
  recessionSignal: 0.35,
  components: {
    unemploymentTrend: 0.10,
    jolts_openings_to_hires: 1.15,
    leading_index_yoy: -0.40,
    consumer_sentiment_z: -0.20,
  },
  observedAt: '2026-05-14T00:00:00Z',
  freshness: 'stale',
  source: 'bootstrap',
};

// ── Cache ───────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 4 * 60 * 60 * 1000;  // 4 hours

let cached: MacroSnapshot = BOOTSTRAP_SNAPSHOT;
let cachedAt = 0;
let refreshInflight: Promise<MacroSnapshot> | null = null;

// ── Freshness classifier ────────────────────────────────────────────────────

function classifyFreshness(observedAt: string): 'fresh' | 'degraded' | 'stale' {
  const ageMs = Date.now() - Date.parse(observedAt);
  if (!Number.isFinite(ageMs) || ageMs < 0) return 'stale';
  if (ageMs < 12 * 3600 * 1000) return 'fresh';
  if (ageMs < 48 * 3600 * 1000) return 'degraded';
  return 'stale';
}

// ── Real fetch ──────────────────────────────────────────────────────────────

/**
 * Pull the latest macro snapshot from blsMacroService. Wrapped here so
 * the cohort classifier never imports blsMacroService directly (which
 * would re-import macroRecessionAgent through the existing dep graph).
 *
 * Failure mode: returns the previously-cached value (or BOOTSTRAP_SNAPSHOT
 * on first failure). NEVER throws — macro data is non-blocking.
 */
async function fetchSnapshotFromBLS(): Promise<MacroSnapshot> {
  try {
    const mod = await import('./blsMacroService');
    if (typeof mod.fetchLiveMacroSnapshot !== 'function') {
      return { ...cached, freshness: classifyFreshness(cached.observedAt), source: 'stale_seed' };
    }
    const live = await mod.fetchLiveMacroSnapshot();
    if (!live) return { ...cached, freshness: classifyFreshness(cached.observedAt), source: 'stale_seed' };

    // Normalize the live snapshot shape. blsMacroService's return shape
    // may evolve; defensively pick fields with fallbacks.
    const liveAny = live as unknown as {
      recessionSignal?: number;
      components?: Partial<MacroSnapshot['components']>;
      observedAt?: string;
    };

    const snapshot: MacroSnapshot = {
      recessionSignal: typeof liveAny.recessionSignal === 'number' ? liveAny.recessionSignal : cached.recessionSignal,
      components: {
        unemploymentTrend:
          typeof liveAny.components?.unemploymentTrend === 'number'
            ? liveAny.components.unemploymentTrend
            : cached.components.unemploymentTrend,
        jolts_openings_to_hires:
          typeof liveAny.components?.jolts_openings_to_hires === 'number'
            ? liveAny.components.jolts_openings_to_hires
            : cached.components.jolts_openings_to_hires,
        leading_index_yoy:
          typeof liveAny.components?.leading_index_yoy === 'number'
            ? liveAny.components.leading_index_yoy
            : cached.components.leading_index_yoy,
        consumer_sentiment_z:
          typeof liveAny.components?.consumer_sentiment_z === 'number'
            ? liveAny.components.consumer_sentiment_z
            : cached.components.consumer_sentiment_z,
      },
      observedAt: liveAny.observedAt ?? new Date().toISOString(),
      freshness: classifyFreshness(liveAny.observedAt ?? new Date().toISOString()),
      source: 'bls_macro_service',
    };
    return snapshot;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[macroSnapshot] fetch failed, holding cached value:', err);
    return { ...cached, freshness: classifyFreshness(cached.observedAt), source: 'stale_seed' };
  }
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Trigger a non-blocking background refresh if the cache is older than
 * the TTL. Returns immediately. Call this near the start of the audit
 * pipeline so the next audit reads a current snapshot.
 */
export function maybeRefreshMacroSnapshot(): void {
  if (refreshInflight) return;
  const stale = Date.now() - cachedAt > CACHE_TTL_MS;
  if (!stale && cached.source !== 'bootstrap') return;

  refreshInflight = fetchSnapshotFromBLS()
    .then((snap) => {
      cached = snap;
      cachedAt = Date.now();
      return snap;
    })
    .finally(() => {
      refreshInflight = null;
    });
}

/**
 * Synchronous read of the current snapshot. Always returns a value —
 * the bootstrap snapshot is the floor. Hot path: called by
 * cohortClassifier (at Stage E) AND by macroRecessionAgent (at Layer
 * 26) so both consume the same value and the cycle is broken.
 */
export function readMacroSnapshot(): MacroSnapshot {
  // Touch the refresh side-effect lazily so callers don't need to
  // remember. The first audit pays nothing (sees bootstrap); subsequent
  // audits see the live value as soon as the background fetch lands.
  maybeRefreshMacroSnapshot();
  return cached;
}

/**
 * Async variant — awaits any in-flight refresh, then returns. Used by
 * the recalibrate-engine cron job where staleness directly affects
 * coefficient quality.
 */
export async function readMacroSnapshotFresh(): Promise<MacroSnapshot> {
  if (refreshInflight) await refreshInflight;
  if (Date.now() - cachedAt > CACHE_TTL_MS || cached.source === 'bootstrap') {
    cached = await fetchSnapshotFromBLS();
    cachedAt = Date.now();
  }
  return cached;
}

/**
 * Read the scalar signal the cohort classifier wants. Equivalent to
 * `readMacroSnapshot().recessionSignal` but documented as the single
 * recommended call site for the classifier.
 *
 * Gated by ws5_source_independent_swarm — when off, callers should
 * continue to pass 0 (legacy behaviour) to preserve scoring continuity
 * until the WS5 flip ships.
 */
export function getMacroRecessionSignalForCohortClassifier(): number {
  const flag = evaluateFlagSync('ws5_source_independent_swarm');
  if (!flag.isActive && !flag.isShadow) return 0;
  return readMacroSnapshot().recessionSignal;
}

/** Test-only reset hook. */
export function __resetMacroSnapshotForTesting(): void {
  cached = BOOTSTRAP_SNAPSHOT;
  cachedAt = 0;
  refreshInflight = null;
}
