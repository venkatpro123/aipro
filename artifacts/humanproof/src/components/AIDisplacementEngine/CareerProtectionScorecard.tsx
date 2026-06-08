// CareerProtectionScorecard — 6 protection dimensions derived from D-scores.
// Shows users what's protecting them, not just what's threatening them.

import React from 'react';
import type { ScoreResult } from '../../data/riskFormula';

interface Dimension {
  label: string;
  score: number;
  description: string;
}

function deriveProtectionDimensions(result: ScoreResult): Dimension[] {
  const d1 = result.dimensions.find(d => d.key === 'D1')?.score ?? 50;
  const d2 = result.dimensions.find(d => d.key === 'D2')?.score ?? 50;
  const d3 = result.dimensions.find(d => d.key === 'D3')?.score ?? 50;
  const d4 = result.dimensions.find(d => d.key === 'D4')?.score ?? 50;
  const d6 = result.dimensions.find(d => d.key === 'D6')?.score ?? 50;
  const technical  = Math.round(100 - d1);
  const market     = Math.round(100 - d2);
  const aiAdapt    = Math.round((technical + market) / 2);
  return [
    { label: 'Technical Protection',    score: technical,        description: 'How resistant your technical skills are to AI substitution right now.' },
    { label: 'Market Demand',           score: market,           description: 'How actively employers are hiring for your specific skill set.' },
    { label: 'Experience Shield',       score: Math.round(100 - d4), description: 'How much your years in the field protect you from being replaced.' },
    { label: 'Human Advantage',         score: Math.round(100 - d3), description: 'How irreplaceable the human elements of your work are — judgment, empathy, creativity.' },
    { label: 'Network & Reputation',    score: Math.round(100 - d6), description: 'Your professional relationships — the hardest thing for AI to replicate.' },
    { label: 'AI Adaptation Score',     score: aiAdapt,          description: 'Your estimated ability to use AI as a tool rather than be displaced by it.' },
  ];
}

function barColor(score: number): string {
  if (score >= 70) return 'var(--emerald)';
  if (score >= 45) return 'var(--amber)';
  return 'var(--red)';
}

function gradeLabel(score: number): string {
  if (score >= 80) return 'Strong';
  if (score >= 60) return 'Moderate';
  if (score >= 40) return 'Developing';
  return 'Weak';
}

interface Props {
  result: ScoreResult;
}

export const CareerProtectionScorecard: React.FC<Props> = ({ result }) => {
  const dimensions = deriveProtectionDimensions(result);
  const avgScore   = Math.round(dimensions.reduce((s, d) => s + d.score, 0) / dimensions.length);
  const avgColor   = barColor(avgScore);

  return (
    <div style={{
      marginBottom: '20px', padding: '20px 22px',
      borderRadius: 'var(--radius-xl)',
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(16,185,129,0.2)',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: '3px', height: '100%', background: 'linear-gradient(180deg,var(--emerald),rgba(16,185,129,0.3))' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '0.58rem', fontWeight: 800, color: 'var(--emerald)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>
          YOUR CAREER PROTECTION SCORECARD
        </div>
        <div style={{ padding: '3px 10px', borderRadius: '5px', background: `${avgColor}15`, border: `1px solid ${avgColor}30`, fontSize: '0.65rem', fontWeight: 900, color: avgColor, fontFamily: 'var(--font-mono)' }}>
          OVERALL: {avgScore}% — {gradeLabel(avgScore)}
        </div>
      </div>
      <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', lineHeight: 1.6, margin: '0 0 16px' }}>
        Six dimensions of career protection — based on your unique role, experience, and market conditions. Dimensions below 50% are your highest-priority areas to strengthen.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {dimensions.map(({ label, score, description }) => {
          const col = barColor(score);
          return (
            <div key={label} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'start', padding: '10px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: `1px solid rgba(255,255,255,0.06)` }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text)' }}>{label}</span>
                  <span style={{ fontSize: '0.55rem', padding: '1px 6px', borderRadius: '3px', background: `${col}15`, border: `1px solid ${col}30`, color: col, fontFamily: 'var(--font-mono)', fontWeight: 800 }}>{gradeLabel(score)}</span>
                </div>
                <div style={{ height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: '5px' }}>
                  <div style={{ height: '100%', width: `${score}%`, background: col, borderRadius: '2px', transition: 'width 0.7s ease' }} />
                </div>
                <p style={{ fontSize: '0.67rem', color: 'var(--text-3)', lineHeight: 1.5, margin: 0 }}>{description}</p>
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 900, color: col, fontFamily: 'var(--font-mono)', minWidth: '42px', textAlign: 'right', paddingTop: '2px' }}>
                {score}%
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: '14px', fontSize: '0.6rem', color: 'var(--text-3)', lineHeight: 1.5 }}>
        Scores are derived from your 6-dimension assessment and inverted to show protection strength. They are estimates, not guarantees — your actual protection depends on execution.
      </div>
    </div>
  );
};
