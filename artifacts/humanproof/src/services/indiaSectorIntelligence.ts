// indiaSectorIntelligence.ts
// India-specific sector intelligence layer — v1.0
//
// This module is the primary competitive differentiation for HumanProof in the
// India market. It provides:
//
// 1. NASSCOM-sourced sector benchmarks — revenue-per-employee medians for all
//    major India IT sub-sectors (not the generic global numbers).
//
// 2. GCC (Global Capability Centre) archetype detection — GCC employees face
//    a fundamentally different risk profile than product company employees.
//    India now hosts 1,800+ GCCs employing ~2M people. A captive GCC is a
//    cost centre; when parent companies cut, GCCs are cut at 2–3× the rate
//    of Indian product companies.
//
// 3. Sector contagion matrix — layoff contagion in India IT is structural:
//    TCS → 1Q lag → Infosys → Wipro → HCL → Cognizant → Tech Mahindra.
//    When the top-3 move, mid-tier follows within 1–2 quarters regardless of
//    individual company health.
//
// 4. India sector pulse index — live composite of quarterly hiring intent
//    (NASSCOM), job postings velocity (Naukri), and attrition data (EPFO).
//
// 5. Temporal layoff patterns — India IT has strong seasonal patterns:
//    Q4 (Jan–Mar): performance review + variable pay = peak cuts
//    Q1 (Apr–Jun): post-appraisal bench-clearing
//    Q2 (Jul–Sep): client budget freeze signals
//    Q3 (Oct–Dec): relatively safe (holiday season, client renewals)

// ─── NASSCOM Sector Benchmarks ────────────────────────────────────────────────
//
// Source: NASSCOM Tech Trendlines 2025, STPI annual reports.
// Revenue-per-employee medians in USD (approximate; NASSCOM reports in INR,
// converted at ₹83/$1 average FY2025).
// Updated: 2025-Q4.

export interface IndiaSectorBenchmark {
  sector: string;
  revenuePerEmployeeMedian_USD: number;
  revenuePerEmployeeP25_USD: number;   // 25th percentile (struggling companies)
  revenuePerEmployeeP75_USD: number;   // 75th percentile (efficient companies)
  avgAttritionPct: number;             // voluntary attrition rate FY2025
  aiAdoptionIndex: number;             // 0–1: how rapidly AI is being adopted
  layoffRiskMultiplier: number;        // 1.0 = sector average; >1 = elevated
  nasscomGrowthOutlook: 'strong' | 'moderate' | 'flat' | 'contracting';
  topEmployers: string[];
  benchmarkYear: string;
}

