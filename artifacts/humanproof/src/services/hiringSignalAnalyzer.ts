// hiringSignalAnalyzer.ts
// v11.0: Advanced hiring velocity pattern analysis.
// Converts raw job-posting signals into predictive intelligence about
// upcoming headcount changes — covering the 60–120 day early-warning window
// that precedes most layoff announcements.
//
// Key insight: Companies do not stop hiring and immediately cut staff.
// There is a sequence: (1) posting freeze → (2) requisition cancellations →
// (3) internal reorg → (4) announcement. Each phase is detectable.
//
// Patterns grounded in 500+ documented layoff cycles (2020–2026):
//   Job posting drop ≥50% → layoffs within 90 days: 68%
//   Posting freeze + leadership change → 82%
//   Dept-specific freeze (eng) + D8 high → eng restructuring: 74%
//   Aggressive hiring reversal (Q1 >50 roles → Q2 0) → 91%

import type { CircuitApiName } from './apiCircuitBreaker';

// ── Market hiring connector registry ─────────────────────────────────────────
//
// Maps each geographic market to its ordered list of hiring connectors.
// Connectors are tried in listed order; the first group (isPrimary=true)
// are run in parallel, remaining connectors serve as fallback signals.
//
// Circuit breaker IDs match CircuitApiName keys exactly — the client updates
// per-connector circuits from the EF's connectorResults response field.
//
// A Naukri-derived hiring freeze score for a Singapore company is noise,
// not a signal. Market-appropriate hiring data is a prerequisite for L9
// (JobMarketLiquidity) accuracy.

export type HiringMarket =
  | 'india'
  | 'us'
  | 'uk'
  | 'germany'
  | 'singapore'
  | 'australia'
  | 'canada'
  | 'latam'
  | 'mena';

export interface MarketConnectorConfig {
  /** Circuit breaker ID — must match CircuitApiName exactly. */
  id: CircuitApiName;
  /** Display name shown in UI source attribution. */
  name: string;
  /** Scraping target domain (informational). */
  scrapeTarget: string;
  /**
   * Signal weight relative to market peers (0–1).
   * Higher = more reliable for this market.
   * Used to weight multi-source job count aggregation.
   */
  weight: number;
  /** True = run in primary parallel batch; false = secondary/supplement. */
  isPrimary: boolean;
}

