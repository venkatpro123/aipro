/**
 * jobTargetingEngine.ts — v45.0
 *
 * TRANSFORMATION: The #1 gap in the current system is that action items say
 * "explore the market" instead of "apply to these 5 specific companies this week."
 *
 * This engine answers: "Which SPECIFIC companies are hiring for my profile right
 * now, what is my match strength, and how do I approach them?"
 *
 * ARCHITECTURE:
 *   1. Resolves target companies from 5 signals:
 *      a) Sector affinity (your industry expertise → sectors actively hiring it)
 *      b) Peer peer-company targeting (companies hiring from your current employer)
 *      c) Growth stage targeting (companies at the growth stage that needs your skills)
 *      d) Geographic concentration (companies in your market with open pipelines)
 *      e) Anti-contagion diversification (companies NOT in the same contagion wave)
 *
 *   2. Computes a MATCH SCORE (0–100) per company based on:
 *      - Skill alignment (role overlap with your work type)
 *      - Culture/size fit (your current company size → likely fit)
 *      - Hiring urgency (live hiring signals)
 *      - Compensation alignment (salary band match)
 *
 *   3. Generates a CONTACT STRATEGY for each target:
 *      - LinkedIn approach (direct message template)
 *      - Application channel (referral vs. direct apply vs. recruiter)
 *      - Timing recommendation (apply now vs. wait for X)
 *      - Interview preparation focus (what they care about)
 *
 * DIFFERENTIATOR:
 *   Most tools: "Companies hiring [role] in [city]" — a generic job board.
 *   This engine: "These 5 companies have hired professionals from your EXACT background,
 *   are actively growing in your skill area, are NOT in the same contagion wave, and
 *   have an average 3.8-week time-to-offer for mid-senior candidates. Here's the
 *   exact approach for each."
 */

import type { PeerContagionResult } from './peerContagionEngine';
import type { HiringSignalResult } from './hiringSignalAnalyzer';
import type { CareerResilienceResult } from './careerResilienceEngine';

// ── Types ────────────────────────────────────────────────────────────────────

export type ApplicationChannel = 'employee_referral' | 'direct_apply' | 'recruiter' | 'executive_search' | 'cold_outreach';
export type TimingSignal = 'apply_now' | 'apply_this_week' | 'apply_this_month' | 'wait_for_q';

export interface JobTarget {
  companyName: string;
  displayName: string;
  industry: string;
  companyStage: 'startup' | 'growth' | 'mature' | 'enterprise';
  employeeCount: string;    // "200–500"
  location: string[];
  remotePolicy: 'remote_friendly' | 'hybrid' | 'office_first' | 'full_remote';

  // Match quality
  matchScore: number;       // 0–100
  matchStrength: 'excellent' | 'strong' | 'good' | 'moderate';
  matchReasons: string[];   // top 3 reasons this is a good match
  cautions: string[];       // 1–2 things to verify before applying

  // Role opportunity
  openRoleCategories: string[];   // "Senior Backend Engineer", "Staff SWE"
  estimatedOpenings: number | null;
  hiringUrgency: 'urgent' | 'active' | 'steady' | 'passive';
  salaryRange: string;            // "₹45–65L" or "$180–240K"

  // Approach strategy
  recommendedChannel: ApplicationChannel;
  channelRationale: string;
  timingSignal: TimingSignal;
  timingRationale: string;
  linkedinApproachTemplate: string;
  applicationFocusPoints: string[];  // what to highlight in application

  // Intelligence context
  whyHiring: string;         // WHY this company is hiring in this area
  hiringFromCompanies: string[];  // companies they regularly hire from
  interviewFocusAreas: string[];  // what they test for
  averageTimeToOffer: string;    // "3–5 weeks"
  compensationNotes: string;     // equity, bonus structure insights

  // Targeting source
  targetingRationale: TargetingRationale;
}

export type TargetingRationale =
  | 'sector_affinity'       // your sector expertise is directly applicable
  | 'peer_sourcing'         // they hire from your current company
  | 'growth_stage_fit'      // growing fast in your skill area
  | 'anti_contagion'        // not in the same layoff wave
  | 'geographic_demand'     // high demand in your location
  | 'ai_safe_growth';       // growing because of AI (not being disrupted by it)

export interface JobTargetingInputs {
  rolePrefix: string;        // e.g. 'sw', 'ml', 'fin'
  workTypeKey: string;       // e.g. 'sw_backend', 'ml_engineer'
  industry: string;
  region: string;            // 'india', 'us', 'uk', etc.
  metro: string | null;      // 'bangalore', 'mumbai', 'sf_bay', 'nyc', etc.
  seniorityBracket: string;
  salaryBand: string | null;
  currentCompanyName: string;
  currentCompanySize: 'startup' | 'mid' | 'large' | 'mega';
  peerContagion: PeerContagionResult | null;
  hiringSignals: HiringSignalResult | null;
  careerResilience: CareerResilienceResult | null;
  compositeScore: number;
  visaStatus: string | null;
}

export interface JobTargetingResult {
  targets: JobTarget[];        // top 5–8 specific companies
  totalTargetedCompanies: number;  // total companies matching criteria
  marketSummary: string;       // 2-sentence market assessment
  strategyRecommendation: string;  // what approach to take overall
  searchUrgency: 'start_today' | 'start_this_week' | 'start_this_month' | 'steady_monitoring';
  avoidList: string[];         // companies to avoid (in contagion wave, hiring freeze)
  industryMomentum: 'accelerating' | 'stable' | 'decelerating';
  estimatedSearchDuration: string;  // "4–6 weeks to first offer"
}

// ── Role-to-sector affinity map ──────────────────────────────────────────────
// Which sectors ACTIVELY HIRE each role type and WHY they're hiring.
// Based on LinkedIn Talent Insights, Burning Glass Institute, and Naukri hiring reports.

const ROLE_SECTOR_AFFINITY: Record<string, {
  hotSectors: Array<{
    sector: string;
    demandLevel: 'surge' | 'strong' | 'steady';
    whyHiring: string;
    sampleCompanies: string[];
    salaryPremiumPct: number;
  }>;
}> = {
  sw_backend: {
    hotSectors: [
      { sector: 'FinTech', demandLevel: 'surge', whyHiring: 'Real-time payment rails, fraud detection systems, and API platforms require senior backend talent', sampleCompanies: ['Razorpay', 'PhonePe', 'Stripe', 'Plaid', 'Brex'], salaryPremiumPct: 22 },
      { sector: 'SaaS / B2B Software', demandLevel: 'strong', whyHiring: 'Platform scalability and multi-tenant architecture are perpetual needs as SaaS companies expand', sampleCompanies: ['Freshworks', 'Chargebee', 'Zoho', 'Postman', 'Hasura'], salaryPremiumPct: 18 },
      { sector: 'E-commerce / QuickCommerce', demandLevel: 'strong', whyHiring: 'Inventory, order management, and logistics orchestration require high-throughput backend systems', sampleCompanies: ['Swiggy', 'Zepto', 'Blinkit', 'Meesho', 'Shopify'], salaryPremiumPct: 15 },
      { sector: 'AI / ML Infrastructure', demandLevel: 'surge', whyHiring: 'AI companies need robust data pipelines and serving infrastructure for model deployment at scale', sampleCompanies: ['Sarvam AI', 'Krutrim', 'Cohere', 'Together AI', 'Modal'], salaryPremiumPct: 30 },
    ],
  },
  ml_engineer: {
    hotSectors: [
      { sector: 'AI Infrastructure & Tooling', demandLevel: 'surge', whyHiring: 'Building the infrastructure layer (serving, training pipelines, evaluation) for the AI economy', sampleCompanies: ['Hugging Face', 'Together AI', 'Weights & Biases', 'BentoML', 'Anyscale'], salaryPremiumPct: 35 },
      { sector: 'Enterprise AI / GenAI', demandLevel: 'surge', whyHiring: 'Embedding LLMs into enterprise workflows requires ML engineers who understand both models and production systems', sampleCompanies: ['Microsoft AI', 'Google DeepMind', 'Anthropic', 'OpenAI', 'Cohere'], salaryPremiumPct: 40 },
      { sector: 'HealthTech AI', demandLevel: 'strong', whyHiring: 'Clinical NLP, medical imaging, and drug discovery AI require ML engineers with domain-specific deployment experience', sampleCompanies: ['Niramai', 'Qure.ai', 'Siemens Healthineers AI', 'PathAI', 'Recursion'], salaryPremiumPct: 25 },
      { sector: 'FinTech AI', demandLevel: 'strong', whyHiring: 'Credit scoring, fraud detection, and trading algorithms require ML engineers with real-time inference experience', sampleCompanies: ['CRED', 'Perfios', 'Signzy', 'Quantiphi', 'Facets.ai'], salaryPremiumPct: 28 },
    ],
  },
  fin_analyst: {
    hotSectors: [
      { sector: 'Private Equity / VC', demandLevel: 'strong', whyHiring: 'Fund expansion and portfolio company support require analytical talent comfortable with deal execution', sampleCompanies: ['Kedaara Capital', 'Chrys Capital', 'General Catalyst', 'Lightspeed India', 'Peak XV'], salaryPremiumPct: 45 },
      { sector: 'FinTech', demandLevel: 'surge', whyHiring: 'Financial modelling, unit economics, and regulatory analysis for rapidly scaling digital lending/payment companies', sampleCompanies: ['Zerodha', 'Groww', 'Upstox', 'Jupiter Money', 'Fi Money'], salaryPremiumPct: 20 },
      { sector: 'Investment Banking', demandLevel: 'steady', whyHiring: 'M&A deal flow and capital markets activity continue requiring modelling and pitch deck talent', sampleCompanies: ['Goldman Sachs India', 'Morgan Stanley', 'Kotak Investment Banking', 'Avendus', 'JM Financial'], salaryPremiumPct: 35 },
    ],
  },
  data_engineer: {
    hotSectors: [
      { sector: 'Data / Analytics SaaS', demandLevel: 'surge', whyHiring: 'Modern data stack (dbt, Airbyte, Dagster) companies need engineers who can build and demonstrate their own product use cases', sampleCompanies: ['dbt Labs', 'Astronomer', 'Atlan', 'Metaplane', 'Selectstar'], salaryPremiumPct: 25 },
      { sector: 'E-commerce & Marketplaces', demandLevel: 'strong', whyHiring: 'Real-time inventory, personalization, and demand forecasting pipelines require senior data engineers', sampleCompanies: ['Flipkart', 'Amazon India', 'Nykaa', 'BigBasket', 'Udaan'], salaryPremiumPct: 18 },
      { sector: 'Financial Services', demandLevel: 'strong', whyHiring: 'Regulatory reporting, risk data marts, and real-time fraud pipelines are persistent data engineering needs', sampleCompanies: ['HDFC Bank', 'Paytm', 'BankBazaar', 'Policybazaar', 'Lendingkart'], salaryPremiumPct: 20 },
    ],
  },
  sec_analyst: {
    hotSectors: [
      { sector: 'Cloud Security / MSSP', demandLevel: 'surge', whyHiring: 'Cloud workload security and Zero Trust architecture require security analysts who understand cloud-native environments', sampleCompanies: ['Palo Alto Networks', 'CrowdStrike', 'Secureworks', 'Orca Security', 'Wiz'], salaryPremiumPct: 30 },
      { sector: 'Financial Services Security', demandLevel: 'strong', whyHiring: 'RBI mandates and PCI-DSS compliance drive constant demand for GRC and incident response talent', sampleCompanies: ['ICICI Bank Security', 'SEBI-regulated entities', 'Visa Security', 'Mastercard', 'FIS Global'], salaryPremiumPct: 22 },
      { sector: 'Tech / AI Companies', demandLevel: 'strong', whyHiring: 'AI companies need security engineers to protect model IP, training data, and inference infrastructure', sampleCompanies: ['Anthropic', 'OpenAI', 'Google Security', 'Microsoft Security', 'Meta Security'], salaryPremiumPct: 28 },
    ],
  },
  hr_analyst: {
    hotSectors: [
      { sector: 'HR Tech SaaS', demandLevel: 'strong', whyHiring: 'People analytics products require HR professionals who can translate data into workforce intelligence for customers', sampleCompanies: ['Darwinbox', 'Keka HR', 'HROne', 'Lattice', 'Rippling'], salaryPremiumPct: 20 },
      { sector: 'High-Growth Startups', demandLevel: 'surge', whyHiring: 'Rapid scaling companies need HR business partners who can build culture infrastructure from scratch at Series B/C', sampleCompanies: ['Zomato', 'Ola', 'Urban Company', 'PharmEasy', 'Cred'], salaryPremiumPct: 15 },
    ],
  },

  // ── v49.0 expanded role families ─────────────────────────────────────────
  hc: {
    hotSectors: [
      { sector: 'Health Systems / Hospital Networks', demandLevel: 'strong', whyHiring: 'Post-pandemic care backlog and nurse staffing shortages drive persistent demand for clinically-trained professionals across specialties', sampleCompanies: ['Apollo Hospitals', 'Fortis Healthcare', 'Narayana Health', 'HCA Healthcare', 'Aster DM Healthcare'], salaryPremiumPct: 10 },
      { sector: 'HealthTech / Digital Health', demandLevel: 'surge', whyHiring: 'Telemedicine, remote patient monitoring, and AI diagnostics require clinically-trained professionals who can bridge medicine and technology', sampleCompanies: ['Practo', 'Niramai', 'mFine', 'Teladoc', 'Doceree'], salaryPremiumPct: 22 },
      { sector: 'Pharma / Biotech / CRO', demandLevel: 'steady', whyHiring: 'Clinical trials, pharmacovigilance, and medical affairs functions require trained healthcare professionals with regulatory awareness', sampleCompanies: ['Sun Pharma', "Dr. Reddy's", 'Cipla', 'Pfizer India', 'IQVIA India'], salaryPremiumPct: 15 },
    ],
  },
  legal: {
    hotSectors: [
      { sector: 'Technology / AI / IP Law', demandLevel: 'surge', whyHiring: 'AI regulation, data privacy (DPDP Act, GDPR), and IP protection for software products require specialized legal professionals who understand both law and technology', sampleCompanies: ['Khaitan & Co', 'AZB & Partners', 'Trilegal', 'Cyril Amarchand Mangaldas', 'Nishith Desai Associates'], salaryPremiumPct: 28 },
      { sector: 'FinTech / Financial Services Compliance', demandLevel: 'strong', whyHiring: 'RBI/SEBI regulatory complexity, payment aggregator licensing, and fintech compliance require specialized in-house and firm legal teams', sampleCompanies: ['Razorpay Legal', 'PhonePe', 'HDFC Bank Legal', 'Kotak Mahindra Legal', 'Paytm Compliance'], salaryPremiumPct: 20 },
      { sector: 'Legal Process Outsourcing (LPO)', demandLevel: 'strong', whyHiring: 'Global law firms and multinationals offshore contract review, due diligence, e-discovery, and regulatory research to India at scale', sampleCompanies: ['UnitedLex', 'Integreon', 'QuisLex', 'EXL Legal', 'Epiq Systems India'], salaryPremiumPct: 12 },
    ],
  },
  mkt: {
    hotSectors: [
      { sector: 'D2C / E-commerce Brand Marketing', demandLevel: 'surge', whyHiring: 'Performance marketing, retention marketing, and brand building are top investment areas for D2C brands competing for digital shelf space', sampleCompanies: ['Mamaearth', 'boAt', 'Nykaa', 'Mensa Brands', 'Sugar Cosmetics'], salaryPremiumPct: 18 },
      { sector: 'B2B SaaS Demand Generation', demandLevel: 'strong', whyHiring: 'B2B SaaS companies need demand gen, account-based marketing, and content marketing to build enterprise pipeline at scale', sampleCompanies: ['Freshworks', 'Zoho', 'CleverTap', 'WebEngage', 'MoEngage'], salaryPremiumPct: 22 },
      { sector: 'FinTech / Consumer Super-Apps', demandLevel: 'strong', whyHiring: 'Consumer FinTech brands require growth marketing, CRM, and lifecycle campaigns to acquire and retain users at sustainable CAC', sampleCompanies: ['CRED', 'PhonePe', 'Groww', 'Jupiter Money', 'Fi Money'], salaryPremiumPct: 16 },
    ],
  },
  ops: {
    hotSectors: [
      { sector: 'QuickCommerce / E-commerce Operations', demandLevel: 'surge', whyHiring: 'Last-mile delivery, dark store operations, and supply chain optimization require ops professionals who can manage high-velocity, complex fulfillment networks with shrinking margins', sampleCompanies: ['Zepto', 'Blinkit', 'Swiggy Instamart', 'Delhivery', 'Ecom Express'], salaryPremiumPct: 12 },
      { sector: 'EV / Manufacturing Expansion', demandLevel: 'strong', whyHiring: 'PLI scheme beneficiaries and EV manufacturers require supply chain and operations talent as they rapidly scale domestic manufacturing capacity', sampleCompanies: ['Ola Electric', 'Tata Motors EV', 'Mahindra', 'Bosch India', 'Maruti Suzuki'], salaryPremiumPct: 10 },
      { sector: 'GCC Shared Services / Process Excellence', demandLevel: 'strong', whyHiring: 'Global Capability Centres expanding in India need operations managers and process excellence leads to build and run shared services at global standards', sampleCompanies: ['JPMorgan GCC', 'Walmart Global Tech', 'Concentrix', 'EXL Service', 'WNS Global'], salaryPremiumPct: 15 },
    ],
  },
  cons: {
    hotSectors: [
      { sector: 'Technology Consulting / Big 4 Advisory', demandLevel: 'strong', whyHiring: 'Digital transformation, cloud migration, and GenAI implementation mandates from enterprises create sustained demand for consultants who blend strategy and tech', sampleCompanies: ['Deloitte India', 'EY India', 'KPMG India', 'PwC India', 'McKinsey Technology'], salaryPremiumPct: 24 },
      { sector: 'Strategy Boutiques / Independents', demandLevel: 'steady', whyHiring: 'M&A advisory, market entry, and strategic planning mandates from PE-backed mid-market companies pay premium for senior consultants', sampleCompanies: ['Alvarez & Marsal India', 'Kearney India', 'BCG India', 'Roland Berger', 'LEK Consulting India'], salaryPremiumPct: 32 },
      { sector: 'Sector-Specialist Consultancies', demandLevel: 'strong', whyHiring: 'Deep domain expertise (HealthTech, FinTech, climate) commands premium from boutique consultancies serving those sectors', sampleCompanies: ['Praxis Global Alliance', 'Redseer Strategy', 'Valoris Consulting', 'Avanteum Advisors', 'Kearney Operations'], salaryPremiumPct: 18 },
    ],
  },
  design: {
    hotSectors: [
      { sector: 'SaaS / FinTech Product Design', demandLevel: 'strong', whyHiring: 'Product design and user research are board-level investment areas as SaaS companies compete on experience quality and AI-assisted interface design', sampleCompanies: ['Razorpay Design', 'Freshworks UX', 'Figma', 'Framer', 'Lottiefiles'], salaryPremiumPct: 20 },
      { sector: 'E-commerce & Consumer Super-Apps', demandLevel: 'surge', whyHiring: 'High-stakes conversion optimization and mobile-first design require senior UX designers who can connect design decisions to measurable revenue impact', sampleCompanies: ['Meesho Design', 'Swiggy UX', 'CRED Design', 'PhonePe', 'Flipkart'], salaryPremiumPct: 16 },
      { sector: 'Design Tools / Creative Technology', demandLevel: 'strong', whyHiring: 'Design-tools companies need designers who deeply understand the designer persona — domain expertise beats general UX skill here', sampleCompanies: ['Canva India', 'Adobe India', 'InVision', 'Zeplin', 'Pika Labs'], salaryPremiumPct: 24 },
    ],
  },
  ind: {
    hotSectors: [
      { sector: 'Electric Vehicles / Clean Energy', demandLevel: 'surge', whyHiring: 'EV manufacturing scale-up and battery technology development require mechanical engineers, production managers, and skilled trades at levels the market cannot currently supply', sampleCompanies: ['Ola Electric', 'Tata Motors EV', 'Mahindra Electric', 'Ather Energy', 'Hero Electric'], salaryPremiumPct: 15 },
      { sector: 'Defence / Aerospace Indigenization', demandLevel: 'strong', whyHiring: 'Atmanirbhar Bharat defence programs and NewSpace sector privatization create sustained demand for specialized industrial and systems engineering roles', sampleCompanies: ['HAL', 'BEL', 'Tata Advanced Systems', 'Larsen & Toubro Defence', 'Godrej Aerospace'], salaryPremiumPct: 10 },
      { sector: 'PLI Electronics / Pharma Manufacturing', demandLevel: 'strong', whyHiring: 'Production-linked incentive scheme beneficiaries in electronics and pharmaceuticals are expanding capacity, requiring manufacturing operations talent for greenfield facilities', sampleCompanies: ['Dixon Technologies', 'Motherson Sumi', 'Lupin', 'Tata Electronics', 'Foxconn India'], salaryPremiumPct: 8 },
    ],
  },
  bpo: {
    hotSectors: [
      { sector: 'Analytics-Led CX / Next-Gen BPO', demandLevel: 'strong', whyHiring: 'AI-augmented support, CX analytics, and process automation roles are replacing pure-volume BPO work — companies urgently need upskilled talent who can manage AI-assisted workflows', sampleCompanies: ['Concentrix Analytics', 'WNS Advanced Analytics', 'EXL Service', 'Teleperformance Digital', 'iEnergizer'], salaryPremiumPct: 12 },
      { sector: 'Healthcare Revenue Cycle / Claims', demandLevel: 'strong', whyHiring: 'US healthcare claims adjudication, revenue cycle management, and medical billing continue to offshore to India with growing demand for experienced BPO professionals with clinical knowledge', sampleCompanies: ['Omega Healthcare', 'Firstsource Solutions', 'Sutherland Healthcare', 'nThrive', 'GeBBS Healthcare'], salaryPremiumPct: 14 },
      { sector: 'BFSI BPO / RegTech Processing', demandLevel: 'surge', whyHiring: 'Mortgage, insurance, and banking back-office automation has increased the skill bar — roles that survive are analytics-led, requiring data literacy and process improvement skills', sampleCompanies: ['Genpact BFSI', 'Mphasis', 'Hexaware Financial', 'Coforge', 'NIIT Technologies'], salaryPremiumPct: 10 },
    ],
  },
  pm: {
    hotSectors: [
      { sector: 'Consumer Tech / Super-App Product', demandLevel: 'surge', whyHiring: 'Product managers who own high-impact consumer features at scale are consistently the hardest PM archetype to hire — demand is structurally higher than supply', sampleCompanies: ['Meesho', 'CRED', 'Swiggy', 'PhonePe', 'Ola'], salaryPremiumPct: 28 },
      { sector: 'B2B SaaS / Developer Tools', demandLevel: 'strong', whyHiring: 'Enterprise SaaS building AI-native features needs technical PMs who understand both LLM capabilities and enterprise customer pain points', sampleCompanies: ['Freshworks', 'Zoho', 'Chargebee', 'Postman', 'Hasura'], salaryPremiumPct: 22 },
      { sector: 'FinTech / Lending / WealthTech', demandLevel: 'strong', whyHiring: 'Payments, credit, and wealth products require PMs who understand financial regulation, compliance constraints, and high-frequency user psychology simultaneously', sampleCompanies: ['Razorpay Product', 'Zerodha', 'Jupiter Money', 'Groww', 'Paytm'], salaryPremiumPct: 24 },
    ],
  },
  edu: {
    hotSectors: [
      { sector: 'Professional Upskilling / EdTech', demandLevel: 'strong', whyHiring: 'Upskilling platforms and professional certification providers need curriculum designers, instructional technologists, and expert instructors with real-world practitioner backgrounds', sampleCompanies: ['upGrad', 'Great Learning', 'Simplilearn', 'Coursera India', 'Scaler Academy'], salaryPremiumPct: 14 },
      { sector: 'Corporate L&D / GCC Learning', demandLevel: 'steady', whyHiring: 'Large enterprises and GCCs invest heavily in L&D capability-building programs, requiring experienced training and organizational development professionals', sampleCompanies: ['Infosys Learning', 'Wipro Learning', 'Accenture Academy', 'IBM Learning', 'TCS iON'], salaryPremiumPct: 10 },
    ],
  },
  gov: {
    hotSectors: [
      { sector: 'Digital India / GovTech', demandLevel: 'steady', whyHiring: 'India Stack, ONDC, Digital India, and e-governance programs need professionals who bridge government operations and modern technology delivery', sampleCompanies: ['NPCI', 'NSDL', 'iSPIRT', 'EkStep Foundation', 'Samagra Governance'], salaryPremiumPct: 5 },
      { sector: 'Multilateral / Development Finance Institutions', demandLevel: 'steady', whyHiring: 'World Bank, ADB, and UN bodies running India programs require professionals with government-sector expertise and development economics understanding', sampleCompanies: ['World Bank India', 'Asian Development Bank India', 'UNDP India', 'Bill & Melinda Gates Foundation India', 'Aga Khan Foundation'], salaryPremiumPct: 22 },
    ],
  },
  ds: {
    hotSectors: [
      { sector: 'Analytics Consulting / AI Platforms', demandLevel: 'surge', whyHiring: 'The AI economy requires data scientists who can build interpretable, maintainable, production-grade models — not just notebooks. Analytics consulting firms see the highest demand for this profile', sampleCompanies: ['Mu Sigma', 'Tiger Analytics', 'Fractal Analytics', 'Sigmoid', 'LatentView Analytics'], salaryPremiumPct: 22 },
      { sector: 'FinTech / Risk & Credit Analytics', demandLevel: 'strong', whyHiring: 'Credit risk models, alternative data scoring, and fraud detection require data scientists with financial domain expertise and strong statistical fundamentals', sampleCompanies: ['CIBIL', 'Lendingkart', 'Perfios', 'CredAvenue', 'Kissht'], salaryPremiumPct: 20 },
      { sector: 'E-commerce / Personalization Platforms', demandLevel: 'strong', whyHiring: 'Recommendation engines, demand forecasting, and dynamic pricing pipelines require data scientists who own the full model lifecycle from training to production monitoring', sampleCompanies: ['Flipkart AI', 'Amazon India', 'BigBasket', 'Nykaa', 'Myntra'], salaryPremiumPct: 16 },
    ],
  },

  // Default for unmapped role prefixes
  default: {
    hotSectors: [
      { sector: 'High-Growth Tech', demandLevel: 'strong', whyHiring: 'Technology-driven companies expanding into new markets and products require cross-functional talent', sampleCompanies: ['Meesho', 'Razorpay', 'Groww', 'PhonePe', 'Zerodha'], salaryPremiumPct: 15 },
      { sector: 'Global Capability Centres', demandLevel: 'steady', whyHiring: 'GCCs of global companies are expanding India headcount in specialised functions', sampleCompanies: ['JPMorgan GCC', 'Goldman Sachs GCC', 'Wells Fargo GCC', 'Walmart Global Tech', 'Marriott GCC'], salaryPremiumPct: 10 },
    ],
  },
};

