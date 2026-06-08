// GIANTS Wave 6 — US industrials/consumer/energy/financials large-caps not yet in DB. All >= $10B.
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'glob-gw6-v2026.1';
const g = mapRows(V);

const usIndustrials = g([
  ['paccar trucks','PACCAR Inc','PCAR','NASDAQ','US','Industrials','Commercial Trucks / USA',30000,55000,33000],
  ['cummins engines','Cummins Inc','CMI','NYSE','US','Industrials','Diesel & Power Engines / USA',75000,45000,34000],
  ['otis elevators','Otis Worldwide Corporation','OTIS','NYSE','US','Industrials','Elevators & Escalators / USA',72000,40000,14000],
  ['carrier hvac','Carrier Global Corporation','CARR','NYSE','US','Industrials','HVAC & Refrigeration / USA',50000,55000,22000],
  ['trane technologies','Trane Technologies plc','TT','NYSE','US','Industrials','HVAC Systems / USA',40000,90000,19000],
  ['johnson controls','Johnson Controls International plc','JCI','NYSE','US','Industrials','Building Technologies / USA',100000,60000,27000],
  ['waste management','Waste Management Inc','WM','NYSE','US','Industrials','Waste Collection & Disposal / USA',48000,90000,21000],
  ['republic services','Republic Services Inc','RSG','NYSE','US','Industrials','Waste Management / USA',40000,70000,16000],
  ['norfolk southern','Norfolk Southern Corporation','NSC','NYSE','US','Industrials','Class I Railroad / USA',20000,55000,12000],
  ['csx railroad','CSX Corporation','CSX','NASDAQ','US','Industrials','Class I Railroad / USA',23000,65000,14000],
  ['deere agriculture','Deere & Company','DE','NYSE','US','Industrials','Agricultural Machinery / USA',83000,130000,55000],
  ['rockwell automation','Rockwell Automation Inc','ROK','NYSE','US','Industrials','Industrial Automation / USA',28000,35000,8500],
  ['ww grainger','W.W. Grainger Inc','GWW','NYSE','US','Industrials','MRO Distribution / USA',26000,55000,17000],
  ['fastenal distribution','Fastenal Company','FAST','NASDAQ','US','Industrials','Industrial Fasteners Distribution / USA',23000,45000,8000],
  ['united rentals','United Rentals Inc','URI','NYSE','US','Industrials','Equipment Rental / USA',27000,55000,15000],
  ['l3harris defense','L3Harris Technologies Inc','LHX','NYSE','US','Industrials','Defense Electronics / USA',50000,45000,21000],
]);

const usConsumer = g([
  ['kroger grocery','The Kroger Co','KR','NYSE','US','Consumer Staples','Grocery Retail / USA',420000,45000,150000],
  ['adm agribusiness','Archer-Daniels-Midland Company','ADM','NYSE','US','Consumer Staples','Agribusiness Processing / USA',40000,25000,85000],
  ['sysco foodservice','Sysco Corporation','SYY','NYSE','US','Consumer Staples','Food Distribution / USA',76000,35000,80000],
  ['yum brands','Yum! Brands Inc','YUM','NYSE','US','Consumer Discretionary','Quick Service Restaurants / USA',36000,40000,7500],
  ['darden restaurants','Darden Restaurants Inc','DRI','NYSE','US','Consumer Discretionary','Full Service Restaurants / USA',190000,22000,12000],
  ['marriott hotels','Marriott International Inc','MAR','NASDAQ','US','Consumer Discretionary','Hotels / USA',140000,75000,25000],
  ['hilton hotels','Hilton Worldwide Holdings Inc','HLT','NYSE','US','Consumer Discretionary','Hotels / USA',180000,60000,11000],
  ['general mills','General Mills Inc','GIS','NYSE','US','Consumer Staples','Packaged Foods / USA',34000,35000,20000],
  ['kraft heinz','The Kraft Heinz Company','KHC','NASDAQ','US','Consumer Staples','Packaged Foods / USA',36000,35000,26000],
  ['kenvue consumer health','Kenvue Inc','KVUE','NYSE','US','Consumer Staples','Consumer Health Products / USA',22000,40000,16000],
  ['keurig dr pepper','Keurig Dr Pepper Inc','KDP','NASDAQ','US','Consumer Staples','Beverages / USA',28000,45000,15000],
  ['monster beverage','Monster Beverage Corporation','MNST','NASDAQ','US','Consumer Staples','Energy Drinks / USA',6000,55000,7500],
  ['kellanova snacks','Kellanova','K','NYSE','US','Consumer Staples','Snacks / USA',23000,28000,13000],
  ['lululemon athletica','Lululemon Athletica Inc','LULU','NASDAQ','US','Consumer Discretionary','Athletic Apparel / USA',38000,40000,10000],
  ['oreilly auto','O\'Reilly Automotive Inc','ORLY','NASDAQ','US','Consumer Discretionary','Auto Parts Retail / USA',90000,70000,16000],
  ['autozone parts','AutoZone Inc','AZO','NYSE','US','Consumer Discretionary','Auto Parts Retail / USA',120000,60000,18000],
]);

