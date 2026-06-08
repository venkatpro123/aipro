// AI Wave AR12 — Private Warehouse Robotics + AI Developer Tools + Private GenAI
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'ai-ar12-v2026.1';
const g = mapRows(V);

const warehouseRobotics = g([
  ['geek plus robotics','Geek+ Inc (Warehouse Robotics)','GEEKPLUS','PRIVATE','CN','Industrials','AMR Warehouse Automation / China',2000,2100,210,false,0],
  ['hai robotics','HAI Robotics Co Ltd','HAIBOT','PRIVATE','CN','Industrials','ASRS Warehouse Robots / China',1000,1600,105,false,0],
  ['mujin robotics','Mujin Inc','MUJIN','PRIVATE','JP','Industrials','Industrial Robot Programming AI / Japan',500,520,82,false,0],
  ['locus robotics','Locus Robotics Corp','LOCUS','PRIVATE','US','Industrials','AMR Fulfillment Robotics / USA',400,520,55,false,0],
  ['righthand robotics','RightHand Robotics Inc','RHROB','PRIVATE','US','Industrials','AI-Powered Pick & Place Robots / USA',200,320,30,false,0],
]);

const aiDeveloper = g([
  ['harvey ai','Harvey AI Inc','HARVEY','PRIVATE','US','Technology','AI Legal Research & Drafting / USA',200,3000,52,false,0],
  ['codeium','Codeium Inc (Windsurf)','CODEIUM','PRIVATE','US','Technology','AI Code Completion Platform / USA',300,1300,80,false,0],
  ['tabnine','Tabnine Ltd','TABNINE','PRIVATE','IL','Technology','AI Code Completion / Israel',200,420,35,false,0],
  ['vercel','Vercel Inc','VERCEL','PRIVATE','US','Technology','AI Frontend Deployment Platform / USA',500,3200,150,false,0],
  ['ai21 labs','AI21 Labs Ltd','AI21','PRIVATE','IL','Technology','Enterprise LLMs & Wordtune AI / Israel',350,1400,80,false,0],
]);

const privateAI2 = g([
  ['lightricks','Lightricks Ltd','LIGHTR','PRIVATE','IL','Technology','AI Creative Apps (Facetune/Photoleap) / Israel',600,1800,175,false,0],
  ['pika labs','Pika Labs Inc','PIKA','PRIVATE','US','Technology','AI Video Generation / USA',60,620,18,false,0],
  ['descript ai','Descript Inc','DESCRIPT','PRIVATE','US','Technology','AI Podcast & Video Editing / USA',150,520,30,false,0],
  ['murf ai','Murf AI Pvt Ltd','MURF','PRIVATE','IN','Technology','AI Voice Generation Platform / India',200,520,22,false,0],
]);

runWaves('AI AR12', V, [
  ['Private Warehouse Robotics', warehouseRobotics],
  ['AI Developer Tools', aiDeveloper],
  ['Private Generative AI', privateAI2],
]);
