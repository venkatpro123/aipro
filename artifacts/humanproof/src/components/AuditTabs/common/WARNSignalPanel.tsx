// WARNSignalPanel.tsx — v16.0
// WARN Act regulatory filing signal — ground-truth confirmed layoff notice.

import React from "react";
import { motion } from "framer-motion";
import { AlertTriangle, MapPin, Shield } from "lucide-react";
import type { WARNSignal } from "../../../services/warnActService";

interface WARNSignalPanelProps {
  warnSignal: WARNSignal | undefined;
}

const URGENCY_CONFIG = (daysUntil: number | null): { label: string; color: string; bg: string; border: string } => {
  if (daysUntil === null || daysUntil > 60)
    return { label: 'FILED', color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.28)' };
  if (daysUntil <= 0)
    return { label: 'IMMINENT', color: '#dc2626', bg: 'rgba(220,38,38,0.14)', border: 'rgba(220,38,38,0.36)' };
  if (daysUntil <= 14)
    return { label: 'IMMINENT', color: '#dc2626', bg: 'rgba(220,38,38,0.14)', border: 'rgba(220,38,38,0.36)' };
  if (daysUntil <= 30)
    return { label: 'VERY_SOON', color: '#f97316', bg: 'rgba(249,115,22,0.10)', border: 'rgba(249,115,22,0.28)' };
  return { label: 'UPCOMING', color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.28)' };
};

const WARNSignalPanel: React.FC<WARNSignalPanelProps> = ({ warnSignal }) => {
  if (!warnSignal || !warnSignal.hasActiveWARN) return null;

  const urgency = URGENCY_CONFIG(warnSignal.daysUntilLayoff);
  // Guard: affectedLocations and warnFilings may be absent if the signal was
  // constructed from an older version of WARNSignal that didn't populate these arrays.
  const locations = warnSignal.affectedLocations ?? [];
  const filings = warnSignal.warnFilings ?? [];
  const displayedLocations = locations.slice(0, 3);
  const extraLocations = locations.length - displayedLocations.length;
  const filingStates = Array.from(
    new Set(filings.map(f => f.filingState).filter(Boolean))
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4"
      style={{ background: urgency.bg, border: `1px solid ${urgency.border}` }}
    >
      {/* Red banner header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" style={{ color: urgency.color }} />
          <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>
            WARN Act Filing Detected
          </span>
        </div>
        <span
          className="text-[10px] font-black tracking-widest px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ background: `${urgency.color}20`, color: urgency.color, border: `1px solid ${urgency.color}40` }}
        >
          {urgency.label}
        </span>
      </div>

      {/* Ground truth label */}
      <p className="text-[11px] font-semibold mb-3" style={{ color: urgency.color }}>
        {warnSignal.warnRiskLabel}
      </p>

      {/* Key metrics grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
        <div className="rounded-lg p-2.5 text-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <div className="text-sm font-black" style={{ color: urgency.color }}>
            {warnSignal.daysUntilLayoff !== null && warnSignal.daysUntilLayoff > 0
              ? `${warnSignal.daysUntilLayoff}d`
              : 'Imminent'}
          </div>
          <div className="text-[10px] opacity-50 mt-0.5">Until planned layoff</div>
        </div>
        <div className="rounded-lg p-2.5 text-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <div className="text-sm font-black" style={{ color: 'rgba(255,255,255,0.9)' }}>
            {warnSignal.totalAffectedCount > 0
              ? warnSignal.totalAffectedCount.toLocaleString()
              : 'N/A'}
          </div>
          <div className="text-[10px] opacity-50 mt-0.5">Workers affected</div>
        </div>
      </div>

      {/* WARN risk score bar */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[10px] font-semibold" style={{ color: 'var(--alpha-text-50)' }}>WARN RISK SCORE</span>
          <span className="text-[10px] font-bold" style={{ color: urgency.color }}>{warnSignal.warnRiskScore}/100</span>
        </div>
        <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <div
            className="h-1.5 rounded-full transition-all"
            style={{ width: `${warnSignal.warnRiskScore}%`, background: urgency.color }}
          />
        </div>
      </div>

      {/* Affected locations */}
      {displayedLocations.length > 0 && (
        <div className="mb-2.5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <MapPin className="w-3 h-3" style={{ color: 'var(--alpha-text-45)' }} />
            <span className="text-[10px] font-semibold" style={{ color: 'var(--alpha-text-50)' }}>AFFECTED LOCATIONS</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {displayedLocations.map((loc, i) => (
              <span
                key={i}
                className="text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--alpha-text-55)' }}
              >
                {loc}
              </span>
            ))}
            {extraLocations > 0 && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--alpha-text-45)' }}
              >
                +{extraLocations} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Filing states */}
      {filingStates.length > 0 && (
        <div className="mb-2.5">
          <span className="text-[10px]" style={{ color: 'var(--alpha-text-45)' }}>
            States covered:{' '}
            <span style={{ color: 'var(--alpha-text-55)' }}>{filingStates.join(', ')}</span>
          </span>
        </div>
      )}

      {/* Ground truth disclaimer */}
      <div
        className="flex items-start gap-2 rounded-lg p-2.5"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <Shield className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: '#10b981' }} />
        <p className="text-[10px] leading-relaxed" style={{ color: 'var(--alpha-text-50)' }}>
          This is a legally-required 60-day advance notice filing — not a prediction.
        </p>
      </div>

      {/* Calibration note */}
      <p className="text-[10px] leading-relaxed mt-2.5" style={{ color: 'rgba(255,255,255,0.32)' }}>
        {warnSignal.calibrationNote}
      </p>
    </motion.div>
  );
};

export default WARNSignalPanel;
