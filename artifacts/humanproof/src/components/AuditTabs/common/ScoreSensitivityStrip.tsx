// ScoreSensitivityStrip.tsx
//
// Mini "what-if" strip for the Protection tab.
// Shows top 2 score levers from scoreSensitivity + projected scores.
// Tapping "See full simulation" navigates to Deep Intel tab.
//
// Design intent: answer "What single thing moves my score the most?"
// without duplicating the full WhatIfSimulatorPanel.

import React from 'react';
import { Zap, ArrowRight } from 'lucide-react';
import type { ScoreSensitivityResult } from '../../../services/scoreSensitivityEngine';

interface Props {
  scoreSensitivity: ScoreSensitivityResult;
}

function fmtScore(s: number) {
  return Math.max(0, Math.round(s));
}

function feasibilityColor(f: string): string {
  switch (f) {
    case 'immediate':   return '#10b981';
    case 'short_term':  return '#22d3ee';
    case 'medium_term': return '#f59e0b';
    default:            return '#94a3b8';
  }
}

function navigateToIntel() {
  window.dispatchEvent(new CustomEvent('hp.dashboard.navigate', { detail: { tab: 'intel' } }));
}

export const ScoreSensitivityStrip: React.FC<Props> = ({ scoreSensitivity }) => {
  const { levers, currentScore, bestTwoLeverScore, bestSingleLeverScore, keySensitivityInsight } = scoreSensitivity;

  // Show top 2 non-zero levers only
  const topLevers = levers.filter(l => l.scoreDropIfImproved > 0).slice(0, 2);
  if (topLevers.length === 0) return null;

  const projectedSingle = fmtScore(bestSingleLeverScore);
  const projectedTwo    = fmtScore(bestTwoLeverScore);
  const current         = fmtScore(currentScore);

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: 'rgba(34,211,238,0.04)',
        border: '1px solid rgba(34,211,238,0.18)',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-3.5 h-3.5" style={{ color: '#22d3ee' }} />
        <span className="text-[10px] font-bold tracking-widest" style={{ color: '#22d3ee99' }}>
          HIGHEST-LEVERAGE MOVES
        </span>
      </div>

      {/* Lever rows */}
      <div className="space-y-2.5 mb-3">
        {topLevers.map((lever, i) => {
          const projected = fmtScore(currentScore - lever.scoreDropIfImproved);
          const fColor    = feasibilityColor(lever.feasibility);
          return (
            <div key={lever.dimension} className="flex items-start gap-3">
              {/* Rank pill */}
              <span
                className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black"
                style={{ background: i === 0 ? 'rgba(34,211,238,0.15)' : 'rgba(255,255,255,0.07)', color: i === 0 ? '#22d3ee' : 'rgba(255,255,255,0.40)' }}
              >
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                {/* Dimension label + score delta */}
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="text-[11px] font-semibold truncate" style={{ color: 'var(--alpha-text-85)' }}>
                    {lever.dimensionLabel}
                  </span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="text-[11px] font-bold" style={{ color: 'var(--alpha-text-50)' }}>{current}</span>
                    <ArrowRight className="w-2.5 h-2.5" style={{ color: '#22d3ee' }} />
                    <span className="text-[11px] font-black" style={{ color: '#22d3ee' }}>{projected}</span>
                    <span className="text-[10px]" style={{ color: 'rgba(34,211,238,0.60)' }}>
                      −{lever.scoreDropIfImproved}
                    </span>
                  </div>
                </div>
                {/* Action + timeframe */}
                <p className="text-[10px] leading-snug mb-0.5" style={{ color: 'var(--alpha-text-45)' }}>
                  {lever.fastestAction.length > 90 ? lever.fastestAction.slice(0, 90) + '…' : lever.fastestAction}
                </p>
                <span className="text-[10px] font-semibold" style={{ color: fColor }}>
                  {lever.actionTimeframe}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Best-case projection row */}
      <div
        className="flex items-center justify-between rounded-xl px-3 py-2 mb-3"
        style={{ background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.18)' }}
      >
        <span className="text-[10px]" style={{ color: 'var(--alpha-text-50)' }}>
          {topLevers.length >= 2 ? 'Best case (top 2 levers)' : 'Best case (top lever)'}:
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold" style={{ color: 'var(--alpha-text-50)' }}>{current}</span>
          <ArrowRight className="w-2.5 h-2.5" style={{ color: '#22d3ee' }} />
          <span className="text-base font-black" style={{ color: '#22d3ee' }}>
            {topLevers.length >= 2 ? projectedTwo : projectedSingle}
          </span>
        </div>
      </div>

      {/* Key insight (keySensitivityInsight) */}
      {keySensitivityInsight && (
        <p className="text-[10px] leading-snug mb-3 italic" style={{ color: 'var(--alpha-text-45)' }}>
          {keySensitivityInsight}
        </p>
      )}

      {/* CTA → Deep Intel */}
      <button
        onClick={navigateToIntel}
        className="flex items-center gap-1.5 text-[10px] font-semibold"
        style={{ color: '#22d3ee' }}
      >
        <span>See full score simulation in Deep Intel</span>
        <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  );
};

export default ScoreSensitivityStrip;
