#!/usr/bin/env node
// check-architecture-rules.mjs
//
// v35.1 cross-cutting CI gate. Replaces what would otherwise be five
// custom ESLint rules with a focused regex-based pre-merge check. Cheap
// to run, no plugin infrastructure to adopt, and the contracts it
// enforces are simple enough that AST analysis would be overkill.
//
// Rules enforced (each can be allowlisted with a `// arch-allow:<rule>`
// comment on the offending line):
//
//   R1 no-direct-supabase-functions-invoke
//     Bans `supabase.functions.invoke(` outside of
//     infrastructure/requestId.ts (the wrapper itself). Forces every
//     edge function call to propagate request-id.
//
//   R2 no-silent-catch
//     Flags `.catch(() => …)` and `catch { return … }` patterns that
//     don't route through withFallback/markFallback/recordFallback.
//     Catches the WS10 regression class (silent fallback paths).
//
//   R3 no-external-fetch-without-breaker
//     Flags `fetch(` calls in src/services/** that don't go through
//     apiCircuitBreaker, fetchWithBreaker, or invokeEdgeFunction.
//     Edge functions are checked separately via _shared/fetchWithBreaker.
//
//   R4 no-uncalibrated-magic-number
//     Flags numeric literals matching /0\.\d{2,}/ inside files whose
//     name ends in Engine.ts or Service.ts that aren't:
//       - assigned from getConstant()
//       - imported from cacheConfig
//       - on a line tagged `// calibration:bootstrap-fallback`
//
//   R5 no-bare-confidence-arithmetic
//     Flags Math.max | Math.min | + | * | ?: on identifiers matching
//     /confidence|risk|weight/i outside calibrationConstants.ts
//     and withFallback.ts.
//
// Failure mode: HARD rules (R1, R3, R5) emit `RULE_NAME file:line` to
// stderr and exit 1. SOFT rules (R2, R4) emit advisories to stdout but
// do not fail CI — they catch wide classes that may include legitimate
// uses, so they exist to flag review-worthy patterns, not block merges.
//
// To allow a single line, add `// arch-allow:R3` on the line. Use
// sparingly; every allow is a place a future engineer will check.
//
// Tuning notes:
//   * R1/R3/R5 are tight by design — they catch real audit findings
//     with no false-positives in the current codebase (verified
//     2026-06-15).
//   * R2/R4 cast a wide net. We log them so an engineer reviewing a PR
//     can spot them, but legitimate fire-and-forget telemetry catches
//     and bootstrap-fallback numeric literals are common enough that
//     hard-failing would be too noisy.

import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const SRC_ROOT = path.join(REPO_ROOT, 'src');
const EDGE_ROOT = path.join(REPO_ROOT, '..', '..', 'supabase', 'functions');

// ── File walker ─────────────────────────────────────────────────────────────

function* walk(dir, exts = new Set(['.ts', '.tsx'])) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip generated + test directories — rules don't apply there.
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '__tests__') continue;
      yield* walk(full, exts);
    } else if (entry.isFile() && exts.has(path.extname(entry.name))) {
      yield full;
    }
  }
}

function relpath(abs) {
  return path.relative(REPO_ROOT, abs).replace(/\\/g, '/');
}

function lineAllowed(line, rule) {
  return line.includes(`arch-allow:${rule}`);
}

function fileAllowed(filePath, rule, allowFiles) {
  return allowFiles.some((p) => filePath.includes(p));
}

// ── Violations collector ────────────────────────────────────────────────────

const violations = [];
const advisories = [];

const HARD_RULES = new Set(['R1', 'R2-strict', 'R3', 'R5']);

function record(rule, file, lineNum, lineText) {
  const entry = { rule, file: relpath(file), line: lineNum, text: lineText.trim().slice(0, 200) };
  const ruleId = rule.split(' ')[0];
  if (HARD_RULES.has(ruleId)) {
    violations.push(entry);
  } else {
    advisories.push(entry);
  }
}

// ── R1 no-direct-supabase-functions-invoke ──────────────────────────────────

const R1_ALLOWED_FILES = [
  'infrastructure/requestId.ts',
  '__tests__/',
  'scripts/',
];

function ruleR1(file, lines) {
  if (R1_ALLOWED_FILES.some((p) => file.includes(p))) return;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (lineAllowed(line, 'R1')) continue;
    // Skip comment-only lines — the pattern often appears in docstrings
    // and migration-history comments that ARE describing the
    // banned pattern, not invoking it.
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;
    if (/supabase\.functions\.invoke\s*\(/.test(line)) {
      record('R1 no-direct-supabase-functions-invoke', file, i + 1, line);
    }
  }
}

// ── R2 no-silent-catch ──────────────────────────────────────────────────────
//
// Catches the two literal anti-patterns the audit found:
//   .catch(() => null)
//   .catch(() => undefined)
//   .catch(() => {})
//   .catch(() => 0.5)            ← especially toxic
//   catch { return X }           ← block form with no telemetry
//
// Excludes:
//   - lines that mention withFallback/markFallback/recordFallback (they
//     ARE the telemetry path)
//   - files in the observability layer itself

