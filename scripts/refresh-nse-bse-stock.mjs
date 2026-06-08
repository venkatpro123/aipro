// refresh-nse-bse-stock.mjs  —  PHASE 1: Live NSE/BSE stock price refresh
// -----------------------------------------------------------------------------
// Targets India NSE/BSE-listed companies in verified_company_intelligence that
// are MISSING a stock price (stock_price IS NULL). Normalizes each ticker to its
// Yahoo Finance symbol (appends .NS / .BO, applies a small symbol-correction map),
// fetches the live quote, and validates the result currency is INR before writing.
//
// Decisions baked in (per Phase-1 scope):
//   • Ticker normalization happens at FETCH TIME only — the ticker column is
//     never mutated (non-destructive, reversible).
//   • market_cap_usd is filled ONLY where currently NULL or 0 — hand-curated
//     2026 market caps are preserved.
//   • Scope = India NSE/BSE rows where stock_price IS NULL (the ~75 gaps).
//
// Safety net: a genuine NSE/BSE listing quotes in INR. If a normalized symbol
// resolves to a non-INR security, it matched the WRONG company → reject & skip.
//
// Re-runnable: only touches rows still missing a price, so repeated runs converge.
//   Usage:  node scripts/refresh-nse-bse-stock.mjs [--dry-run]
// -----------------------------------------------------------------------------

import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("❌ DATABASE_URL required"); process.exit(2); }
const DRY_RUN = process.argv.includes("--dry-run");

const db = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

// Spot FX (USD per 1 unit). INR is the only one that matters here, but keep the
// table so a stray non-INR result can still be reported in USD for diagnostics.
const FX_TO_USD = { USD: 1.0, INR: 1 / 84.5, GBP: 1.27, EUR: 1.09, SGD: 0.745 };
function toUSD(amount, currency) {
  if (amount == null) return null;
  return amount * (FX_TO_USD[currency] ?? 1);
}

// Known NSE symbol corrections: stored ticker → real NSE/BSE root symbol.
// Only includes cases where the stored ticker is NOT the exchange symbol.
// Everything else is assumed correct and just needs a .NS / .BO suffix.
const SYMBOL_CORRECTIONS = {
  RIL: "RELIANCE",         // Reliance Industries
  BAJAJAUT: "BAJAJ-AUTO",
  MM: "M&M",               // Mahindra & Mahindra
  // Wrong-root corrections (stored ticker ≠ NSE/BSE symbol). INR currency check
  // still guards every one of these against a wrong-company match.
  ZOMATO: "ETERNAL",       // Zomato renamed to Eternal on NSE (2025)
  ICICILOMBARD: "ICICIGI", // ICICI Lombard General Insurance
  COFGF: "COFORGE",        // Coforge (stored as US OTC symbol)
  BRLSF: "BSOFT",          // Birlasoft (stored as US OTC symbol)
  MPHLF: "MPHASIS",        // Mphasis (stored as US OTC symbol)
  TECHNO: "TECHNOE",       // Techno Electric & Engineering
  NUCLEUSFIN: "NUCLEUS",   // Nucleus Software Exports
  UNICOMMERCE: "UNIECOM",  // Unicommerce eSolutions
  ZEN: "ZENTEC",           // Zen Technologies
  TAKESOL: "TAKE",         // Take Solutions
  E2ENETS: "E2E",          // E2E Networks
};

// Build the Yahoo Finance symbol for a stored (ticker, exchange) pair.
function toYahooSymbol(ticker, exchange) {
  if (!ticker) return null;
  const t = ticker.trim();
  if (t.includes(".")) return t;            // already suffixed (TCS.NS, PEL.NS…)
  const root = SYMBOL_CORRECTIONS[t] ?? t;
  if (exchange === "NSE") return root + ".NS";
  if (exchange === "BSE") return root + ".BO";
  return root;                               // shouldn't happen for this query
}

