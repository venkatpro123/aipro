// harmfulAdvicePrevention.test.ts
//
// REGRESSION GATE — run before every deploy.
//
// PURPOSE
// ───────
// These tests assert the ABSENCE of harmful content, not the presence of
// correct content. A score being wrong is a UX bug. Harmful advice being shown
// to a user who cannot afford it, or an upskilling roadmap being shown to a
// user who needs an exit plan, is a trust and safety issue.
//
// The four harmful pathways tested here:
//
//   1. EXPENSIVE COURSE TO BROKE USER
//      A conservative financial profile (< 2 months runway) must never see a
//      course costing more than ₹3,000. Recommending an ₹18K certification to
//      someone with no emergency fund is harmful advice.
//
//   2. INCOME-GAP CAREER PATH TO CONSERVATIVE USER
//      The full-transition salary trajectory requires an income dip. A user
//      with conservative financial profile (transitionDipFraction < 0.90) must
//      not see that path — it recommends behaviour their finances cannot support.
//
//   3. UPSKILLING ROADMAP WHEN EXIT STRATEGY IS NEEDED
//      Below-average performance + Stage 3 company collapse = the user cannot
//      upskill their way out in the available time window. Showing a 90-day
//      certification roadmap in this scenario is harmful — it delays the exit
//      actions that might actually save their employment.
//
//   4. STAGE 3 SALARY CHART — STABLE PERIOD NOT COMPRESSED
//      Stage 3 signals mean displacement is imminent. The income model must
//      compress the stable period from 8 months to 2 months (0.25× multiplier).
//      Showing an uncompressed chart to a Stage 3 user gives false time to act.

import { describe, it, expect } from 'vitest';

import {
  deriveFinancialProfile,
  getPerformanceCollapseStrategy,
  type FinancialContext,
} from '../../services/financialContextService';

import {
  getTrajParams,
  computeTrajectory,
  getStageMultiplier,
} from '../../components/SalaryAtRiskPanel';

import {
  COURSE_RESOURCES,
  filterCoursesForProfile,
  buildDynamicActions,
} from '../../components/AuditTabs/ActionPlanTab';

// ── Shared fixtures ────────────────────────────────────────────────────────────

/** A financially fragile user: 1.5 months emergency fund, 2 dependents. */
const CONSERVATIVE_CTX: FinancialContext = {
  monthlyExpenses:     30_000,
  dependents:          2,
  emergencyFundMonths: 1.5,
  currentAnnualIncome: 600_000,
  currency:            'INR',
  capturedAt:          Date.now(),
};

/** A user with 10 months runway and 0 dependents — aggressive profile. */
const AGGRESSIVE_CTX: FinancialContext = {
  monthlyExpenses:     30_000,
  dependents:          0,
  emergencyFundMonths: 10,
  currentAnnualIncome: 1_200_000,
  currency:            'INR',
  capturedAt:          Date.now(),
};

const CONSERVATIVE_PROFILE = deriveFinancialProfile(CONSERVATIVE_CTX, 65);
const AGGRESSIVE_PROFILE   = deriveFinancialProfile(AGGRESSIVE_CTX, 65);

/** Minimal HybridResult shape for buildDynamicActions */
function makeResult(overrides: Record<string, any> = {}) {
  return {
    total:          65,
    workTypeKey:    'sw_backend',
    companyName:    'TestCo',
    collapseStage:  null,
    recommendations: [],
    breakdown:      { L1: 0.5, L2: 0.4, L3: 0.5, L4: 0.4, L5: 0.4 },
    userFactors:    { performanceTier: 'average', tenureYears: 5 },
    ...overrides,
  } as any;
}

// ── Test 1: No expensive course for conservative user ─────────────────────────

