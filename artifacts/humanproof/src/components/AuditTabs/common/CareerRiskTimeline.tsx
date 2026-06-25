// CareerRiskTimeline.tsx — Beast Mode V3
//
// Visual Past → Present → Future story strip.
// Past: up to 3 score checkpoints from scoreStorageService history.
// Present: current score + "TODAY".
// Future: up to 3 milestones from personalizedTimelineService + criticalByDate.
// Falls back to a single "TODAY" chip when no history or milestones exist.

import React from 'react';
import { motion } from 'framer-motion';
import type { ScoreHistoryEntry } from '../../../services/scoreStorageService';
import type { TimelineMilestone } from '../../../services/personalizedTimelineService';
import { riskColor, riskLabel } from '../../../lib/riskTokens';

interface CareerRiskTimelineProps {
  currentScore: number;
  scoreHistory?: ScoreHistoryEntry[];
  milestones?: TimelineMilestone[];
  criticalByDate?: string | null;
  urgencyCategory?: string;
}

function formatMonthShort(isoTimestamp: string): string {
  try {
    const d = new Date(isoTimestamp);
    return d.toLocaleString('default', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

function formatDateShort(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    return d.toLocaleString('default', { month: 'short', year: '2-digit' });
  } catch {
    return isoDate;
  }
}

// Single timeline node
const TimelineNode: React.FC<{
  label: string;
  score?: number;
  text?: string;
  isNow?: boolean;
  isCritical?: boolean;
  isPast?: boolean;
  direction?: 'up' | 'down' | 'stable';
  delay?: number;
}> = ({ label, score, text, isNow, isCritical, isPast, direction, delay = 0 }) => {
  const color = score != null ? riskColor(score) : isCritical ? '#dc2626' : '#f59e0b';
  const bgOpacity = isNow ? '20' : '0a';
  const borderOpacity = isNow ? '45' : '28';

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay }}
      className="flex flex-col items-center gap-1.5 flex-shrink-0"
      style={{ minWidth: isNow ? 80 : 72 }}
    >
      {/* Score/label chip */}
      <div
        className="rounded-xl px-2.5 py-2 text-center"
        style={{
          background: `${color}${bgOpacity}`,
          border: `1px solid ${color}${borderOpacity}`,
          minWidth: isNow ? 72 : 64,
        }}
      >
        {score != null ? (
          <>
            <p className="text-[14px] font-black leading-none" style={{ color }}>
              {score}
              {direction === 'up' && <span className="text-[10px] ml-0.5">↑</span>}
              {direction === 'down' && <span className="text-[10px] ml-0.5">↓</span>}
            </p>
            <p className="text-[9px] font-bold mt-0.5" style={{ color: color + 'aa' }}>
              {riskLabel(score)}
            </p>
          </>
        ) : (
          <p className="text-[10px] font-bold leading-snug text-center" style={{ color, maxWidth: 68 }}>
            {text}
          </p>
        )}
      </div>

      {/* Date label */}
      <p
        className="text-[9px] text-center font-semibold"
        style={{
          color: isNow ? 'rgba(255,255,255,0.65)' : isPast ? 'var(--alpha-text-30)' : 'var(--alpha-text-45)',
          letterSpacing: isNow ? '0.06em' : undefined,
        }}
      >
        {label}
      </p>
    </motion.div>
  );
};

// Connector line between nodes — self-center in the flex row aligns it
// at the vertical midpoint of the sibling nodes.
const Connector: React.FC<{ dashed?: boolean }> = ({ dashed }) => (
  <div
    className="flex-shrink-0 self-center"
    style={{
      width: 20,
      height: 1,
      background: dashed ? undefined : 'var(--alpha-bg-08)',
      borderTop: dashed ? '1px dashed rgba(255,255,255,0.15)' : undefined,
      // Shift up so the line sits in the center of the score chip (~32px tall),
      // not at the midpoint of the entire node column (chip + label).
      marginBottom: 18,
    }}
  />
);

export const CareerRiskTimeline: React.FC<CareerRiskTimelineProps> = ({
  currentScore,
  scoreHistory,
  milestones,
  criticalByDate,
  urgencyCategory,
}) => {
  const pastEntries = (scoreHistory ?? []).slice(-3);
  const futureMilestones = (milestones ?? []).slice(0, 3);
  const hasPast = pastEntries.length > 0;
  const hasFuture = futureMilestones.length > 0 || !!criticalByDate;

  // Only render when there is at least past history OR a future milestone.
  // A timeline with only a single "TODAY" node adds no value.
  if (!hasPast && !hasFuture) return null;

  return (
    <div>
      <p
        className="text-[9px] font-black tracking-[0.14em] uppercase mb-2.5"
        style={{ color: 'var(--alpha-text-25)', fontFamily: 'var(--font-mono)' }}
      >
        CAREER RISK TIMELINE
      </p>

      <div
        className="overflow-x-auto pb-1"
        style={{ scrollbarWidth: 'none' }}
      >
        <div className="flex items-start gap-0" style={{ minWidth: 'max-content' }}>

          {/* PAST zone */}
          {hasPast && (
            <>
              {pastEntries.map((entry, i) => {
                const prev = pastEntries[i - 1];
                const direction = prev
                  ? entry.score > prev.score ? 'up' : entry.score < prev.score ? 'down' : 'stable'
                  : undefined;
                return (
                  <React.Fragment key={entry.id}>
                    {i > 0 && <Connector />}
                    <TimelineNode
                      label={formatMonthShort(entry.timestamp)}
                      score={entry.score}
                      isPast
                      direction={direction as any}
                      delay={i * 0.05}
                    />
                  </React.Fragment>
                );
              })}
              <Connector />
            </>
          )}

          {/* NOW node */}
          <TimelineNode
            label="TODAY"
            score={currentScore}
            isNow
            delay={hasPast ? pastEntries.length * 0.05 : 0}
          />

          {/* FUTURE zone */}
          {hasFuture && (
            <>
              {futureMilestones.map((ms, i) => (
                <React.Fragment key={i}>
                  <Connector dashed />
                  <TimelineNode
                    label={formatDateShort(ms.date)}
                    text={ms.action.length > 40 ? ms.action.slice(0, 38) + '…' : ms.action}
                    delay={(hasPast ? pastEntries.length : 0) * 0.05 + (i + 1) * 0.06}
                  />
                </React.Fragment>
              ))}
              {criticalByDate && futureMilestones.length === 0 && (
                <>
                  <Connector dashed />
                  <TimelineNode
                    label={formatDateShort(criticalByDate)}
                    text="Critical deadline"
                    isCritical
                    delay={0.12}
                  />
                </>
              )}
            </>
          )}

        </div>
      </div>

      {/* Urgency note */}
      {urgencyCategory && urgencyCategory !== 'COMFORTABLE' && (
        <p className="mt-1.5 text-[10px]" style={{ color: 'var(--alpha-text-35)' }}>
          {urgencyCategory === 'IMMEDIATE' && '⚡ Act this week — runway is tight.'}
          {urgencyCategory === 'WEEKS' && '⚠ Act within the next few weeks.'}
          {urgencyCategory === 'MONTHS' && 'Build momentum over the next few months.'}
        </p>
      )}
    </div>
  );
};

export default CareerRiskTimeline;