// ── Adjacent role map (career transition intelligence) ────────────────────────
// Maps a role family to safer, higher-demand adjacent roles the user can pivot to.
// Used by Action Plan and Job Targeting panels to surface non-obvious opportunities.

export interface AdjacentRoleTarget {
  targetRole: string;
  transitionDifficulty: 'easy' | 'medium' | 'hard';
  timeToTransition: string;         // "2–3 months"
  whyFit: string;                   // Why this user profile maps well
  keySkillsToAdd: string[];         // 2–3 specific skills/certs to add
  aiDisruptionResistance: number;   // 1–10, higher = more AI-resistant
  salaryDeltaPct: number;           // % change vs. current role (can be +/-)
}

export const ADJACENT_ROLE_MAP: Record<string, AdjacentRoleTarget[]> = {
  sw: [
    { targetRole: 'Platform Engineering / DevOps', transitionDifficulty: 'easy', timeToTransition: '1–3 months', whyFit: 'Backend engineers already understand CI/CD pipelines and infrastructure — DevOps roles pay 15–20% more with lower interview bar than senior SWE', keySkillsToAdd: ['Kubernetes + Helm', 'Terraform IaC', 'Observability (Datadog / OpenTelemetry)'], aiDisruptionResistance: 8, salaryDeltaPct: 15 },
    { targetRole: 'ML Infrastructure Engineering', transitionDifficulty: 'medium', timeToTransition: '3–5 months', whyFit: 'Backend engineers with Python proficiency are natural ML infrastructure candidates — model serving, feature stores, and training pipelines are backend problems at their core', keySkillsToAdd: ['PyTorch basics (inference, not training)', 'MLflow / Kubeflow', 'Feature store design'], aiDisruptionResistance: 9, salaryDeltaPct: 28 },
    { targetRole: 'Solutions Architecture', transitionDifficulty: 'medium', timeToTransition: '2–4 months', whyFit: 'Senior engineers with client-facing experience are natural solutions architects — higher comp, reduced code-review overhead, and strong AI disruption resistance', keySkillsToAdd: ['AWS/GCP Professional certification', 'Pre-sales communication', 'Technical storytelling for non-engineers'], aiDisruptionResistance: 8, salaryDeltaPct: 20 },
  ],
  ds: [
    { targetRole: 'ML Engineering', transitionDifficulty: 'medium', timeToTransition: '3–5 months', whyFit: 'Data scientists who add production ML deployment and system design skills transition to higher-paying ML engineering roles where notebook-only skills are insufficient', keySkillsToAdd: ['MLOps tooling (MLflow, Seldon)', 'REST API development', 'System design for ML systems'], aiDisruptionResistance: 9, salaryDeltaPct: 25 },
    { targetRole: 'Product / Growth Analytics Lead', transitionDifficulty: 'easy', timeToTransition: '1–2 months', whyFit: 'Data scientists with business acumen are premium hires in product analytics — the combination of model-building and product intuition is rare and well-compensated', keySkillsToAdd: ['A/B testing design and inference', 'Product sense frameworks', 'Executive-level data storytelling'], aiDisruptionResistance: 7, salaryDeltaPct: 10 },
    { targetRole: 'AI Product Management', transitionDifficulty: 'hard', timeToTransition: '8–14 months', whyFit: 'Data scientists with strong product instinct are among the most sought-after AI PM profiles — you understand what AI can and cannot do, which most PMs do not', keySkillsToAdd: ['Product management certification (PM school or AIPMM)', 'User research methods', 'OKR and roadmap frameworks'], aiDisruptionResistance: 9, salaryDeltaPct: 35 },
  ],
  fin: [
    { targetRole: 'FP&A / Business Finance Partner', transitionDifficulty: 'easy', timeToTransition: '1–2 months', whyFit: 'Financial analysts transition naturally to FP&A where business partnering and strategic storytelling replace pure modelling — senior FPAR roles pay 20–30% more', keySkillsToAdd: ['Executive communication and narrative finance', 'Planning tools (Anaplan / Adaptive Insights)', 'Business driver analysis'], aiDisruptionResistance: 7, salaryDeltaPct: 20 },
    { targetRole: 'FinTech / Startup Finance Lead', transitionDifficulty: 'easy', timeToTransition: '1–3 months', whyFit: 'Financial domain expertise is a premium in FinTech — analysts command 20–30% more than in traditional finance and contribute directly to product and growth decisions', keySkillsToAdd: ['Unit economics frameworks (LTV, CAC, payback)', 'SQL for self-serve analysis', 'FinTech regulatory basics (RBI, SEBI)'], aiDisruptionResistance: 6, salaryDeltaPct: 22 },
    { targetRole: 'Investment Analyst (VC / PE)', transitionDifficulty: 'hard', timeToTransition: '12–24 months', whyFit: 'Top-quartile financial analysts can transition to VC/PE with the right MBA or deal execution experience — comp ceiling is significantly higher', keySkillsToAdd: ['M&A deal execution experience', 'VC deal sourcing and term sheet basics', 'Portfolio company operator mindset'], aiDisruptionResistance: 8, salaryDeltaPct: 50 },
  ],
  hc: [
    { targetRole: 'HealthTech Clinical Operations', transitionDifficulty: 'easy', timeToTransition: '1–3 months', whyFit: 'Clinical professionals are the most valuable hire for HealthTech startups — your credibility with patients and protocols is not replicable by non-clinicians', keySkillsToAdd: ['Telemedicine platform operations', 'Clinical data interpretation for non-clinical stakeholders', 'Regulatory basics (FDA/CE mark/CDSCO)'], aiDisruptionResistance: 9, salaryDeltaPct: 25 },
    { targetRole: 'Pharma Medical Affairs / MSL', transitionDifficulty: 'medium', timeToTransition: '4–8 months', whyFit: 'Clinicians transitioning to pharma MSL or medical affairs roles command significant compensation premiums over clinical roles with far better work-life balance', keySkillsToAdd: ['Pharmacovigilance basics (ICH E6)', 'KOL engagement and scientific exchange', 'Medical communication writing'], aiDisruptionResistance: 8, salaryDeltaPct: 30 },
  ],
  mkt: [
    { targetRole: 'Product Marketing / GTM Lead', transitionDifficulty: 'easy', timeToTransition: '1–2 months', whyFit: 'Brand/growth marketers who develop product positioning and competitive intelligence skills are among the highest-paid in the marketing function', keySkillsToAdd: ['Product positioning frameworks (Crossing the Chasm, Positioning by Al Ries)', 'Competitive intelligence methodology', 'GTM playbook development'], aiDisruptionResistance: 7, salaryDeltaPct: 22 },
    { targetRole: 'Customer Success / Revenue Operations', transitionDifficulty: 'medium', timeToTransition: '3–5 months', whyFit: 'Marketers with analytical skills and strong communication are natural customer success leaders — the role combines marketing instincts with retention ownership', keySkillsToAdd: ['CRM tooling (Salesforce / HubSpot)', 'NPS, retention, and expansion metrics', 'Account health scoring and QBR design'], aiDisruptionResistance: 8, salaryDeltaPct: 15 },
  ],
  pm: [
    { targetRole: 'Technical Product Management', transitionDifficulty: 'easy', timeToTransition: '2–4 months', whyFit: 'PMs with engineering backgrounds command 25–40% salary premiums in API, infrastructure, and developer tool product roles where technical credibility is the entry requirement', keySkillsToAdd: ['API design and OpenAPI specification', 'Technical architecture diagrams (C4, sequence)', 'Developer persona research'], aiDisruptionResistance: 8, salaryDeltaPct: 30 },
    { targetRole: 'AI Product Management', transitionDifficulty: 'medium', timeToTransition: '3–6 months', whyFit: 'AI PM is the fastest-growing PM specialty — PMs who understand LLM evaluation, prompt engineering, and AI product failure modes are in exceptional demand globally', keySkillsToAdd: ['LLM prompting and evaluation frameworks', 'AI safety and hallucination management basics', 'ML metrics and model quality KPIs'], aiDisruptionResistance: 9, salaryDeltaPct: 40 },
  ],
  cons: [
    { targetRole: 'Corporate Strategy / Strategic Finance', transitionDifficulty: 'medium', timeToTransition: '4–8 months', whyFit: 'Consultants with 3–5 years of experience are premium exits for strategy director and corp dev roles at large enterprises — applying your frameworks internally with P&L accountability', keySkillsToAdd: ['Internal stakeholder management and influence', 'M&A process management (LOI to close)', 'Long-horizon strategy execution (18–36 month plans)'], aiDisruptionResistance: 8, salaryDeltaPct: 20 },
    { targetRole: 'Startup Operator / VC-Backed COO', transitionDifficulty: 'hard', timeToTransition: '8–18 months', whyFit: 'Consultants with sector depth are among the most sought-after profiles for early-stage operator roles — you think in frameworks, which founders desperately need as they scale', keySkillsToAdd: ['Full P&L ownership experience', 'Founder and VC network development', 'Cross-functional team leadership without authority'], aiDisruptionResistance: 9, salaryDeltaPct: 0 },
  ],
  bpo: [
    { targetRole: 'Process Automation / RPA Analyst', transitionDifficulty: 'easy', timeToTransition: '2–3 months', whyFit: 'BPO operations professionals who learn automation tools are the most credible RPA implementors — you understand the process, which is the hardest part to replicate', keySkillsToAdd: ['UiPath / Automation Anywhere fundamentals', 'Process mapping and documentation', 'Basic Python for automation scripting'], aiDisruptionResistance: 8, salaryDeltaPct: 40 },
    { targetRole: 'CX Analytics / Quality Lead', transitionDifficulty: 'easy', timeToTransition: '1–2 months', whyFit: 'BPO professionals with strong data and quality instincts move into analytics-led CX roles — the domain knowledge is irreplaceable and the pay premium is significant', keySkillsToAdd: ['CX analytics platforms (Qualtrics, Medallia)', 'SQL for call volume and CSAT analysis', 'Statistical process control basics'], aiDisruptionResistance: 7, salaryDeltaPct: 25 },
  ],
  legal: [
    { targetRole: 'In-House Legal Counsel (Tech/FinTech)', transitionDifficulty: 'medium', timeToTransition: '3–8 months', whyFit: 'Law firm associates who develop FinTech or technology expertise are premium in-house candidates — general counsel at Series B+ startups earn 30–50% more than equivalent firm experience', keySkillsToAdd: ['Technology contracts and SaaS agreements', 'Data privacy implementation (GDPR/DPDP)', 'Corporate governance basics (board management, cap table)'], aiDisruptionResistance: 8, salaryDeltaPct: 30 },
    { targetRole: 'Legal Operations / LegalTech', transitionDifficulty: 'medium', timeToTransition: '2–5 months', whyFit: 'Legal professionals who embrace technology are uniquely positioned for legal operations roles — combining legal judgment with process automation expertise is extremely rare', keySkillsToAdd: ['Contract management systems (Ironclad, Clio)', 'Legal workflow automation', 'Matter management analytics'], aiDisruptionResistance: 9, salaryDeltaPct: 20 },
  ],
  ops: [
    { targetRole: 'Supply Chain Analytics / Digital Ops', transitionDifficulty: 'medium', timeToTransition: '2–4 months', whyFit: 'Operations professionals who add data and analytics skills transition to higher-paying roles where strategic supply chain insights are valued over pure execution', keySkillsToAdd: ['SQL for operational data analysis', 'Supply chain planning software (SAP APO, o9)', 'Process automation and RPA basics'], aiDisruptionResistance: 7, salaryDeltaPct: 20 },
    { targetRole: 'General Manager / P&L Owner', transitionDifficulty: 'hard', timeToTransition: '12–24 months', whyFit: 'Operations leads who develop commercial and P&L accountability are the most promotable profiles in operations — the GM career track is one of the highest-paying exits', keySkillsToAdd: ['P&L management and financial modelling', 'Commercial negotiation and vendor management', 'Cross-functional team leadership'], aiDisruptionResistance: 9, salaryDeltaPct: 45 },
  ],
  design: [
    { targetRole: 'Design Systems Lead', transitionDifficulty: 'easy', timeToTransition: '1–3 months', whyFit: 'UI/UX designers who own component libraries and design systems are highly valued across all product orgs — the role is a natural senior career path with strong AI resistance', keySkillsToAdd: ['Figma variables and tokenization', 'Design system governance and documentation', 'Cross-team design advocacy'], aiDisruptionResistance: 8, salaryDeltaPct: 18 },
    { targetRole: 'AI-Augmented Product Designer', transitionDifficulty: 'easy', timeToTransition: '2–4 months', whyFit: 'Designers who embrace generative AI tools and learn to design AI-native experiences are positioned as the most future-proof design profile in the next 5 years', keySkillsToAdd: ['Generative AI design tools (Midjourney, Adobe Firefly, Galileo)', 'AI UX patterns (progressive disclosure, confidence indicators)', 'Prompt-to-design workflows'], aiDisruptionResistance: 9, salaryDeltaPct: 25 },
  ],
  ind: [
    { targetRole: 'EV / Battery Systems Engineering', transitionDifficulty: 'medium', timeToTransition: '4–8 months', whyFit: 'Mechanical and electrical engineers with manufacturing experience are highly sought-after in the EV transition — the combination of systems thinking and manufacturing knowledge is the bottleneck skill', keySkillsToAdd: ['Battery management system basics', 'EV powertrain architecture', 'IEC 61851 / ISO 26262 functional safety'], aiDisruptionResistance: 9, salaryDeltaPct: 20 },
    { targetRole: 'Industrial Automation / Robotics', transitionDifficulty: 'medium', timeToTransition: '3–6 months', whyFit: 'Industrial engineers who learn PLC programming and robotics integration are one of the most future-proof manufacturing profiles — automating manufacturing requires deep process knowledge', keySkillsToAdd: ['PLC programming (Siemens / Allen-Bradley)', 'Robot integration (KUKA / Fanuc)', 'Industry 4.0 / IIoT sensor platforms'], aiDisruptionResistance: 9, salaryDeltaPct: 15 },
  ],
};

// ── Company hiring profiles ───────────────────────────────────────────────────
// 200 companies with hiring profiles (condensed here; full DB in production)