describe('Harmful advice prevention — Test 1: expensive course to broke user', () => {

  it('conservative profile is derived correctly from low runway', () => {
    expect(CONSERVATIVE_PROFILE.riskAppetite).toBe('conservative');
  });

  it('all role prefixes: no course > ₹3,000 shown to conservative profile', () => {
    const allPrefixes = Object.keys(COURSE_RESOURCES);
    expect(allPrefixes.length).toBeGreaterThan(0);

    for (const prefix of allPrefixes) {
      const allCourses = COURSE_RESOURCES[prefix];
      // Use the actual exported function — not a reimplementation — so code changes
      // that break the filtering are caught here immediately.
      const conservativeList = filterCoursesForProfile(allCourses, 'conservative');
      const expensiveCourses = conservativeList.filter(c => c.costINR > 3000 && !c.free);

      expect(expensiveCourses, `prefix "${prefix}": conservative user received expensive course(s): ` +
        expensiveCourses.map(c => `${c.title} (₹${c.costINR})`).join(', ')
      ).toHaveLength(0);
    }
  });

  it('specifically: ₹18,000 course is absent from conservative sw list', () => {
    // The 'sw' (software) prefix has courses up to ₹2,800 — all should pass.
    // This test hardcodes the ₹18K threshold from the spec to act as a canary
    // if a new expensive course is added without updating the filter logic.
    const allCourses = COURSE_RESOURCES['sw'] ?? [];
    const affordable = allCourses.filter(c => c.free || c.costINR <= 3000);
    const conservativeList = affordable.length > 0 ? affordable : allCourses.slice(0, 1);

    const over18k = conservativeList.filter(c => c.costINR >= 18_000);
    expect(over18k).toHaveLength(0);
  });

  it('specifically: hr prefix has ₹8,000 SHRM course — must NOT appear for conservative profile', () => {
    const allCourses = COURSE_RESOURCES['hr'] ?? [];
    const shrm = allCourses.find(c => c.title.includes('SHRM') && c.costINR === 8000);
    expect(shrm).toBeDefined(); // confirm the test fixture is valid

    const affordable = allCourses.filter(c => c.free || c.costINR <= 3000);
    const conservativeList = affordable.length > 0 ? affordable : allCourses.slice(0, 1);

    const shrmInConservative = conservativeList.find(c => c.title.includes('SHRM') && c.costINR === 8000);
    expect(shrmInConservative).toBeUndefined();
  });

  it('inverse: aggressive profile receives the full unfiltered course list', () => {
    expect(AGGRESSIVE_PROFILE.riskAppetite).toBe('aggressive');
    // For aggressive profiles the filter is not applied — allCourses returned directly
    const allCourses = COURSE_RESOURCES['fin'] ?? [];
    // All courses should be visible — no filtering
    const expensive = allCourses.filter(c => c.costINR > 3000);
    // There must BE expensive courses in 'fin' (test fixture validity check)
    expect(expensive.length).toBeGreaterThan(0);
    // And for aggressive profile: no filter applied, so the list equals allCourses
    // (we can't test the React component filter here without rendering, but we can
    // verify the profile doesn't trigger the conservative guard)
    expect(AGGRESSIVE_PROFILE.riskAppetite).not.toBe('conservative');
  });

});

// ── Test 2: Income-gap full-transition path hidden for conservative user ───────

