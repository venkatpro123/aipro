// _shared/withFallback.ts — WS10 (Deno mirror of artifacts/humanproof/src/services/observability/withFallback.ts)
//
// Identical contract to the browser-side wrapper: catch any throw, log a
// fallback row to layer_fallback_log, return the supplied fallbackValue,
// never re-throw. Built on top of the existing _shared/otel.ts
// recordFallback().
//
// Used by every edge function that needs to swallow an upstream failure
// (third-party API timeout, malformed payload, circuit-open) while
// keeping the audit pipeline running. Replaces the
// `.catch(() => null)` and `catch (e) { /* silent */ }` patterns
// surfaced in the audit.

import { recordFallback, type FallbackReason, type LayerKind, type SourceClass } from './otel.ts';

export interface WithFallbackArgs<T> {
  layerId: string;
  layerKind?: LayerKind;
  sourceClass?: SourceClass;
  sourceName?: string;
  auditSessionId?: string | null;
  companyCanonical?: string | null;
  run: () => Promise<T> | T;
  fallbackValue: T;
  failOnNullish?: boolean;
  reason?: FallbackReason;
}

export interface FallbackResult<T> {
  value: T;
  fellBack: boolean;
  reason: FallbackReason | 'none';
  rationale: string | null;
  durationMs: number;
}

export async function withFallback<T>(args: WithFallbackArgs<T>): Promise<FallbackResult<T>> {
  const start = Date.now();
  try {
    const result = await args.run();
    if (args.failOnNullish && (result === null || result === undefined)) {
      return await recordAndReturn(args, start, {
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
    return await recordAndReturn(args, start, {
      reason: args.reason ?? inferReason(err),
      rationale: err instanceof Error ? err.message : String(err),
      errorKind: err instanceof Error ? err.name : 'unknown',
    });
  }
}

async function recordAndReturn<T>(
  args: WithFallbackArgs<T>,
  start: number,
  classification: { reason: FallbackReason; rationale: string; errorKind: string | null },
): Promise<FallbackResult<T>> {
  const durationMs = Date.now() - start;
  // Fire-and-forget; recordFallback is async but we do not block the caller.
  // If telemetry insert fails, we still return the fallback value — the
  // edge function MUST continue.
  recordFallback({
    layerId: args.layerId,
    reason: classification.reason,
    layerKind: args.layerKind,
    sourceName: args.sourceName,
    sourceClass: args.sourceClass,
    errorKind: classification.errorKind ?? undefined,
    errorMessage: classification.rationale,
    durationMs,
    fallbackValue: args.fallbackValue,
    auditSessionId: args.auditSessionId,
    companyCanonical: args.companyCanonical,
  }).catch(() => undefined);
  return {
    value: args.fallbackValue,
    fellBack: true,
    reason: classification.reason,
    rationale: classification.rationale,
    durationMs,
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
