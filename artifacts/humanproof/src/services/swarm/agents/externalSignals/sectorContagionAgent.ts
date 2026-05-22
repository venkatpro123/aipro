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
import { detectActiveMetroClusters } from '../../../../data/companyPeers';
// GAP-A02: route decay constant through DB so recalibrate-engine cron can override it
// without a code deploy. Falls back to BOOTSTRAP_DECAY_LAMBDA (0.023) when the DB
// key is absent or null.
import { getConstant } from '../../../../services/calibration/calibrationConstants';

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

// λ: decay constant — e^(-0.023 × 30) ≈ 0.50 → half-life ≈ 30 days.
// A peer cut from 30 days ago carries half the weight of a same-day cut.
// A peer cut from 150 days ago carries only ~3% weight.
//
// ESTIMATED (uncalibrated_placeholder) — GAP-A02.
// The 30-day half-life is a developer choice based on qualitative analysis of
// 2022-2024 sector wave timing (follow-on announcements cluster in 2-6 weeks).
// It has NOT been regression-fitted to a lag distribution. DB keys:
//   peer_contagion_decay_lambda     — canonical empirical key (migration 000021)
//   sectorContagionAgent.decayLambda — component-scoped ESTIMATED key (migration 000013)
//
// Priority: peer_contagion_decay_lambda (empirical, when calibrated) >
//           sectorContagionAgent.decayLambda (ESTIMATED) > BOOTSTRAP_DECAY_LAMBDA.
//
// Inconsistency: signalDecayModel.sector_contagion uses a 21-day half-life
// (λ≈0.033), also ESTIMATED. Both converge to a single value at July 2026
// calibration (target: fit exponential decay to lag distribution in layoffs.fyi waves).
const BOOTSTRAP_DECAY_LAMBDA = 0.023;

// GAP-A02: read canonical empirical key first; fall back to component-specific ESTIMATED key.
const _empiricalLambda = getConstant<number>('peer_contagion_decay_lambda', null);
const _dbDecayLambda   = getConstant<number>('sectorContagionAgent.decayLambda', null);
const DECAY_LAMBDA: number =
  (typeof _empiricalLambda.value === 'number' && _empiricalLambda.value > 0)
    ? _empiricalLambda.value
  : (typeof _dbDecayLambda.value === 'number' && _dbDecayLambda.value > 0)
    ? _dbDecayLambda.value
  : BOOTSTRAP_DECAY_LAMBDA;
// Expose calibration provenance in metadata so TransparencyTab can show source.
const DECAY_LAMBDA_PROVENANCE = _empiricalLambda.provenance !== 'manual_seed'
  ? _empiricalLambda.provenance
  : (_dbDecayLambda.provenance !== 'manual_seed' ? _dbDecayLambda.provenance : 'uncalibrated_placeholder');

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

