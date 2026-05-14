// v3/SummaryTab.tsx — v28.0 UX redesign
// Executive summary tab. First thing users see after an audit.
//
// Design principles:
//   • Score and verdict above the fold — always
//   • Four quick-stat chips for instant scanning
//   • Intelligence brief truncated to 2 lines; full text behind "Read more"
//   • Prediction horizon as a compact 3-cell horizontal strip
//   • Scenarios hidden behind a collapsible — not first-view clutter
//   • All layout optimised for 375px–428px mobile screens first

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp,
  Zap, Shield, Activity, Brain, Clock, Signal,
  AlertTriangle, CheckCircle2, Info, ArrowRight,
} from 'lucide-react';
import type { TabProps } from '../common/types';
import type { IntelligenceBriefResult } from '../../../services/intelligenceBriefService';
import type { PredictionHorizonResult } from '../../../services/predictionHorizonService';
import type { ScenarioPlanResult } from '../../../services/scenarioPlanService';
import type { PreparednessResult } from '../../../services/preparednessScoreEngine';

// ── v33: Tier-1 critical-intel components ────────────────────────────────────
// Surface the top risk drivers and top immediate actions in the FIRST viewport
// so the user sees "what is moving the score" + "what should I do this week"
// without scrolling. Both blocks are intentionally compact (≤3 rows) and use
// "Read more" affordances for deep detail rather than rendering everything.

interface DriverItem {
  key:    string;
  label:  string;
  score:  number;       // 0–100 dimension score (higher = more risk)
  why:    string;       // one-line rationale for the user
}

interface ActionItem {
  priority: string;
  title:    string;
  timeline: string;
  step?:    string;
}

