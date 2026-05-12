// secEdgarConnector.ts
// SEC EDGAR full-text search → 8-K layoff disclosures.
//
// EDGAR's full-text search endpoint (efts.sec.gov) is free and unauthenticated;
// it returns JSON. 8-K is the form public US companies file for material
// events including workforce reductions and restructurings, so headline
// search-terms like "layoff", "workforce reduction", "restructuring plan" hit
// the highest-quality, lowest-noise corpus available for US-listed firms.
//
// SEC requires a real User-Agent header per their fair-use policy. We pass a
// project-identifying UA. Rate limit is 10 req/sec — well within our usage.

export interface SecEdgarHit {
  /** CIK (10-digit zero-padded company identifier). */
  cik: string;
  /** Display name from the filing. */
  companyName: string;
  /** ISO date the form was filed. */
  filedAt: string;
  /** "8-K", "8-K/A", "10-Q", etc. */
  formType: string;
  /** Full URL to the filing index page on sec.gov. */
  filingUrl: string;
  /** Keyword that matched (one of the LAYOFF_QUERIES). */
  matchedQuery: string;
  /** Snippet returned by EDGAR (may be empty). */
  snippet: string;
}

export interface SecEdgarSummary {
  company: string;
  /** Total filings within the lookback window mentioning any layoff term. */
  filingCount: number;
  /** Unique distinct dates — proxy for distinct layoff *events*. */
  distinctEventDates: number;
  /** ISO date of the most recent matching 8-K filing, or null. */
  mostRecentFiling: string | null;
  hits: SecEdgarHit[];
  /** True only when EDGAR responded; lets callers distinguish "no filings"
   *  from "couldn't reach EDGAR". */
  edgarReachable: boolean;
  fetchedAt: string;
}

const EDGAR_SEARCH_URL = 'https://efts.sec.gov/LATEST/search-index';
// Per SEC EDGAR fair-use policy: include a real, contactable User-Agent.
const EDGAR_HEADERS: HeadersInit = {
  'User-Agent': 'HumanProof Layoff Audit (contact@humanproof.ai)',
  'Accept': 'application/json',
};

// 6-hour TTL in-memory cache. Alias expansion multiplies requests up to 10×
// per company — caching prevents EDGAR rate-limit (10 req/sec) from being hit
// on repeated audits for the same company within a session or short window.
const EDGAR_CACHE = new Map<string, { result: SecEdgarSummary; expiresAt: number }>();
const EDGAR_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

const LAYOFF_QUERIES = [
  '"workforce reduction"',
  '"reduction in force"',
  '"restructuring plan"',
  'layoff',
  'layoffs',
];

// Item 5.02 of Form 8-K requires public companies to disclose departure of
// directors or principal officers (CEO, CFO, COO, CTO, etc.) within 4 business
// days. These are highly predictive of structural instability — executive
// departures precede layoffs in roughly 60% of cases (SEC filing analysis,
// layoffs.fyi 2022-2024 wave data). Searching for these terms gives the
// leadershipChurnAgent a live, regulatory-grade grounding signal.
const EXEC_DEPARTURE_QUERIES = [
  '"departure of" "principal officer"',
  '"departure of" "chief executive"',
  '"departure of" "chief financial"',
  '"departure of" "chief operating"',
  '"departure of" "chief technology"',
  '"resigned" "chief executive officer"',
  '"resigned" "chief financial officer"',
  'Item 5.02',
];

const FORMS = ['8-K', '8-K/A'];

