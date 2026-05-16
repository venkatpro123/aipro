// roleIndustryRiskMatrix.ts — v37.0
//
// Role × Industry composite risk modifiers.
//
// The core insight: "ML Engineer at a media company" faces structurally different
// displacement risk from "ML Engineer at an AI-infrastructure company" — same role,
// very different risk profile. This matrix captures that differentiation.
//
// Modifier range: -15 (strongly protected) to +20 (strongly elevated risk).
// A modifier of 0 means the role's baseline risk is appropriate for this industry.
//
// Calibration status: developer-estimated from sector trends 2022–2026.
// Requires same-role, cross-industry layoff outcome data to calibrate empirically.

export type RoleCategory =
  | 'tech'
  | 'healthcare'
  | 'finance'
  | 'legal'
  | 'sales_ops'
  | 'creative'
  | 'service'
  | 'physical_labor'
  | 'education'
  | 'government';

export interface RoleIndustryComposite {
  roleGroup: string;
  industryKey: string;
  riskModifier: number;           // -15 to +20 delta on score
  roleCategory: RoleCategory;
  compositeLabel: string;         // e.g. "ML Engineer in AI-first company"
  rationale: string;              // one-sentence explanation
  readonly calibrationStatus: 'developer_estimate';
}

// ── Role → Category Mapping ───────────────────────────────────────────────────

const TECH_GROUPS = new Set([
  'swe', 'swe_backend', 'swe_frontend', 'swe_fullstack', 'swe_mobile',
  'ml_engineer', 'ai_engineer', 'data_scientist', 'data_engineer', 'data_analyst',
  'nlp_engineer', 'cv_engineer', 'llm_engineer', 'devops', 'platform_engineer',
  'cloud_architect', 'qa_engineer', 'security_engineer', 'embedded_engineer',
  'eng_manager', 'tech_lead', 'principal_engineer', 'solution_architect',
  'support_engineer', 'bpo_associate',
  // Phase 1B product/design — tech-adjacent
  'product_manager', 'product_owner', 'product_analyst', 'associate_pm',
  'ux_researcher', 'ui_designer', 'product_designer', 'brand_designer',
  'ux_writer', 'design_director',
  // Phase 1B data/analytics
  'analytics_engineer', 'ml_ops_engineer', 'ai_product_manager',
  'bi_analyst', 'data_governance_analyst', 'quantitative_analyst', 'research_scientist',
  // Phase 1B engineering leadership
  'cto', 'vp_engineering', 'director_engineering', 'staff_engineer', 'distinguished_engineer',
]);

const FINANCE_GROUPS = new Set([
  'financial_analyst', 'senior_financial_analyst', 'fp_a_analyst',
  'investment_banker', 'equity_researcher', 'portfolio_manager',
  'risk_analyst', 'compliance_officer', 'auditor_cpa',
  'controller', 'cfo', 'treasury_analyst', 'tax_specialist', 'actuarial_analyst',
]);

const SALES_OPS_GROUPS = new Set([
  'account_executive', 'senior_account_executive', 'enterprise_ae',
  'sales_development_rep', 'business_development_manager',
  'customer_success_manager', 'sales_engineer',
  'vp_sales', 'chief_revenue_officer',
  'sales_operations_analyst', 'revenue_operations_manager', 'partnership_manager',
]);

const SERVICE_GROUPS = new Set([
  'hr_generalist', 'hr_business_partner', 'hr_director',
  'talent_acquisition_specialist', 'recruiting_manager', 'executive_recruiter',
  'compensation_benefits_analyst', 'learning_development_manager',
  'dei_program_manager', 'chief_people_officer',
  'professional_services',
]);

function deriveRoleCategory(roleGroup: string): RoleCategory {
  if (TECH_GROUPS.has(roleGroup)) return 'tech';
  if (FINANCE_GROUPS.has(roleGroup)) return 'finance';
  if (SALES_OPS_GROUPS.has(roleGroup)) return 'sales_ops';
  if (SERVICE_GROUPS.has(roleGroup)) return 'service';
  return 'tech'; // default — most platform users are in tech-adjacent roles
}

// ── Industry Key Normalization ────────────────────────────────────────────────

