// githubWorker.ts
// Polls GitHub's REST API for commit + contributor velocity in a company's
// public org. Writes weekly snapshots to public.github_company_activity.
//
// Signal model:
//   - Aggregate commits in last 4 weeks across the org's top 10 repos
//   - Compare against the prior 4-week window
//   - delta_pct_vs_prev < -25 → engineering velocity declining (possible RIF)
//
// Rate limit: 5000 req/hour with PAT. Single company uses ~20 requests
// (1 org list + 10 repo stats). Well within budget.

import { getSupabase } from '../lib/supabaseClient.js';
import { config } from '../lib/config.js';
import { dedupeKey } from '../lib/dedupe.js';
import type { JobPayload, JobResult } from '../lib/types.js';

const GITHUB_BASE = 'https://api.github.com';

function authHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'humansheild-scraper',
  };
  if (config.github.token) headers.Authorization = `Bearer ${config.github.token}`;
  return headers;
}

interface RepoStats {
  full_name: string;
  default_branch: string;
}

async function listOrgRepos(org: string): Promise<RepoStats[]> {
  try {
    const res = await fetch(`${GITHUB_BASE}/orgs/${org}/repos?per_page=20&sort=pushed`, {
      headers: authHeaders(),
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status === 429 || res.status === 403) throw Object.assign(new Error('gh rate-limit'), { _kind: '429' });
    if (!res.ok) return [];
    const data: any = await res.json();
    return Array.isArray(data) ? data.map((r: any) => ({ full_name: r.full_name, default_branch: r.default_branch ?? 'main' })) : [];
  } catch (err: any) {
    if (err?._kind) throw err;
    return [];
  }
}

async function countCommits(repo: string, since: Date, until: Date): Promise<number> {
  // We only need the count, so request a 1-page list and read the Link header
  // for last-page index. For repos with fewer than 100 commits in the window,
  // we count the returned array directly.
  try {
    const url = `${GITHUB_BASE}/repos/${repo}/commits?per_page=100&since=${since.toISOString()}&until=${until.toISOString()}`;
    const res = await fetch(url, { headers: authHeaders(), signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return 0;
    const link = res.headers.get('link') ?? '';
    const lastMatch = link.match(/[?&]page=(\d+)>; rel="last"/);
    if (lastMatch) return parseInt(lastMatch[1], 10) * 100;
    const data: any = await res.json();
    return Array.isArray(data) ? data.length : 0;
  } catch {
    return 0;
  }
}

export async function githubWorker(payload: JobPayload): Promise<JobResult> {
  const company = payload.companyName;
  const org = (payload.metadata?.githubOrg as string | undefined)
    ?? company.toLowerCase().replace(/[^a-z0-9]/g, '');

  let rateLimited = false;
  let repos: RepoStats[] = [];
  try {
    repos = await listOrgRepos(org);
  } catch (err: any) {
    if (err?._kind === '429') rateLimited = true;
  }

  if (repos.length === 0) {
    if (rateLimited) return { ok: false, errorKind: '429', errorMessage: 'GitHub rate-limit' };
    return { ok: true, summary: `no public repos in org "${org}"`, rowsWritten: 0 };
  }

  const top = repos.slice(0, 10);

  const now = new Date();
  const fourWAgo  = new Date(now.getTime() - 28 * 86_400_000);
  const eightWAgo = new Date(now.getTime() - 56 * 86_400_000);

  let commits4w   = 0;
  let prev4w      = 0;
  for (const r of top) {
    commits4w += await countCommits(r.full_name, fourWAgo, now);
    prev4w    += await countCommits(r.full_name, eightWAgo, fourWAgo);
  }

  const deltaPct = prev4w > 0 ? Math.round(((commits4w - prev4w) / prev4w) * 100) : 0;

  const sb = getSupabase();
  const row = {
    company_name:      company,
    github_org:        org,
    repo_full_name:    top.map(r => r.full_name).join(','),
    commits_4w:        commits4w,
    contributors_4w:   null,                              // computed in a later phase
    prev_commits_4w:   prev4w,
    delta_pct_vs_prev: deltaPct,
  };

  const { error } = await sb.from('github_company_activity').insert(row);
  if (error) return { ok: false, errorKind: 'parse_error', errorMessage: error.message };

  payload.dedupeKey = dedupeKey({
    company, source: 'github',
    date: now.toISOString().slice(0, 10),
  });

  return {
    ok: true,
    summary: `commits 4w=${commits4w} (Δ${deltaPct}% vs prev)`,
    rowsWritten: 1,
  };
}
