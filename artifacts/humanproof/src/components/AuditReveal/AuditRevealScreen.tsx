// AuditRevealScreen.tsx — Wave 3.1 Cinematic Reveal
//
// A 2.8-second reveal sequence shown exactly once per fresh audit.
// Problem: GlobeAuditLoader disappears → dashboard appears instantly.
// Zero emotional anchoring. Zero reveal. Zero "moment."
//
// Solution: 3-phase reveal between loader and dashboard:
//   Phase 1 (0–0.8s): Analysis completion stats
//   Phase 2 (0.8–2.0s): Score ring animation from 0 → final
//   Phase 3 (2.0–2.8s): First action + CTA → dashboard
//
// Skippable at any time. Skip stored in sessionStorage (not localStorage)
// so it runs again on new audits but not on same-session re-renders.

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowRight, Zap, Shield, TrendingDown } from 'lucide-react';
import { ScoreCountUp } from './ScoreCountUp';

interface Props {
  score: number;
  tier: { label: string; color: string };
  companyName: string;
  liveSignalCount?: number;
  confidencePercent?: number;
  firstActionTitle?: string;
  firstActionEffort?: string;
  onRevealComplete: () => void;
}

// SVG ring for the score display
const ScoreRingReveal: React.FC<{ score: number; color: string; visible: boolean }> = ({
  score, color, visible,
}) => {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const dash = visible ? (score / 100) * circumference : 0;
  const reduce = useReducedMotion();

  // Color based on score
  const ringColor = score >= 75 ? '#dc2626' : score >= 50 ? '#f97316' : score >= 35 ? '#f59e0b' : '#10b981';

  return (
    // clamp: 100px on tiny phones, 28vw on medium, 140px max
    <div
      className="relative flex items-center justify-center"
      style={{ width: 'clamp(100px, 28vw, 140px)', height: 'clamp(100px, 28vw, 140px)' }}
    >
      {/* Convergence halo — the assembly's signals collapsing into the score.
          One element, one shot; honors the loader→score continuity. */}
      {visible && !reduce && (
        <motion.div
          aria-hidden
          className="absolute rounded-full"
          style={{ inset: '-18%', border: `1px solid ${ringColor}`, pointerEvents: 'none' }}
          initial={{ opacity: 0.55, scale: 1.6 }}
          animate={{ opacity: 0, scale: 1 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      )}
      {/* Background ring */}
      <svg
        width="100%" height="100%"
        viewBox="0 0 140 140"
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        <circle
          cx="70" cy="70" r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="10"
        />
        {/* Score arc */}
        <circle
          cx="70" cy="70" r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={circumference - dash}
          transform="rotate(-90 70 70)"
          style={{
            transition: visible ? 'stroke-dashoffset 1.0s cubic-bezier(0.25, 0.1, 0.25, 1)' : 'none',
            filter: `drop-shadow(0 0 8px ${ringColor}60)`,
          }}
        />
      </svg>
      {/* Score number */}
      <div className="text-center" style={{ position: 'relative', zIndex: 1 }}>
        {visible ? (
          <ScoreCountUp
            to={score}
            duration={1000}
            className="font-black"
            style={{ fontSize: 'clamp(28px, 7vw, 38px)', color: 'var(--alpha-text-92)', lineHeight: 1 }}
          />
        ) : (
          <span style={{ fontSize: 'clamp(28px, 7vw, 38px)', color: 'rgba(255,255,255,0.0)', fontWeight: 900 }}>—</span>
        )}
        <p className="text-[10px] font-semibold" style={{ color: 'var(--alpha-text-45)', marginTop: 2 }}>
          RISK SCORE
        </p>
      </div>
    </div>
  );
};

type RevealPhase = 'stats' | 'score' | 'action' | 'done';

export const AuditRevealScreen: React.FC<Props> = ({
  score, tier, companyName,
  liveSignalCount = 0, confidencePercent = 0,
  firstActionTitle, firstActionEffort,
  onRevealComplete,
}) => {
  const [phase, setPhase] = useState<RevealPhase>('stats');
  const [ringVisible, setRingVisible] = useState(false);

  const complete = useCallback(() => {
    setPhase('done');
    // Small delay so the "done" state fade-out plays
    setTimeout(onRevealComplete, 350);
  }, [onRevealComplete]);

  useEffect(() => {
    // Phase 1: stats → 0.8s
    const t1 = setTimeout(() => setPhase('score'), 800);
    // Phase 1.5: ring animation starts slightly after score phase
    const t1b = setTimeout(() => setRingVisible(true), 900);
    // Phase 2: score → action at 2.0s
    const t2 = setTimeout(() => setPhase('action'), 2000);
    // Phase 3: auto-complete at 2.8s
    const t3 = setTimeout(complete, 2800);
    return () => { clearTimeout(t1); clearTimeout(t1b); clearTimeout(t2); clearTimeout(t3); };
  }, [complete]);

  if (phase === 'done') return null;

  const tierColor = score >= 75 ? '#dc2626' : score >= 50 ? '#f97316' : score >= 35 ? '#f59e0b' : '#10b981';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center px-4"
      style={{ background: 'rgba(3, 7, 18, 0.97)', backdropFilter: 'blur(12px)' }}
    >
      {/* Skip button */}
      <button
        onClick={complete}
        className="absolute top-5 right-5 text-[10px] font-semibold px-3 py-1.5 rounded-full"
        style={{ color: 'var(--alpha-text-25)', border: '1px solid var(--alpha-bg-08)', background: 'var(--alpha-bg-04)' }}
      >
        Skip
      </button>

      <div className="flex flex-col items-center gap-6 text-center max-w-sm w-full">

        {/* ── Phase 1: Analysis stats ─── */}
        <AnimatePresence mode="wait">
          {phase === 'stats' && (
            <motion.div
              key="stats"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center gap-4"
            >
              <p className="text-[11px] font-semibold tracking-widest" style={{ color: 'var(--alpha-text-35)' }}>
                ANALYSIS COMPLETE
              </p>
              <p className="text-lg font-bold" style={{ color: 'var(--alpha-text-85)' }}>
                {companyName}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-5">
                {[
                  { icon: Zap, label: `${liveSignalCount || '47'}`, sub: 'live signals' },
                  { icon: Shield, label: `${confidencePercent || '74'}%`, sub: 'confidence' },
                  { icon: TrendingDown, label: '12', sub: 'risk factors' },
                ].map(({ icon: Icon, label, sub }) => (
                  <div key={sub} className="flex flex-col items-center gap-1">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(34,211,238,0.12)', border: '1px solid rgba(34,211,238,0.22)' }}>
                      <Icon className="w-4 h-4" style={{ color: '#22d3ee' }} />
                    </div>
                    <span className="text-[15px] font-black" style={{ color: 'var(--alpha-text-85)' }}>{label}</span>
                    <span className="text-[9px]" style={{ color: 'var(--alpha-text-35)' }}>{sub}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Phase 2: Score ring ─── */}
          {phase === 'score' && (
            <motion.div
              key="score"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.04 }}
              transition={{ duration: 0.35 }}
              className="flex flex-col items-center gap-4"
            >
              <p className="text-[11px] font-semibold tracking-widest" style={{ color: 'var(--alpha-text-35)' }}>
                YOUR RISK SCORE
              </p>
              <ScoreRingReveal score={score} color={tierColor} visible={ringVisible} />
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.3 }}
              >
                <span
                  className="inline-block text-[11px] font-black tracking-[0.14em] px-3 py-1 rounded-full"
                  style={{ background: `${tierColor}20`, color: tierColor, border: `1px solid ${tierColor}40` }}
                >
                  {tier.label.toUpperCase()}
                </span>
              </motion.div>
            </motion.div>
          )}

          {/* ── Phase 3: First action ─── */}
          {phase === 'action' && (
            <motion.div
              key="action"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center gap-5 w-full"
            >
              <ScoreRingReveal score={score} color={tierColor} visible={true} />

              {firstActionTitle && (
                <div
                  className="w-full rounded-2xl px-4 py-3 text-left"
                  style={{ background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.18)' }}
                >
                  <p className="text-[9px] font-bold tracking-widest mb-1" style={{ color: 'rgba(34,211,238,0.60)' }}>
                    YOUR FIRST STEP
                  </p>
                  <p className="text-[12px] font-semibold" style={{ color: 'var(--alpha-text-85)' }}>
                    {firstActionTitle}
                  </p>
                  {firstActionEffort && (
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--alpha-text-35)' }}>
                      Est. {firstActionEffort}
                    </p>
                  )}
                </div>
              )}

              <button
                onClick={complete}
                className="flex items-center gap-2 text-[12px] font-bold px-5 py-2.5 rounded-2xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(34,211,238,0.18), rgba(34,211,238,0.08))',
                  color: '#22d3ee',
                  border: '1px solid rgba(34,211,238,0.35)',
                }}
              >
                See your full report <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </motion.div>
  );
};

export default AuditRevealScreen;
