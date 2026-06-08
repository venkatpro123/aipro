// Final comprehensive Indian tech audit
import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

console.log('═══════════════════════════════════════════════════════════════');
console.log('FINAL INDIAN TECH ECOSYSTEM AUDIT (GT61-GT85 + All Sectors)');
console.log('═══════════════════════════════════════════════════════════════\n');

// Total Indian tech
const allTech = await pool.query(`
  SELECT COUNT(*) as total,
         COUNT(DISTINCT canonical_name) as unique,
         COUNT(CASE WHEN market_cap_usd >= 10000000000 THEN 1 END) as mega_cap,
         COUNT(CASE WHEN market_cap_usd >= 1000000000 AND market_cap_usd < 10000000000 THEN 1 END) as mid_cap,
         COUNT(CASE WHEN market_cap_usd < 1000000000 THEN 1 END) as small_cap,
         COUNT(CASE WHEN is_public THEN 1 END) as public_cos
  FROM verified_company_intelligence
  WHERE country_code = 'IN'
    AND (sector = 'Technology' OR sector LIKE '%Tech%' OR sector LIKE '%tech%' OR
         sector = 'Communications' OR sector = 'Financial Technology')
`);

const t = allTech.rows[0];
console.log('TOTAL INDIAN TECH ECOSYSTEM:');
console.log(`  All companies: ${t.total}`);
console.log(`  Unique: ${t.unique}`);
console.log(`  Market cap tiers:`);
console.log(`    Mega-cap (≥$10B): ${t.mega_cap}`);
console.log(`    Mid-cap ($1-10B): ${t.mid_cap}`);
console.log(`    Small-cap (<$1B): ${t.small_cap}`);
console.log(`  Public: ${t.public_cos}`);

// Deduplication check
const dups = await pool.query(`
  SELECT COUNT(*) as dup_count
  FROM (
    SELECT canonical_name
    FROM verified_company_intelligence
    WHERE country_code = 'IN'
      AND (sector = 'Technology' OR sector LIKE '%Tech%' OR sector LIKE '%tech%')
    GROUP BY canonical_name
    HAVING COUNT(*) > 1
  ) x
`);

console.log('\n✅ DEDUPLICATION STATUS:');
if (dups.rows[0].dup_count === 0) {
  console.log('  NO DUPLICATES FOUND - All Indian tech data clean!');
} else {
  console.log(`  ⚠️ ${dups.rows[0].dup_count} duplicate groups found`);
}

// By sub-sector
const subSectors = await pool.query(`
  SELECT
    CASE
      WHEN industry LIKE '%SaaS%' OR industry LIKE '%software%' THEN 'SaaS & Software'
      WHEN industry LIKE '%FinTech%' OR industry LIKE '%Payment%' THEN 'FinTech & Payments'
      WHEN industry LIKE '%Gaming%' THEN 'Gaming'
      WHEN industry LIKE '%EdTech%' THEN 'EdTech'
      WHEN industry LIKE '%HealthTech%' OR industry LIKE '%Health%' THEN 'HealthTech'
      WHEN industry LIKE '%AI%' OR industry LIKE '%ML%' THEN 'AI/ML'
      WHEN industry LIKE '%E-Commerce%' OR industry LIKE '%Marketplace%' THEN 'E-Commerce'
      WHEN industry LIKE '%IT Service%' THEN 'IT Services'
      WHEN industry LIKE '%Web3%' OR industry LIKE '%Blockchain%' THEN 'Web3/Blockchain'
      WHEN industry LIKE '%Legal%' THEN 'Legal Tech'
      ELSE 'Other'
    END as subsector,
    COUNT(*) as count
  FROM verified_company_intelligence
  WHERE country_code = 'IN'
    AND (sector = 'Technology' OR sector LIKE '%Tech%')
  GROUP BY subsector
  ORDER BY count DESC
`);

console.log('\nBY SUB-SECTOR:');
subSectors.rows.forEach(s => {
  console.log(`  ${s.subsector.padEnd(25)}: ${s.count.toString().padStart(3)} cos`);
});

// Data quality summary
const quality = await pool.query(`
  SELECT data_quality_tier, COUNT(*) as count,
         ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) as pct
  FROM verified_company_intelligence
  WHERE country_code = 'IN'
    AND (sector = 'Technology' OR sector LIKE '%Tech%')
  GROUP BY data_quality_tier
  ORDER BY count DESC
`);

console.log('\nDATA QUALITY:');
quality.rows.forEach(q => {
  console.log(`  ${q.data_quality_tier.padEnd(12)}: ${q.count.toString().padStart(3)} (${q.pct}%)`);
});

// Top 20 by market cap
const top20 = await pool.query(`
  SELECT display_name, market_cap_usd, enrichment_version
  FROM verified_company_intelligence
  WHERE country_code = 'IN'
    AND (sector = 'Technology' OR sector LIKE '%Tech%')
  ORDER BY market_cap_usd DESC NULLS LAST
  LIMIT 20
`);

console.log('\nTOP 20 INDIAN TECH COMPANIES BY MARKET CAP:');
top20.rows.forEach((co, i) => {
  const cap = co.market_cap_usd ? `$${(co.market_cap_usd/1e9).toFixed(1)}B` : 'N/A';
  console.log(`  ${(i+1).toString().padStart(2)}. ${co.display_name.padEnd(35)} ${cap.padStart(8)}`);
});

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('✅ FINAL INDIAN TECH AUDIT COMPLETE');
console.log('═══════════════════════════════════════════════════════════════\n');

await pool.end();
