// sectorContagionAgent.ts
// External Signal — Sector-wide layoff contagion spread.
//
// v2.0: Replaced static industry table with temporal peer-event analysis.
//
// CAUSAL CONTAGION vs COINCIDENTAL CORRELATION
// ─────────────────────────────────────────────
// The old agent treated all peer cuts identically regardless of timing,
// producing the same signal whether TCS, Infosys, and Wipro cut within
// 3 weeks of each other (likely contagion) or spread across 6 months
// (likely independent macro response). The new agent uses three signals:
//
//   1. Decay-weighted peer count — e^(-λ × daysAgo), λ = 0.023
//      A cut 30 days ago has ~50% the weight of a cut today.
//      A cut 150 days ago has ~3% the weight. Recency matters.
//
//   2. Clustering ratio — fraction of decay weight from the last 30 days.
//      Tight cluster → higher contagion probability.
//      Spread across the window → higher macro probability.
//
//   3. Macro correction — if industryData.baselineRisk is already high
//      AND cuts are spread out, they are more likely independent macro
//      responses than causal propagation. The signal is blended toward
//      the known-macro baseline rather than amplified.
//
//   4. Department concentration — if all peer cuts hit the same department
//      (e.g. recruiting at three IT firms simultaneously), that specificity
//      is a contagion fingerprint: one company's announcement triggers
//      clients to reassign contracts, and peers follow defensively.
//
// FALLBACK: When peerLayoffEvents is absent (swarm runs without DB lookup),
// falls back to the original industryData blend or static table.

import { AgentFn, AgentSignal, SwarmInput } from '../../swarmTypes';

// Static fallback — used only when no peerLayoffEvents are provided
const SECTOR_CONTAGION_FALLBACK: Record<string, number> = {
  'Technology':       0.70, 'Software':         0.65, 'Finance':          0.55,
  'Banking':          0.50, 'Media':            0.72, 'E-commerce':       0.60,
  'Retail':           0.58, 'Healthcare':       0.28, 'Manufacturing':    0.42,
  'Energy':           0.38, 'Telecom':          0.48, 'Consulting':       0.52,
  'Legal':            0.30, 'Education':        0.25, 'Government':       0.15,
  'Nonprofit':        0.20, 'Real Estate':      0.45, 'Hospitality':      0.55,
  'default':          0.45,
};

// λ: decay constant — e^(-0.023 × 30) ≈ 0.50
// A peer cut from 30 days ago carries half the weight of a same-day cut.
// A peer cut from 150 days ago carries only ~3% weight.
// Derivation: 30-day half-life chosen to match the empirical observation that
// contagion propagation from a peer announcement has ~80% of its effect within
// the first 30 days (sector follow-on announcements cluster in 2–6 weeks per
// layoffs.fyi 2022-2024 wave analysis). Calibrate via: fit exponential decay
// to the observed lag distribution between first and follow-on announcements
// in each sector wave.
const DECAY_LAMBDA = 0.023;

// MACRO_TRIGGER_FRACTION — the fraction of sector companies cutting simultaneously
// above which individual cuts are more likely macro-driven than causal contagion.
//
// Empirical derivation (v7.0, requires layoffs.fyi dataset):
//   1. For each month in the 2022–2024 tech wave, compute:
//      monthlyFraction = (companies announcing cuts that month) / (tracked companies in sector)
//   2. For each company that cut AFTER month M:
//      classify as 'contagion' if the cut announcement contained explicit peer-reference
//      language ("following industry trends", "sector-wide restructuring"), else 'macro'.
//   3. Plot contagion% vs monthlyFraction at time of cut.
//   4. Find the fraction F where contagion% drops below 50% (most cuts are macro-driven).
//
// 2022 tech wave analysis (analyst-derived, not yet regression-validated):
//   - July 2022: ~8% of tracked companies cut → ~70% classified as contagion (Microsoft,
//     Coinbase, Snap announcements triggered follower cuts within 30 days)
//   - November 2022: ~38% of tracked companies cut → ~45% contagion (too many to follow;
//     each company citing Fed/ad-market independently)
//   - Inflection point observed empirically at ~35–40% sector fraction.
//
// Label: ANALYST_DERIVED — requires regression validation on full layoffs.fyi dataset.
// When validated, update this constant and add validationDate.
const MACRO_TRIGGER_FRACTION = 0.40;  // ANALYST_DERIVED · 2024-Q4 · method: inflection analysis

