// Comprehensive validation audit of all Indian small/non-unicorn companies
import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

console.log('\n╔═══════════════════════════════════════════════════════════════════════╗');
console.log('║  COMPREHENSIVE VALIDATION AUDIT — Indian Small Companies (2026)      ║');
console.log('╚═══════════════════════════════════════════════════════════════════════╝\n');

// ─── 1. GLOBAL SNAPSHOT ──────────────────────────────────────────────────────
const snap = await pool.query(`
  SELECT
    COUNT(*) as total,
    COUNT(CASE WHEN country_code='IN' THEN 1 END) as india_total,
    COUNT(CASE WHEN country_code='IN' AND market_cap_usd < 1000000000 THEN 1 END) as india_sub1b,
    COUNT(CASE WHEN country_code='IN' AND market_cap_usd < 900000000  THEN 1 END) as india_sub900m,
    COUNT(CASE WHEN country_code='IN' AND market_cap_usd < 500000000  THEN 1 END) as india_sub500m,
    COUNT(CASE WHEN country_code='IN' AND market_cap_usd < 200000000  THEN 1 END) as india_sub200m,
    COUNT(CASE WHEN country_code='IN' AND market_cap_usd < 100000000  THEN 1 END) as india_sub100m,
    COUNT(DISTINCT enrichment_version) as batches
  FROM verified_company_intelligence
`);
const s = snap.rows[0];
console.log('1. DATABASE SNAPSHOT:');
console.log(`   Global total:       ${s.total}`);
console.log(`   India total:        ${s.india_total}`);
console.log(`   India <$1B:         ${s.india_sub1b}`);
console.log(`   India <$900M:       ${s.india_sub900m}`);
console.log(`   India <$500M:       ${s.india_sub500m}`);
console.log(`   India <$200M:       ${s.india_sub200m}`);
console.log(`   India <$100M:       ${s.india_sub100m}`);
console.log(`   Total batches:      ${s.batches}\n`);

// ─── 2. DUPLICATE CHECK ──────────────────────────────────────────────────────
const dups = await pool.query(`
  SELECT canonical_name, COUNT(*) as cnt
  FROM verified_company_intelligence
  GROUP BY canonical_name HAVING COUNT(*) > 1
  ORDER BY cnt DESC
`);
console.log('2. DUPLICATE CHECK:');
if (dups.rows.length === 0) {
  console.log('   ✅  ZERO DUPLICATES across entire database\n');
} else {
  console.log(`   ⚠️  ${dups.rows.length} duplicate groups found:`);
  dups.rows.forEach(r => console.log(`       ${r.canonical_name} — ${r.cnt} copies`));
  console.log('');
}

// ─── 3. COUNTRY CODE INTEGRITY ───────────────────────────────────────────────
const cc = await pool.query(`
  SELECT country_code, COUNT(*) as cnt
  FROM verified_company_intelligence
  WHERE country_code != 'IN' OR country_code IS NULL
  GROUP BY country_code ORDER BY cnt DESC LIMIT 10
`);
const badCC = await pool.query(`
  SELECT COUNT(*) as cnt FROM verified_company_intelligence
  WHERE country_code IS NULL OR country_code = ''
`);
console.log('3. COUNTRY CODE INTEGRITY (Indian companies):');
console.log(`   ✅  All Indian entries have country_code='IN': ${badCC.rows[0].cnt === '0' ? 'YES' : 'NO — ' + badCC.rows[0].cnt + ' missing'}`);
const wrongIN = await pool.query(`
  SELECT COUNT(*) as cnt FROM verified_company_intelligence
  WHERE country_code='IN' AND (canonical_name LIKE '% india%' OR canonical_name LIKE '%india%')
  AND canonical_name NOT LIKE '%indiana%'
`);
console.log(`   ✅  Indian name-pattern matches country_code=IN: ${wrongIN.rows[0].cnt} verified\n`);

