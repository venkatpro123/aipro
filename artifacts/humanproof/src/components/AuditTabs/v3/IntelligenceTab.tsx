// v3/IntelligenceTab.tsx — v34.0 UX redesign
//
// COMPANY tab (the 2nd tab in the v34 IA). Despite the filename, this tab is
// the company-facing intelligence surface. Renamed in the IA as "Company".
//
// Render order (decision-driven, Tier-labeled):
//   1. CompanyPulseCard            (T1)  ← unified Workforce + Financial verdict
//   2. Ground Truth Signals        (T2)  ← WARN, SEC, BLS — open if any active
//   3. Market Environment          (T3)  ← role demand, peer contagion, macro
//   4. Cross-source event search   (T3)  ← raw event timeline
//
// The previous standalone WorkforceStabilityCard + FinancialHealthCard are now
// merged into CompanyPulseCard at the top. Methodology / transparency moved to
// the Intelligence tab where it belongs (it's a transparency surface, not a
// company surface).

import React from 'react';
import { motion } from 'framer-motion';
import { Search, ShieldAlert, TrendingUp } from 'lucide-react';

/** GAP H: Small freshness/source indicator shown beside heuristic signal blocks. */
const HeuristicBadge: React.FC = () => (
  <span
    title="Estimated baseline — calibrated from May 2026 data, not a live API feed"
    className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
    style={{ background: 'rgba(148,163,184,0.12)', color: '#94a3b8', border: '1px solid rgba(148,163,184,0.22)' }}
  >
    <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: '#94a3b8' }} />
    est. baseline
  </span>
);
import type { TabProps } from '../common/types';
import WARNSignalPanel from '../common/WARNSignalPanel';
import SECEnhancedPanel from '../common/SECEnhancedPanel';
import BLSMacroPanel from '../common/BLSMacroPanel';
import RoleMarketDemandPanel from '../common/RoleMarketDemandPanel';
import PeerContagionPanel from '../common/PeerContagionPanel';
import MacroRiskPanel from '../common/MacroRiskPanel';
import { EventSearchPanel, isEventSearchAvailable } from '../../audit/EventSearchPanel';
import CompanyPulseCard from '../common/CompanyPulseCard';
import AdaptiveBlock from '../common/AdaptiveBlock';
import { ParentRiskCard } from '../common/ParentRiskCard';

// ── Main Export ───────────────────────────────────────────────────────────────

export const IntelligenceTab: React.FC<TabProps> = (props) => {
  const { result, companyData } = props;
  const r = result as any;

  const warnSignal     = r.warnSignal;
  const secEnhanced    = r.secEnhancedSignals;
  const blsMacro       = r.blsMacroSignal;
  const roleMarket     = r.roleMarketDemand;
  const peerContagion  = r.peerContagion;
  const macroRisk      = r.macroEconomicRisk;

  // Guard against empty objects from failed pipeline steps — {} is truthy but has no data.
  const secHasContent = Boolean(
    secEnhanced &&
    typeof secEnhanced === 'object' &&
    Object.keys(secEnhanced).length > 0 &&
    ((secEnhanced as any).warnSignals?.length || (secEnhanced as any).layoffHistory?.length || (secEnhanced as any).fcfSignal),
  );
  const hasGroundTruth = Boolean(warnSignal?.hasActiveWARN || secHasContent || blsMacro);
  const hasMarket       = Boolean(roleMarket || peerContagion || macroRisk);

  const warnActiveCount = warnSignal?.hasActiveWARN ? 1 : 0;
  const groundTruthBadge = hasGroundTruth
    ? (warnActiveCount > 0 ? 'WARN ACTIVE' : 'REGULATORY')
    : undefined;

  return (
    <div className="flex flex-col gap-3">

      {/* ── T1: Unified Company Pulse (Workforce + Financial verdict) ────── */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
        <CompanyPulseCard result={result} companyData={companyData} defaultOpen={false} />
      </motion.div>

      {/* Parent company risk — only when subsidiary relationship detected */}
      {r.parentPropagation && r.parentPropagation.propagationRisk?.level !== 'negligible' && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}>
          <ParentRiskCard parentPropagation={r.parentPropagation} />
        </motion.div>
      )}

      {/* ── T2: Ground Truth Signals ──────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <AdaptiveBlock
          title="Ground truth signals"
          subtitle="Legally filed or regulatory-sourced — highest confidence"
          icon={ShieldAlert}
          tier={2}
          accentColor={warnActiveCount > 0 ? '#dc2626' : '#f97316'}
          defaultOpen={hasGroundTruth}
          badge={groundTruthBadge}
          badgeColor={warnActiveCount > 0 ? '#dc2626' : '#f97316'}
          empty={!hasGroundTruth}
        >
          {warnSignal    && <WARNSignalPanel warnSignal={warnSignal} />}
          {secHasContent && <SECEnhancedPanel secEnhancedSignals={secEnhanced} />}
          {blsMacro      && <BLSMacroPanel blsMacroSignal={blsMacro} />}
        </AdaptiveBlock>
      </motion.div>

      {/* ── T3: Market Environment ─────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <AdaptiveBlock
          title="Market environment"
          subtitle={<span className="flex items-center gap-1.5">Role demand, peer contagion, macro risk <HeuristicBadge /></span>}
          icon={TrendingUp}
          tier={3}
          accentColor="#f59e0b"
          defaultOpen={false}
          empty={!hasMarket}
        >
          {roleMarket    && <RoleMarketDemandPanel roleMarketDemand={roleMarket} />}
          {peerContagion && <PeerContagionPanel contagion={peerContagion} />}
          {macroRisk     && <MacroRiskPanel macro={macroRisk} />}
        </AdaptiveBlock>
      </motion.div>

      {/* ── T3: Cross-source event search ──────────────────────────────────── */}
      {/* Hidden when Meilisearch isn't provisioned. The panel itself renders a
          "Set VITE_MEILISEARCH_HOST..." config callout when missing, but that
          callout reads as "the platform is broken" to end users. Omit the whole
          block until Meilisearch is configured — operators get the env-var hint
          via the panel's own dev-mode rendering elsewhere. */}
      {isEventSearchAvailable() && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
          <AdaptiveBlock
            title="Cross-source event search"
            subtitle="Raw timeline of company events from news + filings + signals"
            icon={Search}
            tier={3}
            accentColor="#22d3ee"
            defaultOpen={false}
          >
            <div className="px-1">
              <EventSearchPanel />
            </div>
          </AdaptiveBlock>
        </motion.div>
      )}

    </div>
  );
};

export default IntelligenceTab;
