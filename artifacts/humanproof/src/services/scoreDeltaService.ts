// ═══════════════════════════════════════════════════════════════════════
// scoreDeltaService.ts — Score History, Delta Tracking & Attribution
// Tracks user risk scores over time and explains WHY scores changed.
// The explanation quality is what drives re-engagement.
// ═══════════════════════════════════════════════════════════════════════

import { KEY_REGISTRY } from '../data/riskData';
import { getCareerIntelligence } from '../data/intelligence/index';

export interface ScoreHistoryEntry {
  roleKey: string;
  industryKey: string;
  countryKey: string;
  experience: string;
  score: number;
  timestamp: number; // unix ms
  isGrounded: boolean;
  // Generic breakdown — works for both L1-L5 (Layoff Audit) and D1-D6 (Oracle)
  // Values are 0–1 (raw engine output, multiplied by 100 in the attribution display)
  breakdown?: Record<string, number>;
  companyName?: string;
  // Snapshot of company data signals at time of scoring.
  // Used by explainDimensionDelta() to produce specific driver text (actual field values).
  // REQUIRED fields for spec-exact attribution:
  //   L1: stock90DayChange (prev vs curr), revenueGrowthYoY (prev vs curr)
  //   L2: layoffRounds (prev vs curr), lastLayoffPercent, lastLayoffDate → recency weight
  //   L3: aiInvestmentSignal (prev vs curr) → amplification factor delta
  //   L4: parent/GCC/peer-contagion fields below — spec-exact attribution
  //       for GCC users whose parent company announced layoffs.
  companySnapshot?: {
    stock90DayChange?: number | null;
    revenueGrowthYoY?: number | null;
    layoffRounds?: number;
    lastLayoffPercent?: number | null;
    /** ISO date of the most recent confirmed layoff — used to compute L2 recency weight */
    lastLayoffDate?: string | null;
    aiInvestmentSignal?: string;
    employeeCount?: number;
    revenuePerEmployee?: number;

    // ── L4 attribution fields (v40.0) ────────────────────────────────────
    /** Name of detected parent company (e.g. "Microsoft" for a Microsoft India GCC).
     *  Populated from ParentPropagationResult.parentName when companyData is a known
     *  subsidiary. Drives spec-exact L4 driver text citing the parent. */
    parentCompanyName?: string;
    /** Country of the parent company (e.g. "US" / "United States") */
    parentCountry?: string;
    /** Most recent verified layoff event at the parent company. ISO date +
     *  workforce-percent. When this changes between two history entries we
     *  know the L4 increase was caused by parent-company contagion, not
     *  generic "sector headwinds". */
    parentLayoffEvent?: {
      date: string;        // ISO YYYY-MM-DD
      percent: number;     // 0–100
      affectedCount?: number;
    };
    /** GCC archetype classification (strategic_partner, captive, hybrid, etc.)
     *  from indiaSectorIntelligence.gccRiskProfile.archetype. */
    gccArchetype?: string;
    /** Propagation lag in months from parent announcement to subsidiary action
     *  (lower bound, upper bound). Used in spec-exact driver text:
     *  "Historical propagation timeline: 6-9 months." */
    propagationLagMonths?: { min: number; max: number };
    /** Peer-contagion amplifier from PeerContagionResult.scoreAmplifier — 1.00 means
     *  no contagion, 1.35 means peak wave. */
    peerContagionMultiplier?: number;
    /** Top-contributing peer company name (most recent peer cut driving the wave).
     *  E.g. "Meta" for a Salesforce engineer whose score moved due to Meta cuts. */
    peerContagionTopPeer?: string;
    /** Total peer companies in the wave (any relationship type) */
    peerContagionAffectedCount?: number;
  };
}

export interface ScoreDelta {
  previous: number;
  current: number;
  delta: number;         // positive = risk increased, negative = risk decreased
  daysAgo: number;
  label: string;
  direction: 'up' | 'down' | 'same';
  // Enhanced: dimension-level attribution
  dimensionDeltas?: DimensionDelta[];
}

export interface DimensionDelta {
  key: string;
  label: string;
  previous: number;  // 0–100
  current: number;   // 0–100
  delta: number;     // points changed
  driver: string;    // human explanation of what drove this change
  /** Priority 7: "Had you built X skill, you could have offset Y% of this increase." */
  counterfactual?: string;
}

// ── Signal change detectors — map dimension changes to explanations ──────────
// These explanations are what turn a bare delta number into a decision-making tool.

