// parentSubsidiaryPropagation.ts — Parent-to-subsidiary layoff signal propagation engine.
//
// ANSWERS: When a parent US tech company announces layoffs, how much risk does
// that signal propagate to its subsidiary offices in different regions, and how
// differently does it propagate by office function?
//
// KEY INSIGHT: Three employees at the same parent company face fundamentally
// different propagation risk:
//
//   Google Sunnyvale → announces 12,000 layoffs
//
//   Google Hyderabad SWE (engineering_hub):
//     propagationMultiplier=0.52 × dependenceScore=0.72 → propagationFactor=0.37
//     Lag: 6–12 months. Protected by: core product ownership, cost-efficiency.
//     Reason: engineering hubs require project cancellations to cut, not just
//     efficiency targets. Historical: Google Hyderabad had minimal cuts in Jan 2023.
//
//   Google London PM (mixed/regional_revenue component):
//     propagationMultiplier=0.38 × dependenceScore=0.55 → propagationFactor=0.21
//     Lag: 8–18 months. Protected by: EMEA revenue dependency, GDPR compliance,
//     DeepMind co-location. Reason: London kills EMEA deals if cut mid-cycle.
//
//   Google Singapore Ops Analyst (regional_operations):
//     propagationMultiplier=0.66 × dependenceScore=0.62 → propagationFactor=0.41
//     Lag: 3–9 months. Vulnerable to: operations consolidation into Hyderabad.
//     Reason: Singapore operations are consolidatable; high cost relative to India.
//
// DESIGN: Pure deterministic computation — no API calls. All data derived from
// parentSubsidiaryRegistry.ts, employmentProtectionLaw.ts, and scoring inputs.
//
// LABELED: ESTIMATED — propagation profiles derived from documented 2022–2026
// restructuring patterns at major tech and finance companies.

import {
  findParentProfile,
  findSubsidiaryProfile,
  refineOfficeFunctionFromRole,
  OFFICE_FUNCTION_PROPAGATION,
  type OfficeFunction,
  type SubsidiaryProfile,
  type ParentCompanyProfile,
} from '../data/parentSubsidiaryRegistry';
import {
  getEmploymentProtectionRegime,
  computeEffectiveProtectionDays,
} from '../data/employmentProtectionLaw';

// ── Output types ──────────────────────────────────────────────────────────────

export interface PropagationRiskLevel {
  level: 'negligible' | 'low' | 'moderate' | 'elevated' | 'high';
  color: 'green' | 'emerald' | 'yellow' | 'orange' | 'red';
}

export interface ParentPropagationResult {
  /** The parent company detected */
  parentName: string;
  parentCountry: string;

  /** The office function classification applied */
  officeFunction: OfficeFunction;
  officeFunctionLabel: string;

  /** Was the function refined from the role title? */
  functionRefinedFromRole: boolean;

  /** Entity independence level */
  independence: SubsidiaryProfile['independence'];

  /** dependenceScore × functionMultiplier — the fraction of parent risk transmitted */
  propagationFactor: number;   // 0–1

  /** How long after parent announcement before subsidiary action likely */
  lagMonths: { min: number; max: number };

  /** Qualitative propagation risk level */
  propagationRisk: PropagationRiskLevel;

  /** Key protection factors for THIS specific location+function */
  protectionFactors: string[];

  /** Key vulnerability factors for THIS specific location+function */
  vulnerabilityFactors: string[];

  /** Employment law protection: how long after cut announcement to last day */
  legalProtectionDays: { min: number; max: number } | null;

  /** Combined narrative explaining the propagation path */
  propagationNarrative: string;

  /** Function-specific narrative from the office function profile */
  functionNarrative: string;

  /** Combined effective runway: lag + legal protection window */
  effectiveRunwayMonths: { min: number; max: number };

  /** Priority actions for the worker given this propagation profile */
  priorityActions: string[];

  readonly labeledAs: 'ESTIMATED';
}

// ── Office function display labels ────────────────────────────────────────────

