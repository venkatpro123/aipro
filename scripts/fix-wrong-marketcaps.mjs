/**
 * Fixes market_cap_usd values that were accidentally stored without INR→USD conversion.
 * These show as P/S >> 50x for non-tech companies, or simply way too large.
 *
 * Detection: market_cap_usd > 100B for Indian companies with revenue < 20B
 *            (raw INR value stored instead of USD).
 */
import pg from 'pg';

const INR_TO_USD = 0.012;  // ₹1 = $0.012 (May 2026)
const PERIOD1 = 1640000000;
const PERIOD2 = 1790000000;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';

async function fetchMCWithCurrency(symbol) {
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
      const currency = latest?.currencyCode;  // explicitly check if present
      if (!raw) continue;
      return { raw, currency, hasCurrency: !!currency };
    } catch {}
  }
  return null;
}

const delay = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

  // Detect potential wrong-conversion rows:
  // Case 1: Indian company with mc > 100B but implied P/S > 30x (suggests raw INR stored as USD)
  // Case 2: Any company with mc > 1T that's not a mega-cap (Apple/MSFT/NVDA/etc.)
  const { rows: suspicious } = await pool.query(`
    SELECT id, canonical_name, ticker, exchange, country_code,
           market_cap_usd, revenue_ttm_usd,
           ROUND(market_cap_usd::numeric / GREATEST(revenue_ttm_usd, 1), 1) as ps_ratio
    FROM verified_company_intelligence
    WHERE market_cap_usd IS NOT NULL
      AND (
        -- Indian companies with P/S > 50x that updated_at recently (might have INR bug)
        (country_code = 'IN' AND market_cap_usd > 100000000000
         AND revenue_ttm_usd < 20000000000
         AND market_cap_usd::numeric / GREATEST(revenue_ttm_usd, 1) > 50)
        OR
        -- Any company with mc > $1T that shouldn't be: exclude known mega-caps
        (market_cap_usd > 1000000000000 AND canonical_name NOT IN (
          'apple', 'microsoft', 'nvidia', 'alphabet', 'amazon', 'meta platforms',
          'tesla', 'berkshire hathaway', 'saudi aramco', 'tsmc', 'eli lilly'
        ))
      )
    ORDER BY ps_ratio DESC
  `);

  console.log(`Found ${suspicious.length} suspicious rows:`);
  suspicious.forEach(r => {
    const mcB = (r.market_cap_usd / 1e9).toFixed(1);
    const revB = (r.revenue_ttm_usd / 1e9).toFixed(1);
    console.log(`  ${r.canonical_name}|${r.country_code}|mc=$${mcB}B|rev=$${revB}B|P/S=${r.ps_ratio}x`);
  });

  // Fix each one: re-fetch and apply correct conversion with explicit currency check
  let fixed = 0;
  for (const co of suspicious) {
    if (!co.ticker) continue;

    // Determine Yahoo Finance symbol
    const sym = co.country_code === 'IN' ? co.ticker + (co.exchange === 'NSE' ? '.NS' : '.BO') : co.ticker;

    const data = await fetchMCWithCurrency(sym);
    if (!data) {
      console.log(`  Could not re-fetch ${co.canonical_name} (${sym})`);
      await delay(400);
      continue;
    }

    let correctMcUsd;
    if (data.hasCurrency && data.currency) {
      // Apply explicit conversion based on returned currency
      const fxRates = {
        USD: 1, INR: 0.012, GBP: 1.27, EUR: 1.08, JPY: 0.0067,
        HKD: 0.128, AUD: 0.65, KRW: 0.00074,
      };
      correctMcUsd = Math.round(data.raw * (fxRates[data.currency] ?? 1));
    } else {
      // No currency code → assume INR for Indian companies
      if (co.country_code === 'IN') {
        correctMcUsd = Math.round(data.raw * INR_TO_USD);
      } else {
        console.log(`  No currency for ${co.canonical_name}, skipping`);
        continue;
      }
    }

    const oldMcB = (co.market_cap_usd / 1e9).toFixed(1);
    const newMcB = (correctMcUsd / 1e9).toFixed(1);

    await pool.query(
      `UPDATE verified_company_intelligence SET market_cap_usd = $1, updated_at = NOW() WHERE id = $2`,
      [correctMcUsd, co.id]
    );
    console.log(`  FIXED ${co.canonical_name}: $${oldMcB}B → $${newMcB}B (currency=${data.currency ?? 'assumed INR'})`);
    fixed++;
    await delay(400);
  }

  console.log(`\nFixed ${fixed} rows`);

  // Final sanity check: show top 20 Indian companies by market cap
  const { rows: top } = await pool.query(`
    SELECT canonical_name, market_cap_usd, revenue_ttm_usd,
           ROUND(market_cap_usd::numeric / GREATEST(revenue_ttm_usd, 1), 1) as ps
    FROM verified_company_intelligence
    WHERE country_code = 'IN'
    ORDER BY market_cap_usd DESC NULLS LAST
    LIMIT 15
  `);
  console.log('\nTop 15 India by market_cap:');
  top.forEach(r => console.log(`  ${r.canonical_name}: $${(r.market_cap_usd/1e9).toFixed(1)}B mc | P/S=${r.ps}x`));

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