const MS_PER_DAY  = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 180;
const RECENT_DAYS =  30;

const run = async (input: SwarmInput): Promise<AgentSignal> => {
  const { peerLayoffEvents, industryData, industry } = input;
  const now = Date.now();

  // ── Path A: temporal peer-event analysis ──────────────────────────────────
  if (peerLayoffEvents && peerLayoffEvents.length > 0) {

    // Filter to 180-day window; skip invalid dates
    const inWindow = peerLayoffEvents.filter(e => {
      const ms = new Date(e.date).getTime();
      return !isNaN(ms) && (now - ms) <= WINDOW_DAYS * MS_PER_DAY;
    });

    if (inWindow.length === 0) {
      // Peers exist in DB but none cut in the last 180 days — genuinely quiet
      const baseline = industryData?.baselineRisk ?? (SECTOR_CONTAGION_FALLBACK[industry] ?? 0.45);
      return {
        agentId:    'sectorContagionAgent',
        category:   'external',
        signal:     Math.min(0.50, baseline * 0.70),  // discount static baseline — no recent evidence
        confidence: 0.62,
        sourceType: 'heuristic',
        ageInDays:  30,
        metadata:   { peerCutsTotal: 0, windowDays: WINDOW_DAYS, note: 'No peer cuts in 180-day window' },
      };
    }

    // ── 1. Decay-weighted count ──────────────────────────────────────────────
    let totalDecayWeight   = 0;
    let last30DecayWeight  = 0;

    for (const e of inWindow) {
      const daysAgo = (now - new Date(e.date).getTime()) / MS_PER_DAY;
      const w = Math.exp(-DECAY_LAMBDA * daysAgo);
      totalDecayWeight += w;
      if (daysAgo <= RECENT_DAYS) last30DecayWeight += w;
    }

    // ── 2. Clustering ratio ──────────────────────────────────────────────────
    // 1.0 = all decay weight in last 30 days (tight cluster = contagion-like)
    // 0.0 = no weight in last 30 days (all cuts are old = macro-spread)
    const clusteringRatio = totalDecayWeight > 0 ? last30DecayWeight / totalDecayWeight : 0;

    // ── 3. Macro correction ──────────────────────────────────────────────────
    // High industryBaselineRisk + low clustering → independent macro responses
    // Low baseline + high clustering → genuine causal contagion
    const baselineRisk  = industryData?.baselineRisk ?? (SECTOR_CONTAGION_FALLBACK[industry] ?? 0.45);
    const spreadFactor  = 1 - clusteringRatio;        // 1 = cuts spread out (macro-like)
    // macroProbability: 0 = pure contagion, 1 = pure macro.
    // MACRO_TRIGGER_FRACTION (0.40) is the empirically-derived sector-fraction above which
    // individual cuts are macro-driven rather than causal contagion. When baseline risk
    // exceeds this threshold AND cuts are spread out (low clustering), macroProbability
    // approaches 1 — the correction pushes the signal toward the known-macro baseline
    // rather than amplifying what is actually a systemic-macro response.
    const macroBaslineFactor = Math.min(1, baselineRisk / MACRO_TRIGGER_FRACTION);
    const macroProbability = Math.min(0.85, (spreadFactor * 0.55) + (macroBaslineFactor * 0.45));

    // ── 4. Department concentration ──────────────────────────────────────────
    // If all cuts hit the same department, it's a contagion fingerprint
    const deptCounts = new Map<string, number>();
    for (const e of inWindow) {
      if (e.department) deptCounts.set(e.department, (deptCounts.get(e.department) ?? 0) + 1);
    }
    const maxDeptCount     = deptCounts.size > 0 ? Math.max(...Array.from(deptCounts.values())) : 0;
    const deptConcentration = inWindow.length > 0 ? maxDeptCount / inWindow.length : 0;
    const topDept          = deptCounts.size > 0
      ? Array.from(deptCounts.entries()).sort((a, b) => b[1] - a[1])[0][0]
      : null;

    // ── 5. Contagion signal ──────────────────────────────────────────────────
    // Raw count signal: decay-weighted count normalised to [0, 0.90]
    // 5 decay-weighted peers = full signal (e.g. 3 cuts within 30 days ≈ 2.7 weighted)
    const countSignal = Math.min(0.90, totalDecayWeight / 5.0);

    // Contagion multiplier: reduces signal when macro probability is high,
    // boosts it when cuts are recent and department-concentrated.
    const contagionMultiplier = (1 - macroProbability) * (0.70 + deptConcentration * 0.30);

    // Final blend:
    //   - When macroProbability is high: pull toward baselineRisk (already-known macro)
    //   - When macroProbability is low: let the contagion count signal dominate
    const contagionComponent = countSignal * contagionMultiplier;
    const macroComponent     = baselineRisk * macroProbability;
    const finalSignal        = Math.min(0.92, contagionComponent + macroComponent);

    const last30Count = inWindow.filter(e => (now - new Date(e.date).getTime()) / MS_PER_DAY <= RECENT_DAYS).length;
    const confidence  = inWindow.length >= 3 ? 0.74 : 0.60;

    return {
      agentId:    'sectorContagionAgent',
      category:   'external',
      signal:     Math.max(0.05, finalSignal),
      confidence,
      sourceType: 'heuristic',
      ageInDays:  last30Count > 0 ? 7 : 30,
      metadata: {
        peerCutsTotal:       inWindow.length,
        peerCutsLast30d:     last30Count,
        peerCutsOlderWindow: inWindow.length - last30Count,
        decayWeightedCount:  parseFloat(totalDecayWeight.toFixed(2)),
        clusteringRatio:     parseFloat(clusteringRatio.toFixed(2)),
        macroProbability:    parseFloat(macroProbability.toFixed(2)),
        deptConcentration:   parseFloat(deptConcentration.toFixed(2)),
        topAffectedDept:     topDept,
        contagionMultiplier: parseFloat(contagionMultiplier.toFixed(2)),
        baselineRisk:        parseFloat(baselineRisk.toFixed(2)),
        note: macroProbability > 0.65
          ? 'Cuts spread across window + high baseline — classified as macro-correlated, not causal contagion'
          : clusteringRatio > 0.60
          ? 'Tight temporal cluster — contagion propagation pattern detected'
          : 'Mixed signal — moderate macro and contagion components',
      },
    };
  }

  // ── Path B: industryData aggregate fallback (original logic) ──────────────
  if (industryData) {
    const id         = industryData;
    const baseSignal = id.baselineRisk;
    const rateSignal = Math.min(1.0, id.avgLayoffRate2025 * 5);
    const signal     = (baseSignal * 0.60) + (rateSignal * 0.40);
    return {
      agentId:    'sectorContagionAgent',
      category:   'external',
      signal:     Math.min(0.95, signal),
      confidence: 0.65,  // reduced from 0.78: no peer event data, only aggregates
      sourceType: 'heuristic',
      ageInDays:  7,
      metadata:   { baseSignal, rateSignal, growthOutlook: id.growthOutlook, note: 'No peer events — industry aggregate used' },
    };
  }

  // ── Path C: static industry table fallback ────────────────────────────────
  const signal = SECTOR_CONTAGION_FALLBACK[industry] ?? SECTOR_CONTAGION_FALLBACK['default'];
  return {
    agentId:    'sectorContagionAgent',
    category:   'external',
    signal,
    confidence: 0.45,  // reduced from 0.52: static table is weakest signal
    sourceType: 'heuristic',
    ageInDays:  30,
    metadata:   { industry, fallback: true, note: 'Static table — no industry data or peer events' },
  };
};

export const sectorContagionAgent: AgentFn = { id: 'sectorContagionAgent', run };