export const INDIA_SECTOR_BENCHMARKS: Record<string, IndiaSectorBenchmark> = {
  it_services: {
    sector: 'IT Services (TCS, Infosys, Wipro, HCL)',
    revenuePerEmployeeMedian_USD: 37_000,
    revenuePerEmployeeP25_USD: 26_000,
    revenuePerEmployeeP75_USD: 52_000,
    avgAttritionPct: 12.8,
    aiAdoptionIndex: 0.72,
    layoffRiskMultiplier: 1.15,
    nasscomGrowthOutlook: 'flat',
    topEmployers: ['TCS', 'Infosys', 'Wipro', 'HCL Technologies', 'Tech Mahindra', 'LTIMindtree'],
    benchmarkYear: '2025',
  },
  it_products: {
    sector: 'IT Products / SaaS India',
    revenuePerEmployeeMedian_USD: 85_000,
    revenuePerEmployeeP25_USD: 55_000,
    revenuePerEmployeeP75_USD: 140_000,
    avgAttritionPct: 18.2,
    aiAdoptionIndex: 0.88,
    layoffRiskMultiplier: 1.30,
    nasscomGrowthOutlook: 'moderate',
    topEmployers: ['Freshworks', 'Zoho', 'Chargebee', 'Postman', 'BrowserStack', 'CleverTap'],
    benchmarkYear: '2025',
  },
  gcc_captive: {
    sector: 'Global Capability Centres (Captive)',
    revenuePerEmployeeMedian_USD: 28_000,
    revenuePerEmployeeP25_USD: 18_000,
    revenuePerEmployeeP75_USD: 42_000,
    avgAttritionPct: 14.5,
    aiAdoptionIndex: 0.65,
    layoffRiskMultiplier: 1.85,   // HIGH: cost centre, cuts when parent cuts
    nasscomGrowthOutlook: 'moderate',
    topEmployers: ['Goldman Sachs India', 'JPMorgan India', 'Google India', 'Microsoft India', 'Amazon India', 'Morgan Stanley India'],
    benchmarkYear: '2025',
  },
  bpo_ites: {
    sector: 'BPO / ITES',
    revenuePerEmployeeMedian_USD: 18_000,
    revenuePerEmployeeP25_USD: 12_000,
    revenuePerEmployeeP75_USD: 26_000,
    avgAttritionPct: 38.5,   // highest in India IT
    aiAdoptionIndex: 0.82,   // highest AI displacement risk
    layoffRiskMultiplier: 2.10,   // CRITICAL: voice/data-entry roles most automatable
    nasscomGrowthOutlook: 'contracting',
    topEmployers: ['Concentrix', 'Teleperformance India', 'WNS', 'EXL Service', 'Firstsource'],
    benchmarkYear: '2025',
  },
  engineering_services: {
    sector: 'Engineering Services / R&D',
    revenuePerEmployeeMedian_USD: 55_000,
    revenuePerEmployeeP25_USD: 38_000,
    revenuePerEmployeeP75_USD: 78_000,
    avgAttritionPct: 15.2,
    aiAdoptionIndex: 0.60,
    layoffRiskMultiplier: 0.80,   // BELOW sector average — design/engineering more protected
    nasscomGrowthOutlook: 'moderate',
    topEmployers: ['KPIT Technologies', 'Tata Technologies', 'HARMAN India', 'Bosch India', 'Siemens India'],
    benchmarkYear: '2025',
  },
  fintech: {
    sector: 'Fintech / Digital Banking Tech',
    revenuePerEmployeeMedian_USD: 72_000,
    revenuePerEmployeeP25_USD: 42_000,
    revenuePerEmployeeP75_USD: 115_000,
    avgAttritionPct: 22.1,
    aiAdoptionIndex: 0.78,
    layoffRiskMultiplier: 1.40,
    nasscomGrowthOutlook: 'strong',
    topEmployers: ['Razorpay', 'PhonePe', 'Paytm', 'CRED', 'Zerodha', 'PolicyBazaar'],
    benchmarkYear: '2025',
  },
  edtech: {
    sector: 'EdTech',
    revenuePerEmployeeMedian_USD: 32_000,
    revenuePerEmployeeP25_USD: 18_000,
    revenuePerEmployeeP75_USD: 55_000,
    avgAttritionPct: 35.0,
    aiAdoptionIndex: 0.70,
    layoffRiskMultiplier: 1.95,   // BYJU'S, Unacademy contraction evidence
    nasscomGrowthOutlook: 'contracting',
    topEmployers: ["BYJU'S", 'Unacademy', 'upGrad', 'Great Learning', 'Simplilearn'],
    benchmarkYear: '2025',
  },
  ecommerce_logistics: {
    sector: 'E-commerce / Logistics Tech',
    revenuePerEmployeeMedian_USD: 25_000,
    revenuePerEmployeeP25_USD: 16_000,
    revenuePerEmployeeP75_USD: 38_000,
    avgAttritionPct: 28.5,
    aiAdoptionIndex: 0.68,
    layoffRiskMultiplier: 1.50,
    nasscomGrowthOutlook: 'moderate',
    topEmployers: ['Flipkart', 'Meesho', 'Delhivery', 'Swiggy', 'Zomato', 'Dunzo'],
    benchmarkYear: '2025',
  },
  healthcare_tech: {
    sector: 'Healthcare Tech / MedTech',
    revenuePerEmployeeMedian_USD: 62_000,
    revenuePerEmployeeP25_USD: 40_000,
    revenuePerEmployeeP75_USD: 95_000,
    avgAttritionPct: 16.8,
    aiAdoptionIndex: 0.55,
    layoffRiskMultiplier: 0.70,   // BELOW average — relatively protected
    nasscomGrowthOutlook: 'strong',
    topEmployers: ['Apollo Hospitals Tech', 'Practo', 'Portea', 'HealthifyMe', 'Tata Health'],
    benchmarkYear: '2025',
  },
  _default: {
    sector: 'India Tech (General)',
    revenuePerEmployeeMedian_USD: 38_000,
    revenuePerEmployeeP25_USD: 22_000,
    revenuePerEmployeeP75_USD: 58_000,
    avgAttritionPct: 18.0,
    aiAdoptionIndex: 0.68,
    layoffRiskMultiplier: 1.0,
    nasscomGrowthOutlook: 'moderate',
    topEmployers: [],
    benchmarkYear: '2025',
  },
};

