// synthetic-probe/index.ts
//
// Periodic validation of the scoring engine against known-state test scenarios.
//
// WHY THIS EXISTS
// ───────────────
// Formula bugs, weight drift, and calibration constant changes can silently
// degrade scoring accuracy. User complaints are the last line of defence —
// and by then the damage is done. Synthetic probes are the FIRST line:
// deterministic inputs → known expected outputs → deviation triggers alert.
//
// HOW IT WORKS
// ────────────
// 7 hardcoded scenarios with fully deterministic ConsensusData signals cover
// the full score range (17–82) and each probe tests a different dominant
// formula path (L1 financial, D1 role displacement, D4 tenure, etc.).
// For each scenario, the probe calls calculate-hybrid-risk with the hardcoded
// signals and compares the actual score against the pre-computed expected range.
//
// Expected ranges are computed from the current formula at probe design time.
// If the formula changes in a way that shifts outputs, the golden ranges
// catch it — even if the change was intentional, ops must widen the range
// after verifying the new behavior is correct.
//
// ALERT THRESHOLDS
// ────────────────
// Deviation > 5 pts from expected midpoint:  WARNING  → alert row written
// Deviation > 10 pts from expected midpoint: CRITICAL → alert + immediate flag
//
// CI DRIFT DETECTION
// ──────────────────
// After all 7 probes run, we compute the DIRECTIONAL mean deviation across
// all probes. If >3 probes deviate in the same direction by >3 pts on average,
// this indicates a systematic calibration drift (not a single-scenario anomaly).
// Directional drift > 3 pts mean → check calibration age and flag for early
// recalibration. Directional drift > 6 pts → recommend immediate recalibration.
//
// SCHEDULE
// ────────
// Runs daily at 02:00 UTC (see migration 20260520000001_synthetic_probe_tables).
// Can also be triggered on demand via POST with a valid service role token.
//
// Env vars:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — auto-set by Supabase

import { serve }        from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: CORS });

// ── Types (mirrors calculate-hybrid-risk) ────────────────────────────────────

interface ResolvedSignal { value: number; confidence: number; }
interface ConsensusData {
  revenueGrowth?:      ResolvedSignal;
  stockTrend?:         ResolvedSignal;
  fundingHealth?:      ResolvedSignal;
  overstaffing?:       ResolvedSignal;
  recentLayoffRecency?:ResolvedSignal;
  layoffFrequency?:    ResolvedSignal;
  layoffSeverity?:     ResolvedSignal;
  departmentNews?:     ResolvedSignal;
  automationRisk?:     ResolvedSignal;
  aiToolMaturity?:     ResolvedSignal;
  humanAmplification?: ResolvedSignal;
  aiAdoptionRate?:     ResolvedSignal;
  growthOutlook?:      ResolvedSignal;
  overallConfidence?:  number;
}
interface UserFactors { roleTitle?: string; tenureYears?: number; region?: string; industry?: string; }
interface ProbeScenario {
  id:           string;
  description:  string;
  formulaPath:  string;   // which formula path this primarily tests
  expectedMin:  number;   // inclusive lower bound
  expectedMax:  number;   // inclusive upper bound
  midpoint:     number;   // (min + max) / 2 — deviation is abs(actual - midpoint)
  userFactors:  UserFactors;
  consensusData: ConsensusData;
}

// ── 7 hardcoded probe scenarios ───────────────────────────────────────────────
//
// Expected scores computed from the composite formula in calculate-hybrid-risk
// at probe design time (2026-05-20). If the formula changes, these ranges must
// be updated after verifying the new behavior is intentional.
//
// Formula weights (W):
//   D1=0.18  D2=0.14  D3=0.09  D4=0.18  D6=0.04  D7=0.06  D8=0.09
//   L1=0.16  L2=0.06  (sum=1.00)
//
// Per-role D1 values used:
//   'data entry clerk' / 'customer support representative': 0.88
//   'content writer': 0.78
//   'financial analyst': 0.72
//   'product manager': 0.42
//   'software engineer': 0.48
//   'cybersecurity engineer': 0.25
//
// Per-tenure D4 values:
//   1y→0.65  2y→0.65  3y→0.50  5y→0.35  20y→0.18

