// Comprehensive Data Quality Audit — All India Companies (GT100–GT131)
// Checks: market cap sanity, P/S ratio outliers, revenue consistency,
// workforce RPE bounds, confidence alignment, stale data, duplicates
import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

console.log(`
╔════════════════════════════════════════════════════════════════════╗
║       COMPREHENSIVE DATA QUALITY AUDIT — India Companies           ║
║              (Checking 1,030 companies for data errors)            ║
╚════════════════════════════════════════════════════════════════════╝
`);

// ════════════════════════════════════════════════════════════════════
// 1. MARKET CAP OUTLIERS (should be $50M–$900M for non-unicorns)
// ════════════════════════════════════════════════════════════════════
console.log('\n1️⃣  MARKET CAP OUTLIERS');
console.log('─────────────────────────────────────────────────');

const mcOutliers = await pool.query(`
  SELECT COUNT(*) as count, 'below_50m' as category
  FROM verified_company_intelligence
  WHERE country_code='IN' AND market_cap_usd > 0 AND market_cap_usd < 50000000
  UNION ALL
  SELECT COUNT(*), 'above_900m'
  FROM verified_company_intelligence
  WHERE country_code='IN' AND market_cap_usd > 900000000
  UNION ALL
  SELECT COUNT(*), 'null_or_zero'
  FROM verified_company_intelligence
  WHERE country_code='IN' AND (market_cap_usd IS NULL OR market_cap_usd = 0)
`);

mcOutliers.rows.forEach(row => {
  console.log(`  ${row.category.padEnd(20)} | ${row.count} companies`);
});

// ════════════════════════════════════════════════════════════════════
// 2. P/S RATIO SANITY (should be 0.3x–30x per validation rules)
// ════════════════════════════════════════════════════════════════════
console.log('\n2️⃣  P/S RATIO VIOLATIONS (Valid: 0.3x–30x)');
console.log('─────────────────────────────────────────────────');

const psViolations = await pool.query(`
  SELECT COUNT(*) as count, 'below_0.3x' as issue
  FROM verified_company_intelligence
  WHERE country_code='IN' AND revenue_ttm_usd > 0 AND market_cap_usd > 0
    AND (market_cap_usd::numeric / revenue_ttm_usd) < 0.3
  UNION ALL
  SELECT COUNT(*), 'above_30x'
  FROM verified_company_intelligence
  WHERE country_code='IN' AND revenue_ttm_usd > 0 AND market_cap_usd > 0
    AND (market_cap_usd::numeric / revenue_ttm_usd) > 30
  UNION ALL
  SELECT COUNT(*), 'missing_revenue'
  FROM verified_company_intelligence
  WHERE country_code='IN' AND (revenue_ttm_usd IS NULL OR revenue_ttm_usd = 0)
`);

psViolations.rows.forEach(row => {
  console.log(`  ${row.issue.padEnd(20)} | ${row.count} companies`);
});

// Show worst P/S outliers
const psExtreme = await pool.query(`
  SELECT canonical_name, market_cap_usd, revenue_ttm_usd,
         ROUND((market_cap_usd::numeric / revenue_ttm_usd), 2) as ps_ratio
  FROM verified_company_intelligence
  WHERE country_code='IN' AND revenue_ttm_usd > 0 AND market_cap_usd > 0
  ORDER BY (market_cap_usd::numeric / revenue_ttm_usd) DESC
  LIMIT 5
`);

console.log('  Worst extreme P/S ratios:');
psExtreme.rows.forEach(row => {
  console.log(`    ${row.canonical_name.padEnd(30)} | P/S=${row.ps_ratio}x | $${row.market_cap_usd/1000000|0}M / $${row.revenue_ttm_usd/1000000|0}M`);
});

// ════════════════════════════════════════════════════════════════════
// 3. WORKFORCE RPE BOUNDS (should be $5K–$500K per validation rules)
// ════════════════════════════════════════════════════════════════════
console.log('\n3️⃣  WORKFORCE RPE VIOLATIONS (Valid: $5K–$500K)');
console.log('─────────────────────────────────────────────────');

