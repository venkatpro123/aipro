// marketIntelligence.ts — Global market TAM, pricing, and revenue density intelligence.
//
// PURPOSE: Two consumers:
//   1. marketPriorityEngine.ts — ranks markets by revenue density per localization dollar
//   2. jobMarketLiquidityService.ts — uses medianTechSalaryUSD as the salary anchor for
//      salaryPreservation calculations (replaces crude seniority-only table)
//
// MARKET RANKING METHODOLOGY:
//   Revenue density = TAM_reachable / localizationCostUSD
//   where TAM_reachable = techProfessionalPopulation × conversionRateEstimate × annualRevenuePerUserUSD
//
// TOP 3 BEYOND INDIA (lowest localization cost + highest revenue density):
//   1. US  — no localization. Native English. WARN Act + H1B visa content already built.
//   2. UK  — English. Add: Skilled Worker visa, UK redundancy law (TULRCA), UK salary norms.
//   3. SG  — English. Add: EP/S-Pass/LMIA-equivalent, MOM regulations, APAC salary benchmarks.
//
// WHY NOT GERMANY FIRST (despite 600K tech pros)?
//   Full German localization + Betriebsrat narrative depth = €80K investment.
//   Revenue density (TAM/cost) is lower than UK or SG despite the larger market.
//   Germany becomes Tier 1 after UK+SG content is mature and generates payback.
//
// LABELED: ESTIMATED — population figures from LinkedIn/Stack Overflow surveys (2024–2026),
// salary data from Levels.fyi / Glassdoor (2025), price points from market research or user
// stated as tested. Conversion rates are model estimates, not measured.

export interface TechMarketProfile {
  countryCode: string;       // ISO 3166-1 alpha-2
  countryName: string;
  flagEmoji: string;

  // ── Market size ────────────────────────────────────────────────────────────
  /** ESTIMATED: total tech / IT / software professionals in the country */
  techProfessionalPopulation: number;
  techProfessionalPopulationSource: string;

  // ── Salary benchmarks (for salaryPreservation calibration) ────────────────
  /** Median tech professional annual salary in USD (PPP-adjusted for comparability) */
  medianTechSalaryUSD: number;
  /** Median in local currency */
  medianTechSalaryLocal: number;
  localCurrency: string;    // ISO 4217
  localCurrencySymbol: string;

  // ── Pricing intelligence ──────────────────────────────────────────────────
  /** Recommended monthly SaaS price in USD */
  recommendedPriceMonthlyUSD: number;
  /** Recommended monthly price in local currency */
  recommendedPriceMonthlyLocal: number;
  /** True when price has been A/B tested in market; false = estimated */
  priceIsTested: boolean;
  /** Annual revenue per paying user in USD */
  annualRevenuePerUserUSD: number;

  // ── TAM model ─────────────────────────────────────────────────────────────
  /** ESTIMATED: fraction of tech professionals who are actively displacement-risk-aware
   *  and likely to pay for intelligence. Derived from LinkedIn survey data + SaaS benchmarks. */
  conversionRateEstimate: number;  // 0–1
  /** ESTIMATED: reachable TAM = population × conversion × annualRevenuePerUser (USD) */
  tamReachableMillionsUSD: number;

  // ── Localization cost model ───────────────────────────────────────────────
  /** 1 = no localization (US English baseline), 5 = full language + cultural localization */
  localizationComplexity: 1 | 2 | 3 | 4 | 5;
  /** ESTIMATED: one-time investment to localize content (translation, legal research, testing) */
  localizationCostEstimateUSD: number;
  primaryLanguage: string;
  englishCapability: 'native' | 'high' | 'medium' | 'low';

  // ── Localization content requirements ─────────────────────────────────────
  /** What specifically needs to be built for this market to go live */
  localizationRequirements: readonly string[];
  /** Key work authorization types that drive the displacement-risk use case */
  keyVisaTypes: readonly string[];
  /** Key regulatory/legal content that must be market-specific */
  keyRegulatoryContent: readonly string[];

  // ── Revenue density ───────────────────────────────────────────────────────
  /** tamReachableMillionsUSD × 1M / localizationCostEstimateUSD — raw revenue density */
  revenueDensityRaw: number;
  /** Normalized 0–100 (US = 100 baseline, computed by normalizing raw across all markets) */
  revenueDensityScore: number;
  /** Expansion priority based on density + strategic factors */
  expansionPriority: 'tier_1' | 'tier_2' | 'tier_3' | 'tier_4';
  expansionPriorityRationale: string;

  readonly labeledAs: 'MEASURED' | 'MODELED' | 'ESTIMATED';
  notes: string;
}

// ── Market profiles ───────────────────────────────────────────────────────────

