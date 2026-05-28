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

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import NumberFlow from '@number-flow/react';
import {
  TrendingUp, TrendingDown, Minus,
  Zap, Shield, Clock, Signal, AlertTriangle, Info, User, AlertOctagon,
} from 'lucide-react';
import { computeScoreSufficiency, type ScoreSufficiency } from '../../../lib/scoreGate';
import type { TabProps } from '../common/types';
import type { PreparednessResult } from '../../../services/preparednessScoreEngine';
import { FirstAuditWelcomeModal } from '../common/FirstAuditWelcomeModal';
import { CompanyPulseCard } from '../common/CompanyPulseCard';
import PersonalRiskModifierPanel from '../common/PersonalRiskModifierPanel';
import TierBadge from '../common/TierBadge';
import ProvenanceLabel from '../common/ProvenanceLabel';
import { useDashboardAdaptation } from '../../../hooks/useDashboardAdaptation';
import { isCalibrationLimitedForCompany } from '../../../services/segmentedCalibrationEngine';
import { riskColor, riskLabel, riskGradient } from '../../../lib/riskTokens';
import { ScoreTrendStrip } from '../common/ScoreTrendStrip';
import { InactionCostCard } from '../common/InactionCostCard';
import { VerdictReassurance } from '../common/VerdictReassurance';

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

const ScoreRingHero: React.FC<{
  score: number;
  confidence: number;
  calibrationMode?: string;
}> = ({ score, confidence, calibrationMode }) => {
  const color = riskColor(score);
  const label = riskLabel(score);

  return (
    <div className="flex flex-col items-center">
      {/* .score-hero-ring uses CSS clamp for responsive sizing */}
      <div className="score-hero-ring">
        <div className="absolute inset-0 rounded-full" style={{ boxShadow: `0 0 44px ${color}28` }} />
        <svg
          viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
          className="-rotate-90"
          role="img"
          aria-label={`Risk score ${score} out of 100 — ${label}`}
        >
          <circle
            cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R}
            fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10}
          />
          <motion.circle
            cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R}
            fill="none" stroke={color} strokeWidth={10} strokeLinecap="round"
            strokeDasharray={RING_CIRC}
            initial={{ strokeDashoffset: RING_CIRC }}
            animate={{ strokeDashoffset: RING_CIRC - (score / 100) * RING_CIRC }}
            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>
        {/* .score-hero-number: position relative z-index 1 — sits above SVG */}
        <div className="flex flex-col items-center" style={{ position: 'relative', zIndex: 1 }}>
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
        </div>
      </div>

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
          <p className="text-[9px] font-mono mt-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>LOW</p>
        </div>
        <span className="pb-5 font-black text-xl" style={{ color: 'rgba(255,255,255,0.25)' }}>—</span>
        <div className="text-center">
          <span className="score-range-bound" style={{ color: worstColor }}>
            {ciHigh}
          </span>
          <p className="text-[9px] font-mono mt-0.5" style={{ color: worstColor + 'aa' }}>HIGH</p>
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
        <span className="text-[8px] font-mono" style={{ color: 'rgba(255,255,255,0.22)' }}>0</span>
        <span className="text-[8px] font-mono" style={{ color: 'rgba(255,255,255,0.22)' }}>100</span>
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
          className="text-[9px] font-black px-1.5 py-0.5 rounded font-mono uppercase tracking-wide"
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
      <span className="text-[9px] font-bold tracking-wider uppercase truncate"
        style={{ color: 'rgba(255,255,255,0.35)' }}>
        {label}
      </span>
    </div>
    <span className="text-[15px] font-black leading-none" style={{ color }}>{value}</span>
    {sub && <span className="text-[9px] truncate" style={{ color: 'rgba(255,255,255,0.30)' }}>{sub}</span>}
  </div>
);

// ── Verdict line ──────────────────────────────────────────────────────────────

