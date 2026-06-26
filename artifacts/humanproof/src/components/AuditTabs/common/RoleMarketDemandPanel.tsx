// RoleMarketDemandPanel.tsx — v16.0
// Role market demand index, job search runway, location intelligence.

import React from "react";
import { motion } from "framer-motion";
import { Briefcase, TrendingUp, TrendingDown, Minus, MapPin, Clock } from "lucide-react";
import type { MarketDemandReport } from "../../../services/roleMarketDemandService";
import type { DemandTrend } from "../../../services/roleMarketDemandService";

interface RoleMarketDemandPanelProps {
  roleMarketDemand: MarketDemandReport | undefined;
}

const DEMAND_TREND_CONFIG: Record<DemandTrend, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  surging:  { label: 'Surging',  color: 'var(--color-emerald-text)', bg: 'rgba(16,185,129,0.12)',  icon: <TrendingUp className="w-3 h-3" /> },
  rising:   { label: 'Rising',   color: 'var(--color-emerald-text)', bg: 'rgba(52,211,153,0.10)',  icon: <TrendingUp className="w-3 h-3" /> },
  stable:   { label: 'Stable',   color: 'var(--color-amber500-text)', bg: 'rgba(245,158,11,0.10)',  icon: <Minus className="w-3 h-3" />      },
  declining:{ label: 'Declining',color: 'var(--color-orange-text)', bg: 'rgba(249,115,22,0.10)',  icon: <TrendingDown className="w-3 h-3" /> },
  falling:  { label: 'Falling',  color: 'var(--color-red-text)', bg: 'rgba(239,68,68,0.10)',   icon: <TrendingDown className="w-3 h-3" /> },
};

const SALARY_TREND_CONFIG: Record<'rising' | 'stable' | 'falling', { label: string; color: string; bg: string }> = {
  rising:  { label: 'Salaries Rising',  color: 'var(--color-emerald-text)', bg: 'rgba(16,185,129,0.10)' },
  stable:  { label: 'Salaries Stable',  color: 'var(--color-amber500-text)', bg: 'rgba(245,158,11,0.10)' },
  falling: { label: 'Salaries Falling', color: 'var(--color-red-text)', bg: 'rgba(239,68,68,0.10)'  },
};

function demandIndexStyle(idx: number): { color: string; bg: string; border: string } {
  if (idx > 70) return { color: 'var(--color-emerald-text)', bg: 'rgba(16,185,129,0.07)',  border: 'rgba(16,185,129,0.20)'  };
  if (idx >= 45) return { color: 'var(--color-amber500-text)', bg: 'rgba(245,158,11,0.07)', border: 'rgba(245,158,11,0.20)'  };
  return              { color: 'var(--color-red-text)', bg: 'rgba(239,68,68,0.07)',   border: 'rgba(239,68,68,0.20)'   };
}