// ─── 4. MARKET CAP VALIDATION ────────────────────────────────────────────────
const mcap = await pool.query(`
  SELECT
    COUNT(CASE WHEN market_cap_usd IS NULL THEN 1 END) as missing,
    COUNT(CASE WHEN market_cap_usd <= 0 THEN 1 END) as zero_or_neg,
    COUNT(CASE WHEN market_cap_usd > 0 AND market_cap_usd < 1000000 THEN 1 END) as under_1m,
    COUNT(CASE WHEN market_cap_usd >= 1000000000000 THEN 1 END) as over_1t,
    ROUND(AVG(market_cap_usd)/1e9, 2) as avg_b,
    ROUND(MAX(market_cap_usd)/1e9, 1) as max_b
  FROM verified_company_intelligence WHERE country_code='IN'
`);
const m = mcap.rows[0];
console.log('4. MARKET CAP VALIDATION (India):');
console.log(`   Missing:            ${m.missing}`);
console.log(`   Zero/negative:      ${m.zero_or_neg}`);
console.log(`   Suspiciously <$1M:  ${m.under_1m}`);
console.log(`   Outliers >$1T:      ${m.over_1t}`);
console.log(`   Avg market cap:     $${m.avg_b}B`);
console.log(`   Max market cap:     $${m.max_b}B\n`);

// ─── 5. WORKFORCE COUNT VALIDATION ──────────────────────────────────────────
const wf = await pool.query(`
  SELECT
    COUNT(CASE WHEN workforce_count IS NULL OR workforce_count <= 0 THEN 1 END) as missing,
    COUNT(CASE WHEN workforce_count < 10 AND workforce_count > 0 THEN 1 END) as under_10,
    COUNT(CASE WHEN workforce_count > 500000 THEN 1 END) as over_500k,
    ROUND(AVG(workforce_count)) as avg_wf,
    MAX(workforce_count) as max_wf,
    MIN(CASE WHEN workforce_count > 0 THEN workforce_count END) as min_wf
  FROM verified_company_intelligence WHERE country_code='IN'
`);
const w = wf.rows[0];
console.log('5. WORKFORCE COUNT VALIDATION (India):');
console.log(`   Missing/zero:       ${w.missing}`);
console.log(`   Suspiciously <10:   ${w.under_10}`);
console.log(`   Outliers >500K:     ${w.over_500k}`);
console.log(`   Avg workforce:      ${w.avg_wf}`);
console.log(`   Min (non-zero):     ${w.min_wf}`);
console.log(`   Max workforce:      ${w.max_wf}\n`);

// ─── 6. REVENUE VALIDATION ───────────────────────────────────────────────────
const rev = await pool.query(`
  SELECT
    COUNT(CASE WHEN revenue_ttm_usd IS NULL OR revenue_ttm_usd <= 0 THEN 1 END) as missing,
    COUNT(CASE WHEN revenue_ttm_usd > 0 AND revenue_ttm_usd < 100000 THEN 1 END) as under_100k,
    COUNT(*) as total,
    ROUND(100.0 * COUNT(CASE WHEN revenue_ttm_usd > 0 THEN 1 END) / COUNT(*), 1) as coverage_pct
  FROM verified_company_intelligence WHERE country_code='IN'
`);
const rv = rev.rows[0];
console.log('6. REVENUE VALIDATION (India):');
console.log(`   Missing/zero:       ${rv.missing} of ${rv.total}`);
console.log(`   Coverage:           ${rv.coverage_pct}%`);
console.log(`   Suspiciously <$100K:${rv.under_100k}\n`);

// ─── 7. P/S RATIO SANITY CHECK (public companies) ───────────────────────────
const ps = await pool.query(`
  SELECT canonical_name, display_name, market_cap_usd, revenue_ttm_usd,
    ROUND(market_cap_usd::numeric / revenue_ttm_usd, 2) as ps_ratio
  FROM verified_company_intelligence
  WHERE country_code='IN' AND market_cap_usd > 0 AND revenue_ttm_usd > 0
    AND (market_cap_usd::numeric / revenue_ttm_usd < 0.2
      OR market_cap_usd::numeric / revenue_ttm_usd > 50)
  ORDER BY ps_ratio
  LIMIT 20
`);
console.log('7. P/S RATIO OUTLIERS (India, outside 0.2x–50x):');
if (ps.rows.length === 0) {
  console.log('   ✅  No outliers — all P/S ratios within 0.2x–50x\n');
} else {
  ps.rows.forEach(r => {
    console.log(`   ⚠️  ${r.canonical_name.padEnd(35)} mc=$${(r.market_cap_usd/1e6).toFixed(0)}M  rev=$${(r.revenue_ttm_usd/1e6).toFixed(0)}M  P/S=${r.ps_ratio}x`);
  });
  console.log('');
}

