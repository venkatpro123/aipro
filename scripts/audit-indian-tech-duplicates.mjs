// Audit Indian tech companies for duplicates across GT61-GT70
import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

console.log('═══════════════════════════════════════════════════════════════');
console.log('INDIAN TECH DUPLICATION AUDIT (GT61–GT70)');
console.log('═══════════════════════════════════════════════════════════════\n');

// Find exact duplicates by canonical_name
const exactDups = await pool.query(`
  SELECT canonical_name, COUNT(*) as count,
         STRING_AGG(DISTINCT enrichment_version, ', ') as versions,
         COUNT(DISTINCT market_cap_usd) as cap_variance
  FROM verified_company_intelligence
  WHERE enrichment_version LIKE 'gt6%' OR enrichment_version LIKE 'gt7%'
  GROUP BY canonical_name
  HAVING COUNT(*) > 1
  ORDER BY count DESC
`);

console.log('EXACT DUPLICATES (same canonical_name, multiple rows):');
if (exactDups.rows.length === 0) {
  console.log('✅ NO EXACT DUPLICATES FOUND\n');
} else {
  console.log(`⚠️ FOUND ${exactDups.rows.length} DUPLICATE ENTRIES:\n`);
  exactDups.rows.forEach(r => {
    console.log(`  ${r.canonical_name}`);
    console.log(`    Count: ${r.count} | Versions: ${r.versions} | Cap variance: ${r.cap_variance}`);
  });
  console.log();
}

// Find near-duplicates (similar names, same country, possibly different enrichment)
const nearDups = await pool.query(`
  SELECT a.canonical_name, b.canonical_name, a.enrichment_version, b.enrichment_version,
         a.market_cap_usd, b.market_cap_usd
  FROM verified_company_intelligence a
  JOIN verified_company_intelligence b ON a.id < b.id
  WHERE (a.country_code = 'IN') AND (b.country_code = 'IN')
    AND (a.enrichment_version LIKE 'gt6%' OR a.enrichment_version LIKE 'gt7%')
    AND (b.enrichment_version LIKE 'gt6%' OR b.enrichment_version LIKE 'gt7%')
    AND (a.canonical_name != b.canonical_name)
    AND (
      SIMILARITY(a.canonical_name, b.canonical_name) > 0.6
      OR (a.display_name IS NOT NULL AND b.display_name IS NOT NULL
          AND SIMILARITY(a.display_name, b.display_name) > 0.7)
    )
  LIMIT 20
`);

console.log('NEAR-DUPLICATES (similar names, possible alternate spellings):');
if (nearDups.rows.length === 0) {
  console.log('✅ NO NEAR-DUPLICATES FOUND\n');
} else {
  console.log(`⚠️ FOUND ${nearDups.rows.length} POSSIBLE NEAR-DUPLICATES:\n`);
  nearDups.rows.forEach(r => {
    console.log(`  "${r.canonical_name}" vs "${r.canonical_name}"`);
    console.log(`    Versions: ${r.enrichment_version} ↔ ${r.enrichment_version}`);
  });
  console.log();
}

// Data consistency check: same company with different financial data
const inconsistencies = await pool.query(`
  SELECT canonical_name, COUNT(*) as rows,
         MIN(market_cap_usd) as min_cap, MAX(market_cap_usd) as max_cap,
         MIN(pe_ratio) as min_pe, MAX(pe_ratio) as max_pe,
         MIN(revenue_ttm_usd) as min_rev, MAX(revenue_ttm_usd) as max_rev
  FROM verified_company_intelligence
  WHERE (country_code = 'IN')
    AND (enrichment_version LIKE 'gt6%' OR enrichment_version LIKE 'gt7%')
  GROUP BY canonical_name
  HAVING (MAX(market_cap_usd) - MIN(market_cap_usd) > MIN(market_cap_usd) * 0.2)
     OR (MAX(pe_ratio) - MIN(pe_ratio) > 5)
  ORDER BY canonical_name
`);

console.log('DATA INCONSISTENCIES (>20% variance in same company):');
if (inconsistencies.rows.length === 0) {
  console.log('✅ NO SIGNIFICANT INCONSISTENCIES FOUND\n');
} else {
  console.log(`⚠️ FOUND ${inconsistencies.rows.length} INCONSISTENT ENTRIES:\n`);
  inconsistencies.rows.forEach(r => {
    console.log(`  ${r.canonical_name}`);
    console.log(`    Market cap range: $${(r.min_cap/1e9).toFixed(1)}B – $${(r.max_cap/1e9).toFixed(1)}B`);
    if (r.min_pe && r.max_pe) console.log(`    PE range: ${r.min_pe.toFixed(1)} – ${r.max_pe.toFixed(1)}`);
  });
  console.log();
}

// Summary stats
const summary = await pool.query(`
  SELECT COUNT(*) as total,
         COUNT(DISTINCT canonical_name) as unique_companies,
         COUNT(DISTINCT enrichment_version) as batches,
         COUNT(DISTINCT country_code) as countries
  FROM verified_company_intelligence
  WHERE (country_code = 'IN')
    AND (enrichment_version LIKE 'gt6%' OR enrichment_version LIKE 'gt7%')
`);

console.log('SUMMARY (GT61–GT70 Indian Tech):');
console.log(`  Total rows: ${summary.rows[0].total}`);
console.log(`  Unique companies: ${summary.rows[0].unique_companies}`);
console.log(`  Batches: ${summary.rows[0].batches}`);
console.log(`  Countries: ${summary.rows[0].countries}`);

// List all Indian tech companies with enrichment versions
const allIndian = await pool.query(`
  SELECT canonical_name, display_name, enrichment_version, market_cap_usd, pe_ratio,
         data_quality_tier, is_public
  FROM verified_company_intelligence
  WHERE (country_code = 'IN')
    AND (enrichment_version LIKE 'gt6%' OR enrichment_version LIKE 'gt7%')
  ORDER BY enrichment_version, canonical_name
`);

console.log('\nALL INDIAN TECH COMPANIES (GT61–GT70):');
console.log('───────────────────────────────────────────────────────────────');
let currentBatch = '';
allIndian.rows.forEach(r => {
  if (r.enrichment_version !== currentBatch) {
    console.log(`\n${r.enrichment_version}:`);
    currentBatch = r.enrichment_version;
  }
  console.log(`  ✓ ${r.canonical_name.padEnd(35)} | ${r.display_name.padEnd(25)} | $${(r.market_cap_usd/1e9).toFixed(1)}B ${r.is_public ? '(PUBLIC)' : '(PRIVATE)'}`);
});

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('✅ DEDUPLICATION AUDIT COMPLETE');
console.log('═══════════════════════════════════════════════════════════════\n');

await pool.end();
