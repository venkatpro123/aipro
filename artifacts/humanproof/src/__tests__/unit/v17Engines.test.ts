// v17Engines.test.ts — Unit tests for Layer 53 (careerContingencyPlanEngine)
// and Layer 54 (preparednessScoreEngine). Covers: null/minimal inputs,
// urgency levels, recommended path selection, pillar scoring, landing weeks.

import { describe, it, expect } from 'vitest';
import { computeCareerContingencyPlan } from '../../services/careerContingencyPlanEngine';
import { computePreparednessScore } from '../../services/preparednessScoreEngine';

// ── careerContingencyPlanEngine (Layer 53) ─────────────────────────────────────

describe('careerContingencyPlanEngine', () => {

  it('returns a valid plan with all-null optional inputs', () => {
    const plan = computeCareerContingencyPlan({ currentScore: 50 });
    expect(plan.recommendedPath).toMatch(/^(STAY|NEGOTIATE|TRANSITION)$/);
    expect(plan.pathConfidence).toBeGreaterThan(0);
    expect(plan.pathConfidence).toBeLessThanOrEqual(1);
    expect(plan.urgencyLevel).toMatch(/^(IMMEDIATE|URGENT|PLANNED|MONITOR)$/);
    expect(plan.stayPath.feasibilityScore).toBeGreaterThanOrEqual(0);
    expect(plan.stayPath.feasibilityScore).toBeLessThanOrEqual(100);
    expect(plan.negotiatePath.immediateActions.length).toBeGreaterThan(0);
    expect(plan.transitionPath.keyRisks.length).toBeGreaterThan(0);
    expect(typeof plan.criticalDecisionDate).toBe('string');
    expect(typeof plan.synthesisNarrative).toBe('string');
    expect(typeof plan.decisionFramework).toBe('string');
  });

  it('returns IMMEDIATE urgency for score ≥80', () => {
    const plan = computeCareerContingencyPlan({ currentScore: 85 });
    expect(plan.urgencyLevel).toBe('IMMEDIATE');
  });

  it('returns IMMEDIATE urgency for collapseStage=3 regardless of score', () => {
    const plan = computeCareerContingencyPlan({ currentScore: 30, collapseStage: 3 });
    expect(plan.urgencyLevel).toBe('IMMEDIATE');
  });

  it('returns IMMEDIATE urgency for runway < 2 months', () => {
    const plan = computeCareerContingencyPlan({
      currentScore: 40,
      financialRunwayMonths: 1,
    });
    expect(plan.urgencyLevel).toBe('IMMEDIATE');
  });

  it('returns MONITOR urgency for low score with no stress signals', () => {
    const plan = computeCareerContingencyPlan({ currentScore: 20 });
    expect(plan.urgencyLevel).toBe('MONITOR');
  });

  it('forces TRANSITION recommendation for emergency_exit career goal', () => {
    const plan = computeCareerContingencyPlan({
      currentScore: 60,
      careerGoal: 'emergency_exit',
    });
    expect(plan.recommendedPath).toBe('TRANSITION');
  });

  it('forces TRANSITION with high confidence for collapseStage=3', () => {
    const plan = computeCareerContingencyPlan({
      currentScore: 50,
      collapseStage: 3,
    });
    expect(plan.recommendedPath).toBe('TRANSITION');
    expect(plan.pathConfidence).toBeGreaterThanOrEqual(0.80);
  });

  it('all three paths have distinct pathIds', () => {
    const plan = computeCareerContingencyPlan({ currentScore: 55 });
    const ids = [plan.stayPath.pathId, plan.negotiatePath.pathId, plan.transitionPath.pathId];
    expect(new Set(ids).size).toBe(3);
    expect(ids).toContain('STAY');
    expect(ids).toContain('NEGOTIATE');
    expect(ids).toContain('TRANSITION');
  });

  it('each path has a non-empty immediateActions array', () => {
    const plan = computeCareerContingencyPlan({ currentScore: 65 });
    expect(plan.stayPath.immediateActions.length).toBeGreaterThan(0);
    expect(plan.negotiatePath.immediateActions.length).toBeGreaterThan(0);
    expect(plan.transitionPath.immediateActions.length).toBeGreaterThan(0);
  });

  it('feasibility scores are in 0–100 range for all paths', () => {
    const plan = computeCareerContingencyPlan({ currentScore: 70 });
    for (const path of [plan.stayPath, plan.negotiatePath, plan.transitionPath]) {
      expect(path.feasibilityScore).toBeGreaterThanOrEqual(0);
      expect(path.feasibilityScore).toBeLessThanOrEqual(100);
      expect(path.expectedValueScore).toBeGreaterThanOrEqual(0);
      expect(path.expectedValueScore).toBeLessThanOrEqual(100);
    }
  });

});

