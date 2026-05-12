// companyEnrichmentPipeline.ts — v16.0
// Search-log-driven company enrichment pipeline.
//
// When a user audits a company not in Phase 1 (companyIntelligenceDB / the 50
// companies with full data), this service:
//   1. Returns an immediate estimated profile from name-based heuristics.
//   2. Marks the company as queued for background enrichment if searched >3×.
//   3. Provides buildFallbackCompanyProfile() to convert the estimate into the
//      minimal CompanyData shape the scoring engine needs.
//
// No external API calls are made here — all data arrives via userHints or the
// name-heuristic classifier. The actual Crunchbase/LinkedIn enrichment is
// triggered externally; this service only gates and formats that trigger.

import type { CompanyData } from '../data/companyDatabase';

// ─── Public types ─────────────────────────────────────────────────────────────

export type EnrichmentStatus =
  | 'phase1'      // in companyIntelligenceDB — full data, high confidence
  | 'enriched'    // enriched via Crunchbase / LinkedIn (background job complete)
  | 'estimated'   // estimated from industry + size heuristics
  | 'unknown';    // cannot classify

export interface EnrichmentRequest {
  companyName: string;
  /** ISO date string of the first or most recent search */
  searchedAt: string;
  /** How many times this company has been searched across all users */
  searchCount: number;
  estimatedEmployeeCount: number | null;
  estimatedIndustry: string | null;
  estimatedRegion: string | null;
}

export interface EnrichedCompanyEstimate {
  companyName: string;
  enrichmentStatus: EnrichmentStatus;
  estimatedEmployeeCount: number | null;
  /** '<10M' | '10M-50M' | '50M-500M' | '>500M' | null */
  estimatedRevenueBand: string | null;
  estimatedIndustry: string;
  estimatedRegion: string;
  isPubliclyListed: boolean | null;
  /** 0–1: 0.8 for phase1, 0.5 for enriched, 0.3 for estimated, 0.1 for unknown */
  dataConfidence: number;
  enrichmentNote: string;
  /** True when searchCount > 3 — signals the background enrichment job to run */
  queuedForRefresh: boolean;
}

// ─── Phase 1 company name registry ───────────────────────────────────────────

/**
 * Normalized names (lowercase, no punctuation) of the 50 Phase 1 companies.
 * Used for O(1) lookup to short-circuit the heuristic classifier.
 */
export const PHASE1_COMPANY_NAMES: Set<string> = new Set([
  'google',
  'alphabet',
  'meta',
  'facebook',
  'amazon',
  'microsoft',
  'apple',
  'netflix',
  'salesforce',
  'oracle',
  'sap',
  'ibm',
  'intel',
  'cisco',
  'adobe',
  'uber',
  'airbnb',
  'stripe',
  'openai',
  'anthropic',
  'twitter',
  'x',
  'linkedin',
  'nvidia',
  'amd',
  'qualcomm',
  'infosys',
  'tcs',
  'wipro',
  'cognizant',
  'accenture',
  'deloitte',
  'mckinsey',
  'bytedance',
  'tiktok',
  'snap',
  'pinterest',
  'shopify',
  'palantir',
  'snowflake',
  'databricks',
  'zoom',
  'slack',
  'atlassian',
  'twilio',
  'datadog',
  'crowdstrike',
  'okta',
  'workday',
  'servicenow',
  'veeva',
]);

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Strips common legal suffixes and lowercases for canonical matching. */
function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(inc|corp|ltd|llc|limited|pvt|co|plc|gmbh|ag|sa|bv|oy|ab|nv|srl)\b\.?/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

type IndustryHeuristic = {
  pattern: RegExp;
  industry: string;
  region: string;
  isPubliclyListed: boolean | null;
  employeeCountEstimate: number | null;
  revenueBand: string | null;
};

