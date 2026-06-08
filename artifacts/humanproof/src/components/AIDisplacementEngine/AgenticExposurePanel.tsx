// AgenticExposurePanel — §2 Agentic AI Wave Exposure
// Displays the 2030 structural exposure score separately from current Oracle score.

import React from 'react';
import type { AgenticExposureResult, AgenticTier } from '../../services/agenticExposureEngine';

interface Props {
  result: AgenticExposureResult;
  currentScore: number;
  currentScoreColor: string;
}

const TIER_COLORS: Record<AgenticTier, string> = {
  LOW:      'var(--emerald)',
  MODERATE: 'var(--cyan)',
  HIGH:     'var(--amber)',
  SEVERE:   '#f97316',
  EXTREME:  'var(--red)',
};

const TIER_DESC: Record<AgenticTier, string> = {
  LOW:      'Very well protected — AI is unlikely to change your core work',
  MODERATE: 'Mostly protected — AI will help you more than replace you',
  HIGH:     'At risk — a significant part of your work will be automated',
  SEVERE:   'High risk — your role will look very different in a few years',
  EXTREME:  'Critical — act now to reposition before your role is eliminated',
};

const SUB_LABELS: Record<string, string> = {
  taskAutoPotential:           'How much of this work AI can take over',
  agenticProgression:          'How quickly AI is advancing in this area',
  laborEcon:                   'Whether replacing workers saves money',
  orgRestructure:              'Chance of headcount cuts in your area',
  agenticDisruptionPotential:  'Long-term risk from advanced AI (2030+)',
};

function subScoreColor(v: number): string {
  if (v >= 70) return 'var(--red)';
  if (v >= 50) return 'var(--amber)';
  if (v >= 30) return 'var(--cyan)';
  return 'var(--emerald)';
}

export const AgenticExposurePanel: React.FC<Props> = ({ result, currentScore, currentScoreColor }) => {
  const tierColor = TIER_COLORS[result.tier];
  const circumference = 2 * Math.PI * 40;
  const dashLen = (result.score / 100) * circumference;

  return (
    <div style={{
      marginTop: '32px',
      padding: '28px',
      borderRadius: 'var(--radius-xl)',
      border: `1px solid ${tierColor}30`,
      background: `linear-gradient(135deg, ${tierColor}06, transparent 60%)`,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Section label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <div style={{
          padding: '3px 10px', borderRadius: '4px',
          background: `${tierColor}18`, border: `1px solid ${tierColor}40`,
          fontSize: '0.62rem', fontWeight: 800, color: tierColor,
          fontFamily: 'var(--font-mono)', letterSpacing: '0.1em',
        }}>
          YOUR 2030 AI RISK PICTURE
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>
          How your role looks in 2030, based on where AI is heading
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '32px', alignItems: 'flex-start' }}>

        {/* Left — score comparison rings */}
        <div style={{ display: 'flex', gap: '28px', alignItems: 'center', flexShrink: 0 }}>

          {/* Current score (smaller) */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: '6px', letterSpacing: '0.08em' }}>
              TODAY'S RISK
            </div>
            <svg width="72" height="72" viewBox="0 0 96 96">
              <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
              <circle cx="48" cy="48" r="40" fill="none" stroke={currentScoreColor} strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={`${(currentScore / 100) * 251.3} 251.3`}
                strokeDashoffset="62.8"
                style={{ filter: `drop-shadow(0 0 5px ${currentScoreColor}66)` }} />
            </svg>
            <div style={{ fontSize: '1.1rem', fontWeight: 900, color: currentScoreColor, marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
              {currentScore}%
            </div>
          </div>

          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
          }}>
            <div style={{
              fontSize: '1.2rem', fontWeight: 700,
              color: result.score > currentScore ? 'var(--red)' : result.score < currentScore ? 'var(--emerald)' : 'var(--text-3)',
            }}>
              {result.score > currentScore ? '↑' : result.score < currentScore ? '↓' : '→'}
            </div>
            <div style={{ fontSize: '0.55rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', textAlign: 'center', lineHeight: 1.2 }}>
              {result.score > currentScore ? '+' : ''}{result.score - currentScore}pts
            </div>
          </div>

          {/* Agentic score (larger, prominent) */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.6rem', color: tierColor, fontFamily: 'var(--font-mono)', marginBottom: '6px', letterSpacing: '0.08em', fontWeight: 800 }}>
              2030 RISK OUTLOOK
            </div>
            <svg width="96" height="96" viewBox="0 0 96 96">
              <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
              <circle cx="48" cy="48" r="40" fill="none" stroke={tierColor} strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${dashLen} ${circumference}`}
                strokeDashoffset={circumference * 0.25}
                style={{ filter: `drop-shadow(0 0 8px ${tierColor}88)`, transition: 'stroke-dasharray 1s ease' }} />
              <text x="48" y="44" textAnchor="middle" fill={tierColor} fontSize="16" fontWeight="900" fontFamily="var(--font-mono)">
                {result.score}%
              </text>
              <text x="48" y="58" textAnchor="middle" fill={tierColor} fontSize="8" fontWeight="700" fontFamily="var(--font-mono)" opacity="0.8">
                {result.tier}
              </text>
            </svg>
          </div>
        </div>

        {/* Right — sub-scores + narrative */}
        <div style={{ flex: 1, minWidth: '200px' }}>
          {/* Tier badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '4px 12px', borderRadius: '6px', marginBottom: '12px',
            background: `${tierColor}18`, border: `1px solid ${tierColor}40`,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: tierColor, display: 'inline-block', boxShadow: `0 0 6px ${tierColor}` }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: tierColor, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}>
              {result.tier} RISK
            </span>
          </div>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginBottom: '16px', lineHeight: 1.5 }}>
            {TIER_DESC[result.tier]}
          </p>

          {/* Sub-score bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(Object.entries(result.subScores) as [keyof typeof result.subScores, number][]).map(([key, val]) => {
              const c = subScoreColor(val);
              return (
                <div key={key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-2)' }}>{SUB_LABELS[key]}</span>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: c, fontFamily: 'var(--font-mono)' }}>{val}</span>
                  </div>
                  <div style={{ height: '3px', borderRadius: '2px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${val}%`, background: c, borderRadius: '2px', transition: 'width 0.8s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Narrative */}
      <div style={{
        marginTop: '20px', padding: '14px 18px',
        background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-lg)',
        border: `1px solid ${tierColor}20`,
        borderLeft: `2px solid ${tierColor}`,
      }}>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-2)', lineHeight: 1.7, margin: 0, fontStyle: 'italic' }}>
          {result.narrative}
        </p>
      </div>
    </div>
  );
};
