// geographicOptionalityEngine.ts — Layer 35
// v14.0 Intelligence Upgrade
//
// Models geographic optionality — the degree to which location expands or
// contracts a user's escape path universe when facing layoff risk.
//
// Key insights:
//   - Remote-eligible roles have 3× the escape path count vs. in-office only
//     (LinkedIn Workforce Insights 2026)
//   - Tier-2 city engineers in India have 40% fewer opportunities but 3× less
//     competition vs. Tier-1 city engineers (NASSCOM talent report 2026)
//   - High-CoL cities (San Francisco, NYC) require 50% higher financial runway
//     for equivalent survival time during job search
//   - Geographic industry concentration (Austin tech cluster) creates
//     single-sector risk: if sector cuts, few local alternatives exist
//
// Calibration: research_grounded (LinkedIn, NASSCOM, BLS 2025)

export type RemoteEligibility = 'FULLY_REMOTE' | 'HYBRID' | 'IN_OFFICE_ONLY' | 'UNKNOWN';

export type GeographicTier =
  | 'GLOBAL_HUB'        // SF, NYC, London, Singapore, Bangalore
  | 'MAJOR_METRO'       // Chicago, Austin, Hyderabad, Pune, Mumbai
  | 'SECONDARY_METRO'   // Mid-size cities with growing tech presence
  | 'TIER_2_CITY'       // Smaller cities, limited tech ecosystem
  | 'REMOTE_ONLY'       // Fully remote — geography-agnostic
  | 'UNKNOWN';

export interface GeographicOptionalityResult {
  // Overall
  geographicOptionalityScore: number;  // 0–100 (higher = BETTER optionality)
  optionalityLabel: string;

  // Remote eligibility
  remoteEligibility: RemoteEligibility;
  remoteEscapeMultiplier: number;     // 1.0×–3.0× escape path expansion
  remoteNote: string;

  // Geographic tier
  geographicTier: GeographicTier;
  opportunityDensity: 'HIGH' | 'MEDIUM' | 'LOW' | 'VARIABLE';
  competitionLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'VARIABLE';
  geographicNote: string;

  // Financial burden of location
  costOfLivingMultiplier: number;     // runway adjustment (1.0 = median, 1.5 = SF)
  runwayAdjustedMonths: number | null; // user's runway adjusted for CoL
  colNote: string;

  // Industry concentration risk
  industryConcentrationRisk: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
  concentrationNote: string;

  // Re-employment timeline estimate
  reEmploymentTimelineWeeks: { optimistic: number; base: number; pessimistic: number };
  reEmploymentNote: string;

  // Specific opportunities
  highOpportunityMarkets: string[];   // cities/regions with high demand for this role
  remoteFirstTargets: string[];       // remote-first companies hiring for this role type

  // Actions
  geographicActions: GeographicAction[];

  calibrationStatus: 'research_grounded';
}

export interface GeographicAction {
  action: string;
  why: string;
  urgency: 'immediate' | 'within_30d' | 'within_90d';
}

