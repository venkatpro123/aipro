// Tech Wave T17 — US Semis (top-up) + India IT/Electronics (top-up)
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 't17-semis-india-v2026.1';
const g = mapRows(V);

const semis = g([
  ['macom technology','MACOM Technology Solutions Holdings','MTSI','NASDAQ','US','Technology','RF & Photonic Semiconductors / USA',1500,9500,1050,true,0],
  ['pdf solutions','PDF Solutions Inc','PDFS','NASDAQ','US','Technology','Semiconductor Yield Analytics / USA',900,1100,180,true,0],
  ['penguin solutions','Penguin Solutions Inc','PENG','NASDAQ','US','Technology','AI Memory & Computing Systems / USA',1500,1300,1700,true,0],
  ['axt inc','AXT Inc','AXTI','NASDAQ','US','Technology','Compound Semiconductor Substrates / USA',1000,210,100,true,0],
  ['nve corporation','NVE Corporation','NVEC','NASDAQ','US','Technology','Spintronics Sensors / USA',60,420,30,true,0],
]);

const indiaIT = g([
  ['mastek','Mastek Limited','MASTEK','NSE','IN','Technology','Digital Engineering Services / India',6000,1100,420,true,0],
  ['cigniti technologies','Cigniti Technologies Limited','CIGNITITEC','NSE','IN','Technology','Software Quality Engineering / India',4000,520,210,true,0],
  ['latent view','LatentView Analytics Limited','LATENTVIEW','NSE','IN','Technology','Data Analytics & AI Services / India',1500,1300,100,true,0],
  ['63 moons','63 Moons Technologies Limited','63MOONS','NSE','IN','Technology','Financial Tech Platforms / India',1500,820,120,true,0],
  ['nelco','Nelco Limited','NELCO','NSE','IN','Communications','Satellite Communications / India',800,520,120,true,0],
  ['tac infosec','TAC Infosec Limited','TAC','NSE','IN','Technology','Cybersecurity Risk Quantification / India',200,320,15,true,0],
]);

const indiaElectronics = g([
  ['blackbox limited','Black Box Limited','BBOX','NSE','IN','Technology','IT Infrastructure Solutions / India',3500,1050,650,true,0],
  ['dlink india','D-Link (India) Limited','DLINKINDIA','NSE','IN','Technology','Networking Hardware Distribution / India',500,520,250,true,0],
  ['smartlink','Smartlink Holdings Limited','SMARTLINK','NSE','IN','Technology','Networking & Structured Cabling / India',300,120,30,true,0],
  ['vintron informatics','Vintron Informatics Limited','VINTRON','NSE','IN','Technology','Electronics & Defence Systems / India',300,52,20,true,0],
]);

runWaves('T17', V, [
  ['US Semiconductors (top-up)', semis],
  ['India IT Services', indiaIT],
  ['India Electronics', indiaElectronics],
]);
