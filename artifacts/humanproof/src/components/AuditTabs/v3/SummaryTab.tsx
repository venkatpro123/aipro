// v3/SummaryTab.tsx — v34.0 UX redesign
//
// First-audit-optimized executive summary.
//
// What this tab answers, in priority order (the only questions a user asks
// when they first see the dashboard):
//   1. "Am I safe or at risk?"      → ScoreHero + verdict
//   2. "Why is my score what it is?" → TopDriversStrip
//   3. "What should I do this week?" → ImmediateActionsStrip
//   4. "Is the company in trouble?"  → CompanyPulseCard (compressed verdict)
//   5. "How fresh is this data?"     → liveSignals chip
//
// Everything else is TIER 2+ and lives behind progressive disclosure or in
// dedicated tabs. The Intelligence Brief, Prediction Horizon, and Scenarios
// blocks have moved to the Analysis tab where they belong (they answer
// "tell me more", not "what do I do").
//
// First-audit users see a calm welcome card at the very top with three steps
// to orient them. Returning users skip the welcome.
//
// All blocks carry an explicit Tier badge so users (and future maintainers)
// understand the disclosure hierarchy.

import React, { useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import NumberFlow from '@number-flow/react';
import {
  TrendingUp, TrendingDown, Minus,
  Zap, Shield, Clock, Signal, AlertTriangle, Info, AlertOctagon, Cpu,
} from 'lucide-react';
import { computeScoreSufficiency, type ScoreSufficiency } from '../../../lib/scoreGate';
import type { TabProps } from '../common/types';
import type { PreparednessResult } from '../../../services/preparednessScoreEngine';
import { FirstAuditTour } from '../common/FirstAuditTour';
import { CompanyPulseCard } from '../common/CompanyPulseCard';
import PersonalRiskModifierPanel from '../common/PersonalRiskModifierPanel';
import ReasoningSpineCard from '../common/ReasoningSpineCard';
import TierBadge from '../common/TierBadge';
import ProvenanceLabel from '../common/ProvenanceLabel';
import { useDashboardAdaptation } from '../../../hooks/useDashboardAdaptation';
import { isCalibrationLimitedForCompany } from '../../../services/segmentedCalibrationEngine';
import { riskColor, riskLabel, riskGradient } from '../../../lib/riskTokens';
import { ScoreTrendStrip } from '../common/ScoreTrendStrip';
import { InactionCostCard } from '../common/InactionCostCard';
import { VerdictReassurance } from '../common/VerdictReassurance';
import { TimeToSafetyStrip } from '../common/TimeToSafetyStrip';
import { OpportunityIntelligenceCard } from '../common/OpportunityIntelligenceCard';
import { getStreakInfo } from '../../../services/streakService';
import { MissingDataCard } from '../common/MissingDataCard';
import { ConfidenceDisclosure } from '../common/ConfidenceDisclosure';
import { ProgressNarrativeCard } from '../common/ProgressNarrativeCard';
import { SharpenScorePrompt } from '../common/SharpenScorePrompt';
import { computeCanonicalConfidence } from '../../../services/canonicalConfidence';
import AdaptiveBlock from '../common/AdaptiveBlock';
import { classifySummaryReveal, type SummaryBlockKey } from './summaryReveal';
import { explainDriver } from './driverEvidence';
import Tilt3D from '../../ui/Tilt3D';
import { ScoreSignalOrbit, type SignalNode } from '../../ScoreSignalOrbit';
import { ScoreCountUp } from '../../AuditReveal/ScoreCountUp';
import { useIntelligencePulse } from '../../ui/useIntelligencePulse';
import { detectScoreDrift } from '../../../services/scoreStorageService';

// ── Top-Lever Bridge ───────────────────────────────────────────────────────────
// Placed between TopDriversStrip and ImmediateActionsStrip.
// Answers: "What ONE action most directly reduces my #1 risk driver?"
// Design: compact 2-row card — lever action + score delta — NO duplication of
// ImmediateActionsStrip (which ranks by priority, not by score sensitivity).
//
// Only renders when:
//   • scoreSensitivity has at least 1 lever with scoreDropIfImproved ≥ 4
//   • score > 35 (meaningful improvement space exists)

interface LeverBridgeProps {
  scoreSensitivity: any;
  currentScore: number;
  /** Normalised primary-move title — when the top lever IS the hero move, skip it (no triple-surfacing). */
  primaryMoveTitle?: string;
}

const normalizeLeverText = (s: string | undefined): string =>
  (s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const TopLeverBridge: React.FC<LeverBridgeProps> = ({ scoreSensitivity, currentScore, primaryMoveTitle }) => {
  const levers: any[] = scoreSensitivity?.levers ?? [];
  const topLever = levers.find((l: any) => (l.scoreDropIfImproved ?? 0) >= 4);
  if (!topLever) return null;
  // One-move reconciliation: if this lever's action is the same as the hero move
  // already shown above, suppress it — the hero card covers the "what to do";
  // this strip exists only to quantify score leverage, not to re-issue the task.
  if (primaryMoveTitle) {
    const leverText = normalizeLeverText(topLever.fastestAction);
    if (leverText && (leverText === primaryMoveTitle || leverText.includes(primaryMoveTitle) || primaryMoveTitle.includes(leverText.slice(0, 24)))) {
      return null;
    }
  }

  const projected = Math.max(0, Math.round(currentScore - topLever.scoreDropIfImproved));
  const feasibilityLabel: Record<string, string> = {
    immediate: 'This week',
    short_term: '2–4 weeks',
    medium_term: '1–3 months',
  };
  const timeLabel = feasibilityLabel[topLever.feasibility] ?? topLever.actionTimeframe ?? 'Near-term';

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 }}
      className="rounded-xl px-3.5 py-2.5 flex items-start gap-3"
      style={{
        background: 'linear-gradient(135deg, rgba(34,211,238,0.05), rgba(16,185,129,0.04))',
        border: '1px solid rgba(34,211,238,0.18)',
      }}
    >
      {/* Arrow icon */}
      <div
        className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: 'rgba(34,211,238,0.10)' }}
      >
        <Zap className="w-3.5 h-3.5" style={{ color: '#22d3ee' }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className="text-[10px] font-black tracking-wider" style={{ color: 'rgba(34,211,238,0.65)' }}>
            TOP SCORE LEVER
          </span>
          <span className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.30)' }}>
            {timeLabel}
          </span>
        </div>
        <p className="text-[11px] font-semibold leading-snug mb-1" style={{ color: 'rgba(255,255,255,0.82)' }}>
          {topLever.fastestAction?.length > 100 ? topLever.fastestAction.slice(0, 100) + '…' : topLever.fastestAction}
        </p>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.40)' }}>Score impact:</span>
          <span className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.45)' }}>{currentScore}</span>
          <span className="text-[10px]" style={{ color: 'rgba(34,211,238,0.50)' }}>→</span>
          <span className="text-[11px] font-black" style={{ color: '#22d3ee' }}>{projected}</span>
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(34,211,238,0.10)', color: '#22d3ee' }}
          >
            −{topLever.scoreDropIfImproved} pts
          </span>
        </div>
      </div>
    </motion.div>
  );
};


// ── Helpers ───────────────────────────────────────────────────────────────────
// riskColor, riskLabel, riskGradient imported from lib/riskTokens.ts (v40.0)

const readinessColor = (label: string) => ({
  READY: '#10b981', MOSTLY_READY: '#22d3ee',
  PARTIAL: '#f59e0b', UNDERPREPARED: '#f97316', NOT_READY: '#dc2626',
}[label] ?? '#f59e0b');