const DIMENSION_LABELS: Record<string, string> = {
  L1: 'Company Financial Health',
  L2: 'Layoff & Instability History',
  L3: 'Role Displacement Risk',
  L4: 'Industry Headwinds',
  L5: 'Personal Protection',
  D6: 'AI Agent Capability',
  D7: 'Unified Company Health',
};

// AI investment signal → D8 amplification factor (matches aiStrengthMap in layoffScoreEngine).
// Exported as a pure lookup so tests can verify the mapping without running the engine.
export const AI_AMP_FACTOR: Record<string, number> = {
  low:       0.00,
  medium:    0.12,
  high:      0.52,
  'very-high': 0.80,
  very_high:   0.80,  // backward-compat alias
};

/**
 * Generates a human-readable explanation for why a specific dimension changed.
 *
 * ATTRIBUTION CONTRACT:
 *   Every driver string must explain WHY the specific number changed, not THAT it changed.
 *   When both prev and curr snapshots are available, actual field values MUST appear.
 *   Generic dimension descriptions are a quality failure.
 *
 * Spec-exact formats (dimensions that must match exactly):
 *   L1: "Stock 90-day return worsened from [prev]% to [curr]% — stock risk: [prevRisk] to [currRisk].
 *        Revenue growth shifted from [prev]% to [curr]% YoY."
 *   L2: "New layoff event detected at [company] on [date], [pct]% of workforce. Recency weight: [w]."
 *   L3: "AI Investment signal escalated from [prev] to [curr].
 *        Amplification factor changed from [prevAmp] to [currAmp], raising L3 by [delta] points."
 */
