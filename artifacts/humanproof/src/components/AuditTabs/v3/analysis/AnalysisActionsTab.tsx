// AnalysisActionsTab.tsx — Analysis Mode Tab 4
//
// Action plan: strategy, contingency paths, 3-bucket roadmap, phase progress.
// All surfaces use CSS utility classes (no inline styles) so light/dark mode adapts.

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Siren, Key, Clock, BookOpen, Activity, Radio, ChevronDown } from 'lucide-react';
import type { HybridResult } from '../../../../types/hybridResult';
import type { CompanyData } from '../../../../data/companyDatabase';
import type { ActionPlanItem } from '../../../../types/hybridResult';
import type { CareerContingencyPlan } from '../../../../services/careerContingencyPlanEngine';
import type { StrategySynthesisResult } from '../../../../services/strategySynthesisEngine';
import type { SurvivalProbabilityResult } from '../../../../services/layoffSurvivalPredictor';
import { StrategySpineCard } from '../../common/StrategySpineCard';
import { RecoveryProbabilityCard } from '../../common/RecoveryProbabilityCard';
import CareerContingencyPanel from '../../common/CareerContingencyPanel';
import AdaptiveBlock from '../../common/AdaptiveBlock';
import { ActionPlanTab } from '../../ActionPlanTab';
import StrategyTab from '../../StrategyTab';
import CareerProgressionLadder from '../../common/CareerProgressionLadder';
import { MissionBriefCard } from '../../common/MissionBriefCard';
import { deriveMissionId } from '../../../../services/missionCompletionService';

interface Props {
  result: HybridResult;
  companyData: CompanyData;
  emergencyMode: boolean;
  onSwitchToBeast: () => void;
}

const PRIORITY_ORDER: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
const PRIORITY_ROW_CLASS: Record<string, string> = {
  Critical: 'action-row action-row--critical',
  High:     'action-row action-row--high',
  Medium:   'action-row action-row--medium',
  Low:      'action-row action-row--low',
};

const ContingencyUnavailable: React.FC = () => (
  <div className="glass-card p-4 text-center">
    <p className="text-[12px] font-semibold mb-1 text-token-2">
      Contingency plan unavailable
    </p>
    <p className="text-[11px] text-token-3">
      Add your financial runway and career goal in Profile Setup to unlock personalised paths.
    </p>
  </div>
);

