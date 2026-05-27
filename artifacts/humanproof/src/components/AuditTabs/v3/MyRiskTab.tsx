// v3/MyRiskTab.tsx — V4 UX redesign
//
// TAB 1 of 3: "My Risk"
//
// Decision-driven IA: answers exactly 5 questions in order:
//   1. Am I at risk?          → ScoreRingHero (T1, above fold)
//   2. Why this number?       → TopDriversStrip (T1)
//   3. What do I do tonight?  → ImmediateActionsStrip (T1)
//   4. Is my company OK?      → CompanyPulseCard (T2, scroll-reveal)
//   5. How much time do I have? → PersonalizedTimelinePanel (T2)
//
// T3/T4 content expands from the company section for users who want depth.
//
// KillSwitchFloorBadge is injected inline on the score ring when any floor fired.
// PersonalRiskModifier chip shown when adjustment >= 1pt (links to Profile drawer).
// Emergency mode: ring shrinks, formula score disclosed, T3/T4 collapsed.

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Minus,
  Zap, Shield, Clock, Signal, AlertTriangle, Info, User, AlertOctagon,
  ShieldAlert, TrendingDown as TrendDown, Search,
} from 'lucide-react';
import { computeScoreSufficiency, type ScoreSufficiency } from '../../../lib/scoreGate';
import type { TabProps } from '../common/types';
import type { PreparednessResult } from '../../../services/preparednessScoreEngine';
import { CompanyPulseCard } from '../common/CompanyPulseCard';
import PersonalRiskModifierPanel from '../common/PersonalRiskModifierPanel';
import TierBadge from '../common/TierBadge';
import ProvenanceLabel from '../common/ProvenanceLabel';
import AdaptiveBlock from '../common/AdaptiveBlock';
import KillSwitchFloorBadge from '../common/KillSwitchFloorBadge';
import WARNSignalPanel from '../common/WARNSignalPanel';
import SECEnhancedPanel from '../common/SECEnhancedPanel';
import BLSMacroPanel from '../common/BLSMacroPanel';
import HeadcountVelocityPanel from '../common/HeadcountVelocityPanel';
import GlassdoorVelocityPanel from '../common/GlassdoorVelocityPanel';
import MASignalPanel from '../common/MASignalPanel';
import PersonalizedTimelinePanel from '../common/PersonalizedTimelinePanel';
import PeerContagionPanel from '../common/PeerContagionPanel';
import MacroRiskPanel from '../common/MacroRiskPanel';
import RoleMarketDemandPanel from '../common/RoleMarketDemandPanel';
import { RiskBreakdownTab } from '../RiskBreakdownTab';
import { ScoreDeltaExplainer } from '../../ScoreDeltaExplainer';
import { isCalibrationLimitedForCompany } from '../../../services/segmentedCalibrationEngine';
import { riskColor, riskLabel, riskGradient } from '../../../lib/riskTokens';
import { useDashboardAdaptationV4 } from '../../../hooks/useDashboardAdaptation';
import { EventSearchPanel, isEventSearchAvailable } from '../../audit/EventSearchPanel';

// ── Helpers ───────────────────────────────────────────────────────────────────

const readinessColor = (label: string) => ({
  READY: '#10b981', MOSTLY_READY: '#22d3ee',
  PARTIAL: '#f59e0b', UNDERPREPARED: '#f97316', NOT_READY: '#dc2626',
}[label] ?? '#f59e0b');

const verdictLine = (score: number, urgency: string): string => {
  if (urgency === 'CRITICAL' || score >= 75)
    return 'Immediate action required — layoff risk is elevated.';
  if (urgency === 'HIGH' || score >= 55)
    return 'Elevated risk signals detected. Begin positioning now.';
  if (score >= 35)
    return 'Moderate signals present. Monitor and maintain readiness.';
  return 'Low risk detected. Good time to build and grow.';
};

// ── Score Ring Hero ───────────────────────────────────────────────────────────