const TopDriversStrip: React.FC<{ drivers: DriverItem[] }> = ({ drivers }) => {
  if (drivers.length === 0) return null;
  const top = drivers.slice(0, 3);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 }}
      className="rounded-2xl p-3"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="flex items-center gap-1.5 mb-2.5">
        <AlertTriangle className="w-3.5 h-3.5" style={{ color: '#f59e0b' }} />
        <span className="text-[10px] font-bold tracking-widest" style={{ color: 'rgba(255,255,255,0.40)' }}>
          TOP RISK DRIVERS
        </span>
      </div>
      <div className="space-y-1.5">
        {top.map(d => (
          <div key={d.key} className="flex items-start gap-2.5">
            <div className="flex-shrink-0 px-1.5 py-0.5 rounded-md min-w-[36px] text-center"
              style={{
                background: riskColor(d.score) + '22',
                border: `1px solid ${riskColor(d.score)}38`,
              }}>
              <span className="text-[11px] font-black" style={{ color: riskColor(d.score) }}>
                {d.score}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold leading-tight"
                style={{ color: 'rgba(255,255,255,0.85)' }}>{d.label}</p>
              <p className="text-[10px] leading-snug truncate"
                style={{ color: 'rgba(255,255,255,0.50)' }}>{d.why}</p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

const ImmediateActionsStrip: React.FC<{ actions: ActionItem[] }> = ({ actions }) => {
  if (actions.length === 0) return null;
  const top = actions.slice(0, 3);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.14 }}
      className="rounded-2xl p-3"
      style={{
        background: 'rgba(0,212,224,0.04)',
        border: '1px solid rgba(0,212,224,0.18)',
      }}
    >
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5" style={{ color: 'var(--cyan,#00d4e0)' }} />
          <span className="text-[10px] font-bold tracking-widest" style={{ color: 'rgba(0,212,224,0.85)' }}>
            DO THIS WEEK
          </span>
        </div>
        <span className="text-[9px] font-semibold" style={{ color: 'rgba(255,255,255,0.30)' }}>
          {actions.length > 3 ? `+${actions.length - 3} more in Action Plan` : ''}
        </span>
      </div>
      <div className="space-y-1.5">
        {top.map((a, i) => (
          <div key={`${a.priority}-${i}`} className="flex items-start gap-2.5">
            <div className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
              style={{
                background: a.priority === 'Critical' ? '#dc262622'
                  : a.priority === 'High' ? '#f9731622' : '#06b6d422',
                border: `1px solid ${a.priority === 'Critical' ? '#dc262648'
                  : a.priority === 'High' ? '#f9731648' : '#06b6d448'}`,
              }}>
              <span className="text-[10px] font-black"
                style={{
                  color: a.priority === 'Critical' ? '#dc2626'
                    : a.priority === 'High' ? '#f97316' : '#06b6d4',
                }}>{i + 1}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold leading-tight"
                style={{ color: 'rgba(255,255,255,0.90)' }}>{a.title}</p>
              <p className="text-[10px] leading-snug truncate"
                style={{ color: 'rgba(255,255,255,0.45)' }}>
                {a.timeline}{a.step ? ` · ${a.step}` : ''}
              </p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

// ── Colour helpers ────────────────────────────────────────────────────────────

const riskColor = (s: number) =>
  s >= 75 ? '#dc2626' : s >= 55 ? '#f97316' : s >= 35 ? '#f59e0b' : '#10b981';

const riskLabel = (s: number) =>
  s >= 75 ? 'CRITICAL' : s >= 55 ? 'HIGH' : s >= 35 ? 'MODERATE' : 'LOW';

const riskGradient = (s: number) =>
  s >= 75 ? 'linear-gradient(135deg,#dc262640,#dc262618)'
  : s >= 55 ? 'linear-gradient(135deg,#f9731640,#f9731618)'
  : s >= 35 ? 'linear-gradient(135deg,#f59e0b40,#f59e0b18)'
  : 'linear-gradient(135deg,#10b98140,#10b98118)';

const readinessColor = (label: string) => ({
  READY: '#10b981', MOSTLY_READY: '#22d3ee',
  PARTIAL: '#f59e0b', UNDERPREPARED: '#f97316', NOT_READY: '#dc2626',
}[label] ?? '#f59e0b');

// ── Score Ring Hero ───────────────────────────────────────────────────────────

const ScoreRingHero: React.FC<{
  score: number;
  confidence: number;
  isMobile: boolean;
}> = ({ score, confidence, isMobile }) => {
  const size  = isMobile ? 140 : 172;
  const r     = (size - 14) / 2;
  const circ  = 2 * Math.PI * r;
  const color = riskColor(score);
  const label = riskLabel(score);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Outer glow ring */}
        <div className="absolute inset-0 rounded-full" style={{
          boxShadow: `0 0 ${isMobile ? 28 : 40}px ${color}30`,
        }} />
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size/2} cy={size/2} r={r} fill="none"
            stroke="rgba(255,255,255,0.06)" strokeWidth={10} />
          <motion.circle
            cx={size/2} cy={size/2} r={r} fill="none"
            stroke={color} strokeWidth={10} strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ - (score / 100) * circ }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="font-black leading-none"
            style={{ fontSize: isMobile ? 44 : 56, color }}
          >
            {score}
          </motion.span>
          <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.35)' }}>
            /100
          </span>
        </div>
      </div>

      {/* Risk tier badge */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-3 px-4 py-1.5 rounded-full flex items-center gap-1.5"
        style={{
          background: color + '20',
          border: `1px solid ${color}50`,
          boxShadow: `0 2px 12px ${color}20`,
        }}
      >
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
        <span className="text-[11px] font-black tracking-[0.12em]" style={{ color }}>
          {label} RISK
        </span>
      </motion.div>

      <p className="mt-1.5 text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
        {confidence}% confidence
      </p>
    </div>
  );
};

// ── Quick Stats Row ───────────────────────────────────────────────────────────

interface StatChipProps {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  icon: React.ElementType;
}

const StatChip: React.FC<StatChipProps> = ({ label, value, sub, color = 'rgba(0,212,224,0.8)', icon: Icon }) => (
  <div
    className="flex-1 min-w-0 rounded-xl px-3 py-2.5 flex flex-col gap-0.5"
    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
  >
    <div className="flex items-center gap-1 mb-0.5">
      <Icon className="w-3 h-3 flex-shrink-0" style={{ color }} />
      <span className="text-[9px] font-bold tracking-wider uppercase truncate"
        style={{ color: 'rgba(255,255,255,0.35)' }}>
        {label}
      </span>
    </div>
    <span className="text-[15px] font-black leading-none" style={{ color }}>{value}</span>
    {sub && <span className="text-[9px] truncate" style={{ color: 'rgba(255,255,255,0.30)' }}>{sub}</span>}
  </div>
);

// ── Verdict Line ──────────────────────────────────────────────────────────────

const verdictLine = (score: number, urgency: string): string => {
  if (urgency === 'CRITICAL' || score >= 75)
    return 'Immediate action required — layoff risk is elevated.';
  if (urgency === 'HIGH' || score >= 55)
    return 'Elevated risk signals detected. Begin positioning now.';
  if (score >= 35)
    return 'Moderate signals present. Monitor and maintain readiness.';
  return 'Low risk detected. Good time to build and grow.';
};

// ── Brief Card (truncated) ────────────────────────────────────────────────────

const BriefCard: React.FC<{
  brief: IntelligenceBriefResult | null | undefined;
  urgency: string;
}> = ({ brief, urgency }) => {
  const [expanded, setExpanded] = useState(false);

  const color = { CRITICAL: '#dc2626', HIGH: '#f97316', MODERATE: '#f59e0b', LOW: '#10b981' }[urgency] ?? '#f59e0b';

  if (!brief) return (
    <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center gap-2 mb-2">
        <Brain className="w-3.5 h-3.5" style={{ color: 'rgba(0,212,224,0.5)' }} />
        <span className="text-[10px] font-bold tracking-widest" style={{ color: 'rgba(255,255,255,0.30)' }}>INTELLIGENCE BRIEF</span>
      </div>
      <div className="space-y-1.5">
        {[85, 70, 55].map((w, i) => (
          <div key={i} className="h-2.5 rounded-full animate-pulse"
            style={{ width: `${w}%`, background: 'rgba(255,255,255,0.06)' }} />
        ))}
      </div>
    </div>
  );

  const paragraphs = brief.paragraphs ?? [];
  const first = paragraphs[0] ?? '';
  const rest  = paragraphs.slice(1);

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: color + '0d', border: `1px solid ${color}30` }}>
      {/* Header */}
      <div className="px-4 pt-3.5 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-3.5 h-3.5" style={{ color }} />
          <span className="text-[10px] font-black tracking-widest" style={{ color: color + 'cc' }}>
            INTELLIGENCE BRIEF
          </span>
        </div>
        <span className="text-[9px] font-black tracking-widest px-2 py-0.5 rounded-full"
          style={{ background: color + '22', color, border: `1px solid ${color}35` }}>
          {urgency}
        </span>
      </div>

      {/* First paragraph always shown */}
      <div className="px-4 pb-3">
        <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.82)' }}>
          {first}
        </p>

        {/* Expanded paragraphs */}
        <AnimatePresence>
          {expanded && rest.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-2 space-y-2">
                {rest.map((p, i) => (
                  <p key={i} className="text-[11px] leading-relaxed"
                    style={{ color: 'rgba(255,255,255,0.60)' }}>
                    {p}
                  </p>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top action this week */}
        {brief.topActionThisWeek && expanded && (
          <div className="mt-3 p-3 rounded-xl flex items-start gap-2"
            style={{ background: color + '14', border: `1px solid ${color}28` }}>
            <Zap className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color }} />
            <div>
              <p className="text-[9px] font-bold tracking-wider mb-0.5" style={{ color }}>
                TOP ACTION THIS WEEK
              </p>
              <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.80)' }}>
                {brief.topActionThisWeek}
              </p>
            </div>
          </div>
        )}

        {/* Expand/collapse toggle */}
        {(rest.length > 0 || brief.topActionThisWeek) && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="mt-2 flex items-center gap-1 text-[11px] font-semibold"
            style={{ color: color + 'bb' }}
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? 'Show less' : 'Read full analysis'}
          </button>
        )}
      </div>
    </div>
  );
};

