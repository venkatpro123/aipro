// India Wave IN15 — Consumer FMCG + Specialty Chemicals + Media + Agro + Solar
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'india-in15-v2026.1';
const g = mapRows(V);

const consumerFmcg = g([
  ['lotus herbals','Lotus Herbals Limited','LOTUSHERB','NSE','IN','Consumer Staples','Herbal FMCG & Skincare / India',1500,820,420,true,0],
  ['dhampur bio organics','Dhampur Bio Organics Limited','DHAMPURE','NSE','IN','Consumer Staples','Sugar & Ethanol / India',3500,310,820,true,0],
  ['go fashion india','Go Fashion (India) Limited','GOCOLORS','NSE','IN','Consumer Discretionary','Bottom-wear Ethnic Retail / India',2500,2600,420,true,0],
  ['prataap snacks','Prataap Snacks Limited','DIAMONDYD','NSE','IN','Consumer Staples','Branded Snacks / India',3500,820,420,true,0],
  ['park hotels eih associated','EIH Associated Hotels Limited','EIHAHOTELS','NSE','IN','Consumer Discretionary','Mid-scale Hotels / India',2000,820,320,true,0],
  ['samhi hotels','SAMHI Hotels Limited','SAMHI','NSE','IN','Consumer Discretionary','Mid-Market & Upscale Hotels / India',3000,820,310,true,0],
  ['mcleod russel india','McLeod Russel India Limited','MCLEODRUSS','NSE','IN','Consumer Staples','Tea Plantations / India',25000,820,420,true,0],
  ['tata coffee','Tata Coffee Limited','TATACOFFEE','NSE','IN','Consumer Staples','Coffee & Plantations / India',10000,820,520,true,0],
]);

const specialChemicals = g([
  ['alkyl amines chemicals','Alkyl Amines Chemicals Limited','ALKYLAMINSE','NSE','IN','Materials','Aliphatic Amines / India',1500,2600,420,true,0],
  ['aarti drugs','Aarti Drugs Limited','AARTIDRUGS','NSE','IN','Materials','API & Specialty Chemicals / India',3000,820,520,true,0],
  ['chemplast sanmar','Chemplast Sanmar Limited','CHEMPLASTS','NSE','IN','Materials','PVC & Specialty Chemicals / India',5000,1600,1050,true,0],
  ['garware technical fibres','Garware Technical Fibres Limited','GARFIBRES','NSE','IN','Materials','Technical Textiles & Aqua Nets / India',2000,2100,420,true,0],
  ['sumitomo chemical india','Sumitomo Chemical India Limited','SUMICHEM','NSE','IN','Materials','Agrochemicals / India',2500,3600,520,true,0],
  ['ghcl limited','GHCL Limited','GHCL','NSE','IN','Materials','Soda Ash & Home Textiles / India',7000,2100,1050,true,0],
  ['solar industries india','Solar Industries India Limited','SOLARINDS','NSE','IN','Industrials','Industrial Explosives & Defence / India',6000,8500,820,true,0],
  ['jayant agro organics','Jayant Agro-Organics Limited','JAYAGROGN','NSE','IN','Materials','Castor Seed Derivatives / India',1200,520,820,true,0],
]);

const media = g([
  ['jagran prakashan','Jagran Prakashan Limited','JAGRAN','NSE','IN','Communications','Hindi Print & Digital Media / India',5000,620,420,true,0],
  ['db corp','DB Corp Limited (Dainik Bhaskar)','DBCORP','NSE','IN','Communications','Hindi Newspaper Group / India',6000,820,520,true,0],
  ['s chand group','S Chand and Company Limited','SCHAND','NSE','IN','Consumer Discretionary','Educational Publishing / India',3000,320,320,true,0],
]);

const renewable = g([
  ['waaree energies','Waaree Energies Limited','WAAREEENER','NSE','IN','Utilities','Solar Panel Manufacturing / India',5000,10500,820,true,0],
  ['premier energies','Premier Energies Limited','PREMIERENE','NSE','IN','Utilities','Solar Module Manufacturing / India',4000,5200,620,true,0],
  ['borosil renewables','Borosil Renewables Limited','BORORENEW','NSE','IN','Utilities','Solar Glass / India',1500,1050,310,true,0],
]);

runWaves('INDIA IN15', V, [
  ['Consumer FMCG & Hospitality', consumerFmcg],
  ['Specialty Chemicals & Agro', specialChemicals],
  ['Media & Publishing', media],
  ['Renewable Energy', renewable],
]);
