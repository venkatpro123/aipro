// India Wave IN1 — PSU Banks + Insurance companies (confirmed missing from DB probe)
// All NSE-listed, real 2026 data. market_cap & revenue in USD millions.
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'india-in1-v2026.1';
const g = mapRows(V);

// [canonical_name, display_name, ticker, exchange, country_code, sector, industry,
//  workforce, market_cap_M_USD, revenue_M_USD, is_public, recent_layoff_count]

const psuBanks = g([
  ['bank of maharashtra','Bank of Maharashtra','MAHABANK','NSE','IN','Financials','Public Sector Banking / India',13800,4800,2600,true,0],
  ['canara bank','Canara Bank','CANBK','NSE','IN','Financials','Public Sector Banking / India',88000,9000,8500,true,0],
  ['union bank of india','Union Bank of India','UNIONBANK','NSE','IN','Financials','Public Sector Banking / India',75000,8500,7200,true,0],
  ['bank of india','Bank of India','BANKINDIA','NSE','IN','Financials','Public Sector Banking / India',52000,7200,6800,true,0],
  ['indian bank','Indian Bank','INDIANB','NSE','IN','Financials','Public Sector Banking / India',35000,5500,5200,true,0],
  ['central bank of india','Central Bank of India','CENTRALBK','NSE','IN','Financials','Public Sector Banking / India',34000,3200,4200,true,0],
  ['uco bank','UCO Bank','UCOBANK','NSE','IN','Financials','Public Sector Banking / India',25000,2800,2800,true,0],
  ['punjab & sind bank','Punjab & Sind Bank','PSB','NSE','IN','Financials','Public Sector Banking / India',8000,1500,1400,true,0],
]);

const privateSmallBanks = g([
  ['cholamandalam investment','Cholamandalam Investment & Finance Co','CHOLAFIN','NSE','IN','Financials','Non-Banking Finance / India',12000,11000,2500,true,0],
  ['karur vysya bank','Karur Vysya Bank Limited','KVB','NSE','IN','Financials','Private Sector Banking / India',7500,3800,1200,true,0],
  ['jammu kashmir bank','J&K Bank Limited','J&KBANK','NSE','IN','Financials','Private Sector Banking / India',13000,2500,1500,true,0],
  ['dcb bank','DCB Bank Limited','DCBBANK','NSE','IN','Financials','Private Sector Banking / India',5200,1400,800,true,0],
  ['ujjivan small finance','Ujjivan Small Finance Bank Limited','UJJIVANSFB','NSE','IN','Financials','Small Finance Banking / India',17500,1300,620,true,0],
  ['equitas small finance','Equitas Small Finance Bank Limited','EQUITASBNK','NSE','IN','Financials','Small Finance Banking / India',15000,1200,640,true,0],
  ['suryoday small finance','Suryoday Small Finance Bank Limited','SURYODAY','NSE','IN','Financials','Small Finance Banking / India',6000,750,420,true,0],
  ['utkarsh small finance','Utkarsh Small Finance Bank Limited','UTKARSHBNK','NSE','IN','Financials','Small Finance Banking / India',14000,900,500,true,0],
  ['esaf small finance','ESAF Small Finance Bank Limited','ESAFSFB','NSE','IN','Financials','Small Finance Banking / India',8000,700,450,true,0],
]);

const insurance = g([
  ['icici prudential life insurance','ICICI Prudential Life Insurance Co Ltd','ICICIPRULI','NSE','IN','Financials','Life Insurance / India',15000,10200,4100,true,0],
  ['new india assurance','The New India Assurance Company Limited','NIACL','NSE','IN','Financials','General Insurance / India',17000,5100,5200,true,0],
  ['general insurance corporation','GIC Re - General Insurance Corp of India','GICRE','NSE','IN','Financials','Reinsurance / India',1500,3500,3200,true,0],
  ['go digit insurance','Go Digit General Insurance Limited','GODIGIT','NSE','IN','Financials','General Insurance / India',4200,5200,1100,true,0],
]);

const housingFinance = g([
  ['lic housing finance','LIC Housing Finance Limited','LICHSGFIN','NSE','IN','Financials','Housing Finance / India',3500,6100,3100,true,0],
  ['pnb housing finance','PNB Housing Finance Limited','PNBHOUSING','NSE','IN','Financials','Housing Finance / India',2000,3200,1550,true,0],
  ['can fin homes','Can Fin Homes Limited','CANFINHOME','NSE','IN','Financials','Housing Finance / India',1400,1800,520,true,0],
  ['aavas financiers','Aavas Financiers Limited','AAVAS','NSE','IN','Financials','Affordable Housing Finance / India',4800,2100,420,true,0],
  ['home first finance','Home First Finance Company India Limited','HOMEFIRST','NSE','IN','Financials','Affordable Housing Finance / India',2500,1300,310,true,0],
]);

runWaves('INDIA IN1', V, [
  ['PSU Banks', psuBanks],
  ['Private & Small Finance Banks', privateSmallBanks],
  ['Insurance', insurance],
  ['Housing Finance', housingFinance],
]);
