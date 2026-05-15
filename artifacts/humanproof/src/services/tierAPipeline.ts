// tierAPipeline.ts — WS6
//
// Two-stage audit response (Audit Issue #17). Addresses the 45s blocking
// pipeline that cannot survive concurrent load:
//
//   Stage 1 — Tier-A (target ≤8s p95):
//     * Runs the full pipeline with `_forceLiveUnavailable=true` so the
//       live-quorum waiter short-circuits to the legacy "DB-only" path.
//     * Returns an immediate HybridResult tagged `auditPhase='tier_a'`.
//     * Confidence is empirically calibrated AT THE PARTIAL-COVERAGE
//       STATE (via the WS4 evidence presence gate), so the user sees an
//       HONEST confidence value, not a false high.
//
//   Stage 2 — Tier-A upgrade (async, ≤20s after Stage 1):
//     * Fires the full pipeline with live quorum enabled.
//     * Result tagged `auditPhase='tier_a_upgraded'`.
//     * Delivered to the user via the upgradeCallback (typically the
//       LayoffCalculator subscribes and animates the delta).
//
// Flag: `ws6_tier_a_response`. When off, runs a single-pass pipeline
// returning auditPhase='complete' — identical to legacy behaviour.
//
// Concurrency: each runTierA call generates a unique `auditRequestId`.
// Tier-A and upgrade payloads share this id so subscribers can correlate.
//
// Failure mode:
//   * Tier-A fails → propagates as error; caller falls back to legacy.
//   * Tier-A succeeds but upgrade fails → no callback fires; user keeps
//     the tier_a result. Upgrade failure is recorded via spanInstrumentation.

import { evaluateFlagSync } from '../config/featureFlags';
import { fetchAuditData, type AuditInputs } from './auditDataPipeline';
import type { HybridResult, AuditPhase } from '../types/hybridResult';
import type { CompanyData } from '../data/companyDatabase';
import { recordFallback } from './spanInstrumentation';

// ── Types ───────────────────────────────────────────────────────────────────

export interface TierAResult {
  phase: AuditPhase;
  requestId: string;
  result: HybridResult;
  companyData: CompanyData;
  source: 'live' | 'db' | 'stale_db' | 'fallback';
  phaseDurationMs: number;
}

