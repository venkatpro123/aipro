// v3/SummaryTab.tsx — v34.0 UX redesign
//
// First-audit-optimized executive summary.
//
// What this tab answers, in priority order (the only questions a user asks
// when they first see the dashboard):
//   1. "Am I safe or at risk?"      → ScoreHero + verdict
//   2. "Why is my score what it is?" → TopDriversStrip
//   3. "What should I do this week?" → "What To Do Next" row in the hero card
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

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import NumberFlow from '@number-flow/react';
import {
  TrendingUp, TrendingDown, Minus,
  AlertTriangle, AlertOctagon,
} from 'lucide-react';
import { computeScoreSufficiency, type ScoreSufficiency } from '../../../lib/scoreGate';
import type { TabProps } from '../common/types';
import type { PreparednessResult } from '../../../services/preparednessScoreEngine';
import { FirstAuditTour } from '../common/FirstAuditTour';
import PersonalRiskModifierPanel from '../common/PersonalRiskModifierPanel';
import { ConfidenceDisclosure } from '../common/ConfidenceDisclosure';
import { ProgressNarrativeCard } from '../common/ProgressNarrativeCard';
import { SharpenScorePrompt } from '../common/SharpenScorePrompt';
import PredictionHorizonPanel from '../common/PredictionHorizonPanel';
import { TimeToSafetyStrip } from '../common/TimeToSafetyStrip';
import { CareerRiskTimeline } from '../common/CareerRiskTimeline';
import { PersonalImpactSimulator } from '../common/PersonalImpactSimulator';
import TierBadge from '../common/TierBadge';
import { useDashboardAdaptation } from '../../../hooks/useDashboardAdaptation';
import { isCalibrationLimitedForCompany } from '../../../services/segmentedCalibrationEngine';
import { riskColor, riskLabel, riskGradient } from '../../../lib/riskTokens';
import { InactionCostCard } from '../common/InactionCostCard';
import { OpportunityIntelligenceCard } from '../common/OpportunityIntelligenceCard';
import { getStreakInfo } from '../../../services/streakService';
import { computeCanonicalConfidence } from '../../../services/canonicalConfidence';
import { explainDriver } from './driverEvidence';
import { isActionableRecommendation } from '../../../services/orchestration/signalOrchestrator';
import Tilt3D from '../../ui/Tilt3D';
import { ScoreSignalOrbit, type SignalNode } from '../../ScoreSignalOrbit';
import { ScoreCountUp } from '../../AuditReveal/ScoreCountUp';
import { useIntelligencePulse } from '../../ui/useIntelligencePulse';
import { getLayoffScoreHistory } from '../../../services/scoreStorageService';
// Beast Mode V3 — new AI OS components
import { AIMemoryCard } from '../common/AIMemoryCard';
import { RiskTrendChart } from '../common/RiskTrendChart';
import { AchievementGallery } from '../../../components/AchievementGallery';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

