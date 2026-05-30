// ScoreSensitivityPanel.tsx
//
// Full score sensitivity panel for the Deep Intel (AnalysisTab) tab.
// Shows ALL non-zero levers ranked by scoreDropIfImproved, plus synergy combos
// and multi-lever projections.
//
// Answers: "What single thing moves my score the most, and by how much?"
// Data comes from scoreSensitivityEngine.ts (already computed in pipeline).

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingDown, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import type { ScoreSensitivityResult, SensitivityLever } from '../../../services/scoreSensitivityEngine';

interface Props {
  scoreSensitivity: ScoreSensitivityResult;
}

const FEASIBILITY_CONFIG: Record<string, { label: string; color: string }> = {
  immediate:   { label: 'This week',   color: '#10b981' },
  short_term:  { label: 'This month',  color: '#22d3ee' },
  medium_term: { label: '1–3 months',  color: '#f59e0b' },
  long_term:   { label: '3–6 months',  color: '#f97316' },
};

const CONFIDENCE_COLOR: Record<string, string> = {
  High:   '#10b981',
  Medium: '#f59e0b',
  Low:    '#f97316',
};

function fmt(s: number) { return Math.max(0, Math.round(s)); }

const LeverRow: React.FC<{ lever: SensitivityLever; currentScore: number; rank: number }> = ({
  lever, currentScore, rank,
}) => {
  const [open, setOpen] = useState(rank === 0); // first row open by default
  const feasCfg = FEASIBILITY_CONFIG[lever.feasibility] ?? { label: lever.actionTimeframe, color: '#94a3b8' };
  const confColor = CONFIDENCE_COLOR[lever.confidenceInEstimate] ?? '#94a3b8';
  const projected = fmt(currentScore - lever.scoreDropIfImproved);

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: '1px solid rgba(255,255,255,0.08)' }}
    >
      {/* Collapsed header — always visible */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 p-3 text-left"
        style={{ background: rank === 0 ? 'rgba(34,211,238,0.05)' : 'rgba(255,255,255,0.02)' }}
      >
        {/* Rank */}
        <span
          className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black"
          style={{
            background: rank === 0 ? 'rgba(34,211,238,0.18)' : 'rgba(255,255,255,0.07)',
            color: rank === 0 ? '#22d3ee' : 'rgba(255,255,255,0.35)',
          }}
        >
          {rank + 1}
        </span>

        {/* Label */}
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold truncate" style={{ color: 'rgba(255,255,255,0.82)' }}>
            {lever.dimensionLabel}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] font-semibold" style={{ color: feasCfg.color }}>
              {feasCfg.label}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.20)' }}>·</span>
            <span className="text-[10px]" style={{ color: confColor }}>
              {lever.confidenceInEstimate} confidence
            </span>
          </div>
        </div>

        {/* Score delta */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[11px] font-bold" style={{ color: 'rgba(255,255,255,0.45)' }}>{fmt(currentScore)}</span>
          <ArrowRight className="w-3 h-3" style={{ color: '#22d3ee' }} />
          <span className="text-[13px] font-black" style={{ color: rank === 0 ? '#22d3ee' : 'rgba(255,255,255,0.70)' }}>
            {projected}
          </span>
          <span className="text-[10px]" style={{ color: 'rgba(34,211,238,0.55)' }}>
            −{lever.scoreDropIfImproved}
          </span>
        </div>

        {/* Expand toggle */}
        {open
          ? <ChevronUp className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.30)' }} />
          : <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.30)' }} />
        }
      </button>

      {/* Expanded: fastest action */}
      {open && (
        <div
          className="px-4 pb-3 pt-1"
          style={{ background: rank === 0 ? 'rgba(34,211,238,0.03)' : 'rgba(255,255,255,0.01)' }}
        >
          <p className="text-[10px] font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.38)' }}>
            FASTEST ACTION
          </p>
          <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
            {lever.fastestAction}
          </p>
          <p className="text-[10px] mt-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Timeframe: <span style={{ color: feasCfg.color, fontWeight: 600 }}>{lever.actionTimeframe}</span>
          </p>
        </div>
      )}
    </div>
  );
};

export const ScoreSensitivityPanel: React.FC<Props> = ({ scoreSensitivity }) => {
  const {
    levers, currentScore,
    bestSingleLeverScore, bestTwoLeverScore, bestThreeLeverScore,
    topSynergyCombos, keySensitivityInsight,
  } = scoreSensitivity;

  const activeLevers = levers.filter(l => l.scoreDropIfImproved > 0);
  if (activeLevers.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Key insight headline */}
      {keySensitivityInsight && (
        <p className="text-[11px] leading-relaxed italic" style={{ color: 'rgba(255,255,255,0.52)' }}>
          {keySensitivityInsight}
        </p>
      )}

      {/* Projection row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {[
          { label: 'Top lever',     score: fmt(bestSingleLeverScore), desc: '1 action' },
          { label: 'Top 2 levers',  score: fmt(bestTwoLeverScore),    desc: '2 actions' },
          { label: 'Top 3 levers',  score: fmt(bestThreeLeverScore),  desc: '3 actions' },
        ].map(({ label, score, desc }) => {
          const drop = fmt(currentScore) - score;
          return (
            <div
              key={label}
              className="rounded-xl p-2.5 text-center"
              style={{ background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.15)' }}
            >
              <p className="text-[10px] font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.38)' }}>
                {label.toUpperCase()}
              </p>
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.40)' }}>{fmt(currentScore)}</span>
                <ArrowRight className="w-2.5 h-2.5" style={{ color: '#22d3ee' }} />
                <span className="text-base font-black" style={{ color: '#22d3ee' }}>{score}</span>
              </div>
              <p className="text-[10px]" style={{ color: 'rgba(34,211,238,0.60)' }}>−{drop} pts</p>
            </div>
          );
        })}
      </div>

      {/* Lever list */}
      <div className="space-y-1.5">
        {activeLevers.map((lever, i) => (
          <LeverRow key={lever.dimension} lever={lever} currentScore={currentScore} rank={i} />
        ))}
      </div>

      {/* Synergy combos */}
      {topSynergyCombos && topSynergyCombos.length > 0 && (
        <div
          className="rounded-xl p-3"
          style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.18)' }}
        >
          <p className="text-[10px] font-bold tracking-widest mb-2" style={{ color: '#8b5cf6' }}>
            SYNERGY COMBOS
          </p>
          <div className="space-y-2">
            {topSynergyCombos.map((combo, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] font-semibold" style={{ color: 'rgba(255,255,255,0.70)' }}>
                    {combo.levers[0]} + {combo.levers[1]}
                  </span>
                  <span className="text-[10px] font-black" style={{ color: '#8b5cf6' }}>
                    −{combo.combinedDrop} pts
                    {combo.synergyBonus > 0 && (
                      <span className="text-[10px] ml-1" style={{ color: 'rgba(139,92,246,0.65)' }}>
                        (+{combo.synergyBonus} synergy)
                      </span>
                    )}
                  </span>
                </div>
                <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.40)' }}>
                  {combo.rationale}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ScoreSensitivityPanel;
