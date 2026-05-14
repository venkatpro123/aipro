// v3/ProtectionTab.tsx — v33 UX redesign
// Career Protection — the user-facing, personal-risk tab.
// Surfaces what the user can DO and what their personal exposure looks like:
//   1. Preparedness meta-score (always visible — it's the personal headline)
//   2. Skill risk + skill gap (skill-portfolio fit & demand)
//   3. Internal mobility & career resilience
//   4. Job market liquidity (escape paths)
//   5. Career velocity + visa risk + personal financial runway
//
// Progressive disclosure: panels with strong signals open by default; the rest
// stay collapsed so first-paint scans in <2 visual passes.

import React from 'react';
import { motion } from 'framer-motion';
import { Shield, GraduationCap, Compass, ArrowUpRight, User2 } from 'lucide-react';
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

// ── Signal-compression group ─────────────────────────────────────────────────
// Same visual pattern as IntelligenceTab's CollapsibleSignalGroup but tuned for
// career-protection emphasis (green/emerald accents, calm rather than alarming).

interface ProtectionGroupProps {
  title:       string;
  subtitle:    string;
  accentColor: string;
  icon:        React.ElementType;
  defaultOpen: boolean;
  badge?:      string;
  empty?:      boolean;
  children:    React.ReactNode;
}

const ProtectionGroup: React.FC<ProtectionGroupProps> = ({
  title, subtitle, accentColor, icon: Icon, defaultOpen, badge, empty, children,
}) => {
  const [open, setOpen] = React.useState(defaultOpen && !empty);
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: `1px solid ${open ? accentColor + '35' : 'rgba(255,255,255,0.08)'}`,
        transition: 'border-color 0.2s',
      }}
    >
      <button
        onClick={() => !empty && setOpen(o => !o)}
        disabled={empty}
        className="w-full px-4 py-3.5 flex items-center gap-3 text-left"
        style={{ cursor: empty ? 'default' : 'pointer' }}
      >
        <div className="w-1 h-7 rounded-full flex-shrink-0"
          style={{ background: empty ? 'rgba(255,255,255,0.12)' : accentColor }} />
        <Icon className="w-4 h-4 flex-shrink-0"
          style={{ color: empty ? 'rgba(255,255,255,0.20)' : accentColor + 'cc' }} />
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-bold leading-tight"
            style={{ color: empty ? 'rgba(255,255,255,0.30)' : 'rgba(255,255,255,0.85)' }}>
            {title}
          </p>
          <p className="text-[10px] leading-tight mt-0.5"
            style={{ color: 'rgba(255,255,255,0.35)' }}>
            {empty ? 'No data available for this audit' : subtitle}
          </p>
        </div>
        {badge && !empty && (
          <span className="text-[9px] font-black px-2 py-0.5 rounded-full flex-shrink-0"
            style={{
              background: accentColor + '22',
              color: accentColor,
              border: `1px solid ${accentColor}35`,
            }}>
            {badge}
          </span>
        )}
        {!empty && (
          <span
            className="text-[10px] flex-shrink-0 transition-transform"
            style={{
              color: 'rgba(255,255,255,0.30)',
              transform: open ? 'rotate(180deg)' : 'none',
            }}
          >
            ▼
          </span>
        )}
      </button>
      {open && !empty && (
        <div style={{ borderTop: `1px solid ${accentColor}20` }}>
          <div className="px-3 pt-3 pb-3 space-y-3">{children}</div>
        </div>
      )}
    </div>
  );
};

// ── Main Export ───────────────────────────────────────────────────────────────

export const ProtectionTab: React.FC<TabProps> = (props) => {
  const { result } = props;
  const r = result as any;

  const preparedness:  PreparednessResult | undefined = r.preparednessScore;
  const skillGap                                = r.skillGapIntelligence;
  const skillPortfolio                          = r.skillPortfolioFit;
  const careerVelocity                          = r.careerVelocity;
  const careerContingency                       = r.careerContingencyPlan;
  const careerConfidence                        = r.careerConfidence;
  const visaRisk                                = r.visaRisk;
  const userRunway                              = r.userFinancialRunway;
  const roleMarketDemand                        = r.roleMarketDemand;

  // Group readiness flags — used to decide which groups open by default.
  const hasSkills      = Boolean(skillGap || skillPortfolio);
  const hasMobility    = Boolean(careerContingency || careerConfidence);
  const hasMarket      = Boolean(roleMarketDemand);
  const hasPersonal    = Boolean(careerVelocity || visaRisk || userRunway);

  return (
    <div className="flex flex-col gap-3">
      {/* ── 1. Preparedness hero — your personal headline ─────────────────── */}
      {preparedness && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <PreparednessScorePanel preparedness={preparedness} />
        </motion.div>
      )}

      {/* ── 2. Skill risk — open by default when present ──────────────────── */}
      <ProtectionGroup
        title="Skill risk & portfolio fit"
        subtitle="How your skills line up with current market demand"
        accentColor="#10b981"
        icon={GraduationCap}
        defaultOpen={hasSkills}
        empty={!hasSkills}
      >
        {skillGap        && <SkillGapIntelligencePanel skillGapIntelligence={skillGap} />}
        {skillPortfolio  && <SkillPortfolioPanel portfolio={skillPortfolio} />}
      </ProtectionGroup>

      {/* ── 3. Internal mobility & career resilience ───────────────────────── */}
      <ProtectionGroup
        title="Internal mobility & resilience"
        subtitle="Pivot options inside your company + your overall career resilience"
        accentColor="#14b8a6"
        icon={Compass}
        defaultOpen={hasMobility}
        empty={!hasMobility}
      >
        {careerConfidence  && <CareerConfidencePanel confidence={careerConfidence} />}
        {careerContingency && <CareerContingencyPanel contingencyPlan={careerContingency} />}
      </ProtectionGroup>

      {/* ── 4. Job market liquidity & escape paths ─────────────────────────── */}
      <ProtectionGroup
        title="Job market liquidity"
        subtitle="How quickly someone with your role/skills is being hired right now"
        accentColor="#06b6d4"
        icon={ArrowUpRight}
        defaultOpen={hasMarket}
        empty={!hasMarket}
      >
        {roleMarketDemand && <RoleMarketDemandPanel roleMarketDemand={roleMarketDemand} />}
        {/* CareerPortfolioPanel surfaces escape-path / alternative-role analysis */}
        <CareerPortfolioPanel result={result} />
      </ProtectionGroup>

      {/* ── 5. Personal context — velocity, visa, financial runway ─────────── */}
      <ProtectionGroup
        title="Personal context"
        subtitle="Career velocity, visa dependency, financial runway — only if relevant"
        accentColor="#8b5cf6"
        icon={User2}
        defaultOpen={false}
        empty={!hasPersonal}
      >
        {careerVelocity && <CareerVelocityPanel velocity={careerVelocity} />}
        {visaRisk && visaRisk.dependencyScore > 10 && <VisaRiskPanel visaRisk={visaRisk} />}
        {userRunway && <UserFinancialRunwayPanel userFinancialRunway={userRunway} />}
      </ProtectionGroup>

      {/* ── 6. Footer note — gentle progressive-disclosure hint ────────────── */}
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
