// withFallback.ts — WS10
//
// "Catch and continue with degraded value, but make the degradation
// visible." Wraps a value-producing function so:
//   * the original fn runs normally on the success path
//   * on throw, OR on a caller-detected null-input fallback condition,
//     the wrapper writes to layer_fallback_log via the existing
//     recordFallback queue AND returns the supplied fallbackValue
//   * an OTel counter `engine.fallback.count{layerId,reason}` is bumped
//   * the returned value carries metadata so upstream code can mark the
//     audit's overall confidence as fallback-tainted
//
// This is the WS10 contract: every silent `return 0.5` / `catch {}` /
// `Math.max(0.25, …)` site in the audit becomes a `withFallback(...)`
// call instead. The ESLint rule `no-silent-catch` will eventually fail
// CI on regression.
//
// Difference vs withSpan (in spanInstrumentation.ts):
//   - withSpan RETHROWS after recording (legacy layer-level try/catch
//     still owns the fallback shape).
//   - withFallback OWNS the fallback shape and never throws — it returns
//     a result wrapper { value, fellBack, reason, ... }.
//
// Both write to the same layer_fallback_log table.

import {
  recordFallback,
  type FallbackReason,
  type FallbackOptions,
  type LayerKind,
  type SourceClass,
} from '../spanInstrumentation';
import { evaluateFlagSync } from '../../config/featureFlags';
import { currentRequestId } from '../../infrastructure/requestId';

// ── Types ───────────────────────────────────────────────────────────────────

export interface WithFallbackArgs<T> {
  /** Layer identifier matching the layer_id column in layer_fallback_log. */
  layerId: string;
  /** Coarse kind for grouping. Defaults to 'intelligence_layer'. */
  layerKind?: LayerKind;
  /** Source-tier classification (only meaningful for data-source layers). */
  sourceClass?: SourceClass;
  /** Named source — 'glassdoor', 'yahoo-finance', etc. */
  sourceName?: string;
  /** Audit session id for cross-table correlation. */
  auditSessionId?: string | null;
  /** Canonical company name for per-company drilldown. */
  companyCanonical?: string | null;
  /** Engine version stamp (e.g. 'v35.1'). */
  engineVersion?: string;

  /**
   * The work to run. If it throws OR returns null/undefined while
   * `failOnNullish` is true, the wrapper logs a fallback.
   */
  run: () => Promise<T> | T;

  /** The value to return when the fallback path is taken. */
  fallbackValue: T;
  /** When true, a nullish return value from run() triggers fallback path. Default false. */
  failOnNullish?: boolean;
  /** Pre-classified reason override. Otherwise inferred from the error. */
  reason?: FallbackReason;
}

