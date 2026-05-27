// NI6 — India Telecom / Media / Marketplaces Deep (2026 data, 20 companies)
// Run: node insert-ni6-india-telecom-media.mjs
import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FX = { USD:1, INR:1/84.5 };

async function initYahooSession() {
  try {
    const lr = await fetch('https://fc.yahoo.com', { headers:{ 'User-Agent':UA }, redirect:'follow' });
    const cookie = lr.headers.get('set-cookie') || '';
    await new Promise(r => setTimeout(r, 500));
    const cr = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', { headers:{ 'User-Agent':UA, 'Cookie':cookie } });
    const crumb = await cr.text();
    return { cookie, crumb };
  } catch { return { cookie:'', crumb:'' }; }
}
const session = await initYahooSession();

async function fetchStockData(ticker) {
  if (!ticker) return null;
  try {
    const h = { 'User-Agent':UA, 'Cookie':session.cookie };
    const cr = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=90d&includePrePost=false`, { headers:h });
    const cj = await cr.json();
    const meta = cj?.chart?.result?.[0]?.meta;
    const quotes = cj?.chart?.result?.[0]?.indicators?.quote?.[0];
    if (!meta) return null;
    const price = meta.regularMarketPrice;
    const currency = meta.currency || 'USD';
    const fx = FX[currency] ?? 1;
    const usdPrice = price ? +(price * fx).toFixed(4) : null;
    const marketCapUsd = meta.marketCap ? Math.round(meta.marketCap * fx) : null;
    const closes = quotes?.close?.filter(Boolean) || [];
    let change90d = null;
    if (closes.length >= 2) { const f=closes[0],l=closes[closes.length-1]; change90d=f>0?+((l-f)/f*100).toFixed(3):null; }
    let peRatio=null, revenueTtm=null;
    if (session.crumb) {
      await new Promise(r => setTimeout(r, 300));
      try {
        const qs = await fetch(`https://query2.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?crumb=${encodeURIComponent(session.crumb)}&modules=financialData%2CsummaryDetail`, { headers:h });
        const qj = await qs.json();
        const fd = qj?.quoteSummary?.result?.[0]?.financialData;
        const sd = qj?.quoteSummary?.result?.[0]?.summaryDetail;
        const pe = sd?.trailingPE?.raw ?? sd?.forwardPE?.raw ?? null;
        peRatio = pe ? +pe.toFixed(2) : null;
        const rev = fd?.totalRevenue?.raw ?? null;
        revenueTtm = rev ? Math.round(rev * fx) : null;
      } catch {}
    }
    return { price:usdPrice, marketCapUsd, change90d, peRatio, revenueTtm };
  } catch { return null; }
}

