// warnActWorker.ts
// Downloads the CA EDD WARN Act XLSX (updated weekly, ~130KB) and matches
// the target company. Returns rows for the warn_filings table.
//
// The HTML page at /layoff_services_warn/ is JavaScript-rendered (IIS/ASP.NET)
// so a plain fetch gets no table data. The XLSX linked from that page IS
// statically hosted and always fresh — last-modified is confirmed server-side.
//
// XLSX format (CA EDD warn_report1.xlsx, as of 2026):
//   Col A: Notice Date  (MM/DD/YYYY)
//   Col B: Effective Date
//   Col C: Received Date
//   Col D: Company
//   Col E: City
//   Col F: No. Of Employees Affected
//   Col G: Layoff/Closure
//   Col H: Union
//   Col I: Temp/Perm
//   Col J: WARN Id
//   Col K: Industry
//   Col L: Remarks

import * as XLSX from 'xlsx';
import { getSupabase } from '../lib/supabaseClient.js';
import { dedupeKey } from '../lib/dedupe.js';
import type { JobPayload, JobResult } from '../lib/types.js';

const EDD_XLSX_URL = 'https://edd.ca.gov/siteassets/files/jobs_and_training/warn/warn_report1.xlsx';

interface WarnRow {
  noticeDate:    string;   // YYYY-MM-DD
  effectiveDate: string | null;
  company:       string;
  city:          string;
  affected:      number | null;
  eventType:     string;   // 'Layoff' | 'Closure' | ...
}

function excelDateToISO(val: any): string | null {
  if (!val) return null;
  // Excel serial number → JS Date
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val);
    if (!d) return null;
    return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }
  // Already a string like "01/15/2026"
  if (typeof val === 'string') {
    const m = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
  }
  return null;
}

function parseXlsx(buffer: ArrayBuffer): WarnRow[] {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: false });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return [];

  // sheet_to_json uses first row as headers; rawDates:false keeps serial numbers
  const raw = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });

  return raw.map((r): WarnRow | null => {
    // Normalise header names — EDD header row has some variation year to year
    const keys = Object.keys(r);
    const get = (patterns: RegExp) =>
      r[keys.find(k => patterns.test(k.toLowerCase())) ?? ''] ?? '';

    const company    = String(get(/company|employer/)).trim();
    const noticeDateRaw = get(/notice.?date/);
    const noticeDate = excelDateToISO(noticeDateRaw);
    const effRaw     = get(/effective.?date/);
    const affRaw     = get(/affected|employees/);
    const city       = String(get(/city/)).trim();
    const eventType  = String(get(/layoff|closure|type/)).trim() || 'Layoff';

    if (!company || !noticeDate) return null;

    return {
      noticeDate,
      effectiveDate: excelDateToISO(effRaw),
      company,
      city,
      affected: affRaw !== '' ? parseInt(String(affRaw).replace(/,/g, ''), 10) || null : null,
      eventType,
    };
  }).filter((r): r is WarnRow => r !== null);
}

export async function warnActWorker(payload: JobPayload): Promise<JobResult> {
  const company = payload.companyName;
  if (!company || company.length < 4) {
    return { ok: false, errorKind: 'parse_error', errorMessage: 'companyName too short' };
  }

  // 1. Download the XLSX (statically hosted — CDN-cached, fast)
  let buffer: ArrayBuffer;
  try {
    const res = await fetch(EDD_XLSX_URL, {
      headers: { 'User-Agent': 'humansheild-scraper (contact@humanproof.ai)' },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      return { ok: false, errorKind: 'network_error', errorMessage: `EDD XLSX HTTP ${res.status}` };
    }
    buffer = await res.arrayBuffer();
  } catch (err: any) {
    if (err?.name === 'TimeoutError') return { ok: false, errorKind: 'timeout', errorMessage: err.message };
    return { ok: false, errorKind: 'network_error', errorMessage: err?.message ?? String(err) };
  }

  // 2. Parse
  let all: WarnRow[];
  try {
    all = parseXlsx(buffer);
  } catch (err: any) {
    return { ok: false, errorKind: 'parse_error', errorMessage: `XLSX parse failed: ${err?.message}` };
  }

  if (all.length === 0) {
    return { ok: false, errorKind: 'parse_error', errorMessage: 'XLSX parsed to 0 rows — format may have changed' };
  }

  // 3. Match company — word-boundary style to avoid "Apple" matching "Snapple"
  const escaped = company.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(^|[\\s,/]|inc|llc|corp)${escaped}([\\s,/]|inc|llc|corp|$)`, 'i');
  const matches = all.filter(n => re.test(n.company) || n.company.toLowerCase() === company.toLowerCase());

  if (matches.length === 0) {
    return { ok: true, summary: `no CA WARN matches for ${company} in ${all.length} rows`, rowsWritten: 0 };
  }

  // 4. Write to warn_filings
  const sb = getSupabase();
  const rows = matches.map(n => ({
    company_name:   n.company,
    filing_state:   'CA',
    filed_date:     n.noticeDate,
    layoff_date:    n.effectiveDate,
    affected_count: n.affected,
    locations:      n.city ? [n.city] : [],
    is_confirmed:   true,
    source_url:     EDD_XLSX_URL,
    raw_text:       null,
  }));

  const { error, data } = await sb
    .from('warn_filings')
    .upsert(rows, { onConflict: 'company_name,filed_date,filing_state', ignoreDuplicates: true })
    .select('id');

  if (error) {
    return { ok: false, errorKind: 'parse_error', errorMessage: error.message };
  }

  payload.dedupeKey = dedupeKey({
    company, source: 'warn_ca_xlsx',
    date: new Date().toISOString().slice(0, 10),
  });

  return {
    ok:          true,
    summary:     `${matches.length} CA WARN matches → ${data?.length ?? 0} new rows (${all.length} total in XLSX)`,
    rowsWritten: data?.length ?? 0,
  };
}
