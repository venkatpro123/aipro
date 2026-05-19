// warn-act-fetch/index.ts — v16.0
// Supabase Edge Function: fetch, parse, and store WARN Act filings.
//
// Invocation (POST):
//   {
//     "states"?:      string[],  // e.g. ["CA","NY","NJ"] — defaults to all three
//     "companyName"?: string     // optional filter: only return rows for this company
//   }
//
// Response:
//   {
//     "inserted": number,
//     "skipped":  number,    // already-present rows (upsert conflict)
//     "errors":   string[]
//   }
//
// Architecture:
//   Each state has its own fetch + parse strategy. Currently only CA is
//   fully implemented (EDD provides a downloadable CSV). All other states
//   log a "not yet implemented" entry and are skipped. Adding a new state
//   only requires registering a handler in STATE_HANDLERS.
//
// Deno std version pinned to 0.168.0 to match other edge functions in this
// repo. Upgrade together when bumping the project-wide std pin.

import { serve }        from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WarnFilingRow {
  company_name:   string;
  filing_state:   string;
  filed_date:     string;   // ISO date string YYYY-MM-DD
  layoff_date:    string | null;
  affected_count: number | null;
  locations:      string[];
  is_confirmed:   boolean;
  source_url:     string | null;
  raw_text:       string | null;
}

interface FetchResult {
  filings: WarnFilingRow[];
  errors:  string[];
}

interface StateHandler {
  (companyFilter?: string): Promise<FetchResult>;
}

// ─── CORS headers (shared) ────────────────────────────────────────────────────

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

// ─── Shared date normaliser ───────────────────────────────────────────────────
// Accepts M/D/YYYY, MM/DD/YYYY, YYYY-MM-DD, and Excel serial numbers.
// Returns YYYY-MM-DD string or today's date as a safe fallback.
function normaliseDate(raw: string): string {
  const cleaned = raw.trim();
  if (!cleaned) return new Date().toISOString().slice(0, 10);

  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned;

  // M/D/YYYY or MM/DD/YYYY
  const slashMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, m, d, y] = slashMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Excel serial (number of days since 1900-01-01 with leap year bug)
  const serial = Number(cleaned);
  if (!isNaN(serial) && serial > 1000 && serial < 100000) {
    const excelEpoch = new Date(1899, 11, 30);
    const d = new Date(excelEpoch.getTime() + serial * 86400000);
    return d.toISOString().slice(0, 10);
  }

  // Best-effort via Date constructor
  const d = new Date(cleaned);
  return isNaN(d.getTime()) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10);
}

// ─── CA WARN handler ──────────────────────────────────────────────────────────
//
// California EDD publishes WARN filings as a CSV-style download.
// Official page: https://edd.ca.gov/en/Jobs_and_Training/Layoff_Services_WARN_Data/
//
// The CSV has the following columns (as of 2025):
//   Notice Date, Effective Date, Received Date, Company, No. Of Employees Affected,
//   Layoff/Closure, County, Exemption, Address
//
// The URL below targets the current fiscal-year extract. Update the URL token
// when EDD rotates it (typically each July). A 404 means the URL needs updating.

const CA_WARN_CSV_URL =
  'https://edd.ca.gov/siteassets/files/jobs_and_training/warn/warn-report-for-7-1-2024-to-present.xlsx';

// EDD also offers the data via their WARN Report Search page — the CSV download
// link is predictable and updated quarterly. If the XLSX link breaks, fall back
// to scraping the HTML search results page instead.
const CA_WARN_HTML_FALLBACK =
  'https://edd.ca.gov/en/Jobs_and_Training/Layoff_Services_WARN_Data/';

/**
 * Parse a California WARN CSV row into a WarnFilingRow.
 * Column order: Notice Date, Effective Date, Received Date, Company,
 *               No. Of Employees Affected, Layoff/Closure, County, Exemption, Address
 */