const rpeViolations = await pool.query(`
  SELECT COUNT(*) as count, 'below_5k' as issue
  FROM verified_company_intelligence
  WHERE country_code='IN' AND workforce_count > 0 AND revenue_ttm_usd > 0
    AND (revenue_ttm_usd::numeric / workforce_count) < 5000
  UNION ALL
  SELECT COUNT(*), 'above_500k'
  FROM verified_company_intelligence
  WHERE country_code='IN' AND workforce_count > 0 AND revenue_ttm_usd > 0
    AND (revenue_ttm_usd::numeric / workforce_count) > 500000
  UNION ALL
  SELECT COUNT(*), 'missing_workforce'
  FROM verified_company_intelligence
  WHERE country_code='IN' AND (workforce_count IS NULL OR workforce_count = 0)
`);

rpeViolations.rows.forEach(row => {
  console.log(`  ${row.issue.padEnd(20)} | ${row.count} companies`);
});

// ════════════════════════════════════════════════════════════════════
// 4. STALE LAYOFF DATA (no breaking_news_events in last 180 days)
// ════════════════════════════════════════════════════════════════════
console.log('\n4️⃣  STALE LAYOFF DATA (recent_layoff_count but no breaking_news)');
console.log('─────────────────────────────────────────────────');

const staleLayoffs = await pool.query(`
  SELECT vci.canonical_name, vci.recent_layoff_count,
         vci.layoff_confidence, vci.layoff_source,
         COUNT(bne.id) as breaking_news_events
  FROM verified_company_intelligence vci
  LEFT JOIN breaking_news_events bne
    ON LOWER(vci.canonical_name) LIKE LOWER('%' || bne.company_name || '%')
    AND bne.detected_at > NOW() - INTERVAL '180 days'
  WHERE vci.country_code='IN' AND vci.recent_layoff_count > 0
  GROUP BY vci.canonical_name, vci.recent_layoff_count,
           vci.layoff_confidence, vci.layoff_source
  HAVING COUNT(bne.id) = 0
  ORDER BY vci.recent_layoff_count DESC
  LIMIT 15
`);

if (staleLayoffs.rows.length > 0) {
  console.log(`  Found ${staleLayoffs.rows.length} companies with stale layoff data:\n`);
  staleLayoffs.rows.forEach(row => {
    console.log(`    ${row.canonical_name.padEnd(35)} | ${String(row.recent_layoff_count).padStart(4)} layoffs | conf ${row.layoff_confidence}`);
  });
} else {
  console.log(`  ✅ No stale layoff data found`);
}

// ════════════════════════════════════════════════════════════════════
// 5. CONFIDENCE MISMATCH (high confidence but unverified source)
// ════════════════════════════════════════════════════════════════════
console.log('\n5️⃣  CONFIDENCE MISMATCH (high confidence, unverified source)');
console.log('─────────────────────────────────────────────────');

const confidenceMismatch = await pool.query(`
  SELECT COUNT(*) as count
  FROM verified_company_intelligence
  WHERE country_code='IN'
    AND data_quality_tier='seed'
    AND (workforce_confidence > 0.85 OR financials_confidence > 0.85)
`);

console.log(`  Seed-tier companies with confidence > 0.85: ${confidenceMismatch.rows[0].count}`);

// ════════════════════════════════════════════════════════════════════
// 6. MISSING CRITICAL FIELDS
// ════════════════════════════════════════════════════════════════════
console.log('\n6️⃣  MISSING CRITICAL FIELDS');
console.log('─────────────────────────────────────────────────');

const missingFields = await pool.query(`
  SELECT COUNT(*) as missing_market_cap
  FROM verified_company_intelligence
  WHERE country_code='IN' AND (market_cap_usd IS NULL OR market_cap_usd = 0)
  UNION ALL
  SELECT COUNT(*)
  FROM verified_company_intelligence
  WHERE country_code='IN' AND (industry IS NULL OR industry = '')
  UNION ALL
  SELECT COUNT(*)
  FROM verified_company_intelligence
  WHERE country_code='IN' AND (sector IS NULL OR sector = '')
  UNION ALL
  SELECT COUNT(*)
  FROM verified_company_intelligence
  WHERE country_code='IN' AND (workforce_count IS NULL OR workforce_count = 0)
`);

const fieldNames = ['market_cap_usd', 'industry', 'sector', 'workforce_count'];
missingFields.rows.forEach((row, i) => {
  console.log(`  ${fieldNames[i].padEnd(20)} | ${row.missing_market_cap} missing`);
});

