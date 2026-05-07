#!/usr/bin/env node
// check-bundle-size.js
// Fails CI if the main chunk or career-intelligence chunk exceeds budget.
// Run after `vite build`: node scripts/check-bundle-size.js
//
// Budgets (gzip):
//   main chunk          ≤ 250 KB  (was 420 KB before lazy-loading AuditTerminalPage)
//   career-intelligence ≤ 220 KB  (the intelligence data now in its own chunk)
//   vendor chunk(s)     ≤ 160 KB  (react + framer-motion vendor split)
//   total JS            ≤ 700 KB  (all JS gzipped)
//
// Adjust budgets here when adding large dependencies — do not remove the check.

const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');

const DIST = path.join(__dirname, '..', 'dist', 'assets');

const BUDGETS = {
  // chunk name pattern → max gzip size in KB
  'index-':               250,   // main chunk (landing page + router shell)
  'career-intelligence':  220,   // intelligence module (371 role profiles)
  'vendor-react':          60,   // react + react-dom
  'vendor-motion':         80,   // framer-motion
  'vendor':               120,   // other vendor libs
};

const TOTAL_JS_BUDGET_KB = 700;

let failed = false;
let totalGzipKB = 0;

const files = fs.readdirSync(DIST).filter(f => f.endsWith('.js'));

console.log('\n── Bundle Size Report ─────────────────────────────────────────');
console.log(String('Chunk').padEnd(55) + String('Gzip KB').padStart(8) + String('Budget').padStart(10) + '  Status');
console.log('─'.repeat(80));

for (const file of files.sort()) {
  const buf   = fs.readFileSync(path.join(DIST, file));
  const gz    = zlib.gzipSync(buf, { level: 9 });
  const gzKB  = gz.length / 1024;
  totalGzipKB += gzKB;

  // Find matching budget
  const matchKey = Object.keys(BUDGETS).find(k => file.includes(k));
  if (!matchKey) {
    console.log(file.slice(0, 54).padEnd(55) + gzKB.toFixed(1).padStart(8) + '      n/a   ok');
    continue;
  }

  const budget  = BUDGETS[matchKey];
  const over    = gzKB > budget;
  const status  = over ? `❌ OVER by ${(gzKB - budget).toFixed(1)} KB` : '✅ ok';
  if (over) failed = true;

  console.log(
    file.slice(0, 54).padEnd(55) +
    gzKB.toFixed(1).padStart(8) +
    String(budget + ' KB').padStart(10) +
    '  ' + status
  );
}

console.log('─'.repeat(80));
const totalStatus = totalGzipKB > TOTAL_JS_BUDGET_KB
  ? `❌ OVER by ${(totalGzipKB - TOTAL_JS_BUDGET_KB).toFixed(1)} KB`
  : '✅ ok';
if (totalGzipKB > TOTAL_JS_BUDGET_KB) failed = true;
console.log('TOTAL JS'.padEnd(55) + totalGzipKB.toFixed(1).padStart(8) + String(TOTAL_JS_BUDGET_KB + ' KB').padStart(10) + '  ' + totalStatus);
console.log('');

if (failed) {
  console.error('Bundle size budget exceeded. Reduce chunk size or raise the budget explicitly in scripts/check-bundle-size.js with a comment explaining why.');
  process.exit(1);
} else {
  console.log('All chunks within budget.');
}
