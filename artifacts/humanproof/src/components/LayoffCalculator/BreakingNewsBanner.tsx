// BreakingNewsBanner.tsx
// Breaking-news signal banner — shown when a layoff event is injected into
// layoffNewsCache mid-session for the company whose result is on screen.
//
// Flow:
//   1. RSS poller (breakingNewsPoller.ts) fetches TechCrunch Layoffs, Moneycontrol
//      Business, and ET Markets; title-matches company name + layoff keywords.
//   2. pollBreakingNews() calls injectLayoffEvent() for each match.
//   3. injectLayoffEvent() fires onNewLayoffEvent() listeners.
//   4. This banner shows: "Breaking Signal — [headline]. Recalculate to incorporate."
//   5. "Recalculate now →" calls onForceRefresh() → forceRefresh=true pipeline run.
//
// The banner also surfaces which feed the signal came from and the publication
// time-ago so the user understands the freshness of the event.

import React, { useEffect, useState } from 'react';
import { onNewLayoffEvent } from '../../data/layoffNewsCache';
import type { LayoffNewsEvent } from '../../data/layoffNewsCache';
import { AlertTriangle, RefreshCw, X, Rss, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatTimeAgo } from '../../services/breakingNewsPoller';

interface Props {
  currentCompanyName: string | null;
  onForceRefresh:     () => void;
  isRefreshing:       boolean;
}

// Map feed names to short display labels for the banner tag
const FEED_SHORT: Record<string, string> = {
  'TechCrunch Layoffs':    'TechCrunch',
  'Moneycontrol Business': 'Moneycontrol',
  'ET Markets':            'ET Markets',
};

export const BreakingNewsBanner: React.FC<Props> = ({
  currentCompanyName,
  onForceRefresh,
  isRefreshing,
}) => {
  const [event,     setEvent]     = useState<LayoffNewsEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
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

  // Reset when company changes
  useEffect(() => {
    setEvent(null);
    setDismissed(false);
  }, [currentCompanyName]);

  if (!event || dismissed) return null;

  const publishedAt       = new Date(event.date);
  const isValidDate       = !isNaN(publishedAt.getTime());
  const timeAgo           = isValidDate ? formatTimeAgo(publishedAt) : null;
  const feedLabel         = event.source ? (FEED_SHORT[event.source] ?? event.source) : null;
  const hasUrl            = !!(event.url);
  const isCircuitCached   = !!(event as any)._fromCircuitBreaker;
  const cachedAtMs        = (event as any)._cachedAt as number | null | undefined;
  const cacheAgeLabel     = isCircuitCached && cachedAtMs
    ? `Cached ${formatTimeAgo(new Date(cachedAtMs))}`
    : null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        role="alert"
        aria-live="assertive"
        style={{
          borderRadius: '12px',
          border: '1px solid rgba(249, 115, 22, 0.45)',
          background: 'rgba(249, 115, 22, 0.09)',
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
        }}
      >
        {/* Icon */}
        <AlertTriangle
          style={{ width: '18px', height: '18px', color: 'var(--color-orange-text)', flexShrink: 0, marginTop: '2px' }}
        />

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Header row: "Breaking Signal" label + feed source tag + time + cache badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
            <span style={{
              fontFamily: 'var(--font-mono)', fontWeight: 700,
              fontSize: '0.72rem', letterSpacing: '0.06em',
              color: 'var(--color-orange-text)', textTransform: 'uppercase',
            }}>
              Breaking Signal
            </span>
            {feedLabel && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                padding: '1px 7px', borderRadius: '999px',
                background: 'rgba(249,115,22,0.18)',
                border: '1px solid rgba(249,115,22,0.30)',
                fontSize: '0.65rem', fontWeight: 600,
                color: 'var(--color-orange-text)', fontFamily: 'var(--font-mono)',
              }}>
                <Rss style={{ width: '9px', height: '9px' }} />
                {feedLabel}
              </span>
            )}
            {timeAgo && !cacheAgeLabel && (
              <span style={{
                fontSize: '0.65rem', color: 'var(--text-secondary)',
                fontFamily: 'var(--font-mono)',
              }}>
                {timeAgo}
              </span>
            )}
            {/* Explicit "Cached N hours ago" label — never silently serve stale data as live */}
            {cacheAgeLabel && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                padding: '1px 7px', borderRadius: '999px',
                background: 'rgba(234,179,8,0.15)',
                border: '1px solid rgba(234,179,8,0.35)',
                fontSize: '0.65rem', fontWeight: 600,
                color: 'var(--color-amber-text)', fontFamily: 'var(--font-mono)',
              }}>
                {cacheAgeLabel}
              </span>
            )}
          </div>

          {/* Headline */}
          <p style={{
            fontSize: '0.8rem', fontWeight: 600,
            color: 'var(--color-orange-text)',
            lineHeight: 1.4, marginBottom: '6px',
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {event.headline}
            {event.percentCut > 0 && (
              <span style={{ marginLeft: '6px', color: 'var(--color-orange-text)', fontWeight: 700 }}>
                (~{event.percentCut}% of staff)
              </span>
            )}
          </p>

          {/* Explanatory copy — honest about cached vs live signal provenance */}
          <p style={{
            fontSize: '0.7rem', color: 'var(--text-secondary)',
            lineHeight: 1.5, marginBottom: '10px',
          }}>
            {isCircuitCached
              ? `The RSS feed is temporarily unavailable (circuit breaker open). This signal was read from a local cache${cacheAgeLabel ? ` (${cacheAgeLabel.toLowerCase()})` : ''}. Recalculate to attempt a live re-fetch and incorporate any new data.`
              : 'Your current score was calculated before this event. This closes the gap between weekly pipeline runs and breaking announcements — recalculating will incorporate this into the layoff history signal (L2) and update the risk score.'
            }
          </p>

          {/* CTA row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={onForceRefresh}
              disabled={isRefreshing}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '5px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(249,115,22,0.50)',
                background: isRefreshing ? 'rgba(249,115,22,0.08)' : 'rgba(249,115,22,0.18)',
                color: 'var(--color-orange-text)',
                fontSize: '0.72rem', fontWeight: 700,
                cursor: isRefreshing ? 'not-allowed' : 'pointer',
                opacity: isRefreshing ? 0.6 : 1,
                transition: 'background 0.15s',
                fontFamily: 'var(--font-body)',
              }}
            >
              <RefreshCw
                style={{
                  width: '11px', height: '11px',
                  animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
                }}
              />
              {isRefreshing ? 'Recalculating…' : 'Recalculate to incorporate'}
            </button>

            {hasUrl && (
              <a
                href={event.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  fontSize: '0.68rem', color: 'var(--text-secondary)',
                  textDecoration: 'none',
                }}
              >
                <ExternalLink style={{ width: '10px', height: '10px' }} />
                View source
              </a>
            )}
          </div>
        </div>

        {/* Dismiss */}
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss breaking signal"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-secondary)', padding: '2px', flexShrink: 0,
            lineHeight: 1,
          }}
        >
          <X style={{ width: '15px', height: '15px' }} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
};
