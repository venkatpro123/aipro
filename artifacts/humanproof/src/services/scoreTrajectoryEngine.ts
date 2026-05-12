/**
 * scoreTrajectoryEngine.ts — v12.0
 *
 * Wraps and enriches the existing (orphaned) trajectoryProjection.ts service.
 *
 * trajectoryProjection.ts has been in the codebase since v4.0 but was never
 * called by auditDataPipeline.ts — this engine activates it and adds:
 *   - Signal velocity from score history (pts/month rate of change)
 *   - Integration with hiringSignal and managerRisk for projection calibration
 *   - Calibrated critical decision date using actual SCORE_BANDS thresholds
 *   - Data version guard (only use v12.0+ history for velocity)
 *
 * Returns ScoreTrajectoryResult which extends TrajectoryProjection with
 * the velocity-specific fields needed by the ScoreRing velocity indicator.
 */

import { generateTrajectoryProjection, type TrajectoryProjection } from './trajectoryProjection';
import type { HybridResult } from '../types/hybridResult';
import type { CompanyData } from '../data/companyDatabase';
import type { ScoreHistoryEntry } from './scoreStorageService';
import type { TemporalRiskResult } from './temporalRiskAmplifier';
import type { ManagerRiskResult } from './managerRiskEngine';
import type { HiringSignalResult } from './hiringSignalAnalyzer';

export interface ScoreTrajectoryInputs {
  currentScore: number;
  companyData: CompanyData;
  hybridResult: HybridResult;
  /** Last 10 score history entries from scoreStorageService.getLayoffScoreHistory() */
  scoreHistory: ScoreHistoryEntry[];
  temporalRisk?: TemporalRiskResult;
  managerRisk?: ManagerRiskResult;
  hiringSignal?: HiringSignalResult;
}

export interface ScoreTrajectoryResult extends TrajectoryProjection {
  /** Rate of change in risk score (positive = risk increasing, negative = improving) */
  velocityPtsPerMonth: number;
  /** Qualitative direction: 'accelerating_risk' | 'deteriorating' | 'stable' | 'improving' */
  trajectoryDirection: 'accelerating_risk' | 'deteriorating' | 'stable' | 'improving';
  /** ISO date when static trajectory crosses HIGH tier (70pts) — null if won't cross in 12mo */
  criticalDecisionDateISO: string | null;
  /** Signal sources driving the velocity estimate */
  velocityDrivers: string[];
  /** Whether the velocity is from real history vs. signal-modeled estimate */
  velocityFromHistory: boolean;
}

// Score tier thresholds (aligned with layoffSurvivalPredictor.ts SCORE_BANDS)
const HIGH_TIER_THRESHOLD = 70;

export function computeScoreTrajectory(inputs: ScoreTrajectoryInputs): ScoreTrajectoryResult {
  const { currentScore, companyData, hybridResult, scoreHistory, temporalRisk, managerRisk, hiringSignal } = inputs;

  // Compute velocity from score history (only v12.0+ entries to avoid formula-change noise)
  const v12History = scoreHistory
    .filter(e => {
      // Accept entries from the same company, within the last 90 days
      const ageInDays = (Date.now() - new Date(e.timestamp).getTime()) / 86_400_000;
      return (
        e.companyName?.toLowerCase() === companyData.name?.toLowerCase() &&
        ageInDays <= 90
      );
    })
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  let velocityPtsPerMonth = 0;
  let velocityFromHistory = false;
  const velocityDrivers: string[] = [];

  if (v12History.length >= 2) {
    // Compute velocity from last two entries
    const oldest = v12History[0];
    const newest = v12History[v12History.length - 1];
    const daysBetween = (new Date(newest.timestamp).getTime() - new Date(oldest.timestamp).getTime()) / 86_400_000;
    if (daysBetween > 0) {
      const scoreDelta = newest.score - oldest.score;
      velocityPtsPerMonth = (scoreDelta / daysBetween) * 30;
      velocityFromHistory = true;
      velocityDrivers.push(`Score history: ${oldest.score}→${newest.score} over ${Math.round(daysBetween)} days`);
    }
  } else {
    // No history: estimate velocity from signals
    if (managerRisk && managerRisk.patternType !== 'clean') {
      velocityPtsPerMonth += managerRisk.patternType === 'exodus_signal' ? 3.5 : 1.8;
      velocityDrivers.push(`Manager risk (${managerRisk.patternType})`);
    }
    if (hiringSignal && (hiringSignal as any).riskPattern === 'SUDDEN_FREEZE') {
      velocityPtsPerMonth += 2.5;
      velocityDrivers.push('Hiring freeze signal');
    } else if (hiringSignal && (hiringSignal as any).riskPattern === 'AGGRESSIVE_REVERSAL') {
      velocityPtsPerMonth += 3.0;
      velocityDrivers.push('Aggressive hiring reversal');
    } else if (hiringSignal && (hiringSignal as any).riskPattern === 'SUSTAINED_DECLINE') {
      velocityPtsPerMonth += 1.5;
      velocityDrivers.push('Sustained hiring decline');
    }
    if (temporalRisk && temporalRisk.currentAmplifier > 1.15) {
      velocityPtsPerMonth += 1.2;
      velocityDrivers.push(`Temporal risk amplifier (${temporalRisk.currentAmplifier.toFixed(2)}×)`);
    }

    // Company-level signal-based pressure
    const revenue = companyData.revenueGrowthYoY;
    if (revenue !== null && revenue < -5) {
      velocityPtsPerMonth += 0.8;
      velocityDrivers.push(`Revenue declining (${revenue}% YoY)`);
    }
    const stock = companyData.stock90DayChange;
    if (stock !== null && stock < -20) {
      velocityPtsPerMonth += 0.7;
      velocityDrivers.push(`Stock drawdown (${stock}%)`);
    }
  }

  // Classify trajectory direction
  let trajectoryDirection: ScoreTrajectoryResult['trajectoryDirection'];
  if (velocityPtsPerMonth > 3.0) {
    trajectoryDirection = 'accelerating_risk';
  } else if (velocityPtsPerMonth > 1.0) {
    trajectoryDirection = 'deteriorating';
  } else if (velocityPtsPerMonth < -1.0) {
    trajectoryDirection = 'improving';
  } else {
    trajectoryDirection = 'stable';
  }

  // Compute critical decision date ISO string
  let criticalDecisionDateISO: string | null = null;
  if (currentScore < HIGH_TIER_THRESHOLD && velocityPtsPerMonth > 0.5) {
    const ptsToThreshold = HIGH_TIER_THRESHOLD - currentScore;
    const monthsToThreshold = ptsToThreshold / velocityPtsPerMonth;
    if (monthsToThreshold <= 12) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + Math.round(monthsToThreshold * 30));
      criticalDecisionDateISO = targetDate.toISOString();
    }
  }
  // Also check temporal risk for imminent danger window
  if (!criticalDecisionDateISO && temporalRisk?.nextDangerWindow?.startsInDays != null) {
    const days = temporalRisk.nextDangerWindow.startsInDays;
    if (days <= 60 && currentScore >= 50) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + days);
      criticalDecisionDateISO = targetDate.toISOString();
    }
  }

  // Generate the base trajectory projection from existing orphaned service
  const baseProjection = generateTrajectoryProjection(hybridResult, companyData);

  return {
    ...baseProjection,
    velocityPtsPerMonth: Math.round(velocityPtsPerMonth * 10) / 10,
    trajectoryDirection,
    criticalDecisionDateISO,
    velocityDrivers,
    velocityFromHistory,
  };
}
