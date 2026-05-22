// peerContagionEngine.ts — v13.0 Layer 22
//
// Sector contagion propagation model.
//
// The core insight: layoffs are not random individual events — they propagate
// through industry peer networks. When 3+ direct competitors cut headcount
// within 90 days, the probability of any remaining peer cutting rises by ~40%.
//
// This engine reads the existing companyPeers.ts graph and the layoffNewsCache
// to detect active contagion waves and compute a propagation risk score for
// the user's company.
//
// Grounding:
//   - Tech sector wave 2022–2023: 15 companies cut within 45 days of Amazon's
//     Jan 2023 announcement, affecting ~120,000 workers across the sector.
//   - India IT wave Q4 2024: Infosys, Wipro, Cognizant all cut discretionary
//     hiring within 60 days of TCS reporting revenue miss.
//   - These are documented sector waves, not isolated events.
//
// Algorithm:
//   1. Resolve company → peer list (from companyPeers.ts graph)
//   2. Check which peers have reported layoffs in last 90/180 days
//   3. Compute contagion wave intensity (count, recency, relationship type)
//   4. Generate propagation risk score + timeToContagionDays estimate

import { COMPANY_PEERS_DB as COMPANY_PEERS, PeerRelationship } from '../data/companyPeers';
import { layoffNewsCache } from '../data/layoffNewsCache';
// WS9 — peer contribution + recency-decay weights are uncalibrated
// developer estimates. Routed through getConstant so the recalibrate
// cron can replace them with empirical regression values.
import { getConstant } from './calibration/calibrationConstants';
import {
  resolveMetro,
  PRESENCE_SURGE_WEIGHT,
  type CompanyPresenceMode,
} from '../data/techClusterMetros';

export type ContagionWaveIntensity =
  | 'NONE'        // 0 peers cut in last 180 days
  | 'EARLY'       // 1 direct competitor cut in last 90 days
  | 'SPREADING'   // 2 direct competitors OR 3+ adjacent peers cut in 90 days
  | 'ACTIVE'      // 3+ direct competitors cut in 90 days
  | 'PEAK';       // 5+ peers cut in 60 days — at peak of wave

export type ContagionPropagationRisk =
  | 'NEGLIGIBLE'   // No wave detected; peer isolation provides protection
  | 'WATCH'        // Early signal; monitor but no action needed
  | 'ELEVATED'     // Spreading wave — proactive preparation warranted
  | 'HIGH'         // Active wave — high probability this company cuts within 90 days
  | 'CRITICAL';    // Peak wave — this company is likely next within 30–60 days

export interface AffectedPeer {
  companyName: string;
  relationshipType: PeerRelationship['relationshipType'];
  layoffDate: string;           // ISO date of reported layoff
  daysAgo: number;
  estimatedPercentCut: number;  // 0 if unknown
  contagionContribution: number; // 0–1 weight of this peer in the wave score
}

// ── Geo cluster result ────────────────────────────────────────────────────────
// Populated when the user's city maps to a known tech cluster metro. Captures
// how many co-located peer companies are currently cutting and the resulting
// local supply-surge pressure on the re-employment market.

export interface GeoClusteredCut {
  companyKey: string;
  displayName: string;
  presenceMode: CompanyPresenceMode;
  surgeWeight: number;              // 0.10–1.00 based on presence mode
}

export interface GeoClusterResult {
  metroName: string;
  geoConcentrationScore: number;    // 0–1: tech employment density of this metro (ESTIMATED)
  totalMetroPeers: number;          // dominant tech companies tracked in this metro
  geoClusteredCuts: number;         // peer companies in same metro currently cutting
  weightedSurgePressure: number;    // 0–1 weighted by presence mode
  localSupplySurgeRisk: 'none' | 'low' | 'moderate' | 'high' | 'severe';
  supplySurgeAmplifier: number;     // 1.00–1.40: multiplier on re-employment timeline
  estimatedDisplacedEngineers: number; // rough estimate of engineers flooding local market (ESTIMATED)
  affectedInMetro: GeoClusteredCut[];
  remoteFirstInMetro: string[];     // companies in metro with remote-first mode (reduced surge)
  geoNarrative: string;             // human-readable explanation
}

