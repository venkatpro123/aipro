// hybridOrchestrator.ts — DEBT-1 migration bridge
//
// Runs the NEW registry-driven DAG against the same AuditContext that the
// legacy 2,200-line auditDataPipeline consumes. The intent is:
//
//   * Migrated layers (registered via registerLayer()) run in the DAG
//     with proper parallelism, typed outputs, and structured spans.
//   * Legacy layers continue to call `companyData as any._x = ...` until
//     each is ported. The legacy bridge in AuditContext copies known
//     private fields into typed slots so newly migrated layers can read
//     them.
//   * On every audit, both paths execute. Their outputs feed the same
//     HybridResult. The shadow ledger compares legacy-only vs
//     legacy+DAG to surface regressions.
//
// When the migration finishes, this file becomes the new orchestrator
// outright and the legacy fetchAuditData call below is deleted.

import { AuditContext, type FlagSnapshot, type ContextLogger, type TenantId, SINGLE_TENANT_ID } from './auditContext';
import { executeRegistry, type RegistryExecutionResult } from './layerRegistry';
import { evaluateFlagSync, snapshotForLedger } from '../../config/featureFlags';
import { resolveTenantId, tenantIdSync } from '../../config/tenantContext';
import { createLogger } from '../../shared/logger';
// IMPORTANT: this import has the side effect of registering every layer.
// Without it the registry is empty and executeRegistry is a no-op.
import '../pipeline/layers/index';
import type { AuditInputs } from '../../services/auditDataPipeline';
import type { CompanyData } from '../../data/companyDatabase';

// ── Flag snapshot adapter ───────────────────────────────────────────────────

function buildFlagSnapshot(): FlagSnapshot {
  // Resolve every flag once via evaluateFlagSync. Layers then query via
  // ctx.flags.isActive(...) — deterministic for the duration of the audit,
  // even if the underlying cache refreshes mid-audit.
  return {
    isActive: (key) => evaluateFlagSync(key as Parameters<typeof evaluateFlagSync>[0]).isActive,
    isShadow: (key) => evaluateFlagSync(key as Parameters<typeof evaluateFlagSync>[0]).isShadow,
    modeOf:   (key) => evaluateFlagSync(key as Parameters<typeof evaluateFlagSync>[0]).mode,
  };
}

// ── Logger adapter ─────────────────────────────────────────────────────────

function buildContextLogger(requestId: string): ContextLogger {
  const log = createLogger({ service: 'audit-pipeline', requestId });
  return {
    debug: (event, fields) => log.debug(event, fields),
    info:  (event, fields) => log.info(event, fields),
    warn:  (event, fields) => log.warn(event, fields),
    error: (event, fields) => log.error(event, fields),
  };
}

// ── Hybrid runner ──────────────────────────────────────────────────────────

export interface HybridRunOptions {
  /** Pre-existing request id (e.g. propagated from upstream). */
  requestId?: string;
  /** Pre-resolved flag snapshot. Default: live evaluation per-key. */
  flags?: FlagSnapshot;
  /** Logger override (tests). */
  logger?: ContextLogger;
  /** Run only the DAG; skip emitting telemetry. Tests use this. */
  silent?: boolean;
  /**
   * Pre-resolved tenant id. When omitted the orchestrator calls
   * `resolveTenantId()` which hits Supabase once per session (5-min
   * cache). For non-blocking call paths supply `tenantIdSync()`
   * which never awaits.
   */
  tenantId?: TenantId;
}

export interface HybridRunResult {
  ctx: AuditContext;
  registryResult: RegistryExecutionResult;
}

/**
 * Build a fresh AuditContext for this audit, run the DAG, and return both
 * the context and the execution records. The caller (auditDataPipeline)
 * then proceeds with the legacy pipeline, reading layer outputs from
 * `ctx.read()` where the new pattern is preferred.
 *
 * This does NOT replace the legacy pipeline — it runs ALONGSIDE it.
 * Migrating a legacy layer means:
 *   1. Port its compute into a new `domain/pipeline/layers/L_xxx.ts` file.
 *   2. Add the import to `layers/index.ts`.
 *   3. Delete the corresponding legacy try/catch from auditDataPipeline.ts.
 *   4. Replace `companyData as any._x` reads with `ctx.read('xxx')`.
 */
export async function runDagPhase(
  inputs: AuditInputs,
  companyData: Readonly<CompanyData>,
  opts: HybridRunOptions = {},
): Promise<HybridRunResult> {
  const requestId = opts.requestId ?? newRequestId();
  // Tenant resolution: caller can pre-resolve (recommended for hot paths)
  // or we resolve lazily here. The sync cache hit costs nothing after the
  // first call in a session.
  const tenantId = opts.tenantId ?? tenantIdSync();
  // Kick off an async refresh so subsequent audits hit a warm cache.
  // Fire-and-forget — we never block the audit on the lookup.
  void resolveTenantId().catch(() => undefined);

  const ctx = new AuditContext({
    inputs,
    companyData,
    requestId,
    tenantId: tenantId ?? SINGLE_TENANT_ID,
    flags: opts.flags ?? buildFlagSnapshot(),
    logger: opts.logger ?? buildContextLogger(requestId),
  });

  // Surface known legacy private fields so a newly-migrated layer can
  // read what the legacy pipeline already computed.
  ctx.bridgeFromLegacyCompanyData();

  // Run the registered DAG. The executor is a no-op when no layers are
  // registered, so this is safe to call even on fresh checkouts that
  // haven't migrated anything yet.
  const registryResult = await executeRegistry(ctx, { totalBudgetMs: 30_000 });

  if (!opts.silent) {
    ctx.logger.info('pipeline.dag.complete', {
      requestId,
      layerCount: registryResult.records.length,
      totalMs: registryResult.totalMs,
      successes: registryResult.records.filter((r) => r.status === 'success').length,
      fallbacks: registryResult.records.filter((r) => r.status === 'fallback' || r.status === 'timeout').length,
      flagSnapshot: opts.silent ? undefined : snapshotForLedger(),
    });
  }

  return { ctx, registryResult };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function newRequestId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `aud_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Convenience: re-export so call sites can build their own contexts
 * without importing from two different files.
 */
export { AuditContext } from './auditContext';