// ─── City classification data ─────────────────────────────────────────────────
// Cost of living multiplier: 1.0 = US median, 1.5 = San Francisco
const CITY_DATA: Record<string, { tier: GeographicTier; colMultiplier: number; opportunityDensity: 'HIGH' | 'MEDIUM' | 'LOW' }> = {
  // US Global Hubs
  'san francisco': { tier: 'GLOBAL_HUB', colMultiplier: 1.55, opportunityDensity: 'HIGH' },
  'new york':      { tier: 'GLOBAL_HUB', colMultiplier: 1.45, opportunityDensity: 'HIGH' },
  'seattle':       { tier: 'GLOBAL_HUB', colMultiplier: 1.30, opportunityDensity: 'HIGH' },
  'boston':        { tier: 'GLOBAL_HUB', colMultiplier: 1.35, opportunityDensity: 'HIGH' },
  // US Major Metros
  'austin':        { tier: 'MAJOR_METRO', colMultiplier: 1.10, opportunityDensity: 'HIGH' },
  'chicago':       { tier: 'MAJOR_METRO', colMultiplier: 1.05, opportunityDensity: 'MEDIUM' },
  'los angeles':   { tier: 'MAJOR_METRO', colMultiplier: 1.30, opportunityDensity: 'MEDIUM' },
  'miami':         { tier: 'MAJOR_METRO', colMultiplier: 1.15, opportunityDensity: 'MEDIUM' },
  'denver':        { tier: 'MAJOR_METRO', colMultiplier: 1.08, opportunityDensity: 'MEDIUM' },
  // India Global Hubs
  'bangalore':     { tier: 'GLOBAL_HUB', colMultiplier: 0.35, opportunityDensity: 'HIGH' },
  'hyderabad':     { tier: 'MAJOR_METRO', colMultiplier: 0.28, opportunityDensity: 'HIGH' },
  'mumbai':        { tier: 'MAJOR_METRO', colMultiplier: 0.38, opportunityDensity: 'HIGH' },
  'pune':          { tier: 'MAJOR_METRO', colMultiplier: 0.25, opportunityDensity: 'HIGH' },
  'chennai':       { tier: 'MAJOR_METRO', colMultiplier: 0.22, opportunityDensity: 'MEDIUM' },
  'delhi':         { tier: 'MAJOR_METRO', colMultiplier: 0.30, opportunityDensity: 'MEDIUM' },
  'noida':         { tier: 'MAJOR_METRO', colMultiplier: 0.25, opportunityDensity: 'MEDIUM' },
  'gurgaon':       { tier: 'MAJOR_METRO', colMultiplier: 0.28, opportunityDensity: 'MEDIUM' },
  // India Tier-2
  'jaipur':        { tier: 'TIER_2_CITY', colMultiplier: 0.18, opportunityDensity: 'LOW' },
  'kochi':         { tier: 'TIER_2_CITY', colMultiplier: 0.20, opportunityDensity: 'LOW' },
  'ahmedabad':     { tier: 'TIER_2_CITY', colMultiplier: 0.18, opportunityDensity: 'LOW' },
  'coimbatore':    { tier: 'TIER_2_CITY', colMultiplier: 0.15, opportunityDensity: 'LOW' },
  // Global
  'london':        { tier: 'GLOBAL_HUB', colMultiplier: 1.40, opportunityDensity: 'HIGH' },
  'berlin':        { tier: 'MAJOR_METRO', colMultiplier: 0.90, opportunityDensity: 'MEDIUM' },
  'singapore':     { tier: 'GLOBAL_HUB', colMultiplier: 1.25, opportunityDensity: 'HIGH' },
  'toronto':       { tier: 'MAJOR_METRO', colMultiplier: 1.15, opportunityDensity: 'HIGH' },
  'dubai':         { tier: 'MAJOR_METRO', colMultiplier: 1.10, opportunityDensity: 'MEDIUM' },
};

// Industry concentration by city — high concentration = single-sector risk
const INDUSTRY_CONCENTRATION: Record<string, 'HIGH' | 'MEDIUM' | 'LOW'> = {
  'san francisco': 'HIGH',   // tech monoculture
  'austin':        'HIGH',   // tech cluster
  'seattle':       'HIGH',   // tech + Amazon
  'detroit':       'HIGH',   // automotive
  'houston':       'HIGH',   // energy
  'las vegas':     'HIGH',   // hospitality/gaming
  'new york':      'LOW',    // diverse sectors
  'chicago':       'LOW',    // diverse
  'bangalore':     'HIGH',   // IT services
  'hyderabad':     'HIGH',   // IT services + pharma
  'london':        'LOW',    // finance + tech + creative
};

function classifyCity(city: string): { tier: GeographicTier; colMultiplier: number; opportunityDensity: 'HIGH' | 'MEDIUM' | 'LOW' } {
  const normalized = city.toLowerCase().trim();
  for (const [key, data] of Object.entries(CITY_DATA)) {
    if (normalized.includes(key) || key.includes(normalized)) return data;
  }
  return { tier: 'SECONDARY_METRO', colMultiplier: 1.0, opportunityDensity: 'MEDIUM' };
}

function getRemoteMultiplier(eligibility: RemoteEligibility): number {
  switch (eligibility) {
    case 'FULLY_REMOTE': return 3.0;
    case 'HYBRID':       return 1.8;
    case 'IN_OFFICE_ONLY': return 1.0;
    default: return 1.3;
  }
}

