// Section2_AgenticWaveExposure — The "wow" section.
// Dual score card: TODAY vs PROJECTED agentic scenario.

import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, TrendingUp, Zap } from 'lucide-react';
import type { AgenticWaveScore } from '../../data/agenticWaveTypes';
import { getScoreColor } from '../../data/riskFormula';

interface Props {
  waveScore: AgenticWaveScore;
}

const ADOPTION_LABELS: Record<string, string> = {
  fast: 'FAST — Ahead of the industry curve',
  moderate: 'MODERATE — In line with sector average',
  slow: 'SLOW — Structural barriers limit speed',
};

function ScoreRing({ score, color, label, size = 90 }: { score: number; color: string; label: string; size?: number }) {
  const r = size / 2 - 8;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - score / 100);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
          <circle cx={size/2} cy={size/2} r={r} fill="none"
            stroke={color} strokeWidth="6"
            strokeDasharray={c} strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transform: `rotate(-90deg)`, transformOrigin: `${size/2}px ${size/2}px`, filter: `drop-shadow(0 0 8px ${color}55)`, transition: 'stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: size > 80 ? 22 : 16, fontWeight: 900, color, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{score}</span>
        </div>
      </div>
      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'center' }}>{label}</span>
    </div>
  );
}

export const Section2_AgenticWaveExposure: React.FC<Props> = ({ waveScore }) => {
  const currentColor = getScoreColor(waveScore.currentScore);
  const gap = waveScore.projectedScore - waveScore.currentScore;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Projection disclaimer */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 14px', borderRadius: 999,
        background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.20)',
        fontSize: 10, color: 'rgba(245,158,11,0.85)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em',
      }}>
        <AlertTriangle size={11} />
        PROJECTION — Estimated agentic AI mainstream scenario · 2028–2032 · Not a guaranteed outcome
      </div>

      {/* Dual score card */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-around',
          flexWrap: 'wrap', gap: 24,
          padding: '28px 24px', borderRadius: 16,
          background: 'linear-gradient(135deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))',
          border: '1px solid rgba(255,255,255,0.09)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>Current Risk</div>
          <ScoreRing score={waveScore.currentScore} color={currentColor} label="Today" size={100} />
        </div>

        {/* Arrow & gap */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: waveScore.scoreColor }}>
            <TrendingUp size={18} />
            <span style={{ fontSize: 20, fontWeight: 900, fontFamily: 'var(--font-mono)', color: waveScore.scoreColor }}>+{gap}</span>
          </div>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.30)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Exposure Gap</span>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: waveScore.scoreColor, fontFamily: 'var(--font-mono)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
            2030 Structural Exposure
          </div>
          <ScoreRing score={waveScore.projectedScore} color={waveScore.scoreColor} label={waveScore.scoreLabel} size={100} />
        </div>
      </motion.div>

      {/* Industry adoption speed */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px', borderRadius: 10,
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
      }}>
        <Zap size={13} style={{ color: 'var(--cyan,#22d3ee)', flexShrink: 0 }} />
        <div>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Industry Adoption Speed · </span>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.70)', fontFamily: 'var(--font-mono)' }}>
            {ADOPTION_LABELS[waveScore.industryAdoptionSpeed] ?? waveScore.industryAdoptionSpeed.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Key drivers */}
      <div style={{ padding: '16px 18px', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
          Why the Gap Exists
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {waveScore.keyDrivers.map((d, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 1.65 }}>
              <span style={{ color: waveScore.scoreColor, flexShrink: 0, marginTop: 2 }}>→</span>
              <span>{d}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Projection window note */}
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)', lineHeight: 1.6, fontStyle: 'italic', padding: '0 4px' }}>
        {waveScore.projectionWindow}. This score assumes widespread deployment of autonomous AI agents across enterprise workflows. Actual timing will vary by organisation, regulation, and economic conditions.
      </div>
    </div>
  );
};

export default Section2_AgenticWaveExposure;