const verdictLine = (score: number, urgency: string): string => {
  if (urgency === 'CRITICAL' || score >= 75)
    return 'Immediate action required — layoff risk is elevated.';
  if (urgency === 'HIGH' || score >= 55)
    return 'Elevated risk signals detected. Begin positioning now.';
  if (score >= 35)
    return 'Moderate signals present. Monitor and maintain readiness.';
  return 'Low risk detected. Good time to build and grow.';
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

const TopDriversStrip: React.FC<{ drivers: DriverItem[] }> = ({ drivers }) => {
  if (drivers.length === 0) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span className="driver-card-rank">#{i + 1}</span>
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

const ImmediateActionsStrip: React.FC<{ actions: ActionItem[]; total: number }> = ({ actions, total }) => {
  if (actions.length === 0) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.14 }}
    >
      <div className="audit-section-head">
        <div className="audit-section-title">
          <Zap size={12} style={{ color: 'var(--cyan)' }} />
          Do This Week
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <TierBadge tier={1} />
          {total > 3 && (
            <span style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>
              +{total - 3} more in Action Plan
            </span>
          )}
        </div>
      </div>
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

// ── Conflict / low-data alert ────────────────────────────────────────────────

const TrustCallout: React.FC<{
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

  const alertTone = (color: string) =>
    color === '#dc2626' ? 'red' : color === '#f97316' ? 'orange' : 'amber';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      {alerts.map((a, i) => (
        <div key={i} className="signal-card" data-tone={alertTone(a.color)}
          style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
          <a.icon size={14} style={{ color: a.color, flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: '0.8rem', lineHeight: 1.5, color: 'var(--text-2)' }}>{a.text}</p>
        </div>
      ))}
    </div>
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
  const confPct  = result.confidencePercent ?? Math.round((Number(result.confidence ?? 0.5)) * 100);
  const calibrationMode: string = (r.modelCalibration as any)?.calibrationMode ?? '';
  const liveCount = result.signalQuality?.liveSignals ?? 0;
  const dataAge   = result.dataFreshness?.ageInDays ?? 0;
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
        why:   String(d.reason ?? d.rationale ?? d.evidenceSummary ?? d.summary ?? 'Multiple contributing signals'),
      }));
  }, [result]);

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

  return (
    <div className="flex flex-col gap-4">

      {/* ── First-audit welcome — modal overlay (score always visible behind) ─ */}
      {adaptation.showFirstAuditWelcome && (
        <FirstAuditWelcomeModal
          open={welcomeModalOpen}
          onClose={() => setWelcomeModalOpen(false)}
          liveSignalCount={liveCount}
          criticalActionCount={criticalActionCount}
          confidencePercent={result.confidencePercent ?? Math.round(Number(result.confidence ?? 0.5) * 100)}
          profileFieldsFilled={(() => {
            const uf = (result as any).userFactors ?? {};
            const fields = ['visaStatus', 'savingsMonthsRunway', 'hasDependents', 'dualIncomeHousehold',
              'priorLayoffSurvived', 'hasEquityVesting', 'equityVestMonths', 'metroArea',
              'tenureYears', 'careerYears', 'performanceTier', 'monthlySalaryUsd',
              'industryYears', 'priorJobChanges', 'selfRatedSkills'];
            return fields.filter(f => uf[f] != null && uf[f] !== '' && uf[f] !== 'unknown').length;
          })()}
        />
      )}

      {/* v39.0 F2 — Emergency callout PRECEDES the score hero in emergency
          mode. Previously the user saw a number and had to interpret risk
          themselves; now the alert framing comes first so the score is read
          in the right emotional context. */}
      {adaptation.mode === 'emergency' && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="signal-card"
          data-tone="red"
          style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}
        >
          <div className="audit-step-dot active" style={{ width: 8, height: 8, marginTop: 4, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '0.6rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--red)', marginBottom: 'var(--space-1)', fontWeight: 800 }}>
              Emergency Mode · Action Plan Tab Primary
            </div>
            <p style={{ fontSize: '0.875rem', lineHeight: 1.5, color: 'var(--text-2)' }}>
              {(result as any).warnSignal?.hasActiveWARN
                ? 'A WARN Act filing has been detected — this is a legally-confirmed layoff signal. Open the Action Plan tab immediately.'
                : `Risk score ${score} sits in the critical band. The Action Plan tab has been promoted; review immediate-7-day actions first, score-context second.`}
            </p>
          </div>
        </motion.div>
      )}

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
        className="rounded-2xl p-5 flex flex-col items-center text-center relative overflow-hidden"
        style={{ background: riskGradient(score), border: `1px solid ${riskColor(score)}30` }}
      >
        {/* tier badge floating in corner */}
        <div className="absolute top-3 right-3">
          <TierBadge tier={1} label="T1 · CORE" />
        </div>

        {/* Gate: if CI range > 50 or confidence < 20%, show range instead of point score */}
        {scoreSufficiency.sufficient
          ? <ScoreRingHero score={score} confidence={confPct} calibrationMode={calibrationMode} />
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

      {/* ── Profile-incomplete disclosure ─────────────────────────────────── */}
      {/* When fewer than 3 personal-context fields are filled, the score
          reflects company + market signals only. Personal amplifiers (visa
          status, financial runway, family obligation) have NOT been applied.
          This is not a deficiency in the data — it is an honest gap in
          personalization. Surface it explicitly so the user doesn't treat a
          generic score as their actual personal risk. */}
      {profileIsEmpty && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="signal-card"
          data-tone="amber"
          style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', cursor: 'pointer' }}
          onClick={() => {
            try { window.dispatchEvent(new CustomEvent('hp.dashboard.navigate', { detail: { tab: 'profile' } })); } catch { /* SSR */ }
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              try { window.dispatchEvent(new CustomEvent('hp.dashboard.navigate', { detail: { tab: 'profile' } })); } catch { /* SSR */ }
            }
          }}
          aria-label="Your personal risk factors are not yet included. Click to add your profile."
        >
          <User size={14} style={{ color: 'var(--amber)', flexShrink: 0, marginTop: 2 }} />
          <div>
            <p style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--amber)', marginBottom: 'var(--space-1)' }}>
              Score reflects company &amp; market risk only
            </p>
            <p style={{ fontSize: '0.775rem', color: 'var(--text-3)', lineHeight: 1.5 }}>
              Visa status, financial runway, and family situation not yet included.
              Personal factors can shift your score by ±8–25 pts.{' '}
              <span style={{ color: 'var(--amber)', fontWeight: 600 }}>Add your profile →</span>
            </p>
          </div>
        </motion.div>
      )}

      {/* ── Trust callout — only when something is off ─────────────────────── */}
      <TrustCallout
        lowDataWarning={lowDataWarning}
        conflictCount={conflictCount}
        hardFailures={hardFailures}
      />

      {/* v40.0: Heuristic / stale freshness disclosure — surfaces when the
          pipeline fell back to historical baselines without live data. */}
      {(() => {
        const tier = result.unifiedFreshness?.tier;
        if (tier === 'heuristic') {
          return (
            <div className="signal-card" data-tone="amber"
              style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}
            >
              <AlertTriangle size={13} style={{ color: 'var(--amber)', flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: '0.8rem', color: 'var(--text-2)', lineHeight: 1.5 }}>
                <span style={{ fontWeight: 700, color: 'var(--amber)' }}>Heuristic baseline — </span>
                no live data retrieved. Analysis draws from historical sector averages.
              </p>
            </div>
          );
        }
        if (tier === 'stale') {
          return (
            <div className="signal-card" data-tone="slate"
              style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}
            >
              <Clock size={13} style={{ color: 'var(--text-3)', flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', lineHeight: 1.5 }}>
                <span style={{ fontWeight: 700 }}>Partial live data — </span>
                some signals are cached. Score uses available data supplemented by cached baselines.
              </p>
            </div>
          );
        }
        return null;
      })()}

      {calibrationLimitation.limited && calibrationLimitation.reason && (
        <div className="signal-card" data-tone="amber"
          style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}
        >
          <Info size={13} style={{ color: 'var(--amber)', flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: '0.775rem', color: 'var(--text-3)', lineHeight: 1.5 }}>
            <span style={{ fontWeight: 700, color: 'var(--amber)' }}>Calibration note: </span>
            {calibrationLimitation.reason}
          </p>
        </div>
      )}

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
            sub={confPct >= 65 ? 'high quality data' : confPct >= 40 ? 'typical' : 'below average'}
            color={confPct >= 65 ? '#10b981' : confPct >= 40 ? '#f59e0b' : '#f97316'}
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

      {/* ── Tier-1: Top risk drivers ───────────────────────────────────────── */}
      <TopDriversStrip drivers={topDrivers} />
      {/* v39.0 F4 — deep-dive link to the full signal-weight breakdown.
          We deliberately use a subtle inline link rather than a button to
          avoid pulling attention from the score hero above. */}
      {topDrivers.length > 0 && (
        <div className="flex justify-end -mt-2 px-1">
          <a
            href="#methodology"
            onClick={(e) => {
              e.preventDefault();
              // Find the dashboard's "transparency" tab and switch to it.
              // Uses a custom event so we don't tightly couple SummaryTab
              // to the dashboard's tab state machine.
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
      )}

      {/* ── Tier-1: Immediate actions ──────────────────────────────────────── */}
      <ImmediateActionsStrip actions={topActions} total={recommendations.length} />

      {/* ── Tier-2: Company pulse — single compressed verdict ──────────────── */}
      {/* This replaces the previous standalone Workforce + Financial cards.
          Same data, one block — drilldown still available inside. */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
      >
        <CompanyPulseCard result={result} companyData={companyData} defaultOpen={false} />
      </motion.div>

      {/* v39.0 A5: render the panel whenever the modifier object is present;
          the panel itself handles the |delta| < 0.5 honest empty state.
          Previously the >= 2 gate hid sub-2pt adjustments silently and broke
          the v35.0 transparency contract. */}
      {(result as any).personalRiskModifier?.rawModifier != null && (
        <PersonalRiskModifierPanel modifier={(result as any).personalRiskModifier} />
      )}

      {/* ── InactionCostCard — "The cost of waiting" — final section ─────── */}
      {/* sixMonthInactionConsequence is on HybridResult directly (not on intelligenceBrief).
          Shows a dark amber card so users leave the Summary tab knowing the stakes. */}
      {(result.sixMonthInactionConsequence || r.sixMonthInactionConsequence) && (
        <InactionCostCard
          consequence={String(result.sixMonthInactionConsequence ?? r.sixMonthInactionConsequence ?? '')}
        />
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