// ── Metro cluster contagion amplifier ─────────────────────────────────────────
// When 2+ companies from the SAME metro tech cluster (Seattle, Bay Area, NYC,
// London, Berlin, Singapore) announce layoffs within 90 days, the geographic
// co-location creates a contagion dynamic distinct from sector-wide waves:
//   • Shared talent pool: engineers commute between cluster companies; a cut
//     at Amazon Seattle signals to Microsoft/Meta that the same talent pool
//     is about to flood the market — and pressures them to cut before rehiring.
//   • Shared clients: London FinTech companies share enterprise clients; one
//     company cutting signals contract renegotiation pressure for peers.
//   • Media + board contagion: the same investors and board members see one
//     cluster cut and approve similar measures at their other portfolio companies.
// The 1.25× amplifier is applied to the raw contagion signal (before the 0.92 cap).
// ESTIMATED — multiplier calibrated against 2022-2023 Seattle and 2023 London waves.
const CLUSTER_CONTAGION_AMPLIFIER = 1.25;
const CLUSTER_WINDOW_DAYS         = 90;

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

    // ── 3. Sector cutting fraction + macro regime detection ──────────────────
    //
    // "Simultaneously" = cuts within RECENT_DAYS (30d). We measure the fraction
    // of ALL tracked sector companies that have announced cuts in this window,
    // not just cuts relative to how many cuts occurred in 180 days.
    //
    // When sectorCuttingFraction > MACRO_TRIGGER_FRACTION (0.40):
    //   We are in a MACRO REGIME. The wave is broad enough that individual
    //   company cuts are more likely independent macro responses than causal
    //   contagion from one company to another. In this regime:
    //     - The contagion premium is attenuated
    //     - The signal converges toward the known industry baseline
    //     - A healthy company should NOT receive a 1.35× amplifier just because
    //       its sector is broadly in a macro downturn
    //
    // When totalTrackedSectorCompanies is absent (direct agent call, unit tests):
    //   Fall back to baselineRisk / MACRO_TRIGGER_FRACTION as a crude proxy
    //   (conservative: fires for Technology at 0.70, which is the legacy behavior).
    //   This path is documented as a known-imprecise fallback and must be labelled
    //   in metadata so callers know when the precise path was not taken.
    const baselineRisk = industryData?.baselineRisk ?? (SECTOR_CONTAGION_FALLBACK[industry] ?? 0.45);

    const recentCuts = inWindow.filter(e => (now - new Date(e.date).getTime()) / MS_PER_DAY <= RECENT_DAYS);
    const totalTracked = input.totalTrackedSectorCompanies;
    const hasPreciseFraction = totalTracked != null && totalTracked > 0;

    const sectorCuttingFraction = hasPreciseFraction
      ? Math.min(1, recentCuts.length / totalTracked!)
      : null;  // not computable without the denominator

    // isMacroRegime: true when the fraction of tracked companies cutting is
    // above the empirically-derived threshold. When fraction is unavailable,
    // fall back to the baselineRisk proxy (documented imprecision).
    const isMacroRegime = sectorCuttingFraction != null
      ? sectorCuttingFraction > MACRO_TRIGGER_FRACTION
      : baselineRisk > MACRO_TRIGGER_FRACTION;  // fallback — imprecise, see comment above

    // macroAttenuation: how strongly to suppress the contagion premium.
    //
    // Ramps from 0 at the threshold to 0.70 at 100% cutting (cap: preserving
    // a floor of contagion signal even in a full macro event, because company-
    // specific factors still matter at the margins).
    //
    // At 40% cutting (threshold): 0% attenuation — premium intact
    // At 60% cutting:             33% attenuation
    // At 80% cutting:             67% attenuation
    // At 100% cutting:            70% attenuation (cap)
    const macroAttenuation = isMacroRegime
      ? (() => {
          const fraction = sectorCuttingFraction ?? (baselineRisk / MACRO_TRIGGER_FRACTION - 1);
          const rawAttenuation = (Math.max(0, fraction - MACRO_TRIGGER_FRACTION)) / (1 - MACRO_TRIGGER_FRACTION);
          return Math.min(0.70, rawAttenuation);
        })()
      : 0;

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

    // Contagion multiplier: boosted when cuts are recent and department-concentrated;
    // attenuated by macroAttenuation when the sector is in a broad macro regime.
    //
    // Without macro correction (old behavior): multiplier ≈ 0.70 for a tight
    // cluster with no dept concentration.
    //
    // With macro correction at 80% sector cutting (macroAttenuation ≈ 0.67):
    //   multiplier ≈ 0.70 × (1 − 0.67) ≈ 0.23 — contagion premium mostly
    //   absorbed, signal falls back toward industry baseline.
    const rawContagionMultiplier = 0.70 + deptConcentration * 0.30;
    const contagionMultiplier    = rawContagionMultiplier * (1 - macroAttenuation);

    // Final blend:
    //   contagionComponent: decayed peer-event signal, reduced in macro regimes
    //   macroComponent: industry baseline, weighted by how broadly the sector is cutting
    //     - In macro regime (sectorCuttingFraction high): macroComponent dominates
    //     - In contagion regime (clusteringRatio high): macroComponent is minor
    const contagionComponent = countSignal * contagionMultiplier;
    const macroWeight        = isMacroRegime
      ? (sectorCuttingFraction ?? (baselineRisk / MACRO_TRIGGER_FRACTION - 1))
      : clusteringRatio * 0.30;  // small macro component when cuts are recent-clustered
    const macroComponent     = baselineRisk * Math.min(1, macroWeight);

    // ── Metro cluster amplifier ──────────────────────────────────────────────
    // Check if 2+ cluster members cut within CLUSTER_WINDOW_DAYS (90 days).
    // Geographic co-location creates contagion beyond sector-level propagation:
    // shared talent pools, shared clients, shared investors.
    const cuts90d = inWindow.filter(
      e => (now - new Date(e.date).getTime()) / MS_PER_DAY <= CLUSTER_WINDOW_DAYS,
    );
    const activeClusters = detectActiveMetroClusters(
      cuts90d.map(e => e.company ?? ''),
      CLUSTER_WINDOW_DAYS,
      2,  // 2+ cluster members required to trigger amplifier
    );
    const clusterAmplifier = activeClusters.length > 0 ? CLUSTER_CONTAGION_AMPLIFIER : 1.0;
    const topCluster       = activeClusters[0] ?? null;

    const finalSignal = Math.min(0.92, (contagionComponent + macroComponent) * clusterAmplifier);

    const last30Count = recentCuts.length;
    const confidence  = inWindow.length >= 3 ? 0.74 : 0.60;

    return {
      agentId:    'sectorContagionAgent',
      category:   'external',
      signal:     Math.max(0.05, finalSignal),
      confidence,
      sourceType: 'heuristic',
      ageInDays:  last30Count > 0 ? 7 : 30,
      metadata: {
        peerCutsTotal:            inWindow.length,
        peerCutsLast30d:          last30Count,
        peerCutsOlderWindow:      inWindow.length - last30Count,
        decayWeightedCount:       parseFloat(totalDecayWeight.toFixed(2)),
        clusteringRatio:          parseFloat(clusteringRatio.toFixed(2)),
        // Macro regime fields — surfaced in TransparencyTab for user trust
        totalTrackedSectorCompanies: totalTracked ?? null,
        sectorCuttingFraction:    sectorCuttingFraction != null
                                    ? parseFloat(sectorCuttingFraction.toFixed(3))
                                    : null,
        isMacroRegime,
        macroAttenuation:         parseFloat(macroAttenuation.toFixed(3)),
        usedFallbackFractionProxy: !hasPreciseFraction,
        // Signal components
        deptConcentration:        parseFloat(deptConcentration.toFixed(2)),
        topAffectedDept:          topDept,
        contagionMultiplier:      parseFloat(contagionMultiplier.toFixed(3)),
        baselineRisk:             parseFloat(baselineRisk.toFixed(2)),
        contagionComponent:       parseFloat(contagionComponent.toFixed(3)),
        macroComponent:           parseFloat(macroComponent.toFixed(3)),
        note: isMacroRegime
          ? `Macro regime — ${sectorCuttingFraction != null ? `${(sectorCuttingFraction * 100).toFixed(0)}% of tracked sector companies cutting simultaneously` : 'high-baseline industry'} (>${Math.round(MACRO_TRIGGER_FRACTION * 100)}% threshold). Contagion premium attenuated ${(macroAttenuation * 100).toFixed(0)}%; signal converges toward industry baseline. Healthy-company scores protected from macro misattribution.`
          : clusteringRatio > 0.60
          ? 'Tight temporal cluster — contagion propagation pattern detected; macro attenuation not applied'
          : 'Sparse or no simultaneous cutting — standard decay-weighted contagion signal',
        // GAP-A02: expose which key produced the active λ
        decayLambda:           DECAY_LAMBDA,
        decayLambdaProvenance: DECAY_LAMBDA_PROVENANCE,
        // Metro cluster fields — populated when geographic co-location amplifies signal
        metroClusterFired:   activeClusters.length > 0,
        activeMetroCluster:  topCluster?.metroName ?? null,
        clusterMembersCutting: topCluster?.matchedCompanies ?? [],
        clusterCutCount:     topCluster?.count ?? 0,
        clusterAmplifier:    clusterAmplifier,
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
