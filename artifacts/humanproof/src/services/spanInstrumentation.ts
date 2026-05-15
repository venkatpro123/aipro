// spanInstrumentation.ts — WS1
//
// Lightweight span + fallback recorder layered on top of the existing
// pipelineTimer. The goal is to make every layer's silent fallbacks
// visible without rewriting pipelineTimer or touching every layer's
// error handling at once.
//
// Two primitives:
//
//   withSpan(layerId, fn, opts?)
//     Wraps fn in start/end timing and emits a span. If fn throws, the
//     thrown error is rethrown (so existing try/catch fallbacks still
//     fire) but the span is recorded as failed and a layer_fallback_log
//     row is queued.
//
//   recordFallback(layerId, reason, opts?)
//     Called explicitly by layers that catch their own exceptions and
//     return a heuristic value. This is the ONLY way the system learns
//     that a "successful" audit actually fell back to heuristics.
//
// Both primitives:
//   * are no-op-safe when the WS1 flag is off
//   * never throw (instrumentation must not break user audits)
//   * use a per-page in-memory queue flushed on visibility change /
//     beforeunload, so we do not pay a network round-trip per layer
//
// Schema target: public.layer_fallback_log (created by
// 20260603000001_layer_fallback_log.sql)

import { supabase } from '../utils/supabase';
import { evaluateFlagSync } from '../config/featureFlags';

// ── Types ────────────────────────────────────────────────────────────────────

export type LayerKind =
  | 'intelligence_layer'
  | 'data_source'
  | 'edge_function'
  | 'scrape'
  | 'swarm_agent';

export type FallbackReason =
  | 'timeout'
  | 'anti_bot'
  | 'parser_failed'
  | 'null_input'
  | 'exception'
  | 'rate_limited'
  | 'circuit_open';

export type SourceClass =
  | 'REGULATORY'
  | 'OFFICIAL_FILING'
  | 'MAJOR_PRESS'
  | 'AGGREGATED_DATA'
  | 'SOCIAL_AGGREGATE'
  | 'SOCIAL_INDIVIDUAL';

export interface SpanOptions {
  layerKind?: LayerKind;
  auditSessionId?: string | null;
  companyCanonical?: string | null;
  sourceClass?: SourceClass;
  sourceName?: string;
  /** When true, a thrown error is converted to a fallback log and rethrown. */
  logOnThrow?: boolean;
}

export interface FallbackOptions extends SpanOptions {
  fallbackValue?: unknown;
  errorKind?: string;
  errorMessage?: string;
  durationMs?: number;
  requestId?: string | null;
  engineVersion?: string;
}

interface FallbackRow {
  layer_id: string;
  layer_kind: LayerKind;
  audit_session_id: string | null;
  company_canonical: string | null;
  fallback_reason: FallbackReason;
  fallback_value: unknown;
  error_kind: string | null;
  error_message: string | null;
  source_class: SourceClass | null;
  source_name: string | null;
  duration_ms: number | null;
  request_id: string | null;
  engine_version: string | null;
}

// ── Queue ────────────────────────────────────────────────────────────────────

const MAX_QUEUE = 200;
const FLUSH_INTERVAL_MS = 10_000;
const MAX_MESSAGE_LEN = 1024;

let queue: FallbackRow[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
let flushing = false;

function ensureFlusher(): void {
  if (flushTimer) return;
  flushTimer = setInterval(() => void flush(), FLUSH_INTERVAL_MS);
  if (typeof window !== 'undefined') {
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') void flush();
    });
    window.addEventListener('beforeunload', () => {
      // Use sendBeacon when available — survives navigation.
      void flush({ beacon: true });
    });
  }
}

function truncate(s: string | undefined | null): string | null {
  if (!s) return null;
  return s.length > MAX_MESSAGE_LEN ? s.slice(0, MAX_MESSAGE_LEN) : s;
}

function enqueue(row: FallbackRow): void {
  // Drop the oldest entry if the queue is full. This is telemetry, not
  // user data; losing the oldest 200 events is acceptable under burst.
  if (queue.length >= MAX_QUEUE) queue.shift();
  queue.push(row);
  ensureFlusher();
}

