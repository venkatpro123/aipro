// Comprehensive duplicate fix — keeps best-data row per group, deletes the rest
// Strategy: prefer highest market_cap_usd → most recent GT batch version → most fields filled
import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// Version rank: higher = newer/better data
const VERSION_RANK = `
  CASE
    WHEN enrichment_version LIKE 'gt12%' THEN 120
    WHEN enrichment_version LIKE 'gt11%' THEN 110
    WHEN enrichment_version LIKE 'gt10%' THEN 100
    WHEN enrichment_version LIKE 'gt9%'  THEN 90
    WHEN enrichment_version LIKE 'gt8%'  THEN 80
    WHEN enrichment_version LIKE 'gt7%'  THEN 70
    WHEN enrichment_version LIKE 'gt6%'  THEN 60
    WHEN enrichment_version LIKE 'gt5%'  THEN 50
    WHEN enrichment_version LIKE 'gt4%'  THEN 40
    WHEN enrichment_version LIKE 'gt3%'  THEN 30
    WHEN enrichment_version LIKE 'gt2%'  THEN 20
    WHEN enrichment_version LIKE 'gt1%'  THEN 10
    WHEN enrichment_version LIKE 'ni%'   THEN 8
    WHEN enrichment_version LIKE 'ny%'   THEN 6
    WHEN enrichment_version LIKE 'real-data%' THEN 5
    WHEN enrichment_version LIKE 'india-batch%' THEN 2
    ELSE 1
  END
`;

// Fill score: how many key fields are non-null
const FILL_SCORE = `
  (CASE WHEN market_cap_usd IS NOT NULL THEN 3 ELSE 0 END +
   CASE WHEN revenue_ttm_usd IS NOT NULL THEN 2 ELSE 0 END +
   CASE WHEN workforce_count IS NOT NULL THEN 1 ELSE 0 END +
   CASE WHEN pe_ratio IS NOT NULL THEN 1 ELSE 0 END)
`;

let totalDeleted = 0;

async function deleteGroup(ids_to_delete, reason) {
  if (!ids_to_delete.length) return 0;
  const r = await pool.query(
    `DELETE FROM verified_company_intelligence WHERE id = ANY($1)`,
    [ids_to_delete]
  );
  totalDeleted += r.rowCount;
  return r.rowCount;
}

console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
console.log('║         FIXING ALL DUPLICATES — verified_company_intelligence       ║');
console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

// ── STEP 1: Fix ticker-symbol duplicates (same real company, different canonical) ──
console.log('STEP 1 — Ticker-symbol duplicates (same company, different canonical names):');

const tickerGroups = await pool.query(`
  SELECT ticker,
         array_agg(id ORDER BY ${VERSION_RANK} DESC, ${FILL_SCORE} DESC, COALESCE(market_cap_usd,0) DESC, canonical_name) as ids,
         array_agg(canonical_name ORDER BY ${VERSION_RANK} DESC, ${FILL_SCORE} DESC, COALESCE(market_cap_usd,0) DESC, canonical_name) as names,
         array_agg(enrichment_version ORDER BY ${VERSION_RANK} DESC, ${FILL_SCORE} DESC, COALESCE(market_cap_usd,0) DESC, canonical_name) as versions,
         array_agg(COALESCE(market_cap_usd,0) ORDER BY ${VERSION_RANK} DESC, ${FILL_SCORE} DESC, COALESCE(market_cap_usd,0) DESC, canonical_name) as caps
  FROM verified_company_intelligence
  WHERE ticker IS NOT NULL AND ticker != ''
  GROUP BY ticker
  HAVING COUNT(*) > 1
  ORDER BY ticker
`);

let tickerDel = 0;
for (const g of tickerGroups.rows) {
  const keepId   = g.ids[0];
  const keepName = g.names[0];
  const deleteIds = g.ids.slice(1);
  const del = await deleteGroup(deleteIds, `ticker=${g.ticker}`);
  tickerDel += del;
  console.log(`  ticker=${g.ticker.padEnd(12)} kept="${keepName.substring(0,40)}" deleted=${del} (was ${g.ids.length})`);
}
console.log(`  → Removed ${tickerDel} ticker-duplicate rows\n`);

// ── STEP 2: Fix fuzzy canonical name variants (prefix/suffix of same company) ──
console.log('STEP 2 — Fuzzy canonical name variants (e.g. "foo" vs "foo limited"):');

