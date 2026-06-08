// GIANTS Wave 8 — Japan 2nd-tier + Korea additional large-caps. All real listed, >= $3B.
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 'glob-gw8-v2026.1';
const g = mapRows(V);

const japan2 = g([
  ['yamaha motor','Yamaha Motor Co Ltd','7272','TYO','JP','Consumer Discretionary','Motorcycles & Marine / Japan',54000,16000,17000],
  ['isuzu motors','Isuzu Motors Limited','7202','TYO','JP','Consumer Discretionary','Commercial Vehicles / Japan',27000,15000,22000],
  ['toray industries','Toray Industries Inc','3402','TYO','JP','Materials','Advanced Materials / Japan',50000,15000,23000],
  ['teijin materials','Teijin Limited','3401','TYO','JP','Materials','Fibers & Composites / Japan',20000,7000,9000],
  ['kuraray chemicals','Kuraray Co Ltd','3405','TYO','JP','Materials','Specialty Chemicals / Japan',12000,7000,4000],
  ['sumitomo chemical','Sumitomo Chemical Co Ltd','4005','TYO','JP','Materials','Chemicals & Pharma / Japan',33000,8000,23000],
  ['nippon steel','Nippon Steel Corporation','5401','TYO','JP','Materials','Steel Manufacturing / Japan',110000,20000,65000],
  ['jfe holdings','JFE Holdings Inc','5411','TYO','JP','Materials','Steel Manufacturing / Japan',65000,12000,40000],
  ['kobe steel','Kobe Steel Ltd','5406','TYO','JP','Materials','Steel & Aluminum / Japan',35000,6000,22000],
  ['taiheiyo cement','Taiheiyo Cement Corporation','5233','TYO','JP','Materials','Cement / Japan',18000,7000,6000],
  ['secom security','Secom Co Ltd','9735','TYO','JP','Industrials','Security Services / Japan',65000,15000,10000],
  ['daiwa securities','Daiwa Securities Group Inc','8601','TYO','JP','Financials','Brokerage & Investment Banking / Japan',15000,15000,12000],
  ['rohm electronics','ROHM Co Ltd','6963','TYO','JP','Technology','Semiconductors / Japan',22000,6000,4000],
  ['alps alpine','Alps Alpine Co Ltd','6770','TYO','JP','Technology','Electronic Components / Japan',44000,6000,7000],
  ['minebea mitsumi','MinebeaMitsumi Inc','6479','TYO','JP','Technology','Precision Bearings & Electronics / Japan',90000,9000,11000],
  ['nsk bearings','NSK Ltd','6471','TYO','JP','Industrials','Bearings & Steering / Japan',32000,7000,8000],
  ['hitachi construction mach','Hitachi Construction Machinery Co Ltd','6305','TYO','JP','Industrials','Construction Equipment / Japan',25000,12000,10000],
  ['sumitomo electric','Sumitomo Electric Industries Ltd','5802','TYO','JP','Industrials','Wiring & Electronics / Japan',300000,15000,38000],
  ['furukawa electric','Furukawa Electric Co Ltd','5801','TYO','JP','Industrials','Cables & Electronic Materials / Japan',53000,5000,11000],
  ['aeon retail','AEON Co Ltd','8267','TYO','JP','Consumer Staples','General Retail / Japan',570000,15000,95000],
]);

const korea2 = g([
  ['hyundai steel','Hyundai Steel Co','004020','KRX','KR','Materials','Steel Manufacturing / Korea',13000,7000,20000],
  ['korea zinc','Korea Zinc Co Ltd','010130','KRX','KR','Materials','Zinc & Precious Metals Smelting / Korea',4000,15000,5000],
  ['lotte chemical','Lotte Chemical Corporation','011170','KRX','KR','Materials','Petrochemicals / Korea',5500,5000,13000],
  ['sk chemicals','SK Chemicals Co Ltd','285130','KRX','KR','Materials','Green Chemicals & Pharma / Korea',3000,5000,2000],
  ['hanwha solutions','Hanwha Solutions Corporation','009830','KRX','KR','Materials','Chemicals & Solar / Korea',10000,8000,7000],
  ['hanwha aerospace','Hanwha Aerospace Co Ltd','012450','KRX','KR','Industrials','Defense & Aerospace / Korea',16000,20000,5000],
  ['krafton games','KRAFTON Inc','259960','KRX','KR','Technology','Video Games / Korea',5000,25000,1500],
  ['ncsoft gaming','NCSoft Corporation','036570','KRX','KR','Technology','Online Gaming / Korea',4500,5000,1000],
  ['netmarble games','Netmarble Corporation','251270','KRX','KR','Technology','Mobile Gaming / Korea',8000,5000,2000],
  ['mirae asset','Mirae Asset Financial Group','37620','KRX','KR','Financials','Asset Management & Securities / Korea',5000,10000,5000],
  ['db insurance','DB Insurance Co Ltd','005830','KRX','KR','Financials','Non-Life Insurance / Korea',5000,12000,10000],
  ['samsung fire marine','Samsung Fire & Marine Insurance Co','000810','KRX','KR','Financials','Property Casualty Insurance / Korea',6000,20000,14000],
  ['s-oil refinery','S-Oil Corporation','010950','KRX','KR','Energy','Oil Refining / Korea',4000,5000,20000],
  ['gs caltex','GS Holdings Corporation','078930','KRX','KR','Energy','Energy & Retail Conglomerate / Korea',5500,5000,30000],
  ['kcb financial','KB Insurance Co Ltd','002550','KRX','KR','Financials','Insurance / Korea',5000,8000,9000],
]);

runWaves('GIANTS GW8', V, [
  ['Japan 2nd-Tier', japan2],
  ['Korea Additional', korea2],
]);
