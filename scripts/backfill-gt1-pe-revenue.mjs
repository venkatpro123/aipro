import pg from 'pg';
const { Client } = pg;
const db = new Client(process.env.DATABASE_URL);
await db.connect();
console.log('✓ Connected — Backfill GT1 (20 companies) pe_ratio + revenue_ttm_usd\n');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
const FX = { USD:1 };

const lr = await fetch('https://fc.yahoo.com', { headers: { 'User-Agent': UA }, redirect: 'follow' });
const cookie = lr.headers.get('set-cookie') || '';
await new Promise(r => setTimeout(r, 500));
const crumbRes = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', { headers: { 'User-Agent': UA, 'Cookie': cookie } });
const crumb = await crumbRes.text();
console.log(`Crumb: ${crumb.slice(0,15)}\n`);

const gt1 = [
  { name:'nxp semiconductors', ticker:'NXPI' },
  { name:'analog devices', ticker:'ADI' },
  { name:'marvell technology', ticker:'MRVL' },
  { name:'on semiconductor', ticker:'ON' },
  { name:'microchip technology', ticker:'MCHP' },
  { name:'arm holdings', ticker:'ARM' },
  { name:'skyworks solutions', ticker:'SWKS' },
  { name:'western digital', ticker:'WDC' },
  { name:'seagate technology', ticker:'STX' },
  { name:'netapp', ticker:'NTAP' },
  { name:'pure storage', ticker:'PSTG' },
  { name:'nutanix', ticker:'NTNX' },
  { name:'akamai technologies', ticker:'AKAM' },
  { name:'f5', ticker:'FFIV' },
  { name:'coherent corp', ticker:'COHR' },
  { name:'wolfspeed', ticker:'WOLF' },
  { name:'rivian', ticker:'RIVN' },
  { name:'reddit', ticker:'RDDT' },
  { name:'roblox', ticker:'RBLX' },
  { name:'unity technologies', ticker:'U' },
];

let updated=0, peOk=0, revOk=0;
for (const co of gt1) {
  try {
    const hdrs = { 'User-Agent': UA, 'Cookie': cookie };
    await new Promise(r => setTimeout(r, 300));
    const qs = await fetch(`https://query2.finance.yahoo.com/v10/finance/quoteSummary/${co.ticker}?crumb=${encodeURIComponent(crumb)}&modules=financialData%2CsummaryDetail`, { headers: hdrs });
    const qj = await qs.json();
    const fd = qj?.quoteSummary?.result?.[0]?.financialData;
    const sd = qj?.quoteSummary?.result?.[0]?.summaryDetail;
    const pe = sd?.trailingPE?.raw ?? sd?.forwardPE?.raw ?? null;
    const peRatio = pe ? +pe.toFixed(2) : null;
    const rev = fd?.totalRevenue?.raw ?? null;
    const revenueTtm = rev ? Math.round(rev) : null;
    if (peRatio || revenueTtm) {
      await db.query(`UPDATE verified_company_intelligence SET pe_ratio=COALESCE($1,pe_ratio), revenue_ttm_usd=COALESCE($2,revenue_ttm_usd), updated_at=NOW() WHERE canonical_name=$3`, [peRatio, revenueTtm, co.name]);
      updated++;
      if (peRatio) peOk++;
      if (revenueTtm) revOk++;
      console.log(`  ✅ ${co.name.padEnd(30)} PE=${peRatio??'--'} Rev=${revenueTtm?'$'+Math.round(revenueTtm/1e9)+'B':'--'}`);
    } else {
      console.log(`  ⚪ ${co.name.padEnd(30)} no financial data`);
    }
    await new Promise(r => setTimeout(r, 500));
  } catch(e) {
    console.log(`  ❌ ${co.name}: ${e.message}`);
  }
}
console.log(`\n✅ GT1 backfill complete — ${updated} updated, PE: ${peOk}, Revenue: ${revOk}`);
await db.end();