function explainDimensionDelta(
  key: string,
  prev: number,
  curr: number,
  delta: number,
  companyName?: string,
  roleKey?: string,
  prevSnapshot?: ScoreHistoryEntry['companySnapshot'],
  currSnapshot?: ScoreHistoryEntry['companySnapshot'],
): { driver: string; counterfactual?: string } {
  const dir = delta > 0 ? 'increased' : 'decreased';
  const abs = Math.abs(delta);
  const co = companyName ?? 'your company';

  // Format a percentage with sign: +3.1% / -2.0% / 0.0%
  const pct = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;

  let driver: string;
  let counterfactual: string | undefined;

  switch (key) {
    // ── L1: Company Financial Health ─────────────────────────────────────────
    case 'L1': {
      const prevStock = prevSnapshot?.stock90DayChange ?? null;
      const currStock = currSnapshot?.stock90DayChange ?? null;
      const prevRev   = prevSnapshot?.revenueGrowthYoY ?? null;
      const currRev   = currSnapshot?.revenueGrowthYoY ?? null;

      const hasStockDelta = prevStock != null && currStock != null && currStock !== prevStock;
      const hasRevDelta   = prevRev   != null && currRev   != null && currRev   !== prevRev;

      if (hasStockDelta) {
        const stockDir = currStock < prevStock ? 'worsened' : 'improved';
        driver = `Stock 90-day return ${stockDir} from ${pct(prevStock)} to ${pct(currStock)} — stock risk: ${prev} to ${curr}.`;
        if (hasRevDelta) {
          driver += ` Revenue growth shifted from ${pct(prevRev!)} to ${pct(currRev!)} YoY.`;
        }
      } else if (hasRevDelta) {
        const revDir = currRev! < prevRev! ? 'declined' : 'grew';
        driver = `Revenue growth ${revDir} from ${pct(prevRev!)} to ${pct(currRev!)} YoY — financial risk: ${prev} to ${curr}.`;
      } else {
        // No snapshot values available — fall back to informative generic text
        if (delta > 8)       driver = `${co}'s financial health deteriorated significantly (+${abs} pts). Revenue deceleration, stock drawdown, or reduced cash runway detected.`;
        else if (delta > 3)  driver = `${co}'s financial health weakened (+${abs} pts). Revenue-per-employee or funding signals updated.`;
        else if (delta < -5) driver = `${co}'s financial health improved (${abs} pts lower risk). Positive revenue trend or reduced overstaffing signals.`;
        else                 driver = `${co}'s financial health ${dir} by ${abs} pts.`;
      }
      break;
    }

    // ── L2: Layoff & Instability History ─────────────────────────────────────
    case 'L2': {
      const prevRounds = prevSnapshot?.layoffRounds ?? 0;
      const currRounds = currSnapshot?.layoffRounds ?? 0;
      const currPct    = currSnapshot?.lastLayoffPercent ?? null;
      const eventDate  = currSnapshot?.lastLayoffDate ?? null;

      if (currRounds > prevRounds) {
        // Compute recency weight using the same exponential decay as the scoring engine:
        // w = e^(-daysAgo / 30).  0 days → 1.00.  14 days → 0.63.  30 days → 0.37.
        const daysAgo = eventDate != null
          ? Math.max(0, Math.round((Date.now() - new Date(eventDate).getTime()) / 86_400_000))
          : null;
        const recencyWeight = daysAgo != null
          ? parseFloat(Math.exp(-daysAgo / 30).toFixed(2))
          : null;
        const dateLabel = eventDate != null
          ? new Date(eventDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
          : 'recently';

        driver = `New layoff event detected at ${co} on ${dateLabel}`;
        if (currPct != null)       driver += `, ${currPct}% of workforce`;
        if (recencyWeight != null) driver += `. Recency weight: ${recencyWeight}`;
        driver += '.';
      } else if (delta > 8) {
        driver = `Layoff history for ${co} ${dir} sharply (+${abs} pts). A new event may have entered the 24-month tracking window. Documented cuts raise near-term risk.`;
      } else if (delta > 3) {
        driver = `Layoff history for ${co} ${dir} (+${abs} pts). A recent event may have been added or sector contagion increased.`;
      } else if (delta < -5) {
        driver = `${co}'s layoff history risk dropped (${abs} pts lower) as a prior event aged out of the 24-month tracking window.`;
      } else {
        driver = `Layoff history for ${co} ${dir} by ${abs} pts.`;
      }
      break;
    }

    // ── L3: Role Displacement Risk ────────────────────────────────────────────
    case 'L3': {
      const prevAI = prevSnapshot?.aiInvestmentSignal ?? null;
      const currAI = currSnapshot?.aiInvestmentSignal ?? null;

      if (prevAI && currAI && prevAI !== currAI) {
        const prevAmp = AI_AMP_FACTOR[prevAI] ?? AI_AMP_FACTOR['medium'];
        const currAmp = AI_AMP_FACTOR[currAI] ?? AI_AMP_FACTOR['medium'];
        const escalated = currAmp > prevAmp;
        driver =
          `AI Investment signal ${escalated ? 'escalated' : 'de-escalated'} from ${prevAI} to ${currAI}. ` +
          `Amplification factor changed from ${prevAmp} to ${currAmp}, ` +
          `${escalated ? 'raising' : 'lowering'} L3 by ${abs} points.`;
      } else if (delta > 5) {
        driver = `AI displacement risk for your role ${dir} (+${abs} pts). AI tool maturity in your domain advanced — new enterprise deployments detected.`;
      } else if (delta < -5) {
        driver = `Role displacement risk ${dir} (${abs} pts lower). New intelligence shows higher human-augmentation value for this role than previously modeled.`;
      } else {
        driver = `Role displacement risk ${dir} by ${abs} pts. Industry AI adoption rate updates affected this dimension.`;
      }

      // Counterfactual — what skill would have offset this L3 increase?
      if (delta > 5 && roleKey) {
        try {
          const intel = getCareerIntelligence(roleKey);
          const topSafe = intel?.skills?.safe?.[0];
          if (topSafe) {
            const offsetPts = Math.min(abs, Math.round((topSafe.longTermValue / 100) * 12));
            const offsetPct = Math.round((offsetPts / abs) * 100);
            const hypotheticalScore = Math.round(curr - offsetPts);
            counterfactual =
              `Counterfactual: had you developed "${topSafe.skill}" ` +
              `(long-term value: ${topSafe.longTermValue}/100) to proficiency before this reassessment, ` +
              `your L3 score would be approximately ${hypotheticalScore}/100 — ` +
              `offsetting ${offsetPct}% of this ${abs}-point increase.`;
          }
        } catch { /* role intelligence unavailable */ }
      }
      break;
    }

    // ── L4: Industry Headwinds — spec-exact GCC + peer-contagion attribution ─
    case 'L4': {
      // Detect parent-company contagion: the parent layoff event is NEW or
      // its percent has changed between snapshots. This is the canonical
      // signal that an L4 increase was caused by parent-company action, not
      // generic sector drift.
      const prevParentEvent = prevSnapshot?.parentLayoffEvent;
      const currParentEvent = currSnapshot?.parentLayoffEvent;
      const parentEventIsNew =
        currParentEvent && (
          !prevParentEvent ||
          prevParentEvent.date !== currParentEvent.date ||
          prevParentEvent.percent !== currParentEvent.percent
        );
      const parentName = currSnapshot?.parentCompanyName ?? prevSnapshot?.parentCompanyName;
      const gccArchetype = currSnapshot?.gccArchetype;
      const lag = currSnapshot?.propagationLagMonths;
      const isIncrease = delta > 0;

      if (parentEventIsNew && parentName && currParentEvent && isIncrease) {
        // Spec-exact format: "L4 (Industry Headwinds) increased N points.
        // Parent company contagion: [Parent] announced [N]% workforce reduction
        // on [date]. GCC classification: strategic_partner. Historical
        // propagation timeline to India operations: 6-9 months."
        const dateLabel = (() => {
          const d = new Date(currParentEvent.date);
          if (isNaN(d.getTime())) return currParentEvent.date;
          const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
          return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
        })();
        const lagLabel = lag
          ? (lag.min === lag.max ? `${lag.min} months` : `${lag.min}-${lag.max} months`)
          : '6-9 months';

        driver =
          `L4 (Industry Headwinds) increased ${abs} points. ` +
          `Parent company contagion: ${parentName} announced ` +
          `${currParentEvent.percent}% workforce reduction on ${dateLabel}` +
          (currParentEvent.affectedCount
            ? ` (${currParentEvent.affectedCount.toLocaleString()} affected)`
            : '') +
          `.` +
          (gccArchetype ? ` GCC classification: ${gccArchetype}.` : '') +
          ` Historical propagation timeline to your region: ${lagLabel}.`;
        break;
      }

      // Peer-contagion wave: scoreAmplifier changed materially (>=0.05) or
      // the named top peer changed between snapshots.
      const prevMult = prevSnapshot?.peerContagionMultiplier;
      const currMult = currSnapshot?.peerContagionMultiplier;
      const prevTopPeer = prevSnapshot?.peerContagionTopPeer;
      const currTopPeer = currSnapshot?.peerContagionTopPeer;
      const multiplierChanged =
        prevMult != null && currMult != null && Math.abs(currMult - prevMult) >= 0.05;
      const topPeerChanged = currTopPeer && currTopPeer !== prevTopPeer;

      if (isIncrease && (multiplierChanged || topPeerChanged) && currTopPeer) {
        const peerCount = currSnapshot?.peerContagionAffectedCount ?? 0;
        const multClause = currMult != null
          ? `peer contagion amplifier rose to ×${currMult.toFixed(2)}`
          : `peer contagion wave detected`;
        const peerCountClause = peerCount > 0
          ? ` ${peerCount} peer compan${peerCount === 1 ? 'y' : 'ies'} in this sector announced workforce reductions in the wave.`
          : '';
        driver =
          `L4 (Industry Headwinds) increased ${abs} points. ` +
          `Sector peer contagion: ${multClause} — most-recent named peer cut was ${currTopPeer}.` +
          peerCountClause +
          (gccArchetype ? ` Your GCC archetype (${gccArchetype}) carries 2-3× propagation from this wave.` : '');
        break;
      }

      // De-escalation: parent event aged out or peer wave intensity dropped.
      if (delta < -5 && (prevParentEvent || (prevMult != null && currMult != null && currMult < prevMult))) {
        const oldParent = prevSnapshot?.parentCompanyName;
        if (oldParent && !currParentEvent) {
          driver = `L4 (Industry Headwinds) decreased ${abs} points. ${oldParent} parent-contagion signal aged out of the active window — your derived L4 reverted toward sector baseline.`;
        } else if (prevMult != null && currMult != null && currMult < prevMult) {
          driver = `L4 (Industry Headwinds) decreased ${abs} points. Peer contagion amplifier dropped from ×${prevMult.toFixed(2)} to ×${currMult.toFixed(2)} as the named peer wave receded from the 180-day window.`;
        } else {
          driver = `Industry headwinds decreased (${abs} pts lower). Fewer sector-wide layoff events recorded, improving the sector contagion baseline.`;
        }
        break;
      }

      // Fallback — generic L4 text only when no parent/peer signal is available.
      if (delta > 5)       driver = `Industry headwinds increased (+${abs} pts). More peer companies in your sector announced workforce reductions in the last 180 days.`;
      else if (delta < -5) driver = `Industry headwinds decreased (${abs} pts lower). Fewer sector-wide layoff events recorded, improving the sector contagion baseline.`;
      else                 driver = `Industry conditions ${dir} by ${abs} pts. Sector AI adoption rate or growth outlook revised.`;
      break;
    }

    case 'L5':
      if (delta > 3)       driver = `Personal protection ${dir} (+${abs} pts risk increase). Updated tenure bracket calculations or change in performance-tier weighting.`;
      else if (delta < -3) driver = `Personal protection improved (${abs} pts lower risk). Tenure accumulation, promotion signals, or relationship capital changes.`;
      else                 driver = `Personal protection factors ${dir} by ${abs} pts.`;
      break;

    case 'D6':
      if (delta > 5) driver = `AI agent capability for your role ${dir} (+${abs} pts). Autonomous AI systems demonstrating increased task coverage in your role category.`;
      else           driver = `AI agent capability ${dir} by ${abs} pts as enterprise deployment patterns updated.`;
      break;

    case 'D7':
      if (delta > 5)       driver = `Unified company health risk ${dir} (+${abs} pts). D7 blends financial health, layoff history, AI adoption speed, and leadership stability. Check the Company Profile tab for the specific leadership signal.`;
      else if (delta < -5) driver = `Company health risk improved (${abs} pts lower). Leadership stability or financial health signals moved favourably.`;
      else                 driver = `Unified company health risk ${dir} by ${abs} pts. Minor updates to financial, layoff, AI adoption, or leadership signals.`;
      break;

    default:
      driver = `${DIMENSION_LABELS[key] ?? key} ${dir} by ${abs} pts.`;
  }

  return { driver, counterfactual };
}

const MAX_HISTORY = 50;

export function loadScoreHistory(): ScoreHistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY_REGISTRY.SCORE_HISTORY);
    if (!raw) return [];
    return JSON.parse(raw) as ScoreHistoryEntry[];
  } catch {
    return [];
  }
}

