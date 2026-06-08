// Fix: Validate layoff counts against live breaking_news_events for May 2026
// Rule: If breaking_news_events has no recent entries (last 180 days), set recent_layoff_count=0 with lower confidence
import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const toValidate = [
  'good glamm group',       // 1500 — likely stale
  'dunzo hyperlocal',       // 800 — verify
  'vedantu learning',       // 500 — verify if still active May 2026
  'upgrad online',          // 350 — verify if still active May 2026
  'spinny preowned',        // 200 — verify
  'livspace interiors',     // 180 — verify
  'leverage edu',           // 150 — verify
  'mylab discovery diagnostics', // 150 — verify
  'khatabook sme',          // 200 — verify
  'rupeek gold loans',      // 150 — verify
];

console.log(`
╔════════════════════════════════════════════════════════════════════╗
║        LAYOFF COUNT VALIDATION — Cross-check with breaking_news   ║
╚════════════════════════════════════════════════════════════════════╝
`);

for (const company of toValidate) {
  // Check breaking_news_events for this company in last 180 days
  const newsResult = await pool.query(`
    SELECT COUNT(*) as recent_events,
           MAX(event_date) as latest_event,
           STRING_AGG(DISTINCT event_type, ', ') as event_types
    FROM breaking_news_events
    WHERE LOWER(company_name) LIKE LOWER($1)
      AND event_date > NOW() - INTERVAL '180 days'
  `, [`%${company}%`]);

  const newsRow = newsResult.rows[0];
  const companyRow = await pool.query(
    `SELECT recent_layoff_count, layoff_confidence, market_cap_usd
     FROM verified_company_intelligence
     WHERE LOWER(canonical_name) = LOWER($1)`,
    [company]
  );

  if (companyRow.rows.length > 0) {
    const co = companyRow.rows[0];
    const status = newsRow.recent_events > 0 ? '✅ CONFIRMED (live news)' : '⚠️ STALE (no recent breaking_news)';
    console.log(`\n${company}`);
    console.log(`  DB layoffs: ${co.recent_layoff_count} | confidence: ${co.layoff_confidence}`);
    console.log(`  Breaking news: ${newsRow.recent_events} recent events | ${status}`);
    if (newsRow.latest_event) console.log(`  Latest event: ${newsRow.latest_event.toISOString().split('T')[0]}`);
    if (newsRow.event_types) console.log(`  Types: ${newsRow.event_types}`);
  }
}

console.log('\n\nRECOMMENDATION:');
console.log('─────────────────────────────────────────────────');
console.log('For companies with NO recent breaking_news_events in last 180 days:');
console.log('  1. Set recent_layoff_count=0 (no evidence of ongoing layoffs in May 2026)');
console.log('  2. Set layoff_confidence=0.40 (stale historical data, not current)');
console.log('  3. Add note to layoff_source: "historical_2023_no_recent_signals"');
console.log('\nFor companies WITH recent breaking_news_events:');
console.log('  1. Keep recent_layoff_count (verified by live news)');
console.log('  2. Increase layoff_confidence to 0.85+ (current, evidence-based)');
console.log('  3. Update layoff_source to include breaking_news_events reference');

await pool.end();
