// CachedResultBanner.tsx
// Shown when the audit result is served from the 1-hour session cache rather than
// a fresh computation. Gives the user a single-click path to force fresh data.
//
// Behaviour:
//   • Appears immediately below the score headline when result.fromCache === true
//   • Shows how long ago the result was cached ("Cached 23 minutes ago")
//   • "Recalculate with fresh data →" calls onForceRefresh() which re-runs
//     runFullEnsembleAnalysis({ forceRefresh: true })
//   • Dismissed automatically when fresh result arrives (fromCache becomes false)

import React, { useEffect, useState } from 'react';
import { RefreshCw, Clock } from 'lucide-react';

interface Props {
  cachedAt: number | undefined;
  onForceRefresh: () => void;
  isRefreshing: boolean;
}

function formatAge(cachedAt: number): string {
  const mins = Math.round((Date.now() - cachedAt) / 60_000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
}

export const CachedResultBanner: React.FC<Props> = ({ cachedAt, onForceRefresh, isRefreshing }) => {
  const [age, setAge] = useState(() => cachedAt ? formatAge(cachedAt) : '');

  // Update the relative-time label every 30 seconds
  useEffect(() => {
    if (!cachedAt) return;
    setAge(formatAge(cachedAt));
    const id = setInterval(() => setAge(formatAge(cachedAt)), 30_000);
    return () => clearInterval(id);
  }, [cachedAt]);

  if (!cachedAt) return null;

  return (
    <div
      className="flex items-center justify-between gap-3 rounded-xl border border-[var(--cyan)]/20 bg-[var(--cyan)]/5 px-4 py-2.5 text-sm"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 text-[var(--cyan)]/80">
        <Clock className="w-3.5 h-3.5 flex-shrink-0" />
        <span>
          Cached result from{' '}
          <span className="font-semibold text-[var(--cyan)]">{age}</span>
          {' '}— market signals may have changed.
        </span>
      </div>

      <button
        onClick={onForceRefresh}
        disabled={isRefreshing}
        className="flex items-center gap-1.5 rounded-lg border border-[var(--cyan)]/40 bg-[var(--cyan)]/10 px-3 py-1 text-xs font-semibold text-[var(--cyan)] transition-all hover:bg-[var(--cyan)]/20 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
        aria-label="Recalculate with fresh data"
      >
        <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
        {isRefreshing ? 'Recalculating…' : 'Recalculate with fresh data'}
      </button>
    </div>
  );
};