const PROBE_SCENARIOS: ProbeScenario[] = [
  {
    id: 'FULL_CRISIS',
    description: 'High-risk role with extreme company distress — tests upper bound and formula maximum',
    formulaPath:  'D1_max + D2_max + L1_max + L2_max',
    expectedMin:  77,
    expectedMax:  87,
    midpoint:     82,
    userFactors:  { roleTitle: 'customer support representative', tenureYears: 1 },
    consensusData: {
      stockTrend:          { value: 0.92, confidence: 0.85 },
      revenueGrowth:       { value: 0.88, confidence: 0.85 },
      overstaffing:        { value: 0.75, confidence: 0.80 },
      fundingHealth:       { value: 0.15, confidence: 0.80 },
      recentLayoffRecency: { value: 0.92, confidence: 0.90 },
      layoffFrequency:     { value: 0.90, confidence: 0.90 },
      layoffSeverity:      { value: 0.85, confidence: 0.85 },
      aiToolMaturity:      { value: 0.92, confidence: 0.85 },
      automationRisk:      { value: 0.88, confidence: 0.85 },
      aiAdoptionRate:      { value: 0.85, confidence: 0.80 },
      humanAmplification:  { value: 0.85, confidence: 0.80 },
      growthOutlook:       { value: 0.88, confidence: 0.80 },
      departmentNews:      { value: 0.80, confidence: 0.75 },
      overallConfidence: 0.84,
    },
  },
  {
    id: 'ALL_SAFE',
    description: 'Protected role in a stable company — tests lower bound and formula minimum path',
    formulaPath:  'D1_min + D4_min + L1_min + L2_min',
    expectedMin:  12,
    expectedMax:  22,
    midpoint:     17,
    userFactors:  { roleTitle: 'cybersecurity engineer', tenureYears: 20 },
    consensusData: {
      stockTrend:          { value: 0.08, confidence: 0.85 },
      revenueGrowth:       { value: 0.06, confidence: 0.85 },
      overstaffing:        { value: 0.10, confidence: 0.80 },
      fundingHealth:       { value: 0.90, confidence: 0.85 },
      recentLayoffRecency: { value: 0.05, confidence: 0.90 },
      layoffFrequency:     { value: 0.04, confidence: 0.90 },
      layoffSeverity:      { value: 0.04, confidence: 0.85 },
      aiToolMaturity:      { value: 0.15, confidence: 0.80 },
      automationRisk:      { value: 0.10, confidence: 0.80 },
      aiAdoptionRate:      { value: 0.15, confidence: 0.80 },
      humanAmplification:  { value: 0.10, confidence: 0.80 },
      growthOutlook:       { value: 0.08, confidence: 0.80 },
      departmentNews:      { value: 0.08, confidence: 0.75 },
      overallConfidence: 0.85,
    },
  },
  {
    id: 'NEUTRAL_BASELINE',
    description: 'All signals at 0.5 neutral — tests formula constant term and weight normalization',
    formulaPath:  'formula_constants',
    expectedMin:  45,
    expectedMax:  55,
    midpoint:     50,
    userFactors:  { roleTitle: 'software engineer', tenureYears: 3 },
    consensusData: {
      stockTrend:          { value: 0.5, confidence: 0.70 },
      revenueGrowth:       { value: 0.5, confidence: 0.70 },
      overstaffing:        { value: 0.5, confidence: 0.70 },
      fundingHealth:       { value: 0.5, confidence: 0.70 },
      recentLayoffRecency: { value: 0.5, confidence: 0.70 },
      layoffFrequency:     { value: 0.5, confidence: 0.70 },
      layoffSeverity:      { value: 0.5, confidence: 0.70 },
      aiToolMaturity:      { value: 0.5, confidence: 0.70 },
      automationRisk:      { value: 0.5, confidence: 0.70 },
      aiAdoptionRate:      { value: 0.5, confidence: 0.70 },
      humanAmplification:  { value: 0.5, confidence: 0.70 },
      growthOutlook:       { value: 0.5, confidence: 0.70 },
      departmentNews:      { value: 0.5, confidence: 0.70 },
      overallConfidence: 0.70,
    },
  },
  {
    id: 'AI_DISPLACEMENT',
    description: 'Data entry role with maximal AI signals — specifically tests D1+D2+D3 weight path',
    formulaPath:  'D1_high + D2_max + D3_max',
    expectedMin:  63,
    expectedMax:  73,
    midpoint:     68,
    userFactors:  { roleTitle: 'data entry clerk', tenureYears: 5 },
    consensusData: {
      stockTrend:          { value: 0.50, confidence: 0.70 },
      revenueGrowth:       { value: 0.50, confidence: 0.70 },
      overstaffing:        { value: 0.50, confidence: 0.70 },
      fundingHealth:       { value: 0.50, confidence: 0.70 },
      recentLayoffRecency: { value: 0.50, confidence: 0.70 },
      layoffFrequency:     { value: 0.50, confidence: 0.70 },
      layoffSeverity:      { value: 0.50, confidence: 0.70 },
      aiToolMaturity:      { value: 0.92, confidence: 0.85 },
      automationRisk:      { value: 0.90, confidence: 0.85 },
      aiAdoptionRate:      { value: 0.88, confidence: 0.85 },
      humanAmplification:  { value: 0.85, confidence: 0.80 },
      growthOutlook:       { value: 0.50, confidence: 0.70 },
      departmentNews:      { value: 0.50, confidence: 0.70 },
      overallConfidence: 0.80,
    },
  },
  {
    id: 'VETERAN_PROTECTED',
    description: 'Cybersecurity role, 20y tenure, moderate company risk — tests D4 tenure protection weight',
    formulaPath:  'D4_min + D1_min + L1_moderate',
    expectedMin:  29,
    expectedMax:  39,
    midpoint:     34,
    userFactors:  { roleTitle: 'cybersecurity engineer', tenureYears: 20 },
    consensusData: {
      stockTrend:          { value: 0.60, confidence: 0.75 },
      revenueGrowth:       { value: 0.65, confidence: 0.75 },
      overstaffing:        { value: 0.55, confidence: 0.75 },
      fundingHealth:       { value: 0.45, confidence: 0.75 },
      recentLayoffRecency: { value: 0.60, confidence: 0.75 },
      layoffFrequency:     { value: 0.55, confidence: 0.75 },
      layoffSeverity:      { value: 0.50, confidence: 0.75 },
      aiToolMaturity:      { value: 0.30, confidence: 0.80 },
      automationRisk:      { value: 0.25, confidence: 0.80 },
      aiAdoptionRate:      { value: 0.30, confidence: 0.80 },
      humanAmplification:  { value: 0.30, confidence: 0.80 },
      growthOutlook:       { value: 0.55, confidence: 0.75 },
      departmentNews:      { value: 0.45, confidence: 0.75 },
      overallConfidence: 0.76,
    },
  },
  {
    id: 'LAYOFF_CONTENT',
    description: 'Content writer at a company with recent layoffs + high AI adoption — tests D1+D2 + L2 combined',
    formulaPath:  'D1_high + D2_high + L1_moderate + L2_high',
    expectedMin:  68,
    expectedMax:  78,
    midpoint:     73,
    userFactors:  { roleTitle: 'content writer', tenureYears: 2 },
    consensusData: {
      stockTrend:          { value: 0.68, confidence: 0.80 },
      revenueGrowth:       { value: 0.72, confidence: 0.80 },
      overstaffing:        { value: 0.62, confidence: 0.75 },
      fundingHealth:       { value: 0.42, confidence: 0.75 },
      recentLayoffRecency: { value: 0.82, confidence: 0.85 },
      layoffFrequency:     { value: 0.78, confidence: 0.85 },
      layoffSeverity:      { value: 0.72, confidence: 0.80 },
      aiToolMaturity:      { value: 0.85, confidence: 0.85 },
      automationRisk:      { value: 0.82, confidence: 0.85 },
      aiAdoptionRate:      { value: 0.80, confidence: 0.85 },
      humanAmplification:  { value: 0.72, confidence: 0.80 },
      growthOutlook:       { value: 0.62, confidence: 0.75 },
      departmentNews:      { value: 0.58, confidence: 0.75 },
      overallConfidence: 0.82,
    },
  },
  {
    id: 'FUNDING_CRISIS',
    description: 'Financial analyst at a startup with funding crisis — tests L1 fundingHealth path',
    formulaPath:  'L1_fundingHealth_max + D1_moderate',
    expectedMin:  56,
    expectedMax:  66,
    midpoint:     61,
    userFactors:  { roleTitle: 'financial analyst', tenureYears: 2 },
    consensusData: {
      stockTrend:          { value: 0.55, confidence: 0.75 },
      revenueGrowth:       { value: 0.62, confidence: 0.75 },
      overstaffing:        { value: 0.45, confidence: 0.70 },
      fundingHealth:       { value: 0.92, confidence: 0.85 },  // very poor funding
      recentLayoffRecency: { value: 0.40, confidence: 0.70 },
      layoffFrequency:     { value: 0.35, confidence: 0.70 },
      layoffSeverity:      { value: 0.30, confidence: 0.70 },
      aiToolMaturity:      { value: 0.55, confidence: 0.75 },
      automationRisk:      { value: 0.60, confidence: 0.75 },
      aiAdoptionRate:      { value: 0.55, confidence: 0.75 },
      humanAmplification:  { value: 0.60, confidence: 0.75 },
      growthOutlook:       { value: 0.65, confidence: 0.75 },
      departmentNews:      { value: 0.55, confidence: 0.70 },
      overallConfidence: 0.76,
    },
  },
  // ── Global market probes (added v40.0 — 2026-06-23) ────────────────────────
  // These 4 scenarios specifically test D1 country multiplier paths and global
  // market calibration. A miscalibrated Germany/India/Singapore/UAE multiplier
  // would pass all 7 original probes but fail at least one of these.
  //
  // Expected scores computed from the EF formula at probe design time (2026-06-23):
  //   INDIA_IT:    raw=0.62140 → 62 ± 7  [55, 69]
  //   DE_AUTO:     raw=0.51452 → 51 ± 7  [44, 58]
  //   SG_GCC:      raw=0.60447 → 60 ± 7  [53, 67]
  //   MENA_UAE:    raw=0.64443 → 64 ± 7  [57, 71]
  {
    id: 'INDIA_IT_BENCH_RISK',
    description: 'India IT Services QA engineer on bench — tests IN client-side D1 multiplier (0.875) path',
    formulaPath:  'D1_IN_QA_IT_services + D2_high + D3_moderate + L1_moderate',
    expectedMin:  55,
    expectedMax:  69,
    midpoint:     62,
    userFactors:  { roleTitle: 'qa engineer', tenureYears: 3, region: 'IN', industry: 'IT Services' },
    consensusData: {
      stockTrend:          { value: 0.55, confidence: 0.70 },
      revenueGrowth:       { value: 0.60, confidence: 0.70 },
      overstaffing:        { value: 0.65, confidence: 0.75 },  // bench = overstaffed
      fundingHealth:       { value: 0.45, confidence: 0.70 },
      recentLayoffRecency: { value: 0.50, confidence: 0.70 },
      layoffFrequency:     { value: 0.45, confidence: 0.70 },
      layoffSeverity:      { value: 0.40, confidence: 0.70 },
      aiToolMaturity:      { value: 0.82, confidence: 0.80 },  // client-side AI tools high
      automationRisk:      { value: 0.78, confidence: 0.80 },
      aiAdoptionRate:      { value: 0.76, confidence: 0.80 },
      humanAmplification:  { value: 0.72, confidence: 0.75 },
      growthOutlook:       { value: 0.55, confidence: 0.70 },
      departmentNews:      { value: 0.50, confidence: 0.70 },
      overallConfidence: 0.74,
    },
  },
  {
    id: 'DE_AUTOMOTIVE_AUTOMATION',
    description: 'Germany automotive QA role — tests DE Betriebsrat D1 gate (0.844), lowest EU multiplier',
    formulaPath:  'D1_DE_QA_betriebsrat + D2_high + D3_low + L1_moderate',
    expectedMin:  44,
    expectedMax:  58,
    midpoint:     51,
    userFactors:  { roleTitle: 'qa engineer', tenureYears: 5, region: 'DE', industry: 'Automotive' },
    consensusData: {
      stockTrend:          { value: 0.55, confidence: 0.75 },
      revenueGrowth:       { value: 0.58, confidence: 0.75 },
      overstaffing:        { value: 0.45, confidence: 0.70 },
      fundingHealth:       { value: 0.50, confidence: 0.75 },
      recentLayoffRecency: { value: 0.40, confidence: 0.70 },
      layoffFrequency:     { value: 0.35, confidence: 0.70 },
      layoffSeverity:      { value: 0.30, confidence: 0.70 },
      aiToolMaturity:      { value: 0.78, confidence: 0.80 },  // high industry AI maturity
      automationRisk:      { value: 0.40, confidence: 0.75 },  // Betriebsrat slows deployment
      aiAdoptionRate:      { value: 0.42, confidence: 0.75 },
      humanAmplification:  { value: 0.45, confidence: 0.75 },
      growthOutlook:       { value: 0.52, confidence: 0.72 },
      departmentNews:      { value: 0.48, confidence: 0.70 },
      overallConfidence: 0.74,
    },
  },
  {
    id: 'SG_GCC_PARENT_CONTAGION',
    description: 'Singapore software engineer at GCC subsidiary — tests SG AISG multiplier (0.916) + L1 contagion',
    formulaPath:  'D1_SG_SW_aisg + L1_high_contagion + D4_moderate',
    expectedMin:  53,
    expectedMax:  67,
    midpoint:     60,
    userFactors:  { roleTitle: 'software engineer', tenureYears: 2, region: 'SG', industry: 'Financial Services' },
    consensusData: {
      stockTrend:          { value: 0.72, confidence: 0.80 },  // GCC parent distress
      revenueGrowth:       { value: 0.68, confidence: 0.80 },
      overstaffing:        { value: 0.55, confidence: 0.75 },
      fundingHealth:       { value: 0.40, confidence: 0.75 },
      recentLayoffRecency: { value: 0.35, confidence: 0.70 },
      layoffFrequency:     { value: 0.30, confidence: 0.70 },
      layoffSeverity:      { value: 0.28, confidence: 0.70 },
      aiToolMaturity:      { value: 0.72, confidence: 0.80 },  // AISG-driven
      automationRisk:      { value: 0.70, confidence: 0.80 },
      aiAdoptionRate:      { value: 0.68, confidence: 0.80 },
      humanAmplification:  { value: 0.65, confidence: 0.78 },
      growthOutlook:       { value: 0.62, confidence: 0.75 },
      departmentNews:      { value: 0.58, confidence: 0.72 },
      overallConfidence: 0.76,
    },
  },
  {
    id: 'MENA_UAE_FINANCIAL_DISTRESS',
    description: 'UAE financial analyst at distressed company — tests AE D1 default (0.899) + L1 financial crisis',
    formulaPath:  'D1_AE_default + L1_high_revenue_stock_distress + D4_junior',
    expectedMin:  57,
    expectedMax:  71,
    midpoint:     64,
    userFactors:  { roleTitle: 'financial analyst', tenureYears: 2, region: 'AE', industry: 'Financial Services' },
    consensusData: {
      stockTrend:          { value: 0.78, confidence: 0.80 },  // heavy stock decline
      revenueGrowth:       { value: 0.72, confidence: 0.80 },
      overstaffing:        { value: 0.50, confidence: 0.70 },
      fundingHealth:       { value: 0.62, confidence: 0.78 },
      recentLayoffRecency: { value: 0.45, confidence: 0.72 },
      layoffFrequency:     { value: 0.40, confidence: 0.70 },
      layoffSeverity:      { value: 0.35, confidence: 0.70 },
      aiToolMaturity:      { value: 0.65, confidence: 0.78 },
      automationRisk:      { value: 0.68, confidence: 0.78 },
      aiAdoptionRate:      { value: 0.62, confidence: 0.75 },
      humanAmplification:  { value: 0.60, confidence: 0.75 },
      growthOutlook:       { value: 0.68, confidence: 0.75 },
      departmentNews:      { value: 0.55, confidence: 0.70 },
      overallConfidence: 0.76,
    },
  },
];

