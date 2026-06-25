// WhatChangedCard.tsx — Wave 6.6
//
// Shown when re-auditing: explains what changed between audit 1 and audit 2.
// Previous: user sees a new score with zero explanation of what changed.
// New: delta report showing exact signal changes and how user actions contributed.
//
// Placement: shown in LayoffCalculator below banners, above the V3 dashboard,
// only when previousScore exists in sessionStorage AND new score differs by ≥ 1.
// Auto-dismissible after 8s or on manual close.

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, X, TrendingDown, TrendingUp, Minus } from 'lucide-react';

export interface ScoreDelta {
  label: string;
  delta: number;          // positive = increased risk, negative = decreased (good)
  category: 'company' | 'personal' | 'market' | 'action';
  description?: string;
}

interface Props {
  previousScore: number;
  currentScore: number;
  daysSinceLastAudit: number;
  deltas?: ScoreDelta[];
  onDismiss: () => void;
}

function DeltaRow({ d }: { d: ScoreDelta }) {
  const isGood = d.delta < 0;
  const isNeutral = d.delta === 0;
  const Icon = isGood ? TrendingDown : isNeutral ? Minus : TrendingUp;
  const color = isGood ? '#10b981' : isNeutral ? '#94a3b8' : '#f97316';
  const sign = d.delta > 0 ? '+' : '';

  return (
    <div className="flex items-center justify-between py-1.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
      <div className="flex items-center gap-2 min-w-0">
        <Icon className="w-3 h-3 flex-shrink-0" style={{ color }} />
        <span className="text-[10px] truncate" style={{ color: 'var(--alpha-text-55)' }}>
          {d.label}
        </span>
      </div>
      <span className="text-[10px] font-bold flex-shrink-0 ml-2" style={{ color }}>
        {isNeutral ? '—' : `${sign}${d.delta} pts`}
      </span>
    </div>
  );
}

export const WhatChangedCard: React.FC<Props> = ({
  previousScore, currentScore, daysSinceLastAudit, deltas = [], onDismiss,
}) => {
  const [expanded, setExpanded] = useState(false);
  const netDelta = currentScore - previousScore; // negative = improved
  const isImproved = netDelta < 0;
  const isUnchanged = netDelta === 0;

  // Auto-dismiss after 10s
  useEffect(() => {
    const t = setTimeout(onDismiss, 10000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const headerColor = isImproved ? '#10b981' : isUnchanged ? '#94a3b8' : '#f97316';
  const bgColor     = isImproved
    ? 'rgba(16,185,129,0.08)'
    : isUnchanged ? 'rgba(148,163,184,0.08)' : 'rgba(249,115,22,0.08)';
  const bdrColor    = isImproved
    ? 'rgba(16,185,129,0.28)'
    : isUnchanged ? 'rgba(148,163,184,0.22)' : 'rgba(249,115,22,0.25)';

  const headline = isImproved
    ? `Risk improved ${Math.abs(netDelta)} pts since your last audit`
    : isUnchanged
    ? `Risk unchanged since your last audit (${daysSinceLastAudit}d ago)`
    : `Risk increased ${netDelta} pts since your last audit`;

  const userActionDeltas = deltas.filter(d => d.category === 'action');
  const userContribution = userActionDeltas.reduce((sum, d) => sum + d.delta, 0);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.25 }}
        className="rounded-xl overflow-hidden relative"
        style={{ background: bgColor, border: `1px solid ${bdrColor}` }}
      >
        {/* Dismiss */}
        <button
          onClick={onDismiss}
          className="absolute top-2.5 right-2.5 opacity-30 hover:opacity-70 transition-opacity"
        >
          <X className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.80)' }} />
        </button>

        <div className="px-4 py-3">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2 pr-5">
            <div className="flex items-baseline gap-2">
              <span className="text-[11px] font-bold" style={{ color: 'var(--alpha-text-85)' }}>
                {headline}
              </span>
            </div>
          </div>

          {/* Score delta visual */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[13px] font-black" style={{ color: 'var(--alpha-text-35)' }}>
              {previousScore}
            </span>
            <span className="text-[11px]" style={{ color: 'var(--alpha-text-25)' }}>→</span>
            <span className="text-[16px] font-black" style={{ color: headerColor }}>
              {currentScore}
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{
              background: `${headerColor}15`, color: headerColor
            }}>
              {isUnchanged ? 'unchanged' : `${netDelta > 0 ? '+' : ''}${netDelta} pts`}
            </span>
            <span className="text-[9px]" style={{ color: 'var(--alpha-text-25)' }}>
              · {daysSinceLastAudit}d ago
            </span>
          </div>

          {/* User action contribution */}
          {userContribution < 0 && (
            <p className="text-[10px] italic mb-2" style={{ color: 'var(--alpha-text-45)' }}>
              Your actions contributed: <span style={{ color: '#10b981', fontWeight: 700 }}>
                {userContribution} pts
              </span> of the total improvement.
            </p>
          )}

          {/* Expandable delta breakdown */}
          {deltas.length > 0 && (
            <>
              <button
                onClick={() => setExpanded(e => !e)}
                className="flex items-center gap-1 text-[9px] font-semibold mb-1"
                style={{ color: 'var(--alpha-text-35)' }}
              >
                {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {expanded ? 'Hide' : 'Show'} what changed ({deltas.length} signals)
              </button>
              {expanded && (
                <div className="mt-1">
                  {deltas.map((d, i) => <DeltaRow key={i} d={d} />)}
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default WhatChangedCard;
