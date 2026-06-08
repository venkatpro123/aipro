import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const r = await pool.query(`
  SELECT
    COUNT(*) as total,
    COUNT(CASE WHEN country_code='IN' THEN 1 END) as india,
    COUNT(CASE WHEN country_code='IN' AND market_cap_usd < 900000000 THEN 1 END) as sub900m,
    COUNT(CASE WHEN country_code='IN' AND market_cap_usd < 500000000 THEN 1 END) as sub500m,
    COUNT(CASE WHEN country_code='IN' AND market_cap_usd < 200000000 THEN 1 END) as sub200m,
    COUNT(CASE WHEN country_code='IN' AND market_cap_usd IS NULL THEN 1 END) as no_mcap
  FROM verified_company_intelligence
`);
const s = r.rows[0];
console.log('Total global :', s.total);
console.log('India total  :', s.india);
console.log('India <$900M :', s.sub900m);
console.log('India <$500M :', s.sub500m);
console.log('India <$200M :', s.sub200m);
console.log('India no mcap:', s.no_mcap);

// Show latest 10 inserted Indian entries
const latest = await pool.query(`
  SELECT canonical_name, market_cap_usd, workforce_count, enrichment_version, data_quality_tier
  FROM verified_company_intelligence
  WHERE country_code='IN'
  ORDER BY created_at DESC LIMIT 15
`);
console.log('\nLast 15 Indian inserts:');
latest.rows.forEach(r => {
  const mc = r.market_cap_usd ? '$' + (r.market_cap_usd/1e6).toFixed(0)+'M' : 'null';
  console.log(`  ${r.canonical_name.padEnd(30)} mc=${mc.padStart(8)}  wf=${String(r.workforce_count).padStart(6)}  v=${r.enrichment_version}`);
});
await pool.end();
