// breakingNewsPoller.ts
// Lightweight page-load RSS poll for breaking layoff signals.
//
// Runs on every page load (throttled to once per 15 minutes per session).
// Fetches the last 3 items from three feeds, scans for company name + layoff
// keyword co-occurrence, and injects any matches into layoffNewsCache via
// injectLayoffEvent(). The existing BreakingNewsBanner component subscribes
// to onNewLayoffEvent() and fires automatically when a match is injected.
//
// DESIGN DECISIONS
// ────────────────
// 1. Feed limit: 3 items per feed. We want recency, not volume. Fetching 3
//    items is ~10KB per feed; fetching 20 would be 60KB+ with no signal gain
//    since older items are already in the seeded layoffNewsCache.
//
// 2. Title-only company matching: company name must appear in the article
//    TITLE (not just the description). Description matching produces too many
//    false positives — an article about "Amazon's new AI service" in a
//    description field would incorrectly trigger for any Amazon employee.
//
// 3. Session throttle: sessionStorage key prevents re-polling within the
//    same browser tab session more than once per MIN_POLL_INTERVAL_MS. This
//    avoids hammering the rss2json proxy on every route change.
//
// 4. No API key required: all feeds are public RSS; rss2json.com free tier
//    allows 1 req/sec and up to 1M requests/month — suitable for this use.
//
// 5. Fires and forgets: the poller is best-effort. Any network failure silently
//    returns an empty match list — the caller (useBreakingNewsPoller hook) does
//    not surface errors to the user if RSS is unavailable.

import { injectLayoffEvent } from '../data/layoffNewsCache';
import type { LayoffNewsEvent } from '../data/layoffNewsCache';
import {
  isCallAllowed,
  recordSuccess as circuitSuccess,
  recordFailure as circuitFailure,
  getCachedResponse,
} from './apiCircuitBreaker';

// ── Feed configuration ─────────────────────────────────────────────────────

const RSS_PROXY = 'https://api.rss2json.com/v1/api.json?rss_url=';

const BREAKING_FEEDS = [
  {
    name: 'TechCrunch Layoffs',
    url: 'https://techcrunch.com/tag/layoffs/feed/',
    region: 'US' as const,
  },
  {
    name: 'Moneycontrol Business',
    url: 'https://www.moneycontrol.com/rss/business.xml',
    region: 'IN' as const,
  },
  {
    name: 'ET Markets',
    url: 'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms',
    region: 'IN' as const,
  },
  {
    name: 'TechInAsia',
    url: 'https://www.techinasia.com/feed',
    region: 'SG' as const,
  },
  {
    name: 'CNA Business',
    url: 'https://www.channelnewsasia.com/rssfeeds/8395986',
    region: 'SG' as const,
  },
  {
    name: 'Reuters Tech',
    url: 'https://feeds.reuters.com/reuters/technologyNews',
    region: 'GLOBAL' as const,
  },
];

// ── Keyword detection ──────────────────────────────────────────────────────
//
// Spec-exact primary signals: 'layoff', 'cut', 'reduce workforce'.
// Extended signals are additional high-confidence layoff indicators kept for
// completeness — the primary three alone generate enough true positives.

const LAYOFF_KEYWORDS_PRIMARY = [
  'layoff', 'lay off', 'laid off',
  'cut',                              // "cuts 2,000 jobs", "job cuts"
  'reduce workforce', 'workforce reduction',
] as const;

const LAYOFF_KEYWORDS_EXTENDED = [
  'retrench', 'headcount cut', 'headcount reduction',
  'job loss', 'redundancy', 'downsizing', 'restructur',
  'firing employees', 'cut jobs', 'eliminate jobs', 'eliminate positions',
] as const;

const ALL_LAYOFF_KEYWORDS = [...LAYOFF_KEYWORDS_PRIMARY, ...LAYOFF_KEYWORDS_EXTENDED];

function hasLayoffKeyword(text: string): boolean {
  const lower = text.toLowerCase();
  return ALL_LAYOFF_KEYWORDS.some(kw => lower.includes(kw));
}

/** True when the text contains a spec-exact primary keyword. */
function hasPrimaryKeyword(text: string): boolean {
  const lower = text.toLowerCase();
  return LAYOFF_KEYWORDS_PRIMARY.some(kw => lower.includes(kw));
}

/**
 * Check whether the article title contains the company name.
 * Uses title-only matching (not description) to minimise false positives.
 * Requires the company name to appear as a word boundary match where possible.
 */
