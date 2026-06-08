// GIANTS Wave 11 — LATAM additional + Europe 2nd-tier (CEE, Nordics, France, Benelux).
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'glob-gw11-v2026.1';
const g = mapRows(V);

const latam2 = g([
  ['grupo elektra','Grupo Elektra SAB de CV','ELEKTRA','BMV','MX','Consumer Discretionary','Retail & Financial Services / Mexico',65000,12000,15000],
  ['soriana retail','Organizacion Soriana SAB de CV','SORIANAB','BMV','MX','Consumer Staples','Grocery Retail / Mexico',80000,6000,12000],
  ['oxxo grupo','Grupo ALSEA SAB de CV','ALSEA','BMV','MX','Consumer Discretionary','Restaurant Operator / Mexico',65000,5000,5000],
  ['cementos argos','Cementos Argos SA','CEMARGOS','BVC','CO','Materials','Cement Manufacturing / Colombia',9000,5000,5000],
  ['ecopetrol colombia','Ecopetrol SA','EC','NYSE','CO','Energy','Oil & Gas / Colombia',18000,20000,30000],
  ['davivienda bank','Banco Davivienda SA','PFDAVVNDA','BVC','CO','Financials','Commercial Banking / Colombia',16000,8000,5000],
  ['isa colombia','Interconexion Electrica SA ISA','ISA','BVC','CO','Utilities','Power Transmission / Colombia',3000,12000,2000],
  ['cmpc paper','Empresas CMPC SA','CMPC','BCS','CL','Materials','Pulp & Paper / Chile',20000,8000,8000],
  ['cap steel chile','CAP SA','CAP','BCS','CL','Materials','Steel & Iron Ore / Chile',6000,4000,4000],
  ['entel chile telecom','Entel Chile SA','ENTEL','BCS','CL','Communications','Telecom / Chile',8000,4000,3000],
  ['claro chile','NII Holdings Chile','CLARO','BCS','CL','Communications','Mobile Telecom / Chile',5000,3000,2500],
  ['agrosuper foods','Agrosuper SA','AGROSUPER','BCS','CL','Consumer Staples','Poultry & Pork Processing / Chile',20000,3000,4000],
  ['mercantil servicios','Mercantil Servicios Financieros CA','MercantilSF','CVE','VE','Financials','Banking / Venezuela',10000,3000,2000],
  ['grupo sura','Grupo de Inversiones Suramericana SA','GRUPOSURA','BVC','CO','Financials','Financial Holding / Colombia',35000,10000,8000],
  ['totvs software','TOTVS SA','TOTS3','B3','BR','Technology','Enterprise Software ERP / Brazil',15000,5000,1800],
  ['rd saude','Raia Drogasil SA','RADL3','B3','BR','Consumer Staples','Pharmacy Retail / Brazil',50000,12000,9000],
  ['arezzo fashion','Arezzo Industria e Comercio SA','ARZZ3','B3','BR','Consumer Discretionary','Fashion Retail / Brazil',8000,4000,2500],
  ['hapvida health','Hapvida Participacoes e Investimentos','HAPV3','B3','BR','Healthcare','Health Insurance / Brazil',35000,10000,6000],
]);

const europeCEE = g([
  ['erste group bank','Erste Group Bank AG','EBS','VIE','AT','Financials','Commercial Banking CEE / Austria',50000,25000,18000],
  ['raiffeisen bank intl','Raiffeisen Bank International AG','RBI','VIE','AT','Financials','Commercial Banking CEE / Austria',40000,15000,15000],
  ['otp bank','OTP Bank Nyrt','OTP','BUD','HU','Financials','Commercial Banking / Hungary',38000,18000,12000],
  ['mol group energy','MOL Magyar Olaj es Gazipari Nyrt','MOL','BUD','HU','Energy','Integrated Oil & Gas / Hungary',26000,10000,22000],
  ['richter gedeon','Gedeon Richter Nyrt','RICHTER','BUD','HU','Healthcare','Pharmaceuticals / Hungary',12000,6000,3000],
  ['pkn orlen','PKN ORLEN SA','PKN','WSE','PL','Energy','Oil Refining & Retail / Poland',60000,18000,60000],
  ['pge polish energy','PGE Polska Grupa Energetyczna SA','PGE','WSE','PL','Utilities','Electric Utility / Poland',36000,8000,15000],
  ['pko bank polski','PKO Bank Polski SA','PKO','WSE','PL','Financials','Commercial Banking / Poland',28000,25000,12000],
  ['bank pekao','Bank Polska Kasa Opieki SA','PEO','WSE','PL','Financials','Commercial Banking / Poland',16000,12000,7000],
  ['asseco poland','Asseco Poland SA','ACP','WSE','PL','Technology','IT Services / Poland',35000,5000,4000],
  ['cez utility','CEZ as','CEZ','PSE','CZ','Utilities','Electric Utility / Czech Republic',35000,12000,15000],
  ['komercni banka','Komercni banka as','KB','PSE','CZ','Financials','Commercial Banking / Czech Republic',8000,10000,5000],
  ['kb czech','MONETA Money Bank as','MONETA','PSE','CZ','Financials','Retail Banking / Czech Republic',3500,5000,3000],
  ['sobv4 krka pharma','Krka dd Novo Mesto','KRKG','LJSE','SI','Healthcare','Pharmaceuticals / Slovenia',12000,6000,2000],
  ['nkbm bank','Nova KBM dd','NKBM','LJSE','SI','Financials','Commercial Banking / Slovenia',2500,4000,2000],
]);