const COMPANY_HIRING_PROFILES: Record<string, Omit<JobTarget, 'matchScore' | 'matchStrength' | 'matchReasons' | 'cautions' | 'targetingRationale'>> = {
  razorpay: {
    companyName: 'razorpay', displayName: 'Razorpay', industry: 'FinTech',
    companyStage: 'growth', employeeCount: '3,000–4,000', location: ['Bangalore'],
    remotePolicy: 'hybrid',
    openRoleCategories: ['Senior Backend Engineer', 'Platform Engineer', 'Staff SWE'],
    estimatedOpenings: 45, hiringUrgency: 'active',
    salaryRange: '₹45–80L',
    recommendedChannel: 'employee_referral',
    channelRationale: 'Razorpay has a strong referral culture — 40% of hires come through employee referrals, which significantly accelerates the process',
    timingSignal: 'apply_now',
    timingRationale: 'Currently expanding payment infrastructure teams for international expansion',
    linkedinApproachTemplate: 'Hi [Name], I noticed you\'re a [Title] at Razorpay. I\'m a [Your Role] with [X years] in [relevant area] and I\'m exploring opportunities in FinTech infrastructure. Razorpay\'s work on [specific product/project] particularly interests me. Would you have 15 minutes to share what your team\'s current priorities look like?',
    applicationFocusPoints: ['Payment system scale (transactions per second)', 'API design and reliability', 'International payment rails experience'],
    whyHiring: 'International expansion to Southeast Asia and the Middle East requires significant platform engineering investment. Razorpay is rebuilding its payment orchestration layer for multi-currency, multi-rail support.',
    hiringFromCompanies: ['Flipkart', 'Amazon', 'PayTM', 'HDFC Bank Technology', 'Visa Technology'],
    interviewFocusAreas: ['System design for payment systems', 'Database scaling', 'Distributed systems reliability'],
    averageTimeToOffer: '3–5 weeks',
    compensationNotes: 'Competitive base with ESOPs. Series E/F stage — pre-IPO equity meaningful at current valuation.',
  },
  groww: {
    companyName: 'groww', displayName: 'Groww', industry: 'FinTech / WealthTech',
    companyStage: 'growth', employeeCount: '3,500–4,500', location: ['Bangalore'],
    remotePolicy: 'hybrid',
    openRoleCategories: ['Senior Data Engineer', 'Backend Engineer (Platform)', 'ML Engineer (Risk)'],
    estimatedOpenings: 35, hiringUrgency: 'active',
    salaryRange: '₹40–75L',
    recommendedChannel: 'direct_apply',
    channelRationale: 'Groww uses its career portal extensively and ATS filters efficiently for strong profiles',
    timingSignal: 'apply_now',
    timingRationale: 'Mutual funds AUM growth and new products (credit, insurance) driving sustained hiring',
    linkedinApproachTemplate: 'Hi [Name], I\'ve been following Groww\'s expansion into credit and insurance products. I\'m a [Your Role] with experience in [relevant area] and I\'m exploring opportunities where I can contribute to financial infrastructure at scale. Would love to learn more about your team\'s current priorities.',
    applicationFocusPoints: ['Financial data pipeline experience', 'Real-time risk scoring', 'Regulatory compliance (SEBI/RBI)'],
    whyHiring: 'Rapid expansion from investment to full-stack financial services (credit, insurance, credit cards) requires significant platform and data engineering talent.',
    hiringFromCompanies: ['Zerodha', 'PhonePe', 'PayTM', 'Flipkart', 'Amazon'],
    interviewFocusAreas: ['Data pipeline design', 'Real-time event processing', 'Financial domain knowledge'],
    averageTimeToOffer: '4–6 weeks',
    compensationNotes: 'Strong ESOPs at pre-IPO stage. Base compensation competitive with MNC IT.',
  },
  anthropic: {
    companyName: 'anthropic', displayName: 'Anthropic', industry: 'AI Research',
    companyStage: 'growth', employeeCount: '700–900', location: ['San Francisco', 'London', 'Remote'],
    remotePolicy: 'remote_friendly',
    openRoleCategories: ['Research Engineer', 'ML Engineer', 'Infrastructure Engineer', 'Safety Researcher'],
    estimatedOpenings: 30, hiringUrgency: 'active',
    salaryRange: '$300–600K (TC)',
    recommendedChannel: 'employee_referral',
    channelRationale: 'Anthropic places significant weight on referrals from existing researchers and engineers — cold applications face intense competition',
    timingSignal: 'apply_now',
    timingRationale: 'Sustained investment from Amazon and Google backing continued aggressive hiring',
    linkedinApproachTemplate: 'Hi [Name], I\'ve been following Anthropic\'s work on [specific paper/product] and I\'m deeply interested in the safety-focused approach to AI development. I\'m a [Your Role] with [X years] in [relevant area]. I\'d love to learn more about the kinds of problems your team is working on.',
    applicationFocusPoints: ['Research publication record or equivalent engineering', 'Safety/alignment awareness', 'Large-scale ML systems experience'],
    whyHiring: 'Continued model development (Claude family) and expansion of enterprise API products drives sustained engineering and research hiring.',
    hiringFromCompanies: ['Google DeepMind', 'OpenAI', 'Meta AI', 'Google Brain', 'Berkeley/MIT/CMU PhD programs'],
    interviewFocusAreas: ['ML fundamentals and implementation', 'Research taste and judgment', 'Systems thinking at scale'],
    averageTimeToOffer: '5–8 weeks',
    compensationNotes: 'Top-of-market TC for AI roles. Meaningful equity stake in one of the highest-valued private AI companies.',
  },
  microsoft: {
    companyName: 'microsoft', displayName: 'Microsoft India', industry: 'Technology',
    companyStage: 'enterprise', employeeCount: '18,000+ (India)', location: ['Hyderabad', 'Bangalore', 'Noida'],
    remotePolicy: 'hybrid',
    openRoleCategories: ['Senior SWE', 'Principal SWE', 'Software Engineer II', 'Cloud Solution Architect'],
    estimatedOpenings: 200, hiringUrgency: 'steady',
    salaryRange: '₹40–120L (base)',
    recommendedChannel: 'employee_referral',
    channelRationale: 'Microsoft actively encourages referrals through their employee referral program with incentives. Referral hires move 40% faster through the process.',
    timingSignal: 'apply_this_week',
    timingRationale: 'Azure AI and Copilot expansion driving sustained mid-senior hiring across India development centres',
    linkedinApproachTemplate: 'Hi [Name], I noticed you work on [specific team/product] at Microsoft. I\'m a [Your Role] with experience in [relevant tech] and I\'m interested in understanding how the [team] fits into Microsoft\'s AI-first direction. Would you be open to a brief conversation?',
    applicationFocusPoints: ['Cloud architecture (Azure preferred)', 'Large-scale distributed systems', 'AI/ML integration experience'],
    whyHiring: 'Azure AI services and Copilot products are Microsoft\'s top investment priority, driving significant India-based engineering hiring to support global product development.',
    hiringFromCompanies: ['Amazon', 'Google', 'Infosys', 'TCS', 'Wipro', 'Accenture'],
    interviewFocusAreas: ['Data structures and algorithms', 'System design', 'Behavioral (STAR method)'],
    averageTimeToOffer: '5–8 weeks',
    compensationNotes: 'Strong base + RSUs (4-year vest) + annual bonus. RSUs have predictable liquidity as public company.',
  },
  zerodha: {
    companyName: 'zerodha', displayName: 'Zerodha', industry: 'FinTech / Brokerage',
    companyStage: 'mature', employeeCount: '1,500–2,000', location: ['Bangalore'],
    remotePolicy: 'hybrid',
    openRoleCategories: ['Backend Engineer (Go/Python)', 'Data Engineer', 'Quantitative Developer'],
    estimatedOpenings: 15, hiringUrgency: 'passive',
    salaryRange: '₹35–70L',
    recommendedChannel: 'direct_apply',
    channelRationale: 'Zerodha hires slowly and deliberately — apply through their careers page with a focused cover letter demonstrating knowledge of their tech stack (Go, Python, Kafka)',
    timingSignal: 'apply_this_month',
    timingRationale: 'Zerodha hires selectively — opportunities open infrequently; monitoring their job board is essential',
    linkedinApproachTemplate: 'Hi [Name], I\'ve been studying Zerodha\'s engineering blog — particularly [specific post]. I\'m a [Your Role] with [X years] working on [relevant tech] and I\'m interested in Zerodha\'s model of building for reliability over growth. Could you share what your team\'s current technical challenges look like?',
    applicationFocusPoints: ['Deep expertise in one area (Go/Python/Kafka)', 'Trading/financial systems understanding', 'Minimalism and reliability focus over feature velocity'],
    whyHiring: 'Zerodha hires rarely but when it does, it\'s for genuine technical depth. New Nudge product and commodity trading expansion create occasional senior openings.',
    hiringFromCompanies: ['Flipkart', 'Amazon', 'Cleartrip', 'Infibeam', 'smaller FinTechs'],
    interviewFocusAreas: ['Deep technical expertise in chosen stack', 'Problem-solving with minimal abstractions', 'Understanding of markets and trading'],
    averageTimeToOffer: '6–10 weeks',
    compensationNotes: 'Below MNC in base but very low churn, exceptional work-life balance, and modest ESOPs. No VC pressure.',
  },
};

// ── Contagion-safe company resolver ─────────────────────────────────────────

const CONTAGION_PEERS: Record<string, string[]> = {
  'Infosys': ['Wipro', 'TCS', 'HCL Technologies', 'Tech Mahindra', 'Mphasis'],
  'Meta': ['Google', 'Microsoft', 'Amazon', 'Apple', 'Salesforce'],
  'Intel': ['AMD', 'Qualcomm', 'NVIDIA', 'Broadcom', 'Marvell'],
  'WeWork': ['Regus', 'Awfis', '91Springboard', 'IndiQube'],
  'Byju\'s': ['Unacademy', 'Vedantu', 'upGrad', 'Doubtnut'],
};

// ── Core targeting engine ────────────────────────────────────────────────────

export function computeJobTargeting(inputs: JobTargetingInputs): JobTargetingResult {
  const affinityData = ROLE_SECTOR_AFFINITY[inputs.workTypeKey]
    ?? ROLE_SECTOR_AFFINITY[inputs.rolePrefix]
    ?? ROLE_SECTOR_AFFINITY['default'];

  // Identify companies to AVOID (in contagion wave or known hiring freeze)
  const avoidList = buildAvoidList(inputs);

  // Build company targets
  const rawTargets = buildTargets(inputs, affinityData, avoidList);

  // Score and rank targets
  const scoredTargets = rawTargets.map(t => scoreTarget(t, inputs)).sort((a, b) => b.matchScore - a.matchScore);

  // Top 5–7 targets
  const targets = scoredTargets.slice(0, 7);

  // Market assessment
  const { marketSummary, strategyRecommendation, searchUrgency, industryMomentum, estimatedSearchDuration } =
    buildMarketAssessment(inputs, targets);

  return {
    targets,
    totalTargetedCompanies: rawTargets.length,
    marketSummary,
    strategyRecommendation,
    searchUrgency,
    avoidList,
    industryMomentum,
    estimatedSearchDuration,
  };
}

function buildAvoidList(inputs: JobTargetingInputs): string[] {
  const avoidList: string[] = [];
  const contagionPeers = CONTAGION_PEERS[inputs.currentCompanyName] ?? [];
  const activeWavePeers = inputs.peerContagion?.affectedPeers?.map(p => p.companyName) ?? [];
  return [...new Set([...contagionPeers, ...activeWavePeers])];
}

function buildTargets(
  inputs: JobTargetingInputs,
  affinityData: { hotSectors: typeof ROLE_SECTOR_AFFINITY['sw_backend']['hotSectors'] },
  avoidList: string[],
): Array<Omit<JobTarget, 'matchScore' | 'matchStrength' | 'matchReasons' | 'cautions'>> {
  const candidates: Array<Omit<JobTarget, 'matchScore' | 'matchStrength' | 'matchReasons' | 'cautions'>> = [];

  // Add sector-affinity companies
  for (const sector of affinityData.hotSectors.slice(0, 2)) {
    for (const companyName of sector.sampleCompanies.slice(0, 3)) {
      const canonical = companyName.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const profile = COMPANY_HIRING_PROFILES[canonical];
      if (profile && !avoidList.includes(companyName)) {
        candidates.push({ ...profile, targetingRationale: 'sector_affinity' });
      } else if (!avoidList.includes(companyName)) {
        // Generate a template for companies not in our detailed profile
        candidates.push(generateGenericTarget(companyName, sector, inputs));
      }
    }
  }

  return candidates.slice(0, 12); // cap raw candidates
}

function generateGenericTarget(
  companyName: string,
  sector: { sector: string; demandLevel: string; whyHiring: string; sampleCompanies: string[]; salaryPremiumPct: number },
  inputs: JobTargetingInputs,
): Omit<JobTarget, 'matchScore' | 'matchStrength' | 'matchReasons' | 'cautions'> {
  const salaryBase = getSalaryBase(inputs.region, inputs.seniorityBracket);
  const premium = 1 + (sector.salaryPremiumPct / 100);
  const salaryRange = formatSalaryRange(salaryBase * premium, inputs.region);

  return {
    companyName: companyName.toLowerCase(),
    displayName: companyName,
    industry: sector.sector,
    companyStage: 'growth',
    employeeCount: '500–5,000',
    location: getRegionLocations(inputs.region),
    remotePolicy: 'hybrid',
    openRoleCategories: inferOpenRoles(inputs.workTypeKey, inputs.seniorityBracket),
    estimatedOpenings: null,
    hiringUrgency: sector.demandLevel === 'surge' ? 'urgent' : sector.demandLevel === 'strong' ? 'active' : 'steady',
    salaryRange,
    recommendedChannel: 'employee_referral',
    channelRationale: 'Employee referrals typically accelerate hiring processes by 30–50% and bypass initial screening',
    timingSignal: sector.demandLevel === 'surge' ? 'apply_now' : 'apply_this_week',
    timingRationale: `${sector.sector} is ${sector.demandLevel === 'surge' ? 'urgently hiring' : 'actively growing'} in this area`,
    linkedinApproachTemplate: buildLinkedInTemplate(companyName, inputs),
    applicationFocusPoints: inferFocusPoints(inputs.workTypeKey),
    whyHiring: sector.whyHiring,
    hiringFromCompanies: [],
    interviewFocusAreas: inferInterviewFocus(inputs.workTypeKey),
    averageTimeToOffer: '3–6 weeks',
    compensationNotes: `${sector.sector} companies typically offer ${sector.salaryPremiumPct}% premium over baseline for this role`,
    targetingRationale: 'sector_affinity',
  };
}

function scoreTarget(
  target: Omit<JobTarget, 'matchScore' | 'matchStrength' | 'matchReasons' | 'cautions'>,
  inputs: JobTargetingInputs,
): JobTarget {
  let score = 50; // baseline
  const matchReasons: string[] = [];
  const cautions: string[] = [];

  // ── 1. Hiring urgency ────────────────────────────────────────────────────
  if (target.hiringUrgency === 'urgent') { score += 20; matchReasons.push('Urgently hiring in your function'); }
  else if (target.hiringUrgency === 'active') { score += 12; matchReasons.push('Actively growing your function'); }
  else if (target.hiringUrgency === 'steady') { score += 5; }
  else { score -= 5; cautions.push('Passive hiring mode — expect longer timelines'); }

  // ── 2. Channel quality ───────────────────────────────────────────────────
  if (target.recommendedChannel === 'employee_referral') { score += 10; matchReasons.push('Strong referral culture — network-based entry'); }
  else if (target.recommendedChannel === 'direct_apply') { score += 5; }

  // ── 3. Role alignment ────────────────────────────────────────────────────
  const roleAligned = target.openRoleCategories.some(r =>
    r.toLowerCase().includes(inputs.rolePrefix) || inputs.workTypeKey.split('_').some(w => r.toLowerCase().includes(w))
  );
  if (roleAligned) { score += 15; matchReasons.push('Direct role match confirmed'); }

  // ── 4. Anti-contagion bonus ──────────────────────────────────────────────
  if (target.targetingRationale === 'anti_contagion') { score += 8; matchReasons.push('Not in the same layoff wave — safer market'); }
  if (target.targetingRationale === 'ai_safe_growth') { score += 10; matchReasons.push('Company growing because of AI, not disrupted by it'); }

  // ── 5. Timing signal ─────────────────────────────────────────────────────
  if (target.timingSignal === 'apply_now') { score += 5; }
  else if (target.timingSignal === 'wait_for_q') { score -= 8; cautions.push('Timing suboptimal — budget cycle may delay hiring'); }

  // ── 6. Company stage fit vs. candidate background ────────────────────────
  if (inputs.currentCompanySize === 'startup' && target.companyStage === 'growth') { score += 5; matchReasons.push('Growth-stage target matches startup-speed background'); }
  if (inputs.currentCompanySize === 'mega' && target.companyStage === 'enterprise') { score += 5; matchReasons.push('Enterprise scale matches your operating context'); }
  if (inputs.currentCompanySize === 'mega' && target.companyStage === 'startup') { score -= 8; cautions.push('Significant culture shift from mega-corp to startup — verify readiness'); }

  // ── 7. Seniority signal ──────────────────────────────────────────────────
  const seniorRoleSignals = ['staff', 'principal', 'director', 'vp', 'lead'];
  const isTargetingSeniorRole = target.openRoleCategories.some(r =>
    seniorRoleSignals.some(s => r.toLowerCase().includes(s))
  );
  if (['director', 'executive'].includes(inputs.seniorityBracket) && isTargetingSeniorRole) {
    score += 6;
    matchReasons.push('Seniority level aligns with open leadership roles');
  }

  // ── 8. AI disruption resistance of the sector ────────────────────────────
  // Check if this sector is in the surge category for AI-safe roles
  const affinityEntry = ROLE_SECTOR_AFFINITY[inputs.workTypeKey] ?? ROLE_SECTOR_AFFINITY[inputs.rolePrefix] ?? null;
  const sectorInAffinity = affinityEntry?.hotSectors.some(
    s => s.sector.toLowerCase() === target.industry.toLowerCase() && s.demandLevel === 'surge'
  );
  if (sectorInAffinity) { score += 6; matchReasons.push('Your sector is in surge demand within this industry'); }

  // ── 9. Geographic alignment ──────────────────────────────────────────────
  const regionLocations = getRegionLocations(inputs.region);
  const locationMatch = target.location.some(l => regionLocations.includes(l));
  if (locationMatch) { score += 4; }
  if (target.remotePolicy === 'full_remote') { score += 4; matchReasons.push('Full-remote policy removes geographic friction'); }

  // ── 10. Visa constraint penalty ──────────────────────────────────────────
  if (inputs.visaStatus && inputs.visaStatus !== 'citizen' && inputs.visaStatus !== 'permanent_resident') {
    if (!target.hiringFromCompanies.length) {
      score -= 5;
      cautions.push('Verify visa sponsorship before applying — not all companies sponsor');
    }
  }

  // Cap
  score = Math.min(99, Math.max(20, score));

  const matchStrength: JobTarget['matchStrength'] = score >= 85 ? 'excellent' : score >= 70 ? 'strong' : score >= 55 ? 'good' : 'moderate';

  return {
    ...target,
    matchScore: score,
    matchStrength,
    matchReasons: matchReasons.slice(0, 3),
    cautions: cautions.slice(0, 2),
  };
}

/**
 * Returns adjacent role opportunities for the given role prefix.
 * Used by Action Plan panels to surface career pivots.
 */
export function getAdjacentRoles(rolePrefix: string): AdjacentRoleTarget[] {
  return ADJACENT_ROLE_MAP[rolePrefix] ?? [];
}

function buildMarketAssessment(inputs: JobTargetingInputs, targets: JobTarget[]): {
  marketSummary: string;
  strategyRecommendation: string;
  searchUrgency: JobTargetingResult['searchUrgency'];
  industryMomentum: JobTargetingResult['industryMomentum'];
  estimatedSearchDuration: string;
} {
  const urgentTargets = targets.filter(t => t.hiringUrgency === 'urgent' || t.hiringUrgency === 'active').length;
  const avgMatchScore = targets.reduce((s, t) => s + t.matchScore, 0) / Math.max(1, targets.length);

  const hasActiveContagion = (inputs.peerContagion?.waveIntensity ?? 'NONE') !== 'NONE';
  const highScore = inputs.compositeScore > 65;

  const searchUrgency: JobTargetingResult['searchUrgency'] = (highScore && hasActiveContagion) ? 'start_today'
    : highScore ? 'start_this_week'
    : inputs.compositeScore > 45 ? 'start_this_month'
    : 'steady_monitoring';

  const industryMomentum: JobTargetingResult['industryMomentum'] = urgentTargets >= 3 ? 'accelerating'
    : urgentTargets >= 1 ? 'stable'
    : 'decelerating';

  const estimatedSearchDuration = inputs.seniorityBracket === 'executive' ? '6–10 weeks to first offer'
    : inputs.seniorityBracket === 'director' ? '4–8 weeks to first offer'
    : inputs.seniorityBracket === 'senior' ? '3–6 weeks to first offer'
    : '2–5 weeks to first offer';

  const marketSummary = `${urgentTargets} of your ${targets.length} target companies are actively hiring in your function with an average match score of ${Math.round(avgMatchScore)}. `
    + (hasActiveContagion
      ? `A sector contagion wave is active — competitors are cutting, which INCREASES urgency but also means talented candidates are being released into the market simultaneously.`
      : `No active contagion wave in your sector — the market is stable for your function.`);

  const strategyRecommendation = buildStrategyRecommendation(inputs, targets, searchUrgency);

  return { marketSummary, strategyRecommendation, searchUrgency, industryMomentum, estimatedSearchDuration };
}

function buildStrategyRecommendation(
  inputs: JobTargetingInputs,
  targets: JobTarget[],
  urgency: JobTargetingResult['searchUrgency'],
): string {
  const topTarget = targets[0];
  if (urgency === 'start_today') {
    return `IMMEDIATE ACTION: Your risk signals require starting a parallel job search TODAY. Begin with ${topTarget?.displayName ?? 'your top target'} via ${topTarget?.recommendedChannel?.replace('_', ' ') ?? 'referral'} — this is your highest-match, actively-hiring target. Aim to have 3 conversations started within 5 business days.`;
  }
  if (urgency === 'start_this_week') {
    return `Start your parallel search this week while maintaining current role performance. The ${topTarget?.displayName ?? 'top targets'} route via ${topTarget?.recommendedChannel?.replace('_', ' ') ?? 'referral'} gives the best time-to-offer profile. Spend 30 minutes today identifying referral contacts at your top 3 companies.`;
  }
  return `Steady-state market monitoring with selective applications. Focus on the top 3 highest-match companies — apply thoughtfully rather than broadly. Quality over volume in this market.`;
}

// ── Utility helpers ──────────────────────────────────────────────────────────

function getSalaryBase(region: string, seniority: string): number {
  const REGION_SENIORITY_BASE: Record<string, Record<string, number>> = {
    india: { junior: 800000, mid: 1500000, senior: 2800000, lead: 4500000, director: 7000000, executive: 12000000 },
    us:    { junior: 120000, mid: 160000, senior: 220000, lead: 280000, director: 380000, executive: 550000 },
    uk:    { junior: 55000,  mid: 75000,  senior: 100000, lead: 130000, director: 175000, executive: 250000 },
    sg:    { junior: 70000,  mid: 100000, senior: 140000, lead: 185000, director: 240000, executive: 350000 },
  };
  return (REGION_SENIORITY_BASE[region] ?? REGION_SENIORITY_BASE['india'])[seniority] ?? 1500000;
}

