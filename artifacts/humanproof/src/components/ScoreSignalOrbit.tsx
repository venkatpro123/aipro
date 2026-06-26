// ScoreSignalOrbit.tsx — Layer 1 "real-time signal attribution"
//
// Five tiny nodes orbiting the score instrument — hiring · financial · layoff ·
// market · personal — each bound to a REAL engine output. A node lights and
// pulses when its signal is currently contributing to the score; it stays dim
// when that system found nothing. Subconscious read: *"the score is produced by
// many live systems working together,"* not a printed number.
//
// Restraint: ONE slow orbit rotation + a single pulse keyframe (both in
// index.css, both disabled under reduced-motion). No particles, no trails.

import React from 'react';

export type SignalNodeKey = 'hiring' | 'financial' | 'layoff' | 'market' | 'personal';

export interface SignalNode {
  key: SignalNodeKey;
  /** Short human label, surfaced as the node's accessible title. */
  label: string;
  /** Whether this engine produced a live, score-contributing signal. */
  active: boolean;
  /** Accent color (defaults per node). */
  color?: string;
}

const NODE_COLORS: Record<SignalNodeKey, string> = {
  hiring: 'var(--color-emerald-text)',
  financial: '#00d4e0',
  layoff: 'var(--color-red-text)',
  market: 'var(--color-amber500-text)',
  personal: '#7c3aed',
};

interface Props {
  nodes: SignalNode[];
  className?: string;
}

/**
 * Positions each node evenly on the score ring's edge (percentage-based, so it
 * tracks the clamp-sized hero box). The whole ring rotates slowly (CSS
 * `.signal-orbit`); each active dot pulses in place.
 */
export const ScoreSignalOrbit: React.FC<Props> = ({ nodes, className }) => {
  const count = nodes.length || 1;

  return (
    <div
      aria-hidden="true"
      className={`signal-orbit ${className ?? ''}`}
      style={{
        position: 'absolute',
        inset: 0,
        margin: 'auto',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      {/* faint orbit path — explains the nodes belong to one system */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: '1px dashed var(--alpha-bg-06)',
        }}
      />
      {nodes.map((node, i) => {
        const angle = (i / count) * 2 * Math.PI - Math.PI / 2; // start at top
        const left = 50 + Math.cos(angle) * 50;
        const top = 50 + Math.sin(angle) * 50;
        const color = node.color ?? NODE_COLORS[node.key];
        return (
          <div
            key={node.key}
            title={`${node.label} signal — ${node.active ? 'live' : 'no signal'}`}
            style={{
              position: 'absolute',
              left: `${left}%`,
              top: `${top}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <span
              className={`signal-node-dot${node.active ? ' is-active' : ''}`}
              style={{
                display: 'block',
                width: node.active ? 9 : 6,
                height: node.active ? 9 : 6,
                borderRadius: '50%',
                background: color,
                opacity: node.active ? 0.95 : 0.3,
                boxShadow: node.active ? `0 0 10px ${color}` : 'none',
              }}
            />
          </div>
        );
      })}
    </div>
  );
};

export default ScoreSignalOrbit;
