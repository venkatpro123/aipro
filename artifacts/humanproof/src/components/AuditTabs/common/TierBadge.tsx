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
  1: { color: 'var(--color-red600-text)', tip: 'Mission-critical — always surfaced first' },
  2: { color: 'var(--color-orange500-text)', tip: 'Important — surfaced once Tier 1 is settled' },
  3: { color: 'var(--color-amber500-text)', tip: 'Advanced — explore when you want depth' },
  4: { color: 'var(--color-cyan-text)', tip: 'Transparency — sources & confidence' },
  5: { color: 'var(--color-slate400-text)', tip: 'Technical — pipeline diagnostics' },
};

export const TierBadge: React.FC<TierBadgeProps> = ({ tier, label }) => {
  const meta = TIER_META[tier];
  const text = label ?? `T${tier}`;
  return (
    <span
      title={meta.tip}
      aria-label={`Tier ${tier}: ${meta.tip}`}
      className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-black tracking-wider flex-shrink-0 select-none cursor-help"
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
