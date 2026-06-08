import pg from 'pg';
import fs from 'fs';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  try {
    const res = await pool.query('SELECT canonical_name FROM verified_company_intelligence ORDER BY canonical_name');
    const names = res.rows.map(r => r.canonical_name);
    fs.writeFileSync('scripts/_existing-names.json', JSON.stringify(names, null, 2), 'utf8');
    console.log(`✓ Snapshot saved: ${names.length} canonical names`);

    // Probe well-known giants I might collide with
    const probes = ['alibaba','tencent','baidu','jd','xiaomi','meituan','netease','bytedance','grab','shopee',
      'lvmh','loreal','l\'oreal','roche','novartis','mercedes','bmw','airbus','rolls','novo nordisk','astrazeneca',
      'gsk','bayer','sanofi','abbvie','thermo','siemens','schneider','eaton','telefonica','orange','vodafone',
      'deutsche telekom','stripe','revolut','wise','sofi','itau','bradesco','petrobras','jpmorgan','scotiabank',
      'td bank','safaricom','check point','wix','monday','teladoc','equinix','prologis','crown castle','zillow','redfin'];
    const lower = names.map(n => n.toLowerCase());
    console.log('\nCollision probe (substring match against existing names):');
    for (const p of probes) {
      const hits = lower.filter(n => n.includes(p));
      if (hits.length) console.log(`  ⚠ "${p}" → ${hits.join(', ')}`);
    }
    console.log('\n(any line above = already in DB, exclude from new waves)');
  } catch (e) {
    console.error('DB ERROR:', e.message);
    process.exit(1);
  }
  await pool.end();
})();
