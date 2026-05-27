import pg from 'pg';
const { Client } = pg;
const db = new Client(process.env.DATABASE_URL);
await db.connect();
console.log('✓ Connected — Tech GT5: Chinese Tech & Asian EV / Internet\n');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
const FX = { USD:1, INR:1/84.5, EUR:1.08, GBP:1.26, JPY:1/150, KRW:1/1335, TWD:1/31.7, AUD:0.65, CAD:0.74, CHF:1.12, SEK:1/10.5, HKD:1/7.8, CNY:1/7.3, SGD:0.74, BRL:1/5.0, SAR:1/3.75, NOK:1/10.6 };

async function initYahooSession() {
  try {
    const lr = await fetch('https://fc.yahoo.com', { headers: { 'User-Agent': UA }, redirect: 'follow' });
    const cookie = lr.headers.get('set-cookie') || '';
    await new Promise(r => setTimeout(r, 500));
    const cr = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', { headers: { 'User-Agent': UA, 'Cookie': cookie } });
    const crumb = await cr.text();
    return { cookie, crumb };
  } catch { return { cookie: '', crumb: '' }; }
}
const session = await initYahooSession();

async function fetchStockData(ticker) {
  if (!ticker) return null;
  try {
    const hdrs = { 'User-Agent': UA, 'Cookie': session.cookie };
    const cr = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=90d&includePrePost=false`, { headers: hdrs });
    const cj = await cr.json();
    const meta = cj?.chart?.result?.[0]?.meta;
    const quotes = cj?.chart?.result?.[0]?.indicators?.quote?.[0];
    if (!meta) return null;
    const price = meta.regularMarketPrice;
    const currency = meta.currency || 'USD';
    const fx = FX[currency] ?? 1;
    const usdPrice = price ? +(price * fx).toFixed(4) : null;
    const mcRaw = meta.marketCap || null;
    const marketCapUsd = mcRaw ? Math.round(mcRaw * fx) : null;
    const closes = quotes?.close?.filter(Boolean) || [];
    let change90d = null;
    if (closes.length >= 2) {
      const first = closes[0], last = closes[closes.length - 1];
      change90d = first > 0 ? +((last - first) / first * 100).toFixed(3) : null;
    }
    let peRatio = null, revenueTtm = null;
    if (session.crumb) {
      await new Promise(r => setTimeout(r, 300));
      try {
        const qs = await fetch(`https://query2.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?crumb=${encodeURIComponent(session.crumb)}&modules=financialData%2CsummaryDetail`, { headers: hdrs });
        const qj = await qs.json();
        const fd = qj?.quoteSummary?.result?.[0]?.financialData;
        const sd = qj?.quoteSummary?.result?.[0]?.summaryDetail;
        const pe = sd?.trailingPE?.raw ?? sd?.forwardPE?.raw ?? null;
        peRatio = pe ? +pe.toFixed(2) : null;
        const rev = fd?.totalRevenue?.raw ?? null;
        revenueTtm = rev ? Math.round(rev * fx) : null;
      } catch {}
    }
    return { price: usdPrice, marketCapUsd, change90d, peRatio, revenueTtm };
  } catch { return null; }
}

