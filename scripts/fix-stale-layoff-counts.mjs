// Fix: Reset stale layoff counts (2022-2023 data) with no May 2026 verification
// Rule: If NO breaking_news_events in 180 days → set recent_layoff_count=0, confidence=0.40
import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const staleLayoffCompanies = [
  'good glamm group',
  'dunzo hyperlocal',
  'vedantu learning',
  'upgrad online',
  'spinny preowned',
  'khatabook sme',
  'livspace interiors',
  'leverage edu',
  'mylab discovery diagnostics',
  'rupeek gold loans',
];

console.log(`
╔════════════════════════════════════════════════════════════════════╗
║    FIX: Reset Stale Layoff Counts (2022–2023 data, no 2026 verify)║
╚════════════════════════════════════════════════════════════════════╝

Updating ${staleLayoffCompanies.length} companies with stale layoff data:
  • Set recent_layoff_count = 0 (no breaking_news in last 180 days)
  • Set layoff_confidence = 0.40 (historical, not verified)
  • Update layoff_source = "historical_2023_no_2026_verification"
`);

let updated = 0;
for (const company of staleLayoffCompanies) {
  const result = await pool.query(`
    UPDATE verified_company_intelligence
    SET recent_layoff_count = 0,
        layoff_confidence = 0.40,
        layoff_source = 'historical_2023_no_2026_verification'
    WHERE LOWER(canonical_name) = LOWER($1)
  `, [company]);

  if (result.rowCount > 0) {
    console.log(`  ✅ ${company.padEnd(35)} | reset to 0 layoffs, confidence 0.40`);
    updated += result.rowCount;
  } else {
    console.log(`  ⚠️ ${company.padEnd(35)} | NOT FOUND in DB`);
  }
}

console.log(`\n─────────────────────────────────────────────────`);
console.log(`Total rows updated: ${updated}`);

// Verify the fix
const verifyResult = await pool.query(`
  SELECT COUNT(*) as total_with_layoffs
  FROM verified_company_intelligence
  WHERE country_code='IN' AND recent_layoff_count > 0
`);

console.log(`\nVerification: Companies with layoff_count > 0 now: ${verifyResult.rows[0].total_with_layoffs}`);

await pool.end();
