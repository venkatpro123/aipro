// PersonalImpactSimulator.tsx — Beast Mode V3
//
// 3-scenario comparison: Do Nothing / Partial Action / Full Action.
// Sources:
//   survivalProbability.inactionProbability12m  → "do nothing" probability
//   survivalProbability.probability12m          → current probability
//   scoreSensitivity.levers                     → projected score drops
//   scoreTrajectory                             → drift direction
//
// Only renders when scoreSensitivity OR survivalProbability is present.

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { SurvivalProbabilityResult } from '../../../services/layoffSurvivalPredictor';
import type { ScoreSensitivityResult } from '../../../services/scoreSensitivityEngine';

interface ScoreTrajectoryResult {
  trajectoryDirection?: string;
  velocity?: number;
}

interface PersonalImpactSimulatorProps {
  currentScore: number;
  survivalProbability?: SurvivalProbabilityResult;
  scoreTrajectory?: ScoreTrajectoryResult;
  scoreSensitivity?: ScoreSensitivityResult;
  financialRunwayMonths?: number;
}

interface ScenarioCard {
  label: string;
  description: string;
  projectedScore: number;
  probability: number;
  bg: string;
  border: string;
  accentColor: string;
  note?: string;
}

function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, n)); }

function scoreToTier(s: number): string {
  if (s >= 75) return 'CRITICAL';
  if (s >= 55) return 'HIGH';
  if (s >= 35) return 'MODERATE';
  return 'LOW';
}

function tierColor(s: number): string {
  if (s >= 75) return '#dc2626';
  if (s >= 55) return '#f97316';
  if (s >= 35) return '#f59e0b';
  return '#10b981';
}

export const PersonalImpactSimulator: React.FC<PersonalImpactSimulatorProps> = ({
  currentScore,
  survivalProbability,
  scoreTrajectory,
  scoreSensitivity,
  financialRunwayMonths,
}) => {
  // All hooks must be called unconditionally before any early return
  const scenarios: ScenarioCard[] = useMemo(() => {
    const levers = scoreSensitivity?.levers ?? [];
    const top5Drop = levers.slice(0, 5).reduce((sum, l) => sum + (l.scoreDropIfImproved ?? 0), 0);
    const top2Drop = levers.slice(0, 2).reduce((sum, l) => sum + (l.scoreDropIfImproved ?? 0), 0);

    const driftMap: Record<string, number> = {
      accelerating_risk: 8, deteriorating: 5, stable: 0, improving: -3,
    };
    const drift = driftMap[scoreTrajectory?.trajectoryDirection ?? 'stable'] ?? 0;

    const doNothingScore = clamp(currentScore + drift, 0, 99);
    const partialScore   = clamp(currentScore - top2Drop, 0, 99);
    const fullScore      = clamp(currentScore - top5Drop, 0, 99);

    const inactionProb = survivalProbability?.inactionProbability12m ?? null;
    const currentProb  = survivalProbability?.probability12m ?? null;

    const doNothingProb = inactionProb != null
      ? Math.round(inactionProb * 100)
      : Math.min(99, Math.round((doNothingScore / 100) * 80));

    // Guard against division by zero when currentScore is 0
    const safeScore = Math.max(1, currentScore);
    const currentProbPct = currentProb != null
      ? Math.round(currentProb * 100)
      : Math.round((safeScore / 100) * 65);

    const partialProbPct = Math.max(5, Math.round(currentProbPct * (partialScore / safeScore)));
    const fullProbPct    = Math.max(3, Math.round(currentProbPct * (fullScore / safeScore)));

    const runwayNote = financialRunwayMonths && financialRunwayMonths <= 6
      ? `${financialRunwayMonths}mo runway at risk`
      : undefined;

    return [
      {
        label: 'IF YOU WAIT',
        description: 'No action taken in the next 3 months',
        projectedScore: doNothingScore,
        probability: doNothingProb,
        bg: 'rgba(220,38,38,0.06)',
        border: 'rgba(220,38,38,0.25)',
        accentColor: '#dc2626',
        note: runwayNote,
      },
      {
        label: 'PARTIAL ACTION',
        description: 'Complete top 2 high-priority actions',
        projectedScore: partialScore,
        probability: partialProbPct,
        bg: 'rgba(245,158,11,0.06)',
        border: 'rgba(245,158,11,0.22)',
        accentColor: '#f59e0b',
      },
      {
        label: 'FULL PLAN',
        description: 'Complete Phase 1 + Phase 2 actions',
        projectedScore: fullScore,
        probability: fullProbPct,
        bg: 'rgba(16,185,129,0.06)',
        border: 'rgba(16,185,129,0.22)',
        accentColor: '#10b981',
      },
    ];
  }, [currentScore, survivalProbability, scoreTrajectory, scoreSensitivity, financialRunwayMonths]);

  // Gate after all hooks — no data means no value to show
  if (!scoreSensitivity?.levers?.length && !survivalProbability) return null;

  return (
    <div>
      <p
        className="text-[9px] font-black tracking-[0.14em] uppercase mb-2.5"
        style={{ color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-mono)' }}
      >
        PERSONAL IMPACT SIMULATOR
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {scenarios.map((sc, i) => (
          <motion.div
            key={sc.label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: i * 0.07 }}
            className="rounded-xl p-3 flex flex-col gap-2"
            style={{ background: sc.bg, border: `1px solid ${sc.border}` }}
          >
            {/* Label */}
            <p
              className="text-[9px] font-black tracking-[0.10em] uppercase"
              style={{ color: sc.accentColor }}
            >
              {sc.label}
            </p>

            {/* Projected score */}
            <div className="flex items-end gap-2">
              <span className="text-[22px] font-black leading-none" style={{ color: tierColor(sc.projectedScore) }}>
                {sc.projectedScore}
              </span>
              <div className="pb-0.5">
                {sc.projectedScore !== currentScore && (
                  <span className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.40)' }}>
                    {sc.projectedScore > currentScore ? `+${sc.projectedScore - currentScore}` : `−${currentScore - sc.projectedScore}`} pts
                  </span>
                )}
                <p className="text-[9px]" style={{ color: tierColor(sc.projectedScore) + 'aa' }}>
                  {scoreToTier(sc.projectedScore)}
                </p>
              </div>
            </div>

            {/* Probability */}
            <div
              className="rounded-lg px-2 py-1 text-center"
              style={{
                background: sc.accentColor + '12',
                border: `1px solid ${sc.accentColor}22`,
              }}
            >
              <span className="text-[11px] font-black" style={{ color: sc.accentColor }}>
                {sc.probability}%
              </span>
              <span className="text-[10px] ml-1" style={{ color: 'rgba(255,255,255,0.40)' }}>
                layoff risk
              </span>
            </div>

            {/* Description */}
            <p className="text-[10px] leading-snug" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {sc.description}
            </p>

            {/* Optional note */}
            {sc.note && (
              <p className="text-[9px] font-bold" style={{ color: '#f59e0b' }}>⚠ {sc.note}</p>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default PersonalImpactSimulator;
