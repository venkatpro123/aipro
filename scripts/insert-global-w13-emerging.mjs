// GLOBAL Wave 13 — real listed emerging-market mid/large-caps (China A, SEA, LATAM, MENA/Africa).
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'glob-w13-v2026.1';
const g = mapRows(V);

const chinaA = g([
  ['kweichow moutai','Kweichow Moutai Co Ltd','600519','SSE','CN','Consumer Staples','Premium Baijiu Spirits / China',30000,280000,24000],
  ['wuliangye spirits','Wuliangye Yibin Co Ltd','000858','SZSE','CN','Consumer Staples','Baijiu Spirits / China',30000,80000,12000],
  ['midea appliances','Midea Group Co Ltd','000333','SZSE','CN','Consumer Discretionary','Home Appliances / China',160000,60000,50000],
  ['gree appliances','Gree Electric Appliances Inc','000651','SZSE','CN','Consumer Discretionary','Air Conditioners / China',80000,30000,28000],
  ['hikvision surveillance','Hangzhou Hikvision Digital','002415','SZSE','CN','Technology','Video Surveillance / China',58000,40000,13000],
  ['luxshare precision','Luxshare Precision Industry','002475','SZSE','CN','Technology','Electronics Components / China',200000,35000,30000],
  ['foxconn industrial','Foxconn Industrial Internet','601138','SSE','CN','Technology','Electronics Manufacturing / China',200000,50000,75000],
  ['china merchants bank','China Merchants Bank Co Ltd','600036','SSE','CN','Financials','Commercial Banking / China',110000,150000,50000],
  ['wanhua chemical','Wanhua Chemical Group Co Ltd','600309','SSE','CN','Materials','Polyurethane Chemicals / China',28000,30000,25000],
  ['sungrow inverters','Sungrow Power Supply Co Ltd','300274','SZSE','CN','Energy','Solar Inverters & Storage / China',20000,25000,11000],
  ['longi solar','LONGi Green Energy Technology','601012','SSE','CN','Energy','Solar Wafers & Modules / China',60000,25000,18000,true,2000],
  ['hans laser','Han\'s Laser Technology Industry','002008','SZSE','CN','Industrials','Laser Equipment / China',15000,5000,2000],
]);

const sea = g([
  ['bank mandiri','PT Bank Mandiri Persero Tbk','BMRI','IDX','ID','Financials','Commercial Banking / Indonesia',38000,40000,12000],
  ['astra international','PT Astra International Tbk','ASII','IDX','ID','Consumer Discretionary','Automotive Conglomerate / Indonesia',190000,25000,20000],
  ['bank negara indonesia','PT Bank Negara Indonesia Tbk','BBNI','IDX','ID','Financials','Commercial Banking / Indonesia',27000,15000,7000],
  ['siam cement','The Siam Cement Public Co','SCC','SET','TH','Materials','Cement & Building Materials / Thailand',58000,10000,15000],
  ['charoen pokphand foods','Charoen Pokphand Foods PCL','CPF','SET','TH','Consumer Staples','Agribusiness & Food / Thailand',120000,5000,17000],
  ['kasikornbank','Kasikornbank PCL','KBANK','SET','TH','Financials','Commercial Banking / Thailand',30000,12000,9000],
  ['ptt global chemical','PTT Global Chemical PCL','PTTGC','SET','TH','Materials','Petrochemicals / Thailand',7000,6000,16000],
  ['maybank','Malayan Banking Berhad','1155','MYX','MY','Financials','Commercial Banking / Malaysia',43000,25000,12000],
  ['public bank malaysia','Public Bank Berhad','1295','MYX','MY','Financials','Commercial Banking / Malaysia',20000,20000,6000],
  ['cimb group','CIMB Group Holdings Berhad','1023','MYX','MY','Financials','Commercial Banking / Malaysia',33000,15000,7000],
  ['petronas chemicals','Petronas Chemicals Group Berhad','5183','MYX','MY','Materials','Petrochemicals / Malaysia',6000,12000,7000],
  ['keppel conglomerate','Keppel Ltd','BN4','SGX','SG','Industrials','Infrastructure & Asset Mgmt / Singapore',30000,10000,7000],
  ['wilmar agribusiness','Wilmar International Ltd','F34','SGX','SG','Consumer Staples','Agribusiness & Edible Oils / Singapore',100000,15000,65000],
  ['jollibee foods','Jollibee Foods Corporation','JFC','PSE','PH','Consumer Discretionary','Fast Food Restaurants / Philippines',90000,7000,5000],
  ['sm investments','SM Investments Corporation','SM','PSE','PH','Industrials','Retail & Property Conglomerate / Philippines',80000,20000,12000],
  ['ayala corp','Ayala Corporation','AC','PSE','PH','Industrials','Diversified Conglomerate / Philippines',40000,7000,6000],
]);

