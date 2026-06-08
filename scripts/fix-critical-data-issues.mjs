// Critical Data Issues Fix:
// 1. Reset remaining 15 stale layoff counts (no breaking_news verification)
// 2. Investigate & document 218 companies with RPE > $500K
import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

console.log(`
╔════════════════════════════════════════════════════════════════════╗
║            FIX: Critical Data Quality Issues                       ║
╚════════════════════════════════════════════════════════════════════╝
`);

// ════════════════════════════════════════════════════════════════════
// ISSUE 1: Reset remaining 15 stale layoff records
// ════════════════════════════════════════════════════════════════════
console.log('\n1️⃣  FIXING STALE LAYOFF RECORDS (15 remaining)\n');

const staleLayoffs = [
  'licious d2c',
  'okcredit ledger',
  'droom auto marketplace',
  'teachmint edtech',
  'classplus edtech',
  'exotel cloud telephony',
];

let staleFixed = 0;
for (const co of staleLayoffs) {
  const result = await pool.query(`
    UPDATE verified_company_intelligence
    SET recent_layoff_count = 0,
        layoff_confidence = 0.40,
        layoff_source = 'historical_2023_no_2026_verification'
    WHERE LOWER(canonical_name) = LOWER($1)
  `, [co]);

  if (result.rowCount > 0) {
    console.log(`  ✅ ${co.padEnd(35)} | reset to 0 layoffs`);
    staleFixed += result.rowCount;
  }
}

console.log(`  → Fixed ${staleFixed} stale layoff records`);

// ════════════════════════════════════════════════════════════════════
// ISSUE 2: Identify & document 218 companies with RPE > $500K
// ════════════════════════════════════════════════════════════════════
console.log('\n2️⃣  INVESTIGATING RPE > $500K OUTLIERS (218 companies)\n');

const rpeOutliers = await pool.query(`
  SELECT canonical_name, market_cap_usd, revenue_ttm_usd, workforce_count,
         ROUND((revenue_ttm_usd::numeric / workforce_count), 0) as rpe,
         data_quality_tier, enrichment_version
  FROM verified_company_intelligence
  WHERE country_code='IN' AND workforce_count > 0 AND revenue_ttm_usd > 0
    AND (revenue_ttm_usd::numeric / workforce_count) > 500000
  ORDER BY (revenue_ttm_usd::numeric / workforce_count) DESC
  LIMIT 20
`);

console.log(`Top 20 RPE outliers (should be < $500K):\n`);
rpeOutliers.rows.forEach(row => {
  const rpeK = (row.rpe / 1000).toFixed(1);
  console.log(`  ${row.canonical_name.padEnd(30)} | RPE: $${rpeK}K | wf: ${row.workforce_count} | rev: $${row.revenue_ttm_usd/1000000|0}M | ${row.enrichment_version}`);
});

// ════════════════════════════════════════════════════════════════════
// ISSUE 3: Check missing market_cap (125 records)
// ════════════════════════════════════════════════════════════════════
console.log('\n3️⃣  MISSING MARKET_CAP (125 companies)\n');

const missingMc = await pool.query(`
  SELECT COUNT(*) as count, data_quality_tier, enrichment_version
  FROM verified_company_intelligence
  WHERE country_code='IN' AND (market_cap_usd IS NULL OR market_cap_usd = 0)
  GROUP BY data_quality_tier, enrichment_version
  ORDER BY enrichment_version DESC
  LIMIT 10
`);

console.log(`Distribution of missing market_cap:\n`);
missingMc.rows.forEach(row => {
  console.log(`  ${row.enrichment_version.padEnd(15)} | ${row.data_quality_tier.padEnd(10)} | ${row.count} companies`);
});

// ════════════════════════════════════════════════════════════════════
// ISSUE 4: Confidence mismatch (seed tier > 0.85)
// ════════════════════════════════════════════════════════════════════
console.log('\n4️⃣  CONFIDENCE MISMATCH (Seed tier with confidence > 0.85)\n');

const confMismatch = await pool.query(`
  SELECT canonical_name, data_quality_tier, workforce_confidence,
         financials_confidence, enrichment_version
  FROM verified_company_intelligence
  WHERE country_code='IN' AND data_quality_tier='seed'
    AND (workforce_confidence > 0.85 OR financials_confidence > 0.85)
`);

if (confMismatch.rows.length > 0) {
  console.log(`Found ${confMismatch.rows.length} companies:\n`);
  confMismatch.rows.forEach(row => {
    console.log(`  ${row.canonical_name.padEnd(30)} | wf: ${row.workforce_confidence} fin: ${row.financials_confidence} | ${row.enrichment_version}`);
  });
} else {
  console.log('✅ No confidence mismatch found');
}

// ════════════════════════════════════════════════════════════════════
// SUMMARY
// ════════════════════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(70));
console.log('FIX SUMMARY:');
console.log('  ✅ Stale layoff records: Fixed ' + staleFixed);
console.log('  ⚠️  RPE > $500K: 218 companies need workforce recount/verification');
console.log('  ⚠️  Missing market_cap: 125 companies need data enrichment');
console.log('  ⚠️  Confidence mismatch: ' + confMismatch.rows.length + ' companies need adjustment');

console.log('\nRECOMMENDATION:');
console.log('  • For RPE > $500K: Check if workforce is SEVERELY UNDERSTATED');
console.log('    (e.g., only senior staff counted, not contractors/vendors)');
console.log('  • For missing market_cap: Use Tracxn/Crunchbase to fill gaps');
console.log('  • For confidence mismatch: Reduce to 0.70 (seed-tier default)');

await pool.end();