// ── Score Ring Hero ───────────────────────────────────────────────────────────
// Uses CSS clamp via .score-hero-ring — no JS mobile detection needed.

const RING_SIZE = 172; // internal SVG coordinate system (CSS handles display size)
const RING_R    = (RING_SIZE - 14) / 2;
const RING_CIRC = 2 * Math.PI * RING_R;

// Wave 6.3: Trend direction arrow rendered at 6-o'clock position inside the ring.
const TREND_ARROW: Record<string, { sym: string; color: string }> = {
  accelerating_risk: { sym: '↑', color: '#dc2626' },
  deteriorating:     { sym: '↑', color: '#f97316' },
  stable:            { sym: '→', color: 'rgba(255,255,255,0.40)' },
  improving:         { sym: '↓', color: '#10b981' },
};

interface DensityStat { value: number; suffix?: string; label: string }

const ScoreRingHero: React.FC<{
  score: number;
  confidence: number;
  calibrationMode?: string;
  // Wave 6.3 upgrades:
  ciLow?: number;          // CI lower bound — renders translucent shadow arc
  ciHigh?: number;         // CI upper bound
  trendDirection?: string; // 'accelerating_risk' | 'deteriorating' | 'stable' | 'improving'
  // Layer 1 — Living Intelligence Instrument:
  signalNodes?: SignalNode[];   // real-time signal attribution orbit
  densityStats?: DensityStat[]; // "54 layers · 7 dimensions · N live signals"
  // Layer 4 — Intelligence Memory: cross-audit evolution vs the last check.
  evolution?: { from: number; to: number; direction: 'increased' | 'decreased'; daysSince: number } | null;
}> = ({ score, confidence, calibrationMode, ciLow, ciHigh, trendDirection, signalNodes, densityStats, evolution }) => {
  const color = riskColor(score);
  const label = riskLabel(score);
  const trend = trendDirection ? TREND_ARROW[trendDirection] : undefined;

  // CI shadow arc: render the confidence interval as a faint amber band
  // behind the main arc. Clamps to [0, 100] so it never exceeds the ring.
  const hasCIShadow = ciLow != null && ciHigh != null && (ciHigh - ciLow) < 80;
  const ciShadowOffset  = hasCIShadow ? RING_CIRC - ((ciHigh! / 100) * RING_CIRC) : RING_CIRC;
  const ciShadowLength  = hasCIShadow ? ((ciHigh! - ciLow!) / 100) * RING_CIRC    : 0;

  return (
    <div className="flex flex-col items-center">
      {/* .score-hero-ring uses CSS clamp for responsive sizing.
          Layer 1: wrapped in a depth scene + pointer-parallax tilt so the score
          reads as a precision instrument generated by live systems. */}
      <Tilt3D maxDeg={7} glare={false} className="depth-scene score-hero-ring">
        {/* Signal orbit — real-time attribution of the engines feeding the score */}
        {signalNodes && signalNodes.length > 0 && <ScoreSignalOrbit nodes={signalNodes} />}
        {/* Pulsing ambient glow — animates once on mount then settles */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ transform: 'translateZ(-20px)' }}
          initial={{ boxShadow: `0 0 28px ${color}00` }}
          animate={{
            boxShadow: [
              `0 0 28px ${color}00`,
              `0 0 52px ${color}42`,
              `0 0 38px ${color}28`,
            ],
          }}
          transition={{ duration: 1.2, ease: 'easeOut', times: [0, 0.5, 1] }}
        />
        <svg
          viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
          className="-rotate-90"
          role="img"
          aria-label={`Risk score ${score} out of 100 — ${label}`}
        >
          {/* Wave 6.3 gradient arc: green(low) → amber(mid) → red(high) based on score.
               Uses SVG linearGradient on the arc stroke. The gradient always spans the
               full ring; the dasharray controls how much is visible. The "start" colour
               is always green (safe zone) so the gradient reads as progress-from-safe,
               and the "end" colour matches the current risk severity color. */}
          <defs>
            <linearGradient id="scoreArcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="#10b981" stopOpacity="0.90" />
              <stop offset="50%"  stopColor="#f59e0b" stopOpacity="0.95" />
              <stop offset="100%" stopColor={color}   stopOpacity="1.00" />
            </linearGradient>
          </defs>

          {/* Track ring */}
          <circle
            cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R}
            fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10}
          />
          {/* Wave 6.3: CI confidence shadow arc — renders the uncertainty band */}
          {hasCIShadow && (
            <circle
              cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R}
              fill="none"
              stroke="rgba(245,158,11,0.18)"
              strokeWidth={14}
              strokeLinecap="round"
              strokeDasharray={`${ciShadowLength} ${RING_CIRC - ciShadowLength}`}
              strokeDashoffset={ciShadowOffset}
            />
          )}
          {/* Main score arc — gradient stroke from green (safe) → amber → risk colour */}
          <motion.circle
            cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R}
            fill="none"
            stroke="url(#scoreArcGrad)"
            strokeWidth={10} strokeLinecap="round"
            strokeDasharray={RING_CIRC}
            initial={{ strokeDashoffset: RING_CIRC }}
            animate={{ strokeDashoffset: RING_CIRC - (score / 100) * RING_CIRC }}
            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
            style={{ filter: `drop-shadow(0 0 5px ${color}55)` }}
          />
        </svg>
        {/* .score-hero-number: position relative z-index 1 — sits above SVG.
            translateZ lifts the number to the front plane for parallax depth. */}
        <div className="flex flex-col items-center" style={{ position: 'relative', zIndex: 1, transform: 'translateZ(28px)' }}>
          <motion.span
            initial={{ opacity: 0, scale: 0.75 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="score-hero-number"
            style={{ color }}
          >
            <NumberFlow value={score} respectMotionPreference />
          </motion.span>
          <span style={{ fontSize: '0.6rem', fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
            /100
          </span>
          {/* Wave 6.3: Trend arrow at 6-o'clock — direction of risk change */}
          {trend && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              style={{ fontSize: '0.75rem', fontWeight: 900, color: trend.color, lineHeight: 1, marginTop: 1 }}
              aria-label={`Risk is ${trendDirection?.replace('_', ' ')}`}
            >
              {trend.sym}
            </motion.span>
          )}
        </div>
      </Tilt3D>

      {/* Tier label — uses .score-hero-label CSS class */}
      <motion.span
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.38 }}
        className="score-hero-label"
        style={{ color, background: color + '14', marginTop: 'var(--space-3)' }}
      >
        {label} Risk
      </motion.span>

      {/* Layer 4 — Intelligence Memory: the system remembers your last check.
          Cross-audit evolution (distinct from the 30-day projection). Self-gates
          to nothing on a first audit — only a returning user sees it. */}
      {evolution && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.35 }}
          className="flex items-center gap-1.5"
          style={{
            marginTop: 'var(--space-2)',
            fontSize: '0.62rem',
            fontFamily: 'var(--font-mono)',
            color: 'rgba(255,255,255,0.5)',
          }}
          title={`Your last check was ${evolution.daysSince} day${evolution.daysSince === 1 ? '' : 's'} ago`}
        >
          <span>Was {evolution.from}</span>
          <span style={{ color: evolution.direction === 'increased' ? '#f97316' : '#10b981', fontWeight: 800 }}>
            {evolution.direction === 'increased' ? '↑' : '↓'} now {evolution.to}
          </span>
          <span style={{ color: 'rgba(255,255,255,0.3)' }}>· vs your last check</span>
        </motion.div>
      )}

      <div className="flex flex-col items-center gap-1" style={{ marginTop: 'var(--space-2)' }}>
        <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)' }}>
          {confidence}% confidence
        </p>
        <ProvenanceLabel
          kind="modeled"
          tooltip={
            calibrationMode === 'live_empirical'
              ? 'MODELED — score computed by a formula calibrated against 200+ real outcomes'
              : calibrationMode === 'live_developing'
              ? 'MODELED — formula calibrated on developing outcome dataset (47–200 outcomes)'
              : 'MODELED — formula uses conservative bootstrap priors; empirical calibration in progress'
          }
          size="xs"
        />
      </div>

      {/* Intelligence density — animated proof of the computation behind the score.
          Reinforces "this came from serious analysis" without exposing jargon. */}
      {densityStats && densityStats.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="flex items-center justify-center flex-wrap gap-x-2 gap-y-1"
          style={{ marginTop: 'var(--space-3)', maxWidth: 280 }}
          aria-label="Analysis depth"
        >
          {densityStats.map((s, i) => (
            <React.Fragment key={s.label}>
              {i > 0 && <span style={{ color: 'rgba(255,255,255,0.18)' }}>·</span>}
              <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.42)', fontFamily: 'var(--font-mono)' }}>
                <ScoreCountUp
                  to={s.value}
                  duration={1100}
                  style={{ color: 'rgba(255,255,255,0.72)', fontWeight: 700 }}
                />
                {s.suffix ?? ''} {s.label}
              </span>
            </React.Fragment>
          ))}
        </motion.div>
      )}
    </div>
  );
};

