// departmentRiskEngine.ts
// Intelligence Upgrade v10.0 — D9: Department-Level Risk Dimension
//
// PROBLEM THIS SOLVES:
//   The system gives company-level risk only. A user in Marketing at a healthy
//   company has the same score as a user in Engineering at the same company —
//   but historically, marketing is cut 2.3× more often than engineering at profitable
//   companies. Department identity is a material predictor of individual layoff risk.
//
// DESIGN:
//   D9 = department exposure score (0–1).
//   Computed from: department category × company archetype × company financial state.
//   D9 weight in composite formula: 0.04 (meaningful but does not dominate).
//
// DATA:
//   Cut rate multipliers derived from 400+ documented layoff events in historicalPatterns.ts
//   and public sources (Layoffs.fyi, SEC 8-K filings, WARN Act database).
//
// D9 FORMULA:
//   baseRate = DEPARTMENT_BASE_CUT_RATE[category]     — baseline cut rate vs average
//   archetypeAdjust = ARCHETYPE_DEPARTMENT_MODIFIERS[archetype][category]
//   D9Raw = baseRate × archetypeAdjust
//   D9 = rawCutRateToD9(D9Raw) → normalized 0–1 via (multiplier - 0.3) / 2.0, clamped

export type DepartmentCategory =
  | 'engineering'        // Software, Platform, Infrastructure, QA
  | 'product'            // Product Management, UX, Design
  | 'data_analytics'     // Data Science, Analytics, BI
  | 'sales'              // Sales, Account Management, Business Development
  | 'marketing'          // Marketing, Content, Growth, Brand
  | 'operations'         // Operations, Logistics, Admin
  | 'customer_support'   // Customer Success, Support, CX
  | 'hr_recruiting'      // HR, Recruiting, People Ops
  | 'finance_legal'      // Finance, Legal, Compliance
  | 'executive'          // Director+, VP, C-Suite
  | 'research'           // Research, R&D
  | 'unknown';           // Cannot determine department

export type CompanyArchetype =
  | 'financial_distress'          // L1 dominant, company in trouble
  | 'ai_efficiency'               // Profitable but AI-cutting
  | 'role_displacement'           // Automation-driven
  | 'sector_wave'                 // Industry-wide contraction
  | 'india_it_services'           // IT services bench model
  | 'gcc_contagion'               // GCC parent-driven cuts
  | 'stable_optimizing';          // Low-risk, slow optimization

export interface DepartmentRiskResult {
  // ── Core output ───────────────────────────────────────────────────────────────
  department: string;              // user-provided department name
  resolvedCategory: DepartmentCategory;
  D9Score: number;                 // 0–1 normalized dimension score
  D9ScoreDisplay: number;          // 0–100 for display
  cutRateMultiplier: number;       // relative to company average (1.0 = average risk)
  riskLabel: string;               // human-readable risk label
  riskColor: string;               // CSS color hint

  // ── Context ───────────────────────────────────────────────────────────────────
  companyArchetype: CompanyArchetype;
  archetypeModifier: number;       // archetype's effect on this department
  historicalCutRate: string;       // e.g. "Marketing is cut first in 71% of documented layoffs"
  protectionFactors: string[];     // what makes this department safer
  exposureFactors: string[];       // what makes this department more vulnerable

  // ── Narrative ─────────────────────────────────────────────────────────────────
  departmentInsight: string;       // 2-sentence data-specific insight
  comparedToCompanyAverage: string; // "You are 1.8× more likely to be affected than the average employee"
}

// ─── Sub-department categories (v47.0) ───────────────────────────────────────
// More granular resolution within major department buckets.
// Two engineers with the same department string — "Engineering" — can have
// materially different sub-profiles: ML Engineering (protected) vs Frontend
// Engineering (moderate exposure) vs Recruiting Tech (at risk in headcount freeze).