function parseCaRow(cols: string[], companyFilter?: string): WarnFilingRow | null {
  if (cols.length < 7) return null;

  const [noticeDate, effectiveDate, , company, employeeStr, , county] = cols;
  const companyTrimmed = company.trim();

  if (!companyTrimmed || !noticeDate.trim()) return null;

  if (
    companyFilter &&
    !companyTrimmed.toLowerCase().includes(companyFilter.toLowerCase())
  ) {
    return null;
  }

  // Parse dates: EDD uses M/D/YYYY format
  function parseUsDate(raw: string): string | null {
    const cleaned = raw.trim();
    if (!cleaned) return null;
    const parts = cleaned.split('/');
    if (parts.length !== 3) return null;
    const [m, d, y] = parts;
    return `${y.padStart(4, '20')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  const filedDate   = parseUsDate(noticeDate);
  const layoffDate  = parseUsDate(effectiveDate);

  if (!filedDate) return null;

  const affectedCount = parseInt(employeeStr.replace(/,/g, '').trim(), 10);

  return {
    company_name:   companyTrimmed,
    filing_state:   'CA',
    filed_date:     filedDate,
    layoff_date:    layoffDate,
    affected_count: isNaN(affectedCount) ? null : affectedCount,
    locations:      county.trim() ? [county.trim()] : [],
    is_confirmed:   true,
    source_url:     CA_WARN_CSV_URL,
    raw_text:       cols.join(','),
  };
}

/**
 * Fetch and parse California WARN filings.
 *
 * CA EDD serves the data as an XLSX file. Parsing XLSX in Deno without a
 * native binary is non-trivial, so this implementation:
 *   1. Attempts the XLSX download.
 *   2. Checks the Content-Type — if it comes back as CSV/text, parses it directly.
 *   3. If XLSX (binary), converts column headers to a known-good CSV structure
 *      using the SheetJS-compatible Deno port (https://esm.sh/xlsx). This keeps
 *      the function self-contained without requiring a build step.
 *
 * The SheetJS import is lazy (dynamic) so it does not bloat cold-start time
 * for states that don't call this handler.
 */
async function fetchCaWarn(companyFilter?: string): Promise<FetchResult> {
  const filings: WarnFilingRow[] = [];
  const errors:  string[]        = [];

  let csvText: string | null = null;

  // ── Attempt 1: download as text (EDD sometimes returns TSV) ──────────────
  try {
    const res = await fetch(CA_WARN_CSV_URL, {
      headers: { 'User-Agent': 'HumanProof-WARN-Fetcher/1.0 (data@humanproof.ai)' },
    });

    if (!res.ok) {
      errors.push(`CA: HTTP ${res.status} from ${CA_WARN_CSV_URL}`);
    } else {
      const contentType = res.headers.get('content-type') ?? '';
      const isPlainText =
        contentType.includes('text/') ||
        contentType.includes('csv') ||
        contentType.includes('tab-separated');

      if (isPlainText) {
        csvText = await res.text();
      } else {
        // ── Attempt 2: parse XLSX binary with SheetJS ─────────────────────
        try {
          // Dynamic import keeps cold-start fast for non-CA invocations
          const { read: xlsxRead, utils } = await import(
            'https://esm.sh/xlsx@0.18.5'
          );
          const arrayBuffer = await res.arrayBuffer();
          const workbook  = xlsxRead(new Uint8Array(arrayBuffer), { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          csvText = utils.sheet_to_csv(workbook.Sheets[sheetName]);
        } catch (xlsxErr) {
          errors.push(`CA: XLSX parse failed — ${String(xlsxErr)}`);
        }
      }
    }
  } catch (fetchErr) {
    errors.push(`CA: fetch failed — ${String(fetchErr)}`);
  }

  if (!csvText) {
    errors.push(`CA: no data retrieved; try ${CA_WARN_HTML_FALLBACK}`);
    return { filings, errors };
  }

  // ── Parse CSV / TSV rows ──────────────────────────────────────────────────
  const lines = csvText.split('\n').filter(Boolean);
  // Skip header row
  for (const line of lines.slice(1)) {
    // Handle both comma and tab delimiters
    const cols = line.includes('\t') ? line.split('\t') : splitCsvLine(line);
    const row = parseCaRow(cols, companyFilter);
    if (row) filings.push(row);
  }

  return { filings, errors };
}

/** Minimal RFC 4180-compliant CSV splitter (handles quoted fields). */
function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// ─── NY WARN handler ─────────────────────────────────────────────────────────
// NY DOL publishes WARN data at https://dol.ny.gov/warn-notices
// Resolution order (most reliable → least reliable):
//   1. NY DOL WARN data export (documented CSV endpoint)
//   2. NY DOL internal JSON API (from DevTools network inspection — fragile)
//   3. Graceful degradation: log error, return [] so other states still process
async function fetchNyWarn(companyFilter?: string): Promise<FetchResult> {
  const filings: WarnFilingRow[] = [];
  const errors: string[] = [];

  // ── Primary: documented NY DOL data portal CSV export ───────────────────────
  // https://dol.ny.gov/warn-notices — "Download CSV" link resolves to:
  const csvUrl = 'https://dol.ny.gov/system/files/documents/2024/01/warn-report.csv';
  // The year fragment changes annually. Try current year, fall back to prior year.
  const year = new Date().getFullYear();
  const primaryUrls = [
    `https://dol.ny.gov/system/files/documents/${year}/01/warn-report.csv`,
    `https://dol.ny.gov/system/files/documents/${year - 1}/01/warn-report.csv`,
    csvUrl, // known 2024 fallback
  ];

  let csvText: string | null = null;
  for (const url of primaryUrls) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WARNDataFetcher/1.0)' },
        signal: AbortSignal.timeout(7_000),
      });
      if (res.ok && (res.headers.get('content-type') ?? '').includes('text')) {
        csvText = await res.text();
        if (csvText.trim().length > 100) break;
        csvText = null;
      }
    } catch { /* try next URL */ }
  }

  if (csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length >= 2) {
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      const rows = lines.slice(1).map(line => {
        const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']));
      });
      for (const row of rows) {
        const company = row['Employer'] ?? row['Company'] ?? row['company'] ?? '';
        if (!company) continue;
        if (companyFilter && !company.toLowerCase().includes(companyFilter.toLowerCase())) continue;
        const filedRaw  = row['Notice Date'] ?? row['filed_date'] ?? '';
        const layoffRaw = row['Effective Date'] ?? row['layoff_date'] ?? '';
        const count     = parseInt(row['Number Affected'] ?? row['affected_count'] ?? '0', 10);
        const location  = row['Location'] ?? row['City'] ?? '';
        filings.push({
          company_name: company.trim(), filing_state: 'NY',
          filed_date: normaliseDate(filedRaw), layoff_date: layoffRaw ? normaliseDate(layoffRaw) : null,
          affected_count: isNaN(count) ? null : count,
          locations: location ? [location.trim()] : [],
          is_confirmed: false, source_url: primaryUrls[0], raw_text: null,
        });
      }
      if (filings.length > 0) return { filings, errors };
    }
  }

  // ── Fallback: NY DOL internal API (fragile, may change without notice) ──────
  try {
    // NY DOL internal API (identified from network inspection, may change)
    const url = 'https://dol.ny.gov/warn-notices-data';
    const resp = await fetch(url, {
      headers: {
        'Accept': 'application/json, text/csv, */*',
        'User-Agent': 'Mozilla/5.0 (compatible; WARNDataFetcher/1.0)',
      },
      signal: AbortSignal.timeout(8_000),
    });

    if (!resp.ok) {
      errors.push(`NY: all endpoints failed (CSV: no data, internal API: ${resp.status})`);
      return { filings, errors };
    }

    const contentType = resp.headers.get('content-type') ?? '';
    let rows: Array<Record<string, string>> = [];

    if (contentType.includes('application/json')) {
      const json = await resp.json() as unknown;
      rows = Array.isArray(json) ? json as Array<Record<string, string>> : [];
    } else {
      // Try CSV fallback
      const text = await resp.text();
      const lines = text.trim().split('\n');
      if (lines.length < 2) {
        errors.push('NY: response was empty or not parseable');
        return { filings, errors };
      }
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      rows = lines.slice(1).map(line => {
        const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']));
      });
    }

    for (const row of rows) {
      // NY field names (approximate — adjust if endpoint format differs)
      const company = row['Employer'] ?? row['company'] ?? row['Company'] ?? '';
      if (!company) continue;
      if (companyFilter && !company.toLowerCase().includes(companyFilter.toLowerCase())) continue;

      const filedRaw = row['Notice Date'] ?? row['filed_date'] ?? '';
      const layoffRaw = row['Effective Date'] ?? row['layoff_date'] ?? '';
      const count = parseInt(row['Number Affected'] ?? row['affected_count'] ?? '0', 10);
      const location = row['Location'] ?? row['City'] ?? '';

      filings.push({
        company_name:   company.trim(),
        filing_state:   'NY',
        filed_date:     normaliseDate(filedRaw),
        layoff_date:    layoffRaw ? normaliseDate(layoffRaw) : null,
        affected_count: isNaN(count) ? null : count,
        locations:      location ? [location.trim()] : [],
        is_confirmed:   false,
        source_url:     url,
        raw_text:       null,
      });
    }
  } catch (err) {
    errors.push(`NY fetch error: ${err instanceof Error ? err.message : String(err)}`);
  }

  return { filings, errors };
}

