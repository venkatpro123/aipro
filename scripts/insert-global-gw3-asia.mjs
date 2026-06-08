// GIANTS Wave 3 — Asia ex-China/Japan large-caps (India PSUs/majors, Korea, Taiwan, SEA/HK). All >= $10B.
// India heavily seeded already — pre-filter expected to skip many.
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'glob-gw3-v2026.1';
const g = mapRows(V);

const india = g([
  ['state bank of india','State Bank of India','SBIN','NSE','IN','Financials','Public Sector Banking / India',230000,90000,55000],
  ['life insurance corp','Life Insurance Corporation of India','LICI','NSE','IN','Financials','Life Insurance / India',100000,75000,90000],
  ['ongc','Oil and Natural Gas Corporation Ltd','ONGC','NSE','IN','Energy','Oil & Gas Exploration / India',26000,40000,70000],
  ['ntpc power','NTPC Limited','NTPC','NSE','IN','Utilities','Power Generation / India',18000,40000,22000],
  ['coal india','Coal India Limited','COALINDIA','NSE','IN','Materials','Coal Mining / India',240000,35000,40000],
  ['power grid india','Power Grid Corporation of India Ltd','POWERGRID','NSE','IN','Utilities','Power Transmission / India',9000,35000,6000],
  ['indian oil','Indian Oil Corporation Ltd','IOC','NSE','IN','Energy','Oil Refining & Marketing / India',31000,25000,100000],
  ['itc fmcg','ITC Limited','ITC','NSE','IN','Consumer Staples','Tobacco & FMCG / India',25000,70000,22000],
  ['larsen toubro','Larsen & Toubro Ltd','LT','NSE','IN','Industrials','Engineering & Construction / India',50000,60000,27000],
  ['hindustan unilever','Hindustan Unilever Ltd','HINDUNILVR','NSE','IN','Consumer Staples','FMCG / India',21000,70000,15000],
  ['adani enterprises','Adani Enterprises Ltd','ADANIENT','NSE','IN','Industrials','Infrastructure Conglomerate / India',45000,40000,12000],
  ['adani ports','Adani Ports & SEZ Ltd','ADANIPORTS','NSE','IN','Industrials','Ports & Logistics / India',5000,35000,3000],
  ['maruti suzuki','Maruti Suzuki India Ltd','MARUTI','NSE','IN','Consumer Discretionary','Automobiles / India',40000,45000,18000],
  ['asian paints','Asian Paints Ltd','ASIANPAINT','NSE','IN','Materials','Paints & Coatings / India',8000,35000,4000],
  ['titan company','Titan Company Ltd','TITAN','NSE','IN','Consumer Discretionary','Jewelry & Watches / India',9000,35000,6000],
  ['sun pharma','Sun Pharmaceutical Industries Ltd','SUNPHARMA','NSE','IN','Healthcare','Pharmaceuticals / India',40000,45000,6000],
]);

const korea = g([
  ['lg electronics','LG Electronics Inc','066570','KRX','KR','Consumer Discretionary','Consumer Electronics & Appliances / Korea',75000,12000,65000],
  ['shinhan financial','Shinhan Financial Group Co Ltd','055550','KRX','KR','Financials','Banking & Finance / Korea',15000,20000,25000],
  ['hana financial','Hana Financial Group Inc','086790','KRX','KR','Financials','Banking & Finance / Korea',12000,15000,20000],
  ['kepco utility','Korea Electric Power Corporation','015760','KRX','KR','Utilities','Electric Utility / Korea',45000,12000,60000],
  ['celltrion biosimilars','Celltrion Inc','068270','KRX','KR','Healthcare','Biosimilars / Korea',2500,30000,2500],
  ['hd hyundai','HD Hyundai Co Ltd','267250','KRX','KR','Industrials','Shipbuilding & Heavy Industry / Korea',30000,12000,45000],
  ['kakao internet','Kakao Corporation','035720','KRX','KR','Technology','Internet Platform / Korea',15000,15000,6000],
  ['coupang ecommerce','Coupang Inc','CPNG','NYSE','KR','Consumer Discretionary','E-commerce / Korea',80000,40000,30000],
  ['samsung ct','Samsung C&T Corporation','028260','KRX','KR','Industrials','Construction & Trading / Korea',15000,25000,30000],
  ['samsung life','Samsung Life Insurance Co Ltd','032830','KRX','KR','Financials','Life Insurance / Korea',5000,15000,25000],
  ['lg energy solution','LG Energy Solution Ltd','373220','KRX','KR','Industrials','EV Batteries / Korea',30000,70000,25000],
  ['posco future m','POSCO Future M Co Ltd','003670','KRX','KR','Materials','Battery Materials / Korea',6000,15000,4000],
]);