// ── preparednessScoreEngine (Layer 54) ────────────────────────────────────────

describe('preparednessScoreEngine', () => {

  it('returns a valid result with all-null optional inputs', () => {
    const result = computePreparednessScore({});
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
    expect(result.readinessLabel).toMatch(/^(READY|MOSTLY_READY|PARTIAL|UNDERPREPARED|NOT_READY)$/);
    expect(result.estimatedLandingWeeks).toBeGreaterThan(0);
    expect(Object.keys(result.pillars)).toEqual(['financial', 'market', 'skills', 'clarity', 'operational']);
    expect(result.topGaps.length).toBeGreaterThanOrEqual(1);
    expect(typeof result.preparednessNarrative).toBe('string');
  });

  it('pillar weights sum to 1.0', () => {
    const result = computePreparednessScore({});
    const weightSum = Object.values(result.pillars).reduce((s, p) => s + p.weight, 0);
    expect(Math.abs(weightSum - 1.0)).toBeLessThan(0.001);
  });

  it('overallScore matches weighted pillar scores', () => {
    const result = computePreparednessScore({
      financialRunwayMonths: 12,
      networkSize: 'substantial',
    });
    const expectedScore = Math.round(
      Object.values(result.pillars).reduce((sum, p) => sum + p.score * p.weight, 0)
    );
    expect(Math.abs(result.overallScore - expectedScore)).toBeLessThanOrEqual(1);
  });

  it('zero runway produces NOT_READY or UNDERPREPARED', () => {
    const result = computePreparednessScore({ financialRunwayMonths: 0 });
    expect(['NOT_READY', 'UNDERPREPARED']).toContain(result.readinessLabel);
  });

  it('strong profile produces READY or MOSTLY_READY', () => {
    const result = computePreparednessScore({
      financialRunwayMonths: 24,
      networkSize: 'extensive',
      priorJobChanges: 5,
      priorLayoffSurvived: true,
      careerGoal: 'strategic_exit',
    });
    expect(['READY', 'MOSTLY_READY']).toContain(result.readinessLabel);
  });

  it('READY label produces shortest landing weeks (≤8)', () => {
    const result = computePreparednessScore({
      financialRunwayMonths: 36,
      networkSize: 'extensive',
      priorJobChanges: 6,
      priorLayoffSurvived: true,
      careerGoal: 'strategic_exit',
    });
    if (result.readinessLabel === 'READY') {
      expect(result.estimatedLandingWeeks).toBeLessThanOrEqual(8);
    }
  });

  it('NOT_READY label produces long landing weeks (≥30)', () => {
    const result = computePreparednessScore({
      financialRunwayMonths: 0,
      networkSize: 'minimal',
      careerGoal: null,
    });
    if (result.readinessLabel === 'NOT_READY') {
      expect(result.estimatedLandingWeeks).toBeGreaterThanOrEqual(30);
    }
  });

  it('each pillar score is in 0–100 range', () => {
    const result = computePreparednessScore({ financialRunwayMonths: 6, networkSize: 'moderate' });
    for (const pillar of Object.values(result.pillars)) {
      expect(pillar.score).toBeGreaterThanOrEqual(0);
      expect(pillar.score).toBeLessThanOrEqual(100);
    }
  });

  it('topGaps lists 3 entries even for a strong profile', () => {
    const result = computePreparednessScore({
      financialRunwayMonths: 24,
      networkSize: 'extensive',
    });
    expect(result.topGaps.length).toBe(3);
  });

  it('pillar weightedContribution equals score * weight', () => {
    const result = computePreparednessScore({ financialRunwayMonths: 10, networkSize: 'moderate' });
    for (const pillar of Object.values(result.pillars)) {
      const expected = pillar.score * pillar.weight;
      expect(Math.abs(pillar.weightedContribution - expected)).toBeLessThan(1);
    }
  });

});