const fuzzyGroups = await pool.query(`
  WITH pairs AS (
    SELECT
      LEAST(a.id, b.id) as id_a,
      GREATEST(a.id, b.id) as id_b,
      a.canonical_name as name_a,
      b.canonical_name as name_b,
      ${VERSION_RANK.replace(/enrichment_version/g,'a.enrichment_version')} as rank_a,
      ${VERSION_RANK.replace(/enrichment_version/g,'b.enrichment_version')} as rank_b,
      COALESCE(a.market_cap_usd,0) as mc_a,
      COALESCE(b.market_cap_usd,0) as mc_b,
      (${FILL_SCORE.replace(/market_cap_usd/g,'a.market_cap_usd').replace(/revenue_ttm_usd/g,'a.revenue_ttm_usd').replace(/workforce_count/g,'a.workforce_count').replace(/pe_ratio/g,'a.pe_ratio')}) as fill_a,
      (${FILL_SCORE.replace(/market_cap_usd/g,'b.market_cap_usd').replace(/revenue_ttm_usd/g,'b.revenue_ttm_usd').replace(/workforce_count/g,'b.workforce_count').replace(/pe_ratio/g,'b.pe_ratio')}) as fill_b,
      a.country_code as cc_a
    FROM verified_company_intelligence a
    JOIN verified_company_intelligence b
      ON a.id < b.id
      AND a.country_code = b.country_code
      AND (
        b.canonical_name = a.canonical_name || ' limited'
        OR b.canonical_name = a.canonical_name || ' ltd'
        OR b.canonical_name = a.canonical_name || ' inc'
        OR b.canonical_name = a.canonical_name || ' plc'
        OR b.canonical_name = a.canonical_name || ' se'
        OR b.canonical_name = a.canonical_name || ' ag'
        OR b.canonical_name = a.canonical_name || ' sa'
        OR b.canonical_name = a.canonical_name || ' nv'
        OR b.canonical_name = a.canonical_name || ' corporation'
        OR b.canonical_name = a.canonical_name || ' corp'
        OR b.canonical_name = a.canonical_name || ' company'
        OR b.canonical_name = a.canonical_name || ' co'
        OR b.canonical_name = a.canonical_name || ' holdings'
        OR b.canonical_name = a.canonical_name || ' group'
        OR b.canonical_name = a.canonical_name || ' india'
        OR b.canonical_name = a.canonical_name || ' technologies'
        OR b.canonical_name = a.canonical_name || ' technology'
        OR a.canonical_name = b.canonical_name || ' limited'
        OR a.canonical_name = b.canonical_name || ' ltd'
        OR a.canonical_name = b.canonical_name || ' inc'
        OR a.canonical_name = b.canonical_name || ' plc'
        OR a.canonical_name = b.canonical_name || ' se'
        OR a.canonical_name = b.canonical_name || ' ag'
        OR a.canonical_name = b.canonical_name || ' sa'
        OR a.canonical_name = b.canonical_name || ' nv'
        OR a.canonical_name = b.canonical_name || ' corporation'
        OR a.canonical_name = b.canonical_name || ' corp'
        OR a.canonical_name = b.canonical_name || ' company'
        OR a.canonical_name = b.canonical_name || ' co'
        OR a.canonical_name = b.canonical_name || ' holdings'
        OR a.canonical_name = b.canonical_name || ' group'
        OR a.canonical_name = b.canonical_name || ' india'
        OR a.canonical_name = b.canonical_name || ' technologies'
        OR a.canonical_name = b.canonical_name || ' technology'
      )
  )
  SELECT *,
    CASE
      WHEN rank_a > rank_b THEN id_a
      WHEN rank_b > rank_a THEN id_b
      WHEN fill_a >= fill_b AND mc_a >= mc_b THEN id_a
      WHEN fill_b > fill_a OR mc_b > mc_a THEN id_b
      ELSE id_a
    END as keeper_id,
    CASE
      WHEN rank_a > rank_b THEN id_b
      WHEN rank_b > rank_a THEN id_a
      WHEN fill_a >= fill_b AND mc_a >= mc_b THEN id_b
      ELSE id_a
    END as delete_id
  FROM pairs
`);

