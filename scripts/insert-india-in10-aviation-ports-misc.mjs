// India Wave IN10 — Aviation, Ports, Specialty Mfg, Diagnostics, Sugar, Misc
// All confirmed-missing NSE/BSE companies. Real 2026 data.
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'india-in10-v2026.1';
const g = mapRows(V);

const aviationPorts = g([
  ['interglobe aviation','InterGlobe Aviation Limited (IndiGo)','INDIGO','NSE','IN','Industrials','Low-Cost Airlines / India',28000,14500,6500,true,0],
  ['spicejet limited','SpiceJet Limited','SPICEJET','NSE','IN','Industrials','Low-Cost Airlines / India',12000,320,1050,true,0],
  ['gujarat pipavav port','Gujarat Pipavav Port Limited','GPPL','NSE','IN','Industrials','Container Port / India',800,1050,210,true,0],
  ['dredging corporation','Dredging Corporation of India Limited','DREDGECORP','NSE','IN','Industrials','Dredging Services / India',1000,820,210,true,0],
]);

const specialMfg = g([
  ['mtar technologies','MTAR Technologies Limited','MTAR','NSE','IN','Industrials','Precision Engineering Defence & Space / India',1000,1600,320,true,0],
  ['rhi magnesita india','RHI Magnesita India Limited','RHIM','NSE','IN','Materials','Refractory Products / India',2000,820,420,true,0],
  ['kennametal india','Kennametal India Limited','KENNAMET','NSE','IN','Industrials','Cutting Tools / India',1500,820,320,true,0],
  ['sterlite power','Sterlite Power Transmission Limited','STLTECH','NSE','IN','Industrials','Power Transmission Solutions / India',4500,820,420,true,0],
]);

const diagnosticsRetail = g([
  ['metropolis healthcare','Metropolis Healthcare Limited','METROPOLIS','NSE','IN','Healthcare','Diagnostic Labs / India',4500,1600,280,true,0],
  ['spencer retail','Spencer Retail Limited','SPENCERS','NSE','IN','Consumer Discretionary','Hypermarket Retail / India',5000,320,420,true,0],
  ['nmdc steel','NMDC Steel Limited','NMDCSTEEL','NSE','IN','Materials','Integrated Steel Plant / India',3000,2100,520,true,0],
]);

const agroSugar = g([
  ['dalmia bharat sugar','Dalmia Bharat Sugar and Industries Ltd','DALMIASUG','NSE','IN','Consumer Staples','Sugar Manufacturing / India',4000,320,820,true,0],
  ['bannari amman sugars','Bannari Amman Sugars Limited','BANARISUG','NSE','IN','Consumer Staples','Sugar Manufacturing / India',2000,310,320,true,0],
  ['insecticides india','Insecticides (India) Limited','INSECTICID','NSE','IN','Materials','Crop Protection / India',1200,320,310,true,0],
  ['sadbhav engineering','Sadbhav Engineering Limited','SADBHAVENG','NSE','IN','Industrials','Road & Highway EPC / India',6000,520,820,true,0],
]);

runWaves('INDIA IN10', V, [
  ['Aviation & Ports', aviationPorts],
  ['Specialty Manufacturing', specialMfg],
  ['Diagnostics & Mixed', diagnosticsRetail],
  ['Agro, Sugar & Others', agroSugar],
]);
