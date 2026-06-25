// SkillRadarChart.tsx — P0 Visual Intelligence
//
// SVG spider/radar chart for skill dimension visualization.
// Renders an interactive radar plot showing 5-8 skill dimensions
// with current level, market demand, and AI disruption overlays.
// Supports hover for dimension detail and animated mount.

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { riskColor } from '../../../lib/riskTokens';

export interface RadarDimension {
  key: string;
  label: string;
  value: number;        // 0-100: user's current score
  benchmark?: number;   // 0-100: market benchmark
  disruption?: number;  // 0-100: AI disruption risk
}

interface SkillRadarChartProps {
  dimensions: RadarDimension[];
  title?: string;
  className?: string;
}

const SIZE = 240;
const CENTER = SIZE / 2;
const RINGS = 4;
const MAX_R = 90;

function polarToXY(angle: number, radius: number): [number, number] {
  const rad = (angle - 90) * (Math.PI / 180);
  return [CENTER + radius * Math.cos(rad), CENTER + radius * Math.sin(rad)];
}

function buildPolygon(values: number[], count: number): string {
  const angleStep = 360 / count;
  return values
    .map((v, i) => {
      const r = (v / 100) * MAX_R;
      const [x, y] = polarToXY(i * angleStep, r);
      return `${x},${y}`;
    })
    .join(' ');
}

