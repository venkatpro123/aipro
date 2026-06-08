// GIANTS Wave 14 — final 40 to cross 300. Mixed global regions not yet seeded.
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'glob-gw14-v2026.1';
const g = mapRows(V);

const finalMix = g([
  // Japan misc
  ['z holdings yahoo japan','LY Corporation','4689','TYO','JP','Technology','Internet & Messaging / Japan',25000,15000,15000],
  ['recruit group','Recruit Holdings Co Ltd','6098','TYO','JP','Technology','HR Tech & Job Platforms / Japan',55000,60000,22000],
  ['kakaku price','Kakaku.com Inc','2371','TYO','JP','Technology','Price Comparison Platform / Japan',1200,3000,500],
  ['m3 medical','M3 Inc','2413','TYO','JP','Healthcare','Medical Information / Japan',7000,7000,2000],
  ['medipal holdings','Medipal Holdings Corporation','7459','TYO','JP','Healthcare','Pharmaceutical Distribution / Japan',10000,5000,35000],
  ['alpen sporting','Alpen Co Ltd','3028','TYO','JP','Consumer Discretionary','Sporting Goods Retail / Japan',4500,3000,2000],
  // China misc
  ['china resources power','China Resources Power Holdings Co Ltd','0836','HKSE','HK','Utilities','Coal & Renewable Power / China',18000,12000,20000],
  ['cgn power','CGN Power Co Ltd','1816','HKSE','CN','Utilities','Nuclear Power / China',18000,40000,10000],
  ['china longyuan power','China Longyuan Power Group Corp Ltd','0916','HKSE','HK','Energy','Wind & Clean Energy / China',10000,10000,4000],
  ['huatai securities','Huatai Securities Co Ltd','6886','HKSE','CN','Financials','Securities & Asset Mgmt / China',23000,15000,12000],
  ['haitong securities','Haitong Securities Co Ltd','6837','HKSE','CN','Financials','Investment Banking / China',22000,12000,10000],
  ['china overseas land','China Overseas Land & Investment Ltd','0688','HKSE','HK','Real Estate','Property Development / China',35000,20000,7000],
  ['longfor properties','Longfor Group Holdings Limited','0960','HKSE','HK','Real Estate','Property Development / China',40000,12000,8000],
  // UK / Ireland
  ['spirent communications','Spirent Communications plc','SPT','LSE','GB','Technology','Network Test & Assurance / UK',1800,3000,600],
  ['rathbones wealth','Rathbones Group Plc','RAT','LSE','GB','Financials','Wealth Management / UK',4000,5000,2000],
  ['liontrust asset','Liontrust Asset Management plc','LIO','LSE','GB','Financials','Asset Management / UK',600,2000,500],
  ['industrials reit','LondonMetric Property Plc','LMP','LSE','GB','Real Estate','Logistics REIT / UK',400,5000,500],
  ['trainline tickets','Trainline Plc','TRN','LSE','GB','Technology','Rail Ticketing Platform / UK',1000,3000,500],
  // Europe misc
  ['koeln bonn airport','Fraport AG','FRA','XETRA','DE','Industrials','Airport Operations / Germany',22000,4000,5000],
  ['fraport frankfurt','Fraport AG Frankfurt Airport','FRA2','XETRA','DE','Industrials','Airport Operations Frankfurt / Germany',10000,4000,4000],
  ['cargotec machinery','Cargotec Corporation','CGCBV','HEL','FI','Industrials','Cargo Handling Equipment / Finland',12000,5000,4000],
  ['nokian tyres','Nokian Tyres plc','NTY1V','HEL','FI','Consumer Discretionary','Premium Tires / Finland',5000,4000,1500],
  ['hkscan meat','HKScan Corporation','HKSAV','HEL','FI','Consumer Staples','Meat Processing / Finland',6000,3000,2000],
  ['nobia kitchens','Nobia AB','NOBI','OMX','SE','Consumer Discretionary','Kitchen Manufacturing / Sweden',5500,3000,1800],
  ['viaplay streaming','Viaplay Group AB','VPLAY-B','OMX','SE','Communications','Streaming & TV / Sweden',800,3000,900],
  // India misc
  ['apollo hospitals','Apollo Hospitals Enterprise Ltd','APOLLOHOSP','NSE','IN','Healthcare','Hospital Network / India',70000,30000,7000],
  ['max health','Max Healthcare Institute Limited','MAXHEALTH','NSE','IN','Healthcare','Hospital Network / India',20000,12000,3000],
  ['fortis healthcare','Fortis Healthcare Limited','FORTIS','NSE','IN','Healthcare','Hospital Network / India',25000,8000,3000],
  ['narayana health','Narayana Hrudayalaya Limited','NH','NSE','IN','Healthcare','Hospital Network / India',22000,8000,2500],
  ['dr lal pathlabs','Dr Lal PathLabs Limited','LALPATHLAB','NSE','IN','Healthcare','Diagnostics / India',8000,6000,1000],
  ['metropolis health','Metropolis Healthcare Limited','METROPOLIS','NSE','IN','Healthcare','Diagnostics / India',5000,3000,700],
  ['cams registry','Computer Age Management Services Ltd','CAMS','NSE','IN','Technology','Mutual Fund Registry / India',3000,3000,500],
  ['naukri info edge','Info Edge (India) Limited','NAUKRI','NSE','IN','Technology','Online Classifieds / India',5000,12000,700],
  ['just dial','Just Dial Limited','JUSTDIAL','NSE','IN','Technology','Local Search / India',4000,3000,1000],
  ['zomato food','Eternal Limited (Zomato)','ETERNAL','NSE','IN','Consumer Discretionary','Food Delivery / India',15000,18000,5000],
  ['swiggy food','Bundl Technologies (Swiggy)','SWIGGY','NSE','IN','Consumer Discretionary','Food Delivery / India',5000,5000,3000],
  ['paytm fintech','One97 Communications Limited','PAYTM','NSE','IN','Financial Technology','Payments / India',10000,5000,1500],
]);

runWaves('GIANTS GW14', V, [
  ['Final Mix Global', finalMix],
]);
