// IntelligenceHeader — sticky bar shown above tabs once results load.
// Shows: condensed score ring, wave status pill, confidence tier, version tag.

import React from 'react';
import type { ScoreResult } from '../../data/riskFormula';
import { getScoreColor } from '../../data/riskFormula';
import type { AgenticWaveResult } from '../../data/agenticWaveTypes';

interface Props {
  result: ScoreResult;
  agentic: AgenticWaveResult;
}

const WAVE_ICONS: Record<string, string> = {
  EARLY: '◦', BUILDING: '◈', ACCELERATING: '◉', INFLECTION: '⬡', ACTIVE: '⬢',
};

export const IntelligenceHeader: React.FC<Props> = ({ result, agentic }) => {
  const scoreColor = getScoreColor(result.total);
  const { waveStatusDetail, waveScore } = agentic;
  const circumference = 2 * Math.PI * 18;
  const offset = circumference * (1 - result.total / 100);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '8px 16px',
      background: 'rgba(var(--bg-rgb,9,12,20),0.94)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--alpha-bg-08)',
      flexWrap: 'wrap',
    }}>
      {/* Mini score ring */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <svg width="44" height="44" viewBox="0 0 44 44">
          <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3.5" />
          <circle cx="22" cy="22" r="18" fill="none"
            stroke={scoreColor} strokeWidth="3.5"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transform: 'rotate(-90deg)', transformOrigin: '22px 22px', filter: `drop-shadow(0 0 6px ${scoreColor}66)` }}
          />
          <text x="22" y="26" textAnchor="middle" fontSize="11" fontWeight="800"
            fill={scoreColor} fontFamily="var(--font-mono,'JetBrains Mono',monospace)">
            {result.total}
          </text>
        </svg>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text,#e9f3ff)', lineHeight: 1 }}>
            {result.total < 30 ? 'RESILIENT' : result.total < 50 ? 'MODERATE' : result.total < 65 ? 'ELEVATED' : result.total < 80 ? 'HIGH' : 'CRITICAL'}
          </div>
          <div style={{ fontSize: 9, color: 'var(--alpha-text-45)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Current Risk
          </div>
        </div>
      </div>

      <div style={{ width: 1, height: 28, background: 'var(--alpha-bg-08)', flexShrink: 0 }} />

      {/* Wave status pill */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '3px 10px', borderRadius: 999,
        background: `${waveStatusDetail.color}15`,
        border: `1px solid ${waveStatusDetail.color}40`,
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 10, color: waveStatusDetail.color }}>
          {WAVE_ICONS[waveStatusDetail.status] ?? '◉'}
        </span>
        <span style={{ fontSize: 10, fontWeight: 700, color: waveStatusDetail.color, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {waveStatusDetail.label}
        </span>
      </div>

      {/* Projected score */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <span style={{ fontSize: 9, color: 'var(--alpha-text-45)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          2030 Exposure
        </span>
        <span style={{ fontSize: 13, fontWeight: 800, color: waveScore.scoreColor, fontFamily: 'var(--font-mono)' }}>
          {waveScore.projectedScore}
        </span>
        <span style={{ fontSize: 9, fontWeight: 700, color: waveScore.scoreColor, padding: '1px 5px', borderRadius: 4, background: `${waveScore.scoreColor}18`, border: `1px solid ${waveScore.scoreColor}30` }}>
          {waveScore.scoreLabel}
        </span>
      </div>

      <div style={{ width: 1, height: 28, background: 'var(--alpha-bg-08)', flexShrink: 0 }} />

      {/* Confidence */}
      <div style={{ fontSize: 9, color: 'var(--alpha-text-35)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase', flexShrink: 0 }}>
        Confidence: <span style={{ color: 'var(--alpha-text-50)' }}>{result.confidence ?? 'MODERATE'}</span>
      </div>

      {/* Version tag — right-aligned */}
      <div style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--alpha-text-25)', fontFamily: 'var(--font-mono)', letterSpacing: '0.10em', flexShrink: 0 }}>
        DISPLACEMENT ENGINE v2
      </div>
    </div>
  );
};

export default IntelligenceHeader;
