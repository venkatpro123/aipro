// update-vci-mktcap-pe-revenue.mjs
// Fetches market cap, PE ratio, and TTM revenue for every public company in VCI
// Uses Yahoo Finance v7 (quote) + v10 (financialData) with cookie+crumb auth.
// Auth via yahoo.com cookie (sets A1S session cookie reliably).
// Processes one company at a time. No estimates, only live API data.

import pg from "pg";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("❌ DATABASE_URL required"); process.exit(2); }
const db = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

// FX rates (USD per 1 unit of foreign currency) — May 2025 spot rates
const FX = {
  USD:1.0, INR:1/84.5, GBP:1.27, EUR:1.09, SGD:0.745, HKD:0.128,
  JPY:1/154, MYR:0.215, DKK:0.146, CHF:1.12, CNY:0.138, SEK:0.096,
  NOK:0.093, AUD:0.648, CAD:0.737, BRL:0.181, ILS:0.268,
  KRW:1/1340, TWD:1/31.5,
};
const toUSD = (v, cur) => v == null ? null : v * (FX[cur] ?? 1);

const COOKIE_FILE = "/tmp/yf_session.txt";
let CRUMB = "";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

async function initAuth() {
  // Get A1S session cookie from yahoo.com (more reliable than finance.yahoo.com)
  await execAsync(
    `curl -s -c "${COOKIE_FILE}" "https://yahoo.com/" ` +
    `-H "User-Agent: ${UA}" ` +
    `-H "Accept: text/html" ` +
    `-L -o /tmp/yf_home_tmp.html --max-redirs 5`,
    { timeout: 20000 }
  );

  // Get crumb
  const { stdout: crumbOut } = await execAsync(
    `curl -s -b "${COOKIE_FILE}" "https://query2.finance.yahoo.com/v1/test/getcrumb" ` +
    `-H "User-Agent: ${UA}"`,
    { timeout: 10000 }
  );
  CRUMB = crumbOut.trim();
  return !!CRUMB && !CRUMB.includes("{");
}

async function curlGet(url) {
  const { stdout } = await execAsync(
    `curl -s -b "${COOKIE_FILE}" "${url}" ` +
    `-H "User-Agent: ${UA}" ` +
    `-H "Accept: application/json" ` +
    `--max-time 15`,
    { timeout: 20000 }
  );
  return stdout;
}

// Yahoo Finance v7 quote — returns price, marketCap, trailingPE
async function fetchQuote(ticker) {
  const url = `https://query2.finance.yahoo.com/v7/finance/quote` +
    `?symbols=${encodeURIComponent(ticker)}` +
    `&fields=regularMarketPrice,marketCap,trailingPE,currency` +
    `&crumb=${encodeURIComponent(CRUMB)}`;
  try {
    const stdout = await curlGet(url);
    const j = JSON.parse(stdout);
    const q = j?.quoteResponse?.result?.[0];
    if (!q) return null;
    if (j?.quoteResponse?.error?.code === "Invalid Crumb") {
      await initAuth(); return await fetchQuote(ticker);
    }
    const cur = q.currency ?? "USD";
    return {
      price:      q.regularMarketPrice ?? null,
      marketCap:  q.marketCap != null ? Math.round(toUSD(q.marketCap, cur)) : null,
      trailingPE: q.trailingPE != null ? +q.trailingPE.toFixed(2) : null,
      currency:   cur,
    };
  } catch { return null; }
}

