// careerPathMarket.ts
// Transformation Layer — v5.0
//
// Problem: Career path advice like "Explore AI/LLM Systems Engineer, +40-70% salary,
// 12 months transition" has zero market grounding. Is there 1 opening or 10,000?
// Who is hiring? What does the actual bar look like?
//
// This module provides market-grounded intelligence for the most common transition paths:
// - Market size (realistic estimate of active openings India/global)
// - Top 5 hiring companies with context
// - What the actual hiring bar looks like (not "get a certification")
// - Realistic salary delta (median, not range)
// - Success rate for this transition (estimated from career twin data + research)

/** A regional opening count tied to a specific job-board source. */
export interface RegionalMarketOpenings {
  /** Active opening count in this region */
  count: number;
  /** Primary job-board / data source for this region. Examples:
   *  Germany → "StepStone", India → "Naukri", UK → "Reed", US → "Indeed". */
  source: string;
  /** ISO date string when the count was measured. Falls back to market.dataAsOf
   *  when not provided. */
  asOf?: string;
  /** Optional: the data is from a live scrape (vs. research baseline). */
  isLive?: boolean;
}

export interface CareerPathMarket {
  targetRole: string;
  /**
   * Estimated active openings in India at any given time.
   *
   * STALENESS WARNING: this is a hardcoded integer in a .ts source file.
   * It does not update automatically. The number reflects the labour market
   * at the time the file was last edited. Market opening counts can shift
   * ±30–50% within a single quarter during expansion/contraction cycles.
   *
   * Age is computed from `dataAsOf`. When age > MARKET_DATA_STALE_DAYS (90):
   * - The number is rendered with a "⚠ as of [quarter]" qualifier in the UI
   * - The action description adds a caveat recommending live verification
   */
  indiaOpenings: number;
  /** Estimated global openings — same staleness caveat as indiaOpenings */
  globalOpenings: number;
  /**
   * Region-specific openings keyed by regionKey ('germany' | 'uk' | 'usa' |
   * 'canada' | 'singapore' | 'australia' | 'uae' | 'india' | etc.).
   * Populated by marketIntelligenceService from the regional_openings JSONB
   * column. When absent for a user's region, the LLM prompt falls back to
   * globalOpenings WITH an explicit "region-specific data unavailable for
   * {region}" disclosure — never lies that India numbers apply globally.
   */
  regionalOpenings?: Record<string, RegionalMarketOpenings>;
  /** Top 5 companies actively hiring for this role in India */
  topHiringCompaniesIndia: string[];
  /** Top 5 companies globally */
  topHiringCompaniesGlobal: string[];
  /**
   * Region-keyed company lists — resolved in preference to topHiringCompaniesIndia/Global
   * for users in that specific region. Population is optional: only add when you have
   * verified, region-specific employer data (not guesses).
   */
  topHiringCompaniesByRegion?: Partial<Record<RegionKey, string[]>>;
  /**
   * Estimated active openings accessible in a fully-remote capacity
   * (OnlineJobs.ph, Upwork, LinkedIn remote, Remote.com, etc.).
   * Highly relevant for markets where local openings are limited but English
   * proficiency enables access to global remote roles (Philippines, India, LatAm).
   */
  remoteOpenings?: number;
  /** Top companies hiring for this role in a fully-remote capacity */
  topHiringCompaniesRemote?: string[];
  /**
   * Named per-region opening counts — primary static authoring path.
   * Preferred over regionalOpenings for hardcoded data; regionalOpenings
   * remains as the DB-override path (live / admin-curated).
   */
  us_openings?: number;
  uk_openings?: number;
  /** DE + FR + NL aggregate */
  eu_openings?: number;
  /** SG + AU aggregate */
  apac_openings?: number;
  canada_openings?: number;
  /** BR + MX aggregate */
  latam_openings?: number;
  /** UAE + SA aggregate */
  mena_openings?: number;
  topHiringCompaniesUS?: string[];
  topHiringCompaniesUK?: string[];
  topHiringCompaniesEU?: string[];
  topHiringCompaniesAPAC?: string[];
  topHiringCompaniesCanada?: string[];
  topHiringCompaniesLatAm?: string[];
  topHiringCompaniesMENA?: string[];
  /** Per-region median weeks to first interview (overrides root weeksToFirstInterview). */
  weeksToFirstInterviewByRegion?: Partial<Record<RegionKey, number>>;
  /** The actual bar — what hiring managers want to see (not "get a cert") */
  hiringBar: string;
  /** Typical hiring bar artifact — what you need to show */
  proofOfCompetency: string;
  /** Median salary delta (not range) vs typical outgoing role */
  medianSalaryDeltaPct: number;
  /** Estimated % of people who attempt this transition and land a role in 12 months */
  successRate12mPct: number;
  /** Primary signal: is this market growing, stable, or shrinking? */
  demandTrend: 'surging' | 'growing' | 'stable' | 'contracting';
  /** Time to first interview (not offer) from dedicated effort */
  weeksToFirstInterview: number;
  /**
   * ISO date string for when the opening counts and salary data were last
   * measured/verified. Used by `isMarketDataStale()` to compute age.
   * Must be updated whenever the hardcoded numbers are refreshed.
   * Format: 'YYYY-MM-DD'
   */
  dataAsOf: string;
  /** Human-readable source citation */
  dataSource: string;
}

/**
 * Maximum age in days before market opening counts are considered stale.
 * Opening counts in fast-moving roles (AI/LLM) can shift 30-50% in one quarter.
 * 90 days = one typical labour market reporting cycle.
 */
export const MARKET_DATA_STALE_DAYS = 90;

/**
 * Age threshold (days) for the amber freshness WARNING shown inline next to
 * every opening count. Distinct from MARKET_DATA_STALE_DAYS (which is the
 * hard staleness gate used by isMarketDataStale).
 *
 * 60 days = two typical sprint cycles; opening counts can shift ±15-25% in
 * this window for fast-moving roles. Users making pivot decisions deserve to
 * see this warning before acting on the numbers.
 */
export const MARKET_DATA_FRESH_WARNING_DAYS = 60;

/**
 * Returns true when market data is between 60 and 90 days old — old enough
 * to warrant an amber inline warning but not yet at the hard staleness gate.
 * When isMarketDataStale() is also true (>90 days), the stale indicator takes
 * precedence and this function is redundant.
 */
export function isMarketDataFreshWarning(market: CareerPathMarket): boolean {
  const ageMs = Date.now() - new Date(market.dataAsOf).getTime();
  const ageDays = ageMs / (24 * 60 * 60 * 1000);
  return ageDays > MARKET_DATA_FRESH_WARNING_DAYS && ageDays <= MARKET_DATA_STALE_DAYS;
}

/**
 * Returns a short human-readable age string for display INLINE next to the
 * opening count (not just as a tooltip). Format: "updated 2mo ago" or "updated today".
 * Always visible — not conditional on staleness.
 */
export function marketDataAgeInline(market: CareerPathMarket): string {
  const ageDays = Math.round((Date.now() - new Date(market.dataAsOf).getTime()) / 86400000);
  if (ageDays < 7)  return 'updated this week';
  if (ageDays < 30) return `updated ${ageDays}d ago`;
  if (ageDays < 60) return `updated ${Math.round(ageDays / 30)}mo ago`;
  if (ageDays < 90) return `updated ${Math.round(ageDays / 30)}mo ago ⚠`;
  return `updated ${Math.round(ageDays / 30)}mo ago — verify live ⚠`;
}

/**
 * Returns true when the market data for a given entry is older than
 * MARKET_DATA_STALE_DAYS. Stale data should be labelled in the UI and
 * accompanied by a caveat to verify live demand before pivoting.
 */
export function isMarketDataStale(market: CareerPathMarket): boolean {
  const ageMs = Date.now() - new Date(market.dataAsOf).getTime();
  return ageMs > MARKET_DATA_STALE_DAYS * 24 * 60 * 60 * 1000;
}

/**
 * Returns a human-readable staleness label, e.g. "as of Q1 2026 · 4 months old".
 * Shown inline next to opening counts when data is > 30 days old.
 */
export function marketDataAgeLabel(market: CareerPathMarket): string {
  const d       = new Date(market.dataAsOf);
  const now     = new Date();
  const ageDays = Math.round((now.getTime() - d.getTime()) / 86400000);
  const quarter = `Q${Math.ceil((d.getMonth() + 1) / 3)} ${d.getFullYear()}`;

  if (ageDays < 30)  return `as of ${quarter}`;
  if (ageDays < 90)  return `as of ${quarter} · ${Math.round(ageDays / 30)}mo old`;
  if (ageDays < 365) return `⚠ as of ${quarter} · ${Math.round(ageDays / 30)}mo old — verify live`;
  return `⚠ as of ${quarter} · ${Math.round(ageDays / 365)}yr old — requires refresh`;
}

// ---------------------------------------------------------------------------
// Market intelligence database — 30 most common career transitions
// Data sources: LinkedIn Job Reports 2024-2025, Naukri.com salary data,
// Stack Overflow Developer Survey 2024, NASSCOM Future of Work Report 2024,
// WEF Future of Jobs Report 2025, Glassdoor compensation data
// ---------------------------------------------------------------------------