function formatSalaryRange(base: number, region: string): string {
  if (region === 'india') {
    const l = Math.round(base * 0.85 / 100000);
    const h = Math.round(base * 1.25 / 100000);
    return `₹${l}–${h}L`;
  }
  if (region === 'us') {
    return `$${Math.round(base * 0.85 / 1000)}K–$${Math.round(base * 1.25 / 1000)}K`;
  }
  return `${Math.round(base * 0.85 / 1000)}K–${Math.round(base * 1.25 / 1000)}K ${region.toUpperCase()}`;
}

function getRegionLocations(region: string): string[] {
  const REGION_LOCATIONS: Record<string, string[]> = {
    india: ['Bangalore', 'Hyderabad', 'Mumbai', 'Delhi NCR', 'Chennai', 'Pune'],
    us:    ['San Francisco', 'New York', 'Seattle', 'Austin', 'Remote'],
    uk:    ['London', 'Manchester', 'Edinburgh', 'Remote'],
    sg:    ['Singapore'],
  };
  return REGION_LOCATIONS[region] ?? REGION_LOCATIONS['india'];
}

function inferOpenRoles(workTypeKey: string, seniority: string): string[] {
  const level = seniority === 'junior' ? '' : seniority === 'mid' ? 'Senior ' : seniority === 'senior' ? 'Staff ' : 'Principal ';
  const roleMap: Record<string, string> = {
    sw_backend: `${level}Backend Engineer`,
    sw_frontend: `${level}Frontend Engineer`,
    ml_engineer: `${level}Machine Learning Engineer`,
    data_engineer: `${level}Data Engineer`,
    sec_analyst: `${level}Security Engineer`,
    fin_analyst: `${level}Financial Analyst`,
    hr_analyst: `${level}HR Business Partner`,
  };
  return [roleMap[workTypeKey] ?? `${level}${workTypeKey.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`];
}

function inferFocusPoints(workTypeKey: string): string[] {
  const FOCUS_POINTS: Record<string, string[]> = {
    sw_backend: ['System design demonstrating scale (requests/sec, data volume)', 'Reliability engineering (SLOs, incident management)', 'API design and versioning philosophy'],
    ml_engineer: ['Production ML systems (not just research notebooks)', 'Model serving at scale (latency, throughput trade-offs)', 'ML platform and tooling experience'],
    data_engineer: ['Modern data stack proficiency (dbt, Airbyte, Spark)', 'Data quality and observability frameworks', 'Real-time vs. batch pipeline design decisions'],
    sec_analyst: ['Specific incident or vulnerability you owned and resolved', 'Cloud security architecture (GCP/AWS/Azure)', 'Compliance framework implementation experience'],
    fin_analyst: ['Financial modelling complexity and accuracy', 'Business case ownership (not just analysis support)', 'Cross-functional stakeholder influence'],
  };
  return FOCUS_POINTS[workTypeKey] ?? ['Specific impact metrics from current role', 'Cross-functional collaboration examples', 'Technical or domain expertise demonstrations'];
}

function inferInterviewFocus(workTypeKey: string): string[] {
  const INTERVIEW_FOCUS: Record<string, string[]> = {
    sw_backend: ['LeetCode medium/hard (data structures, algorithms)', 'System design (design a payment system, URL shortener)', 'Behavioral: ownership, conflict resolution'],
    ml_engineer: ['ML fundamentals (backprop, regularisation, evaluation metrics)', 'System design for ML (feature store, model registry)', 'Research reading and critical evaluation'],
    data_engineer: ['SQL query optimisation', 'Data modelling (star schema, data vault)', 'Pipeline debugging and observability'],
    sec_analyst: ['Security concepts (CIA triad, OWASP Top 10)', 'Incident response scenario (walk through a breach)', 'Threat modelling methodology'],
    fin_analyst: ['Financial modelling (DCF, LBO basics)', 'Business case framework', 'Excel/SQL proficiency'],
  };
  return INTERVIEW_FOCUS[workTypeKey] ?? ['Role-specific technical assessment', 'Behavioral interview (STAR)', 'Domain knowledge questions'];
}

