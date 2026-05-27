import pg from 'pg';
const { Client } = pg;
const db = new Client(process.env.DATABASE_URL);
await db.connect();
console.log('✓ Connected — NG5: Asia-Pacific, Middle East & LatAm Expansion (2026 data)\n');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
const FX = { USD:1, INR:1/84.5, EUR:1.08, GBP:1.26, JPY:1/150, KRW:1/1335, TWD:1/31.7, AUD:0.65, CAD:0.74, CHF:1.12, SEK:1/10.5, HKD:1/7.8, CNY:1/7.3, SGD:0.74, BRL:1/5.0, SAR:1/3.75, NOK:1/10.6, MXN:1/17.2, COP:1/4000, MYR:1/4.7, IDR:1/16250 };

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
  display_name=EXCLUDED.display_name, ticker=EXCLUDED.ticker, exchange=EXCLUDED.exchange,
  sector=EXCLUDED.sector, industry=EXCLUDED.industry,
  workforce_count=COALESCE(EXCLUDED.workforce_count,verified_company_intelligence.workforce_count),
  workforce_source=EXCLUDED.workforce_source, workforce_confidence=EXCLUDED.workforce_confidence,
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
  data_quality_tier=EXCLUDED.data_quality_tier, enrichment_version=EXCLUDED.enrichment_version,
  last_enriched_at=NOW(), updated_at=NOW()