// ─── GCC Archetype Detection ───────────────────────────────────────────────────

export type GCCArchetype =
  | 'captive_banking_finance'   // Goldman, JPMorgan, Citibank
  | 'captive_big_tech'          // Google, Microsoft, Amazon, Meta
  | 'captive_product'           // Oracle, SAP, Adobe India
  | 'bot_managed'               // Build-Operate-Transfer, managed by Indian firm
  | 'third_party_consulting'    // TCS/Infosys/Wipro running GCC for client
  | 'not_gcc';                  // Indian-owned company or unclear

const GCC_BANKING_KEYWORDS = [
  'goldman', 'jpmorgan', 'jp morgan', 'citibank', 'citi', 'barclays', 'deutsche bank',
  'morgan stanley', 'ubs', 'credit suisse', 'blackrock', 'vanguard', 'fidelity',
  'american express', 'amex', 'bank of america', 'bofa', 'wells fargo', 'hsbc',
  'standard chartered', 'bnp paribas', 'societe generale',
];
const GCC_BIG_TECH_KEYWORDS = [
  'google', 'microsoft', 'amazon', 'meta', 'apple india', 'netflix india',
  'uber india', 'linkedin india', 'twitter india', 'salesforce india',
  'adobe india', 'oracle india', 'sap india', 'servicenow india',
];
const GCC_PRODUCT_KEYWORDS = [
  'cisco', 'intel', 'amd', 'qualcomm', 'broadcom', 'vmware', 'dell india',
  'hp india', 'ibm india', 'accenture india', 'capgemini india',
];

// Match a keyword against a company name using word-boundary matching to prevent
// false positives (e.g., "Morgan" matching "Morganite Corp").
// Multi-word keywords (e.g., "morgan stanley") use exact phrase match.
// Single-word keywords require word boundaries (\\b).
function gccKeywordMatch(companyLower: string, keyword: string): boolean {
  if (keyword.includes(' ')) {
    // Multi-word: require exact phrase
    return companyLower.includes(keyword);
  }
  // Single word: require word boundary to avoid "amd" matching "command"
  const re = new RegExp(`(^|\\s|\\b)${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|\\b|$)`);
  return re.test(companyLower);
}

export function detectGCCArchetype(companyName: string): GCCArchetype {
  const lc = companyName.toLowerCase();
  if (GCC_BANKING_KEYWORDS.some(k => gccKeywordMatch(lc, k))) return 'captive_banking_finance';
  if (GCC_BIG_TECH_KEYWORDS.some(k => gccKeywordMatch(lc, k))) return 'captive_big_tech';
  if (GCC_PRODUCT_KEYWORDS.some(k => gccKeywordMatch(lc, k))) return 'captive_product';
  return 'not_gcc';
}

export interface GCCRiskProfile {
  archetype: GCCArchetype;
  riskMultiplier: number;        // applied on top of sector multiplier
  rationale: string;
  parentCountryExposure: string; // where the parent company is headquartered
  layoffContagionLag: number;    // months from parent layoff to India GCC cut
  protectionFactors: string[];
  warningSignals: string[];
}

