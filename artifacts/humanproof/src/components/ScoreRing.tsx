// ScoreRing.tsx — v10.0 Data Intelligence redesign
// Multi-layer ring: gradient stroke + outer pulse ring + background glow disc + score delta

import React, { useId } from "react";
import { motion } from "framer-motion";

interface ScoreRingProps {
  score: number;
  color: string;
  size?: number;
  isMobile?: boolean;
  scoreDelta?: number | null;  // e.g. +8 or -4 from previous session
  /** v12.0: Rate of change in pts/month. Positive = risk increasing. */
  velocityPtsPerMonth?: number | null;
}

// Returns gradient stop colors per risk tier
function getRingGradient(score: number): { start: string; mid: string; end: string } {
  if (score >= 70) return { start: "#ef4444", mid: "#f97316", end: "rgba(239,68,68,0.35)" };
  if (score >= 50) return { start: "#f97316", mid: "#f59e0b", end: "rgba(249,115,22,0.35)" };
  if (score >= 35) return { start: "#f59e0b", mid: "#eab308", end: "rgba(245,158,11,0.35)" };
  return { start: "#10b981", mid: "#34d399", end: "rgba(16,185,129,0.35)" };
}

function getScoreLabel(score: number): string {
  if (score >= 75) return "CRITICAL";
  if (score >= 60) return "HIGH RISK";
  if (score >= 40) return "ELEVATED";
  if (score >= 20) return "MODERATE";
  return "LOW RISK";
}

