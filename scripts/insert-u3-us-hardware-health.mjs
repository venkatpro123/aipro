// Wave U3 — US semis/instruments/hardware + Healthtech/Biotech AI
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'u3-us-hw-health-v2026.1';
const g = mapRows(V);

const hardwareInstruments = g([
  ['nextracker','Nextracker Inc','NXT','NASDAQ','US','Technology','Solar Tracker Systems / USA',2500,9500,3000,true,0],
  ['array technologies','Array Technologies Inc','ARRY','NASDAQ','US','Technology','Solar Tracking Systems / USA',2000,1300,950,true,0],
  ['fabrinet','Fabrinet','FN','NYSE','TH','Technology','Optical & Electronic Manufacturing / Thailand',16000,12000,3200,true,0],
  ['vicor','Vicor Corporation','VICR','NASDAQ','US','Technology','Power Modules / USA',1200,2600,420,true,0],
  ['advanced energy','Advanced Energy Industries Inc','AEIS','NASDAQ','US','Technology','Precision Power Systems / USA',10000,5200,1600,true,0],
  ['digi international','Digi International Inc','DGII','NASDAQ','US','Technology','IoT Connectivity Hardware / USA',700,1050,440,true,0],
  ['novanta','Novanta Inc','NOVT','NASDAQ','US','Technology','Photonics & Precision Motion / USA',4000,6200,950,true,0],
  ['fortive','Fortive Corporation','FTV','NYSE','US','Technology','Industrial Technology & Software / USA',18000,26000,6200,true,0],
  ['keysight','Keysight Technologies Inc','KEYS','NYSE','US','Technology','Electronic Test & Measurement / USA',15000,28000,5000,true,0],
  ['national instruments','Emerson Test & Measurement (NI)','NATI','PRIVATE','US','Technology','Automated Test Systems / USA',7000,8800,1700,false,0],
  ['azenta','Azenta Inc','AZTA','NASDAQ','US','Healthcare','Life Sciences Sample Management / USA',3000,2600,650,true,0],
  ['nordson','Nordson Corporation','NDSN','NASDAQ','US','Technology','Precision Dispensing Equipment / USA',7500,12000,2700,true,0],
]);

const healthBiotech = g([
  ['hinge health','Hinge Health Inc','HNGE','NYSE','US','Healthcare','Digital Musculoskeletal Care / USA',1500,4200,500,true,0],
  ['omada health','Omada Health Inc','OMDA','NASDAQ','US','Healthcare','Virtual Chronic Care / USA',900,1050,200,true,0],
  ['agilon health','agilon health Inc','AGL','NYSE','US','Healthcare','Value-Based Primary Care / USA',2000,1300,6200,true,0],
  ['guardant health','Guardant Health Inc','GH','NASDAQ','US','Healthcare','Liquid Biopsy Cancer Tests / USA',3000,5200,820,true,0],
  ['natera','Natera Inc','NTRA','NASDAQ','US','Healthcare','Genetic Testing / USA',4000,22000,1900,true,0],
  ['twist bioscience','Twist Bioscience Corporation','TWST','NASDAQ','US','Healthcare','Synthetic DNA Manufacturing / USA',1200,2100,350,true,0],
  ['10x genomics','10x Genomics Inc','TXG','NASDAQ','US','Healthcare','Single-Cell Genomics / USA',1300,1600,620,true,0],
  ['pacific biosciences','Pacific Biosciences of California','PACB','NASDAQ','US','Healthcare','DNA Sequencing Systems / USA',900,520,170,true,0],
  ['relay therapeutics','Relay Therapeutics Inc','RLAY','NASDAQ','US','Healthcare','AI Drug Discovery / USA',400,520,55,true,0],
  ['abcellera','AbCellera Biologics Inc','ABCL','NASDAQ','CA','Healthcare','AI Antibody Discovery / Canada',700,820,30,true,0],
  ['butterfly network','Butterfly Network Inc','BFLY','NYSE','US','Healthcare','Handheld AI Ultrasound / USA',500,820,90,true,0],
]);

runWaves('U3', V, [
  ['US Hardware & Instruments', hardwareInstruments],
  ['Healthtech & Biotech AI', healthBiotech],
]);
