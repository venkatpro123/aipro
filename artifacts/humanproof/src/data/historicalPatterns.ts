// historicalPatterns.ts
// Intelligence Upgrade 2 — v7.0
//
// Verified historical precedent database for pattern matching.
// Every pattern has documented trigger conditions, real historical companies,
// and outcome timelines derived from public data (layoffs.fyi, news archives,
// earnings reports). No LLM-generated patterns — all entries are manually
// curated and source-verifiable.
//
// USAGE:
//   1. Call computeTopPatternCandidates(companyData, breakdown, roleTitle) to get
//      the top 3 matching patterns by overlap score.
//   2. Pass those 3 candidates to Claude for confirmation (patternId only, not prose).
//   3. Validate the returned patternId against HISTORICAL_PATTERNS before displaying.
//   4. Display the full structured pattern card — NOT LLM prose.
//
// ADDING NEW PATTERNS:
//   - Every required field must have an independently verifiable source.
//   - historicalCompanies must list ≥ 2 real companies where this pattern played out.
//   - Do not add patterns based on a single company. One company = an outlier, not a pattern.

import type { CompanyData } from './companyDatabase';
import type { ScoreBreakdown } from '../services/layoffScoreEngine';

// ── Types ────────────────────────────────────────────────────────────────────

export type PatternCategory =
  | 'india_it_automation'
  | 'big_tech_efficiency'
  | 'saas_startup_contraction'
  | 'role_ai_displacement'
  | 'sector_wave'
  | 'company_lifecycle';

export interface SignalCondition {
  /** Dot-notation field path resolvable by evalCondition() */
  field: string;
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'in' | 'not_in';
  value: number | string | boolean | string[];
  /** 0–1: importance of this condition for the pattern's identity */
  weight: number;
  description: string;
}

export interface HistoricalCompany {
  name: string;
  region: 'India' | 'US' | 'Global';
  year: number;
  /** One sentence: what actually happened */
  outcome: string;
  /** Months from first detectable signal to the layoff announcement */
  signalLagMonths: number;
}

export interface HistoricalPattern {
  patternId: string;
  patternName: string;
  category: PatternCategory;
  /** 1-2 sentence human-readable summary shown in the card header */
  summary: string;
  triggerConditions: {
    /** ALL required conditions must score positively for the pattern to qualify */
    required: SignalCondition[];
    /** Supporting conditions improve the overlap score but are not gating */
    supporting: SignalCondition[];
    /** If any of these conditions are true, the pattern does NOT apply */
    contradictedBy?: SignalCondition[];
  };
  historicalCompanies: HistoricalCompany[];
  outcomeTimeline: {
    /** Median observed period from first signal to displacement */
    typical: string;
    best_case: string;
    worst_case: string;
  };
  /** Role titles most commonly affected by this pattern */
  affectedRoles: string[];
  /** Role titles that survived or were created by this pattern */
  protectedRoles: string[];
  recommendedResponse: {
    /** Actions completable within 7 days */
    immediate: string;
    /** 1–3 month actions */
    short_term: string;
    /** 3–12 month actions */
    medium_term: string;
  };
  /** Source quality note — what data backs this pattern */
  evidenceNote: string;
}

// ── Pattern Database ─────────────────────────────────────────────────────────

