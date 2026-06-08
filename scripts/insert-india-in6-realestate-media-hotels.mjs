// India Wave IN6 — Real Estate + REITs + Media + Hotels + Hospitality
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'india-in6-v2026.1';
const g = mapRows(V);

const realEstate = g([
  ['mahindra lifespace','Mahindra Lifespace Developers Limited','MAHLIFE','NSE','IN','Real Estate','Residential & Industrial Parks / India',1200,1100,310,true,0],
  ['sunteck realty','Sunteck Realty Limited','SUNTECK','NSE','IN','Real Estate','Premium Residential / India',600,1600,520,true,0],
  ['keystone realtors','Keystone Realtors Limited (Rustomjee)','RUSTOMJEE','NSE','IN','Real Estate','Residential Development / India',500,820,510,true,0],
  ['shriram properties','Shriram Properties Limited','SHRIRAMPPS','NSE','IN','Real Estate','Affordable Housing / India',800,420,410,true,0],
  ['nuvoco vistas','Nuvoco Vistas Corporation Limited','NUVOCO','NSE','IN','Materials','Cement & RMC / India',4000,820,1550,true,0],
  ['anant raj limited','Anant Raj Limited','ANANTRAJ','NSE','IN','Real Estate','Commercial & Data Centre Real Estate / India',2500,2100,420,true,0],
  ['signature global','Signature Global (India) Limited','SIGNATURE','NSE','IN','Real Estate','Affordable Housing / India',3000,2100,620,true,0],
]);

const reits = g([
  ['embassy office parks','Embassy Office Parks REIT','EMBASSY','NSE','IN','Real Estate','Commercial Office REIT / India',3000,5200,620,true,0],
  ['mindspace reit','Mindspace Business Parks REIT','MINDSPACE','NSE','IN','Real Estate','Office Park REIT / India',2500,3600,510,true,0],
  ['nexus select trust','Nexus Select Trust (Retail REIT)','NEXUSSELECT','NSE','IN','Real Estate','Retail Mall REIT / India',1800,2600,420,true,0],
]);

const media = g([
  ['pvr inox','PVR INOX Limited','PVRINOX','NSE','IN','Consumer Discretionary','Multiplex Cinemas / India',15000,2600,1050,true,0],
  ['dish tv india','Dish TV India Limited','DISHTV','NSE','IN','Communications','Direct-to-Home TV / India',1500,540,540,true,0],
  ['network18','Network18 Media & Investments Limited','NETWORK18','NSE','IN','Communications','News & Entertainment Media / India',12000,2600,1100,true,0],
  ['tv18 broadcast','TV18 Broadcast Limited','TV18BRDCST','NSE','IN','Communications','Broadcasting / India',6000,1050,820,true,0],
]);

const hotels = g([
  ['indian hotels company','The Indian Hotels Company Limited','INDHOTEL','NSE','IN','Consumer Discretionary','Luxury Hotels & Resorts / India',20000,8500,1600,true,0],
  ['eih limited','EIH Limited (Oberoi Hotels)','EIHOTEL','NSE','IN','Consumer Discretionary','Luxury Hotels / India',8000,4600,820,true,0],
  ['mahindra holidays','Mahindra Holidays & Resorts India Limited','MHRIL','NSE','IN','Consumer Discretionary','Club Membership & Resorts / India',3000,1300,420,true,0],
  ['wonderla holidays','Wonderla Holidays Limited','WONDERLA','NSE','IN','Consumer Discretionary','Amusement Parks / India',1500,620,220,true,0],
  ['leela palaces hotels','The Leela Palaces Hotels and Resorts Ltd','LEELA','NSE','IN','Consumer Discretionary','Luxury Hotels & Resorts / India',7000,3100,620,true,0],
]);

runWaves('INDIA IN6', V, [
  ['Real Estate', realEstate],
  ['REITs', reits],
  ['Media & Entertainment', media],
  ['Hotels & Hospitality', hotels],
]);
