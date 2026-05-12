// careerPageWorker.ts
// Snapshots a company's careers page, computes a diff against the prior
// snapshot, and emits hiring-velocity signals.
//
// Strategy:
//   1. Playwright loads the careers URL
//   2. Extract all visible job-posting links (heuristic: <a href="*/job*">)
//   3. Compute a stable hash of the job-list set
//   4. Compare against last snapshot for this company
//   5. delta_pct = (current - prev) / prev * 100
//   6. delta < -50%  → hiring_freeze candidate (write to live_signals_v2)
//      delta > +25%  → hiring_surge (positive signal)
//
// Writes raw snapshot to career_page_snapshots (already exists) and any
// derived signal to live_signals_v2.

import { withPage, jitter } from '../sources/playwrightPool.js';
import { getSupabase } from '../lib/supabaseClient.js';
import { dedupeKey, quickHash } from '../lib/dedupe.js';
import type { JobPayload, JobResult } from '../lib/types.js';

interface CareerSnapshot {
  jobCount: number;
  jobUrls: string[];
  contentHash: string;
}

async function extractCareerSnapshot(url: string): Promise<CareerSnapshot> {
  return withPage(async (page) => {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    // Give SPA careers pages a beat to hydrate their job lists
    await jitter(1500, 3000);

    const links: string[] = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a[href]')) as HTMLAnchorElement[];
      const out = new Set<string>();
      for (const a of anchors) {
        const href = a.href;
        if (!href) continue;
        // Heuristic — most careers pages route jobs under /job/, /jobs/, /careers/, /opening/
        if (/\/(job|jobs|career|careers|opening|openings|position|positions|requisition)s?[/?#]/i.test(href)) {
          out.add(href);
        }
      }
      return Array.from(out).slice(0, 500);
    });

    const sortedUrls = [...links].sort();
    const contentHash = quickHash(sortedUrls.join('|'));
    return { jobCount: sortedUrls.length, jobUrls: sortedUrls, contentHash };
  }, { timeoutMs: 45_000 });
}

export async function careerPageWorker(payload: JobPayload): Promise<JobResult> {
  const company = payload.companyName;
  const url = payload.targetUrl ?? (payload.metadata?.careersUrl as string | undefined);
  if (!company || !url) {
    return { ok: false, errorKind: 'parse_error', errorMessage: 'companyName + targetUrl required' };
  }

  let snapshot: CareerSnapshot;
  try {
    snapshot = await extractCareerSnapshot(url);
  } catch (err: any) {
    if (err?.name === 'TimeoutError') return { ok: false, errorKind: 'timeout', errorMessage: err.message };
    return { ok: false, errorKind: 'parse_error', errorMessage: err?.message ?? String(err) };
  }

  const sb = getSupabase();

  // Fetch the previous snapshot for diff
  const { data: prevRow } = await sb
    .from('career_page_snapshots')
    .select('id, job_count, content_hash, snapshot_at')
    .eq('company_name', company)
    .order('snapshot_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const prevCount = (prevRow as any)?.job_count ?? null;
  let deltaPct: number | null = null;
  if (prevCount != null && prevCount > 0) {
    deltaPct = Math.round(((snapshot.jobCount - prevCount) / prevCount) * 100);
  }

  // Skip insert when nothing changed (same content hash) — keeps the table lean
  if ((prevRow as any)?.content_hash === snapshot.contentHash) {
    return { ok: true, summary: `unchanged (hash=${snapshot.contentHash.slice(0, 8)})`, rowsWritten: 0 };
  }

  // 1. Insert raw snapshot. career_page_snapshots already exists; column names
  //    are intentionally lenient — we use a JSONB metadata column to carry
  //    delta_pct since it may not exist in the original schema.
  const { error: snapErr } = await sb.from('career_page_snapshots').insert({
    company_name:  company,
    careers_url:   url,
    job_count:     snapshot.jobCount,
    content_hash:  snapshot.contentHash,
    metadata:      { jobUrls: snapshot.jobUrls.slice(0, 50), deltaPct },
  } as any);

  if (snapErr) {
    // Schema is shared with the existing pipeline — log but don't fail the job
    // for unknown columns. The signal write below still fires.
    console.info('[careerPageWorker] snapshot insert warning:', snapErr.message);
  }

  // 2. Emit a live_signals_v2 row for material deltas
  let signalsWritten = 0;
  if (deltaPct !== null && Math.abs(deltaPct) >= 25) {
    const signalType = deltaPct <= -50 ? 'hiring_freeze'
                     : deltaPct <  -25 ? 'hiring_slowdown'
                     : deltaPct >   25 ? 'hiring_surge'
                     : null;
    if (signalType) {
      const { error: sigErr } = await sb.from('live_signals_v2').insert({
        company_name:     company,
        signal_type:      signalType,
        signal_value:     deltaPct < 0 ? Math.min(1, Math.abs(deltaPct) / 100) : Math.min(1, deltaPct / 100),
        confidence:       0.78,
        decay_rate:       0.03,                  // 3% per day → ~half weight at 23 days
        source_name:      'career_page',
        signal_timestamp: new Date().toISOString(),
        evidence:         { url, prevCount, currentCount: snapshot.jobCount, deltaPct },
      } as any);
      if (!sigErr) signalsWritten = 1;
    }
  }

  payload.dedupeKey = dedupeKey({
    company, source: 'career_page',
    date: new Date().toISOString().slice(0, 10),
    contentHash: snapshot.contentHash,
  });

  return {
    ok: true,
    summary: `jobs=${snapshot.jobCount} (Δ${deltaPct ?? 'n/a'}%) signals=${signalsWritten}`,
    rowsWritten: 1 + signalsWritten,
  };
}
