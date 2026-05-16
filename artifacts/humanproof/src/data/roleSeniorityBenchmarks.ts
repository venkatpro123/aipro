// roleSeniorityBenchmarks.ts — v37.0 Phase 5
// Role-family-specific tenure thresholds for seniority bracket derivation.
//
// Problem: Using software engineering tenure benchmarks for all professions
// systematically misclassifies non-tech workers.
// - A physician at 8 years of total experience is a fully established specialist
//   (tech benchmark would call them "mid" at 7 years)
// - A 25-year tenured professor is "principal" in any reasonable definition;
//   the tech benchmark also gets this right but for the wrong reasons
// - A nurse at 5 years is solidly "senior" in clinical terms;
//   the tech benchmark would call them "mid"
//
// These thresholds represent median years at each level based on:
//   - Bureau of Labor Statistics Occupational Outlook data (2025)
//   - LinkedIn Workforce Insights by industry (2025)
//   - McKinsey Global Institute career mobility research (2024)
//   - Academic tenure clock research (AAUP 2025)

import type { SeniorityBracket } from '../services/seniorityActionEngine';

export type RoleFamilySeniorityKey =
  | 'tech'
  | 'data_science'
  | 'ml_ai'
  | 'product'
  | 'design'
  | 'finance'
  | 'accounting'
  | 'sales'
  | 'marketing'
  | 'hr_people'
  | 'consulting'
  | 'legal'
  | 'healthcare_clinical'
  | 'healthcare_admin'
  | 'pharma_biotech'
  | 'manufacturing'
  | 'energy'
  | 'construction'
  | 'retail'
  | 'logistics'
  | 'government'
  | 'education'
  | 'media_creative'
  | 'hospitality'
  | 'default';

export interface SeniorityThresholds {
  /** Career years at or above which this bracket applies */
  mid: number;
  senior: number;
  principal: number;
  /** Notes on what "principal" means in this profession */
  principalDescription: string;
}

