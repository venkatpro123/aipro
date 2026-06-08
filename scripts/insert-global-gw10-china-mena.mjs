// GIANTS Wave 10 — China additional + MENA / Africa national champions.
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'glob-gw10-v2026.1';
const g = mapRows(V);

const china2 = g([
  ['china railway construction','China Railway Construction Corp Ltd','1186','HKSE','CN','Industrials','Railway Construction / China',380000,50000,135000],
  ['china communications construct','China Communications Construction Co','1800','HKSE','CN','Industrials','Infrastructure Construction / China',320000,40000,100000],
  ['cr land','China Resources Land Limited','1109','HKSE','CN','Real Estate','Property Development / China',50000,30000,12000],
  ['cr beer','China Resources Beer Holdings Co Ltd','0291','HKSE','HK','Consumer Staples','Beer & Beverage / China',25000,15000,5000],
  ['cosco shipping holdings','COSCO SHIPPING Holdings Co Ltd','1919','HKSE','CN','Industrials','Container Shipping / China',60000,18000,30000],
  ['sinotruk trucks','Sinotruk (Hong Kong) Limited','3808','HKSE','CN','Industrials','Heavy Trucks / China',70000,10000,30000],
  ['yum china restaurants','Yum China Holdings Inc','YUMC','NYSE','CN','Consumer Discretionary','Fast Food Restaurants / China',450000,12000,12000],
  ['luckin coffee','Luckin Coffee Inc','LK','NASDAQ','CN','Consumer Discretionary','Coffee Retail / China',30000,6000,4000],
  ['pop mart toys','POP MART International Group Ltd','9992','HKSE','CN','Consumer Discretionary','Designer Toys & Collectibles / China',3000,8000,1200],
  ['kuaishou video','Kuaishou Technology','1024','HKSE','CN','Communications','Short Video Platform / China',30000,25000,13000],
  ['pinduoduo temu','PDD Holdings Inc','PDD','NASDAQ','CN','Consumer Discretionary','E-Commerce & Temu / China',17000,160000,35000],
  ['trip com travel','Trip.com Group Limited','TCOM','NASDAQ','CN','Consumer Discretionary','Online Travel Agency / China',40000,20000,6000],
  ['zto express','ZTO Express Cayman Inc','ZTO','NYSE','CN','Industrials','Express Delivery / China',30000,10000,12000],
  ['ke holdings','KE Holdings Inc','BEKE','NYSE','CN','Real Estate','Property Brokerage Platform / China',100000,8000,10000],
  ['kanzhun boss zhipin','BOSS Zhipin Holdings','BZ','NASDAQ','CN','Technology','Online Recruitment / China',3500,5000,1500],
  ['beigene oncology','BeiGene Ltd','ONC','NASDAQ','CN','Healthcare','Oncology Biopharmaceuticals / China',10000,15000,3000],
  ['zai lab biopharma','Zai Lab Limited','ZLAB','NASDAQ','CN','Healthcare','Biopharmaceuticals / China',2000,5000,500],
]);

const menaAfrica2 = g([
  ['attijariwafa bank','Attijariwafa Bank SC','ATW','CSE','MA','Financials','Commercial Banking / Morocco',24000,8000,8000],
  ['maroc telecom','Maroc Telecom SA','IAM','CSE','MA','Communications','Telecom / Morocco',15000,8000,4000],
  ['label vie morocco','Label\'Vie SA','LBV','CSE','MA','Consumer Staples','Grocery Retail / Morocco',10000,3000,2000],
  ['stc saudi','Saudi Telecom Company STC','7010','TADAWUL','SA','Communications','Telecom / Saudi Arabia',18000,80000,17000],
  ['mobily saudi','Etihad Etisalat Co Mobily','7020','TADAWUL','SA','Communications','Mobile Telecom / Saudi Arabia',4500,8000,5000],
  ['alinma invest','Alinma Investment Company','ALINMA','TADAWUL','SA','Financials','Islamic Asset Management / Saudi Arabia',1200,5000,1000],
  ['national commercial bank','The Saudi National Bank','1180','TADAWUL','SA','Financials','Commercial Banking / Saudi Arabia',17000,60000,14000],
  ['abu dhabi commercial','Abu Dhabi Commercial Bank PJSC','ADCB','ADX','AE','Financials','Commercial Banking / UAE',8000,18000,5000],
  ['mashreq bank','Mashreq Bank PSC','MASQ','DFM','AE','Financials','Commercial Banking / UAE',4000,10000,3000],
  ['discovery limited','Discovery Limited','DSY','JSE','ZA','Financials','Health Insurance & Vitality / South Africa',13000,18000,8000],
  ['absa bank','Absa Group Limited','ABG','JSE','ZA','Financials','Commercial Banking / South Africa',40000,15000,10000],
  ['truworths fashion','Truworths International Limited','TRU','JSE','ZA','Consumer Discretionary','Fashion Retail / South Africa',22000,4000,3000],
  ['foschini group','The Foschini Group Limited','TFG','JSE','ZA','Consumer Discretionary','Fashion Retail / South Africa',40000,5000,5000],
  ['pick n pay retail','Pick n Pay Stores Limited','PIK','JSE','ZA','Consumer Staples','Grocery Retail / South Africa',89000,4000,14000],
  ['spar group','SPAR Group Limited','SPP','JSE','ZA','Consumer Staples','Grocery Wholesale & Retail / South Africa',30000,5000,12000],
  ['woolworths sa','Woolworths Holdings Limited','WHL','JSE','ZA','Consumer Discretionary','Fashion & Food Retail / South Africa',30000,4000,7000],
  ['nedbank','Nedbank Group Limited','NED','JSE','ZA','Financials','Commercial Banking / South Africa',27000,12000,8000],
  ['investec bank','Investec plc','INL','JSE','ZA','Financials','Specialist Banking & Asset Mgmt / South Africa',10000,18000,8000],
  ['growthpoint reit','Growthpoint Properties Limited','GRT','JSE','ZA','Real Estate','Diversified REIT / South Africa',3000,5000,2000],
  ['egypt telecoms','Telecom Egypt SAE','ETEL','EGX','EG','Communications','Telecom / Egypt',23000,4000,4000],
  ['cib egypt','Commercial International Bank Egypt','COMI','EGX','EG','Financials','Commercial Banking / Egypt',8000,6000,3000],
  ['zenith bank nigeria','Zenith Bank Plc','ZENITHBANK','NSE','NG','Financials','Commercial Banking / Nigeria',8000,8000,5000],
  ['access bank nigeria','Access Holdings Plc','ACCESSCORP','NSE','NG','Financials','Commercial Banking / Nigeria',60000,6000,8000],
  ['dangote cement','Dangote Cement Plc','DANGCEM','NSE','NG','Materials','Cement Manufacturing / Nigeria',22000,5000,4000],
]);

runWaves('GIANTS GW10', V, [
  ['China Additional', china2],
  ['MENA & Africa', menaAfrica2],
]);
