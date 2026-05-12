// FreshnessBadge.tsx — v22.0
//
// Small "Live since {time}" indicator next to the score. Shows when the most
// recent `breaking_news_events` row for this company was inserted, so the user
// sees that the score is reflecting real-time intelligence (not a stale cache).
//
// REAL-TIME UPDATES
// ─────────────────
// Re-fetches on mount + every 60s. The Supabase Realtime subscription in
// `useCompanySignalSubscription` will trigger a recalculate on `confidence='high'`
// events, but this badge also re-queries directly so it shows freshness across
// any source (not just events that hit the realtime channel).

import React, { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
import { formatTimeAgo } from '../services/breakingNewsPoller';

interface Props {
  companyName: string | null | undefined;
}

interface FreshnessState {
  lastEventAt: Date | null;
  loading: boolean;
}

export const FreshnessBadge: React.FC<Props> = ({ companyName }) => {
  const [state, setState] = useState<FreshnessState>({ lastEventAt: null, loading: true });

  useEffect(() => {
    if (!companyName) {
      setState({ lastEventAt: null, loading: false });
      return;
    }

    let cancelled = false;
    const fetchFreshness = async (): Promise<void> => {
      try {
        // Remote schema uses `detected_at` (not `created_at`). Select both so
        // the badge survives any future column rename in either direction.
        const { data } = await supabase
          .from('breaking_news_events')
          .select('detected_at, event_date')
          .ilike('company_name', `%${companyName.toLowerCase()}%`)
          .order('detected_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cancelled) return;
        const ts = (data as { detected_at?: string; event_date?: string } | null);
        const at = ts?.detected_at ?? ts?.event_date ?? null;
        if (at) {
          setState({ lastEventAt: new Date(at), loading: false });
        } else {
          setState({ lastEventAt: null, loading: false });
        }
      } catch {
        if (!cancelled) setState({ lastEventAt: null, loading: false });
      }
    };

    void fetchFreshness();
    const id = setInterval(fetchFreshness, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [companyName]);

  if (state.loading || !state.lastEventAt) return null;

  // Older than 30 days — don't show stale freshness label (the stale banner covers it)
  const ageMs = Date.now() - state.lastEventAt.getTime();
  if (ageMs > 30 * 24 * 60 * 60 * 1000) return null;

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider"
      style={{
        background: 'rgba(16, 185, 129, 0.08)',
        color: 'rgb(110, 231, 183)',
        border: '1px solid rgba(16, 185, 129, 0.18)',
      }}
      title={`Most recent intelligence event for this company: ${state.lastEventAt.toISOString()}`}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: 'rgb(110, 231, 183)', boxShadow: '0 0 6px rgb(110, 231, 183)' }}
        aria-hidden
      />
      Live · {formatTimeAgo(state.lastEventAt)}
    </span>
  );
};

export default FreshnessBadge;
