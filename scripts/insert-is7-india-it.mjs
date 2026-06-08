// IT/Software Wave IS7 — India IT/Software + remaining global
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'is7-india-it-v2026.1';
const g = mapRows(V);

const indiaIT = g([
  ['tata technologies','Tata Technologies Limited','TATATECH','NSE','IN','Technology','Engineering R&D Services / India',12500,4200,620,true,0],
  ['cyient','Cyient Limited','CYIENT','NSE','IN','Technology','Engineering & Digital Services / India',16000,1900,820,true,0],
  ['datamatics','Datamatics Global Services Limited','DATAMATICS','NSE','IN','Technology','IT & BPM Services / India',12000,520,520,true,0],
  ['sasken technologies','Sasken Technologies Limited','SASKEN','NSE','IN','Technology','Product Engineering Services / India',3000,320,210,true,0],
  ['saregama','Saregama India Limited','SAREGAMA','NSE','IN','Communications','Music & Content Licensing / India',1000,3200,320,true,0],
]);

runWaves('IS7', V, [
  ['India IT & Software', indiaIT],
]);
