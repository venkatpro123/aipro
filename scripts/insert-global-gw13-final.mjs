// GIANTS Wave 13 — final push to cross 300 net new (SEA + more Europe + US last names).
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'glob-gw13-v2026.1';
const g = mapRows(V);

const seaAdditional = g([
  ['airasia aviation','Capital A Berhad (AirAsia)','5099','MYX','MY','Industrials','Low-Cost Airlines / Malaysia',25000,4000,3800],
  ['ioicorp plantation','IOI Corporation Berhad','1961','MYX','MY','Consumer Staples','Palm Oil Plantation / Malaysia',35000,5000,8000],
  ['sime darby','Sime Darby Berhad','4197','MYX','MY','Industrials','Industrial & Logistics / Malaysia',21000,5000,10000],
  ['kuala lumpur kepong','Kuala Lumpur Kepong Berhad','2445','MYX','MY','Consumer Staples','Palm Oil Plantation / Malaysia',80000,5000,12000],
  ['hap seng consolidated','Hap Seng Consolidated Berhad','3034','MYX','MY','Industrials','Diversified Conglomerate / Malaysia',15000,4000,4000],
  ['axiata telecom','Axiata Group Berhad','6888','MYX','MY','Communications','Telecom / Malaysia',14000,6000,6000],
  ['maxis telecom','Maxis Berhad','6012','MYX','MY','Communications','Mobile Telecom / Malaysia',5000,12000,4000],
  ['bank bri syariah','Bank Syariah Indonesia Tbk','BRIS','IDX','ID','Financials','Islamic Banking / Indonesia',15000,8000,4000],
  ['gudang garam','PT Gudang Garam Tbk','GGRM','IDX','ID','Consumer Staples','Tobacco / Indonesia',60000,8000,15000],
  ['charoen pokphand indo','PT Charoen Pokphand Indonesia Tbk','CPIN','IDX','ID','Consumer Staples','Poultry & Food / Indonesia',50000,3000,10000],
  ['bumi resources coal','PT Bumi Resources Tbk','BUMI','IDX','ID','Energy','Coal Mining / Indonesia',10000,3000,5000],
  ['indofood success','PT Indofood Sukses Makmur Tbk','INDF','IDX','ID','Consumer Staples','Food & Beverage / Indonesia',80000,5000,9000],
  ['vietnam airlines','Vietnam Airlines JSC','HVN','HOSE','VN','Industrials','Airlines / Vietnam',20000,3000,4000],
  ['vingroup','Vingroup JSC','VIC','HOSE','VN','Industrials','Diversified Conglomerate / Vietnam',90000,15000,12000],
  ['masan group','Masan Group Corporation','MSN','HOSE','VN','Consumer Staples','Consumer Food & Retail / Vietnam',25000,5000,6000],
  ['thaicom','Thaicom Public Company Limited','THCOM','SET','TH','Communications','Satellite Telecommunications / Thailand',2000,3000,800],
  ['central retail','Central Retail Corporation PCL','CRC','SET','TH','Consumer Discretionary','Department Store Retail / Thailand',70000,6000,10000],
  ['true corp','True Corporation PCL','TRUE','SET','TH','Communications','Telecom / Thailand',24000,5000,8000],
  ['minor international','Minor International PCL','MINT','SET','TH','Consumer Discretionary','Hotels & Restaurants / Thailand',70000,6000,7000],
]);

