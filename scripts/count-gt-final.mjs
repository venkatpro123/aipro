import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const { rows: [total] } = await pool.query(`SELECT COUNT(*) AS n FROM verified_company_intelligence`);
console.log(`\nTotal companies: ${total.n}`);

const { rows: waves } = await pool.query(`
  SELECT enrichment_version AS wave, COUNT(*) AS n
  FROM verified_company_intelligence
  WHERE enrichment_version LIKE 'gt%'
  GROUP BY enrichment_version ORDER BY enrichment_version
`);
console.log('\nGT Wave Breakdown:');
let gtTotal = 0;
for (const r of waves) { console.log(`  ${r.wave.padEnd(18)} ${r.n}`); gtTotal += parseInt(r.n); }
console.log(`  ${'GT TOTAL'.padEnd(18)} ${gtTotal}`);

const { rows: tiers } = await pool.query(`
  SELECT data_quality_tier, COUNT(*) AS n
  FROM verified_company_intelligence GROUP BY data_quality_tier ORDER BY n DESC
`);
console.log('\nBy Quality Tier:');
for (const r of tiers) console.log(`  ${r.data_quality_tier.padEnd(12)} ${r.n}`);

const { rows: countries } = await pool.query(`
  SELECT country_code, COUNT(*) AS n
  FROM verified_company_intelligence GROUP BY country_code ORDER BY n DESC LIMIT 10
`);
console.log('\nTop 10 Countries:');
for (const r of countries) console.log(`  ${(r.country_code||'??').padEnd(6)} ${r.n}`);

await pool.end();
