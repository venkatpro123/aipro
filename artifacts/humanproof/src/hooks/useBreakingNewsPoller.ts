// useBreakingNewsPoller.ts
// Polls RSS feeds / breaking_news_events for layoff signals on the current company.
//
// Collects company names from:
//   1. The currently displayed company (currentCompanyName prop)
//   2. The last 10 entries in the score audit history (localStorage)
//
// Re-runs when currentCompanyName changes. With per-company sessionStorage throttle
// (hp_breaking_news_last_poll:{company}) switching dashboards always polls the new
// company immediately — the 15-minute window is per-company, not global.
//
// The hook also fires on app load (App.tsx) with no currentCompanyName to check
// history companies, and on dashboard open (LayoffCalculator) with the active
// company to catch the case where the user opened a result after the app-load poll
// ran without that company being in the history yet.

import { useCallback, useEffect, useRef, useState } from 'react';
import { getLayoffScoreHistory } from '../services/scoreStorageService';
import { pollBreakingNews, type BreakingNewsMatch } from '../services/breakingNewsPoller';

export interface BreakingNewsPollerOptions {
  /**
   * Called when breaking news is found matching the current company.
   * Guard against loops: only recalculate when the match is for the CURRENT
   * company, not for companies in the history (already handled internally).
   */
  onBreakingNewsMatched?: (matches: BreakingNewsMatch[]) => void;
}

export interface BreakingNewsPollerResult {
  /** Latest matches found for the current company this session. */
  currentMatches:  BreakingNewsMatch[];
  /** True while a poll is in flight. */
  isPolling:       boolean;
  /** Force an immediate poll bypassing the 15-minute throttle. */
  forcePoll:       () => void;
}

/**
 * @param currentCompanyName - The company currently being viewed or scored.
 *   Pass null/undefined when no company is in the active session (app-load context).
 * @param options - Optional callbacks.
 */
export function useBreakingNewsPoller(
  currentCompanyName?: string | null,
  options?: BreakingNewsPollerOptions,
): BreakingNewsPollerResult {
  const [currentMatches, setCurrentMatches] = useState<BreakingNewsMatch[]>([]);
  const [isPolling, setIsPolling] = useState(false);

  const lastPolledCompany = useRef<string | null>(null);
  const onMatchedRef      = useRef<BreakingNewsPollerOptions['onBreakingNewsMatched']>(undefined);
  onMatchedRef.current    = options?.onBreakingNewsMatched;

  const run = useCallback(async (force = false) => {
    const normalised = currentCompanyName?.trim() ?? null;
    const names = new Set<string>();

    if (normalised) names.add(normalised);

    try {
      const history = getLayoffScoreHistory();
      history.slice(0, 10).forEach(entry => {
        if (
          entry.companyName &&
          entry.companyName.length >= 3 &&
          !entry.companyName.toLowerCase().includes('unknown') &&
          !entry.companyName.toLowerCase().startsWith('fallback')
        ) {
          names.add(entry.companyName);
        }
      });
    } catch {
      // score history unavailable (first visit, private browsing)
    }

    if (names.size === 0) return;

    setIsPolling(true);
    try {
      const matches = await pollBreakingNews([...names], { force });
      lastPolledCompany.current = normalised;

      // Surface matches for the current company in component state.
      if (normalised) {
        const forCurrent = matches.filter(
          m => m.companyName.toLowerCase() === normalised.toLowerCase(),
        );
        if (forCurrent.length > 0) {
          setCurrentMatches(forCurrent);
          if (onMatchedRef.current) {
            onMatchedRef.current(forCurrent);
          }
        }
      }
    } catch {
      // RSS / network failure is non-fatal; banner stays dark
    } finally {
      setIsPolling(false);
    }
  }, [currentCompanyName]);

  // Run on mount AND whenever the active company changes.
  // Per-company throttle inside pollBreakingNews prevents spam.
  useEffect(() => {
    const normalised = currentCompanyName?.trim() ?? null;
    if (lastPolledCompany.current !== normalised) {
      run(false).catch(() => {});
    }
  }, [currentCompanyName, run]);

  // Reset banner state when company changes.
  useEffect(() => {
    setCurrentMatches([]);
  }, [currentCompanyName]);

  const forcePoll = useCallback(() => {
    run(true).catch(() => {});
  }, [run]);

  return { currentMatches, isPolling, forcePoll };
}
