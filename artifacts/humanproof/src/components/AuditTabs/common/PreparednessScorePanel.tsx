// PreparednessScorePanel.tsx — v17.0
// Renders the Career Preparedness Score (0–100) with 5-pillar breakdown.
// This is a META-score answering "If laid off TODAY, how ready am I?" —
// distinct from the risk score (layoff probability at your company).

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DollarSign, Users, Zap, Target, Briefcase,
  ChevronDown, ChevronRight, TrendingUp, AlertCircle,
} from 'lucide-react';
import type { PreparednessResult, PillarScore } from '../../../services/preparednessScoreEngine';

// ── Config ────────────────────────────────────────────────────────────────────

const READINESS_CONFIG = {
  READY:          { color: '#10b981', label: 'Ready',           bg: 'rgba(16,185,129,0.12)'  },
  MOSTLY_READY:   { color: '#22d3ee', label: 'Mostly Ready',    bg: 'rgba(34,211,238,0.12)'  },
  PARTIAL:        { color: '#f59e0b', label: 'Partially Ready', bg: 'rgba(245,158,11,0.12)'  },
  UNDERPREPARED:  { color: '#f97316', label: 'Underprepared',   bg: 'rgba(249,115,22,0.12)'  },
  NOT_READY:      { color: '#dc2626', label: 'Not Ready',       bg: 'rgba(220,38,38,0.12)'   },
} as const;

const STATUS_COLORS = {
  strong:   '#10b981',
  good:     '#22d3ee',
  fair:     '#f59e0b',
  weak:     '#f97316',
  critical: '#dc2626',
} as const;

const PILLAR_ICONS: Record<string, React.ElementType> = {
  financial:   DollarSign,
  market:      Users,
  skills:      Zap,
  clarity:     Target,
  operational: Briefcase,
};

// ── Score Ring ────────────────────────────────────────────────────────────────

interface ScoreRingProps {
  score: number;
  color: string;
  size?: number;
}

const ScoreRing: React.FC<ScoreRingProps> = ({ score, color, size = 100 }) => {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={8} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - fill }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-2xl font-black"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{ color }}
        >
          {score}
        </motion.span>
        <span className="text-[9px] font-bold tracking-wider" style={{ color: 'rgba(255,255,255,0.40)' }}>
          /100
        </span>
      </div>
    </div>
  );
};

// ── Pillar Row ────────────────────────────────────────────────────────────────

interface PillarRowProps {
  pillar: PillarScore;
  isExpanded: boolean;
  onToggle: () => void;
}

