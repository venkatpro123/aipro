// India Wave IN14 — Defense + Shipbuilding + Rail + Power Finance + Energy
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'india-in14-v2026.1';
const g = mapRows(V);

const defense = g([
  ['mazagon dock shipbuilders','Mazagon Dock Shipbuilders Limited','MAZDOCK','NSE','IN','Industrials','Naval Vessels & Submarines / India',12000,8500,820,true,0],
  ['garden reach shipbuilders','Garden Reach Shipbuilders & Engineers Ltd','GRSE','NSE','IN','Industrials','Naval Ships & Engineering / India',5000,5200,520,true,0],
  ['cochin shipyard','Cochin Shipyard Limited','COCHINSHIP','NSE','IN','Industrials','Shipbuilding & Ship Repair / India',3500,6200,520,true,0],
  ['paras defence space','Paras Defence and Space Technologies Ltd','PARAS','NSE','IN','Industrials','Defence Electronics & Space / India',800,1050,120,true,0],
  ['data patterns india','Data Patterns (India) Limited','DATAPATTNS','NSE','IN','Industrials','Defence & Aerospace Electronics / India',1200,3200,320,true,0],
  ['astra microwave products','Astra Microwave Products Limited','ASTRAMICRO','NSE','IN','Industrials','Microwave & RF Electronics / India',1500,1600,220,true,0],
]);

const railEquipment = g([
  ['titagarh rail systems','Titagarh Rail Systems Limited','TWL','NSE','IN','Industrials','Wagons & Metro Rail Cars / India',8000,3600,820,true,0],
  ['jupiter wagons','Jupiter Wagons Limited','JWL','NSE','IN','Industrials','Railway Wagons / India',5000,2600,520,true,0],
  ['texmaco rail engineering','Texmaco Rail & Engineering Limited','TEXRAIL','NSE','IN','Industrials','Wagons & Heavy Engineering / India',6000,1050,620,true,0],
  ['isgec heavy engineering','ISGEC Heavy Engineering Limited','ISGEC','NSE','IN','Industrials','Heavy Equipment & Sugar Plants / India',5000,1300,1050,true,0],
  ['dynamatic technologies','Dynamatic Technologies Limited','DYNAMATECH','NSE','IN','Industrials','Aerospace & Hydraulic Engineering / India',3000,820,420,true,0],
]);

const powerFinance = g([
  ['power finance corporation','Power Finance Corporation Limited','PFC','NSE','IN','Financials','Power Sector Financing / India',200,28000,3200,true,0],
  ['rec limited','REC Limited','RECLTD','NSE','IN','Financials','Rural Electrification Finance / India',150,22000,3000,true,0],
  ['power grid corporation','Power Grid Corporation of India Limited','POWERGRID','NSE','IN','Utilities','Power Transmission Grid / India',12000,28000,5200,true,0],
  ['adani power','Adani Power Limited','ADANIPOWER','NSE','IN','Utilities','Thermal Power Generation / India',12000,16500,5200,true,0],
  ['sterling wilson solar','Sterling and Wilson Renewable Energy Ltd','SWSOLAR','NSE','IN','Utilities','Solar EPC / India',4000,1050,820,true,0],
]);

runWaves('INDIA IN14', V, [
  ['Defense & Shipbuilding', defense],
  ['Rail Equipment', railEquipment],
  ['Power Finance & Utilities', powerFinance],
]);
