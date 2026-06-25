// ProgressNarrativeCard.tsx — P3 of the platform transformation ("the recovery loop")
//
// PROBLEM
// The platform is superb at the acute moment (fear → clarity → control) and thin
// at the longitudinal loop (am I making progress?). A returning user got a `🔥`
// streak chip and a clinical velocity line ("4pt worsening vs 30d ago"). There
// was no emotional continuity — no recognition that they came back, no framing
// that the work is paying off.
//
// SOLUTION
// One warm "since last visit" beat that fuses two real signals the dashboard
// already computes — score movement (scoreDelta) and action momentum
// (streakInfo) — into a single human narrative. It is the emotional close of the
// recovery journey and the retention engine ("trust is currency").
//
// Returning-user only: renders nothing for a brand-new audit (no delta, no
// streak, no recorded weeks) so it never fabricates progress that didn't happen.
//
// Pure presentational. SSR-safe. Deterministic over its inputs (no Date.now —
// the streak service already resolved the week math upstream).

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingDown, TrendingUp, Minus, Flame } from 'lucide-react';

export interface ScoreDeltaLike {
  delta30d?: number;
  direction?: string; // 'improving' | 'worsening' | 'stable'
}

export interface StreakLike {
  currentStreak: number;
  totalWeeksActive: number;
  isAtRisk: boolean;
}

interface Props {
  scoreDelta?: ScoreDeltaLike | null;
  streakInfo?: StreakLike | null;
}

interface Narrative {
  icon: React.ElementType;
  accent: string;
  headline: string;
  body: string;
}

function buildNarrative(scoreDelta?: ScoreDeltaLike | null, streak?: StreakLike | null): Narrative | null {
  const delta = Math.abs(scoreDelta?.delta30d ?? 0);
  const dir = scoreDelta?.direction;
  const hasMovement = delta >= 1 && (dir === 'improving' || dir === 'worsening');
  const streakLen = streak?.currentStreak ?? 0;
  const weeksActive = streak?.totalWeeksActive ?? 0;

  // Nothing longitudinal to say → render nothing (first-audit users).
  if (!hasMovement && streakLen === 0 && weeksActive === 0) return null;

  // Momentum sub-line, shared across movement branches.
  const momentum =
    streakLen >= 2
      ? `${streakLen}-week action streak — consistency is what actually moves risk.`
      : weeksActive >= 1
        ? `You've taken action ${weeksActive} week${weeksActive > 1 ? 's' : ''} so far. Keep the thread going.`
        : 'Showing up to check is itself the first move.';

  const atRiskNudge = streak?.isAtRisk && streakLen >= 1
    ? ' Complete one action this week to keep your streak alive.'
    : '';

  if (hasMovement && dir === 'improving') {
    return {
      icon: TrendingDown,
      accent: '#10b981',
      headline: `Your risk is down ${delta} pt${delta > 1 ? 's' : ''} since your last check`,
      body: `That's the work paying off — not luck. ${momentum}${atRiskNudge}`,
    };
  }
  if (hasMovement && dir === 'worsening') {
    return {
      icon: TrendingUp,
      accent: '#f59e0b',
      headline: `Risk ticked up ${delta} pt${delta > 1 ? 's' : ''} since last time`,
      body: `Catching it early is exactly the point — you have room to respond. ${momentum}${atRiskNudge}`,
    };
  }
  // No movement, but the user has history worth acknowledging.
  return {
    icon: streakLen >= 2 ? Flame : Minus,
    accent: streakLen >= 2 ? '#f97316' : 'rgba(255,255,255,0.55)',
    headline: streakLen >= 2 ? `You're on a ${streakLen}-week streak` : 'Holding steady since your last visit',
    body: `${momentum}${atRiskNudge}`,
  };
}

export const ProgressNarrativeCard: React.FC<Props> = ({ scoreDelta, streakInfo }) => {
  const narrative = buildNarrative(scoreDelta, streakInfo);
  if (!narrative) return null;

  const { icon: Icon, accent, headline, body } = narrative;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-2xl px-4 py-3 flex items-start gap-3"
      style={{
        background: `linear-gradient(135deg, ${accent}12, rgba(255,255,255,0.02))`,
        border: `1px solid ${accent}28`,
      }}
    >
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: `${accent}1c`, border: `1px solid ${accent}33` }}
      >
        <Icon className="w-3.5 h-3.5" style={{ color: accent }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-black tracking-[0.12em] uppercase mb-1" style={{ color: accent }}>
          Since your last visit
        </p>
        <p className="text-[13px] font-semibold leading-snug" style={{ color: 'rgba(255,255,255,0.90)' }}>
          {headline}
        </p>
        <p className="text-[11px] leading-snug mt-1" style={{ color: 'var(--alpha-text-50)' }}>
          {body}
        </p>
      </div>
    </motion.div>
  );
};

export default ProgressNarrativeCard;
