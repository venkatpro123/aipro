// actionCoverageAudit.ts
// Intelligence Upgrade 3 — v7.0
//
// Verifies the coverage of getAdaptiveRoleActions across all roleKeys in the
// MASTER_CAREER_INTELLIGENCE corpus (currently 371 roles × 4 brackets = 1,484
// role-bracket combinations).
//
// The spec claimed "371-role specificity" — this module makes that claim
// verifiable by running the actual check at runtime and exposing the result
// to the Transparency tab.
//
// DEFINITIONS:
//   "specific"     — the roleKey's prefix has a dedicated SeniorityActions pool
//                    in ROLE_SENIORITY_MAP (role-domain-specific content such as
//                    "Automate One Spreadsheet Workflow With Python" for fin_*)
//   "generic"      — the roleKey's prefix uses GENERIC_ACTIONS (bracket-
//                    differentiated but role-agnostic, using placeholders like
//                    "[your role]" and "your domain")
//   "distinct"     — the junior[0].title differs from the principal[0].title for
//                    the same prefix pool (true for ALL pools — both specific and
//                    generic have bracket-differentiated titles, but only specific
//                    pools have role-domain content)
//
// COVERAGE THRESHOLD:
//   The spec defines an 80% threshold for the "371-role specificity" claim to
//   be true. Coverage below 80% means the claim is false.
//
// AUDIT RESULT:
//   Computed once at module load, memoised as ACTION_COVERAGE_REPORT.
//   Re-computed by calling computeActionCoverage(force = true).

import { getAllOracleRoles } from '../data/oracleRoleIndex';
import {
  getAdaptiveRoleActions,
  BRACKET_ORDER,
  type SeniorityBracket,
} from './seniorityActionEngine';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RoleCoverageEntry {
  roleKey:    string;
  prefix:     string;
  isSpecific: boolean;
  /** Whether junior[0].title ≠ principal[0].title (bracket-differentiation check) */
  isBracketDistinct: boolean;
  /** For specific pools: whether the action titles reference domain-specific tools/concepts */
  hasDomainContent: boolean;
}

export interface ActionCoverageReport {
  /** Total role keys in MASTER_CAREER_INTELLIGENCE */
  totalRoles: number;
  /** Total role-bracket combinations (totalRoles × 4) */
  totalCombinations: number;
  /** Number of role keys with a specific (non-generic) action pool */
  specificRoles: number;
  /** Number of role keys falling back to GENERIC_ACTIONS */
  genericRoles: number;
  /** Specific role-bracket combinations */
  specificCombinations: number;
  /** Generic role-bracket combinations */
  genericCombinations: number;
  /** specificCombinations / totalCombinations × 100 (rounded) */
  coveragePct: number;
  /** True when coveragePct >= 80 — the threshold for the "371-role" claim to hold */
  claimIsValid: boolean;
  /** Prefixes that have specific action pools */
  coveredPrefixes: string[];
  /** Prefixes that fall back to generic (sorted by frequency descending) */
  uncoveredPrefixes: Array<{ prefix: string; roleCount: number }>;
  /** Per-role detail for diagnostic inspection */
  roleDetails: RoleCoverageEntry[];
  /** ISO timestamp of when this report was computed */
  computedAt: string;
}

// ── Domain-content markers: phrases that indicate specific (non-generic) content ──
// These keywords appear in specific pool action descriptions but NOT in GENERIC_ACTIONS.
// Used to verify that ROLE_SENIORITY_MAP entries are genuinely domain-specific.
const DOMAIN_CONTENT_MARKERS: Record<string, RegExp> = {
  sw:  /GitHub Copilot|Cursor|Claude API|DeepLearning|Karpathy|ADR|Copilot|qcon/i,
  fin: /pandas|Python|CFI|CFA|CFO|reconcili|financial model/i,
  hr:  /SHRM|aPHR|people analytics|Looker Studio|Workday|Eightfold/i,
  leg:  /Harvey|Casetext|CoCounsel|Spellbook|contract.*review|due diligence/i,
  hc:  /Abridge|Suki|Nuance|EMR|EHR|clinical|HIPAA|diagnostic/i,
  cnt: /Jasper|Copy\.ai|Perplexity|SEO|editorial|content strategy/i,
};

// ── Core audit function ────────────────────────────────────────────────────────

let _cachedReport: ActionCoverageReport | null = null;

/**
 * Compute action coverage across all MASTER_CAREER_INTELLIGENCE roles.
 * Memoised — pass force=true to re-run (e.g. after a live data update).
 */
