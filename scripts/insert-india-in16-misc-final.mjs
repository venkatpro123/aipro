// India Wave IN16 — Final cleanup: Logistics/IT + Specialty chemicals + Misc
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'india-in16-v2026.1';
const g = mapRows(V);

const logisticsIT = g([
  ['redington india','Redington Limited','REDINGTON','NSE','IN','Industrials','IT Products Distribution / India',6000,4200,9500,true,0],
  ['prime focus technologies','Prime Focus Technologies Limited (DNEG)','PFT','NSE','IN','Technology','Media VFX & Cloud Services / India',8000,1600,520,true,0],
  ['dcm shriram','DCM Shriram Limited','DCMSHRIRAM','NSE','IN','Industrials','Sugar & Chemical & Cement / India',12000,2600,3200,true,0],
  ['solar industries india','Solar Industries India Limited','SOLARINDS','NSE','IN','Industrials','Industrial Explosives & Defence / India',6000,8500,820,true,0],
  ['v2 retail','V2 Retail Limited','V2RETAIL','NSE','IN','Consumer Discretionary','Value Fashion Retail / India',5000,320,420,true,0],
]);

const specialtyMisc = g([
  ['tatva chintan pharma','Tatva Chintan Pharma Chem Limited','TATVACHITN','NSE','IN','Materials','Phase Transfer Catalysts / India',1000,820,210,true,0],
  ['kcp cement engineering','KCP Limited','KCP','NSE','IN','Materials','Cement & Engineering / India',3000,520,420,true,0],
  ['galaxy surfactants','Galaxy Surfactants Limited','GALAXYSURF','NSE','IN','Materials','Surfactants & Specialty Chemicals / India',2000,2600,820,true,0],
  ['anupam rasayan','Anupam Rasayan India Limited','ANURAS','NSE','IN','Materials','Custom Synthesis Agrochemicals / India',2500,1600,320,true,0],
  ['deepak fertilisers','Deepak Fertilisers and Petrochemicals','DEEPAKFERT','NSE','IN','Materials','Fertilizers & Industrial Chemicals / India',6000,1600,1050,true,0],
  ['gujarat narmada valley','Gujarat Narmada Valley Fertilizers & Chem','GNFC','NSE','IN','Materials','Chemicals & Fertilizers / India',5000,1600,1600,true,0],
]);

const otherMisc = g([
  ['zydus lifesciences','Zydus Lifesciences Limited','ZYDUSLIFE','NSE','IN','Healthcare','Generics & Specialty Pharma / India',26000,12500,3200,true,0],
  ['lupin pharma','Lupin Limited','LUPIN','NSE','IN','Healthcare','Generic Pharma Global / India',20000,13500,3100,true,0],
  ['biocon limited','Biocon Limited','BIOCON','NSE','IN','Healthcare','Biosimilars & Generics / India',14000,10500,1800,true,0],
  ['alkem laboratories','Alkem Laboratories Limited','ALKEM','NSE','IN','Healthcare','Branded Generic Pharma / India',12000,10500,1400,true,0],
]);

runWaves('INDIA IN16', V, [
  ['Logistics & IT Distribution', logisticsIT],
  ['Specialty Chemicals & Industrial', specialtyMisc],
  ['Pharma Final', otherMisc],
]);
