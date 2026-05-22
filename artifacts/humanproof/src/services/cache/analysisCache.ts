// analysisCache.ts
// Dual-layer cache: localStorage (30min) → Supabase (30min TTL).
//
// WS12 — TTL collapsed to a single 30-min value (cacheConfig.ts).
// Previously this file held its own LOCAL_TTL_MS (10min) and
// REMOTE_TTL_MS (2h) which combined with scraperTrigger's
// FRESH_WINDOW_MS (30min) gate produced an inconsistent "fresh" rule:
// a Supabase entry 1h45m old could be served while the gate believed
// the cache was fresh. cacheConfig.CACHE_TTL_MS is the new single
// source of truth.
//
// WS12 — local-cache timestamp bug fixed. The legacy code stamped
// `timestamp: Date.now()` when promoting a Supabase hit to local
// storage. That reset the local TTL on every remote hit, so a
// long-lived tab could keep a 2h-stale Supabase entry "fresh" forever.
// Now the original `created_at` from the Supabase row is preserved.
//
// Breaking-news invalidation: invalidateForCompany() below clears
// cache entries for a specific company key so injectLayoffEvent() can
// force fresh scoring immediately.
//
// Table required: layoff_analysis_cache (id UUID, key TEXT UNIQUE,
// data JSONB, created_at TIMESTAMPTZ).

import { supabase } from '../../utils/supabase';
import { LOCAL_CACHE_TTL_MS, REMOTE_CACHE_TTL_MS, CACHE_HARD_KILL_MS } from './cacheConfig';

const LOCAL_TTL_MS  = LOCAL_CACHE_TTL_MS;   // WS12: from cacheConfig
const REMOTE_TTL_MS = REMOTE_CACHE_TTL_MS;  // WS12: from cacheConfig

// ── Market-specific cache slot ─────────────────────────────────────────────────
//
// Stores the hiring-connector outputs and region-specific LLM text for one
// {company, role, region} triple. Cached separately from the market-neutral
// EnsembleResult so a US user's San Francisco job-count data can never
// contaminate an India user's Bengaluru audit of the same company.
//
// Key format:
//   market-neutral:  mn::{8-part-compound-key}  (localStorage prefix: hp_ensemble_mn_)
//   market-specific: ms::{company}::{role}::{canonicalRegion}
//                    (localStorage prefix: hp_ensemble_ms_)
//
// Resolution on cache read:
//   1. Neutral hit + specific hit (user.region)  → merge and return immediately
//   2. Neutral hit + specific miss               → run market hiring connector only
//                                                   (fast, no LLM), cache slot, merge
//   3. Neutral miss                              → full compute, split, cache both
//
// The score is treated as market-neutral (it reflects company-level signals L1-L8
// primarily; the L9 job-market contribution is minor and doesn't justify a per-region
// score recomputation on cache hit). The market-specific slot provides the hiring data
// that drives UI displays (job counts, demand trend) and suppresses cross-region
// LLM text contamination (oneActionThisWeek, indiaSpecificInsight).

export interface MarketSpecificSlot {
  /** Canonical region key (e.g., 'IN', 'US', 'SG'). */
  region: string;
  /** Hiring posting trend from the market-appropriate connector. */
  hiringPostingTrend: 'growing' | 'stable' | 'declining' | 'frozen' | null;
  hiringFreezeScore: number;
  hiringIsLive: boolean;
  hiringSource: string;
  hiringDisclosure: string;
  estimatedRoleOpenings: number | null;
  naukriOpenings: number | null;
  linkedinOpenings: number | null;
  hiringFetchedAt: string | null;
  /** Market-specific LLM text — null when slot was hydrated from connector only (no LLM rerun). */
  oneActionThisWeek: string | null;
  indiaSpecificInsight: string | null;
  whatChangesRiskMost: string | null;
  /** Unix ms timestamp when this slot was computed. */
  _cachedAt: number;
}

function canonicalRegion(region: string | null | undefined): string {
  if (!region) return '';
  return region.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_');
}

export function buildMarketNeutralKey(parts: string[]): string {
  return `mn::${parts.join('::')}`;
}

export function buildMarketSpecificKey(
  companyName: string,
  roleTitle: string,
  region: string,
): string {
  return `ms::${companyName.toLowerCase()}::${roleTitle.toLowerCase()}::${canonicalRegion(region)}`;
}

const MS_LOCAL_PREFIX = 'hp_ensemble_ms_';