// ── Experience band helper (mirrors AnalysisTab) ──────────────────────────────
function experienceBand(years: number | undefined): '0-2' | '2-5' | '5-10' | '10-15' | '15+' {
  if (years == null) return '5-10';
  if (years < 2)  return '0-2';
  if (years < 5)  return '2-5';
  if (years < 10) return '5-10';
  if (years < 15) return '10-15';
  return '15+';
}

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
  stable:            { sym: '→', color: 'var(--alpha-text-35)' },
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
            fill="none" stroke="var(--alpha-bg-06)" strokeWidth={10}
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
          <span style={{ fontSize: '0.6rem', fontFamily: 'var(--font-mono)', color: 'var(--alpha-text-30)', marginTop: 2 }}>
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
            color: 'var(--alpha-text-50)',
          }}
          title={`Your last check was ${evolution.daysSince} day${evolution.daysSince === 1 ? '' : 's'} ago`}
        >
          <span>Was {evolution.from}</span>
          <span style={{ color: evolution.direction === 'increased' ? '#f97316' : '#10b981', fontWeight: 800 }}>
            {evolution.direction === 'increased' ? '↑' : '↓'} now {evolution.to}
          </span>
          <span style={{ color: 'var(--alpha-text-30)' }}>· vs your last check</span>
        </motion.div>
      )}

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
              {i > 0 && <span style={{ color: 'var(--alpha-text-25)' }}>·</span>}
              <span style={{ fontSize: '0.6rem', color: 'var(--alpha-text-45)', fontFamily: 'var(--font-mono)' }}>
                <ScoreCountUp
                  to={s.value}
                  duration={1100}
                  style={{ color: 'var(--alpha-text-70)', fontWeight: 700 }}
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
  const { ciLow, ciHigh, message } = gate;

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
          We're Not Fully Sure Yet
        </span>
      </div>

      {/* Bound numbers */}
      <div className="flex items-end gap-3 mb-3">
        <div className="text-center">
          <span className="score-range-bound" style={{ color: 'var(--alpha-text-55)' }}>
            {ciLow}
          </span>
          <p className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--alpha-text-25)' }}>LOW</p>
        </div>
        <span className="pb-5 font-black text-xl" style={{ color: 'var(--alpha-text-25)' }}>—</span>
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
        style={{ height: 8, background: 'var(--alpha-bg-08)' }}
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
            style={{ left: `${t}%`, background: 'var(--alpha-bg-08)' }}
          />
        ))}
      </div>

      {/* Axis label */}
      <div className="score-range-labels flex justify-between mb-3">
        <span className="text-[10px] font-mono" style={{ color: 'var(--alpha-text-25)' }}>0</span>
        <span className="text-[10px] font-mono" style={{ color: 'var(--alpha-text-25)' }}>100</span>
      </div>

      {/* Primary message — exact spec text */}
      <p
        className="text-center text-[11px] leading-relaxed max-w-xs"
        style={{ color: 'var(--alpha-text-70)' }}
      >
        {message}
      </p>

      {/* Why */}
      <p
        className="mt-1.5 text-center text-[10px] leading-snug max-w-xs"
        style={{ color: 'var(--alpha-text-35)' }}
      >
        In the worst case, your risk could be <span style={{ color: worstColor, fontWeight: 700 }}>{worstLabel}</span>.
        {' '}We need a bit more information to give you one exact number.
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
    style={{ background: 'var(--alpha-bg-04)', border: '1px solid var(--alpha-bg-08)' }}
  >
    <div className="flex items-center gap-1 mb-0.5">
      <Icon className="w-3 h-3 flex-shrink-0" style={{ color }} />
      <span className="text-[10px] font-bold tracking-wider uppercase truncate"
        style={{ color: 'var(--alpha-text-35)' }}>
        {label}
      </span>
    </div>
    <span className="text-[15px] font-black leading-none" style={{ color }}>{value}</span>
    {sub && <span className="text-[10px] truncate" style={{ color: 'var(--alpha-text-30)' }}>{sub}</span>}
  </div>
);

// ── Verdict line ──────────────────────────────────────────────────────────────

// Phase 5: Personalized Hero verdict — role + experience-aware situational read.
// Replaces the generic 4-line verdict with context that acknowledges the user's
// specific exposure: engineering vs. management vs. data vs. senior vs. early.
function classifyRole(key: string | undefined): 'engineering' | 'management' | 'data' | 'sales' | 'creative' | 'other' {
  if (!key) return 'other';
  const k = key.toLowerCase();
  if (/eng|dev|swe|software|frontend|backend|full.?stack|mobile|platform/.test(k)) return 'engineering';
  if (/manag|director|vp|head|chief|exec|lead/.test(k)) return 'management';
  if (/data|analyst|analytics|bi|scientist|ml|ai|research/.test(k)) return 'data';
  if (/sales|account|bdr|sdr|revenue|growth/.test(k)) return 'sales';
  if (/design|ux|ui|content|brand|market|creat/.test(k)) return 'creative';
  return 'other';
}

