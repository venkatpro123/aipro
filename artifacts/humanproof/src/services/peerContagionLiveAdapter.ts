// peerContagionLiveAdapter.ts — WS3
//
// Live-data adapter for peerContagionEngine. Addresses Audit Issue #8: the
// existing engine reads layoffNewsCache (a static bundled file) for peer
// events. During an actual sector wave, the static cache lags by days or
// weeks — exactly when contagion signal is most predictive.
//
// This module:
//   1. Fetches recent layoff events from breaking_news_events and
//      curated_layoff_events tables in a single batched query.
//   2. Normalizes them into the LayoffNewsEvent shape the existing engine
//      already understands (so the engine itself can stay synchronous).
//   3. Provides `computePeerContagionLive` — a thin async wrapper around
//      `computePeerContagion` that pre-fetches live events and threads them
//      through.
//
// The legacy `computePeerContagion` is untouched. Callers opt into the
// live path via `ws3_peer_contagion_live` flag at the audit pipeline layer.
// When the flag is off, the legacy static-cache path runs unchanged.
//
// Cache:
//   Live event fetches are cached at the module level for 5 minutes. A
//   typical audit pipeline run resolves multiple peer queries; sharing a
//   single fetch keeps DB load bounded.

import { supabase } from '../utils/supabase';
import { evaluateFlagSync } from '../config/featureFlags';
import { COMPANY_PEERS_DB as COMPANY_PEERS } from '../data/companyPeers';
import type { LayoffNewsEvent } from '../data/layoffNewsCache';
import {
  computePeerContagion,
  type PeerContagionInputs,
  type PeerContagionResult,
} from './peerContagionEngine';

// ── Cache ───────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000;
const LOOKBACK_DAYS = 180;

interface CacheEntry {
  events: LayoffNewsEvent[];
  fetchedAt: number;
}

let cache: CacheEntry | null = null;
let inflight: Promise<LayoffNewsEvent[]> | null = null;

// ── Event row shape ─────────────────────────────────────────────────────────

interface EventRow {
  company_name: string;
  event_date: string;
  percent_cut: number | null;
  affected_count: number | null;
  source: string;
  confidence: string;
}

function rowToEvent(r: EventRow, sourceTable: 'breaking' | 'curated'): LayoffNewsEvent {
  return {
    companyName: r.company_name,
    date: r.event_date,
    headline: r.company_name + ' layoff event',
    percentCut: r.percent_cut ?? 0,
    source: r.source ?? (sourceTable === 'breaking' ? 'breaking_news_events' : 'curated_layoff_events'),
    url: '',
    affectedDepartments: [],
  };
}

