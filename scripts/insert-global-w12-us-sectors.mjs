// GLOBAL Wave 12 — real US listed mid/large-caps in under-covered sectors
// (insurance, regional banks, REITs, utilities, energy, materials, staples).
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'glob-w12-v2026.1';
const g = mapRows(V);

const finInsurance = g([
  ['arthur gallagher','Arthur J. Gallagher & Co','AJG','NYSE','US','Financials','Insurance Brokerage / USA',50000,70000,11000],
  ['brown brown insurance','Brown & Brown Inc','BRO','NYSE','US','Financials','Insurance Brokerage / USA',16000,30000,4500],
  ['wr berkley','W. R. Berkley Corporation','WRB','NYSE','US','Financials','Property Casualty Insurance / USA',8000,22000,12000],
  ['markel insurance','Markel Group Inc','MKL','NYSE','US','Financials','Specialty Insurance / USA',20000,25000,16000],
  ['cincinnati financial','Cincinnati Financial Corporation','CINF','NASDAQ','US','Financials','Property Casualty Insurance / USA',5000,22000,10000],
  ['principal financial','Principal Financial Group Inc','PFG','NASDAQ','US','Financials','Retirement & Asset Management / USA',19000,18000,14000],
  ['raymond james','Raymond James Financial Inc','RJF','NYSE','US','Financials','Brokerage & Wealth Management / USA',17000,28000,12000],
  ['lpl financial','LPL Financial Holdings Inc','LPLA','NASDAQ','US','Financials','Independent Brokerage / USA',7000,22000,11000],
  ['sei investments','SEI Investments Company','SEIC','NASDAQ','US','Financials','Asset Management Technology / USA',5000,10000,2000],
  ['tradeweb markets','Tradeweb Markets Inc','TW','NASDAQ','US','Financials','Electronic Fixed Income Trading / USA',1400,30000,1800],
  ['jack henry','Jack Henry & Associates Inc','JKHY','NASDAQ','US','Technology','Banking Core Software / USA',7000,13000,2300],
  ['fifth third','Fifth Third Bancorp','FITB','NASDAQ','US','Financials','Regional Banking / USA',19000,28000,9000],
  ['huntington bank','Huntington Bancshares Inc','HBAN','NASDAQ','US','Financials','Regional Banking / USA',20000,22000,7000],
  ['regions financial','Regions Financial Corporation','RF','NYSE','US','Financials','Regional Banking / USA',20000,22000,7000],
  ['citizens financial','Citizens Financial Group Inc','CFG','NYSE','US','Financials','Regional Banking / USA',18000,18000,8000],
  ['mt bank','M&T Bank Corporation','MTB','NYSE','US','Financials','Regional Banking / USA',22000,30000,9000],
]);

const reits = g([
  ['realty income','Realty Income Corporation','O','NYSE','US','Real Estate','Net Lease REIT / USA',400,50000,5000],
  ['simon property','Simon Property Group Inc','SPG','NYSE','US','Real Estate','Retail Mall REIT / USA',5000,55000,5900],
  ['public storage','Public Storage','PSA','NYSE','US','Real Estate','Self Storage REIT / USA',6000,55000,4700],
  ['extra space storage','Extra Space Storage Inc','EXR','NYSE','US','Real Estate','Self Storage REIT / USA',6500,35000,3200],
  ['digital realty','Digital Realty Trust Inc','DLR','NYSE','US','Real Estate','Data Center REIT / USA',3500,55000,5800],
  ['welltower health reit','Welltower Inc','WELL','NYSE','US','Real Estate','Healthcare REIT / USA',500,80000,7000],
  ['iron mountain','Iron Mountain Incorporated','IRM','NYSE','US','Real Estate','Records & Data Center REIT / USA',26000,30000,6000],
  ['ventas health reit','Ventas Inc','VTR','NYSE','US','Real Estate','Healthcare REIT / USA',700,25000,4800],
  ['avalonbay apartments','AvalonBay Communities Inc','AVB','NYSE','US','Real Estate','Apartment REIT / USA',3000,30000,2900],
]);