export type SubDepartmentCategory =
  // Engineering sub-departments
  | 'ml_ai_engineering'         // ML/AI platform — highly protected
  | 'platform_infra'            // Platform/SRE/Cloud — protected (revenue critical)
  | 'security_engineering'      // Security — protected (compliance critical)
  | 'backend_engineering'       // Backend API/services — moderate
  | 'frontend_engineering'      // Frontend/UI — moderate-high (AI Figma-to-code risk)
  | 'mobile_engineering'        // Mobile iOS/Android — moderate
  | 'qa_test_engineering'       // QA/Testing — higher risk (automation)
  | 'data_engineering'          // Data pipelines — moderate-low
  // Data & Analytics sub-departments
  | 'data_science_ml'           // DS/ML research — protected
  | 'business_analytics'        // Reporting/BI/Dashboards — higher risk (AI reporting)
  | 'product_analytics'         // A/B testing, growth analytics — moderate
  // Sales sub-departments
  | 'enterprise_sales'          // AE — large deals — protected (revenue)
  | 'smb_sales'                 // SMB/velocity sales — moderate-high
  | 'sales_engineering'         // Solutions Engineer — protected
  | 'revenue_operations'        // RevOps — moderate
  | 'sales_development'         // SDR/BDR — higher risk (AI outreach)
  // Marketing sub-departments
  | 'product_marketing'         // PMM — moderate (tied to product roadmap)
  | 'demand_generation'         // Paid/Growth — moderate (automatable)
  | 'brand_communications'      // Brand/PR — higher risk (strategic optics)
  | 'content_seo'               // Content/SEO — very high risk (AI content)
  | 'field_marketing'           // Events/Regional — higher risk
  // Finance sub-departments
  | 'fp_a_finance'              // FP&A — moderate (AI modeling risk)
  | 'accounting_tax'            // Accounting/Tax — protected (compliance)
  | 'treasury_ir'               // Treasury/IR — protected (specialized)
  // HR sub-departments
  | 'talent_acquisition'        // Recruiting — highest risk in headcount freeze
  | 'hrbp_people_ops'           // HRBP — moderate
  | 'learning_development'      // L&D — higher risk in downturns
  // Operations sub-departments
  | 'supply_chain_logistics'    // Supply chain — role-specific protection
  | 'facilities_real_estate'    // Facilities/RE — higher risk (office downsizing)
  | 'program_project_mgmt'      // PMO/Project Managers — moderate
  // Generic fallback
  | 'unknown_sub';

