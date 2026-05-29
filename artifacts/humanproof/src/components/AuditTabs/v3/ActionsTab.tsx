// v3/ActionsTab.tsx — v35.1
//
// ACTION PLAN tab (4th tab in v34 IA). Where decision-driven users land
// directly in Emergency Mode.
//
// Layout (priority order):
//   0. WARN Act 60-day protocol (T0, legal ground truth — shown first when active)
//   1. Short runway escalation (T0, only when score ≥ 70 + runway ≤ 3 months)
//   2. Equity alert (T1, only when vest cliff < 12 months + score > 50)
//   3. Emergency Anchor Card (T1, only in emergency mode)
//   4. Career Contingency Plan (T1)  — STAY / NEGOTIATE / TRANSITION decision paths
//   5. Recovery Probability Card     — "Your Odds" motivational card
//   6. Phase Progress System (T1)    — 3-phase action unlock with checkboxes
//   7. Complete action plan (T3)     — full list, collapsed
//   8. Strategic plan & negotiation (T3) — deep planning, collapsed

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ListChecks, Zap, Clock, TrendingDown, Shield, AlertTriangle, ShieldAlert,
  BookOpen, Activity, Key, Siren, Timer,
} from 'lucide-react';
import { ProfileQuickCapture } from '../../ProfileQuickCapture';
import type { TabProps } from '../common/types';
import type { CareerContingencyPlan } from '../../../services/careerContingencyPlanEngine';
import type { ActionPlanItem } from '../../../types/hybridResult';
import CareerContingencyPanel from '../common/CareerContingencyPanel';
import AdaptiveBlock from '../common/AdaptiveBlock';
import StrategyTab from '../StrategyTab';
import { ActionPlanTab } from '../ActionPlanTab';
import TierBadge from '../common/TierBadge';
import { useDashboardAdaptation } from '../../../hooks/useDashboardAdaptation';
import { PhaseProgressSystem } from '../common/PhaseProgressSystem';
import { RecoveryProbabilityCard } from '../common/RecoveryProbabilityCard';
import type { SurvivalProbabilityResult } from '../../../services/layoffSurvivalPredictor';
import { ExecutiveIntelligencePanel } from '../common/ExecutiveIntelligencePanel';
import {
  runExecutiveIntelligence,
  detectExecutiveTier,
} from '../../../services/executiveIntelligenceEngine';
import type { UserProfile } from '../../../services/userProfileService';

// ── Action Matrix ─────────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<string, { color: string; bg: string; icon: React.ElementType }> = {
  Critical: { color: '#dc2626', bg: 'rgba(220,38,38,0.12)', icon: AlertTriangle },
  High:     { color: '#f97316', bg: 'rgba(249,115,22,0.10)', icon: Zap },
  Medium:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', icon: Clock },
  Low:      { color: '#10b981', bg: 'rgba(16,185,129,0.08)', icon: TrendingDown },
};

