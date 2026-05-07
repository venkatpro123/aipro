/**
 * refresh-static-data.ts
 *
 * CI pipeline replacement for seed_static_data.ts and the manual data-engineering
 * scripts. Writes ONLY to the tables permitted by pipeline_upsert_static() —
 * role_exposure_data, industry_risk_data, companies, company_layoff_rounds.
 *
 * KEY DIFFERENCE FROM OLD SCRIPTS
 * ────────────────────────────────
 * Old scripts: createClient(url, SERVICE_ROLE_KEY) → direct table writes
 * This script: createClient(url, ANON_KEY) → calls pipeline_upsert_static()
 *
 * The guard function (SECURITY DEFINER, postgres-owned) enforces the allowlist
 * and writes the audit log. The anon key cannot write to user data tables even
 * if this script is modified — the database rejects it.
 *
 * Usage:
 *   npx tsx scripts/data-engineering/refresh-static-data.ts \
 *     --tables role_exposure_data,industry_risk_data \
 *     --caller "local-dev" \
 *     [--dry-run]
 */

import { createClient } from '@supabase/supabase-js';
import { roleExposureData } from '../../artifacts/humanproof/src/data/roleExposureData';
import { industryRiskData } from '../../artifacts/humanproof/src/data/industryRiskData';
import { companyDatabase } from '../../artifacts/humanproof/src/data/companyDatabase';

// ── CLI args ──────────────────────────────────────────────────────────────────

const args       = process.argv.slice(2);
const isDryRun   = args.includes('--dry-run');
const callerArg  = args.find(a => a.startsWith('--caller='))?.split('=')[1]
                ?? args[args.indexOf('--caller') + 1]
                ?? 'local-dev';
const tablesArg  = (args.find(a => a.startsWith('--tables='))?.split('=')[1]
                ?? args[args.indexOf('--tables') + 1]
                ?? 'role_exposure_data,industry_risk_data')
                .split(',').map(t => t.trim());

// ── Authentication: ANON KEY only — never service role ───────────────────────
// The pipeline_upsert_static() guard function is SECURITY DEFINER so it runs
// with postgres privileges. The calling key only needs EXECUTE on that function,
// which is granted to the authenticated/anon roles.

const SUPABASE_URL  = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const PIPELINE_KEY  = process.env.PIPELINE_ANON_KEY
                    ?? process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !PIPELINE_KEY) {
  console.error('ERROR: Set SUPABASE_URL and PIPELINE_ANON_KEY. Do NOT use SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

// Explicitly reject service role keys — they start with 'eyJ' and decode to role='service_role'
// This is a best-effort check; the real guard is the guard function itself.
if (PIPELINE_KEY.includes('"role":"service_role"') || PIPELINE_KEY.length > 500) {
  // Service role JWTs are longer than anon JWTs due to additional claims
  console.error(
    'ERROR: PIPELINE_ANON_KEY appears to be a service role key. '
    + 'Use the anon key. The guard function provides the necessary privileges.'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, PIPELINE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Data mappers: TypeScript types → DB row shapes ────────────────────────────

function mapRoleExposureRows(): object[] {
  return Object.entries(roleExposureData).map(([role_title, r]) => ({
    role_title,
    ai_risk:      r.aiRisk,
    layoff_risk:  r.layoffRisk,
    demand_trend: r.demandTrend,
  }));
}

function mapIndustryRiskRows(): object[] {
  return Object.entries(industryRiskData).map(([industry_key, r]) => ({
    industry_key,
    baseline_risk:       r.baselineRisk,
    ai_adoption_rate:    r.aiAdoptionRate,
    growth_outlook:      r.growthOutlook,
    avg_layoff_rate_2025: r.avgLayoffRate2025,
  }));
}

function mapCompanyRows(): object[] {
  return companyDatabase.map(c => ({
    name:                   c.name,
    ticker:                 c.ticker ?? null,
    is_public:              c.isPublic,
    industry:               c.industry,
    region:                 c.region,
    employee_count:         c.employeeCount,
    revenue_growth_yoy:     c.revenueGrowthYoY ?? null,
    stock_90d_change:       c.stock90DayChange ?? null,
    layoff_rounds:          c.layoffRounds,
    last_layoff_percent:    c.lastLayoffPercent ?? null,
    revenue_per_employee:   c.revenuePerEmployee,
    ai_investment_signal:   c.aiInvestmentSignal,
    data_source:            c.source,
    last_updated:           c.lastUpdated,
  }));
}

// ── Table write config ────────────────────────────────────────────────────────

const TABLE_CONFIG: Record<string, { rows: () => object[]; conflict: string }> = {
  role_exposure_data: { rows: mapRoleExposureRows, conflict: 'role_title' },
  industry_risk_data: { rows: mapIndustryRiskRows, conflict: 'industry_key' },
  companies:          { rows: mapCompanyRows,       conflict: 'name' },
};

// ── Guard-function upsert ─────────────────────────────────────────────────────

async function upsertViaGuard(
  table: string,
  rows: object[],
  conflict: string,
  caller: string,
  dryRun: boolean,
): Promise<void> {
  console.log(`\n[${table}] ${rows.length} rows | conflict: ${conflict}`);

  if (dryRun) {
    console.log(`[${table}] DRY RUN — skipping write. First row sample:`, rows[0]);
    return;
  }

  // Chunk to stay within the 5 MB PostgREST request limit
  const CHUNK_SIZE = 100;
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const { data, error } = await supabase.rpc('pipeline_upsert_static', {
      p_table:    table,
      p_rows:     JSON.stringify(chunk),
      p_conflict: conflict,
      p_caller:   caller,
    });

    if (error) {
      // The guard function logs failed writes to pipeline_audit_log before throwing
      console.error(`[${table}] chunk ${i}–${i + chunk.length} FAILED:`, error.message);
      throw new Error(`pipeline_upsert_static failed for ${table}: ${error.message}`);
    }

    console.log(`[${table}] chunk ${i}–${i + chunk.length}: ${data?.affected ?? '?'} rows affected`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('refresh-static-data');
  console.log('  caller:  ', callerArg);
  console.log('  tables:  ', tablesArg.join(', '));
  console.log('  dry_run: ', isDryRun);
  console.log('  auth:    anon key (writes via pipeline_upsert_static guard function)');

  for (const table of tablesArg) {
    const config = TABLE_CONFIG[table];
    if (!config) {
      console.error(`Unknown table: ${table}. Allowed: ${Object.keys(TABLE_CONFIG).join(', ')}`);
      process.exit(1);
    }

    const rows = config.rows();
    await upsertViaGuard(table, rows, config.conflict, callerArg, isDryRun);
  }

  console.log('\nDone.');
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
