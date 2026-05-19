// auditContext.ts — DEBT-2 fix (typed inter-layer channel)
//
// Replaces the `companyData as any._x` private-channel antipattern with a
// typed pub/sub bus shared by every pipeline layer.
//
// Why this exists:
//   The legacy pipeline threaded state between layers by mutating
//   `companyData` with un-typed private fields: _conformalBundle,
//   _stealthSignal, _acquisitionPremium, _maContext, _evidencePresence,
//   _swarmIndependence, _dataFreshnessScore, _liveUnavailable, etc.
//   This made refactoring impossible — the type system could not catch
//   a renamed field, a deleted producer, or a consumer reading something
//   no producer set.
//
//   AuditContext provides a typed `emit<T>(key, value)` + `read<T>(key)`
//   pair backed by a Map. Keys are namespaced layer IDs (e.g.
//   'L22_peer_contagion', 'core', 'macro_snapshot'). Each key has a
//   declared type in `LayerOutputs` below; reads return the declared
//   type or `null`.
//
// Adoption strategy:
//   New layers (and refactored layers) use AuditContext.
//   Legacy layers keep using `companyData as any` until migrated.
//   A `bridgeFromLegacy` helper copies known private fields from the
//   legacy companyData into the context so the two patterns interoperate
//   during the migration window.

import type { AuditInputs } from '../../services/auditDataPipeline';
import type { CompanyData } from '../../data/companyDatabase';
import type { ConformalBundle } from '../../services/conformalCI';
import type { StealthSignal } from '../../services/stealthLayoffDetector';
import type { AcquisitionPremiumSignal } from '../../services/mergerAcquisitionRiskEngine';
import type { EvidencePresenceReport } from '../../services/evidencePresenceGate';
import type { SourceIndependentPanelResult } from '../../services/swarm/sourceIndependentPanel';
import type { MacroSnapshot } from '../../services/macroSnapshot';
import type { CohortClassification } from '../../services/cohortClassifier';
import type { PeerContagionResult } from '../../services/peerContagionEngine';
import type { ExecutiveMovementSignal } from '../../services/executiveMovementEngine';
import type { HiringSignalResult } from '../../services/hiringSignalAnalyzer';
import type { EmployeeSentimentResult } from '../../services/employeeSentimentEngine';
import type { HeadcountVelocityResult } from '../../services/headcountVelocityEngine';
// v40.0 DAG migration — 5 new layers
import type { WARNSignal } from '../../services/warnActService';
import type { GlassdoorVelocityResult } from '../../services/glassdoorVelocityEngine';
import type { SECEnhancedRiskResult } from '../../services/secEnhancedService';

// ── Layer output schema ─────────────────────────────────────────────────────
//
// Every layer's output type is declared here. Adding a new layer means
// adding one line. Consumers read with full type inference:
//   const macro = ctx.read('macro_snapshot'); // typed as MacroSnapshot | null

export interface LayerOutputs {
  // ── Foundational signals (set before first scoring pass) ────────────────
  'core':                Readonly<{ total: number; confidencePercent: number }>;
  'macro_snapshot':      MacroSnapshot;
  'cohort_class':        CohortClassification;
  'evidence_presence':   EvidencePresenceReport;

  // ── WS3 / Evidence hierarchy ────────────────────────────────────────────
  'stealth_layoff':      StealthSignal;
  'acquisition_premium': AcquisitionPremiumSignal;

  // ── WS4 / Confidence ────────────────────────────────────────────────────
  'conformal_ci':        ConformalBundle;

  // ── WS5 / Swarm ─────────────────────────────────────────────────────────
  'swarm_panel':         SourceIndependentPanelResult;

  // ── WS3 / Peer contagion ───────────────────────────────────────────────
  'peer_contagion':      PeerContagionResult;

  // ── Intelligence layers migrated from the legacy pipeline ─────────────
  'executive_movement':  ExecutiveMovementSignal;
  'hiring_signal':       HiringSignalResult;
  'employee_sentiment':  EmployeeSentimentResult;
  'headcount_velocity':  HeadcountVelocityResult;

  // ── v40.0 DAG migration batch ───────────────────────────────────────────
  'warn_signal':          WARNSignal;
  'glassdoor_velocity':   GlassdoorVelocityResult;
  'sec_enhanced':         SECEnhancedRiskResult;
  'workforce_velocity':   Readonly<{ headcountChange: number; velocityScore: number; trend: string }>;
  'bls_macro_live':       Readonly<{ isHeuristic: boolean; recessionProbability: number; unemploymentRate: number }>;

  // ── Catch-all for layers not yet typed (DELETE ENTRIES, DON'T ADD) ──────
  // The empty `_legacy` channel exists so progressive migration is type-safe.
  // Forbidden to introduce new untyped channels through this — adopt a typed
  // key above instead.
  '_legacy_untyped':     Record<string, unknown>;
}

export type LayerKey = keyof LayerOutputs;

