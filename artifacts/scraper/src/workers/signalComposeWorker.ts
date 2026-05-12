// signalComposeWorker.ts
// Fuses raw multi-source rows into a single high-confidence event row.
//
// Trigger: every successful raw-scrape worker enqueues a `signalCompose` job
// for the same company (workers/index.ts handles this).
//
// Logic:
//   1. Pull recent rows for the company from breaking_news_events + reddit_mentions
//      + linkedin_company_snapshots + github_company_activity in last 72h.
//   2. Group by approximate event_date (±2 days bucket).
//   3. For each group, compute composedConfidence = clamp(0.95, sum(authority) / 2).
//   4. Call Gemini Flash for narrative + final event type classification.
//   5. Write back a fused row to breaking_news_events (high confidence) and
//      per-source rows to live_signals_v2.
//   6. Push to Meilisearch for search.

import { getSupabase } from '../lib/supabaseClient.js';
import { indexEvent } from '../lib/meilisearchClient.js';
import { composeWithGemini } from '../sources/geminiEnrich.js';
import { dedupeKey } from '../lib/dedupe.js';
import type { JobPayload, JobResult, SourceAuthority, ScraperEvent } from '../lib/types.js';

// ── Source authority tiers (see plan doc) ────────────────────────────────────
const AUTHORITY: Record<string, SourceAuthority> = {
  'SEC EDGAR':            1.00,
  'warn_filings':         1.00,
  'Bloomberg':            0.55,
  'Reuters':              0.55,
  'Economic Times':       0.55,
  'Moneycontrol':         0.55,
  'TechCrunch':           0.55,
  'Google News':          0.55,
  'layoffs.fyi (mirror)': 0.35,
  'career_page':          0.75,
  'linkedin':             0.55,
  'reddit':               0.20,
  'glassdoor':            0.20,
  'github':               0.20,
};

function authorityFor(source: string): SourceAuthority {
  if (source in AUTHORITY) return AUTHORITY[source];
  // News-like default — better to under-weight unknown sources than over-weight
  return 0.35;
}

const LOOKBACK_HOURS = 72;
const BUCKET_DAYS = 2;

interface RawSignal {
  sourceName: string;
  sourceUrl?: string;
  observedAt: string;
  eventDate: string;
  snippet: string;
  raw: any;
}

async function fetchRecentSignals(company: string): Promise<RawSignal[]> {
  const sb = getSupabase();
  const since = new Date(Date.now() - LOOKBACK_HOURS * 3_600_000).toISOString();

  const out: RawSignal[] = [];

  // breaking_news_events
  const bne = await sb.from('breaking_news_events')
    .select('headline, source, source_url, event_date, created_at, percent_cut, affected_count')
    .eq('company_name', company)
    .gte('created_at', since)
    .limit(20);
  if (bne.data) {
    for (const r of bne.data) {
      out.push({
        sourceName: r.source,
        sourceUrl:  r.source_url ?? undefined,
        observedAt: r.created_at,
        eventDate:  r.event_date,
        snippet:    r.headline,
        raw:        r,
      });
    }
  }

  // reddit_mentions — only layoff-flagged rows
  const rm = await sb.from('reddit_mentions')
    .select('post_title, post_url, posted_at, body_excerpt, layoff_signal')
    .eq('company_name', company)
    .eq('layoff_signal', true)
    .gte('fetched_at', since)
    .limit(10);
  if (rm.data) {
    for (const r of rm.data) {
      out.push({
        sourceName: 'reddit',
        sourceUrl:  r.post_url ?? undefined,
        observedAt: r.posted_at ?? new Date().toISOString(),
        eventDate:  (r.posted_at ?? new Date().toISOString()).slice(0, 10),
        snippet:    `${r.post_title}: ${r.body_excerpt ?? ''}`.slice(0, 400),
        raw:        r,
      });
    }
  }

  // linkedin_company_snapshots — only material deltas
  const li = await sb.from('linkedin_company_snapshots')
    .select('open_jobs_count, delta_pct_vs_prev, snapshot_at')
    .eq('company_name', company)
    .gte('snapshot_at', since)
    .order('snapshot_at', { ascending: false })
    .limit(1);
  if (li.data?.[0]) {
    const r = li.data[0];
    if ((r as any).delta_pct_vs_prev !== null && Math.abs((r as any).delta_pct_vs_prev) >= 20) {
      out.push({
        sourceName: 'linkedin',
        observedAt: r.snapshot_at,
        eventDate:  r.snapshot_at.slice(0, 10),
        snippet:    `LinkedIn open jobs delta ${(r as any).delta_pct_vs_prev}% (now ${r.open_jobs_count})`,
        raw:        r,
      });
    }
  }

  // github_company_activity
  const gh = await sb.from('github_company_activity')
    .select('commits_4w, delta_pct_vs_prev, snapshot_at')
    .eq('company_name', company)
    .gte('snapshot_at', since)
    .order('snapshot_at', { ascending: false })
    .limit(1);
  if (gh.data?.[0]) {
    const r = gh.data[0];
    if ((r as any).delta_pct_vs_prev !== null && (r as any).delta_pct_vs_prev <= -25) {
      out.push({
        sourceName: 'github',
        observedAt: r.snapshot_at,
        eventDate:  r.snapshot_at.slice(0, 10),
        snippet:    `GitHub commit velocity declining ${(r as any).delta_pct_vs_prev}% (4w=${r.commits_4w})`,
        raw:        r,
      });
    }
  }

  return out;
}

