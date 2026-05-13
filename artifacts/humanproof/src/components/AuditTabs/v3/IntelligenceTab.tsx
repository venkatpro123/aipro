// v3/IntelligenceTab.tsx — v28.0 UX redesign
// Live intelligence hub. Each signal group is now collapsible so users see
// the group headers at a glance and expand only what they care about.
//
// Priority order (open by default → closed by default):
//   1. Ground Truth Signals     — WARN Act, SEC, BLS (RED, open if any active)
//   2. Company Signals          — executive, Glassdoor, headcount (ORANGE, open)
//   3. Market Signals           — role demand, contagion, macro (AMBER, closed)
//   4. Career & Personal        — skills, velocity, visa, runway (GREEN, closed)
//   5. Company deep profile     — collapsed
//   6. Methodology & transparency — collapsed

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown, ChevronUp, Search,
  ShieldAlert, Building2, TrendingUp, User, Layers,
} from 'lucide-react';
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

// ── Collapsible signal group ──────────────────────────────────────────────────

interface SignalGroupProps {
  groupId:      string;
  title:        string;
  subtitle:     string;
  accentColor:  string;
  icon:         React.ElementType;
  defaultOpen:  boolean;
  badge?:       string;    // e.g. "2 active" or "LIVE"
  badgeColor?:  string;
  children:     React.ReactNode;
  empty?:       boolean;   // when no data; renders a muted "no data" state
}

