// GLOBAL Wave 14 — real listed Canada + UK mid/large-caps + US small/mid tech & health.
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'glob-w14-v2026.1';
const g = mapRows(V);

const canada = g([
  ['canadian national rail','Canadian National Railway Company','CNR','TSX','CA','Industrials','Class I Railroad / Canada',24000,75000,13000],
  ['cpkc rail','Canadian Pacific Kansas City Ltd','CP','TSX','CA','Industrials','Class I Railroad / Canada',20000,80000,12000],
  ['brookfield asset mgmt','Brookfield Asset Management Ltd','BAM','TSX','CA','Financials','Alternative Asset Management / Canada',2500,70000,5000],
  ['thomson reuters','Thomson Reuters Corporation','TRI','TSX','CA','Technology','Information Services / Canada',26000,80000,7000],
  ['constellation software','Constellation Software Inc','CSU','TSX','CA','Technology','Vertical Market Software / Canada',48000,70000,9000],
  ['restaurant brands intl','Restaurant Brands International Inc','QSR','TSX','CA','Consumer Discretionary','Quick Service Restaurants / Canada',5000,30000,8000],
  ['agnico eagle','Agnico Eagle Mines Limited','AEM','TSX','CA','Materials','Gold Mining / Canada',14000,45000,8000],
  ['tc energy','TC Energy Corporation','TRP','TSX','CA','Energy','Natural Gas Pipelines / Canada',7000,45000,12000],
  ['manulife financial','Manulife Financial Corporation','MFC','TSX','CA','Financials','Life Insurance / Canada',38000,45000,25000],
  ['sun life financial','Sun Life Financial Inc','SLF','TSX','CA','Financials','Life Insurance & Asset Mgmt / Canada',30000,35000,24000],
  ['fairfax financial','Fairfax Financial Holdings Limited','FFH','TSX','CA','Financials','Insurance & Investments / Canada',40000,40000,30000],
  ['loblaw grocery','Loblaw Companies Limited','L','TSX','CA','Consumer Staples','Grocery Retail / Canada',200000,40000,45000],
  ['couche-tard','Alimentation Couche-Tard Inc','ATD','TSX','CA','Consumer Staples','Convenience Stores / Canada',150000,60000,70000],
  ['magna auto parts','Magna International Inc','MG','TSX','CA','Consumer Discretionary','Automotive Parts / Canada',170000,15000,42000,true,2000],
  ['waste connections','Waste Connections Inc','WCN','TSX','CA','Industrials','Waste Management / Canada',24000,45000,9000],
  ['cameco uranium','Cameco Corporation','CCJ','TSX','CA','Energy','Uranium Mining / Canada',3500,25000,3000],
]);

const uk = g([
  ['sage software','The Sage Group plc','SGE','LSE','GB','Technology','Accounting & Payroll Software / UK',12000,15000,3000],
  ['spirax steam','Spirax Group plc','SPX','LSE','GB','Industrials','Steam & Fluid Systems / UK',11000,8000,2200],
  ['weir mining','The Weir Group PLC','WEIR','LSE','GB','Industrials','Mining Equipment / UK',12000,7000,3500],
  ['smiths group','Smiths Group plc','SMIN','LSE','GB','Industrials','Diversified Engineering / UK',15000,9000,4000],
  ['imi engineering','IMI plc','IMI','LSE','GB','Industrials','Fluid & Motion Control / UK',10000,6000,2800],
  ['melrose aerospace','Melrose Industries PLC','MRO','LSE','GB','Industrials','Aerospace Components / UK',30000,9000,4500],
  ['dcc distribution','DCC plc','DCC','LSE','GB','Industrials','Energy & Sales Distribution / UK',17000,6000,22000],
  ['ashtead rental','Ashtead Group plc','AHT','LSE','GB','Industrials','Equipment Rental / UK',26000,30000,11000],
  ['whitbread hotels','Whitbread plc','WTB','LSE','GB','Consumer Discretionary','Hotels & Restaurants / UK',38000,6000,4000],
  ['compass food services','Compass Group PLC','CPG','LSE','GB','Industrials','Contract Food Services / UK',550000,50000,40000],
  ['experian credit','Experian plc','EXPN','LSE','GB','Industrials','Credit Data & Analytics / UK',22000,40000,7000],
  ['relx analytics','RELX PLC','REL','LSE','GB','Technology','Information & Analytics / UK',36000,85000,11000],
  ['rentokil pest','Rentokil Initial plc','RTO','LSE','GB','Industrials','Pest Control & Hygiene / UK',62000,15000,8000],
  ['pearson education','Pearson plc','PSON','LSE','GB','Technology','Education Publishing / UK',18000,10000,5000],
  ['intercontinental hotels','InterContinental Hotels Group PLC','IHG','LSE','GB','Consumer Discretionary','Hotels / UK',14000,15000,5000],
  ['severn trent water','Severn Trent Plc','SVT','LSE','GB','Utilities','Water Utility / UK',8000,8000,3000],
  ['sse utility','SSE plc','SSE','LSE','GB','Utilities','Electric Utility & Renewables / UK',10000,22000,12000],
  ['persimmon homes','Persimmon Plc','PSN','LSE','GB','Consumer Discretionary','Homebuilding / UK',5000,5000,4000],
]);