let fuzzyDel = 0;
const alreadyDeleted = new Set();
for (const g of fuzzyGroups.rows) {
  if (alreadyDeleted.has(g.delete_id)) continue;
  // Verify the delete_id still exists
  const check = await pool.query(`SELECT id, canonical_name FROM verified_company_intelligence WHERE id=$1`, [g.delete_id]);
  if (!check.rows.length) continue;
  const del = await deleteGroup([g.delete_id], 'fuzzy');
  fuzzyDel += del;
  alreadyDeleted.add(g.delete_id);
  console.log(`  kept="${g.name_a.substring(0,35)}" deleted="${g.name_b.substring(0,35)}" (del=${del})`);
}
console.log(`  → Removed ${fuzzyDel} fuzzy-variant rows\n`);

// ── STEP 3: Fix same display_name with different canonical (same real company) ──
console.log('STEP 3 — Same display_name + same country = same company (cross-batch):');

const crossBatch = await pool.query(`
  SELECT display_name, country_code,
    array_agg(id ORDER BY ${VERSION_RANK} DESC, ${FILL_SCORE} DESC, COALESCE(market_cap_usd,0) DESC) as ids,
    array_agg(canonical_name ORDER BY ${VERSION_RANK} DESC, ${FILL_SCORE} DESC, COALESCE(market_cap_usd,0) DESC) as names,
    array_agg(enrichment_version ORDER BY ${VERSION_RANK} DESC, ${FILL_SCORE} DESC, COALESCE(market_cap_usd,0) DESC) as versions
  FROM verified_company_intelligence
  GROUP BY display_name, country_code
  HAVING COUNT(DISTINCT canonical_name) > 1
  ORDER BY display_name
`);

let crossDel = 0;
for (const g of crossBatch.rows) {
  const deleteIds = g.ids.slice(1).filter(id => !alreadyDeleted.has(id));
  for (const id of deleteIds) {
    const check = await pool.query(`SELECT id FROM verified_company_intelligence WHERE id=$1`, [id]);
    if (!check.rows.length) continue;
    const del = await deleteGroup([id], 'cross-batch');
    crossDel += del;
    alreadyDeleted.add(id);
  }
  if (deleteIds.length > 0) {
    console.log(`  "${g.display_name.substring(0,45)}" (${g.country_code}) kept="${g.names[0].substring(0,35)}" deleted=${deleteIds.length}`);
  }
}
console.log(`  → Removed ${crossDel} cross-batch-display rows\n`);

// ── STEP 4: Final verification ──
const final = await pool.query(`
  SELECT COUNT(*) as total, COUNT(DISTINCT canonical_name) as unique_cos
  FROM verified_company_intelligence
`);
const remainingDups = await pool.query(`
  SELECT COUNT(*) as cnt FROM (
    SELECT ticker FROM verified_company_intelligence
    WHERE ticker IS NOT NULL AND ticker != ''
    GROUP BY ticker HAVING COUNT(*) > 1
  ) x
`);
const remainingFuzzy = await pool.query(`
  SELECT COUNT(*) as cnt FROM (
    SELECT a.id FROM verified_company_intelligence a
    JOIN verified_company_intelligence b ON a.id < b.id
    AND a.country_code = b.country_code
    AND (b.canonical_name = a.canonical_name || ' limited'
      OR b.canonical_name = a.canonical_name || ' inc'
      OR a.canonical_name = b.canonical_name || ' limited'
      OR a.canonical_name = b.canonical_name || ' inc')
  ) x
`);

console.log('╔══════════════════════════════════════════════════════════════════════╗');
console.log('║                         FIX SUMMARY                                ║');
console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

console.log(`  Ticker duplicates removed:       ${tickerDel}`);
console.log(`  Fuzzy variant rows removed:      ${fuzzyDel}`);
console.log(`  Cross-batch display dups removed:${crossDel}`);
console.log(`  ─────────────────────────────────────`);
console.log(`  TOTAL ROWS REMOVED:              ${totalDeleted}\n`);

console.log(`  FINAL STATE:`);
console.log(`    Total companies:    ${final.rows[0].total}`);
console.log(`    Unique canonical:   ${final.rows[0].unique_cos}`);
console.log(`    Remaining ticker dups:  ${remainingDups.rows[0].cnt}`);
console.log(`    Remaining fuzzy dups:   ${remainingFuzzy.rows[0].cnt}`);
console.log(`    Status: ${+remainingDups.rows[0].cnt + +remainingFuzzy.rows[0].cnt === 0 ? '✅ CLEAN' : '⚠️  RESIDUAL ISSUES'}\n`);

await pool.end();
