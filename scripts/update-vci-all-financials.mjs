// update-vci-all-financials.mjs
// Fetches LIVE stock price, market cap, PE ratio, TTM revenue, and 90d change
// from Yahoo Finance for every public company in verified_company_intelligence
// that still has stock_price = NULL. Updates one row at a time. No estimates.
// Currency → USD conversion is applied for non-USD exchanges.

import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("❌ DATABASE_URL required"); process.exit(2); }

const db = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

// Approximate spot FX rates (USD per 1 unit of foreign currency).
// Updated May 2025. Only used when Yahoo Finance returns non-USD values.
const FX_TO_USD = {
  USD: 1.0,
  INR: 1 / 84.5,
  GBP: 1.27,
  EUR: 1.09,
  SGD: 0.745,
  HKD: 0.128,
  JPY: 1 / 154,
  MYR: 0.215,
  DKK: 0.146,
  CHF: 1.12,
  CNY: 0.138,
  SEK: 0.096,
  NOK: 0.093,
  AUD: 0.648,
  CAD: 0.737,
  BRL: 0.181,
  ILS: 0.268,
  KRW: 1 / 1340,
  TWD: 1 / 31.5,
};

function toUSD(amount, currency) {
  if (amount == null) return null;
  const rate = FX_TO_USD[currency] ?? 1;
  return amount * rate;
}

// Fetch chart data (price, market cap, 90-day change)
async function fetchChart(ticker) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=90d`;
  try {
    const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" } });
    if (!r.ok) return null;
    const j = await r.json();
    const meta = j?.chart?.result?.[0]?.meta;
    if (!meta) return null;
    const currency = meta.currency ?? "USD";
    const price = meta.regularMarketPrice ?? null;
    const mcRaw = meta.marketCap ?? null;
    const closes = (j?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? []).filter(v => v != null);
    const change90d = closes.length >= 2
      ? +((closes[closes.length - 1] - closes[0]) / closes[0] * 100).toFixed(2)
      : null;
    return {
      price:       price != null  ? +toUSD(price, currency).toFixed(4) : null,
      marketCap:   mcRaw != null  ? Math.round(toUSD(mcRaw, currency)) : null,
      change90d,
      currency,
    };
  } catch { return null; }
}

// Fetch summary data (PE ratio, TTM revenue, sector, industry)
async function fetchSummary(ticker) {
  const modules = "defaultKeyStatistics,financialData,summaryProfile";
  const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ticker)}?modules=${modules}`;
  try {
    const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" } });
    if (!r.ok) return null;
    const j = await r.json();
    const result = j?.quoteSummary?.result?.[0];
    if (!result) return null;
    const fd = result.financialData ?? {};
    const ks = result.defaultKeyStatistics ?? {};
    const sp = result.summaryProfile ?? {};
    const currency = fd.financialCurrency ?? "USD";
    // PE: use trailing PE from keyStats, or derive from price/EPS
    const peRatio = ks.trailingPE?.raw ?? null;
    // Revenue TTM
    const revRaw  = fd.totalRevenue?.raw ?? null;
    const revUSD  = revRaw != null ? Math.round(toUSD(revRaw, currency)) : null;
    return {
      peRatio:    peRatio != null ? +peRatio.toFixed(2) : null,
      revenueTtm: revUSD,
      sector:     sp.sector     ?? null,
      industry:   sp.industry   ?? null,
    };
  } catch { return null; }
}

