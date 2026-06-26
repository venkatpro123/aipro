// IntelligenceUpdateBanner.tsx — Wave 7.1
//
// Slides in from the top of the dashboard when continuousIntelligenceService
// detects meaningful signal changes since the user's last audit.
//
// Two CTA types:
//   • "Update my score — 45 sec"  → calls onRecalculate (triggers full pipeline)
//   • "Dismiss"                    → hides for this session (sessionStorage)
//
// Never shown:
//   • When it's the user's first audit (no lastAuditTimestamp in localStorage)
//   • More than once per session (sessionStorage key: hp.iu.dismissed)
//   • When urgency is 'low' and shouldPromptReaudit is false

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, X, AlertTriangle, Activity } from 'lucide-react';
import type { IntelligenceUpdateResult } from '../services/continuousIntelligenceService';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  update: IntelligenceUpdateResult;
  companyName: string;
  onRecalculate?: () => void;
  onDismiss: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const IntelligenceUpdateBanner: React.FC<Props> = ({
  update,
  companyName,
  onRecalculate,
  onDismiss,
}) => {
  const [recalculating, setRecalculating] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const handleRecalculate = () => {
    setRecalculating(true);
    onRecalculate?.();
    // Dismiss after triggering — user will see the loading state
    setTimeout(() => {
      setDismissed(true);
      onDismiss();
    }, 400);
  };

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss();
  };

  const urgencyColor = update.urgency === 'high'
    ? 'var(--color-orange-text)'
    : update.urgency === 'medium'
      ? 'var(--color-amber500-text)'
      : '#22d3ee';

  const Icon = update.urgency === 'high' ? AlertTriangle : Activity;

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          key="intel-update-banner"
          initial={{ opacity: 0, y: -12, scaleY: 0.92 }}
          animate={{ opacity: 1, y: 0, scaleY: 1 }}
          exit={{ opacity: 0, y: -10, scaleY: 0.94 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          className="mx-4 mb-3 rounded-2xl overflow-hidden sm:mx-0"
          style={{
            background: `${urgencyColor}08`,
            border: `1px solid ${urgencyColor}28`,
          }}
        >
          <div className="flex items-start gap-3 px-4 py-3">
            {/* Icon */}
            <div
              className="flex-shrink-0 w-7 h-7 rounded-xl flex items-center justify-center mt-0.5"
              style={{ background: `${urgencyColor}14` }}
            >
              <Icon className="w-3.5 h-3.5" style={{ color: urgencyColor }} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold leading-snug mb-0.5" style={{ color: 'var(--alpha-text-85)' }}>
                {update.signalCount > 0
                  ? `${update.signalCount} new signal${update.signalCount !== 1 ? 's' : ''} detected for ${companyName}`
                  : update.daysSince >= 90
                    ? `Your audit is ${update.daysSince} days old`
                    : update.daysSince >= 30
                      ? `30-day check-in for ${companyName}`
                      : `${update.daysSince} days since your last audit`}
              </p>
              {/* Day-based re-engagement copy (Wave 4.3) */}
              {update.signalCount === 0 && !update.topHeadline && (
                <p className="text-[10px] mb-1 leading-snug" style={{ color: 'var(--alpha-text-45)' }}>
                  {update.daysSince >= 90
                    ? 'Refreshing now would sharpen your confidence score by ~25% and catch any market shifts.'
                    : update.daysSince >= 30
                      ? 'Market conditions may have shifted. Re-analyze to see if your score changed.'
                      : 'Live signals for this company may have changed since your last analysis.'}
                </p>
              )}
              {/* Headline snippet (breaking news) */}
              {update.topHeadline && (
                <p className="text-[10px] mb-1 leading-snug line-clamp-1" style={{ color: 'var(--alpha-text-45)' }}>
                  "{update.topHeadline}"
                </p>
              )}
              <p className="text-[10px]" style={{ color: 'var(--alpha-text-45)' }}>
                Est. score impact: {update.estimatedDelta} · Re-analyze to stay current.
              </p>

              {/* CTA row */}
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={handleRecalculate}
                  disabled={recalculating}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-opacity disabled:opacity-60 hover:opacity-80"
                  style={{
                    background: `${urgencyColor}18`,
                    border: `1px solid ${urgencyColor}35`,
                    color: urgencyColor,
                  }}
                >
                  <RefreshCw className={`w-3 h-3 ${recalculating ? 'animate-spin' : ''}`} />
                  {recalculating
                    ? 'Updating…'
                    : update.signalCount > 0
                      ? 'Update my score — 45 sec'
                      : update.daysSince >= 30
                        ? 'Re-analyze — 45 sec'
                        : 'Update my score — 45 sec'
                  }
                </button>
                <button
                  onClick={handleDismiss}
                  className="text-[9px] font-semibold transition-opacity hover:opacity-70"
                  style={{ color: 'var(--alpha-text-25)' }}
                >
                  Dismiss
                </button>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-1 rounded-lg transition-opacity hover:opacity-60 mt-0.5"
              style={{ color: 'var(--alpha-text-30)' }}
              aria-label="Dismiss update banner"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default IntelligenceUpdateBanner;
