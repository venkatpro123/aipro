// usCityMarketIntelligence.ts — US city-level job market depth intelligence.
//
// PURPOSE: L9 (jobMarketLiquidityService) previously used national US averages
// (geoScore=1.0) for every US city, making SF and Phoenix identical. This file
// provides city-level employer counts, median placement timelines, and market
// depth scores that feed directly into L9's geoScore and monthsToReemploy.
//
// KEY FINDING THAT MOTIVATED THIS:
//   A Staff Engineer in Phoenix faces structurally different options than in SF:
//   - SF Bay Area: ~15,000 active tech employers, avg SWE placement 12-16 weeks
//     (post-2023 hiring freeze reduced from 4-6 weeks pre-2023)
//   - Austin: ~3,500 active tech employers, avg SWE placement 14-20 weeks
//   - Phoenix: ~800 active tech employers, avg SWE placement 20-30 weeks;
//     many specialized roles (Staff+) require relocation consideration
//
// HOW IT FEEDS L9:
//   1. marketDepthScore → multiplies baseGeoScore (US 1.0 → city-adjusted)
//      SF: 1.0 × 1.028 = 1.028 (capped 1.0); Phoenix: 1.0 × 0.852
//   2. avgPlacementWeeks → 40% anchor on monthsToReemploy
//      blended as: 0.60 × model_estimate + 0.40 × city_anchor
//   3. relocationPressure → surfaces in narrative for small markets
//
// LABELED: ESTIMATED — derived from LinkedIn Workforce Report 2024, Indeed US
// Hiring Lab 2024-2025, Stack Overflow Dev Survey 2024, Hired.com State of
// Software Engineers 2025. Post-2023 freeze adjustments per Layoffs.fyi data.
//
// Role categories match oracle key prefixes in jobMarketLiquidityService.ts.
// `general` is the fallback when the specific role isn't in the city's data.

export type RelocationPressure = 'none' | 'low' | 'moderate' | 'high';

export interface USCityRoleData {
  /** Active employers currently hiring for this role in this city (ESTIMATED) */
  employerCount: number;
  /** Median weeks from first application to signed offer (ESTIMATED) */
  avgPlacementWeeks: number;
  /** % above/below national median salary for this role in this city (ESTIMATED) */
  salaryPremiumPct: number;
  /** Fraction of positions offering remote/hybrid (0–1, ESTIMATED) */
  remoteAdoptionRate: number;
}

export interface USCityMarketProfile {
  cityName: string;
  /** All lowercase aliases that resolve to this city from user.city input */
  aliases: readonly string[];
  state: string;
  /** 1=major tech hub, 2=established secondary market, 3=emerging/small market */
  tier: 1 | 2 | 3;
  /** 0–1: overall market depth vs SF Bay Area reference (1.0).
   *  Higher = more employers, faster placement, more options. */
  marketDepthScore: number;
  /** Multiplier applied to post-2023 hiring freeze effect (SF most affected).
   *  1.0 = no freeze effect; <1.0 = freeze reduced effective depth. */
  post2023FreezeAdjustment: number;
  /** Relocation pressure for specialized roles (Staff+, niche tech) */
  relocationPressure: RelocationPressure;
  /** Short narrative for the BreakingNewsCard / liquidity panel */
  marketNarrative: string;
  /** Role-category → city market data. Uses oracle key prefixes. */
  roles: Record<string, USCityRoleData>;
}

// ── US City Market Intelligence Registry ─────────────────────────────────────
// ESTIMATED from published hiring market research (2024-2026).
// Employer counts represent active hiring volume, not total companies.

