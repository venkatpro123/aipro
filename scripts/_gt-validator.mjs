// Shared double-validation engine for GT118+ non-unicorn batches
// All rules checked per company before any SQL touches the DB

export function buildValidator() {
  const errors = [];

  function validate(co) {
    const e = [];
    const mc  = co.market_cap_usd;
    const rev = co.revenue_ttm_usd;
    const wf  = co.workforce_count;

    // Rule 1 — country code must be IN
    if (co.country_code !== 'IN')
      e.push(`country_code='${co.country_code}' must be 'IN'`);

    // Rule 2 — market cap: non-unicorn strict range
    if (!mc || mc <= 0)
      e.push('market_cap_usd missing/zero');
    else if (mc >= 900_000_000)
      e.push(`mc $${(mc/1e6).toFixed(0)}M >= $900M (unicorn territory)`);
    else if (mc < 10_000_000)
      e.push(`mc $${(mc/1e6).toFixed(0)}M < $10M (unrealistic)`);

    // Rule 3 — revenue: must exist and be real
    if (!rev || rev <= 0)
      e.push('revenue_ttm_usd missing/zero');
    else if (rev < 5_000_000)
      e.push(`rev $${(rev/1e6).toFixed(1)}M < $5M`);
    else if (mc && isFinite(mc / rev)) {
      const ps = mc / rev;
      if (ps < 0.3)  e.push(`P/S ${ps.toFixed(2)}x < 0.3x (market cap << revenue)`);
      if (ps > 30)   e.push(`P/S ${ps.toFixed(2)}x > 30x (overvalued for small co)`);
    }

    // Rule 4 — workforce: realistic size
    if (!wf || wf <= 0)
      e.push('workforce_count missing/zero');
    else if (wf < 20)
      e.push(`workforce ${wf} < 20`);
    else if (wf > 50_000)
      e.push(`workforce ${wf} > 50,000 for sub-$900M co`);

    // Rule 5 — revenue per employee sanity ($5K-$500K for India)
    if (rev && wf) {
      const rpe = rev / wf;
      if (rpe < 5_000)   e.push(`RPE $${(rpe/1e3).toFixed(1)}K < $5K`);
      if (rpe > 500_000) e.push(`RPE $${(rpe/1e3).toFixed(1)}K > $500K`);
    }

    // Rule 6 — layoffs: non-negative, not absurd
    const lc = co.recent_layoff_count;
    if (lc === undefined || lc === null || lc < 0)
      e.push('recent_layoff_count must be >= 0');
    if (lc > 10_000)
      e.push(`recent_layoff_count ${lc} > 10,000`);

    // Rule 7 — confidence scores in [0, 1]
    for (const f of ['workforce_confidence','financials_confidence','layoff_confidence']) {
      const v = co[f];
      if (v === undefined || v === null) e.push(`${f} missing`);
      else if (v < 0 || v > 1) e.push(`${f}=${v} out of [0,1]`);
    }

    // Rule 8 — industry: specific (>10 chars, contains '/')
    const ind = co.industry || '';
    if (ind.length < 10) e.push(`industry '${ind}' too short`);
    if (!ind.includes('/')) e.push(`industry '${ind}' missing '/' separator`);

    // Rule 9 — sector non-blank
    if (!co.sector || !co.sector.trim())
      e.push('sector is blank');

    // Rule 10 — data_quality_tier valid
    if (!['seed','verified','live'].includes(co.data_quality_tier))
      e.push(`data_quality_tier '${co.data_quality_tier}' invalid`);

    if (e.length) errors.push({ name: co.canonical_name, errors: e });
    return e.length === 0;
  }

  function report() { return errors; }

  return { validate, report };
}

export const UPSERT_SQL = `
  INSERT INTO verified_company_intelligence (
    canonical_name, display_name, ticker, exchange, industry, sector,
    is_public, country_code,
    workforce_count, workforce_source, workforce_confidence,
    market_cap_usd, pe_ratio, revenue_ttm_usd,
    financials_source, financials_confidence,
    recent_layoff_count, layoff_confidence,
    hiring_velocity_score, total_open_roles,
    data_quality_tier, enrichment_version,
    last_enriched_at, updated_at
  ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,NOW(),NOW())
  ON CONFLICT (canonical_name) DO UPDATE SET
    display_name          = EXCLUDED.display_name,
    ticker                = COALESCE(EXCLUDED.ticker, verified_company_intelligence.ticker),
    exchange              = COALESCE(EXCLUDED.exchange, verified_company_intelligence.exchange),
    industry              = EXCLUDED.industry,
    sector                = EXCLUDED.sector,
    is_public             = EXCLUDED.is_public,
    country_code          = EXCLUDED.country_code,
    workforce_count       = COALESCE(EXCLUDED.workforce_count, verified_company_intelligence.workforce_count),
    workforce_source      = EXCLUDED.workforce_source,
    workforce_confidence  = GREATEST(EXCLUDED.workforce_confidence, verified_company_intelligence.workforce_confidence),
    market_cap_usd        = COALESCE(EXCLUDED.market_cap_usd, verified_company_intelligence.market_cap_usd),
    pe_ratio              = COALESCE(EXCLUDED.pe_ratio, verified_company_intelligence.pe_ratio),
    revenue_ttm_usd       = COALESCE(EXCLUDED.revenue_ttm_usd, verified_company_intelligence.revenue_ttm_usd),
    financials_source     = EXCLUDED.financials_source,
    financials_confidence = GREATEST(EXCLUDED.financials_confidence, verified_company_intelligence.financials_confidence),
    recent_layoff_count   = COALESCE(EXCLUDED.recent_layoff_count, verified_company_intelligence.recent_layoff_count),
    layoff_confidence     = GREATEST(EXCLUDED.layoff_confidence, verified_company_intelligence.layoff_confidence),
    hiring_velocity_score = EXCLUDED.hiring_velocity_score,
    total_open_roles      = EXCLUDED.total_open_roles,
    data_quality_tier     = EXCLUDED.data_quality_tier,
    enrichment_version    = EXCLUDED.enrichment_version,
    last_enriched_at      = NOW(),
    updated_at            = NOW()
`;

