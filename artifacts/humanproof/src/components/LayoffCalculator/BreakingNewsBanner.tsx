// BreakingNewsBanner.tsx
// Shown when a layoff event is injected into layoffNewsCache mid-session for the
// company whose result is currently on screen.
//
// Flow:
//   1. OSINT/NewsAPI resolves and calls injectLayoffEvent() with a fresh event
//   2. The module-level onNewLayoffEvent() listener fires in this component
//   3. If event.companyName matches the currently displayed company:
//      a. invalidateForCompany() has already cleared the analysis cache
//      b. This banner appears: "Breaking: [headline]. Recalculate to incorporate."
//   4. "Recalculate now →" calls onForceRefresh() → forceRefresh=true fetch

import React, { useEffect, useState } from 'react';
import { onNewLayoffEvent } from '../../data/layoffNewsCache';
import type { LayoffNewsEvent } from '../../data/layoffNewsCache';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';

interface Props {
  currentCompanyName: string | null;
  onForceRefresh: () => void;
  isRefreshing: boolean;
}

export const BreakingNewsBanner: React.FC<Props> = ({
  currentCompanyName,
  onForceRefresh,
  isRefreshing,
}) => {
  const [event, setEvent] = useState<LayoffNewsEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Subscribe to breaking news events injected by OSINT/NewsAPI
    const unsubscribe = onNewLayoffEvent((evt) => {
      if (
        currentCompanyName &&
        evt.companyName.toLowerCase() === currentCompanyName.toLowerCase()
      ) {
        setEvent(evt);
        setDismissed(false);
      }
    });
    return unsubscribe;
  }, [currentCompanyName]);

  // Reset when company changes (user starts a new audit)
  useEffect(() => {
    setEvent(null);
    setDismissed(false);
  }, [currentCompanyName]);

  if (!event || dismissed) return null;

  const eventDate = new Date(event.date).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <div
      className="rounded-xl border border-orange-500/40 bg-orange-500/10 p-4 flex items-start gap-3"
      role="alert"
      aria-live="assertive"
    >
      <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-orange-300 mb-0.5">
          Breaking — {eventDate}
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed mb-2 line-clamp-2">
          {event.headline}
          {event.percentCut > 0 && (
            <span className="ml-1 font-semibold text-orange-300">
              (~{event.percentCut}% of staff)
            </span>
          )}
        </p>
        <p className="text-[11px] text-muted-foreground mb-2">
          Your current score was calculated before this event. The cache has been cleared —
          recalculating will incorporate this into the layoff history signal (L2).
        </p>
        <button
          onClick={onForceRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 rounded-lg border border-orange-500/50 bg-orange-500/15 px-3 py-1 text-xs font-semibold text-orange-300 transition-all hover:bg-orange-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Recalculating…' : 'Recalculate now to incorporate breaking news'}
        </button>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="p-1 text-muted-foreground hover:text-white transition-colors flex-shrink-0"
        aria-label="Dismiss breaking news alert"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
