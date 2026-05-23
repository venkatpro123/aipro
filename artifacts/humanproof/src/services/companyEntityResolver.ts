// companyEntityResolver.ts
// Canonical entity resolution for the live-first audit pipeline.
//
// Consolidates three previously-scattered pieces of data into one resolver:
//   1. TICKER_MAP    (was inlined in liveDataService.ts:413–515)
//   2. COMPANY_ALIASES (was added in proxy-live-signals/index.ts in v31)
//   3. NEW: subsidiary graph (Infosys → Infosys BPM, Alphabet ↔ Google)
//
// The resolver is the FIRST stage of the v32 pipeline (Stage A: Identity
// Resolution). Every downstream signal acquisition uses the resolved entity:
//   - Yahoo Finance reads `ticker`
//   - Wikipedia + RSS news read `aliases` (for alias-aware matching)
//   - SEC EDGAR reads `cik`
//   - Scraper-enqueue auto-discovers slugs when not provided
//
// The graph is intentionally small (≈80 high-value entries). Long-tail
// resolution falls back to fuzzy name matching against the company_intelligence
// table; this resolver only encodes the high-value canonicalizations that
// must not depend on the DB.

export type Region = 'US' | 'IN' | 'EU' | 'APAC' | 'LATAM' | 'MEA' | 'GLOBAL';

/**
 * Regulatory filing regime for privately-held companies.
 * Each value represents a structurally distinct data-availability ceiling
 * driven by local corporate disclosure law — NOT a company-specific quality
 * judgement. Used to select the correct quorum spec and apply the correct
 * confidence ceiling + disclosure string.
 *
 * Regime → ceiling rationale:
 *   german_gmbh        0.55  Handelsregister basic info only. Bundesanzeiger annual
 *                            accounts have up to 12-month filing lag. No WARN Act
 *                            equivalent in Germany (Betriebsverfassungsgesetz requires
 *                            only internal works-council consultation — no public filing).
 *   uk_private_ltd     0.60  Companies House annual accounts required (9-month filing
 *                            deadline after year-end). Filing exists but is not
 *                            real-time; no stock-exchange disclosure required.
 *   india_unlisted_pvt 0.52  MCA21 annual return only. No NSE/BSE disclosure.
 *                            Companies below INR 500Cr revenue have no mandatory
 *                            public financial filing beyond basic MCA forms.
 *   us_private         0.65  No SEC EDGAR or 10-K. WARN Act applies only when
 *                            ≥100 employees; many private companies file no
 *                            advance notice for workforce reductions.
 *   apac_private       0.58  SG Pte Ltd (ACRA annual return — filing exists but
 *                            limited financial detail). AU Pty Ltd (ASIC similar).
 *   eu_other_private   0.58  FR SARL / NL BV / BE BVBA — national registries have
 *                            annual accounts, quality varies significantly by country.
 */
export type PrivateCompanyRegime =
  | 'german_gmbh'
  | 'uk_private_ltd'
  | 'india_unlisted_pvt'
  | 'us_private'
  | 'apac_private'
  | 'eu_other_private';

export interface EntityRecord {
  /** Canonical lowercase name used as the resolver's primary key. */
  canonical: string;
  /** Display name (Title Case). */
  displayName: string;
  /** All known names (lowercase) that map to this entity. INCLUDES canonical. */
  aliases: string[];
  /** Yahoo Finance ticker (or null when private / unknown). 'N/A' tickers from
   *  the prior TICKER_MAP are normalized to null here. */
  ticker: string | null;
  /** SEC Central Index Key — populated for US public companies. */
  cik: string | null;
  /** ISO 3166-alpha2 region code (best effort). */
  region: Region;
  /** Coarse industry label aligned with industryRiskData. */
  industry: string | null;
  /** Lowercase parent company canonical name, if this entity is a subsidiary. */
  parent: string | null;
  /** Canonical names of known subsidiaries. */
  subsidiaries: string[];
  /** When true, the entity is privately held — never attempt ticker fetches. */
  isPrivate: boolean;
}

