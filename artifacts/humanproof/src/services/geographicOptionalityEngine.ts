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

import {
  resolveEUCity,
  resolveEURoleCategoryKey,
  getDefaultRelocationCandidates,
  EU_CITY_MARKET_PROFILES,
  type EUCityMarketProfile,
} from '../data/euCityMarketIntelligence';
import {
  getEmploymentProtectionRegime,
  computeEffectiveProtectionDays,
} from '../data/employmentProtectionLaw';

export type RemoteEligibility = 'FULLY_REMOTE' | 'HYBRID' | 'IN_OFFICE_ONLY' | 'UNKNOWN';

export type GeographicTier =
  | 'GLOBAL_HUB'        // SF, NYC, London, Singapore, Bangalore
  | 'MAJOR_METRO'       // Chicago, Austin, Hyderabad, Pune, Mumbai
  | 'SECONDARY_METRO'   // Mid-size cities with growing tech presence
  | 'TIER_2_CITY'       // Smaller cities, limited tech ecosystem
  | 'REMOTE_ONLY'       // Fully remote — geography-agnostic
  | 'UNKNOWN';

/** Per-city relocation comparison output. Each entry contains the specific data
 *  a relocating professional needs to evaluate: open jobs, salary in local currency,
 *  visa pathway, employment protection, English-language friendliness, time-to-interview.
 *  LABELED: ESTIMATED — derived from euCityMarketIntelligence.ts + employmentProtectionLaw.ts. */
export interface RelocationOption {
  cityName: string;
  countryCode: string;
  countryName: string;
  flagEmoji: string;

  /** Active employers hiring for this role in this city (ESTIMATED) */
  employerCount: number;
  /** Median weeks from first application to offer (ESTIMATED) */
  avgPlacementWeeks: number;
  /** Typical weeks to first interview (market depth proxy) */
  timeToFirstInterviewWeeks: number;

  /** Salary in LOCAL currency (formatted with symbol) */
  salaryDisplayLocal: string;
  /** Median annual salary in local currency (number) */
  salaryMedianLocal: number;
  /** Median annual salary in USD (for cross-market comparison) */
  salaryMedianUSD: number;
  /** % delta vs origin city salary (positive = higher, negative = lower) */
  salaryDeltaVsOriginPct: number | null;

  /** Fraction of postings that accept English-only candidates (0-1) */
  englishOnlyRoleFraction: number;
  /** Fraction offering remote/hybrid (0-1) */
  remoteAdoptionRate: number;
  /** Cost of living vs London (1.0 = London) */
  costOfLivingVsLondon: number;

  /** Visa pathway display (e.g., "EU Blue Card", "Kennismigrant", "Critical Skills Employment Permit") */
  visaPathwayName: string;
  /** Whether visa is required for the user (true for non-EU origin or post-Brexit UK→EU) */
  visaRequired: boolean;
  /** Salary threshold for visa in LOCAL currency */
  visaSalaryThresholdLocal: number;
  /** Visa salary threshold display string */
  visaSalaryThresholdDisplay: string;
  /** Typical visa processing weeks (min-max) */
  visaProcessingWeeksMin: number;
  visaProcessingWeeksMax: number;
  /** Visa key considerations (top 2-3) */
  visaConsiderations: string[];

  /** Employment law protection strength tier */
  employmentProtectionTier: 'minimal' | 'moderate' | 'strong' | 'very_strong';
  /** Days from announcement to last working day (large cut, ESTIMATED) */
  legalProtectionDaysMin: number;
  legalProtectionDaysMax: number;

  /** Composite fit score 0-100 (higher = better fit for this user) */
  totalFitScore: number;
  /** Why this is/isn't a good fit */
  fitRationale: string;

  /** Top 3 recommended actions specific to this city relocation */
  actionItems: string[];

  /** Key advantages of this market */
  advantages: readonly string[];
  /** Key disadvantages of this market */
  disadvantages: readonly string[];
}

/** Relocation comparison result. Present when origin city resolves to an EU/UK profile
 *  OR explicit candidate cities are provided. */