const MARKET_DATA: Record<string, CareerPathMarket> = {

  // ── SOFTWARE / TECH TRANSITIONS ──────────────────────────────────────────

  'ai_llm_systems_engineer': {
    targetRole: 'AI/LLM Systems Engineer',
    indiaOpenings: 4200,
    globalOpenings: 28000,
    topHiringCompaniesIndia: ['Flipkart (LLM infra)', 'Swiggy (AI platform)', 'Meesho (RecSys)', 'PhonePe (risk AI)', 'Walmart Global Tech'],
    topHiringCompaniesGlobal: ['Anthropic', 'OpenAI', 'Cohere', 'Mistral', 'Databricks'],
    us_openings: 9200,
    topHiringCompaniesUS: ['Anthropic', 'OpenAI', 'Cohere', 'Scale AI', 'Databricks'],
    uk_openings: 1100,
    topHiringCompaniesUK: ['DeepMind (London)', 'Stability AI', 'Arm', 'Palantir UK', 'Wayve'],
    eu_openings: 1800,
    topHiringCompaniesEU: ['Mistral AI (Paris)', 'Zalando AI', 'SAP AI Core', 'Adyen ML', 'ASML'],
    apac_openings: 820,
    topHiringCompaniesAPAC: ['Sea Limited', 'Grab AI', 'Canva', 'Atlassian', 'Samsung Research'],
    canada_openings: 740,
    topHiringCompaniesCanada: ['Cohere (Toronto)', 'Shopify AI', 'RBC AI Lab', 'Element AI (ServiceNow)', 'Layer 6'],
    latam_openings: 310,
    topHiringCompaniesLatAm: ['Mercado Libre AI', 'Nubank ML', 'Rappi Tech', 'TOTVS', 'CI&T'],
    mena_openings: 190,
    topHiringCompaniesMENA: ['G42 (Abu Dhabi)', 'stc AI', 'Noon', 'Careem', 'Amazon MENA'],
    weeksToFirstInterviewByRegion: { usa: 7, uk: 9, germany: 10, singapore: 9, canada: 8 },
    hiringBar: 'Production LLM system — not a chatbot tutorial. A system with eval framework, token budget management, fallback logic, and measurable accuracy. Hiring managers eliminate candidates without a GitHub repo showing production-grade work. Certificates alone do not pass screen.',
    proofOfCompetency: 'GitHub repo: an LLM application with prompt versioning, evaluation suite, and cost monitoring. Or: an open-source contribution to LangChain, LlamaIndex, or Haystack.',
    medianSalaryDeltaPct: 52,
    successRate12mPct: 38,
    demandTrend: 'surging',
    weeksToFirstInterview: 8,
    dataAsOf: '2026-03-31',
    dataSource: 'LinkedIn Job Reports 2025, NASSCOM AI Talent Report Q1 2026',
  },

  'ml_engineer': {
    targetRole: 'Machine Learning Engineer',
    indiaOpenings: 6800,
    globalOpenings: 42000,
    topHiringCompaniesIndia: ['Google India', 'Microsoft India', 'Amazon India', 'Razorpay', 'CRED'],
    topHiringCompaniesGlobal: ['Google DeepMind', 'Meta AI', 'Microsoft Research', 'Apple ML', 'Nvidia'],
    us_openings: 14000,
    topHiringCompaniesUS: ['Google DeepMind', 'Meta AI', 'Apple', 'Nvidia', 'Tesla'],
    uk_openings: 2100,
    topHiringCompaniesUK: ['DeepMind', 'Amazon UK', 'BBC R&D', 'Experian', 'BT AI'],
    eu_openings: 4800,
    topHiringCompaniesEU: ['Bosch AI', 'BMW AI', 'Booking.com', 'Spotify', 'CERN'],
    apac_openings: 2200,
    topHiringCompaniesAPAC: ['Samsung Research', 'Kakao', 'Sea Limited', 'Canva', 'CSIRO'],
    canada_openings: 2400,
    topHiringCompaniesCanada: ['Google Brain (Montreal)', 'Mila', 'Thomson Reuters', 'TD AI', 'BMO'],
    latam_openings: 580,
    topHiringCompaniesLatAm: ['Mercado Libre', 'Nubank', 'iFood', 'Globo', 'Vtex'],
    mena_openings: 320,
    topHiringCompaniesMENA: ['G42', 'Amazon AE', 'Careem', 'Saudi Aramco AI', 'NEOM'],
    weeksToFirstInterviewByRegion: { usa: 9, uk: 10, germany: 11, singapore: 10, canada: 9 },
    hiringBar: 'A deployed ML model solving a measurable real-world problem. The bar is not Kaggle competition — it is production deployment with monitoring, versioning, and drift detection. 3 years ago a Kaggle Top 10% was enough; today, hiring managers want to see MLOps alongside modeling.',
    proofOfCompetency: 'GitHub repo with model training code, inference API, evaluation metrics, and monitoring dashboard. Or: a Kaggle competition in the top 5% with a full writeup.',
    medianSalaryDeltaPct: 44,
    successRate12mPct: 32,
    demandTrend: 'growing',
    weeksToFirstInterview: 10,
    dataAsOf: '2025-12-31',
    dataSource: 'Stack Overflow Developer Survey 2024, Naukri Salary Insights Q4 2025',
  },

  'platform_engineer': {
    targetRole: 'Platform / DevOps Engineer',
    indiaOpenings: 9400,
    globalOpenings: 58000,
    topHiringCompaniesIndia: ['Razorpay', 'HDFC Bank Tech', 'Juspay', 'Freshworks', 'Hasura'],
    topHiringCompaniesGlobal: ['Stripe', 'Cloudflare', 'HashiCorp', 'Datadog', 'GitLab'],
    us_openings: 18000,
    topHiringCompaniesUS: ['Stripe', 'Cloudflare', 'Datadog', 'HashiCorp', 'GitLab'],
    uk_openings: 3400,
    topHiringCompaniesUK: ['Arm', 'BT Group', 'Barclays Tech', 'Monzo', 'Deliveroo'],
    eu_openings: 6200,
    topHiringCompaniesEU: ['SAP', 'Siemens', 'Booking.com', 'Spotify', 'ING Group'],
    apac_openings: 2800,
    topHiringCompaniesAPAC: ['Atlassian', 'Grab', 'Canva', 'ANZ', 'Telstra'],
    canada_openings: 2600,
    topHiringCompaniesCanada: ['Shopify', 'RBC', 'Hootsuite', 'OpenText', 'Telus'],
    latam_openings: 940,
    topHiringCompaniesLatAm: ['Mercado Libre', 'Nubank', 'Globo', 'CI&T', 'Totvs'],
    mena_openings: 560,
    topHiringCompaniesMENA: ['Careem', 'stc', 'Etisalat (e&)', 'FAB', 'du'],
    weeksToFirstInterviewByRegion: { usa: 5, uk: 6, germany: 7, singapore: 7, australia: 6, canada: 6 },
    hiringBar: 'Kubernetes cluster management + IaC (Terraform/Pulumi) + observability stack. The bar has risen significantly — most candidates now have AWS/GCP certs; what differentiates is demonstrated incident response (runbook you wrote, post-mortem you led) and security posture work.',
    proofOfCompetency: 'GitHub repo with a complete IaC deployment (prod + staging + monitoring), or: a public post-mortem or incident analysis demonstrating incident command experience.',
    medianSalaryDeltaPct: 28,
    successRate12mPct: 55,
    demandTrend: 'stable',
    weeksToFirstInterview: 6,
    dataAsOf: '2026-03-31',
    dataSource: 'LinkedIn Workforce Insights 2025, Glassdoor Compensation Data Q1 2026',
  },

  'data_engineer': {
    targetRole: 'Data Engineer',
    indiaOpenings: 12000,
    globalOpenings: 72000,
    topHiringCompaniesIndia: ['Walmart Global Tech', 'Target India', 'Zomato', 'Paytm', 'MakeMyTrip'],
    topHiringCompaniesGlobal: ['Databricks', 'Snowflake', 'dbt Labs', 'Confluent', 'Palantir'],
    us_openings: 8500,
    topHiringCompaniesUS: ['Databricks', 'Snowflake', 'Lyft', 'Netflix', 'Capital One'],
    uk_openings: 1800,
    topHiringCompaniesUK: ['HSBC (Data Platform)', 'Revolut', 'Sky', 'BT Group', 'Lloyds Banking Group'],
    eu_openings: 3200,
    topHiringCompaniesEU: ['SAP Data Intelligence', 'Zalando', 'Booking.com', 'ASML', 'Adyen'],
    apac_openings: 1100,
    topHiringCompaniesAPAC: ['DBS Bank', 'Grab', 'Atlassian', 'Canva', 'ANZ'],
    canada_openings: 1400,
    topHiringCompaniesCanada: ['Shopify', 'RBC Analytics', 'Scotiabank', 'Wealthsimple', 'Hootsuite'],
    latam_openings: 680,
    topHiringCompaniesLatAm: ['Mercado Libre', 'Nubank', 'iFood', 'Rappi', 'VTEX'],
    mena_openings: 420,
    topHiringCompaniesMENA: ['Careem', 'Talabat', 'Noon', 'FAB', 'stc'],
    weeksToFirstInterviewByRegion: { usa: 6, uk: 7, germany: 8, singapore: 8, australia: 7, canada: 7 },
    topHiringCompaniesByRegion: {
      philippines: ['Accenture PH', 'Concentrix Analytics', 'Globe Telecom', 'UnionBank', 'Lazada PH'],
    },
    topHiringCompaniesRemote: ['Deel', 'Toptal', 'Remote.com (engineering)', 'Shopify (remote)', 'Automattic'],
    regionalOpenings: {
      philippines: { count: 680, source: 'JobStreet PH', asOf: '2026-03-31' },
    },
    remoteOpenings: 2800,
    hiringBar: 'Production data pipeline — not a tutorial notebook. dbt transformations, Apache Spark or Kafka integration, orchestration (Airflow/Prefect), data quality monitoring. Candidates who can only do ETL scripting without pipeline orchestration are increasingly screened out.',
    proofOfCompetency: 'GitHub repo with a complete data pipeline: ingestion → transformation (dbt) → orchestration → monitoring. Or: dbt certification + a public dbt project with documented data model.',
    medianSalaryDeltaPct: 35,
    successRate12mPct: 60,
    demandTrend: 'growing',
    weeksToFirstInterview: 7,
    dataAsOf: '2025-12-31',
    dataSource: 'NASSCOM Data Science Talent Report 2025, LinkedIn Job Market Data 2025',
  },

  'security_engineer': {
    targetRole: 'Security / AppSec Engineer',
    indiaOpenings: 5200,
    globalOpenings: 31000,
    topHiringCompaniesIndia: ['Razorpay', 'HDFC Bank', 'PhonePe', 'Reliance Jio', 'InfoEdge'],
    topHiringCompaniesGlobal: ['Crowdstrike', 'Palo Alto Networks', 'Cloudflare', 'Okta', 'Rapid7'],
    us_openings: 11000,
    topHiringCompaniesUS: ['Crowdstrike', 'Palo Alto Networks', 'Okta', 'SentinelOne', 'Zscaler'],
    uk_openings: 2200,
    topHiringCompaniesUK: ['BAE Systems Digital', 'GCHQ', 'BT Security', 'Lloyds', 'Darktrace'],
    eu_openings: 3800,
    topHiringCompaniesEU: ['SAP Security', 'Thales', 'NXP', 'Atos', 'Check Point (Amsterdam)'],
    apac_openings: 1600,
    topHiringCompaniesAPAC: ['DBS Bank', 'ANZ', 'Telstra', 'CBA', 'NCS Group'],
    canada_openings: 1800,
    topHiringCompaniesCanada: ['BlackBerry', 'RBC Cyber', 'Scotiabank', 'CGI', 'Mitel'],
    latam_openings: 520,
    topHiringCompaniesLatAm: ['Mercado Libre Security', 'Nubank', 'Totvs', 'Embratel', 'CI&T'],
    mena_openings: 380,
    topHiringCompaniesMENA: ['G42 Security', 'stc', 'e& (Etisalat)', 'Dubai Police (cyber)', 'NEOM'],
    weeksToFirstInterviewByRegion: { usa: 8, uk: 9, germany: 10, singapore: 9, canada: 8 },
    hiringBar: 'Threat modeling experience + at least 1 security certification (OSCP, CISSP, or AWS Security Specialty). The highest-value differentiator is AI-specific security knowledge: LLM prompt injection, model extraction attacks, data poisoning. This is a very young niche with very few practitioners.',
    proofOfCompetency: 'A documented threat model for a production system, or: a CTF writeup (HackTheBox, TryHackMe), or: a bug bounty submission to a major program.',
    medianSalaryDeltaPct: 48,
    successRate12mPct: 42,
    demandTrend: 'surging',
    weeksToFirstInterview: 9,
    dataAsOf: '2025-12-31',
    dataSource: 'Cybersecurity Ventures 2025, LinkedIn Skills on the Rise 2025',
  },

  'product_manager': {
    targetRole: 'Technical Product Manager',
    indiaOpenings: 7800,
    globalOpenings: 44000,
    topHiringCompaniesIndia: ['Flipkart', 'Swiggy', 'CRED', 'Zepto', 'Groww'],
    topHiringCompaniesGlobal: ['Google', 'Stripe', 'Figma', 'Notion', 'Linear'],
    us_openings: 16000,
    topHiringCompaniesUS: ['Google', 'Stripe', 'Figma', 'Atlassian', 'Salesforce'],
    uk_openings: 3200,
    topHiringCompaniesUK: ['Revolut', 'Monzo', 'Wise', 'Deliveroo', 'Arm'],
    eu_openings: 5800,
    topHiringCompaniesEU: ['Spotify', 'Zalando', 'Booking.com', 'N26', 'Klarna'],
    apac_openings: 2400,
    topHiringCompaniesAPAC: ['Atlassian', 'Canva', 'Grab', 'Sea Limited', 'Gojek'],
    canada_openings: 2200,
    topHiringCompaniesCanada: ['Shopify', 'Hootsuite', 'Wealthsimple', 'Drop', 'Ritual'],
    latam_openings: 880,
    topHiringCompaniesLatAm: ['Mercado Libre', 'Nubank', 'Rappi', 'Loft', 'Vtex'],
    mena_openings: 480,
    topHiringCompaniesMENA: ['Careem', 'Noon', 'Talabat', 'Anghami', 'Property Finder'],
    weeksToFirstInterviewByRegion: { usa: 11, uk: 12, germany: 14, singapore: 12, canada: 11 },
    hiringBar: 'A shipped product or feature with measurable impact. PM interviews require: a product case study (growth problem, solution, metrics), an estimation case, and a technical depth round. Engineers transitioning to PM must show they can drive without technical authority — the most common failure mode is "turned roadmap into technical spec".',
    proofOfCompetency: 'A 2-page product case study documenting a feature you drove: problem definition, user research, solution, launch, and measured outcome. Published publicly or shown in interview.',
    medianSalaryDeltaPct: 30,
    successRate12mPct: 28,
    demandTrend: 'stable',
    weeksToFirstInterview: 12,
    dataAsOf: '2025-12-31',
    dataSource: 'PM Hired 2025 Salary Report, Glassdoor PM Compensation Data 2025',
  },

  // ── FINANCE TRANSITIONS ───────────────────────────────────────────────────

  'fp_a_ai_analyst': {
    targetRole: 'FP&A AI Analyst',
    indiaOpenings: 1800,
    globalOpenings: 11000,
    topHiringCompaniesIndia: ['Juspay', 'Groww', 'INDmoney', 'Razorpay Finance', 'Zepto'],
    topHiringCompaniesGlobal: ['Anaplan', 'Workday Adaptive', 'CFO Connect portfolio', 'Bessemer-backed SaaS'],
    us_openings: 3800,
    topHiringCompaniesUS: ['Anaplan', 'Workday', 'Palantir Finance', 'Netflix Finance', 'Airbnb'],
    uk_openings: 820,
    topHiringCompaniesUK: ['HSBC FP&A', 'Barclays', 'Revolut Finance', 'Wise', 'Monzo'],
    eu_openings: 1400,
    topHiringCompaniesEU: ['SAP Finance', 'Adyen', 'N26', 'Klarna', 'HelloFresh'],
    apac_openings: 600,
    topHiringCompaniesAPAC: ['DBS Finance', 'ANZ', 'Macquarie', 'Sea Limited Finance', 'Canva'],
    canada_openings: 680,
    topHiringCompaniesCanada: ['RBC Finance', 'Shopify Finance', 'TD Analytics', 'CIBC', 'Bombardier'],
    latam_openings: 240,
    topHiringCompaniesLatAm: ['Nubank Finance', 'Mercado Libre', 'XP Inc', 'B3', 'BTG Pactual'],
    mena_openings: 160,
    topHiringCompaniesMENA: ['Emirates NBD', 'FAB', 'Noon Finance', 'stc Finance', 'Saudi Aramco'],
    weeksToFirstInterviewByRegion: { usa: 7, uk: 8, germany: 9, singapore: 9, canada: 8 },
    hiringBar: 'Python/SQL for financial modelling + 1 AI-enhanced model deployed in production. The bar is not knowing Python — it is a Python-built model that replaced an Excel process and is in active use. Finance leaders are specifically asking "show me a model you automated" before scheduling second rounds.',
    proofOfCompetency: 'A Python financial model (budget variance, headcount planning, or scenario analysis) hosted on GitHub with documentation showing the before-process and the outcome.',
    medianSalaryDeltaPct: 28,
    successRate12mPct: 48,
    demandTrend: 'growing',
    weeksToFirstInterview: 8,
    dataAsOf: '2025-12-31',
    dataSource: 'CFO Survey Q4 2025, Naukri Finance Salary Data 2025',
  },

  'risk_ai_analyst': {
    targetRole: 'Risk & AI Model Analyst',
    indiaOpenings: 2400,
    globalOpenings: 14000,
    topHiringCompaniesIndia: ['HDFC Bank', 'Bajaj Finance', 'Juspay', 'RazorpayX', 'BankBazaar'],
    topHiringCompaniesGlobal: ['JPMorgan AI Risk', 'Goldman Sachs Model Risk', 'KPMG Risk Advisory', 'Deloitte AI Governance'],
    us_openings: 5200,
    topHiringCompaniesUS: ['JPMorgan Model Risk', 'Goldman Sachs', 'Capital One', 'Deloitte AI', 'KPMG'],
    uk_openings: 980,
    topHiringCompaniesUK: ['HSBC Model Risk', 'Barclays', 'PwC UK', 'FCA (regulator)', 'Lloyds'],
    eu_openings: 1600,
    topHiringCompaniesEU: ['Deutsche Bank', 'ING Model Risk', 'BNP Paribas', 'ECB', 'McKinsey Risk'],
    apac_openings: 720,
    topHiringCompaniesAPAC: ['MAS (regulator)', 'DBS Model Risk', 'APRA (AU)', 'ANZ Risk', 'OCBC'],
    canada_openings: 680,
    topHiringCompaniesCanada: ['OSFI (regulator)', 'RBC Risk', 'TD Risk', 'Deloitte CA', 'PWC CA'],
    latam_openings: 260,
    topHiringCompaniesLatAm: ['Itaú', 'Bradesco', 'BTG Pactual', 'Nubank Risk', 'XP Inc'],
    mena_openings: 200,
    topHiringCompaniesMENA: ['Dubai Financial Services Authority', 'FAB Risk', 'Emirates NBD', 'Saudi CMA', 'QIA'],
    weeksToFirstInterviewByRegion: { usa: 9, uk: 10, germany: 12, singapore: 10, canada: 9 },
    hiringBar: 'Model validation experience + statistical knowledge (logistic regression, survival analysis) + regulatory awareness (SR 11-7, MAS guidelines, RBI AI framework). A candidate who has validated 1 model in production — including documentation and oversight evidence — is rare and well-compensated.',
    proofOfCompetency: 'A model validation report (can be for a public model/dataset) documenting: model assumptions, validation methodology, results, limitations, and override conditions.',
    medianSalaryDeltaPct: 38,
    successRate12mPct: 35,
    demandTrend: 'surging',
    weeksToFirstInterview: 10,
    dataAsOf: '2025-12-31',
    dataSource: 'RBI AI Risk Framework 2025, Gartner Banking AI Report 2025',
  },

  'cfo_advisor': {
    targetRole: 'CFO / Finance Transformation Advisor',
    indiaOpenings: 800,
    globalOpenings: 4200,
    topHiringCompaniesIndia: ['Series B-C startups (3–5 yr CFO runway)', 'Deloitte FAS India', 'EY Parthenon India', 'McKinsey Finance Practice'],
    topHiringCompaniesGlobal: ['Deloitte FAS', 'McKinsey Finance', 'AlixPartners', 'FTI Consulting'],
    us_openings: 1400,
    topHiringCompaniesUS: ['AlixPartners', 'FTI Consulting', 'Kroll', 'McKinsey CFO', 'Series B startups'],
    uk_openings: 320,
    topHiringCompaniesUK: ['KPMG FAS', 'Deloitte UK', 'EY Parthenon', 'Grant Thornton', 'PE-backed cos'],
    eu_openings: 560,
    topHiringCompaniesEU: ['Roland Berger', 'BCG Finance', 'Alvarez & Marsal EU', 'EY EU', 'KPMG EU'],
    apac_openings: 220,
    topHiringCompaniesAPAC: ['McKinsey SG', 'PwC SG', 'Series A-B startups SG', 'Deloitte AU', 'KPMG AU'],
    canada_openings: 260,
    topHiringCompaniesCanada: ['Deloitte CA', 'PWC CA', 'MNP', 'BDC', 'Private equity portfolio cos'],
    latam_openings: 140,
    topHiringCompaniesLatAm: ['McKinsey LatAm', 'Deloitte BR', 'EY BR', 'Series B startups BR', 'BTG'],
    mena_openings: 120,
    topHiringCompaniesMENA: ['PwC Middle East', 'Deloitte UAE', 'EY MENA', 'KPMG UAE', 'SWF-backed cos'],
    weeksToFirstInterviewByRegion: { usa: 16, uk: 18, germany: 20, singapore: 18, canada: 16 },
    hiringBar: 'This is a relationship-driven market. The technical bar is: 3+ years as Head of Finance or VP Finance with a measurable transformation (raised capital, built forecasting infrastructure, led restructuring). The actual entry point is almost always a warm referral — cold applications succeed in <5% of cases for this role.',
    proofOfCompetency: 'A 1-page case study: company context, financial challenge, actions taken, outcome (numbers). Your network is the application — direct referrals from CFOs you have worked with.',
    medianSalaryDeltaPct: 65,
    successRate12mPct: 22,
    demandTrend: 'growing',
    weeksToFirstInterview: 18,
    dataAsOf: '2025-12-31',
    dataSource: 'CFO Alliance India 2025, Executive Search Firm Data 2025',
  },

  // ── HR TRANSITIONS ────────────────────────────────────────────────────────

  'people_analytics_specialist': {
    targetRole: 'People Analytics Specialist',
    indiaOpenings: 1200,
    globalOpenings: 7400,
    topHiringCompaniesIndia: ['Infosys HR Analytics', 'Wipro People Analytics', 'HDFC Bank Workforce Intelligence', 'Tata Group HR', 'Juspay'],
    topHiringCompaniesGlobal: ['Visier', 'Workday Analytics', 'IBM Kenexa', 'LinkedIn Talent Insights', 'PwC People Analytics'],
    us_openings: 2600,
    topHiringCompaniesUS: ['LinkedIn', 'Google People Ops', 'Meta HR', 'Visier', 'IBM Kenexa'],
    uk_openings: 540,
    topHiringCompaniesUK: ['Unilever People Analytics', 'Shell', 'BT HR', 'Lloyds', 'NHS Digital'],
    eu_openings: 980,
    topHiringCompaniesEU: ['SAP SuccessFactors', 'Siemens HR', 'Philips', 'ING', 'L\'Oréal'],
    apac_openings: 420,
    topHiringCompaniesAPAC: ['DBS HR', 'Telstra', 'Atlassian HR', 'ANZ', 'Grab HR'],
    canada_openings: 480,
    topHiringCompaniesCanada: ['Shopify HR', 'RBC Workforce', 'TD People Analytics', 'BCE', 'CIBC'],
    latam_openings: 160,
    topHiringCompaniesLatAm: ['Ambev', 'Mercado Libre HR', 'Natura', 'Embraer', 'Vivo Telefonica'],
    mena_openings: 120,
    topHiringCompaniesMENA: ['ADNOC HR', 'Saudi Aramco HR', 'Emirates Group HR', 'FAB', 'stc'],
    weeksToFirstInterviewByRegion: { usa: 8, uk: 9, germany: 10, singapore: 9, canada: 8 },
    hiringBar: 'An attrition prediction or workforce optimization model built with real HR data. Most candidates claim analytics skills but cannot produce a working model. The differentiator is a deployable dashboard or model — even if built on public data — showing the full methodology.',
    proofOfCompetency: 'A Tableau or Power BI dashboard visualizing workforce analytics (attrition, diversity, compensation equity) with documented methodology. Or: a Python attrition model with feature importance analysis.',
    medianSalaryDeltaPct: 32,
    successRate12mPct: 45,
    demandTrend: 'growing',
    weeksToFirstInterview: 9,
    dataAsOf: '2025-12-31',
    dataSource: 'SHRM Analytics Survey 2025, LinkedIn HR Jobs Report 2025',
  },

  'hrbp_ai_specialist': {
    targetRole: 'HR Business Partner (AI-Augmented)',
    indiaOpenings: 3200,
    globalOpenings: 18000,
    topHiringCompaniesIndia: ['Flipkart', 'Juspay', 'Meesho', 'Swiggy', 'Urban Company'],
    topHiringCompaniesGlobal: ['Google People Ops', 'Stripe HR', 'Figma', 'Atlassian', 'Shopify'],
    us_openings: 6400,
    topHiringCompaniesUS: ['Google', 'Meta', 'Stripe', 'Figma', 'Salesforce'],
    uk_openings: 1400,
    topHiringCompaniesUK: ['Unilever', 'BT Group', 'NHS', 'Rolls-Royce', 'Vodafone'],
    eu_openings: 2600,
    topHiringCompaniesEU: ['SAP', 'LVMH', 'Airbus', 'Siemens', 'ING'],
    apac_openings: 1100,
    topHiringCompaniesAPAC: ['Atlassian', 'Grab', 'DBS Bank', 'Telstra', 'ANZ'],
    canada_openings: 1200,
    topHiringCompaniesCanada: ['Shopify', 'RBC', 'TD', 'Scotiabank', 'Manulife'],
    latam_openings: 440,
    topHiringCompaniesLatAm: ['Ambev', 'Mercado Libre', 'Natura &Co', 'Vale', 'Embraer'],
    mena_openings: 280,
    topHiringCompaniesMENA: ['Emirates Group', 'ADNOC', 'Saudi Aramco', 'stc', 'du'],
    weeksToFirstInterviewByRegion: { usa: 6, uk: 7, germany: 8, singapore: 7, canada: 7 },
    hiringBar: 'A business outcome you drove using data — not a process you ran. The shift from transactional HRBP to strategic HRBP is measured by whether you can say "I reduced attrition by X% through Y intervention." AI tool proficiency (Paradox for scheduling, Eightfold for talent mapping) is increasingly a screening filter.',
    proofOfCompetency: 'A 1-page case study: workforce problem, data analysis, intervention, and measured outcome. Include any AI tools used in the process.',
    medianSalaryDeltaPct: 20,
    successRate12mPct: 52,
    demandTrend: 'stable',
    weeksToFirstInterview: 7,
    dataAsOf: '2025-12-31',
    dataSource: 'People Matters HR Salary Survey 2025, NASSCOM HR Tech Report 2025',
  },

  // ── CONTENT / CREATIVE TRANSITIONS ───────────────────────────────────────

  'content_strategist_ai': {
    targetRole: 'AI Content Strategist',
    indiaOpenings: 2100,
    globalOpenings: 12000,
    topHiringCompaniesIndia: ['Zepto', 'Meesho', 'Swiggy Brand', 'CRED', 'Groww'],
    topHiringCompaniesGlobal: ['HubSpot', 'Semrush', 'Hootsuite', 'Canva', 'Jasper'],
    us_openings: 4200,
    topHiringCompaniesUS: ['HubSpot', 'Canva', 'Figma', 'Mailchimp', 'Adobe'],
    uk_openings: 900,
    topHiringCompaniesUK: ['ASOS', 'BBC', 'Guardian', 'Revolut', 'Deliveroo'],
    eu_openings: 1600,
    topHiringCompaniesEU: ['Spotify', 'Zalando', 'N26', 'HelloFresh', 'Criteo'],
    apac_openings: 680,
    topHiringCompaniesAPAC: ['Canva (Sydney)', 'Sea Limited', 'Grab Marketing', 'Carousell', 'Ninja Van'],
    canada_openings: 760,
    topHiringCompaniesCanada: ['Hootsuite', 'Shopify Content', 'CBC', 'Freshbooks', 'Ritual'],
    latam_openings: 360,
    topHiringCompaniesLatAm: ['Mercado Libre Content', 'Globo Digital', 'Nubank', 'Rappi', 'iFood'],
    mena_openings: 220,
    topHiringCompaniesMENA: ['OSN (streaming)', 'MBC Group', 'Noon', 'Anghami', 'Property Finder'],
    weeksToFirstInterviewByRegion: { usa: 5, uk: 6, germany: 7, singapore: 6, canada: 6 },
    hiringBar: 'A content system — not samples. The bar is demonstrating you can build a repeatable AI-augmented workflow that maintains brand quality at scale. Candidates who show 30 AI-generated samples are rejected; candidates who show a workflow + quality framework + performance metrics are hired.',
    proofOfCompetency: 'A documented content production workflow: brief template → AI prompting framework → editorial quality checklist → distribution → performance metrics. With 3 sample outputs showing the full process.',
    medianSalaryDeltaPct: 22,
    successRate12mPct: 44,
    demandTrend: 'growing',
    weeksToFirstInterview: 6,
    dataAsOf: '2025-12-31',
    dataSource: 'Content Marketing Institute 2025, LinkedIn Creator Economy Report 2025',
  },

  // ── QA / TESTING TRANSITIONS ──────────────────────────────────────────────

  'qa_automation_engineer': {
    targetRole: 'QA Automation Engineer',
    indiaOpenings: 8400,
    globalOpenings: 52000,
    topHiringCompaniesIndia: ['Flipkart', 'Juspay', 'Razorpay', 'Pine Labs', 'BrowserStack'],
    topHiringCompaniesGlobal: ['BrowserStack', 'LambdaTest', 'Sauce Labs', 'Tricentis', 'Mabl'],
    us_openings: 16000,
    topHiringCompaniesUS: ['BrowserStack', 'Tricentis', 'Sauce Labs', 'Microsoft QA', 'Salesforce QE'],
    uk_openings: 3200,
    topHiringCompaniesUK: ['BrowserStack (EMEA)', 'Barclays QA', 'Vodafone', 'Sky QE', 'Arm'],
    eu_openings: 5800,
    topHiringCompaniesEU: ['SAP QA', 'Zalando QE', 'Criteo', 'Booking.com QA', 'Adyen'],
    apac_openings: 2400,
    topHiringCompaniesAPAC: ['Atlassian QA', 'ANZ', 'Telstra', 'CBA', 'Canva QE'],
    canada_openings: 2200,
    topHiringCompaniesCanada: ['Shopify QE', 'OpenText', 'RBC Tech', 'Mitel', 'Kinaxis'],
    latam_openings: 760,
    topHiringCompaniesLatAm: ['Mercado Libre QA', 'Globo QE', 'Nubank', 'CI&T', 'Totvs'],
    mena_openings: 460,
    topHiringCompaniesMENA: ['Careem QE', 'Noon Tech', 'stc', 'e& (Etisalat)', 'Majid Al Futtaim Tech'],
    weeksToFirstInterviewByRegion: { usa: 5, uk: 6, germany: 7, singapore: 6, australia: 6, canada: 5 },
    topHiringCompaniesByRegion: {
      philippines: ['Accenture PH', 'Concentrix QA', 'Globe Telecom', 'Voyager Innovations', 'Maya Bank'],
    },
    topHiringCompaniesRemote: ['BrowserStack', 'LambdaTest', 'TestRail (Gurock)', 'Sauce Labs', 'Toptal (QA)'],
    regionalOpenings: {
      philippines: { count: 920, source: 'JobStreet PH', asOf: '2026-03-31' },
    },
    remoteOpenings: 3200,
    hiringBar: 'A working automation framework — Selenium/Playwright + API test suite + CI/CD integration. The AI differentiation is: AI-powered test generation (Copilot/TestPilot) + intelligent test selection. Manual testers who can only write test cases are being screened out at the JD level.',
    proofOfCompetency: 'GitHub repo with a complete automation framework: UI tests (Playwright) + API tests (Postman/REST-assured) + CI/CD pipeline + test report generation. Running against a public app or your own project.',
    medianSalaryDeltaPct: 40,
    successRate12mPct: 65,
    demandTrend: 'growing',
    weeksToFirstInterview: 6,
    dataAsOf: '2025-12-31',
    dataSource: 'NASSCOM Testing Trends 2025, Stack Overflow Developer Survey 2024',
  },

  // ── BPO / PHILIPPINES-RELEVANT TRANSITIONS ────────────────────────────────
  // Voice and non-voice BPO employs 1.3M in the Philippines. AI substitution
  // for voice support (65%) and data entry (79%) is creating urgent demand for
  // adjacent roles. These paths are documented for PH market reality specifically:
  // remote compensation structures, local employer pools, and JobStreet PH counts.

  'customer_success_manager': {
    targetRole: 'Customer Success Manager',
    indiaOpenings: 4500,
    globalOpenings: 28000,
    topHiringCompaniesIndia: ['Freshworks', 'Zoho', 'Razorpay', 'Chargebee', 'Juspay'],
    topHiringCompaniesGlobal: ['HubSpot', 'Salesforce', 'Zendesk', 'Intercom', 'Gainsight'],
    us_openings: 9800,
    topHiringCompaniesUS: ['Salesforce', 'HubSpot', 'Gainsight', 'Zendesk', 'Intercom'],
    uk_openings: 2200,
    topHiringCompaniesUK: ['Revolut', 'Wise', 'Monzo', 'Deliveroo', 'Darktrace'],
    eu_openings: 3600,
    topHiringCompaniesEU: ['N26', 'Klarna', 'Personio', 'Pipedrive', 'Pendo'],
    apac_openings: 1400,
    topHiringCompaniesAPAC: ['Atlassian', 'Canva', 'Grab', 'Sea Limited', 'DBS'],
    canada_openings: 1600,
    topHiringCompaniesCanada: ['Shopify', 'Hootsuite', 'Freshbooks', 'Later', 'Clio'],
    latam_openings: 540,
    topHiringCompaniesLatAm: ['Mercado Libre CSM', 'Nubank', 'Totvs', 'Vtex', 'RD Station'],
    mena_openings: 320,
    topHiringCompaniesMENA: ['Careem', 'Noon', 'Talabat', 'Property Finder', 'Anghami'],
    weeksToFirstInterviewByRegion: { usa: 7, uk: 8, germany: 9, singapore: 8, canada: 7 },
    topHiringCompaniesByRegion: {
      philippines: ['TaskUs', 'Accenture PH', 'Teleperformance PH', 'Sprout Solutions', 'Zendesk PH'],
    },
    topHiringCompaniesRemote: ['Help Scout', 'Front', 'Zapier', 'Loom', 'Notion'],
    regionalOpenings: {
      philippines: { count: 820, source: 'JobStreet PH', asOf: '2026-03-31' },
    },
    remoteOpenings: 3500,
    hiringBar: 'Track record of reducing churn or growing expansion revenue. BPO-to-CSM transitions succeed when candidates quantify retention outcomes — CSAT improvement %, churn reduction %, upsell conversion rates. The transition fails when candidates position themselves as "customer service" rather than "revenue protection." Hiring managers screen for ownership of a book of accounts and a named outcome.',
    proofOfCompetency: '2-page case study: BPO client situation, specific retention intervention (script change, escalation protocol, proactive outreach), outcome in measurable % terms. Or: a product knowledge certification from a SaaS vendor (Salesforce, HubSpot, Zendesk) demonstrating platform fluency.',
    medianSalaryDeltaPct: 35,
    successRate12mPct: 48,
    demandTrend: 'growing',
    weeksToFirstInterview: 8,
    dataAsOf: '2026-03-31',
    dataSource: 'LinkedIn Jobs Report 2025, JobStreet PH Salary Insights Q1 2026, Gainsight CSM Benchmark 2025',
  },

  'rpa_automation_analyst': {
    targetRole: 'RPA Automation Analyst',
    indiaOpenings: 3200,
    globalOpenings: 19000,
    topHiringCompaniesIndia: ['Infosys BPM', 'Wipro Robotic Automation', 'TCS BPS', 'HCL Technologies', 'EXL Service'],
    topHiringCompaniesGlobal: ['UiPath', 'Blue Prism', 'Automation Anywhere', 'ServiceNow', 'SS&C Blue Prism'],
    us_openings: 6200,
    topHiringCompaniesUS: ['UiPath', 'Automation Anywhere', 'Blue Prism', 'ServiceNow', 'Deloitte RPA'],
    uk_openings: 1400,
    topHiringCompaniesUK: ['KPMG RPA', 'PwC UK', 'Lloyds Banking RPA', 'BT', 'NHS Digital'],
    eu_openings: 2400,
    topHiringCompaniesEU: ['SAP Intelligent Automation', 'Siemens', 'Deutsche Bank RPA', 'ING', 'Allianz'],
    apac_openings: 920,
    topHiringCompaniesAPAC: ['DBS RPA', 'ANZ', 'CBA', 'Telstra', 'NCS Group'],
    canada_openings: 880,
    topHiringCompaniesCanada: ['RBC Automation', 'TD RPA', 'Deloitte CA', 'PWC CA', 'Manulife'],
    latam_openings: 380,
    topHiringCompaniesLatAm: ['Itaú RPA', 'Bradesco', 'Ambev', 'Vale', 'Rede D\'Or'],
    mena_openings: 260,
    topHiringCompaniesMENA: ['ADNOC RPA', 'Emirates NBD', 'Saudi Aramco', 'stc', 'FAB'],
    weeksToFirstInterviewByRegion: { usa: 5, uk: 6, germany: 7, singapore: 6, canada: 6 },
    topHiringCompaniesByRegion: {
      philippines: ['Accenture PH (RPA COE)', 'Concentrix PH', 'Globe Telecom', 'BDO Unibank', 'Metrobank'],
    },
    topHiringCompaniesRemote: ['UiPath (partner network)', 'Toptal (RPA)', 'Fiverr Pro (automation)', 'Freelancer.com', 'Remote.com'],
    regionalOpenings: {
      philippines: { count: 540, source: 'JobStreet PH', asOf: '2026-03-31' },
    },
    remoteOpenings: 1800,
    hiringBar: 'A working RPA bot deployed against a real repetitive process — not a tutorial demo. UiPath or Automation Anywhere certification is baseline. The differentiator is a bot that handles exceptions, not just the happy path. BPO workers have a structural advantage: they own the process documentation that RPA bots automate. Document the process, then automate it — the documented process is proof of domain understanding.',
    proofOfCompetency: 'UiPath or Automation Anywhere project on GitHub or published to UiPath Marketplace: an automation with exception handling, logging, and ROI calculation (hours saved per week). Pair with a UiPath Developer Foundation or Automation Anywhere Certified Advanced Professional certification.',
    medianSalaryDeltaPct: 42,
    successRate12mPct: 55,
    demandTrend: 'surging',
    weeksToFirstInterview: 6,
    dataAsOf: '2026-03-31',
    dataSource: 'Gartner RPA Market Guide 2025, JobStreet PH Automation Jobs Q1 2026, UiPath Talent Report 2025',
  },

  'cx_operations_analyst': {
    targetRole: 'CX Operations Analyst',
    indiaOpenings: 2100,
    globalOpenings: 13000,
    topHiringCompaniesIndia: ['Genpact Analytics', 'WNS Analytics', 'EXL Analytics', 'Mphasis', 'iGate (Capgemini)'],
    topHiringCompaniesGlobal: ['Qualtrics', 'Medallia', 'NICE InContact', 'Talkdesk', 'Genesys'],
    us_openings: 4800,
    topHiringCompaniesUS: ['Qualtrics', 'Medallia', 'NICE', 'Genesys', 'Talkdesk'],
    uk_openings: 980,
    topHiringCompaniesUK: ['Vodafone CX', 'Sky', 'BT CX Analytics', 'Lloyds', 'Sainsbury\'s'],
    eu_openings: 1600,
    topHiringCompaniesEU: ['Zalando CX', 'N26', 'ING CX', 'Booking.com', 'HelloFresh CX'],
    apac_openings: 680,
    topHiringCompaniesAPAC: ['Grab CX', 'Sea Limited CX', 'Telstra', 'ANZ', 'DBS'],
    canada_openings: 680,
    topHiringCompaniesCanada: ['Shopify CX', 'Rogers CX', 'Telus', 'RBC', 'Manulife'],
    latam_openings: 320,
    topHiringCompaniesLatAm: ['Mercado Libre CX', 'Nubank CX', 'iFood', 'Rappi CX', 'Magazine Luiza'],
    mena_openings: 200,
    topHiringCompaniesMENA: ['Careem CX', 'Noon CX', 'Talabat', 'du', 'Emirates Group CX'],
    weeksToFirstInterviewByRegion: { usa: 6, uk: 7, germany: 8, singapore: 7, canada: 6 },
    topHiringCompaniesByRegion: {
      philippines: ['Accenture PH (CX Analytics)', 'TaskUs (Insights)', 'Teleperformance PH', 'Globe Telecom', 'UnionBank CX'],
    },
    topHiringCompaniesRemote: ['Qualtrics (remote)', 'HubSpot Service', 'Zendesk Analytics', 'Freshdesk', 'Intercom'],
    regionalOpenings: {
      philippines: { count: 460, source: 'JobStreet PH', asOf: '2026-03-31' },
    },
    remoteOpenings: 2200,
    hiringBar: 'A CX analytics portfolio: CSAT/NPS/FCR trend analysis with root cause insight and a measurable improvement recommendation. SQL for querying support ticket data. Tableau or Looker for dashboards. The market differentiates "reporting" (output tables) from "insight" (actionable recommendation from the data). Candidates need at least one documented case of converting data into a team action — e.g., "redesigned IVR flow based on FCR analysis, reduced repeat calls 18%."',
    proofOfCompetency: 'A Tableau or Power BI dashboard analyzing call center or support ticket data: volume trends, agent performance, CSAT drivers, with 2–3 documented improvement recommendations. Can be built on public datasets (Kaggle CX benchmark datasets). Include SQL queries used to prepare the data.',
    medianSalaryDeltaPct: 28,
    successRate12mPct: 58,
    demandTrend: 'growing',
    weeksToFirstInterview: 7,
    dataAsOf: '2026-03-31',
    dataSource: 'CCAP Philippines 2025 BPO Talent Report, JobStreet PH CX Analytics Q1 2026, Qualtrics XM Industry Benchmark 2025',
  },

  'technical_writer_ai': {
    targetRole: 'Technical Writer (AI Documentation)',
    indiaOpenings: 1800,
    globalOpenings: 9200,
    topHiringCompaniesIndia: ['Freshworks', 'Zoho Docs', 'Postman', 'HasuraDB', 'Chargebee'],
    topHiringCompaniesGlobal: ['Stripe Docs', 'Twilio', 'Cloudflare', 'HashiCorp', 'Notion'],
    us_openings: 3400,
    topHiringCompaniesUS: ['Stripe', 'Cloudflare', 'Twilio', 'HashiCorp', 'Notion'],
    uk_openings: 680,
    topHiringCompaniesUK: ['ARM (chip docs)', 'Sage', 'FT Digital', 'Deliveroo Eng', 'Babylon Health'],
    eu_openings: 1100,
    topHiringCompaniesEU: ['Elastic (Amsterdam)', 'Adyen API', 'Booking.com Dev', 'Spotify Eng', 'Criteo'],
    apac_openings: 480,
    topHiringCompaniesAPAC: ['Atlassian Docs', 'Canva', 'Grab Eng', 'ANZ', 'Telstra'],
    canada_openings: 560,
    topHiringCompaniesCanada: ['Shopify Dev Docs', 'Hootsuite', 'OpenText', 'Kinaxis', 'Klipfolio'],
    latam_openings: 180,
    topHiringCompaniesLatAm: ['Nubank Eng', 'CI&T', 'Totvs Docs', 'Vtex Dev', 'Movile'],
    mena_openings: 120,
    topHiringCompaniesMENA: ['Careem Eng', 'Property Finder Tech', 'Anghami', 'stc Digital', 'Noon Tech'],
    weeksToFirstInterviewByRegion: { usa: 4, uk: 5, germany: 6, singapore: 5, canada: 5 },
    hiringBar: 'A public documentation portfolio — structured API docs, user guides, or architecture explanations that non-technical readers can follow. AI specialization: experience documenting AI systems, prompt engineering best practices, or model behavior explanations. This is one of the few writing roles where demand is growing as AI makes documentation more critical.',
    proofOfCompetency: 'A 2,000-word technical documentation sample for a real API or system. Or: a contribution to open-source documentation (MDN, PyPI, or any major OSS project).',
    medianSalaryDeltaPct: 18,
    successRate12mPct: 58,
    demandTrend: 'growing',
    weeksToFirstInterview: 5,
    dataAsOf: '2025-12-31',
    dataSource: 'Society for Technical Communication 2025, Write the Docs Survey 2024',
  },
};