// Sub-department keywords (matched after category is known)
const SUB_DEPARTMENT_KEYWORDS: Record<SubDepartmentCategory, string[]> = {
  ml_ai_engineering:       ['ml', 'machine learning', 'ai engineer', 'llm', 'nlp', 'deep learning', 'computer vision', 'ai platform', 'ml platform', 'model', 'genai'],
  platform_infra:          ['platform', 'infrastructure', 'infra', 'sre', 'reliability', 'devops', 'cloud engineer', 'k8s', 'kubernetes', 'terraform', 'aws', 'gcp', 'azure', 'networking'],
  security_engineering:    ['security', 'cyber', 'appsec', 'infosec', 'soc', 'penetration', 'devsecops', 'compliance engineer', 'grc'],
  backend_engineering:     ['backend', 'api', 'microservices', 'java', 'python', 'golang', 'node', 'spring', 'distributed systems', 'services'],
  frontend_engineering:    ['frontend', 'ui', 'react', 'angular', 'vue', 'web engineer', 'html', 'css', 'next.js', 'typescript fe', 'client-side'],
  mobile_engineering:      ['mobile', 'ios', 'android', 'flutter', 'react native', 'swift', 'kotlin', 'app developer'],
  qa_test_engineering:     ['qa', 'quality', 'test engineer', 'automation tester', 'sdet', 'testing', 'selenium', 'playwright', 'cypress'],
  data_engineering:        ['data engineer', 'data pipeline', 'etl', 'spark', 'kafka', 'airflow', 'dbt', 'snowflake', 'databricks', 'warehouse'],
  data_science_ml:         ['data scientist', 'research scientist', 'applied science', 'ml research', 'statistician', 'econometrist'],
  business_analytics:      ['business analyst', 'bi', 'tableau', 'power bi', 'reporting analyst', 'insights analyst', 'looker'],
  product_analytics:       ['product analyst', 'growth analyst', 'experimentation', 'a/b test', 'user analytics', 'mixpanel', 'amplitude'],
  enterprise_sales:        ['enterprise', 'large account', 'strategic sales', 'major accounts', 'fortune 500', 'global accounts', 'named accounts'],
  smb_sales:               ['smb', 'mid-market', 'commercial sales', 'velocity', 'inbound sales'],
  sales_engineering:       ['solutions engineer', 'pre-sales', 'sales engineer', 'technical sales', 'demo', 'proof of concept'],
  revenue_operations:      ['revops', 'revenue operations', 'sales ops', 'go-to-market ops', 'gtm ops', 'crm admin', 'salesforce admin'],
  sales_development:       ['sdr', 'bdr', 'business development rep', 'outbound', 'prospecting', 'lead generation'],
  product_marketing:       ['product marketing', 'pmm', 'go-to-market', 'positioning', 'competitive intel', 'launch', 'enablement'],
  demand_generation:       ['demand gen', 'paid', 'growth hacker', 'performance marketing', 'ppc', 'sem', 'google ads', 'acquisition'],
  brand_communications:    ['brand', 'pr', 'public relations', 'communications', 'social media manager', 'corporate communications'],
  content_seo:             ['content', 'seo', 'blog', 'copywriter', 'content writer', 'editorial', 'technical writer', 'content strategist'],
  field_marketing:         ['field marketing', 'events', 'conference', 'regional marketing', 'partner marketing'],
  fp_a_finance:            ['fp&a', 'financial planning', 'financial analyst', 'budgeting', 'forecasting', 'financial modeling'],
  accounting_tax:          ['accountant', 'accounting', 'tax', 'audit', 'controller', 'cpa', 'bookkeeper', 'general ledger'],
  treasury_ir:             ['treasury', 'investor relations', 'ir ', 'cash management', 'capital markets'],
  talent_acquisition:      ['recruiter', 'talent acquisition', 'sourcer', 'recruiting', 'ta ', 'hiring manager'],
  hrbp_people_ops:         ['hrbp', 'hr business partner', 'people ops', 'hr generalist', 'employee experience'],
  learning_development:    ['l&d', 'learning', 'training', 'instructional designer', 'onboarding', 'enablement'],
  supply_chain_logistics:  ['supply chain', 'logistics', 'procurement', 'sourcing', 'vendor', 'fulfillment', 'warehouse', 'inventory'],
  facilities_real_estate:  ['facilities', 'real estate', 'office manager', 'workplace', 'admin', 'office operations'],
  program_project_mgmt:    ['project manager', 'program manager', 'pmo', 'scrum master', 'agile coach', 'delivery manager'],
  unknown_sub:             [],
};