// ─── NJ WARN handler ─────────────────────────────────────────────────────────
// NJ DOL publishes quarterly Excel files at https://www.nj.gov/labor/lwdhome/warn/
// We build the URL for the current quarter dynamically, fetch the XLSX, and
// parse it using SheetJS (same approach as CA XLSX fallback).
async function fetchNjWarn(companyFilter?: string): Promise<FetchResult> {
  const filings: WarnFilingRow[] = [];
  const errors: string[] = [];

  try {
    const now = new Date();
    const year = now.getFullYear();
    const quarter = Math.ceil((now.getMonth() + 1) / 3);
    // NJ quarterly file naming: WARNActQX_YYYY.xlsx
    const url = `https://www.nj.gov/labor/lwdhome/warn/WARNActQ${quarter}_${year}.xlsx`;

    let finalResp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WARNDataFetcher/1.0)' },
    });

    if (!finalResp.ok) {
      // Try previous quarter as fallback
      const prevQ = quarter === 1 ? 4 : quarter - 1;
      const prevY = quarter === 1 ? year - 1 : year;
      const fallbackUrl = `https://www.nj.gov/labor/lwdhome/warn/WARNActQ${prevQ}_${prevY}.xlsx`;
      const fbResp = await fetch(fallbackUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WARNDataFetcher/1.0)' },
      });
      if (!fbResp.ok) {
        errors.push(`NJ WARN XLSX not found for Q${quarter}/${year} or Q${prevQ}/${prevY}`);
        return { filings, errors };
      }
      finalResp = fbResp; // use the successful fallback response
    }

    const buffer = await finalResp.arrayBuffer();
    // Dynamic import of SheetJS — same as CA handler
    const XLSX = await import('https://esm.sh/xlsx@0.18.5') as typeof import('https://esm.sh/xlsx@0.18.5');
    const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });

    for (const row of rows) {
      const company = String(row['Employer Name'] ?? row['Company'] ?? row['Employer'] ?? '');
      if (!company) continue;
      if (companyFilter && !company.toLowerCase().includes(companyFilter.toLowerCase())) continue;

      const filedRaw  = String(row['Notice Date'] ?? row['Filed Date'] ?? '');
      const layoffRaw = String(row['Separation Date'] ?? row['Layoff Date'] ?? '');
      const count     = parseInt(String(row['# Affected'] ?? row['Employees'] ?? '0'), 10);
      const city      = String(row['Municipality'] ?? row['City'] ?? '');

      filings.push({
        company_name:   company.trim(),
        filing_state:   'NJ',
        filed_date:     normaliseDate(filedRaw),
        layoff_date:    layoffRaw ? normaliseDate(layoffRaw) : null,
        affected_count: isNaN(count) ? null : count,
        locations:      city ? [city.trim()] : [],
        is_confirmed:   false,
        source_url:     url,
        raw_text:       null,
      });
    }
  } catch (err) {
    errors.push(`NJ fetch error: ${err instanceof Error ? err.message : String(err)}`);
  }

  return { filings, errors };
}

