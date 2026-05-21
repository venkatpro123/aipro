// techClusterMetros.ts — US tech cluster geographic concentration data.
//
// Maps metro areas to their dominant tech employers, presence mode, and
// estimated local headcount. Used by peerContagionEngine to compute geo-
// amplified supply-surge risk when co-located peers cut simultaneously, and
// by jobMarketLiquidityService to extend re-employment timelines when the
// local engineer supply floods the market.
//
// Key insight: A Seattle software engineer hit by an Amazon layoff wave is
// NOT competing in the same job pool as a remote SWE with no metro anchor.
// Microsoft (75k local), Meta (3.5k local), Google Kirkland (5k), Apple
// Seattle (2.5k), and Salesforce Seattle (1.2k) all draw from and release
// into the same local talent market. A coordinated 5% cut across 3+ of
// these employers releases ~10,000+ engineers into a single metro market —
// a supply surge with no national equivalent.
//
// Presence modes affect how much a company's layoff contributes to local supply:
//   hq:           1.00  — full workforce co-located (Amazon Seattle = 100k locally)
//   major_office: 0.75  — large regional hub (1,000+ employees)
//   satellite:    0.35  — smaller presence (100–999 employees)
//   remote_first: 0.10  — nominal office; engineers distributed globally
//
// ESTIMATED: All headcounts are research-derived approximations (2025–2026).
// They establish order-of-magnitude surge capacity, not exact headcount.

export type CompanyPresenceMode =
  | 'hq'            // headquarters — full workforce co-located
  | 'major_office'  // large regional office (1,000+ employees)
  | 'satellite'     // smaller hub (100–999 employees)
  | 'remote_first'; // nominal office; employees distributed globally

export interface MetroCompany {
  companyKey: string;            // normalized lowercase, matches companyPeers.ts companyId
  displayName: string;
  presenceMode: CompanyPresenceMode;
  estimatedHeadcount: number;    // approximate local employees (order of magnitude)
}

export interface TechClusterMetro {
  metroName: string;             // display name
  aliases: readonly string[];    // all spellings/variants that map here
  region: string;                // ISO country code
  concentrationScore: number;    // 0–1: tech employment density vs general metro
  dominantCompanies: MetroCompany[];
}

// ── Supply-surge weight by presence mode ─────────────────────────────────────
// Remote-first layoffs hit ALL markets equally — not a local supply surge.
// HQ layoffs concentrate all displaced workers into the local market.
export const PRESENCE_SURGE_WEIGHT: Record<CompanyPresenceMode, number> = {
  hq:           1.00,
  major_office: 0.75,
  satellite:    0.35,
  remote_first: 0.10,
};

