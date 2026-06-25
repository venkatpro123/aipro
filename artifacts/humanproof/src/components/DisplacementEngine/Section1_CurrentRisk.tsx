// Section1_CurrentRisk — Current risk score with 4 live signal cards.
// Reorganises existing D1-D6 data into a signal-based layout.

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Zap, Shield, Activity, AlertTriangle } from 'lucide-react';
import type { ScoreResult } from '../../data/riskFormula';
import { getScoreColor, getVerdict, getTimeline, getUrgency } from '../../data/riskFormula';

interface Props {
  result: ScoreResult;
  companyName?: string;
}

const DIM_LABELS: Record<string, string> = {
  D1: 'Task Automatability', D2: 'AI Tool Maturity',
  D3: 'Human Amplification', D4: 'Experience Shield',
  D5: 'Country Exposure',    D6: 'Social Capital Moat',
};

export const Section1_CurrentRisk: React.FC<Props> = ({ result }) => {
  const scoreColor = getScoreColor(result.total);
  const circumference = 2 * Math.PI * 52;
  const offset = circumference * (1 - result.total / 100);

  // Extract top-2 risk signals (highest scoring dims) and top-2 protection signals (lowest)
  const sorted = [...result.dimensions].sort((a, b) => b.score - a.score);
  const riskSignals    = sorted.slice(0, 2);
  const protectSignals = sorted.slice(-2).reverse();

  const SIGNAL_COLORS: Record<string, string> = {
    D1: '#ef4444', D2: '#f97316', D3: '#10b981', D4: '#22d3ee', D5: '#f59e0b', D6: '#8b5cf6',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Score ring + verdict */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={{
          display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap',
          padding: 24, borderRadius: 16,
          background: 'var(--alpha-bg-04)',
          border: '1px solid var(--alpha-bg-08)',
        }}
      >
        {/* Ring */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <svg width="130" height="130" viewBox="0 0 130 130">
            <circle cx="65" cy="65" r="52" fill="none" stroke="var(--alpha-bg-06)" strokeWidth="8" />
            <circle cx="65" cy="65" r="52" fill="none"
              stroke={scoreColor} strokeWidth="8"
              strokeDasharray={circumference} strokeDashoffset={offset}
              strokeLinecap="round"
              style={{ transform: 'rotate(-90deg)', transformOrigin: '65px 65px', filter: `drop-shadow(0 0 10px ${scoreColor}66)`, transition: 'stroke-dashoffset 1s cubic-bezier(.4,0,.2,1)' }}
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 32, fontWeight: 900, color: scoreColor, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{result.total}</span>
            <span style={{ fontSize: 10, color: 'var(--alpha-text-45)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}>/100</span>
          </div>
        </div>

        {/* Verdict & meta */}
        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: scoreColor, marginBottom: 4, lineHeight: 1.1 }}>
            {getVerdict(result.total)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--alpha-text-50)', marginBottom: 12, lineHeight: 1.5 }}>
            {getUrgency(result.total)}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 999, background: `${scoreColor}18`, color: scoreColor, border: `1px solid ${scoreColor}30`, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
              CONFIDENCE: {result.confidence ?? 'MODERATE'}
            </span>
            <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 999, background: 'var(--alpha-bg-06)', color: 'var(--alpha-text-45)', border: '1px solid var(--alpha-bg-08)', fontFamily: 'var(--font-mono)' }}>
              {getTimeline(result.total)}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Current signals grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 10 }}>
        {/* Risk signals */}
        {riskSignals.map((dim, i) => (
          <motion.div key={dim.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.07 }}
            style={{
              padding: '14px 16px', borderRadius: 12,
              background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <TrendingUp size={13} style={{ color: '#ef4444', flexShrink: 0 }} />
              <span style={{ fontSize: 9, fontWeight: 700, color: '#ef4444', fontFamily: 'var(--font-mono)', letterSpacing: '0.10em', textTransform: 'uppercase' }}>Risk Signal</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--alpha-text-85)', marginBottom: 4 }}>{DIM_LABELS[dim.key] ?? dim.key}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--alpha-bg-08)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${dim.score}%`, background: SIGNAL_COLORS[dim.key] ?? '#ef4444', borderRadius: 2, transition: 'width 0.8s ease' }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 800, color: SIGNAL_COLORS[dim.key] ?? '#ef4444', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>{dim.score}</span>
            </div>
          </motion.div>
        ))}

        {/* Protection signals */}
        {protectSignals.map((dim, i) => (
          <motion.div key={dim.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: (i + 2) * 0.07 }}
            style={{
              padding: '14px 16px', borderRadius: 12,
              background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.18)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Shield size={13} style={{ color: '#10b981', flexShrink: 0 }} />
              <span style={{ fontSize: 9, fontWeight: 700, color: '#10b981', fontFamily: 'var(--font-mono)', letterSpacing: '0.10em', textTransform: 'uppercase' }}>Protection Signal</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--alpha-text-85)', marginBottom: 4 }}>{DIM_LABELS[dim.key] ?? dim.key}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--alpha-bg-08)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${dim.score}%`, background: SIGNAL_COLORS[dim.key] ?? '#10b981', borderRadius: 2, transition: 'width 0.8s ease' }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 800, color: SIGNAL_COLORS[dim.key] ?? '#10b981', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>{dim.score}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* All 6 dimensions compact */}
      <div style={{ padding: '16px 18px', borderRadius: 12, background: 'var(--alpha-bg-04)', border: '1px solid var(--alpha-bg-06)' }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--alpha-text-35)', fontFamily: 'var(--font-mono)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
          6-Dimension Breakdown
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {result.dimensions.map(dim => (
            <div key={dim.key} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 36px', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 11, color: 'var(--alpha-text-55)', lineHeight: 1.2 }}>{DIM_LABELS[dim.key] ?? dim.key}</span>
              <div style={{ height: 4, borderRadius: 2, background: 'var(--alpha-bg-06)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${dim.score}%`, background: SIGNAL_COLORS[dim.key] ?? 'var(--cyan,#22d3ee)', borderRadius: 2, transition: 'width 0.8s ease' }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: SIGNAL_COLORS[dim.key] ?? 'var(--cyan,#22d3ee)', fontFamily: 'var(--font-mono)', textAlign: 'right' }}>{dim.score}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Section1_CurrentRisk;
