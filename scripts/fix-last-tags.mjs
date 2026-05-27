import pg from "pg";
const db = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await db.connect();

const fixes = [
  { cn: "malayan banking berhad", dn: "Maybank (Malayan Banking Berhad)", cc: "MY",     pub: true,  t: "MAYBANK.KL", ex: "KLSE",   wf: 43000 },
  { cn: "benevolentai",           dn: "BenevolentAI Ltd.",                cc: "GB",     pub: false, t: null,         ex: null,     wf: 350   },
  { cn: "cytiva",                 dn: "Cytiva Life Sciences",             cc: "US",     pub: false, t: null,         ex: null,     wf: 7000  },
  { cn: "american express",       dn: "American Express Company",         cc: "US",     pub: true,  t: "AXP",        ex: "NYSE",   wf: 74600 },
];

for (const f of fixes) {
  const { rowCount } = await db.query(
    `UPDATE verified_company_intelligence
     SET display_name=$1, country_code=$2, is_public=$3, ticker=$4, exchange=$5,
         workforce_count=$6, workforce_source='annual_report_scrape', workforce_confidence=0.85,
         updated_at=NOW()
     WHERE canonical_name=$7`,
    [f.dn, f.cc, f.pub, f.t, f.ex, f.wf, f.cn]
  );
  console.log(`  ${f.cn.padEnd(30)} -> ${rowCount} row updated | display="${f.dn}"`);
}

// Find still-missing country_code
const { rows } = await db.query(
  "SELECT canonical_name, display_name FROM verified_company_intelligence WHERE country_code IS NULL"
);
if (rows.length > 0) {
  console.log(`\n⚠ Still missing country_code (${rows.length}):`);
  rows.forEach(r => console.log(`  - ${r.canonical_name} | ${r.display_name}`));
} else {
  console.log("\n✅ All rows now have country_code");
}

// Summary counts
const { rows: counts } = await db.query(`
  SELECT
    count(*) as total,
    count(country_code) as has_cc,
    count(workforce_count) as has_wf,
    count(stock_price) as has_price,
    count(CASE WHEN data_quality_tier='verified' THEN 1 END) as verified,
    count(CASE WHEN recent_layoff_count > 0 THEN 1 END) as has_layoffs
  FROM verified_company_intelligence
`);
const c = counts[0];
console.log(`
=== Final VCI Summary ===
Total rows      : ${c.total}
With country_code: ${c.has_cc} / ${c.total}
With workforce  : ${c.has_wf} / ${c.total}
With stock price: ${c.has_price} / ${c.total}
Verified tier   : ${c.verified}
With layoff data: ${c.has_layoffs}
`);

await db.end();