function normalizeIndustry(raw: string): string {
  const lc = raw.toLowerCase().trim();
  if (lc.includes('ai') || lc.includes('artificial intelligence') || lc === 'ai_infrastructure') return 'ai_infrastructure';
  if (lc.includes('software') || lc === 'technology' || lc === 'tech' || lc === 'it_software' || lc === 'saas') return 'technology';
  if (lc.includes('bank') || lc === 'financial_services' || lc === 'finance') return 'banking_finance';
  if (lc.includes('fintech') || lc === 'financial_technology') return 'fintech';
  if (lc.includes('health') || lc.includes('medical') || lc.includes('hospital')) return 'healthcare';
  if (lc.includes('pharma') || lc.includes('biotech') || lc.includes('life science')) return 'pharma_biotech';
  if (lc.includes('media') || lc.includes('entertainment') || lc.includes('publishing')) return 'media_entertainment';
  if (lc.includes('retail') || lc.includes('e-commerce') || lc.includes('ecommerce')) return 'retail_ecommerce';
  if (lc.includes('manufactur') || lc.includes('industrial')) return 'manufacturing';
  if (lc.includes('energy') || lc.includes('oil') || lc.includes('gas') || lc.includes('utility')) return 'energy';
  if (lc.includes('consult') || lc.includes('professional service')) return 'consulting';
  if (lc.includes('bpo') || lc.includes('ites') || lc.includes('outsourc')) return 'bpo_ites';
  if (lc.includes('telecom') || lc.includes('telco') || lc.includes('network')) return 'telecom';
  if (lc.includes('govern') || lc.includes('public sector') || lc.includes('federal')) return 'government';
  if (lc.includes('educ') || lc.includes('university') || lc.includes('school')) return 'education';
  if (lc.includes('real estate') || lc.includes('realestate') || lc.includes('proptech')) return 'real_estate';
  if (lc.includes('construction') || lc.includes('engineering services')) return 'construction';
  if (lc.includes('auto') || lc.includes('vehicle') || lc.includes('mobility')) return 'automotive';
  return 'technology'; // default
}

// ── Risk Modifier Matrix ──────────────────────────────────────────────────────
//
// Structure: [industryKey]: modifier
// Outer key: role group (or role group prefix for broad categories)
// Missing combos resolve to 0 (no adjustment from role baseline).

type IndustryModifiers = Partial<Record<string, number>>;

