// Deep duplicate diagnosis — canonical_name exact + fuzzy display_name + same-company variants
import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

console.log('\n╔═══════════════════════════════════════════════════════════════════════╗');
console.log('║          DEEP DUPLICATE DIAGNOSIS (May 2026)                         ║');
console.log('╚═══════════════════════════════════════════════════════════════════════╝\n');

// 1. Exact canonical_name duplicates
const exactDups = await pool.query(`
  SELECT canonical_name, COUNT(*) as cnt,
         array_agg(enrichment_version ORDER BY enrichment_version) as versions,
         array_agg(market_cap_usd ORDER BY enrichment_version) as market_caps
  FROM verified_company_intelligence
  GROUP BY canonical_name
  HAVING COUNT(*) > 1
  ORDER BY cnt DESC, canonical_name
`);
console.log(`1. EXACT canonical_name duplicates: ${exactDups.rows.length}`);
if (exactDups.rows.length > 0) {
  exactDups.rows.forEach(r => {
    console.log(`   ⚠️  "${r.canonical_name}"  ×${r.cnt}  versions=${r.versions.join(',')}  caps=${r.market_caps.map(c=>c?'$'+(c/1e6).toFixed(0)+'M':'null').join(',')}`);
  });
}

// 2. Same display_name used for different canonical names
const displayDups = await pool.query(`
  SELECT display_name, COUNT(*) as cnt,
         array_agg(canonical_name ORDER BY canonical_name) as canonicals,
         array_agg(country_code) as countries
  FROM verified_company_intelligence
  GROUP BY display_name
  HAVING COUNT(*) > 1
  ORDER BY cnt DESC, display_name
  LIMIT 60
`);
console.log(`\n2. Duplicate display_name (different canonical_name): ${displayDups.rows.length}`);
displayDups.rows.forEach(r => {
  console.log(`   ⚠️  "${r.display_name}"  ×${r.cnt}`);
  r.canonicals.forEach((cn, i) => console.log(`        canonical="${cn}"  country=${r.countries[i]}`));
});

// 3. Ticker symbol duplicates (same ticker, different canonical = same real company)
const tickerDups = await pool.query(`
  SELECT ticker, COUNT(*) as cnt,
         array_agg(canonical_name ORDER BY canonical_name) as canonicals,
         array_agg(display_name) as display_names,
         array_agg(market_cap_usd) as market_caps
  FROM verified_company_intelligence
  WHERE ticker IS NOT NULL AND ticker != ''
  GROUP BY ticker
  HAVING COUNT(*) > 1
  ORDER BY cnt DESC, ticker
`);
console.log(`\n3. Duplicate ticker symbols (same real company): ${tickerDups.rows.length}`);
tickerDups.rows.forEach(r => {
  console.log(`   ⚠️  ticker="${r.ticker}"  ×${r.cnt}`);
  r.canonicals.forEach((cn, i) => {
    const mc = r.market_caps[i] ? '$'+(r.market_caps[i]/1e6).toFixed(0)+'M' : 'null';
    console.log(`        canonical="${cn}"  display="${r.display_names[i]}"  mc=${mc}`);
  });
});

// 4. Fuzzy: same company, different suffixes (e.g. "infosys" vs "infosys limited")
const fuzzyDups = await pool.query(`
  SELECT a.canonical_name as name_a, b.canonical_name as name_b,
         a.display_name as disp_a, b.display_name as disp_b,
         a.market_cap_usd as mc_a, b.market_cap_usd as mc_b,
         a.enrichment_version as ver_a, b.enrichment_version as ver_b
  FROM verified_company_intelligence a
  JOIN verified_company_intelligence b
    ON a.canonical_name < b.canonical_name
    AND a.country_code = 'IN' AND b.country_code = 'IN'
    AND (
      -- one is prefix of the other
      b.canonical_name LIKE a.canonical_name || ' %'
      OR a.canonical_name LIKE b.canonical_name || ' %'
      -- common suffix variants
      OR REPLACE(a.canonical_name,' limited','') = REPLACE(b.canonical_name,' limited','')
      OR REPLACE(a.canonical_name,' india','') = REPLACE(b.canonical_name,' india','')
      OR REPLACE(a.canonical_name,' technologies','') = REPLACE(b.canonical_name,' technologies','')
      OR REPLACE(a.canonical_name,' tech','') = REPLACE(b.canonical_name,' tech','')
      OR REPLACE(a.canonical_name,' services','') = REPLACE(b.canonical_name,' services','')
    )
  ORDER BY name_a
`);
console.log(`\n4. Fuzzy same-company variants (suffix/prefix): ${fuzzyDups.rows.length}`);
fuzzyDups.rows.forEach(r => {
  const mcA = r.mc_a ? '$'+(r.mc_a/1e6).toFixed(0)+'M' : 'null';
  const mcB = r.mc_b ? '$'+(r.mc_b/1e6).toFixed(0)+'M' : 'null';
  console.log(`   ⚠️  "${r.name_a}" (${mcA}, ${r.ver_a})`);
  console.log(`       vs "${r.name_b}" (${mcB}, ${r.ver_b})`);
});

// 5. Same company seeded in GT-early AND re-entered in GT-late (display name overlap)
const crossBatch = await pool.query(`
  SELECT display_name,
         array_agg(canonical_name ORDER BY enrichment_version) as canonicals,
         array_agg(enrichment_version ORDER BY enrichment_version) as versions,
         array_agg(market_cap_usd ORDER BY enrichment_version) as caps
  FROM verified_company_intelligence
  WHERE country_code = 'IN'
  GROUP BY display_name
  HAVING COUNT(DISTINCT canonical_name) > 1
  ORDER BY display_name
`);
console.log(`\n5. India companies with same display_name, different canonical: ${crossBatch.rows.length}`);
crossBatch.rows.forEach(r => {
  console.log(`   "${r.display_name}":`);
  r.canonicals.forEach((cn, i) => {
    const mc = r.caps[i] ? '$'+(r.caps[i]/1e6).toFixed(0)+'M' : 'null';
    console.log(`     → "${cn}"  v=${r.versions[i]}  mc=${mc}`);
  });
});

// Summary
console.log('\n═══════════════════════════════════════════════════════════════════════');
const totalIssues = exactDups.rows.length + tickerDups.rows.length +
                    fuzzyDups.rows.length + crossBatch.rows.length;
console.log(`TOTAL ISSUE GROUPS: ${totalIssues}`);
console.log(`  • Exact canonical dups:   ${exactDups.rows.length}`);
console.log(`  • Ticker collisions:      ${tickerDups.rows.length}`);
console.log(`  • Fuzzy name variants:    ${fuzzyDups.rows.length}`);
console.log(`  • Cross-batch display dups:${crossBatch.rows.length}`);
console.log('═══════════════════════════════════════════════════════════════════════\n');

await pool.end();