const verdictLine = (
  score: number,
  urgency: string,
  workTypeKey?: string,
  tenureYears?: number,
): string => {
  const role = classifyRole(workTypeKey);
  const band: 'early' | 'mid' | 'senior' =
    tenureYears == null ? 'mid' : tenureYears < 3 ? 'early' : tenureYears < 8 ? 'mid' : 'senior';

  if (urgency === 'CRITICAL' || score >= 75) {
    if (role === 'engineering') return 'AI commoditization and cost-cutting compound your exposure. Act in the next 30 days.';
    if (role === 'management') return 'Management layers are compressing industry-wide. Reposition now — your window is months.';
    if (role === 'data') return 'Pure data roles face automation pressure. Shift toward judgment-heavy ML work immediately.';
    if (band === 'early') return 'High risk early in your career — build external proof of skills before the window closes.';
    if (band === 'senior') return 'Tenure does not buffer structural risk. Activate your network and reputation now.';
    return 'High risk — months of lead time remaining. Use it before conditions lock in.';
  }
  if (urgency === 'HIGH' || score >= 55) {
    if (role === 'engineering') return 'Elevated risk — AI is absorbing your execution layer. Shift toward architecture and judgment work.';
    if (role === 'data') return 'Data roles are bifurcating. ML-native practitioners gain leverage; pure analysts face compression.';
    if (role === 'sales') return 'Quota pressure plus automation creates a narrow window. Build relationship capital while the market is open.';
    if (band === 'senior') return 'Elevated risk despite tenure. External reputation and network activation are your strongest buffers.';
    if (band === 'early') return 'Elevated risk — build portfolio proof now and identify two escape paths before your window narrows.';
    return 'Elevated risk. The 30-day action window is open — use it.';
  }
  if (score >= 35) {
    if (role === 'engineering') return 'Moderate signals. AI is redefining which engineering skills compound — upskill toward judgment-heavy work.';
    if (role === 'management') return 'Moderate signals. Flatten your dependency on headcount authority and grow your strategic influence.';
    if (band === 'senior') return 'Moderate signals. Your experience creates optionality — protect it with visible external presence.';
    return 'Moderate signals. Build your buffer while conditions are still stable.';
  }
  if (band === 'senior') return 'Low risk. Your experience creates optionality — grow network capital and leadership surface now.';
  if (band === 'early') return 'Low risk. Build compounding skills and career capital aggressively while you have runway.';
  return 'Low risk. Time to build career capital and leverage compounding returns.';
};

// ── Tier-1 strips ────────────────────────────────────────────────────────────

export interface DriverItem {
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

export const TopDriversStrip: React.FC<{ drivers: DriverItem[] }> = ({ drivers }) => {
  const scanning = useIntelligencePulse(drivers.length > 0);
  if (drivers.length === 0) {
    return (
      <div className="rounded-xl px-4 py-6 text-center" style={{ background: 'var(--alpha-bg-04)', border: '1px solid var(--alpha-bg-06)' }}>
        <p className="text-sm font-semibold" style={{ color: 'var(--alpha-text-50)' }}>
          No major concerns found yet
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--alpha-text-30)' }}>
          Add more details about your role and company to see what's driving your risk.
        </p>
      </div>
    );
  }
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
          Main Concerns
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

  // Wave 4.4: streak data (safe — reads localStorage, never throws)
  const streakInfo = useMemo(() => { try { return getStreakInfo(); } catch { return null; } }, []);

  // Beast Mode V3 — AI Memory + Timeline data
  const companyNameForV3 = (companyData as any)?.name ?? r.companyName ?? '';
  const scoreHistoryForTimeline = useMemo(() => {
    try {
      const history = getLayoffScoreHistory();
      // Filter to matching company+role and take last 3
      return history
        .filter(e => companyNameForV3 && e.companyName?.toLowerCase() === companyNameForV3.toLowerCase())
        .slice(-3);
    } catch { return []; }
  }, [companyNameForV3]); // eslint-disable-line react-hooks/exhaustive-deps

  // Days since last audit (from scoreStorageService last entry)
  const daysSinceLastAudit = useMemo(() => {
    try {
      const history = getLayoffScoreHistory();
      const last = history.filter(e => companyNameForV3 && e.companyName?.toLowerCase() === companyNameForV3.toLowerCase()).at(-1);
      if (!last) return undefined;
      const ms = Date.now() - new Date(last.timestamp).getTime();
      return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
    } catch { return undefined; }
  }, [companyNameForV3]); // eslint-disable-line react-hooks/exhaustive-deps

  // Completed action count from PhaseProgressSystem localStorage
  const completedActionCount = useMemo(() => {
    try {
      const key = `hp.phases.${companyNameForV3}`;
      const raw = localStorage.getItem(key);
      if (!raw) return 0;
      const data = JSON.parse(raw) as Record<string, boolean>;
      return Object.values(data).filter(Boolean).length;
    } catch { return 0; }
  }, [companyNameForV3]);

