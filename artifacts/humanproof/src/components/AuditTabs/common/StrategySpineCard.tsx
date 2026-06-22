// StrategySpineCard.tsx — P5 of the platform transformation ("one strategy voice")
//
// PROBLEM
// The "Take Action" surface opened as a stack of independently-reasoned pieces:
// a time-to-safety strip, a contingency plan, scenario branches, an action list.
// Each is individually good, but the user facing a layoff doesn't want four
// parallel analyses — they want to hear ONE editor say "here is the play." The
// risk surface already has that single voice (ReasoningSpineCard / feed.spine);
// the action surface had none. The strategy was implied across panels, never
// stated.
//
// SOLUTION
// A strategy-spine: the action-side analogue of the risk-spine. It reads the
// already-computed strategySynthesis (overall posture, the one priority move,
// the safety window, the single biggest risk + opportunity, competitive
// standing) and renders it as one continuous strategic statement. It does NOT
// recompute anything — it gives the existing synthesis a single human voice and
// leads the tab, so the panels below read as supporting detail, not competing
// verdicts.
//
// Unifies three previously-separate signals into one beat:
//   • time-to-safety   → estimatedSafetyWindowDays ("you have ~N days")
//   • contingency      → singleBiggestRisk ("the one thing that derails this")
//   • scenarios        → singleBiggestOpportunity ("the one thing to seize")
//
// Pure presentational. SSR-safe. Renders nothing when synthesis is absent.

import React from 'react';
import { motion } from 'framer-motion';
import { Compass, Zap, ShieldAlert, Sparkles, CalendarClock, Trophy } from 'lucide-react';
import type { StrategySynthesisResult } from '../../../services/strategySynthesisEngine';
import { useIntelligencePulse } from '../../ui/useIntelligencePulse';

interface Props {
  strategy?: StrategySynthesisResult | null;
}

type Posture = StrategySynthesisResult['overallStrategy'];

// Plain-English posture copy — written for the person living it, not a reviewer.
const POSTURE_COPY: Record<Posture, { label: string; accent: string }> = {
  EMERGENCY_EXIT:            { label: 'Start job hunting now', accent: '#ef4444' },
  ACCELERATE_EXIT:           { label: 'Start job hunting now', accent: '#f97316' },
  VISA_WINDOW_EXIT:          { label: 'Start job hunting now', accent: '#f97316' },
  EQUITY_HARVEST_THEN_EXIT:  { label: 'Stay a bit longer, then move on', accent: '#f59e0b' },
  GEOGRAPHIC_ARBITRAGE:      { label: 'Consider relocating', accent: '#22d3ee' },
  PROTECT_AND_WAIT:          { label: 'Stay and improve', accent: '#f59e0b' },
  STRENGTHEN_POSITION:       { label: 'Stay and improve', accent: '#22d3ee' },
  OPPORTUNISTIC_MOVE:        { label: 'Watch for a good opportunity', accent: '#10b981' },
};

const URGENCY_COPY: Record<StrategySynthesisResult['urgencyLevel'], string> = {
  CRITICAL: 'Act this week',
  HIGH: 'Act within days',
  MODERATE: 'No rush, but keep moving',
  LOW: 'You have time',
};

function safetyWindowPhrase(days: number): string {
  if (days <= 0) return 'You should act now';
  if (days <= 14) return `You have about ${days} days before things may change`;
  const weeks = Math.round(days / 7);
  if (weeks <= 8) return `You have about ${weeks} weeks before things may change`;
  const months = Math.round(days / 30);
  return `You have about ${months} month${months > 1 ? 's' : ''} before things may change`;
}

export const StrategySpineCard: React.FC<Props> = ({ strategy }) => {
  const scanning = useIntelligencePulse(!!strategy);
  if (!strategy) return null;

  const posture = POSTURE_COPY[strategy.overallStrategy] ?? POSTURE_COPY.STRENGTHEN_POSITION;
  const accent = posture.accent;
  const priority = strategy.topPriorityAction;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={`rounded-2xl overflow-hidden intel-scan${scanning ? ' is-scanning' : ''}`}
      style={{
        background: `linear-gradient(135deg, ${accent}10, rgba(255,255,255,0.02))`,
        border: `1px solid ${accent}30`,
      }}
    >
      {/* Header — the posture in one phrase */}
      <div className="flex items-start gap-3 px-4 pt-4 pb-3">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${accent}1c`, border: `1px solid ${accent}33` }}
        >
          <Compass className="w-4 h-4" style={{ color: accent }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[10px] font-black tracking-[0.14em] uppercase" style={{ color: accent }}>
              Recommended Plan
            </p>
            <span
              className="text-[10px] font-black tracking-wide px-1.5 py-0.5 rounded"
              style={{ background: `${accent}1c`, color: accent }}
            >
              {URGENCY_COPY[strategy.urgencyLevel]}
            </span>
          </div>
          <p className="text-[15px] font-black leading-snug mt-1" style={{ color: 'rgba(255,255,255,0.93)' }}>
            {posture.label}
          </p>
          <p className="text-[12px] leading-relaxed mt-1" style={{ color: 'rgba(255,255,255,0.62)' }}>
            {strategy.strategyRationale}
          </p>
        </div>
      </div>

      {/* The one move now */}
      {priority && (
        <div className="mx-4 mb-3 rounded-xl px-3.5 py-3" style={{ background: `${accent}14`, border: `1px solid ${accent}2a` }}>
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-3.5 h-3.5 flex-shrink-0" style={{ color: accent }} />
            <p className="text-[10px] font-black tracking-[0.14em] uppercase" style={{ color: accent }}>
              Start here · {priority.timeHorizon}
            </p>
          </div>
          <p className="text-[13px] font-bold leading-snug" style={{ color: 'rgba(255,255,255,0.92)' }}>
            {priority.title}
          </p>
          {priority.rationale && (
            <p className="text-[11px] leading-snug mt-1" style={{ color: 'rgba(255,255,255,0.55)' }}>
              {priority.rationale}
            </p>
          )}
        </div>
      )}

      {/* Unified beat: time remaining + main concern + best opportunity */}
      <div className="px-4 pb-4 space-y-2">
        <Row icon={CalendarClock} color="rgba(255,255,255,0.55)" label="Time"
          text={safetyWindowPhrase(strategy.estimatedSafetyWindowDays)} />
        {strategy.singleBiggestRisk && (
          <Row icon={ShieldAlert} color="#f59e0b" label="Main Concern"
            text={strategy.singleBiggestRisk} />
        )}
        {strategy.singleBiggestOpportunity && (
          <Row icon={Sparkles} color="#10b981" label="Best Opportunity"
            text={strategy.singleBiggestOpportunity} />
        )}
        {strategy.competitivePositionStatement && (
          <Row icon={Trophy} color="#22d3ee" label="Where You Stand"
            text={strategy.competitivePositionStatement} />
        )}
      </div>
    </motion.div>
  );
};

const Row: React.FC<{ icon: React.ElementType; color: string; label: string; text: string }> = ({
  icon: Icon,
  color,
  label,
  text,
}) => (
  <div className="flex items-start gap-2.5">
    <div
      className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
      style={{ background: `${color}1c` }}
    >
      <Icon className="w-3 h-3" style={{ color }} />
    </div>
    <p className="text-[11.5px] leading-snug flex-1 min-w-0" style={{ color: 'rgba(255,255,255,0.68)' }}>
      <span className="font-black tracking-wide uppercase text-[10px] mr-1.5" style={{ color }}>
        {label}
      </span>
      {text}
    </p>
  </div>
);

export default StrategySpineCard;