const utilEnergy = g([
  ['sempra utility','Sempra','SRE','NYSE','US','Utilities','Electric & Gas Utility / USA',20000,55000,14000],
  ['xcel energy','Xcel Energy Inc','XEL','NASDAQ','US','Utilities','Electric & Gas Utility / USA',11000,38000,14000],
  ['wec energy','WEC Energy Group Inc','WEC','NYSE','US','Utilities','Electric & Gas Utility / USA',7000,30000,8000],
  ['pseg utility','Public Service Enterprise Group','PEG','NYSE','US','Utilities','Electric & Gas Utility / USA',13000,42000,10000],
  ['edison international','Edison International','EIX','NYSE','US','Utilities','Electric Utility / USA',13000,30000,16000],
  ['ameren utility','Ameren Corporation','AEE','NYSE','US','Utilities','Electric & Gas Utility / USA',9000,24000,7500],
  ['dte energy','DTE Energy Company','DTE','NYSE','US','Utilities','Electric & Gas Utility / USA',10000,26000,12000],
  ['entergy utility','Entergy Corporation','ETR','NYSE','US','Utilities','Electric Utility / USA',12000,32000,12000],
  ['ppl utility','PPL Corporation','PPL','NYSE','US','Utilities','Electric & Gas Utility / USA',6500,25000,8000],
  ['devon energy','Devon Energy Corporation','DVN','NYSE','US','Energy','Oil & Gas E&P / USA',1900,28000,15000],
  ['coterra energy','Coterra Energy Inc','CTRA','NYSE','US','Energy','Oil & Gas E&P / USA',1300,20000,5000],
  ['diamondback energy','Diamondback Energy Inc','FANG','NASDAQ','US','Energy','Oil & Gas E&P / USA',2500,50000,9000],
]);

const matStaples = g([
  ['nucor steel','Nucor Corporation','NUE','NYSE','US','Materials','Steel Manufacturing / USA',32000,38000,30000],
  ['steel dynamics','Steel Dynamics Inc','STLD','NASDAQ','US','Materials','Steel Manufacturing / USA',12000,22000,18000],
  ['vulcan materials','Vulcan Materials Company','VMC','NYSE','US','Materials','Construction Aggregates / USA',12000,38000,7800],
  ['martin marietta','Martin Marietta Materials Inc','MLM','NYSE','US','Materials','Construction Aggregates / USA',9000,38000,6700],
  ['ppg coatings','PPG Industries Inc','PPG','NYSE','US','Materials','Paints & Coatings / USA',50000,28000,18000],
  ['ecolab water','Ecolab Inc','ECL','NYSE','US','Materials','Water & Hygiene Solutions / USA',48000,65000,15000],
  ['intl flavors','International Flavors & Fragrances','IFF','NYSE','US','Materials','Flavors & Fragrances / USA',24000,22000,11000],
  ['corteva agriscience','Corteva Inc','CTVA','NYSE','US','Materials','Agricultural Science / USA',22000,42000,17000],
  ['mosaic fertilizer','The Mosaic Company','MOS','NYSE','US','Materials','Phosphate & Potash / USA',13000,9000,13000],
  ['cf industries','CF Industries Holdings Inc','CF','NYSE','US','Materials','Nitrogen Fertilizer / USA',3000,16000,6000],
  ['hershey confection','The Hershey Company','HSY','NYSE','US','Consumer Staples','Confectionery / USA',20000,38000,11000],
  ['mccormick spices','McCormick & Company Inc','MKC','NYSE','US','Consumer Staples','Spices & Flavorings / USA',14000,20000,6700],
  ['church dwight','Church & Dwight Co Inc','CHD','NYSE','US','Consumer Staples','Household & Personal Care / USA',5500,25000,6000],
  ['clorox household','The Clorox Company','CLX','NYSE','US','Consumer Staples','Household Products / USA',8000,18000,7000],
]);

runWaves('GLOBAL W12', V, [
  ['US Insurance & Banks', finInsurance],
  ['US REITs', reits],
  ['US Utilities & Energy', utilEnergy],
  ['US Materials & Staples', matStaples],
]);