// Dev-only guard: warn when breakdown is missing required L1-L5 fields so the
// gap is caught at development time rather than silently failing attribution.
function warnIfBreakdownIncomplete(entry: ScoreHistoryEntry): void {
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') return;
  const bd = entry.breakdown;
  if (!bd) {
    console.warn('[scoreDeltaService] recordScore called without breakdown — delta attribution will show "no data" for all dimensions.', { roleKey: entry.roleKey, company: entry.companyName });
    return;
  }
  const required = ['L1', 'L2', 'L3', 'L4', 'L5'] as const;
  const missing = required.filter(k => typeof bd[k] !== 'number');
  if (missing.length > 0) {
    console.warn(`[scoreDeltaService] recordScore breakdown missing ${missing.join(', ')} — attribution for those dimensions will fall back to generic text.`, { roleKey: entry.roleKey, company: entry.companyName });
  }
  // Sanity-check scale: L1-L5 should be 0-1 raw engine output.
  const outOfRange = required.filter(k => typeof bd[k] === 'number' && (bd[k] < 0 || bd[k] > 1));
  if (outOfRange.length > 0) {
    console.warn(`[scoreDeltaService] recordScore breakdown values out of 0-1 range for ${outOfRange.join(', ')} — pass raw engine output, not display-scaled values.`, { values: outOfRange.reduce((a, k) => ({ ...a, [k]: bd[k] }), {}) });
  }
  const snap = entry.companySnapshot;
  if (!snap) {
    console.warn('[scoreDeltaService] recordScore called without companySnapshot — L1/L2/L3 driver text will be generic for this entry.', { roleKey: entry.roleKey, company: entry.companyName });
  }
}

