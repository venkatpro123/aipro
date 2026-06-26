// RiskTrendChart.tsx — P0 Visual Storytelling
//
// Interactive SVG line chart showing risk score evolution over time.
// Data source: scoreStorageService (localStorage history).
// Renders a smooth bezier path with gradient fill, animated on mount.
// Shows score dots with hover tooltips and risk-tier color zones.

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import type { ScoreHistoryEntry } from '../../../services/scoreStorageService';
import { riskColor, riskLabel } from '../../../lib/riskTokens';

interface RiskTrendChartProps {
  history: ScoreHistoryEntry[];
  currentScore: number;
  className?: string;
}

interface DataPoint {
  score: number;
  label: string;
  date: Date;
  isCurrent: boolean;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('default', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

const CHART_W = 320;
const CHART_H = 140;
const PAD_X = 32;
const PAD_Y = 20;
const PLOT_W = CHART_W - PAD_X * 2;
const PLOT_H = CHART_H - PAD_Y * 2;

// Risk tier zone boundaries (score 0-100)
const ZONES = [
  { y0: 0, y1: 35, color: 'var(--color-emerald-text)', label: 'Low' },
  { y0: 35, y1: 55, color: 'var(--color-amber500-text)', label: 'Moderate' },
  { y0: 55, y1: 75, color: 'var(--color-orange-text)', label: 'High' },
  { y0: 75, y1: 100, color: 'var(--color-red-text)', label: 'Critical' },
];

function scoreToY(score: number): number {
  return PAD_Y + PLOT_H - (score / 100) * PLOT_H;
}

function indexToX(i: number, total: number): number {
  if (total <= 1) return PAD_X + PLOT_W / 2;
  return PAD_X + (i / (total - 1)) * PLOT_W;
}

function buildSmoothPath(points: Array<{ x: number; y: number }>): string {
  if (points.length < 2) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx = (prev.x + curr.x) / 2;
    d += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
  }
  return d;
}

export const RiskTrendChart: React.FC<RiskTrendChartProps> = ({
  history,
  currentScore,
  className,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const dataPoints: DataPoint[] = useMemo(() => {
    const pts = history
      .filter(e => typeof e.score === 'number')
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .slice(-7)
      .map(e => ({
        score: e.score,
        label: formatDate(e.timestamp),
        date: new Date(e.timestamp),
        isCurrent: false,
      }));

    pts.push({
      score: currentScore,
      label: 'Now',
      date: new Date(),
      isCurrent: true,
    });
    return pts;
  }, [history, currentScore]);

  if (dataPoints.length < 2) return null;

  const coords = dataPoints.map((dp, i) => ({
    x: indexToX(i, dataPoints.length),
    y: scoreToY(dp.score),
  }));

  const linePath = buildSmoothPath(coords);
  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${CHART_H - PAD_Y} L ${coords[0].x} ${CHART_H - PAD_Y} Z`;

  const first = dataPoints[0].score;
  const last = currentScore;
  const delta = last - first;
  const direction = delta > 2 ? 'worsening' : delta < -2 ? 'improving' : 'stable';
  const DirIcon = direction === 'worsening' ? TrendingUp : direction === 'improving' ? TrendingDown : Minus;
  const dirColor = direction === 'worsening' ? 'var(--color-red-text)' : direction === 'improving' ? 'var(--color-emerald-text)' : 'var(--alpha-text-35)';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1 }}
      className={className}
    >
      <div className="flex items-center justify-between mb-2.5">
        <p
          className="text-[9px] font-black tracking-[0.14em] uppercase"
          style={{ color: 'var(--alpha-text-25)', fontFamily: 'var(--font-mono)' }}
        >
          RISK SCORE TREND
        </p>
        {Math.abs(delta) >= 1 && (
          <div className="flex items-center gap-1">
            <DirIcon className="w-3 h-3" style={{ color: dirColor }} />
            <span className="text-[10px] font-bold" style={{ color: dirColor }}>
              {delta > 0 ? '+' : ''}{delta}pt
            </span>
          </div>
        )}
      </div>

      <div
        className="rounded-xl overflow-hidden relative"
        style={{
          background: 'var(--alpha-bg-04)',
          border: '1px solid var(--alpha-bg-08)',
        }}
      >
        <svg
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          className="w-full"
          style={{ height: 'auto', maxHeight: 160 }}
        >
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={riskColor(currentScore)} stopOpacity="0.25" />
              <stop offset="100%" stopColor={riskColor(currentScore)} stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="trendStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor='var(--color-emerald-text)' stopOpacity="0.6" />
              <stop offset="50%" stopColor='var(--color-amber500-text)' stopOpacity="0.8" />
              <stop offset="100%" stopColor={riskColor(currentScore)} stopOpacity="1" />
            </linearGradient>
          </defs>

          {/* Risk zone bands */}
          {ZONES.map(zone => (
            <rect
              key={zone.label}
              x={PAD_X}
              y={scoreToY(zone.y1)}
              width={PLOT_W}
              height={scoreToY(zone.y0) - scoreToY(zone.y1)}
              fill={zone.color}
              fillOpacity="0.04"
            />
          ))}

          {/* Zone boundary lines */}
          {[35, 55, 75].map(threshold => (
            <line
              key={threshold}
              x1={PAD_X}
              y1={scoreToY(threshold)}
              x2={PAD_X + PLOT_W}
              y2={scoreToY(threshold)}
              stroke="var(--alpha-bg-06)"
              strokeWidth="0.5"
              strokeDasharray="4 4"
            />
          ))}

          {/* Zone labels (right side) */}
          {ZONES.map(zone => (
            <text
              key={`label-${zone.label}`}
              x={CHART_W - 4}
              y={scoreToY((zone.y0 + zone.y1) / 2) + 3}
              textAnchor="end"
              fill={zone.color}
              fillOpacity="0.35"
              fontSize="7"
              fontFamily="var(--font-mono)"
              fontWeight="700"
            >
              {zone.label}
            </text>
          ))}

          {/* Area fill */}
          <motion.path
            d={areaPath}
            fill="url(#trendFill)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          />

          {/* Line */}
          <motion.path
            d={linePath}
            fill="none"
            stroke="url(#trendStroke)"
            strokeWidth="2"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          />

          {/* Data points */}
          {coords.map((pt, i) => {
            const dp = dataPoints[i];
            const isHovered = hoveredIdx === i;
            const color = riskColor(dp.score);
            return (
              <g key={i}>
                {/* Hover target (invisible larger circle) */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={14}
                  fill="transparent"
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  style={{ cursor: 'pointer' }}
                />
                {/* Glow */}
                {(dp.isCurrent || isHovered) && (
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={8}
                    fill={color}
                    fillOpacity="0.15"
                  />
                )}
                {/* Dot */}
                <motion.circle
                  cx={pt.x}
                  cy={pt.y}
                  r={dp.isCurrent ? 4.5 : isHovered ? 4 : 3}
                  fill={color}
                  stroke="rgba(0,0,0,0.5)"
                  strokeWidth="1.5"
                  initial={{ r: 0 }}
                  animate={{ r: dp.isCurrent ? 4.5 : isHovered ? 4 : 3 }}
                  transition={{ duration: 0.3, delay: 0.2 + i * 0.06 }}
                />
                {/* Date label */}
                <text
                  x={pt.x}
                  y={CHART_H - 5}
                  textAnchor="middle"
                  fill={dp.isCurrent ? 'var(--alpha-text-55)' : 'var(--alpha-text-25)'}
                  fontSize="7.5"
                  fontFamily="var(--font-mono)"
                  fontWeight={dp.isCurrent ? '700' : '500'}
                >
                  {dp.label}
                </text>
                {/* Score tooltip on hover */}
                {isHovered && (
                  <g>
                    <rect
                      x={pt.x - 22}
                      y={pt.y - 26}
                      width={44}
                      height={18}
                      rx={6}
                      fill="rgba(0,0,0,0.85)"
                      stroke={color}
                      strokeWidth="0.5"
                      strokeOpacity="0.5"
                    />
                    <text
                      x={pt.x}
                      y={pt.y - 14}
                      textAnchor="middle"
                      fill={color}
                      fontSize="10"
                      fontFamily="var(--font-mono)"
                      fontWeight="800"
                    >
                      {dp.score}/100
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </motion.div>
  );
};

export default RiskTrendChart;
