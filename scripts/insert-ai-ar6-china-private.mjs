// AI/Robotics Wave AR6 — Chinese AI + Major Private AI Companies
// Private companies use is_public=false with latest known valuation as market_cap
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'ai-ar6-v2026.1';
const g = mapRows(V);

const chinaAI = g([
  ['sensetime','SenseTime Group Inc','0020','HKSE','CN','Technology','AI Vision & Smart City / China',10000,8200,820,true,0],
  ['megvii technology','Megvii Technology Limited (Face++)','MEGVII','HKSE','CN','Technology','Computer Vision & AI / China',8000,3200,555,true,0],
  ['cambricon technologies','Cambricon Technologies Corp Ltd','688256','SHSE','CN','Technology','AI Training & Inference Chips / China',2000,8500,320,true,0],
  ['cloudwalk technology','CloudWalk Technology Co Ltd','688327','SHSE','CN','Technology','AI Face Recognition Platform / China',2000,2100,215,true,0],
  ['horizon robotics','Horizon Robotics Inc','9660','HKSE','CN','Technology','Automotive AI Chips & ADAS / China',3000,8200,720,true,0],
]);

// Major private AI companies — is_public=false, valuation as market_cap
const privateAI = g([
  ['openai','OpenAI Inc','OPENAI','PRIVATE','US','Technology','Generative AI & LLMs / USA',5000,85000,3700,false,0],
  ['anthropic','Anthropic PBC','ANTHROP','PRIVATE','US','Technology','AI Safety & Claude LLMs / USA',1500,18500,720,false,0],
  ['databricks','Databricks Inc','DATABR','PRIVATE','US','Technology','Data + AI Lakehouse Platform / USA',6000,43000,1650,false,0],
  ['scale ai','Scale AI Inc','SCALEAI','PRIVATE','US','Technology','AI Data Labeling & RLHF / USA',1500,13800,750,false,0],
  ['mistral ai','Mistral AI SAS','MISTRAL','PRIVATE','FR','Technology','Open-weight LLMs / France',500,6200,210,false,0],
  ['cohere','Cohere Inc','COHERE','PRIVATE','CA','Technology','Enterprise AI Language Models / Canada',500,2200,120,false,0],
  ['automation anywhere','Automation Anywhere Inc','AUTMAN','PRIVATE','US','Technology','Intelligent RPA Platform / USA',4000,6800,1120,false,0],
  ['cerebras systems','Cerebras Systems Inc','CEREBRAS','PRIVATE','US','Technology','Wafer-Scale AI Chips / USA',450,4200,320,false,0],
  ['groq inc','Groq Inc','GROQ','PRIVATE','US','Technology','LPU AI Inference Chips / USA',550,2800,180,false,0],
  ['figure ai','Figure AI Inc','FIGURE','PRIVATE','US','Industrials','Humanoid Robots / USA',500,2600,50,false,0],
  ['physical intelligence','Physical Intelligence (PI)','PI','PRIVATE','US','Industrials','General-purpose Robot AI / USA',100,420,10,false,0],
  ['1x technologies','1X Technologies AS','1X','PRIVATE','NO','Industrials','Humanoid Robots / Norway',200,320,10,false,0],
  ['sanctuary ai','Sanctuary AI Corp','SANCTU','PRIVATE','CA','Industrials','Humanoid Robots / Canada',300,520,15,false,0],
  ['apptronik','Apptronik Inc','APPTRON','PRIVATE','US','Industrials','Humanoid Robots / USA',150,520,10,false,0],
]);

runWaves('AI AR6', V, [
  ['Chinese AI (Listed)', chinaAI],
  ['Major Private AI Companies', privateAI],
]);
