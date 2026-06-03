// AnalysisProtectionTab.tsx — Analysis Mode Tab 3
//
// Career protection: preparedness, skills, market demand, pivot roles, resilience.
// No CareerTwin, BehavioralIntelligence, D4, CohortBenchmark, TechObsolescence,
// FreelancerRisk, or ScoreSensitivityStrip — those are Beast Mode depth.

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';
import type { HybridResult } from '../../../../types/hybridResult';
import type { CompanyData } from '../../../../data/companyDatabase';
import type { PreparednessResult } from '../../../../services/preparednessScoreEngine';
import PreparednessScorePanel from '../../common/PreparednessScorePanel';
import SkillGapIntelligencePanel from '../../common/SkillGapIntelligencePanel';
import { JobMarketLiquidityCard } from '../../common/JobMarketLiquidityCard';
import { SafePivotRolesCard } from '../../common/SafePivotRolesCard';
import { CareerInsuranceStatus } from '../../common/CareerInsuranceStatus';
import AdaptiveBlock from '../../common/AdaptiveBlock';
import { useDashboardAdaptation } from '../../../../hooks/useDashboardAdaptation';
import { GraduationCap, ArrowUpRight } from 'lucide-react';

interface Props {
  result: HybridResult;
  companyData: CompanyData;
  emergencyMode: boolean;
  onSwitchToBeast: () => void;
}

export const AnalysisProtectionTab: React.FC<Props> = ({ result, companyData, emergencyMode, onSwitchToBeast }) => {
  const r = result as any;
  const adaptation = useDashboardAdaptation(result, companyData);

  const preparedness: PreparednessResult | undefined = r.preparednessScore;
  const skillGap       = r.skillGapIntelligence;
  const jobLiquidity   = r.jobMarketLiquidity;
  const roleAdjacency  = r.roleAdjacency;
  const careerResilience = r.careerResilience;
  const internalMobility = r.internalMobility;

  const hasSkills   = Boolean(skillGap);
  const hasMarket   = Boolean(jobLiquidity);
  const hasMobility = Boolean(internalMobility && (internalMobility.viabilityScore ?? 0) > 20);

  const currentRoleLabel = useMemo(() => (
    r.roleTitle ?? r.userProfile?.roleTitle ?? r.userProfile?.currentRole ??
    (String(r.workTypeKey ?? '').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) || undefined)
  ), [r]); // eslint-disable-line react-hooks/exhaustive-deps

  const prepScore = preparedness?.overallScore ?? 50;
  const skillsAutoOpen = hasSkills && (adaptation.mode !== 'stable' || prepScore < 45);
  const marketAutoOpen = hasMarket && emergencyMode;

  return (
    <div className="flex flex-col gap-3 py-2">

      {/* Preparedness score hero */}
      {preparedness && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          <PreparednessScorePanel preparedness={preparedness} />
        </motion.div>
      )}

      {/* Skills */}
      <AdaptiveBlock
        title="Skill risk & portfolio fit"
        subtitle="How your skills line up with current market demand"
        icon={GraduationCap}
        tier={2}
        accentColor="#10b981"
        defaultOpen={skillsAutoOpen}
        empty={!hasSkills}
      >
        {skillGap && <SkillGapIntelligencePanel skillGapIntelligence={skillGap} />}
      </AdaptiveBlock>

      {/* Job Market Liquidity */}
      <AdaptiveBlock
        title="Market demand for your role"
        subtitle="Reemployment timeline and hiring outlook"
        icon={ArrowUpRight}
        tier={2}
        accentColor="#06b6d4"
        defaultOpen={marketAutoOpen}
        empty={!hasMarket}
      >
        {jobLiquidity && (
          <JobMarketLiquidityCard
            jobMarketLiquidity={jobLiquidity}
            roleKey={result.workTypeKey ?? r.oracleKey ?? 'sw_backend'}
          />
        )}
      </AdaptiveBlock>

      {/* Safe Pivot Roles */}
      {roleAdjacency && (roleAdjacency.adjacentRoles?.length ?? 0) > 0 && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
          <SafePivotRolesCard
            roleAdjacency={roleAdjacency}
            currentScore={result.total}
            currentRoleLabel={currentRoleLabel}
          />
        </motion.div>
      )}

      {/* Internal Mobility — simplified */}
      {hasMobility && (
        <AdaptiveBlock
          title="Internal transfer opportunities"
          subtitle="Move within your company before market conditions shift"
          icon={Shield}
          tier={3}
          accentColor="#14b8a6"
          defaultOpen={false}
        >
          <div className="flex flex-col gap-2">
            {internalMobility.isGoldenWindow && (
              <div className="rounded-lg px-3 py-2 flex items-center gap-2"
                style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.28)' }}>
                <span className="text-[11px]">⚡</span>
                <p className="text-[10px] font-black" style={{ color: '#f59e0b' }}>
                  GOLDEN WINDOW — Act before restructuring is announced.
                </p>
              </div>
            )}
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold" style={{ color: 'rgba(255,255,255,0.85)' }}>
                Viability score
              </p>
              <span className="text-[14px] font-black" style={{ color: '#14b8a6' }}>
                {internalMobility.viabilityScore}/100
              </span>
            </div>
            <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.60)' }}>
              {internalMobility.viabilityRationale}
            </p>
            {(internalMobility.targetDepartments?.length ?? 0) > 0 && (
              <div className="flex flex-col gap-1.5 mt-1">
                <p className="text-[10px] font-bold tracking-wider" style={{ color: 'rgba(20,184,166,0.50)' }}>
                  TOP INTERNAL TARGETS
                </p>
                {internalMobility.targetDepartments.slice(0, 2).map((t: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5"
                    style={{ background: 'rgba(20,184,166,0.06)', border: '1px solid rgba(20,184,166,0.12)' }}>
                    <span className="text-[11px] font-semibold flex-1" style={{ color: 'rgba(255,255,255,0.82)' }}>
                      {t.department}
                    </span>
                    <span className="text-[12px] font-black" style={{ color: '#14b8a6' }}>{t.fitScore}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </AdaptiveBlock>
      )}

      {/* Career Insurance Status */}
      {careerResilience && (careerResilience.pillars?.length ?? 0) > 0 && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.10 }}>
          <CareerInsuranceStatus resilience={careerResilience} />
        </motion.div>
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

export default AnalysisProtectionTab;
