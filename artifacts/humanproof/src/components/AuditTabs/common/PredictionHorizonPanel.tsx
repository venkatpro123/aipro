// PredictionHorizonPanel.tsx — v17.0
// Displays 30d / 90d / 180d risk horizon scores with horizon-appropriate signal
// weight profiles. Surfaces the trajectory narrative and WARN Act override signal.

import React from 'react';
import { motion } from 'framer-motion';
import { Clock, AlertTriangle } from 'lucide-react';
import type { PredictionHorizonResult, HorizonRisk } from '../../../services/predictionHorizonService';

interface Props {
  predictionHorizon: PredictionHorizonResult;
  currentScore: number;
}

const HORIZON_LABELS: Record<string, { label: string; sublabel: string }> = {
  '30d':  { label: '30-Day',   sublabel: 'Near-term' },
  '90d':  { label: '90-Day',   sublabel: 'Quarterly' },
  '180d': { label: '180-Day',  sublabel: '6-Month' },
};

const WEIGHT_KEYS = ['L1', 'L2', 'L3', 'L4', 'L5'] as const;
const WEIGHT_COLORS: Record<string, string> = {
  L1: '#ef4444', L2: '#f97316', L3: '#f59e0b', L4: '#06b6d4', L5: '#10b981',
};
const WEIGHT_LABELS: Record<string, string> = {
  L1: 'Financial', L2: 'Layoffs', L3: 'AI Risk', L4: 'Sector', L5: 'Protection',
};

// Matches AnalysisTab.scoreColor exactly — both live in the same Intel tab;
// different thresholds (80 vs 75) caused the same score to render different
// colors on PredictionHorizonPanel vs DualGaugePanel, creating visible
// inconsistency. Unified to 75/55/35 breakpoints.
function scoreColor(score: number): string {
  if (score >= 75) return '#dc2626';
  if (score >= 55) return '#f97316';
  if (score >= 35) return '#f59e0b';
  if (score >= 20) return '#00d4e0';
  return '#10b981';
}

function confidenceLabel(conf: number): { text: string; color: string } {
  if (conf >= 0.80) return { text: 'Strong', color: '#10b981' };
  if (conf >= 0.65) return { text: 'Good',   color: '#00d4e0' };
  if (conf >= 0.50) return { text: 'Fair',   color: '#f59e0b' };
  return { text: 'Weak', color: '#f97316' };
}

const WeightMiniChart: React.FC<{ weights: HorizonRisk['weightsApplied'] }> = ({ weights }) => (
  <div className="flex items-end gap-1 h-8">
    {WEIGHT_KEYS.map(key => {
      const val = weights[key as keyof typeof weights] ?? 0;
      const heightPct = Math.round(val * 100 * 2.5); // scale for visual
      return (
        <div key={key} className="flex flex-col items-center gap-0.5 flex-1">
          <div
            style={{
              height: `${Math.min(100, Math.max(8, heightPct))}%`,
              width: '100%',
              background: WEIGHT_COLORS[key],
              borderRadius: '2px',
              opacity: 0.75,
              transition: 'height 0.4s ease',
            }}
          />
          <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)' }}>
            {key}
          </span>
        </div>
      );
    })}
  </div>
);

