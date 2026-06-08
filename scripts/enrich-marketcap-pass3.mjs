/**
 * Pass 3: Quarterly → Annual fallback + OTC → primary exchange ticker mapping.
 * Covers the ~195 companies that still have NULL market_cap after passes 1 & 2.
 */
import pg from 'pg';

const DELAY_MS = 350;
const PERIOD1 = 1640000000;
const PERIOD2 = 1790000000;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';

// Exchange suffix map (for stored non-OTC tickers)
const EXCHANGE_SUFFIX = {
  NYSE: '', NASDAQ: '', AMEX: '', OTC: '',
  NSE: '.NS', BSE: '.BO', LSE: '.L', TSX: '.TO', TSXV: '.V',
  XETRA: '.DE', FRA: '.F', TYO: '.T', KRX: '.KS', HKSE: '.HK',
  SGX: '.SI', ASX: '.AX', SET: '.BK', SIX: '.SW', OMX: '.ST',
  BIT: '.MI', EPA: '.PA', BME: '.MC', IDX: '.JK', TADAWUL: '.SR',
  DFM: '.AE', JSE: '.JO', BIST: '.IS', WSE: '.WA', AMS: '.AS',
};

// OTC ADR → primary exchange ticker for non-US companies
const OTC_PRIMARY = {
  // UK
  UL: 'ULVR.L', BTI: 'BATS.L', DEO: 'DGE.L', RIO: 'RIO.L', BHP: 'BHP.L',
  NGG: 'NG.L', WPP: 'WPP.L', PUK: 'PRU.L', VOD: 'VOD.L',
  CMPGY: 'CPG.L', BAESY: 'BA.L', RYCEY: 'RR.L', NGLOY: 'AAL.L',
  RBGLY: 'RKT.L', MAKSY: 'MKS.L', BURBY: 'BRBY.L', BTGOF: 'BT-A.L',
  // Europe
  NSRGY: 'NESN.SW', GLNCY: 'GLEN.L', RHHBY: 'ROG.SW', SXYAY: 'SIKA.SW',
  LVMHF: 'MC.PA', RNLSY: 'RNO.PA', PPRUY: 'KER.PA', HEINY: 'HEIA.AS',
  HENKY: 'HEN3.DE', DSMFY: 'DSFIR.AS',
  // Australia
  WFAFY: 'WES.AX', CMWAY: 'CBA.AX', NABZY: 'NAB.AX', MQBKY: 'MQG.AX',
  OGFGY: 'ORG.AX', FSUGY: 'FMG.AX', WDS: 'WDS.AX',
  // Africa
  MTNOY: 'MTN.JO',
  // Singapore
  UOVEY: 'U11.SI', WLMIF: 'F34.SI',
  // India (OTC → NSE)
  HIIEF: 'HINDALCO.NS', ADANIY: 'ADANIENT.NS', VEDL: 'VEDL.NS',
  // Japan (OTC → TYO)
  SSUMY: '8316.T', MTBEY: '8306.T', MUFGY: '8306.T', SMFGY: '8411.T',
  SFTBY: '9984.T', DSNKY: '6902.T', FUJIY: '6702.T', MSBHF: '6981.T',
  KYOCF: '6971.T', SOMFY: '8002.T', KSRYY: '9433.T',
  // Korea
  LGCEY: '051910.KS', HXSCF: '012330.KS', HSICY: '000270.KS',
  // Hong Kong
  ANPDY: '2020.HK', BYDDY: '1211.HK',
  // Delisted/unavailable — skip
  ZI: null, RDFN: null, ALBHF: null,
};

const FX_TO_USD = {
  USD: 1, GBP: 1.27, EUR: 1.08, JPY: 0.0067, KRW: 0.00074,
  HKD: 0.128, SGD: 0.74, AUD: 0.65, CAD: 0.74, CHF: 1.12,
  SEK: 0.096, BRL: 0.20, MXN: 0.058, IDR: 0.000063, THB: 0.028,
  SAR: 0.267, AED: 0.272, ZAR: 0.055, TWD: 0.031, OMR: 2.60,
  KWD: 3.25, MAD: 0.10, PLN: 0.25, TRY: 0.031, INR: 0.012,
  GBX: 0.01270, ILS: 0.27, CNY: 0.138, DKK: 0.145, NOK: 0.095, NZD: 0.61,
};

