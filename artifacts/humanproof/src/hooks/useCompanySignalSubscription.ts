// useCompanySignalSubscription.ts
// Subscribes to Supabase Realtime for the currently-audited company on TWO tables:
//
//   1. company_intelligence — pipeline updates (weekly batch, confidence refresh)
//   2. breaking_news_events — intra-day breaking layoff announcements
//
// Previously only company_intelligence was watched, so breaking news that arrived
// after the user calculated would never trigger a toast or recalculate prompt.
//
// DESIGN DECISIONS
// ─────────────────
// • Uses `dbCompanyName` (the exact DB row name) for the filter, not the raw user
//   input. Previously the filter used the user's typed name which is case-sensitive
//   in Supabase Realtime eq filters — "google" would miss a DB row named "Google".
// • Debounced to 60s — rapid batch writes don't spawn a toast storm.
// • breaking_news_events uses a LIKE filter (ilike not available in realtime);
//   we normalise both sides to lowercase before comparison in the handler.
// • Re-subscribes on companyName change — navigating between audits picks up the new company.

import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase';
import { injectLayoffEvent } from '../data/layoffNewsCache';

const DEBOUNCE_MS = 60_000;

interface SubscriptionOptions {
  /** Raw user input (used as display label only). */
  companyName: string | null | undefined;
  /** Exact company_name value from the DB row — used for the realtime filter.
   *  Falls back to companyName when not provided (same behaviour as before). */
  dbCompanyName?: string | null;
  onRefresh?: (() => void) | undefined;
}

export function useCompanySignalSubscription(
  companyNameOrOptions: string | null | undefined | SubscriptionOptions,
  onRefresh?: (() => void) | undefined,
): void {
  // Support legacy call signature: useCompanySignalSubscription(name, onRefresh)
  const opts: SubscriptionOptions =
    typeof companyNameOrOptions === 'object' && companyNameOrOptions !== null && 'companyName' in companyNameOrOptions
      ? companyNameOrOptions
      : { companyName: companyNameOrOptions as string | null | undefined, onRefresh };

  const companyName  = opts.companyName;
  const dbCompanyName = opts.dbCompanyName ?? companyName;
  const refresh      = opts.onRefresh ?? onRefresh;

  const lastToastAt = useRef<number>(0);

  const stableRefresh = useCallback(() => {
    refresh?.();
  }, [refresh]);

  // v22.0 — when `autoRecalc` is true (only for high-confidence events) the
  // toast is informational and the score recomputes silently. For lower
  // confidence events the user still chooses to apply via "Recalculate", which
  // preserves the no-surprise-mutations trust contract.
  const fireToast = useCallback((label: string, autoRecalc = false) => {
    const now = Date.now();
    if (now - lastToastAt.current < DEBOUNCE_MS) return;
    lastToastAt.current = now;

    const toastId = `ci_signal_${companyName}`;

    if (autoRecalc && refresh) {
      stableRefresh();
      toast.success(`Score updated for ${companyName}`, {
        id: toastId,
        description: label,
        duration: 10_000,
      });
      return;
    }

    if (refresh) {
      toast.info(`New signal detected for ${companyName}`, {
        id: toastId,
        description: label,
        action: {
          label: 'Recalculate',
          onClick: () => {
            stableRefresh();
            toast.dismiss(toastId);
          },
        },
        duration: 12_000,
      });
    } else {
      toast.info(`New signal detected for ${companyName}`, {
        id: toastId,
        description: label + ' Refresh the page to see updated signals.',
        action: {
          label: 'Refresh',
          onClick: () => { window.location.reload(); },
        },
        duration: 12_000,
      });
    }
  }, [companyName, refresh, stableRefresh]);

  useEffect(() => {
    if (!companyName || !dbCompanyName) return;

    // Channel 1: company_intelligence UPDATEs (pipeline batch refreshes)
    // Use the exact DB company name for the eq filter — Realtime filters are
    // case-sensitive; previously used raw user input which failed on case mismatch.
    const ciChannelId = `ci_signal_${dbCompanyName.toLowerCase().replace(/\W+/g, '_')}`;
    const ciChannel = supabase
      .channel(ciChannelId)
      .on(
        'postgres_changes' as any,
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'company_intelligence',
          filter: `company_name=eq.${dbCompanyName}`,
        },
        () => fireToast('The intelligence pipeline updated risk signals for this company.'),
      )
      .subscribe();

    // Channel 2: breaking_news_events INSERTs (intra-day breaking layoff announcements)
    // When dbCompanyName is known, use a server-side eq filter so only rows for
    // this company are broadcast to this client. Previously ALL breaking_news_events
    // INSERTs were broadcast globally and filtered client-side — at scale that means
    // every active user session receives every other company's events.
    // Server-side eq filter reduces WebSocket traffic O(n_users × n_events) → O(1).
    const bnChannelId = `bn_signal_${dbCompanyName.toLowerCase().replace(/\W+/g, '_')}`;
    const companyLower = companyName.toLowerCase();
    const dbLower      = dbCompanyName.toLowerCase();
    // Use server-side eq filter on dbCompanyName (exact match stored by breaking-news-scan).
    // Client-side fuzzy check retained as safety net for aliased company names.
    const bnFilter = `company_name=eq.${dbCompanyName}`;
    const bnChannel = supabase
      .channel(bnChannelId)
      .on(
        'postgres_changes' as any,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'breaking_news_events',
          filter: bnFilter,
        },
        (payload: any) => {
          const row = payload?.new ?? {};
          const rowName = (row.company_name ?? '').toLowerCase();
          if (rowName.includes(companyLower) || rowName.includes(dbLower) ||
              companyLower.includes(rowName)) {
            // Inject into layoffNewsCache so the NEXT recalculate incorporates the event
            // into L2 newsRisk scoring. Previously the toast fired but the score didn't
            // change because the event was never added to the in-memory cache.
            injectLayoffEvent({
              companyName:         row.company_name ?? companyName ?? '',
              date:                row.event_date ?? new Date().toISOString().slice(0, 10),
              headline:            row.headline ?? 'Breaking layoff news',
              percentCut:          typeof row.percent_cut === 'number' ? row.percent_cut : 0,
              source:              row.source ?? 'breaking_news_events',
              url:                 row.source_url ?? '',
              affectedDepartments: [],
            });
            // v22.0 — auto-recalc only on high-confidence events (SEC filing,
            // WARN notice, company press release). Lower confidence requires
            // user click to mutate the score.
            const isHighConfidence = row.confidence === 'high';
            const headline = row.headline ? `: ${String(row.headline).slice(0, 90)}` : '';
            fireToast(
              isHighConfidence
                ? `High-confidence layoff event detected${headline}.`
                : 'Breaking layoff news detected — recalculate to include in your score.',
              isHighConfidence,
            );
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ciChannel);
      supabase.removeChannel(bnChannel);
    };
  }, [companyName, dbCompanyName, fireToast]);
}