const RoleMarketDemandPanel: React.FC<RoleMarketDemandPanelProps> = ({ roleMarketDemand }) => {
  if (!roleMarketDemand) return null;

  const { snapshot, adjustedDemandIndex, localMarketMultiplier, jobSearchRunwayWeeks, actionRecommendations } = roleMarketDemand;
  const { color, bg, border } = demandIndexStyle(adjustedDemandIndex);
  const trendConf = DEMAND_TREND_CONFIG[snapshot.demandTrend];
  const salaryConf = SALARY_TREND_CONFIG[snapshot.salaryTrend];
  const topLocations = snapshot.topHiringLocations.slice(0, 3);

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
          <Briefcase className="w-4 h-4" style={{ color }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--alpha-text-85)' }}>
            Role Market Demand (2026-Q1)
          </span>
        </div>
        <span
          className="text-[10px] font-black tracking-widest px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
        >
          {adjustedDemandIndex}/100
        </span>
      </div>

      {/* Role name */}
      <p className="text-[11px] font-semibold mb-2" style={{ color: 'var(--alpha-text-55)' }}>
        {snapshot.roleName}
      </p>

      {/* Demand index progress bar */}
      <div className="mb-3">
        <div className="h-2 rounded-full" style={{ background: 'var(--alpha-bg-08)' }}>
          <div
            className="h-2 rounded-full transition-all"
            style={{ width: `${Math.min(adjustedDemandIndex, 100)}%`, background: color }}
          />
        </div>
      </div>

      {/* Job search runway — prominently shown */}
      <div
        className="rounded-xl p-3 mb-3 text-center"
        style={{ background: `${color}14`, border: `1px solid ${color}28` }}
      >
        <div className="text-lg font-black" style={{ color }}>
          ~{jobSearchRunwayWeeks} weeks
        </div>
        <div className="text-[10px] mt-0.5" style={{ color: 'var(--alpha-text-50)' }}>
          to job offer at this demand level
        </div>
      </div>

      {/* Trend badges row */}
      <div className="flex flex-wrap gap-2 mb-3">
        <span
          className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full"
          style={{ background: trendConf.bg, color: trendConf.color, border: `1px solid ${trendConf.color}28` }}
        >
          {trendConf.icon}
          {trendConf.label}
        </span>
        <span
          className="text-[10px] font-semibold px-2 py-1 rounded-full"
          style={{ background: salaryConf.bg, color: salaryConf.color, border: `1px solid ${salaryConf.color}28` }}
        >
          {salaryConf.label}
        </span>
      </div>

      {/* Metrics row */}
      <div className="space-y-2 mb-3">
        {snapshot.timeToFillDays !== null && (
          <div className="flex justify-between items-center text-sm rounded-lg px-2.5 py-2"
            style={{ background: 'var(--alpha-bg-04)' }}>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3" style={{ color: 'var(--alpha-text-35)' }} />
              <span className="text-[11px]" style={{ color: 'var(--alpha-text-50)' }}>Median time-to-fill</span>
            </div>
            <span className="text-[11px] font-bold" style={{ color: 'var(--alpha-text-85)' }}>
              {snapshot.timeToFillDays} days
            </span>
          </div>
        )}
        {localMarketMultiplier !== 1.0 && (
          <div className="flex justify-between items-center text-sm rounded-lg px-2.5 py-2"
            style={{ background: 'var(--alpha-bg-04)' }}>
            <span className="text-[11px]" style={{ color: 'var(--alpha-text-50)' }}>Local market</span>
            <span className="text-[11px] font-bold" style={{
              color: localMarketMultiplier > 1 ? 'var(--color-emerald-text)' : 'var(--color-orange-text)'
            }}>
              {localMarketMultiplier.toFixed(2)}× vs. national avg
            </span>
          </div>
        )}
      </div>

      {/* Top hiring locations */}
      {topLocations.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <MapPin className="w-3 h-3" style={{ color: 'var(--alpha-text-35)' }} />
            <span className="text-[10px] font-semibold" style={{ color: 'var(--alpha-text-45)' }}>
              TOP HIRING LOCATIONS
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {topLocations.map((loc, i) => (
              <span
                key={i}
                className="text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: 'var(--alpha-bg-06)', color: 'var(--alpha-text-55)' }}
              >
                {loc}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Action recommendations */}
      {actionRecommendations.length > 0 && (
        <div className="rounded-lg p-2.5" style={{ background: 'var(--alpha-bg-04)' }}>
          <div className="text-[10px] font-semibold mb-1.5" style={{ color: 'var(--alpha-text-45)' }}>
            RECOMMENDED ACTIONS
          </div>
          <div className="space-y-1">
            {actionRecommendations.slice(0, 2).map((rec, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <div className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ background: color }} />
                <span className="text-[10px] leading-relaxed" style={{ color: 'var(--alpha-text-50)' }}>
                  {rec}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default RoleMarketDemandPanel;
