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
import { LOCAL_CACHE_TTL_MS, REMOTE_CACHE_TTL_MS } from './cacheConfig';

const LOCAL_TTL_MS  = LOCAL_CACHE_TTL_MS;   // WS12: from cacheConfig
const REMOTE_TTL_MS = REMOTE_CACHE_TTL_MS;  // WS12: from cacheConfig

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
      // undefined (old format), NaN (corrupted), or 0 (epoch default), treat
      // the entry as expired rather than returning indefinitely-stale data.
      const isValidTimestamp = typeof timestamp === 'number' && isFinite(timestamp) && timestamp > 0;
      if (isValidTimestamp && Date.now() - timestamp < LOCAL_TTL_MS) {
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

export const setCachedAnalysis = async (key: string, value: any): Promise<void> => {
  const slim = slimForCache(value); // BUG-09 FIX: strip heavy data before storing

  // Save to localStorage immediately (synchronous)
  try {
    localStorage.setItem(
      `hp_ensemble_${key}`,
      JSON.stringify({ data: slim, timestamp: Date.now() })
    );
  } catch {
    // localStorage full — skip silently
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
  const prefix = `hp_ensemble_${companyName.toLowerCase()}::`;
  const toDelete: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(prefix)) toDelete.push(k);
  }
  toDelete.forEach(k => {
    localStorage.removeItem(k);
    console.info(`[Cache] Invalidated by breaking news: ${k}`);
  });
  // Also invalidate in Supabase (fire-and-forget)
  supabase
    .from('layoff_analysis_cache')
    .delete()
    .like('key', `${companyName.toLowerCase()}::%`)
    .then(({ error }) => {
      if (error) console.warn('[Cache] Remote invalidation failed:', error.message);
    });
};
