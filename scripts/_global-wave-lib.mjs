// Shared driver for clean global expansion waves (W9+).
// - SSL-enabled pool (matches working audit scripts)
// - Pre-filters against the live _existing-names.json snapshot (real DB names)
// - Runs the 10-rule global validator + live DB dedup (PASS 2)
// - 700ms sequential inserts (no bulk)
// - Writes the snapshot back after each wave so the next wave dedups correctly
import pg from 'pg';
import fs from 'fs';
import { runValidatedGlobalBatch } from './_gt-validator-global.mjs';

const SNAP = 'scripts/_existing-names.json';

// row tuple → company object. is_public is EXPLICIT (no silent true) so private
// names are labeled correctly. Order:
// [cn, dn, tk, ex, cc, sec, ind, wf, mcM, revM, isPublic=true, lay=0]
// NOTE: `lay` is authored as the HEADCOUNT laid off in the most recent round
// (e.g. 3000 employees). The DB field `recent_layoff_count` means the NUMBER OF
// LAYOFF EVENTS/ROUNDS (a small int the scoring engine reads as event count via
// fetch-company-data → layoff_rounds). So we convert here: a positive headcount
// becomes 1 documented round, and the magnitude is stored as severity % in
// largest_layoff_pct = headcount / workforce. Small values (<= 25) are treated as
// already being a round count (legacy convention) and passed through unchanged.
// Realistic open-role estimate from headcount. A flat % of headcount over-states
// badly at scale (3% of Accenture's 774k = 28k "open roles" — absurd). Open
// requisitions don't scale linearly with size, so taper the rate as headcount
// grows and hard-cap at 3,000. Labeled `workforce_estimate` so it is never
// mistaken for a live-scraped count (live audit overwrites with real postings).
export function estimateOpenRoles(wf) {
  if (!wf || wf <= 0) return null;
  const rate = wf < 5_000 ? 0.015 : wf < 50_000 ? 0.010 : wf < 200_000 ? 0.005 : 0.003;
  return Math.min(Math.round(wf * rate), 3000);
}

export function mapRows(version) {
  return (rows) => rows.map(([cn, dn, tk, ex, cc, sec, ind, wf, mcM, revM, isPublic = true, lay = 0]) => {
    const isHeadcount = lay > 25;                 // > 25 can only be a headcount, never an event count
    const rounds = lay <= 0 ? 0 : isHeadcount ? 1 : lay;
    const pct = isHeadcount && wf > 0
      ? Math.min(100, Math.round((lay / wf) * 1000) / 10)   // headcount → % of workforce, 1 dp, capped 100
      : null;
    return {
      canonical_name: cn, display_name: dn, ticker: tk, exchange: ex, country_code: cc,
      sector: sec, industry: ind, is_public: isPublic,
      workforce_count: wf, workforce_source: 'annual_report', workforce_confidence: 0.7,
      market_cap_usd: Math.round(mcM * 1e6), pe_ratio: null, revenue_ttm_usd: Math.round(revM * 1e6),
      financials_source: 'exchange_filing', financials_confidence: 0.65,
      recent_layoff_count: rounds, largest_layoff_pct: pct,
      layoff_last_event_at: rounds > 0 ? new Date().toISOString() : null,
      layoff_confidence: 0.6,
      hiring_velocity_score: 0.5, total_open_roles: estimateOpenRoles(wf),
      hiring_source: 'workforce_estimate',
      data_quality_tier: 'seed', enrichment_version: version,
    };
  });
}

export async function runWaves(waveLabel, version, groups) {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  const existing = new Set(JSON.parse(fs.readFileSync(SNAP, 'utf8')));

  // Detect intra-script duplicate canonical_names up front (authoring guard).
  const seen = new Set(), dupes = new Set();
  for (const [, rows] of groups) for (const r of rows) {
    if (seen.has(r.canonical_name)) dupes.add(r.canonical_name);
    seen.add(r.canonical_name);
  }
  if (dupes.size) {
    console.error(`⛔ intra-script duplicate canonical_names: ${[...dupes].join(', ')}`);
    await pool.end();
    process.exit(1);
  }

  let totalNew = 0, totalSkip = 0;
  try {
    for (const [region, rows] of groups) {
      const fresh = rows.filter(c => !existing.has(c.canonical_name));
      totalSkip += rows.length - fresh.length;
      if (!fresh.length) { console.log(`\n[${region}] all ${rows.length} already exist — skipped`); continue; }
      const { ins } = await runValidatedGlobalBatch(pool, `${waveLabel} — ${region}`, version, fresh);
      totalNew += ins;
      fresh.forEach(c => existing.add(c.canonical_name));
    }
    console.log(`\n═══ ${waveLabel} TOTAL: ${totalNew} new, ${totalSkip} pre-existing skipped ═══`);
    fs.writeFileSync(SNAP, JSON.stringify([...existing].sort(), null, 2), 'utf8');
    console.log(`✓ snapshot updated → ${existing.size} names`);
  } catch (e) {
    console.error('Error:', e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
