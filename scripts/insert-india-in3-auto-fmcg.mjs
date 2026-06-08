// India Wave IN3 — Auto Ancillaries + FMCG / QSR / Retail
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'india-in3-v2026.1';
const g = mapRows(V);

const autoAncillaries = g([
  ['ashok leyland','Ashok Leyland Limited','ASHOKLEY','NSE','IN','Consumer Discretionary','Commercial Vehicles / India',13000,9200,5100,true,0],
  ['motherson sumi wiring','Samvardhana Motherson International Ltd','MOTHERSON','NSE','IN','Consumer Discretionary','Auto Components & Wiring / India',200000,12000,18500,true,0],
  ['schaeffler india','Schaeffler India Limited','SCHAEFFLER','NSE','IN','Industrials','Bearings & Auto Components / India',4500,3600,1250,true,0],
  ['skf india','SKF India Limited','SKFINDIA','NSE','IN','Industrials','Bearings / India',3500,2600,950,true,0],
  ['minda industries','Uno Minda Limited','UNOMINDA','NSE','IN','Industrials','Auto Components / India',24000,5200,2600,true,0],
  ['amara raja energy','Amara Raja Energy & Mobility Limited','AMARAJABAT','NSE','IN','Industrials','Batteries & Energy Storage / India',10000,2600,2100,true,0],
  ['sundaram fasteners','Sundaram Fasteners Limited','SUNDRMFAST','NSE','IN','Industrials','Fasteners & Auto Parts / India',7500,2000,980,true,0],
  ['gabriel india','Gabriel India Limited','GABRIEL','NSE','IN','Industrials','Shock Absorbers / India',4000,900,700,true,0],
  ['suprajit engineering','Suprajit Engineering Limited','SUPRAJIT','NSE','IN','Industrials','Cables & Controls / India',6000,700,550,true,0],
  ['craftsman automation','Craftsman Automation Limited','CRAFTSMAN','NSE','IN','Industrials','Precision Engineering / India',5000,1200,650,true,0],
]);

const fmcgQsr = g([
  ['britannia industries','Britannia Industries Limited','BRITANNIA','NSE','IN','Consumer Staples','Biscuits & Bakery Products / India',5000,13200,2000,true,0],
  ['jyothy labs','Jyothy Labs Limited','JYOTHYLAB','NSE','IN','Consumer Staples','FMCG Personal Care / India',3500,1800,430,true,0],
  ['bajaj consumer care','Bajaj Consumer Care Limited','BAJAJCON','NSE','IN','Consumer Staples','FMCG Hair Care / India',600,550,320,true,0],
  ['jubilant foodworks','Jubilant FoodWorks Limited','JUBLFOOD','NSE','IN','Consumer Discretionary','QSR Dominos / India',52000,4100,800,true,0],
  ['westlife foodworld','Westlife FoodWorld Limited','WESTLIFE','NSE','IN','Consumer Discretionary','QSR McDonalds / India',12000,2600,520,true,0],
  ['restaurant brands asia','Restaurant Brands Asia Limited','RBA','NSE','IN','Consumer Discretionary','QSR Burger King / India',7500,850,320,true,0],
  ['devyani international','Devyani International Limited','DEVYANI','NSE','IN','Consumer Discretionary','QSR KFC / Pizza Hut / India',15000,2600,520,true,0],
  ['sapphire foods india','Sapphire Foods India Limited','SAPPHIRE','NSE','IN','Consumer Discretionary','QSR KFC / India',12000,1600,530,true,0],
]);

const retail = g([
  ['metro brands','Metro Brands Limited','METROBRAND','NSE','IN','Consumer Discretionary','Footwear Retail / India',3500,2500,520,true,0],
  ['bata india','Bata India Limited','BATAINDIA','NSE','IN','Consumer Discretionary','Footwear Retail / India',5500,2600,480,true,0],
  ['v-mart retail','V-Mart Retail Limited','VMART','NSE','IN','Consumer Discretionary','Value Retail / India',3500,480,380,true,0],
  ['vedant fashions','Vedant Fashions Limited','MANYAVAR','NSE','IN','Consumer Discretionary','Ethnic Wear Retail / India',2500,2600,320,true,0],
  ['landmark cars','Landmark Cars Limited','LANDMARK','NSE','IN','Consumer Discretionary','Auto Dealership / India',3500,700,620,true,0],
]);

runWaves('INDIA IN3', V, [
  ['Auto Ancillaries', autoAncillaries],
  ['FMCG & QSR', fmcgQsr],
  ['Retail', retail],
]);
