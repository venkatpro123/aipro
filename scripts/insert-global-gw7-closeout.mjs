// GIANTS Wave 7 — final closeout (Japan + Europe second-tier + China/India majors) to cross 300 net new. All >= $10B.
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'glob-gw7-v2026.1';
const g = mapRows(V);

const japan = g([
  ['tokio marine','Tokio Marine Holdings Inc','8766','TYO','JP','Financials','Property Casualty Insurance / Japan',43000,70000,40000],
  ['dai-ichi life','Dai-ichi Life Holdings Inc','8750','TYO','JP','Financials','Life Insurance / Japan',60000,30000,45000],
  ['japan tobacco','Japan Tobacco Inc','2914','TYO','JP','Consumer Staples','Tobacco / Japan',53000,60000,20000],
  ['astellas pharma','Astellas Pharma Inc','4503','TYO','JP','Healthcare','Pharmaceuticals / Japan',35000,25000,12000],
  ['daiichi sankyo','Daiichi Sankyo Company Limited','4568','TYO','JP','Healthcare','Pharmaceuticals / Japan',18000,90000,12000],
  ['chugai pharma','Chugai Pharmaceutical Co Ltd','4519','TYO','JP','Healthcare','Pharmaceuticals / Japan',8000,70000,8000],
  ['takeda pharma','Takeda Pharmaceutical Company Ltd','4502','TYO','JP','Healthcare','Pharmaceuticals / Japan',50000,45000,30000],
  ['mitsubishi heavy','Mitsubishi Heavy Industries Ltd','7011','TYO','JP','Industrials','Heavy Machinery & Defense / Japan',77000,40000,30000],
  ['ajinomoto food','Ajinomoto Co Inc','2802','TYO','JP','Consumer Staples','Food & Amino Acids / Japan',34000,25000,10000],
  ['asahi group','Asahi Group Holdings Ltd','2502','TYO','JP','Consumer Staples','Beverages & Beer / Japan',30000,20000,20000],
  ['kirin holdings','Kirin Holdings Company Limited','2503','TYO','JP','Consumer Staples','Beverages / Japan',30000,12000,14000],
  ['seven and i','Seven & i Holdings Co Ltd','3382','TYO','JP','Consumer Staples','Convenience Retail / Japan',85000,40000,75000],
  ['tokyo electron','Tokyo Electron Limited','8035','TYO','JP','Technology','Semiconductor Equipment / Japan',18000,90000,15000],
  ['nomura holdings','Nomura Holdings Inc','8604','TYO','JP','Financials','Investment Banking & Brokerage / Japan',27000,20000,15000],
  ['orix financial','ORIX Corporation','8591','TYO','JP','Financials','Diversified Financial Services / Japan',35000,25000,22000],
  ['sumitomo mitsui trust','Sumitomo Mitsui Trust Holdings Inc','8309','TYO','JP','Financials','Trust Banking / Japan',20000,20000,15000],
]);

