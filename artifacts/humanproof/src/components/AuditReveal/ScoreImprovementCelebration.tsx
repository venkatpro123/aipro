// ScoreImprovementCelebration.tsx — Wave 3.3
//
// Triggered when a re-audit produces a score ≥ 3 points LOWER than the
// previous audit (lower = better for the user — less risk).
//
// Sequence:
//   1. Confetti burst via canvas-confetti
//   2. Hero card: "Your risk dropped N points. That's real progress."
//   3. What drove it: top 2 changed signals
//   4. Momentum framing: "At this rate..."
//   5. Next step: Phase 2 actions unlock
//
// Auto-dismisses after 6 seconds. Dismissable by click.

import React, { useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { TrendingDown, Sparkles, X, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';

interface Props {
  previousScore: number;
  currentScore: number;
  /** Optional: what drove the change (top 2 signal deltas) */
  changedSignals?: Array<{ label: string; delta: string; positive: boolean }>;
  onDismiss: () => void;
}

function fireConfetti() {
  // Gentle burst — not overwhelming
  confetti({
    particleCount: 60,
    spread: 70,
    origin: { y: 0.5 },
    colors: ['#22d3ee', '#10b981', '#a78bfa', '#f59e0b'],
    gravity: 0.9,
    scalar: 0.85,
    ticks: 180,
  });
  // Second burst for depth
  setTimeout(() => {
    confetti({
      particleCount: 30,
      spread: 55,
      origin: { y: 0.45, x: 0.35 },
      colors: ['#22d3ee', '#10b981'],
      ticks: 150,
      scalar: 0.75,
    });
  }, 180);
}

export const ScoreImprovementCelebration: React.FC<Props> = ({
  previousScore, currentScore, changedSignals = [], onDismiss,
}) => {
  const drop = previousScore - currentScore;

  useEffect(() => {
    // Fire confetti on mount
    fireConfetti();

    // Auto-dismiss after 6 seconds
    const timer = setTimeout(onDismiss, 6000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  // Compute pace narrative: if 1 re-audit → N pt drop, estimate weeks to safe
  const safeThreshold = 35;
  const remaining = Math.max(0, currentScore - safeThreshold);
  const weeksAtThisPace = drop > 0 ? Math.ceil(remaining / drop) * 2 : null; // rough est (1 audit per 2 weeks)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.90, y: 24 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94, y: 16 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className="fixed bottom-6 left-1/2 z-[9998] w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
      style={{
        transform: 'translateX(-50%)',
        background: 'linear-gradient(135deg, rgba(16,185,129,0.18), rgba(16,185,129,0.06))',
        border: '1px solid rgba(16,185,129,0.40)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Dismiss */}
      <button
        onClick={onDismiss}
        className="absolute top-2 right-2 p-1.5 rounded-full opacity-40 hover:opacity-80 transition-opacity"
      >
        <X className="w-3.5 h-3.5" style={{ color: 'var(--alpha-text-85)' }} />
      </button>

      <div className="px-4 py-4">
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(16,185,129,0.20)', border: '1px solid rgba(16,185,129,0.40)' }}
          >
            <TrendingDown className="w-5 h-5" style={{ color: 'var(--color-emerald500-text)' }} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--color-amber500-text)' }} />
              <p className="text-[9px] font-black tracking-widest" style={{ color: 'rgba(16,185,129,0.80)' }}>
                PROGRESS DETECTED
              </p>
            </div>
            <p className="text-[14px] font-black" style={{ color: 'var(--alpha-text-92)' }}>
              Your risk dropped {drop} points.
            </p>
            <p className="text-[10px]" style={{ color: 'var(--alpha-text-50)' }}>
              That's real progress.
            </p>
          </div>
        </div>

        {/* Score delta */}
        <div
          className="flex items-center justify-center gap-3 py-2 rounded-xl mb-3"
          style={{ background: 'var(--alpha-bg-04)', border: '1px solid var(--alpha-bg-08)' }}
        >
          <div className="text-center">
            <p className="text-[22px] font-black" style={{ color: 'var(--alpha-text-45)' }}>
              {previousScore}
            </p>
            <p className="text-[8px]" style={{ color: 'var(--alpha-text-25)' }}>before</p>
          </div>
          <ArrowRight className="w-4 h-4" style={{ color: 'var(--color-emerald500-text)' }} />
          <div className="text-center">
            <p className="text-[28px] font-black" style={{ color: 'var(--color-emerald500-text)' }}>
              {currentScore}
            </p>
            <p className="text-[8px]" style={{ color: 'rgba(16,185,129,0.70)' }}>now</p>
          </div>
        </div>

        {/* What changed */}
        {changedSignals.length > 0 && (
          <div className="space-y-1 mb-3">
            <p className="text-[9px] font-semibold tracking-widest mb-1" style={{ color: 'var(--alpha-text-25)' }}>
              WHAT DROVE THIS
            </p>
            {changedSignals.slice(0, 2).map((s, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-[10px]" style={{ color: 'var(--alpha-text-55)' }}>{s.label}</span>
                <span
                  className="text-[10px] font-bold"
                  style={{ color: s.positive ? '#10b981' : '#f97316' }}
                >
                  {s.delta}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Momentum framing */}
        {weeksAtThisPace && weeksAtThisPace < 52 && (
          <p className="text-[10px] text-center italic mb-2" style={{ color: 'var(--alpha-text-35)' }}>
            At this pace — MODERATE risk in ~{weeksAtThisPace} weeks.
          </p>
        )}
      </div>
    </motion.div>
  );
};

export default ScoreImprovementCelebration;
