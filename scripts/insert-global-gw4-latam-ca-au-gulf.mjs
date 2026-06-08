// GIANTS Wave 4 — LATAM + Canada + Australia + Gulf large-caps. All >= $10B.
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'glob-gw4-v2026.1';
const g = mapRows(V);

const latam = g([
  ['banco do brasil','Banco do Brasil SA','BBAS3','B3','BR','Financials','Commercial Banking / Brazil',85000,25000,30000],
  ['santander brasil','Banco Santander Brasil SA','SANB11','B3','BR','Financials','Commercial Banking / Brazil',55000,15000,20000],
  ['itausa holding','Itaúsa SA','ITSA4','B3','BR','Financials','Investment Holding / Brazil',40000,15000,12000],
  ['btg pactual','Banco BTG Pactual SA','BPAC11','B3','BR','Financials','Investment Banking / Brazil',6000,25000,8000],
  ['eletrobras','Centrais Elétricas Brasileiras SA','ELET3','B3','BR','Utilities','Power Generation & Transmission / Brazil',12000,25000,8000],
  ['gerdau steel','Gerdau SA','GGBR4','B3','BR','Materials','Steel Manufacturing / Brazil',30000,10000,15000],
  ['klabin paper','Klabin SA','KLBN11','B3','BR','Materials','Pulp Paper & Packaging / Brazil',17000,10000,6000],
  ['jbs meatpacking','JBS SA','JBSS3','B3','BR','Consumer Staples','Meat Processing / Brazil',270000,20000,75000],
  ['banorte bank','Grupo Financiero Banorte SAB','GFNORTEO','BMV','MX','Financials','Commercial Banking / Mexico',30000,35000,15000],
  ['inbursa financial','Grupo Financiero Inbursa SAB','GFINBURO','BMV','MX','Financials','Banking & Insurance / Mexico',10000,15000,6000],
  ['grupo carso','Grupo Carso SAB de CV','GCARSOA1','BMV','MX','Industrials','Diversified Conglomerate / Mexico',70000,15000,12000],
  ['liverpool retail','El Puerto de Liverpool SAB','LIVEPOLC1','BMV','MX','Consumer Discretionary','Department Store Retail / Mexico',80000,12000,10000],
  ['empresas copec','Empresas Copec SA','COPEC','BCS','CL','Energy','Energy & Forestry / Chile',40000,12000,30000],
  ['xp investimentos','XP Inc','XP','NASDAQ','BR','Financials','Investment Platform / Brazil',6000,12000,3000],
]);

const canada = g([
  ['bank of montreal','Bank of Montreal','BMO','TSX','CA','Financials','Commercial Banking / Canada',55000,90000,25000],
  ['cibc bank','Canadian Imperial Bank of Commerce','CM','TSX','CA','Financials','Commercial Banking / Canada',48000,55000,18000],
  ['enbridge pipelines','Enbridge Inc','ENB','TSX','CA','Energy','Oil & Gas Pipelines / Canada',14000,85000,40000],
  ['canadian natural','Canadian Natural Resources Limited','CNQ','TSX','CA','Energy','Oil & Gas E&P / Canada',10000,75000,30000],
  ['suncor energy','Suncor Energy Inc','SU','TSX','CA','Energy','Integrated Oil Sands / Canada',16000,55000,40000],
  ['imperial oil','Imperial Oil Limited','IMO','TSX','CA','Energy','Integrated Oil / Canada',5000,45000,40000],
  ['cenovus energy','Cenovus Energy Inc','CVE','TSX','CA','Energy','Oil Sands E&P / Canada',6000,35000,45000],
  ['barrick gold','Barrick Mining Corporation','ABX','TSX','CA','Materials','Gold & Copper Mining / Canada',20000,35000,12000],
  ['teck resources','Teck Resources Limited','TECK','TSX','CA','Materials','Diversified Mining / Canada',12000,25000,12000],
  ['bce telecom','BCE Inc','BCE','TSX','CA','Communications','Telecom / Canada',45000,30000,18000],
  ['telus telecom','TELUS Corporation','T','TSX','CA','Communications','Telecom / Canada',100000,25000,15000],
  ['rogers communications','Rogers Communications Inc','RCI','TSX','CA','Communications','Telecom & Media / Canada',25000,25000,15000],
  ['fortis utility','Fortis Inc','FTS','TSX','CA','Utilities','Electric & Gas Utility / Canada',9000,25000,9000],
  ['intact financial','Intact Financial Corporation','IFC','TSX','CA','Financials','Property Casualty Insurance / Canada',30000,30000,20000],
  ['power corp canada','Power Corporation of Canada','POW','TSX','CA','Financials','Insurance & Asset Management / Canada',30000,20000,40000],
  ['saputo dairy','Saputo Inc','SAP','TSX','CA','Consumer Staples','Dairy Processing / Canada',19000,12000,13000],
]);

