// check-open-roles-countries.mjs
import pg from "pg";
const db = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await db.connect();

const { rows } = await db.query(`
  SELECT country_code, count(*) as cnt,
    count(CASE WHEN is_public THEN 1 END) as public_count
  FROM verified_company_intelligence
  WHERE total_open_roles IS NULL
  GROUP BY country_code
  ORDER BY cnt DESC
`);

console.log('Countries missing total_open_roles:');
rows.forEach(r => console.log(`  ${(r.country_code || 'NULL').padEnd(4)}: ${r.cnt} companies (${r.public_count} public)`));

// Also show companies grouped by market
const { rows: allCompanies } = await db.query(`
  SELECT canonical_name, display_name, country_code, is_public, total_open_roles
  FROM verified_company_intelligence
  ORDER BY country_code, canonical_name
`);

const byCountry = {};
for (const co of allCompanies) {
  const cc = co.country_code || 'XX';
  if (!byCountry[cc]) byCountry[cc] = [];
  byCountry[cc].push(co);
}

console.log('\n=== ALL COMPANIES BY COUNTRY ===');
for (const [cc, cos] of Object.entries(byCountry).sort()) {
  const missing = cos.filter(c => c.total_open_roles === null);
  const hasData = cos.filter(c => c.total_open_roles !== null);
  console.log(`\n${cc} (${cos.length} total, ${missing.length} missing open_roles):`);
  for (const co of cos) {
    const status = co.total_open_roles !== null ? `✓ ${co.total_open_roles}` : '— NULL';
    const pub = co.is_public ? '[PUB]' : '[PVT]';
    console.log(`  ${pub} ${co.display_name.substring(0, 35).padEnd(35)} ${status}`);
  }
}

await db.end();