// ── Score Range Hero (gate: CI > 50 OR confidence < 20%) ─────────────────────
// Shown INSTEAD OF ScoreRingHero when the sufficiency gate fires.
// The score number is structurally absent — not dimmed, not annotated, absent.
// Displaying 58 with CI [8,100] would imply a tier that cannot be determined.

const ScoreRangeHero: React.FC<{
  gate: ScoreSufficiency;
}> = ({ gate }) => {
  const { ciLow, ciHigh, ciRange, confPct, message } = gate;

  // The range bar fills the zone [ciLow, ciHigh] across the 0-100 axis.
  // Visual: dark track, amber fill for the uncertain zone, tick marks at bounds.
  const lowPct  = ciLow;
  const highPct = ciHigh;

  // Conservative tier context: use ciHigh to describe worst-case exposure.
  const worstLabel =
    ciHigh >= 75 ? 'up to Critical risk' :
    ciHigh >= 55 ? 'up to High risk' :
    ciHigh >= 35 ? 'up to Moderate risk' :
                   'within Low risk';
  const worstColor =
    ciHigh >= 75 ? '#dc2626' :
    ciHigh >= 55 ? '#f97316' :
    ciHigh >= 35 ? '#f59e0b' :
                   '#10b981';

  return (
    <div className="flex flex-col items-center">
      {/* Header pill — amber, not a tier color */}
      <div
        className="mb-4 flex items-center gap-2 px-3 py-1.5 rounded-full"
        style={{
          background: 'rgba(251,191,36,0.12)',
          border: '1px solid rgba(251,191,36,0.35)',
        }}
      >
        <AlertOctagon className="w-3.5 h-3.5" style={{ color: '#fbbf24' }} />
        <span className="text-[10px] font-black tracking-[0.12em] uppercase" style={{ color: '#fbbf24' }}>
          Risk Level Range — Not a Point Estimate
        </span>
      </div>

      {/* Bound numbers */}
      <div className="flex items-end gap-3 mb-3">
        <div className="text-center">
          <span className="score-range-bound" style={{ color: 'rgba(255,255,255,0.55)' }}>
            {ciLow}
          </span>
          <p className="text-[10px] font-mono mt-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>LOW</p>
        </div>
        <span className="pb-5 font-black text-xl" style={{ color: 'rgba(255,255,255,0.25)' }}>—</span>
        <div className="text-center">
          <span className="score-range-bound" style={{ color: worstColor }}>
            {ciHigh}
          </span>
          <p className="text-[10px] font-mono mt-0.5" style={{ color: worstColor + 'aa' }}>HIGH</p>
        </div>
      </div>

      {/* Range bar */}
      <div
        className="score-range-bar relative rounded-full overflow-hidden mb-2"
        style={{ height: 8, background: 'rgba(255,255,255,0.08)' }}
        aria-label={`Score range ${ciLow} to ${ciHigh} out of 100`}
        role="img"
      >
        {/* CI zone fill */}
        <motion.div
          initial={{ scaleX: 0, originX: lowPct / 100 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="absolute top-0 bottom-0 rounded-full"
          style={{
            left: `${lowPct}%`,
            width: `${highPct - lowPct}%`,
            background: `linear-gradient(90deg, rgba(251,191,36,0.60), ${worstColor}90)`,
          }}
        />
        {/* Axis tick marks at 35, 55, 75 (tier boundaries) */}
        {[35, 55, 75].map(t => (
          <div
            key={t}
            className="absolute top-0 bottom-0 w-px"
            style={{ left: `${t}%`, background: 'rgba(255,255,255,0.20)' }}
          />
        ))}
      </div>

      {/* Axis label */}
      <div className="score-range-labels flex justify-between mb-3">
        <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.22)' }}>0</span>
        <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.22)' }}>100</span>
      </div>

      {/* Primary message — exact spec text */}
      <p
        className="text-center text-[11px] leading-relaxed max-w-xs"
        style={{ color: 'rgba(255,255,255,0.72)' }}
      >
        {message}
      </p>

      {/* Why */}
      <p
        className="mt-1.5 text-center text-[10px] leading-snug max-w-xs"
        style={{ color: 'rgba(255,255,255,0.38)' }}
      >
        Worst-case exposure reaches <span style={{ color: worstColor, fontWeight: 700 }}>{worstLabel}</span>.
        {' '}Confidence: {confPct}% · CI width: {ciRange} pts
      </p>

      {/* Provenance */}
      <div className="mt-2 flex items-center gap-1.5">
        <span
          className="text-[10px] font-black px-1.5 py-0.5 rounded font-mono uppercase tracking-wide"
          style={{
            background: 'rgba(251,191,36,0.10)',
            color: '#fbbf24',
            border: '1px solid rgba(251,191,36,0.28)',
          }}
          title="This is an ESTIMATED range, not a measured value. The model has insufficient evidence to narrow it further."
        >
          ESTIMATED
        </span>
      </div>
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
      <span className="text-[10px] font-bold tracking-wider uppercase truncate"
        style={{ color: 'rgba(255,255,255,0.35)' }}>
        {label}
      </span>
    </div>
    <span className="text-[15px] font-black leading-none" style={{ color }}>{value}</span>
    {sub && <span className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.30)' }}>{sub}</span>}
  </div>
);

// ── Verdict line ──────────────────────────────────────────────────────────────

// v35.1: Verdict line phrasing — more specific, less clinical.
// The VerdictReassurance below the ring provides emotional grounding;
// this line provides the precise situational read (7 words max).
const verdictLine = (score: number, urgency: string): string => {
  if (urgency === 'CRITICAL' || score >= 75)
    return 'High risk — months of lead time. Use it.';
  if (urgency === 'HIGH' || score >= 55)
    return 'Elevated risk. 30-day action window is open.';
  if (score >= 35)
    return 'Moderate signals. Build buffer while conditions are stable.';
  return 'Low risk. Time to build career capital and leverage.';
};

// ── Tier-1 strips ────────────────────────────────────────────────────────────

interface DriverItem {
  key:   string;
  label: string;
  score: number;
  why:   string;
}

interface ActionItem {
  priority:       string;
  title:          string;
  timeline:       string;
  step?:          string;
  evidenceStats?: string;
  sequencePhase?: string;
}

const toneForScore = (s: number) =>
  s >= 65 ? 'red' : s >= 45 ? 'amber' : s >= 25 ? 'orange' : 'emerald';

// Normalises an action title for identity matching between the orchestrator's
// primaryMove and the recommendation-derived ImmediateActions list, so the same
// move is never shown twice (hero card + "do this week" strip).
const normalizeMoveTitle = (s: string | undefined): string =>
  (s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const TopDriversStrip: React.FC<{ drivers: DriverItem[] }> = ({ drivers }) => {
  const scanning = useIntelligencePulse(drivers.length > 0);
  if (drivers.length === 0) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className={`intel-scan${scanning ? ' is-scanning' : ''}`}
    >
      <div className="audit-section-head">
        <div className="audit-section-title">
          <AlertTriangle size={12} style={{ color: 'var(--amber)' }} />
          Top Risk Drivers
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <TierBadge tier={1} />
          <ProvenanceLabel
            kind="modeled"
            tooltip="These dimension scores are computed by HumanProof's scoring formula. Individual signals feeding them may be MEASURED or ESTIMATED — expand each driver to see sources."
            size="xs"
          />
        </div>
      </div>
      <div className="driver-strip">
        {drivers.slice(0, 3).map((d, i) => (
          <motion.div
            key={d.key}
            className="driver-card"
            data-tone={toneForScore(d.score)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.07, duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="driver-card-rank">#{i + 1}</span>
                {/* Polarity tag — clarifies that the number is a RISK contribution
                    (high = raises risk, low = holds it down), so labels like
                    "Experience Protection" aren't read with the wrong polarity. */}
                {d.score >= 50 ? (
                  <span style={{ fontSize: '0.5rem', fontWeight: 800, letterSpacing: '0.05em', color: '#f97316' }}>↑ RAISES RISK</span>
                ) : d.score < 35 ? (
                  <span style={{ fontSize: '0.5rem', fontWeight: 800, letterSpacing: '0.05em', color: '#10b981' }}>↓ HOLDS IT DOWN</span>
                ) : null}
              </div>
              <span className="driver-card-score" style={{ color: riskColor(d.score) }}>
                {d.score}
              </span>
            </div>
            <div className="driver-card-label">{d.label}</div>
            <div className="driver-card-reason">{d.why}</div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

const phaseClass = (priority: string) =>
  priority === 'Critical' ? 'action-card-phase-day1'
    : priority === 'High'   ? 'action-card-phase-week1'
    : 'action-card-phase-month1';

const phaseLabel = (a: ActionItem): string => {
  if (a.sequencePhase)
    return ({ day1: 'Day 1', week1: 'Week 1', month1: 'Month 1', quarter1: 'Quarter 1' } as Record<string,string>)[a.sequencePhase] ?? a.timeline;
  return a.timeline;
};

// `supporting` = true when the orchestrator already surfaced a single primary
// move above (in the ReasoningSpineCard). In that case this strip is reframed
// from a competing "Do This Week" into the follow-on moves that BACK the one
// hero action — delivering the "one continuously thinking AI" promise instead
// of three rankers each shouting a different #1.
const ImmediateActionsStrip: React.FC<{ actions: ActionItem[]; total: number; supporting?: boolean }> = ({ actions, total, supporting }) => {
  if (actions.length === 0) return null;
  // When supporting the hero move, the remaining-count math must account for the
  // one move already promoted out of this list.
  const remaining = supporting ? Math.max(0, total - 1 - actions.length) : Math.max(0, total - actions.length);
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.14 }}
    >
      <div className="audit-section-head">
        <div className="audit-section-title">
          <Zap size={12} style={{ color: 'var(--cyan)' }} />
          {supporting ? 'Then, This Week' : 'Do This Week'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <TierBadge tier={1} />
          {remaining > 0 && (
            <span style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>
              +{remaining} more in Action Plan
            </span>
          )}
        </div>
      </div>
      {supporting && (
        <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', lineHeight: 1.4, marginTop: 'calc(-1 * var(--space-1))', marginBottom: 'var(--space-2)' }}>
          These back the move above — do them after, not instead.
        </p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {actions.slice(0, 3).map((a, i) => (
          <div key={`${a.priority}-${i}`} className={`action-card ${phaseClass(a.priority)}`}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
                <span className="action-effort-badge">{phaseLabel(a)}</span>
                {a.step && <span style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>· {a.step}</span>}
              </div>
              <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text)', lineHeight: 1.35, marginBottom: a.evidenceStats ? 'var(--space-1)' : 0 }}>
                {a.title}
              </p>
              {a.evidenceStats && (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontStyle: 'italic', lineHeight: 1.4 }}>
                  {a.evidenceStats}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

// ── Main Export ───────────────────────────────────────────────────────────────

export const SummaryTab: React.FC<TabProps> = ({ result, companyData }) => {
  const r     = result as any;
  const score = result.total;

  // Modal state for first-audit welcome overlay
  const [welcomeModalOpen, setWelcomeModalOpen] = useState(true);

  const adaptation = useDashboardAdaptation(result, companyData);

  const brief                                              = r.intelligenceBrief;
  const preparedness: PreparednessResult | undefined       = r.preparednessScore;
  const urgency  = brief?.urgencyLevel ?? (score >= 75 ? 'CRITICAL' : score >= 55 ? 'HIGH' : score >= 35 ? 'MODERATE' : 'LOW');
  // Wave 1.2: Canonical confidence — single source of truth for all confidence UI
  // Replaces scattered reads of confidencePercent / bayesianCI / freshnessUnifier
  const canonicalConf = useMemo(() => computeCanonicalConfidence(result), [result]);
  const confPct  = canonicalConf.score;
  const calibrationMode: string = (r.modelCalibration as any)?.calibrationMode ?? '';
  const liveCount = result.signalQuality?.liveSignals ?? 0;
  const dataAge   = result.dataFreshness?.ageInDays ?? 0;
  const scoreSensitivity = r.scoreSensitivity;
  const financialRunwayMonths: number | undefined = result.financialRunwayMonths ?? r.userFinancialRunway?.runwayMonths;
  const conflictCount = result.signalQuality?.conflictingSignals?.length ?? 0;
  const hardFailures  = [...(result.signalQuality?.hardFailures ?? [])];
  const lowDataWarning = result.signalQuality?.lowDataWarning as any;
  // v40.0: surface DAG degradation in the trust callout when > 2 layers failed
  const dagDegraded = result._dagDegradedLayerCount ?? 0;
  if (dagDegraded > 2) {
    hardFailures.push(`${dagDegraded} intelligence modules degraded — some insights use fallback estimates`);
  }
  const pScore = preparedness?.overallScore ?? 0;
  const pColor = preparedness ? readinessColor(preparedness.readinessLabel ?? '') : '#f59e0b';

  // Layer 1 — Living Intelligence Instrument: real-time signal attribution.
  // Each orbit node lights only when its engine produced a contributing signal,
  // so the score visibly reads as the product of many live systems.
  const signalNodes: SignalNode[] = useMemo(() => {
    const cd = companyData as any;
    const primaryGroups = new Set(
      (adaptation.feed?.primary ?? []).map((p: any) => p?.signal?.group).filter(Boolean),
    );
    return [
      { key: 'hiring',    label: 'Hiring',    active: !!(r.hiringSignal || r.hiringMomentum || cd?._estimatedRoleOpenings || primaryGroups.has('career')) },
      { key: 'financial', label: 'Financial', active: !!(r.financialHealth || cd?.stockPrice != null || cd?.marketCap != null || primaryGroups.has('company')) },
      { key: 'layoff',    label: 'Layoffs',   active: !!(r.layoffEvents?.length || r.derivedLayoffEvents?.length || r.warnSignal?.hasActiveWARN || cd?.layoffRounds?.length) },
      { key: 'market',    label: 'Market',    active: !!(r.marketHeadwinds || r.sectorContagion || r.macroEconomicRisk || primaryGroups.has('market')) },
      { key: 'personal',  label: 'Personal',  active: r.personalRiskModifier?.rawModifier != null },
    ];
  }, [result, companyData, adaptation.feed]); // eslint-disable-line react-hooks/exhaustive-deps

  // Intelligence density counters — animated proof of the computation depth.
  const densityStats = useMemo(
    () => [
      { value: 54, label: 'layers' },
      { value: 8, label: 'risk dims' },
      { value: Math.max(liveCount, 0), label: 'live signals' },
    ],
    [liveCount],
  );

  // Layer 4 — Intelligence Memory: genuine cross-audit drift vs the user's last
  // saved check for THIS company+role (distinct from the 30-day projection).
  // Returns null until there are ≥2 audits with a ≥5pt change, so a first-time
  // user never sees it — reuses the existing scoreStorageService persistence.
  const evolution = useMemo(() => {
    try {
      const cn = (companyData as any)?.name ?? (companyData as any)?.companyName ?? r.companyName ?? '';
      const rt = r.roleTitle ?? r.userProfile?.currentRole ?? r.userProfile?.roleTitle ?? r.profile?.roleTitle ?? '';
      if (!cn || !rt) return null;
      return detectScoreDrift(cn, rt);
    } catch {
      return null;
    }
  }, [companyData, result]); // eslint-disable-line react-hooks/exhaustive-deps

  // Wave 10.1: Score explanation tooltip state — tap the ring area to reveal
  const [scoreExplainOpen, setScoreExplainOpen] = useState(false);
  const toggleScoreExplain = useCallback(() => setScoreExplainOpen(o => !o), []);

  // Wave 4.4: streak data (safe — reads localStorage, never throws)
  const streakInfo = useMemo(() => { try { return getStreakInfo(); } catch { return null; } }, []);

  // v40.0: calibration limitation check for underrepresented segments
  const calibrationLimitation = isCalibrationLimitedForCompany(
    result.industryKey ?? companyData?.industry ?? null,
    result.countryKey ?? (companyData as any)?.region ?? null,
    companyData?.isPublic ?? true,
  );

  // Cold-start detection: count filled personal-context fields.
  // When < 3 are filled, the score is company + market risk only — personal
  // factors (visa, runway, family obligation) have not been applied. We surface
  // this explicitly so users don't mistake a generic score for their actual risk.
  const uf = (r.userFactors ?? {}) as Record<string, unknown>;
  const personalFieldsFilled = [
    'visaStatus', 'savingsMonthsRunway', 'hasDependents', 'dualIncomeHousehold',
    'hasEquityVesting', 'metroArea', 'performanceTier', 'monthlySalaryUsd',
  ].filter(f => uf[f] != null && uf[f] !== '' && uf[f] !== 'unknown').length;
  const profileIsEmpty = personalFieldsFilled < 3;

  // ── Score sufficiency gate ───────────────────────────────────────────────
  // When CI > 50 pts OR confidence < 20%, do not display the point-estimate score.
  // ScoreRangeHero replaces ScoreRingHero entirely — the number is structurally absent.
  const scoreSufficiency = useMemo(
    () => computeScoreSufficiency(result.confidenceInterval, result.confidencePercent),
    [result.confidenceInterval, result.confidencePercent],
  );

  const velocityIcon = r.scoreDelta?.direction === 'worsening'
    ? TrendingUp : r.scoreDelta?.direction === 'improving'
    ? TrendingDown : Minus;
  const velocityColor = r.scoreDelta?.direction === 'worsening'
    ? '#dc2626' : r.scoreDelta?.direction === 'improving'
    ? '#10b981' : 'rgba(255,255,255,0.35)';

  // v39.0 F4 — Tier-1 drivers strip.
  // Lowered the visibility threshold from score ≥ 35 to ≥ 15 so smaller
  // contributors are no longer silently suppressed. Cap at 5 (not 3) so
  // the user sees the full driver picture. The "View all signal weights"
  // link below the strip routes to the Methodology tab for the complete
  // breakdown.
  const topDrivers: DriverItem[] = useMemo(() => {
    const dimensions: any[] = Array.isArray(result.dimensions) ? result.dimensions : [];
    return dimensions
      .filter(d => typeof d.score === 'number' && d.score >= 15)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 5)
      .map(d => ({
        key:   String(d.key ?? d.label ?? 'driver'),
        label: String(d.label ?? d.key ?? 'Risk dimension'),
        score: Math.round(d.score ?? 0),
        // Prefer any upstream-authored reason; otherwise build a concrete,
        // data-backed explanation (never the old generic placeholder).
        why:   String(
          d.reason ?? d.rationale ?? d.evidenceSummary ?? d.summary ??
          explainDriver(d, result, companyData),
        ),
      }));
  }, [result, companyData]);

  // AI-exposure callout — surfaces the Role Displacement (L3) dimension as a
  // first-class signal even when it isn't in the top-3 drivers. For knowledge
  // roles this is the most anxiety-relevant fact, and it was previously only
  // visible inside the loader. Sourced entirely from existing result data.
  const aiExposure = useMemo(() => {
    const dims: any[] = Array.isArray(result.dimensions) ? result.dimensions : [];
    const dim = dims.find(d => d.key === 'L3' || /displacement|automation/i.test(String(d.label ?? '')));
    if (!dim || typeof dim.score !== 'number') return null;
    const score = Math.round(dim.score);
    const idx = r.roleDisplacement?.aiExposureIndex ?? r.techStackObsolescence?.aiExposureIndex ?? r.aiExposureIndex;
    const pct = typeof idx === 'number' ? (idx <= 1 ? Math.round(idx * 100) : Math.round(idx)) : null;
    const level = score >= 60 ? 'High' : score >= 40 ? 'Elevated' : score >= 25 ? 'Moderate' : 'Low';
    const color = score >= 60 ? '#ef4444' : score >= 40 ? '#f97316' : score >= 25 ? '#f59e0b' : '#10b981';
    return { score, pct, level, color };
  }, [result]); // eslint-disable-line react-hooks/exhaustive-deps

  const recommendations: any[] = useMemo(
    () => (Array.isArray(result.recommendations) ? result.recommendations : []),
    [result],
  );

  const priorityWeight = (p: string) =>
    p === 'Critical' ? 0 : p === 'High' ? 1 : p === 'Medium' ? 2 : 3;

  const topActions: ActionItem[] = useMemo(() => recommendations
    .slice()
    .sort((a, b) => priorityWeight(a.priority) - priorityWeight(b.priority))
    .slice(0, 3)
    .map(rec => ({
      priority:       String(rec.priority ?? 'Medium'),
      title:          String(rec.title ?? rec.action ?? rec.text ?? 'Take action'),
      timeline:       String(rec.timeline ?? rec.timeframe ?? rec.deadline ?? 'This week'),
      step:           rec.steps?.[0] ? String(rec.steps[0]) : undefined,
      evidenceStats:  rec.evidenceStats ? String(rec.evidenceStats) : undefined,
      sequencePhase:  rec.sequencePhase ? String(rec.sequencePhase) : undefined,
    })), [recommendations]);

  const criticalActionCount = recommendations.filter(rc => rc.priority === 'Critical').length;

  // ── One-move reconciliation ───────────────────────────────────────────────
  // The ReasoningSpineCard already presents feed.primaryMove as the single hero
  // action. To keep the dashboard reading as ONE AI (not three competing
  // rankers), strip that exact move out of the "this week" list and reframe the
  // remainder as supporting moves. Falls back to the full list when no primary
  // move exists (e.g. low-signal stable users).
  const primaryMoveTitle = normalizeMoveTitle(adaptation.feed?.primaryMove?.action?.title);
  const hasPrimaryMove = primaryMoveTitle.length > 0;
  const supportingActions: ActionItem[] = useMemo(
    () => (hasPrimaryMove
      ? topActions.filter(a => normalizeMoveTitle(a.title) !== primaryMoveTitle)
      : topActions),
    [topActions, hasPrimaryMove, primaryMoveTitle],
  );

  // ── Orchestrator-gated disclosure ─────────────────────────────────────────
  // Bucket the supporting *evidence* blocks (company pulse, opportunity,
  // personal-risk, time-to-safety, cost-of-waiting, missing-data) into
  // inline / folded / hidden using the orchestrator's primary ranking + the
  // blocks' own materiality thresholds. The lead surface (spine, score hero,
  // confidence, the one move, momentum close) is untouched and always renders.
  const hasActiveWARN = !!(result as any).warnSignal?.hasActiveWARN;
  const personalRawModifier = (result as any).personalRiskModifier?.rawModifier;
  const personalModifierPresent = personalRawModifier != null;
  const personalModifierMaterial = personalModifierPresent
    && Math.abs(Number(personalRawModifier) || 0) >= 0.5;
  const hasInactionConsequence = !!(result.sixMonthInactionConsequence || r.sixMonthInactionConsequence);
  const timeToSafetyEligible = !!(scoreSufficiency.sufficient && score > 35 && scoreSensitivity);
  const reveal = useMemo(
    () => classifySummaryReveal(adaptation.feed, {
      mode: adaptation.mode,
      score,
      hasActiveWARN,
      personalModifierPresent,
      personalModifierMaterial,
      hasInactionConsequence,
      timeToSafetyEligible,
    }),
    [adaptation.feed, adaptation.mode, score, hasActiveWARN, personalModifierPresent,
     personalModifierMaterial, hasInactionConsequence, timeToSafetyEligible],
  );

  // Evidence render fragments — defined once, placed either inline (when material
  // now) or inside the single "Full breakdown" disclosure (when folded). Each is
  // mutually exclusive across reveal.evidenceInline / reveal.deep, so the same
  // element object is only ever mounted in one branch.
  const companyPulseNode = (
    <motion.div
      key="company-pulse"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.18 }}
    >
      <CompanyPulseCard
        result={result}
        companyData={companyData}
        defaultOpen={hasActiveWARN || adaptation.mode === 'emergency'}
      />
    </motion.div>
  );
  const personalRiskNode = personalModifierPresent
    ? <PersonalRiskModifierPanel key="personal-risk" modifier={(result as any).personalRiskModifier} />
    : null;
  const opportunityNode = score < 75
    ? (
      <OpportunityIntelligenceCard
        key="opportunity"
        roleAdjacency={r.roleAdjacency}
        jobMarketLiquidity={r.jobMarketLiquidity}
        competitivePosition={r.competitivePosition}
        currentScore={score}
        preparednessScore={preparedness?.overallScore}
        currentRoleLabel={String(result.workTypeKey ?? '').replace(/_/g, ' ')}
      />
    )
    : null;
  const inactionNode = hasInactionConsequence
    ? (
      <InactionCostCard
        key="inaction"
        consequence={String(result.sixMonthInactionConsequence ?? r.sixMonthInactionConsequence ?? '')}
      />
    )
    : null;
  const timeToSafetyNode = timeToSafetyEligible
    ? (
      <TimeToSafetyStrip
        key="time-to-safety"
        currentScore={score}
        scoreSensitivity={scoreSensitivity}
        financialRunwayMonths={financialRunwayMonths}
      />
    )
    : null;
  const viewAllWeightsLink = topDrivers.length > 0
    ? (
      <div className="flex justify-end px-1" key="view-all-weights">
        <a
          href="#methodology"
          onClick={(e) => {
            e.preventDefault();
            try {
              window.dispatchEvent(new CustomEvent('hp.dashboard.navigate', { detail: { tab: 'transparency' } }));
            } catch { /* SSR / event-disallowed envs */ }
          }}
          className="text-[10px] font-mono uppercase tracking-wider hover:opacity-100 transition-opacity"
          style={{ color: 'rgba(34,211,238,0.70)', opacity: 0.85 }}
        >
          View all signal weights &nbsp;&rarr;
        </a>
      </div>
    )
    : null;

  // The "Full breakdown" disclosure renders only when it would actually contain
  // something — any folded evidence block, the deep-dive link, or missing-data.
  const foldedEvidence: SummaryBlockKey[] = (['companyPulse', 'opportunity', 'personalRisk', 'timeToSafety', 'inactionCost'] as const)
    .filter(k => reveal.deep.has(k));
  const deepHasContent = foldedEvidence.length > 0 || viewAllWeightsLink != null;

  return (
    <div className="flex flex-col gap-4">

      {/* ── Wave 3.5: First-audit tour — non-blocking bottom tooltip (score always visible) ─ */}
      {adaptation.showFirstAuditWelcome && (
        <FirstAuditTour
          result={result}
          open={welcomeModalOpen}
          onClose={() => setWelcomeModalOpen(false)}
        />
      )}

      {/* v39.0 F2 + v35.1 empathetic rewrite — Emergency guide card PRECEDES score hero.
          Framing matters: user sees "you're ahead" narrative before the score number,
          so the number is read as data, not as alarm.
          Includes direct CTA to Action Plan tab (highest-ROI tab in emergency mode). */}
      {adaptation.mode === 'emergency' && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="rounded-2xl px-4 py-3"
          style={{
            background: (result as any).warnSignal?.hasActiveWARN
              ? 'linear-gradient(135deg, rgba(220,38,38,0.10), rgba(153,27,27,0.06))'
              : 'rgba(220,38,38,0.07)',
            border: '1px solid rgba(220,38,38,0.28)',
          }}
        >
          <div className="flex items-start gap-3">
            <div className="audit-step-dot active" style={{ width: 8, height: 8, marginTop: 5, flexShrink: 0 }} />
            <div className="flex-1 min-w-0">
              <div style={{ fontSize: '0.58rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--red)', marginBottom: 4, fontWeight: 800 }}>
                {(result as any).warnSignal?.hasActiveWARN ? 'LEGAL NOTICE DETECTED' : 'HIGH RISK · AHEAD OF 90%+ WHO FACE THIS'}
              </div>
              <p style={{ fontSize: '0.84rem', lineHeight: 1.5, color: 'var(--text-2)', marginBottom: 8 }}>
                {(result as any).warnSignal?.hasActiveWARN
                  ? 'A WARN Act filing is confirmed — a legal 60-day advance notice for your company. Your Action Plan has been updated with time-sensitive steps.'
                  : 'You\'re discovering this risk months early. Most people find out 2 weeks before layoffs. That gap is your advantage — use it.'}
              </p>
              <button
                onClick={() => {
                  try { window.dispatchEvent(new CustomEvent('hp.dashboard.navigate', { detail: { tab: 'actions' } })); } catch { /* SSR */ }
                }}
                className="text-[10px] font-bold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-90"
                style={{ background: 'rgba(220,38,38,0.20)', color: '#fca5a5', border: '1px solid rgba(220,38,38,0.35)' }}
              >
                Open Action Plan →
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── P1: Reasoning spine — the "one continuously thinking AI" voice.
          Renders the orchestrator feed (spine + primary move + reasoning trace)
          above the score so the user reads the AI's conclusion before the number.
          Guarded: only when the orchestrator produced a feed. */}
      {adaptation.feed && <ReasoningSpineCard feed={adaptation.feed} />}

      {/* ── Tier-1: Score Hero ─────────────────────────────────────────────── */}
      {/* v39.0 F6: key={score} forces re-mount when the score changes, so the
          ring's stroke-dash animation replays. Previously a profile change
          that shifted the score by 5+ pts would silently update the number
          without re-animating the ring, breaking the "you moved the needle"
          feedback loop. */}
      <motion.div
        key={`score-hero-${score}`}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-3 sm:p-5 flex flex-col items-center text-center relative overflow-hidden"
        style={{ background: riskGradient(score), border: `1px solid ${riskColor(score)}30` }}
      >
        {/* tier badge floating in corner */}
        <div className="absolute top-3 right-3">
          <TierBadge tier={1} label="T1 · CORE" />
        </div>

        {/* Gate: if CI range > 50 or confidence < 20%, show range instead of point score */}
        {scoreSufficiency.sufficient
          ? <ScoreRingHero
              score={score}
              confidence={confPct}
              calibrationMode={calibrationMode}
              ciLow={scoreSufficiency.ciLow}
              ciHigh={scoreSufficiency.ciHigh}
              trendDirection={r.scoreTrajectory?.trajectoryDirection}
              signalNodes={signalNodes}
              densityStats={densityStats}
              evolution={evolution}
            />
          : <ScoreRangeHero gate={scoreSufficiency} />
        }
        {/* Verdict line — suppressed when range is shown (it would imply a tier) */}
        {scoreSufficiency.sufficient && (
          <p className="mt-3 text-[12px] leading-relaxed max-w-xs"
            style={{ color: 'rgba(255,255,255,0.70)' }}>
            {verdictLine(score, urgency)}
          </p>
        )}
        {/* VerdictReassurance — emotional anchoring below the verdict */}
        {scoreSufficiency.sufficient && (
          <VerdictReassurance score={score} urgency={urgency} />
        )}
        {/* Wave 10.1: Score explanation — tap "Why?" to expand dimension breakdown */}
        {scoreSufficiency.sufficient && topDrivers.length > 0 && (
          <div className="mt-2 w-full">
            <button
              onClick={toggleScoreExplain}
              className="mx-auto flex items-center gap-1 text-[10px] font-bold tracking-[0.12em] px-2.5 py-1 rounded-full transition-all hover:opacity-80"
              style={{
                background: scoreExplainOpen ? 'rgba(34,211,238,0.10)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${scoreExplainOpen ? 'rgba(34,211,238,0.28)' : 'rgba(255,255,255,0.10)'}`,
                color: scoreExplainOpen ? '#22d3ee' : 'rgba(255,255,255,0.40)',
              }}
              aria-expanded={scoreExplainOpen}
            >
              {scoreExplainOpen ? '▲ HIDE REASONING' : '? WHY THIS SCORE'}
            </button>
            <AnimatePresence initial={false}>
              {scoreExplainOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className="overflow-hidden"
                >
                  <div
                    className="mt-2 rounded-xl px-3 py-2.5 text-left"
                    style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.07)' }}
                  >
                    <p className="text-[10px] font-black tracking-[0.14em] mb-2" style={{ color: 'rgba(255,255,255,0.28)' }}>
                      HOW WE REACHED YOUR SCORE
                    </p>
                    <div className="space-y-2">
                      {topDrivers.slice(0, 3).map((d, i) => (
                        <div key={d.key} className="flex items-start gap-2">
                          <span
                            className="text-[10px] font-black w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
                            style={{
                              background: 'rgba(255,255,255,0.06)',
                              color: riskColor(d.score),
                            }}
                          >
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-semibold" style={{ color: 'rgba(255,255,255,0.70)' }}>{d.label}</span>
                              <span
                                className="text-[10px] font-black px-1.5 py-0.5 rounded"
                                style={{ background: riskColor(d.score) + '18', color: riskColor(d.score) }}
                              >
                                {d.score}/100
                              </span>
                            </div>
                            <p className="text-[10px] leading-snug mt-0.5" style={{ color: 'rgba(255,255,255,0.42)' }}>
                              {d.why}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 pt-2 flex items-center justify-between flex-wrap gap-1" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.28)' }}>
                        Confidence: {confPct}% · {canonicalConf.primarySource}
                      </span>
                      <span className="text-[10px] font-bold" style={{ color: canonicalConf.userFacing.color }}>
                        {canonicalConf.userFacing.label}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
        {/* Score velocity — suppressed when base score is a range (delta from a range is undefined) */}
        {scoreSufficiency.sufficient && r.scoreDelta && Math.abs(r.scoreDelta.delta30d ?? 0) >= 1 && (
          <div className="mt-2 flex items-center gap-1.5 text-[11px]" style={{ color: velocityColor }}>
            {React.createElement(velocityIcon, { className: 'w-3.5 h-3.5' })}
            <span>
              {Math.abs(r.scoreDelta.delta30d ?? 0)}pt {r.scoreDelta.direction} vs 30d ago
            </span>
          </div>
        )}
      </motion.div>

      {/* ── Score Trend Strip — 30-day trajectory (orphaned field, now surfaced) ── */}
      {scoreSufficiency.sufficient && r.scoreTrajectory && (
        <ScoreTrendStrip
          scoreTrajectory={r.scoreTrajectory}
          currentScore={score}
        />
      )}

      {/* ── Recovery loop — the "since last visit" emotional continuity beat ──
           Fuses score movement (scoreDelta) + action momentum (streakInfo) into
           one warm narrative. Returning-user only — renders nothing on a first
           audit. Replaces the former standalone streak chip + clinical velocity
           framing with a single human beat (the retention engine). */}
      {scoreSufficiency.sufficient && (
        <ProgressNarrativeCard scoreDelta={r.scoreDelta} streakInfo={streakInfo} />
      )}

      {/* ── Wave 5.1: Time-to-Safety Strip — path to MODERATE risk (≤35) ─────
           Base guard: score > 35 with scoreSensitivity levers. Orchestrator-gated:
           inline only in crisis modes (emergency/elevated) where the week-by-week
           projection is signal; otherwise folded into "Full breakdown" below. ── */}
      {reveal.evidenceInline.has('timeToSafety') && timeToSafetyNode}

      {/* ── Fold capture into the reveal ───────────────────────────────────── */}
      {/* When fewer than 3 personal-context fields are filled, the score is
          company + market risk only — personal amplifiers (visa, runway, family)
          have NOT been applied. Rather than render this as a passive caveat that
          sends the user away, we reframe it as an opportunity acted on in place:
          a 3-question inline capture that, on completion, recomputes the audit so
          the score visibly moves. The honesty is unchanged (same factors, same
          ±8–25 pt framing) — only the posture is. */}
      {profileIsEmpty && <SharpenScorePrompt />}

      {/* ── Progressive honesty — one block, not a caveat stack ─────────────── */}
      {/* Aggregates the former TrustCallout + freshness + calibration cards into
          a single collapsible that LEADS with a confident one-liner and tucks
          the honest details one tap away. Opens by default only when something
          material is off (hard source failure / heuristic-only baseline). */}
      <ConfidenceDisclosure
        confPct={confPct}
        confidenceLabel={canonicalConf.userFacing.label}
        confidenceColor={canonicalConf.userFacing.color}
        primarySource={canonicalConf.primarySource}
        calibrationMode={calibrationMode}
        lowDataWarning={lowDataWarning}
        conflictCount={conflictCount}
        hardFailures={hardFailures}
        freshnessTier={result.unifiedFreshness?.tier}
        calibrationLimitationReason={calibrationLimitation.limited ? calibrationLimitation.reason : null}
      />

      {/* Missing Data Card now lives inside the single "Full breakdown"
          disclosure near the bottom (still self-gates to ≥2 meaningful gaps). */}

      {/* ── Tier-1: Quick stats ────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
        className="flex gap-2 overflow-x-auto pb-0.5"
        style={{ scrollbarWidth: 'none' }}
      >
        {/* When gate fires: replace the "Confidence" chip with the range + a clear "insufficient" label */}
        {scoreSufficiency.sufficient ? (
          <StatChip
            label="Confidence"
            value={`${confPct}%`}
            sub={canonicalConf.userFacing.label.toLowerCase()}
            color={canonicalConf.userFacing.color}
            icon={Shield}
          />
        ) : (
          <StatChip
            label="Risk Level Range"
            value={`${scoreSufficiency.ciLow}–${scoreSufficiency.ciHigh}`}
            sub="point est. unreliable"
            color="#fbbf24"
            icon={AlertOctagon}
          />
        )}
        <StatChip
          label="Readiness"
          value={`${pScore}`}
          sub={preparedness?.readinessLabel ?? '—'}
          color={pColor}
          icon={Shield}
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

      {/* ── AI exposure callout — first-class for knowledge roles ───────────── */}
      {aiExposure && aiExposure.score >= 25 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-start gap-2.5 rounded-xl px-3 py-2.5"
          style={{ background: `${aiExposure.color}12`, border: `1px solid ${aiExposure.color}30` }}
        >
          <Cpu className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: aiExposure.color }} />
          <div className="min-w-0">
            <p className="text-[11px] font-black tracking-wide" style={{ color: aiExposure.color }}>
              AI EXPOSURE · {aiExposure.level.toUpperCase()}
            </p>
            <p className="text-[11px] leading-snug mt-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {aiExposure.pct != null
                ? `About ${aiExposure.pct}% of your role's core tasks are exposed to AI automation. `
                : `Your role faces ${aiExposure.level.toLowerCase()} automation risk (Role Displacement ${aiExposure.score}/100). `}
              Building AI-augmented skills is the highest-leverage hedge.
            </p>
          </div>
        </motion.div>
      )}

      {/* ── Tier-1: Top risk drivers ───────────────────────────────────────── */}
      <TopDriversStrip drivers={topDrivers} />
      {/* The "View all signal weights" deep-dive link now lives inside the
          single "Full breakdown" disclosure near the bottom. */}

      {/* ── Driver→Action bridge: top lever that most reduces score ───────── */}
      {/* Placed between TopDriversStrip and ImmediateActionsStrip so the user
          sees WHY (drivers) → WHAT MOVES THE NEEDLE (lever) → WHAT TO DO (actions).
          Only renders when score > 35 and a meaningful lever exists (≥4 pts impact). */}
      {score > 35 && scoreSensitivity && (
        <TopLeverBridge scoreSensitivity={scoreSensitivity} currentScore={score} primaryMoveTitle={primaryMoveTitle} />
      )}

      {/* ── Tier-1: Immediate actions ──────────────────────────────────────── */}
      {/* One-move reconciliation: when the spine surfaced a primary move, this
          strip shows the SUPPORTING follow-on moves (the hero is deduped out)
          and is reframed accordingly. */}
      <ImmediateActionsStrip actions={supportingActions} total={recommendations.length} supporting={hasPrimaryMove} />

      {/* ── Evidence surface (orchestrator-gated) ──────────────────────────── */}
      {/* Each block renders inline-open ONLY when its signal was ranked into the
          orchestrator's primary set (cap 3) or it crossed its own materiality
          threshold (see classifySummaryReveal). Everything material-but-not-now
          folds into the single "Full breakdown" disclosure below. Same data,
          same components — gated by the editor that already exists. */}
      {reveal.evidenceInline.has('companyPulse') && companyPulseNode}
      {reveal.evidenceInline.has('personalRisk') && personalRiskNode}
      {reveal.evidenceInline.has('opportunity') && opportunityNode}
      {reveal.evidenceInline.has('inactionCost') && inactionNode}

      {/* ── Full breakdown — one collapsed disclosure for everything else ───── */}
      {/* Holds the folded evidence blocks (those not material right now), the
          missing-data card (self-gates), and the signal-weights deep-dive link.
          Renders only when it would contain something. */}
      {deepHasContent && (
        <AdaptiveBlock title="Full breakdown" tier={3} accentColor="#94a3b8" defaultOpen={false}>
          {reveal.deep.has('companyPulse') && companyPulseNode}
          {reveal.deep.has('opportunity') && opportunityNode}
          {reveal.deep.has('personalRisk') && personalRiskNode}
          {reveal.deep.has('timeToSafety') && timeToSafetyNode}
          {reveal.deep.has('inactionCost') && inactionNode}
          <MissingDataCard
            result={result}
            companyData={companyData as any}
            personalFieldsFilled={personalFieldsFilled}
          />
          {viewAllWeightsLink}
        </AdaptiveBlock>
      )}

      {/* ── Momentum close — the LAST thing the user reads ─────────────────── */}
      {/* Emotional arc: the screen ends on agency. Restates the ONE move (same
          source of truth as the spine hero) so the takeaway is "just this next
          step", not the cost-of-waiting card above it. */}
      {adaptation.feed?.primaryMove && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          className="rounded-2xl px-4 py-3.5 flex items-start gap-3"
          style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.07), rgba(34,211,238,0.04))',
            border: '1px solid rgba(16,185,129,0.20)',
          }}
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}
          >
            <Zap className="w-3.5 h-3.5" style={{ color: '#10b981' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black tracking-[0.12em] uppercase mb-1" style={{ color: 'rgba(16,185,129,0.75)' }}>
              You don't have to do everything — just this
            </p>
            <p className="text-[13px] font-semibold leading-snug" style={{ color: 'rgba(255,255,255,0.90)' }}>
              {adaptation.feed.primaryMove.moveLabel ?? adaptation.feed.primaryMove.action.title}
            </p>
            <button
              onClick={() => {
                try { window.dispatchEvent(new CustomEvent('hp.dashboard.navigate', { detail: { tab: 'actions' } })); } catch { /* SSR */ }
              }}
              className="mt-2 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-90"
              style={{ background: 'rgba(16,185,129,0.15)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.30)' }}
            >
              Start in Action Plan →
            </button>
          </div>
        </motion.div>
      )}

      {/* Reading hint */}
      <div className="text-center pt-1 pb-2">
        <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.30)' }}>
          Need more depth? Open the Company, Protection, or Intelligence tabs.
        </p>
      </div>
    </div>
  );
};

export default SummaryTab;
