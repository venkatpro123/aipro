// ReasoningSpineCard.tsx — P1 of the platform transformation ("the reasoning surface")
//
// PURPOSE
// P0 shipped the orchestrator (signalOrchestrator.ts) which produces an
// OrchestratedFeed: ranked signals, a single primary move, a one-line narrative
// `spine`, and a structured `trace` (observation → inference → relevance →
// conclusion → move + confidence). Until now NOTHING rendered it.
//
// This card is that surface. It reads the feed as the single "voice" of the
// platform so the dashboard feels like one continuously-thinking AI rather than
// a stack of equal-weight panels:
//
//   • Spine line  — the lead sentence (what the AI concluded, in one breath).
//   • Primary move — the ONE next action, with a feasibility warning when the
//                    user's situation (short runway / visa clock) constrains it.
//   • Trace       — the full chain-of-thought behind progressive disclosure.
//
// Pure presentational: takes the already-computed `feed` and renders it. No
// data fetching, no Date.now, no recomputation. SSR-safe.

import React from 'react';
import { motion } from 'framer-motion';
import { Brain, ArrowRight, AlertTriangle, Sparkles } from 'lucide-react';
import type { OrchestratedFeed } from '../../../services/orchestration/signalOrchestrator';
import AdaptiveBlock from './AdaptiveBlock';

interface Props {
  feed: OrchestratedFeed;
}

const EASE = [0.22, 1, 0.36, 1] as const;
const ACCENT = '#a78bfa'; // violet — the "AI cognition" accent, distinct from risk reds

/** Ordered trace steps with short human labels for the chain-of-thought stepper. */
const TRACE_STEPS: Array<{ key: keyof OrchestratedFeed['trace']; label: string }> = [
  { key: 'observation', label: 'Observed' },
  { key: 'inference',   label: 'Implies' },
  { key: 'relevance',   label: 'For you' },
  { key: 'conclusion',  label: 'Posture' },
  { key: 'move',        label: 'Next' },
];

export const ReasoningSpineCard: React.FC<Props> = ({ feed }) => {
  const { spine, trace, primaryMove } = feed;
  const steps = TRACE_STEPS.filter(s => {
    const v = trace[s.key];
    return typeof v === 'string' && v.trim().length > 0;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      className="rounded-2xl p-3 sm:p-4 relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${ACCENT}14, rgba(255,255,255,0.02))`,
        border: `1px solid ${ACCENT}30`,
      }}
    >
      {/* Header — establishes the "AI is speaking" voice */}
      <div className="flex items-center gap-2 mb-2.5">
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${ACCENT}22`, border: `1px solid ${ACCENT}40` }}
        >
          <Brain className="w-3.5 h-3.5" style={{ color: ACCENT }} />
        </div>
        <span
          className="text-[10px] font-black tracking-wider uppercase"
          style={{ color: ACCENT, letterSpacing: '0.12em' }}
        >
          AI Read
        </span>
      </div>

      {/* Spine — the one-line editorial summary */}
      <p
        className="text-[13px] sm:text-sm font-semibold leading-snug"
        style={{ color: 'rgba(255,255,255,0.92)' }}
      >
        {spine}
      </p>

      {/* Primary move — the single next action */}
      {primaryMove && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: EASE, delay: 0.08 }}
          className="mt-3 rounded-xl p-2.5 sm:p-3"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: `1px solid ${primaryMove.feasibleForProfile ? ACCENT + '2e' : 'rgba(245,158,11,0.35)'}`,
          }}
        >
          <div className="flex items-start gap-2">
            <ArrowRight
              className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"
              style={{ color: primaryMove.feasibleForProfile ? ACCENT : '#f59e0b' }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-bold leading-tight" style={{ color: 'rgba(255,255,255,0.9)' }}>
                {primaryMove.moveLabel ?? primaryMove.action.title}
              </p>
              {primaryMove.rationale && (
                <p className="text-[10.5px] leading-snug mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {primaryMove.rationale}
                </p>
              )}
              {!primaryMove.feasibleForProfile && (
                <div
                  className="flex items-center gap-1.5 mt-1.5 text-[10px] font-semibold"
                  style={{ color: '#fbbf24' }}
                >
                  <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                  <span>Best available, but constrained by your situation — see the action plan for a faster bridge.</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Trace — full chain-of-thought behind progressive disclosure */}
      <div className="mt-3">
        <AdaptiveBlock
          title="How the AI reasoned"
          subtitle="Step-by-step trace"
          icon={Sparkles}
          tier={2}
          accentColor={ACCENT}
          defaultOpen={false}
          badge={trace.confidence ? trace.confidence.replace(/^Confidence:\s*/i, '') : undefined}
          badgeColor={ACCENT}
        >
          <ol className="space-y-2.5">
            {steps.map((step, i) => (
              <li key={step.key} className="flex items-start gap-2.5">
                {/* Step rail + index */}
                <div className="flex flex-col items-center flex-shrink-0">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black"
                    style={{ background: `${ACCENT}22`, color: ACCENT, border: `1px solid ${ACCENT}40` }}
                  >
                    {i + 1}
                  </div>
                  {i < steps.length - 1 && (
                    <div className="w-px flex-1 mt-1" style={{ background: `${ACCENT}25`, minHeight: 12 }} />
                  )}
                </div>
                <div className="flex-1 min-w-0 pb-0.5">
                  <p
                    className="text-[9px] font-black uppercase tracking-wider"
                    style={{ color: ACCENT, letterSpacing: '0.1em' }}
                  >
                    {step.label}
                  </p>
                  <p className="text-[11.5px] leading-snug mt-0.5" style={{ color: 'rgba(255,255,255,0.75)' }}>
                    {trace[step.key]}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </AdaptiveBlock>
      </div>
    </motion.div>
  );
};

export default ReasoningSpineCard;
