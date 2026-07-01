// ThreatLevelGauge.tsx — Phase 1 Visual Content Transformation
//
// Cinematic semicircle risk gauge replacing the text "Situation Brief" paragraph.
// Users understand their threat level instantly — before reading a single word.
// Visual hierarchy: gauge → urgency badge → time window → key intel chips

import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Zap, TrendingUp, AlertTriangle, Shield, ArrowRight } from 'lucide-react';

interface Props {
  score: number;
  urgency: string;           // 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW'
  companyName?: string;
  topThreat?: string;
  strongestShield?: string;
  primaryAction?: string;
  scoreColor: string;
}

// SVG coordinate system for the gauge
const W = 240;
const H = 140;
const CX = W / 2;
const CY = H - 12;
const R  = 98;

// Score → angle on the semicircle (π at left = 0%, 0 at right = 100%)
const scoreToAngle = (s: number) => Math.PI - (Math.max(0, Math.min(100, s)) / 100) * Math.PI;

// Angle + optional radius → SVG x,y
// Y is negated because the visible arc opens upward (SVG y-axis is inverted).
const polar = (angle: number, r = R): [number, number] =>
  [CX + r * Math.cos(angle), CY - r * Math.sin(angle)];

// Build an SVG arc-path string
// sweep=0 draws the upper (visible) semicircle after the y-axis flip in polar().
function arcPath(startScore: number, endScore: number, r: number): string {
  const a1 = scoreToAngle(startScore);
  const a2 = scoreToAngle(endScore);
  const [x1, y1] = polar(a1, r);
  const [x2, y2] = polar(a2, r);
  return `M ${x1} ${y1} A ${r} ${r} 0 0 0 ${x2} ${y2}`;
}

const ZONES = [
  { from: 0,   to: 35,  color: '#10b981', label: 'Safe',     opacity: 0.55 },
  { from: 35,  to: 55,  color: '#f59e0b', label: 'Caution',  opacity: 0.60 },
  { from: 55,  to: 75,  color: '#f97316', label: 'High',     opacity: 0.70 },
  { from: 75,  to: 100, color: '#dc2626', label: 'Critical', opacity: 0.80 },
];

const URGENCY: Record<string, { color: string; bg: string; border: string; Icon: React.ElementType; window: string }> = {
  CRITICAL: { color: '#dc2626', bg: 'rgba(220,38,38,0.10)', border: 'rgba(220,38,38,0.25)', Icon: AlertTriangle, window: '30–60 day window' },
  HIGH:     { color: '#f97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.22)', Icon: TrendingUp,   window: '60–90 day window' },
  MODERATE: { color: '#f59e0b', bg: 'rgba(245,158,11,0.07)', border: 'rgba(245,158,11,0.20)', Icon: Zap,          window: '6–12 month window' },
  LOW:      { color: '#10b981', bg: 'rgba(16,185,129,0.07)', border: 'rgba(16,185,129,0.20)', Icon: Shield,       window: 'Stable horizon' },
};

