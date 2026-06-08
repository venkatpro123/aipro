// India Wave IN8 — Textiles + Metals + Logistics + Paper + Jewellery
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'india-in8-v2026.1';
const g = mapRows(V);

const textiles = g([
  ['raymond limited','Raymond Limited','RAYMOND','NSE','IN','Consumer Discretionary','Textiles & Apparel / India',21000,2100,1050,true,0],
  ['arvind limited','Arvind Limited','ARVIND','NSE','IN','Industrials','Textiles & Garments / India',30000,1600,1600,true,0],
  ['welspun living','Welspun Living Limited','WELSPUNLIV','NSE','IN','Consumer Discretionary','Home Textiles / India',18000,2100,1600,true,0],
  ['vardhman textiles','Vardhman Textiles Limited','VTL','NSE','IN','Industrials','Yarn & Fabric / India',27000,3600,2600,true,0],
  ['siyaram silk mills','Siyaram Silk Mills Limited','SIYARAM','NSE','IN','Consumer Discretionary','Fabric & Apparel / India',5000,620,420,true,0],
  ['nitin spinners','Nitin Spinners Limited','NITINSPIN','NSE','IN','Industrials','Cotton Yarn / India',5000,520,310,true,0],
]);

const metals = g([
  ['ratnamani metals','Ratnamani Metals & Tubes Limited','RATNAMANI','NSE','IN','Materials','Stainless & Alloy Tubes / India',3000,2600,820,true,0],
  ['jindal saw','Jindal SAW Limited','JINDALSAW','NSE','IN','Materials','SAW Pipes & Tubes / India',8000,3100,2100,true,0],
  ['man industries','Man Industries (India) Limited','MANINDS','NSE','IN','Materials','Steel Pipes / India',2000,820,520,true,0],
  ['lloyds metals','Lloyds Metals and Energy Limited','LLOYDSME','NSE','IN','Materials','Steel & Mining / India',5000,5200,1600,true,0],
]);

const logistics = g([
  ['container corporation','Container Corporation of India Limited','CONCOR','NSE','IN','Industrials','Rail & Port Container Logistics / India',1500,10500,2100,true,0],
  ['tvs supply chain','TVS Supply Chain Solutions Limited','TVSSCS','NSE','IN','Industrials','Integrated Supply Chain / India',15000,2600,2100,true,0],
  ['mahindra logistics','Mahindra Logistics Limited','MAHLOG','NSE','IN','Industrials','3PL Logistics / India',6000,520,620,true,0],
  ['gati limited','Gati Limited','GATI','NSE','IN','Industrials','Express Distribution / India',3000,820,320,true,0],
]);

const jewellery = g([
  ['kalyan jewellers','Kalyan Jewellers India Limited','KALYANKJIL','NSE','IN','Consumer Discretionary','Jewellery Retail / India',12000,4200,3600,true,0],
  ['senco gold','Senco Gold Limited','SENCOGOLD','NSE','IN','Consumer Discretionary','Jewellery Retail / India',4000,820,1050,true,0],
  ['pc jeweller','PC Jeweller Limited','PCJEWELLER','NSE','IN','Consumer Discretionary','Jewellery Retail / India',3500,620,820,true,0],
  ['vaibhav global','Vaibhav Global Limited','VGL','NSE','IN','Consumer Discretionary','Online Jewellery & Lifestyle / India',4000,520,620,true,0],
]);

const paper = g([
  ['jk paper','JK Paper Limited','JKPAPER','NSE','IN','Materials','Paper Products / India',5000,1600,1050,true,0],
  ['tnpl paper','Tamil Nadu Newsprint & Papers Limited','TNPL','NSE','IN','Materials','Newsprint & Writing Paper / India',3000,520,520,true,0],
  ['uflex packaging','Uflex Limited','UFLEX','NSE','IN','Materials','Flexible Packaging / India',12000,820,1050,true,0],
  ['carborundum universal','Carborundum Universal Limited','CARBORUNIV','NSE','IN','Industrials','Abrasives & Industrial Ceramics / India',3500,2100,620,true,0],
]);

runWaves('INDIA IN8', V, [
  ['Textiles', textiles],
  ['Metals & Tubes', metals],
  ['Logistics', logistics],
  ['Jewellery', jewellery],
  ['Paper & Industrial', paper],
]);
