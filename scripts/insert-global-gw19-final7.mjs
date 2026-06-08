// GIANTS Wave 19 — final 7 to cross 100 net new.
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'glob-gw19-v2026.1';
const g = mapRows(V);

const last7 = g([
  ['sobha developers','Sobha Limited','SOBHA','NSE','IN','Real Estate','Residential Real Estate / India',5000,5000,2000],
  ['brigade enterprises','Brigade Enterprises Limited','BRIGADE','NSE','IN','Real Estate','Real Estate Development / India',5000,5000,2000],
  ['whitecap resources','Whitecap Resources Inc','WCP','TSX','CA','Energy','Oil & Gas E&P / Canada',1500,4000,2000],
  ['nuvei payments','Nuvei Corporation','NVEI','TSX','CA','Financial Technology','Payments Technology / Canada',1500,5000,900],
  ['step energy','Step Energy Services Ltd','STEP','TSX','CA','Energy','Oilfield Services / Canada',2500,2000,800],
  ['valeo auto parts','Valeo SE','FR','EPA','FR','Industrials','Automotive Parts & Systems / France',100000,7000,22000],
  ['indofood agri','Indofood Agri Resources Ltd','5JS','SGX','SG','Consumer Staples','Agribusiness Palm Oil / Singapore',45000,2000,8000],
]);

runWaves('GIANTS GW19', V, [['Final 7', last7]]);
