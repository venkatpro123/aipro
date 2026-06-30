// AnalysisCompanyTab.tsx — Analysis Mode Tab 2
//
// Company intelligence: health, risk signals, market environment.
// Phase 1 addition: SignalHeatGrid provides an at-a-glance visual heatmap of
// all company signals before the detailed panels expand below.

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import type { HybridResult } from '../../../../types/hybridResult';
import type { CompanyData } from '../../../../data/companyDatabase';
import CompanyPulseCard from '../../common/CompanyPulseCard';
import { PersonalizedMarketEnvironment } from '../../common/PersonalizedMarketEnvironment';
import { ParentRiskCard } from '../../common/ParentRiskCard';
import { SignalHeatGrid, type SignalCell } from '../../common/SignalHeatGrid';

// Build signal cells from available HybridResult data
function buildCompanySignals(result: HybridResult, companyData?: CompanyData): SignalCell[] {
  const r = result as any;
  const bd = (result as any).breakdown ?? {};
  const cells: SignalCell[] = [];

  // Financial signals
  if (bd.L1 != null) {
    const s = Math.round(bd.L1 * 100);
    cells.push({
      key: 'fin_health', label: 'Financial Health', strength: s,
      category: 'financial',
      value: s >= 70 ? 'Stressed' : s >= 45 ? 'Mixed' : 'Healthy',
      detail: s >= 70 ? 'Revenue/P&L signals indicate financial pressure.' : 'Financial signals within normal range.',
    });
  }
  if (r.secEnhancedRisk?.riskScore != null) {
    cells.push({
      key: 'sec_risk', label: 'SEC Filings', strength: Math.round(r.secEnhancedRisk.riskScore),
      category: 'financial',
      value: r.secEnhancedRisk.riskLevel ?? undefined,
      detail: r.secEnhancedRisk.topSignal ?? undefined,
    });
  }
  if (r.maRisk?.overallRisk != null) {
    const level = r.maRisk.overallRisk;
    const s = level === 'critical' ? 90 : level === 'high' ? 70 : level === 'moderate' ? 45 : 20;
    cells.push({ key: 'ma_risk', label: 'M&A Activity', strength: s, category: 'financial', value: level });
  }

  // Workforce signals
  if (bd.L2 != null) {
    const s = Math.round(bd.L2 * 100);
    const rounds = companyData?.layoffRounds ?? 0;
    cells.push({
      key: 'layoff_hist', label: 'Layoff History', strength: s, category: 'workforce',
      value: rounds > 0 ? `${rounds} rounds` : 'None detected',
      detail: rounds > 0 ? `${rounds} layoff round(s) in last 24 months.` : undefined,
    });
  }
  if (r.headcountVelocity?.trend != null) {
    const trend = r.headcountVelocity.trend as string;
    const s = trend === 'rapid_decline' ? 88 : trend === 'declining' ? 65 : trend === 'stable' ? 30 : 20;
    cells.push({
      key: 'headcount', label: 'Headcount Velocity', strength: s, category: 'workforce',
      value: trend.replace(/_/g, ' '),
    });
  }

  // Leadership signals
  if (r.leadershipTransition?.transitionRisk != null) {
    const risk = r.leadershipTransition.transitionRisk as string;
    const s = risk === 'critical' ? 90 : risk === 'high' ? 70 : risk === 'moderate' ? 50 : 25;
    cells.push({
      key: 'leadership', label: 'Leadership Stability', strength: s, category: 'leadership',
      value: risk,
      detail: r.leadershipTransition.topSignal ?? undefined,
    });
  }
  if (r.executiveMovement?.activityLevel != null) {
    const level = r.executiveMovement.activityLevel as string;
    const s = level === 'critical' ? 85 : level === 'high' ? 65 : level === 'moderate' ? 40 : 15;
    cells.push({ key: 'exec_movement', label: 'Executive Movement', strength: s, category: 'leadership', value: level });
  }

  // Regulatory signals
  if (r.warnSignal?.hasActiveWARN === true) {
    cells.push({ key: 'warn', label: 'WARN Act Filing', strength: 100, category: 'regulatory', value: 'ACTIVE' });
  } else if (r.warnSignal != null) {
    cells.push({ key: 'warn', label: 'WARN Act Filing', strength: 5, category: 'regulatory', value: 'None' });
  }

  // Market signals
  if (r.peerContagion?.contagionRisk != null) {
    const risk = r.peerContagion.contagionRisk as string;
    const s = risk === 'critical' ? 85 : risk === 'high' ? 65 : risk === 'moderate' ? 40 : 18;
    cells.push({ key: 'contagion', label: 'Industry Contagion', strength: s, category: 'market', value: risk });
  }
  if (r.macroEconomicRisk?.score != null) {
    cells.push({ key: 'macro', label: 'Macro Risk', strength: Math.round(r.macroEconomicRisk.score), category: 'market' });
  }

  // Sentiment signals
  if (r.glassdoorVelocity?.sentimentTrend != null) {
    const trend = r.glassdoorVelocity.sentimentTrend as string;
    const s = trend === 'rapidly_declining' ? 80 : trend === 'declining' ? 60 : trend === 'stable' ? 25 : 15;
    cells.push({ key: 'glassdoor', label: 'Employee Sentiment', strength: s, category: 'sentiment', value: trend.replace(/_/g, ' ') });
  }
  if (r.employeeSentiment?.sentimentScore != null) {
    cells.push({ key: 'emp_sent', label: 'Internal Sentiment', strength: 100 - Math.round(r.employeeSentiment.sentimentScore), category: 'sentiment' });
  }

  return cells.filter(c => c.strength !== undefined);
}

