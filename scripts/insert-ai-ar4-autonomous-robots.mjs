// AI/Robotics Wave AR4 — Autonomous Vehicles + Industrial Robotics (Japan/EU)
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'ai-ar4-v2026.1';
const g = mapRows(V);

const autonomousVehicles = g([
  ['luminar technologies','Luminar Technologies Inc','LAZR','NASDAQ','US','Technology','LiDAR for Autonomous Vehicles / USA',1500,1900,120,true,0],
  ['innoviz technologies','Innoviz Technologies Ltd','INVZ','NASDAQ','IL','Technology','Solid-State LiDAR / Israel',350,420,55,true,0],
  ['ouster lidar','Ouster Inc (LiDAR)','OUST','NYSE','US','Technology','Digital LiDAR Sensors / USA',500,520,95,true,0],
  ['aurora innovation','Aurora Innovation Inc','AUR','NASDAQ','US','Technology','Autonomous Trucking Platform / USA',2000,2600,55,true,0],
  ['pony ai','Pony.ai Inc','PONY','NASDAQ','CN','Technology','Autonomous Driving Robotaxi / China',3000,3200,150,true,0],
  ['weride','WeRide Inc','WRD','NASDAQ','CN','Technology','Autonomous Driving Technology / China',2500,1600,65,true,0],
]);

const industrialRoboticsJP = g([
  ['yaskawa electric','Yaskawa Electric Corporation','6506','TYO','JP','Industrials','Industrial Robots & Motion Control / Japan',18000,10500,5600,true,0],
  ['daifuku','Daifuku Co Ltd','6383','TYO','JP','Industrials','Material Handling & Automation / Japan',15000,6200,5100,true,0],
  ['nachi robotics','Nachi-Fujikoshi Corp','6474','TYO','JP','Industrials','Robots & Machine Tools / Japan',10000,2100,2500,true,0],
]);

const industrialRoboticsEU = g([
  ['kuka robotics','KUKA AG','KU2','XETRA','DE','Industrials','Industrial Robots & Automation / Germany',14000,2100,3600,true,0],
  ['schindler group','Schindler Group','SCHP','SIX','CH','Industrials','Elevators & Escalators / Switzerland',75000,20500,12000,true,0],
  ['sick ag','SICK AG','SIK','XETRA','DE','Industrials','Industrial Sensors & Safety / Germany',12000,6200,2600,true,0],
  ['symbotic','Symbotic Inc','SYM','NASDAQ','US','Industrials','AI Warehouse Automation / USA',3000,26000,2100,true,0],
  ['teradyne','Teradyne Inc','TER','NASDAQ','US','Industrials','Automated Test Equipment & Robots / USA',6500,18500,3600,true,0],
]);

runWaves('AI AR4', V, [
  ['Autonomous Vehicles', autonomousVehicles],
  ['Industrial Robotics Japan', industrialRoboticsJP],
  ['Industrial Robotics EU & US', industrialRoboticsEU],
]);
