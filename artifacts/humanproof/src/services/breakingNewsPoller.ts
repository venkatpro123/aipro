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
];

// ── Keyword detection ──────────────────────────────────────────────────────

const LAYOFF_KEYWORDS = [
  'layoff', 'lay off', 'laid off', 'job cut', 'retrench',
  'reduce workforce', 'workforce reduction', 'headcount cut', 'headcount reduction',
  'job loss', 'redundancy', 'downsizing', 'restructur', 'firing employees',
  'cut jobs', 'eliminate jobs', 'eliminate positions',
];

function hasLayoffKeyword(text: string): boolean {
  const lower = text.toLowerCase();
  return LAYOFF_KEYWORDS.some(kw => lower.includes(kw));
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

const SESSION_POLL_KEY   = 'hp_breaking_news_last_poll';
const MIN_POLL_INTERVAL  = 15 * 60 * 1_000; // 15 minutes

function shouldPoll(): boolean {
  try {
    const raw = sessionStorage.getItem(SESSION_POLL_KEY);
    if (!raw) return true;
    return Date.now() - parseInt(raw, 10) > MIN_POLL_INTERVAL;
  } catch {
    return true;
  }
}

function markPolled(): void {
  try { sessionStorage.setItem(SESSION_POLL_KEY, String(Date.now())); }
  catch { /* sessionStorage quota — non-fatal */ }
}

// ── Feed fetch ─────────────────────────────────────────────────────────────

async function fetchFeedItems(url: string, limit = 3): Promise<any[]> {
  try {
    const res = await fetch(
      `${RSS_PROXY}${encodeURIComponent(url)}&count=${limit}`,
      { signal: AbortSignal.timeout(8_000) },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.items ?? []).slice(0, limit);
  } catch {
    return [];
  }
}

// ── Public API ─────────────────────────────────────────────────────────────

export interface BreakingNewsMatch {
  companyName:   string;
  headline:      string;
  source:        string;
  url:           string;
  publishedAt:   Date;
  timeAgo:       string;
}

/**
 * Poll all three RSS feeds for breaking layoff news matching any of the
 * provided company names.
 *
 * - Throttled: runs at most once per 15 minutes per browser session.
 * - Matches are injected into layoffNewsCache via injectLayoffEvent() so the
 *   BreakingNewsBanner and the scoring engine both see them automatically.
 * - Returns the list of matches found (or [] if throttled / no matches).
 */
export async function pollBreakingNews(
  companyNames: string[],
): Promise<BreakingNewsMatch[]> {
  if (companyNames.length === 0) return [];
  if (!shouldPoll()) return [];

  markPolled();

  // Deduplicate company names, skip obviously generic names
  const names = [...new Set(
    companyNames
      .map(n => n.trim())
      .filter(n => n.length >= 3 && !n.toLowerCase().includes('unknown')),
  )];
  if (names.length === 0) return [];

  // Fetch all feeds in parallel; individual failures don't abort others
  const feedResults = await Promise.allSettled(
    BREAKING_FEEDS.map(feed =>
      fetchFeedItems(feed.url, 3).then(items => ({ feed, items })),
    ),
  );

  const matches: BreakingNewsMatch[] = [];

  for (const result of feedResults) {
    if (result.status !== 'fulfilled') continue;
    const { feed, items } = result.value;

    for (const item of items) {
      const title       = (item.title ?? '').trim();
      const description = (item.description ?? item.content ?? '').trim();
      const fullText    = `${title} ${description}`;

      // Must contain a layoff keyword somewhere in the article
      if (!hasLayoffKeyword(fullText)) continue;

      // Check each company name against the title
      for (const companyName of names) {
        if (!titleMatchesCompany(title, companyName)) continue;

        const publishedAt = new Date(item.pubDate ?? item.published ?? Date.now());
        const url = item.link ?? item.url ?? '';

        const event: LayoffNewsEvent = {
          companyName,
          date:               publishedAt.toISOString(),
          headline:           title,
          percentCut:         0, // not reliably parseable from RSS titles
          source:             feed.name,
          url,
          affectedDepartments: [],
        };

        // injectLayoffEvent() deduplicates by company+date internally and
        // notifies all BreakingNewsBanner subscribers.
        injectLayoffEvent(event);

        matches.push({
          companyName,
          headline:    title,
          source:      feed.name,
          url,
          publishedAt,
          timeAgo:     formatTimeAgo(publishedAt),
        });

        // Only report this article once even if multiple company names match
        break;
      }
    }
  }

  return matches;
}