export interface PeerContagionResult {
  waveIntensity: ContagionWaveIntensity;
  propagationRisk: ContagionPropagationRisk;
  contagionScore: number;        // 0–100 composite contagion score
  scoreAmplifier: number;        // 1.0–1.35 multiplier on main score
  affectedPeers: AffectedPeer[]; // Peers confirmed to have cut
  totalPeersMonitored: number;
  directCompetitorCuts: number;  // cuts from direct_competitor peers
  adjacentPeerCuts: number;      // cuts from adjacent_market / sector peers
  waveStartDate: string | null;  // ISO date of first peer cut in current wave
  estimatedPropagationDays: number | null; // days until this company likely cuts (null if no wave)
  waveNarrative: string;
  actionImplication: string;
  readonly calibrationStatus: 'documented_wave_analysis';
  /** MED-6: sector contribution multipliers (direct_competitor=1.0, adjacent=0.65, etc.) are
   *  developer-estimated. Calibration requires same-sector layoff co-occurrence data within 90 days. */
  readonly multipliersCalibrationStatus: 'developer_estimate';
  readonly multipliersCalibrationNote: string;
  /**
   * v39.0 D4 — Machine-readable confidence tier for the sector multipliers
   * applied to the contagion score.
   *
   *   'bootstrap'  → developer-estimated weights (current default).
   *   'calibrated' → validated against same-sector co-occurrence data (≥50 paired events).
   *
   * Downstream consumers (intelligence brief, transparency tab, model
   * calibration metrics) should DOWNWEIGHT contagion contributions when this
   * is 'bootstrap'. Today every result returns 'bootstrap' until the empirical
   * regression in Phase E1 completes.
   */
  readonly multiplierConfidence: 'bootstrap' | 'calibrated';
  /**
   * GAP-A02 — Recency decay labeling. The active decay constant is ESTIMATED
   * (developer choice from qualitative 2022-2024 wave analysis, not regression-fitted).
   *   'uncalibrated_placeholder' → developer estimate (current default)
   *   'regression_derived'       → fitted to lag distribution (not yet active)
   */
  readonly decayCalibrationStatus: 'uncalibrated_placeholder' | 'regression_derived';
  /** The half-life in days that was active for recency decay in this result. */
  readonly decayHalfLifeDays: number;
  /** GAP-A02 — Number of co-occurrence pairs used to calibrate the decay λ.
   *  0 = uncalibrated bootstrap. >= 50 = empirically validated. */
  readonly decayEvidenceCount: number;
  /** GAP-A02 — ISO timestamp of most recent recalibrate-engine calibration run.
   *  null = not yet calibrated. */
  readonly decayLastValidatedAt: string | null;
  /**
   * Geographic cluster analysis — populated when user's city maps to a known
   * tech cluster metro. Captures local supply-surge risk from co-located peer
   * layoffs. Absent when city is unknown or not in a tracked metro.
   * Used by jobMarketLiquidityService to extend re-employment timeline.
   */
  geoCluster?: GeoClusterResult;
}

export interface PeerContagionInputs {
  companyName: string;
  industry: string;
  currentScore: number;
  /** User's city of work (e.g. "Seattle", "San Francisco"). Enables geo cluster
   *  analysis — supply-surge detection when co-located peers cut simultaneously. */
  city?: string;
}

// ── Contagion wave scoring constants ─────────────────────────────────────────

// WS9 — uncalibrated developer-estimate weights. The bootstrap defaults
// preserve legacy behaviour exactly; the DB constant 'peerContagionEngine.contributionWeights'
// can override the entire record (recalibrate-engine target).
const BOOTSTRAP_PEER_CONTRIBUTION_WEIGHT: Record<PeerRelationship['relationshipType'], number> = {
  direct_competitor:      1.0,   // Full weight — same product market
  adjacent_market:        0.65,  // Partial weight — same sector, different buyer
  same_sector_large_cap:  0.50,  // Sector-level signal
  same_sector_mid_cap:    0.35,  // Weaker signal
};