function buildLinkedInTemplate(companyName: string, inputs: JobTargetingInputs): string {
  const level = inputs.seniorityBracket === 'executive' ? 'executive-level' : inputs.seniorityBracket === 'director' ? 'director-level' : 'senior';
  return `Hi [Name], I noticed you work at ${companyName} on [specific team]. I'm a ${level} [your role] with [X years] experience in [key skill]. I'm exploring opportunities where I can [specific value proposition]. ${companyName}'s work on [specific product/initiative] aligns closely with my background. Would you be open to a 15-minute conversation?`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// v51.0 — Salary Benchmarks, Hiring Probability Matrix, AI Disruption Resistance
// ═══════════════════════════════════════════════════════════════════════════════

// ── Salary Benchmark Map ──────────────────────────────────────────────────────
// role prefix × region × seniority → {min, median, max, p90} in USD/yr
// INR figures stored as USD equivalent at 1 USD = 83 INR.
// Sources: Levels.fyi Q1 2026, LinkedIn Salary Insights, Glassdoor, Naukri Salary Index

export interface SalaryBenchmark {
  minUsd: number;
  medianUsd: number;
  maxUsd: number;
  p90Usd: number;
  localFormatted: string;   // "₹28–55L" or "$140–210K"
  equityNote: string;       // equity typical at this level
  bonusNote: string;        // typical bonus structure
}

type SeniorityKey = 'junior' | 'mid' | 'senior' | 'staff' | 'exec';
type RegionKey = 'in' | 'us' | 'uk' | 'sg' | 'default';

const SALARY_BENCHMARKS: Record<string, Record<RegionKey, Record<SeniorityKey, SalaryBenchmark>>> = {
  sw: {
    in: {
      junior: { minUsd:  9_600, medianUsd: 14_500, maxUsd:  22_000, p90Usd:  19_000, localFormatted: '₹8–18L',    equityNote: 'ESOPs typical at growth-stage only', bonusNote: 'No bonus common; 10% at large cos' },
      mid:    { minUsd: 18_000, medianUsd: 28_000, maxUsd:  48_000, p90Usd:  42_000, localFormatted: '₹15–40L',   equityNote: 'ESOPs at growth/mega', bonusNote: '10–20% at large cos' },
      senior: { minUsd: 36_000, medianUsd: 54_000, maxUsd:  84_000, p90Usd:  72_000, localFormatted: '₹30–70L',   equityNote: 'ESOPs + refreshers at top tech', bonusNote: '15–20%' },
      staff:  { minUsd: 60_000, medianUsd: 90_000, maxUsd: 144_000, p90Usd: 120_000, localFormatted: '₹50–120L',  equityNote: 'Significant ESOP grants', bonusNote: '20–30%' },
      exec:   { minUsd: 96_000, medianUsd:144_000, maxUsd: 240_000, p90Usd: 200_000, localFormatted: '₹80–200L+', equityNote: 'Large ESOP + vesting cliff', bonusNote: '30%+' },
    },
    us: {
      junior: { minUsd: 90_000, medianUsd:115_000, maxUsd: 150_000, p90Usd: 140_000, localFormatted: '$90K–$150K',   equityNote: 'RSUs at FAANG/growth (4yr)', bonusNote: '5–10%' },
      mid:    { minUsd:140_000, medianUsd:175_000, maxUsd: 230_000, p90Usd: 210_000, localFormatted: '$140K–$230K',  equityNote: 'RSUs $50K–150K/yr', bonusNote: '10–15%' },
      senior: { minUsd:180_000, medianUsd:240_000, maxUsd: 360_000, p90Usd: 320_000, localFormatted: '$180K–$360K',  equityNote: 'RSUs $100K–300K/yr', bonusNote: '15–20%' },
      staff:  { minUsd:250_000, medianUsd:340_000, maxUsd: 520_000, p90Usd: 460_000, localFormatted: '$250K–$520K',  equityNote: 'RSUs $200K–500K/yr', bonusNote: '20–30%' },
      exec:   { minUsd:350_000, medianUsd:500_000, maxUsd: 900_000, p90Usd: 750_000, localFormatted: '$350K–$900K+', equityNote: 'Large RSU + performance grants', bonusNote: '30–50%' },
    },
    uk: {
      junior: { minUsd: 48_000, medianUsd: 62_000, maxUsd:  85_000, p90Usd:  78_000, localFormatted: '£38K–£68K',   equityNote: 'EMI options at startups', bonusNote: '5–10%' },
      mid:    { minUsd: 72_000, medianUsd: 96_000, maxUsd: 135_000, p90Usd: 120_000, localFormatted: '£58K–£108K',  equityNote: 'EMI options/RSUs at growth', bonusNote: '10–15%' },
      senior: { minUsd:100_000, medianUsd:135_000, maxUsd: 190_000, p90Usd: 170_000, localFormatted: '£80K–£152K',  equityNote: 'RSUs at large tech', bonusNote: '15–20%' },
      staff:  { minUsd:140_000, medianUsd:185_000, maxUsd: 260_000, p90Usd: 230_000, localFormatted: '£112K–£208K', equityNote: 'Significant RSU grants', bonusNote: '20–30%' },
      exec:   { minUsd:190_000, medianUsd:260_000, maxUsd: 400_000, p90Usd: 350_000, localFormatted: '£152K–£320K', equityNote: 'Large RSU + LTIP', bonusNote: '30%+' },
    },
    sg: {
      junior: { minUsd: 42_000, medianUsd: 54_000, maxUsd:  75_000, p90Usd:  68_000, localFormatted: 'S$56K–S$100K',  equityNote: 'Options at startups', bonusNote: '5–10%' },
      mid:    { minUsd: 66_000, medianUsd: 90_000, maxUsd: 125_000, p90Usd: 112_000, localFormatted: 'S$88K–S$166K',  equityNote: 'RSUs at MNCs', bonusNote: '10–15%' },
      senior: { minUsd: 96_000, medianUsd:130_000, maxUsd: 180_000, p90Usd: 162_000, localFormatted: 'S$128K–S$240K', equityNote: 'RSUs + refreshers', bonusNote: '15–20%' },
      staff:  { minUsd:130_000, medianUsd:175_000, maxUsd: 240_000, p90Usd: 215_000, localFormatted: 'S$173K–S$320K', equityNote: 'Significant grants', bonusNote: '20–30%' },
      exec:   { minUsd:175_000, medianUsd:240_000, maxUsd: 360_000, p90Usd: 310_000, localFormatted: 'S$233K–S$480K', equityNote: 'LTIP + performance RSUs', bonusNote: '30%+' },
    },
    default: {
      junior: { minUsd:  9_600, medianUsd: 14_500, maxUsd:  22_000, p90Usd:  19_000, localFormatted: 'Market rate varies', equityNote: 'ESOPs at growth-stage', bonusNote: '10–15%' },
      mid:    { minUsd: 18_000, medianUsd: 28_000, maxUsd:  48_000, p90Usd:  42_000, localFormatted: 'Market rate varies', equityNote: 'ESOPs at growth/mega', bonusNote: '10–20%' },
      senior: { minUsd: 36_000, medianUsd: 54_000, maxUsd:  84_000, p90Usd:  72_000, localFormatted: 'Market rate varies', equityNote: 'ESOPs + refreshers', bonusNote: '15–20%' },
      staff:  { minUsd: 60_000, medianUsd: 90_000, maxUsd: 144_000, p90Usd: 120_000, localFormatted: 'Market rate varies', equityNote: 'Significant grants', bonusNote: '20–30%' },
      exec:   { minUsd: 96_000, medianUsd:144_000, maxUsd: 240_000, p90Usd: 200_000, localFormatted: 'Market rate varies', equityNote: 'Large grants', bonusNote: '30%+' },
    },
  },
  fin: {
    in: {
      junior: { minUsd:  7_200, medianUsd: 12_000, maxUsd:  20_000, p90Usd:  18_000, localFormatted: '₹6–16L',    equityNote: 'Rare at this level', bonusNote: '10–15% at banks' },
      mid:    { minUsd: 14_400, medianUsd: 24_000, maxUsd:  42_000, p90Usd:  36_000, localFormatted: '₹12–35L',   equityNote: 'ESOPs at FinTechs', bonusNote: '15–25% at IB/PE' },
      senior: { minUsd: 28_000, medianUsd: 48_000, maxUsd:  84_000, p90Usd:  72_000, localFormatted: '₹23–70L',   equityNote: 'ESOPs + carry at PE', bonusNote: '20–50% at IB' },
      staff:  { minUsd: 60_000, medianUsd: 96_000, maxUsd: 168_000, p90Usd: 144_000, localFormatted: '₹50–140L',  equityNote: 'PE carry + ESOPs', bonusNote: '30–80%' },
      exec:   { minUsd: 96_000, medianUsd:168_000, maxUsd: 360_000, p90Usd: 280_000, localFormatted: '₹80–300L+', equityNote: 'Carry + large ESOP', bonusNote: '50–100%+' },
    },
    us: {
      junior: { minUsd: 75_000, medianUsd: 95_000, maxUsd: 130_000, p90Usd: 120_000, localFormatted: '$75K–$130K',  equityNote: 'Stub equity at PE/HF', bonusNote: '10–20%' },
      mid:    { minUsd:110_000, medianUsd:150_000, maxUsd: 220_000, p90Usd: 200_000, localFormatted: '$110K–$220K', equityNote: 'Carry at PE, RSUs at corps', bonusNote: '20–50%' },
      senior: { minUsd:160_000, medianUsd:230_000, maxUsd: 380_000, p90Usd: 320_000, localFormatted: '$160K–$380K', equityNote: 'Carry + RSUs', bonusNote: '30–100%' },
      staff:  { minUsd:230_000, medianUsd:350_000, maxUsd: 600_000, p90Usd: 520_000, localFormatted: '$230K–$600K', equityNote: 'Significant carry', bonusNote: '50–150%' },
      exec:   { minUsd:320_000, medianUsd:500_000, maxUsd:1_200_000, p90Usd:900_000, localFormatted: '$320K–$1.2M+', equityNote: 'Large carry + equity', bonusNote: '100%+' },
    },
    uk: {
      junior: { minUsd: 44_000, medianUsd: 58_000, maxUsd:  82_000, p90Usd:  75_000, localFormatted: '£35K–£66K',   equityNote: 'Bonus-heavy, little equity', bonusNote: '10–20%' },
      mid:    { minUsd: 64_000, medianUsd: 90_000, maxUsd: 140_000, p90Usd: 125_000, localFormatted: '£51K–£112K',  equityNote: 'Deferred bonus at banks', bonusNote: '20–50%' },
      senior: { minUsd: 96_000, medianUsd:145_000, maxUsd: 240_000, p90Usd: 210_000, localFormatted: '£77K–£192K',  equityNote: 'Carry + deferred bonus', bonusNote: '30–80%' },
      staff:  { minUsd:140_000, medianUsd:210_000, maxUsd: 400_000, p90Usd: 360_000, localFormatted: '£112K–£320K', equityNote: 'Carry at PE/HF', bonusNote: '50–100%' },
      exec:   { minUsd:200_000, medianUsd:320_000, maxUsd: 700_000, p90Usd: 600_000, localFormatted: '£160K–£560K', equityNote: 'Large carry', bonusNote: '100%+' },
    },
    sg: {
      junior: { minUsd: 38_000, medianUsd: 52_000, maxUsd:  75_000, p90Usd:  68_000, localFormatted: 'S$51K–S$100K',  equityNote: 'Bonus-primary', bonusNote: '10–20%' },
      mid:    { minUsd: 58_000, medianUsd: 84_000, maxUsd: 130_000, p90Usd: 115_000, localFormatted: 'S$77K–S$173K',  equityNote: 'Carry at PE', bonusNote: '20–40%' },
      senior: { minUsd: 90_000, medianUsd:130_000, maxUsd: 200_000, p90Usd: 178_000, localFormatted: 'S$120K–S$267K', equityNote: 'Carry + equity', bonusNote: '30–60%' },
      staff:  { minUsd:130_000, medianUsd:190_000, maxUsd: 320_000, p90Usd: 280_000, localFormatted: 'S$173K–S$427K', equityNote: 'Carry at HF/PE', bonusNote: '50–100%' },
      exec:   { minUsd:180_000, medianUsd:280_000, maxUsd: 550_000, p90Usd: 480_000, localFormatted: 'S$240K–S$733K', equityNote: 'Large carry', bonusNote: '100%+' },
    },
    default: {
      junior: { minUsd:  7_200, medianUsd: 12_000, maxUsd:  20_000, p90Usd:  18_000, localFormatted: 'Market rate varies', equityNote: 'Bonus-primary', bonusNote: '10–15%' },
      mid:    { minUsd: 14_400, medianUsd: 24_000, maxUsd:  42_000, p90Usd:  36_000, localFormatted: 'Market rate varies', equityNote: 'ESOPs at FinTechs', bonusNote: '15–25%' },
      senior: { minUsd: 28_000, medianUsd: 48_000, maxUsd:  84_000, p90Usd:  72_000, localFormatted: 'Market rate varies', equityNote: 'ESOPs/carry varies', bonusNote: '20–50%' },
      staff:  { minUsd: 60_000, medianUsd: 96_000, maxUsd: 168_000, p90Usd: 144_000, localFormatted: 'Market rate varies', equityNote: 'PE carry + ESOPs', bonusNote: '30–80%' },
      exec:   { minUsd: 96_000, medianUsd:168_000, maxUsd: 360_000, p90Usd: 280_000, localFormatted: 'Market rate varies', equityNote: 'Carry + large ESOP', bonusNote: '50–100%+' },
    },
  },
  hc: {
    in: {
      junior: { minUsd:  4_800, medianUsd:  7_200, maxUsd:  12_000, p90Usd:  10_000, localFormatted: '₹4–10L',    equityNote: 'None', bonusNote: 'Rare' },
      mid:    { minUsd:  9_600, medianUsd: 14_400, maxUsd:  24_000, p90Usd:  20_000, localFormatted: '₹8–20L',    equityNote: 'HealthTech ESOPs', bonusNote: '5–10%' },
      senior: { minUsd: 16_800, medianUsd: 28_800, maxUsd:  48_000, p90Usd:  40_000, localFormatted: '₹14–40L',   equityNote: 'ESOPs at HealthTech', bonusNote: '10–15%' },
      staff:  { minUsd: 28_800, medianUsd: 48_000, maxUsd:  96_000, p90Usd:  80_000, localFormatted: '₹24–80L',   equityNote: 'ESOPs at growth-stage', bonusNote: '15–20%' },
      exec:   { minUsd: 48_000, medianUsd: 84_000, maxUsd: 180_000, p90Usd: 144_000, localFormatted: '₹40–150L',  equityNote: 'Significant ESOPs', bonusNote: '20–30%' },
    },
    us: {
      junior: { minUsd: 55_000, medianUsd: 75_000, maxUsd: 105_000, p90Usd:  95_000, localFormatted: '$55K–$105K',  equityNote: 'None at hospitals', bonusNote: '5%' },
      mid:    { minUsd: 85_000, medianUsd:115_000, maxUsd: 165_000, p90Usd: 150_000, localFormatted: '$85K–$165K',  equityNote: 'RSUs at HealthTech', bonusNote: '5–10%' },
      senior: { minUsd:130_000, medianUsd:185_000, maxUsd: 280_000, p90Usd: 250_000, localFormatted: '$130K–$280K', equityNote: 'RSUs at HealthTech', bonusNote: '10–20%' },
      staff:  { minUsd:200_000, medianUsd:290_000, maxUsd: 450_000, p90Usd: 400_000, localFormatted: '$200K–$450K', equityNote: 'RSUs + options', bonusNote: '15–25%' },
      exec:   { minUsd:280_000, medianUsd:420_000, maxUsd: 750_000, p90Usd: 650_000, localFormatted: '$280K–$750K', equityNote: 'Large grants', bonusNote: '20–40%' },
    },
    uk: { junior: { minUsd: 36_000, medianUsd: 50_000, maxUsd:  72_000, p90Usd:  64_000, localFormatted: '£29K–£58K',  equityNote: 'NHS = none', bonusNote: 'NHS: none; private: 5%' }, mid: { minUsd: 52_000, medianUsd: 72_000, maxUsd: 108_000, p90Usd:  96_000, localFormatted: '£42K–£86K',  equityNote: 'HealthTech EMI options', bonusNote: '5–10%' }, senior: { minUsd: 78_000, medianUsd:110_000, maxUsd: 165_000, p90Usd: 148_000, localFormatted: '£62K–£132K', equityNote: 'EMI/RSUs at HealthTech', bonusNote: '10–15%' }, staff: { minUsd:110_000, medianUsd:155_000, maxUsd: 240_000, p90Usd: 212_000, localFormatted: '£88K–£192K', equityNote: 'RSUs', bonusNote: '15–20%' }, exec: { minUsd:155_000, medianUsd:220_000, maxUsd: 380_000, p90Usd: 320_000, localFormatted: '£124K–£304K', equityNote: 'LTIP', bonusNote: '20–30%' } },
    sg: { junior: { minUsd: 32_000, medianUsd: 44_000, maxUsd:  64_000, p90Usd:  58_000, localFormatted: 'S$43K–S$85K',  equityNote: 'Options at startups', bonusNote: '5%' }, mid: { minUsd: 48_000, medianUsd: 68_000, maxUsd: 100_000, p90Usd:  90_000, localFormatted: 'S$64K–S$133K',  equityNote: 'RSUs at MNCs', bonusNote: '5–10%' }, senior: { minUsd: 72_000, medianUsd:100_000, maxUsd: 150_000, p90Usd: 136_000, localFormatted: 'S$96K–S$200K',  equityNote: 'RSUs', bonusNote: '10–15%' }, staff: { minUsd:100_000, medianUsd:145_000, maxUsd: 215_000, p90Usd: 192_000, localFormatted: 'S$133K–S$287K', equityNote: 'Significant grants', bonusNote: '15–20%' }, exec: { minUsd:140_000, medianUsd:205_000, maxUsd: 340_000, p90Usd: 296_000, localFormatted: 'S$187K–S$453K', equityNote: 'LTIP', bonusNote: '20–30%' } },
    default: { junior: { minUsd: 4_800, medianUsd: 7_200, maxUsd: 12_000, p90Usd: 10_000, localFormatted: 'Market rate varies', equityNote: 'Rare', bonusNote: 'Rare' }, mid: { minUsd: 9_600, medianUsd: 14_400, maxUsd: 24_000, p90Usd: 20_000, localFormatted: 'Market rate varies', equityNote: 'HealthTech ESOPs', bonusNote: '5–10%' }, senior: { minUsd: 16_800, medianUsd: 28_800, maxUsd: 48_000, p90Usd: 40_000, localFormatted: 'Market rate varies', equityNote: 'ESOPs', bonusNote: '10–15%' }, staff: { minUsd: 28_800, medianUsd: 48_000, maxUsd: 96_000, p90Usd: 80_000, localFormatted: 'Market rate varies', equityNote: 'ESOPs', bonusNote: '15–20%' }, exec: { minUsd: 48_000, medianUsd: 84_000, maxUsd: 180_000, p90Usd: 144_000, localFormatted: 'Market rate varies', equityNote: 'Significant ESOPs', bonusNote: '20–30%' } },
  },

  // ── Data Science ────────────────────────────────────────────────────────────
  ds: {
    in: {
      junior: { minUsd:  7_200, medianUsd: 12_000, maxUsd:  18_000, p90Usd:  15_600, localFormatted: '₹6–15L',   equityNote: 'ESOPs at analytics startups', bonusNote: '8–12%' },
      mid:    { minUsd: 14_400, medianUsd: 24_000, maxUsd:  36_000, p90Usd:  30_000, localFormatted: '₹12–30L',  equityNote: 'ESOPs at tech/fintech', bonusNote: '10–15%' },
      senior: { minUsd: 24_000, medianUsd: 40_000, maxUsd:  60_000, p90Usd:  52_000, localFormatted: '₹20–50L',  equityNote: 'ESOPs + refreshers', bonusNote: '15–20%' },
      staff:  { minUsd: 42_000, medianUsd: 72_000, maxUsd:  96_000, p90Usd:  84_000, localFormatted: '₹35–80L',  equityNote: 'Significant ESOPs', bonusNote: '20–25%' },
      exec:   { minUsd: 72_000, medianUsd:108_000, maxUsd: 144_000, p90Usd: 126_000, localFormatted: '₹60–120L', equityNote: 'Large ESOP grants', bonusNote: '25–35%' },
    },
    us: {
      junior: { minUsd: 95_000, medianUsd:120_000, maxUsd: 150_000, p90Usd: 140_000, localFormatted: '$95K–$150K',  equityNote: 'RSUs at tech companies', bonusNote: '5–10%' },
      mid:    { minUsd:130_000, medianUsd:165_000, maxUsd: 200_000, p90Usd: 190_000, localFormatted: '$130K–$200K', equityNote: 'RSUs', bonusNote: '10–15%' },
      senior: { minUsd:185_000, medianUsd:240_000, maxUsd: 300_000, p90Usd: 280_000, localFormatted: '$185K–$300K', equityNote: 'Significant RSUs', bonusNote: '15–20%' },
      staff:  { minUsd:250_000, medianUsd:320_000, maxUsd: 400_000, p90Usd: 370_000, localFormatted: '$250K–$400K', equityNote: 'Large RSU grants', bonusNote: '20–25%' },
      exec:   { minUsd:350_000, medianUsd:480_000, maxUsd: 600_000, p90Usd: 560_000, localFormatted: '$350K–$600K', equityNote: 'Large grants + LTIP', bonusNote: '25–35%' },
    },
    uk: {
      junior: { minUsd: 50_000, medianUsd: 64_000, maxUsd:  88_000, p90Usd:  80_000, localFormatted: '£40K–£70K',   equityNote: 'EMI at startups', bonusNote: '5–10%' },
      mid:    { minUsd: 69_000, medianUsd: 88_000, maxUsd: 119_000, p90Usd: 108_000, localFormatted: '£55K–£95K',   equityNote: 'EMI/RSUs', bonusNote: '10–15%' },
      senior: { minUsd:100_000, medianUsd:128_000, maxUsd: 176_000, p90Usd: 158_000, localFormatted: '£80K–£140K',  equityNote: 'RSUs', bonusNote: '15–20%' },
      staff:  { minUsd:138_000, medianUsd:176_000, maxUsd: 238_000, p90Usd: 213_000, localFormatted: '£110K–£190K', equityNote: 'RSUs + LTIP', bonusNote: '20–30%' },
      exec:   { minUsd:188_000, medianUsd:240_000, maxUsd: 326_000, p90Usd: 294_000, localFormatted: '£150K–£260K', equityNote: 'LTIP', bonusNote: '30%+' },
    },
    sg: {
      junior: { minUsd: 36_000, medianUsd: 50_000, maxUsd:  64_000, p90Usd:  58_000, localFormatted: 'S$48K–S$85K',   equityNote: 'Options at startups', bonusNote: '5–10%' },
      mid:    { minUsd: 56_000, medianUsd: 75_000, maxUsd:  98_000, p90Usd:  90_000, localFormatted: 'S$75K–S$130K',  equityNote: 'RSUs at MNCs', bonusNote: '10–15%' },
      senior: { minUsd: 83_000, medianUsd:108_000, maxUsd: 139_000, p90Usd: 128_000, localFormatted: 'S$110K–S$185K', equityNote: 'RSUs', bonusNote: '15–20%' },
      staff:  { minUsd:113_000, medianUsd:150_000, maxUsd: 188_000, p90Usd: 174_000, localFormatted: 'S$150K–S$250K', equityNote: 'Significant grants', bonusNote: '20–25%' },
      exec:   { minUsd:150_000, medianUsd:208_000, maxUsd: 270_000, p90Usd: 248_000, localFormatted: 'S$200K–S$360K', equityNote: 'LTIP', bonusNote: '25–35%' },
    },
    default: { junior: { minUsd: 7_200, medianUsd: 12_000, maxUsd: 18_000, p90Usd: 15_600, localFormatted: 'Market rate varies', equityNote: 'ESOPs at startups', bonusNote: '8–12%' }, mid: { minUsd: 14_400, medianUsd: 24_000, maxUsd: 36_000, p90Usd: 30_000, localFormatted: 'Market rate varies', equityNote: 'ESOPs', bonusNote: '10–15%' }, senior: { minUsd: 24_000, medianUsd: 40_000, maxUsd: 60_000, p90Usd: 52_000, localFormatted: 'Market rate varies', equityNote: 'ESOPs', bonusNote: '15–20%' }, staff: { minUsd: 42_000, medianUsd: 72_000, maxUsd: 96_000, p90Usd: 84_000, localFormatted: 'Market rate varies', equityNote: 'Significant ESOPs', bonusNote: '20–25%' }, exec: { minUsd: 72_000, medianUsd: 108_000, maxUsd: 144_000, p90Usd: 126_000, localFormatted: 'Market rate varies', equityNote: 'Large grants', bonusNote: '25–35%' } },
  },

  // ── Product Management ───────────────────────────────────────────────────────
  pm: {
    in: {
      junior: { minUsd:  9_600, medianUsd: 14_400, maxUsd:  21_600, p90Usd:  19_200, localFormatted: '₹8–18L',    equityNote: 'ESOPs at tech startups', bonusNote: '8–12%' },
      mid:    { minUsd: 18_000, medianUsd: 28_800, maxUsd:  42_000, p90Usd:  36_000, localFormatted: '₹15–35L',   equityNote: 'ESOPs', bonusNote: '12–18%' },
      senior: { minUsd: 30_000, medianUsd: 50_000, maxUsd:  72_000, p90Usd:  62_400, localFormatted: '₹25–60L',   equityNote: 'ESOPs + refreshers', bonusNote: '15–20%' },
      staff:  { minUsd: 48_000, medianUsd: 80_000, maxUsd: 108_000, p90Usd:  96_000, localFormatted: '₹40–90L',   equityNote: 'Significant ESOPs', bonusNote: '20–25%' },
      exec:   { minUsd: 84_000, medianUsd:130_000, maxUsd: 180_000, p90Usd: 156_000, localFormatted: '₹70–150L',  equityNote: 'Large ESOP grants', bonusNote: '25–40%' },
    },
    us: {
      junior: { minUsd:100_000, medianUsd:130_000, maxUsd: 160_000, p90Usd: 150_000, localFormatted: '$100K–$160K', equityNote: 'RSUs at tech', bonusNote: '10–15%' },
      mid:    { minUsd:150_000, medianUsd:190_000, maxUsd: 240_000, p90Usd: 225_000, localFormatted: '$150K–$240K', equityNote: 'RSUs', bonusNote: '15–20%' },
      senior: { minUsd:210_000, medianUsd:275_000, maxUsd: 350_000, p90Usd: 320_000, localFormatted: '$210K–$350K', equityNote: 'Significant RSUs', bonusNote: '20–25%' },
      staff:  { minUsd:280_000, medianUsd:380_000, maxUsd: 480_000, p90Usd: 450_000, localFormatted: '$280K–$480K', equityNote: 'Large RSU grants', bonusNote: '20–30%' },
      exec:   { minUsd:400_000, medianUsd:580_000, maxUsd: 800_000, p90Usd: 730_000, localFormatted: '$400K–$800K', equityNote: 'Large grants + LTIP', bonusNote: '30–50%' },
    },
    uk: {
      junior: { minUsd: 56_000, medianUsd: 72_000, maxUsd: 100_000, p90Usd:  92_000, localFormatted: '£45K–£80K',   equityNote: 'EMI at startups', bonusNote: '8–12%' },
      mid:    { minUsd: 88_000, medianUsd:112_000, maxUsd: 150_000, p90Usd: 138_000, localFormatted: '£70K–£120K',  equityNote: 'EMI/RSUs', bonusNote: '12–18%' },
      senior: { minUsd:125_000, medianUsd:160_000, maxUsd: 213_000, p90Usd: 194_000, localFormatted: '£100K–£170K', equityNote: 'RSUs', bonusNote: '15–20%' },
      staff:  { minUsd:175_000, medianUsd:220_000, maxUsd: 300_000, p90Usd: 275_000, localFormatted: '£140K–£240K', equityNote: 'RSUs + LTIP', bonusNote: '20–30%' },
      exec:   { minUsd:250_000, medianUsd:330_000, maxUsd: 475_000, p90Usd: 425_000, localFormatted: '£200K–£380K', equityNote: 'LTIP', bonusNote: '30%+' },
    },
    sg: {
      junior: { minUsd: 45_000, medianUsd: 56_000, maxUsd:  75_000, p90Usd:  70_000, localFormatted: 'S$60K–S$100K',  equityNote: 'Options at startups', bonusNote: '8–12%' },
      mid:    { minUsd: 68_000, medianUsd: 88_000, maxUsd: 113_000, p90Usd: 104_000, localFormatted: 'S$90K–S$150K',  equityNote: 'RSUs at MNCs', bonusNote: '12–18%' },
      senior: { minUsd: 98_000, medianUsd:130_000, maxUsd: 165_000, p90Usd: 152_000, localFormatted: 'S$130K–S$220K', equityNote: 'RSUs', bonusNote: '15–20%' },
      staff:  { minUsd:135_000, medianUsd:180_000, maxUsd: 225_000, p90Usd: 208_000, localFormatted: 'S$180K–S$300K', equityNote: 'Significant grants', bonusNote: '20–25%' },
      exec:   { minUsd:188_000, medianUsd:255_000, maxUsd: 330_000, p90Usd: 304_000, localFormatted: 'S$250K–S$440K', equityNote: 'LTIP', bonusNote: '25–40%' },
    },
    default: { junior: { minUsd: 9_600, medianUsd: 14_400, maxUsd: 21_600, p90Usd: 19_200, localFormatted: 'Market rate varies', equityNote: 'ESOPs', bonusNote: '8–12%' }, mid: { minUsd: 18_000, medianUsd: 28_800, maxUsd: 42_000, p90Usd: 36_000, localFormatted: 'Market rate varies', equityNote: 'ESOPs', bonusNote: '12–18%' }, senior: { minUsd: 30_000, medianUsd: 50_000, maxUsd: 72_000, p90Usd: 62_400, localFormatted: 'Market rate varies', equityNote: 'ESOPs + refreshers', bonusNote: '15–20%' }, staff: { minUsd: 48_000, medianUsd: 80_000, maxUsd: 108_000, p90Usd: 96_000, localFormatted: 'Market rate varies', equityNote: 'Significant ESOPs', bonusNote: '20–25%' }, exec: { minUsd: 84_000, medianUsd: 130_000, maxUsd: 180_000, p90Usd: 156_000, localFormatted: 'Market rate varies', equityNote: 'Large grants', bonusNote: '25–40%' } },
  },

  // ── Marketing ────────────────────────────────────────────────────────────────
  mkt: {
    in: {
      junior: { minUsd:  4_800, medianUsd:  7_200, maxUsd:  12_000, p90Usd:  10_200, localFormatted: '₹4–10L',    equityNote: 'ESOPs at D2C startups', bonusNote: '8–12%' },
      mid:    { minUsd:  9_600, medianUsd: 16_000, maxUsd:  24_000, p90Usd:  21_000, localFormatted: '₹8–20L',    equityNote: 'ESOPs at growth-stage', bonusNote: '10–15%' },
      senior: { minUsd: 16_800, medianUsd: 28_000, maxUsd:  42_000, p90Usd:  36_000, localFormatted: '₹14–35L',   equityNote: 'ESOPs + refreshers', bonusNote: '12–18%' },
      staff:  { minUsd: 30_000, medianUsd: 50_000, maxUsd:  72_000, p90Usd:  62_400, localFormatted: '₹25–60L',   equityNote: 'Significant ESOPs', bonusNote: '15–20%' },
      exec:   { minUsd: 60_000, medianUsd: 96_000, maxUsd: 144_000, p90Usd: 126_000, localFormatted: '₹50–120L',  equityNote: 'Large ESOP grants', bonusNote: '20–30%' },
    },
    us: {
      junior: { minUsd: 55_000, medianUsd: 68_000, maxUsd:  85_000, p90Usd:  80_000, localFormatted: '$55K–$85K',   equityNote: 'RSUs at tech', bonusNote: '5–10%' },
      mid:    { minUsd: 85_000, medianUsd:108_000, maxUsd: 135_000, p90Usd: 124_000, localFormatted: '$85K–$135K',  equityNote: 'RSUs at growth', bonusNote: '10–15%' },
      senior: { minUsd:130_000, medianUsd:165_000, maxUsd: 200_000, p90Usd: 188_000, localFormatted: '$130K–$200K', equityNote: 'RSUs', bonusNote: '15–20%' },
      staff:  { minUsd:185_000, medianUsd:240_000, maxUsd: 300_000, p90Usd: 275_000, localFormatted: '$185K–$300K', equityNote: 'Significant RSUs', bonusNote: '20–30%' },
      exec:   { minUsd:280_000, medianUsd:430_000, maxUsd: 600_000, p90Usd: 550_000, localFormatted: '$280K–$600K', equityNote: 'LTIP at public co', bonusNote: '30–50%' },
    },
    uk: {
      junior: { minUsd: 35_000, medianUsd: 44_000, maxUsd:  56_000, p90Usd:  52_000, localFormatted: '£28K–£45K',   equityNote: 'EMI at startups', bonusNote: '5–10%' },
      mid:    { minUsd: 50_000, medianUsd: 66_000, maxUsd:  88_000, p90Usd:  80_000, localFormatted: '£40K–£70K',   equityNote: 'EMI/RSUs', bonusNote: '10–15%' },
      senior: { minUsd: 75_000, medianUsd:100_000, maxUsd: 131_000, p90Usd: 119_000, localFormatted: '£60K–£105K',  equityNote: 'RSUs', bonusNote: '12–18%' },
      staff:  { minUsd:113_000, medianUsd:150_000, maxUsd: 194_000, p90Usd: 175_000, localFormatted: '£90K–£155K',  equityNote: 'RSUs + LTIP', bonusNote: '15–25%' },
      exec:   { minUsd:175_000, medianUsd:250_000, maxUsd: 350_000, p90Usd: 313_000, localFormatted: '£140K–£280K', equityNote: 'LTIP', bonusNote: '25–40%' },
    },
    sg: {
      junior: { minUsd: 27_000, medianUsd: 34_000, maxUsd:  45_000, p90Usd:  42_000, localFormatted: 'S$36K–S$60K',   equityNote: 'Options at startups', bonusNote: '5–8%' },
      mid:    { minUsd: 41_000, medianUsd: 54_000, maxUsd:  71_000, p90Usd:  66_000, localFormatted: 'S$55K–S$95K',   equityNote: 'RSUs at MNCs', bonusNote: '8–12%' },
      senior: { minUsd: 60_000, medianUsd: 80_000, maxUsd: 105_000, p90Usd:  96_000, localFormatted: 'S$80K–S$140K',  equityNote: 'RSUs', bonusNote: '12–18%' },
      staff:  { minUsd: 90_000, medianUsd:116_000, maxUsd: 150_000, p90Usd: 138_000, localFormatted: 'S$120K–S$200K', equityNote: 'Significant grants', bonusNote: '15–20%' },
      exec:   { minUsd:135_000, medianUsd:180_000, maxUsd: 240_000, p90Usd: 220_000, localFormatted: 'S$180K–S$320K', equityNote: 'LTIP', bonusNote: '20–35%' },
    },
    default: { junior: { minUsd: 4_800, medianUsd: 7_200, maxUsd: 12_000, p90Usd: 10_200, localFormatted: 'Market rate varies', equityNote: 'ESOPs at D2C startups', bonusNote: '8–12%' }, mid: { minUsd: 9_600, medianUsd: 16_000, maxUsd: 24_000, p90Usd: 21_000, localFormatted: 'Market rate varies', equityNote: 'ESOPs', bonusNote: '10–15%' }, senior: { minUsd: 16_800, medianUsd: 28_000, maxUsd: 42_000, p90Usd: 36_000, localFormatted: 'Market rate varies', equityNote: 'ESOPs', bonusNote: '12–18%' }, staff: { minUsd: 30_000, medianUsd: 50_000, maxUsd: 72_000, p90Usd: 62_400, localFormatted: 'Market rate varies', equityNote: 'Significant ESOPs', bonusNote: '15–20%' }, exec: { minUsd: 60_000, medianUsd: 96_000, maxUsd: 144_000, p90Usd: 126_000, localFormatted: 'Market rate varies', equityNote: 'Large grants', bonusNote: '20–30%' } },
  },

  // ── Consulting ───────────────────────────────────────────────────────────────
  cons: {
    in: {
      junior: { minUsd:  9_600, medianUsd: 14_400, maxUsd:  21_600, p90Usd:  19_200, localFormatted: '₹8–18L',    equityNote: 'None at Big4; ESOPs at boutiques', bonusNote: '10–15%' },
      mid:    { minUsd: 18_000, medianUsd: 28_800, maxUsd:  42_000, p90Usd:  36_000, localFormatted: '₹15–35L',   equityNote: 'Performance shares at MBB', bonusNote: '15–20%' },
      senior: { minUsd: 30_000, medianUsd: 48_000, maxUsd:  66_000, p90Usd:  57_600, localFormatted: '₹25–55L',   equityNote: 'Partner-track profit share', bonusNote: '20–30%' },
      staff:  { minUsd: 48_000, medianUsd: 72_000, maxUsd:  96_000, p90Usd:  85_000, localFormatted: '₹40–80L',   equityNote: 'Partner profit share', bonusNote: '25–40%' },
      exec:   { minUsd: 96_000, medianUsd:160_000, maxUsd: 240_000, p90Usd: 210_000, localFormatted: '₹80–200L',  equityNote: 'Equity partner share', bonusNote: '40–80%' },
    },
    us: {
      junior: { minUsd: 80_000, medianUsd: 98_000, maxUsd: 120_000, p90Usd: 112_000, localFormatted: '$80K–$120K',  equityNote: 'None', bonusNote: '10–15%' },
      mid:    { minUsd:130_000, medianUsd:165_000, maxUsd: 200_000, p90Usd: 190_000, localFormatted: '$130K–$200K', equityNote: 'MBB carry', bonusNote: '15–25%' },
      senior: { minUsd:200_000, medianUsd:280_000, maxUsd: 350_000, p90Usd: 325_000, localFormatted: '$200K–$350K', equityNote: 'Profit sharing', bonusNote: '25–40%' },
      staff:  { minUsd:320_000, medianUsd:430_000, maxUsd: 550_000, p90Usd: 510_000, localFormatted: '$320K–$550K', equityNote: 'Partner carry', bonusNote: '40–60%' },
      exec:   { minUsd:500_000, medianUsd:900_000, maxUsd: 2_000_000, p90Usd: 1_500_000, localFormatted: '$500K–$2M+', equityNote: 'Equity partner share', bonusNote: '50–100%+' },
    },
    uk: {
      junior: { minUsd: 56_000, medianUsd: 70_000, maxUsd:  88_000, p90Usd:  82_000, localFormatted: '£45K–£70K',   equityNote: 'None', bonusNote: '10–15%' },
      mid:    { minUsd: 88_000, medianUsd:115_000, maxUsd: 150_000, p90Usd: 138_000, localFormatted: '£70K–£120K',  equityNote: 'MBB carry', bonusNote: '15–25%' },
      senior: { minUsd:150_000, medianUsd:200_000, maxUsd: 275_000, p90Usd: 250_000, localFormatted: '£120K–£220K', equityNote: 'Profit sharing', bonusNote: '25–40%' },
      staff:  { minUsd:250_000, medianUsd:340_000, maxUsd: 475_000, p90Usd: 425_000, localFormatted: '£200K–£380K', equityNote: 'Partner carry', bonusNote: '40–60%' },
      exec:   { minUsd:438_000, medianUsd:650_000, maxUsd: 1_130_000, p90Usd: 950_000, localFormatted: '£350K–£900K', equityNote: 'Equity partner share', bonusNote: '50–100%+' },
    },
    sg: {
      junior: { minUsd: 45_000, medianUsd: 60_000, maxUsd:  75_000, p90Usd:  70_000, localFormatted: 'S$60K–S$100K',  equityNote: 'None', bonusNote: '10–15%' },
      mid:    { minUsd: 71_000, medianUsd: 94_000, maxUsd: 120_000, p90Usd: 111_000, localFormatted: 'S$95K–S$160K',  equityNote: 'Performance shares', bonusNote: '15–25%' },
      senior: { minUsd:113_000, medianUsd:153_000, maxUsd: 195_000, p90Usd: 180_000, localFormatted: 'S$150K–S$260K', equityNote: 'Profit sharing', bonusNote: '20–35%' },
      staff:  { minUsd:180_000, medianUsd:247_000, maxUsd: 315_000, p90Usd: 292_000, localFormatted: 'S$240K–S$420K', equityNote: 'Partner carry', bonusNote: '30–50%' },
      exec:   { minUsd:300_000, medianUsd:450_000, maxUsd: 675_000, p90Usd: 600_000, localFormatted: 'S$400K–S$900K', equityNote: 'Equity partner share', bonusNote: '50–100%' },
    },
    default: { junior: { minUsd: 9_600, medianUsd: 14_400, maxUsd: 21_600, p90Usd: 19_200, localFormatted: 'Market rate varies', equityNote: 'None at Big4', bonusNote: '10–15%' }, mid: { minUsd: 18_000, medianUsd: 28_800, maxUsd: 42_000, p90Usd: 36_000, localFormatted: 'Market rate varies', equityNote: 'Performance shares', bonusNote: '15–20%' }, senior: { minUsd: 30_000, medianUsd: 48_000, maxUsd: 66_000, p90Usd: 57_600, localFormatted: 'Market rate varies', equityNote: 'Partner-track', bonusNote: '20–30%' }, staff: { minUsd: 48_000, medianUsd: 72_000, maxUsd: 96_000, p90Usd: 85_000, localFormatted: 'Market rate varies', equityNote: 'Partner share', bonusNote: '25–40%' }, exec: { minUsd: 96_000, medianUsd: 160_000, maxUsd: 240_000, p90Usd: 210_000, localFormatted: 'Market rate varies', equityNote: 'Equity share', bonusNote: '40–80%' } },
  },

  // ── Legal ─────────────────────────────────────────────────────────────────────
  legal: {
    in: {
      junior: { minUsd:  6_000, medianUsd:  9_600, maxUsd:  14_400, p90Usd:  12_600, localFormatted: '₹5–12L',    equityNote: 'None at law firms', bonusNote: '5–10%' },
      mid:    { minUsd: 12_000, medianUsd: 20_000, maxUsd:  30_000, p90Usd:  26_400, localFormatted: '₹10–25L',   equityNote: 'In-house ESOPs', bonusNote: '8–12%' },
      senior: { minUsd: 21_600, medianUsd: 36_000, maxUsd:  54_000, p90Usd:  46_800, localFormatted: '₹18–45L',   equityNote: 'Partner-track profit share', bonusNote: '10–20%' },
      staff:  { minUsd: 42_000, medianUsd: 68_000, maxUsd:  96_000, p90Usd:  84_000, localFormatted: '₹35–80L',   equityNote: 'Equity partner share', bonusNote: '20–40%' },
      exec:   { minUsd: 72_000, medianUsd:120_000, maxUsd: 180_000, p90Usd: 156_000, localFormatted: '₹60–150L',  equityNote: 'GC in-house ESOPs + LTI', bonusNote: '20–35%' },
    },
    us: {
      junior: { minUsd:130_000, medianUsd:165_000, maxUsd: 200_000, p90Usd: 190_000, localFormatted: '$130K–$200K', equityNote: 'None (BigLaw)', bonusNote: 'Class-year bonus ~$20K–$100K' },
      mid:    { minUsd:200_000, medianUsd:260_000, maxUsd: 320_000, p90Usd: 300_000, localFormatted: '$200K–$320K', equityNote: 'In-house RSUs', bonusNote: 'Lockstep + discretionary' },
      senior: { minUsd:350_000, medianUsd:480_000, maxUsd: 700_000, p90Usd: 630_000, localFormatted: '$350K–$700K', equityNote: 'Partner origination + carry', bonusNote: 'Origination-based' },
      staff:  { minUsd:500_000, medianUsd:800_000, maxUsd: 1_500_000, p90Usd: 1_200_000, localFormatted: '$500K–$1.5M', equityNote: 'Equity partner', bonusNote: 'Profit pool' },
      exec:   { minUsd:350_000, medianUsd:580_000, maxUsd: 900_000, p90Usd: 800_000, localFormatted: '$350K–$900K', equityNote: 'GC RSUs + LTI', bonusNote: '20–40%' },
    },
    uk: {
      junior: { minUsd: 75_000, medianUsd: 90_000, maxUsd: 113_000, p90Usd: 106_000, localFormatted: '£60K–£90K',   equityNote: 'None at firms', bonusNote: '5–10%' },
      mid:    { minUsd:113_000, medianUsd:140_000, maxUsd: 188_000, p90Usd: 172_000, localFormatted: '£90K–£150K',  equityNote: 'In-house RSUs', bonusNote: '10–20%' },
      senior: { minUsd:188_000, medianUsd:240_000, maxUsd: 350_000, p90Usd: 313_000, localFormatted: '£150K–£280K', equityNote: 'Partner profit share', bonusNote: '20–40%' },
      staff:  { minUsd:313_000, medianUsd:420_000, maxUsd: 625_000, p90Usd: 563_000, localFormatted: '£250K–£500K', equityNote: 'Equity partner', bonusNote: 'Profit pool' },
      exec:   { minUsd:438_000, medianUsd:630_000, maxUsd: 1_130_000, p90Usd: 950_000, localFormatted: '£350K–£900K', equityNote: 'GC LTIP', bonusNote: '20–40%' },
    },
    sg: {
      junior: { minUsd: 60_000, medianUsd: 76_000, maxUsd:  98_000, p90Usd:  90_000, localFormatted: 'S$80K–S$130K',  equityNote: 'None at firms', bonusNote: '5–10%' },
      mid:    { minUsd: 90_000, medianUsd:114_000, maxUsd: 150_000, p90Usd: 138_000, localFormatted: 'S$120K–S$200K', equityNote: 'In-house options', bonusNote: '10–15%' },
      senior: { minUsd:150_000, medianUsd:190_000, maxUsd: 255_000, p90Usd: 232_000, localFormatted: 'S$200K–S$340K', equityNote: 'Partner profit share', bonusNote: '15–30%' },
      staff:  { minUsd:225_000, medianUsd:300_000, maxUsd: 405_000, p90Usd: 368_000, localFormatted: 'S$300K–S$540K', equityNote: 'Equity partner', bonusNote: '25–40%' },
      exec:   { minUsd:338_000, medianUsd:450_000, maxUsd: 675_000, p90Usd: 600_000, localFormatted: 'S$450K–S$900K', equityNote: 'GC LTIP', bonusNote: '20–35%' },
    },
    default: { junior: { minUsd: 6_000, medianUsd: 9_600, maxUsd: 14_400, p90Usd: 12_600, localFormatted: 'Market rate varies', equityNote: 'None at firms', bonusNote: '5–10%' }, mid: { minUsd: 12_000, medianUsd: 20_000, maxUsd: 30_000, p90Usd: 26_400, localFormatted: 'Market rate varies', equityNote: 'In-house ESOPs', bonusNote: '8–12%' }, senior: { minUsd: 21_600, medianUsd: 36_000, maxUsd: 54_000, p90Usd: 46_800, localFormatted: 'Market rate varies', equityNote: 'Partner-track', bonusNote: '10–20%' }, staff: { minUsd: 42_000, medianUsd: 68_000, maxUsd: 96_000, p90Usd: 84_000, localFormatted: 'Market rate varies', equityNote: 'Equity partner', bonusNote: '20–40%' }, exec: { minUsd: 72_000, medianUsd: 120_000, maxUsd: 180_000, p90Usd: 156_000, localFormatted: 'Market rate varies', equityNote: 'GC LTI', bonusNote: '20–35%' } },
  },

  // ── Operations / Business Operations / COO Track ─────────────────────────────
  ops: {
    in: {
      junior: { minUsd:  3_600, medianUsd:  6_000, maxUsd:  9_600, p90Usd:  8_400, localFormatted: '₹3–8L',    equityNote: 'ESOPs at growth-stage startups', bonusNote: '8–15%' },
      mid:    { minUsd:  9_600, medianUsd: 16_000, maxUsd: 24_000, p90Usd: 21_000, localFormatted: '₹8–20L',   equityNote: 'ESOPs at mid-to-large cos', bonusNote: '10–18%' },
      senior: { minUsd: 21_600, medianUsd: 36_000, maxUsd: 60_000, p90Usd: 52_000, localFormatted: '₹18–50L',  equityNote: 'ESOPs + refreshers', bonusNote: '12–22%' },
      staff:  { minUsd: 48_000, medianUsd: 80_000, maxUsd:120_000, p90Usd:105_000, localFormatted: '₹40–100L', equityNote: 'ESOPs + LTI at large cos', bonusNote: '20–30%' },
      exec:   { minUsd: 84_000, medianUsd:140_000, maxUsd:240_000, p90Usd:210_000, localFormatted: '₹70–200L', equityNote: 'LTI grants + ESOPs', bonusNote: '25–40%' },
    },
    us: {
      junior: { minUsd: 55_000, medianUsd: 72_000, maxUsd: 90_000, p90Usd:  84_000, localFormatted: '$55K–$90K',   equityNote: 'None typically', bonusNote: '5–10%' },
      mid:    { minUsd: 80_000, medianUsd:105_000, maxUsd:135_000, p90Usd: 124_000, localFormatted: '$80K–$135K',  equityNote: 'RSUs at tech/growth', bonusNote: '10–15%' },
      senior: { minUsd:120_000, medianUsd:160_000, maxUsd:210_000, p90Usd: 192_000, localFormatted: '$120K–$210K', equityNote: 'RSUs at tech companies', bonusNote: '12–20%' },
      staff:  { minUsd:180_000, medianUsd:245_000, maxUsd:340_000, p90Usd: 310_000, localFormatted: '$180K–$340K', equityNote: 'Significant RSUs', bonusNote: '20–30%' },
      exec:   { minUsd:280_000, medianUsd:400_000, maxUsd:600_000, p90Usd: 540_000, localFormatted: '$280K–$600K', equityNote: 'LTI + RSU grants', bonusNote: '30–50%' },
    },
    uk: {
      junior: { minUsd: 35_560, medianUsd: 47_000, maxUsd: 63_500, p90Usd:  58_000, localFormatted: '£28K–£50K',   equityNote: 'None typically', bonusNote: '5–10%' },
      mid:    { minUsd: 57_150, medianUsd: 75_000, maxUsd:101_600, p90Usd:  94_000, localFormatted: '£45K–£80K',   equityNote: 'EMI at startups', bonusNote: '10–15%' },
      senior: { minUsd: 88_900, medianUsd:118_000, maxUsd:177_800, p90Usd: 164_000, localFormatted: '£70K–£140K',  equityNote: 'EMI/RSUs', bonusNote: '12–18%' },
      staff:  { minUsd:146_050, medianUsd:195_000, maxUsd:304_800, p90Usd: 278_000, localFormatted: '£115K–£240K', equityNote: 'RSUs + LTIP', bonusNote: '20–30%' },
      exec:   { minUsd:234_950, medianUsd:310_000, maxUsd:508_000, p90Usd: 457_000, localFormatted: '£185K–£400K', equityNote: 'LTIP + RSUs', bonusNote: '30–45%' },
    },
    sg: {
      junior: { minUsd: 37_500, medianUsd: 50_000, maxUsd: 63_750, p90Usd:  59_000, localFormatted: 'S$50K–S$85K',   equityNote: 'Options at startups', bonusNote: '5–10%' },
      mid:    { minUsd: 56_250, medianUsd: 76_000, maxUsd: 97_500, p90Usd:  90_000, localFormatted: 'S$75K–S$130K',  equityNote: 'RSUs at MNCs', bonusNote: '10–15%' },
      senior: { minUsd: 86_250, medianUsd:114_000, maxUsd:146_250, p90Usd: 135_000, localFormatted: 'S$115K–S$195K', equityNote: 'RSUs', bonusNote: '12–20%' },
      staff:  { minUsd:131_250, medianUsd:172_000, maxUsd:232_500, p90Usd: 213_000, localFormatted: 'S$175K–S$310K', equityNote: 'RSUs + grants', bonusNote: '20–30%' },
      exec:   { minUsd:202_500, medianUsd:270_000, maxUsd:360_000, p90Usd: 330_000, localFormatted: 'S$270K–S$480K', equityNote: 'LTIP', bonusNote: '30%+' },
    },
    default: { junior: { minUsd: 4_800, medianUsd: 8_400, maxUsd: 13_200, p90Usd: 11_400, localFormatted: 'Market rate varies', equityNote: 'ESOPs if startup', bonusNote: '8–15%' }, mid: { minUsd: 9_600, medianUsd: 16_800, maxUsd: 26_400, p90Usd: 22_800, localFormatted: 'Market rate varies', equityNote: 'ESOPs', bonusNote: '10–18%' }, senior: { minUsd: 21_600, medianUsd: 36_000, maxUsd: 60_000, p90Usd: 52_000, localFormatted: 'Market rate varies', equityNote: 'ESOPs + refreshers', bonusNote: '12–22%' }, staff: { minUsd: 42_000, medianUsd: 72_000, maxUsd: 108_000, p90Usd: 94_000, localFormatted: 'Market rate varies', equityNote: 'ESOPs + LTI', bonusNote: '20–30%' }, exec: { minUsd: 72_000, medianUsd: 120_000, maxUsd: 192_000, p90Usd: 168_000, localFormatted: 'Market rate varies', equityNote: 'LTI grants', bonusNote: '25–40%' } },
  },

  // ── Industrial / Manufacturing Engineering ───────────────────────────────────
  ind: {
    in: {
      junior: { minUsd:  3_600, medianUsd:  5_400, maxUsd:  8_400, p90Usd:  7_200, localFormatted: '₹3–7L',    equityNote: 'None at most industrial cos', bonusNote: '8–12%' },
      mid:    { minUsd:  8_400, medianUsd: 14_400, maxUsd: 21_600, p90Usd: 18_600, localFormatted: '₹7–18L',   equityNote: 'ESOPs at PLI/EV startups', bonusNote: '10–15%' },
      senior: { minUsd: 18_000, medianUsd: 30_000, maxUsd: 48_000, p90Usd: 41_000, localFormatted: '₹15–40L',  equityNote: 'ESOPs at large manufacturing cos', bonusNote: '12–18%' },
      staff:  { minUsd: 42_000, medianUsd: 65_000, maxUsd: 96_000, p90Usd: 84_000, localFormatted: '₹35–80L',  equityNote: 'LTI + ESOPs at top cos', bonusNote: '18–28%' },
      exec:   { minUsd: 72_000, medianUsd:120_000, maxUsd:180_000, p90Usd:156_000, localFormatted: '₹60–150L', equityNote: 'LTI + ESOPs at conglomerates', bonusNote: '25–40%' },
    },
    us: {
      junior: { minUsd: 55_000, medianUsd: 70_000, maxUsd: 88_000, p90Usd:  82_000, localFormatted: '$55K–$88K',   equityNote: 'None typically', bonusNote: '5–8%' },
      mid:    { minUsd: 75_000, medianUsd: 98_000, maxUsd:128_000, p90Usd: 118_000, localFormatted: '$75K–$128K',  equityNote: 'RSUs at defense/aerospace', bonusNote: '8–12%' },
      senior: { minUsd:110_000, medianUsd:148_000, maxUsd:190_000, p90Usd: 175_000, localFormatted: '$110K–$190K', equityNote: 'RSUs at tech manufacturing', bonusNote: '10–15%' },
      staff:  { minUsd:160_000, medianUsd:215_000, maxUsd:285_000, p90Usd: 262_000, localFormatted: '$160K–$285K', equityNote: 'RSUs + LTIP', bonusNote: '15–22%' },
      exec:   { minUsd:250_000, medianUsd:340_000, maxUsd:480_000, p90Usd: 435_000, localFormatted: '$250K–$480K', equityNote: 'LTI + RSU grants', bonusNote: '25–40%' },
    },
    uk: {
      junior: { minUsd: 33_020, medianUsd: 42_000, maxUsd: 57_150, p90Usd:  52_000, localFormatted: '£26K–£45K',   equityNote: 'None typically', bonusNote: '5–8%' },
      mid:    { minUsd: 50_800, medianUsd: 66_000, maxUsd: 88_900, p90Usd:  81_000, localFormatted: '£40K–£70K',   equityNote: 'LTIP at large cos', bonusNote: '8–12%' },
      senior: { minUsd: 82_550, medianUsd:108_000, maxUsd:139_700, p90Usd: 128_000, localFormatted: '£65K–£110K',  equityNote: 'LTIP + shares', bonusNote: '10–15%' },
      staff:  { minUsd:127_000, medianUsd:168_000, maxUsd:234_950, p90Usd: 213_000, localFormatted: '£100K–£185K', equityNote: 'RSUs + LTIP', bonusNote: '15–22%' },
      exec:   { minUsd:203_200, medianUsd:267_000, maxUsd:381_000, p90Usd: 342_000, localFormatted: '£160K–£300K', equityNote: 'LTIP', bonusNote: '25–35%' },
    },
    sg: {
      junior: { minUsd: 26_250, medianUsd: 35_000, maxUsd: 48_750, p90Usd:  44_000, localFormatted: 'S$35K–S$65K',   equityNote: 'None typically', bonusNote: '5–8%' },
      mid:    { minUsd: 45_000, medianUsd: 60_000, maxUsd: 82_500, p90Usd:  75_000, localFormatted: 'S$60K–S$110K',  equityNote: 'Shares at MNCs', bonusNote: '8–12%' },
      senior: { minUsd: 71_250, medianUsd: 95_000, maxUsd:131_250, p90Usd: 120_000, localFormatted: 'S$95K–S$175K',  equityNote: 'RSUs at MNCs', bonusNote: '10–15%' },
      staff:  { minUsd:108_750, medianUsd:143_000, maxUsd:206_250, p90Usd: 187_000, localFormatted: 'S$145K–S$275K', equityNote: 'RSUs + LTIP', bonusNote: '15–20%' },
      exec:   { minUsd:168_750, medianUsd:225_000, maxUsd:337_500, p90Usd: 300_000, localFormatted: 'S$225K–S$450K', equityNote: 'LTIP', bonusNote: '25–35%' },
    },
    default: { junior: { minUsd: 3_600, medianUsd: 6_000, maxUsd: 9_600, p90Usd: 8_400, localFormatted: 'Market rate varies', equityNote: 'None at most industrial cos', bonusNote: '8–12%' }, mid: { minUsd: 8_400, medianUsd: 14_400, maxUsd: 21_600, p90Usd: 18_600, localFormatted: 'Market rate varies', equityNote: 'ESOPs if startup', bonusNote: '10–15%' }, senior: { minUsd: 18_000, medianUsd: 30_000, maxUsd: 48_000, p90Usd: 41_000, localFormatted: 'Market rate varies', equityNote: 'ESOPs at large cos', bonusNote: '12–18%' }, staff: { minUsd: 42_000, medianUsd: 65_000, maxUsd: 96_000, p90Usd: 84_000, localFormatted: 'Market rate varies', equityNote: 'LTI', bonusNote: '18–28%' }, exec: { minUsd: 72_000, medianUsd: 120_000, maxUsd: 180_000, p90Usd: 156_000, localFormatted: 'Market rate varies', equityNote: 'LTI', bonusNote: '25–40%' } },
  },

  // ── BPO / CX / Contact Centre / GCC ──────────────────────────────────────────
  bpo: {
    in: {
      junior: { minUsd:  3_012, medianUsd:  4_819, maxUsd:  7_229, p90Usd:  6_325, localFormatted: '₹2.5–6L',  equityNote: 'None at BPO firms', bonusNote: '5–10%' },
      mid:    { minUsd:  7_229, medianUsd: 12_048, maxUsd: 16_867, p90Usd: 14_699, localFormatted: '₹6–14L',   equityNote: 'ESOPs at analytics-led BPOs', bonusNote: '8–12%' },
      senior: { minUsd: 14_458, medianUsd: 24_096, maxUsd: 33_735, p90Usd: 28_916, localFormatted: '₹12–28L',  equityNote: 'ESOPs at GCC/analytics BPOs', bonusNote: '10–15%' },
      staff:  { minUsd: 30_120, medianUsd: 48_193, maxUsd: 72_289, p90Usd: 63_253, localFormatted: '₹25–60L',  equityNote: 'ESOPs + LTI at GCCs', bonusNote: '15–22%' },
      exec:   { minUsd: 54_217, medianUsd: 90_361, maxUsd:144_578, p90Usd:126_506, localFormatted: '₹45–120L', equityNote: 'LTI + ESOPs at large BPOs', bonusNote: '20–35%' },
    },
    us: {
      junior: { minUsd: 35_000, medianUsd: 46_000, maxUsd: 58_000, p90Usd:  54_000, localFormatted: '$35K–$58K',   equityNote: 'None typically', bonusNote: '3–5%' },
      mid:    { minUsd: 55_000, medianUsd: 72_000, maxUsd: 92_000, p90Usd:  85_000, localFormatted: '$55K–$92K',   equityNote: 'RSUs at tech-adjacent CX', bonusNote: '5–10%' },
      senior: { minUsd: 80_000, medianUsd:105_000, maxUsd:135_000, p90Usd: 124_000, localFormatted: '$80K–$135K',  equityNote: 'RSUs at tech/CX platforms', bonusNote: '8–12%' },
      staff:  { minUsd:120_000, medianUsd:163_000, maxUsd:210_000, p90Usd: 192_000, localFormatted: '$120K–$210K', equityNote: 'RSUs + LTIP', bonusNote: '12–18%' },
      exec:   { minUsd:180_000, medianUsd:248_000, maxUsd:350_000, p90Usd: 315_000, localFormatted: '$180K–$350K', equityNote: 'LTIP + RSU grants', bonusNote: '20–30%' },
    },
    uk: {
      junior: { minUsd: 25_400, medianUsd: 32_000, maxUsd: 44_450, p90Usd:  40_000, localFormatted: '£20K–£35K',   equityNote: 'None', bonusNote: '3–5%' },
      mid:    { minUsd: 40_640, medianUsd: 52_000, maxUsd: 69_850, p90Usd:  63_000, localFormatted: '£32K–£55K',   equityNote: 'EMI at startups', bonusNote: '5–8%' },
      senior: { minUsd: 63_500, medianUsd: 82_000, maxUsd:101_600, p90Usd:  94_000, localFormatted: '£50K–£80K',   equityNote: 'EMI/RSUs', bonusNote: '8–12%' },
      staff:  { minUsd: 95_250, medianUsd:124_000, maxUsd:165_100, p90Usd: 150_000, localFormatted: '£75K–£130K',  equityNote: 'RSUs + LTIP', bonusNote: '12–18%' },
      exec:   { minUsd:139_700, medianUsd:184_000, maxUsd:279_400, p90Usd: 247_000, localFormatted: '£110K–£220K', equityNote: 'LTIP', bonusNote: '20–30%' },
    },
    sg: {
      junior: { minUsd: 21_000, medianUsd: 28_500, maxUsd: 36_000, p90Usd:  33_000, localFormatted: 'S$28K–S$48K',   equityNote: 'None', bonusNote: '3–5%' },
      mid:    { minUsd: 33_750, medianUsd: 45_000, maxUsd: 58_500, p90Usd:  54_000, localFormatted: 'S$45K–S$78K',   equityNote: 'Options at CX platforms', bonusNote: '5–8%' },
      senior: { minUsd: 52_500, medianUsd: 70_000, maxUsd: 86_250, p90Usd:  79_000, localFormatted: 'S$70K–S$115K',  equityNote: 'RSUs at MNCs', bonusNote: '8–12%' },
      staff:  { minUsd: 82_500, medianUsd:109_000, maxUsd:138_750, p90Usd: 127_000, localFormatted: 'S$110K–S$185K', equityNote: 'RSUs + grants', bonusNote: '12–18%' },
      exec:   { minUsd:120_000, medianUsd:161_000, maxUsd:225_000, p90Usd: 202_000, localFormatted: 'S$160K–S$300K', equityNote: 'LTIP', bonusNote: '20–30%' },
    },
    default: { junior: { minUsd: 3_012, medianUsd: 4_819, maxUsd: 7_229, p90Usd: 6_325, localFormatted: 'Market rate varies', equityNote: 'None at BPO firms', bonusNote: '5–10%' }, mid: { minUsd: 7_229, medianUsd: 12_048, maxUsd: 16_867, p90Usd: 14_699, localFormatted: 'Market rate varies', equityNote: 'ESOPs at analytics BPOs', bonusNote: '8–12%' }, senior: { minUsd: 14_458, medianUsd: 24_096, maxUsd: 33_735, p90Usd: 28_916, localFormatted: 'Market rate varies', equityNote: 'ESOPs', bonusNote: '10–15%' }, staff: { minUsd: 30_120, medianUsd: 48_193, maxUsd: 72_289, p90Usd: 63_253, localFormatted: 'Market rate varies', equityNote: 'LTI', bonusNote: '15–22%' }, exec: { minUsd: 54_217, medianUsd: 90_361, maxUsd: 144_578, p90Usd: 126_506, localFormatted: 'Market rate varies', equityNote: 'LTI', bonusNote: '20–35%' } },
  },

  // ── UX / Product / Visual Design ─────────────────────────────────────────────
  design: {
    in: {
      junior: { minUsd:  4_819, medianUsd:  8_434, maxUsd: 12_048, p90Usd: 10_602, localFormatted: '₹4–10L',    equityNote: 'ESOPs at product startups', bonusNote: '8–12%' },
      mid:    { minUsd: 12_048, medianUsd: 20_482, maxUsd: 30_120, p90Usd: 26_145, localFormatted: '₹10–25L',   equityNote: 'ESOPs at product cos', bonusNote: '10–15%' },
      senior: { minUsd: 26_506, medianUsd: 42_169, maxUsd: 66_265, p90Usd: 57_831, localFormatted: '₹22–55L',   equityNote: 'ESOPs + refreshers at top product cos', bonusNote: '12–18%' },
      staff:  { minUsd: 54_217, medianUsd: 84_337, maxUsd:120_482, p90Usd:105_422, localFormatted: '₹45–100L',  equityNote: 'Significant ESOPs + LTI', bonusNote: '18–25%' },
      exec:   { minUsd: 96_386, medianUsd:144_578, maxUsd:216_867, p90Usd:187_952, localFormatted: '₹80–180L',  equityNote: 'Large LTI grants', bonusNote: '22–35%' },
    },
    us: {
      junior: { minUsd: 70_000, medianUsd: 90_000, maxUsd:112_000, p90Usd: 104_000, localFormatted: '$70K–$112K',  equityNote: 'RSUs at tech', bonusNote: '5–10%' },
      mid:    { minUsd:100_000, medianUsd:128_000, maxUsd:162_000, p90Usd: 150_000, localFormatted: '$100K–$162K', equityNote: 'RSUs at tech/product cos', bonusNote: '8–12%' },
      senior: { minUsd:145_000, medianUsd:188_000, maxUsd:242_000, p90Usd: 224_000, localFormatted: '$145K–$242K', equityNote: 'RSUs + refreshers at top tech', bonusNote: '10–15%' },
      staff:  { minUsd:210_000, medianUsd:280_000, maxUsd:380_000, p90Usd: 350_000, localFormatted: '$210K–$380K', equityNote: 'Significant RSUs', bonusNote: '15–22%' },
      exec:   { minUsd:310_000, medianUsd:420_000, maxUsd:600_000, p90Usd: 550_000, localFormatted: '$310K–$600K', equityNote: 'LTIP + RSU grants', bonusNote: '25–40%' },
    },
    uk: {
      junior: { minUsd: 38_100, medianUsd: 50_800, maxUsd: 69_850, p90Usd:  63_500, localFormatted: '£30K–£55K',   equityNote: 'EMI at startups', bonusNote: '5–8%' },
      mid:    { minUsd: 63_500, medianUsd: 82_550, maxUsd:107_950, p90Usd:  98_600, localFormatted: '£50K–£85K',   equityNote: 'EMI/RSUs', bonusNote: '8–12%' },
      senior: { minUsd:101_600, medianUsd:133_350, maxUsd:177_800, p90Usd: 164_100, localFormatted: '£80K–£140K',  equityNote: 'RSUs', bonusNote: '10–15%' },
      staff:  { minUsd:165_100, medianUsd:215_900, maxUsd:292_100, p90Usd: 265_700, localFormatted: '£130K–£230K', equityNote: 'RSUs + LTIP', bonusNote: '15–22%' },
      exec:   { minUsd:241_300, medianUsd:317_500, maxUsd:482_600, p90Usd: 431_800, localFormatted: '£190K–£380K', equityNote: 'LTIP', bonusNote: '25–35%' },
    },
    sg: {
      junior: { minUsd: 33_750, medianUsd: 45_000, maxUsd: 56_250, p90Usd:  52_500, localFormatted: 'S$45K–S$75K',   equityNote: 'Options at product startups', bonusNote: '5–8%' },
      mid:    { minUsd: 52_500, medianUsd: 70_000, maxUsd: 86_250, p90Usd:  80_000, localFormatted: 'S$70K–S$115K',  equityNote: 'RSUs at product cos', bonusNote: '8–12%' },
      senior: { minUsd: 82_500, medianUsd:109_000, maxUsd:138_750, p90Usd: 128_000, localFormatted: 'S$110K–S$185K', equityNote: 'RSUs + refreshers', bonusNote: '10–15%' },
      staff:  { minUsd:123_750, medianUsd:165_000, maxUsd:210_000, p90Usd: 195_000, localFormatted: 'S$165K–S$280K', equityNote: 'Significant RSUs', bonusNote: '15–20%' },
      exec:   { minUsd:180_000, medianUsd:247_500, maxUsd:322_500, p90Usd: 300_000, localFormatted: 'S$240K–S$430K', equityNote: 'LTIP', bonusNote: '25–35%' },
    },
    default: { junior: { minUsd: 4_819, medianUsd: 8_434, maxUsd: 12_048, p90Usd: 10_602, localFormatted: 'Market rate varies', equityNote: 'ESOPs at product startups', bonusNote: '8–12%' }, mid: { minUsd: 12_048, medianUsd: 20_482, maxUsd: 30_120, p90Usd: 26_145, localFormatted: 'Market rate varies', equityNote: 'ESOPs', bonusNote: '10–15%' }, senior: { minUsd: 26_506, medianUsd: 42_169, maxUsd: 66_265, p90Usd: 57_831, localFormatted: 'Market rate varies', equityNote: 'ESOPs + refreshers', bonusNote: '12–18%' }, staff: { minUsd: 54_217, medianUsd: 84_337, maxUsd: 120_482, p90Usd: 105_422, localFormatted: 'Market rate varies', equityNote: 'Significant ESOPs + LTI', bonusNote: '18–25%' }, exec: { minUsd: 96_386, medianUsd: 144_578, maxUsd: 216_867, p90Usd: 187_952, localFormatted: 'Market rate varies', equityNote: 'Large LTI grants', bonusNote: '22–35%' } },
  },
};

// Default fallback for unmapped role × region combos
const DEFAULT_SALARY_FALLBACK: Record<RegionKey, Record<SeniorityKey, SalaryBenchmark>> = {
  in:      { junior: { minUsd: 7_200, medianUsd: 12_000, maxUsd: 20_000, p90Usd: 17_000, localFormatted: '₹6–16L',    equityNote: 'ESOPs at growth-stage', bonusNote: '10–15%' }, mid: { minUsd: 14_400, medianUsd: 24_000, maxUsd: 42_000, p90Usd: 36_000, localFormatted: '₹12–35L',   equityNote: 'ESOPs', bonusNote: '10–20%' }, senior: { minUsd: 28_000, medianUsd: 48_000, maxUsd: 84_000, p90Usd: 72_000, localFormatted: '₹23–70L',   equityNote: 'ESOPs + refreshers', bonusNote: '15–25%' }, staff: { minUsd: 48_000, medianUsd: 84_000, maxUsd: 144_000, p90Usd: 120_000, localFormatted: '₹40–120L',  equityNote: 'Significant ESOPs', bonusNote: '20–30%' }, exec: { minUsd: 84_000, medianUsd: 144_000, maxUsd: 240_000, p90Usd: 200_000, localFormatted: '₹70–200L+', equityNote: 'Large grants', bonusNote: '25–40%' } },
  us:      { junior: { minUsd: 80_000, medianUsd:105_000, maxUsd: 140_000, p90Usd: 130_000, localFormatted: '$80K–$140K',  equityNote: 'RSUs at FAANG/growth', bonusNote: '5–15%' }, mid: { minUsd: 120_000, medianUsd:160_000, maxUsd: 220_000, p90Usd: 200_000, localFormatted: '$120K–$220K', equityNote: 'RSUs', bonusNote: '10–20%' }, senior: { minUsd: 165_000, medianUsd:220_000, maxUsd: 320_000, p90Usd: 290_000, localFormatted: '$165K–$320K', equityNote: 'RSUs + refreshers', bonusNote: '15–25%' }, staff: { minUsd: 220_000, medianUsd:305_000, maxUsd: 460_000, p90Usd: 410_000, localFormatted: '$220K–$460K', equityNote: 'Significant RSUs', bonusNote: '20–30%' }, exec: { minUsd: 300_000, medianUsd:450_000, maxUsd: 800_000, p90Usd: 700_000, localFormatted: '$300K–$800K', equityNote: 'Large grants + LTIP', bonusNote: '30–50%' } },
  uk:      { junior: { minUsd: 42_000, medianUsd: 56_000, maxUsd:  80_000, p90Usd:  72_000, localFormatted: '£34K–£64K',   equityNote: 'EMI at startups', bonusNote: '5–10%' }, mid: { minUsd: 64_000, medianUsd: 86_000, maxUsd: 126_000, p90Usd: 114_000, localFormatted: '£51K–£101K',  equityNote: 'EMI/RSUs', bonusNote: '10–15%' }, senior: { minUsd: 92_000, medianUsd:125_000, maxUsd: 180_000, p90Usd: 162_000, localFormatted: '£74K–£144K',  equityNote: 'RSUs', bonusNote: '15–20%' }, staff: { minUsd: 128_000, medianUsd:172_000, maxUsd: 252_000, p90Usd: 225_000, localFormatted: '£102K–£202K', equityNote: 'RSUs + LTIP', bonusNote: '20–30%' }, exec: { minUsd: 175_000, medianUsd:240_000, maxUsd: 390_000, p90Usd: 340_000, localFormatted: '£140K–£312K', equityNote: 'LTIP', bonusNote: '30%+' } },
  sg:      { junior: { minUsd: 36_000, medianUsd: 48_000, maxUsd:  70_000, p90Usd:  64_000, localFormatted: 'S$48K–S$93K',  equityNote: 'Options at startups', bonusNote: '5–10%' }, mid: { minUsd: 56_000, medianUsd: 78_000, maxUsd: 115_000, p90Usd: 104_000, localFormatted: 'S$75K–S$153K',  equityNote: 'RSUs at MNCs', bonusNote: '10–15%' }, senior: { minUsd: 84_000, medianUsd:116_000, maxUsd: 168_000, p90Usd: 152_000, localFormatted: 'S$112K–S$224K', equityNote: 'RSUs + refreshers', bonusNote: '15–20%' }, staff: { minUsd: 116_000, medianUsd:160_000, maxUsd: 232_000, p90Usd: 208_000, localFormatted: 'S$155K–S$309K', equityNote: 'Significant grants', bonusNote: '20–30%' }, exec: { minUsd: 160_000, medianUsd:225_000, maxUsd: 360_000, p90Usd: 320_000, localFormatted: 'S$213K–S$480K', equityNote: 'LTIP', bonusNote: '30%+' } },
  default: { junior: { minUsd: 7_200, medianUsd: 12_000, maxUsd: 20_000, p90Usd: 17_000, localFormatted: 'Market rate varies', equityNote: 'Varies', bonusNote: 'Varies' }, mid: { minUsd: 14_400, medianUsd: 24_000, maxUsd: 42_000, p90Usd: 36_000, localFormatted: 'Market rate varies', equityNote: 'Varies', bonusNote: 'Varies' }, senior: { minUsd: 28_000, medianUsd: 48_000, maxUsd: 84_000, p90Usd: 72_000, localFormatted: 'Market rate varies', equityNote: 'Varies', bonusNote: 'Varies' }, staff: { minUsd: 48_000, medianUsd: 84_000, maxUsd: 144_000, p90Usd: 120_000, localFormatted: 'Market rate varies', equityNote: 'Varies', bonusNote: 'Varies' }, exec: { minUsd: 84_000, medianUsd: 144_000, maxUsd: 240_000, p90Usd: 200_000, localFormatted: 'Market rate varies', equityNote: 'Varies', bonusNote: 'Varies' } },
};

/** Get calibrated salary benchmark for a role prefix × region × seniority combination. */
export function getCompensationBenchmark(
  rolePrefix: string,
  region: string,
  seniority: string,
): SalaryBenchmark {
  const regionKey = (region ?? 'default').toLowerCase().slice(0, 2) as RegionKey;
  const senKey = (seniority ?? 'mid') as SeniorityKey;
  const validSeniorities: SeniorityKey[] = ['junior', 'mid', 'senior', 'staff', 'exec'];
  const normSen: SeniorityKey = validSeniorities.includes(senKey) ? senKey : 'mid';
  const validRegions: RegionKey[] = ['in', 'us', 'uk', 'sg', 'default'];
  const normRegion: RegionKey = validRegions.includes(regionKey) ? regionKey : 'default';

  const roleBenchmarks = SALARY_BENCHMARKS[rolePrefix];
  if (roleBenchmarks) {
    const regionBenchmarks = roleBenchmarks[normRegion] ?? roleBenchmarks['default'];
    if (regionBenchmarks) return regionBenchmarks[normSen];
  }
  return DEFAULT_SALARY_FALLBACK[normRegion][normSen];
}

// ── Hiring Probability Matrix ─────────────────────────────────────────────────
// role prefix × company type × seniority → hiring probability (0–1)
// Reflects how likely a candidate of that profile is to receive an offer
// from a company of that type in a normal market cycle.
// Sources: LinkedIn Talent Insights, recruiter aggregate data Q1 2026

export interface HiringProbabilityResult {
  probability: number;         // 0–1
  probabilityLabel: string;    // 'Very High' | 'High' | 'Moderate' | 'Low' | 'Very Low'
  rationale: string;
  keyEnablers: string[];       // actions that increase probability
  keyBarriers: string[];       // factors that reduce probability
  estimatedTimeToOfferWeeks: number;
}

type CompanyTypeKey = 'startup' | 'mid' | 'large' | 'mega';

/** Role × company_type probability coefficients (0–1). Multiplied together with seniority adjustment. */
const HIRING_PROB_BASE: Record<string, Record<CompanyTypeKey, number>> = {
  sw:      { startup: 0.72, mid: 0.62, large: 0.52, mega: 0.38 },
  ds:      { startup: 0.68, mid: 0.60, large: 0.50, mega: 0.36 },
  pm:      { startup: 0.60, mid: 0.55, large: 0.44, mega: 0.30 },
  fin:     { startup: 0.52, mid: 0.58, large: 0.55, mega: 0.45 },
  hc:      { startup: 0.65, mid: 0.70, large: 0.62, mega: 0.50 },
  legal:   { startup: 0.45, mid: 0.50, large: 0.48, mega: 0.42 },
  mkt:     { startup: 0.65, mid: 0.58, large: 0.48, mega: 0.35 },
  ops:     { startup: 0.55, mid: 0.60, large: 0.55, mega: 0.44 },
  cons:    { startup: 0.50, mid: 0.52, large: 0.56, mega: 0.48 },
  ind:     { startup: 0.52, mid: 0.62, large: 0.60, mega: 0.50 },
  bpo:     { startup: 0.58, mid: 0.65, large: 0.60, mega: 0.52 },
  design:  { startup: 0.68, mid: 0.58, large: 0.48, mega: 0.34 },
  default: { startup: 0.58, mid: 0.58, large: 0.52, mega: 0.40 },
};

const SENIORITY_PROB_MODIFIER: Record<SeniorityKey, number> = {
  junior: 1.20,
  mid:    1.00,
  senior: 0.88,
  staff:  0.72,
  exec:   0.55,
};

/** Role-specific primary hiring enabler — the single most impactful action for this role family. */
const ROLE_HIRING_ENABLER: Record<string, string> = {
  sw:     'GitHub profile with active contributions significantly increases engineering recruiter response rates — ensure pinned repos showcase production-quality work',
  ds:     'Public portfolio (Kaggle/GitHub) with business-framed projects increases DS recruiter contacts by 5× — frame every project around the business question answered, not the technique used',
  pm:     'Product portfolio with outcome metrics (not task lists) produces 4× more interview invites — "Grew MAU 40%" beats "Managed roadmap" every time',
  fin:    'CFA/CA designation + a prepared deal log increase finance recruiter callbacks by 3× — have a 1-page deal sheet ready to share immediately on request',
  hc:     'Clinical specialists on HealthTech + specialty clinical job boards receive 3× more relevant contacts vs LinkedIn-only — register on Practo Jobs, Doximity, and specialty boards',
  legal:  '70% of in-house legal roles are filled through specialist recruiters — register with Michael Page Legal, Mancer, and ABC Legal before applying direct',
  mkt:    'Campaign metrics portfolio (CTR/ROAS/CAC data) on LinkedIn increases marketing recruiter contacts by 60% — quantify every campaign you have ever run',
  ops:    'Documented process improvement metrics (cost%, throughput%, error rate%) increase ops callback rate by 2.5× — put 3 specific impact numbers on your CV before applying',
  cons:   'Alumni network + clear "exit from consulting" narrative accelerates industry offers by 6 weeks — prepare a 30-second answer to "why are you leaving consulting?"',
  ind:    '60% of industrial roles are filled through specialist recruiters — register with CIEL HR Manufacturing, Talentiser, and Randstad Engineering before applying direct',
  bpo:    'Reframe as "analytics-led CX" with RPA certification — unlocks 40% higher-paying roles vs standard BPO profile; add UiPath or Automation Anywhere cert to LinkedIn immediately',
  design: 'Outcome-focused portfolio case studies (problem → decision → metric) produce 4× more design interview invites — rewrite your case studies to lead with the business outcome',
};

/** Role-specific primary hiring barrier — the screening trap most likely to derail this role family. */
const ROLE_HIRING_BARRIER: Record<string, string> = {
  sw:     'Generic tech stack descriptions without version numbers and scale context are filtered by ATS at senior companies — replace "Python developer" with "Python 3.11, FastAPI, 10M req/day"',
  ds:     'Notebook-only profile without deployment experience screens out at 65% of senior DS roles — add at least one end-to-end deployed model to your portfolio',
  pm:     'Role-list PM resumes without product outcomes ("Managed social media" → "Grew followers 40%, increased CTR 2×") are screened out before human review',
  fin:    'Finance roles without credentials (CFA/CA/CPA/MBA) face 3× higher rejection at screen for senior roles — if pursuing CFA, list "CFA Level X Candidate" on your profile now',
  hc:     'Clinical vacancies are mostly off general job boards — 60% require specialty board registration and clinical recruiter engagement; LinkedIn alone will not find them',
  legal:  'Legal roles without documented specialty (practice area + key deals or matters) are ignored by in-house legal teams — add a "Key Matters" section to your CV',
  mkt:    'Marketers without quantified metrics ("managed social media" with no numbers) are screened out of performance marketing roles — add data to every bullet point',
  ops:    'Operations CVs listing responsibilities (not outcomes) have 60% lower callback rates — replace every "responsible for" with a metric-backed result',
  cons:   'Consulting profiles without clear exit narrative are default-skeptical from industry hiring managers — prepare your "I want to apply consulting skills inside a company" story',
  ind:    'Industrial roles require certification specifics (belt level, code number, standard version) — list every certification with its exact level and issuing body',
  bpo:    'Volume BPO profile without analytics upskilling or automation certification is increasingly screened out as AI automates scripted work — address this gap immediately',
  design: 'Design portfolios without measurable business outcomes are screened at senior roles — every case study needs a "Result: [metric]" line before the recruiter moves on',
};

export function estimateHiringProbability(
  rolePrefix: string,
  companyType: string,
  seniority: string,
  hasEmploymentGap: boolean,
  visaRequired: boolean,
): HiringProbabilityResult {
  const base = HIRING_PROB_BASE[rolePrefix]?.[companyType as CompanyTypeKey]
    ?? HIRING_PROB_BASE['default'][companyType as CompanyTypeKey]
    ?? 0.50;
  const senMod = SENIORITY_PROB_MODIFIER[(seniority as SeniorityKey)] ?? 1.0;
  let prob = base * senMod;
  if (hasEmploymentGap) prob *= 0.78;
  if (visaRequired) prob *= 0.82;
  prob = Math.min(0.95, Math.max(0.08, prob));

  const label =
    prob >= 0.70 ? 'Very High' :
    prob >= 0.55 ? 'High' :
    prob >= 0.40 ? 'Moderate' :
    prob >= 0.25 ? 'Low' : 'Very Low';

  const estimatedWeeks =
    companyType === 'mega' ? 10 :
    companyType === 'large' ? 8 :
    companyType === 'mid' ? 6 : 4;

  // Role-specific primary guidance always surfaces first
  const roleEnabler = ROLE_HIRING_ENABLER[rolePrefix] ?? 'Warm referral from current employee (+25% probability)';
  const roleBarrier = ROLE_HIRING_BARRIER[rolePrefix] ?? null;

  const keyEnablers: string[] = [roleEnabler];
  const keyBarriers: string[] = roleBarrier ? [roleBarrier] : [];

  if (seniority === 'staff' || seniority === 'exec') {
    keyEnablers.push('Executive recruiter introduction (bypasses ATS entirely)');
    keyBarriers.push('Senior roles have <10 headcount per year — timing is critical');
  }
  if (hasEmploymentGap) keyBarriers.push('Employment gap reduces recruiter callback rate by ~22% — address proactively in cover note');
  if (visaRequired) keyBarriers.push('Visa sponsorship reduces eligible company pool by ~40% — pre-qualify companies before applying');
  if (companyType === 'mega') keyBarriers.push('Mega-company ATS filters reject 85% of applications before human review — referrals are near-mandatory');
  if (prob >= 0.60) keyEnablers.push('Market demand for this role + company type combination is strong — apply within this hiring cycle');

  return {
    probability: Math.round(prob * 100) / 100,
    probabilityLabel: label,
    rationale: `${label} hiring probability for a ${seniority} ${rolePrefix} applying to a ${companyType}-sized company${hasEmploymentGap ? ' (with employment gap)' : ''}${visaRequired ? ' (visa sponsorship required)' : ''}. Based on role demand, company hiring cadence, and seniority band competition.`,
    keyEnablers,
    keyBarriers,
    estimatedTimeToOfferWeeks: estimatedWeeks,
  };
}

// ── AI Disruption Resistance Map ──────────────────────────────────────────────
// Per-role-family AI disruption resistance score (1–10, higher = more resistant).
// Accounts for the top 3 specialisations that provide the most protection.
// Sources: McKinsey AI Impact 2026, WEF Future of Jobs 2025, Burning Glass Institute

export interface AIDisruptionResistanceProfile {
  overallResistance: number;    // 1–10
  resistanceLabel: string;      // 'Very High' | 'High' | 'Moderate' | 'Low' | 'Very Low'
  whyResistant: string[];       // reasons this role resists AI displacement
  highestRiskTasks: string[];   // tasks within this role most at risk of AI automation
  bestProtectiveSpecialisations: Array<{
    specialisation: string;
    resistanceScore: number;
    why: string;
  }>;
  timeHorizonNote: string;      // when displacement risk becomes material
}

export const AI_DISRUPTION_RESISTANCE: Record<string, AIDisruptionResistanceProfile> = {
  sw: {
    overallResistance: 6,
    resistanceLabel: 'Moderate',
    whyResistant: ['Complex multi-system architecture requires human judgment', 'Novel problem-solving cannot be automated predictably', 'Client and stakeholder communication requires social intelligence'],
    highestRiskTasks: ['Boilerplate CRUD code generation', 'Unit test writing for standard patterns', 'Code review of simple, well-documented PRs'],
    bestProtectiveSpecialisations: [
      { specialisation: 'ML Infrastructure / AI Systems Engineering', resistanceScore: 9, why: 'Building the infrastructure that AI runs on — humans required to design, validate, and maintain these systems' },
      { specialisation: 'Systems Architecture + Security', resistanceScore: 8, why: 'Security threat modeling and complex distributed systems design require contextual judgment AI lacks' },
      { specialisation: 'Platform Engineering + Developer Experience', resistanceScore: 8, why: 'Tooling for human developers — ironically, AI augmentation INCREASES demand for this role' },
    ],
    timeHorizonNote: 'Junior-to-mid routine coding roles face 25–35% displacement by 2028. Senior+ roles with architectural scope are protected until 2030+.',
  },
  ds: {
    overallResistance: 5,
    resistanceLabel: 'Moderate',
    whyResistant: ['Business context interpretation requires domain expertise AI cannot replicate', 'Experimental design and hypothesis generation require scientific creativity', 'Stakeholder communication of uncertainty is a human skill'],
    highestRiskTasks: ['Standard EDA (exploratory data analysis) on clean datasets', 'Routine model evaluation against benchmarks', 'Dashboard and report generation from structured data'],
    bestProtectiveSpecialisations: [
      { specialisation: 'Causal Inference + Experimentation Design', resistanceScore: 9, why: 'A/B test design, causal modeling, and experimental validity — requires statistical judgment AI routinely gets wrong' },
      { specialisation: 'ML Engineering + Production Deployment', resistanceScore: 8, why: 'Moving models from notebooks to production requires engineering skills that go beyond data science' },
      { specialisation: 'Domain-Specific AI (HealthTech, FinTech, Climate)', resistanceScore: 9, why: 'Domain expertise combined with ML skills is the rarest and most valuable combination in the market' },
    ],
    timeHorizonNote: 'Routine analytics roles face 30–40% displacement by 2027. Domain-expert data scientists are net beneficiaries of AI adoption.',
  },
  hc: {
    overallResistance: 9,
    resistanceLabel: 'Very High',
    whyResistant: ['Clinical judgment requires integrating ambiguous, multi-modal patient context', 'Physical examination and procedural skills cannot be automated', 'Patient trust and empathy are fundamental to outcomes — non-replicable'],
    highestRiskTasks: ['Routine documentation and medical transcription', 'Standard report interpretation (radiology, pathology for common conditions)', 'Administrative scheduling and billing'],
    bestProtectiveSpecialisations: [
      { specialisation: 'Surgical Specialties + Procedural Medicine', resistanceScore: 10, why: 'Dexterous physical procedures require human surgeons for complex cases indefinitely' },
      { specialisation: 'Clinical Leadership + Healthcare Administration', resistanceScore: 8, why: 'Strategy, team leadership, and systemic change management in healthcare require human judgment' },
      { specialisation: 'HealthTech Clinical Operations (AI + Clinical)', resistanceScore: 10, why: 'Clinicians who can bridge AI tools and patient care are the most sought-after profile in HealthTech' },
    ],
    timeHorizonNote: 'Clinical AI augments but does not replace physicians. Documentation automation (2024–2026) reduces administrative burden. AI threat to clinical judgment: 2035+.',
  },
  legal: {
    overallResistance: 7,
    resistanceLabel: 'High',
    whyResistant: ['Legal judgment in novel situations requires contextual reasoning AI misses', 'Adversarial negotiation requires human psychological intelligence', 'Regulatory interpretation involves political and social judgment'],
    highestRiskTasks: ['Standard contract review for boilerplate provisions', 'Legal research for well-settled areas of law', 'Due diligence document review and extraction'],
    bestProtectiveSpecialisations: [
      { specialisation: 'AI + Technology Law / Data Privacy (GDPR/DPDP)', resistanceScore: 10, why: 'Regulating AI requires lawyers who understand it — enormous supply shortage globally' },
      { specialisation: 'Litigation + Trial Work', resistanceScore: 9, why: 'Courtroom advocacy, witness examination, and jury strategy are irreducibly human' },
      { specialisation: 'Complex M&A + Cross-Border Transactions', resistanceScore: 8, why: 'Multi-jurisdictional negotiation at high stakes requires senior judgment that AI cannot replicate reliably' },
    ],
    timeHorizonNote: 'Document review automation already displacing junior lawyers (2024–2026). Senior counsel with judgment roles protected through 2032+.',
  },
  fin: {
    overallResistance: 6,
    resistanceLabel: 'Moderate',
    whyResistant: ['Complex deal structuring and negotiation require human creativity and trust', 'Regulatory interpretation in novel situations requires professional judgment', 'Client relationship management at senior levels is relationship-intensive'],
    highestRiskTasks: ['Standard financial modelling from templates', 'Routine regulatory reporting and compliance filing', 'Market data analysis and summary reporting'],
    bestProtectiveSpecialisations: [
      { specialisation: 'Private Equity Operating Partner / Value Creation', resistanceScore: 9, why: 'Operational transformation of portfolio companies requires hands-on leadership AI cannot provide' },
      { specialisation: 'Venture Capital Principal (Early Stage)', resistanceScore: 9, why: 'Founder selection requires interpersonal judgment, network, and pattern matching that is deeply human' },
      { specialisation: 'Structured Finance + Complex Credit', resistanceScore: 8, why: 'Novel structures in grey areas of regulation require experienced judgment irreplaceable by AI' },
    ],
    timeHorizonNote: 'Routine financial analysis faces 25–35% automation by 2027. Senior advisory and deal roles protected through 2032+.',
  },
  mkt: {
    overallResistance: 5,
    resistanceLabel: 'Moderate',
    whyResistant: ['Brand strategy requires cultural intuition and audience empathy', 'Creative direction and campaign concepting require human imagination', 'Customer psychology and persuasion cannot be fully systematized'],
    highestRiskTasks: ['Routine content creation (social posts, emails, product descriptions)', 'A/B test setup and results reporting', 'Media buying optimisation for standard campaigns'],
    bestProtectiveSpecialisations: [
      { specialisation: 'Brand Strategy + Cultural Intelligence', resistanceScore: 8, why: 'Cultural context, brand voice, and audience empathy require deep human intuition' },
      { specialisation: 'Growth Marketing + Revenue Attribution', resistanceScore: 7, why: 'Multi-touch attribution modeling and growth loops require analytical creativity beyond AI pattern matching' },
      { specialisation: 'AI Marketing Tools Specialist', resistanceScore: 9, why: 'Marketers who direct AI tools — prompt engineering, AI workflow design, output quality control — are net beneficiaries' },
    ],
    timeHorizonNote: 'Content creation roles face 40–50% AI displacement by 2027. Strategic marketing leadership roles protected through 2030+.',
  },
  cons: {
    overallResistance: 7,
    resistanceLabel: 'High',
    whyResistant: ['Client relationship management at senior levels is deeply interpersonal', 'Stakeholder alignment in complex organisations requires political intelligence', 'Novel problem framing for unique client contexts cannot be templated'],
    highestRiskTasks: ['Slide deck production for standard analyses', 'Data gathering and secondary research synthesis', 'Process documentation and mapping'],
    bestProtectiveSpecialisations: [
      { specialisation: 'Implementation + Change Management Consulting', resistanceScore: 9, why: 'Organisational change and human adoption of new processes requires empathy and influence, not algorithms' },
      { specialisation: 'AI Strategy + Digital Transformation Consulting', resistanceScore: 10, why: 'Advising companies on AI adoption requires consultants who deeply understand AI — high demand, short supply' },
      { specialisation: 'PE Operations / Portfolio Value Creation', resistanceScore: 8, why: 'Hands-on operational transformation in portfolio companies requires on-the-ground judgment' },
    ],
    timeHorizonNote: 'Junior consulting (research, analysis) faces meaningful automation. Senior advisory roles with client ownership protected through 2032+.',
  },
  ops: {
    overallResistance: 6,
    resistanceLabel: 'Moderate',
    whyResistant: ['Physical process management requires on-site human judgment', 'Cross-functional orchestration requires relationship and authority management', 'Novel operational problems in dynamic environments require adaptive thinking'],
    highestRiskTasks: ['Routine reporting and operational dashboards', 'Standard vendor communication and purchase orders', 'Process documentation and SOP maintenance'],
    bestProtectiveSpecialisations: [
      { specialisation: 'Supply Chain Resilience + Risk Management', resistanceScore: 8, why: 'Black swan events and geopolitical disruption require human judgment and relationship networks' },
      { specialisation: 'Operational P&L Ownership / GM Role', resistanceScore: 9, why: 'Full business accountability combining commercial, operational, and people skills is irreducibly human' },
      { specialisation: 'Digital Operations / Automation Lead', resistanceScore: 8, why: 'Operations professionals who design and manage automation — AI augments, not replaces, this role' },
    ],
    timeHorizonNote: 'Routine operations coordination faces automation. Senior ops leadership with P&L accountability protected through 2030+.',
  },
  pm: {
    overallResistance: 7,
    resistanceLabel: 'High',
    whyResistant: ['Product strategy requires synthesising user empathy, business context, and technical constraints simultaneously', 'Stakeholder alignment across competing interests requires political intelligence', 'Prioritisation in ambiguous, novel product spaces cannot be systematized'],
    highestRiskTasks: ['User story writing for well-defined features', 'Sprint reporting and status updates', 'Market sizing for defined, data-rich categories'],
    bestProtectiveSpecialisations: [
      { specialisation: 'AI Product Management', resistanceScore: 10, why: 'PMs who define AI product strategy and understand model limitations are in structural shortage globally' },
      { specialisation: 'Platform / API Product Management', resistanceScore: 9, why: 'Developer-facing products require deep technical empathy — technical PMs command 25–40% salary premium' },
      { specialisation: 'Growth & Monetisation PM', resistanceScore: 8, why: 'Revenue-generating product decisions require human judgment about customer psychology and market dynamics' },
    ],
    timeHorizonNote: 'Execution PMs (writing specs, managing backlogs) face AI augmentation. Strategic PMs with ownership and domain expertise are protected.',
  },
  bpo: {
    overallResistance: 3,
    resistanceLabel: 'Low',
    whyResistant: ['Complex, non-scripted customer interactions require human empathy', 'Escalation handling and emotionally-charged situations require human presence', 'Quality oversight of AI-automated processes requires human judgment'],
    highestRiskTasks: ['Scripted customer service interactions', 'Standard data entry and form processing', 'Rule-based claims and billing processing'],
    bestProtectiveSpecialisations: [
      { specialisation: 'RPA / Process Automation Analyst', resistanceScore: 8, why: 'BPO professionals who implement automation are the most future-proof — same domain knowledge, higher skill tier' },
      { specialisation: 'Healthcare Revenue Cycle Management', resistanceScore: 7, why: 'Medical billing complexity and regulatory requirements maintain human need for the foreseeable future' },
      { specialisation: 'CX Analytics + Quality Management', resistanceScore: 7, why: 'Interpreting AI-generated CX insights and driving quality improvement requires human oversight' },
    ],
    timeHorizonNote: 'Volume BPO roles face 40–60% displacement by 2027. Analytics-led and automation roles are net beneficiaries. Transition NOW before the market tips.',
  },
  design: {
    overallResistance: 6,
    resistanceLabel: 'Moderate',
    whyResistant: ['User empathy and behavioral research require human connection', 'Brand storytelling and cultural resonance require human cultural intelligence', 'Design leadership and strategic vision cannot be algorithmized'],
    highestRiskTasks: ['Asset production (icons, illustrations, basic layouts)', 'Routine UI implementation from established design systems', 'Simple ad creative variation generation'],
    bestProtectiveSpecialisations: [
      { specialisation: 'AI-Augmented Design (GenAI direction + quality control)', resistanceScore: 9, why: 'Designers who direct AI tools while maintaining quality standards are the premium design profile for 2026–2030' },
      { specialisation: 'Design Systems + Cross-Functional Design Leadership', resistanceScore: 8, why: 'Scaling design quality across an organisation requires human systems thinking and cross-functional influence' },
      { specialisation: 'UX Research + Qualitative Methods', resistanceScore: 9, why: 'Deep qualitative user research requiring trust, empathy, and contextual interpretation is AI-resistant' },
    ],
    timeHorizonNote: 'Visual production designers face 40%+ displacement by 2027. UX researchers and design leaders are protected and face increased demand as AI output needs human curation.',
  },
  ind: {
    overallResistance: 8,
    resistanceLabel: 'High',
    whyResistant: ['Physical dexterity and on-site judgment for complex, variable tasks remains human-dominated', 'Safety-critical decision making in dynamic industrial environments requires experienced human judgment', 'EV and clean energy transitions require massive upskilling of existing talent — demand exceeds supply'],
    highestRiskTasks: ['Repetitive assembly and material handling (already automated at large manufacturers)', 'Quality inspection for standard components (computer vision replacing routine visual checks)', 'Data entry for production reporting'],
    bestProtectiveSpecialisations: [
      { specialisation: 'EV Systems / Battery Engineering', resistanceScore: 10, why: 'EV transition requires 500K+ new engineers globally by 2030 — structural shortage, not surplus' },
      { specialisation: 'Industrial Automation + Robotics Programming', resistanceScore: 9, why: 'Programming and maintaining the robots that replace other workers — net AI beneficiary role' },
      { specialisation: 'HSE + Functional Safety (ISO 26262 / IEC 61508)', resistanceScore: 9, why: 'Safety-critical systems require certified human oversight in regulated industries — non-negotiable' },
    ],
    timeHorizonNote: 'Routine assembly is automated. Skilled trades with specialised certifications and complex judgment roles are structurally protected through 2035+.',
  },
  default: {
    overallResistance: 6,
    resistanceLabel: 'Moderate',
    whyResistant: ['Complex judgment and novel problem-solving across most professional roles', 'Stakeholder and client relationship management', 'Contextual decision-making in dynamic environments'],
    highestRiskTasks: ['Routine data processing and report generation', 'Standard template-based communications', 'Rule-based administrative tasks'],
    bestProtectiveSpecialisations: [
      { specialisation: 'AI Tools Proficiency in Your Domain', resistanceScore: 8, why: 'Professionals who direct AI tools rather than compete with them are net beneficiaries' },
      { specialisation: 'Complex Stakeholder Management + Leadership', resistanceScore: 8, why: 'Human influence, empathy, and political navigation remain irreducibly human' },
      { specialisation: 'Domain Expertise + Data Literacy', resistanceScore: 7, why: 'Combining deep domain knowledge with data skills is the rarest and most AI-resistant combination' },
    ],
    timeHorizonNote: 'AI augmentation is underway across all professions. Adding AI tool proficiency to your current skills is the single highest-ROI career investment in 2026.',
  },
};

/** Get AI disruption resistance profile for a role prefix. */
export function getAIDisruptionResistance(rolePrefix: string): AIDisruptionResistanceProfile {
  return AI_DISRUPTION_RESISTANCE[rolePrefix] ?? AI_DISRUPTION_RESISTANCE['default'];
}
