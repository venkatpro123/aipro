// v3/TakeActionTab.tsx — V4 UX redesign
//
// TAB 2 of 3: "Take Action"
//
// Decision-driven IA: answers "What is my full plan?"
//   T1: ContingencyPlan (STAY / NEGOTIATE / TRANSITION) + EmergencyProtocol when active
//   T2: PriorityActionMatrix (top 5) + FinancialRunway when urgent + inline ProfileCapture
//   T3: Complete plan (all actions) + Negotiation scripts + Strategy  [lazy-loaded]
//
// Emergency mode: EmergencyProtocol renders FIRST, Critical/High actions only,
//                 ProfileQuickCapture suppressed.
//
// Design decisions:
//   - Does NOT call useDashboardAdaptationV4 — uses emergencyMode prop from parent.
//     The parent (LayoffAuditDashboardV4) already computes adaptation and passes
//     emergencyMode={true} when mode === 'emergency'. Calling it again here would
//     re-run compressAllSignals in the same render tree unnecessarily.
//   - ActionPlanTab + StrategyTab are lazy-loaded so their large module graphs
//     (useHumanProof, useAdaptiveSystem, 30+ imports each) do not block this tab's
//     initial render.

import React, { Suspense, lazy, useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ListChecks, Zap, Clock, TrendingDown, Shield, AlertTriangle, ShieldAlert,
  BookOpen, Activity, DollarSign, AlertCircle, Timer, CalendarDays, Target,
} from 'lucide-react';
import type { VisaRiskResult } from '../../../services/visaRiskEngine';
import {
  getMarketBatchStatus,
  type MarketBatchStatus,
} from '../../../services/marketBatchStatusService';
import { ProfileQuickCapture } from '../../ProfileQuickCapture';
import type { TabProps } from '../common/types';
import type { CareerContingencyPlan } from '../../../services/careerContingencyPlanEngine';
import type { ActionPlanItem } from '../../../types/hybridResult';
import CareerContingencyPanel from '../common/CareerContingencyPanel';
import EmergencyModeBanner from '../common/EmergencyModeBanner';
import EmergencyProtocolPanel from '../common/EmergencyProtocolPanel';
import AdaptiveBlock from '../common/AdaptiveBlock';
import TierBadge from '../common/TierBadge';
import { NegotiationIntelligencePanel } from '../common/NegotiationIntelligencePanel';
import UserFinancialRunwayPanel from '../common/UserFinancialRunwayPanel';
import MonthlyActionPlan from '../common/MonthlyActionPlan';
import JobTargetPanel from '../common/JobTargetPanel';
import Precision9090Panel from '../common/Precision9090Panel';
import BehavioralInsightPanel from '../common/BehavioralInsightPanel';

// Lazy-load the heavy T3 components — each has 30+ imports including context
// hooks. If either fails to load, only its collapsed section is affected; the
// T1/T2 content above the fold renders normally.
const ActionPlanTab = lazy(() =>
  import('../ActionPlanTab').then(m => ({ default: m.ActionPlanTab ?? m.default }))
);
const StrategyTab = lazy(() => import('../StrategyTab'));

// ── Tab section loader ─────────────────────────────────────────────────────────

const SectionLoader: React.FC = () => (
  <div className="flex items-center justify-center py-8">
    <div className="w-5 h-5 rounded-full border-2 border-[rgba(0,212,224,0.12)] border-t-[var(--cyan,#00d4e0)] animate-spin" />
  </div>
);

// ── Priority config ───────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<string, { color: string; bg: string; icon: React.ElementType }> = {
  Critical: { color: '#dc2626', bg: 'rgba(220,38,38,0.12)', icon: AlertTriangle },
  High:     { color: '#f97316', bg: 'rgba(249,115,22,0.10)', icon: Zap },
  Medium:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', icon: Clock },
  Low:      { color: '#10b981', bg: 'rgba(16,185,129,0.08)', icon: TrendingDown },
};

// ── Action Matrix ─────────────────────────────────────────────────────────────