// ════════════════════════════════════════════════════════════════════
// 7. DATA QUALITY TIER AUDIT
// ════════════════════════════════════════════════════════════════════
console.log('\n7️⃣  DATA QUALITY TIER DISTRIBUTION');
console.log('─────────────────────────────────────────────────');

const tierDist = await pool.query(`
  SELECT data_quality_tier, COUNT(*) as count,
         ROUND(AVG(workforce_confidence), 2) as avg_workforce_conf,
         ROUND(AVG(financials_confidence), 2) as avg_fin_conf
  FROM verified_company_intelligence
  WHERE country_code='IN'
  GROUP BY data_quality_tier
  ORDER BY count DESC
`);

tierDist.rows.forEach(row => {
  console.log(`  ${row.data_quality_tier.padEnd(15)} | ${String(row.count).padStart(4)} cos | wf_conf: ${row.avg_workforce_conf} | fin_conf: ${row.avg_fin_conf}`);
});

// ════════════════════════════════════════════════════════════════════
// 8. DUPLICATE OR NEAR-DUPLICATE NAMES
// ════════════════════════════════════════════════════════════════════
console.log('\n8️⃣  POTENTIAL DUPLICATES (same display_name, different canonical)');
console.log('─────────────────────────────────────────────────');

const duplicates = await pool.query(`
  SELECT display_name, COUNT(*) as count, STRING_AGG(canonical_name, ' | ') as names
  FROM verified_company_intelligence
  WHERE country_code='IN'
  GROUP BY display_name
  HAVING COUNT(*) > 1
  LIMIT 10
`);

if (duplicates.rows.length > 0) {
  console.log(`  Found ${duplicates.rows.length} potential duplicates:\n`);
  duplicates.rows.forEach(row => {
    console.log(`    ${row.display_name.padEnd(40)} (${row.count} entries)`);
    console.log(`      → ${row.names}`);
  });
} else {
  console.log(`  ✅ No duplicates detected`);
}

// ════════════════════════════════════════════════════════════════════
// 9. ZERO/NULL CONFIDENCE SCORES
// ════════════════════════════════════════════════════════════════════
console.log('\n9️⃣  ZERO/NULL CONFIDENCE SCORES');
console.log('─────────────────────────────────────────────────');

const zeroConf = await pool.query(`
  SELECT COUNT(*) as zero_or_null
  FROM verified_company_intelligence
  WHERE country_code='IN'
    AND (workforce_confidence IS NULL OR workforce_confidence = 0
      OR financials_confidence IS NULL OR financials_confidence = 0
      OR layoff_confidence IS NULL OR layoff_confidence = 0)
`);

console.log(`  Companies with zero/null confidence: ${zeroConf.rows[0].zero_or_null}`);

// ════════════════════════════════════════════════════════════════════
// 10. BATCH ENRICHMENT COVERAGE
// ════════════════════════════════════════════════════════════════════
console.log('\n🔟  BATCH ENRICHMENT COMPLETENESS');
console.log('─────────────────────────────────────────────────');

const batchQuality = await pool.query(`
  SELECT enrichment_version,
         COUNT(*) as total,
         COUNT(CASE WHEN market_cap_usd > 0 THEN 1 END) as with_mc,
         COUNT(CASE WHEN revenue_ttm_usd > 0 THEN 1 END) as with_rev,
         COUNT(CASE WHEN workforce_count > 0 THEN 1 END) as with_wf,
         COUNT(CASE WHEN data_quality_tier='verified' THEN 1 END) as verified
  FROM verified_company_intelligence
  WHERE country_code='IN' AND enrichment_version LIKE 'gt1%'
  GROUP BY enrichment_version
  ORDER BY enrichment_version DESC
  LIMIT 10
`);

batchQuality.rows.forEach(row => {
  const mcPct = ((row.with_mc / row.total) * 100).toFixed(0);
  const revPct = ((row.with_rev / row.total) * 100).toFixed(0);
  const wfPct = ((row.with_wf / row.total) * 100).toFixed(0);
  console.log(`  ${row.enrichment_version} | ${String(row.total).padStart(2)} cos | MC:${mcPct}% Rev:${revPct}% WF:${wfPct}% | verified:${row.verified}`);
});

console.log('\n' + '═'.repeat(70));
console.log('AUDIT COMPLETE');
await pool.end();
