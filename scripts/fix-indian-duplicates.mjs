// Fix TCS, Infosys, HDFC Bank, ICICI Bank variants - keep highest market cap, delete others
import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

console.log('═══════════════════════════════════════════════════════════════');
console.log('CONSOLIDATING INDIAN COMPANY VARIANTS (TCS, Infosys, HDFC, ICICI)');
console.log('═══════════════════════════════════════════════════════════════\n');

// TCS consolidation: keep highest market cap ($170B), delete $165B and $98.8B variants
console.log('CONSOLIDATING TCS (Tata Consultancy Services)...');
let deleted = await pool.query(`
  DELETE FROM verified_company_intelligence
  WHERE canonical_name IN ('tata consultancy services limited', 'tata consultancy services ltd.')
  RETURNING canonical_name, market_cap_usd
`);
console.log(`  Deleted: ${deleted.rows.length} variants`);

// Infosys consolidation: keep $78B, delete $51.3B variant
console.log('\nCONSOLIDATING INFOSYS...');
deleted = await pool.query(`
  DELETE FROM verified_company_intelligence
  WHERE display_name LIKE 'Infosys%' AND market_cap_usd < 60000000000
  RETURNING canonical_name, market_cap_usd
`);
console.log(`  Deleted: ${deleted.rows.length} variants (keeping $78B)`);

// Consolidate HDFC Bank: "HDFC Bank Limited" is the canonical public company, delete "HDFC Bank Digital"
console.log('\nCONSOLIDATING HDFC BANK...');
deleted = await pool.query(`
  DELETE FROM verified_company_intelligence
  WHERE canonical_name = 'hdfc bank digital'
  RETURNING canonical_name, market_cap_usd
`);
console.log(`  Deleted: ${deleted.rows.length} variant (HDFC Bank Digital)`);

// Consolidate ICICI Bank: "ICICI Bank Limited" is the canonical public company, delete "ICICI Bank Digital"
console.log('\nCONSOLIDATING ICICI BANK...');
deleted = await pool.query(`
  DELETE FROM verified_company_intelligence
  WHERE canonical_name = 'icici bank digital'
  RETURNING canonical_name, market_cap_usd
`);
console.log(`  Deleted: ${deleted.rows.length} variant (ICICI Bank Digital)`);

// Consolidate Axis Bank: delete "Axis Bank Digital" variant
console.log('\nCONSOLIDATING AXIS BANK...');
deleted = await pool.query(`
  DELETE FROM verified_company_intelligence
  WHERE canonical_name = 'axis bank digital'
  RETURNING canonical_name, market_cap_usd
`);
console.log(`  Deleted: ${deleted.rows.length} variant (Axis Bank Digital)`);

// Consolidate Varun Beverages: keep $21B, delete $15B variant
console.log('\nCONSOLIDATING VARUN BEVERAGES...');
deleted = await pool.query(`
  DELETE FROM verified_company_intelligence
  WHERE canonical_name = 'varun beverages limited' AND market_cap_usd < 20000000000
  RETURNING canonical_name, market_cap_usd
`);
console.log(`  Deleted: ${deleted.rows.length} variant (keeping $21B)`);

// Verify consolidation
console.log('\n\nVERIFYING CONSOLIDATION...');
const tcs = await pool.query(`SELECT canonical_name, market_cap_usd FROM verified_company_intelligence WHERE canonical_name LIKE '%tata consultancy%' ORDER BY market_cap_usd DESC`);
const infosys = await pool.query(`SELECT canonical_name, market_cap_usd FROM verified_company_intelligence WHERE canonical_name LIKE '%infosys%' ORDER BY market_cap_usd DESC`);
const hdfc = await pool.query(`SELECT canonical_name, market_cap_usd FROM verified_company_intelligence WHERE canonical_name LIKE '%hdfc%bank%' ORDER BY market_cap_usd DESC`);
const icici = await pool.query(`SELECT canonical_name, market_cap_usd FROM verified_company_intelligence WHERE canonical_name LIKE '%icici%bank%' ORDER BY market_cap_usd DESC`);
const varun = await pool.query(`SELECT canonical_name, market_cap_usd FROM verified_company_intelligence WHERE canonical_name LIKE '%varun%' ORDER BY market_cap_usd DESC`);

console.log(`  TCS entries remaining: ${tcs.rows.length}`);
console.log(`  Infosys entries remaining: ${infosys.rows.length}`);
console.log(`  HDFC Bank entries remaining: ${hdfc.rows.length}`);
console.log(`  ICICI Bank entries remaining: ${icici.rows.length}`);
console.log(`  Varun Beverages entries remaining: ${varun.rows.length}`);

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('✅ CONSOLIDATION COMPLETE');
console.log('═══════════════════════════════════════════════════════════════\n');

await pool.end();
