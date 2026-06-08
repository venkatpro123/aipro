// GIANTS Wave 9 — Taiwan + Australia + India additional large-caps.
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'glob-gw9-v2026.1';
const g = mapRows(V);

const taiwan2 = g([
  ['acer computers','Acer Inc','2353','TWSE','TW','Technology','PCs & Notebooks / Taiwan',8000,7000,9000],
  ['asustek computer','ASUSTeK Computer Inc','2357','TWSE','TW','Technology','PCs & Motherboards / Taiwan',17000,12000,15000],
  ['gigabyte technology','Gigabyte Technology Co Ltd','2376','TWSE','TW','Technology','Motherboards & GPUs / Taiwan',5000,6000,4000],
  ['pegatron electronics','Pegatron Corporation','4938','TWSE','TW','Technology','Electronics ODM / Taiwan',100000,14000,50000],
  ['nanya technology','Nanya Technology Corporation','2408','TWSE','TW','Technology','DRAM Semiconductors / Taiwan',7000,6000,3000],
  ['hotai motor','Hotai Motor Co Ltd','2207','TWSE','TW','Consumer Discretionary','Toyota Dealer & Auto / Taiwan',5000,15000,8000],
  ['taiwan cement','Taiwan Cement Corporation','1101','TWSE','TW','Materials','Cement Manufacturing / Taiwan',16000,8000,7000],
  ['evergreen marine','Evergreen Marine Corporation','2603','TWSE','TW','Industrials','Container Shipping / Taiwan',7000,15000,12000],
  ['yang ming marine','Yang Ming Marine Transport Corp','2609','TWSE','TW','Industrials','Container Shipping / Taiwan',6000,8000,8000],
  ['wan hai lines','Wan Hai Lines Ltd','2615','TWSE','TW','Industrials','Container Shipping / Taiwan',3500,5000,6000],
  ['test rite retail','Test Rite International Co Ltd','2908','TWSE','TW','Consumer Discretionary','Retail & Distribution / Taiwan',4000,4000,2000],
  ['ctci engineering','CTCI Corporation','9933','TWSE','TW','Industrials','Engineering & Construction / Taiwan',10000,5000,6000],
]);

const australia2 = g([
  ['afterpay zip2','Zip Co Limited','ZIP','ASX','AU','Financial Technology','Buy Now Pay Later / Australia',1200,1500,350],
  ['nab bank','National Australia Bank Limited','NAB','ASX','AU','Financials','Commercial Banking / Australia',37000,75000,20000],
  ['anz banking group','ANZ Group Holdings Limited','ANZ','ASX','AU','Financials','Commercial Banking / Australia',40000,55000,18000],
  ['reece plumbing','Reece Limited','REH','ASX','AU','Industrials','Plumbing Supplies / Australia',9000,8000,4000],
  ['super retail group','Super Retail Group Limited','SUL','ASX','AU','Consumer Discretionary','Sporting Goods & Auto Retail / Australia',15000,4000,4000],
  ['orica chemicals','Orica Limited','ORI','ASX','AU','Materials','Mining Explosives / Australia',14000,6000,7000],
  ['incitec pivot','Incitec Pivot Limited','IPL','ASX','AU','Materials','Fertilizers & Explosives / Australia',5000,5000,6000],
  ['ansell safety','Ansell Limited','ANN','ASX','AU','Healthcare','Safety Solutions / Australia',13000,3000,2000],
  ['mineral resources','Mineral Resources Limited','MIN','ASX','AU','Materials','Mining Services & Lithium / Australia',8000,10000,5000],
  ['allkem lithium','Arcadium Lithium plc','ALTM','ASX','AU','Materials','Lithium Mining / Australia',2500,4000,1000],
  ['perpetual asset','Perpetual Limited','PPT','ASX','AU','Financials','Asset Management / Australia',2500,2000,1500],
  ['iag insurance','Insurance Australia Group Ltd','IAG','ASX','AU','Financials','General Insurance / Australia',14000,18000,12000],
]);

const india2 = g([
  ['wipro tech','Wipro Limited','WIPRO','NSE','IN','Technology','IT Services / India',230000,30000,12000],
  ['vedanta resources','Vedanta Limited','VEDL','NSE','IN','Materials','Diversified Mining & Metals / India',65000,15000,16000],
  ['hindalco aluminium','Hindalco Industries Limited','HINDALCO','NSE','IN','Materials','Aluminium & Copper / India',55000,30000,25000],
  ['tata power','Tata Power Company Limited','TATAPOWER','NSE','IN','Utilities','Power Generation / India',16000,20000,5000],
  ['gail gas','GAIL (India) Limited','GAIL','NSE','IN','Energy','Natural Gas Transmission / India',5000,20000,18000],
  ['bharat petroleum','Bharat Petroleum Corporation Ltd','BPCL','NSE','IN','Energy','Oil Refining & Marketing / India',13000,18000,60000],
  ['ultratech cement','UltraTech Cement Limited','ULTRACEMCO','NSE','IN','Materials','Cement Manufacturing / India',24000,25000,8000],
  ['shree cement','Shree Cement Limited','SHREECEM','NSE','IN','Materials','Cement Manufacturing / India',8000,12000,4000],
  ['bajaj finance','Bajaj Finance Limited','BAJFINANCE','NSE','IN','Financials','Consumer Lending / India',17000,55000,6000],
  ['bajaj finserv','Bajaj Finserv Limited','BAJAJFINSV','NSE','IN','Financials','Financial Services / India',8000,20000,3000],
  ['hdfc life insurance','HDFC Life Insurance Company Ltd','HDFCLIFE','NSE','IN','Financials','Life Insurance / India',17000,30000,5000],
  ['sbi life insurance','SBI Life Insurance Company Ltd','SBILIFE','NSE','IN','Financials','Life Insurance / India',20000,25000,6000],
  ['axis bank','Axis Bank Limited','AXISBANK','NSE','IN','Financials','Commercial Banking / India',65000,35000,12000],
  ['kotak mahindra bank','Kotak Mahindra Bank Limited','KOTAKBANK','NSE','IN','Financials','Commercial Banking / India',90000,50000,8000],
  ['indusind bank','IndusInd Bank Limited','INDUSINDBK','NSE','IN','Financials','Commercial Banking / India',35000,12000,4000],
  ['tata motors','Tata Motors Limited','TATAMOTORS','NSE','IN','Consumer Discretionary','Automobiles & JLR / India',90000,40000,55000],
]);

runWaves('GIANTS GW9', V, [
  ['Taiwan Additional', taiwan2],
  ['Australia Additional', australia2],
  ['India Additional', india2],
]);