// ── Entity graph ────────────────────────────────────────────────────────────
// Keys are canonical lowercase names. Aliases include common abbreviations,
// ticker tokens (when distinct from the canonical), and subsidiary names.
const ENTITIES: Record<string, EntityRecord> = {
  // ── US Big Tech ──
  'alphabet': {
    canonical: 'alphabet', displayName: 'Alphabet Inc.',
    aliases: ['alphabet', 'alphabet inc', 'google', 'googl', 'goog'],
    ticker: 'GOOGL', cik: '0001652044', region: 'US', industry: 'Technology',
    parent: null, subsidiaries: ['google', 'youtube', 'waymo', 'deepmind'], isPrivate: false,
  },
  'google': {
    canonical: 'google', displayName: 'Google',
    aliases: ['google', 'google inc', 'google llc'],
    ticker: 'GOOGL', cik: '0001652044', region: 'US', industry: 'Technology',
    parent: 'alphabet', subsidiaries: [], isPrivate: false,
  },
  'meta': {
    canonical: 'meta', displayName: 'Meta Platforms',
    aliases: ['meta', 'meta platforms', 'facebook', 'fb'],
    ticker: 'META', cik: '0001326801', region: 'US', industry: 'Technology',
    parent: null, subsidiaries: ['instagram', 'whatsapp'], isPrivate: false,
  },
  'microsoft': {
    canonical: 'microsoft', displayName: 'Microsoft',
    aliases: ['microsoft', 'msft', 'microsoft corporation'],
    ticker: 'MSFT', cik: '0000789019', region: 'US', industry: 'Technology',
    parent: null, subsidiaries: ['linkedin', 'github'], isPrivate: false,
  },
  'amazon': {
    canonical: 'amazon', displayName: 'Amazon',
    aliases: ['amazon', 'amzn', 'amazon.com', 'amazon web services', 'aws'],
    ticker: 'AMZN', cik: '0001018724', region: 'US', industry: 'E-commerce',
    parent: null, subsidiaries: ['twitch', 'mgm'], isPrivate: false,
  },
  'apple': {
    canonical: 'apple', displayName: 'Apple',
    aliases: ['apple', 'aapl', 'apple inc'],
    ticker: 'AAPL', cik: '0000320193', region: 'US', industry: 'Technology',
    parent: null, subsidiaries: [], isPrivate: false,
  },
  'netflix': {
    canonical: 'netflix', displayName: 'Netflix',
    aliases: ['netflix', 'nflx'],
    ticker: 'NFLX', cik: '0001065280', region: 'US', industry: 'Media',
    parent: null, subsidiaries: [], isPrivate: false,
  },
  'oracle': {
    canonical: 'oracle', displayName: 'Oracle Corporation',
    aliases: ['oracle', 'orcl', 'oracle corporation', 'oracle corp', 'oracle india'],
    ticker: 'ORCL', cik: '0001341439', region: 'US', industry: 'Technology',
    parent: null, subsidiaries: ['netsuite'], isPrivate: false,
  },
  'salesforce': {
    canonical: 'salesforce', displayName: 'Salesforce',
    aliases: ['salesforce', 'crm', 'salesforce.com'],
    ticker: 'CRM', cik: '0001108524', region: 'US', industry: 'Technology',
    parent: null, subsidiaries: ['slack', 'tableau', 'mulesoft'], isPrivate: false,
  },
  'ibm': {
    canonical: 'ibm', displayName: 'IBM',
    aliases: ['ibm', 'international business machines', 'ibm corporation'],
    ticker: 'IBM', cik: '0000051143', region: 'US', industry: 'Technology',
    parent: null, subsidiaries: ['red hat'], isPrivate: false,
  },
  'intel': {
    canonical: 'intel', displayName: 'Intel',
    aliases: ['intel', 'intc', 'intel corporation'],
    ticker: 'INTC', cik: '0000050863', region: 'US', industry: 'Technology',
    parent: null, subsidiaries: [], isPrivate: false,
  },
  'nvidia': {
    canonical: 'nvidia', displayName: 'NVIDIA',
    aliases: ['nvidia', 'nvda'],
    ticker: 'NVDA', cik: '0001045810', region: 'US', industry: 'Technology',
    parent: null, subsidiaries: [], isPrivate: false,
  },
  'amd': {
    canonical: 'amd', displayName: 'AMD',
    aliases: ['amd', 'advanced micro devices'],
    ticker: 'AMD', cik: '0000002488', region: 'US', industry: 'Technology',
    parent: null, subsidiaries: [], isPrivate: false,
  },
  'tesla': {
    canonical: 'tesla', displayName: 'Tesla',
    aliases: ['tesla', 'tsla'],
    ticker: 'TSLA', cik: '0001318605', region: 'US', industry: 'Manufacturing',
    parent: null, subsidiaries: [], isPrivate: false,
  },

  // ── US Tech subsidiaries ──
  'linkedin': {
    canonical: 'linkedin', displayName: 'LinkedIn',
    aliases: ['linkedin'],
    ticker: 'MSFT', cik: null, region: 'US', industry: 'Technology',
    parent: 'microsoft', subsidiaries: [], isPrivate: false,
  },
  'github': {
    canonical: 'github', displayName: 'GitHub',
    aliases: ['github'],
    ticker: 'MSFT', cik: null, region: 'US', industry: 'Technology',
    parent: 'microsoft', subsidiaries: [], isPrivate: false,
  },
  'slack': {
    canonical: 'slack', displayName: 'Slack',
    aliases: ['slack'],
    ticker: 'CRM', cik: null, region: 'US', industry: 'Technology',
    parent: 'salesforce', subsidiaries: [], isPrivate: false,
  },
  'instagram': {
    canonical: 'instagram', displayName: 'Instagram',
    aliases: ['instagram', 'ig'],
    ticker: 'META', cik: null, region: 'US', industry: 'Technology',
    parent: 'meta', subsidiaries: [], isPrivate: false,
  },
  'youtube': {
    canonical: 'youtube', displayName: 'YouTube',
    aliases: ['youtube'],
    ticker: 'GOOGL', cik: null, region: 'US', industry: 'Media',
    parent: 'alphabet', subsidiaries: [], isPrivate: false,
  },
  'red hat': {
    canonical: 'red hat', displayName: 'Red Hat',
    aliases: ['red hat', 'redhat'],
    ticker: 'IBM', cik: null, region: 'US', industry: 'Technology',
    parent: 'ibm', subsidiaries: [], isPrivate: false,
  },

  // ── India IT Services giants ──
  'tata consultancy services': {
    canonical: 'tata consultancy services', displayName: 'Tata Consultancy Services',
    aliases: ['tata consultancy services', 'tata consultancy', 'tcs', 'tata cs'],
    ticker: 'TCS.NS', cik: null, region: 'IN', industry: 'IT Services',
    parent: 'tata group', subsidiaries: [], isPrivate: false,
  },
  'infosys': {
    canonical: 'infosys', displayName: 'Infosys',
    aliases: ['infosys', 'infy', 'infosys limited', 'infosys ltd'],
    ticker: 'INFY', cik: null, region: 'IN', industry: 'IT Services',
    parent: null, subsidiaries: ['infosys bpm', 'edgeverve'], isPrivate: false,
  },
  'infosys bpm': {
    canonical: 'infosys bpm', displayName: 'Infosys BPM',
    aliases: ['infosys bpm', 'infosys business process management'],
    ticker: 'INFY', cik: null, region: 'IN', industry: 'IT Services',
    parent: 'infosys', subsidiaries: [], isPrivate: false,
  },
  'wipro': {
    canonical: 'wipro', displayName: 'Wipro',
    aliases: ['wipro', 'wit', 'wipro limited', 'wipro ltd'],
    ticker: 'WIT', cik: null, region: 'IN', industry: 'IT Services',
    parent: null, subsidiaries: [], isPrivate: false,
  },
  'hcl technologies': {
    canonical: 'hcl technologies', displayName: 'HCL Technologies',
    aliases: ['hcl technologies', 'hcl', 'hcltech', 'hcl tech'],
    ticker: 'HCLTECH.NS', cik: null, region: 'IN', industry: 'IT Services',
    parent: null, subsidiaries: [], isPrivate: false,
  },
  'tech mahindra': {
    canonical: 'tech mahindra', displayName: 'Tech Mahindra',
    aliases: ['tech mahindra', 'techm', 'tech m'],
    ticker: 'TECHM.NS', cik: null, region: 'IN', industry: 'IT Services',
    parent: null, subsidiaries: [], isPrivate: false,
  },
  'ltimindtree': {
    canonical: 'ltimindtree', displayName: 'LTIMindtree',
    aliases: ['ltimindtree', 'ltim', 'lti mindtree', 'lti', 'mindtree'],
    ticker: 'LTIM.NS', cik: null, region: 'IN', industry: 'IT Services',
    parent: null, subsidiaries: [], isPrivate: false,
  },
  'cognizant': {
    canonical: 'cognizant', displayName: 'Cognizant',
    aliases: ['cognizant', 'cognizant technology solutions', 'ctsh'],
    ticker: 'CTSH', cik: null, region: 'US', industry: 'IT Services',
    parent: null, subsidiaries: [], isPrivate: false,
  },
  'accenture': {
    canonical: 'accenture', displayName: 'Accenture',
    aliases: ['accenture', 'accenture plc', 'acn'],
    ticker: 'ACN', cik: null, region: 'GLOBAL', industry: 'IT Services',
    parent: null, subsidiaries: [], isPrivate: false,
  },
  'capgemini': {
    canonical: 'capgemini', displayName: 'Capgemini',
    aliases: ['capgemini', 'capgemini se', 'capg'],
    ticker: 'CAPMF', cik: null, region: 'EU', industry: 'IT Services',
    parent: null, subsidiaries: [], isPrivate: false,
  },

  // ── India Banking & Fintech ──
  'hdfc bank': {
    canonical: 'hdfc bank', displayName: 'HDFC Bank',
    aliases: ['hdfc bank', 'hdfc'],
    ticker: 'HDFCBANK.NS', cik: null, region: 'IN', industry: 'Banking',
    parent: null, subsidiaries: [], isPrivate: false,
  },
  'icici bank': {
    canonical: 'icici bank', displayName: 'ICICI Bank',
    aliases: ['icici bank', 'icici'],
    ticker: 'ICICIBANK.NS', cik: null, region: 'IN', industry: 'Banking',
    parent: null, subsidiaries: [], isPrivate: false,
  },
  'axis bank': {
    canonical: 'axis bank', displayName: 'Axis Bank',
    aliases: ['axis bank', 'axis'],
    ticker: 'AXISBANK.NS', cik: null, region: 'IN', industry: 'Banking',
    parent: null, subsidiaries: [], isPrivate: false,
  },
  'state bank of india': {
    canonical: 'state bank of india', displayName: 'State Bank of India',
    aliases: ['state bank of india', 'sbi', 'state bank'],
    ticker: 'SBIN.NS', cik: null, region: 'IN', industry: 'Banking',
    parent: null, subsidiaries: [], isPrivate: false,
  },
  'kotak mahindra bank': {
    canonical: 'kotak mahindra bank', displayName: 'Kotak Mahindra Bank',
    aliases: ['kotak mahindra bank', 'kotak', 'kotak mahindra'],
    ticker: 'KOTAKBANK.NS', cik: null, region: 'IN', industry: 'Banking',
    parent: null, subsidiaries: [], isPrivate: false,
  },

  // ── Conglomerates ──
  'tata group': {
    canonical: 'tata group', displayName: 'Tata Group',
    aliases: ['tata group', 'tata sons', 'tata'],
    ticker: null, cik: null, region: 'IN', industry: 'Conglomerate',
    parent: null,
    subsidiaries: ['tata consultancy services'],
    isPrivate: true,
  },
  'reliance industries': {
    canonical: 'reliance industries', displayName: 'Reliance Industries',
    aliases: ['reliance industries', 'reliance', 'ril'],
    ticker: 'RELIANCE.NS', cik: null, region: 'IN', industry: 'Conglomerate',
    parent: null, subsidiaries: ['jio'], isPrivate: false,
  },
  'jio': {
    canonical: 'jio', displayName: 'Jio',
    aliases: ['jio', 'reliance jio'],
    ticker: 'RELIANCE.NS', cik: null, region: 'IN', industry: 'Technology',
    parent: 'reliance industries', subsidiaries: [], isPrivate: false,
  },

  // ── Known private (do NOT attempt ticker fetches) ──
  'stripe': {
    canonical: 'stripe', displayName: 'Stripe',
    aliases: ['stripe', 'stripe inc'],
    ticker: null, cik: null, region: 'US', industry: 'FinTech',
    parent: null, subsidiaries: [], isPrivate: true,
  },
  'anthropic': {
    canonical: 'anthropic', displayName: 'Anthropic',
    aliases: ['anthropic', 'anthropic pbc'],
    ticker: null, cik: null, region: 'US', industry: 'Technology',
    parent: null, subsidiaries: [], isPrivate: true,
  },
  'openai': {
    canonical: 'openai', displayName: 'OpenAI',
    aliases: ['openai'],
    ticker: null, cik: null, region: 'US', industry: 'Technology',
    parent: null, subsidiaries: [], isPrivate: true,
  },
};

