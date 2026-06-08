// GLOBAL Wave 15 — final closeout (Japan + European blue-chips + US insurance/REIT/utility) to cross 300 net new.
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'glob-w15-v2026.1';
const g = mapRows(V);

const japan = g([
  ['mitsubishi electric','Mitsubishi Electric Corporation','6503','TYO','JP','Industrials','Electrical Equipment / Japan',150000,40000,35000],
  ['denso auto parts','DENSO Corporation','6902','TYO','JP','Consumer Discretionary','Automotive Components / Japan',160000,45000,45000],
  ['sysmex diagnostics','Sysmex Corporation','6869','TYO','JP','Healthcare','In-Vitro Diagnostics / Japan',10000,12000,3000],
  ['nitto denko','Nitto Denko Corporation','6988','TYO','JP','Materials','Functional Materials / Japan',28000,12000,6000],
  ['disco dicing','Disco Corporation','6146','TYO','JP','Technology','Semiconductor Dicing Equipment / Japan',6000,30000,2500],
  ['lasertec inspection','Lasertec Corporation','6920','TYO','JP','Technology','Semiconductor Inspection / Japan',1000,15000,1500],
  ['shin-etsu chemical','Shin-Etsu Chemical Co Ltd','4063','TYO','JP','Materials','Silicon & PVC Chemicals / Japan',25000,60000,15000],
  ['asahi kasei','Asahi Kasei Corporation','3407','TYO','JP','Materials','Diversified Chemicals / Japan',48000,12000,18000],
  ['terumo medical','Terumo Corporation','4543','TYO','JP','Healthcare','Medical Devices / Japan',30000,25000,6000],
  ['olympus endoscopy','Olympus Corporation','7733','TYO','JP','Healthcare','Endoscopy Devices / Japan',32000,25000,6000],
  ['kao consumer','Kao Corporation','4452','TYO','JP','Consumer Staples','Household & Personal Care / Japan',33000,20000,10000],
  ['shiseido cosmetics','Shiseido Company Limited','4911','TYO','JP','Consumer Staples','Cosmetics / Japan',40000,10000,7000],
  ['unicharm hygiene','Unicharm Corporation','8113','TYO','JP','Consumer Staples','Hygiene Products / Japan',16000,20000,6000],
  ['bandai namco','Bandai Namco Holdings Inc','7832','TYO','JP','Consumer Discretionary','Toys & Video Games / Japan',10000,20000,7000],
  ['recruit holdings','Recruit Holdings Co Ltd','6098','TYO','JP','Technology','HR Tech & Staffing / Japan',55000,60000,22000],
  ['fast retailing uniqlo','Fast Retailing Co Ltd','9983','TYO','JP','Consumer Discretionary','Apparel Retail Uniqlo / Japan',57000,90000,20000],
]);

