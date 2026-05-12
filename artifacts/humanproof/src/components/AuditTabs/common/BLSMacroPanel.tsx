// BLSMacroPanel.tsx — v16.0
// BLS JOLTS + FRED macro indicator panel — sector-level leading signals.

import React from "react";
import { motion } from "framer-motion";
import { TrendingDown, AlertTriangle, Activity, Circle } from "lucide-react";
import type { MacroSignalResult } from "../../../services/blsMacroService";

interface BLSMacroPanelProps {
  blsMacroSignal: MacroSignalResult | undefined;
}

const SCORE_STYLE = (score: number): { color: string; bg: string; border: string } => {
  if (score > 80)  return { color: '#ef4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.22)'   };
  if (score > 60)  return { color: '#f97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.22)' };
  if (score >= 30) return { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.22)' };
  return              { color: '#10b981', bg: 'rgba(16,185,129,0.06)',  border: 'rgba(16,185,129,0.18)'  };
};

const BLSMacroPanel: React.FC<BLSMacroPanelProps> = ({ blsMacroSignal }) => {
  if (!blsMacroSignal) return null;

  const { color, bg, border } = SCORE_STYLE(blsMacroSignal.macroRiskScore);

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
          <Activity className="w-4 h-4" style={{ color }} />
          <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>
            BLS JOLTS + Macro Indicators
          </span>
        </div>
        <span
          className="text-[10px] font-black tracking-widest px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
        >
          {blsMacroSignal.macroRiskScore}/100
        </span>
      </div>

      {/* Risk label */}
      <p className="text-[11px] font-semibold mb-3" style={{ color }}>
        {blsMacroSignal.macroRiskLabel}
      </p>

      {/* Score progress bar */}
      <div className="mb-3">
        <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <div
            className="h-1.5 rounded-full transition-all"
            style={{ width: `${blsMacroSignal.macroRiskScore}%`, background: color }}
          />
        </div>
      </div>

      {/* Boolean signal badges */}
      <div className="flex flex-wrap gap-2 mb-3">
        <span
          className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full"
          style={blsMacroSignal.quitsFallSignal
            ? { background: 'rgba(239,68,68,0.14)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.30)' }
            : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.08)' }
          }
        >
          <Circle className="w-2 h-2" style={{ fill: blsMacroSignal.quitsFallSignal ? '#ef4444' : 'rgba(255,255,255,0.20)', color: 'transparent' }} />
          Quits Fall
        </span>
        <span
          className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full"
          style={blsMacroSignal.yieldCurveWarning
            ? { background: 'rgba(245,158,11,0.14)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.30)' }
            : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.08)' }
          }
        >
          <Circle className="w-2 h-2" style={{ fill: blsMacroSignal.yieldCurveWarning ? '#f59e0b' : 'rgba(255,255,255,0.20)', color: 'transparent' }} />
          Yield Curve Inverted
        </span>
        <span
          className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full"
          style={blsMacroSignal.sectorLayoffAcceleration
            ? { background: 'rgba(239,68,68,0.14)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.30)' }
            : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.08)' }
          }
        >
          <TrendingDown className="w-3 h-3" />
          Layoff Acceleration
        </span>
      </div>

      {/* Key insights */}
      {blsMacroSignal.keyInsights.length > 0 && (
        <div className="rounded-lg p-2.5 mb-2.5" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div className="text-[10px] font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
            KEY MACRO INSIGHTS
          </div>
          <div className="space-y-1.5">
            {blsMacroSignal.keyInsights.slice(0, 3).map((insight, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color }} />
                <span className="text-[10px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  {insight}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Calibration note */}
      <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.30)' }}>
        {blsMacroSignal.calibrationNote}
      </p>
    </motion.div>
  );
};

export default BLSMacroPanel;
