import pg from "pg";
const db = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await db.connect();
const now = new Date().toISOString();
const { rowCount } = await db.query(`
  INSERT INTO verified_company_intelligence (
    canonical_name, display_name, country_code, is_public, ticker, exchange,
    sector, industry, workforce_count, workforce_source, workforce_confidence, workforce_verified_at,
    recent_layoff_count, layoff_confidence, layoff_verified_at,
    total_open_roles, hiring_velocity_score, hiring_source, hiring_verified_at, hiring_confidence,
    data_quality_tier, enrichment_version, last_enriched_at
  ) VALUES (
    'tata motors','Tata Motors Limited','IN',true,'TATAMOTORS.NS','NSE',
    'Consumer Discretionary','Automobile',84000,'annual_report_scrape',0.88,$1,
    0,0.85,$1, 0,0.0,'heuristic_estimate',$1,0.60,
    'seed','real-data-v1.0',$1
  )
  ON CONFLICT (canonical_name) DO UPDATE SET
    display_name=EXCLUDED.display_name, country_code=EXCLUDED.country_code,
    is_public=EXCLUDED.is_public, ticker=EXCLUDED.ticker, exchange=EXCLUDED.exchange,
    sector=EXCLUDED.sector, industry=EXCLUDED.industry,
    workforce_count=EXCLUDED.workforce_count, workforce_source=EXCLUDED.workforce_source,
    workforce_confidence=EXCLUDED.workforce_confidence, workforce_verified_at=EXCLUDED.workforce_verified_at,
    recent_layoff_count=EXCLUDED.recent_layoff_count, data_quality_tier=EXCLUDED.data_quality_tier,
    enrichment_version=EXCLUDED.enrichment_version, last_enriched_at=EXCLUDED.last_enriched_at,
    updated_at=NOW()
`, [now]);
console.log("tata motors upserted:", rowCount, "rows");
await db.end();
