// AI/Robotics Wave AR5 — Computer Vision + Healthcare AI + Warehouse Robotics
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'ai-ar5-v2026.1';
const g = mapRows(V);

const computerVision = g([
  ['cognex corporation','Cognex Corporation','CGNX','NASDAQ','US','Technology','Machine Vision Systems / USA',3600,12500,1320,true,0],
  ['basler ag','Basler AG','BSL','XETRA','DE','Technology','Industrial Cameras & Vision / Germany',1500,1050,320,true,0],
  ['hikvision','Hangzhou Hikvision Digital Technology Co','002415','SZSE','CN','Technology','AI Security Cameras / China',52000,36000,14200,true,0],
  ['dahua technology','Zhejiang Dahua Technology Co Ltd','002236','SZSE','CN','Technology','AI Video Surveillance / China',32000,10500,5200,true,0],
  ['varex imaging','Varex Imaging Corporation','VREX','NASDAQ','US','Healthcare','Medical & Industrial Imaging / USA',1800,520,850,true,0],
  ['ametek','AMETEK Inc','AME','NYSE','US','Industrials','Electronic Instruments & AI Sensors / USA',25000,46000,6500,true,0],
  ['evolv technology','Evolv Technology Holdings Inc','EVLV','NASDAQ','US','Technology','AI Security Screening / USA',500,620,80,true,0],
]);

const healthcareAI = g([
  ['schrodinger','Schrodinger Inc','SDGR','NASDAQ','US','Healthcare','AI Computational Drug Discovery / USA',1200,3200,350,true,0],
  ['veracyte','Veracyte Inc','VCYT','NASDAQ','US','Healthcare','AI Genomic Diagnostics / USA',1200,3600,510,true,0],
  ['exscientia','Exscientia plc','EXAI','NASDAQ','GB','Healthcare','AI-first Drug Design / UK',650,820,155,true,0],
  ['accuray','Accuray Incorporated','ARAY','NASDAQ','US','Healthcare','Robotic Radiosurgery Systems / USA',700,210,210,true,0],
  ['stereotaxis','Stereotaxis Inc','STXS','NYSE','US','Healthcare','Robotic Vascular Navigation / USA',260,210,52,true,0],
]);

const warehouseRobotics = g([
  ['autostore','AutoStore Holdings Ltd','AUTO','OSLO','NO','Industrials','Grid Robotics Warehouse Automation / Norway',2000,5200,820,true,0],
  ['jungheinrich','Jungheinrich AG','JUN3','XETRA','DE','Industrials','Forklift & Warehouse Automation / Germany',20000,4200,5200,true,0],
  ['kardex group','Kardex Group','KDEX','SIX','CH','Industrials','Automated Storage & Retrieval / Switzerland',3000,3200,820,true,0],
]);

runWaves('AI AR5', V, [
  ['Computer Vision & Imaging', computerVision],
  ['Healthcare AI & Robotics', healthcareAI],
  ['Warehouse Automation', warehouseRobotics],
]);
