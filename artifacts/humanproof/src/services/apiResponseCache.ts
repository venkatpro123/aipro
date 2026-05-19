// apiResponseCache.ts
// Cross-user shared API response cache backed by Supabase api_response_cache.
//
// PROBLEM SOLVED
// ──────────────
// Without this layer, 30 users auditing TCS in the same hour each fire an
// independent SEC EDGAR / NewsAPI / RSS fetch. The first user to hit the daily
// quota takes the last call; every subsequent user gets a degraded response.
// With shared caching, the first user's result benefits all other users until
// TTL expiry — the live call count drops from O(users) to O(1 per TTL window).
//
// HOW IT WORKS
// ────────────
// 1. Before every external API call, `readCache(api, key)` queries
//    api_response_cache WHERE (api_name, cache_key, expires_at > NOW()).
// 2. If a row is found: return the payload with `_cachedAt` / `_cacheAgeSeconds`
//    metadata so the caller can label the response age in the UI.
// 3. If no row (expired or never fetched): the caller makes the live API call,
//    then calls `writeCache(api, key, payload)` to prime the cache for others.
//
// AGE DISCLOSURE
// ──────────────
// Every cached payload carries `_cachedAt` (ISO string) and `_cacheAgeSeconds`
// (integer) in the returned wrapper. Callers MUST surface this in the UI —
// "Stock data: 2 hours old" is accurate; silently serving 6-hour-old stock
// data as "live" is a trust violation.
//
// TTLs PER API (conservative — chosen to respect free-tier limits)
// ─────────────────────────────────────────────────────────────────
//   sec-edgar     : 6 hours  — SEC EDGAR is rate-limited per IP; 8-K filings
//                              are not published in real-time anyway.
//   newsapi       : 2 hours  — NewsAPI 100/day free tier; layoff news rarely
//                              breaks and re-breaks in a 2-hour window.
//   rss2json      : 30 min   — rss2json 100/day; breaking news needs faster TTL.
//   naukri / bse  : 4 hours  — Hiring data and stock data are semi-daily.
//   yahoo-finance : 1 hour   — Used as fallback; AlphaVantage 25/day is primary.
//   alphavantage  : 8 hours  — 25 calls/day max; spread across the day.
//   serper        : 4 hours  — Paid; rate-limit headroom exists but quota is paid.
//   warn-act      : 12 hours — WARN Act filings are published once per business day.

import { supabase } from '../utils/supabase';
import type { CircuitApiName } from './apiCircuitBreaker';

// ── TTL configuration ─────────────────────────────────────────────────────────

export const API_CACHE_TTL_SECONDS: Record<CircuitApiName, number> = {
  'sec-edgar':     6  * 3600,   // 6 hours
  'newsapi':       2  * 3600,   // 2 hours
  'rss2json':      30 * 60,     // 30 minutes
  'naukri':        4  * 3600,   // 4 hours
  'bse':           4  * 3600,   // 4 hours
  'yahoo-finance': 1  * 3600,   // 1 hour
  'alphavantage':  8  * 3600,   // 8 hours
  'serper':        4  * 3600,   // 4 hours
  'warn-act':      12 * 3600,   // 12 hours
};

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CachedApiResponse<T> {
  payload: T;
  /** ISO string of when the live call was made */
  cachedAt: string;
  /** Seconds since the live call was made */
  cacheAgeSeconds: number;
  /** Human-readable age label e.g. "2 hours ago" */
  cacheAgeLabel: string;
  /** True — always set so callers can distinguish cache hits from live */
  fromSharedCache: true;
}

// ── Age label helper ──────────────────────────────────────────────────────────

export function formatCacheAge(fetchedAt: string): { cacheAgeSeconds: number; cacheAgeLabel: string } {
  const ageMs = Date.now() - new Date(fetchedAt).getTime();
  const cacheAgeSeconds = Math.max(0, Math.floor(ageMs / 1000));
  const mins  = Math.floor(cacheAgeSeconds / 60);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);

  let cacheAgeLabel: string;
  if (days  >= 1) cacheAgeLabel = `${days} day${days  !== 1 ? 's' : ''} old`;
  else if (hours >= 1) cacheAgeLabel = `${hours} hour${hours !== 1 ? 's' : ''} old`;
  else if (mins  >= 1) cacheAgeLabel = `${mins} minute${mins !== 1 ? 's' : ''} old`;
  else cacheAgeLabel = 'just fetched';

  return { cacheAgeSeconds, cacheAgeLabel };
}