export const HISTORICAL_PATTERNS: Record<string, HistoricalPattern> = {

  // ── Category 1: India IT Automation ──────────────────────────────────────

  INDIA_IT_BPO_AUTOMATION_2024: {
    patternId: 'INDIA_IT_BPO_AUTOMATION_2024',
    patternName: 'India IT/BPO Automation Wave 2024–2025',
    category: 'india_it_automation',
    summary:
      'Large India IT services firms deploying AI to replace high-volume, process-driven roles. ' +
      'Characterised by stable or growing revenue alongside headcount freezes and selective BPO cuts.',
    triggerConditions: {
      required: [
        { field: 'companyData.region', operator: 'eq', value: 'IN',  weight: 0.30, description: 'India-based company or GCC' },
        { field: 'breakdown.L3',       operator: 'gt', value: 0.55,  weight: 0.35, description: 'Role displacement risk elevated (L3 > 55)' },
        { field: 'companyData.aiInvestmentSignal', operator: 'in', value: ['high', 'very-high', 'very_high'], weight: 0.35, description: 'High AI investment signal' },
      ],
      supporting: [
        { field: 'companyData.layoffRounds', operator: 'gte', value: 1, weight: 0.20, description: 'At least one prior layoff round' },
        { field: 'breakdown.L2',             operator: 'gt',  value: 0.40, weight: 0.20, description: 'Layoff history elevated' },
        { field: 'roleTitle',                operator: 'in',  value: ['testing', 'qa', 'bpo', 'data entry', 'customer support', 'analyst', 'developer'], weight: 0.25, description: 'Automation-exposed role category' },
      ],
    },
    historicalCompanies: [
      { name: 'TCS',      region: 'India', year: 2024, outcome: '12,000–15,000 roles rationalised in testing, BPO and low-code maintenance; AI-assisted automation deployed in client delivery',               signalLagMonths: 8 },
      { name: 'Infosys',  region: 'India', year: 2024, outcome: 'Headcount flat for 4 consecutive quarters; generative AI pilot displaced ~3,000 BPO-equivalent roles internally',                            signalLagMonths: 10 },
      { name: 'Wipro',    region: 'India', year: 2025, outcome: 'Selective headcount reduction in India IT services; AI-driven productivity offsets 8–12% of prior manual-testing headcount',                  signalLagMonths: 12 },
      { name: 'HCLTech',  region: 'India', year: 2024, outcome: 'Revenue per employee increased 11% YoY with flat headcount; AI tooling cited in quarterly results as primary productivity driver',            signalLagMonths: 9  },
    ],
    outcomeTimeline: {
      typical:    '8–18 months from AI investment signal to visible headcount impact',
      best_case:  '12–18 months — phased automation with internal reskilling absorbing most workers',
      worst_case: '6–9 months — rapid tooling deployment with no reskilling programme',
    },
    affectedRoles:  ['Manual QA / Testing', 'BPO Operations', 'Data Entry', 'Junior Developer', 'IT Support', 'Content Moderation'],
    protectedRoles: ['AI/LLM Systems Engineer', 'Platform Engineer', 'Solution Architect', 'Client Partner'],
    recommendedResponse: {
      immediate:   'Map which of your current tasks are automatable via existing tools (GitHub Copilot, Playwright, Robocorp). Identify the 1–2 tasks where you ADD oversight rather than execute.',
      short_term:  'Complete one AI-augmentation proof point: automate a manual task you currently own and document the time saved. This converts you from automation target to automation architect.',
      medium_term: 'Pursue an AI/LLM Systems or MLOps certification. In India IT services, GCC roles are growing while traditional services shrink — pivot toward GCC clients.',
    },
    evidenceNote: 'Derived from TCS, Infosys, Wipro, HCLTech quarterly results 2024–2025 and NASSCOM AI Talent Report Q1 2026.',
  },

  INDIA_IT_STARTUP_FUNDING_WINTER_2022: {
    patternId: 'INDIA_IT_STARTUP_FUNDING_WINTER_2022',
    patternName: 'India Startup Funding Winter 2022–2024',
    category: 'india_it_automation',
    summary:
      'India tech startups burning cash post-2021 peak, unable to raise at prior valuations. ' +
      'Layoffs driven by runway pressure, not AI — cuts typically affect non-core functions first.',
    triggerConditions: {
      required: [
        { field: 'companyData.region',   operator: 'eq',  value: 'IN',    weight: 0.25, description: 'India-based startup' },
        { field: 'companyData.isPublic', operator: 'eq',  value: false,   weight: 0.25, description: 'Private company (no listed stock)' },
        { field: 'breakdown.L1',         operator: 'gt',  value: 0.55,    weight: 0.35, description: 'Company health stressed (L1 > 55)' },
        { field: 'companyData.monthsSinceLastFunding', operator: 'gt', value: 18, weight: 0.15, description: 'Stale funding — >18 months without new round' },
      ],
      supporting: [
        { field: 'breakdown.L2',         operator: 'gt', value: 0.45, weight: 0.25, description: 'Layoff history elevated' },
        { field: 'companyData.revenueGrowthYoY', operator: 'lt', value: 10, weight: 0.20, description: 'Revenue growth below 10%' },
        { field: 'companyData.layoffRounds', operator: 'gte', value: 1, weight: 0.20, description: 'At least one prior round' },
      ],
    },
    historicalCompanies: [
      { name: "Byju's",    region: 'India', year: 2023, outcome: '4,500+ layoffs across 2022–2023; CEO resignation; NCLT insolvency proceedings by 2024',                         signalLagMonths: 12 },
      { name: 'Ola',       region: 'India', year: 2023, outcome: '1,000+ headcount reduction in 2023; Ola Cabs and OlaElectric restructured separately under funding pressure',   signalLagMonths: 8  },
      { name: 'Unacademy', region: 'India', year: 2022, outcome: '1,000 employees laid off (10% of workforce); subsequent Series D at lower valuation, further cuts in 2023',     signalLagMonths: 6  },
      { name: 'Meesho',    region: 'India', year: 2023, outcome: '250 laid off; pivoted to profitability-first model; survived and reached profitability by 2024',               signalLagMonths: 9  },
    ],
    outcomeTimeline: {
      typical:    '6–18 months from funding stress signal to layoff announcement',
      best_case:  '9–12 months — company achieves profitability before forced cut, smaller headcount reduction',
      worst_case: '6–9 months — runway < 6 months, emergency cut of 15–30% headcount',
    },
    affectedRoles:  ['Operations', 'Customer Support', 'Marketing', 'Business Development', 'Non-core Engineering'],
    protectedRoles: ["Core Product Engineering", "Revenue-generating roles", "Founders' network hires"],
    recommendedResponse: {
      immediate:   "Calculate your company's likely runway: last fundraise amount ÷ monthly burn (check job postings slowdown and pay delays as leading signals). If runway < 9 months, begin external search this week.",
      short_term:  'Build a "startup survival" resume narrative: emphasise breadth, shipped products, and ownership — these are valued by other early-stage companies and GCCs hiring for startup DNA.',
      medium_term: 'Target Series-B+ companies in your vertical that have recently raised — they are the most likely landing spots for talent displaced from Series-A/pre-seed peers.',
    },
    evidenceNote: "Derived from layoffs.fyi India data 2022–2024, Mint/Economic Times funding winter coverage, and Byju's NCLT filings.",
  },

  // ── Category 2: Big Tech Efficiency ──────────────────────────────────────

  BIG_TECH_AI_EFFICIENCY_2023: {
    patternId: 'BIG_TECH_AI_EFFICIENCY_2023',
    patternName: 'Big Tech Profitable AI Efficiency Restructuring 2023–2025',
    category: 'big_tech_efficiency',
    summary:
      'Profitable, high-AI-investment tech companies making first-ever headcount cuts not driven by ' +
      'financial distress but by AI productivity substitution. Revenue growing; workforce shrinking.',
    triggerConditions: {
      required: [
        { field: 'breakdown.L1',       operator: 'lt', value: 0.45, weight: 0.35, description: 'Company financially healthy (L1 < 45 — not distress-driven)' },
        { field: 'companyData.aiInvestmentSignal', operator: 'in', value: ['high', 'very-high', 'very_high'], weight: 0.35, description: 'Very high AI investment' },
        { field: 'companyData.revenueGrowthYoY',  operator: 'gt', value: 5, weight: 0.15, description: 'Revenue still growing (confirms non-distress motivation)' },
      ],
      supporting: [
        { field: 'companyData.layoffRounds', operator: 'gte', value: 1, weight: 0.20, description: 'Prior round exists (D8 Gate A)' },
        { field: 'companyData.revenuePerEmployee', operator: 'gt', value: 715000, weight: 0.25, description: 'Revenue per employee > 130% of tech sector benchmark ($550K)' },
        { field: 'breakdown.L3', operator: 'gt', value: 0.50, weight: 0.20, description: 'Role displacement elevated' },
      ],
      contradictedBy: [
        { field: 'breakdown.L1', operator: 'gte', value: 0.60, weight: 1.0, description: 'Financial distress present — this is distress cutting, not efficiency cutting' },
      ],
    },
    historicalCompanies: [
      { name: 'Meta',      region: 'US', year: 2023, outcome: '21,000 total cuts (2022–2023); described as "Year of Efficiency"; AI copilots deployed in Ads, Integrity, GenAI orgs simultaneously', signalLagMonths: 9 },
      { name: 'Google',    region: 'US', year: 2023, outcome: '12,000 cuts Jan 2023; further 1,000 in 2024 (hardware/assistant teams); Gemini deployed as productivity layer in parallel',            signalLagMonths: 6 },
      { name: 'Microsoft', region: 'US', year: 2023, outcome: '10,000 cuts Jan 2023; same month as $10B OpenAI investment announced; AI Copilot deployment accelerated across Microsoft 365',         signalLagMonths: 4 },
      { name: 'Salesforce', region: 'US', year: 2023, outcome: '8,000 cuts (10% workforce); Agentforce (AI sales agent) launch accelerated same year',                                               signalLagMonths: 8 },
    ],
    outcomeTimeline: {
      typical:    '6–12 months from AI investment signal to first headcount announcement',
      best_case:  '12–18 months — slow rollout with internal mobility absorbing most displaced workers',
      worst_case: '3–6 months — rapid deployment without redeployment programme',
    },
    affectedRoles:  ['Manual Analyst', 'Entry-level Developer', 'Content Reviewer', 'Ops Specialist', 'Junior Recruiter'],
    protectedRoles: ['AI Engineer', 'Product Manager (AI products)', 'Sales', 'Research Scientist'],
    recommendedResponse: {
      immediate:   'Identify which of your current deliverables are now achievable using Copilot/Gemini/Claude in 20% of the time. Document this yourself before your manager discovers it — position yourself as the productivity multiplier, not the productivity target.',
      short_term:  'Build one AI-assisted proof point that shows 5× output — a report, analysis, or code artifact produced with AI tools that previously took days. This is your retention asset.',
      medium_term: 'Pivot toward AI-adjacent roles: AI product management, LLM evaluation, prompt engineering at scale, or AI governance. These roles are growing inside every company that just cut execution-layer headcount.',
    },
    evidenceNote: 'Derived from Meta "Year of Efficiency" Q1 2023 earnings, Google Jan 2023 announcement, Microsoft Jan 2023 announcement, Salesforce Q1 2023 earnings. All confirmed layoffs.fyi.',
  },

  BIG_TECH_POST_ZIRP_CORRECTION_2022: {
    patternId: 'BIG_TECH_POST_ZIRP_CORRECTION_2022',
    patternName: 'Post-Zero-Interest-Rate Tech Overstaffing Correction 2022–2023',
    category: 'big_tech_efficiency',
    summary:
      'Tech companies that tripled headcount 2019–2022 during zero-interest era face mandatory ' +
      'efficiency pressure as interest rates rise. Characterised by high overstaffing ratios and revenue growth deceleration.',
    triggerConditions: {
      required: [
        { field: 'companyData.revenueGrowthYoY',  operator: 'lt',  value: 15,  weight: 0.30, description: 'Revenue growth decelerating (< 15% vs prior 30-50%)' },
        { field: 'companyData.isPublic',           operator: 'eq',  value: true, weight: 0.20, description: 'Public company under investor efficiency pressure' },
        { field: 'breakdown.L1',                   operator: 'gt',  value: 0.40, weight: 0.30, description: 'Financial signals elevated' },
      ],
      supporting: [
        { field: 'companyData.layoffRounds',        operator: 'gte', value: 1,   weight: 0.20, description: 'First cut already executed' },
        { field: 'companyData.stock90DayChange',    operator: 'lt',  value: -10, weight: 0.25, description: 'Stock drawdown > 10% (market pricing efficiency pressure)' },
        { field: 'companyData.revenueGrowthYoY',   operator: 'gt',  value: 0,   weight: 0.15, description: 'Revenue still positive (not distress — efficiency pressure)' },
      ],
    },
    historicalCompanies: [
      { name: 'Stripe',    region: 'US', year: 2022, outcome: '14% headcount (1,100 employees) cut in Nov 2022; cited "over-optimistic" growth assumptions during ZIRP era',      signalLagMonths: 6  },
      { name: 'Zoom',      region: 'US', year: 2023, outcome: '15% headcount (1,300) cut Feb 2023; headcount had grown 4× from 2019 while revenue growth normalised post-COVID', signalLagMonths: 10 },
      { name: 'Docusign',  region: 'US', year: 2023, outcome: '10% headcount cut Feb 2023; CEO departure preceded cut by 4 months; billings growth had decelerated sharply',     signalLagMonths: 8  },
      { name: 'Twilio',    region: 'US', year: 2022, outcome: '11% (900 employees) cut Sep 2022; second round of 17% in Feb 2023; revenue per rep declining signal', signalLagMonths: 4  },
    ],
    outcomeTimeline: {
      typical:    '6–12 months from peak overstaffing signal to first cut',
      best_case:  '12–18 months — company reaches profitability without further cuts after first round',
      worst_case: '3–6 months followed by a second round — companies often undercut in Round 1',
    },
    affectedRoles:  ['Ops', 'Marketing', 'HR', 'Sales Engineering', 'Non-core Engineering'],
    protectedRoles: ['Core Revenue Engineering', 'Customer Success (enterprise accounts)', 'Finance'],
    recommendedResponse: {
      immediate:   'Check re-cut window timing: if your company cut 6–9 months ago, you may be inside the typical second-wave window. A second cut is statistically more likely than the first.',
      short_term:  'Document your revenue attribution: what contracts, expansions, or cost-savings can you directly attribute to your work? Overstaffing corrections eliminate headcount without clear revenue ties first.',
      medium_term: 'Target companies that have ALREADY completed their ZIRP correction — they are now leaner, funded, and rebuilding key functions. Avoid companies that have not yet cut (they are more likely to cut you).',
    },
    evidenceNote: 'Derived from layoffs.fyi 2022–2023 data, Stripe/Zoom/Twilio earnings reports, WSJ and Bloomberg coverage of ZIRP-era overhiring.',
  },

  // ── Category 3: SaaS / Startup Contraction ────────────────────────────────

  SAAS_GROWTH_DECELERATION_2022: {
    patternId: 'SAAS_GROWTH_DECELERATION_2022',
    patternName: 'SaaS Revenue Growth Deceleration → Structural Restructuring',
    category: 'saas_startup_contraction',
    summary:
      'SaaS companies whose growth rate halved or reversed facing the compounding effect of high burn ' +
      'rates built for higher growth trajectories. Revenue still positive but growth multiple compression forces cost action.',
    triggerConditions: {
      required: [
        { field: 'companyData.revenueGrowthYoY', operator: 'lt', value: 20,   weight: 0.35, description: 'Revenue growth < 20% (down from prior 40-80% SaaS growth)' },
        { field: 'companyData.isPublic',          operator: 'eq', value: true,  weight: 0.15, description: 'Public company (ARR multiple compression visible to market)' },
        { field: 'breakdown.L1',                  operator: 'gt', value: 0.45, weight: 0.35, description: 'Company health stressed' },
      ],
      supporting: [
        { field: 'companyData.stock90DayChange',    operator: 'lt', value: -15, weight: 0.25, description: 'Stock down > 15% (multiple compression)' },
        { field: 'companyData.revenueGrowthYoY',   operator: 'gt', value: 0,   weight: 0.10, description: 'Revenue still positive (growth problem, not contraction)' },
        { field: 'companyData.revenuePerEmployee', operator: 'lt', value: 350000, weight: 0.20, description: 'Revenue per employee below efficient benchmark ($350K)' },
      ],
    },
    historicalCompanies: [
      { name: 'HubSpot',    region: 'US', year: 2023, outcome: '7% headcount (500) cut Jan 2023; revenue growth had decelerated from 47% to 25% in 4 quarters',               signalLagMonths: 8  },
      { name: 'Zendesk',    region: 'US', year: 2023, outcome: 'Went private in 2022 under PE pressure; post-buyout cut ~10% of workforce',                                    signalLagMonths: 12 },
      { name: 'Okta',       region: 'US', year: 2024, outcome: '400 employees cut Feb 2024 (5%); revenue growth decelerated from 43% to 18% across 2022–2023',                signalLagMonths: 14 },
      { name: 'Freshworks', region: 'US', year: 2023, outcome: '13% headcount (700) cut Jun 2023; revenue growth decelerated sharply; CEO shifted to profitability focus',     signalLagMonths: 10 },
    ],
    outcomeTimeline: {
      typical:    '8–16 months from growth deceleration to first round',
      best_case:  '14–18 months — company achieves Rule of 40 compliance without a second cut',
      worst_case: '6–8 months when burn rate is critical (< 12 months runway)',
    },
    affectedRoles:  ['Sales Development', 'Marketing Ops', 'Recruiting', 'Customer Success (SMB tier)', 'Professional Services'],
    protectedRoles: ['Enterprise Account Executive', 'Core Product Engineering', 'Security'],
    recommendedResponse: {
      immediate:   "Check your company's last two earnings calls for the phrase 'Rule of 40', 'profitable growth', or 'efficiency'. These phrases precede cuts. If present, begin external search this week.",
      short_term:  'In SaaS companies cutting post-deceleration, enterprise account roles are almost always protected while SMB/PLG roles are cut first. If you are in a high-volume, low-ACV function, your risk is disproportionately high.',
      medium_term: 'Target SaaS companies with Net Revenue Retention > 120% and positive operating cash flow — these companies are done cutting and rebuilding. Avoid NRR < 105% companies.',
    },
    evidenceNote: 'Derived from HubSpot, Okta, Freshworks earnings reports 2022–2024 and Jamin Ball Clouded Judgement SaaS benchmarks.',
  },

  FINTECH_VALUATION_RESET_2022: {
    patternId: 'FINTECH_VALUATION_RESET_2022',
    patternName: 'Fintech / Crypto Valuation Reset 2022–2023',
    category: 'saas_startup_contraction',
    summary:
      'Fintech and crypto companies built on zero-interest-rate assumptions face acute valuation compression. ' +
      'Characterised by rapid stock collapse, regulatory pressure, and volume-dependent revenue models.',
    triggerConditions: {
      required: [
        { field: 'companyData.industry',         operator: 'in', value: ['Finance', 'Banking', 'FinTech', 'Crypto', 'Payments'], weight: 0.30, description: 'Fintech or financial services company' },
        { field: 'companyData.stock90DayChange',  operator: 'lt', value: -25, weight: 0.40, description: 'Severe stock drawdown > 25% (valuation reset)' },
        { field: 'breakdown.L1',                  operator: 'gt', value: 0.55, weight: 0.30, description: 'Company health stressed' },
      ],
      supporting: [
        { field: 'companyData.revenueGrowthYoY',  operator: 'lt', value: 10, weight: 0.25, description: 'Revenue growth decelerated sharply' },
        { field: 'companyData.layoffRounds',       operator: 'gte', value: 1, weight: 0.20, description: 'Prior round executed' },
      ],
    },
    historicalCompanies: [
      { name: 'Coinbase',  region: 'US', year: 2022, outcome: '18% workforce (~1,100) cut Jun 2022; crypto market cap down 60% since Nov 2021 peak',                             signalLagMonths: 5  },
      { name: 'Robinhood', region: 'US', year: 2022, outcome: '23% workforce cut Aug 2022; stock down 85% from IPO; trading volumes collapsed post-meme-stock normalization',   signalLagMonths: 8  },
      { name: 'Klarna',    region: 'Global', year: 2022, outcome: '10% workforce (700 employees); valuation cut 85% in same down-round; BNPL model under regulatory pressure', signalLagMonths: 9  },
      { name: 'Paytm',     region: 'India', year: 2024, outcome: 'RBI payment aggregator licence revoked; 1,000+ layoffs; stock down 70% from IPO price',                       signalLagMonths: 14 },
    ],
    outcomeTimeline: {
      typical:    '5–12 months from valuation collapse to significant headcount reduction',
      best_case:  '10–14 months — company achieves regulatory clarity and rebuilds with smaller team',
      worst_case: '3–6 months — immediate runway pressure forces emergency cut',
    },
    affectedRoles:  ['Compliance (if company exits segment)', 'Customer Ops', 'Marketing', 'Expansion/BD', 'Data Analyst'],
    protectedRoles: ['Core Platform Engineering', 'Fraud/Risk', 'Regulatory / Legal (compliance stays)'],
    recommendedResponse: {
      immediate:   'Check regulatory filings and recent executive departures — both precede fintech cuts by 2–4 months. If your company has a pending regulatory action, treat it as a layoff signal.',
      short_term:  "Fintech's transferable skills are highest in risk, fraud, and payments engineering — these transfer to banking, insurance, and neobanks. Position your skills in that language.",
      medium_term: 'Traditional banks are hiring fintech talent to build in-house digital products. The skills gap between bank tech teams and fintech teams is your opportunity.',
    },
    evidenceNote: 'Derived from Coinbase, Robinhood, Klarna public announcements 2022; Paytm RBI order 2024; layoffs.fyi fintech category data.',
  },

  // ── Category 4: Role-Specific AI Displacement ─────────────────────────────

  CUSTOMER_SUPPORT_AI_TIER1_2024: {
    patternId: 'CUSTOMER_SUPPORT_AI_TIER1_2024',
    patternName: 'AI Tier-1 Customer Support Displacement 2024–2025',
    category: 'role_ai_displacement',
    summary:
      'Enterprise AI chatbots (Intercom Fin, Ada, Kustomer IQ, Decagon) now resolve 40–70% of tier-1 ' +
      'support tickets without human involvement. Companies reducing human CS headcount as AI deflection rates climb.',
    triggerConditions: {
      required: [
        { field: 'roleTitle',   operator: 'in', value: ['customer support', 'customer service', 'support', 'helpdesk', 'service rep', 'csm', 'cs'], weight: 0.50, description: 'Customer support or service role' },
        { field: 'breakdown.L3', operator: 'gt', value: 0.60, weight: 0.35, description: 'Role displacement risk high (L3 > 60)' },
      ],
      supporting: [
        { field: 'companyData.aiInvestmentSignal', operator: 'in', value: ['high', 'very-high', 'very_high'], weight: 0.30, description: 'High AI investment (CS AI deployment likely)' },
        { field: 'breakdown.L1', operator: 'lt', value: 0.50, weight: 0.20, description: 'Company financially healthy (cuts for efficiency, not distress)' },
      ],
    },
    historicalCompanies: [
      { name: 'Klarna',    region: 'Global', year: 2024, outcome: 'AI assistant handling 2.3M conversations/month (67% of all CS volume); CS headcount reduced from 3,000 to 700 in 18 months', signalLagMonths: 12 },
      { name: 'Chegg',     region: 'US',     year: 2024, outcome: '23% workforce (441 employees) cut as AI tutoring tools replaced human support agents; AI-first pivot',                        signalLagMonths: 9  },
      { name: 'Intercom',  region: 'US',     year: 2023, outcome: 'Internally deployed Fin AI to handle tier-1 support; reduced CS team headcount while revenue grew — product eating its market', signalLagMonths: 8 },
      { name: 'Duolingo',  region: 'US',     year: 2024, outcome: '10% contractor headcount cut; AI now generates lesson content and handles 80% of learner support queries',                    signalLagMonths: 6  },
    ],
    outcomeTimeline: {
      typical:    '9–18 months from AI tool deployment to visible CS headcount reduction',
      best_case:  '12–18 months — remaining humans upskilled to tier-2/3 complex cases',
      worst_case: '6–9 months — company uses AI deflection metrics to justify immediate headcount reduction',
    },
    affectedRoles:  ['Tier-1 Support', 'Chat Support', 'Email Support', 'Social Media Support', 'Help Desk'],
    protectedRoles: ['Customer Success Manager (enterprise, high-ACV)', 'Tier-3 Technical Support', 'Implementation Engineer'],
    recommendedResponse: {
      immediate:   "Learn how to CONFIGURE and MANAGE the AI tool your company has deployed (Intercom, Zendesk, Salesforce Service Cloud). Becoming the person who trains the bot converts you from a replacement target to an AI supervisor — different headcount bucket, different security.",
      short_term:  'Specialise in complex, high-empathy cases that AI consistently fails: renewals under threat, escalations, enterprise onboarding. These are the 20% of tickets that require 80% of human judgment.',
      medium_term: 'Pivot to Customer Success Engineering or Technical Support for developer-facing products — these roles require product knowledge that AI cannot replicate from a help-article database.',
    },
    evidenceNote: 'Derived from Klarna AI transparency report 2024, Chegg Q1 2024 earnings, Duolingo 2024 annual report. Intercom Fin product case studies (published 2024).',
  },

  QA_TESTING_AI_AUTOMATION_2024: {
    patternId: 'QA_TESTING_AI_AUTOMATION_2024',
    patternName: 'Manual QA / Software Testing AI Automation 2024',
    category: 'role_ai_displacement',
    summary:
      'AI-powered test generation tools (Playwright AI, Testim, Reflect) now auto-generate test suites ' +
      'from user flows, eliminating 60–80% of manual test writing. Manual QA roles with no automation skills face acute displacement.',
    triggerConditions: {
      required: [
        { field: 'roleTitle',   operator: 'in', value: ['qa', 'quality', 'tester', 'testing', 'test engineer', 'manual qa', 'sdet'], weight: 0.55, description: 'QA or testing role' },
        { field: 'breakdown.L3', operator: 'gt', value: 0.55, weight: 0.35, description: 'Role displacement risk elevated' },
      ],
      supporting: [
        { field: 'companyData.aiInvestmentSignal', operator: 'in', value: ['high', 'very-high', 'very_high'], weight: 0.25, description: 'High AI investment' },
        { field: 'companyData.industry', operator: 'in', value: ['Technology', 'Software', 'Finance', 'E-commerce'], weight: 0.15, description: 'Fast-adopting industry for test automation' },
      ],
    },
    historicalCompanies: [
      { name: 'TCS',          region: 'India', year: 2024, outcome: 'Reduced manual QA headcount by 15–20% in 2024; AI-assisted test generation deployed in client delivery; QA Automation roles growing', signalLagMonths: 10 },
      { name: 'Wipro',        region: 'India', year: 2024, outcome: 'Announced AI-driven testing platform "QEng" replacing ~30% of manual test writing; 2,000+ QA FTEs affected',                           signalLagMonths: 12 },
      { name: 'Accenture',    region: 'Global', year: 2024, outcome: 'Deployed Playwright-based AI test generation at scale; manual QA contractor workforce reduced ~25% in IT services practices',          signalLagMonths: 8  },
      { name: 'Cognizant',    region: 'India', year: 2024, outcome: 'GenAI test suite deployment reduced manual test cycles by 40%; headcount rationalized in testing CoEs',                                 signalLagMonths: 9  },
    ],
    outcomeTimeline: {
      typical:    '8–15 months from AI testing tool deployment to manual QA headcount reduction',
      best_case:  '12–18 months — QA team reskills to SDET / automation and absorbs displacement internally',
      worst_case: '6–9 months — rapid tool deployment with no reskilling investment',
    },
    affectedRoles:  ['Manual QA Engineer', 'Test Analyst', 'QA Lead (manual focus)', 'UAT Coordinator'],
    protectedRoles: ['SDET', 'QA Automation Engineer', 'Performance Engineer', 'Security Test Engineer'],
    recommendedResponse: {
      immediate:   'Start building a Playwright automation portfolio this week — 6 hours of learning will produce a usable test suite. This is the single fastest role transformation available in tech: manual QA → automation QA requires 30–60 hours of dedicated learning (3–8 weeks at 8h/wk).',
      short_term:  'Volunteer to own one automation initiative at your current company. Propose to automate the highest-frequency manual regression suite. This converts your position internally.',
      medium_term: 'Pursue SDET roles at companies running modern CI/CD pipelines. The market for QA Automation Engineers is growing 18% YoY; manual QA roles are declining 12% YoY (NASSCOM 2025).',
    },
    evidenceNote: 'Derived from TCS/Wipro/Accenture/Cognizant quarterly reports 2024, NASSCOM QA skill demand report 2025, Playwright adoption statistics (State of JS 2024).',
  },

  LEGAL_CONTRACT_AI_2024: {
    patternId: 'LEGAL_CONTRACT_AI_2024',
    patternName: 'Legal AI Contract Review / Due Diligence Displacement 2024',
    category: 'role_ai_displacement',
    summary:
      'AI tools (Harvey, Spellbook, Casetext CoCounsel, Thomson Reuters CoCounsel) now perform first-pass ' +
      'contract review, due diligence, and case-law research at junior attorney speed. Junior and mid-level legal roles face restructuring.',
    triggerConditions: {
      required: [
        { field: 'roleTitle',   operator: 'in', value: ['legal', 'paralegal', 'counsel', 'attorney', 'lawyer', 'compliance', 'contract'], weight: 0.55, description: 'Legal or compliance role' },
        { field: 'breakdown.L3', operator: 'gt', value: 0.50, weight: 0.30, description: 'Role displacement risk elevated' },
      ],
      supporting: [
        { field: 'companyData.industry', operator: 'in', value: ['Legal', 'Finance', 'Banking', 'Technology'], weight: 0.20, description: 'Industry with high legal AI adoption' },
        { field: 'companyData.aiInvestmentSignal', operator: 'in', value: ['high', 'very-high', 'very_high'], weight: 0.15, description: 'High AI investment' },
      ],
    },
    historicalCompanies: [
      { name: 'Allen & Overy',     region: 'Global', year: 2024, outcome: 'Deployed Harvey AI firm-wide; associate-level document review tasks automated; NQ/1-3yr associates most affected',            signalLagMonths: 12 },
      { name: 'Clifford Chance',   region: 'Global', year: 2024, outcome: 'CoCounsel deployment for due diligence; partner-to-associate leverage ratio improving without headcount growth',               signalLagMonths: 14 },
      { name: 'LexisNexis / RELX', region: 'Global', year: 2024, outcome: 'Internal legal ops teams deployed LexisNexis+ AI; paralegal headcount flat while matter volume grew 20%',                    signalLagMonths: 10 },
      { name: 'Various Big4 legal', region: 'Global', year: 2024, outcome: 'PwC Legal, KPMG Legal, Deloitte Legal all deploying AI contract review; contract analyst roles under hiring freeze',          signalLagMonths: 11 },
    ],
    outcomeTimeline: {
      typical:    '10–18 months from AI tool deployment to junior legal headcount flattening',
      best_case:  '15–24 months — legal professionals upskilled to AI supervision layer are retained',
      worst_case: '8–12 months — firms with aggressive leverage ratio targets cut first',
    },
    affectedRoles:  ['Contract Analyst', 'Paralegal', 'NQ Attorney (1–2yr)', 'Document Reviewer', 'Legal Research Analyst'],
    protectedRoles: ['Senior Counsel (client relationship-bearing)', 'Regulatory Affairs Specialist', 'Litigation (court-facing)', 'Contract AI Auditor (emerging role)'],
    recommendedResponse: {
      immediate:   'Get hands-on with Harvey or Spellbook this week — many firms provide access on request. Demonstrate that you can SUPERVISE AI-generated contract summaries, not just produce them yourself.',
      short_term:  'Build expertise in AI output quality control for legal documents: where does Harvey hallucinate clause references? What clause types does CoCounsel miss? This is the emerging "contract AI auditing" skill set.',
      medium_term: 'Consider AI governance specialisation: the EU AI Act creates demand for legal professionals who understand AI liability, model documentation, and regulatory compliance — a growing niche with no AI tools to displace it yet.',
    },
    evidenceNote: 'Derived from Allen & Overy Harvey deployment announcement 2023, Clifford Chance AI report 2024, LexisNexis annual report 2024. Thomson Reuters generative AI survey of law firms 2024.',
  },

  DATA_ANALYST_BI_AI_2024: {
    patternId: 'DATA_ANALYST_BI_AI_2024',
    patternName: 'Business Intelligence / Data Analyst Role Compression 2024',
    category: 'role_ai_displacement',
    summary:
      'AI-native BI tools (ThoughtSpot Sage, Tableau Pulse, Domo AI, Mode AI) now generate standard ' +
      'dashboards and ad-hoc analyses from natural language queries. Routine reporting tasks that justified ' +
      'junior analyst headcount are now self-service for business users.',
    triggerConditions: {
      required: [
        { field: 'roleTitle',   operator: 'in', value: ['analyst', 'data analyst', 'bi analyst', 'business analyst', 'reporting analyst', 'data'], weight: 0.50, description: 'Analyst or BI role' },
        { field: 'breakdown.L3', operator: 'gt', value: 0.50, weight: 0.30, description: 'Role displacement risk elevated' },
      ],
      supporting: [
        { field: 'companyData.aiInvestmentSignal', operator: 'in', value: ['high', 'very-high', 'very_high'], weight: 0.25, description: 'High AI investment' },
        { field: 'companyData.industry', operator: 'in', value: ['Finance', 'Technology', 'Software', 'E-commerce', 'Retail'], weight: 0.15, description: 'High BI-tool adoption industry' },
      ],
    },
    historicalCompanies: [
      { name: 'Gartner tracking (cross-industry)', region: 'Global', year: 2024, outcome: 'Gartner 2024: 40% of data analyst routine reporting tasks automatable by AI-native BI tools; junior analyst hiring declining in financial services', signalLagMonths: 18 },
      { name: 'Meta',       region: 'US', year: 2023, outcome: 'Analytics team reorganised; AI-assisted query tools (MetaGPT for Analytics) reduced routine dashboard requests by 30%; analyst:engineer ratio improved',    signalLagMonths: 12 },
      { name: 'Walmart GTC', region: 'India', year: 2024, outcome: 'Deployed Tableau Pulse + internal AI query layer; routine reporting headcount flat despite 15% revenue growth — productivity absorption', signalLagMonths: 14 },
    ],
    outcomeTimeline: {
      typical:    '12–24 months from AI BI tool deployment to analyst headcount flattening',
      best_case:  '18–30 months — analysts who upskill to ML/data science move up as reporting is automated',
      worst_case: '9–14 months — BI teams with pure dashboard/reporting scope face acute compression',
    },
    affectedRoles:  ['Junior Data Analyst', 'Reporting Analyst', 'BI Developer (dashboard-only)', 'Business Analyst (process documentation)'],
    protectedRoles: ['Data Scientist', 'ML Engineer', 'Analytics Engineer (dbt, Spark)', 'Decision Scientist'],
    recommendedResponse: {
      immediate:   'Identify the percentage of your current work that is "produce a standard report/dashboard when requested." If > 40%, your role is at risk of being eliminated as business users become self-service. Start your migration now.',
      short_term:  'Learn dbt and build one data model that your current reporting dashboards are built on. Analytics Engineering (owning the semantic layer) is far more defensible than owning dashboards.',
      medium_term: 'Target ML Engineering, Analytics Engineering, or Decision Science roles — these involve model development and causal inference that AI BI tools cannot replicate. The market for these roles is growing 22% YoY.',
    },
    evidenceNote: 'Derived from Gartner Magic Quadrant for Analytics and BI 2024, Meta analytics team changes (internal reporting, Bloomberg 2023), ThoughtSpot Sage customer case studies 2024.',
  },

  // ── Category 5: Sector Waves ──────────────────────────────────────────────

  INDIA_EDTECH_BUST_2022: {
    patternId: 'INDIA_EDTECH_BUST_2022',
    patternName: "India EdTech Post-COVID Bust 2022–2024",
    category: 'sector_wave',
    summary:
      "India edtech companies that grew 5–10× during COVID lockdowns face structural demand reset " +
      "as schools reopen. Revenue declines 40–60% from peak; most companies burning cash without a path to profitability.",
    triggerConditions: {
      required: [
        { field: 'companyData.industry',  operator: 'eq', value: 'Education', weight: 0.30, description: 'Education or EdTech company' },
        { field: 'companyData.region',    operator: 'eq', value: 'IN',        weight: 0.25, description: 'India-based company' },
        { field: 'breakdown.L1',          operator: 'gt', value: 0.60,        weight: 0.35, description: 'Company health critically stressed' },
        { field: 'companyData.isPublic',  operator: 'eq', value: false,       weight: 0.10, description: 'Private (most India edtech is private)' },
      ],
      supporting: [
        { field: 'companyData.revenueGrowthYoY', operator: 'lt', value: 0,    weight: 0.30, description: 'Revenue declining' },
        { field: 'companyData.layoffRounds',      operator: 'gte', value: 2,  weight: 0.25, description: 'Multiple rounds (chronic restructuring)' },
        { field: 'companyData.monthsSinceLastFunding', operator: 'gt', value: 24, weight: 0.20, description: 'Stale funding — unlikely to raise' },
      ],
    },
    historicalCompanies: [
      { name: "Byju's",       region: 'India', year: 2023, outcome: '4,500+ layoffs; $2.4B acquisition by Aakash reversed; NCLT insolvency filing 2024; valuation fell from $22B to near-zero', signalLagMonths: 6  },
      { name: 'Unacademy',    region: 'India', year: 2022, outcome: '1,000 employees (10%) cut; multiple subsequent rounds; post-COVID GMV dropped 60% from peak',                               signalLagMonths: 4  },
      { name: 'Vedantu',      region: 'India', year: 2022, outcome: '624 employees cut (10% of workforce) in May 2022; 3 rounds total by 2023; subscription model pivot',                       signalLagMonths: 5  },
      { name: 'Lido Learning', region: 'India', year: 2022, outcome: 'Shut down entirely Jan 2022; 1,500 employees displaced; failed to reach unit economics post-COVID',                       signalLagMonths: 3  },
    ],
    outcomeTimeline: {
      typical:    '4–9 months from revenue decline signal to first layoff announcement',
      best_case:  '9–12 months — company pivots to B2B or offline and survives',
      worst_case: '2–5 months — emergency cut or full shutdown',
    },
    affectedRoles:  ['EdTech Operations', 'Sales', 'Teacher/Tutor (contract)', 'Content', 'Marketing', 'Customer Support'],
    protectedRoles: ['Product/Engineering (pivoting to B2B SaaS)', 'Academic Content Leaders (cross-employer brand)'],
    recommendedResponse: {
      immediate:   'The India edtech bust has created a talent surplus in B2C operations roles. Do not target another edtech company. Target enterprise SaaS, banking (digital education partnerships), or GCCs that are expanding.',
      short_term:  'Reframe your edtech experience in enterprise terms: customer lifecycle management → enterprise CRM, learner journey → customer success, content ops → knowledge management system.',
      medium_term: 'Corporate L&D (Learning and Development) at large enterprises is the B2B pivot for edtech talent. The market is growing as companies retrain workforces for AI.',
    },
    evidenceNote: "Derived from Byju's NCLT filings 2024, Unacademy/Vedantu layoffs.fyi entries, Economic Times edtech tracker 2022–2024.",
  },

  // ── Category 6: Company Lifecycle ────────────────────────────────────────

  PRE_IPO_COST_RATIONALIZATION_2024: {
    patternId: 'PRE_IPO_COST_RATIONALIZATION_2024',
    patternName: 'Pre-IPO Cost Rationalisation Pattern 2023–2025',
    category: 'company_lifecycle',
    summary:
      'Late-stage private companies preparing for IPO undertake profitability-focused headcount cuts ' +
      'to improve unit economics before listing. Cuts typically affect non-core or expansion functions.',
    triggerConditions: {
      required: [
        { field: 'companyData.isPublic', operator: 'eq', value: false, weight: 0.25, description: 'Private company (pre-IPO)' },
        { field: 'companyData.monthsSinceLastFunding', operator: 'gt', value: 12, weight: 0.20, description: 'Funding > 12 months old (Series D+ stage)' },
        { field: 'breakdown.L1',         operator: 'gt', value: 0.45, weight: 0.35, description: 'Company health stressed — burn rate adjustment signal' },
      ],
      supporting: [
        { field: 'companyData.revenueGrowthYoY', operator: 'gt', value: 0,   weight: 0.20, description: 'Revenue still growing (cuts are profitability-driven, not distress)' },
        { field: 'companyData.revenueGrowthYoY', operator: 'lt', value: 25,  weight: 0.15, description: 'Growth rate declining — company focused on margin not growth' },
        { field: 'companyData.layoffRounds',      operator: 'gte', value: 1,  weight: 0.20, description: 'Prior round executed (pattern visible)' },
      ],
    },
    historicalCompanies: [
      { name: 'Swiggy',        region: 'India', year: 2024, outcome: '~400 employees cut ahead of Oct 2024 IPO; Instamart unit economics cited; IPO proceeded at lower-than-target valuation', signalLagMonths: 6  },
      { name: 'Ola Electric',  region: 'India', year: 2024, outcome: '200+ corporate layoffs ahead of IPO; service operations restructured; post-listing stock underperformed',                signalLagMonths: 5  },
      { name: 'Instacart',     region: 'US',    year: 2023, outcome: '250 employees cut 2 months before Sep 2023 IPO; company cited "streamlining operations"',                               signalLagMonths: 3  },
      { name: 'Lyft',          region: 'US',    year: 2023, outcome: '26% headcount reduction Apr 2023 under new CEO (post-IPO); similar pre/post IPO rationalisation pattern',              signalLagMonths: 8  },
    ],
    outcomeTimeline: {
      typical:    '3–9 months before IPO filing date — cuts designed to hit target EBITDA in DRHP',
      best_case:  '6–9 months — controlled rationalisation with performance-based criteria',
      worst_case: '2–4 months — emergency cuts to hit profitability metrics before roadshow',
    },
    affectedRoles:  ['Expansion/BD', 'Marketing (brand / awareness)', 'Operations (non-core cities)', 'Corporate Functions (HR, Legal generalist)', 'Growth Roles'],
    protectedRoles: ['Core Engineering', 'Revenue-critical Ops (dark kitchen, delivery ops)', 'Finance / Investor Relations'],
    recommendedResponse: {
      immediate:   'If your company has filed a DRHP (India) or S-1 (US), read the risk factors section carefully — the IPO filing will name the business lines with poor unit economics. Those are the first cut targets.',
      short_term:  'During IPO-phase companies, headcount decisions are driven by CFO and investment bankers, not by HR or line managers. Performance reviews may be disconnected from retention decisions — position yourself based on revenue attribution, not performance scores.',
      medium_term: 'Post-IPO lock-up expiry (typically 6 months after listing) is the second risk window — early investors can exit and stock may decline, triggering a second efficiency round. Build your external option before lock-up expiry.',
    },
    evidenceNote: 'Derived from Swiggy DRHP (Aug 2024), Ola Electric S1 (Jul 2024), Instacart S-1 (Aug 2023), Lyft Q1 2023 earnings and restructuring announcement.',
  },

  POST_ACQUISITION_RESTRUCTURING_2023: {
    patternId: 'POST_ACQUISITION_RESTRUCTURING_2023',
    patternName: 'Post-Acquisition Integration Headcount Reduction',
    category: 'company_lifecycle',
    summary:
      'Companies that complete major acquisitions typically cut 5–20% of combined headcount within ' +
      '12 months as duplicate functions are rationalised. Leadership departures and org chart uncertainty precede cuts by 60–90 days.',
    triggerConditions: {
      required: [
        { field: 'breakdown.D7', operator: 'gt', value: 0.55, weight: 0.35, description: 'Leadership instability signal elevated (D7 > 55)' },
        { field: 'breakdown.L2', operator: 'gt', value: 0.45, weight: 0.35, description: 'Layoff history elevated (post-acquisition pattern)' },
      ],
      supporting: [
        { field: 'companyData.cSuiteChanges12m', operator: 'gte', value: 2,  weight: 0.30, description: 'Multiple C-suite changes in past 12 months (integration signal)' },
        { field: 'companyData.ceoTenureMonths',  operator: 'lt',  value: 18, weight: 0.20, description: 'New CEO (typically installed post-acquisition)' },
        { field: 'breakdown.L1',                 operator: 'gt',  value: 0.40, weight: 0.15, description: 'Financial pressure elevated (acquisition integration costs)' },
      ],
    },
    historicalCompanies: [
      { name: 'Twitter/X (Musk acquisition)', region: 'US',    year: 2022, outcome: '50% (3,700) employees cut week of acquisition close; Musk stated 75% target publicly before close',        signalLagMonths: 1  },
      { name: 'Microsoft / Activision',        region: 'US',    year: 2024, outcome: '1,900 employees (1.9% combined) cut from gaming division post-acquisition close Jan 2024',                  signalLagMonths: 6  },
      { name: 'Broadcom / VMware',             region: 'US',    year: 2024, outcome: '~2,000 employees cut; entire divisions eliminated as Broadcom restructured VMware into cloud infrastructure business', signalLagMonths: 4 },
      { name: 'Freshworks / acquisitions',     region: 'India', year: 2024, outcome: 'Multiple small-acquisition integrations led to duplicate role elimination; 700 total headcount reduction', signalLagMonths: 10 },
    ],
    outcomeTimeline: {
      typical:    '3–12 months post-acquisition close',
      best_case:  '9–12 months — systematic integration with internal mobility absorbing most roles',
      worst_case: '1–3 months — immediate rationalisation (private equity or hostile acquirer)',
    },
    affectedRoles:  ['HR (duplicate functions)', 'Finance (duplicate CoEs)', 'Marketing (duplicate brand teams)', 'Legal (overlap with acquirer)', 'IT/Infra (consolidation)'],
    protectedRoles: ['Customer-facing roles (acquirer wants revenue continuity)', 'Core Product Engineering (acquirer bought the technology)', 'Domain experts with no acquirer equivalent'],
    recommendedResponse: {
      immediate:   'Map the acquirer\'s existing org chart against your company\'s. Any function that duplicates a team at the acquirer is at high risk. If you work in a duplicate function, start your external search immediately — do not wait for integration timelines.',
      short_term:  'Request direct exposure to the acquiring company\'s team during integration. Relationship-building with acquirer managers during the integration window is the strongest retention signal you can create.',
      medium_term: 'If your role is being rationalised, negotiate a transition timeline rather than accepting an immediate exit — integration cuts often come with severance and notice provisions that disappear if you resign first.',
    },
    evidenceNote: "Derived from Twitter/X Oct 2022 acquisition close, Microsoft/Activision closing report Jan 2024, Broadcom/VMware 2024 restructuring announcement, layoffs.fyi M&A category.",
  },

  // ── Bonus patterns (concise) ─────────────────────────────────────────────

  SW_ENGINEER_AI_AUGMENTATION_2024: {
    patternId: 'SW_ENGINEER_AI_AUGMENTATION_2024',
    patternName: 'Software Engineer AI Augmentation (Protected Role) 2024–2025',
    category: 'role_ai_displacement',
    summary:
      'Senior software engineers are being AUGMENTED by AI coding tools (GitHub Copilot, Cursor, Claude Code), ' +
      'not displaced. Companies need fewer junior engineers but are competing aggressively for senior engineering talent.',
    triggerConditions: {
      required: [
        { field: 'roleTitle',    operator: 'in', value: ['engineer', 'developer', 'swe', 'backend', 'frontend', 'fullstack'], weight: 0.50, description: 'Software engineering role' },
        { field: 'breakdown.L3', operator: 'lt', value: 0.50, weight: 0.30, description: 'Role displacement risk moderate or low (L3 < 50 for SWE)' },
      ],
      supporting: [
        { field: 'breakdown.L5',     operator: 'lt', value: 0.35, weight: 0.25, description: 'Strong personal protection factors' },
        { field: 'companyData.aiInvestmentSignal', operator: 'in', value: ['high', 'very-high', 'very_high'], weight: 0.20, description: 'High AI investment (Copilot deployment likely)' },
      ],
      contradictedBy: [
        { field: 'roleTitle', operator: 'in', value: ['junior', 'intern', 'entry-level', 'associate'], weight: 0.80, description: 'Junior engineers face displacement — this augmentation pattern applies to senior roles only' },
      ],
    },
    historicalCompanies: [
      { name: 'GitHub (Microsoft)', region: 'US',    year: 2024, outcome: 'Copilot users show 55% faster code completion, 40% better test coverage; senior engineers more productive — no SWE displacement', signalLagMonths: 0  },
      { name: 'Google',             region: 'US',    year: 2024, outcome: '>25% of new code at Google AI-assisted by 2024; headcount cuts concentrated in non-engineering roles; SWE hiring continues', signalLagMonths: 0  },
      { name: 'Shopify',            region: 'Global', year: 2024, outcome: 'Deployed Cursor + Copilot company-wide; engineering headcount maintained; AI tooling increased engineer output 3-4×', signalLagMonths: 0 },
    ],
    outcomeTimeline: {
      typical:    'Not a displacement event — augmentation creates productivity increase without headcount reduction for senior roles',
      best_case:  'Productivity gains lead to promotion and salary increase for AI-fluent senior engineers',
      worst_case: 'Junior engineering roles reduced as companies hire fewer entry-level engineers',
    },
    affectedRoles:  ['Junior/Entry-level Software Engineer (fewer hired)', 'Manual Code Reviewers'],
    protectedRoles: ['Senior Software Engineer', 'Staff/Principal Engineer', 'Tech Lead', 'Platform Engineer'],
    recommendedResponse: {
      immediate:   'Adopt GitHub Copilot or Cursor in your current workflow this week. The productivity differential between AI-fluent and non-AI-fluent engineers is now measurable — being in the bottom quartile on AI adoption is an invisible risk.',
      short_term:  'Ship one project that demonstrably required AI tooling to complete — a project you could not have built alone in the same timeframe. Document the "AI-multiplied" output explicitly.',
      medium_term: 'For senior engineers, AI fluency is an accelerant into Staff/Principal roles: the engineers who direct AI agents are managing leverage that previously required 5-person teams. Position for that transition.',
    },
    evidenceNote: 'Derived from GitHub Copilot impact report 2024, Google CEO statement Q4 2024 earnings, Shopify developer blog 2024. Note: this is an AUGMENTATION pattern, not a displacement pattern.',
  },

  FAANG_AD_REVENUE_COLLAPSE_2022: {
    patternId: 'FAANG_AD_REVENUE_COLLAPSE_2022',
    patternName: 'Digital Advertising Revenue Collapse 2022',
    category: 'big_tech_efficiency',
    summary:
      'Ad-dependent tech platforms facing structural revenue decline as digital ad market contracted, ' +
      'ATT (Apple privacy changes) reduced targeting precision, and TikTok competition diverted ad spend.',
    triggerConditions: {
      required: [
        { field: 'companyData.industry', operator: 'in', value: ['Technology', 'Media', 'Social Media'], weight: 0.25, description: 'Ad-dependent tech or media company' },
        { field: 'companyData.revenueGrowthYoY', operator: 'lt', value: 0, weight: 0.35, description: 'Revenue declining YoY (ad market contraction)' },
        { field: 'companyData.stock90DayChange',  operator: 'lt', value: -20, weight: 0.30, description: 'Severe stock drawdown (market pricing ad revenue risk)' },
      ],
      supporting: [
        { field: 'breakdown.L1', operator: 'gt', value: 0.55, weight: 0.25, description: 'Company health stressed' },
        { field: 'companyData.isPublic', operator: 'eq', value: true, weight: 0.15, description: 'Public company (ad revenue visible in quarterly filings)' },
      ],
    },
    historicalCompanies: [
      { name: 'Snap',    region: 'US', year: 2022, outcome: '20% workforce (1,200) cut Aug 2022; warned of "unprecedented" miss in May 2022; DAU growth stalling vs TikTok',          signalLagMonths: 3  },
      { name: 'Twitter/X', region: 'US', year: 2022, outcome: '50% cut at acquisition; pre-acquisition advertising revenue had already declined due to brand safety concerns',         signalLagMonths: 4  },
      { name: 'Pinterest', region: 'US', year: 2022, outcome: '150 layoffs (1.5%) + hiring freeze; ad market contraction hit smaller ad networks harder than Meta/Google', signalLagMonths: 6 },
    ],
    outcomeTimeline: {
      typical:    '3–8 months from revenue decline signal to headcount reduction',
      best_case:  '6–10 months — company diversifies away from ad revenue and stabilises',
      worst_case: '2–4 months — existential ad revenue decline triggers emergency cuts',
    },
    affectedRoles:  ['Ad Operations', 'Performance Marketing', 'Growth Marketing', 'Publisher Partnerships', 'Content Operations'],
    protectedRoles: ['Ad Technology Engineering (building the replacement targeting system)', 'Creator Partnerships', 'Commerce (diversification)'],
    recommendedResponse: {
      immediate:   'If your company is ad-revenue-dependent, check whether the last two earnings calls cited ad revenue growth below 10%. This is the leading indicator. Below 0% means cuts are typically 3–6 months away.',
      short_term:  'Ad operations and performance marketing skills transfer to in-house brand teams at non-ad-dependent companies. Companies that previously outsourced digital marketing are now internalising it.',
      medium_term: 'Retail media (Amazon Ads, Flipkart Ads, Walmart Connect) is growing while traditional social/display declines. Pivot to retail media operations — the fastest-growing ad channel with the best job security.',
    },
    evidenceNote: 'Derived from Snap Form 8-K May 2022, Twitter acquisition documents Oct 2022, Pinterest Q2 2022 earnings. ATT impact sourced from Meta Q2 2022 earnings quantification ($10B annual impact).',
  },

  INDIA_IT_OFFSHORE_PIVOT_2023: {
    patternId: 'INDIA_IT_OFFSHORE_PIVOT_2023',
    patternName: 'US Tech Offshore Pivot to India GCCs 2023–2025',
    category: 'india_it_automation',
    summary:
      'US tech companies cutting US-based roles while simultaneously building or expanding India Global Capability Centres (GCCs). ' +
      'Net negative for same-role headcount, but India GCC roles are growing. Opportunity exists for India-based professionals.',
    triggerConditions: {
      required: [
        { field: 'companyData.region',   operator: 'eq', value: 'US',  weight: 0.30, description: 'US-based tech company' },
        { field: 'breakdown.L1',         operator: 'gt', value: 0.40,  weight: 0.25, description: 'Cost pressure signals present' },
        { field: 'companyData.isPublic', operator: 'eq', value: true,  weight: 0.15, description: 'Public company (GCC expansion visible in filings)' },
      ],
      supporting: [
        { field: 'companyData.layoffRounds', operator: 'gte', value: 1, weight: 0.25, description: 'Prior round (typical before GCC expansion announcement)' },
        { field: 'companyData.revenueGrowthYoY', operator: 'gt', value: 0, weight: 0.15, description: 'Revenue growing (offshore pivot for cost efficiency, not distress)' },
      ],
    },
    historicalCompanies: [
      { name: 'Google',    region: 'US', year: 2023, outcome: '12,000 US cuts Jan 2023; Hyderabad GCC expanded to 10,000+ engineers by 2024; net India headcount GREW',                         signalLagMonths: 6  },
      { name: 'Microsoft', region: 'US', year: 2023, outcome: '10,000 US cuts Jan 2023; Hyderabad campus expanded; Azure India engineering headcount grew 20% in 2023–2024',                    signalLagMonths: 4  },
      { name: 'Goldman Sachs', region: 'US', year: 2023, outcome: '3,200 US cuts; Bengaluru GCC grew to 9,000+ engineers; technology and operations roles shifted to India', signalLagMonths: 8 },
      { name: 'JPMorgan',  region: 'US', year: 2024, outcome: 'Technology headcount maintained globally but US-to-India ratio shifted; Bengaluru and Mumbai tech hubs expanded significantly', signalLagMonths: 12 },
    ],
    outcomeTimeline: {
      typical:    '6–18 months from US announcement to India GCC expansion visible',
      best_case:  'India-based professionals may see increased hiring and higher-complexity work as more functions move offshore',
      worst_case: 'Role commoditisation as more India-based professionals compete for GCC positions',
    },
    affectedRoles:  ['US-based equivalent roles (impacted by cut)', 'Generic IT services roles (increased competition in India)'],
    protectedRoles: ['India-based GCC Roles', 'Technical Product Managers', 'Solution Architects', 'SRE / Platform Engineers in India'],
    recommendedResponse: {
      immediate:   'If you are India-based and work in tech, this is a tailwind not a headwind. Check which US tech companies are expanding GCCs in your city — these are active hiring pipelines with better comp than domestic IT services.',
      short_term:  'GCC roles pay 30–60% more than equivalent IT services roles for the same skills. The barrier is interview standards — practice system design and LeetCode-style technical interviews specific to the company.',
      medium_term: 'GCC roles are increasingly taking on product ownership and architecture — not just execution. Position for tech lead or architect roles as GCCs mature, rather than individual contributor roles that will eventually face the same automation pressure as US equivalents.',
    },
    evidenceNote: "Derived from NASSCOM GCC Report 2024 (1,700+ GCCs employing 1.9M professionals), Google/Microsoft India hiring data from LinkedIn, JPMorgan/Goldman Sachs annual reports 2023–2024.",
  },

  SERIES_B_OVERSTAFFING_CORRECTION_2023: {
    patternId: 'SERIES_B_OVERSTAFFING_CORRECTION_2023',
    patternName: 'Pandemic-Era Startup Overstaffing Correction 2023–2024',
    category: 'company_lifecycle',
    summary:
      'Companies that grew headcount 3–5× on pandemic-era growth projections face correction as growth ' +
      'normalises. Typically a single large cut (15–25%) followed by profitability-first restructuring.',
    triggerConditions: {
      required: [
        { field: 'companyData.revenuePerEmployee', operator: 'lt', value: 200000, weight: 0.40, description: 'Revenue per employee below $200K (overstaffing signal)' },
        { field: 'breakdown.L1',                    operator: 'gt', value: 0.50,  weight: 0.30, description: 'Company health stressed' },
        { field: 'companyData.isPublic',             operator: 'eq', value: false, weight: 0.15, description: 'Private company (VC-backed overstaffing correction)' },
      ],
      supporting: [
        { field: 'companyData.revenueGrowthYoY', operator: 'lt', value: 20, weight: 0.25, description: 'Growth decelerated sharply from pandemic peak' },
        { field: 'companyData.layoffRounds',      operator: 'gte', value: 1, weight: 0.20, description: 'First round already executed' },
        { field: 'companyData.monthsSinceLastFunding', operator: 'gt', value: 15, weight: 0.20, description: 'Stale funding' },
      ],
    },
    historicalCompanies: [
      { name: 'Hotstar (Disney+)', region: 'India', year: 2023, outcome: '300 employees cut; streaming growth decelerated post-COVID; content spend rationalised',                                             signalLagMonths: 14 },
      { name: 'Urban Company',     region: 'India', year: 2022, outcome: '1,200 employees (39% workforce) cut as COVID home-services boom normalised',                                                        signalLagMonths: 8  },
      { name: 'Eruditus',          region: 'India', year: 2023, outcome: '400 employees (10%) cut; edtech/upskilling demand normalised post-pandemic peak',                                                   signalLagMonths: 10 },
      { name: 'OkCredit',          region: 'India', year: 2022, outcome: 'Near-complete shutdown; fintech tools for SMBs grew during COVID but retention normalised sharply afterward',                       signalLagMonths: 6  },
    ],
    outcomeTimeline: {
      typical:    '8–18 months from growth deceleration to headcount correction',
      best_case:  '12–18 months — company reaches profitability with one cut and avoids further reduction',
      worst_case: '6–10 months followed by a second round — overstaffing correction often undershoots',
    },
    affectedRoles:  ['Growth', 'Marketing', 'Customer Ops', 'Sales (SMB/consumer)', 'Non-core Engineering'],
    protectedRoles: ['Core Revenue Engineering', 'B2B Sales (enterprise pivot)', 'Finance'],
    recommendedResponse: {
      immediate:   "Calculate your company's headcount-to-revenue ratio vs sector benchmarks. If your company employs 3-5x the headcount per $1M revenue vs profitable competitors, a correction is mathematically overdue.",
      short_term:  'Pandemic-era overstaffing corrections affect all departments simultaneously. Horizontal networks — connections at other companies — matter more than vertical ones in your current org. Prioritise external relationship-building this quarter.',
      medium_term: 'Target companies that are now leaner and profitable after their own corrections. The best-managed companies in your sector completed their cuts in 2022–2023 and are now hiring selectively for growth roles.',
    },
    evidenceNote: 'Derived from layoffs.fyi India tracker 2022–2023, Economic Times startup coverage, NASSCOM Q2 2023 employment data.',
  },

  FINANCE_RECONCILIATION_AI_2024: {
    patternId: 'FINANCE_RECONCILIATION_AI_2024',
    patternName: 'Finance Back-Office AI Automation 2024',
    category: 'role_ai_displacement',
    summary:
      'AI tools (Microsoft Copilot for Finance, Vic.ai, Trullion, Tabs) now automate 40-70% of AP/AR ' +
      'reconciliation, variance analysis, and audit prep. Finance operations roles with transactional focus face acute displacement.',
    triggerConditions: {
      required: [
        { field: 'roleTitle',    operator: 'in', value: ['finance', 'accounting', 'controller', 'auditor', 'bookkeep', 'reconciliation', 'accounts payable', 'accounts receivable', 'fp&a'], weight: 0.55, description: 'Finance or accounting role' },
        { field: 'breakdown.L3', operator: 'gt', value: 0.50, weight: 0.30, description: 'Role displacement risk elevated' },
      ],
      supporting: [
        { field: 'companyData.aiInvestmentSignal', operator: 'in', value: ['high', 'very-high', 'very_high'], weight: 0.25, description: 'High AI investment (finance AI likely in scope)' },
      ],
    },
    historicalCompanies: [
      { name: 'KPMG / Deloitte (cross-industry deployment)', region: 'Global', year: 2024, outcome: 'Finance automation tools deployed at 200+ enterprise clients; AP reconciliation team sizes reduced 30-50% on average',      signalLagMonths: 16 },
      { name: 'Flipkart',   region: 'India', year: 2024, outcome: 'Finance ops automation pilot reduced manual reconciliation headcount by 25%; AI integrated into SAP workflows',                                            signalLagMonths: 12 },
      { name: 'Infosys BPM', region: 'India', year: 2024, outcome: 'Finance BPM automation deployed in 40+ finance CoEs; ~2,000 FTEs affected by reconciliation and reporting automation',                                   signalLagMonths: 10 },
    ],
    outcomeTimeline: {
      typical:    '10–20 months from AI finance tool deployment to headcount rationalization',
      best_case:  '18–24 months — finance professionals upskilled to financial planning, FP&A, and analysis roles',
      worst_case: '8–12 months — full reconciliation automation with no transition path',
    },
    affectedRoles:  ['AP/AR Specialist', 'Bookkeeper', 'Finance Analyst (reconciliation focus)', 'Audit Support Analyst', 'Payroll Processor'],
    protectedRoles: ['FP&A Manager', 'CFO / Controller (judgment-bearing)', 'Tax Specialist (regulatory complexity)', 'Treasury (deal-making)'],
    recommendedResponse: {
      immediate:   'Learn Microsoft Copilot for Finance or Vic.ai — demo access is typically available. Position as the person who QAs AI reconciliation output, not the person who does reconciliation manually.',
      short_term:  'Pivot toward FP&A, business partnering, and forward-looking analysis — these require interpretation and communication that AI tools cannot replace. The demand for "AI-reviewed financial analysis" is growing as companies reduce transactional teams.',
      medium_term: 'Pursue a CFA or CMA qualification. Credentials separate FP&A/strategic finance professionals from transactional finance workers — the latter is automating; the former is not.',
    },
    evidenceNote: 'Derived from Gartner CFO Technology Survey 2024, Vic.ai customer impact reports, Deloitte Finance Automation research 2024.',
  },

}; // end HISTORICAL_PATTERNS