function toUSD(val, currency) {
  if (!val || !isFinite(val)) return null;
  return Math.round(val * (FX_TO_USD[currency] ?? 1));
}

function buildSymbols(ticker, exchange, countryCode) {
  if (!ticker) return [];
  const t = ticker.trim();
  const symbols = new Set();

  // Check OTC_PRIMARY first
  if (OTC_PRIMARY[t] !== undefined) {
    if (OTC_PRIMARY[t] === null) return []; // known unavailable
    symbols.add(OTC_PRIMARY[t]);
  }

  // Build from exchange suffix
  if (!t.includes('.') || t.match(/^\d+\.\d+$/)) {
    const suffix = EXCHANGE_SUFFIX[exchange] ?? '';
    symbols.add(t + suffix);
  } else {
    symbols.add(t);
  }

  return [...symbols];
}

async function fetchMC(symbol) {
  for (const type of ['quarterlyMarketCap', 'annualMarketCap']) {
    const url = `https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${encodeURIComponent(symbol)}?type=${type}&period1=${PERIOD1}&period2=${PERIOD2}`;
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(8000) });
      if (!r.ok) continue;
      const d = await r.json();
      const entries = (d?.timeseries?.result?.[0] ?? {})[type] ?? [];
      if (!entries.length) continue;
      const latest = entries[entries.length - 1];
      const raw = latest?.reportedValue?.raw;
      if (!raw) continue;
      return { raw, currency: latest?.currencyCode ?? 'USD' };
    } catch {}
  }
  return null;
}

async function fetchPrice(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(8000) });
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

  const { rows } = await pool.query(`
    SELECT id, canonical_name, ticker, exchange, country_code, stock_price
    FROM verified_company_intelligence
    WHERE market_cap_usd IS NULL AND ticker IS NOT NULL AND ticker != ''
    ORDER BY revenue_ttm_usd DESC NULLS LAST
  `);

  console.log(`Processing ${rows.length} companies`);
  let updated = 0, skipped = 0, failed = 0;

  for (let i = 0; i < rows.length; i++) {
    const co = rows[i];
    const symbols = buildSymbols(co.ticker, co.exchange, co.country_code);
    if (!symbols.length) { skipped++; continue; }

    let mcData = null;
    let usedSymbol = null;
    for (const sym of symbols) {
      mcData = await fetchMC(sym);
      if (mcData) { usedSymbol = sym; break; }
      await delay(200);
    }

    if (!mcData) {
      failed++;
      if (failed <= 10) process.stdout.write(`  ✗ ${co.canonical_name} (${co.ticker})\n`);
      await delay(DELAY_MS);
      continue;
    }

    const mcUsd = toUSD(mcData.raw, mcData.currency);
    if (!mcUsd || mcUsd < 500_000) { failed++; await delay(DELAY_MS); continue; }

    let priceUsd = null;
    if (co.stock_price == null) {
      const pd = await fetchPrice(usedSymbol);
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
    if (updated <= 8 || updated % 20 === 0) {
      console.log(`[${i+1}/${rows.length}] ✓ ${co.canonical_name} (${usedSymbol}) → $${(mcUsd/1e9).toFixed(1)}B`);
    }
    await delay(DELAY_MS);
  }

  console.log(`\n=== DONE ===`);
  console.log(`Updated: ${updated} | Skipped: ${skipped} | Failed: ${failed}`);
  const { rows: r } = await pool.query(`SELECT COUNT(*) as n FROM verified_company_intelligence WHERE market_cap_usd IS NULL`);
  console.log(`Remaining NULL market_cap: ${r[0].n}`);
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
