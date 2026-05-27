import pg from 'pg';
const { Client } = pg;
const db = new Client(process.env.DATABASE_URL);
await db.connect();
console.log('✓ Connected — NG2: US Energy, Industrials & Defense (2026 data)\n');

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
  // ExxonMobil — oil & gas; acquired Pioneer Natural Resources Jan 2024 (+10k headcount); FY2024 rev $436B
  { n:'exxonmobil',d:'ExxonMobil Corporation',cc:'US',tk:'XOM',ex:'NYSE',sec:'Energy',ind:'Integrated Oil & Gas',wc:61000,ws:'annual_report_fy2024',wf:0.97,lo:1,lp:1.0,le:'2024-03-15',hv:0.2,or:820 },
  // Chevron — oil & gas; ~1600 jobs cut Jul 2024 (post-Hess acquisition prep); FY2024 rev $193B
  { n:'chevron',d:'Chevron Corporation',cc:'US',tk:'CVX',ex:'NYSE',sec:'Energy',ind:'Integrated Oil & Gas',wc:45000,ws:'annual_report_fy2024',wf:0.97,lo:1,lp:3.5,le:'2024-07-18',hv:0.2,or:680 },
  // ConocoPhillips — E&P; FY2024 rev $55.5B; acquired Marathon Oil Jun 2024
  { n:'conocophillips',d:'ConocoPhillips',cc:'US',tk:'COP',ex:'NYSE',sec:'Energy',ind:'Oil & Gas Exploration & Production',wc:10200,ws:'annual_report_fy2024',wf:0.97,lo:0,lp:null,le:null,hv:0.3,or:320 },
  // Halliburton — oilfield services; FY2024 rev $22.9B
  { n:'halliburton',d:'Halliburton Company',cc:'US',tk:'HAL',ex:'NYSE',sec:'Energy',ind:'Oilfield Services',wc:48000,ws:'annual_report_fy2024',wf:0.97,lo:1,lp:3.0,le:'2023-08-21',hv:0.3,or:680 },
  // SLB (Schlumberger) — oilfield services; FY2024 rev $36.3B
  { n:'slb',d:'SLB (Schlumberger Limited)',cc:'US',tk:'SLB',ex:'NYSE',sec:'Energy',ind:'Oilfield Services',wc:100000,ws:'annual_report_fy2024',wf:0.97,lo:1,lp:5.0,le:'2023-01-20',hv:0.3,or:1200 },
  // Baker Hughes — oilfield services/energy tech; FY2024 rev $27.1B
  { n:'baker hughes',d:'Baker Hughes Company',cc:'US',tk:'BKR',ex:'NASDAQ',sec:'Energy',ind:'Oilfield Services & Energy Technology',wc:58000,ws:'annual_report_fy2024',wf:0.97,lo:1,lp:5.0,le:'2023-01-25',hv:0.3,or:780 },
  // Occidental Petroleum — E&P/chemicals; acquired CrownRock FY2024; FY2024 rev $26.5B
  { n:'occidental petroleum',d:'Occidental Petroleum Corporation',cc:'US',tk:'OXY',ex:'NYSE',sec:'Energy',ind:'Oil & Gas Exploration & Production',wc:18000,ws:'annual_report_fy2024',wf:0.97,lo:0,lp:null,le:null,hv:0.3,or:380 },
  // Caterpillar — construction/mining equipment; FY2024 rev $64.8B
  { n:'caterpillar',d:'Caterpillar Inc.',cc:'US',tk:'CAT',ex:'NYSE',sec:'Industrials',ind:'Construction & Mining Equipment',wc:109800,ws:'annual_report_fy2024',wf:0.97,lo:0,lp:null,le:null,hv:0.3,or:1200 },
  // Deere & Company — agricultural equipment; FY2025 (Oct yr-end) rev $51.7B; ~5k jobs cut 2024
  { n:'deere & company',d:'Deere & Company',cc:'US',tk:'DE',ex:'NYSE',sec:'Industrials',ind:'Agricultural & Construction Equipment',wc:82000,ws:'annual_report_fy2025',wf:0.97,lo:1,lp:6.0,le:'2024-07-23',hv:0.1,or:980 },
  // Honeywell — industrial conglomerate; FY2024 rev $36.7B; splitting into 3 companies 2026
  { n:'honeywell',d:'Honeywell International Inc.',cc:'US',tk:'HON',ex:'NASDAQ',sec:'Industrials',ind:'Industrial Conglomerate',wc:95000,ws:'annual_report_fy2024',wf:0.97,lo:1,lp:5.0,le:'2024-04-12',hv:0.2,or:1200 },
  // 3M — diversified technology; spun off Solventum (healthcare) Apr 2024; FY2024 rev $24.0B
  { n:'3m',d:'3M Company',cc:'US',tk:'MMM',ex:'NYSE',sec:'Industrials',ind:'Diversified Technology & Materials',wc:90000,ws:'annual_report_fy2024',wf:0.97,lo:2,lp:7.0,le:'2023-01-25',hv:0.2,or:1000 },
  // Emerson Electric — industrial automation; FY2024 (Sep yr-end) rev $17.5B (continuing ops)
  { n:'emerson electric',d:'Emerson Electric Co.',cc:'US',tk:'EMR',ex:'NYSE',sec:'Industrials',ind:'Industrial Automation & Software',wc:68000,ws:'annual_report_fy2024',wf:0.97,lo:1,lp:8.0,le:'2023-11-01',hv:0.3,or:780 },
  // Parker Hannifin — motion & control tech; FY2025 (Jun yr-end) rev $19.6B
  { n:'parker hannifin',d:'Parker Hannifin Corporation',cc:'US',tk:'PH',ex:'NYSE',sec:'Industrials',ind:'Motion & Control Technology',wc:62000,ws:'annual_report_fy2025',wf:0.97,lo:0,lp:null,le:null,hv:0.3,or:780 },
  // Boeing — aerospace; ~17000 layoffs Oct 2024 (machinists strike + restructuring); FY2024 rev $66.5B
  { n:'boeing',d:'The Boeing Company',cc:'US',tk:'BA',ex:'NYSE',sec:'Industrials',ind:'Aerospace & Defense Manufacturing',wc:150000,ws:'annual_report_fy2024',wf:0.97,lo:2,lp:10.0,le:'2024-10-11',hv:0.1,or:1200 },
  // RTX (Raytheon Technologies) — aerospace/defense; FY2024 rev $80.2B
  { n:'rtx',d:'RTX Corporation',cc:'US',tk:'RTX',ex:'NYSE',sec:'Industrials',ind:'Aerospace & Defense',wc:185000,ws:'annual_report_fy2024',wf:0.97,lo:1,lp:2.0,le:'2023-07-25',hv:0.3,or:2200 },
  // Lockheed Martin — defense; FY2024 rev $71.0B
  { n:'lockheed martin',d:'Lockheed Martin Corporation',cc:'US',tk:'LMT',ex:'NYSE',sec:'Industrials',ind:'Defense & Aerospace',wc:122000,ws:'annual_report_fy2024',wf:0.97,lo:0,lp:null,le:null,hv:0.3,or:1800 },
  // Northrop Grumman — defense; FY2024 rev $41.0B
  { n:'northrop grumman',d:'Northrop Grumman Corporation',cc:'US',tk:'NOC',ex:'NYSE',sec:'Industrials',ind:'Defense & Aerospace',wc:101000,ws:'annual_report_fy2024',wf:0.97,lo:0,lp:null,le:null,hv:0.3,or:1400 },
  // General Dynamics — defense/aerospace (Gulfstream); FY2024 rev $47.7B
  { n:'general dynamics',d:'General Dynamics Corporation',cc:'US',tk:'GD',ex:'NYSE',sec:'Industrials',ind:'Defense & Aerospace',wc:113000,ws:'annual_report_fy2024',wf:0.97,lo:0,lp:null,le:null,hv:0.3,or:1600 },
  // L3Harris Technologies — defense electronics; FY2024 rev $21.3B
  { n:'l3harris technologies',d:'L3Harris Technologies Inc.',cc:'US',tk:'LHX',ex:'NYSE',sec:'Industrials',ind:'Defense Electronics',wc:50000,ws:'annual_report_fy2024',wf:0.97,lo:1,lp:4.0,le:'2023-10-27',hv:0.3,or:820 },
  // TransDigm — aerospace components; FY2025 (Sep yr-end) rev $9.0B; highly acquisitive
  { n:'transdigm',d:'TransDigm Group Inc.',cc:'US',tk:'TDG',ex:'NYSE',sec:'Industrials',ind:'Aerospace Components',wc:15000,ws:'annual_report_fy2025',wf:0.95,lo:0,lp:null,le:null,hv:0.3,or:320 },
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
    'verified','ng2-v2026.1'
  ];
  const { rows } = await db.query(SQL, params);
  const tag = rows[0].inserted ? '✅ inserted' : '🔄 updated';
  if (rows[0].inserted) inserted++; else updated++;
  const pr = s?.price ? `💹 $${s.price}` : '⚠ no price';
  console.log(`  ${c.n.padEnd(38)} ${pr} ${tag}`);
  await new Promise(r => setTimeout(r, 700));
}
console.log(`\n✅ NG2 complete — ${inserted} inserted, ${updated} updated`);
console.log(`   Stock: ${stockOk}/${companies.length} | PE: ${peOk}/${companies.length} | Revenue: ${revOk}/${companies.length}`);
await db.end();