const HorizonColumn: React.FC<{
  horizonKey: string;
  horizon: HorizonRisk;
  isWarnOverride?: boolean;
  delay: number;
}> = ({ horizonKey, horizon, isWarnOverride, delay }) => {
  const meta = HORIZON_LABELS[horizonKey];
  const sc = scoreColor(horizon.score);
  const conf = confidenceLabel(horizon.confidence);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.22, 1, 0.36, 1] }}
      className="flex-1 rounded-xl p-4 relative overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: isWarnOverride
          ? '1px solid rgba(239,68,68,0.35)'
          : '1px solid rgba(255,255,255,0.08)',
        minWidth: 0,
      }}
    >
      {/* Left accent bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '2px', background: sc, opacity: 0.7 }} />

      {/* Header */}
      <div className="flex items-start justify-between mb-3 pl-2">
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>
            {meta.sublabel}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 900, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.06em' }}>
            {meta.label}
          </div>
        </div>
        <div
          className="text-[10px] font-black px-1.5 py-0.5 rounded"
          style={{ background: `${conf.color}15`, color: conf.color, border: `1px solid ${conf.color}30`, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}
        >
          {conf.text}
        </div>
      </div>

      {/* Score */}
      <div className="pl-2 mb-3">
        <div className="flex items-baseline gap-1">
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1, color: sc }}>
            {horizon.score}
          </span>
          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)' }}>/100</span>
        </div>

        {isWarnOverride && (
          <div className="flex items-center gap-1 mt-1">
            <AlertTriangle className="w-2.5 h-2.5" style={{ color: '#ef4444' }} />
            <span style={{ fontSize: '9px', color: '#ef4444', fontFamily: 'var(--font-mono)', fontWeight: 800, letterSpacing: '0.06em' }}>
              NOTICE FILED
            </span>
          </div>
        )}
      </div>

      {/* Weight mini-chart */}
      <div className="pl-2 mb-3">
        <WeightMiniChart weights={horizon.weightsApplied} />
      </div>

      {/* Dominant signal */}
      <div className="pl-2">
        <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>
          Main driver
        </div>
        <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>
          {horizon.dominantSignal}
        </p>
      </div>
    </motion.div>
  );
};

const PredictionHorizonPanel: React.FC<Props> = ({ predictionHorizon, currentScore }) => {
  const { horizon30d, horizon90d, horizon180d, trajectoryNarrative, groundTruthOverride } = predictionHorizon;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.02)' }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <Clock className="w-4 h-4" style={{ color: 'var(--cyan)' }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 900, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--cyan)' }}>
          Risk Over Time
        </span>
        {groundTruthOverride && (
          <span className="ml-auto text-[10px] font-black px-2 py-0.5 rounded animate-pulse" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.35)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}>
            LAYOFF NOTICE ACTIVE
          </span>
        )}
      </div>

      <div className="p-4">
        {/* Trajectory row — anchors the 3 horizon scores to the current score
            so users can see direction of travel. currentScore was accepted as a
            prop but previously unused — showing 3 horizon scores without the
            starting point made it impossible to judge whether risk was rising or
            falling at a glance. */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto">
          {/* Current */}
          <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.10em' }}>Now</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 900, color: scoreColor(currentScore) }}>{currentScore}</span>
          </div>
          {[
            { key: '30d',  h: horizon30d },
            { key: '90d',  h: horizon90d },
            { key: '180d', h: horizon180d },
          ].map(({ key, h }) => {
            const prev = key === '30d' ? currentScore : key === '90d' ? horizon30d.score : horizon90d.score;
            const diff = h.score - prev;
            const arrow = diff > 2 ? '↑' : diff < -2 ? '↓' : '→';
            const arrowColor = diff > 2 ? '#ef4444' : diff < -2 ? '#10b981' : 'rgba(255,255,255,0.3)';
            return (
              <React.Fragment key={key}>
                <span style={{ color: arrowColor, fontWeight: 900, fontSize: '1rem', flexShrink: 0 }}>{arrow}</span>
                <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.10em' }}>{key}</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 900, color: scoreColor(h.score) }}>{h.score}</span>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* Weight legend */}
        <div className="flex flex-wrap gap-3 mb-4">
          {WEIGHT_KEYS.map(key => (
            <div key={key} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm" style={{ background: WEIGHT_COLORS[key] }} />
              <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)' }}>{key}: {WEIGHT_LABELS[key]}</span>
            </div>
          ))}
        </div>

        {/* 3-column horizon grid */}
        <div className="flex gap-3 mb-4">
          <HorizonColumn horizonKey="30d"  horizon={horizon30d}  isWarnOverride={groundTruthOverride} delay={0}    />
          <HorizonColumn horizonKey="90d"  horizon={horizon90d}  delay={0.08}  />
          <HorizonColumn horizonKey="180d" horizon={horizon180d} delay={0.16}  />
        </div>

        {/* Trajectory narrative */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="rounded-lg px-4 py-3"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
            Where your risk is heading
          </div>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.55 }}>
            {trajectoryNarrative}
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default PredictionHorizonPanel;
