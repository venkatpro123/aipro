// JobMarketLiquidityCard.tsx — Wave 2.3 Intelligence Surfacing
//
// PROBLEM: jobMarketLiquidity (L9) computes reemployment weeks estimate
// but has no dedicated panel — only buried in narrative text. Users never
// see the most concrete actionable number: "how long would it take to
// find a new role if laid off tomorrow?"
//
// This card surfaces exactly that.

import React from 'react';
import { Waves } from 'lucide-react';

interface JobMarketLiquidity {
  reemploymentWeeks?: number;
  reemploymentWeeksLow?: number;
  reemploymentWeeksHigh?: number;
  marketFriction?: 'low' | 'moderate' | 'high' | 'very_high';
  activePostings?: number;
  demandRatio?: number;
  roleInRegionTrend?: 'rising' | 'stable' | 'declining';
  liquidityScore?: number; // 0–100
  marketNote?: string;
}

interface Props {
  jobMarketLiquidity: JobMarketLiquidity;
}

const FRICTION_CONFIG = {
  low:      { label: 'EASY ACCESS',       color: '#10b981', desc: 'Strong market — quick transitions possible' },
  moderate: { label: 'MODERATE FRICTION', color: '#f59e0b', desc: 'Typical job search timeline applies'        },
  high:     { label: 'TIGHT MARKET',      color: '#f97316', desc: 'Longer timeline — start positioning now'   },
  very_high:{ label: 'VERY TIGHT',        color: '#dc2626', desc: 'Difficult market — hedge with internal moves'},
};

export const JobMarketLiquidityCard: React.FC<Props> = ({ jobMarketLiquidity }) => {
  const {
    reemploymentWeeks,
    reemploymentWeeksLow,
    reemploymentWeeksHigh,
    marketFriction = 'moderate',
    activePostings,
    demandRatio,
    roleInRegionTrend,
    liquidityScore,
    marketNote,
  } = jobMarketLiquidity;

  const cfg = FRICTION_CONFIG[marketFriction] ?? FRICTION_CONFIG.moderate;

  // Build weeks display
  const weeksDisplay = reemploymentWeeksLow && reemploymentWeeksHigh
    ? `${reemploymentWeeksLow}–${reemploymentWeeksHigh} weeks`
    : reemploymentWeeks
    ? `${reemploymentWeeks} weeks`
    : null;

  const trendIcon = roleInRegionTrend === 'rising' ? '↑' : roleInRegionTrend === 'declining' ? '↓' : '→';
  const trendColor = roleInRegionTrend === 'rising' ? '#10b981' : roleInRegionTrend === 'declining' ? '#f97316' : '#94a3b8';

  return (
    <div
      className="rounded-xl px-4 py-3"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-3">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: `${cfg.color}18`, border: `1px solid ${cfg.color}30` }}
        >
          <Waves className="w-3.5 h-3.5" style={{ color: cfg.color }} />
        </div>
        <div>
          <p className="text-[9px] font-bold tracking-[0.15em]" style={{ color: 'rgba(255,255,255,0.30)' }}>
            JOB MARKET LIQUIDITY
          </p>
          <div className="flex items-center gap-1.5">
            <span
              className="text-[10px] font-black"
              style={{ color: cfg.color }}
            >
              {cfg.label}
            </span>
            {liquidityScore != null && (
              <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.28)' }}>
                · {liquidityScore}/100
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Core metric: reemployment weeks */}
      {weeksDisplay && (
        <div
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 mb-3"
          style={{ background: `${cfg.color}08`, border: `1px solid ${cfg.color}20` }}
        >
          <div>
            <p className="text-[9px] font-bold mb-0.5" style={{ color: `${cfg.color}70` }}>
              TIME TO COMPARABLE ROLE
            </p>
            <p className="text-[16px] font-black" style={{ color: 'rgba(255,255,255,0.88)' }}>
              {weeksDisplay}
            </p>
            <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.38)' }}>
              est. if actively searching
            </p>
          </div>
        </div>
      )}

      {/* Supporting data chips */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {activePostings != null && (
          <span className="text-[9px] px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.10)' }}>
            {activePostings.toLocaleString()} active postings
          </span>
        )}
        {demandRatio != null && (
          <span className="text-[9px] px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.10)' }}>
            {demandRatio.toFixed(1)}× demand ratio
          </span>
        )}
        {roleInRegionTrend && (
          <span className="text-[9px] px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(255,255,255,0.05)', color: trendColor, border: '1px solid rgba(255,255,255,0.10)' }}>
            {trendIcon} demand {roleInRegionTrend}
          </span>
        )}
      </div>

      {/* Runway implication */}
      <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
        {marketNote ?? cfg.desc}
      </p>

      {/* Practical anchor */}
      {weeksDisplay && (
        <div
          className="mt-2 flex items-start gap-1.5 rounded-lg px-2.5 py-2"
          style={{ background: 'rgba(34,211,238,0.05)', border: '1px solid rgba(34,211,238,0.12)' }}
        >
          <span className="text-[10px] font-black flex-shrink-0" style={{ color: '#22d3ee' }}>↳</span>
          <p className="text-[10px] leading-snug italic" style={{ color: 'rgba(34,211,238,0.70)' }}>
            If laid off tomorrow, you have {weeksDisplay.split('–')[0]} weeks before job search pressure becomes acute.
          </p>
        </div>
      )}
    </div>
  );
};

export default JobMarketLiquidityCard;
