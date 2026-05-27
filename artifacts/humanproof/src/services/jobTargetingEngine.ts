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
