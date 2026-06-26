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
  /**
   * The live risk score from result.total. Overrides scoreSensitivity.currentScore
   * (which was stamped at pipeline time and may differ from the displayed score
   * after a re-audit without a full recalculation of the sensitivity engine).
   */
  liveScore?: number;
}

const FEASIBILITY_CONFIG: Record<string, { label: string; color: string }> = {
  immediate:   { label: 'This week',   color: 'var(--color-emerald-text)' },
  short_term:  { label: 'This month',  color: 'var(--color-cyan-text)' },
  medium_term: { label: '1–3 months',  color: 'var(--color-amber500-text)' },
  long_term:   { label: '3–6 months',  color: 'var(--color-orange-text)' },
};

const CONFIDENCE_COLOR: Record<string, string> = {
  High:   'var(--color-emerald-text)',
  Medium: 'var(--color-amber500-text)',
  Low:    'var(--color-orange-text)',
};

function fmt(s: number) { return Math.min(100, Math.max(0, Math.round(s))); }

const LeverRow: React.FC<{ lever: SensitivityLever; currentScore: number; rank: number }> = ({
  lever, currentScore, rank,
}) => {
  const [open, setOpen] = useState(rank === 0); // first row open by default
  const feasCfg = FEASIBILITY_CONFIG[lever.feasibility] ?? { label: lever.actionTimeframe, color: 'var(--color-slate400-text)' };
  const confColor = CONFIDENCE_COLOR[lever.confidenceInEstimate] ?? '#94a3b8';
  const projected = fmt(currentScore - lever.scoreDropIfImproved);

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: '1px solid var(--alpha-bg-08)' }}
    >
      {/* Collapsed header — always visible */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 p-3 text-left"
        style={{ background: rank === 0 ? 'rgba(34,211,238,0.05)' : 'var(--alpha-bg-04)' }}
      >
        {/* Rank */}
        <span
          className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black"
          style={{
            background: rank === 0 ? 'rgba(34,211,238,0.18)' : 'var(--alpha-bg-06)',
            color: rank === 0 ? '#22d3ee' : 'var(--alpha-text-35)',
          }}
        >
          {rank + 1}
        </span>

        {/* Label */}
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold truncate" style={{ color: 'var(--alpha-text-85)' }}>
            {lever.dimensionLabel}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] font-semibold" style={{ color: feasCfg.color }}>
              {feasCfg.label}
            </span>
            <span style={{ color: 'var(--alpha-text-25)' }}>·</span>
            <span className="text-[10px]" style={{ color: confColor }}>
              {lever.confidenceInEstimate} confidence
            </span>
          </div>
        </div>

        {/* Score delta */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[11px] font-bold" style={{ color: 'var(--alpha-text-45)' }}>{fmt(currentScore)}</span>
          <ArrowRight className="w-3 h-3" style={{ color: 'var(--color-cyan-text)' }} />
          <span className="text-[13px] font-black" style={{ color: rank === 0 ? '#22d3ee' : 'var(--alpha-text-70)' }}>
            {projected}
          </span>
          <span className="text-[10px]" style={{ color: 'rgba(34,211,238,0.55)' }}>
            −{lever.scoreDropIfImproved}
          </span>
        </div>

        {/* Expand toggle */}
        {open
          ? <ChevronUp className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--alpha-text-30)' }} />
          : <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--alpha-text-30)' }} />
        }
      </button>

      {/* Expanded: fastest action */}
      {open && (
        <div
          className="px-4 pb-3 pt-1"
          style={{ background: rank === 0 ? 'rgba(34,211,238,0.03)' : 'transparent' }}
        >
          <p className="text-[10px] font-semibold mb-1" style={{ color: 'var(--alpha-text-35)' }}>
            FASTEST ACTION
          </p>
          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--alpha-text-55)' }}>
            {lever.fastestAction}
          </p>
          <p className="text-[10px] mt-1.5" style={{ color: 'var(--alpha-text-35)' }}>
            Timeframe: <span style={{ color: feasCfg.color, fontWeight: 600 }}>{lever.actionTimeframe}</span>
          </p>
        </div>
      )}
    </div>
  );
};

export const ScoreSensitivityPanel: React.FC<Props> = ({ scoreSensitivity, liveScore }) => {
  const {
    levers,
    bestSingleLeverScore, bestTwoLeverScore, bestThreeLeverScore,
    topSynergyCombos, keySensitivityInsight,
  } = scoreSensitivity;

  // Use the live score from result.total when provided — scoreSensitivity.currentScore
  // is stamped at pipeline time and can diverge from the displayed score in edge cases.
  const currentScore = liveScore ?? scoreSensitivity.currentScore;

  const activeLevers = levers.filter(l => l.scoreDropIfImproved > 0);
  if (activeLevers.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Key insight headline */}
      {keySensitivityInsight && (
        <p className="text-[11px] leading-relaxed italic" style={{ color: 'var(--alpha-text-50)' }}>
          {keySensitivityInsight}
        </p>
      )}

      {/* Projection row — recomputed from liveScore + engine deltas so the
          "current → projected" display stays consistent when liveScore differs
          from the pipeline-stamped scoreSensitivity.currentScore. */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {[
          { label: 'Top lever',    drop: fmt(scoreSensitivity.currentScore) - fmt(bestSingleLeverScore), desc: '1 action' },
          { label: 'Top 2 levers', drop: fmt(scoreSensitivity.currentScore) - fmt(bestTwoLeverScore),    desc: '2 actions' },
          { label: 'Top 3 levers', drop: fmt(scoreSensitivity.currentScore) - fmt(bestThreeLeverScore),  desc: '3 actions' },
        ].map(({ label, drop, desc }) => {
          const score = fmt(currentScore - drop);
          return (
            <div
              key={label}
              className="rounded-xl p-2.5 text-center"
              style={{ background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.15)' }}
            >
              <p className="text-[10px] font-semibold mb-1" style={{ color: 'var(--alpha-text-35)' }}>
                {label.toUpperCase()}
              </p>
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <span className="text-[10px]" style={{ color: 'var(--alpha-text-45)' }}>{fmt(currentScore)}</span>
                <ArrowRight className="w-2.5 h-2.5" style={{ color: 'var(--color-cyan-text)' }} />
                <span className="text-base font-black" style={{ color: 'var(--color-cyan-text)' }}>{score}</span>
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
                  <span className="text-[10px] font-semibold" style={{ color: 'var(--alpha-text-70)' }}>
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
                <p className="text-[10px]" style={{ color: 'var(--alpha-text-45)' }}>
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