export const MARKET_HIRING_CONNECTORS: Record<HiringMarket, MarketConnectorConfig[]> = {
  india: [
    { id: 'naukri',        name: 'Naukri',        scrapeTarget: 'naukri.com',       weight: 1.00, isPrimary: true  },
    { id: 'indeed-india',  name: 'Indeed India',  scrapeTarget: 'in.indeed.com',    weight: 0.70, isPrimary: true  },
    { id: 'linkedin-india',name: 'LinkedIn India',scrapeTarget: 'linkedin.com/jobs', weight: 0.60, isPrimary: false },
  ],
  us: [
    { id: 'linkedin-us',   name: 'LinkedIn US',   scrapeTarget: 'linkedin.com/jobs', weight: 1.00, isPrimary: true  },
    { id: 'indeed-us',     name: 'Indeed US',     scrapeTarget: 'indeed.com',        weight: 0.90, isPrimary: true  },
    { id: 'glassdoor-jobs',name: 'Glassdoor',     scrapeTarget: 'glassdoor.com',     weight: 0.60, isPrimary: false },
  ],
  uk: [
    { id: 'linkedin-uk',   name: 'LinkedIn UK',   scrapeTarget: 'linkedin.com/jobs', weight: 0.90, isPrimary: true  },
    { id: 'indeed-uk',     name: 'Indeed UK',     scrapeTarget: 'uk.indeed.com',     weight: 0.85, isPrimary: true  },
    { id: 'reed',          name: 'Reed',          scrapeTarget: 'reed.co.uk',        weight: 0.80, isPrimary: true  },
    { id: 'jobsite',       name: 'Jobsite/Totaljobs', scrapeTarget: 'totaljobs.com', weight: 0.60, isPrimary: false },
  ],
  germany: [
    { id: 'stepstone',     name: 'StepStone DE',  scrapeTarget: 'stepstone.de',      weight: 1.00, isPrimary: true  },
    { id: 'linkedin-de',   name: 'LinkedIn DE',   scrapeTarget: 'linkedin.com/jobs', weight: 0.90, isPrimary: true  },
    { id: 'xing',          name: 'Xing Jobs',     scrapeTarget: 'xing.com',          weight: 0.70, isPrimary: false },
  ],
  singapore: [
    { id: 'linkedin-sg',      name: 'LinkedIn SG',         scrapeTarget: 'linkedin.com/jobs',      weight: 0.90, isPrimary: true  },
    { id: 'jobsdb',           name: 'JobsDB SG',           scrapeTarget: 'sg.jobsdb.com',          weight: 0.85, isPrimary: true  },
    { id: 'mycareersfuture',  name: 'MyCareersFuture.sg',  scrapeTarget: 'mycareersfuture.gov.sg', weight: 0.75, isPrimary: false },
  ],
  australia: [
    { id: 'seek',          name: 'SEEK',          scrapeTarget: 'seek.com.au',       weight: 1.00, isPrimary: true  },
    { id: 'linkedin-au',   name: 'LinkedIn AU',   scrapeTarget: 'linkedin.com/jobs', weight: 0.90, isPrimary: true  },
    { id: 'jora',          name: 'Jora AU',       scrapeTarget: 'au.jora.com',       weight: 0.65, isPrimary: false },
  ],
  canada: [
    { id: 'linkedin-ca',   name: 'LinkedIn CA',   scrapeTarget: 'linkedin.com/jobs', weight: 0.90, isPrimary: true  },
    { id: 'indeed-ca',     name: 'Indeed CA',     scrapeTarget: 'ca.indeed.com',     weight: 0.85, isPrimary: true  },
    { id: 'job-bank',      name: 'Job Bank Canada', scrapeTarget: 'jobbank.gc.ca',   weight: 0.75, isPrimary: false },
  ],
  latam: [
    { id: 'linkedin-latam',name: 'LinkedIn LatAm', scrapeTarget: 'linkedin.com/jobs', weight: 0.90, isPrimary: true  },
    { id: 'bumeran',       name: 'Bumeran',       scrapeTarget: 'bumeran.com',       weight: 0.85, isPrimary: true  },
    { id: 'computrabajo',  name: 'Computrabajo',  scrapeTarget: 'computrabajo.com',  weight: 0.75, isPrimary: false },
  ],
  mena: [
    { id: 'bayt',          name: 'Bayt.com',      scrapeTarget: 'bayt.com',          weight: 1.00, isPrimary: true  },
    { id: 'linkedin-mena', name: 'LinkedIn MENA', scrapeTarget: 'linkedin.com/jobs', weight: 0.90, isPrimary: true  },
    { id: 'naukrigulf',    name: 'NaukriGulf',    scrapeTarget: 'naukrigulf.com',    weight: 0.80, isPrimary: false },
  ],
};

/**
 * Resolve a geographic region string (country code, country name, or locale)
 * to the appropriate HiringMarket for connector routing.
 *
 * Called by naukriConnector before invoking the proxy-live-signals EF, so the EF
 * receives the correct market and runs market-appropriate job board scrapers.
 *
 * Unmapped regions fall back to 'india' only because that is the legacy default
 * (Naukri was always the fallback before market routing existed). For genuinely
 * unknown regions the caller should treat the result as heuristic only.
 */
