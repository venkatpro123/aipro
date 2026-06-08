// Tech Wave T18 — Global Tech top-up (UK/EU/Asia internet & software)
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 't18-global-topup-v2026.1';
const g = mapRows(V);

const ukEuTech = g([
  ['wise','Wise plc','WISE','LSE','GB','Financial Technology','Cross-Border Money Transfer / UK',6000,14000,1700,true,0],
  ['auto trader','Auto Trader Group plc','AUTO','LSE','GB','Technology','Automotive Marketplace / UK',1100,9500,780,true,0],
  ['rightmove','Rightmove plc','RMV','LSE','GB','Technology','Property Portal / UK',700,7200,520,true,0],
  ['trustpilot','Trustpilot Group plc','TRST','LSE','GB','Technology','Online Reviews Platform / UK',1000,2100,250,true,0],
  ['gb group','GB Group plc','GBG','LSE','GB','Technology','Identity Verification SaaS / UK',1200,1050,360,true,0],
  ['allfunds','Allfunds Group plc','ALLFG','AMS','ES','Financial Technology','Fund Distribution Platform / Spain',1200,4200,650,true,0],
  ['nagarro','Nagarro SE','NA9','XETRA','DE','Technology','Digital Engineering Services / Germany',19000,1600,1100,true,0],
  ['cancom','CANCOM SE','COK','XETRA','DE','Technology','IT Solutions & Cloud / Germany',5500,1050,1800,true,0],
  ['atoss software','ATOSS Software SE','AOF','XETRA','DE','Technology','Workforce Management SaaS / Germany',800,2100,180,true,0],
  ['cint group','Cint Group AB','CINT','OMX','SE','Technology','Market Research Tech Platform / Sweden',1000,320,250,true,0],
  ['knowit','Knowit AB','KNOW','OMX','SE','Technology','Digital Consulting / Sweden',4000,520,820,true,0],
]);

const asiaTech = g([
  ['tdcx','TDCX Inc','TDCX','NYSE','SG','Technology','Digital Customer Experience BPO / Singapore',18000,1300,520,true,0],
  ['gigacloud technology','GigaCloud Technology Inc','GCT','NASDAQ','SG','Technology','B2B E-Commerce Logistics / Singapore',1000,820,1200,true,0],
  ['webtoon','Webtoon Entertainment Inc','WBTN','NASDAQ','KR','Technology','Digital Comics Platform / Korea',1000,1600,1300,true,0],
  ['gravity co','Gravity Co Ltd','GRVY','NASDAQ','KR','Technology','Online Gaming (Ragnarok) / Korea',500,520,420,true,0],
]);

const privateCanada = g([
  ['nuvei','Nuvei Corporation','NVEI','PRIVATE','CA','Financial Technology','Global Payments Technology / Canada',2000,6300,1300,false,0],
  ['nextgen healthcare','NextGen Healthcare Inc','NXGN','PRIVATE','US','Healthcare','Ambulatory EHR Software / USA',3000,1800,720,false,0],
]);

runWaves('T18', V, [
  ['UK & EU Tech', ukEuTech],
  ['Asia Tech (top-up)', asiaTech],
  ['Private (Canada/US)', privateCanada],
]);
