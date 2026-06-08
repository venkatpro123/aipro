// Wave U2 — US-listed fintech, SaaS, data/AI services
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'u2-us-listed-v2026.1';
const g = mapRows(V);

const fintechListed = g([
  ['chime','Chime Financial Inc','CHYM','NASDAQ','US','Financial Technology','Consumer Neobank / USA',1600,11500,1700,true,0],
  ['circle internet','Circle Internet Group Inc','CRCL','NYSE','US','Financial Technology','Stablecoin & Digital Dollar / USA',1000,32000,1800,true,0],
  ['webull','Webull Corporation','BULL','NASDAQ','US','Financial Technology','Online Brokerage / USA',2000,5200,420,true,0],
  ['etoro','eToro Group Ltd','ETOR','NASDAQ','IL','Financial Technology','Social Trading Platform / Israel',1500,5200,900,true,0],
  ['nerdwallet','NerdWallet Inc','NRDS','NASDAQ','US','Financial Technology','Personal Finance Marketplace / USA',800,820,650,true,0],
  ['vtex','VTEX','VTEX','NYSE','BR','Technology','Enterprise Commerce Platform / Brazil',1700,1600,250,true,0],
]);

const saasListed = g([
  ['figma','Figma Inc','FIG','NYSE','US','Technology','Collaborative Design Platform / USA',1600,55000,950,true,0],
  ['rubrik','Rubrik Inc','RBRK','NYSE','US','Technology','Cyber Resilience & Data Security / USA',3500,16500,1050,true,0],
  ['onestream','OneStream Inc','OS','NASDAQ','US','Technology','Corporate Performance Management / USA',1500,6200,520,true,0],
  ['ibotta','Ibotta Inc','IBTA','NYSE','US','Technology','Digital Promotions Network / USA',900,1300,380,true,0],
  ['waystar','Waystar Holding Corp','WAY','NASDAQ','US','Healthcare','Healthcare Payments Software / USA',2300,6500,950,true,0],
  ['turo','Turo Inc','TURO','NYSE','US','Technology','Peer-to-Peer Car Sharing / USA',1000,1600,950,true,0],
  ['udemy','Udemy Inc','UDMY','NASDAQ','US','EducationTech','Online Learning Marketplace / USA',1700,1300,790,true,0],
  ['cs disco','CS Disco Inc','LAW','NYSE','US','Technology','Legal AI Software / USA',600,520,150,true,0],
  ['veritone','Veritone Inc','VERI','NASDAQ','US','Technology','Enterprise AI Platform / USA',650,210,120,true,0],
  ['innodata','Innodata Inc','INOD','NASDAQ','US','Technology','AI Data Engineering Services / USA',5000,1600,230,true,0],
  ['american software','American Software Inc','AMSWA','NASDAQ','US','Technology','Supply Chain Management Software / USA',500,520,120,true,0],
  ['conduent','Conduent Incorporated','CNDT','NASDAQ','US','Technology','Business Process Services / USA',55000,820,3300,true,0],
]);

runWaves('U2', V, [
  ['US Listed Fintech', fintechListed],
  ['US Listed SaaS & AI Services', saasListed],
]);
