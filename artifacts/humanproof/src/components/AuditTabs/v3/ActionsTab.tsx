// v3/ActionsTab.tsx — Action Plan tab.
//
// Layout (priority order):
//   0. Layoff notice (only when officially announced)
//   1. Low savings warning (only when score is high + savings are low)
//   2. Stock vesting alert (only when relevant)
//   3. Emergency Anchor Card (only in emergency mode)
//   4. Recommended Plan
//   5. Phase Progress System — 3-phase action unlock with checkboxes
//   6. More Options (collapsed) — full plan, negotiation help, job offer help

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { riskLabel } from '../../../lib/riskTokens';
import {
  ListChecks, Zap, Clock, TrendingDown, AlertTriangle, ShieldAlert,
  Activity, Key, Siren, Timer,
} from 'lucide-react';
import { ProfileQuickCapture } from '../../ProfileQuickCapture';
import { CareerTwinCard } from '../../CareerTwinCard';
import type { TabProps } from '../common/types';
import type { ActionPlanItem } from '../../../types/hybridResult';
import { StrategySpineCard } from '../common/StrategySpineCard';
import type { StrategySynthesisResult } from '../../../services/strategySynthesisEngine';
import AdaptiveBlock from '../common/AdaptiveBlock';
import StrategyTab from '../StrategyTab';
import TierBadge from '../common/TierBadge';
import { useDashboardAdaptation } from '../../../hooks/useDashboardAdaptation';
import { isActionableRecommendation } from '../../../services/orchestration/signalOrchestrator';
import { PhaseProgressSystem } from '../common/PhaseProgressSystem';
import { ExecutiveIntelligencePanel } from '../common/ExecutiveIntelligencePanel';
import {
  runExecutiveIntelligence,
  detectExecutiveTier,
} from '../../../services/executiveIntelligenceEngine';
import type { UserProfile } from '../../../services/userProfileService';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { BehavioralIntelligencePanel } from '../common/BehavioralIntelligencePanel';
import { NegotiationIntelligencePanel } from '../common/NegotiationIntelligencePanel';
import EmergencyProtocolPanel from '../common/EmergencyProtocolPanel';
import JobTargetPanel from '../common/JobTargetPanel';

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
      style={{ background: 'var(--alpha-bg-04)', border: '1px solid var(--alpha-bg-08)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ListChecks className="w-4 h-4" style={{ color: 'rgba(0,212,224,0.7)' }} />
          <p className="text-[10px] font-bold tracking-widest" style={{ color: 'var(--alpha-text-45)' }}>
            ACTION PRIORITY MATRIX
          </p>
          <TierBadge tier={1} />
        </div>
        {criticalCount > 0 && (
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
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
                    <p className="text-[12px] font-semibold leading-tight" style={{ color: 'var(--alpha-text-85)' }}>
                      {item.title}
                    </p>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: config.color + '20', color: config.color }}>
                      {item.priority}
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed" style={{ color: 'var(--alpha-text-55)' }}>
                    {item.description}
                  </p>
                  <div className="flex items-center flex-wrap gap-2 mt-1.5">
                    {/* Sequence phase label */}
                    {item.sequencePhase && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: 'var(--alpha-bg-06)', color: 'var(--alpha-text-35)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>
                        {{ day1: 'Day 1', week1: 'Week 1', month1: 'Month 1', quarter1: 'Quarter 1' }[item.sequencePhase]}
                      </span>
                    )}
                    {item.deadline && (
                      <span className="text-[10px]" style={{ color: 'var(--alpha-text-35)' }}>
                        <Clock className="w-2.5 h-2.5 inline mr-1" />
                        {item.deadline}
                      </span>
                    )}
                    {/* Effort badge */}
                    {item.effortBadge && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
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
                    <p className="text-[10px] italic mt-1" style={{ color: 'var(--alpha-text-35)' }}>
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
              className="text-[10px] font-black tracking-widest px-2 py-0.5 rounded"
              style={{ background: 'rgba(220,38,38,0.18)', color: '#fca5a5' }}
            >
              {riskLabel(score)} RISK · {score}/100
            </span>
          </div>
          <p className="text-[11px] font-semibold mt-0.5" style={{ color: 'var(--alpha-text-70)' }}>
            {score >= 55
              ? `Your situation is serious — and you're ahead of ${percentileAhead}% of people who face it.`
              : `A critical company signal warrants acting now — and you're ahead of ${percentileAhead}% who catch it this early.`}
          </p>
        </div>
      </div>

      {/* Statistical grounding paragraph */}
      <div
        className="rounded-xl px-3 py-2.5 mb-3"
        style={{ background: 'var(--alpha-bg-04)', border: '1px solid var(--alpha-bg-08)' }}
      >
        <p className="text-[11px] leading-relaxed" style={{ color: 'var(--alpha-text-70)' }}>
          Most people discover layoff risk <span style={{ color: 'var(--alpha-text-92)', fontWeight: 600 }}>2 weeks before it happens</span>.
          {' '}You're discovering it months ahead. That gap is your most valuable asset right now.
        </p>
      </div>

      {/* Single action focus */}
      <div className="mb-2">
        <p className="text-[10px] font-bold tracking-widest mb-2" style={{ color: 'var(--alpha-text-35)' }}>
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
              <p className="text-[12px] font-bold leading-tight" style={{ color: 'var(--alpha-text-92)' }}>
                {topAction}
              </p>
              {topActionTime && (
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--alpha-text-35)' }}>
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
            <p className="text-[11px]" style={{ color: 'var(--alpha-text-70)' }}>
              Start with your top Phase 1 action below. One thing at a time.
            </p>
          </div>
        )}
      </div>

      {/* Escape hatch */}
      <p className="text-[10px] italic" style={{ color: 'var(--alpha-text-30)' }}>
        If this feels overwhelming, start only with the action above. Everything else can wait until next week.
      </p>
    </motion.div>
  );
};

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
  const score = result.total;
  const strategySynthesis: StrategySynthesisResult | undefined = r.strategySynthesis;
  // System/meta transparency notices (e.g. "System Override Applied") carry
  // priority 'Critical' but are not user actions — filter them out here so
  // they can never become the top action or an action-roadmap card. Mirrors
  // the same filter already applied in SummaryTab.tsx for result.recommendations.
  const recommendations: ActionPlanItem[] = (result.recommendations ?? []).filter(isActionableRecommendation);

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
                className="text-[10px] font-black tracking-widest px-2 py-0.5 rounded"
                style={{ background: 'rgba(220,38,38,0.22)', color: '#dc2626' }}
              >
                IMPORTANT UPDATE
              </span>
              <p className="text-[13px] font-bold mt-1 leading-snug" style={{ color: 'var(--alpha-text-92)' }}>
                {warnDaysLeft !== null && warnDaysLeft > 0
                  ? `Layoffs are officially planned — ${warnDaysLeft} days notice remaining`
                  : 'Your company has officially announced layoffs'}
              </p>
            </div>
          </div>

          {/* Key facts row — stacks to 1-col on mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
            {warnAffected > 0 && (
              <div
                className="rounded-xl px-3 py-2"
                style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.18)' }}
              >
                <p className="text-[10px] font-bold tracking-widest mb-0.5" style={{ color: 'rgba(220,38,38,0.70)' }}>
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
                <p className="text-[10px] font-bold tracking-widest mb-0.5" style={{ color: 'rgba(220,38,38,0.70)' }}>
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
            <p className="text-[10px] mb-2" style={{ color: 'var(--alpha-text-45)' }}>
              Locations: {warnLocations.slice(0, 3).join(', ')}{warnLocations.length > 3 ? ` +${warnLocations.length - 3} more` : ''}
            </p>
          )}

          {/* What this means + what to do */}
          <div
            className="rounded-xl px-3 py-2.5"
            style={{ background: 'var(--alpha-bg-04)', border: '1px solid var(--alpha-bg-08)' }}
          >
            <p className="text-[11px] leading-relaxed mb-1" style={{ color: 'var(--alpha-text-70)' }}>
              <span style={{ color: 'var(--alpha-text-92)', fontWeight: 600 }}>This is official, not a guess.</span>
              {' '}Companies must tell employees at least 60 days before layoffs happen.
            </p>
            <p className="text-[11px] leading-relaxed font-semibold" style={{ color: '#fca5a5' }}>
              What to do now: Update your résumé today. Reach out to your contacts this week. Don't wait for your own notice.
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
                  className="text-[10px] font-black tracking-widest px-2 py-0.5 rounded"
                  style={{ background: 'rgba(245,158,11,0.20)', color: '#f59e0b' }}
                >
                  THINGS TO WATCH
                </span>
              </div>
              <p className="text-[12px] font-bold leading-snug mb-1" style={{ color: 'var(--alpha-text-85)' }}>
                You have {financialRunwayMonths} month{financialRunwayMonths !== 1 ? 's' : ''} of savings — a job search could take longer than that
              </p>
              <p className="text-[11px] leading-relaxed mb-2" style={{ color: 'var(--alpha-text-55)' }}>
                People in similar situations usually take{' '}
                <span style={{ color: 'var(--alpha-text-85)', fontWeight: 600 }}>8–16 weeks</span> to find a new job.
                {' '}Your savings may run out before then. Start looking <em>now</em>, before money pressure forces a rushed decision.
              </p>
              <div
                className="rounded-xl px-2.5 py-2"
                style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.20)' }}
              >
                <p className="text-[10px] font-bold mb-0.5" style={{ color: 'rgba(245,158,11,0.80)' }}>
                  WHAT TO DO NOW
                </p>
                <p className="text-[10px] leading-relaxed" style={{ color: 'var(--alpha-text-55)' }}>
                  1. Apply to 3 jobs this week (your résumé doesn't need to be perfect).
                  {' '}2. Message 2 people at companies you'd like to work for.
                  {' '}3. Quietly let your contacts know you're looking.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── END STATE PRIORITY OVERRIDES ────────────────────────────────────────── */}

      {/* Recommended plan — one voice that states what to do, what's working
          against you, and what's working for you. */}
      <StrategySpineCard strategy={strategySynthesis} />

      {/* T1: Emergency Anchor Card — directly after strategy spine for crisis users */}
      {adaptation.mode === 'emergency' && (
        <EmergencyCallout
          score={result.total}
          topAction={recommendations.find(r => r.priority === 'Critical')?.title ?? recommendations[0]?.title}
          topActionTime={recommendations.find(r => r.priority === 'Critical')?.effortBadge ?? recommendations[0]?.effortBadge}
        />
      )}

      {/* Emergency Protocol Panel — 72-hour crisis checklist (only in emergency mode) */}
      {adaptation.mode === 'emergency' && r.emergencyResponse && (
        <ScrollReveal>
          <EmergencyProtocolPanel emergency={r.emergencyResponse} />
        </ScrollReveal>
      )}

      {/* Equity Alert (P2 — important but below primary action flow) */}
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
                  className="text-[10px] font-black px-2 py-0.5 rounded"
                  style={{
                    background: equityUrgency === 'CRITICAL' ? 'rgba(220,38,38,0.20)' : 'rgba(249,115,22,0.18)',
                    color: equityUrgency === 'CRITICAL' ? '#dc2626' : '#f97316',
                  }}
                >
                  STOCK ALERT
                </span>
              </div>
              <p className="text-[12px] font-bold leading-snug mb-1" style={{ color: 'var(--alpha-text-85)' }}>
                You have {equityVestMonths} month{equityVestMonths !== 1 ? 's' : ''} left before your stock fully vests
              </p>
              <p className="text-[11px] leading-relaxed mb-2" style={{ color: 'var(--alpha-text-55)' }}>
                Your unvested stock is one of your best bargaining chips right now.{' '}
                {equityVestMonths <= 3
                  ? 'Ask for faster vesting or a bonus to stay — do this before any layoff announcement.'
                  : 'Bring up staying and your stock now — before any layoff announcement.'}
              </p>
              <div
                className="rounded-xl px-3 py-2"
                style={{ background: 'var(--alpha-bg-04)', border: '1px solid var(--alpha-bg-08)' }}
              >
                <p className="text-[10px] font-bold mb-0.5" style={{ color: 'var(--alpha-text-50)' }}>
                  WHAT TO SAY
                </p>
                <p className="text-[10px] leading-relaxed" style={{ color: 'var(--alpha-text-45)' }}>
                  "I wanted to talk about my stock given everything going on. I'm committed to staying,
                  but I'd like to explore faster vesting or a bonus to keep us both on the same page for the
                  next {equityVestMonths} months."
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Phase Progress System — 3-phase unlock with localStorage persistence */}
      {recommendations.length > 0 && (
        <PhaseProgressSystem
          actions={recommendations}
          companyName={companyData?.name}
          currentScore={result.total}
          onActionComplete={(actionId, completedCount) => {
            window.dispatchEvent(new CustomEvent('hp.action.milestone', {
              detail: { count: completedCount, actionId }
            }));
          }}
        />
      )}

      {/* Executive Intelligence Panel (P2) */}
      {executiveIntelligence && executiveIntelligence.isExecutive && (
        <ScrollReveal><ExecutiveIntelligencePanel intelligence={executiveIntelligence} /></ScrollReveal>
      )}

      {/* Behavioral Intelligence Panel — interview prep, negotiation, transitions */}
      {r.behavioralPersonalization && (
        <ScrollReveal>
          <BehavioralIntelligencePanel data={r.behavioralPersonalization} />
        </ScrollReveal>
      )}

      {/* Negotiation Intelligence Panel — leverage rating, email scripts, clauses */}
      {r.negotiationIntelligence && (
        <ScrollReveal>
          <NegotiationIntelligencePanel negotiation={r.negotiationIntelligence} />
        </ScrollReveal>
      )}

      {/* Job Target Panel — specific company targets from jobTargetingEngine */}
      {r.jobTargeting && (
        <ScrollReveal>
          <JobTargetPanel targeting={r.jobTargeting} />
        </ScrollReveal>
      )}

      {/* Profile context note (P2) */}
      {personalizedSet?.profileContextNote && (
        <ScrollReveal>
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
            <p className="text-[12px] leading-relaxed" style={{ color: 'var(--alpha-text-78)' }}>
              {personalizedSet.profileContextNote}
            </p>
          </div>
        </ScrollReveal>
      )}
      {personalizedSet?.isGenericFallback && (
        <ScrollReveal>
          <div
            className="rounded-xl px-3 py-2 flex items-start gap-2"
            style={{
              background: 'rgba(245, 158, 11, 0.07)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
            }}
          >
            <ShieldAlert className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: '#f59e0b' }} />
            <div className="text-[11px] leading-relaxed" style={{ color: 'var(--alpha-text-78)' }}>
              <span style={{ color: '#f59e0b', fontWeight: 600 }}>General advice.</span>{' '}
              We don't have specific info for your exact role yet, so the actions below are general advice
              for tech and professional roles. They're still matched to your experience level and risk score,
              but specific certifications, pay, and companies to target may differ for your role.
            </div>
          </div>
        </ScrollReveal>
      )}

      {/* Inline quick profile capture (P2 — after primary action flow) */}
      {showQuickCapture && (
        <ScrollReveal>
          <ProfileQuickCapture onComplete={() => {
            markQuickCaptureComplete();
            window.dispatchEvent(new CustomEvent('hp.quickCapture.completed'));
          }} />
        </ScrollReveal>
      )}

      {/* PhaseProgressSystem above covers all actions — ActionPlanTab removed (exact duplicate) */}

      {/* More options — collapsed */}
      <ScrollReveal>
        <AdaptiveBlock
          title="More Options"
          subtitle="When to leave, job offer help, what to say, and your full plan"
          icon={Activity}
          tier={3}
          accentColor="#f59e0b"
          defaultOpen={false}
        >
          <div className="flex flex-col gap-4">
            <CareerTwinCard
              userRole={result.workTypeKey}
              userExperience={result.tenureYears ?? 5}
              userRiskScore={result.total}
              userCountry={result.countryKey ?? 'global'}
              topN={3}
            />
            <StrategyTab {...props} />
          </div>
        </AdaptiveBlock>
      </ScrollReveal>

    </div>
  );
};

export default ActionsTab;