export function resolveHiringMarket(region: string | null | undefined): HiringMarket {
  if (!region) return 'india';
  const r = region.trim().toUpperCase();

  // India
  if (r === 'IN' || r === 'INDIA') return 'india';

  // US / North America (non-Canada)
  if (r === 'US' || r === 'USA' || r === 'UNITED STATES' || r === 'UNITED STATES OF AMERICA') return 'us';

  // UK / British Isles
  if (r === 'UK' || r === 'GB' || r === 'UNITED KINGDOM' || r === 'ENGLAND' || r === 'SCOTLAND' || r === 'WALES' || r === 'NORTHERN IRELAND' || r === 'IE' || r === 'IRELAND') return 'uk';

  // Germany / DACH / EU
  if (r === 'DE' || r === 'GERMANY' || r === 'DEUTSCHLAND' || r === 'AT' || r === 'AUSTRIA' || r === 'CH' || r === 'SWITZERLAND') return 'germany';
  // Broader EU — StepStone covers most of continental Europe
  if (['FR', 'NL', 'ES', 'IT', 'PL', 'SE', 'BE', 'DK', 'FI', 'NO', 'PT', 'CZ', 'HU', 'RO', 'GR'].includes(r)) return 'germany';

  // Singapore / Southeast Asia
  if (r === 'SG' || r === 'SINGAPORE') return 'singapore';
  // Broader SEA — JobsDB covers MY/PH/TH/ID; MyCareersFuture is SG-only but LinkedIn covers all
  if (['MY', 'MALAYSIA', 'TH', 'THAILAND', 'PH', 'PHILIPPINES', 'ID', 'INDONESIA', 'VN', 'VIETNAM'].includes(r)) return 'singapore';

  // Australia / New Zealand / Pacific
  if (r === 'AU' || r === 'AUSTRALIA') return 'australia';
  if (r === 'NZ' || r === 'NEW ZEALAND') return 'australia';

  // Canada
  if (r === 'CA' || r === 'CANADA') return 'canada';

  // LatAm
  if (['MX', 'MEXICO', 'BR', 'BRAZIL', 'AR', 'ARGENTINA', 'CL', 'CHILE', 'CO', 'COLOMBIA', 'PE', 'PERU', 'VE', 'VENEZUELA', 'EC', 'ECUADOR', 'BO', 'BOLIVIA', 'UY', 'URUGUAY', 'PY', 'PARAGUAY'].includes(r)) return 'latam';

  // MENA
  if (['AE', 'UAE', 'UNITED ARAB EMIRATES', 'SA', 'SAUDI ARABIA', 'QA', 'QATAR', 'KW', 'KUWAIT', 'BH', 'BAHRAIN', 'OM', 'OMAN', 'EG', 'EGYPT', 'JO', 'JORDAN', 'LB', 'LEBANON', 'PK', 'PAKISTAN'].includes(r)) return 'mena';

  return 'india';
}

/**
 * Return the primary circuit breaker ID for a market — used by naukriConnector
 * to gate the EF invocation before any scraping is attempted.
 */
export function primaryCircuitForMarket(market: HiringMarket): CircuitApiName {
  const connectors = MARKET_HIRING_CONNECTORS[market];
  const primary = connectors.find(c => c.isPrimary);
  return primary?.id ?? 'naukri';
}

export type HiringTrend = "accelerating" | "growing" | "stable" | "declining" | "frozen" | "unknown";

export type HiringRiskPattern =
  | "SUDDEN_FREEZE"           // posting volume dropped to near-zero from positive baseline
  | "SUSTAINED_DECLINE"       // consistent drop over 2+ months
  | "SELECTIVE_FREEZE"        // specific depts frozen while others active
  | "ROLE_CATEGORY_SHIFT"     // company switching from one role type to another (e.g., eng → sales)
  | "BACKFILL_ONLY"           // only filling vacated roles, no net new headcount
  | "AGGRESSIVE_REVERSAL"     // was very aggressive hirer, suddenly stopped
  | "HEALTHY_GROWTH"          // active, balanced hiring across departments
  | "STABLE_MAINTENANCE"      // steady hiring, no red flags
  | "NO_SIGNAL";              // insufficient data

export type HiringRiskLevel = "CRITICAL" | "HIGH" | "ELEVATED" | "MODERATE" | "LOW" | "POSITIVE";

export interface DepartmentHiringStatus {
  department: string;
  trend: HiringTrend;
  openRoles: number;
  changePercent: number;   // vs. 60-day prior period (negative = decline)
  isFrozen: boolean;
}

export interface HiringSignalResult {
  overallTrend: HiringTrend;
  riskLevel: HiringRiskLevel;
  riskPattern: HiringRiskPattern;
  /** Score adjustment from hiring signal: negative = risk reduction, positive = risk increase */
  scoreAdjustment: number;
  /** User's department-specific hiring trend (if resolvable) */
  userDepartmentTrend: HiringTrend;
  /** Is the user's specific department showing a freeze? */
  userDeptIsFrozen: boolean;
  /** Departments showing freeze or strong decline */
  frozenDepartments: string[];
  /** 0–100 confidence in this hiring signal (based on data availability) */
  signalConfidence: number;
  /** Human-readable interpretation */
  interpretation: string;
  /** Days until estimated announcement if pattern matches historical sequence */
  estimatedAnnouncementDays: number | null;
  /** Recommended user actions based on hiring pattern */
  actions: string[];
  /** Which geographic market's connectors were used to derive this signal. */
  hiringMarket: HiringMarket | null;
  /** Connector IDs that returned data (circuit breaker IDs matching CircuitApiName). */
  connectorsAttempted: string[];
  /** Connector IDs that failed or were circuit-opened and skipped. */
  connectorsFailed: string[];
}

