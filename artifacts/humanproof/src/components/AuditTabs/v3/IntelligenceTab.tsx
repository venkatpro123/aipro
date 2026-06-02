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

/** Inline action callout rendered below a signal panel. Answers "what do I do with this?" */
const ActionHook: React.FC<{ text: string }> = ({ text }) => (
  <div
    className="mt-2 flex items-start gap-1.5 rounded-lg px-3 py-2"
    style={{ background: 'rgba(34,211,238,0.05)', border: '1px solid rgba(34,211,238,0.15)' }}
  >
    <span className="text-[10px] font-black flex-shrink-0" style={{ color: '#22d3ee' }}>↳</span>
    <p className="text-[10px] leading-snug italic" style={{ color: 'rgba(34,211,238,0.80)' }}>{text}</p>
  </div>
);

/** GAP H: Small freshness/source indicator shown beside heuristic signal blocks. */
const HeuristicBadge: React.FC = () => (
  <span
    title="Estimated baseline — calibrated from May 2026 data, not a live API feed"
    className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
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
import { PersonalizedMarketEnvironment } from '../common/PersonalizedMarketEnvironment';
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
  //
  // secHasContent: the SECEnhancedRiskResult always exists (computeSECEnhancedRisk
  // never returns null), so we must inspect the real fields.  When dataSourceQuality
  // is 'not_available' there are no actual signals to show — skip the panel.
  // When it is 'estimated' or 'live_sec' AND at least one numeric signal resolved,
  // show it.  Also accept it when riskAdjustment != 0 (signal affected the score).
  const secHasContent = Boolean(
    secEnhanced &&
    typeof secEnhanced === 'object' &&
    secEnhanced.financialSignals?.dataSourceQuality !== 'not_available' &&
    (
      secEnhanced.financialSignals?.freeCashFlowMargin   != null ||
      secEnhanced.financialSignals?.earningsSurpriseCategory != null ||
      secEnhanced.financialSignals?.analystConsensusRating   != null ||
      secEnhanced.financialSignals?.priceTargetChangePct     != null ||
      secEnhanced.financialSignals?.isCashFlowPositive       != null ||
      secEnhanced.riskAdjustment !== 0
    ),
  );

  // BLS macro counts as ground truth only when it's live (not a heuristic baseline).
  // A heuristic baseline is populated for every company and would always expand the
  // section — gate it to 'live' so the "Ground truth signals" label remains honest.
  const blsMacroIsLive = Boolean(blsMacro && !(blsMacro as any).isHeuristic);

  // WARN is the primary ground-truth signal. SEC enhanced (when live) and live BLS
  // are secondary regulatory/macro signals worth showing alongside it.
  const hasGroundTruth = Boolean(warnSignal?.hasActiveWARN || secHasContent || blsMacroIsLive);
  // Market section: role demand, peer contagion, macro risk, and heuristic BLS baseline.
  const hasMarket       = Boolean(roleMarket || peerContagion || macroRisk || (blsMacro && !blsMacroIsLive));

  const warnActiveCount = warnSignal?.hasActiveWARN ? 1 : 0;
  const groundTruthBadge = hasGroundTruth
    ? (warnActiveCount > 0 ? 'WARN ACTIVE' : 'REGULATORY')
    : 'NO RED FLAGS';
  const groundTruthColor = warnActiveCount > 0 ? '#dc2626' : hasGroundTruth ? '#f97316' : '#10b981';

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
          accentColor={groundTruthColor}
          defaultOpen={hasGroundTruth}
          badge={groundTruthBadge}
          badgeColor={groundTruthColor}
          empty={false}
        >
          {/* Honest, useful empty state — the ABSENCE of regulatory filings is
              itself a mildly reassuring signal, not a dead end ("No data"). */}
          {!hasGroundTruth && (
            <div
              className="rounded-lg p-3"
              style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.18)' }}
            >
              <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.72)' }}>
                No active WARN Act filing or SEC material-event disclosure for{' '}
                {companyData?.name ?? 'this company'} this quarter — the absence of regulatory
                red flags is itself a mildly reassuring signal. Ground-truth sources are our
                highest-confidence layer; we re-check them continuously and will surface any new
                filing the moment it appears.
              </p>
            </div>
          )}
          {warnSignal?.hasActiveWARN && (
            <>
              <WARNSignalPanel warnSignal={warnSignal} />
              <ActionHook text="Update your resume and activate your network now. Active WARN filings precede layoffs by 60–90 days — the window to move proactively is open." />
            </>
          )}
          {secHasContent && (
            <>
              <SECEnhancedPanel secEnhancedSignals={secEnhanced} />
              <ActionHook text="FCF trends in SEC filings are a leading indicator of headcount decisions. Monitor the next earnings call date and watch for guidance downgrades." />
            </>
          )}
          {blsMacroIsLive && (
            <>
              <BLSMacroPanel blsMacroSignal={blsMacro} />
              <ActionHook text="Declining JOLTS quits mean fewer external opportunities. Prioritize retention negotiation and internal visibility over job search for the next 30–60 days." />
            </>
          )}
        </AdaptiveBlock>
      </motion.div>

      {/* ── T3: Personalized Market Environment ───────────────────────────── */}
      {/* Replaces the three generic panels (RoleMarketDemand, PeerContagion,
          MacroRisk) with a single context-aware component that personalises every
          insight to the user's role, company, location, skills, and risk score.
          Internally manages its own collapsible sections so AdaptiveBlock is not
          needed here. Hidden entirely when no market data is available. */}
      {hasMarket && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {/* Section header */}
            <div className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5" style={{ color: '#f59e0b' }} />
                <span className="text-[11px] font-black tracking-[0.08em] uppercase" style={{ color: 'rgba(255,255,255,0.65)' }}>
                  Market Environment
                </span>
                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' }}>
                  T3
                </span>
              </div>
              <HeuristicBadge />
            </div>
            {/* Personalized content */}
            <div className="p-3">
              <PersonalizedMarketEnvironment result={result} companyData={companyData} />
            </div>
          </div>
        </motion.div>
      )}

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