const FUNCTION_LABELS: Record<OfficeFunction, string> = {
  engineering_hub:    'Engineering / GCC Hub',
  engineering_rd:     'R&D Lab',
  regional_revenue:   'Regional Revenue / Sales',
  regional_operations:'Regional Operations',
  shared_services:    'Shared Services',
  support_operations: 'Customer Support Operations',
  eu_hq:              'EU Headquarters',
  sales_office:       'Sales Office',
  mixed:              'Mixed Function',
};

// ── Risk level thresholds ─────────────────────────────────────────────────────

function classifyPropagationRisk(propagationFactor: number): PropagationRiskLevel {
  if (propagationFactor >= 0.65) return { level: 'high',        color: 'red' };
  if (propagationFactor >= 0.50) return { level: 'elevated',    color: 'orange' };
  if (propagationFactor >= 0.35) return { level: 'moderate',    color: 'yellow' };
  if (propagationFactor >= 0.20) return { level: 'low',         color: 'emerald' };
  return                                 { level: 'negligible',  color: 'green' };
}

// ── Priority actions by function ──────────────────────────────────────────────

function buildPriorityActions(
  fn: OfficeFunction,
  lagMin: number,
  lagMax: number,
  legalDays: { min: number; max: number } | null,
  parentName: string,
): string[] {
  const lagLabel = lagMin === lagMax
    ? `${lagMin} months`
    : `${lagMin}–${lagMax} months`;

  const actions: string[] = [
    `Monitor ${parentName} earnings calls and press releases weekly — look for "headcount efficiency", "India operations", "workforce optimization" signals`,
  ];

  if (fn === 'engineering_hub' || fn === 'engineering_rd') {
    actions.push(
      `Track your project's roadmap status at parent HQ — project cancellation is the primary trigger for GCC engineering cuts`,
      `Build external pipeline now: your ${lagLabel} lag window is your runway — do not wait for official announcement`,
      `Pursue internal transfer to parent HQ or product team — this extends protection significantly`,
    );
  } else if (fn === 'regional_revenue' || fn === 'sales_office') {
    actions.push(
      `Document your personal quota attainment and deals in pipeline — revenue contribution is your primary protection`,
      `If regional revenue is declining, your risk is higher than parent-propagation alone — treat as combined signal`,
      `Strengthen client relationships now — your relationship network is a portable asset`,
    );
  } else if (fn === 'regional_operations') {
    actions.push(
      `Identify if your role is consolidatable to a cheaper hub — if yes, you have ${lagLabel} before consolidation is likely`,
      `Develop skills that differentiate your local value beyond cost arbitrage: market expertise, language, regulatory knowledge`,
      `Build external pipeline in your local market — ${legalDays ? `legal protection window is ${Math.round(legalDays.min / 7)}–${Math.round(legalDays.max / 7)} weeks from announcement` : 'start now'}`,
    );
  } else if (fn === 'shared_services') {
    actions.push(
      `HIGH URGENCY: shared services are cut first. Begin external job search immediately — do not wait`,
      `Build documentation of cross-functional knowledge that demonstrates irreplaceability beyond title`,
      legalDays ? `Your legal protection window is ${Math.round(legalDays.min / 7)}–${Math.round(legalDays.max / 7)} weeks after announcement — use it fully` : 'Secure written severance terms before signing anything',
    );
  } else {
    actions.push(
      `Begin external pipeline development — ${lagLabel} is your approximate lag from parent announcement`,
      legalDays ? `Legal protection window: ${Math.round(legalDays.min / 7)}–${Math.round(legalDays.max / 7)} weeks from announcement to last day` : 'Document your severance terms clearly',
    );
  }

  return actions;
}

// ── Propagation narrative builder ─────────────────────────────────────────────