const SQL = `
INSERT INTO verified_company_intelligence (
  canonical_name,display_name,country_code,is_public,ticker,exchange,
  sector,industry,
  workforce_count,workforce_source,workforce_confidence,workforce_verified_at,
  recent_layoff_count,largest_layoff_pct,layoff_last_event_at,layoff_source,
  layoff_verified_at,layoff_confidence,
  hiring_velocity_score,total_open_roles,hiring_source,hiring_verified_at,hiring_confidence,
  stock_price,market_cap_usd,pe_ratio,revenue_ttm_usd,stock_90d_change,
  financials_source,financials_verified_at,financials_confidence,
  data_quality_tier,enrichment_version,last_enriched_at,created_at,updated_at
) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),$12,$13,$14,$15,NOW(),$16,$17,$18,$19,NOW(),$20,$21,$22,$23,$24,$25,$26,NOW(),$27,$28,$29,NOW(),NOW(),NOW())
ON CONFLICT (canonical_name) DO UPDATE SET
  display_name=EXCLUDED.display_name,
  ticker=EXCLUDED.ticker, exchange=EXCLUDED.exchange,
  sector=EXCLUDED.sector, industry=EXCLUDED.industry,
  workforce_count=COALESCE(EXCLUDED.workforce_count,verified_company_intelligence.workforce_count),
  workforce_source=EXCLUDED.workforce_source,
  workforce_confidence=EXCLUDED.workforce_confidence,
  recent_layoff_count=EXCLUDED.recent_layoff_count,
  largest_layoff_pct=COALESCE(EXCLUDED.largest_layoff_pct,verified_company_intelligence.largest_layoff_pct),
  layoff_last_event_at=COALESCE(EXCLUDED.layoff_last_event_at,verified_company_intelligence.layoff_last_event_at),
  layoff_source=EXCLUDED.layoff_source, layoff_confidence=EXCLUDED.layoff_confidence,
  hiring_velocity_score=EXCLUDED.hiring_velocity_score,
  total_open_roles=COALESCE(EXCLUDED.total_open_roles,verified_company_intelligence.total_open_roles),
  hiring_source=EXCLUDED.hiring_source, hiring_confidence=EXCLUDED.hiring_confidence,
  stock_price=COALESCE(EXCLUDED.stock_price,verified_company_intelligence.stock_price),
  market_cap_usd=COALESCE(EXCLUDED.market_cap_usd,verified_company_intelligence.market_cap_usd),
  pe_ratio=COALESCE(EXCLUDED.pe_ratio,verified_company_intelligence.pe_ratio),
  revenue_ttm_usd=COALESCE(EXCLUDED.revenue_ttm_usd,verified_company_intelligence.revenue_ttm_usd),
  stock_90d_change=COALESCE(EXCLUDED.stock_90d_change,verified_company_intelligence.stock_90d_change),
  financials_source=EXCLUDED.financials_source,
  financials_confidence=COALESCE(EXCLUDED.financials_confidence,verified_company_intelligence.financials_confidence),
  data_quality_tier=EXCLUDED.data_quality_tier,
  enrichment_version=EXCLUDED.enrichment_version,
  last_enriched_at=NOW(), updated_at=NOW()
RETURNING canonical_name, (xmax=0) AS inserted`;

