// cacheConfig.ts — WS12
//
// Single source of TTL truth. Before this module, the codebase had three
// independent TTL constants:
//   * analysisCache.LOCAL_TTL_MS  = 10 min
//   * analysisCache.REMOTE_TTL_MS = 2 hours
//   * scraperTrigger.FRESH_WINDOW_MS = 30 min (the gate that decides
//     "is this cache result fresh enough to skip a scrape?")
//
// The 2h remote TTL combined with the 30-min gate meant Supabase-cached
// entries up to 2 hours stale could win against fresh scrapes. WS12
// collapses the three constants into one:
//
//   CACHE_TTL_MS = 30 * 60 * 1000 (30 minutes)
//
// Local cache, remote cache, and the freshness gate all read from this
// constant. The lint rule `no-uncalibrated-magic-number` ALSO covers
// TTL literals: any numeric duration in cache-handling code that is not
// imported from this module fails CI.
//
// Why 30 minutes? It's the lower bound of "fresh enough to skip the
// scrape" (some scrapes take 8s — we should not pay that latency for
// data that's been around for less than half an hour) and the upper
// bound of "user will tolerate seeing the previous value" (30 min is
// the rough cadence of new breaking-news events that change scores).

/**
 * Canonical cache TTL. Used by:
 *   - analysisCache (local + remote layers)
 *   - scraperTrigger.FRESH_WINDOW_MS (the dedup-skip gate)
 *   - any new cache layer added downstream
 *
 * Do NOT introduce a separate constant. If a future cache layer needs
 * a different TTL, the right answer is to either prove it empirically
 * (a CalibrationConstant row) or to widen the conversation about why
 * this number is wrong for it.
 */
export const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Convenience alias for code that wants explicit semantics. Currently
 * identical to CACHE_TTL_MS — kept as a separate export so a future
 * "local quick check" tier (e.g. last-1-min cache) doesn't require a
 * codebase-wide find/replace.
 */
export const LOCAL_CACHE_TTL_MS = CACHE_TTL_MS;
export const REMOTE_CACHE_TTL_MS = CACHE_TTL_MS;

/**
 * The freshness gate that decides whether to skip a scrape. Same value
 * as the cache TTL — if the cache hit is fresh by the gate's
 * definition, we trust it.
 */
export const FRESH_WINDOW_MS = CACHE_TTL_MS;

/**
 * Maximum data age, in seconds, before the UI shows a STALE badge.
 * Independent of CACHE_TTL_MS: a result CAN be served past the cache
 * TTL when no fresher data exists (cache used as last-resort), but the
 * user is told the data is stale.
 */
export const STALE_BADGE_THRESHOLD_SECONDS = 60 * 60; // 1 hour

/**
 * v39.0 D6 — Hard cache kill switch.
 *
 * Cache entries older than this are NEVER served, not even as stale-while-
 * revalidate. The 24h ceiling protects against:
 *   - users serving a 3-day-old audit result without realising it
 *   - the upstream OSINT pipeline silently failing for days while cached
 *     data continues to render
 *   - score drift past empirical-calibration bounds (CI metadata becomes
 *     misleading at >24h since the calibration set itself may have shifted)
 *
 * Within [CACHE_TTL_MS, CACHE_HARD_KILL_MS] the cache is served as STALE
 * and the caller is expected to fire-and-forget a background refresh.
 * Beyond CACHE_HARD_KILL_MS the entry is evicted and the caller must
 * compute fresh.
 */
export const CACHE_HARD_KILL_MS = 24 * 60 * 60 * 1000; // 24 hours
