/**
 * Fills in market_cap_usd for the ~557 rows with a ticker but NULL market_cap_usd.
 *
 * Source: Yahoo Finance fundamentals timeseries endpoint (no key, no crumb needed).
 * Also updates stock_price from the v8 chart endpoint where still NULL.
 * Rate: 400ms between requests.
 */
import pg from 'pg';

const DELAY_MS = 400;

// Exchange → Yahoo Finance ticker suffix
const EXCHANGE_SUFFIX = {
  NYSE: '', NASDAQ: '', AMEX: '', BATS: '', OTC: '',
  NSE: '.NS', BSE: '.BO',
  LSE: '.L',
  TSX: '.TO', TSXV: '.V',
  XETRA: '.DE', FRA: '.F',
  TYO: '.T',
  KRX: '.KS',
  HKSE: '.HK',
  SGX: '.SI',
  ASX: '.AX',
  SET: '.BK',
  SIX: '.SW',
  OMX: '.ST',
  BIT: '.MI',
  EPA: '.PA',
  BME: '.MC',
  IDX: '.JK',
  TADAWUL: '.SR',
  DFM: '.AE',
  JSE: '.JO',
  BIST: '.IS',
  WSE: '.WA',
};

// Approximate FX rates to USD (May 2026 rates)
const FX_TO_USD = {
  USD: 1, INR: 0.012, GBP: 1.27, EUR: 1.08, JPY: 0.0067,
  KRW: 0.00074, HKD: 0.128, SGD: 0.74, AUD: 0.65, CAD: 0.74,
  CHF: 1.12, SEK: 0.096, BRL: 0.20, MXN: 0.058, IDR: 0.000063,
  THB: 0.028, SAR: 0.267, AED: 0.272, ZAR: 0.055, TWD: 0.031,
  OMR: 2.60, KWD: 3.25, MAD: 0.10, PLN: 0.25, TRY: 0.031,
};

function toUSD(val, currency) {
  if (!val || !isFinite(val)) return null;
  return Math.round(val * (FX_TO_USD[currency] ?? 1));
}

function yahooSymbol(ticker, exchange, countryCode) {
  if (!ticker) return null;
  const t = ticker.trim();
  // Skip obviously non-Yahoo symbols (e.g. Nigerian/Moroccan exchanges)
  if (['NSE_NG', 'CSE', 'MSM', 'BOURSA', 'BVL'].includes(exchange)) return null;
  if (exchange === 'NSE' && (countryCode === 'NG' || countryCode === 'KE')) return null;
  // Already has exchange suffix
  if (t.includes('.') && !t.match(/^\d+\.\d+$/)) return t;
  return t + (EXCHANGE_SUFFIX[exchange] ?? '');
}

// Fetch market cap from Yahoo Finance timeseries (no crumb needed)
const PERIOD1 = 1640000000; // ~Jan 2022
const PERIOD2 = 1790000000; // ~Mar 2027
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';

async function fetchMarketCap(symbol) {
  const url = `https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${encodeURIComponent(symbol)}?type=quarterlyMarketCap&period1=${PERIOD1}&period2=${PERIOD2}`;
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return null;
    const d = await r.json();
    const results = d?.timeseries?.result ?? [];
    if (!results.length) return null;
    const entries = results[0]?.quarterlyMarketCap ?? [];
    if (!entries.length) return null;
    // Use the most recent entry (last in array)
    const latest = entries[entries.length - 1];
    const raw = latest?.reportedValue?.raw;
    const currency = latest?.currencyCode ?? 'USD';
    if (!raw) return null;
    return { raw, currency, asOfDate: latest.asOfDate };
  } catch { return null; }
}

// Fetch stock price from v8 chart (works without crumb)
async function fetchStockPrice(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return null;
    const d = await r.json();
    const meta = d?.chart?.result?.[0]?.meta;
    if (!meta) return null;
    return { price: meta.regularMarketPrice, currency: meta.currency ?? 'USD' };
  } catch { return null; }
}

const delay = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

  const { rows: companies } = await pool.query(`
    SELECT id, canonical_name, ticker, exchange, country_code, stock_price
    FROM verified_company_intelligence
    WHERE market_cap_usd IS NULL AND ticker IS NOT NULL AND ticker != ''
    ORDER BY revenue_ttm_usd DESC NULLS LAST
  `);

  console.log(`Found ${companies.length} companies to enrich`);

  let updated = 0, skipped = 0, failed = 0;

  for (let i = 0; i < companies.length; i++) {
    const co = companies[i];
    const symbol = yahooSymbol(co.ticker, co.exchange, co.country_code);
    if (!symbol) { skipped++; continue; }

    const mcData = await fetchMarketCap(symbol);
    if (!mcData) {
      failed++;
      if (failed <= 5 || (i % 50 === 0)) {
        process.stdout.write(`  ✗ no mc: ${co.canonical_name} (${symbol})\n`);
      }
      await delay(DELAY_MS);
      continue;
    }

    const mcUsd = toUSD(mcData.raw, mcData.currency);
    if (!mcUsd || mcUsd < 500_000) { failed++; await delay(DELAY_MS); continue; }

    // Also fetch stock price if missing
    let priceUsd = null;
    if (co.stock_price == null) {
      const priceData = await fetchStockPrice(symbol);
      if (priceData?.price) priceUsd = toUSD(priceData.price, priceData.currency);
    }

    if (priceUsd != null && co.stock_price == null) {
      await pool.query(
        `UPDATE verified_company_intelligence SET market_cap_usd = $1, stock_price = $2, updated_at = NOW() WHERE id = $3`,
        [mcUsd, priceUsd, co.id]
      );
    } else {
      await pool.query(
        `UPDATE verified_company_intelligence SET market_cap_usd = $1, updated_at = NOW() WHERE id = $2`,
        [mcUsd, co.id]
      );
    }

    updated++;
    if (updated <= 10 || updated % 50 === 0) {
      const mcB = (mcUsd / 1e9).toFixed(1);
      console.log(`[${i+1}/${companies.length}] ✓ ${co.canonical_name} (${symbol}) mc=$${mcB}B${priceUsd ? ` price=$${priceUsd}` : ''}`);
    }

    await delay(DELAY_MS);
  }

  console.log(`\n=== DONE ===`);
  console.log(`Updated: ${updated} | Skipped (no symbol): ${skipped} | Failed/no data: ${failed}`);

  const { rows } = await pool.query(`SELECT COUNT(*) as still_null FROM verified_company_intelligence WHERE market_cap_usd IS NULL`);
  console.log(`Remaining NULL market_cap: ${rows[0].still_null}`);
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
