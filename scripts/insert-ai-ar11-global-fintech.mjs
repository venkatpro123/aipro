// AI Wave AR11 — AI AdTech/MarTech + Global AI (Korea/EU/Israel) + Aviation AI
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'ai-ar11-v2026.1';
const g = mapRows(V);

const adtechAI = g([
  ['the trade desk','The Trade Desk Inc','TTD','NASDAQ','US','Technology','AI Programmatic Advertising / USA',4000,40000,2750,true,0],
  ['double verify','DoubleVerify Holdings Inc','DV','NYSE','US','Technology','AI Digital Ad Verification / USA',2500,3200,655,true,0],
  ['magnite','Magnite Inc','MGNI','NASDAQ','US','Technology','AI-Powered CTV Advertising / USA',1000,820,600,true,0],
  ['pagaya technologies','Pagaya Technologies Ltd','PGY','NASDAQ','IL','Financial Technology','AI Credit & Lending Analytics / Israel',900,420,1200,true,0],
  ['perion network','Perion Network Ltd','PERI','NASDAQ','IL','Technology','AI Digital Advertising / Israel',500,820,720,true,0],
  ['innovid','Innovid Corp','CTV','NYSE','IL','Technology','AI Connected TV Measurement / Israel',600,320,155,true,0],
]);

const globalAI = g([
  ['wix','Wix.com Ltd','WIX','NASDAQ','IL','Technology','AI Website Builder Platform / Israel',5500,7200,1920,true,0],
  ['adyen','Adyen NV','ADYEN','AMS','NL','Financial Technology','AI Payments & Fraud Prevention / Netherlands',3500,46000,2550,true,0],
  ['naver','Naver Corporation (HyperCLOVA X AI)','035420','KRX','KR','Technology','AI Search & Commerce Platform / Korea',4800,26000,8200,true,0],
  ['krafton','KRAFTON Inc','259960','KRX','KR','Technology','AI Gaming & Metaverse / Korea',3500,8200,1850,true,0],
  ['pearl abyss','Pearl Abyss Corp','263750','KRX','KR','Technology','AI Gaming & Black Desert / Korea',1200,1600,510,true,0],
  ['kuaishou technology','Kuaishou Technology (Kling AI)','1024','HKSE','CN','Technology','AI Video Generation & Short Video / China',28000,18500,4500,true,0],
]);

const aviationRobotics = g([
  ['archer aviation','Archer Aviation Inc','ACHR','NYSE','US','Industrials','Electric Air Taxi eVTOL / USA',1200,3200,58,true,0],
  ['asensus surgical','Asensus Surgical Inc','ASXC','NYSE','US','Healthcare','AI-Enhanced Laparoscopic Surgery / USA',200,90,4,true,0],
  ['vicarious surgical','Vicarious Surgical Inc','RBOT','NYSE','US','Healthcare','AI Robotic Surgery Platform / USA',180,520,12,true,0],
]);

runWaves('AI AR11', V, [
  ['AI AdTech & MarTech', adtechAI],
  ['Global AI (Korea, EU, CN, IL)', globalAI],
  ['Aviation & Surgical AI', aviationRobotics],
]);
