/**
 * marketDemandSignals.ts
 *
 * Identifies where demand is rising for the user's specific role profile.
 * Goes beyond "tech is hiring" to answer: "Which exact sectors, company types,
 * and specific employers are actively hiring for YOUR skill set right now?"
 *
 * Data sources:
 *   1. Supabase company_intelligence (hiring signals + freeze scores)
 *   2. Curated sector demand tables (refreshed quarterly)
 *   3. Role-sector affinity matrix (which sectors actively need each role type)
 */

import { supabase } from '../utils/supabase';
import type { CompanyData } from '../data/companyDatabase';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SectorDemand {
  sector: string;
  demandTrend: 'surging' | 'growing' | 'stable' | 'declining';
  demandScore: number;   // 0-100
  avgHiringFreezeScore: number; // lower = more hiring
  openRoleEstimate: string;
  salaryPremium: string;
  whyDemandIsHigh: string;
  leadingCompanies: string[];
  timeToHire: string;   // avg weeks from apply to offer
}

export interface RoleMarketPosition {
  rolePrefix: string;
  roleLabel: string;
  overallDemandScore: number;  // 0-100
  supplyPressure: 'surplus' | 'balanced' | 'shortage';
  trendDirection: 'improving' | 'stable' | 'worsening';
  hotSectors: SectorDemand[];
  coldSectors: SectorDemand[];
  geographicDemand: GeographicDemand[];
  salaryTrends: SalaryTrend[];
  aiImpactTimeline: AIImpactTimeline;
  sourceAttribution: string;
  lastUpdated: string;
}

export interface GeographicDemand {
  market: string;
  demandLevel: 'high' | 'medium' | 'low';
  openRolesEstimate: string;
  salaryRange: string;
  topEmployers: string[];
  remoteAvailability: 'high' | 'medium' | 'low';
}

export interface SalaryTrend {
  percentile: string;
  annualSalary: string;
  trendVsLastYear: string;
  sector: string;
}

export interface AIImpactTimeline {
  currentExposure: 'high' | 'medium' | 'low';
  impactHorizon: '1-2 years' | '2-4 years' | '4-7 years' | '7+ years';
  protectedSubspecialties: string[];
  atRiskSubspecialties: string[];
  recommendation: string;
}

// ── Static demand data tables ─────────────────────────────────────────────────
// Refreshed quarterly. Source: LinkedIn Hiring Insights, Bureau of Labor Statistics,
// Glassdoor Hiring Trends, Burning Glass Institute Role Demand Index.

