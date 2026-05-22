// featureFlags.ts — WS0
//
// Client-side reader for engine_feature_flags. Used by the audit pipeline
// to decide which candidate engine paths run.
//
// Caching model:
//   * One in-memory snapshot per page load, refreshed every 60s.
//   * Snapshot is shared across all callers in the same session (singleton).
//   * On read while a refresh is in flight, the previous snapshot is served
//     (never blocks the audit pipeline).
//   * If the initial fetch fails, every flag returns its "safe default"
//     (mode='off'), so the legacy engine path runs end-to-end.
//
// Why not localStorage? Stale localStorage values would cause shadow-mode
// audits to silently revert to old behaviour after a flag was promoted.
// Server-of-truth + 60s polling is good enough for the audit cadence.
//
// Canary evaluation:
//   * canary_user_ids: explicit user UUID list — wins over canary_pct.
//   * canary_pct: hash(userId || flagKey) % 100 < canary_pct.
//     Deterministic per (user, flag) so a single user always sees the same
//     candidate behaviour for a given flag during a canary window.

// DEBT-3 — read flags via the repository so a future migration to a
// different config service (LaunchDarkly, Unleash, Statsig) is a one-file
// swap.
import { featureFlagsRepo } from '../infrastructure/repositories/featureFlagsRepository';
import { createLogger } from '../shared/logger';

const flagLog = createLogger({ service: 'feature-flags' });

// ── Types ────────────────────────────────────────────────────────────────────

export type FlagMode = 'off' | 'shadow' | 'canary' | 'production' | 'deprecated';

export interface FeatureFlagRow {
  flag_key: string;
  mode: FlagMode;
  canary_user_ids: string[];
  canary_pct: number;
  description: string;
  workstream: string;
  config: Record<string, unknown>;
}

export type FlagKey =
  | 'ws0_shadow_runner'
  | 'ws1_otel_spans'
  | 'ws2_outcome_calibration'
  | 'ws2_implicit_outcome_ingest'
  | 'ws3_evidence_hierarchy'
  | 'ws3_peer_contagion_live'
  | 'ws3_stealth_layoff_detector'
  | 'ws4_conformal_ci'
  | 'ws4_evidence_presence'
  | 'ws5_source_independent_swarm'
  | 'ws6_server_auth_dedup'
  | 'ws6_request_coalescing'
  | 'ws6_tier_a_response'
  | 'ws6_realtime_fanout'
  | 'ws7_layer_consolidation'
  | 'ws7_server_score_trajectory'
  | 'ws8_recalibration_cron'
  | 'ws9_db_calibration_constants'
  | 'ws9_strict_calibration_mode'
  | 'ws10_typed_fallback'
  | 'ws11_distinct_source_quorum'
  | 'ws11_dag_write_versioning'
  | 'ws12_age_aware_cache'
  | 'ws13_breaker_mesh'
  | 'ws14_request_id_context'
  // v39.0 A7: gate D8 (AI efficiency restructuring) until its 47-event
  // regression dataset is validated. Default OFF — re-enable in v40 once
  // empirical calibration has confirmed weight 0.09 doesn't bias profitable
  // tech audits by ±4-6pt against ground truth labels.
  | 'v39_d8_ai_efficiency_active'
  // v39.0 D1: kill-switch for the DAG orchestrator. The DAG runner shares
  // `hybridResult` + `companyData` with the legacy try/catch blocks; only
  // ~15 of 54 layers have been migrated. The bridge writes legacy underscore
  // fields after each DAG layer so unmigrated consumers keep reading what
  // they used to. This works but creates a dual-source-of-truth risk. The
  // kill-switch lets ops disable the DAG runner entirely if a duplicate-write
  // bug ships. Default ON to preserve v38.0 behaviour. Flip to 'off' to fall
  // back to pure legacy compute.
  | 'v39_dag_runner_active'
  // v40.0 Section 11.5: D8 expansion to WAVE cohort (sector_wave archetype).
  // Gated on 100-event held-out validation (n≥100, AUC≥0.72, precision≥0.65).
  // Default OFF — activated to 'shadow' by check_d8_wave_expansion() once gate
  // clears, then promoted to 'production' after 14-day probe observation.
  | 'v40_d8_wave_cohort_active';

/**
 * The user-facing result of evaluating a flag for the current user.
 *
 *   isActive    true when the candidate path should be USER-FACING
 *               (mode='production', or canary-hit, or local override).
 *   isShadow    true when the candidate path should RUN but its output
 *               must NOT be exposed to the user — only written to
 *               audit_shadow_comparison.
 *   mode        raw mode from the flag row, for telemetry / debugging.
 *
 * The pipeline calls both `flagActive(key)` (gate user-facing change) and
 * `flagShadow(key)` (gate parallel candidate execution). These can both be
 * true simultaneously when in canary mode; only `flagActive` should drive
 * what the user sees.
 */
