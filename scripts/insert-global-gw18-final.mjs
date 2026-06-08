// GIANTS Wave 18 — US airlines/hospitality/travel + SEA + MENA + closeout to reach 100 new.
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'glob-gw18-v2026.1';
const g = mapRows(V);

const usAirlinesHospitality = g([
  ['american airlines','American Airlines Group Inc','AAL','NASDAQ','US','Industrials','Airlines / USA',130000,10000,55000,true,1500],
  ['southwest airlines','Southwest Airlines Co','LUV','NYSE','US','Industrials','Low-Cost Airlines / USA',72000,18000,25000],
  ['delta airlines','Delta Air Lines Inc','DAL','NYSE','US','Industrials','Airlines / USA',100000,30000,60000],
  ['united airlines','United Airlines Holdings Inc','UAL','NASDAQ','US','Industrials','Airlines / USA',100000,22000,60000],
  ['carnival cruise','Carnival Corporation & plc','CCL','NYSE','US','Consumer Discretionary','Cruise Lines / USA',160000,28000,25000,true,1000],
  ['royal caribbean cruise','Royal Caribbean Group','RCL','NYSE','US','Consumer Discretionary','Cruise Lines / USA',70000,45000,18000],
  ['norwegian cruise','Norwegian Cruise Line Holdings Ltd','NCLH','NASDAQ','US','Consumer Discretionary','Cruise Lines / USA',40000,10000,10000],
  ['mgm resorts','MGM Resorts International','MGM','NYSE','US','Consumer Discretionary','Casino & Hotels / USA',75000,15000,15000],
  ['caesars entertainment','Caesars Entertainment Inc','CZR','NASDAQ','US','Consumer Discretionary','Casino & Hotels / USA',52000,12000,12000],
  ['wynn resorts','Wynn Resorts Limited','WYNN','NASDAQ','US','Consumer Discretionary','Luxury Casino & Hotels / USA',25000,12000,7000],
  ['las vegas sands','Las Vegas Sands Corp','LVS','NYSE','US','Consumer Discretionary','Casino & Hotels / USA',55000,18000,7000],
  ['booking holdings','Booking Holdings Inc','BKNG','NASDAQ','US','Consumer Discretionary','Online Travel Agency / USA',22000,130000,22000],
  ['expedia group','Expedia Group Inc','EXPE','NASDAQ','US','Consumer Discretionary','Online Travel Agency / USA',18000,20000,13000],
  ['planet fitness','Planet Fitness Inc','PLNT','NYSE','US','Consumer Discretionary','Fitness Clubs / USA',4000,10000,1000],
  ['cinemark theaters','Cinemark Holdings Inc','CNK','NYSE','US','Consumer Discretionary','Movie Theater Chain / USA',14000,3000,2500],
  ['darden restaurants2','Brinker International Inc','EAT','NYSE','US','Consumer Discretionary','Casual Dining Restaurants / USA',100000,4000,4500],
]);

const seaAdditional = g([
  ['bdms hospital','Bangkok Dusit Medical Services PCL','BDMS','SET','TH','Healthcare','Private Hospital Network / Thailand',60000,6000,5000],
  ['bumrungrad hospital','Bumrungrad International Hospital PCL','BH','SET','TH','Healthcare','International Hospital / Thailand',4000,4000,1500],
  ['land houses thailand','Land and Houses PCL','LH','SET','TH','Real Estate','Residential Property / Thailand',5000,5000,3000],
  ['ap thailand','AP (Thailand) PCL','AP','SET','TH','Real Estate','Residential Property / Thailand',4000,4000,3000],
  ['thai union seafood','Thai Union Group PCL','TU','SET','TH','Consumer Staples','Seafood Processing / Thailand',40000,5000,5000],
  ['ivl indorama','Indorama Ventures PCL','IVL','SET','TH','Materials','Polyester & Chemicals / Thailand',26000,8000,15000],
  ['capitaland ascendas','CapitaLand Ascendas REIT','A17U','SGX','SG','Real Estate','Industrial & Logistics REIT / Singapore',1200,15000,1200],
  ['mapletree logistics trust','Mapletree Logistics Trust','M44U','SGX','SG','Real Estate','Logistics REIT / Singapore',500,12000,800],
  ['mapletree industrial','Mapletree Industrial Trust','ME8U','SGX','SG','Real Estate','Industrial REIT / Singapore',400,8000,600],
  ['ptt global chem','PTT Global Chemical PCL','PTTGC','SET','TH','Materials','Petrochemicals / Thailand',7000,6000,16000],
]);