// ─── WA WARN handler ─────────────────────────────────────────────────────────
// Washington ESD WARN data: https://esd.wa.gov/about-esd/public-disclosure/warn-notices
// Published as an Excel file updated monthly. Covers Amazon, Microsoft HQ, Boeing.
async function fetchWaWarn(companyFilter?: string): Promise<FetchResult> {
  const filings: WarnFilingRow[] = [];
  const errors: string[] = [];

  // WA ESD posts a direct Excel link (update URL when ESD refreshes it)
  const url = 'https://esd.wa.gov/sites/default/files/public/warn/WARN_notices.xlsx';

  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WARNDataFetcher/1.0)' },
    });
    if (!resp.ok) {
      errors.push(`WA WARN XLSX returned ${resp.status}`);
      return { filings, errors };
    }

    const buffer = await resp.arrayBuffer();
    const XLSX = await import('https://esm.sh/xlsx@0.18.5') as typeof import('https://esm.sh/xlsx@0.18.5');
    const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });

    for (const row of rows) {
      const company = String(row['Employer'] ?? row['Company'] ?? '');
      if (!company) continue;
      if (companyFilter && !company.toLowerCase().includes(companyFilter.toLowerCase())) continue;

      const filedRaw  = String(row['Notice Date'] ?? row['Date Received'] ?? '');
      const layoffRaw = String(row['Layoff Date'] ?? row['Effective Date'] ?? '');
      const count     = parseInt(String(row['Employees Affected'] ?? row['# Affected'] ?? '0'), 10);
      const city      = String(row['City'] ?? row['Location'] ?? '');

      filings.push({
        company_name:   company.trim(),
        filing_state:   'WA',
        filed_date:     normaliseDate(filedRaw),
        layoff_date:    layoffRaw ? normaliseDate(layoffRaw) : null,
        affected_count: isNaN(count) ? null : count,
        locations:      city ? [city.trim()] : [],
        is_confirmed:   false,
        source_url:     url,
        raw_text:       null,
      });
    }
  } catch (err) {
    errors.push(`WA fetch error: ${err instanceof Error ? err.message : String(err)}`);
  }

  return { filings, errors };
}

