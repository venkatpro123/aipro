// SECEnhancedPanel.tsx — v16.0
// SEC Enhanced Financial Signals: FCF, earnings surprise, analyst consensus, price target.

import React from "react";
import { motion } from "framer-motion";
import { BarChart2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { SECEnhancedRiskResult, EarningsSurpriseCategory, AnalystConsensus } from "../../../services/secEnhancedService";

interface SECEnhancedPanelProps {
  secEnhancedSignals: SECEnhancedRiskResult | undefined;
}

const EARNINGS_CONFIG: Record<EarningsSurpriseCategory, { label: string; color: string; bg: string }> = {
  massive_miss:    { label: 'Massive Miss',    color: '#ef4444', bg: 'rgba(239,68,68,0.12)'   },
  significant_miss:{ label: 'Significant Miss',color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  slight_miss:     { label: 'Slight Miss',     color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  in_line:         { label: 'In Line',         color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
  slight_beat:     { label: 'Slight Beat',     color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  beat:            { label: 'Beat',            color: '#10b981', bg: 'rgba(16,185,129,0.14)' },
};

const ANALYST_CONFIG: Record<AnalystConsensus, { label: string; color: string; bg: string }> = {
  strong_buy:  { label: 'Strong Buy',  color: '#10b981', bg: 'rgba(16,185,129,0.12)'  },
  buy:         { label: 'Buy',         color: '#34d399', bg: 'rgba(52,211,153,0.10)'  },
  hold:        { label: 'Hold',        color: '#f59e0b', bg: 'rgba(245,158,11,0.10)'  },
  underperform:{ label: 'Underperform',color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  sell:        { label: 'Sell',        color: '#ef4444', bg: 'rgba(239,68,68,0.12)'   },
  not_rated:   { label: 'Not Rated',   color: '#6b7280', bg: 'rgba(107,114,128,0.10)'},
};

const COHORT_CONFIG = {
  DISTRESS:   { label: 'DISTRESS',   color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.28)'   },
  EFFICIENCY: { label: 'EFFICIENCY', color: '#3b82f6', bg: 'rgba(59,130,246,0.10)',  border: 'rgba(59,130,246,0.24)'  },
  WAVE:       { label: 'WAVE',       color: '#f59e0b', bg: 'rgba(245,158,11,0.10)',  border: 'rgba(245,158,11,0.24)'  },
};

function fcfColor(margin: number): string {
  if (margin > 0.05)  return '#10b981';
  if (margin >= -0.05) return '#f59e0b';
  return '#ef4444';
}

const SECEnhancedPanel: React.FC<SECEnhancedPanelProps> = ({ secEnhancedSignals }) => {
  if (!secEnhancedSignals) return null;
  if (secEnhancedSignals.financialSignals.dataSourceQuality === 'not_available') return null;

  const { financialSignals, riskAdjustment, riskAdjustmentNote } = secEnhancedSignals;
  const earningsConf = financialSignals.earningsSurpriseCategory
    ? EARNINGS_CONFIG[financialSignals.earningsSurpriseCategory]
    : null;
  const analystConf = financialSignals.analystConsensusRating
    ? ANALYST_CONFIG[financialSignals.analystConsensusRating]
    : null;
  const cohortConf = financialSignals.cohortSignal
    ? COHORT_CONFIG[financialSignals.cohortSignal]
    : null;

  const adjColor = riskAdjustment > 0 ? '#ef4444' : riskAdjustment < 0 ? '#10b981' : '#6b7280';
  const adjSign  = riskAdjustment > 0 ? '+' : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.10)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4" style={{ color: 'var(--alpha-text-50)' }} />
          <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>
            SEC Enhanced Financial Signals
          </span>
        </div>
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
          style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--alpha-text-45)' }}
        >
          {financialSignals.dataSourceQuality.replace('_', ' ')}
        </span>
      </div>

      {/* Metric rows */}
      <div className="space-y-2 mb-3">

        {/* Free Cash Flow Margin */}
        <div className="flex justify-between items-center text-sm rounded-lg px-2.5 py-2"
          style={{ background: 'rgba(255,255,255,0.04)' }}>
          <span className="text-[11px]" style={{ color: 'var(--alpha-text-50)' }}>Free Cash Flow Margin</span>
          {financialSignals.freeCashFlowMargin !== null ? (
            <span className="text-[11px] font-bold" style={{ color: fcfColor(financialSignals.freeCashFlowMargin) }}>
              {(financialSignals.freeCashFlowMargin * 100).toFixed(1)}%
            </span>
          ) : (
            <span className="text-[10px]" style={{ color: 'var(--alpha-text-30)' }}>Not available</span>
          )}
        </div>

        {/* Price Target Change */}
        {financialSignals.priceTargetChangePct !== null && (
          <div className="flex justify-between items-center text-sm rounded-lg px-2.5 py-2"
            style={{ background: 'rgba(255,255,255,0.04)' }}>
            <span className="text-[11px]" style={{ color: 'var(--alpha-text-50)' }}>Price Target Change (90d)</span>
            <div className="flex items-center gap-1">
              {financialSignals.priceTargetChangePct > 0
                ? <TrendingUp className="w-3 h-3" style={{ color: '#10b981' }} />
                : financialSignals.priceTargetChangePct < 0
                  ? <TrendingDown className="w-3 h-3" style={{ color: '#ef4444' }} />
                  : <Minus className="w-3 h-3" style={{ color: '#6b7280' }} />
              }
              <span className="text-[11px] font-bold" style={{
                color: financialSignals.priceTargetChangePct > 0 ? '#10b981'
                  : financialSignals.priceTargetChangePct < 0 ? '#ef4444' : '#6b7280'
              }}>
                {financialSignals.priceTargetChangePct > 0 ? '+' : ''}{financialSignals.priceTargetChangePct.toFixed(1)}%
              </span>
            </div>
          </div>
        )}

        {/* Cash Flow Positive tag */}
        {financialSignals.isCashFlowPositive !== null && (
          <div className="flex justify-between items-center rounded-lg px-2.5 py-2"
            style={{ background: 'rgba(255,255,255,0.04)' }}>
            <span className="text-[11px]" style={{ color: 'var(--alpha-text-50)' }}>Cash Flow</span>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={financialSignals.isCashFlowPositive
                ? { background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' }
                : { background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.22)' }
              }
            >
              {financialSignals.isCashFlowPositive ? 'POSITIVE' : 'NEGATIVE'}
            </span>
          </div>
        )}
      </div>

      {/* Earnings Surprise + Analyst row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
        {earningsConf && (
          <div className="rounded-lg p-2 text-center" style={{ background: earningsConf.bg }}>
            <div className="text-[10px] font-bold" style={{ color: earningsConf.color }}>
              {earningsConf.label}
            </div>
            <div className="text-[10px] opacity-50 mt-0.5">Earnings Surprise</div>
          </div>
        )}
        {analystConf && (
          <div className="rounded-lg p-2 text-center" style={{ background: analystConf.bg }}>
            <div className="text-[10px] font-bold" style={{ color: analystConf.color }}>
              {analystConf.label}
            </div>
            <div className="text-[10px] opacity-50 mt-0.5">Analyst Consensus</div>
          </div>
        )}
      </div>

      {/* Cohort signal */}
      {cohortConf && (
        <div className="flex items-center gap-2 rounded-lg px-2.5 py-2 mb-2.5"
          style={{ background: cohortConf.bg, border: `1px solid ${cohortConf.border}` }}>
          <span className="text-[10px] font-semibold" style={{ color: 'var(--alpha-text-50)' }}>Cohort signal:</span>
          <span className="text-[10px] font-black tracking-widest" style={{ color: cohortConf.color }}>
            {cohortConf.label}
          </span>
        </div>
      )}

      {/* Risk adjustment */}
      {riskAdjustment !== 0 && (
        <div className="rounded-lg p-2.5 mb-2.5" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-semibold" style={{ color: 'var(--alpha-text-50)' }}>
              Score Adjustment
            </span>
            <span className="text-[11px] font-black" style={{ color: adjColor }}>
              {adjSign}{riskAdjustment} pts
            </span>
          </div>
          <p className="text-[10px] leading-relaxed" style={{ color: 'var(--alpha-text-45)' }}>
            {riskAdjustmentNote}
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default SECEnhancedPanel;