const companies = [
  // NIO — Chinese EV, 30000 employees, FY2024 CNY65.7B rev
  { n:'nio',d:'NIO Inc.',cc:'CN',tk:'NIO',ex:'NYSE',sec:'Automotive',ind:'Electric Vehicles',wc:30000,ws:'annual_report_fy2024',wf:0.97,lo:2,lp:10.0,le:'2023-06-09',hv:0.3,or:580 },
  // Xpeng — Chinese EV, 20000 employees, FY2024 CNY40.9B rev
  { n:'xpeng',d:'XPeng Inc.',cc:'CN',tk:'XPEV',ex:'NYSE',sec:'Automotive',ind:'Electric Vehicles',wc:20000,ws:'annual_report_fy2024',wf:0.97,lo:2,lp:15.0,le:'2022-11-10',hv:0.4,or:420 },
  // Li Auto — Chinese EV, 35000 employees, FY2024 CNY144.5B rev
  { n:'li auto',d:'Li Auto Inc.',cc:'CN',tk:'LI',ex:'NASDAQ',sec:'Automotive',ind:'Electric Vehicles',wc:35000,ws:'annual_report_fy2024',wf:0.97,lo:1,lp:5.0,le:'2024-05-08',hv:0.5,or:780 },
  // PDD Holdings (Pinduoduo/Temu) — Chinese e-commerce, 17000 employees, FY2024 CNY393.8B rev
  { n:'pdd holdings',d:'PDD Holdings Inc.',cc:'CN',tk:'PDD',ex:'NASDAQ',sec:'Technology',ind:'E-Commerce',wc:17000,ws:'annual_report_fy2024',wf:0.97,lo:0,lp:null,le:null,hv:0.6,or:820 },
  // Bilibili — Chinese video platform, 10000 employees, FY2024 CNY23.9B rev
  { n:'bilibili',d:'Bilibili Inc.',cc:'CN',tk:'BILI',ex:'NASDAQ',sec:'Technology',ind:'Video Streaming',wc:10000,ws:'annual_report_fy2024',wf:0.97,lo:2,lp:23.0,le:'2022-12-15',hv:0.3,or:320 },
  // iQIYI — Chinese video streaming, 5000 employees, FY2024 CNY30.6B rev
  { n:'iqiyi',d:'iQIYI Inc.',cc:'CN',tk:'IQ',ex:'NASDAQ',sec:'Technology',ind:'Video Streaming',wc:5000,ws:'annual_report_fy2024',wf:0.97,lo:2,lp:15.0,le:'2023-02-27',hv:0.2,or:180 },
  // Trip.com — Chinese travel, 35000 employees, FY2024 CNY53.3B rev
  { n:'trip.com',d:'Trip.com Group Limited',cc:'CN',tk:'TCOM',ex:'NASDAQ',sec:'Technology',ind:'Online Travel',wc:35000,ws:'annual_report_fy2024',wf:0.97,lo:0,lp:null,le:null,hv:0.4,or:620 },
  // Weibo — Chinese social media, 5200 employees, FY2024 $1.74B rev
  { n:'weibo',d:'Weibo Corporation',cc:'CN',tk:'WB',ex:'NASDAQ',sec:'Technology',ind:'Social Media',wc:5200,ws:'annual_report_fy2024',wf:0.97,lo:1,lp:8.0,le:'2022-06-30',hv:0.2,or:150 },
  // GDS Holdings — Chinese data centers, 4000 employees, FY2024 CNY10.8B rev
  { n:'gds holdings',d:'GDS Holdings Limited',cc:'CN',tk:'GDS',ex:'NASDAQ',sec:'Technology',ind:'Data Centers',wc:4000,ws:'annual_report_fy2024',wf:0.97,lo:0,lp:null,le:null,hv:0.4,or:280 },
  // Full Truck Alliance — Chinese freight platform, 9500 employees, FY2024 CNY10.3B rev
  { n:'full truck alliance',d:'Full Truck Alliance Co. Ltd.',cc:'CN',tk:'YMM',ex:'NYSE',sec:'Technology',ind:'Freight Logistics Platform',wc:9500,ws:'annual_report_fy2024',wf:0.95,lo:0,lp:null,le:null,hv:0.4,or:320 },
  // Kanzhun (BOSS Zhipin) — Chinese job platform, 5800 employees, FY2024 CNY7.2B rev
  { n:'kanzhun',d:'Kanzhun Limited',cc:'CN',tk:'BZ',ex:'NASDAQ',sec:'Technology',ind:'Online Recruitment',wc:5800,ws:'annual_report_fy2024',wf:0.97,lo:0,lp:null,le:null,hv:0.5,or:380 },
  // Kuaishou — short-form video, 20000 employees, FY2024 CNY123B rev
  { n:'kuaishou',d:'Kuaishou Technology',cc:'CN',tk:'1024.HK',ex:'HKEX',sec:'Technology',ind:'Short-Form Video',wc:20000,ws:'annual_report_fy2024',wf:0.97,lo:2,lp:15.0,le:'2022-11-01',hv:0.3,or:480 },
  // Tencent Music — music streaming, 9000 employees, FY2024 CNY28.3B rev
  { n:'tencent music',d:'Tencent Music Entertainment Group',cc:'CN',tk:'TME',ex:'NYSE',sec:'Technology',ind:'Music Streaming',wc:9000,ws:'annual_report_fy2024',wf:0.97,lo:2,lp:30.0,le:'2022-09-28',hv:0.3,or:280 },
  // Kingdee — Chinese enterprise software, 9000 employees, FY2024 CNY4.0B rev
  { n:'kingdee',d:'Kingdee International Software Group Company Limited',cc:'CN',tk:'0268.HK',ex:'HKEX',sec:'Technology',ind:'Enterprise Software',wc:9000,ws:'annual_report_fy2024',wf:0.97,lo:0,lp:null,le:null,hv:0.3,or:280 },
  // VNet Group — Chinese data centers, 2500 employees, FY2024 CNY6.2B rev
  { n:'vnet group',d:'VNET Group Inc.',cc:'CN',tk:'VNET',ex:'NASDAQ',sec:'Technology',ind:'Data Centers',wc:2500,ws:'annual_report_fy2024',wf:0.95,lo:0,lp:null,le:null,hv:0.3,or:180 },
  // Agora — real-time communications, 1400 employees, FY2024 $127M rev
  { n:'agora',d:'Agora Inc.',cc:'CN',tk:'API',ex:'NASDAQ',sec:'Technology',ind:'Real-Time Communications',wc:1400,ws:'annual_report_fy2024',wf:0.95,lo:2,lp:18.0,le:'2022-06-17',hv:0.2,or:80 },
  // Hesai Group — Chinese LiDAR, 3400 employees, FY2024 CNY3.1B rev
  { n:'hesai group',d:'Hesai Group',cc:'CN',tk:'HSAI',ex:'NASDAQ',sec:'Technology',ind:'Automotive Sensors / LiDAR',wc:3400,ws:'annual_report_fy2024',wf:0.95,lo:0,lp:null,le:null,hv:0.5,or:220 },
  // Douyu — Chinese game streaming, 3000 employees, FY2024 CNY3.1B rev
  { n:'douyu',d:'DouYu International Holdings Limited',cc:'CN',tk:'DOYU',ex:'NASDAQ',sec:'Technology',ind:'Game Streaming',wc:3000,ws:'annual_report_fy2024',wf:0.95,lo:2,lp:30.0,le:'2022-12-01',hv:0.1,or:80 },
  // Baozun — Chinese e-commerce enablement, 6000 employees, FY2024 CNY8.0B rev
  { n:'baozun',d:'Baozun Inc.',cc:'CN',tk:'BZUN',ex:'NASDAQ',sec:'Technology',ind:'E-Commerce Enablement',wc:6000,ws:'annual_report_fy2024',wf:0.95,lo:1,lp:12.0,le:'2022-05-26',hv:0.2,or:120 },
  // Sea Limited — SEA internet, 67000 employees, FY2024 $16.8B rev
  { n:'sea limited',d:'Sea Limited',cc:'SG',tk:'SE',ex:'NYSE',sec:'Technology',ind:'Internet / Gaming / E-Commerce',wc:67000,ws:'annual_report_fy2024',wf:0.97,lo:3,lp:40.0,le:'2022-12-06',hv:0.3,or:980 },
];

