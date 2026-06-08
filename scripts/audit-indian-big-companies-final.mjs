// Final audit: Indian big companies after deduplication + GT76-GT80
import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

console.log('═══════════════════════════════════════════════════════════════');
console.log('FINAL INDIAN BIG COMPANIES AUDIT (After Deduplication + GT76-GT80)');
console.log('═══════════════════════════════════════════════════════════════\n');

// Total count
const total = await pool.query(`
  SELECT COUNT(*) as total,
         COUNT(DISTINCT canonical_name) as unique,
         COUNT(CASE WHEN is_public THEN 1 END) as public_count,
         COUNT(CASE WHEN market_cap_usd >= 10000000000 THEN 1 END) as above_10b
  FROM verified_company_intelligence
  WHERE country_code = 'IN'
`);

const t = total.rows[0];
console.log('TOTAL INDIAN COMPANIES:');
console.log(`  All: ${t.total} | Unique: ${t.unique}`);
console.log(`  Public: ${t.public_count} | Private: ${t.total - t.public_count}`);
console.log(`  Above $10B market cap: ${t.above_10b}`);

// Top 30 by market cap
const top30 = await pool.query(`
  SELECT display_name, market_cap_usd, is_public, data_quality_tier, sector
  FROM verified_company_intelligence
  WHERE country_code = 'IN'
  ORDER BY market_cap_usd DESC NULLS LAST
  LIMIT 30
`);

console.log('\n\nTOP 30 INDIAN BIG COMPANIES BY MARKET CAP:');
console.log('───────────────────────────────────────────────────────────────');
top30.rows.forEach((co, i) => {
  const cap = co.market_cap_usd ? `$${(co.market_cap_usd/1e9).toFixed(0)}B`.padStart(8) : 'N/A';
  const type = co.is_public ? 'PUB' : 'PVT';
  console.log(`${(i+1).toString().padStart(2)}. ${co.display_name.padEnd(38)} ${cap} ${type} (${co.data_quality_tier})`);
});

// Duplication check
const dups = await pool.query(`
  SELECT canonical_name, COUNT(*) as count
  FROM verified_company_intelligence
  WHERE country_code = 'IN'
  GROUP BY canonical_name
  HAVING COUNT(*) > 1
  ORDER BY count DESC
`);

console.log('\n\nDUPLICATION CHECK (GT76-GT80):');
if (dups.rows.length === 0) {
  console.log('  ✅ NO DUPLICATES FOUND');
} else {
  console.log(`  ⚠️ FOUND ${dups.rows.length} DUPLICATE ENTRIES:`);
  dups.rows.forEach(d => console.log(`    ${d.canonical_name} (${d.count}x)`));
}

// By sector
const bySector = await pool.query(`
  SELECT sector, COUNT(*) as count,
         COUNT(CASE WHEN market_cap_usd >= 10000000000 THEN 1 END) as big_cos
  FROM verified_company_intelligence
  WHERE country_code = 'IN'
  GROUP BY sector
  ORDER BY count DESC
`);

console.log('\n\nBY SECTOR:');
bySector.rows.forEach(s => {
  const sectorName = (s.sector || 'Unknown').padEnd(30);
  console.log(`  ${sectorName} ${s.count.toString().padStart(3)} cos (${s.big_cos} above $10B)`);
});

// Data quality
const quality = await pool.query(`
  SELECT data_quality_tier, COUNT(*) as count,
         ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) as pct
  FROM verified_company_intelligence
  WHERE country_code = 'IN'
  GROUP BY data_quality_tier
  ORDER BY count DESC
`);

console.log('\n\nDATA QUALITY:');
quality.rows.forEach(q => {
  console.log(`  ${q.data_quality_tier.padEnd(12)}: ${q.count.toString().padStart(3)} (${q.pct}%)`);
});

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('✅ FINAL AUDIT COMPLETE');
console.log('═══════════════════════════════════════════════════════════════\n');

await pool.end();
