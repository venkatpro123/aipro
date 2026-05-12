// linkedinWorker.ts
// Scrapes LinkedIn's company-jobs page for the visible "open jobs" count.
// HIGH BLOCKING RISK — LinkedIn aggressively rate-limits and serves CAPTCHA
// to non-authenticated traffic. We mitigate with:
//   1. Polite delays (5–15s pre-navigation)
//   2. Rotated user-agents (handled by playwrightPool)
//   3. Single Chromium instance — never parallelise LinkedIn
//   4. /jobs (anonymous public page) — NOT the OAuth-only views
//   5. Gracefully bail on captcha/429 markers and record error_kind so the
//      block-rate alarm fires before quota is exhausted.
//
// For MVP, LinkedIn is *gated to ≤10 companies* via tracked_companies.priority.
// If block rate >5%, operators can disable it via a feature flag or move to
// Bright Data residential proxies (Phase 5).

import { withPage, jitter } from '../sources/playwrightPool.js';
import { getSupabase } from '../lib/supabaseClient.js';
import { dedupeKey, quickHash } from '../lib/dedupe.js';
import type { JobPayload, JobResult } from '../lib/types.js';

interface LinkedInResult {
  openJobs: number;
  topRoles: { role: string; count: number }[];
  blocked: boolean;
  blockReason?: 'captcha' | '429' | 'login_wall';
}

async function scrapeLinkedInCompanyJobs(slug: string): Promise<LinkedInResult> {
  return withPage(async (page) => {
    // /company/<slug>/jobs is the public anonymous view. Numbers shown here
    // are not user-personalised, so we don't need auth.
    const url = `https://www.linkedin.com/company/${slug}/jobs/`;

    await jitter(5_000, 15_000);   // polite delay

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
    } catch {
      return { openJobs: 0, topRoles: [], blocked: true, blockReason: 'login_wall' };
    }

    // Detect block-states early
    const blockProbe = await page.evaluate(() => ({
      title: document.title,
      hasCaptcha: !!document.querySelector('iframe[src*="captcha"]'),
      hasLoginWall: !!document.querySelector('[data-tracking-control-name="public_jobs_contextual-sign-in"]'),
      bodyText: (document.body?.innerText ?? '').slice(0, 800),
    }));

    if (blockProbe.hasCaptcha) {
      return { openJobs: 0, topRoles: [], blocked: true, blockReason: 'captcha' };
    }
    // LinkedIn shows a login wall for anonymous users on some pages but the
    // jobs widget remains scrapable — we only flag this as blocked when the
    // numeric job count badge isn't found below.

    // Read the job-count badge. LinkedIn's selectors change frequently — fall
    // through a small ordered list.
    const openJobs = await page.evaluate(() => {
      const candidates = [
        '.org-jobs-recently-posted-jobs-module__show-all-jobs-btn',
        '.org-jobs-job-search-form-module__title',
        '[data-test-id="jobs-search-count"]',
        '.jobs-search-results-list__title-heading',
      ];
      for (const sel of candidates) {
        const el = document.querySelector(sel);
        const text = el?.textContent ?? '';
        const m = text.match(/(\d[\d,]+)/);
        if (m) return parseInt(m[1].replace(/,/g, ''), 10);
      }
      // Fallback: count "Apply" buttons visible on page
      return document.querySelectorAll('a[href*="/jobs/view/"]').length;
    });

    // Top roles: count role-title elements by frequency
    const topRoles = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('a[href*="/jobs/view/"]'));
      const counts = new Map<string, number>();
      for (const el of items) {
        const title = (el.textContent ?? '').trim();
        if (!title || title.length > 80) continue;
        // Normalise to first 4 words to dedupe role-level variants
        const key = title.toLowerCase().split(/\s+/).slice(0, 4).join(' ');
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      return Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([role, count]) => ({ role, count }));
    });

    if (openJobs === 0 && blockProbe.hasLoginWall) {
      return { openJobs: 0, topRoles: [], blocked: true, blockReason: 'login_wall' };
    }

    return { openJobs, topRoles, blocked: false };
  }, { timeoutMs: 35_000 });
}

export async function linkedinWorker(payload: JobPayload): Promise<JobResult> {
  const company = payload.companyName;
  const slug = (payload.metadata?.linkedinSlug as string | undefined)
    ?? company.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/^-|-$/g, '');
  if (!company || !slug) return { ok: false, errorKind: 'parse_error', errorMessage: 'companyName + linkedinSlug required' };

  let result: LinkedInResult;
  try {
    result = await scrapeLinkedInCompanyJobs(slug);
  } catch (err: any) {
    if (err?.name === 'TimeoutError') return { ok: false, errorKind: 'timeout', errorMessage: err.message };
    return { ok: false, errorKind: 'parse_error', errorMessage: err?.message ?? String(err) };
  }

  if (result.blocked) {
    return {
      ok: false,
      errorKind: result.blockReason === 'captcha' ? 'captcha' : '429',
      errorMessage: `LinkedIn blocked: ${result.blockReason}`,
    };
  }

  const sb = getSupabase();

  // Fetch prior snapshot for delta
  const { data: prev } = await sb
    .from('linkedin_company_snapshots')
    .select('open_jobs_count')
    .eq('company_name', company)
    .order('snapshot_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const prevCount: number | null = (prev as any)?.open_jobs_count ?? null;
  const deltaPct = (prevCount != null && prevCount > 0)
    ? Math.round(((result.openJobs - prevCount) / prevCount) * 100)
    : null;

  const responseHash = quickHash(`${result.openJobs}|${result.topRoles.map(r => r.role).join('|')}`);

  const { error } = await sb.from('linkedin_company_snapshots').insert({
    company_name:    company,
    linkedin_slug:   slug,
    open_jobs_count: result.openJobs,
    top_roles:       result.topRoles,
    delta_pct_vs_prev: deltaPct,
    raw_response_hash: responseHash,
  });
  if (error) return { ok: false, errorKind: 'parse_error', errorMessage: error.message };

  payload.dedupeKey = dedupeKey({
    company, source: 'linkedin',
    date: new Date().toISOString().slice(0, 10),
    contentHash: responseHash,
  });

  return {
    ok: true,
    summary: `linkedin open=${result.openJobs} (Δ${deltaPct ?? 'n/a'}%)`,
    rowsWritten: 1,
  };
}