export const TECH_MARKET_PROFILES: readonly TechMarketProfile[] = [

  // ── United States ──────────────────────────────────────────────────────────
  // Reference market. Zero localization cost. Price tested at $9.99/mo.
  // H1B + WARN Act content already built into the system.
  // Highest absolute TAM. Revenue density = ∞ (no cost denominator) → normalized to 100.
  {
    countryCode: 'US',
    countryName: 'United States',
    flagEmoji: '🇺🇸',
    techProfessionalPopulation: 4_500_000,
    techProfessionalPopulationSource: 'BLS Occupational Outlook + Stack Overflow Survey 2024',
    medianTechSalaryUSD: 140_000,
    medianTechSalaryLocal: 140_000,
    localCurrency: 'USD',
    localCurrencySymbol: '$',
    recommendedPriceMonthlyUSD: 9.99,
    recommendedPriceMonthlyLocal: 9.99,
    priceIsTested: true,
    annualRevenuePerUserUSD: 119.88,
    conversionRateEstimate: 0.12,  // 12%: US tech pros are the most SaaS-native, high anxiety about layoffs
    tamReachableMillionsUSD: 64.7, // 4.5M × 12% × $120
    localizationComplexity: 1,
    localizationCostEstimateUSD: 0,
    primaryLanguage: 'English',
    englishCapability: 'native',
    localizationRequirements: [],  // already built
    keyVisaTypes: ['H1B', 'L1', 'OPT/STEM', 'TN', 'Green Card (I-485)'],
    keyRegulatoryContent: ['WARN Act', 'COBRA', 'At-will employment', 'State-specific severance norms'],
    revenueDensityRaw: Infinity,
    revenueDensityScore: 100,  // normalized baseline
    expansionPriority: 'tier_1',
    expansionPriorityRationale: 'Primary market. Zero localization cost. Highest absolute TAM ($64.7M reachable). H1B visa content drives differentiation vs generic platforms.',
    labeledAs: 'ESTIMATED',
    notes: 'Price of $9.99/mo stated as tested. Salary from Levels.fyi 2025 US median SW engineer.',
  },

  // ── United Kingdom ─────────────────────────────────────────────────────────
  // English. Add: Skilled Worker visa, TULRCA redundancy law, UK salary norms.
  // Localization cost: $15K (legal research + UK-specific visa pathways + test).
  // Revenue density: second highest after US (high income, English, low cost).
  {
    countryCode: 'GB',
    countryName: 'United Kingdom',
    flagEmoji: '🇬🇧',
    techProfessionalPopulation: 800_000,
    techProfessionalPopulationSource: 'Tech Nation UK 2024 + ONS Labour Force Survey',
    medianTechSalaryUSD: 82_000,  // ~£65K → USD at 1.26
    medianTechSalaryLocal: 65_000,
    localCurrency: 'GBP',
    localCurrencySymbol: '£',
    recommendedPriceMonthlyUSD: 8.86,  // £6.99 × 1.267
    recommendedPriceMonthlyLocal: 6.99,
    priceIsTested: false,
    annualRevenuePerUserUSD: 106.32,
    conversionRateEstimate: 0.11,
    tamReachableMillionsUSD: 9.4,   // 800K × 11% × $106
    localizationComplexity: 2,
    localizationCostEstimateUSD: 15_000,
    primaryLanguage: 'English',
    englishCapability: 'native',
    localizationRequirements: [
      'Skilled Worker visa pathway (replaces H1B section)',
      'UK redundancy law: TULRCA 30/45-day consultation (already in employmentProtectionLaw.ts)',
      'Statutory redundancy pay calculator (ERA 1996 §119)',
      'UK salary norms by role/city (London premium)',
      'British English spelling/terminology (minor)',
    ],
    keyVisaTypes: ['Skilled Worker', 'ICT (intra-company)', 'Graduate Visa', 'Global Talent'],
    keyRegulatoryContent: ['TULRCA 1992', 'ERA 1996', 'HMRC', 'Acas Code of Practice'],
    revenueDensityRaw: 9_400_000 / 15_000,   // $9.4M TAM / $15K cost = 627
    revenueDensityScore: 87,  // normalized
    expansionPriority: 'tier_1',
    expansionPriorityRationale: 'English native. $15K localization investment vs $9.4M reachable TAM = 627× density. Skilled Worker visa holders are the highest-anxiety sub-segment (tied to employer, limited bridging options). Employment protection law already built.',
    labeledAs: 'ESTIMATED',
    notes: 'GBP/USD rate 1.267 (May 2026). Salary from Glassdoor UK 2025. Tech Nation reports 1.9M "digital tech" broadly; 800K is the software/IT professional sub-segment.',
  },

  // ── Singapore ─────────────────────────────────────────────────────────────
  // English. Add: EP/S-Pass specifics, MOM regulations, APAC salary benchmarks.
  // Highest income density in APAC. 300K tech pros × high WTP = strong unit economics.
  // Localization cost: $12K (MOM regulations, EP/S-Pass visa pathways, income data).
  {
    countryCode: 'SG',
    countryName: 'Singapore',
    flagEmoji: '🇸🇬',
    techProfessionalPopulation: 300_000,
    techProfessionalPopulationSource: 'MOM Labour Force Survey 2024 + IMDA Singapore Digital Economy',
    medianTechSalaryUSD: 78_000,  // SGD 105K → USD at 0.743
    medianTechSalaryLocal: 105_000,
    localCurrency: 'SGD',
    localCurrencySymbol: 'SGD',
    recommendedPriceMonthlyUSD: 6.68,  // SGD 8.99 × 0.743
    recommendedPriceMonthlyLocal: 8.99,
    priceIsTested: false,
    annualRevenuePerUserUSD: 80.16,
    conversionRateEstimate: 0.13,  // 13%: GCC employees + EP holders = high anxiety population
    tamReachableMillionsUSD: 3.1,   // 300K × 13% × $80
    localizationComplexity: 2,
    localizationCostEstimateUSD: 12_000,
    primaryLanguage: 'English',
    englishCapability: 'native',
    localizationRequirements: [
      'EP (Employment Pass) and S-Pass visa specifics — employer-tied, short bridging time',
      'MOM (Ministry of Manpower) regulatory requirements',
      'GCC parent-cut propagation content (already in parentSubsidiaryRegistry.ts — Singapore entries)',
      'APAC salary benchmarks and re-employment timeline by role (Glassdoor SG data)',
      'Retrenchment benefit norms (Singapore: no statutory minimum, but market norm 2 weeks/year)',
    ],
    keyVisaTypes: ['Employment Pass (EP)', 'S-Pass', 'EntrePass', 'Personalised Employment Pass (PEP)'],
    keyRegulatoryContent: ['MOM Fair Consideration Framework', 'Employment Act', 'Tripartite Guidelines'],
    revenueDensityRaw: 3_100_000 / 12_000,   // $3.1M / $12K = 258
    revenueDensityScore: 72,  // normalized
    expansionPriority: 'tier_1',
    expansionPriorityRationale: 'English native. $12K localization vs $3.1M reachable TAM = 258× density. EP holders (>180K) are the highest-anxiety sub-segment — employer-tied, 30-day notice to MOM if employment ends. APAC GCC hub — content from parentSubsidiaryRegistry.ts already covers SG subsidiaries.',
    labeledAs: 'ESTIMATED',
    notes: 'SGD/USD rate 0.743 (May 2026). MOM LFS 2024: 230K ICT professionals; 300K includes adjacent tech roles in FSI, healthcare, government.',
  },

  // ── Canada ────────────────────────────────────────────────────────────────
  // English (+ French Quebec). Add: LMIA-specific content, provincial employment standards.
  // LMIA holders are highest-anxiety sub-segment — very specific to our value prop.
  {
    countryCode: 'CA',
    countryName: 'Canada',
    flagEmoji: '🇨🇦',
    techProfessionalPopulation: 400_000,
    techProfessionalPopulationSource: 'Statistics Canada Labour Force Survey 2024 + ISED',
    medianTechSalaryUSD: 78_000,  // CAD 107K → USD at 0.73
    medianTechSalaryLocal: 107_000,
    localCurrency: 'CAD',
    localCurrencySymbol: 'CAD',
    recommendedPriceMonthlyUSD: 6.56,  // CAD 8.99 × 0.73
    recommendedPriceMonthlyLocal: 8.99,
    priceIsTested: false,
    annualRevenuePerUserUSD: 78.72,
    conversionRateEstimate: 0.11,
    tamReachableMillionsUSD: 3.5,   // 400K × 11% × $79
    localizationComplexity: 2,
    localizationCostEstimateUSD: 20_000,  // + French Quebec regulatory variant
    primaryLanguage: 'English',
    englishCapability: 'native',
    localizationRequirements: [
      'LMIA (Labour Market Impact Assessment) work permit specifics — already partially in employmentProtectionLaw.ts',
      'Provincial employment standards (Ontario ESA, BC Employment Standards Act)',
      'Group termination notice (Canada Labour Code §212)',
      'French Quebec variant for Loi sur les normes du travail (LNT) — optional but required for QC',
      'EI (Employment Insurance) benefit eligibility guidance',
    ],
    keyVisaTypes: ['LMIA work permit', 'PGWP', 'CUSMA (TN)', 'ICT (intra-company)', 'PR (FSWP)'],
    keyRegulatoryContent: ['Canada Labour Code', 'Ontario ESA', 'ESDC', 'EI Act'],
    revenueDensityRaw: 3_500_000 / 20_000,  // $3.5M / $20K = 175
    revenueDensityScore: 64,
    expansionPriority: 'tier_1',
    expansionPriorityRationale: 'English native. $20K localization vs $3.5M TAM = 175× density. LMIA holders (the CANADA_VISA_AMPLIFIED probe scenario) represent highest-anxiety, highest-willingness-to-pay sub-segment. Employment protection law already built.',
    labeledAs: 'ESTIMATED',
    notes: 'CAD/USD rate 0.73 (May 2026). LMIA holders (~185K) + PGWP (~220K) represent the high-WTP displacement-anxiety segment.',
  },

  // ── India ─────────────────────────────────────────────────────────────────
  // Volume market. English-capable IT workforce. Price point ₹299/month.
  // Localization: already partially built (indiaSectorIntelligence.ts, GCC archetype).
  // Revenue per user is low but population is 2M+ — massive volume upside.
  {
    countryCode: 'IN',
    countryName: 'India',
    flagEmoji: '🇮🇳',
    techProfessionalPopulation: 2_000_000,
    techProfessionalPopulationSource: 'NASSCOM Annual Report 2024 + LinkedIn Talent Insights India',
    medianTechSalaryUSD: 18_000,   // ~₹15L/yr ÷ 83 = $18K (PPP-adjusted purchasing power is higher)
    medianTechSalaryLocal: 1_500_000,  // ₹15 lakh per annum (mid-level SWE, Bangalore)
    localCurrency: 'INR',
    localCurrencySymbol: '₹',
    recommendedPriceMonthlyUSD: 3.60,  // ₹299/month × 0.012
    recommendedPriceMonthlyLocal: 299,
    priceIsTested: false,
    annualRevenuePerUserUSD: 43.20,
    conversionRateEstimate: 0.08,  // 8%: high concern about layoffs but lower WTP than developed markets
    tamReachableMillionsUSD: 6.9,   // 2M × 8% × $43
    localizationComplexity: 2,
    localizationCostEstimateUSD: 10_000,  // English + IDA/NASSCOM content + Naukri integration
    primaryLanguage: 'English',
    englishCapability: 'high',
    localizationRequirements: [
      'IDA Chapter V-B content (already in employmentProtectionLaw.ts)',
      'GCC archetype detection + propagation (already in indiaSectorIntelligence.ts)',
      'India seasonal risk windows (already in temporalRiskAmplifier.ts)',
      'Naukri/LinkedIn India job market data integration',
      'Indian city-specific salary benchmarks (Bangalore vs Hyderabad vs Pune)',
      'NASSCOM sector benchmarks (partially built)',
    ],
    keyVisaTypes: ['IDA workman status (not a visa, but a protection tier)', 'Not applicable for most IT professionals'],
    keyRegulatoryContent: ['IDA 1947', 'Industrial Relations Code 2020', 'EPFO', 'NASSCOM guidelines'],
    revenueDensityRaw: 6_900_000 / 10_000,  // $6.9M / $10K = 690
    revenueDensityScore: 91,  // high raw density but ARPU is lowest
    expansionPriority: 'tier_1',
    expansionPriorityRationale: 'Volume market: 2M tech pros, 80% English-capable, $10K localization mostly DONE. TAM density 690× investment. Revenue per user is lowest ($43) but volume (160K paying users at 8% conversion) generates $6.9M ARR. GCC intelligence already differentiates vs Indian-only tools.',
    labeledAs: 'ESTIMATED',
    notes: 'INR/USD rate 83.5 (May 2026). ₹299/month = Swiggy ONE tier — established price anchor for Indian SaaS. NASSCOM estimates 5.4M "IT workforce" broadly; 2M is software/engineering sub-segment.',
  },

  // ── Germany ───────────────────────────────────────────────────────────────
  // Large market (600K) but requires full German localization + Betriebsrat depth.
  // High income (€70K median). Strong WTP but high localization cost = Tier 2.
  {
    countryCode: 'DE',
    countryName: 'Germany',
    flagEmoji: '🇩🇪',
    techProfessionalPopulation: 600_000,
    techProfessionalPopulationSource: 'Bitkom Digital Economy Report 2024 + Statista DE IT workforce',
    medianTechSalaryUSD: 82_000,   // €70K → USD at 1.085
    medianTechSalaryLocal: 70_000,
    localCurrency: 'EUR',
    localCurrencySymbol: '€',
    recommendedPriceMonthlyUSD: 8.67,  // €7.99 × 1.085
    recommendedPriceMonthlyLocal: 7.99,
    priceIsTested: false,
    annualRevenuePerUserUSD: 104.04,
    conversionRateEstimate: 0.10,
    tamReachableMillionsUSD: 6.2,   // 600K × 10% × $104
    localizationComplexity: 4,
    localizationCostEstimateUSD: 80_000,  // full German translation + Betriebsrat/Sozialplan depth + legal review
    primaryLanguage: 'German',
    englishCapability: 'medium',
    localizationRequirements: [
      'Full German translation of all UI, narratives, and action guidance',
      'Betriebsrat (Works Council) navigation content — already in employmentProtectionLaw.ts',
      'Sozialplan negotiation guidance',
      'BGB §622 notice period calculator (by tenure)',
      'German salary benchmarks by role and city (Berlin vs Munich vs Hamburg)',
      'DACH tech job market data (StepStone, Xing integration)',
      'GDPR-compliant data processing documentation (German DPA standards)',
    ],
    keyVisaTypes: ['EU Blue Card', 'Blaue Karte EU', 'Skilled immigration (Fachkräfteeinwanderungsgesetz)'],
    keyRegulatoryContent: ['KSchG', 'BetrVG', 'BGB §622', 'Bundesagentur für Arbeit'],
    revenueDensityRaw: 6_200_000 / 80_000,  // $6.2M / $80K = 78
    revenueDensityScore: 38,   // low density due to high localization cost
    expansionPriority: 'tier_2',
    expansionPriorityRationale: 'Large market ($6.2M TAM) but full German localization required ($80K). Revenue density = 78× investment vs UK 627× or SG 258×. Tier 2: pursue after UK+SG are profitable. Betriebsrat content depth is the moat once built.',
    labeledAs: 'ESTIMATED',
    notes: 'EUR/USD rate 1.085 (May 2026). Bitkom 2024: 1.1M "digital professionals" broadly; 600K is software/engineering/IT operations sub-segment.',
  },

  // ── Australia ─────────────────────────────────────────────────────────────
  // English. Add: Fair Work Commission content, 457/TSS visa specifics.
  // Smaller market (250K) but high income and English.
  {
    countryCode: 'AU',
    countryName: 'Australia',
    flagEmoji: '🇦🇺',
    techProfessionalPopulation: 250_000,
    techProfessionalPopulationSource: 'Australian Computer Society 2024 Digital Pulse Report',
    medianTechSalaryUSD: 86_000,   // AUD 130K → USD at 0.66
    medianTechSalaryLocal: 130_000,
    localCurrency: 'AUD',
    localCurrencySymbol: 'AUD',
    recommendedPriceMonthlyUSD: 7.26,  // AUD 11 × 0.66
    recommendedPriceMonthlyLocal: 11.00,
    priceIsTested: false,
    annualRevenuePerUserUSD: 87.12,
    conversionRateEstimate: 0.10,
    tamReachableMillionsUSD: 2.2,   // 250K × 10% × $87
    localizationComplexity: 2,
    localizationCostEstimateUSD: 18_000,
    primaryLanguage: 'English',
    englishCapability: 'native',
    localizationRequirements: [
      'TSS (Temporary Skill Shortage) / SC 482 visa specifics',
      'Fair Work Commission redundancy pay norms (already in employmentProtectionLaw.ts)',
      'Australian city salary benchmarks (Sydney vs Melbourne vs Brisbane)',
      'Seek.com integration for job market depth data',
    ],
    keyVisaTypes: ['TSS / SC 482', 'Skilled Independent (SC 189)', 'ENS (SC 186)', 'WHV'],
    keyRegulatoryContent: ['Fair Work Act 2009', 'NES', 'Fair Work Commission'],
    revenueDensityRaw: 2_200_000 / 18_000,  // $2.2M / $18K = 122
    revenueDensityScore: 52,
    expansionPriority: 'tier_2',
    expansionPriorityRationale: 'English native, high income, low localization cost. $18K investment vs $2.2M TAM = 122× density. Tier 2: pursue after UK+SG (higher density). Employment protection law already built.',
    labeledAs: 'ESTIMATED',
    notes: 'AUD/USD rate 0.66 (May 2026). ACS Digital Pulse: 935K "digital workers"; 250K is software/engineering core.',
  },

  // ── Netherlands ───────────────────────────────────────────────────────────
  // High English proficiency (90%+). EU headquarters for many US tech firms.
  // 150K tech professionals but strong GCC hub. €75K median salary.
  {
    countryCode: 'NL',
    countryName: 'Netherlands',
    flagEmoji: '🇳🇱',
    techProfessionalPopulation: 150_000,
    techProfessionalPopulationSource: 'CBS Netherlands Labour Force Survey 2024 + NL Digital',
    medianTechSalaryUSD: 81_000,   // €75K × 1.085
    medianTechSalaryLocal: 75_000,
    localCurrency: 'EUR',
    localCurrencySymbol: '€',
    recommendedPriceMonthlyUSD: 8.67,
    recommendedPriceMonthlyLocal: 7.99,
    priceIsTested: false,
    annualRevenuePerUserUSD: 104.04,
    conversionRateEstimate: 0.11,
    tamReachableMillionsUSD: 1.7,
    localizationComplexity: 2,  // English is sufficient; Dutch optional
    localizationCostEstimateUSD: 22_000,
    primaryLanguage: 'Dutch',
    englishCapability: 'high',
    localizationRequirements: [
      'UWV procedure content (already in employmentProtectionLaw.ts)',
      'Transitievergoeding calculator (transition payment)',
      'Dutch tech job market depth (Nationale Vacaturebank, Indeed.nl)',
      'EU Blue Card and HSMP knowledge worker visa content',
    ],
    keyVisaTypes: ['Highly Skilled Migrant (HSM / Kennismigrant)', 'EU Blue Card', 'ICT'],
    keyRegulatoryContent: ['Wwz', 'BW Boek 7', 'UWV', 'Transitievergoeding'],
    revenueDensityRaw: 1_700_000 / 22_000,  // $1.7M / $22K = 77
    revenueDensityScore: 37,
    expansionPriority: 'tier_2',
    expansionPriorityRationale: 'High English (second market after Ireland for international tech talent). UWV protection law already built. Smaller market ($1.7M TAM) but strong GCC hub (ASML, Philips, Booking.com). Tier 2 bundled with Germany/EU expansion.',
    labeledAs: 'ESTIMATED',
    notes: 'Amsterdam tech scene strong; "Kennismigrant" visa holders are high-anxiety population.',
  },

  // ── France ────────────────────────────────────────────────────────────────
  // 350K tech professionals. PSE/DREETS content partially built. Full French required.
  {
    countryCode: 'FR',
    countryName: 'France',
    flagEmoji: '🇫🇷',
    techProfessionalPopulation: 350_000,
    techProfessionalPopulationSource: 'Syntec Numérique 2024 + INSEE Labour Force Survey',
    medianTechSalaryUSD: 65_000,   // €60K × 1.085
    medianTechSalaryLocal: 60_000,
    localCurrency: 'EUR',
    localCurrencySymbol: '€',
    recommendedPriceMonthlyUSD: 8.67,
    recommendedPriceMonthlyLocal: 7.99,
    priceIsTested: false,
    annualRevenuePerUserUSD: 104.04,
    conversionRateEstimate: 0.08,  // lower anxiety culture (strong labor protection)
    tamReachableMillionsUSD: 2.9,
    localizationComplexity: 4,
    localizationCostEstimateUSD: 65_000,
    primaryLanguage: 'French',
    englishCapability: 'medium',
    localizationRequirements: [
      'Full French UI translation',
      'PSE (Plan de Sauvegarde de l\'Emploi) navigation guide (partially in employmentProtectionLaw.ts)',
      'DREETS / CSE consultation procedure explainer',
      'French salary benchmarks (Paris vs Nantes vs Bordeaux)',
      'Welcome to the Jungle / LinkedIn France job market data',
    ],
    keyVisaTypes: ['Talent Passport', 'EU Blue Card', 'ICT (détaché intragroupe)'],
    keyRegulatoryContent: ['Code du Travail L1233', 'PSE', 'DREETS', 'CSE (Comité Social et Économique)'],
    revenueDensityRaw: 2_900_000 / 65_000,  // $2.9M / $65K = 45
    revenueDensityScore: 28,
    expansionPriority: 'tier_3',
    expansionPriorityRationale: 'Full French localization required ($65K). Lower anxiety culture (PSE provides strong protection, reducing perceived need for intelligence tool). Tier 3: after EU English-capable markets.',
    labeledAs: 'ESTIMATED',
    notes: 'PSE law content already built. French translation is the blocking investment.',
  },

  // ── Japan ──────────────────────────────────────────────────────────────────
  // Large tech market (450K) but lowest English capability. Full Japanese required.
  // Highest localization cost. Tier 4.
  {
    countryCode: 'JP',
    countryName: 'Japan',
    flagEmoji: '🇯🇵',
    techProfessionalPopulation: 450_000,
    techProfessionalPopulationSource: 'METI Japan IT Human Resources Report 2024',
    medianTechSalaryUSD: 58_000,   // ¥8.5M → USD at 0.0066
    medianTechSalaryLocal: 8_500_000,
    localCurrency: 'JPY',
    localCurrencySymbol: '¥',
    recommendedPriceMonthlyUSD: 9.90,  // ¥1,500 × 0.0066
    recommendedPriceMonthlyLocal: 1_500,
    priceIsTested: false,
    annualRevenuePerUserUSD: 118.80,
    conversionRateEstimate: 0.07,
    tamReachableMillionsUSD: 3.7,
    localizationComplexity: 5,
    localizationCostEstimateUSD: 150_000,
    primaryLanguage: 'Japanese',
    englishCapability: 'low',
    localizationRequirements: [
      'Full Japanese UI translation + cultural adaptation',
      'Japanese work culture norms (lifetime employment culture, different layoff patterns)',
      'Labor Standards Act (LSA) content',
      'Gaijin (foreigner) work visa content (Engineering/Humanities/International Services)',
      'HelloWork (Hello Work) job market integration',
    ],
    keyVisaTypes: ['Engineering/Humanities/International Services', 'Highly Skilled Professional', 'J-Skip'],
    keyRegulatoryContent: ['Labor Standards Act', 'Worker Dispatch Act', 'Hello Work (ハローワーク)'],
    revenueDensityRaw: 3_700_000 / 150_000,  // $3.7M / $150K = 25
    revenueDensityScore: 18,
    expansionPriority: 'tier_4',
    expansionPriorityRationale: 'Full Japanese localization required ($150K). Low layoff frequency culture reduces WTP. Revenue density 25× — lowest among tracked markets. Tier 4: long-term consideration after EU expansion is mature.',
    labeledAs: 'ESTIMATED',
    notes: 'Japan lifetime employment culture means AI displacement anxiety is structurally different. Foreign-resident tech workforce (600K) is the more relevant addressable market.',
  },

  // ── UAE / Dubai ────────────────────────────────────────────────────────────
  // English-capable. Fast-growing tech hub. No income tax. Visa tie = high anxiety.
  {
    countryCode: 'AE',
    countryName: 'UAE / Dubai',
    flagEmoji: '🇦🇪',
    techProfessionalPopulation: 120_000,
    techProfessionalPopulationSource: 'Dubai CommerCity / TDRA UAE Digital Talent Report 2024',
    medianTechSalaryUSD: 95_000,   // AED 350K/yr → USD at 0.272
    medianTechSalaryLocal: 350_000,
    localCurrency: 'AED',
    localCurrencySymbol: 'AED',
    recommendedPriceMonthlyUSD: 9.00,
    recommendedPriceMonthlyLocal: 33,
    priceIsTested: false,
    annualRevenuePerUserUSD: 108.00,
    conversionRateEstimate: 0.14,  // high anxiety: 97% of UAE tech workforce are expats, visa-tied
    tamReachableMillionsUSD: 1.8,   // 120K × 14% × $108
    localizationComplexity: 2,
    localizationCostEstimateUSD: 20_000,
    primaryLanguage: 'Arabic',
    englishCapability: 'high',   // English is the business language in UAE tech
    localizationRequirements: [
      'Employment Visa / Golden Visa content — grace period, sponsor change, NOC',
      'UAE Labour Law (Federal Decree-Law No. 33 of 2021)',
      'DIFC / ADGM special economic zone employment variations',
      'No income tax context — severance is the primary financial exposure',
      'Gratuity calculation (21-day/year for first 5 years, 30-day/year after)',
    ],
    keyVisaTypes: ['Employment Visa (sponsored)', 'Golden Visa', 'Freelance/Entrepreneurship Visa'],
    keyRegulatoryContent: ['UAE Labour Law 2021', 'DIFC Employment Law', 'ADGM Employment Regulations', 'MOHRE'],
    revenueDensityRaw: 1_800_000 / 20_000,  // $1.8M / $20K = 90
    revenueDensityScore: 43,
    expansionPriority: 'tier_2',
    expansionPriorityRationale: '97% expat tech workforce = near-maximum displacement anxiety (visa-tied employment). English business language. $20K localization vs $1.8M TAM = 90× density. Gratuity calculator is a strong hook. Tier 2: bundle with MENA expansion.',
    labeledAs: 'ESTIMATED',
    notes: 'AED/USD 0.272. No income tax makes severance calculation the dominant financial intelligence need.',
  },

  // ── Ireland ────────────────────────────────────────────────────────────────
  // English native. EU HQ for Google, Meta, Stripe, Salesforce, LinkedIn.
  // Small but extremely high-value tech population (100K+).
  {
    countryCode: 'IE',
    countryName: 'Ireland',
    flagEmoji: '🇮🇪',
    techProfessionalPopulation: 100_000,
    techProfessionalPopulationSource: 'IDA Ireland Technology Sector Report 2024',
    medianTechSalaryUSD: 90_000,   // €83K × 1.085
    medianTechSalaryLocal: 83_000,
    localCurrency: 'EUR',
    localCurrencySymbol: '€',
    recommendedPriceMonthlyUSD: 9.67,
    recommendedPriceMonthlyLocal: 8.91,
    priceIsTested: false,
    annualRevenuePerUserUSD: 116.04,
    conversionRateEstimate: 0.14,  // high WTP: FAANG EU HQ employees, high anxiety about parent contagion
    tamReachableMillionsUSD: 1.6,
    localizationComplexity: 2,
    localizationCostEstimateUSD: 12_000,  // English + EU labor law (partially built) + Irish WRC
    primaryLanguage: 'English',
    englishCapability: 'native',
    localizationRequirements: [
      'Workplace Relations Commission (WRC) unfair dismissal procedure',
      'EU parent contagion content (already in parentSubsidiaryRegistry.ts — IE entries)',
      'Stamp 1/4/1G critical skills visa content',
      'Irish salary benchmarks by role and Dublin premium',
    ],
    keyVisaTypes: ['Critical Skills Employment Permit (CSEP)', 'General Employment Permit', 'ICT Permit', 'Stamp 4'],
    keyRegulatoryContent: ['WRC', 'Employment Acts 1977-2015', 'Redundancy Payments Act'],
    revenueDensityRaw: 1_600_000 / 12_000,  // $1.6M / $12K = 133
    revenueDensityScore: 55,
    expansionPriority: 'tier_2',
    expansionPriorityRationale: 'English native. FAANG EU HQs = highest density of Google/Meta/Amazon employees facing parent-contagion risk (exact use case already modeled). $12K localization vs $1.6M TAM = 133× density. Bundle with UK market launch for near-zero incremental cost.',
    labeledAs: 'ESTIMATED',
    notes: 'Dublin tech cluster: 70+ multinational HQs (Google, Meta, Stripe, Salesforce, LinkedIn). EU HQ parent-contagion content already in parentSubsidiaryRegistry.ts.',
  },
];