// ── Probe execution ───────────────────────────────────────────────────────────

interface ProbeResult {
  scenarioId:     string;
  actualScore:    number | null;
  expectedMin:    number;
  expectedMax:    number;
  midpoint:       number;
  deviation:      number | null;  // abs(actual - midpoint)
  signedDeviation:number | null;  // actual - midpoint (positive = scored higher than expected)
  passed:         boolean;
  alertLevel:     'none' | 'warning' | 'critical';
  error:          string | null;
}

async function runProbeScenario(
  scenario: ProbeScenario,
  scoringUrl: string,
  serviceKey: string,
): Promise<ProbeResult> {
  const base: ProbeResult = {
    scenarioId:      scenario.id,
    actualScore:     null,
    expectedMin:     scenario.expectedMin,
    expectedMax:     scenario.expectedMax,
    midpoint:        scenario.midpoint,
    deviation:       null,
    signedDeviation: null,
    passed:          false,
    alertLevel:      'none',
    error:           null,
  };

  try {
    const res = await fetch(scoringUrl, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        consensusData: scenario.consensusData,
        userFactors:   scenario.userFactors,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '(no body)');
      return { ...base, error: `HTTP ${res.status}: ${text.slice(0, 200)}` };
    }

    const payload = await res.json() as { score?: number };
    const actual  = typeof payload.score === 'number' ? Math.round(payload.score) : null;
    if (actual === null) {
      return { ...base, error: 'Response missing .score field' };
    }

    const deviation       = Math.abs(actual - scenario.midpoint);
    const signedDeviation = actual - scenario.midpoint;
    const passed          = actual >= scenario.expectedMin && actual <= scenario.expectedMax;
    const alertLevel      = deviation > 10 ? 'critical' : deviation > 5 ? 'warning' : 'none';

    return {
      ...base,
      actualScore: actual,
      deviation,
      signedDeviation,
      passed,
      alertLevel,
    };
  } catch (err) {
    return { ...base, error: String(err) };
  }
}

