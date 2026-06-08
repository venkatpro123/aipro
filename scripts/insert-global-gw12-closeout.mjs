// GIANTS Wave 12 — Final closeout: US remaining + UK/European + Asia misc to cross 300.
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'glob-gw12-v2026.1';
const g = mapRows(V);

const usRemaining = g([
  ['brown forman','Brown-Forman Corporation','BF-B','NYSE','US','Consumer Staples','Spirits & Wine / USA',5000,20000,4000],
  ['constellation brands','Constellation Brands Inc','STZ','NYSE','US','Consumer Staples','Beer Wine Spirits / USA',10000,40000,10000],
  ['molson coors','Molson Coors Beverage Company','TAP','NYSE','US','Consumer Staples','Brewing / USA',17000,13000,11000],
  ['reynolds consumer','Reynolds Consumer Products Inc','REYN','NASDAQ','US','Consumer Staples','Consumer Packaging / USA',5000,5000,3500],
  ['energizer battery','Energizer Holdings Inc','ENR','NYSE','US','Consumer Staples','Batteries / USA',6000,3000,3000],
  ['spectrum brands','Spectrum Brands Holdings Inc','SPB','NYSE','US','Consumer Staples','Home & Garden Products / USA',12000,3000,3000],
  ['avery dennison','Avery Dennison Corporation','AVY','NYSE','US','Materials','Labels & Packaging / USA',35000,22000,9000],
  ['packaging corp','Packaging Corporation of America','PKG','NYSE','US','Materials','Containerboard & Boxes / USA',15000,18000,8000],
  ['sealed air packaging','Sealed Air Corporation','SEE','NYSE','US','Materials','Protective Packaging / USA',17000,8000,5500],
  ['sonoco products','Sonoco Products Company','SON','NYSE','US','Materials','Industrial Packaging / USA',22000,6000,7000],
  ['silganpkg2 aptar','AptarGroup Inc','ATR','NYSE','US','Materials','Drug Delivery & Consumer Dispensing / USA',14000,8000,4000],
  ['watts water','Watts Water Technologies Inc','WTS','NYSE','US','Industrials','Water Products / USA',5000,7000,2000],
  ['rexnord water','Zurn Elkay Water Solutions Corp','ZWS','NYSE','US','Industrials','Water & Flow Control / USA',3500,5000,1500],
  ['badger meter','Badger Meter Inc','BMI','NYSE','US','Technology','Smart Water Meters / USA',2000,4000,700],
  ['tetra tech','Tetra Tech Inc','TTEK','NASDAQ','US','Industrials','Environmental Engineering / USA',28000,6000,5000],
  ['clean harbors','Clean Harbors Inc','CLH','NYSE','US','Industrials','Environmental Services / USA',22000,8000,6000],
  ['stericycle waste','Stericycle Inc','SRCL','NASDAQ','US','Industrials','Medical Waste Management / USA',17000,5000,3000],
  ['casella waste','Casella Waste Systems Inc','CWST','NASDAQ','US','Industrials','Waste Management / USA',5000,3500,1500],
  ['granite construction','Granite Construction Incorporated','GVA','NYSE','US','Industrials','Heavy Construction / USA',9000,4000,4000],
  ['apogee enterprises','Apogee Enterprises Inc','APOG','NASDAQ','US','Industrials','Architectural Glass / USA',6000,4000,1400],
  ['hillenbrand','Hillenbrand Inc','HI','NYSE','US','Industrials','Industrial Equipment / USA',11000,5000,3000],
  ['rogers corporation','Rogers Corporation','ROG','NYSE','US','Industrials','Advanced Electronic Materials / USA',9000,3000,2000],
]);