export const ScoreRing: React.FC<ScoreRingProps> = ({
  score,
  color,
  size = 200,
  isMobile = false,
  scoreDelta = null,
  velocityPtsPerMonth = null,
}) => {
  // Stable IDs that don't change when score changes — prevents SVG gradient re-registration issues
  const uid = useId().replace(/:/g, '_');
  const strokeWidth = isMobile ? 10 : 13;
  const r = size / 2 - strokeWidth - 6;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.max(0, Math.min(100, score)) / 100);
  const gradientId = `scoreGrad_${uid}`;
  const pulseGradId = `pulseGrad_${uid}`;
  const glowId = `glowFilter_${uid}`;
  const { start, mid, end } = getRingGradient(score);

  // Outer pulse ring radius (slightly larger)
  const pulseR = r + strokeWidth + 8;
  const pulseCirc = 2 * Math.PI * pulseR;
  const pulseOffset = pulseCirc * (1 - score / 100);

  const fontSize = isMobile ? "1.8rem" : "3rem";
  const labelSize = isMobile ? "0.48rem" : "0.6rem";

  return (
    <div
      style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
      role="img"
      aria-label={`Risk score: ${score} out of 100`}
    >
      {/* Halo pulse rings — concentric animated rings */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          width: size + 16,
          height: size + 16,
          borderRadius: "50%",
          border: `1px solid ${color}4d`,
          animation: "halo-pulse 3s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          width: size + 40,
          height: size + 40,
          borderRadius: "50%",
          border: `1px solid ${color}29`,
          animation: "halo-pulse-2 3s ease-in-out 0.5s infinite",
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          width: size + 72,
          height: size + 72,
          borderRadius: "50%",
          border: `1px solid ${color}14`,
          animation: "halo-pulse-3 3s ease-in-out 1s infinite",
          pointerEvents: "none",
        }}
      />

      {/* Outer ambient disc — wide, soft glow that bleeds out to panel edges */}
      <div
        aria-hidden="true"
        className="score-ambient-breathe"
        style={{
          position: "absolute",
          width: size * 2.0,
          height: size * 2.0,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${color}18 0%, transparent 65%)`,
          filter: "blur(48px)",
          pointerEvents: "none",
        }}
      />
      {/* Inner glow disc — tighter, more vibrant */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          width: size * 0.90,
          height: size * 0.90,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${color}32 0%, transparent 70%)`,
          filter: "blur(22px)",
          pointerEvents: "none",
        }}
      />

      <svg
        width={size}
        height={size}
        style={{ transform: "rotate(-90deg)", overflow: "visible" }}
        aria-hidden="true"
      >
        <defs>
          {/* Gradient for main score arc */}
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor={start} />
            <stop offset="50%"  stopColor={mid} />
            <stop offset="100%" stopColor={end} />
          </linearGradient>

          {/* Outer pulse ring gradient */}
          <linearGradient id={pulseGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor={start} stopOpacity="0.4" />
            <stop offset="100%" stopColor={start} stopOpacity="0" />
          </linearGradient>

          {/* Glow filter for main arc */}
          <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.04)"
          strokeWidth={strokeWidth}
        />

        {/* Outer pulse ring — faint, slightly larger, pulsing */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={pulseR}
          fill="none"
          stroke={`url(#${pulseGradId})`}
          strokeWidth={3}
          strokeDasharray={pulseCirc}
          strokeDashoffset={pulseOffset}
          strokeLinecap="round"
          animate={{ opacity: [0.5, 0.12, 0.5], scale: [1, 1.04, 1] }}
          transition={{ repeat: Infinity, duration: 2.8, ease: "easeInOut" }}
          style={{ transformOrigin: `${size / 2}px ${size / 2}px` }}
        />

        {/* Main score arc — gradient stroke */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.4, ease: [0.34, 1.56, 0.64, 1] }}
          strokeLinecap="round"
          filter={`url(#${glowId})`}
        />

        {/* Indicator tip dot */}
        <motion.circle
          cx={size / 2 + r * Math.cos((score / 100) * 2 * Math.PI - Math.PI / 2)}
          cy={size / 2 + r * Math.sin((score / 100) * 2 * Math.PI - Math.PI / 2)}
          r={strokeWidth / 2 + 1}
          fill="#fff"
          style={{ filter: `drop-shadow(0 0 6px ${start})` }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0.7, 1, 0.7], scale: 1 }}
          transition={{
            opacity: { repeat: Infinity, duration: 2.2, ease: "easeInOut" },
            scale: { duration: 0.4, delay: 1.0, ease: [0.34, 1.56, 0.64, 1] },
          }}
        />
      </svg>

      {/* Center content */}
      <div style={{ position: "absolute", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "3px" }}>
        {/* Score number — display font for impact */}
        <motion.div
          className="score-massive"
          initial={{ opacity: 0, scale: 0.6, filter: "blur(8px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.55, delay: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
          style={{
            fontSize,
            color: start,
            fontFamily: "var(--font-display)",
            textShadow: `0 0 30px ${start}55`,
          }}
        >
          {Math.round(score)}
        </motion.div>

        {/* Risk tier label */}
        <div
          className="data-label"
          style={{ fontSize: labelSize, color, opacity: 0.7, letterSpacing: "0.18em" }}
        >
          {getScoreLabel(score)}
        </div>

        {/* Score delta badge — shown only when delta is provided */}
        {scoreDelta != null && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.3 }}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.58rem",
              fontWeight: 800,
              letterSpacing: "0.1em",
              color: scoreDelta > 0 ? "#ef4444" : "#10b981",
              background: scoreDelta > 0 ? "rgba(239,68,68,0.12)" : "rgba(16,185,129,0.12)",
              border: `1px solid ${scoreDelta > 0 ? "rgba(239,68,68,0.25)" : "rgba(16,185,129,0.25)"}`,
              borderRadius: "4px",
              padding: "1px 6px",
              marginTop: "2px",
            }}
          >
            {scoreDelta > 0 ? `+${scoreDelta}` : scoreDelta} {scoreDelta > 0 ? "▲" : "▼"} 30d
          </motion.div>
        )}

        {/* v12.0: Score velocity indicator — shown when |velocity| > 1.5 pts/month */}
        {velocityPtsPerMonth != null && Math.abs(velocityPtsPerMonth) > 1.5 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.1, duration: 0.25 }}
            title={`Risk score trending ${velocityPtsPerMonth > 0 ? 'up' : 'down'} at ${Math.abs(velocityPtsPerMonth).toFixed(1)} pts/month`}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.52rem",
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: velocityPtsPerMonth > 0 ? "#f97316" : "#34d399",
              background: velocityPtsPerMonth > 0 ? "rgba(249,115,22,0.10)" : "rgba(52,211,153,0.10)",
              border: `1px solid ${velocityPtsPerMonth > 0 ? "rgba(249,115,22,0.25)" : "rgba(52,211,153,0.25)"}`,
              borderRadius: "4px",
              padding: "1px 5px",
              marginTop: "2px",
            }}
          >
            {velocityPtsPerMonth > 0 ? "↑" : "↓"} {Math.abs(velocityPtsPerMonth).toFixed(1)}/mo
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ScoreRing;