const ScoreRingHero: React.FC<{
  score: number;
  confidence: number;
  isMobile: boolean;
  calibrationMode?: string;
  emergencyMode?: boolean;
}> = ({ score, confidence, isMobile, calibrationMode, emergencyMode }) => {
  const size  = emergencyMode ? (isMobile ? 120 : 144) : (isMobile ? 144 : 176);
  const r     = (size - 14) / 2;
  const circ  = 2 * Math.PI * r;
  const color = riskColor(score);
  const label = riskLabel(score);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <div className="absolute inset-0 rounded-full" style={{
          boxShadow: `0 0 ${isMobile ? 32 : 44}px ${color}30`,
        }} />
        <svg
          width={size} height={size} className="-rotate-90"
          role="img"
          aria-label={`Risk score ${score} out of 100 — ${label}`}
        >
          <circle cx={size/2} cy={size/2} r={r} fill="none"
            stroke="rgba(255,255,255,0.06)" strokeWidth={10} />
          <motion.circle
            cx={size/2} cy={size/2} r={r} fill="none"
            stroke={color} strokeWidth={10} strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ - (score / 100) * circ }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="font-black leading-none"
            style={{ fontSize: emergencyMode ? (isMobile ? 36 : 44) : (isMobile ? 46 : 58), color }}
          >
            {score}
          </motion.span>
          <span className="text-[10px] font-mono mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
            /100
          </span>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
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

      <div className="mt-2 flex flex-col items-center gap-1">
        <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
          {confidence}% confidence
        </p>
        <div className="flex items-center gap-1.5">
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
    </div>
  );
};

// ── Score Range Hero (gate: CI > 50 OR confidence < 20%) ─────────────────────

const ScoreRangeHero: React.FC<{
  gate: ScoreSufficiency;
  isMobile: boolean;
}> = ({ gate, isMobile }) => {
  const { ciLow, ciHigh, ciRange, confPct, message } = gate;
  const lowPct  = ciLow;
  const highPct = ciHigh;
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
      <div
        className="mb-4 flex items-center gap-2 px-3 py-1.5 rounded-full"
        style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.35)' }}
      >
        <AlertOctagon className="w-3.5 h-3.5" style={{ color: '#fbbf24' }} />
        <span className="text-[10px] font-black tracking-[0.12em] uppercase" style={{ color: '#fbbf24' }}>
          Score Range — Not a Point Estimate
        </span>
      </div>
      <div className="flex items-end gap-3 mb-3">
        <div className="text-center">
          <span className="font-black leading-none" style={{ fontSize: isMobile ? 38 : 46, color: 'rgba(255,255,255,0.55)' }}>
            {ciLow}
          </span>
          <p className="text-[9px] font-mono mt-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>LOW</p>
        </div>
        <span className="pb-5 font-black text-xl" style={{ color: 'rgba(255,255,255,0.25)' }}>—</span>
        <div className="text-center">
          <span className="font-black leading-none" style={{ fontSize: isMobile ? 38 : 46, color: worstColor }}>
            {ciHigh}
          </span>
          <p className="text-[9px] font-mono mt-0.5" style={{ color: worstColor + 'aa' }}>HIGH</p>
        </div>
      </div>
      <div
        className="relative rounded-full overflow-hidden mb-2"
        style={{ width: isMobile ? 220 : 270, height: 8, background: 'rgba(255,255,255,0.08)' }}
        aria-label={`Score range ${ciLow} to ${ciHigh} out of 100`}
        role="img"
      >
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
        {[35, 55, 75].map(t => (
          <div key={t} className="absolute top-0 bottom-0 w-px"
            style={{ left: `${t}%`, background: 'rgba(255,255,255,0.20)' }} />
        ))}
      </div>
      <div className="flex justify-between mb-3" style={{ width: isMobile ? 220 : 270 }}>
        <span className="text-[8px] font-mono" style={{ color: 'rgba(255,255,255,0.22)' }}>0</span>
        <span className="text-[8px] font-mono" style={{ color: 'rgba(255,255,255,0.22)' }}>100</span>
      </div>
      <p className="text-center text-[11px] leading-relaxed max-w-xs" style={{ color: 'rgba(255,255,255,0.72)' }}>
        {message}
      </p>
      <p className="mt-1.5 text-center text-[10px] leading-snug max-w-xs" style={{ color: 'rgba(255,255,255,0.38)' }}>
        Worst-case exposure reaches <span style={{ color: worstColor, fontWeight: 700 }}>{worstLabel}</span>.
        {' '}Confidence: {confPct}% · CI width: {ciRange} pts
      </p>
      <div className="mt-2 flex items-center gap-1.5">
        <span
          className="text-[9px] font-black px-1.5 py-0.5 rounded font-mono uppercase tracking-wide"
          style={{ background: 'rgba(251,191,36,0.10)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.28)' }}
          title="This is an ESTIMATED range, not a measured value."
        >
          ESTIMATED
        </span>
      </div>
    </div>
  );
};

