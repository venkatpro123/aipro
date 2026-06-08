// Final comprehensive deduplication audit: GT61-GT75
import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

console.log('═══════════════════════════════════════════════════════════════');
console.log('FINAL INDIAN TECH DEDUPLICATION AUDIT (GT61–GT75)');
console.log('═══════════════════════════════════════════════════════════════\n');

// Get all Indian tech entries
const allIndian = await pool.query(`
  SELECT COUNT(*) as total_rows,
         COUNT(DISTINCT canonical_name) as unique_companies,
         COUNT(DISTINCT enrichment_version) as batches
  FROM verified_company_intelligence
  WHERE (enrichment_version LIKE 'gt6%' OR enrichment_version LIKE 'gt7%')
    AND country_code = 'IN'
`);

console.log('INDIAN TECH DATABASE STATE:');
console.log(`  Total rows: ${allIndian.rows[0].total_rows}`);
console.log(`  Unique companies: ${allIndian.rows[0].unique_companies}`);
console.log(`  Batches: ${allIndian.rows[0].batches}`);

// Check for exact duplicates
const exactDups = await pool.query(`
  SELECT canonical_name, COUNT(*) as count,
         STRING_AGG(DISTINCT enrichment_version, ', ') as versions
  FROM verified_company_intelligence
  WHERE (enrichment_version LIKE 'gt6%' OR enrichment_version LIKE 'gt7%')
    AND country_code = 'IN'
  GROUP BY canonical_name
  HAVING COUNT(*) > 1
  ORDER BY count DESC
`);

if (exactDups.rows.length === 0) {
  console.log('\n✅ NO EXACT DUPLICATES FOUND');
} else {
  console.log(`\n⚠️ EXACT DUPLICATES: ${exactDups.rows.length}`);
  exactDups.rows.forEach(r => {
    console.log(`  ${r.canonical_name} (${r.count}x) — ${r.versions}`);
  });
}

// Check data quality distribution
const qualityTier = await pool.query(`
  SELECT data_quality_tier, COUNT(*) as count,
         ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) as pct
  FROM verified_company_intelligence
  WHERE (enrichment_version LIKE 'gt6%' OR enrichment_version LIKE 'gt7%')
    AND country_code = 'IN'
  GROUP BY data_quality_tier
  ORDER BY count DESC
`);

console.log('\nDATA QUALITY DISTRIBUTION:');
qualityTier.rows.forEach(r => {
  console.log(`  ${r.data_quality_tier.padEnd(12)}: ${r.count.toString().padStart(3)} (${r.pct}%)`);
});

// Check public vs private
const publicPrivate = await pool.query(`
  SELECT is_public, COUNT(*) as count
  FROM verified_company_intelligence
  WHERE (enrichment_version LIKE 'gt6%' OR enrichment_version LIKE 'gt7%')
    AND country_code = 'IN'
  GROUP BY is_public
  ORDER BY count DESC
`);

console.log('\nPUBLIC / PRIVATE DISTRIBUTION:');
publicPrivate.rows.forEach(r => {
  const label = r.is_public ? 'PUBLIC' : 'PRIVATE';
  console.log(`  ${label.padEnd(12)}: ${r.count}`);
});

// Batch breakdown
const batches = await pool.query(`
  SELECT enrichment_version, COUNT(*) as count,
         SUM(CASE WHEN is_public THEN 1 ELSE 0 END) as public_count,
         COUNT(DISTINCT country_code) as countries
  FROM verified_company_intelligence
  WHERE (enrichment_version LIKE 'gt6%' OR enrichment_version LIKE 'gt7%')
    AND country_code = 'IN'
  GROUP BY enrichment_version
  ORDER BY enrichment_version
`);

console.log('\nBATCH BREAKDOWN (GT61–GT75):');
batches.rows.forEach(b => {
  console.log(`  ${b.enrichment_version}: ${b.count.toString().padStart(2)} cos (${b.public_count} public)`);
});

// Financial data coverage
const financials = await pool.query(`
  SELECT
    COUNT(*) as total,
    COUNT(CASE WHEN pe_ratio IS NOT NULL THEN 1 END) as with_pe,
    COUNT(CASE WHEN revenue_ttm_usd IS NOT NULL AND revenue_ttm_usd > 0 THEN 1 END) as with_revenue,
    COUNT(CASE WHEN market_cap_usd IS NOT NULL AND market_cap_usd > 0 THEN 1 END) as with_marketcap
  FROM verified_company_intelligence
  WHERE (enrichment_version LIKE 'gt6%' OR enrichment_version LIKE 'gt7%')
    AND country_code = 'IN'
`);

console.log('\nFINANCIAL DATA COVERAGE:');
const f = financials.rows[0];
console.log(`  PE ratios: ${f.with_pe}/${f.total} (${(100*f.with_pe/f.total).toFixed(1)}%)`);
console.log(`  Revenue: ${f.with_revenue}/${f.total} (${(100*f.with_revenue/f.total).toFixed(1)}%)`);
console.log(`  Market cap: ${f.with_marketcap}/${f.total} (${(100*f.with_marketcap/f.total).toFixed(1)}%)`);

// Top 10 companies by market cap
const topCos = await pool.query(`
  SELECT canonical_name, display_name, market_cap_usd, data_quality_tier, enrichment_version
  FROM verified_company_intelligence
  WHERE (enrichment_version LIKE 'gt6%' OR enrichment_version LIKE 'gt7%')
    AND country_code = 'IN'
  ORDER BY market_cap_usd DESC NULLS LAST
  LIMIT 10
`);

console.log('\nTOP 10 BY MARKET CAP:');
topCos.rows.forEach((co, i) => {
  console.log(`  ${(i+1).toString().padStart(2)}. ${co.display_name.padEnd(30)} $${(co.market_cap_usd/1e9).toFixed(1)}B (${co.data_quality_tier})`);
});

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('✅ FINAL INDIAN TECH AUDIT COMPLETE');
console.log('═══════════════════════════════════════════════════════════════\n');

await pool.end();
