// IT/Software Wave IS5 — Networking & Communications Technology
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'is5-networking-v2026.1';
const g = mapRows(V);

const networking = g([
  ['cisco systems','Cisco Systems Inc','CSCO','NASDAQ','US','Technology','Networking Hardware & Software / USA',90000,235000,54000,true,0],
  ['ciena','Ciena Corporation','CIEN','NYSE','US','Technology','Optical Networking Systems / USA',8500,9500,4200,true,0],
  ['f5 networks','F5 Inc','FFIV','NASDAQ','US','Technology','Application Delivery & Security / USA',6500,16500,2900,true,0],
  ['nokia','Nokia Corporation','NOK','NYSE','FI','Technology','Telecom Network Equipment / Finland',86000,26000,22000,true,0],
  ['ericsson','Telefonaktiebolaget LM Ericsson','ERIC','NASDAQ','SE','Technology','5G Network Infrastructure / Sweden',95000,26000,24500,true,0],
  ['extreme networks','Extreme Networks Inc','EXTR','NASDAQ','US','Technology','Cloud Networking / USA',2800,1900,1100,true,0],
  ['calix','Calix Inc','CALX','NYSE','US','Technology','Broadband Access Platforms / USA',1200,3200,820,true,0],
  ['lumentum','Lumentum Holdings Inc','LITE','NASDAQ','US','Technology','Optical & Photonic Components / USA',5000,8200,1600,true,0],
]);

const gaming = g([
  ['take two interactive','Take-Two Interactive Software Inc','TTWO','NASDAQ','US','Technology','Video Game Publishing / USA',12000,42000,5600,true,0],
  ['roblox','Roblox Corporation','RBLX','NYSE','US','Technology','Gaming & Metaverse Platform / USA',2500,82000,3600,true,0],
  ['unity software','Unity Software Inc','U','NYSE','US','Technology','Game Engine & RT 3D / USA',6000,12000,1800,true,0],
  ['playtika','Playtika Holding Corp','PLTK','NASDAQ','IL','Technology','Mobile Gaming / Israel',7000,1900,2500,true,0],
  ['nexon','Nexon Co Ltd','3659','TYO','JP','Technology','Online Game Development / Japan',7000,16500,3200,true,0],
  ['nintendo','Nintendo Co Ltd','7974','TYO','JP','Technology','Video Game Consoles & Software / Japan',7500,72000,12000,true,0],
  ['capcom','Capcom Co Ltd','9697','TYO','JP','Technology','Video Game Development / Japan',3500,8200,1100,true,0],
  ['square enix','Square Enix Holdings Co Ltd','9684','TYO','JP','Technology','Video Game Publishing / Japan',5000,5200,2500,true,0],
  ['netmarble','Netmarble Corporation','251270','KRX','KR','Technology','Mobile Gaming / Korea',4000,3600,2100,true,0],
]);

runWaves('IS5', V, [
  ['Networking & Communications', networking],
  ['Gaming & Interactive', gaming],
]);
