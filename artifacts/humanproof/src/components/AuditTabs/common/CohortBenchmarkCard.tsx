// CohortBenchmarkCard.tsx — Wave 6.5 Enterprise UX
//
// PROBLEM: competitivePositionEngine (v45) computes peer benchmarking across
// 6 dimensions but zero UI renders it. Users have no idea where they stand
// vs. peers applying to the same roles.
//
// This card surfaces:
//   - Overall percentile (0–100) vs. cohort
//   - Where user leads vs. lags
//   - Top cohort gap with specific action

import React, { useState } from 'react';
import { Users, ChevronDown, ChevronUp, TrendingUp, TrendingDown } from 'lucide-react';

interface DimensionScore {
  dimension: string;
  label: string;
  userScore: number;
  benchmarkScore: number;
  gapPct?: number;
  isEdge?: boolean;
}

interface CompetitivePositionResult {
  overallPercentile: number;
  percentileLabel?: string;
  percentileCategory?: 'top_tier' | 'competitive' | 'average' | 'below_average' | 'critical';
  cohortLabel?: string;
  cohortSize?: number;
  dimensionScores?: DimensionScore[];
  topEdge?: string;
  topGap?: string;
  topGapAction?: string;
  topGapImpact?: string;
  differentiatorStatement?: string;
  closeGapRoadmap?: Array<{ action: string; percentileGain: number; effort: 'low' | 'medium' | 'high' }>;
}

interface Props {
  competitivePosition: CompetitivePositionResult;
}

const CATEGORY_CONFIG = {
  top_tier:     { color: '#10b981', label: 'TOP TIER' },
  competitive:  { color: '#22d3ee', label: 'COMPETITIVE' },
  average:      { color: '#f59e0b', label: 'AVERAGE' },
  below_average:{ color: '#f97316', label: 'BELOW AVERAGE' },
  critical:     { color: '#dc2626', label: 'NEEDS WORK' },
};

function percentileInterpretation(p: number): string {
  if (p >= 80) return `You're stronger than ${p}% of comparable professionals.`;
  if (p >= 60) return `${100 - p}% of your peers are more competitive right now.`;
  if (p >= 40) return `${100 - p}% of your peers are ahead — close-able gap.`;
  return `${100 - p}% of your peers are in a stronger market position.`;
}

export const CohortBenchmarkCard: React.FC<Props> = ({ competitivePosition }) => {
  const [expanded, setExpanded] = useState(false);
  const {
    overallPercentile,
    percentileCategory = 'average',
    cohortLabel,
    cohortSize,
    dimensionScores = [],
    topEdge,
    topGap,
    topGapAction,
    topGapImpact,
    closeGapRoadmap = [],
  } = competitivePosition;

  const cfg = CATEGORY_CONFIG[percentileCategory] ?? CATEGORY_CONFIG.average;

  return (
    <div
      className="rounded-xl px-4 py-3"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: `${cfg.color}18`, border: `1px solid ${cfg.color}30` }}
          >
            <Users className="w-3.5 h-3.5" style={{ color: cfg.color }} />
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-[0.15em]" style={{ color: 'rgba(255,255,255,0.30)' }}>
              YOUR POSITION VS PEERS
            </p>
            {cohortLabel && (
              <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.28)' }}>
                {cohortLabel}{cohortSize ? ` · ${cohortSize.toLocaleString()} profiles` : ''}
              </p>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-[22px] font-black" style={{ color: cfg.color }}>
            {overallPercentile}<span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.40)' }}>th</span>
          </p>
          <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.28)' }}>percentile</p>
        </div>
      </div>

      {/* Percentile bar */}
      <div className="relative h-2 rounded-full mb-2" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${overallPercentile}%`, background: cfg.color, transition: 'width 0.6s ease' }}
        />
        {/* Marker at 50th percentile */}
        <div
          className="absolute top-0 h-full w-px"
          style={{ left: '50%', background: 'rgba(255,255,255,0.20)' }}
        />
      </div>
      <p className="text-[10px] mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>
        {percentileInterpretation(overallPercentile)}
      </p>

      {/* Top edge / top gap */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
        {topEdge && (
          <div className="rounded-lg p-2" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.20)' }}>
            <div className="flex items-center gap-1 mb-1">
              <TrendingUp className="w-3 h-3" style={{ color: '#10b981' }} />
              <p className="text-[10px] font-bold" style={{ color: 'rgba(16,185,129,0.70)' }}>YOU LEAD</p>
            </div>
            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.68)' }}>{topEdge}</p>
          </div>
        )}
        {topGap && (
          <div className="rounded-lg p-2" style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.20)' }}>
            <div className="flex items-center gap-1 mb-1">
              <TrendingDown className="w-3 h-3" style={{ color: '#f97316' }} />
              <p className="text-[10px] font-bold" style={{ color: 'rgba(249,115,22,0.70)' }}>YOU LAG</p>
            </div>
            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.68)' }}>{topGap}</p>
          </div>
        )}
      </div>

      {/* Top gap action */}
      {topGapAction && (
        <div
          className="flex items-start gap-1.5 rounded-lg px-2.5 py-2 mb-2"
          style={{ background: 'rgba(34,211,238,0.05)', border: '1px solid rgba(34,211,238,0.12)' }}
        >
          <span className="text-[10px] font-black flex-shrink-0" style={{ color: '#22d3ee' }}>↳</span>
          <div>
            <p className="text-[10px] italic" style={{ color: 'rgba(34,211,238,0.75)' }}>
              {topGapAction}
            </p>
            {topGapImpact && (
              <p className="text-[10px] mt-0.5" style={{ color: 'rgba(34,211,238,0.45)' }}>
                Impact: {topGapImpact}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Close gap roadmap — expandable */}
      {closeGapRoadmap.length > 0 && (
        <>
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1 text-[10px] font-semibold"
            style={{ color: 'rgba(255,255,255,0.30)' }}
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? 'Hide' : 'Show'} close-gap roadmap ({closeGapRoadmap.length} actions)
          </button>
          {expanded && (
            <div className="mt-2 space-y-1.5">
              {closeGapRoadmap.map((step, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b"
                  style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                  <p className="text-[10px] flex-1 min-w-0 pr-2" style={{ color: 'rgba(255,255,255,0.60)' }}>
                    {step.action}
                  </p>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${
                      step.effort === 'low' ? 'bg-green-500/15 text-green-400' :
                      step.effort === 'medium' ? 'bg-amber-500/15 text-amber-400' :
                      'bg-red-500/15 text-red-400'
                    }`}>
                      {step.effort}
                    </span>
                    <span className="text-[10px] font-bold" style={{ color: '#22d3ee' }}>
                      +{step.percentileGain}%ile
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CohortBenchmarkCard;
