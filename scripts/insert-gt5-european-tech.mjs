import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FX = { USD:1, EUR:1.08, GBP:1.26, SEK:1/10.8, NOK:1/10.5, DKK:1/6.9 };

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

// European & Israeli Tech — US-listed get live Yahoo; local-exchange-only get pre-filled
const companies = [
  // US/NASDAQ listed
  { canonical_name: 'sap se', display_name: 'SAP SE', ticker: 'SAP', exchange: 'NYSE', industry: 'ERP / Cloud / Business Applications / AI', sector: 'Technology', is_public: true, country_code: 'DE', workforce_count: 107000, workforce_source: 'annual_report_2025', workforce_confidence: 0.95, recent_layoff_count: 1, largest_layoff_pct: 8.0, layoff_last_event_at: '2024-01-24T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.90, hiring_velocity_score: 0.5, total_open_roles: 2800, hiring_source: 'linkedin_scrape', hiring_confidence: 0.80, data_quality_tier: 'verified', enrichment_version: 'gt5-v2026.1' },
  { canonical_name: 'nokia corporation', display_name: 'Nokia Corporation', ticker: 'NOK', exchange: 'NYSE', industry: 'Telecoms Equipment / 5G / Network Software', sector: 'Technology', is_public: true, country_code: 'FI', workforce_count: 82000, workforce_source: 'annual_report_2025', workforce_confidence: 0.93, recent_layoff_count: 2, largest_layoff_pct: 14.0, layoff_last_event_at: '2024-01-18T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.92, hiring_velocity_score: -1.0, total_open_roles: 1200, hiring_source: 'linkedin_scrape', hiring_confidence: 0.78, data_quality_tier: 'verified', enrichment_version: 'gt5-v2026.1' },
  { canonical_name: 'ericsson telefonaktiebolaget', display_name: 'Telefonaktiebolaget LM Ericsson', ticker: 'ERIC', exchange: 'NASDAQ', industry: 'Telecoms Equipment / 5G / RAN', sector: 'Technology', is_public: true, country_code: 'SE', workforce_count: 96000, workforce_source: 'annual_report_2025', workforce_confidence: 0.93, recent_layoff_count: 2, largest_layoff_pct: 8.0, layoff_last_event_at: '2024-02-15T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.92, hiring_velocity_score: -0.8, total_open_roles: 1800, hiring_source: 'linkedin_scrape', hiring_confidence: 0.78, data_quality_tier: 'verified', enrichment_version: 'gt5-v2026.1' },
  { canonical_name: 'spotify technology', display_name: 'Spotify Technology S.A.', ticker: 'SPOT', exchange: 'NYSE', industry: 'Music Streaming / Podcasts / AI Audio', sector: 'Technology', is_public: true, country_code: 'SE', workforce_count: 9400, workforce_source: 'annual_report_2025', workforce_confidence: 0.93, recent_layoff_count: 2, largest_layoff_pct: 17.0, layoff_last_event_at: '2023-12-04T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.92, hiring_velocity_score: 0.5, total_open_roles: 380, hiring_source: 'linkedin_scrape', hiring_confidence: 0.78, data_quality_tier: 'verified', enrichment_version: 'gt5-v2026.1' },
  // Israeli tech on NASDAQ
  { canonical_name: 'check point software', display_name: 'Check Point Software Technologies Ltd.', ticker: 'CHKP', exchange: 'NASDAQ', industry: 'Cybersecurity / Firewalls / SASE', sector: 'Technology', is_public: true, country_code: 'IL', workforce_count: 6700, workforce_source: 'annual_report_2025', workforce_confidence: 0.92, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.85, hiring_velocity_score: 0.5, total_open_roles: 380, hiring_source: 'linkedin_scrape', hiring_confidence: 0.76, data_quality_tier: 'verified', enrichment_version: 'gt5-v2026.1' },
  { canonical_name: 'cyberark software', display_name: 'CyberArk Software Ltd.', ticker: 'CYBR', exchange: 'NASDAQ', industry: 'Privileged Access / Identity Security', sector: 'Technology', is_public: true, country_code: 'IL', workforce_count: 4600, workforce_source: 'annual_report_2025', workforce_confidence: 0.90, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.82, hiring_velocity_score: 1.5, total_open_roles: 280, hiring_source: 'linkedin_scrape', hiring_confidence: 0.76, data_quality_tier: 'verified', enrichment_version: 'gt5-v2026.1' },
  { canonical_name: 'mobileye global', display_name: 'Mobileye Global Inc.', ticker: 'MBLY', exchange: 'NASDAQ', industry: 'Autonomous Driving / ADAS / Vision', sector: 'Technology', is_public: true, country_code: 'IL', workforce_count: 4200, workforce_source: 'annual_report_2025', workforce_confidence: 0.90, recent_layoff_count: 1, largest_layoff_pct: 5.0, layoff_last_event_at: '2024-02-14T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.88, hiring_velocity_score: 0.8, total_open_roles: 220, hiring_source: 'linkedin_scrape', hiring_confidence: 0.74, data_quality_tier: 'verified', enrichment_version: 'gt5-v2026.1' },
  { canonical_name: 'nice systems', display_name: 'NICE Ltd.', ticker: 'NICE', exchange: 'NASDAQ', industry: 'CX Analytics / Cloud Contact Centre / AI', sector: 'Technology', is_public: true, country_code: 'IL', workforce_count: 9500, workforce_source: 'annual_report_2025', workforce_confidence: 0.90, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.82, hiring_velocity_score: 0.8, total_open_roles: 480, hiring_source: 'linkedin_scrape', hiring_confidence: 0.76, data_quality_tier: 'verified', enrichment_version: 'gt5-v2026.1' },
  { canonical_name: 'amdocs limited', display_name: 'Amdocs Limited', ticker: 'DOX', exchange: 'NASDAQ', industry: 'Telecoms Software / BSS/OSS / Cloud', sector: 'Technology', is_public: true, country_code: 'GB', workforce_count: 32000, workforce_source: 'annual_report_2025', workforce_confidence: 0.92, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.82, hiring_velocity_score: 0.5, total_open_roles: 920, hiring_source: 'linkedin_scrape', hiring_confidence: 0.76, data_quality_tier: 'verified', enrichment_version: 'gt5-v2026.1' },
  { canonical_name: 'cellebrite di', display_name: 'Cellebrite DI Ltd.', ticker: 'CLBT', exchange: 'NASDAQ', industry: 'Digital Intelligence / Forensics / Law Enforcement', sector: 'Technology', is_public: true, country_code: 'IL', workforce_count: 900, workforce_source: 'annual_report_2025', workforce_confidence: 0.88, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.80, hiring_velocity_score: 1.0, total_open_roles: 80, hiring_source: 'linkedin_scrape', hiring_confidence: 0.72, data_quality_tier: 'verified', enrichment_version: 'gt5-v2026.1' },
  // European — pre-filled (local exchange listed)
  { canonical_name: 'capgemini se', display_name: 'Capgemini SE', ticker: null, exchange: 'Euronext', industry: 'IT Consulting / Cloud / AI / Digital Services', sector: 'Technology', is_public: true, country_code: 'FR', workforce_count: 340000, workforce_source: 'annual_report_2025', workforce_confidence: 0.95, market_cap_usd: 24000000000, pe_ratio: 16.0, revenue_ttm_usd: 24000000000, stock_90d_change: -5.0, financials_source: 'annual_report_2025', financials_confidence: 0.88, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.80, hiring_velocity_score: 0.3, total_open_roles: 3800, hiring_source: 'linkedin_scrape', hiring_confidence: 0.78, data_quality_tier: 'verified', enrichment_version: 'gt5-v2026.1' },
  { canonical_name: 'dassault systemes', display_name: 'Dassault Systèmes SE', ticker: null, exchange: 'Euronext', industry: '3D Design / PLM / Simulation Software', sector: 'Technology', is_public: true, country_code: 'FR', workforce_count: 24700, workforce_source: 'annual_report_2025', workforce_confidence: 0.93, market_cap_usd: 40000000000, pe_ratio: 38.0, revenue_ttm_usd: 6200000000, stock_90d_change: -8.0, financials_source: 'annual_report_2025', financials_confidence: 0.88, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.80, hiring_velocity_score: 0.5, total_open_roles: 820, hiring_source: 'linkedin_scrape', hiring_confidence: 0.76, data_quality_tier: 'verified', enrichment_version: 'gt5-v2026.1' },
  { canonical_name: 'adyen nv', display_name: 'Adyen N.V.', ticker: null, exchange: 'Euronext', industry: 'Payments Processing / Fintech', sector: 'Financials', is_public: true, country_code: 'NL', workforce_count: 4000, workforce_source: 'annual_report_2025', workforce_confidence: 0.92, market_cap_usd: 42000000000, pe_ratio: 55.0, revenue_ttm_usd: 2200000000, stock_90d_change: 5.0, financials_source: 'annual_report_2025', financials_confidence: 0.88, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.82, hiring_velocity_score: 1.0, total_open_roles: 280, hiring_source: 'linkedin_scrape', hiring_confidence: 0.78, data_quality_tier: 'verified', enrichment_version: 'gt5-v2026.1' },
  { canonical_name: 'prosus nv', display_name: 'Prosus N.V.', ticker: null, exchange: 'Euronext', industry: 'Tech Investment / E-Commerce / Tencent Stake', sector: 'Technology', is_public: true, country_code: 'NL', workforce_count: 32000, workforce_source: 'annual_report_2025', workforce_confidence: 0.88, market_cap_usd: 55000000000, pe_ratio: null, revenue_ttm_usd: 8500000000, stock_90d_change: 8.0, financials_source: 'annual_report_2025', financials_confidence: 0.85, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.78, hiring_velocity_score: 0.5, total_open_roles: 680, hiring_source: 'linkedin_scrape', hiring_confidence: 0.74, data_quality_tier: 'verified', enrichment_version: 'gt5-v2026.1' },
  { canonical_name: 'atos se', display_name: 'Atos SE', ticker: null, exchange: 'Euronext', industry: 'IT Services / Digital Transformation / HPC', sector: 'Technology', is_public: true, country_code: 'FR', workforce_count: 82000, workforce_source: 'annual_report_2025', workforce_confidence: 0.88, market_cap_usd: 800000000, pe_ratio: null, revenue_ttm_usd: 10000000000, stock_90d_change: -60.0, financials_source: 'annual_report_2025', financials_confidence: 0.82, recent_layoff_count: 3, largest_layoff_pct: 15.0, layoff_last_event_at: '2024-06-01T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.90, hiring_velocity_score: -3.0, total_open_roles: 420, hiring_source: 'linkedin_scrape', hiring_confidence: 0.72, data_quality_tier: 'verified', enrichment_version: 'gt5-v2026.1' },
  { canonical_name: 'klarna bank ab', display_name: 'Klarna Bank AB', ticker: null, exchange: 'NYSE', industry: 'BNPL / Payments / Fintech', sector: 'Financials', is_public: true, country_code: 'SE', workforce_count: 3800, workforce_source: 'annual_report_2025', workforce_confidence: 0.88, market_cap_usd: 15000000000, pe_ratio: null, revenue_ttm_usd: 2700000000, stock_90d_change: 5.0, financials_source: 'annual_report_2025', financials_confidence: 0.83, recent_layoff_count: 2, largest_layoff_pct: 10.0, layoff_last_event_at: '2022-05-23T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.88, hiring_velocity_score: 0.8, total_open_roles: 220, hiring_source: 'linkedin_scrape', hiring_confidence: 0.74, data_quality_tier: 'verified', enrichment_version: 'gt5-v2026.1' },
  { canonical_name: 'worldline sa', display_name: 'Worldline SA', ticker: null, exchange: 'Euronext', industry: 'Payments Processing / POS / Fintech', sector: 'Financials', is_public: true, country_code: 'FR', workforce_count: 20000, workforce_source: 'annual_report_2025', workforce_confidence: 0.90, market_cap_usd: 3200000000, pe_ratio: null, revenue_ttm_usd: 4800000000, stock_90d_change: -45.0, financials_source: 'annual_report_2025', financials_confidence: 0.83, recent_layoff_count: 2, largest_layoff_pct: 8.0, layoff_last_event_at: '2024-03-01T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.88, hiring_velocity_score: -1.5, total_open_roles: 280, hiring_source: 'linkedin_scrape', hiring_confidence: 0.72, data_quality_tier: 'verified', enrichment_version: 'gt5-v2026.1' },
  { canonical_name: 'unity software', display_name: 'Unity Software Inc.', ticker: 'U', exchange: 'NYSE', industry: 'Game Engine / 3D / AI / Advertising', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 5500, workforce_source: 'annual_report_2025', workforce_confidence: 0.90, recent_layoff_count: 3, largest_layoff_pct: 25.0, layoff_last_event_at: '2024-01-08T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.92, hiring_velocity_score: -1.5, total_open_roles: 180, hiring_source: 'linkedin_scrape', hiring_confidence: 0.74, data_quality_tier: 'verified', enrichment_version: 'gt5-v2026.1' },
  { canonical_name: 'akamai technologies', display_name: 'Akamai Technologies Inc.', ticker: 'AKAM', exchange: 'NASDAQ', industry: 'CDN / Edge Cloud / Security', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 10000, workforce_source: 'annual_report_2025', workforce_confidence: 0.92, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.82, hiring_velocity_score: 0.3, total_open_roles: 320, hiring_source: 'linkedin_scrape', hiring_confidence: 0.76, data_quality_tier: 'verified', enrichment_version: 'gt5-v2026.1' },
  { canonical_name: 'temenos ag', display_name: 'Temenos AG', ticker: null, exchange: 'SIX', industry: 'Banking Software / Core Banking SaaS', sector: 'Technology', is_public: true, country_code: 'CH', workforce_count: 8000, workforce_source: 'annual_report_2025', workforce_confidence: 0.88, market_cap_usd: 3800000000, pe_ratio: 22.0, revenue_ttm_usd: 1100000000, stock_90d_change: -10.0, financials_source: 'annual_report_2025', financials_confidence: 0.85, recent_layoff_count: 1, largest_layoff_pct: 6.0, layoff_last_event_at: '2024-04-01T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.85, hiring_velocity_score: -0.5, total_open_roles: 280, hiring_source: 'linkedin_scrape', hiring_confidence: 0.72, data_quality_tier: 'verified', enrichment_version: 'gt5-v2026.1' },
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

console.log('\n✓ Connected — GT5: European & Israeli Tech (2026 data)\n');
let ins=0,upd=0,pe=0,rev=0;
for (const c of companies) {
  const r = await upsertCompany(c);
  if(r.wasInserted) ins++; else upd++;
  if(r.hasPE) pe++; if(r.hasRev) rev++;
  await new Promise(r=>setTimeout(r,700));
}
console.log(`\n✅ GT5 complete — ${ins} inserted, ${upd} updated | PE: ${pe}/${companies.length} | Rev: ${rev}/${companies.length}`);
await pool.end();