function getPeerContributionWeight(type: PeerRelationship['relationshipType']): number {
  const resolved = getConstant<Record<PeerRelationship['relationshipType'], number>>(
    'peerContagionEngine.contributionWeights',
    BOOTSTRAP_PEER_CONTRIBUTION_WEIGHT,
  );
  const map = (resolved.value && typeof resolved.value === 'object')
    ? resolved.value
    : BOOTSTRAP_PEER_CONTRIBUTION_WEIGHT;
  return map[type] ?? BOOTSTRAP_PEER_CONTRIBUTION_WEIGHT[type] ?? 0;
}

// WS9 — recency decay thresholds. Each band is a (max-days, weight) pair.
// Same override mechanism as the contribution weights.
const BOOTSTRAP_RECENCY_DECAY: ReadonlyArray<[number, number]> = [
  [14,  1.00],
  [30,  0.90],
  [60,  0.70],
  [90,  0.50],
  [180, 0.25],
];

// v40.0 audit fix: add smooth exponential decay so peer layoffs lose weight
// continuously rather than in discrete bands. A peer layoff 5 days ago gets
// full weight; one 90 days ago gets ~5% weight. The step-band fallback is
// retained for backward compatibility when the exponential constant is not
// available in calibrationConstants.
function recencyDecayedWeight(daysAgo: number, baseWeight: number): number {
  return baseWeight * Math.exp(-daysAgo / 30);
}

function recencyWeight(daysAgo: number): number {
  // Tier 1: explicit exponential half-life override from DB.
  const expConstant = getConstant<number>('peerContagionEngine.exponentialDecayHalfLife', null);
  if (expConstant.value != null && typeof expConstant.value === 'number') {
    return Math.exp(-daysAgo / expConstant.value);
  }
  // Tier 2: GAP-A02 fix — when exponentialDecayHalfLife is null, defer to
  // signalDecayModel.halfLives.sector_contagion (21 days by default; DB-overridable).
  // Previously this path fell straight to step-band, contradicting the DB comment
  // on the exponentialDecayHalfLife row ("null here means: defer to sector_contagion").
  const sectorHalfLife = getConstant<number>('signalDecayModel.halfLives.sector_contagion', null);
  if (sectorHalfLife.value != null && typeof sectorHalfLife.value === 'number' && sectorHalfLife.value > 0) {
    return Math.exp(-(Math.LN2 / sectorHalfLife.value) * daysAgo);
  }
  // Tier 3: step-band decay (legacy + WS9 calibration compatible fallback).
  const resolved = getConstant<ReadonlyArray<[number, number]>>(
    'peerContagionEngine.recencyDecayBands',
    BOOTSTRAP_RECENCY_DECAY,
  );
  const bands = Array.isArray(resolved.value) ? resolved.value : BOOTSTRAP_RECENCY_DECAY;
  for (const [maxDays, weight] of bands) {
    if (daysAgo <= maxDays) return weight;
  }
  return 0;
}

// recencyDecayedWeight is exported for DAG layer consumers that need to apply
// decay to a custom base weight. The engine itself uses recencyWeight() which
// is DB-configurable (step-band or exponential) via calibrationConstants.
// Both approaches are active — recencyWeight() governs internal scoring while
// recencyDecayedWeight() provides a simpler utility for external callers.
export { recencyDecayedWeight };

