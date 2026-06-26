// LiveSignalStatusBanner.tsx
// Persistent banner shown at the top of every audit result that communicates
// live data coverage tier, sources active, and any fallback warnings.
// Design: compact single row, color-coded by tier, dismissible.

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface LiveDataCoverage {
  liveWonKeys:             string[];
  dbWonKeys:               string[];
  liveRatio:               number;    // 0–1
  genuineApiSignals:       number;
  overallSource:           string;
  degradedSignalClasses:   string[];
  hardFailures:            string[];
  fetchedAt:               string;
}

interface Props {
  coverage:     LiveDataCoverage | null | undefined;
  freshnessScore?: number | null;
  /** v39.0 A3 — surface the live-quorum timeout cap reason to the user. */
  degradationReason?: string | null;
  degradationDetail?: string | null;
  /**
   * v40 quorum gate — true when ZERO signal classes were positively satisfied
   * (every class is either absence-quorum or unresolved). In this state the
   * audit refuses to publish a point estimate: "a score from insufficient
   * sources is not a score." UI renders the red-refusal banner.
   */
  quorumInsufficient?: boolean;
  /** Number of signal classes that reached POSITIVE quorum (0–4). */
  quorumPositiveClassCount?: number;
  /**
   * Regime-specific disclosure explaining why certain signal classes are
   * structurally unavailable (e.g. private company legal requirements).
   * Rendered as an informational strip — amber, not red — because this is
   * expected behaviour, not a pipeline failure.
   */
  structuralNote?: string | null;
  /**
   * Callback fired when the user clicks "Retry" on a db/static tier banner.
   * Should reset stale circuit breakers and re-run the analysis.
   */
  onRetry?: () => void;
  className?:   string;
}

type Tier = 'live' | 'partial' | 'db' | 'static';

// Audit v35 fix: tier MUST be anchored to genuineApiSignals (real network calls
// this session), not liveRatio alone. liveRatio includes Wikipedia scraping and
// RSS news counted as "live", which inflates the live-coverage claim. The critical
// guard: if genuineApiSignals === 0 the tier can never be 'live', regardless of
// any ratio derived from seeded-DB freshness or scrape wins.
function getTier(liveRatio: number, genuineApiSignals: number): Tier {
  // Zero real API calls → never claim live intelligence regardless of ratios.
  if (genuineApiSignals === 0) {
    // Some scraping happened (liveRatio > 0 from scrape-as-"live" sources) →
    // 'db' tier (DB-backed with some scraping supplement).
    // No scraping → 'static' (fully seeded / heuristic).
    return liveRatio > 0 ? 'db' : 'static';
  }
  // Real API calls landed — now grade by how many live sources won arbitration.
  if (liveRatio <= 0.40) return 'db';       // most signals from DB
  if (liveRatio <= 0.70) return 'partial';  // mixed live + DB
  return 'live';                            // majority live
}

const TIER_CONFIG: Record<Tier, {
  dot: string; label: string; sub: string;
  bg: string; border: string; text: string;
}> = {
  live: {
    dot:    '#22d3ee',
    label:  'Live Intelligence Active',
    sub:    'All critical signals fetched from live APIs in this session.',
    bg:     'rgba(34, 211, 238, 0.06)',
    border: 'rgba(34, 211, 238, 0.25)',
    text:   'var(--accent)',
  },
  partial: {
    dot:    'var(--color-amber500-text)',
    label:  'Partial Live Coverage',
    sub:    'Some signals from live APIs; remainder from database cache.',
    bg:     'rgba(245, 158, 11, 0.06)',
    border: 'rgba(245, 158, 11, 0.25)',
    text:   'var(--color-amber500-text)',
  },
  // v32: 'db' and 'static' tiers now map to "live-partial" + "live-unavailable" —
  // the audit pipeline blocks for live quorum, so anything reaching the user
  // either has live evidence or explicitly cannot be acquired live.
  db: {
    dot:    'var(--color-amber500-text)',
    label:  'Live Intelligence (Partial)',
    sub:    'Some signal classes were satisfied by absence of evidence rather than positive confirmation.',
    bg:     'rgba(245, 158, 11, 0.07)',
    border: 'rgba(245, 158, 11, 0.30)',
    text:   'var(--color-amber500-text)',
  },
  static: {
    dot:    'var(--color-red-text)',
    label:  'Live Intelligence Unavailable',
    sub:    'Live sources could not be reached for this company. Score reflects best-available evidence.',
    bg:     'rgba(239, 68, 68, 0.08)',
    border: 'rgba(239, 68, 68, 0.35)',
    text:   'var(--color-red-text)',
  },
};

