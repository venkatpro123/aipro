// GLOBAL Wave 2 — Asia (Japan, Korea, Taiwan, SEA, China/HK). Real listed cos, 2026 estimates (seed).
import pg from 'pg';
import fs from 'fs';
import { runValidatedGlobalBatch } from './_gt-validator-global.mjs';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const existing = new Set(JSON.parse(fs.readFileSync('scripts/_existing-names.json','utf8')));

const g = (v) => (rows) => rows.map(([cn,dn,tk,ex,cc,sec,ind,wf,mcM,revM,lay=0]) => ({
  canonical_name:cn, display_name:dn, ticker:tk, exchange:ex, country_code:cc,
  sector:sec, industry:ind, is_public:true,
  workforce_count:wf, workforce_source:'annual_report', workforce_confidence:0.7,
  market_cap_usd:Math.round(mcM*1e6), pe_ratio:null, revenue_ttm_usd:Math.round(revM*1e6),
  financials_source:'exchange_filing', financials_confidence:0.65,
  recent_layoff_count:lay, layoff_confidence:0.6,
  hiring_velocity_score:0.5, total_open_roles:Math.round(wf*0.03),
  data_quality_tier:'seed', enrichment_version:v,
}));
const V='glob-w2-v2026.1';

const japan = g(V)([
  ['lasertec semiconductor','Lasertec Corporation','6920','TYO','JP','Technology','Semiconductors / Inspection Equipment / Japan',700,12000,1600],
  ['disco abrasives','DISCO Corporation','6146','TYO','JP','Technology','Semiconductors / Dicing & Grinding / Japan',6500,30000,2400],
  ['shimano cycling','Shimano Inc','7309','TYO','JP','Consumer Discretionary','Cycling Components / Fishing Gear / Japan',12000,22000,3000],
  ['nidec motors','Nidec Corporation','6594','TYO','JP','Industrials','Electric Motors / Precision / Japan',106000,28000,16000],
  ['obic software','OBIC Co Ltd','4684','TYO','JP','Technology','Enterprise Software / ERP / Japan',2200,22000,800],
  ['mercari marketplace','Mercari Inc','4385','TYO','JP','Consumer Discretionary','E-commerce / C2C Marketplace / Japan',2000,3000,1100],
  ['sysmex diagnostics','Sysmex Corporation','6869','TYO','JP','Healthcare','Medical Diagnostics / Hematology / Japan',10000,12000,2700],
  ['nexon games','Nexon Co Ltd','3659','TYO','JP','Consumer Discretionary','Gaming / Online Games / Japan',7500,18000,2700],
]);

const korea = g(V)([
  ['krafton games','KRAFTON Inc','259960','KRX','KR','Consumer Discretionary','Gaming / Battle Royale / Korea',3500,12000,1800],
  ['hybe entertainment','HYBE Co Ltd','352820','KRX','KR','Communications','Entertainment / K-Pop / Music / Korea',2500,7000,1700],
  ['ecopro battery','Ecopro BM Co Ltd','247540','KRX','KR','Materials','Battery Materials / Cathodes / Korea',3000,12000,5000,300],
  ['pearl abyss games','Pearl Abyss Corp','263750','KRX','KR','Consumer Discretionary','Gaming / MMORPG / Korea',1600,3000,300],
  ['kakaopay fintech','Kakao Pay Corp','377300','KRX','KR','Financial Technology','Payments / Fintech / Korea',1100,4000,500],
  ['leeno industrial','Leeno Industrial Inc','058470','KRX','KR','Technology','Semiconductors / Test Probes / Korea',1200,3000,250],
]);

const taiwan = g(V)([
  ['alchip asic','Alchip Technologies Ltd','3661','TWO','TW','Technology','Semiconductors / ASIC Design / Taiwan',700,15000,1500],
  ['voltronic power','Voltronic Power Technology Corp','6409','TWO','TW','Industrials','Power Electronics / UPS Inverters / Taiwan',1800,5000,1200],
  ['parade technologies','Parade Technologies Ltd','4966','TWO','TW','Technology','Semiconductors / Display ICs / Taiwan',900,6000,600],
  ['eMemory technology','eMemory Technology Inc','3529','TWO','TW','Technology','Semiconductors / IP Licensing / Taiwan',400,8000,300],
  ['gold circuit electronics','Gold Circuit Electronics Ltd','2368','TWO','TW','Technology','PCB Manufacturing / Electronics / Taiwan',9000,3000,1900],
]);

