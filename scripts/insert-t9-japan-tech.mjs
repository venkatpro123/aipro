// Tech Wave T9 — Japan Internet, Software & Semiconductor Equipment
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 't9-japan-tech-v2026.1';
const g = mapRows(V);

const japanInternet = g([
  ['mercari','Mercari Inc','4385','TYO','JP','Technology','C2C Marketplace / Japan',2000,3200,1200,true,0],
  ['cyberagent','CyberAgent Inc','4751','TYO','JP','Technology','Internet Media & Gaming / Japan',6000,5200,5000,true,0],
  ['z holdings','LY Corporation (Yahoo Japan/LINE)','4689','TYO','JP','Technology','Internet Services Platform / Japan',28000,26000,12000,true,0],
  ['konami group','Konami Group Corporation','9766','TYO','JP','Technology','Gaming & Entertainment / Japan',10000,18500,3600,true,0],
  ['sega sammy','Sega Sammy Holdings Inc','6460','TYO','JP','Technology','Gaming & Amusement / Japan',8000,5200,3600,true,0],
  ['obic co','OBIC Co Ltd','4684','TYO','JP','Technology','Enterprise ERP Software / Japan',2000,18500,720,true,0],
  ['trend micro','Trend Micro Incorporated','4704','TYO','JP','Technology','Cybersecurity Software / Japan',7500,8200,2100,true,0],
  ['sansan','Sansan Inc','4443','TYO','JP','Technology','Business Card & CRM SaaS / Japan',1500,2100,320,true,0],
  ['money forward','Money Forward Inc','3994','TYO','JP','Financial Technology','Personal Finance & SaaS / Japan',2000,2100,320,true,0],
]);

const japanSemiEquip = g([
  ['rohm semiconductor','ROHM Co Ltd','6963','TYO','JP','Technology','Power & Analog Semiconductors / Japan',24000,5200,3200,true,0],
  ['lasertec','Lasertec Corporation','6920','TYO','JP','Technology','EUV Mask Inspection / Japan',1200,18500,1600,true,0],
  ['disco corporation','DISCO Corporation','6146','TYO','JP','Technology','Semiconductor Dicing & Grinding / Japan',6000,42000,2800,true,0],
  ['advantest','Advantest Corporation','6857','TYO','JP','Technology','Semiconductor Test Systems / Japan',7000,62000,5500,true,0],
  ['screen holdings','SCREEN Holdings Co Ltd','7735','TYO','JP','Technology','Semiconductor Cleaning Equipment / Japan',6000,18500,4500,true,0],
  ['hoya corporation','HOYA Corporation','7741','TYO','JP','Technology','Optics & EUV Mask Blanks / Japan',38000,52000,5200,true,0],
  ['ibiden','Ibiden Co Ltd','4062','TYO','JP','Technology','IC Substrates / Japan',13000,8200,2600,true,0],
  ['shinko electric','Shinko Electric Industries Co Ltd','6967','TYO','JP','Technology','IC Packaging Substrates / Japan',6000,8200,1300,true,0],
  ['taiyo yuden','Taiyo Yuden Co Ltd','6976','TYO','JP','Technology','Multilayer Ceramic Capacitors / Japan',23000,4200,2300,true,0],
  ['horiba','HORIBA Ltd','6856','TYO','JP','Technology','Analytical & Measurement Instruments / Japan',8500,5200,2100,true,0],
]);

runWaves('T9', V, [
  ['Japan Internet & Software', japanInternet],
  ['Japan Semiconductor & Equipment', japanSemiEquip],
]);
