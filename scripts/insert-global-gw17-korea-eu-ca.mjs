// GIANTS Wave 17 — Korea additional + Europe industrials + Canada additional.
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'glob-gw17-v2026.1';
const g = mapRows(V);

const korea3 = g([
  ['woori financial','Woori Financial Group Inc','316140','KRX','KR','Financials','Commercial Banking / Korea',16000,12000,15000],
  ['kb securities','KB Securities Co Ltd','KBSEC','KRX','KR','Financials','Investment Banking & Brokerage / Korea',4000,8000,5000],
  ['kdb bank','Korea Development Bank','KDB','KRX','KR','Financials','Development Banking / Korea',5000,12000,20000],
  ['korea gas','Korea Gas Corporation','036460','KRX','KR','Utilities','Natural Gas Distribution / Korea',3500,8000,20000],
  ['doosan heavy','HD Hyundai Electric Co Ltd','267260','KRX','KR','Industrials','Electric Power Equipment / Korea',3000,6000,2000],
  ['samsung electro mech','Samsung Electro-Mechanics Co Ltd','009150','KRX','KR','Technology','Electronic Components / Korea',23000,10000,8000],
]);

const europeIndustrials = g([
  ['abb ltd','ABB Ltd','ABBN','SIX','CH','Industrials','Robotics & Electrification / Switzerland',105000,85000,32000],
  ['atlas copco','Atlas Copco AB','ATCO-A','OMX','SE','Industrials','Compressors & Tools / Sweden',62000,55000,15000],
  ['sandvik manufacturing','Sandvik AB','SAND','OMX','SE','Industrials','Mining Equipment & Cutting Tools / Sweden',40000,25000,12000],
  ['volvo cars','Volvo Car AB','VOLCAR-B','OMX','SE','Consumer Discretionary','Passenger Vehicles / Sweden',43000,20000,28000],
  ['fresenius medical care','Fresenius Medical Care AG','FME','XETRA','DE','Healthcare','Kidney Dialysis / Germany',120000,18000,20000,true,1000],
  ['fresenius se','Fresenius SE & Co KGaA','FRE','XETRA','DE','Healthcare','Hospital & Healthcare / Germany',85000,25000,22000,true,800],
  ['lanxess chemicals','LANXESS AG','LXS','XETRA','DE','Materials','Specialty Chemicals / Germany',14000,5000,7000],
  ['covestro polymers','Covestro AG','1COV','XETRA','DE','Materials','Polycarbonates & Polyurethanes / Germany',18000,10000,16000],
]);

const canada2 = g([
  ['canadian tire corp','Canadian Tire Corporation Limited','CTC','TSX','CA','Consumer Discretionary','Retail & Auto / Canada',58000,15000,16000],
  ['metro grocery','Metro Inc','MRU','TSX','CA','Consumer Staples','Grocery & Pharmacy Retail / Canada',90000,18000,18000],
  ['empire grocery','Empire Company Limited','EMP-A','TSX','CA','Consumer Staples','Grocery Retail / Canada',130000,12000,20000],
  ['george weston','George Weston Limited','WN','TSX','CA','Consumer Staples','Food Processing & Retail / Canada',200000,20000,55000],
  ['pembina pipeline','Pembina Pipeline Corporation','PPL','TSX','CA','Energy','Pipelines & Midstream / Canada',5000,22000,9000],
  ['arc resources','ARC Resources Ltd','ARX','TSX','CA','Energy','Oil & Gas E&P / Canada',2500,10000,4000],
  ['tourmaline oil','Tourmaline Oil Corp','TOU','TSX','CA','Energy','Natural Gas E&P / Canada',1600,10000,4000],
  ['toromont industries','Toromont Industries Ltd','TIH','TSX','CA','Industrials','Industrial Equipment / Canada',7500,8000,4000],
  ['finning international','Finning International Inc','FTT','TSX','CA','Industrials','Caterpillar Dealer / Canada',13000,10000,8000],
  ['cgi group','CGI Inc','GIB','TSX','CA','Technology','IT Services & Consulting / Canada',90000,22000,14000],
]);

const indiaMore = g([
  ['mahindra mahindra','Mahindra and Mahindra Limited','M&M','NSE','IN','Consumer Discretionary','Automobiles & Tractors / India',180000,35000,20000],
  ['hero motocorp','Hero MotoCorp Limited','HEROMOTOCO','NSE','IN','Consumer Discretionary','Two-Wheelers / India',8000,25000,5000],
  ['tvs motor','TVS Motor Company Limited','TVSMOTOR','NSE','IN','Consumer Discretionary','Two-Wheelers / India',12000,15000,5000],
  ['eicher motors','Eicher Motors Limited','EICHERMOT','NSE','IN','Consumer Discretionary','Royal Enfield Motorcycles / India',10000,20000,3500],
  ['godrej consumer','Godrej Consumer Products Limited','GODREJCP','NSE','IN','Consumer Staples','FMCG Personal Care / India',12000,15000,4000],
  ['dabur india','Dabur India Limited','DABUR','NSE','IN','Consumer Staples','FMCG Health Products / India',8000,12000,4000],
  ['marico india','Marico Limited','MARICO','NSE','IN','Consumer Staples','FMCG Hair & Beauty / India',7000,10000,3000],
  ['divi laboratories','Divi s Laboratories Ltd','DIVISLAB','NSE','IN','Healthcare','Active Pharmaceutical Ingredients / India',16000,15000,2500],
  ['pi industries','PI Industries Limited','PIIND','NSE','IN','Materials','Agrochemicals / India',7000,10000,1500],
  ['zydus lifesciences','Zydus Lifesciences Limited','ZYDUSLIFE','NSE','IN','Healthcare','Pharmaceuticals / India',30000,12000,3500],
  ['lupin pharma','Lupin Limited','LUPIN','NSE','IN','Healthcare','Pharmaceuticals / India',20000,12000,3000],
]);

runWaves('GIANTS GW17', V, [
  ['Korea Additional', korea3],
  ['Europe Industrials', europeIndustrials],
  ['Canada Additional', canada2],
  ['India More', indiaMore],
]);