/**
 * v40.0 — Build the L4-attribution portion of a companySnapshot from a
 * HybridResult-like object. Centralised so both LayoffCalculator call sites
 * (initial audit + manual recalc) populate the same fields identically.
 *
 * Field sources:
 *   parentCompanyName, parentCountry, propagationLagMonths → result.parentPropagation
 *   gccArchetype → result.indiaRiskEnrichment.gccArchetype
 *   peerContagionMultiplier / TopPeer / AffectedCount → result.peerContagion
 *   parentLayoffEvent → matched from peerContagion.affectedPeers when parent
 *                       company name matches (case-insensitive substring).
 *
 * Defensive: every access is optional-chained — a HybridResult missing any
 * of these layers just yields a snapshot without that field, falling the
 * downstream L4 driver text through to generic.
 */
export function buildL4SnapshotFields(
  result: Record<string, any> | null | undefined,
): Pick<NonNullable<ScoreHistoryEntry['companySnapshot']>,
  'parentCompanyName' | 'parentCountry' | 'parentLayoffEvent' | 'gccArchetype'
  | 'propagationLagMonths' | 'peerContagionMultiplier' | 'peerContagionTopPeer'
  | 'peerContagionAffectedCount'
> {
  const out: Pick<NonNullable<ScoreHistoryEntry['companySnapshot']>,
    'parentCompanyName' | 'parentCountry' | 'parentLayoffEvent' | 'gccArchetype'
    | 'propagationLagMonths' | 'peerContagionMultiplier' | 'peerContagionTopPeer'
    | 'peerContagionAffectedCount'
  > = {};
  if (!result) return out;

  const pp = result.parentPropagation as
    | { parentName?: string; parentCountry?: string; lagMonths?: { min?: number; max?: number } }
    | undefined;
  if (pp?.parentName) {
    out.parentCompanyName = pp.parentName;
    if (pp.parentCountry) out.parentCountry = pp.parentCountry;
    if (pp.lagMonths && pp.lagMonths.min != null && pp.lagMonths.max != null) {
      out.propagationLagMonths = { min: pp.lagMonths.min, max: pp.lagMonths.max };
    }
  }

  const enrich = result.indiaRiskEnrichment as
    | { gccArchetype?: string; gccRiskProfile?: { layoffContagionLag?: number } }
    | undefined;
  if (enrich?.gccArchetype && enrich.gccArchetype !== 'not_gcc') {
    out.gccArchetype = enrich.gccArchetype;
    if (!out.propagationLagMonths && enrich.gccRiskProfile?.layoffContagionLag != null) {
      const lag = enrich.gccRiskProfile.layoffContagionLag;
      out.propagationLagMonths = { min: Math.max(1, lag - 3), max: lag };
    }
  }

  const peer = result.peerContagion as
    | {
        scoreAmplifier?: number;
        affectedPeers?: Array<{ companyName: string; layoffDate?: string; estimatedPercentCut?: number; daysAgo?: number }>;
      }
    | undefined;
  if (peer) {
    if (peer.scoreAmplifier != null) out.peerContagionMultiplier = peer.scoreAmplifier;
    const peers = peer.affectedPeers ?? [];
    if (peers.length > 0) {
      // "Top peer" = most recent cut (lowest daysAgo) — that's the named driver.
      const sorted = [...peers].sort((a, b) => (a.daysAgo ?? 999) - (b.daysAgo ?? 999));
      out.peerContagionTopPeer = sorted[0].companyName;
      out.peerContagionAffectedCount = peers.length;

      // If a peer in the wave IS the detected parent, use that peer's event
      // as the parentLayoffEvent. This is the spec-exact path that produces
      // "Microsoft announced 12% workforce reduction on Mar 15, 2026".
      if (out.parentCompanyName) {
        const parentLower = out.parentCompanyName.toLowerCase().trim();
        const parentPeer = peers.find(p =>
          p.companyName.toLowerCase().trim().includes(parentLower) ||
          parentLower.includes(p.companyName.toLowerCase().trim())
        );
        if (parentPeer && parentPeer.layoffDate) {
          out.parentLayoffEvent = {
            date:    parentPeer.layoffDate,
            percent: parentPeer.estimatedPercentCut ?? 0,
          };
        }
      }
    }
  }

  return out;
}

