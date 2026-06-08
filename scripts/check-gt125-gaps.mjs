import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const planned = [
  // GT125 - RetailTech, PropTech & Commerce Infra
  'unicommerce ecommerce','vinculum group','gokwik checkout','clevertap marketing',
  'moengage platform','webengage marketing','increff warehouse','square yards property',
  'housr coliving','colive managed','cashify refurb','juspay payments',
  'm2p fintech infra','hyperface card','decentro banking','setu api platform',
  'drivex vehicles','clickpost logistics',
  // GT126 - EdTech smaller, MediaTech & HRTech
  'cuemath tutoring','embibe analytics','leverage edu','testbook exam prep',
  'sunstone eduversity','masai school','imarticus learning','lokal app',
  'kutumb community','bolo live creators','spotdraft legal ai','mygate security',
  'apnacomplex society','internshala platform','keka hr software','greythr hrms',
  'practically learning',
  // GT127 - AutoTech, ConstructionTech, TravelTech, InteriorTech
  'cartrade tech','ideaforge technology','droneacharya aerial','garuda aerospace',
  'brick and bolt construction','propertyshare platform','strata investment tech',
  'credr bikes','vehiclecare auto','pitstop auto service','zingbus',
  'abhibus booking','travelyaari buses','confirmtkt booking',
  'homelane interiors','livspace interiors','healthplix doctor','vyapar accounting',
];
const { rows } = await pool.query(
  `SELECT canonical_name FROM verified_company_intelligence WHERE canonical_name = ANY($1)`, [planned]
);
const found = new Set(rows.map(r => r.canonical_name));
const tiers = await pool.query(`
  SELECT COUNT(*) as total,
    COUNT(CASE WHEN market_cap_usd < 500000000 AND market_cap_usd > 0 THEN 1 END) as sub500,
    COUNT(CASE WHEN market_cap_usd < 200000000 AND market_cap_usd > 0 THEN 1 END) as sub200,
    COUNT(CASE WHEN market_cap_usd < 100000000 AND market_cap_usd > 0 THEN 1 END) as sub100
  FROM verified_company_intelligence WHERE country_code='IN'`);
const t = tiers.rows[0];
console.log(`India: total=${t.total} | <$500M: ${t.sub500} | <$200M: ${t.sub200} | <$100M: ${t.sub100}`);
console.log(`Planned ${planned.length} | In DB: ${found.size} | New: ${planned.length-found.size}`);
if (found.size) console.log('Skip:', [...found].join(', '));
await pool.end();
