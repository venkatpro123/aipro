// ═══════════════════════════════════════════════════════════════════════════════
// companyIntelligenceDB.ts — Layoff Audit Company Intelligence Registry v1.0
//
// Phase 1: Top 50 global companies (Big Tech, SaaS, AI-first, Layoff-heavy)
// Structured for deterministic scoring, career risk assessment, and
// displacement trajectory calculations in the Layoff Audit engine.
//
// Schema: CompanyProfile (strict, consistent, database-ready)
// Last Generated: 2026-04-16
// ═══════════════════════════════════════════════════════════════════════════════

export type RevenueTrend = 'growing' | 'stable' | 'declining';
export type FundingStage = 'bootstrapped' | 'series_a' | 'series_b' | 'series_c' | 'series_d' | 'public' | 'pre_ipo';
export type BurnRateEstimate = 'low' | 'moderate' | 'high' | 'very_high';
export type CompanySize = 'small' | 'mid' | 'large' | 'enterprise';
export type CompanyStage = 'startup' | 'growth' | 'mature' | 'restructuring' | 'declining';
export type HiringVelocity = 'aggressive' | 'moderate' | 'slow' | 'frozen';
export type LayoffFrequency = 'none' | 'rare' | 'moderate' | 'frequent';

export interface FinancialSignals {
  revenueTrend: RevenueTrend;
  fundingStage: FundingStage;
  /** ISO date of last funding round (e.g. '2025-03-31'). */
  lastFundingDate?: string;
  /** Months since last funding round — kept for backward compat with existing DB entries. */
  monthsSinceLastFunding?: number;
  burnRateEstimate: BurnRateEstimate;
}

export interface LayoffHistory {
  totalLayoffs: number;                // headcount cut across all rounds
  lastLayoffDate: string;              // ISO date or 'none'
  layoffFrequency: LayoffFrequency;
  affectedDepartments: string[];
}

export interface HiringSignals {
  hiringVelocity: HiringVelocity;
  hiringFreezeScore: number;           // 0.0 (no freeze) → 1.0 (complete freeze)
}

export interface RoleRiskMap {
  softwareEngineer: number;            // 0.0–1.0
  productManager: number;
  dataScientist: number;
  designer: number;
  hrRecruiter: number;
  sales: number;
}

export interface CompanyProfile {
  companyName: string;
  industry: string;
  companySize: CompanySize;
  stage: CompanyStage;
  /** Stock ticker for live Alpha Vantage lookups (public companies only). */
  stockTicker?: string;

  financialSignals: FinancialSignals;
  layoffHistory: LayoffHistory;
  hiringSignals: HiringSignals;
  roleRiskMap: RoleRiskMap;

