#!/usr/bin/env node
// check-migration-drift.mjs — CI gate.
//
// Compares the migration files in `supabase/migrations/` against the
// `supabase_migrations.schema_migrations` table in the target environment
// and fails CI when:
//
//   1. A migration exists in source but has NOT been applied.
//   2. A migration is applied but missing from source (someone deleted
//      the file).
//   3. Two pending PRs would create migration files with the SAME
//      timestamp prefix (collision detection).
//
// Usage:
//
//   $ node scripts/check-migration-drift.mjs
//
// Env vars required:
//   SUPABASE_URL          — target environment
//   SUPABASE_SERVICE_ROLE_KEY
//
// Exit codes:
//   0  no drift
//   1  pending migration not yet applied (block deploy until applied)
//   2  applied migration missing from source (manual intervention)
//   3  timestamp collision (rename one migration file)
//   4  unexpected error
//
// Intended CI integration:
//   - Required check on PRs that touch supabase/migrations/.
//   - Runs against the staging environment.
//   - A green check means "every source migration is applied to staging".

import { readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, '..', 'supabase', 'migrations');

function fail(code, message) {
  console.error(JSON.stringify({ ok: false, exit: code, message }, null, 2));
  process.exit(code);
}

function pass(extra = {}) {
  console.log(JSON.stringify({ ok: true, ...extra }, null, 2));
  process.exit(0);
}

// ── 1. Read source migrations ──────────────────────────────────────────────

async function listSourceMigrations() {
  const entries = await readdir(MIGRATIONS_DIR);
  return entries
    .filter((f) => f.endsWith('.sql'))
    .filter((f) => /^\d{14}/.test(f))                  // 14-digit timestamp prefix
    .map((f) => {
      const m = f.match(/^(\d{14})_(.+)\.sql$/);
      if (!m) return null;
      return { filename: f, version: m[1], name: m[2] };
    })
    .filter((x) => x !== null)
    .sort((a, b) => a.version.localeCompare(b.version));
}

// ── 2. Read applied migrations ─────────────────────────────────────────────

async function listAppliedMigrations(client) {
  // Supabase tracks applied migrations in supabase_migrations.schema_migrations.
  // The columns vary by Supabase CLI version but `version` is stable.
  const { data, error } = await client
    .schema('supabase_migrations')
    .from('schema_migrations')
    .select('version, name')
    .order('version', { ascending: true });
  if (error) throw new Error(`failed to read schema_migrations: ${error.message}`);
  return data ?? [];
}

// ── 3. Detect timestamp collisions ─────────────────────────────────────────

function detectCollisions(sourceMigrations) {
  const byVersion = new Map();
  for (const m of sourceMigrations) {
    if (byVersion.has(m.version)) {
      const previous = byVersion.get(m.version);
      return [previous.filename, m.filename];
    }
    byVersion.set(m.version, m);
  }
  return null;
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    fail(4, 'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY required');
  }

  const client = createClient(url, key, { auth: { persistSession: false } });

  let source;
  let applied;
  try {
    source = await listSourceMigrations();
    applied = await listAppliedMigrations(client);
  } catch (err) {
    fail(4, err instanceof Error ? err.message : String(err));
  }

  // Collision check.
  const collision = detectCollisions(source);
  if (collision) {
    fail(3, `migration timestamp collision: ${collision[0]} and ${collision[1]} share the same prefix. ` +
            `Rename one before merging.`);
  }

  const sourceVersions = new Set(source.map((m) => m.version));
  const appliedVersions = new Set(applied.map((m) => m.version));

  // Drift check 1: applied missing from source.
  const orphaned = applied.filter((m) => !sourceVersions.has(m.version));
  if (orphaned.length > 0) {
    fail(2,
      `${orphaned.length} migration(s) applied to the environment but missing from source: ${
        orphaned.map((m) => m.version).join(', ')
      }. Restore the file(s) or run a manual fixup.`,
    );
  }

  // Drift check 2: pending (in source, not applied).
  const pending = source.filter((m) => !appliedVersions.has(m.version));
  if (pending.length > 0) {
    fail(1,
      `${pending.length} migration(s) pending application: ${pending.map((m) => m.filename).join(', ')}. ` +
      `Run \`supabase db push\` against the target environment before deploying.`,
    );
  }

  pass({
    source_count: source.length,
    applied_count: applied.length,
    latest_source: source.at(-1)?.filename ?? null,
    latest_applied: applied.at(-1)?.version ?? null,
  });
}

main().catch((err) => fail(4, err instanceof Error ? err.message : String(err)));