// GAP-A02 — Returns the effective half-life (days) that recencyWeight() is using,
// the calibration status, and the evidence metadata from the DB row.
// Priority: peer_contagion_decay_lambda (canonical empirical key) >
//           peerContagionEngine.exponentialDecayHalfLife > signalDecayModel.halfLives.sector_contagion > step-band.
function resolveActiveDecayHalfLife(): {
  halfLifeDays: number;
  calibrationStatus: 'uncalibrated_placeholder' | 'regression_derived';
  evidenceCount: number;
  lastValidatedAt: string | null;
} {
  // Tier 0: canonical empirical key — peer_contagion_decay_lambda stores λ (not half-life).
  // Convert: halfLife = ln(2) / λ.
  const empiricalLambda = getConstant<number>('peer_contagion_decay_lambda', null);
  if (empiricalLambda.value != null && typeof empiricalLambda.value === 'number' && empiricalLambda.value > 0) {
    const halfLifeDays = Math.LN2 / empiricalLambda.value;
    const calibrationStatus: 'uncalibrated_placeholder' | 'regression_derived' =
      empiricalLambda.provenance === 'regression' ? 'regression_derived' : 'uncalibrated_placeholder';
    return {
      halfLifeDays,
      calibrationStatus,
      evidenceCount:    empiricalLambda.evidenceCount ?? 0,
      lastValidatedAt:  empiricalLambda.lastValidatedAt ?? null,
    };
  }
  // Tier 1: explicit exponential half-life override from DB.
  const expOverride = getConstant<number>('peerContagionEngine.exponentialDecayHalfLife', null);
  if (expOverride.value != null && typeof expOverride.value === 'number' && expOverride.value > 0) {
    return {
      halfLifeDays:    expOverride.value,
      calibrationStatus: 'uncalibrated_placeholder',
      evidenceCount:   expOverride.evidenceCount ?? 0,
      lastValidatedAt: expOverride.lastValidatedAt ?? null,
    };
  }
  // Tier 2: signalDecayModel.halfLives.sector_contagion (21 days by default; DB-overridable).
  const sectorHalfLife = getConstant<number>('signalDecayModel.halfLives.sector_contagion', null);
  if (sectorHalfLife.value != null && typeof sectorHalfLife.value === 'number' && sectorHalfLife.value > 0) {
    return {
      halfLifeDays:    sectorHalfLife.value,
      calibrationStatus: 'uncalibrated_placeholder',
      evidenceCount:   sectorHalfLife.evidenceCount ?? 0,
      lastValidatedAt: sectorHalfLife.lastValidatedAt ?? null,
    };
  }
  // Tier 3: step-band bootstrap — report approximate half-life (90d → 0.50 weight)
  return { halfLifeDays: 90, calibrationStatus: 'uncalibrated_placeholder', evidenceCount: 0, lastValidatedAt: null };
}

function computeWaveIntensity(directCuts: number, adjacentCuts: number, daysWindow: number): ContagionWaveIntensity {
  const totalCuts = directCuts + adjacentCuts;
  if (totalCuts === 0) return 'NONE';
  if (daysWindow <= 60 && directCuts >= 5) return 'PEAK';
  if (directCuts >= 3) return 'ACTIVE';
  if (directCuts >= 2 || adjacentCuts >= 3) return 'SPREADING';
  if (directCuts >= 1) return 'EARLY';
  return 'NONE';
}

function computePropagationRisk(intensity: ContagionWaveIntensity, score: number): ContagionPropagationRisk {
  const intensityLevel: Record<ContagionWaveIntensity, number> = {
    NONE: 0, EARLY: 1, SPREADING: 2, ACTIVE: 3, PEAK: 4,
  };
  const level = intensityLevel[intensity];

  if (level === 0) return 'NEGLIGIBLE';
  if (level === 1 && score < 50) return 'WATCH';
  if (level === 1 && score >= 50) return 'ELEVATED';
  if (level === 2) return score >= 60 ? 'HIGH' : 'ELEVATED';
  if (level >= 3) return score >= 50 ? 'CRITICAL' : 'HIGH';
  return 'WATCH';
}