const usTechHealth = g([
  ['manhattan associates','Manhattan Associates Inc','MANH','NASDAQ','US','Technology','Supply Chain Software / USA',4500,15000,1000],
  ['tyler technologies','Tyler Technologies Inc','TYL','NYSE','US','Technology','Government Software / USA',7000,22000,2100],
  ['ptc plm','PTC Inc','PTC','NASDAQ','US','Technology','CAD & PLM Software / USA',7000,22000,2300],
  ['aspen technology','Aspen Technology Inc','AZPN','NASDAQ','US','Technology','Industrial Software / USA',4000,15000,1100],
  ['qualys security','Qualys Inc','QLYS','NASDAQ','US','Technology','Cloud Security & Compliance / USA',2800,6000,600],
  ['rapid7 security','Rapid7 Inc','RPD','NASDAQ','US','Technology','Cybersecurity Analytics / USA',2500,3000,800],
  ['tenable security','Tenable Holdings Inc','TENB','NASDAQ','US','Technology','Vulnerability Management / USA',2200,5000,800],
  ['box cloud','Box Inc','BOX','NYSE','US','Technology','Cloud Content Management / USA',2700,5000,1100],
  ['dropbox storage','Dropbox Inc','DBX','NASDAQ','US','Technology','Cloud File Storage / USA',2700,8000,2500,true,500],
  ['docusign esign','DocuSign Inc','DOCU','NASDAQ','US','Technology','Electronic Signature / USA',7000,18000,2900],
  ['paycom payroll','Paycom Software Inc','PAYC','NYSE','US','Technology','Payroll & HR Software / USA',7000,12000,1800],
  ['paylocity payroll','Paylocity Holding Corporation','PCTY','NASDAQ','US','Technology','Payroll & HR Software / USA',6000,10000,1400],
  ['bentley infrastructure','Bentley Systems Incorporated','BSY','NASDAQ','US','Technology','Infrastructure Engineering Software / USA',5000,15000,1300],
  ['dolby audio','Dolby Laboratories Inc','DLB','NYSE','US','Technology','Audio & Imaging Technology / USA',2300,8000,1300],
  ['qorvo rf','Qorvo Inc','QRVO','NASDAQ','US','Technology','RF Semiconductors / USA',8000,9000,3800],
  ['coherent photonics','Coherent Corp','COHR','NYSE','US','Technology','Photonics & Lasers / USA',25000,12000,5000],
  ['cognex vision','Cognex Corporation','CGNX','NASDAQ','US','Technology','Machine Vision / USA',2500,7000,900],
  ['align invisalign','Align Technology Inc','ALGN','NASDAQ','US','Healthcare','Clear Dental Aligners / USA',25000,18000,4000],
  ['globus medical','Globus Medical Inc','GMED','NYSE','US','Healthcare','Spinal & Orthopedic Devices / USA',4000,8000,2500],
  ['penumbra devices','Penumbra Inc','PEN','NYSE','US','Healthcare','Neurovascular Devices / USA',4500,10000,1200],
]);

runWaves('GLOBAL W14', V, [
  ['Canada', canada],
  ['UK', uk],
  ['US Tech & Health', usTechHealth],
]);
