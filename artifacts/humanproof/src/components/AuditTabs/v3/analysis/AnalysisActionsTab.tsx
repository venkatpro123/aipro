// AnalysisActionsTab.tsx — Analysis Mode Tab 4
//
// Action plan: strategy, survival odds, contingency paths, visual roadmap.

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Siren, Key, Clock, Activity } from 'lucide-react';
import type { HybridResult } from '../../../../types/hybridResult';
import type { CompanyData } from '../../../../data/companyDatabase';
import type { ActionPlanItem } from '../../../../types/hybridResult';
import type { CareerContingencyPlan } from '../../../../services/careerContingencyPlanEngine';
import type { StrategySynthesisResult } from '../../../../services/strategySynthesisEngine';
import { StrategySpineCard } from '../../common/StrategySpineCard';
import { ActionRoadmapVisual, type ActionItem as ARMItem } from '../../common/ActionRoadmapVisual';
import CareerContingencyPanel from '../../common/CareerContingencyPanel';
import AdaptiveBlock from '../../common/AdaptiveBlock';
import StrategyTab from '../../StrategyTab';
import { MissionBriefCard } from '../../common/MissionBriefCard';
import { deriveMissionId } from '../../../../services/missionCompletionService';
import { isActionableRecommendation } from '../../../../services/orchestration/signalOrchestrator';

interface Props {
  result: HybridResult;
  companyData: CompanyData;
  emergencyMode: boolean;
  onSwitchToBeast: () => void;
}

const PRIORITY_ORDER: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };

const ContingencyUnavailable: React.FC = () => (
  <div className="glass-card p-4 text-center">
    <p className="text-[12px] font-semibold mb-1 text-token-2">
      Career path analysis not available
    </p>
    <p className="text-[11px] text-token-3">
      Add your financial runway and career goal in Profile to unlock personalised paths.
    </p>
  </div>
);