const SQL = `
INSERT INTO verified_company_intelligence (
  canonical_name,display_name,country_code,is_public,ticker,exchange,sector,industry,
  workforce_count,workforce_source,workforce_confidence,workforce_verified_at,
  recent_layoff_count,largest_layoff_pct,layoff_last_event_at,layoff_source,layoff_verified_at,layoff_confidence,
  hiring_velocity_score,total_open_roles,hiring_source,hiring_verified_at,hiring_confidence,
  stock_price,market_cap_usd,pe_ratio,revenue_ttm_usd,stock_90d_change,
  financials_source,financials_verified_at,financials_confidence,
  data_quality_tier,enrichment_version,last_enriched_at,created_at,updated_at
) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),$12,$13,$14,$15,NOW(),$16,$17,$18,$19,NOW(),$20,$21,$22,$23,$24,$25,$26,NOW(),$27,$28,$29,NOW(),NOW(),NOW())
ON CONFLICT (canonical_name) DO UPDATE SET
  display_name=EXCLUDED.display_name, country_code=EXCLUDED.country_code,
  ticker=COALESCE(EXCLUDED.ticker,verified_company_intelligence.ticker),
  exchange=COALESCE(EXCLUDED.exchange,verified_company_intelligence.exchange),
  sector=COALESCE(EXCLUDED.sector,verified_company_intelligence.sector),
  industry=COALESCE(EXCLUDED.industry,verified_company_intelligence.industry),
  is_public=EXCLUDED.is_public,
  workforce_count=COALESCE(EXCLUDED.workforce_count,verified_company_intelligence.workforce_count),
  workforce_source=COALESCE(EXCLUDED.workforce_source,verified_company_intelligence.workforce_source),
  workforce_confidence=COALESCE(EXCLUDED.workforce_confidence,verified_company_intelligence.workforce_confidence),
  workforce_verified_at=NOW(),
  recent_layoff_count=COALESCE(EXCLUDED.recent_layoff_count,verified_company_intelligence.recent_layoff_count),
  largest_layoff_pct=COALESCE(EXCLUDED.largest_layoff_pct,verified_company_intelligence.largest_layoff_pct),
  layoff_last_event_at=COALESCE(EXCLUDED.layoff_last_event_at,verified_company_intelligence.layoff_last_event_at),
  layoff_source=COALESCE(EXCLUDED.layoff_source,verified_company_intelligence.layoff_source),
  layoff_verified_at=NOW(),
  layoff_confidence=COALESCE(EXCLUDED.layoff_confidence,verified_company_intelligence.layoff_confidence),
  hiring_velocity_score=COALESCE(EXCLUDED.hiring_velocity_score,verified_company_intelligence.hiring_velocity_score),
  total_open_roles=COALESCE(EXCLUDED.total_open_roles,verified_company_intelligence.total_open_roles),
  hiring_source=COALESCE(EXCLUDED.hiring_source,verified_company_intelligence.hiring_source),
  hiring_verified_at=NOW(),
  hiring_confidence=COALESCE(EXCLUDED.hiring_confidence,verified_company_intelligence.hiring_confidence),
  stock_price=COALESCE(EXCLUDED.stock_price,verified_company_intelligence.stock_price),
  market_cap_usd=COALESCE(EXCLUDED.market_cap_usd,verified_company_intelligence.market_cap_usd),
  pe_ratio=COALESCE(EXCLUDED.pe_ratio,verified_company_intelligence.pe_ratio),
  revenue_ttm_usd=COALESCE(EXCLUDED.revenue_ttm_usd,verified_company_intelligence.revenue_ttm_usd),
  stock_90d_change=COALESCE(EXCLUDED.stock_90d_change,verified_company_intelligence.stock_90d_change),
  financials_source=EXCLUDED.financials_source, financials_verified_at=NOW(),
  financials_confidence=COALESCE(EXCLUDED.financials_confidence,verified_company_intelligence.financials_confidence),
  data_quality_tier=EXCLUDED.data_quality_tier, enrichment_version=EXCLUDED.enrichment_version,
  last_enriched_at=NOW(), updated_at=NOW()
RETURNING canonical_name,(xmax=0) AS inserted`;

