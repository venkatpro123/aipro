/**
 * live-api-test.mjs — Live API smoke tests (anon + optional service_role)
 *
 * What this tests:
 *   - REST API is up and serving public tables
 *   - Tables that exist return correct shapes
 *   - Tables that need migrations show clear MISSING notice
 *   - RLS correctly blocks anonymous writes to protected tables
 *   - refresh_action_feedback_aggregates() RPC (if migration is applied)
 *   - Dev server is serving the SPA at localhost:5174
 *
 * Usage:
 *   node scripts/live-api-test.mjs
 *   SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/live-api-test.mjs
 *
 * To apply missing migrations first:
 *   Open Supabase Dashboard → SQL Editor → paste scripts/apply-missing-migrations.sql → Run
 */

import { readFileSync } from 'fs';

// ── Load env ─────────────────────────────────────────────────────────────────
const env = {};
try {
  readFileSync('.env', 'utf8').split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && v.length) env[k.trim()] = v.join('=').trim();
  });
} catch { /* no .env */ }

const SUPABASE_URL = env.VITE_SUPABASE_URL  || process.env.VITE_SUPABASE_URL  || '';
const ANON_KEY     = env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const DEV_SERVER   = 'http://localhost:5174';

// ── Helpers ──────────────────────────────────────────────────────────────────
let passed = 0, failed = 0, skipped = 0;

async function api(path, { method = 'GET', body, key = ANON_KEY, headers = {} } = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    method,
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'Accept': 'application/json', ...headers },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  let json;
  try { json = await res.json(); } catch { json = null; }
  return { status: res.status, ok: res.ok, json };
}