async function fetchLiveEvents(): Promise<LayoffNewsEvent[]> {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - LOOKBACK_DAYS);
  const sinceIso = since.toISOString().slice(0, 10);

  const [breakingRes, curatedRes] = await Promise.allSettled([
    supabase
      .from('breaking_news_events')
      .select('company_name,event_date,percent_cut,affected_count,source,confidence')
      .gte('event_date', sinceIso)
      .limit(2000),
    supabase
      .from('curated_layoff_events')
      .select('company_name,event_date,percent_cut,affected_count,source,confidence')
      .gte('event_date', sinceIso)
      .limit(2000),
  ]);

  const breaking: LayoffNewsEvent[] =
    breakingRes.status === 'fulfilled' && breakingRes.value.data
      ? (breakingRes.value.data as EventRow[]).map((r) => rowToEvent(r, 'breaking'))
      : [];
  const curated: LayoffNewsEvent[] =
    curatedRes.status === 'fulfilled' && curatedRes.value.data
      ? (curatedRes.value.data as EventRow[]).map((r) => rowToEvent(r, 'curated'))
      : [];

  // Dedup by (company_name lower, event_date). When both tables contain the
  // same event, prefer the row that comes from breaking_news_events because
  // it's typically the more timely path.
  const seen = new Set<string>();
  const merged: LayoffNewsEvent[] = [];
  for (const e of [...breaking, ...curated]) {
    const key = `${(e.companyName ?? '').toLowerCase()}|${e.date}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(e);
  }
  return merged;
}

async function ensureCache(): Promise<LayoffNewsEvent[]> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) return cache.events;
  if (inflight) return inflight;

  inflight = fetchLiveEvents()
    .then((events) => {
      cache = { events, fetchedAt: Date.now() };
      return events;
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.warn('[peerContagionLiveAdapter] fetch failed, using empty live set:', err);
      cache = { events: [], fetchedAt: Date.now() };
      return [];
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

// ── Synchronous core (mirrors engine logic) ─────────────────────────────────

/**
 * The existing engine's checkPeerLayoffsFromCache is module-private. We
 * replicate its matching behaviour here against the live event list so
 * `computePeerContagionLive` can substitute the data source without
 * touching the engine internals. If the engine logic diverges in the
 * future, this function must be updated to match.
 */
function checkPeerLayoffsFromEvents(
  peerCompanyId: string,
  events: LayoffNewsEvent[],
): { found: boolean; daysAgo: number; percentCut: number } {
  const normalizedPeer = peerCompanyId.toLowerCase().trim();
  const today = Date.now();
  const msPerDay = 86_400_000;

  for (const event of events) {
    const eventCompany = (event.companyName ?? '').toLowerCase();
    if (!eventCompany.includes(normalizedPeer) && !normalizedPeer.includes(eventCompany)) continue;
    const eventDate = new Date(event.date ?? '').getTime();
    if (isNaN(eventDate)) continue;
    const daysAgo = Math.floor((today - eventDate) / msPerDay);
    if (daysAgo > LOOKBACK_DAYS) continue;
    return { found: true, daysAgo, percentCut: event.percentCut ?? 0 };
  }
  return { found: false, daysAgo: 999, percentCut: 0 };
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Drop-in async replacement for `computePeerContagion`. When the
 * `ws3_peer_contagion_live` flag is on, fetches live events from
 * breaking_news_events and curated_layoff_events. Otherwise falls through
 * to the legacy static-cache engine path so callers can adopt this
 * unconditionally.
 *
 * Returns the same PeerContagionResult shape so it is transparent to
 * downstream consumers (UI panels, score amplifier blending, etc.).
 */
export async function computePeerContagionLive(inputs: PeerContagionInputs): Promise<PeerContagionResult> {
  const flag = evaluateFlagSync('ws3_peer_contagion_live');
  if (!flag.isActive && !flag.isShadow) {
    return computePeerContagion(inputs);
  }

  // Fetch live events. On failure or empty, fall back to legacy.
  const liveEvents = await ensureCache();
  if (liveEvents.length === 0) return computePeerContagion(inputs);

  // Build a SYNTHETIC sibling result by running a private re-implementation
  // of the engine that reads from `liveEvents` instead of `layoffNewsCache`.
  // Because the engine itself is not parametrisable, we run it once for the
  // static path, then OVERRIDE the affectedPeers list using live data.
  // This is admittedly imperfect — a peer that appears in live but not
  // static still gets counted via `directCompetitorCuts` recomputation.
  const base = computePeerContagion(inputs);

  // Recompute affectedPeers from live events for the same peer graph.
  const companyKey = inputs.companyName.toLowerCase().trim();
  const peers = COMPANY_PEERS.filter(
    (p) => p.companyId === companyKey || p.companyId.includes(companyKey) || companyKey.includes(p.companyId),
  );

  const liveAffected = peers
    .map((p) => {
      const hit = checkPeerLayoffsFromEvents(p.companyId, liveEvents);
      if (!hit.found) return null;
      return {
        companyName: p.companyId,
        relationshipType: p.relationshipType,
        layoffDate: new Date(Date.now() - hit.daysAgo * 86_400_000).toISOString().slice(0, 10),
        daysAgo: hit.daysAgo,
        estimatedPercentCut: hit.percentCut,
        // For contagion contribution we use the same weighting the legacy
        // engine applied — direct_competitor=1.0, adjacent=0.65, etc.
        contagionContribution:
          p.relationshipType === 'direct_competitor' ? 1.0
          : p.relationshipType === 'adjacent_market' ? 0.65
          : p.relationshipType === 'same_sector_large_cap' ? 0.50
          : 0.35,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  if (liveAffected.length === 0) return base;

  // Augment the base result with the live-derived peer list. Recompute the
  // direct/adjacent counts so the wave intensity reflects live data.
  const directCuts = liveAffected.filter((p) => p.relationshipType === 'direct_competitor').length;
  const adjacentCuts = liveAffected.filter((p) => p.relationshipType !== 'direct_competitor').length;

  return {
    ...base,
    affectedPeers: liveAffected,
    directCompetitorCuts: directCuts,
    adjacentPeerCuts: adjacentCuts,
    waveStartDate: liveAffected.reduce<string | null>((earliest, p) => {
      if (!earliest) return p.layoffDate;
      return p.layoffDate < earliest ? p.layoffDate : earliest;
    }, null),
  };
}

/**
 * Test-only: clear the in-memory cache.
 */
export function __resetCacheForTesting(): void {
  cache = null;
  inflight = null;
}
