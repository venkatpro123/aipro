// v3/ProtectionTab.tsx — v34.0 UX redesign
//
// PROTECTION tab (3rd tab in v34 IA). The personal-career-intelligence surface.
// Answers "what's my exposure and what defensive capital do I have?"
//
// v34 changes vs v33:
//   • Adaptive section ordering driven by useDashboardAdaptation:
//       — Critical risk → market liquidity first (escape paths matter most)
//       — Low readiness → skill risk first (closing gaps matters most)
//       — Otherwise   → preparedness hero first (the personal headline)
//   • All sections use the unified AdaptiveBlock primitive with Tier badges
//   • Personal-context panels (visa / runway / velocity) hidden behind a single
//     T4 block instead of nested
//
// Render-order is decided once per mount via useMemo and never re-orders mid-
// session to avoid visual flicker.

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Shield, GraduationCap, Compass, ArrowUpRight, User2,
} from 'lucide-react';
import type { TabProps } from '../common/types';
import type { PreparednessResult } from '../../../services/preparednessScoreEngine';
import PreparednessScorePanel from '../common/PreparednessScorePanel';
import SkillGapIntelligencePanel from '../common/SkillGapIntelligencePanel';
import SkillPortfolioPanel from '../common/SkillPortfolioPanel';
import CareerVelocityPanel from '../common/CareerVelocityPanel';
import { VisaRiskPanel } from '../common/VisaRiskPanel';
import UserFinancialRunwayPanel from '../common/UserFinancialRunwayPanel';
import RoleMarketDemandPanel from '../common/RoleMarketDemandPanel';
import CareerContingencyPanel from '../common/CareerContingencyPanel';
import CareerConfidencePanel from '../common/CareerConfidencePanel';
import { CareerPortfolioPanel } from '../common/CareerPortfolioPanel';
import AdaptiveBlock from '../common/AdaptiveBlock';
import { useDashboardAdaptation } from '../../../hooks/useDashboardAdaptation';
import { SafePivotRolesCard } from '../common/SafePivotRolesCard';
import { D4CredibilityPanel } from '../common/D4CredibilityPanel';
import { ScoreSensitivityStrip } from '../common/ScoreSensitivityStrip';

type SectionId = 'preparedness' | 'skills' | 'mobility' | 'market' | 'personal';

// ── Main Export ───────────────────────────────────────────────────────────────