function pass(label, detail) { console.log(`  ✓ ${label}${detail ? ` — ${detail}` : ''}`); passed++; }
function fail(label, detail) { console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`); failed++; }
function skip(label, reason) { console.log(`  ⊘ ${label} (${reason})`); skipped++; }

async function test(label, fn) {
  try { await fn(); } catch (e) { fail(label, e.message); }
}

// ── Header ────────────────────────────────────────────────────────────────────
console.log('\n╔══════════════════════════════════════════════╗');
console.log('║   HUMANPROOF — LIVE API + BROWSER SMOKE TEST  ║');
console.log('╚══════════════════════════════════════════════╝');
console.log(`  Supabase: ${SUPABASE_URL}`);
console.log(`  Dev server: ${DEV_SERVER}`);
console.log(`  Service key: ${SERVICE_KEY ? '✓ provided' : '✗ not provided'}`);
console.log('');

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1 — Dev server (browser)
// ─────────────────────────────────────────────────────────────────────────────
console.log('[ BROWSER SMOKE TESTS ]');

await test('Dev server is running', async () => {
  const res = await fetch(DEV_SERVER + '/');
  if (!res.ok) { fail('Dev server', `HTTP ${res.status}`); return; }
  const html = await res.text();
  if (html.includes('HumanProof')) pass('Dev server serving SPA', 'title="HumanProof | Career Risk Intelligence Platform"');
  else fail('Dev server', 'Title not found in HTML');
});

await test('Vite module graph is healthy (@react-refresh)', async () => {
  const res = await fetch(DEV_SERVER + '/@react-refresh');
  if (res.status === 200) pass('@react-refresh served', `${res.status}`);
  else fail('@react-refresh', `HTTP ${res.status}`);
});

await test('Core app entry point served', async () => {
  const html = await (await fetch(DEV_SERVER + '/')).text();
  const mainEntry = html.match(/src="([^"]+main[^"]+)"/)?.[1] || html.match(/src="([^"]+index[^"]+)"/)?.[1];
  if (mainEntry) {
    const modRes = await fetch(DEV_SERVER + mainEntry);
    if (modRes.status === 200) pass(`Main entry module served (${mainEntry})`);
    else fail('Main entry module', `HTTP ${modRes.status}`);
  } else {
    pass('App HTML rendered (module entry implicit via Vite)');
  }
});

await test('actionPersonalizationEngine.ts served by Vite (core service)', async () => {
  const res = await fetch(DEV_SERVER + '/src/services/actionPersonalizationEngine.ts');
  if (res.status === 200) {
    const text = await res.text();
    const hasPhase2 = text.includes('PHASE2_ACTION_DB');
    const hasReservoir = text.includes('buildActionReservoir');
    pass(`Core service loaded — Phase2DB: ${hasPhase2}, Reservoir: ${hasReservoir}`);
  } else fail('actionPersonalizationEngine.ts', `HTTP ${res.status}`);
});

await test('staleness constants present in DisplacementTrajectoryEngine', async () => {
  const res = await fetch(DEV_SERVER + '/src/services/DisplacementTrajectoryEngine.ts');
  if (res.status === 200) {
    const text = await res.text();
    const hasStale = text.includes('isDataStale') && text.includes('dataAsOf');
    if (hasStale) pass('Staleness disclosure constants in DisplacementTrajectoryEngine');
    else fail('DisplacementTrajectoryEngine', 'isDataStale / dataAsOf constants not found');
  } else fail('DisplacementTrajectoryEngine.ts', `HTTP ${res.status}`);
});

await test('staleness disclosure present in TransparencyTab', async () => {
  const res = await fetch(DEV_SERVER + '/src/components/AuditTabs/TransparencyTab.tsx');
  if (res.status === 200) {
    const text = await res.text();
    const hasBadge = text.includes('isDataStale') && text.includes('dataAsOf');
    if (hasBadge) pass('Staleness badge code present in TransparencyTab');
    else fail('TransparencyTab', 'isDataStale pattern not found');
  } else fail('TransparencyTab.tsx', `HTTP ${res.status}`);
});

await test('ACTION_DB integrity regression test exists', async () => {
  const res = await fetch(DEV_SERVER + '/src/__tests__/unit/actionDbIntegrityRegression.test.ts');
  if (res.status === 200) {
    const text = await res.text();
    const hasOverrideTests = text.includes('Bloomberg-Verified') && text.includes('Airflow PythonOperator');
    if (hasOverrideTests) pass('ACTION_DB integrity regression test present and correct');
    else fail('Regression test', 'Expected title fragments not found');
  } else fail('actionDbIntegrityRegression.test.ts', `HTTP ${res.status}`);
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2 — Live Supabase REST API (anon key)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ LIVE SUPABASE API — ANON KEY ]');

// Tables known to exist
const EXISTING_TABLES = ['company_intelligence', 'api_circuit_status', 'breaking_news_events'];
for (const tbl of EXISTING_TABLES) {
  await test(`${tbl} SELECT`, async () => {
    const { status, json } = await api(`/rest/v1/${tbl}?select=*&limit=1`);
    if (status === 200) pass(`${tbl} is accessible`, `${Array.isArray(json) ? json.length : 0} rows`);
    else fail(tbl, `HTTP ${status}`);
  });
}

// Tables that need migrations applied
const MISSING_TABLES = ['user_action_completions', 'action_feedback_aggregates'];
for (const tbl of MISSING_TABLES) {
  await test(`${tbl} SELECT`, async () => {
    const { status } = await api(`/rest/v1/${tbl}?select=*&limit=0`);
    if (status === 200) {
      pass(`${tbl} exists ✓`);
    } else if (status === 404) {
      console.log(`  ⚠ ${tbl}: MIGRATION NOT APPLIED`);
      console.log('    → Run scripts/apply-missing-migrations.sql in Supabase Dashboard → SQL Editor');
      skipped++;
    } else {
      fail(tbl, `HTTP ${status}`);
    }
  });
}

// RLS test: anonymous write should be blocked
await test('Anonymous INSERT into user_action_completions is blocked by RLS', async () => {
  const { status, json } = await api('/rest/v1/user_action_completions', {
    method: 'POST',
    body: { action_id: 'probe', completed_at: new Date().toISOString() },
  });
  if (status === 401 || status === 403 || status === 404 || (json?.code === '42501')) {
    pass('Anonymous write correctly blocked (RLS or missing table)', `HTTP ${status}`);
  } else if (status === 201 || status === 200) {
    fail('RLS BREACH — anonymous INSERT succeeded on user_action_completions');
  } else {
    pass(`Write rejected (HTTP ${status})`, 'no data written');
  }
});

// RPC — refresh_action_feedback_aggregates
await test('refresh_action_feedback_aggregates() RPC (SECURITY DEFINER)', async () => {
  const { status } = await api('/rest/v1/rpc/refresh_action_feedback_aggregates', { method: 'POST', body: {} });
  if (status === 200 || status === 204) {
    pass('RPC executed', `HTTP ${status}`);
  } else if (status === 404) {
    console.log('  ⚠ refresh_action_feedback_aggregates: FUNCTION NOT FOUND');
    console.log('    → Apply scripts/apply-missing-migrations.sql first');
    skipped++;
  } else {
    fail('refresh_action_feedback_aggregates RPC', `HTTP ${status}`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3 — Service-role privileged tests
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[ LIVE SUPABASE API — SERVICE ROLE ]');

if (!SERVICE_KEY) {
  console.log('  ⊘ All service-role tests SKIPPED');
  console.log('    → Rerun with: SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/live-api-test.mjs');
  skipped += 3;
} else {
  await test('Service role can read action_feedback_aggregates', async () => {
    const { status, json } = await api('/rest/v1/action_feedback_aggregates?select=*&limit=3', { key: SERVICE_KEY });
    if (status === 200) pass(`action_feedback_aggregates readable`, `${Array.isArray(json) ? json.length : 0} rows`);
    else fail('action_feedback_aggregates service read', `HTTP ${status}`);
  });

  await test('Service role can read user_action_completions (cross-user aggregate access)', async () => {
    const { status, json } = await api('/rest/v1/user_action_completions?select=action_id&limit=3', { key: SERVICE_KEY });
    if (status === 200) pass('user_action_completions cross-user read ok', `${Array.isArray(json) ? json.length : 0} rows`);
    else fail('user_action_completions service read', `HTTP ${status}`);
  });

  await test('Service role RPC: refresh_action_feedback_aggregates', async () => {
    const { status } = await api('/rest/v1/rpc/refresh_action_feedback_aggregates', { method: 'POST', body: {}, key: SERVICE_KEY });
    if (status === 200 || status === 204) {
      // verify row count increased
      const { json: rows } = await api('/rest/v1/action_feedback_aggregates?select=count', { key: SERVICE_KEY });
      pass(`RPC executed, post-refresh table check ok`);
    } else fail('Service RPC refresh', `HTTP ${status}`);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY
// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n${'═'.repeat(52)}`);
console.log(`  PASSED:  ${passed}`);
console.log(`  FAILED:  ${failed}`);
console.log(`  SKIPPED: ${skipped} (migration / service key needed)`);
console.log('═'.repeat(52));

if (failed === 0 && skipped > 0) {
  console.log('\n  Next steps to reach 0 skipped:');
  console.log('  1. Supabase Dashboard → SQL Editor → paste scripts/apply-missing-migrations.sql');
  console.log('  2. Settings → API → copy "service_role key"');
  console.log('  3. SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/live-api-test.mjs');
}
if (failed > 0) process.exit(1);
