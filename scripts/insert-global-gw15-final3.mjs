// GIANTS Wave 15 — final 3 to cross 300 exactly.
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'glob-gw15-v2026.1';
const g = mapRows(V);

const last3 = g([
  ['intertek2 sgs','SGS SA','SGSN','SIX','CH','Industrials','Testing Inspection Certification / Switzerland',96000,22000,7000],
  ['china huaneng power','China Huaneng Group Co Ltd','0902','HKSE','CN','Utilities','Power Generation / China',120000,20000,40000],
  ['ctrip elong','Tongcheng Travel Holdings Limited','0780','HKSE','HK','Consumer Discretionary','Online Travel Agent / China',9000,5000,3000],
]);

runWaves('GIANTS GW15', V, [['Final 3', last3]]);
