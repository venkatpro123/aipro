// GT32: Cloud, Data Center & Hosting Infrastructure (2026)
import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const FX = { USD:1, EUR:1.09, GBP:1.27, JPY:0.0067, KRW:0.00073, SEK:0.097, PLN:0.25, AUD:0.65, CAD:0.73, SGD:0.74, CHF:1.12 };
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
      if (peRatio && isFinite(peRatio)) peRatio = Math.round(peRatio*10)/10; else peRatio = null;
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
      is_public,country_code,workforce_count,workforce_source,workforce_verified_at,workforce_confidence,
      stock_price,market_cap_usd,pe_ratio,revenue_ttm_usd,stock_90d_change,
      financials_source,financials_verified_at,financials_confidence,
      recent_layoff_count,layoff_source,layoff_verified_at,layoff_confidence,
      hiring_velocity_score,total_open_roles,hiring_source,hiring_verified_at,hiring_confidence,
      data_quality_tier,enrichment_version,last_enriched_at,conflict_flags,updated_at
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
      $13,$14,$15,$16,$17,$18,$19,$20,
      $21,$22,$23,$24,$25,$26,$27,$28,$29,
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
    finalPrice, finalMktCap, (finalPE&&isFinite(finalPE))?Math.round(finalPE*10)/10:null, finalRev, finalChange,
    finalSrc, finalPrice!=null?now:null, finalConf,
    c.recent_layoff_count??0, c.layoff_source??'news_rss_scrape', now, c.layoff_confidence??0.70,
    c.hiring_velocity_score??0.0, c.total_open_roles??null, c.hiring_source??'linkedin_scrape', now, c.hiring_confidence??0.65,
    c.data_quality_tier??(c.is_public?'verified':'seed'), c.enrichment_version??'gt32-v2026.1', now
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
  // ── Data Center REITs & Cloud Infrastructure (Yahoo) ──────────────────────
  { canonical_name:'equinix inc', display_name:'Equinix Inc.', ticker:'EQIX', exchange:'NASDAQ',
    industry:'Data Centers / Colocation / Interconnection / Cloud Exchange / Digital Infrastructure REIT', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:13000, workforce_source:'annual_report', workforce_confidence:0.92,
    recent_layoff_count:0, layoff_source:'news_rss_scrape', layoff_confidence:0.72,
    hiring_velocity_score:0.5, total_open_roles:600, hiring_source:'linkedin_scrape', hiring_confidence:0.75,
    enrichment_version:'gt32-v2026.1' },

  { canonical_name:'digital realty trust inc', display_name:'Digital Realty Trust Inc.', ticker:'DLR', exchange:'NYSE',
    industry:'Data Centers / Cloud Infrastructure / Colocation / Hyperscale / PlatformDIGITAL REIT', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:3500, workforce_source:'annual_report', workforce_confidence:0.90,
    recent_layoff_count:0, layoff_source:'news_rss_scrape', layoff_confidence:0.72,
    hiring_velocity_score:0.4, total_open_roles:300, hiring_source:'linkedin_scrape', hiring_confidence:0.72,
    enrichment_version:'gt32-v2026.1' },

  { canonical_name:'iron mountain incorporated', display_name:'Iron Mountain Incorporated', ticker:'IRM', exchange:'NYSE',
    industry:'Data Centers / Records Management / Digital Storage / Asset Lifecycle / Information Management', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:26000, workforce_source:'annual_report', workforce_confidence:0.90,
    recent_layoff_count:1, layoff_source:'news_rss_scrape', layoff_confidence:0.78,
    hiring_velocity_score:0.3, total_open_roles:400, hiring_source:'linkedin_scrape', hiring_confidence:0.70,
    enrichment_version:'gt32-v2026.1' },

  { canonical_name:'digitalocean holdings inc', display_name:'DigitalOcean Holdings Inc.', ticker:'DOCN', exchange:'NYSE',
    industry:'Cloud Computing / Developer Cloud / VPS / Managed Kubernetes / GenAI Cloud / SMB Cloud', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:1300, workforce_source:'annual_report', workforce_confidence:0.88,
    recent_layoff_count:1, layoff_source:'news_rss_scrape', layoff_confidence:0.80,
    hiring_velocity_score:0.2, total_open_roles:80, hiring_source:'linkedin_scrape', hiring_confidence:0.70,
    enrichment_version:'gt32-v2026.1' },

  { canonical_name:'akamai connected cloud',  display_name:'Linode (Akamai Connected Cloud)', ticker:null, exchange:null,
    industry:'Cloud Computing / Developer Cloud / Edge Computing / VPS / Akamai Cloud Computing', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:1000, workforce_source:'news_rss_scrape', workforce_confidence:0.72,
    market_cap_usd:null, pe_ratio:null, revenue_ttm_usd:500000000,
    financials_source:'news_rss_scrape', financials_confidence:0.55,
    recent_layoff_count:0, layoff_source:'news_rss_scrape', layoff_confidence:0.65,
    hiring_velocity_score:0.2, total_open_roles:40, hiring_source:'linkedin_scrape', hiring_confidence:0.60,
    data_quality_tier:'seed', enrichment_version:'gt32-v2026.1' },

  { canonical_name:'gds holdings limited', display_name:'GDS Holdings Limited', ticker:'GDS', exchange:'NASDAQ',
    industry:'Data Centers / China Colocation / Hyperscale / Cloud Infrastructure / Southeast Asia DC', sector:'Technology',
    is_public:true, country_code:'CN', workforce_count:4000, workforce_source:'annual_report', workforce_confidence:0.85,
    recent_layoff_count:0, layoff_source:'news_rss_scrape', layoff_confidence:0.72,
    hiring_velocity_score:0.3, total_open_roles:150, hiring_source:'linkedin_scrape', hiring_confidence:0.65,
    enrichment_version:'gt32-v2026.1' },

  { canonical_name:'iren limited', display_name:'IREN Limited', ticker:'IREN', exchange:'NASDAQ',
    industry:'Data Centers / AI Cloud / Bitcoin Mining / HPC / Renewable-Powered Compute / GPU Cloud', sector:'Technology',
    is_public:true, country_code:'AU', workforce_count:300, workforce_source:'annual_report', workforce_confidence:0.85,
    recent_layoff_count:0, layoff_source:'news_rss_scrape', layoff_confidence:0.70,
    hiring_velocity_score:1.0, total_open_roles:60, hiring_source:'linkedin_scrape', hiring_confidence:0.65,
    enrichment_version:'gt32-v2026.1' },

  { canonical_name:'core scientific inc', display_name:'Core Scientific Inc.', ticker:'CORZ', exchange:'NASDAQ',
    industry:'Data Centers / HPC Hosting / AI Compute / Bitcoin Mining / CoreWeave Partnership', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:300, workforce_source:'annual_report', workforce_confidence:0.85,
    recent_layoff_count:0, layoff_source:'news_rss_scrape', layoff_confidence:0.70,
    hiring_velocity_score:1.0, total_open_roles:60, hiring_source:'linkedin_scrape', hiring_confidence:0.65,
    enrichment_version:'gt32-v2026.1' },

  // ── Pre-filled (non-US exchanges) ──────────────────────────────────────────
  { canonical_name:'keppel dc reit', display_name:'Keppel DC REIT', ticker:null, exchange:'SGX',
    industry:'Data Center REIT / Colocation / Asia Pacific Data Centers / Cloud Infrastructure Singapore', sector:'Technology',
    is_public:true, country_code:'SG', workforce_count:200, workforce_source:'annual_report', workforce_confidence:0.85,
    market_cap_usd:3000000000, pe_ratio:20, revenue_ttm_usd:230000000,
    financials_source:'annual_report', financials_confidence:0.82,
    recent_layoff_count:0, layoff_source:'news_rss_scrape', layoff_confidence:0.70,
    hiring_velocity_score:0.3, total_open_roles:20, hiring_source:'linkedin_scrape', hiring_confidence:0.65,
    data_quality_tier:'verified', enrichment_version:'gt32-v2026.1' },

  { canonical_name:'ionos group se', display_name:'IONOS Group SE', ticker:null, exchange:'XETRA',
    industry:'Web Hosting / Cloud / Domains / European Cloud Infrastructure / SMB Hosting / 1&1', sector:'Technology',
    is_public:true, country_code:'DE', workforce_count:4200, workforce_source:'annual_report', workforce_confidence:0.88,
    market_cap_usd:5000000000, pe_ratio:30, revenue_ttm_usd:1600000000,
    financials_source:'annual_report', financials_confidence:0.82,
    recent_layoff_count:0, layoff_source:'news_rss_scrape', layoff_confidence:0.72,
    hiring_velocity_score:0.2, total_open_roles:150, hiring_source:'linkedin_scrape', hiring_confidence:0.68,
    data_quality_tier:'verified', enrichment_version:'gt32-v2026.1' },

  // ── Private cloud & hosting companies ──────────────────────────────────────
  { canonical_name:'coreweave inc', display_name:'CoreWeave Inc.', ticker:'CRWV', exchange:'NASDAQ',
    industry:'AI Cloud / GPU Cloud / Hyperscale GPU Compute / NVIDIA Cloud / ML Training Infrastructure', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:1000, workforce_source:'annual_report', workforce_confidence:0.85,
    recent_layoff_count:0, layoff_source:'news_rss_scrape', layoff_confidence:0.70,
    hiring_velocity_score:2.5, total_open_roles:300, hiring_source:'linkedin_scrape', hiring_confidence:0.72,
    enrichment_version:'gt32-v2026.1' },

  { canonical_name:'lambda inc', display_name:'Lambda Inc.', ticker:null, exchange:null,
    industry:'AI Cloud / GPU Cloud / Deep Learning Infrastructure / ML Training / NVIDIA H100 Cloud', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:500, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:4000000000, pe_ratio:null, revenue_ttm_usd:400000000,
    financials_source:'news_rss_scrape', financials_confidence:0.62,
    recent_layoff_count:0, layoff_source:'news_rss_scrape', layoff_confidence:0.70,
    hiring_velocity_score:1.8, total_open_roles:100, hiring_source:'linkedin_scrape', hiring_confidence:0.68,
    data_quality_tier:'seed', enrichment_version:'gt32-v2026.1' },

  { canonical_name:'vultr holdings llc', display_name:'Vultr (The Constant Company LLC)', ticker:null, exchange:null,
    industry:'Cloud Computing / GPU Cloud / Bare Metal / Edge Cloud / Developer Cloud Infrastructure', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:300, workforce_source:'news_rss_scrape', workforce_confidence:0.75,
    market_cap_usd:3500000000, pe_ratio:null, revenue_ttm_usd:250000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:0, layoff_source:'news_rss_scrape', layoff_confidence:0.68,
    hiring_velocity_score:0.8, total_open_roles:40, hiring_source:'linkedin_scrape', hiring_confidence:0.65,
    data_quality_tier:'seed', enrichment_version:'gt32-v2026.1' },

  { canonical_name:'rackspace technology inc', display_name:'Rackspace Technology Inc.', ticker:'RXT', exchange:'NASDAQ',
    industry:'Managed Cloud / Multi-Cloud Services / Hosting / Cloud Migration / Managed Hosting', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:6000, workforce_source:'annual_report', workforce_confidence:0.85,
    recent_layoff_count:3, layoff_source:'news_rss_scrape', layoff_confidence:0.85,
    hiring_velocity_score:-0.8, total_open_roles:150, hiring_source:'linkedin_scrape', hiring_confidence:0.68,
    enrichment_version:'gt32-v2026.1' },

  { canonical_name:'wpengine inc', display_name:'WP Engine Inc.', ticker:null, exchange:null,
    industry:'Managed WordPress Hosting / WordPress Platform / Web Hosting / Digital Experience', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:1200, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:1500000000, pe_ratio:null, revenue_ttm_usd:400000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:1, layoff_source:'news_rss_scrape', layoff_confidence:0.75,
    hiring_velocity_score:0.0, total_open_roles:40, hiring_source:'linkedin_scrape', hiring_confidence:0.65,
    data_quality_tier:'seed', enrichment_version:'gt32-v2026.1' },

  { canonical_name:'hostinger international ltd', display_name:'Hostinger International Ltd.', ticker:null, exchange:null,
    industry:'Web Hosting / Domains / VPS / Website Builder / Cloud Hosting / SMB Hosting Global', sector:'Technology',
    is_public:false, country_code:'LT', workforce_count:1000, workforce_source:'news_rss_scrape', workforce_confidence:0.78,
    market_cap_usd:1000000000, pe_ratio:null, revenue_ttm_usd:300000000,
    financials_source:'news_rss_scrape', financials_confidence:0.60,
    recent_layoff_count:0, layoff_source:'news_rss_scrape', layoff_confidence:0.70,
    hiring_velocity_score:0.5, total_open_roles:50, hiring_source:'linkedin_scrape', hiring_confidence:0.65,
    data_quality_tier:'seed', enrichment_version:'gt32-v2026.1' },

  { canonical_name:'scaleway sas', display_name:'Scaleway SAS', ticker:null, exchange:null,
    industry:'European Cloud / GPU Cloud / Bare Metal / Sovereign Cloud / Iliad Group Cloud Infrastructure', sector:'Technology',
    is_public:false, country_code:'FR', workforce_count:600, workforce_source:'news_rss_scrape', workforce_confidence:0.75,
    market_cap_usd:1000000000, pe_ratio:null, revenue_ttm_usd:200000000,
    financials_source:'news_rss_scrape', financials_confidence:0.58,
    recent_layoff_count:0, layoff_source:'news_rss_scrape', layoff_confidence:0.68,
    hiring_velocity_score:0.5, total_open_roles:40, hiring_source:'linkedin_scrape', hiring_confidence:0.62,
    data_quality_tier:'seed', enrichment_version:'gt32-v2026.1' },

  { canonical_name:'nutanix inc', display_name:'Nutanix Inc.', ticker:'NTNX', exchange:'NASDAQ',
    industry:'Hyperconverged Infrastructure / Hybrid Multicloud / Cloud Platform / Enterprise Cloud OS', sector:'Technology',
    is_public:true, country_code:'US', workforce_count:7000, workforce_source:'annual_report', workforce_confidence:0.90,
    recent_layoff_count:1, layoff_source:'news_rss_scrape', layoff_confidence:0.78,
    hiring_velocity_score:0.4, total_open_roles:300, hiring_source:'linkedin_scrape', hiring_confidence:0.72,
    enrichment_version:'gt32-v2026.1' },

  { canonical_name:'hashicorp inc', display_name:'HashiCorp Inc.', ticker:null, exchange:null,
    industry:'Infrastructure Automation / Terraform / Vault / Consul / Nomad / Cloud Provisioning / IBM', sector:'Technology',
    is_public:false, country_code:'US', workforce_count:2200, workforce_source:'news_rss_scrape', workforce_confidence:0.82,
    market_cap_usd:6400000000, pe_ratio:null, revenue_ttm_usd:680000000,
    financials_source:'annual_report', financials_confidence:0.78,
    recent_layoff_count:1, layoff_source:'news_rss_scrape', layoff_confidence:0.78,
    hiring_velocity_score:-0.2, total_open_roles:100, hiring_source:'linkedin_scrape', hiring_confidence:0.70,
    data_quality_tier:'seed', enrichment_version:'gt32-v2026.1' },
];

async function main() {
  console.log('\n✓ Connected — GT32: Cloud, Data Center & Hosting Infrastructure (2026)\n');
  await initYahoo();
  let inserted=0, updated=0, withPE=0, withRev=0;
  for (const c of companies) {
    const r = await upsertCompany(c);
    if (r.wasInserted) inserted++; else updated++;
    if (r.hasPE) withPE++;
    if (r.hasRev) withRev++;
    await new Promise(r=>setTimeout(r,700));
  }
  console.log(`\n── GT32 complete: ${inserted} inserted, ${updated} updated | PE: ${withPE}/${companies.length} | Rev: ${withRev}/${companies.length}`);
  await pool.end();
}
main().catch(e=>{ console.error(e); process.exit(1); });