export const AnalysisActionsTab: React.FC<Props> = ({ result, companyData }) => {
  const r = result as any;
  const score = result.total;

  const recommendations: ActionPlanItem[] = (result.recommendations ?? []).filter(isActionableRecommendation);
  const strategySynthesis: StrategySynthesisResult | undefined = r.strategySynthesis;
  const contingencyPlan: CareerContingencyPlan | undefined = r.careerContingencyPlan;
  const contingencyStatus: string = r.contingencyPlanStatus ?? (contingencyPlan ? 'ready' : 'unavailable');

  const primaryDriver: string =
    r.dimensions?.reduce((top: any, d: any) => (!top || (d.score ?? 0) > (top.score ?? 0)) ? d : top, null)?.key
    ?? r.keyRiskDriver ?? 'unknown';
  const roleKey: string = r.roleKey ?? r.userFactors?.roleKey ?? '';
  const missionId = deriveMissionId(score, primaryDriver, roleKey);
  const urgency: string = r.intelligenceBrief?.urgencyLevel
    ?? (score >= 75 ? 'CRITICAL' : score >= 55 ? 'HIGH' : score >= 35 ? 'MODERATE' : 'LOW');
  const confidencePct: number = r.canonicalConfidence?.score ?? r.confidence ?? 70;
  const spine: string = r.strategySynthesis?.strategySpine ?? r.keyActionStatement ?? '';
  const missionActionIds: string[] = recommendations.map(rec => rec.id).filter(Boolean) as string[];

  const warnSignal = r.warnSignal as
    | { hasActiveWARN: boolean; daysUntilLayoff: number | null; totalAffectedCount: number }
    | undefined;
  const showWarn = warnSignal?.hasActiveWARN === true;
  const warnDaysLeft = warnSignal?.daysUntilLayoff ?? null;

  const financialRunwayMonths: number =
    r.userFinancialRunway?.monthsOfRunway ?? r.userFactors?.financialRunwayMonths ?? 0;
  const showRunwayEscalation = score >= 70 && financialRunwayMonths > 0 && financialRunwayMonths <= 3;

  const equityVestMonths: number = r.userFactors?.equityVestMonths ?? 0;
  const hasEquityVesting: boolean =
    r.userFactors?.hasEquityVesting === true || r.userFactors?.equityVestMonths != null;
  const showEquityAlert: boolean =
    hasEquityVesting && equityVestMonths > 0 && equityVestMonths < 12 && score > 50;
  const equityIsCritical = equityVestMonths <= 3;

  const hasLiveEvidence = (item: ActionPlanItem): boolean =>
    (item.evidence ?? []).some(
      e => e.confidence === 'high'
        && !e.source.toLowerCase().includes('heuristic')
        && !e.source.toLowerCase().includes('fallback'),
    );

  const sorted = useMemo(
    () => [...recommendations].sort(
      (a, b) => (PRIORITY_ORDER[a.priority] ?? 4) - (PRIORITY_ORDER[b.priority] ?? 4),
    ),
    [recommendations],
  );
  const thisWeek  = sorted.filter(r => r.priority === 'Critical' || r.priority === 'High').slice(0, 3);
  const thisMonth = sorted.filter(r => r.priority === 'Medium').slice(0, 3);
  const next90    = sorted.filter(r => r.priority === 'Low').slice(0, 3);

  const mapItem = (item: ActionPlanItem): ARMItem => ({
    id: item.id,
    title: item.title,
    description: item.description,
    priority: item.priority as ARMItem['priority'],
    riskReductionPct: item.riskReductionPct,
    effortBadge: item.effortBadge,
    deadline: item.deadline,
    hasLiveEvidence: hasLiveEvidence(item),
    rationale: (item as any).rationale,
  });

  return (
    <div className="flex flex-col gap-4 pt-2">

      {/* Mission lifecycle tracker */}
      <MissionBriefCard
        missionId={missionId}
        companyName={result.companyName ?? ''}
        score={score}
        urgency={urgency}
        spine={spine}
        singleBiggestRisk={r.precisionBrief?.topRiskFactor?.naturalLanguage ?? r.keyRiskDriver ?? undefined}
        topAction={recommendations[0]?.title ?? undefined}
        missionActionIds={missionActionIds}
      />

      {/* Critical overrides — shown above everything else when active */}
      {showWarn && (
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }} className="alert-card alert-card--warn"
        >
          <div className="flex items-start gap-3 mb-2">
            <div className="alert-icon alert-icon--warn">
              <Siren className="w-4 h-4 alert-icon-color--warn" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="mono-section-label alert-label--warn">LEGAL NOTICE ON FILE</span>
              <p className="text-[12px] font-bold mt-1 leading-snug text-token-1">
                {warnDaysLeft !== null && warnDaysLeft > 0
                  ? `Confirmed layoff notice — ${warnDaysLeft} days remaining`
                  : 'Active WARN Act filing confirmed for your company'}
              </p>
            </div>
          </div>
          <p className="alert-callout--warn">Update your résumé today. Activate your network this week.</p>
        </motion.div>
      )}

      {showRunwayEscalation && (
        <motion.div
          initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, delay: showWarn ? 0.05 : 0 }}
          className="alert-card alert-card--runway"
        >
          <div className="flex items-start gap-3">
            <div className="alert-icon alert-icon--runway">
              <AlertTriangle className="w-4 h-4 alert-icon-color--runway" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="mono-section-label alert-label--runway">RUNWAY ALERT</span>
              <p className="text-[12px] font-bold leading-snug mt-1 mb-1 text-token-1">
                {financialRunwayMonths} month{financialRunwayMonths !== 1 ? 's' : ''} of runway — high-risk job search window
              </p>
              <p className="text-[11px] leading-relaxed text-token-2">
                Comparable roles typically take 8–16 weeks to land. Begin positioning now.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {showEquityAlert && (
        <motion.div
          initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.20 }}
          className={`alert-card ${equityIsCritical ? 'alert-card--equity-critical' : 'alert-card--equity-high'}`}
        >
          <div className="flex items-start gap-3">
            <div className={`alert-icon ${equityIsCritical ? 'alert-icon--equity-critical' : 'alert-icon--equity-high'}`}>
              <Key className={`w-4 h-4 ${equityIsCritical ? 'alert-icon-color--equity-critical' : 'alert-icon-color--equity-high'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <span className={`mono-section-label ${equityIsCritical ? 'alert-label--equity-critical' : 'alert-label--equity-high'}`}>
                {equityIsCritical ? 'CRITICAL' : 'HIGH'} · EQUITY ALERT
              </span>
              <p className="text-[12px] font-bold leading-snug mt-1 mb-1 text-token-1">
                {equityVestMonths} month{equityVestMonths !== 1 ? 's' : ''} of unvested equity at risk
              </p>
              <p className="text-[11px] leading-relaxed text-token-2">
                Your unvested equity is your strongest negotiation lever. Open a retention conversation now.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Strategy direction */}
      <StrategySpineCard strategy={strategySynthesis} />

      {/* Career paths — contingency planning */}
      {contingencyStatus === 'ready' && contingencyPlan
        ? <CareerContingencyPanel contingencyPlan={contingencyPlan} />
        : contingencyStatus === 'loading'
          ? (
            <div className="glass-card p-4 text-center">
              <div className="loading-spinner" />
              <p className="text-[11px] text-token-3">Analyzing your career paths…</p>
            </div>
          )
          : <ContingencyUnavailable />
      }

      {/* Visual action roadmap — what to do this week, month, quarter */}
      {recommendations.length > 0 && (
        <ActionRoadmapVisual
          thisWeek={thisWeek.map(mapItem)}
          thisMonth={thisMonth.map(mapItem)}
          next90={next90.map(mapItem)}
        />
      )}

      {/* Deep strategy & negotiation (collapsed) */}
      <AdaptiveBlock
        title="Strategy & negotiation deep dive"
        subtitle="Exit timing, offer evaluation, compensation scripts, phase roadmap"
        icon={Activity}
        accentColor="var(--color-amber500-text)"
        defaultOpen={false}
      >
        <StrategyTab result={result} companyData={companyData} />
      </AdaptiveBlock>

    </div>
  );
};

export default AnalysisActionsTab;