export const SkillRadarChart: React.FC<SkillRadarChartProps> = ({
  dimensions,
  title = 'SKILL RADAR',
  className,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const count = dimensions.length;
  const angleStep = 360 / count;

  const userPolygon = useMemo(
    () => buildPolygon(dimensions.map(d => d.value), count),
    [dimensions, count],
  );

  const benchmarkPolygon = useMemo(() => {
    const hasBenchmark = dimensions.some(d => d.benchmark != null);
    if (!hasBenchmark) return null;
    return buildPolygon(dimensions.map(d => d.benchmark ?? 50), count);
  }, [dimensions, count]);

  if (count < 3) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={className}
    >
      <p
        className="text-[9px] font-black tracking-[0.14em] uppercase mb-2.5"
        style={{ color: 'var(--alpha-text-25)', fontFamily: 'var(--font-mono)' }}
      >
        {title}
      </p>

      <div
        className="rounded-xl overflow-hidden relative flex justify-center py-3"
        style={{
          background: 'var(--alpha-bg-04)',
          border: '1px solid var(--alpha-bg-08)',
        }}
      >
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full" style={{ maxWidth: 280, maxHeight: 280 }}>
          <defs>
            <radialGradient id="radarUserFill">
              <stop offset="0%" stopColor="var(--cyan)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="var(--cyan)" stopOpacity="0.05" />
            </radialGradient>
          </defs>

          {/* Concentric ring grid */}
          {Array.from({ length: RINGS }, (_, i) => {
            const r = ((i + 1) / RINGS) * MAX_R;
            const points = Array.from({ length: count }, (_, j) => {
              const [x, y] = polarToXY(j * angleStep, r);
              return `${x},${y}`;
            }).join(' ');
            return (
              <polygon
                key={`ring-${i}`}
                points={points}
                fill="none"
                stroke="var(--alpha-bg-06)"
                strokeWidth="0.5"
              />
            );
          })}

          {/* Axis lines */}
          {dimensions.map((_, i) => {
            const [x, y] = polarToXY(i * angleStep, MAX_R);
            return (
              <line
                key={`axis-${i}`}
                x1={CENTER}
                y1={CENTER}
                x2={x}
                y2={y}
                stroke="var(--alpha-bg-06)"
                strokeWidth="0.5"
              />
            );
          })}

          {/* Benchmark polygon (dashed) */}
          {benchmarkPolygon && (
            <motion.polygon
              points={benchmarkPolygon}
              fill="none"
              stroke="rgba(245,158,11,0.40)"
              strokeWidth="1"
              strokeDasharray="4 3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            />
          )}

          {/* User polygon (filled) */}
          <motion.polygon
            points={userPolygon}
            fill="url(#radarUserFill)"
            stroke="var(--cyan)"
            strokeWidth="1.5"
            strokeLinejoin="round"
            initial={{ opacity: 0, scale: 0.3 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: `${CENTER}px ${CENTER}px` }}
          />

          {/* Disruption risk overlay dots */}
          {dimensions.map((dim, i) => {
            if (dim.disruption == null || dim.disruption < 40) return null;
            const r = (dim.value / 100) * MAX_R;
            const [x, y] = polarToXY(i * angleStep, r);
            const disruptColor = dim.disruption >= 70 ? '#ef4444' : dim.disruption >= 55 ? '#f97316' : '#f59e0b';
            return (
              <circle
                key={`disrupt-${i}`}
                cx={x}
                cy={y}
                r={3 + (dim.disruption / 100) * 3}
                fill={disruptColor}
                fillOpacity="0.20"
                stroke={disruptColor}
                strokeWidth="0.5"
                strokeOpacity="0.4"
              />
            );
          })}

          {/* Data points */}
          {dimensions.map((dim, i) => {
            const r = (dim.value / 100) * MAX_R;
            const [x, y] = polarToXY(i * angleStep, r);
            const isHovered = hoveredIdx === i;
            return (
              <g key={`dot-${i}`}>
                <circle
                  cx={x}
                  cy={y}
                  r={16}
                  fill="transparent"
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  style={{ cursor: 'pointer' }}
                />
                <motion.circle
                  cx={x}
                  cy={y}
                  r={isHovered ? 4.5 : 3}
                  fill="var(--cyan)"
                  stroke="rgba(0,0,0,0.6)"
                  strokeWidth="1.5"
                  initial={{ r: 0 }}
                  animate={{ r: isHovered ? 4.5 : 3 }}
                  transition={{ duration: 0.2 }}
                />
              </g>
            );
          })}

          {/* Axis labels */}
          {dimensions.map((dim, i) => {
            const labelR = MAX_R + 18;
            const [x, y] = polarToXY(i * angleStep, labelR);
            const isHovered = hoveredIdx === i;
            return (
              <text
                key={`label-${i}`}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                fill={isHovered ? 'var(--alpha-text-85)' : 'var(--alpha-text-45)'}
                fontSize={isHovered ? '8.5' : '7.5'}
                fontFamily="var(--font-body)"
                fontWeight={isHovered ? '700' : '500'}
                style={{ transition: 'fill 150ms, font-size 150ms' }}
              >
                {dim.label.length > 14 ? dim.label.slice(0, 13) + '…' : dim.label}
              </text>
            );
          })}
        </svg>

        {/* Hover tooltip */}
        {hoveredIdx !== null && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-xl px-3 py-2"
            style={{
              background: 'rgba(0,0,0,0.90)',
              border: '1px solid rgba(0,212,224,0.25)',
              pointerEvents: 'none',
              minWidth: 140,
            }}
          >
            <p className="text-[11px] font-bold mb-0.5" style={{ color: 'var(--cyan)' }}>
              {dimensions[hoveredIdx].label}
            </p>
            <div className="flex gap-3">
              <span className="text-[10px]" style={{ color: 'var(--alpha-text-70)' }}>
                You: <strong style={{ color: '#fff' }}>{dimensions[hoveredIdx].value}</strong>
              </span>
              {dimensions[hoveredIdx].benchmark != null && (
                <span className="text-[10px]" style={{ color: 'rgba(245,158,11,0.8)' }}>
                  Market: <strong>{dimensions[hoveredIdx].benchmark}</strong>
                </span>
              )}
              {dimensions[hoveredIdx].disruption != null && (
                <span className="text-[10px]" style={{ color: riskColor(dimensions[hoveredIdx].disruption!) }}>
                  AI risk: <strong>{dimensions[hoveredIdx].disruption}%</strong>
                </span>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-2 justify-center">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-0.5 rounded-full" style={{ background: 'var(--cyan)' }} />
          <span className="text-[9px]" style={{ color: 'var(--alpha-text-35)' }}>Your profile</span>
        </div>
        {benchmarkPolygon && (
          <div className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-0.5 rounded-full"
              style={{ background: 'rgba(245,158,11,0.6)', borderTop: '1px dashed rgba(245,158,11,0.6)' }}
            />
            <span className="text-[9px]" style={{ color: 'var(--alpha-text-35)' }}>Market avg</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default SkillRadarChart;