  // V3 personalizedTimeline from result if available
  const v3Timeline = r.personalizedTimeline as { criticalByDate?: string | null; milestones?: any[]; urgencyCategory?: string } | undefined;

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
    ? '#10b981' : 'var(--alpha-text-35)';

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

  // One-line opportunity headline for the unified hero (P2 redesign) — mirrors
  // OpportunityIntelligenceCard's priority cascade but returns only the
  // headline sentence, since the hero has room for one line, not a full card.
  const biggestOpportunityLine: string | null = useMemo(() => {
    if (score >= 75) return null; // emergency mode stays in risk framing
    const hotAdjacent = (r.roleAdjacency?.adjacentRoles ?? [])
      .filter((a: any) => a.marketDemandScore >= 72 && a.adjacencyStrength !== 'weak')[0];
    if (hotAdjacent) {
      const label = hotAdjacent.targetRoleLabel ?? String(hotAdjacent.targetRoleKey ?? '').replace(/_/g, ' ');
      return `Strong market demand for ${label} — a viable pivot path.`;
    }
    if (r.jobMarketLiquidity?.marketDemandTrend === 'rising' || (r.jobMarketLiquidity?.tier === 'Fast' && score < 55)) {
      const roleLabel = r.roleTitle ?? r.userProfile?.roleTitle ?? r.userProfile?.currentRole ?? 'your role';
      return `The job market for ${roleLabel} is active right now.`;
    }
    if ((r.competitivePosition?.overallPercentile ?? 0) > 60) {
      return `You're outperforming ${r.competitivePosition.overallPercentile}% of peers — leverage it.`;
    }
    if (score < 50 && (preparedness?.overallScore ?? 0) > 70) {
      return 'You\'re well-prepared and in a relatively stable position.';
    }
    return null;
  }, [score, r, preparedness]); // eslint-disable-line react-hooks/exhaustive-deps

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
    () => (Array.isArray(result.recommendations) ? result.recommendations.filter(isActionableRecommendation) : []),
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
  // The inaction-consequence string is engine-generated and sometimes embeds a
  // pre-personalization score (e.g. "At score 37/100…") that contradicts the
  // final score. Suppress it when the embedded score disagrees with the displayed
  // score by > 8 pts, so we never show a stale, lower-severity message on a
  // higher-risk audit.
  const inactionConsequenceRaw = String(result.sixMonthInactionConsequence ?? r.sixMonthInactionConsequence ?? '');
  const _inactionScoreMatch = inactionConsequenceRaw.match(/score\s+(\d{1,3})\s*\/\s*100/i);
  const _inactionStale = _inactionScoreMatch ? Math.abs(Number(_inactionScoreMatch[1]) - score) > 8 : false;
  const hasInactionConsequence = inactionConsequenceRaw.length > 0 && !_inactionStale;
  const opportunityNode = score < 75
    ? (
      <OpportunityIntelligenceCard
        key="opportunity"
        roleAdjacency={r.roleAdjacency}
        jobMarketLiquidity={r.jobMarketLiquidity}
        competitivePosition={r.competitivePosition}
        currentScore={score}
        preparednessScore={preparedness?.overallScore}
        currentRoleLabel={
          r.roleTitle ??
          r.userProfile?.roleTitle ??
          r.userProfile?.currentRole ??
          (String(result.workTypeKey ?? '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || undefined)
        }
      />
    )
    : null;

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

      {/* v39.0 F2 + v35.1 empathetic rewrite — Emergency guide card PRECEDES the hero.
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
                {(result as any).warnSignal?.hasActiveWARN ? 'LEGAL NOTICE DETECTED' : `${riskLabel(score)} RISK · AHEAD OF 90%+ WHO FACE THIS`}
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

      {/* ── YOUR CAREER POSITION — unified hero ──────────────────────────────
          Merges what used to be 2 separate cards (Mission Brief + Score Hero)
          into ONE verdict: score, situation, biggest threat, biggest
          opportunity, and this week's move. Answers all 4 first-screen
          questions in one read instead of stitching them across cards. */}
      <motion.div
        key={`career-position-${score}`}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl overflow-hidden relative"
        style={{ background: riskGradient(score), border: `1px solid ${riskColor(score)}30` }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 pt-4">
          <span className="text-[10px] font-black tracking-[0.14em] uppercase" style={{ color: riskColor(score) }}>
            {r.roleTitle
              ? `${r.roleTitle} · Risk Position`
              : r.workTypeKey
              ? `${String(r.workTypeKey).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} · Risk Position`
              : 'Where You Stand Today'}
          </span>
        </div>

        {/* Score ring + situation */}
        <div className="flex flex-col items-center text-center px-3 sm:px-5 pb-2">
          {scoreSufficiency.sufficient
            ? <ScoreRingHero
                score={score}
                confidence={confPct}
                calibrationMode={calibrationMode}
                ciLow={scoreSufficiency.ciLow}
                ciHigh={scoreSufficiency.ciHigh}
                trendDirection={r.scoreTrajectory?.trajectoryDirection}
                signalNodes={signalNodes}
              />
            : <ScoreRangeHero gate={scoreSufficiency} />
          }
          {scoreSufficiency.sufficient && (
            <p className="mt-3 text-[12px] leading-relaxed max-w-xs" style={{ color: 'var(--alpha-text-70)' }}>
              {verdictLine(score, urgency, r.workTypeKey, r.tenureYears ?? undefined)}
            </p>
          )}
          {scoreSufficiency.sufficient && r.scoreDelta && Math.abs(r.scoreDelta.delta30d ?? 0) >= 1 && (
            <div className="mt-2 flex items-center gap-1.5 text-[11px]" style={{ color: velocityColor }}>
              {React.createElement(velocityIcon, { className: 'w-3.5 h-3.5' })}
              <span>{Math.abs(r.scoreDelta.delta30d ?? 0)}pt {r.scoreDelta.direction} vs 30d ago</span>
            </div>
          )}
        </div>

        {/* Threat / Opportunity / Action — one line each, divider-separated */}
        <div className="flex flex-col px-4 sm:px-5 pb-4 pt-2">
          <div className="flex items-start gap-2.5 py-2.5" style={{ borderTop: '1px solid var(--alpha-bg-06)' }}>
            <span className="text-[9px] font-black tracking-[0.1em] uppercase flex-shrink-0 pt-0.5 w-[88px]" style={{ color: 'var(--alpha-text-30)' }}>
              Main Concern
            </span>
            <p className="text-[12px] leading-snug flex-1" style={{ color: 'var(--alpha-text-78)' }}>
              {(result as any).strategySynthesis?.singleBiggestRisk
                ?? (topDrivers[0] ? `${topDrivers[0].label} is your biggest concern right now.` : 'Nothing stands out as a major concern right now.')}
            </p>
          </div>

          {biggestOpportunityLine && (
            <div className="flex items-start gap-2.5 py-2.5" style={{ borderTop: '1px solid var(--alpha-bg-06)' }}>
              <span className="text-[9px] font-black tracking-[0.1em] uppercase flex-shrink-0 pt-0.5 w-[88px]" style={{ color: 'rgba(16,185,129,0.55)' }}>
                Best Opportunity
              </span>
              <p className="text-[12px] leading-snug flex-1" style={{ color: 'var(--alpha-text-78)' }}>
                {biggestOpportunityLine}
              </p>
            </div>
          )}

          {adaptation.feed?.primaryMove && (
            <div className="flex items-start gap-2.5 py-2.5" style={{ borderTop: '1px solid var(--alpha-bg-06)' }}>
              <span className="text-[9px] font-black tracking-[0.1em] uppercase flex-shrink-0 pt-0.5 w-[88px]" style={{ color: riskColor(score) + 'aa' }}>
                What To Do Next
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold leading-snug" style={{ color: riskColor(score) + 'ee' }}>
                  {adaptation.feed.primaryMove.moveLabel ?? adaptation.feed.primaryMove.action.title}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    try { window.dispatchEvent(new CustomEvent('hp.dashboard.navigate', { detail: { tab: 'actions' } })); } catch { /* SSR */ }
                  }}
                  className="mt-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg transition-opacity hover:opacity-90"
                  style={{ background: riskColor(score) + '18', color: riskColor(score), border: `1px solid ${riskColor(score)}35` }}
                >
                  View Full Action Plan →
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Wave 5.1: Time-to-Safety — compact strip showing path to MODERATE risk */}
      <TimeToSafetyStrip
        currentScore={score}
        scoreSensitivity={scoreSensitivity}
        financialRunwayMonths={financialRunwayMonths}
      />

      {/* ── Phase 12: Confidence Disclosure — collapsible "how much to trust this" */}
      <ScrollReveal>
        <ConfidenceDisclosure
          confPct={confPct}
          confidenceLabel={canonicalConf.userFacing.label}
          confidenceColor={canonicalConf.userFacing.color}
          primarySource={canonicalConf.primarySource}
          calibrationMode={calibrationMode}
          lowDataWarning={lowDataWarning}
          conflictCount={conflictCount}
          hardFailures={hardFailures}
          freshnessTier={canonicalConf.tier}
          calibrationLimitationReason={canonicalConf.limitingFactor}
        />
      </ScrollReveal>

      {/* ── V3: AI Memory — score drift + streak + completed actions since last check */}
      <ScrollReveal>
        <AIMemoryCard
          scoreDelta={r.scoreDelta}
          streakInfo={streakInfo ?? undefined}
          daysSinceLastAudit={daysSinceLastAudit}
          completedActionCount={completedActionCount > 0 ? completedActionCount : undefined}
        />
      </ScrollReveal>

      {/* ── Phase 18/Retention: Progress narrative — "since last visit" emotional beat */}
      <ProgressNarrativeCard scoreDelta={r.scoreDelta} streakInfo={streakInfo} />

      {/* ── Phase 5/Conversion: Sharpen score prompt — inline profile capture upsell */}
      <SharpenScorePrompt />

      {/* ── Phase 11: Prediction Horizon — 30d/90d/180d risk trajectory */}
      {r.predictionHorizon && (
        <ScrollReveal delay={0.02}>
          <PredictionHorizonPanel predictionHorizon={r.predictionHorizon} currentScore={result.total} />
        </ScrollReveal>
      )}

      {/* ── Phase 12: Trust System — personal modifier transparency card */}
      {personalModifierPresent && r.personalRiskModifier && (
        <ScrollReveal delay={0.03}>
          <PersonalRiskModifierPanel modifier={r.personalRiskModifier} />
        </ScrollReveal>
      )}

      {/* ── Phase 9/18: Achievement Gallery — Career Title ladder + badges */}
      <ScrollReveal delay={0.04}><AchievementGallery /></ScrollReveal>

      {/* ── Risk Trend Chart — visual score evolution over audit history */}
      {scoreHistoryForTimeline.length >= 1 && (
        <ScrollReveal delay={0.06}><RiskTrendChart history={scoreHistoryForTimeline} currentScore={score} /></ScrollReveal>
      )}

      {/* ── Career Risk Timeline — Past → Present → Future visual story */}
      <ScrollReveal delay={0.07}>
        <CareerRiskTimeline
          currentScore={score}
          scoreHistory={scoreHistoryForTimeline}
          milestones={v3Timeline?.milestones}
          criticalByDate={v3Timeline?.criticalByDate}
          urgencyCategory={v3Timeline?.urgencyCategory}
        />
      </ScrollReveal>

      {/* ── Tier-1: Top risk drivers ───────────────────────────────────────── */}
      <ScrollReveal delay={0.08}><TopDriversStrip drivers={topDrivers} /></ScrollReveal>

      {/* ── Good News (inline when available) ────────────────────────────── */}
      {opportunityNode && <ScrollReveal delay={0.10}>{opportunityNode}</ScrollReveal>}

      {/* ── Personal Impact Simulator — 3-scenario "do nothing / partial / full" */}
      <ScrollReveal delay={0.11}>
        <PersonalImpactSimulator
          currentScore={score}
          survivalProbability={r.survivalProbability}
          scoreTrajectory={r.scoreTrajectory}
          scoreSensitivity={scoreSensitivity}
          financialRunwayMonths={financialRunwayMonths}
        />
      </ScrollReveal>

      {/* ── Phase 12: Inaction Cost — "what happens if I do nothing" (final card) */}
      {hasInactionConsequence && (
        <ScrollReveal delay={0.12}>
          <InactionCostCard consequence={inactionConsequenceRaw} />
        </ScrollReveal>
      )}
    </div>
  );
};

export default SummaryTab;

// Named export so GuidanceView (and any future surface) can reuse the score
// ring without duplicating its dependencies. All underlying constants (RING_SIZE,
// RING_R, RING_CIRC, TREND_ARROW) are file-scoped — the export is safe because
// they are already in module scope.
export { ScoreRingHero };
