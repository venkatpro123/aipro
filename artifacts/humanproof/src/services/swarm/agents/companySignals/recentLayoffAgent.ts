// recentLayoffAgent.ts
// Company Signal — Real layoff news detection.
//
// SECURITY FIX: NewsAPI is now called via the proxy-live-signals Edge Function
// (server-side). The VITE_NEWSAPI_KEY is no longer read from import.meta.env.
//
// NLP FIXES:
//   1. Negation detection — "denies layoffs", "no plans to cut" no longer raise
//      the risk signal. Negation phrases detected in title + description.
//   2. URL-based deduplication — syndicated articles (same story on 8 sites)
//      no longer count as 8 separate layoff events. Articles with the same URL
//      or near-identical title fingerprint (first 6 words) are deduplicated.
//   3. Extended window — 30 days (was 14). A confirmed layoff 15 days old is
//      still highly material; 14-day cutoff was discarding valid recent signals.
//   4. Percent-cut extraction — when an article mentions "X%" the signal is
//      amplified proportionally (>10% cut = stronger signal than 1%).

import { AgentFn, AgentSignal, SwarmInput } from '../../swarmTypes';
import { supabase } from '../../../../utils/supabase';
import { invokeEdgeFunction } from '../../../../infrastructure/requestId';

const NEGATION_PHRASES = [
  'denies layoff', 'deny layoff', 'no layoff', 'no plans to lay off',
  'not laying off', 'rules out layoff', 'refutes layoff', 'no job cut',
  'no plans for', 'won\'t cut', 'will not cut', 'not cutting',
  'growth in hiring', 'adding jobs', 'hiring spree', 'hiring surge',
];

const heuristicLayoff = (input: SwarmInput): number => {
  const layoffs = input.companyData.layoffsLast24Months ?? [];
  if (layoffs.length === 0) return 0.08;
  const sorted = [...layoffs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const mAgo = (Date.now() - new Date(sorted[0].date).getTime()) / (1000 * 60 * 60 * 24 * 30);
  if (mAgo < 3)  return 0.92;
  if (mAgo < 6)  return 0.75;
  if (mAgo < 12) return 0.55;
  if (mAgo < 18) return 0.35;
  return 0.20;
};

function isNegated(title: string, description: string): boolean {
  const combined = `${title} ${description}`.toLowerCase();
  return NEGATION_PHRASES.some(phrase => combined.includes(phrase));
}

function deduplicateArticles(articles: any[]): any[] {
  const seenUrls = new Set<string>();
  const seenTitleFingerprints = new Set<string>();
  return articles.filter(a => {
    const url = (a.url ?? a.link ?? '').trim();
    // Title fingerprint: first 5 words lowercased
    const fp = (a.title ?? '').toLowerCase().split(/\s+/).slice(0, 5).join(' ');

    if (url && seenUrls.has(url)) return false;
    if (fp && fp.length > 10 && seenTitleFingerprints.has(fp)) return false;

    if (url) seenUrls.add(url);
    if (fp) seenTitleFingerprints.add(fp);
    return true;
  });
}

function signalFromCount(count: number, maxPercentCut: number): number {
  // Base signal from article count
  let base: number;
  if (count >= 8)      base = 0.95;
  else if (count >= 5) base = 0.82;
  else if (count >= 3) base = 0.70;
  else if (count >= 2) base = 0.62;
  else if (count === 1) base = 0.50;
  else                  base = 0.10;

  // Amplify for large confirmed cuts (>= 10% workforce)
  if (maxPercentCut >= 20) base = Math.min(0.98, base + 0.08);
  else if (maxPercentCut >= 10) base = Math.min(0.97, base + 0.05);

  return base;
}

const run = async (input: SwarmInput): Promise<AgentSignal> => {
  // ── Live path via server-side proxy (no NewsAPI key in browser) ───────────
  try {
    const { data, error } = await invokeEdgeFunction<any>('proxy-live-signals', {
      body: { action: 'news', companyName: input.companyName },
    });

    if (!error && data?.newsData) {
      const nd = data.newsData;
      const rawArticles: any[] = nd.articles ?? nd.items ?? [];

      // 1. Deduplicate syndicated copies
      const unique = deduplicateArticles(rawArticles);

      // 2. Filter out negations
      const confirmed = unique.filter(a => !isNegated(a.title ?? '', a.description ?? a.content ?? ''));

      // 3. Extract the largest percent cut mentioned across articles
      const percentCuts: number[] = confirmed
        .map(a => {
          const text = `${a.title ?? ''} ${a.description ?? ''}`;
          const m = text.match(/(\d+(?:\.\d+)?)\s*%/);
          if (!m) return 0;
          const n = parseFloat(m[1]);
          return (n > 0 && n <= 80) ? n : 0;
        })
        .filter(n => n > 0);
      const maxPercentCut = percentCuts.length > 0 ? Math.max(...percentCuts) : 0;

      const count = confirmed.length;
      const signal = signalFromCount(count, maxPercentCut);

      // Also check for a pre-computed totalResults field from the EF
      const efCount: number = nd.totalResults ?? nd.totalCount ?? count;
      const effectiveCount = Math.max(count, efCount > 0 ? Math.min(efCount, count * 2) : 0);

      return {
        agentId:    'recentLayoffAgent',
        category:   'company',
        signal:     signalFromCount(effectiveCount, maxPercentCut),
        confidence: 0.88,
        sourceType: 'live-api',
        ageInDays:  0,
        metadata:   {
          rawArticles:    rawArticles.length,
          afterDedup:     unique.length,
          afterNegation:  confirmed.length,
          effectiveCount,
          maxPercentCut,
          windowDays:     30,
          source:         'proxy-live-signals/NewsAPI',
        },
      };
    }

    if (error) console.warn('[recentLayoffAgent] proxy-live-signals error:', error.message);
    if (data?.newsData?.rateLimited) {
      console.warn('[recentLayoffAgent] NewsAPI rate-limited — heuristic fallback');
    }
  } catch (e: any) {
    console.warn('[recentLayoffAgent] proxy call failed:', e?.message);
  }

  // ── Heuristic fallback ─────────────────────────────────────────────────────
  const signal = heuristicLayoff(input);
  return {
    agentId:    'recentLayoffAgent',
    category:   'company',
    signal,
    confidence: 0.55,
    sourceType: 'heuristic',
    ageInDays:  14,
    metadata:   { fallback: true, note: 'proxy-live-signals unavailable or quota exhausted' },
  };
};

export const recentLayoffAgent: AgentFn = { id: 'recentLayoffAgent', run };
