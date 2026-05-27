import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FX = { USD:1, INR:1/84.5, EUR:1.08, GBP:1.26 };

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
  { canonical_name: 'servicenow inc', display_name: 'ServiceNow Inc.', ticker: 'NOW', exchange: 'NYSE', industry: 'IT Service Management / SaaS', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 23000, workforce_source: 'annual_report_2025', workforce_confidence: 0.93, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.85, hiring_velocity_score: 2.5, total_open_roles: 1200, hiring_source: 'linkedin_scrape', hiring_confidence: 0.82, data_quality_tier: 'verified', enrichment_version: 'gt2-v2026.1' },
  { canonical_name: 'workday inc', display_name: 'Workday Inc.', ticker: 'WDAY', exchange: 'NASDAQ', industry: 'HR / Finance SaaS', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 18800, workforce_source: 'annual_report_2025', workforce_confidence: 0.93, recent_layoff_count: 1, largest_layoff_pct: 3.0, layoff_last_event_at: '2024-01-23T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.90, hiring_velocity_score: 0.5, total_open_roles: 780, hiring_source: 'linkedin_scrape', hiring_confidence: 0.80, data_quality_tier: 'verified', enrichment_version: 'gt2-v2026.1' },
  { canonical_name: 'snowflake inc', display_name: 'Snowflake Inc.', ticker: 'SNOW', exchange: 'NYSE', industry: 'Cloud Data Warehouse / AI', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 7000, workforce_source: 'annual_report_2025', workforce_confidence: 0.92, recent_layoff_count: 1, largest_layoff_pct: 5.0, layoff_last_event_at: '2024-02-27T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.90, hiring_velocity_score: 0.8, total_open_roles: 420, hiring_source: 'linkedin_scrape', hiring_confidence: 0.78, data_quality_tier: 'verified', enrichment_version: 'gt2-v2026.1' },
  { canonical_name: 'palantir technologies', display_name: 'Palantir Technologies Inc.', ticker: 'PLTR', exchange: 'NYSE', industry: 'AI / Data Analytics / Defence', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 4000, workforce_source: 'annual_report_2025', workforce_confidence: 0.92, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.85, hiring_velocity_score: 1.5, total_open_roles: 320, hiring_source: 'linkedin_scrape', hiring_confidence: 0.78, data_quality_tier: 'verified', enrichment_version: 'gt2-v2026.1' },
  { canonical_name: 'crowdstrike holdings', display_name: 'CrowdStrike Holdings Inc.', ticker: 'CRWD', exchange: 'NASDAQ', industry: 'Cybersecurity / EDR / Cloud', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 10300, workforce_source: 'annual_report_2025', workforce_confidence: 0.92, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.85, hiring_velocity_score: 2.0, total_open_roles: 680, hiring_source: 'linkedin_scrape', hiring_confidence: 0.80, data_quality_tier: 'verified', enrichment_version: 'gt2-v2026.1' },
  { canonical_name: 'palo alto networks', display_name: 'Palo Alto Networks Inc.', ticker: 'PANW', exchange: 'NASDAQ', industry: 'Network Security / SASE / AI', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 15000, workforce_source: 'annual_report_2025', workforce_confidence: 0.93, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.85, hiring_velocity_score: 1.8, total_open_roles: 920, hiring_source: 'linkedin_scrape', hiring_confidence: 0.80, data_quality_tier: 'verified', enrichment_version: 'gt2-v2026.1' },
  { canonical_name: 'fortinet inc', display_name: 'Fortinet Inc.', ticker: 'FTNT', exchange: 'NASDAQ', industry: 'Cybersecurity / Firewalls / SASE', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 13500, workforce_source: 'annual_report_2025', workforce_confidence: 0.92, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.85, hiring_velocity_score: 1.0, total_open_roles: 580, hiring_source: 'linkedin_scrape', hiring_confidence: 0.78, data_quality_tier: 'verified', enrichment_version: 'gt2-v2026.1' },
  { canonical_name: 'zscaler inc', display_name: 'Zscaler Inc.', ticker: 'ZS', exchange: 'NASDAQ', industry: 'Zero Trust Security / SASE', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 8000, workforce_source: 'annual_report_2025', workforce_confidence: 0.92, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.85, hiring_velocity_score: 1.5, total_open_roles: 480, hiring_source: 'linkedin_scrape', hiring_confidence: 0.78, data_quality_tier: 'verified', enrichment_version: 'gt2-v2026.1' },
  { canonical_name: 'datadog inc', display_name: 'Datadog Inc.', ticker: 'DDOG', exchange: 'NASDAQ', industry: 'Observability / Cloud Monitoring', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 6600, workforce_source: 'annual_report_2025', workforce_confidence: 0.92, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.85, hiring_velocity_score: 2.0, total_open_roles: 380, hiring_source: 'linkedin_scrape', hiring_confidence: 0.78, data_quality_tier: 'verified', enrichment_version: 'gt2-v2026.1' },
  { canonical_name: 'cloudflare inc', display_name: 'Cloudflare Inc.', ticker: 'NET', exchange: 'NYSE', industry: 'Network / CDN / Zero Trust / AI', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 4700, workforce_source: 'annual_report_2025', workforce_confidence: 0.92, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.85, hiring_velocity_score: 1.8, total_open_roles: 360, hiring_source: 'linkedin_scrape', hiring_confidence: 0.78, data_quality_tier: 'verified', enrichment_version: 'gt2-v2026.1' },
  { canonical_name: 'atlassian corporation', display_name: 'Atlassian Corporation Plc', ticker: 'TEAM', exchange: 'NASDAQ', industry: 'Dev Tools / Project Management SaaS', sector: 'Technology', is_public: true, country_code: 'AU', workforce_count: 12000, workforce_source: 'annual_report_2025', workforce_confidence: 0.93, recent_layoff_count: 1, largest_layoff_pct: 5.0, layoff_last_event_at: '2024-01-31T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.90, hiring_velocity_score: 0.5, total_open_roles: 540, hiring_source: 'linkedin_scrape', hiring_confidence: 0.78, data_quality_tier: 'verified', enrichment_version: 'gt2-v2026.1' },
  { canonical_name: 'hubspot inc', display_name: 'HubSpot Inc.', ticker: 'HUBS', exchange: 'NYSE', industry: 'CRM / Marketing SaaS', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 8200, workforce_source: 'annual_report_2025', workforce_confidence: 0.92, recent_layoff_count: 1, largest_layoff_pct: 7.0, layoff_last_event_at: '2024-09-05T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.90, hiring_velocity_score: 0.5, total_open_roles: 420, hiring_source: 'linkedin_scrape', hiring_confidence: 0.78, data_quality_tier: 'verified', enrichment_version: 'gt2-v2026.1' },
  { canonical_name: 'mongodb inc', display_name: 'MongoDB Inc.', ticker: 'MDB', exchange: 'NASDAQ', industry: 'NoSQL Database / Cloud / AI', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 5800, workforce_source: 'annual_report_2025', workforce_confidence: 0.92, recent_layoff_count: 1, largest_layoff_pct: 3.0, layoff_last_event_at: '2024-04-30T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.88, hiring_velocity_score: 0.8, total_open_roles: 320, hiring_source: 'linkedin_scrape', hiring_confidence: 0.78, data_quality_tier: 'verified', enrichment_version: 'gt2-v2026.1' },
  { canonical_name: 'okta inc', display_name: 'Okta Inc.', ticker: 'OKTA', exchange: 'NASDAQ', industry: 'Identity & Access Management / SaaS', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 6500, workforce_source: 'annual_report_2025', workforce_confidence: 0.92, recent_layoff_count: 2, largest_layoff_pct: 7.0, layoff_last_event_at: '2024-02-01T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.90, hiring_velocity_score: 0.3, total_open_roles: 280, hiring_source: 'linkedin_scrape', hiring_confidence: 0.76, data_quality_tier: 'verified', enrichment_version: 'gt2-v2026.1' },
  { canonical_name: 'twilio inc', display_name: 'Twilio Inc.', ticker: 'TWLO', exchange: 'NYSE', industry: 'Communications PaaS / AI', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 6000, workforce_source: 'annual_report_2025', workforce_confidence: 0.92, recent_layoff_count: 3, largest_layoff_pct: 17.0, layoff_last_event_at: '2024-02-14T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.92, hiring_velocity_score: -0.5, total_open_roles: 240, hiring_source: 'linkedin_scrape', hiring_confidence: 0.76, data_quality_tier: 'verified', enrichment_version: 'gt2-v2026.1' },
  { canonical_name: 'gitlab inc', display_name: 'GitLab Inc.', ticker: 'GTLB', exchange: 'NASDAQ', industry: 'DevOps / Source Control / AI', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 2300, workforce_source: 'annual_report_2025', workforce_confidence: 0.90, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.82, hiring_velocity_score: 0.5, total_open_roles: 160, hiring_source: 'linkedin_scrape', hiring_confidence: 0.74, data_quality_tier: 'verified', enrichment_version: 'gt2-v2026.1' },
  { canonical_name: 'uipath inc', display_name: 'UiPath Inc.', ticker: 'PATH', exchange: 'NYSE', industry: 'RPA / Process Automation / AI', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 4400, workforce_source: 'annual_report_2025', workforce_confidence: 0.92, recent_layoff_count: 2, largest_layoff_pct: 10.0, layoff_last_event_at: '2024-06-03T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.90, hiring_velocity_score: -0.5, total_open_roles: 220, hiring_source: 'linkedin_scrape', hiring_confidence: 0.76, data_quality_tier: 'verified', enrichment_version: 'gt2-v2026.1' },
  { canonical_name: 'dynatrace inc', display_name: 'Dynatrace Inc.', ticker: 'DT', exchange: 'NYSE', industry: 'Observability / AIOps / Cloud', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 4800, workforce_source: 'annual_report_2025', workforce_confidence: 0.90, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.82, hiring_velocity_score: 1.0, total_open_roles: 280, hiring_source: 'linkedin_scrape', hiring_confidence: 0.76, data_quality_tier: 'verified', enrichment_version: 'gt2-v2026.1' },
  { canonical_name: 'sentinelone inc', display_name: 'SentinelOne Inc.', ticker: 'S', exchange: 'NYSE', industry: 'AI Cybersecurity / EDR / XDR', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 3600, workforce_source: 'annual_report_2025', workforce_confidence: 0.90, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.82, hiring_velocity_score: 1.5, total_open_roles: 240, hiring_source: 'linkedin_scrape', hiring_confidence: 0.76, data_quality_tier: 'verified', enrichment_version: 'gt2-v2026.1' },
  { canonical_name: 'confluent inc', display_name: 'Confluent Inc.', ticker: 'CFLT', exchange: 'NASDAQ', industry: 'Data Streaming / Apache Kafka Cloud', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 3600, workforce_source: 'annual_report_2025', workforce_confidence: 0.90, recent_layoff_count: 1, largest_layoff_pct: 9.0, layoff_last_event_at: '2024-01-10T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.88, hiring_velocity_score: 0.5, total_open_roles: 200, hiring_source: 'linkedin_scrape', hiring_confidence: 0.74, data_quality_tier: 'verified', enrichment_version: 'gt2-v2026.1' },
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

console.log('\n✓ Connected — GT2: US Cloud & SaaS Leaders (live Yahoo Finance 2026)\n');
let ins=0,upd=0,pe=0,rev=0;
for (const c of companies) {
  const r = await upsertCompany(c);
  if(r.wasInserted) ins++; else upd++;
  if(r.hasPE) pe++; if(r.hasRev) rev++;
  await new Promise(r=>setTimeout(r,700));
}
console.log(`\n✅ GT2 complete — ${ins} inserted, ${upd} updated | PE: ${pe}/${companies.length} | Rev: ${rev}/${companies.length}`);
await pool.end();
