// actionCoverageAudit.test.ts
// Intelligence Upgrade 3 — v7.0
//
// Verifies the "371-role, 4-bracket action pool" coverage claim.
// Runs 1,484 calls (371 roles × 4 brackets) and reports exact coverage.
//
// SPEC REQUIREMENTS:
//   1. Every call returns at least 1 action (never empty).
//   2. Junior and principal actions are categorically different (different titles).
//   3. Coverage percentage displayed accurately in the Transparency tab.
//   4. If coverage < 80%: the "371-role specificity" claim is documented as false.

import { describe, it, expect, beforeAll } from 'vitest';
import {
  computeActionCoverage,
  getActionCoverageLabel,
  type ActionCoverageReport,
} from '../../services/actionCoverageAudit';
import { getAllOracleRoles } from '../../data/oracleRoleIndex';
import { getAdaptiveRoleActions, BRACKET_ORDER } from '../../services/seniorityActionEngine';
import { ensureCareerIntelligenceLoaded } from '../../data/intelligence';

let report: ActionCoverageReport;

beforeAll(async () => {
  await ensureCareerIntelligenceLoaded();
  report = computeActionCoverage(true); // force fresh computation after corpus loaded
});

// ── Test 1: every role-bracket call returns ≥ 1 action ────────────────────────

describe('getAdaptiveRoleActions — completeness', () => {

  it('returns ≥ 1 action for every role × bracket combination (1,484 calls)', () => {
    const allRoles = getAllOracleRoles();
    const failures: string[] = [];

    for (const role of allRoles) {
      const prefix = role.oracleKey.split('_')[0];
      for (const bracket of BRACKET_ORDER) {
        const { actions } = getAdaptiveRoleActions(prefix, bracket);
        if (!actions || actions.length === 0) {
          failures.push(`${role.oracleKey} / ${bracket}: returned 0 actions`);
        }
        if (actions[0] && !actions[0].title) {
          failures.push(`${role.oracleKey} / ${bracket}: action[0] has no title`);
        }
      }
    }

    expect(failures).toHaveLength(0);
  });

});

// ── Test 2: junior ≠ principal for every prefix pool ─────────────────────────

describe('getAdaptiveRoleActions — bracket differentiation', () => {

  it('junior[0].title differs from principal[0].title for every role', () => {
    const allRoles = getAllOracleRoles();
    const sameContentRoles: string[] = [];

    for (const role of allRoles) {
      const prefix = role.oracleKey.split('_')[0];
      const junior    = getAdaptiveRoleActions(prefix, 'junior').actions[0];
      const principal = getAdaptiveRoleActions(prefix, 'principal').actions[0];
      if (junior?.title && principal?.title && junior.title === principal.title) {
        sameContentRoles.push(`${role.oracleKey}: junior and principal both have "${junior.title}"`);
      }
    }

    // Document but do not fail — generic pool has distinct titles so this should be empty.
    // If any role-bracket pair returns identical titles, it is a content regression.
    expect(sameContentRoles).toHaveLength(0);
  });

  it('each specific pool has categorically different actions between junior and principal', () => {
    const SPECIFIC_PREFIXES = ['sw', 'fin', 'hr', 'leg', 'hc', 'cnt'];
    const violations: string[] = [];

    for (const prefix of SPECIFIC_PREFIXES) {
      const junior    = getAdaptiveRoleActions(prefix, 'junior').actions[0];
      const principal = getAdaptiveRoleActions(prefix, 'principal').actions[0];
      if (junior?.title === principal?.title) {
        violations.push(`${prefix}: junior and principal titles are identical ("${junior?.title}")`);
      }
      // Also check that the descriptions differ (not just title swaps)
      if (junior?.description === principal?.description) {
        violations.push(`${prefix}: junior and principal descriptions are identical`);
      }
    }

    expect(violations).toHaveLength(0);
  });

});

// ── Test 3: coverage report accuracy ─────────────────────────────────────────

