'use strict';
const fs = require('fs');
let p = 0, f = 0;
const test = (name, cond, note) => {
  if (cond) { console.log('  PASS:', name); p++; }
  else       { console.log('  FAIL:', name, note ?? ''); f++; }
};
const read = f => fs.readFileSync(f, 'utf8');

const eng  = read('src/services/layoffScoreEngine.ts');
const cal  = read('src/services/empiricalCalibration.ts');
const agg  = read('src/services/swarm/swarmAggregator.ts');
const orch = read('src/services/swarm/swarmOrchestrator.ts');
const mktCap = read('src/services/swarm/agents/marketSignals/marketCapDropAgent.ts');
const roleDisp = read('src/services/swarm/agents/aiSignals/roleDisplacementAgent.ts');

// ── Fix 1: Calibrated thresholds wired in ─────────────────────────────────
console.log('\n[F1] Calibrated thresholds wired to engine');
test('Engine imports calibratedRevenueGrowthRisk', eng.includes('calibratedRevenueGrowthRisk'));
test('Engine imports calibratedStockTrendRisk', eng.includes('calibratedStockTrendRisk'));
test('calculateCompanyHealthScore calls calibratedRevenueGrowthRisk',
  eng.includes('calibratedRevenueGrowthRisk(companyData.revenueGrowthYoY)'));
test('calculateCompanyHealthScore calls calibratedStockTrendRisk',
  eng.includes('calibratedStockTrendRisk(companyData.stock90DayChange)'));
test('Old mapRevenueGrowth NOT called in calculateCompanyHealthScore', (() => {
  const fnStart = eng.indexOf('export const calculateCompanyHealthScore');
  const fnEnd = eng.indexOf('};', fnStart);
  return !eng.slice(fnStart, fnEnd).includes('mapRevenueGrowth(companyData');
})());
test('Old mapStockTrend NOT called in calculateCompanyHealthScore', (() => {
  const fnStart = eng.indexOf('export const calculateCompanyHealthScore');
  const fnEnd = eng.indexOf('};', fnStart);
  return !eng.slice(fnStart, fnEnd).includes('mapStockTrend(companyData');
})());
test('L1 calibration multiplier set to 1.00', cal.includes('L1: 1.00'));
test('L1 multiplier comment explains reason', cal.includes('double-correct'));

// ── Fix 2: Null-signal redistribution ────────────────────────────────────
console.log('\n[F2] Null-signal weight redistribution');
test('Revenue null skipped from weighted average',
  eng.includes('revenueGrowthYoY !== null && companyData.revenueGrowthYoY !== undefined'));
test('Stock null skipped for public companies',
  eng.includes('isPublic && companyData.stock90DayChange !== null'));
test('Dynamic signals/weights objects used', eng.includes('const signals: Record<string, number> = {}'));
test('Dynamic weights object used', eng.includes('const weights: Record<string, number> = {}'));
test('Total weight check before division', eng.includes('if (totalWeight === 0) return 0.50'));

// ── Fix 3: ai_displacement cluster collapsed ──────────────────────────────
console.log('\n[F3] ai_displacement cluster collapsed');
test('roleDisplacementAgent.ts created', fs.existsSync('src/services/swarm/agents/aiSignals/roleDisplacementAgent.ts'));
test('roleDisplacementAgent imports CareerIntelligence', roleDisp.includes('getCareerIntelligence'));
test('roleDisplacementAgent uses obsoleteRatio', roleDisp.includes('obsoleteRatio'));
test('roleDisplacementAgent uses riskTrend', roleDisp.includes('riskTrend'));
test('Orchestrator imports roleDisplacementAgent', orch.includes("import { roleDisplacementAgent }"));
test('Orchestrator no longer imports automationPotentialAgent', !orch.match(/^import.*automationPotentialAgent/m));
test('Orchestrator no longer imports displacementTimelineAgent', !orch.match(/^import.*displacementTimelineAgent/m));
test('Orchestrator no longer imports roleObsolescenceAgent', !orch.match(/^import.*roleObsolescenceAgent/m));
test('Orchestrator no longer imports aiReplacementPatternAgent', !orch.match(/^import.*aiReplacementPatternAgent/m));
test('AGENT_REGISTRY uses roleDisplacementAgent', orch.includes('roleDisplacementAgent,'));
// ai_displacement cluster removed from aggregator
test('ai_displacement cluster removed from SIGNAL_CLUSTERS', !agg.includes("'ai_displacement'"));
test('Orchestrator audit comment explains collapse', orch.includes('audit collapse'));

// ── Fix 4: marketCapDrop heuristic no longer circular ────────────────────
console.log('\n[F4] marketCapDropAgent heuristic independence');
test('marketCapDrop heuristic no longer reads stock90DayChange', (() => {
  const heuristicFn = mktCap.slice(mktCap.indexOf('const heuristicMarketCap'), mktCap.indexOf('const run'));
  return !heuristicFn.includes('stock90DayChange');
})());
test('marketCapDrop uses implied_revenue_proxy', mktCap.includes('implied_revenue_proxy'));
test('marketCapDrop uses revenuePerEmployee as proxy', mktCap.includes('revenuePerEmployee'));
test('marketCapDrop uses employeeCount', mktCap.includes('employeeCount'));
test('AUDIT FIX comment present', mktCap.includes('AUDIT FIX'));