const INDUSTRY_HEURISTICS: IndustryHeuristic[] = [
  // AI / LLM companies
  {
    pattern: /\b(ai|llm|gpt|neural|deepmind|openai)\b/i,
    industry: 'AI / Machine Learning',
    region: 'US',
    isPubliclyListed: null,
    employeeCountEstimate: 500,
    revenueBand: '10M-50M',
  },
  // Cloud / SaaS
  {
    pattern: /(cloud|saas|platform)\b/i,
    industry: 'Cloud / SaaS',
    region: 'US',
    isPubliclyListed: null,
    employeeCountEstimate: 1000,
    revenueBand: '50M-500M',
  },
  // Tech / Software (generic)
  {
    pattern: /(software|tech|technologies|systems|digital|data)\b/i,
    industry: 'Technology',
    region: 'US',
    isPubliclyListed: null,
    employeeCountEstimate: 2000,
    revenueBand: '50M-500M',
  },
  // India IT services / BPO
  {
    pattern: /(bpo|outsourcing|solutions|services|infotech|infosy|consultancy)\b/i,
    industry: 'IT Services / BPO',
    region: 'IN',
    isPubliclyListed: null,
    employeeCountEstimate: 5000,
    revenueBand: '50M-500M',
  },
  // Finance
  {
    pattern: /(bank|banking|financial|capital|insurance|invest|fintech|payments|finance)\b/i,
    industry: 'Financial Services',
    region: 'US',
    isPubliclyListed: null,
    employeeCountEstimate: 3000,
    revenueBand: '50M-500M',
  },
  // Healthcare / Pharma
  {
    pattern: /(health|medical|pharma|bio|biotech|genomics|clinical|hospital|wellness)\b/i,
    industry: 'Healthcare / Life Sciences',
    region: 'US',
    isPubliclyListed: null,
    employeeCountEstimate: 2000,
    revenueBand: '50M-500M',
  },
  // Media / Entertainment
  {
    pattern: /(media|entertainment|studio|gaming|games|content|streaming)\b/i,
    industry: 'Media / Entertainment',
    region: 'US',
    isPubliclyListed: null,
    employeeCountEstimate: 1500,
    revenueBand: '10M-50M',
  },
  // E-commerce / Retail
  {
    pattern: /(retail|ecommerce|e-commerce|shop|store|commerce|marketplace)\b/i,
    industry: 'E-Commerce / Retail',
    region: 'US',
    isPubliclyListed: null,
    employeeCountEstimate: 2500,
    revenueBand: '50M-500M',
  },
  // Logistics / Supply Chain
  {
    pattern: /(logistics|supply|shipping|transport|fleet|freight|delivery)\b/i,
    industry: 'Logistics / Transportation',
    region: 'US',
    isPubliclyListed: null,
    employeeCountEstimate: 4000,
    revenueBand: '50M-500M',
  },
  // Consulting / Professional services
  {
    pattern: /(consulting|advisory|strategy|management consulting|professional services)\b/i,
    industry: 'Consulting / Professional Services',
    region: 'US',
    isPubliclyListed: null,
    employeeCountEstimate: 5000,
    revenueBand: '>500M',
  },
];

/**
 * Applies name-based heuristics to classify industry, region, and size.
 * Returns null when no pattern matches.
 */