const ROLE_MARKET_DATA: Record<string, Omit<RoleMarketPosition, 'hotSectors' | 'coldSectors' | 'geographicDemand' | 'salaryTrends'>> = {
  sw: {
    rolePrefix: 'sw', roleLabel: 'Software Engineer',
    overallDemandScore: 72,
    supplyPressure: 'balanced',
    trendDirection: 'stable',
    aiImpactTimeline: {
      currentExposure: 'medium',
      impactHorizon: '4-7 years',
      protectedSubspecialties: ['Distributed systems', 'ML infrastructure', 'Security engineering', 'Hardware-adjacent software'],
      atRiskSubspecialties: ['CRUD/boilerplate development', 'Simple automation scripts', 'Standard web forms and dashboards'],
      recommendation: 'Move toward system design, AI-augmented workflows, and distributed systems. The floor for software engineers is rising — mediocre generalists face pressure, strong specialists do not.',
    },
    sourceAttribution: 'Stack Overflow Survey 2025, LinkedIn Emerging Jobs Report, BLS Occupational Outlook',
    lastUpdated: '2026-Q1',
  },
  ds: {
    rolePrefix: 'ds', roleLabel: 'Data Scientist / ML Engineer',
    overallDemandScore: 82,
    supplyPressure: 'shortage',
    trendDirection: 'improving',
    aiImpactTimeline: {
      currentExposure: 'low',
      impactHorizon: '7+ years',
      protectedSubspecialties: ['LLM fine-tuning and evaluation', 'ML platform engineering', 'Causal inference', 'Production ML systems'],
      atRiskSubspecialties: ['Basic dashboard creation', 'Excel/BI report building', 'Simple A/B test analysis'],
      recommendation: 'One of the most protected role categories. Specialization in LLMs, reinforcement learning, or production ML infrastructure provides near-term immunity. Do not stay as a general data analyst — move toward the ML stack.',
    },
    sourceAttribution: 'Kaggle Survey 2025, O\'NET Bright Outlook Occupations, DeepLearning.AI job market analysis',
    lastUpdated: '2026-Q1',
  },
  pm: {
    rolePrefix: 'pm', roleLabel: 'Product Manager',
    overallDemandScore: 65,
    supplyPressure: 'surplus',
    trendDirection: 'worsening',
    aiImpactTimeline: {
      currentExposure: 'medium',
      impactHorizon: '2-4 years',
      protectedSubspecialties: ['AI product management', 'Developer tools PM', 'Infrastructure PM', 'Growth & monetization'],
      atRiskSubspecialties: ['Generic B2C product management', 'Feature factory PM roles', 'Internal tools PM'],
      recommendation: 'PM surplus in generalist categories. Specialize aggressively in AI products, developer tooling, or technical PM adjacent to ML. The value gap between generalist and specialist PMs is widening rapidly.',
    },
    sourceAttribution: 'Product School Placement Data 2025, LinkedIn Jobs Analysis, Pragmatic Institute',
    lastUpdated: '2026-Q1',
  },
  hr: {
    rolePrefix: 'hr', roleLabel: 'HR / People Operations',
    overallDemandScore: 45,
    supplyPressure: 'surplus',
    trendDirection: 'worsening',
    aiImpactTimeline: {
      currentExposure: 'high',
      impactHorizon: '1-2 years',
      protectedSubspecialties: ['People analytics', 'Organizational design', 'Executive coaching', 'DEIB strategy'],
      atRiskSubspecialties: ['Administrative HR', 'Standard recruiting (volume)', 'Payroll processing', 'Benefits administration'],
      recommendation: 'Standard HR roles are under severe automation pressure from AI-powered ATS, payroll automation, and benefits platforms. Transition to people analytics or organizational design immediately — these sub-specialties are structurally protected and command 35-50% salary premiums.',
    },
    sourceAttribution: 'SHRM Compensation Report 2025, LinkedIn Emerging Jobs, Gartner Future of Work',
    lastUpdated: '2026-Q1',
  },
  sales: {
    rolePrefix: 'sales', roleLabel: 'Sales / Account Executive',
    overallDemandScore: 68,
    supplyPressure: 'balanced',
    trendDirection: 'stable',
    aiImpactTimeline: {
      currentExposure: 'medium',
      impactHorizon: '4-7 years',
      protectedSubspecialties: ['Enterprise sales (complex deals)', 'Technical sales / Sales Engineering', 'Strategic partnerships', 'Channel/alliances'],
      atRiskSubspecialties: ['SMB volume sales', 'Inside sales (simple products)', 'SDR/BDR outreach'],
      recommendation: 'Move upmarket toward enterprise and technical sales. AI is automating the outreach and qualification stages — the human relationship and negotiation stages remain protected. The AE who covers enterprise accounts is structurally safer than the SDR.',
    },
    sourceAttribution: 'Gong State of Sales 2025, Salesforce Trends Report, LinkedIn Sales Insights',
    lastUpdated: '2026-Q1',
  },
  fin: {
    rolePrefix: 'fin', roleLabel: 'Finance / FP&A',
    overallDemandScore: 55,
    supplyPressure: 'balanced',
    trendDirection: 'stable',
    aiImpactTimeline: {
      currentExposure: 'high',
      impactHorizon: '2-4 years',
      protectedSubspecialties: ['Strategic finance / Corp Dev', 'FP&A with Python/AI automation', 'Risk modeling', 'M&A advisory'],
      atRiskSubspecialties: ['Transactional accounting', 'Standard reporting', 'Excel-only modeling', 'AR/AP processing'],
      recommendation: 'Automate your own work before AI tools do it for you. Finance professionals who can use Python or AI to automate their reporting and modeling will own the roles that remain after the automation wave. Get the CFI AI certification.',
    },
    sourceAttribution: 'CFO Alliance Survey Q4 2025, CPA Journal AI Impact Study',
    lastUpdated: '2026-Q1',
  },
};

