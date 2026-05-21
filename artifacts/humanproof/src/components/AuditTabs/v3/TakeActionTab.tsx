// v3/TakeActionTab.tsx — V4 UX redesign
//
// TAB 2 of 3: "Take Action"
//
// Decision-driven IA: answers "What is my full plan?"
//   T1: ContingencyPlan (STAY / NEGOTIATE / TRANSITION) + EmergencyProtocol when active
//   T2: PriorityActionMatrix (top 5) + FinancialRunway when urgent + inline ProfileCapture
//   T3: Complete plan (all actions) + Negotiation scripts + Strategy
//   T4: Exit timing + Offer evaluation + Internal mobility
//
// Emergency mode: EmergencyProtocol renders FIRST, Critical/High actions only,
//                 ProfileQuickCapture suppressed.

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ListChecks, Zap, Clock, TrendingDown, Shield, AlertTriangle, ShieldAlert,
  BookOpen, Activity, DollarSign,
} from 'lucide-react';
import { ProfileQuickCapture } from '../../ProfileQuickCapture';
import type { TabProps } from '../common/types';
import type { CareerContingencyPlan } from '../../../services/careerContingencyPlanEngine';
import type { ActionPlanItem } from '../../../types/hybridResult';
import CareerContingencyPanel from '../common/CareerContingencyPanel';
import EmergencyModeBanner from '../common/EmergencyModeBanner';
import EmergencyProtocolPanel from '../common/EmergencyProtocolPanel';
import AdaptiveBlock from '../common/AdaptiveBlock';
import StrategyTab from '../StrategyTab';
import { ActionPlanTab } from '../ActionPlanTab';
import TierBadge from '../common/TierBadge';
import { NegotiationIntelligencePanel } from '../common/NegotiationIntelligencePanel';
import UserFinancialRunwayPanel from '../common/UserFinancialRunwayPanel';
import { useDashboardAdaptationV4 } from '../../../hooks/useDashboardAdaptation';

// ── Priority config ───────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<string, { color: string; bg: string; icon: React.ElementType }> = {
  Critical: { color: '#dc2626', bg: 'rgba(220,38,38,0.12)', icon: AlertTriangle },
  High:     { color: '#f97316', bg: 'rgba(249,115,22,0.10)', icon: Zap },
  Medium:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', icon: Clock },
  Low:      { color: '#10b981', bg: 'rgba(16,185,129,0.08)', icon: TrendingDown },
};

// ── Action Matrix ─────────────────────────────────────────────────────────────

const ActionMatrix: React.FC<{ items: ActionPlanItem[]; emergencyMode?: boolean }> = ({ items, emergencyMode }) => {
  const [showAll, setShowAll] = useState(false);

  const prioritised = useMemo(() => {
    const order: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
    let sorted = [...items].sort((a, b) => (order[a.priority] ?? 4) - (order[b.priority] ?? 4));
    // Emergency mode: only show Critical + High initially
    if (emergencyMode && !showAll) {
      const urgent = sorted.filter(i => i.priority === 'Critical' || i.priority === 'High');
      return urgent.length > 0 ? urgent : sorted;
    }
    return sorted;
  }, [items, emergencyMode, showAll]);

  const visible = showAll || emergencyMode ? prioritised : prioritised.slice(0, 5);
  const criticalCount = items.filter(i => i.priority === 'Critical').length;
  const hiddenMediumLow = emergencyMode && !showAll
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
                    {item.sequencePhase && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.40)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>
                        {({ day1: 'Day 1', week1: 'Week 1', month1: 'Month 1', quarter1: 'Quarter 1' } as Record<string,string>)[item.sequencePhase]}
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
                    {item.riskReductionPct > 0 && (
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
      An error occurred. Try refreshing or adding more profile data to retry.
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

// ── Main Export ───────────────────────────────────────────────────────────────

export const TakeActionTab: React.FC<TabProps> = (props) => {
  const { result, companyData, emergencyMode } = props;
  const r = result as any;

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
  const recommendations: ActionPlanItem[] = result.recommendations ?? [];

  const adaptation = useDashboardAdaptationV4(result, companyData);
  const isEmergency = emergencyMode || adaptation.mode === 'emergency';

  const personalizedSet = r.personalizedActionSet as
    | { isGenericFallback?: boolean; isDbOverride?: boolean; profileContextNote?: string; roleGroup?: string }
    | undefined;

  const hasNoProfile = !personalizedSet?.profileContextNote && !personalizedSet?.isDbOverride;
  // Suppress profile capture in emergency mode
  const showQuickCapture = hasNoProfile && !quickCaptureCompleted && !isEmergency;

  // Financial runway urgency
  const financialRunway = r.financialRunway;
  const runwayUrgent = financialRunway?.monthsCovered != null && financialRunway.monthsCovered < 6;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4, 16px)' }}>

      {/* T1: Emergency mode banner */}
      {adaptation.showEmergencyBanner && (
        <EmergencyModeBanner result={result} onJumpToActions={() => { /* already on this tab */ }} />
      )}

      {/* T1: Emergency protocol — shown FIRST when active */}
      {isEmergency && r.emergencyResponse && (
        <EmergencyProtocolPanel emergency={r.emergencyResponse} />
      )}

      {/* T1: Career Contingency Plan */}
      {contingencyStatus === 'ready' && contingencyPlan
        ? <CareerContingencyPanel contingencyPlan={contingencyPlan} />
        : contingencyStatus === 'loading'
          ? <ContingencyLoading />
          : contingencyStatus === 'failed'
            ? <ContingencyFailed />
            : <ContingencyUnavailable />
      }

      {/* v39.0 B6: profile-aware framing + honest fallback notice */}
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

      {/* T2: Action Priority Matrix */}
      {recommendations.length > 0 && (
        <ActionMatrix items={recommendations} emergencyMode={isEmergency} />
      )}

      {/* T2: Financial runway intelligence — only when urgent */}
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

      {/* T3: Complete action plan — collapsed */}
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

      {/* T3: Negotiation intelligence + strategic plan — collapsed */}
      <AdaptiveBlock
        title="Negotiation & strategic plan"
        subtitle="Role-specific scripts, exit timing, offer evaluation, phase roadmap"
        icon={Activity}
        tier={3}
        accentColor="#f59e0b"
        defaultOpen={false}
      >
        {r.negotiationIntelligence && (
          <NegotiationIntelligencePanel negotiation={r.negotiationIntelligence} />
        )}
        <StrategyTab {...props} />
      </AdaptiveBlock>

    </div>
  );
};

export default TakeActionTab;