export interface RelocationOptionsResult {
  /** Origin city used as the comparison baseline (e.g., "London") */
  originCityName: string | null;
  /** Origin country code for visa pathway resolution */
  originCountryCode: string | null;
  /** Candidate cities ranked by totalFitScore descending */
  candidates: RelocationOption[];
  /** Top-line recommendation summary */
  recommendation: string;
  /** Critical warnings (e.g., "Berlin requires German for most non-tech roles") */
  warnings: string[];
  readonly labeledAs: 'ESTIMATED';
}

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

  /** Per-city relocation comparison — present when origin maps to a known EU/UK profile
   *  OR explicit candidate cities are provided. Surfaces open jobs, salary local+USD,
   *  visa pathway, employment law strength, English-only role %, time-to-first-interview. */
  relocationOptions?: RelocationOptionsResult;

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
  region?: string;         // 'US' | 'IN' | 'EU' | 'APAC' (ISO country code preferred: 'GB', 'DE', etc.)
  remoteEligibility?: RemoteEligibility;
  workTypeKey?: string;
  financialRunwayMonths?: number | null;
  /** User's visa/citizenship status — drives relocation visa pathway resolution.
   *  EU/EEA/Swiss citizens get free movement; UK post-Brexit and non-EU need visa. */
  citizenshipStatus?: 'eu_eea_citizen' | 'uk_citizen' | 'us_citizen' | 'other_non_eu';
  /** Explicit candidate cities for relocation comparison (overrides default candidates) */
  relocationCandidates?: string[];
}

