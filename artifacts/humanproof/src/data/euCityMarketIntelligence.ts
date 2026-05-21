// euCityMarketIntelligence.ts — EU/UK city-level relocation intelligence.
//
// PURPOSE: GeographicOptionalityEngine (Layer 35) previously had only
// cost-of-living + tier per EU city (Berlin only). A London professional asking
// "Berlin vs Amsterdam vs Dublin" got generic advice with zero specificity.
//
// This file provides the structured data needed to make relocation actionable:
//   - open job counts by role
//   - median salary in local currency + USD
//   - visa pathway (EU citizen vs non-EU Skilled Worker)
//   - employment law protection strength
//   - remote adoption + English-only role fraction
//   - time-to-first-interview by market depth
//   - cost-of-living vs London
//
// KEY USE CASE (the user's question):
//   London-based non-EU professional considering relocation.
//   - Berlin: EU Blue Card €45,300+, German required for many non-tech roles,
//     45% of tech jobs accept English-only candidates, avg 14 wk SWE placement.
//   - Amsterdam: Highly Skilled Migrant €5,331/mo, English-friendly (78% of tech
//     roles), Kennismigrant 4-week processing, avg 12 wk SWE placement.
//   - Dublin: Critical Skills Employment Permit €38k+, 95% English (no language
//     barrier), 3-4 week processing, avg 13 wk SWE placement, 70+ MNC HQs.
//
// LABELED: ESTIMATED — sourced from LinkedIn Workforce Report 2024-2025,
// Eurostat employment data, EU Blue Card statistics (BAMF 2024, IND.nl 2024,
// INIS Ireland 2024), Glassdoor / Levels.fyi salary data 2024-2025.

export type EUVisaPathway =
  | 'eu_free_movement'         // EU citizens — no visa needed
  | 'eu_blue_card'             // Non-EU skilled — EU-wide framework
  | 'national_skilled'         // Country-specific skilled visa
  | 'critical_skills_permit'   // Ireland's primary skilled route
  | 'kennismigrant'            // Netherlands Highly Skilled Migrant
  | 'skilled_worker_visa'      // UK post-Brexit
  | 'talent_passport';         // France talent route

export type EnglishLanguageMarket =
  | 'english_native'   // English is the working language (London, Dublin)
  | 'english_high'     // 70%+ of tech roles accept English-only (Amsterdam, Stockholm)
  | 'english_medium'   // 40-70% of tech roles accept English-only (Berlin, Zurich)
  | 'english_low';     // <40% (Paris, Madrid, Munich for non-tech)

export interface EUCityRoleData {
  /** Active employers currently hiring for this role in this city (ESTIMATED) */
  employerCount: number;
  /** Median weeks from first application to signed offer (ESTIMATED) */
  avgPlacementWeeks: number;
  /** Typical weeks to first interview (proxy for market depth + recruiter velocity) */
  timeToFirstInterviewWeeks: number;
  /** Median annual salary in LOCAL currency (ESTIMATED) */
  salaryMedianLocal: number;
  /** Median annual salary normalized to USD for cross-market comparison (ESTIMATED) */
  salaryMedianUSD: number;
  /** Fraction of postings that accept English-only candidates (0-1) — KEY for non-locals */
  englishOnlyRoleFraction: number;
  /** Fraction offering remote/hybrid (0-1) */
  remoteAdoptionRate: number;
}

export interface EUCityVisaInfo {
  /** EU citizens (and Swiss/EEA): generally free movement */
  euCitizenPathway: EUVisaPathway;
  /** Primary route for non-EU professionals */
  nonEuPrimaryPathway: EUVisaPathway;
  /** Display name of the non-EU pathway */
  nonEuPathwayName: string;
  /** Minimum salary threshold for the non-EU pathway (LOCAL currency, annual) */
  nonEuSalaryThresholdLocal: number;
  /** Minimum salary threshold in USD (for cross-market comparison) */
  nonEuSalaryThresholdUSD: number;
  /** Typical visa processing time in weeks (best case) */
  nonEuVisaProcessingWeeksMin: number;
  /** Typical visa processing time in weeks (typical case) */
  nonEuVisaProcessingWeeksMax: number;
  /** Post-termination grace period for visa holders (days) */
  postTerminationGracePeriodDays: number;
  /** UK post-Brexit specific note (if relevant) */
  postBrexitNote?: string;
  /** Special considerations / common pitfalls */
  visaConsiderations: string[];
}