// ─── 8. LAYOFF DATA CHECK ────────────────────────────────────────────────────
const layoff = await pool.query(`
  SELECT
    COUNT(CASE WHEN recent_layoff_count < 0 THEN 1 END) as negative,
    COUNT(CASE WHEN recent_layoff_count > 10000 THEN 1 END) as extreme,
    COUNT(CASE WHEN recent_layoff_count > 0 THEN 1 END) as has_layoffs,
    SUM(recent_layoff_count) as total_layoffs,
    MAX(recent_layoff_count) as max_layoffs
  FROM verified_company_intelligence WHERE country_code='IN'
`);
const lf = layoff.rows[0];
console.log('8. LAYOFF DATA CHECK (India):');
console.log(`   Negative values:    ${lf.negative}  ${lf.negative > 0 ? '⚠️' : '✅'}`);
console.log(`   Extreme >10K:       ${lf.extreme}   ${lf.extreme > 0 ? '⚠️' : '✅'}`);
console.log(`   Companies w/ layoffs: ${lf.has_layoffs}`);
console.log(`   Total layoff count: ${lf.total_layoffs}`);
console.log(`   Max single event:   ${lf.max_layoffs}\n`);

// ─── 9. FINANCIAL SIGNALS CONFIDENCE SCORES ─────────────────────────────────
const conf = await pool.query(`
  SELECT
    COUNT(CASE WHEN workforce_confidence < 0 OR workforce_confidence > 1 THEN 1 END) as wf_oob,
    COUNT(CASE WHEN financials_confidence < 0 OR financials_confidence > 1 THEN 1 END) as fin_oob,
    COUNT(CASE WHEN layoff_confidence < 0 OR layoff_confidence > 1 THEN 1 END) as lay_oob,
    ROUND(AVG(workforce_confidence), 3) as avg_wf_conf,
    ROUND(AVG(financials_confidence), 3) as avg_fin_conf,
    ROUND(AVG(layoff_confidence), 3) as avg_lay_conf
  FROM verified_company_intelligence WHERE country_code='IN'
`);
const cf = conf.rows[0];
console.log('9. CONFIDENCE SCORE VALIDATION (India):');
console.log(`   Workforce out-of-bound [0,1]: ${cf.wf_oob}  ${cf.wf_oob > 0 ? '⚠️' : '✅'}`);
console.log(`   Financial out-of-bound [0,1]: ${cf.fin_oob}  ${cf.fin_oob > 0 ? '⚠️' : '✅'}`);
console.log(`   Layoff out-of-bound [0,1]:    ${cf.lay_oob}  ${cf.lay_oob > 0 ? '⚠️' : '✅'}`);
console.log(`   Avg workforce confidence:     ${cf.avg_wf_conf}`);
console.log(`   Avg financial confidence:     ${cf.avg_fin_conf}`);
console.log(`   Avg layoff confidence:        ${cf.avg_lay_conf}\n`);

// ─── 10. INDUSTRY/SECTOR SPECIFICITY ────────────────────────────────────────
const ind = await pool.query(`
  SELECT
    COUNT(CASE WHEN industry IS NULL OR industry = '' THEN 1 END) as missing_industry,
    COUNT(CASE WHEN sector IS NULL OR sector = '' THEN 1 END) as missing_sector,
    COUNT(CASE WHEN LENGTH(industry) < 10 THEN 1 END) as generic_industry,
    COUNT(CASE WHEN industry NOT LIKE '%/%' THEN 1 END) as no_slash_separator
  FROM verified_company_intelligence WHERE country_code='IN'
`);
const id = ind.rows[0];
console.log('10. INDUSTRY/SECTOR SPECIFICITY (India):');
console.log(`   Missing industry:   ${id.missing_industry}  ${id.missing_industry > 0 ? '⚠️' : '✅'}`);
console.log(`   Missing sector:     ${id.missing_sector}   ${id.missing_sector > 0 ? '⚠️' : '✅'}`);
console.log(`   Generic (<10 chars):${id.generic_industry}`);
console.log(`   No '/' separator:   ${id.no_slash_separator}\n`);

// ─── 11. DATA QUALITY TIER DISTRIBUTION ─────────────────────────────────────
const tier = await pool.query(`
  SELECT data_quality_tier, COUNT(*) as cnt,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) as pct
  FROM verified_company_intelligence WHERE country_code='IN'
  GROUP BY data_quality_tier ORDER BY cnt DESC
`);
console.log('11. DATA QUALITY TIERS (India):');
tier.rows.forEach(r => {
  const bar = '█'.repeat(Math.round(r.pct / 5));
  console.log(`   ${r.data_quality_tier.padEnd(12)}: ${String(r.cnt).padStart(4)}  (${r.pct}%) ${bar}`);
});
console.log('');