// ROLE_SENIORITY_BENCHMARKS[family] → thresholds
// Brackets: junior = 0 to mid; mid = mid to senior; senior = senior to principal; principal = principal+
export const ROLE_SENIORITY_BENCHMARKS: Record<RoleFamilySeniorityKey, SeniorityThresholds> = {

  // Tech / Software Engineering — well-studied, standard benchmarks
  tech: {
    mid: 3,
    senior: 7,
    principal: 14,
    principalDescription: 'Staff/Principal/Distinguished Engineer leading cross-team technical direction',
  },

  data_science: {
    mid: 2,
    senior: 6,
    principal: 12,
    principalDescription: 'Principal Data Scientist or Head of Data Science leading methodology and org strategy',
  },

  ml_ai: {
    mid: 2,
    senior: 5,
    principal: 10,
    principalDescription: 'Research Scientist or Principal ML Engineer setting technical direction',
  },

  product: {
    mid: 2,
    senior: 6,
    principal: 12,
    principalDescription: 'Group PM, Director of Product, or VP Product owning a product line',
  },

  design: {
    mid: 2,
    senior: 6,
    principal: 12,
    principalDescription: 'Design Director or VP Design owning design system and org standards',
  },

  // Finance — longer credentialing paths; CFA takes 3+ years
  finance: {
    mid: 3,
    senior: 8,
    principal: 16,
    principalDescription: 'Managing Director, Partner, or CIO-level with portfolio authority',
  },

  accounting: {
    mid: 3,
    senior: 8,
    principal: 15,
    principalDescription: 'Controller, CFO, or Partner at public accounting firm',
  },

  // Sales — very performance-driven; seniority is more about quota size than years
  sales: {
    mid: 2,
    senior: 5,
    principal: 10,
    principalDescription: 'VP Sales, CRO, or Enterprise Sales Director with full territory P&L',
  },

  marketing: {
    mid: 2,
    senior: 6,
    principal: 12,
    principalDescription: 'VP Marketing, CMO, or Head of Growth with full-funnel ownership',
  },

  hr_people: {
    mid: 2,
    senior: 7,
    principal: 14,
    principalDescription: 'CHRO or CPO setting talent strategy at the organizational level',
  },

  consulting: {
    mid: 2,
    senior: 6,
    principal: 12,
    principalDescription: 'Partner or Principal owning client relationships and business development',
  },

  // Legal — bar admission + 3+ years before any meaningful seniority
  legal: {
    mid: 3,
    senior: 10,
    principal: 20,
    principalDescription: 'Partner at law firm, General Counsel, or Chief Legal Officer',
  },

  // Healthcare Clinical — NCLEX/residency adds years before clinical work begins
  // A nurse at year 5 is "senior" by clinical standards; physician residency ends ~year 7
  healthcare_clinical: {
    mid: 2,
    senior: 5,
    principal: 18,
    principalDescription: 'Chief of Medicine, Nurse Executive, or Department Chief with institutional authority',
  },

  healthcare_admin: {
    mid: 3,
    senior: 8,
    principal: 16,
    principalDescription: 'CEO/COO of health system or Hospital President',
  },

  // Pharma — PhD + postdoc paths mean seniority starts later
  pharma_biotech: {
    mid: 3,
    senior: 9,
    principal: 18,
    principalDescription: 'Chief Scientific Officer, VP R&D, or Distinguished Scientist',
  },

  // Manufacturing — line supervisors promoted within 3-5 years; plant managers at 12-15
  manufacturing: {
    mid: 3,
    senior: 8,
    principal: 16,
    principalDescription: 'VP Operations, Plant Director, or Chief Manufacturing Officer',
  },

  energy: {
    mid: 3,
    senior: 9,
    principal: 18,
    principalDescription: 'Chief Engineer, VP Engineering, or C-suite with asset P&L responsibility',
  },

  construction: {
    mid: 4,
    senior: 10,
    principal: 20,
    principalDescription: 'Project Director or VP Construction with program-level authority',
  },

  retail: {
    mid: 2,
    senior: 6,
    principal: 12,
    principalDescription: 'VP Merchandising, Regional Director, or Chief Commercial Officer',
  },

  logistics: {
    mid: 3,
    senior: 8,
    principal: 16,
    principalDescription: 'VP Supply Chain or Chief Logistics Officer with network-level authority',
  },

  // Government — tenure protection and civil service grades create longer timelines
  government: {
    mid: 3,
    senior: 10,
    principal: 20,
    principalDescription: 'Senior Executive Service (SES) or equivalent political/career appointee level',
  },

  // Education — tenure clock in academia takes 6-7 years; full professor at 15+
  education: {
    mid: 3,
    senior: 8,
    principal: 20,
    principalDescription: 'Full Professor with tenure, Dean, or Provost',
  },

  media_creative: {
    mid: 2,
    senior: 6,
    principal: 12,
    principalDescription: 'Executive Editor, Creative Director, or VP Content with editorial authority',
  },

  hospitality: {
    mid: 3,
    senior: 8,
    principal: 16,
    principalDescription: 'General Manager of luxury property or VP Operations of hotel group',
  },

  // Fallback — mirrors tech benchmarks as the platform's historical default
  default: {
    mid: 3,
    senior: 7,
    principal: 14,
    principalDescription: 'Senior leadership with organizational-level authority',
  },
};

// ─── Public API ───────────────────────────────────────────────────────────────

/** Get seniority thresholds for a role family. Falls back to 'default' if unmapped. */
export function getSeniorityThresholds(roleFamily: string): SeniorityThresholds {
  return ROLE_SENIORITY_BENCHMARKS[roleFamily as RoleFamilySeniorityKey]
    ?? ROLE_SENIORITY_BENCHMARKS.default;
}

/**
 * Derive seniority bracket using role-family-specific thresholds.
 * If roleFamily is not provided, falls back to 'default' (tech-calibrated) thresholds.
 */
