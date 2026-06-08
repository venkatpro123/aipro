// India Wave IN11 — More Banks + NBFCs + Housing Finance + Fintech
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'india-in11-v2026.1';
const g = mapRows(V);

const moreBanks = g([
  ['iob bank','Indian Overseas Bank','IOB','NSE','IN','Financials','Public Sector Banking / India',26000,5200,5500,true,0],
  ['dhanlaxmi bank','Dhanlaxmi Bank Limited','DHANBANK','NSE','IN','Financials','Private Sector Banking / India',1800,320,420,true,0],
  ['tamilnad mercantile bank','Tamilnad Mercantile Bank Limited','TMB','NSE','IN','Financials','Private Sector Banking / India',7000,3200,1050,true,0],
  ['shivalik small finance bank','Shivalik Small Finance Bank Limited','SHIVALIKB','NSE','IN','Financials','Small Finance Banking / India',2500,620,320,true,0],
  ['unity small finance bank','Unity Small Finance Bank Limited','UNITYSF','NSE','IN','Financials','Small Finance Banking / India',12000,820,620,true,0],
  ['sbi cards','SBI Cards and Payment Services Limited','SBICARD','NSE','IN','Financial Technology','Credit Cards / India',7000,7200,1800,true,0],
]);

const nbfcHousing = g([
  ['repco home finance','Repco Home Finance Limited','REPCOHOME','NSE','IN','Financials','Housing Finance / India',1500,720,410,true,0],
  ['muthoot fincorp','Muthoot Fincorp Limited (Muthoot Capital)','MUTHOOTCAP','NSE','IN','Financials','Gold Loans / India',3500,520,320,true,0],
  ['aptus value housing','Aptus Value Housing Finance India Ltd','APTUS','NSE','IN','Financials','Affordable Housing Finance / India',4200,2100,420,true,0],
  ['five star business finance','Five-Star Business Finance Limited','FIVESTAR','NSE','IN','Financials','MSME Finance / India',7000,3500,720,true,0],
  ['india shelter finance','India Shelter Finance Corporation Limited','INDIASHLTR','NSE','IN','Financials','Affordable Housing Finance / India',3500,1200,310,true,0],
  ['poonawalla fincorp','Poonawalla Fincorp Limited','POONAWALLA','NSE','IN','Financials','Retail & MSME Loans / India',4000,5200,1050,true,0],
  ['creditaccess grameen','CreditAccess Grameen Limited','CREDITACC','NSE','IN','Financials','Microfinance / India',9000,3600,820,true,0],
  ['arman financial services','Arman Financial Services Limited','ARMANFIN','NSE','IN','Financials','Microfinance & Vehicle Finance / India',2000,520,220,true,0],
]);

const fintechPower = g([
  ['jm financial','JM Financial Limited','JMFINANCL','NSE','IN','Financials','Investment Banking & Wealth / India',8000,1600,820,true,0],
  ['indigrid','IndiGrid Infrastructure Investment Trust','INDIGRID','NSE','IN','Utilities','Power Transmission InvIT / India',500,3200,520,true,0],
]);

runWaves('INDIA IN11', V, [
  ['More Banks', moreBanks],
  ['NBFCs & Housing Finance', nbfcHousing],
  ['Fintech & InvIT', fintechPower],
]);
