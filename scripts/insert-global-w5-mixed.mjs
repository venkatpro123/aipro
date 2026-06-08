// GLOBAL Wave 5 — mixed mid-caps across Europe/Asia/Americas. Real listed cos, 2026 estimates (seed).
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
const V='glob-w5-v2026.1';

const eu2 = g(V)([
  ['symrise flavors','Symrise AG','SY1','XETRA','DE','Materials','Flavors & Fragrances / Germany',13000,16000,5400],
  ['sartorius bioprocess','Sartorius AG','SRT','XETRA','DE','Healthcare','Bioprocess / Lab Equipment / Germany',14000,20000,3800],
  ['hensoldt sensors','Hensoldt AG','HAG','XETRA','DE','Industrials','Defense Electronics / Sensors / Germany',7000,8000,2300],
  ['jenoptik photonics','Jenoptik AG','JEN','XETRA','DE','Technology','Photonics / Optical Systems / Germany',4700,2000,1200],
  ['befesa recycling','Befesa SA','BFSA','XETRA','DE','Materials','Recycling / Steel Dust & Aluminium / Germany',2000,2500,1400],
  ['verallia glass','Verallia SA','VRLA','EPA','FR','Materials','Glass Packaging / France',11000,5000,4000],
  ['alten engineering','Alten SA','ATE','EPA','FR','Technology','Engineering / IT Consulting / France',57000,5000,4500],
  ['neoen renewables','Neoen SA','NEOEN','EPA','FR','Energy','Renewable Energy / Solar & Wind / France',500,5000,650],
  ['befimmo reit','Montea NV','MONT','EBR','BE','Real Estate','Logistics Real Estate / REIT / Belgium',150,3000,200],
  ['tomra recycling','TOMRA Systems ASA','TOM','OSL','NO','Industrials','Recycling Tech / Reverse Vending / Norway',5000,6000,1500],
  ['nel hydrogen','Nel ASA','NEL','OSL','NO','Energy','Hydrogen / Electrolysers / Norway',600,800,150],
  ['boliden mining','Boliden AB','BOL','OMX','SE','Materials','Mining & Smelting / Metals / Sweden',8000,12000,8000],
  ['epiroc mining','Epiroc AB','EPI-A','OMX','SE','Industrials','Mining Equipment / Sweden',18000,28000,6000],
  ['indutrade industrial','Indutrade AB','INDT','OMX','SE','Industrials','Industrial Components / Distribution / Sweden',12000,9000,3200],
  ['huhtamaki packaging','Huhtamäki Oyj','HUH1','HEL','FI','Materials','Packaging / Food Service / Finland',19000,4000,4500],
]);

const uk2 = g(V)([
  ['diploma distribution','Diploma plc','DPLM','LSE','GB','Industrials','Industrial Distribution / UK',3500,8000,1800],
  ['rightmove property','Rightmove plc','RMV','LSE','GB','Technology','Property Portal / Real Estate / UK',700,7000,500],
  ['auto trader uk','Auto Trader Group plc','AUTO','LSE','GB','Technology','Automotive Marketplace / UK',1100,9000,750],
  ['bunzl distribution','Bunzl plc','BNZL','LSE','GB','Industrials','Distribution / Business Supplies / UK',24000,14000,15000],
  ['croda chemicals','Croda International plc','CRDA','LSE','GB','Materials','Specialty Chemicals / UK',6000,8000,2200],
  ['rotork actuators','Rotork plc','ROR','LSE','GB','Industrials','Flow Control / Actuators / UK',3300,4000,950],
  ['howden joinery','Howden Joinery Group plc','HWDN','LSE','GB','Consumer Discretionary','Kitchen Joinery / Retail / UK',13000,7000,2700],
]);