// ── Horizon Strip (compact 3-cell) ────────────────────────────────────────────

const HorizonStrip: React.FC<{ horizon: PredictionHorizonResult }> = ({ horizon }) => {
  const cells = [
    { label: '30 days', data: horizon.horizon30d },
    { label: '90 days', data: horizon.horizon90d },
    { label: '180 days', data: horizon.horizon180d },
  ];
  return (
    <div className="rounded-2xl p-3"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="flex items-center gap-1.5 mb-2.5">
        <Activity className="w-3.5 h-3.5" style={{ color: 'rgba(0,212,224,0.6)' }} />
        <span className="text-[10px] font-bold tracking-widest" style={{ color: 'rgba(255,255,255,0.35)' }}>
          RISK FORECAST
        </span>
        {horizon.groundTruthOverride && (
          <span className="ml-auto text-[9px] font-black px-1.5 py-0.5 rounded-full"
            style={{ background: 'rgba(220,38,38,0.20)', color: '#dc2626' }}>
            WARN OVERRIDE
          </span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {cells.map(({ label, data }) => {
          const c = riskColor(data.score);
          return (
            <div key={label} className="rounded-xl p-2.5 text-center"
              style={{ background: c + '12', border: `1px solid ${c}25` }}>
              <p className="text-[9px] mb-1" style={{ color: 'rgba(255,255,255,0.40)' }}>{label}</p>
              <p className="text-xl font-black" style={{ color: c }}>{data.score}</p>
              <p className="text-[9px] mt-0.5" style={{ color: 'rgba(255,255,255,0.30)' }}>
                {Math.round(data.confidence * 100)}% CI
              </p>
            </div>
          );
        })}
      </div>
      {horizon.trajectoryNarrative && (
        <p className="mt-2 text-[10px] leading-relaxed"
          style={{ color: 'rgba(255,255,255,0.45)' }}>
          {horizon.trajectoryNarrative}
        </p>
      )}
    </div>
  );
};

// ── Scenario Fan (collapsible) ────────────────────────────────────────────────

const ScenarioBlock: React.FC<{ scenario: ScenarioPlanResult }> = ({ scenario }) => {
  const [open, setOpen] = useState(false);
  const cases = [
    { label: 'Bear',  score: scenario.worstCase.score, prob: scenario.worstCase.probability, color: '#dc2626' },
    { label: 'Base',  score: scenario.baseCase.score,  prob: scenario.baseCase.probability,  color: '#f59e0b' },
    { label: 'Bull',  score: scenario.bestCase.score,  prob: scenario.bestCase.probability,  color: '#10b981' },
  ];
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <button onClick={() => setOpen(o => !o)}
        className="w-full px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Signal className="w-3.5 h-3.5" style={{ color: 'rgba(245,158,11,0.7)' }} />
          <span className="text-[12px] font-semibold" style={{ color: 'rgba(255,255,255,0.75)' }}>
            6-Month Scenarios
          </span>
          <div className="flex items-center gap-1 ml-2">
            {cases.map(c => (
              <span key={c.label} className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                style={{ background: c.color + '20', color: c.color }}>
                {c.label} {c.score}
              </span>
            ))}
          </div>
        </div>
        {open
          ? <ChevronUp className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.30)' }} />
          : <ChevronDown className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.30)' }} />
        }
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            className="overflow-hidden"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {cases.map(({ label, score, prob, color }) => (
                  <div key={label} className="rounded-xl p-2.5 text-center"
                    style={{ background: color + '12', border: `1px solid ${color}28` }}>
                    <p className="text-[9px] font-bold tracking-wider mb-1" style={{ color: color + 'cc' }}>
                      {label.toUpperCase()}
                    </p>
                    <p className="text-xl font-black mb-0.5" style={{ color }}>{score}</p>
                    <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.40)' }}>
                      {Math.round(prob * 100)}% likely
                    </p>
                  </div>
                ))}
              </div>
              <div className="rounded-xl p-3"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p className="text-[10px] font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.50)' }}>
                  KEY UNCERTAINTY
                </p>
                <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
                  {scenario.dominantUncertainty}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Conflict / Low-data alerts strip ─────────────────────────────────────────