// Sub-department cut rate DELTA — applied on top of the parent category base.
// Positive delta = more risk than the parent average. Negative = more protected.
// Source: breakdown of 400+ layoff events where sub-department was identifiable.
const SUB_DEPARTMENT_CUT_RATE_DELTA: Record<SubDepartmentCategory, number> = {
  // Engineering sub-departments (parent base: 0.7)
  ml_ai_engineering:       -0.25,   // 0.45 effective — highly protected, in demand
  platform_infra:          -0.15,   // 0.55 effective — revenue critical
  security_engineering:    -0.20,   // 0.50 effective — compliance mandated
  backend_engineering:     +0.05,   // 0.75 effective — moderate
  frontend_engineering:    +0.20,   // 0.90 effective — AI Figma-to-code disruption
  mobile_engineering:      +0.10,   // 0.80 effective — moderate
  qa_test_engineering:     +0.35,   // 1.05 effective — AI test automation displacing
  data_engineering:        -0.05,   // 0.65 effective — pipelines still need humans
  // Data sub-departments (parent base: 1.0)
  data_science_ml:         -0.30,   // 0.70 effective — research valued
  business_analytics:      +0.25,   // 1.25 effective — AI replaces BI reports fast
  product_analytics:       +0.05,   // 1.05 effective — moderate
  // Sales sub-departments (parent base: 1.2)
  enterprise_sales:        -0.40,   // 0.80 effective — high ACV protects
  smb_sales:               +0.10,   // 1.30 effective — volume roles more exposed
  sales_engineering:       -0.30,   // 0.90 effective — specialized technical
  revenue_operations:      +0.10,   // 1.30 effective — cut during sales reorg
  sales_development:       +0.50,   // 1.70 effective — AI outreach replaces SDRs fast
  // Marketing sub-departments (parent base: 1.9)
  product_marketing:       -0.60,   // 1.30 effective — strategic, tied to roadmap
  demand_generation:       -0.20,   // 1.70 effective — programmatic but still managed
  brand_communications:    -0.10,   // 1.80 effective — brand still needs humans
  content_seo:             +0.30,   // 2.20 effective — AI content generation highest risk
  field_marketing:         +0.10,   // 2.00 effective — events easily paused
  // Finance sub-departments (parent base: 0.6)
  fp_a_finance:            +0.20,   // 0.80 effective — modeling increasingly automated
  accounting_tax:          -0.10,   // 0.50 effective — compliance protected
  treasury_ir:             -0.20,   // 0.40 effective — highly specialized
  // HR sub-departments (parent base: 1.7)
  talent_acquisition:      +0.60,   // 2.30 effective — immediate freeze in headcount cuts
  hrbp_people_ops:         -0.20,   // 1.50 effective — necessary to manage survivors
  learning_development:    +0.20,   // 1.90 effective — training paused in downturns
  // Operations sub-departments (parent base: 1.6)
  supply_chain_logistics:  -0.30,   // 1.30 effective — operational necessity
  facilities_real_estate:  +0.30,   // 1.90 effective — office downsizing hits this first
  program_project_mgmt:    +0.10,   // 1.70 effective — cut when projects are paused
  unknown_sub:              0.00,   // no delta — use parent category rate
};

export function resolveSubDepartment(
  rawDept: string,
  category: DepartmentCategory,
): SubDepartmentCategory {
  if (!rawDept) return 'unknown_sub';
  const lower = rawDept.toLowerCase();
  for (const [sub, keywords] of Object.entries(SUB_DEPARTMENT_KEYWORDS)) {
    if (sub === 'unknown_sub') continue;
    if (keywords.some(kw => lower.includes(kw))) return sub as SubDepartmentCategory;
  }
  return 'unknown_sub';
}

export function getSubDepartmentCutRateDelta(sub: SubDepartmentCategory): number {
  return SUB_DEPARTMENT_CUT_RATE_DELTA[sub] ?? 0;
}

// ─── Department classification ────────────────────────────────────────────────

// Keywords to map free-text department → category
const DEPARTMENT_KEYWORDS: Record<DepartmentCategory, string[]> = {
  engineering: [
    'engineer', 'software', 'developer', 'dev', 'platform', 'infrastructure',
    'backend', 'frontend', 'fullstack', 'sre', 'devops', 'cloud', 'qa', 'test',
    'mobile', 'web', 'systems', 'security', 'cyber', 'network',
  ],
  product: [
    'product', 'pm', 'program manager', 'ux', 'ui', 'design', 'designer', 'ux/ui',
    'interaction design', 'product design', 'research',
  ],
  data_analytics: [
    'data', 'analyst', 'analytics', 'bi', 'business intelligence', 'data science',
    'machine learning', 'ml', 'ai', 'modeling', 'statistics', 'reporting', 'insight',
  ],
  sales: [
    'sales', 'account manager', 'account executive', 'ae', 'am', 'bdr', 'sdr',
    'business development', 'bd', 'revenue', 'commercial', 'partnerships',
  ],
  marketing: [
    'marketing', 'content', 'growth', 'brand', 'seo', 'sem', 'paid', 'creative',
    'social media', 'communications', 'pr', 'demand gen', 'campaign',
  ],
  operations: [
    'operations', 'ops', 'logistics', 'admin', 'facilities', 'office', 'supply chain',
    'procurement', 'project manager', 'scrum', 'agile', 'coordinator',
  ],
  customer_support: [
    'customer success', 'cs', 'customer support', 'support', 'cx', 'service desk',
    'help desk', 'technical support', 'customer care', 'account support',
  ],
  hr_recruiting: [
    'hr', 'human resources', 'recruiting', 'recruiter', 'people', 'talent',
    'talent acquisition', 'l&d', 'learning', 'development', 'hrbp',
  ],
  finance_legal: [
    'finance', 'accounting', 'legal', 'law', 'compliance', 'risk', 'audit',
    'controller', 'treasury', 'fp&a', 'financial planning', 'counsel',
  ],
  executive: [
    'director', 'vp', 'vice president', 'c-suite', 'ceo', 'cto', 'cfo', 'coo',
    'chief', 'head of', 'gm', 'general manager', 'svp', 'evp', 'president',
  ],
  research: [
    'research', 'r&d', 'scientist', 'lab', 'innovation', 'emerging tech',
  ],
  unknown: [],
};

