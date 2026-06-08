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
    COUNT(DISTINCT sector) as unique_sectors,
    COUNT(DISTINCT industry) as unique_industries
  FROM verified_company_intelligence
`);

const r = result.rows[0];
console.log(`
╔════════════════════════════════════════════════════════════════════╗
║         VERIFIED_COMPANY_INTELLIGENCE FINAL AUDIT (May 31, 2026)   ║
║              After GT128–GT131 Expansion (56 new companies)        ║
╚════════════════════════════════════════════════════════════════════╝

Global:
  Total companies: ${r.total}

India Non-Unicorn Portfolio (EXPANDED):
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
`);

// Show all recent batches GT118-131
const batches = await pool.query(`
  SELECT enrichment_version, COUNT(*) as count, 
         MIN(market_cap_usd) as min_mc,
         MAX(market_cap_usd) as max_mc,
         ROUND(AVG(market_cap_usd)::numeric/1000000, 1) as avg_mc
  FROM verified_company_intelligence
  WHERE country_code='IN' AND enrichment_version LIKE 'gt1%'
  GROUP BY enrichment_version
  ORDER BY enrichment_version DESC
`);

console.log('Complete Batch Timeline (GT118–GT131):');
console.log('────────────────────────────────────────');
let total = 0;
batches.rows.forEach(row => {
  console.log(`  ${row.enrichment_version}: ${String(row.count).padStart(2)} cos | $${String(row.min_mc/1000000 | 0).padStart(3)}M–$${String(row.max_mc/1000000 | 0).padStart(3)}M | avg=$${row.avg_mc}M`);
  total += row.count;
});
console.log('────────────────────────────────────────');
console.log(`  TOTAL (GT118–GT131): ${total} companies`);

// Coverage breakdown by new sectors
const newSectors = await pool.query(`
  SELECT sector, COUNT(*) as count,
         COUNT(CASE WHEN enrichment_version IN ('gt128-v2026.1', 'gt129-v2026.1', 'gt130-v2026.1', 'gt131-v2026.1') THEN 1 END) as new_from_expansion
  FROM verified_company_intelligence
  WHERE country_code='IN'
  GROUP BY sector
  ORDER BY count DESC
`);

console.log('\nSector Distribution (India):');
console.log('────────────────────────────────────────');
newSectors.rows.slice(0, 15).forEach(row => {
  console.log(`  ${row.sector.padEnd(25)} ${String(row.count).padStart(3)} cos (+${row.new_from_expansion} from expansion)`);
});

await pool.end();
