/**
 * CareerPortfolioPanel.tsx — v12.0
 *
 * Risk concentration visualization using existing HybridResult data.
 * Zero new service code — pure UI computation over existing data.
 *
 * Shows:
 *  - Donut chart: dimension contributions to total score
 *  - Diversification score (Herfindahl Index)
 *  - "Most concentrated risk" callout
 *  - Correlation annotations (L1 + L2 compound collapse warning)
 */

import React from 'react';
import { motion } from 'framer-motion';
import { PieChart } from 'lucide-react';
import type { HybridResult } from '../../../types/hybridResult';

interface Props {
  result: HybridResult;
}

// Dimension labels and display order
const DIMENSIONS = [
  { key: 'L1', label: 'Company Health', color: '#ef4444' },
  { key: 'L2', label: 'Layoff History',  color: '#f97316' },
  { key: 'L3', label: 'Role Displacement', color: '#f59e0b' },
  { key: 'L5', label: 'Employee Protection', color: '#8b5cf6' },
  { key: 'D6', label: 'AI Agent Risk', color: '#06b6d4' },
  { key: 'D7', label: 'Co. Health Risk', color: '#ec4899' },
  { key: 'D8', label: 'AI Efficiency Risk', color: '#3b82f6' },
];

// Approximate contribution weights for display (uses LAYER_WEIGHTS proportionally)
const DISPLAY_WEIGHTS: Record<string, number> = {
  L1: 0.30, L2: 0.25, L3: 0.20, L5: 0.08, D6: 0.08, D7: 0.07, D8: 0.04,
};

// Herfindahl-Hirschman Index: sum of squared shares (0–1, higher = more concentrated)
function computeHerfindahl(contributions: number[]): number {
  const total = contributions.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  const shares = contributions.map(c => c / total);
  return shares.reduce((sum, s) => sum + s * s, 0);
}

// SVG donut sector path
function sectorPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  // BUG-FIX: Guard against degenerate paths where endAngle <= startAngle
  if (endAngle <= startAngle) return '';
  const s = (angle: number) => ({
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  });
  const start = s(startAngle);
  const end = s(endAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
}