describe('computeActionCoverage — report integrity', () => {

  it('totalCombinations = totalRoles × 4', () => {
    expect(report.totalCombinations).toBe(report.totalRoles * 4);
  });

  it('specificCombinations + genericCombinations = totalCombinations', () => {
    expect(report.specificCombinations + report.genericCombinations).toBe(report.totalCombinations);
  });

  it('specificRoles + genericRoles = totalRoles', () => {
    expect(report.specificRoles + report.genericRoles).toBe(report.totalRoles);
  });

  it('coveragePct = round(specificCombinations / totalCombinations × 100)', () => {
    const expected = Math.round((report.specificCombinations / report.totalCombinations) * 100);
    expect(report.coveragePct).toBe(expected);
  });

  it('documents the total role count (verifies the 371 claim)', () => {
    // Log the actual count so the claim is verifiable in the test output.
    console.info(`[CoverageAudit] Total roles in corpus: ${report.totalRoles}`);
    console.info(`[CoverageAudit] Claimed: 371`);
    if (report.totalRoles !== 371) {
      console.warn(
        `[CoverageAudit] Actual role count (${report.totalRoles}) differs from ` +
        `the claimed 371. App.tsx and oracleRoleIndex.ts comments should be updated.`
      );
    }
    expect(report.totalRoles).toBeGreaterThan(0);
  });

});

// ── Test 4: coverage threshold — the 80% claim ────────────────────────────────

describe('computeActionCoverage — 80% threshold evaluation', () => {

  it('documents whether the "371-role specificity" claim is valid', () => {
    // This test LOGS the finding; it does NOT assert coverage >= 80%
    // because the finding may be that the claim is false — which is the
    // correct honest result if coverage is below 80%.
    console.info(
      `[CoverageAudit] Coverage: ${report.specificRoles} of ${report.totalRoles} roles ` +
      `have specific actions (${report.coveragePct}%).`
    );
    console.info(
      `[CoverageAudit] Specific role-bracket combinations: ` +
      `${report.specificCombinations} of ${report.totalCombinations}.`
    );
    console.info(
      `[CoverageAudit] Covered prefixes: ${report.coveredPrefixes.join(', ')}`
    );
    console.info(
      `[CoverageAudit] Top 5 uncovered prefixes by role count: ` +
      report.uncoveredPrefixes.slice(0, 5).map(p => `${p.prefix}(${p.roleCount})`).join(', ')
    );

    if (!report.claimIsValid) {
      console.warn(
        `[CoverageAudit] FINDING: Coverage (${report.coveragePct}%) is below the 80% ` +
        `threshold. The "371-role action pool specificity" claim is FALSE. ` +
        `Only ${report.coveredPrefixes.length} role-prefix groups have domain-specific ` +
        `actions; the remaining ${report.genericRoles} roles (${100 - report.coveragePct}%) ` +
        `use GENERIC_ACTIONS. This is documented in the Transparency tab.`
      );
    } else {
      console.info(
        `[CoverageAudit] Coverage (${report.coveragePct}%) meets the 80% threshold. ` +
        `The claim is valid.`
      );
    }

    // The test always passes — it is a documentation test, not an assertion test.
    // The coverage number is surfaced in the UI; making this test fail would hide
    // the finding rather than expose it. Change this `toBeGreaterThan(0)` to
    // `toBeGreaterThanOrEqual(80)` ONLY once coverage actually exceeds 80%.
    expect(report.coveragePct).toBeGreaterThan(0);
  });

  it('getActionCoverageLabel returns a parseable string', () => {
    const label = getActionCoverageLabel();
    expect(typeof label).toBe('string');
    expect(label.length).toBeGreaterThan(20);
    // Must contain a percentage
    expect(label).toMatch(/\d+%/);
    console.info(`[CoverageAudit] Transparency label: "${label}"`);
  });

});

// ── Test 5: top gap-closing targets ──────────────────────────────────────────

describe('computeActionCoverage — coverage gap analysis', () => {

  it('identifies the top 5 prefixes that would most improve coverage if added', () => {
    const gaps = report.uncoveredPrefixes.slice(0, 5);
    if (gaps.length === 0) {
      console.info('[CoverageAudit] All prefixes are covered — no gaps to report.');
    } else {
      const potentialGain = gaps.reduce((s, g) => s + g.roleCount, 0) * 4;
      const currentSpecific = report.specificCombinations;
      const potentialCoverage = Math.round(
        ((currentSpecific + potentialGain) / report.totalCombinations) * 100
      );
      console.info(
        `[CoverageAudit] Adding specific pools for the top 5 prefixes ` +
        `(${gaps.map(g => `${g.prefix}×${g.roleCount}`).join(', ')}) ` +
        `would increase coverage from ${report.coveragePct}% to ~${potentialCoverage}%.`
      );
    }
    // Test passes regardless — this is a diagnostic output
    expect(gaps.length).toBeGreaterThanOrEqual(0);
  });

});
