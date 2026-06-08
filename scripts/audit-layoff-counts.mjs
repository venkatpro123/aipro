import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

console.log(`
╔════════════════════════════════════════════════════════════════════╗
║              LAYOFF COUNT AUDIT — Recent Batches (GT125–GT131)     ║
╚════════════════════════════════════════════════════════════════════╝
`);

// Companies with recent_layoff_count > 0
const result = await pool.query(`
  SELECT canonical_name, display_name, market_cap_usd, recent_layoff_count, 
         layoff_confidence, enrichment_version
  FROM verified_company_intelligence
  WHERE country_code='IN' AND recent_layoff_count > 0
    AND enrichment_version LIKE 'gt1%'
  ORDER BY enrichment_version DESC, recent_layoff_count DESC
`);

console.log(`Companies with recent layoffs (${result.rows.length} total):\n`);

result.rows.forEach(row => {
  console.log(`  ${row.enrichment_version}  ${row.canonical_name.padEnd(30)} | layoffs: ${String(row.recent_layoff_count).padStart(4)} | confidence: ${row.layoff_confidence} | mc: $${row.market_cap_usd/1000000 | 0}M`);
});

// Summary by batch
console.log('\n\nSummary by Batch:');
const batchResult = await pool.query(`
  SELECT enrichment_version, 
         COUNT(*) as total_companies,
         COUNT(CASE WHEN recent_layoff_count > 0 THEN 1 END) as with_layoffs,
         SUM(recent_layoff_count) as total_layoff_count,
         MAX(recent_layoff_count) as max_layoff_count
  FROM verified_company_intelligence
  WHERE country_code='IN' AND enrichment_version LIKE 'gt1%'
  GROUP BY enrichment_version
  ORDER BY enrichment_version DESC
`);

batchResult.rows.forEach(row => {
  const pct = row.with_layoffs > 0 ? ((row.with_layoffs / row.total_companies) * 100).toFixed(1) : '0.0';
  console.log(`  ${row.enrichment_version}  ${String(row.total_companies).padStart(2)} cos | ${String(row.with_layoffs).padStart(2)} with layoffs (${pct}%) | total: ${row.total_layoff_count} | max: ${row.max_layoff_count}`);
});

await pool.end();