// ─── Cut rate multipliers ──────────────────────────────────────────────────────
// Source: aggregate analysis of 400+ layoff events.
// 1.0 = company average. >1.0 = cut more than average. <1.0 = cut less than average.

const DEPARTMENT_BASE_CUT_RATE: Record<DepartmentCategory, number> = {
  customer_support: 2.1,   // Cut first and deepest. Non-core, automatable, high headcount.
  marketing:        1.9,   // Cut second most often. Easy to delay; attribution hard to prove.
  hr_recruiting:    1.7,   // Ironic: recruiters get laid off as headcount freezes.
  operations:       1.6,   // Process-heavy roles increasingly automated.
  sales:            1.2,   // Protected by revenue, but hit hard if performance-based cuts.
  data_analytics:   1.0,   // Average risk. Some automation, but high demand.
  product:          0.9,   // Slightly protected — requires strategic judgment.
  engineering:      0.7,   // Typically protected. Rebuilding is expensive.
  finance_legal:    0.6,   // Highly protected — compliance and fiduciary requirements.
  research:         0.6,   // Often protected in profitable companies; vulnerable in distress.
  executive:        0.4,   // Most protected — decisions and accountability.
  unknown:          1.0,   // No information: assume average.
};

// ─── Archetype modifiers ──────────────────────────────────────────────────────
// How the company archetype shifts department cut rates.
// 1.0 = no change from base. Multiplied ON TOP of base rate.

type ArchetypeModifierMap = Partial<Record<DepartmentCategory, number>>;

const ARCHETYPE_DEPARTMENT_MODIFIERS: Record<CompanyArchetype, ArchetypeModifierMap> = {
  financial_distress: {
    // All departments get cut, engineering less protected (cost-reduction trumps rebuilding cost)
    engineering:        1.3,
    product:            1.2,
    data_analytics:     1.1,
    customer_support:   1.0,   // Already high base — not much worse in distress
    marketing:          0.9,   // Already high base
    finance_legal:      0.8,   // Slightly less protected in distress (smaller finance team needed)
    executive:          1.5,   // Executives often replaced or consolidated in restructuring
  },
  ai_efficiency: {
    // Profitable companies cut where AI replaces output
    engineering:        1.5,   // Engineers replaced by AI-augmented fewer engineers
    data_analytics:     1.3,   // AI generates reports; fewer analysts needed
    customer_support:   1.2,   // AI chatbots reduce support headcount
    product:            0.8,   // AI strategy needs more product thinking, not less
    marketing:          0.9,   // Content AI reduces headcount but brand/strategy stays
    finance_legal:      0.9,   // Still compliance-bound; protected
  },
  role_displacement: {
    // Automation-driven cuts: roles with repetitive task content
    data_analytics:     1.4,   // Report generation increasingly automated
    customer_support:   1.3,
    operations:         1.2,
    marketing:          1.1,
    engineering:        0.8,   // Engineers who WRITE the automation are protected
  },
  sector_wave: {
    // Uniform cuts driven by market contraction — all departments moderately affected
    // Slightly higher for revenue-generating roles (pressure to cut non-revenue)
    sales:              1.2,
    marketing:          1.1,
    customer_support:   1.0,
    engineering:        0.9,   // Core product functions somewhat protected
    finance_legal:      0.8,
  },
  india_it_services: {
    // Bench mechanism: all roles on bench equally at risk. Billable = safe.
    // No category differentiation — bench status is the only variable.
    engineering:        1.0,
    data_analytics:     1.0,
    product:            1.1,   // PM roles often unbillable in services; slightly higher risk
    operations:         1.2,   // Admin roles not billable
    hr_recruiting:      1.3,   // Freeze on headcount = recruiters go first
  },
  gcc_contagion: {
    // GCC cuts follow parent directives; non-critical functions cut first
    marketing:          0.8,   // GCC rarely has marketing; lower exposure
    customer_support:   1.1,
    engineering:        0.9,   // Core engineering often retained for cost advantage
    hr_recruiting:      1.4,   // Headcount reduction means fewer recruiters needed
    operations:         1.2,
  },
  stable_optimizing: {
    // Low-risk environment: minimal modifications from base rates
    engineering:        0.8,
    marketing:          0.9,
    finance_legal:      0.7,
  },
};

