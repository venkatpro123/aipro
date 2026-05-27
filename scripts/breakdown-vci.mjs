import pg from 'pg';
const { Client } = pg;
const db = new Client(process.env.DATABASE_URL);
await db.connect();

const { rows } = await db.query(`
  SELECT country_code, COUNT(*) AS count
  FROM verified_company_intelligence
  GROUP BY country_code ORDER BY COUNT(*) DESC
`);

console.log('=== Companies by country ===');
rows.forEach(r => console.log(`  ${(r.country_code||'--').padEnd(5)} ${r.count}`));

const { rows: wf } = await db.query(`
  SELECT COUNT(*) FILTER (WHERE recent_layoff_count > 0) AS has_layoffs,
         COUNT(*) FILTER (WHERE hiring_velocity_score > 0.5) AS actively_hiring,
         COUNT(*) FILTER (WHERE stock_price IS NOT NULL) AS has_live_stock
  FROM verified_company_intelligence
`);
console.log('\n=== Signal coverage ===');
console.log(`  Companies with layoff events:     ${wf[0].has_layoffs}`);
console.log(`  Companies actively hiring (>0.5): ${wf[0].actively_hiring}`);
console.log(`  Companies with live stock price:  ${wf[0].has_live_stock}`);

await db.end();