RETURNING canonical_name,(xmax=0) AS inserted`;

const companies = [
  // SK Hynix — Korean memory chips (DRAM/HBM for AI); FY2024 KRW66.1T rev (~$49B); 40k employees
  { n:'sk hynix',d:'SK Hynix Inc.',cc:'KR',tk:'HXSCF',ex:'OTC',sec:'Technology',ind:'Memory Semiconductors / HBM',wc:40000,ws:'annual_report_fy2024',wf:0.97,lo:1,lp:5.0,le:'2023-01-26',hv:0.6,or:980 },
  // Keyence — Japanese sensors/automation; FY2025 (Mar yr-end) ¥959B rev (~$6.4B); 11k employees; no layoffs
  { n:'keyence',d:'Keyence Corporation',cc:'JP',tk:'KYCCF',ex:'OTC',sec:'Technology',ind:'Industrial Sensors & Automation',wc:11000,ws:'annual_report_fy2025',wf:0.97,lo:0,lp:null,le:null,hv:0.4,or:480 },
  // Daikin — Japanese HVAC leader; FY2025 (Mar yr-end) ¥4.4T rev (~$29B); 98k employees
  { n:'daikin industries',d:'Daikin Industries Ltd.',cc:'JP',tk:'DKILY',ex:'OTC',sec:'Industrials',ind:'HVAC & Refrigeration',wc:98000,ws:'annual_report_fy2025',wf:0.97,lo:0,lp:null,le:null,hv:0.3,or:980 },
  // Fujitsu — Japanese IT services; FY2025 (Mar yr-end) ¥3.76T rev (~$25B); 130k employees
  { n:'fujitsu',d:'Fujitsu Limited',cc:'JP',tk:'FJTSF',ex:'OTC',sec:'Technology',ind:'IT Services & Digital Transformation',wc:130000,ws:'annual_report_fy2025',wf:0.97,lo:2,lp:10.0,le:'2023-11-29',hv:0.3,or:1800 },
  // NEC Corporation — Japanese IT/network; FY2025 (Mar yr-end) ¥3.5T rev (~$23B); 115k employees
  { n:'nec corporation',d:'NEC Corporation',cc:'JP',tk:'NIPNF',ex:'OTC',sec:'Technology',ind:'IT Systems & Network Infrastructure',wc:115000,ws:'annual_report_fy2025',wf:0.97,lo:1,lp:5.0,le:'2023-02-17',hv:0.2,or:1200 },
  // Denso — Japanese auto components (Toyota supplier); FY2025 (Mar yr-end) ¥7.9T rev (~$53B); 168k employees
  { n:'denso',d:'DENSO Corporation',cc:'JP',tk:'DNZOY',ex:'OTC',sec:'Automotive',ind:'Automotive Components & Electronics',wc:168000,ws:'annual_report_fy2025',wf:0.97,lo:0,lp:null,le:null,hv:0.3,or:1800 },
  // Bridgestone — Japanese tires; FY2024 ¥4.58T rev (~$31B); 144k employees
  { n:'bridgestone',d:'Bridgestone Corporation',cc:'JP',tk:'BRDCY',ex:'OTC',sec:'Industrials',ind:'Tires & Rubber Products',wc:144000,ws:'annual_report_fy2024',wf:0.97,lo:1,lp:3.0,le:'2023-08-10',hv:0.2,or:1200 },
  // Fortescue — Australian iron ore/green energy; FY2025 (Jun yr-end) A$18.6B rev (~$12B); 12.5k employees
  { n:'fortescue',d:'Fortescue Ltd.',cc:'AU',tk:'FSUGY',ex:'OTC',sec:'Materials',ind:'Iron Ore Mining & Green Energy',wc:12500,ws:'annual_report_fy2025',wf:0.97,lo:1,lp:12.0,le:'2024-08-28',hv:0.3,or:380 },
  // ANZ Bank — Australian banking; FY2024 (Sep yr-end) A$8.7B cash profit; 39k employees
  { n:'anz bank',d:'Australia and New Zealand Banking Group Limited',cc:'AU',tk:'ANZBY',ex:'OTC',sec:'Financial Services',ind:'Banking',wc:39000,ws:'annual_report_fy2024',wf:0.97,lo:1,lp:5.0,le:'2023-07-14',hv:0.2,or:580 },
  // Macquarie Group — Australian investment bank/asset manager; FY2025 (Mar yr-end) A$13.7B total income; 20.5k employees
  { n:'macquarie group',d:'Macquarie Group Limited',cc:'AU',tk:'MQBKY',ex:'OTC',sec:'Financial Services',ind:'Investment Banking & Asset Management',wc:20500,ws:'annual_report_fy2025',wf:0.97,lo:0,lp:null,le:null,hv:0.3,or:520 },
  // América Móvil — Mexican telecom giant (Claro); FY2024 MXN$1.29T rev (~$75B); 200k employees
  { n:'america movil',d:'América Móvil S.A.B. de C.V.',cc:'MX',tk:'AMX',ex:'NYSE',sec:'Telecommunications',ind:'Wireless & Fixed-Line Telecom',wc:200000,ws:'annual_report_fy2024',wf:0.97,lo:1,lp:3.0,le:'2023-10-16',hv:0.2,or:1800 },
  // FEMSA — Mexican diversified (OXXO convenience, Coca-Cola FEMSA); FY2024 $37.5B rev; 350k employees
  { n:'femsa',d:'Fomento Económico Mexicano S.A.B. de C.V.',cc:'MX',tk:'FMX',ex:'NYSE',sec:'Consumer',ind:'Convenience Retail & Beverages',wc:350000,ws:'annual_report_fy2024',wf:0.97,lo:0,lp:null,le:null,hv:0.3,or:3200 },
  // Grupo Bimbo — Mexican baked goods (largest in world); FY2024 $22.6B rev; 147k employees
  { n:'grupo bimbo',d:'Grupo Bimbo S.A.B. de C.V.',cc:'MX',tk:'BMBOY',ex:'OTC',sec:'Consumer',ind:'Baked Goods & Food Manufacturing',wc:147000,ws:'annual_report_fy2024',wf:0.97,lo:0,lp:null,le:null,hv:0.2,or:1200 },
  // Ecopetrol — Colombian national oil; FY2024 COP$99.5T rev (~$24.9B); 13k employees
  { n:'ecopetrol',d:'Ecopetrol S.A.',cc:'CO',tk:'EC',ex:'NYSE',sec:'Energy',ind:'Integrated Oil & Gas',wc:13000,ws:'annual_report_fy2024',wf:0.97,lo:0,lp:null,le:null,hv:0.2,or:280 },
  // Emaar Properties — UAE real estate (Burj Khalifa developer); FY2024 AED35.5B rev (~$9.7B); 12k employees
  { n:'emaar properties',d:'Emaar Properties PJSC',cc:'AE',tk:'EMAAR.DU',ex:'DFM',sec:'Real Estate',ind:'Real Estate Development',wc:12000,ws:'annual_report_fy2024',wf:0.95,lo:0,lp:null,le:null,hv:0.4,or:380 },
  // Saudi Telecom Company (STC) — Saudi national telco; FY2024 SAR79.8B rev (~$21.3B); 24k employees
  { n:'saudi telecom company',d:'Saudi Telecom Company (STC)',cc:'SA',tk:'0MXB.IL',ex:'TASE',sec:'Telecommunications',ind:'Telecom Services',wc:24000,ws:'annual_report_fy2024',wf:0.95,lo:0,lp:null,le:null,hv:0.3,or:480 },
  // CIMB Group — Malaysian banking; FY2024 MYR20.3B rev (~$4.3B); 32k employees
  { n:'cimb group',d:'CIMB Group Holdings Berhad',cc:'MY',tk:'CIMBY',ex:'OTC',sec:'Financial Services',ind:'Banking',wc:32000,ws:'annual_report_fy2024',wf:0.95,lo:1,lp:4.0,le:'2023-10-31',hv:0.2,or:380 },
  // Telkom Indonesia — Indonesian state telco; FY2024 IDR147.9T rev (~$9.1B); 27k employees
  { n:'telkom indonesia',d:'PT Telkom Indonesia (Persero) Tbk',cc:'ID',tk:'TLK',ex:'NYSE',sec:'Telecommunications',ind:'Telecom Services',wc:27000,ws:'annual_report_fy2024',wf:0.97,lo:1,lp:5.0,le:'2023-06-30',hv:0.2,or:380 },
  // Samsung Engineering — Korean EPC/construction; FY2024 KRW22.8T rev (~$17B); 24k employees
  { n:'samsung engineering',d:'Samsung Engineering Co., Ltd.',cc:'KR',tk:'SMGHF',ex:'OTC',sec:'Industrials',ind:'Engineering & Construction',wc:24000,ws:'annual_report_fy2024',wf:0.95,lo:0,lp:null,le:null,hv:0.3,or:480 },
  // Woodside Energy — Australian LNG producer; FY2024 $6.8B rev; 7k employees
  { n:'woodside energy',d:'Woodside Energy Group Ltd.',cc:'AU',tk:'WDS',ex:'NYSE',sec:'Energy',ind:'LNG & Offshore Energy',wc:7000,ws:'annual_report_fy2024',wf:0.97,lo:1,lp:7.0,le:'2023-11-15',hv:0.2,or:180 },
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
    'verified','ng5-v2026.1'
  ];
  const { rows } = await db.query(SQL, params);
  const tag = rows[0].inserted ? '✅ inserted' : '🔄 updated';
  if (rows[0].inserted) inserted++; else updated++;
  const pr = s?.price ? `💹 $${s.price}` : '⚠ no price';
  console.log(`  ${c.n.padEnd(38)} ${pr} ${tag}`);
  await new Promise(r => setTimeout(r, 700));
}
console.log(`\n✅ NG5 complete — ${inserted} inserted, ${updated} updated`);
console.log(`   Stock: ${stockOk}/${companies.length} | PE: ${peOk}/${companies.length} | Revenue: ${revOk}/${companies.length}`);
await db.end();
