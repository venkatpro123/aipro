import pg from 'pg';
const { Client } = pg;

const db = new Client(process.env.DATABASE_URL);
await db.connect();

const { rows } = await db.query(`
  SELECT
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE country_code = 'IN') AS india,
    COUNT(*) FILTER (WHERE country_code != 'IN' OR country_code IS NULL) AS other,
    COUNT(*) FILTER (WHERE stock_price IS NOT NULL) AS has_stock,
    COUNT(*) FILTER (WHERE data_quality_tier = 'verified') AS verified,
    COUNT(*) FILTER (WHERE data_quality_tier = 'seed') AS seed,
    COUNT(*) FILTER (WHERE data_quality_tier = 'heuristic') AS heuristic
  FROM verified_company_intelligence
`);

const r = rows[0];
console.log('=== verified_company_intelligence summary ===');
console.log(`Total rows:            ${r.total}`);
console.log(`Indian companies (IN): ${r.india}`);
console.log(`Other / global:        ${r.other}`);
console.log(`Has live stock price:  ${r.has_stock}`);
console.log(`Quality: verified      ${r.verified}`);
console.log(`Quality: seed          ${r.seed}`);
console.log(`Quality: heuristic     ${r.heuristic}`);

await db.end();