// ── Relocation Options ───────────────────────────────────────────────────────
// Builds per-city comparison for relocation decisions. Surfaces the specific
// data points the user needs: open jobs, salary in local currency, visa pathway,
// employment law strength, English-only role %, time-to-first-interview.
//
// The visa requirement logic:
//   - EU/EEA/Swiss citizens: free movement to EU destinations (visaRequired=false)
//   - UK citizens (post-Brexit): need EU visa (visaRequired=true for EU destinations)
//   - Non-EU/UK origin: visa required for both UK and EU destinations
//   - For UK destination from EU origin: post-Brexit Skilled Worker visa required
function computeRelocationOptions(
  originCity: string | null,
  originRegion: string,
  candidates: string[],
  workTypeKey: string,
  citizenshipStatus: GeographicOptionalityInput['citizenshipStatus'],
): RelocationOptionsResult | undefined {
  if (!candidates.length) return undefined;

  const originProfile = resolveEUCity(originCity);
  const originRoleKey = resolveEURoleCategoryKey(workTypeKey);
  const originRoleData = originProfile?.roles[originRoleKey] ?? originProfile?.roles['general'];

  const inferredCitizenship: GeographicOptionalityInput['citizenshipStatus'] =
    citizenshipStatus
    ?? (originRegion === 'GB' || originRegion === 'UK' ? 'uk_citizen' : 'other_non_eu');

  // Resolve each candidate city and compute its option
  const options: RelocationOption[] = [];
  const warnings: string[] = [];

  for (const candidate of candidates) {
    const profile = resolveEUCity(candidate);
    if (!profile) continue;

    const roleKey = resolveEURoleCategoryKey(workTypeKey);
    const roleData = profile.roles[roleKey] ?? profile.roles['general'];
    if (!roleData) continue;

    // Determine if visa is required
    const isEUDestination = ['DE', 'NL', 'IE', 'FR', 'SE', 'ES', 'IT', 'BE'].includes(profile.countryCode);
    const isUKDestination = profile.countryCode === 'GB';
    const isCHDestination = profile.countryCode === 'CH';
    const isEUCitizen     = inferredCitizenship === 'eu_eea_citizen';
    const isUKCitizen     = inferredCitizenship === 'uk_citizen';

    let visaRequired: boolean;
    if (isEUDestination) {
      visaRequired = !isEUCitizen;      // EU destination requires visa for non-EU
    } else if (isUKDestination) {
      visaRequired = !isUKCitizen;      // UK destination requires Skilled Worker visa for non-UK
    } else if (isCHDestination) {
      visaRequired = true;              // Switzerland always requires permit (even for EU)
    } else {
      visaRequired = true;
    }

    // Compute salary delta vs origin
    const salaryDeltaVsOriginPct = originRoleData
      ? Math.round(((roleData.salaryMedianUSD - originRoleData.salaryMedianUSD) / originRoleData.salaryMedianUSD) * 100)
      : null;

    // Employment law tier from regime
    const regime = getEmploymentProtectionRegime(profile.countryCode);
    const protectionDays = regime
      ? computeEffectiveProtectionDays(regime, 1000) // assume large-cut applies for cross-market comparison
      : { min: 14, max: 60 };
    const protectionTier: RelocationOption['employmentProtectionTier'] =
      protectionDays.min >= 90 ? 'very_strong' :
      protectionDays.min >= 45 ? 'strong' :
      protectionDays.min >= 14 ? 'moderate' : 'minimal';

    // Compute fit score (0-100)
    const fitScore = computeRelocationFitScore({
      profile, roleData, visaRequired, salaryDeltaVsOriginPct,
    });

    // Build action items specific to this city
    const actionItems = buildCityActionItems(profile, visaRequired, roleData);

    // Build rationale
    const fitRationale = buildFitRationale(profile, roleData, visaRequired, salaryDeltaVsOriginPct);

    options.push({
      cityName: profile.cityName,
      countryCode: profile.countryCode,
      countryName: profile.countryName,
      flagEmoji: profile.flagEmoji,
      employerCount: roleData.employerCount,
      avgPlacementWeeks: roleData.avgPlacementWeeks,
      timeToFirstInterviewWeeks: roleData.timeToFirstInterviewWeeks,
      salaryDisplayLocal: `${profile.localCurrencySymbol}${roleData.salaryMedianLocal.toLocaleString()}`,
      salaryMedianLocal: roleData.salaryMedianLocal,
      salaryMedianUSD: roleData.salaryMedianUSD,
      salaryDeltaVsOriginPct,
      englishOnlyRoleFraction: roleData.englishOnlyRoleFraction,
      remoteAdoptionRate: roleData.remoteAdoptionRate,
      costOfLivingVsLondon: profile.costOfLivingVsLondon,
      visaPathwayName: visaRequired ? profile.visa.nonEuPathwayName : 'EU free movement',
      visaRequired,
      visaSalaryThresholdLocal: profile.visa.nonEuSalaryThresholdLocal,
      visaSalaryThresholdDisplay: visaRequired
        ? `${profile.localCurrencySymbol}${profile.visa.nonEuSalaryThresholdLocal.toLocaleString()}`
        : 'N/A — free movement',
      visaProcessingWeeksMin: profile.visa.nonEuVisaProcessingWeeksMin,
      visaProcessingWeeksMax: profile.visa.nonEuVisaProcessingWeeksMax,
      visaConsiderations: profile.visa.visaConsiderations.slice(0, 3),
      employmentProtectionTier: protectionTier,
      legalProtectionDaysMin: protectionDays.min,
      legalProtectionDaysMax: protectionDays.max,
      totalFitScore: fitScore,
      fitRationale,
      actionItems,
      advantages: profile.advantages,
      disadvantages: profile.disadvantages,
    });

    // Generate market-specific warnings
    if (visaRequired && roleData.salaryMedianLocal < profile.visa.nonEuSalaryThresholdLocal) {
      warnings.push(
        `${profile.cityName}: median ${profile.localCurrencySymbol}${roleData.salaryMedianLocal.toLocaleString()} is BELOW the ` +
        `${profile.visa.nonEuPathwayName} threshold (${profile.localCurrencySymbol}${profile.visa.nonEuSalaryThresholdLocal.toLocaleString()}). ` +
        `Visa eligibility may require negotiating above-median offer.`,
      );
    }
    if (roleData.englishOnlyRoleFraction < 0.50 && profile.englishLanguageMarket !== 'english_native') {
      warnings.push(
        `${profile.cityName}: only ${Math.round(roleData.englishOnlyRoleFraction * 100)}% of ${roleKey} roles accept English-only candidates. ` +
        `${profile.localLanguage} fluency expands your accessible market materially.`,
      );
    }
  }

  // Sort by fit score descending
  options.sort((a, b) => b.totalFitScore - a.totalFitScore);

  // Build recommendation
  const top = options[0];
  const recommendation = top
    ? `Top fit: ${top.flagEmoji} ${top.cityName} (${top.totalFitScore}/100). ` +
      `${top.employerCount.toLocaleString()} active employers, ` +
      `median ${top.salaryDisplayLocal} (~$${top.salaryMedianUSD.toLocaleString()} USD), ` +
      `${top.avgPlacementWeeks}-week placement, ${top.visaRequired ? top.visaPathwayName : 'no visa needed'}.`
    : 'No matching relocation candidates found in registry.';

  return {
    originCityName: originProfile?.cityName ?? originCity,
    originCountryCode: originProfile?.countryCode ?? originRegion,
    candidates: options,
    recommendation,
    warnings,
    labeledAs: 'ESTIMATED',
  };
}