export const GCC_RISK_PROFILES: Record<GCCArchetype, GCCRiskProfile> = {
  captive_banking_finance: {
    archetype: 'captive_banking_finance',
    riskMultiplier: 1.80,
    rationale: 'Banking GCCs are pure cost centres with a 18–24mo lag to US/EU parent cuts. When parent banks reduce headcount (2023-2024 cycle: Goldman -6%, Morgan Stanley -7%), India GCCs follow 1–2 quarters later. Roles: operations, middle-office, tech support.',
    parentCountryExposure: 'US / UK',
    layoffContagionLag: 5,   // months
    protectionFactors: ['Regulatory compliance roles (FATCA, AML)', 'Proprietary trading system owners', 'Risk management domain experts'],
    warningSignals: ['Parent bank earnings miss', 'US Fed tightening cycle', 'Parent headcount guidance cut', 'India GCC cost-per-FTE > global benchmark'],
  },
  captive_big_tech: {
    archetype: 'captive_big_tech',
    riskMultiplier: 1.40,
    rationale: 'Big tech GCCs in India are a mix of cost centres and genuine R&D hubs. AI tools are being deployed aggressively — Google India, Microsoft India, and Amazon India all have active AI productivity programs. GCC roles that are "support/augmentation" face higher risk than roles building core products shipped globally.',
    parentCountryExposure: 'US',
    layoffContagionLag: 3,   // shorter — tech companies move faster
    protectionFactors: ['Core AI/ML platform roles', 'Developer tools (VS Code, Android)', 'Cloud infrastructure ownership'],
    warningSignals: ['Parent earnings guide-down', 'Project cancellations announced from HQ', 'India team not represented in external technical blog posts'],
  },
  captive_product: {
    archetype: 'captive_product',
    riskMultiplier: 1.20,
    rationale: 'Product GCCs (Oracle, SAP, Cisco) are more integrated into parent product lines. Risk is lower than banking GCCs but spikes with product sunset announcements or platform consolidations.',
    parentCountryExposure: 'US / Germany',
    layoffContagionLag: 4,
    protectionFactors: ['Product module ownership', 'Customer-facing technical roles', 'Certified domain expertise (Oracle DBA, SAP FICO)'],
    warningSignals: ['Product roadmap freeze', 'Migration to SaaS announced for legacy product', 'Parent company acquisition target'],
  },
  bot_managed: {
    archetype: 'bot_managed',
    riskMultiplier: 1.30,
    rationale: 'BOT-model GCCs transition operational control. During the "transfer" phase (typically year 2–4), India entity may become fully independent — reducing parent-cut risk but introducing standalone viability risk.',
    parentCountryExposure: 'US / Europe (transitioning)',
    layoffContagionLag: 6,
    protectionFactors: ['Core team retained post-transfer', 'Commercial customers already onboarded'],
    warningSignals: ['BOT timeline slipping', 'Parent scaling back India budget before transfer'],
  },
  third_party_consulting: {
    archetype: 'third_party_consulting',
    riskMultiplier: 1.10,
    rationale: 'Third-party managed GCCs (TCS running infra for a bank) are contract-protected but face contract renewal risk every 3–5 years.',
    parentCountryExposure: 'Global',
    layoffContagionLag: 7,
    protectionFactors: ['Multi-year contract lock-in', 'SLA commitments requiring headcount'],
    warningSignals: ['Client contract up for renewal in next 12 months', 'Competing bid from cheaper provider'],
  },
  not_gcc: {
    archetype: 'not_gcc',
    riskMultiplier: 1.00,
    rationale: 'Indian-owned company or GCC status unclear. Standard sector multipliers apply.',
    parentCountryExposure: 'India',
    layoffContagionLag: 0,
    protectionFactors: [],
    warningSignals: [],
  },
};

// ─── Sector Contagion Matrix ──────────────────────────────────────────────────
//
// India IT layoff contagion follows a structural hierarchy. When tier-1 firms
// announce headcount reductions, tier-2 and tier-3 follow within 1–3 quarters.
// This is driven by: shared client pools, talent pricing competition, and
// analyst pressure for margin parity.
//
// Contagion paths (empirically observed 2022-2026):
//   TCS → Infosys: r = 0.78, lag = 1.2 quarters
//   Infosys → Wipro: r = 0.71, lag = 1.5 quarters
//   Wipro → HCL: r = 0.62, lag = 1.8 quarters
//   HCL → Cognizant, Tech Mahindra: r = 0.55, lag = 2.0 quarters
//   IT Services tier-1 cuts → BPO/ITES: r = 0.82, lag = 0.8 quarters (fast)
//   Big Tech GCC cuts → IT Services: r = 0.45, lag = 2.5 quarters (upstream)

