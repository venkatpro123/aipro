// useMonitoringFeed.ts — Phase 2
// TanStack Query wrapper around monitoringService.getMonitoringFeed().
// Refetches every 60s. Optimistic dismiss updates local cache immediately.

import { useCallback, useEffect, useState } from 'react';
import { useLayoff } from '../context/LayoffContext';
import {
  getMonitoringFeed,
  getWatchlist,
  getDismissedAlertKeys,
  dismissAlert,
  type MonitoringContext,
} from '../services/monitoringService';
import type { MonitoringFeedItem } from '../types/careerOS';
import type { HybridResult } from '../types/hybridResult';

const REFETCH_INTERVAL_MS = 60_000;

export interface UseMonitoringFeedResult {
  items: MonitoringFeedItem[];
  isLoading: boolean;
  watchlist: string[];
  dismiss: (alertKey: string) => void;
  refetch: () => void;
  unreadCount: number;
  countByCategory: Record<string, number>;
}

export function useMonitoringFeed(): UseMonitoringFeedResult {
  const { state } = useLayoff();
  const [items, setItems] = useState<MonitoringFeedItem[]>([]);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [wl, dismissed] = await Promise.all([
        getWatchlist(),
        getDismissedAlertKeys(),
      ]);

      // Merge audited company into watchlist automatically
      const companyName = state.companyName;
      const effectiveWatchlist = companyName
        ? Array.from(new Set([companyName, ...wl]))
        : wl;

      setWatchlist(wl);
      setDismissedKeys(dismissed);

      const ctx: MonitoringContext = {
        hybridResult: state.scoreResult as HybridResult | null,
        watchlist: effectiveWatchlist,
        actionsCompleted: 0,
        actionsDue: 0,
        financialRunwayMonths: null,
      };

      const feed = await getMonitoringFeed(ctx, dismissed);
      setItems(feed);
    } catch {
      /* silently degrade */
    } finally {
      setIsLoading(false);
    }
  }, [state.companyName, state.scoreResult]);

  // Initial load + interval refresh
  useEffect(() => {
    load();
    const id = setInterval(load, REFETCH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [load]);

  // Optimistic dismiss: remove from local state immediately, then persist
  const dismiss = useCallback((alertKey: string) => {
    setItems(prev => prev.filter(item => item.id !== alertKey));
    setDismissedKeys(prev => new Set([...prev, alertKey]));
    dismissAlert(alertKey).catch(() => {/* offline — optimistic is enough */});
  }, []);

  const countByCategory = items.reduce<Record<string, number>>((acc, item) => {
    acc[item.category] = (acc[item.category] ?? 0) + 1;
    return acc;
  }, {});

  return {
    items,
    isLoading,
    watchlist,
    dismiss,
    refetch: load,
    unreadCount: items.length,
    countByCategory,
  };
}