function computeRelocationFitScore(args: {
  profile: EUCityMarketProfile;
  roleData: EUCityMarketProfile['roles'][string];
  visaRequired: boolean;
  salaryDeltaVsOriginPct: number | null;
}): number {
  const { profile, roleData, visaRequired, salaryDeltaVsOriginPct } = args;
  // Components:
  //   marketDepth (30): more employers = better
  //   englishFriendliness (20): higher = better (less language barrier)
  //   visaEase (20): no visa or fast visa = better
  //   salary (15): better salary than origin = better
  //   placementSpeed (15): faster placement = better
  const marketDepth = Math.round(profile.marketDepthScore * 30);
  const englishFriendliness = Math.round(roleData.englishOnlyRoleFraction * 20);
  const visaEase = !visaRequired
    ? 20
    : profile.visa.nonEuVisaProcessingWeeksMax <= 6 ? 16
    : profile.visa.nonEuVisaProcessingWeeksMax <= 10 ? 12 : 8;
  const salary = salaryDeltaVsOriginPct === null
    ? 8
    : salaryDeltaVsOriginPct >= 10 ? 15
    : salaryDeltaVsOriginPct >= 0 ? 12
    : salaryDeltaVsOriginPct >= -15 ? 8 : 4;
  const placementSpeed = roleData.avgPlacementWeeks <= 12 ? 15
    : roleData.avgPlacementWeeks <= 16 ? 11
    : roleData.avgPlacementWeeks <= 20 ? 7 : 4;
  return Math.min(100, marketDepth + englishFriendliness + visaEase + salary + placementSpeed);
}

function buildFitRationale(
  profile: EUCityMarketProfile,
  roleData: EUCityMarketProfile['roles'][string],
  visaRequired: boolean,
  salaryDelta: number | null,
): string {
  const parts: string[] = [];
  parts.push(`${roleData.employerCount.toLocaleString()} active employers for this role.`);
  if (roleData.englishOnlyRoleFraction >= 0.85) {
    parts.push(`English-friendly (${Math.round(roleData.englishOnlyRoleFraction * 100)}% of roles accept English-only).`);
  } else if (roleData.englishOnlyRoleFraction >= 0.50) {
    parts.push(`Moderately English-friendly (${Math.round(roleData.englishOnlyRoleFraction * 100)}% English-only roles).`);
  } else {
    parts.push(`${profile.localLanguage} fluency expands accessible market (only ${Math.round(roleData.englishOnlyRoleFraction * 100)}% English-only).`);
  }
  if (!visaRequired) {
    parts.push(`No visa required — EU free movement.`);
  } else {
    parts.push(`${profile.visa.nonEuPathwayName} required (~${profile.visa.nonEuVisaProcessingWeeksMin}-${profile.visa.nonEuVisaProcessingWeeksMax} weeks processing).`);
  }
  if (salaryDelta !== null) {
    if (salaryDelta >= 0) {
      parts.push(`+${salaryDelta}% salary vs origin.`);
    } else {
      parts.push(`${salaryDelta}% salary vs origin (offset by ${Math.round((1 - profile.costOfLivingVsLondon) * 100)}% lower cost of living).`);
    }
  }
  return parts.join(' ');
}

function buildCityActionItems(
  profile: EUCityMarketProfile,
  visaRequired: boolean,
  roleData: EUCityMarketProfile['roles'][string],
): string[] {
  const actions: string[] = [];

  if (visaRequired) {
    actions.push(
      `Confirm employer can sponsor ${profile.visa.nonEuPathwayName} ` +
      `(minimum salary ${profile.localCurrencySymbol}${profile.visa.nonEuSalaryThresholdLocal.toLocaleString()}) ` +
      `before formal application — most ${profile.cityName} multinationals do.`,
    );
  } else {
    actions.push(`No visa needed (EU free movement). Begin applications immediately.`);
  }

  if (roleData.englishOnlyRoleFraction < 0.70 && profile.englishLanguageMarket !== 'english_native') {
    actions.push(
      `Filter ${profile.cityName} job board listings to English-only roles (~${Math.round(roleData.englishOnlyRoleFraction * 100)}% of total). ` +
      `Target multinationals + tech startups for highest English-friendly ratio.`,
    );
  }

  actions.push(
    `Target ${profile.topEmployers.slice(0, 3).join(', ')} as priority employers ` +
    `(strong English-friendly hiring + ${roleData.timeToFirstInterviewWeeks}-week typical interview turnaround).`,
  );

  return actions;
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
      citizenshipStatus,
      relocationCandidates,
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

    // Compute relocation options when origin city resolves to an EU/UK profile
    // OR explicit candidate cities were provided.
    const cityKnownToEURegistry = !!resolveEUCity(city);
    const shouldComputeRelocation = cityKnownToEURegistry || (relocationCandidates?.length ?? 0) > 0;
    const candidates = relocationCandidates ?? getDefaultRelocationCandidates(city);
    const relocationOptions = shouldComputeRelocation
      ? computeRelocationOptions(city, region, candidates, workTypeKey, citizenshipStatus)
      : undefined;

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
      relocationOptions,
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