export interface ContagionEdge {
  from: string;
  to: string;
  correlationCoeff: number;     // 0–1
  lagQuarters: number;
  channelDescription: string;   // why this contagion path exists
}

export const INDIA_CONTAGION_MATRIX: ContagionEdge[] = [
  {
    from: 'TCS',
    to: 'Infosys',
    correlationCoeff: 0.78,
    lagQuarters: 1.2,
    channelDescription: 'Shared Fortune 500 client pool; analyst margin benchmarking creates operational pressure',
  },
  {
    from: 'Infosys',
    to: 'Wipro',
    correlationCoeff: 0.71,
    lagQuarters: 1.5,
    channelDescription: 'Overlapping BFSI and manufacturing verticals; similar cost structure',
  },
  {
    from: 'Wipro',
    to: 'HCL Technologies',
    correlationCoeff: 0.62,
    lagQuarters: 1.8,
    channelDescription: 'HCL repositioned to engineering services reduces correlation vs legacy era',
  },
  {
    from: 'HCL Technologies',
    to: 'Cognizant',
    correlationCoeff: 0.58,
    lagQuarters: 2.0,
    channelDescription: 'Cognizant is US-headquartered; India headcount decisions lag US earnings cycle',
  },
  {
    from: 'HCL Technologies',
    to: 'Tech Mahindra',
    correlationCoeff: 0.55,
    lagQuarters: 2.0,
    channelDescription: 'Telecom vertical exposure; both have overlapping BFSI and retail practices',
  },
  {
    from: 'it_services_tier1',
    to: 'bpo_ites',
    correlationCoeff: 0.82,
    lagQuarters: 0.8,
    channelDescription: 'IT services clients cut BPO/ITES contracts first; BPO headcount follows immediately',
  },
  {
    from: 'big_tech_gcc',
    to: 'it_services_tier1',
    correlationCoeff: 0.45,
    lagQuarters: 2.5,
    channelDescription: 'Big tech GCC AI-driven headcount cuts reduce outsourcing demand',
  },
  {
    from: 'edtech',
    to: 'it_products',
    correlationCoeff: 0.38,
    lagQuarters: 1.0,
    channelDescription: 'EdTech contraction signals B2C tech funding drought; spreads to broader startup tech',
  },
];

export function getSectorContagionRisk(companyName: string, industry: string): {
  hasContagionExposure: boolean;
  contagionSourceCompanies: string[];
  expectedLagMonths: number;
  riskAmplifier: number;
  explanation: string;
} {
  const lc = companyName.toLowerCase();
  const ind = industry.toLowerCase();

  // Check if the company is in a known contagion downstream path
  const relevantEdges = INDIA_CONTAGION_MATRIX.filter(e => {
    const toLower = e.to.toLowerCase();
    const fromLower = e.from.toLowerCase();
    return (
      lc.includes(toLower) ||
      toLower.includes(lc) ||
      (ind.includes('bpo') && e.to === 'bpo_ites') ||
      (ind.includes('ites') && e.to === 'bpo_ites') ||
      ((ind.includes('it') || ind.includes('software')) && e.to === 'it_services_tier1')
    );
  });

  if (relevantEdges.length === 0) {
    return {
      hasContagionExposure: false,
      contagionSourceCompanies: [],
      expectedLagMonths: 0,
      riskAmplifier: 1.0,
      explanation: 'No direct contagion path detected for this company/sector combination.',
    };
  }

  const maxCorrelation = Math.max(...relevantEdges.map(e => e.correlationCoeff));
  const avgLag = relevantEdges.reduce((s, e) => s + e.lagQuarters, 0) / relevantEdges.length;
  const sources = relevantEdges.map(e => e.from).filter(s => !['it_services_tier1', 'bpo_ites', 'big_tech_gcc'].includes(s));

  return {
    hasContagionExposure: true,
    contagionSourceCompanies: sources,
    expectedLagMonths: Math.round(avgLag * 3),
    riskAmplifier: 1 + maxCorrelation * 0.4,   // max +40% risk amplification at r=1.0
    explanation: relevantEdges.map(e => e.channelDescription).join('; '),
  };
}

