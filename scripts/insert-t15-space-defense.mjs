// Tech Wave T15 — Space / Defense Tech + Private AI/Defense
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 't15-space-defense-v2026.1';
const g = mapRows(V);

const spaceListed = g([
  ['rocket lab','Rocket Lab Corporation','RKLB','NASDAQ','US','Industrials','Small Launch & Space Systems / USA',2000,28000,520,true,0],
  ['intuitive machines','Intuitive Machines Inc','LUNR','NASDAQ','US','Industrials','Lunar Landers & Space Services / USA',500,1600,230,true,0],
  ['redwire','Redwire Corporation','RDW','NYSE','US','Industrials','Space Infrastructure / USA',700,1600,310,true,0],
  ['ast spacemobile','AST SpaceMobile Inc','ASTS','NASDAQ','US','Communications','Satellite-to-Cell Broadband / USA',1000,12000,250,true,0],
  ['kratos defense','Kratos Defense & Security Solutions','KTOS','NASDAQ','US','Industrials','Defense Drones & Systems / USA',4000,11000,1300,true,0],
]);

const privateDefenseAI = g([
  ['anduril','Anduril Industries Inc','ANDURIL','PRIVATE','US','Industrials','Autonomous Defense Systems AI / USA',4000,30500,1000,false,0],
  ['shield ai','Shield AI Inc','SHIELDAI','PRIVATE','US','Industrials','Autonomous Military Aircraft AI / USA',1000,5300,200,false,0],
  ['spacex','Space Exploration Technologies Corp','SPACEX','PRIVATE','US','Industrials','Rockets & Starlink Satellites / USA',13000,350000,14000,false,0],
  ['relativity space','Relativity Space Inc','RELSPACE','PRIVATE','US','Industrials','3D-Printed Rockets / USA',1000,4500,100,false,0],
  ['kymeta','Kymeta Corporation','KYMETA','PRIVATE','US','Communications','Flat-Panel Satellite Antennas / USA',500,520,80,false,0],
  ['vng corporation','VNG Corporation','VNG','PRIVATE','VN','Technology','Gaming & Cloud Platform / Vietnam',4000,520,300,false,0],
]);

runWaves('T15', V, [
  ['Space & Defense (Listed)', spaceListed],
  ['Private Defense & Space AI', privateDefenseAI],
]);