// ── TenantId ────────────────────────────────────────────────────────────────

export type TenantId = string & { readonly __brand: 'TenantId' };
export const SINGLE_TENANT_ID = '00000000-0000-0000-0000-000000000001' as TenantId;

// ── Clock (injectable for tests) ────────────────────────────────────────────

export interface Clock {
  now(): Date;
  nowMs(): number;
}

export const SYSTEM_CLOCK: Clock = {
  now: () => new Date(),
  nowMs: () => Date.now(),
};

// ── Feature flag snapshot resolved once per audit ───────────────────────────

export interface FlagSnapshot {
  isActive(flagKey: string): boolean;
  isShadow(flagKey: string): boolean;
  /** Raw mode for telemetry / debugging. */
  modeOf(flagKey: string): 'off' | 'shadow' | 'canary' | 'production' | 'deprecated';
}

const EMPTY_FLAG_SNAPSHOT: FlagSnapshot = {
  isActive: () => false,
  isShadow: () => false,
  modeOf: () => 'off',
};

// ── Logger (passed through for structured emission) ─────────────────────────

export interface ContextLogger {
  debug(event: string, fields?: Record<string, unknown>): void;
  info(event: string, fields?: Record<string, unknown>): void;
  warn(event: string, fields?: Record<string, unknown>): void;
  error(event: string, fields?: Record<string, unknown>): void;
}

const NULL_LOGGER: ContextLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

// ── AuditContext ────────────────────────────────────────────────────────────

export interface AuditContextOptions {
  inputs: AuditInputs;
  companyData: Readonly<CompanyData>;
  tenantId?: TenantId;
  requestId?: string;
  clock?: Clock;
  flags?: FlagSnapshot;
  logger?: ContextLogger;
}

/**
 * Per-audit shared context. Layers receive this and emit their outputs
 * onto it; subsequent layers read previous outputs from it.
 *
 * Lifetime: created at audit start, garbage-collected when the audit
 * completes. No persistence; no shared state across audits.
 */
export class AuditContext {
  readonly inputs: AuditInputs;
  readonly companyData: Readonly<CompanyData>;
  readonly tenantId: TenantId;
  readonly requestId: string;
  readonly clock: Clock;
  readonly flags: FlagSnapshot;
  readonly logger: ContextLogger;
  /** Wall-clock ms when the context was created. */
  readonly startedAt: number;

  private readonly outputs = new Map<LayerKey, unknown>();
  private readonly emittedOrder: LayerKey[] = [];
  // WS11 — per-key monotonic version counter. Bumped on every successful
  // write. Used by setVersioned() (optimistic concurrency control) and
  // by emit() to detect double-writes when WS11 flag is on.
  private readonly versions = new Map<LayerKey, number>();
  // WS11 — record of every double-write that hit this audit. Returned
  // by collectWriteConflicts() so the engine shadow runner can surface
  // them on audit_shadow_comparison.flags_active for analysis.
  private readonly writeConflicts: Array<{ key: LayerKey; emittedBy: string | null; overriddenAt: number }> = [];

  constructor(opts: AuditContextOptions) {
    this.inputs = opts.inputs;
    this.companyData = opts.companyData;
    this.tenantId = opts.tenantId ?? SINGLE_TENANT_ID;
    this.requestId = opts.requestId ?? generateRequestId();
    this.clock = opts.clock ?? SYSTEM_CLOCK;
    this.flags = opts.flags ?? EMPTY_FLAG_SNAPSHOT;
    this.logger = opts.logger ?? NULL_LOGGER;
    this.startedAt = this.clock.nowMs();
  }

  /**
   * Publish a layer's output.
   *
   * WS11 — duplicate emits are now tracked structurally rather than just
   * logged. The legacy behaviour (second-write-wins, single warn log)
   * is preserved so existing layers continue to function. Calls to
   * collectWriteConflicts() surface every double-write so the shadow
   * runner can flag audits whose DAG raced. Layers that want
   * "first-write-wins" semantics use setVersioned() instead.
   */
  emit<K extends LayerKey>(key: K, value: LayerOutputs[K], opts?: { emittedBy?: string }): void {
    if (this.outputs.has(key)) {
      this.logger.warn('audit_context.duplicate_emit', {
        key,
        requestId: this.requestId,
        emittedBy: opts?.emittedBy ?? null,
      });
      this.writeConflicts.push({
        key,
        emittedBy: opts?.emittedBy ?? null,
        overriddenAt: this.clock.nowMs(),
      });
    } else {
      this.emittedOrder.push(key);
    }
    this.outputs.set(key, value);
    this.versions.set(key, (this.versions.get(key) ?? 0) + 1);
  }