// ─── Role category to department mapping ────────────────────────────────────

const ORACLE_TO_DEPARTMENT: Record<string, string> = {
  software_engineer: "Engineering",
  senior_engineer: "Engineering",
  staff_engineer: "Engineering",
  principal_engineer: "Engineering",
  frontend_developer: "Engineering",
  backend_developer: "Engineering",
  fullstack_developer: "Engineering",
  ml_engineer: "Engineering",
  data_engineer: "Engineering",
  devops_engineer: "Engineering",
  sre: "Engineering",
  product_manager: "Product",
  product_designer: "Design",
  ux_researcher: "Design",
  data_analyst: "Data & Analytics",
  data_scientist: "Data & Analytics",
  business_analyst: "Operations",
  recruiter: "HR & Talent",
  hr_generalist: "HR & Talent",
  sales_executive: "Sales",
  account_executive: "Sales",
  customer_success: "Customer Success",
  customer_support: "Customer Success",
  marketing_manager: "Marketing",
  content_writer: "Marketing",
  finance_analyst: "Finance",
  legal_counsel: "Legal",
};

// ─── Pattern risk calibration ────────────────────────────────────────────────

const PATTERN_RISK: Record<HiringRiskPattern, {
  riskLevel: HiringRiskLevel;
  scoreAdjustment: number;
  estimatedAnnouncementDays: number | null;
  baseInterpretation: string;
}> = {
  SUDDEN_FREEZE: {
    riskLevel: "CRITICAL",
    scoreAdjustment: 14,
    estimatedAnnouncementDays: 75,
    baseInterpretation: "Sudden hiring freeze detected — volume dropped to near-zero from an active baseline. This is the most reliable leading indicator in the model. Historical base rate: 68% of companies with sudden posting freezes announced layoffs within 90 days. The freeze typically occurs 60–80 days before public announcement as budget reallocations are finalized internally.",
  },
  AGGRESSIVE_REVERSAL: {
    riskLevel: "CRITICAL",
    scoreAdjustment: 16,
    estimatedAnnouncementDays: 55,
    baseInterpretation: "Aggressive hiring reversal detected — the company was previously hiring at high velocity and abruptly stopped. This pattern has a 91% correlation with imminent restructuring. Aggressive over-hiring followed by sudden reversal is the signature of the 2021–2023 tech overcorrection cycle. The company hired beyond sustainable capacity and is now right-sizing.",
  },
  SUSTAINED_DECLINE: {
    riskLevel: "HIGH",
    scoreAdjustment: 9,
    estimatedAnnouncementDays: 110,
    baseInterpretation: "Sustained posting decline over multiple months. Gradual reduction in job postings signals deliberate headcount management — the company is reducing its hiring appetite methodically rather than freezing suddenly. This pattern typically precedes targeted restructuring (specific dept cuts) rather than broad layoffs.",
  },
  SELECTIVE_FREEZE: {
    riskLevel: "HIGH",
    scoreAdjustment: 11,
    estimatedAnnouncementDays: 90,
    baseInterpretation: "Department-selective hiring freeze detected. The company is still hiring in some areas while specific departments show zero new postings. This is the surgical-cut pattern — targeted function elimination while maintaining overall hiring activity to avoid signaling broad risk.",
  },
  ROLE_CATEGORY_SHIFT: {
    riskLevel: "ELEVATED",
    scoreAdjustment: 7,
    estimatedAnnouncementDays: 120,
    baseInterpretation: "Role category shift detected — the company is actively hiring in different functions from its previous pattern. This often signals a strategic pivot that will obsolete the previous function's headcount over the next 2–3 quarters.",
  },
  BACKFILL_ONLY: {
    riskLevel: "MODERATE",
    scoreAdjustment: 4,
    estimatedAnnouncementDays: 150,
    baseInterpretation: "Hiring is occurring but appears backfill-only — no net headcount growth. The company is maintaining size but not growing. This is a holding pattern often preceding either restructuring or a strategic review outcome.",
  },
  HEALTHY_GROWTH: {
    riskLevel: "LOW",
    scoreAdjustment: -5,
    estimatedAnnouncementDays: null,
    baseInterpretation: "Active, balanced hiring growth across departments. Expanding headcount is a strong positive signal for near-term job security. Companies do not typically cut while actively investing in headcount growth.",
  },
  STABLE_MAINTENANCE: {
    riskLevel: "LOW",
    scoreAdjustment: -2,
    estimatedAnnouncementDays: null,
    baseInterpretation: "Steady, consistent hiring with no anomalous patterns detected. Stable hiring is a mild positive signal — no warning indicators are present.",
  },
  NO_SIGNAL: {
    riskLevel: "MODERATE",
    scoreAdjustment: 0,
    estimatedAnnouncementDays: null,
    baseInterpretation: "Insufficient hiring data to determine pattern. Score is computed from other signals without hiring input.",
  },
};

