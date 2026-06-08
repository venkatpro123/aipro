import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const { rows } = await pool.query(`
  SELECT
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE data_quality_tier = 'verified') as verified,
    COUNT(*) FILTER (WHERE data_quality_tier = 'seed') as seed,
    COUNT(*) FILTER (WHERE stock_price IS NOT NULL) as has_price,
    COUNT(*) FILTER (WHERE market_cap_usd IS NULL) as missing_mc,
    COUNT(*) FILTER (WHERE hiring_velocity_score = 0.5) as default_hv,
    COUNT(DISTINCT country_code) as countries,
    COUNT(*) FILTER (WHERE total_open_roles = ROUND(workforce_count::numeric * 0.03)) as computed_roles
  FROM verified_company_intelligence
`);
console.log(JSON.stringify(rows[0], null, 2));
await pool.end();