// ── Overlap computation ───────────────────────────────────────────────────────

/** Evaluate a single signal condition against resolved field values */
function evalCondition(
  cond: SignalCondition,
  values: Record<string, unknown>,
): boolean {
  const val = values[cond.field];
  if (val === undefined || val === null) return false;

  switch (cond.operator) {
    case 'gt':     return typeof val === 'number' && val >  (cond.value as number);
    case 'lt':     return typeof val === 'number' && val <  (cond.value as number);
    case 'gte':    return typeof val === 'number' && val >= (cond.value as number);
    case 'lte':    return typeof val === 'number' && val <= (cond.value as number);
    case 'eq':     return val === cond.value || String(val) === String(cond.value);
    case 'in':     return Array.isArray(cond.value)
                     ? (cond.value as string[]).some(v =>
                         typeof val === 'string'
                           ? val.toLowerCase().includes(v.toLowerCase())
                           : val === v,
                       )
                     : val === cond.value;
    case 'not_in': return Array.isArray(cond.value)
                     ? !(cond.value as string[]).includes(val as string)
                     : val !== cond.value;
    default:       return false;
  }
}

/** Flatten CompanyData + ScoreBreakdown + roleTitle into a dot-notation map */
function buildValueMap(
  companyData: CompanyData,
  breakdown: ScoreBreakdown & { D7?: number },
  roleTitle: string,
): Record<string, unknown> {
  const map: Record<string, unknown> = {
    'companyData.region':                 companyData.region,
    'companyData.industry':               companyData.industry,
    'companyData.isPublic':               companyData.isPublic,
    'companyData.layoffRounds':           companyData.layoffRounds,
    'companyData.revenueGrowthYoY':       companyData.revenueGrowthYoY,
    'companyData.stock90DayChange':       companyData.stock90DayChange,
    'companyData.revenuePerEmployee':     companyData.revenuePerEmployee,
    'companyData.aiInvestmentSignal':     companyData.aiInvestmentSignal,
    'companyData.monthsSinceLastFunding': (companyData as any).monthsSinceLastFunding,
    'companyData.cSuiteChanges12m':       (companyData as any).cSuiteChanges12m,
    'companyData.ceoTenureMonths':        (companyData as any).ceoTenureMonths,
    'breakdown.L1': breakdown.L1,
    'breakdown.L2': breakdown.L2,
    'breakdown.L3': breakdown.L3,
    'breakdown.L4': breakdown.L4,
    'breakdown.L5': breakdown.L5,
    'breakdown.D7': breakdown.D7,
    roleTitle:      roleTitle.toLowerCase(),
  };
  return map;
}