export function deriveSeniorityBracketForFamily(
  careerYears: number,
  roleFamily: string | null | undefined,
): SeniorityBracket {
  const thresholds = getSeniorityThresholds(roleFamily ?? 'default');
  if (careerYears >= thresholds.principal) return 'principal';
  if (careerYears >= thresholds.senior) return 'senior';
  if (careerYears >= thresholds.mid) return 'mid';
  return 'junior';
}

/** Map canonical role keys to their seniority family key */
const ROLE_KEY_TO_SENIORITY_FAMILY: Record<string, RoleFamilySeniorityKey> = {
  // Tech
  swe: 'tech', senior_swe: 'tech', staff_engineer: 'tech', frontend_engineer: 'tech',
  backend_engineer: 'tech', fullstack_engineer: 'tech', devops_engineer: 'tech',
  cloud_architect: 'tech', sre: 'tech', embedded_engineer: 'tech',
  // Data / ML
  data_scientist: 'data_science', analytics_engineer: 'data_science',
  business_intelligence_analyst: 'data_science',
  ml_engineer: 'ml_ai', ml_ops_engineer: 'ml_ai',
  // Product / Design
  product_manager: 'product', product_director: 'product', vp_product: 'product',
  ux_designer: 'design', product_designer: 'design', creative_director: 'design',
  // Finance / Accounting
  financial_analyst: 'finance', investment_banker: 'finance', portfolio_manager: 'finance',
  risk_analyst: 'finance', actuarial_analyst: 'finance', cfo: 'finance',
  auditor_cpa: 'accounting', controller: 'accounting', tax_specialist: 'accounting',
  // Sales / Marketing / CX
  account_executive: 'sales', enterprise_ae: 'sales', vp_sales: 'sales',
  digital_marketing_manager: 'marketing', brand_manager: 'marketing', chief_marketing_officer: 'marketing',
  customer_success_manager: 'sales', hr_generalist: 'hr_people', hr_director: 'hr_people',
  // Consulting
  management_consultant: 'consulting', strategy_consultant: 'consulting',
  // Legal
  attorney_general_practice: 'legal', corporate_attorney: 'legal', general_counsel: 'legal',
  paralegal: 'legal',
  // Healthcare
  registered_nurse: 'healthcare_clinical', nurse_practitioner: 'healthcare_clinical',
  physician_general_practitioner: 'healthcare_clinical', physician_assistant: 'healthcare_clinical',
  hospital_administrator: 'healthcare_admin', healthcare_it_analyst: 'healthcare_admin',
  // Pharma
  pharmaceutical_scientist: 'pharma_biotech', clinical_trial_manager: 'pharma_biotech',
  regulatory_affairs_specialist_pharma: 'pharma_biotech',
  // Manufacturing / Energy / Construction
  manufacturing_engineer: 'manufacturing', process_engineer: 'manufacturing',
  lean_six_sigma_specialist: 'manufacturing', plant_manager: 'manufacturing',
  petroleum_engineer: 'energy', renewable_energy_engineer: 'energy', sustainability_manager: 'energy',
  civil_engineer: 'construction', structural_engineer: 'construction',
  construction_project_manager: 'construction',
  // Retail / Logistics
  retail_store_manager: 'retail', e_commerce_manager: 'retail',
  logistics_operations_manager: 'logistics', customs_broker: 'logistics',
  // Government / Education
  government_policy_analyst: 'government', municipal_administrator: 'government',
  university_professor: 'education', K12_teacher: 'education', instructional_designer: 'education',
  // Media / Hospitality
  journalist_reporter: 'media_creative', game_designer: 'media_creative',
  hotel_general_manager: 'hospitality', executive_chef: 'hospitality',
};

/** Get the seniority family key for a canonical role key. Returns 'default' if unmapped. */
export function getSeniorityFamilyForRole(roleKey: string): RoleFamilySeniorityKey {
  return ROLE_KEY_TO_SENIORITY_FAMILY[roleKey] ?? 'default';
}