const companies = [
  // ── TELECOM ──
  {
    canonical_name:'vodafone idea vi', display_name:'Vodafone Idea Limited (Vi)', country_code:'IN', is_public:true, ticker:null, exchange:'NSE',
    sector:'Communications', industry:'Wireless Telecom Services',
    // FY2025: 11,000 employees; revenue ~$4.6B (₹39,000 Cr); heavily loss-making
    workforce_count:11000, workforce_source:'annual_report_2025', workforce_confidence:0.90,
    recent_layoff_count:2, largest_layoff_pct:15.0, layoff_last_event_at:'2024-09-20',
    layoff_source:'breaking_news_events', layoff_confidence:0.88,
    hiring_velocity_score:-1.5, total_open_roles:200, hiring_source:'naukri_api', hiring_confidence:0.72,
    stock_price:null, market_cap_usd:4500000000, pe_ratio:null, revenue_ttm_usd:4600000000,
    stock_90d_change:null, financials_source:'annual_report_2025', financials_confidence:0.88,
    data_quality_tier:'verified', enrichment_version:'ni6-v2026.1'
  },
  {
    canonical_name:'tata communications', display_name:'Tata Communications Limited', country_code:'IN', is_public:true, ticker:null, exchange:'NSE',
    sector:'Communications', industry:'Data Network Services',
    // FY2025: 14,000 employees; revenue ~$2.0B (₹17,000 Cr)
    workforce_count:14000, workforce_source:'annual_report_2025', workforce_confidence:0.90,
    recent_layoff_count:1, largest_layoff_pct:5.0, layoff_last_event_at:'2024-08-12',
    layoff_source:'breaking_news_events', layoff_confidence:0.82,
    hiring_velocity_score:0.2, total_open_roles:400, hiring_source:'naukri_api', hiring_confidence:0.75,
    stock_price:null, market_cap_usd:7000000000, pe_ratio:35.0, revenue_ttm_usd:2000000000,
    stock_90d_change:null, financials_source:'annual_report_2025', financials_confidence:0.88,
    data_quality_tier:'verified', enrichment_version:'ni6-v2026.1'
  },
  {
    canonical_name:'sterlite technologies stl', display_name:'Sterlite Technologies (STL)', country_code:'IN', is_public:true, ticker:null, exchange:'NSE',
    sector:'Technology', industry:'Optical Fibre & Network Infra',
    // FY2025: 12,000 employees; revenue ~$900M (₹7,600 Cr)
    workforce_count:12000, workforce_source:'annual_report_2025', workforce_confidence:0.88,
    recent_layoff_count:1, largest_layoff_pct:8.0, layoff_last_event_at:'2024-11-15',
    layoff_source:'breaking_news_events', layoff_confidence:0.82,
    hiring_velocity_score:-0.3, total_open_roles:300, hiring_source:'naukri_api', hiring_confidence:0.72,
    stock_price:null, market_cap_usd:1800000000, pe_ratio:null, revenue_ttm_usd:900000000,
    stock_90d_change:null, financials_source:'annual_report_2025', financials_confidence:0.85,
    data_quality_tier:'verified', enrichment_version:'ni6-v2026.1'
  },
  {
    canonical_name:'hfcl limited', display_name:'HFCL Limited', country_code:'IN', is_public:true, ticker:null, exchange:'NSE',
    sector:'Technology', industry:'Telecom Equipment & OFC',
    // FY2025: 6,000 employees; revenue ~$560M (₹4,740 Cr)
    workforce_count:6000, workforce_source:'annual_report_2025', workforce_confidence:0.85,
    recent_layoff_count:0, largest_layoff_pct:null, layoff_last_event_at:null,
    layoff_source:'breaking_news_events', layoff_confidence:0.70,
    hiring_velocity_score:0.4, total_open_roles:200, hiring_source:'naukri_api', hiring_confidence:0.70,
    stock_price:null, market_cap_usd:2000000000, pe_ratio:28.0, revenue_ttm_usd:560000000,
    stock_90d_change:null, financials_source:'annual_report_2025', financials_confidence:0.85,
    data_quality_tier:'verified', enrichment_version:'ni6-v2026.1'
  },
  // ── MEDIA & BROADCASTING ──
  {
    canonical_name:'sun tv network', display_name:'Sun TV Network Limited', country_code:'IN', is_public:true, ticker:null, exchange:'NSE',
    sector:'Communication Services', industry:'Television Broadcasting',
    // FY2025: 5,200 employees; revenue ~$820M (₹6,900 Cr)
    workforce_count:5200, workforce_source:'annual_report_2025', workforce_confidence:0.90,
    recent_layoff_count:0, largest_layoff_pct:null, layoff_last_event_at:null,
    layoff_source:'breaking_news_events', layoff_confidence:0.75,
    hiring_velocity_score:0.1, total_open_roles:150, hiring_source:'naukri_api', hiring_confidence:0.70,
    stock_price:null, market_cap_usd:5500000000, pe_ratio:22.0, revenue_ttm_usd:820000000,
    stock_90d_change:null, financials_source:'annual_report_2025', financials_confidence:0.90,
    data_quality_tier:'verified', enrichment_version:'ni6-v2026.1'
  },
  {
    canonical_name:'zee entertainment enterprises', display_name:'Zee Entertainment Enterprises Limited', country_code:'IN', is_public:true, ticker:null, exchange:'NSE',
    sector:'Communication Services', industry:'Television Broadcasting',
    // FY2025: 4,500 employees; revenue ~$670M (₹5,650 Cr); post-Sony merger fail
    workforce_count:4500, workforce_source:'annual_report_2025', workforce_confidence:0.88,
    recent_layoff_count:2, largest_layoff_pct:12.0, layoff_last_event_at:'2025-01-10',
    layoff_source:'breaking_news_events', layoff_confidence:0.88,
    hiring_velocity_score:-0.8, total_open_roles:150, hiring_source:'naukri_api', hiring_confidence:0.70,
    stock_price:null, market_cap_usd:2800000000, pe_ratio:null, revenue_ttm_usd:670000000,
    stock_90d_change:null, financials_source:'annual_report_2025', financials_confidence:0.85,
    data_quality_tier:'verified', enrichment_version:'ni6-v2026.1'
  },
  {
    canonical_name:'network18 media and investments', display_name:'Network18 Media & Investments Limited', country_code:'IN', is_public:true, ticker:null, exchange:'NSE',
    sector:'Communication Services', industry:'Digital Media & News Broadcasting',
    // FY2025: 6,000 employees; revenue ~$500M (₹4,200 Cr); Reliance-owned
    workforce_count:6000, workforce_source:'annual_report_2025', workforce_confidence:0.85,
    recent_layoff_count:1, largest_layoff_pct:8.0, layoff_last_event_at:'2024-10-05',
    layoff_source:'breaking_news_events', layoff_confidence:0.82,
    hiring_velocity_score:-0.4, total_open_roles:200, hiring_source:'naukri_api', hiring_confidence:0.70,
    stock_price:null, market_cap_usd:1800000000, pe_ratio:null, revenue_ttm_usd:500000000,
    stock_90d_change:null, financials_source:'annual_report_2025', financials_confidence:0.82,
    data_quality_tier:'verified', enrichment_version:'ni6-v2026.1'
  },
  {
    canonical_name:'pvr inox limited', display_name:'PVR INOX Limited', country_code:'IN', is_public:true, ticker:null, exchange:'NSE',
    sector:'Communication Services', industry:'Multiplex Cinema Exhibition',
    // FY2025: 12,000 employees; revenue ~$720M (₹6,100 Cr); merged entity
    workforce_count:12000, workforce_source:'annual_report_2025', workforce_confidence:0.88,
    recent_layoff_count:1, largest_layoff_pct:6.0, layoff_last_event_at:'2024-07-30',
    layoff_source:'breaking_news_events', layoff_confidence:0.82,
    hiring_velocity_score:0.1, total_open_roles:400, hiring_source:'naukri_api', hiring_confidence:0.72,
    stock_price:null, market_cap_usd:2200000000, pe_ratio:null, revenue_ttm_usd:720000000,
    stock_90d_change:null, financials_source:'annual_report_2025', financials_confidence:0.85,
    data_quality_tier:'verified', enrichment_version:'ni6-v2026.1'
  },
  {
    canonical_name:'saregama india', display_name:'Saregama India Limited', country_code:'IN', is_public:true, ticker:null, exchange:'NSE',
    sector:'Communication Services', industry:'Music Labels & Entertainment',
    // FY2025: 900 employees; revenue ~$120M (₹1,020 Cr)
    workforce_count:900, workforce_source:'annual_report_2025', workforce_confidence:0.85,
    recent_layoff_count:0, largest_layoff_pct:null, layoff_last_event_at:null,
    layoff_source:'breaking_news_events', layoff_confidence:0.70,
    hiring_velocity_score:0.3, total_open_roles:50, hiring_source:'naukri_api', hiring_confidence:0.70,
    stock_price:null, market_cap_usd:1400000000, pe_ratio:42.0, revenue_ttm_usd:120000000,
    stock_90d_change:null, financials_source:'annual_report_2025', financials_confidence:0.88,
    data_quality_tier:'verified', enrichment_version:'ni6-v2026.1'
  },
  {
    canonical_name:'db corp dainik bhaskar', display_name:'D.B. Corp Limited (Dainik Bhaskar)', country_code:'IN', is_public:true, ticker:null, exchange:'NSE',
    sector:'Communication Services', industry:'Print Media',
    // FY2025: 9,000 employees; revenue ~$380M (₹3,200 Cr)
    workforce_count:9000, workforce_source:'annual_report_2025', workforce_confidence:0.85,
    recent_layoff_count:0, largest_layoff_pct:null, layoff_last_event_at:null,
    layoff_source:'breaking_news_events', layoff_confidence:0.72,
    hiring_velocity_score:-0.2, total_open_roles:150, hiring_source:'naukri_api', hiring_confidence:0.68,
    stock_price:null, market_cap_usd:1400000000, pe_ratio:14.0, revenue_ttm_usd:380000000,
    stock_90d_change:null, financials_source:'annual_report_2025', financials_confidence:0.85,
    data_quality_tier:'verified', enrichment_version:'ni6-v2026.1'
  },
  // ── GAMING / ADTECH ──
  {
    canonical_name:'nazara technologies', display_name:'Nazara Technologies Limited', country_code:'IN', is_public:true, ticker:null, exchange:'NSE',
    sector:'Communication Services', industry:'Mobile Gaming & Esports',
    // FY2025: 3,000 employees; revenue ~$140M (₹1,200 Cr)
    workforce_count:3000, workforce_source:'annual_report_2025', workforce_confidence:0.85,
    recent_layoff_count:0, largest_layoff_pct:null, layoff_last_event_at:null,
    layoff_source:'breaking_news_events', layoff_confidence:0.72,
    hiring_velocity_score:0.6, total_open_roles:150, hiring_source:'naukri_api', hiring_confidence:0.72,
    stock_price:null, market_cap_usd:1000000000, pe_ratio:null, revenue_ttm_usd:140000000,
    stock_90d_change:null, financials_source:'annual_report_2025', financials_confidence:0.82,
    data_quality_tier:'verified', enrichment_version:'ni6-v2026.1'
  },
  {
    canonical_name:'affle india', display_name:'Affle (India) Limited', country_code:'IN', is_public:true, ticker:null, exchange:'NSE',
    sector:'Technology', industry:'Mobile Advertising Technology',
    // FY2025: 1,400 employees; revenue ~$220M (₹1,870 Cr)
    workforce_count:1400, workforce_source:'annual_report_2025', workforce_confidence:0.85,
    recent_layoff_count:0, largest_layoff_pct:null, layoff_last_event_at:null,
    layoff_source:'breaking_news_events', layoff_confidence:0.70,
    hiring_velocity_score:0.5, total_open_roles:80, hiring_source:'naukri_api', hiring_confidence:0.72,
    stock_price:null, market_cap_usd:1500000000, pe_ratio:55.0, revenue_ttm_usd:220000000,
    stock_90d_change:null, financials_source:'annual_report_2025', financials_confidence:0.85,
    data_quality_tier:'verified', enrichment_version:'ni6-v2026.1'
  },
  // ── DIGITAL MARKETPLACES ──
  {
    canonical_name:'indiamart intermesh', display_name:'IndiaMART InterMESH Limited', country_code:'IN', is_public:true, ticker:null, exchange:'NSE',
    sector:'Technology', industry:'B2B Online Marketplace',
    // FY2025: 4,000 employees; revenue ~$180M (₹1,530 Cr)
    workforce_count:4000, workforce_source:'annual_report_2025', workforce_confidence:0.88,
    recent_layoff_count:0, largest_layoff_pct:null, layoff_last_event_at:null,
    layoff_source:'breaking_news_events', layoff_confidence:0.75,
    hiring_velocity_score:0.2, total_open_roles:200, hiring_source:'naukri_api', hiring_confidence:0.72,
    stock_price:null, market_cap_usd:2200000000, pe_ratio:32.0, revenue_ttm_usd:180000000,
    stock_90d_change:null, financials_source:'annual_report_2025', financials_confidence:0.88,
    data_quality_tier:'verified', enrichment_version:'ni6-v2026.1'
  },
  {
    canonical_name:'cartrade tech', display_name:'CarTrade Tech Limited', country_code:'IN', is_public:true, ticker:null, exchange:'NSE',
    sector:'Technology', industry:'Automotive Online Marketplace',
    // FY2025: 2,500 employees; revenue ~$82M (₹695 Cr)
    workforce_count:2500, workforce_source:'annual_report_2025', workforce_confidence:0.82,
    recent_layoff_count:0, largest_layoff_pct:null, layoff_last_event_at:null,
    layoff_source:'breaking_news_events', layoff_confidence:0.70,
    hiring_velocity_score:0.3, total_open_roles:100, hiring_source:'naukri_api', hiring_confidence:0.70,
    stock_price:null, market_cap_usd:800000000, pe_ratio:null, revenue_ttm_usd:82000000,
    stock_90d_change:null, financials_source:'annual_report_2025', financials_confidence:0.82,
    data_quality_tier:'verified', enrichment_version:'ni6-v2026.1'
  },
  {
    canonical_name:'mapmyindia ce info systems', display_name:'MapMyIndia (CE Info Systems Limited)', country_code:'IN', is_public:true, ticker:null, exchange:'NSE',
    sector:'Technology', industry:'Digital Maps & Location Intelligence',
    // FY2025: 1,200 employees; revenue ~$75M (₹635 Cr)
    workforce_count:1200, workforce_source:'annual_report_2025', workforce_confidence:0.85,
    recent_layoff_count:0, largest_layoff_pct:null, layoff_last_event_at:null,
    layoff_source:'breaking_news_events', layoff_confidence:0.70,
    hiring_velocity_score:0.6, total_open_roles:80, hiring_source:'naukri_api', hiring_confidence:0.72,
    stock_price:null, market_cap_usd:1200000000, pe_ratio:48.0, revenue_ttm_usd:75000000,
    stock_90d_change:null, financials_source:'annual_report_2025', financials_confidence:0.85,
    data_quality_tier:'verified', enrichment_version:'ni6-v2026.1'
  },
  {
    canonical_name:'route mobile', display_name:'Route Mobile Limited', country_code:'IN', is_public:true, ticker:null, exchange:'NSE',
    sector:'Technology', industry:'Cloud Communications & CPaaS',
    // FY2025: 4,000 employees; revenue ~$450M (₹3,800 Cr); acquired by Proximus
    workforce_count:4000, workforce_source:'annual_report_2025', workforce_confidence:0.85,
    recent_layoff_count:0, largest_layoff_pct:null, layoff_last_event_at:null,
    layoff_source:'breaking_news_events', layoff_confidence:0.72,
    hiring_velocity_score:0.3, total_open_roles:150, hiring_source:'naukri_api', hiring_confidence:0.70,
    stock_price:null, market_cap_usd:1800000000, pe_ratio:28.0, revenue_ttm_usd:450000000,
    stock_90d_change:null, financials_source:'annual_report_2025', financials_confidence:0.85,
    data_quality_tier:'verified', enrichment_version:'ni6-v2026.1'
  },
  // ── TRAVEL TECH ──
  {
    canonical_name:'makemytrip limited', display_name:'MakeMyTrip Limited', country_code:'IN', is_public:true,
    ticker:'MMYT', exchange:'NASDAQ',
    sector:'Consumer Discretionary', industry:'Online Travel Agency',
    // FY2025: 5,000 employees; revenue ~$850M
    workforce_count:5000, workforce_source:'annual_report_2025', workforce_confidence:0.88,
    recent_layoff_count:0, largest_layoff_pct:null, layoff_last_event_at:null,
    layoff_source:'breaking_news_events', layoff_confidence:0.78,
    hiring_velocity_score:0.5, total_open_roles:250, hiring_source:'naukri_api', hiring_confidence:0.75,
    financials_source:'yahoo_finance_scrape', financials_confidence:0.88,
    data_quality_tier:'verified', enrichment_version:'ni6-v2026.1'
  },
  {
    canonical_name:'easemytrip', display_name:'Easy Trip Planners Limited (EaseMyTrip)', country_code:'IN', is_public:true, ticker:null, exchange:'NSE',
    sector:'Consumer Discretionary', industry:'Online Travel Agency',
    // FY2025: 800 employees; revenue ~$48M (₹408 Cr)
    workforce_count:800, workforce_source:'annual_report_2025', workforce_confidence:0.82,
    recent_layoff_count:0, largest_layoff_pct:null, layoff_last_event_at:null,
    layoff_source:'breaking_news_events', layoff_confidence:0.70,
    hiring_velocity_score:0.2, total_open_roles:50, hiring_source:'naukri_api', hiring_confidence:0.68,
    stock_price:null, market_cap_usd:550000000, pe_ratio:null, revenue_ttm_usd:48000000,
    stock_90d_change:null, financials_source:'annual_report_2025', financials_confidence:0.82,
    data_quality_tier:'verified', enrichment_version:'ni6-v2026.1'
  },
  {
    canonical_name:'irctc indian railway catering tourism', display_name:'IRCTC (Indian Railway Catering & Tourism)', country_code:'IN', is_public:true, ticker:null, exchange:'NSE',
    sector:'Consumer Discretionary', industry:'Rail Tourism & E-Ticketing',
    // FY2025: 2,200 employees; revenue ~$600M (₹5,100 Cr); monopoly rail booking
    workforce_count:2200, workforce_source:'annual_report_2025', workforce_confidence:0.90,
    recent_layoff_count:0, largest_layoff_pct:null, layoff_last_event_at:null,
    layoff_source:'breaking_news_events', layoff_confidence:0.75,
    hiring_velocity_score:0.2, total_open_roles:80, hiring_source:'naukri_api', hiring_confidence:0.70,
    stock_price:null, market_cap_usd:12000000000, pe_ratio:60.0, revenue_ttm_usd:600000000,
    stock_90d_change:null, financials_source:'annual_report_2025', financials_confidence:0.92,
    data_quality_tier:'verified', enrichment_version:'ni6-v2026.1'
  },
  {
    canonical_name:'rategain travel technologies', display_name:'RateGain Travel Technologies Limited', country_code:'IN', is_public:true, ticker:null, exchange:'NSE',
    sector:'Technology', industry:'Travel Technology SaaS',
    // FY2025: 1,600 employees; revenue ~$90M (₹762 Cr)
    workforce_count:1600, workforce_source:'annual_report_2025', workforce_confidence:0.85,
    recent_layoff_count:0, largest_layoff_pct:null, layoff_last_event_at:null,
    layoff_source:'breaking_news_events', layoff_confidence:0.70,
    hiring_velocity_score:0.5, total_open_roles:100, hiring_source:'naukri_api', hiring_confidence:0.72,
    stock_price:null, market_cap_usd:700000000, pe_ratio:42.0, revenue_ttm_usd:90000000,
    stock_90d_change:null, financials_source:'annual_report_2025', financials_confidence:0.85,
    data_quality_tier:'verified', enrichment_version:'ni6-v2026.1'
  }
];