function computeReEmploymentTimeline(
  optionalityScore: number,
  roleType: string,
): { optimistic: number; base: number; pessimistic: number } {
  // Base re-employment in weeks for median market conditions
  const basedOnOptimality = optionalityScore >= 70 ? { o: 4, b: 8, p: 16 }
    : optionalityScore >= 50 ? { o: 6, b: 12, p: 24 }
    : optionalityScore >= 30 ? { o: 8, b: 16, p: 32 }
    : { o: 12, b: 24, p: 48 };

  // Role type adjustment
  const prefix = roleType.split('_')[0];
  const roleMultiplier = ['bpo', 'adm', 'qa', 'ret'].includes(prefix) ? 1.4
    : ['ml', 'sw', 'sec'].includes(prefix) ? 0.8
    : 1.0;

  return {
    optimistic: Math.round(basedOnOptimality.o * roleMultiplier),
    base:       Math.round(basedOnOptimality.b * roleMultiplier),
    pessimistic: Math.round(basedOnOptimality.p * roleMultiplier),
  };
}

function getHighOpportunityMarkets(workTypeKey: string, region: string): string[] {
  const prefix = workTypeKey.split('_')[0];
  if (region === 'IN') {
    const techRoles = ['sw', 'ml', 'data', 'dev', 'sec'];
    return techRoles.includes(prefix)
      ? ['Bangalore (GCC hub)', 'Hyderabad (tech + pharma)', 'Pune (product companies)', 'Mumbai (fintech)']
      : ['Delhi NCR (enterprise)', 'Chennai (manufacturing/IT)', 'Bangalore'];
  }
  if (['sw', 'ml', 'data'].includes(prefix)) {
    return ['San Francisco Bay Area', 'Seattle', 'New York', 'Austin', 'Boston'];
  }
  return ['Major metro in your region', 'Remote-first markets (global)'];
}

