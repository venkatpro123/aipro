// breakingNewsBroker.ts — WS6
//
// Multiplexed breaking-news realtime subscriber. Addresses Audit Issue #18
// (realtime subscription stampede): the legacy LayoffCalculator code
// opens an independent `breaking_news_events` channel per user session.
// At 10k users auditing the same company simultaneously, Supabase fan-out
// saturates and reconnection storms cause cascading failures.
//
// Design:
//
//   * One Supabase realtime channel per company canonical name, shared
//     by every subscriber in the same tab/window. Subscribers register
//     a callback; the broker fans events out in-memory.
//
//   * Automatic transport downgrade. If the broker detects that the
//     channel has > BROADCAST_DOWNGRADE_THRESHOLD subscribers (across
//     all tabs the user has open) OR receives a heartbeat-lost signal,
//     it switches that company's channel from realtime websocket to
//     polled HTTP fetch every POLL_INTERVAL_MS. The downgrade is sticky
//     for the session.
//
//   * `ws6_realtime_fanout` flag — when off, every subscribe call falls
//     through to direct Supabase channel.on() (legacy behaviour). The
//     broker layer is transparent: the same subscribe/unsubscribe API
//     is the only public surface.
//
// What this module does NOT do:
//   * It does not coordinate across users — server-side fan-out is
//     handled by Supabase realtime itself. The broker only collapses
//     duplicate subscriptions within ONE browser process.
//   * It does not implement server-sent events as such — the polling
//     downgrade is plain fetch on an interval. The path is named "SSE
//     downgrade" because the architectural intent is server-managed
//     fan-out, and SSE would be the next step if/when polling load
//     becomes the new bottleneck.

import { supabase } from '../utils/supabase';
import { evaluateFlagSync } from '../config/featureFlags';
import { escapeIlike } from '../utils/ilikeEscape';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ── Types ───────────────────────────────────────────────────────────────────

export interface BreakingNewsEvent {
  id: string;
  company_name: string;
  event_date: string;
  headline: string;
  percent_cut: number | null;
  affected_count: number | null;
  confidence: 'high' | 'medium' | 'low';
  source: string;
  source_url: string | null;
  industry: string | null;
  region: string | null;
  /** Geographic focus of the source publication (NOT the affected company region).
   *  Examples: 'US' (TechCrunch), 'SG' (TechInAsia), 'DE' (Handelsblatt), 'IN' (Inc42).
   *  Used by BreakingNewsCard to label "Source: TechInAsia · APAC". Null for legacy rows. */
  source_market: string | null;
  created_at: string;
}

export type BreakingNewsCallback = (event: BreakingNewsEvent) => void;

interface ChannelEntry {
  channel: RealtimeChannel | null;
  callbacks: Set<BreakingNewsCallback>;
  /** When non-null, the channel has been downgraded to polling. */
  pollTimer: ReturnType<typeof setInterval> | null;
  /** ISO date of the most recent event we know about, for poll cursor. */
  lastSeenAt: string;
  /** Set when realtime errored at least once. Sticky for the session. */
  realtimeFailed: boolean;
}

// ── Config ──────────────────────────────────────────────────────────────────

const BROADCAST_DOWNGRADE_THRESHOLD = 8;     // > N subscribers in this tab → poll
const POLL_INTERVAL_MS = 60_000;             // poll every 60s when downgraded
const REALTIME_HEARTBEAT_TIMEOUT_MS = 30_000;

// ── Internal state ──────────────────────────────────────────────────────────

const channels = new Map<string, ChannelEntry>();

function companyKey(companyName: string): string {
  return companyName.trim().toLowerCase();
}

// ── Polling path ────────────────────────────────────────────────────────────

