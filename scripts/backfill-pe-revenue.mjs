import pg from 'pg';
const { Client } = pg;
const db = new Client(process.env.DATABASE_URL);
await db.connect();
console.log('✓ Connected — Backfill pe_ratio + revenue_ttm_usd for all existing rows\n');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
const FX = { USD:1, INR:1/84.5, EUR:1.08, GBP:1.26, JPY:1/150, KRW:1/1335, TWD:1/31.7, AUD:0.65, CAD:0.74, CHF:1.12, SEK:1/10.5, HKD:1/7.8, CNY:1/7.3, SGD:0.74, BRL:1/5.0, SAR:1/3.75, NOK:1/10.6, ILS:1/3.7 };

// Init session
const lr = await fetch('https://fc.yahoo.com', { headers: { 'User-Agent': UA }, redirect: 'follow' });
const cookie = lr.headers.get('set-cookie') || '';
await new Promise(r => setTimeout(r, 600));
const crumbRes = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', { headers: { 'User-Agent': UA, 'Cookie': cookie } });
const crumb = await crumbRes.text();
console.log(`Session crumb: ${crumb.slice(0,15)}\n`);

// Fetch all companies with tickers but NULL pe_ratio or revenue_ttm_usd
const { rows: companies } = await db.query(`
  SELECT canonical_name, ticker
  FROM verified_company_intelligence
  WHERE ticker IS NOT NULL
    AND (pe_ratio IS NULL OR revenue_ttm_usd IS NULL)
  ORDER BY canonical_name
`);
console.log(`Found ${companies.length} companies to backfill\n`);

let updated=0, peOk=0, revOk=0;
for (const co of companies) {
  try {
    const hdrs = { 'User-Agent': UA, 'Cookie': cookie };
    // Get chart for currency info
    const cr = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${co.ticker}?interval=1d&range=5d`, { headers: hdrs });
    const cj = await cr.json();
    const currency = cj?.chart?.result?.[0]?.meta?.currency || 'USD';
    const fx = FX[currency] ?? 1;

    await new Promise(r => setTimeout(r, 300));
    const qs = await fetch(`https://query2.finance.yahoo.com/v10/finance/quoteSummary/${co.ticker}?crumb=${encodeURIComponent(crumb)}&modules=financialData%2CsummaryDetail`, { headers: hdrs });
    const qj = await qs.json();
    const fd = qj?.quoteSummary?.result?.[0]?.financialData;
    const sd = qj?.quoteSummary?.result?.[0]?.summaryDetail;
    const pe = sd?.trailingPE?.raw ?? sd?.forwardPE?.raw ?? null;
    const peRatio = pe ? +pe.toFixed(2) : null;
    const rev = fd?.totalRevenue?.raw ?? null;
    const revenueTtm = rev ? Math.round(rev * fx) : null;

    if (peRatio || revenueTtm) {
      await db.query(`
        UPDATE verified_company_intelligence
        SET pe_ratio = COALESCE($1, pe_ratio),
            revenue_ttm_usd = COALESCE($2, revenue_ttm_usd),
            updated_at = NOW()
        WHERE canonical_name = $3
      `, [peRatio, revenueTtm, co.canonical_name]);
      updated++;
      if (peRatio) peOk++;
      if (revenueTtm) revOk++;
      console.log(`  ✅ ${co.canonical_name.padEnd(35)} PE=${peRatio ?? '--'} Rev=${revenueTtm ? '$'+Math.round(revenueTtm/1e9)+'B' : '--'}`);
    } else {
      console.log(`  ⚪ ${co.canonical_name.padEnd(35)} no data`);
    }
    await new Promise(r => setTimeout(r, 700));
  } catch(e) {
    console.log(`  ❌ ${co.canonical_name}: ${e.message}`);
    await new Promise(r => setTimeout(r, 500));
  }
}
console.log(`\n✅ Backfill complete — ${updated} rows updated, PE: ${peOk}, Revenue: ${revOk}`);
await db.end();