function buildPropagationNarrative(
  parentName: string,
  parentCountry: string,
  subsidiary: SubsidiaryProfile,
  fn: OfficeFunction,
  propagationFactor: number,
  lagMin: number,
  lagMax: number,
  region: string,
): string {
  const fnLabel = FUNCTION_LABELS[fn];
  const riskLevel = classifyPropagationRisk(propagationFactor);
  const lagStr = lagMin === lagMax ? `${lagMin} months` : `${lagMin}–${lagMax} months`;

  const independenceNote =
    subsidiary.independence === 'captive'        ? 'wholly captive (parent decisions are binding)' :
    subsidiary.independence === 'semi_independent'? 'semi-independent (local leadership, some autonomy)' :
    'largely independent (own P&L and governance)';

  return (
    `${parentName} (${parentCountry}) → ${region} ${fnLabel}: propagation factor ${(propagationFactor * 100).toFixed(0)}% (${riskLevel.level} risk). ` +
    `Entity is ${independenceNote}. ` +
    `ESTIMATED ${lagStr} from parent announcement to subsidiary action — ` +
    `driven by function type (${fnLabel}) and dependence score (${subsidiary.dependenceScore.toFixed(2)}). ` +
    `Protection factors for ${fnLabel} at ${parentName}: ${subsidiary.protectionFactors.slice(0, 1).join('; ') || 'none documented'}.`
  );
}

// ── Core computation ──────────────────────────────────────────────────────────

export interface ParentPropagationInputs {
  companyName: string;
  region: string;                   // ISO country code
  roleTitle?: string | null;
  city?: string | null;             // user's city for subsidiary matching
  employeeCount?: number | null;
}

export function computeParentPropagation(
  inputs: ParentPropagationInputs,
): ParentPropagationResult | null {
  const parentProfile = findParentProfile(inputs.companyName);
  if (!parentProfile) return null;

  const subsidiaryProfile = findSubsidiaryProfile(parentProfile, inputs.region, inputs.city);
  if (!subsidiaryProfile) return null;

  // Refine office function from role title if possible
  const baseFunction = subsidiaryProfile.officeFunction;
  const refinedFunction = refineOfficeFunctionFromRole(baseFunction, inputs.roleTitle);
  const functionRefined = refinedFunction !== baseFunction;

  const fnProfile = OFFICE_FUNCTION_PROPAGATION[refinedFunction];

  // propagationFactor = dependenceScore × functionMultiplier
  const propagationFactor = Math.min(0.95, subsidiaryProfile.dependenceScore * fnProfile.propagationMultiplier);

  // Lag months (use refined function profile)
  const lagMonths = { min: fnProfile.lagMonthsMin, max: fnProfile.lagMonthsMax };

  // Legal protection: how long after announcement to last day
  const regime = getEmploymentProtectionRegime(inputs.region);
  const legalProtectionDays = regime
    ? computeEffectiveProtectionDays(regime, inputs.employeeCount)
    : null;

  // Effective runway = lag + legal protection
  const legalMonthsMin = legalProtectionDays ? Math.round(legalProtectionDays.min / 30) : 0;
  const legalMonthsMax = legalProtectionDays ? Math.round(legalProtectionDays.max / 30) : 0;
  const effectiveRunwayMonths = {
    min: lagMonths.min + legalMonthsMin,
    max: lagMonths.max + legalMonthsMax,
  };

  const propagationRisk = classifyPropagationRisk(propagationFactor);

  const priorityActions = buildPriorityActions(
    refinedFunction,
    lagMonths.min,
    lagMonths.max,
    legalProtectionDays,
    parentProfile.parentName,
  );

  const propagationNarrative = buildPropagationNarrative(
    parentProfile.parentName,
    parentProfile.parentCountry,
    subsidiaryProfile,
    refinedFunction,
    propagationFactor,
    lagMonths.min,
    lagMonths.max,
    inputs.region,
  );

  return {
    parentName: parentProfile.parentName,
    parentCountry: parentProfile.parentCountry,
    officeFunction: refinedFunction,
    officeFunctionLabel: FUNCTION_LABELS[refinedFunction],
    functionRefinedFromRole: functionRefined,
    independence: subsidiaryProfile.independence,
    propagationFactor,
    lagMonths,
    propagationRisk,
    protectionFactors: subsidiaryProfile.protectionFactors as string[],
    vulnerabilityFactors: subsidiaryProfile.vulnerabilityFactors as string[],
    legalProtectionDays,
    propagationNarrative,
    functionNarrative: fnProfile.narrative,
    effectiveRunwayMonths,
    priorityActions,
    labeledAs: 'ESTIMATED',
  };
}