const ActionMatrix: React.FC<{ items: ActionPlanItem[] }> = ({ items }) => {
  const [showAll, setShowAll] = useState(false);

  const prioritised = useMemo(() => {
    const order: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
    return [...items].sort((a, b) => (order[a.priority] ?? 4) - (order[b.priority] ?? 4));
  }, [items]);

  const visible = showAll ? prioritised : prioritised.slice(0, 5);
  const criticalCount = prioritised.filter(i => i.priority === 'Critical').length;

  return (
    <div className="rounded-2xl p-4"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ListChecks className="w-4 h-4" style={{ color: 'rgba(0,212,224,0.7)' }} />
          <p className="text-[10px] font-bold tracking-widest" style={{ color: 'rgba(255,255,255,0.45)' }}>
            ACTION PRIORITY MATRIX
          </p>
          <TierBadge tier={1} />
        </div>
        {criticalCount > 0 && (
          <span className="text-[9px] font-black px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(220,38,38,0.20)', color: '#dc2626' }}>
            {criticalCount} CRITICAL
          </span>
        )}
      </div>

      <div className="space-y-2">
        {visible.map((item, idx) => {
          const config = PRIORITY_CONFIG[item.priority] ?? PRIORITY_CONFIG.Low;
          const PIcon = config.icon;
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="rounded-xl p-3"
              style={{ background: config.bg, border: `1px solid ${config.color}25` }}
            >
              <div className="flex items-start gap-2.5">
                <PIcon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: config.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <p className="text-[12px] font-semibold leading-tight" style={{ color: 'rgba(255,255,255,0.88)' }}>
                      {item.title}
                    </p>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: config.color + '20', color: config.color }}>
                      {item.priority}
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    {item.description}
                  </p>
                  <div className="flex items-center flex-wrap gap-2 mt-1.5">
                    {/* Sequence phase label */}
                    {item.sequencePhase && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.40)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>
                        {{ day1: 'Day 1', week1: 'Week 1', month1: 'Month 1', quarter1: 'Quarter 1' }[item.sequencePhase]}
                      </span>
                    )}
                    {item.deadline && (
                      <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        <Clock className="w-2.5 h-2.5 inline mr-1" />
                        {item.deadline}
                      </span>
                    )}
                    {/* Effort badge */}
                    {item.effortBadge && (
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                        style={{ background: 'rgba(0,212,224,0.10)', color: 'rgba(0,212,224,0.65)', border: '1px solid rgba(0,212,224,0.20)' }}>
                        {item.effortBadge}
                      </span>
                    )}
                    {item.riskReductionPct > 0 && (
                      <span className="text-[10px]" style={{ color: '#10b98180' }}>
                        <TrendingDown className="w-2.5 h-2.5 inline mr-1" />
                        −{item.riskReductionPct}% risk
                      </span>
                    )}
                  </div>
                  {/* Evidence stat — collapsed "Why this works" one-liner */}
                  {item.evidenceStats && (
                    <p className="text-[10px] italic mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      {item.evidenceStats}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {prioritised.length > 5 && (
        <button
          onClick={() => setShowAll(s => !s)}
          className="w-full mt-3 py-2 text-[11px] font-semibold rounded-xl transition-colors"
          style={{ color: 'rgba(0,212,224,0.85)', background: 'rgba(0,212,224,0.06)', border: '1px solid rgba(0,212,224,0.15)' }}
        >
          {showAll ? 'Show less' : `Show all ${prioritised.length} actions`}
        </button>
      )}
    </div>
  );
};

// ── Emergency Anchor Card — Wave 3.2 empathetic rewrite ──────────────────────
//
// Replaces the old terse "EMERGENCY MODE · SCORE {score}" banner.
// Design principles:
//   1. Statistical grounding first — user is AHEAD of most people, not behind
//   2. Single action focus — one thing this week, not a list
//   3. Escape hatch — "if this feels overwhelming" reduces panic-freeze
//   4. Calm tone — no ALL-CAPS alarm language except the score badge
//
// Props:
//   score         — the user's current risk score (for the badge)
//   topAction     — the #1 most critical action title (from recommendations[0])
//   topActionTime — effort estimate for that action (e.g. "45 min")