const AlertStrip: React.FC<{
  lowDataWarning?: { code: string; missingCount: number; capAt: number };
  conflictCount: number;
  hardFailures: string[];
}> = ({ lowDataWarning, conflictCount, hardFailures }) => {
  const alerts: Array<{ icon: React.ElementType; text: string; color: string }> = [];

  if (lowDataWarning) {
    alerts.push({
      icon: Info,
      text: `${lowDataWarning.missingCount} critical signals missing — score is indicative (${Math.round(lowDataWarning.capAt * 100)}% confidence cap)`,
      color: '#f59e0b',
    });
  }
  if (conflictCount > 0) {
    alerts.push({
      icon: AlertTriangle,
      text: `${conflictCount} signal conflict${conflictCount > 1 ? 's' : ''} detected — score widened by ±${conflictCount * 2}pts`,
      color: '#f97316',
    });
  }
  if (hardFailures.length > 0) {
    alerts.push({
      icon: AlertTriangle,
      text: `${hardFailures.length} live source failure${hardFailures.length > 1 ? 's' : ''} — some signals are estimates`,
      color: '#dc2626',
    });
  }

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((a, i) => (
        <div key={i} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5"
          style={{ background: a.color + '12', border: `1px solid ${a.color}30` }}>
          <a.icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: a.color }} />
          <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.70)' }}>
            {a.text}
          </p>
        </div>
      ))}
    </div>
  );
};

