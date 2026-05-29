// v3/ActionsTab.tsx — v35.0
//
// ACTION PLAN tab (4th tab in v34 IA). Where decision-driven users land
// directly in Emergency Mode.
//
// Layout:
//   1. Emergency callout (T1, only in emergency mode)
//   2. Career Contingency Plan (T1)  — STAY / NEGOTIATE / TRANSITION decision paths
//   3. Priority Action Matrix (T1)   — ranked by priority, top 5 visible
//   4. Complete action plan (T3)     — full list, collapsed
//   5. Strategic plan & negotiation (T3) — deep planning, collapsed

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ListChecks, Zap, Clock, TrendingDown, Shield, AlertTriangle, ShieldAlert,
  BookOpen, Activity, Key,
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

// ── Emergency callout — only shown in Emergency Mode ─────────────────────────

const EmergencyCallout: React.FC<{ score: number }> = ({ score }) => (
  <motion.div
    initial={{ opacity: 0, y: -6 }}
    animate={{ opacity: 1, y: 0 }}
    className="rounded-2xl p-4 flex items-start gap-3"
    style={{
      background: 'linear-gradient(135deg, rgba(220,38,38,0.18), rgba(220,38,38,0.08))',
      border: '1px solid rgba(220,38,38,0.40)',
    }}
  >
    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
      style={{ background: 'rgba(220,38,38,0.20)', border: '1px solid rgba(220,38,38,0.40)' }}>
      <ShieldAlert className="w-4 h-4" style={{ color: '#fca5a5' }} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[10px] font-black tracking-[0.18em] mb-0.5" style={{ color: '#fca5a5' }}>
        EMERGENCY MODE · SCORE {score}
      </p>
      <p className="text-[12px] font-bold leading-snug" style={{ color: 'rgba(255,255,255,0.92)' }}>
        This week: secure 3-month emergency runway, message 2 warm contacts, refresh resume.
      </p>
    </div>
  </motion.div>
);

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

      {/* T1: Emergency callout — only in emergency mode */}
      {adaptation.mode === 'emergency' && <EmergencyCallout score={result.total} />}

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
            // Micro-toast celebration for action completion
            if (completedCount % 3 === 0) {
              window.dispatchEvent(new CustomEvent('hp.action.milestone', {
                detail: { count: completedCount }
              }));
            }
          }}
        />
      )}

      {/* T1: Action Priority Matrix */}
      {recommendations.length > 0 && <ActionMatrix items={recommendations} />}

      {/* T3: Full action plan — collapsed */}
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
