// scraper-enqueue/index.ts
// Edge Function triggered by pg_cron every 10 minutes. Reads the
// `due_for_scrape` view (companies whose poll_freq_min has elapsed),
// batches per-source scrape jobs, HMAC-signs them, and POSTs to the
// Fly.io scraper at /enqueue.
//
// Why an EF and not pg_net direct: we need HMAC signing and dedupe-key
// derivation, both of which are awkward in plpgsql. The EF is the natural
// boundary between schedule (pg_cron) and execution (Fly.io BullMQ).

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { encodeHex } from 'jsr:@std/encoding/hex';

interface DueCompany {
  company_name:    string;
  priority:        'top50' | 'top500' | 'on_demand';
  poll_freq_min:   number;
  ticker:          string | null;
  cik:             string | null;
  careers_url:     string | null;
  linkedin_slug:   string | null;
  glassdoor_slug:  string | null;
  github_org:      string | null;
  reddit_keywords: string[] | null;
  last_scraped_at: string | null;
  minutes_since_last: number;
}

type JobType =
  | 'careerPageScrape' | 'linkedinJobs' | 'newsExtract' | 'secEdgarPoll'
  | 'layoffTracker' | 'warnActFetch' | 'redditMentions' | 'githubActivity'
  | 'glassdoorScrape' | 'signalCompose';

interface JobPayload {
  type:        JobType;
  companyName: string;
  ticker?:     string;
  cik?:        string;
  targetUrl?:  string;
  dedupeKey?:  string;
  /** 'background' (cron polls) or 'audit_blocking' (user-triggered audit-time scrape).
   *  audit_blocking gets BullMQ priority=1 and 5-attempt/3s-backoff retries (vs the
   *  background default of 3 attempts at 60s backoff). */
  priority?:   'background' | 'audit_blocking';
  metadata?:   Record<string, unknown>;
}

const FLY_SCRAPER_URL  = Deno.env.get('FLY_SCRAPER_URL') ?? '';
const HMAC_SECRET      = Deno.env.get('HMAC_SHARED_SECRET') ?? '';
const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_KEY     = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const MAX_COMPANIES_PER_BATCH = 25;

