// AIMemoryCard.tsx — Beast Mode V3
//
// Shows cross-audit history: score drift, action streak, days since last check.
// Only renders for returning users (scoreDelta present OR streak > 0).
// Sources: scoreStorageService (drift), streakService (streak).

import React from 'react';
import { motion } from 'framer-motion';
import { Flame, TrendingUp, TrendingDown, Minus, CheckSquare, Clock } from 'lucide-react';

interface AIMemoryCardProps {
  scoreDelta?: { delta30d?: number; direction?: string };
  streakInfo?: { currentStreak: number; totalWeeksActive: number; isAtRisk: boolean };
  daysSinceLastAudit?: number;
  completedActionCount?: number;
}

export const AIMemoryCard: React.FC<AIMemoryCardProps> = ({
  scoreDelta,
  streakInfo,
  daysSinceLastAudit,
  completedActionCount,
}) => {
  // Only render for returning users
  const deltaRaw = scoreDelta?.delta30d ?? 0;
  const deltaRounded = Math.round(Math.abs(deltaRaw));
  const hasScoreDrift = deltaRounded >= 1;
  const hasStreak = streakInfo && streakInfo.currentStreak > 0;
  const hasActions = typeof completedActionCount === 'number' && completedActionCount > 0;
  const hasDays = typeof daysSinceLastAudit === 'number' && daysSinceLastAudit > 0;

  if (!hasScoreDrift && !hasStreak && !hasActions && !hasDays) return null;

  const direction = scoreDelta?.direction;

  const ScoreDriftIcon = direction === 'worsening' ? TrendingUp : direction === 'improving' ? TrendingDown : Minus;
  const driftColor = direction === 'worsening' ? '#dc2626' : direction === 'improving' ? '#10b981' : 'rgba(255,255,255,0.40)';
  const driftLabel = direction === 'worsening' ? `+${deltaRounded}pt` : direction === 'improving' ? `-${deltaRounded}pt` : `${deltaRounded}pt`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.05 }}
    >
      {/* Header */}
      <p
        className="text-[9px] font-black tracking-[0.14em] uppercase mb-2"
        style={{ color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-mono)' }}
      >
        SINCE YOUR LAST CHECK
      </p>

      {/* Pill strip */}
      <div className="flex gap-2 flex-wrap">

        {/* Score drift */}
        {hasScoreDrift && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
            style={{ background: driftColor + '14', border: `1px solid ${driftColor}30` }}
          >
            <ScoreDriftIcon className="w-3 h-3 flex-shrink-0" style={{ color: driftColor }} />
            <span className="text-[11px] font-bold" style={{ color: driftColor }}>{driftLabel}</span>
            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.40)' }}>risk score</span>
          </div>
        )}

        {/* Actions completed */}
        {hasActions && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
            style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.22)' }}
          >
            <CheckSquare className="w-3 h-3 flex-shrink-0" style={{ color: '#10b981' }} />
            <span className="text-[11px] font-bold" style={{ color: '#10b981' }}>{completedActionCount}</span>
            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.40)' }}>
              action{completedActionCount !== 1 ? 's' : ''} done
            </span>
          </div>
        )}

        {/* Streak */}
        {hasStreak && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
            style={{
              background: streakInfo!.isAtRisk ? 'rgba(245,158,11,0.10)' : 'rgba(251,146,60,0.10)',
              border: streakInfo!.isAtRisk ? '1px solid rgba(245,158,11,0.28)' : '1px solid rgba(251,146,60,0.28)',
            }}
          >
            <Flame className="w-3 h-3 flex-shrink-0" style={{ color: streakInfo!.isAtRisk ? '#f59e0b' : '#fb923c' }} />
            <span className="text-[11px] font-bold" style={{ color: streakInfo!.isAtRisk ? '#f59e0b' : '#fb923c' }}>
              {streakInfo!.currentStreak}wk
            </span>
            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.40)' }}>streak</span>
            {streakInfo!.isAtRisk && (
              <span className="text-[9px] font-bold" style={{ color: '#f59e0b' }}>at risk</span>
            )}
          </div>
        )}

        {/* Days since last audit */}
        {hasDays && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <Clock className="w-3 h-3 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.35)' }} />
            <span className="text-[11px] font-bold" style={{ color: 'rgba(255,255,255,0.55)' }}>
              {daysSinceLastAudit}d
            </span>
            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>since last check</span>
          </div>
        )}

      </div>
    </motion.div>
  );
};

export default AIMemoryCard;