// Yahoo Finance v10 quoteSummary — returns TTM revenue
async function fetchRevenue(ticker) {
  const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ticker)}` +
    `?modules=financialData` +
    `&crumb=${encodeURIComponent(CRUMB)}`;
  try {
    const stdout = await curlGet(url);
    const j = JSON.parse(stdout);
    const fd = j?.quoteSummary?.result?.[0]?.financialData;
    if (!fd) return null;
    const cur = fd.financialCurrency ?? "USD";
    const revRaw = fd.totalRevenue?.raw ?? null;
    return {
      revenueTtmUsd: revRaw != null ? Math.round(toUSD(revRaw, cur)) : null,
    };
  } catch { return null; }
}

async function main() {
  await db.connect();
  console.log("✓ Connected\n");

  // Init auth
  console.log("Authenticating with Yahoo Finance...");
  const ok = await initAuth();
  if (!ok) { console.error("❌ Auth failed"); await db.end(); process.exit(1); }
  console.log(`✓ Auth OK — crumb: ${CRUMB}\n`);

  const { rows: companies } = await db.query(`
    SELECT canonical_name, display_name, ticker, exchange
    FROM verified_company_intelligence
    WHERE is_public = true AND ticker IS NOT NULL
    ORDER BY canonical_name
  `);
  console.log(`Processing ${companies.length} public companies...\n`);

  let updated = 0, failed = 0;

  for (let i = 0; i < companies.length; i++) {
    const co = companies[i];
    process.stdout.write(`  [${String(i + 1).padStart(3)}/${companies.length}] ${co.canonical_name.padEnd(32)} `);

    const [quote, rev] = await Promise.all([fetchQuote(co.ticker), fetchRevenue(co.ticker)]);

    const fields = {};
    if (quote?.marketCap   != null) fields.market_cap_usd   = quote.marketCap;
    if (quote?.trailingPE  != null) fields.pe_ratio          = quote.trailingPE;
    if (rev?.revenueTtmUsd != null) fields.revenue_ttm_usd  = rev.revenueTtmUsd;

    if (Object.keys(fields).length === 0) {
      failed++;
      console.log(`✗ no data`);
      await new Promise(r => setTimeout(r, 300));
      continue;
    }

    fields.financials_verified_at = new Date().toISOString();
    fields.data_quality_tier      = "seed";

    const setClauses = Object.keys(fields).map((k, i2) => `${k} = $${i2 + 2}`).join(", ");
    const values = [co.canonical_name, ...Object.values(fields)];
    const { rowCount } = await db.query(
      `UPDATE verified_company_intelligence SET ${setClauses}, updated_at = NOW() WHERE canonical_name = $1`,
      values
    );

    if (rowCount > 0) {
      updated++;
      const mc   = fields.market_cap_usd  ? `$${(fields.market_cap_usd / 1e9).toFixed(1)}B`       : "—";
      const pe   = fields.pe_ratio        ? `PE=${fields.pe_ratio}`                                : "—";
      const rv   = fields.revenue_ttm_usd ? `rev=$${(fields.revenue_ttm_usd / 1e9).toFixed(1)}B`  : "—";
      console.log(`✓  mktcap=${mc.padEnd(12)} ${pe.padEnd(12)} ${rv}`);
    } else {
      failed++;
      console.log(`⚠ no row matched`);
    }

    await new Promise(r => setTimeout(r, 700));
  }

  const { rows: s } = await db.query(`
    SELECT
      count(*) AS total,
      count(stock_price) AS has_price,
      count(market_cap_usd) AS has_mc,
      count(pe_ratio) AS has_pe,
      count(revenue_ttm_usd) AS has_rev,
      count(CASE WHEN data_quality_tier='verified' THEN 1 END) AS verified,
      count(CASE WHEN data_quality_tier='seed' THEN 1 END) AS seed,
      count(CASE WHEN data_quality_tier='heuristic' THEN 1 END) AS heuristic
    FROM verified_company_intelligence
  `);
  const c = s[0];
  await db.end();

  console.log(`
╔════════════════════════════════════════╗
║       VCI COMPLETE DATA STATE          ║
╠════════════════════════════════════════╣
║ Total rows           : ${String(c.total).padStart(4)}             ║
║ Stock price (live)   : ${String(c.has_price).padStart(4)} / ${c.total}         ║
║ Market cap (live)    : ${String(c.has_mc).padStart(4)} / ${c.total}         ║
║ PE ratio (live)      : ${String(c.has_pe).padStart(4)} / ${c.total}         ║
║ TTM Revenue (live)   : ${String(c.has_rev).padStart(4)} / ${c.total}         ║
╠════════════════════════════════════════╣
║ Tier = verified      : ${String(c.verified).padStart(4)}             ║
║ Tier = seed          : ${String(c.seed).padStart(4)}             ║
║ Tier = heuristic     : ${String(c.heuristic).padStart(4)}             ║
╚════════════════════════════════════════╝
  Updated: ${updated}  |  Failed: ${failed}
`);
}

main().catch(e => { console.error(e); process.exit(1); });