// ── Cache key normalization ────────────────────────────────────────────────────
// Must match the LOWER() normalization applied in the DB upsert function.

function normalizeKey(key: string): string {
  return key.toLowerCase().trim();
}

// ── Read ──────────────────────────────────────────────────────────────────────

/**
 * Check the shared Supabase cache for a non-expired entry.
 *
 * Returns `null` when:
 *   - No row exists for (api, key)
 *   - Row exists but is expired (expires_at < NOW() — filtered by RLS SELECT policy)
 *   - Supabase is unreachable (non-fatal — caller should proceed with live fetch)
 *
 * Returns a `CachedApiResponse<T>` when a valid cached row is found.
 * The caller MUST surface `cacheAgeLabel` in the UI.
 */
export async function readCache<T>(
  api: CircuitApiName,
  key: string,
): Promise<CachedApiResponse<T> | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('api_response_cache')
      .select('payload, fetched_at')
      .eq('api_name', api)
      .eq('cache_key', normalizeKey(key))
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error || !data) return null;

    const { cacheAgeSeconds, cacheAgeLabel } = formatCacheAge(data.fetched_at);
    return {
      payload: data.payload as T,
      cachedAt: data.fetched_at,
      cacheAgeSeconds,
      cacheAgeLabel,
      fromSharedCache: true,
    };
  } catch {
    // Network failure or Supabase unavailable — non-fatal, caller falls through to live API
    return null;
  }
}

// ── Write ─────────────────────────────────────────────────────────────────────

/**
 * Write a live API response to the shared Supabase cache.
 * Fire-and-forget — errors never surface to the caller.
 *
 * Uses the `upsert_api_response_cache` RPC so the write is a single round-trip
 * (SELECT + upsert merged into one DB function call).
 *
 * The payload must be JSON-serializable. Non-serializable values (functions,
 * undefined, circular refs) will cause the write to silently fail — that is
 * acceptable because the live result has already been returned to the caller.
 */
export function writeCache<T>(
  api: CircuitApiName,
  key: string,
  payload: T,
): void {
  if (!supabase) return;
  const ttl = API_CACHE_TTL_SECONDS[api] ?? 3600;

  // Attempt JSON serialization first — bail silently if the payload is not
  // serializable (e.g. contains undefined values at the top level).
  let jsonPayload: object;
  try {
    jsonPayload = JSON.parse(JSON.stringify(payload));
  } catch {
    return;
  }

  void supabase
    .rpc('upsert_api_response_cache', {
      p_api_name:    api,
      p_cache_key:   normalizeKey(key),
      p_payload:     jsonPayload,
      p_ttl_seconds: ttl,
    })
    .then(({ error }) => {
      if (error) console.info(`[ApiResponseCache] write failed for ${api}/${key}:`, error.message);
    });
}

// ── Convenience wrapper ────────────────────────────────────────────────────────

/**
 * Execute `liveFn` with shared-cache protection.
 *
 * 1. Checks the shared Supabase cache first.
 *    → Cache hit: returns payload with age metadata; live call skipped.
 * 2. Cache miss: calls `liveFn()`.
 *    → On success: writes result to cache (fire-and-forget) then returns it.
 *    → On failure: re-throws so the caller's circuit breaker can record the failure.
 *
 * The returned object shape:
 *   { data: T; fromSharedCache: boolean; cacheAgeLabel: string | null; cachedAt: string | null }
 *
 * Callers surface `cacheAgeLabel` in the UI whenever `fromSharedCache === true`.
 */
export async function withSharedCache<T>(
  api: CircuitApiName,
  key: string,
  liveFn: () => Promise<T>,
): Promise<{ data: T; fromSharedCache: boolean; cacheAgeLabel: string | null; cachedAt: string | null }> {
  const cached = await readCache<T>(api, key);
  if (cached) {
    return {
      data: cached.payload,
      fromSharedCache: true,
      cacheAgeLabel: cached.cacheAgeLabel,
      cachedAt: cached.cachedAt,
    };
  }

  const data = await liveFn(); // throws on failure — caller handles it
  writeCache(api, key, data);  // fire-and-forget
  return { data, fromSharedCache: false, cacheAgeLabel: null, cachedAt: null };
}
