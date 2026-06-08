import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('GLOBAL TECH COMPANY DATABASE — FINAL STATE (GT1–GT55)');
console.log('═══════════════════════════════════════════════════════════════\n');

try {
  const counts = await pool.query(`
    SELECT
      COUNT(*) as total_companies,
      COUNT(DISTINCT SUBSTRING(enrichment_version FROM 1 FOR POSITION('-' IN enrichment_version)-1)) as gt_batches,
      SUM(CASE WHEN is_public THEN 1 ELSE 0 END) as public_count,
      SUM(CASE WHEN is_public = false THEN 1 ELSE 0 END) as private_count,
      COUNT(DISTINCT country_code) as country_count,
      COUNT(DISTINCT industry) as industry_count,
      SUM(CASE WHEN pe_ratio IS NOT NULL THEN 1 ELSE 0 END) as with_pe,
      SUM(CASE WHEN revenue_ttm_usd IS NOT NULL THEN 1 ELSE 0 END) as with_revenue,
      SUM(CASE WHEN data_quality_tier = 'verified' THEN 1 ELSE 0 END) as verified_tier
    FROM verified_company_intelligence
    WHERE enrichment_version LIKE 'gt%'
  `);

  const c = counts.rows[0];
  console.log(`Total Companies:              ${c.total_companies.toString().padStart(5)}`);
  console.log(`GT Batches (GT1–GT55):        ${c.gt_batches.toString().padStart(5)}`);
  console.log(`  ├─ Public companies:        ${c.public_count.toString().padStart(5)}`);
  console.log(`  ├─ Private (startups):      ${c.private_count.toString().padStart(5)}`);
  console.log(`  └─ Countries:               ${c.country_count.toString().padStart(5)}`);
  console.log(`\nData Coverage:`);
  console.log(`  ├─ With PE ratios:          ${c.with_pe.toString().padStart(5)} (${Math.round(c.with_pe/c.total_companies*100)}%)`);
  console.log(`  ├─ With revenue (TTM):      ${c.with_revenue.toString().padStart(5)} (${Math.round(c.with_revenue/c.total_companies*100)}%)`);
  console.log(`  └─ Verified tier:           ${c.verified_tier.toString().padStart(5)} (${Math.round(c.verified_tier/c.total_companies*100)}%)`);
  console.log(`\nIndustry Coverage:            ${c.industry_count.toString().padStart(5)} unique industries`);

  // Batch summary
  console.log('\n' + '─'.repeat(63));
  console.log('GT BATCH SUMMARY:\n');

  const batchSummary = await pool.query(`
    SELECT
      enrichment_version,
      COUNT(*) as count,
      SUM(CASE WHEN is_public THEN 1 ELSE 0 END) as public_count,
      SUM(CASE WHEN pe_ratio IS NOT NULL THEN 1 ELSE 0 END) as with_pe,
      SUM(CASE WHEN revenue_ttm_usd IS NOT NULL THEN 1 ELSE 0 END) as with_revenue
    FROM verified_company_intelligence
    WHERE enrichment_version LIKE 'gt%'
    GROUP BY enrichment_version
    ORDER BY enrichment_version
  `);

  let totalCount = 0;
  for (const batch of batchSummary.rows) {
    totalCount += batch.count;
    console.log(`${batch.enrichment_version.padEnd(16)} ${batch.count.toString().padStart(3)} cos | ${batch.public_count.toString().padStart(2)}P ${batch.with_pe.toString().padStart(2)}PE ${batch.with_revenue.toString().padStart(2)}Rev`);
  }
  console.log('─'.repeat(63));
  console.log(`${'TOTAL'.padEnd(16)} ${totalCount.toString().padStart(3)} cos\n`);

  // Data quality summary
  console.log('DATA QUALITY SUMMARY:');
  const quality = await pool.query(`
    SELECT
      data_quality_tier,
      COUNT(*) as count,
      ROUND(AVG(CAST(financials_confidence AS NUMERIC)), 2) as avg_confidence
    FROM verified_company_intelligence
    WHERE enrichment_version LIKE 'gt%'
    GROUP BY data_quality_tier
  `);

  for (const tier of quality.rows) {
    console.log(`  ${tier.data_quality_tier.padEnd(10)} ${tier.count.toString().padStart(3)} companies (avg confidence: ${tier.avg_confidence})`);
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('✅ GLOBAL TECH COMPANY DATABASE COMPLETE');
  console.log('   Ready for live signal enrichment, risk scoring, and analysis');
  console.log('═══════════════════════════════════════════════════════════════\n');

} catch (e) {
  console.error('Error:', e.message);
} finally {
  await pool.end();
}