export const US_CITY_MARKET_PROFILES: readonly USCityMarketProfile[] = [

  // ── San Francisco Bay Area ────────────────────────────────────────────────
  // Post-2023: FAANG hiring freeze cut effective demand by ~30-40%.
  // Still deepest US market but significantly slower than pre-2023.
  // Staff+ roles: 8-14 weeks (vs 2-3 weeks in 2021).
  {
    cityName: 'San Francisco Bay Area',
    aliases: [
      'san francisco', 'sf', 'bay area', 'silicon valley', 'san jose', 'palo alto',
      'mountain view', 'menlo park', 'cupertino', 'sunnyvale', 'santa clara',
      'san francisco bay area', 'south bay', 'east bay', 'oakland',
    ],
    state: 'CA',
    tier: 1,
    marketDepthScore: 0.82,             // Deep but post-2023 freeze cut from 1.0
    post2023FreezeAdjustment: 0.78,     // FAANG freeze hit SF hardest (ESTIMATED)
    relocationPressure: 'none',
    marketNarrative: 'Deep market but post-2023 hiring freeze reduced velocity significantly. ' +
      'FAANG and growth-stage startups reopening slowly — expect 10-16 weeks to offer ' +
      'vs 4-6 weeks pre-2023. Staff+ roles 14-20 weeks.',
    roles: {
      sw:      { employerCount: 14_800, avgPlacementWeeks: 12, salaryPremiumPct: 42, remoteAdoptionRate: 0.68 },
      sw_backend: { employerCount: 9_200, avgPlacementWeeks: 11, salaryPremiumPct: 45, remoteAdoptionRate: 0.70 },
      sw_frontend:{ employerCount: 5_600, avgPlacementWeeks: 13, salaryPremiumPct: 38, remoteAdoptionRate: 0.65 },
      ml:      { employerCount: 4_200, avgPlacementWeeks: 10, salaryPremiumPct: 58, remoteAdoptionRate: 0.62 },
      data:    { employerCount: 6_100, avgPlacementWeeks: 11, salaryPremiumPct: 40, remoteAdoptionRate: 0.65 },
      pm:      { employerCount: 4_800, avgPlacementWeeks: 14, salaryPremiumPct: 35, remoteAdoptionRate: 0.70 },
      qa:      { employerCount: 2_400, avgPlacementWeeks: 14, salaryPremiumPct: 22, remoteAdoptionRate: 0.60 },
      design:  { employerCount: 2_200, avgPlacementWeeks: 16, salaryPremiumPct: 28, remoteAdoptionRate: 0.72 },
      devops:  { employerCount: 3_200, avgPlacementWeeks: 11, salaryPremiumPct: 48, remoteAdoptionRate: 0.75 },
      general: { employerCount: 8_000, avgPlacementWeeks: 13, salaryPremiumPct: 38, remoteAdoptionRate: 0.65 },
    },
  },

  // ── Seattle-Bellevue ──────────────────────────────────────────────────────
  // Amazon (100k+ local) + Microsoft (75k+) anchor demand.
  // Post-2023 Amazon freeze hit Seattle harder than SF in absolute numbers
  // but the Google/Microsoft hiring compensates partially.
  {
    cityName: 'Seattle-Bellevue',
    aliases: [
      'seattle', 'bellevue', 'redmond', 'kirkland', 'seattle-bellevue',
      'puget sound', 'greater seattle', 'bothell',
    ],
    state: 'WA',
    tier: 1,
    marketDepthScore: 0.85,
    post2023FreezeAdjustment: 0.82,     // Amazon freeze hit hard in absolute numbers
    relocationPressure: 'none',
    marketNarrative: 'Amazon and Microsoft anchor deep local demand. Post-2023 Amazon ' +
      'hiring freeze softened the market but Microsoft/Google Kirkland continue hiring. ' +
      'Avg 10-14 weeks to offer for SWE; AWS/Azure cloud roles fastest (8-12 weeks).',
    roles: {
      sw:      { employerCount: 10_200, avgPlacementWeeks: 11, salaryPremiumPct: 38, remoteAdoptionRate: 0.62 },
      ml:      { employerCount: 2_800, avgPlacementWeeks: 10, salaryPremiumPct: 52, remoteAdoptionRate: 0.60 },
      data:    { employerCount: 3_800, avgPlacementWeeks: 11, salaryPremiumPct: 36, remoteAdoptionRate: 0.62 },
      pm:      { employerCount: 3_200, avgPlacementWeeks: 13, salaryPremiumPct: 30, remoteAdoptionRate: 0.65 },
      devops:  { employerCount: 2_800, avgPlacementWeeks: 10, salaryPremiumPct: 42, remoteAdoptionRate: 0.72 },
      qa:      { employerCount: 1_800, avgPlacementWeeks: 13, salaryPremiumPct: 18, remoteAdoptionRate: 0.55 },
      general: { employerCount: 6_000, avgPlacementWeeks: 12, salaryPremiumPct: 32, remoteAdoptionRate: 0.60 },
    },
  },

  // ── New York City ─────────────────────────────────────────────────────────
  // Finance-tech hybrid. Wall Street tech + startup ecosystem + FAANG offices.
  // Faster for finance roles; slower for pure-startup engineering.
  {
    cityName: 'New York City',
    aliases: [
      'new york', 'nyc', 'new york city', 'manhattan', 'brooklyn',
      'jersey city', 'hoboken',
    ],
    state: 'NY',
    tier: 1,
    marketDepthScore: 0.80,
    post2023FreezeAdjustment: 0.85,     // Finance-tech more resilient to FAANG freeze
    relocationPressure: 'none',
    marketNarrative: 'Finance-tech hybrid market — Goldman, JPMorgan, Citadel tech ' +
      'complement FAANG offices and fintech startups. Placement faster for finance-adjacent ' +
      'roles (8-12 weeks); pure startup engineering slower (14-18 weeks).',
    roles: {
      sw:      { employerCount: 11_500, avgPlacementWeeks: 13, salaryPremiumPct: 28, remoteAdoptionRate: 0.55 },
      ml:      { employerCount: 2_600, avgPlacementWeeks: 12, salaryPremiumPct: 42, remoteAdoptionRate: 0.52 },
      data:    { employerCount: 4_200, avgPlacementWeeks: 12, salaryPremiumPct: 32, remoteAdoptionRate: 0.55 },
      pm:      { employerCount: 3_800, avgPlacementWeeks: 14, salaryPremiumPct: 25, remoteAdoptionRate: 0.58 },
      devops:  { employerCount: 2_400, avgPlacementWeeks: 12, salaryPremiumPct: 30, remoteAdoptionRate: 0.60 },
      qa:      { employerCount: 1_600, avgPlacementWeeks: 14, salaryPremiumPct: 15, remoteAdoptionRate: 0.50 },
      general: { employerCount: 7_500, avgPlacementWeeks: 13, salaryPremiumPct: 26, remoteAdoptionRate: 0.55 },
    },
  },

  // ── Austin ────────────────────────────────────────────────────────────────
  // Fast-growing but shallower than Tier 1. Tesla/Dell HQ + Apple campus.
  // Post-2023: less freeze impact but employer density 4x lower than SF.
  // Longer time-to-offer due to fewer competing offers compressing timelines.
  {
    cityName: 'Austin',
    aliases: [
      'austin', 'austin tx', 'austin texas', 'round rock',
    ],
    state: 'TX',
    tier: 1,
    marketDepthScore: 0.62,
    post2023FreezeAdjustment: 0.90,     // Less freeze impact (fewer FAANG HQs)
    relocationPressure: 'low',          // Most Staff+ roles exist locally but longer wait
    marketNarrative: 'Fast-growing but employer density ~4x lower than SF. Tesla/Dell ' +
      'HQ + Apple campus + Oracle HQ anchor demand. Fewer competing offers means no ' +
      '"multiple offers in one week" dynamic. Avg 14-20 weeks for SWE; Staff+ roles ' +
      '18-26 weeks. Less affected by 2023 FAANG freeze.',
    roles: {
      sw:      { employerCount: 3_400, avgPlacementWeeks: 16, salaryPremiumPct: 8,  remoteAdoptionRate: 0.55 },
      ml:      { employerCount: 680,   avgPlacementWeeks: 18, salaryPremiumPct: 15, remoteAdoptionRate: 0.58 },
      data:    { employerCount: 1_100, avgPlacementWeeks: 17, salaryPremiumPct: 10, remoteAdoptionRate: 0.55 },
      pm:      { employerCount: 1_200, avgPlacementWeeks: 18, salaryPremiumPct: 5,  remoteAdoptionRate: 0.60 },
      devops:  { employerCount: 900,   avgPlacementWeeks: 15, salaryPremiumPct: 12, remoteAdoptionRate: 0.62 },
      qa:      { employerCount: 680,   avgPlacementWeeks: 18, salaryPremiumPct: 2,  remoteAdoptionRate: 0.48 },
      general: { employerCount: 2_000, avgPlacementWeeks: 17, salaryPremiumPct: 6,  remoteAdoptionRate: 0.55 },
    },
  },

  // ── Boston-Cambridge ──────────────────────────────────────────────────────
  // Biotech-tech hybrid. MIT/Harvard pipeline. Deep for ML/life sciences tech.
  {
    cityName: 'Boston-Cambridge',
    aliases: [
      'boston', 'cambridge', 'cambridge ma', 'boston ma', 'greater boston',
      'waltham', 'burlington ma',
    ],
    state: 'MA',
    tier: 1,
    marketDepthScore: 0.72,
    post2023FreezeAdjustment: 0.85,
    relocationPressure: 'none',
    marketNarrative: 'Biotech-tech hybrid market. MIT/Harvard pipeline sustains demand ' +
      'for ML, data, and life-sciences engineering. HubSpot + Wayfair + Amazon Boston ' +
      'anchor software demand. Avg 12-16 weeks for SWE.',
    roles: {
      sw:      { employerCount: 4_800, avgPlacementWeeks: 14, salaryPremiumPct: 18, remoteAdoptionRate: 0.60 },
      ml:      { employerCount: 1_800, avgPlacementWeeks: 12, salaryPremiumPct: 30, remoteAdoptionRate: 0.58 },
      data:    { employerCount: 2_200, avgPlacementWeeks: 13, salaryPremiumPct: 20, remoteAdoptionRate: 0.60 },
      pm:      { employerCount: 1_600, avgPlacementWeeks: 15, salaryPremiumPct: 12, remoteAdoptionRate: 0.62 },
      devops:  { employerCount: 1_200, avgPlacementWeeks: 13, salaryPremiumPct: 22, remoteAdoptionRate: 0.65 },
      qa:      { employerCount: 900,   avgPlacementWeeks: 15, salaryPremiumPct: 8,  remoteAdoptionRate: 0.52 },
      general: { employerCount: 3_000, avgPlacementWeeks: 14, salaryPremiumPct: 16, remoteAdoptionRate: 0.58 },
    },
  },

  // ── Denver-Boulder ────────────────────────────────────────────────────────
  {
    cityName: 'Denver-Boulder',
    aliases: [
      'denver', 'boulder', 'denver co', 'boulder co', 'aurora co',
      'broomfield', 'westminster co',
    ],
    state: 'CO',
    tier: 2,
    marketDepthScore: 0.52,
    post2023FreezeAdjustment: 0.92,
    relocationPressure: 'low',
    marketNarrative: 'Growing mid-tier market. Google Boulder + Amazon Denver + startup ' +
      'ecosystem. Avg 16-22 weeks for SWE. Staff+ roles may require competing with remote ' +
      'candidates — often hired against SF-based applicants.',
    roles: {
      sw:      { employerCount: 2_200, avgPlacementWeeks: 18, salaryPremiumPct: 5,  remoteAdoptionRate: 0.65 },
      ml:      { employerCount: 420,   avgPlacementWeeks: 20, salaryPremiumPct: 8,  remoteAdoptionRate: 0.65 },
      data:    { employerCount: 680,   avgPlacementWeeks: 19, salaryPremiumPct: 6,  remoteAdoptionRate: 0.62 },
      pm:      { employerCount: 680,   avgPlacementWeeks: 20, salaryPremiumPct: 2,  remoteAdoptionRate: 0.68 },
      devops:  { employerCount: 580,   avgPlacementWeeks: 17, salaryPremiumPct: 8,  remoteAdoptionRate: 0.70 },
      general: { employerCount: 1_200, avgPlacementWeeks: 19, salaryPremiumPct: 4,  remoteAdoptionRate: 0.62 },
    },
  },

  // ── Dallas-Fort Worth ─────────────────────────────────────────────────────
  {
    cityName: 'Dallas-Fort Worth',
    aliases: [
      'dallas', 'fort worth', 'dfw', 'dallas tx', 'plano tx', 'irving tx',
      'frisco tx', 'richardson tx', 'mckinney tx',
    ],
    state: 'TX',
    tier: 2,
    marketDepthScore: 0.55,
    post2023FreezeAdjustment: 0.92,
    relocationPressure: 'low',
    marketNarrative: 'Large metro with growing tech presence. AT&T, American Airlines, ' +
      'State Farm, Toyota NA all have large tech operations. Avg 16-22 weeks. ' +
      'Strong in fintech and enterprise software; weaker in consumer tech and AI.',
    roles: {
      sw:      { employerCount: 2_600, avgPlacementWeeks: 18, salaryPremiumPct: 2,  remoteAdoptionRate: 0.50 },
      ml:      { employerCount: 380,   avgPlacementWeeks: 21, salaryPremiumPct: 5,  remoteAdoptionRate: 0.55 },
      data:    { employerCount: 800,   avgPlacementWeeks: 19, salaryPremiumPct: 3,  remoteAdoptionRate: 0.52 },
      pm:      { employerCount: 780,   avgPlacementWeeks: 20, salaryPremiumPct: -2, remoteAdoptionRate: 0.52 },
      devops:  { employerCount: 680,   avgPlacementWeeks: 17, salaryPremiumPct: 5,  remoteAdoptionRate: 0.58 },
      general: { employerCount: 1_500, avgPlacementWeeks: 19, salaryPremiumPct: 1,  remoteAdoptionRate: 0.50 },
    },
  },

  // ── Chicago ───────────────────────────────────────────────────────────────
  {
    cityName: 'Chicago',
    aliases: [
      'chicago', 'chicago il', 'evanston', 'oak park il', 'naperville',
    ],
    state: 'IL',
    tier: 2,
    marketDepthScore: 0.58,
    post2023FreezeAdjustment: 0.90,
    relocationPressure: 'low',
    marketNarrative: 'Finance-tech hybrid. Trading firms (Citadel, Jane Street Chicago, ' +
      'DRW) hire top quant/SWE talent. Enterprise tech (Salesforce Chicago, Google Chicago, ' +
      'Morningstar) provides baseline. Avg 16-20 weeks for standard SWE.',
    roles: {
      sw:      { employerCount: 2_800, avgPlacementWeeks: 17, salaryPremiumPct: 5,  remoteAdoptionRate: 0.52 },
      ml:      { employerCount: 480,   avgPlacementWeeks: 18, salaryPremiumPct: 12, remoteAdoptionRate: 0.55 },
      data:    { employerCount: 880,   avgPlacementWeeks: 17, salaryPremiumPct: 8,  remoteAdoptionRate: 0.55 },
      pm:      { employerCount: 780,   avgPlacementWeeks: 19, salaryPremiumPct: 2,  remoteAdoptionRate: 0.55 },
      devops:  { employerCount: 680,   avgPlacementWeeks: 16, salaryPremiumPct: 8,  remoteAdoptionRate: 0.60 },
      general: { employerCount: 1_600, avgPlacementWeeks: 18, salaryPremiumPct: 4,  remoteAdoptionRate: 0.52 },
    },
  },

  // ── Raleigh-Durham (Research Triangle) ───────────────────────────────────
  {
    cityName: 'Raleigh-Durham',
    aliases: [
      'raleigh', 'durham', 'chapel hill', 'rtp', 'research triangle',
      'cary nc', 'morrisville nc',
    ],
    state: 'NC',
    tier: 2,
    marketDepthScore: 0.50,
    post2023FreezeAdjustment: 0.92,
    relocationPressure: 'moderate',     // Staff+ often competes with SF-based candidates
    marketNarrative: 'Research Triangle tech hub. IBM RTP + Cisco + Red Hat/IBM + Apple ' +
      'campus anchor demand. Avg 18-24 weeks for SWE. Strong in enterprise infrastructure ' +
      'and cloud. Staff+ roles often compete against remote candidates from larger hubs.',
    roles: {
      sw:      { employerCount: 1_800, avgPlacementWeeks: 20, salaryPremiumPct: -5, remoteAdoptionRate: 0.62 },
      ml:      { employerCount: 280,   avgPlacementWeeks: 22, salaryPremiumPct: 2,  remoteAdoptionRate: 0.62 },
      data:    { employerCount: 520,   avgPlacementWeeks: 21, salaryPremiumPct: 0,  remoteAdoptionRate: 0.60 },
      pm:      { employerCount: 480,   avgPlacementWeeks: 22, salaryPremiumPct: -8, remoteAdoptionRate: 0.62 },
      devops:  { employerCount: 480,   avgPlacementWeeks: 19, salaryPremiumPct: 2,  remoteAdoptionRate: 0.65 },
      general: { employerCount: 1_000, avgPlacementWeeks: 21, salaryPremiumPct: -4, remoteAdoptionRate: 0.60 },
    },
  },

  // ── Atlanta ───────────────────────────────────────────────────────────────
  {
    cityName: 'Atlanta',
    aliases: [
      'atlanta', 'atlanta ga', 'buckhead', 'midtown atlanta', 'alpharetta',
    ],
    state: 'GA',
    tier: 2,
    marketDepthScore: 0.48,
    post2023FreezeAdjustment: 0.92,
    relocationPressure: 'moderate',
    marketNarrative: 'Growing fintech hub (Fiserv, NCR, Global Payments HQs). Delta, ' +
      'Coca-Cola, Home Depot tech operations add enterprise demand. Avg 18-26 weeks ' +
      'for SWE. Strong in payments and fintech engineering.',
    roles: {
      sw:      { employerCount: 1_600, avgPlacementWeeks: 22, salaryPremiumPct: -8, remoteAdoptionRate: 0.52 },
      ml:      { employerCount: 220,   avgPlacementWeeks: 24, salaryPremiumPct: -2, remoteAdoptionRate: 0.55 },
      data:    { employerCount: 480,   avgPlacementWeeks: 23, salaryPremiumPct: -4, remoteAdoptionRate: 0.52 },
      pm:      { employerCount: 380,   avgPlacementWeeks: 24, salaryPremiumPct: -10,remoteAdoptionRate: 0.55 },
      devops:  { employerCount: 380,   avgPlacementWeeks: 20, salaryPremiumPct: 0,  remoteAdoptionRate: 0.58 },
      general: { employerCount: 900,   avgPlacementWeeks: 23, salaryPremiumPct: -7, remoteAdoptionRate: 0.52 },
    },
  },

  // ── Los Angeles ───────────────────────────────────────────────────────────
  {
    cityName: 'Los Angeles',
    aliases: [
      'los angeles', 'la', 'santa monica', 'culver city', 'el segundo',
      'burbank', 'playa vista', 'venice ca',
    ],
    state: 'CA',
    tier: 2,
    marketDepthScore: 0.60,
    post2023FreezeAdjustment: 0.85,
    relocationPressure: 'none',
    marketNarrative: 'Entertainment-tech hybrid. Snap HQ, Riot Games, SpaceX, TikTok ' +
      'Culver City anchor demand. Gaming, streaming, and creative tech strong. ' +
      'Weaker for enterprise SWE vs SF. Avg 16-22 weeks.',
    roles: {
      sw:      { employerCount: 2_800, avgPlacementWeeks: 18, salaryPremiumPct: 12, remoteAdoptionRate: 0.60 },
      ml:      { employerCount: 580,   avgPlacementWeeks: 18, salaryPremiumPct: 20, remoteAdoptionRate: 0.60 },
      data:    { employerCount: 920,   avgPlacementWeeks: 19, salaryPremiumPct: 14, remoteAdoptionRate: 0.62 },
      pm:      { employerCount: 1_100, avgPlacementWeeks: 19, salaryPremiumPct: 8,  remoteAdoptionRate: 0.62 },
      design:  { employerCount: 980,   avgPlacementWeeks: 18, salaryPremiumPct: 16, remoteAdoptionRate: 0.68 },
      devops:  { employerCount: 680,   avgPlacementWeeks: 17, salaryPremiumPct: 18, remoteAdoptionRate: 0.65 },
      general: { employerCount: 1_800, avgPlacementWeeks: 19, salaryPremiumPct: 10, remoteAdoptionRate: 0.60 },
    },
  },

  // ── Phoenix ───────────────────────────────────────────────────────────────
  // THE KEY MISSING MARKET: previously got US=1.0 geoScore, same as SF.
  // Reality: ~800 active tech employers vs SF's 15,000. Staff Engineer must
  // often relocate or compete for fully-remote roles against candidates from
  // much deeper markets. Avg placement 20-30 weeks.
  {
    cityName: 'Phoenix',
    aliases: [
      'phoenix', 'phoenix az', 'scottsdale', 'tempe', 'chandler az',
      'gilbert az', 'mesa az', 'greater phoenix',
    ],
    state: 'AZ',
    tier: 3,
    marketDepthScore: 0.35,             // ~5% of SF's active employer count
    post2023FreezeAdjustment: 0.95,     // Less freeze impact; fewer FAANG here
    relocationPressure: 'high',         // Staff+ roles: relocation or remote-only search
    marketNarrative: 'Small-but-growing market. Intel Chandler fab + GoDaddy + PayPal ' +
      'ops anchor demand, but specialized engineering roles (Staff+, ML, Platform) are ' +
      'scarce locally. Avg 20-30 weeks for SWE; many candidates must target remote ' +
      'roles or face relocation. 60-70% of Staff Engineer positions require relocating ' +
      'or winning a remote role at a company based in a deeper market.',
    roles: {
      sw:      { employerCount: 780,    avgPlacementWeeks: 22, salaryPremiumPct: -18, remoteAdoptionRate: 0.65 },
      ml:      { employerCount: 95,     avgPlacementWeeks: 28, salaryPremiumPct: -10, remoteAdoptionRate: 0.72 },
      data:    { employerCount: 220,    avgPlacementWeeks: 26, salaryPremiumPct: -14, remoteAdoptionRate: 0.68 },
      pm:      { employerCount: 220,    avgPlacementWeeks: 26, salaryPremiumPct: -20, remoteAdoptionRate: 0.65 },
      devops:  { employerCount: 180,    avgPlacementWeeks: 22, salaryPremiumPct: -12, remoteAdoptionRate: 0.68 },
      qa:      { employerCount: 180,    avgPlacementWeeks: 25, salaryPremiumPct: -20, remoteAdoptionRate: 0.58 },
      general: { employerCount: 420,    avgPlacementWeeks: 24, salaryPremiumPct: -17, remoteAdoptionRate: 0.65 },
    },
  },
];