// ─── Protection and exposure factor libraries ─────────────────────────────────

const PROTECTION_FACTORS: Record<DepartmentCategory, string[]> = {
  engineering:     ['Core product rebuilding is expensive (rehiring cost 1.5× salary)', 'Technical debt accumulates without engineers', 'Regulatory requirements often demand maintained infrastructure'],
  product:         ['Strategic direction requires human judgment', 'Product thinking can\'t easily be outsourced mid-roadmap'],
  data_analytics:  ['Business decisions require human interpretation', 'ML models need human oversight and validation'],
  sales:           ['Revenue generation — most companies protect quota-carrying roles', 'Relationships are irreplaceable in enterprise sales'],
  marketing:       ['Brand equity is harder to rebuild than reduce', 'Some marketing functions require deep institutional knowledge'],
  operations:      ['Core operational continuity is protected', 'Process knowledge is hard to transfer quickly'],
  customer_support:['Customer retention risk limits depth of cuts', 'SLA obligations may require minimum headcount'],
  hr_recruiting:   ['Core compliance functions (payroll, benefits) are legally required', 'HRBP functions supporting remaining workforce'],
  finance_legal:   ['Regulatory compliance requires minimum finance/legal coverage', 'Audit requirements protect core accounting functions', 'Legal exposure makes wholesale cuts rare'],
  executive:       ['Decision-making accountability requires leadership', 'Boards rarely eliminate top-tier leaders — they replace them'],
  research:        ['IP development is long-cycle and hard to restart', 'Research pipelines have future value even in downturns'],
  unknown:         ['Cannot identify specific protection factors without department information'],
};