const latam = g([
  ['grupo mexico mining','Grupo México SAB de CV','GMEXICOB','BMV','MX','Materials','Copper Mining & Rail / Mexico',30000,50000,14000],
  ['femsa beverages','Fomento Económico Mexicano','FMX','NYSE','MX','Consumer Staples','Beverages & Retail / Mexico',390000,50000,38000],
  ['walmart mexico','Walmart de México SAB','WALMEX','BMV','MX','Consumer Staples','Retail / Mexico',230000,55000,45000],
  ['grupo bimbo','Grupo Bimbo SAB de CV','BIMBOA','BMV','MX','Consumer Staples','Baked Goods / Mexico',140000,20000,22000],
  ['arca continental','Arca Continental SAB','AC','BMV','MX','Consumer Staples','Beverage Bottling / Mexico',80000,15000,11000],
  ['weg motors','WEG SA','WEGE3','B3','BR','Industrials','Electric Motors & Automation / Brazil',40000,30000,6000],
  ['localiza rental','Localiza Rent a Car SA','RENT3','B3','BR','Consumer Discretionary','Car Rental & Fleet / Brazil',25000,12000,6000],
  ['raia drogasil','Raia Drogasil SA','RADL3','B3','BR','Consumer Staples','Pharmacy Retail / Brazil',50000,12000,9000],
  ['ambev beverages','Ambev SA','ABEV3','B3','BR','Consumer Staples','Brewing & Beverages / Brazil',30000,30000,16000],
  ['natura cosmetics','Natura & Co Holding SA','NTCO3','B3','BR','Consumer Staples','Cosmetics & Personal Care / Brazil',25000,5000,7000],
  ['falabella retail','S.A.C.I. Falabella','FALAB','BCS','CL','Consumer Discretionary','Department Store Retail / Chile',90000,6000,14000,true,500],
  ['cencosud retail','Cencosud SA','CENCOSUD','BCS','CL','Consumer Staples','Supermarket Retail / Chile',100000,8000,15000],
  ['grupo argos','Grupo Argos SA','GRUPOARG','BVC','CO','Materials','Cement & Infrastructure / Colombia',10000,5000,5000],
  ['magazine luiza','Magazine Luiza SA','MGLU3','B3','BR','Consumer Discretionary','E-commerce & Retail / Brazil',40000,5000,7000,true,800],
]);

const menaAfrica = g([
  ['al rajhi bank','Al Rajhi Bank','1120','TADAWUL','SA','Financials','Islamic Banking / Saudi Arabia',20000,90000,15000],
  ['saudi national bank','Saudi National Bank','1180','TADAWUL','SA','Financials','Commercial Banking / Saudi Arabia',17000,60000,14000],
  ['acwa power','ACWA Power Company','2082','TADAWUL','SA','Utilities','Power & Water Generation / Saudi Arabia',4000,40000,5000],
  ['emaar properties','Emaar Properties PJSC','EMAAR','DFM','AE','Real Estate','Real Estate Development / UAE',10000,20000,8000],
  ['aldar properties','Aldar Properties PJSC','ALDAR','ADX','AE','Real Estate','Real Estate Development / UAE',5000,12000,5000],
  ['dubai islamic bank','Dubai Islamic Bank PJSC','DIB','DFM','AE','Financials','Islamic Banking / UAE',9000,15000,5000],
  ['commercial intl bank','Commercial International Bank Egypt','COMI','EGX','EG','Financials','Commercial Banking / Egypt',8000,6000,3000],
  ['mtn group','MTN Group Limited','MTN','JSE','ZA','Communications','Telecom / Africa',17000,15000,12000],
  ['sasol energy','Sasol Limited','SOL','JSE','ZA','Materials','Chemicals & Synthetic Fuels / South Africa',28000,8000,14000],
  ['standard bank','Standard Bank Group Limited','SBK','JSE','ZA','Financials','Commercial Banking / South Africa',50000,25000,15000],
  ['firstrand bank','FirstRand Limited','FSR','JSE','ZA','Financials','Banking & Financial Services / South Africa',45000,25000,12000],
  ['capitec bank','Capitec Bank Holdings Limited','CPI','JSE','ZA','Financials','Retail Banking / South Africa',15000,25000,5000],
  ['gold fields mining','Gold Fields Limited','GFI','JSE','ZA','Materials','Gold Mining / South Africa',18000,15000,5000],
  ['anglogold ashanti','AngloGold Ashanti plc','ANG','JSE','ZA','Materials','Gold Mining / South Africa',30000,12000,5000],
]);

runWaves('GLOBAL W13', V, [
  ['China A-Shares', chinaA],
  ['Southeast Asia', sea],
  ['Latin America', latam],
  ['MENA & Africa', menaAfrica],
]);
