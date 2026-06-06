// AnalysisCompanyTab.tsx — Analysis Mode Tab 2
//
// Company intelligence: health, risk signals, market environment.
// Reuses CompanyPulseCard + PersonalizedMarketEnvironment + ParentRiskCard.
// No raw SEC/BLS panels, no signal attribution waterfall.

import React from 'react';
import { motion } from 'framer-motion';
import { Siren, Timer, TrendingUp } from 'lucide-react';
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

export const AnalysisCompanyTab: React.FC<Props> = ({ result, companyData, onSwitchToBeast }) => {
  const r = result as any;
  const warnSignal = r.warnSignal as
    | { hasActiveWARN: boolean; daysUntilLayoff: number | null; totalAffectedCount: number; affectedLocations: string[] }
    | undefined;
  const showWarn = warnSignal?.hasActiveWARN === true;
  const warnDaysLeft = warnSignal?.daysUntilLayoff ?? null;
  const warnAffected = warnSignal?.totalAffectedCount ?? 0;

  const hasMarket = Boolean(r.roleMarketDemand || r.peerContagion || r.macroEconomicRisk || r.blsMacroSignal);
  const hasParent = r.parentPropagation && r.parentPropagation.propagationRisk?.level !== 'negligible';

  return (
    <div className="flex flex-col gap-3 py-2">

      {/* T1: Company Pulse — unified workforce + financial verdict */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
        <CompanyPulseCard result={result} companyData={companyData} defaultOpen={true} />
      </motion.div>

      {/* WARN inline card — short version (ground truth, always show) */}
      {showWarn && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
          className="rounded-2xl p-4"
          style={{
            background: 'linear-gradient(135deg, rgba(220,38,38,0.13), rgba(153,27,27,0.08))',
            border: '2px solid rgba(220,38,38,0.45)',
          }}
        >
          <div className="flex items-start gap-3 mb-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(220,38,38,0.18)', border: '1px solid rgba(220,38,38,0.35)' }}>
              <Siren className="w-4 h-4" style={{ color: '#fca5a5' }} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-black tracking-widest px-2 py-0.5 rounded"
                style={{ background: 'rgba(220,38,38,0.22)', color: '#dc2626' }}>
                OFFICIAL LAYOFF NOTICE FILED
              </span>
              <p className="text-[13px] font-bold mt-1 leading-snug" style={{ color: 'rgba(255,255,255,0.92)' }}>
                {warnDaysLeft !== null && warnDaysLeft > 0
                  ? `Confirmed layoff notice — ${warnDaysLeft} days remaining`
                  : 'An official layoff notice was filed for your company'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap mb-3">
            {warnAffected > 0 && (
              <div className="rounded-xl px-3 py-2" style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.18)' }}>
                <p className="text-[10px] font-bold tracking-widest mb-0.5" style={{ color: 'rgba(220,38,38,0.70)' }}>AFFECTED</p>
                <p className="text-[13px] font-black" style={{ color: '#fca5a5' }}>{warnAffected.toLocaleString()} employees</p>
              </div>
            )}
            {warnDaysLeft !== null && warnDaysLeft > 0 && (
              <div className="rounded-xl px-3 py-2" style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.18)' }}>
                <p className="text-[10px] font-bold tracking-widest mb-0.5" style={{ color: 'rgba(220,38,38,0.70)' }}>COUNTDOWN</p>
                <p className="text-[13px] font-black flex items-center gap-1" style={{ color: '#fca5a5' }}>
                  <Timer className="w-3.5 h-3.5 flex-shrink-0" />
                  {warnDaysLeft} days
                </p>
              </div>
            )}
          </div>
          <p className="text-[11px] font-semibold" style={{ color: '#fca5a5' }}>
            Update your résumé today. Activate your network this week. Do not wait for an individual notice.
          </p>
        </motion.div>
      )}

      {/* Parent company risk */}
      {hasParent && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}>
          <ParentRiskCard parentPropagation={r.parentPropagation} />
        </motion.div>
      )}

      {/* Market Environment */}
      {hasMarket && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <div className="rounded-2xl overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-2 px-4 py-3"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <TrendingUp className="w-3.5 h-3.5" style={{ color: '#f59e0b' }} />
              <span className="text-[11px] font-black tracking-[0.08em] uppercase" style={{ color: 'rgba(255,255,255,0.65)' }}>
                Industry & Market
              </span>
            </div>
            <div className="p-3">
              <PersonalizedMarketEnvironment result={result} companyData={companyData} />
            </div>
          </div>
        </motion.div>
      )}

      {/* Depth invite */}
      <div className="text-center pt-2 pb-2">
        <button type="button" onClick={onSwitchToBeast}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.32)' }}>Explore full intelligence </span>
          <span style={{ fontSize: '12px', color: '#00d4e0', fontWeight: 600 }}>→</span>
        </button>
      </div>

    </div>
  );
};

export default AnalysisCompanyTab;