async function hmacSign(timestamp: number, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(HMAC_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${timestamp}.${body}`),
  );
  return encodeHex(new Uint8Array(signature));
}

/**
 * Build the per-company job list based on which fields are populated.
 * Companies with `ticker`/`cik` get SEC EDGAR. Companies with `careers_url`
 * get Playwright snapshots. Companies with `linkedin_slug` get LinkedIn.
 * All companies get news + reddit + layoff-tracker polls.
 */
function jobsForCompany(c: DueCompany): JobPayload[] {
  const jobs: JobPayload[] = [];

  // Always-on (low risk, high value)
  jobs.push({ type: 'newsExtract',     companyName: c.company_name });
  jobs.push({ type: 'redditMentions',  companyName: c.company_name });
  jobs.push({ type: 'layoffTracker',   companyName: c.company_name });

  // SEC EDGAR — only when CIK known (US public companies)
  if (c.cik) jobs.push({ type: 'secEdgarPoll', companyName: c.company_name, cik: c.cik });

  // WARN — US-only; trigger when we have a CIK as a proxy for "US public"
  if (c.cik) jobs.push({ type: 'warnActFetch', companyName: c.company_name });

  // Browser-based — only when the slug is known
  if (c.careers_url) {
    jobs.push({
      type: 'careerPageScrape',
      companyName: c.company_name,
      targetUrl: c.careers_url,
      metadata: { careersUrl: c.careers_url },
    });
  }
  if (c.linkedin_slug && c.priority === 'top50') {
    // LinkedIn gated to top50 only — high blocking risk
    jobs.push({
      type: 'linkedinJobs',
      companyName: c.company_name,
      metadata: { linkedinSlug: c.linkedin_slug },
    });
  }
  if (c.github_org) {
    jobs.push({
      type: 'githubActivity',
      companyName: c.company_name,
      metadata: { githubOrg: c.github_org },
    });
  }
  // Glassdoor — top50 only, weekly cadence (we don't enforce that here; the
  // dedupe_key + 7-day backoff in the worker handle it)
  if (c.glassdoor_slug && c.priority === 'top50') {
    jobs.push({
      type: 'glassdoorScrape',
      companyName: c.company_name,
      metadata: { glassdoorSlug: c.glassdoor_slug },
    });
  }

  return jobs;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response('method not allowed', { status: 405 });
  }

  if (!FLY_SCRAPER_URL || !HMAC_SECRET) {
    return Response.json(
      { error: 'FLY_SCRAPER_URL or HMAC_SHARED_SECRET not set in Edge Function secrets' },
      { status: 500 },
    );
  }

  // ── Optional override body: { companies: [...], priority?: 'background'|'audit_blocking' }
  // The audit pipeline passes priority='audit_blocking' so BullMQ workers prioritize
  // and use the faster retry schedule (5 attempts, 3s exponential backoff).
  let overrideCompanies: string[] | null = null;
  let requestedPriority: 'background' | 'audit_blocking' = 'background';
  try {
    if (req.method === 'POST' && req.headers.get('content-type')?.includes('application/json')) {
      const body = await req.json();
      if (Array.isArray(body?.companies)) overrideCompanies = body.companies;
      if (body?.priority === 'audit_blocking') requestedPriority = 'audit_blocking';
    }
  } catch { /* ignore */ }

  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false },
  });

  // ── Read companies to scrape ─────────────────────────────────────────────
  let due: DueCompany[];
  if (overrideCompanies && overrideCompanies.length > 0) {
    // Override path = on-demand trigger from the frontend audit flow. Companies
    // typed by users won't be pre-seeded in tracked_companies — we have to be
    // permissive and build a safe minimum job set anyway. If a company was
    // already seeded we use its richer metadata; otherwise we register it
    // on-demand and synthesise a minimal record.
    // Subset of DueCompany returned by the select — minutes_since_last is added below
    type TrackedRow = Omit<DueCompany, 'minutes_since_last'>;

    const { data: known, error } = await sb
      .from('tracked_companies')
      .select('company_name, priority, poll_freq_min, ticker, cik, careers_url, linkedin_slug, glassdoor_slug, github_org, reddit_keywords, last_scraped_at')
      .in('company_name', overrideCompanies)
      .returns<TrackedRow[]>();
    if (error) return Response.json({ error: error.message }, { status: 500 });

    const knownRows: TrackedRow[] = known ?? [];
    const knownNames = new Set(knownRows.map(r => r.company_name.toLowerCase()));
    const unknown = overrideCompanies.filter(c => !knownNames.has(c.toLowerCase()));

    // Auto-register unknown companies as on_demand with a weekly poll cadence.
    // The high poll_freq_min (10080 = 7 days) means the cron path won't pick
    // them up aggressively, but the on-demand trigger still fires now.
    if (unknown.length > 0) {
      const newRows = unknown.map(name => ({
        company_name:    name,
        priority:        'on_demand',
        poll_freq_min:   10_080, // 7 days
        last_scraped_at: null,
      }));
      const { error: insertErr } = await sb
        .from('tracked_companies')
        .upsert(newRows, { onConflict: 'company_name', ignoreDuplicates: true });
      if (insertErr) {
        console.warn('[scraper-enqueue] auto-register failed:', insertErr.message);
        // Non-fatal — we still build jobs below using the synthetic records
      }
    }

    // Build the synthesised record list: known companies use real metadata,
    // unknown ones get a minimal placeholder (just the name).
    const synthesised: DueCompany[] = [
      ...knownRows.map(r => ({ ...r, minutes_since_last: 9999 })),
      ...unknown.map(name => ({
        company_name:    name,
        priority:        'on_demand' as const,
        poll_freq_min:   10_080,
        ticker:          null,
        cik:             null,
        careers_url:     null,
        linkedin_slug:   null,
        glassdoor_slug:  null,
        github_org:      null,
        reddit_keywords: null,
        last_scraped_at: null,
        minutes_since_last: 9999,
      })),
    ];
    due = synthesised;
  } else {
    const { data, error } = await sb
      .from('due_for_scrape')
      .select('*')
      .order('minutes_since_last', { ascending: false })
      .limit(MAX_COMPANIES_PER_BATCH);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    due = (data ?? []) as DueCompany[];
  }

  if (due.length === 0) {
    return Response.json({ ok: true, queued: 0, message: 'no companies due for scrape' });
  }

  // ── Build job payload ─────────────────────────────────────────────────────
  const jobs: JobPayload[] = [];
  for (const c of due) jobs.push(...jobsForCompany(c));

  if (jobs.length === 0) {
    return Response.json({ ok: true, queued: 0, message: 'no jobs generated' });
  }

  // v32: stamp every job with the requested priority. The Fly.io worker reads
  // this in queues.ts to pick BullMQ priority + retry config.
  for (const job of jobs) {
    job.priority = requestedPriority;
    // Compute dedupe key client-side so we can insert the queued scrape_jobs row
    // BEFORE the worker picks the job up. Without a dedupe key, the queued row
    // would orphan and the awaitLiveQuorum poller would never see queued/running
    // states (only terminal). The worker-side dedupe logic already handles same-key
    // upserts so this is safe.
    if (!job.dedupeKey) {
      const today = new Date().toISOString().slice(0, 10);
      job.dedupeKey = `${job.type}|${job.companyName}|${today}|${requestedPriority}`;
    }
  }

  // v32: insert `queued` scrape_jobs rows immediately so awaitLiveQuorum can see
  // progress before workers even start. ignoreDuplicates: a re-enqueue within the
  // same day won't overwrite an existing running/terminal row.
  if (requestedPriority === 'audit_blocking') {
    try {
      const queuedRows = jobs.map(j => ({
        job_type:       j.type,
        company_name:   j.companyName,
        target_url:     j.targetUrl ?? null,
        status:         'queued',
        error_kind:     null,
        duration_ms:    null,
        enqueued_at:    new Date().toISOString(),
        started_at:     null,
        finished_at:    null,
        priority:       'audit_blocking',
        result_summary: null,
        dedupe_key:     j.dedupeKey,
      }));
      await sb
        .from('scrape_jobs')
        .upsert(queuedRows, { onConflict: 'dedupe_key', ignoreDuplicates: true });
    } catch (e) {
      // Best-effort: never fail the enqueue because the progress row didn't write.
      console.warn('[scraper-enqueue] queued-row insert failed:', e instanceof Error ? e.message : String(e));
    }
  }

  // ── HMAC-sign and POST to Fly.io scraper ──────────────────────────────────
  const body = JSON.stringify({ jobs });
  const timestamp = Date.now();
  const signature = await hmacSign(timestamp, body);

  try {
    const res = await fetch(`${FLY_SCRAPER_URL.replace(/\/$/, '')}/enqueue`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'X-HP-Timestamp': String(timestamp),
        'X-HP-Signature': signature,
      },
      body,
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const text = await res.text();
      return Response.json(
        { error: `scraper rejected: HTTP ${res.status}`, detail: text.slice(0, 500) },
        { status: 502 },
      );
    }

    const remote = await res.json().catch(() => ({}));
    return Response.json({
      ok: true,
      companiesDue: due.length,
      jobsBuilt:    jobs.length,
      remote,
      fetchedAt:    new Date().toISOString(),
    });
  } catch (err: any) {
    return Response.json(
      { error: `scraper unreachable: ${err?.message ?? String(err)}` },
      { status: 503 },
    );
  }
});
