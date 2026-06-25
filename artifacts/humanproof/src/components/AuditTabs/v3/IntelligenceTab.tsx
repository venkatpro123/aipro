// v3/IntelligenceTab.tsx — COMPANY tab (2nd tab in the IA).
//
// Render order:
//   1. CompanyPulseCard          ← company situation verdict
//   2. Layoff notice             ← only when officially filed
//   3. Parent company risk       ← only when subsidiary relationship detected
//   4. Company Story             ← chronological event timeline
//   5. Peer Risk Comparison      ← how company ranks vs similar companies
//   6. Event search               ← search company news (collapsed)

import React from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';

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

import type { TabProps } from '../common/types';
import WARNSignalPanel from '../common/WARNSignalPanel';
import { EventSearchPanel, isEventSearchAvailable } from '../../audit/EventSearchPanel';
import CompanyPulseCard from '../common/CompanyPulseCard';
import AdaptiveBlock from '../common/AdaptiveBlock';
import { ParentRiskCard } from '../common/ParentRiskCard';
import { CompanyTimelineCard } from '../common/CompanyTimelineCard';
import { PeerComparisonCard } from '../common/PeerComparisonCard';
import IntelligenceBriefPanel from '../common/IntelligenceBriefPanel';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

// ── Main Export ───────────────────────────────────────────────────────────────

export const IntelligenceTab: React.FC<TabProps> = (props) => {
  const { result, companyData } = props;
  const r = result as any;

  const warnSignal = r.warnSignal;

  return (
    <div className="flex flex-col gap-3">

      {/* ── Company situation — opens immediately so the verdict is visible */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
        <CompanyPulseCard result={result} companyData={companyData} defaultOpen={true} />
      </motion.div>

      {/* ── Layoff notice — only when an official notice has been filed */}
      {warnSignal?.hasActiveWARN && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <WARNSignalPanel warnSignal={warnSignal} />
          <ActionHook text="Update your résumé and reach out to your contacts now. Official layoff notices usually mean layoffs happen 60–90 days later — use this time." />
        </motion.div>
      )}

      {/* ── Parent company risk — only when subsidiary relationship detected */}
      {r.parentPropagation && r.parentPropagation.propagationRisk?.level !== 'negligible' && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }}>
          <ParentRiskCard parentPropagation={r.parentPropagation} />
        </motion.div>
      )}

      {/* ── Intelligence Brief — Phase 7 Visual Storytelling: AI strategic narrative */}
      {r.intelligenceBrief && (
        <ScrollReveal>
          <IntelligenceBriefPanel
            intelligenceBrief={r.intelligenceBrief}
            confidence={result.confidencePercent}
            freshnessTier={(result as any).signalQuality?.freshnessTier}
            companyName={result.companyName}
          />
        </ScrollReveal>
      )}

      {/* ── Company Story — chronological event timeline */}
      <ScrollReveal><CompanyTimelineCard result={result} companyData={companyData} /></ScrollReveal>

      {/* ── Peer Risk Comparison — ranks company vs similar companies */}
      <ScrollReveal><PeerComparisonCard result={result} companyData={companyData} /></ScrollReveal>

      {/* ── Event search — collapsed by default */}
      {isEventSearchAvailable() && (
        <ScrollReveal>
          <AdaptiveBlock
            title="Search company news"
            subtitle="Search news, filings, and other public sources about this company"
            icon={Search}
            tier={3}
            accentColor="#22d3ee"
            defaultOpen={false}
          >
            <div className="px-1">
              <EventSearchPanel />
            </div>
          </AdaptiveBlock>
        </ScrollReveal>
      )}

    </div>
  );
};

export default IntelligenceTab;