export interface EUCityMarketProfile {
  cityName: string;
  countryCode: string;             // ISO 3166-1 alpha-2
  countryName: string;
  flagEmoji: string;
  /** All lowercase aliases that resolve to this city */
  aliases: readonly string[];
  /** Market tier: 1=major EU hub, 2=established, 3=secondary/emerging */
  tier: 1 | 2 | 3;
  /** Local currency (ISO 4217) */
  localCurrency: string;
  localCurrencySymbol: string;
  /** Cost of living index vs London (1.0 = same as London) */
  costOfLivingVsLondon: number;
  /** Market depth score 0–1: deeper = more employers, faster placement */
  marketDepthScore: number;
  /** English-language workplace classification */
  englishLanguageMarket: EnglishLanguageMarket;
  /** Default local language for non-tech / generalist roles */
  localLanguage: string;
  /** Visa pathway information */
  visa: EUCityVisaInfo;
  /** Role-category specific market data */
  roles: Record<string, EUCityRoleData>;
  /** Top 5 hiring employers in the metro */
  topEmployers: readonly string[];
  /** Human narrative for the relocation card */
  cityNarrative: string;
  /** Key advantages of this market */
  advantages: readonly string[];
  /** Key disadvantages of this market */
  disadvantages: readonly string[];
}

// ── EU City Market Intelligence Registry ─────────────────────────────────────
// ESTIMATED from published 2024-2025 employment market research.

