// Identify gaps in Indian small tech company coverage
import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

console.log('═══════════════════════════════════════════════════════════════');
console.log('INDIAN SMALL TECH COMPANIES AUDIT (Market Cap < $5B)');
console.log('═══════════════════════════════════════════════════════════════\n');

// Get all Indian tech companies under $5B market cap
const smallTech = await pool.query(`
  SELECT canonical_name, display_name, market_cap_usd, industry, data_quality_tier,
         is_public, enrichment_version, workforce_count
  FROM verified_company_intelligence
  WHERE country_code = 'IN'
    AND (sector = 'Technology' OR sector = 'EducationTech' OR sector = 'HealthTech'
         OR sector = 'Financial Technology' OR sector = 'BioTech' OR sector = 'Government/Public')
    AND market_cap_usd < 5000000000
  ORDER BY market_cap_usd DESC NULLS LAST
`);

console.log(`CURRENT SMALL TECH COMPANIES (< $5B): ${smallTech.rows.length}\n`);

// Categorize by segment
const segments = {
  'SaaS & Productivity': [],
  'AI & Machine Learning': [],
  'Fintech & Payments': [],
  'Consumer Apps': [],
  'Gaming & Entertainment': [],
  'B2B Platforms': [],
  'EdTech': [],
  'HealthTech': [],
  'Legal Tech': [],
  'AgriTech': [],
  'Other': []
};

smallTech.rows.forEach(co => {
  const ind = co.industry.toLowerCase();
  if (ind.includes('saas') || ind.includes('productivity') || ind.includes('tools')) {
    segments['SaaS & Productivity'].push(co);
  } else if (ind.includes('ai') || ind.includes('ml') || ind.includes('machine learning') || ind.includes('deeptech')) {
    segments['AI & Machine Learning'].push(co);
  } else if (ind.includes('fintech') || ind.includes('payment') || ind.includes('crypto') || ind.includes('blockchain')) {
    segments['Fintech & Payments'].push(co);
  } else if (ind.includes('app') || ind.includes('social') || ind.includes('marketplace') || ind.includes('commerce')) {
    segments['Consumer Apps'].push(co);
  } else if (ind.includes('game') || ind.includes('entertainment')) {
    segments['Gaming & Entertainment'].push(co);
  } else if (ind.includes('b2b') || ind.includes('enterprise') || ind.includes('platform')) {
    segments['B2B Platforms'].push(co);
  } else if (ind.includes('edtech') || ind.includes('education') || ind.includes('learning')) {
    segments['EdTech'].push(co);
  } else if (ind.includes('health') || ind.includes('medical')) {
    segments['HealthTech'].push(co);
  } else if (ind.includes('legal')) {
    segments['Legal Tech'].push(co);
  } else if (ind.includes('agri')) {
    segments['AgriTech'].push(co);
  } else {
    segments['Other'].push(co);
  }
});

// Display by segment
Object.entries(segments).forEach(([seg, cos]) => {
  if (cos.length > 0) {
    console.log(`${seg} (${cos.length} cos):`);
    cos.slice(0, 8).forEach(c => {
      const cap = c.market_cap_usd ? `$${(c.market_cap_usd/1e9).toFixed(2)}B` : 'N/A';
      console.log(`  • ${c.display_name.padEnd(35)} ${cap.padStart(8)} (${c.data_quality_tier})`);
    });
    if (cos.length > 8) console.log(`  ... and ${cos.length - 8} more`);
    console.log();
  }
});

// Identify duplicates in small tech
const dups = await pool.query(`
  SELECT canonical_name, COUNT(*) as count, STRING_AGG(DISTINCT enrichment_version, ', ') as versions
  FROM verified_company_intelligence
  WHERE country_code = 'IN'
    AND (sector = 'Technology' OR sector = 'EducationTech' OR sector = 'HealthTech'
         OR sector = 'Financial Technology' OR sector = 'BioTech')
    AND market_cap_usd < 5000000000
  GROUP BY canonical_name
  HAVING COUNT(*) > 1
  ORDER BY count DESC
`);

console.log('DUPLICATES IN SMALL TECH:');
if (dups.rows.length === 0) {
  console.log('  ✅ NO DUPLICATES FOUND\n');
} else {
  console.log(`  ⚠️ FOUND ${dups.rows.length}:\n`);
  dups.rows.forEach(d => {
    console.log(`    ${d.canonical_name} (${d.count}x) — ${d.versions}`);
  });
  console.log();
}

// Missing small tech segments
const missingSegments = [
  'Indian startup unicorns not yet covered',
  'B2B SaaS (logistics, supply chain, HR)',
  'Gaming startups',
  'Developer tools & APIs',
  'IoT & hardware startups',
  'Climate tech',
  'Mobility startups',
  'D2C brands with tech',
  'Foodtech beyond delivery',
  'Crypto & Web3 beyond major players'
];

console.log('KEY GAPS TO FILL (GT81-GT85):');
missingSegments.forEach(seg => console.log(`  • ${seg}`));

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('✅ GAP ANALYSIS COMPLETE');
console.log('═══════════════════════════════════════════════════════════════\n');

await pool.end();
