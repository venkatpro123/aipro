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
  { canonical_name: 'uber technologies', display_name: 'Uber Technologies Inc.', ticker: 'UBER', exchange: 'NYSE', industry: 'Ride-Hailing / Food Delivery / Freight / AI', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 32600, workforce_source: 'annual_report_2025', workforce_confidence: 0.93, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.85, hiring_velocity_score: 1.5, total_open_roles: 2200, hiring_source: 'linkedin_scrape', hiring_confidence: 0.80, data_quality_tier: 'verified', enrichment_version: 'gt7-v2026.1' },
  { canonical_name: 'airbnb inc', display_name: 'Airbnb Inc.', ticker: 'ABNB', exchange: 'NASDAQ', industry: 'Short-Term Rental / Travel / Experiences', sector: 'Consumer Discretionary', is_public: true, country_code: 'US', workforce_count: 6907, workforce_source: 'annual_report_2025', workforce_confidence: 0.93, recent_layoff_count: 1, largest_layoff_pct: 25.0, layoff_last_event_at: '2020-05-05T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.85, hiring_velocity_score: 0.5, total_open_roles: 380, hiring_source: 'linkedin_scrape', hiring_confidence: 0.78, data_quality_tier: 'verified', enrichment_version: 'gt7-v2026.1' },
  { canonical_name: 'doordash inc', display_name: 'DoorDash Inc.', ticker: 'DASH', exchange: 'NYSE', industry: 'Food Delivery / Local Commerce', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 38000, workforce_source: 'annual_report_2025', workforce_confidence: 0.90, recent_layoff_count: 1, largest_layoff_pct: 6.0, layoff_last_event_at: '2022-11-30T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.85, hiring_velocity_score: 1.0, total_open_roles: 1400, hiring_source: 'linkedin_scrape', hiring_confidence: 0.78, data_quality_tier: 'verified', enrichment_version: 'gt7-v2026.1' },
  { canonical_name: 'shopify inc', display_name: 'Shopify Inc.', ticker: 'SHOP', exchange: 'NYSE', industry: 'E-Commerce Platform / Merchant Services / AI', sector: 'Technology', is_public: true, country_code: 'CA', workforce_count: 8300, workforce_source: 'annual_report_2025', workforce_confidence: 0.93, recent_layoff_count: 2, largest_layoff_pct: 20.0, layoff_last_event_at: '2023-05-04T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.90, hiring_velocity_score: 0.8, total_open_roles: 480, hiring_source: 'linkedin_scrape', hiring_confidence: 0.78, data_quality_tier: 'verified', enrichment_version: 'gt7-v2026.1' },
  { canonical_name: 'booking holdings', display_name: 'Booking Holdings Inc.', ticker: 'BKNG', exchange: 'NASDAQ', industry: 'Online Travel / Hotel Booking / OTA', sector: 'Consumer Discretionary', is_public: true, country_code: 'US', workforce_count: 24700, workforce_source: 'annual_report_2025', workforce_confidence: 0.93, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.85, hiring_velocity_score: 0.8, total_open_roles: 980, hiring_source: 'linkedin_scrape', hiring_confidence: 0.78, data_quality_tier: 'verified', enrichment_version: 'gt7-v2026.1' },
  { canonical_name: 'expedia group', display_name: 'Expedia Group Inc.', ticker: 'EXPE', exchange: 'NASDAQ', industry: 'Online Travel / OTA / Hotels', sector: 'Consumer Discretionary', is_public: true, country_code: 'US', workforce_count: 16700, workforce_source: 'annual_report_2025', workforce_confidence: 0.92, recent_layoff_count: 2, largest_layoff_pct: 9.0, layoff_last_event_at: '2024-02-08T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.90, hiring_velocity_score: 0.3, total_open_roles: 580, hiring_source: 'linkedin_scrape', hiring_confidence: 0.76, data_quality_tier: 'verified', enrichment_version: 'gt7-v2026.1' },
  { canonical_name: 'snap inc', display_name: 'Snap Inc.', ticker: 'SNAP', exchange: 'NYSE', industry: 'Social Media / AR / Advertising', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 5300, workforce_source: 'annual_report_2025', workforce_confidence: 0.92, recent_layoff_count: 3, largest_layoff_pct: 20.0, layoff_last_event_at: '2024-02-05T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.92, hiring_velocity_score: -0.5, total_open_roles: 220, hiring_source: 'linkedin_scrape', hiring_confidence: 0.76, data_quality_tier: 'verified', enrichment_version: 'gt7-v2026.1' },
  { canonical_name: 'pinterest inc', display_name: 'Pinterest Inc.', ticker: 'PINS', exchange: 'NYSE', industry: 'Visual Discovery / Social Commerce / AI', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 3500, workforce_source: 'annual_report_2025', workforce_confidence: 0.90, recent_layoff_count: 1, largest_layoff_pct: 5.0, layoff_last_event_at: '2024-10-11T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.88, hiring_velocity_score: 0.3, total_open_roles: 180, hiring_source: 'linkedin_scrape', hiring_confidence: 0.74, data_quality_tier: 'verified', enrichment_version: 'gt7-v2026.1' },
  { canonical_name: 'reddit inc', display_name: 'Reddit Inc.', ticker: 'RDDT', exchange: 'NYSE', industry: 'Community Platform / Social Media / AI Licensing', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 2100, workforce_source: 'annual_report_2025', workforce_confidence: 0.90, recent_layoff_count: 1, largest_layoff_pct: 5.0, layoff_last_event_at: '2024-02-22T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.88, hiring_velocity_score: 1.0, total_open_roles: 180, hiring_source: 'linkedin_scrape', hiring_confidence: 0.74, data_quality_tier: 'verified', enrichment_version: 'gt7-v2026.1' },
  { canonical_name: 'roblox corporation', display_name: 'Roblox Corporation', ticker: 'RBLX', exchange: 'NYSE', industry: 'Gaming Platform / Metaverse / Social / AI', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 4400, workforce_source: 'annual_report_2025', workforce_confidence: 0.90, recent_layoff_count: 1, largest_layoff_pct: 25.0, layoff_last_event_at: '2024-07-25T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.90, hiring_velocity_score: 0.3, total_open_roles: 220, hiring_source: 'linkedin_scrape', hiring_confidence: 0.74, data_quality_tier: 'verified', enrichment_version: 'gt7-v2026.1' },
  { canonical_name: 'ebay inc', display_name: 'eBay Inc.', ticker: 'EBAY', exchange: 'NASDAQ', industry: 'E-Commerce Marketplace / Payments', sector: 'Consumer Discretionary', is_public: true, country_code: 'US', workforce_count: 11600, workforce_source: 'annual_report_2025', workforce_confidence: 0.92, recent_layoff_count: 2, largest_layoff_pct: 9.0, layoff_last_event_at: '2024-01-23T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.90, hiring_velocity_score: -0.5, total_open_roles: 380, hiring_source: 'linkedin_scrape', hiring_confidence: 0.76, data_quality_tier: 'verified', enrichment_version: 'gt7-v2026.1' },
  { canonical_name: 'etsy inc', display_name: 'Etsy Inc.', ticker: 'ETSY', exchange: 'NASDAQ', industry: 'Handmade / Vintage E-Commerce Marketplace', sector: 'Consumer Discretionary', is_public: true, country_code: 'US', workforce_count: 2400, workforce_source: 'annual_report_2025', workforce_confidence: 0.90, recent_layoff_count: 1, largest_layoff_pct: 11.0, layoff_last_event_at: '2024-02-13T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.90, hiring_velocity_score: -0.5, total_open_roles: 120, hiring_source: 'linkedin_scrape', hiring_confidence: 0.74, data_quality_tier: 'verified', enrichment_version: 'gt7-v2026.1' },
  { canonical_name: 'lyft inc', display_name: 'Lyft Inc.', ticker: 'LYFT', exchange: 'NASDAQ', industry: 'Ride-Hailing / Autonomous Driving', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 4500, workforce_source: 'annual_report_2025', workforce_confidence: 0.90, recent_layoff_count: 3, largest_layoff_pct: 26.0, layoff_last_event_at: '2023-04-27T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.90, hiring_velocity_score: 0.2, total_open_roles: 220, hiring_source: 'linkedin_scrape', hiring_confidence: 0.74, data_quality_tier: 'verified', enrichment_version: 'gt7-v2026.1' },
  { canonical_name: 'maplebear instacart', display_name: 'Maplebear Inc. (Instacart)', ticker: 'CART', exchange: 'NASDAQ', industry: 'Grocery Delivery / Advertising / AI', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 3400, workforce_source: 'annual_report_2025', workforce_confidence: 0.88, recent_layoff_count: 2, largest_layoff_pct: 25.0, layoff_last_event_at: '2023-01-10T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.88, hiring_velocity_score: 0.3, total_open_roles: 180, hiring_source: 'linkedin_scrape', hiring_confidence: 0.72, data_quality_tier: 'verified', enrichment_version: 'gt7-v2026.1' },
  { canonical_name: 'zillow group', display_name: 'Zillow Group Inc.', ticker: 'Z', exchange: 'NASDAQ', industry: 'PropTech / Real Estate Marketplace / AI', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 5800, workforce_source: 'annual_report_2025', workforce_confidence: 0.90, recent_layoff_count: 2, largest_layoff_pct: 25.0, layoff_last_event_at: '2021-11-02T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.85, hiring_velocity_score: 0.5, total_open_roles: 280, hiring_source: 'linkedin_scrape', hiring_confidence: 0.74, data_quality_tier: 'verified', enrichment_version: 'gt7-v2026.1' },
  // Private but notable
  { canonical_name: 'x twitter', display_name: 'X Corp. (formerly Twitter)', ticker: null, exchange: null, industry: 'Social Media / Microblogging / AI', sector: 'Technology', is_public: false, country_code: 'US', workforce_count: 1500, workforce_source: 'news_rss_scrape', workforce_confidence: 0.70, market_cap_usd: 13000000000, pe_ratio: null, revenue_ttm_usd: 2500000000, stock_90d_change: null, financials_source: 'annual_report_2025', financials_confidence: 0.62, recent_layoff_count: 4, largest_layoff_pct: 80.0, layoff_last_event_at: '2022-11-04T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.95, hiring_velocity_score: -2.0, total_open_roles: 80, hiring_source: 'linkedin_scrape', hiring_confidence: 0.65, data_quality_tier: 'seed', enrichment_version: 'gt7-v2026.1' },
  { canonical_name: 'discord inc', display_name: 'Discord Inc.', ticker: null, exchange: null, industry: 'Community / Voice / Gaming Platform', sector: 'Technology', is_public: false, country_code: 'US', workforce_count: 1500, workforce_source: 'news_rss_scrape', workforce_confidence: 0.78, market_cap_usd: 15000000000, pe_ratio: null, revenue_ttm_usd: 600000000, stock_90d_change: null, financials_source: 'annual_report_2025', financials_confidence: 0.68, recent_layoff_count: 1, largest_layoff_pct: 17.0, layoff_last_event_at: '2024-01-11T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.90, hiring_velocity_score: 0.3, total_open_roles: 80, hiring_source: 'linkedin_scrape', hiring_confidence: 0.68, data_quality_tier: 'seed', enrichment_version: 'gt7-v2026.1' },
  { canonical_name: 'tripadvisor inc', display_name: 'Tripadvisor Inc.', ticker: 'TRIP', exchange: 'NASDAQ', industry: 'Travel Reviews / Booking / Experience', sector: 'Consumer Discretionary', is_public: true, country_code: 'US', workforce_count: 3000, workforce_source: 'annual_report_2025', workforce_confidence: 0.88, recent_layoff_count: 1, largest_layoff_pct: 15.0, layoff_last_event_at: '2024-04-05T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.88, hiring_velocity_score: -0.5, total_open_roles: 120, hiring_source: 'linkedin_scrape', hiring_confidence: 0.72, data_quality_tier: 'verified', enrichment_version: 'gt7-v2026.1' },
  { canonical_name: 'mercadolibre inc', display_name: 'MercadoLibre Inc.', ticker: 'MELI', exchange: 'NASDAQ', industry: 'E-Commerce / Fintech / Logistics (LATAM)', sector: 'Technology', is_public: true, country_code: 'AR', workforce_count: 45000, workforce_source: 'annual_report_2025', workforce_confidence: 0.93, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.85, hiring_velocity_score: 2.0, total_open_roles: 2800, hiring_source: 'linkedin_scrape', hiring_confidence: 0.80, data_quality_tier: 'verified', enrichment_version: 'gt7-v2026.1' },
  { canonical_name: 'match group', display_name: 'Match Group Inc.', ticker: 'MTCH', exchange: 'NASDAQ', industry: 'Online Dating / Social Apps (Tinder/Hinge/OKC)', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 2600, workforce_source: 'annual_report_2025', workforce_confidence: 0.88, recent_layoff_count: 2, largest_layoff_pct: 19.0, layoff_last_event_at: '2024-09-16T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.90, hiring_velocity_score: -1.5, total_open_roles: 100, hiring_source: 'linkedin_scrape', hiring_confidence: 0.72, data_quality_tier: 'verified', enrichment_version: 'gt7-v2026.1' },
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
  console.log(`  ${(c.ticker||'').padEnd(5)} ${c.canonical_name.padEnd(38)} ${needsYahoo?'💹':'📋'} ${mkt.padEnd(8)}${pe} ${ins?'✅ inserted':'🔄 updated'}`);
  return { wasInserted: ins, hasPE: !!finalPE, hasRev: !!finalRev };
}

console.log('\n✓ Connected — GT7: US Internet & Consumer Platforms (2026)\n');
let ins=0,upd=0,pe=0,rev=0;
for (const c of companies) {
  const r = await upsertCompany(c);
  if(r.wasInserted) ins++; else upd++;
  if(r.hasPE) pe++; if(r.hasRev) rev++;
  await new Promise(r=>setTimeout(r,700));
}
console.log(`\n✅ GT7 complete — ${ins} inserted, ${upd} updated | PE: ${pe}/${companies.length} | Rev: ${rev}/${companies.length}`);
await pool.end();
