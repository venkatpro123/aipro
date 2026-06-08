import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const result = await pool.query(`
  SELECT canonical_name, recent_layoff_count, layoff_confidence, 
         market_cap_usd, enrichment_version
  FROM verified_company_intelligence
  WHERE country_code='IN' AND recent_layoff_count > 0
  ORDER BY recent_layoff_count DESC
  LIMIT 20
`);

console.log(`Remaining India companies with layoff counts (showing top 20 by count):\n`);
console.log(`canonical_name`.padEnd(35) + ` | layoffs | confidence | version`);
console.log('─'.repeat(85));

result.rows.forEach(row => {
  console.log(
    row.canonical_name.padEnd(35) + 
    ` | ${String(row.recent_layoff_count).padStart(7)} | ${row.layoff_confidence.toString().padStart(10)} | ${row.enrichment_version}`
  );
});

const stats = await pool.query(`
  SELECT COUNT(*) as total, 
         SUM(recent_layoff_count) as total_layoffs,
         MAX(recent_layoff_count) as max_layoffs,
         COUNT(CASE WHEN layoff_source = 'breaking_news_events' THEN 1 END) as verified_by_news
  FROM verified_company_intelligence
  WHERE country_code='IN' AND recent_layoff_count > 0
`);

console.log('\nStats:');
console.log(`  Total companies: ${stats.rows[0].total}`);
console.log(`  Total layoffs: ${stats.rows[0].total_layoffs}`);
console.log(`  Max layoffs (single co): ${stats.rows[0].max_layoffs}`);
console.log(`  Verified by breaking_news_events: ${stats.rows[0].verified_by_news}`);

await pool.end();