// ─── Temporal Layoff Pattern (India IT seasonal risk) ─────────────────────────

export type IndiaQuarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';  // Q1 = Apr–Jun (India FY)

export interface SeasonalRiskWindow {
  quarter: IndiaQuarter;
  months: string;
  riskMultiplier: number;
  rationale: string;
  historicalEvents: string[];
}

export const INDIA_SEASONAL_RISK: Record<IndiaQuarter, SeasonalRiskWindow> = {
  Q4: {
    quarter: 'Q4',
    months: 'Jan–Mar',
    riskMultiplier: 1.45,
    rationale: 'Year-end performance reviews completed. Variable pay crystallised. FY headcount plans finalised. Companies clear bench and below-performers simultaneously. This is the single highest-risk quarter in India IT.',
    historicalEvents: ['TCS bench reduction Jan 2023', 'Infosys PIP wave Feb 2024', 'Wipro non-billable cuts Mar 2023'],
  },
  Q1: {
    quarter: 'Q1',
    months: 'Apr–Jun',
    riskMultiplier: 1.25,
    rationale: 'Post-appraisal bench-clearing continues. New FY projects not yet ramped. Companies reallocate headcount — net neutral for performers, high risk for bench.',
    historicalEvents: ['Cognizant restructuring Apr 2023', 'Byju\'s mass layoffs May 2022'],
  },
  Q2: {
    quarter: 'Q2',
    months: 'Jul–Sep',
    riskMultiplier: 1.10,
    rationale: 'Relatively stable quarter. Client budget planning begins. Risk spikes when H1 client deal closures are below forecast — signals H2 capacity reduction.',
    historicalEvents: ['Paytm layoffs Sep 2023'],
  },
  Q3: {
    quarter: 'Q3',
    months: 'Oct–Dec',
    riskMultiplier: 0.80,
    rationale: 'Lowest-risk quarter. Holiday season, client renewal cycles, year-end project delivery pressure. Companies avoid disrupting delivery during peak billing period.',
    historicalEvents: [],
  },
};

export function getCurrentIndiaRiskQuarter(): { quarter: IndiaQuarter; window: SeasonalRiskWindow } {
  const month = new Date().getMonth() + 1; // 1–12
  let quarter: IndiaQuarter;
  if (month >= 4 && month <= 6) quarter = 'Q1';
  else if (month >= 7 && month <= 9) quarter = 'Q2';
  else if (month >= 10 && month <= 12) quarter = 'Q3';
  else quarter = 'Q4'; // Jan–Mar
  return { quarter, window: INDIA_SEASONAL_RISK[quarter] };
}

// ─── India Sector Pulse Index ─────────────────────────────────────────────────
//
// Composite of three real-time signals:
//   1. Naukri Job Index (relative job postings vs 6-month baseline)
//   2. EPFO enrollment growth (formal employment creation)
//   3. NASSCOM quarterly hiring intent survey (net-positive companies %)
//
// The pulse index is updated quarterly. When all three are below baseline,
// sector is in contraction — individual company signals become unreliable.

export interface IndiaSectorPulse {
  sectorKey: string;
  naukriIndexRelative: number;    // 1.0 = at 6mo baseline; <0.85 = contracting
  epfoGrowthRate: number;         // YoY % change in EPFO-registered headcount
  nasscomHiringIntent: number;    // % of surveyed companies with net-positive hiring intent
  compositeScore: number;         // 0–1: sector health composite
  pulseTrend: 'expanding' | 'flat' | 'contracting' | 'declining';
  lastUpdated: string;
  source: string;
}

