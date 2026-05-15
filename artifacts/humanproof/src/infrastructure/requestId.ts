// requestId.ts — gap #10 fix (end-to-end request-id propagation).
//
// One request-id per user audit, propagated:
//   browser  → audit-coalesce edge function → scrape worker
//   browser  → outcome-ingestion edge function (next time it fires)
//
// Every structured log + every pipeline_runs row + every
// audit_shadow_comparison entry carries it. Debugging a failure means
// grep one id, see every component that touched it.
//
// Implementation:
//   1. `currentRequestId()` returns a deterministic id for the active
//      audit (AsyncLocalStorage equivalent for browsers: a module-scoped
//      AbortController-like cell). Set at audit entry; cleared at exit.
//   2. `withRequestId(id, fn)` runs `fn` with `id` as the active request
//      id. Returns the function's result.
//   3. `invokeEdgeFunction` wraps `supabase.functions.invoke` and injects
//      the active id into the `x-request-id` header.
//
// AsyncLocalStorage is not available in browsers, so we use a simple
// module-scoped stack. Async boundaries inside the same audit see the
// same id because the audit pipeline awaits each layer sequentially.
// For overlapping audits (rare on the same tab), the stack pushes and
// pops on each `withRequestId` invocation.
//
// WS14 — concurrent-audit caveat (KNOWN LIMITATION):
//   The stack works correctly when audits run sequentially. If a user
//   submits two audits in the same tab and Audit B's withRequestId is
//   pushed before Audit A's resolves, any code inside A that reads
//   currentRequestId() AFTER B pushed but BEFORE B popped will see B's
//   id. In practice this is rare because the UI prevents double-submit
//   while an audit is in flight. The mitigation for callers that must
//   handle the case correctly: pass an explicit `requestId` argument
//   into `invokeEdgeFunction`, captured at audit-start time via
//   `runAudit()` rather than implicitly via `currentRequestId()`.

import { supabase } from '../utils/supabase';

// ── Stack-based active request id ──────────────────────────────────────────

const stack: string[] = [];

export function currentRequestId(): string | null {
  return stack.length > 0 ? stack[stack.length - 1]! : null;
}

export async function withRequestId<T>(id: string, fn: () => Promise<T>): Promise<T> {
  stack.push(id);
  try {
    return await fn();
  } finally {
    stack.pop();
  }
}

/**
 * WS14 — explicit per-audit entrypoint. Mints a fresh request id,
 * binds it via withRequestId for the duration of the work, and ALSO
 * returns the id to the caller so it can be passed explicitly to any
 * branch that escapes the await chain (e.g. fire-and-forget telemetry).
 *
 * Use this at the top of an audit pipeline:
 *
 *   const result = await runAudit('user-audit', async (requestId) => {
 *     // Inside this body, currentRequestId() returns `requestId`.
 *     // For fire-and-forget calls that resolve OUTSIDE the await chain,
 *     // pass requestId explicitly so concurrent audits don't collide:
 *     void invokeEdgeFunction('ingest-analytics', { requestId, body });
 *     return await runPipeline(inputs);
 *   });
 */
export async function runAudit<T>(
  label: string,
  fn: (requestId: string) => Promise<T>,
): Promise<T> {
  const id = newRequestId();
  return withRequestId(id, async () => {
    return await fn(id);
  });
}

/** Generate a new request id. UUIDv4 when available; degrades gracefully. */
export function newRequestId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

// ── Edge function invocation wrapper ───────────────────────────────────────

export interface InvokeOptions {
  body?: unknown;
  headers?: Record<string, string>;
  /** Explicit request id override; defaults to currentRequestId() or a new one. */
  requestId?: string;
}

export interface InvokeResult<T> {
  data: T | null;
  error: { message: string; code?: string } | null;
  requestId: string;
}

/**
 * Drop-in replacement for `supabase.functions.invoke(name, opts)` that
 * propagates the request id via `x-request-id`. Edge functions read this
 * header in `withRun()` (otel.ts) and stamp it onto every log + pipeline_runs
 * row they emit, so an end-to-end trace search by id returns every touched
 * component.
 *
 * When no request id is in scope, generates one — never NULL.
 */
export async function invokeEdgeFunction<T>(
  functionName: string,
  opts: InvokeOptions = {},
): Promise<InvokeResult<T>> {
  const requestId = opts.requestId ?? currentRequestId() ?? newRequestId();
  const headers = { ...opts.headers, 'x-request-id': requestId };
  const { data, error } = await supabase.functions.invoke<T>(functionName, {
    body: opts.body,
    headers,
  });
  return {
    data: data ?? null,
    error: error ? { message: error.message, code: (error as { code?: string }).code } : null,
    requestId,
  };
}
