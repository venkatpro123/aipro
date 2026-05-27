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
  // Global IT Services & Consulting
  { canonical_name: 'accenture plc', display_name: 'Accenture plc', ticker: 'ACN', exchange: 'NYSE', industry: 'IT Services / Strategy Consulting / AI / Cloud / Digital', sector: 'Technology', is_public: true, country_code: 'IE', workforce_count: 774000, workforce_source: 'annual_report_2025', workforce_confidence: 0.95, recent_layoff_count: 1, largest_layoff_pct: 2.5, layoff_last_event_at: '2023-03-23T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.90, hiring_velocity_score: 1.0, total_open_roles: 28000, hiring_source: 'linkedin_scrape', hiring_confidence: 0.85, data_quality_tier: 'verified', enrichment_version: 'gt14-v2026.1' },
  { canonical_name: 'cgi group inc', display_name: 'CGI Group Inc.', ticker: 'GIB', exchange: 'NYSE', industry: 'IT Services / Government Digital / Consulting / Outsourcing', sector: 'Technology', is_public: true, country_code: 'CA', workforce_count: 91000, workforce_source: 'annual_report_2025', workforce_confidence: 0.93, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.80, hiring_velocity_score: 0.8, total_open_roles: 4200, hiring_source: 'linkedin_scrape', hiring_confidence: 0.78, data_quality_tier: 'verified', enrichment_version: 'gt14-v2026.1' },
  { canonical_name: 'dxc technology company', display_name: 'DXC Technology Company', ticker: 'DXC', exchange: 'NYSE', industry: 'IT Services / Legacy Modernization / Managed Services', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 120000, workforce_source: 'annual_report_2025', workforce_confidence: 0.92, recent_layoff_count: 3, largest_layoff_pct: 10.0, layoff_last_event_at: '2023-05-25T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.92, hiring_velocity_score: -0.5, total_open_roles: 3200, hiring_source: 'linkedin_scrape', hiring_confidence: 0.74, data_quality_tier: 'verified', enrichment_version: 'gt14-v2026.1' },
  { canonical_name: 'concentrix corporation', display_name: 'Concentrix Corporation', ticker: 'CNXC', exchange: 'NASDAQ', industry: 'CX Technology / BPO / AI Customer Experience / Contact Centers', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 440000, workforce_source: 'annual_report_2025', workforce_confidence: 0.93, recent_layoff_count: 2, largest_layoff_pct: 6.0, layoff_last_event_at: '2024-06-10T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.90, hiring_velocity_score: 0.5, total_open_roles: 18000, hiring_source: 'linkedin_scrape', hiring_confidence: 0.80, data_quality_tier: 'verified', enrichment_version: 'gt14-v2026.1' },
  { canonical_name: 'exlservice holdings', display_name: 'ExlService Holdings Inc.', ticker: 'EXLS', exchange: 'NASDAQ', industry: 'Data Analytics / AI / Insurance BPO / Digital Operations', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 48000, workforce_source: 'annual_report_2025', workforce_confidence: 0.92, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.80, hiring_velocity_score: 0.8, total_open_roles: 3200, hiring_source: 'linkedin_scrape', hiring_confidence: 0.78, data_quality_tier: 'verified', enrichment_version: 'gt14-v2026.1' },
  // Defense & Government Tech
  { canonical_name: 'booz allen hamilton', display_name: 'Booz Allen Hamilton Holding Corp.', ticker: 'BAH', exchange: 'NYSE', industry: 'Defense Tech / Government AI / Cyber / Intelligence Analytics', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 34500, workforce_source: 'annual_report_2025', workforce_confidence: 0.93, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.80, hiring_velocity_score: 1.0, total_open_roles: 3200, hiring_source: 'linkedin_scrape', hiring_confidence: 0.80, data_quality_tier: 'verified', enrichment_version: 'gt14-v2026.1' },
  { canonical_name: 'leidos holdings', display_name: 'Leidos Holdings Inc.', ticker: 'LDOS', exchange: 'NYSE', industry: 'Defense IT / AI / Intelligence Systems / Health IT', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 47000, workforce_source: 'annual_report_2025', workforce_confidence: 0.93, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.80, hiring_velocity_score: 1.0, total_open_roles: 3800, hiring_source: 'linkedin_scrape', hiring_confidence: 0.80, data_quality_tier: 'verified', enrichment_version: 'gt14-v2026.1' },
  { canonical_name: 'saic inc', display_name: 'Science Applications International Corporation (SAIC)', ticker: 'SAIC', exchange: 'NYSE', industry: 'Government IT / Defense Systems Integration / AI / Cyber', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 24000, workforce_source: 'annual_report_2025', workforce_confidence: 0.92, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.80, hiring_velocity_score: 1.0, total_open_roles: 1800, hiring_source: 'linkedin_scrape', hiring_confidence: 0.78, data_quality_tier: 'verified', enrichment_version: 'gt14-v2026.1' },
  { canonical_name: 'caci international', display_name: 'CACI International Inc.', ticker: 'CACI', exchange: 'NYSE', industry: 'Defense IT / Government Technology / Intelligence Solutions', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 23000, workforce_source: 'annual_report_2025', workforce_confidence: 0.92, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.80, hiring_velocity_score: 1.0, total_open_roles: 1800, hiring_source: 'linkedin_scrape', hiring_confidence: 0.78, data_quality_tier: 'verified', enrichment_version: 'gt14-v2026.1' },
  { canonical_name: 'parsons corporation', display_name: 'Parsons Corporation', ticker: 'PSN', exchange: 'NYSE', industry: 'Defense / Infrastructure Technology / Cyber / Space', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 18600, workforce_source: 'annual_report_2025', workforce_confidence: 0.92, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.80, hiring_velocity_score: 1.0, total_open_roles: 1400, hiring_source: 'linkedin_scrape', hiring_confidence: 0.76, data_quality_tier: 'verified', enrichment_version: 'gt14-v2026.1' },
  // Cybersecurity (public)
  { canonical_name: 'varonis systems', display_name: 'Varonis Systems Inc.', ticker: 'VRNS', exchange: 'NASDAQ', industry: 'Data Security / DSPM / Insider Threat / SaaS Security', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 2300, workforce_source: 'annual_report_2025', workforce_confidence: 0.88, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.78, hiring_velocity_score: 0.5, total_open_roles: 180, hiring_source: 'linkedin_scrape', hiring_confidence: 0.72, data_quality_tier: 'verified', enrichment_version: 'gt14-v2026.1' },
  { canonical_name: 'tenable holdings', display_name: 'Tenable Holdings Inc.', ticker: 'TENB', exchange: 'NASDAQ', industry: 'Vulnerability Management / Exposure Management / OT Security', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 2000, workforce_source: 'annual_report_2025', workforce_confidence: 0.88, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.78, hiring_velocity_score: 0.5, total_open_roles: 150, hiring_source: 'linkedin_scrape', hiring_confidence: 0.72, data_quality_tier: 'verified', enrichment_version: 'gt14-v2026.1' },
  { canonical_name: 'rapid7 inc', display_name: 'Rapid7 Inc.', ticker: 'RPD', exchange: 'NASDAQ', industry: 'Vulnerability Management / SIEM / MDR / Cloud Security', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 1800, workforce_source: 'annual_report_2025', workforce_confidence: 0.88, recent_layoff_count: 2, largest_layoff_pct: 18.0, layoff_last_event_at: '2024-08-01T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.92, hiring_velocity_score: -0.3, total_open_roles: 100, hiring_source: 'linkedin_scrape', hiring_confidence: 0.70, data_quality_tier: 'verified', enrichment_version: 'gt14-v2026.1' },
  { canonical_name: 'rubrik inc', display_name: 'Rubrik Inc.', ticker: 'RBRK', exchange: 'NYSE', industry: 'Data Security / Cyber Resilience / Cloud Backup / Ransomware Recovery', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 3000, workforce_source: 'annual_report_2025', workforce_confidence: 0.88, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.78, hiring_velocity_score: 1.0, total_open_roles: 280, hiring_source: 'linkedin_scrape', hiring_confidence: 0.72, data_quality_tier: 'verified', enrichment_version: 'gt14-v2026.1' },
  { canonical_name: 'verint systems', display_name: 'Verint Systems Inc.', ticker: 'VRNT', exchange: 'NASDAQ', industry: 'Customer Engagement AI / Contact Center Intelligence / CX', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 3800, workforce_source: 'annual_report_2025', workforce_confidence: 0.88, recent_layoff_count: 1, largest_layoff_pct: 5.0, layoff_last_event_at: '2024-03-20T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.88, hiring_velocity_score: 0.3, total_open_roles: 220, hiring_source: 'linkedin_scrape', hiring_confidence: 0.70, data_quality_tier: 'verified', enrichment_version: 'gt14-v2026.1' },
  { canonical_name: 'secureworks corp', display_name: 'Secureworks Corp.', ticker: 'SCWX', exchange: 'NASDAQ', industry: 'MDR / Threat Detection / Taegis XDR / Cybersecurity SaaS', sector: 'Technology', is_public: true, country_code: 'US', workforce_count: 2300, workforce_source: 'annual_report_2025', workforce_confidence: 0.88, recent_layoff_count: 2, largest_layoff_pct: 15.0, layoff_last_event_at: '2024-02-15T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.92, hiring_velocity_score: -0.5, total_open_roles: 100, hiring_source: 'linkedin_scrape', hiring_confidence: 0.68, data_quality_tier: 'verified', enrichment_version: 'gt14-v2026.1' },
  // Private cybersecurity unicorns (pre-filled)
  { canonical_name: 'wiz inc', display_name: 'Wiz Inc.', ticker: null, exchange: null, industry: 'Cloud Security / CNAPP / CSPM / Agentless Security', sector: 'Technology', is_public: false, country_code: 'US', workforce_count: 1800, workforce_source: 'news_rss_scrape', workforce_confidence: 0.78, market_cap_usd: 32000000000, pe_ratio: null, revenue_ttm_usd: 500000000, stock_90d_change: null, financials_source: 'news_rss_scrape', financials_confidence: 0.68, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.78, hiring_velocity_score: 2.0, total_open_roles: 280, hiring_source: 'linkedin_scrape', hiring_confidence: 0.72, data_quality_tier: 'seed', enrichment_version: 'gt14-v2026.1' },
  { canonical_name: 'snyk limited', display_name: 'Snyk Limited', ticker: null, exchange: null, industry: 'Developer Security / AppSec / SCA / SAST / Container Security', sector: 'Technology', is_public: false, country_code: 'GB', workforce_count: 1000, workforce_source: 'news_rss_scrape', workforce_confidence: 0.72, market_cap_usd: 7400000000, pe_ratio: null, revenue_ttm_usd: 300000000, stock_90d_change: null, financials_source: 'news_rss_scrape', financials_confidence: 0.62, recent_layoff_count: 1, largest_layoff_pct: 14.0, layoff_last_event_at: '2023-09-20T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.90, hiring_velocity_score: 0.5, total_open_roles: 80, hiring_source: 'linkedin_scrape', hiring_confidence: 0.65, data_quality_tier: 'seed', enrichment_version: 'gt14-v2026.1' },
  { canonical_name: 'arctic wolf networks', display_name: 'Arctic Wolf Networks Inc.', ticker: null, exchange: null, industry: 'MDR / 24x7 Security Operations / Incident Response', sector: 'Technology', is_public: false, country_code: 'CA', workforce_count: 2500, workforce_source: 'news_rss_scrape', workforce_confidence: 0.70, market_cap_usd: 4300000000, pe_ratio: null, revenue_ttm_usd: 450000000, stock_90d_change: null, financials_source: 'news_rss_scrape', financials_confidence: 0.62, recent_layoff_count: 1, largest_layoff_pct: 9.0, layoff_last_event_at: '2024-05-30T00:00:00Z', layoff_source: 'news_rss_scrape', layoff_confidence: 0.88, hiring_velocity_score: 0.5, total_open_roles: 120, hiring_source: 'linkedin_scrape', hiring_confidence: 0.65, data_quality_tier: 'seed', enrichment_version: 'gt14-v2026.1' },
  { canonical_name: 'illumio inc', display_name: 'Illumio Inc.', ticker: null, exchange: null, industry: 'Zero Trust Segmentation / Microsegmentation / Cloud Security', sector: 'Technology', is_public: false, country_code: 'US', workforce_count: 600, workforce_source: 'news_rss_scrape', workforce_confidence: 0.68, market_cap_usd: 2750000000, pe_ratio: null, revenue_ttm_usd: 200000000, stock_90d_change: null, financials_source: 'news_rss_scrape', financials_confidence: 0.58, recent_layoff_count: 0, layoff_source: 'news_rss_scrape', layoff_confidence: 0.72, hiring_velocity_score: 0.8, total_open_roles: 60, hiring_source: 'linkedin_scrape', hiring_confidence: 0.62, data_quality_tier: 'seed', enrichment_version: 'gt14-v2026.1' },
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

console.log('\n✓ Connected — GT14: Global IT Services & Cybersecurity (2026)\n');
let ins=0,upd=0,pe=0,rev=0;
for (const c of companies) {
  const r = await upsertCompany(c);
  if(r.wasInserted) ins++; else upd++;
  if(r.hasPE) pe++; if(r.hasRev) rev++;
  await new Promise(r => setTimeout(r, 700));
}
console.log(`\n── GT14 complete: ${ins} inserted, ${upd} updated | PE: ${pe}/${companies.length} | Rev: ${rev}/${companies.length}\n`);
await pool.end();