const R2_ALLOWED_FILES = [
  'observability/withFallback',
  'shared/withFallback',
  'spanInstrumentation',
  '__tests__/',
  'scripts/',
];

function ruleR2(file, lines) {
  if (R2_ALLOWED_FILES.some((p) => file.includes(p))) return;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (lineAllowed(line, 'R2')) continue;
    // Skip comment-only lines — the pattern often appears in docstrings
    // describing the banned shape, not as actual code.
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;
    // SOFT — print, do not fail. Pattern: any .catch that swallows.
    // Skipped if the file is observability or the line already routes
    // through withFallback/markFallback/recordFallback.
    if (/\.catch\s*\(\s*\(?[^)]*\)?\s*=>\s*(null|undefined|\{\s*\}|0\.\d+|0|1)\s*\)/.test(line)) {
      if (!/withFallback|markFallback|recordFallback/.test(line)) {
        record('R2 no-silent-catch', file, i + 1, line);
      }
    }
  }
}

// ── R2-strict: numeric .catch fallback that DOES affect scoring ─────────────
// This is the genuine WS10 regression class: a .catch that returns a
// confidence-like number AND the result is captured into a variable
// (not awaited as a void / fire-and-forget). Narrow enough to be a
// HARD failure.
function ruleR2Strict(file, lines) {
  if (R2_ALLOWED_FILES.some((p) => file.includes(p))) return;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (lineAllowed(line, 'R2')) continue;
    // Pattern: `.catch(() => 0.<digits>)` — returning a numeric fallback.
    // This is the exact pattern the audit found in engineShadowRunner
    // and layoffScoreEngine.
    if (/\.catch\s*\(\s*\(?[^)]*\)?\s*=>\s*0\.\d+\s*\)/.test(line)) {
      if (!/withFallback|markFallback|recordFallback/.test(line)) {
        record('R2-strict no-silent-numeric-catch', file, i + 1, line);
      }
    }
  }
}

// ── R3 no-external-fetch-without-breaker ────────────────────────────────────
//
// In src/services/** any `fetch(` MUST be wrapped via:
//   - apiCircuitBreaker (legacy)
//   - withCircuitBreaker
//   - invokeEdgeFunction (for supabase EFs)
//   - imports a "Breaker" or "Breaker.ts" module
// The pattern is checked at the LINE level (cheap) and falls through to
// a same-function context check via a 3-line window if the immediate
// line lacks a wrapper marker.

const R3_ALLOWED_FILES = [
  'apiCircuitBreaker.ts',
  'infrastructure/requestId.ts',
  '__tests__/',
  'scripts/',
];

function ruleR3(file, lines) {
  if (!file.includes('/services/')) return;
  if (R3_ALLOWED_FILES.some((p) => file.includes(p))) return;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (lineAllowed(line, 'R3')) continue;
    // Match raw fetch( call.
    if (!/\bfetch\s*\(/.test(line)) continue;
    // Permit a same-line wrap (`withCircuitBreaker(api, () => fetch(...))`).
    if (/withCircuitBreaker|fetchWithBreaker|invokeEdgeFunction|apiCircuitBreaker/.test(line)) continue;
    // Check 3-line window above for a wrap context.
    const window = lines.slice(Math.max(0, i - 3), i).join(' ');
    if (/withCircuitBreaker|fetchWithBreaker|invokeEdgeFunction/.test(window)) continue;
    record('R3 no-external-fetch-without-breaker', file, i + 1, line);
  }
}

// ── R4 no-uncalibrated-magic-number ─────────────────────────────────────────
//
// Inside files whose name ends in Engine.ts, Service.ts, or Builder.ts
// flag any 0.XY literal that isn't:
//   - returned from getConstant() / applyCalibratedCap()
//   - imported from cacheConfig
//   - on a line tagged `// calibration:bootstrap-fallback`
//
// Common false-positives (kept allowlisted via comment): bootstrap
// fallback args inside getConstant(), array thresholds in tests,
// percentage formatting (`x * 100` style — no literal).