export interface RunTierAOptions {
  /** Tier-A response budget. Default 8000ms. */
  tierATimeoutMs?: number;
  /** Upgrade response budget (from Tier-A finish). Default 20000ms. */
  upgradeTimeoutMs?: number;
  /**
   * Callback invoked when the upgrade payload is ready. Single fire per
   * request. Errors thrown by the callback are caught and logged.
   */
  onUpgrade?: (upgraded: TierAResult) => void;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function newRequestId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `aud_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function stampPhase(result: HybridResult, phase: AuditPhase, requestId: string, durationMs: number): HybridResult {
  // HybridResult is structurally typed; setting these is safe even when
  // the caller's UI doesn't yet read them.
  (result as HybridResult & { auditPhase: AuditPhase }).auditPhase = phase;
  (result as HybridResult & { auditRequestId: string }).auditRequestId = requestId;
  (result as HybridResult & { phaseDurationMs: number }).phaseDurationMs = durationMs;
  return result;
}

/**
 * Runs the legacy pipeline with the live-quorum waiter forced into the
 * "unavailable" branch. This is achieved by setting the `_forceLiveUnavailable`
 * flag on the AuditInputs (read by auditDataPipeline's existing branch).
 *
 * If the pipeline's input schema does not yet honour this flag, the call
 * still completes — it just won't actually short-circuit, and the Tier-A
 * timing will degrade to the full quorum wait. That is the safe failure
 * mode (correct results, slower than goal).
 */
async function runFastPath(inputs: AuditInputs): Promise<{
  result: HybridResult;
  companyData: CompanyData;
  source: 'live' | 'db' | 'stale_db' | 'fallback';
}> {
  // Cast to bypass strict typing on the private flag.
  const fastInputs = {
    ...inputs,
    _forceLiveUnavailable: true,
  } as AuditInputs & { _forceLiveUnavailable: boolean };
  return fetchAuditData(fastInputs);
}

async function runFullPath(inputs: AuditInputs): Promise<{
  result: HybridResult;
  companyData: CompanyData;
  source: 'live' | 'db' | 'stale_db' | 'fallback';
}> {
  return fetchAuditData(inputs);
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Two-stage audit runner.
 *
 * Returns the Tier-A response immediately. When the flag is on AND an
 * onUpgrade callback was supplied, also schedules the upgrade pass in
 * the background — the caller's UI receives the upgraded payload via
 * the callback.
 *
 * Legacy mode (flag off): runs a single full pass and returns it
 * tagged as `auditPhase='complete'`. No upgrade is scheduled.
 */
export async function runTierA(inputs: AuditInputs, opts: RunTierAOptions = {}): Promise<TierAResult> {
  const flag = evaluateFlagSync('ws6_tier_a_response');
  const requestId = newRequestId();

  if (!flag.isActive && !flag.isShadow) {
    // Legacy single-pass behaviour.
    const start = Date.now();
    const out = await runFullPath(inputs);
    const dur = Date.now() - start;
    return {
      phase: 'complete',
      requestId,
      result: stampPhase(out.result, 'complete', requestId, dur),
      companyData: out.companyData,
      source: out.source,
      phaseDurationMs: dur,
    };
  }

  // ── Stage 1: Tier-A fast path ──────────────────────────────────────────
  const tierATimeout = opts.tierATimeoutMs ?? 8000;
  const tierAStart = Date.now();

  let tierAOut: { result: HybridResult; companyData: CompanyData; source: 'live' | 'db' | 'stale_db' | 'fallback' };
  try {
    // Hard cap Tier-A duration. If the fast path exceeds the budget, we
    // still return its result (correctness over speed) and log the
    // budget overrun to telemetry.
    tierAOut = await Promise.race([
      runFastPath(inputs),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('tier_a_timeout')), tierATimeout + 5000),
      ),
    ]);
  } catch (err) {
    // Fast path failed — fall through to a single full pass. The user
    // gets a slower response but a CORRECT one.
    recordFallback('tier_a_fast_path', 'exception', {
      layerKind: 'intelligence_layer',
      errorKind: err instanceof Error ? err.name : 'unknown',
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    const fallbackStart = Date.now();
    const out = await runFullPath(inputs);
    const dur = Date.now() - fallbackStart;
    return {
      phase: 'complete',
      requestId,
      result: stampPhase(out.result, 'complete', requestId, dur),
      companyData: out.companyData,
      source: out.source,
      phaseDurationMs: dur,
    };
  }

  const tierADuration = Date.now() - tierAStart;
  if (tierADuration > tierATimeout) {
    recordFallback('tier_a_budget_exceeded', 'timeout', {
      layerKind: 'intelligence_layer',
      durationMs: tierADuration,
      errorMessage: `tier_a took ${tierADuration}ms (budget ${tierATimeout}ms)`,
    });
  }

  const tierAResult: TierAResult = {
    phase: 'tier_a',
    requestId,
    result: stampPhase(tierAOut.result, 'tier_a', requestId, tierADuration),
    companyData: tierAOut.companyData,
    source: tierAOut.source,
    phaseDurationMs: tierADuration,
  };

  // ── Stage 2: upgrade (async, fire-and-forget) ──────────────────────────
  if (opts.onUpgrade) {
    const upgradeTimeout = opts.upgradeTimeoutMs ?? 20000;
    // Use queueMicrotask + setTimeout to ensure we return Tier-A first.
    setTimeout(() => {
      const upgradeStart = Date.now();
      Promise.race([
        runFullPath(inputs),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('tier_a_upgrade_timeout')), upgradeTimeout),
        ),
      ])
        .then((upgraded) => {
          const dur = Date.now() - upgradeStart;
          const upgradedResult: TierAResult = {
            phase: 'tier_a_upgraded',
            requestId,
            result: stampPhase(upgraded.result, 'tier_a_upgraded', requestId, dur),
            companyData: upgraded.companyData,
            source: upgraded.source,
            phaseDurationMs: dur,
          };
          try {
            opts.onUpgrade!(upgradedResult);
          } catch (cbErr) {
            // eslint-disable-next-line no-console
            console.warn('[tierAPipeline] upgrade callback threw:', cbErr);
          }
        })
        .catch((err) => {
          recordFallback('tier_a_upgrade_failed', 'exception', {
            layerKind: 'intelligence_layer',
            errorMessage: err instanceof Error ? err.message : String(err),
          });
        });
    }, 0);
  }

  return tierAResult;
}

/**
 * Convenience: derive a one-line description of the Tier-A vs upgraded
 * delta for transparency UI. Returns null when the upgrade did not
 * materially change the score.
 */
export function describePhaseDelta(tierA: HybridResult, upgraded: HybridResult): string | null {
  const scoreDelta = (upgraded.total ?? 0) - (tierA.total ?? 0);
  const confDelta = (upgraded.confidencePercent ?? 0) - (tierA.confidencePercent ?? 0);
  if (Math.abs(scoreDelta) < 1 && Math.abs(confDelta) < 3) return null;
  const scoreStr = scoreDelta === 0 ? 'no score change' : `score ${scoreDelta > 0 ? '+' : ''}${scoreDelta}`;
  const confStr = confDelta === 0 ? 'no confidence change' : `confidence ${confDelta > 0 ? '+' : ''}${confDelta}pp`;
  return `Live signals upgraded result: ${scoreStr}, ${confStr}.`;
}