const europe = g([
  ['deutsche post dhl','Deutsche Post AG','DHL','XETRA','DE','Industrials','Logistics & Express / Germany',590000,50000,90000],
  ['iag airlines','International Consolidated Airlines Group','IAG','LSE','GB','Industrials','Airlines / UK',70000,12000,30000],
  ['ryanair airline','Ryanair Holdings plc','RYA','LSE','IE','Industrials','Low-Cost Airline / Ireland',25000,25000,14000],
  ['philips healthtech','Koninklijke Philips NV','PHIA','AMS','NL','Healthcare','Health Technology / Netherlands',70000,25000,20000],
  ['lindt chocolate','Chocoladefabriken Lindt & Sprüngli','LISN','SIX','CH','Consumer Staples','Premium Chocolate / Switzerland',14000,30000,6000],
  ['universal music','Universal Music Group NV','UMG','AMS','NL','Communications','Music Recording & Publishing / Netherlands',10000,45000,12000],
  ['endesa utility','Endesa SA','ELE','BME','ES','Utilities','Electric Utility / Spain',9000,25000,25000],
  ['naturgy energy','Naturgy Energy Group SA','NTGY','BME','ES','Utilities','Gas & Electric Utility / Spain',7000,25000,25000],
  ['caixabank','CaixaBank SA','CABK','BME','ES','Financials','Commercial Banking / Spain',45000,35000,15000],
  ['banco sabadell','Banco de Sabadell SA','SAB','BME','ES','Financials','Commercial Banking / Spain',19000,15000,6000],
  ['mediobanca','Mediobanca Banca di Credito Finanziario','MB','MIL','IT','Financials','Investment Banking / Italy',5000,12000,4000],
  ['poste italiane','Poste Italiane SpA','PST','MIL','IT','Financials','Postal & Financial Services / Italy',120000,15000,12000],
  ['terna grid','Terna SpA','TRN','MIL','IT','Utilities','Electricity Transmission / Italy',5000,18000,3000],
  ['italgas distribution','Italgas SpA','IG','MIL','IT','Utilities','Gas Distribution / Italy',4000,12000,4000],
  ['leg immobilien','LEG Immobilien SE','LEG','XETRA','DE','Real Estate','Residential Real Estate / Germany',1700,12000,3000],
  ['omv energy','OMV AG','OMV','VIE','AT','Energy','Integrated Oil & Gas / Austria',22000,15000,40000],
]);

const chinaIndiaMisc = g([
  ['anta sports','ANTA Sports Products Limited','2020','HKSE','HK','Consumer Discretionary','Sportswear / China',60000,30000,9000],
  ['geely auto','Geely Automobile Holdings Limited','0175','HKSE','HK','Consumer Discretionary','Automobiles / China',45000,25000,30000],
  ['great wall motor','Great Wall Motor Company Limited','2333','HKSE','HK','Consumer Discretionary','Automobiles & SUVs / China',80000,20000,25000],
  ['sinopharm','Sinopharm Group Co Ltd','1099','HKSE','HK','Healthcare','Pharmaceutical Distribution / China',130000,15000,85000],
  ['china resources beer','China Resources Beer Holdings','0291','HKSE','HK','Consumer Staples','Brewing / China',25000,15000,5000],
  ['enn energy','ENN Energy Holdings Limited','2688','HKSE','HK','Utilities','Gas Distribution / China',40000,12000,15000],
  ['haidilao hotpot','Haidilao International Holding Ltd','6862','HKSE','HK','Consumer Discretionary','Restaurants Hotpot / China',140000,12000,6000],
  ['bharat electronics','Bharat Electronics Limited','BEL','NSE','IN','Industrials','Defense Electronics / India',9000,25000,4000],
  ['hindustan aeronautics','Hindustan Aeronautics Limited','HAL','NSE','IN','Industrials','Aerospace & Defense / India',30000,35000,4000],
  ['avenue supermarts','Avenue Supermarts Ltd','DMART','NSE','IN','Consumer Staples','Grocery Retail DMart / India',12000,35000,7000],
  ['tata motors','Tata Motors Limited','TATAMOTORS','NSE','IN','Consumer Discretionary','Automobiles JLR / India',90000,40000,55000],
  ['jsw steel','JSW Steel Limited','JSWSTEEL','NSE','IN','Materials','Steel Manufacturing / India',45000,30000,22000],
  ['tata steel','Tata Steel Limited','TATASTEEL','NSE','IN','Materials','Steel Manufacturing / India',78000,25000,28000],
  ['nestle india','Nestlé India Limited','NESTLEIND','NSE','IN','Consumer Staples','Packaged Foods / India',8000,30000,3000],
  ['bharti airtel','Bharti Airtel Limited','BHARTIARTL','NSE','IN','Communications','Telecom / India',25000,100000,18000],
  ['bajaj auto','Bajaj Auto Limited','BAJAJ-AUTO','NSE','IN','Consumer Discretionary','Two-Wheelers & Auto / India',10000,30000,6000],
]);

runWaves('GIANTS GW7', V, [
  ['Japan', japan],
  ['Europe Second-Tier', europe],
  ['China/India/Misc', chinaIndiaMisc],
]);