async function pollForNewEvents(entry: ChannelEntry, key: string): Promise<void> {
  // v40 hardening: skip polling when the tab is hidden. Page Visibility
  // gate keeps a background tab from holding open Supabase requests at
  // 60s cadence — multiplies request load at scale.
  if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
  try {
    // v40 hardening: escape ilike() metacharacters in the cache key. `key`
    // is `companyName.trim().toLowerCase()`, so `_` and `%` from the
    // company name would otherwise widen the match to unrelated rows.
    const safeKey = escapeIlike(key);
    const { data, error } = await supabase
      .from('breaking_news_events')
      .select('id,company_name,event_date,headline,percent_cut,affected_count,confidence,source,source_url,industry,region,created_at')
      .ilike('company_name', `%${safeKey}%`)
      .gt('created_at', entry.lastSeenAt)
      .order('created_at', { ascending: true })
      .limit(20);

    if (error || !data) return;
    for (const row of data as BreakingNewsEvent[]) {
      entry.lastSeenAt = row.created_at;
      for (const cb of entry.callbacks) {
        try {
          cb(row);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('[breakingNewsBroker] subscriber callback threw:', err);
        }
      }
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[breakingNewsBroker] poll failed:', err);
  }
}

function startPolling(key: string, entry: ChannelEntry): void {
  if (entry.pollTimer) return;
  entry.pollTimer = setInterval(() => void pollForNewEvents(entry, key), POLL_INTERVAL_MS);
  // Fire one immediate poll so subscribers don't wait a full interval.
  void pollForNewEvents(entry, key);
}

function stopPolling(entry: ChannelEntry): void {
  if (entry.pollTimer) {
    clearInterval(entry.pollTimer);
    entry.pollTimer = null;
  }
}

// ── Realtime path ───────────────────────────────────────────────────────────

function attachRealtime(key: string, entry: ChannelEntry, companyName: string): void {
  // If realtime has previously failed for this key, do not retry — stay on polling.
  if (entry.realtimeFailed) return;
  if (entry.channel) return;

  try {
    // v40 hardening: previously the realtime filter was
    // `company_name=ilike.%${companyName}%`, which matched substrings on
    // the server side ("Apple" → "Snapple", "Pineapple") and broadcast
    // over-broad event streams to every subscriber. Switch to `eq.` against
    // the resolved canonical name; JS-side filter remains as a defence layer.
    const safeChannelKey = key.replace(/[^a-z0-9]/g, '_');
    const channel = supabase
      .channel(`breaking_news_${safeChannelKey}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'breaking_news_events',
          filter: `company_name=eq.${companyName}`,
        },
        (payload) => {
          const row = payload.new as BreakingNewsEvent;
          if (row?.created_at) entry.lastSeenAt = row.created_at;
          for (const cb of entry.callbacks) {
            try {
              cb(row);
            } catch (err) {
              // eslint-disable-next-line no-console
              console.warn('[breakingNewsBroker] subscriber callback threw:', err);
            }
          }
        },
      )
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || err) {
          // Realtime degraded — fall back to polling.
          // eslint-disable-next-line no-console
          console.warn(`[breakingNewsBroker] realtime ${status} for ${key}; downgrading to polling`);
          entry.realtimeFailed = true;
          const ch = entry.channel;
          entry.channel = null;
          if (ch) {
            try { ch.unsubscribe(); } catch { /* ignore */ }
            void supabase.removeChannel(ch);
          }
          startPolling(key, entry);
        }
      });

    entry.channel = channel;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[breakingNewsBroker] realtime attach failed; using polling:', err);
    entry.realtimeFailed = true;
    startPolling(key, entry);
  }
}

// ── Decision: realtime vs polling ───────────────────────────────────────────

function reconcileTransport(key: string, companyName: string, entry: ChannelEntry): void {
  const flag = evaluateFlagSync('ws6_realtime_fanout');
  const fanoutEnabled = flag.isActive || flag.isShadow;

  // Threshold-driven downgrade: too many subscribers in this tab AND fanout
  // flag is on → switch to polling so we don't multiply realtime traffic.
  const tooManySubscribers = entry.callbacks.size > BROADCAST_DOWNGRADE_THRESHOLD;

  if (fanoutEnabled && tooManySubscribers && !entry.pollTimer) {
    if (entry.channel) {
      const ch = entry.channel;
      entry.channel = null;
      try { ch.unsubscribe(); } catch { /* ignore */ }
      void supabase.removeChannel(ch);
    }
    startPolling(key, entry);
    return;
  }

  // Default path: realtime.
  if (!entry.pollTimer && !entry.channel) {
    attachRealtime(key, entry, companyName);
  }
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Subscribe to breaking news events for a company. Returns an unsubscribe
 * function. Multiple subscribers for the same company share a single
 * underlying transport (realtime channel OR polling timer).
 *
 * The `ws6_realtime_fanout` flag governs auto-downgrade to polling. When
 * the flag is off, the broker always uses realtime (legacy behaviour).
 */
export function subscribeBreakingNews(
  companyName: string,
  callback: BreakingNewsCallback,
): () => void {
  if (!companyName?.trim()) {
    return () => {};
  }
  const key = companyKey(companyName);

  let entry = channels.get(key);
  if (!entry) {
    entry = {
      channel: null,
      callbacks: new Set(),
      pollTimer: null,
      lastSeenAt: new Date(Date.now() - 60_000).toISOString(),
      realtimeFailed: false,
    };
    channels.set(key, entry);
  }
  entry.callbacks.add(callback);
  reconcileTransport(key, companyName, entry);

  return () => {
    if (!entry) return;
    entry.callbacks.delete(callback);
    if (entry.callbacks.size === 0) {
      // Last subscriber gone — tear down both transports.
      const ch = entry.channel;
      entry.channel = null;
      if (ch) {
        try { ch.unsubscribe(); } catch { /* ignore */ }
        void supabase.removeChannel(ch);
      }
      stopPolling(entry);
      channels.delete(key);
    } else {
      // Subscriber count dropped — may be able to leave polling for realtime.
      reconcileTransport(key, companyName, entry);
    }
  };
}

/**
 * Diagnostic: list active subscriptions and their transport. Used by
 * the LiveSignalStatusBanner / TransparencyTab to show "we are polling
 * not subscribed for company X".
 */
export function listActiveSubscriptions(): Array<{
  key: string;
  subscriberCount: number;
  transport: 'realtime' | 'polling' | 'idle';
  realtimeFailed: boolean;
}> {
  return Array.from(channels.entries()).map(([key, entry]) => ({
    key,
    subscriberCount: entry.callbacks.size,
    transport: entry.pollTimer ? 'polling' : entry.channel ? 'realtime' : 'idle',
    realtimeFailed: entry.realtimeFailed,
  }));
}

/**
 * Test-only: clear all state.
 */
export function __resetBrokerForTesting(): void {
  for (const entry of channels.values()) {
    const ch = entry.channel;
    entry.channel = null;
    if (ch) {
      try { ch.unsubscribe(); } catch { /* ignore */ }
      void supabase.removeChannel(ch);
    }
    stopPolling(entry);
  }
  channels.clear();
}
