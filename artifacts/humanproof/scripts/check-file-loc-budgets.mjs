#!/usr/bin/env node
// check-file-loc-budgets.mjs — gap #18 fix.
//
// Lint-level guard against god-file regression. Prints a warning when
// any TS/TSX file exceeds its budget; fails CI when a file exceeds the
// HARD ceiling.
//
// Budgets:
//   default (any file)       → warn at 600, fail at 1200 lines
//   `auditDataPipeline.ts`   → warn at 2500, fail at 3000 (legacy god-file
//                              shrinking over time; the threshold ratchets
//                              down as layers migrate)
//   `layoffScoreEngine.ts`   → warn at 3500, fail at 4500
//   `hybridConsensusBuilder` → warn at 2500, fail at 3000
//
// Exempt files MUST appear in EXEMPTIONS below with a documented reason.
// New entries require code review.

import { readdir, readFile, stat } from 'node:fs/promises';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_ROOT = join(__dirname, '..', 'src');

const DEFAULTS = { warn: 600, fail: 1200 };

const EXEMPTIONS = {
  // path-suffix → { warn, fail, reason }
  'services/auditDataPipeline.ts': {
    warn: 2500, fail: 3000,
    reason: 'Legacy orchestrator; shrinks 50-100 lines per DAG layer migration. Target by Q3: < 600 lines.',
  },
  'services/layoffScoreEngine.ts': {
    warn: 3500, fail: 4500,
    reason: 'Core composite formula + archetype blends + L1-L5 calibration. Decomposing this is its own workstream.',
  },
  'services/hybridConsensusBuilder.ts': {
    warn: 2500, fail: 3000,
    reason: 'Hybrid consensus assembly. Will shrink when sourceIndependentPanel.ts fully replaces it.',
  },
};

function budgetFor(relPath) {
  for (const [suffix, budget] of Object.entries(EXEMPTIONS)) {
    if (relPath.endsWith(suffix)) return budget;
  }
  return DEFAULTS;
}

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '__tests__') continue;
      out.push(...(await walk(full)));
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      out.push(full);
    }
  }
  return out;
}

async function countLines(file) {
  const content = await readFile(file, 'utf8');
  return content.split('\n').length;
}

async function main() {
  const files = await walk(SRC_ROOT);
  const warnings = [];
  const failures = [];

  for (const file of files) {
    const lines = await countLines(file);
    const rel = relative(SRC_ROOT, file);
    const budget = budgetFor(rel);
    if (lines >= budget.fail) {
      failures.push({ file: rel, lines, budget: budget.fail, kind: 'fail' });
    } else if (lines >= budget.warn) {
      warnings.push({ file: rel, lines, budget: budget.warn, kind: 'warn' });
    }
  }

  warnings.sort((a, b) => b.lines - a.lines);
  failures.sort((a, b) => b.lines - a.lines);

  if (warnings.length > 0) {
    console.log('\n⚠️  Files approaching their LOC budget:');
    for (const w of warnings) {
      console.log(`   ${w.lines.toString().padStart(5)} / ${w.budget.toString().padStart(5)}  ${w.file}`);
    }
  }

  if (failures.length > 0) {
    console.error('\n❌ Files exceed the LOC hard ceiling:');
    for (const f of failures) {
      console.error(`   ${f.lines.toString().padStart(5)} / ${f.budget.toString().padStart(5)}  ${f.file}`);
    }
    console.error(
      '\nOptions:\n' +
        '  1. Split the file. New file under domain/ or services/ depending on responsibility.\n' +
        '  2. If the file is a documented god-file, raise the budget in EXEMPTIONS with a written reason.\n',
    );
    process.exit(1);
  }

  console.log(`\n✅ ${files.length} files scanned; ${warnings.length} approaching budget; 0 over hard ceiling.`);
}

main().catch((err) => {
  console.error('check-file-loc-budgets:', err);
  process.exit(2);
});
