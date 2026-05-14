// v3/IntelligenceTab.tsx — v33 UX redesign
//
// IMPORTANT: in v33 this tab is repurposed as the *Intelligence & Transparency*
// tab (5th tab in the new IA). Career-focused signals (skills, velocity, visa,
// runway) moved to ProtectionTab. Company-facing intelligence is consolidated
// into the new WorkforceStabilityCard + FinancialHealthCard signal-compression
// blocks at the top.
//
// Priority order:
//   1. Workforce Stability     — compressed (was: hiring/layoffs/headcount/glassdoor)
//   2. Financial Health        — compressed (was: stock/revenue/funding/SEC)
//   3. Ground Truth Signals    — WARN, SEC, BLS (RED, open if any active)
//   4. Market Signals          — role demand, peer contagion, macro
//   5. Cross-source event search
//   6. Methodology & transparency — collapsed (deep-tier)

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, ShieldAlert, TrendingUp, ChevronDown,
} from 'lucide-react';
import type { TabProps } from '../common/types';
import WARNSignalPanel from '../common/WARNSignalPanel';
import SECEnhancedPanel from '../common/SECEnhancedPanel';
import BLSMacroPanel from '../common/BLSMacroPanel';
import RoleMarketDemandPanel from '../common/RoleMarketDemandPanel';
import PeerContagionPanel from '../common/PeerContagionPanel';
import MacroRiskPanel from '../common/MacroRiskPanel';
import { CollapsibleSection } from '../common/CollapsibleSection';
import { TransparencyTab } from '../TransparencyTab';
import { EventSearchPanel } from '../../audit/EventSearchPanel';
import WorkforceStabilityCard from '../common/WorkforceStabilityCard';
import FinancialHealthCard from '../common/FinancialHealthCard';

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
  const { result } = props;
  const r = result as any;

  const warnSignal     = r.warnSignal;
  const secEnhanced    = r.secEnhancedSignals;
  const blsMacro       = r.blsMacroSignal;
  const roleMarket     = r.roleMarketDemand;
  const peerContagion  = r.peerContagion;
  const macroRisk      = r.macroEconomicRisk;

  const hasGroundTruth  = Boolean(warnSignal?.hasActiveWARN || secEnhanced || blsMacro);
  const hasMarket       = Boolean(roleMarket || peerContagion || macroRisk);

  const warnActiveCount = warnSignal?.hasActiveWARN ? 1 : 0;
  const groundTruthBadge = hasGroundTruth
    ? (warnActiveCount > 0 ? `${warnActiveCount} WARN ACTIVE` : 'REGULATORY')
    : undefined;

  return (
    <div className="flex flex-col gap-3">

      {/* ── v33: Workforce Stability (signal-compressed block) ────────────── */}
      {/* Consolidates hiring freeze + layoffs + headcount + Glassdoor velocity
         into one expandable verdict card. Drill-down reveals each underlying
         signal so power users still reach the same data, faster. */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <WorkforceStabilityCard result={result} defaultOpen={false} />
      </motion.div>

      {/* ── v33: Financial Health (signal-compressed block) ──────────────── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}>
        <FinancialHealthCard result={result} defaultOpen={false} />
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

      {/* ── Cross-source event search ─────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
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

      {/* ── Methodology & transparency (deep tier, collapsed) ────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.20 }}
        className="space-y-2"
      >
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