const CollapsibleSignalGroup: React.FC<SignalGroupProps> = ({
  groupId, title, subtitle, accentColor, icon: Icon,
  defaultOpen, badge, badgeColor, children, empty,
}) => {
  const [open, setOpen] = useState(defaultOpen && !empty);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: `1px solid ${open ? accentColor + '35' : 'rgba(255,255,255,0.08)'}`,
        transition: 'border-color 0.2s',
      }}
    >
      {/* Header — always visible, tap to toggle */}
      <button
        onClick={() => !empty && setOpen(o => !o)}
        disabled={empty}
        className="w-full px-4 py-3.5 flex items-center gap-3 text-left"
        style={{ cursor: empty ? 'default' : 'pointer' }}
      >
        {/* Accent bar */}
        <div className="w-1 h-7 rounded-full flex-shrink-0"
          style={{ background: empty ? 'rgba(255,255,255,0.12)' : accentColor }} />

        {/* Icon + text */}
        <Icon className="w-4 h-4 flex-shrink-0"
          style={{ color: empty ? 'rgba(255,255,255,0.20)' : accentColor + 'cc' }} />
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-bold leading-tight"
            style={{ color: empty ? 'rgba(255,255,255,0.30)' : 'rgba(255,255,255,0.80)' }}>
            {title}
          </p>
          <p className="text-[10px] leading-tight mt-0.5"
            style={{ color: 'rgba(255,255,255,0.30)' }}>
            {empty ? 'No data available for this company' : subtitle}
          </p>
        </div>

        {/* Badge */}
        {badge && !empty && (
          <span className="text-[9px] font-black px-2 py-0.5 rounded-full flex-shrink-0"
            style={{
              background: (badgeColor ?? accentColor) + '22',
              color: badgeColor ?? accentColor,
              border: `1px solid ${badgeColor ?? accentColor}35`,
            }}>
            {badge}
          </span>
        )}

        {/* Chevron */}
        {!empty && (
          <motion.div
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.18 }}
            className="flex-shrink-0"
          >
            <ChevronDown className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.25)' }} />
          </motion.div>
        )}
      </button>

      {/* Expanded content */}
      <AnimatePresence initial={false}>
        {open && !empty && (
          <motion.div
            key={`${groupId}-content`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-3"
              style={{ borderTop: `1px solid ${accentColor}20` }}>
              <div className="pt-3">
                {children}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Main Export ───────────────────────────────────────────────────────────────

export const IntelligenceTab: React.FC<TabProps> = (props) => {
  const { result, companyData } = props;
  const r = result as any;

  const preparedness: PreparednessResult | undefined = r.preparednessScore;
  const warnSignal     = r.warnSignal;
  const secEnhanced    = r.secEnhancedSignals;
  const blsMacro       = r.blsMacroSignal;
  const execDeparture  = r.executiveDeparturePattern;
  const glassdoor      = r.glassdoorVelocity;
  const headcount      = r.headcountVelocity;
  const roleMarket     = r.roleMarketDemand;
  const peerContagion  = r.peerContagion;
  const macroRisk      = r.macroEconomicRisk;
  const skillGap       = r.skillGapIntelligence;
  const careerVelocity = r.careerVelocity;
  const visaRisk       = r.visaRisk;
  const userRunway     = r.userFinancialRunway;

  const hasGroundTruth  = Boolean(warnSignal?.hasActiveWARN || secEnhanced || blsMacro);
  const hasCompany      = Boolean(execDeparture || glassdoor || headcount);
  const hasMarket       = Boolean(roleMarket || peerContagion || macroRisk);
  const hasCareer       = Boolean(skillGap || careerVelocity || visaRisk || userRunway);

  // WARN active count — used for badge
  const warnActiveCount = warnSignal?.hasActiveWARN ? 1 : 0;
  const groundTruthBadge = hasGroundTruth
    ? (warnActiveCount > 0 ? `${warnActiveCount} WARN ACTIVE` : 'REGULATORY')
    : undefined;

  return (
    <div className="flex flex-col gap-3">

      {/* ── Preparedness meta-score ──────────────────────────────────────── */}
      {preparedness && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <PreparednessScorePanel preparedness={preparedness} />
        </motion.div>
      )}

      {/* ── Cross-source event search ─────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-2xl overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="px-4 py-3 flex items-center gap-2">
          <Search className="w-3.5 h-3.5" style={{ color: 'rgba(0,212,224,0.6)' }} />
          <span className="text-[11px] font-semibold" style={{ color: 'rgba(255,255,255,0.60)' }}>
            Cross-Source Event Search
          </span>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="p-3">
            <EventSearchPanel />
          </div>
        </div>
      </motion.div>

      {/* ── Ground Truth Signals ──────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
        <CollapsibleSignalGroup
          groupId="ground-truth"
          title="Ground Truth Signals"
          subtitle="Legally filed or regulatory-sourced — highest confidence"
          accentColor="#dc2626"
          icon={ShieldAlert}
          defaultOpen={hasGroundTruth}
          badge={groundTruthBadge}
          badgeColor={warnActiveCount > 0 ? '#dc2626' : '#f97316'}
          empty={!hasGroundTruth}
        >
          {warnSignal   && <WARNSignalPanel warnSignal={warnSignal} />}
          {secEnhanced  && <SECEnhancedPanel secEnhancedSignals={secEnhanced} />}
          {blsMacro     && <BLSMacroPanel blsMacroSignal={blsMacro} />}
        </CollapsibleSignalGroup>
      </motion.div>

      {/* ── Company Signals ───────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.11 }}>
        <CollapsibleSignalGroup
          groupId="company"
          title="Company Signals"
          subtitle="Executive movement, culture velocity, workforce structure"
          accentColor="#f97316"
          icon={Building2}
          defaultOpen={hasCompany}
          empty={!hasCompany}
        >
          {execDeparture && <ExecutiveDeparturePatternPanel executiveDeparturePattern={execDeparture} />}
          {glassdoor     && <GlassdoorVelocityPanel glassdoorVelocity={glassdoor} />}
          {headcount     && <HeadcountVelocityPanel headcount={headcount} />}
        </CollapsibleSignalGroup>
      </motion.div>

      {/* ── Market Signals ────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
        <CollapsibleSignalGroup
          groupId="market"
          title="Market Signals"
          subtitle="Role demand, sector contagion, macro environment"
          accentColor="#f59e0b"
          icon={TrendingUp}
          defaultOpen={false}
          empty={!hasMarket}
        >
          {roleMarket    && <RoleMarketDemandPanel roleMarketDemand={roleMarket} />}
          {peerContagion && <PeerContagionPanel contagion={peerContagion} />}
          {macroRisk     && <MacroRiskPanel macro={macroRisk} />}
        </CollapsibleSignalGroup>
      </motion.div>

      {/* ── Career & Personal ─────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.17 }}>
        <CollapsibleSignalGroup
          groupId="career"
          title="Career & Personal Signals"
          subtitle="Skill demand, trajectory, financial runway, visa status"
          accentColor="#10b981"
          icon={User}
          defaultOpen={false}
          empty={!hasCareer}
        >
          {skillGap      && <SkillGapIntelligencePanel skillGapIntelligence={skillGap} />}
          {careerVelocity && <CareerVelocityPanel velocity={careerVelocity} />}
          {visaRisk && visaRisk.dependencyScore > 10 && <VisaRiskPanel visaRisk={visaRisk} />}
          {userRunway    && <UserFinancialRunwayPanel userFinancialRunway={userRunway} />}
        </CollapsibleSignalGroup>
      </motion.div>

      {/* ── Deep dives (always collapsed) ────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.20 }}
        className="space-y-2"
      >
        <CollapsibleSection
          title="Company deep profile"
          description="All company signals, live data feed, and historical context"
          defaultOpen={false}
        >
          <CompanyProfileTab {...props} />
        </CollapsibleSection>

        <CollapsibleSection
          title="Methodology & transparency"
          description="Data quality, signal provenance, calibration, model agreement"
          defaultOpen={false}
        >
          <TransparencyTab {...props} />
        </CollapsibleSection>
      </motion.div>

    </div>
  );
};
