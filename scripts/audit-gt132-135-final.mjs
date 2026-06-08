import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const result = await pool.query(`
  SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN country_code='IN' THEN 1 END) as india_total,
    COUNT(CASE WHEN country_code='IN' AND enrichment_version IN ('gt132-v2026.1','gt133-v2026.1','gt134-v2026.1','gt135-v2026.1') THEN 1 END) as new_from_gt132_135
  FROM verified_company_intelligence
`);

const batches = await pool.query(`
  SELECT enrichment_version, COUNT(*) as count, 
         MIN(market_cap_usd/1000000) as min_mc,
         MAX(market_cap_usd/1000000) as max_mc,
         ROUND(AVG(market_cap_usd::numeric/1000000), 1) as avg_mc,
         COUNT(CASE WHEN is_public=true THEN 1 END) as verified_count
  FROM verified_company_intelligence
  WHERE enrichment_version IN ('gt132-v2026.1','gt133-v2026.1','gt134-v2026.1','gt135-v2026.1')
  GROUP BY enrichment_version
  ORDER BY enrichment_version
`);

console.log(`
╔════════════════════════════════════════════════════════════════════╗
║         GT132–GT135 EXPANSION COMPLETE (May 31, 2026)             ║
╚════════════════════════════════════════════════════════════════════╝

Database Summary:
  Global total: ${result.rows[0].total} companies
  India companies: ${result.rows[0].india_total}
  NEW from GT132–GT135: ${result.rows[0].new_from_gt132_135}

GT132–GT135 Batch Breakdown:
`);

batches.rows.forEach(row => {
  console.log(`  ${row.enrichment_version} | ${String(row.count).padStart(2)} cos | $${String(row.min_mc|0).padStart(3)}M–$${String(row.max_mc|0).padStart(3)}M | avg=$${row.avg_mc}M | verified:${row.verified_count}`);
});

// Show India sub-$500M tier expansion
const mcTier = await pool.query(`
  SELECT 
    COUNT(CASE WHEN market_cap_usd < 100000000 THEN 1 END) as sub100m,
    COUNT(CASE WHEN market_cap_usd >= 100000000 AND market_cap_usd < 200000000 THEN 1 END) as c100_200m,
    COUNT(CASE WHEN market_cap_usd >= 200000000 AND market_cap_usd < 500000000 THEN 1 END) as c200_500m,
    COUNT(CASE WHEN market_cap_usd >= 500000000 THEN 1 END) as c500m_plus
  FROM verified_company_intelligence
  WHERE country_code='IN'
`);

const t = mcTier.rows[0];
console.log(`
India Market Cap Distribution:
  < $100M:      ${t.sub100m}
  $100M–$200M:  ${t.c100_200m}
  $200M–$500M:  ${t.c200_500m}
  ≥ $500M:      ${t.c500m_plus}
`);

await pool.end();
