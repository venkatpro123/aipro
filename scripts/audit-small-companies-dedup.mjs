// Audit GT87-GT95 Indian small companies for deduplication
import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

console.log('\n═══════════════════════════════════════════════════════════════════');
console.log('AUDIT: GT87-GT95 INDIAN SMALL COMPANIES DEDUPLICATION CHECK (2026)');
console.log('═══════════════════════════════════════════════════════════════════\n');

// Total counts
const counts = await pool.query(`
  SELECT COUNT(*) as total,
         COUNT(DISTINCT canonical_name) as unique_cos,
         COUNT(CASE WHEN enrichment_version LIKE 'gt8%' OR enrichment_version LIKE 'gt9%' THEN 1 END) as small_co_count
  FROM verified_company_intelligence
  WHERE country_code='IN'
    AND (enrichment_version LIKE 'gt8%' OR enrichment_version LIKE 'gt9%')
`);

console.log('NEW BATCHES (GT87-GT95) STATUS:');
console.log(`  Total entries: ${counts.rows[0].small_co_count}`);
console.log(`  Unique companies: ${counts.rows[0].unique_cos}`);

// Duplicate check for GT87-GT95
const dups_new = await pool.query(`
  SELECT COUNT(*) as dup_count FROM (
    SELECT canonical_name FROM verified_company_intelligence
    WHERE country_code='IN' AND (enrichment_version LIKE 'gt8%' OR enrichment_version LIKE 'gt9%')
    GROUP BY canonical_name HAVING COUNT(*) > 1
  ) x
`);

console.log(`  Duplicate groups: ${dups_new.rows[0].dup_count}`);
console.log(`  Status: ${dups_new.rows[0].dup_count === 0 ? '✅ CLEAN' : '⚠️  DUPLICATES FOUND'}\n`);

// All Indian companies check
const all_india = await pool.query(`
  SELECT COUNT(*) as total,
         COUNT(DISTINCT canonical_name) as unique_cos
  FROM verified_company_intelligence
  WHERE country_code='IN'
`);

const dups_all = await pool.query(`
  SELECT COUNT(*) as dup_count FROM (
    SELECT canonical_name FROM verified_company_intelligence
    WHERE country_code='IN'
    GROUP BY canonical_name HAVING COUNT(*) > 1
  ) x
`);

console.log('ALL INDIAN COMPANIES (CUMULATIVE):');
console.log(`  Total entries: ${all_india.rows[0].total}`);
console.log(`  Unique companies: ${all_india.rows[0].unique_cos}`);
console.log(`  Duplicate groups: ${dups_all.rows[0].dup_count}`);
console.log(`  Status: ${dups_all.rows[0].dup_count === 0 ? '✅ ZERO DUPLICATES' : '⚠️  DUPLICATES'}\n`);

// Global database
const global_db = await pool.query(`
  SELECT COUNT(*) as total,
         COUNT(DISTINCT enrichment_version) as batches,
         COUNT(DISTINCT canonical_name) as global_unique
  FROM verified_company_intelligence
`);

console.log('GLOBAL DATABASE:');
console.log(`  Total companies: ${global_db.rows[0].total}`);
console.log(`  Global unique: ${global_db.rows[0].global_unique}`);
console.log(`  Total batches: ${global_db.rows[0].batches}`);

// Break down by batch version
const batches = await pool.query(`
  SELECT enrichment_version,
         COUNT(*) as count,
         COUNT(CASE WHEN data_quality_tier='seed' THEN 1 END) as seed_count,
         COUNT(CASE WHEN data_quality_tier='verified' THEN 1 END) as verified_count
  FROM verified_company_intelligence
  WHERE country_code='IN' AND (enrichment_version LIKE 'gt8%' OR enrichment_version LIKE 'gt9%')
  GROUP BY enrichment_version
  ORDER BY enrichment_version
`);

console.log('\nBREAKDOWN BY BATCH:');
batches.rows.forEach(b => {
  const tier = b.verified_count > 0 ? `${b.verified_count} verified` : `${b.seed_count} seed`;
  console.log(`  ${b.enrichment_version.padEnd(14)}: ${b.count.toString().padStart(2)} (${tier})`);
});

// Market cap distribution
const market_caps = await pool.query(`
  SELECT
    COUNT(CASE WHEN market_cap_usd >= 5000000000 THEN 1 END) as mega_5b,
    COUNT(CASE WHEN market_cap_usd >= 2000000000 AND market_cap_usd < 5000000000 THEN 1 END) as large_2to5b,
    COUNT(CASE WHEN market_cap_usd >= 1000000000 AND market_cap_usd < 2000000000 THEN 1 END) as mid_1to2b,
    COUNT(CASE WHEN market_cap_usd < 1000000000 THEN 1 END) as small_under1b
  FROM verified_company_intelligence
  WHERE country_code='IN' AND (enrichment_version LIKE 'gt8%' OR enrichment_version LIKE 'gt9%')
`);

console.log('\nMARKET CAP DISTRIBUTION (GT87-GT95):');
const mc = market_caps.rows[0];
console.log(`  ≥$5B: ${mc.mega_5b}`);
console.log(`  $2-5B: ${mc.large_2to5b}`);
console.log(`  $1-2B: ${mc.mid_1to2b}`);
console.log(`  <$1B: ${mc.small_under1b}`);

// Revenue coverage
const rev = await pool.query(`
  SELECT COUNT(CASE WHEN revenue_ttm_usd > 0 THEN 1 END) as with_revenue,
         COUNT(*) as total,
         ROUND(100.0 * COUNT(CASE WHEN revenue_ttm_usd > 0 THEN 1 END) / COUNT(*), 1) as pct
  FROM verified_company_intelligence
  WHERE country_code='IN' AND (enrichment_version LIKE 'gt8%' OR enrichment_version LIKE 'gt9%')
`);

console.log('\nDATA COMPLETENESS:');
console.log(`  Revenue coverage: ${rev.rows[0].with_revenue}/${rev.rows[0].total} (${rev.rows[0].pct}%)`);

// Top by market cap
const top = await pool.query(`
  SELECT display_name, market_cap_usd, enrichment_version, workforce_count
  FROM verified_company_intelligence
  WHERE country_code='IN' AND (enrichment_version LIKE 'gt8%' OR enrichment_version LIKE 'gt9%')
  ORDER BY market_cap_usd DESC NULLS LAST
  LIMIT 15
`);

console.log('\nTOP 15 SMALL COMPANIES BY MARKET CAP:');
top.rows.forEach((co, i) => {
  const cap = co.market_cap_usd ? `$${(co.market_cap_usd/1e9).toFixed(1)}B` : 'N/A';
  console.log(`  ${(i+1).toString().padStart(2)}. ${co.display_name.padEnd(35)} ${cap.padStart(8)}`);
});

console.log('\n═══════════════════════════════════════════════════════════════════');
console.log('✅ AUDIT COMPLETE');
console.log('═══════════════════════════════════════════════════════════════════\n');

await pool.end();
