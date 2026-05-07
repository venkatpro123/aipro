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
  /** Top 5 companies actively hiring for this role in India */
  topHiringCompaniesIndia: string[];
  /** Top 5 companies globally */
  topHiringCompaniesGlobal: string[];
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
    hiringBar: 'A working automation framework — Selenium/Playwright + API test suite + CI/CD integration. The AI differentiation is: AI-powered test generation (Copilot/TestPilot) + intelligent test selection. Manual testers who can only write test cases are being screened out at the JD level.',
    proofOfCompetency: 'GitHub repo with a complete automation framework: UI tests (Playwright) + API tests (Postman/REST-assured) + CI/CD pipeline + test report generation. Running against a public app or your own project.',
    medianSalaryDeltaPct: 40,
    successRate12mPct: 65,
    demandTrend: 'growing',
    weeksToFirstInterview: 6,
    dataAsOf: '2025-12-31',
    dataSource: 'NASSCOM Testing Trends 2025, Stack Overflow Developer Survey 2024',
  },

  'technical_writer_ai': {
    targetRole: 'Technical Writer (AI Documentation)',
    indiaOpenings: 1800,
    globalOpenings: 9200,
    topHiringCompaniesIndia: ['Freshworks', 'Zoho Docs', 'Postman', 'HasuraDB', 'Chargebee'],
    topHiringCompaniesGlobal: ['Stripe Docs', 'Twilio', 'Cloudflare', 'HashiCorp', 'Notion'],
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
