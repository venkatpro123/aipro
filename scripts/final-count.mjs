import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const sql = `
SELECT
  COUNT(*) as total_companies,
  SUM(CASE WHEN enrichment_version LIKE 'gt%' THEN 1 ELSE 0 END) as gt_batch_count,
  SUM(CASE WHEN data_quality_tier = 'verified' THEN 1 ELSE 0 END) as verified_tier,
  SUM(CASE WHEN is_public THEN 1 ELSE 0 END) as public_companies,
  SUM(CASE WHEN is_public = false THEN 1 ELSE 0 END) as private_companies,
  COUNT(DISTINCT country_code) as countries_represented,
  SUM(CASE WHEN pe_ratio IS NOT NULL THEN 1 ELSE 0 END) as with_pe_ratios,
  SUM(CASE WHEN revenue_ttm_usd IS NOT NULL THEN 1 ELSE 0 END) as with_revenue
FROM verified_company_intelligence
WHERE enrichment_version LIKE 'gt%';
`;

try {
  const result = await pool.query(sql);
  const row = result.rows[0];
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('GLOBAL TECH COMPANY DATABASE — FINAL STATE (GT1–GT50)');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Total companies seeded:           ${row.total_companies}`);
  console.log(`Companies from GT batches:        ${row.gt_batch_count}`);
  console.log(`Verified (public with full data): ${row.verified_tier}`);
  console.log(`Public companies:                 ${row.public_companies}`);
  console.log(`Private companies (startups):     ${row.private_companies}`);
  console.log(`Countries represented:            ${row.countries_represented}`);
  console.log(`Companies with PE ratios:         ${row.with_pe_ratios}`);
  console.log(`Companies with revenue (TTM):     ${row.with_revenue}`);
  console.log('═══════════════════════════════════════════════════════════════');

  // Breakdown by batch
  const batchSql = `
  SELECT
    enrichment_version as batch,
    COUNT(*) as count,
    SUM(CASE WHEN is_public THEN 1 ELSE 0 END) as public_count,
    SUM(CASE WHEN pe_ratio IS NOT NULL THEN 1 ELSE 0 END) as with_pe
  FROM verified_company_intelligence
  WHERE enrichment_version LIKE 'gt%'
  GROUP BY enrichment_version
  ORDER BY enrichment_version;
  `;

  const batchResult = await pool.query(batchSql);
  console.log('\nBATCH BREAKDOWN:\n');
  let totalByBatch = 0;
  for (const b of batchResult.rows) {
    totalByBatch += b.count;
    console.log(`${b.batch.padEnd(16)} ${b.count.toString().padStart(3)} co. (${b.public_count} public, ${b.with_pe} PE)`);
  }
  console.log(`${'TOTAL'.padEnd(16)} ${totalByBatch.toString().padStart(3)} co.`);
  console.log('\n═══════════════════════════════════════════════════════════════\n');
} catch (e) {
  console.error('Query error:', e.message);
} finally {
  await pool.end();
}
