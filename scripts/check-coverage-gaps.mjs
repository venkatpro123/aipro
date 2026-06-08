import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// Current sub-tier counts
const tiers = await pool.query(`
  SELECT
    COUNT(CASE WHEN market_cap_usd < 900000000 AND market_cap_usd > 0 THEN 1 END) as sub900m,
    COUNT(CASE WHEN market_cap_usd < 500000000 AND market_cap_usd > 0 THEN 1 END) as sub500m,
    COUNT(CASE WHEN market_cap_usd < 200000000 AND market_cap_usd > 0 THEN 1 END) as sub200m,
    COUNT(CASE WHEN market_cap_usd < 100000000 AND market_cap_usd > 0 THEN 1 END) as sub100m,
    COUNT(CASE WHEN market_cap_usd < 50000000  AND market_cap_usd > 0 THEN 1 END) as sub50m
  FROM verified_company_intelligence WHERE country_code='IN'
`);
const t = tiers.rows[0];
console.log('India coverage gaps:');
console.log(`  <$900M: ${t.sub900m} | <$500M: ${t.sub500m} | <$200M: ${t.sub200m} | <$100M: ${t.sub100m} | <$50M: ${t.sub50m}`);

// Check which planned canonical names already exist
const planned = [
  // GT122 NSE/BSE listed
  'intellect design arena','rs software india','axiscades technologies',
  'astra microwave products','technoelectric engineering','xelpmoc design tech',
  '5paisa capital','e2e networks','avalon technologies',
  'yudiz solutions','inventurus knowledge solutions','cyient dlm',
  'aarvi encon','ptc india financial services',
  // GT123 private insurtech/wealthtech
  'acko general insurance','turtlemint insurance','insurancedekho platform',
  'coverfox insurance','renewbuy insurance','indmoney wealth tech',
  'dezerv wealth','smallcase investing','dhan trading app',
  'kuvera wealth','fisdom wealthtech','navi technologies',
  'slice banking','upstox trading','credgenics','kreditbee lending',
  // GT124 agritech/EV/healthtech
  'dehaat agriculture','farmmart agritech','bharatagri platform',
  'jai kisan agri','log9 materials ev','euler motors ev',
  'charge zone ev','neuberg diagnostics','redcliffe labs',
  'healthians diagnostics','licious d2c','medgenome genomics',
  'stage ott platform','rapido bike taxi','porter logistics',
  'sheroes platform','medibuddy health','good glamm group',
];
const { rows } = await pool.query(
  `SELECT canonical_name FROM verified_company_intelligence WHERE canonical_name = ANY($1)`,
  [planned]
);
const found = new Set(rows.map(r => r.canonical_name));
console.log(`\nPlanned: ${planned.length} | Already in DB: ${found.size} | New to insert: ${planned.length - found.size}`);
if (found.size > 0) console.log('Existing:', [...found].join(', '));
await pool.end();