// ─── TX WARN handler ─────────────────────────────────────────────────────────
// Texas TWC WARN data published as downloadable Excel quarterly.
// Covers Austin tech corridor, Dallas/Fort Worth, Houston.
async function fetchTxWarn(companyFilter?: string): Promise<FetchResult> {
  const filings: WarnFilingRow[] = [];
  const errors: string[] = [];

  const now = new Date();
  const year = now.getFullYear();
  // TWC WARN file: https://www.twc.texas.gov/files/businesses/warn-act-notices-twc.xlsx
  const url = 'https://www.twc.texas.gov/files/businesses/warn-act-notices-twc.xlsx';

  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WARNDataFetcher/1.0)' },
    });
    if (!resp.ok) {
      errors.push(`TX TWC WARN XLSX returned ${resp.status} for year ${year}`);
      return { filings, errors };
    }

    const buffer = await resp.arrayBuffer();
    const XLSX = await import('https://esm.sh/xlsx@0.18.5') as typeof import('https://esm.sh/xlsx@0.18.5');
    const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });

    for (const row of rows) {
      const company = String(row['Employer'] ?? row['Company Name'] ?? '');
      if (!company) continue;
      if (companyFilter && !company.toLowerCase().includes(companyFilter.toLowerCase())) continue;

      const filedRaw  = String(row['Notice Date'] ?? row['Date Filed'] ?? '');
      const layoffRaw = String(row['Layoff Date'] ?? row['Effective Date'] ?? '');
      const count     = parseInt(String(row['# Affected'] ?? row['Employees'] ?? '0'), 10);
      const city      = String(row['City'] ?? row['County'] ?? '');

      filings.push({
        company_name:   company.trim(),
        filing_state:   'TX',
        filed_date:     normaliseDate(filedRaw),
        layoff_date:    layoffRaw ? normaliseDate(layoffRaw) : null,
        affected_count: isNaN(count) ? null : count,
        locations:      city ? [city.trim()] : [],
        is_confirmed:   false,
        source_url:     url,
        raw_text:       null,
      });
    }
  } catch (err) {
    errors.push(`TX fetch error: ${err instanceof Error ? err.message : String(err)}`);
  }

  return { filings, errors };
}

// ─── State handler registry ───────────────────────────────────────────────────
// To add support for a new state:
//   1. Implement async function fetchXxWarn(companyFilter?)
//   2. Register it here: STATE_HANDLERS['XX'] = fetchXxWarn;
//
// US tech employment coverage by state (approximate):
//   CA: 25% | WA: 10% | NY: 9% | TX: 8% | NJ: 4%
//   Combined (CA+WA+NY+TX+NJ): ~56% of US tech employment

const STATE_HANDLERS: Record<string, StateHandler> = {
  CA: fetchCaWarn,
  NY: fetchNyWarn,
  NJ: fetchNjWarn,
  WA: fetchWaWarn,
  TX: fetchTxWarn,
};