  aiExposureIndex: number;             // 0.0–1.0 — how deeply AI disrupts this company's workforce
  marketRiskScore: number;             // 0.0–1.0 — industry-level volatility
  companyRiskScore: number;            // 0.0–1.0 — composite layoff risk signal
  confidenceScore: number;             // 0.0–1.0 — quality of available public data
  lastUpdated: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 1 DATASET — Top 50 Global Companies
// ══════════════════════════════════════════════════════════════════════════════

export const COMPANY_INTELLIGENCE_DB: Record<string, CompanyProfile> = {

  // ── BIG TECH — STABLE ─────────────────────────────────────────────────────

  apple: {
    companyName: 'Apple',
    industry: 'Consumer Technology',
    companySize: 'enterprise',
    stage: 'mature',
    stockTicker: 'AAPL',
    financialSignals: {
      revenueTrend: 'growing',
      fundingStage: 'public',
      burnRateEstimate: 'low',
    },
    layoffHistory: {
      totalLayoffs: 0,
      lastLayoffDate: 'none',
      layoffFrequency: 'none',
      affectedDepartments: [],
    },
    hiringSignals: {
      hiringVelocity: 'moderate',
      hiringFreezeScore: 0.2,
    },
    roleRiskMap: {
      softwareEngineer: 0.22,
      productManager: 0.20,
      dataScientist: 0.25,
      designer: 0.18,
      hrRecruiter: 0.30,
      sales: 0.28,
    },
    aiExposureIndex: 0.45,
    marketRiskScore: 0.25,
    companyRiskScore: 0.20,
    confidenceScore: 0.95,
    lastUpdated: '2026-04-16',
  },

  google: {
    companyName: 'Google (Alphabet)',
    industry: 'Technology / AI',
    companySize: 'enterprise',
    stage: 'restructuring',
    stockTicker: 'GOOGL',
    financialSignals: {
      revenueTrend: 'growing',
      fundingStage: 'public',
      burnRateEstimate: 'low',
    },
    layoffHistory: {
      totalLayoffs: 12000,
      lastLayoffDate: '2024-01-20',
      layoffFrequency: 'moderate',
      affectedDepartments: ['recruiting', 'engineering', 'product', 'sales'],
    },
    hiringSignals: {
      hiringVelocity: 'slow',
      hiringFreezeScore: 0.55,
    },
    roleRiskMap: {
      softwareEngineer: 0.35,
      productManager: 0.32,
      dataScientist: 0.28,
      designer: 0.30,
      hrRecruiter: 0.75,
      sales: 0.60,
    },
    aiExposureIndex: 0.70,
    marketRiskScore: 0.35,
    companyRiskScore: 0.45,
    confidenceScore: 0.95,
    lastUpdated: '2026-04-16',
  },

  microsoft: {
    companyName: 'Microsoft',
    industry: 'Technology / Cloud / AI',
    companySize: 'enterprise',
    stage: 'mature',
    stockTicker: 'MSFT',
    financialSignals: {
      revenueTrend: 'growing',
      fundingStage: 'public',
      burnRateEstimate: 'low',
    },
    layoffHistory: {
      totalLayoffs: 10000,
      lastLayoffDate: '2023-01-18',
      layoffFrequency: 'rare',
      affectedDepartments: ['engineering', 'gaming', 'hr'],
    },
    hiringSignals: {
      hiringVelocity: 'moderate',
      hiringFreezeScore: 0.30,
    },
    roleRiskMap: {
      softwareEngineer: 0.25,
      productManager: 0.22,
      dataScientist: 0.20,
      designer: 0.27,
      hrRecruiter: 0.55,
      sales: 0.40,
    },
    aiExposureIndex: 0.72,
    marketRiskScore: 0.22,
    companyRiskScore: 0.28,
    confidenceScore: 0.95,
    lastUpdated: '2026-04-16',
  },

  amazon: {
    companyName: 'Amazon',
    industry: 'E-Commerce / Cloud',
    companySize: 'enterprise',
    stage: 'restructuring',
    stockTicker: 'AMZN',
    financialSignals: {
      revenueTrend: 'growing',
      fundingStage: 'public',
      burnRateEstimate: 'moderate',
    },
    layoffHistory: {
      totalLayoffs: 27000,
      lastLayoffDate: '2023-03-20',
      layoffFrequency: 'moderate',
      affectedDepartments: ['operations', 'recruiting', 'support', 'advertising'],
    },
    hiringSignals: {
      hiringVelocity: 'slow',
      hiringFreezeScore: 0.45,
    },
    roleRiskMap: {
      softwareEngineer: 0.30,
      productManager: 0.28,
      dataScientist: 0.25,
      designer: 0.32,
      hrRecruiter: 0.80,
      sales: 0.55,
    },
    aiExposureIndex: 0.65,
    marketRiskScore: 0.30,
    companyRiskScore: 0.40,
    confidenceScore: 0.95,
    lastUpdated: '2026-04-16',
  },

  meta: {
    companyName: 'Meta',
    industry: 'Social Media / AI',
    companySize: 'enterprise',
    stage: 'restructuring',
    stockTicker: 'META',
    financialSignals: {
      revenueTrend: 'growing',
      fundingStage: 'public',
      burnRateEstimate: 'low',
    },
    layoffHistory: {
      totalLayoffs: 21000,
      lastLayoffDate: '2023-03-14',
      layoffFrequency: 'frequent',
      affectedDepartments: ['recruiting', 'hr', 'product', 'engineering', 'operations'],
    },
    hiringSignals: {
      hiringVelocity: 'moderate',
      hiringFreezeScore: 0.40,
    },
    roleRiskMap: {
      softwareEngineer: 0.30,
      productManager: 0.28,
      dataScientist: 0.22,
      designer: 0.30,
      hrRecruiter: 0.85,
      sales: 0.50,
    },
    aiExposureIndex: 0.75,
    marketRiskScore: 0.42,
    companyRiskScore: 0.48,
    confidenceScore: 0.95,
    lastUpdated: '2026-04-16',
  },

  // ── BIG TECH — AI-FIRST ───────────────────────────────────────────────────

  openai: {
    companyName: 'OpenAI',
    industry: 'Artificial Intelligence',
    companySize: 'large',
    stage: 'growth',
    financialSignals: {
      revenueTrend: 'growing',
      fundingStage: 'pre_ipo',
      lastFundingDate: '2025-03-31', // SoftBank $40B round closed March 2025
      burnRateEstimate: 'high',
    },
    layoffHistory: {
      totalLayoffs: 0,
      lastLayoffDate: 'none',
      layoffFrequency: 'none',
      affectedDepartments: [],
    },
    hiringSignals: {
      hiringVelocity: 'aggressive',
      hiringFreezeScore: 0.05,
    },
    roleRiskMap: {
      softwareEngineer: 0.15,
      productManager: 0.18,
      dataScientist: 0.12,
      designer: 0.22,
      hrRecruiter: 0.28,
      sales: 0.25,
    },
    aiExposureIndex: 0.90,
    marketRiskScore: 0.55,
    companyRiskScore: 0.25,
    confidenceScore: 0.80,
    lastUpdated: '2026-04-16',
  },

  anthropic: {
    companyName: 'Anthropic',
    industry: 'Artificial Intelligence',
    companySize: 'mid',
    stage: 'growth',
    financialSignals: {
      revenueTrend: 'growing',
      fundingStage: 'series_c',
      lastFundingDate: '2024-11-22', // Amazon $4B investment Nov 2024
      burnRateEstimate: 'high',
    },
    layoffHistory: {
      totalLayoffs: 0,
      lastLayoffDate: 'none',
      layoffFrequency: 'none',
      affectedDepartments: [],
    },
    hiringSignals: {
      hiringVelocity: 'aggressive',
      hiringFreezeScore: 0.05,
    },
    roleRiskMap: {
      softwareEngineer: 0.12,
      productManager: 0.15,
      dataScientist: 0.10,
      designer: 0.20,
      hrRecruiter: 0.25,
      sales: 0.22,
    },
    aiExposureIndex: 0.92,
    marketRiskScore: 0.55,
    companyRiskScore: 0.22,
    confidenceScore: 0.75,
    lastUpdated: '2026-04-16',
  },

  nvidia: {
    companyName: 'NVIDIA',
    industry: 'Semiconductors / AI Infrastructure',
    companySize: 'enterprise',
    stage: 'growth',
    stockTicker: 'NVDA',
    financialSignals: {
      revenueTrend: 'growing',
      fundingStage: 'public',
      burnRateEstimate: 'low',
    },
    layoffHistory: {
      totalLayoffs: 0,
      lastLayoffDate: 'none',
      layoffFrequency: 'none',
      affectedDepartments: [],
    },
    hiringSignals: {
      hiringVelocity: 'aggressive',
      hiringFreezeScore: 0.08,
    },
    roleRiskMap: {
      softwareEngineer: 0.18,
      productManager: 0.20,
      dataScientist: 0.15,
      designer: 0.25,
      hrRecruiter: 0.30,
      sales: 0.28,
    },
    aiExposureIndex: 0.85,
    marketRiskScore: 0.38,
    companyRiskScore: 0.18,
    confidenceScore: 0.95,
    lastUpdated: '2026-04-16',
  },

  // ── ENTERPRISE SaaS ───────────────────────────────────────────────────────

  salesforce: {
    companyName: 'Salesforce',
    industry: 'Enterprise SaaS / CRM',
    companySize: 'enterprise',
    stage: 'restructuring',
    stockTicker: 'CRM',
    financialSignals: {
      revenueTrend: 'stable',
      fundingStage: 'public',
      burnRateEstimate: 'low',
    },
    layoffHistory: {
      totalLayoffs: 8000,
      lastLayoffDate: '2023-01-04',
      layoffFrequency: 'moderate',
      affectedDepartments: ['sales', 'recruiting', 'hr', 'operations'],
    },
    hiringSignals: {
      hiringVelocity: 'slow',
      hiringFreezeScore: 0.60,
    },
    roleRiskMap: {
      softwareEngineer: 0.32,
      productManager: 0.30,
      dataScientist: 0.28,
      designer: 0.33,
      hrRecruiter: 0.82,
      sales: 0.65,
    },
    aiExposureIndex: 0.68,
    marketRiskScore: 0.42,
    companyRiskScore: 0.52,
    confidenceScore: 0.92,
    lastUpdated: '2026-04-16',
  },

  sap: {
    companyName: 'SAP',
    industry: 'Enterprise SaaS / ERP',
    companySize: 'enterprise',
    stage: 'restructuring',
    financialSignals: {
      revenueTrend: 'stable',
      fundingStage: 'public',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'low',
    },
    layoffHistory: {
      totalLayoffs: 8000,
      lastLayoffDate: '2024-01-24',
      layoffFrequency: 'moderate',
      affectedDepartments: ['consulting', 'sales', 'hr', 'operations'],
    },
    hiringSignals: {
      hiringVelocity: 'slow',
      hiringFreezeScore: 0.55,
    },
    roleRiskMap: {
      softwareEngineer: 0.30,
      productManager: 0.28,
      dataScientist: 0.32,
      designer: 0.35,
      hrRecruiter: 0.75,
      sales: 0.58,
    },
    aiExposureIndex: 0.60,
    marketRiskScore: 0.38,
    companyRiskScore: 0.48,
    confidenceScore: 0.90,
    lastUpdated: '2026-04-16',
  },

  servicenow: {
    companyName: 'ServiceNow',
    industry: 'Enterprise SaaS / Workflow Automation',
    companySize: 'enterprise',
    stage: 'growth',
    financialSignals: {
      revenueTrend: 'growing',
      fundingStage: 'public',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'low',
    },
    layoffHistory: {
      totalLayoffs: 0,
      lastLayoffDate: 'none',
      layoffFrequency: 'none',
      affectedDepartments: [],
    },
    hiringSignals: {
      hiringVelocity: 'moderate',
      hiringFreezeScore: 0.20,
    },
    roleRiskMap: {
      softwareEngineer: 0.24,
      productManager: 0.22,
      dataScientist: 0.26,
      designer: 0.28,
      hrRecruiter: 0.45,
      sales: 0.38,
    },
    aiExposureIndex: 0.65,
    marketRiskScore: 0.30,
    companyRiskScore: 0.28,
    confidenceScore: 0.88,
    lastUpdated: '2026-04-16',
  },

  workday: {
    companyName: 'Workday',
    industry: 'Enterprise SaaS / HR & Finance',
    companySize: 'large',
    stage: 'restructuring',
    financialSignals: {
      revenueTrend: 'stable',
      fundingStage: 'public',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'moderate',
    },
    layoffHistory: {
      totalLayoffs: 1750,
      lastLayoffDate: '2024-01-23',
      layoffFrequency: 'rare',
      affectedDepartments: ['sales', 'operations', 'hr'],
    },
    hiringSignals: {
      hiringVelocity: 'slow',
      hiringFreezeScore: 0.50,
    },
    roleRiskMap: {
      softwareEngineer: 0.30,
      productManager: 0.28,
      dataScientist: 0.30,
      designer: 0.32,
      hrRecruiter: 0.72,
      sales: 0.60,
    },
    aiExposureIndex: 0.62,
    marketRiskScore: 0.38,
    companyRiskScore: 0.45,
    confidenceScore: 0.88,
    lastUpdated: '2026-04-16',
  },

  hubspot: {
    companyName: 'HubSpot',
    industry: 'SaaS / CRM / Marketing',
    companySize: 'large',
    stage: 'mature',
    financialSignals: {
      revenueTrend: 'growing',
      fundingStage: 'public',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'low',
    },
    layoffHistory: {
      totalLayoffs: 500,
      lastLayoffDate: '2023-09-05',
      layoffFrequency: 'rare',
      affectedDepartments: ['recruiting', 'operations'],
    },
    hiringSignals: {
      hiringVelocity: 'moderate',
      hiringFreezeScore: 0.30,
    },
    roleRiskMap: {
      softwareEngineer: 0.28,
      productManager: 0.25,
      dataScientist: 0.30,
      designer: 0.30,
      hrRecruiter: 0.65,
      sales: 0.50,
    },
    aiExposureIndex: 0.60,
    marketRiskScore: 0.32,
    companyRiskScore: 0.35,
    confidenceScore: 0.88,
    lastUpdated: '2026-04-16',
  },

  zendesk: {
    companyName: 'Zendesk',
    industry: 'SaaS / Customer Support',
    companySize: 'large',
    stage: 'restructuring',
    financialSignals: {
      revenueTrend: 'stable',
      fundingStage: 'public',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'moderate',
    },
    layoffHistory: {
      totalLayoffs: 1300,
      lastLayoffDate: '2023-05-08',
      layoffFrequency: 'moderate',
      affectedDepartments: ['sales', 'engineering', 'support', 'hr'],
    },
    hiringSignals: {
      hiringVelocity: 'slow',
      hiringFreezeScore: 0.62,
    },
    roleRiskMap: {
      softwareEngineer: 0.35,
      productManager: 0.32,
      dataScientist: 0.30,
      designer: 0.35,
      hrRecruiter: 0.80,
      sales: 0.68,
    },
    aiExposureIndex: 0.72,
    marketRiskScore: 0.45,
    companyRiskScore: 0.55,
    confidenceScore: 0.85,
    lastUpdated: '2026-04-16',
  },

  // ── CLOUD / INFRASTRUCTURE ────────────────────────────────────────────────

  oracle: {
    companyName: 'Oracle',
    industry: 'Enterprise Technology / Cloud',
    companySize: 'enterprise',
    stage: 'restructuring',
    financialSignals: {
      revenueTrend: 'stable',
      fundingStage: 'public',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'low',
    },
    layoffHistory: {
      totalLayoffs: 18000,
      lastLayoffDate: '2024-04-01',
      layoffFrequency: 'frequent',
      affectedDepartments: ['engineering', 'sales', 'hr', 'operations', 'support'],
    },
    hiringSignals: {
      hiringVelocity: 'slow',
      hiringFreezeScore: 0.70,
    },
    roleRiskMap: {
      softwareEngineer: 0.42,
      productManager: 0.38,
      dataScientist: 0.35,
      designer: 0.40,
      hrRecruiter: 0.88,
      sales: 0.72,
    },
    aiExposureIndex: 0.62,
    marketRiskScore: 0.42,
    companyRiskScore: 0.65,
    confidenceScore: 0.92,
    lastUpdated: '2026-04-16',
  },

  snowflake: {
    companyName: 'Snowflake',
    industry: 'Cloud Data Platform / SaaS',
    companySize: 'large',
    stage: 'growth',
    financialSignals: {
      revenueTrend: 'growing',
      fundingStage: 'public',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'moderate',
    },
    layoffHistory: {
      totalLayoffs: 528,
      lastLayoffDate: '2024-02-28',
      layoffFrequency: 'rare',
      affectedDepartments: ['sales', 'marketing', 'operations'],
    },
    hiringSignals: {
      hiringVelocity: 'moderate',
      hiringFreezeScore: 0.35,
    },
    roleRiskMap: {
      softwareEngineer: 0.25,
      productManager: 0.22,
      dataScientist: 0.20,
      designer: 0.28,
      hrRecruiter: 0.60,
      sales: 0.50,
    },
    aiExposureIndex: 0.65,
    marketRiskScore: 0.38,
    companyRiskScore: 0.35,
    confidenceScore: 0.88,
    lastUpdated: '2026-04-16',
  },

  databricks: {
    companyName: 'Databricks',
    industry: 'AI / Data Platform',
    companySize: 'large',
    stage: 'growth',
    financialSignals: {
      revenueTrend: 'growing',
      fundingStage: 'series_d',
      lastFundingDate: '2024-12-04', // $5.3B at $62B valuation Dec 2024
      burnRateEstimate: 'moderate',
    },
    layoffHistory: {
      totalLayoffs: 0,
      lastLayoffDate: 'none',
      layoffFrequency: 'none',
      affectedDepartments: [],
    },
    hiringSignals: {
      hiringVelocity: 'aggressive',
      hiringFreezeScore: 0.08,
    },
    roleRiskMap: {
      softwareEngineer: 0.18,
      productManager: 0.20,
      dataScientist: 0.15,
      designer: 0.25,
      hrRecruiter: 0.32,
      sales: 0.28,
    },
    aiExposureIndex: 0.80,
    marketRiskScore: 0.38,
    companyRiskScore: 0.20,
    confidenceScore: 0.82,
    lastUpdated: '2026-04-16',
  },

  // ── FINTECH ───────────────────────────────────────────────────────────────

  stripe: {
    companyName: 'Stripe',
    industry: 'Fintech / Payments',
    companySize: 'large',
    stage: 'growth',
    financialSignals: {
      revenueTrend: 'growing',
      fundingStage: 'pre_ipo',
      lastFundingDate: '2024-10-07', // $694M round at $70B valuation Oct 2024
      burnRateEstimate: 'moderate',
    },
    layoffHistory: {
      totalLayoffs: 1100,
      lastLayoffDate: '2022-11-03',
      layoffFrequency: 'rare',
      affectedDepartments: ['recruiting', 'operations', 'support'],
    },
    hiringSignals: {
      hiringVelocity: 'moderate',
      hiringFreezeScore: 0.28,
    },
    roleRiskMap: {
      softwareEngineer: 0.22,
      productManager: 0.20,
      dataScientist: 0.22,
      designer: 0.25,
      hrRecruiter: 0.62,
      sales: 0.45,
    },
    aiExposureIndex: 0.62,
    marketRiskScore: 0.38,
    companyRiskScore: 0.30,
    confidenceScore: 0.82,
    lastUpdated: '2026-04-16',
  },

  coinbase: {
    companyName: 'Coinbase',
    industry: 'Crypto / Fintech',
    companySize: 'large',
    stage: 'declining',
    financialSignals: {
      revenueTrend: 'declining',
      fundingStage: 'public',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'high',
    },
    layoffHistory: {
      totalLayoffs: 3000,
      lastLayoffDate: '2023-01-10',
      layoffFrequency: 'frequent',
      affectedDepartments: ['engineering', 'operations', 'sales', 'support', 'hr'],
    },
    hiringSignals: {
      hiringVelocity: 'frozen',
      hiringFreezeScore: 0.90,
    },
    roleRiskMap: {
      softwareEngineer: 0.50,
      productManager: 0.55,
      dataScientist: 0.48,
      designer: 0.55,
      hrRecruiter: 0.92,
      sales: 0.78,
    },
    aiExposureIndex: 0.65,
    marketRiskScore: 0.75,
    companyRiskScore: 0.78,
    confidenceScore: 0.88,
    lastUpdated: '2026-04-16',
  },

  robinhood: {
    companyName: 'Robinhood',
    industry: 'Fintech / Brokerage',
    companySize: 'large',
    stage: 'declining',
    financialSignals: {
      revenueTrend: 'declining',
      fundingStage: 'public',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'high',
    },
    layoffHistory: {
      totalLayoffs: 1600,
      lastLayoffDate: '2022-08-02',
      layoffFrequency: 'frequent',
      affectedDepartments: ['engineering', 'operations', 'support', 'hr'],
    },
    hiringSignals: {
      hiringVelocity: 'frozen',
      hiringFreezeScore: 0.88,
    },
    roleRiskMap: {
      softwareEngineer: 0.48,
      productManager: 0.50,
      dataScientist: 0.44,
      designer: 0.50,
      hrRecruiter: 0.90,
      sales: 0.75,
    },
    aiExposureIndex: 0.60,
    marketRiskScore: 0.70,
    companyRiskScore: 0.75,
    confidenceScore: 0.85,
    lastUpdated: '2026-04-16',
  },

  // ── LAYOFF-HEAVY COMPANIES ────────────────────────────────────────────────

  twitter_x: {
    companyName: 'X (Twitter)',
    industry: 'Social Media',
    companySize: 'large',
    stage: 'declining',
    financialSignals: {
      revenueTrend: 'declining',
      fundingStage: 'public',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'high',
    },
    layoffHistory: {
      totalLayoffs: 6500,
      lastLayoffDate: '2022-11-04',
      layoffFrequency: 'frequent',
      affectedDepartments: ['engineering', 'sales', 'hr', 'trust_safety', 'support', 'operations'],
    },
    hiringSignals: {
      hiringVelocity: 'slow',
      hiringFreezeScore: 0.75,
    },
    roleRiskMap: {
      softwareEngineer: 0.55,
      productManager: 0.60,
      dataScientist: 0.52,
      designer: 0.58,
      hrRecruiter: 0.92,
      sales: 0.82,
    },
    aiExposureIndex: 0.70,
    marketRiskScore: 0.72,
    companyRiskScore: 0.80,
    confidenceScore: 0.90,
    lastUpdated: '2026-04-16',
  },

  lyft: {
    companyName: 'Lyft',
    industry: 'Transportation / Ridesharing',
    companySize: 'large',
    stage: 'declining',
    financialSignals: {
      revenueTrend: 'stable',
      fundingStage: 'public',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'high',
    },
    layoffHistory: {
      totalLayoffs: 2100,
      lastLayoffDate: '2023-04-27',
      layoffFrequency: 'frequent',
      affectedDepartments: ['engineering', 'operations', 'hr', 'support'],
    },
    hiringSignals: {
      hiringVelocity: 'frozen',
      hiringFreezeScore: 0.85,
    },
    roleRiskMap: {
      softwareEngineer: 0.48,
      productManager: 0.52,
      dataScientist: 0.45,
      designer: 0.50,
      hrRecruiter: 0.90,
      sales: 0.72,
    },
    aiExposureIndex: 0.58,
    marketRiskScore: 0.62,
    companyRiskScore: 0.72,
    confidenceScore: 0.88,
    lastUpdated: '2026-04-16',
  },

  peloton: {
    companyName: 'Peloton',
    industry: 'Consumer Tech / Fitness',
    companySize: 'large',
    stage: 'declining',
    financialSignals: {
      revenueTrend: 'declining',
      fundingStage: 'public',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'very_high',
    },
    layoffHistory: {
      totalLayoffs: 5000,
      lastLayoffDate: '2023-02-21',
      layoffFrequency: 'frequent',
      affectedDepartments: ['operations', 'engineering', 'manufacturing', 'sales', 'support', 'hr'],
    },
    hiringSignals: {
      hiringVelocity: 'frozen',
      hiringFreezeScore: 0.95,
    },
    roleRiskMap: {
      softwareEngineer: 0.55,
      productManager: 0.60,
      dataScientist: 0.55,
      designer: 0.58,
      hrRecruiter: 0.95,
      sales: 0.85,
    },
    aiExposureIndex: 0.48,
    marketRiskScore: 0.70,
    companyRiskScore: 0.85,
    confidenceScore: 0.90,
    lastUpdated: '2026-04-16',
  },

  shopify: {
    companyName: 'Shopify',
    industry: 'E-Commerce SaaS',
    companySize: 'large',
    stage: 'restructuring',
    financialSignals: {
      revenueTrend: 'growing',
      fundingStage: 'public',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'moderate',
    },
    layoffHistory: {
      totalLayoffs: 2100,
      lastLayoffDate: '2023-05-04',
      layoffFrequency: 'moderate',
      affectedDepartments: ['logistics', 'operations', 'hr', 'engineering'],
    },
    hiringSignals: {
      hiringVelocity: 'slow',
      hiringFreezeScore: 0.55,
    },
    roleRiskMap: {
      softwareEngineer: 0.32,
      productManager: 0.30,
      dataScientist: 0.28,
      designer: 0.32,
      hrRecruiter: 0.78,
      sales: 0.58,
    },
    aiExposureIndex: 0.65,
    marketRiskScore: 0.42,
    companyRiskScore: 0.50,
    confidenceScore: 0.90,
    lastUpdated: '2026-04-16',
  },

  // ── GROWTH-STAGE SaaS ─────────────────────────────────────────────────────

  notion: {
    companyName: 'Notion',
    industry: 'SaaS / Productivity',
    companySize: 'mid',
    stage: 'growth',
    financialSignals: {
      revenueTrend: 'growing',
      fundingStage: 'series_c',
      monthsSinceLastFunding: 14,
      burnRateEstimate: 'moderate',
    },
    layoffHistory: {
      totalLayoffs: 0,
      lastLayoffDate: 'none',
      layoffFrequency: 'none',
      affectedDepartments: [],
    },
    hiringSignals: {
      hiringVelocity: 'moderate',
      hiringFreezeScore: 0.25,
    },
    roleRiskMap: {
      softwareEngineer: 0.22,
      productManager: 0.20,
      dataScientist: 0.25,
      designer: 0.18,
      hrRecruiter: 0.40,
      sales: 0.35,
    },
    aiExposureIndex: 0.68,
    marketRiskScore: 0.38,
    companyRiskScore: 0.28,
    confidenceScore: 0.78,
    lastUpdated: '2026-04-16',
  },

  figma: {
    companyName: 'Figma',
    industry: 'SaaS / Design Tools',
    companySize: 'mid',
    stage: 'growth',
    financialSignals: {
      revenueTrend: 'growing',
      fundingStage: 'series_d',
      monthsSinceLastFunding: 18,
      burnRateEstimate: 'moderate',
    },
    layoffHistory: {
      totalLayoffs: 0,
      lastLayoffDate: 'none',
      layoffFrequency: 'none',
      affectedDepartments: [],
    },
    hiringSignals: {
      hiringVelocity: 'moderate',
      hiringFreezeScore: 0.28,
    },
    roleRiskMap: {
      softwareEngineer: 0.20,
      productManager: 0.18,
      dataScientist: 0.22,
      designer: 0.15,
      hrRecruiter: 0.42,
      sales: 0.38,
    },
    aiExposureIndex: 0.72,
    marketRiskScore: 0.40,
    companyRiskScore: 0.30,
    confidenceScore: 0.80,
    lastUpdated: '2026-04-16',
  },

  vercel: {
    companyName: 'Vercel',
    industry: 'Developer Infrastructure / SaaS',
    companySize: 'mid',
    stage: 'growth',
    financialSignals: {
      revenueTrend: 'growing',
      fundingStage: 'series_c',
      monthsSinceLastFunding: 10,
      burnRateEstimate: 'moderate',
    },
    layoffHistory: {
      totalLayoffs: 0,
      lastLayoffDate: 'none',
      layoffFrequency: 'none',
      affectedDepartments: [],
    },
    hiringSignals: {
      hiringVelocity: 'aggressive',
      hiringFreezeScore: 0.10,
    },
    roleRiskMap: {
      softwareEngineer: 0.15,
      productManager: 0.18,
      dataScientist: 0.20,
      designer: 0.18,
      hrRecruiter: 0.30,
      sales: 0.28,
    },
    aiExposureIndex: 0.75,
    marketRiskScore: 0.35,
    companyRiskScore: 0.22,
    confidenceScore: 0.78,
    lastUpdated: '2026-04-16',
  },

  slack: {
    companyName: 'Slack (Salesforce)',
    industry: 'SaaS / Team Communication',
    companySize: 'large',
    stage: 'restructuring',
    financialSignals: {
      revenueTrend: 'stable',
      fundingStage: 'public',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'low',
    },
    layoffHistory: {
      totalLayoffs: 500,
      lastLayoffDate: '2023-02-08',
      layoffFrequency: 'rare',
      affectedDepartments: ['operations', 'hr', 'support'],
    },
    hiringSignals: {
      hiringVelocity: 'slow',
      hiringFreezeScore: 0.55,
    },
    roleRiskMap: {
      softwareEngineer: 0.30,
      productManager: 0.28,
      dataScientist: 0.30,
      designer: 0.30,
      hrRecruiter: 0.72,
      sales: 0.58,
    },
    aiExposureIndex: 0.70,
    marketRiskScore: 0.42,
    companyRiskScore: 0.48,
    confidenceScore: 0.85,
    lastUpdated: '2026-04-16',
  },

  zoom: {
    companyName: 'Zoom',
    industry: 'SaaS / Video Communications',
    companySize: 'large',
    stage: 'declining',
    financialSignals: {
      revenueTrend: 'declining',
      fundingStage: 'public',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'moderate',
    },
    layoffHistory: {
      totalLayoffs: 1300,
      lastLayoffDate: '2023-02-07',
      layoffFrequency: 'moderate',
      affectedDepartments: ['sales', 'hr', 'support', 'marketing'],
    },
    hiringSignals: {
      hiringVelocity: 'slow',
      hiringFreezeScore: 0.68,
    },
    roleRiskMap: {
      softwareEngineer: 0.38,
      productManager: 0.40,
      dataScientist: 0.35,
      designer: 0.38,
      hrRecruiter: 0.85,
      sales: 0.72,
    },
    aiExposureIndex: 0.68,
    marketRiskScore: 0.58,
    companyRiskScore: 0.60,
    confidenceScore: 0.90,
    lastUpdated: '2026-04-16',
  },

  // ── IT SERVICES — INDIA ───────────────────────────────────────────────────

  tcs: {
    companyName: 'Tata Consultancy Services (TCS)',
    industry: 'IT Services',
    companySize: 'enterprise',
    stage: 'restructuring',
    financialSignals: {
      revenueTrend: 'stable',
      fundingStage: 'public',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'low',
    },
    layoffHistory: {
      totalLayoffs: 12000,
      lastLayoffDate: '2025-03-15',
      layoffFrequency: 'moderate',
      affectedDepartments: ['engineering', 'operations', 'support', 'qa'],
    },
    hiringSignals: {
      hiringVelocity: 'slow',
      hiringFreezeScore: 0.48,
    },
    roleRiskMap: {
      softwareEngineer: 0.42,
      productManager: 0.38,
      dataScientist: 0.38,
      designer: 0.42,
      hrRecruiter: 0.62,
      sales: 0.48,
    },
    aiExposureIndex: 0.60,
    marketRiskScore: 0.38,
    companyRiskScore: 0.48,
    confidenceScore: 0.90,
    lastUpdated: '2026-05-01',
  },

  infosys: {
    companyName: 'Infosys',
    industry: 'IT Services',
    companySize: 'enterprise',
    stage: 'restructuring',
    financialSignals: {
      revenueTrend: 'stable',
      fundingStage: 'public',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'low',
    },
    layoffHistory: {
      totalLayoffs: 7500,
      lastLayoffDate: '2025-01-10',
      layoffFrequency: 'moderate',
      affectedDepartments: ['engineering', 'support', 'qa', 'operations'],
    },
    hiringSignals: {
      hiringVelocity: 'slow',
      hiringFreezeScore: 0.52,
    },
    roleRiskMap: {
      softwareEngineer: 0.44,
      productManager: 0.40,
      dataScientist: 0.40,
      designer: 0.44,
      hrRecruiter: 0.68,
      sales: 0.50,
    },
    aiExposureIndex: 0.62,
    marketRiskScore: 0.40,
    companyRiskScore: 0.50,
    confidenceScore: 0.90,
    lastUpdated: '2026-05-01',
  },

  wipro: {
    companyName: 'Wipro',
    industry: 'IT Services',
    companySize: 'enterprise',
    stage: 'declining',
    financialSignals: {
      revenueTrend: 'declining',
      fundingStage: 'public',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'low',
    },
    layoffHistory: {
      totalLayoffs: 10500,
      lastLayoffDate: '2025-02-20',
      layoffFrequency: 'frequent',
      affectedDepartments: ['engineering', 'support', 'operations', 'hr'],
    },
    hiringSignals: {
      hiringVelocity: 'frozen',
      hiringFreezeScore: 0.82,
    },
    roleRiskMap: {
      softwareEngineer: 0.52,
      productManager: 0.48,
      dataScientist: 0.46,
      designer: 0.52,
      hrRecruiter: 0.78,
      sales: 0.62,
    },
    aiExposureIndex: 0.64,
    marketRiskScore: 0.50,
    companyRiskScore: 0.68,
    confidenceScore: 0.88,
    lastUpdated: '2026-05-01',
  },

  // ── CONSUMER TECH / MEDIA ─────────────────────────────────────────────────

  netflix: {
    companyName: 'Netflix',
    industry: 'Media Streaming',
    companySize: 'large',
    stage: 'mature',
    financialSignals: {
      revenueTrend: 'growing',
      fundingStage: 'public',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'low',
    },
    layoffHistory: {
      totalLayoffs: 450,
      lastLayoffDate: '2022-06-23',
      layoffFrequency: 'rare',
      affectedDepartments: ['operations', 'support'],
    },
    hiringSignals: {
      hiringVelocity: 'moderate',
      hiringFreezeScore: 0.25,
    },
    roleRiskMap: {
      softwareEngineer: 0.22,
      productManager: 0.20,
      dataScientist: 0.18,
      designer: 0.22,
      hrRecruiter: 0.48,
      sales: 0.38,
    },
    aiExposureIndex: 0.65,
    marketRiskScore: 0.35,
    companyRiskScore: 0.28,
    confidenceScore: 0.92,
    lastUpdated: '2026-04-16',
  },

  spotify: {
    companyName: 'Spotify',
    industry: 'Music Streaming / Media',
    companySize: 'large',
    stage: 'restructuring',
    financialSignals: {
      revenueTrend: 'growing',
      fundingStage: 'public',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'moderate',
    },
    layoffHistory: {
      totalLayoffs: 2300,
      lastLayoffDate: '2024-01-23',
      layoffFrequency: 'moderate',
      affectedDepartments: ['podcast', 'operations', 'sales', 'hr'],
    },
    hiringSignals: {
      hiringVelocity: 'slow',
      hiringFreezeScore: 0.62,
    },
    roleRiskMap: {
      softwareEngineer: 0.35,
      productManager: 0.32,
      dataScientist: 0.30,
      designer: 0.35,
      hrRecruiter: 0.80,
      sales: 0.65,
    },
    aiExposureIndex: 0.68,
    marketRiskScore: 0.48,
    companyRiskScore: 0.52,
    confidenceScore: 0.90,
    lastUpdated: '2026-04-16',
  },

  airbnb: {
    companyName: 'Airbnb',
    industry: 'Travel / Marketplace',
    companySize: 'large',
    stage: 'mature',
    financialSignals: {
      revenueTrend: 'growing',
      fundingStage: 'public',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'low',
    },
    layoffHistory: {
      totalLayoffs: 1900,
      lastLayoffDate: '2020-05-05',
      layoffFrequency: 'rare',
      affectedDepartments: ['operations', 'support', 'marketing'],
    },
    hiringSignals: {
      hiringVelocity: 'moderate',
      hiringFreezeScore: 0.22,
    },
    roleRiskMap: {
      softwareEngineer: 0.22,
      productManager: 0.20,
      dataScientist: 0.22,
      designer: 0.20,
      hrRecruiter: 0.48,
      sales: 0.38,
    },
    aiExposureIndex: 0.55,
    marketRiskScore: 0.35,
    companyRiskScore: 0.28,
    confidenceScore: 0.88,
    lastUpdated: '2026-04-16',
  },

  uber: {
    companyName: 'Uber',
    industry: 'Transportation / Delivery',
    companySize: 'enterprise',
    stage: 'mature',
    financialSignals: {
      revenueTrend: 'growing',
      fundingStage: 'public',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'moderate',
    },
    layoffHistory: {
      totalLayoffs: 7000,
      lastLayoffDate: '2020-10-14',
      layoffFrequency: 'rare',
      affectedDepartments: ['operations', 'support', 'hr', 'freight'],
    },
    hiringSignals: {
      hiringVelocity: 'moderate',
      hiringFreezeScore: 0.28,
    },
    roleRiskMap: {
      softwareEngineer: 0.25,
      productManager: 0.22,
      dataScientist: 0.20,
      designer: 0.27,
      hrRecruiter: 0.52,
      sales: 0.42,
    },
    aiExposureIndex: 0.58,
    marketRiskScore: 0.38,
    companyRiskScore: 0.32,
    confidenceScore: 0.90,
    lastUpdated: '2026-04-16',
  },

  // ── ENTERPRISE AI TOOLS ───────────────────────────────────────────────────

  palantir: {
    companyName: 'Palantir',
    industry: 'AI / Data Analytics / Defense',
    companySize: 'large',
    stage: 'mature',
    financialSignals: {
      revenueTrend: 'growing',
      fundingStage: 'public',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'low',
    },
    layoffHistory: {
      totalLayoffs: 0,
      lastLayoffDate: 'none',
      layoffFrequency: 'none',
      affectedDepartments: [],
    },
    hiringSignals: {
      hiringVelocity: 'moderate',
      hiringFreezeScore: 0.22,
    },
    roleRiskMap: {
      softwareEngineer: 0.20,
      productManager: 0.22,
      dataScientist: 0.15,
      designer: 0.28,
      hrRecruiter: 0.42,
      sales: 0.35,
    },
    aiExposureIndex: 0.75,
    marketRiskScore: 0.30,
    companyRiskScore: 0.25,
    confidenceScore: 0.85,
    lastUpdated: '2026-04-16',
  },

  datadog: {
    companyName: 'Datadog',
    industry: 'SaaS / Observability / DevOps',
    companySize: 'large',
    stage: 'growth',
    financialSignals: {
      revenueTrend: 'growing',
      fundingStage: 'public',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'low',
    },
    layoffHistory: {
      totalLayoffs: 0,
      lastLayoffDate: 'none',
      layoffFrequency: 'none',
      affectedDepartments: [],
    },
    hiringSignals: {
      hiringVelocity: 'moderate',
      hiringFreezeScore: 0.20,
    },
    roleRiskMap: {
      softwareEngineer: 0.20,
      productManager: 0.22,
      dataScientist: 0.18,
      designer: 0.25,
      hrRecruiter: 0.40,
      sales: 0.35,
    },
    aiExposureIndex: 0.65,
    marketRiskScore: 0.30,
    companyRiskScore: 0.22,
    confidenceScore: 0.88,
    lastUpdated: '2026-04-16',
  },

  // ── ENTERPRISE SOFTWARE / LEGACY ──────────────────────────────────────────

  ibm: {
    companyName: 'IBM',
    industry: 'Enterprise Technology / AI',
    companySize: 'enterprise',
    stage: 'restructuring',
    financialSignals: {
      revenueTrend: 'stable',
      fundingStage: 'public',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'low',
    },
    layoffHistory: {
      totalLayoffs: 3900,
      lastLayoffDate: '2023-01-26',
      layoffFrequency: 'moderate',
      affectedDepartments: ['hr', 'finance', 'operations', 'support'],
    },
    hiringSignals: {
      hiringVelocity: 'slow',
      hiringFreezeScore: 0.55,
    },
    roleRiskMap: {
      softwareEngineer: 0.40,
      productManager: 0.38,
      dataScientist: 0.35,
      designer: 0.42,
      hrRecruiter: 0.78,
      sales: 0.62,
    },
    aiExposureIndex: 0.65,
    marketRiskScore: 0.42,
    companyRiskScore: 0.52,
    confidenceScore: 0.92,
    lastUpdated: '2026-04-16',
  },

  intel: {
    companyName: 'Intel',
    industry: 'Semiconductors / Hardware',
    companySize: 'enterprise',
    stage: 'declining',
    financialSignals: {
      revenueTrend: 'declining',
      fundingStage: 'public',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'high',
    },
    layoffHistory: {
      totalLayoffs: 15000,
      lastLayoffDate: '2024-08-01',
      layoffFrequency: 'frequent',
      affectedDepartments: ['engineering', 'manufacturing', 'sales', 'operations', 'hr'],
    },
    hiringSignals: {
      hiringVelocity: 'frozen',
      hiringFreezeScore: 0.92,
    },
    roleRiskMap: {
      softwareEngineer: 0.50,
      productManager: 0.52,
      dataScientist: 0.48,
      designer: 0.52,
      hrRecruiter: 0.92,
      sales: 0.78,
    },
    aiExposureIndex: 0.55,
    marketRiskScore: 0.65,
    companyRiskScore: 0.78,
    confidenceScore: 0.92,
    lastUpdated: '2026-04-16',
  },

  // ── GROWTH SaaS — SECURITY & DEV TOOLS ───────────────────────────────────

  github: {
    companyName: 'GitHub (Microsoft)',
    industry: 'Developer Tools / SaaS',
    companySize: 'large',
    stage: 'growth',
    financialSignals: {
      revenueTrend: 'growing',
      fundingStage: 'public',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'low',
    },
    layoffHistory: {
      totalLayoffs: 0,
      lastLayoffDate: 'none',
      layoffFrequency: 'none',
      affectedDepartments: [],
    },
    hiringSignals: {
      hiringVelocity: 'moderate',
      hiringFreezeScore: 0.20,
    },
    roleRiskMap: {
      softwareEngineer: 0.18,
      productManager: 0.20,
      dataScientist: 0.20,
      designer: 0.22,
      hrRecruiter: 0.38,
      sales: 0.32,
    },
    aiExposureIndex: 0.82,
    marketRiskScore: 0.28,
    companyRiskScore: 0.22,
    confidenceScore: 0.88,
    lastUpdated: '2026-04-16',
  },

  crowdstrike: {
    companyName: 'CrowdStrike',
    industry: 'Cybersecurity / SaaS',
    companySize: 'large',
    stage: 'growth',
    financialSignals: {
      revenueTrend: 'growing',
      fundingStage: 'public',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'moderate',
    },
    layoffHistory: {
      totalLayoffs: 500,
      lastLayoffDate: '2024-08-20',
      layoffFrequency: 'rare',
      affectedDepartments: ['operations', 'support'],
    },
    hiringSignals: {
      hiringVelocity: 'moderate',
      hiringFreezeScore: 0.30,
    },
    roleRiskMap: {
      softwareEngineer: 0.20,
      productManager: 0.22,
      dataScientist: 0.18,
      designer: 0.25,
      hrRecruiter: 0.48,
      sales: 0.38,
    },
    aiExposureIndex: 0.62,
    marketRiskScore: 0.30,
    companyRiskScore: 0.28,
    confidenceScore: 0.88,
    lastUpdated: '2026-04-16',
  },

  palo_alto_networks: {
    companyName: 'Palo Alto Networks',
    industry: 'Cybersecurity / Enterprise SaaS',
    companySize: 'large',
    stage: 'growth',
    financialSignals: {
      revenueTrend: 'growing',
      fundingStage: 'public',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'low',
    },
    layoffHistory: {
      totalLayoffs: 0,
      lastLayoffDate: 'none',
      layoffFrequency: 'none',
      affectedDepartments: [],
    },
    hiringSignals: {
      hiringVelocity: 'moderate',
      hiringFreezeScore: 0.18,
    },
    roleRiskMap: {
      softwareEngineer: 0.20,
      productManager: 0.20,
      dataScientist: 0.18,
      designer: 0.24,
      hrRecruiter: 0.40,
      sales: 0.35,
    },
    aiExposureIndex: 0.60,
    marketRiskScore: 0.28,
    companyRiskScore: 0.22,
    confidenceScore: 0.88,
    lastUpdated: '2026-04-16',
  },

  // ── ELECTRIC VEHICLE / MANUFACTURING ─────────────────────────────────────

  tesla: {
    companyName: 'Tesla',
    industry: 'EV / Manufacturing / AI',
    companySize: 'enterprise',
    stage: 'restructuring',
    financialSignals: {
      revenueTrend: 'declining',
      fundingStage: 'public',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'moderate',
    },
    layoffHistory: {
      totalLayoffs: 14000,
      lastLayoffDate: '2024-04-15',
      layoffFrequency: 'frequent',
      affectedDepartments: ['engineering', 'energy', 'sales', 'recruiting', 'hr', 'support'],
    },
    hiringSignals: {
      hiringVelocity: 'slow',
      hiringFreezeScore: 0.70,
    },
    roleRiskMap: {
      softwareEngineer: 0.42,
      productManager: 0.45,
      dataScientist: 0.38,
      designer: 0.42,
      hrRecruiter: 0.90,
      sales: 0.72,
    },
    aiExposureIndex: 0.70,
    marketRiskScore: 0.55,
    companyRiskScore: 0.68,
    confidenceScore: 0.92,
    lastUpdated: '2026-04-16',
  },

  // ── CONSULTING / GSI ──────────────────────────────────────────────────────

  accenture: {
    companyName: 'Accenture',
    industry: 'Consulting / IT Services',
    companySize: 'enterprise',
    stage: 'restructuring',
    financialSignals: {
      revenueTrend: 'stable',
      fundingStage: 'public',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'low',
    },
    layoffHistory: {
      totalLayoffs: 19000,
      lastLayoffDate: '2023-03-23',
      layoffFrequency: 'moderate',
      affectedDepartments: ['consulting', 'operations', 'support', 'hr'],
    },
    hiringSignals: {
      hiringVelocity: 'slow',
      hiringFreezeScore: 0.52,
    },
    roleRiskMap: {
      softwareEngineer: 0.38,
      productManager: 0.35,
      dataScientist: 0.32,
      designer: 0.40,
      hrRecruiter: 0.72,
      sales: 0.55,
    },
    aiExposureIndex: 0.62,
    marketRiskScore: 0.40,
    companyRiskScore: 0.50,
    confidenceScore: 0.90,
    lastUpdated: '2026-04-16',
  },

  mckinsey: {
    companyName: 'McKinsey & Company',
    industry: 'Management Consulting',
    companySize: 'large',
    stage: 'mature',
    financialSignals: {
      revenueTrend: 'stable',
      fundingStage: 'bootstrapped',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'low',
    },
    layoffHistory: {
      totalLayoffs: 1400,
      lastLayoffDate: '2023-12-05',
      layoffFrequency: 'rare',
      affectedDepartments: ['operations', 'support', 'hr'],
    },
    hiringSignals: {
      hiringVelocity: 'moderate',
      hiringFreezeScore: 0.28,
    },
    roleRiskMap: {
      softwareEngineer: 0.28,
      productManager: 0.25,
      dataScientist: 0.22,
      designer: 0.30,
      hrRecruiter: 0.58,
      sales: 0.40,
    },
    aiExposureIndex: 0.55,
    marketRiskScore: 0.32,
    companyRiskScore: 0.32,
    confidenceScore: 0.82,
    lastUpdated: '2026-04-16',
  },

  // ── EMERGING AI-NATIVE ─────────────────────────────────────────────────────

  cohere: {
    companyName: 'Cohere',
    industry: 'AI / NLP / Enterprise LLMs',
    companySize: 'mid',
    stage: 'growth',
    financialSignals: {
      revenueTrend: 'growing',
      fundingStage: 'series_d',
      monthsSinceLastFunding: 7,
      burnRateEstimate: 'high',
    },
    layoffHistory: {
      totalLayoffs: 0,
      lastLayoffDate: 'none',
      layoffFrequency: 'none',
      affectedDepartments: [],
    },
    hiringSignals: {
      hiringVelocity: 'aggressive',
      hiringFreezeScore: 0.08,
    },
    roleRiskMap: {
      softwareEngineer: 0.12,
      productManager: 0.15,
      dataScientist: 0.10,
      designer: 0.20,
      hrRecruiter: 0.28,
      sales: 0.25,
    },
    aiExposureIndex: 0.90,
    marketRiskScore: 0.52,
    companyRiskScore: 0.22,
    confidenceScore: 0.75,
    lastUpdated: '2026-04-16',
  },

  mistral: {
    companyName: 'Mistral AI',
    industry: 'AI / Open-Weight LLMs',
    companySize: 'small',
    stage: 'startup',
    financialSignals: {
      revenueTrend: 'growing',
      fundingStage: 'series_b',
      monthsSinceLastFunding: 5,
      burnRateEstimate: 'high',
    },
    layoffHistory: {
      totalLayoffs: 0,
      lastLayoffDate: 'none',
      layoffFrequency: 'none',
      affectedDepartments: [],
    },
    hiringSignals: {
      hiringVelocity: 'aggressive',
      hiringFreezeScore: 0.05,
    },
    roleRiskMap: {
      softwareEngineer: 0.10,
      productManager: 0.12,
      dataScientist: 0.08,
      designer: 0.18,
      hrRecruiter: 0.22,
      sales: 0.20,
    },
    aiExposureIndex: 0.92,
    marketRiskScore: 0.55,
    companyRiskScore: 0.20,
    confidenceScore: 0.70,
    lastUpdated: '2026-04-16',
  },

  hugging_face: {
    companyName: 'Hugging Face',
    industry: 'AI / Developer Tools / ML Platform',
    companySize: 'mid',
    stage: 'growth',
    financialSignals: {
      revenueTrend: 'growing',
      fundingStage: 'series_c',
      monthsSinceLastFunding: 12,
      burnRateEstimate: 'moderate',
    },
    layoffHistory: {
      totalLayoffs: 0,
      lastLayoffDate: 'none',
      layoffFrequency: 'none',
      affectedDepartments: [],
    },
    hiringSignals: {
      hiringVelocity: 'moderate',
      hiringFreezeScore: 0.12,
    },
    roleRiskMap: {
      softwareEngineer: 0.15,
      productManager: 0.18,
      dataScientist: 0.10,
      designer: 0.20,
      hrRecruiter: 0.30,
      sales: 0.25,
    },
    aiExposureIndex: 0.88,
    marketRiskScore: 0.48,
    companyRiskScore: 0.22,
    confidenceScore: 0.78,
    lastUpdated: '2026-04-16',
  },

  // ── E-COMMERCE / MARKETPLACE ──────────────────────────────────────────────

  wayfair: {
    companyName: 'Wayfair',
    industry: 'E-Commerce / Home Goods',
    companySize: 'large',
    stage: 'declining',
    financialSignals: {
      revenueTrend: 'declining',
      fundingStage: 'public',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'high',
    },
    layoffHistory: {
      totalLayoffs: 3000,
      lastLayoffDate: '2024-01-19',
      layoffFrequency: 'frequent',
      affectedDepartments: ['engineering', 'operations', 'support', 'marketing', 'hr'],
    },
    hiringSignals: {
      hiringVelocity: 'frozen',
      hiringFreezeScore: 0.90,
    },
    roleRiskMap: {
      softwareEngineer: 0.50,
      productManager: 0.55,
      dataScientist: 0.48,
      designer: 0.52,
      hrRecruiter: 0.92,
      sales: 0.80,
    },
    aiExposureIndex: 0.60,
    marketRiskScore: 0.62,
    companyRiskScore: 0.78,
    confidenceScore: 0.88,
    lastUpdated: '2026-04-16',
  },

  // ── REMAINING PHASE 1 COMPANIES ───────────────────────────────────────────

  atlassian: {
    companyName: 'Atlassian',
    industry: 'Developer SaaS / Project Management',
    companySize: 'large',
    stage: 'restructuring',
    financialSignals: {
      revenueTrend: 'stable',
      fundingStage: 'public',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'moderate',
    },
    layoffHistory: {
      totalLayoffs: 500,
      lastLayoffDate: '2023-04-28',
      layoffFrequency: 'rare',
      affectedDepartments: ['operations', 'support', 'recruiting'],
    },
    hiringSignals: {
      hiringVelocity: 'slow',
      hiringFreezeScore: 0.50,
    },
    roleRiskMap: {
      softwareEngineer: 0.28,
      productManager: 0.25,
      dataScientist: 0.28,
      designer: 0.28,
      hrRecruiter: 0.68,
      sales: 0.52,
    },
    aiExposureIndex: 0.65,
    marketRiskScore: 0.38,
    companyRiskScore: 0.42,
    confidenceScore: 0.88,
    lastUpdated: '2026-04-16',
  },

  twilio: {
    companyName: 'Twilio',
    industry: 'SaaS / Communications API',
    companySize: 'large',
    stage: 'declining',
    financialSignals: {
      revenueTrend: 'stable',
      fundingStage: 'public',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'high',
    },
    layoffHistory: {
      totalLayoffs: 2400,
      lastLayoffDate: '2023-02-13',
      layoffFrequency: 'frequent',
      affectedDepartments: ['sales', 'engineering', 'hr', 'operations', 'marketing'],
    },
    hiringSignals: {
      hiringVelocity: 'frozen',
      hiringFreezeScore: 0.88,
    },
    roleRiskMap: {
      softwareEngineer: 0.50,
      productManager: 0.52,
      dataScientist: 0.48,
      designer: 0.52,
      hrRecruiter: 0.90,
      sales: 0.78,
    },
    aiExposureIndex: 0.70,
    marketRiskScore: 0.58,
    companyRiskScore: 0.72,
    confidenceScore: 0.88,
    lastUpdated: '2026-04-16',
  },

  docusign: {
    companyName: 'DocuSign',
    industry: 'SaaS / e-Signature',
    companySize: 'large',
    stage: 'declining',
    financialSignals: {
      revenueTrend: 'stable',
      fundingStage: 'public',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'moderate',
    },
    layoffHistory: {
      totalLayoffs: 1800,
      lastLayoffDate: '2024-02-07',
      layoffFrequency: 'moderate',
      affectedDepartments: ['sales', 'marketing', 'hr', 'operations'],
    },
    hiringSignals: {
      hiringVelocity: 'frozen',
      hiringFreezeScore: 0.82,
    },
    roleRiskMap: {
      softwareEngineer: 0.42,
      productManager: 0.45,
      dataScientist: 0.40,
      designer: 0.44,
      hrRecruiter: 0.88,
      sales: 0.75,
    },
    aiExposureIndex: 0.68,
    marketRiskScore: 0.52,
    companyRiskScore: 0.65,
    confidenceScore: 0.88,
    lastUpdated: '2026-04-16',
  },

  dropbox: {
    companyName: 'Dropbox',
    industry: 'SaaS / Cloud Storage',
    companySize: 'large',
    stage: 'declining',
    financialSignals: {
      revenueTrend: 'stable',
      fundingStage: 'public',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'moderate',
    },
    layoffHistory: {
      totalLayoffs: 960,
      lastLayoffDate: '2024-02-29',
      layoffFrequency: 'moderate',
      affectedDepartments: ['engineering', 'support', 'hr', 'operations'],
    },
    hiringSignals: {
      hiringVelocity: 'frozen',
      hiringFreezeScore: 0.85,
    },
    roleRiskMap: {
      softwareEngineer: 0.50,
      productManager: 0.52,
      dataScientist: 0.48,
      designer: 0.50,
      hrRecruiter: 0.90,
      sales: 0.72,
    },
    aiExposureIndex: 0.72,
    marketRiskScore: 0.58,
    companyRiskScore: 0.68,
    confidenceScore: 0.88,
    lastUpdated: '2026-04-16',
  },

  stripe_atlas: {
    companyName: 'PayPal',
    industry: 'Fintech / Payments',
    companySize: 'enterprise',
    stage: 'declining',
    financialSignals: {
      revenueTrend: 'stable',
      fundingStage: 'public',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'moderate',
    },
    layoffHistory: {
      totalLayoffs: 9000,
      lastLayoffDate: '2024-01-26',
      layoffFrequency: 'frequent',
      affectedDepartments: ['engineering', 'operations', 'sales', 'hr', 'support'],
    },
    hiringSignals: {
      hiringVelocity: 'frozen',
      hiringFreezeScore: 0.88,
    },
    roleRiskMap: {
      softwareEngineer: 0.48,
      productManager: 0.50,
      dataScientist: 0.44,
      designer: 0.48,
      hrRecruiter: 0.92,
      sales: 0.78,
    },
    aiExposureIndex: 0.65,
    marketRiskScore: 0.55,
    companyRiskScore: 0.72,
    confidenceScore: 0.92,
    lastUpdated: '2026-04-16',
  },

  bytedance: {
    companyName: 'ByteDance (TikTok)',
    industry: 'Social Media / AI / Consumer Tech',
    companySize: 'enterprise',
    stage: 'growth',
    financialSignals: {
      revenueTrend: 'growing',
      fundingStage: 'pre_ipo',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'moderate',
    },
    layoffHistory: {
      totalLayoffs: 0,
      lastLayoffDate: 'none',
      layoffFrequency: 'none',
      affectedDepartments: [],
    },
    hiringSignals: {
      hiringVelocity: 'moderate',
      hiringFreezeScore: 0.25,
    },
    roleRiskMap: {
      softwareEngineer: 0.22,
      productManager: 0.20,
      dataScientist: 0.18,
      designer: 0.22,
      hrRecruiter: 0.45,
      sales: 0.38,
    },
    aiExposureIndex: 0.78,
    marketRiskScore: 0.52,
    companyRiskScore: 0.38,
    confidenceScore: 0.78,
    lastUpdated: '2026-04-16',
  },

  samsung: {
    companyName: 'Samsung Electronics',
    industry: 'Consumer Electronics / Semiconductors',
    companySize: 'enterprise',
    stage: 'mature',
    financialSignals: {
      revenueTrend: 'stable',
      fundingStage: 'public',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'low',
    },
    layoffHistory: {
      totalLayoffs: 0,
      lastLayoffDate: 'none',
      layoffFrequency: 'rare',
      affectedDepartments: ['manufacturing'],
    },
    hiringSignals: {
      hiringVelocity: 'moderate',
      hiringFreezeScore: 0.30,
    },
    roleRiskMap: {
      softwareEngineer: 0.28,
      productManager: 0.28,
      dataScientist: 0.28,
      designer: 0.25,
      hrRecruiter: 0.42,
      sales: 0.38,
    },
    aiExposureIndex: 0.55,
    marketRiskScore: 0.35,
    companyRiskScore: 0.30,
    confidenceScore: 0.88,
    lastUpdated: '2026-04-16',
  },

  unity: {
    companyName: 'Unity Technologies',
    industry: 'Game Engine / Developer Tools',
    companySize: 'large',
    stage: 'declining',
    financialSignals: {
      revenueTrend: 'declining',
      fundingStage: 'public',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'high',
    },
    layoffHistory: {
      totalLayoffs: 2600,
      lastLayoffDate: '2024-01-08',
      layoffFrequency: 'frequent',
      affectedDepartments: ['engineering', 'marketing', 'sales', 'hr', 'operations'],
    },
    hiringSignals: {
      hiringVelocity: 'frozen',
      hiringFreezeScore: 0.92,
    },
    roleRiskMap: {
      softwareEngineer: 0.52,
      productManager: 0.55,
      dataScientist: 0.50,
      designer: 0.52,
      hrRecruiter: 0.92,
      sales: 0.80,
    },
    aiExposureIndex: 0.68,
    marketRiskScore: 0.65,
    companyRiskScore: 0.80,
    confidenceScore: 0.88,
    lastUpdated: '2026-04-16',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // PHASE 2 — EXPANDED GLOBAL COVERAGE
  // Indian IT · European Fintech · SEA Tech · Big Tech Gaps ·
  // RPA/Automation · EdTech · Enterprise Software · Notable Declines
  // ══════════════════════════════════════════════════════════════════════════

  // ── BIG TECH GAPS ─────────────────────────────────────────────────────────

  adobe: {
    companyName: 'Adobe',
    industry: 'Creative SaaS / Digital Media',
    companySize: 'enterprise',
    stage: 'mature',
    financialSignals: {
      revenueTrend: 'growing',
      fundingStage: 'public',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'low',
    },
    layoffHistory: {
      totalLayoffs: 100,
      lastLayoffDate: '2023-12-13',
      layoffFrequency: 'rare',
      affectedDepartments: ['operations'],
    },
    hiringSignals: {
      hiringVelocity: 'moderate',
      hiringFreezeScore: 0.25,
    },
    roleRiskMap: {
      softwareEngineer: 0.24,
      productManager: 0.22,
      dataScientist: 0.22,
      designer: 0.20,
      hrRecruiter: 0.48,
      sales: 0.40,
    },
    aiExposureIndex: 0.72,
    marketRiskScore: 0.28,
    companyRiskScore: 0.28,
    confidenceScore: 0.92,
    lastUpdated: '2026-04-16',
  },

  cisco: {
    companyName: 'Cisco Systems',
    industry: 'Enterprise Networking / Security',
    companySize: 'enterprise',
    stage: 'restructuring',
    financialSignals: {
      revenueTrend: 'stable',
      fundingStage: 'public',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'low',
    },
    layoffHistory: {
      totalLayoffs: 4250,
      lastLayoffDate: '2024-02-14',
      layoffFrequency: 'moderate',
      affectedDepartments: ['engineering', 'sales', 'hr', 'operations'],
    },
    hiringSignals: {
      hiringVelocity: 'slow',
      hiringFreezeScore: 0.58,
    },
    roleRiskMap: {
      softwareEngineer: 0.35,
      productManager: 0.32,
      dataScientist: 0.30,
      designer: 0.36,
      hrRecruiter: 0.78,
      sales: 0.62,
    },
    aiExposureIndex: 0.60,
    marketRiskScore: 0.40,
    companyRiskScore: 0.50,
    confidenceScore: 0.92,
    lastUpdated: '2026-04-16',
  },

  qualcomm: {
    companyName: 'Qualcomm',
    industry: 'Semiconductors / Mobile AI',
    companySize: 'enterprise',
    stage: 'restructuring',
    financialSignals: {
      revenueTrend: 'stable',
      fundingStage: 'public',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'low',
    },
    layoffHistory: {
      totalLayoffs: 1258,
      lastLayoffDate: '2023-01-26',
      layoffFrequency: 'rare',
      affectedDepartments: ['engineering', 'operations'],
    },
    hiringSignals: {
      hiringVelocity: 'slow',
      hiringFreezeScore: 0.45,
    },
    roleRiskMap: {
      softwareEngineer: 0.28,
      productManager: 0.28,
      dataScientist: 0.25,
      designer: 0.32,
      hrRecruiter: 0.60,
      sales: 0.48,
    },
    aiExposureIndex: 0.70,
    marketRiskScore: 0.38,
    companyRiskScore: 0.40,
    confidenceScore: 0.90,
    lastUpdated: '2026-04-16',
  },

  broadcom: {
    companyName: 'Broadcom',
    industry: 'Semiconductors / Enterprise Software',
    companySize: 'enterprise',
    stage: 'restructuring',
    financialSignals: {
      revenueTrend: 'growing',
      fundingStage: 'public',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'low',
    },
    layoffHistory: {
      totalLayoffs: 2800,
      lastLayoffDate: '2023-11-22',
      layoffFrequency: 'moderate',
      affectedDepartments: ['engineering', 'hr', 'sales', 'operations'],
    },
    hiringSignals: {
      hiringVelocity: 'slow',
      hiringFreezeScore: 0.55,
    },
    roleRiskMap: {
      softwareEngineer: 0.38,
      productManager: 0.36,
      dataScientist: 0.32,
      designer: 0.40,
      hrRecruiter: 0.80,
      sales: 0.65,
    },
    aiExposureIndex: 0.58,
    marketRiskScore: 0.38,
    companyRiskScore: 0.50,
    confidenceScore: 0.88,
    lastUpdated: '2026-04-16',
  },

  // ── INDIAN IT SERVICES — EXPANDED ─────────────────────────────────────────

  hcl_tech: {
    companyName: 'HCLTechnologies',
    industry: 'IT Services',
    companySize: 'enterprise',
    stage: 'mature',
    financialSignals: {
      revenueTrend: 'growing',
      fundingStage: 'public',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'low',
    },
    layoffHistory: {
      totalLayoffs: 0,
      lastLayoffDate: 'none',
      layoffFrequency: 'none',
      affectedDepartments: [],
    },
    hiringSignals: {
      hiringVelocity: 'moderate',
      hiringFreezeScore: 0.28,
    },
    roleRiskMap: {
      softwareEngineer: 0.40,
      productManager: 0.38,
      dataScientist: 0.36,
      designer: 0.42,
      hrRecruiter: 0.52,
      sales: 0.45,
    },
    aiExposureIndex: 0.58,
    marketRiskScore: 0.35,
    companyRiskScore: 0.35,
    confidenceScore: 0.88,
    lastUpdated: '2026-04-16',
  },

  tech_mahindra: {
    companyName: 'Tech Mahindra',
    industry: 'IT Services / Telecom Tech',
    companySize: 'enterprise',
    stage: 'restructuring',
    financialSignals: {
      revenueTrend: 'stable',
      fundingStage: 'public',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'low',
    },
    layoffHistory: {
      totalLayoffs: 0,
      lastLayoffDate: 'none',
      layoffFrequency: 'none',
      affectedDepartments: [],
    },
    hiringSignals: {
      hiringVelocity: 'slow',
      hiringFreezeScore: 0.50,
    },
    roleRiskMap: {
      softwareEngineer: 0.44,
      productManager: 0.42,
      dataScientist: 0.40,
      designer: 0.45,
      hrRecruiter: 0.56,
      sales: 0.48,
    },
    aiExposureIndex: 0.58,
    marketRiskScore: 0.40,
    companyRiskScore: 0.45,
    confidenceScore: 0.86,
    lastUpdated: '2026-04-16',
  },

  cognizant: {
    companyName: 'Cognizant Technology Solutions',
    industry: 'IT Services / BPO',
    companySize: 'enterprise',
    stage: 'restructuring',
    financialSignals: {
      revenueTrend: 'stable',
      fundingStage: 'public',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'low',
    },
    layoffHistory: {
      totalLayoffs: 3500,
      lastLayoffDate: '2023-10-11',
      layoffFrequency: 'moderate',
      affectedDepartments: ['operations', 'hr', 'support', 'recruiting'],
    },
    hiringSignals: {
      hiringVelocity: 'slow',
      hiringFreezeScore: 0.58,
    },
    roleRiskMap: {
      softwareEngineer: 0.45,
      productManager: 0.42,
      dataScientist: 0.40,
      designer: 0.46,
      hrRecruiter: 0.72,
      sales: 0.55,
    },
    aiExposureIndex: 0.60,
    marketRiskScore: 0.42,
    companyRiskScore: 0.52,
    confidenceScore: 0.88,
    lastUpdated: '2026-04-16',
  },

  capgemini: {
    companyName: 'Capgemini',
    industry: 'IT Services / Consulting',
    companySize: 'enterprise',
    stage: 'mature',
    financialSignals: {
      revenueTrend: 'stable',
      fundingStage: 'public',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'low',
    },
    layoffHistory: {
      totalLayoffs: 0,
      lastLayoffDate: 'none',
      layoffFrequency: 'none',
      affectedDepartments: [],
    },
    hiringSignals: {
      hiringVelocity: 'moderate',
      hiringFreezeScore: 0.30,
    },
    roleRiskMap: {
      softwareEngineer: 0.38,
      productManager: 0.36,
      dataScientist: 0.35,
      designer: 0.40,
      hrRecruiter: 0.50,
      sales: 0.44,
    },
    aiExposureIndex: 0.58,
    marketRiskScore: 0.35,
    companyRiskScore: 0.38,
    confidenceScore: 0.86,
    lastUpdated: '2026-04-16',
  },

  dxc_technology: {
    companyName: 'DXC Technology',
    industry: 'IT Services / Managed Services',
    companySize: 'enterprise',
    stage: 'declining',
    financialSignals: {
      revenueTrend: 'declining',
      fundingStage: 'public',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'high',
    },
    layoffHistory: {
      totalLayoffs: 9000,
      lastLayoffDate: '2023-08-01',
      layoffFrequency: 'frequent',
      affectedDepartments: ['engineering', 'operations', 'hr', 'support', 'consulting'],
    },
    hiringSignals: {
      hiringVelocity: 'frozen',
      hiringFreezeScore: 0.88,
    },
    roleRiskMap: {
      softwareEngineer: 0.55,
      productManager: 0.55,
      dataScientist: 0.50,
      designer: 0.55,
      hrRecruiter: 0.90,
      sales: 0.75,
    },
    aiExposureIndex: 0.60,
    marketRiskScore: 0.60,
    companyRiskScore: 0.75,
    confidenceScore: 0.85,
    lastUpdated: '2026-04-16',
  },

  // ── EUROPEAN FINTECH ──────────────────────────────────────────────────────

  klarna: {
    companyName: 'Klarna',
    industry: 'Fintech / BNPL',
    companySize: 'large',
    stage: 'restructuring',
    financialSignals: {
      revenueTrend: 'growing',
      fundingStage: 'pre_ipo',
      monthsSinceLastFunding: 10,
      burnRateEstimate: 'moderate',
    },
    layoffHistory: {
      totalLayoffs: 1400,
      lastLayoffDate: '2022-05-23',
      layoffFrequency: 'moderate',
      affectedDepartments: ['operations', 'hr', 'marketing', 'support'],
    },
    hiringSignals: {
      hiringVelocity: 'slow',
      hiringFreezeScore: 0.50,
    },
    roleRiskMap: {
      softwareEngineer: 0.30,
      productManager: 0.28,
      dataScientist: 0.28,
      designer: 0.32,
      hrRecruiter: 0.72,
      sales: 0.58,
    },
    aiExposureIndex: 0.72,
    marketRiskScore: 0.45,
    companyRiskScore: 0.45,
    confidenceScore: 0.82,
    lastUpdated: '2026-04-16',
  },

  revolut: {
    companyName: 'Revolut',
    industry: 'Fintech / Neobank',
    companySize: 'large',
    stage: 'growth',
    financialSignals: {
      revenueTrend: 'growing',
      fundingStage: 'series_d',
      monthsSinceLastFunding: 14,
      burnRateEstimate: 'moderate',
    },
    layoffHistory: {
      totalLayoffs: 0,
      lastLayoffDate: 'none',
      layoffFrequency: 'none',
      affectedDepartments: [],
    },
    hiringSignals: {
      hiringVelocity: 'moderate',
      hiringFreezeScore: 0.22,
    },
    roleRiskMap: {
      softwareEngineer: 0.22,
      productManager: 0.20,
      dataScientist: 0.20,
      designer: 0.25,
      hrRecruiter: 0.42,
      sales: 0.35,
    },
    aiExposureIndex: 0.65,
    marketRiskScore: 0.40,
    companyRiskScore: 0.28,
    confidenceScore: 0.78,
    lastUpdated: '2026-04-16',
  },

  n26: {
    companyName: 'N26',
    industry: 'Fintech / Neobank',
    companySize: 'mid',
    stage: 'declining',
    financialSignals: {
      revenueTrend: 'stable',
      fundingStage: 'series_d',
      monthsSinceLastFunding: 28,
      burnRateEstimate: 'high',
    },
    layoffHistory: {
      totalLayoffs: 300,
      lastLayoffDate: '2022-11-15',
      layoffFrequency: 'rare',
      affectedDepartments: ['operations', 'hr', 'support'],
    },
    hiringSignals: {
      hiringVelocity: 'slow',
      hiringFreezeScore: 0.70,
    },
    roleRiskMap: {
      softwareEngineer: 0.40,
      productManager: 0.42,
      dataScientist: 0.38,
      designer: 0.42,
      hrRecruiter: 0.82,
      sales: 0.68,
    },
    aiExposureIndex: 0.62,
    marketRiskScore: 0.52,
    companyRiskScore: 0.62,
    confidenceScore: 0.72,
    lastUpdated: '2026-04-16',
  },

  // ── SEA / APAC TECH ────────────────────────────────────────────────────────

  grab: {
    companyName: 'Grab',
    industry: 'Super App / Ridesharing / Fintech',
    companySize: 'large',
    stage: 'restructuring',
    financialSignals: {
      revenueTrend: 'growing',
      fundingStage: 'public',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'high',
    },
    layoffHistory: {
      totalLayoffs: 1000,
      lastLayoffDate: '2023-06-20',
      layoffFrequency: 'moderate',
      affectedDepartments: ['operations', 'engineering', 'hr', 'support'],
    },
    hiringSignals: {
      hiringVelocity: 'slow',
      hiringFreezeScore: 0.58,
    },
    roleRiskMap: {
      softwareEngineer: 0.35,
      productManager: 0.33,
      dataScientist: 0.30,
      designer: 0.36,
      hrRecruiter: 0.78,
      sales: 0.62,
    },
    aiExposureIndex: 0.62,
    marketRiskScore: 0.48,
    companyRiskScore: 0.52,
    confidenceScore: 0.80,
    lastUpdated: '2026-04-16',
  },

  sea_limited: {
    companyName: 'Sea Limited (Shopee / Garena)',
    industry: 'E-Commerce / Gaming / Fintech',
    companySize: 'enterprise',
    stage: 'declining',
    financialSignals: {
      revenueTrend: 'declining',
      fundingStage: 'public',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'high',
    },
    layoffHistory: {
      totalLayoffs: 7000,
      lastLayoffDate: '2023-03-15',
      layoffFrequency: 'frequent',
      affectedDepartments: ['engineering', 'operations', 'gaming', 'hr', 'support', 'marketing'],
    },
    hiringSignals: {
      hiringVelocity: 'frozen',
      hiringFreezeScore: 0.88,
    },
    roleRiskMap: {
      softwareEngineer: 0.52,
      productManager: 0.55,
      dataScientist: 0.48,
      designer: 0.52,
      hrRecruiter: 0.90,
      sales: 0.78,
    },
    aiExposureIndex: 0.62,
    marketRiskScore: 0.62,
    companyRiskScore: 0.75,
    confidenceScore: 0.82,
    lastUpdated: '2026-04-16',
  },

  // ── INDIAN CONSUMER TECH ──────────────────────────────────────────────────

  byjus: {
    companyName: "BYJU'S",
    industry: 'EdTech',
    companySize: 'enterprise',
    stage: 'declining',
    financialSignals: {
      revenueTrend: 'declining',
      fundingStage: 'series_d',
      monthsSinceLastFunding: 36,
      burnRateEstimate: 'very_high',
    },
    layoffHistory: {
      totalLayoffs: 10000,
      lastLayoffDate: '2023-10-01',
      layoffFrequency: 'frequent',
      affectedDepartments: ['sales', 'engineering', 'operations', 'hr', 'support', 'content'],
    },
    hiringSignals: {
      hiringVelocity: 'frozen',
      hiringFreezeScore: 0.98,
    },
    roleRiskMap: {
      softwareEngineer: 0.65,
      productManager: 0.68,
      dataScientist: 0.62,
      designer: 0.65,
      hrRecruiter: 0.95,
      sales: 0.90,
    },
    aiExposureIndex: 0.68,
    marketRiskScore: 0.72,
    companyRiskScore: 0.92,
    confidenceScore: 0.85,
    lastUpdated: '2026-04-16',
  },

  zomato: {
    companyName: 'Zomato (Blinkit)',
    industry: 'Food Delivery / Quick Commerce',
    companySize: 'large',
    stage: 'growth',
    financialSignals: {
      revenueTrend: 'growing',
      fundingStage: 'public',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'moderate',
    },
    layoffHistory: {
      totalLayoffs: 400,
      lastLayoffDate: '2022-08-10',
      layoffFrequency: 'rare',
      affectedDepartments: ['operations', 'support'],
    },
    hiringSignals: {
      hiringVelocity: 'moderate',
      hiringFreezeScore: 0.30,
    },
    roleRiskMap: {
      softwareEngineer: 0.28,
      productManager: 0.26,
      dataScientist: 0.25,
      designer: 0.30,
      hrRecruiter: 0.55,
      sales: 0.45,
    },
    aiExposureIndex: 0.58,
    marketRiskScore: 0.42,
    companyRiskScore: 0.35,
    confidenceScore: 0.80,
    lastUpdated: '2026-04-16',
  },

  flipkart: {
    companyName: 'Flipkart (Walmart)',
    industry: 'E-Commerce',
    companySize: 'enterprise',
    stage: 'mature',
    financialSignals: {
      revenueTrend: 'growing',
      fundingStage: 'pre_ipo',
      monthsSinceLastFunding: 8,
      burnRateEstimate: 'moderate',
    },
    layoffHistory: {
      totalLayoffs: 1000,
      lastLayoffDate: '2023-05-01',
      layoffFrequency: 'rare',
      affectedDepartments: ['operations', 'hr', 'support'],
    },
    hiringSignals: {
      hiringVelocity: 'moderate',
      hiringFreezeScore: 0.32,
    },
    roleRiskMap: {
      softwareEngineer: 0.30,
      productManager: 0.28,
      dataScientist: 0.26,
      designer: 0.32,
      hrRecruiter: 0.58,
      sales: 0.48,
    },
    aiExposureIndex: 0.60,
    marketRiskScore: 0.38,
    companyRiskScore: 0.38,
    confidenceScore: 0.78,
    lastUpdated: '2026-04-16',
  },

  // ── RPA / AI AUTOMATION ────────────────────────────────────────────────────

  uipath: {
    companyName: 'UiPath',
    industry: 'RPA / AI Automation',
    companySize: 'large',
    stage: 'restructuring',
    financialSignals: {
      revenueTrend: 'stable',
      fundingStage: 'public',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'moderate',
    },
    layoffHistory: {
      totalLayoffs: 1100,
      lastLayoffDate: '2023-04-26',
      layoffFrequency: 'moderate',
      affectedDepartments: ['sales', 'operations', 'hr', 'engineering'],
    },
    hiringSignals: {
      hiringVelocity: 'slow',
      hiringFreezeScore: 0.58,
    },
    roleRiskMap: {
      softwareEngineer: 0.32,
      productManager: 0.30,
      dataScientist: 0.28,
      designer: 0.34,
      hrRecruiter: 0.75,
      sales: 0.62,
    },
    aiExposureIndex: 0.78,
    marketRiskScore: 0.42,
    companyRiskScore: 0.50,
    confidenceScore: 0.85,
    lastUpdated: '2026-04-16',
  },

  automation_anywhere: {
    companyName: 'Automation Anywhere',
    industry: 'RPA / AI Automation',
    companySize: 'large',
    stage: 'restructuring',
    financialSignals: {
      revenueTrend: 'stable',
      fundingStage: 'series_d',
      monthsSinceLastFunding: 18,
      burnRateEstimate: 'high',
    },
    layoffHistory: {
      totalLayoffs: 800,
      lastLayoffDate: '2023-03-01',
      layoffFrequency: 'moderate',
      affectedDepartments: ['sales', 'hr', 'operations'],
    },
    hiringSignals: {
      hiringVelocity: 'slow',
      hiringFreezeScore: 0.62,
    },
    roleRiskMap: {
      softwareEngineer: 0.35,
      productManager: 0.32,
      dataScientist: 0.30,
      designer: 0.36,
      hrRecruiter: 0.78,
      sales: 0.65,
    },
    aiExposureIndex: 0.80,
    marketRiskScore: 0.48,
    companyRiskScore: 0.58,
    confidenceScore: 0.78,
    lastUpdated: '2026-04-16',
  },

  // ── SOCIAL / CONSUMER PLATFORMS ───────────────────────────────────────────

  snap: {
    companyName: 'Snap Inc.',
    industry: 'Social Media / AR',
    companySize: 'large',
    stage: 'declining',
    financialSignals: {
      revenueTrend: 'declining',
      fundingStage: 'public',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'high',
    },
    layoffHistory: {
      totalLayoffs: 3000,
      lastLayoffDate: '2023-08-29',
      layoffFrequency: 'frequent',
      affectedDepartments: ['engineering', 'operations', 'sales', 'hr', 'content'],
    },
    hiringSignals: {
      hiringVelocity: 'frozen',
      hiringFreezeScore: 0.88,
    },
    roleRiskMap: {
      softwareEngineer: 0.52,
      productManager: 0.55,
      dataScientist: 0.50,
      designer: 0.50,
      hrRecruiter: 0.90,
      sales: 0.80,
    },
    aiExposureIndex: 0.68,
    marketRiskScore: 0.65,
    companyRiskScore: 0.75,
    confidenceScore: 0.88,
    lastUpdated: '2026-04-16',
  },

  pinterest: {
    companyName: 'Pinterest',
    industry: 'Social Media / E-Commerce',
    companySize: 'large',
    stage: 'restructuring',
    financialSignals: {
      revenueTrend: 'stable',
      fundingStage: 'public',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'moderate',
    },
    layoffHistory: {
      totalLayoffs: 150,
      lastLayoffDate: '2022-10-01',
      layoffFrequency: 'rare',
      affectedDepartments: ['operations', 'hr'],
    },
    hiringSignals: {
      hiringVelocity: 'slow',
      hiringFreezeScore: 0.48,
    },
    roleRiskMap: {
      softwareEngineer: 0.32,
      productManager: 0.30,
      dataScientist: 0.28,
      designer: 0.25,
      hrRecruiter: 0.68,
      sales: 0.55,
    },
    aiExposureIndex: 0.65,
    marketRiskScore: 0.45,
    companyRiskScore: 0.42,
    confidenceScore: 0.85,
    lastUpdated: '2026-04-16',
  },

  reddit: {
    companyName: 'Reddit',
    industry: 'Social Media / Community Platform',
    companySize: 'large',
    stage: 'growth',
    financialSignals: {
      revenueTrend: 'growing',
      fundingStage: 'public',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'moderate',
    },
    layoffHistory: {
      totalLayoffs: 90,
      lastLayoffDate: '2023-06-05',
      layoffFrequency: 'rare',
      affectedDepartments: ['operations'],
    },
    hiringSignals: {
      hiringVelocity: 'moderate',
      hiringFreezeScore: 0.30,
    },
    roleRiskMap: {
      softwareEngineer: 0.28,
      productManager: 0.26,
      dataScientist: 0.25,
      designer: 0.28,
      hrRecruiter: 0.55,
      sales: 0.45,
    },
    aiExposureIndex: 0.60,
    marketRiskScore: 0.42,
    companyRiskScore: 0.35,
    confidenceScore: 0.82,
    lastUpdated: '2026-04-16',
  },

  discord: {
    companyName: 'Discord',
    industry: 'Communication / Gaming Platform',
    companySize: 'mid',
    stage: 'restructuring',
    financialSignals: {
      revenueTrend: 'stable',
      fundingStage: 'series_d',
      monthsSinceLastFunding: 22,
      burnRateEstimate: 'high',
    },
    layoffHistory: {
      totalLayoffs: 170,
      lastLayoffDate: '2024-01-11',
      layoffFrequency: 'rare',
      affectedDepartments: ['operations', 'hr', 'support'],
    },
    hiringSignals: {
      hiringVelocity: 'slow',
      hiringFreezeScore: 0.60,
    },
    roleRiskMap: {
      softwareEngineer: 0.35,
      productManager: 0.32,
      dataScientist: 0.32,
      designer: 0.30,
      hrRecruiter: 0.75,
      sales: 0.60,
    },
    aiExposureIndex: 0.62,
    marketRiskScore: 0.48,
    companyRiskScore: 0.52,
    confidenceScore: 0.78,
    lastUpdated: '2026-04-16',
  },

  // ── EdTech ─────────────────────────────────────────────────────────────────

  duolingo: {
    companyName: 'Duolingo',
    industry: 'EdTech / Language Learning',
    companySize: 'mid',
    stage: 'growth',
    financialSignals: {
      revenueTrend: 'growing',
      fundingStage: 'public',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'moderate',
    },
    layoffHistory: {
      totalLayoffs: 12,
      lastLayoffDate: '2024-01-08',
      layoffFrequency: 'rare',
      affectedDepartments: ['content'],
    },
    hiringSignals: {
      hiringVelocity: 'moderate',
      hiringFreezeScore: 0.22,
    },
    roleRiskMap: {
      softwareEngineer: 0.22,
      productManager: 0.20,
      dataScientist: 0.18,
      designer: 0.20,
      hrRecruiter: 0.42,
      sales: 0.35,
    },
    aiExposureIndex: 0.75,
    marketRiskScore: 0.35,
    companyRiskScore: 0.25,
    confidenceScore: 0.85,
    lastUpdated: '2026-04-16',
  },

  coursera: {
    companyName: 'Coursera',
    industry: 'EdTech / Online Learning',
    companySize: 'large',
    stage: 'declining',
    financialSignals: {
      revenueTrend: 'stable',
      fundingStage: 'public',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'high',
    },
    layoffHistory: {
      totalLayoffs: 400,
      lastLayoffDate: '2024-01-16',
      layoffFrequency: 'moderate',
      affectedDepartments: ['operations', 'sales', 'hr', 'content'],
    },
    hiringSignals: {
      hiringVelocity: 'frozen',
      hiringFreezeScore: 0.82,
    },
    roleRiskMap: {
      softwareEngineer: 0.45,
      productManager: 0.48,
      dataScientist: 0.42,
      designer: 0.45,
      hrRecruiter: 0.86,
      sales: 0.72,
    },
    aiExposureIndex: 0.72,
    marketRiskScore: 0.55,
    companyRiskScore: 0.65,
    confidenceScore: 0.82,
    lastUpdated: '2026-04-16',
  },

  // ── ENTERPRISE SOFTWARE / NICHE SaaS ──────────────────────────────────────

  box_inc: {
    companyName: 'Box',
    industry: 'SaaS / Cloud Content Management',
    companySize: 'large',
    stage: 'declining',
    financialSignals: {
      revenueTrend: 'stable',
      fundingStage: 'public',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'moderate',
    },
    layoffHistory: {
      totalLayoffs: 400,
      lastLayoffDate: '2023-02-14',
      layoffFrequency: 'rare',
      affectedDepartments: ['sales', 'hr', 'operations'],
    },
    hiringSignals: {
      hiringVelocity: 'slow',
      hiringFreezeScore: 0.65,
    },
    roleRiskMap: {
      softwareEngineer: 0.40,
      productManager: 0.42,
      dataScientist: 0.38,
      designer: 0.42,
      hrRecruiter: 0.82,
      sales: 0.68,
    },
    aiExposureIndex: 0.68,
    marketRiskScore: 0.55,
    companyRiskScore: 0.58,
    confidenceScore: 0.85,
    lastUpdated: '2026-04-16',
  },

  qualtrics: {
    companyName: 'Qualtrics',
    industry: 'SaaS / Experience Management',
    companySize: 'large',
    stage: 'restructuring',
    financialSignals: {
      revenueTrend: 'stable',
      fundingStage: 'public',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'moderate',
    },
    layoffHistory: {
      totalLayoffs: 780,
      lastLayoffDate: '2023-01-27',
      layoffFrequency: 'rare',
      affectedDepartments: ['sales', 'hr', 'operations'],
    },
    hiringSignals: {
      hiringVelocity: 'slow',
      hiringFreezeScore: 0.58,
    },
    roleRiskMap: {
      softwareEngineer: 0.35,
      productManager: 0.32,
      dataScientist: 0.30,
      designer: 0.35,
      hrRecruiter: 0.75,
      sales: 0.62,
    },
    aiExposureIndex: 0.62,
    marketRiskScore: 0.42,
    companyRiskScore: 0.48,
    confidenceScore: 0.82,
    lastUpdated: '2026-04-16',
  },

  samsara: {
    companyName: 'Samsara',
    industry: 'IoT / Fleet Management SaaS',
    companySize: 'large',
    stage: 'growth',
    financialSignals: {
      revenueTrend: 'growing',
      fundingStage: 'public',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'moderate',
    },
    layoffHistory: {
      totalLayoffs: 0,
      lastLayoffDate: 'none',
      layoffFrequency: 'none',
      affectedDepartments: [],
    },
    hiringSignals: {
      hiringVelocity: 'moderate',
      hiringFreezeScore: 0.20,
    },
    roleRiskMap: {
      softwareEngineer: 0.22,
      productManager: 0.20,
      dataScientist: 0.20,
      designer: 0.25,
      hrRecruiter: 0.42,
      sales: 0.35,
    },
    aiExposureIndex: 0.60,
    marketRiskScore: 0.32,
    companyRiskScore: 0.25,
    confidenceScore: 0.80,
    lastUpdated: '2026-04-16',
  },

  // ── NOTABLE DECLINE CASES ─────────────────────────────────────────────────

  wework: {
    companyName: 'WeWork',
    industry: 'Real Estate Tech / Co-working',
    companySize: 'large',
    stage: 'declining',
    financialSignals: {
      revenueTrend: 'declining',
      fundingStage: 'public',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'very_high',
    },
    layoffHistory: {
      totalLayoffs: 8000,
      lastLayoffDate: '2023-09-01',
      layoffFrequency: 'frequent',
      affectedDepartments: ['operations', 'engineering', 'sales', 'hr', 'support', 'facilities'],
    },
    hiringSignals: {
      hiringVelocity: 'frozen',
      hiringFreezeScore: 0.98,
    },
    roleRiskMap: {
      softwareEngineer: 0.65,
      productManager: 0.68,
      dataScientist: 0.62,
      designer: 0.65,
      hrRecruiter: 0.95,
      sales: 0.88,
    },
    aiExposureIndex: 0.42,
    marketRiskScore: 0.78,
    companyRiskScore: 0.95,
    confidenceScore: 0.90,
    lastUpdated: '2026-04-16',
  },

  buzzfeed: {
    companyName: 'BuzzFeed',
    industry: 'Digital Media / Content',
    companySize: 'large',
    stage: 'declining',
    financialSignals: {
      revenueTrend: 'declining',
      fundingStage: 'public',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'very_high',
    },
    layoffHistory: {
      totalLayoffs: 1800,
      lastLayoffDate: '2023-12-17',
      layoffFrequency: 'frequent',
      affectedDepartments: ['content', 'sales', 'engineering', 'hr', 'operations'],
    },
    hiringSignals: {
      hiringVelocity: 'frozen',
      hiringFreezeScore: 0.95,
    },
    roleRiskMap: {
      softwareEngineer: 0.58,
      productManager: 0.62,
      dataScientist: 0.55,
      designer: 0.60,
      hrRecruiter: 0.92,
      sales: 0.85,
    },
    aiExposureIndex: 0.80,
    marketRiskScore: 0.75,
    companyRiskScore: 0.90,
    confidenceScore: 0.85,
    lastUpdated: '2026-04-16',
  },

  // ── HEALTHTECH ────────────────────────────────────────────────────────────

  veeva_systems: {
    companyName: 'Veeva Systems',
    industry: 'Life Sciences SaaS / CRM',
    companySize: 'large',
    stage: 'mature',
    financialSignals: {
      revenueTrend: 'growing',
      fundingStage: 'public',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'low',
    },
    layoffHistory: {
      totalLayoffs: 0,
      lastLayoffDate: 'none',
      layoffFrequency: 'none',
      affectedDepartments: [],
    },
    hiringSignals: {
      hiringVelocity: 'moderate',
      hiringFreezeScore: 0.20,
    },
    roleRiskMap: {
      softwareEngineer: 0.22,
      productManager: 0.20,
      dataScientist: 0.20,
      designer: 0.25,
      hrRecruiter: 0.40,
      sales: 0.32,
    },
    aiExposureIndex: 0.55,
    marketRiskScore: 0.28,
    companyRiskScore: 0.22,
    confidenceScore: 0.88,
    lastUpdated: '2026-04-16',
  },

  doordash: {
    companyName: 'DoorDash',
    industry: 'Food Delivery / Logistics Tech',
    companySize: 'large',
    stage: 'mature',
    financialSignals: {
      revenueTrend: 'growing',
      fundingStage: 'public',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'moderate',
    },
    layoffHistory: {
      totalLayoffs: 1250,
      lastLayoffDate: '2022-12-01',
      layoffFrequency: 'rare',
      affectedDepartments: ['operations', 'hr', 'engineering'],
    },
    hiringSignals: {
      hiringVelocity: 'moderate',
      hiringFreezeScore: 0.28,
    },
    roleRiskMap: {
      softwareEngineer: 0.27,
      productManager: 0.25,
      dataScientist: 0.24,
      designer: 0.28,
      hrRecruiter: 0.55,
      sales: 0.45,
    },
    aiExposureIndex: 0.58,
    marketRiskScore: 0.40,
    companyRiskScore: 0.32,
    confidenceScore: 0.88,
    lastUpdated: '2026-04-16',
  },

  // ── CLOUD / DATA INFRASTRUCTURE ───────────────────────────────────────────

  elastic_nv: {
    companyName: 'Elastic N.V.',
    industry: 'Search / Observability SaaS',
    companySize: 'large',
    stage: 'restructuring',
    financialSignals: {
      revenueTrend: 'stable',
      fundingStage: 'public',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'moderate',
    },
    layoffHistory: {
      totalLayoffs: 545,
      lastLayoffDate: '2023-03-30',
      layoffFrequency: 'rare',
      affectedDepartments: ['engineering', 'sales', 'hr'],
    },
    hiringSignals: {
      hiringVelocity: 'slow',
      hiringFreezeScore: 0.52,
    },
    roleRiskMap: {
      softwareEngineer: 0.30,
      productManager: 0.28,
      dataScientist: 0.26,
      designer: 0.32,
      hrRecruiter: 0.70,
      sales: 0.58,
    },
    aiExposureIndex: 0.65,
    marketRiskScore: 0.42,
    companyRiskScore: 0.45,
    confidenceScore: 0.85,
    lastUpdated: '2026-04-16',
  },

  hashicorp: {
    companyName: 'HashiCorp (IBM)',
    industry: 'Developer Infrastructure / SaaS',
    companySize: 'large',
    stage: 'restructuring',
    financialSignals: {
      revenueTrend: 'stable',
      fundingStage: 'public',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'moderate',
    },
    layoffHistory: {
      totalLayoffs: 200,
      lastLayoffDate: '2023-04-06',
      layoffFrequency: 'rare',
      affectedDepartments: ['operations', 'hr'],
    },
    hiringSignals: {
      hiringVelocity: 'slow',
      hiringFreezeScore: 0.50,
    },
    roleRiskMap: {
      softwareEngineer: 0.28,
      productManager: 0.26,
      dataScientist: 0.26,
      designer: 0.30,
      hrRecruiter: 0.65,
      sales: 0.52,
    },
    aiExposureIndex: 0.65,
    marketRiskScore: 0.40,
    companyRiskScore: 0.42,
    confidenceScore: 0.82,
    lastUpdated: '2026-04-16',
  },

  // ── EMERGING AI-NATIVE (PHASE 2) ─────────────────────────────────────────

  perplexity: {
    companyName: 'Perplexity AI',
    industry: 'AI / Search / LLM Products',
    companySize: 'small',
    stage: 'startup',
    financialSignals: {
      revenueTrend: 'growing',
      fundingStage: 'series_b',
      monthsSinceLastFunding: 4,
      burnRateEstimate: 'high',
    },
    layoffHistory: {
      totalLayoffs: 0,
      lastLayoffDate: 'none',
      layoffFrequency: 'none',
      affectedDepartments: [],
    },
    hiringSignals: {
      hiringVelocity: 'aggressive',
      hiringFreezeScore: 0.05,
    },
    roleRiskMap: {
      softwareEngineer: 0.10,
      productManager: 0.12,
      dataScientist: 0.08,
      designer: 0.16,
      hrRecruiter: 0.22,
      sales: 0.18,
    },
    aiExposureIndex: 0.92,
    marketRiskScore: 0.55,
    companyRiskScore: 0.20,
    confidenceScore: 0.70,
    lastUpdated: '2026-04-16',
  },

  cursor_ai: {
    companyName: 'Cursor (Anysphere)',
    industry: 'AI / Developer Tools',
    companySize: 'small',
    stage: 'startup',
    financialSignals: {
      revenueTrend: 'growing',
      fundingStage: 'series_b',
      monthsSinceLastFunding: 6,
      burnRateEstimate: 'high',
    },
    layoffHistory: {
      totalLayoffs: 0,
      lastLayoffDate: 'none',
      layoffFrequency: 'none',
      affectedDepartments: [],
    },
    hiringSignals: {
      hiringVelocity: 'aggressive',
      hiringFreezeScore: 0.05,
    },
    roleRiskMap: {
      softwareEngineer: 0.10,
      productManager: 0.12,
      dataScientist: 0.10,
      designer: 0.15,
      hrRecruiter: 0.20,
      sales: 0.18,
    },
    aiExposureIndex: 0.95,
    marketRiskScore: 0.52,
    companyRiskScore: 0.18,
    confidenceScore: 0.68,
    lastUpdated: '2026-04-16',
  },

  scale_ai: {
    companyName: 'Scale AI',
    industry: 'AI / Data Labeling / AI Infrastructure',
    companySize: 'large',
    stage: 'growth',
    financialSignals: {
      revenueTrend: 'growing',
      fundingStage: 'series_d',
      monthsSinceLastFunding: 8,
      burnRateEstimate: 'moderate',
    },
    layoffHistory: {
      totalLayoffs: 0,
      lastLayoffDate: 'none',
      layoffFrequency: 'none',
      affectedDepartments: [],
    },
    hiringSignals: {
      hiringVelocity: 'moderate',
      hiringFreezeScore: 0.15,
    },
    roleRiskMap: {
      softwareEngineer: 0.18,
      productManager: 0.20,
      dataScientist: 0.15,
      designer: 0.24,
      hrRecruiter: 0.38,
      sales: 0.30,
    },
    aiExposureIndex: 0.88,
    marketRiskScore: 0.45,
    companyRiskScore: 0.22,
    confidenceScore: 0.75,
    lastUpdated: '2026-04-16',
  },

  // ── GLOBAL ENTERPRISE / CONSULTING ────────────────────────────────────────

  deloitte: {
    companyName: 'Deloitte',
    industry: 'Professional Services / Consulting',
    companySize: 'enterprise',
    stage: 'mature',
    financialSignals: {
      revenueTrend: 'stable',
      fundingStage: 'bootstrapped',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'low',
    },
    layoffHistory: {
      totalLayoffs: 800,
      lastLayoffDate: '2024-01-09',
      layoffFrequency: 'rare',
      affectedDepartments: ['consulting', 'operations', 'hr'],
    },
    hiringSignals: {
      hiringVelocity: 'moderate',
      hiringFreezeScore: 0.28,
    },
    roleRiskMap: {
      softwareEngineer: 0.30,
      productManager: 0.28,
      dataScientist: 0.25,
      designer: 0.32,
      hrRecruiter: 0.55,
      sales: 0.42,
    },
    aiExposureIndex: 0.55,
    marketRiskScore: 0.32,
    companyRiskScore: 0.32,
    confidenceScore: 0.85,
    lastUpdated: '2026-04-16',
  },

  pwc: {
    companyName: 'PwC',
    industry: 'Professional Services / Audit',
    companySize: 'enterprise',
    stage: 'restructuring',
    financialSignals: {
      revenueTrend: 'stable',
      fundingStage: 'bootstrapped',
      monthsSinceLastFunding: 0,
      burnRateEstimate: 'low',
    },
    layoffHistory: {
      totalLayoffs: 1500,
      lastLayoffDate: '2024-04-01',
      layoffFrequency: 'rare',
      affectedDepartments: ['consulting', 'hr', 'operations'],
    },
    hiringSignals: {
      hiringVelocity: 'slow',
      hiringFreezeScore: 0.42,
    },
    roleRiskMap: {
      softwareEngineer: 0.32,
      productManager: 0.30,
      dataScientist: 0.28,
      designer: 0.35,
      hrRecruiter: 0.62,
      sales: 0.48,
    },
    aiExposureIndex: 0.58,
    marketRiskScore: 0.35,
    companyRiskScore: 0.38,
    confidenceScore: 0.85,
    lastUpdated: '2026-04-16',
  },

};


// ══════════════════════════════════════════════════════════════════════════════
// LOOKUP FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

/** Case-insensitive exact company name match */
export const getCompanyProfile = (companyKey: string): CompanyProfile | null => {
  const key = companyKey.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  return COMPANY_INTELLIGENCE_DB[key] || null;
};

// Aliases for common brand/legal name variants that don't match DB keys exactly.
// Handles "Google LLC" → "google", "Infosys Limited" → "infosys", etc.
//
// EXPORTED — this is the canonical alias map. Two other files (layoffNewsCache.ts
// and dataConnectors/layoffsFyiConnector.ts) used to keep their own duplicate
// inverted (primary → [aliases]) maps; they now consume `getCompanyAliases()`
// below, which derives the inverted view at module load.
export const COMPANY_ALIASES: Record<string, string> = {
  'google llc': 'google',
  'alphabet': 'google',
  'alphabet inc': 'google',
  'meta platforms': 'meta',
  'facebook': 'meta',
  'x corp': 'twitter_x',
  'twitter': 'twitter_x',
  'x.com': 'twitter_x',
  'amazon web services': 'amazon',
  'aws': 'amazon',
  'amazon.com': 'amazon',
  'microsoft corporation': 'microsoft',
  'apple inc': 'apple',
  'infosys limited': 'infosys',
  'infosys bpo': 'infosys',
  'tata consultancy': 'tcs',
  'tata consultancy services': 'tcs',
  'tcs india': 'tcs',
  'wipro limited': 'wipro',
  'wipro technologies': 'wipro',
  'hcl technologies': 'hcl_tech',
  'hcl tech': 'hcl_tech',
  'hcltech': 'hcl_tech',
  'tech mahindra': 'tech_mahindra',
  'techmahindra': 'tech_mahindra',
  'cognizant technology': 'cognizant',
  'cognizant technology solutions': 'cognizant',
  'cts': 'cognizant',
  'capgemini india': 'capgemini',
  'dxc': 'dxc_technology',
  'openai inc': 'openai',
  // Sibling brands of parent companies — needed for news lookup ("Instagram
  // layoffs" should match Meta-filed events, "Slack layoffs" should match
  // Salesforce-filed events). Sourced from the now-deleted dicts in
  // layoffNewsCache.ts and dataConnectors/layoffsFyiConnector.ts.
  'instagram': 'meta',
  'whatsapp': 'meta',
  'msft': 'microsoft',
  'slack': 'salesforce',
  'google inc': 'google',
  'apple inc.': 'apple',
  'amazon.com inc': 'amazon',
  'tata consultancy services limited': 'tcs',
};

// ── Inverted alias view: primary → [aliases] ─────────────────────────────────
// Derived from COMPANY_ALIASES at module load. Used by layoffNewsCache.ts and
// dataConnectors/layoffsFyiConnector.ts for fuzzy news lookup ("if you query
// 'Google', also check entries filed under 'Alphabet'").
const ALIASES_BY_PRIMARY: Record<string, string[]> = (() => {
  const out: Record<string, string[]> = {};
  for (const [alias, primary] of Object.entries(COMPANY_ALIASES)) {
    if (!out[primary]) out[primary] = [];
    out[primary].push(alias);
  }
  return out;
})();

/**
 * Return all known alias strings for a company name (input + canonical name +
 * sibling aliases). Bidirectional: querying "Google" returns ["google",
 * "alphabet", "google llc", ...]; querying "Alphabet" returns the same set.
 *
 * Output is lowercased and de-duplicated.
 */
export const getCompanyAliases = (name: string | null | undefined): string[] => {
  if (!name || typeof name !== 'string') return [];
  const lower = name.toLowerCase().trim();
  if (!lower) return [];

  // Direct lookup: input is itself an alias → primary key
  const primaryFromAlias = COMPANY_ALIASES[lower];
  // Inverted lookup: input might already be a primary key
  const aliasesIfPrimary = ALIASES_BY_PRIMARY[lower] ?? [];
  // If we discovered a primary via alias map, fetch its full alias list
  const aliasesViaPrimary = primaryFromAlias ? (ALIASES_BY_PRIMARY[primaryFromAlias] ?? []) : [];

  const all = new Set<string>([lower]);
  if (primaryFromAlias) all.add(primaryFromAlias);
  for (const a of aliasesIfPrimary) all.add(a);
  for (const a of aliasesViaPrimary) all.add(a);
  return Array.from(all);
};

/** Fuzzy search by company display name — bidirectional substring match. */
export const searchCompanyProfiles = (query: string): CompanyProfile[] => {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase().trim();
  return Object.values(COMPANY_INTELLIGENCE_DB).filter(p => {
    const name = p.companyName.toLowerCase();
    return name.includes(q) || q.includes(name);
  });
};

/**
 * Filter companies by risk band.
 * @param minRisk  0.0
 * @param maxRisk  1.0
 */
export const getCompaniesByRisk = (minRisk: number, maxRisk: number): CompanyProfile[] =>
  Object.values(COMPANY_INTELLIGENCE_DB).filter(
    p => p.companyRiskScore >= minRisk && p.companyRiskScore <= maxRisk
  );

/** Get all layoff-heavy companies (frequent + companyRiskScore >= 0.60) */
export const getLayoffHeavyCompanies = (): CompanyProfile[] =>
  Object.values(COMPANY_INTELLIGENCE_DB).filter(
    p => p.layoffHistory.layoffFrequency === 'frequent' || p.companyRiskScore >= 0.60
  );

/** Get all AI-native companies (aiExposureIndex >= 0.80) */
export const getAINativeCompanies = (): CompanyProfile[] =>
  Object.values(COMPANY_INTELLIGENCE_DB).filter(p => p.aiExposureIndex >= 0.80);

/** Get total count of seeded company profiles */
export const getCompanyProfileCount = (): number =>
  Object.keys(COMPANY_INTELLIGENCE_DB).length;

/**
 * Resolve company name string (from user input) to a CompanyProfile.
 * Tries: (1) normalized key, (2) alias map, (3) bidirectional fuzzy name match.
 */
export const resolveCompanyProfile = (name: string): CompanyProfile | null => {
  if (!name || name.length < 2) return null;

  // 1. Try normalized key ("Infosys" → "infosys", "HCL Tech" → "hcl_tech")
  const direct = getCompanyProfile(name);
  if (direct) return direct;

  // 2. Alias map — handles legal name variants ("Infosys Limited", "TCS India")
  const aliasKey = COMPANY_ALIASES[name.toLowerCase().trim()];
  if (aliasKey) {
    const aliased = COMPANY_INTELLIGENCE_DB[aliasKey];
    if (aliased) return aliased;
  }

  // 3. Bidirectional fuzzy name match — return best (shortest-name) match
  const results = searchCompanyProfiles(name);
  if (results.length === 0) return null;
  // Prefer the entry whose companyName is most specific (shortest name wins
  // when multiple partial matches exist — avoids "Stripe Atlas" matching "Stripe")
  results.sort((a, b) => a.companyName.length - b.companyName.length);
  return results[0];
};
