// v3/ActionsTab.tsx — Action Plan tab.
//
// Layout (priority order):
//   0. Layoff notice (only when officially announced)
//   1. Low savings warning (only when score is high + savings are low)
//   2. Stock vesting alert (only when relevant)
//   3. Strategy spine — recommended direction
//   4. Phase Progress System — 3-phase action unlock with checkboxes
//   5. Executive Intelligence (only for C-suite / VP / Director)
//   6. Negotiation & strategy (collapsed)

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Activity, Key, Siren, Timer } from 'lucide-react';
import type { TabProps } from '../common/types';
import type { ActionPlanItem } from '../../../types/hybridResult';
import { StrategySpineCard } from '../common/StrategySpineCard';
import type { StrategySynthesisResult } from '../../../services/strategySynthesisEngine';
import AdaptiveBlock from '../common/AdaptiveBlock';
import StrategyTab from '../StrategyTab';
import { isActionableRecommendation } from '../../../services/orchestration/signalOrchestrator';
import { PhaseProgressSystem } from '../common/PhaseProgressSystem';
import { ExecutiveIntelligencePanel } from '../common/ExecutiveIntelligencePanel';
import {
  runExecutiveIntelligence,
  detectExecutiveTier,
} from '../../../services/executiveIntelligenceEngine';
import type { UserProfile } from '../../../services/userProfileService';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

// ── Main Export ───────────────────────────────────────────────────────────────

export const ActionsTab: React.FC<TabProps> = (props) => {
  const { result, companyData } = props;
  const r = result as any;
  const score = result.total;
  const strategySynthesis: StrategySynthesisResult | undefined = r.strategySynthesis;
  const recommendations: ActionPlanItem[] = (result.recommendations ?? []).filter(isActionableRecommendation);

  const hasEquityVesting: boolean   = r.userFactors?.hasEquityVesting === true || r.userFactors?.equityVestMonths != null;
  const equityVestMonths: number    = r.userFactors?.equityVestMonths ?? 0;
  const showEquityAlert: boolean    = hasEquityVesting && equityVestMonths > 0 && equityVestMonths < 12 && score > 50;
  const equityUrgency: 'CRITICAL' | 'HIGH' = equityVestMonths <= 3 ? 'CRITICAL' : 'HIGH';

  const warnSignal = r.warnSignal as
    | { hasActiveWARN: boolean; daysUntilLayoff: number | null; totalAffectedCount: number; affectedLocations: string[]; warnRiskLabel: string }
    | undefined;
  const showWarnProtocol: boolean = warnSignal?.hasActiveWARN === true;
  const warnDaysLeft: number | null = warnSignal?.daysUntilLayoff ?? null;
  const warnAffected: number = warnSignal?.totalAffectedCount ?? 0;
  const warnLocations: string[] = warnSignal?.affectedLocations ?? [];

  const financialRunwayMonths: number = (r.userFinancialRunway?.monthsOfRunway ?? r.userFactors?.financialRunwayMonths ?? 0);
  const showRunwayEscalation: boolean = score >= 70 && financialRunwayMonths > 0 && financialRunwayMonths <= 3;

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4, 16px)' }}>

      {/* WARN Act legal override — highest certainty signal */}
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
              <Siren className="w-5 h-5" style={{ color: 'var(--color-red300-text)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <span
                className="text-[10px] font-black tracking-widest px-2 py-0.5 rounded"
                style={{ background: 'rgba(220,38,38,0.22)', color: 'var(--color-red600-text)' }}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
            {warnAffected > 0 && (
              <div
                className="rounded-xl px-3 py-2"
                style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.18)' }}
              >
                <p className="text-[10px] font-bold tracking-widest mb-0.5" style={{ color: 'rgba(220,38,38,0.70)' }}>
                  AFFECTED
                </p>
                <p className="text-[13px] font-black" style={{ color: 'var(--color-red300-text)' }}>
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
                <p className="text-[13px] font-black flex items-center gap-1" style={{ color: 'var(--color-red300-text)' }}>
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

          <div
            className="rounded-xl px-3 py-2.5"
            style={{ background: 'var(--alpha-bg-04)', border: '1px solid var(--alpha-bg-08)' }}
          >
            <p className="text-[11px] leading-relaxed mb-1" style={{ color: 'var(--alpha-text-70)' }}>
              <span style={{ color: 'var(--alpha-text-92)', fontWeight: 600 }}>This is official, not a guess.</span>
              {' '}Companies must tell employees at least 60 days before layoffs happen.
            </p>
            <p className="text-[11px] leading-relaxed font-semibold" style={{ color: 'var(--color-red300-text)' }}>
              What to do now: Update your résumé today. Reach out to your contacts this week. Don't wait for your own notice.
            </p>
          </div>
        </motion.div>
      )}

      {/* Short runway escalation */}
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
              <AlertTriangle className="w-4 h-4" style={{ color: 'var(--color-amber-text)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-[10px] font-black tracking-widest px-2 py-0.5 rounded"
                  style={{ background: 'rgba(245,158,11,0.20)', color: 'var(--color-amber500-text)' }}
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

      {/* Strategy direction */}
      <StrategySpineCard strategy={strategySynthesis} />

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

      {/* Phase Progress System — 3-phase action unlock */}
      {recommendations.length > 0 && (
        <PhaseProgressSystem
          actions={recommendations}
          companyName={companyData?.name}
          currentScore={score}
          onActionComplete={(actionId, completedCount) => {
            window.dispatchEvent(new CustomEvent('hp.action.milestone', {
              detail: { count: completedCount, actionId }
            }));
          }}
        />
      )}

      {/* Executive Intelligence Panel */}
      {executiveIntelligence && executiveIntelligence.isExecutive && (
        <ScrollReveal><ExecutiveIntelligencePanel intelligence={executiveIntelligence} /></ScrollReveal>
      )}

      {/* Negotiation & strategy deep-dive (collapsed) */}
      <ScrollReveal>
        <AdaptiveBlock
          title="Negotiation & career strategy"
          subtitle="Exit timing, offer evaluation, compensation scripts, full action plan"
          icon={Activity}
          tier={3}
          accentColor='#f59e0b'
          defaultOpen={false}
        >
          <StrategyTab {...props} />
        </AdaptiveBlock>
      </ScrollReveal>

    </div>
  );
};

export default ActionsTab;
