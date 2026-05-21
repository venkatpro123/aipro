// globalCityEmployers.ts — Per-city per-role hiring employer rosters for global markets.
//
// PURPOSE: getCityCompanyIntersection in cityOpportunities.ts previously only
// resolved India cities (Bangalore, Mumbai, Hyderabad, etc.). A Singapore SWE
// pivoting to ML Engineering received a national_fallback that returned Indian
// company names — meaningless and non-actionable.
//
// THE FIX: This file provides named employer rosters per-city per-role-category
// for 12 major global markets. The intersection function now resolves any city
// across this registry AND cityOpportunities.ts (India), intersecting with the
// appropriate hiring pool (India for IN cities, Global for everywhere else).
//
// USE CASE (from the user's question):
//   Singapore SWE pivoting to ML Engineering
//   getGlobalCityCompanyIntersection('singapore', 'ml', global=[Anthropic,OpenAI,...])
//   → Returns Singapore ML employers: Grab, Sea Limited, Shopee, TikTok APAC, ByteDance SG
//   (city_fallback because Anthropic/OpenAI/etc. aren't yet established in SG)
//   Result: "Apply to Grab, Sea Limited, Shopee — top Singapore ML hirers."
//   NOT: "Consider ML Engineering" (the previous failure mode).
//
// LABELED: ESTIMATED — derived from LinkedIn Talent Insights 2024-2025,
// Glassdoor 2024 hiring reports, Hired.com State of Software Engineers 2025,
// Levels.fyi 2025, sea-asia tech job boards (TechInAsia, e27).

export interface CityRoleEmployers {
  cityKey: string;             // canonical lowercase key
  cityName: string;
  countryCode: string;          // ISO 3166-1 alpha-2
  aliases: readonly string[];
  /** Role category key → top employers in this city actively hiring for the role.
   *  Categories match the prefix scheme used by deriveTargetRolePrefix in
   *  cityOpportunities.ts: sw, ml, data, pm, qa, devops, design, finance, etc. */
  rolesByEmployers: Record<string, readonly string[]>;
}

// ── Global City Employer Registry ────────────────────────────────────────────