const EmergencyCallout: React.FC<{
  score: number;
  topAction?: string;
  topActionTime?: string;
}> = ({ score, topAction, topActionTime }) => {
  // Percentile grounding: score 75–100 puts user in ~top 20% of risk.
  // Most people discover layoff risk 2 weeks before it happens. This user
  // is discovering it months ahead — that's a significant advantage.
  const percentileAhead = score >= 85 ? 96 : score >= 78 ? 94 : 90;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      className="rounded-2xl p-4"
      style={{
        background: 'linear-gradient(135deg, rgba(220,38,38,0.10), rgba(249,115,22,0.06))',
        border: '1px solid rgba(220,38,38,0.32)',
      }}
    >
      {/* Header row: shield icon + score badge */}
      <div className="flex items-center gap-2.5 mb-3">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.30)' }}
        >
          <ShieldAlert className="w-4 h-4" style={{ color: '#fca5a5' }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="text-[9px] font-black tracking-widest px-2 py-0.5 rounded"
              style={{ background: 'rgba(220,38,38,0.18)', color: '#fca5a5' }}
            >
              HIGH RISK · {score}/100
            </span>
          </div>
          <p className="text-[11px] font-semibold mt-0.5" style={{ color: 'rgba(255,255,255,0.70)' }}>
            Your situation is serious — and you're ahead of {percentileAhead}% of people who face it.
          </p>
        </div>
      </div>

      {/* Statistical grounding paragraph */}
      <div
        className="rounded-xl px-3 py-2.5 mb-3"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.68)' }}>
          Most people discover layoff risk <span style={{ color: 'rgba(255,255,255,0.90)', fontWeight: 600 }}>2 weeks before it happens</span>.
          {' '}You're discovering it months ahead. That gap is your most valuable asset right now.
        </p>
      </div>

      {/* Single action focus */}
      <div className="mb-2">
        <p className="text-[10px] font-bold tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
          THIS WEEK · ONE THING
        </p>
        {topAction ? (
          <div
            className="rounded-xl px-3 py-2.5 flex items-center gap-2.5"
            style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.22)' }}
          >
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(220,38,38,0.20)' }}
            >
              <Zap className="w-3 h-3" style={{ color: '#fca5a5' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-bold leading-tight" style={{ color: 'rgba(255,255,255,0.90)' }}>
                {topAction}
              </p>
              {topActionTime && (
                <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.40)' }}>
                  <Clock className="w-2.5 h-2.5 inline mr-1" />
                  Est. {topActionTime}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div
            className="rounded-xl px-3 py-2.5"
            style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.22)' }}
          >
            <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.65)' }}>
              Start with your top Phase 1 action below. One thing at a time.
            </p>
          </div>
        )}
      </div>

      {/* Escape hatch */}
      <p className="text-[10px] italic" style={{ color: 'rgba(255,255,255,0.30)' }}>
        If this feels overwhelming, start only with the action above. Everything else can wait until next week.
      </p>
    </motion.div>
  );
};

// ── Contingency state renderers ───────────────────────────────────────────────

const ContingencyLoading: React.FC = () => (
  <div className="rounded-2xl p-4 text-center"
    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
    <div className="w-6 h-6 mx-auto mb-2 rounded-full border-2 border-[rgba(0,212,224,0.12)] border-t-[var(--cyan,#00d4e0)] animate-spin" />
    <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.40)' }}>Analyzing your career paths…</p>
  </div>
);

const ContingencyFailed: React.FC = () => (
  <div className="rounded-2xl p-4 text-center"
    style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)' }}>
    <p className="text-[12px] font-semibold mb-1" style={{ color: 'rgba(245,158,11,0.85)' }}>
      Could not compute contingency paths
    </p>
    <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
      An error occurred. Try refreshing or adding more profile data to retry.
    </p>
  </div>
);

const ContingencyUnavailable: React.FC = () => (
  <div className="rounded-2xl p-4 text-center"
    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
    <Shield className="w-8 h-8 mx-auto mb-2" style={{ color: 'rgba(255,255,255,0.20)' }} />
    <p className="text-[12px] font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.55)' }}>
      Contingency plan unavailable
    </p>
    <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
      Add your financial runway and career goal in Profile Setup to unlock personalised paths.
    </p>
  </div>
);

// ── Main Export ───────────────────────────────────────────────────────────────

