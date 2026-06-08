// Audit ALL Indian companies in database (tech + non-tech)
import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

console.log('═══════════════════════════════════════════════════════════════');
console.log('ALL INDIAN COMPANIES AUDIT (Tech + Non-Tech)');
console.log('═══════════════════════════════════════════════════════════════\n');

// Get all Indian companies
const allIndian = await pool.query(`
  SELECT canonical_name, display_name, industry, sector, market_cap_usd, is_public,
         enrichment_version, data_quality_tier
  FROM verified_company_intelligence
  WHERE country_code = 'IN'
  ORDER BY market_cap_usd DESC NULLS LAST, canonical_name
`);

console.log(`TOTAL INDIAN COMPANIES: ${allIndian.rows.length}\n`);

// Group by sector
const bySector = {};
allIndian.rows.forEach(co => {
  const sector = co.sector || 'Unknown';
  if (!bySector[sector]) bySector[sector] = [];
  bySector[sector].push(co);
});

// Sort sectors by count
const sortedSectors = Object.entries(bySector)
  .sort((a, b) => b[1].length - a[1].length);

console.log('BY SECTOR:');
sortedSectors.forEach(([sector, companies]) => {
  const public_count = companies.filter(c => c.is_public).length;
  console.log(`\n  ${sector} (${companies.length} cos, ${public_count} public):`);
  companies.slice(0, 5).forEach(c => {
    const cap = c.market_cap_usd ? `$${(c.market_cap_usd/1e9).toFixed(1)}B` : 'N/A';
    console.log(`    • ${c.display_name.padEnd(40)} ${cap.padStart(8)} (${c.data_quality_tier})`);
  });
  if (companies.length > 5) console.log(`    ... and ${companies.length - 5} more`);
});

// Check for duplicates (same canonical_name)
const duplicates = await pool.query(`
  SELECT canonical_name, COUNT(*) as count,
         STRING_AGG(DISTINCT enrichment_version, ', ') as versions,
         STRING_AGG(DISTINCT sector, ', ') as sectors
  FROM verified_company_intelligence
  WHERE country_code = 'IN'
  GROUP BY canonical_name
  HAVING COUNT(*) > 1
  ORDER BY count DESC
`);

console.log('\n\nDUPLICATES CHECK:');
if (duplicates.rows.length === 0) {
  console.log('  ✅ NO DUPLICATES FOUND');
} else {
  console.log(`  ⚠️ FOUND ${duplicates.rows.length} DUPLICATES:`);
  duplicates.rows.forEach(d => {
    console.log(`    ${d.canonical_name} (${d.count}x)`);
    console.log(`      Versions: ${d.versions}`);
    console.log(`      Sectors: ${d.sectors}`);
  });
}

// Top 20 Indian companies by market cap
console.log('\n\nTOP 20 INDIAN COMPANIES BY MARKET CAP:');
const top20 = allIndian.rows.slice(0, 20);
top20.forEach((co, i) => {
  const cap = co.market_cap_usd ? `$${(co.market_cap_usd/1e9).toFixed(1)}B` : 'N/A';
  const type = co.is_public ? 'PUBLIC' : 'PRIVATE';
  console.log(`  ${(i+1).toString().padStart(2)}. ${co.display_name.padEnd(35)} ${cap.padStart(10)} ${type.padStart(8)} (${co.sector})`);
});

// Identify missing big sectors
console.log('\n\nMISSING/UNDERREPRESENTED SECTORS:');
const expectedSectors = [
  'Banking & Financial Services',
  'Insurance',
  'Manufacturing',
  'Automotive',
  'Pharmaceutical',
  'Energy & Utilities',
  'Telecommunications',
  'Retail & Consumer',
  'Real Estate',
  'Transportation & Logistics',
  'Metals & Mining',
  'FMCG',
  'Chemicals',
  'Cement',
  'Steel'
];

const existingSectors = Object.keys(bySector);
expectedSectors.forEach(sector => {
  if (!existingSectors.some(s => s && s.toLowerCase().includes(sector.toLowerCase()))) {
    console.log(`  ❌ ${sector}`);
  }
});

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('✅ AUDIT COMPLETE');
console.log('═══════════════════════════════════════════════════════════════\n');

await pool.end();