// ── CI drift check ────────────────────────────────────────────────────────────
//
// After all probes run, analyze the DIRECTION of deviations. A single probe
// failing could be noise. Multiple probes all drifting in the same direction
// (all scoring higher or all scoring lower) indicates a systematic calibration
// shift that single-scenario thresholds would miss.
//
// Drift thresholds:
//   |directionalMean| > 3 pts → potential drift, check calibration age
//   |directionalMean| > 6 pts → recommend immediate recalibration

interface DriftReport {
  detected:                boolean;
  direction:               'upward' | 'downward' | 'none';
  directionalMean:         number;    // mean of signed deviations (positive = all scoring high)
  probeCount:              number;
  consistentCount:         number;    // probes deviating in same direction
  calibrationAgeDays:      number | null;
  recalibrationRecommended:boolean;
  severity:                'none' | 'mild' | 'significant';
}

async function checkCIDrift(
  results: ProbeResult[],
  sb: ReturnType<typeof createClient>,
): Promise<DriftReport> {
  const scoredResults = results.filter(r => r.signedDeviation !== null);
  if (scoredResults.length === 0) {
    return {
      detected: false, direction: 'none', directionalMean: 0,
      probeCount: 0, consistentCount: 0, calibrationAgeDays: null,
      recalibrationRecommended: false, severity: 'none',
    };
  }

  const deviations = scoredResults.map(r => r.signedDeviation!);
  const directionalMean = deviations.reduce((a, b) => a + b, 0) / deviations.length;
  const absDirectional  = Math.abs(directionalMean);

  // Count how many probes deviate in the same direction as the mean
  const direction = directionalMean > 0 ? 'upward' : directionalMean < 0 ? 'downward' : 'none';
  const consistentCount = deviations.filter(d =>
    direction === 'upward' ? d > 0 : direction === 'downward' ? d < 0 : false,
  ).length;

  if (absDirectional <= 3) {
    return {
      detected: false, direction: 'none', directionalMean, probeCount: scoredResults.length,
      consistentCount, calibrationAgeDays: null, recalibrationRecommended: false, severity: 'none',
    };
  }

  // Drift detected — check calibration age
  let calibrationAgeDays: number | null = null;
  try {
    const { data } = await sb
      .from('engine_calibration_constants')
      .select('updated_at')
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data?.updated_at) {
      const ageMs = Date.now() - new Date(data.updated_at).getTime();
      calibrationAgeDays = Math.floor(ageMs / 86_400_000);
    }
  } catch {
    /* non-fatal — drift report still useful without age */
  }

  const recalibrationRecommended =
    absDirectional > 6 || (calibrationAgeDays != null && calibrationAgeDays > 60);
  const severity = absDirectional > 6 ? 'significant' : 'mild';

  return {
    detected: true,
    direction: direction as 'upward' | 'downward',
    directionalMean,
    probeCount: scoredResults.length,
    consistentCount,
    calibrationAgeDays,
    recalibrationRecommended,
    severity,
  };
}