export const ProtectionTab: React.FC<TabProps> = (props) => {
  const { result, companyData } = props;
  const r = result as any;
  const adaptation = useDashboardAdaptation(result, companyData);

  const preparedness:  PreparednessResult | undefined = r.preparednessScore;
  const skillGap                                = r.skillGapIntelligence;
  const skillPortfolio                          = r.skillPortfolioFit;
  const careerVelocity                          = r.careerVelocity;
  const careerContingency                       = r.careerContingencyPlan;
  const careerConfidence                        = r.careerConfidence;
  const visaRisk                                = r.visaRisk;
  const userRunway                              = r.userFinancialRunway;
  const roleMarketDemand                        = r.roleMarketDemand;

  const roleAdjacency                          = r.roleAdjacency;
  const scoreSensitivity                       = r.scoreSensitivity;

  const hasSkills      = Boolean(skillGap || skillPortfolio);
  const hasMobility    = Boolean(careerContingency || careerConfidence);
  const hasMarket      = Boolean(roleMarketDemand);
  const hasPersonal    = Boolean(careerVelocity || visaRisk || userRunway);

  // v34: adaptive ordering — what gets surfaced first depends on the mode.
  // The hero (preparedness) is always first because it's the personal anchor.
  // After it, we sort the four supporting groups based on user need.
  const sectionOrder: SectionId[] = useMemo(() => {
    const prepScore = preparedness?.overallScore ?? 50;

    if (adaptation.mode === 'emergency') {
      // Critical risk: escape paths matter most, then mobility, then skills
      return ['preparedness', 'market', 'mobility', 'skills', 'personal'];
    }
    if (prepScore < 45) {
      // Low readiness: close skill gaps first
      return ['preparedness', 'skills', 'mobility', 'market', 'personal'];
    }
    // Default (stable / monitoring / elevated)
    return ['preparedness', 'skills', 'mobility', 'market', 'personal'];
  }, [adaptation.mode, preparedness]);

  const sections: Record<SectionId, React.ReactNode> = {
    preparedness: preparedness ? (
      <motion.div key="preparedness" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
        <PreparednessScorePanel preparedness={preparedness} />
      </motion.div>
    ) : null,

    skills: (
      <AdaptiveBlock
        key="skills"
        title="Skill risk & portfolio fit"
        subtitle="How your skills line up with current market demand"
        icon={GraduationCap}
        tier={2}
        accentColor="#10b981"
        defaultOpen={hasSkills && adaptation.mode !== 'stable'}
        empty={!hasSkills}
      >
        {skillGap        && <SkillGapIntelligencePanel skillGapIntelligence={skillGap} />}
        {skillPortfolio  && <SkillPortfolioPanel portfolio={skillPortfolio} />}
      </AdaptiveBlock>
    ),

    mobility: (
      <AdaptiveBlock
        key="mobility"
        title="Internal mobility & resilience"
        subtitle="Pivot options inside your company + overall career resilience"
        icon={Compass}
        tier={2}
        accentColor="#14b8a6"
        defaultOpen={hasMobility && adaptation.mode === 'emergency'}
        empty={!hasMobility}
      >
        {careerConfidence  && <CareerConfidencePanel confidence={careerConfidence} />}
        {careerContingency && <CareerContingencyPanel contingencyPlan={careerContingency} />}
      </AdaptiveBlock>
    ),

    market: (
      <AdaptiveBlock
        key="market"
        title="Job market liquidity"
        subtitle="How quickly someone with your role/skills is being hired right now"
        icon={ArrowUpRight}
        tier={adaptation.mode === 'emergency' ? 1 : 3}
        accentColor="#06b6d4"
        defaultOpen={hasMarket && adaptation.mode === 'emergency'}
        empty={!hasMarket}
      >
        {roleMarketDemand && <RoleMarketDemandPanel roleMarketDemand={roleMarketDemand} />}
        <CareerPortfolioPanel result={result} />
      </AdaptiveBlock>
    ),

    personal: (
      <AdaptiveBlock
        key="personal"
        title="Personal context"
        subtitle="Career velocity, visa dependency, financial runway"
        icon={User2}
        tier={4}
        accentColor="#8b5cf6"
        defaultOpen={false}
        empty={!hasPersonal}
      >
        {careerVelocity && <CareerVelocityPanel velocity={careerVelocity} />}
        {visaRisk && visaRisk.dependencyScore > 10 && (
          <VisaRiskPanel
            visaRisk={visaRisk}
            countryCode={companyData.region}
            tenureYears={r.tenureYears}
          />
        )}
        {userRunway && <UserFinancialRunwayPanel userFinancialRunway={userRunway} />}
      </AdaptiveBlock>
    ),
  };

  return (
    <div className="flex flex-col gap-3">
      {sectionOrder.map(id => sections[id])}

      {/* Safe Pivot Roles — computed by roleAdjacencyEngine, previously invisible */}
      {roleAdjacency && (roleAdjacency.adjacentRoles?.length ?? 0) > 0 && (
        <SafePivotRolesCard
          roleAdjacency={roleAdjacency}
          currentScore={result.total}
          currentRoleLabel={String(r.workTypeKey ?? '')}
        />
      )}

      {/* D4 Performance Credibility — adjustment disclosure when tier was corrected */}
      {(r.reportedPerformanceTier || r.d4ContradictingSignals?.length > 0) && (
        <D4CredibilityPanel
          reportedPerformanceTier={String(r.reportedPerformanceTier ?? r.d4ReportedPerformanceTier ?? 'unknown')}
          effectivePerformanceTier={String(r.d4EffectivePerformanceTier ?? r.d4ReportedPerformanceTier ?? 'unknown')}
          performanceCredibilityScore={r.performanceCredibilityScore}
          contradictingSignals={r.d4ContradictingSignals ?? []}
          regionThresholdLabel={r.performanceCredibilityThresholdLabel}
        />
      )}

      {/* Mini what-if strip — top 2 levers that move the score most */}
      {scoreSensitivity && (scoreSensitivity.levers?.filter((l: any) => l.scoreDropIfImproved > 0).length ?? 0) > 0 && (
        <ScoreSensitivityStrip scoreSensitivity={scoreSensitivity} />
      )}

      <div className="text-center pt-2 pb-1">
        <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.30)' }}>
          <Shield className="inline-block w-3 h-3 mr-1" style={{ color: '#10b981' }} />
          Tap any section to reveal supporting evidence.
        </p>
      </div>
    </div>
  );
};

export default ProtectionTab;
