// globalCitySalaryPremiums.ts — Unified city salary premium registry.
//
// PURPOSE: The full-transition recovery trajectory in SalaryAtRiskPanel previously
// only knew about 15 Indian cities. A San Francisco engineer transitioning to a
// lower-displacement role was shown national-median income, understating their
// actual recovery ceiling by 30-50%. This file unifies city salary premiums
// across all major global markets.
//
// SCOPE: 35+ cities across US, UK, EU, Canada, APAC, Australia, Middle East, India.
// Each premium represents the local median salary above/below the NATIONAL median
// for the country (NOT a global baseline) — preserving the existing
// SalaryAtRiskPanel formula `full × (1 + premium/100)`.
//
// CITY → NATIONAL BASELINE EXAMPLES:
//   San Francisco +45% vs US national median ($165k vs $114k)
//   New York +38% vs US national
//   London +28% vs UK national
//   Singapore +40% vs SEA regional median
//   Zurich +55% vs European median (Switzerland is the highest-paying tech market)
//   Sydney +25% vs Australia national
//   Toronto +20% vs Canada national
//
// USE BY: SalaryAtRiskPanel.tsx (full-transition trajectory recovery line).
// The premium is applied as: full_income = national_baseline × (1 + premium/100).
//
// LABELED: ESTIMATED — derived from LinkedIn Workforce Report 2024-2025,
// Glassdoor 2025, Levels.fyi 2025, Hired.com State of Software Engineers 2025,
// Hays Salary Guide 2024-2025. Premium values represent overall tech-roles median.

export interface CitySalaryPremium {
  /** Canonical city key (lowercase, underscored) */
  cityKey: string;
  /** Display name */
  cityName: string;
  /** ISO 3166-1 alpha-2 country code */
  countryCode: string;
  /** Premium % vs national median (positive = higher, negative = lower) */
  premiumPct: number;
  /** Human-readable baseline reference for the UI disclosure */
  baselineLabel: string;
  /** Local currency for display (ISO 4217) */
  localCurrency: string;
  /** All free-form input strings that should resolve to this city */
  aliases: readonly string[];
}

// ── Global city salary premium registry ──────────────────────────────────────

