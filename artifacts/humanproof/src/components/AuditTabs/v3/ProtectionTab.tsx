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
  Shield, GraduationCap, Compass, ArrowUpRight, User2, Users,
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
import { BehavioralIntelligencePanel } from '../common/BehavioralIntelligencePanel';
import { JobMarketLiquidityCard } from '../common/JobMarketLiquidityCard';
import { TechObsolescencePanel } from '../common/TechObsolescencePanel';
import { CohortBenchmarkCard } from '../common/CohortBenchmarkCard';
import { CareerInsuranceStatus } from '../common/CareerInsuranceStatus';
import { CareerTwinCard } from '../../CareerTwinCard';
import { FreelancerRiskPanel } from '../common/FreelancerRiskPanel';
import {
  runFreelancerIntelligence,
  detectFreelancerType,
} from '../../../services/freelancerIntelligenceEngine';
import type { UserProfile } from '../../../services/userProfileService';

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
  const behavioralPersonalization              = r.behavioralPersonalization;
  const jobMarketLiquidity                     = r.jobMarketLiquidity;
  const techStackObsolescence                  = r.techStackObsolescence;
  const internalMobility                       = r.internalMobility;
  const competitivePosition                    = r.competitivePosition;

  const careerResilience                        = r.careerResilience;

  // Wave 8.4: freelancer intelligence — derived from job title, no DB migration needed
  const userProfile: UserProfile | null = (props as any).userProfile ?? r.userProfile ?? null;
  const { isFreelancer } = detectFreelancerType(
    userProfile?.jobTitle ?? r.userFactors?.jobTitle,
    userProfile?.tenureYears,
  );
  const freelancerIntelligence = useMemo(() => {
    if (!isFreelancer) return null;
    try { return runFreelancerIntelligence(userProfile, result.total); }
    catch { return null; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFreelancer, result.total, userProfile?.jobTitle]);

  const hasSkills      = Boolean(skillGap || skillPortfolio);
  const hasMobility    = Boolean(careerContingency || careerConfidence);
  const hasMarket      = Boolean(roleMarketDemand);
  const hasPersonal    = Boolean(careerVelocity || visaRisk || userRunway);

  // v34 + Wave-fix: adaptive ordering — what gets surfaced first depends on the mode.
  // Previously all three cases (emergency / low-readiness / default) produced nearly
  // identical orderings. Now each mode has a meaningfully different first-visible-block.
  //
  // Emergency (score ≥ 75):
  //   'market' surfaces first — escape paths + reemployment estimate are the
  //   most time-critical information when a user is at high risk.
  //   'mobility' second — internal transfer is faster than external job search.
  //
  // Low readiness (preparedness < 45):
  //   'skills' surfaces first and auto-opens — closing skill gaps is the
  //   highest-leverage action for users who are underprepared.
  //
  // Default (stable / elevated / monitoring):
  //   'preparedness' hero stays first; other sections in standard order.
  const sectionOrder: SectionId[] = useMemo(() => {
    const prepScore = preparedness?.overallScore ?? 50;

    if (adaptation.mode === 'emergency') {
      // Critical risk: market liquidity + mobility before skills (escape matters most)
      return ['market', 'mobility', 'preparedness', 'skills', 'personal'];
    }
    if (prepScore < 45) {
      // Low readiness: skill gaps first — closing them has highest leverage
      return ['preparedness', 'skills', 'mobility', 'market', 'personal'];
    }
    // Elevated / stable / monitoring — balanced view, preparedness anchor first
    return ['preparedness', 'mobility', 'skills', 'market', 'personal'];
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
        defaultOpen={hasSkills && (adaptation.mode !== 'stable' || (preparedness?.overallScore ?? 50) < 45)}
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
        tier={adaptation.mode === 'emergency' ? 1 : 2}
        accentColor="#14b8a6"
        defaultOpen={hasMobility && (adaptation.mode === 'emergency' || adaptation.mode === 'elevated')}
        empty={!hasMobility}
      >
        {careerConfidence  && <CareerConfidencePanel confidence={careerConfidence} />}
        {careerContingency && <CareerContingencyPanel contingencyPlan={careerContingency} />}
      </AdaptiveBlock>
    ),

    market: (
      <AdaptiveBlock
        key="market"
        title="Job market liquidity & escape paths"
        subtitle="Reemployment timeline + safe pivot roles + role market demand"
        icon={ArrowUpRight}
        tier={adaptation.mode === 'emergency' ? 1 : 3}
        accentColor="#06b6d4"
        defaultOpen={adaptation.mode === 'emergency'}
        empty={!hasMarket && !jobMarketLiquidity}
      >
        {/* Wave 2.3: Job Market Liquidity Card — surfaces reemployment weeks estimate */}
        {jobMarketLiquidity && (
          <JobMarketLiquidityCard jobMarketLiquidity={jobMarketLiquidity} />
        )}
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
          currentRoleLabel={
            r.roleTitle ?? r.userProfile?.roleTitle ?? r.userProfile?.currentRole ??
            (String(r.workTypeKey ?? '').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) || undefined)
          }
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

      {/* Wave 6.5: Cohort Benchmark — where user stands vs. peers */}
      {competitivePosition && (competitivePosition.overallPercentile != null) && (
        <CohortBenchmarkCard competitivePosition={competitivePosition} />
      )}

      {/* Wave 2.1: Behavioral Intelligence — trajectory, gap, interview readiness, comp gap */}
      {behavioralPersonalization && (
        <AdaptiveBlock
          title="Your career intelligence"
          subtitle="Trajectory diagnosis, gap scripts, interview readiness, compensation position"
          icon={User2}
          tier={2}
          accentColor="#a78bfa"
          defaultOpen={
            behavioralPersonalization.employmentGap?.hasGap ||
            (behavioralPersonalization.interviewReadiness?.score ?? 100) < 60 ||
            (behavioralPersonalization.careerTrajectory?.trajectory === 'plateauing') ||
            (behavioralPersonalization.compensationIntelligence?.deltaPercent ?? 0) < -15
          }
        >
          <BehavioralIntelligencePanel data={behavioralPersonalization} />
        </AdaptiveBlock>
      )}

      {/* Wave 2.5: Career Twin Network — people who navigated your situation
           Uses findCareerTwins() directly (no HybridResult field needed) with
           workTypeKey + tenureYears + total score + countryKey.
           T3 collapsible — collapsed by default since it's social-proof context,
           not primary decision data. */}
      <AdaptiveBlock
        title="People who navigated your situation"
        subtitle="Historical precedents matched to your role, score, and experience level"
        icon={Users}
        tier={3}
        accentColor="#22d3ee"
        defaultOpen={false}
      >
        <CareerTwinCard
          userRole={result.workTypeKey ?? 'sw_backend'}
          userExperience={r.tenureYears ?? r.userFactors?.tenureYears ?? 5}
          userRiskScore={result.total}
          userCountry={r.countryKey ?? 'global'}
          topN={3}
        />
      </AdaptiveBlock>

      {/* Wave 2.2: Tech Stack Obsolescence — surfaces risky technologies */}
      {techStackObsolescence && (
        (techStackObsolescence.riskyTechnologies?.length ?? 0) > 0 ||
        (techStackObsolescence.overallObsolescenceScore ?? 0) > 30
      ) && (
        <TechObsolescencePanel techStackObsolescence={techStackObsolescence} />
      )}

      {/* Wave 2.4: Internal Mobility — viability inline card */}
      {internalMobility && (internalMobility.viabilityScore ?? 0) > 30 && (
        <div
          className="rounded-xl px-4 py-3"
          style={{ background: 'rgba(20,184,166,0.06)', border: '1px solid rgba(20,184,166,0.20)' }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[9px] font-bold tracking-widest" style={{ color: 'rgba(20,184,166,0.60)' }}>
              INTERNAL MOBILITY
            </p>
            <span className="text-[14px] font-black" style={{ color: '#14b8a6' }}>
              {internalMobility.viabilityScore}/100
            </span>
          </div>
          <p className="text-[11px] leading-relaxed mb-1.5" style={{ color: 'rgba(255,255,255,0.65)' }}>
            {internalMobility.viabilityScore >= 65
              ? 'Strong internal mobility viability — your org size and growth division make this your best near-term defensive move.'
              : 'Moderate internal mobility potential. Worth exploring before external search escalation.'}
          </p>
          {internalMobility.viabilityScore >= 60 && (
            <div
              className="flex items-start gap-1.5 rounded-lg px-2.5 py-1.5"
              style={{ background: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.18)' }}
            >
              <span className="text-[10px] font-black flex-shrink-0" style={{ color: '#14b8a6' }}>↳</span>
              <p className="text-[10px] italic" style={{ color: 'rgba(20,184,166,0.75)' }}>
                Request a 1:1 with your skip-level to signal ambition. Highest-ROI action this quarter.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Mini what-if strip — top 2 levers that move the score most */}
      {scoreSensitivity && (scoreSensitivity.levers?.filter((l: any) => l.scoreDropIfImproved > 0).length ?? 0) > 0 && (
        <ScoreSensitivityStrip scoreSensitivity={scoreSensitivity} />
      )}

      {/* Wave 8.4: Freelancer / Contractor Intelligence — only renders when
           isFreelancer is detected from job title. Shows client concentration,
           pipeline diversification, financial buffer gaps, and priority actions. */}
      {freelancerIntelligence && freelancerIntelligence.isFreelancer && (
        <FreelancerRiskPanel intelligence={freelancerIntelligence} />
      )}

      {/* Wave 4.2: Career Insurance Status — persistent 5-pillar tracking card
           Only renders when careerResilience pillars are available.
           Placed last so it serves as the "overall protection score" anchor. */}
      {careerResilience && (careerResilience.pillars?.length ?? 0) > 0 && (
        <CareerInsuranceStatus resilience={careerResilience} />
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