// ── Persistence ───────────────────────────────────────────────────────────────

async function persistResults(
  runId: string,
  results: ProbeResult[],
  drift: DriftReport,
  sb: ReturnType<typeof createClient>,
): Promise<void> {
  // 1. Write synthetic_probe_runs rows
  const runs = results.map(r => ({
    run_id:                  runId,
    scenario_id:             r.scenarioId,
    expected_score_min:      r.expectedMin,
    expected_score_max:      r.expectedMax,
    expected_midpoint:       r.midpoint,
    actual_score:            r.actualScore,
    deviation:               r.deviation,
    signed_deviation:        r.signedDeviation,
    passed:                  r.passed,
    alert_level:             r.alertLevel,
    drift_check_triggered:   drift.detected,
    error_message:           r.error,
  }));
  const { error: runsErr } = await sb.from('synthetic_probe_runs').insert(runs);
  if (runsErr) console.warn('[synthetic-probe] Failed to write probe_runs:', runsErr.message);

  // 2. Write synthetic_probe_alerts for any triggered alerts
  const alerts = results
    .filter(r => r.alertLevel !== 'none')
    .map(r => ({
      run_id:         runId,
      scenario_id:    r.scenarioId,
      expected_range: `${r.expectedMin}–${r.expectedMax}`,
      actual_score:   r.actualScore,
      deviation:      r.deviation,
      alert_type:     r.error ? 'scoring_error' : 'score_deviation',
      severity:       r.alertLevel,
    }));
  if (alerts.length > 0) {
    const { error: alertErr } = await sb.from('synthetic_probe_alerts').insert(alerts);
    if (alertErr) console.warn('[synthetic-probe] Failed to write probe_alerts:', alertErr.message);
  }

  // 3. Write calibration_drift_runs if drift detected
  if (drift.detected) {
    const { error: driftErr } = await sb.from('calibration_drift_runs').insert({
      run_id:                   runId,
      drift_direction:          drift.direction,
      directional_mean_pts:     drift.directionalMean,
      probe_count:              drift.probeCount,
      consistent_direction_count: drift.consistentCount,
      calibration_age_days:     drift.calibrationAgeDays,
      recalibration_recommended: drift.recalibrationRecommended,
      severity:                 drift.severity,
    });
    if (driftErr) console.warn('[synthetic-probe] Failed to write drift_runs:', driftErr.message);
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  // Accept only service role key or internal cron calls.
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!serviceKey || token !== serviceKey) {
    return json({ error: 'Unauthorized — synthetic probe requires service role key' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  if (!supabaseUrl) return json({ error: 'SUPABASE_URL not configured' }, 503);

  const sb = createClient(supabaseUrl, serviceKey);

  const runId        = crypto.randomUUID();
  const scoringUrl   = `${supabaseUrl}/functions/v1/calculate-hybrid-risk`;
  const startedAt    = Date.now();

  console.log(`[synthetic-probe] Run ${runId} started — ${PROBE_SCENARIOS.length} scenarios`);

  // Run all probes concurrently (each has a 15s per-scenario timeout).
  // Promise.allSettled ensures one probe network failure cannot abort the whole run.
  const settled = await Promise.allSettled(
    PROBE_SCENARIOS.map(s => runProbeScenario(s, scoringUrl, serviceKey)),
  );
  const results = settled.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : {
          scenarioId:      PROBE_SCENARIOS[i].id,
          actualScore:     null,
          expectedMin:     PROBE_SCENARIOS[i].expectedMin,
          expectedMax:     PROBE_SCENARIOS[i].expectedMax,
          midpoint:        PROBE_SCENARIOS[i].midpoint,
          deviation:       null,
          signedDeviation: null,
          passed:          false,
          alertLevel:      'none' as const,
          error:           String((r as PromiseRejectedResult).reason),
        },
  );

  const passCount    = results.filter(r => r.passed).length;
  const alertCount   = results.filter(r => r.alertLevel !== 'none').length;
  const errorCount   = results.filter(r => r.error !== null).length;
  const criticalCount= results.filter(r => r.alertLevel === 'critical').length;
  const elapsedMs    = Date.now() - startedAt;

  // CI drift check — runs even if no individual probes failed, because
  // systematic drift below the per-scenario threshold is invisible otherwise
  const drift = await checkCIDrift(results, sb);

  // Persist everything
  await persistResults(runId, results, drift, sb);

  const summary = {
    runId,
    elapsedMs,
    scenarios:    PROBE_SCENARIOS.length,
    passed:       passCount,
    failed:       PROBE_SCENARIOS.length - passCount - errorCount,
    errors:       errorCount,
    alerts:       alertCount,
    criticals:    criticalCount,
    driftDetected: drift.detected,
    driftDirection: drift.direction,
    driftSeverity:  drift.severity,
    recalibrationRecommended: drift.recalibrationRecommended,
    results: results.map(r => ({
      id:         r.scenarioId,
      actual:     r.actualScore,
      expected:   `${r.expectedMin}–${r.expectedMax}`,
      deviation:  r.deviation,
      passed:     r.passed,
      alert:      r.alertLevel,
      error:      r.error,
    })),
  };

  console.log(
    `[synthetic-probe] Run ${runId} complete: ` +
    `${passCount}/${PROBE_SCENARIOS.length} passed, ` +
    `${alertCount} alerts, drift=${drift.detected ? drift.direction + '(' + drift.severity + ')' : 'none'}, ` +
    `${elapsedMs}ms`,
  );

  const statusCode = criticalCount > 0 ? 207 : 200;
  return json(summary, statusCode);
});