export const GLOBAL_CITY_SALARY_PREMIUMS: readonly CitySalaryPremium[] = [

  // ═══ India (15 cities — existing) ════════════════════════════════════════
  { cityKey: 'bangalore',    cityName: 'Bangalore',    countryCode: 'IN', premiumPct:  22, baselineLabel: 'India national median',
    localCurrency: 'INR', aliases: ['bangalore', 'bengaluru', 'bangaluru'] },
  { cityKey: 'mumbai',       cityName: 'Mumbai',       countryCode: 'IN', premiumPct:  18, baselineLabel: 'India national median',
    localCurrency: 'INR', aliases: ['mumbai', 'bombay'] },
  { cityKey: 'hyderabad',    cityName: 'Hyderabad',    countryCode: 'IN', premiumPct:  16, baselineLabel: 'India national median',
    localCurrency: 'INR', aliases: ['hyderabad'] },
  { cityKey: 'pune',         cityName: 'Pune',         countryCode: 'IN', premiumPct:  13, baselineLabel: 'India national median',
    localCurrency: 'INR', aliases: ['pune'] },
  { cityKey: 'chennai',      cityName: 'Chennai',      countryCode: 'IN', premiumPct:  10, baselineLabel: 'India national median',
    localCurrency: 'INR', aliases: ['chennai', 'madras'] },
  { cityKey: 'delhi_ncr',    cityName: 'Delhi NCR',    countryCode: 'IN', premiumPct:  11, baselineLabel: 'India national median',
    localCurrency: 'INR', aliases: ['delhi', 'delhi ncr', 'new delhi', 'ncr'] },
  { cityKey: 'noida',        cityName: 'Noida',        countryCode: 'IN', premiumPct:   4, baselineLabel: 'India national median',
    localCurrency: 'INR', aliases: ['noida'] },
  { cityKey: 'gurgaon',      cityName: 'Gurgaon',      countryCode: 'IN', premiumPct:   9, baselineLabel: 'India national median',
    localCurrency: 'INR', aliases: ['gurgaon', 'gurugram'] },
  { cityKey: 'kolkata',      cityName: 'Kolkata',      countryCode: 'IN', premiumPct:  -8, baselineLabel: 'India national median',
    localCurrency: 'INR', aliases: ['kolkata', 'calcutta'] },
  { cityKey: 'ahmedabad',    cityName: 'Ahmedabad',    countryCode: 'IN', premiumPct:  -6, baselineLabel: 'India national median',
    localCurrency: 'INR', aliases: ['ahmedabad'] },
  { cityKey: 'kochi',        cityName: 'Kochi',        countryCode: 'IN', premiumPct: -10, baselineLabel: 'India national median',
    localCurrency: 'INR', aliases: ['kochi', 'cochin'] },
  { cityKey: 'coimbatore',   cityName: 'Coimbatore',   countryCode: 'IN', premiumPct: -14, baselineLabel: 'India national median',
    localCurrency: 'INR', aliases: ['coimbatore'] },
  { cityKey: 'jaipur',       cityName: 'Jaipur',       countryCode: 'IN', premiumPct: -16, baselineLabel: 'India national median',
    localCurrency: 'INR', aliases: ['jaipur'] },
  { cityKey: 'nagpur',       cityName: 'Nagpur',       countryCode: 'IN', premiumPct: -20, baselineLabel: 'India national median',
    localCurrency: 'INR', aliases: ['nagpur'] },
  { cityKey: 'indore',       cityName: 'Indore',       countryCode: 'IN', premiumPct: -18, baselineLabel: 'India national median',
    localCurrency: 'INR', aliases: ['indore'] },

  // ═══ United States (12 cities) ═══════════════════════════════════════════
  // SF Bay Area: highest US premium (+45%) — Levels.fyi shows SF tech median
  // ~$165k vs US national tech median ~$114k.
  { cityKey: 'san_francisco', cityName: 'San Francisco Bay Area', countryCode: 'US', premiumPct:  45, baselineLabel: 'US national median',
    localCurrency: 'USD', aliases: ['san francisco', 'sf', 'bay area', 'silicon valley', 'mountain view', 'palo alto', 'menlo park', 'cupertino', 'sunnyvale', 'santa clara', 'san jose'] },
  { cityKey: 'new_york',      cityName: 'New York City',          countryCode: 'US', premiumPct:  38, baselineLabel: 'US national median',
    localCurrency: 'USD', aliases: ['new york', 'nyc', 'new york city', 'manhattan', 'brooklyn'] },
  { cityKey: 'seattle',       cityName: 'Seattle-Bellevue',       countryCode: 'US', premiumPct:  32, baselineLabel: 'US national median',
    localCurrency: 'USD', aliases: ['seattle', 'bellevue', 'redmond', 'kirkland'] },
  { cityKey: 'boston',        cityName: 'Boston-Cambridge',       countryCode: 'US', premiumPct:  18, baselineLabel: 'US national median',
    localCurrency: 'USD', aliases: ['boston', 'cambridge', 'cambridge ma', 'boston ma'] },
  { cityKey: 'austin',        cityName: 'Austin',                  countryCode: 'US', premiumPct:   8, baselineLabel: 'US national median',
    localCurrency: 'USD', aliases: ['austin', 'austin tx', 'austin texas', 'round rock'] },
  { cityKey: 'los_angeles',   cityName: 'Los Angeles',             countryCode: 'US', premiumPct:  12, baselineLabel: 'US national median',
    localCurrency: 'USD', aliases: ['los angeles', 'la', 'santa monica', 'culver city'] },
  { cityKey: 'denver',        cityName: 'Denver-Boulder',          countryCode: 'US', premiumPct:   5, baselineLabel: 'US national median',
    localCurrency: 'USD', aliases: ['denver', 'boulder', 'aurora'] },
  { cityKey: 'dallas_fort_worth', cityName: 'Dallas-Fort Worth',   countryCode: 'US', premiumPct:   2, baselineLabel: 'US national median',
    localCurrency: 'USD', aliases: ['dallas', 'fort worth', 'dfw', 'plano'] },
  { cityKey: 'chicago',       cityName: 'Chicago',                 countryCode: 'US', premiumPct:   5, baselineLabel: 'US national median',
    localCurrency: 'USD', aliases: ['chicago', 'evanston'] },
  { cityKey: 'raleigh_durham', cityName: 'Raleigh-Durham',          countryCode: 'US', premiumPct:  -5, baselineLabel: 'US national median',
    localCurrency: 'USD', aliases: ['raleigh', 'durham', 'rtp', 'research triangle'] },
  { cityKey: 'atlanta',       cityName: 'Atlanta',                 countryCode: 'US', premiumPct:  -8, baselineLabel: 'US national median',
    localCurrency: 'USD', aliases: ['atlanta', 'buckhead'] },
  { cityKey: 'phoenix',       cityName: 'Phoenix',                 countryCode: 'US', premiumPct: -18, baselineLabel: 'US national median',
    localCurrency: 'USD', aliases: ['phoenix', 'scottsdale', 'tempe', 'chandler', 'mesa'] },

  // ═══ United Kingdom ══════════════════════════════════════════════════════
  // London +28% vs UK national. UK national tech median ~£55k; London ~£72k.
  { cityKey: 'london',        cityName: 'London',                  countryCode: 'GB', premiumPct:  28, baselineLabel: 'UK national median',
    localCurrency: 'GBP', aliases: ['london', 'greater london', 'canary wharf', 'shoreditch', 'kings cross'] },
  { cityKey: 'manchester',    cityName: 'Manchester',              countryCode: 'GB', premiumPct:  -5, baselineLabel: 'UK national median',
    localCurrency: 'GBP', aliases: ['manchester', 'salford'] },
  { cityKey: 'edinburgh',     cityName: 'Edinburgh',               countryCode: 'GB', premiumPct:   2, baselineLabel: 'UK national median',
    localCurrency: 'GBP', aliases: ['edinburgh'] },
  { cityKey: 'cambridge',     cityName: 'Cambridge',               countryCode: 'GB', premiumPct:  12, baselineLabel: 'UK national median',
    localCurrency: 'GBP', aliases: ['cambridge', 'cambridge uk'] },

  // ═══ EU Continental ══════════════════════════════════════════════════════
  // EU regional median ~€55-60k for tech; Zurich +55% reflects Switzerland's
  // exceptional pay (CHF salaries highest globally even before US conversion).
  { cityKey: 'berlin',        cityName: 'Berlin',                  countryCode: 'DE', premiumPct:  -8, baselineLabel: 'EU regional median',
    localCurrency: 'EUR', aliases: ['berlin', 'mitte', 'kreuzberg', 'prenzlauer berg'] },
  { cityKey: 'munich',        cityName: 'Munich',                  countryCode: 'DE', premiumPct:   8, baselineLabel: 'EU regional median',
    localCurrency: 'EUR', aliases: ['munich', 'münchen'] },
  { cityKey: 'frankfurt',     cityName: 'Frankfurt',               countryCode: 'DE', premiumPct:  12, baselineLabel: 'EU regional median',
    localCurrency: 'EUR', aliases: ['frankfurt', 'frankfurt am main'] },
  { cityKey: 'amsterdam',     cityName: 'Amsterdam',               countryCode: 'NL', premiumPct:  12, baselineLabel: 'EU regional median',
    localCurrency: 'EUR', aliases: ['amsterdam', 'amstelveen'] },
  { cityKey: 'dublin',        cityName: 'Dublin',                  countryCode: 'IE', premiumPct:   5, baselineLabel: 'EU regional median',
    localCurrency: 'EUR', aliases: ['dublin', 'dublin city', 'docklands', 'silicon docks'] },
  { cityKey: 'paris',         cityName: 'Paris',                   countryCode: 'FR', premiumPct:  -2, baselineLabel: 'EU regional median',
    localCurrency: 'EUR', aliases: ['paris', 'ile de france'] },
  { cityKey: 'madrid',        cityName: 'Madrid',                  countryCode: 'ES', premiumPct: -22, baselineLabel: 'EU regional median',
    localCurrency: 'EUR', aliases: ['madrid'] },
  { cityKey: 'barcelona',     cityName: 'Barcelona',               countryCode: 'ES', premiumPct: -20, baselineLabel: 'EU regional median',
    localCurrency: 'EUR', aliases: ['barcelona'] },
  { cityKey: 'stockholm',     cityName: 'Stockholm',               countryCode: 'SE', premiumPct:   5, baselineLabel: 'EU regional median',
    localCurrency: 'SEK', aliases: ['stockholm'] },
  { cityKey: 'copenhagen',    cityName: 'Copenhagen',              countryCode: 'DK', premiumPct:  15, baselineLabel: 'EU regional median',
    localCurrency: 'DKK', aliases: ['copenhagen', 'københavn'] },
  { cityKey: 'zurich',        cityName: 'Zurich',                  countryCode: 'CH', premiumPct:  55, baselineLabel: 'European median',
    localCurrency: 'CHF', aliases: ['zurich', 'zürich'] },
  { cityKey: 'geneva',        cityName: 'Geneva',                  countryCode: 'CH', premiumPct:  50, baselineLabel: 'European median',
    localCurrency: 'CHF', aliases: ['geneva', 'genève'] },

  // ═══ Canada ══════════════════════════════════════════════════════════════
  { cityKey: 'toronto',       cityName: 'Toronto',                 countryCode: 'CA', premiumPct:  20, baselineLabel: 'Canada national median',
    localCurrency: 'CAD', aliases: ['toronto', 'gta', 'mississauga', 'markham'] },
  { cityKey: 'vancouver',     cityName: 'Vancouver',               countryCode: 'CA', premiumPct:  18, baselineLabel: 'Canada national median',
    localCurrency: 'CAD', aliases: ['vancouver', 'burnaby', 'richmond bc'] },
  { cityKey: 'montreal',      cityName: 'Montreal',                countryCode: 'CA', premiumPct:   8, baselineLabel: 'Canada national median',
    localCurrency: 'CAD', aliases: ['montreal', 'montréal'] },
  { cityKey: 'calgary',       cityName: 'Calgary',                 countryCode: 'CA', premiumPct:   5, baselineLabel: 'Canada national median',
    localCurrency: 'CAD', aliases: ['calgary'] },
  { cityKey: 'ottawa',        cityName: 'Ottawa',                  countryCode: 'CA', premiumPct:  10, baselineLabel: 'Canada national median',
    localCurrency: 'CAD', aliases: ['ottawa'] },

  // ═══ APAC ════════════════════════════════════════════════════════════════
  // Singapore +40% vs SEA regional median (highest in Southeast Asia).
  { cityKey: 'singapore',     cityName: 'Singapore',               countryCode: 'SG', premiumPct:  40, baselineLabel: 'SEA regional median',
    localCurrency: 'SGD', aliases: ['singapore', 'sg'] },
  { cityKey: 'tokyo',         cityName: 'Tokyo',                   countryCode: 'JP', premiumPct:  18, baselineLabel: 'Japan national median',
    localCurrency: 'JPY', aliases: ['tokyo'] },
  { cityKey: 'osaka',         cityName: 'Osaka',                   countryCode: 'JP', premiumPct:   2, baselineLabel: 'Japan national median',
    localCurrency: 'JPY', aliases: ['osaka'] },
  { cityKey: 'seoul',         cityName: 'Seoul',                   countryCode: 'KR', premiumPct:  22, baselineLabel: 'South Korea national median',
    localCurrency: 'KRW', aliases: ['seoul'] },
  { cityKey: 'hong_kong',     cityName: 'Hong Kong',               countryCode: 'HK', premiumPct:  35, baselineLabel: 'APAC regional median',
    localCurrency: 'HKD', aliases: ['hong kong', 'hongkong', 'hk'] },
  { cityKey: 'taipei',        cityName: 'Taipei',                  countryCode: 'TW', premiumPct:   8, baselineLabel: 'Taiwan national median',
    localCurrency: 'TWD', aliases: ['taipei'] },
  { cityKey: 'shanghai',      cityName: 'Shanghai',                countryCode: 'CN', premiumPct:  25, baselineLabel: 'China national median',
    localCurrency: 'CNY', aliases: ['shanghai'] },
  { cityKey: 'beijing',       cityName: 'Beijing',                 countryCode: 'CN', premiumPct:  22, baselineLabel: 'China national median',
    localCurrency: 'CNY', aliases: ['beijing'] },
  { cityKey: 'shenzhen',      cityName: 'Shenzhen',                countryCode: 'CN', premiumPct:  20, baselineLabel: 'China national median',
    localCurrency: 'CNY', aliases: ['shenzhen'] },

  // ═══ Australia & New Zealand ══════════════════════════════════════════════
  { cityKey: 'sydney',        cityName: 'Sydney',                  countryCode: 'AU', premiumPct:  25, baselineLabel: 'Australia national median',
    localCurrency: 'AUD', aliases: ['sydney'] },
  { cityKey: 'melbourne',     cityName: 'Melbourne',               countryCode: 'AU', premiumPct:  18, baselineLabel: 'Australia national median',
    localCurrency: 'AUD', aliases: ['melbourne'] },
  { cityKey: 'brisbane',      cityName: 'Brisbane',                countryCode: 'AU', premiumPct:   5, baselineLabel: 'Australia national median',
    localCurrency: 'AUD', aliases: ['brisbane'] },
  { cityKey: 'auckland',      cityName: 'Auckland',                countryCode: 'NZ', premiumPct:  15, baselineLabel: 'New Zealand national median',
    localCurrency: 'NZD', aliases: ['auckland'] },

  // ═══ Middle East ══════════════════════════════════════════════════════════
  { cityKey: 'dubai',         cityName: 'Dubai',                   countryCode: 'AE', premiumPct:  25, baselineLabel: 'MENA regional median',
    localCurrency: 'AED', aliases: ['dubai'] },
  { cityKey: 'abu_dhabi',     cityName: 'Abu Dhabi',               countryCode: 'AE', premiumPct:  22, baselineLabel: 'MENA regional median',
    localCurrency: 'AED', aliases: ['abu dhabi'] },
  { cityKey: 'riyadh',        cityName: 'Riyadh',                  countryCode: 'SA', premiumPct:  15, baselineLabel: 'MENA regional median',
    localCurrency: 'SAR', aliases: ['riyadh'] },
  { cityKey: 'tel_aviv',      cityName: 'Tel Aviv',                countryCode: 'IL', premiumPct:  30, baselineLabel: 'Israel national median',
    localCurrency: 'ILS', aliases: ['tel aviv', 'herzliya', 'netanya'] },

  // ═══ LatAm ════════════════════════════════════════════════════════════════
  { cityKey: 'sao_paulo',     cityName: 'São Paulo',               countryCode: 'BR', premiumPct:  18, baselineLabel: 'Brazil national median',
    localCurrency: 'BRL', aliases: ['são paulo', 'sao paulo', 'sp'] },
  { cityKey: 'mexico_city',   cityName: 'Mexico City',             countryCode: 'MX', premiumPct:  15, baselineLabel: 'Mexico national median',
    localCurrency: 'MXN', aliases: ['mexico city', 'cdmx', 'ciudad de méxico'] },
];