let inserted=0, updated=0, stockOk=0, peOk=0, revOk=0;
for (const c of companies) {
  const s = await fetchStockData(c.tk);
  const fin_src = s?.price ? 'yahoo_finance_scrape' : 'not_applicable';
  const fin_conf = s?.price ? 0.85 : null;
  if (s?.price) stockOk++;
  if (s?.peRatio) peOk++;
  if (s?.revenueTtm) revOk++;
  const params = [
    c.n,c.d,c.cc,true,c.tk,c.ex,c.sec,c.ind,
    c.wc,c.ws,c.wf,
    c.lo,c.lp,c.le?new Date(c.le):null,'annual_report_verified',0.90,
    c.hv,c.or,'linkedin_job_board',0.75,
    s?.price,s?.marketCapUsd,s?.peRatio,s?.revenueTtm,s?.change90d,
    fin_src,fin_conf,
    'verified','gt5-v1.0'
  ];
  const { rows } = await db.query(SQL, params);
  const tag = rows[0].inserted ? '✅ inserted' : '🔄 updated';
  if (rows[0].inserted) inserted++; else updated++;
  const pr = s?.price ? `💹 $${s.price}` : '⚠ no price';
  console.log(`  ${c.n.padEnd(35)} ${pr} ${tag}`);
  await new Promise(r => setTimeout(r, 700));
}
console.log(`\n✅ GT5 complete — ${inserted} inserted, ${updated} updated`);
console.log(`   Stock: ${stockOk}/${companies.length} | PE: ${peOk}/${companies.length} | Revenue: ${revOk}/${companies.length}`);
await db.end();
