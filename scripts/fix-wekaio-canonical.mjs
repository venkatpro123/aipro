// Fix: GT34 inserted WekaIO with wrong canonical_name 'pony ai inc'.
// Rename canonical_name to 'wekaio inc' so it no longer collides with the real Pony.ai (autonomous driving).
import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function main() {
  // Confirm the bad row exists and is the WekaIO mislabel (display_name WekaIO, industry storage)
  const { rows: before } = await pool.query(
    `SELECT canonical_name, display_name, industry FROM verified_company_intelligence WHERE canonical_name = 'pony ai inc'`
  );
  console.log('Before:', before);

  if (before.length && /WekaIO/i.test(before[0].display_name)) {
    // Rename to correct canonical name
    await pool.query(
      `UPDATE verified_company_intelligence
       SET canonical_name = 'wekaio inc', updated_at = NOW()
       WHERE canonical_name = 'pony ai inc'`
    );
    console.log("✅ Renamed 'pony ai inc' → 'wekaio inc'");
  } else {
    console.log('No mislabeled WekaIO row found under pony ai inc — nothing to do.');
  }

  // Now insert the REAL Pony.ai (autonomous driving, NASDAQ: PONY) as its own row
  const now = new Date().toISOString();
  const sql = `
    INSERT INTO verified_company_intelligence (
      canonical_name,display_name,ticker,exchange,industry,sector,
      is_public,country_code,workforce_count,workforce_source,workforce_verified_at,workforce_confidence,
      market_cap_usd,revenue_ttm_usd,financials_source,financials_verified_at,financials_confidence,
      recent_layoff_count,layoff_source,layoff_verified_at,layoff_confidence,
      hiring_velocity_score,total_open_roles,hiring_source,hiring_verified_at,hiring_confidence,
      data_quality_tier,enrichment_version,last_enriched_at,conflict_flags,updated_at
    ) VALUES (
      'pony ai inc','Pony.ai Inc.','PONY','NASDAQ',
      'Autonomous Driving / Robotaxi / Self-Driving Trucks / L4 Autonomy / China & US AV','Technology',
      true,'CN',2000,'annual_report',$1,0.85,
      6000000000,75000000,'news_rss_scrape',$1,0.62,
      0,'news_rss_scrape',$1,0.70,
      1.2,150,'linkedin_scrape',$1,0.68,
      'seed','gt34-fix-v2026.1',$1,'[]'::jsonb,$1
    )
    ON CONFLICT (canonical_name) DO NOTHING
    RETURNING canonical_name`;
  const { rows: ins } = await pool.query(sql, [now]);
  console.log(ins.length ? '✅ Inserted real Pony.ai (PONY)' : 'Pony.ai already present — skipped');

  const { rows: after } = await pool.query(
    `SELECT canonical_name, display_name, ticker, industry FROM verified_company_intelligence
     WHERE canonical_name IN ('wekaio inc','pony ai inc') ORDER BY canonical_name`
  );
  console.log('After:', after);
  await pool.end();
}
main().catch(e=>{ console.error(e); process.exit(1); });
