/**
 * SignalAttributionWaterfall.tsx — v12.0
 *
 * Waterfall chart showing which signals drove the final score.
 * Zero new computation — uses existing breakdown + LAYER_WEIGHTS.
 *
 * Visualization: Start at 50 (neutral baseline), each dimension bar
 * shows its contribution (positive = adds risk, negative = protects).
 * Kill-switch and archetype adjustments shown separately.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { GitBranch } from 'lucide-react';
import type { HybridResult } from '../../../types/hybridResult';

interface Props {
  result: HybridResult;
}

// Approximate contributions (uses LAYER_WEIGHTS display formula)
const LAYER_CONTRIBUTIONS: Array<{
  key: keyof typeof DISPLAY_WEIGHTS;
  label: string;
  shortLabel: string;
  color: string;
  protects?: boolean;
}> = [
  { key: 'L1', label: 'Company Financial Health', shortLabel: 'L1 Health',    color: 'var(--color-red-text)' },
  { key: 'L2', label: 'Layoff History',            shortLabel: 'L2 History',   color: 'var(--color-orange-text)' },
  { key: 'L3', label: 'Role Displacement',         shortLabel: 'L3 Role',      color: 'var(--color-amber500-text)' },
  { key: 'L5', label: 'Employee Protection',       shortLabel: 'L5 Employee',  color: 'var(--color-emerald-text)', protects: true },
  { key: 'D6', label: 'AI Agent Coverage',         shortLabel: 'D6 AI Agent',  color: 'var(--color-cyan500-text)' },
  { key: 'D7', label: 'Company Risk Composite',    shortLabel: 'D7 Co.Risk',   color: 'var(--color-pink500-text)' },
];

const DISPLAY_WEIGHTS: Record<string, number> = {
  L1: 0.30, L2: 0.25, L3: 0.20, L5: 0.08, D6: 0.08, D7: 0.07,
};
const WEIGHT_SUM = 0.98;

interface WaterfallBar {
  label: string;
  shortLabel: string;
  color: string;
  start: number;
  end: number;
  contribution: number;
  isPositive: boolean;
}

export function SignalAttributionWaterfall({ result }: Props) {
  const breakdown = result.breakdown;
  if (!breakdown) return null;

  const baseline = 50;
  let running = baseline;
  const bars: WaterfallBar[] = [];

  // Compute recomposed contribution per dimension
  for (const dim of LAYER_CONTRIBUTIONS) {
    const raw = (breakdown as any)[dim.key] ?? 0;
    const weight = DISPLAY_WEIGHTS[dim.key] ?? 0;
    // Contribution relative to 0.5 neutral (above 0.5 = risk, below = protection)
    const contribution = (raw - 0.5) * weight * 100 / WEIGHT_SUM;
    const start = running;
    running += contribution;
    bars.push({
      label: dim.label,
      shortLabel: dim.shortLabel,
      color: dim.color,
      start,
      end: running,
      contribution,
      isPositive: contribution >= 0,
    });
  }

  // Kill-switch adjustment — may be multiple floors fired simultaneously.
  // activatedKillSwitches contains ALL that fired; killSwitchName is the winning (highest) one.
  const ksApplied            = (result as any).killSwitchApplied;
  const ksName               = (result as any).killSwitchName as string | null | undefined;
  const ksAllNames           = ((result as any).activatedKillSwitches ?? []) as string[];
  const ksAdjustment         = ksApplied && result.total > Math.round(running) ? result.total - Math.round(running) : 0;

  // Build a compact label: "confirmed_recent_layoff_news +2 more" when multiple fired.
  const ksDisplayLabel = ksAllNames.length > 1
    ? `${ksName?.replace(/_/g, ' ') ?? 'floor'} +${ksAllNames.length - 1} more`
    : ksName?.replace(/_/g, ' ') ?? 'floor';

  // Archetype adjustment label
  const archetype = (result as any).scoringArchetype as string | undefined;

  const chartMin = Math.min(baseline - 5, Math.min(...bars.map(b => Math.min(b.start, b.end))) - 2);
  const chartMax = Math.max(85, Math.max(...bars.map(b => Math.max(b.start, b.end))) + 2);
  const chartRange = chartMax - chartMin;

  const BAR_HEIGHT = 18;
  const GAP = 6;
  const LABEL_W = 100;
  const chartWidth = 260;
  const totalHeight = (bars.length + (ksApplied ? 2 : 1)) * (BAR_HEIGHT + GAP) + 40;

  function scoreToX(score: number): number {
    // BUG-FIX: Clamp to valid chart bounds to prevent negative x coords when a
    // dimension's contribution pushes the running total outside [chartMin, chartMax].
    const raw = LABEL_W + ((score - chartMin) / chartRange) * chartWidth;
    return Math.max(LABEL_W, Math.min(LABEL_W + chartWidth, raw));
  }

  return (
    <div className="rounded-xl p-4 mb-4" style={{ border: '1px solid var(--alpha-bg-08)', background: 'var(--alpha-bg-04)' }}>
      <div className="flex items-center gap-2 mb-4">
        <GitBranch size={14} className="text-blue-400" />
        <span className="text-sm font-semibold text-[var(--text)]">Score Attribution Waterfall</span>
        <span className="text-[11px] text-[var(--alpha-text-35)]">How each signal built your score</span>
      </div>

      <svg
        width="100%"
        viewBox={`0 0 ${LABEL_W + chartWidth + 50} ${totalHeight}`}
        overflow="visible"
        style={{ overflow: 'visible' }}
      >
        {/* Baseline line at 50 */}
        <line
          x1={scoreToX(50)} y1={0}
          x2={scoreToX(50)} y2={totalHeight - 30}
          stroke="var(--alpha-bg-08)" strokeWidth={1} strokeDasharray="3 3"
        />
        <text x={scoreToX(50)} y={totalHeight - 15} textAnchor="middle" fontSize="9" fill="var(--alpha-text-30)">
          50 (neutral)
        </text>

        {/* Dimension bars */}
        {bars.map((bar, i) => {
          const y = 10 + i * (BAR_HEIGHT + GAP);
          const x1 = scoreToX(Math.min(bar.start, bar.end));
          const x2 = scoreToX(Math.max(bar.start, bar.end));
          const barW = Math.max(2, x2 - x1);

          return (
            <g key={bar.shortLabel}>
              {/* Label */}
              <text
                x={LABEL_W - 4}
                y={y + BAR_HEIGHT / 2 + 3}
                textAnchor="end"
                fontSize="9"
                fill="var(--alpha-text-55)"
              >
                {bar.shortLabel}
              </text>

              {/* Connector line to previous bar */}
              {i > 0 && (
                <line
                  x1={scoreToX(bar.start)} y1={y}
                  x2={scoreToX(bar.start)} y2={y - GAP}
                  stroke="var(--alpha-bg-08)" strokeWidth={1}
                />
              )}

              {/* Bar */}
              <motion.rect
                x={x1}
                y={y}
                width={barW}
                height={BAR_HEIGHT}
                rx={3}
                fill={bar.color}
                fillOpacity={0.7}
                initial={{ width: 0, x: scoreToX(bar.start) }}
                animate={{ width: barW, x: x1 }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: 'easeOut' }}
              />

              {/* Contribution label */}
              <text
                x={x2 + 4}
                y={y + BAR_HEIGHT / 2 + 3}
                fontSize="9"
                fill={bar.isPositive ? 'var(--color-orange-text)' : 'var(--color-emerald-text)'}
              >
                {bar.contribution >= 0 ? '+' : ''}{Math.round(bar.contribution)}
              </text>
            </g>
          );
        })}

        {/* Kill-switch bar if applied */}
        {ksApplied && ksAdjustment > 0 && (() => {
          const i = bars.length;
          const y = 10 + i * (BAR_HEIGHT + GAP);
          const x1 = scoreToX(running);
          const x2 = scoreToX(running + ksAdjustment);
          const barW = Math.max(2, x2 - x1);
          return (
            <g key="kill-switch">
              <text x={LABEL_W - 4} y={y + BAR_HEIGHT / 2 + 3} textAnchor="end" fontSize="9" fill="rgba(255,100,100,0.8)">
                Kill-switch
              </text>
              <motion.rect
                x={x1} y={y} width={barW} height={BAR_HEIGHT} rx={3}
                fill='var(--color-red-text)' fillOpacity={0.6}
                initial={{ width: 0 }} animate={{ width: barW }}
                transition={{ duration: 0.4, delay: bars.length * 0.08 }}
              />
              <text x={x2 + 4} y={y + BAR_HEIGHT / 2 + 3} fontSize="9" fill='var(--color-red-text)'>
                +{Math.round(ksAdjustment)} ({ksDisplayLabel})
              </text>
            </g>
          );
        })()}

        {/* Final score marker */}
        <line
          x1={scoreToX(result.total)} y1={0}
          x2={scoreToX(result.total)} y2={totalHeight - 30}
          stroke="var(--alpha-text-35)" strokeWidth={1.5}
        />
        <text x={scoreToX(result.total)} y={totalHeight - 15} textAnchor="middle" fontSize="9" fontWeight="bold" fill="var(--alpha-text-70)">
          {result.total}
        </text>
      </svg>

      {archetype && archetype !== 'low_risk_maintain' && (
        <div className="mt-2 text-[10px] text-[var(--alpha-text-35)]">
          Adaptive weights applied for <span className="text-[var(--alpha-text-45)]">{archetype.replace(/_/g, ' ')}</span> scenario
        </div>
      )}
    </div>
  );
}
