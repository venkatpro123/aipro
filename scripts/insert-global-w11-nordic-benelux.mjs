// GLOBAL Wave 11 — real listed Nordic + Benelux + Southern Europe + Israel mid/large-caps.
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'glob-w11-v2026.1';
const g = mapRows(V);

const nordics = g([
  ['nibe heat pumps','NIBE Industrier AB','NIBE-B','OMX','SE','Industrials','Heat Pumps & Climate / Sweden',21000,10000,4000],
  ['hexagon metrology','Hexagon AB','HEXA-B','OMX','SE','Technology','Measurement & Sensors / Sweden',24000,30000,5500],
  ['sandvik tooling','Sandvik AB','SAND','OMX','SE','Industrials','Cutting Tools & Mining / Sweden',40000,25000,12000],
  ['skf bearings','AB SKF','SKF-B','OMX','SE','Industrials','Bearings & Seals / Sweden',40000,9000,10000],
  ['alfa laval','Alfa Laval AB','ALFA','OMX','SE','Industrials','Heat Transfer & Separation / Sweden',22000,20000,6000],
  ['electrolux appliances','AB Electrolux','ELUX-B','OMX','SE','Consumer Discretionary','Home Appliances / Sweden',45000,4000,13000,true,1200],
  ['husqvarna outdoor','Husqvarna AB','HUSQ-B','OMX','SE','Industrials','Outdoor Power Products / Sweden',14000,5000,4500],
  ['trelleborg polymer','Trelleborg AB','TREL-B','OMX','SE','Materials','Engineered Polymers / Sweden',16000,9000,4500],
  ['saab defense','Saab AB','SAAB-B','OMX','SE','Industrials','Defense & Aerospace / Sweden',22000,15000,5000],
  ['securitas services','Securitas AB','SECU-B','OMX','SE','Industrials','Security Services / Sweden',340000,6000,15000],
  ['kongsberg maritime','Kongsberg Gruppen ASA','KOG','OSL','NO','Industrials','Defense & Maritime Tech / Norway',14000,20000,4000],
  ['mowi salmon','Mowi ASA','MOWI','OSL','NO','Consumer Staples','Salmon Aquaculture / Norway',12000,10000,5500],
  ['yara fertilizer','Yara International ASA','YAR','OSL','NO','Materials','Crop Nutrition & Fertilizer / Norway',17000,9000,14000],
  ['vestas wind','Vestas Wind Systems A/S','VWS','CPH','DK','Energy','Wind Turbines / Denmark',30000,25000,16000],
  ['pandora jewelry','Pandora A/S','PNDORA','CPH','DK','Consumer Discretionary','Affordable Jewelry / Denmark',27000,15000,4000],
  ['carlsberg beer','Carlsberg A/S','CARL-B','CPH','DK','Consumer Staples','Brewing & Beverages / Denmark',40000,20000,12000],
  ['demant hearing','Demant A/S','DEMANT','CPH','DK','Healthcare','Hearing Aids & Audiology / Denmark',20000,10000,3000],
  ['kone elevators','KONE Oyj','KNEBV','HEL','FI','Industrials','Elevators & Escalators / Finland',60000,25000,11000],
  ['neste renewable','Neste Oyj','NESTE','HEL','FI','Energy','Renewable Fuels / Finland',6000,12000,20000],
  ['upm forest','UPM-Kymmene Oyj','UPM','HEL','FI','Materials','Forest Products & Pulp / Finland',16000,16000,11000],
  ['metso mining','Metso Corporation','METSO','HEL','FI','Industrials','Mining & Aggregates Equipment / Finland',17000,9000,5500],
]);