/**
 * Group signals into approximate event-date buckets so signals 1–2 days apart
 * are treated as the same logical event.
 */
function bucketByEventDate(signals: RawSignal[]): RawSignal[][] {
  if (signals.length === 0) return [];
  const sorted = [...signals].sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  const groups: RawSignal[][] = [[sorted[0]]];
  for (let i = 1; i < sorted.length; i += 1) {
    const cur = sorted[i];
    const prevGroup = groups[groups.length - 1];
    const prev = prevGroup[prevGroup.length - 1];
    const daysDiff = Math.abs(
      (new Date(cur.eventDate).getTime() - new Date(prev.eventDate).getTime()) / 86_400_000,
    );
    if (daysDiff <= BUCKET_DAYS) prevGroup.push(cur);
    else groups.push([cur]);
  }
  return groups;
}

function composedConfidence(group: RawSignal[]): number {
  const sum = group.reduce((s, r) => s + authorityFor(r.sourceName), 0);
  return Math.min(0.95, sum / 2);
}

function detectNegation(group: RawSignal[]): boolean {
  const NEG = ['denies layoff', 'no plans to lay', 'rumour', 'rumor', 'refutes'];
  return group.some(g => NEG.some(n => g.snippet.toLowerCase().includes(n)));
}

export async function signalComposeWorker(payload: JobPayload): Promise<JobResult> {
  const company = payload.companyName;
  if (!company) return { ok: false, errorKind: 'parse_error', errorMessage: 'companyName required' };

  const signals = await fetchRecentSignals(company);
  if (signals.length === 0) {
    return { ok: true, summary: 'no recent signals to compose', rowsWritten: 0 };
  }

  const buckets = bucketByEventDate(signals);
  const sb = getSupabase();

  let rowsWritten = 0;
  let topEventForToast: ScraperEvent | null = null;

  for (const group of buckets) {
    if (detectNegation(group)) continue;        // negation evidence → skip group
    if (group.length < 2 && authorityFor(group[0].sourceName) < 0.55) continue; // single low-authority signal

    // Try LLM compose first; fall back to rule-based if Gemini unavailable
    const composeInput = {
      companyName: company,
      rawSignals: group.map(g => ({
        sourceName:      g.sourceName,
        sourceAuthority: authorityFor(g.sourceName),
        snippet:         g.snippet,
        sourceUrl:       g.sourceUrl,
        observedAt:      g.observedAt,
      })),
    };

    const llmEvent = await composeWithGemini(composeInput);
    const confidence = llmEvent?.confidence ?? composedConfidence(group);
    const eventType  = llmEvent?.eventType ?? (group.some(g => /layoff|workforce reduction/i.test(g.snippet)) ? 'layoff' : 'unknown');
    const eventDate  = llmEvent?.eventDate
      ?? group.map(g => g.eventDate).sort()[0];
    const headline   = llmEvent?.headline
      ?? `${eventType.replace('_', ' ')} signal at ${company} from ${group.length} sources`;

    if (confidence < 0.30 || eventType === 'unknown') continue;

    // Compose stable id for Meili docId
    const composedId = dedupeKey({
      company, source: 'composed',
      date: eventDate,
      contentHash: eventType,
    });

    // Confidence tier mapping (matches breaking_news_events check constraint)
    const confidenceTier: 'high' | 'medium' | 'low' =
      confidence >= 0.70 ? 'high' : confidence >= 0.40 ? 'medium' : 'low';

    const eventRow = {
      company_name:   company,
      event_date:     eventDate,
      headline:       headline.slice(0, 500),
      percent_cut:    llmEvent?.percentCut ?? null,
      affected_count: llmEvent?.affectedCount ?? null,
      confidence:     confidenceTier,
      source:         `composed (${group.length} sources)`,
      source_url:     group[0].sourceUrl ?? null,
      industry:       null,
      region:         null,
    };

    const { error } = await sb
      .from('breaking_news_events')
      .upsert(eventRow, { onConflict: 'company_name,event_date,source', ignoreDuplicates: false });
    if (error) {
      console.warn('[signalCompose] upsert failed:', error.message);
      continue;
    }
    rowsWritten += 1;

    // Best-effort Meilisearch index
    const event: ScraperEvent = {
      id:            composedId,
      companyName:   company,
      eventType:     eventType as ScraperEvent['eventType'],
      eventDate,
      headline:      eventRow.headline,
      percentCut:    eventRow.percent_cut,
      affectedCount: eventRow.affected_count,
      confidence,
      sources:       group.map(g => ({
        name:      g.sourceName,
        authority: authorityFor(g.sourceName),
        url:       g.sourceUrl,
      })),
    };
    await indexEvent(event);
    if (!topEventForToast || confidence > topEventForToast.confidence) topEventForToast = event;
  }

  return {
    ok: true,
    summary: `composed ${rowsWritten} event(s) from ${buckets.length} bucket(s)`,
    rowsWritten,
  };
}
