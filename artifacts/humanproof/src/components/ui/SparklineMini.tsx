// SparklineMini.tsx — v10.0 Reusable inline SVG sparkline
// Renders a 80×32px path with animated stroke-dashoffset reveal.
// Data points are normalized to the component's height.
// Accepts up to 12 points; gracefully renders 2+ points.

import React, { useId } from "react";

interface SparklineMiniProps {
  data: number[];          // raw values (normalized internally)
  color?: string;          // stroke color (default: var(--cyan))
  filled?: boolean;        // show gradient fill under the line
  width?: number;
  height?: number;
  strokeWidth?: number;
  delay?: number;          // animation delay in ms
  className?: string;
}

function normalize(data: number[], h: number, padding = 3): number[] {
  if (data.length < 2) return data.map(() => h / 2);
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  return data.map(v => padding + ((max - v) / range) * (h - padding * 2));
}

function buildPath(xs: number[], ys: number[]): string {
  if (xs.length < 2) return "";
  // Smooth catmull-rom via cardinal spline approximation
  const pts = xs.map((x, i) => ({ x, y: ys[i] }));
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const cpx = (prev.x + curr.x) / 2;
    d += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
  }
  return d;
}

export const SparklineMini: React.FC<SparklineMiniProps> = ({
  data,
  color = "var(--cyan)",
  filled = true,
  width = 80,
  height = 32,
  strokeWidth = 1.5,
  delay = 200,
  className = "",
}) => {
  const uid = useId().replace(/:/g, "_");
  const gradId = `spark_grad_${uid}`;
  const clipId = `spark_clip_${uid}`;

  if (!data || data.length < 2) {
    return <svg width={width} height={height} className={className} aria-hidden="true" />;
  }

  const step = (width - 4) / (data.length - 1);
  const xs = data.map((_, i) => 2 + i * step);
  const ys = normalize(data, height);
  const linePath = buildPath(xs, ys);

  // Area path: close the line path at the bottom
  const areaPath = `${linePath} L ${xs[xs.length - 1]} ${height} L ${xs[0]} ${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`sparkline-inline ${className}`}
      aria-hidden="true"
      style={{ display: "block", overflow: "visible" }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
        <clipPath id={clipId}>
          <rect x="0" y="0" width={width} height={height} />
        </clipPath>
      </defs>

      {/* Gradient fill area */}
      {filled && (
        <path
          d={areaPath}
          fill={`url(#${gradId})`}
          clipPath={`url(#${clipId})`}
          style={{ opacity: 0.6 }}
        />
      )}

      {/* Stroke line with animated draw */}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        clipPath={`url(#${clipId})`}
        style={{
          strokeDasharray: 400,
          strokeDashoffset: 400,
          animation: `sparkline-draw 600ms cubic-bezier(0.22,1,0.36,1) both`,
          animationDelay: `${delay}ms`,
        }}
      />

      {/* End dot */}
      <circle
        cx={xs[xs.length - 1]}
        cy={ys[ys.length - 1]}
        r={2.5}
        fill={color}
        style={{
          opacity: 0,
          animation: `metric-count-up 300ms ease both`,
          animationDelay: `${delay + 500}ms`,
          animationFillMode: "forwards",
        }}
      />
    </svg>
  );
};

export default SparklineMini;
