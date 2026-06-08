// Pre-flight: check which planned GT119-GT121 names already exist
import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const planned = [
  // GT119 - NSE/BSE listed
  'subex','onmobile global','tanla platforms','affle india',
  'ags transact technologies','matrimony.com','ramco systems',
  'accelya solutions india','niit ltd','latent view analytics',
  'mapmyindia','3i infotech','brightcom group','aptech',
  'rategain travel','take solutions',
  // GT120 - private fintech
  'niyo neobank','jupiter money','fi money','freo moneytap',
  'mswipe technologies','kissht bnpl','flexiloans','kreditbee',
  'neogrowth credit','loantap financial','fibe earlysalary',
  'perfios credit','open financial technologies','yubi credavenue',
  'rupeek gold loans','faircent p2p',
  // GT121 - consumer / B2B
  'apna jobs','droom auto','purplle beauty','winzo gaming',
  'healthkart nutrition','stanza living','rentomojo',
  'zolo coliving','bizongo b2b','tracxn analytics',
  'park plus','twid loyalty','dunzo delivery','yellow.ai',
];

const { rows } = await pool.query(
  `SELECT canonical_name FROM verified_company_intelligence
   WHERE canonical_name = ANY($1)`,
  [planned]
);
const found = new Set(rows.map(r => r.canonical_name));
const clear = planned.filter(n => !found.has(n));
console.log(`\nChecking ${planned.length} planned names...`);
console.log(`Already in DB (${found.size}):`, [...found].join(', ') || 'none');
console.log(`Clear to insert (${clear.length}): all new\n`);
await pool.end();