const taiwan = g([
  ['umc foundry','United Microelectronics Corporation','2303','TWSE','TW','Technology','Semiconductor Foundry / Taiwan',20000,25000,8000],
  ['quanta computer','Quanta Computer Inc','2382','TWSE','TW','Technology','Notebook & Server ODM / Taiwan',100000,40000,45000],
  ['chunghwa telecom','Chunghwa Telecom Co Ltd','2412','TWSE','TW','Communications','Telecom / Taiwan',23000,30000,7000],
  ['ctbc financial','CTBC Financial Holding Co Ltd','2891','TWSE','TW','Financials','Banking & Finance / Taiwan',28000,20000,15000],
  ['cathay financial','Cathay Financial Holding Co Ltd','2882','TWSE','TW','Financials','Insurance & Banking / Taiwan',45000,25000,20000],
  ['fubon financial','Fubon Financial Holding Co Ltd','2881','TWSE','TW','Financials','Insurance & Banking / Taiwan',40000,25000,20000],
  ['formosa plastics','Formosa Plastics Corporation','1301','TWSE','TW','Materials','Petrochemicals & Plastics / Taiwan',30000,15000,20000],
  ['nan ya plastics','Nan Ya Plastics Corporation','1303','TWSE','TW','Materials','Plastics & Materials / Taiwan',30000,12000,12000],
  ['wistron odm','Wistron Corporation','3231','TWSE','TW','Technology','Electronics ODM / Taiwan',70000,10000,30000],
  ['realtek semiconductor','Realtek Semiconductor Corp','2379','TWSE','TW','Technology','Semiconductors / Taiwan',7000,12000,4000],
]);

const seaHk = g([
  ['singtel telecom','Singapore Telecommunications Ltd','Z74','SGX','SG','Communications','Telecom / Singapore',23000,40000,15000],
  ['ocbc bank','Oversea-Chinese Banking Corporation','O39','SGX','SG','Financials','Commercial Banking / Singapore',30000,45000,12000],
  ['uob bank','United Overseas Bank Ltd','U11','SGX','SG','Financials','Commercial Banking / Singapore',30000,40000,11000],
  ['jardine matheson','Jardine Matheson Holdings Ltd','J36','SGX','HK','Industrials','Diversified Conglomerate / Hong Kong',400000,15000,40000],
  ['aia group','AIA Group Limited','1299','HKSE','HK','Financials','Life Insurance Pan-Asia / Hong Kong',23000,90000,40000],
  ['hkex exchange','Hong Kong Exchanges and Clearing Ltd','0388','HKSE','HK','Financials','Stock Exchange / Hong Kong',2500,45000,3000],
  ['ck hutchison','CK Hutchison Holdings Limited','0001','HKSE','HK','Industrials','Ports Telecom Retail Conglomerate / Hong Kong',300000,20000,45000],
  ['clp holdings','CLP Holdings Limited','0002','HKSE','HK','Utilities','Electric Utility / Hong Kong',8000,25000,12000],
  ['sun hung kai','Sun Hung Kai Properties Limited','0016','HKSE','HK','Real Estate','Property Development / Hong Kong',40000,30000,8000],
  ['hang seng bank','Hang Seng Bank Limited','0011','HKSE','HK','Financials','Commercial Banking / Hong Kong',9000,25000,8000],
  ['boc hong kong','BOC Hong Kong Holdings Limited','2388','HKSE','HK','Financials','Commercial Banking / Hong Kong',14000,35000,10000],
  ['cnooc energy','CNOOC Limited','0883','HKSE','HK','Energy','Offshore Oil & Gas / Hong Kong',20000,90000,55000],
  ['power assets hk','Power Assets Holdings Limited','0006','HKSE','HK','Utilities','Power Investment / Hong Kong',300,12000,3000],
  ['link reit','Link Real Estate Investment Trust','0823','HKSE','HK','Real Estate','Retail REIT / Hong Kong',1000,15000,2000],
]);

runWaves('GIANTS GW3', V, [
  ['India Large-Caps', india],
  ['Korea', korea],
  ['Taiwan', taiwan],
  ['SEA & Hong Kong', seaHk],
]);