/**
 * Look up market intelligence for a career path target role.
 * Fuzzy matches by normalizing the target role name.
 *
 * Resolution order:
 *   1. Supabase market_intelligence_cache (live, refreshed weekly by Edge Function)
 *      — merged OVER the hardcoded baseline for non-null fields only
 *   2. Hardcoded MARKET_DATA constants (research estimates, static)
 *
 * Use getCareerPathMarketSync() when an async call is not possible.
 */
export async function getCareerPathMarket(targetRole: string): Promise<CareerPathMarket | null> {
  const baseline = getCareerPathMarketSync(targetRole);

  // Upgrade with live Supabase data (lazy import avoids circular deps)
  try {
    const { getCachedMarketIntelligence } = await import('./marketIntelligenceService');
    const key = targetRole.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    const live = await getCachedMarketIntelligence(key);
    if (live) {
      return baseline ? { ...baseline, ...live } as CareerPathMarket : live as CareerPathMarket;
    }
  } catch { /* Supabase unavailable — use hardcoded baseline */ }

  return baseline;
}

/**
 * Synchronous fallback — returns hardcoded baseline only, no live data.
 * Use getCareerPathMarket() (async) in all action-plan generation paths.
 */
export function getCareerPathMarketSync(targetRole: string): CareerPathMarket | null {
  const key = targetRole
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (MARKET_DATA[key]) return MARKET_DATA[key];

  const keys = Object.keys(MARKET_DATA);
  for (const k of keys) {
    if (k.includes(key) || key.includes(k)) return MARKET_DATA[k];
  }

  const words = key.split('_').filter(w => w.length > 3);
  for (const k of keys) {
    if (words.some(w => k.includes(w))) return MARKET_DATA[k];
  }

  return null;
}

