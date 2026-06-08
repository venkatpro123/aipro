// AI/Robotics Wave AR1 — Pure-play AI listed companies (US)
// Real 2026 data: market_cap in USD millions, revenue TTM in USD millions
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'ai-ar1-v2026.1';
const g = mapRows(V);

const pureplayAI = g([
  // [canonical, display, ticker, exchange, country, sector, industry, wf, mc_M, rev_M, is_public, layoffs]
  ['palantir technologies','Palantir Technologies Inc','PLTR','NYSE','US','Technology','AI Data Analytics & Intelligence / USA',4200,225000,3750,true,0],
  ['c3 ai','C3.ai Inc','AI','NYSE','US','Technology','Enterprise AI Applications / USA',900,3200,380,true,0],
  ['uipath','UiPath Inc','PATH','NYSE','US','Technology','Robotic Process Automation / USA',5000,10500,1650,true,0],
  ['soundhound ai','SoundHound AI Inc','SOUN','NASDAQ','US','Technology','Conversational AI & Voice / USA',750,5200,100,true,0],
  ['bigbear ai','BigBear.ai Holdings Inc','BBAI','NYSE','US','Technology','AI Decision Intelligence / USA',1200,820,180,true,0],
  ['recursion pharmaceuticals','Recursion Pharmaceuticals Inc','RXRX','NASDAQ','US','Technology','AI Drug Discovery / USA',1000,2100,350,true,0],
  ['sentinelone','SentinelOne Inc','S','NYSE','US','Technology','AI-Native Cybersecurity / USA',4100,20500,900,true,0],
  ['appian corp','Appian Corporation','APPN','NASDAQ','US','Technology','Low-Code AI Automation / USA',2500,3200,550,true,0],
  ['pegasystems','Pegasystems Inc','PEGA','NASDAQ','US','Technology','AI-Powered CRM & BPM / USA',6000,8200,1400,true,0],
  ['qualys','Qualys Inc','QLYS','NASDAQ','US','Technology','Cloud Security AI / USA',1500,5200,520,true,0],
  ['samsara','Samsara Inc','IOT','NYSE','US','Technology','AI-Connected Operations Platform / USA',4200,20500,1350,true,0],
  ['tempus ai','Tempus AI Inc','TEM','NASDAQ','US','Technology','AI Precision Medicine / USA',3000,6200,720,true,0],
]);

runWaves('AI AR1', V, [['Pure-play AI (US Listed)', pureplayAI]]);
