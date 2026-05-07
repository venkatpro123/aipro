// useBreakingNewsPoller.ts
// Polls RSS feeds / breaking_news_events for layoff signals on the current company.
//
// Collects company names from:
//   1. The currently displayed company (currentCompanyName prop)
//   2. The last 10 entries in the score audit history (localStorage)
//
// Re-runs when currentCompanyName changes so switching from "Google" to "Amazon"
// in the same session correctly polls for Amazon's breaking news.
// The poller is self-throttling (max once per 15 minutes per company), so
// calling this hook on every route mount and company change is safe.

import { useEffect, useRef } from 'react';
import { getLayoffScoreHistory } from '../services/scoreStorageService';
import { pollBreakingNews, type BreakingNewsMatch } from '../services/breakingNewsPoller';

export interface BreakingNewsPollerOptions {
  /** v12.0: Called when breaking news is found matching the current company.
   * Use this to trigger a score recalculation when relevant news arrives.
   * Guard against loops: only recalculate when result.fromCache is false. */
  onBreakingNewsMatched?: (matches: BreakingNewsMatch[]) => void;
}

/**
 * @param currentCompanyName - The company currently being viewed or scored.
 *   Pass null/undefined when no company is in the active session.
 * @param options - Optional callbacks (v12.0: onBreakingNewsMatched for auto-recalc)
 */
export function useBreakingNewsPoller(
  currentCompanyName?: string | null,
  options?: BreakingNewsPollerOptions,
): void {
  const lastPolledCompany = useRef<string | null>(null);
  // BUG-FIX: Initialise ref with explicit type, then update on every render.
  // Removed redundant initializer + immediate overwrite pattern from the previous version.
  const onMatchedRef = useRef<BreakingNewsPollerOptions['onBreakingNewsMatched']>(undefined);
  onMatchedRef.current = options?.onBreakingNewsMatched;

  useEffect(() => {
    const normalised = currentCompanyName?.trim() ?? null;

    const run = async () => {
      const names = new Set<string>();

      if (normalised) {
        names.add(normalised);
      }

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
      const matches = await pollBreakingNews([...names]);
      lastPolledCompany.current = normalised;

      // v12.0: Fire callback for matches on the CURRENT company only.
      // This prevents auto-recalculating for historical companies in the score history.
      if (matches.length > 0 && normalised && onMatchedRef.current) {
        const currentCompanyMatches = matches.filter(
          m => m.companyName.toLowerCase() === normalised.toLowerCase(),
        );
        // BUG-FIX: Re-check ref inside the async callback (defensive against
        // concurrent renders clearing the callback between the outer check and invocation)
        if (currentCompanyMatches.length > 0 && onMatchedRef.current) {
          onMatchedRef.current(currentCompanyMatches);
        }
      }
    };

    // Always poll on first mount.
    // On subsequent renders only re-poll when the active company changes —
    // the 15-min per-company throttle inside pollBreakingNews prevents spam.
    if (lastPolledCompany.current !== normalised) {
      run().catch(() => { /* RSS / EF failure is non-fatal */ });
    }
  }, [currentCompanyName]); // Re-run when the active company changes
}
