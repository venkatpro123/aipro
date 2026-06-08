import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const result = await pool.query(`
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name = 'breaking_news_events'
  ORDER BY ordinal_position
`);

console.log('breaking_news_events table schema:');
result.rows.forEach(row => {
  console.log(`  ${row.column_name.padEnd(25)} ${row.data_type}`);
});

// Check if there are any layoff-related records
const layoffResult = await pool.query(`
  SELECT COUNT(*) as total, 
         COUNT(CASE WHEN headline ILIKE '%layoff%' THEN 1 END) as layoff_headlines
  FROM breaking_news_events
  WHERE created_at > NOW() - INTERVAL '180 days'
`);

console.log(`\nbreaking_news_events data:
  Total records (last 180 days): ${layoffResult.rows[0].total}
  With "layoff" in headline: ${layoffResult.rows[0].layoff_headlines}`);

await pool.end();