export interface FallbackResult<T> {
  /** The returned value — either the successful result or `fallbackValue`. */
  value: T;
  /** True when the wrapper substituted `fallbackValue`. */
  fellBack: boolean;
  /** The reason classification. Always present even on success ('none'). */
  reason: FallbackReason | 'none';
  /** Free-text rationale (error message, "uncalibrated_constant", etc.). */
  rationale: string | null;
  /** Wall-clock time the run took before falling back (or completing). */
  durationMs: number;
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Run a value-producing function, catching any throw and substituting
 * the supplied fallbackValue. The fallback is recorded to
 * layer_fallback_log via the existing WS1 queue + flusher.
 *
 * Never throws — the contract is that callers can `await withFallback(...)`
 * without any try/catch around it.
 *
 * @example
 *   const cap = await withFallback({
 *     layerId: 'liveDataService.criticalFinancialGap',
 *     reason: 'null_input',
 *     fallbackValue: 0.35,
 *     run: () => computeCriticalFinancialCap(signals),
 *   });
 *   confidenceCap = cap.value;
 *   if (cap.fellBack) confidenceCapsApplied.push(`fallback: ${cap.rationale}`);
 */
export async function withFallback<T>(args: WithFallbackArgs<T>): Promise<FallbackResult<T>> {
  const start = Date.now();
  try {
    const result = await args.run();
    if (args.failOnNullish && (result === null || result === undefined)) {
      return recordAndReturn(args, start, {
        reason: args.reason ?? 'null_input',
        rationale: 'run() returned nullish',
        errorKind: null,
      });
    }
    return {
      value: result,
      fellBack: false,
      reason: 'none',
      rationale: null,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return recordAndReturn(args, start, {
      reason: args.reason ?? inferReason(err),
      rationale: err instanceof Error ? err.message : String(err),
      errorKind: err instanceof Error ? err.name : 'unknown',
    });
  }
}

/**
 * Synchronous variant for layers that cannot await. Same contract.
 */
export function withFallbackSync<T>(args: Omit<WithFallbackArgs<T>, 'run'> & { run: () => T }): FallbackResult<T> {
  const start = Date.now();
  try {
    const result = args.run();
    if (args.failOnNullish && (result === null || result === undefined)) {
      return recordAndReturn(args as WithFallbackArgs<T>, start, {
        reason: args.reason ?? 'null_input',
        rationale: 'run() returned nullish',
        errorKind: null,
      });
    }
    return {
      value: result,
      fellBack: false,
      reason: 'none',
      rationale: null,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return recordAndReturn(args as WithFallbackArgs<T>, start, {
      reason: args.reason ?? inferReason(err),
      rationale: err instanceof Error ? err.message : String(err),
      errorKind: err instanceof Error ? err.name : 'unknown',
    });
  }
}

/**
 * Direct telemetry write — for layers that have ALREADY caught and
 * decided their own fallback value but want to log the fact. Convenience
 * shorthand that bumps the WS10 counter so it stays consistent with
 * withFallback() use.
 *
 * Distinct from spanInstrumentation.recordFallback only in that this
 * variant always reads currentRequestId() automatically (no manual
 * threading).
 */
export function markFallback(args: {
  layerId: string;
  reason: FallbackReason;
  fallbackValue?: unknown;
  layerKind?: LayerKind;
  sourceClass?: SourceClass;
  sourceName?: string;
  auditSessionId?: string | null;
  companyCanonical?: string | null;
  rationale?: string;
  engineVersion?: string;
}): void {
  if (!isEnabled()) return;
  recordFallback(args.layerId, args.reason, buildOptions({
    fallbackValue: args.fallbackValue,
    layerKind: args.layerKind,
    sourceClass: args.sourceClass,
    sourceName: args.sourceName,
    auditSessionId: args.auditSessionId,
    companyCanonical: args.companyCanonical,
    errorMessage: args.rationale,
    engineVersion: args.engineVersion,
  }));
}

// ── Internal helpers ────────────────────────────────────────────────────────

function isEnabled(): boolean {
  const ws10 = evaluateFlagSync('ws10_typed_fallback');
  const ws1 = evaluateFlagSync('ws1_otel_spans');
  return ws10.isShadow || ws10.isActive || ws1.isShadow || ws1.isActive;
}

function recordAndReturn<T>(
  args: WithFallbackArgs<T>,
  start: number,
  classification: { reason: FallbackReason; rationale: string; errorKind: string | null },
): FallbackResult<T> {
  const durationMs = Date.now() - start;
  if (isEnabled()) {
    recordFallback(args.layerId, classification.reason, buildOptions({
      fallbackValue: args.fallbackValue,
      layerKind: args.layerKind,
      sourceClass: args.sourceClass,
      sourceName: args.sourceName,
      auditSessionId: args.auditSessionId,
      companyCanonical: args.companyCanonical,
      errorKind: classification.errorKind ?? undefined,
      errorMessage: classification.rationale,
      durationMs,
      engineVersion: args.engineVersion,
    }));
  }
  return {
    value: args.fallbackValue,
    fellBack: true,
    reason: classification.reason,
    rationale: classification.rationale,
    durationMs,
  };
}

function buildOptions(opts: Partial<FallbackOptions> & { fallbackValue?: unknown }): FallbackOptions {
  return {
    fallbackValue: opts.fallbackValue,
    layerKind: opts.layerKind,
    sourceClass: opts.sourceClass,
    sourceName: opts.sourceName,
    auditSessionId: opts.auditSessionId,
    companyCanonical: opts.companyCanonical,
    errorKind: opts.errorKind,
    errorMessage: opts.errorMessage,
    durationMs: opts.durationMs,
    requestId: currentRequestId(),
    engineVersion: opts.engineVersion,
  };
}

function inferReason(err: unknown): FallbackReason {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes('timeout') || msg.includes('aborted') || msg.includes('timed out')) return 'timeout';
    if (msg.includes('rate') && msg.includes('limit')) return 'rate_limited';
    if (msg.includes('captcha') || msg.includes('anti-bot') || msg.includes('blocked')) return 'anti_bot';
    if (msg.includes('parse') || msg.includes('parser') || msg.includes('unexpected token')) return 'parser_failed';
    if (msg.includes('circuit')) return 'circuit_open';
    if (msg.includes('null') && msg.includes('input')) return 'null_input';
  }
  return 'exception';
}