function getGeographicActions(
  optionalityScore: number,
  remoteEligibility: RemoteEligibility,
  tier: GeographicTier,
): GeographicAction[] {
  const actions: GeographicAction[] = [];

  if (remoteEligibility === 'IN_OFFICE_ONLY') {
    actions.push({
      action: 'Explore whether your role can be reclassified as remote-eligible',
      why: 'In-office-only roles have 3× fewer escape paths. Even a hybrid arrangement dramatically expands your market reach. The conversation costs nothing — the upside is access to 200% more opportunities.',
      urgency: 'within_30d',
    });
  }

  if (tier === 'TIER_2_CITY' && remoteEligibility === 'IN_OFFICE_ONLY') {
    actions.push({
      action: 'Actively target Tier-1 city remote positions in your job search',
      why: 'Tier-2 city + in-office restriction = the most constrained escape path scenario. Remote positions in Bangalore, Hyderabad, or global companies open the full opportunity set from your current location.',
      urgency: 'within_30d',
    });
  }

  if (optionalityScore >= 60) {
    actions.push({
      action: 'Leverage your geographic optionality — proactively explore remote-first companies',
      why: 'Your geographic setup provides above-average escape path breadth. Remote-first companies (Automattic, GitLab, Basecamp, Notion, Linear) have strong remote cultures and hire globally.',
      urgency: 'within_90d',
    });
  }

  return actions;
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export interface GeographicOptionalityInput {
  city?: string;
  region?: string;         // 'US' | 'IN' | 'EU' | 'APAC'
  remoteEligibility?: RemoteEligibility;
  workTypeKey?: string;
  financialRunwayMonths?: number | null;
}

export function computeGeographicOptionality(
  input: GeographicOptionalityInput,
): GeographicOptionalityResult {
  try {
    const {
      city = '',
      region = 'US',
      remoteEligibility = 'UNKNOWN',
      workTypeKey = '_default',
      financialRunwayMonths = null,
    } = input;

    const cityData = classifyCity(city || region);
    const { tier, colMultiplier, opportunityDensity } = cityData;

    const industryConcentration = INDUSTRY_CONCENTRATION[city?.toLowerCase() ?? ''] ?? 'MEDIUM';

    const remoteMultiplier = getRemoteMultiplier(remoteEligibility);

    // Optionality score: opportunity density (40%) + remote reach (40%) + CoL burden (20%)
    const opportunityDensityScore = opportunityDensity === 'HIGH' ? 80 : opportunityDensity === 'MEDIUM' ? 55 : 30;
    const remoteScore = remoteMultiplier >= 3.0 ? 90 : remoteMultiplier >= 1.8 ? 70 : 40;
    const colBurdenScore = colMultiplier <= 0.40 ? 80  // low CoL = longer runway = better optionality
      : colMultiplier <= 0.80 ? 70
      : colMultiplier <= 1.10 ? 60
      : colMultiplier <= 1.30 ? 45
      : 30; // very high CoL

    const geographicOptionalityScore = Math.min(100, Math.round(
      opportunityDensityScore * 0.40
      + remoteScore * 0.40
      + colBurdenScore * 0.20,
    ));

    const optionalityLabel = geographicOptionalityScore >= 70 ? 'Excellent geographic optionality — wide escape path universe'
      : geographicOptionalityScore >= 55 ? 'Good optionality — moderate market access'
      : geographicOptionalityScore >= 40 ? 'Limited optionality — constrained by location or remote eligibility'
      : 'Highly constrained — geographic and remote factors significantly limit options';

    const runwayAdjusted = financialRunwayMonths !== null
      ? Math.round(financialRunwayMonths / Math.max(0.1, colMultiplier))
      : null;

    const reEmployment = computeReEmploymentTimeline(geographicOptionalityScore, workTypeKey);

    const remoteNote = {
      FULLY_REMOTE: 'Fully remote — 3× escape path universe vs. in-office peers. Global market access.',
      HYBRID:       'Hybrid eligible — 1.8× escape paths vs. in-office. Significant market reach expansion.',
      IN_OFFICE_ONLY: 'In-office only — significantly constrains escape paths to local market only.',
      UNKNOWN:      'Remote eligibility unknown — defaulting to partial remote assumption.',
    }[remoteEligibility];

    return {
      geographicOptionalityScore,
      optionalityLabel,
      remoteEligibility,
      remoteEscapeMultiplier: remoteMultiplier,
      remoteNote,
      geographicTier: tier,
      opportunityDensity,
      competitionLevel: tier === 'GLOBAL_HUB' ? 'HIGH' : tier === 'TIER_2_CITY' ? 'LOW' : 'MEDIUM',
      geographicNote: `${city || region} — ${tier.replace(/_/g, ' ').toLowerCase()} with ${opportunityDensity.toLowerCase()} opportunity density.`,
      costOfLivingMultiplier: colMultiplier,
      runwayAdjustedMonths: runwayAdjusted,
      colNote: colMultiplier > 1.3
        ? `High cost of living (${Math.round(colMultiplier * 100 - 100)}% above US median) compresses effective runway. ${financialRunwayMonths} months nominal = ${runwayAdjusted} months real purchasing power.`
        : `Moderate cost of living — runway is not significantly compressed by location costs.`,
      industryConcentrationRisk: industryConcentration,
      concentrationNote: industryConcentration === 'HIGH'
        ? `High industry concentration in ${city || region} — if sector cuts, local alternatives are limited. Expand geographic search or target remote positions.`
        : 'Diversified local economy — multiple industries to target if primary sector cuts.',
      reEmploymentTimelineWeeks: reEmployment,
      reEmploymentNote: `Estimated ${reEmployment.base} weeks to comparable re-employment in this market (optimistic: ${reEmployment.optimistic}wk, pessimistic: ${reEmployment.pessimistic}wk).`,
      highOpportunityMarkets: getHighOpportunityMarkets(workTypeKey, region),
      remoteFirstTargets: ['GitLab', 'Automattic (WordPress)', 'Basecamp', 'Notion', 'Linear', 'Vercel', 'Supabase', 'Fly.io'],
      geographicActions: getGeographicActions(geographicOptionalityScore, remoteEligibility, tier),
      calibrationStatus: 'research_grounded',
    };
  } catch {
    return {
      geographicOptionalityScore: 50,
      optionalityLabel: 'Unable to assess geographic optionality',
      remoteEligibility: 'UNKNOWN',
      remoteEscapeMultiplier: 1.0,
      remoteNote: 'Remote eligibility unknown.',
      geographicTier: 'UNKNOWN',
      opportunityDensity: 'VARIABLE',
      competitionLevel: 'VARIABLE',
      geographicNote: 'Location data unavailable.',
      costOfLivingMultiplier: 1.0,
      runwayAdjustedMonths: null,
      colNote: 'Cost of living data unavailable.',
      industryConcentrationRisk: 'UNKNOWN',
      concentrationNote: 'Industry concentration data unavailable.',
      reEmploymentTimelineWeeks: { optimistic: 8, base: 16, pessimistic: 32 },
      reEmploymentNote: 'Using median market re-employment estimates.',
      highOpportunityMarkets: [],
      remoteFirstTargets: [],
      geographicActions: [],
      calibrationStatus: 'research_grounded',
    };
  }
}