// ── Reverse index: every alias → canonical name ──
// Built once at module load. Used by `resolveCompanyEntity` for O(1) lookup.
const ALIAS_TO_CANONICAL: Map<string, string> = (() => {
  const map = new Map<string, string>();
  for (const [canonical, record] of Object.entries(ENTITIES)) {
    map.set(canonical, canonical);
    for (const alias of record.aliases) {
      const key = alias.toLowerCase().trim();
      if (!map.has(key)) map.set(key, canonical);
    }
  }
  return map;
})();

const normalize = (raw: string): string =>
  raw.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[^a-z0-9& ]/g, '');

/**
 * Resolve a free-text company name to a canonical entity record. Returns null
 * when the name is not in the graph — caller should fall back to fuzzy matching
 * against company_intelligence (existing path in auditDataPipeline).
 */
export function resolveCompanyEntity(rawName: string): EntityRecord | null {
  if (!rawName) return null;
  const lower = normalize(rawName);
  if (!lower) return null;

  // Direct alias hit
  const direct = ALIAS_TO_CANONICAL.get(lower);
  if (direct) return ENTITIES[direct] ?? null;

  // Token-prefix fuzzy: try removing common suffix tokens
  const stripped = lower
    .replace(/\b(inc|incorporated|corp|corporation|ltd|limited|plc|llc|pvt|private|pte)\b\.?/g, '')
    .trim();
  if (stripped && stripped !== lower) {
    const hit = ALIAS_TO_CANONICAL.get(stripped);
    if (hit) return ENTITIES[hit] ?? null;
  }

  return null;
}