const ukRemaining = g([
  ['bt group telecom','BT Group plc','BT-A','LSE','GB','Communications','Telecom / UK',100000,18000,20000],
  ['sky uk','Sky Limited','SKY','LSE','GB','Communications','Pay TV & Broadband / UK',30000,18000,8000],
  ['arm holdings','Arm Holdings plc','ARM','NASDAQ','GB','Technology','Semiconductor IP / UK',7000,130000,3500],
  ['cranswick food','Cranswick plc','CWK','LSE','GB','Consumer Staples','Food Production / UK',13000,3000,3000],
  ['greencore food','Greencore Group plc','GNC','LSE','GB','Consumer Staples','Convenience Food / UK',16000,2000,3500],
  ['primrose pet','Pets at Home Group Plc','PETS','LSE','GB','Consumer Discretionary','Pet Products & Vet / UK',8000,3000,2000],
  ['dunelm homeware','Dunelm Group plc','DNLM','LSE','GB','Consumer Discretionary','Homewares Retail / UK',12000,3000,2000],
  ['b&m retail','B&M European Value Retail SA','BME','LSE','GB','Consumer Discretionary','Discount Retail / UK',35000,5000,6000],
  ['next retail','Next plc','NXT','LSE','GB','Consumer Discretionary','Fashion Retail / UK',45000,6000,7000],
  ['jd sports fashion','JD Sports Fashion plc','JD','LSE','GB','Consumer Discretionary','Athletic Retail / UK',90000,15000,12000],
  ['marks spencer','Marks and Spencer Group plc','MKS','LSE','GB','Consumer Discretionary','Clothing & Food Retail / UK',60000,14000,15000],
  ['imperial brands','Imperial Brands PLC','IMB','LSE','GB','Consumer Staples','Tobacco / UK',27000,20000,20000],
  ['spectris instruments','Spectris plc','SXS','LSE','GB','Technology','Electronic Test & Measurement / UK',11000,6000,2000],
  ['wood group engineering','John Wood Group PLC','WG','LSE','GB','Industrials','Engineering Services / UK',40000,5000,6000],
  ['convatec medical','ConvaTec Group plc','CTEC','LSE','GB','Healthcare','Medical Devices / UK',10000,5000,2300],
]);

const asiaMisc = g([
  ['infosys bpm','Infosys BPM Limited','IBPM','NSE','IN','Technology','Business Process Management / India',55000,5000,2500],
  ['tech mahindra','Tech Mahindra Limited','TECHM','NSE','IN','Technology','IT Services / India',150000,18000,7000],
  ['hcl technologies','HCL Technologies Limited','HCLTECH','NSE','IN','Technology','IT Services / India',220000,55000,15000],
  ['mphasis it','Mphasis Limited','MPHASIS','NSE','IN','Technology','IT Services / India',33000,6000,1800],
  ['cyient engineering','Cyient Limited','CYIENT','NSE','IN','Technology','Engineering Services / India',16000,4000,1200],
  ['persistent systems','Persistent Systems Limited','PERSISTENT','NSE','IN','Technology','IT Services / India',23000,5000,2000],
  ['jsw energy','JSW Energy Limited','JSWENERGY','NSE','IN','Utilities','Power Generation / India',2500,8000,2000],
  ['torrent power','Torrent Power Limited','TORNTPOWER','NSE','IN','Utilities','Power Generation & Distribution / India',7000,8000,4000],
  ['cesc power','CESC Limited','CESC','NSE','IN','Utilities','Power Generation Kolkata / India',10000,5000,3000],
  ['aditya birla capital','Aditya Birla Capital Limited','ABCAPITAL','NSE','IN','Financials','Financial Services / India',20000,12000,3000],
  ['shriram finance','Shriram Finance Limited','SHRIRAMFIN','NSE','IN','Financials','Vehicle Finance / India',50000,18000,8000],
  ['cholamandalam finance','Cholamandalam Investment & Finance','CHOLAFIN','NSE','IN','Financials','Retail Finance / India',40000,12000,5000],
  ['sibanye stillwater','Sibanye Stillwater Limited','SSW','JSE','ZA','Materials','Gold & PGM Mining / South Africa',85000,5000,10000],
  ['impala platinum','Implats Platinum Holdings Limited','IMP','JSE','ZA','Materials','Platinum Mining / South Africa',55000,5000,6000],
  ['northam platinum','Northam Platinum Holdings Limited','NPH','JSE','ZA','Materials','Platinum Mining / South Africa',17000,5000,3000],
  ['medibank private','Medibank Private Limited','MPL','ASX','AU','Financials','Private Health Insurance / Australia',4000,10000,4000],
  ['evolution mining','Evolution Mining Limited','EVN','ASX','AU','Materials','Gold Mining / Australia',5000,5000,2000],
  ['regis resources','Regis Resources Limited','RRL','ASX','AU','Materials','Gold Mining / Australia',2500,2000,800],
]);

runWaves('GIANTS GW12', V, [
  ['US Remaining', usRemaining],
  ['UK Remaining', ukRemaining],
  ['Asia Misc', asiaMisc],
]);