  /**
   * WS11 — Optimistic-concurrency write. Caller passes the version they
   * observed via getVersion(). If the version has changed since (another
   * layer wrote in the meantime), the call throws WriteConflictError
   * and the caller MUST decide whether to retry against the new state
   * or abort.
   *
   * Use this when two layers in the same DAG wave both contribute to
   * the same typed key (rare, but possible — e.g. a primary producer
   * + a corrective post-processor running as wave-peers).
   *
   * Layers that don't care about races continue using emit() with
   * "second-write-wins" semantics.
   */
  setVersioned<K extends LayerKey>(
    key: K,
    value: LayerOutputs[K],
    expectedVersion: number,
    opts?: { emittedBy?: string },
  ): number {
    const current = this.versions.get(key) ?? 0;
    if (current !== expectedVersion) {
      throw new WriteConflictError(
        `Concurrent write detected on key=${key}: expectedVersion=${expectedVersion}, currentVersion=${current}`,
        { key: String(key), expectedVersion, actualVersion: current, emittedBy: opts?.emittedBy ?? null },
      );
    }
    if (!this.outputs.has(key)) this.emittedOrder.push(key);
    this.outputs.set(key, value);
    const next = current + 1;
    this.versions.set(key, next);
    return next;
  }

  /**
   * Returns the current version of a key (0 if never written). Used by
   * callers of setVersioned() to pass an expectedVersion.
   */
  getVersion<K extends LayerKey>(key: K): number {
    return this.versions.get(key) ?? 0;
  }

  /**
   * WS11 — Diagnostic accessor for the shadow runner. Returns every
   * double-write that occurred during this audit. Empty array = the
   * DAG executed cleanly; non-empty = at least one race condition.
   */
  collectWriteConflicts(): ReadonlyArray<{ key: LayerKey; emittedBy: string | null; overriddenAt: number }> {
    return this.writeConflicts;
  }

  /**
   * Read a previously-emitted output. Returns `null` if no layer has
   * emitted under this key yet. Callers MUST handle the null case —
   * the type system enforces this.
   */
  read<K extends LayerKey>(key: K): LayerOutputs[K] | null {
    return (this.outputs.get(key) as LayerOutputs[K] | undefined) ?? null;
  }

  /**
   * Same as `read` but throws when the value is missing. Use only when
   * the consumer is declared as depending on this key in the DAG —
   * the DAG executor guarantees the producer ran first.
   */
  require<K extends LayerKey>(key: K): LayerOutputs[K] {
    const v = this.read(key);
    if (v === null || v === undefined) {
      throw new Error(`AuditContext.require: no emitter for "${key}" (requestId=${this.requestId})`);
    }
    return v;
  }

  hasEmitted(key: LayerKey): boolean {
    return this.outputs.has(key);
  }

  /** Snapshot of every layer that has emitted, in order. Used by telemetry. */
  emittedKeys(): readonly LayerKey[] {
    return this.emittedOrder.slice();
  }

  /** ms since context creation; useful for span timing inside layers. */
  elapsedMs(): number {
    return this.clock.nowMs() - this.startedAt;
  }

  // ── Legacy bridge ─────────────────────────────────────────────────────
  //
  // During the migration period, legacy layers stash state on
  // `companyData as any._x`. This helper copies those known fields into
  // the typed context so new layers can read them. Delete the matching
  // line as each producer migrates to ctx.emit().
  bridgeFromLegacyCompanyData(): void {
    const legacy = this.companyData as unknown as Record<string, unknown>;
    const tryEmit = <K extends LayerKey>(key: K, source: unknown): void => {
      if (source != null && !this.hasEmitted(key)) {
        this.outputs.set(key, source);
        this.emittedOrder.push(key);
      }
    };
    tryEmit('conformal_ci',        legacy._conformalBundle);
    tryEmit('stealth_layoff',      legacy._stealthSignal);
    tryEmit('acquisition_premium', legacy._acquisitionPremium);
  }

  /**
   * Serialize the context's emitted outputs to JSON for shadow-comparison
   * persistence. Excludes the `_legacy_untyped` channel (it's already a
   * raw bucket and would duplicate the companyData private fields).
   */
  toLedgerJSON(): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [key, value] of this.outputs.entries()) {
      if (key === '_legacy_untyped') continue;
      out[key] = value;
    }
    return out;
  }
}

// ── WS11 — Write conflict error ────────────────────────────────────────────

/**
 * Thrown by AuditContext.setVersioned when a concurrent write has
 * advanced the version since the caller observed it. Carries the
 * conflicting versions so the caller can re-read and retry.
 */
export class WriteConflictError extends Error {
  readonly name = 'WriteConflictError';
  readonly key: string;
  readonly expectedVersion: number;
  readonly actualVersion: number;
  readonly emittedBy: string | null;
  constructor(
    message: string,
    detail: { key: string; expectedVersion: number; actualVersion: number; emittedBy: string | null },
  ) {
    super(message);
    this.key = detail.key;
    this.expectedVersion = detail.expectedVersion;
    this.actualVersion = detail.actualVersion;
    this.emittedBy = detail.emittedBy;
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function generateRequestId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `aud_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
