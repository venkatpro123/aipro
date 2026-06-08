/**
 * Pass 2: OTC ADR → primary exchange ticker fallback
 * For companies where timeseries failed with their OTC ticker,
 * try the known primary-exchange ticker instead.
 */
import pg from 'pg';

const DELAY_MS = 400;
const PERIOD1 = 1640000000;
const PERIOD2 = 1790000000;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';

// OTC ADR ticker → primary exchange Yahoo Finance symbol
// Covers the 100+ most important non-US companies with OTC listings
const OTC_TO_PRIMARY = {
  // UK (LSE)
  UL: 'ULVR.L', BTI: 'BATS.L', DEO: 'DGE.L', RIO: 'RIO.L', BHP: 'BHP.L',
  NGG: 'NG.L', WPP: 'WPP.L', PUK: 'PRU.L', VOD: 'VOD.L',
  CMPGY: 'CPG.L', BAESY: 'BA.L', RYCEY: 'RR.L', BTGOF: 'BT.A',
  NGLOY: 'AAL.L', RBGLY: 'RKT.L', MAKSY: 'MKS.L',
  // Europe (various)
  NSRGY: 'NESN.SW', GLNCY: 'GLEN.L', RHHBY: 'ROG.SW', SXYAY: 'SIKA.SW',
  LVMHF: 'MC.PA', RNLSY: 'RNO.PA', PPRUY: 'KER.PA', HEINY: 'HEIA.AS',
  HENKY: 'HEN3.DE',
  // Australia
  WFAFY: 'WES.AX', CMWAY: 'CBA.AX', NABZY: 'NAB.AX', MQBKY: 'MQG.AX',
  OGFGY: 'ORG.AX', FSUGY: 'FMG.AX', WDSAY: 'WDS.AX', WDS: 'WDS.AX',
  // Africa
  MTNOY: 'MTN.JO',
  // Singapore
  UOVEY: 'U11.SI', WLMIF: 'F34.SI',
  // India OTC → NSE
  HIIEF: 'HINDALCO.NS', ADANIY: 'ADANIENT.NS',
  CANAIF: 'CANBK.NS', SBIIF: 'SBIN.NS',
  MCHPF: 'MRF.NS', WBSVY: 'WIPRO.NS',
  AXBKY: 'AXISBANK.NS', KOTAKBK: 'KOTAKBANK.NS',
  ICICIF: 'ICICIBANK.NS', HDFCBK: 'HDFCBANK.NS',
  RELIF: 'RELIANCE.NS', TATMF: 'TATAMOTORS.NS',
  TIINF: 'TCS.NS', INFY: 'INFY.NS',
  INFOSYSBSE: 'INFY.NS',
  // Korea OTC → KRX
  HNLGY: '000660.KS', LGCEY: '051910.KS', HXSCF: '012330.KS',
  HSICY: '000270.KS',
  // Japan OTC
  SSUMY: '8316.T', MTBEY: '8306.T', MUFGY: '8306.T',
  SMFGY: '8411.T', SBKFF: '8591.T', SFTBY: '9984.T',
  DSNKY: '6902.T', FUJIY: '6702.T', CAHPF: '7735.T',
  MSBHF: '6981.T', KYOCF: '6971.T', SOMFY: '8016.T',
  KSRYY: '9433.T', AUOTY: '9984.T',
  // HK
  ANPDY: '2020.HK', BYDDY: '1211.HK', CICHF: '0762.HK',
  PNGAY: '1347.HK',
  // Bahrain/Gulf — Yahoo Finance doesn't have most; skip
  ALBHF: null,
};

const FX_TO_USD = {
  USD: 1, INR: 0.012, GBP: 1.27, EUR: 1.08, JPY: 0.0067,
  KRW: 0.00074, HKD: 0.128, SGD: 0.74, AUD: 0.65, CAD: 0.74,
  CHF: 1.12, SEK: 0.096, BRL: 0.20, MXN: 0.058, IDR: 0.000063,
  THB: 0.028, SAR: 0.267, AED: 0.272, ZAR: 0.055, TWD: 0.031,
  OMR: 2.60, KWD: 3.25, MAD: 0.10, PLN: 0.25, TRY: 0.031,
  GBX: 0.01270,  // pence → USD
  ILS: 0.27, CNY: 0.138, DKK: 0.145, NOK: 0.095, NZD: 0.61,
};

function toUSD(val, currency) {
  if (!val || !isFinite(val)) return null;
  return Math.round(val * (FX_TO_USD[currency] ?? 1));
}

async function fetchMarketCapTimeseries(symbol) {
  const url = `https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${encodeURIComponent(symbol)}?type=quarterlyMarketCap&period1=${PERIOD1}&period2=${PERIOD2}`;
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return null;
    const d = await r.json();
    const entries = d?.timeseries?.result?.[0]?.quarterlyMarketCap ?? [];
    if (!entries.length) return null;
    const latest = entries[entries.length - 1];
    const raw = latest?.reportedValue?.raw;
    const currency = latest?.currencyCode ?? 'USD';
    if (!raw) return null;
    return { raw, currency };
  } catch { return null; }
}

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
    if (!meta?.regularMarketPrice) return null;
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

  console.log(`Found ${companies.length} companies still missing market_cap`);

  let updated = 0, skipped = 0, failed = 0;

  for (let i = 0; i < companies.length; i++) {
    const co = companies[i];

    // Look up primary exchange ticker from the fallback map
    const primarySymbol = OTC_TO_PRIMARY[co.ticker];
    if (primarySymbol === null) { skipped++; continue; } // known to be unavailable

    const symbolsToTry = [];
    if (primarySymbol) symbolsToTry.push(primarySymbol);
    // Also try the stored ticker directly (might work with different params)
    symbolsToTry.push(co.ticker);

    let mcData = null;
    let usedSymbol = null;
    for (const sym of symbolsToTry) {
      mcData = await fetchMarketCapTimeseries(sym);
      if (mcData) { usedSymbol = sym; break; }
      await delay(150);
    }

    if (!mcData) {
      failed++;
      if (failed <= 8 || i % 30 === 0) {
        process.stdout.write(`  ✗ ${co.canonical_name} (${co.ticker})\n`);
      }
      await delay(DELAY_MS);
      continue;
    }

    const mcUsd = toUSD(mcData.raw, mcData.currency);
    if (!mcUsd || mcUsd < 500_000) { failed++; await delay(DELAY_MS); continue; }

    let priceUsd = null;
    if (co.stock_price == null) {
      const pd = await fetchStockPrice(usedSymbol);
      if (pd?.price) priceUsd = toUSD(pd.price, pd.currency);
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
    if (updated <= 10 || updated % 30 === 0) {
      console.log(`[${i+1}/${companies.length}] ✓ ${co.canonical_name} (${usedSymbol}) → $${(mcUsd/1e9).toFixed(1)}B`);
    }
    await delay(DELAY_MS);
  }

  console.log(`\n=== DONE ===`);
  console.log(`Updated: ${updated} | Skipped (no data available): ${skipped} | Failed: ${failed}`);

  const { rows } = await pool.query(`SELECT COUNT(*) as still_null FROM verified_company_intelligence WHERE market_cap_usd IS NULL`);
  console.log(`Remaining NULL market_cap: ${rows[0].still_null}`);
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
