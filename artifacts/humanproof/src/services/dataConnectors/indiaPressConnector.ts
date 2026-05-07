// indiaPressConnector.ts
// Aggregates Indian business-press RSS feeds (moneycontrol, livemint, Inc42,
// YourStory, BS Tech). All feeds are public, no key required. Uses the
// rss2json.com proxy to bridge XML → JSON the same way rssNewsConnector does.
//
// Why a separate connector from rssNewsConnector?
//   rssNewsConnector covers Economic Times + Hacker News which biases toward
//   global tech. The Indian startup-and-listed-company press carries layoff
//   announcements that ET/HN miss (especially mid-cap IT services and Indian
//   SaaS). Keeping this connector independent makes its source list explicit
//   and easy to extend without polluting the global news pipeline.
//
// SEBI corporate announcements proper require an authenticated session against
// nseindia.com / bseindia.com — those endpoints set anti-bot cookies that
// browser fetch can't replay reliably. Until that's wired through a server-
// side proxy, the press feeds below are the best free-tier proxy for the same
// signal: they cover BSE/NSE filings minutes after disclosure.

export interface IndiaPressSignal {
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  layoffMentioned: boolean;
  companyMentioned: boolean;
  /** Approximate % cut parsed from the headline, when present. */
  percentCut: number | null;
}

export interface IndiaPressSummary {
  company: string;
  signals: IndiaPressSignal[];
  layoffSignalCount: number;
  /** -1 (very negative coverage) to +1 (positive). */
  sentimentScore: number;
  /** True if at least one feed responded. Distinguishes "no news" from "all
   *  feeds unreachable" — important for confidence labelling. */
  anyFeedReachable: boolean;
  sourcesUsed: string[];
  fetchedAt: string;
}

const RSS_PROXY = 'https://api.rss2json.com/v1/api.json?rss_url=';

const FEEDS: Record<string, string> = {
  moneycontrol: 'https://www.moneycontrol.com/rss/business.xml',
  livemintCompanies: 'https://www.livemint.com/rss/companies',
  inc42: 'https://inc42.com/feed/',
  yourStory: 'https://yourstory.com/feed',
  businessStandardTech: 'https://www.business-standard.com/rss/technology-108.rss',
};

const LAYOFF_KEYWORDS = [
  'layoff', 'laid off', 'lays off', 'fires', 'firing', 'job cut', 'job cuts',
  'retrenchment', 'retrench', 'headcount reduction', 'workforce reduction',
  'downsizing', 'redundancy', 'job loss', 'sacked', 'pink slip', 'rightsiz',
];

const NEGATIVE_KEYWORDS = [
  ...LAYOFF_KEYWORDS, 'loss', 'losses', 'decline', 'declines', 'plummet',
  'profit warning', 'bankruptcy', 'insolvency', 'shutdown', 'shuts down',
  'hiring freeze', 'restructure', 'restructuring', 'write-off', 'crisis',
];

const POSITIVE_KEYWORDS = [
  'growth', 'profit', 'profits', 'record', 'expansion', 'hire', 'hiring',
  'launch', 'partnership', 'acquired', 'funded', 'funding round', 'ipo',
];

async function fetchFeed(url: string): Promise<any[]> {
  try {
    const res = await fetch(`${RSS_PROXY}${encodeURIComponent(url)}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (data?.status !== 'ok') return [];
    return Array.isArray(data?.items) ? data.items : [];
  } catch {
    return [];
  }
}

// Word-boundary match — same shape as the proxy-live-signals matcher so
// behaviour stays consistent across pipelines. "Apple" must not match "Snapple"
// and "HCL" must not match "HCLs".
function companyWordBoundaryMatch(text: string, companyLower: string): boolean {
  if (!text || !companyLower) return false;
  const escaped = companyLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(?<![a-z0-9-])${escaped}(?![a-z0-9-])`, 'i');
  return re.test(text);
}

function extractPercentCut(text: string): number | null {
  const m = text.match(/(\d+(?:\.\d+)?)\s*%/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  // Filter out absurd values that match unrelated percentages (e.g. revenue
  // growth 300%). Layoff cuts above 80% are extraordinary; above 100% are
  // certainly noise.
  if (Number.isNaN(n) || n <= 0 || n > 80) return null;
  return n;
}

function detectSentiment(text: string): -1 | 0 | 1 {
  const neg = NEGATIVE_KEYWORDS.filter((kw) => text.includes(kw)).length;
  const pos = POSITIVE_KEYWORDS.filter((kw) => text.includes(kw)).length;
  if (neg > pos) return -1;
  if (pos > neg) return 1;
  return 0;
}

export async function fetchIndiaPressSignals(
  company: string,
): Promise<IndiaPressSummary> {
  const emptyResult: IndiaPressSummary = {
    company, signals: [], layoffSignalCount: 0, sentimentScore: 0,
    anyFeedReachable: false, sourcesUsed: [], fetchedAt: new Date().toISOString(),
  };
  try {
  const companyLower = company.trim().toLowerCase();
  const feedNames = Object.keys(FEEDS);

  // Use allSettled so one broken feed doesn't abort the others
  const feedSettled = await Promise.allSettled(
    feedNames.map(async (name) => ({
      name,
      items: await fetchFeed(FEEDS[name]),
    })),
  );
  const feedResults = feedSettled
    .filter(r => r.status === 'fulfilled')
    .map(r => (r as PromiseFulfilledResult<{ name: string; items: any[] }>).value);

  const sourcesUsed: string[] = [];
  const signals: IndiaPressSignal[] = [];
  let anyFeedReachable = false;
  let posCount = 0;
  let negCount = 0;

  for (const { name, items } of feedResults) {
    if (items.length > 0) anyFeedReachable = true;

    for (const item of items) {
      const title = String(item.title ?? '');
      const description = String(item.description ?? '').replace(/<[^>]+>/g, ' ');
      const titleLower = title.toLowerCase();
      const descLower = description.toLowerCase();

      const titleHit = companyWordBoundaryMatch(titleLower, companyLower);
      const descHit = companyWordBoundaryMatch(descLower, companyLower);
      // Title-anchored, OR description-anchored *and* mentions a layoff keyword.
      // Keeps noise low while still catching cases where a company is mentioned
      // body-only but the headline already telegraphs the event.
      const isCompanyArticle =
        titleHit ||
        (descHit && LAYOFF_KEYWORDS.some((kw) => descLower.includes(kw)));
      if (!isCompanyArticle) continue;

      const combined = `${titleLower} ${descLower}`;
      const layoffMentioned = LAYOFF_KEYWORDS.some((kw) => combined.includes(kw));
      const sentiment = detectSentiment(combined);
      if (sentiment > 0) posCount += 1;
      if (sentiment < 0) negCount += 1;

      signals.push({
        title,
        source: name,
        url: String(item.link ?? ''),
        publishedAt: String(item.pubDate ?? ''),
        layoffMentioned,
        companyMentioned: true,
        percentCut: layoffMentioned ? extractPercentCut(`${title} ${description}`) : null,
      });

      if (!sourcesUsed.includes(name)) sourcesUsed.push(name);
    }
  }

  const total = signals.length || 1;
  return {
    company,
    signals: signals.slice(0, 25),
    layoffSignalCount: signals.filter((s) => s.layoffMentioned).length,
    sentimentScore: (posCount - negCount) / total,
    anyFeedReachable,
    sourcesUsed,
    fetchedAt: new Date().toISOString(),
  };
  } catch (err: any) {
    console.warn('[IndiaPress] fetchIndiaPressSignals failed:', err?.message);
    return emptyResult;
  }
}
