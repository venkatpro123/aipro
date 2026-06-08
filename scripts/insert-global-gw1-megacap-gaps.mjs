// GIANTS Wave 1 — genuine large-cap gaps: US mega-cap gaps + China SOEs + Japan majors. All >= $10B.
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'glob-gw1-v2026.1';
const g = mapRows(V);

const usGaps = g([
  ['berkshire hathaway','Berkshire Hathaway Inc','BRK-B','NYSE','US','Financials','Diversified Holding & Insurance / USA',400000,950000,360000],
  ['ge aerospace','GE Aerospace','GE','NYSE','US','Industrials','Aircraft Engines / USA',52000,190000,35000],
  ['ge vernova','GE Vernova Inc','GEV','NYSE','US','Industrials','Power & Grid Equipment / USA',75000,90000,35000],
  ['rtx defense','RTX Corporation','RTX','NYSE','US','Industrials','Aerospace & Defense / USA',185000,130000,80000],
  ['general motors','General Motors Company','GM','NYSE','US','Consumer Discretionary','Automobiles / USA',160000,55000,175000],
  ['ford motor','Ford Motor Company','F','NYSE','US','Consumer Discretionary','Automobiles / USA',170000,45000,180000],
  ['abbott laboratories','Abbott Laboratories','ABT','NYSE','US','Healthcare','Medical Devices & Diagnostics / USA',114000,200000,42000],
  ['danaher','Danaher Corporation','DHR','NYSE','US','Healthcare','Life Sciences & Diagnostics / USA',63000,190000,24000],
  ['philip morris intl','Philip Morris International Inc','PM','NYSE','US','Consumer Staples','Tobacco & Nicotine / USA',82000,190000,37000],
  ['altria tobacco','Altria Group Inc','MO','NYSE','US','Consumer Staples','Tobacco / USA',6300,90000,24000],
  ['kimberly clark','Kimberly-Clark Corporation','KMB','NASDAQ','US','Consumer Staples','Personal Care & Tissue / USA',40000,45000,20000],
  ['illinois tool works','Illinois Tool Works Inc','ITW','NYSE','US','Industrials','Diversified Manufacturing / USA',45000,75000,16000],
  ['union pacific','Union Pacific Corporation','UNP','NYSE','US','Industrials','Class I Railroad / USA',31000,140000,24000],
  ['fedex logistics','FedEx Corporation','FDX','NYSE','US','Industrials','Logistics & Express Delivery / USA',400000,65000,90000],
  ['lowes home','Lowe\'s Companies Inc','LOW','NYSE','US','Consumer Discretionary','Home Improvement Retail / USA',270000,130000,83000],
  ['adp payroll','Automatic Data Processing Inc','ADP','NASDAQ','US','Technology','Payroll & HR Outsourcing / USA',63000,110000,19000],
  ['linde gases','Linde plc','LIN','NASDAQ','US','Materials','Industrial Gases / USA',66000,220000,33000],
  ['american tower reit','American Tower Corporation','AMT','NYSE','US','Real Estate','Telecom Tower REIT / USA',5000,95000,11000],
]);

