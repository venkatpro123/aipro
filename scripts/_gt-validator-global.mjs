// Shared double-validation engine for GLOBAL / all-size company batches.
// Relaxes the India-only / non-unicorn rules of _gt-validator.mjs:
//   • country_code: any 2-letter ISO (not just 'IN')
//   • market cap: $10M – $5T (no unicorn cap)
//   • workforce: 10 – 3,000,000 (Walmart/Amazon-scale allowed)
//   • RPE: $5K – $5M (banks/energy/enterprise run high revenue-per-employee)
//   • P/S: 0.1x – 60x (wider band for global growth + asset-heavy names)
// Keeps every structural guard: dedup (live DB), confidence bounds, industry
// format, sector non-blank, tier whitelist, ON CONFLICT + COALESCE upsert.

const ISO2 = /^[A-Z]{2}$/;

export function buildGlobalValidator() {
  const errors = [];

  function validate(co) {
    const e = [];
    const mc  = co.market_cap_usd;
    const rev = co.revenue_ttm_usd;
    const wf  = co.workforce_count;

    // Rule 1 — country code: any valid ISO-3166 alpha-2
    if (!co.country_code || !ISO2.test(co.country_code))
      e.push(`country_code='${co.country_code}' not ISO alpha-2`);

    // Rule 2 — market cap: positive, within $10M – $5T
    if (!mc || mc <= 0)
      e.push('market_cap_usd missing/zero');
    else if (mc < 10_000_000)
      e.push(`mc $${(mc/1e6).toFixed(0)}M < $10M (unrealistic)`);
    else if (mc > 5_000_000_000_000)
      e.push(`mc $${(mc/1e9).toFixed(0)}B > $5T (implausible)`);

    // Rule 3 — revenue: positive; P/S sanity 0.1x–60x
    if (!rev || rev <= 0)
      e.push('revenue_ttm_usd missing/zero');
    else if (mc && isFinite(mc / rev)) {
      const ps = mc / rev;
      if (ps < 0.1) e.push(`P/S ${ps.toFixed(2)}x < 0.1x`);
      if (ps > 60)  e.push(`P/S ${ps.toFixed(2)}x > 60x`);
    }

    // Rule 4 — workforce: 10 – 3,000,000
    if (!wf || wf <= 0)
      e.push('workforce_count missing/zero');
    else if (wf < 10)
      e.push(`workforce ${wf} < 10`);
    else if (wf > 3_000_000)
      e.push(`workforce ${wf} > 3,000,000`);

    // Rule 5 — revenue per employee, sector-aware upper bound.
    // Capital-intensive sectors (insurance/banks/energy/commodities/REITs/
    // utilities) structurally run very high revenue-per-employee — a reinsurer
    // with 3,500 staff books tens of billions in premiums. Cap them at $20M;
    // everyone else at $5M (keeps the tech/services sanity check tight).
    if (rev && wf) {
      const rpe = rev / wf;
      const capIntensive = /Financial|Energy|Materials|Real Estate|Utilities|Insurance/i.test(co.sector || '');
      const rpeCap = capIntensive ? 20_000_000 : 5_000_000;
      if (rpe < 5_000)    e.push(`RPE $${(rpe/1e3).toFixed(1)}K < $5K`);
      if (rpe > rpeCap)   e.push(`RPE $${(rpe/1e6).toFixed(2)}M > $${(rpeCap/1e6).toFixed(0)}M (${capIntensive?'cap-intensive':'standard'})`);
    }

    // Rule 6 — layoffs: non-negative, not absurd
    const lc = co.recent_layoff_count;
    if (lc === undefined || lc === null || lc < 0)
      e.push('recent_layoff_count must be >= 0');
    if (lc > 50_000)
      e.push(`recent_layoff_count ${lc} > 50,000`);

    // Rule 7 — confidence scores in [0,1]
    for (const f of ['workforce_confidence','financials_confidence','layoff_confidence']) {
      const v = co[f];
      if (v === undefined || v === null) e.push(`${f} missing`);
      else if (v < 0 || v > 1) e.push(`${f}=${v} out of [0,1]`);
    }

    // Rule 8 — industry specific (>10 chars, contains '/')
    const ind = co.industry || '';
    if (ind.length < 10)   e.push(`industry '${ind}' too short`);
    if (!ind.includes('/')) e.push(`industry '${ind}' missing '/' separator`);

    // Rule 9 — sector non-blank
    if (!co.sector || !co.sector.trim())
      e.push('sector is blank');

    // Rule 10 — data_quality_tier valid
    if (!['seed','verified','live'].includes(co.data_quality_tier))
      e.push(`data_quality_tier '${co.data_quality_tier}' invalid`);

    // Rule 11 — total_open_roles sanity: a seed-time estimate must stay
    // plausible. Reject absurd magnitudes (the old flat wf*0.03 produced 28k
    // for Accenture). Hard ceiling 3,000; also never exceed ~5% of workforce.
    const tor = co.total_open_roles;
    if (tor !== null && tor !== undefined) {
      if (tor < 0) e.push(`total_open_roles ${tor} < 0`);
      else if (tor > 3000) e.push(`total_open_roles ${tor} > 3,000 (implausible seed estimate)`);
      else if (wf && tor > wf * 0.05) e.push(`total_open_roles ${tor} > 5% of workforce ${wf}`);
    }

    if (e.length) errors.push({ name: co.canonical_name, errors: e });
    return e.length === 0;
  }

  function report() { return errors; }
  return { validate, report };
}