const ActionMatrix: React.FC<{
  items: ActionPlanItem[];
  emergencyMode?: boolean;
  phaseLabels?: Record<string, string>;
}> = ({ items, emergencyMode, phaseLabels }) => {
  const [showAll, setShowAll] = useState(false);

  const prioritised = useMemo(() => {
    const order: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
    const sorted = [...items].sort((a, b) => (order[a.priority] ?? 4) - (order[b.priority] ?? 4));
    if (emergencyMode && !showAll) {
      const urgent = sorted.filter(i => i.priority === 'Critical' || i.priority === 'High');
      return urgent.length > 0 ? urgent : sorted;
    }
    return sorted;
  }, [items, emergencyMode, showAll]);

  const visible = (showAll || emergencyMode) ? prioritised : prioritised.slice(0, 5);
  const criticalCount = items.filter(i => i.priority === 'Critical').length;
  const hiddenMediumLow = (emergencyMode && !showAll)
    ? items.filter(i => i.priority === 'Medium' || i.priority === 'Low').length
    : 0;

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
              key={item.id ?? idx}
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
                    {item.sequencePhase && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.40)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>
                        {(phaseLabels ?? { day1: 'Day 1', week1: 'Week 1', month1: 'Month 1', quarter1: 'Quarter 1' } as Record<string, string>)[item.sequencePhase] ?? item.sequencePhase}
                      </span>
                    )}
                    {item.deadline && (
                      <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        <Clock className="w-2.5 h-2.5 inline mr-1" />{item.deadline}
                      </span>
                    )}
                    {item.effortBadge && (
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                        style={{ background: 'rgba(0,212,224,0.10)', color: 'rgba(0,212,224,0.65)', border: '1px solid rgba(0,212,224,0.20)' }}>
                        {item.effortBadge}
                      </span>
                    )}
                    {(item.riskReductionPct ?? 0) > 0 && (
                      <span className="text-[10px]" style={{ color: '#10b98180' }}>
                        <TrendingDown className="w-2.5 h-2.5 inline mr-1" />−{item.riskReductionPct}% risk
                      </span>
                    )}
                  </div>
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

      {(hiddenMediumLow > 0 || (!emergencyMode && items.length > 5)) && (
        <button
          type="button"
          onClick={() => setShowAll(s => !s)}
          className="w-full mt-3 py-2 text-[11px] font-semibold rounded-xl transition-colors"
          style={{ color: 'rgba(0,212,224,0.85)', background: 'rgba(0,212,224,0.06)', border: '1px solid rgba(0,212,224,0.15)' }}
        >
          {showAll
            ? 'Show fewer actions'
            : hiddenMediumLow > 0
              ? `Show ${hiddenMediumLow} medium/low priority actions`
              : `Show all ${items.length} actions`}
        </button>
      )}
    </div>
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
    <p className="text-[12px] font-semibold mb-1" style={{ color: 'rgba(245,158,11,0.85)' }}>Could not compute contingency paths</p>
    <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
      Try refreshing or adding more profile data to retry.
    </p>
  </div>
);

const ContingencyUnavailable: React.FC = () => (
  <div className="rounded-2xl p-4 text-center"
    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
    <Shield className="w-8 h-8 mx-auto mb-2" style={{ color: 'rgba(255,255,255,0.20)' }} />
    <p className="text-[12px] font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.55)' }}>Contingency plan unavailable</p>
    <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
      Add your financial runway and career goal in Profile to unlock personalised paths.
    </p>
  </div>
);

// ── Market data freshness notice ──────────────────────────────────────────────
//
// Shown when the regional batch covering the user's company region has not had
// a successful scrape in >14 days. This is distinct from the per-skill
// SkillFreshnessLabel badge — it covers the entire Action Plan tab's market
// intelligence layer (job counts, hiring trends, transition difficulty signals).
//
// Text format: "Market data for {region} {roleTitle}: last updated {N} days ago.
//               Opening counts may not reflect current demand."
//
// Design: amber notice, non-intrusive. Positioned below T1 (emergency/contingency)
// so it never displaces critical actions. Hidden for users with fresh data.

interface FreshnessNoticeProps {
  batchStatus: MarketBatchStatus;
  roleTitle:   string;
}