// ---------------------------------------------------------------------------
// Region-aware market resolution
// ---------------------------------------------------------------------------
// Maps the user's audited company region to a regionKey + the appropriate
// authoritative job-board sources. When the LLM brief is generated for a
// Berlin-based company, the prompt should NEVER show Naukri (India) numbers
// — it should surface StepStone / XING / Bundesagentur für Arbeit context
// for Germany, with explicit disclosure when region-specific data is missing.

export type RegionKey =
  | 'germany' | 'uk' | 'usa' | 'canada' | 'singapore' | 'australia'
  | 'uae' | 'saudi_arabia' | 'india' | 'france' | 'netherlands' | 'spain'
  | 'sweden' | 'switzerland' | 'japan' | 'brazil' | 'mexico'
  | 'philippines' | 'indonesia' | 'vietnam' | 'malaysia' | 'thailand'
  | 'south_korea' | 'taiwan' | 'hong_kong'
  | 'eu' | 'global';

/** Authoritative job-board sources per region. The LLM cites these by name
 *  in oneActionThisWeek so users know where to verify the count. */
export const MARKET_DATA_SOURCES_BY_REGION: Record<RegionKey, string[]> = {
  germany:      ['StepStone', 'XING', 'Bundesagentur für Arbeit', 'LinkedIn DE'],
  uk:           ['Reed', 'CV-Library', 'Indeed UK', 'LinkedIn UK'],
  usa:          ['Indeed', 'LinkedIn US', 'BLS', 'ZipRecruiter'],
  canada:       ['Job Bank Canada', 'Indeed CA', 'LinkedIn CA', 'Workopolis'],
  singapore:    ['JobStreet SG', 'MyCareersFuture', 'LinkedIn SG'],
  australia:    ['SEEK', 'Indeed AU', 'LinkedIn AU'],
  uae:          ['Bayt', 'Naukrigulf', 'GulfTalent', 'LinkedIn AE'],
  saudi_arabia: ['Bayt', 'GulfTalent', 'Naukrigulf', 'LinkedIn SA'],
  india:        ['Naukri', 'LinkedIn IN', 'Foundit (Monster India)', 'Apna'],
  france:       ['HelloWork', 'Pôle Emploi', 'APEC', 'LinkedIn FR'],
  netherlands:  ['NationaleVacaturebank', 'Werk.nl', 'LinkedIn NL'],
  spain:        ['InfoJobs', 'Tecnoempleo', 'LinkedIn ES'],
  sweden:       ['Arbetsförmedlingen', 'Monster SE', 'LinkedIn SE'],
  switzerland:  ['JobScout24', 'jobs.ch', 'LinkedIn CH'],
  japan:        ['Doda', 'Rikunabi', 'LinkedIn JP'],
  brazil:       ['Catho', 'Vagas.com', 'LinkedIn BR'],
  mexico:       ['OCC Mundial', 'Computrabajo', 'LinkedIn MX'],
  // ── Southeast Asia ─────────────────────────────────────────────────────────
  philippines:  ['JobStreet PH', 'Kalibrr', 'LinkedIn PH', 'OnlineJobs.ph'],
  indonesia:    ['JobStreet ID', 'Glints', 'Kalibrr ID', 'LinkedIn ID'],
  vietnam:      ['VietnamWorks', 'TopCV', 'ITviec (tech)', 'LinkedIn VN'],
  malaysia:     ['JobStreet MY', 'Hiredly', 'LinkedIn MY'],
  thailand:     ['JobsDB TH', 'LinkedIn TH', 'Jobtopgun'],
  // ── East Asia ───────────────────────────────────────────────────────────────
  south_korea:  ['Saramin', 'JobKorea', 'LinkedIn KR'],
  taiwan:       ['104 Job Bank', '1111 Job Bank', 'LinkedIn TW'],
  hong_kong:    ['JobsDB HK', 'CTgoodjobs', 'LinkedIn HK'],
  eu:           ['EURES (EU Job Mobility Portal)', 'LinkedIn EU'],
  global:       ['LinkedIn (global)', 'Indeed (global)'],
};