// ── US Tech Cluster Metro Registry ───────────────────────────────────────────
// ESTIMATED — headcounts are order-of-magnitude approximations derived from
// public filings, LinkedIn headcount data, and news reports (2025–2026).
export const TECH_CLUSTER_METROS: readonly TechClusterMetro[] = [

  // ── Seattle-Bellevue-Redmond (WA) ──────────────────────────────────────────
  // Most concentrated tech cluster per capita outside Bay Area.
  // Amazon + Microsoft alone account for ~175,000 local tech employees.
  // A coordinated 5% cut would release ~10,000 engineers into one metro.
  {
    metroName: 'Seattle-Bellevue',
    aliases: [
      'seattle', 'bellevue', 'redmond', 'kirkland', 'seattle-bellevue',
      'seattle metro', 'greater seattle', 'puget sound', 'bothell', 'issaquah',
    ],
    region: 'US',
    concentrationScore: 0.92,
    dominantCompanies: [
      { companyKey: 'amazon',     displayName: 'Amazon (HQ)',           presenceMode: 'hq',           estimatedHeadcount: 100_000 },
      { companyKey: 'microsoft',  displayName: 'Microsoft (HQ)',         presenceMode: 'hq',           estimatedHeadcount: 75_000  },
      { companyKey: 'google',     displayName: 'Google (Kirkland)',       presenceMode: 'major_office', estimatedHeadcount: 5_000   },
      { companyKey: 'meta',       displayName: 'Meta (Seattle)',          presenceMode: 'major_office', estimatedHeadcount: 3_500   },
      { companyKey: 'apple',      displayName: 'Apple (Seattle hub)',     presenceMode: 'major_office', estimatedHeadcount: 2_500   },
      { companyKey: 'salesforce', displayName: 'Salesforce (Seattle)',    presenceMode: 'satellite',    estimatedHeadcount: 1_200   },
      { companyKey: 'expedia',    displayName: 'Expedia (HQ)',            presenceMode: 'hq',           estimatedHeadcount: 4_000   },
      { companyKey: 'zillow',     displayName: 'Zillow (HQ)',             presenceMode: 'hq',           estimatedHeadcount: 3_000   },
      { companyKey: 'stripe',     displayName: 'Stripe (Seattle office)', presenceMode: 'satellite',    estimatedHeadcount: 800     },
      { companyKey: 'redfin',     displayName: 'Redfin (HQ)',             presenceMode: 'hq',           estimatedHeadcount: 1_000   },
      { companyKey: 'tableau',    displayName: 'Tableau / Salesforce',    presenceMode: 'major_office', estimatedHeadcount: 1_500   },
    ],
  },

  // ── San Francisco Bay Area (CA) ────────────────────────────────────────────
  // World's highest density of tech companies. SF + Silicon Valley modeled as
  // one metro because displaced engineers compete in the same labor market.
  // concentrationScore=1.00 is the reference maximum.
  {
    metroName: 'San Francisco Bay Area',
    aliases: [
      'san francisco', 'sf', 'san francisco bay area', 'bay area', 'silicon valley',
      'mountain view', 'menlo park', 'palo alto', 'cupertino', 'sunnyvale',
      'santa clara', 'san jose', 'south bay', 'east bay', 'oakland', 'emeryville',
      'foster city', 'redwood city', 'burlingame',
    ],
    region: 'US',
    concentrationScore: 1.00,
    dominantCompanies: [
      { companyKey: 'google',     displayName: 'Google (HQ)',             presenceMode: 'hq',           estimatedHeadcount: 55_000  },
      { companyKey: 'apple',      displayName: 'Apple (HQ)',              presenceMode: 'hq',           estimatedHeadcount: 60_000  },
      { companyKey: 'meta',       displayName: 'Meta (HQ)',               presenceMode: 'hq',           estimatedHeadcount: 28_000  },
      { companyKey: 'salesforce', displayName: 'Salesforce (HQ)',         presenceMode: 'hq',           estimatedHeadcount: 10_000  },
      { companyKey: 'nvidia',     displayName: 'Nvidia (HQ)',             presenceMode: 'hq',           estimatedHeadcount: 15_000  },
      { companyKey: 'intel',      displayName: 'Intel (HQ)',              presenceMode: 'hq',           estimatedHeadcount: 25_000  },
      { companyKey: 'cisco',      displayName: 'Cisco (HQ)',              presenceMode: 'hq',           estimatedHeadcount: 20_000  },
      { companyKey: 'adobe',      displayName: 'Adobe (HQ)',              presenceMode: 'hq',           estimatedHeadcount: 8_000   },
      { companyKey: 'linkedin',   displayName: 'LinkedIn (HQ)',           presenceMode: 'hq',           estimatedHeadcount: 12_000  },
      { companyKey: 'netflix',    displayName: 'Netflix (HQ)',            presenceMode: 'hq',           estimatedHeadcount: 8_000   },
      { companyKey: 'uber',       displayName: 'Uber (HQ)',               presenceMode: 'hq',           estimatedHeadcount: 10_000  },
      { companyKey: 'airbnb',     displayName: 'Airbnb (HQ)',             presenceMode: 'hq',           estimatedHeadcount: 4_000   },
      { companyKey: 'lyft',       displayName: 'Lyft (HQ)',               presenceMode: 'hq',           estimatedHeadcount: 2_500   },
      { companyKey: 'stripe',     displayName: 'Stripe (HQ)',             presenceMode: 'hq',           estimatedHeadcount: 4_000   },
      { companyKey: 'amazon',     displayName: 'Amazon (Bay Area)',       presenceMode: 'major_office', estimatedHeadcount: 10_000  },
      { companyKey: 'microsoft',  displayName: 'Microsoft (Bay Area)',    presenceMode: 'major_office', estimatedHeadcount: 5_000   },
      { companyKey: 'twitter',    displayName: 'X / Twitter (HQ)',        presenceMode: 'hq',           estimatedHeadcount: 2_000   },
      { companyKey: 'reddit',     displayName: 'Reddit (HQ)',             presenceMode: 'hq',           estimatedHeadcount: 1_500   },
      { companyKey: 'oracle',     displayName: 'Oracle (Austin/SF)',      presenceMode: 'satellite',    estimatedHeadcount: 3_000   },
      { companyKey: 'github',     displayName: 'GitHub',                  presenceMode: 'remote_first', estimatedHeadcount: 1_000   },
    ],
  },

  // ── New York City (NY) ─────────────────────────────────────────────────────
  // Largest metro by total tech headcount but lower density than Bay Area.
  // Finance-tech hybrid amplifies supply surge for fintech/quant roles.
  {
    metroName: 'New York City',
    aliases: [
      'new york', 'nyc', 'new york city', 'manhattan', 'brooklyn',
      'jersey city', 'hoboken', 'lower manhattan', 'midtown',
    ],
    region: 'US',
    concentrationScore: 0.74,
    dominantCompanies: [
      { companyKey: 'google',       displayName: 'Google NYC',            presenceMode: 'major_office', estimatedHeadcount: 14_000  },
      { companyKey: 'meta',         displayName: 'Meta NYC',              presenceMode: 'major_office', estimatedHeadcount: 6_000   },
      { companyKey: 'amazon',       displayName: 'Amazon NYC',            presenceMode: 'major_office', estimatedHeadcount: 8_000   },
      { companyKey: 'microsoft',    displayName: 'Microsoft NYC',         presenceMode: 'major_office', estimatedHeadcount: 3_000   },
      { companyKey: 'goldman sachs',displayName: 'Goldman Sachs',         presenceMode: 'hq',           estimatedHeadcount: 12_000  },
      { companyKey: 'jp morgan',    displayName: 'JPMorgan',              presenceMode: 'hq',           estimatedHeadcount: 30_000  },
      { companyKey: 'bloomberg',    displayName: 'Bloomberg',             presenceMode: 'hq',           estimatedHeadcount: 6_000   },
      { companyKey: 'etsy',         displayName: 'Etsy',                  presenceMode: 'hq',           estimatedHeadcount: 1_500   },
      { companyKey: 'mongodb',      displayName: 'MongoDB',               presenceMode: 'hq',           estimatedHeadcount: 2_500   },
      { companyKey: 'datadog',      displayName: 'Datadog',               presenceMode: 'hq',           estimatedHeadcount: 3_000   },
      { companyKey: 'twilio',       displayName: 'Twilio',                presenceMode: 'satellite',    estimatedHeadcount: 500     },
    ],
  },

  // ── Austin-Round Rock (TX) ─────────────────────────────────────────────────
  // Fastest-growing US tech cluster. Dell + Tesla HQs, Apple's second campus.
  {
    metroName: 'Austin',
    aliases: [
      'austin', 'austin tx', 'austin texas', 'round rock', 'cedar park tx',
    ],
    region: 'US',
    concentrationScore: 0.72,
    dominantCompanies: [
      { companyKey: 'dell',       displayName: 'Dell (HQ)',               presenceMode: 'hq',           estimatedHeadcount: 12_000  },
      { companyKey: 'tesla',      displayName: 'Tesla (HQ)',              presenceMode: 'hq',           estimatedHeadcount: 10_000  },
      { companyKey: 'apple',      displayName: 'Apple (Austin campus)',   presenceMode: 'major_office', estimatedHeadcount: 6_000   },
      { companyKey: 'oracle',     displayName: 'Oracle (HQ)',             presenceMode: 'hq',           estimatedHeadcount: 8_000   },
      { companyKey: 'google',     displayName: 'Google Austin',           presenceMode: 'major_office', estimatedHeadcount: 2_500   },
      { companyKey: 'amazon',     displayName: 'Amazon Austin',           presenceMode: 'major_office', estimatedHeadcount: 3_000   },
      { companyKey: 'meta',       displayName: 'Meta Austin',             presenceMode: 'major_office', estimatedHeadcount: 2_000   },
      { companyKey: 'salesforce', displayName: 'Salesforce Austin',       presenceMode: 'satellite',    estimatedHeadcount: 1_500   },
    ],
  },

  // ── Boston-Cambridge (MA) ──────────────────────────────────────────────────
  // Biotech + tech hybrid. Strong university pipeline (MIT, Harvard).
  {
    metroName: 'Boston-Cambridge',
    aliases: [
      'boston', 'cambridge', 'cambridge ma', 'boston ma', 'greater boston',
      'waltham', 'burlington ma', 'woburn',
    ],
    region: 'US',
    concentrationScore: 0.64,
    dominantCompanies: [
      { companyKey: 'amazon',    displayName: 'Amazon (Boston)',         presenceMode: 'major_office', estimatedHeadcount: 5_000   },
      { companyKey: 'google',    displayName: 'Google (Cambridge)',      presenceMode: 'major_office', estimatedHeadcount: 3_000   },
      { companyKey: 'apple',     displayName: 'Apple (Boston hub)',      presenceMode: 'satellite',    estimatedHeadcount: 1_000   },
      { companyKey: 'microsoft', displayName: 'Microsoft (Boston)',      presenceMode: 'satellite',    estimatedHeadcount: 800     },
      { companyKey: 'hubspot',   displayName: 'HubSpot (HQ)',            presenceMode: 'hq',           estimatedHeadcount: 2_500   },
      { companyKey: 'wayfair',   displayName: 'Wayfair (HQ)',            presenceMode: 'hq',           estimatedHeadcount: 4_000   },
      { companyKey: 'tiktok',    displayName: 'TikTok (Boston)',         presenceMode: 'satellite',    estimatedHeadcount: 500     },
    ],
  },

  // ── Los Angeles (CA) ───────────────────────────────────────────────────────
  // Snap, entertainment tech, gaming. Lower density than Bay Area.
  {
    metroName: 'Los Angeles',
    aliases: [
      'los angeles', 'la', 'santa monica', 'culver city', 'el segundo',
      'burbank', 'hollywood', 'venice ca', 'playa vista',
    ],
    region: 'US',
    concentrationScore: 0.58,
    dominantCompanies: [
      { companyKey: 'snap',      displayName: 'Snap (HQ)',               presenceMode: 'hq',           estimatedHeadcount: 4_000   },
      { companyKey: 'tiktok',    displayName: 'TikTok (Culver City)',    presenceMode: 'major_office', estimatedHeadcount: 3_000   },
      { companyKey: 'netflix',   displayName: 'Netflix (Hollywood)',     presenceMode: 'major_office', estimatedHeadcount: 3_000   },
      { companyKey: 'spacex',    displayName: 'SpaceX (HQ)',             presenceMode: 'hq',           estimatedHeadcount: 10_000  },
      { companyKey: 'google',    displayName: 'Google LA',               presenceMode: 'satellite',    estimatedHeadcount: 1_500   },
      { companyKey: 'amazon',    displayName: 'Amazon (LA)',             presenceMode: 'satellite',    estimatedHeadcount: 1_000   },
      { companyKey: 'microsoft', displayName: 'Microsoft (LA)',          presenceMode: 'satellite',    estimatedHeadcount: 600     },
    ],
  },

  // ── Denver-Boulder (CO) ────────────────────────────────────────────────────
  {
    metroName: 'Denver-Boulder',
    aliases: [
      'denver', 'boulder', 'boulder co', 'denver co', 'aurora co',
      'broomfield', 'westminster co', 'centennial co',
    ],
    region: 'US',
    concentrationScore: 0.50,
    dominantCompanies: [
      { companyKey: 'google',     displayName: 'Google (Boulder)',        presenceMode: 'major_office', estimatedHeadcount: 1_500   },
      { companyKey: 'amazon',     displayName: 'Amazon (Denver)',         presenceMode: 'satellite',    estimatedHeadcount: 1_000   },
      { companyKey: 'salesforce', displayName: 'Salesforce (Denver)',     presenceMode: 'satellite',    estimatedHeadcount: 800     },
      { companyKey: 'twilio',     displayName: 'Twilio (Denver)',         presenceMode: 'satellite',    estimatedHeadcount: 600     },
      { companyKey: 'microsoft',  displayName: 'Microsoft (Denver)',      presenceMode: 'satellite',    estimatedHeadcount: 500     },
    ],
  },

  // ── Raleigh-Durham (NC / Research Triangle) ───────────────────────────────
  {
    metroName: 'Raleigh-Durham',
    aliases: [
      'raleigh', 'durham', 'chapel hill', 'rtp', 'research triangle',
      'cary nc', 'morrisville nc',
    ],
    region: 'US',
    concentrationScore: 0.48,
    dominantCompanies: [
      { companyKey: 'ibm',       displayName: 'IBM (RTP)',               presenceMode: 'major_office', estimatedHeadcount: 4_000   },
      { companyKey: 'cisco',     displayName: 'Cisco (RTP)',             presenceMode: 'major_office', estimatedHeadcount: 2_000   },
      { companyKey: 'red hat',   displayName: 'Red Hat / IBM',           presenceMode: 'hq',           estimatedHeadcount: 3_500   },
      { companyKey: 'apple',     displayName: 'Apple (RTP campus)',      presenceMode: 'major_office', estimatedHeadcount: 3_000   },
      { companyKey: 'google',    displayName: 'Google (RTP)',            presenceMode: 'satellite',    estimatedHeadcount: 700     },
    ],
  },

  // ── Chicago (IL) ──────────────────────────────────────────────────────────
  {
    metroName: 'Chicago',
    aliases: [
      'chicago', 'chicago il', 'chicago illinois', 'evanston', 'skokie', 'oak park il',
    ],
    region: 'US',
    concentrationScore: 0.45,
    dominantCompanies: [
      { companyKey: 'amazon',    displayName: 'Amazon (Chicago)',        presenceMode: 'major_office', estimatedHeadcount: 3_000   },
      { companyKey: 'google',    displayName: 'Google (Chicago)',        presenceMode: 'major_office', estimatedHeadcount: 2_000   },
      { companyKey: 'microsoft', displayName: 'Microsoft (Chicago)',     presenceMode: 'satellite',    estimatedHeadcount: 800     },
      { companyKey: 'salesforce',displayName: 'Salesforce (Chicago)',    presenceMode: 'satellite',    estimatedHeadcount: 700     },
      { companyKey: 'grubhub',   displayName: 'Grubhub (HQ)',            presenceMode: 'hq',           estimatedHeadcount: 1_500   },
    ],
  },

  // ── London ────────────────────────────────────────────────────────────────
  // Europe's largest tech cluster. US hyperscalers + UK FinTech unicorns.
  // Amazon, Google, Meta, Microsoft all have major EU/EMEA operations here.
  // DeepMind HQ. Revolut, Monzo, Wayve are native London-domiciled companies.
  {
    metroName: 'London',
    aliases: [
      'london', 'uk london', 'greater london', 'london uk', 'canary wharf',
      'shoreditch', 'kings cross london', 'london england',
    ],
    region: 'GB',
    concentrationScore: 0.82,
    dominantCompanies: [
      { companyKey: 'amazon',    displayName: 'Amazon UK (HQ)',          presenceMode: 'major_office', estimatedHeadcount: 8_000   },
      { companyKey: 'google',    displayName: 'Google UK (HQ)',          presenceMode: 'major_office', estimatedHeadcount: 14_000  },
      { companyKey: 'meta',      displayName: 'Meta UK',                 presenceMode: 'major_office', estimatedHeadcount: 6_000   },
      { companyKey: 'microsoft', displayName: 'Microsoft UK',            presenceMode: 'major_office', estimatedHeadcount: 3_000   },
      { companyKey: 'deepmind',  displayName: 'DeepMind (HQ)',           presenceMode: 'hq',           estimatedHeadcount: 1_800   },
      { companyKey: 'revolut',   displayName: 'Revolut (HQ)',            presenceMode: 'hq',           estimatedHeadcount: 4_000   },
      { companyKey: 'monzo',     displayName: 'Monzo (HQ)',              presenceMode: 'hq',           estimatedHeadcount: 2_500   },
      { companyKey: 'wayve',     displayName: 'Wayve (HQ)',              presenceMode: 'hq',           estimatedHeadcount: 800     },
      { companyKey: 'deliveroo', displayName: 'Deliveroo (HQ)',          presenceMode: 'hq',           estimatedHeadcount: 2_000   },
      { companyKey: 'wise',      displayName: 'Wise (HQ)',               presenceMode: 'hq',           estimatedHeadcount: 3_500   },
    ],
  },

  // ── Berlin ────────────────────────────────────────────────────────────────
  // Germany's startup capital. Zalando, Delivery Hero, HelloFresh are
  // Berlin-native hyperscalers. N26, SumUp dominate EU FinTech. Auto1 in mobility.
  {
    metroName: 'Berlin',
    aliases: [
      'berlin', 'berlin de', 'berlin germany', 'mitte', 'kreuzberg', 'prenzlauer berg',
    ],
    region: 'DE',
    concentrationScore: 0.68,
    dominantCompanies: [
      { companyKey: 'zalando',         displayName: 'Zalando (HQ)',          presenceMode: 'hq',           estimatedHeadcount: 7_000   },
      { companyKey: 'delivery hero',   displayName: 'Delivery Hero (HQ)',    presenceMode: 'hq',           estimatedHeadcount: 4_000   },
      { companyKey: 'hellofresh',      displayName: 'HelloFresh (HQ)',       presenceMode: 'hq',           estimatedHeadcount: 3_500   },
      { companyKey: 'sumup',           displayName: 'SumUp (HQ)',            presenceMode: 'hq',           estimatedHeadcount: 2_500   },
      { companyKey: 'auto1',           displayName: 'Auto1 Group (HQ)',      presenceMode: 'hq',           estimatedHeadcount: 3_000   },
      { companyKey: 'n26',             displayName: 'N26 (HQ)',              presenceMode: 'hq',           estimatedHeadcount: 1_500   },
      { companyKey: 'soundcloud',      displayName: 'SoundCloud (HQ)',       presenceMode: 'hq',           estimatedHeadcount: 600     },
      { companyKey: 'gorillas',        displayName: 'Gorillas / Getir',      presenceMode: 'hq',           estimatedHeadcount: 800     },
    ],
  },

  // ── Singapore ─────────────────────────────────────────────────────────────
  // APAC's highest-density tech cluster. Grab, Sea Limited, Gojek anchor the
  // Southeast Asian superapp ecosystem. Government AISG program subsidizes
  // enterprise AI adoption. High concentration of GCC regional HQs.
  {
    metroName: 'Singapore',
    aliases: [
      'singapore', 'sg', 'singapore city', 'raffles place', 'one north', 'jurong',
    ],
    region: 'SG',
    concentrationScore: 0.88,
    dominantCompanies: [
      { companyKey: 'grab',          displayName: 'Grab (HQ)',             presenceMode: 'hq',           estimatedHeadcount: 8_000   },
      { companyKey: 'sea limited',   displayName: 'Sea Limited (HQ)',      presenceMode: 'hq',           estimatedHeadcount: 10_000  },
      { companyKey: 'shopee',        displayName: 'Shopee (HQ)',           presenceMode: 'hq',           estimatedHeadcount: 5_000   },
      { companyKey: 'lazada',        displayName: 'Lazada (HQ)',           presenceMode: 'hq',           estimatedHeadcount: 3_000   },
      { companyKey: 'gojek',         displayName: 'Gojek SG',             presenceMode: 'major_office', estimatedHeadcount: 1_500   },
      { companyKey: 'razer',         displayName: 'Razer (HQ)',            presenceMode: 'hq',           estimatedHeadcount: 2_000   },
      { companyKey: 'propertyguru',  displayName: 'PropertyGuru (HQ)',     presenceMode: 'hq',           estimatedHeadcount: 1_500   },
      { companyKey: 'google',        displayName: 'Google Singapore',      presenceMode: 'major_office', estimatedHeadcount: 2_500   },
      { companyKey: 'meta',          displayName: 'Meta Singapore',        presenceMode: 'major_office', estimatedHeadcount: 2_000   },
      { companyKey: 'amazon',        displayName: 'Amazon Singapore',      presenceMode: 'major_office', estimatedHeadcount: 3_000   },
      { companyKey: 'microsoft',     displayName: 'Microsoft Singapore',   presenceMode: 'major_office', estimatedHeadcount: 2_000   },
    ],
  },
];