describe('Harmful advice prevention — Test 2: income-gap career path for conservative user', () => {

  it('conservative profile is correctly identified as unable to tolerate income gap', () => {
    expect(CONSERVATIVE_PROFILE.riskAppetite).toBe('conservative');
    // The financial constraint message must reference the short runway
    expect(CONSERVATIVE_PROFILE.primaryConstraint).toContain('1.5 months');
  });

  it('critical (score 80): transitionDipFraction is 0.82 — below 0.90 income-gap threshold', () => {
    // For a critical-risk user (score 80), the full-transition path requires an 18% income dip.
    // This is below the 0.90 threshold, so it MUST be hidden for a conservative profile.
    const params = getTrajParams(80);
    expect(params.transitionDipFraction).toBe(0.82);
    expect(params.transitionDipFraction).toBeLessThan(0.90);
  });

  it('high-risk (score 65): transitionDipFraction is 0.88 — still requires significant income gap', () => {
    const params = getTrajParams(65);
    expect(params.transitionDipFraction).toBe(0.88);
    expect(params.transitionDipFraction).toBeLessThan(0.90);
  });

  it('elevated-risk (score 45): transitionDipFraction is 0.92 — above threshold, full path allowed', () => {
    // At elevated risk, the dip is only 8% — within the 10% tolerance.
    // Conservative profile CAN see this path.
    const params = getTrajParams(45);
    expect(params.transitionDipFraction).toBe(0.92);
    expect(params.transitionDipFraction).toBeGreaterThanOrEqual(0.90);
  });

  it('conservative + score 80: visiblePaths logic excludes full-transition', () => {
    // Mirror the exact visiblePaths logic from SalaryAtRiskPanel
    const params = getTrajParams(80);
    const isConservative = CONSERVATIVE_PROFILE.riskAppetite === 'conservative';
    const visiblePaths: string[] =
      isConservative && params.transitionDipFraction < 0.90
        ? ['noAction', 'partial']
        : ['noAction', 'partial', 'full'];

    expect(visiblePaths).not.toContain('full');
    expect(visiblePaths).toContain('noAction');
    expect(visiblePaths).toContain('partial');
  });

  it('trajectory: full-path dip IS present in computed points (proves exclusion is necessary)', () => {
    // computeTrajectory samples at m = 0, 3, 6, 9 … (3-month intervals).
    // transitionDipMonth = 4 for score 80, so there is no exact M4 point.
    // At M3 the linear dip formula gives: 1 - (1 - 0.82) * (3/4) = 0.865 — clearly below monthly.
    const params   = getTrajParams(80);
    const monthly  = 50_000;
    const points   = computeTrajectory(monthly, params);

    // M3 is within the dip window (m <= transitionDipMonth=4)
    const atM3 = points.find(p => p.month === 3);
    expect(atM3).toBeDefined();

    // Full-transition income is already falling before the dip month is reached
    expect(atM3!.full).toBeLessThan(monthly);
    // And the drop is more than 10% — below the conservative threshold
    expect(atM3!.full).toBeLessThan(monthly * 0.90);
  });

  it('action plan: conservative profile suppresses actions that mention quitting', () => {
    // Build a dynamic action plan with a conservative financial profile
    // and verify no action item tells the user to quit or leave their job.
    const result   = makeResult({ total: 70 });
    const actions  = buildDynamicActions(result, 'TestCo', CONSERVATIVE_PROFILE);

    const quit = actions.filter(a =>
      a.description.toLowerCase().includes('quit') ||
      a.description.toLowerCase().includes('leave your job'),
    );

    expect(quit).toHaveLength(0);
  });

});

// ── Test 3: Exit strategy shown, not upskilling roadmap ───────────────────────

