/**
 * Pass 4: Comprehensive OTC→primary exchange mappings for remaining 140+ companies.
 * Indian NSE, Korean KRX, Saudi Tadawul, UAE DFM/ADX, Australian ASX,
 * Chinese HKSE/Shanghai, European primary exchanges.
 */
import pg from 'pg';

const DELAY_MS = 380;
const PERIOD1 = 1640000000;
const PERIOD2 = 1790000000;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';

// Comprehensive OTC → primary exchange symbol mapping
const TICKER_MAP = {
  // === INDIA: OTC → NSE ===
  ULTCF: 'ULTRACEMCO.NS', BKBJF: 'BANKBARODA.NS', PNJBF: 'PNB.NS',
  ASNPF: 'ASIANPAINT.NS', AUPHF: 'AUROPHARMA.NS', EICMF: 'EICHERMOT.NS',
  MTHFF: 'MUTHOOTFIN.NS', INDUF: 'INDUSINDBK.NS', GCPRF: 'GODREJCP.NS',
  DABTF: 'DABUR.NS', DIVLF: 'DIVISLAB.NS', FSTDF: 'FSL.NS',
  FHCEF: 'FORTIS.NS', KPITF: 'KPITTECH.NS', TNLAF: 'TANLA.NS',
  MRPLF: 'MRPL.NS', NHPCF: 'NHPC.NS', COLPF: 'COLPAL.NS',
  AIOAF: 'AIAENG.NS', PCELF: 'PERSISTENT.NS', PGHH: 'PGHH.NS',
  TRNTF: 'TRIDENT.NS', TDPZF: 'BRIGADE.NS', SOBHF: 'SOBHA.NS',
  BHELF: 'BHEL.NS', GSKCHF: 'GLAXO.NS', LINFHF: 'LINDEINDIA.NS',
  BFARF: 'BAJARFINANCE.NS', BAJAJFINS: 'BAJAJFINSV.NS',
  PIRAMAL: 'PEL.NS',
  // Also try direct NSE format for some stored as standard tickers
  VEDL: 'VEDL.NS',

  // === KOREA: OTC → KRX ===
  HYMLF: '012330.KS', LGCLF: '051910.KS', KIMTF: '000270.KS',
  CLLXF: '068270.KS', KTGGY: '033780.KS', SMBGF: '207940.KS',
  SKOFF: '096770.KS', HWACF: '012450.KS', HDDVF: '267250.KS',
  NCSCF: '036570.KS', LOTRY: '023530.KS', DOOBF: '241560.KS',
  KAOBF: '323410.KS', SMGHF: '028050.KS', HYMTF: '005380.KS',

  // === GERMANY: OTC → XETRA ===
  BMWYY: 'BMW.DE', SMNEY: 'ENR.DE',

  // === FRANCE: OTC → EPA ===
  PDRDY: 'RI.PA',  // Pernod Ricard

  // === AUSTRALIA: OTC → ASX ===
  SSLTY: 'STO.AX', WOLWY: 'WOW.AX', TLSYY: 'TLS.AX', ANZBY: 'ANZ.AX',
  // WBK = Westpac NYSE → WBC.AX
  WBK: 'WBC.AX',

  // === CHINA: NYSE/OTC → HKSE ===
  GELYY: '0175.HK', CHL: '0941.HK', PTR: '0857.HK',
  LFC: '2628.HK', CEO: '0883.HK',

  // === UAE: OTC → ADX/DFM ===
  // Many UAE tickers don't have Yahoo Finance coverage; try what we can
  ADIBF: 'ADIB.AE', ETISF: 'ETISALAT.AE', FABBY: 'FAB.AE',
  ALDRFY: 'ALDAR.AE', EMRAF: 'EMAAR.AE',

  // === SAUDI ARABIA: OTC → Tadawul ===
  RYDBF: '1010.SR', ARAFHY: '1120.SR', ASNBF: '1180.SR', STCCY: '7010.SR',

  // === THAILAND: OTC → SET ===
  CPNHF: 'CPF.BK', THAVY: 'TBH.BK', PTPPF: 'PTT.BK',

  // === SINGAPORE: OTC → SGX ===
  CLLDY: 'C31.SI',

  // === MALAYSIA: OTC → KLSE ===
  CIMBY: '1023.KL',

  // === PHILIPPPINES: OTC → PSE ===
  SMPXY: 'SM.PS',

  // === INDONESIA: OTC → IDX ===
  IDFBF: 'INDF.JK',

  // === VIETNAM: OTC → HOSE ===
  VGPKF: 'VIC.VN',

  // === NEW ZEALAND: OTC → NZX ===
  AKIAF: 'AIA.NZ', MLNLF: 'MEL.NZ',

  // === KUWAIT: OTC → Boursa ===
  // Kuwait not well covered on Yahoo Finance
  ZAINF: null, NBKUF: null, KFHEF: null,

  // === QATAR: OTC ===
  QNBAF: null, IQCDF: null,

  // === BAHRAIN ===
  ALBHF: null,

  // === OMAN ===
  BKMUF: null,

  // === NETHERLANDS: Euronext ===
  'TKWY.AS': 'TKWY.AS',  // already has suffix, just retry with annual

  // === ISRAEL ===
  // NASDAQ-listed, try directly with annual
  SPNS: 'SPNS', CYBR: 'CYBR',

  // === CANADA: NYSE → TSX ===
  'LGF-A': 'LGF-A',  // Lionsgate still NYSE
  NVEI: 'NVEI.TO',   // Nuvei on TSX
  TIXT: 'TIXT.TO',

  // === BRAZIL ===
  ERJ: 'ERJ',  // Still NYSE, retry with annual

  // === CHILE ===
  EPCPF: 'COPEC.SN',

  // === JAPAN: OTC → TYO ===
  ESALY: '4523.T', OCPNY: '7733.T', AJINY: '2802.T',

  // === US companies that may have changed ticker ===
  OSTK: 'BYON',    // Overstock rebranded to Beyond
  JNPR: null,      // Acquired by HPE 2024 → private
  PFPT: null,      // Acquired by Thoma Bravo 2021 → private
  SQSP: null,      // Taken private by Permira 2024
  ETWO: null,      // E2open privatized
};