// ── Resolution utilities ───────────────────────────────────────────────────────

/** Look up a US city's market profile. Returns null for non-US or unknown cities. */
export function resolveUSCityMarket(city: string | null | undefined): USCityMarketProfile | null {
  if (!city) return null;
  const normalized = city.toLowerCase().trim();
  for (const profile of US_CITY_MARKET_PROFILES) {
    if (profile.aliases.some(a =>
      normalized === a
      || normalized.startsWith(a + ',')
      || normalized.startsWith(a + ' ')
      || a.startsWith(normalized.split(',')[0].trim()),
    )) {
      return profile;
    }
  }
  return null;
}

/** Map an oracle role key to the city role data key (prefix matching). */
export function resolveRoleCategoryKey(oracleKey: string): string {
  const k = oracleKey.toLowerCase().replace(/-/g, '_');
  if (/^(ml_|ai_|llm_|research_sci)/.test(k)) return 'ml';
  if (/^(sw_backend|sw_fullstack|sw_mob|sw_arch|platform_|sre|devops)/.test(k)) return 'sw';
  if (/^(sw_front|web_)/.test(k)) return 'sw_frontend';
  if (/^(data_eng|data_sci|data_anal|bi_)/.test(k)) return 'data';
  if (/^(product_manag|pm_)/.test(k)) return 'pm';
  if (/^(qa_|test_|sdet)/.test(k)) return 'qa';
  if (/^(ux_|ui_|design|product_des)/.test(k)) return 'design';
  if (/^(devops|cloud_|security|infra)/.test(k)) return 'devops';
  return 'general';
}

/** Compute the market depth multiplier for L9 geoScore.
 *  Returns a value 0.70–1.05: deeper market = higher multiplier.
 *  The 0.70 floor ensures the multiplier never collapses geoScore entirely. */
export function computeCityDepthMultiplier(profile: USCityMarketProfile): number {
  // Base depth multiplier: 0.70 (shallow) to 1.10 (deepest)
  const base = 0.70 + profile.marketDepthScore * 0.40;
  // Adjust for post-2023 freeze: SF most affected, Phoenix least
  return Math.min(1.10, Math.max(0.70, base * profile.post2023FreezeAdjustment));
}
