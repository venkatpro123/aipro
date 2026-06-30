// AnalysisProtectionTab.tsx — Analysis Mode Tab 3
//
// Career protection: preparedness, skills, market demand, pivot roles, resilience.
// No CareerTwin, BehavioralIntelligence, D4, CohortBenchmark, TechObsolescence,
// FreelancerRisk, or ScoreSensitivityStrip — those are Beast Mode depth.

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { HybridResult } from '../../../../types/hybridResult';
import type { CompanyData } from '../../../../data/companyDatabase';
import type { PreparednessResult } from '../../../../services/preparednessScoreEngine';
import PreparednessScorePanel from '../../common/PreparednessScorePanel';
import SkillGapIntelligencePanel from '../../common/SkillGapIntelligencePanel';
import { JobMarketLiquidityCard } from '../../common/JobMarketLiquidityCard';
import { SafePivotRolesCard } from '../../common/SafePivotRolesCard';
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

  const hasSkills   = Boolean(skillGap);
  const hasMarket   = Boolean(jobLiquidity);

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
        accentColor='var(--color-emerald-text)'
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



    </div>
  );
};

export default AnalysisProtectionTab;