const europe = g([
  ['heineken beer','Heineken NV','HEIA','AMS','NL','Consumer Staples','Brewing / Netherlands',90000,80000,40000],
  ['ahold delhaize','Koninklijke Ahold Delhaize NV','AD','AMS','NL','Consumer Staples','Grocery Retail / Netherlands',400000,30000,95000],
  ['abn amro bank','ABN AMRO Bank NV','ABN','AMS','NL','Financials','Commercial Banking / Netherlands',22000,15000,9000],
  ['heidelberg materials','Heidelberg Materials AG','HEI','XETRA','DE','Materials','Cement & Aggregates / Germany',51000,25000,22000],
  ['zalando fashion','Zalando SE','ZAL','XETRA','DE','Consumer Discretionary','Online Fashion Retail / Germany',15000,8000,11000],
  ['puma sportswear','PUMA SE','PUM','XETRA','DE','Consumer Discretionary','Sportswear / Germany',20000,5000,9000],
  ['hugo boss apparel','Hugo Boss AG','BOSS','XETRA','DE','Consumer Discretionary','Premium Apparel / Germany',19000,4000,4500],
  ['beiersdorf nivea','Beiersdorf AG','BEI','XETRA','DE','Consumer Staples','Skin Care Nivea / Germany',22000,30000,10000],
  ['henkel consumer','Henkel AG & Co KGaA','HEN3','XETRA','DE','Consumer Staples','Consumer & Adhesives / Germany',48000,35000,22000],
  ['pernod ricard','Pernod Ricard SA','RI','EPA','FR','Consumer Staples','Wines & Spirits / France',19000,35000,12000],
  ['danone food','Danone SA','BN','EPA','FR','Consumer Staples','Dairy & Nutrition / France',90000,45000,30000],
  ['kering luxury','Kering SA','KER','EPA','FR','Consumer Discretionary','Luxury Goods Gucci / France',47000,40000,20000,true,1000],
  ['hermes luxury','Hermès International SCA','RMS','EPA','FR','Consumer Discretionary','Luxury Leather Goods / France',22000,240000,15000],
  ['essilorluxottica','EssilorLuxottica SA','EL','EPA','FR','Healthcare','Eyewear & Lenses / France',190000,120000,27000],
  ['publicis advertising','Publicis Groupe SA','PUB','EPA','FR','Communications','Advertising & Marketing / France',100000,25000,14000],
  ['vinci construction','Vinci SA','DG','EPA','FR','Industrials','Construction & Concessions / France',280000,70000,75000],
  ['saint gobain','Compagnie de Saint-Gobain SA','SGO','EPA','FR','Materials','Building Materials / France',160000,45000,52000],
  ['safran aero','Safran SA','SAF','EPA','FR','Industrials','Aircraft Engines & Systems / France',95000,90000,27000],
  ['capgemini consulting','Capgemini SE','CAP','EPA','FR','Technology','IT Consulting & Services / France',340000,35000,24000,true,2000],
  ['ses satellites','SES SA','SESG','EPA','LU','Communications','Satellite Communications / Luxembourg',2000,3000,2200],
]);

const usMisc = g([
  ['old republic insurance','Old Republic International Corp','ORI','NYSE','US','Financials','Title & General Insurance / USA',9000,10000,8000],
  ['erie indemnity','Erie Indemnity Company','ERIE','NASDAQ','US','Financials','Insurance Management / USA',6000,18000,3500],
  ['globe life','Globe Life Inc','GL','NYSE','US','Financials','Life & Health Insurance / USA',3500,11000,6000],
  ['reinsurance group','Reinsurance Group of America Inc','RGA','NYSE','US','Financials','Life Reinsurance / USA',4000,15000,22000],
  ['equity residential','Equity Residential','EQR','NYSE','US','Real Estate','Apartment REIT / USA',2400,25000,2900],
  ['essex property','Essex Property Trust Inc','ESS','NYSE','US','Real Estate','Apartment REIT / USA',1800,18000,1700],
  ['mid america apartment','Mid-America Apartment Communities','MAA','NYSE','US','Real Estate','Apartment REIT / USA',2500,18000,2200],
  ['sun communities','Sun Communities Inc','SUI','NYSE','US','Real Estate','Manufactured Housing REIT / USA',7000,15000,3300],
  ['wp carey reit','W. P. Carey Inc','WPC','NYSE','US','Real Estate','Net Lease REIT / USA',200,13000,1600],
  ['kimco retail reit','Kimco Realty Corporation','KIM','NYSE','US','Real Estate','Retail Shopping Center REIT / USA',700,14000,1900],
  ['cms energy','CMS Energy Corporation','CMS','NYSE','US','Utilities','Electric & Gas Utility / USA',8000,20000,7500],
  ['alliant energy','Alliant Energy Corporation','LNT','NASDAQ','US','Utilities','Electric & Gas Utility / USA',3500,15000,4000],
  ['nisource utility','NiSource Inc','NI','NYSE','US','Utilities','Gas & Electric Utility / USA',8000,16000,5500],
  ['atmos energy','Atmos Energy Corporation','ATO','NYSE','US','Utilities','Natural Gas Distribution / USA',5000,22000,4500],
]);

runWaves('GLOBAL W15', V, [
  ['Japan', japan],
  ['Europe Blue-Chips', europe],
  ['US Insurance/REIT/Utility', usMisc],
]);