/** Normalise company.region (ISO code or short name) to a regionKey. */
const REGION_KEY_MAP: Record<string, RegionKey> = {
  de: 'germany', deu: 'germany', germany: 'germany', berlin: 'germany',
  gb: 'uk', uk: 'uk', gbr: 'uk', 'united kingdom': 'uk', britain: 'uk', england: 'uk',
  us: 'usa', usa: 'usa', 'united states': 'usa', america: 'usa',
  ca: 'canada', can: 'canada', canada: 'canada',
  sg: 'singapore', sgp: 'singapore', singapore: 'singapore',
  au: 'australia', aus: 'australia', australia: 'australia',
  ae: 'uae', are: 'uae', uae: 'uae', 'united arab emirates': 'uae', dubai: 'uae', 'abu dhabi': 'uae',
  sa: 'saudi_arabia', sau: 'saudi_arabia', 'saudi arabia': 'saudi_arabia', riyadh: 'saudi_arabia',
  in: 'india', ind: 'india', india: 'india',
  fr: 'france', fra: 'france', france: 'france',
  nl: 'netherlands', nld: 'netherlands', netherlands: 'netherlands',
  es: 'spain', esp: 'spain', spain: 'spain',
  se: 'sweden', swe: 'sweden', sweden: 'sweden',
  ch: 'switzerland', che: 'switzerland', switzerland: 'switzerland',
  jp: 'japan', jpn: 'japan', japan: 'japan',
  br: 'brazil', bra: 'brazil', brazil: 'brazil',
  mx: 'mexico', mex: 'mexico', mexico: 'mexico',
  // ── Southeast / East Asia ───────────────────────────────────────────────────
  ph: 'philippines', phl: 'philippines', philippines: 'philippines',
  manila: 'philippines', 'metro manila': 'philippines', makati: 'philippines',
  bgc: 'philippines', 'bonifacio global city': 'philippines', taguig: 'philippines',
  cebu: 'philippines', 'cebu city': 'philippines', davao: 'philippines',
  quezon: 'philippines', 'quezon city': 'philippines', pasig: 'philippines',
  id: 'indonesia', idn: 'indonesia', indonesia: 'indonesia', jakarta: 'indonesia',
  vn: 'vietnam', vnm: 'vietnam', vietnam: 'vietnam', 'ho chi minh': 'vietnam', hanoi: 'vietnam',
  my: 'malaysia', mys: 'malaysia', malaysia: 'malaysia', 'kuala lumpur': 'malaysia', kl: 'malaysia',
  th: 'thailand', tha: 'thailand', thailand: 'thailand', bangkok: 'thailand',
  kr: 'south_korea', kor: 'south_korea', 'south korea': 'south_korea', seoul: 'south_korea',
  tw: 'taiwan', twn: 'taiwan', taiwan: 'taiwan', taipei: 'taiwan',
  hk: 'hong_kong', hkg: 'hong_kong', 'hong kong': 'hong_kong',
  // EU bucket — anything else in the Eurozone defaults to 'eu'
  it: 'eu', ita: 'eu', italy: 'eu',
  be: 'eu', bel: 'eu', belgium: 'eu',
  at: 'eu', aut: 'eu', austria: 'eu',
  ie: 'eu', irl: 'eu', ireland: 'eu',
  pt: 'eu', prt: 'eu', portugal: 'eu',
  fi: 'eu', fin: 'eu', finland: 'eu',
  dk: 'eu', dnk: 'eu', denmark: 'eu',
  pl: 'eu', pol: 'eu', poland: 'eu',
};

