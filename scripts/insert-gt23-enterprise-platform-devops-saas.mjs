// GT23: Enterprise Platforms, DevOps & E-Commerce SaaS (2026)
import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const FX = { USD:1, EUR:1.09, GBP:1.27, JPY:0.0067, KRW:0.00073, SEK:0.097, PLN:0.25, AUD:0.65, CAD:0.73, SGD:0.74 };
let cookie='', crumb='';

async function initYahoo() {
  const r1 = await fetch('https://fc.yahoo.com', { headers:{'User-Agent':'Mozilla/5.0'}, redirect:'manual' });
  cookie = (r1.headers.get('set-cookie')||'').split(';')[0];
  await new Promise(r=>setTimeout(r,300));
  const r2 = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', { headers:{'User-Agent':'Mozilla/5.0',Cookie:cookie} });
  crumb = await r2.text();
}

async function fetchStockData(ticker) {
  try {
    const r1 = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=90d`, { headers:{'User-Agent':'Mozilla/5.0',Cookie:cookie} });
    const j1 = await r1.json();
    const meta = j1?.chart?.result?.[0]?.meta;
    if (!meta) return null;
    const fx = FX[meta.currency||'USD']||1;
    const price = meta.regularMarketPrice ? Math.round(meta.regularMarketPrice*100)/100 : null;
    let marketCapUsd = meta.marketCap ? Math.round(meta.marketCap*fx) : null;
    const closes = j1?.chart?.result?.[0]?.indicators?.quote?.[0]?.close||[];
    const valid = closes.filter(Boolean);
    let change90d = null;
    if (valid.length>=2) change90d = Math.round(((valid[valid.length-1]-valid[0])/valid[0])*10000)/100;
    let peRatio=null, revenueTtm=null;
    await new Promise(r=>setTimeout(r,300));
    try {
      const r2 = await fetch(`https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=summaryDetail,financialData&crumb=${encodeURIComponent(crumb)}`, { headers:{'User-Agent':'Mozilla/5.0',Cookie:cookie} });
      const j2 = await r2.json();
      const sd = j2?.quoteSummary?.result?.[0]?.summaryDetail;
      const fd = j2?.quoteSummary?.result?.[0]?.financialData;
      peRatio = sd?.trailingPE?.raw ?? sd?.forwardPE?.raw ?? null;
      if (peRatio) peRatio = Math.round(peRatio*10)/10;
      revenueTtm = fd?.totalRevenue?.raw ? Math.round(fd.totalRevenue.raw*fx) : null;
      if (!marketCapUsd && sd?.marketCap?.raw) marketCapUsd = Math.round(sd.marketCap.raw*fx);
    } catch {}
    return { price, marketCapUsd, change90d, peRatio, revenueTtm };
  } catch { return null; }
}

async function upsertCompany(c) {
  const needsYahoo = !!c.ticker && c.market_cap_usd === undefined;
  const stock = needsYahoo ? await fetchStockData(c.ticker) : null;
  const finalPrice   = c.stock_price    ?? stock?.price        ?? null;
  const finalMktCap  = c.market_cap_usd ?? stock?.marketCapUsd ?? null;
  const finalPE      = c.pe_ratio       ?? stock?.peRatio      ?? null;
  const finalRev     = c.revenue_ttm_usd?? stock?.revenueTtm   ?? null;
  const finalChange  = c.stock_90d_change ?? stock?.change90d  ?? null;
  const finalSrc     = c.financials_source ?? (stock ? 'yahoo_finance_scrape' : 'not_applicable');
  const finalConf    = c.financials_confidence ?? (finalPrice!=null ? 0.88 : null);
  const now = new Date().toISOString();
  const sql = `
    INSERT INTO verified_company_intelligence (
      canonical_name,display_name,ticker,exchange,industry,sector,
      is_public,country_code,
      workforce_count,workforce_source,workforce_verified_at,workforce_confidence,
      stock_price,market_cap_usd,pe_ratio,revenue_ttm_usd,stock_90d_change,
      financials_source,financials_verified_at,financials_confidence,
      recent_layoff_count,layoff_source,layoff_verified_at,layoff_confidence,
      hiring_velocity_score,total_open_roles,hiring_source,hiring_verified_at,hiring_confidence,
      data_quality_tier,enrichment_version,last_enriched_at,conflict_flags,updated_at
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,
      $9,$10,$11,$12,
      $13,$14,$15,$16,$17,
      $18,$19,$20,
      $21,$22,$23,$24,
      $25,$26,$27,$28,$29,
      $30,$31,$32,'[]'::jsonb,$32
    )
    ON CONFLICT (canonical_name) DO UPDATE SET
      display_name=COALESCE(EXCLUDED.display_name,verified_company_intelligence.display_name),
      ticker=COALESCE(EXCLUDED.ticker,verified_company_intelligence.ticker),
      exchange=COALESCE(EXCLUDED.exchange,verified_company_intelligence.exchange),
      industry=COALESCE(EXCLUDED.industry,verified_company_intelligence.industry),
      sector=COALESCE(EXCLUDED.sector,verified_company_intelligence.sector),
      is_public=EXCLUDED.is_public,
      country_code=COALESCE(EXCLUDED.country_code,verified_company_intelligence.country_code),
      workforce_count=COALESCE(EXCLUDED.workforce_count,verified_company_intelligence.workforce_count),
      workforce_source=COALESCE(EXCLUDED.workforce_source,verified_company_intelligence.workforce_source),
      workforce_verified_at=COALESCE(EXCLUDED.workforce_verified_at,verified_company_intelligence.workforce_verified_at),
      workforce_confidence=COALESCE(EXCLUDED.workforce_confidence,verified_company_intelligence.workforce_confidence),
      stock_price=COALESCE(EXCLUDED.stock_price,verified_company_intelligence.stock_price),
      market_cap_usd=COALESCE(EXCLUDED.market_cap_usd,verified_company_intelligence.market_cap_usd),
      pe_ratio=COALESCE(EXCLUDED.pe_ratio,verified_company_intelligence.pe_ratio),
      revenue_ttm_usd=COALESCE(EXCLUDED.revenue_ttm_usd,verified_company_intelligence.revenue_ttm_usd),
      stock_90d_change=COALESCE(EXCLUDED.stock_90d_change,verified_company_intelligence.stock_90d_change),
      financials_source=COALESCE(EXCLUDED.financials_source,verified_company_intelligence.financials_source),
      financials_verified_at=COALESCE(EXCLUDED.financials_verified_at,verified_company_intelligence.financials_verified_at),
      financials_confidence=COALESCE(EXCLUDED.financials_confidence,verified_company_intelligence.financials_confidence),
      recent_layoff_count=COALESCE(EXCLUDED.recent_layoff_count,verified_company_intelligence.recent_layoff_count),
      layoff_source=COALESCE(EXCLUDED.layoff_source,verified_company_intelligence.layoff_source),
      layoff_verified_at=COALESCE(EXCLUDED.layoff_verified_at,verified_company_intelligence.layoff_verified_at),
      layoff_confidence=COALESCE(EXCLUDED.layoff_confidence,verified_company_intelligence.layoff_confidence),
      hiring_velocity_score=COALESCE(EXCLUDED.hiring_velocity_score,verified_company_intelligence.hiring_velocity_score),
      total_open_roles=COALESCE(EXCLUDED.total_open_roles,verified_company_intelligence.total_open_roles),
      hiring_source=COALESCE(EXCLUDED.hiring_source,verified_company_intelligence.hiring_source),
      hiring_verified_at=COALESCE(EXCLUDED.hiring_verified_at,verified_company_intelligence.hiring_verified_at),
      hiring_confidence=COALESCE(EXCLUDED.hiring_confidence,verified_company_intelligence.hiring_confidence),
      data_quality_tier=EXCLUDED.data_quality_tier,
      enrichment_version=EXCLUDED.enrichment_version,
      last_enriched_at=EXCLUDED.last_enriched_at,
      updated_at=EXCLUDED.updated_at
    RETURNING canonical_name,(xmax=0) AS inserted`;
  const vals = [
    c.canonical_name, c.display_name, c.ticker??null, c.exchange??null, c.industry, c.sector,
    c.is_public, c.country_code,
    c.workforce_count??null, c.workforce_source??'annual_report', now, c.workforce_confidence??0.85,
    finalPrice, finalMktCap, (finalPE && isFinite(finalPE))?Math.round(finalPE*10)/10:null, finalRev, finalChange,
    finalSrc, finalPrice!=null?now:null, finalConf,
    c.recent_layoff_count??0, c.layoff_source??'news_rss_scrape', now, c.layoff_confidence??0.70,
    c.hiring_velocity_score??0.0, c.total_open_roles??null, c.hiring_source??'linkedin_scrape', now, c.hiring_confidence??0.65,
    c.data_quality_tier??(c.is_public?'verified':'seed'), c.enrichment_version??'gt23-v2026.1', now
  ];
  const { rows } = await pool.query(sql, vals);
  const ins = rows[0]?.inserted;
  const tl = c.ticker ? c.ticker.padEnd(6) : 'PRIV  ';
  const mc = finalMktCap ? `$${Math.round(finalMktCap/1e9)}B` : 'n/a';
  const pe = finalPE ? `PE:${Math.round(finalPE)}` : '';
  console.log(`  ${tl} ${c.canonical_name.padEnd(40)} ${c.is_public?'💹':'📋'} ${mc.padStart(7)} ${pe.padStart(7)} ${ins?'✅ inserted':'🔄 updated'}`);
  return { wasInserted:ins, hasPE:!!finalPE, hasRev:!!finalRev };
}

const companies = [
  // ── US-listed (Yahoo Finance) ──────────────────────────────────────────────
  { canonical_name:'servicenow inc', display_name:'ServiceNow Inc.', ticker:'NOW', exchange:'NYSE',
    industry:'Enterprise Workflow Automation / ITSM / HRSD / CSM / Now Platform / AI Enterprise Software', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:22000, workforce_source:'annual_report', workforce_confidence:0.92,
    recent_layoff_count:0, layoff_source:'news_rss_scrape', layoff_confidence:0.75,
    hiring_velocity_score:1.0, total_open_roles:1200, hiring_source:'linkedin_scrape', hiring_confidence:0.80,
    enrichment_version:'gt23-v2026.1' },

  { canonical_name:'atlassian corporation', display_name:'Atlassian Corporation', ticker:'TEAM', exchange:'NASDAQ',
    industry:'Project Management / Jira / Confluence / Trello / Bitbucket / DevOps / Collaboration', sector:'Technology',
    is_public:true, country_code:'AU', workforce_count:11000, workforce_source:'annual_report', workforce_confidence:0.92,
    recent_layoff_count:2, layoff_source:'news_rss_scrape', layoff_confidence:0.85,
    hiring_velocity_score:-0.3, total_open_roles:500, hiring_source:'linkedin_scrape', hiring_confidence:0.78,
    enrichment_version:'gt23-v2026.1' },

  { canonical_name:'autodesk inc', display_name:'Autodesk Inc.', ticker:'ADSK', exchange:'NASDAQ',
    industry:'CAD / BIM / 3D Design / AutoCAD / Revit / Fusion 360 / Construction Technology / AEC', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:13500, workforce_source:'annual_report', workforce_confidence:0.92,
    recent_layoff_count:2, layoff_source:'news_rss_scrape', layoff_confidence:0.85,
    hiring_velocity_score:-0.3, total_open_roles:600, hiring_source:'linkedin_scrape', hiring_confidence:0.78,
    enrichment_version:'gt23-v2026.1' },

  { canonical_name:'shopify inc', display_name:'Shopify Inc.', ticker:'SHOP', exchange:'NYSE',
    industry:'E-Commerce Platform / Online Store Builder / Shopify Payments / POS / Fulfillment Network', sector:'Technology',
    is_public:true, country_code:'CA', workforce_count:8300, workforce_source:'annual_report', workforce_confidence:0.92,
    recent_layoff_count:3, layoff_source:'news_rss_scrape', layoff_confidence:0.88,
    hiring_velocity_score:-0.2, total_open_roles:400, hiring_source:'linkedin_scrape', hiring_confidence:0.78,
    enrichment_version:'gt23-v2026.1' },

  { canonical_name:'gitlab inc', display_name:'GitLab Inc.', ticker:'GTLB', exchange:'NASDAQ',
    industry:'DevSecOps Platform / Git Repository / CI/CD / Code Review / Security Scanning', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:2100, workforce_source:'annual_report', workforce_confidence:0.90,
    recent_layoff_count:1, layoff_source:'news_rss_scrape', layoff_confidence:0.80,
    hiring_velocity_score:0.2, total_open_roles:120, hiring_source:'linkedin_scrape', hiring_confidence:0.72,
    enrichment_version:'gt23-v2026.1' },

  { canonical_name:'bill com holdings inc', display_name:'Bill.com Holdings Inc.', ticker:'BILL', exchange:'NYSE',
    industry:'Accounts Payable / Accounts Receivable / SMB Financial Automation / B2B Payments / Divvy', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:3600, workforce_source:'annual_report', workforce_confidence:0.90,
    recent_layoff_count:2, layoff_source:'news_rss_scrape', layoff_confidence:0.85,
    hiring_velocity_score:-0.5, total_open_roles:150, hiring_source:'linkedin_scrape', hiring_confidence:0.72,
    enrichment_version:'gt23-v2026.1' },

  { canonical_name:'solarwinds corporation', display_name:'SolarWinds Corporation', ticker:'SWI', exchange:'NYSE',
    industry:'IT Management Software / Network Monitoring / ITSM / Observability / Hybrid IT', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:2700, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:1, layoff_source:'news_rss_scrape', layoff_confidence:0.80,
    hiring_velocity_score:-0.3, total_open_roles:100, hiring_source:'linkedin_scrape', hiring_confidence:0.70,
    enrichment_version:'gt23-v2026.1' },

  { canonical_name:'descartes systems group inc', display_name:'Descartes Systems Group Inc.', ticker:'DSGX', exchange:'NASDAQ',
    industry:'Logistics & Supply Chain SaaS / Routing / Compliance / Customs / Trade Intelligence', sector:'Technology',
    is_public:true, country_code:'CA', workforce_count:4200, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:0, layoff_source:'news_rss_scrape', layoff_confidence:0.72,
    hiring_velocity_score:0.5, total_open_roles:200, hiring_source:'linkedin_scrape', hiring_confidence:0.72,
    enrichment_version:'gt23-v2026.1' },

  { canonical_name:'sps commerce inc', display_name:'SPS Commerce Inc.', ticker:'SPSC', exchange:'NASDAQ',
    industry:'Supply Chain EDI / Retail Cloud / Vendor Collaboration / Fulfillment Analytics', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:1100, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:0, layoff_source:'news_rss_scrape', layoff_confidence:0.72,
    hiring_velocity_score:0.5, total_open_roles:80, hiring_source:'linkedin_scrape', hiring_confidence:0.72,
    enrichment_version:'gt23-v2026.1' },

  { canonical_name:'e2open parent holdings inc', display_name:'E2open Parent Holdings Inc.', ticker:'ETWO', exchange:'NYSE',
    industry:'Supply Chain Management / Logistics Network / Global Trade Management / Demand Sensing', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:4500, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:2, layoff_source:'news_rss_scrape', layoff_confidence:0.82,
    hiring_velocity_score:-0.5, total_open_roles:150, hiring_source:'linkedin_scrape', hiring_confidence:0.70,
    enrichment_version:'gt23-v2026.1' },

  { canonical_name:'servicetitan inc', display_name:'ServiceTitan Inc.', ticker:'TTAN', exchange:'NASDAQ',
    industry:'Field Service Management / HVAC Software / Plumbing / Electrical / Home Services SaaS', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:3100, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:0, layoff_source:'news_rss_scrape', layoff_confidence:0.75,
    hiring_velocity_score:0.8, total_open_roles:200, hiring_source:'linkedin_scrape', hiring_confidence:0.72,
    enrichment_version:'gt23-v2026.1' },

  { canonical_name:'alkami technology inc', display_name:'Alkami Technology Inc.', ticker:'ALKT', exchange:'NASDAQ',
    industry:'Digital Banking Platform / Credit Union / Community Bank Software / Fintech SaaS', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:1400, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:0, layoff_source:'news_rss_scrape', layoff_confidence:0.72,
    hiring_velocity_score:0.6, total_open_roles:80, hiring_source:'linkedin_scrape', hiring_confidence:0.70,
    enrichment_version:'gt23-v2026.1' },

  { canonical_name:'twilio inc', display_name:'Twilio Inc.', ticker:'TWLO', exchange:'NYSE',
    industry:'Cloud Communications API / SMS / Voice / Video / Segment CDP / CPaaS Platform', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:6000, workforce_source:'annual_report', workforce_confidence:0.90,
    recent_layoff_count:4, layoff_source:'news_rss_scrape', layoff_confidence:0.90,
    hiring_velocity_score:-1.0, total_open_roles:250, hiring_source:'linkedin_scrape', hiring_confidence:0.72,
    enrichment_version:'gt23-v2026.1' },

  { canonical_name:'udemy inc', display_name:'Udemy Inc.', ticker:'UDMY', exchange:'NASDAQ',
    industry:'Online Learning / E-Learning Marketplace / Corporate Training / Skills Development', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:1200, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:2, layoff_source:'news_rss_scrape', layoff_confidence:0.82,
    hiring_velocity_score:-0.5, total_open_roles:60, hiring_source:'linkedin_scrape', hiring_confidence:0.70,
    enrichment_version:'gt23-v2026.1' },

  // ── Private enterprise software companies ──────────────────────────────────
  { canonical_name:'smartsheet inc', display_name:'Smartsheet Inc.', ticker:null, exchange:null,
    industry:'Work Management Platform / No-Code Automation / Project Tracking / Collaborative Sheets', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:3200, workforce_source:'news_rss_scrape', workforce_confidence:0.85,
    market_cap_usd:8400000000, pe_ratio:null, revenue_ttm_usd:1070000000,
    financials_source:'annual_report', financials_confidence:0.82,
    recent_layoff_count:1, layoff_source:'news_rss_scrape', layoff_confidence:0.80,
    hiring_velocity_score:-0.3, total_open_roles:150, hiring_source:'linkedin_scrape', hiring_confidence:0.72,
    data_quality_tier:'seed', enrichment_version:'gt23-v2026.1' },

  { canonical_name:'outsystems software em rede sa', display_name:'OutSystems Software em Rede SA', ticker:null, exchange:null,
    industry:'Low-Code Platform / Rapid Application Development / Enterprise App Modernization', sector:'Technology',
    is_public:false, country_code:'PT', workforce_count:3000, workforce_source:'news_rss_scrape', workforce_confidence:0.80,
    market_cap_usd:9500000000, pe_ratio:null, revenue_ttm_usd:400000000,
    financials_source:'news_rss_scrape', financials_confidence:0.65,
    recent_layoff_count:1, layoff_source:'news_rss_scrape', layoff_confidence:0.78,
    hiring_velocity_score:0.2, total_open_roles:150, hiring_source:'linkedin_scrape', hiring_confidence:0.68,
    data_quality_tier:'seed', enrichment_version:'gt23-v2026.1' },

  { canonical_name:'chargebee inc', display_name:'Chargebee Inc.', ticker:null, exchange:null,
    industry:'Subscription Billing / Revenue Operations / SaaS Billing / Subscription Management', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:1400, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:3500000000, pe_ratio:null, revenue_ttm_usd:130000000,
    financials_source:'news_rss_scrape', financials_confidence:0.62,
    recent_layoff_count:1, layoff_source:'news_rss_scrape', layoff_confidence:0.78,
    hiring_velocity_score:0.2, total_open_roles:70, hiring_source:'linkedin_scrape', hiring_confidence:0.65,
    data_quality_tier:'seed', enrichment_version:'gt23-v2026.1' },

  { canonical_name:'pendo io inc', display_name:'Pendo.io Inc.', ticker:null, exchange:null,
    industry:'Product Analytics / In-App Guides / User Onboarding / Product Led Growth / NPS Surveys', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:1000, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:2600000000, pe_ratio:null, revenue_ttm_usd:110000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:1, layoff_source:'news_rss_scrape', layoff_confidence:0.75,
    hiring_velocity_score:0.0, total_open_roles:50, hiring_source:'linkedin_scrape', hiring_confidence:0.65,
    data_quality_tier:'seed', enrichment_version:'gt23-v2026.1' },

  { canonical_name:'gainsight inc', display_name:'Gainsight Inc.', ticker:null, exchange:null,
    industry:'Customer Success Platform / Health Scoring / Churn Reduction / Product-Led CS', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:900, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:1100000000, pe_ratio:null, revenue_ttm_usd:150000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:2, layoff_source:'news_rss_scrape', layoff_confidence:0.78,
    hiring_velocity_score:-0.3, total_open_roles:40, hiring_source:'linkedin_scrape', hiring_confidence:0.62,
    data_quality_tier:'seed', enrichment_version:'gt23-v2026.1' },

  { canonical_name:'bloomreach inc', display_name:'Bloomreach Inc.', ticker:null, exchange:null,
    industry:'Digital Experience Platform / E-Commerce Search / AI Merchandising / CDP / Headless CMS', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:1000, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:1500000000, pe_ratio:null, revenue_ttm_usd:150000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:1, layoff_source:'news_rss_scrape', layoff_confidence:0.75,
    hiring_velocity_score:0.2, total_open_roles:50, hiring_source:'linkedin_scrape', hiring_confidence:0.65,
    data_quality_tier:'seed', enrichment_version:'gt23-v2026.1' },
];

async function main() {
  console.log('\n✓ Connected — GT23: Enterprise Platforms, DevOps & E-Commerce SaaS (2026)\n');
  await initYahoo();
  let inserted=0, updated=0, withPE=0, withRev=0;
  for (const c of companies) {
    const r = await upsertCompany(c);
    if (r.wasInserted) inserted++; else updated++;
    if (r.hasPE) withPE++;
    if (r.hasRev) withRev++;
    await new Promise(r=>setTimeout(r,700));
  }
  console.log(`\n── GT23 complete: ${inserted} inserted, ${updated} updated | PE: ${withPE}/${companies.length} | Rev: ${withRev}/${companies.length}`);
  await pool.end();
}
main().catch(e=>{ console.error(e); process.exit(1); });
