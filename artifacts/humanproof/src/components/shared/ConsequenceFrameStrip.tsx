// ConsequenceFrameStrip — Rule 7 (Reality Over Optimism)
// Shows what happens in 30 days if the user doesn't act on the top signal.
// Sub-component only — NEVER rendered as a standalone action card (Rule 4).
// Caller is responsible for only mounting when severity >= 50.

import type { InactionTrajectory } from '../../services/inactionConsequenceCalculator';

interface Props {
  trajectory: InactionTrajectory;
  currentScore: number;
}

const LABEL_COLOR: Record<string, string> = {
  Critical: '#ef4444',
  'High Risk': '#f97316',
  Elevated: '#f59e0b',
  Stable: '#10b981',
};

export function ConsequenceFrameStrip({ trajectory, currentScore }: Props) {
  const delta = trajectory.projectedScore - currentScore;
  const deltaColor = delta > 0 ? '#ef4444' : '#10b981';
  const labelColor = LABEL_COLOR[trajectory.label] ?? '#f59e0b';

  return (
    <div
      role="note"
      style={{
        display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        marginTop: 8, padding: '7px 10px', borderRadius: 6,
        background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.12)',
        fontSize: '0.7rem',
      }}
    >
      <span style={{
        fontWeight: 700, color: 'rgba(255,255,255,0.4)',
        fontFamily: 'var(--font-mono, monospace)', letterSpacing: '0.04em', flexShrink: 0,
      }}>
        IF NO ACTION · 30 DAYS
      </span>
      <span style={{ color: deltaColor, fontWeight: 700, fontFamily: 'var(--font-mono, monospace)', flexShrink: 0 }}>
        {currentScore} → {trajectory.projectedScore} ({delta > 0 ? '+' : ''}{delta} pts)
      </span>
      <span style={{ color: labelColor, fontWeight: 600, flexShrink: 0 }}>
        {trajectory.label}
      </span>
      <span style={{ color: 'rgba(255,255,255,0.3)', fontStyle: 'italic', fontSize: '0.67rem' }}>
        {trajectory.rationale}
      </span>
    </div>
  );
}
