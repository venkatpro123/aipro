import pg from "pg";
const db = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await db.connect();

// Check missing revenue
const { rows: missingRev } = await db.query(`
  SELECT canonical_name, is_public, ticker, workforce_count, data_quality_tier
  FROM verified_company_intelligence
  WHERE revenue_ttm_usd IS NULL
  ORDER BY canonical_name
`);
console.log(`\nMissing revenue_ttm_usd (${missingRev.length}):`);
missingRev.forEach(r => console.log(`  ${r.canonical_name.padEnd(32)} pub=${r.is_public ? 'Y' : 'N'} wf=${r.workforce_count}`));

// Check missing workforce
const { rows: missingWF } = await db.query(`
  SELECT canonical_name, is_public, ticker, revenue_ttm_usd
  FROM verified_company_intelligence
  WHERE workforce_count IS NULL
  ORDER BY canonical_name
`);
console.log(`\nMissing workforce_count (${missingWF.length}):`);
missingWF.forEach(r => {
  const rev = r.revenue_ttm_usd ? `$${(r.revenue_ttm_usd/1e9).toFixed(1)}B` : "no_rev";
  console.log(`  ${r.canonical_name.padEnd(32)} pub=${r.is_public ? 'Y' : 'N'} rev=${rev}`);
});

// Check missing PE (among public companies)
const { rows: missingPE } = await db.query(`
  SELECT canonical_name, ticker, market_cap_usd, revenue_ttm_usd
  FROM verified_company_intelligence
  WHERE pe_ratio IS NULL AND is_public = true
  ORDER BY canonical_name
`);
console.log(`\nPublic companies missing PE ratio (${missingPE.length}):`);
missingPE.forEach(r => {
  const mc = r.market_cap_usd ? `mc=$${(r.market_cap_usd/1e9).toFixed(1)}B` : "no_mc";
  console.log(`  ${r.canonical_name.padEnd(32)} ${r.ticker?.padEnd(15)} ${mc}`);
});

await db.end();
