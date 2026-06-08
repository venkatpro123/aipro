// AI Wave AR10 — Healthcare AI + Surgical Robotics + Industrial AI + Energy AI
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'ai-ar10-v2026.1';
const g = mapRows(V);

const healthcareAI = g([
  ['iqvia','IQVIA Holdings Inc','IQV','NYSE','US','Healthcare','AI Clinical & Commercial Solutions / USA',87000,38000,15500,true,0],
  ['doximity','Doximity Inc','DOCS','NYSE','US','Technology','AI Physician Network & Workflow / USA',700,8500,520,true,0],
  ['health catalyst','Health Catalyst Inc','HCAT','NASDAQ','US','Healthcare','AI Healthcare Data & Analytics / USA',900,520,320,true,0],
  ['absci corp','Absci Corporation','ABSI','NASDAQ','US','Healthcare','AI Protein Design / USA',200,520,30,true,0],
  ['procept biorobotics','PROCEPT BioRobotics Corporation','PRCT','NASDAQ','US','Healthcare','Robotic Prostate Surgery / USA',500,3200,330,true,0],
  ['smith and nephew','Smith & Nephew plc','SNN','NYSE','GB','Healthcare','Robotic Orthopaedic Surgery / UK',18000,12000,5800,true,0],
  ['alphatec holdings','Alphatec Holdings Inc','ATEC','NASDAQ','US','Healthcare','AI-Enabled Spine Surgery / USA',1200,1800,220,true,0],
]);

const industrialAI = g([
  ['honeywell process','Honeywell International Inc','HON','NASDAQ','US','Industrials','AI Industrial Automation & IoT / USA',96000,136000,37000,true,0],
  ['john deere','Deere & Company','DE','NYSE','US','Industrials','AI Precision Agriculture / USA',82000,92000,47000,true,0],
  ['itron','Itron Inc','ITRI','NASDAQ','US','Technology','AI Smart Grid & Utilities / USA',8000,5200,2550,true,0],
  ['grid dynamics','Grid Dynamics Holdings Inc','GDYN','NASDAQ','US','Technology','AI Engineering & Digital Transformation / USA',4000,1050,350,true,0],
]);

const energyAI = g([
  ['stem inc','Stem Inc','STEM','NYSE','US','Utilities','AI-Driven Energy Storage / USA',500,520,135,true,0],
  ['planet labs','Planet Labs PBC','PL','NYSE','US','Technology','AI Satellite Earth Observation / USA',1000,1600,255,true,0],
  ['spire global','Spire Global Inc','SPIR','NYSE','US','Technology','AI Space & Weather Analytics / USA',400,520,125,true,0],
  ['onsemi','onsemi (ON Semiconductor)','ON','NASDAQ','US','Technology','Power & Signal Management AI Chips / USA',28000,26000,7700,true,0],
]);

runWaves('AI AR10', V, [
  ['Healthcare AI & Robotics', healthcareAI],
  ['Industrial AI', industrialAI],
  ['Energy & Climate AI', energyAI],
]);