const sea = g(V)([
  ['bukalapak ecommerce','PT Bukalapak.com Tbk','BUKA','IDX','ID','Consumer Discretionary','E-commerce / Marketplace / Indonesia',2500,1500,600,400],
  ['bank jago digital','PT Bank Jago Tbk','ARTO','IDX','ID','Financials','Digital Banking / Fintech / Indonesia',1500,4000,300],
  ['delta electronics thailand','Delta Electronics (Thailand) PCL','DELTA','SET','TH','Technology','Power Electronics / EV Components / Thailand',12000,40000,4200],
  ['gulf energy','Gulf Energy Development PCL','GULF','SET','TH','Energy','Power Generation / Energy / Thailand',3500,30000,3300],
  ['fpt corporation','FPT Corporation','FPT','HOSE','VN','Technology','IT Services / Software Outsourcing / Vietnam',48000,9000,2400],
  ['vietcombank','Joint Stock Commercial Bank for Foreign Trade of Vietnam','VCB','HOSE','VN','Financials','Banking / Commercial Bank / Vietnam',23000,22000,9000],
  ['mr diy retail','Mr DIY Group Bhd','MRDIY','KLSE','MY','Consumer Discretionary','Retail / Home Improvement / Malaysia',12000,5000,1100],
  ['converge ict','Converge ICT Solutions Inc','CNVRG','PSE','PH','Communications','Telecom / Fiber Broadband / Philippines',3500,3500,800],
  ['sea limited gaming','Sea Limited','SE','NYSE','SG','Technology','Internet / Gaming & E-commerce / Singapore',67000,80000,17000],
  ['grab holdings','Grab Holdings Ltd','GRAB','NASDAQ','SG','Technology','Super App / Mobility & Delivery / Singapore',11000,18000,2800],
]);

const china_hk = g(V)([
  ['li auto ev','Li Auto Inc','LI','NASDAQ','CN','Consumer Discretionary','Electric Vehicles / Automotive / China',43000,30000,21000],
  ['kanzhun recruitment','Kanzhun Ltd (BOSS Zhipin)','BZ','NASDAQ','CN','Technology','Online Recruitment / HR Tech / China',5400,9000,1000],
  ['full truck alliance','Full Truck Alliance Co Ltd','YMM','NYSE','CN','Technology','Logistics / Freight Platform / China',3500,9000,1600],
  ['beigene biotech','BeiGene Ltd','ONC','NASDAQ','CN','Healthcare','Biotech / Oncology / China',11000,25000,3800],
  ['gds data centers','GDS Holdings Ltd','GDS','NASDAQ','CN','Technology','Data Centers / Cloud Infrastructure / China',4000,5000,1500],
  ['techtronic tools','Techtronic Industries Co Ltd','669','HKEX','HK','Industrials','Power Tools / Milwaukee & Ryobi / Hong Kong',52000,28000,14000],
  ['aia insurance','AIA Group Ltd','1299','HKEX','HK','Financials','Insurance / Life Insurance / Hong Kong',24000,75000,17500],
  ['sunny optical','Sunny Optical Technology Group','2382','HKEX','CN','Technology','Optical Components / Camera Modules / China',32000,18000,25000],
]);

const ALL=[['Japan',japan],['Korea',korea],['Taiwan',taiwan],['SEA',sea],['China/HK',china_hk]];
(async () => {
  let totalNew=0, totalSkip=0;
  try {
    for (const [region, rows] of ALL) {
      const fresh = rows.filter(c => !existing.has(c.canonical_name));
      totalSkip += rows.length - fresh.length;
      if (!fresh.length) { console.log(`\n[${region}] all already exist`); continue; }
      const { ins } = await runValidatedGlobalBatch(pool, `GLOBAL W2 — ${region}`, V, fresh);
      totalNew += ins; fresh.forEach(c => existing.add(c.canonical_name));
    }
    console.log(`\n═══ WAVE 2 TOTAL: ${totalNew} new, ${totalSkip} skipped ═══`);
  } catch (e) { console.error('Error:', e.message); process.exit(1); }
  finally { await pool.end(); }
})();
