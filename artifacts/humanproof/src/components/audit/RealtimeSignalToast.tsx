// RealtimeSignalToast.tsx
// Subscribes to Supabase Realtime INSERTs on `breaking_news_events` and shows
// a toast for any company the current user has audited in the last 24 hours.
//
// Companies the user cares about are tracked in localStorage under
// `hp_recently_audited` (a rolling 24h list of company names — populated by
// the audit flow whenever a user submits an audit).
//
// This component renders nothing visible — it's a side-effect-only listener.
// Mount it once near the root of the app (or under the audit dashboard
// route) so it's active while the user has the SPA open.

import { useEffect, useRef } from 'react';
import { supabase } from '../../utils/supabase';
import { useToast } from '../Toast';

interface BreakingNewsRow {
  id:             string;
  company_name:   string;
  event_date:     string;
  headline:       string;
  confidence:     'high' | 'medium' | 'low';
  source:         string;
  source_url:     string | null;
  percent_cut:    number | null;
  affected_count: number | null;
  created_at:     string;
}

const RECENT_AUDIT_LS_KEY = 'hp_recently_audited';
const RECENT_WINDOW_MS    = 24 * 60 * 60 * 1000;

/**
 * Read the rolling 24h list of audited companies from localStorage.
 * Stale entries are pruned on every read.
 */
function getRecentlyAudited(): Set<string> {
  try {
    const raw = localStorage.getItem(RECENT_AUDIT_LS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as { company: string; t: number }[];
    if (!Array.isArray(parsed)) return new Set();
    const now = Date.now();
    const fresh = parsed.filter(e => now - e.t < RECENT_WINDOW_MS);
    // Rewrite only when entries were pruned, to avoid hot loops
    if (fresh.length !== parsed.length) {
      localStorage.setItem(RECENT_AUDIT_LS_KEY, JSON.stringify(fresh));
    }
    return new Set(fresh.map(e => e.company.toLowerCase()));
  } catch {
    return new Set();
  }
}

/**
 * Add a company to the rolling list. Exported for the audit flow to call
 * when a user runs an audit.
 */
export function markCompanyRecentlyAudited(company: string): void {
  try {
    const raw = localStorage.getItem(RECENT_AUDIT_LS_KEY);
    const list = raw ? JSON.parse(raw) as { company: string; t: number }[] : [];
    const lower = company.toLowerCase();
    const filtered = list.filter(e => e.company.toLowerCase() !== lower);
    filtered.unshift({ company, t: Date.now() });
    localStorage.setItem(RECENT_AUDIT_LS_KEY, JSON.stringify(filtered.slice(0, 50)));
  } catch { /* localStorage unavailable */ }
}

export function RealtimeSignalToast(): null {
  const { addToast } = useToast();
  // Guard against duplicate toasts for the same event id across React re-renders
  const seenEventIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    // v40 hardening: salt the channel name per mount. Previously every tab
    // joined a single global channel `breaking-news-stream`, which
    // (a) caused server-side broadcast amplification under multi-tab and
    // (b) made stale channels harder to attribute on teardown. The
    // canonical company filter still runs server-side via the broker; this
    // toast is a passive listener that only filters in-memory against the
    // recently-audited list, so a per-mount salt is sufficient.
    const salt = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const channel = supabase
      .channel(`breaking-news-stream-${salt}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'breaking_news_events' },
        (payload) => {
          const row = payload.new as BreakingNewsRow;
          if (!row?.company_name || !row.id) return;
          if (seenEventIds.current.has(row.id)) return;
          seenEventIds.current.add(row.id);

          // Only toast if the user has audited this company recently.
          const audited = getRecentlyAudited();
          if (!audited.has(row.company_name.toLowerCase())) return;

          // Only toast on medium+ confidence — low-tier signals are noise.
          if (row.confidence === 'low') return;

          const detail = row.percent_cut
            ? ` (${row.percent_cut}% cut)`
            : row.affected_count
              ? ` (${row.affected_count.toLocaleString()} affected)`
              : '';
          const message = `${row.company_name}: ${row.headline.slice(0, 110)}${detail}`;

          addToast(row.confidence === 'high' ? 'error' : 'warning', message);
        },
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.info('[RealtimeSignalToast] channel:', status);
        }
      });

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch { /* ignore */ }
    };
  }, [addToast]);

  return null;
}