export function recordScore(entry: ScoreHistoryEntry): void {
  if (process.env.NODE_ENV !== 'production') {
    warnIfBreakdownIncomplete(entry);
  }
  try {
    const history = loadScoreHistory();
    const oneDayAgo = Date.now() - 86_400_000;

    // Deduplication key: role + company + country + experience within 24h.
    // Including companyName prevents two audits for different companies on the
    // same role/country/experience from overwriting each other in the same day.
    const companyNorm = (entry.companyName ?? '').toLowerCase().trim();
    const filtered = history.filter(h =>
      !(h.roleKey === entry.roleKey &&
        h.countryKey === entry.countryKey &&
        h.experience === entry.experience &&
        (h.companyName ?? '').toLowerCase().trim() === companyNorm &&
        h.timestamp > oneDayAgo)
    );

    filtered.unshift(entry);
    const trimmed = filtered.slice(0, MAX_HISTORY);
    localStorage.setItem(KEY_REGISTRY.SCORE_HISTORY, JSON.stringify(trimmed));
  } catch { /* localStorage unavailable */ }
}

/**
 * Get score delta with full dimension-level attribution.
 * This is the function that turns "your score went from 68 to 74" into
 * "here is exactly which signals changed and why."
 */
export function getScoreDelta(
  roleKey: string,
  currentScore: number,
  experience: string,
  countryKey: string,
): ScoreDelta | null {
  try {
    const history = loadScoreHistory();
    const sameRole = history.filter(h =>
      h.roleKey === roleKey &&
      h.experience === experience &&
      h.countryKey === countryKey
    );

    if (sameRole.length < 2) return null;

    const previous = sameRole[1];
    const delta = currentScore - previous.score;
    const daysAgo = Math.round((Date.now() - previous.timestamp) / 86_400_000);

    let label: string;
    let direction: 'up' | 'down' | 'same';

    if (Math.abs(delta) < 1) {
      label = 'No change vs last assessment';
      direction = 'same';
    } else if (delta > 0) {
      label = `↑${Math.abs(delta)} pts vs ${daysAgo}d ago`;
      direction = 'up';
    } else {
      label = `↓${Math.abs(delta)} pts vs ${daysAgo}d ago`;
      direction = 'down';
    }

    return { previous: previous.score, current: currentScore, delta, daysAgo, label, direction };
  } catch {
    return null;
  }
}