function titleMatchesCompany(title: string, companyName: string): boolean {
  if (!title || !companyName) return false;
  const t = title.toLowerCase();
  const name = companyName.toLowerCase().trim();
  if (name.length < 3) return false; // too short to match safely

  // Direct substring match in title
  if (t.includes(name)) return true;

  // Handle common suffixes that might differ between stored name and article
  // e.g. "Infosys BPM" matches "Infosys"; "TCS" matches "Tata Consultancy"
  const firstWord = name.split(/\s+/)[0];
  if (firstWord.length >= 4 && t.includes(firstWord)) {
    // Require at least one layoff keyword nearby (within 80 chars of company name)
    const idx = t.indexOf(firstWord);
    const context = t.slice(Math.max(0, idx - 40), idx + firstWord.length + 40);
    if (hasLayoffKeyword(context)) return true;
  }

  return false;
}

// ── Time formatting ────────────────────────────────────────────────────────

export function formatTimeAgo(date: Date): string {
  const mins = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins} minute${mins !== 1 ? 's' : ''} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}

// ── Session throttle ───────────────────────────────────────────────────────
// Per-company sessionStorage keys: hp_breaking_news_last_poll:{canonicalName}
//
// WHY PER-COMPANY: The previous single-key design meant that auditing "Google"
// would block a subsequent "Infosys" poll for 15 minutes even though no
// Infosys-related RSS items were fetched. With per-company keys:
//   - Switching to any company polls immediately if that company hasn't been
//     checked in the last 15 minutes in this session.
//   - App-load history polling still checks the 10 most recent companies, and
//     each one is independently throttled.
//
// The spec says "Apply a 15-minute session throttle via hp_breaking_news_last_poll
// in sessionStorage." We use hp_breaking_news_last_poll:{canonical} — the key
// prefix is preserved exactly; the suffix disambiguates per company.
//
// v22.0 note: the browser poller is the safety-net floor; the authoritative
// path remains the server-side `ingest-news` Edge Function (pg_cron every 10
// min → breaking_news_events → Supabase Realtime push).

const SESSION_POLL_KEY_PREFIX = 'hp_breaking_news_last_poll';
const MIN_POLL_INTERVAL       = 15 * 60 * 1_000; // 15 minutes

function canonicalCompanyKey(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
}

function sessionPollKey(companyName: string): string {
  return `${SESSION_POLL_KEY_PREFIX}:${canonicalCompanyKey(companyName)}`;
}

/** Returns the companies in `names` that are due for a poll (not polled within 15 min). */
function filterDueForPoll(names: string[]): string[] {
  const now = Date.now();
  return names.filter(name => {
    try {
      const raw = sessionStorage.getItem(sessionPollKey(name));
      if (!raw) return true;
      return now - parseInt(raw, 10) > MIN_POLL_INTERVAL;
    } catch {
      return true;
    }
  });
}

function markPolled(names: string[]): void {
  const stamp = String(Date.now());
  for (const name of names) {
    try { sessionStorage.setItem(sessionPollKey(name), stamp); }
    catch { /* sessionStorage quota — non-fatal */ }
  }
}

// ── Feed fetch ─────────────────────────────────────────────────────────────

/**
 * Fetch RSS items via rss2json proxy with circuit breaker protection.
 *
 * When 'rss2json' circuit is OPEN: return cached items (labeled fromCache=true
 * via caller) — never silently serve stale data as live.
 * When HALF_OPEN: one probe call; success→CLOSED, failure stays OPEN.
 *
 * Cache key for rss2json is shared across all feeds because the breaker tracks
 * the proxy health (one proxy, many feeds). Per-feed item-level caching is
 * handled by the sessionStorage throttle layer above.
 */
async function fetchFeedItems(
  url: string,
  limit = 3,
): Promise<{ items: any[]; fromCircuitBreaker: boolean; cachedAt: number | null }> {
  if (!isCallAllowed('rss2json')) {
    // Circuit OPEN — return cached items if available
    const cached = getCachedResponse<any[]>('rss2json');
    return {
      items:               (cached?.data ?? []).slice(0, limit),
      fromCircuitBreaker:  true,
      cachedAt:            cached?.cachedAt ?? null,
    };
  }

  try {
    const res = await fetch(
      `${RSS_PROXY}${encodeURIComponent(url)}&count=${limit}`,
      { signal: AbortSignal.timeout(8_000) },
    );
    if (!res.ok) {
      circuitFailure('rss2json', `HTTP ${res.status}`);
      return { items: [], fromCircuitBreaker: false, cachedAt: null };
    }
    const data = await res.json();
    const items = (data?.items ?? []).slice(0, limit);
    circuitSuccess('rss2json', items);
    return { items, fromCircuitBreaker: false, cachedAt: null };
  } catch (err: any) {
    circuitFailure('rss2json', err?.message ?? String(err));
    return { items: [], fromCircuitBreaker: false, cachedAt: null };
  }
}

// ── Public API ─────────────────────────────────────────────────────────────