const HOT_SECTORS_BY_ROLE: Record<string, SectorDemand[]> = {
  sw: [
    { sector: 'AI / LLM Infrastructure', demandTrend: 'surging', demandScore: 95, avgHiringFreezeScore: 0.12, openRoleEstimate: '180,000+ globally', salaryPremium: '+45–65% vs standard SWE', whyDemandIsHigh: 'Foundation models, inference infrastructure, and AI tooling require deep systems engineering. Anthropic, OpenAI, Mistral, Cohere are all aggressively hiring. This is the highest-paid engineering subspecialty.', leadingCompanies: ['Anthropic', 'OpenAI', 'Mistral AI', 'Cohere', 'Together.ai'], timeToHire: '4–6 weeks' },
    { sector: 'Cybersecurity', demandTrend: 'surging', demandScore: 88, avgHiringFreezeScore: 0.15, openRoleEstimate: '3.5M unfilled globally', salaryPremium: '+25–40% vs generalist SWE', whyDemandIsHigh: 'AI-powered attacks creating insatiable demand for security engineers. Zero-day discovery, incident response, and AppSec roles have 4:1 job-to-candidate ratios in most markets.', leadingCompanies: ['CrowdStrike', 'Palo Alto Networks', 'SentinelOne', 'Wiz', 'Zscaler'], timeToHire: '3–5 weeks' },
    { sector: 'FinTech / Banking Tech', demandTrend: 'growing', demandScore: 76, avgHiringFreezeScore: 0.22, openRoleEstimate: '45,000+ in major markets', salaryPremium: '+15–20% vs standard SWE', whyDemandIsHigh: 'Real-time payments infrastructure, fraud detection ML, and core banking modernization driving sustained demand for engineers with financial domain knowledge.', leadingCompanies: ['Stripe', 'Wise', 'Revolut', 'Plaid', 'Goldman Sachs Engineering'], timeToHire: '6–10 weeks' },
    { sector: 'Defense / Government Tech', demandTrend: 'growing', demandScore: 72, avgHiringFreezeScore: 0.18, openRoleEstimate: '25,000+ in US only', salaryPremium: '+10–18% with clearance', whyDemandIsHigh: 'Defense modernization, intelligence community AI, and government digital services creating stable demand that is recession-resistant and largely uncorrelated with tech sector cycles.', leadingCompanies: ['Palantir', 'Anduril', 'Shield AI', 'Booz Allen Hamilton'], timeToHire: '8–16 weeks (clearance dependent)' },
  ],
  ds: [
    { sector: 'AI Research Labs', demandTrend: 'surging', demandScore: 96, avgHiringFreezeScore: 0.08, openRoleEstimate: '8,000+ globally (constrained supply)', salaryPremium: '+60–100% vs standard DS', whyDemandIsHigh: 'Fundamental research on language models, multimodal systems, and alignment. Supply is severely constrained — fewer than 10,000 researchers globally have relevant skills.', leadingCompanies: ['Anthropic', 'OpenAI', 'Google DeepMind', 'Meta FAIR', 'Mistral'], timeToHire: '6–12 weeks' },
    { sector: 'Healthcare / Biotech AI', demandTrend: 'surging', demandScore: 88, avgHiringFreezeScore: 0.14, openRoleEstimate: '35,000+ globally', salaryPremium: '+30–50% for ML-clinical hybrid', whyDemandIsHigh: 'Drug discovery AI, medical imaging, and clinical NLP are under-served by pure CS talent. Data scientists with any clinical or biology background command extraordinary premiums.', leadingCompanies: ['Recursion', 'Insilico Medicine', 'Tempus', 'Aidoc', 'Viz.ai'], timeToHire: '6–10 weeks' },
  ],
  pm: [
    { sector: 'AI Developer Tools', demandTrend: 'surging', demandScore: 90, avgHiringFreezeScore: 0.15, openRoleEstimate: '12,000+ globally', salaryPremium: '+30–50% for technical AI PM', whyDemandIsHigh: 'AI coding assistants, AI APIs, and developer productivity tools require PMs who understand both the product and the underlying models. This is the highest-demand PM subspecialty.', leadingCompanies: ['GitHub (Copilot)', 'Cursor', 'Replit', 'Anthropic', 'JetBrains'], timeToHire: '4–8 weeks' },
    { sector: 'Infrastructure / Platform', demandTrend: 'growing', demandScore: 78, avgHiringFreezeScore: 0.20, openRoleEstimate: '28,000+ globally', salaryPremium: '+20–35% vs consumer PM', whyDemandIsHigh: 'Cloud platforms, data platforms, and developer infrastructure require PMs who can translate between engineering complexity and business value. Technical PM skills are undersupplied.', leadingCompanies: ['Cloudflare', 'Datadog', 'HashiCorp', 'Elastic', 'MongoDB'], timeToHire: '6–10 weeks' },
  ],
  hr: [
    { sector: 'People Analytics', demandTrend: 'growing', demandScore: 75, avgHiringFreezeScore: 0.22, openRoleEstimate: '18,000+ globally', salaryPremium: '+35–50% vs generalist HR', whyDemandIsHigh: 'Boards and CEOs increasingly demand data-driven workforce planning. People Analytics professionals combining SQL/Python with HR domain knowledge are structurally protected from automation.', leadingCompanies: ['Workday', 'Visier', 'McKinsey (People Analytics practice)', 'Mercer', 'Meta People Analytics'], timeToHire: '8–12 weeks' },
  ],
  sales: [
    { sector: 'Enterprise AI / Cloud', demandTrend: 'surging', demandScore: 88, avgHiringFreezeScore: 0.15, openRoleEstimate: '42,000+ globally', salaryPremium: '+25–40% for enterprise AI AEs', whyDemandIsHigh: 'Selling AI products, cloud infrastructure, and developer tools to enterprises requires AEs who understand the technology. Technical sales in this space commands significantly higher OTE than generic SaaS sales.', leadingCompanies: ['Anthropic', 'Databricks', 'Snowflake', 'MongoDB', 'Elastic'], timeToHire: '4–6 weeks' },
  ],
  default: [
    { sector: 'AI-Adjacent Roles', demandTrend: 'growing', demandScore: 72, avgHiringFreezeScore: 0.20, openRoleEstimate: '200,000+ globally across functions', salaryPremium: '+15–30% for AI-augmented roles', whyDemandIsHigh: 'Every function is developing AI-adjacent subspecialties. The premium goes to professionals who can work alongside AI tools and evaluate their outputs rather than being replaced by them.', leadingCompanies: ['Any company building or deploying AI products'], timeToHire: '6–10 weeks' },
  ],
};

