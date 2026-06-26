// GaugeDial.tsx — v10.0 Semi-circular SVG gauge dial
// Displays a 0–100 score as a half-arc with animated needle and colored fill.
// Used in DepartmentRiskPanel and SkillRiskGauge.

import React from "react";
import { motion } from "framer-motion";

interface GaugeDialProps {
  value: number;          // 0–100
  label?: string;         // center label below value
  size?: number;          // diameter (default 140)
  color?: string;         // arc color (inferred from value if not set)
  trackColor?: string;
  className?: string;
  showTicks?: boolean;
}

function inferColor(value: number): string {
  if (value >= 70) return 'var(--color-red-text)';
  if (value >= 50) return 'var(--color-orange-text)';
  if (value >= 35) return 'var(--color-amber500-text)';
  return 'var(--color-emerald-text)';
}

export const GaugeDial: React.FC<GaugeDialProps> = ({
  value,
  label = "EXPOSURE",
  size = 140,
  color,
  trackColor = "var(--alpha-bg-06)",
  className = "",
  showTicks = false,
}) => {
  const arcColor = color ?? inferColor(value);
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 16;
  const strokeWidth = 12;

  // Semi-circle: from 180° to 0° (left to right)
  // We draw on the bottom half of the SVG
  const startAngle = -180; // left
  const endAngle   =    0; // right
  const totalAngle = endAngle - startAngle; // 180°

  // Convert angle to SVG coordinates (angles in degrees, origin at top)
  const toXY = (angleDeg: number) => {
    const rad = (angleDeg * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  };

  // Build arc path (large-arc-flag, sweep-flag)
  function arcPath(fromDeg: number, toDeg: number) {
    const from = toXY(fromDeg);
    const to   = toXY(toDeg);
    const largeArc = Math.abs(toDeg - fromDeg) > 180 ? 1 : 0;
    return `M ${from.x} ${from.y} A ${r} ${r} 0 ${largeArc} 1 ${to.x} ${to.y}`;
  }

  // Track arc (full 180°)
  const trackPath  = arcPath(startAngle, endAngle);

  // Value arc (0 to value%)
  const valueDeg   = startAngle + (value / 100) * totalAngle;
  const valuePath  = value > 0 ? arcPath(startAngle, Math.min(valueDeg, endAngle - 0.5)) : "";

  // Needle tip position
  const needleTip  = toXY(valueDeg);

  // Tick marks (every 25%)
  const ticks = showTicks ? [0, 25, 50, 75, 100].map(pct => {
    const deg = startAngle + (pct / 100) * totalAngle;
    const inner = { x: cx + (r - 8)  * Math.cos((deg * Math.PI) / 180), y: cy + (r - 8)  * Math.sin((deg * Math.PI) / 180) };
    const outer = { x: cx + (r + 4)  * Math.cos((deg * Math.PI) / 180), y: cy + (r + 4)  * Math.sin((deg * Math.PI) / 180) };
    return { inner, outer, label: `${pct}` };
  }) : [];

  const circumference = Math.PI * r; // half circle

  return (
    <div
      className={`flex flex-col items-center ${className}`}
      style={{ width: size, position: "relative" }}
    >
      <svg
        width={size}
        height={size / 2 + 20}
        viewBox={`0 0 ${size} ${size / 2 + 20}`}
        aria-hidden="true"
        style={{ overflow: "visible" }}
      >
        <defs>
          <linearGradient id={`gauge_grad_${value}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor={arcColor} stopOpacity="0.5" />
            <stop offset="100%" stopColor={arcColor} stopOpacity="1" />
          </linearGradient>
          <filter id={`gauge_glow_${value}`}>
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background track */}
        <path
          d={trackPath}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Color zone segments (green→amber→red bands) */}
        {[
          { from: -180, to: -108, color: 'var(--color-emerald-text)' },   // 0–40% — green
          { from: -108, to:  -36, color: 'var(--color-amber500-text)' },   // 40–70% — amber
          { from:  -36, to:    0, color: 'var(--color-red-text)' },   // 70–100% — red
        ].map(({ from, to, color: zoneColor }) => (
          <path
            key={`${from}-${to}`}
            d={arcPath(from, to)}
            fill="none"
            stroke={zoneColor}
            strokeWidth={strokeWidth - 4}
            strokeLinecap="butt"
            opacity={0.12}
          />
        ))}

        {/* Value arc */}
        {valuePath && (
          <motion.path
            d={valuePath}
            fill="none"
            stroke={`url(#gauge_grad_${value})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            filter={`url(#gauge_glow_${value})`}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
          />
        )}

        {/* Needle dot */}
        {value > 0 && value < 100 && (
          <motion.circle
            cx={needleTip.x}
            cy={needleTip.y}
            r={strokeWidth / 2 + 1}
            fill="#fff"
            style={{ filter: `drop-shadow(0 0 6px ${arcColor})` }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.0, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          />
        )}

        {/* Tick marks */}
        {ticks.map((t, i) => (
          <line
            key={i}
            x1={t.inner.x}
            y1={t.inner.y}
            x2={t.outer.x}
            y2={t.outer.y}
            stroke="var(--alpha-bg-08)"
            strokeWidth={1.5}
          />
        ))}
      </svg>

      {/* Center label */}
      <div
        style={{
          marginTop: "-8px",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "2px",
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.6rem",
            fontWeight: 900,
            letterSpacing: "-0.04em",
            color: arcColor,
            lineHeight: 1,
          }}
        >
          {value}
        </motion.div>
        <div className="data-label">{label}</div>
      </div>
    </div>
  );
};

export default GaugeDial;