const benelux = g([
  ['umicore materials','Umicore SA','UMI','EBR','BE','Materials','Battery Materials & Recycling / Belgium',11000,6000,4000],
  ['ucb biopharma','UCB SA','UCB','EBR','BE','Healthcare','Biopharmaceuticals / Belgium',9000,30000,6000],
  ['kbc bancassurance','KBC Group NV','KBC','EBR','BE','Financials','Banking & Insurance / Belgium',40000,30000,12000],
  ['solvay chemicals','Solvay SA','SOLB','EBR','BE','Materials','Specialty Chemicals / Belgium',9000,3000,5000],
  ['aalberts engineering','Aalberts NV','AALB','AMS','NL','Industrials','Engineered Flow & Heat / Netherlands',16000,5000,3500],
  ['akzonobel paints','Akzo Nobel NV','AKZA','AMS','NL','Materials','Paints & Coatings / Netherlands',35000,10000,11000],
  ['randstad staffing','Randstad NV','RAND','AMS','NL','Industrials','Staffing & HR Services / Netherlands',40000,8000,26000],
  ['asm semis','ASM International NV','ASM','AMS','NL','Technology','Semiconductor Deposition Equip / Netherlands',5000,25000,3000],
  ['besi assembly','BE Semiconductor Industries NV','BESI','AMS','NL','Technology','Semiconductor Assembly Equip / Netherlands',2000,10000,700],
  ['arcadis engineering','Arcadis NV','ARCAD','AMS','NL','Industrials','Engineering & Design Consultancy / Netherlands',36000,5000,5000],
  ['aegon insurance','Aegon Ltd','AGN','AMS','NL','Financials','Life Insurance & Pensions / Netherlands',22000,10000,16000],
]);

const southEu = g([
  ['amadeus travel tech','Amadeus IT Group SA','AMS','BME','ES','Technology','Travel Technology / Spain',19000,30000,6000],
  ['cellnex towers','Cellnex Telecom SA','CLNX','BME','ES','Communications','Telecom Tower Infrastructure / Spain',3000,25000,4500],
  ['aena airports','Aena SME SA','AENA','BME','ES','Industrials','Airport Operations / Spain',10000,30000,6000],
  ['grifols plasma','Grifols SA','GRF','BME','ES','Healthcare','Blood Plasma Products / Spain',24000,7000,7000],
  ['fluidra pools','Fluidra SA','FDR','BME','ES','Industrials','Pool & Wellness Equipment / Spain',7000,5000,2200],
  ['recordati pharma','Recordati Industria Chimica','REC','MIL','IT','Healthcare','Specialty Pharmaceuticals / Italy',4500,10000,2300],
  ['amplifon hearing','Amplifon SpA','AMP','MIL','IT','Healthcare','Hearing Care Retail / Italy',20000,6000,2400],
  ['campari spirits','Davide Campari-Milano NV','CPR','MIL','IT','Consumer Staples','Premium Spirits / Italy',5000,10000,3200],
  ['moncler luxury','Moncler SpA','MONC','MIL','IT','Consumer Discretionary','Luxury Outerwear / Italy',7000,16000,3500],
  ['brunello cucinelli','Brunello Cucinelli SpA','BC','MIL','IT','Consumer Discretionary','Luxury Cashmere Apparel / Italy',3000,7000,1300],
  ['interpump hydraulics','Interpump Group SpA','IP','MIL','IT','Industrials','Hydraulic Pumps & Systems / Italy',9000,5000,2200],
  ['jeronimo martins','Jerónimo Martins SGPS SA','JMT','ELI','PT','Consumer Staples','Food Retail / Portugal',130000,14000,32000],
  ['galp energia','Galp Energia SGPS SA','GALP','ELI','PT','Energy','Integrated Oil & Gas / Portugal',6000,14000,20000],
  ['edp renovaveis','EDP Renováveis SA','EDPR','ELI','PT','Utilities','Renewable Energy / Portugal',4000,12000,3000],
]);

const israel = g([
  ['teva generics','Teva Pharmaceutical Industries Ltd','TEVA','NYSE','IL','Healthcare','Generic Pharmaceuticals / Israel',37000,20000,16000,true,1000],
  ['tower semiconductor','Tower Semiconductor Ltd','TSEM','NASDAQ','IL','Technology','Specialty Foundry Semiconductors / Israel',6000,5000,1500],
  ['cyberark security','CyberArk Software Ltd','CYBR','NASDAQ','IL','Technology','Privileged Access Security / Israel',3000,16000,900],
  ['nova metrology','Nova Ltd','NVMI','NASDAQ','IL','Technology','Semiconductor Metrology / Israel',1500,7000,600],
  ['camtek inspection','Camtek Ltd','CAMT','NASDAQ','IL','Technology','Semiconductor Inspection / Israel',1000,5000,400],
  ['nice software','NICE Ltd','NICE','NASDAQ','IL','Technology','Customer Experience Software / Israel',8500,12000,2700],
]);

runWaves('GLOBAL W11', V, [
  ['Nordics', nordics],
  ['Benelux', benelux],
  ['Southern Europe', southEu],
  ['Israel', israel],
]);