const ROLE_INDUSTRY_MODIFIERS: Record<string, IndustryModifiers> = {

  // ── ML / AI roles ──────────────────────────────────────────────────────────
  ml_engineer: {
    ai_infrastructure:   -12, // Core value — AI-first companies protect ML talent
    technology:           -5, // Tech companies still growing ML orgs
    fintech:              -3, // ML valued for fraud, risk modelling
    banking_finance:       5, // Legacy banks cutting ML experiments
    media_entertainment:  10, // Media AI ROI unclear; experimentation under pressure
    retail_ecommerce:      3, // Useful but discretionary
    manufacturing:         3, // Automation AI valued but slow adoption
    bpo_ites:             15, // ML directly automates BPO work — high displacement risk
    consulting:           -2, // AI consulting growing
    healthcare:           -4, // Clinical ML growing, regulatory moat
  },

  ai_engineer: {
    ai_infrastructure:   -15, // Core headcount — never on the cut list
    technology:           -8, // Central to product roadmaps
    fintech:              -5, // AI fraud detection, credit modelling
    banking_finance:       3, // Mixed adoption
    media_entertainment:   8, // AI content risk is also PERSONAL displacement risk
    bpo_ites:             18, // AI engineers build tools that replace BPO workers
    manufacturing:         0,
    healthcare:           -6, // AI diagnostics growing
    retail_ecommerce:     -2, // Recommendation, logistics AI growing
  },

  llm_engineer: {
    ai_infrastructure:   -15, // Central product capability
    technology:           -8, // High demand across product orgs
    fintech:              -4,
    consulting:           -5, // LLM consulting engagements growing
    media_entertainment:  12, // Builds tools that automate journalism, creative work
    bpo_ites:             20, // Automates call centre / document processing — high personal irony risk
    banking_finance:       2,
    healthcare:           -3,
    retail_ecommerce:     -3,
  },

  nlp_engineer: {
    ai_infrastructure:   -12,
    technology:           -6,
    bpo_ites:             18,
    media_entertainment:  10,
    fintech:              -4,
    healthcare:           -5, // Clinical NLP, EHR extraction
    banking_finance:       3,
  },

  cv_engineer: {
    ai_infrastructure:   -10,
    manufacturing:         -8, // Computer vision in quality control — growing
    automotive:           -10, // ADAS, self-driving
    healthcare:            -8, // Radiology AI, pathology
    technology:            -5,
    retail_ecommerce:      -3, // Visual search
    media_entertainment:    8, // Builds automation for visual content
  },

  // ── Core SWE roles ─────────────────────────────────────────────────────────
  swe: {
    ai_infrastructure:   -10, // AI-first companies need SWE infrastructure
    technology:           -3, // Healthy but crowded
    fintech:              -5, // Core product need
    banking_finance:       3, // Automation and offshoring pressure
    bpo_ites:             12, // IT services SWE under commoditisation pressure
    media_entertainment:   8, // Legacy media cutting tech
    retail_ecommerce:      0,
    manufacturing:         5, // Software is secondary to manufacturing
    consulting:            0,
    healthcare:            -2, // Digital health growing
    government:            5,  // Slow hiring cycles, budget constraints
    telecom:               5,  // Cost-cutting era
  },

  swe_backend: {
    ai_infrastructure:   -10,
    technology:           -4,
    fintech:              -6, // Backend is core to fintech
    banking_finance:       4,
    bpo_ites:             12,
    media_entertainment:   6,
  },

  swe_frontend: {
    ai_infrastructure:    -6,
    technology:            -2,
    fintech:               -3,
    banking_finance:        5,
    bpo_ites:              10,
    media_entertainment:    5,
    retail_ecommerce:       -2,
  },

  swe_fullstack: {
    ai_infrastructure:    -8,
    technology:            -3,
    fintech:               -4,
    banking_finance:        4,
    bpo_ites:              10,
    media_entertainment:    6,
    retail_ecommerce:       -1,
  },

  swe_mobile: {
    ai_infrastructure:    -5,
    technology:            -2,
    fintech:               -5, // Mobile is core for consumer fintech
    banking_finance:        5,
    media_entertainment:    3,
    retail_ecommerce:       -3,
    healthcare:            -3, // Health apps growing
  },

  // ── Data roles ─────────────────────────────────────────────────────────────
  data_scientist: {
    ai_infrastructure:    -8,
    technology:            -4,
    fintech:               -6, // Quant modelling, risk
    banking_finance:        2,
    media_entertainment:    8,
    bpo_ites:              14, // DS builds automation for BPO processes
    retail_ecommerce:       -2, // Demand forecasting, personalisation
    manufacturing:          0,
    healthcare:            -5, // Clinical outcomes, drug discovery
    consulting:             -2,
  },

  data_engineer: {
    ai_infrastructure:    -8,
    technology:            -3,
    fintech:               -5,
    banking_finance:        3,
    bpo_ites:              10,
    media_entertainment:    5,
    retail_ecommerce:       0,
    healthcare:            -2,
  },

  data_analyst: {
    ai_infrastructure:    -5,
    technology:            -2,
    fintech:               -4,
    banking_finance:        4,
    bpo_ites:              12, // AI analytics tools are eroding pure analyst roles
    media_entertainment:    8,
    retail_ecommerce:       0,
    healthcare:             0,
    consulting:            -2,
    manufacturing:          3,
  },

  // ── DevOps / Platform / Cloud ──────────────────────────────────────────────
  devops: {
    ai_infrastructure:    -8, // MLOps is a core function
    technology:            -4,
    fintech:               -5,
    banking_finance:        3,
    bpo_ites:               8,
    media_entertainment:    5,
    manufacturing:          3,
    healthcare:            -1,
  },

  platform_engineer: {
    ai_infrastructure:    -10, // Core IDP/GPU infrastructure
    technology:            -5,
    fintech:               -4,
    banking_finance:        3,
    bpo_ites:               8,
  },

  cloud_architect: {
    ai_infrastructure:    -10,
    technology:            -5,
    fintech:               -4,
    banking_finance:        2,
    government:             5, // Slow cloud adoption, complex procurement
    manufacturing:          0,
    bpo_ites:               5,
  },

  // ── Leadership roles ───────────────────────────────────────────────────────
  eng_manager: {
    ai_infrastructure:    -8, // IC leverage high — managers cut less often
    technology:            -3,
    fintech:               -4,
    banking_finance:        5,
    bpo_ites:              10,
    media_entertainment:    8,
  },

  principal_engineer: {
    ai_infrastructure:    -10,
    technology:            -6,
    fintech:               -6,
    banking_finance:        4,
    bpo_ites:               8,
    media_entertainment:    6,
  },

  tech_lead: {
    ai_infrastructure:    -6,
    technology:            -3,
    fintech:               -4,
    banking_finance:        4,
    bpo_ites:               9,
  },

  solution_architect: {
    ai_infrastructure:    -8,
    technology:            -4,
    fintech:               -5,
    banking_finance:        3,
    consulting:            -4, // Solutions architects sell deals
    government:             4,
    manufacturing:          2,
  },

  security_engineer: {
    ai_infrastructure:    -6, // Security is always on the protected list
    technology:            -5,
    fintech:               -8, // Regulatory requirement; rarely cut
    banking_finance:       -8,
    healthcare:            -6, // HIPAA — regulatory moat
    government:            -8, // Cyber is a national priority
    bpo_ites:               5,
  },

  // ── Product roles ──────────────────────────────────────────────────────────
  product_manager: {
    ai_infrastructure:    -8, // AI roadmap PMs are protected
    technology:            -3,
    fintech:               -5, // Product is core in fintech
    banking_finance:        5, // PMs less entrenched in banks
    media_entertainment:   10, // Discretionary; media cuts PMs early
    bpo_ites:              15, // Very few PM roles; highly at risk
    retail_ecommerce:       0,
    healthcare:            -2,
    consulting:             0,
  },

  ux_designer: {
    ai_infrastructure:    -5, // UX for AI products growing
    technology:            -2,
    fintech:               -3, // UX is core to consumer fintech
    banking_finance:        8, // Design is discretionary in banks
    media_entertainment:    5,
    bpo_ites:              18, // Design in BPO is nearly nonexistent
    retail_ecommerce:       0,
    healthcare:             3, // Healthcare UX underfunded
  },

  // ── Finance roles ──────────────────────────────────────────────────────────
  financial_analyst: {
    banking_finance:        5,  // Wave risk: banks automating analyst roles
    fintech:               -5,  // Growing — automation insight valued
    technology:            -2,  // FP&A in tech companies is growing
    ai_infrastructure:     -3,
    media_entertainment:   10,  // Media cutting finance teams
    retail_ecommerce:       3,
    consulting:            -3,  // Finance advisory growing
    healthcare:             0,
    manufacturing:          2,
  },

  investment_banker: {
    banking_finance:        8,  // Deal volume dependent; AI automating junior analyst work
    fintech:               -2,  // FinTech M&A advisory growing
    technology:            -3,  // Tech M&A always active
    consulting:            -2,
    media_entertainment:   12,  // Media M&A cycle is over
    real_estate:            8,  // CRE market compressed
  },

  risk_analyst: {
    banking_finance:       -3,  // Risk is regulatory; rarely cut
    fintech:               -5,  // Core compliance need
    technology:             2,
    healthcare:            -2,
    insurance:             -5,  // Core function
    manufacturing:          3,
  },

  compliance_officer: {
    banking_finance:       -8, // Regulatory — cannot be cut without legal risk
    fintech:               -8,
    healthcare:            -6, // HIPAA compliance is non-negotiable
    technology:            -2,
    insurance:             -6,
    government:           -10, // Compliance is the government's core function
    media_entertainment:    8, // Compliance discretionary in media
    bpo_ites:               2,
  },

  // ── Sales & Revenue roles ──────────────────────────────────────────────────
  account_executive: {
    ai_infrastructure:    -8,  // Hypergrowth — AEs generating revenue are protected
    technology:            -3,
    fintech:               -4,
    banking_finance:        5,  // Bank sales roles under pressure from digital channels
    media_entertainment:   12,  // Media advertising revenue compressed
    bpo_ites:              10,  // BPO AEs face client offshoring pressure
    retail_ecommerce:       5,
    consulting:            -4,
    manufacturing:          3,
  },

  sales_engineer: {
    ai_infrastructure:    -10, // SE in AI companies is critical to deal closure
    technology:            -5,
    fintech:               -5,
    banking_finance:        3,
    bpo_ites:              12,
    consulting:            -3,
  },

  business_development_manager: {
    ai_infrastructure:    -6,
    technology:            -3,
    fintech:               -4,
    banking_finance:        5,
    media_entertainment:   10,
    consulting:            -3,
    retail_ecommerce:       3,
  },

  // ── HR roles ───────────────────────────────────────────────────────────────
  hr_generalist: {
    ai_infrastructure:     5,  // AI companies cut HR early in efficiency cycles
    technology:             3,
    fintech:                3,
    banking_finance:        5,
    bpo_ites:               8,  // BPO HR very exposed as headcount shrinks
    media_entertainment:   10,
    consulting:             2,
    healthcare:            -2,  // Healthcare HR is stable (compliance need)
    government:            -5,  // Government HR is protected
  },

  hr_business_partner: {
    ai_infrastructure:     8,  // Efficiency restructuring = HRBP is the axe-bearer, then axed
    technology:             4,
    fintech:                3,
    banking_finance:        5,
    bpo_ites:               8,
    media_entertainment:   10,
    healthcare:            -2,
    government:            -5,
  },

  talent_acquisition_specialist: {
    ai_infrastructure:     8,  // Hiring freeze = TA is first cut
    technology:            10,  // Tech hiring freeze has decimated TA
    fintech:                8,
    banking_finance:        8,
    bpo_ites:               5,
    media_entertainment:   15,
    healthcare:            -5,  // Chronic shortage — TA always needed
    government:            -3,
    consulting:             6,
  },

  // ── BPO / ITES ─────────────────────────────────────────────────────────────
  bpo_associate: {
    bpo_ites:              18, // Core displacement target — AI is replacing BPO at scale
    banking_finance:       12, // Banks automating back-office
    technology:            10, // IT support being automated
    media_entertainment:    8,
    healthcare:             5,
    government:             0, // Government BPO is more protected
  },

  support_engineer: {
    ai_infrastructure:    -3,  // Technical support for AI products — still needed
    technology:             5,  // AI chatbots reducing support headcount
    fintech:                3,
    banking_finance:        8,
    bpo_ites:              15,
    media_entertainment:    8,
    healthcare:            -2,
  },
};

