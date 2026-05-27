import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const { rows } = await pool.query(`
  SELECT
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE country_code = 'IN') AS india_total,
    COUNT(*) FILTER (WHERE enrichment_version LIKE 'ni%') AS ni_wave,
    COUNT(*) FILTER (WHERE country_code='IN' AND enrichment_version LIKE 'ny%') AS india_ny,
    COUNT(*) FILTER (WHERE country_code='IN' AND enrichment_version NOT LIKE 'ni%' AND enrichment_version NOT LIKE 'ny%') AS india_prior,
    COUNT(*) FILTER (WHERE market_cap_usd IS NOT NULL) AS has_mktcap,
    COUNT(*) FILTER (WHERE pe_ratio IS NOT NULL) AS has_pe,
    COUNT(*) FILTER (WHERE revenue_ttm_usd IS NOT NULL) AS has_rev
  FROM verified_company_intelligence
`);
const r = rows[0];
console.log('\n=== FINAL COUNTS AFTER NI WAVE ===');
console.log('Grand total companies:    ' + r.total);
console.log('India total:              ' + r.india_total);
console.log('  NI wave (5x20):         ' + r.ni_wave);
console.log('  NY wave India (NY12+13):'+ r.india_ny);
console.log('  Prior batches India:    ' + r.india_prior);
console.log('Has market cap:           ' + r.has_mktcap + ' (' + Math.round(r.has_mktcap/r.total*100) + '%)');
console.log('Has PE ratio:             ' + r.has_pe + ' (' + Math.round(r.has_pe/r.total*100) + '%)');
console.log('Has Revenue TTM:          ' + r.has_rev + ' (' + Math.round(r.has_rev/r.total*100) + '%)');

const { rows: b } = await pool.query(`
  SELECT enrichment_version, COUNT(*) AS cnt FROM verified_company_intelligence
  WHERE enrichment_version LIKE 'ni%' GROUP BY enrichment_version ORDER BY enrichment_version
`);
console.log('\n--- NI batch breakdown ---');
let total = 0;
for (const x of b) { console.log('  ' + x.enrichment_version + ': ' + x.cnt + ' companies'); total += parseInt(x.cnt); }
console.log('  TOTAL NI: ' + total + ' companies');
await pool.end();
