// AnalysisCompanyTab.tsx — Analysis Mode Tab 2
//
// Company intelligence: health, market environment, parent risk.

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import type { HybridResult } from '../../../../types/hybridResult';
import type { CompanyData } from '../../../../data/companyDatabase';
import CompanyPulseCard from '../../common/CompanyPulseCard';
import { PersonalizedMarketEnvironment } from '../../common/PersonalizedMarketEnvironment';
import { ParentRiskCard } from '../../common/ParentRiskCard';

interface Props {
  result: HybridResult;
  companyData: CompanyData;
  emergencyMode: boolean;
  onSwitchToBeast: () => void;
}

export const AnalysisCompanyTab: React.FC<Props> = ({ result, companyData }) => {
  const r = result as any;
  const hasMarket = Boolean(r.roleMarketDemand || r.peerContagion || r.macroEconomicRisk || r.blsMacroSignal);
  const hasParent = r.parentPropagation && r.parentPropagation.propagationRisk?.level !== 'negligible';

  return (
    <div className="flex flex-col gap-3 py-2">

      {/* Company situation verdict */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
        <CompanyPulseCard result={result} companyData={companyData} defaultOpen={true} />
      </motion.div>

      {/* Parent company risk */}
      {hasParent && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}>
          <ParentRiskCard parentPropagation={r.parentPropagation} />
        </motion.div>
      )}

      {/* Industry & Market */}
      {hasMarket && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <div className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--alpha-bg-04)', border: '1px solid var(--alpha-bg-08)' }}>
            <div className="flex items-center gap-2 px-4 py-3"
              style={{ borderBottom: '1px solid var(--alpha-bg-06)' }}>
              <TrendingUp className="w-3.5 h-3.5" style={{ color: 'var(--color-amber500-text)' }} />
              <span className="text-[11px] font-black tracking-[0.08em] uppercase" style={{ color: 'var(--alpha-text-55)' }}>
                Industry & Market
              </span>
            </div>
            <div className="p-3">
              <PersonalizedMarketEnvironment result={result} companyData={companyData} />
            </div>
          </div>
        </motion.div>
      )}

    </div>
  );
};

export default AnalysisCompanyTab;