async function flush(opts?: { beacon?: boolean }): Promise<void> {
  if (flushing || queue.length === 0) return;
  // Snapshot and clear immediately so concurrent enqueue does not lose entries.
  const batch = queue;
  queue = [];
  flushing = true;
  try {
    if (opts?.beacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
      // sendBeacon path requires an HTTP endpoint, not the Supabase JS client.
      // For now, drop the beacon path — the in-page flush covers normal
      // usage. A dedicated /api/v1/telemetry/fallback endpoint can be
      // wired in WS1 step 4 (ingest-analytics edge function).
      // Re-enqueue the batch so the next visibilitychange tries again.
      queue = batch.concat(queue).slice(-MAX_QUEUE);
      return;
    }
    const { error } = await supabase.from('layer_fallback_log').insert(batch);
    if (error) {
      // eslint-disable-next-line no-console
      console.warn('[spanInstrumentation] flush failed, dropping batch:', error.message);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[spanInstrumentation] flush threw:', err);
  } finally {
    flushing = false;
  }
}

// ── Reason inference ─────────────────────────────────────────────────────────

function inferReason(err: unknown): FallbackReason {
  if (err instanceof Error) {
    const msg = (err.message ?? '').toLowerCase();
    if (msg.includes('timeout') || msg.includes('timed out') || err.name === 'TimeoutError') return 'timeout';
    if (msg.includes('abort')) return 'timeout';
    if (msg.includes('429') || msg.includes('rate limit')) return 'rate_limited';
    if (msg.includes('captcha') || msg.includes('cloudflare') || msg.includes('blocked') || msg.includes('challenge')) return 'anti_bot';
    if (msg.includes('parse') || err.name === 'SyntaxError') return 'parser_failed';
    if (msg.includes('circuit')) return 'circuit_open';
    if (msg.includes('null') && msg.includes('input')) return 'null_input';
  }
  return 'exception';
}

// ── Public API ───────────────────────────────────────────────────────────────

const SAFE_ENABLED = (): boolean => evaluateFlagSync('ws1_otel_spans').isShadow || evaluateFlagSync('ws1_otel_spans').isActive;

/**
 * Run `fn` and time it. If it throws, record a fallback row before rethrowing
 * (so the existing layer-level try/catch can still install its heuristic
 * fallback value).
 *
 * Wraps are no-op when the WS1 flag is off, so this is safe to install in
 * every layer before WS1 ships to production.
 */
export async function withSpan<T>(
  layerId: string,
  fn: () => Promise<T> | T,
  opts: SpanOptions = {},
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    return result;
  } catch (err) {
    if ((opts.logOnThrow ?? true) && SAFE_ENABLED()) {
      const reason = inferReason(err);
      enqueue({
        layer_id: layerId,
        layer_kind: opts.layerKind ?? 'intelligence_layer',
        audit_session_id: opts.auditSessionId ?? null,
        company_canonical: opts.companyCanonical ?? null,
        fallback_reason: reason,
        fallback_value: null,
        error_kind: err instanceof Error ? err.name : 'unknown',
        error_message: truncate(err instanceof Error ? err.message : String(err)),
        source_class: opts.sourceClass ?? null,
        source_name: opts.sourceName ?? null,
        duration_ms: Date.now() - start,
        request_id: null,
        engine_version: null,
      });
    }
    throw err;
  }
}

/**
 * Explicit fallback declaration — call from inside a layer's catch block
 * (or wherever the layer decides to substitute a heuristic value) so the
 * fallback is visible in the SLO dashboard.
 */
export function recordFallback(
  layerId: string,
  reason: FallbackReason,
  opts: FallbackOptions = {},
): void {
  if (!SAFE_ENABLED()) return;
  enqueue({
    layer_id: layerId,
    layer_kind: opts.layerKind ?? 'intelligence_layer',
    audit_session_id: opts.auditSessionId ?? null,
    company_canonical: opts.companyCanonical ?? null,
    fallback_reason: reason,
    fallback_value: opts.fallbackValue ?? null,
    error_kind: opts.errorKind ?? null,
    error_message: truncate(opts.errorMessage),
    source_class: opts.sourceClass ?? null,
    source_name: opts.sourceName ?? null,
    duration_ms: opts.durationMs ?? null,
    request_id: opts.requestId ?? null,
    engine_version: opts.engineVersion ?? null,
  });
}

/**
 * Drain the in-memory queue immediately. Tests use this to assert that
 * recordFallback wrote what they expected.
 */
export async function __flushForTesting(): Promise<void> {
  await flush();
}

/**
 * Test-only: empty the queue without writing.
 */
export function __clearQueueForTesting(): void {
  queue = [];
}
