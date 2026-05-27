import pg from 'pg';
const { Client } = pg;
const db = new Client(process.env.DATABASE_URL);
await db.connect();
const { rows } = await db.query(`
  SELECT
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE pe_ratio IS NOT NULL) AS has_pe,
    COUNT(*) FILTER (WHERE revenue_ttm_usd IS NOT NULL) AS has_revenue,
    COUNT(*) FILTER (WHERE stock_price IS NOT NULL) AS has_stock,
    COUNT(*) FILTER (WHERE pe_ratio IS NOT NULL AND revenue_ttm_usd IS NOT NULL AND stock_price IS NOT NULL) AS fully_enriched
  FROM verified_company_intelligence
`);
console.log('=== verified_company_intelligence coverage ===');
console.log(`  Total companies:                 ${rows[0].total}`);
console.log(`  Has PE ratio:                    ${rows[0].has_pe}`);
console.log(`  Has revenue TTM (USD):           ${rows[0].has_revenue}`);
console.log(`  Has live stock price:            ${rows[0].has_stock}`);
console.log(`  Fully enriched (PE+Rev+Stock):   ${rows[0].fully_enriched}`);
await db.end();