export function computeActionCoverage(force = false): ActionCoverageReport {
  if (_cachedReport && !force) return _cachedReport;

  const allRoles = getAllOracleRoles();
  const totalRoles = allRoles.length;
  const BRACKETS: SeniorityBracket[] = ['junior', 'mid', 'senior', 'principal'];

  // Build per-role detail
  const roleDetails: RoleCoverageEntry[] = [];
  const prefixSpecificCount = new Map<string, number>();
  const prefixGenericCount  = new Map<string, number>();

  for (const role of allRoles) {
    const prefix = role.oracleKey.split('_')[0];

    // Test junior bracket first to check if result is specific
    const juniorResult    = getAdaptiveRoleActions(prefix, 'junior');
    const principalResult = getAdaptiveRoleActions(prefix, 'principal');

    // "Specific" = the returned action title is NOT the same as GENERIC_ACTIONS junior title.
    // The generic junior title is "Build One AI-Integrated Work Sample This Month".
    // Any specific pool will return a different title for the same bracket.
    const GENERIC_JUNIOR_TITLE  = 'Build One AI-Integrated Work Sample This Month';
    const GENERIC_PRINCIPAL_TITLE = 'Define Your Organization\'s AI Strategy for the C-Suite';

    const isSpecific =
      (juniorResult.actions[0]?.title ?? '') !== GENERIC_JUNIOR_TITLE;

    // Bracket-distinct = junior[0].title differs from principal[0].title
    const isBracketDistinct =
      (juniorResult.actions[0]?.title ?? '') !== (principalResult.actions[0]?.title ?? '');

    // Domain-content = description mentions domain-specific tools/concepts
    const domainMarker = DOMAIN_CONTENT_MARKERS[prefix];
    const juniorDesc = juniorResult.actions[0]?.description ?? '';
    const hasDomainContent = isSpecific && !!domainMarker && domainMarker.test(juniorDesc);

    roleDetails.push({ roleKey: role.oracleKey, prefix, isSpecific, isBracketDistinct, hasDomainContent });

    if (isSpecific) {
      prefixSpecificCount.set(prefix, (prefixSpecificCount.get(prefix) ?? 0) + 1);
    } else {
      prefixGenericCount.set(prefix, (prefixGenericCount.get(prefix) ?? 0) + 1);
    }
  }

  const specificRoles       = roleDetails.filter(r => r.isSpecific).length;
  const genericRoles        = totalRoles - specificRoles;
  const totalCombinations   = totalRoles * BRACKETS.length;
  const specificCombinations = specificRoles * BRACKETS.length;
  const genericCombinations  = genericRoles  * BRACKETS.length;
  const coveragePct          = totalCombinations > 0
    ? Math.round((specificCombinations / totalCombinations) * 100)
    : 0;

  const coveredPrefixes = Array.from(prefixSpecificCount.keys()).sort();
  const uncoveredPrefixes = Array.from(prefixGenericCount.entries())
    .map(([prefix, roleCount]) => ({ prefix, roleCount }))
    .sort((a, b) => b.roleCount - a.roleCount);

  _cachedReport = {
    totalRoles,
    totalCombinations,
    specificRoles,
    genericRoles,
    specificCombinations,
    genericCombinations,
    coveragePct,
    claimIsValid: coveragePct >= 80,
    coveredPrefixes,
    uncoveredPrefixes,
    roleDetails,
    computedAt: new Date().toISOString(),
  };

  return _cachedReport;
}

/**
 * Returns a concise one-line coverage label for display in the Transparency tab.
 * Separated from computeActionCoverage() so the UI doesn't need to import the full report.
 *
 * Example: "Action intelligence coverage: 140 of 1,484 role-bracket combinations
 *           have specific actions (9% coverage). 6 of 47 prefixes covered."
 */
export function getActionCoverageLabel(): string {
  const r = computeActionCoverage();
  return (
    `${r.specificCombinations.toLocaleString()} of ${r.totalCombinations.toLocaleString()} ` +
    `role-bracket combinations have specific actions (${r.coveragePct}% coverage). ` +
    `${r.coveredPrefixes.length} of ${r.coveredPrefixes.length + r.uncoveredPrefixes.length} role prefixes covered.`
  );
}

/**
 * Returns the top N uncovered prefixes by role count — used in the Transparency
 * tab to show which prefix groups would have the highest coverage impact if added.
 */
export function getTopUncoveredPrefixes(n = 5): Array<{ prefix: string; roleCount: number }> {
  return computeActionCoverage().uncoveredPrefixes.slice(0, n);
}
