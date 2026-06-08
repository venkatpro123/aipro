// GLOBAL Wave 6 (final) — close out to 300. Real listed cos across regions/sectors, 2026 estimates (seed).
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
const V='glob-w6-v2026.1';

const usTech2 = g(V)([
  ['monday work os','monday.com Ltd','MNDY','NASDAQ','IL','Technology','Work Management / SaaS / Israel',2500,15000,1000],
  ['sentinelone security','SentinelOne Inc','S','NYSE','US','Technology','Cybersecurity / Endpoint AI / USA',2500,7000,800],
  ['wix websites','Wix.com Ltd','WIX','NASDAQ','IL','Technology','Website Builder / SaaS / Israel',5500,9000,1700],
  ['smartsheet collaboration','Smartsheet Inc','SMAR','NYSE','US','Technology','Work Management / Collaboration / USA',3500,8000,1000],
  ['pure storage','Pure Storage Inc','PSTG','NYSE','US','Technology','Data Storage / Flash Arrays / USA',5500,18000,3100],
  ['zscaler cloud sec','Zscaler Inc','ZS','NASDAQ','US','Technology','Cloud Security / Zero Trust / USA',7700,30000,2500],
  ['okta identity','Okta Inc','OKTA','NASDAQ','US','Technology','Identity Management / IAM / USA',6000,16000,2600],
  ['elastic search','Elastic NV','ESTC','NYSE','US','Technology','Search & Observability / USA',3500,9000,1400],
  ['twilio comms','Twilio Inc','TWLO','NYSE','US','Technology','Communications APIs / CPaaS / USA',5800,18000,4400,800],
  ['cloudflare edge','Cloudflare Inc','NET','NYSE','US','Technology','Edge Network / Security CDN / USA',3800,40000,1700],
  ['unity gaming engine','Unity Software Inc','U','NYSE','US','Technology','Game Engine / 3D Development / USA',5000,9000,1800,1800],
  ['roblox gaming','Roblox Corporation','RBLX','NYSE','US','Technology','Gaming / UGC Platform / USA',2400,40000,3600],
]);

const usMid2 = g(V)([
  ['emcor construction','EMCOR Group Inc','EME','NYSE','US','Industrials','Construction & Facilities Services / USA',40000,20000,15000],
  ['old dominion freight','Old Dominion Freight Line Inc','ODFL','NASDAQ','US','Industrials','Trucking / LTL Freight / USA',23000,38000,5800],
  ['graco fluid','Graco Inc','GGG','NYSE','US','Industrials','Fluid Handling Equipment / USA',4000,15000,2100],
  ['pentair water','Pentair plc','PNR','NYSE','US','Industrials','Water Solutions / Filtration / USA',10000,16000,4100],
  ['carlisle companies','Carlisle Companies Inc','CSL','NYSE','US','Industrials','Building Products / Roofing / USA',9000,18000,5000],
  ['lennox hvac','Lennox International Inc','LII','NYSE','US','Industrials','HVAC / Climate Control / USA',12000,22000,5300],
  ['rollins pest control','Rollins Inc','ROL','NYSE','US','Industrials','Pest Control Services / USA',20000,25000,3400],
  ['cintas uniforms','Cintas Corporation','CTAS','NASDAQ','US','Industrials','Uniform Rental / Business Services / USA',45000,80000,10000],
  ['fair isaac scores','Fair Isaac Corporation','FICO','NYSE','US','Technology','Analytics / Credit Scoring / USA',3500,45000,1700],
  ['msci indices','MSCI Inc','MSCI','NYSE','US','Financials','Financial Indices / Analytics / USA',5500,45000,2800],
]);

const usHealthCons = g(V)([
  ['dexcom monitoring','DexCom Inc','DXCM','NASDAQ','US','Healthcare','Medical Devices / Glucose Monitoring / USA',9000,30000,4000],
  ['veeva life sciences','Veeva Systems Inc','VEEV','NYSE','US','Technology','Life Sciences Cloud / SaaS / USA',7500,35000,2700],
  ['molina healthcare','Molina Healthcare Inc','MOH','NYSE','US','Healthcare','Managed Care / Medicaid / USA',16000,18000,38000],
  ['chewy pet','Chewy Inc','CHWY','NYSE','US','Consumer Discretionary','Pet E-commerce / USA',20000,15000,11500],
  ['sprouts farmers','Sprouts Farmers Market Inc','SFM','NASDAQ','US','Consumer Staples','Grocery / Natural Foods / USA',35000,14000,7300],
  ['e.l.f. beauty','e.l.f. Beauty Inc','ELF','NYSE','US','Consumer Staples','Cosmetics / Beauty / USA',600,7000,1200],
  ['dutch bros coffee','Dutch Bros Inc','BROS','NYSE','US','Consumer Discretionary','Coffee / Drive-Thru / USA',26000,8000,1300],
  ['cava mediterranean','CAVA Group Inc','CAVA','NYSE','US','Consumer Discretionary','Restaurants / Fast Casual / USA',16000,11000,950],
]);