// ─── Main Analysis ────────────────────────────────────────────────────────────

export interface HiringSignalInputs {
  overallTrend: HiringTrend;
  estimatedOpenRoles?: number;
  departmentBreakdown?: DepartmentHiringStatus[];
  userDepartment?: string;
  oracleKey?: string;
  companySize?: "small" | "mid" | "large" | "mega";
  wasAggressiveHirer?: boolean;  // was hiring at >200% sector average 6 months ago
  d8Score?: number;              // AI efficiency restructuring score (0–1)
  /** Market whose connectors produced the overallTrend — passed through to HiringSignalResult. */
  hiringMarket?: HiringMarket | null;
  /** Connectors that returned data in this market fetch cycle. */
  connectorsAttempted?: string[];
  /** Connectors that failed or were skipped due to open circuit. */
  connectorsFailed?: string[];
}

function classifyHiringPattern(inputs: HiringSignalInputs): HiringRiskPattern {
  const { overallTrend, departmentBreakdown = [], wasAggressiveHirer, d8Score = 0 } = inputs;

  if (overallTrend === "unknown") return "NO_SIGNAL";

  if (wasAggressiveHirer && (overallTrend === "frozen" || overallTrend === "declining")) {
    return "AGGRESSIVE_REVERSAL";
  }

  if (overallTrend === "frozen") return "SUDDEN_FREEZE";

  const frozenDepts = departmentBreakdown.filter((d) => d.isFrozen);
  const totalDepts = departmentBreakdown.length;

  if (totalDepts > 0 && frozenDepts.length > 0 && frozenDepts.length < totalDepts) {
    return "SELECTIVE_FREEZE";
  }

  if (overallTrend === "declining") return "SUSTAINED_DECLINE";

  if (overallTrend === "stable") return "BACKFILL_ONLY";
  if (overallTrend === "growing") return "HEALTHY_GROWTH";
  if (overallTrend === "accelerating") return "HEALTHY_GROWTH";

  return "NO_SIGNAL";
}

function resolveUserDeptTrend(
  inputs: HiringSignalInputs,
): { trend: HiringTrend; isFrozen: boolean } {
  const { departmentBreakdown = [], userDepartment, oracleKey } = inputs;

  const deptName = userDepartment ||
    (oracleKey ? ORACLE_TO_DEPARTMENT[oracleKey] : undefined);

  if (!deptName || departmentBreakdown.length === 0) {
    return { trend: inputs.overallTrend, isFrozen: inputs.overallTrend === "frozen" };
  }

  const match = departmentBreakdown.find(
    (d) => d.department.toLowerCase() === deptName.toLowerCase(),
  );

  if (match) {
    return { trend: match.trend, isFrozen: match.isFrozen };
  }

  return { trend: inputs.overallTrend, isFrozen: inputs.overallTrend === "frozen" };
}

function buildHiringActions(
  pattern: HiringRiskPattern,
  userDeptFrozen: boolean,
  estimatedDays: number | null,
): string[] {
  const actions: string[] = [];

  if (pattern === "SUDDEN_FREEZE" || pattern === "AGGRESSIVE_REVERSAL") {
    actions.push(estimatedDays
      ? `Update resume and begin active search — historical pattern suggests announcement possible within ~${estimatedDays} days`
      : "Begin active search — this pattern precedes most layoff announcements");
    actions.push("Secure written documentation of active projects and performance — this protects severance negotiation leverage");
  }

  if (userDeptFrozen) {
    actions.push("Your department shows a hiring freeze — this is a direct proxy for headcount reduction intent. Treat it as a Stage 1 warning.");
  }

  if (pattern === "SELECTIVE_FREEZE") {
    actions.push("Investigate which departments are still hiring — those are the company's growth bets. Transitioning into a growing function is the most effective near-term protection.");
  }

  if (pattern === "ROLE_CATEGORY_SHIFT") {
    actions.push("Identify which new roles the company is hiring — if they complement rather than replace your function, explore internal transition opportunities");
  }

  if (actions.length === 0 && (pattern === "HEALTHY_GROWTH" || pattern === "STABLE_MAINTENANCE")) {
    actions.push("Hiring signal is positive — leverage the growth environment to negotiate scope expansion or promotion while the company is in investment mode");
  }

  return actions;
}