const MarketDataFreshnessNotice: React.FC<FreshnessNoticeProps> = ({ batchStatus, roleTitle }) => {
  const { ageInDays, regionLabel, sourcesBlocked } = batchStatus;
  if (!batchStatus.isStale || ageInDays === null) return null;

  const blockedNote = sourcesBlocked.length > 0
    ? ` (${sourcesBlocked.join(', ')} blocked by anti-bot protection)`
    : '';

  return (
    <div
      className="rounded-xl px-4 py-3 flex gap-3 items-start"
      style={{
        background:  'rgba(245,158,11,0.07)',
        border:      '1px solid rgba(245,158,11,0.25)',
      }}
      role="status"
      aria-live="polite"
    >
      <AlertCircle
        className="w-4 h-4 mt-0.5 shrink-0"
        style={{ color: 'rgba(245,158,11,0.85)' }}
      />
      <div>
        <p className="text-[11px] font-semibold mb-0.5" style={{ color: 'rgba(245,158,11,0.90)' }}>
          Market data may be outdated
        </p>
        <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.50)' }}>
          Market data for {regionLabel} {roleTitle}: last updated {ageInDays} days ago{blockedNote}.
          Opening counts and hiring trend signals may not reflect current demand.
          Data refreshes automatically every Monday 06:00 UTC.
        </p>
      </div>
    </div>
  );
};

// ── Main Export ───────────────────────────────────────────────────────────────

