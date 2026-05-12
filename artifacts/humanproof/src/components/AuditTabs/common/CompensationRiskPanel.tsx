// CompensationRiskPanel.tsx — v14.0
// Pay position vs. market + cascade stage indicator.

import React from "react";
import { motion } from "framer-motion";
import { DollarSign, AlertTriangle, TrendingDown, CheckCircle } from "lucide-react";
import type { CompensationRiskResult, CompensationCascadeStage } from "@/services/compensationRiskEngine";

interface CompensationRiskPanelProps {
  compensation: CompensationRiskResult;
}

const CASCADE_COLORS: Record<CompensationCascadeStage, { text: string; bg: string; border: string }> = {
  NORMAL:          { text: '#10b981', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.22)' },
  HIRING_FREEZE:   { text: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.22)' },
  CONTRACTOR_CUTS: { text: '#f97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.22)' },
  PAY_FREEZE:      { text: '#ef4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.22)' },
  PAY_CUT:         { text: '#dc2626', bg: 'rgba(220,38,38,0.10)',   border: 'rgba(220,38,38,0.30)' },
  PRE_LAYOFF:      { text: '#b91c1c', bg: 'rgba(185,28,28,0.12)',   border: 'rgba(185,28,28,0.35)' },
};

const STAGE_STEPS: CompensationCascadeStage[] = [
  'NORMAL', 'HIRING_FREEZE', 'CONTRACTOR_CUTS', 'PAY_FREEZE', 'PAY_CUT', 'PRE_LAYOFF',
];

const STAGE_SHORT: Record<CompensationCascadeStage, string> = {
  NORMAL:          'Normal',
  HIRING_FREEZE:   'Freeze',
  CONTRACTOR_CUTS: 'Contractor Cuts',
  PAY_FREEZE:      'Pay Freeze',
  PAY_CUT:         'Pay Cut',
  PRE_LAYOFF:      'Pre-Layoff',
};

const CompensationRiskPanel: React.FC<CompensationRiskPanelProps> = ({ compensation }) => {
  const colors = CASCADE_COLORS[compensation.cascadeStage];
  const currentStageIdx = STAGE_STEPS.indexOf(compensation.cascadeStage);
  const layoffProbPct = Math.round(compensation.layoffProbabilityAt12mo * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4"
      style={{ background: colors.bg, border: `1px solid ${colors.border}` }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4" style={{ color: colors.text }} />
          <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>Compensation Risk</span>
        </div>
        <span
          className="text-[10px] font-black tracking-widest px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ background: `${colors.text}18`, color: colors.text, border: `1px solid ${colors.text}30` }}
        >
          {compensation.compensationRiskScore}/100
        </span>
      </div>

      {/* Cascade stage bar */}
      <div className="mb-3">
        <div className="text-[10px] font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
          PAY-CUT CASCADE STAGE
        </div>
        <div className="flex gap-0.5">
          {STAGE_STEPS.map((stage, idx) => (
            <div
              key={stage}
              className="flex-1 h-1.5 rounded-full"
              style={{
                background: idx <= currentStageIdx
                  ? idx === currentStageIdx ? colors.text : `${colors.text}55`
                  : 'rgba(255,255,255,0.10)',
              }}
            />
          ))}
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Normal</span>
          <span className="text-[9px] font-semibold" style={{ color: colors.text }}>
            {STAGE_SHORT[compensation.cascadeStage]}
          </span>
          <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Pre-Layoff</span>
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="rounded-lg p-2 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div className="text-sm font-bold" style={{ color: layoffProbPct >= 50 ? '#ef4444' : 'rgba(255,255,255,0.9)' }}>
            {layoffProbPct}%
          </div>
          <div className="text-[10px] opacity-45 mt-0.5">12mo Prob.</div>
        </div>
        <div className="rounded-lg p-2 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.9)' }}>
            {compensation.marketDeltaPct !== null
              ? `${compensation.marketDeltaPct > 0 ? '+' : ''}${compensation.marketDeltaPct}%`
              : '—'}
          </div>
          <div className="text-[10px] opacity-45 mt-0.5">vs. Market</div>
        </div>
        <div className="rounded-lg p-2 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.9)' }}>
            {compensation.vestingProtection}
          </div>
          <div className="text-[10px] opacity-45 mt-0.5">Vesting</div>
        </div>
      </div>

      {/* Stage label */}
      <p className="text-[11px] leading-relaxed mb-2.5" style={{ color: 'rgba(255,255,255,0.65)' }}>
        {compensation.cascadeStageLabel}
      </p>

      {/* Pay position */}
      <div className="rounded-lg p-2.5 mb-2.5" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <div className="flex items-center gap-1.5 mb-1">
          {compensation.payPosition === 'HIGHLY_ABOVE_MARKET' || compensation.payPosition === 'ABOVE_MARKET'
            ? <AlertTriangle className="w-3 h-3" style={{ color: '#f59e0b' }} />
            : <CheckCircle className="w-3 h-3" style={{ color: '#10b981' }} />
          }
          <span className="text-[11px] font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>
            {compensation.payPositionLabel}
          </span>
        </div>
        {compensation.estimatedMarketMedian && (
          <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.40)' }}>
            Est. market median: {compensation.estimatedMarketMedian.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
          </div>
        )}
      </div>

      {/* Next cascade signals */}
      {compensation.nextCascadeSignals.length > 0 && compensation.cascadeStage !== 'PRE_LAYOFF' && (
        <div>
          <div className="text-[10px] font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
            WATCH FOR NEXT STAGE
          </div>
          <div className="space-y-1">
            {compensation.nextCascadeSignals.slice(0, 2).map((sig, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <TrendingDown className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.30)' }} />
                <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.50)' }}>{sig}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default CompensationRiskPanel;