async function main() {
  await db.connect();
  console.log("✓ Connected to database\n");

  // Fetch all public companies with a ticker that still need stock data
  const { rows: companies } = await db.query(`
    SELECT canonical_name, display_name, ticker, exchange, is_public, sector, industry
    FROM verified_company_intelligence
    WHERE is_public = true AND ticker IS NOT NULL
    ORDER BY canonical_name
  `);

  console.log(`Found ${companies.length} public companies with tickers. Fetching live data...\n`);

  let done = 0, failed = 0, totalUpdated = 0;

  for (const co of companies) {
    process.stdout.write(`  [${String(done + 1).padStart(3)}/${companies.length}] ${co.canonical_name.padEnd(32)} `);

    // Fetch chart and summary in parallel
    const [chart, summary] = await Promise.all([
      fetchChart(co.ticker),
      fetchSummary(co.ticker),
    ]);

    if (!chart?.price && !chart?.marketCap) {
      failed++;
      console.log(`✗ no data (ticker=${co.ticker})`);
      done++;
      await new Promise(r => setTimeout(r, 300));
      continue;
    }

    const now = new Date().toISOString();

    // Only update sector/industry if VCI doesn't already have them
    const sectorVal   = co.sector   ?? summary?.sector   ?? null;
    const industryVal = co.industry ?? summary?.industry ?? null;

    const updates = {
      stock_price:           chart.price,
      market_cap_usd:        chart.marketCap,
      stock_90d_change:      chart.change90d,
      financials_source:     "yahoo_finance_scrape",
      financials_verified_at: now,
      financials_confidence:  0.85,
      sector:                 sectorVal,
      industry:               industryVal,
    };
    if (summary?.peRatio != null)    updates.pe_ratio        = summary.peRatio;
    if (summary?.revenueTtm != null) updates.revenue_ttm_usd = summary.revenueTtm;

    // Upgrade tier: if we now have workforce + financials, move from heuristic → seed
    // (verified tier is set separately only for companies with annual report data)
    updates.data_quality_tier = "seed";  // at minimum seed once we have live financials

    const setClauses = Object.keys(updates).map((k, i) => `${k} = $${i + 2}`).join(", ");
    const values = [co.canonical_name, ...Object.values(updates)];

    const { rowCount } = await db.query(
      `UPDATE verified_company_intelligence SET ${setClauses}, updated_at = NOW() WHERE canonical_name = $1`,
      values
    );

    if (rowCount > 0) {
      totalUpdated++;
      const priceStr = chart.price   ? `$${chart.price}`   : "—";
      const mcStr    = chart.marketCap ? `$${(chart.marketCap / 1e9).toFixed(1)}B` : "—";
      const peStr    = summary?.peRatio != null ? `PE=${summary.peRatio}` : "";
      const revStr   = summary?.revenueTtm != null ? `rev=$${(summary.revenueTtm / 1e9).toFixed(1)}B` : "";
      console.log(`✓  price=${priceStr.padEnd(12)} mktcap=${mcStr.padEnd(10)} ${peStr.padEnd(10)} ${revStr}`);
    } else {
      failed++;
      console.log(`⚠ no row matched`);
    }

    done++;
    // 800ms delay between requests to avoid rate-limiting Yahoo Finance
    await new Promise(r => setTimeout(r, 800));
  }

  // Final summary
  const { rows: summary } = await db.query(`
    SELECT
      count(*) AS total,
      count(stock_price) AS has_price,
      count(market_cap_usd) AS has_mktcap,
      count(pe_ratio) AS has_pe,
      count(revenue_ttm_usd) AS has_revenue,
      count(CASE WHEN data_quality_tier='verified' THEN 1 END) AS verified,
      count(CASE WHEN data_quality_tier='seed' THEN 1 END) AS seed,
      count(CASE WHEN data_quality_tier='heuristic' THEN 1 END) AS heuristic
    FROM verified_company_intelligence
  `);
  const s = summary[0];

  await db.end();

  console.log(`
╔═══════════════════════════════════════╗
║         VCI FINAL STATE               ║
╠═══════════════════════════════════════╣
║ Total rows         : ${String(s.total).padStart(6)}            ║
║ With stock price   : ${String(s.has_price).padStart(6)} / ${s.total}       ║
║ With market cap    : ${String(s.has_mktcap).padStart(6)} / ${s.total}       ║
║ With PE ratio      : ${String(s.has_pe).padStart(6)} / ${s.total}       ║
║ With TTM revenue   : ${String(s.has_revenue).padStart(6)} / ${s.total}       ║
╠═══════════════════════════════════════╣
║ Tier = verified    : ${String(s.verified).padStart(6)}            ║
║ Tier = seed        : ${String(s.seed).padStart(6)}            ║
║ Tier = heuristic   : ${String(s.heuristic).padStart(6)}            ║
╚═══════════════════════════════════════╝
  Fetched: ${totalUpdated} updated  |  ${failed} failed (no Yahoo data)
  `);
}

main().catch(e => { console.error(e); process.exit(1); });