export const AnalysisActionsTab: React.FC<Props> = ({ result, companyData }) => {
  const r = result as any;
  const score = result.total;
  const liveSignalCount: number = r.meta?.liveSignalCount ?? result.signalQuality?.liveSignals ?? 0;
  const usedLiveSignals: boolean = r.meta?.usedLiveSignals === true || liveSignalCount > 0;
  const recommendations: ActionPlanItem[] = result.recommendations ?? [];
  const strategySynthesis: StrategySynthesisResult | undefined = r.strategySynthesis;
  const contingencyPlan: CareerContingencyPlan | undefined = r.careerContingencyPlan;
  const contingencyStatus: string = r.contingencyPlanStatus ?? (contingencyPlan ? 'ready' : 'unavailable');
  const survivalProbability: SurvivalProbabilityResult | undefined = r.survivalProbability;

  // Derive a stable mission ID from score + primary driver + role
  const primaryDriver: string =
    r.dimensions?.reduce((top: any, d: any) => (!top || (d.score ?? 0) > (top.score ?? 0)) ? d : top, null)?.key
    ?? r.keyRiskDriver
    ?? 'unknown';
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

  const sorted = useMemo(
    () => [...recommendations].sort(
      (a, b) => (PRIORITY_ORDER[a.priority] ?? 4) - (PRIORITY_ORDER[b.priority] ?? 4),
    ),
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

  const hasLiveEvidence = (item: ActionPlanItem): boolean =>
    (item.evidence ?? []).some(
      e => e.confidence === 'high'
        && !e.source.toLowerCase().includes('heuristic')
        && !e.source.toLowerCase().includes('fallback'),
    );

  const ActionRow: React.FC<{ item: ActionPlanItem }> = ({ item }) => {
    const [evidenceOpen, setEvidenceOpen] = useState(false);
    const evidence = item.evidence ?? [];
    const topEvidence = evidence.filter(e =>
      e.confidence === 'high'
      && !e.source.toLowerCase().includes('heuristic')
      && !e.source.toLowerCase().includes('fallback'),
    ).slice(0, 2);
    const hasEvidence = topEvidence.length > 0 || !!item.rationale;

    return (
      <div className={PRIORITY_ROW_CLASS[item.priority] ?? 'action-row action-row--low'}>
        <div className="flex items-start justify-between gap-2">
          <p className="action-row-title flex-1">{item.title}</p>
          {hasLiveEvidence(item) && (
            <span className="action-live-badge flex-shrink-0">
              <Radio className="w-2.5 h-2.5" />
              LIVE
            </span>
          )}
        </div>
        {item.description && (
          <p className="action-row-desc">{truncate1(item.description)}</p>
        )}
        <div className="action-row-meta">
          {typeof item.riskReductionPct === 'number' && item.riskReductionPct > 0 && (
            <span className="action-badge-risk">-{item.riskReductionPct}% risk</span>
          )}
          {item.effortBadge && (
            <span className="action-badge-effort">{item.effortBadge}</span>
          )}
          {item.deadline && (
            <span className="action-badge-deadline flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />{item.deadline}
            </span>
          )}
        </div>
        {hasEvidence && (
          <div className="mt-1.5">
            <button
              type="button"
              className="evidence-toggle"
              onClick={() => setEvidenceOpen(v => !v)}
            >
              <ChevronDown className={`w-3 h-3 transition-transform${evidenceOpen ? ' chevron-open' : ''}`} />
              Why this action?
            </button>
            <AnimatePresence initial={false}>
              {evidenceOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="overflow-hidden"
                >
                  <div className="evidence-row flex-col gap-1">
                    {item.rationale && (
                      <p className="text-token-2">{item.rationale}</p>
                    )}
                    {topEvidence.map((e, i) => (
                      <p key={i} className="text-token-3">
                        <span className="font-semibold text-token-2">{e.source}:</span> {e.signal}
                      </p>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4 pt-2">

      {/* Mission Brief — lifecycle card for this analysis session */}
      <MissionBriefCard
        missionId={missionId}
        companyName={result.companyName ?? ''}
        score={score}
        urgency={urgency}
        spine={spine}
        singleBiggestRisk={r.precisionBrief?.topRiskFactor?.naturalLanguage ?? r.keyRiskDriver ?? undefined}
        topAction={recommendations[0]?.title ?? undefined}
        confidencePercent={confidencePct}
        missionActionIds={missionActionIds}
      />

      {/* WARN Override */}
      {showWarn && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
          className="alert-card alert-card--warn"
        >
          <div className="flex items-start gap-3 mb-2">
            <div className="alert-icon alert-icon--warn">
              <Siren className="w-4 h-4 alert-icon-color--warn" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="mono-section-label alert-label--warn">
                LEGAL GROUND TRUTH · WARN ACT FILED
              </span>
              <p className="text-[12px] font-bold mt-1 leading-snug text-token-1">
                {warnDaysLeft !== null && warnDaysLeft > 0
                  ? `Confirmed layoff notice — ${warnDaysLeft} days remaining`
                  : 'Active WARN Act filing for your company'}
              </p>
            </div>
          </div>
          <p className="alert-callout--warn">
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

      {/* Equity Alert */}
      {showEquityAlert && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
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
            <div className="glass-card p-4 text-center">
              <div className="loading-spinner" />
              <p className="text-[11px] text-token-3">Analyzing your career paths…</p>
            </div>
          )
          : <ContingencyUnavailable />
      }

      {/* Career Escape Routes — visual progression ladder */}
      {result.escapePaths && result.escapePaths.paths.length > 0 && (
        <CareerProgressionLadder
          escapePaths={result.escapePaths}
          currentScore={score}
        />
      )}

      {/* Action Roadmap */}
      {recommendations.length > 0 && (
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="mono-section-label">ACTION ROADMAP</p>
            {usedLiveSignals && (
              <span className="live-signal-header">
                <span className="live-signal-dot" />
                {liveSignalCount > 0 ? `${liveSignalCount} live signal${liveSignalCount !== 1 ? 's' : ''}` : 'Live signals applied'}
              </span>
            )}
          </div>

          {thisWeek.length > 0 && (
            <div className="mb-4">
              <p className="time-bucket-label time-bucket-label--week">THIS WEEK</p>
              <div className="flex flex-col gap-2">
                {thisWeek.map((item, i) => <ActionRow key={item.id ?? i} item={item} />)}
              </div>
            </div>
          )}
          {thisMonth.length > 0 && (
            <div className="mb-4">
              <p className="time-bucket-label time-bucket-label--month">THIS MONTH</p>
              <div className="flex flex-col gap-2">
                {thisMonth.map((item, i) => <ActionRow key={item.id ?? i} item={item} />)}
              </div>
            </div>
          )}
          {next90.length > 0 && (
            <div>
              <p className="time-bucket-label time-bucket-label--quarter">NEXT 90 DAYS</p>
              <div className="flex flex-col gap-2">
                {next90.map((item, i) => <ActionRow key={item.id ?? i} item={item} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Complete action plan — collapsed */}
      <AdaptiveBlock
        title="Complete action plan"
        subtitle="Full ranked list with deadlines, effort estimates, evidence"
        icon={BookOpen}
        tier={3}
        accentColor="#22d3ee"
        defaultOpen={false}
      >
        <ActionPlanTab result={result} companyData={companyData} />
      </AdaptiveBlock>

      {/* Strategic plan & negotiation — collapsed */}
      <AdaptiveBlock
        title="Strategic plan & negotiation"
        subtitle="Exit timing, offer evaluation, negotiation intelligence, phase roadmap"
        icon={Activity}
        tier={3}
        accentColor="#f59e0b"
        defaultOpen={false}
      >
        <StrategyTab result={result} companyData={companyData} />
      </AdaptiveBlock>

    </div>
  );
};

export default AnalysisActionsTab;
