// AnalysisActionsTab.tsx — Analysis Mode Tab 4
//
// Action plan: strategy, contingency paths, 3-bucket roadmap, phase progress.
// No ExecutiveIntelligencePanel, no StrategyTab negotiation scripts, no full ActionPlanTab matrix.

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Siren, Timer, Key, Clock } from 'lucide-react';
import type { HybridResult } from '../../../../types/hybridResult';
import type { CompanyData } from '../../../../data/companyDatabase';
import type { ActionPlanItem } from '../../../../types/hybridResult';
import type { CareerContingencyPlan } from '../../../../services/careerContingencyPlanEngine';
import type { StrategySynthesisResult } from '../../../../services/strategySynthesisEngine';
import type { SurvivalProbabilityResult } from '../../../../services/layoffSurvivalPredictor';
import { StrategySpineCard } from '../../common/StrategySpineCard';
import { RecoveryProbabilityCard } from '../../common/RecoveryProbabilityCard';
import CareerContingencyPanel from '../../common/CareerContingencyPanel';
import { riskColor } from '../../../../lib/riskTokens';

interface Props {
  result: HybridResult;
  companyData: CompanyData;
  emergencyMode: boolean;
  onSwitchToBeast: () => void;
}

const PRIORITY_ORDER: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
const PRIORITY_COLOR: Record<string, string> = {
  Critical: '#dc2626', High: '#f97316', Medium: '#f59e0b', Low: '#22d3ee',
};

// Inline ContingencyUnavailable fallback
const ContingencyUnavailable: React.FC = () => (
  <div className="rounded-2xl p-4 text-center"
    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
    <p className="text-[12px] font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.55)' }}>
      Contingency plan unavailable
    </p>
    <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
      Add your financial runway and career goal in Profile Setup to unlock personalised paths.
    </p>
  </div>
);

