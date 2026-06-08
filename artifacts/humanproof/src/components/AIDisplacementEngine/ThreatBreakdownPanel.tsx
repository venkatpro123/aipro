// ThreatBreakdownPanel — 6 threat sources derived from D-dimension scores.
// Gives users a plain-English breakdown of what's actually threatening their role.

import React from 'react';
import type { ScoreResult } from '../../data/riskFormula';

interface ThreatSource {
  source: string;
  score: number;
  description: string;
}

function deriveThreatBreakdown(result: ScoreResult): ThreatSource[] {
  const d1 = result.dimensions.find(d => d.key === 'D1')?.score ?? 50;
  const d2 = result.dimensions.find(d => d.key === 'D2')?.score ?? 50;
  const d5 = result.dimensions.find(d => d.key === 'D5')?.score ?? 50;
  return [
    { source: 'AI & Automation',      score: d1,                              description: 'Direct task replacement by AI tools already available today.' },
    { source: 'Offshoring Pressure',  score: Math.round(d5 * 0.7),           description: 'Lower-cost labor markets performing this work remotely.' },
    { source: 'Global Remote Hiring', score: Math.round(d2 * 0.6),           description: 'Companies hiring globally for roles no longer requiring local presence.' },
    { source: 'Economic Slowdown',    score: Math.round((d1 + d2) / 2 * 0.5),description: 'Hiring freezes during downturns target exposed roles first.' },
    { source: 'Market Saturation',    score: Math.round(d2 * 0.65),          description: 'Too many qualified candidates for available positions.' },
    { source: 'Process Automation',   score: Math.round(d1 * 0.8),           description: 'Workflow scripts eliminating task layers before full AI arrives.' },
  ];
}

function barColor(score: number): string {
  if (score >= 65) return 'var(--red)';
  if (score >= 45) return 'var(--amber)';
  if (score >= 25) return 'var(--cyan)';
  return 'var(--emerald)';
}

interface Props {
  result: ScoreResult;
}

export const ThreatBreakdownPanel: React.FC<Props> = ({ result }) => {
  const threats = deriveThreatBreakdown(result);
  const sorted  = [...threats].sort((a, b) => b.score - a.score);

  return (
    <div style={{
      marginTop: '20px', padding: '20px 22px',
      borderRadius: 'var(--radius-xl)',
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(239,68,68,0.2)',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: '3px', height: '100%', background: 'linear-gradient(180deg,var(--red),rgba(239,68,68,0.3))' }} />

      <div style={{ fontSize: '0.58rem', fontWeight: 800, color: 'var(--red)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: '14px' }}>
        WHAT IS ACTUALLY THREATENING YOUR ROLE
      </div>

      {/* PRIMARY THREAT — single highest-scoring source, replaces standalone biggestThreat callout */}
      {sorted[0] && (() => {
        const top = sorted[0];
        const col = barColor(top.score);
        return (
          <div style={{
            marginBottom: '18px', padding: '14px 18px', borderRadius: '10px',
            background: `${col}10`, border: `1px solid ${col}35`, borderLeft: `3px solid ${col}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.56rem', fontWeight: 800, color: col, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', background: `${col}18`, padding: '2px 7px', borderRadius: '3px' }}>
                PRIMARY THREAT
              </span>
              <span style={{ fontSize: '0.75rem', fontWeight: 900, color: col, fontFamily: 'var(--font-mono)' }}>{top.score}%</span>
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>{top.source}</div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-2)', lineHeight: 1.6, margin: 0 }}>{top.description}</p>
          </div>
        );
      })()}

      <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', lineHeight: 1.6, margin: '0 0 16px' }}>
        All 6 forces shaping your risk score — ranked by severity:
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {sorted.map(({ source, score, description }) => {
          const col = barColor(score);
          return (
            <div key={source} style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: `1px solid rgba(255,255,255,0.06)`, borderLeft: `2px solid ${col}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)' }}>{source}</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 900, color: col, fontFamily: 'var(--font-mono)', minWidth: '36px', textAlign: 'right' }}>{score}%</span>
              </div>
              <div style={{ height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: '6px' }}>
                <div style={{ height: '100%', width: `${score}%`, background: col, borderRadius: '2px', transition: 'width 0.7s ease' }} />
              </div>
              <p style={{ fontSize: '0.68rem', color: 'var(--text-3)', lineHeight: 1.5, margin: 0 }}>{description}</p>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: '14px', fontSize: '0.6rem', color: 'var(--text-3)', lineHeight: 1.5 }}>
        Scores derived from your 6-dimension assessment. AI & Automation is the primary driver; the others amplify or compound that risk depending on your role and country.
      </div>
    </div>
  );
};
