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
// WS6 — broker multiplexes breaking_news_events subscriptions across users
// and auto-downgrades to polling when subscriber count exceeds the threshold.
// Gated by `ws6_realtime_fanout`; when off the legacy direct-channel path runs.
import { subscribeBreakingNews, type BreakingNewsEvent } from '../services/breakingNewsBroker';
import { evaluateFlagSync } from '../config/featureFlags';

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

    // Channel 2: breaking_news_events.
    //
    // WS6 path: route through breakingNewsBroker so concurrent users for the
    // same company share a single underlying transport (realtime channel or
    // polling fallback). Avoids the per-component channel proliferation that
    // saturates Supabase realtime fan-out at scale.
    //
    // Legacy path (flag off): per-component supabase.channel() as before.
    const companyLower = companyName.toLowerCase();
    const dbLower      = dbCompanyName.toLowerCase();
    const fanoutFlag = evaluateFlagSync('ws6_realtime_fanout');
    const handleBreakingNewsRow = (row: BreakingNewsEvent | (BreakingNewsEvent & { source_url?: string })) => {
      const rowName = (row.company_name ?? '').toLowerCase();
      if (rowName.includes(companyLower) || rowName.includes(dbLower) || companyLower.includes(rowName)) {
        injectLayoffEvent({
          companyName:         row.company_name ?? companyName ?? '',
          date:                row.event_date ?? new Date().toISOString().slice(0, 10),
          headline:            row.headline ?? 'Breaking layoff news',
          percentCut:          typeof row.percent_cut === 'number' ? row.percent_cut : 0,
          source:              row.source ?? 'breaking_news_events',
          url:                 (row as { source_url?: string }).source_url ?? '',
          affectedDepartments: [],
        });
        const isHighConfidence = row.confidence === 'high';
        const headlineText = row.headline ? `: ${String(row.headline).slice(0, 90)}` : '';
        fireToast(
          isHighConfidence
            ? `High-confidence layoff event detected${headlineText}.`
            : 'Breaking layoff news detected — recalculate to include in your score.',
          isHighConfidence,
        );
      }
    };

    let unsubBreakingNews: (() => void) | null = null;
    let bnChannel: ReturnType<typeof supabase.channel> | null = null;

    if (fanoutFlag.isActive || fanoutFlag.isShadow) {
      unsubBreakingNews = subscribeBreakingNews(dbCompanyName, handleBreakingNewsRow);
    } else {
      const bnChannelId = `bn_signal_${dbCompanyName.toLowerCase().replace(/\W+/g, '_')}`;
      const bnFilter = `company_name=eq.${dbCompanyName}`;
      bnChannel = supabase
        .channel(bnChannelId)
        .on(
          'postgres_changes' as any,
          { event: 'INSERT', schema: 'public', table: 'breaking_news_events', filter: bnFilter },
          (payload: any) => handleBreakingNewsRow(payload?.new ?? {}),
        )
        .subscribe();
    }

    return () => {
      supabase.removeChannel(ciChannel);
      if (unsubBreakingNews) unsubBreakingNews();
      if (bnChannel) supabase.removeChannel(bnChannel);
    };
  }, [companyName, dbCompanyName, fireToast]);
}
