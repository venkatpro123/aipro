/**
 * seed_static_data.ts
 *
 * One-time seeder that reads the TypeScript static arrays and upserts them
 * into Supabase as the single source of truth.
 *
 * Usage:
 *   VITE_SUPABASE_URL=https://xxx.supabase.co \
 *   VITE_SUPABASE_SERVICE_KEY=eyJ... \
 *   npx tsx scripts/seed_static_data.ts
 *
 * Re-running is safe — uses ON CONFLICT DO NOTHING / upsert semantics.
 * Run this after every major update to the static .ts data files.
 */

import { createClient } from '@supabase/supabase-js';

// ── Import source data ────────────────────────────────────────────────────────
// These imports keep working until we remove the static files.
import { companyDatabase } from '../src/data/companyDatabase';
import { industryRiskData } from '../src/data/industryRiskData';
import { roleExposureData } from '../src/data/roleExposureData';

// ── Supabase client (uses SERVICE KEY for write access) ───────────────────────
const SUPABASE_URL = process.env.VITE_SUPABASE_URL
  || process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.VITE_SUPABASE_SERVICE_KEY
  || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    'ERROR: Set VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_KEY (or their SUPABASE_ variants).'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Helpers ────────────────────────────────────────────────────────────────────

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function upsertBatch<T extends object>(
  table: string,
  rows: T[],
  conflictColumn: string,
) {
  for (const batch of chunk(rows, 50)) {
    const { error } = await supabase
      .from(table)
      .upsert(batch, { onConflict: conflictColumn, ignoreDuplicates: false });
    if (error) {
      console.error(`  [${table}] batch error:`, error.message);
      throw error;
    }
  }
}

// ── 1. Seed industry_risk_data ─────────────────────────────────────────────────

async function seedIndustryRisk() {
  console.log('\n[1/3] Seeding industry_risk_data…');
  const rows = Object.entries(industryRiskData).map(([key, v]) => ({
    industry_key:         key,
    baseline_risk:        v.baselineRisk,
    ai_adoption_rate:     v.aiAdoptionRate,
    growth_outlook:       v.growthOutlook,
    avg_layoff_rate_2025: v.avgLayoffRate2025,
  }));

  await upsertBatch('industry_risk_data', rows, 'industry_key');
  console.log(`  ✓ ${rows.length} industry rows upserted.`);
}

// ── 2. Seed role_exposure_data ─────────────────────────────────────────────────

async function seedRoleExposure() {
  console.log('\n[2/3] Seeding role_exposure_data…');
  const rows = Object.entries(roleExposureData).map(([title, v]) => ({
    role_title:   title,
    ai_risk:      v.aiRisk,
    layoff_risk:  v.layoffRisk,
    demand_trend: v.demandTrend,
  }));

  await upsertBatch('role_exposure_data', rows, 'role_title');
  console.log(`  ✓ ${rows.length} role rows upserted.`);
}

// ── 3. Seed companies + company_layoff_rounds ──────────────────────────────────

async function seedCompanies() {
  console.log('\n[3/3] Seeding companies…');

  // De-duplicate by name (last entry wins if somehow duplicated in the array)
  const seen = new Map<string, (typeof companyDatabase)[0]>();
  for (const c of companyDatabase) seen.set(c.name.toLowerCase(), c);
  const unique = Array.from(seen.values());

  // Build company rows (omit layoffsLast24Months — stored in child table)
  const companyRows = unique.map(c => ({
    name:                      c.name,
    ticker:                    c.ticker ?? c.stockTicker ?? null,
    is_public:                 c.isPublic,
    industry:                  c.industry,
    region:                    c.region,
    employee_count:            c.employeeCount,
    revenue_growth_yoy:        c.revenueGrowthYoY,
    stock_90d_change:          c.stock90DayChange,
    layoff_rounds:             c.layoffRounds,
    last_layoff_percent:       c.lastLayoffPercent,
    revenue_per_employee:      c.revenuePerEmployee,
    ai_investment_signal:      c.aiInvestmentSignal,
    data_source:               c.source,
    last_updated:              c.lastUpdated,
    last_funding_round:        c.lastFundingRound ?? null,
    months_since_last_funding: c.monthsSinceLastFunding ?? null,
    ceo_tenure_months:         c.ceoTenureMonths ?? null,
    c_suite_changes_12m:       c.cSuiteChanges12m ?? null,
    board_composition_changed: c.boardCompositionChanged ?? null,
    glassdoor_trend_direction: c.glassdoorTrendDirection ?? null,
    role_risk_map:             c.roleRiskMap ?? null,
  }));

  await upsertBatch('companies', companyRows, 'name');
  console.log(`  ✓ ${companyRows.length} company rows upserted.`);

  // Fetch all company IDs from DB after upsert
  const { data: dbCompanies, error: fetchError } = await supabase
    .from('companies')
    .select('id, name');
  if (fetchError) throw fetchError;

  const nameToId = new Map<string, string>(
    (dbCompanies ?? []).map(r => [r.name.toLowerCase(), r.id])
  );

  // Delete old layoff rounds for all seeded companies, then re-insert
  const seededIds = Array.from(nameToId.values());
  if (seededIds.length > 0) {
    // Batch delete to avoid URL length limits
    for (const batch of chunk(seededIds, 100)) {
      await supabase
        .from('company_layoff_rounds')
        .delete()
        .in('company_id', batch);
    }
  }

  // Build layoff round rows
  const roundRows: { company_id: string; round_date: string; percent_cut: number }[] = [];
  for (const c of unique) {
    const cid = nameToId.get(c.name.toLowerCase());
    if (!cid) { console.warn(`  WARN: no ID found for ${c.name}`); continue; }
    for (const r of c.layoffsLast24Months) {
      roundRows.push({ company_id: cid, round_date: r.date, percent_cut: r.percentCut });
    }
  }

  if (roundRows.length > 0) {
    await upsertBatch('company_layoff_rounds', roundRows, 'id');
    console.log(`  ✓ ${roundRows.length} layoff-round rows inserted.`);
  } else {
    console.log('  (no layoff rounds to insert)');
  }
}

// ── Main ───────────────────────────────────────────────────────────────────────

(async () => {
  console.log('HumanProof — static data seeder');
  console.log(`Target: ${SUPABASE_URL}`);
  console.log(`Companies: ${companyDatabase.length} | Industries: ${Object.keys(industryRiskData).length} | Roles: ${Object.keys(roleExposureData).length}`);

  try {
    await seedIndustryRisk();
    await seedRoleExposure();
    await seedCompanies();
    console.log('\n✅ Seed complete.');
  } catch (err) {
    console.error('\n❌ Seed failed:', err);
    process.exit(1);
  }
})();