const DEFAULT_STATES = ['CA', 'WA', 'NY', 'TX', 'NJ'];

// ─── Upsert filings into Supabase ─────────────────────────────────────────────

async function upsertFilings(
  supabase: ReturnType<typeof createClient>,
  filings: WarnFilingRow[],
): Promise<{ inserted: number; skipped: number; errors: string[] }> {
  if (filings.length === 0) return { inserted: 0, skipped: 0, errors: [] };

  // Batch in groups of 100 to stay within Supabase's row-limit per request
  const BATCH_SIZE = 100;
  let inserted = 0;
  let skipped  = 0;
  const errors: string[] = [];

  for (let i = 0; i < filings.length; i += BATCH_SIZE) {
    const batch = filings.slice(i, i + BATCH_SIZE);

    const { data, error } = await supabase
      .from('warn_filings')
      .upsert(batch, {
        onConflict:        'company_name,filing_state,filed_date',
        ignoreDuplicates:  true,
      })
      .select('id');

    if (error) {
      errors.push(`upsert batch [${i}–${i + batch.length}]: ${error.message}`);
      continue;
    }

    // ignoreDuplicates = true means upsert only returns newly inserted rows
    inserted += data?.length ?? 0;
    skipped  += batch.length - (data?.length ?? 0);
  }

  return { inserted, skipped, errors };
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  // Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed — use POST' }, 405);
  }

  // v40 hardening: require Supabase JWT. This EF scrapes state DOL portals
  // and bulk-writes warn_filings — without auth it was an open relay that
  // anyone could spam to abuse the state portals under our IP and inflate
  // our DB. JWT requirement keeps it usable by pg_cron (service role) and
  // by authenticated admin tooling but rejects anonymous traffic.
  {
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Missing Authorization header' }, 401);
    }
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) return jsonResponse({ error: 'Invalid or expired token' }, 401);
    } catch {
      return jsonResponse({ error: 'Auth check failed' }, 401);
    }
  }

  // ── Parse request body ────────────────────────────────────────────────────
  let states: string[]     = DEFAULT_STATES;
  let companyName: string | undefined;

  try {
    const body = await req.json() as {
      states?: string[];
      companyName?: string;
    };
    if (Array.isArray(body.states) && body.states.length > 0) {
      states = body.states.map((s: string) => s.toUpperCase());
    }
    if (typeof body.companyName === 'string' && body.companyName.trim()) {
      companyName = body.companyName.trim();
    }
  } catch {
    // Empty body is fine — use defaults
  }

  // ── Validate requested states ─────────────────────────────────────────────
  const unknownStates = states.filter((s) => !(s in STATE_HANDLERS));
  if (unknownStates.length > 0) {
    return jsonResponse(
      { error: `Unsupported states: ${unknownStates.join(', ')}. Supported: ${Object.keys(STATE_HANDLERS).join(', ')}` },
      400,
    );
  }

  // ── Initialise Supabase client with service-role key ─────────────────────
  const supabaseUrl  = Deno.env.get('SUPABASE_URL');
  const supabaseKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseKey) {
    return jsonResponse(
      { error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables' },
      500,
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  // ── Fetch from each state ─────────────────────────────────────────────────
  const allFilings: WarnFilingRow[] = [];
  const allErrors:  string[]        = [];

  await Promise.allSettled(
    states.map(async (state) => {
      const handler = STATE_HANDLERS[state];
      try {
        const { filings, errors } = await handler(companyName);
        allFilings.push(...filings);
        allErrors.push(...errors);
        console.log(`[warn-act-fetch] ${state}: fetched ${filings.length} filings`);
      } catch (err) {
        const msg = `${state}: unexpected error — ${String(err)}`;
        allErrors.push(msg);
        console.error(`[warn-act-fetch] ${msg}`);
      }
    }),
  );

  // ── Upsert into database ──────────────────────────────────────────────────
  const { inserted, skipped, errors: upsertErrors } = await upsertFilings(supabase, allFilings);
  allErrors.push(...upsertErrors);

  // ── Return summary ────────────────────────────────────────────────────────
  const response = {
    inserted,
    skipped,
    fetched:      allFilings.length,
    statesQueried: states,
    companyFilter: companyName ?? null,
    errors:        allErrors,
  };

  console.log('[warn-act-fetch] complete', response);
  return jsonResponse(response, 200);
});