// ── Rationale Templates ───────────────────────────────────────────────────────

function buildRationale(roleGroup: string, industry: string, modifier: number): string {
  if (modifier <= -10) return `${roleGroup} is a core, protected function in ${industry} — typically among the last roles cut.`;
  if (modifier <= -5) return `${roleGroup} has strong role leverage in ${industry} — market demand provides meaningful protection.`;
  if (modifier <= -1) return `${roleGroup} is modestly protected in ${industry} — sector growth slightly reduces displacement pressure.`;
  if (modifier === 0) return `${roleGroup} faces sector-baseline risk in ${industry} — no significant amplification or protection.`;
  if (modifier <= 5) return `${roleGroup} faces moderately elevated risk in ${industry} — sector dynamics add modest displacement pressure.`;
  if (modifier <= 12) return `${roleGroup} faces elevated displacement risk in ${industry} — sector trends compound role-level exposure.`;
  return `${roleGroup} faces critical displacement risk in ${industry} — sector-role combination is among the highest-risk profiles.`;
}

function buildLabel(roleGroup: string, industryKey: string): string {
  const industryLabels: Record<string, string> = {
    ai_infrastructure: 'AI-infrastructure company',
    technology: 'tech company',
    banking_finance: 'bank / financial institution',
    fintech: 'fintech company',
    healthcare: 'healthcare provider',
    pharma_biotech: 'pharma / biotech',
    media_entertainment: 'media / entertainment company',
    retail_ecommerce: 'retail / e-commerce',
    manufacturing: 'manufacturing company',
    energy: 'energy sector',
    consulting: 'consulting firm',
    bpo_ites: 'BPO / IT services company',
    telecom: 'telecom / network company',
    government: 'government / public sector',
    education: 'education sector',
    real_estate: 'real estate company',
    construction: 'construction / civil engineering',
    automotive: 'automotive / mobility company',
    insurance: 'insurance company',
  };
  const displayIndustry = industryLabels[industryKey] ?? industryKey;
  const roleLabel = roleGroup.replace(/_/g, ' ');
  return `${roleLabel} at a ${displayIndustry}`;
}

// ── Core Compute Function ─────────────────────────────────────────────────────

export function computeRoleIndustryComposite(
  roleGroup: string,
  rawIndustry: string,
): RoleIndustryComposite {
  const industryKey = normalizeIndustry(rawIndustry);
  const roleModifiers = ROLE_INDUSTRY_MODIFIERS[roleGroup];
  const modifier = roleModifiers?.[industryKey] ?? 0;
  const roleCategory = deriveRoleCategory(roleGroup);

  return {
    roleGroup,
    industryKey,
    riskModifier: modifier,
    roleCategory,
    compositeLabel: buildLabel(roleGroup, industryKey),
    rationale: buildRationale(roleGroup, industryKey, modifier),
    calibrationStatus: 'developer_estimate',
  };
}

export { deriveRoleCategory };
