import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const result = await pool.query(`
  SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN country_code='IN' THEN 1 END) as india_total,
    COUNT(CASE WHEN country_code='IN' AND market_cap_usd < 100000000 THEN 1 END) as india_sub100m,
    COUNT(CASE WHEN country_code='IN' AND market_cap_usd < 200000000 THEN 1 END) as india_sub200m,
    COUNT(CASE WHEN country_code='IN' AND market_cap_usd < 500000000 THEN 1 END) as india_sub500m,
    COUNT(CASE WHEN country_code='IN' AND market_cap_usd >= 500000000 THEN 1 END) as india_500m_plus,
    COUNT(CASE WHEN country_code='IN' AND data_quality_tier='verified' THEN 1 END) as verified_tier,
    COUNT(CASE WHEN country_code='IN' AND data_quality_tier='seed' THEN 1 END) as seed_tier,
    COUNT(CASE WHEN country_code='IN' AND is_public=true THEN 1 END) as public_listed,
    COUNT(CASE WHEN country_code='IN' AND is_public=false THEN 1 END) as private,
    ROUND(AVG(CASE WHEN country_code='IN' THEN market_cap_usd END)::numeric/1000000, 1) as avg_mc_usd_m,
    ROUND(AVG(CASE WHEN country_code='IN' THEN revenue_ttm_usd END)::numeric/1000000, 1) as avg_rev_usd_m,
    COUNT(DISTINCT sector) as unique_sectors,
    COUNT(DISTINCT industry) as unique_industries
  FROM verified_company_intelligence
`);

const r = result.rows[0];
console.log(`
╔════════════════════════════════════════════════════════════════════╗
║              VERIFIED_COMPANY_INTELLIGENCE AUDIT (May 2026)        ║
╚════════════════════════════════════════════════════════════════════╝

Global:
  Total companies: ${r.total}

India Non-Unicorn Portfolio:
  Total IN companies: ${r.india_total}
  
  By Market Cap Tier:
    < $100M:     ${r.india_sub100m}
    < $200M:     ${r.india_sub200m}
    < $500M:     ${r.india_sub500m}
    ≥ $500M:     ${r.india_500m_plus}
  
  By Data Quality:
    Verified:    ${r.verified_tier}
    Seed:        ${r.seed_tier}
  
  By Structure:
    Public/NSE/BSE: ${r.public_listed}
    Private:     ${r.private}
  
  Industry Coverage:
    Unique sectors:     ${r.unique_sectors}
    Unique industries:  ${r.unique_industries}
  
  Financials:
    Avg market cap: $${r.avg_mc_usd_m}M
    Avg revenue:    $${r.avg_rev_usd_m}M
`);

// Show GT125-127 batch stats
const batches = await pool.query(`
  SELECT enrichment_version, COUNT(*) as count, 
         MIN(market_cap_usd) as min_mc,
         MAX(market_cap_usd) as max_mc,
         ROUND(AVG(market_cap_usd)::numeric/1000000, 1) as avg_mc
  FROM verified_company_intelligence
  WHERE country_code='IN' AND enrichment_version LIKE 'gt12%'
  GROUP BY enrichment_version
  ORDER BY enrichment_version DESC
`);

console.log('Recent Batches (GT125-GT127):');
batches.rows.forEach(row => {
  console.log(`  ${row.enrichment_version}: ${row.count} cos | $${row.min_mc/1000000 | 0}M–$${row.max_mc/1000000 | 0}M | avg=$${row.avg_mc}M`);
});

await pool.end();