export const getMarketSpecificSlot = async (
  companyName: string,
  roleTitle: string,
  region: string,
): Promise<MarketSpecificSlot | null> => {
  const key = buildMarketSpecificKey(companyName, roleTitle, region);
  const now  = Date.now();

  // ── Layer 1: localStorage ──
  try {
    const raw = localStorage.getItem(`${MS_LOCAL_PREFIX}${key}`);
    if (raw) {
      const { data, timestamp } = JSON.parse(raw) ?? {};
      const validTs = typeof timestamp === 'number' && isFinite(timestamp) && timestamp > 0;
      if (validTs && now - timestamp < LOCAL_TTL_MS) return data as MarketSpecificSlot;
      try { localStorage.removeItem(`${MS_LOCAL_PREFIX}${key}`); } catch { /* ignore */ }
    }
  } catch { /* ignore */ }

  // ── Layer 2: Supabase ──
  try {
    const { data } = await supabase
      .from('layoff_analysis_cache')
      .select('data, created_at')
      .eq('key', key)
      .single();
    if (data && now - new Date(data.created_at).getTime() < REMOTE_TTL_MS) {
      try {
        const ts = new Date(data.created_at).getTime();
        localStorage.setItem(`${MS_LOCAL_PREFIX}${key}`, JSON.stringify({ data: data.data, timestamp: ts }));
      } catch { /* storage full */ }
      return data.data as MarketSpecificSlot;
    }
  } catch { /* Supabase unavailable */ }

  return null;
};

export const setMarketSpecificSlot = (
  companyName: string,
  roleTitle: string,
  region: string,
  slot: MarketSpecificSlot,
): void => {
  const key = buildMarketSpecificKey(companyName, roleTitle, region);
  try {
    localStorage.setItem(`${MS_LOCAL_PREFIX}${key}`, JSON.stringify({ data: slot, timestamp: Date.now() }));
  } catch { /* storage full — non-fatal */ }

  // Fire-and-forget remote write
  supabase
    .from('layoff_analysis_cache')
    .upsert({ key, data: slot, created_at: new Date().toISOString() }, { onConflict: 'key' })
    .then(({ error }) => {
      if (error) console.warn('[Cache] MarketSpecificSlot Supabase write failed:', error.message);
    });
};

/**
 * Overlay a MarketSpecificSlot onto a cached EnsembleResult.
 * Patches all market-sensitive fields with region-correct values.
 * Returns the merged result — does NOT mutate either argument.
 */
export const mergeMarketSlot = (ensembleResult: any, slot: MarketSpecificSlot): any => ({
  ...ensembleResult,
  // Hiring connector outputs — override whatever was baked in from the neutral cache
  _marketSpecific: slot,
  // Use LLM text from the region-specific slot only. Never fall back to the neutral
  // cache's text: the neutral was generated with companyData.region (company HQ), not
  // the user's geographic market. A Bengaluru Microsoft SDE must not receive SF action
  // text just because the connector-only slot has no LLM output. Null is correct here —
  // the UI handles it with a generic fallback that doesn't assert a wrong geography.
  oneActionThisWeek:    slot.oneActionThisWeek    ?? null,
  indiaSpecificInsight: slot.indiaSpecificInsight  ?? null,
  whatChangesRiskMost:  slot.whatChangesRiskMost   ?? null,
});

/**
 * Build a MarketSpecificSlot from a fresh live hiring-data result (companyData fields).
 * Called after a full audit compute to extract the market-specific portion for caching.
 */
export const extractMarketSlot = (
  companyData: Record<string, any>,
  region: string,
  llmOutputs: {
    oneActionThisWeek: string | null;
    indiaSpecificInsight: string | null;
    whatChangesRiskMost: string | null;
  },
): MarketSpecificSlot => ({
  region: canonicalRegion(region),
  hiringPostingTrend: companyData._hiringPostingTrend ?? null,
  hiringFreezeScore:  companyData._hiringFreezeScore  ?? 0.35,
  hiringIsLive:       companyData._hiringIsLive       ?? false,
  hiringSource:       companyData._hiringSource       ?? 'heuristic',
  hiringDisclosure:   companyData._hiringDisclosure   ?? '',
  estimatedRoleOpenings: companyData._estimatedRoleOpenings ?? null,
  naukriOpenings:    companyData._naukriOpenings    ?? null,
  linkedinOpenings:  companyData._linkedinOpenings  ?? null,
  hiringFetchedAt:   companyData._hiringFetchedAt   ?? null,
  oneActionThisWeek:    llmOutputs.oneActionThisWeek,
  indiaSpecificInsight: llmOutputs.indiaSpecificInsight,
  whatChangesRiskMost:  llmOutputs.whatChangesRiskMost,
  _cachedAt: Date.now(),
});

