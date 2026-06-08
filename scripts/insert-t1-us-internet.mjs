// Tech Wave T1 — US Internet / Consumer Tech platforms
import { mapRows, runWaves } from './_global-wave-lib.mjs';
const V = 't1-us-internet-v2026.1';
const g = mapRows(V);

const internet = g([
  ['airbnb','Airbnb Inc','ABNB','NASDAQ','US','Technology','Online Travel Marketplace / USA',7000,82000,11500,true,0],
  ['doordash','DoorDash Inc','DASH','NASDAQ','US','Technology','Food Delivery Platform / USA',23000,92000,10700,true,0],
  ['lyft','Lyft Inc','LYFT','NASDAQ','US','Technology','Ride-Hailing Platform / USA',3000,7200,5800,true,0],
  ['instacart','Maplebear Inc (Instacart)','CART','NASDAQ','US','Technology','Grocery Delivery Platform / USA',3500,12000,3500,true,0],
  ['pinterest','Pinterest Inc','PINS','NYSE','US','Technology','Visual Discovery Platform / USA',4500,26000,3900,true,0],
  ['reddit','Reddit Inc','RDDT','NYSE','US','Technology','Social News & Community Platform / USA',2000,22000,1600,true,0],
  ['etsy','Etsy Inc','ETSY','NASDAQ','US','Technology','Handmade Goods Marketplace / USA',2400,5200,2800,true,0],
  ['ebay','eBay Inc','EBAY','NASDAQ','US','Technology','E-Commerce Marketplace / USA',11000,32000,10300,true,0],
  ['wayfair','Wayfair Inc','W','NYSE','US','Technology','Home Goods E-Commerce / USA',13000,6200,11800,true,0],
  ['chewy','Chewy Inc','CHWY','NYSE','US','Technology','Pet E-Commerce Platform / USA',20000,16500,11900,true,0],
  ['carvana','Carvana Co','CVNA','NYSE','US','Technology','Online Used Car Platform / USA',8000,72000,14000,true,0],
  ['yelp','Yelp Inc','YELP','NYSE','US','Technology','Local Business Reviews Platform / USA',4700,2600,1400,true,0],
  ['bumble','Bumble Inc','BMBL','NASDAQ','US','Technology','Online Dating Platform / USA',1200,820,1050,true,0],
  ['spotify','Spotify Technology SA','SPOT','NYSE','SE','Technology','Music Streaming Platform / Sweden',9000,135000,17500,true,0],
  ['netflix','Netflix Inc','NFLX','NASDAQ','US','Technology','Video Streaming Platform / USA',14000,520000,40000,true,0],
  ['roku','Roku Inc','ROKU','NASDAQ','US','Technology','Streaming TV Platform / USA',3500,12000,4200,true,0],
]);

runWaves('T1', V, [['US Internet & Consumer Tech', internet]]);
