// _shared/fetchWithBreaker.ts — WS13 (Deno-side circuit breaker for edge functions)
//
// Edge functions are stateless cold containers — there is no shared
// memory between invocations. apiCircuitBreaker.ts on the browser is
// useless here because every Deno call sees a fresh process.
//
// This wrapper reads + writes shared state via the breaker_state table
// (migration 20260619000001) using two SECURITY DEFINER RPCs:
//   * breaker_may_probe(key)            → bool: am I allowed to make a request?
//   * breaker_record_outcome(key, ok)   → text: new state after this call
//
// Contract for edge function authors:
//
//   import { fetchWithBreaker } from "../_shared/fetchWithBreaker.ts";
//
//   const result = await fetchWithBreaker({
//     breakerKey: 'glassdoor.scrape',
//     url: targetUrl,
//     timeoutMs: 8000,
//     init: { method: 'GET', headers: { 'User-Agent': '…' } },
//   });
//
//   if (result.kind === 'short_circuited') {
//     // breaker is OPEN; do not retry, fall back to cache or heuristic
//   } else if (result.kind === 'failure') {
//     // request was made but failed; result.error has the reason
//   } else {
//     // result.response is the Response object
//   }
//
// Never throws — the contract is callers can dispatch and reason about
// the outcome via the result kind.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const supabase = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  : null;

// ── Per-isolate in-process cache ─────────────────────────────────────────────
// Deno isolates are reused across requests for the lifetime of the machine.
// Caching the breaker state here eliminates the breaker_may_probe() RPC on
// the hot path (CLOSED state): the common case pays zero DB overhead.
//
// TTL = 15 s — short enough that an OPEN transition is visible to the next
// isolate within a probe window, long enough to amortise across multiple
// back-to-back EF calls from the same scraper tick.
//
// Invalidation: any recordOutcome() call (success or failure) that changes
// state writes the new state back into the cache immediately, so a state
// transition is reflected in the same isolate on the very next call.
const STATE_CACHE_TTL_MS = 15_000;
interface CachedState { state: 'CLOSED' | 'OPEN' | 'HALF_OPEN'; cachedAt: number }
const _stateCache = new Map<string, CachedState>();

function _cacheGet(key: string): CachedState | null {
  const entry = _stateCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > STATE_CACHE_TTL_MS) { _stateCache.delete(key); return null; }
  return entry;
}
function _cacheSet(key: string, state: 'CLOSED' | 'OPEN' | 'HALF_OPEN'): void {
  _stateCache.set(key, { state, cachedAt: Date.now() });
}

export type BreakerResult =
  | { kind: 'short_circuited'; breakerKey: string; reason: 'breaker_open' }
  | { kind: 'success'; breakerKey: string; response: Response }
  | { kind: 'failure'; breakerKey: string; error: Error; newState: string };

export interface FetchWithBreakerArgs {
  /** Identifier matching a breaker_state.breaker_key row. */
  breakerKey: string;
  /** Target URL. */
  url: string;
  /** Fetch RequestInit, AbortSignal-free (we add our own timeout). */
  init?: RequestInit;
  /** Per-call timeout. Required — every external fetch MUST have one. */
  timeoutMs: number;
}

/**
 * Probe the breaker, dispatch the request if permitted, record the
 * outcome. Returns a discriminated union the caller can branch on.
 *
 * Failure modes recorded:
 *   - Network error or timeout       → 'failure', breaker counter incremented
 *   - HTTP 5xx                       → 'failure', counter incremented
 *   - HTTP 4xx (other than 429)      → 'success' (it's not the server's fault)
 *   - HTTP 429 (rate-limited)        → 'failure', breaker reason 'rate_limited'
 *   - Breaker already OPEN           → 'short_circuited', no network call
 *
 * No-supabase fallback: when this module is used in a test env or a
 * function that hasn't been given SUPABASE_SERVICE_ROLE_KEY, the
 * wrapper degrades to a plain fetch with a timeout (no breaker state).
 * The breakerKey is still surfaced in the result so logs are useful.
 */