export const EU_CITY_MARKET_PROFILES: readonly EUCityMarketProfile[] = [

  // ── London (UK) ───────────────────────────────────────────────────────────
  // Origin baseline for most EU relocation comparisons. Post-Brexit visa
  // requirements changed materially for EU citizens (now Skilled Worker visa).
  {
    cityName: 'London',
    countryCode: 'GB',
    countryName: 'United Kingdom',
    flagEmoji: '🇬🇧',
    aliases: [
      'london', 'london uk', 'greater london', 'canary wharf',
      'shoreditch', 'kings cross london', 'london england',
    ],
    tier: 1,
    localCurrency: 'GBP',
    localCurrencySymbol: '£',
    costOfLivingVsLondon: 1.00,           // reference baseline
    marketDepthScore: 0.85,
    englishLanguageMarket: 'english_native',
    localLanguage: 'English',
    visa: {
      euCitizenPathway: 'skilled_worker_visa',  // post-Brexit: EU citizens need visa
      nonEuPrimaryPathway: 'skilled_worker_visa',
      nonEuPathwayName: 'Skilled Worker visa',
      nonEuSalaryThresholdLocal: 38_700,   // £38,700 standard threshold (Apr 2024)
      nonEuSalaryThresholdUSD: 49_000,
      nonEuVisaProcessingWeeksMin: 3,
      nonEuVisaProcessingWeeksMax: 8,
      postTerminationGracePeriodDays: 60,
      postBrexitNote: 'Post-Brexit: EU citizens require Skilled Worker visa for new jobs. Pre-2021 EU arrivals may have Settled Status.',
      visaConsiderations: [
        'Skilled Worker visa is tied to a specific employer (sponsor change requires new application)',
        'Indefinite Leave to Remain after 5 years on Skilled Worker route',
        'Health surcharge: £1,035/year per applicant',
        'Dependants require separate applications',
      ],
    },
    roles: {
      sw:      { employerCount: 8_500, avgPlacementWeeks: 11, timeToFirstInterviewWeeks: 2, salaryMedianLocal:  75_000, salaryMedianUSD:  95_000, englishOnlyRoleFraction: 1.00, remoteAdoptionRate: 0.62 },
      ml:      { employerCount: 2_100, avgPlacementWeeks: 12, timeToFirstInterviewWeeks: 2, salaryMedianLocal:  95_000, salaryMedianUSD: 120_000, englishOnlyRoleFraction: 1.00, remoteAdoptionRate: 0.58 },
      data:    { employerCount: 3_400, avgPlacementWeeks: 12, timeToFirstInterviewWeeks: 3, salaryMedianLocal:  72_000, salaryMedianUSD:  91_000, englishOnlyRoleFraction: 1.00, remoteAdoptionRate: 0.62 },
      pm:      { employerCount: 2_800, avgPlacementWeeks: 14, timeToFirstInterviewWeeks: 3, salaryMedianLocal:  80_000, salaryMedianUSD: 101_000, englishOnlyRoleFraction: 1.00, remoteAdoptionRate: 0.65 },
      devops:  { employerCount: 1_900, avgPlacementWeeks: 11, timeToFirstInterviewWeeks: 2, salaryMedianLocal:  78_000, salaryMedianUSD:  98_000, englishOnlyRoleFraction: 1.00, remoteAdoptionRate: 0.70 },
      finance: { employerCount: 6_200, avgPlacementWeeks: 13, timeToFirstInterviewWeeks: 3, salaryMedianLocal:  85_000, salaryMedianUSD: 107_000, englishOnlyRoleFraction: 1.00, remoteAdoptionRate: 0.42 },
      general: { employerCount: 4_500, avgPlacementWeeks: 13, timeToFirstInterviewWeeks: 3, salaryMedianLocal:  68_000, salaryMedianUSD:  86_000, englishOnlyRoleFraction: 1.00, remoteAdoptionRate: 0.55 },
    },
    topEmployers: ['Google UK', 'Amazon UK', 'Meta UK', 'Microsoft UK', 'Revolut', 'Monzo', 'DeepMind', 'Wise'],
    cityNarrative: 'Europe\'s largest FinTech + tech market. Post-Brexit visa friction for EU citizens, but Skilled Worker visa is fast (3-8 weeks) and English-native workplace removes language barrier entirely.',
    advantages: [
      'English-native workplace — zero language barrier',
      'Largest EU tech market (~8,500 active SWE employers)',
      'Strong FinTech sector (Revolut, Monzo, Wise) + FAANG EU offices',
      'Skilled Worker visa processes in 3-8 weeks (faster than most EU)',
    ],
    disadvantages: [
      'Highest cost of living in Europe',
      'Post-Brexit: EU citizens now need visa (was free movement pre-2021)',
      'Visa tied to employer (sponsor change requires new application)',
      'High income tax + National Insurance (~42% marginal for £50k+)',
    ],
  },

  // ── Berlin (Germany) ──────────────────────────────────────────────────────
  // Largest EU startup capital. EU Blue Card + Fachkräfteeinwanderungsgesetz.
  // German required for most non-tech roles; tech sector ~45% English-friendly.
  {
    cityName: 'Berlin',
    countryCode: 'DE',
    countryName: 'Germany',
    flagEmoji: '🇩🇪',
    aliases: [
      'berlin', 'berlin de', 'berlin germany', 'mitte', 'kreuzberg',
      'prenzlauer berg', 'friedrichshain',
    ],
    tier: 1,
    localCurrency: 'EUR',
    localCurrencySymbol: '€',
    costOfLivingVsLondon: 0.72,           // significantly cheaper than London
    marketDepthScore: 0.68,
    englishLanguageMarket: 'english_medium',
    localLanguage: 'German',
    visa: {
      euCitizenPathway: 'eu_free_movement',
      nonEuPrimaryPathway: 'eu_blue_card',
      nonEuPathwayName: 'EU Blue Card (Germany)',
      nonEuSalaryThresholdLocal: 45_300,   // €45,300 (2024 threshold for shortage occupations)
      nonEuSalaryThresholdUSD: 49_000,
      nonEuVisaProcessingWeeksMin: 6,
      nonEuVisaProcessingWeeksMax: 12,
      postTerminationGracePeriodDays: 90,
      visaConsiderations: [
        'EU Blue Card: minimum salary €45,300 (shortage roles: IT/STEM) or €58,400 (general)',
        'Permanent residence eligible after 33 months on Blue Card (21 with B1 German)',
        'Anmeldung (city registration) required within 14 days of arrival',
        'Krankenversicherung (health insurance) is MANDATORY — public ~14.6% of salary',
        'Steuer-ID and tax class can take 4-6 weeks post-arrival',
      ],
    },
    roles: {
      sw:      { employerCount: 3_200, avgPlacementWeeks: 14, timeToFirstInterviewWeeks: 3, salaryMedianLocal:  72_000, salaryMedianUSD:  78_000, englishOnlyRoleFraction: 0.62, remoteAdoptionRate: 0.55 },
      ml:      { employerCount: 580,   avgPlacementWeeks: 13, timeToFirstInterviewWeeks: 3, salaryMedianLocal:  85_000, salaryMedianUSD:  92_000, englishOnlyRoleFraction: 0.70, remoteAdoptionRate: 0.58 },
      data:    { employerCount: 920,   avgPlacementWeeks: 14, timeToFirstInterviewWeeks: 3, salaryMedianLocal:  68_000, salaryMedianUSD:  74_000, englishOnlyRoleFraction: 0.55, remoteAdoptionRate: 0.55 },
      pm:      { employerCount: 880,   avgPlacementWeeks: 16, timeToFirstInterviewWeeks: 4, salaryMedianLocal:  78_000, salaryMedianUSD:  85_000, englishOnlyRoleFraction: 0.45, remoteAdoptionRate: 0.58 },
      devops:  { employerCount: 720,   avgPlacementWeeks: 14, timeToFirstInterviewWeeks: 3, salaryMedianLocal:  75_000, salaryMedianUSD:  81_000, englishOnlyRoleFraction: 0.65, remoteAdoptionRate: 0.65 },
      finance: { employerCount: 540,   avgPlacementWeeks: 18, timeToFirstInterviewWeeks: 4, salaryMedianLocal:  70_000, salaryMedianUSD:  76_000, englishOnlyRoleFraction: 0.20, remoteAdoptionRate: 0.42 },
      general: { employerCount: 1_800, avgPlacementWeeks: 17, timeToFirstInterviewWeeks: 4, salaryMedianLocal:  60_000, salaryMedianUSD:  65_000, englishOnlyRoleFraction: 0.35, remoteAdoptionRate: 0.50 },
    },
    topEmployers: ['Zalando', 'Delivery Hero', 'HelloFresh', 'SumUp', 'Auto1', 'N26', 'SoundCloud'],
    cityNarrative: 'EU\'s largest startup ecosystem outside London. 72% cost of living vs London. Tech roles ~62% English-friendly; non-tech roles overwhelmingly require German B1+. EU Blue Card processes in 6-12 weeks; permanent residence in 21 months with B1 German.',
    advantages: [
      'Cost of living 28% lower than London (rent ~50% of London)',
      'EU Blue Card threshold relatively low (€45,300 for STEM/IT)',
      'Strong startup ecosystem: Zalando, Delivery Hero, N26, SumUp',
      'Strongest employment protection in EU (Betriebsrat + Sozialplan + BGB §622)',
      'Path to permanent residence in 21 months with B1 German',
    ],
    disadvantages: [
      '~45% of tech roles require German B1+ (most non-tech roles require fluent German)',
      'Bürokratie burden: Anmeldung, Krankenversicherung, Steuer-ID setup takes weeks',
      'Salary 20-25% lower than London for equivalent SWE roles (offset by cost of living)',
      'Apartment search in Berlin can take 2-3 months due to housing scarcity',
    ],
  },

  // ── Amsterdam (Netherlands) ───────────────────────────────────────────────
  // EU\'s most English-friendly tech market. Kennismigrant (HSM) is fast (4 weeks).
  // 30% ruling tax break for incoming professionals.
  {
    cityName: 'Amsterdam',
    countryCode: 'NL',
    countryName: 'Netherlands',
    flagEmoji: '🇳🇱',
    aliases: [
      'amsterdam', 'amsterdam nl', 'amsterdam netherlands', 'zuidoost',
      'haarlemmermeer', 'amstelveen',
    ],
    tier: 1,
    localCurrency: 'EUR',
    localCurrencySymbol: '€',
    costOfLivingVsLondon: 0.85,
    marketDepthScore: 0.62,
    englishLanguageMarket: 'english_high',
    localLanguage: 'Dutch',
    visa: {
      euCitizenPathway: 'eu_free_movement',
      nonEuPrimaryPathway: 'kennismigrant',
      nonEuPathwayName: 'Highly Skilled Migrant (Kennismigrant)',
      nonEuSalaryThresholdLocal: 63_972,   // €5,331/month × 12 (2024 threshold, age 30+)
      nonEuSalaryThresholdUSD: 69_400,
      nonEuVisaProcessingWeeksMin: 2,
      nonEuVisaProcessingWeeksMax: 4,      // IND.nl typical 2-4 weeks
      postTerminationGracePeriodDays: 90,
      visaConsiderations: [
        'Kennismigrant: €5,331/month minimum (2024, age 30+); €3,909/month for under-30',
        'Faster than EU Blue Card: typical IND processing 2-4 weeks',
        'Employer must be IND-recognised sponsor (most major tech employers are)',
        '30% ruling tax break for incoming professionals (up to 5 years, ~30% of gross tax-free)',
        'BSN (Citizen Service Number) needed for banking, housing — apply at municipality',
        'Housing market extremely tight — start search 3+ months before arrival',
      ],
    },
    roles: {
      sw:      { employerCount: 2_400, avgPlacementWeeks: 12, timeToFirstInterviewWeeks: 2, salaryMedianLocal:  78_000, salaryMedianUSD:  85_000, englishOnlyRoleFraction: 0.85, remoteAdoptionRate: 0.62 },
      ml:      { employerCount: 480,   avgPlacementWeeks: 12, timeToFirstInterviewWeeks: 2, salaryMedianLocal:  92_000, salaryMedianUSD: 100_000, englishOnlyRoleFraction: 0.92, remoteAdoptionRate: 0.65 },
      data:    { employerCount: 720,   avgPlacementWeeks: 13, timeToFirstInterviewWeeks: 3, salaryMedianLocal:  72_000, salaryMedianUSD:  78_000, englishOnlyRoleFraction: 0.80, remoteAdoptionRate: 0.62 },
      pm:      { employerCount: 680,   avgPlacementWeeks: 14, timeToFirstInterviewWeeks: 3, salaryMedianLocal:  82_000, salaryMedianUSD:  89_000, englishOnlyRoleFraction: 0.78, remoteAdoptionRate: 0.65 },
      devops:  { employerCount: 580,   avgPlacementWeeks: 12, timeToFirstInterviewWeeks: 2, salaryMedianLocal:  80_000, salaryMedianUSD:  87_000, englishOnlyRoleFraction: 0.88, remoteAdoptionRate: 0.70 },
      finance: { employerCount: 920,   avgPlacementWeeks: 15, timeToFirstInterviewWeeks: 3, salaryMedianLocal:  76_000, salaryMedianUSD:  83_000, englishOnlyRoleFraction: 0.55, remoteAdoptionRate: 0.50 },
      general: { employerCount: 1_400, avgPlacementWeeks: 14, timeToFirstInterviewWeeks: 3, salaryMedianLocal:  65_000, salaryMedianUSD:  71_000, englishOnlyRoleFraction: 0.62, remoteAdoptionRate: 0.58 },
    },
    topEmployers: ['Booking.com', 'ASML', 'ING', 'Adyen', 'TomTom', 'Philips', 'Meta NL', 'Google NL'],
    cityNarrative: 'EU\'s most English-friendly tech market (~85% of tech roles accept English-only). Kennismigrant visa is the fastest skilled-worker pathway in Europe (2-4 weeks IND processing). 30% ruling provides material tax benefit for incoming professionals. Salaries 5-10% higher than Berlin.',
    advantages: [
      '85% of tech roles accept English-only candidates — minimal language barrier',
      'Kennismigrant visa processes in 2-4 weeks (fastest in EU)',
      '30% ruling: ~30% of gross salary tax-free for up to 5 years',
      'Strong tech employers: Booking.com, Adyen, ASML, ING tech',
      'UWV requires permission before dismissal (additional 4-6 weeks legal protection)',
    ],
    disadvantages: [
      'Housing crisis: rental market extremely tight, start 3+ months pre-arrival',
      'Cost of living 85% of London (significantly cheaper but still expensive)',
      'Smaller tech market than London (~2,400 SWE employers vs 8,500)',
      'Income tax higher than UK at top brackets (49.5% top rate vs 45% UK)',
    ],
  },

  // ── Dublin (Ireland) ──────────────────────────────────────────────────────
  // EU HQ for 70+ US multinational tech companies. English-native workplace.
  // Critical Skills Employment Permit is the fastest EU pathway (3-4 weeks).
  {
    cityName: 'Dublin',
    countryCode: 'IE',
    countryName: 'Ireland',
    flagEmoji: '🇮🇪',
    aliases: [
      'dublin', 'dublin ie', 'dublin ireland', 'dublin city', 'docklands',
      'sandyford', 'silicon docks',
    ],
    tier: 1,
    localCurrency: 'EUR',
    localCurrencySymbol: '€',
    costOfLivingVsLondon: 0.92,
    marketDepthScore: 0.65,
    englishLanguageMarket: 'english_native',
    localLanguage: 'English',
    visa: {
      euCitizenPathway: 'eu_free_movement',
      nonEuPrimaryPathway: 'critical_skills_permit',
      nonEuPathwayName: 'Critical Skills Employment Permit',
      nonEuSalaryThresholdLocal: 38_000,   // €38k for shortage occupations (IT/STEM)
      nonEuSalaryThresholdUSD: 41_300,
      nonEuVisaProcessingWeeksMin: 3,
      nonEuVisaProcessingWeeksMax: 6,
      postTerminationGracePeriodDays: 90,
      visaConsiderations: [
        'Critical Skills Employment Permit: €38k minimum for shortage occupations (most tech roles)',
        'EU Blue Card alternative: €64k+ minimum (higher than CSEP for most cases)',
        'Stamp 4 (long-term residence) eligible after 2 years on CSEP',
        'PPS Number (Personal Public Service) required for banking/housing',
        '70+ MNC HQs (Google, Meta, Stripe, Salesforce, LinkedIn, Workday) anchor the market',
        'Dublin rental market is tight — €2,000-2,800/mo for 1-bedroom city centre',
      ],
    },
    roles: {
      sw:      { employerCount: 2_800, avgPlacementWeeks: 13, timeToFirstInterviewWeeks: 2, salaryMedianLocal:  75_000, salaryMedianUSD:  81_000, englishOnlyRoleFraction: 1.00, remoteAdoptionRate: 0.65 },
      ml:      { employerCount: 620,   avgPlacementWeeks: 12, timeToFirstInterviewWeeks: 2, salaryMedianLocal:  92_000, salaryMedianUSD: 100_000, englishOnlyRoleFraction: 1.00, remoteAdoptionRate: 0.68 },
      data:    { employerCount: 880,   avgPlacementWeeks: 13, timeToFirstInterviewWeeks: 2, salaryMedianLocal:  72_000, salaryMedianUSD:  78_000, englishOnlyRoleFraction: 1.00, remoteAdoptionRate: 0.65 },
      pm:      { employerCount: 720,   avgPlacementWeeks: 14, timeToFirstInterviewWeeks: 3, salaryMedianLocal:  85_000, salaryMedianUSD:  92_000, englishOnlyRoleFraction: 1.00, remoteAdoptionRate: 0.68 },
      devops:  { employerCount: 580,   avgPlacementWeeks: 12, timeToFirstInterviewWeeks: 2, salaryMedianLocal:  82_000, salaryMedianUSD:  89_000, englishOnlyRoleFraction: 1.00, remoteAdoptionRate: 0.72 },
      finance: { employerCount: 1_100, avgPlacementWeeks: 14, timeToFirstInterviewWeeks: 3, salaryMedianLocal:  78_000, salaryMedianUSD:  85_000, englishOnlyRoleFraction: 1.00, remoteAdoptionRate: 0.50 },
      general: { employerCount: 1_500, avgPlacementWeeks: 13, timeToFirstInterviewWeeks: 3, salaryMedianLocal:  68_000, salaryMedianUSD:  74_000, englishOnlyRoleFraction: 1.00, remoteAdoptionRate: 0.62 },
    },
    topEmployers: ['Google EMEA', 'Meta EMEA', 'Microsoft Ireland', 'Stripe', 'Salesforce', 'LinkedIn', 'Workday', 'HubSpot'],
    cityNarrative: '70+ US multinational EU HQs anchor the market (Google, Meta, Stripe, Salesforce). English-native workplace eliminates language barrier entirely. Critical Skills Employment Permit processes in 3-6 weeks — comparable to UK Skilled Worker. Salaries trail London by 10-15% but no Brexit visa friction for EU citizens.',
    advantages: [
      'English-native workplace — zero language barrier',
      'Critical Skills Employment Permit fast (3-6 weeks) and low salary threshold (€38k for tech)',
      '70+ US multinational EU HQs concentrated in Silicon Docks (high English-only role density)',
      'No Brexit friction: EU citizens have free movement',
      '12.5% corporate tax attracts continuous MNC investment → sustained hiring',
    ],
    disadvantages: [
      'Dublin housing market is severely constrained — rent ~€2,200/mo for 1-bedroom',
      'Smaller market than London (~2,800 SWE employers vs 8,500)',
      'Heavily concentrated in MNC EU HQs (parent contagion risk if Google/Meta cut)',
      'Cost of living 92% of London (only marginally cheaper)',
    ],
  },

  // ── Munich (Germany) ──────────────────────────────────────────────────────
  {
    cityName: 'Munich',
    countryCode: 'DE',
    countryName: 'Germany',
    flagEmoji: '🇩🇪',
    aliases: ['munich', 'münchen', 'munich de', 'munich germany'],
    tier: 1,
    localCurrency: 'EUR',
    localCurrencySymbol: '€',
    costOfLivingVsLondon: 0.88,
    marketDepthScore: 0.62,
    englishLanguageMarket: 'english_medium',
    localLanguage: 'German',
    visa: {
      euCitizenPathway: 'eu_free_movement',
      nonEuPrimaryPathway: 'eu_blue_card',
      nonEuPathwayName: 'EU Blue Card (Germany)',
      nonEuSalaryThresholdLocal: 45_300,
      nonEuSalaryThresholdUSD: 49_000,
      nonEuVisaProcessingWeeksMin: 8,       // Munich slightly slower than Berlin
      nonEuVisaProcessingWeeksMax: 14,
      postTerminationGracePeriodDays: 90,
      visaConsiderations: [
        'Same EU Blue Card framework as Berlin — €45,300 threshold for STEM',
        'Munich visa office (Kreisverwaltungsreferat) typically slower than Berlin by 2-4 weeks',
        'BMW, Siemens, Allianz anchor demand — heavily automotive/enterprise',
        'Higher cost of living than Berlin (closer to Amsterdam)',
        'B1 German typically required for non-tech roles; tech roles ~50% English-friendly',
      ],
    },
    roles: {
      sw:      { employerCount: 1_900, avgPlacementWeeks: 14, timeToFirstInterviewWeeks: 3, salaryMedianLocal:  80_000, salaryMedianUSD:  87_000, englishOnlyRoleFraction: 0.50, remoteAdoptionRate: 0.50 },
      ml:      { employerCount: 480,   avgPlacementWeeks: 14, timeToFirstInterviewWeeks: 3, salaryMedianLocal:  92_000, salaryMedianUSD: 100_000, englishOnlyRoleFraction: 0.60, remoteAdoptionRate: 0.55 },
      data:    { employerCount: 620,   avgPlacementWeeks: 15, timeToFirstInterviewWeeks: 3, salaryMedianLocal:  75_000, salaryMedianUSD:  81_000, englishOnlyRoleFraction: 0.45, remoteAdoptionRate: 0.50 },
      general: { employerCount: 1_200, avgPlacementWeeks: 17, timeToFirstInterviewWeeks: 4, salaryMedianLocal:  68_000, salaryMedianUSD:  74_000, englishOnlyRoleFraction: 0.30, remoteAdoptionRate: 0.45 },
    },
    topEmployers: ['BMW', 'Siemens', 'Allianz', 'Microsoft Munich', 'Google Munich', 'SAP'],
    cityNarrative: 'Industrial/enterprise tech hub. Automotive (BMW) + enterprise (Siemens, Allianz, SAP) dominate. Higher salaries than Berlin but tech market is half the size. German required for most non-tech roles.',
    advantages: ['Enterprise/automotive stronghold', 'Same EU Blue Card framework as Berlin', 'Higher salaries than Berlin'],
    disadvantages: ['Higher cost of living than Berlin', 'Slower visa processing', 'Less English-friendly than Berlin'],
  },

  // ── Stockholm (Sweden) ────────────────────────────────────────────────────
  {
    cityName: 'Stockholm',
    countryCode: 'SE',
    countryName: 'Sweden',
    flagEmoji: '🇸🇪',
    aliases: ['stockholm', 'stockholm se', 'stockholm sweden'],
    tier: 2,
    localCurrency: 'SEK',
    localCurrencySymbol: 'kr',
    costOfLivingVsLondon: 0.78,
    marketDepthScore: 0.55,
    englishLanguageMarket: 'english_high',
    localLanguage: 'Swedish',
    visa: {
      euCitizenPathway: 'eu_free_movement',
      nonEuPrimaryPathway: 'national_skilled',
      nonEuPathwayName: 'Sweden Work Permit',
      nonEuSalaryThresholdLocal: 28_480 * 12,  // 28,480 SEK/month minimum
      nonEuSalaryThresholdUSD: 32_500,
      nonEuVisaProcessingWeeksMin: 4,
      nonEuVisaProcessingWeeksMax: 16,
      postTerminationGracePeriodDays: 90,
      visaConsiderations: [
        'Sweden work permit threshold raised significantly in late 2023 (now 28,480 SEK/mo)',
        'Spotify, Klarna, King.com anchor tech demand',
        'High English proficiency in tech sector (~80%)',
        'LAS (Labor protection) is strict — last-in-first-out applies to layoffs',
      ],
    },
    roles: {
      sw:      { employerCount: 1_200, avgPlacementWeeks: 14, timeToFirstInterviewWeeks: 3, salaryMedianLocal: 720_000, salaryMedianUSD:  68_000, englishOnlyRoleFraction: 0.80, remoteAdoptionRate: 0.62 },
      ml:      { employerCount: 280,   avgPlacementWeeks: 13, timeToFirstInterviewWeeks: 3, salaryMedianLocal: 880_000, salaryMedianUSD:  83_000, englishOnlyRoleFraction: 0.85, remoteAdoptionRate: 0.65 },
      general: { employerCount: 800,   avgPlacementWeeks: 16, timeToFirstInterviewWeeks: 4, salaryMedianLocal: 600_000, salaryMedianUSD:  57_000, englishOnlyRoleFraction: 0.55, remoteAdoptionRate: 0.55 },
    },
    topEmployers: ['Spotify', 'Klarna', 'King.com', 'Ericsson', 'Northvolt'],
    cityNarrative: 'Nordic tech hub anchored by Spotify, Klarna, King. High English proficiency (~80% of tech roles). Strong LAS labor protections. Quality of life premium over Berlin/Amsterdam.',
    advantages: ['Highest quality of life in Europe', 'English-friendly tech sector', 'Strong LAS labor protections'],
    disadvantages: ['Higher post-2023 visa salary threshold', 'Smaller market than Amsterdam', 'High income tax (~57% top rate)'],
  },

  // ── Paris (France) ────────────────────────────────────────────────────────
  {
    cityName: 'Paris',
    countryCode: 'FR',
    countryName: 'France',
    flagEmoji: '🇫🇷',
    aliases: ['paris', 'paris fr', 'paris france', 'ile de france'],
    tier: 1,
    localCurrency: 'EUR',
    localCurrencySymbol: '€',
    costOfLivingVsLondon: 0.78,
    marketDepthScore: 0.58,
    englishLanguageMarket: 'english_low',
    localLanguage: 'French',
    visa: {
      euCitizenPathway: 'eu_free_movement',
      nonEuPrimaryPathway: 'talent_passport',
      nonEuPathwayName: 'Talent Passport',
      nonEuSalaryThresholdLocal: 43_243,   // 2× minimum wage for tech route
      nonEuSalaryThresholdUSD: 47_100,
      nonEuVisaProcessingWeeksMin: 8,
      nonEuVisaProcessingWeeksMax: 16,
      postTerminationGracePeriodDays: 90,
      visaConsiderations: [
        'Talent Passport valid 4 years (renewable) — among the longest EU visas',
        'French language requirement looser at tech start-ups; required at large CACs',
        'PSE (Plan de Sauvegarde de l\'Emploi) provides strong dismissal protection',
        'Strong rights to severance and reclassification offers',
      ],
    },
    roles: {
      sw:      { employerCount: 1_800, avgPlacementWeeks: 16, timeToFirstInterviewWeeks: 4, salaryMedianLocal:  60_000, salaryMedianUSD:  65_000, englishOnlyRoleFraction: 0.40, remoteAdoptionRate: 0.55 },
      general: { employerCount: 1_200, avgPlacementWeeks: 18, timeToFirstInterviewWeeks: 4, salaryMedianLocal:  55_000, salaryMedianUSD:  60_000, englishOnlyRoleFraction: 0.25, remoteAdoptionRate: 0.50 },
    },
    topEmployers: ['Dassault Systèmes', 'BNP Paribas Tech', 'Capgemini', 'Mistral AI', 'Doctolib'],
    cityNarrative: 'Major EU tech market but French language is a significant barrier (~40% English-only roles in tech). PSE process provides strongest dismissal protection in EU.',
    advantages: ['Strong PSE dismissal protection (highest in EU)', 'Talent Passport valid 4 years', 'Mistral AI + Doctolib + Dassault anchor demand'],
    disadvantages: ['French language barrier (~60% of roles require fluent French)', 'Slow visa processing (8-16 weeks)', 'Lower salaries than Amsterdam/Dublin'],
  },

  // ── Zurich (Switzerland) ──────────────────────────────────────────────────
  {
    cityName: 'Zurich',
    countryCode: 'CH',
    countryName: 'Switzerland',
    flagEmoji: '🇨🇭',
    aliases: ['zurich', 'zürich', 'zurich ch', 'zurich switzerland'],
    tier: 1,
    localCurrency: 'CHF',
    localCurrencySymbol: 'CHF',
    costOfLivingVsLondon: 1.45,           // significantly more expensive
    marketDepthScore: 0.52,
    englishLanguageMarket: 'english_medium',
    localLanguage: 'German (Swiss German)',
    visa: {
      euCitizenPathway: 'national_skilled',  // EU/EFTA: B-permit framework (not full free movement)
      nonEuPrimaryPathway: 'national_skilled',
      nonEuPathwayName: 'Swiss Work Permit (B)',
      nonEuSalaryThresholdLocal: 100_000,
      nonEuSalaryThresholdUSD: 113_000,
      nonEuVisaProcessingWeeksMin: 8,
      nonEuVisaProcessingWeeksMax: 16,
      postTerminationGracePeriodDays: 60,
      visaConsiderations: [
        'Switzerland is NOT in EU — separate work permit framework (B-permit standard, C-permit after 5-10 years)',
        'Non-EU quotas are tight — primarily for high-earning specialists',
        'Highest salaries in Europe (CHF 110k+ for SWE)',
        'Salary premium offset by extremely high cost of living (rent ~CHF 2,500/mo)',
        'Tech sector dominated by Google Zurich + Banking (UBS, Credit Suisse) + Pharma',
      ],
    },
    roles: {
      sw:      { employerCount: 1_400, avgPlacementWeeks: 13, timeToFirstInterviewWeeks: 3, salaryMedianLocal: 130_000, salaryMedianUSD: 147_000, englishOnlyRoleFraction: 0.65, remoteAdoptionRate: 0.50 },
      ml:      { employerCount: 380,   avgPlacementWeeks: 12, timeToFirstInterviewWeeks: 2, salaryMedianLocal: 155_000, salaryMedianUSD: 175_000, englishOnlyRoleFraction: 0.78, remoteAdoptionRate: 0.55 },
      general: { employerCount: 900,   avgPlacementWeeks: 15, timeToFirstInterviewWeeks: 4, salaryMedianLocal: 110_000, salaryMedianUSD: 124_000, englishOnlyRoleFraction: 0.45, remoteAdoptionRate: 0.45 },
    },
    topEmployers: ['Google Zurich', 'UBS Tech', 'Credit Suisse Tech', 'Roche Informatics', 'Swisscom'],
    cityNarrative: 'Highest salaries in Europe (CHF 130k median SWE) offset by extreme cost of living. Non-EU work permits are tight — best for high-earning specialists. Google Zurich + Swiss banks + Pharma anchor demand.',
    advantages: ['Highest tech salaries in Europe (~75% premium over Berlin in USD)', 'Strong English in Google + banking sectors', 'Excellent quality of life'],
    disadvantages: ['Cost of living 1.45× London (offsets salary premium)', 'Non-EU permits tightly quota-controlled', 'Not in EU — separate visa framework, no EU Blue Card'],
  },
];