export function normaliseRegionKey(region: string | null | undefined): RegionKey {
  if (!region) return 'global';
  return REGION_KEY_MAP[region.toLowerCase().trim()] ?? 'global';
}

/** Human-readable label for a regionKey — used in LLM prompt text. */
export function regionDisplayLabel(rk: RegionKey): string {
  switch (rk) {
    case 'germany':      return 'Germany';
    case 'uk':           return 'United Kingdom';
    case 'usa':          return 'United States';
    case 'canada':       return 'Canada';
    case 'singapore':    return 'Singapore';
    case 'australia':    return 'Australia';
    case 'uae':          return 'UAE';
    case 'saudi_arabia': return 'Saudi Arabia';
    case 'india':        return 'India';
    case 'france':       return 'France';
    case 'netherlands':  return 'Netherlands';
    case 'spain':        return 'Spain';
    case 'sweden':       return 'Sweden';
    case 'switzerland':  return 'Switzerland';
    case 'japan':        return 'Japan';
    case 'brazil':       return 'Brazil';
    case 'mexico':       return 'Mexico';
    case 'philippines':  return 'Philippines';
    case 'indonesia':    return 'Indonesia';
    case 'vietnam':      return 'Vietnam';
    case 'malaysia':     return 'Malaysia';
    case 'thailand':     return 'Thailand';
    case 'south_korea':  return 'South Korea';
    case 'taiwan':       return 'Taiwan';
    case 'hong_kong':    return 'Hong Kong';
    case 'eu':           return 'EU';
    case 'global':       return 'global';
  }
}