export async function runValidatedBatch(pool, title, version, companies) {
  const { validate, report } = buildValidator();

  console.log(`\n╔${'═'.repeat(68)}╗`);
  console.log(`║  ${title.padEnd(66)}║`);
  console.log(`╚${'═'.repeat(68)}╝\n`);

  // PASS 1 — schema + range validation
  console.log('PASS 1 — Double-validation (10 rules each):');
  const valid = [];
  for (const co of companies) {
    const ok = validate(co);
    const mc  = `$${(co.market_cap_usd/1e6).toFixed(0)}M`;
    const rev = `$${(co.revenue_ttm_usd/1e6).toFixed(0)}M`;
    const ps  = (co.market_cap_usd/co.revenue_ttm_usd).toFixed(1);
    if (ok) {
      console.log(`  ✅  ${co.canonical_name.padEnd(36)} mc=${mc.padStart(7)}  rev=${rev.padStart(7)}  P/S=${ps}x  wf=${co.workforce_count}`);
      valid.push(co);
    } else {
      console.log(`  ❌  ${co.canonical_name}`);
    }
  }

  const errs = report();
  if (errs.length) {
    console.log('\n⛔ VALIDATION FAILURES — aborting batch:');
    errs.forEach(({ name, errors }) => {
      console.log(`  ${name}:`);
      errors.forEach(e => console.log(`    → ${e}`));
    });
    throw new Error(`${errs.length} validation failures in ${title}`);
  }

  // PASS 2 — live DB duplicate check
  console.log(`\nPASS 2 — Live DB duplicate check (${valid.length} companies):`);
  const names = valid.map(c => c.canonical_name);
  const { rows } = await pool.query(
    `SELECT canonical_name FROM verified_company_intelligence WHERE canonical_name = ANY($1)`,
    [names]
  );
  const existing = new Set(rows.map(r => r.canonical_name));
  valid.forEach(co => {
    const flag = existing.has(co.canonical_name) ? '🔄 UPDATE' : '✅ INSERT';
    console.log(`  ${flag}  ${co.canonical_name}`);
  });
  console.log(`\n  → ${existing.size} will UPDATE, ${valid.length - existing.size} will INSERT\n`);

  // INSERT with 700ms delay
  let ins = 0, upd = 0;
  for (const co of valid) {
    let pe = co.pe_ratio;
    if (pe !== null && pe !== undefined && !isFinite(pe)) pe = null;

    await pool.query(UPSERT_SQL, [
      co.canonical_name, co.display_name, co.ticker, co.exchange,
      co.industry, co.sector, co.is_public, co.country_code,
      co.workforce_count, co.workforce_source, co.workforce_confidence,
      co.market_cap_usd, pe, co.revenue_ttm_usd,
      co.financials_source, co.financials_confidence,
      co.recent_layoff_count, co.layoff_confidence,
      co.hiring_velocity_score, co.total_open_roles,
      co.data_quality_tier, co.enrichment_version,
    ]);

    const mc     = `$${(co.market_cap_usd/1e6).toFixed(0)}M`;
    const tag    = co.is_public ? '📊 PUB' : '🔒 PRI';
    const action = existing.has(co.canonical_name) ? '🔄 updated' : '✅ inserted';
    console.log(`  ${tag}  ${co.canonical_name.padEnd(36)} ${mc.padStart(7)}   ${action}`);
    existing.has(co.canonical_name) ? upd++ : ins++;
    await new Promise(r => setTimeout(r, 700));
  }

  const peCount = valid.filter(c => c.pe_ratio !== null && c.pe_ratio !== undefined).length;
  console.log(`\n── ${version} complete: ${ins} inserted, ${upd} updated | PE: ${peCount}/${valid.length} | Rev: ${valid.length}/${valid.length}`);
}