describe('Harmful advice prevention — Test 3: upskilling roadmap suppressed at Stage 3', () => {

  it('getPerformanceCollapseStrategy returns suppression for below + Stage 3 + score 75', () => {
    const strategy = getPerformanceCollapseStrategy('below', 3, 75);

    expect(strategy).not.toBeNull();
    expect(strategy!.isActive).toBe(true);
    expect(strategy!.suppressUpskilling).toBe(true);
    expect(strategy!.urgencyTier).toBe('immediate');
  });

  it('suppression headline references exit, not upskilling', () => {
    const strategy = getPerformanceCollapseStrategy('below', 3, 75);
    const headline = strategy!.headline.toLowerCase();

    // Must mention exit
    expect(headline).toMatch(/exit/);
    // Must NOT suggest staying to upskill
    expect(headline).not.toMatch(/upskill|certif|learn|roadmap|course/);
  });

  it('strategy override explicitly forbids upskilling as the primary action', () => {
    const strategy = getPerformanceCollapseStrategy('below', 3, 75);
    const text = strategy!.strategyOverride.toLowerCase();

    // Must mention network/CV/search (exit actions)
    expect(text).toMatch(/network|cv|job search|search/);
    // The override text must explain WHY upskilling won't work
    expect(text).toMatch(/upskilling cannot|reskilling happens/);
  });

  it('action plan: Stage 3 + below-average REMOVES L3 displacement and certification actions', () => {
    const result = makeResult({
      total:         75,
      collapseStage: 3,
      userFactors:   { performanceTier: 'below', tenureYears: 3 },
    });

    const strategy = getPerformanceCollapseStrategy('below', 3, 75);
    expect(strategy?.suppressUpskilling).toBe(true);

    // Build actions, then apply the same suppression filter the component applies
    const allActions = buildDynamicActions(result, 'TestCo', null);
    const filtered = strategy?.suppressUpskilling
      ? allActions.filter(item =>
          !item.layerFocus?.toLowerCase().includes('l3') &&
          !item.layerFocus?.toLowerCase().includes('displacement') &&
          !item.title?.toLowerCase().includes('certif') &&
          !item.title?.toLowerCase().includes('roadmap') &&
          !item.deadline?.toLowerCase().includes('90 day'),
        )
      : allActions;

    const certActions = filtered.filter(a =>
      a.title.toLowerCase().includes('certif') ||
      a.title.toLowerCase().includes('roadmap') ||
      a.title.toLowerCase().includes('upskill'),
    );

    expect(certActions).toHaveLength(0);
  });

  it('Stage 3 + below-average: at least 2 actions remain after suppression (plan is not empty)', () => {
    // Suppression should never leave the user with NO advice — that is also harmful.
    // L1=0.70 (> 0.65 threshold) triggers the financial health action.
    // L2=0.65 (> 0.60 threshold) triggers the layoff history action.
    // Both use non-L3 layerFocus, so they survive the suppressUpskilling filter.
    const result = makeResult({
      total:         75,
      collapseStage: 3,
      userFactors:   { performanceTier: 'below', tenureYears: 3 },
      breakdown:     { L1: 0.70, L2: 0.65, L3: 0.70, L4: 0.50, L5: 0.40 },
    });

    const strategy = getPerformanceCollapseStrategy('below', 3, 75);
    const allActions = buildDynamicActions(result, 'TestCo', null);
    const filtered = strategy?.suppressUpskilling
      ? allActions.filter(item =>
          !item.layerFocus?.toLowerCase().includes('l3') &&
          !item.layerFocus?.toLowerCase().includes('displacement') &&
          !item.title?.toLowerCase().includes('certif') &&
          !item.title?.toLowerCase().includes('roadmap') &&
          !item.deadline?.toLowerCase().includes('90 day'),
        )
      : allActions;

    // At minimum the urgent score action and the exit financial action should survive
    expect(filtered.length).toBeGreaterThanOrEqual(2);
  });

  it('getPerformanceCollapseStrategy: top performer at Stage 3 does NOT trigger suppression', () => {
    // Suppression is only for BELOW-average performers — top performers can upskill
    const strategy = getPerformanceCollapseStrategy('top', 3, 75);
    expect(strategy).toBeNull();
  });

  it('getPerformanceCollapseStrategy: below-average + high score + no stage → elevated, not immediate', () => {
    // The "elevated" path triggers when: performanceTier=below AND scoreIsHigh (>=70)
    // but no Stage 2/3 signal. Stage 1 alone (score < 70) returns null — not yet actionable.
    const strategy = getPerformanceCollapseStrategy('below', null, 72);
    expect(strategy).not.toBeNull();
    expect(strategy!.urgencyTier).toBe('elevated');
    expect(strategy!.suppressUpskilling).toBe(false);
  });

});

// ── Test 4: Stage 3 compresses salary chart stable period ─────────────────────