export interface ResolvedRegionalMarket {
  regionKey: RegionKey;
  regionLabel: string;
  count: number;
  source: string;
  /** Suggested sources for this region (used in fallback narrative when
   *  region-specific data is unavailable — directs users where to verify). */
  suggestedSources: string[];
  asOf: string;
  /** true when the resolved market data is actually region-specific (from
   *  regionalOpenings[regionKey] OR indiaOpenings for an India user).
   *  false when we fell back to globalOpenings — the LLM is then instructed
   *  to disclose "region-specific data unavailable for {regionLabel}". */
  isRegionSpecific: boolean;
  /**
   * Companies actively hiring in the resolved region. Comes from
   * topHiringCompaniesByRegion[regionKey] when available; falls back to
   * topHiringCompaniesGlobal. NEVER from topHiringCompaniesIndia for non-India
   * users — that is the bug this field resolves.
   */
  hiringCompanies: string[];
  /** true when hiringCompanies is region-specific (not the global fallback). */
  isHiringCompaniesRegionSpecific: boolean;
  /**
   * Remote-eligible opening count when the resolved region has limited local
   * supply but strong remote access (e.g. Philippines, LatAm markets).
   * Null when not applicable or not populated.
   */
  remoteOpenings: number | null;
  /** Top companies hiring for this role remotely — relevant for PH/LatAm users. */
  topHiringCompaniesRemote: string[];
  /** Median weeks to first interview in this region (not offer). */
  weeksToFirstInterview: number;
}