export const LiveSignalStatusBanner: React.FC<Props> = ({ coverage, freshnessScore, degradationReason, degradationDetail, quorumInsufficient, quorumPositiveClassCount, structuralNote, onRetry, className }) => {
  const [dismissed, setDismissed] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const handleRetry = useCallback(() => {
    setRetrying(true);
    // Give a brief visual pulse before firing the callback
    setTimeout(() => {
      setRetrying(false);
      onRetry?.();
    }, 300);
  }, [onRetry]);

  // Audit v35: use liveRatio from coverage ONLY — never fall back to freshnessScore.
  // freshnessScore reflects seeded-DB staleness and has nothing to do with live APIs;
  // using it as a fallback caused the banner to show "Live Intelligence Active" when
  // all data came from a fresh (< 7d) seeded row. If coverage is null, tier is 'static'.
  const liveRatio        = coverage?.liveRatio ?? 0;
  const genuineApiSigs   = coverage?.genuineApiSignals ?? 0;
  // v40 quorum gate: hard-refusal state overrides tier — render as 'static' so
  // the explicit "Live Intelligence Unavailable" copy fires.
  const tier             = quorumInsufficient ? 'static' : getTier(liveRatio, genuineApiSigs);
  const cfg              = TIER_CONFIG[tier];
  const pct              = Math.round(liveRatio * 100);
  const fetchedAt        = coverage?.fetchedAt;
  const ageMin           = fetchedAt
    ? Math.round((Date.now() - new Date(fetchedAt).getTime()) / 60_000)
    : null;
  const degraded         = coverage?.degradedSignalClasses ?? [];
  const hardFails        = coverage?.hardFailures ?? [];

  // Always show for db/static tiers; live/partial are dismissible
  const forceVisible = tier === 'db' || tier === 'static';

  return (
    <AnimatePresence>
      {(!dismissed || forceVisible) && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className={className}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            padding: '10px 14px',
            borderRadius: '10px',
            border: `1px solid ${cfg.border}`,
            background: cfg.bg,
            marginBottom: '12px',
            position: 'relative',
          }}
        >
          {/* Pulsing dot */}
          <div style={{ marginTop: '3px', flexShrink: 0, position: 'relative', width: '10px', height: '10px' }}>
            <div style={{
              width: '10px', height: '10px', borderRadius: '50%',
              background: cfg.dot,
              boxShadow: tier === 'live' ? `0 0 6px ${cfg.dot}` : 'none',
            }} />
            {tier === 'live' && (
              <motion.div
                animate={{ scale: [1, 1.8, 1], opacity: [0.8, 0, 0.8] }}
                transition={{ repeat: Infinity, duration: 2 }}
                style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  background: cfg.dot,
                }}
              />
            )}
          </div>

          {/* Text content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{
                fontFamily: 'var(--font-mono)', fontWeight: 700,
                fontSize: '0.7rem', letterSpacing: '0.05em',
                color: cfg.text, textTransform: 'uppercase',
              }}>
                {cfg.label}
              </span>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
                color: cfg.text, opacity: 0.7,
              }}>
                {pct}% live · {coverage?.liveWonKeys.length ?? 0} signals
                {ageMin !== null ? ` · fetched ${ageMin < 1 ? 'just now' : `${ageMin}m ago`}` : ''}
              </span>
            </div>
            <div style={{
              fontFamily: 'var(--font-body)', fontSize: '0.72rem',
              color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.4,
            }}>
              {cfg.sub}
              {degraded.length > 0 && (
                <span style={{ marginLeft: '4px', opacity: 0.75 }}>
                  Degraded: {degraded.join(', ')}.
                </span>
              )}
              {hardFails.length > 0 && tier !== 'static' && (
                <span style={{ marginLeft: '4px', color: 'var(--color-red-text)' }}>
                  API failures: {hardFails.length}.
                </span>
              )}
              {/* v39.0 A3: surface live-quorum timeout cap */}
              {degradationReason === 'live_quorum_timeout' && (
                <span style={{
                  display: 'block', marginTop: '4px',
                  color: 'var(--color-amber500-text)', fontWeight: 600,
                }}>
                  {degradationDetail ?? 'Live scrape ceiling hit — confidence capped at 60%.'}
                </span>
              )}
              {/* v40 quorum gate: explicit refusal copy when no positive class was reached. */}
              {quorumInsufficient && (
                <span style={{
                  display: 'block', marginTop: '4px',
                  color: 'var(--color-red-text)', fontWeight: 700,
                }}>
                  Quorum not met — {quorumPositiveClassCount ?? 0}/4 signal classes
                  positively confirmed. A score from insufficient sources is not a score:
                  point estimate withheld until evidence reaches the minimum (workforce ≥2,
                  layoffs ≥2 or 20s absence quorum, financial ≥1, hiring ≥1).
                </span>
              )}
              {/* Regime-specific structural note — amber, not red: this is expected, not a failure. */}
              {structuralNote && !quorumInsufficient && (
                <span style={{
                  display: 'block', marginTop: '4px',
                  color: 'var(--color-amber500-text)', fontWeight: 500,
                }}>
                  {structuralNote}
                </span>
              )}
            </div>

            {/* Progress bar */}
            <div style={{
              height: '3px', borderRadius: '2px',
              background: 'var(--alpha-bg-08)',
              marginTop: '6px', overflow: 'hidden',
            }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                style={{ height: '100%', borderRadius: '2px', background: cfg.dot }}
              />
            </div>
          </div>

          {/* Retry button for db/static tiers — resets circuits and re-runs analysis */}
          {forceVisible && onRetry && (
            <button
              onClick={handleRetry}
              disabled={retrying}
              style={{
                background: retrying ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.10)',
                border: `1px solid ${cfg.border}`,
                borderRadius: '6px',
                cursor: retrying ? 'wait' : 'pointer',
                color: cfg.text,
                fontSize: '0.65rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                letterSpacing: '0.04em',
                lineHeight: 1,
                padding: '5px 10px',
                flexShrink: 0,
                transition: 'background 0.15s, opacity 0.15s',
                opacity: retrying ? 0.6 : 1,
                whiteSpace: 'nowrap',
              }}
              aria-label="Retry fetching live data"
            >
              {retrying ? '↻ …' : '↻ Retry'}
            </button>
          )}

          {/* Dismiss button for live/partial */}
          {!forceVisible && (
            <button
              onClick={() => setDismissed(true)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1,
                padding: '2px 4px', flexShrink: 0, opacity: 0.5,
              }}
              aria-label="Dismiss"
            >×</button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
