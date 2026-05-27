// Final count query for all batches
import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const { rows } = await pool.query(`
  SELECT
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE enrichment_version LIKE 'nx%') AS nx_wave,
    COUNT(*) FILTER (WHERE enrichment_version LIKE 'ny%') AS ny_wave,
    COUNT(*) FILTER (WHERE enrichment_version NOT LIKE 'nx%' AND enrichment_version NOT LIKE 'ny%') AS prior_batches,
    COUNT(*) FILTER (WHERE stock_price IS NOT NULL) AS has_stock,
    COUNT(*) FILTER (WHERE pe_ratio IS NOT NULL) AS has_pe,
    COUNT(*) FILTER (WHERE revenue_ttm_usd IS NOT NULL) AS has_revenue,
    COUNT(DISTINCT country_code) AS countries
  FROM verified_company_intelligence
`);

const r = rows[0];
console.log('\n=== verified_company_intelligence — FINAL COUNT ===');
console.log('Total companies:     ' + r.total);
console.log('  NX wave (100):     ' + r.nx_wave);
console.log('  NY wave (300):     ' + r.ny_wave);
console.log('  Prior batches:     ' + r.prior_batches);
console.log('With stock price:    ' + r.has_stock + ' (' + Math.round(r.has_stock/r.total*100) + '%)');
console.log('With PE ratio:       ' + r.has_pe + ' (' + Math.round(r.has_pe/r.total*100) + '%)');
console.log('With revenue TTM:    ' + r.has_revenue + ' (' + Math.round(r.has_revenue/r.total*100) + '%)');
console.log('Countries covered:   ' + r.countries);

// NY batch breakdown
const { rows: batches } = await pool.query(`
  SELECT
    enrichment_version,
    COUNT(*) AS cnt
  FROM verified_company_intelligence
  WHERE enrichment_version LIKE 'ny%'
  GROUP BY enrichment_version
  ORDER BY enrichment_version
`);

console.log('\n--- NY batch breakdown ---');
let totalNY = 0;
for (const b of batches) {
  console.log('  ' + b.enrichment_version + ': ' + b.cnt + ' companies');
  totalNY += parseInt(b.cnt);
}
console.log('  TOTAL NY: ' + totalNY + ' companies');

// Country breakdown for NY wave
const { rows: countries } = await pool.query(`
  SELECT country_code, COUNT(*) AS cnt
  FROM verified_company_intelligence
  WHERE enrichment_version LIKE 'ny%'
  GROUP BY country_code
  ORDER BY cnt DESC
  LIMIT 20
`);

console.log('\n--- Top countries in NY wave ---');
for (const c of countries) {
  console.log('  ' + (c.country_code || 'null') + ': ' + c.cnt);
}

await pool.end();