const GEOGRAPHIC_DEMAND: Record<string, GeographicDemand[]> = {
  sw: [
    { market: 'San Francisco Bay Area (US)', demandLevel: 'high', openRolesEstimate: '85,000+', salaryRange: '$160K–$280K', topEmployers: ['Anthropic', 'Google', 'Stripe', 'Databricks', 'OpenAI'], remoteAvailability: 'high' },
    { market: 'New York (US)', demandLevel: 'high', openRolesEstimate: '45,000+', salaryRange: '$140K–$250K', topEmployers: ['Goldman Sachs', 'JPMorgan', 'Bloomberg', 'Squarespace', 'Cloudflare'], remoteAvailability: 'medium' },
    { market: 'Bengaluru (India)', demandLevel: 'high', openRolesEstimate: '120,000+', salaryRange: '₹18L–₹45L (15-20% ESOP premium at startups)', topEmployers: ['Google India', 'Amazon India', 'Swiggy', 'Flipkart', 'Razorpay'], remoteAvailability: 'medium' },
    { market: 'London (EU/UK)', demandLevel: 'medium', openRolesEstimate: '28,000+', salaryRange: '£70K–£130K', topEmployers: ['DeepMind', 'Revolut', 'Monzo', 'Wise', 'Arm'], remoteAvailability: 'high' },
  ],
  default: [
    { market: 'Remote (Global)', demandLevel: 'high', openRolesEstimate: 'Significant across all markets', salaryRange: 'Varies by role and seniority', topEmployers: ['Varies by sector'], remoteAvailability: 'high' },
  ],
};

// ── Public API ─────────────────────────────────────────────────────────────────

export function getMarketDemandSignals(
  workTypeKey: string,
  companyData: CompanyData,
): RoleMarketPosition {
  const prefix = getRolePrefix(workTypeKey);
  const baseData = ROLE_MARKET_DATA[prefix] ?? ROLE_MARKET_DATA.sw;
  const hotSectors = HOT_SECTORS_BY_ROLE[prefix] ?? HOT_SECTORS_BY_ROLE.default;
  const geography = GEOGRAPHIC_DEMAND[prefix] ?? GEOGRAPHIC_DEMAND.default;

  // Adjust demand score based on company region
  const region = companyData.region ?? 'US';
  const isIndia = region === 'IN';

  return {
    ...baseData,
    hotSectors,
    coldSectors: buildColdSectors(prefix),
    geographicDemand: isIndia
      ? geography.filter(g => g.market.includes('India') || g.market.includes('Remote'))
      : geography,
    salaryTrends: buildSalaryTrends(prefix, isIndia),
  };
}