const europeRemaining = g([
  ['safran2 dassault','Dassault Aviation SA','AM','EPA','FR','Industrials','Aircraft & Defense / France',13000,20000,10000],
  ['imerys minerals','Imerys SA','NK','EPA','FR','Materials','Specialty Minerals / France',14000,5000,5000],
  ['ipsen pharma','Ipsen SA','IPN','EPA','FR','Healthcare','Specialty Pharmaceuticals / France',6000,10000,3000],
  ['sartorius france','bioMerieux SA','BIM','EPA','FR','Healthcare','Clinical Diagnostics / France',14000,6000,4000],
  ['plastic omnium','Compagnie Plastic Omnium SE','POM','EPA','FR','Consumer Discretionary','Auto Parts / France',21000,5000,9000],
  ['spie services','SPIE SA','SPIE','EPA','FR','Industrials','Technical Services / France',52000,5000,10000],
  ['klepierre reit','Klépierre SA','LI','EPA','FR','Real Estate','Shopping Center REIT / France',3000,5000,1500],
  ['corbion dsm','dsm-firmenich AG','DSFIR','AMS','NL','Materials','Nutrition & Biotech / Netherlands',15000,15000,7000],
  ['imcd chemicals','IMCD Group NV','IMCD','AMS','NL','Materials','Chemical Distribution / Netherlands',4000,6000,5000],
  ['signify lighting','Signify NV','LIGHT','AMS','NL','Industrials','Professional Lighting / Netherlands',35000,12000,6000],
  ['takeaway delivery','Just Eat Takeaway.com NV','TKWY','AMS','NL','Consumer Discretionary','Food Delivery / Netherlands',12000,4000,4000],
  ['prosus tech','Prosus NV','PRX','AMS','NL','Technology','Internet Investment / Netherlands',25000,30000,6000,true,500],
  ['vivendi media','Vivendi SE','VIV','EPA','FR','Communications','Media & Entertainment / France',45000,5000,6000],
  ['m6 media','M6 Group SA','MMT','EPA','FR','Communications','TV Broadcasting / France',2000,3000,1200],
  ['canal plus','Canal+ Group SA','CAN','EPA','FR','Communications','Pay TV / France',8000,6000,5000],
  ['solocal local','SoLocal Group SA','LOCAL','EPA','FR','Technology','Digital Marketing / France',3000,2000,800],
  ['renault auto','Renault SA','RNO','EPA','FR','Consumer Discretionary','Automobiles / France',105000,18000,45000,true,2500],
  ['peugeot parts','Forvia SE','FRVIA','EPA','FR','Consumer Discretionary','Auto Parts / France',100000,12000,30000],
  ['edf power','Electricite de France SA','EDF','EPA','FR','Utilities','Nuclear & Electric Utility / France',180000,25000,90000],
  ['gdf energy','Gaztransport & Technigaz SA','GTT','EPA','FR','Industrials','LNG Tank Systems / France',3000,5000,500],
  ['trigano leisure','Trigano SA','TRI','EPA','FR','Consumer Discretionary','Recreational Vehicles / France',15000,5000,5000],
]);

const usLastNames = g([
  ['saia freight','Saia Inc','SAIA','NASDAQ','US','Industrials','Trucking LTL / USA',15000,12000,3100],
  ['heartland express','Heartland Express Inc','HTLD','NASDAQ','US','Industrials','Trucking / USA',9000,3000,2500],
  ['knight swift','Knight-Swift Transportation Holdings','KNX','NYSE','US','Industrials','Trucking / USA',23000,8000,7000],
  ['werner enterprises','Werner Enterprises Inc','WERN','NASDAQ','US','Industrials','Trucking / USA',14000,4000,3000],
  ['marten transport','Marten Transport Ltd','MRTN','NASDAQ','US','Industrials','Trucking / USA',4000,2000,1200],
  ['landstar system','Landstar System Inc','LSTR','NASDAQ','US','Industrials','Transportation Logistics / USA',1500,7000,5000],
  ['matson logistics','Matson Inc','MATX','NYSE','US','Industrials','Ocean Shipping / USA',5000,5000,4000],
  ['kirby maritime','Kirby Corporation','KEX','NYSE','US','Industrials','Inland Waterway Transport / USA',5000,4000,3000],
  ['global air','Air Transport Services Group','ATSG','NASDAQ','US','Industrials','Air Cargo / USA',4000,2000,2000],
  ['echo global','Echo Global Logistics Inc','ECHO','NASDAQ','US','Industrials','Freight Brokerage / USA',3000,4000,4000],
  ['radnet imaging','RadNet Inc','RDNT','NASDAQ','US','Healthcare','Radiology Centers / USA',13000,5000,1800],
  ['acadia health','Acadia Healthcare Company Inc','ACHC','NASDAQ','US','Healthcare','Behavioral Health Facilities / USA',23000,6000,2500],
  ['lifestance health','LifeStance Health Group Inc','LFST','NASDAQ','US','Healthcare','Outpatient Mental Health / USA',7000,3000,1000],
  ['pediatrix medical','Pediatrix Medical Group Inc','MD','NYSE','US','Healthcare','Physician Services / USA',11000,4000,2000],
  ['cross country health','Cross Country Healthcare Inc','CCRN','NASDAQ','US','Healthcare','Healthcare Staffing / USA',10000,3000,2000],
  ['davita kidney','DaVita Inc','DVA','NYSE','US','Healthcare','Kidney Dialysis / USA',65000,16000,12000],
  ['encompass health','Encompass Health Corporation','EHC','NYSE','US','Healthcare','Inpatient Rehabilitation / USA',46000,12000,5000],
  ['selectquote insurance','SelectQuote Inc','SLQT','NYSE','US','Financials','Insurance Distribution Platform / USA',3000,2000,1200],
]);

runWaves('GIANTS GW13', V, [
  ['SEA Additional', seaAdditional],
  ['Europe Remaining', europeRemaining],
  ['US Last Names', usLastNames],
]);
