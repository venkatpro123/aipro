// TierBadge.tsx — v34.0 UX redesign
//
// Visual tier indicator for progressive disclosure architecture.
//   T1 = Mission-critical (always above the fold)
//   T2 = Important analysis
//   T3 = Advanced intelligence
//   T4 = Deep transparency
//   T5 = Technical / debug
//
// The badge is intentionally tiny — it sits in the corner of a section header
// without competing with content. Tap/hover surfaces a tooltip explaining the
// tier so users understand the disclosure hierarchy.

import React from 'react';

interface TierBadgeProps {
  tier: 1 | 2 | 3 | 4 | 5;
  /** Optional inline label override (default: "T1", "T2", …). */
  label?: string;
}

const TIER_META: Record<number, { color: string; tip: string }> = {
  1: { color: '#dc2626', tip: 'Mission-critical — always surfaced first' },
  2: { color: '#f97316', tip: 'Important — surfaced once Tier 1 is settled' },
  3: { color: '#f59e0b', tip: 'Advanced — explore when you want depth' },
  4: { color: '#22d3ee', tip: 'Transparency — sources & confidence' },
  5: { color: '#94a3b8', tip: 'Technical — pipeline diagnostics' },
};

export const TierBadge: React.FC<TierBadgeProps> = ({ tier, label }) => {
  const meta = TIER_META[tier];
  const text = label ?? `T${tier}`;
  return (
    <span
      title={meta.tip}
      className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-black tracking-wider flex-shrink-0 select-none cursor-help"
      style={{
        background: meta.color + '18',
        color: meta.color,
        border: `1px solid ${meta.color}38`,
        letterSpacing: '0.08em',
      }}
    >
      {text}
    </span>
  );
};

export default TierBadge;