const europeNordics2 = g([
  ['storebrand insurance','Storebrand ASA','STB','OSL','NO','Financials','Life Insurance & Asset Mgmt / Norway',3000,10000,18000],
  ['gjensidige insurance','Gjensidige Forsikring ASA','GJF','OSL','NO','Financials','Property Insurance / Norway',4000,15000,5000],
  ['grieg seafood','Grieg Seafood ASA','GSF','OSL','NO','Consumer Staples','Salmon Farming / Norway',3000,4000,1500],
  ['salmar salmon','SalMar ASA','SALM','OSL','NO','Consumer Staples','Salmon Aquaculture / Norway',2500,10000,2000],
  ['autostore robotics','AutoStore Holdings Ltd','AUTO','OSL','NO','Technology','Robotic Warehouse Automation / Norway',1500,8000,500],
  ['colruyt grocery','Colruyt Group NV','COLR','EBR','BE','Consumer Staples','Grocery Retail / Belgium',30000,12000,12000],
  ['bekaert wire','Bekaert NV','BEKB','EBR','BE','Materials','Steel Wire Transformation / Belgium',27000,5000,6000],
  ['sofina investment','Sofina SA','SOF','EBR','BE','Financials','Private Investment Holding / Belgium',450,5000,500],
  ['lotus bakeries','Lotus Bakeries NV','LOTB','EBR','BE','Consumer Staples','Specialty Biscuits / Belgium',3000,5000,1000],
  ['alstom rail','Alstom SA','ALO','EPA','FR','Industrials','Railway Vehicles & Systems / France',80000,15000,20000],
  ['bouygues construction','Bouygues SA','EN','EPA','FR','Industrials','Construction & Telecom / France',200000,20000,50000],
  ['veolia environment','Veolia Environnement SA','VIE','EPA','FR','Utilities','Environmental Services / France',220000,18000,50000],
  ['suez utilities','Suez SA','SEW','EPA','FR','Utilities','Water & Waste Management / France',40000,8000,15000],
  ['sodexo services','Sodexo SA','SW','EPA','FR','Industrials','Food & Facilities Services / France',430000,12000,26000],
]);

const europeGreeceSouthern = g([
  ['piraeus bank','Piraeus Financial Holdings SA','TPEIR','ATHEX','GR','Financials','Commercial Banking / Greece',13000,5000,5000],
  ['eurobank ergasias','Eurobank Ergasias Services & Holdings','EUROB','ATHEX','GR','Financials','Commercial Banking / Greece',10000,8000,5000],
  ['alpha bank','Alpha Services and Holdings SA','ALPHA','ATHEX','GR','Financials','Commercial Banking / Greece',10000,5000,5000],
  ['national bank greece','National Bank of Greece SA','ETE','ATHEX','GR','Financials','Commercial Banking / Greece',10000,5000,5000],
  ['hellenic telecom','Hellenic Telecommunications Organization','HTO','ATHEX','GR','Communications','Telecom / Greece',14000,5000,5000],
  ['bankinter spain','Bankinter SA','BKT','BME','ES','Financials','Commercial Banking / Spain',6000,10000,3000],
  ['mapfre insurance','MAPFRE SA','MAP','BME','ES','Financials','Insurance / Spain',30000,8000,30000],
  ['melia hotels','Melia Hotels International SA','MEL','BME','ES','Consumer Discretionary','Hotels / Spain',40000,3000,4000],
  ['nh hotel','NH Hotel Group SA','NHH','BME','ES','Consumer Discretionary','Hotels / Spain',16000,2000,3000],
  ['inmobiliaria colonial','Inmobiliaria Colonial SOCIMI SA','COL','BME','ES','Real Estate','Office Real Estate / Spain',400,5000,500],
  ['cie automotive','CIE Automotive SA','CIE','BME','ES','Consumer Discretionary','Auto Parts Manufacturing / Spain',30000,5000,6000],
]);

runWaves('GIANTS GW11', V, [
  ['LATAM Additional', latam2],
  ['Europe CEE', europeCEE],
  ['Europe Nordics 2', europeNordics2],
  ['Europe Greece & Southern', europeGreeceSouthern],
]);
