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

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Minus,
  Zap, Shield, Clock, Signal, AlertTriangle, Info, User,
} from 'lucide-react';
import type { TabProps } from '../common/types';
import type { PreparednessResult } from '../../../services/preparednessScoreEngine';
import { FirstAuditWelcome } from '../common/FirstAuditWelcome';
import { CompanyPulseCard } from '../common/CompanyPulseCard';
import PersonalRiskModifierPanel from '../common/PersonalRiskModifierPanel';
import TierBadge from '../common/TierBadge';
import ProvenanceLabel from '../common/ProvenanceLabel';
import { useDashboardAdaptation } from '../../../hooks/useDashboardAdaptation';
import { isCalibrationLimitedForCompany } from '../../../services/segmentedCalibrationEngine';
import { riskColor, riskLabel, riskGradient } from '../../../lib/riskTokens';

// ── Helpers ───────────────────────────────────────────────────────────────────
// riskColor, riskLabel, riskGradient imported from lib/riskTokens.ts (v40.0)

const readinessColor = (label: string) => ({
  READY: '#10b981', MOSTLY_READY: '#22d3ee',
  PARTIAL: '#f59e0b', UNDERPREPARED: '#f97316', NOT_READY: '#dc2626',
}[label] ?? '#f59e0b');

// ── Score Ring Hero ───────────────────────────────────────────────────────────

