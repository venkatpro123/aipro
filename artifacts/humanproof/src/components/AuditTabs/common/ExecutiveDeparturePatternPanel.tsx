// ExecutiveDeparturePatternPanel.tsx — v16.0
// Executive departure pattern analysis — turnaround hires, exodus signals, equity acceleration.

import React from "react";
import { motion } from "framer-motion";
import { UserMinus, AlertTriangle, Clock, TrendingDown } from "lucide-react";
import type { ExecutiveDeparturePatternResult } from "../../../services/executiveDeparturePatternEngine";

interface ExecutiveDeparturePatternPanelProps {
  executiveDeparturePattern: ExecutiveDeparturePatternResult | undefined;
}

const TIER_CONFIG = {
  CRITICAL: { color: '#ef4444', bg: 'rgba(239,68,68,0.09)',   border: 'rgba(239,68,68,0.24)'   },
  HIGH:     { color: '#f97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.22)'  },
  MODERATE: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.22)'  },
  LOW:      { color: '#10b981', bg: 'rgba(16,185,129,0.06)', border: 'rgba(16,185,129,0.18)'  },
  NONE:     { color: '#6b7280', bg: 'rgba(107,114,128,0.05)', border: 'rgba(107,114,128,0.14)' },
};

const ExecutiveDeparturePatternPanel: React.FC<ExecutiveDeparturePatternPanelProps> = ({ executiveDeparturePattern }) => {
  if (!executiveDeparturePattern) return null;
  if (executiveDeparturePattern.patternRiskTier === 'NONE') return null;

  const { color, bg, border } = TIER_CONFIG[executiveDeparturePattern.patternRiskTier];
  const restructuringPct = Math.round(executiveDeparturePattern.estimatedRestructuringProbability * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4"
      style={{ background: bg, border: `1px solid ${border}` }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <UserMinus className="w-4 h-4" style={{ color }} />
          <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>
            Executive Departure Pattern
          </span>
        </div>
        <span
          className="text-[10px] font-black tracking-widest px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
        >
          {executiveDeparturePattern.patternRiskTier}
        </span>
      </div>

      {/* Dominant pattern */}
      <p className="text-sm font-bold mb-1" style={{ color }}>
        {executiveDeparturePattern.dominantPattern}
      </p>
      <p className="text-[11px] leading-relaxed mb-3" style={{ color: 'rgba(255,255,255,0.60)' }}>
        {executiveDeparturePattern.patternDescription}
      </p>

      {/* Active signal badges — only show when active */}
      <div className="flex flex-wrap gap-2 mb-3">
        {executiveDeparturePattern.exodusSignalActive && (
          <span
            className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full"
            style={{ background: 'rgba(239,68,68,0.14)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.28)' }}
          >
            <AlertTriangle className="w-3 h-3" />
            Exodus Signal Active
          </span>
        )}
        {executiveDeparturePattern.turnaroundHireSignal && (
          <span
            className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full"
            style={{ background: 'rgba(249,115,22,0.14)', color: '#f97316', border: '1px solid rgba(249,115,22,0.28)' }}
          >
            <TrendingDown className="w-3 h-3" />
            Turnaround Hire
          </span>
        )}
        {executiveDeparturePattern.equityAccelerationSignal && (
          <span
            className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full"
            style={{ background: 'rgba(245,158,11,0.14)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.28)' }}
          >
            <AlertTriangle className="w-3 h-3" />
            Equity Acceleration
          </span>
        )}
      </div>

      {/* Restructuring probability + lead time */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
        <div className="rounded-lg p-2.5 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div
            className="text-sm font-black"
            style={{ color: restructuringPct >= 70 ? '#ef4444' : restructuringPct >= 50 ? '#f97316' : 'rgba(255,255,255,0.9)' }}
          >
            {restructuringPct}%
          </div>
          <div className="text-[10px] opacity-45 mt-0.5">Restructuring probability</div>
        </div>
        {executiveDeparturePattern.leadTimeEstimateDays !== null && (
          <div className="rounded-lg p-2.5 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <div className="flex items-center justify-center gap-1">
              <Clock className="w-3 h-3" style={{ color }} />
              <span className="text-sm font-black" style={{ color }}>
                {executiveDeparturePattern.leadTimeEstimateDays}d
              </span>
            </div>
            <div className="text-[10px] opacity-45 mt-0.5">Est. until announcement</div>
          </div>
        )}
      </div>

      {/* Audit v35: SEC EDGAR ingestion-lag transparency. Users must understand
          that "no recent departures" can mean "departures occurred in the last
          4–7 days but haven't appeared in EDGAR yet." */}
      {executiveDeparturePattern.secFilingLagDays && (
        <div className="flex items-start gap-1.5 mb-2 px-2 py-1 rounded-md" style={{
          background: 'rgba(148,163,184,0.06)',
          border: '1px solid rgba(148,163,184,0.18)',
        }}>
          <Clock className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: 'rgba(148,163,184,0.7)' }} />
          <p className="text-[10px] leading-snug" style={{ color: 'rgba(148,163,184,0.7)' }}>
            SEC Form 4 ingestion lag: typically{' '}
            {executiveDeparturePattern.secFilingLagDays.typicalMin}–
            {executiveDeparturePattern.secFilingLagDays.typicalMax} days from
            departure to EDGAR availability. Departures in the last week may not
            yet be reflected.
          </p>
        </div>
      )}

      {/* Calibration note */}
      <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.32)' }}>
        {executiveDeparturePattern.calibrationNote}
      </p>
    </motion.div>
  );
};

export default ExecutiveDeparturePatternPanel;
