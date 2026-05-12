// glassdoorWorker.ts
// Scrapes Glassdoor company overview page for overall rating, CEO approval,
// recommend-to-friend %, and review count. Low frequency (weekly per company)
// because the underlying signals are lagging indicators.
//
// Glassdoor blocks aggressive scraping. We mitigate the same way as LinkedIn:
//   - Polite delays
//   - Rotated UA via playwrightPool
//   - Single instance
//   - Detect block markers and surface as error_kind for the alarm

import { withPage, jitter } from '../sources/playwrightPool.js';
import { getSupabase } from '../lib/supabaseClient.js';
import { dedupeKey } from '../lib/dedupe.js';
import type { JobPayload, JobResult } from '../lib/types.js';

interface GlassdoorSnapshot {
  overallRating: number | null;     // 1.0 – 5.0
  ceoApprovalPct: number | null;    // 0 – 100
  recommendPct:   number | null;
  reviewCount:    number | null;
  blocked: boolean;
}

async function scrapeGlassdoorCompany(slug: string): Promise<GlassdoorSnapshot> {
  return withPage(async (page) => {
    const url = `https://www.glassdoor.com/Overview/Working-at-${slug}-EI_IE${slug}.htm`;
    await jitter(4_000, 9_000);
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
    } catch {
      return { overallRating: null, ceoApprovalPct: null, recommendPct: null, reviewCount: null, blocked: true };
    }

    const blocked = await page.evaluate(() => {
      const html = document.documentElement.innerHTML.toLowerCase();
      return html.includes('verify you are a human') || html.includes('access denied') || html.includes('captcha');
    });
    if (blocked) {
      return { overallRating: null, ceoApprovalPct: null, recommendPct: null, reviewCount: null, blocked: true };
    }

    // Selectors change frequently — we use multiple fallbacks. Numbers are
    // pulled from data-test attributes when present, otherwise from inner text.
    const extracted = await page.evaluate(() => {
      const text = (sel: string) => document.querySelector(sel)?.textContent?.trim() ?? '';
      const num = (s: string): number | null => {
        const m = s.match(/(\d+(?:\.\d+)?)/);
        return m ? parseFloat(m[1]) : null;
      };
      return {
        rating:    num(text('[data-test="rating-headline"]') || text('.ratingNumber')),
        ceo:       num(text('[data-test="ceo-rating"]')      || text('.ceoRatingPercentage')),
        recommend: num(text('[data-test="recommend"]')        || text('.recommendNumber')),
        reviews:   num(text('[data-test="reviewCount"]')      || text('.reviewCount') || document.title),
      };
    });

    return {
      overallRating:  extracted.rating  && extracted.rating  <= 5 ? extracted.rating  : null,
      ceoApprovalPct: extracted.ceo     && extracted.ceo     <= 100 ? Math.round(extracted.ceo) : null,
      recommendPct:   extracted.recommend && extracted.recommend <= 100 ? Math.round(extracted.recommend) : null,
      reviewCount:    extracted.reviews ?? null,
      blocked: false,
    };
  }, { timeoutMs: 35_000 });
}

export async function glassdoorWorker(payload: JobPayload): Promise<JobResult> {
  const company = payload.companyName;
  const slug = (payload.metadata?.glassdoorSlug as string | undefined)
    ?? company.replace(/\s+/g, '-');
  if (!company || !slug) return { ok: false, errorKind: 'parse_error', errorMessage: 'companyName + glassdoorSlug required' };

  let snap: GlassdoorSnapshot;
  try {
    snap = await scrapeGlassdoorCompany(slug);
  } catch (err: any) {
    if (err?.name === 'TimeoutError') return { ok: false, errorKind: 'timeout', errorMessage: err.message };
    return { ok: false, errorKind: 'parse_error', errorMessage: err?.message ?? String(err) };
  }

  if (snap.blocked) return { ok: false, errorKind: 'captcha', errorMessage: 'Glassdoor blocked or captcha' };
  if (snap.overallRating === null) {
    return { ok: false, errorKind: 'parse_error', errorMessage: 'no rating found — selectors may have shifted' };
  }

  const sb = getSupabase();

  // Compute delta vs prior snapshot
  const { data: prev } = await sb
    .from('glassdoor_snapshots')
    .select('overall_rating')
    .eq('company_name', company)
    .order('snapshot_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const prevRating = (prev as any)?.overall_rating ?? null;
  const deltaRating = (prevRating != null && snap.overallRating != null)
    ? +(snap.overallRating - prevRating).toFixed(2)
    : null;

  const { error } = await sb.from('glassdoor_snapshots').insert({
    company_name:     company,
    glassdoor_slug:   slug,
    overall_rating:   snap.overallRating,
    ceo_approval_pct: snap.ceoApprovalPct,
    recommend_pct:    snap.recommendPct,
    review_count:     snap.reviewCount,
    delta_rating:     deltaRating,
  });
  if (error) return { ok: false, errorKind: 'parse_error', errorMessage: error.message };

  payload.dedupeKey = dedupeKey({
    company, source: 'glassdoor',
    date: new Date().toISOString().slice(0, 10),
  });

  return {
    ok: true,
    summary: `glassdoor rating=${snap.overallRating} (Δ${deltaRating ?? 'n/a'})`,
    rowsWritten: 1,
  };
}