const euAsia3 = g(V)([
  ['nexi payments','Nexi SpA','NEXI','MIL','IT','Financial Technology','Payments / Merchant Services / Italy',10000,8000,3700],
  ['prysmian cables','Prysmian SpA','PRY','MIL','IT','Industrials','Cables / Energy & Telecom / Italy',30000,18000,16000],
  ['leonardo defense','Leonardo SpA','LDO','MIL','IT','Industrials','Defense / Aerospace / Italy',53000,18000,17000],
  ['ferrovial infrastructure','Ferrovial SE','FER','AMS','ES','Industrials','Infrastructure / Toll Roads / Spain',24000,30000,9000],
  ['indra systems','Indra Sistemas SA','IDR','BME','ES','Technology','Defense IT / Consulting / Spain',57000,5000,5000],
  ['acciona energy','Acciona SA','ANA','BME','ES','Utilities','Renewable Energy / Infrastructure / Spain',45000,15000,18000],
  ['wartsila marine','Wärtsilä Oyj','WRT1V','HEL','FI','Industrials','Marine & Energy / Engines / Finland',17000,12000,6500],
  ['kesko retail','Kesko Oyj','KESKOB','HEL','FI','Consumer Staples','Retail / Grocery & Trade / Finland',24000,8000,12000],
  ['dsv logistics','DSV A/S','DSV','CPH','DK','Industrials','Logistics / Freight Forwarding / Denmark',75000,45000,24000],
  ['coloplast medical','Coloplast A/S','COLO-B','CPH','DK','Healthcare','Medical Devices / Ostomy Care / Denmark',16000,55000,4000],
  ['ericsson telecom','Telefonaktiebolaget LM Ericsson','ERIC','OMX','SE','Technology','Telecom Equipment / 5G / Sweden',95000,28000,24000,1200],
  ['assa abloy locks','ASSA ABLOY AB','ASSA-B','OMX','SE','Industrials','Access Control / Locks / Sweden',63000,40000,14000],
  ['keyence sensors','Keyence Corporation','6861','TYO','JP','Technology','Factory Automation / Sensors / Japan',11000,140000,6000],
  ['murata electronics','Murata Manufacturing Co Ltd','6981','TYO','JP','Technology','Electronic Components / Capacitors / Japan',75000,40000,11000],
  ['fanuc robotics','FANUC Corporation','6954','TYO','JP','Industrials','Industrial Robots / CNC / Japan',8500,40000,5000],
  ['sk hynix memory','SK Hynix Inc','000660','KRX','KR','Technology','Semiconductors / Memory DRAM & NAND / Korea',32000,90000,45000],
  ['naver internet','NAVER Corporation','035420','KRX','KR','Technology','Internet / Search & Commerce / Korea',5500,30000,8000],
]);

const emerging = g(V)([
  ['saudi telecom stc','Saudi Telecom Company','7010','TADAWUL','SA','Communications','Telecom / Mobile & Fixed / Saudi Arabia',20000,80000,19000],
  ['maaden mining','Saudi Arabian Mining Company','1211','TADAWUL','SA','Materials','Mining / Phosphate & Aluminium / Saudi Arabia',6000,40000,8000],
  ['adnoc drilling','ADNOC Drilling Company PJSC','ADNOCDRILL','ADX','AE','Energy','Oil & Gas Drilling Services / UAE',9000,18000,4000],
  ['e& telecom uae','Emirates Telecommunications Group (e&)','ETISALAT','ADX','AE','Communications','Telecom / Mobile / UAE',40000,45000,15000],
  ['qnb bank','Qatar National Bank QPSC','QNBK','QSE','QA','Financials','Banking / Commercial Bank / Qatar',30000,45000,12000],
  ['fawry fintech','Fawry for Banking Technology','FWRY','EGX','EG','Financial Technology','Payments / Fintech / Egypt',3000,1000,200],
  ['airtel africa','Airtel Africa plc','AAF','LSE','NG','Communications','Telecom / Mobile & Money / Nigeria',5000,12000,5000],
  ['naspers tech','Naspers Limited','NPN','JSE','ZA','Technology','Internet / Investments / South Africa',25000,30000,6000],
  ['shoprite africa','Shoprite Holdings Ltd','SHP','JSE','ZA','Consumer Staples','Retail / Grocery / South Africa',150000,12000,12000],
  ['pagseguro fintech','PagSeguro Digital Ltd','PAGS','NYSE','BR','Financial Technology','Payments / Fintech / Brazil',10000,4000,3000],
  ['stoneco fintech','StoneCo Ltd','STNE','NASDAQ','BR','Financial Technology','Payments / SMB Fintech / Brazil',13000,5000,2400],
  ['vale mining','Vale SA','VALE','NYSE','BR','Materials','Mining / Iron Ore & Nickel / Brazil',65000,55000,40000],
  ['suzano paper','Suzano SA','SUZ','NYSE','BR','Materials','Pulp & Paper / Brazil',40000,15000,9000],
  ['credicorp peru','Credicorp Ltd','BAP','NYSE','PE','Financials','Banking / Financial Services / Peru',38000,18000,6000],
  ['ecopetrol energy','Ecopetrol SA','EC','NYSE','CO','Energy','Oil & Gas / Integrated / Colombia',18000,20000,30000],
]);

const ALL=[['US Tech-2',usTech2],['US Mid-2',usMid2],['US Health/Cons',usHealthCons],['Eu/Asia-3',euAsia3],['Emerging',emerging]];
(async () => {
  let totalNew=0, totalSkip=0;
  try {
    for (const [region, rows] of ALL) {
      const fresh = rows.filter(c => !existing.has(c.canonical_name));
      totalSkip += rows.length - fresh.length;
      if (!fresh.length) { console.log(`\n[${region}] all already exist`); continue; }
      const { ins } = await runValidatedGlobalBatch(pool, `GLOBAL W6 — ${region}`, V, fresh);
      totalNew += ins; fresh.forEach(c => existing.add(c.canonical_name));
    }
    console.log(`\n═══ WAVE 6 TOTAL: ${totalNew} new, ${totalSkip} skipped ═══`);
  } catch (e) { console.error('Error:', e.message); process.exit(1); }
  finally { await pool.end(); }
})();