function estimatePropagationDays(intensity: ContagionWaveIntensity): number | null {
  const PROPAGATION_DAYS: Partial<Record<ContagionWaveIntensity, number>> = {
    EARLY: 120,
    SPREADING: 75,
    ACTIVE: 45,
    PEAK: 25,
  };
  return PROPAGATION_DAYS[intensity] ?? null;
}

function buildWaveNarrative(
  intensity: ContagionWaveIntensity,
  directCuts: number,
  adjacentCuts: number,
  affectedPeers: AffectedPeer[],
  companyName: string,
): string {
  if (intensity === 'NONE') {
    return `No active peer contagion wave detected for ${companyName}'s sector. Peer companies have not reported significant layoffs in the last 180 days.`;
  }
  const peerList = affectedPeers.slice(0, 3).map(p => p.companyName).join(', ');
  if (intensity === 'EARLY') {
    return `Early contagion signal: ${peerList} recently announced layoffs. This is an isolated event so far — monitor for additional peer cuts in the next 30 days.`;
  }
  if (intensity === 'SPREADING') {
    return `A sector wave is spreading: ${directCuts} direct competitor${directCuts !== 1 ? 's' : ''} and ${adjacentCuts} adjacent peers (${peerList}) have cut headcount. Historical data suggests 60–70% of remaining sector peers cut within 75 days of a spreading wave.`;
  }
  if (intensity === 'ACTIVE') {
    return `Active sector wave detected: ${directCuts} direct competitors including ${peerList} have cut headcount in the last 90 days. Based on documented sector wave patterns (2022–2026), ${companyName} faces elevated probability of announcement within 45 days.`;
  }
  return `PEAK sector contagion wave: ${directCuts + adjacentCuts} peers including ${peerList} have cut in the last 60 days. This matches the intensity pattern of the Jan 2023 tech wave and Q4 2024 India IT wave. Risk is critically elevated.`;
}

function buildActionImplication(risk: ContagionPropagationRisk): string {
  const actions: Record<ContagionPropagationRisk, string> = {
    NEGLIGIBLE: 'Peer sector is stable. Focus on company-specific signals rather than sector contagion.',
    WATCH: 'One peer has cut. Set a 30-day monitoring window — if a second peer cuts, upgrade to active preparation mode.',
    ELEVATED: 'Multiple peers cutting. Begin proactive job search in parallel with current role. Update LinkedIn and reach out to your network now.',
    HIGH: 'Active sector wave. Treat your risk as elevated regardless of company-specific signals. Accelerate job search, secure reference letters, and expand pipeline immediately.',
    CRITICAL: 'Peak contagion wave. Activate emergency protocol: update all application materials, activate warm referrals, apply to 3+ roles within 72 hours. Announcement may come within 25–45 days.',
  };
  return actions[risk];
}

// ── Layoff news matching ───────────────────────────────────────────────────────

const TODAY_MS = Date.now();
const MS_PER_DAY = 86400000;

function checkPeerLayoffsFromCache(peerCompanyId: string): { found: boolean; daysAgo: number; percentCut: number } {
  const normalizedPeer = peerCompanyId.toLowerCase().trim();
  const newsEvents = layoffNewsCache;

  for (const event of newsEvents) {
    const eventCompany = (event.companyName ?? '').toLowerCase();
    if (!eventCompany.includes(normalizedPeer) && !normalizedPeer.includes(eventCompany)) continue;

    const eventDate = new Date(event.date ?? '').getTime();
    if (isNaN(eventDate)) continue;

    const daysAgo = Math.floor((TODAY_MS - eventDate) / MS_PER_DAY);
    if (daysAgo > 180) continue;

    return {
      found: true,
      daysAgo,
      percentCut: event.percentCut ?? 0,
    };
  }
  return { found: false, daysAgo: 999, percentCut: 0 };
}