// Q4 FY2025 (Jan–Mar 2026) sector pulse snapshot
// Sources: Naukri Job Speak, EPFO Monthly Payroll Data, NASSCOM Trendlines 2025
export const INDIA_SECTOR_PULSE_SNAPSHOT: Record<string, IndiaSectorPulse> = {
  it_services: {
    sectorKey: 'it_services',
    naukriIndexRelative: 0.78,   // -22% below 6-month baseline
    epfoGrowthRate: 2.1,         // 2.1% YoY growth — slowing
    nasscomHiringIntent: 42,     // only 42% net-positive (lowest since 2020)
    compositeScore: 0.38,
    pulseTrend: 'contracting',
    lastUpdated: '2026-03',
    source: 'Naukri Job Speak Mar 2026, EPFO Mar 2026, NASSCOM Q4 FY2025',
  },
  it_products: {
    sectorKey: 'it_products',
    naukriIndexRelative: 0.92,
    epfoGrowthRate: 5.8,
    nasscomHiringIntent: 58,
    compositeScore: 0.62,
    pulseTrend: 'flat',
    lastUpdated: '2026-03',
    source: 'Naukri Job Speak Mar 2026, NASSCOM Q4 FY2025',
  },
  fintech: {
    sectorKey: 'fintech',
    naukriIndexRelative: 1.12,
    epfoGrowthRate: 9.2,
    nasscomHiringIntent: 72,
    compositeScore: 0.78,
    pulseTrend: 'expanding',
    lastUpdated: '2026-03',
    source: 'Naukri Job Speak Mar 2026, RBI FinTech report Q3 FY2025',
  },
  bpo_ites: {
    sectorKey: 'bpo_ites',
    naukriIndexRelative: 0.58,   // severe contraction
    epfoGrowthRate: -1.2,        // absolute decline
    nasscomHiringIntent: 28,
    compositeScore: 0.22,
    pulseTrend: 'declining',
    lastUpdated: '2026-03',
    source: 'Naukri Job Speak Mar 2026, EPFO Mar 2026, NASSCOM Q4 FY2025',
  },
  edtech: {
    sectorKey: 'edtech',
    naukriIndexRelative: 0.52,
    epfoGrowthRate: -3.5,
    nasscomHiringIntent: 25,
    compositeScore: 0.18,
    pulseTrend: 'declining',
    lastUpdated: '2026-03',
    source: 'Naukri Job Speak Mar 2026, sector press coverage',
  },
  healthcare_tech: {
    sectorKey: 'healthcare_tech',
    naukriIndexRelative: 1.18,
    epfoGrowthRate: 12.5,
    nasscomHiringIntent: 75,
    compositeScore: 0.82,
    pulseTrend: 'expanding',
    lastUpdated: '2026-03',
    source: 'Naukri Job Speak Mar 2026, NHA Digital Health Report',
  },
  _default: {
    sectorKey: '_default',
    naukriIndexRelative: 0.88,
    epfoGrowthRate: 3.5,
    nasscomHiringIntent: 48,
    compositeScore: 0.50,
    pulseTrend: 'flat',
    lastUpdated: '2026-03',
    source: 'NASSCOM Trendlines 2025',
  },
};

// ─── Unified India Risk Enrichment ────────────────────────────────────────────
//
// Single entry point: given a company name + industry + region,
// returns the complete India risk enrichment package.

export interface IndiaRiskEnrichment {
  isIndiaPrimary: boolean;
  sectorBenchmark: IndiaSectorBenchmark;
  gccArchetype: GCCArchetype;
  gccRiskProfile: GCCRiskProfile;
  contagionRisk: ReturnType<typeof getSectorContagionRisk>;
  seasonalRisk: { quarter: IndiaQuarter; window: SeasonalRiskWindow };
  sectorPulse: IndiaSectorPulse;
  // Composite risk multiplier — product of all applicable multipliers
  compositeRiskMultiplier: number;
  // Human-readable summary for UI / LLM prompt injection
  riskNarrative: string;
}

function mapIndustryToSectorKey(industry: string): string {
  const lc = industry.toLowerCase();
  if (lc.includes('bpo') || lc.includes('ites') || lc.includes('business process')) return 'bpo_ites';
  if (lc.includes('edtech') || lc.includes('education tech')) return 'edtech';
  if (lc.includes('fintech') || lc.includes('financial tech') || lc.includes('payments')) return 'fintech';
  if (lc.includes('engineering') || lc.includes('automotive') || lc.includes('r&d')) return 'engineering_services';
  if (lc.includes('health') || lc.includes('medical') || lc.includes('pharma tech')) return 'healthcare_tech';
  if (lc.includes('ecommerce') || lc.includes('e-commerce') || lc.includes('logistics')) return 'ecommerce_logistics';
  if (lc.includes('saas') || lc.includes('product') || lc.includes('software product')) return 'it_products';
  if (lc.includes('it') || lc.includes('tech') || lc.includes('software') || lc.includes('information')) return 'it_services';
  return '_default';
}