export async function fetchWithBreaker(args: FetchWithBreakerArgs): Promise<BreakerResult> {
  // ── Probe the breaker ────────────────────────────────────────────────────
  // Hot path: if the isolate-local cache says CLOSED within the TTL, skip
  // the DB round-trip entirely. OPEN is also served from cache (saves a
  // FOR UPDATE row lock). Only cache misses pay the RPC cost.
  if (supabase) {
    const cached = _cacheGet(args.breakerKey);
    if (cached?.state === 'OPEN') {
      return { kind: 'short_circuited', breakerKey: args.breakerKey, reason: 'breaker_open' };
    }
    if (!cached) {
      // Cache miss — must ask the DB.
      const { data: probeOk, error: probeErr } = await supabase.rpc('breaker_may_probe', {
        p_breaker_key: args.breakerKey,
      });
      if (probeErr) {
        // RPC failure: log + fall through. Breaker is best-effort.
        console.warn(`[fetchWithBreaker] breaker_may_probe failed for ${args.breakerKey}: ${probeErr.message}`);
      } else if (probeOk === false) {
        _cacheSet(args.breakerKey, 'OPEN');
        return { kind: 'short_circuited', breakerKey: args.breakerKey, reason: 'breaker_open' };
      } else {
        _cacheSet(args.breakerKey, 'CLOSED');
      }
    }
    // cached.state === 'CLOSED' or 'HALF_OPEN' → allowed to proceed
  }

  // Dispatch the request with a hard timeout.
  let response: Response;
  try {
    response = await fetch(args.url, {
      ...args.init,
      signal: AbortSignal.timeout(args.timeoutMs),
    });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    const failureKind = classifyFailure(error);
    const newState = await recordOutcome(args.breakerKey, false, failureKind);
    _cacheSet(args.breakerKey, newState as 'CLOSED' | 'OPEN' | 'HALF_OPEN');
    return { kind: 'failure', breakerKey: args.breakerKey, error, newState };
  }

  if (response.status >= 500) {
    const newState = await recordOutcome(args.breakerKey, false, `http_${response.status}`);
    _cacheSet(args.breakerKey, newState as 'CLOSED' | 'OPEN' | 'HALF_OPEN');
    return {
      kind: 'failure',
      breakerKey: args.breakerKey,
      error: new Error(`upstream ${response.status} ${response.statusText}`),
      newState,
    };
  }
  if (response.status === 429) {
    const newState = await recordOutcome(args.breakerKey, false, 'rate_limited');
    _cacheSet(args.breakerKey, newState as 'CLOSED' | 'OPEN' | 'HALF_OPEN');
    return {
      kind: 'failure',
      breakerKey: args.breakerKey,
      error: new Error(`rate-limited: ${response.statusText}`),
      newState,
    };
  }

  // 2xx and 4xx (non-429) count as success for breaker purposes.
  // Fire-and-forget: the response is already in hand — don't make the
  // caller wait an extra 20-50ms for the DB write confirming CLOSED.
  _cacheSet(args.breakerKey, 'CLOSED');
  recordOutcome(args.breakerKey, true).catch(() => {});
  return { kind: 'success', breakerKey: args.breakerKey, response };
}

async function recordOutcome(
  breakerKey: string,
  succeeded: boolean,
  failureKind?: string,
): Promise<string> {
  if (!supabase) return succeeded ? 'CLOSED' : 'CLOSED';
  const { data, error } = await supabase.rpc('breaker_record_outcome', {
    p_breaker_key: breakerKey,
    p_succeeded: succeeded,
    p_failure_kind: failureKind ?? null,
  });
  if (error) {
    console.warn(`[fetchWithBreaker] record_outcome failed: ${error.message}`);
    return 'CLOSED';
  }
  return typeof data === 'string' ? data : 'CLOSED';
}

function classifyFailure(err: Error): string {
  const msg = err.message.toLowerCase();
  if (msg.includes('abort') || msg.includes('timeout')) return 'timeout';
  if (msg.includes('refused') || msg.includes('econnrefused')) return 'connection_refused';
  if (msg.includes('dns') || msg.includes('enotfound')) return 'dns';
  if (msg.includes('rate') && msg.includes('limit')) return 'rate_limited';
  return 'network';
}