// ── Resolution utilities ─────────────────────────────────────────────────────

/** Resolve a free-form city string (e.g., "San Francisco, CA" or "bengaluru")
 *  to a canonical premium entry. Returns null when no match found. */
export function resolveCityPremium(city: string | null | undefined): CitySalaryPremium | null {
  if (!city) return null;
  const normalized = city.toLowerCase().trim();
  // Try cityKey exact match first
  for (const entry of GLOBAL_CITY_SALARY_PREMIUMS) {
    if (entry.cityKey === normalized) return entry;
  }
  // Then alias matching
  for (const entry of GLOBAL_CITY_SALARY_PREMIUMS) {
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

/** Returns the premium percentage for a city (0 when unknown). */
export function getGlobalCitySalaryPremium(city: string | null | undefined): number {
  return resolveCityPremium(city)?.premiumPct ?? 0;
}

/** Returns the recommended display currency for a region/country code.
 *  Falls back to USD for unknown regions. */
export function getCurrencyForRegion(region: string | null | undefined): string {
  if (!region) return 'USD';
  const map: Record<string, string> = {
    US: 'USD', USA: 'USD',
    GB: 'GBP', UK: 'GBP',
    IN: 'INR', INDIA: 'INR',
    SG: 'SGD', SINGAPORE: 'SGD',
    AU: 'AUD',
    CA: 'CAD',
    DE: 'EUR', FR: 'EUR', NL: 'EUR', IE: 'EUR', ES: 'EUR', IT: 'EUR',
    BE: 'EUR', AT: 'EUR', PT: 'EUR', FI: 'EUR',
    CH: 'CHF',
    SE: 'SEK',
    NO: 'NOK',
    DK: 'DKK',
    JP: 'JPY',
    KR: 'KRW',
    CN: 'CNY',
    HK: 'HKD',
    TW: 'TWD',
    AE: 'AED',
    SA: 'SAR',
    IL: 'ILS',
    BR: 'BRL',
    MX: 'MXN',
    NZ: 'NZD',
    EU: 'EUR',
  };
  return map[region.toUpperCase().trim()] ?? 'USD';
}