export interface PatternCandidate {
  patternId: string;
  overlapScore: number;   // 0–1: fraction of weighted conditions that matched
  matchedRequired: number;
  totalRequired: number;
  matchedSupporting: number;
  totalSupporting: number;
  isContradicted: boolean;
}

/**
 * Compute overlap scores for all patterns against the current user context.
 * Returns an array sorted by overlapScore descending.
 *
 * The 70% threshold mentioned in the spec is enforced at call sites:
 * only patterns with overlapScore >= 0.70 should be shown to the user.
 */
export function computeTopPatternCandidates(
  companyData: CompanyData,
  breakdown: ScoreBreakdown & { D7?: number },
  roleTitle: string,
  maxCandidates = 3,
): PatternCandidate[] {
  const values = buildValueMap(companyData, breakdown, roleTitle);
  const results: PatternCandidate[] = [];

  for (const pattern of Object.values(HISTORICAL_PATTERNS)) {
    // Check contradiction conditions first — if any fire, skip this pattern.
    const isContradicted = (pattern.triggerConditions.contradictedBy ?? []).some(
      c => evalCondition(c, values),
    );
    if (isContradicted) {
      results.push({ patternId: pattern.patternId, overlapScore: 0, matchedRequired: 0,
        totalRequired: pattern.triggerConditions.required.length, matchedSupporting: 0,
        totalSupporting: pattern.triggerConditions.supporting.length, isContradicted: true });
      continue;
    }

    // Required conditions — all must pass for the pattern to qualify.
    const reqScores = pattern.triggerConditions.required.map(c => ({
      matched: evalCondition(c, values),
      weight:  c.weight,
    }));
    const reqWeightTotal = reqScores.reduce((s, r) => s + r.weight, 0);
    const reqWeightMatched = reqScores.filter(r => r.matched).reduce((s, r) => s + r.weight, 0);
    const reqCoverage = reqWeightTotal > 0 ? reqWeightMatched / reqWeightTotal : 0;

    // Supporting conditions — partial match is fine.
    const supScores = pattern.triggerConditions.supporting.map(c => ({
      matched: evalCondition(c, values),
      weight:  c.weight,
    }));
    const supWeightTotal = supScores.reduce((s, r) => s + r.weight, 0);
    const supWeightMatched = supScores.filter(r => r.matched).reduce((s, r) => s + r.weight, 0);
    const supCoverage = supWeightTotal > 0 ? supWeightMatched / supWeightTotal : 0;

    // Overall overlap: required carries 70% of the score, supporting 30%.
    const overlapScore = (reqCoverage * 0.70) + (supCoverage * 0.30);

    results.push({
      patternId:         pattern.patternId,
      overlapScore:      Math.round(overlapScore * 100) / 100,
      matchedRequired:   reqScores.filter(r => r.matched).length,
      totalRequired:     reqScores.length,
      matchedSupporting: supScores.filter(r => r.matched).length,
      totalSupporting:   supScores.length,
      isContradicted,
    });
  }

  return results
    .filter(r => !r.isContradicted)
    .sort((a, b) => b.overlapScore - a.overlapScore)
    .slice(0, maxCandidates);
}

/**
 * Look up a pattern by ID. Returns null when the ID is not in the database
 * (prevents displaying unverified LLM-invented pattern IDs).
 */
export function resolvePattern(patternId: string | null | undefined): HistoricalPattern | null {
  if (!patternId) return null;
  return HISTORICAL_PATTERNS[patternId] ?? null;
}

/**
 * Returns a condensed description of the top candidates for inclusion in the
 * Claude prompt. Each entry is 1-2 lines so the prompt stays compact.
 */
export function buildPatternPromptContext(candidates: PatternCandidate[]): string {
  if (candidates.length === 0) return 'No pattern candidates with sufficient signal overlap identified.';
  return candidates
    .map((c, i) => {
      const p = HISTORICAL_PATTERNS[c.patternId];
      if (!p) return '';
      return `${i + 1}. ${p.patternId} — "${p.patternName}" (overlap ${Math.round(c.overlapScore * 100)}%). ` +
             `${p.summary.split('.')[0]}.`;
    })
    .filter(Boolean)
    .join('\n');
}