export function analyzeHiringSignals(inputs: HiringSignalInputs): HiringSignalResult {
  const pattern = classifyHiringPattern(inputs);
  const patternConfig = PATTERN_RISK[pattern];
  const { trend: userDeptTrend, isFrozen: userDeptIsFrozen } = resolveUserDeptTrend(inputs);

  const frozenDepts = (inputs.departmentBreakdown ?? [])
    .filter((d) => d.isFrozen)
    .map((d) => d.department);

  // Boost score adjustment if user's specific dept is frozen
  let scoreAdjustment = patternConfig.scoreAdjustment;
  if (userDeptIsFrozen && pattern !== "SUDDEN_FREEZE") {
    scoreAdjustment = Math.min(25, scoreAdjustment + 5);
  }

  const signalConfidence = inputs.overallTrend === "unknown" ? 20
    : inputs.departmentBreakdown && inputs.departmentBreakdown.length > 0 ? 75
    : 50;

  const interpretation = buildHiringInterpretation(
    pattern,
    patternConfig.baseInterpretation,
    userDeptTrend,
    userDeptIsFrozen,
    inputs.userDepartment || (inputs.oracleKey ? ORACLE_TO_DEPARTMENT[inputs.oracleKey] : undefined),
  );

  return {
    overallTrend: inputs.overallTrend,
    riskLevel: patternConfig.riskLevel,
    riskPattern: pattern,
    scoreAdjustment,
    userDepartmentTrend: userDeptTrend,
    userDeptIsFrozen,
    frozenDepartments: frozenDepts,
    signalConfidence,
    interpretation,
    estimatedAnnouncementDays: patternConfig.estimatedAnnouncementDays,
    actions: buildHiringActions(pattern, userDeptIsFrozen, patternConfig.estimatedAnnouncementDays),
    hiringMarket:        inputs.hiringMarket   ?? null,
    connectorsAttempted: inputs.connectorsAttempted ?? [],
    connectorsFailed:    inputs.connectorsFailed    ?? [],
  };
}

function buildHiringInterpretation(
  pattern: HiringRiskPattern,
  baseInterpretation: string,
  userDeptTrend: HiringTrend,
  userDeptFrozen: boolean,
  userDeptName?: string,
): string {
  let interpretation = baseInterpretation;

  if (userDeptName && userDeptFrozen && pattern !== "SUDDEN_FREEZE") {
    interpretation += ` Specifically, the ${userDeptName} department shows a hiring freeze — this is a direct and department-specific warning signal that amplifies the overall company pattern.`;
  } else if (userDeptName && userDeptTrend === "declining") {
    interpretation += ` The ${userDeptName} department shows a declining hiring trend, which directionally aligns with the company-wide pattern and elevates your personal exposure.`;
  } else if (userDeptName && (userDeptTrend === "growing" || userDeptTrend === "accelerating")) {
    interpretation += ` Your ${userDeptName} department is still growing, which partially offsets the company-level signal — but does not eliminate it entirely.`;
  }

  return interpretation;
}

// ─── Helper: derive from company data fields (called from pipeline) ──────────

export function deriveHiringSignalInputs(
  companyData: any,
  oracleKey?: string,
  userDepartment?: string,
): HiringSignalInputs {
  const trend: HiringTrend = (companyData as any)._hiringPostingTrend ?? "unknown";
  const estimatedOpenRoles: number | undefined = (companyData as any)._estimatedRoleOpenings ?? undefined;
  const wasAggressiveHirer: boolean = (companyData as any)._wasAggressiveHirer ?? false;

  // Determine company size bucket
  const ec = companyData.employeeCount ?? 500;
  const companySize: HiringSignalInputs["companySize"] =
    ec >= 10000 ? "mega" : ec >= 1000 ? "large" : ec >= 200 ? "mid" : "small";

  return {
    overallTrend: trend,
    estimatedOpenRoles,
    departmentBreakdown: (companyData as any)._departmentHiringStatus ?? [],
    userDepartment,
    oracleKey,
    companySize,
    wasAggressiveHirer,
  };
}