export const TakeActionTab: React.FC<TabProps> = (props) => {
  const { result, companyData, emergencyMode } = props;
  const r = result as any;

  // Emergency state from parent prop only — no redundant hook call
  const isEmergency = !!emergencyMode;

  // ── Market data freshness — async, non-blocking ───────────────────────────
  // Fetches batch status for the user's region. 60-minute cache means only
  // ~7 DB queries/hour regardless of user volume. Never blocks tab render.
  const [batchStatus, setBatchStatus] = useState<MarketBatchStatus | null>(null);
  useEffect(() => {
    const regionCode = (companyData as any)?.region ?? null;
    if (!regionCode) return;
    let cancelled = false;
    getMarketBatchStatus(regionCode).then(s => {
      if (!cancelled) setBatchStatus(s);
    });
    return () => { cancelled = true; };
  }, [(companyData as any)?.region]);

  const QC_KEY = 'hp.quickCapture.done';
  const QC_TTL_MS = 24 * 60 * 60 * 1000;
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
  const recommendations: ActionPlanItem[] = Array.isArray(result.recommendations) ? result.recommendations : [];

  const personalizedSet = r.personalizedActionSet as
    | { isGenericFallback?: boolean; isDbOverride?: boolean; profileContextNote?: string; roleGroup?: string }
    | undefined;

  const hasNoProfile = !personalizedSet?.profileContextNote && !personalizedSet?.isDbOverride;
  const showQuickCapture = hasNoProfile && !quickCaptureCompleted && !isEmergency;

  const financialRunway = r.financialRunway;
  const runwayUrgent = financialRunway?.monthsCovered != null && financialRunway.monthsCovered < 6;

  // Grace-period-aware phase label compression
  const visaRisk = r.visaRisk as VisaRiskResult | null | undefined;
  const _graceIsHigh =
    visaRisk != null &&
    (visaRisk.overallVisaRisk === 'HIGH' || visaRisk.overallVisaRisk === 'CRITICAL') &&
    visaRisk.gracePeriodDays < 30;
  const _graceTier = _graceIsHigh
    ? (visaRisk!.gracePeriodDays <= 10 ? 'critical' : 'compressed')
    : null;
  const gracePhaseLabels: Record<string, string> | undefined = _graceTier === 'critical'
    ? { day1: '0–6 hours', week1: 'first 2 days', month1: 'first 7 days', quarter1: 'first 7 days' }
    : _graceTier === 'compressed'
      ? { day1: '0–24 hours', week1: 'first 3 days', month1: 'first 10 days', quarter1: 'first 10 days' }
      : undefined;
  const VISA_TYPE_LABEL: Partial<Record<string, string>> = {
    h1b: 'H-1B', l1: 'L-1', opt_stem: 'OPT/STEM', tn: 'TN',
    uk_skilled_worker: 'UK Skilled Worker visa', eu_blue_card: 'EU Blue Card',
    eu_blue_card_germany: 'EU Blue Card (Germany)',
    australia_482_tss: 'Australia 482 TSS visa',
    singapore_ep: 'Singapore Employment Pass',
    singapore_s_pass: 'Singapore S Pass',
    canada_lmia_permit: 'Canada LMIA permit',
    philippines_9g_aep: 'Philippines 9G/AEP',
    japan_work_visa: 'Japan work visa',
    uae_employment_visa: 'UAE employment visa',
    saudi_iqama: 'Saudi Iqama', qatar_work_permit: 'Qatar work permit',
    kuwait_work_permit: 'Kuwait work permit', gcc_sponsored: 'GCC sponsored permit',
    other_work_auth: 'work authorization',
  };
  const visaLabel = visaRisk ? (VISA_TYPE_LABEL[visaRisk.visaType] ?? 'your work visa') : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4, 16px)' }}>

      {/* T1: Emergency mode banner */}
      {isEmergency && (
        <EmergencyModeBanner result={result} onJumpToActions={() => { /* already on this tab */ }} />
      )}

      {/* T1: Emergency protocol — shown FIRST when active */}
      {isEmergency && r.emergencyResponse && (
        <EmergencyProtocolPanel emergency={r.emergencyResponse} />
      )}

      {/* Equity dilemma alert: elevated risk + imminent vest creates a conflicting situation.
          Show BEFORE the contingency paths so the user understands the conflict before
          reading the STAY/NEGOTIATE/TRANSITION path detail. */}
      {contingencyPlan?.equityDilemmaAlert?.isActive && (() => {
        const alert = contingencyPlan.equityDilemmaAlert!;
        const unvestedLabel = alert.unvestedValue != null && alert.unvestedValue > 0
          ? (alert.unvestedValue >= 1_000
              ? `~$${Math.round(alert.unvestedValue / 1_000)}K`
              : `~$${Math.round(alert.unvestedValue)}`)
          : null;
        return (
          <div
            className="rounded-xl px-4 py-3.5 flex gap-3 items-start"
            style={{ background: 'rgba(245,158,11,0.09)', border: '1px solid rgba(245,158,11,0.35)' }}
            role="alert"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#f59e0b' }} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="text-[11px] font-semibold" style={{ color: '#fbbf24' }}>
                  Equity Dilemma
                </span>
                <span
                  className="text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded"
                  style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.30)' }}
                >
                  {alert.dayCountdown} DAYS TO VEST
                </span>
                {unvestedLabel && (
                  <span
                    className="text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded"
                    style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.28)' }}
                  >
                    {unvestedLabel} AT STAKE
                  </span>
                )}
              </div>
              <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>
                {alert.alertText}
              </p>
            </div>
          </div>
        );
      })()}

      {/* T1: Career Contingency Plan */}
      {contingencyStatus === 'ready' && contingencyPlan
        ? <CareerContingencyPanel contingencyPlan={contingencyPlan} />
        : contingencyStatus === 'loading'
          ? <ContingencyLoading />
          : contingencyStatus === 'failed'
            ? <ContingencyFailed />
            : <ContingencyUnavailable />
      }

      {/* Market data freshness notice — amber when regional batch is >14d stale */}
      {batchStatus?.isStale && (
        <MarketDataFreshnessNotice
          batchStatus={batchStatus}
          roleTitle={r.resolvedPattern ?? r.roleTitle ?? 'your role'}
        />
      )}

      {/* Profile context + generic fallback notice */}
      {personalizedSet?.profileContextNote && (
        <div className="rounded-2xl p-4"
          style={{ background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.20)' }}>
          <div className="text-[10px] font-mono uppercase tracking-widest mb-1.5" style={{ color: '#22d3ee' }}>
            Tailored to your situation
          </div>
          <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.78)' }}>
            {personalizedSet.profileContextNote}
          </p>
        </div>
      )}
      {personalizedSet?.isGenericFallback && (
        <div className="rounded-xl px-3 py-2 flex items-start gap-2"
          style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.25)' }}>
          <ShieldAlert className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: '#f59e0b' }} />
          <div className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>
            <span style={{ color: '#f59e0b', fontWeight: 600 }}>Generic guidance.</span>{' '}
            Your role is not yet specialised in our database — actions are drawn from a general professional pool.
          </div>
        </div>
      )}

      {/* Grace-period compression banner */}
      {_graceIsHigh && visaRisk && visaLabel && (
        <div
          className="rounded-xl px-4 py-3 flex gap-3 items-start"
          style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.35)' }}
          role="alert"
        >
          <Timer className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#ef4444' }} />
          <div>
            <p className="text-[11px] font-semibold mb-0.5" style={{ color: '#f87171' }}>
              {visaLabel} grace period: {visaRisk.gracePeriodDays} day{visaRisk.gracePeriodDays === 1 ? '' : 's'}
            </p>
            <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
              All timelines below are compressed to fit your actual legal window.
              Standard 30-day and 90-day actions are not applicable — act within the window shown.
            </p>
          </div>
        </div>
      )}

      {/* T2: Action Priority Matrix */}
      {recommendations.length > 0 && (
        <ActionMatrix items={recommendations} emergencyMode={isEmergency} phaseLabels={gracePhaseLabels} />
      )}

      {/* T2: Monthly Action Plan — precision 30/60/90-day roadmap */}
      {r.monthlyActionPlan && (
        <AdaptiveBlock
          title="Monthly action roadmap"
          subtitle="30 / 60 / 90-day precision plan with weekly milestones"
          icon={CalendarDays}
          tier={2}
          accentColor="#00d4e0"
          defaultOpen={true}
        >
          <MonthlyActionPlan plan={r.monthlyActionPlan} />
        </AdaptiveBlock>
      )}

      {/* T2: Precision 30/60/90 plan — AI-ranked 13-week execution with D30/D60/D90 gates */}
      {r.precision9090Plan && (
        <AdaptiveBlock
          title="30/60/90-day execution plan"
          subtitle="Week-by-week milestones, daily focus priorities, and checkpoint gates"
          icon={CalendarDays}
          tier={2}
          accentColor="#60a5fa"
          defaultOpen={false}
        >
          <Precision9090Panel plan={r.precision9090Plan} />
        </AdaptiveBlock>
      )}

      {/* T2: Job targeting intelligence — precision targets + salary intel */}
      {r.jobTargeting && (
        <AdaptiveBlock
          title="Job targeting intelligence"
          subtitle="Best-fit companies, role variants, and compensation benchmarks"
          icon={Target}
          tier={2}
          accentColor="#10b981"
          defaultOpen={false}
        >
          <JobTargetPanel targeting={r.jobTargeting} />
        </AdaptiveBlock>
      )}

      {/* T2: Career behavioral analysis — 7-dimension personalisation engine */}
      {r.behavioralPersonalization && (
        <AdaptiveBlock
          title="Career behavioural analysis"
          subtitle="Employment gaps, trajectory, compensation positioning, interview readiness"
          icon={Activity}
          tier={2}
          accentColor="#a78bfa"
          defaultOpen={false}
        >
          <BehavioralInsightPanel behavioral={r.behavioralPersonalization} />
        </AdaptiveBlock>
      )}

      {/* T2: Financial runway — only when urgent */}
      {runwayUrgent && financialRunway && (
        <AdaptiveBlock
          title="Financial runway — urgent"
          subtitle={`${financialRunway.monthsCovered} months covered — below 6-month buffer`}
          icon={DollarSign}
          tier={2}
          accentColor="#dc2626"
          defaultOpen={true}
        >
          <UserFinancialRunwayPanel userFinancialRunway={financialRunway} />
        </AdaptiveBlock>
      )}

      {/* T2: Inline profile quick-capture (suppressed in emergency) */}
      {showQuickCapture && (
        <ProfileQuickCapture onComplete={() => {
          markQuickCaptureComplete();
          window.dispatchEvent(new CustomEvent('hp.quickCapture.completed'));
        }} />
      )}

      {/* T3: Complete action plan — lazy-loaded, collapsed */}
      <AdaptiveBlock
        title="Complete action plan"
        subtitle="Full ranked list with deadlines, effort estimates, evidence"
        icon={BookOpen}
        tier={3}
        accentColor="#22d3ee"
        defaultOpen={false}
      >
        <Suspense fallback={<SectionLoader />}>
          <ActionPlanTab {...props} />
        </Suspense>
      </AdaptiveBlock>

      {/* T3: Negotiation + strategic plan — lazy-loaded, collapsed */}
      <AdaptiveBlock
        title="Negotiation & strategic plan"
        subtitle="Role-specific scripts, exit timing, offer evaluation, phase roadmap"
        icon={Activity}
        tier={3}
        accentColor="#f59e0b"
        defaultOpen={false}
      >
        <Suspense fallback={<SectionLoader />}>
          {r.negotiationIntelligence && (
            <NegotiationIntelligencePanel negotiation={r.negotiationIntelligence} />
          )}
          <StrategyTab result={result} companyData={companyData} />
        </Suspense>
      </AdaptiveBlock>

    </div>
  );
};

export default TakeActionTab;