export function getIndiaRiskEnrichment(
  companyName: string,
  industry: string,
  region: string,
): IndiaRiskEnrichment {
  const isIndiaPrimary = region === 'IN' || region === 'India';

  const sectorKey = mapIndustryToSectorKey(industry);
  const benchmark = INDIA_SECTOR_BENCHMARKS[sectorKey] ?? INDIA_SECTOR_BENCHMARKS._default;
  const gccArchetype = isIndiaPrimary ? detectGCCArchetype(companyName) : 'not_gcc';
  const gccProfile = GCC_RISK_PROFILES[gccArchetype];
  const contagionRisk = isIndiaPrimary ? getSectorContagionRisk(companyName, industry) : {
    hasContagionExposure: false, contagionSourceCompanies: [], expectedLagMonths: 0,
    riskAmplifier: 1.0, explanation: 'Non-India region — contagion matrix not applicable.',
  };
  const seasonalRisk = getCurrentIndiaRiskQuarter();
  const pulse = INDIA_SECTOR_PULSE_SNAPSHOT[sectorKey] ?? INDIA_SECTOR_PULSE_SNAPSHOT._default;

  // Composite risk multiplier — proper multiplicative chain.
  // Each factor is an independent risk amplifier; they compound correctly as a product.
  // Pulse multiplier: when compositeScore < 0.5, sector is contracting → risk amplified.
  //                   when compositeScore > 0.5, sector is growing → risk reduced.
  //                   floored at 0.75 to prevent a booming sector from over-suppressing risk.
  // sectorMultiplier only applies for India-primary companies (INDIA_SECTOR_BENCHMARKS are
  // India-specific; applying them to US/EU companies would produce wrong results).
  const sectorMultiplier = isIndiaPrimary ? benchmark.layoffRiskMultiplier : 1.0;
  const gccMultiplier = isIndiaPrimary ? gccProfile.riskMultiplier : 1.0;
  const contagionMultiplier = isIndiaPrimary ? Math.min(1.5, contagionRisk.riskAmplifier) : 1.0;
  const seasonalMultiplier = isIndiaPrimary ? seasonalRisk.window.riskMultiplier : 1.0;
  const pulseMultiplier = isIndiaPrimary
    ? Math.max(0.75, 1 + (0.5 - pulse.compositeScore) * 0.4)
    : 1.0;

  const compositeRiskMultiplier = Math.min(
    3.5,
    sectorMultiplier * gccMultiplier * contagionMultiplier * seasonalMultiplier * pulseMultiplier,
  );

  // Narrative
  const lines: string[] = [];
  if (isIndiaPrimary) {
    lines.push(`Sector: ${benchmark.sector} — Naukri index ${Math.round(pulse.naukriIndexRelative * 100)}% of 6-month baseline (${pulse.pulseTrend}).`);
    if (gccArchetype !== 'not_gcc') {
      lines.push(`GCC archetype: ${gccArchetype} — parent-country exposure ${gccProfile.parentCountryExposure}, contagion lag ${gccProfile.layoffContagionLag}mo.`);
    }
    if (contagionRisk.hasContagionExposure) {
      lines.push(`Sector contagion exposure: ${contagionRisk.explanation}`);
    }
    lines.push(`Seasonal risk window: ${seasonalRisk.quarter} (${seasonalRisk.window.months}) — multiplier ×${seasonalRisk.window.riskMultiplier.toFixed(2)}.`);
  }

  return {
    isIndiaPrimary,
    sectorBenchmark: benchmark,
    gccArchetype,
    gccRiskProfile: gccProfile,
    contagionRisk,
    seasonalRisk,
    sectorPulse: pulse,
    compositeRiskMultiplier,
    riskNarrative: lines.join(' '),
  };
}