/**
 * Build a MarketSpecificSlot from a hiring connector result alone (no LLM text).
 * Used when the neutral cache is hit but the market-specific slot is absent —
 * we run the connector only and cache the slot without expensive LLM re-generation.
 */
export const slotFromHiringConnector = (
  roleData: {
    demandTrend: 'rising' | 'stable' | 'falling';
    hiringFreezeScore: number;
    isLive: boolean;
    source: string;
    disclosure: string;
    estimatedOpenings: number | null;
    naukriOpenings: number | null;
    linkedinOpenings: number | null;
    fetchedAt: string;
  },
  region: string,
): MarketSpecificSlot => ({
  region: canonicalRegion(region),
  hiringPostingTrend:  trendToPosting(roleData.demandTrend),
  hiringFreezeScore:   roleData.hiringFreezeScore,
  hiringIsLive:        roleData.isLive,
  hiringSource:        roleData.source,
  hiringDisclosure:    roleData.disclosure,
  estimatedRoleOpenings: roleData.estimatedOpenings,
  naukriOpenings:      roleData.naukriOpenings,
  linkedinOpenings:    roleData.linkedinOpenings,
  hiringFetchedAt:     roleData.fetchedAt,
  // No LLM outputs — caller gets null; UI falls back gracefully
  oneActionThisWeek:    null,
  indiaSpecificInsight: null,
  whatChangesRiskMost:  null,
  _cachedAt: Date.now(),
});

function trendToPosting(
  trend: 'rising' | 'stable' | 'falling',
): 'growing' | 'stable' | 'declining' | 'frozen' {
  if (trend === 'rising')  return 'growing';
  if (trend === 'falling') return 'declining';
  return 'stable';
}

/**
 * v39.0 D6 — SWR metadata wrapper.
 *
 * When a caller wants stale-while-revalidate semantics, they use
 * `getCachedAnalysisWithMetadata` instead of `getCachedAnalysis`. The
 * returned `isStale` flag tells the caller whether to fire-and-forget a
 * background refresh while still serving the cached value immediately.
 */
export interface CachedAnalysisWithMetadata {
  data: any;
  ageMs: number;
  isStale: boolean;       // true when ageMs > LOCAL_TTL_MS (cache still served)
  source: 'local' | 'remote';
}

// BUG-09 FIX: strip heavy swarm visualization data before caching to prevent
// localStorage quota overflow (~80KB → ~5KB per entry)
const slimForCache = (value: any): any => {
  if (!value) return value;
  const slim = { ...value };
  if (slim.swarmReport) {
    slim.swarmReport = {
      swarmRiskScore:    slim.swarmReport.swarmRiskScore,
      swarmConfidence:   slim.swarmReport.swarmConfidence,
      categoryBreakdown: slim.swarmReport.categoryBreakdown,
      liveAgentsUsed:    slim.swarmReport.liveAgentsUsed,
      totalAgentsRun:    slim.swarmReport.totalAgentsRun,
      generatedAt:       slim.swarmReport.generatedAt,
      anomalies:         slim.swarmReport.anomalies?.slice(0, 3) ?? [],
      dominantSignals:   slim.swarmReport.dominantSignals?.slice(0, 3).map((s: any) => ({
        agentId: s.agentId, signal: s.signal, category: s.category,
      })) ?? [],
      // Omit visualizationGraph (nodes array) and full agent metadata
    };
  }
  return slim;
};

