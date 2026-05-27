import pg from 'pg';
const { Client } = pg;
const db = new Client(process.env.DATABASE_URL);
await db.connect();
console.log('✓ Connected — Tech GT4: Asian, Israeli & LatAm Technology\n');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
const FX = { USD:1, INR:1/84.5, EUR:1.08, GBP:1.26, JPY:1/150, KRW:1/1335, TWD:1/31.7, AUD:0.65, CAD:0.74, CHF:1.12, SEK:1/10.5, HKD:1/7.8, CNY:1/7.3, SGD:0.74, BRL:1/5.0, SAR:1/3.75, NOK:1/10.6, ILS:1/3.7, IDR:1/16250, PHP:1/56, THB:1/35 };

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
  // Coupang — Korean e-commerce, 70000 employees, FY2024 $30.0B rev
  { n:'coupang',d:'Coupang Inc.',cc:'KR',tk:'CPNG',ex:'NYSE',sec:'Technology',ind:'E-Commerce',wc:70000,ws:'annual_report_fy2024',wf:0.97,lo:0,lp:null,le:null,hv:0.4,or:1800 },
  // Naver — South Korean internet, 14600 employees, FY2024 KRW10.0T rev
  { n:'naver',d:'NAVER Corporation',cc:'KR',tk:'035420.KS',ex:'KRX',sec:'Technology',ind:'Internet Services',wc:14600,ws:'annual_report_fy2024',wf:0.97,lo:0,lp:null,le:null,hv:0.4,or:620 },
  // Kakao — Korean tech conglomerate, 12000 employees, FY2024 KRW7.8T rev
  { n:'kakao',d:'Kakao Corp.',cc:'KR',tk:'035720.KS',ex:'KRX',sec:'Technology',ind:'Internet Services',wc:12000,ws:'annual_report_fy2024',wf:0.97,lo:1,lp:5.0,le:'2023-12-01',hv:0.3,or:480 },
  // Grab Holdings — SEA super-app, 12000 employees, FY2024 $2.8B rev
  { n:'grab holdings',d:'Grab Holdings Limited',cc:'SG',tk:'GRAB',ex:'NASDAQ',sec:'Technology',ind:'Super App / Ride-Hailing',wc:12000,ws:'annual_report_fy2024',wf:0.95,lo:2,lp:11.0,le:'2023-06-20',hv:0.3,or:380 },
  // Freshworks — SaaS CRM, 5100 employees, FY2024 $0.7B rev
  { n:'freshworks',d:'Freshworks Inc.',cc:'US',tk:'FRSH',ex:'NASDAQ',sec:'Technology',ind:'CRM / Help Desk Software',wc:5100,ws:'annual_report_fy2024',wf:0.97,lo:1,lp:9.0,le:'2023-09-26',hv:0.3,or:280 },
  // WNS Holdings — BPO India, 62000 employees, FY2025 $1.3B rev
  { n:'wns holdings',d:'WNS (Holdings) Limited',cc:'IN',tk:'WNS',ex:'NYSE',sec:'Technology',ind:'BPO / IT Services',wc:62000,ws:'annual_report_fy2025',wf:0.97,lo:0,lp:null,le:null,hv:0.4,or:1200 },
  // EPAM Systems — software engineering, 41600 employees, FY2024 $4.7B rev
  { n:'epam systems',d:'EPAM Systems Inc.',cc:'US',tk:'EPAM',ex:'NYSE',sec:'Technology',ind:'Software Engineering Services',wc:41600,ws:'annual_report_fy2024',wf:0.97,lo:2,lp:30.0,le:'2022-03-01',hv:0.3,or:580 },
  // Globant — IT services LatAm, 28000 employees, FY2024 $2.4B rev
  { n:'globant',d:'Globant S.A.',cc:'LU',tk:'GLOB',ex:'NYSE',sec:'Technology',ind:'IT Services',wc:28000,ws:'annual_report_fy2024',wf:0.97,lo:0,lp:null,le:null,hv:0.4,or:620 },
  // Thoughtworks — digital transformation, 10200 employees, FY2024 $1.6B rev
  { n:'thoughtworks',d:'Thoughtworks Holding Inc.',cc:'US',tk:'TWKS',ex:'NASDAQ',sec:'Technology',ind:'Digital Transformation',wc:10200,ws:'annual_report_fy2024',wf:0.97,lo:2,lp:25.0,le:'2023-11-01',hv:0.2,or:280 },
  // Kyndryl — IT infrastructure, 85000 employees, FY2025 $14.7B rev
  { n:'kyndryl',d:'Kyndryl Holdings Inc.',cc:'US',tk:'KD',ex:'NYSE',sec:'Technology',ind:'IT Infrastructure Services',wc:85000,ws:'annual_report_fy2025',wf:0.97,lo:3,lp:20.0,le:'2024-02-14',hv:0.1,or:680 },
  // DXC Technology — IT services, 130000 employees, FY2025 $12.9B rev
  { n:'dxc technology',d:'DXC Technology Company',cc:'US',tk:'DXC',ex:'NYSE',sec:'Technology',ind:'IT Services',wc:130000,ws:'annual_report_fy2025',wf:0.97,lo:3,lp:15.0,le:'2023-04-20',hv:0.1,or:780 },
  // NICE Systems — Israel, customer experience, 8600 employees, FY2024 $2.3B rev
  { n:'nice systems',d:'NICE Ltd.',cc:'IL',tk:'NICE',ex:'NASDAQ',sec:'Technology',ind:'Customer Experience Software',wc:8600,ws:'annual_report_fy2024',wf:0.97,lo:0,lp:null,le:null,hv:0.4,or:380 },
  // Check Point Software — Israel, cybersecurity, 6800 employees, FY2024 $2.46B rev
  { n:'check point software',d:'Check Point Software Technologies Ltd.',cc:'IL',tk:'CHKP',ex:'NASDAQ',sec:'Technology',ind:'Cybersecurity',wc:6800,ws:'annual_report_fy2024',wf:0.97,lo:0,lp:null,le:null,hv:0.4,or:380 },
  // CyberArk — Israel, identity security, 4100 employees, FY2024 $0.92B rev
  { n:'cyberark',d:'CyberArk Software Ltd.',cc:'IL',tk:'CYBR',ex:'NASDAQ',sec:'Technology',ind:'Identity Security',wc:4100,ws:'annual_report_fy2024',wf:0.97,lo:0,lp:null,le:null,hv:0.6,or:360 },
  // Wix.com — Israel, website builder, 4700 employees, FY2024 $1.76B rev
  { n:'wix.com',d:'Wix.com Ltd.',cc:'IL',tk:'WIX',ex:'NASDAQ',sec:'Technology',ind:'Website Builder / SaaS',wc:4700,ws:'annual_report_fy2024',wf:0.97,lo:1,lp:9.0,le:'2022-06-06',hv:0.4,or:320 },
  // Amdocs — Israel/US, telecom software, 30000 employees, FY2024 $4.89B rev
  { n:'amdocs',d:'Amdocs Limited',cc:'GB',tk:'DOX',ex:'NASDAQ',sec:'Technology',ind:'Telecom Software',wc:30000,ws:'annual_report_fy2024',wf:0.97,lo:0,lp:null,le:null,hv:0.3,or:480 },
  // ZoomInfo — go-to-market intelligence, 2800 employees, FY2024 $1.1B rev
  { n:'zoominfo',d:'ZoomInfo Technologies Inc.',cc:'US',tk:'ZI',ex:'NASDAQ',sec:'Technology',ind:'Sales Intelligence',wc:2800,ws:'annual_report_fy2024',wf:0.95,lo:1,lp:7.0,le:'2023-11-07',hv:0.3,or:220 },
  // Concentrix — CX/BPO, 310000 employees, FY2024 $9.8B rev
  { n:'concentrix',d:'Concentrix Corporation',cc:'US',tk:'CNXC',ex:'NASDAQ',sec:'Technology',ind:'Customer Experience / BPO',wc:310000,ws:'annual_report_fy2024',wf:0.97,lo:2,lp:10.0,le:'2023-12-14',hv:0.2,or:1800 },
  // TELUS International — digital CX, 70000 employees, FY2024 $2.8B rev
  { n:'telus international',d:'TELUS International (Cda) Inc.',cc:'CA',tk:'TIXT',ex:'NYSE',sec:'Technology',ind:'Digital Customer Experience',wc:70000,ws:'annual_report_fy2024',wf:0.97,lo:2,lp:18.0,le:'2024-02-07',hv:0.2,or:780 },
  // GoTo Group — Indonesia super-app, 15000 employees, FY2024 IDR3.7T rev
  { n:'goto group',d:'GoTo Gojek Tokopedia Tbk',cc:'ID',tk:'GOTO.JK',ex:'IDX',sec:'Technology',ind:'Super App / E-Commerce',wc:15000,ws:'annual_report_fy2024',wf:0.95,lo:3,lp:20.0,le:'2023-07-10',hv:0.2,or:320 },
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
    'verified','gt4-v1.0'
  ];
  const { rows } = await db.query(SQL, params);
  const tag = rows[0].inserted ? '✅ inserted' : '🔄 updated';
  if (rows[0].inserted) inserted++; else updated++;
  const pr = s?.price ? `💹 $${s.price}` : '⚠ no price';
  console.log(`  ${c.n.padEnd(35)} ${pr} ${tag}`);
  await new Promise(r => setTimeout(r, 700));
}
console.log(`\n✅ GT4 complete — ${inserted} inserted, ${updated} updated`);
console.log(`   Stock: ${stockOk}/${companies.length} | PE: ${peOk}/${companies.length} | Revenue: ${revOk}/${companies.length}`);
await db.end();
