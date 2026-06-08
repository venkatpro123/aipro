import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const r = await pool.query(`
  SELECT COUNT(*) as total,
         COUNT(DISTINCT enrichment_version) as batches,
         COUNT(CASE WHEN is_public THEN 1 END) as public_cos,
         COUNT(CASE WHEN country_code = 'IN' THEN 1 END) as india_cos,
         COUNT(CASE WHEN data_quality_tier = 'verified' THEN 1 END) as verified
  FROM verified_company_intelligence
`);

const row = r.rows[0];
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('FINAL GLOBAL DATABASE STATE (After Indian Tech Expansion)');
console.log('═══════════════════════════════════════════════════════════════\n');
console.log(`Total companies: ${row.total}`);
console.log(`  Public: ${row.public_cos} (${(100*row.public_cos/row.total).toFixed(1)}%)`);
console.log(`  Private: ${row.total - row.public_cos} (${(100*(row.total-row.public_cos)/row.total).toFixed(1)}%)`);
console.log(`\nIndian tech companies: ${row.india_cos}`);
console.log(`Verified tier: ${row.verified} (${(100*row.verified/row.total).toFixed(1)}%)`);
console.log(`Total batches: ${row.batches}`);
console.log('\n═══════════════════════════════════════════════════════════════\n');

await pool.end();