/**
 * Resolve the appropriate market opening count + source for a user's region.
 *
 * Resolution order:
 *   1. market.regionalOpenings[regionKey] (live-cached or seeded per-region)
 *   2. market.indiaOpenings → ONLY when regionKey === 'india' (the legacy field
 *      is implicitly India-scoped — using it for any other region would be
 *      the exact bug this resolver exists to prevent).
 *   3. market.globalOpenings with isRegionSpecific=false — the LLM must
 *      then disclose that region-specific data is unavailable.
 */
/** Map a resolved RegionKey to the named per-region count field (static authoring path). */
function _namedRegionCount(m: CareerPathMarket, rk: RegionKey): number | null {
  switch (rk) {
    case 'usa':                                             return m.us_openings ?? null;
    case 'uk':                                              return m.uk_openings ?? null;
    case 'germany': case 'france': case 'netherlands':
    case 'spain': case 'sweden': case 'switzerland':
    case 'eu':                                              return m.eu_openings ?? null;
    case 'singapore': case 'australia': case 'japan':
    case 'south_korea': case 'taiwan': case 'hong_kong':   return m.apac_openings ?? null;
    case 'canada':                                          return m.canada_openings ?? null;
    case 'brazil': case 'mexico':                           return m.latam_openings ?? null;
    case 'uae': case 'saudi_arabia':                        return m.mena_openings ?? null;
    default:                                                return null;
  }
}

/** Map a resolved RegionKey to the named per-region company list (static authoring path). */
function _namedRegionCompanies(m: CareerPathMarket, rk: RegionKey): string[] | null {
  switch (rk) {
    case 'usa':                                             return m.topHiringCompaniesUS ?? null;
    case 'uk':                                              return m.topHiringCompaniesUK ?? null;
    case 'germany': case 'france': case 'netherlands':
    case 'spain': case 'sweden': case 'switzerland':
    case 'eu':                                              return m.topHiringCompaniesEU ?? null;
    case 'singapore': case 'australia': case 'japan':
    case 'south_korea': case 'taiwan': case 'hong_kong':   return m.topHiringCompaniesAPAC ?? null;
    case 'canada':                                          return m.topHiringCompaniesCanada ?? null;
    case 'brazil': case 'mexico':                           return m.topHiringCompaniesLatAm ?? null;
    case 'uae': case 'saudi_arabia':                        return m.topHiringCompaniesMENA ?? null;
    default:                                                return null;
  }
}

export function resolveRegionalMarket(
  market: CareerPathMarket,
  region: string | null | undefined,
): ResolvedRegionalMarket {
  const regionKey   = normaliseRegionKey(region);
  const regionLabel = regionDisplayLabel(regionKey);
  const suggestedSources = MARKET_DATA_SOURCES_BY_REGION[regionKey];

  const remoteOpenings          = market.remoteOpenings ?? null;
  const topHiringCompaniesRemote = market.topHiringCompaniesRemote ?? [];
  const weeksToFirstInterview   =
    market.weeksToFirstInterviewByRegion?.[regionKey] ?? market.weeksToFirstInterview;

  // ── Named per-region & dictionary company lists ───────────────────────────
  const namedCompanies = _namedRegionCompanies(market, regionKey);
  const dictCompanies  = market.topHiringCompaniesByRegion?.[regionKey];
  const hiringCompanies =
    (namedCompanies && namedCompanies.length > 0) ? namedCompanies :
    (dictCompanies  && dictCompanies.length  > 0) ? dictCompanies  :
    market.topHiringCompaniesGlobal;
  const isHiringCompaniesRegionSpecific = !!(
    (namedCompanies && namedCompanies.length > 0) ||
    (dictCompanies  && dictCompanies.length  > 0)
  );

  // Step 1: regionalOpenings dictionary (DB-override / live-cached path).
  const regional = market.regionalOpenings?.[regionKey];
  if (regional && regional.count > 0) {
    return {
      regionKey,
      regionLabel,
      count:            regional.count,
      source:           regional.source,
      suggestedSources,
      asOf:             regional.asOf ?? market.dataAsOf,
      isRegionSpecific: true,
      hiringCompanies,
      isHiringCompaniesRegionSpecific,
      remoteOpenings,
      topHiringCompaniesRemote,
      weeksToFirstInterview,
    };
  }

  // Step 1.5: named per-region fields (primary static authoring path).
  const namedCount = _namedRegionCount(market, regionKey);
  if (namedCount !== null && namedCount > 0) {
    return {
      regionKey,
      regionLabel,
      count:            namedCount,
      source:           market.dataSource,
      suggestedSources,
      asOf:             market.dataAsOf,
      isRegionSpecific: true,
      hiringCompanies,
      isHiringCompaniesRegionSpecific,
      remoteOpenings,
      topHiringCompaniesRemote,
      weeksToFirstInterview,
    };
  }

  // Step 2: India legacy field — only valid for India users.
  if (regionKey === 'india' && market.indiaOpenings > 0) {
    return {
      regionKey,
      regionLabel,
      count:            market.indiaOpenings,
      source:           'Naukri',
      suggestedSources,
      asOf:             market.dataAsOf,
      isRegionSpecific: true,
      hiringCompanies,
      isHiringCompaniesRegionSpecific: true,
      remoteOpenings,
      topHiringCompaniesRemote,
      weeksToFirstInterview,
    };
  }

  // Step 3: global aggregate, explicitly flagged so the prompt discloses it.
  return {
    regionKey,
    regionLabel,
    count:            market.globalOpenings,
    source:           'global aggregate',
    suggestedSources,
    asOf:             market.dataAsOf,
    isRegionSpecific: false,
    hiringCompanies,
    isHiringCompaniesRegionSpecific,
    remoteOpenings,
    topHiringCompaniesRemote,
    weeksToFirstInterview,
  };
}

export function formatDemandTrendLabel(trend: CareerPathMarket['demandTrend']): string {
  switch (trend) {
    case 'surging':     return '↑↑ Surging demand';
    case 'growing':     return '↑ Growing demand';
    case 'stable':      return '→ Stable demand';
    case 'contracting': return '↓ Contracting demand';
  }
}

export function formatSuccessRate(pct: number): string {
  if (pct >= 60) return `${pct}% (high)`;
  if (pct >= 40) return `${pct}% (moderate)`;
  return `${pct}% (competitive)`;
}