/**
 * Returns the full alias set for the canonical entity that matches `rawName`,
 * EXCLUDING the canonical name itself. Used by news-source matching and any
 * other code that needs to broaden a query (TCS news → also search "tata
 * consultancy services").
 *
 * Falls back to an empty array when the name isn't in the graph.
 */
export function aliasesForCompany(rawName: string): string[] {
  const entity = resolveCompanyEntity(rawName);
  if (!entity) return [];
  const lower = normalize(rawName);
  return entity.aliases.filter(a => a.toLowerCase() !== lower);
}

/**
 * Returns the canonical + alias names of any subsidiaries. Used by RSS news
 * matchers to catch announcements that name the subsidiary (e.g. "Infosys BPM
 * cuts 1500 roles") when the user typed the parent ("Infosys").
 */
export function subsidiaryNamesForCompany(rawName: string): string[] {
  const entity = resolveCompanyEntity(rawName);
  if (!entity) return [];
  const names: string[] = [];
  for (const subCanonical of entity.subsidiaries) {
    const sub = ENTITIES[subCanonical];
    if (sub) names.push(...sub.aliases);
  }
  return Array.from(new Set(names));
}

/**
 * Returns the union of canonical, aliases, and subsidiary names — the full
 * "intelligence graph" footprint for the entity. Used during Stage A to
 * pre-compute the search expansion for downstream signal acquisition.
 */
