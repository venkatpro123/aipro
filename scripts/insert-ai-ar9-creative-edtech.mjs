// AI Wave AR9 — Generative AI + Creative + EdTech AI
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'ai-ar9-v2026.1';
const g = mapRows(V);

const creativeAI = g([
  ['adobe systems','Adobe Inc','ADBE','NASDAQ','US','Technology','AI Creative Cloud & GenAI / USA',30000,182000,21500,true,0],
  ['autodesk','Autodesk Inc','ADSK','NASDAQ','US','Technology','AI-Powered Design & Engineering / USA',15000,62000,6600,true,0],
]);

const privateCreative = g([
  ['canva','Canva Pty Ltd','CANVA','PRIVATE','AU','Technology','AI Visual Design Platform / Australia',5000,26000,2350,false,0],
  ['synthesia','Synthesia Ltd','SYNTH','PRIVATE','GB','Technology','AI Video Generation / UK',500,1100,52,false,0],
  ['eleven labs','ElevenLabs Inc','ELEVLABS','PRIVATE','US','Technology','AI Voice Cloning & TTS / USA',280,1100,55,false,0],
  ['runway ai','Runway AI Inc','RUNWAY','PRIVATE','US','Technology','AI Video Generation Platform / USA',200,1600,35,false,0],
  ['jasper ai','Jasper AI Inc','JASPER','PRIVATE','US','Technology','AI Content Marketing / USA',400,1600,72,false,0],
  ['midjourney','Midjourney Inc','MIDJRNY','PRIVATE','US','Technology','AI Image Generation / USA',100,10000,250,false,0],
  ['cursor ai','Anysphere Inc (Cursor)','CURSOR','PRIVATE','US','Technology','AI Code Editor / USA',200,2600,100,false,0],
  ['replit','Replit Inc','REPLIT','PRIVATE','US','Technology','AI-Powered Cloud IDE / USA',400,1200,55,false,0],
]);

const edTechAI = g([
  ['duolingo','Duolingo Inc','DUOL','NASDAQ','US','EducationTech','AI Language Learning Platform / USA',3000,12500,720,true,0],
  ['coursera','Coursera Inc','COUR','NYSE','US','EducationTech','AI Online Learning Platform / USA',2000,1600,655,true,0],
  ['powerschool','PowerSchool Holdings Inc','PWSC','NYSE','US','EducationTech','AI K-12 Education Software / USA',4000,5500,620,true,0],
]);

runWaves('AI AR9', V, [
  ['Creative AI (Listed)', creativeAI],
  ['Private Generative AI', privateCreative],
  ['EdTech AI', edTechAI],
]);