export const GLOBAL_CITY_EMPLOYERS: readonly CityRoleEmployers[] = [

  // ═══ Singapore ═══════════════════════════════════════════════════════════
  // APAC's deepest English-language tech market. Sea Limited, Grab anchor SWE
  // hiring; financial services tech (DBS, OCBC, StanChart) major data/ML hirers.
  {
    cityKey: 'singapore',
    cityName: 'Singapore',
    countryCode: 'SG',
    aliases: ['singapore', 'sg', 'singapore city'],
    rolesByEmployers: {
      sw:      ['Grab', 'Sea Limited', 'Shopee', 'Lazada', 'Gojek SG', 'Razer', 'PropertyGuru', 'Carousell'],
      ml:      ['Grab', 'Sea Limited', 'Shopee', 'Lazada', 'Carousell', 'TikTok APAC', 'ByteDance SG'],
      data:    ['Grab', 'Sea Limited', 'Shopee', 'DBS Tech', 'OCBC Tech', 'Standard Chartered SG', 'Stripe SG'],
      pm:      ['Grab', 'Sea Limited', 'Shopee', 'Stripe SG', 'Adyen APAC', 'Carousell', 'Klook'],
      devops:  ['Grab', 'Sea Limited', 'Razer', 'AWS Singapore', 'Microsoft SG', 'Google APAC', 'Stripe SG'],
      design:  ['Grab', 'Carousell', 'Sea Limited', 'PropertyGuru', 'TikTok APAC', 'Klook'],
      finance: ['DBS Bank', 'OCBC', 'UOB', 'Standard Chartered SG', 'JPMorgan SG', 'Goldman Sachs SG', 'Stripe SG'],
      qa:      ['Grab', 'Sea Limited', 'Shopee', 'Razer', 'DBS Tech', 'PropertyGuru'],
      general: ['Grab', 'Sea Limited', 'Shopee', 'DBS', 'Stripe SG'],
    },
  },

  // ═══ London ══════════════════════════════════════════════════════════════
  // Europe's largest FinTech + tech market. FAANG EU offices + native UK
  // unicorns (Revolut, Monzo, Wise, DeepMind).
  {
    cityKey: 'london',
    cityName: 'London',
    countryCode: 'GB',
    aliases: ['london', 'london uk', 'greater london'],
    rolesByEmployers: {
      sw:      ['Google UK', 'Amazon UK', 'Meta UK', 'Microsoft UK', 'Revolut', 'Monzo', 'Wise', 'Deliveroo'],
      ml:      ['DeepMind', 'Google UK AI', 'Meta AI London', 'Wayve', 'Microsoft Research', 'Cohere London', 'Stability AI'],
      data:    ['Google UK', 'Amazon UK', 'Bloomberg London', 'Revolut', 'Monzo', 'Citadel London', 'JPMorgan UK Tech'],
      pm:      ['Google UK', 'Amazon UK', 'Meta UK', 'Revolut', 'Wise', 'Monzo', 'Deliveroo'],
      devops:  ['Amazon UK', 'Microsoft UK', 'Google UK', 'Revolut', 'Monzo', 'AWS London', 'Cloudflare London'],
      design:  ['Meta UK', 'Google UK', 'Revolut', 'Wise', 'Monzo', 'Deliveroo'],
      finance: ['Goldman Sachs London', 'JPMorgan UK', 'Barclays', 'HSBC Tech', 'Bloomberg', 'Citadel London', 'Revolut'],
      qa:      ['Amazon UK', 'Microsoft UK', 'Google UK', 'Revolut', 'Monzo', 'Deliveroo', 'Wise'],
      general: ['Google UK', 'Amazon UK', 'Meta UK', 'Revolut', 'Monzo'],
    },
  },

  // ═══ Berlin ══════════════════════════════════════════════════════════════
  {
    cityKey: 'berlin',
    cityName: 'Berlin',
    countryCode: 'DE',
    aliases: ['berlin', 'berlin de', 'berlin germany'],
    rolesByEmployers: {
      sw:      ['Zalando', 'Delivery Hero', 'HelloFresh', 'SumUp', 'Auto1', 'N26', 'SoundCloud', 'Trade Republic'],
      ml:      ['Zalando AI', 'Delivery Hero ML', 'HelloFresh', 'N26 Risk', 'SAP Berlin', 'Aleph Alpha'],
      data:    ['Zalando', 'Delivery Hero', 'HelloFresh', 'N26', 'Auto1', 'Wayfair Berlin'],
      pm:      ['Zalando', 'Delivery Hero', 'HelloFresh', 'N26', 'SumUp', 'Trade Republic'],
      devops:  ['Zalando', 'Delivery Hero', 'AWS Berlin', 'HelloFresh', 'N26', 'SAP'],
      design:  ['Zalando', 'Delivery Hero', 'SoundCloud', 'N26', 'HelloFresh'],
      finance: ['N26', 'Trade Republic', 'SumUp', 'Solaris Bank', 'Deutsche Bank Tech', 'Allianz Tech Berlin'],
      qa:      ['Zalando', 'Delivery Hero', 'HelloFresh', 'SumUp', 'Auto1', 'N26'],
      general: ['Zalando', 'Delivery Hero', 'HelloFresh', 'N26', 'SumUp'],
    },
  },

  // ═══ Amsterdam ═══════════════════════════════════════════════════════════
  {
    cityKey: 'amsterdam',
    cityName: 'Amsterdam',
    countryCode: 'NL',
    aliases: ['amsterdam', 'amsterdam nl', 'amstelveen'],
    rolesByEmployers: {
      sw:      ['Booking.com', 'Adyen', 'ASML', 'ING Tech', 'TomTom', 'Philips', 'Mollie', 'Bunq'],
      ml:      ['Booking.com', 'Adyen', 'ASML', 'TomTom', 'Mollie', 'Philips Research'],
      data:    ['Booking.com', 'Adyen', 'ING', 'ABN AMRO', 'Bunq', 'Mollie'],
      pm:      ['Booking.com', 'Adyen', 'Mollie', 'TomTom', 'Bunq', 'ASML'],
      devops:  ['Booking.com', 'Adyen', 'AWS Amsterdam', 'ING', 'ASML', 'Bunq'],
      design:  ['Booking.com', 'Adyen', 'Bunq', 'Mollie', 'TomTom'],
      finance: ['ING', 'ABN AMRO', 'Adyen', 'Bunq', 'Mollie', 'Rabobank', 'JPMorgan Amsterdam'],
      qa:      ['Booking.com', 'Adyen', 'ING', 'ASML', 'TomTom', 'Mollie'],
      general: ['Booking.com', 'Adyen', 'ING', 'ASML', 'TomTom'],
    },
  },

  // ═══ Dublin ══════════════════════════════════════════════════════════════
  // EU HQ for 70+ US multinationals — highest density of FAANG EU jobs.
  {
    cityKey: 'dublin',
    cityName: 'Dublin',
    countryCode: 'IE',
    aliases: ['dublin', 'dublin ie', 'dublin city', 'silicon docks'],
    rolesByEmployers: {
      sw:      ['Google EMEA', 'Meta EMEA', 'Microsoft Ireland', 'Stripe', 'Salesforce', 'LinkedIn', 'Workday', 'HubSpot'],
      ml:      ['Google EMEA AI', 'Meta AI EMEA', 'Stripe', 'Salesforce Einstein', 'LinkedIn AI', 'Workday ML'],
      data:    ['Google EMEA', 'Meta EMEA', 'Stripe', 'Salesforce', 'LinkedIn', 'AWS Dublin', 'Workday'],
      pm:      ['Google EMEA', 'Meta EMEA', 'Stripe', 'Salesforce', 'LinkedIn', 'HubSpot', 'Workday'],
      devops:  ['AWS Dublin', 'Google EMEA', 'Microsoft Ireland', 'Stripe', 'Salesforce', 'LinkedIn'],
      design:  ['Google EMEA', 'Meta EMEA', 'Stripe', 'Salesforce', 'LinkedIn', 'HubSpot'],
      finance: ['Citibank Dublin', 'JPMorgan Dublin', 'Goldman Sachs Dublin', 'Stripe', 'BNY Mellon Dublin', 'State Street'],
      qa:      ['Google EMEA', 'Meta EMEA', 'Microsoft Ireland', 'LinkedIn', 'Salesforce', 'Workday'],
      general: ['Google EMEA', 'Meta EMEA', 'Stripe', 'Salesforce', 'LinkedIn'],
    },
  },

  // ═══ San Francisco Bay Area ══════════════════════════════════════════════
  {
    cityKey: 'san_francisco',
    cityName: 'San Francisco Bay Area',
    countryCode: 'US',
    aliases: ['san francisco', 'sf', 'bay area', 'silicon valley', 'mountain view', 'palo alto', 'cupertino', 'menlo park'],
    rolesByEmployers: {
      sw:      ['Google', 'Apple', 'Meta', 'Salesforce', 'Nvidia', 'Stripe', 'Airbnb', 'Uber', 'Databricks', 'Anthropic'],
      ml:      ['OpenAI', 'Anthropic', 'Google AI', 'Meta AI', 'Nvidia', 'Databricks', 'Scale AI', 'Cohere SF', 'Pinecone'],
      data:    ['Google', 'Meta', 'Salesforce', 'Snowflake', 'Databricks', 'Stripe', 'Airbnb', 'Uber'],
      pm:      ['Google', 'Apple', 'Meta', 'Salesforce', 'Stripe', 'Airbnb', 'Notion', 'Linear'],
      devops:  ['Google Cloud', 'AWS Bay Area', 'Stripe', 'Cloudflare', 'HashiCorp', 'Databricks', 'Snowflake'],
      design:  ['Apple', 'Google', 'Meta', 'Airbnb', 'Stripe', 'Figma', 'Notion', 'Linear'],
      finance: ['Goldman Sachs SF', 'JPMorgan SF', 'Stripe', 'Coinbase', 'Plaid', 'Brex', 'Ramp'],
      qa:      ['Apple', 'Google', 'Meta', 'Salesforce', 'Stripe', 'Airbnb', 'Uber'],
      general: ['Google', 'Apple', 'Meta', 'Salesforce', 'Stripe'],
    },
  },

  // ═══ Seattle-Bellevue ════════════════════════════════════════════════════
  {
    cityKey: 'seattle',
    cityName: 'Seattle-Bellevue',
    countryCode: 'US',
    aliases: ['seattle', 'bellevue', 'redmond', 'kirkland', 'seattle-bellevue'],
    rolesByEmployers: {
      sw:      ['Amazon', 'Microsoft', 'Meta Seattle', 'Google Kirkland', 'Apple Seattle', 'Expedia', 'Zillow', 'Salesforce Seattle'],
      ml:      ['Amazon ML', 'Microsoft AI', 'Meta AI Seattle', 'Google AI Kirkland', 'Apple ML Seattle', 'AWS AI'],
      data:    ['Amazon', 'Microsoft', 'Expedia', 'Zillow', 'Salesforce Seattle', 'Tableau / Salesforce'],
      pm:      ['Amazon', 'Microsoft', 'Meta Seattle', 'Expedia', 'Zillow', 'Tableau'],
      devops:  ['AWS Seattle', 'Microsoft Azure', 'Amazon Infrastructure', 'F5 Networks', 'Stripe Seattle'],
      design:  ['Microsoft', 'Amazon', 'Meta Seattle', 'Tableau', 'Expedia', 'Zillow'],
      finance: ['Amazon Finance Tech', 'Microsoft Tech Finance', 'JPMorgan Seattle', 'Bank of America Seattle'],
      qa:      ['Amazon', 'Microsoft', 'Meta Seattle', 'Expedia', 'Zillow', 'Tableau'],
      general: ['Amazon', 'Microsoft', 'Meta Seattle', 'Google Kirkland', 'Salesforce Seattle'],
    },
  },

  // ═══ New York City ═══════════════════════════════════════════════════════
  {
    cityKey: 'new_york',
    cityName: 'New York City',
    countryCode: 'US',
    aliases: ['new york', 'nyc', 'new york city', 'manhattan', 'brooklyn'],
    rolesByEmployers: {
      sw:      ['Google NYC', 'Meta NYC', 'Amazon NYC', 'Microsoft NYC', 'Bloomberg', 'Etsy', 'MongoDB', 'Datadog', 'Peloton'],
      ml:      ['Meta AI NYC', 'Google AI NYC', 'Bloomberg AI', 'Two Sigma', 'Hudson River Trading', 'Datadog'],
      data:    ['Goldman Sachs', 'JPMorgan', 'Bloomberg', 'Two Sigma', 'Citadel NYC', 'MongoDB', 'Datadog'],
      pm:      ['Google NYC', 'Meta NYC', 'Bloomberg', 'Etsy', 'Datadog', 'Spotify NYC'],
      devops:  ['AWS NYC', 'Google NYC', 'Bloomberg', 'MongoDB', 'Datadog', 'Hashicorp NYC'],
      design:  ['Meta NYC', 'Google NYC', 'Etsy', 'Spotify NYC', 'Datadog'],
      finance: ['Goldman Sachs', 'JPMorgan', 'Morgan Stanley', 'Citadel', 'Two Sigma', 'Hudson River Trading', 'Bloomberg', 'Jane Street'],
      qa:      ['Google NYC', 'Meta NYC', 'Amazon NYC', 'Bloomberg', 'Etsy', 'MongoDB'],
      general: ['Goldman Sachs', 'JPMorgan', 'Google NYC', 'Meta NYC', 'Bloomberg'],
    },
  },

  // ═══ Toronto ═════════════════════════════════════════════════════════════
  {
    cityKey: 'toronto',
    cityName: 'Toronto',
    countryCode: 'CA',
    aliases: ['toronto', 'gta', 'mississauga', 'markham'],
    rolesByEmployers: {
      sw:      ['Shopify', 'Wealthsimple', 'Coinbase Canada', 'Google Toronto', 'Amazon Canada', 'Microsoft Canada', 'TD Bank Tech', 'RBC Tech'],
      ml:      ['Vector Institute', 'Google Brain Toronto', 'Layer 6 AI', 'Cohere Toronto', 'Untether AI', 'Shopify ML'],
      data:    ['Shopify', 'Wealthsimple', 'TD Bank', 'RBC', 'Sun Life', 'Manulife'],
      pm:      ['Shopify', 'Wealthsimple', 'Google Toronto', 'Coinbase Canada', 'Microsoft Canada'],
      devops:  ['Shopify', 'AWS Toronto', 'Microsoft Azure Toronto', 'TD Bank Tech', 'Wealthsimple'],
      design:  ['Shopify', 'Wealthsimple', 'Coinbase Canada', 'Wattpad'],
      finance: ['TD Bank', 'RBC', 'BMO', 'Scotiabank', 'CIBC', 'Manulife', 'Sun Life', 'Wealthsimple'],
      qa:      ['Shopify', 'TD Bank', 'RBC', 'Wealthsimple', 'Microsoft Canada'],
      general: ['Shopify', 'TD Bank', 'RBC', 'Google Toronto', 'Wealthsimple'],
    },
  },

  // ═══ Sydney ══════════════════════════════════════════════════════════════
  {
    cityKey: 'sydney',
    cityName: 'Sydney',
    countryCode: 'AU',
    aliases: ['sydney'],
    rolesByEmployers: {
      sw:      ['Atlassian', 'Canva', 'Afterpay / Block', 'WiseTech Global', 'Amazon AU', 'Google Sydney', 'Microsoft Sydney', 'Macquarie Group Tech'],
      ml:      ['Canva ML', 'Atlassian AI', 'CSIRO Data61', 'Microsoft Sydney AI', 'Amazon AU ML'],
      data:    ['Atlassian', 'Canva', 'Afterpay / Block', 'Commonwealth Bank Tech', 'Westpac Tech', 'NAB Tech'],
      pm:      ['Atlassian', 'Canva', 'Afterpay / Block', 'WiseTech', 'Google Sydney'],
      devops:  ['Atlassian', 'AWS Sydney', 'Canva', 'WiseTech', 'Macquarie Group Tech'],
      design:  ['Canva', 'Atlassian', 'Afterpay / Block', 'WiseTech'],
      finance: ['Commonwealth Bank', 'Westpac', 'NAB', 'ANZ Bank', 'Macquarie Group', 'Afterpay / Block'],
      qa:      ['Atlassian', 'Canva', 'Amazon AU', 'Microsoft Sydney', 'WiseTech'],
      general: ['Atlassian', 'Canva', 'Commonwealth Bank', 'Amazon AU', 'Macquarie Group'],
    },
  },

  // ═══ Tokyo ═══════════════════════════════════════════════════════════════
  {
    cityKey: 'tokyo',
    cityName: 'Tokyo',
    countryCode: 'JP',
    aliases: ['tokyo'],
    rolesByEmployers: {
      sw:      ['Rakuten', 'Mercari', 'LINE / Yahoo Japan', 'SmartNews', 'Sony Tech', 'Mitsubishi UFJ Tech', 'Recruit Holdings Tech', 'Indeed Japan'],
      ml:      ['Sony AI', 'Preferred Networks', 'Rakuten Institute of Technology', 'LINE AI', 'Mercari ML', 'Tokyo Univ AI Lab industry partners'],
      data:    ['Rakuten', 'Mercari', 'LINE / Yahoo Japan', 'Recruit Holdings', 'Mitsubishi UFJ', 'Nomura Tech'],
      pm:      ['Rakuten', 'Mercari', 'LINE / Yahoo Japan', 'SmartNews', 'Recruit Holdings'],
      devops:  ['AWS Tokyo', 'Rakuten Mobile', 'LINE / Yahoo Japan', 'Sony Network'],
      design:  ['Mercari', 'LINE / Yahoo Japan', 'Sony', 'Rakuten', 'SmartNews'],
      finance: ['Mitsubishi UFJ', 'Mizuho Tech', 'Nomura', 'SoftBank Financial', 'SBI Holdings'],
      general: ['Rakuten', 'Mercari', 'LINE / Yahoo Japan', 'Sony Tech', 'SoftBank'],
    },
  },

  // ═══ Tel Aviv ════════════════════════════════════════════════════════════
  {
    cityKey: 'tel_aviv',
    cityName: 'Tel Aviv',
    countryCode: 'IL',
    aliases: ['tel aviv', 'herzliya', 'netanya'],
    rolesByEmployers: {
      sw:      ['Wix', 'Monday.com', 'Lemonade', 'Microsoft Israel', 'Google Israel', 'Meta Israel', 'Intel Israel', 'Nvidia Israel', 'Check Point'],
      ml:      ['Mobileye', 'Lightricks', 'AI21 Labs', 'Run:ai (Nvidia)', 'Microsoft AI Israel', 'Meta AI Israel'],
      data:    ['Wix', 'Monday.com', 'Lemonade', 'Check Point', 'Microsoft Israel', 'Google Israel'],
      pm:      ['Wix', 'Monday.com', 'Lemonade', 'Fiverr', 'Lightricks'],
      devops:  ['Microsoft Israel', 'Google Israel', 'AWS Israel', 'Wix', 'Check Point'],
      design:  ['Wix', 'Monday.com', 'Lightricks', 'Fiverr', 'Lemonade'],
      finance: ['Bank Hapoalim Tech', 'Bank Leumi Tech', 'Discount Bank Tech', 'Goldman Sachs Israel'],
      general: ['Wix', 'Monday.com', 'Microsoft Israel', 'Mobileye', 'Check Point'],
    },
  },

  // ═══ Hong Kong ═══════════════════════════════════════════════════════════
  {
    cityKey: 'hong_kong',
    cityName: 'Hong Kong',
    countryCode: 'HK',
    aliases: ['hong kong', 'hongkong', 'hk'],
    rolesByEmployers: {
      sw:      ['HSBC Tech', 'Goldman Sachs HK', 'JPMorgan HK', 'Standard Chartered HK', 'Amazon HK', 'Google HK', 'Klook'],
      ml:      ['HSBC AI', 'Goldman Sachs HK AI', 'JPMorgan HK Quant', 'Microsoft HK', 'Google HK'],
      data:    ['HSBC', 'JPMorgan HK', 'Goldman Sachs HK', 'Standard Chartered', 'Citibank HK', 'Bloomberg HK'],
      pm:      ['HSBC', 'Klook', 'Goldman Sachs HK', 'JPMorgan HK', 'Amazon HK'],
      devops:  ['AWS HK', 'HSBC Tech', 'JPMorgan HK Tech', 'Microsoft HK'],
      finance: ['HSBC', 'Goldman Sachs HK', 'JPMorgan HK', 'Standard Chartered', 'Citibank HK', 'Morgan Stanley HK', 'Credit Suisse HK'],
      general: ['HSBC', 'Goldman Sachs HK', 'JPMorgan HK', 'Standard Chartered', 'Klook'],
    },
  },

  // ═══ Dubai ═══════════════════════════════════════════════════════════════
  {
    cityKey: 'dubai',
    cityName: 'Dubai',
    countryCode: 'AE',
    aliases: ['dubai'],
    rolesByEmployers: {
      sw:      ['Careem (Uber)', 'Talabat (Delivery Hero)', 'Noon', 'Emirates Group Tech', 'IBM Middle East', 'Microsoft UAE', 'AWS Middle East'],
      ml:      ['Careem', 'G42', 'Talabat', 'Emirates AI', 'Microsoft AI UAE'],
      data:    ['Emirates Group', 'Careem', 'Talabat', 'Noon', 'G42', 'First Abu Dhabi Bank Tech'],
      pm:      ['Careem', 'Talabat', 'Noon', 'Emirates Group', 'Property Finder'],
      devops:  ['AWS Middle East', 'Microsoft UAE', 'Careem', 'Talabat', 'Emirates Group Tech'],
      finance: ['Emirates NBD Tech', 'First Abu Dhabi Bank Tech', 'Mashreq Bank Tech', 'Goldman Sachs Dubai', 'JPMorgan Dubai'],
      general: ['Careem', 'Talabat', 'Noon', 'Emirates Group', 'G42'],
    },
  },
];