/**
 * Get full attributed delta comparing current HybridResult against previous stored entry.
 * Returns null if no previous assessment exists for this role/country/experience.
 *
 * currentSnapshot: pass the company data snapshot from the CURRENT audit. Without it,
 * explainDimensionDelta() falls back to generic text for all three spec-required dimensions
 * (L1, L2, L3) because it cannot compare prev vs curr actual field values.
 */
export function getAttributedDelta(
  roleKey: string,
  currentScore: number,
  currentBreakdown: Record<string, number>,
  experience: string,
  countryKey: string,
  companyName?: string,
  currentSnapshot?: ScoreHistoryEntry['companySnapshot'],
): ScoreDelta | null {
  try {
    const history = loadScoreHistory();
    const sameRole = history.filter(h =>
      h.roleKey === roleKey &&
      h.experience === experience &&
      h.countryKey === countryKey
    );

    if (sameRole.length < 2) return null;

    const previous = sameRole[1];
    const delta = Math.round(currentScore - previous.score);
    const daysAgo = Math.round((Date.now() - previous.timestamp) / 86_400_000);

    let direction: 'up' | 'down' | 'same' = 'same';
    let label = 'No change vs last assessment';
    if (Math.abs(delta) >= 1) {
      direction = delta > 0 ? 'up' : 'down';
      label = delta > 0
        ? `↑${Math.abs(delta)} pts vs ${daysAgo}d ago — risk increased`
        : `↓${Math.abs(delta)} pts vs ${daysAgo}d ago — risk improved`;
    }

    // Build dimension-level attribution if we have previous breakdown
    const dimensionDeltas: DimensionDelta[] = [];
    if (previous.breakdown) {
      const KEYS = ['L1', 'L2', 'L3', 'L4', 'L5', 'D6', 'D7'] as const;
      for (const k of KEYS) {
        const prevVal = (previous.breakdown as any)[k];
        const currVal = currentBreakdown[k];
        if (prevVal == null || currVal == null) continue;
        // Breakdown stored as 0–1, display as 0–100
        const prevScore = Math.round(prevVal * 100);
        const currScore = Math.round(currVal * 100);
        const dimDelta = currScore - prevScore;
        if (Math.abs(dimDelta) < 2) continue; // filter noise
        dimensionDeltas.push({
          key: k,
          label: DIMENSION_LABELS[k] ?? k,
          previous: prevScore,
          current: currScore,
          delta: dimDelta,
          ...explainDimensionDelta(k, prevScore, currScore, dimDelta, companyName, roleKey, previous.companySnapshot, currentSnapshot),
        });
      }
      // Sort by absolute delta descending — show biggest drivers first
      dimensionDeltas.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    }

    return {
      previous: previous.score,
      current: currentScore,
      delta,
      daysAgo,
      label,
      direction,
      dimensionDeltas: dimensionDeltas.length > 0 ? dimensionDeltas : undefined,
    };
  } catch {
    return null;
  }
}