interface Props {
  result: HybridResult;
  companyData: CompanyData;
  emergencyMode: boolean;
  onSwitchToBeast: () => void;
}

export const AnalysisCompanyTab: React.FC<Props> = ({ result, companyData, onSwitchToBeast }) => {
  const r = result as any;
  const hasMarket = Boolean(r.roleMarketDemand || r.peerContagion || r.macroEconomicRisk || r.blsMacroSignal);
  const hasParent = r.parentPropagation && r.parentPropagation.propagationRisk?.level !== 'negligible';

  // Phase 1: Build signal cells for the heatmap from available result data
  const signalCells = useMemo(
    () => buildCompanySignals(result, companyData),
    [result, companyData],
  );

  return (
    <div className="flex flex-col gap-3 py-2">

      {/* Phase 1: SignalHeatGrid — visual at-a-glance company signal overview
          Users see which signals are hot (red) before reading detailed panels. */}
      {signalCells.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          <SignalHeatGrid signals={signalCells} title="COMPANY SIGNAL INTELLIGENCE" />
        </motion.div>
      )}

      {/* T1: Company Pulse — unified workforce + financial verdict */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <CompanyPulseCard result={result} companyData={companyData} defaultOpen={true} />
      </motion.div>

      {/* Parent company risk */}
      {hasParent && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}>
          <ParentRiskCard parentPropagation={r.parentPropagation} />
        </motion.div>
      )}

      {/* Market Environment */}
      {hasMarket && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <div className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--alpha-bg-04)', border: '1px solid var(--alpha-bg-08)' }}>
            <div className="flex items-center gap-2 px-4 py-3"
              style={{ borderBottom: '1px solid var(--alpha-bg-06)' }}>
              <TrendingUp className="w-3.5 h-3.5" style={{ color: 'var(--color-amber500-text)' }} />
              <span className="text-[11px] font-black tracking-[0.08em] uppercase" style={{ color: 'var(--alpha-text-55)' }}>
                Industry & Market
              </span>
            </div>
            <div className="p-3">
              <PersonalizedMarketEnvironment result={result} companyData={companyData} />
            </div>
          </div>
        </motion.div>
      )}


    </div>
  );
};

export default AnalysisCompanyTab;