const PillarRow: React.FC<PillarRowProps> = ({ pillar, isExpanded, onToggle }) => {
  const Icon = PILLAR_ICONS[pillar.key] ?? Briefcase;
  const statusColor = STATUS_COLORS[pillar.status] ?? '#f59e0b';

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <button onClick={onToggle} className="w-full p-3 text-left">
        <div className="flex items-center gap-3">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: statusColor + '18' }}
          >
            <Icon className="w-3.5 h-3.5" style={{ color: statusColor }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[12px] font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>
                {pillar.label}
                {/* Audit v35: heuristic badge — surfaced when 2+ inputs were
                    industry priors rather than personalized live data. */}
                {pillar.isHeuristic && (
                  <span
                    className="ml-1.5 text-[8px] font-bold px-1.5 py-0.5 rounded"
                    style={{
                      background: 'rgba(245,158,11,0.15)',
                      color: '#f59e0b',
                      border: '1px solid rgba(245,158,11,0.30)',
                    }}
                    title={`Heuristic: ${(pillar.heuristicInputs ?? []).join(', ') || 'industry priors'}`}
                  >
                    PRIORS
                  </span>
                )}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black" style={{ color: statusColor }}>
                  {pillar.score}
                </span>
                {isExpanded
                  ? <ChevronDown className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.35)' }} />
                  : <ChevronRight className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.35)' }} />
                }
              </div>
            </div>
            {/* Score bar */}
            <div className="h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pillar.score}%` }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
                className="h-1 rounded-full"
                style={{ background: statusColor }}
              />
            </div>
          </div>
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div
              className="px-3 pb-3 pt-2 space-y-2"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              {/* Signals */}
              {pillar.signals.length > 0 && (
                <div>
                  <p className="text-[9px] font-bold tracking-widest mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    SIGNALS
                  </p>
                  {pillar.signals.map((s, i) => (
                    <p key={i} className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.60)' }}>
                      · {s}
                    </p>
                  ))}
                </div>
              )}

              {/* Quick wins */}
              {pillar.quickWins.length > 0 && (
                <div>
                  <p className="text-[9px] font-bold tracking-widest mb-1.5" style={{ color: statusColor + 'cc' }}>
                    QUICK WINS
                  </p>
                  {pillar.quickWins.map((w, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <TrendingUp className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: statusColor }} />
                      <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.72)' }}>
                        {w}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

interface PreparednessScorePanelProps {
  preparedness: PreparednessResult;
}

const PreparednessScorePanel: React.FC<PreparednessScorePanelProps> = ({ preparedness }) => {
  const [expandedPillar, setExpandedPillar] = useState<string | null>(null);

  const config = READINESS_CONFIG[preparedness.readinessLabel];
  const pillars = Object.values(preparedness.pillars);

  const togglePillar = (key: string) => {
    setExpandedPillar(prev => prev === key ? null : key);
  };

  return (
    <div className="space-y-4">
      {/* Hero: score + readiness label */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-4 panel-hover"
        style={{
          background: config.bg,
          border: `1px solid ${config.color}30`,
          boxShadow: 'var(--shadow-elev-2)',
        }}
      >
        <div className="flex items-center gap-4">
          <ScoreRing score={preparedness.overallScore} color={config.color} size={96} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-[10px] font-black tracking-widest px-2.5 py-1 rounded-full"
                style={{ background: config.color + '25', color: config.color, border: `1px solid ${config.color}40` }}
              >
                {config.label.toUpperCase()}
              </span>
            </div>
            <h3 className="text-sm font-bold mb-1" style={{ color: 'rgba(255,255,255,0.92)' }}>
              Career Preparedness
            </h3>
            <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.58)' }}>
              {preparedness.estimatedLandingWeeks}w estimated to a comparable offer if laid off today
            </p>
          </div>
        </div>

        {/* Narrative */}
        <div
          className="mt-3 p-3 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
            {preparedness.preparednessNarrative}
          </p>
        </div>
      </motion.div>

      {/* Pillar breakdown */}
      <div>
        <p className="text-[10px] font-bold tracking-widest mb-2.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
          5-PILLAR BREAKDOWN
        </p>
        <div className="space-y-2">
          {pillars.map((pillar) => (
            <PillarRow
              key={pillar.key}
              pillar={pillar}
              isExpanded={expandedPillar === pillar.key}
              onToggle={() => togglePillar(pillar.key)}
            />
          ))}
        </div>
      </div>

      {/* Top gaps */}
      {preparedness.topGaps.length > 0 && (
        <div
          className="rounded-2xl p-3"
          style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.20)' }}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <AlertCircle className="w-3.5 h-3.5" style={{ color: '#f97316' }} />
            <p className="text-[10px] font-bold tracking-wider" style={{ color: '#f97316' }}>
              TOP GAPS TO CLOSE
            </p>
          </div>
          {preparedness.topGaps.map((gap, i) => (
            <p key={i} className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
              {i + 1}. {gap}
            </p>
          ))}
        </div>
      )}

      {/* Quick wins */}
      {preparedness.quickWins.length > 0 && (
        <div
          className="rounded-2xl p-3"
          style={{ background: 'rgba(0,212,224,0.06)', border: '1px solid rgba(0,212,224,0.20)' }}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="w-3.5 h-3.5" style={{ color: '#00d4e0' }} />
            <p className="text-[10px] font-bold tracking-wider" style={{ color: '#00d4e0' }}>
              QUICK WINS — RAISE SCORE 10+ PTS IN 30 DAYS
            </p>
          </div>
          {preparedness.quickWins.map((win, i) => (
            <div key={i} className="flex items-start gap-2 mb-1.5">
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: '#00d4e0' }} />
              <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.72)' }}>
                {win}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Footnote */}
      <p className="text-[10px] text-center px-2" style={{ color: 'rgba(255,255,255,0.25)' }}>
        Preparedness score is independent of layoff probability — read alongside your risk score for a complete picture.
      </p>
    </div>
  );
};

export default PreparednessScorePanel;