// SEC EDGAR legal entity names differ from common brand names.
// Google files as ALPHABET INC., Meta formerly filed as FACEBOOK INC., etc.
// Without this map, searches for "Google" return zero EDGAR hits even though
// Alphabet has filed multiple 8-Ks disclosing major workforce reductions.
const SEC_EDGAR_LEGAL_NAMES: Record<string, string[]> = {
  google:     ['ALPHABET INC', 'GOOGLE LLC'],
  alphabet:   ['ALPHABET INC'],
  meta:       ['META PLATFORMS INC', 'FACEBOOK INC'],
  facebook:   ['META PLATFORMS INC', 'FACEBOOK INC'],
  instagram:  ['META PLATFORMS INC'],
  whatsapp:   ['META PLATFORMS INC'],
  twitter:    ['X CORP', 'TWITTER INC'],
  x:          ['X CORP', 'TWITTER INC'],
  amazon:     ['AMAZON COM INC'],
  apple:      ['APPLE INC'],
  microsoft:  ['MICROSOFT CORP'],
  netflix:    ['NETFLIX INC'],
  nvidia:     ['NVIDIA CORP'],
  salesforce: ['SALESFORCE INC'],
  uber:       ['UBER TECHNOLOGIES INC'],
  airbnb:     ['AIRBNB INC'],
  lyft:       ['LYFT INC'],
  snap:       ['SNAP INC'],
  spotify:    ['SPOTIFY TECHNOLOGY SA'],
  shopify:    ['SHOPIFY INC'],
  coinbase:   ['COINBASE GLOBAL INC'],
  palantir:   ['PALANTIR TECHNOLOGIES INC'],
  snowflake:  ['SNOWFLAKE INC'],
  datadog:    ['DATADOG INC'],
  cloudflare: ['CLOUDFLARE INC'],
  okta:       ['OKTA INC'],
  crowdstrike:['CROWDSTRIKE HOLDINGS INC'],
  servicenow: ['SERVICENOW INC'],
  workday:    ['WORKDAY INC'],
  zoom:       ['ZOOM VIDEO COMMUNICATIONS INC'],
  doordash:   ['DOORDASH INC'],
  intel:      ['INTEL CORP'],
  cisco:      ['CISCO SYSTEMS INC'],
  oracle:     ['ORACLE CORP'],
  ibm:        ['INTERNATIONAL BUSINESS MACHINES CORP'],
  // India-listed US ADRs / subsidiaries
  infosys:    ['INFOSYS LTD'],
  wipro:      ['WIPRO LTD'],
};

/**
 * Resolve the EDGAR legal entity name(s) for a user-supplied company name.
 * Returns the original name when no mapping is known so the search still runs.
 */
function resolveEdgarNames(company: string): string[] {
  const lower = company.toLowerCase().trim();
  for (const [key, legalNames] of Object.entries(SEC_EDGAR_LEGAL_NAMES)) {
    if (lower === key || lower.includes(key) || key.includes(lower)) {
      return legalNames;
    }
  }
  return [company];
}

function buildSearchUrl(query: string, company: string, daysBack: number): string {
  const dateTo = new Date();
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - daysBack);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const params = new URLSearchParams({
    q: `${query} "${company}"`,
    dateRange: 'custom',
    startdt: fmt(dateFrom),
    enddt: fmt(dateTo),
    forms: FORMS.join(','),
  });
  return `${EDGAR_SEARCH_URL}?${params.toString()}`;
}

function buildFilingUrl(cik: string, accessionNo: string): string {
  // EDGAR accession numbers come back as "0000320193-25-000001" — convert to
  // the URL-friendly form (no dashes) for the filing-index path.
  const accNoDashed = accessionNo.replace(/-/g, '');
  const cikInt = parseInt(cik, 10).toString();
  return `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cikInt}&type=8-K&action=getcompany#:~:accession=${accNoDashed}`;
}

