// EmergencyModeHeader.tsx — v17.0
// Pulsing red sticky header rendered at the top of OverviewTab when score >= 80.
// Creates a distinct high-trust UX moment for emergency situations.
// Accompanies the existing EmergencyProtocolPanel with a persistent visual anchor.

import React from 'react';
import { AlertTriangle, ChevronDown } from 'lucide-react';

interface Props {
  score: number;
  onScrollToProtocol?: () => void;
}

const EmergencyModeHeader: React.FC<Props> = ({ score, onScrollToProtocol }) => {
  if (score < 80) return null;

  const isCritical = score >= 90;
  const color = isCritical ? '#ef4444' : '#f97316';
  const bgGrad = isCritical
    ? 'linear-gradient(135deg, rgba(239,68,68,0.16) 0%, rgba(239,68,68,0.06) 100%)'
    : 'linear-gradient(135deg, rgba(249,115,22,0.14) 0%, rgba(249,115,22,0.05) 100%)';
  const borderColor = isCritical ? 'rgba(239,68,68,0.45)' : 'rgba(249,115,22,0.38)';

  return (
    <div
      className="rounded-2xl mb-5 overflow-hidden"
      style={{ background: bgGrad, border: `1px solid ${borderColor}`, position: 'relative' }}
    >
      {/* Top accent bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: color,
          opacity: 0.9,
        }}
      />

      {/* Animated corner pulse */}
      <div
        className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full animate-ping"
        style={{ background: color, opacity: 0.6 }}
      />
      <div
        className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full"
        style={{ background: color }}
      />

      <div className="px-5 py-4">
        <div className="flex items-center gap-3 mb-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 animate-pulse" style={{ color }} />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-xs font-black uppercase tracking-[0.2em] px-2.5 py-0.5 rounded"
                style={{
                  background: `${color}22`,
                  color,
                  border: `1px solid ${color}40`,
                }}
              >
                EMERGENCY MODE ACTIVE
              </span>
              <span
                className="text-xs font-black"
                style={{ color, fontFamily: 'var(--font-mono)' }}
              >
                SCORE: {score}/100
              </span>
            </div>
          </div>
        </div>

        <p className="text-xs leading-relaxed mb-3" style={{ color: 'rgba(255,255,255,0.72)' }}>
          Your risk score has crossed the{' '}
          <strong style={{ color: 'rgba(255,255,255,0.92)' }}>emergency threshold (80/100)</strong>.
          {' '}At this level, the probability of layoff within 90 days is statistically elevated.
          {' '}Your emergency protocol is active below — treat this as an active career situation
          requiring immediate attention, not passive monitoring.
        </p>

        <button
          onClick={onScrollToProtocol}
          className="flex items-center gap-1.5 text-[11px] font-bold transition-colors hover:opacity-100"
          style={{
            color,
            opacity: 0.85,
            fontFamily: 'var(--font-mono)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          JUMP TO EMERGENCY PROTOCOL
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default EmergencyModeHeader;
