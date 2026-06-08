import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const companiesWithLayoffs = [
  { name: 'good glamm group', db_count: 1500 },
  { name: 'dunzo hyperlocal', db_count: 800 },
  { name: 'vedantu learning', db_count: 500 },
  { name: 'upgrad online', db_count: 350 },
  { name: 'spinny preowned', db_count: 200 },
  { name: 'khatabook sme', db_count: 200 },
  { name: 'livspace interiors', db_count: 180 },
  { name: 'leverage edu', db_count: 150 },
  { name: 'mylab discovery diagnostics', db_count: 150 },
  { name: 'rupeek gold loans', db_count: 150 },
];

console.log(`
╔════════════════════════════════════════════════════════════════════╗
║     LAYOFF COUNT VERIFICATION — Cross-check with breaking_news    ║
╚════════════════════════════════════════════════════════════════════╝
`);

for (const co of companiesWithLayoffs) {
  const newsResult = await pool.query(`
    SELECT COUNT(*) as recent_events,
           MAX(event_date) as latest_event,
           SUM(affected_count) as total_affected,
           MIN(detected_at) as first_detected,
           MAX(detected_at) as last_detected
    FROM breaking_news_events
    WHERE LOWER(company_name) LIKE LOWER($1)
      AND detected_at > NOW() - INTERVAL '180 days'
  `, [`%${co.name}%`]);

  const newsRow = newsResult.rows[0];
  const status = newsRow.recent_events > 0 
    ? '✅ CONFIRMED (live news)' 
    : '⚠️ STALE — no recent breaking_news in 180 days';
  
  console.log(`\n${co.name}`);
  console.log(`  DB recorded: ${co.db_count} layoffs`);
  console.log(`  Breaking news: ${newsRow.recent_events} events | ${status}`);
  if (newsRow.recent_events > 0) {
    console.log(`  Latest event: ${newsRow.latest_event} (${newsRow.last_detected?.toISOString().split('T')[0]})`);
    console.log(`  Total affected from news: ${newsRow.total_affected}`);
  }
}

console.log('\n\nDATA QUALITY ASSESSMENT:');
console.log('────────────────────────────────────────────────────');
console.log('ISSUE: Layoff counts were inserted from 2022–2023 news sources.');
console.log('They are NOT verified against May 2026 breaking_news_events table.');
console.log('Confidence scores (0.76–0.86) are too high for stale data.');
console.log('\nFIX NEEDED:');
console.log('  • Companies with NO recent breaking_news: set recent_layoff_count = 0');
console.log('  • Reduce layoff_confidence to 0.40 (historical, not current)');
console.log('  • Update source to: "historical_2023_no_2026_verification"');

await pool.end();