export const ActionsTab: React.FC<TabProps> = (props) => {
  const { result, companyData } = props;
  const r = result as any;
  // Persist quick-capture completion to localStorage with a 24h TTL so the
  // form doesn't re-appear across tab switches OR new browser tabs within the
  // same day. sessionStorage is tab-scoped; localStorage persists across tabs.
  const QC_KEY = 'hp.quickCapture.done';
  const QC_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
  const [quickCaptureCompleted, setQuickCaptureCompleted] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(QC_KEY);
      if (!raw) return false;
      const { ts } = JSON.parse(raw) as { ts: number };
      return Date.now() - ts < QC_TTL_MS;
    } catch { return false; }
  });
  const markQuickCaptureComplete = () => {
    try { localStorage.setItem(QC_KEY, JSON.stringify({ ts: Date.now() })); } catch { /* swallow */ }
    setQuickCaptureCompleted(true);
  };
  const contingencyPlan: CareerContingencyPlan | undefined = r.careerContingencyPlan;
  const contingencyStatus: string = r.contingencyPlanStatus ?? (contingencyPlan ? 'ready' : 'unavailable');
  const recommendations: ActionPlanItem[] = result.recommendations ?? [];
  const survivalProbability: SurvivalProbabilityResult | undefined = r.survivalProbability;

  // Wave 8.3: equity awareness — show alert when vest cliff is near + risk elevated
  const hasEquityVesting: boolean   = r.userFactors?.hasEquityVesting === true || r.userFactors?.equityVestMonths != null;
  const equityVestMonths: number    = r.userFactors?.equityVestMonths ?? 0;
  const showEquityAlert: boolean    = hasEquityVesting && equityVestMonths > 0 && equityVestMonths < 12 && result.total > 50;
  const equityUrgency: 'CRITICAL' | 'HIGH' = equityVestMonths <= 3 ? 'CRITICAL' : 'HIGH';

  // Wave 5.3 / State-Priority Override A — WARN Act 60-day legal protocol
  // When hasActiveWARN = true, a legal WARN Act notice has been filed.
  // This is verified ground truth — override mode, surface before everything.
  const warnSignal = r.warnSignal as
    | { hasActiveWARN: boolean; daysUntilLayoff: number | null; totalAffectedCount: number; affectedLocations: string[]; warnRiskLabel: string }
    | undefined;
  const showWarnProtocol: boolean = warnSignal?.hasActiveWARN === true;
  const warnDaysLeft: number | null = warnSignal?.daysUntilLayoff ?? null;
  const warnAffected: number = warnSignal?.totalAffectedCount ?? 0;
  const warnLocations: string[] = warnSignal?.affectedLocations ?? [];

  // Wave 5.3 / State-Priority Override B — Short runway escalation
  // When score ≥ 70 AND runway ≤ 3 months, job search duration may exceed runway.
  // Escalate to urgent search positioning immediately.
  const financialRunwayMonths: number = (r.userFinancialRunway?.monthsOfRunway ?? r.userFactors?.financialRunwayMonths ?? 0);
  const showRunwayEscalation: boolean = result.total >= 70 && financialRunwayMonths > 0 && financialRunwayMonths <= 3;

  // Wave 8.1: executive intelligence — only for C-suite / VP / Director / Founder / Staff+
  const userProfile: UserProfile | null = (props as any).userProfile ?? r.userProfile ?? null;
  const { isExecutive } = detectExecutiveTier(
    userProfile?.jobTitle ?? r.userFactors?.jobTitle,
    userProfile?.salaryBand ?? r.userFactors?.salaryBand,
  );
  const executiveIntelligence = useMemo(() => {
    if (!isExecutive) return null;
    try {
      return runExecutiveIntelligence(userProfile, result.total);
    } catch { return null; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExecutive, result.total, userProfile?.jobTitle, userProfile?.salaryBand]);
  const adaptation = useDashboardAdaptation(result, companyData);
  // v39.0 B6: surface honest "generic guidance" notice when the user's role
  // isn't in our 412-specialised database. Also surface the profile context
  // note so the action plan opens with profile-specific framing.
  const personalizedSet = r.personalizedActionSet as
    | { isGenericFallback?: boolean; isDbOverride?: boolean; profileContextNote?: string; roleGroup?: string }
    | undefined;

  // Show quick capture when the user has no personalized data AND hasn't
  // completed it in this session. Detects missing profile via generic fallback.
  const hasNoProfile = !personalizedSet?.profileContextNote && !personalizedSet?.isDbOverride;
  const showQuickCapture = hasNoProfile && !quickCaptureCompleted;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4, 16px)' }}>

      {/* ── STATE PRIORITY OVERRIDES (rendered before everything else) ──────────── */}

      {/* Override A: WARN Act 60-day legal protocol
           Ground-truth signal: a legally-filed WARN notice is confirmed.
           This is the highest-certainty data point in the entire engine.
           Show first, always, in red — this is not a probabilistic risk,
           it is a filed legal document with a countdown. */}
      {showWarnProtocol && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="rounded-2xl p-4"
          style={{
            background: 'linear-gradient(135deg, rgba(220,38,38,0.13), rgba(153,27,27,0.08))',
            border: '2px solid rgba(220,38,38,0.45)',
          }}
        >
          <div className="flex items-start gap-3 mb-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(220,38,38,0.18)', border: '1px solid rgba(220,38,38,0.35)' }}
            >
              <Siren className="w-5 h-5" style={{ color: '#fca5a5' }} />
            </div>
            <div className="flex-1 min-w-0">
              <span
                className="text-[9px] font-black tracking-widest px-2 py-0.5 rounded"
                style={{ background: 'rgba(220,38,38,0.22)', color: '#dc2626' }}
              >
                LEGAL GROUND TRUTH · WARN ACT FILED
              </span>
              <p className="text-[13px] font-bold mt-1 leading-snug" style={{ color: 'rgba(255,255,255,0.92)' }}>
                {warnDaysLeft !== null && warnDaysLeft > 0
                  ? `Confirmed layoff notice — ${warnDaysLeft} days remaining`
                  : 'Active WARN Act filing detected for your company'}
              </p>
            </div>
          </div>

          {/* Key facts row */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            {warnAffected > 0 && (
              <div
                className="rounded-xl px-3 py-2"
                style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.18)' }}
              >
                <p className="text-[9px] font-bold tracking-widest mb-0.5" style={{ color: 'rgba(220,38,38,0.70)' }}>
                  AFFECTED
                </p>
                <p className="text-[13px] font-black" style={{ color: '#fca5a5' }}>
                  {warnAffected.toLocaleString()} employees
                </p>
              </div>
            )}
            {warnDaysLeft !== null && warnDaysLeft > 0 && (
              <div
                className="rounded-xl px-3 py-2"
                style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.18)' }}
              >
                <p className="text-[9px] font-bold tracking-widest mb-0.5" style={{ color: 'rgba(220,38,38,0.70)' }}>
                  COUNTDOWN
                </p>
                <p className="text-[13px] font-black flex items-center gap-1" style={{ color: '#fca5a5' }}>
                  <Timer className="w-3.5 h-3.5 flex-shrink-0" />
                  {warnDaysLeft} days
                </p>
              </div>
            )}
          </div>

          {warnLocations.length > 0 && (
            <p className="text-[10px] mb-2" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Locations: {warnLocations.slice(0, 3).join(', ')}{warnLocations.length > 3 ? ` +${warnLocations.length - 3} more` : ''}
            </p>
          )}

          {/* What this means + what to do */}
          <div
            className="rounded-xl px-3 py-2.5"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <p className="text-[11px] leading-relaxed mb-1" style={{ color: 'rgba(255,255,255,0.72)' }}>
              <span style={{ color: 'rgba(255,255,255,0.90)', fontWeight: 600 }}>This is confirmed legal notice</span>
              {' '}— not a risk signal. Your company is legally required to notify employees at least 60 days before a qualifying layoff.
            </p>
            <p className="text-[11px] leading-relaxed font-semibold" style={{ color: '#fca5a5' }}>
              Act now: Update your résumé today. Activate your network this week. Do not wait for an individual notice.
            </p>
          </div>
        </motion.div>
      )}

      {/* Override B: Short runway escalation
           When financial runway ≤ 3 months AND risk score ≥ 70, the user's
           job search duration window may exceed their savings buffer.
           This is an existential compounding risk — surface it prominently. */}
      {showRunwayEscalation && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut', delay: showWarnProtocol ? 0.05 : 0 }}
          className="rounded-2xl p-4"
          style={{
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.38)',
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(245,158,11,0.15)' }}
            >
              <AlertTriangle className="w-4 h-4" style={{ color: '#fbbf24' }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-[9px] font-black tracking-widest px-2 py-0.5 rounded"
                  style={{ background: 'rgba(245,158,11,0.20)', color: '#f59e0b' }}
                >
                  RUNWAY ALERT
                </span>
              </div>
              <p className="text-[12px] font-bold leading-snug mb-1" style={{ color: 'rgba(255,255,255,0.88)' }}>
                {financialRunwayMonths} month{financialRunwayMonths !== 1 ? 's' : ''} of runway — high-risk job search window
              </p>
              <p className="text-[11px] leading-relaxed mb-2" style={{ color: 'rgba(255,255,255,0.60)' }}>
                At risk score {result.total}/100, comparable roles typically take{' '}
                <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>8–16 weeks</span> to land.
                {' '}Your runway may not cover the full search. Begin positioning <em>now</em>, before financial pressure forces a suboptimal move.
              </p>
              <div
                className="rounded-xl px-2.5 py-2"
                style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.20)' }}
              >
                <p className="text-[10px] font-bold mb-0.5" style={{ color: 'rgba(245,158,11,0.80)' }}>
                  IMMEDIATE PRIORITY
                </p>
                <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  1. Apply to 3 roles this week (don't wait for résumé to be perfect).
                  {' '}2. Message 2 contacts at target companies.
                  {' '}3. Tell your network you're open — privately.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── END STATE PRIORITY OVERRIDES ────────────────────────────────────────── */}

      {/* v40.0: Inline quick profile capture for users without a profile */}
      {showQuickCapture && (
        <ProfileQuickCapture onComplete={() => {
          markQuickCaptureComplete();
          // Notify the dashboard that profile data changed so the parent
          // can trigger a recalculate — without this, personalizedSet
          // stays stale until the user manually re-runs the audit.
          window.dispatchEvent(new CustomEvent('hp.quickCapture.completed'));
        }} />
      )}

      {/* Wave 8.1: Executive Intelligence Panel — only for C-suite / VP / Director / Founder / Staff+ */}
      {executiveIntelligence && executiveIntelligence.isExecutive && (
        <ExecutiveIntelligencePanel intelligence={executiveIntelligence} />
      )}

      {/* Wave 8.3: Equity Alert — highest-priority card when vest cliff is near + score elevated.
           Placed before everything else (including emergency callout) so users with equity at risk
           see it immediately. equityVestMonths < 12 AND score > 50. */}
      {showEquityAlert && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.20 }}
          className="rounded-2xl p-4"
          style={{
            background: equityUrgency === 'CRITICAL' ? 'rgba(220,38,38,0.07)' : 'rgba(249,115,22,0.07)',
            border: `1px solid ${equityUrgency === 'CRITICAL' ? 'rgba(220,38,38,0.28)' : 'rgba(249,115,22,0.28)'}`,
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: equityUrgency === 'CRITICAL' ? 'rgba(220,38,38,0.15)' : 'rgba(249,115,22,0.15)' }}
            >
              <Key className="w-4 h-4" style={{ color: equityUrgency === 'CRITICAL' ? '#dc2626' : '#f97316' }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-[9px] font-black px-2 py-0.5 rounded"
                  style={{
                    background: equityUrgency === 'CRITICAL' ? 'rgba(220,38,38,0.20)' : 'rgba(249,115,22,0.18)',
                    color: equityUrgency === 'CRITICAL' ? '#dc2626' : '#f97316',
                  }}
                >
                  {equityUrgency} · EQUITY ALERT
                </span>
              </div>
              <p className="text-[12px] font-bold leading-snug mb-1" style={{ color: 'rgba(255,255,255,0.88)' }}>
                You have {equityVestMonths} month{equityVestMonths !== 1 ? 's' : ''} of unvested equity
              </p>
              <p className="text-[11px] leading-relaxed mb-2" style={{ color: 'rgba(255,255,255,0.60)' }}>
                With a risk score of {result.total}/100, your unvested equity is your strongest negotiation lever.{' '}
                {equityVestMonths <= 3
                  ? 'Request accelerated vesting or a retention bonus immediately — restructuring announcements remove this leverage.'
                  : 'Open a conversation about retention now — before any restructuring discussion happens.'}
              </p>
              <div
                className="rounded-xl px-3 py-2"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <p className="text-[10px] font-bold mb-0.5" style={{ color: 'rgba(255,255,255,0.50)' }}>
                  NEGOTIATION SCRIPT
                </p>
                <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  "I wanted to discuss my unvested position given the current environment. I'm committed to staying,
                  but I'd like to explore either accelerated vesting or a retention bonus to align our goals for the
                  next {equityVestMonths} months."
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* T1: Emergency Anchor Card — Wave 3.2 empathetic callout (only in emergency mode) */}
      {adaptation.mode === 'emergency' && (
        <EmergencyCallout
          score={result.total}
          topAction={recommendations.find(r => r.priority === 'Critical')?.title ?? recommendations[0]?.title}
          topActionTime={recommendations.find(r => r.priority === 'Critical')?.effortBadge ?? recommendations[0]?.effortBadge}
        />
      )}

      {/* v39.0 B1+B6: profile-aware framing + honest fallback notice */}
      {personalizedSet?.profileContextNote && (
        <div
          className="rounded-2xl p-4"
          style={{
            background: 'rgba(34, 211, 238, 0.06)',
            border: '1px solid rgba(34, 211, 238, 0.20)',
          }}
        >
          <div className="text-[10px] font-mono uppercase tracking-widest mb-1.5" style={{ color: '#22d3ee' }}>
            Tailored to your situation
          </div>
          <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.78)' }}>
            {personalizedSet.profileContextNote}
          </p>
        </div>
      )}
      {personalizedSet?.isGenericFallback && (
        <div
          className="rounded-xl px-3 py-2 flex items-start gap-2"
          style={{
            background: 'rgba(245, 158, 11, 0.07)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
          }}
        >
          <ShieldAlert className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: '#f59e0b' }} />
          <div className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>
            <span style={{ color: '#f59e0b', fontWeight: 600 }}>Generic guidance.</span>{' '}
            Your role is not yet specialised in our database — actions below are drawn from a general
            tech / professional services pool. The recommendations are still calibrated to your seniority
            and score, but role-specific certifications, salary bands, and outreach targets may differ.
          </div>
        </div>
      )}

      {/* Wave 5.2: Recovery Probability Card — "Your Odds" motivational card
           Shows 12-month forced-exit probability without vs. with Phase 1 actions.
           Uses survivalProbability already computed by layoffSurvivalPredictor.
           criticalActionCount drives the copy ("3 critical actions" vs "Phase 1 actions"). */}
      {survivalProbability && (
        <RecoveryProbabilityCard
          survival={survivalProbability}
          criticalActionCount={recommendations.filter(rc => rc.priority === 'Critical').length}
        />
      )}

      {/* T1: Career Contingency Plan — status-aware rendering */}
      {contingencyStatus === 'ready' && contingencyPlan
        ? <CareerContingencyPanel contingencyPlan={contingencyPlan} />
        : contingencyStatus === 'loading'
          ? <ContingencyLoading />
          : contingencyStatus === 'failed'
            ? <ContingencyFailed />
            : <ContingencyUnavailable />
      }

      {/* Wave 4.1: Phase Progress System — 3-phase unlock with localStorage persistence */}
      {recommendations.length > 0 && (
        <PhaseProgressSystem
          actions={recommendations}
          companyName={companyData?.name}
          currentScore={result.total}
          onActionComplete={(actionId, completedCount) => {
            // Wave 3.4: Fire celebration event on every completion
            // The toast component decides which celebration to show based on count
            window.dispatchEvent(new CustomEvent('hp.action.milestone', {
              detail: { count: completedCount, actionId }
            }));
          }}
        />
      )}

      {/* T3: Full action plan — collapsed
           ActionMatrix is rendered inside ActionPlanTab here, NOT separately above,
           since PhaseProgressSystem already displays all actions with checkboxes.
           Showing ActionMatrix again (same recommendations array) was pure duplication. */}
      <AdaptiveBlock
        title="Complete action plan"
        subtitle="Full ranked list with deadlines, effort estimates, evidence"
        icon={BookOpen}
        tier={3}
        accentColor="#22d3ee"
        defaultOpen={false}
      >
        <ActionPlanTab {...props} />
      </AdaptiveBlock>

      {/* T3: Strategic plan & negotiation — collapsed */}
      <AdaptiveBlock
        title="Strategic plan & negotiation"
        subtitle="Exit timing, offer evaluation, negotiation intelligence, phase roadmap"
        icon={Activity}
        tier={3}
        accentColor="#f59e0b"
        defaultOpen={false}
      >
        <StrategyTab {...props} />
      </AdaptiveBlock>

    </div>
  );
};

export default ActionsTab;