// ── Main Export ───────────────────────────────────────────────────────────────

export const SummaryTab: React.FC<TabProps> = ({ result, companyData }) => {
  const r     = result as any;
  const score = result.total;
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  const brief: IntelligenceBriefResult | undefined        = r.intelligenceBrief;
  const horizon: PredictionHorizonResult | undefined      = r.predictionHorizon;
  const scenario: ScenarioPlanResult | undefined          = r.scenarioPlan;
  const preparedness: PreparednessResult | undefined      = r.preparednessScore;

  const urgency  = brief?.urgencyLevel ?? (score >= 75 ? 'CRITICAL' : score >= 55 ? 'HIGH' : score >= 35 ? 'MODERATE' : 'LOW');
  const confPct  = result.confidencePercent ?? Math.round((Number(result.confidence ?? 0.5)) * 100);
  const liveCount = result.signalQuality?.liveSignals ?? 0;
  const dataAge   = result.dataFreshness?.ageInDays ?? 0;
  const conflictCount = result.signalQuality?.conflictingSignals?.length ?? 0;
  const hardFailures  = result.signalQuality?.hardFailures ?? [];
  const lowDataWarning = result.signalQuality?.lowDataWarning as any;

  const pScore = preparedness?.overallScore ?? 0;
  const pColor = preparedness ? readinessColor(preparedness.readinessLabel ?? '') : '#f59e0b';

  const velocityIcon = r.scoreDelta?.direction === 'worsening'
    ? TrendingUp : r.scoreDelta?.direction === 'improving'
    ? TrendingDown : Minus;
  const velocityColor = r.scoreDelta?.direction === 'worsening'
    ? '#dc2626' : r.scoreDelta?.direction === 'improving'
    ? '#10b981' : 'rgba(255,255,255,0.35)';

  // v33: Tier-1 — derive top 3 risk drivers from the result dimensions, sorted by raw
  // dimension score. Each driver gets a one-line "why" pulled from breakdown.reason
  // when available, falling back to a heuristic.
  const dimensions: any[] = Array.isArray(result.dimensions) ? result.dimensions : [];
  const topDrivers: DriverItem[] = dimensions
    .filter(d => typeof d.score === 'number' && d.score >= 35)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 3)
    .map(d => ({
      key:   String(d.key ?? d.label ?? 'driver'),
      label: String(d.label ?? d.key ?? 'Risk dimension'),
      score: Math.round(d.score ?? 0),
      why:   String(d.reason ?? d.rationale ?? d.evidenceSummary ?? d.summary ?? 'Multiple contributing signals'),
    }));

  // v33: Tier-1 — derive top 3 actions from result.recommendations sorted by priority.
  const recommendations: any[] = Array.isArray(result.recommendations) ? result.recommendations : [];
  const priorityWeight = (p: string) =>
    p === 'Critical' ? 0 : p === 'High' ? 1 : p === 'Medium' ? 2 : 3;
  const topActions: ActionItem[] = recommendations
    .slice()
    .sort((a, b) => priorityWeight(a.priority) - priorityWeight(b.priority))
    .slice(0, 3)
    .map(rec => ({
      priority: String(rec.priority ?? 'Medium'),
      title:    String(rec.title ?? rec.action ?? rec.text ?? 'Take action'),
      timeline: String(rec.timeline ?? rec.timeframe ?? 'This week'),
      step:     rec.steps?.[0] ? String(rec.steps[0]) : undefined,
    }));

  return (
    <div className="flex flex-col gap-4">

      {/* ── Score Hero ────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-5 flex flex-col items-center text-center"
        style={{ background: riskGradient(score), border: `1px solid ${riskColor(score)}30` }}
      >
        <ScoreRingHero score={score} confidence={confPct} isMobile={isMobile} />
        <p className="mt-3 text-[12px] leading-relaxed max-w-xs"
          style={{ color: 'rgba(255,255,255,0.65)' }}>
          {verdictLine(score, urgency)}
        </p>
        {r.scoreDelta && Math.abs(r.scoreDelta.delta30d ?? 0) >= 1 && (
          <div className="mt-2 flex items-center gap-1.5 text-[11px]"
            style={{ color: velocityColor }}>
            {React.createElement(velocityIcon, { className: 'w-3.5 h-3.5' })}
            <span>
              {Math.abs(r.scoreDelta.delta30d ?? 0)}pt {r.scoreDelta.direction} vs 30d ago
            </span>
          </div>
        )}
      </motion.div>

      {/* ── Alert Strip ──────────────────────────────────────────────────── */}
      <AlertStrip
        lowDataWarning={lowDataWarning}
        conflictCount={conflictCount}
        hardFailures={hardFailures}
      />

      {/* ── Quick Stats Row ───────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex gap-2 overflow-x-auto pb-0.5"
        style={{ scrollbarWidth: 'none' }}
      >
        <StatChip
          label="Confidence"
          value={`${confPct}%`}
          sub={confPct >= 70 ? 'high' : confPct >= 45 ? 'moderate' : 'low'}
          color={confPct >= 70 ? '#10b981' : confPct >= 45 ? '#f59e0b' : '#f97316'}
          icon={Shield}
        />
        <StatChip
          label="Readiness"
          value={`${pScore}`}
          sub={preparedness?.readinessLabel ?? '—'}
          color={pColor}
          icon={CheckCircle2}
        />
        <StatChip
          label="Live Signals"
          value={`${liveCount}`}
          sub={liveCount >= 4 ? 'full live' : liveCount >= 2 ? 'partial' : 'heuristic'}
          color={liveCount >= 4 ? '#10b981' : liveCount >= 2 ? '#22d3ee' : '#f59e0b'}
          icon={Signal}
        />
        <StatChip
          label="Data Age"
          value={`${dataAge}d`}
          sub={dataAge <= 1 ? 'fresh' : dataAge <= 7 ? 'recent' : 'stale'}
          color={dataAge <= 1 ? '#10b981' : dataAge <= 7 ? '#22d3ee' : '#f97316'}
          icon={Clock}
        />
      </motion.div>

      {/* ── v33: Tier-1 critical intelligence (above the fold) ──────────── */}
      {/* Top risk drivers — answers "WHY is my score where it is?" */}
      <TopDriversStrip drivers={topDrivers} />

      {/* Immediate actions — answers "WHAT should I do this week?" */}
      <ImmediateActionsStrip actions={topActions} />

      {/* ── Intelligence Brief ───────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
      >
        <BriefCard brief={brief} urgency={urgency} />
      </motion.div>

      {/* ── Prediction Horizon ────────────────────────────────────────────── */}
      {horizon && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <HorizonStrip horizon={horizon} />
        </motion.div>
      )}

      {/* ── Scenario Fan (collapsed by default) ──────────────────────────── */}
      {scenario && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <ScenarioBlock scenario={scenario} />
        </motion.div>
      )}
    </div>
  );
};

export default SummaryTab;