// Fetch live quote from Yahoo Finance chart endpoint (no key required).
async function fetchChart(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=90d`;
  try {
    const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" } });
    if (!r.ok) return null;
    const j = await r.json();
    const meta = j?.chart?.result?.[0]?.meta;
    if (!meta) return null;
    const currency = meta.currency ?? null;
    const priceRaw = meta.regularMarketPrice ?? null;
    const mcRaw = meta.marketCap ?? null;
    const closes = (j?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? []).filter(v => v != null);
    const change90d = closes.length >= 2
      ? +(((closes[closes.length - 1] - closes[0]) / closes[0]) * 100).toFixed(2)
      : null;
    return {
      currency,
      priceRaw,
      priceUSD: priceRaw != null ? +toUSD(priceRaw, currency).toFixed(4) : null,
      marketCapUSD: mcRaw != null ? Math.round(toUSD(mcRaw, currency)) : null,
      change90d,
    };
  } catch { return null; }
}

async function main() {
  await db.connect();
  console.log(`✓ Connected${DRY_RUN ? "  (DRY RUN — no writes)" : ""}\n`);

  const { rows: companies } = await db.query(`
    SELECT canonical_name, display_name, ticker, exchange, market_cap_usd, data_quality_tier
    FROM verified_company_intelligence
    WHERE country_code = 'IN' AND is_public = true AND ticker IS NOT NULL
      AND stock_price IS NULL AND exchange IN ('NSE','BSE')
    ORDER BY market_cap_usd DESC NULLS LAST
  `);

  console.log(`Found ${companies.length} NSE/BSE companies missing stock_price.\n`);

  let updated = 0, rejectedCurrency = 0, noData = 0;
  let filledMktCap = 0;
  let done = 0;

  for (const co of companies) {
    done++;
    const symbol = toYahooSymbol(co.ticker, co.exchange);
    process.stdout.write(`  [${String(done).padStart(2)}/${companies.length}] ${co.canonical_name.slice(0, 28).padEnd(28)} ${String(symbol).padEnd(16)} `);

    const q = await fetchChart(symbol);

    if (!q || q.priceRaw == null) {
      noData++;
      console.log(`✗ no data`);
      await sleep(800);
      continue;
    }

    // SAFETY NET: genuine NSE/BSE listing must quote in INR.
    if (q.currency !== "INR") {
      rejectedCurrency++;
      console.log(`⚠ rejected (currency=${q.currency}, price=${q.priceRaw}) — wrong-security match`);
      await sleep(800);
      continue;
    }

    const now = new Date().toISOString();
    const updates = {
      stock_price: q.priceUSD,
      stock_90d_change: q.change90d,
      financials_source: "yahoo_finance_scrape",
      financials_verified_at: now,
      financials_confidence: 0.85,
    };
    // Fill market cap ONLY where currently missing (NULL or 0); never overwrite curated values.
    const mktCapMissing = co.market_cap_usd == null || Number(co.market_cap_usd) === 0;
    if (mktCapMissing && q.marketCapUSD != null) {
      updates.market_cap_usd = q.marketCapUSD;
      filledMktCap++;
    }
    // Tier: upgrade heuristic → seed; never downgrade verified/live.
    if (co.data_quality_tier === "heuristic") updates.data_quality_tier = "seed";

    if (DRY_RUN) {
      updated++;
      console.log(`✓ DRY price=$${q.priceUSD} (₹${q.priceRaw}) 90d=${q.change90d ?? "—"}%${updates.market_cap_usd ? ` +mc=$${Math.round(updates.market_cap_usd / 1e6)}M` : ""}`);
      await sleep(800);
      continue;
    }

    const setClauses = Object.keys(updates).map((k, i) => `${k} = $${i + 2}`).join(", ");
    const values = [co.canonical_name, ...Object.values(updates)];
    const { rowCount } = await db.query(
      `UPDATE verified_company_intelligence SET ${setClauses}, updated_at = NOW() WHERE canonical_name = $1`,
      values
    );

    if (rowCount > 0) {
      updated++;
      console.log(`✓ price=$${q.priceUSD} (₹${q.priceRaw}) 90d=${q.change90d ?? "—"}%${updates.market_cap_usd ? ` +mc=$${Math.round(updates.market_cap_usd / 1e6)}M` : ""}`);
    } else {
      console.log(`⚠ no row matched`);
    }
    await sleep(800);
  }

  const { rows: after } = await db.query(`
    SELECT
      COUNT(*) FILTER (WHERE is_public AND ticker IS NOT NULL AND exchange IN ('NSE','BSE')) AS nse_bse_total,
      COUNT(*) FILTER (WHERE is_public AND ticker IS NOT NULL AND exchange IN ('NSE','BSE') AND stock_price IS NOT NULL) AS nse_bse_priced
    FROM verified_company_intelligence WHERE country_code = 'IN'
  `);
  const a = after[0];

  await db.end();

  console.log(`
╔════════════════════════════════════════════════════════╗
║              PHASE 1 — NSE/BSE STOCK REFRESH           ║
╠════════════════════════════════════════════════════════╣
║ Candidates (missing price) : ${String(companies.length).padStart(4)}                      ║
║ ✓ Updated with live price  : ${String(updated).padStart(4)}                      ║
║ + Market cap filled        : ${String(filledMktCap).padStart(4)}                      ║
║ ⚠ Rejected (non-INR)       : ${String(rejectedCurrency).padStart(4)}                      ║
║ ✗ No Yahoo data            : ${String(noData).padStart(4)}                      ║
╠════════════════════════════════════════════════════════╣
║ India NSE/BSE priced now   : ${String(a.nse_bse_priced).padStart(4)} / ${String(a.nse_bse_total).padEnd(4)}               ║
╚════════════════════════════════════════════════════════╝
${DRY_RUN ? "  (DRY RUN — nothing was written)\n" : ""}`);
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
main().catch(e => { console.error(e); process.exit(1); });