const menaGulf2 = g([
  ['air arabia uae','Air Arabia PJSC','AIRARABIA','DFM','AE','Industrials','Low-Cost Airlines / UAE',3000,3000,2500],
  ['jazeera airways','Jazeera Airways Co KSCP','JAZEERA','BVL','KW','Industrials','Low-Cost Airlines / Kuwait',1500,2000,1200],
  ['omantel telecom','Oman Telecommunications Company','OTEL','MSM','OM','Communications','Telecom / Oman',3500,3000,2000],
  ['ooredoo oman','Ooredoo KSCP','ORDS','MSM','OM','Communications','Mobile Telecom / Oman',2000,2000,1200],
  ['bank muscat','Bank Muscat SAOG','BKMB','MSM','OM','Financials','Commercial Banking / Oman',4000,5000,3000],
  ['bupa arabia','Bupa Arabia for Cooperative Insurance','BUPA','TADAWUL','SA','Financials','Health Insurance / Saudi Arabia',3000,12000,4000],
  ['kenya commercial bank','KCB Group PLC','KCB','NSE','KE','Financials','Commercial Banking / Kenya',8000,5000,5000],
  ['equity bank kenya','Equity Group Holdings Plc','EQTY','NSE','KE','Financials','Commercial Banking / Kenya',10000,5000,5000],
  ['stanbic nigeria','Stanbic IBTC Holdings PLC','STANBIC','NSE','NG','Financials','Commercial Banking / Nigeria',4000,4000,3000],
  ['uba nigeria','United Bank for Africa Plc','UBA','NSE','NG','Financials','Pan-African Banking / Nigeria',25000,6000,8000],
  ['fbn holdings','FBN Holdings PLC','FBNH','NSE','NG','Financials','Commercial Banking / Nigeria',10000,5000,5000],
  ['atm morocco','Wafa Assurance SA','WAA','CSE','MA','Financials','Insurance / Morocco',4000,3000,2000],
  ['bmce bank','Bank of Africa BMCE','BOA','CSE','MA','Financials','Commercial Banking / Morocco',13000,4000,4000],
  ['banque populaire maroc','Credit du Maroc SA','CDM','CSE','MA','Financials','Commercial Banking / Morocco',4000,3000,2000],
]);

const scgCement = g([
  ['scg group','SCG - Siam Cement Group','SCC','SET','TH','Materials','Cement & Building Materials / Thailand',54000,10000,15000],
  ['indocement','Indocement Tunggal Prakarsa Tbk','INTP','IDX','ID','Materials','Cement Manufacturing / Indonesia',11000,3000,5000],
  ['semen indonesia','Semen Indonesia Persero Tbk','SMGR','IDX','ID','Materials','Cement Manufacturing / Indonesia',23000,3000,8000],
  ['holcim indonesia','Holcim Indonesia Tbk','SMCB','IDX','ID','Materials','Cement Manufacturing / Indonesia',8000,3000,5000],
]);

runWaves('GIANTS GW18', V, [
  ['US Airlines & Hospitality', usAirlinesHospitality],
  ['SEA Additional', seaAdditional],
  ['MENA & Gulf 2', menaGulf2],
  ['Cement Asia', scgCement],
]);
