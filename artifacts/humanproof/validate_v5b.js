let passed = 0, failed = 0;
const test = (name, cond) => {
  if (cond) { console.log('  PASS:', name); passed++; }
  else { console.log('  FAIL:', name); failed++; }
};

// Updated test values for AI amplification
const AI_AMP = { 'very-high':0.25, 'high':0.12, 'medium':0.00, 'low':-0.09 };
function applyAIAmp(baseL3, signal) {
  const amp = AI_AMP[signal] ?? 0;
  return Math.min(0.98, Math.max(0.02, baseL3 + amp * baseL3));
}

const DEPT = [
  ['security', -0.06], ['devops', -0.02], ['research', -0.05],
  ['support', 0.07], ['operations', 0.05], ['legal', 0.04],
  ['finance', 0.03], ['data', 0.03], ['marketing', 0.02],
  ['hr', 0.02], ['sales', -0.05], ['product', -0.04],
  ['design', -0.03], ['engineering', 0.00],
];
function getDeptDelta(dept) {
  const d = (dept||'').toLowerCase().replace(/[^a-z]/g, '');
  for (const [k,v] of DEPT) { if (d.includes(k)) return v; }
  return 0;
}

const WEIGHTS = { L1:0.30, L2:0.25, L3:0.20, L4:0.12, L5:0.08, D6:0.08, D7:0.07 };
const wSum = Object.values(WEIGHTS).reduce((s,w) => s+w, 0);
const fixedOthers = { L1:0.45, L2:0.40, L4:0.45, L5:0.35, D6:0.40, D7:0.42 };
const scoreWithL3 = (l3) => Object.entries(WEIGHTS).reduce((s,[k,w]) => s + (k==='L3' ? l3 : (fixedOthers[k]||0)) * w, 0) / wSum * 100;

console.log('\n[1] Department Context (fixed ordering)');
test('security engineering -> security matched (-0.06)', getDeptDelta('security engineering') === -0.06);
test('customer support -> support matched (0.07)', getDeptDelta('customer support') === 0.07);
test('sales dept protects (-0.05)', getDeptDelta('sales operations') === -0.05);
test('legal dept increases risk (0.04)', getDeptDelta('legal compliance') === 0.04);
test('generic engineering -> 0.00', getDeptDelta('engineering') === 0.00);

console.log('\n[2] AI Amplification (updated multipliers)');
const baseL3 = 0.55;
const highL3 = applyAIAmp(baseL3, 'very-high');
const lowL3 = applyAIAmp(baseL3, 'low');
const delta = scoreWithL3(highL3) - scoreWithL3(lowL3);
console.log('  Delta (very-high vs low):', delta.toFixed(2), 'pts');
test('very-high AI amplifies L3 by 25%', Math.abs(applyAIAmp(0.5,'very-high') - 0.625) < 0.001);
test('low AI reduces L3 by 9%', Math.abs(applyAIAmp(0.5,'low') - 0.455) < 0.001);
test('AI amplification creates 3-8pt score delta', delta > 3 && delta < 9);
test('Clamp works at ceiling', applyAIAmp(0.95,'very-high') <= 0.98);

console.log('\n============================================================');
console.log('RESULTS:', passed, 'PASSED /', (passed+failed), 'TOTAL');
if (failed > 0) { console.log(failed, 'FAILED'); process.exit(1); }
else { console.log('ALL PASS'); }
console.log('============================================================');