// ── Resolution utilities ─────────────────────────────────────────────────────

/** Look up an EU/UK city profile. Returns null for unknown cities. */
export function resolveEUCity(city: string | null | undefined): EUCityMarketProfile | null {
  if (!city) return null;
  const normalized = city.toLowerCase().trim();
  for (const profile of EU_CITY_MARKET_PROFILES) {
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

/** Map an oracle role key to the city role data key (prefix matching).
 *  Mirrors the resolver in usCityMarketIntelligence.ts. */
export function resolveEURoleCategoryKey(oracleKey: string): string {
  const k = oracleKey.toLowerCase().replace(/-/g, '_');
  if (/^(ml_|ai_|llm_|research_sci)/.test(k)) return 'ml';
  if (/^(sw_backend|sw_fullstack|sw_mob|sw_arch|sw_front|web_|platform_|sre)/.test(k)) return 'sw';
  if (/^(data_eng|data_sci|data_anal|bi_)/.test(k)) return 'data';
  if (/^(product_manag|pm_)/.test(k)) return 'pm';
  if (/^(devops|cloud_|security|infra)/.test(k)) return 'devops';
  if (/^(fin_|finance|accounting|fp_a|risk_|invest_)/.test(k)) return 'finance';
  return 'general';
}

/** Recommended candidate cities for a London-based or other UK/EU professional.
 *  This is the default comparison set when no explicit candidates are provided. */
export function getDefaultRelocationCandidates(originCity: string | null | undefined): string[] {
  const origin = (originCity ?? '').toLowerCase();
  // For London-based professionals: Berlin, Amsterdam, Dublin are the canonical comparison
  if (origin.includes('london') || origin.includes('uk')) {
    return ['Berlin', 'Amsterdam', 'Dublin'];
  }
  // For other EU cities: cross-comparison with London + the canonical 3
  return ['London', 'Berlin', 'Amsterdam', 'Dublin'];
}