// ── Resolution utilities ─────────────────────────────────────────────────────

/** Resolve a free-form city string (e.g., "Singapore, SG" or "amsterdam")
 *  to a global city employer entry. Returns null when no match found.
 *  Does NOT cover India cities — those are in cityOpportunities.ts. */
export function resolveGlobalCityEmployers(city: string | null | undefined): CityRoleEmployers | null {
  if (!city) return null;
  const normalized = city.toLowerCase().trim();
  for (const entry of GLOBAL_CITY_EMPLOYERS) {
    if (entry.cityKey === normalized) return entry;
  }
  for (const entry of GLOBAL_CITY_EMPLOYERS) {
    if (entry.aliases.some(a =>
      normalized === a
      || normalized.startsWith(a + ',')
      || normalized.startsWith(a + ' ')
      || a.startsWith(normalized.split(',')[0].trim()),
    )) {
      return entry;
    }
  }
  return null;
}

/** Resolve city + role category → top employers in that city for that role.
 *  Falls back to the city's 'general' bucket when the role category isn't found. */
export function getGlobalCityRoleEmployers(
  city: string | null | undefined,
  roleCategoryKey: string,
): string[] {
  const entry = resolveGlobalCityEmployers(city);
  if (!entry) return [];
  const roleEmployers = entry.rolesByEmployers[roleCategoryKey];
  if (roleEmployers && roleEmployers.length > 0) return [...roleEmployers];
  // Fall back to 'general' if role category not found
  return [...(entry.rolesByEmployers['general'] ?? [])];
}