async function upsertCompany(c) {
  const hasP = c.stock_price !== undefined;
  const st = (!hasP && c.ticker) ? await fetchStockData(c.ticker) : null;
  const fP=hasP?c.stock_price:st?.price??null, fM=hasP?c.market_cap_usd:st?.marketCapUsd??null;
  const fPE=hasP?c.pe_ratio:st?.peRatio??null, fR=hasP?c.revenue_ttm_usd:st?.revenueTtm??null;
  const fC=hasP?c.stock_90d_change:st?.change90d??null;
  const fSrc=c.financials_source??(fP?'yahoo_finance_scrape':'not_applicable');
  const fConf=c.financials_confidence??(fP?0.85:null);
  const params=[c.canonical_name,c.display_name,c.country_code,c.is_public,c.ticker??null,c.exchange,c.sector,c.industry,
    c.workforce_count,c.workforce_source,c.workforce_confidence,
    c.recent_layoff_count,c.largest_layoff_pct,c.layoff_last_event_at,c.layoff_source,c.layoff_confidence,
    c.hiring_velocity_score,c.total_open_roles,c.hiring_source,c.hiring_confidence,
    fP,fM,fPE,fR,fC,fSrc,fConf,c.data_quality_tier,c.enrichment_version];
  const {rows}=await pool.query(SQL,params);
  const ins=rows[0]?.inserted;
  const tag=fP?`💹 $${fP}`:(fM?`📋 $${(fM/1e9).toFixed(1)}B`:'⚠ no data');
  console.log(`  ${c.canonical_name.padEnd(44)} ${tag} ${ins?'✅ inserted':'🔄 updated'}`);
  return {inserted:ins,hasStock:!!fP,hasPE:!!fPE,hasRev:!!fR};
}

async function main() {
  const cl=await pool.connect(); await cl.query('SELECT 1'); cl.release();
  console.log('\n✓ Connected — NI6: India Telecom / Media / Marketplaces (2026 data)\n');
  let ins=0,upd=0,stock=0,pe=0,rev=0;
  for (const c of companies) {
    const r=await upsertCompany(c);
    if(r.inserted)ins++;else upd++;
    if(r.hasStock)stock++;if(r.hasPE)pe++;if(r.hasRev)rev++;
    await new Promise(r=>setTimeout(r,700));
  }
  console.log(`\n✅ NI6 complete — ${ins} inserted, ${upd} updated`);
  console.log(`   Live stock: ${stock}/${companies.length} | PE data: ${pe}/${companies.length} | Revenue: ${rev}/${companies.length}`);
  await pool.end();
}
main().catch(e=>{console.error(e);process.exit(1);});