function classifyByHeuristic(companyName: string): IndustryHeuristic | null {
  for (const heuristic of INDUSTRY_HEURISTICS) {
    if (heuristic.pattern.test(companyName)) {
      return heuristic;
    }
  }
  return null;
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Returns an EnrichedCompanyEstimate for any company name.
 * Phase 1 companies get high-confidence status immediately.
 * Unknown companies get heuristic estimates with lower confidence.
 *
 * @param companyName  The raw company name as entered by the user.
 * @param userHints    Optional signals from the user's profile / audit form.
 * @param searchCount  How many times this company has been searched (used to
 *                     decide whether to queue a background enrichment job).
 */
export function getOrEstimateCompanyData(
  companyName: string,
  userHints?: { industry?: string; region?: string; employeeCount?: number },
  searchCount = 1,
): EnrichedCompanyEstimate {
  const normalized = normalizeCompanyName(companyName);

  // ── Phase 1 fast path ─────────────────────────────────────────────────────
  if (PHASE1_COMPANY_NAMES.has(normalized)) {
    return {
      companyName,
      enrichmentStatus: 'phase1',
      estimatedEmployeeCount: null,   // actual data served by companyIntelligenceService
      estimatedRevenueBand: null,
      estimatedIndustry: 'See companyIntelligenceDB',
      estimatedRegion: 'See companyIntelligenceDB',
      isPubliclyListed: null,
      dataConfidence: 0.80,
      enrichmentNote:
        'Full company data available from Phase 1 (companyIntelligenceDB). No estimation needed.',
      queuedForRefresh: false,
    };
  }

  // ── Heuristic classification ──────────────────────────────────────────────
  const heuristic = classifyByHeuristic(companyName);

  const estimatedIndustry =
    userHints?.industry ?? heuristic?.industry ?? 'Technology'; // safe default

  const estimatedRegion =
    userHints?.region ?? heuristic?.region ?? 'US';

  const estimatedEmployeeCount =
    userHints?.employeeCount ?? heuristic?.employeeCountEstimate ?? null;

  const estimatedRevenueBand = heuristic?.revenueBand ?? null;

  const isPubliclyListed = heuristic?.isPubliclyListed ?? null;

  const dataConfidence = heuristic ? 0.30 : 0.10;

  const queuedForRefresh = searchCount > 3;

  const enrichmentStatus: EnrichmentStatus = heuristic ? 'estimated' : 'unknown';

  const enrichmentNote = heuristic
    ? `Estimated from name pattern (${enrichmentStatus}). Confidence: ${Math.round(dataConfidence * 100)}%.` +
      (queuedForRefresh
        ? ' Company queued for background enrichment via Crunchbase/LinkedIn.'
        : ' Will queue for enrichment after 3 searches.')
    : `Company not found in Phase 1 database and no name pattern matched. Using minimum-confidence defaults.` +
      (queuedForRefresh
        ? ' Queued for manual review.'
        : '');

  return {
    companyName,
    enrichmentStatus,
    estimatedEmployeeCount,
    estimatedRevenueBand,
    estimatedIndustry,
    estimatedRegion,
    isPubliclyListed,
    dataConfidence,
    enrichmentNote,
    queuedForRefresh,
  };
}

// ─── Fallback CompanyData builder ─────────────────────────────────────────────

/**
 * Converts an EnrichedCompanyEstimate into the minimal CompanyData shape
 * required by the scoring engine. Fields not estimable are set to safe
 * neutral defaults so the engine does not throw on missing data.
 *
 * Callers should set source = 'enrichment_pipeline_estimate' and check
 * dataConfidence before trusting derived scores.
 */
export function buildFallbackCompanyProfile(
  estimate: EnrichedCompanyEstimate,
): Partial<CompanyData> {
  // Map revenue band to a rough revenuePerEmployee estimate
  const revenueBandToRPE: Record<string, number> = {
    '<10M':      40_000,
    '10M-50M':   80_000,
    '50M-500M':  150_000,
    '>500M':     250_000,
  };

  const revenuePerEmployee = estimate.estimatedRevenueBand
    ? (revenueBandToRPE[estimate.estimatedRevenueBand] ?? 120_000)
    : 120_000;

  const regionMap: Record<string, CompanyData['region']> = {
    US: 'US',
    EU: 'EU',
    IN: 'IN',
    APAC: 'APAC',
    GLOBAL: 'GLOBAL',
  };
  const region: CompanyData['region'] = regionMap[estimate.estimatedRegion] ?? 'GLOBAL';

  return {
    name: estimate.companyName,
    isPublic: estimate.isPubliclyListed ?? false,
    industry: estimate.estimatedIndustry,
    region,
    employeeCount: estimate.estimatedEmployeeCount ?? 1000,
    revenueGrowthYoY: null,       // unknown — will not penalize score
    stock90DayChange: null,       // unknown
    layoffsLast24Months: [],      // assume no known layoffs
    layoffRounds: 0,
    lastLayoffPercent: null,
    revenuePerEmployee,
    aiInvestmentSignal: 'medium', // neutral default
    source: 'enrichment_pipeline_estimate',
    lastUpdated: new Date().toISOString().split('T')[0],
  };
}