/**
 * Cross-reference a city's hiring employers (for a target role) with the
 * "global top hirers" pool from careerPathMarket.topHiringCompaniesGlobal.
 *
 * Returns the intersection (companies present in BOTH lists) or a graceful
 * fallback to the city's roster when intersection is empty.
 *
 * Use case: Singapore SWE pivoting to ML Engineering
 *   city = 'singapore', roleCategoryKey = 'ml'
 *   globalTopCompanies = ['Anthropic', 'OpenAI', 'Cohere', 'Mistral', 'Databricks']
 *   → Direct intersection: empty (none yet established in Singapore at scale)
 *   → city_fallback: ['Grab', 'Sea Limited', 'Shopee', 'Lazada', 'Carousell', 'TikTok APAC']
 *   Result: surfaces actual Singapore ML employers the user can apply to TONIGHT.
 */
export function getGlobalCityCompanyIntersection(
  city: string | null | undefined,
  roleCategoryKey: string,
  globalTopCompanies: readonly string[],
): { companies: string[]; source: 'intersection' | 'city_fallback' | 'global_fallback' | 'unknown_city' } {
  const cityEmployers = getGlobalCityRoleEmployers(city, roleCategoryKey);

  if (cityEmployers.length === 0) {
    // City not in global registry — return top global companies as the fallback
    return {
      companies: [...globalTopCompanies].slice(0, 3),
      source: globalTopCompanies.length > 0 ? 'global_fallback' : 'unknown_city',
    };
  }

  // Direct intersection (case-insensitive partial match on first word)
  const intersection = globalTopCompanies.filter(global =>
    cityEmployers.some(cityCo => {
      const cityFirstWord = cityCo.split(' ')[0].toLowerCase();
      const globalFirstWord = global.split(' ')[0].toLowerCase();
      return cityCo.toLowerCase().includes(globalFirstWord)
        || global.toLowerCase().includes(cityFirstWord);
    }),
  );

  if (intersection.length >= 2) {
    return { companies: intersection.slice(0, 3), source: 'intersection' };
  }

  // Not enough intersection — return city employers (they ARE the actionable
  // candidates even when the global pool doesn't overlap with the city's roster)
  return {
    companies: cityEmployers.slice(0, 3),
    source: 'city_fallback',
  };
}