// ── Stat chips ────────────────────────────────────────────────────────────────

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
      <span className="text-[9px] font-bold tracking-wider uppercase truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>
        {label}
      </span>
    </div>
    <span className="text-[15px] font-black leading-none" style={{ color }}>{value}</span>
    {sub && <span className="text-[9px] truncate" style={{ color: 'rgba(255,255,255,0.30)' }}>{sub}</span>}
  </div>
);

// ── T1 strips ─────────────────────────────────────────────────────────────────

interface DriverItem { key: string; label: string; score: number; why: string; }
interface ActionItem {
  priority: string; title: string; timeline: string;
  step?: string; evidenceStats?: string; sequencePhase?: string;
}

const scoreToTone = (s: number) => s >= 70 ? 'red' : s >= 55 ? 'orange' : s >= 35 ? 'amber' : 'emerald';

const TopDriversStrip: React.FC<{ drivers: DriverItem[] }> = ({ drivers }) => {
  if (drivers.length === 0) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
    >
      <div className="flex items-center gap-1.5 mb-2 px-1">
        <AlertTriangle className="w-3.5 h-3.5" style={{ color: '#f59e0b' }} />
        <span className="text-[10px] font-bold tracking-widest" style={{ color: 'rgba(255,255,255,0.45)' }}>
          WHY YOUR SCORE IS WHERE IT IS
        </span>
        <TierBadge tier={1} />
        <ProvenanceLabel kind="modeled" tooltip="Dimension scores are computed by HumanProof's scoring formula." size="xs" />
      </div>
      <div className="space-y-1.5">
        {drivers.slice(0, 5).map(d => (
          <div key={d.key} className="driver-bar-card" data-tone={scoreToTone(d.score)}>
            <div className="driver-bar-fill" style={{ width: `${Math.min(100, d.score)}%` }} />
            <span className="text-[12px] font-black min-w-[28px] text-center flex-shrink-0"
              style={{ color: riskColor(d.score) }}>{d.score}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold leading-tight" style={{ color: 'rgba(255,255,255,0.90)' }}>{d.label}</p>
              <p className="text-[10px] leading-snug line-clamp-2" style={{ color: 'rgba(255,255,255,0.48)' }}>{d.why}</p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

const priorityClass = (p: string) =>
  p === 'Critical' ? 'critical' : p === 'High' ? 'high' : p === 'Medium' ? 'medium' : 'low';

const ImmediateActionsStrip: React.FC<{ actions: ActionItem[]; total: number }> = ({ actions, total }) => {
  if (actions.length === 0) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
    >
      <div className="flex items-center gap-1.5 mb-2 px-1">
        <Zap className="w-3.5 h-3.5" style={{ color: 'var(--cyan,#00d4e0)' }} />
        <span className="text-[10px] font-bold tracking-widest" style={{ color: 'rgba(0,212,224,0.90)' }}>
          DO THIS WEEK
        </span>
        <TierBadge tier={1} />
        {total > 3 && (
          <span className="ml-auto text-[9px] font-semibold" style={{ color: 'rgba(255,255,255,0.40)' }}>
            +{total - 3} more in Take Action
          </span>
        )}
      </div>
      <div className="space-y-1.5">
        {actions.slice(0, 3).map((a, i) => (
          <div key={`${a.priority}-${i}`} className={`action-timeline-card ${priorityClass(a.priority)}`}>
            <div className="action-timeline-stripe" />
            <div className="action-timeline-body">
              <p className="text-[11px] font-bold leading-tight mb-0.5" style={{ color: 'rgba(255,255,255,0.90)' }}>
                <span className="mr-1.5 text-[10px] font-black" style={{ color: 'rgba(255,255,255,0.30)' }}>{i + 1}.</span>
                {a.title}
              </p>
              <p className="text-[10px] leading-snug" style={{ color: 'rgba(255,255,255,0.45)' }}>
                {a.sequencePhase
                  ? ({ day1: 'Day 1', week1: 'Week 1', month1: 'Month 1', quarter1: 'Quarter 1' } as Record<string,string>)[a.sequencePhase] ?? a.timeline
                  : a.timeline}
                {a.step ? ` · ${a.step}` : ''}
              </p>
              {a.evidenceStats && (
                <p className="text-[10px] italic mt-0.5 leading-snug line-clamp-2" style={{ color: 'rgba(255,255,255,0.32)' }}>
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

// ── Trust callout ─────────────────────────────────────────────────────────────

const TrustCallout: React.FC<{
  lowDataWarning?: { code: string; missingCount: number; capAt: number };
  conflictCount: number;
  hardFailures: string[];
}> = ({ lowDataWarning, conflictCount, hardFailures }) => {
  const alerts: Array<{ icon: React.ElementType; text: string; color: string }> = [];
  if (lowDataWarning) {
    alerts.push({ icon: Info, text: `${lowDataWarning.missingCount} critical signals missing — score indicative (${Math.round(lowDataWarning.capAt * 100)}% confidence cap)`, color: '#f59e0b' });
  }
  if (conflictCount > 0) {
    alerts.push({ icon: AlertTriangle, text: `${conflictCount} signal conflict${conflictCount > 1 ? 's' : ''} detected — score widened by ±${conflictCount * 2}pts`, color: '#f97316' });
  }
  if (hardFailures.length > 0) {
    alerts.push({ icon: AlertTriangle, text: `${hardFailures.length} live source failure${hardFailures.length > 1 ? 's' : ''} — some signals are estimates`, color: '#dc2626' });
  }
  if (alerts.length === 0) return null;
  return (
    <div className="space-y-2">
      {alerts.map((a, i) => (
        <div key={i} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5"
          style={{ background: a.color + '12', border: `1px solid ${a.color}30` }}>
          <a.icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: a.color }} />
          <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.70)' }}>{a.text}</p>
        </div>
      ))}
    </div>
  );
};

// ── Main Export ───────────────────────────────────────────────────────────────

export const MyRiskTab: React.FC<TabProps> = ({ result, companyData, emergencyMode }) => {
  const r     = result as any;
  const score = result.total;
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  const adaptation = useDashboardAdaptationV4(result, companyData);
  const isEmergency = emergencyMode || adaptation.mode === 'emergency';

  const brief       = r.intelligenceBrief;
  const preparedness: PreparednessResult | undefined = r.preparednessScore;
  const urgency     = brief?.urgencyLevel ?? (score >= 75 ? 'CRITICAL' : score >= 55 ? 'HIGH' : score >= 35 ? 'MODERATE' : 'LOW');
  const confPct     = result.confidencePercent ?? Math.round((Number(result.confidence ?? 0.5)) * 100);
  const calibrationMode: string = (r.modelCalibration as any)?.calibrationMode ?? '';
  const liveCount   = result.signalQuality?.liveSignals ?? 0;
  const dataAge     = result.dataFreshness?.ageInDays ?? 0;
  const conflictCount = result.signalQuality?.conflictingSignals?.length ?? 0;
  const hardFailures  = [...(result.signalQuality?.hardFailures ?? [])];
  const lowDataWarning = result.signalQuality?.lowDataWarning as any;
  const dagDegraded = r._dagDegradedLayerCount ?? 0;
  if (dagDegraded > 2) {
    hardFailures.push(`${dagDegraded} intelligence modules degraded — some insights use fallback estimates`);
  }
  const pScore = preparedness?.overallScore ?? 0;
  const pColor = preparedness ? readinessColor(preparedness.readinessLabel ?? '') : '#f59e0b';

  const calibrationLimitation = isCalibrationLimitedForCompany(
    result.industryKey ?? companyData?.industry ?? null,
    result.countryKey ?? (companyData as any)?.region ?? null,
    companyData?.isPublic ?? true,
  );

  const uf = (r.userFactors ?? {}) as Record<string, unknown>;
  const personalFieldsFilled = [
    'visaStatus', 'savingsMonthsRunway', 'hasDependents', 'dualIncomeHousehold',
    'hasEquityVesting', 'metroArea', 'performanceTier', 'monthlySalaryUsd',
  ].filter(f => uf[f] != null && uf[f] !== '' && uf[f] !== 'unknown').length;
  const profileIsEmpty = personalFieldsFilled < 3;

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
  const priorityWeight = (p: string) => p === 'Critical' ? 0 : p === 'High' ? 1 : p === 'Medium' ? 2 : 3;
  const topActions: ActionItem[] = useMemo(() => recommendations
    .slice()
    .sort((a, b) => priorityWeight(a.priority) - priorityWeight(b.priority))
    .slice(0, 3)
    .map(rec => ({
      priority:      String(rec.priority ?? 'Medium'),
      title:         String(rec.title ?? rec.action ?? rec.text ?? 'Take action'),
      timeline:      String(rec.timeline ?? rec.timeframe ?? rec.deadline ?? 'This week'),
      step:          rec.steps?.[0] ? String(rec.steps[0]) : undefined,
      evidenceStats: rec.evidenceStats ? String(rec.evidenceStats) : undefined,
      sequencePhase: rec.sequencePhase ? String(rec.sequencePhase) : undefined,
    })), [recommendations]);

  // Company section data (from IntelligenceTab pattern)
  const warnSignal    = r.warnSignal;
  const secEnhanced   = r.secEnhancedSignals;
  const blsMacro      = r.blsMacroSignal;
  const peerContagion = r.peerContagion;
  const macroRisk     = r.macroEconomicRisk;
  const roleMarket    = r.roleMarketDemand;

  const secHasContent = Boolean(
    secEnhanced && typeof secEnhanced === 'object' && Object.keys(secEnhanced).length > 0 &&
    ((secEnhanced as any).warnSignals?.length || (secEnhanced as any).layoffHistory?.length || (secEnhanced as any).fcfSignal),
  );
  const hasGroundTruth = Boolean(warnSignal?.hasActiveWARN || secHasContent || blsMacro);
  const warnActiveCount = warnSignal?.hasActiveWARN ? 1 : 0;

  // Kill-switch disclosure
  const activatedKillSwitches: string[] = r.activatedKillSwitches ?? [];
  const killSwitchFloors: Record<string, number> = r.killSwitchFloors ?? {};
  const formulaPreFloor: number = r._formulaScorePreFloor ?? score;

  // Score delta
  const hasDelta = r.scoreDelta?.delta != null && Math.abs(r.scoreDelta.delta ?? 0) >= 1;

  return (
    <div className="flex flex-col gap-4">

      {/* ── T1: Score Hero ───────────────────────────────────────────────────── */}
      <motion.div
        key={`score-hero-${score}`}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-5 flex flex-col items-center text-center relative overflow-hidden"
        style={{ background: riskGradient(score), border: `1px solid ${riskColor(score)}30`, minHeight: isMobile ? '40vh' : '50vh' }}
      >
        <div className="absolute top-3 right-3">
          <TierBadge tier={1} label="T1 · CORE" />
        </div>

        {scoreSufficiency.sufficient
          ? <ScoreRingHero score={score} confidence={confPct} isMobile={isMobile} calibrationMode={calibrationMode} emergencyMode={isEmergency} />
          : <ScoreRangeHero gate={scoreSufficiency} isMobile={isMobile} />
        }

        {/* Kill-switch floor badge — inline below ring */}
        {activatedKillSwitches.length > 0 && (
          <div className="mt-2">
            <KillSwitchFloorBadge
              activatedKillSwitches={activatedKillSwitches}
              killSwitchFloors={killSwitchFloors}
              formulaScore={formulaPreFloor}
            />
          </div>
        )}

        {scoreSufficiency.sufficient && (
          <p className="mt-3 text-[12px] leading-relaxed max-w-xs" style={{ color: 'rgba(255,255,255,0.70)' }}>
            {verdictLine(score, urgency)}
          </p>
        )}
        {scoreSufficiency.sufficient && r.scoreDelta && Math.abs(r.scoreDelta.delta30d ?? 0) >= 1 && (
          <div className="mt-2 flex items-center gap-1.5 text-[11px]" style={{ color: velocityColor }}>
            {React.createElement(velocityIcon, { className: 'w-3.5 h-3.5' })}
            <span>{Math.abs(r.scoreDelta.delta30d ?? 0)}pt {r.scoreDelta.direction} vs 30d ago</span>
          </div>
        )}
      </motion.div>

      {/* PersonalRiskModifier chip — shown when >= 1pt adjustment */}
      {r.personalRiskModifier?.adjustmentPts != null && Math.abs(r.personalRiskModifier.adjustmentPts) >= 1 && (
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-left self-center"
          style={{ background: 'rgba(89,64,200,0.12)', border: '1px solid rgba(89,64,200,0.30)' }}
          onClick={() => {
            try { window.dispatchEvent(new CustomEvent('hp.dashboard.openDrawer', { detail: 'profile' })); } catch { /* SSR */ }
          }}
          aria-label="View personal risk factors in profile drawer"
        >
          <User className="w-3.5 h-3.5" style={{ color: '#7c6bf0' }} />
          <span className="text-[11px] font-semibold" style={{ color: '#7c6bf0' }}>
            {r.personalRiskModifier.adjustmentPts > 0 ? '+' : ''}{r.personalRiskModifier.adjustmentPts.toFixed(1)} pts personal factors · View profile →
          </span>
        </button>
      )}

      {/* Profile empty disclosure */}
      {profileIsEmpty && (
        <motion.div
          initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
          className="flex items-start gap-2.5 rounded-xl px-3.5 py-3 cursor-pointer"
          style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.30)' }}
          onClick={() => {
            try { window.dispatchEvent(new CustomEvent('hp.dashboard.openDrawer', { detail: 'profile' })); } catch { /* SSR */ }
          }}
          role="button" tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { try { window.dispatchEvent(new CustomEvent('hp.dashboard.openDrawer', { detail: 'profile' })); } catch { /* SSR */ } } }}
          aria-label="Your personal risk factors are not yet included. Click to add your profile."
        >
          <User className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: '#fbbf24' }} />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold leading-tight mb-0.5" style={{ color: '#fbbf24' }}>
              Score reflects company & market risk only
            </p>
            <p className="text-[10px] leading-snug" style={{ color: 'rgba(255,255,255,0.60)' }}>
              Visa status, financial runway, and family situation not yet included.
              These can shift your personal score by ±8–25 pts.{' '}
              <span style={{ color: '#fbbf24', fontWeight: 600 }}>Add your profile →</span>
            </p>
          </div>
        </motion.div>
      )}

      {/* Trust callout */}
      <TrustCallout lowDataWarning={lowDataWarning} conflictCount={conflictCount} hardFailures={hardFailures} />

      {/* Freshness disclosure */}
      {(() => {
        const tier = result.unifiedFreshness?.tier;
        if (tier === 'heuristic') return (
          <div className="flex items-start gap-2.5 rounded-xl px-3.5 py-3"
            style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-400" />
            <p className="text-[11px] leading-snug" style={{ color: 'rgba(255,255,255,0.70)' }}>
              <span className="font-semibold text-amber-400">Heuristic baseline — </span>
              no live data retrieved. Analysis draws from historical sector averages.
            </p>
          </div>
        );
        if (tier === 'stale') return (
          <div className="flex items-start gap-2.5 rounded-xl px-3.5 py-3"
            style={{ background: 'rgba(148,163,184,0.06)', border: '1px solid rgba(148,163,184,0.20)' }}>
            <Clock className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: '#94a3b8' }} />
            <p className="text-[11px] leading-snug" style={{ color: 'rgba(255,255,255,0.55)' }}>
              <span className="font-semibold" style={{ color: '#94a3b8' }}>Partial live data — </span>
              some signals are cached or estimated.
            </p>
          </div>
        );
        return null;
      })()}

      {/* Calibration limitation */}
      {calibrationLimitation.limited && calibrationLimitation.reason && (
        <div className="flex items-start gap-2.5 rounded-xl px-3.5 py-2.5"
          style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.20)' }}>
          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: '#f59e0b' }} />
          <p className="text-[10px] leading-snug" style={{ color: 'rgba(255,255,255,0.55)' }}>
            <span className="font-semibold" style={{ color: '#f59e0b' }}>Calibration note: </span>
            {calibrationLimitation.reason}
          </p>
        </div>
      )}

      {/* Quick stats */}
      <motion.div
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
        className="flex gap-2 overflow-x-auto pb-0.5"
        style={{ scrollbarWidth: 'none' }}
      >
        {scoreSufficiency.sufficient ? (
          <StatChip label="Confidence" value={`${confPct}%`}
            sub={confPct >= 70 ? 'high' : confPct >= 45 ? 'moderate' : 'low'}
            color={confPct >= 70 ? '#10b981' : confPct >= 45 ? '#f59e0b' : '#f97316'} icon={Shield} />
        ) : (
          <StatChip label="Score Range" value={`${scoreSufficiency.ciLow}–${scoreSufficiency.ciHigh}`}
            sub="point est. unreliable" color="#fbbf24" icon={AlertOctagon} />
        )}
        <StatChip label="Readiness" value={`${pScore}`} sub={preparedness?.readinessLabel ?? '—'} color={pColor} icon={Shield} />
        <StatChip label="Live Signals" value={`${liveCount}`}
          sub={liveCount >= 4 ? 'full live' : liveCount >= 2 ? 'partial' : 'heuristic'}
          color={liveCount >= 4 ? '#10b981' : liveCount >= 2 ? '#22d3ee' : '#f59e0b'} icon={Signal} />
        <StatChip label="Data Age" value={`${dataAge}d`}
          sub={dataAge <= 1 ? 'fresh' : dataAge <= 7 ? 'recent' : 'stale'}
          color={dataAge <= 1 ? '#10b981' : dataAge <= 7 ? '#22d3ee' : '#f97316'} icon={Clock} />
      </motion.div>

      {/* ── T1: Top risk drivers ─────────────────────────────────────────────── */}
      <TopDriversStrip drivers={topDrivers} />
      {topDrivers.length > 0 && (
        <div className="flex justify-end -mt-2 px-1">
          <button
            onClick={() => { try { window.dispatchEvent(new CustomEvent('hp.dashboard.openDrawer', { detail: 'methodology' })); } catch { /* SSR */ } }}
            className="text-[10px] font-mono uppercase tracking-wider hover:opacity-100 transition-opacity"
            style={{ color: 'rgba(34,211,238,0.70)', opacity: 0.85, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            View all signal weights &nbsp;&rarr;
          </button>
        </div>
      )}

      {/* ── T1: Immediate actions ─────────────────────────────────────────────── */}
      <ImmediateActionsStrip actions={topActions} total={recommendations.length} />

      {/* ── T2: Score delta (returning users, delta >= 1pt) ───────────────────── */}
      {hasDelta && (
        <AdaptiveBlock
          title={`Score changed ${r.scoreDelta.delta > 0 ? '▲' : '▼'} ${Math.abs(r.scoreDelta.delta)} pts`}
          subtitle="What drove the change since your last audit"
          icon={r.scoreDelta.direction === 'worsening' ? TrendingUp : TrendingDown}
          tier={2}
          accentColor={r.scoreDelta.direction === 'worsening' ? '#dc2626' : '#10b981'}
          defaultOpen={true}
        >
          <ScoreDeltaExplainer
        delta={r.scoreDelta}
        daysAgo={r.scoreDelta?.daysAgo ?? 30}
        companyName={(companyData as any)?.name}
      />
        </AdaptiveBlock>
      )}

      {/* ── T2: All dimensions ─────────────────────────────────────────────────── */}
      <AdaptiveBlock
        title="Risk dimensions breakdown"
        subtitle="How each layer contributes to your score"
        icon={TrendingUp}
        tier={2}
        accentColor="#22d3ee"
        defaultOpen={false}
      >
        <RiskBreakdownTab result={result} companyData={companyData} />
      </AdaptiveBlock>

      {/* ── T2: Company pulse ─────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
        <CompanyPulseCard result={result} companyData={companyData} defaultOpen={false} />
      </motion.div>

      {/* PersonalRiskModifierPanel (full panel, not chip) */}
      {r.personalRiskModifier?.rawModifier != null && (
        <PersonalRiskModifierPanel modifier={r.personalRiskModifier} />
      )}

      {/* ── T2: Personalized timeline ─────────────────────────────────────────── */}
      <AdaptiveBlock
        title="Your risk timeline"
        subtitle="Displacement window based on stage compression and personal context"
        icon={Clock}
        tier={2}
        accentColor="#f59e0b"
        defaultOpen={false}
      >
        <PersonalizedTimelinePanel personalizedTimeline={r.personalizedTimeline ?? r.temporalRisk ?? null} />
      </AdaptiveBlock>

      {/* ── T3: Company depth (layoff history, headcount, Glassdoor, M&A) ───────── */}
      <AdaptiveBlock
        title="Layoff history & company signals"
        subtitle="Headcount velocity, Glassdoor, M&A activity"
        icon={ShieldAlert}
        tier={3}
        accentColor="#f97316"
        defaultOpen={false}
      >
        <div className="flex flex-col gap-3">
          {r.headcountVelocity    && <HeadcountVelocityPanel headcount={r.headcountVelocity} />}
          {r.glassdoorVelocity    && <GlassdoorVelocityPanel glassdoorVelocity={r.glassdoorVelocity} />}
          {r.mergerAcquisitionRisk && <MASignalPanel maRisk={r.mergerAcquisitionRisk} />}
        </div>
      </AdaptiveBlock>

      {/* ── T4: Ground truth signals (WARN, SEC, BLS) ────────────────────────── */}
      <AdaptiveBlock
        title="Ground truth signals"
        subtitle="Legally filed or regulatory-sourced — highest confidence"
        icon={ShieldAlert}
        tier={4}
        accentColor={warnActiveCount > 0 ? '#dc2626' : '#f97316'}
        defaultOpen={false}
        badge={warnActiveCount > 0 ? 'WARN ACTIVE' : hasGroundTruth ? 'REGULATORY' : undefined}
        badgeColor={warnActiveCount > 0 ? '#dc2626' : '#f97316'}
        empty={!hasGroundTruth}
      >
        {warnSignal    && <WARNSignalPanel warnSignal={warnSignal} />}
        {secHasContent && <SECEnhancedPanel secEnhancedSignals={secEnhanced} />}
        {blsMacro      && <BLSMacroPanel blsMacroSignal={blsMacro} />}
      </AdaptiveBlock>

      {/* ── T4: Market environment ───────────────────────────────────────────── */}
      <AdaptiveBlock
        title="Market environment"
        subtitle="Role demand, peer contagion, macro risk"
        icon={TrendingUp}
        tier={4}
        accentColor="#f59e0b"
        defaultOpen={false}
        empty={!roleMarket && !peerContagion && !macroRisk}
      >
        {roleMarket    && <RoleMarketDemandPanel roleMarketDemand={roleMarket} />}
        {peerContagion && <PeerContagionPanel contagion={peerContagion} />}
        {macroRisk     && <MacroRiskPanel macro={macroRisk} />}
      </AdaptiveBlock>

      {/* ── T4: Event search ─────────────────────────────────────────────────── */}
      {isEventSearchAvailable() && (
        <AdaptiveBlock
          title="Cross-source event timeline"
          subtitle="Raw events from news, filings, and signals"
          icon={Search}
          tier={4}
          accentColor="#22d3ee"
          defaultOpen={false}
        >
          <div className="px-1"><EventSearchPanel /></div>
        </AdaptiveBlock>
      )}

    </div>
  );
};

export default MyRiskTab;
