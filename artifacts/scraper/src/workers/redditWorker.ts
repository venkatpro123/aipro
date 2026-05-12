// redditWorker.ts
// Polls Reddit's free public API for posts mentioning a company in
// layoff-relevant subreddits. Writes hits to public.reddit_mentions.
//
// Reddit OAuth: free, 60 req/min. Token cached for ~50 min and refreshed
// lazily. If REDDIT_CLIENT_ID/SECRET not set, falls back to anonymous
// search (10 req/min) which is fine for low-volume polling.

import { getSupabase } from '../lib/supabaseClient.js';
import { config } from '../lib/config.js';
import { dedupeKey } from '../lib/dedupe.js';
import type { JobPayload, JobResult } from '../lib/types.js';

const SUBREDDITS = ['layoffs', 'cscareerquestions', 'jobs', 'recruitinghell'];
const LAYOFF_KEYWORDS = [
  'layoff', 'laid off', 'lay off', 'lays off', 'fired', 'job cut',
  'workforce reduction', 'reorg', 'pip', 'restructuring',
];

let _accessToken: string | null = null;
let _accessTokenExpiresAt = 0;

async function getRedditToken(): Promise<string | null> {
  if (!config.reddit.enabled) return null;
  if (_accessToken && Date.now() < _accessTokenExpiresAt) return _accessToken;

  const auth = Buffer.from(`${config.reddit.clientId}:${config.reddit.clientSecret}`).toString('base64');
  try {
    const res = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'User-Agent':    config.reddit.userAgent,
        'Content-Type':  'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    _accessToken = data.access_token ?? null;
    _accessTokenExpiresAt = Date.now() + Math.max(0, (data.expires_in ?? 3600) * 1000 - 60_000);
    return _accessToken;
  } catch {
    return null;
  }
}

interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  url: string;
  permalink: string;
  ups: number;
  num_comments: number;
  created_utc: number;
  subreddit: string;
}

async function searchSubreddit(subreddit: string, query: string, token: string | null): Promise<RedditPost[]> {
  const headers: HeadersInit = {
    'User-Agent': config.reddit.userAgent,
  };
  if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;

  const host = token ? 'oauth.reddit.com' : 'www.reddit.com';
  const url = `https://${host}/r/${subreddit}/search.json?q=${encodeURIComponent(query)}&restrict_sr=1&sort=new&t=month&limit=15`;

  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
    if (res.status === 429) throw Object.assign(new Error('reddit 429'), { _kind: '429' });
    if (!res.ok) return [];
    const data: any = await res.json();
    const children = data?.data?.children ?? [];
    return children.map((c: any) => c.data).filter(Boolean) as RedditPost[];
  } catch (err: any) {
    if (err?._kind === '429') throw err;
    return [];
  }
}

function classifyLayoff(text: string): { isLayoff: boolean; sentiment: number } {
  const lower = text.toLowerCase();
  const layoffHits = LAYOFF_KEYWORDS.filter(k => lower.includes(k)).length;
  if (layoffHits === 0) return { isLayoff: false, sentiment: 0 };
  // Crude sentiment: positive verbs offset layoff weight (denial / rumor signals)
  const negationHits = ['rumor', 'denies', 'no plans', 'speculation'].filter(k => lower.includes(k)).length;
  const sentiment = Math.min(1, layoffHits / 2) - Math.min(0.5, negationHits / 2);
  return { isLayoff: true, sentiment: -sentiment };  // negative = bad-for-company
}

export async function redditWorker(payload: JobPayload): Promise<JobResult> {
  const company = payload.companyName;
  if (!company) return { ok: false, errorKind: 'parse_error', errorMessage: 'companyName required' };

  let token: string | null = null;
  try {
    token = await getRedditToken();
  } catch { /* fall through to anon */ }

  let rateLimited = false;
  const posts: RedditPost[] = [];
  for (const sub of SUBREDDITS) {
    try {
      const subPosts = await searchSubreddit(sub, company, token);
      posts.push(...subPosts);
    } catch (err: any) {
      if (err?._kind === '429') { rateLimited = true; break; }
    }
  }

  if (rateLimited && posts.length === 0) {
    return { ok: false, errorKind: '429', errorMessage: 'Reddit rate-limit' };
  }

  // Filter to posts that actually mention the company in title or body
  const companyLower = company.toLowerCase();
  const matched = posts.filter(p =>
    p.title?.toLowerCase().includes(companyLower) ||
    (p.selftext ?? '').toLowerCase().includes(companyLower)
  );

  if (matched.length === 0) {
    return { ok: true, summary: `no reddit matches for ${company}`, rowsWritten: 0 };
  }

  const sb = getSupabase();
  const rows = matched.map(p => {
    const combined = `${p.title ?? ''} ${p.selftext ?? ''}`;
    const { isLayoff, sentiment } = classifyLayoff(combined);
    return {
      company_name:    company,
      subreddit:       p.subreddit,
      post_id:         p.id,
      post_title:      (p.title ?? '').slice(0, 500),
      post_url:        p.permalink ? `https://reddit.com${p.permalink}` : (p.url ?? null),
      body_excerpt:    (p.selftext ?? '').slice(0, 500),
      upvotes:         p.ups ?? 0,
      comment_count:   p.num_comments ?? 0,
      layoff_signal:   isLayoff,
      sentiment_score: sentiment,
      posted_at:       new Date((p.created_utc ?? 0) * 1000).toISOString(),
    };
  });

  const { error, data } = await sb
    .from('reddit_mentions')
    .upsert(rows, { onConflict: 'post_id,company_name', ignoreDuplicates: true })
    .select('id');

  if (error) {
    return { ok: false, errorKind: 'parse_error', errorMessage: error.message };
  }

  payload.dedupeKey = dedupeKey({
    company, source: 'reddit',
    date: new Date().toISOString().slice(0, 10),
  });

  return {
    ok: true,
    summary: `${matched.length} reddit posts (${data?.length ?? 0} new)`,
    rowsWritten: data?.length ?? 0,
  };
}