export function CareerPortfolioPanel({ result }: Props) {
  const breakdown = result.breakdown;
  if (!breakdown) return null;

  // Compute contributions for each dimension
  const contributions = DIMENSIONS.map(dim => {
    const raw = (breakdown as any)[dim.key] ?? 0;
    const weight = DISPLAY_WEIGHTS[dim.key] ?? 0;
    return Math.max(0, raw * weight * 100);
  });

  const total = contributions.reduce((a, b) => a + b, 0);
  const hhi = computeHerfindahl(contributions);
  const diversificationScore = Math.round((1 - hhi) * 100);

  // Find top-2 contributing dimensions
  const ranked = DIMENSIONS.map((dim, i) => ({
    ...dim, contribution: contributions[i],
    share: total > 0 ? contributions[i] / total : 0,
  })).sort((a, b) => b.contribution - a.contribution);

  const top2Share = ranked[0].share + (ranked[1]?.share ?? 0);
  const isConcentrated = top2Share > 0.60;

  // Check for L1+L2 correlation risk
  const l1Val = (breakdown as any).L1 ?? 0;
  const l2Val = (breakdown as any).L2 ?? 0;
  const hasCorrelationRisk = l1Val >= 0.55 && l2Val >= 0.45;

  // Build donut chart data
  const size = 100;
  const cx = size / 2;
  const cy = size / 2;
  const r = 38;
  const innerR = 24;

  // BUG-FIX: Normalise contributions to exactly 1.0 before building sectors to prevent
  // floating-point accumulation from pushing the final angle past 2π (corrupts SVG paths).
  const normalizedShares = total > 0
    ? contributions.map(c => Math.max(0, c / total))
    : contributions.map(() => 0);
  // Force shares to sum to exactly 1.0 by adjusting the largest slice
  const shareSum = normalizedShares.reduce((a, b) => a + b, 0);
  if (shareSum > 0 && Math.abs(shareSum - 1.0) > 0.0001) {
    const maxIdx = normalizedShares.indexOf(Math.max(...normalizedShares));
    normalizedShares[maxIdx] += (1.0 - shareSum);
  }

  let angle = -Math.PI / 2;

  const sectors = DIMENSIONS.map((dim, i) => {
    const share = normalizedShares[i];
    const sweep = share * 2 * Math.PI;
    const startAngle = angle;
    const endAngle = angle + sweep;
    angle = endAngle;
    return {
      ...dim,
      share,
      contribution: contributions[i],
      path: sweep > 0.01 ? sectorPath(cx, cy, r, startAngle, endAngle) : null,
      innerPath: sweep > 0.01 ? sectorPath(cx, cy, innerR, startAngle, endAngle) : null,
    };
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-[var(--alpha-bg-08)] p-4 mb-4"
      style={{ background: 'var(--alpha-bg-04)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <PieChart size={14} className="text-purple-400" />
        <span className="text-sm font-semibold text-[var(--text)]">Risk Portfolio</span>
        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
          diversificationScore >= 65 ? 'bg-emerald-500/15 text-emerald-300' :
          diversificationScore >= 45 ? 'bg-amber-500/15 text-amber-300' :
          'bg-red-500/15 text-red-300'
        }`}>
          Diversification: {diversificationScore}/100
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* Donut chart */}
        <div className="shrink-0">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {/* Background circle */}
            <circle cx={cx} cy={cy} r={r} fill="var(--alpha-bg-04)" />
            {/* Donut sectors */}
            {sectors.map((s) =>
              s.path ? (
                <path
                  key={s.key}
                  d={s.path}
                  fill={s.color}
                  opacity={0.75}
                  style={{ transition: 'opacity 0.2s' }}
                >
                  <title>{s.label}: {Math.round(s.share * 100)}%</title>
                </path>
              ) : null,
            )}
            {/* Inner cutout */}
            <circle cx={cx} cy={cy} r={innerR} fill="var(--color-surface, #111827)" />
            {/* Center text */}
            <text x={cx} y={cy - 3} textAnchor="middle" fontSize="11" fontWeight="700" fill="white">
              {result.total}
            </text>
            <text x={cx} y={cy + 8} textAnchor="middle" fontSize="5" fill="var(--alpha-text-35)">
              RISK
            </text>
          </svg>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-1.5">
          {ranked.slice(0, 5).map((dim) => (
            <div key={dim.key} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: dim.color }} />
                <span className="text-[11px] text-gray-400">{dim.label}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-16 h-1 bg-[var(--alpha-bg-08)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${dim.share * 100}%`, background: dim.color }}
                  />
                </div>
                <span className="text-[10px] text-gray-500 w-7 text-right">
                  {Math.round(dim.share * 100)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Insights */}
      <div className="mt-3 space-y-2">
        {isConcentrated && (
          <div className="p-2 rounded-lg bg-amber-950/20 border border-amber-500/20 text-[11px] text-amber-300">
            ⚠ Concentrated: {ranked[0].label} + {ranked[1]?.label ?? ''} account for {Math.round(top2Share * 100)}% of your total risk.
          </div>
        )}
        {hasCorrelationRisk && (
          <div className="p-2 rounded-lg bg-red-950/20 border border-red-500/20 text-[11px] text-red-300">
            ⚡ Correlation risk: L1 (Company Health) and L2 (Layoff History) are both elevated. A single company event collapses both simultaneously — this is not independent diversification.
          </div>
        )}
        {!isConcentrated && !hasCorrelationRisk && (
          <div className="p-2 rounded-lg bg-emerald-950/15 border border-emerald-500/15 text-[11px] text-emerald-400">
            ✓ Risk is distributed across multiple dimensions. No single signal dominates.
          </div>
        )}
      </div>
    </motion.div>
  );
}