export interface FlagEvaluation {
  isActive: boolean;
  isShadow: boolean;
  mode: FlagMode;
}

// ── Snapshot cache ───────────────────────────────────────────────────────────

const REFRESH_INTERVAL_MS = 60_000;

interface Snapshot {
  flags: Map<string, FeatureFlagRow>;
  fetchedAt: number;
}

let currentSnapshot: Snapshot | null = null;
let inflightFetch: Promise<Snapshot> | null = null;

// ── Per-audit flag lock ──────────────────────────────────────────────────────
// Frozen once at fetchAuditData() entry; released when the audit exits.
// evaluateFlagSync / evaluateFlag prefer this over currentSnapshot so that
// a flag change (DB write, 60s refresh) cannot alter behaviour mid-audit,
// and so two runs with the same inputs always execute the same code paths.
let auditLockedSnapshot: Snapshot | null = null;

// Local overrides for development. Set via window.__HP_FLAG_OVERRIDES__
// in browser console:
//   __HP_FLAG_OVERRIDES__ = { ws3_evidence_hierarchy: 'production' }
// Only honoured in non-production builds (when import.meta.env.DEV is true).
const isDev =
  typeof import.meta !== 'undefined' && (import.meta as { env?: { DEV?: boolean } }).env?.DEV === true;

function readDevOverride(key: FlagKey): FlagMode | null {
  if (!isDev || typeof window === 'undefined') return null;
  const overrides = (window as unknown as { __HP_FLAG_OVERRIDES__?: Partial<Record<FlagKey, FlagMode>> }).__HP_FLAG_OVERRIDES__;
  return overrides?.[key] ?? null;
}

async function fetchSnapshot(): Promise<Snapshot> {
  try {
    const rows = await featureFlagsRepo().loadAll();
    const flags = new Map<string, FeatureFlagRow>();
    for (const row of rows as unknown as FeatureFlagRow[]) {
      flags.set(row.flag_key, row);
    }
    return { flags, fetchedAt: Date.now() };
  } catch (err) {
    // On failure, return an empty snapshot — every lookup yields 'off'.
    // This is intentional: if we cannot read flags, we cannot safely run
    // candidate paths. Fall back to pure legacy behaviour.
    flagLog.warn('snapshot.fetch_failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return { flags: new Map(), fetchedAt: Date.now() };
  }
}

async function ensureSnapshot(): Promise<Snapshot> {
  const now = Date.now();
  if (currentSnapshot && now - currentSnapshot.fetchedAt < REFRESH_INTERVAL_MS) {
    return currentSnapshot;
  }
  if (inflightFetch) return inflightFetch;

  inflightFetch = fetchSnapshot()
    .then((snap) => {
      currentSnapshot = snap;
      return snap;
    })
    .finally(() => {
      inflightFetch = null;
    });

  // If we have a stale snapshot, serve it while the refresh runs.
  if (currentSnapshot) return currentSnapshot;
  return inflightFetch;
}

/**
 * Synchronous variant: returns the cached snapshot or null. Audit pipeline
 * sites that cannot await should call `primeFlags()` once at startup and
 * then use this for hot-path checks.
 */
function snapshotSync(): Snapshot | null {
  return currentSnapshot;
}

// ── Canary hash ──────────────────────────────────────────────────────────────

/**
 * Deterministic 32-bit hash of a string. djb2 variant — sufficient for canary
 * bucketing; not for cryptographic use.
 */
function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
  }
  return h >>> 0;
}