// ── Metro resolution utilities ────────────────────────────────────────────────

/** Resolve a user-provided city string to a TechClusterMetro, or null if no match. */
export function resolveMetro(city: string | null | undefined): TechClusterMetro | null {
  if (!city) return null;
  const normalized = city.toLowerCase().trim();
  for (const metro of TECH_CLUSTER_METROS) {
    if (metro.aliases.some(
      a => normalized === a || normalized.startsWith(a) || a.startsWith(normalized.split(',')[0].trim()),
    )) {
      return metro;
    }
  }
  return null;
}

// ── Geo cluster computation ───────────────────────────────────────────────────

export interface GeoClusterInfo {
  metroName: string;
  concentrationScore: number;       // 0–1 static tech density
  dominantCompanies: MetroCompany[];
  totalMetroTechHeadcount: number;  // estimated total local tech employees (ESTIMATED)
}

/** Return metro cluster info for a city, or null if city not in any known cluster. */
export function getMetroInfo(city: string | null | undefined): GeoClusterInfo | null {
  const metro = resolveMetro(city);
  if (!metro) return null;
  const totalMetroTechHeadcount = metro.dominantCompanies.reduce(
    (s, c) => s + c.estimatedHeadcount, 0,
  );
  return {
    metroName: metro.metroName,
    concentrationScore: metro.concentrationScore,
    dominantCompanies: metro.dominantCompanies,
    totalMetroTechHeadcount,
  };
}