export function getBestScore(): ScoreHistoryEntry | null {
  const history = loadScoreHistory();
  if (!history.length) return null;
  return history.reduce((best, curr) => curr.score < best.score ? curr : best);
}

export function getAssessedRoles(): string[] {
  const history = loadScoreHistory();
  return [...new Set(history.map(h => h.roleKey))];
}

// ── Score Velocity (v7.0 Fix 2) ───────────────────────────────────────────────
// Score velocity answers: "Am I getting worse faster than I thought?"
// A +12pt jump in 30 days warrants a different action plan than a stable 58.

export type ScoreVelocityDirection = 'accelerating' | 'stable' | 'improving';

export interface ScoreVelocity {
  /** Score change in the last 30 days (positive = risk increased) */
  delta30d:    number | null;
  /** Score change in the last 90 days */
  delta90d:    number | null;
  /** Characterisation of velocity direction */
  direction:   ScoreVelocityDirection;
  /** Extra risk added by rate-of-change (0–0.08) — fed into final score as a small modifier */
  velocityRiskAddon: number;
}

/**
 * Compute score velocity for a specific role/experience/country combination.
 * Returns null when history is insufficient (< 2 entries matching the profile).
 *
 * velocityRiskAddon:
 *   +0.06  delta30d > 10  (rapidly deteriorating — tighten action timeline)
 *   +0.03  delta30d 5–10 (moderately deteriorating)
 *   0.00   delta30d ±5   (stable)
 *  -0.02   delta30d < -5  (improving — small credit, don't over-reward)
 */
export function computeScoreVelocity(
  roleKey: string,
  currentScore: number,
  experience: string,
  countryKey: string,
): ScoreVelocity | null {
  try {
    const history = loadScoreHistory();
    const sameRole = history
      .filter(h => h.roleKey === roleKey && h.experience === experience && h.countryKey === countryKey)
      .sort((a, b) => b.timestamp - a.timestamp);  // newest first

    if (sameRole.length < 2) return null;

    const now   = Date.now();
    const MS30  = 30  * 86_400_000;
    const MS90  = 90  * 86_400_000;

    // Find the most recent entry at ≥25 days ago (allow small timing variance)
    const baseline30 = sameRole.find(h => (now - h.timestamp) >= 25 * 86_400_000);
    const baseline90 = sameRole.find(h => (now - h.timestamp) >= 80 * 86_400_000);

    const delta30d = baseline30 ? currentScore - baseline30.score : null;
    const delta90d = baseline90 ? currentScore - baseline90.score : null;

    // Use 30d delta as the primary velocity signal; fall back to 90d
    const primaryDelta = delta30d ?? delta90d ?? 0;
    let direction: ScoreVelocityDirection;
    let velocityRiskAddon: number;

    if (primaryDelta > 5) {
      direction        = 'accelerating';
      velocityRiskAddon = primaryDelta > 10 ? 0.06 : 0.03;
    } else if (primaryDelta < -5) {
      direction        = 'improving';
      velocityRiskAddon = -0.02;
    } else {
      direction        = 'stable';
      velocityRiskAddon = 0;
    }

    return { delta30d, delta90d, direction, velocityRiskAddon };
  } catch {
    return null;
  }
}

/**
 * Returns the user's "return type" — used to frame Tier A LLM responses
 * differently for first-time vs returning users, and to suppress
 * already-completed actions from the action plan.
 */
export type UserReturnType =
  | 'first_time'        // no prior audits for this role
  | 'stable_returner'   // returning, score unchanged (±4 pts)
  | 'improving'         // returning, score improved (>4 pts lower)
  | 'declining'         // returning, score worsened (>4 pts higher)
  | 'crisis';           // returning + score worsened rapidly (>10 pts in 30d)

export function getUserReturnType(
  roleKey: string,
  currentScore: number,
  experience: string,
  countryKey: string,
): UserReturnType {
  const history = loadScoreHistory()
    .filter(h => h.roleKey === roleKey && h.experience === experience && h.countryKey === countryKey)
    .sort((a, b) => b.timestamp - a.timestamp);

  if (history.length < 2) return 'first_time';

  const velocity = computeScoreVelocity(roleKey, currentScore, experience, countryKey);
  const delta    = history[0].score - (history[1]?.score ?? history[0].score);

  if (velocity?.direction === 'accelerating' && (velocity.delta30d ?? 0) > 10) return 'crisis';
  if (delta > 4)  return 'declining';
  if (delta < -4) return 'improving';
  return 'stable_returner';
}
