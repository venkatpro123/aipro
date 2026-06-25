// MASignalPanel.tsx — v14.0
// M&A risk, integration phase, PE ownership flags.

import React from "react";
import { motion } from "framer-motion";
import { Briefcase, AlertTriangle, Clock, ShieldAlert } from "lucide-react";
import type { MARiskResult, MAEventType } from "@/services/mergerAcquisitionRiskEngine";

interface MASignalPanelProps {
  maRisk: MARiskResult;
}

const EVENT_COLORS: Partial<Record<MAEventType, { text: string; bg: string; border: string }>> = {
  PE_ACQUISITION:      { text: '#dc2626', bg: 'rgba(220,38,38,0.10)',   border: 'rgba(220,38,38,0.30)' },
  STRATEGIC_ACQUISITION: { text: '#f97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.25)' },
  MERGER_EQUALS:       { text: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.22)' },
  SPAC_GO_PRIVATE:     { text: '#ef4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.22)' },
  DIVESTITURE_SOLD:    { text: '#f97316', bg: 'rgba(249,115,22,0.08)',  border: 'rgba(249,115,22,0.22)' },
  SPINOFF:             { text: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.22)' },
  RUMORED:             { text: '#f59e0b', bg: 'rgba(245,158,11,0.06)',  border: 'rgba(245,158,11,0.18)' },
  NONE:                { text: '#10b981', bg: 'rgba(16,185,129,0.06)',  border: 'rgba(16,185,129,0.18)' },
};

const MASignalPanel: React.FC<MASignalPanelProps> = ({ maRisk }) => {
  if (maRisk.maEventType === 'NONE') return null;

  const colors = EVENT_COLORS[maRisk.maEventType] ?? EVENT_COLORS.NONE!;
  const restructuringPct = Math.round(maRisk.restructuringProbability * 100);

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
          <Briefcase className="w-4 h-4" style={{ color: colors.text }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--alpha-text-85)' }}>M&A Risk Signal</span>
        </div>
        <div className="flex items-center gap-1.5">
          {maRisk.peOwnershipRisk && (
            <span className="text-[10px] font-black tracking-widest px-1.5 py-0.5 rounded-full"
              style={{ background: 'rgba(220,38,38,0.20)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.35)' }}>
              PE-OWNED
            </span>
          )}
          <span className="text-[10px] font-black tracking-widest px-2 py-0.5 rounded-full flex-shrink-0"
            style={{ background: `${colors.text}18`, color: colors.text, border: `1px solid ${colors.text}30` }}>
            {maRisk.maRiskScore}/100
          </span>
        </div>
      </div>

      {/* Event label */}
      <p className="text-[11px] font-semibold mb-1" style={{ color: colors.text }}>
        {maRisk.maEventLabel}
      </p>

      {/* Integration phase */}
      {maRisk.integrationPhase !== 'NOT_APPLICABLE' && (
        <div className="flex items-center gap-1.5 mb-3">
          <Clock className="w-3 h-3 flex-shrink-0" style={{ color: maRisk.isInPeakRiskWindow ? '#ef4444' : 'rgba(255,255,255,0.40)' }} />
          <span className="text-[10px]" style={{ color: maRisk.isInPeakRiskWindow ? '#ef4444' : 'rgba(255,255,255,0.55)' }}>
            {maRisk.integrationPhaseLabel}
          </span>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
        <div className="rounded-lg p-2 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div className="text-sm font-bold" style={{ color: restructuringPct >= 60 ? '#ef4444' : 'rgba(255,255,255,0.9)' }}>
            {restructuringPct}%
          </div>
          <div className="text-[10px] opacity-45 mt-0.5">Restructuring Prob.</div>
        </div>
        <div className="rounded-lg p-2 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div className="text-[11px] font-bold" style={{ color: 'var(--alpha-text-92)' }}>
            {maRisk.acquisitionRiskMultiplier.toFixed(1)}×
          </div>
          <div className="text-[10px] opacity-45 mt-0.5">Risk Multiplier</div>
        </div>
      </div>

      {/* Headcount estimate */}
      <div className="rounded-lg p-2.5 mb-2.5" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <div className="flex items-center gap-1.5 mb-1">
          <ShieldAlert className="w-3 h-3 flex-shrink-0" style={{ color: colors.text }} />
          <span className="text-[10px] font-semibold" style={{ color: 'var(--alpha-text-70)' }}>
            Expected Impact
          </span>
        </div>
        <p className="text-[10px]" style={{ color: 'var(--alpha-text-50)' }}>
          {maRisk.headcountReductionEstimate}
        </p>
      </div>

      {/* Peak risk warning */}
      {maRisk.isInPeakRiskWindow && (
        <div className="flex items-start gap-2 rounded-lg p-2.5"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)' }}>
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
          <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(239,68,68,0.85)' }}>
            You are in the peak restructuring window (months 6–18 post-close). This is when the majority of M&A-driven layoffs are executed.
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default MASignalPanel;
