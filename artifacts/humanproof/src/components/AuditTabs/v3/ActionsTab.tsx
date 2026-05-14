// v3/ActionsTab.tsx — v34.0 UX redesign
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
  BookOpen, Activity,
} from 'lucide-react';
import type { TabProps } from '../common/types';
import type { CareerContingencyPlan } from '../../../services/careerContingencyPlanEngine';
import type { ActionPlanItem } from '../../../types/hybridResult';
import CareerContingencyPanel from '../common/CareerContingencyPanel';
import AdaptiveBlock from '../common/AdaptiveBlock';
import StrategyTab from '../StrategyTab';
import { ActionPlanTab } from '../ActionPlanTab';
import TierBadge from '../common/TierBadge';
import { useDashboardAdaptation } from '../../../hooks/useDashboardAdaptation';

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
                  <div className="flex items-center gap-3 mt-1.5">
                    {item.deadline && (
                      <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        <Clock className="w-2.5 h-2.5 inline mr-1" />
                        {item.deadline}
                      </span>
                    )}
                    {item.riskReductionPct > 0 && (
                      <span className="text-[10px]" style={{ color: '#10b98180' }}>
                        <TrendingDown className="w-2.5 h-2.5 inline mr-1" />
                        −{item.riskReductionPct}% risk
                      </span>
                    )}
                  </div>
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

// ── Empty State ───────────────────────────────────────────────────────────────

const NoContingencyFallback: React.FC = () => (
  <div className="rounded-2xl p-4 text-center"
    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
    <Shield className="w-8 h-8 mx-auto mb-2" style={{ color: 'rgba(255,255,255,0.20)' }} />
    <p className="text-[12px] font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.55)' }}>
      Contingency plan generating…
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
  const contingencyPlan: CareerContingencyPlan | undefined = r.careerContingencyPlan;
  const recommendations: ActionPlanItem[] = result.recommendations ?? [];
  const adaptation = useDashboardAdaptation(result, companyData);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4, 16px)' }}>

      {/* T1: Emergency callout — only in emergency mode */}
      {adaptation.mode === 'emergency' && <EmergencyCallout score={result.total} />}

      {/* T1: Career Contingency Plan */}
      {contingencyPlan
        ? <CareerContingencyPanel contingencyPlan={contingencyPlan} />
        : <NoContingencyFallback />
      }

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