function ruleR4(file, lines) {
  if (!file.includes('/services/')) return;
  if (!/Engine\.ts$|Service\.ts$|Builder\.ts$|Detector\.ts$/.test(file)) return;
  // Skip the calibration substrate itself.
  if (file.includes('/calibration/')) return;
  if (file.includes('__tests__/') || file.includes('scripts/')) return;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (lineAllowed(line, 'R4')) continue;
    if (line.includes('calibration:bootstrap-fallback')) continue;
    if (/getConstant\s*\(/.test(line)) continue;
    if (/applyCalibratedCap\s*\(/.test(line)) continue;
    if (/cacheConfig/.test(line)) continue;
    // Looking for: bare 0.XY (2+ digits after decimal). 0.5 is allowed
    // as the universal probability midpoint — most uses are legitimate
    // (Math.round(x * 100) / 100, etc.). The audit found that 0.5 was
    // also abused (silent fallback for unknown confidence) but that
    // pattern is caught by R2 + WS9 refactors.
    const matches = line.match(/(?<![A-Za-z0-9_])0\.\d{2,}(?![A-Za-z0-9_])/g);
    if (!matches) continue;
    // Skip lines that look like array literals (likely lookup tables),
    // unless they assert directly into a field named *confidence* or
    // *risk*.
    if (/^\s*\[/.test(line) || /^\s*(const|let|var)\s+[A-Z_]/.test(line)) continue;
    record('R4 no-uncalibrated-magic-number', file, i + 1, line);
  }
}

// ── R5 no-bare-confidence-arithmetic ────────────────────────────────────────
//
// Flags Math.max/min, +, *, ?: applied to identifiers literally named
// `confidence` (or `risk` / `weight` mid-token). The pattern is narrow
// on purpose — false positives are far costlier than false negatives
// here.

const R5_ALLOWED_FILES = [
  'calibration/calibrationConstants',
  'observability/withFallback',
  'confidenceModel',
  '__tests__/',
  'scripts/',
];

function ruleR5(file, lines) {
  if (!file.includes('/services/') && !file.includes('/swarm/')) return;
  if (R5_ALLOWED_FILES.some((p) => file.includes(p))) return;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (lineAllowed(line, 'R5')) continue;
    // Permit lines using getConstant — that's the WS9 contract.
    if (/getConstant\s*\(/.test(line)) continue;
    // Strict pattern: Math.{max,min}(<num>, <id w/ confidence|risk|weight>)
    // OR (<id w/ confidence|risk|weight>) + <num>
    if (/Math\.(max|min)\s*\(\s*0\.\d+\s*,\s*\w*(confidence|risk|weight)\w*/i.test(line)) {
      record('R5 no-bare-confidence-arithmetic', file, i + 1, line);
      continue;
    }
    if (/\w*(confidence|risk|weight)\w*\s*[+*]\s*0\.\d+/i.test(line)) {
      record('R5 no-bare-confidence-arithmetic', file, i + 1, line);
      continue;
    }
  }
}

// ── Run ─────────────────────────────────────────────────────────────────────

const RULES = [
  { id: 'R1', fn: ruleR1, dir: SRC_ROOT },
  { id: 'R2', fn: ruleR2, dir: SRC_ROOT },
  { id: 'R2-strict', fn: ruleR2Strict, dir: SRC_ROOT },
  { id: 'R3', fn: ruleR3, dir: SRC_ROOT },
  { id: 'R4', fn: ruleR4, dir: SRC_ROOT },
  { id: 'R5', fn: ruleR5, dir: SRC_ROOT },
  // R2 + R2-strict also apply to edge functions (Deno).
  { id: 'R2-deno', fn: ruleR2, dir: EDGE_ROOT },
  { id: 'R2-strict-deno', fn: ruleR2Strict, dir: EDGE_ROOT },
];

console.log('[architecture-rules] scanning…');
for (const rule of RULES) {
  if (!fs.existsSync(rule.dir)) continue;
  let scanned = 0;
  for (const file of walk(rule.dir)) {
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    rule.fn(file, lines);
    scanned++;
  }
  console.log(`[architecture-rules] ${rule.id}: scanned ${scanned} files`);
}

// ── Output: SOFT advisories first (informational, never fail) ────────────
if (advisories.length > 0) {
  const byRule = new Map();
  for (const v of advisories) {
    if (!byRule.has(v.rule)) byRule.set(v.rule, []);
    byRule.get(v.rule).push(v);
  }
  console.log('');
  console.log(`[architecture-rules] ${advisories.length} advisory finding(s) (informational):`);
  for (const [rule, list] of byRule.entries()) {
    console.log('');
    console.log(`── ${rule} (${list.length}) ──`);
    for (const v of list.slice(0, 25)) {
      console.log(`  ${v.file}:${v.line}`);
      console.log(`    ${v.text}`);
    }
    if (list.length > 25) {
      console.log(`  … ${list.length - 25} more`);
    }
  }
  console.log('');
  console.log('(Advisories do not fail CI. Each is a review-worthy pattern; refactor');
  console.log(' through WS9..WS13 substrate when one is on the audit hot path.)');
}

// ── Output: HARD violations → exit non-zero ──────────────────────────────
if (violations.length === 0) {
  console.log('');
  console.log('[architecture-rules] ✓ no hard violations');
  process.exit(0);
}

const byRule = new Map();
for (const v of violations) {
  if (!byRule.has(v.rule)) byRule.set(v.rule, []);
  byRule.get(v.rule).push(v);
}

console.error('');
console.error(`[architecture-rules] ✗ ${violations.length} hard violation(s):`);
for (const [rule, list] of byRule.entries()) {
  console.error('');
  console.error(`── ${rule} (${list.length}) ──`);
  for (const v of list) {
    console.error(`  ${v.file}:${v.line}`);
    console.error(`    ${v.text}`);
  }
}
console.error('');
console.error('Tag a specific line with `// arch-allow:R1` (or R2..R5) to allowlist it,');
console.error('or refactor the offending pattern through the WS9..WS13 substrate.');
process.exit(1);
