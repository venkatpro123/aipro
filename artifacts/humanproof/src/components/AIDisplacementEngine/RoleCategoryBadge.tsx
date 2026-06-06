// RoleCategoryBadge — shows role classification category as a colored chip.

import React from 'react';
import type { CareerIntelligence } from '../../data/intelligence/types';

type RoleCategory = NonNullable<CareerIntelligence['roleCategory']>;

interface Props {
  category: RoleCategory | undefined | null;
  isDynamic?: boolean;
}

const CAT_CONFIG: Record<RoleCategory, { label: string; color: string; bg: string; border: string }> = {
  traditional: {
    label: 'TRADITIONAL',
    color: 'var(--text-3, rgba(255,255,255,0.45))',
    bg: 'rgba(255,255,255,0.04)',
    border: 'rgba(255,255,255,0.10)',
  },
  ai_augmented: {
    label: 'AI-AUGMENTED',
    color: 'var(--cyan, #22d3ee)',
    bg: 'rgba(34,211,238,0.08)',
    border: 'rgba(34,211,238,0.22)',
  },
  ai_native: {
    label: 'AI-NATIVE',
    color: 'var(--violet, #8b5cf6)',
    bg: 'rgba(139,92,246,0.09)',
    border: 'rgba(139,92,246,0.24)',
  },
  human_ai_orchestration: {
    label: 'HUMAN-AI ORCHESTRATION',
    color: 'var(--emerald, #10b981)',
    bg: 'rgba(16,185,129,0.08)',
    border: 'rgba(16,185,129,0.22)',
  },
  emerging_unknown: {
    label: 'EMERGING · DYNAMIC ESTIMATE',
    color: 'var(--amber, #f59e0b)',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.22)',
  },
};

export const RoleCategoryBadge: React.FC<Props> = ({ category, isDynamic }) => {
  const cat = category ?? 'traditional';
  const cfg = CAT_CONFIG[cat];

  return (
    <span
      title={
        cat === 'emerging_unknown'
          ? 'Intelligence generated dynamically from role title — not in research corpus. Confidence: Moderate.'
          : cat === 'ai_native'
          ? 'AI-native role: exists because AI exists. Protected from displacement; growing category.'
          : cat === 'human_ai_orchestration'
          ? 'Human-AI orchestration role: humans managing and governing AI systems. Highly protected.'
          : cat === 'ai_augmented'
          ? 'AI-augmented role: AI reshapes but preserves this function. Moderate transition risk.'
          : 'Traditional role: established occupation with AI augmentation pressure.'
      }
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '5px',
        padding: '2px 9px', borderRadius: '4px',
        background: cfg.bg, border: `1px solid ${cfg.border}`,
        fontSize: '0.58rem', fontWeight: 800, color: cfg.color,
        fontFamily: 'var(--font-mono, monospace)', letterSpacing: '0.07em',
        cursor: 'default', verticalAlign: 'middle',
      }}
    >
      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: cfg.color, display: 'inline-block', flexShrink: 0 }} />
      {cfg.label}
      {isDynamic && cat !== 'emerging_unknown' && (
        <span style={{ opacity: 0.6, fontWeight: 400, fontSize: '0.55rem' }}>· estimated</span>
      )}
    </span>
  );
};