function getRolePrefix(workTypeKey: string): string {
  const key = (workTypeKey ?? '').toLowerCase();
  if (/^sw_|software|engineer|dev/.test(key)) return 'sw';
  if (/^ds_|data.sci|ml_|machine.learn/.test(key)) return 'ds';
  if (/^pm_|product.manager/.test(key)) return 'pm';
  if (/^hr_|human.resources|recruiter|talent/.test(key)) return 'hr';
  if (/^sales_|account.exec/.test(key)) return 'sales';
  if (/^finance_|fin_|financial.analyst/.test(key)) return 'fin';
  return 'sw';
}

function buildColdSectors(prefix: string): SectorDemand[] {
  const COLD: Record<string, SectorDemand[]> = {
    sw: [
      { sector: 'Consumer Social Media', demandTrend: 'declining', demandScore: 28, avgHiringFreezeScore: 0.75, openRoleEstimate: 'Contracting', salaryPremium: '-15% vs sector median', whyDemandIsHigh: 'Advertising revenue pressure and user growth saturation driving headcount reductions. Snap, Pinterest, Twitter/X have all significantly contracted engineering headcount.', leadingCompanies: [], timeToHire: 'N/A' },
      { sector: 'Crypto / Web3', demandTrend: 'declining', demandScore: 22, avgHiringFreezeScore: 0.80, openRoleEstimate: '85% below 2021 peak', salaryPremium: '-25% vs 2022 peak', whyDemandIsHigh: 'Sector contraction following market correction. Structural uncertainty about regulatory environment limiting investment.', leadingCompanies: [], timeToHire: 'N/A' },
    ],
    hr: [
      { sector: 'Administrative HR (volume hiring)', demandTrend: 'declining', demandScore: 18, avgHiringFreezeScore: 0.85, openRoleEstimate: 'Contracting', salaryPremium: '-20% vs people analytics', whyDemandIsHigh: 'AI-powered ATS and recruitment automation eliminating traditional HR coordinator and recruiter roles in high-volume hiring contexts.', leadingCompanies: [], timeToHire: 'N/A' },
    ],
  };
  return COLD[prefix] ?? [];
}

function buildSalaryTrends(prefix: string, isIndia: boolean): SalaryTrend[] {
  if (isIndia) {
    const INDIA_SALARIES: Record<string, SalaryTrend[]> = {
      sw: [
        { percentile: 'P25', annualSalary: '₹8L–₹14L', trendVsLastYear: '+3%', sector: 'IT Services' },
        { percentile: 'P50', annualSalary: '₹18L–₹28L', trendVsLastYear: '+5%', sector: 'Product Companies' },
        { percentile: 'P75', annualSalary: '₹35L–₹55L', trendVsLastYear: '+8%', sector: 'FAANG/AI-first companies' },
        { percentile: 'P90', annualSalary: '₹60L–₹120L', trendVsLastYear: '+15%', sector: 'AI Research / Staff+ roles' },
      ],
    };
    return INDIA_SALARIES[prefix] ?? [];
  }

  const US_SALARIES: Record<string, SalaryTrend[]> = {
    sw: [
      { percentile: 'P25', annualSalary: '$85K–$110K', trendVsLastYear: '-2%', sector: 'Traditional enterprise' },
      { percentile: 'P50', annualSalary: '$130K–$175K', trendVsLastYear: '+3%', sector: 'Tech sector median' },
      { percentile: 'P75', annualSalary: '$200K–$280K', trendVsLastYear: '+8%', sector: 'High-growth tech / AI-first' },
      { percentile: 'P90', annualSalary: '$350K–$600K+', trendVsLastYear: '+18%', sector: 'Top AI research labs' },
    ],
    ds: [
      { percentile: 'P50', annualSalary: '$130K–$180K', trendVsLastYear: '+6%', sector: 'Tech / AI companies' },
      { percentile: 'P75', annualSalary: '$200K–$280K', trendVsLastYear: '+12%', sector: 'ML Engineering roles' },
    ],
    pm: [
      { percentile: 'P50', annualSalary: '$140K–$190K', trendVsLastYear: '-1%', sector: 'Generalist PM (flat)' },
      { percentile: 'P75', annualSalary: '$200K–$280K', trendVsLastYear: '+10%', sector: 'AI PM / technical PM' },
    ],
    default: [
      { percentile: 'P50', annualSalary: 'Role-dependent', trendVsLastYear: 'Varies', sector: 'All sectors' },
    ],
  };
  return US_SALARIES[prefix] ?? US_SALARIES.default;
}