export interface BreakingNewsMatch {
  companyName:       string;
  headline:          string;
  /** RSS feed name, e.g. "TechCrunch Layoffs" */
  source:            string;
  /** Resolved article URL */
  url:               string;
  publishedAt:       Date;
  timeAgo:           string;
  /** True when the match contains a spec-exact primary keyword (layoff/cut/reduce workforce). */
  isPrimaryKeyword:  boolean;
  /** Which feed region the match came from. */
  feedRegion:        'US' | 'IN' | 'SG' | 'UK' | 'EU' | 'APAC' | 'GLOBAL';
  /** True when this match came from circuit breaker cache (rss2json OPEN). */
  fromCircuitBreaker: boolean;
  /** Unix ms timestamp of when the cached item was fetched. Null when live. */
  cachedAt:          number | null;
}

/**
 * Poll the three breaking-news RSS feeds for layoff signals matching any of
 * the provided company names.
 *
 * THROTTLE: Each company has an independent 15-minute sessionStorage window
 * (key: hp_breaking_news_last_poll:{canonical}). Only companies that haven't
 * been polled in the last 15 minutes in this session are included in the fetch.
 * This means switching dashboards always polls the new company immediately.
 *
 * MATCH CRITERIA (spec-exact):
 *   - Company name must appear in the article TITLE (not just description).
 *   - Article text must contain at least one of: 'layoff', 'cut', 'reduce
 *     workforce' (primary), or any extended layoff keyword.
 *
 * SIDE EFFECTS: Matches are injected into layoffNewsCache via injectLayoffEvent()
 * so the BreakingNewsBanner and the scoring engine both see them automatically.
 *
 * @returns Array of matches, sorted newest-first. Empty when all companies are
 *   throttled or no matches found.
 */
export async function pollBreakingNews(
  companyNames: string[],
  options?: { force?: boolean },
): Promise<BreakingNewsMatch[]> {
  if (companyNames.length === 0) return [];

  // Deduplicate and sanitise company names
  const allNames = [...new Set(
    companyNames
      .map(n => n.trim())
      .filter(n => n.length >= 3 && !n.toLowerCase().includes('unknown') && !n.toLowerCase().startsWith('fallback')),
  )];
  if (allNames.length === 0) return [];

  // Per-company throttle — only poll names due for a check
  const dueNames = options?.force ? allNames : filterDueForPoll(allNames);
  if (dueNames.length === 0) return [];

  // Mark ALL due names polled before fetching (prevents concurrent calls from
  // double-polling when React StrictMode mounts the hook twice).
  markPolled(dueNames);

  // Fetch all feeds concurrently — individual failures don't abort others.
  // Each fetchFeedItems call returns { items, fromCircuitBreaker, cachedAt }.
  const feedResults = await Promise.allSettled(
    BREAKING_FEEDS.map(feed =>
      fetchFeedItems(feed.url, 3).then(result => ({ feed, ...result })),
    ),
  );

  const matches: BreakingNewsMatch[] = [];

  for (const result of feedResults) {
    if (result.status !== 'fulfilled') continue;
    const { feed, items, fromCircuitBreaker, cachedAt } = result.value;

    for (const item of items) {
      const title       = (item.title ?? '').trim();
      const description = (item.description ?? item.content ?? '').trim();
      const fullText    = `${title} ${description}`;

      // Must contain a layoff keyword anywhere in the article text
      if (!hasLayoffKeyword(fullText)) continue;

      // Company name must appear in the TITLE (spec requirement; description
      // matching generates too many false positives).
      for (const companyName of dueNames) {
        if (!titleMatchesCompany(title, companyName)) continue;

        const publishedAt      = new Date(item.pubDate ?? item.published ?? Date.now());
        const url              = item.link ?? item.url ?? '';
        const isPrimaryKeyword = hasPrimaryKeyword(fullText);

        const event: LayoffNewsEvent = {
          companyName,
          date:                publishedAt.toISOString(),
          headline:            title,
          percentCut:          0,   // not reliably parseable from RSS titles
          source:              feed.name,
          url,
          affectedDepartments: [],
          // Circuit breaker provenance — preserved through injectLayoffEvent
          // spread so BreakingNewsBanner can label stale cache items.
          _fromCircuitBreaker: fromCircuitBreaker,
          _cachedAt:           fromCircuitBreaker ? (cachedAt ?? null) : null,
        };

        // injectLayoffEvent() deduplicates by company+date and notifies all
        // BreakingNewsBanner subscribers.
        injectLayoffEvent(event);

        matches.push({
          companyName,
          headline:          title,
          source:            feed.name,
          url,
          publishedAt,
          timeAgo:           formatTimeAgo(publishedAt),
          isPrimaryKeyword,
          feedRegion:        feed.region,
          // Circuit breaker provenance — BreakingNewsBanner uses this to
          // display "Cached [N] hours ago" when rss2json circuit is OPEN.
          fromCircuitBreaker,
          cachedAt: cachedAt ?? null,
        });

        // One article should only match once even if multiple company names hit
        break;
      }
    }
  }

  // Newest-first so the banner always shows the most recent signal
  return matches.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
}