const usEnergy = g([
  ['conocophillips','ConocoPhillips','COP','NYSE','US','Energy','Oil & Gas E&P / USA',10000,130000,55000],
  ['eog resources','EOG Resources Inc','EOG','NYSE','US','Energy','Oil & Gas E&P / USA',3000,70000,24000],
  ['williams pipelines','The Williams Companies Inc','WMB','NYSE','US','Energy','Natural Gas Pipelines / USA',5500,65000,11000],
  ['kinder morgan','Kinder Morgan Inc','KMI','NYSE','US','Energy','Natural Gas Pipelines / USA',11000,55000,16000],
  ['oneok midstream','ONEOK Inc','OKE','NYSE','US','Energy','Natural Gas Midstream / USA',7000,55000,22000],
  ['schlumberger services','Schlumberger Limited','SLB','NYSE','US','Energy','Oilfield Services / USA',110000,60000,36000],
  ['halliburton services','Halliburton Company','HAL','NYSE','US','Energy','Oilfield Services / USA',48000,25000,23000],
  ['baker hughes','Baker Hughes Company','BKR','NASDAQ','US','Energy','Oilfield Services & Equipment / USA',58000,45000,28000],
  ['phillips 66','Phillips 66','PSX','NYSE','US','Energy','Oil Refining / USA',14000,55000,140000],
  ['valero refining','Valero Energy Corporation','VLO','NYSE','US','Energy','Oil Refining / USA',10000,45000,130000],
  ['marathon petroleum','Marathon Petroleum Corporation','MPC','NYSE','US','Energy','Oil Refining / USA',18000,55000,140000],
]);

const usFinancials = g([
  ['capital one','Capital One Financial Corporation','COF','NYSE','US','Financials','Consumer Banking & Cards / USA',52000,60000,40000],
  ['us bancorp','U.S. Bancorp','USB','NYSE','US','Financials','Commercial Banking / USA',70000,70000,28000],
  ['pnc financial','The PNC Financial Services Group Inc','PNC','NYSE','US','Financials','Commercial Banking / USA',55000,75000,22000],
  ['truist financial','Truist Financial Corporation','TFC','NYSE','US','Financials','Commercial Banking / USA',50000,55000,23000],
  ['aig insurance','American International Group Inc','AIG','NYSE','US','Financials','Property Casualty Insurance / USA',26000,45000,45000],
  ['metlife insurance','MetLife Inc','MET','NYSE','US','Financials','Life Insurance / USA',45000,55000,70000],
  ['prudential financial','Prudential Financial Inc','PRU','NYSE','US','Financials','Life Insurance & Asset Mgmt / USA',40000,40000,55000],
  ['aflac insurance','Aflac Incorporated','AFL','NYSE','US','Financials','Supplemental Insurance / USA',12000,60000,19000],
  ['travelers insurance','The Travelers Companies Inc','TRV','NYSE','US','Financials','Property Casualty Insurance / USA',33000,55000,45000],
  ['chubb insurance','Chubb Limited','CB','NYSE','US','Financials','Property Casualty Insurance / USA',40000,110000,55000],
  ['progressive insurance','The Progressive Corporation','PGR','NYSE','US','Financials','Auto Insurance / USA',60000,150000,70000],
  ['allstate insurance','The Allstate Corporation','ALL','NYSE','US','Financials','Property Casualty Insurance / USA',54000,50000,60000],
]);

runWaves('GIANTS GW6', V, [
  ['US Industrials', usIndustrials],
  ['US Consumer', usConsumer],
  ['US Energy', usEnergy],
  ['US Financials', usFinancials],
]);