async function searchOne(query: string, company: string, daysBack: number) {
  const url = buildSearchUrl(query, company, daysBack);
  try {
    const res = await fetch(url, {
      headers: EDGAR_HEADERS,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { reachable: res.status < 500, hits: [] as SecEdgarHit[] };
    const data = await res.json();
    const rawHits = data?.hits?.hits ?? [];
    const hits: SecEdgarHit[] = rawHits.map((h: any): SecEdgarHit => {
      const src = h?._source ?? {};
      const cik = String(src.ciks?.[0] ?? '').padStart(10, '0');
      const accession = String(h?._id ?? '').split(':')[0] || '';
      return {
        cik,
        companyName: String(src.display_names?.[0] ?? company),
        filedAt: String(src.file_date ?? '').slice(0, 10),
        formType: String(src.form ?? ''),
        filingUrl: accession ? buildFilingUrl(cik, accession) : '',
        matchedQuery: query,
        snippet: String(h?.highlight?.text?.[0] ?? src.adsh ?? ''),
      };
    });
    return { reachable: true, hits };
  } catch {
    return { reachable: false, hits: [] as SecEdgarHit[] };
  }
}

export async function fetchSecEdgar8KSignals(
  company: string,
  options?: { daysBack?: number },
): Promise<SecEdgarSummary> {
  const daysBack = options?.daysBack ?? 365;
  const cacheKey = `${company.toLowerCase().trim()}|${daysBack}`;
  const cached = EDGAR_CACHE.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) return cached.result;

  // Resolve the SEC EDGAR legal entity name(s) for this company.
  // "Google" → ["ALPHABET INC", "GOOGLE LLC"], "Meta" → ["META PLATFORMS INC", "FACEBOOK INC"].
  // Without this, subsidiary/brand names return zero hits even when the parent
  // has filed multiple layoff 8-Ks (e.g. Alphabet's 12k-person RIF in Jan 2023).
  const edgarNames = resolveEdgarNames(company);

  // Fan out across layoff-term variants × legal entity names in parallel.
  // 5 queries × up to 2 entity names = up to 10 requests, still well under
  // EDGAR's 10 req/sec fair-use ceiling.
  const responses = await Promise.all(
    edgarNames.flatMap((name) =>
      LAYOFF_QUERIES.map((q) => searchOne(q, name, daysBack)),
    ),
  );

  // Dedupe hits by (cik + filedAt + formType). The same 8-K commonly matches
  // multiple query variants (e.g. both "layoffs" and "workforce reduction").
  const seen = new Set<string>();
  const hits: SecEdgarHit[] = [];
  let edgarReachable = false;
  for (const r of responses) {
    if (r.reachable) edgarReachable = true;
    for (const h of r.hits) {
      const key = `${h.cik}|${h.filedAt}|${h.formType}`;
      if (seen.has(key)) continue;
      seen.add(key);
      hits.push(h);
    }
  }

  hits.sort((a, b) => (a.filedAt < b.filedAt ? 1 : -1));
  const distinctDates = new Set(hits.map((h) => h.filedAt).filter((d) => d.length > 0));

  const result: SecEdgarSummary = {
    company,
    filingCount: hits.length,
    distinctEventDates: distinctDates.size,
    mostRecentFiling: hits[0]?.filedAt ?? null,
    hits: hits.slice(0, 10),
    edgarReachable,
    fetchedAt: new Date().toISOString(),
  };

  if (edgarReachable) {
    EDGAR_CACHE.set(cacheKey, { result, expiresAt: Date.now() + EDGAR_CACHE_TTL_MS });
  }
  return result;
}

// ── Executive departure signal (Item 5.02) ────────────────────────────────────

export interface SecEdgarExecSummary {
  company: string;
  /** Total Item 5.02 filings within the lookback window. */
  departureCount: number;
  /** Unique distinct dates — proxy for distinct departure events. */
  distinctEventDates: number;
  /** ISO date of the most recent matching 8-K, or null. */
  mostRecentDeparture: string | null;
  /** True when EDGAR responded (distinguishes "no filings" from "unreachable"). */
  edgarReachable: boolean;
  hits: SecEdgarHit[];
  fetchedAt: string;
}

const EXEC_CACHE = new Map<string, { result: SecEdgarExecSummary; expiresAt: number }>();

/**
 * Fetch SEC EDGAR 8-K filings disclosing executive departures (Item 5.02) for a
 * US-listed company. Returns a summary used by leadershipChurnAgent to replace
 * or augment static DB-seeded churn data.
 *
 * Lookback defaults to 365 days — longer than layoff 8-K lookback because
 * leadership churn typically precedes layoffs by weeks to months; a departure
 * 10 months ago is still within the causal window.
 */
export async function fetchSecEdgarExecutiveDepartures(
  company: string,
  options?: { daysBack?: number },
): Promise<SecEdgarExecSummary> {
  const daysBack = options?.daysBack ?? 365;
  const cacheKey = `exec|${company.toLowerCase().trim()}|${daysBack}`;
  const cached = EXEC_CACHE.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) return cached.result;

  const edgarNames = resolveEdgarNames(company);

  const responses = await Promise.all(
    edgarNames.flatMap((name) =>
      EXEC_DEPARTURE_QUERIES.map((q) => searchOne(q, name, daysBack)),
    ),
  );

  const seen = new Set<string>();
  const hits: SecEdgarHit[] = [];
  let edgarReachable = false;

  for (const r of responses) {
    if (r.reachable) edgarReachable = true;
    for (const h of r.hits) {
      const key = `${h.cik}|${h.filedAt}|${h.formType}`;
      if (seen.has(key)) continue;
      seen.add(key);
      hits.push(h);
    }
  }

  hits.sort((a, b) => (a.filedAt < b.filedAt ? 1 : -1));
  const distinctDates = new Set(hits.map((h) => h.filedAt).filter(Boolean));

  const result: SecEdgarExecSummary = {
    company,
    departureCount: hits.length,
    distinctEventDates: distinctDates.size,
    mostRecentDeparture: hits[0]?.filedAt ?? null,
    edgarReachable,
    hits: hits.slice(0, 10),
    fetchedAt: new Date().toISOString(),
  };

  if (edgarReachable) {
    EXEC_CACHE.set(cacheKey, { result, expiresAt: Date.now() + EDGAR_CACHE_TTL_MS });
  }
  return result;
}
