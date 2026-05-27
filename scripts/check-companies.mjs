import pg from 'pg';
const db = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await db.connect();
const { rows } = await db.query(`SELECT canonical_name, display_name, country_code, industry, is_public, ticker, total_open_roles, hiring_source FROM verified_company_intelligence WHERE total_open_roles IS NULL ORDER BY country_code, canonical_name`);
console.log('NULL companies full details:');
rows.forEach(r => console.log(`  [${r.country_code}] ${r.canonical_name} | ${r.display_name} | ${r.industry} | ticker=${r.ticker} | public=${r.is_public}`));
await db.end();
