// warnActConnector.ts
// US Worker Adjustment and Retraining Notification (WARN) Act notices.
//
// DATA FLOW (three-tier, in priority order):
//
//  Tier 1 — Supabase `warn_filings` table (PRIMARY)
//    Populated by the `warn-act-fetch` Edge Function (runs every 6 hours via
//    pg_cron). Covers CA, NY, WA, TX, NJ — approximately 56% of US tech
//    employment. When the Edge Function has run recently, this is the fastest
//    and most complete path.
//
//  Tier 2 — External mirror URLs (FALLBACK)
//    Configurable via VITE_WARN_DATA_URLS (comma-separated list). Intended for
//    self-hosted mirrors of the aggregated WARN dataset. Skipped when the list
//    is empty (default), but present for deployments that maintain their own
//    WARN data mirror.
//
//  Tier 3 — Not-configured (HONEST FAILURE)
//    When both tiers fail, returns `warnDataReachable: false` explicitly.
//    Callers display a "WARN data unavailable" badge rather than silently
//    treating absence of filings as "no layoffs". This is intentional — it
//    distinguishes "no WARN filing found" from "WARN DB unreachable".

import { supabase } from '../../utils/supabase';

export interface WarnNotice {
  companyName: string;
  filedAt: string;
  effectiveDate: string | null;
  affectedCount: number | null;
  state: string;
  source: string;
}

export interface WarnSummary {
  company: string;
  notices: WarnNotice[];
  mostRecentFiling: string | null;
  totalAffected: number;
  warnDataReachable: boolean;
  sourceUrl: string | null;
  fetchedAt: string;
}

// ── Tier 2: mirror URL list ───────────────────────────────────────────────────
const DEFAULT_WARN_URLS: string[] = [];

function getWarnUrls(): string[] {
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      const env = (import.meta as any).env.VITE_WARN_DATA_URLS;
      if (typeof env === 'string' && env.trim().length > 0) {
        return env.split(',').map((s: string) => s.trim()).filter(Boolean);
      }
    }
  } catch { /* non-Vite runtime */ }
  return DEFAULT_WARN_URLS;
}

// ── Name matching ─────────────────────────────────────────────────────────────
function companyNameMatch(noticeCompany: string, query: string): boolean {
  const a = noticeCompany.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').trim();
  const b = query.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').trim();
  if (b.length < 4) return false;
  const re = new RegExp(`(^|\\s)${b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$)`);
  return re.test(a);
}

function parseNotices(raw: any, query: string, sourceUrl: string): WarnNotice[] {
  const arr: any[] = Array.isArray(raw) ? raw : Array.isArray(raw?.notices) ? raw.notices : [];
  const out: WarnNotice[] = [];
  for (const n of arr) {
    const company = String(n?.company ?? n?.companyName ?? '');
    if (!company || !companyNameMatch(company, query)) continue;
    const affectedRaw = n?.affected ?? n?.affectedCount ?? n?.workers;
    out.push({
      companyName: company,
      filedAt: String(n?.filedAt ?? n?.noticeDate ?? '').slice(0, 10),
      effectiveDate: n?.effectiveDate ? String(n.effectiveDate).slice(0, 10) : null,
      affectedCount: typeof affectedRaw === 'number' ? affectedRaw : null,
      state: String(n?.state ?? '').toUpperCase(),
      source: String(n?.source ?? sourceUrl),
    });
  }
  return out;
}

// ── Tier 1: read from warn_filings Supabase table ─────────────────────────────
async function fetchFromDatabase(company: string): Promise<{ notices: WarnNotice[]; reachable: boolean }> {
  try {
    // Use ilike with word-boundary-ish pattern. The WARN filings table stores
    // the legal company name as filed (e.g. "Apple Inc.", "Meta Platforms Inc").
    // We search for the company name as a substring; short names (<4 chars)
    // are skipped to avoid false positives.
    if (company.trim().length < 4) return { notices: [], reachable: false };

    const { data, error } = await supabase
      .from('warn_filings')
      .select('company_name, filing_state, filed_date, layoff_date, affected_count, source_url')
      .ilike('company_name', `%${company.replace(/[%_]/g, '\\$&')}%`)
      .order('filed_date', { ascending: false })
      .limit(50);

    if (error) {
      // Table may not exist yet if warn-act-fetch EF hasn't run; not a hard error.
      console.info('[WarnAct] warn_filings query failed (table may not exist yet):', error.message);
      return { notices: [], reachable: false };
    }

    // Map DB rows to WarnNotice shape. `layoff_date` from warn_filings is the
    // planned effective layoff date; expose it under WarnNotice.effectiveDate
    // to keep the existing contract with callers stable.
    const notices: WarnNotice[] = (data ?? []).map((row: any) => ({
      companyName:  row.company_name,
      filedAt:      String(row.filed_date ?? '').slice(0, 10),
      effectiveDate: row.layoff_date ? String(row.layoff_date).slice(0, 10) : null,
      affectedCount: typeof row.affected_count === 'number' ? row.affected_count : null,
      state:        String(row.filing_state ?? '').toUpperCase(),
      source:       String(row.source_url ?? 'warn_filings'),
    }));

    return { notices, reachable: true };
  } catch (err: any) {
    console.info('[WarnAct] DB read failed:', err?.message);
    return { notices: [], reachable: false };
  }
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function fetchWarnNotices(company: string): Promise<WarnSummary> {
  const fetchedAt = new Date().toISOString();

  // ── Tier 1: Supabase warn_filings table ───────────────────────────────────
  const { notices: dbNotices, reachable: dbReachable } = await fetchFromDatabase(company);
  if (dbReachable && dbNotices.length >= 0) {
    // "reachable: true" means the table responded even if there are 0 rows.
    // Return immediately — DB is authoritative and avoids extra network calls.
    dbNotices.sort((a, b) => (a.filedAt < b.filedAt ? 1 : -1));
    const totalAffected = dbNotices.reduce((sum, n) => sum + (n.affectedCount ?? 0), 0);
    return {
      company,
      notices: dbNotices.slice(0, 25),
      mostRecentFiling: dbNotices[0]?.filedAt ?? null,
      totalAffected,
      warnDataReachable: true,
      sourceUrl: 'supabase:warn_filings',
      fetchedAt,
    };
  }

  // ── Tier 2: external mirror URLs ─────────────────────────────────────────
  const urls = getWarnUrls();
  if (urls.length === 0) {
    return {
      company, notices: [], mostRecentFiling: null, totalAffected: 0,
      warnDataReachable: false, sourceUrl: null, fetchedAt,
    };
  }

  let warnDataReachable = false;
  let sourceUrl: string | null = null;
  let notices: WarnNotice[] = [];

  for (const url of urls) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) continue;
      warnDataReachable = true;
      sourceUrl = url;
      const json = await res.json();
      notices = parseNotices(json, company, url);
      break;
    } catch { /* try next mirror */ }
  }

  notices.sort((a, b) => (a.filedAt < b.filedAt ? 1 : -1));
  const totalAffected = notices.reduce((sum, n) => sum + (n.affectedCount ?? 0), 0);

  return {
    company,
    notices: notices.slice(0, 25),
    mostRecentFiling: notices[0]?.filedAt ?? null,
    totalAffected,
    warnDataReachable,
    sourceUrl,
    fetchedAt,
  };
}

export function isWarnDatasetConfigured(): boolean {
  return getWarnUrls().length > 0;
}