export function entityFootprint(rawName: string): string[] {
  const entity = resolveCompanyEntity(rawName);
  if (!entity) return [rawName.toLowerCase().trim()];
  return Array.from(new Set([
    ...entity.aliases,
    ...subsidiaryNamesForCompany(rawName),
  ]));
}

/** True when the company is privately held — caller should skip Yahoo Finance. */
export function isPrivateCompany(rawName: string): boolean {
  return resolveCompanyEntity(rawName)?.isPrivate === true;
}

/**
 * Detect the private-company regulatory regime from the company name.
 *
 * Resolution order:
 *   1. ENTITIES graph — if the company is known and public (isPrivate=false),
 *      returns null immediately (no regime applies).
 *   2. ENTITIES graph — if known and private, infers regime from region.
 *   3. Legal-suffix matching on the raw name (NOT the normalised form) —
 *      covers long-tail companies not in the entity graph.
 *
 * Returns null when the company is known-public OR when no private regime
 * can be detected from the name alone (unknown company, name without legal suffix).
 * The caller should treat null as "regime unknown — use DEFAULT_QUORUM_SPEC."
 */
export function detectPrivateCompanyRegime(rawName: string, countryHint?: string | null): PrivateCompanyRegime | null {
  if (!rawName) return null;

  // ── Step 1 & 2: entity graph lookup ────────────────────────────────────────
  const entity = resolveCompanyEntity(rawName);
  if (entity) {
    if (!entity.isPrivate) return null;  // known public, no regime
    // Infer regime from region for known private entities.
    switch (entity.region) {
      case 'IN':     return 'india_unlisted_pvt';
      case 'APAC':   return 'apac_private';
      case 'EU':     return 'eu_other_private';
      case 'US':
      case 'LATAM':
      case 'MEA':
      case 'GLOBAL': return 'us_private';
    }
  }

  // ── Step 3: legal-suffix heuristics on the raw name ────────────────────────
  const lower = rawName.toLowerCase();

  // German legal forms — unambiguous, always private unless AG listed on DAX/MDAX.
  // GmbH: Gesellschaft mit beschränkter Haftung (German LLC)
  // GmbH & Co. KG: common partnership structure
  // KGaA: Kommanditgesellschaft auf Aktien (rare, usually private)
  if (/\bgmbh\b|\bgmbh\s*&\s*co\.?\s*k\.?g\.?\b|\bkgaa\b/.test(lower)) {
    return 'german_gmbh';
  }

  // Indian private — suffix is distinctive and unambiguous.
  if (/\bpvt\.?\s*ltd\b|\bprivate\s+limited\b|\bpvt\s+limited\b/.test(lower)) {
    return 'india_unlisted_pvt';
  }

  // Singapore Pte Ltd / Australian Pty Ltd / Malaysian Sdn Bhd — APAC private.
  if (/\bpte\.?\s*ltd\b|\bpty\.?\s*ltd\b|\bsdn\.?\s*bhd\b/.test(lower)) {
    return 'apac_private';
  }

  // UK / Ireland private Ltd (but NOT PLC — PLC is public).
  // 'Ltd' or 'Limited' without 'plc' → private Ltd structure.
  // EXCEPTION: India (BSE/NSE), Australia (ASX), New Zealand, Canada (TSX) all
  // use "Limited" as a suffix for *listed* companies — not UK private structure.
  // Without a country hint we fall through to uk_private_ltd (conservative), but
  // when the caller supplies one of these countries we return null so the pipeline
  // uses the DEFAULT_QUORUM_SPEC instead of the 15s / 60%-capped private regime.
  if (/\bltd\b|\blimited\b/.test(lower) && !/\bplc\b/.test(lower)) {
    const LIMITED_LISTED_COUNTRIES = new Set(['IN', 'AU', 'NZ', 'CA']);
    if (countryHint && LIMITED_LISTED_COUNTRIES.has(countryHint.toUpperCase())) {
      return null;
    }
    return 'uk_private_ltd';
  }

  // Continental EU private forms.
  // SARL (FR), SRL (IT/RO), BV (NL), BVBA (BE), AB (SE — Aktiebolag).
  // NV (NL/BE) excluded — NVs are typically listed or large.
  if (/\bsarl\b|\bsrl\b|\bbv\b|\bbvba\b|\bsprl\b/.test(lower)) {
    return 'eu_other_private';
  }

  // US private legal forms — LLC, LP, or Inc/Corp without a known ticker.
  // Only apply when the entity resolver returned null (unknown company) to
  // avoid false-positives on e.g. "IBM Corporation".
  if (/\bllc\b|\bllp\b|\blp\b/.test(lower)) {
    return 'us_private';
  }

  return null;
}

/**
 * v40.0 alias — Task 4.1 unification.
 * `resolveEntity` is the public-facing name used by liveDataService and other
 * consumers. Delegates to `resolveCompanyEntity` which is the internal name.
 */
export const resolveEntity = resolveCompanyEntity;
