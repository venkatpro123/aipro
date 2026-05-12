// MacroRiskPanel.tsx — v13.0
// Macroeconomic context panel. Shown in OverviewTab.

import React from "react";
import { motion } from "framer-motion";
import { Globe, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import type { MacroEconomicRiskResult } from "@/services/macroEconomicRiskEngine";

interface MacroRiskPanelProps {
  macro: MacroEconomicRiskResult;
}

const TIER_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  BENIGN:   { text: '#10b981', bg: 'rgba(16,185,129,0.08)',   border: 'rgba(16,185,129,0.25)' },
  MODERATE: { text: '#f59e0b', bg: 'rgba(245,158,11,0.08)',   border: 'rgba(245,158,11,0.25)' },
  ELEVATED: { text: '#f97316', bg: 'rgba(249,115,22,0.08)',   border: 'rgba(249,115,22,0.25)' },
  STRESS:   { text: '#ef4444', bg: 'rgba(239,68,68,0.08)',    border: 'rgba(239,68,68,0.25)' },
  CRISIS:   { text: '#dc2626', bg: 'rgba(220,38,38,0.10)',    border: 'rgba(220,38,38,0.35)' },
};

const REGIME_LABEL: Record<string, string> = {
  expansion: 'Expansion',
  moderate_growth: 'Moderate Growth',
  slowdown: 'Slowdown',
  contraction: 'Contraction',
  stagflation: 'Stagflation',
};

const RATE_LABEL: Record<string, string> = {
  cutting_fast: 'Cutting Fast',
  cutting_slow: 'Cutting Slow',
  plateau: 'Plateau',
  hiking_slow: 'Hiking Slow',
  hiking_fast: 'Hiking Fast',
};

const OUTLOOK_ICON = {
  improving: <TrendingUp className="w-3.5 h-3.5" style={{ color: '#10b981' }} />,
  stable: <Globe className="w-3.5 h-3.5" style={{ color: '#f59e0b' }} />,
  deteriorating: <TrendingDown className="w-3.5 h-3.5" style={{ color: '#ef4444' }} />,
};

const MacroRiskPanel: React.FC<MacroRiskPanelProps> = ({ macro }) => {
  const colors = TIER_COLORS[macro.riskTier] ?? TIER_COLORS.MODERATE;

  return (
    <div className="rounded-2xl p-4 panel-hover" style={{ background: colors.bg, border: `1px solid ${colors.border}`, boxShadow: 'var(--shadow-elev-2)' }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4" style={{ color: colors.text }} />
          <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>Macro-Economic Context</span>
        </div>
        <span className="text-[10px] font-black tracking-widest px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ background: `${colors.text}18`, color: colors.text, border: `1px solid ${colors.text}30` }}>
          {macro.riskTier}
        </span>
      </div>

      {/* Headline */}
      <p className="text-xs leading-relaxed mb-3" style={{ color: 'rgba(255,255,255,0.65)' }}>
        {macro.macroHeadline}
      </p>

      {/* Key metrics row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="rounded-lg p-2 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.85)' }}>
            {REGIME_LABEL[macro.regime] ?? macro.regime}
          </div>
          <div className="text-[10px] opacity-45 mt-0.5">Regime</div>
        </div>
        <div className="rounded-lg p-2 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.85)' }}>
            {RATE_LABEL[macro.rateCyclePhase] ?? macro.rateCyclePhase}
          </div>
          <div className="text-[10px] opacity-45 mt-0.5">Rate Cycle</div>
        </div>
        <div className="rounded-lg p-2 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div className="text-xs font-bold" style={{ color: macro.scoreMultiplier > 1.05 ? '#f97316' : '#10b981' }}>
            ×{macro.scoreMultiplier.toFixed(2)}
          </div>
          <div className="text-[10px] opacity-45 mt-0.5">Score Mult.</div>
        </div>
      </div>

      {/* Sector exposure */}
      <div className="p-2 rounded-lg mb-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <span className="text-[10px] font-bold tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>
          SECTOR EXPOSURE
        </span>
        <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
          {macro.sectorExposure.reasoning}
        </p>
      </div>

      {/* Outlook */}
      <div className="flex items-center gap-2 mb-3">
        {OUTLOOK_ICON[macro.outlookDirection]}
        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
          <span className="font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>
            {macro.outlookHorizon} outlook:{' '}
          </span>
          {macro.outlookNarrative.slice(0, 120)}…
        </span>
      </div>

      {/* Active risks */}
      {macro.keyMacroRisks.length > 0 && (
        <div>
          <p className="text-[10px] font-bold tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
            ACTIVE MACRO RISKS
          </p>
          {macro.keyMacroRisks.slice(0, 2).map((risk, i) => (
            <div key={i} className="flex gap-2 mb-1.5">
              <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: colors.text, opacity: 0.6 }} />
              <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>{risk}</p>
            </div>
          ))}
        </div>
      )}

      {/* India specific */}
      {macro.indiaSpecific && (
        <div className="mt-3 pt-3 space-y-1" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-[10px] font-bold tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>INDIA MACRO</p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>{macro.indiaSpecific.narrative}</p>
        </div>
      )}

      <p className="text-[10px] mt-3 italic" style={{ color: 'rgba(255,255,255,0.2)' }}>
        Calibrated May 2026 · Zero API cost · Updated quarterly
      </p>
    </div>
  );
};

export default MacroRiskPanel;
