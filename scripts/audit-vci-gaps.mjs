import pg from "pg";
const db = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await db.connect();

console.log("\n=== VCI DATA AUDIT ===\n");

// Check companies missing revenue
const { rows: missingRev } = await db.query(`
  SELECT canonical_name, is_public, ticker, market_cap_usd, pe_ratio, revenue_ttm_usd, stock_price, data_quality_tier
  FROM verified_company_intelligence
  WHERE revenue_ttm_usd IS NULL
  ORDER BY is_public DESC, canonical_name
`);
console.log(`Companies missing revenue_ttm_usd (${missingRev.length}):`);
missingRev.forEach(r => {
  const mc = r.market_cap_usd ? `mc=$${(r.market_cap_usd/1e9).toFixed(1)}B` : "no_mc";
  console.log(`  ${r.canonical_name.padEnd(32)} pub=${r.is_public ? 'Y' : 'N'} ${r.ticker?.padEnd(15)} ${mc} tier=${r.data_quality_tier}`);
});

// Check heuristic companies
console.log("\nHeuristic tier companies (should be seed if they have live data):");
const { rows: heur } = await db.query(`
  SELECT canonical_name, is_public, ticker, market_cap_usd, stock_price, workforce_count
  FROM verified_company_intelligence
  WHERE data_quality_tier = 'heuristic'
  ORDER BY canonical_name
`);
heur.forEach(r => {
  const mc = r.market_cap_usd ? `mc=$${(r.market_cap_usd/1e9).toFixed(1)}B` : "no_mc";
  const wf = r.workforce_count ? `wf=${r.workforce_count}` : "no_wf";
  console.log(`  ${r.canonical_name.padEnd(32)} pub=${r.is_public ? 'Y' : 'N'} ${r.ticker?.padEnd(15)} ${mc} ${wf}`);
});

await db.end();