// ── Geographic cluster risk ────────────────────────────────────────────────────
// Computes the local supply-surge effect when multiple co-located tech companies
// are laying off simultaneously. A Seattle engineer hit by an Amazon wave is
// NOT competing nationally — they compete with thousands of displaced Microsoft,
// Meta, and Google Kirkland engineers in the same local job market.
//
// Supply-surge weight by presence mode:
//   hq:           1.00  (Amazon Seattle = 100k local; 5% cut = 5,000 local engineers displaced)
//   major_office: 0.75  (Google Kirkland = 5k local; 5% cut = ~190 local engineers displaced)
//   satellite:    0.35  (smaller contribution)
//   remote_first: 0.10  (layoffs hit ALL markets equally, not just local)
//
// Assumes a 5% cut-size for estimatedDisplacedEngineers — this is a calibration
// floor estimate based on documented wave sizes (2022–2023 tech waves). The actual
// impact scales with the wave severity, which is captured in waveIntensity.

function computeGeoClusterRisk(
  city: string | undefined,
  companyKey: string,
  affectedPeers: AffectedPeer[],
): GeoClusterResult | undefined {
  const metro = resolveMetro(city);
  if (!metro) return undefined;

  const affectedPeerKeys = new Set(affectedPeers.map(p => p.companyName.toLowerCase().trim()));

  const affectedInMetro: GeoClusteredCut[] = [];
  const remoteFirstInMetro: string[] = [];
  let weightedSurge = 0;
  let estimatedDisplaced = 0;

  for (const mc of metro.dominantCompanies) {
    // Skip the user's own company — we're measuring peer pressure, not self
    if (mc.companyKey === companyKey || companyKey.includes(mc.companyKey) || mc.companyKey.includes(companyKey)) {
      continue;
    }

    if (mc.presenceMode === 'remote_first') {
      remoteFirstInMetro.push(mc.displayName);
    }

    // Check if this metro company appears in the affected peers list
    const isCutting = affectedPeerKeys.has(mc.companyKey)
      || [...affectedPeerKeys].some(k => k.includes(mc.companyKey) || mc.companyKey.includes(k));
    if (!isCutting) continue;

    const surgeWeight = PRESENCE_SURGE_WEIGHT[mc.presenceMode];
    affectedInMetro.push({
      companyKey: mc.companyKey,
      displayName: mc.displayName,
      presenceMode: mc.presenceMode,
      surgeWeight,
    });

    weightedSurge += surgeWeight;
    // Assume 5% average cut size for displacement estimate (conservative wave floor).
    estimatedDisplaced += Math.round(mc.estimatedHeadcount * 0.05 * surgeWeight);
  }

  const geoClusteredCuts = affectedInMetro.length;

  // Max possible surge = if EVERY metro company were cutting at full weight
  const maxPossibleSurge = metro.dominantCompanies
    .filter(mc => mc.companyKey !== companyKey)
    .reduce((s, mc) => s + PRESENCE_SURGE_WEIGHT[mc.presenceMode], 0);

  const weightedSurgePressure = maxPossibleSurge > 0
    ? Math.min(1, weightedSurge / maxPossibleSurge)
    : 0;

  const localSupplySurgeRisk: GeoClusterResult['localSupplySurgeRisk'] =
    weightedSurge >= 2.0 ? 'severe' :
    weightedSurge >= 1.2 ? 'high' :
    weightedSurge >= 0.5 ? 'moderate' :
    weightedSurge > 0    ? 'low' :
    'none';

  // supplySurgeAmplifier: 1.00 (no surge) to 1.40 (severe coordinated wave).
  // Each full-weight (HQ) peer cutting contributes +0.12 to the amplifier.
  // A Seattle engineer with Amazon + Microsoft both cutting = ~1.24× timeline extension.
  const supplySurgeAmplifier = Math.min(1.40, 1.00 + weightedSurge * 0.12);

  const totalMetroPeers = metro.dominantCompanies.filter(mc => mc.companyKey !== companyKey).length;

  // Build narrative
  let geoNarrative: string;
  if (geoClusteredCuts === 0) {
    geoNarrative = `${metro.metroName} tech cluster (concentration score: ${Math.round(metro.concentrationScore * 100)}/100): `
      + `${totalMetroPeers} major tech employers monitored in this metro. `
      + `No co-located peers are currently cutting — local engineer supply is stable. `
      + `If a wave hits, supply surge risk would be elevated due to metro concentration.`;
  } else {
    const cutList = affectedInMetro.slice(0, 3).map(c => c.displayName).join(', ');
    const more = affectedInMetro.length > 3 ? ` +${affectedInMetro.length - 3} more` : '';
    geoNarrative = `${metro.metroName} supply surge: ${geoClusteredCuts} co-located peer${geoClusteredCuts > 1 ? 's' : ''} `
      + `(${cutList}${more}) cutting simultaneously. `
      + `ESTIMATED ${estimatedDisplaced.toLocaleString()}+ displaced engineers competing in the same metro job market. `
      + `Re-employment timeline extended by ${(supplySurgeAmplifier - 1.0) * 100 | 0}% versus a non-cluster market.`
      + (remoteFirstInMetro.length > 0
        ? ` Note: ${remoteFirstInMetro.join(', ')} are remote-first — their layoffs distribute globally, not locally.`
        : '');
  }

  return {
    metroName: metro.metroName,
    geoConcentrationScore: metro.concentrationScore,
    totalMetroPeers,
    geoClusteredCuts,
    weightedSurgePressure,
    localSupplySurgeRisk,
    supplySurgeAmplifier,
    estimatedDisplacedEngineers: estimatedDisplaced,
    affectedInMetro,
    remoteFirstInMetro,
    geoNarrative,
  };
}