const asia2 = g(V)([
  ['advantest semiconductor','Advantest Corporation','6857','TYO','JP','Technology','Semiconductor Test Equipment / Japan',8000,40000,5000],
  ['hoya optics','Hoya Corporation','7741','TYO','JP','Healthcare','Optics / Medical & Mask Blanks / Japan',37000,45000,5000],
  ['capcom games','Capcom Co Ltd','9697','TYO','JP','Consumer Discretionary','Gaming / Video Games / Japan',3500,9000,1300],
  ['tokyo electron','Renesas Electronics Corporation','6723','TYO','JP','Technology','Semiconductors / Microcontrollers / Japan',21000,40000,9000],
  ['gmo internet','GMO internet Group Inc','9449','TYO','JP','Technology','Internet Infrastructure / Hosting / Japan',7000,4000,2000],
  ['samsung biologics','Samsung Biologics Co Ltd','207940','KRX','KR','Healthcare','Biologics / CDMO / Korea',4500,55000,3000],
  ['hanmi pharm','Hanmi Pharmaceutical Co Ltd','128940','KRX','KR','Healthcare','Pharmaceuticals / Korea',2300,4000,1100],
  ['silergy semiconductor','Silergy Corp','6415','TWO','TW','Technology','Semiconductors / Analog ICs / Taiwan',1500,5000,500],
  ['wiwynn servers','Wiwynn Corporation','6669','TWO','TW','Technology','Cloud Servers / Data Center / Taiwan',3000,18000,12000],
  ['bdo unibank','BDO Unibank Inc','BDO','PSE','PH','Financials','Banking / Commercial Bank / Philippines',40000,12000,5000],
  ['bank central asia','PT Bank Central Asia Tbk','BBCA','IDX','ID','Financials','Banking / Commercial Bank / Indonesia',27000,70000,9000],
  ['ptt exploration','PTT Exploration and Production PCL','PTTEP','SET','TH','Energy','Oil & Gas Exploration / Thailand',6000,16000,9000],
  ['cp all retail','CP All PCL','CPALL','SET','TH','Consumer Staples','Retail / Convenience Stores / Thailand',200000,18000,28000],
  ['vinhomes property','Vinhomes JSC','VHM','HOSE','VN','Real Estate','Real Estate / Development / Vietnam',12000,12000,4000],
]);

const amer2 = g(V)([
  ['dollarama retail','Dollarama Inc','DOL','TSX','CA','Consumer Discretionary','Retail / Discount Stores / Canada',25000,22000,4200],
  ['gildan apparel','Gildan Activewear Inc','GIL','TSX','CA','Consumer Discretionary','Apparel Manufacturing / Canada',45000,8000,3300],
  ['open text software','Open Text Corporation','OTEX','TSX','CA','Technology','Enterprise Information Management / Canada',23000,8000,5800],
  ['nutrien agriculture','Nutrien Ltd','NTR','TSX','CA','Materials','Agriculture / Fertilizers / Canada',24000,28000,28000],
  ['cae simulation','CAE Inc','CAE','TSX','CA','Industrials','Simulation & Training / Aviation / Canada',13000,8000,3300],
  ['cosan energy','Cosan SA','CSAN','B3','BR','Energy','Energy & Logistics / Conglomerate / Brazil',40000,7000,8000],
  ['embraer aircraft','Embraer SA','EMBR3','B3','BR','Industrials','Aerospace / Aircraft Manufacturing / Brazil',18000,9000,6000],
  ['cemex materials','CEMEX SAB de CV','CX','NYSE','MX','Materials','Cement / Building Materials / Mexico',45000,9000,16000],
  ['grupo televisa','Grupo Televisa SAB','TV','NYSE','MX','Communications','Media & Telecom / Mexico',30000,3000,4500,500],
]);

const ALL=[['Europe-2',eu2],['UK-2',uk2],['Asia-2',asia2],['Americas-2',amer2]];
(async () => {
  let totalNew=0, totalSkip=0;
  try {
    for (const [region, rows] of ALL) {
      const fresh = rows.filter(c => !existing.has(c.canonical_name) && c.canonical_name!=='shopify commerce');
      totalSkip += rows.length - fresh.length;
      if (!fresh.length) { console.log(`\n[${region}] all already exist`); continue; }
      const { ins } = await runValidatedGlobalBatch(pool, `GLOBAL W5 — ${region}`, V, fresh);
      totalNew += ins; fresh.forEach(c => existing.add(c.canonical_name));
    }
    console.log(`\n═══ WAVE 5 TOTAL: ${totalNew} new, ${totalSkip} skipped ═══`);
  } catch (e) { console.error('Error:', e.message); process.exit(1); }
  finally { await pool.end(); }
})();
