// ScoreTrendStrip.tsx — v audit UX
//
// Shows the 30/60/90-day risk trajectory beneath the score ring.
// Data source: result.scoreTrajectory (ScoreTrajectoryResult from scoreTrajectoryEngine.ts)
//
// Design intent: one glanceable line + direction arrow.
//   ↑ Risk rising  — in 30 days: 62→68 without action
//   → Stable       — risk holding steady over the next 30 days
//   ↓ Improving    — in 30 days: 62→56 with current trajectory

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';

export interface ScoreTrendStripProps {
  scoreTrajectory: {
    trajectoryDirection: 'accelerating_risk' | 'deteriorating' | 'stable' | 'improving';
    velocityPtsPerMonth: number;
    velocityFromHistory: boolean;
    criticalDecisionDateISO: string | null;
    staticTrajectory?: {
      points?: Array<{
        monthsFromNow: number;
        projectedScore: number;
      }>;
    };
  };
  currentScore: number;
}

const DIRECTION_CONFIG = {
  accelerating_risk: {
    Icon: TrendingUp,
    color: '#dc2626',
    bgColor: 'rgba(220,38,38,0.08)',
    borderColor: 'rgba(220,38,38,0.20)',
    label: 'Risk accelerating',
    pill: 'WORSENING',
    pillBg: 'rgba(220,38,38,0.12)',
  },
  deteriorating: {
    Icon: TrendingUp,
    color: '#f97316',
    bgColor: 'rgba(249,115,22,0.08)',
    borderColor: 'rgba(249,115,22,0.20)',
    label: 'Risk rising',
    pill: 'RISING',
    pillBg: 'rgba(249,115,22,0.12)',
  },
  stable: {
    Icon: Minus,
    color: 'var(--alpha-text-45)',
    bgColor: 'rgba(255,255,255,0.03)',
    borderColor: 'var(--alpha-bg-06)',
    label: 'Stable',
    pill: 'STABLE',
    pillBg: 'rgba(255,255,255,0.06)',
  },
  improving: {
    Icon: TrendingDown,
    color: '#10b981',
    bgColor: 'rgba(16,185,129,0.08)',
    borderColor: 'rgba(16,185,129,0.20)',
    label: 'Improving',
    pill: 'IMPROVING',
    pillBg: 'rgba(16,185,129,0.12)',
  },
} as const;

const fmt = (n: number) => Math.round(n);

export const ScoreTrendStrip: React.FC<ScoreTrendStripProps> = ({
  scoreTrajectory: traj,
  currentScore,
}) => {
  if (!traj) return null;

  const direction = traj.trajectoryDirection ?? 'stable';
  const cfg = DIRECTION_CONFIG[direction] ?? DIRECTION_CONFIG.stable;
  const { Icon } = cfg;

  // Pull 30-day projected score from staticTrajectory.points
  const pts = traj.staticTrajectory?.points ?? [];
  const pt30 = pts.find(p => p.monthsFromNow >= 0.9 && p.monthsFromNow <= 1.5) ?? pts[0];
  const projected30 = pt30 ? fmt(pt30.projectedScore) : null;

  // Build the one-liner
  const velocityAbs = Math.abs(traj.velocityPtsPerMonth ?? 0);
  let oneLiner = '';
  if (projected30 !== null && projected30 !== currentScore) {
    const dir = projected30 > currentScore ? 'without action' : 'at current pace';
    oneLiner = `In 30 days: ${fmt(currentScore)}→${projected30} ${dir}`;
  } else if (velocityAbs >= 1) {
    const dir = direction === 'improving' ? 'improving' : 'worsening';
    oneLiner = `+${fmt(velocityAbs)} pts/month — risk ${dir} at current pace`;
  } else {
    oneLiner = 'No significant change projected in the next 30 days';
  }

  // Critical decision date
  const critDateLabel = (() => {
    if (!traj.criticalDecisionDateISO) return null;
    try {
      const d = new Date(traj.criticalDecisionDateISO);
      return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    } catch {
      return null;
    }
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, duration: 0.3 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '9px 14px',
        borderRadius: '12px',
        background: cfg.bgColor,
        border: `1px solid ${cfg.borderColor}`,
      }}
    >
      {/* Direction icon */}
      <Icon
        size={14}
        style={{ color: cfg.color, flexShrink: 0 }}
        aria-hidden="true"
      />

      {/* Text block */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span
            style={{
              fontSize: '0.6rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 800,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: cfg.color,
              background: cfg.pillBg,
              padding: '1px 5px',
              borderRadius: 4,
            }}
          >
            {cfg.pill}
          </span>
          {!traj.velocityFromHistory && (
            <span
              style={{
                fontSize: '0.58rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--alpha-text-25)',
                letterSpacing: '0.06em',
              }}
            >
              SIGNAL-MODELED
            </span>
          )}
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--alpha-text-70)', lineHeight: 1.4, margin: 0 }}>
          {oneLiner}
        </p>
      </div>

      {/* Critical decision date badge — only when crossing high tier in ≤ 12mo */}
      {critDateLabel && (direction === 'accelerating_risk' || direction === 'deteriorating') && (
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <AlertTriangle size={10} style={{ color: '#fbbf24' }} />
          <span style={{ fontSize: '0.6rem', fontFamily: 'var(--font-mono)', color: '#fbbf24', whiteSpace: 'nowrap' }}>
            act by {critDateLabel}
          </span>
        </div>
      )}
    </motion.div>
  );
};

export default ScoreTrendStrip;