// ── Core engine ───────────────────────────────────────────────────────────────

export function computePeerContagion(inputs: PeerContagionInputs): PeerContagionResult {
  const companyKey = inputs.companyName.toLowerCase().trim();

  // Resolve peer list
  const peers: PeerRelationship[] = COMPANY_PEERS.filter(
    p => p.companyId === companyKey || p.companyId.includes(companyKey) || companyKey.includes(p.companyId)
  );

  const totalPeersMonitored = peers.length;

  const companyKeyNorm = companyKey;

  if (totalPeersMonitored === 0) {
    // No peer data — still compute geo cluster for the static concentration signal
    const geoCluster = computeGeoClusterRisk(inputs.city, companyKeyNorm, []);
    const decayInfo = resolveActiveDecayHalfLife();
    return {
      waveIntensity: 'NONE',
      propagationRisk: 'NEGLIGIBLE',
      contagionScore: 0,
      scoreAmplifier: 1.0,
      affectedPeers: [],
      totalPeersMonitored: 0,
      directCompetitorCuts: 0,
      adjacentPeerCuts: 0,
      waveStartDate: null,
      estimatedPropagationDays: null,
      waveNarrative: `Insufficient peer data for ${inputs.companyName}. Sector contagion analysis unavailable.`,
      actionImplication: 'Monitor industry news manually for peer company announcements.',
      calibrationStatus: 'documented_wave_analysis',
      multipliersCalibrationStatus: 'developer_estimate',
      multipliersCalibrationNote: 'Sector contribution multipliers (direct_competitor=1.0, adjacent_market=0.65, same_sector=0.35–0.50) are developer-estimated. Calibration requires co-occurrence analysis: same-sector layoffs within 90 days of each other across ≥50 paired events.',
      multiplierConfidence: 'bootstrap', // v39.0 D4 — flip to 'calibrated' once Phase E1 regression validates
      decayCalibrationStatus: decayInfo.calibrationStatus,
      decayHalfLifeDays:      decayInfo.halfLifeDays,
      decayEvidenceCount:     decayInfo.evidenceCount,
      decayLastValidatedAt:   decayInfo.lastValidatedAt,
      geoCluster,
    };
  }

  // Check each peer for recent layoffs
  const affectedPeers: AffectedPeer[] = [];
  let weightedContagionScore = 0;
  let directCuts = 0;
  let adjacentCuts = 0;
  let earliestCutDate: Date | null = null;

  for (const peer of peers) {
    const layoffData = checkPeerLayoffsFromCache(peer.peerCompanyId);
    if (!layoffData.found) continue;

    const weight = getPeerContributionWeight(peer.relationshipType);
    const decay = recencyWeight(layoffData.daysAgo);
    const contribution = weight * decay;

    const cutDate = new Date(Date.now() - layoffData.daysAgo * MS_PER_DAY);
    if (!earliestCutDate || cutDate < earliestCutDate) {
      earliestCutDate = cutDate;
    }

    affectedPeers.push({
      companyName: peer.peerCompanyId,
      relationshipType: peer.relationshipType,
      layoffDate: cutDate.toISOString().slice(0, 10),
      daysAgo: layoffData.daysAgo,
      estimatedPercentCut: layoffData.percentCut,
      contagionContribution: +contribution.toFixed(3),
    });

    weightedContagionScore += contribution;

    if (peer.relationshipType === 'direct_competitor') directCuts++;
    else adjacentCuts++;
  }

  // Normalize score to 0-100
  const maxPossibleScore = Math.min(totalPeersMonitored, 8) * 1.0; // cap at 8 direct peers
  const contagionScore = Math.min(100, Math.round((weightedContagionScore / Math.max(maxPossibleScore, 1)) * 100));

  // Determine spread window (days since first peer cut)
  const waveWindowDays = earliestCutDate
    ? Math.floor((TODAY_MS - earliestCutDate.getTime()) / MS_PER_DAY)
    : 0;

  const waveIntensity = computeWaveIntensity(directCuts, adjacentCuts, waveWindowDays);
  const propagationRisk = computePropagationRisk(waveIntensity, inputs.currentScore);
  const estimatedPropagationDays = estimatePropagationDays(waveIntensity);

  // Score amplifier: peaks at 1.35 for PEAK wave with multiple direct cuts
  const amplifierByIntensity: Record<ContagionWaveIntensity, number> = {
    NONE: 1.00,
    EARLY: 1.08,
    SPREADING: 1.15,
    ACTIVE: 1.25,
    PEAK: 1.35,
  };
  const scoreAmplifier = amplifierByIntensity[waveIntensity];

  // Sort affected peers by recency
  affectedPeers.sort((a, b) => a.daysAgo - b.daysAgo);

  // Compute geographic supply-surge cluster risk using the resolved affected peers.
  const geoCluster = computeGeoClusterRisk(inputs.city, companyKeyNorm, affectedPeers);
  const decayInfo  = resolveActiveDecayHalfLife();

  return {
    waveIntensity,
    propagationRisk,
    contagionScore,
    scoreAmplifier,
    affectedPeers,
    totalPeersMonitored,
    directCompetitorCuts: directCuts,
    adjacentPeerCuts: adjacentCuts,
    waveStartDate: earliestCutDate ? earliestCutDate.toISOString().slice(0, 10) : null,
    estimatedPropagationDays,
    waveNarrative: buildWaveNarrative(waveIntensity, directCuts, adjacentCuts, affectedPeers, inputs.companyName),
    actionImplication: buildActionImplication(propagationRisk),
    calibrationStatus: 'documented_wave_analysis',
    multipliersCalibrationStatus: 'developer_estimate',
    multipliersCalibrationNote: 'Sector contribution multipliers (direct_competitor=1.0, adjacent_market=0.65, same_sector=0.35–0.50) are developer-estimated. Calibration requires co-occurrence analysis: same-sector layoffs within 90 days of each other across ≥50 paired events.',
    multiplierConfidence: 'bootstrap', // v39.0 D4 — flip to 'calibrated' once Phase E1 regression validates
    decayCalibrationStatus: decayInfo.calibrationStatus,
    decayHalfLifeDays:      decayInfo.halfLifeDays,
    decayEvidenceCount:     decayInfo.evidenceCount,
    decayLastValidatedAt:   decayInfo.lastValidatedAt,
    geoCluster,
  };
}