const chinaSOE = g([
  ['petrochina','PetroChina Company Limited','601857','SSE','CN','Energy','Integrated Oil & Gas / China',380000,230000,430000],
  ['sinopec','China Petroleum & Chemical Corp','600028','SSE','CN','Energy','Oil Refining & Chemicals / China',370000,90000,450000],
  ['china mobile','China Mobile Limited','0941','HKSE','CN','Communications','Mobile Telecom / China',450000,200000,140000],
  ['china telecom','China Telecom Corporation Ltd','0728','HKSE','CN','Communications','Fixed & Mobile Telecom / China',280000,60000,75000],
  ['china unicom','China Unicom Hong Kong Ltd','0762','HKSE','CN','Communications','Telecom Operator / China',240000,25000,50000],
  ['china life insurance','China Life Insurance Company Ltd','2628','HKSE','CN','Financials','Life Insurance / China',180000,90000,110000],
  ['china pacific insurance','China Pacific Insurance Group','2601','HKSE','CN','Financials','Insurance / China',120000,40000,55000],
  ['citic group','CITIC Limited','0267','HKSE','CN','Financials','Diversified Conglomerate / China',200000,40000,100000],
  ['china shenhua','China Shenhua Energy Company Ltd','601088','SSE','CN','Energy','Coal Mining & Power / China',70000,90000,45000],
  ['china yangtze power','China Yangtze Power Co Ltd','600900','SSE','CN','Utilities','Hydroelectric Power / China',25000,90000,12000],
  ['bank of communications','Bank of Communications Co Ltd','601328','SSE','CN','Financials','Commercial Banking / China',90000,80000,45000],
  ['postal savings bank','Postal Savings Bank of China','1658','HKSE','CN','Financials','Retail Banking / China',190000,70000,50000],
  ['agricultural bank china','Agricultural Bank of China Ltd','1288','HKSE','CN','Financials','Commercial Banking / China',450000,180000,95000],
  ['china vanke','China Vanke Co Ltd','000002','SZSE','CN','Real Estate','Property Development / China',130000,15000,45000,true,3000],
  ['industrial bank china','Industrial Bank Co Ltd','601166','SSE','CN','Financials','Commercial Banking / China',60000,60000,30000],
  ['china minsheng bank','China Minsheng Banking Corp','600016','SSE','CN','Financials','Commercial Banking / China',60000,25000,25000],
  ['china citic bank','China CITIC Bank Corporation Ltd','601998','SSE','CN','Financials','Commercial Banking / China',60000,45000,32000],
]);

const japanMajors = g([
  ['toyota motor','Toyota Motor Corporation','7203','TYO','JP','Consumer Discretionary','Automobiles / Japan',375000,280000,310000],
  ['honda motor','Honda Motor Co Ltd','7267','TYO','JP','Consumer Discretionary','Automobiles & Motorcycles / Japan',200000,55000,140000],
  ['nissan motor','Nissan Motor Co Ltd','7201','TYO','JP','Consumer Discretionary','Automobiles / Japan',130000,12000,85000,true,9000],
  ['suzuki motor','Suzuki Motor Corporation','7269','TYO','JP','Consumer Discretionary','Automobiles & Motorcycles / Japan',70000,30000,35000],
  ['subaru auto','Subaru Corporation','7270','TYO','JP','Consumer Discretionary','Automobiles / Japan',37000,15000,30000],
  ['mitsubishi corp','Mitsubishi Corporation','8058','TYO','JP','Industrials','Trading & Investment / Japan',80000,70000,130000],
  ['mitsui trading','Mitsui & Co Ltd','8031','TYO','JP','Industrials','Trading & Investment / Japan',45000,65000,90000],
  ['itochu trading','ITOCHU Corporation','8001','TYO','JP','Industrials','Trading & Investment / Japan',110000,80000,90000],
  ['sumitomo corp','Sumitomo Corporation','8053','TYO','JP','Industrials','Trading & Investment / Japan',80000,40000,45000],
  ['marubeni trading','Marubeni Corporation','8002','TYO','JP','Industrials','Trading & Investment / Japan',45000,40000,50000],
  ['ntt telecom','Nippon Telegraph and Telephone Corp','9432','TYO','JP','Communications','Telecom / Japan',340000,150000,90000],
  ['kddi telecom','KDDI Corporation','9433','TYO','JP','Communications','Mobile Telecom / Japan',50000,70000,40000],
  ['softbank corp','SoftBank Corp','9434','TYO','JP','Communications','Mobile Telecom / Japan',40000,60000,40000],
  ['canon imaging','Canon Inc','7751','TYO','JP','Technology','Imaging & Office Equipment / Japan',180000,40000,28000],
  ['panasonic','Panasonic Holdings Corporation','6752','TYO','JP','Consumer Discretionary','Electronics & Batteries / Japan',230000,25000,55000],
  ['sumitomo mitsui financial','Sumitomo Mitsui Financial Group','8316','TYO','JP','Financials','Banking / Japan',120000,90000,45000],
  ['mizuho financial','Mizuho Financial Group Inc','8411','TYO','JP','Financials','Banking / Japan',52000,60000,30000],
]);

runWaves('GIANTS GW1', V, [
  ['US Mega-Cap Gaps', usGaps],
  ['China SOEs', chinaSOE],
  ['Japan Majors', japanMajors],
]);