function userInCanary(row: FeatureFlagRow, userId: string | null): boolean {
  if (row.canary_user_ids.length > 0 && userId) {
    if (row.canary_user_ids.includes(userId)) return true;
    // Explicit list takes precedence: if a list is set, only listed users are in.
    return false;
  }
  if (row.canary_pct > 0 && userId) {
    const bucket = hashString(`${userId}::${row.flag_key}`) % 100;
    return bucket < row.canary_pct;
  }
  return false;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Call once at app startup so the first audit doesn't pay the snapshot-fetch
 * latency. Safe to call multiple times; subsequent calls are no-ops within the
 * 60s refresh window.
 */
export async function primeFlags(): Promise<void> {
  await ensureSnapshot();
}

/**
 * Evaluate a flag for the current user. Async because the snapshot may need
 * to be refreshed. Use `evaluateFlagSync` if you cannot await.
 */
export async function evaluateFlag(key: FlagKey, userId: string | null = null): Promise<FlagEvaluation> {
  const override = readDevOverride(key);
  if (override) {
    return {
      isActive: override === 'production' || override === 'canary',
      isShadow: override === 'shadow' || override === 'canary',
      mode: override,
    };
  }

  // If an audit is in flight, use its locked snapshot without waiting for
  // a background refresh that could alter the result mid-run.
  if (auditLockedSnapshot) {
    const row = auditLockedSnapshot.flags.get(key);
    if (!row) return { isActive: false, isShadow: false, mode: 'off' };
    return evaluateRow(row, userId);
  }

  const snap = await ensureSnapshot();
  const row = snap.flags.get(key);
  if (!row) {
    return { isActive: false, isShadow: false, mode: 'off' };
  }
  return evaluateRow(row, userId);
}

/**
 * Synchronous flag evaluation. Returns 'off' state if the snapshot has not
 * been primed. Call `primeFlags()` at app startup.
 */
export function evaluateFlagSync(key: FlagKey, userId: string | null = null): FlagEvaluation {
  const override = readDevOverride(key);
  if (override) {
    return {
      isActive: override === 'production' || override === 'canary',
      isShadow: override === 'shadow' || override === 'canary',
      mode: override,
    };
  }

  // Audit-locked snapshot takes absolute priority: if an audit is in flight,
  // every flag read uses the state that was frozen at audit start.
  const snap = auditLockedSnapshot ?? snapshotSync();
  if (!snap) return { isActive: false, isShadow: false, mode: 'off' };
  const row = snap.flags.get(key);
  if (!row) return { isActive: false, isShadow: false, mode: 'off' };
  return evaluateRow(row, userId);
}

function evaluateRow(row: FeatureFlagRow, userId: string | null): FlagEvaluation {
  switch (row.mode) {
    case 'off':
    case 'deprecated':
      return { isActive: false, isShadow: false, mode: row.mode };
    case 'shadow':
      return { isActive: false, isShadow: true, mode: 'shadow' };
    case 'canary': {
      const hit = userInCanary(row, userId);
      // Canary users see the candidate output; non-canary users still
      // get a shadow run so we accumulate parallel data across the rollout.
      return { isActive: hit, isShadow: true, mode: 'canary' };
    }
    case 'production':
      // In production mode the candidate is user-facing AND the shadow runner
      // still writes — gives us continuous regression detection.
      return { isActive: true, isShadow: true, mode: 'production' };
  }
}

/**
 * Read the active flag snapshot as a JSON-serialisable object. Used by
 * engineShadowRunner to capture the flag state into audit_shadow_comparison
 * for replay reconstruction.
 */
export function snapshotForLedger(): Record<string, FlagMode> {
  const snap = snapshotSync();
  if (!snap) return {};
  const out: Record<string, FlagMode> = {};
  for (const [k, row] of snap.flags) {
    out[k] = row.mode;
  }
  return out;
}

/**
 * Freeze the current flag snapshot for one audit run.
 *
 * Call once at the audit entry point (fetchAuditData) before any flag-gated
 * code executes. All subsequent evaluateFlagSync / evaluateFlag calls in this
 * JS event-loop task and its continuations will read from this snapshot, not
 * from the live 60s-refresh cache, until clearAuditFlags() is called.
 *
 * Returns a serializable record of the locked modes. Store on
 * HybridResult.flagSnapshot for reproducibility inspection — if you re-run
 * the same audit and the flag modes differ from this record, the code paths
 * may differ from the original run.
 *
 * Safe to call when the snapshot has not been primed yet: all flags default
 * to 'off' (the safe legacy fallback path).
 */
export function freezeAuditFlags(): Record<string, FlagMode> {
  const source = snapshotSync();
  if (source) {
    // Deep-copy the Map so a background refresh cannot mutate our locked copy.
    auditLockedSnapshot = {
      flags: new Map(source.flags),
      fetchedAt: source.fetchedAt,
    };
  } else {
    // Snapshot not yet primed — lock an empty map (all flags off).
    auditLockedSnapshot = { flags: new Map(), fetchedAt: Date.now() };
  }
  const record: Record<string, FlagMode> = {};
  for (const [k, row] of auditLockedSnapshot.flags) {
    record[k] = row.mode;
  }
  return record;
}

/**
 * Release the per-audit flag lock so the next audit gets a fresh freeze.
 * Call in the finally path of the audit pipeline entry function.
 */
export function clearAuditFlags(): void {
  auditLockedSnapshot = null;
}

/**
 * Test-only: replace the snapshot directly. Used by Vitest setup.
 */
export function __setSnapshotForTesting(rows: FeatureFlagRow[]): void {
  currentSnapshot = {
    flags: new Map(rows.map((r) => [r.flag_key, r])),
    fetchedAt: Date.now(),
  };
}

/**
 * Test-only: reset the cache so the next call re-fetches.
 */
export function __resetSnapshotForTesting(): void {
  currentSnapshot = null;
  inflightFetch = null;
  auditLockedSnapshot = null;
}