const FX_TO_USD = {
  USD: 1, GBP: 1.27, EUR: 1.08, JPY: 0.0067, KRW: 0.00074,
  HKD: 0.128, SGD: 0.74, AUD: 0.65, CAD: 0.74, CHF: 1.12,
  SEK: 0.096, BRL: 0.20, MXN: 0.058, IDR: 0.000063, THB: 0.028,
  SAR: 0.267, AED: 0.272, ZAR: 0.055, TWD: 0.031, OMR: 2.60,
  KWD: 3.25, MAD: 0.10, PLN: 0.25, TRY: 0.031, INR: 0.012,
  GBX: 0.01270, ILS: 0.27, CNY: 0.138, DKK: 0.145, NOK: 0.095,
  NZD: 0.61, MYR: 0.23, PHP: 0.018, VND: 0.000040, CLP: 0.0011,
};

function toUSD(val, currency) {
  if (!val || !isFinite(val)) return null;
  return Math.round(val * (FX_TO_USD[currency] ?? 1));
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
    const primarySymbol = TICKER_MAP[co.ticker];

    // null = known unavailable/delisted
    if (primarySymbol === null) { skipped++; continue; }

    const symbolsToTry = [];
    if (primarySymbol !== undefined) symbolsToTry.push(primarySymbol);
    // Also try original ticker as fallback (might work with annual now)
    if (co.ticker !== primarySymbol) symbolsToTry.push(co.ticker);

    let mcData = null, usedSymbol = null;
    for (const sym of symbolsToTry) {
      mcData = await fetchMC(sym);
      if (mcData) { usedSymbol = sym; break; }
      await delay(150);
    }

    if (!mcData) {
      failed++;
      if (failed <= 12) process.stdout.write(`  ✗ ${co.canonical_name} (${co.ticker})\n`);
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

    if (priceUsd != null) {
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
    if (updated <= 10 || updated % 20 === 0) {
      console.log(`[${i+1}/${rows.length}] ✓ ${co.canonical_name} (${usedSymbol}) → $${(mcUsd/1e9).toFixed(1)}B`);
    }
    await delay(DELAY_MS);
  }

  console.log(`\n=== DONE ===`);
  console.log(`Updated: ${updated} | Skipped (delisted/unavailable): ${skipped} | Failed: ${failed}`);
  const { rows: r } = await pool.query(`SELECT COUNT(*) as n FROM verified_company_intelligence WHERE market_cap_usd IS NULL`);
  console.log(`Remaining NULL market_cap: ${r[0].n}`);
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