// ─── 12. SPECIFIC NON-UNICORN COMPANIES (sub-$800M) ──────────────────────────
const sub800 = await pool.query(`
  SELECT canonical_name, display_name, market_cap_usd, revenue_ttm_usd,
    workforce_count, recent_layoff_count, data_quality_tier, enrichment_version
  FROM verified_company_intelligence
  WHERE country_code='IN' AND market_cap_usd > 0 AND market_cap_usd < 800000000
  ORDER BY market_cap_usd DESC
  LIMIT 40
`);
console.log('12. NON-UNICORN COMPANIES UNDER $800M (top 40 by market cap):');
sub800.rows.forEach((r, i) => {
  const mc  = '$' + (r.market_cap_usd / 1e6).toFixed(0) + 'M';
  const rev = r.revenue_ttm_usd ? '$' + (r.revenue_ttm_usd / 1e6).toFixed(0) + 'M' : 'n/a';
  const tier = r.data_quality_tier === 'verified' ? '📊' : '🔒';
  const lc = r.recent_layoff_count > 0 ? `⚠️  ${r.recent_layoff_count} laid off` : '✅';
  console.log(`   ${String(i+1).padStart(2)}. ${tier} ${r.display_name.padEnd(38)} mc=${mc.padStart(7)}  rev=${rev.padStart(7)}  wf=${String(r.workforce_count).padStart(5)}  ${lc}`);
});

// ─── 13. ENRICHMENT COMPLETENESS SCORE ──────────────────────────────────────
const score = await pool.query(`
  SELECT
    ROUND(100.0 * COUNT(CASE WHEN market_cap_usd > 0 THEN 1 END) / COUNT(*), 1) as mcap_pct,
    ROUND(100.0 * COUNT(CASE WHEN revenue_ttm_usd > 0 THEN 1 END) / COUNT(*), 1) as rev_pct,
    ROUND(100.0 * COUNT(CASE WHEN workforce_count > 0 THEN 1 END) / COUNT(*), 1) as wf_pct,
    ROUND(100.0 * COUNT(CASE WHEN pe_ratio IS NOT NULL THEN 1 END) / COUNT(*), 1) as pe_pct,
    ROUND(100.0 * COUNT(CASE WHEN recent_layoff_count IS NOT NULL THEN 1 END) / COUNT(*), 1) as layoff_pct
  FROM verified_company_intelligence WHERE country_code='IN'
`);
const sc = score.rows[0];
console.log('\n13. OVERALL ENRICHMENT COMPLETENESS (India):');
console.log(`   Market cap:         ${sc.mcap_pct}%`);
console.log(`   Revenue TTM:        ${sc.rev_pct}%`);
console.log(`   Workforce count:    ${sc.wf_pct}%`);
console.log(`   PE ratio:           ${sc.pe_pct}%  (only public companies)`);
console.log(`   Layoff data:        ${sc.layoff_pct}%`);

// Overall score
const overall = ((+sc.mcap_pct + +sc.rev_pct + +sc.wf_pct + +sc.layoff_pct) / 4).toFixed(1);
console.log(`\n   ⭐  OVERALL ENRICHMENT SCORE: ${overall}%`);

// ─── SUMMARY ─────────────────────────────────────────────────────────────────
console.log('\n╔═══════════════════════════════════════════════════════════════════════╗');
console.log('║                      AUDIT VERDICT                                   ║');
console.log('╚═══════════════════════════════════════════════════════════════════════╝');

const issues = [
  dups.rows.length > 0            && `${dups.rows.length} duplicate groups`,
  +m.zero_or_neg > 0              && `${m.zero_or_neg} zero/negative market caps`,
  +m.under_1m > 0                 && `${m.under_1m} entries with market cap < $1M`,
  +w.missing > 0                  && `${w.missing} missing workforce counts`,
  +rv.under_100k > 0              && `${rv.under_100k} revenue entries < $100K`,
  ps.rows.length > 0              && `${ps.rows.length} P/S ratio outliers`,
  +lf.negative > 0                && `${lf.negative} negative layoff counts`,
  +cf.wf_oob > 0                  && `${cf.wf_oob} confidence scores out of bounds`,
  +id.missing_industry > 0        && `${id.missing_industry} missing industry fields`,
].filter(Boolean);

if (issues.length === 0) {
  console.log('\n   ✅  ALL CHECKS PASSED — Data is clean and validated\n');
} else {
  console.log(`\n   ⚠️  ${issues.length} ISSUE(S) FOUND:`);
  issues.forEach(i => console.log(`       • ${i}`));
  console.log('');
}

await pool.end();