export const AnalysisActionsTab: React.FC<Props> = ({ result, companyData, onSwitchToBeast }) => {
  const r = result as any;
  const score = result.total;
  const recommendations: ActionPlanItem[] = result.recommendations ?? [];
  const strategySynthesis: StrategySynthesisResult | undefined = r.strategySynthesis;
  const contingencyPlan: CareerContingencyPlan | undefined = r.careerContingencyPlan;
  const contingencyStatus: string = r.contingencyPlanStatus ?? (contingencyPlan ? 'ready' : 'unavailable');
  const survivalProbability: SurvivalProbabilityResult | undefined = r.survivalProbability;

  const warnSignal = r.warnSignal as
    | { hasActiveWARN: boolean; daysUntilLayoff: number | null; totalAffectedCount: number }
    | undefined;
  const showWarn = warnSignal?.hasActiveWARN === true;
  const warnDaysLeft = warnSignal?.daysUntilLayoff ?? null;
  const warnAffected = warnSignal?.totalAffectedCount ?? 0;

  const financialRunwayMonths: number = r.userFinancialRunway?.monthsOfRunway ?? r.userFactors?.financialRunwayMonths ?? 0;
  const showRunwayEscalation = score >= 70 && financialRunwayMonths > 0 && financialRunwayMonths <= 3;

  // Equity alert
  const hasEquityVesting: boolean = r.userFactors?.hasEquityVesting === true || r.userFactors?.equityVestMonths != null;
  const equityVestMonths: number = r.userFactors?.equityVestMonths ?? 0;
  const showEquityAlert: boolean = hasEquityVesting && equityVestMonths > 0 && equityVestMonths < 12 && score > 50;
  const equityUrgency: 'CRITICAL' | 'HIGH' = equityVestMonths <= 3 ? 'CRITICAL' : 'HIGH';

  // Split recommendations into 3 time buckets
  const sorted = useMemo(() =>
    [...recommendations].sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 4) - (PRIORITY_ORDER[b.priority] ?? 4)),
    [recommendations],
  );
  const thisWeek  = sorted.filter(r => r.priority === 'Critical' || r.priority === 'High').slice(0, 3);
  const thisMonth = sorted.filter(r => r.priority === 'Medium').slice(0, 3);
  const next90    = sorted.filter(r => r.priority === 'Low').slice(0, 3);

  const truncate1 = (text: string) => {
    if (!text) return '';
    const s = text.match(/[^.!?]+[.!?]+/g) ?? [text];
    return s[0].trim();
  };

  const ActionRow: React.FC<{ item: ActionPlanItem }> = ({ item }) => {
    const pColor = PRIORITY_COLOR[item.priority] ?? '#22d3ee';
    return (
      <div style={{ borderLeft: `3px solid ${pColor}60`, paddingLeft: '12px', paddingTop: '6px', paddingBottom: '6px' }}>
        <p style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.90)', margin: '0 0 4px' }}>
          {item.title}
        </p>
        {item.description && (
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.50)', margin: '0 0 6px', lineHeight: 1.5 }}>
            {truncate1(item.description)}
          </p>
        )}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {typeof item.riskReductionPct === 'number' && item.riskReductionPct > 0 && (
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#10b981', padding: '1px 6px', background: 'rgba(16,185,129,0.12)', borderRadius: '10px', border: '1px solid rgba(16,185,129,0.25)' }}>
              -{item.riskReductionPct}% risk
            </span>
          )}
          {item.effortBadge && (
            <span style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.45)', padding: '1px 6px', background: 'rgba(255,255,255,0.06)', borderRadius: '10px' }}>
              {item.effortBadge}
            </span>
          )}
          {item.deadline && (
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', gap: 3 }}>
              <Clock style={{ width: 10, height: 10 }} />{item.deadline}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4,16px)', paddingTop: 8 }}>

      {/* WARN Override */}
      {showWarn && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
          className="rounded-2xl p-4"
          style={{ background: 'linear-gradient(135deg, rgba(220,38,38,0.13), rgba(153,27,27,0.08))', border: '2px solid rgba(220,38,38,0.45)' }}
        >
          <div className="flex items-start gap-3 mb-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(220,38,38,0.18)', border: '1px solid rgba(220,38,38,0.35)' }}>
              <Siren className="w-4 h-4" style={{ color: '#fca5a5' }} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-black tracking-widest px-2 py-0.5 rounded"
                style={{ background: 'rgba(220,38,38,0.22)', color: '#dc2626' }}>
                OFFICIAL LAYOFF NOTICE FILED
              </span>
              <p className="text-[12px] font-bold mt-1 leading-snug" style={{ color: 'rgba(255,255,255,0.90)' }}>
                {warnDaysLeft !== null && warnDaysLeft > 0
                  ? `Confirmed layoff notice — ${warnDaysLeft} days remaining`
                  : 'An official layoff notice was filed for your company'}
              </p>
            </div>
          </div>
          <p className="text-[11px] font-semibold" style={{ color: '#fca5a5' }}>
            Update your résumé today. Activate your network this week.
          </p>
        </motion.div>
      )}

      {/* Short Runway Escalation */}
      {showRunwayEscalation && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, delay: showWarn ? 0.05 : 0 }}
          className="rounded-2xl p-4"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.38)' }}
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(245,158,11,0.15)' }}>
              <AlertTriangle className="w-4 h-4" style={{ color: '#fbbf24' }} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-black tracking-widest px-2 py-0.5 rounded"
                style={{ background: 'rgba(245,158,11,0.20)', color: '#f59e0b' }}>
                RUNWAY ALERT
              </span>
              <p className="text-[12px] font-bold leading-snug mt-1 mb-1" style={{ color: 'rgba(255,255,255,0.88)' }}>
                {financialRunwayMonths} month{financialRunwayMonths !== 1 ? 's' : ''} of runway — high-risk job search window
              </p>
              <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.60)' }}>
                Comparable roles typically take 8–16 weeks to land. Begin positioning now.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Equity Alert */}
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
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: equityUrgency === 'CRITICAL' ? 'rgba(220,38,38,0.15)' : 'rgba(249,115,22,0.15)' }}>
              <Key className="w-4 h-4" style={{ color: equityUrgency === 'CRITICAL' ? '#dc2626' : '#f97316' }} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-black px-2 py-0.5 rounded"
                style={{ background: equityUrgency === 'CRITICAL' ? 'rgba(220,38,38,0.20)' : 'rgba(249,115,22,0.18)', color: equityUrgency === 'CRITICAL' ? '#dc2626' : '#f97316' }}>
                {equityUrgency} · EQUITY ALERT
              </span>
              <p className="text-[12px] font-bold leading-snug mt-1 mb-1" style={{ color: 'rgba(255,255,255,0.88)' }}>
                {equityVestMonths} month{equityVestMonths !== 1 ? 's' : ''} of unvested equity at risk
              </p>
              <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.60)' }}>
                Your unvested equity is your strongest negotiation lever. Open a retention conversation now.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Strategy Spine */}
      <StrategySpineCard strategy={strategySynthesis} />

      {/* Recovery Probability */}
      {survivalProbability && (
        <RecoveryProbabilityCard
          survival={survivalProbability}
          criticalActionCount={recommendations.filter(r => r.priority === 'Critical').length}
        />
      )}

      {/* Career Contingency Paths */}
      {contingencyStatus === 'ready' && contingencyPlan
        ? <CareerContingencyPanel contingencyPlan={contingencyPlan} />
        : contingencyStatus === 'loading'
          ? (
            <div className="rounded-2xl p-4 text-center"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="w-6 h-6 mx-auto mb-2 rounded-full border-2 border-[rgba(0,212,224,0.12)] border-t-[var(--cyan,#00d4e0)] animate-spin" />
              <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.40)' }}>Analyzing your career paths…</p>
            </div>
          )
          : <ContingencyUnavailable />
      }

      {/* Action Roadmap */}
      {recommendations.length > 0 && (
        <div className="rounded-2xl p-4"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-[10px] font-bold tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>
            ACTION ROADMAP
          </p>
          {thisWeek.length > 0 && (
            <div className="mb-4">
              <p className="text-[11px] font-black tracking-[0.10em] mb-2" style={{ color: riskColor(score) }}>
                THIS WEEK
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {thisWeek.map((item, i) => <ActionRow key={item.id ?? i} item={item} />)}
              </div>
            </div>
          )}
          {thisMonth.length > 0 && (
            <div className="mb-4">
              <p className="text-[11px] font-black tracking-[0.10em] mb-2" style={{ color: '#f59e0b' }}>
                THIS MONTH
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {thisMonth.map((item, i) => <ActionRow key={item.id ?? i} item={item} />)}
              </div>
            </div>
          )}
          {next90.length > 0 && (
            <div>
              <p className="text-[11px] font-black tracking-[0.10em] mb-2" style={{ color: '#22d3ee' }}>
                NEXT 90 DAYS
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {next90.map((item, i) => <ActionRow key={item.id ?? i} item={item} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Depth invite */}
      <div className="text-center pt-2 pb-2">
        <button type="button" onClick={onSwitchToBeast}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.32)' }}>Explore full intelligence </span>
          <span style={{ fontSize: '12px', color: '#00d4e0', fontWeight: 600 }}>→</span>
        </button>
      </div>

    </div>
  );
};

export default AnalysisActionsTab;