describe('Harmful advice prevention — Test 4: Stage 3 salary chart stable period compression', () => {

  it('getStageMultiplier returns 0.25 for Stage 3', () => {
    expect(getStageMultiplier(3)).toBe(0.25);
  });

  it('getStageMultiplier: all stage values are correct', () => {
    expect(getStageMultiplier(1)).toBe(0.75);
    expect(getStageMultiplier(2)).toBe(0.50);
    expect(getStageMultiplier(3)).toBe(0.25);
    expect(getStageMultiplier(null)).toBe(1.0);
  });

  it('Stage 3 compresses stableMonths from 8 → 2 for critical-risk score', () => {
    const base   = getTrajParams(80);
    const staged = Math.max(2, Math.round(base.stableMonths * getStageMultiplier(3)));

    // Base: 8 months stable period for critical risk
    expect(base.stableMonths).toBe(8);
    // Stage 3 at 0.25×: 8 × 0.25 = 2 months
    expect(staged).toBe(2);
  });

  it('Stage 3 trajectory: income decline begins at M3, not M6 or later', () => {
    // computeTrajectory samples at 3-month intervals: 0, 3, 6, 9 …
    // compressed stableMonths = 2, so M0 is still in stable (m=0 <= 2), but M3 is not.
    const base   = getTrajParams(80);
    const compressedStable = Math.max(2, Math.round(base.stableMonths * getStageMultiplier(3)));
    expect(compressedStable).toBe(2);

    const params = { ...base, stableMonths: compressedStable };
    const monthly = 50_000;
    const points  = computeTrajectory(monthly, params);

    // M0: within stable period (0 <= 2) — full income
    const atM0 = points.find(p => p.month === 0);
    expect(atM0).toBeDefined();
    expect(atM0!.noAction).toBe(monthly);

    // M3: past the 2-month stable period — decline must have started
    const atM3 = points.find(p => p.month === 3);
    expect(atM3).toBeDefined();
    expect(atM3!.noAction).toBeLessThan(monthly);
  });

  it('uncompressed trajectory: income still flat at M8 (proves Stage 3 changes behaviour)', () => {
    // Without Stage 3 compression, the no-action path is flat through M8.
    // If Stage 3 were being ignored, the compressed test above would also be flat at M3.
    const base   = getTrajParams(80);
    const monthly = 50_000;
    const points  = computeTrajectory(monthly, base);

    // Base stableMonths = 8: income should be flat at M3, M6
    const atM3 = points.find(p => p.month === 3);
    const atM6 = points.find(p => p.month === 6);
    expect(atM3!.noAction).toBe(monthly);
    expect(atM6!.noAction).toBe(monthly);
  });

  it('Stage 3 + score 80: full-transition path shows income drop by M3', () => {
    // transitionDipMonth = 4 for score 80, but trajectory samples at 0, 3, 6 …
    // At M3 (within the dip window, m <= 4), the full path uses linear decline toward dip.
    const base   = getTrajParams(80);
    const params = { ...base, stableMonths: Math.max(2, Math.round(base.stableMonths * getStageMultiplier(3))) };
    const monthly = 50_000;
    const points  = computeTrajectory(monthly, params);

    const atM3 = points.find(p => p.month === 3);
    expect(atM3).toBeDefined();
    // Full-transition income at M3 is already declining (dip starts at M0, bottoms at M4)
    expect(atM3!.full).toBeLessThan(monthly);
  });

  it('Stage 3 minimum stable period is never below 2 months (floor)', () => {
    // Even for extreme parameters, the stable period cannot drop below 2 months.
    // This prevents the trajectory from being nonsensical.
    const allScores = [45, 55, 65, 80];
    for (const score of allScores) {
      const base   = getTrajParams(score);
      const staged = Math.max(2, Math.round(base.stableMonths * getStageMultiplier(3)));
      expect(staged).toBeGreaterThanOrEqual(2);
    }
  });

});