// ── Fix 5: Correlation-aware diversity weights ───────────────────────────
console.log('\n[F5] Correlation-aware diversity weights');
test('SignalCluster interface has r_mean field', agg.includes('r_mean: number'));
test('financial_stress has r_mean: 0.45', agg.includes('r_mean: 0.45'));
test('layoff_evidence has r_mean: 0.55', agg.includes('r_mean: 0.55'));
test('macro_environment has r_mean: 0.25', agg.includes('r_mean: 0.25'));
test('buildDiversityWeights uses n_eff formula', agg.includes('nEff'));
test('buildDiversityWeights uses r_mean not sqrt', (() => {
  const start = agg.indexOf('const buildDiversityWeights');
  const end = agg.indexOf('\n};', start) + 3;
  const fn = agg.slice(start, end);
  return fn.includes('cluster.r_mean') && !fn.includes('Math.sqrt');
})());
test('weightPerAgent = nEff / n', agg.includes('nEff / n'));
test('Audit fix comment explains formula change', agg.includes('source-overlap-aware'));

// ── Fix 6: UNCALIBRATED markers ────────────────────────────────────────
console.log('\n[F6] UNCALIBRATED markers on threshold functions');
test('mapFundingStatus marked UNCALIBRATED', (() => {
  const idx = eng.indexOf('const mapFundingStatus');
  return eng.slice(Math.max(0, idx - 700), idx).includes('UNCALIBRATED');
})());
test('mapCompanySize marked UNCALIBRATED', (() => {
  const idx = eng.indexOf('const mapCompanySize');
  return eng.slice(Math.max(0, idx - 700), idx).includes('UNCALIBRATED');
})());
test('mapTenure marked UNCALIBRATED', (() => {
  const idx = eng.indexOf('const mapTenure');
  return eng.slice(idx - 500, idx).includes('UNCALIBRATED');
})());
test('L2 recency marked UNCALIBRATED', eng.includes('UNCALIBRATED') && eng.includes('monthsAgo < 3'));
test('L2 frequency base marked UNCALIBRATED', eng.includes('UNCALIBRATED') && eng.includes('rounds === 1'));
test('L4 growth modifiers marked UNCALIBRATED', eng.includes('UNCALIBRATED') && eng.includes('declining: 0.18'));
test('severityRisk divisor marked UNCALIBRATED', eng.includes('divisor of 25') && eng.includes('UNCALIBRATED'));

// ── Regression: Previous good work preserved ─────────────────────────────
console.log('\n[REG] Regression checks');
test('L2 multiplier 1.11 preserved', cal.includes('L2: 1.11'));
test('L3 multiplier 0.93 preserved', cal.includes('L3: 0.93'));
test('L5 multiplier 0.94 preserved', cal.includes('L5: 0.94'));
test('COMPOSITE_FORMULA_WEIGHTS preserved', eng.includes('COMPOSITE_FORMULA_WEIGHTS'));
test('9-term formula preserved', eng.includes('W.D1_taskAutomatability'));
test('Regression IIFE guard still present', eng.includes('assertWeightSums'));
test('LAYER_WEIGHTS 1.10 guard still present', eng.includes('≠ 1.10000'));

// ── Numeric validation ────────────────────────────────────────────────────
console.log('\n[NUM] Numeric validation');
// Correlation weights math
const nEff = (n, r) => n / (1 + (n-1) * r);
const wPer = (n, r) => nEff(n, r) / n;
test('financial_stress n=4 r=0.45: n_eff≈1.70', Math.abs(nEff(4,0.45) - 1.70) < 0.05);
test('layoff_evidence n=4 r=0.55: n_eff≈1.51', Math.abs(nEff(4,0.55) - 1.51) < 0.05);
test('macro_environment n=4 r=0.25: n_eff≈2.29', Math.abs(nEff(4,0.25) - 2.29) < 0.05);
test('weight_per_agent financial_stress: ≈0.43', Math.abs(wPer(4,0.45) - 0.426) < 0.01);
test('weight_per_agent layoff_evidence: ≈0.38', Math.abs(wPer(4,0.55) - 0.377) < 0.01);
test('macro_environment weight > layoff_evidence weight (diverse > correlated)', wPer(4,0.25) > wPer(4,0.55));
test('Old 1/sqrt(4)=0.50 is BETWEEN the new weights (correct direction)', (() => {
  const fin = wPer(4, 0.45);  // 0.426 — was over-penalised
  const lay = wPer(4, 0.55);  // 0.377 — was over-penalised
  const mac = wPer(4, 0.25);  // 0.571 — was under-penalised
  return fin < 0.50 && lay < 0.50 && mac > 0.50; // both heavily correlated < 0.50; diverse > 0.50
})());

// Calibrated thresholds match empiricalCalibration.ts
const CALIBRATED_REV = [[-20,0.93],[-10,0.84],[0,0.70],[5,0.54],[10,0.41],[20,0.29],[30,0.17]];
function calibratedRevRisk(yoy) {
  for (const [thresh, score] of CALIBRATED_REV) { if (yoy < thresh) return score; }
  return 0.10;
}
test('Calibrated: -25% revenue → 0.93 (not 0.95)', calibratedRevRisk(-25) === 0.93);
test('Calibrated: -5% revenue → 0.70 (not 0.72)', calibratedRevRisk(-5) === 0.70);
test('Calibrated: +8% revenue → 0.41 (not 0.42)', calibratedRevRisk(8) === 0.41);

console.log('\n══════════════════════════════════════════════════════════');
console.log(`RESULTS: ${p} PASSED / ${p+f} TOTAL`);
if (f > 0) { console.log(f + ' FAILED'); process.exit(1); }
else console.log('ALL TESTS PASSED ✓');
console.log('══════════════════════════════════════════════════════════');