export const ThreatLevelGauge: React.FC<Props> = ({
  score, urgency, companyName, topThreat, strongestShield, primaryAction, scoreColor,
}) => {
  const urg = URGENCY[urgency] ?? URGENCY.MODERATE;
  const { Icon: UrgIcon } = urg;

  // Needle calculations
  const needleAngle  = scoreToAngle(score);
  const needleTipR   = R - 8;
  const needleBaseR  = 10;
  const [tx, ty]     = polar(needleAngle, needleTipR);
  const [b1x, b1y]   = polar(needleAngle + Math.PI / 2, needleBaseR);
  const [b2x, b2y]   = polar(needleAngle - Math.PI / 2, needleBaseR);

  return (
    <div className="threat-gauge-wrap">

      {/* SVG Gauge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="threat-gauge-svg-wrap"
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="threat-gauge-svg" aria-label={`Risk level ${score} out of 100`}>
          <defs>
            <filter id="tg-glow">
              <feGaussianBlur stdDeviation="3" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="tg-needle-glow">
              <feGaussianBlur stdDeviation="2" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Track (full semicircle) */}
          <path
            d={arcPath(0, 100, R)}
            fill="none"
            stroke="var(--alpha-bg-06)"
            strokeWidth={12}
            strokeLinecap="round"
          />

          {/* Colored zone arcs */}
          {ZONES.map(z => (
            <motion.path
              key={z.label}
              d={arcPath(z.from, z.to, R)}
              fill="none"
              stroke={z.color}
              strokeWidth={12}
              strokeLinecap="butt"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: z.opacity }}
              transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
              style={{ filter: `drop-shadow(0 0 4px ${z.color}44)` }}
            />
          ))}

          {/* Score arc overlay — bright highlight up to current score */}
          <motion.path
            d={arcPath(0, score, R)}
            fill="none"
            stroke={scoreColor}
            strokeWidth={5}
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.90 }}
            transition={{ duration: 0.80, delay: 0.30, ease: [0.22, 1, 0.36, 1] }}
            style={{ filter: `drop-shadow(0 0 6px ${scoreColor}99)` }}
          />

          {/* Tick marks */}
          {[0, 25, 50, 75, 100].map(tick => {
            const a = scoreToAngle(tick);
            const [ix, iy] = polar(a, R + 8);
            const [ox, oy] = polar(a, R + 16);
            return (
              <line key={tick} x1={ix} y1={iy} x2={ox} y2={oy}
                stroke="var(--alpha-text-20)" strokeWidth={1.5} strokeLinecap="round" />
            );
          })}

          {/* Zone labels — radius kept within W/2 (CX) minus text half-width so
              "CRITICAL"/"SAFE" never clip past the viewBox edge (R + 26 put the
              Critical label's right edge ~11px past the 240-wide viewBox). */}
          {ZONES.map(z => {
            const mid = (z.from + z.to) / 2;
            const a = scoreToAngle(mid);
            const [lx, ly] = polar(a, R + 12);
            return (
              <text key={z.label} x={lx} y={ly}
                textAnchor="middle" dominantBaseline="middle"
                fill={z.color} fontSize="7" fontFamily="var(--font-mono)"
                fontWeight="700" opacity="0.65" letterSpacing="0.05em">
                {z.label.toUpperCase()}
              </text>
            );
          })}

          {/* Needle */}
          <motion.polygon
            points={`${tx},${ty} ${b1x},${b1y} ${b2x},${b2y}`}
            fill={scoreColor}
            fillOpacity="0.90"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.65, duration: 0.4 }}
            style={{ filter: `drop-shadow(0 0 5px ${scoreColor}88)` }}
          />

          {/* Needle pivot circle */}
          <circle cx={CX} cy={CY} r={6} fill="var(--alpha-bg-10)" stroke={scoreColor} strokeWidth={1.5} />
          <circle cx={CX} cy={CY} r={2.5} fill={scoreColor} />

          {/* Score number — animate opacity only; y is a fixed SVG attribute */}
          <motion.text
            x={CX} y={CY - 28}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={scoreColor}
            fontSize="28"
            fontFamily="var(--font-mono)"
            fontWeight="900"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.50, duration: 0.4 }}
            style={{ filter: `drop-shadow(0 0 8px ${scoreColor}55)` }}
          >
            {score}
          </motion.text>
          <text x={CX} y={CY - 14} textAnchor="middle"
            fill="var(--alpha-text-30)" fontSize="8" fontFamily="var(--font-mono)">
            /100
          </text>
        </svg>
      </motion.div>

      {/* Urgency badge row */}
      <motion.div
        className="threat-gauge-urgency"
        style={{
          '--urg-color': urg.color,
          '--urg-bg': urg.bg,
          '--urg-border': urg.border,
        } as React.CSSProperties}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.35 }}
      >
        <UrgIcon className="w-3.5 h-3.5 flex-shrink-0 threat-urgency-icon" />
        <span className="threat-urgency-label">{urgency.replace(/_/g, ' ')}</span>
        <span className="threat-urgency-sep">·</span>
        <Clock className="w-3 h-3 flex-shrink-0 threat-urgency-clock" />
        <span className="threat-urgency-window">{urg.window}</span>
        {companyName && (
          <>
            <span className="threat-urgency-sep">@</span>
            <span className="threat-urgency-company">{companyName}</span>
          </>
        )}
      </motion.div>

      {/* Intel chips — top threat + strongest shield */}
      {(topThreat || strongestShield) && (
        <motion.div
          className="threat-intel-chips"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.70, duration: 0.35 }}
        >
          {topThreat && (
            <div className="threat-chip threat-chip--risk">
              <AlertTriangle className="w-3 h-3 flex-shrink-0 text-red-400" />
              <div className="min-w-0">
                <p className="threat-chip-label">PRIMARY THREAT</p>
                <p className="threat-chip-text">{topThreat}</p>
              </div>
            </div>
          )}
          {strongestShield && (
            <div className="threat-chip threat-chip--shield">
              <Shield className="w-3 h-3 flex-shrink-0 text-emerald-400" />
              <div className="min-w-0">
                <p className="threat-chip-label">STRONGEST SHIELD</p>
                <p className="threat-chip-text">{strongestShield}</p>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Primary action CTA */}
      {primaryAction && (
        <motion.div
          className="threat-primary-action"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.82, duration: 0.30 }}
        >
          <ArrowRight className="w-3 h-3 flex-shrink-0" />
          <span className="threat-action-label">TOP ACTION</span>
          <span className="threat-action-text">{primaryAction}</span>
        </motion.div>
      )}
    </div>
  );
};

export default ThreatLevelGauge;