const australia = g([
  ['macquarie group','Macquarie Group Limited','MQG','ASX','AU','Financials','Investment Banking & Asset Mgmt / Australia',20000,55000,12000],
  ['wesfarmers conglomerate','Wesfarmers Limited','WES','ASX','AU','Consumer Discretionary','Retail Conglomerate / Australia',120000,45000,30000],
  ['telstra telecom','Telstra Group Limited','TLS','ASX','AU','Communications','Telecom / Australia',30000,30000,15000],
  ['coles grocery','Coles Group Limited','COL','ASX','AU','Consumer Staples','Grocery Retail / Australia',120000,15000,30000],
  ['transurban toll','Transurban Group','TCL','ASX','AU','Industrials','Toll Road Infrastructure / Australia',1500,25000,3000],
  ['santos energy','Santos Limited','STO','ASX','AU','Energy','Oil & Gas / Australia',3500,15000,6000],
  ['northern star gold','Northern Star Resources Ltd','NST','ASX','AU','Materials','Gold Mining / Australia',6000,15000,5000],
  ['origin energy','Origin Energy Limited','ORG','ASX','AU','Energy','Energy Retail & Generation / Australia',6000,12000,12000],
  ['qbe insurance','QBE Insurance Group Limited','QBE','ASX','AU','Financials','Global Insurance / Australia',13000,18000,20000],
  ['suncorp insurance','Suncorp Group Limited','SUN','ASX','AU','Financials','Insurance & Banking / Australia',13000,15000,12000],
  ['fisher paykel health','Fisher & Paykel Healthcare Corp','FPH','ASX','NZ','Healthcare','Respiratory Medical Devices / New Zealand',6000,15000,1500],
  ['xero accounting','Xero Limited','XRO','ASX','NZ','Technology','Cloud Accounting Software / New Zealand',5000,15000,1200],
]);

const gulf = g([
  ['sabic chemicals','Saudi Basic Industries Corporation','2010','TADAWUL','SA','Materials','Petrochemicals / Saudi Arabia',33000,90000,45000],
  ['saudi electricity','Saudi Electricity Company','5110','TADAWUL','SA','Utilities','Electric Utility / Saudi Arabia',33000,25000,22000],
  ['riyad bank','Riyad Bank','1010','TADAWUL','SA','Financials','Commercial Banking / Saudi Arabia',6000,25000,8000],
  ['alinma bank','Alinma Bank','1150','TADAWUL','SA','Financials','Islamic Banking / Saudi Arabia',4000,20000,5000],
  ['sulaiman al habib','Dr Sulaiman Al Habib Medical Group','4013','TADAWUL','SA','Healthcare','Hospital Operator / Saudi Arabia',15000,25000,3000],
  ['adnoc gas','ADNOC Gas plc','ADNOCGAS','ADX','AE','Energy','Natural Gas Processing / UAE',5000,90000,25000],
  ['international holding co','International Holding Company PJSC','IHC','ADX','AE','Financials','Diversified Holding / UAE',100000,240000,30000],
  ['alpha dhabi','Alpha Dhabi Holding PJSC','ALPHADHABI','ADX','AE','Financials','Investment Holding / UAE',50000,40000,20000],
  ['pure health','Pure Health Holding PJSC','PUREHEALTH','ADX','AE','Healthcare','Healthcare Network / UAE',25000,40000,6000],
  ['industries qatar','Industries Qatar QPSC','IQCD','QSE','QA','Materials','Petrochemicals & Steel / Qatar',5000,20000,5000],
  ['kuwait finance house','Kuwait Finance House KSCP','KFH','BSE','KW','Financials','Islamic Banking / Kuwait',15000,40000,8000],
  ['national bank kuwait','National Bank of Kuwait SAKP','NBK','BSE','KW','Financials','Commercial Banking / Kuwait',8000,25000,6000],
  ['emirates nbd','Emirates NBD Bank PJSC','EMIRATESNBD','DFM','AE','Financials','Commercial Banking / UAE',24000,55000,14000],
]);

runWaves('GIANTS GW4', V, [
  ['Latin America', latam],
  ['Canada', canada],
  ['Australia & NZ', australia],
  ['Gulf / MENA', gulf],
]);
