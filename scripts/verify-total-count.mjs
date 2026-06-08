import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const result = await pool.query('SELECT COUNT(*) as total, COUNT(DISTINCT enrichment_version) as batches FROM verified_company_intelligence;');
console.log('Total companies:', result.rows[0].total);
console.log('Unique batches:', result.rows[0].batches);

const tierResult = await pool.query('SELECT data_quality_tier, COUNT(*) as count FROM verified_company_intelligence GROUP BY data_quality_tier;');
console.log('\nBy tier:');
tierResult.rows.forEach(r => console.log(`  ${r.data_quality_tier}: ${r.count}`));

const publicResult = await pool.query('SELECT is_public, COUNT(*) as count FROM verified_company_intelligence GROUP BY is_public;');
console.log('\nPublic/Private:');
publicResult.rows.forEach(r => console.log(`  ${r.is_public ? 'Public' : 'Private'}: ${r.count}`));

await pool.end();
