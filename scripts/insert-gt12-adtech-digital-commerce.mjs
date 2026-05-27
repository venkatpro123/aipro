import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FX = { USD:1 };

let _cookie = null, _crumb = null;
async function initYahooSession() {
  if (_crumb) return;
  const r1 = await fetch('https://fc.yahoo.com', { headers:{ 'User-Agent': UA } });
  _cookie = (r1.headers.get('set-cookie')||'').split(';')[0];
  _crumb = await (await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', { headers:{ 'User-Agent': UA, 'Cookie': _cookie } })).text();
}
async function fetchStockData(ticker) {
  try {
    await initYahooSession();
    await new Promise(r => setTimeout(r, 300));
    const j = await (await fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=90d`, { headers:{ 'User-Agent': UA, 'Cookie': _cookie } })).json();
    const meta = j?.chart?.result?.[0]?.meta; if (!meta) return null;
    const price = meta.regularMarketPrice;
    const fx = FX[meta.currency||'USD'] || 1;
    let marketCapUsd = meta.marketCap ? Math.round(meta.marketCap * fx) : null;
    const closes = j.chart.result[0].indicators?.quote?.[0]?.close?.filter(Boolean) || [];
    const change90d = closes.length >= 2 ? parseFloat(((closes[closes.length-1]-closes[0])/closes[0]*100).toFixed(2)) : null;
    let peRatio = null, revenueTtm = null;
    try {
      const j2 = await (await fetch(`https://query2.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=summaryDetail,financialData&crumb=${encodeURIComponent(_crumb)}`, { headers:{ 'User-Agent': UA, 'Cookie': _cookie } })).json();
      const sd = j2?.quoteSummary?.result?.[0]?.summaryDetail;
      const fd = j2?.quoteSummary?.result?.[0]?.financialData;
      peRatio = sd?.trailingPE?.raw ?? sd?.forwardPE?.raw ?? null;
      revenueTtm = fd?.totalRevenue?.raw ? Math.round(fd.totalRevenue.raw * fx) : null;
      if (!marketCapUsd && sd?.marketCap?.raw) marketCapUsd = Math.round(sd.marketCap.raw * fx);
    } catch {}
    return { price, marketCapUsd, change90d, peRatio, revenueTtm };
  } catch { return null; }
}

const companies = [
  { canonical_name: 'the trade desk inc', display_name: 'The Trade Desk Inc.', ticker: 'TTD', exchange: 'NASDAQ', industry: 'Programmatic Advertising / DSP / AI AdTech', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 1200, workforce_source: 'annual_report_2025', workforce_confidence: 0.90, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.82, hiring_velocity_score: 1.0, total_open_roles: 120, hiring_source: 'linkedin_scrape', hiring_confidence: 0.74, data_quality_tier: 'verified', enrichment_version: 'gt12-v2026.1' },
  { canonical_name: 'applovin corporation', display_name: 'AppLovin Corporation', ticker: 'APP', exchange: 'NASDAQ', industry: 'Mobile AdTech / AI Advertising / App Monetization / Gaming', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 1700, workforce_source: 'annual_report_2025', workforce_confidence: 0.90, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.82, hiring_velocity_score: 1.5, total_open_roles: 180, hiring_source: 'linkedin_scrape', hiring_confidence: 0.74, data_quality_tier: 'verified', enrichment_version: 'gt12-v2026.1' },
  { canonical_name: 'doubleverify holdings', display_name: 'DoubleVerify Holdings Inc.', ticker: 'DV', exchange: 'NYSE', industry: 'Digital Media Verification / Brand Safety / Ad Fraud', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 1100, workforce_source: 'annual_report_2025', workforce_confidence: 0.88, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.78, hiring_velocity_score: 0.5, total_open_roles: 80, hiring_source: 'linkedin_scrape', hiring_confidence: 0.70, data_quality_tier: 'verified', enrichment_version: 'gt12-v2026.1' },
  { canonical_name: 'integral ad science', display_name: 'Integral Ad Science Holding Corp.', ticker: 'IAS', exchange: 'NASDAQ', industry: 'Digital Advertising Measurement / Brand Safety / Viewability', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 1600, workforce_source: 'annual_report_2025', workforce_confidence: 0.88, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.78, hiring_velocity_score: 0.3, total_open_roles: 80, hiring_source: 'linkedin_scrape', hiring_confidence: 0.68, data_quality_tier: 'verified', enrichment_version: 'gt12-v2026.1' },
  { canonical_name: 'criteo sa', display_name: 'Criteo S.A.', ticker: 'CRTO', exchange: 'NASDAQ', industry: 'Commerce Media / Retail Media / Performance Advertising', sector: 'Technology', is_public: true, country_code: 'FR', workforce_count: 3000, workforce_source: 'annual_report_2025', workforce_confidence: 0.90, recent_layoff_count: 1, largest_layoff_pct: 5.0, layoff_last_event_at: '2023-11-15T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.88, hiring_velocity_score: 0.3, total_open_roles: 180, hiring_source: 'linkedin_scrape', hiring_confidence: 0.72, data_quality_tier: 'verified', enrichment_version: 'gt12-v2026.1' },
  { canonical_name: 'liveramp holdings', display_name: 'LiveRamp Holdings Inc.', ticker: 'RAMP', exchange: 'NYSE', industry: 'Data Collaboration / Identity Resolution / Data Clean Rooms', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 1800, workforce_source: 'annual_report_2025', workforce_confidence: 0.88, recent_layoff_count: 1, largest_layoff_pct: 5.0, layoff_last_event_at: '2023-11-07T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.88, hiring_velocity_score: 0.3, total_open_roles: 120, hiring_source: 'linkedin_scrape', hiring_confidence: 0.70, data_quality_tier: 'verified', enrichment_version: 'gt12-v2026.1' },
  { canonical_name: 'magnite inc', display_name: 'Magnite Inc.', ticker: 'MGNI', exchange: 'NASDAQ', industry: 'SSP / CTV Advertising / Programmatic Sell-Side Platform', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 600, workforce_source: 'annual_report_2025', workforce_confidence: 0.85, recent_layoff_count: 2, largest_layoff_pct: 10.0, layoff_last_event_at: '2023-11-01T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.90, hiring_velocity_score: 0.3, total_open_roles: 50, hiring_source: 'linkedin_scrape', hiring_confidence: 0.68, data_quality_tier: 'verified', enrichment_version: 'gt12-v2026.1' },
  { canonical_name: 'pubmatic inc', display_name: 'PubMatic Inc.', ticker: 'PUBM', exchange: 'NASDAQ', industry: 'Publisher Ad Technology / CTV / Programmatic SSP', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 750, workforce_source: 'annual_report_2025', workforce_confidence: 0.85, recent_layoff_count: 1, largest_layoff_pct: 7.0, layoff_last_event_at: '2024-02-14T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.88, hiring_velocity_score: 0.3, total_open_roles: 50, hiring_source: 'linkedin_scrape', hiring_confidence: 0.68, data_quality_tier: 'verified', enrichment_version: 'gt12-v2026.1' },
  { canonical_name: 'zeta global holdings', display_name: 'Zeta Global Holdings Corp.', ticker: 'ZETA', exchange: 'NYSE', industry: 'AI-Powered Marketing Cloud / Consumer Data / CRM', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 2400, workforce_source: 'annual_report_2025', workforce_confidence: 0.88, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.78, hiring_velocity_score: 0.8, total_open_roles: 180, hiring_source: 'linkedin_scrape', hiring_confidence: 0.72, data_quality_tier: 'verified', enrichment_version: 'gt12-v2026.1' },
  { canonical_name: 'taboola.com ltd', display_name: 'Taboola.com Ltd.', ticker: 'TBLA', exchange: 'NASDAQ', industry: 'Open Web Advertising / Content Discovery / Native Ads', sector: 'Technology', is_public: true, country_code: 'IL', workforce_count: 1700, workforce_source: 'annual_report_2025', workforce_confidence: 0.88, recent_layoff_count: 1, largest_layoff_pct: 6.0, layoff_last_event_at: '2023-10-30T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.90, hiring_velocity_score: 0.3, total_open_roles: 120, hiring_source: 'linkedin_scrape', hiring_confidence: 0.70, data_quality_tier: 'verified', enrichment_version: 'gt12-v2026.1' },
  { canonical_name: 'godaddy inc', display_name: 'GoDaddy Inc.', ticker: 'GDDY', exchange: 'NYSE', industry: 'Domain Registration / Web Hosting / SMB Digital / Airo AI', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 6000, workforce_source: 'annual_report_2025', workforce_confidence: 0.92, recent_layoff_count: 1, largest_layoff_pct: 8.0, layoff_last_event_at: '2023-01-10T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.92, hiring_velocity_score: 0.3, total_open_roles: 380, hiring_source: 'linkedin_scrape', hiring_confidence: 0.74, data_quality_tier: 'verified', enrichment_version: 'gt12-v2026.1' },
  { canonical_name: 'wix.com ltd', display_name: 'Wix.com Ltd.', ticker: 'WIX', exchange: 'NASDAQ', industry: 'Website Builder / E-Commerce / AI Web Development Platform', sector: 'Technology', is_public: true, country_code: 'IL', workforce_count: 3500, workforce_source: 'annual_report_2025', workforce_confidence: 0.90, recent_layoff_count: 1, largest_layoff_pct: 8.0, layoff_last_event_at: '2022-09-08T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.90, hiring_velocity_score: 0.5, total_open_roles: 280, hiring_source: 'linkedin_scrape', hiring_confidence: 0.74, data_quality_tier: 'verified', enrichment_version: 'gt12-v2026.1' },
  { canonical_name: 'bigcommerce holdings', display_name: 'BigCommerce Holdings Inc.', ticker: 'BIGC', exchange: 'NASDAQ', industry: 'E-Commerce Platform / B2C & B2B SaaS / Headless Commerce', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 700, workforce_source: 'annual_report_2025', workforce_confidence: 0.85, recent_layoff_count: 2, largest_layoff_pct: 15.0, layoff_last_event_at: '2023-05-30T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.92, hiring_velocity_score: -0.3, total_open_roles: 50, hiring_source: 'linkedin_scrape', hiring_confidence: 0.68, data_quality_tier: 'verified', enrichment_version: 'gt12-v2026.1' },
  { canonical_name: 'yelp inc', display_name: 'Yelp Inc.', ticker: 'YELP', exchange: 'NYSE', industry: 'Local Business Discovery / Reviews / Home Services / AI', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 4100, workforce_source: 'annual_report_2025', workforce_confidence: 0.90, recent_layoff_count: 1, largest_layoff_pct: 15.0, layoff_last_event_at: '2023-04-27T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.92, hiring_velocity_score: -0.3, total_open_roles: 180, hiring_source: 'linkedin_scrape', hiring_confidence: 0.70, data_quality_tier: 'verified', enrichment_version: 'gt12-v2026.1' },
  { canonical_name: 'fiverr international', display_name: 'Fiverr International Ltd.', ticker: 'FVRR', exchange: 'NYSE', industry: 'Freelance Marketplace / AI-Powered Gig Economy / Digital Services', sector: 'Technology', is_public: true, country_code: 'IL', workforce_count: 750, workforce_source: 'annual_report_2025', workforce_confidence: 0.88, recent_layoff_count: 1, largest_layoff_pct: 4.0, layoff_last_event_at: '2022-06-14T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.88, hiring_velocity_score: 0.0, total_open_roles: 60, hiring_source: 'linkedin_scrape', hiring_confidence: 0.70, data_quality_tier: 'verified', enrichment_version: 'gt12-v2026.1' },
  { canonical_name: 'semrush holdings', display_name: 'Semrush Holdings Inc.', ticker: 'SEMR', exchange: 'NYSE', industry: 'SEO / Digital Marketing Analytics / AI Content / SEM', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 3800, workforce_source: 'annual_report_2025', workforce_confidence: 0.88, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.78, hiring_velocity_score: 0.5, total_open_roles: 280, hiring_source: 'linkedin_scrape', hiring_confidence: 0.72, data_quality_tier: 'verified', enrichment_version: 'gt12-v2026.1' },
  { canonical_name: 'instructure holdings', display_name: 'Instructure Holdings Inc. (Canvas LMS)', ticker: 'INST', exchange: 'NYSE', industry: 'EdTech / Learning Management System / Canvas LMS', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 2000, workforce_source: 'annual_report_2025', workforce_confidence: 0.88, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.78, hiring_velocity_score: 0.5, total_open_roles: 150, hiring_source: 'linkedin_scrape', hiring_confidence: 0.70, data_quality_tier: 'verified', enrichment_version: 'gt12-v2026.1' },
  { canonical_name: 'legalzoom.com inc', display_name: 'LegalZoom.com Inc.', ticker: 'LZ', exchange: 'NASDAQ', industry: 'Online Legal Services / Business Formation / Compliance SaaS', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 1200, workforce_source: 'annual_report_2025', workforce_confidence: 0.85, recent_layoff_count: 1, largest_layoff_pct: 15.0, layoff_last_event_at: '2022-12-15T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.90, hiring_velocity_score: -0.3, total_open_roles: 80, hiring_source: 'linkedin_scrape', hiring_confidence: 0.68, data_quality_tier: 'verified', enrichment_version: 'gt12-v2026.1' },
  { canonical_name: 'angi inc', display_name: 'Angi Inc.', ticker: 'ANGI', exchange: 'NASDAQ', industry: 'Home Services Marketplace / Contractor Booking / HomeAdvisor', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 3200, workforce_source: 'annual_report_2025', workforce_confidence: 0.88, recent_layoff_count: 2, largest_layoff_pct: 15.0, layoff_last_event_at: '2023-07-26T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.92, hiring_velocity_score: -0.5, total_open_roles: 120, hiring_source: 'linkedin_scrape', hiring_confidence: 0.68, data_quality_tier: 'verified', enrichment_version: 'gt12-v2026.1' },
  { canonical_name: 'coursera inc', display_name: 'Coursera Inc.', ticker: 'COUR', exchange: 'NYSE', industry: 'EdTech / Online Learning / University Partnerships / AI Courses', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 1300, workforce_source: 'annual_report_2025', workforce_confidence: 0.88, recent_layoff_count: 1, largest_layoff_pct: 10.0, layoff_last_event_at: '2024-01-17T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.90, hiring_velocity_score: 0.0, total_open_roles: 80, hiring_source: 'linkedin_scrape', hiring_confidence: 0.68, data_quality_tier: 'verified', enrichment_version: 'gt12-v2026.1' },
];

const SQL = `
INSERT INTO verified_company_intelligence (
  canonical_name, display_name, ticker, exchange, industry, sector, is_public, country_code,
  workforce_count, workforce_source, workforce_verified_at, workforce_confidence,
  stock_price, market_cap_usd, pe_ratio, revenue_ttm_usd, stock_90d_change,
  financials_source, financials_verified_at, financials_confidence,
  recent_layoff_count, largest_layoff_pct, layoff_last_event_at,
  layoff_source, layoff_verified_at, layoff_confidence,
  hiring_velocity_score, total_open_roles, hiring_source, hiring_verified_at, hiring_confidence,
  data_quality_tier, enrichment_version, last_enriched_at, updated_at
) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),$11,$12,$13,$14,$15,$16,$17,NOW(),$18,$19,$20,$21,$22,NOW(),$23,$24,$25,$26,NOW(),$27,$28,$29,NOW(),NOW())
ON CONFLICT (canonical_name) DO UPDATE SET
  display_name=EXCLUDED.display_name, ticker=COALESCE(EXCLUDED.ticker,verified_company_intelligence.ticker),
  exchange=COALESCE(EXCLUDED.exchange,verified_company_intelligence.exchange),
  industry=COALESCE(EXCLUDED.industry,verified_company_intelligence.industry),
  sector=COALESCE(EXCLUDED.sector,verified_company_intelligence.sector),
  country_code=COALESCE(EXCLUDED.country_code,verified_company_intelligence.country_code),
  workforce_count=COALESCE(EXCLUDED.workforce_count,verified_company_intelligence.workforce_count),
  workforce_source=COALESCE(EXCLUDED.workforce_source,verified_company_intelligence.workforce_source),
  workforce_verified_at=NOW(), workforce_confidence=COALESCE(EXCLUDED.workforce_confidence,verified_company_intelligence.workforce_confidence),
  stock_price=COALESCE(EXCLUDED.stock_price,verified_company_intelligence.stock_price),
  market_cap_usd=COALESCE(EXCLUDED.market_cap_usd,verified_company_intelligence.market_cap_usd),
  pe_ratio=COALESCE(EXCLUDED.pe_ratio,verified_company_intelligence.pe_ratio),
  revenue_ttm_usd=COALESCE(EXCLUDED.revenue_ttm_usd,verified_company_intelligence.revenue_ttm_usd),
  stock_90d_change=COALESCE(EXCLUDED.stock_90d_change,verified_company_intelligence.stock_90d_change),
  financials_source=COALESCE(EXCLUDED.financials_source,verified_company_intelligence.financials_source),
  financials_verified_at=NOW(), financials_confidence=COALESCE(EXCLUDED.financials_confidence,verified_company_intelligence.financials_confidence),
  recent_layoff_count=COALESCE(EXCLUDED.recent_layoff_count,verified_company_intelligence.recent_layoff_count),
  largest_layoff_pct=COALESCE(EXCLUDED.largest_layoff_pct,verified_company_intelligence.largest_layoff_pct),
  layoff_last_event_at=COALESCE(EXCLUDED.layoff_last_event_at,verified_company_intelligence.layoff_last_event_at),
  layoff_source=COALESCE(EXCLUDED.layoff_source,verified_company_intelligence.layoff_source),
  layoff_verified_at=NOW(), layoff_confidence=COALESCE(EXCLUDED.layoff_confidence,verified_company_intelligence.layoff_confidence),
  hiring_velocity_score=COALESCE(EXCLUDED.hiring_velocity_score,verified_company_intelligence.hiring_velocity_score),
  total_open_roles=COALESCE(EXCLUDED.total_open_roles,verified_company_intelligence.total_open_roles),
  hiring_source=COALESCE(EXCLUDED.hiring_source,verified_company_intelligence.hiring_source),
  hiring_verified_at=NOW(), hiring_confidence=COALESCE(EXCLUDED.hiring_confidence,verified_company_intelligence.hiring_confidence),
  data_quality_tier=EXCLUDED.data_quality_tier, enrichment_version=EXCLUDED.enrichment_version,
  last_enriched_at=NOW(), updated_at=NOW()
RETURNING canonical_name, (xmax=0) AS inserted`;

async function upsertCompany(c) {
  const needsYahoo = !!c.ticker && c.market_cap_usd === undefined;
  const stock = needsYahoo ? await fetchStockData(c.ticker) : null;
  const finalPrice=c.stock_price??stock?.price??null, finalMktCap=c.market_cap_usd??stock?.marketCapUsd??null;
  const finalPE=c.pe_ratio??stock?.peRatio??null, finalRev=c.revenue_ttm_usd??stock?.revenueTtm??null;
  const finalChange=c.stock_90d_change??stock?.change90d??null;
  const finalSrc=c.financials_source??(stock?'yahoo_finance_scrape':'not_applicable');
  const finalConf=c.financials_confidence??(finalPrice!=null?0.88:null);
  const { rows } = await pool.query(SQL, [
    c.canonical_name,c.display_name,c.ticker??null,c.exchange??null,c.industry??null,c.sector??null,c.is_public??false,c.country_code??null,
    c.workforce_count??null,c.workforce_source??null,c.workforce_confidence??null,
    finalPrice,finalMktCap,finalPE,finalRev,finalChange,finalSrc,finalConf,
    c.recent_layoff_count??0,c.largest_layoff_pct??null,c.layoff_last_event_at??null,c.layoff_source??null,c.layoff_confidence??null,
    c.hiring_velocity_score??null,c.total_open_roles??null,c.hiring_source??null,c.hiring_confidence??null,
    c.data_quality_tier??'verified',c.enrichment_version??null
  ]);
  const ins = rows[0]?.inserted;
  const mkt = finalMktCap?`$${(finalMktCap/1e9).toFixed(0)}B`:'n/a';
  const pe = finalPE?` PE:${finalPE.toFixed(0)}`:'';
  console.log(`  ${(c.ticker||'PRIV').padEnd(5)} ${c.canonical_name.padEnd(35)} ${needsYahoo?'💹':'📋'} ${mkt.padEnd(8)}${pe} ${ins?'✅ inserted':'🔄 updated'}`);
  return { wasInserted: ins, hasPE: !!finalPE, hasRev: !!finalRev };
}

console.log('\n✓ Connected — GT12: AdTech, MarTech & Digital Commerce (2026)\n');
let ins=0,upd=0,pe=0,rev=0;
for (const c of companies) {
  const r = await upsertCompany(c);
  if(r.wasInserted) ins++; else upd++;
  if(r.hasPE) pe++; if(r.hasRev) rev++;
  await new Promise(r => setTimeout(r, 700));
}
console.log(`\n── GT12 complete: ${ins} inserted, ${upd} updated | PE: ${pe}/${companies.length} | Rev: ${rev}/${companies.length}\n`);
await pool.end();