const ScoreRingHero: React.FC<{
  score: number;
  confidence: number;
  isMobile: boolean;
  calibrationMode?: string;
}> = ({ score, confidence, isMobile, calibrationMode }) => {
  const size  = isMobile ? 144 : 176;
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
            style={{ fontSize: isMobile ? 46 : 58, color }}
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
        {/* The layoff risk score is always a model output — never a direct measurement.
            Surface this explicitly so the user knows what kind of number they're reading. */}
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

const TopDriversStrip: React.FC<{ drivers: DriverItem[] }> = ({ drivers }) => {
  if (drivers.length === 0) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-2xl p-3"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="flex items-center gap-1.5 mb-2.5">
        <AlertTriangle className="w-3.5 h-3.5" style={{ color: '#f59e0b' }} />
        <span className="text-[10px] font-bold tracking-widest" style={{ color: 'rgba(255,255,255,0.45)' }}>
          WHY YOUR SCORE IS WHERE IT IS
        </span>
        <TierBadge tier={1} />
        <ProvenanceLabel
          kind="modeled"
          tooltip="These dimension scores are computed by HumanProof's scoring formula. Individual signals feeding them may be MEASURED or ESTIMATED — expand each driver to see sources."
          size="xs"
        />
      </div>
      <div className="space-y-1.5">
        {drivers.slice(0, 3).map(d => (
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
              <p className="text-[11px] font-bold leading-tight" style={{ color: 'rgba(255,255,255,0.88)' }}>
                {d.label}
              </p>
              <p className="text-[10px] leading-snug line-clamp-2" style={{ color: 'rgba(255,255,255,0.50)' }}>
                {d.why}
              </p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

const ImmediateActionsStrip: React.FC<{ actions: ActionItem[]; total: number }> = ({ actions, total }) => {
  if (actions.length === 0) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.14 }}
      className="rounded-2xl p-3"
      style={{ background: 'rgba(0,212,224,0.04)', border: '1px solid rgba(0,212,224,0.18)' }}
    >
      <div className="flex items-center gap-1.5 mb-2.5">
        <Zap className="w-3.5 h-3.5" style={{ color: 'var(--cyan,#00d4e0)' }} />
        <span className="text-[10px] font-bold tracking-widest" style={{ color: 'rgba(0,212,224,0.90)' }}>
          DO THIS WEEK
        </span>
        <TierBadge tier={1} />
        {total > 3 && (
          <span className="ml-auto text-[9px] font-semibold" style={{ color: 'rgba(255,255,255,0.40)' }}>
            +{total - 3} more in Action Plan
          </span>
        )}
      </div>
      <div className="space-y-1.5">
        {actions.slice(0, 3).map((a, i) => (
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
              <p className="text-[10px] leading-snug"
                style={{ color: 'rgba(255,255,255,0.45)' }}>
                {a.sequencePhase
                  ? { day1: 'Day 1', week1: 'Week 1', month1: 'Month 1', quarter1: 'Quarter 1' }[a.sequencePhase] ?? a.timeline
                  : a.timeline
                }{a.step ? ` · ${a.step}` : ''}
              </p>
              {/* evidenceStats is the one-liner "why this works" — surfaces data
                  behind the recommendation so the action feels earned, not templated */}
              {a.evidenceStats && (
                <p className="text-[10px] italic mt-0.5 leading-snug line-clamp-2"
                  style={{ color: 'rgba(255,255,255,0.32)' }}>
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

      {/* ── First-audit welcome — only shown once per device ───────────────── */}
      {adaptation.showFirstAuditWelcome && (
        <FirstAuditWelcome
          liveSignalCount={liveCount}
          criticalActionCount={criticalActionCount}
          // v39.0 F3: confidence + profile completeness drive the step labels
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
          className="rounded-xl px-4 py-3 flex items-start gap-3"
          style={{
            background: 'rgba(220, 38, 38, 0.10)',
            border: '1px solid rgba(220, 38, 38, 0.35)',
          }}
        >
          <div
            className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
            style={{ background: '#dc2626', boxShadow: '0 0 8px #dc2626' }}
          />
          <div className="flex-1">
            <div className="text-[10px] font-mono uppercase tracking-widest mb-1" style={{ color: '#dc2626' }}>
              Emergency Mode · Action Plan Tab Primary
            </div>
            <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.85)' }}>
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

        <ScoreRingHero score={score} confidence={confPct} isMobile={isMobile} calibrationMode={calibrationMode} />
        <p className="mt-3 text-[12px] leading-relaxed max-w-xs"
          style={{ color: 'rgba(255,255,255,0.70)' }}>
          {verdictLine(score, urgency)}
        </p>
        {r.scoreDelta && Math.abs(r.scoreDelta.delta30d ?? 0) >= 1 && (
          <div className="mt-2 flex items-center gap-1.5 text-[11px]" style={{ color: velocityColor }}>
            {React.createElement(velocityIcon, { className: 'w-3.5 h-3.5' })}
            <span>
              {Math.abs(r.scoreDelta.delta30d ?? 0)}pt {r.scoreDelta.direction} vs 30d ago
            </span>
          </div>
        )}
      </motion.div>

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
          className="flex items-start gap-2.5 rounded-xl px-3.5 py-3 cursor-pointer"
          style={{
            background: 'rgba(251,191,36,0.07)',
            border: '1px solid rgba(251,191,36,0.30)',
          }}
          onClick={() => {
            try {
              window.dispatchEvent(new CustomEvent('hp.dashboard.navigate', { detail: { tab: 'profile' } }));
            } catch { /* SSR */ }
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              try {
                window.dispatchEvent(new CustomEvent('hp.dashboard.navigate', { detail: { tab: 'profile' } }));
              } catch { /* SSR */ }
            }
          }}
          aria-label="Your personal risk factors are not yet included. Click to add your profile."
        >
          <User className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: '#fbbf24' }} />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold leading-tight mb-0.5" style={{ color: '#fbbf24' }}>
              Score reflects company & market risk only
            </p>
            <p className="text-[10px] leading-snug" style={{ color: 'rgba(255,255,255,0.60)' }}>
              Your visa status, financial runway, and family situation haven't been included yet.
              These can shift your personal score by ±8–25 points.{' '}
              <span style={{ color: '#fbbf24', fontWeight: 600 }}>Add your profile →</span>
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
            <div
              className="flex items-start gap-2.5 rounded-xl px-3.5 py-3"
              style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}
            >
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-400" />
              <p className="text-[11px] leading-snug" style={{ color: 'rgba(255,255,255,0.70)' }}>
                <span className="font-semibold text-amber-400">Heuristic baseline — </span>
                no live data retrieved for this company. Analysis draws from historical sector averages.
                Accuracy improves once live signals are available.
              </p>
            </div>
          );
        }
        if (tier === 'stale') {
          return (
            <div
              className="flex items-start gap-2.5 rounded-xl px-3.5 py-3"
              style={{ background: 'rgba(148,163,184,0.06)', border: '1px solid rgba(148,163,184,0.20)' }}
            >
              <Clock className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: '#94a3b8' }} />
              <p className="text-[11px] leading-snug" style={{ color: 'rgba(255,255,255,0.55)' }}>
                <span className="font-semibold" style={{ color: '#94a3b8' }}>Partial live data — </span>
                some signals are cached. Score reflects available data supplemented by cached baselines.
              </p>
            </div>
          );
        }
        return null;
      })()}

      {/* v40.0: Calibration limitation chip for underrepresented segments */}
      {calibrationLimitation.limited && calibrationLimitation.reason && (
        <div
          className="flex items-start gap-2.5 rounded-xl px-3.5 py-2.5"
          style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.20)' }}
        >
          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: '#f59e0b' }} />
          <p className="text-[10px] leading-snug" style={{ color: 'rgba(255,255,255,0.55)' }}>
            <span className="font-semibold" style={{ color: '#f59e0b' }}>Calibration note: </span>
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
