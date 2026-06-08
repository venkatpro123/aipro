// Fix Unacademy duplicate: delete the malformed GT65 entry "kkr backed company"
import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

console.log('Fixing Unacademy duplicate...\n');

// Check before deletion
const before = await pool.query(`
  SELECT canonical_name, display_name, enrichment_version, market_cap_usd
  FROM verified_company_intelligence
  WHERE display_name LIKE '%Unacademy%' OR canonical_name LIKE '%unacademy%'
  ORDER BY enrichment_version
`);

console.log('BEFORE FIX:');
before.rows.forEach(r => console.log(`  ${r.enrichment_version}: ${r.canonical_name} → ${r.display_name} ($${(r.market_cap_usd/1e9).toFixed(1)}B)`));

// Delete the malformed "kkr backed company" entry from GT65
const deleted = await pool.query(`
  DELETE FROM verified_company_intelligence
  WHERE canonical_name = 'kkr backed company'
    AND display_name = 'Unacademy'
    AND enrichment_version = 'gt65-v2026.1'
  RETURNING canonical_name, display_name, enrichment_version
`);

console.log(`\nDELETED: ${deleted.rows.length} malformed entry`);
deleted.rows.forEach(r => console.log(`  ✓ ${r.canonical_name} from ${r.enrichment_version}`));

// Verify fix
const after = await pool.query(`
  SELECT canonical_name, display_name, enrichment_version, market_cap_usd
  FROM verified_company_intelligence
  WHERE display_name LIKE '%Unacademy%' OR canonical_name LIKE '%unacademy%'
  ORDER BY enrichment_version
`);

console.log('\nAFTER FIX:');
after.rows.forEach(r => console.log(`  ${r.enrichment_version}: ${r.canonical_name} → ${r.display_name} ($${(r.market_cap_usd/1e9).toFixed(1)}B)`));

console.log('\n✅ UNACADEMY DUPLICATE FIXED\n');
await pool.end();
