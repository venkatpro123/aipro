// aiAmplificationService.ts — Phase 8 / P12 (AI as Amplifier)
// Pure functions, no I/O. Provides a shared AI leverage score + progression ladder
// consumed by AIAmplificationRoadmap and AIAmplificationWidget.

import type { HybridResult } from '../types/hybridResult';

export type AIProgressionLevel = 'Aware' | 'Experimenting' | 'Integrating' | 'Amplified';

export interface ProgressionLevelDef {
  level: AIProgressionLevel;
  minScore: number;
  description: string;
  requirement: string;
}

export interface AIAmplificationState {
  leverageScore: number;
  impactConfidenceSource: 'MODELED';
  progressionLevel: AIProgressionLevel;
  adoptedToolCount: number;
  nextLevelRequirement: string;
}

const PROGRESSION_LADDER: ProgressionLevelDef[] = [
  {
    level: 'Aware',
    minScore: 0,
    description: 'Knows AI tools exist — not yet integrated into daily work',
    requirement: 'Try one AI tool for your most repetitive work task',
  },
  {
    level: 'Experimenting',
    minScore: 25,
    description: 'Actively experimenting with AI tools on a weekly basis',
    requirement: 'Adopt 2+ tools and build them into your weekly workflow',
  },
  {
    level: 'Integrating',
    minScore: 50,
    description: 'AI tools are a regular part of every core work task',
    requirement: 'Adopt 3+ tools and produce measurably more than before',
  },
  {
    level: 'Amplified',
    minScore: 75,
    description: 'AI multiplies output — producing 2–5× more than peers',
    requirement: "You're ahead of the curve — document what works and teach it",
  },
];

export function getProgressionLadder(): ProgressionLevelDef[] {
  return PROGRESSION_LADDER;
}

export function computeAILeverageScore(
  adoptedTools: string[],
  hr: HybridResult,
): AIAmplificationState {
  const d1Score = hr.dimensions?.find(d => d.key === 'D1')?.score ?? 50;
  const surging = (hr.skillPortfolioFit as any)?.surgingSkills?.length ?? 0;
  const retool = (hr.skillPortfolioFit as any)?.retoolPriority?.length ?? 0;

  const base = Math.round(100 - d1Score * 0.4 + surging * 4 - retool * 2);
  const adoptionBoost = Math.min(32, adoptedTools.length * 8);
  const leverageScore = Math.max(10, Math.min(100, base + adoptionBoost));

  const levelDef =
    [...PROGRESSION_LADDER].reverse().find(l => leverageScore >= l.minScore) ??
    PROGRESSION_LADDER[0];
  const levelIndex = PROGRESSION_LADDER.indexOf(levelDef);
  const nextLevel = PROGRESSION_LADDER[levelIndex + 1];

  return {
    leverageScore,
    impactConfidenceSource: 'MODELED',
    progressionLevel: levelDef.level,
    adoptedToolCount: adoptedTools.length,
    nextLevelRequirement: nextLevel?.requirement ?? "You're at the highest amplification level",
  };
}
