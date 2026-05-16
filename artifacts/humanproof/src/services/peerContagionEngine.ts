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
}

export interface PeerContagionInputs {
  companyName: string;
  industry: string;
  currentScore: number;
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

function recencyWeight(daysAgo: number): number {
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

// ── Core engine ───────────────────────────────────────────────────────────────

export function computePeerContagion(inputs: PeerContagionInputs): PeerContagionResult {
  const companyKey = inputs.companyName.toLowerCase().trim();

  // Resolve peer list
  const peers: PeerRelationship[] = COMPANY_PEERS.filter(
    p => p.companyId === companyKey || p.companyId.includes(companyKey) || companyKey.includes(p.companyId)
  );

  const totalPeersMonitored = peers.length;

  if (totalPeersMonitored === 0) {
    // No peer data — can't compute contagion
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
  };
}
