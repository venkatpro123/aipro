/**
 * WhatIfSimulatorPanel.tsx — v12.0
 *
 * Interactive what-if scenario simulator using existing scoreSensitivity data.
 *
 * Replaces the read-only ScoreSensitivityPanel in OverviewTab.
 * Uses whatIfSimulatorService.ts for computation (zero server calls).
 *
 * UX: sliders for each sensitivity lever → live-updating simulated score ring
 * displayed beside the actual score. Shows feasibility and time-to-achieve
 * for the current lever combination.
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Sliders, TrendingDown } from 'lucide-react';
import type { HybridResult } from '../../types/hybridResult';
import { computeWhatIf, type ActiveLever } from '../../services/whatIfSimulatorService';
import type { ScoreSensitivityResult } from '../../services/scoreSensitivityEngine';

interface Props {
  result: HybridResult;
}

const DIMENSION_LABELS: Record<string, string> = {
  L1: 'Company Health', L2: 'Layoff History', L3: 'Role Displacement',
  L4: 'Market Conditions', L5: 'Employee Protection', D6: 'AI Agent Coverage', D7: 'Company Risk',
};

const TIER_COLORS: Record<string, string> = {
  red: '#ef4444', orange: '#f97316', amber: '#f59e0b', green: '#10b981', teal: '#14b8a6',
};

function SimulatedScoreRing({ score, color }: { score: number; color: string }) {
  const size = 80;
  const sw = 7;
  const r = size / 2 - sw - 3;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={sw} />
        <motion.circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth={sw}
          strokeDasharray={circ}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute text-center">
        <motion.div
          key={score}
          initial={{ scale: 1.15 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.2 }}
          className="text-lg font-bold leading-none"
          style={{ color }}
        >
          {Math.round(score)}
        </motion.div>
      </div>
    </div>
  );
}

export function WhatIfSimulatorPanel({ result }: Props) {
  const sensitivity = (result as any).scoreSensitivity as ScoreSensitivityResult | undefined;
  const [expanded, setExpanded] = useState(false);
  const [leverValues, setLeverValues] = useState<Record<string, number>>({});

  if (!sensitivity || !sensitivity.levers || sensitivity.levers.length === 0) return null;

  const topLevers = sensitivity.levers.slice(0, expanded ? undefined : 4);

  const activeLevers: ActiveLever[] = Object.entries(leverValues)
    .filter(([, val]) => val > 0)
    .map(([dim, val]) => ({
      dimension: dim,
      targetImprovement: val / 100,
      label: DIMENSION_LABELS[dim] ?? dim,
    }));

  const simResult = computeWhatIf({
    currentScore: result.total,
    breakdown: result.breakdown,
    activeLevers,
    d8Value: (result.breakdown as any).D8,
    dataFreshnessAgeInDays: result.dataFreshness?.ageInDays,
  });

  const simColor = TIER_COLORS[simResult.simulatedTier.color] ?? '#10b981';
  const hasDelta = simResult.scoreDelta < 0;

  const handleSlider = useCallback((dim: string, val: number) => {
    setLeverValues(prev => ({ ...prev, [dim]: val }));
  }, []);

  const resetAll = () => setLeverValues({});

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-white/8 bg-gray-900/40 p-4 mb-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sliders size={14} className="text-purple-400" />
          <span className="text-sm font-semibold text-white">What-If Simulator</span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
            Instant · No server calls
          </span>
        </div>
        {activeLevers.length > 0 && (
          <button
            onClick={resetAll}
            className="text-[11px] text-gray-500 hover:text-gray-300 transition-colors"
          >
            Reset all
          </button>
        )}
      </div>

      {/* Score comparison */}
      <div className="flex items-center gap-4 mb-4 p-3 rounded-lg bg-gray-800/40">
        <div className="text-center">
          <div className="text-[10px] text-gray-500 mb-1">CURRENT</div>
          <SimulatedScoreRing score={result.total} color={TIER_COLORS[result.tier.color] ?? '#f97316'} />
        </div>
        <div className="flex-1 text-center">
          {hasDelta ? (
            <motion.div
              key={simResult.scoreDelta}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="text-2xl font-bold text-emerald-400">{simResult.scoreDelta}</div>
              <div className="text-[10px] text-emerald-400/70">pts reduction</div>
              <div className="text-[10px] text-gray-500 mt-1">
                −{Math.round(Math.abs(simResult.probabilityDelta) * 100)}% 12mo probability
              </div>
            </motion.div>
          ) : (
            <div className="text-[11px] text-gray-500">Adjust sliders<br/>to simulate</div>
          )}
        </div>
        <div className="text-center">
          <div className="text-[10px] text-gray-500 mb-1">SIMULATED</div>
          <SimulatedScoreRing score={simResult.simulatedScore} color={simColor} />
        </div>
      </div>

      {/* Feasibility / time estimate */}
      <AnimatePresence>
        {hasDelta && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3 px-3 py-2 rounded-lg bg-emerald-950/20 border border-emerald-500/15"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <TrendingDown size={12} className="text-emerald-400" />
                <span className="text-[11px] text-emerald-400">Achievable in: {simResult.estimatedTimeToAchieve}</span>
              </div>
              <div className="text-[11px] text-gray-400">
                Feasibility: {simResult.feasibilityScore}/100
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* D8 gap notice — shows when AI efficiency restructuring risk cannot be reduced */}
      {simResult.d8Gap != null && simResult.d8Gap > 3 && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-amber-950/20 border border-amber-500/15">
          <p className="text-[11px] text-amber-300">
            Your score includes {simResult.d8Gap} pts from AI-efficiency restructuring at your company — this cannot be reduced by personal actions.
          </p>
        </div>
      )}

      {/* Data freshness warning */}
      {simResult.dataFreshnessWarning && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-gray-800/50 border border-gray-600/20">
          <p className="text-[11px] text-gray-400">{simResult.dataFreshnessWarning}</p>
        </div>
      )}

      {/* Lever sliders */}
      <div className="space-y-3">
        {topLevers.map((lever) => {
          const val = leverValues[lever.dimension] ?? 0;
          const dimImpact = simResult.dimensionImpacts.find(d => d.dimension === lever.dimension);
          return (
            <div key={lever.dimension} className="group">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-gray-300">
                    {DIMENSION_LABELS[lever.dimension] ?? lever.dimension}
                  </span>
                  {/* BUG-FIX: lever.feasibility is a required string enum field, but check
                      it defensively and use String() to prevent any render type issues */}
                  {lever.feasibility && (
                    <span className="text-[10px] text-gray-600">{String(lever.feasibility).replace(/_/g, ' ')}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {dimImpact && dimImpact.pointsReduced > 0 && (
                    <span className="text-[10px] text-emerald-400">−{dimImpact.pointsReduced}pts</span>
                  )}
                  <span className="text-[10px] text-gray-500">{val}%</span>
                </div>
              </div>
              <div className="relative h-1.5 bg-gray-800 rounded-full">
                <div
                  className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-purple-500 to-emerald-500 transition-all duration-150"
                  style={{ width: `${val}%` }}
                />
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={val}
                  onChange={(e) => {
                    // BUG-FIX: Guard against NaN from parseInt (defensive — input[type=range] should always be valid)
                    const numVal = parseInt(e.target.value, 10);
                    if (!isNaN(numVal)) handleSlider(lever.dimension, numVal);
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  aria-label={`Adjust ${DIMENSION_LABELS[lever.dimension] ?? lever.dimension}`}
                />
              </div>
              {val > 0 && lever.fastestAction && (
                <div className="mt-1 text-[10px] text-gray-500 line-clamp-1">
                  {lever.fastestAction}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Expand / collapse */}
      {sensitivity.levers.length > 4 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 w-full flex items-center justify-center gap-1 text-[11px] text-gray-500 hover:text-gray-300 transition-colors"
        >
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {expanded ? 'Show fewer levers' : `Show ${sensitivity.levers.length - 4} more levers`}
        </button>
      )}
    </motion.div>
  );
}