export const getCachedAnalysis = async (key: string): Promise<any | null> => {
  // ── Layer 1: localStorage (instant, per-device) ──
  try {
    const raw = localStorage.getItem(`hp_ensemble_${key}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      const { data, timestamp } = parsed ?? {};
      // Guard: timestamp must be a valid finite positive number. If it's
      // undefined (old format), NaN (corrupted), 0 (epoch default), or a
      // far-future date (clock corruption), treat the entry as expired.
      // Allow 60 seconds of future skew to tolerate small clock differences
      // (VM users, NTP-resync moments) without invalidating fresh cache.
      const now = Date.now();
      const CLOCK_SKEW_TOLERANCE_MS = 60_000;
      const isValidTimestamp = typeof timestamp === 'number'
        && isFinite(timestamp)
        && timestamp > 0
        && timestamp <= now + CLOCK_SKEW_TOLERANCE_MS;
      if (isValidTimestamp && now - timestamp < LOCAL_TTL_MS) {
        console.log('[Cache] HIT localStorage:', key);
        return data;
      }
      // Expired or invalid — proactively evict to keep storage clean
      if (!isValidTimestamp) {
        try { localStorage.removeItem(`hp_ensemble_${key}`); } catch { /* ignore */ }
      }
    }
  } catch {
    // ignore parse/access errors (corrupted storage, private browsing, quota)
  }

  // ── Layer 2: Supabase (shared across devices) ──
  try {
    const { data } = await supabase
      .from('layoff_analysis_cache')
      .select('data, created_at')
      .eq('key', key)
      .single();

    if (data && (Date.now() - new Date(data.created_at).getTime()) < REMOTE_TTL_MS) {
      console.log('[Cache] HIT Supabase:', key);
      // WS12 — promote to localStorage WITHOUT bumping the timestamp.
      // Use the original Supabase created_at so the local TTL ages
      // correctly. The legacy `Date.now()` here was the source of the
      // "indefinite freshness" bug.
      try {
        const originalMs = new Date(data.created_at).getTime();
        localStorage.setItem(
          `hp_ensemble_${key}`,
          JSON.stringify({ data: data.data, timestamp: originalMs })
        );
      } catch { /* storage full */ }
      return data.data;
    }
  } catch {
    // Supabase unavailable — continue
  }

  console.log('[Cache] MISS:', key);
  return null;
};

// v40.0 FIX-9: LRU-style eviction. Cap total hp_ensemble_ entries at MAX_LOCAL_ENTRIES;
// when full, drop the oldest entries first. Prevents silent localStorage quota
// exhaustion after heavy users audit dozens of companies.
const MAX_LOCAL_ENTRIES = 40;
const evictOldestEntries = (): void => {
  try {
    // Snapshot all matching keys first to avoid race conditions with other tabs
    // mutating localStorage during iteration.
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('hp_ensemble_')) keys.push(k);
    }
    if (keys.length <= MAX_LOCAL_ENTRIES) return;

    const entries: Array<{ key: string; ts: number }> = [];
    for (const k of keys) {
      const raw = localStorage.getItem(k);
      if (raw == null) continue; // key was deleted by another tab between snapshot and read
      try {
        const parsed = JSON.parse(raw);
        entries.push({ key: k, ts: typeof parsed.timestamp === 'number' ? parsed.timestamp : 0 });
      } catch {
        // Corrupted — schedule for removal (ts=0 puts it at the front of eviction queue)
        entries.push({ key: k, ts: 0 });
      }
    }
    if (entries.length <= MAX_LOCAL_ENTRIES) return;
    entries.sort((a, b) => a.ts - b.ts); // oldest first
    const toEvict = entries.slice(0, entries.length - MAX_LOCAL_ENTRIES);
    for (const e of toEvict) {
      try { localStorage.removeItem(e.key); } catch { /* swallow */ }
    }
  } catch { /* localStorage unavailable */ }
};

export const setCachedAnalysis = async (key: string, value: any): Promise<void> => {
  const slim = slimForCache(value); // BUG-09 FIX: strip heavy data before storing
  evictOldestEntries(); // v40.0 FIX-9: keep cache bounded

  // Save to localStorage immediately (synchronous)
  try {
    localStorage.setItem(
      `hp_ensemble_${key}`,
      JSON.stringify({ data: slim, timestamp: Date.now() })
    );
  } catch {
    // localStorage full — try evicting half the cache and retry once
    try {
      const entries: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('hp_ensemble_')) entries.push(k);
      }
      // Remove half
      for (let i = 0; i < Math.ceil(entries.length / 2); i++) {
        try { localStorage.removeItem(entries[i]); } catch { /* swallow */ }
      }
      localStorage.setItem(
        `hp_ensemble_${key}`,
        JSON.stringify({ data: slim, timestamp: Date.now() })
      );
    } catch { /* still full — give up */ }
  }

  // Save to Supabase async — don't block the UI
  supabase
    .from('layoff_analysis_cache')
    .upsert({ key, data: slim, created_at: new Date().toISOString() }, { onConflict: 'key' })
    .then(({ error }) => {
      if (error) console.warn('[Cache] Supabase upsert failed:', error.message);
      else console.log('[Cache] Saved to Supabase:', key);
    });
};

/**
 * Return the local-cache write timestamp for a key, or null if not cached / expired.
 * Used by the cache-hit banner to display "Cached result from X minutes ago."
 */
export const getCacheTimestamp = (key: string): number | null => {
  try {
    const raw = localStorage.getItem(`hp_ensemble_${key}`);
    if (!raw) return null;
    const { timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp < LOCAL_TTL_MS) return timestamp as number;
    return null;
  } catch {
    return null;
  }
};

/**
 * Invalidate all cache entries whose key starts with the given company prefix.
 * Called immediately when a breaking news event is injected for a company that
 * has a cached result — forces fresh scoring on the next submit.
 *
 * @param companyName  Plain company name (case-insensitive). Matches cache keys
 *                     that begin with `{companyName.toLowerCase()}::`.
 */
export const invalidateForCompany = (companyName: string): void => {
  const co = companyName.toLowerCase();
  // Legacy neutral key prefix (pre-Task-C, no mn:: prefix)
  const legacyPrefix = `hp_ensemble_${co}::`;
  // Task-C market-neutral prefix
  const mnPrefix = `hp_ensemble_mn_mn::${co}::`;
  // Task-C market-specific prefix (company is second segment after ms::)
  const msPrefix = `hp_ensemble_ms_ms::${co}::`;
  const toDelete: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k) continue;
    if (k.startsWith(legacyPrefix) || k.startsWith(mnPrefix) || k.startsWith(msPrefix)) {
      toDelete.push(k);
    }
  }
  toDelete.forEach(k => {
    localStorage.removeItem(k);
    console.info(`[Cache] Invalidated by breaking news: ${k}`);
  });
  // Supabase fire-and-forget — clear legacy, mn::, and ms:: keys for this company
  supabase
    .from('layoff_analysis_cache')
    .delete()
    .or(`key.like.${co}::%,key.like.mn::${co}::%,key.like.ms::${co}::%`)
    .then(({ error }) => {
      if (error) console.warn('[Cache] Remote invalidation failed:', error.message);
    });
};

/**
 * v39.0 D6 — SWR getter with hard kill switch.
 *
 * Resolution order:
 *   1. localStorage fresh (age < LOCAL_TTL_MS)           → return {data, isStale:false}
 *   2. Supabase fresh    (age < REMOTE_TTL_MS)           → return {data, isStale:false}
 *   3. localStorage stale (TTL < age < HARD_KILL_MS)     → return {data, isStale:true}  ← caller schedules refresh
 *   4. Supabase stale    (TTL < age < HARD_KILL_MS)      → return {data, isStale:true}
 *   5. > HARD_KILL_MS                                    → evict + return null
 *
 * Callers should:
 *   - Render the returned data immediately (no UI blocking)
 *   - When isStale: true, fire-and-forget a background refresh
 *   - When null: compute fresh as today
 */
export const getCachedAnalysisWithMetadata = async (
  key: string,
): Promise<CachedAnalysisWithMetadata | null> => {
  // ── Layer 1: localStorage ──
  try {
    const raw = localStorage.getItem(`hp_ensemble_${key}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      const { data, timestamp } = parsed ?? {};
      const validTs = typeof timestamp === 'number' && isFinite(timestamp) && timestamp > 0;
      if (validTs) {
        const age = Date.now() - timestamp;
        if (age < CACHE_HARD_KILL_MS) {
          return {
            data,
            ageMs: age,
            isStale: age >= LOCAL_TTL_MS,
            source: 'local',
          };
        }
        // Past hard kill — evict
        try { localStorage.removeItem(`hp_ensemble_${key}`); } catch { /* ignore */ }
      } else {
        try { localStorage.removeItem(`hp_ensemble_${key}`); } catch { /* ignore */ }
      }
    }
  } catch {
    // ignore
  }

  // ── Layer 2: Supabase ──
  try {
    const { data } = await supabase
      .from('layoff_analysis_cache')
      .select('data, created_at')
      .eq('key', key)
      .single();

    if (data) {
      const age = Date.now() - new Date(data.created_at).getTime();
      if (age < CACHE_HARD_KILL_MS) {
        // Promote to localStorage preserving ORIGINAL timestamp
        try {
          const ts = new Date(data.created_at).getTime();
          localStorage.setItem(`hp_ensemble_${key}`, JSON.stringify({ data: data.data, timestamp: ts }));
        } catch { /* storage full */ }
        return {
          data: data.data,
          ageMs: age,
          isStale: age >= REMOTE_TTL_MS,
          source: 'remote',
        };
      }
      // Past hard kill — evict remotely too (fire-and-forget)
      supabase.from('layoff_analysis_cache').delete().eq('key', key)
        .then(() => undefined, () => undefined);
    }
  } catch {
    // ignore
  }

  return null;
};