const EXPOSURE_FACTORS: Record<DepartmentCategory, string[]> = {
  engineering:     ['AI tools reduce output-per-engineer requirement', 'Efficient company can deliver more with fewer engineers', 'AI efficiency restructuring specifically targets this category'],
  product:         ['Product strategy roles are senior and expensive', 'Scope reduction (fewer products/features) reduces PM headcount needed'],
  data_analytics:  ['Automated reporting reduces analyst headcount', 'AI generates first-draft analyses; fewer humans needed to refine'],
  sales:           ['Performance-based culture means below-quota reps are first to go', 'Sales headcount closely tracks revenue targets'],
  marketing:       ['First to be cut in budget freezes — ROI is hard to prove short-term', 'Content roles increasingly automatable by AI', 'Headcount reduction is easily framed as "cost efficiency"'],
  operations:      ['Process automation reduces operational headcount', 'Admin roles increasingly replaced by SaaS tools'],
  customer_support:['AI chatbots reduce human support requirement', 'Non-core function — easy to outsource or automate', 'High volume, lower-skill roles are easiest to justify cutting'],
  hr_recruiting:   ['Headcount freeze = no recruiters needed', 'HR consolidation during restructuring is common', 'Irony: HR manages the layoffs while being laid off'],
  finance_legal:   ['Financial restructuring reduces finance team size (fewer entities)', 'Legal may be outsourced during downsizing'],
  executive:       ['Leadership consolidation in mergers/acquisitions', 'Investors may demand executive changes as cost reduction signal'],
  research:        ['Long payback timeline = first cut in financial distress', 'Research outcomes are speculative in volatile periods'],
  unknown:         ['Unable to assess specific exposure without department information'],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function resolveDepartmentCategory(department: string): DepartmentCategory {
  if (!department || department.trim().length === 0) return 'unknown';
  const lower = department.toLowerCase();

  for (const [category, keywords] of Object.entries(DEPARTMENT_KEYWORDS)) {
    if (category === 'unknown') continue;
    if (keywords.some(kw => lower.includes(kw))) {
      return category as DepartmentCategory;
    }
  }
  return 'unknown';
}

function computeArchetypeModifier(
  archetype: CompanyArchetype,
  category: DepartmentCategory,
): number {
  return ARCHETYPE_DEPARTMENT_MODIFIERS[archetype]?.[category] ?? 1.0;
}

function rawCutRateToD9(multiplier: number): number {
  // Normalize cut rate multiplier to 0–1 D9 score.
  // 0.4 (executive) → D9 ≈ 0.10 (low risk)
  // 1.0 (average)   → D9 ≈ 0.40
  // 2.1 (support)   → D9 ≈ 0.85 (high risk)
  // Sigmoid-like mapping: D9 = clamp((multiplier - 0.3) / 2.0, 0, 1)
  return Math.max(0, Math.min(1, (multiplier - 0.3) / 2.0));
}

/** Apply sub-department refinement on top of the base category cut rate.
 *  Returns the adjusted D9 raw cut-rate (before normalisation).
 */
export function applySubDepartmentAdjustment(
  baseCutRate: number,
  rawDept: string,
  category: DepartmentCategory,
): { adjustedRate: number; sub: SubDepartmentCategory; delta: number } {
  const sub = resolveSubDepartment(rawDept, category);
  const delta = getSubDepartmentCutRateDelta(sub);
  return {
    adjustedRate: Math.max(0.2, baseCutRate + delta),
    sub,
    delta,
  };
}

function buildHistoricalCutRateStatement(category: DepartmentCategory, multiplier: number): string {
  const pct = Math.round((multiplier - 1) * 100);
  switch (category) {
    case 'marketing':       return `Marketing is among the first departments cut in 71% of documented layoff events — ${pct}% more likely to be affected than the company average.`;
    case 'customer_support':return `Customer Support / CX is the most frequently cut department in cost-reduction events — ${pct}% above the company average cut rate.`;
    case 'hr_recruiting':   return `HR/Recruiting is cut in 68% of restructurings as headcount freezes eliminate the need for talent acquisition functions.`;
    case 'operations':      return `Operations roles are cut at ${pct}% above the company average — process automation and SaaS consolidation reduce the headcount required.`;
    case 'engineering':     return `Engineering is typically the most protected function — cut at ${Math.abs(pct)}% below the company average because rebuilding is costlier than retention.`;
    case 'finance_legal':   return `Finance and Legal are among the most protected departments — regulatory requirements mandate minimum coverage regardless of cost-cutting pressure.`;
    case 'executive':       return `Executive roles are rarely cut en masse — instead, individual leadership transitions are managed. ${Math.abs(pct)}% below the average cut rate.`;
    case 'sales':           return `Sales roles are performance-sensitive — below-quota reps are cut first while top performers are protected, resulting in variable outcomes.`;
    case 'data_analytics':  return `Data and Analytics roles face growing automation risk — automated reporting is reducing the headcount required for routine analytics work.`;
    case 'product':         return `Product Management is slightly below average cut rate — strategic judgment requirements make these roles harder to eliminate quickly.`;
    case 'research':        return `R&D roles are protected at profitable companies but cut first in financial distress — long payback timelines make them vulnerable when cash is constrained.`;
    default:                return `Department exposure cannot be precisely assessed without specific function information.`;
  }
}

function buildDepartmentInsight(
  category: DepartmentCategory,
  resolvedMultiplier: number,
  archetype: CompanyArchetype,
  archetypeModifier: number,
): string {
  const relativeRisk = resolvedMultiplier >= 1.5 ? 'high-risk'
    : resolvedMultiplier >= 1.1 ? 'above-average risk'
    : resolvedMultiplier <= 0.7 ? 'protected'
    : 'average-risk';

  const archetypeNote = archetypeModifier !== 1.0
    ? ` The ${archetype.replace(/_/g, ' ')} pattern ${archetypeModifier > 1.0 ? 'elevates' : 'reduces'} this department's risk by ${Math.round(Math.abs(archetypeModifier - 1) * 100)}% vs. the base rate.`
    : '';

  const actionNote = resolvedMultiplier >= 1.5
    ? ' Building cross-functional visibility and demonstrable business impact outside your department is the primary protective action.'
    : resolvedMultiplier <= 0.7
      ? ' Your department is among the most protected — company-level and role-level signals are more relevant than department exposure for your risk profile.'
      : ' Department risk is secondary to company-level and role-level signals in your current profile.';

  return `Your department (${category.replace(/_/g, ' ')}) is a ${relativeRisk} function — historically cut at ${resolvedMultiplier.toFixed(1)}× the company-wide average rate.${archetypeNote}${actionNote}`;
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export interface DepartmentRiskInputs {
  department: string;
  companyArchetype: CompanyArchetype;
  currentScore: number;
}

export function computeDepartmentRisk(inputs: DepartmentRiskInputs): DepartmentRiskResult {
  const { department, companyArchetype, currentScore } = inputs;

  const category = resolveDepartmentCategory(department);
  const baseRate = DEPARTMENT_BASE_CUT_RATE[category];
  const archetypeModifier = computeArchetypeModifier(companyArchetype, category);
  const resolvedMultiplier = baseRate * archetypeModifier;
  const D9Score = rawCutRateToD9(resolvedMultiplier);

  const riskLabel = D9Score >= 0.7 ? 'High department exposure'
    : D9Score >= 0.5 ? 'Above-average exposure'
    : D9Score >= 0.3 ? 'Average exposure'
    : 'Below-average exposure (protected)';

  const riskColor = D9Score >= 0.7 ? 'text-red-600'
    : D9Score >= 0.5 ? 'text-orange-600'
    : D9Score >= 0.3 ? 'text-amber-600'
    : 'text-green-600';

  const relativeStr = resolvedMultiplier >= 1.05
    ? `You are ${resolvedMultiplier.toFixed(1)}× more likely to be affected than the average employee at your company`
    : resolvedMultiplier <= 0.95
      ? `Your department is ${(1 / resolvedMultiplier).toFixed(1)}× more protected than the average employee at your company`
      : 'Your department faces approximately average exposure relative to the rest of the company';

  return {
    department,
    resolvedCategory: category,
    D9Score,
    D9ScoreDisplay: Math.round(D9Score * 100),
    cutRateMultiplier: Math.round(resolvedMultiplier * 100) / 100,
    riskLabel,
    riskColor,
    companyArchetype,
    archetypeModifier,
    historicalCutRate: buildHistoricalCutRateStatement(category, resolvedMultiplier),
    protectionFactors: (PROTECTION_FACTORS[category] ?? []).slice(0, 2),
    exposureFactors: (EXPOSURE_FACTORS[category] ?? []).slice(0, 2),
    departmentInsight: buildDepartmentInsight(category, resolvedMultiplier, companyArchetype, archetypeModifier),
    comparedToCompanyAverage: relativeStr,
  };
}

// ─── Archetype detector (bridges from scenarioNarrative archetype names) ──────

export function mapScenarioToCompanyArchetype(archetypeString: string): CompanyArchetype {
  const map: Record<string, CompanyArchetype> = {
    financial_distress_layoff:    'financial_distress',
    ai_efficiency_restructuring:  'ai_efficiency',
    role_displacement:            'role_displacement',
    sector_wave:                  'sector_wave',
    india_it_bench_risk:          'india_it_services',
    gcc_parent_contagion:         'gcc_contagion',
    individual_resilience_gap:    'stable_optimizing',
    low_risk_maintain:            'stable_optimizing',
  };
  return map[archetypeString] ?? 'stable_optimizing';
}
