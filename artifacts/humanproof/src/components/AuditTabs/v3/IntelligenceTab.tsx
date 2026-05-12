// v3/IntelligenceTab.tsx — v17.0
// True redesign of the intelligence surface. Organises 22+ intelligence panels
// into a coherent signal intelligence hub grouped by signal category.
//
// Layout:
//   1. Preparedness Score — career readiness meta-score (hero panel)
//   2. Ground Truth Signals — WARN Act, SEC, BLS Macro (highest confidence)
//   3. Company Signals — Executive departure, Glassdoor velocity, headcount
//   4. Market Signals — Role demand, peer contagion, macro risk
//   5. Career & Personal Signals — Skills gap, career velocity, visa risk
//   6. Methodology & Transparency — collapsed

import React from 'react';
import type { TabProps } from '../common/types';
import type { PreparednessResult } from '../../../services/preparednessScoreEngine';
import PreparednessScorePanel from '../common/PreparednessScorePanel';
import WARNSignalPanel from '../common/WARNSignalPanel';
import SECEnhancedPanel from '../common/SECEnhancedPanel';
import BLSMacroPanel from '../common/BLSMacroPanel';
import ExecutiveDeparturePatternPanel from '../common/ExecutiveDeparturePatternPanel';
import GlassdoorVelocityPanel from '../common/GlassdoorVelocityPanel';
import HeadcountVelocityPanel from '../common/HeadcountVelocityPanel';
import RoleMarketDemandPanel from '../common/RoleMarketDemandPanel';
import PeerContagionPanel from '../common/PeerContagionPanel';
import MacroRiskPanel from '../common/MacroRiskPanel';
import SkillGapIntelligencePanel from '../common/SkillGapIntelligencePanel';
import CareerVelocityPanel from '../common/CareerVelocityPanel';
import { VisaRiskPanel } from '../common/VisaRiskPanel';
import UserFinancialRunwayPanel from '../common/UserFinancialRunwayPanel';
import { CollapsibleSection } from '../common/CollapsibleSection';
import { TransparencyTab } from '../TransparencyTab';
import CompanyProfileTab from '../CompanyProfileTab';
import { EventSearchPanel } from '../../audit/EventSearchPanel';

// ── Signal Group ──────────────────────────────────────────────────────────────

interface SignalGroupProps {
  title: string;
  subtitle: string;
  accentColor: string;
  children: React.ReactNode;
}

const SignalGroup: React.FC<SignalGroupProps> = ({ title, subtitle, accentColor, children }) => (
  <div>
    <div className="flex items-baseline gap-2 mb-2.5">
      <div className="w-1 h-4 rounded-full flex-shrink-0" style={{ background: accentColor }} />
      <div>
        <p className="text-[11px] font-bold" style={{ color: accentColor }}>{title}</p>
        <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{subtitle}</p>
      </div>
    </div>
    <div className="space-y-3 pl-3">
      {children}
    </div>
  </div>
);

// ── Main Export ───────────────────────────────────────────────────────────────

export const IntelligenceTab: React.FC<TabProps> = (props) => {
  const { result, companyData } = props;
  const r = result as any;

  const preparedness: PreparednessResult | undefined = r.preparednessScore;
  const warnSignal = r.warnSignal;
  const secEnhanced = r.secEnhancedSignals;
  const blsMacro = r.blsMacroSignal;
  const execDeparture = r.executiveDeparturePattern;
  const glassdoor = r.glassdoorVelocity;
  const headcount = r.headcountVelocity;
  const roleMarket = r.roleMarketDemand;
  const peerContagion = r.peerContagion;
  const macroRisk = r.macroEconomicRisk;
  const skillGap = r.skillGapIntelligence;
  const careerVelocity = r.careerVelocity;
  const visaRisk = r.visaRisk;
  const userRunway = r.userFinancialRunway;

  const hasGroundTruth = warnSignal?.hasActiveWARN || secEnhanced || blsMacro;
  const hasCompanySignals = execDeparture || glassdoor || headcount;
  const hasMarketSignals = roleMarket || peerContagion || macroRisk;
  const hasCareerSignals = skillGap || careerVelocity || visaRisk || userRunway;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4, 16px)' }}>

      {/* 1. Career Preparedness — meta-score hero */}
      {preparedness && (
        <PreparednessScorePanel preparedness={preparedness} />
      )}

      {/* 1b. Cross-source event search — full-text over the composed
              event index (Meilisearch). Renders an inert disabled state
              when Meilisearch isn't yet provisioned. */}
      <EventSearchPanel />

      {/* 2. Ground Truth Signals */}
      {hasGroundTruth && (
        <SignalGroup
          title="GROUND TRUTH SIGNALS"
          subtitle="Legally filed or regulatory-sourced — highest confidence"
          accentColor="#dc2626"
        >
          {warnSignal && <WARNSignalPanel warnSignal={warnSignal} />}
          {secEnhanced && <SECEnhancedPanel secEnhancedSignals={secEnhanced} />}
          {blsMacro && <BLSMacroPanel blsMacroSignal={blsMacro} />}
        </SignalGroup>
      )}

      {/* 3. Company Signals */}
      {hasCompanySignals && (
        <SignalGroup
          title="COMPANY SIGNALS"
          subtitle="Executive movement, culture velocity, workforce structure"
          accentColor="#f97316"
        >
          {execDeparture && <ExecutiveDeparturePatternPanel executiveDeparturePattern={execDeparture} />}
          {glassdoor && <GlassdoorVelocityPanel glassdoorVelocity={glassdoor} />}
          {headcount && <HeadcountVelocityPanel headcount={headcount} />}
        </SignalGroup>
      )}

      {/* 4. Market Signals */}
      {hasMarketSignals && (
        <SignalGroup
          title="MARKET SIGNALS"
          subtitle="Role demand, sector contagion, macro environment"
          accentColor="#f59e0b"
        >
          {roleMarket && <RoleMarketDemandPanel roleMarketDemand={roleMarket} />}
          {peerContagion && <PeerContagionPanel contagion={peerContagion} />}
          {macroRisk && <MacroRiskPanel macro={macroRisk} />}
        </SignalGroup>
      )}

      {/* 5. Career & Personal Signals */}
      {hasCareerSignals && (
        <SignalGroup
          title="CAREER & PERSONAL SIGNALS"
          subtitle="Skill demand, trajectory, financial runway, visa status"
          accentColor="#10b981"
        >
          {skillGap && <SkillGapIntelligencePanel skillGapIntelligence={skillGap} />}
          {careerVelocity && <CareerVelocityPanel velocity={careerVelocity} />}
          {visaRisk && visaRisk.dependencyScore > 10 && <VisaRiskPanel visaRisk={visaRisk} />}
          {userRunway && <UserFinancialRunwayPanel userFinancialRunway={userRunway} />}
        </SignalGroup>
      )}

      {/* 6. Company deep profile — collapsed */}
      <CollapsibleSection
        title="Company deep profile"
        description="All company signals, live data feed, and historical context"
        defaultOpen={false}
      >
        <CompanyProfileTab {...props} />
      </CollapsibleSection>

      {/* 7. Methodology & Transparency — collapsed */}
      <CollapsibleSection
        title="Methodology & transparency"
        description="Data quality, signal provenance, calibration, and model agreement"
        defaultOpen={false}
      >
        <TransparencyTab {...props} />
      </CollapsibleSection>

    </div>
  );
};