const UPSERT_SQL = `
  INSERT INTO verified_company_intelligence (
    canonical_name, display_name, ticker, exchange, industry, sector,
    is_public, country_code,
    workforce_count, workforce_source, workforce_confidence,
    market_cap_usd, pe_ratio, revenue_ttm_usd,
    financials_source, financials_confidence,
    recent_layoff_count, layoff_confidence,
    hiring_velocity_score, total_open_roles, hiring_source,
    data_quality_tier, enrichment_version,
    largest_layoff_pct, layoff_last_event_at,
    last_enriched_at, updated_at
  ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,NOW(),NOW())
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
    largest_layoff_pct    = COALESCE(EXCLUDED.largest_layoff_pct, verified_company_intelligence.largest_layoff_pct),
    layoff_last_event_at  = COALESCE(EXCLUDED.layoff_last_event_at, verified_company_intelligence.layoff_last_event_at),
    layoff_confidence     = GREATEST(EXCLUDED.layoff_confidence, verified_company_intelligence.layoff_confidence),
    hiring_velocity_score = EXCLUDED.hiring_velocity_score,
    total_open_roles      = EXCLUDED.total_open_roles,
    hiring_source         = EXCLUDED.hiring_source,
    data_quality_tier     = EXCLUDED.data_quality_tier,
    enrichment_version    = EXCLUDED.enrichment_version,
    last_enriched_at      = NOW(),
    updated_at            = NOW()
`;

function fmtMc(mc) {
  return mc >= 1e9 ? `$${(mc/1e9).toFixed(1)}B` : `$${(mc/1e6).toFixed(0)}M`;
}

export async function runValidatedGlobalBatch(pool, title, version, companies) {
  const { validate, report } = buildGlobalValidator();

  console.log(`\n╔${'═'.repeat(68)}╗`);
  console.log(`║  ${title.padEnd(66)}║`);
  console.log(`╚${'═'.repeat(68)}╝\n`);

  console.log('PASS 1 — Global double-validation (10 rules each):');
  const valid = [];
  for (const co of companies) {
    const ok = validate(co);
    const ps = (co.market_cap_usd/co.revenue_ttm_usd).toFixed(1);
    if (ok) {
      console.log(`  ✅  ${co.canonical_name.padEnd(34)} ${co.country_code}  mc=${fmtMc(co.market_cap_usd).padStart(8)}  P/S=${ps}x  wf=${co.workforce_count}`);
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

  console.log(`\nPASS 2 — Live DB duplicate check (${valid.length} companies):`);
  const names = valid.map(c => c.canonical_name);
  const { rows } = await pool.query(
    `SELECT canonical_name FROM verified_company_intelligence WHERE canonical_name = ANY($1)`,
    [names]
  );
  const existing = new Set(rows.map(r => r.canonical_name));
  console.log(`  → ${existing.size} will UPDATE, ${valid.length - existing.size} will INSERT\n`);

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
      co.hiring_velocity_score, co.total_open_roles, co.hiring_source ?? null,
      co.data_quality_tier, co.enrichment_version,
      co.largest_layoff_pct ?? null, co.layoff_last_event_at ?? null,
    ]);
    const tag    = co.is_public ? '📊 PUB' : '🔒 PRI';
    const action = existing.has(co.canonical_name) ? '🔄 updated' : '✅ inserted';
    console.log(`  ${tag}  ${co.canonical_name.padEnd(34)} ${co.country_code} ${fmtMc(co.market_cap_usd).padStart(8)}   ${action}`);
    existing.has(co.canonical_name) ? upd++ : ins++;
    await new Promise(r => setTimeout(r, 700));
  }

  console.log(`\n── ${version} complete: ${ins} inserted, ${upd} updated`);
  return { ins, upd };
}
