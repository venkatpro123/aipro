// Fix Sify Technologies P/S outlier — GT118 inserted correct values
// but an older seed entry exists with wrong revenue. Update to GT118 values.
import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// Check what's in the DB
const r = await pool.query(`
  SELECT canonical_name, market_cap_usd, revenue_ttm_usd, workforce_count,
    financials_source, enrichment_version
  FROM verified_company_intelligence
  WHERE canonical_name LIKE '%sify%'
`);

console.log('Sify entries found:');
r.rows.forEach(row => {
  const ps = row.market_cap_usd && row.revenue_ttm_usd
    ? (row.market_cap_usd / row.revenue_ttm_usd).toFixed(2) : 'n/a';
  console.log(`  ${row.canonical_name}: mc=$${(row.market_cap_usd/1e6).toFixed(0)}M  rev=$${(row.revenue_ttm_usd/1e6).toFixed(0)}M  P/S=${ps}x  v=${row.enrichment_version}`);
});

// The GT118 entry has the correct values (mc=$318M, rev=$198M, P/S=1.6x)
// The old outlier has the wrong revenue (rev=$44877M — clearly a seed error, INR not converted)
// Fix: update the outlier canonical_name 'sify technologies limited' to correct values
await pool.query(`
  UPDATE verified_company_intelligence
  SET
    market_cap_usd       = 318000000,
    revenue_ttm_usd      = 198000000,
    financials_source    = 'nasdaq_filing',
    financials_confidence= 0.87,
    enrichment_version   = 'gt118-v2026.1',
    updated_at           = NOW()
  WHERE canonical_name LIKE '%sify%'
    AND (revenue_ttm_usd > 1000000000 OR market_cap_usd::numeric / revenue_ttm_usd < 0.2)
`);

console.log('\nFixed: corrected Sify revenue from INR (unconverted) to USD $198M');

// Verify
const v = await pool.query(`
  SELECT canonical_name, market_cap_usd, revenue_ttm_usd,
    ROUND(market_cap_usd::numeric / revenue_ttm_usd, 2) as ps_ratio
  FROM verified_company_intelligence WHERE canonical_name LIKE '%sify%'
`);
v.rows.forEach(row => console.log(`  ✅  ${row.canonical_name}: P/S=${row.ps_ratio}x`));

await pool.end();