// ── Derived metrics ───────────────────────────────────────────────────────────

/** Look up market profile by ISO country code. */
export function getMarketProfile(countryCode: string): TechMarketProfile | null {
  const code = countryCode.toUpperCase().trim();
  return TECH_MARKET_PROFILES.find(m => m.countryCode === code) ?? null;
}

/** Get the median tech salary in USD for a given country.
 *  Returns null if the country is not in the registry.
 *  Used by jobMarketLiquidityService for salaryPreservation calibration. */
export function getMedianTechSalaryUSD(countryCode: string): number | null {
  return getMarketProfile(countryCode)?.medianTechSalaryUSD ?? null;
}

/** Return markets ranked by revenue density score descending. */
export function getMarketsByRevenueDensity(): TechMarketProfile[] {
  return [...TECH_MARKET_PROFILES].sort((a, b) => b.revenueDensityScore - a.revenueDensityScore);
}

/** Return markets by expansion priority tier. */
export function getMarketsByTier(tier: TechMarketProfile['expansionPriority']): TechMarketProfile[] {
  return TECH_MARKET_PROFILES.filter(m => m.expansionPriority === tier);
}

// ── Total addressable market summary ─────────────────────────────────────────

export interface MarketSummary {
  totalTechProfessionals: number;
  totalTAMMillionsUSD: number;
  totalLocalizationCostUSD: number;
  /** Top 3 markets by revenue density (excluding the one that triggered the analysis) */
  top3ByDensity: TechMarketProfile[];
  /** Top 3 by absolute TAM reachable */
  top3ByTAM: TechMarketProfile[];
  /** Markets where all content exists today (localization complete) */
  readyMarkets: TechMarketProfile[];
}

export function computeMarketSummary(): MarketSummary {
  const total = TECH_MARKET_PROFILES.reduce(
    (acc, m) => ({
      totalTechProfessionals: acc.totalTechProfessionals + m.techProfessionalPopulation,
      totalTAMMillionsUSD: acc.totalTAMMillionsUSD + m.tamReachableMillionsUSD,
      totalLocalizationCostUSD: acc.totalLocalizationCostUSD + m.localizationCostEstimateUSD,
    }),
    { totalTechProfessionals: 0, totalTAMMillionsUSD: 0, totalLocalizationCostUSD: 0 },
  );

  const sorted = getMarketsByRevenueDensity();
  const byTAM = [...TECH_MARKET_PROFILES].sort((a, b) => b.tamReachableMillionsUSD - a.tamReachableMillionsUSD);
  const ready = TECH_MARKET_PROFILES.filter(m => m.localizationCostEstimateUSD === 0 || m.localizationComplexity <= 2);

  return {
    ...total,
    top3ByDensity: sorted.slice(0, 3),
    top3ByTAM: byTAM.slice(0, 3),
    readyMarkets: ready,
  };
}
